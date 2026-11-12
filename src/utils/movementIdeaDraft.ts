import { getEquipmentFamily } from '../data/equipmentCatalog';
import { RECOVERY_STORAGE_KEY } from '../lib/recoveryStorageGuard';
import { usePilatesStore } from '../store/usePilatesStore';
import type {
  ClassSequenceSnapshot,
  DraftModificationLog,
  DraftPhotoReference,
  DraftRevisionEntry,
  HierarchyPilatesExercise,
  HumanMovementDraft,
  MovementSafetyAndEfficacyBoundary,
  ReusableBlock,
  SubjectiveFeelLog,
} from '../types/hierarchy';
import type {
  ApparatusType,
  BodyPosition,
  DifficultyLevel,
  LayerMode,
  PilatesExercise,
  SequenceStep,
  StepSideMode,
} from '../types/pilates';
import type { ClassSectionRole } from '../types/sequenceMotion';
import {
  type ReusableBlockTimingSummary,
  addItemToReusableBlock,
  addReusableBlockToLibrary,
  createClassSequenceSnapshot,
  createHumanDraftMovementSnapshot,
  createReusableBlock,
  createReusableBlockFromSteps,
  duplicateReusableBlockInLibrary,
  insertReusableBlockIntoSequence,
  moveItemInReusableBlock,
  summarizeReusableBlockTiming,
} from './hierarchyModel';
import {
  DEFAULT_HUMAN_DRAFT_STORAGE_KEY,
  addModificationLogToDraft,
  addPhotoReferenceToDraft,
  addSubjectiveFeelToDraft,
  createHumanMovementIdeaDraft,
  forkHumanDraftVariant,
  refineHumanDraftMetadata,
  restoreHumanDraftRevision,
  updateHumanDraftVariants,
} from './humanMovementCreation';
import { broadcastStudioSyncEvent, saveLocalPhotoAsset } from './localMediaStorage';
import { registerReusableBlockBackupBridge } from './reusableBlockBackupBridge';

export interface IdeaPilatesExercise extends HierarchyPilatesExercise {
  sourceOrigin?: 'catalog' | 'human-created';
  parentDraftId?: string;
  parentDraftRevision?: number;
  variantLabelKo?: string;
  ideaLineSnapshot?: string;
  feelLogsSnapshot?: SubjectiveFeelLog[];
  modificationLogsSnapshot?: DraftModificationLog[];
  photoReferencesSnapshot?: Array<DraftPhotoReference & { dataUrl?: string; label?: string }>;
  safetyBoundarySnapshot?: MovementSafetyAndEfficacyBoundary;
}

export interface MovementIdeaMeta {
  exerciseId: string;
  ideaLine: string;
  workingTitle: string;
  subjectiveFeeling: string;
  adjustmentNote: string;
  photoDataUrl: string;
  triedByInstructor: boolean;
  createdAt: string;
  updatedAt: string;
  easyVariation?: string;
  standardVariation?: string;
  hardVariation?: string;
  variantLabelKo?: string;
  parentDraftId?: string;
  parentDraftRevision?: number;
  revision?: number;
  revisionHistory?: readonly DraftRevisionEntry[];
  repetitions?: number;
  sets?: number;
  sideMode?: StepSideMode;
  explanationSec?: number;
  transitionSec?: number;
  sectionRole?: ClassSectionRole;
}

export interface MovementIdeaWorkingBuffer {
  editingExerciseId: string | null;
  ideaLine: string;
  workingTitle: string;
  subjectiveFeeling: string;
  adjustmentNote: string;
  photoDataUrl: string;
  triedByInstructor: boolean;
  apparatus: ApparatusType | '';
  durationMin: string;
  level: DifficultyLevel | '';
  easyVariation?: string;
  hardVariation?: string;
  variantLabelKo?: string;
  repetitions?: string;
  sets?: string;
  sideMode?: StepSideMode | '';
  explanationSec?: string;
  transitionSec?: string;
  sectionRole?: ClassSectionRole | '';
  updatedAt: string;
}

export interface SaveMovementIdeaInput {
  existingExerciseId?: string | null;
  ideaLine: string;
  workingTitle?: string;
  subjectiveFeeling?: string;
  adjustmentNote?: string;
  photoDataUrl?: string;
  triedByInstructor?: boolean;
  apparatus?: ApparatusType | '';
  durationMin?: number;
  level?: DifficultyLevel | '';
  easyVariation?: string;
  standardVariation?: string;
  hardVariation?: string;
  variantLabelKo?: string;
  repetitions?: number;
  sets?: number;
  sideMode?: StepSideMode | '';
  explanationSec?: number;
  transitionSec?: number;
  sectionRole?: ClassSectionRole | '';
  simulateSaveError?: boolean;
}

const IDEA_META_STORAGE_KEY = 'pilates-flow-movement-idea-meta-v1';
const IDEA_BUFFER_STORAGE_KEY = 'pilates-flow-movement-idea-buffer-v1';
const IDEA_REUSABLE_BLOCKS_STORAGE_KEY = 'pilates-flow-movement-idea-reusable-blocks-v1';
const LEGACY_HUMAN_DRAFT_STORAGE_KEY = 'pilates-flow-human-movement-drafts-v1';
const ACTIVE_OWNER_KEY = `${RECOVERY_STORAGE_KEY}:active-owner`;

function normalizeScopeOwner(owner: string | null | undefined): string {
  const trimmed = owner?.trim() ?? '';
  if (!trimmed || trimmed === '__anonymous__' || trimmed === 'device') {
    return 'device';
  }
  return trimmed;
}

function getActiveOwnerScope(): string {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return 'device';
    const owner = window.localStorage.getItem(ACTIVE_OWNER_KEY)?.trim();
    return normalizeScopeOwner(owner);
  } catch {
    return 'device';
  }
}

function getScopedStorageKey(baseKey: string, scope = getActiveOwnerScope()): string {
  const normalized = normalizeScopeOwner(scope);
  return normalized === 'device' ? baseKey : `${baseKey}:user:${encodeURIComponent(normalized)}`;
}

const EMPTY_BUFFER: MovementIdeaWorkingBuffer = {
  editingExerciseId: null,
  ideaLine: '',
  workingTitle: '',
  subjectiveFeeling: '',
  adjustmentNote: '',
  photoDataUrl: '',
  triedByInstructor: false,
  apparatus: '',
  durationMin: '3',
  level: '',
  easyVariation: '',
  hardVariation: '',
  variantLabelKo: '',
  repetitions: '',
  sets: '',
  sideMode: '',
  explanationSec: '20',
  transitionSec: '15',
  sectionRole: '',
  updatedAt: '',
};

let inMemoryMetaByScope: Record<string, Record<string, MovementIdeaMeta>> = {};
let inMemoryHumanDraftByScope: Record<string, Record<string, HumanMovementDraft>> = {};
let inMemoryReusableBlocksByScope: Record<string, ReusableBlock[]> = {};
let inMemoryBufferByScope: Record<string, MovementIdeaWorkingBuffer> = {};
let persistedMetaScopes = new Set<string>();
let persistedHumanDraftScopes = new Set<string>();
let persistedReusableBlocksScopes = new Set<string>();
let activeSaveLock = false;

export function syncMovementIdeaAccountScope(
  previousOwner: string | null | undefined,
  nextOwner: string | null | undefined,
): void {
  const prevNormalized = normalizeScopeOwner(previousOwner);
  const nextNormalized = normalizeScopeOwner(nextOwner);
  const prevRaw = previousOwner?.trim() || '__anonymous__';
  const nextRaw = nextOwner?.trim() || '__anonymous__';

  if (nextNormalized === 'device' || nextRaw === '__anonymous__') {
    delete inMemoryBufferByScope[prevNormalized];
    delete inMemoryBufferByScope[prevRaw];
    return;
  }

  if (prevNormalized === 'device' && nextNormalized !== 'device') {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const baseKeys = [
          IDEA_META_STORAGE_KEY,
          DEFAULT_HUMAN_DRAFT_STORAGE_KEY,
          LEGACY_HUMAN_DRAFT_STORAGE_KEY,
          IDEA_REUSABLE_BLOCKS_STORAGE_KEY,
        ];
        for (const baseKey of baseKeys) {
          const anonScopedKey = getScopedStorageKey(baseKey, 'device');
          const nextScopedKey = getScopedStorageKey(baseKey, nextNormalized);
          const anonColonKey = `${baseKey}:__anonymous__`;
          const nextColonKey = `${baseKey}:${nextNormalized}`;

          const anonVal =
            window.localStorage.getItem(anonColonKey) ??
            window.localStorage.getItem(anonScopedKey);
          if (anonVal !== null) {
            if (window.localStorage.getItem(nextScopedKey) === null) {
              window.localStorage.setItem(nextScopedKey, anonVal);
            }
            if (
              window.localStorage.getItem(anonColonKey) !== null &&
              window.localStorage.getItem(nextColonKey) === null
            ) {
              window.localStorage.setItem(nextColonKey, anonVal);
            }
          }
        }
      }
    } catch {
      // Ignore storage migration errors when restricted.
    }

    if (
      inMemoryMetaByScope.device &&
      Object.keys(inMemoryMetaByScope.device).length > 0 &&
      !inMemoryMetaByScope[nextNormalized]
    ) {
      inMemoryMetaByScope[nextNormalized] = { ...inMemoryMetaByScope.device };
    }
    if (
      inMemoryHumanDraftByScope.device &&
      Object.keys(inMemoryHumanDraftByScope.device).length > 0 &&
      !inMemoryHumanDraftByScope[nextNormalized]
    ) {
      inMemoryHumanDraftByScope[nextNormalized] = { ...inMemoryHumanDraftByScope.device };
    }
    if (
      inMemoryReusableBlocksByScope.device &&
      inMemoryReusableBlocksByScope.device.length > 0 &&
      !inMemoryReusableBlocksByScope[nextNormalized]
    ) {
      inMemoryReusableBlocksByScope[nextNormalized] = [...inMemoryReusableBlocksByScope.device];
    }
  }
}

function isNewerVersionedEntry(
  candidate: { revision?: number; updatedAt?: string },
  baseline: { revision?: number; updatedAt?: string } | undefined,
): boolean {
  if (!baseline) return true;
  const candRev = candidate.revision ?? 0;
  const baseRev = baseline.revision ?? 0;
  if (candRev !== baseRev) return candRev > baseRev;
  const candTime = candidate.updatedAt ? Date.parse(candidate.updatedAt) : Number.NaN;
  const baseTime = baseline.updatedAt ? Date.parse(baseline.updatedAt) : Number.NaN;
  if (!Number.isNaN(candTime) && !Number.isNaN(baseTime) && candTime !== baseTime) {
    return candTime > baseTime;
  }
  return false;
}

const DANGEROUS_OBJECT_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

function getSafeOwnEntry<T>(record: Record<string, T> | null | undefined, key: string): T | undefined {
  if (!record || typeof record !== 'object' || DANGEROUS_OBJECT_KEYS.has(key)) {
    return undefined;
  }
  return Object.prototype.hasOwnProperty.call(record, key) ? record[key] : undefined;
}

function getScopedHumanDraftMap(scope = getActiveOwnerScope()): Record<string, HumanMovementDraft> {
  const normalizedScope = normalizeScopeOwner(scope);
  const scopedKey = getScopedStorageKey(DEFAULT_HUMAN_DRAFT_STORAGE_KEY, normalizedScope);
  const hasRawKey = hasStorageKey(scopedKey);
  if (persistedHumanDraftScopes.has(normalizedScope) && !hasRawKey) {
    inMemoryHumanDraftByScope[normalizedScope] = {};
    persistedHumanDraftScopes.delete(normalizedScope);
    return inMemoryHumanDraftByScope[normalizedScope];
  }
  const current = inMemoryHumanDraftByScope[normalizedScope] ?? {};
  const stored = hasRawKey
    ? readStorageJson<{
        humanMovementDrafts?: HumanMovementDraft[];
      } | null>(scopedKey, null)
    : null;
  const merged: Record<string, HumanMovementDraft> = { ...current };
  if (stored && Array.isArray(stored.humanMovementDrafts)) {
    persistedHumanDraftScopes.add(normalizedScope);
    for (const draft of stored.humanMovementDrafts) {
      if (draft && typeof draft.id === 'string' && !DANGEROUS_OBJECT_KEYS.has(draft.id)) {
        if (isNewerVersionedEntry(draft, getSafeOwnEntry(merged, draft.id))) {
          merged[draft.id] = draft;
        }
      }
    }
  }
  inMemoryHumanDraftByScope[normalizedScope] = merged;
  return inMemoryHumanDraftByScope[normalizedScope];
}

export function inferApparatusFromIdeaLine(ideaLine: string): ApparatusType | undefined {
  const normalized = ideaLine.trim().toLowerCase();
  if (!normalized) return undefined;
  const keywordRules: ReadonlyArray<{ pattern: RegExp; apparatus: ApparatusType }> = [
    {
      pattern:
        /리포머|reformer|롱\s*박스|숏\s*박스|풋\s*바|스트랩|캐리지|점프\s*보드|long\s*box|short\s*box|foot\s*bar/i,
      apparatus: 'reformer',
    },
    {
      pattern: /체어|chair|운다\s*체어|콤보\s*체어|페달|스플릿\s*페달|pedal/i,
      apparatus: 'chair',
    },
    {
      pattern:
        /캐딜락|cadillac|타워|tower|스프링\s*보드|spring\s*board|푸시\s*스루|푸쉬\s*스루|롤\s*다운\s*바|트래피즈|레그\s*스프링|암\s*스프링|push\s*through|roll\s*down\s*bar|trapeze/i,
      apparatus: 'cadillac',
    },
    {
      pattern: /바렐|barrel|래더\s*바렐|스파인\s*코렉터|아크\s*바렐|스완\s*바렐/i,
      apparatus: 'barrel',
    },
    { pattern: /매트|mat/i, apparatus: 'mat' },
  ];
  for (const rule of keywordRules) {
    if (rule.pattern.test(normalized)) {
      return rule.apparatus;
    }
  }
  return undefined;
}

export function inferBodyPositionFromIdeaLine(ideaLine: string): BodyPosition | null {
  const normalized = ideaLine.trim().toLowerCase();
  if (!normalized) return null;
  const positionRules: ReadonlyArray<{ pattern: RegExp; position: BodyPosition }> = [
    { pattern: /엎드려|복와위|prone|스완|swan|수영|swimming/i, position: 'prone' },
    {
      pattern: /앉아|앉은|시팅|좌위|sitting|seated|머메이드|mermaid|스파인\s*트위스트|쏘우|saw/i,
      position: 'seated',
    },
    { pattern: /무릎\s*꿇|무릎꿇|닐링|kneeling|싸이\s*스트레치/i, position: 'kneeling' },
    {
      pattern: /옆으로\s*누|측와위|사이드\s*라잉|사이드\s*킥|side[-\s]*lying|클램|clam/i,
      position: 'side-lying',
    },
    { pattern: /서서|선\s*자세|스탠딩|입위|standing|런지|lunge|스쿼트|squat/i, position: 'standing' },
    {
      pattern: /네발|네\s*발|쿼드러페드|quadruped|버드독|캣|cat\s*stretch/i,
      position: 'quadruped',
    },
    { pattern: /누워|누운|앙와위|supine|브릿지|bridge|헌드레드|hundred/i, position: 'supine' },
  ];
  for (const rule of positionRules) {
    if (rule.pattern.test(normalized)) {
      return rule.position;
    }
  }
  return null;
}

function hasStorageKey(key: string): boolean {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return false;
    return window.localStorage.getItem(key) !== null;
  } catch {
    return false;
  }
}

function readStorageJson<T>(key: string, fallback: T): T {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return fallback;
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeStorageJson<T>(key: string, value: T): boolean {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return false;
    window.localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    // Keep in-memory state intact even if storage quota or permission is restricted.
    return false;
  }
}

function isSupportedLocalPhotoUri(uri: string): boolean {
  const trimmed = uri.trim();
  if (!trimmed) return false;
  if (/https?:\/\//i.test(trimmed)) {
    return /^data:image\/svg\+xml/i.test(trimmed);
  }
  return (
    trimmed.startsWith('data:image/') ||
    trimmed.startsWith('local-photo://') ||
    trimmed.startsWith('blob:') ||
    trimmed.startsWith('asset://') ||
    trimmed.startsWith('file://')
  );
}

function persistHumanDraftMap(scope = getActiveOwnerScope()): boolean {
  const normalizedScope = normalizeScopeOwner(scope);
  const draftMap = getScopedHumanDraftMap(normalizedScope);
  const blocks = inMemoryReusableBlocksByScope[normalizedScope] ?? [];
  const wrote = writeStorageJson(
    getScopedStorageKey(DEFAULT_HUMAN_DRAFT_STORAGE_KEY, normalizedScope),
    {
      format: 'pilates-flow-human-creation-v1',
      version: 1,
      exportedAt: new Date().toISOString(),
      humanMovementDrafts: Object.values(draftMap),
      reusableBlocks: blocks,
    },
  );
  if (wrote) {
    persistedHumanDraftScopes.add(normalizedScope);
  } else {
    persistedHumanDraftScopes.delete(normalizedScope);
  }
  return wrote;
}

function persistScopedIdeaMetaMap(scope: string, nextMap: Record<string, MovementIdeaMeta>): void {
  const normalizedScope = normalizeScopeOwner(scope);
  inMemoryMetaByScope[normalizedScope] = nextMap;
  const wrote = writeStorageJson(getScopedStorageKey(IDEA_META_STORAGE_KEY, normalizedScope), nextMap);
  if (wrote) {
    persistedMetaScopes.add(normalizedScope);
  } else {
    persistedMetaScopes.delete(normalizedScope);
  }
}

function persistScopedReusableBlocks(scope: string, nextBlocks: ReusableBlock[]): void {
  const normalizedScope = normalizeScopeOwner(scope);
  inMemoryReusableBlocksByScope[normalizedScope] = nextBlocks;
  const wroteBlocks = writeStorageJson(
    getScopedStorageKey(IDEA_REUSABLE_BLOCKS_STORAGE_KEY, normalizedScope),
    nextBlocks,
  );
  const wroteBundle = persistHumanDraftMap(normalizedScope);
  if (wroteBlocks || wroteBundle) {
    persistedReusableBlocksScopes.add(normalizedScope);
  } else {
    persistedReusableBlocksScopes.delete(normalizedScope);
  }
}

export function isMovementIdeaExercise(exercise: PilatesExercise | undefined | null): boolean {
  if (!exercise) return false;
  return exercise.id.startsWith('ex-custom-idea-');
}

export function getMovementIdeaMetaMap(
  scope = getActiveOwnerScope(),
): Record<string, MovementIdeaMeta> {
  const normalizedScope = normalizeScopeOwner(scope);
  const scopedKey = getScopedStorageKey(IDEA_META_STORAGE_KEY, normalizedScope);
  const hasRawKey = hasStorageKey(scopedKey);
  if (persistedMetaScopes.has(normalizedScope) && !hasRawKey) {
    inMemoryMetaByScope[normalizedScope] = {};
    persistedMetaScopes.delete(normalizedScope);
    return inMemoryMetaByScope[normalizedScope];
  }
  const stored = hasRawKey ? readStorageJson<Record<string, MovementIdeaMeta>>(scopedKey, {}) : {};
  const current = inMemoryMetaByScope[normalizedScope] ?? {};
  const merged: Record<string, MovementIdeaMeta> = { ...current };
  if (hasRawKey && stored && typeof stored === 'object' && !Array.isArray(stored)) {
    persistedMetaScopes.add(normalizedScope);
    for (const [id, entry] of Object.entries(stored)) {
      if (
        !DANGEROUS_OBJECT_KEYS.has(id) &&
        entry &&
        typeof entry === 'object' &&
        !Array.isArray(entry) &&
        isNewerVersionedEntry(entry, getSafeOwnEntry(merged, id))
      ) {
        merged[id] = entry;
      }
    }
  }
  inMemoryMetaByScope[normalizedScope] = merged;
  return merged;
}

export function getHumanDraftForIdeaExercise(exerciseId: string): HumanMovementDraft | undefined {
  return getSafeOwnEntry(getScopedHumanDraftMap(), exerciseId);
}

export function getSavedHumanMovementDrafts(scope = getActiveOwnerScope()): HumanMovementDraft[] {
  return Object.values(getScopedHumanDraftMap(scope));
}

export function getMovementIdeaMeta(exercise: PilatesExercise): MovementIdeaMeta {
  const scope = getActiveOwnerScope();
  const map = getMovementIdeaMetaMap(scope);
  const existing = getSafeOwnEntry(map, exercise.id);
  const draft = getSafeOwnEntry(getScopedHumanDraftMap(scope), exercise.id);
  if (existing) {
    if (draft) {
      return {
        ...existing,
        revision: draft.revision,
        revisionHistory: draft.revisionHistory,
        parentDraftId: draft.parentDraftId ?? existing.parentDraftId,
        parentDraftRevision: draft.parentDraftRevision ?? existing.parentDraftRevision,
        variantLabelKo: draft.variantLabelKo ?? existing.variantLabelKo,
        easyVariation: draft.layers?.easy ?? existing.easyVariation,
        standardVariation: draft.layers?.standard ?? existing.standardVariation,
        hardVariation: draft.layers?.hard ?? existing.hardVariation,
      };
    }
    return existing;
  }

  const precautionPrefix = '강사 주관적 느낌 메모 (전문가 검증·효과 보장 아님): ';
  const defaultPrecaution = '강사 직접 창작 초안 · 수업 전 개인별 상태를 직접 확인하세요.';
  const rawPrecautions = exercise.precautions || '';
  const fallbackFeeling = rawPrecautions.startsWith(precautionPrefix)
    ? rawPrecautions.slice(precautionPrefix.length).trim()
    : rawPrecautions === defaultPrecaution
      ? ''
      : rawPrecautions;

  const snapshotEx = exercise as IdeaPilatesExercise;
  const rawFeelSnap = snapshotEx.feelLogsSnapshot;
  const lastFeelEntry =
    Array.isArray(rawFeelSnap) && rawFeelSnap.length > 0 ? rawFeelSnap.at(-1) : undefined;
  const snapshotFeeling =
    typeof lastFeelEntry === 'string'
      ? lastFeelEntry
      : lastFeelEntry && typeof lastFeelEntry === 'object' && 'feelNoteKo' in lastFeelEntry
        ? (lastFeelEntry.feelNoteKo ?? '')
        : '';

  const rawModSnap = snapshotEx.modificationLogsSnapshot;
  const lastModEntry =
    Array.isArray(rawModSnap) && rawModSnap.length > 0 ? rawModSnap.at(-1) : undefined;
  const snapshotAdjustment =
    typeof lastModEntry === 'string'
      ? lastModEntry
      : lastModEntry && typeof lastModEntry === 'object' && 'modificationPointKo' in lastModEntry
        ? (lastModEntry.modificationPointKo ?? '')
        : '';

  const rawPhotoSnap = snapshotEx.photoReferencesSnapshot;
  const lastPhotoEntry =
    Array.isArray(rawPhotoSnap) && rawPhotoSnap.length > 0 ? rawPhotoSnap.at(-1) : undefined;
  const snapshotPhoto =
    lastPhotoEntry && typeof lastPhotoEntry === 'object'
      ? ('localRefUri' in lastPhotoEntry && lastPhotoEntry.localRefUri) ||
        ('dataUrl' in lastPhotoEntry && lastPhotoEntry.dataUrl) ||
        ''
      : '';

  const ideaLine =
    draft?.ideaLine || snapshotEx.ideaLineSnapshot || exercise.cues?.[0] || exercise.nameKo;
  const adjustmentNote =
    draft?.modificationLogs.at(-1)?.modificationPointKo ||
    snapshotAdjustment ||
    exercise.layers?.standard ||
    '';
  const subjectiveFeeling =
    draft?.feelLogs.at(-1)?.feelNoteKo || snapshotFeeling || fallbackFeeling;
  const photoDataUrl = draft?.photoReferences.at(-1)?.localRefUri || snapshotPhoto || '';
  return {
    exerciseId: exercise.id,
    ideaLine,
    workingTitle: draft?.workingNameKo ?? snapshotEx.variantLabelKo ?? exercise.nameKo,
    subjectiveFeeling,
    adjustmentNote,
    photoDataUrl,
    triedByInstructor: Boolean(subjectiveFeeling || adjustmentNote || photoDataUrl),
    createdAt: draft?.createdAt || exercise.createdAt || new Date().toISOString(),
    updatedAt: draft?.updatedAt || exercise.createdAt || new Date().toISOString(),
    easyVariation: draft?.layers?.easy ?? exercise.layers?.easy ?? '',
    standardVariation: draft?.layers?.standard ?? exercise.layers?.standard ?? '',
    hardVariation: draft?.layers?.hard ?? exercise.layers?.hard ?? '',
    variantLabelKo: draft?.variantLabelKo ?? snapshotEx.variantLabelKo,
    parentDraftId: draft?.parentDraftId ?? snapshotEx.parentDraftId,
    parentDraftRevision: draft?.parentDraftRevision ?? snapshotEx.parentDraftRevision,
    revision: draft?.revision ?? snapshotEx.humanDraftRevision ?? 1,
    revisionHistory: draft?.revisionHistory ?? [],
    repetitions:
      draft?.defaultRepetitions ?? snapshotEx.defaultRepetitions,
    sets: draft?.defaultSets ?? snapshotEx.defaultSets,
    sideMode: draft?.sideMode,
    sectionRole: draft?.sectionRole,
  };
}

export function loadMovementIdeaWorkingBuffer(): MovementIdeaWorkingBuffer {
  const scope = getActiveOwnerScope();
  const scopedKey = getScopedStorageKey(IDEA_BUFFER_STORAGE_KEY, scope);
  const stored = readStorageJson<MovementIdeaWorkingBuffer | null>(scopedKey, null);
  if (stored && typeof stored.ideaLine === 'string') {
    inMemoryBufferByScope[scope] = { ...EMPTY_BUFFER, ...stored };
  } else if (!inMemoryBufferByScope[scope]) {
    inMemoryBufferByScope[scope] = { ...EMPTY_BUFFER };
  }
  return inMemoryBufferByScope[scope];
}

export function saveMovementIdeaWorkingBuffer(
  partial: Partial<MovementIdeaWorkingBuffer>,
): MovementIdeaWorkingBuffer {
  const scope = getActiveOwnerScope();
  const current = inMemoryBufferByScope[scope] ?? { ...EMPTY_BUFFER };
  const next: MovementIdeaWorkingBuffer = {
    ...current,
    ...partial,
    updatedAt: new Date().toISOString(),
  };
  inMemoryBufferByScope[scope] = next;
  writeStorageJson(getScopedStorageKey(IDEA_BUFFER_STORAGE_KEY, scope), next);
  return next;
}

export function clearMovementIdeaWorkingBuffer(scope = getActiveOwnerScope()): void {
  const normalizedScope = normalizeScopeOwner(scope);
  inMemoryBufferByScope[normalizedScope] = { ...EMPTY_BUFFER };
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(getScopedStorageKey(IDEA_BUFFER_STORAGE_KEY, normalizedScope));
    }
  } catch {
    // Ignore storage removal errors.
  }
}

export function resetMovementIdeaTestCache(): void {
  inMemoryMetaByScope = {};
  inMemoryHumanDraftByScope = {};
  inMemoryReusableBlocksByScope = {};
  inMemoryBufferByScope = {};
  persistedMetaScopes = new Set<string>();
  persistedHumanDraftScopes = new Set<string>();
  persistedReusableBlocksScopes = new Set<string>();
  activeSaveLock = false;
}

export function resetMovementIdeaStateForTests(): void {
  resetMovementIdeaTestCache();
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const keysToRemove: string[] = [];
      for (let i = 0; i < window.localStorage.length; i += 1) {
        const key = window.localStorage.key(i);
        if (
          key &&
          (key.startsWith(IDEA_META_STORAGE_KEY) ||
            key.startsWith(IDEA_BUFFER_STORAGE_KEY) ||
            key.startsWith(IDEA_REUSABLE_BLOCKS_STORAGE_KEY) ||
            key.startsWith(DEFAULT_HUMAN_DRAFT_STORAGE_KEY) ||
            key.startsWith(LEGACY_HUMAN_DRAFT_STORAGE_KEY))
        ) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach((key) => window.localStorage.removeItem(key));
    }
  } catch {
    // Ignore in test cleanup.
  }
}

function buildDisplayTitle(
  ideaLine: string,
  workingTitle?: string,
  variantLabelKo?: string,
): string {
  const explicit = (workingTitle ?? '').trim();
  const baseTitle =
    explicit.length >= 2
      ? explicit.slice(0, 100)
      : (() => {
          const cleaned = ideaLine.trim().replace(/\s+/g, ' ');
          if (cleaned.length >= 2) {
            return cleaned.length > 42 ? `${cleaned.slice(0, 42)}…` : cleaned;
          }
          if (cleaned.length === 1) {
            return `${cleaned} 동작 메모`;
          }
          return '';
        })();

  const trimmedVariant = (variantLabelKo ?? '').trim();
  if (trimmedVariant && baseTitle && !baseTitle.includes(trimmedVariant)) {
    return `${baseTitle} (${trimmedVariant})`.slice(0, 120);
  }
  return baseTitle;
}

export function calculateIdeaStepTimeBreakdown(input: {
  durationMin: number;
  explanationSec?: number;
  transitionSec?: number;
}): {
  durationMin: number;
  totalSec: number;
  movementSec: number;
  explanationSec: number;
  transitionSec: number;
} {
  const safeDurationMin =
    Number.isFinite(input.durationMin) && input.durationMin >= 0.5 && input.durationMin <= 20
      ? input.durationMin
      : 3;
  const totalSec = Math.max(30, Math.round(safeDurationMin * 60));
  const rawExplanation =
    typeof input.explanationSec === 'number' && Number.isFinite(input.explanationSec)
      ? Math.max(0, Math.round(input.explanationSec))
      : 20;
  const rawTransition =
    typeof input.transitionSec === 'number' && Number.isFinite(input.transitionSec)
      ? Math.max(0, Math.round(input.transitionSec))
      : 15;
  const clampedExplanation = Math.min(rawExplanation, Math.max(0, totalSec - 10));
  const clampedTransition = Math.min(
    rawTransition,
    Math.max(0, totalSec - clampedExplanation - 10),
  );
  const movementSec = Math.max(0, totalSec - clampedExplanation - clampedTransition);
  return {
    durationMin: safeDurationMin,
    totalSec,
    movementSec,
    explanationSec: clampedExplanation,
    transitionSec: clampedTransition,
  };
}

function syncHumanDraftOnSave(
  exerciseId: string,
  input: {
    ideaLine: string;
    workingTitle?: string;
    subjectiveFeeling: string;
    adjustmentNote: string;
    photoDataUrl: string;
    apparatus?: ApparatusType;
    level?: DifficultyLevel;
    durationMin?: number;
    repetitions?: number;
    sets?: number;
    sideMode?: StepSideMode;
    sectionRole?: ClassSectionRole;
    easyVariation?: string;
    standardVariation?: string;
    hardVariation?: string;
    variantLabelKo?: string;
    now: string;
    scope?: string;
  },
): HumanMovementDraft {
  const scope = input.scope ?? getActiveOwnerScope();
  const draftMap = getScopedHumanDraftMap(scope);
  const existingDraft = draftMap[exerciseId];
  const prevFeel = existingDraft?.feelLogs.at(-1)?.feelNoteKo ?? '';
  const prevMod = existingDraft?.modificationLogs.at(-1)?.modificationPointKo ?? '';
  const prevPhoto = existingDraft?.photoReferences.at(-1)?.localRefUri ?? '';

  if (!existingDraft) {
    let draft = createHumanMovementIdeaDraft({
      id: exerciseId,
      ideaLine: input.ideaLine,
      workingNameKo: input.workingTitle?.trim() || undefined,
      apparatus: input.apparatus,
      sectionRole: input.sectionRole,
      level: input.level,
      defaultDurationMin: input.durationMin,
      defaultRepetitions: input.repetitions,
      defaultSets: input.sets,
      isUnilateral: input.sideMode ? input.sideMode !== 'together' : undefined,
      sideMode: input.sideMode,
      now: input.now,
    });

    if (input.subjectiveFeeling) {
      draft = addSubjectiveFeelToDraft(draft, {
        feelNoteKo: input.subjectiveFeeling,
        now: input.now,
      });
    }
    if (input.adjustmentNote) {
      draft = addModificationLogToDraft(draft, {
        modificationPointKo: input.adjustmentNote,
        now: input.now,
      });
    }
    if (input.photoDataUrl && isSupportedLocalPhotoUri(input.photoDataUrl)) {
      draft = addPhotoReferenceToDraft(draft, {
        localRefUri: input.photoDataUrl,
        captionKo: '내 동작 참고 스케치',
        now: input.now,
      });
    }
    if (
      input.easyVariation?.trim() ||
      input.hardVariation?.trim() ||
      input.variantLabelKo?.trim()
    ) {
      draft = updateHumanDraftVariants(draft, {
        easy: input.easyVariation,
        standard: input.standardVariation || input.adjustmentNote || input.ideaLine,
        hard: input.hardVariation,
        variantLabelKo: input.variantLabelKo,
        now: input.now,
      });
    }

    draftMap[exerciseId] = draft;
    persistHumanDraftMap(scope);
    return draft;
  }

  let draft = existingDraft;
  let updatedOnce = false;

  if (input.subjectiveFeeling && input.subjectiveFeeling !== prevFeel) {
    draft = addSubjectiveFeelToDraft(draft, {
      feelNoteKo: input.subjectiveFeeling,
      now: input.now,
    });
    updatedOnce = true;
  }

  if (input.adjustmentNote && input.adjustmentNote !== prevMod) {
    draft = addModificationLogToDraft(draft, {
      modificationPointKo: input.adjustmentNote,
      now: input.now,
    });
    updatedOnce = true;
  }

  if (
    input.photoDataUrl &&
    input.photoDataUrl !== prevPhoto &&
    isSupportedLocalPhotoUri(input.photoDataUrl)
  ) {
    draft = addPhotoReferenceToDraft(draft, {
      localRefUri: input.photoDataUrl,
      captionKo: '내 동작 참고 스케치',
      now: input.now,
    });
    updatedOnce = true;
  }

  const prevEasy = draft.layers?.easy ?? '';
  const prevHard = draft.layers?.hard ?? '';
  const prevVariantLabel = draft.variantLabelKo ?? '';
  if (
    (input.easyVariation !== undefined && input.easyVariation.trim() !== prevEasy) ||
    (input.hardVariation !== undefined && input.hardVariation.trim() !== prevHard) ||
    (input.variantLabelKo !== undefined && input.variantLabelKo.trim() !== prevVariantLabel)
  ) {
    if (
      input.easyVariation?.trim() ||
      input.hardVariation?.trim() ||
      input.variantLabelKo?.trim() ||
      input.adjustmentNote?.trim()
    ) {
      draft = updateHumanDraftVariants(draft, {
        easy: input.easyVariation,
        standard: input.standardVariation || input.adjustmentNote || input.ideaLine,
        hard: input.hardVariation,
        variantLabelKo: input.variantLabelKo,
        now: input.now,
      });
      updatedOnce = true;
    }
  }

  const metadataChanged =
    input.ideaLine !== draft.ideaLine ||
    (input.workingTitle?.trim() || undefined) !== draft.workingNameKo ||
    (input.apparatus && input.apparatus !== draft.apparatus) ||
    (input.durationMin !== undefined && input.durationMin !== draft.defaultDurationMin) ||
    (input.repetitions !== undefined && input.repetitions !== draft.defaultRepetitions) ||
    (input.sets !== undefined && input.sets !== draft.defaultSets) ||
    (input.sideMode && input.sideMode !== draft.sideMode);

  if (metadataChanged || !updatedOnce) {
    draft = refineHumanDraftMetadata(draft, {
      ideaLine: input.ideaLine,
      workingNameKo: input.workingTitle?.trim() || undefined,
      apparatus: input.apparatus ?? draft.apparatus,
      sectionRole: input.sectionRole ?? draft.sectionRole,
      level: input.level ?? draft.level,
      defaultDurationMin: input.durationMin ?? draft.defaultDurationMin,
      defaultRepetitions: input.repetitions ?? draft.defaultRepetitions,
      defaultSets: input.sets ?? draft.defaultSets,
      isUnilateral: input.sideMode ? input.sideMode !== 'together' : draft.isUnilateral,
      sideMode: input.sideMode ?? draft.sideMode,
      now: input.now,
    });
  }

  draftMap[exerciseId] = draft;
  persistHumanDraftMap(scope);
  return draft;
}

export function saveMovementIdeaDraft(input: SaveMovementIdeaInput): {
  success: boolean;
  ok: boolean;
  exercise?: IdeaPilatesExercise;
  meta?: MovementIdeaMeta;
  draft?: HumanMovementDraft;
  error?: string;
} {
  const scope = getActiveOwnerScope();
  const draftMap = getScopedHumanDraftMap(scope);
  if (activeSaveLock) {
    const state = usePilatesStore.getState();
    const existing = input.existingExerciseId
      ? state.exercises.find((item) => item.id === input.existingExerciseId)
      : state.exercises.find((item) => isMovementIdeaExercise(item));
    if (existing) {
      return {
        success: true,
        ok: true,
        exercise: existing,
        meta: getMovementIdeaMeta(existing),
        draft: draftMap[existing.id],
      };
    }
  }

  const trimmedIdea = input.ideaLine.trim();
  if (!trimmedIdea) {
    return {
      success: false,
      ok: false,
      error: '떠오른 동작 아이디어를 한 줄로 적어 주세요.',
    };
  }

  if (input.simulateSaveError) {
    return {
      success: false,
      ok: false,
      error: '초안 저장을 완료하지 못했습니다. 작성한 내용은 그대로 유지되니 다시 시도해 주세요.',
    };
  }

  activeSaveLock = true;
  try {
    const state = usePilatesStore.getState();
    const now = new Date().toISOString();
    const existing = input.existingExerciseId
      ? state.exercises.find((item) => item.id === input.existingExerciseId)
      : undefined;
    const existingMeta = existing ? getMovementIdeaMeta(existing) : undefined;

    // Deduplicate rapid repeated clicks with the exact same 1-line idea within 2 seconds
    if (!existing) {
      const recentDuplicate = state.exercises.find((item) => {
        if (!isMovementIdeaExercise(item)) return false;
        const meta = getMovementIdeaMeta(item);
        const ageMs = Date.now() - new Date(meta.createdAt).getTime();
        return meta.ideaLine === trimmedIdea && ageMs >= 0 && ageMs < 2000;
      });
      if (recentDuplicate) {
        return {
          success: true,
          ok: true,
          exercise: recentDuplicate,
          meta: getMovementIdeaMeta(recentDuplicate),
          draft: draftMap[recentDuplicate.id],
        };
      }
    }

    const inferredApparatus = inferApparatusFromIdeaLine(trimmedIdea);
    const fallbackEquipment =
      state.draftCriteria?.availableEquipment?.[0] ||
      (state.activeApparatus !== 'mixed' ? state.activeApparatus : undefined) ||
      state.ownedEquipment[0] ||
      'mat';
    const chosenApparatus: ApparatusType =
      input.apparatus ||
      inferredApparatus ||
      existing?.apparatus ||
      getEquipmentFamily(fallbackEquipment) ||
      'mat';
    const requiredEquipment = input.apparatus
      ? [input.apparatus]
      : inferredApparatus
        ? [inferredApparatus]
        : existing?.requiredEquipment?.length
          ? [...existing.requiredEquipment]
          : [fallbackEquipment];

    const durationMin =
      typeof input.durationMin === 'number' &&
      Number.isFinite(input.durationMin) &&
      input.durationMin >= 0.5 &&
      input.durationMin <= 20
        ? input.durationMin
        : (existing?.defaultDurationMin ?? 3);

    const level: DifficultyLevel =
      input.level || existing?.level || state.draftCriteria?.level || state.activeLevel || '1.0';

    const variantLabelKo =
      input.variantLabelKo !== undefined
        ? input.variantLabelKo.trim()
        : (existingMeta?.variantLabelKo ?? '');
    const nameKo = buildDisplayTitle(trimmedIdea, input.workingTitle, variantLabelKo);
    const subjectiveFeeling = (input.subjectiveFeeling ?? '').trim();
    const adjustmentNote = (input.adjustmentNote ?? '').trim();
    const photoDataUrl = (input.photoDataUrl ?? '').trim();
    const easyVariation =
      input.easyVariation !== undefined
        ? input.easyVariation.trim()
        : (existing?.layers?.easy ?? '');
    const hardVariation =
      input.hardVariation !== undefined
        ? input.hardVariation.trim()
        : (existing?.layers?.hard ?? '');
    const standardVariation =
      input.standardVariation !== undefined ? input.standardVariation.trim() : adjustmentNote;
    const repetitions =
      typeof input.repetitions === 'number' &&
      Number.isFinite(input.repetitions) &&
      input.repetitions >= 1
        ? Math.round(input.repetitions)
        : existingMeta?.repetitions;
    const sets =
      typeof input.sets === 'number' && Number.isFinite(input.sets) && input.sets >= 1
        ? Math.round(input.sets)
        : existingMeta?.sets;
    const sideMode: StepSideMode | undefined =
      input.sideMode || existingMeta?.sideMode || undefined;
    const explanationSec =
      typeof input.explanationSec === 'number' && Number.isFinite(input.explanationSec)
        ? Math.max(0, Math.round(input.explanationSec))
        : existingMeta?.explanationSec;
    const transitionSec =
      typeof input.transitionSec === 'number' && Number.isFinite(input.transitionSec)
        ? Math.max(0, Math.round(input.transitionSec))
        : existingMeta?.transitionSec;
    const sectionRole: ClassSectionRole | undefined =
      input.sectionRole || existingMeta?.sectionRole || undefined;

    const triedByInstructor = Boolean(
      input.triedByInstructor || subjectiveFeeling || adjustmentNote || photoDataUrl,
    );

    const exerciseId = existing?.id ?? `ex-custom-idea-${crypto.randomUUID()}`;
    const humanDraft = syncHumanDraftOnSave(exerciseId, {
      ideaLine: trimmedIdea,
      workingTitle: input.workingTitle,
      subjectiveFeeling,
      adjustmentNote,
      photoDataUrl,
      apparatus: input.apparatus || inferredApparatus || undefined,
      level: input.level || undefined,
      durationMin,
      repetitions,
      sets,
      sideMode,
      sectionRole,
      easyVariation,
      standardVariation,
      hardVariation,
      variantLabelKo,
      now,
      scope,
    });

    const cues = [trimmedIdea, ...(adjustmentNote ? [`수정 메모: ${adjustmentNote}`] : [])];
    const precautions = subjectiveFeeling
      ? `강사 주관적 느낌 메모 (전문가 검증·효과 보장 아님): ${subjectiveFeeling}`
      : existing?.precautions || '강사 직접 창작 초안 · 수업 전 개인별 상태를 직접 확인하세요.';

    const baseExercise: IdeaPilatesExercise = {
      id: exerciseId,
      nameKo,
      nameEn: existing?.nameEn ?? '내 창작 동작 메모',
      apparatus: chosenApparatus,
      requiredEquipment,
      props: existing?.props?.length ? [...existing.props] : ['none'],
      blockCategory:
        sectionRole === 'preparation'
          ? 'warmup'
          : sectionRole === 'cooldown'
            ? 'cooldown'
            : (existing?.blockCategory ?? 'core'),
      spinalPlanes: existing?.spinalPlanes ?? [],
      bodyPosition:
        inferBodyPositionFromIdeaLine(trimmedIdea) ?? existing?.bodyPosition ?? 'supine',
      level,
      defaultDurationMin: durationMin,
      defaultRepetitions: repetitions,
      defaultSets: sets,
      isUnilateral: sideMode ? sideMode !== 'together' : (existing?.isUnilateral ?? false),
      springs: existing?.springs ?? '',
      box: existing?.box ?? 'none',
      footbar: existing?.footbar ?? 'none',
      headrest: existing?.headrest ?? 'flat',
      targetMuscles: existing?.targetMuscles ?? [],
      breathPattern: existing?.breathPattern ?? '',
      cues,
      precautions,
      layers: {
        easy: easyVariation,
        standard: standardVariation,
        hard: hardVariation,
      },
      youtube: existing?.youtube ?? {
        videoId: '',
        channelName: '',
        videoTitle: '',
        url: '',
        startSec: 0,
      },
      favoriteTag: existing?.favoriteTag ?? 'none',
      isCustom: true,
      createdAt: existing?.createdAt ?? now,
      sourceOrigin: 'human-created',
      humanDraftId: humanDraft.id,
      humanDraftRevision: humanDraft.revision,
      ...(humanDraft.parentDraftId ? { parentDraftId: humanDraft.parentDraftId } : {}),
      ...(humanDraft.parentDraftRevision !== undefined
        ? { parentDraftRevision: humanDraft.parentDraftRevision }
        : {}),
      ...(variantLabelKo || (input.workingTitle ?? '').trim()
        ? { variantLabelKo: variantLabelKo || (input.workingTitle ?? '').trim() }
        : {}),
      ideaLineSnapshot: trimmedIdea,
      feelLogsSnapshot: humanDraft.feelLogs.map((log) => structuredClone(log)),
      modificationLogsSnapshot: humanDraft.modificationLogs.map((log) => structuredClone(log)),
      photoReferencesSnapshot: humanDraft.photoReferences.map((ref) => ({
        ...structuredClone(ref),
        dataUrl: ref.localRefUri,
        label: ref.captionKo || (input.workingTitle ?? '').trim() || undefined,
      })),
      safetyBoundarySnapshot: structuredClone(humanDraft.safetyBoundary),
    };

    // Authoring and trying a movement do not constitute an instructor review.
    // Preserve a previous record as-is; material edits naturally make it stale.
    if (existing?.review) baseExercise.review = existing.review;

    const meta: MovementIdeaMeta = {
      exerciseId: baseExercise.id,
      ideaLine: trimmedIdea,
      workingTitle: (input.workingTitle ?? '').trim(),
      subjectiveFeeling,
      adjustmentNote,
      photoDataUrl,
      triedByInstructor,
      createdAt: existingMeta ? existingMeta.createdAt : now,
      updatedAt: now,
      easyVariation,
      standardVariation,
      hardVariation,
      variantLabelKo,
      parentDraftId: humanDraft.parentDraftId ?? existingMeta?.parentDraftId,
      parentDraftRevision: humanDraft.parentDraftRevision ?? existingMeta?.parentDraftRevision,
      revision: humanDraft.revision,
      revisionHistory: humanDraft.revisionHistory,
      repetitions,
      sets,
      sideMode,
      explanationSec,
      transitionSec,
      sectionRole,
    };

    const stepNoteParts = [
      ...(meta.subjectiveFeeling ? [`[느낌] ${meta.subjectiveFeeling}`] : []),
      ...(meta.adjustmentNote ? [`[수정] ${meta.adjustmentNote}`] : []),
      ...(meta.variantLabelKo ? [`[변형] ${meta.variantLabelKo}`] : []),
    ];
    const combinedInstructorNote = stepNoteParts.join(' · ');
    const timing = calculateIdeaStepTimeBreakdown({
      durationMin: baseExercise.defaultDurationMin || 3,
      explanationSec: meta.explanationSec,
      transitionSec: meta.transitionSec,
    });
    const embeddedSnapshot = createHumanDraftMovementSnapshot(humanDraft, {
      apparatus: baseExercise.apparatus,
      durationMin: timing.durationMin,
      repetitions: meta.repetitions,
      sets: meta.sets,
      sideMode: meta.sideMode,
    });

    try {
      if (existing) {
        usePilatesStore.setState((store) => ({
          exercises: store.exercises.map((item) =>
            item.id === baseExercise.id ? baseExercise : item,
          ),
          activeSteps: store.activeSteps.some((step) => step.exerciseId === baseExercise.id)
            ? store.activeSteps.map((step) =>
                step.exerciseId === baseExercise.id
                  ? {
                      ...step,
                      durationMin: timing.durationMin,
                      explanationSec: timing.explanationSec,
                      transitionSec: timing.transitionSec,
                      ...(meta.repetitions !== undefined ? { repetitions: meta.repetitions } : {}),
                      ...(meta.sets !== undefined ? { sets: meta.sets } : {}),
                      ...(meta.sideMode ? { sideMode: meta.sideMode } : {}),
                      ...(combinedInstructorNote ? { instructorNote: combinedInstructorNote } : {}),
                      exerciseSnapshot: embeddedSnapshot,
                      humanDraftId: baseExercise.humanDraftId,
                      humanDraftRevision: baseExercise.humanDraftRevision,
                    }
                  : step,
              )
            : store.activeSteps,
        }));
      } else {
        usePilatesStore.getState().addCustomExercise(baseExercise);
      }
    } catch {
      return {
        success: false,
        ok: false,
        error: '저장에 실패했습니다. 작성 중인 내용은 이 화면에 그대로 보관되어 있습니다.',
      };
    }

    const nextMap = {
      ...getMovementIdeaMetaMap(scope),
      [baseExercise.id]: meta,
    };
    persistScopedIdeaMetaMap(scope, nextMap);
    clearMovementIdeaWorkingBuffer(scope);
    if (photoDataUrl && photoDataUrl.startsWith('data:image/')) {
      void saveLocalPhotoAsset(baseExercise.id, photoDataUrl);
    }
    broadcastStudioSyncEvent({
      kind: 'human-draft-updated',
      entityId: baseExercise.id,
      revision: humanDraft.revision,
      updatedAt: now,
    });

    return {
      success: true,
      ok: true,
      exercise: baseExercise,
      meta,
      draft: humanDraft,
    };
  } finally {
    activeSaveLock = false;
  }
}

/**
 * Restores a previous revision (`v1`, `v2`, ...) non-destructively (creates `v(N+1)` with `parentRevision: targetRevision`)
 * and updates the live exercise & metadata without altering any past class snapshots.
 */
export function restoreMovementIdeaRevision(
  exerciseId: string,
  targetRevision: number,
): {
  success: boolean;
  ok: boolean;
  exercise?: PilatesExercise;
  meta?: MovementIdeaMeta;
  draft?: HumanMovementDraft;
  message: string;
} {
  const scope = getActiveOwnerScope();
  const draftMap = getScopedHumanDraftMap(scope);
  const state = usePilatesStore.getState();
  const existing = state.exercises.find((item) => item.id === exerciseId);
  const existingDraft = draftMap[exerciseId];
  if (!existing || !existingDraft) {
    return {
      success: false,
      ok: false,
      message: '복원할 초안 버전 정보를 찾을 수 없습니다.',
    };
  }

  try {
    const now = new Date().toISOString();
    const restoredDraft = restoreHumanDraftRevision(existingDraft, targetRevision, now);
    draftMap[exerciseId] = restoredDraft;
    persistHumanDraftMap(scope);

    const restoredFeel = restoredDraft.feelLogs.at(-1)?.feelNoteKo ?? '';
    const restoredMod = restoredDraft.modificationLogs.at(-1)?.modificationPointKo ?? '';
    const restoredPhoto = restoredDraft.photoReferences.at(-1)?.localRefUri ?? '';
    const restoredEasy = restoredDraft.layers?.easy ?? '';
    const restoredHard = restoredDraft.layers?.hard ?? '';
    const restoredStandard = restoredDraft.layers?.standard ?? restoredMod;
    const restoredVariantLabel = restoredDraft.variantLabelKo ?? '';
    const triedByInstructor = Boolean(restoredFeel || restoredMod || restoredPhoto);

    const nameKo = buildDisplayTitle(
      restoredDraft.ideaLine,
      restoredDraft.workingNameKo,
      restoredVariantLabel,
    );

    const updatedExercise: HierarchyPilatesExercise = {
      ...existing,
      nameKo,
      apparatus: restoredDraft.apparatus ?? existing.apparatus,
      level: restoredDraft.level ?? existing.level,
      defaultDurationMin: restoredDraft.defaultDurationMin ?? existing.defaultDurationMin,
      defaultRepetitions: restoredDraft.defaultRepetitions,
      defaultSets: restoredDraft.defaultSets,
      isUnilateral: restoredDraft.isUnilateral ?? existing.isUnilateral,
      cues: [restoredDraft.ideaLine, ...(restoredMod ? [`수정 메모: ${restoredMod}`] : [])],
      precautions: restoredFeel
        ? `강사 주관적 느낌 메모 (전문가 검증·효과 보장 아님): ${restoredFeel}`
        : '강사 직접 창작 초안 · 수업 전 개인별 상태를 직접 확인하세요.',
      layers: {
        easy: restoredEasy,
        standard: restoredStandard,
        hard: restoredHard,
      },
      humanDraftId: restoredDraft.id,
      humanDraftRevision: restoredDraft.revision,
    };

    if (existing.review) updatedExercise.review = existing.review;

    usePilatesStore.setState((store) => ({
      exercises: store.exercises.map((item) =>
        item.id === updatedExercise.id ? updatedExercise : item,
      ),
    }));

    const prevMeta = getMovementIdeaMeta(existing);
    const nextMeta: MovementIdeaMeta = {
      ...prevMeta,
      ideaLine: restoredDraft.ideaLine,
      workingTitle: restoredDraft.workingNameKo ?? '',
      subjectiveFeeling: restoredFeel,
      adjustmentNote: restoredMod,
      photoDataUrl: restoredPhoto,
      triedByInstructor,
      updatedAt: now,
      easyVariation: restoredEasy,
      standardVariation: restoredStandard,
      hardVariation: restoredHard,
      variantLabelKo: restoredVariantLabel,
      parentDraftId: restoredDraft.parentDraftId,
      parentDraftRevision: restoredDraft.parentDraftRevision,
      revision: restoredDraft.revision,
      revisionHistory: restoredDraft.revisionHistory,
      repetitions: restoredDraft.defaultRepetitions,
      sets: restoredDraft.defaultSets,
      sideMode: restoredDraft.sideMode,
      sectionRole: restoredDraft.sectionRole,
    };

    const nextMap = {
      ...getMovementIdeaMetaMap(scope),
      [updatedExercise.id]: nextMeta,
    };
    persistScopedIdeaMetaMap(scope, nextMap);

    return {
      success: true,
      ok: true,
      exercise: updatedExercise,
      meta: nextMeta,
      draft: restoredDraft,
      message: `v${targetRevision} 버전 내용을 새 리비전(v${restoredDraft.revision})으로 복원했습니다. (이전 이력과 과거 수업 기록은 모두 보존됩니다)`,
    };
  } catch (error) {
    return {
      success: false,
      ok: false,
      message: error instanceof Error ? error.message : '선택한 버전으로 복원하지 못했습니다.',
    };
  }
}

/**
 * Forks a new independent variant movement draft from an existing idea exercise (`forkHumanDraftVariant`),
 * keeping the original movement and any past class snapshots untouched.
 */
export function forkMovementIdeaVariant(
  sourceExerciseId: string,
  input: {
    variantLabelKo: string;
    ideaLine?: string;
    workingTitle?: string;
    easyVariation?: string;
    standardVariation?: string;
    hardVariation?: string;
    apparatus?: ApparatusType | '';
    durationMin?: number;
    level?: DifficultyLevel | '';
  },
): {
  success: boolean;
  ok: boolean;
  exercise?: PilatesExercise;
  meta?: MovementIdeaMeta;
  draft?: HumanMovementDraft;
  message: string;
} {
  const scope = getActiveOwnerScope();
  const draftMap = getScopedHumanDraftMap(scope);
  const state = usePilatesStore.getState();
  const sourceEx = state.exercises.find((item) => item.id === sourceExerciseId);
  if (!sourceEx) {
    return {
      success: false,
      ok: false,
      message: '변형을 파생할 원본 동작 초안을 찾을 수 없습니다.',
    };
  }

  const trimmedLabel = input.variantLabelKo.trim();
  if (!trimmedLabel) {
    return {
      success: false,
      ok: false,
      message: '새 변형 초안의 구분 이름(예: 쉬운 변형, 리포머 변형)을 적어 주세요.',
    };
  }

  const sourceMeta = getMovementIdeaMeta(sourceEx);
  const sourceDraft =
    draftMap[sourceExerciseId] ??
    createHumanMovementIdeaDraft({
      id: sourceExerciseId,
      ideaLine: sourceMeta.ideaLine,
      workingNameKo: sourceMeta.workingTitle || undefined,
      apparatus: sourceEx.apparatus,
      level: sourceEx.level,
      defaultDurationMin: sourceEx.defaultDurationMin,
    });

  const now = new Date().toISOString();
  const newExerciseId = `ex-custom-idea-${crypto.randomUUID()}`;

  try {
    const branchedDraft = forkHumanDraftVariant(sourceDraft, {
      id: newExerciseId,
      variantLabelKo: trimmedLabel,
      ideaLine: input.ideaLine?.trim() || sourceDraft.ideaLine,
      workingNameKo: input.workingTitle?.trim() || sourceDraft.workingNameKo,
      apparatus: input.apparatus || sourceDraft.apparatus,
      level: input.level || sourceDraft.level,
      defaultDurationMin: input.durationMin ?? sourceDraft.defaultDurationMin,
      layers: {
        easy: input.easyVariation ?? sourceMeta.easyVariation ?? sourceEx.layers.easy,
        standard: input.standardVariation ?? sourceMeta.adjustmentNote ?? sourceEx.layers.standard,
        hard: input.hardVariation ?? sourceMeta.hardVariation ?? sourceEx.layers.hard,
      },
      now,
    });

    draftMap[newExerciseId] = branchedDraft;
    persistHumanDraftMap(scope);

    const nameKo = buildDisplayTitle(
      branchedDraft.ideaLine,
      branchedDraft.workingNameKo,
      trimmedLabel,
    );

    const newExercise: HierarchyPilatesExercise = {
      ...structuredClone(sourceEx),
      id: newExerciseId,
      nameKo,
      apparatus: branchedDraft.apparatus ?? sourceEx.apparatus,
      level: branchedDraft.level ?? sourceEx.level,
      defaultDurationMin: branchedDraft.defaultDurationMin ?? sourceEx.defaultDurationMin,
      cues: [
        branchedDraft.ideaLine,
        ...(sourceMeta.adjustmentNote ? [`수정 메모: ${sourceMeta.adjustmentNote}`] : []),
      ],
      layers: {
        easy: branchedDraft.layers?.easy ?? '',
        standard: branchedDraft.layers?.standard ?? sourceMeta.adjustmentNote,
        hard: branchedDraft.layers?.hard ?? '',
      },
      isCustom: true,
      createdAt: now,
      humanDraftId: branchedDraft.id,
      humanDraftRevision: branchedDraft.revision,
    };

    // A newly forked movement has not been independently reviewed.
    newExercise.review = undefined;

    usePilatesStore.getState().addCustomExercise(newExercise);

    const newMeta: MovementIdeaMeta = {
      ...sourceMeta,
      exerciseId: newExerciseId,
      ideaLine: branchedDraft.ideaLine,
      workingTitle: branchedDraft.workingNameKo ?? sourceMeta.workingTitle,
      easyVariation: branchedDraft.layers?.easy ?? '',
      standardVariation: branchedDraft.layers?.standard ?? '',
      hardVariation: branchedDraft.layers?.hard ?? '',
      variantLabelKo: trimmedLabel,
      parentDraftId: sourceDraft.id,
      parentDraftRevision: sourceDraft.revision,
      revision: branchedDraft.revision,
      revisionHistory: branchedDraft.revisionHistory,
      createdAt: now,
      updatedAt: now,
    };

    const nextMap = {
      ...getMovementIdeaMetaMap(scope),
      [newExerciseId]: newMeta,
    };
    persistScopedIdeaMetaMap(scope, nextMap);

    return {
      success: true,
      ok: true,
      exercise: newExercise,
      meta: newMeta,
      draft: branchedDraft,
      message: `‘${nameKo}’ 새 변형 초안(원본 v${sourceDraft.revision} 기반)을 복제해 저장했습니다.`,
    };
  } catch (error) {
    return {
      success: false,
      ok: false,
      message: error instanceof Error ? error.message : '변형 초안 파생 저장에 실패했습니다.',
    };
  }
}

export function getSavedReusableBlocks(scope = getActiveOwnerScope()): ReusableBlock[] {
  const normalizedScope = normalizeScopeOwner(scope);
  const scopedKey = getScopedStorageKey(IDEA_REUSABLE_BLOCKS_STORAGE_KEY, normalizedScope);
  const bundleKey = getScopedStorageKey(DEFAULT_HUMAN_DRAFT_STORAGE_KEY, normalizedScope);

  const hasRawBlocksKey = hasStorageKey(scopedKey);
  const hasRawBundleKey = hasStorageKey(bundleKey);

  if (
    persistedReusableBlocksScopes.has(normalizedScope) &&
    !hasRawBlocksKey &&
    !hasRawBundleKey
  ) {
    inMemoryReusableBlocksByScope[normalizedScope] = [];
    persistedReusableBlocksScopes.delete(normalizedScope);
    return inMemoryReusableBlocksByScope[normalizedScope];
  }

  if (hasRawBlocksKey) {
    const stored = readStorageJson<ReusableBlock[] | null>(scopedKey, null);
    if (Array.isArray(stored)) {
      if (
        persistedReusableBlocksScopes.has(normalizedScope) ||
        (inMemoryReusableBlocksByScope[normalizedScope]?.length ?? 0) === 0
      ) {
        inMemoryReusableBlocksByScope[normalizedScope] = stored;
        persistedReusableBlocksScopes.add(normalizedScope);
      }
      return inMemoryReusableBlocksByScope[normalizedScope];
    }
  }

  const current = inMemoryReusableBlocksByScope[normalizedScope] ?? [];
  if (current.length === 0 && hasRawBundleKey) {
    const bundle = readStorageJson<{ reusableBlocks?: ReusableBlock[] } | null>(bundleKey, null);
    if (bundle && Array.isArray(bundle.reusableBlocks)) {
      inMemoryReusableBlocksByScope[normalizedScope] = bundle.reusableBlocks;
      persistedReusableBlocksScopes.add(normalizedScope);
      return inMemoryReusableBlocksByScope[normalizedScope];
    }
  }

  if (!inMemoryReusableBlocksByScope[normalizedScope]) {
    inMemoryReusableBlocksByScope[normalizedScope] = [];
  }
  return inMemoryReusableBlocksByScope[normalizedScope];
}

export function getReusableBlockTimingSummary(block: ReusableBlock): ReusableBlockTimingSummary {
  const scope = getActiveOwnerScope();
  const state = usePilatesStore.getState();
  return summarizeReusableBlockTiming(
    block,
    state.exercises,
    Object.values(getScopedHumanDraftMap(scope)),
  );
}

/**
 * Creates a new `ReusableBlock` or adds a movement idea to an existing `ReusableBlock` (`동작 → 재사용 블록`).
 * Editing a reusable block increments `block.version` and never mutates already-inserted sequence steps or past classes.
 */
export function saveIdeaToReusableBlock(input: {
  exerciseId: string;
  blockId?: string;
  blockTitle?: string;
  sectionRole?: ClassSectionRole;
  durationMin?: number;
  explanationSec?: number;
  transitionSec?: number;
  repetitions?: number;
  sets?: number;
  sideMode?: StepSideMode;
}): {
  success: boolean;
  ok: boolean;
  block?: ReusableBlock;
  blocks: ReusableBlock[];
  timingSummary?: ReusableBlockTimingSummary;
  message: string;
} {
  const scope = getActiveOwnerScope();
  const draftMap = getScopedHumanDraftMap(scope);
  const state = usePilatesStore.getState();
  const exercise = state.exercises.find((item) => item.id === input.exerciseId);
  if (!exercise) {
    return {
      success: false,
      ok: false,
      blocks: getSavedReusableBlocks(scope),
      message: '재사용 블록에 담을 동작 초안을 먼저 저장해 주세요.',
    };
  }

  const meta = getMovementIdeaMeta(exercise);
  const humanDraft =
    draftMap[exercise.id] ??
    createHumanMovementIdeaDraft({
      id: exercise.id,
      ideaLine: meta.ideaLine,
      workingNameKo: meta.workingTitle || undefined,
      apparatus: exercise.apparatus,
      level: exercise.level,
      defaultDurationMin: exercise.defaultDurationMin,
    });
  draftMap[exercise.id] = humanDraft;

  const durationMin = input.durationMin ?? exercise.defaultDurationMin ?? 3;
  const timing = calculateIdeaStepTimeBreakdown({
    durationMin,
    explanationSec: input.explanationSec ?? meta.explanationSec,
    transitionSec: input.transitionSec ?? meta.transitionSec,
  });
  const repetitions = input.repetitions ?? meta.repetitions;
  const sets = input.sets ?? meta.sets;
  const sideMode: StepSideMode =
    input.sideMode ?? meta.sideMode ?? (exercise.isUnilateral ? 'left-then-right' : 'together');
  const sectionRole: ClassSectionRole = input.sectionRole ?? meta.sectionRole ?? 'main';

  const currentBlocks = getSavedReusableBlocks(scope);
  const existingBlock = input.blockId
    ? currentBlocks.find((item) => item.id === input.blockId)
    : undefined;

  try {
    let targetBlock: ReusableBlock;
    if (existingBlock) {
      const snapshot = createHumanDraftMovementSnapshot(humanDraft, {
        apparatus: exercise.apparatus,
        sectionRole,
        durationMin: timing.durationMin,
        repetitions,
        sets,
        isUnilateral: sideMode !== 'together',
        sideMode,
      });
      targetBlock = addItemToReusableBlock(
        existingBlock,
        {
          exerciseId: exercise.id,
          durationMin: timing.durationMin,
          explanationSec: timing.explanationSec,
          transitionSec: timing.transitionSec,
          repetitions,
          sets,
          sideMode,
          selectedLayer: 'standard',
          exerciseSnapshot: snapshot,
          humanDraftId: humanDraft.id,
          humanDraftRevision: humanDraft.revision,
          humanDrafts: Object.values(draftMap),
        },
        state.exercises,
        Object.values(draftMap),
      );
    } else {
      const title = (input.blockTitle ?? '').trim() || `${exercise.nameKo} 재사용 블록`;
      targetBlock = createReusableBlock(
        {
          title,
          sectionRole,
          items: [
            {
              exerciseId: exercise.id,
              blockCategory: exercise.blockCategory,
              durationMin: timing.durationMin,
              explanationSec: timing.explanationSec,
              transitionSec: timing.transitionSec,
              repetitions,
              sets,
              sideMode,
              selectedLayer: 'standard',
              humanDraftId: humanDraft.id,
              humanDraftRevision: humanDraft.revision,
            },
          ],
          humanDrafts: Object.values(draftMap),
        },
        state.exercises,
        Object.values(draftMap),
      );
    }

    const nextBlocks = addReusableBlockToLibrary(currentBlocks, targetBlock);
    persistScopedReusableBlocks(scope, nextBlocks);
    broadcastStudioSyncEvent({
      kind: 'reusable-block-updated',
      entityId: targetBlock.id,
      revision: targetBlock.version,
      updatedAt: targetBlock.updatedAt,
    });

    const timingSummary = getReusableBlockTimingSummary(targetBlock);
    return {
      success: true,
      ok: true,
      block: targetBlock,
      blocks: nextBlocks,
      timingSummary,
      message: existingBlock
        ? `‘${targetBlock.title}’ 블록(v${targetBlock.version})에 동작을 추가했습니다. (기존 수업 시퀀스 복사본과 과거 수업은 변경되지 않습니다)`
        : `‘${targetBlock.title}’ 재사용 블록(v1 · 총 ${timingSummary.totalDurationMin}분)을 만들었습니다.`,
    };
  } catch (error) {
    return {
      success: false,
      ok: false,
      blocks: currentBlocks,
      message: error instanceof Error ? error.message : '재사용 블록 저장에 실패했습니다.',
    };
  }
}

export function moveIdeaReusableBlockItem(
  blockId: string,
  itemIndex: number,
  direction: 'up' | 'down',
): {
  success: boolean;
  ok: boolean;
  block?: ReusableBlock;
  blocks: ReusableBlock[];
  timingSummary?: ReusableBlockTimingSummary;
  message: string;
} {
  const scope = getActiveOwnerScope();
  const currentBlocks = getSavedReusableBlocks(scope);
  const found = currentBlocks.find((item) => item.id === blockId);
  if (!found) {
    return {
      success: false,
      ok: false,
      blocks: currentBlocks,
      message: '순서를 변경할 재사용 블록을 찾을 수 없습니다.',
    };
  }

  try {
    const updatedBlock = moveItemInReusableBlock(found, itemIndex, direction);
    const nextBlocks = addReusableBlockToLibrary(currentBlocks, updatedBlock);
    persistScopedReusableBlocks(scope, nextBlocks);
    const timingSummary = getReusableBlockTimingSummary(updatedBlock);
    return {
      success: true,
      ok: true,
      block: updatedBlock,
      blocks: nextBlocks,
      timingSummary,
      message: `‘${updatedBlock.title}’ 블록 순서를 변경했습니다 (v${updatedBlock.version}). 이미 수업에 넣은 복사본과 과거 수업은 바뀌지 않습니다.`,
    };
  } catch (error) {
    return {
      success: false,
      ok: false,
      blocks: currentBlocks,
      message: error instanceof Error ? error.message : '블록 순서 변경에 실패했습니다.',
    };
  }
}

/**
 * Copies a `ReusableBlock` into the current class sequence (`재사용 블록 → 시퀀스`) with an isolated `blockInstanceId`.
 * Subsequent edits to the block template or sequence steps never mutate each other or past classes.
 */
export function insertIdeaReusableBlockToCurrentClass(blockId: string): {
  success: boolean;
  ok: boolean;
  blockInstanceId?: string;
  addedStepCount: number;
  message: string;
} {
  const currentBlocks = getSavedReusableBlocks();
  const block = currentBlocks.find((item) => item.id === blockId);
  if (!block) {
    return {
      success: false,
      ok: false,
      addedStepCount: 0,
      message: '수업에 넣을 재사용 블록을 찾을 수 없습니다.',
    };
  }

  const state = usePilatesStore.getState();
  const inserted = insertReusableBlockIntoSequence(state.activeSteps, block);
  const blockApparatusList = block.apparatus === 'mixed' ? ['mat', 'reformer'] : [block.apparatus];
  const nextOwnedEquipment = Array.from(new Set([...state.ownedEquipment, ...blockApparatusList]));

  usePilatesStore.setState({
    activeSteps: inserted.steps,
    ownedEquipment: nextOwnedEquipment,
    generationError: null,
    saveFeedback: `‘${block.title}’ 재사용 블록(v${block.version}) 복사본을 현재 수업 시퀀스에 추가했습니다.`,
  });

  return {
    success: true,
    ok: true,
    blockInstanceId: inserted.blockInstanceId,
    addedStepCount: block.items.length,
    message: `‘${block.title}’ 재사용 블록(${block.items.length}개 동작)을 현재 수업 시퀀스에 복사해 넣었습니다.`,
  };
}

/**
 * Captures a deep-frozen `ClassSequenceSnapshot` (`시퀀스 → 수업`) of the current class so that any future
 * modifications to movement drafts, variants, or reusable blocks never alter past classes.
 */
export function captureCurrentClassHierarchySnapshot(title?: string): ClassSequenceSnapshot {
  const scope = getActiveOwnerScope();
  const draftMap = getScopedHumanDraftMap(scope);
  const state = usePilatesStore.getState();
  return createClassSequenceSnapshot(
    {
      id: `seq-${Date.now()}`,
      title: title || state.activeTitle || '내 필라테스 수업',
      subtitle: '강사 창작 동작 포함 수업 스냅샷',
      apparatus: state.activeApparatus,
      level: state.activeLevel,
      targetMinutes: state.activeTargetMinutes,
      steps: state.activeSteps,
      humanDrafts: Object.values(draftMap),
    },
    state.exercises,
    undefined,
    Object.values(draftMap),
  );
}

/**
 * Adds a user-created movement idea directly to the current class sequence (`activeSteps`)
 * without blocking it behind "catalog-only" or mismatched equipment filters, while keeping
 * `credentialVerified: false` so it never claims expert certification or medical/AI guarantee.
 */
export function addMovementIdeaToCurrentClass(exerciseId: string): {
  success: boolean;
  ok: boolean;
  alreadyAdded?: boolean;
  message: string;
} {
  const scope = getActiveOwnerScope();
  const state = usePilatesStore.getState();
  const found = state.exercises.find((item) => item.id === exerciseId);
  if (!found) {
    return {
      success: false,
      ok: false,
      message: '초안 동작을 찾지 못했습니다. 다시 저장해 주세요.',
    };
  }

  const meta = getMovementIdeaMeta(found);
  const humanDraft = getScopedHumanDraftMap(scope)[found.id];
  const stepNoteParts = [
    ...(meta.subjectiveFeeling ? [`[느낌] ${meta.subjectiveFeeling}`] : []),
    ...(meta.adjustmentNote ? [`[수정] ${meta.adjustmentNote}`] : []),
    ...(meta.variantLabelKo ? [`[변형] ${meta.variantLabelKo}`] : []),
  ];
  const combinedInstructorNote = stepNoteParts.join(' · ');

  const timing = calculateIdeaStepTimeBreakdown({
    durationMin: found.defaultDurationMin || 3,
    explanationSec: meta.explanationSec,
    transitionSec: meta.transitionSec,
  });

  // Ensure instructor self-check metadata is recorded with credentialVerified: false
  const baseWithPrecautions: HierarchyPilatesExercise = {
    ...found,
    precautions:
      found.precautions.trim() ||
      '강사 직접 창작 메모 · 객관적 효과 판정이나 전문가 검증이 아닙니다.',
    humanDraftId: humanDraft?.id ?? found.id,
    humanDraftRevision: humanDraft?.revision ?? meta.revision ?? 1,
  };
  const checkedExercise: HierarchyPilatesExercise = baseWithPrecautions;

  const embeddedSnapshot = humanDraft
    ? createHumanDraftMovementSnapshot(humanDraft, {
        apparatus: checkedExercise.apparatus,
        durationMin: timing.durationMin,
        repetitions: meta.repetitions,
        sets: meta.sets,
        sideMode: meta.sideMode,
      })
    : undefined;

  // Idempotent if already in activeSteps: update the exercise and step note in store and return success
  const alreadyInSteps = state.activeSteps.some((step) => step.exerciseId === exerciseId);
  if (alreadyInSteps) {
    usePilatesStore.setState((store) => ({
      exercises: store.exercises.map((item) =>
        item.id === checkedExercise.id ? checkedExercise : item,
      ),
      activeSteps: store.activeSteps.map((step) =>
        step.exerciseId === checkedExercise.id
          ? {
              ...step,
              durationMin: timing.durationMin,
              explanationSec: timing.explanationSec,
              transitionSec: timing.transitionSec,
              ...(meta.repetitions !== undefined ? { repetitions: meta.repetitions } : {}),
              ...(meta.sets !== undefined ? { sets: meta.sets } : {}),
              ...(meta.sideMode ? { sideMode: meta.sideMode } : {}),
              ...(combinedInstructorNote ? { instructorNote: combinedInstructorNote } : {}),
              ...(embeddedSnapshot ? { exerciseSnapshot: embeddedSnapshot } : {}),
              humanDraftId: checkedExercise.humanDraftId,
              humanDraftRevision: checkedExercise.humanDraftRevision,
            }
          : step,
      ),
      generationError: null,
      saveFeedback: `‘${checkedExercise.nameKo}’ 수정 내용을 현재 수업 시퀀스에 반영했습니다.`,
    }));
    return {
      success: true,
      ok: true,
      alreadyAdded: true,
      message: `‘${checkedExercise.nameKo}’ 수정 내용을 현재 수업에 반영했습니다.`,
    };
  }

  // First update the exercise and ensure ownedEquipment includes its equipment so store never blocks user-created movements
  const reqEq = checkedExercise.requiredEquipment ?? [checkedExercise.apparatus];
  const nextOwnedEquipment = Array.from(new Set([...state.ownedEquipment, ...reqEq]));
  const nextOwnedApparatus = Array.from(
    new Set([...state.ownedApparatus, checkedExercise.apparatus]),
  );

  usePilatesStore.setState((store) => ({
    exercises: store.exercises.map((item) =>
      item.id === checkedExercise.id ? checkedExercise : item,
    ),
    ownedEquipment: nextOwnedEquipment,
    ownedApparatus: nextOwnedApparatus,
    generationError: null,
  }));

  // Try standard store append first
  usePilatesStore
    .getState()
    .appendExerciseToSequence(checkedExercise.id, checkedExercise.blockCategory);
  const afterAppend = usePilatesStore.getState();
  if (afterAppend.activeSteps.some((step) => step.exerciseId === checkedExercise.id)) {
    usePilatesStore.setState((store) => ({
      activeSteps: store.activeSteps.map((step) =>
        step.exerciseId === checkedExercise.id
          ? {
              ...step,
              durationMin: timing.durationMin,
              explanationSec: timing.explanationSec,
              transitionSec: timing.transitionSec,
              ...(meta.repetitions !== undefined ? { repetitions: meta.repetitions } : {}),
              ...(meta.sets !== undefined ? { sets: meta.sets } : {}),
              ...(meta.sideMode ? { sideMode: meta.sideMode } : {}),
              ...(combinedInstructorNote ? { instructorNote: combinedInstructorNote } : {}),
              ...(embeddedSnapshot ? { exerciseSnapshot: embeddedSnapshot } : {}),
              humanDraftId: checkedExercise.humanDraftId,
              humanDraftRevision: checkedExercise.humanDraftRevision,
            }
          : step,
      ),
      generationError: null,
      saveFeedback: `‘${checkedExercise.nameKo}’ 동작을 현재 수업에 넣었습니다. (내 창작 메모 · 전문가 검증 아님)`,
    }));
    return {
      success: true,
      ok: true,
      message: `‘${checkedExercise.nameKo}’ 동작을 현재 수업에 넣었습니다.`,
    };
  }

  // Fallback: if draftCriteria had a different apparatus/level filter, append directly to activeSteps
  // so the instructor's own movement is never blocked by catalog-only or criteria filters.
  const newStep: SequenceStep = {
    stepId: `step-idea-${crypto.randomUUID()}`,
    order: afterAppend.activeSteps.length + 1,
    blockCategory: checkedExercise.blockCategory,
    exerciseId: checkedExercise.id,
    durationMin: timing.durationMin,
    selectedLayer: 'standard' as LayerMode,
    explanationSec: timing.explanationSec,
    transitionSec: afterAppend.activeSteps.length === 0 ? 0 : timing.transitionSec,
    ...(meta.repetitions !== undefined ? { repetitions: meta.repetitions } : {}),
    ...(meta.sets !== undefined ? { sets: meta.sets } : {}),
    ...(meta.sideMode ? { sideMode: meta.sideMode } : {}),
    ...(combinedInstructorNote ? { instructorNote: combinedInstructorNote } : {}),
    ...(embeddedSnapshot ? { exerciseSnapshot: embeddedSnapshot } : {}),
    humanDraftId: checkedExercise.humanDraftId,
    humanDraftRevision: checkedExercise.humanDraftRevision,
  };

  usePilatesStore.setState((store) => ({
    activeSteps: [...store.activeSteps, newStep],
    generationError: null,
    saveFeedback: `‘${checkedExercise.nameKo}’ 동작을 현재 수업에 넣었습니다. (내 창작 메모 · 전문가 검증 아님)`,
  }));

  return {
    success: true,
    ok: true,
    message: `‘${checkedExercise.nameKo}’ 동작을 현재 수업에 넣었습니다.`,
  };
}

export function saveSequenceStepsAsReusableBlock(input: {
  steps: readonly SequenceStep[];
  title: string;
  description?: string;
  sectionRole?: ClassSectionRole;
}): {
  success: boolean;
  ok: boolean;
  block?: ReusableBlock;
  blocks: ReusableBlock[];
  timingSummary?: ReusableBlockTimingSummary;
  message: string;
} {
  const scope = getActiveOwnerScope();
  const currentBlocks = getSavedReusableBlocks(scope);
  const nonRestSteps = input.steps.filter((step) => step.kind !== 'rest' && Boolean(step.exerciseId));
  if (nonRestSteps.length === 0) {
    return {
      success: false,
      ok: false,
      blocks: currentBlocks,
      message: '동작 묶음으로 저장할 동작을 1개 이상 선택해 주세요.',
    };
  }
  const cleanTitle = input.title.trim();
  if (!cleanTitle) {
    return {
      success: false,
      ok: false,
      blocks: currentBlocks,
      message: '동작 묶음 이름을 입력해 주세요.',
    };
  }

  try {
    const draftMap = getScopedHumanDraftMap(scope);
    const state = usePilatesStore.getState();
    const block = createReusableBlockFromSteps(
      {
        title: cleanTitle,
        description: input.description,
        sectionRole: input.sectionRole,
        steps: nonRestSteps,
        humanDrafts: Object.values(draftMap),
      },
      state.exercises,
      Object.values(draftMap),
    );
    const nextBlocks = addReusableBlockToLibrary(currentBlocks, block);
    persistScopedReusableBlocks(scope, nextBlocks);
    broadcastStudioSyncEvent({
      kind: 'reusable-block-updated',
      entityId: block.id,
      revision: block.version,
      updatedAt: block.updatedAt,
    });
    const timingSummary = getReusableBlockTimingSummary(block);
    return {
      success: true,
      ok: true,
      block,
      blocks: nextBlocks,
      timingSummary,
      message: `‘${block.title}’ 동작 묶음(${block.items.length}개 동작 · 총 ${timingSummary.totalDurationMin}분 · v1)을 저장했습니다.`,
    };
  } catch (error) {
    return {
      success: false,
      ok: false,
      blocks: currentBlocks,
      message: error instanceof Error ? error.message : '동작 묶음 저장에 실패했습니다.',
    };
  }
}

export function duplicateIdeaReusableBlock(blockId: string): {
  success: boolean;
  ok: boolean;
  block?: ReusableBlock;
  blocks: ReusableBlock[];
  timingSummary?: ReusableBlockTimingSummary;
  message: string;
} {
  const scope = getActiveOwnerScope();
  const currentBlocks = getSavedReusableBlocks(scope);
  try {
    const { blocks: nextBlocks, duplicated } = duplicateReusableBlockInLibrary(currentBlocks, blockId);
    persistScopedReusableBlocks(scope, nextBlocks);
    broadcastStudioSyncEvent({
      kind: 'reusable-block-updated',
      entityId: duplicated.id,
      revision: duplicated.version,
      updatedAt: duplicated.updatedAt,
    });
    const timingSummary = getReusableBlockTimingSummary(duplicated);
    return {
      success: true,
      ok: true,
      block: duplicated,
      blocks: nextBlocks,
      timingSummary,
      message: `‘${duplicated.title}’ 독립 복사본(v1)을 만들었습니다.`,
    };
  } catch (error) {
    return {
      success: false,
      ok: false,
      blocks: currentBlocks,
      message: error instanceof Error ? error.message : '동작 묶음 복제에 실패했습니다.',
    };
  }
}

export function syncSequenceBlockInstanceToLatest(
  blockInstanceId: string,
  blockId: string,
): {
  success: boolean;
  ok: boolean;
  syncedCount: number;
  newVersion?: number;
  message: string;
} {
  const block = getSavedReusableBlocks().find((item) => item.id === blockId);
  if (!block) {
    return {
      success: false,
      ok: false,
      syncedCount: 0,
      message: '원본 동작 묶음을 찾을 수 없습니다.',
    };
  }
  const before = usePilatesStore.getState();
  const matchingIndices = before.activeSteps
    .map((step, idx) => (step.blockInstanceId === blockInstanceId ? idx : -1))
    .filter((idx) => idx >= 0);

  if (matchingIndices.length === 0) {
    return {
      success: false,
      ok: false,
      syncedCount: 0,
      message: '현재 수업안에서 갱신할 묶음 구간을 찾을 수 없습니다.',
    };
  }

  const firstIndex = matchingIndices[0]!;
  const sectionOverride = before.activeSteps[firstIndex]?.classSection ?? block.sectionRole;
  const freshInserted = insertReusableBlockIntoSequence([], block, {
    instanceId: blockInstanceId,
    sectionRoleOverride: sectionOverride,
  });
  const replacementSteps = freshInserted.steps.map((step) =>
    step.selectedLayer ? step : { ...step, selectedLayer: 'standard' as const },
  );

  const undoEntry = {
    activeSequenceId: before.activeSequenceId,
    activeTitle: before.activeTitle,
    activeSubtitle: before.activeSubtitle,
    activeApparatus: before.activeApparatus,
    activeLevel: before.activeLevel,
    activeTargetMinutes: before.activeTargetMinutes,
    activeTargetGroupId: before.activeTargetGroupId,
    activeSteps: structuredClone(before.activeSteps),
    lastCriteria: before.lastCriteria ? structuredClone(before.lastCriteria) : null,
    draftCriteria: before.draftCriteria ? structuredClone(before.draftCriteria) : null,
  };

  let insertedReplacement = false;
  const rebuilt: SequenceStep[] = [];
  for (const step of before.activeSteps) {
    if (step.blockInstanceId === blockInstanceId) {
      if (!insertedReplacement) {
        rebuilt.push(...replacementSteps);
        insertedReplacement = true;
      }
      continue;
    }
    rebuilt.push(structuredClone(step));
  }
  const renumbered = rebuilt.map((step, idx) => ({
    ...step,
    order: idx + 1,
  }));

  usePilatesStore.setState({
    undoStack: [...before.undoStack.slice(-19), undoEntry],
    activeSteps: renumbered,
    generationError: null,
    saveFeedback: `‘${block.title}’ 최신 원본(v${block.version})을 이 수업 묶음 구간에 반영했습니다. 되돌리기로 복구할 수 있습니다.`,
  });

  return {
    success: true,
    ok: true,
    syncedCount: replacementSteps.length,
    newVersion: block.version,
    message: `‘${block.title}’ 최신 원본(v${block.version})을 이 수업에만 반영했습니다. 다른 수업과 이전 기록은 변경되지 않습니다.`,
  };
}

export function persistRecoveredReusableBlocksAndDrafts(input: {
  reusableBlocks?: readonly ReusableBlock[];
  humanMovementDrafts?: readonly HumanMovementDraft[];
}): void {
  const scope = normalizeScopeOwner(getActiveOwnerScope());
  if (input.humanMovementDrafts !== undefined) {
    const draftMap = getScopedHumanDraftMap(scope);
    for (const draft of input.humanMovementDrafts) {
      draftMap[draft.id] = structuredClone(draft);
    }
    persistHumanDraftMap(scope);
  }
  if (input.reusableBlocks !== undefined) {
    const clonedBlocks = input.reusableBlocks.map((b) => structuredClone(b));
    persistScopedReusableBlocks(scope, clonedBlocks);
  }
}

registerReusableBlockBackupBridge({
  getReusableBlocks: () => getSavedReusableBlocks(),
  getHumanDrafts: () => getSavedHumanMovementDrafts(),
  applyRestored: (payload) => persistRecoveredReusableBlocksAndDrafts(payload),
});

export const readMovementIdeaDraft = getMovementIdeaMeta;
export const clearIdeaWorkingBuffer = clearMovementIdeaWorkingBuffer;
export const readIdeaWorkingBuffer = loadMovementIdeaWorkingBuffer;
export const saveMovementIdeaToStore = saveMovementIdeaDraft;
