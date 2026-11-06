import {
  EQUIPMENT_OPTIONS,
  PROP_OPTIONS,
  getExerciseEquipment,
} from '../../data/equipmentCatalog';
import {
  APPARATUS_LABELS,
  CANONICAL_BLOCKS,
  INITIAL_EXERCISES,
  PROP_LABELS,
} from '../../data/pilatesCatalog';
import type {
  ClassBlockSnapshot,
  HumanMovementDraft,
  MovementSnapshot,
  ReusableBlock,
} from '../../types/hierarchy';
import type {
  ApparatusType,
  BoxState,
  ClassBlockCategory,
  DifficultyLevel,
  FootbarState,
  HeadrestState,
  LayerMode,
  PilatesExercise,
  PropType,
  SequenceStep,
  StepSideMode,
} from '../../types/pilates';
import type { ClassSectionRole } from '../../types/sequenceMotion';
import type { TeachingExerciseSnapshot } from '../../types/teachingHistorySnapshot';
import { getMovementSectionRole } from '../../utils/hierarchyModel';
import {
  formatSecondsToMMSS,
  getStepSideLabels,
  getStepTiming,
  isRestStep,
} from '../../utils/sequenceEngine';
import {
  DEFAULT_MAX_EXPANDED_ROWS,
  DEFAULT_MAX_INPUT_ITEMS,
  DEFAULT_MAX_NESTING_DEPTH,
  DEFAULT_MAX_REPEAT_PER_BLOCK,
  DEFAULT_MAX_SETS_EXPANSION,
  type ClassCueSheetExpandedRow,
  type ClassCueSheetItem,
  type ClassCueSheetProjection,
  type CueSheetBlockMeta,
  type CueSheetBoundaryMeta,
  type CueSheetCueContent,
  type CueSheetDiagnostic,
  type CueSheetDiagnosticCode,
  type CueSheetItemOriginKind,
  type CueSheetItemTiming,
  type CueSheetPracticeMeta,
  type CueSheetPrivacyMeta,
  type CueSheetProjectionOptions,
  type CueSheetSetupMeta,
  type CueSheetSourceInput,
  type CueSheetTimingSummary,
  type CueSheetTruncationMeta,
} from './classCueSheetTypes';

const KNOWN_APPARATUS_SET: ReadonlySet<ApparatusType> = new Set<ApparatusType>([
  'reformer',
  'cadillac',
  'chair',
  'barrel',
  'mat',
]);

const KNOWN_BLOCK_CATEGORIES: ReadonlySet<ClassBlockCategory> = new Set<ClassBlockCategory>(
  CANONICAL_BLOCKS.map((b) => b.category),
);

const KNOWN_SIDE_MODES: ReadonlySet<StepSideMode> = new Set<StepSideMode>([
  'together',
  'left',
  'right',
  'left-then-right',
  'right-then-left',
]);

const KNOWN_LAYER_MODES: ReadonlySet<LayerMode> = new Set<LayerMode>(['easy', 'standard', 'hard']);

const KNOWN_SECTION_ROLES: ReadonlySet<ClassSectionRole> = new Set<ClassSectionRole>([
  'preparation',
  'main',
  'cooldown',
]);

export const SENSITIVE_CUE_SHEET_KEYS: readonly string[] = Object.freeze([
  'address',
  'age',
  'ageBand',
  'birthDate',
  'clientId',
  'clientName',
  'clinicalNotes',
  'contact',
  'contraindications',
  'diagnosis',
  'email',
  'emergencyContact',
  'feelLogs',
  'feelLogsSnapshot',
  'gender',
  'groupId',
  'groupName',
  'healthNotes',
  'injury',
  'instructorObservations',
  'localConstraints',
  'localRefUri',
  'medicalHistory',
  'medicalNotes',
  'medication',
  'memberEmail',
  'memberId',
  'memberName',
  'memberPhone',
  'members',
  'painLevel',
  'painNotes',
  'participantAlias',
  'participantEmail',
  'participantName',
  'participantPhone',
  'participants',
  'patientId',
  'patientName',
  'pendingPhotoUri',
  'personalConstraint',
  'phone',
  'phoneNumber',
  'photoDataUrl',
  'photoReferences',
  'photoReferencesSnapshot',
  'pregnancy',
  'privateNote',
  'rehabNotes',
  'residentId',
  'rrn',
  'socialSecurityNumber',
  'studentId',
  'studentName',
  'surgeryHistory',
]);

const SENSITIVE_KEY_LOWER_SET: ReadonlySet<string> = new Set(
  SENSITIVE_CUE_SHEET_KEYS.map((key) => key.toLowerCase()),
);

const SENSITIVE_KEY_PATTERN =
  /^(participant|member|client|student|patient|resident)|(?:phone|email|birth|address|medical|diagnosis|injury|pain|pregnan|medicat|contraindicat|symptom|clinic|hospital|feellog|photoref|photouri|photodata|localrefuri|personalconstraint|localconstraint|instructorobservation|groupname|groupid|ageband)/i;

const SNAPSHOT_ARRAY_SENSITIVE_KEYS: ReadonlySet<string> = new Set([
  'feellogs',
  'feellogssnapshot',
  'photoreferences',
  'photoreferencessnapshot',
]);

export function isSensitiveCueSheetKey(key: string): boolean {
  if (typeof key !== 'string') return false;
  const trimmed = key.trim();
  if (!trimmed) return false;
  const lower = trimmed.toLowerCase();
  if (SENSITIVE_KEY_LOWER_SET.has(lower)) return true;
  return SENSITIVE_KEY_PATTERN.test(trimmed);
}

/**
 * Deterministically escapes HTML special characters, strips null bytes and
 * non-printable control characters (preserving \n and \t), and normalizes \r\n to \n.
 */
export function escapeCueSheetHtmlText(value: unknown): string {
  if (value === null || value === undefined) return '';
  let raw: string;
  if (typeof value === 'string') {
    raw = value;
  } else if (typeof value === 'number') {
    raw = Number.isFinite(value) ? String(value) : '';
  } else if (typeof value === 'boolean') {
    raw = String(value);
  } else {
    return '';
  }

  return (
    raw
      .replace(/\r\n?/g, '\n')
      // eslint-disable-next-line no-control-regex
      .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')
  );
}

/**
 * Trims and normalizes plain text, neutralizing any HTML/script-like tags, event handlers,
 * or script URI schemes using deterministic HTML escaping.
 */
export function sanitizeCueSheetPlainText(value: unknown): string {
  const escaped = escapeCueSheetHtmlText(value);
  if (!escaped) return '';

  const neutralized = escaped
    .replace(/javascript\s*:/gi, 'javascript&#58;')
    .replace(/vbscript\s*:/gi, 'vbscript&#58;')
    .replace(/data\s*:\s*text\/html/gi, 'data&#58;text/html')
    .replace(/\bon([a-z0-9_]+)\s*=/gi, 'on$1&#61;');

  return neutralized
    .split('\n')
    .map((line) => line.replace(/[ \t]+/g, ' ').trim())
    .join('\n')
    .trim();
}

interface RedactionTracker {
  redactedCount: number;
}

function redactAndSanitizeText(value: unknown, tracker: RedactionTracker): string {
  if (value === null || value === undefined) return '';
  if (typeof value !== 'string' && typeof value !== 'number' && typeof value !== 'boolean') {
    return '';
  }
  let text = String(value);

  // 1. Korean mobile & landline phone numbers
  text = text.replace(/\b01[016789][-.\s]?\d{3,4}[-.\s]?\d{4}\b/g, () => {
    tracker.redactedCount += 1;
    return '[연락처 비공개]';
  });
  text = text.replace(/\b0\d{1,2}-\d{3,4}-\d{4}\b/g, () => {
    tracker.redactedCount += 1;
    return '[연락처 비공개]';
  });

  // 2. Email addresses
  text = text.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, () => {
    tracker.redactedCount += 1;
    return '[이메일 비공개]';
  });

  // 3. Korean Resident Registration Number (RRN)
  text = text.replace(/\b\d{6}[-.\s]?[1-4]\d{6}\b/g, () => {
    tracker.redactedCount += 1;
    return '[개인식별번호 비공개]';
  });

  // 4. Explicit labeled sensitive markers
  text = text.replace(
    /(?:회원명|참가자명|참가자|고객명|환자명|진단명|병력|질환|수술력|복용약|주민번호|연락처|전화번호|memberName|participantName|clientName|diagnosis|medicalHistory|healthNotes)\s*[:：]\s*[^\n,;·|([]+/gi,
    () => {
      tracker.redactedCount += 1;
      return '[개인·건강정보 비공개]';
    },
  );

  return sanitizeCueSheetPlainText(text);
}

function deepFreeze<T>(value: T, seen = new Set< object >()): T {
  if (value === null || typeof value !== 'object') {
    return value;
  }
  const obj = value as unknown as object;
  if (seen.has(obj)) {
    return value;
  }
  seen.add(obj);

  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i += 1) {
      deepFreeze(value[i], seen);
    }
    return Object.freeze(value);
  }

  const record = value as Record<string, unknown>;
  for (const key of Object.keys(record)) {
    const child = record[key];
    if (child !== null && typeof child === 'object') {
      deepFreeze(child, seen);
    }
  }
  return Object.freeze(value);
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

const SKIP_SCAN_CONTAINER_KEYS: ReadonlySet<string> = new Set([
  'exercises',
  'exercisesById',
  'exerciseSnapshots',
  'humanDrafts',
  'reusableBlocks',
]);

interface InputGraphScanResult {
  strippedKeys: Set<string>;
  cycleEdges: Set<string>;
}

function scanInputGraphForPrivacyAndCycles(root: unknown): InputGraphScanResult {
  const strippedKeys = new Set<string>();
  const cycleEdges = new Set<string>();
  const ancestors = new Set<object>();
  const fullyVisited = new Set<object>();
  const objectIds = new Map<object, number>();
  let nextObjId = 1;
  let visitedNodeCount = 0;
  const MAX_SCAN_NODES = 4000;

  function getObjId(obj: object): number {
    let id = objectIds.get(obj);
    if (id === undefined) {
      id = nextObjId;
      nextObjId += 1;
      objectIds.set(obj, id);
    }
    return id;
  }

  function walk(node: unknown, parentId: number, edgeLabel: string): void {
    if (node === null || typeof node !== 'object') return;
    if (node instanceof Map || node instanceof Set) return;

    const obj = node as object;
    const currentId = getObjId(obj);

    if (ancestors.has(obj)) {
      cycleEdges.add(`${parentId}->${currentId}:${edgeLabel}`);
      return;
    }
    if (fullyVisited.has(obj) || visitedNodeCount >= MAX_SCAN_NODES) {
      return;
    }

    visitedNodeCount += 1;
    ancestors.add(obj);

    if (Array.isArray(node)) {
      for (let i = 0; i < node.length; i += 1) {
        walk(node[i], currentId, `[${i}]`);
      }
    } else {
      const record = node as Record<string, unknown>;
      for (const key of Object.keys(record)) {
        const val = record[key];
        if (isSensitiveCueSheetKey(key)) {
          if (val !== undefined && val !== null) {
            const lowerKey = key.toLowerCase();
            const isEmptySnapshotArray =
              SNAPSHOT_ARRAY_SENSITIVE_KEYS.has(lowerKey) &&
              Array.isArray(val) &&
              val.length === 0;
            if (!isEmptySnapshotArray) {
              strippedKeys.add(key);
            }
          }
          // Still check if the value under a sensitive key is a circular reference
          if (val !== null && typeof val === 'object' && ancestors.has(val as object)) {
            const targetId = getObjId(val as object);
            cycleEdges.add(`${currentId}->${targetId}:${key}`);
          }
          continue;
        }
        if (SKIP_SCAN_CONTAINER_KEYS.has(key)) {
          continue;
        }
        walk(val, currentId, key);
      }
    }

    ancestors.delete(obj);
    fullyVisited.add(obj);
  }

  walk(root, 0, 'root');
  return { strippedKeys, cycleEdges };
}

interface FlattenedStepEntry {
  rawStep: unknown;
  nestingDepth: number;
  wasDepthCapped: boolean;
  wasRepeatCapped: boolean;
  blockPathTitles: readonly string[];
  blockInstanceId: string | null;
  sourceBlockId: string | null;
  sourceBlockTitle: string | null;
  blockSectionRole: string | null;
  blockCategory: string | null;
  blockRepetitionCount: number;
}

function isBlockContainerNode(node: Record<string, unknown>): boolean {
  if (
    Array.isArray(node.items) ||
    Array.isArray(node.steps) ||
    Array.isArray(node.children) ||
    Array.isArray(node.blocks)
  ) {
    return true;
  }
  const hasBlockIdentity =
    typeof node.blockId === 'string' ||
    (typeof node.id === 'string' &&
      node.presetKind === 'reusable-block') ||
    ('children' in node && node.children !== undefined) ||
    ('blocks' in node && node.blocks !== undefined);
  const hasStepIdentity =
    typeof node.exerciseId === 'string' ||
    typeof node.stepId === 'string' ||
    typeof node.workingNameKo === 'string' ||
    typeof node.ideaLine === 'string' ||
    typeof node.nameKo === 'string' ||
    node.kind === 'exercise' ||
    node.kind === 'rest';
  return hasBlockIdentity && !hasStepIdentity;
}

function isMetadataOnlyBlockSnapshot(node: unknown): boolean {
  if (!isPlainObject(node)) return false;
  return (
    Array.isArray(node.stepIds) &&
    !Array.isArray(node.items) &&
    !Array.isArray(node.steps) &&
    !Array.isArray(node.children) &&
    !Array.isArray(node.blocks)
  );
}

function toSafePositiveInt(value: unknown, fallback: number): number {
  if (typeof value === 'number' && Number.isFinite(value) && value >= 1) {
    return Math.floor(value);
  }
  return fallback;
}

function makeSlug(text: string): string {
  const cleaned = text
    .normalize('NFKC')
    .toLowerCase()
    .replace(/&(?:amp|lt|gt|quot|#39|#58|#61);/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 24);
  return cleaned || 'item';
}

function resolveApparatusType(value: unknown): ApparatusType | null {
  if (typeof value === 'string' && KNOWN_APPARATUS_SET.has(value as ApparatusType)) {
    return value as ApparatusType;
  }
  return null;
}

function resolveBlockCategory(value: unknown): ClassBlockCategory | null {
  if (typeof value === 'string' && KNOWN_BLOCK_CATEGORIES.has(value as ClassBlockCategory)) {
    return value as ClassBlockCategory;
  }
  return null;
}

function resolveSectionRole(value: unknown): ClassSectionRole | null {
  if (typeof value !== 'string') return null;
  if (KNOWN_SECTION_ROLES.has(value as ClassSectionRole)) {
    return value as ClassSectionRole;
  }
  if (value === 'opening') return 'preparation';
  if (value === 'ending') return 'cooldown';
  return null;
}

function resolveSideMode(value: unknown): StepSideMode | null {
  if (typeof value === 'string' && KNOWN_SIDE_MODES.has(value as StepSideMode)) {
    return value as StepSideMode;
  }
  return null;
}

function resolveLayerMode(value: unknown): LayerMode | null {
  if (typeof value === 'string' && KNOWN_LAYER_MODES.has(value as LayerMode)) {
    return value as LayerMode;
  }
  return null;
}

function formatBoxLabelKo(box: unknown): string | null {
  if (box === 'long-box') return '롱박스';
  if (box === 'short-box') return '숏박스';
  if (box === 'none') return '박스 없음';
  return null;
}

function formatFootbarLabelKo(footbar: unknown): string | null {
  if (footbar === 'high') return '풋바 High';
  if (footbar === 'mid') return '풋바 Mid';
  if (footbar === 'low') return '풋바 Low';
  if (footbar === 'down') return '풋바 Down';
  if (footbar === 'none') return '풋바 없음';
  return null;
}

function formatHeadrestLabelKo(headrest: unknown): string | null {
  if (headrest === 'up') return '헤드레스트 Up';
  if (headrest === 'flat') return '헤드레스트 Flat';
  if (headrest === 'down') return '헤드레스트 Down';
  return null;
}

function formatLayerLabelKo(layer: LayerMode | null): string | null {
  if (layer === 'easy') return 'Easy (기초·가동성)';
  if (layer === 'standard') return 'Standard (표준)';
  if (layer === 'hard') return 'Hard (심화·챌린지)';
  return null;
}

function formatSectionLabelKo(role: ClassSectionRole | 'unspecified', isRest: boolean): string {
  if (isRest) return '휴식 구간';
  switch (role) {
    case 'preparation':
      return '준비 구간 (Preparation)';
    case 'main':
      return '메인 구간 (Main)';
    case 'cooldown':
      return '쿨다운 구간 (Cooldown)';
    default:
      return '구간 미지정';
  }
}

function formatSideBadgeKo(
  sideMode: StepSideMode | 'unspecified',
  isUnilateral: boolean,
  isRest: boolean,
): string {
  if (isRest) return '휴식';
  switch (sideMode) {
    case 'left':
      return '좌측 (왼쪽)';
    case 'right':
      return '우측 (오른쪽)';
    case 'together':
      return '양측 (양쪽 함께)';
    case 'left-then-right':
      return '양측 순차 (왼쪽 → 오른쪽)';
    case 'right-then-left':
      return '양측 순차 (오른쪽 → 왼쪽)';
    default:
      return isUnilateral ? '편측 (첫 번째 쪽 → 반대쪽)' : '양측 기본 (함께)';
  }
}

function formatLevelLabelKo(level: unknown): string {
  if (level === '1.0') return 'Lv 1.0 (기초·정렬)';
  if (level === '1.5') return 'Lv 1.5 (중급·표준)';
  if (level === '2.0') return 'Lv 2.0 (심화·챌린지)';
  return '난이도 미지정';
}

const DEFAULT_BOUNDARY_META: CueSheetBoundaryMeta = {
  integrationStatus: 'standalone-integration-candidate',
  connectedToAppRoutes: false,
  autoPrescriptionUsed: false,
  safetyOrEfficacyGuaranteed: false,
  forcedMovementClassification: false,
  externalNetworkOrAiUsed: false,
  storageMutated: false,
  privacyAllowlistApplied: true,
  disclaimerKo:
    '본 큐시트 프리뷰는 강사가 구성한 수업 흐름과 메모를 읽기 전용으로 보여주는 독립 통합 후보 모듈이며, 자동 처방·강제 분류·의학적 안전성이나 효과를 보증하지 않습니다.',
};

export function buildClassCueSheetProjection(
  input: CueSheetSourceInput,
  options?: CueSheetProjectionOptions,
): ClassCueSheetProjection {
  const maxInputItemsCap = toSafePositiveInt(options?.maxInputItems, DEFAULT_MAX_INPUT_ITEMS);
  const maxExpandedRowsCap = toSafePositiveInt(options?.maxExpandedRows, DEFAULT_MAX_EXPANDED_ROWS);
  const maxNestingDepthCap = toSafePositiveInt(options?.maxNestingDepth, DEFAULT_MAX_NESTING_DEPTH);
  const maxRepeatPerBlockCap = toSafePositiveInt(
    options?.maxRepeatPerBlock,
    DEFAULT_MAX_REPEAT_PER_BLOCK,
  );
  const maxSetsExpansionCap = toSafePositiveInt(
    options?.maxSetsExpansion,
    DEFAULT_MAX_SETS_EXPANSION,
  );

  const redactionTracker: RedactionTracker = { redactedCount: 0 };
  const diagnosticsMap = new Map<
    CueSheetDiagnosticCode,
    { messageKo: string; orders: Set<number> }
  >();

  function recordDiagnostic(
    code: CueSheetDiagnosticCode,
    messageKo: string,
    order?: number,
  ): void {
    let entry = diagnosticsMap.get(code);
    if (!entry) {
      entry = { messageKo, orders: new Set<number>() };
      diagnosticsMap.set(code, entry);
    }
    if (typeof order === 'number' && Number.isFinite(order) && order > 0) {
      entry.orders.add(order);
    }
  }

  // Handle null, undefined, primitive, or array input gracefully
  if (input === null || input === undefined || typeof input !== 'object' || Array.isArray(input)) {
    recordDiagnostic(
      'corrupted-input',
      '입력된 수업 데이터가 비어 있거나 올바른 객체 형식이 아니어서 빈 큐시트로 복구했습니다.',
    );
    recordDiagnostic('empty-class', '등록된 수업 동작 항목이 없습니다.');

    const emptyTimingSummary: CueSheetTimingSummary = {
      knownTotalSec: 0,
      knownExerciseSec: 0,
      knownRestSec: 0,
      knownTotalLabelKo: '00:00',
      knownExerciseLabelKo: '00:00',
      knownRestLabelKo: '00:00',
      targetMinutes: null,
      knownItemCount: 0,
      unspecifiedItemCount: 0,
      hasUnspecifiedTime: false,
      timingSummaryLabelKo: '등록된 항목 없음 (00:00)',
    };

    const emptyTruncation: CueSheetTruncationMeta = {
      isTruncated: false,
      maxInputItemsCap,
      maxExpandedRowsCap,
      maxNestingDepthCap,
      maxRepeatPerBlockCap,
      maxSetsExpansionCap,
      omittedInputItemCount: 0,
      omittedExpandedRowCount: 0,
      cappedBlockRepetitionCount: 0,
      cappedDepthCount: 0,
      circularReferenceCount: 0,
      reasonsKo: [],
    };

    const emptyPrivacy: CueSheetPrivacyMeta = {
      allowlistApplied: true,
      strippedSensitiveKeys: [],
      redactedInlineTextCount: 0,
    };

    const emptyProjection: ClassCueSheetProjection = {
      cueSheetId: 'cue-sheet-recovered-empty',
      sourceId: 'recovered-empty',
      title: '제목 미지정 수업',
      subtitle: '',
      apparatusLabelKo: '기구 미지정',
      levelLabelKo: '난이도 미지정',
      isEmpty: true,
      itemCount: 0,
      exerciseCount: 0,
      restCount: 0,
      nameOnlyCount: 0,
      duplicateNameGroupCount: 0,
      allEquipmentLabelsKo: [],
      allPropLabelsKo: [],
      timingSummary: emptyTimingSummary,
      items: [],
      expandedRows: [],
      truncation: emptyTruncation,
      privacy: emptyPrivacy,
      diagnostics: Array.from(diagnosticsMap.entries()).map(([code, val]) => ({
        code,
        messageKo: val.messageKo,
        itemOrders: Array.from(val.orders).sort((a, b) => a - b),
      })),
      boundary: { ...DEFAULT_BOUNDARY_META },
    };

    return deepFreeze(emptyProjection);
  }

  const rawInput = input as Record<string, unknown>;

  // Privacy & cycle graph scan on input
  const graphScan = scanInputGraphForPrivacyAndCycles(rawInput);
  let circularReferenceCount = graphScan.cycleEdges.size;

  // Check if input has recognizable structure or corrupted collection fields
  const hasInvalidCollectionField =
    ('steps' in rawInput && rawInput.steps !== undefined && !Array.isArray(rawInput.steps)) ||
    ('items' in rawInput && rawInput.items !== undefined && !Array.isArray(rawInput.items)) ||
    ('blocks' in rawInput && rawInput.blocks !== undefined && !Array.isArray(rawInput.blocks));

  const hasRecognizableClassProperty =
    Array.isArray(rawInput.steps) ||
    Array.isArray(rawInput.items) ||
    Array.isArray(rawInput.blocks) ||
    typeof rawInput.title === 'string' ||
    typeof rawInput.sequenceTitle === 'string' ||
    typeof rawInput.sourceSequenceTitle === 'string' ||
    typeof rawInput.id === 'string' ||
    typeof rawInput.snapshotId === 'string' ||
    typeof rawInput.sourceSequenceId === 'string' ||
    isPlainObject(rawInput.sequenceSnapshot);

  if (hasInvalidCollectionField || !hasRecognizableClassProperty) {
    recordDiagnostic(
      'corrupted-input',
      '수업 데이터 일부 필드가 손상되었거나 비표준 형식이어서 유효한 항목만 안전하게 복구했습니다.',
    );
  }

  // Build read-only lookup maps for exercises, snapshots, human drafts, and reusable blocks
  const catalogMap = new Map<string, PilatesExercise>();
  for (const ex of INITIAL_EXERCISES) {
    catalogMap.set(ex.id, ex);
  }
  const inputExercises = rawInput.exercises;
  if (inputExercises instanceof Map) {
    for (const [k, v] of inputExercises.entries()) {
      if (typeof k === 'string' && isPlainObject(v)) {
        catalogMap.set(k, v as unknown as PilatesExercise);
      }
    }
  } else if (Array.isArray(inputExercises)) {
    for (const ex of inputExercises) {
      if (isPlainObject(ex) && typeof ex.id === 'string') {
        catalogMap.set(ex.id, ex as unknown as PilatesExercise);
      }
    }
  }
  if (options?.exercises instanceof Map) {
    for (const [k, v] of options.exercises.entries()) {
      if (typeof k === 'string' && isPlainObject(v)) {
        catalogMap.set(k, v as unknown as PilatesExercise);
      }
    }
  } else if (Array.isArray(options?.exercises)) {
    for (const ex of options.exercises) {
      if (isPlainObject(ex) && typeof ex.id === 'string') {
        catalogMap.set(ex.id, ex as unknown as PilatesExercise);
      }
    }
  }

  const snapshotMap = new Map<string, MovementSnapshot | TeachingExerciseSnapshot>();
  const seqSnapshot = isPlainObject(rawInput.sequenceSnapshot)
    ? (rawInput.sequenceSnapshot as Record<string, unknown>)
    : null;

  const snapshotSources = [
    seqSnapshot?.exerciseSnapshots,
    rawInput.exerciseSnapshots,
    rawInput.exercisesById,
    options?.exerciseSnapshots,
  ];
  for (const source of snapshotSources) {
    if (isPlainObject(source)) {
      for (const [k, v] of Object.entries(source)) {
        if (isPlainObject(v)) {
          snapshotMap.set(k, v as unknown as MovementSnapshot | TeachingExerciseSnapshot);
        }
      }
    }
  }

  const draftMap = new Map<string, HumanMovementDraft>();
  const draftSources = [rawInput.humanDrafts, options?.humanDrafts];
  for (const source of draftSources) {
    if (Array.isArray(source)) {
      for (const draft of source) {
        if (isPlainObject(draft) && typeof draft.id === 'string') {
          draftMap.set(draft.id, draft as unknown as HumanMovementDraft);
        }
      }
    }
  }

  const reusableBlockMap = new Map<string, ReusableBlock>();
  const blockSources = [rawInput.reusableBlocks, options?.reusableBlocks];
  for (const source of blockSources) {
    if (Array.isArray(source)) {
      for (const blk of source) {
        if (isPlainObject(blk) && typeof blk.id === 'string') {
          reusableBlockMap.set(blk.id, blk as unknown as ReusableBlock);
        }
      }
    }
  }

  const blockSnapshotByInstanceId = new Map<string, ClassBlockSnapshot>();
  const blockSnapshotSources = [rawInput.blockSnapshots, seqSnapshot?.blockSnapshots];
  for (const source of blockSnapshotSources) {
    if (Array.isArray(source)) {
      for (const bs of source) {
        if (isPlainObject(bs) && typeof bs.blockInstanceId === 'string') {
          blockSnapshotByInstanceId.set(bs.blockInstanceId, bs as unknown as ClassBlockSnapshot);
        }
      }
    }
  }

  // Flatten input items and nested blocks with cycle protection and finite caps
  const flattenedEntries: FlattenedStepEntry[] = [];
  let omittedInputItemCount = 0;
  let cappedBlockRepetitionCount = 0;
  let cappedDepthCount = 0;

  const traversalAncestors = new Set<object>([rawInput]);
  const HARD_DEPTH_CEILING = Math.max(maxNestingDepthCap + 12, 24);

  function pushLeafItem(entry: FlattenedStepEntry): void {
    if (flattenedEntries.length < maxInputItemsCap) {
      flattenedEntries.push(entry);
    } else {
      omittedInputItemCount += 1;
    }
  }

  interface BlockTraversalContext {
    rawDepth: number;
    wasDepthCapped: boolean;
    wasRepeatCapped: boolean;
    blockPathTitles: readonly string[];
    blockInstanceId: string | null;
    sourceBlockId: string | null;
    sourceBlockTitle: string | null;
    blockSectionRole: string | null;
    blockCategory: string | null;
    blockRepetitionCount: number;
  }

  function traverseBlockNode(
    blockObj: Record<string, unknown>,
    parentCtx: BlockTraversalContext,
  ): void {
    if (traversalAncestors.has(blockObj)) {
      // Only increment if not already counted by graphScan
      if (circularReferenceCount === 0) {
        circularReferenceCount += 1;
      }
      recordDiagnostic(
        'circular-reference',
        '중첩 블록 또는 수업 항목에서 순환 참조(Circular Reference)가 감지되어 무한 루프를 차단했습니다.',
      );
      return;
    }

    const nextRawDepth = parentCtx.rawDepth + 1;
    if (nextRawDepth > HARD_DEPTH_CEILING) {
      cappedDepthCount += 1;
      recordDiagnostic(
        'nesting-depth-capped',
        `블록 중첩 깊이가 최대 허용 한도(${maxNestingDepthCap}단계)를 초과하여 제한되었습니다.`,
      );
      return;
    }

    let wasDepthCapped = parentCtx.wasDepthCapped;
    if (nextRawDepth > maxNestingDepthCap) {
      cappedDepthCount += 1;
      wasDepthCapped = true;
      recordDiagnostic(
        'nesting-depth-capped',
        `블록 중첩 깊이가 최대 허용 한도(${maxNestingDepthCap}단계)를 초과하여 ${maxNestingDepthCap}단계로 고정되었습니다.`,
      );
    }

    const rawBlockReps = blockObj.blockRepetitions ?? blockObj.repetitions ?? 1;
    let localReps =
      typeof rawBlockReps === 'number' && Number.isFinite(rawBlockReps) && rawBlockReps >= 1
        ? Math.floor(rawBlockReps)
        : 1;
    let wasRepeatCapped = parentCtx.wasRepeatCapped;

    if (localReps > maxRepeatPerBlockCap) {
      localReps = maxRepeatPerBlockCap;
      cappedBlockRepetitionCount += 1;
      wasRepeatCapped = true;
      recordDiagnostic(
        'block-repeat-capped',
        `블록 반복 횟수가 최대 허용 한도(${maxRepeatPerBlockCap}회)를 초과하여 ${maxRepeatPerBlockCap}회로 제한되었습니다.`,
      );
    }

    let combinedReps = parentCtx.blockRepetitionCount * localReps;
    if (combinedReps > maxRepeatPerBlockCap) {
      combinedReps = maxRepeatPerBlockCap;
      if (!wasRepeatCapped) {
        cappedBlockRepetitionCount += 1;
        wasRepeatCapped = true;
        recordDiagnostic(
          'block-repeat-capped',
          `중첩 블록 누적 반복 횟수가 최대 허용 한도(${maxRepeatPerBlockCap}회)를 초과하여 ${maxRepeatPerBlockCap}회로 제한되었습니다.`,
        );
      }
    }

    const blockTitle = redactAndSanitizeText(
      blockObj.title ?? blockObj.sourceBlockTitle ?? blockObj.nameKo ?? blockObj.name ?? '',
      redactionTracker,
    );
    const nextPathTitles =
      blockTitle && parentCtx.blockPathTitles.length < maxNestingDepthCap
        ? [...parentCtx.blockPathTitles, blockTitle]
        : parentCtx.blockPathTitles;

    const blockIdStr = redactAndSanitizeText(
      blockObj.blockId ?? blockObj.sourceBlockId ?? blockObj.id ?? '',
      redactionTracker,
    );
    const blockInstanceIdStr = redactAndSanitizeText(
      blockObj.blockInstanceId ?? blockIdStr ?? '',
      redactionTracker,
    );

    const nextCtx: BlockTraversalContext = {
      rawDepth: nextRawDepth,
      wasDepthCapped,
      wasRepeatCapped,
      blockPathTitles: nextPathTitles,
      blockInstanceId: blockInstanceIdStr || parentCtx.blockInstanceId,
      sourceBlockId: blockIdStr || parentCtx.sourceBlockId,
      sourceBlockTitle: blockTitle || parentCtx.sourceBlockTitle,
      blockSectionRole:
        typeof blockObj.sectionRole === 'string'
          ? blockObj.sectionRole
          : parentCtx.blockSectionRole,
      blockCategory:
        typeof blockObj.blockCategory === 'string'
          ? blockObj.blockCategory
          : parentCtx.blockCategory,
      blockRepetitionCount: combinedReps,
    };

    traversalAncestors.add(blockObj);

    const childArrays: unknown[][] = [];
    const seenChildArrays = new Set<object>();
    for (const key of ['items', 'steps', 'children', 'blocks'] as const) {
      const candidate = blockObj[key];
      if (Array.isArray(candidate)) {
        if (traversalAncestors.has(candidate)) {
          if (circularReferenceCount === 0) {
            circularReferenceCount += 1;
          }
          recordDiagnostic(
            'circular-reference',
            '중첩 블록 배열에서 순환 참조가 감지되어 무한 루프를 차단했습니다.',
          );
          continue;
        }
        if (!seenChildArrays.has(candidate)) {
          seenChildArrays.add(candidate);
          childArrays.push(candidate);
        }
      }
    }

    for (const arr of childArrays) {
      traversalAncestors.add(arr);
      for (const child of arr) {
        if (child !== null && typeof child === 'object' && !Array.isArray(child)) {
          const childRecord = child as Record<string, unknown>;
          if (isBlockContainerNode(childRecord)) {
            traverseBlockNode(childRecord, nextCtx);
            continue;
          }
        }
        pushLeafItem({
          rawStep: child,
          nestingDepth: Math.min(nextCtx.rawDepth, maxNestingDepthCap),
          wasDepthCapped: nextCtx.wasDepthCapped,
          wasRepeatCapped: nextCtx.wasRepeatCapped,
          blockPathTitles: nextCtx.blockPathTitles,
          blockInstanceId: nextCtx.blockInstanceId,
          sourceBlockId: nextCtx.sourceBlockId,
          sourceBlockTitle: nextCtx.sourceBlockTitle,
          blockSectionRole: nextCtx.blockSectionRole,
          blockCategory: nextCtx.blockCategory,
          blockRepetitionCount: nextCtx.blockRepetitionCount,
        });
      }
      traversalAncestors.delete(arr);
    }

    traversalAncestors.delete(blockObj);
  }

  const rootCtx: BlockTraversalContext = {
    rawDepth: 0,
    wasDepthCapped: false,
    wasRepeatCapped: false,
    blockPathTitles: [],
    blockInstanceId: null,
    sourceBlockId: null,
    sourceBlockTitle: null,
    blockSectionRole: null,
    blockCategory: null,
    blockRepetitionCount: 1,
  };

  const seenTopArrays = new Set<object>();

  // 1. Top-level steps / items (or fallback to sequenceSnapshot.steps)
  const stepCollections: unknown[] = [
    rawInput.steps,
    rawInput.items,
    !Array.isArray(rawInput.steps) && !Array.isArray(rawInput.items) ? seqSnapshot?.steps : null,
  ];

  for (const col of stepCollections) {
    if (!Array.isArray(col) || seenTopArrays.has(col)) continue;
    seenTopArrays.add(col);
    traversalAncestors.add(col);

    for (const element of col) {
      if (element !== null && typeof element === 'object' && !Array.isArray(element)) {
        const elemObj = element as Record<string, unknown>;
        if (traversalAncestors.has(elemObj)) {
          if (circularReferenceCount === 0) {
            circularReferenceCount += 1;
          }
          recordDiagnostic(
            'circular-reference',
            '수업 항목에서 자기 참조/순환 참조가 감지되어 건너뛰었습니다.',
          );
          continue;
        }
        if (isBlockContainerNode(elemObj)) {
          traverseBlockNode(elemObj, rootCtx);
          continue;
        }
      }
      pushLeafItem({
        rawStep: element,
        nestingDepth: 0,
        wasDepthCapped: false,
        wasRepeatCapped: false,
        blockPathTitles: [],
        blockInstanceId: null,
        sourceBlockId: null,
        sourceBlockTitle: null,
        blockSectionRole: null,
        blockCategory: null,
        blockRepetitionCount: 1,
      });
    }

    traversalAncestors.delete(col);
  }

  // 2. Top-level blocks array (if present and contains nested block containers)
  if (Array.isArray(rawInput.blocks) && !seenTopArrays.has(rawInput.blocks)) {
    seenTopArrays.add(rawInput.blocks);
    traversalAncestors.add(rawInput.blocks);

    for (const blk of rawInput.blocks) {
      if (isMetadataOnlyBlockSnapshot(blk)) {
        continue;
      }
      if (blk !== null && typeof blk === 'object' && !Array.isArray(blk)) {
        const blkObj = blk as Record<string, unknown>;
        if (isBlockContainerNode(blkObj)) {
          traverseBlockNode(blkObj, rootCtx);
          continue;
        }
      }
      pushLeafItem({
        rawStep: blk,
        nestingDepth: 0,
        wasDepthCapped: false,
        wasRepeatCapped: false,
        blockPathTitles: [],
        blockInstanceId: null,
        sourceBlockId: null,
        sourceBlockTitle: null,
        blockSectionRole: null,
        blockCategory: null,
        blockRepetitionCount: 1,
      });
    }

    traversalAncestors.delete(rawInput.blocks);
  }

  if (circularReferenceCount > 0) {
    recordDiagnostic(
      'circular-reference',
      `수업 데이터 내 순환 참조(${circularReferenceCount}건)가 감지되어 안전하게 차단했습니다.`,
    );
  }

  if (omittedInputItemCount > 0) {
    recordDiagnostic(
      'input-truncated',
      `입력 동작 항목 수가 최대 한도(${maxInputItemsCap}개)를 초과하여 ${omittedInputItemCount}개 항목이 생략되었습니다.`,
    );
  }

  // Build intermediate resolved items before duplicate-name disambiguation
  interface IntermediateItem {
    order: number;
    sourceStepId: string;
    explicitStepId: string | null;
    exerciseId: string | null;
    kind: 'exercise' | 'rest';
    originKind: CueSheetItemOriginKind;
    nameKo: string;
    nameEn: string;
    timing: CueSheetItemTiming;
    practice: CueSheetPracticeMeta;
    setup: CueSheetSetupMeta;
    cueContent: CueSheetCueContent;
    blockMeta: CueSheetBlockMeta;
  }

  const intermediateItems: IntermediateItem[] = [];
  const explicitStepIdOrders = new Map<string, number[]>();

  for (let idx = 0; idx < flattenedEntries.length; idx += 1) {
    const entry = flattenedEntries[idx];
    const order = idx + 1;

    if (entry.wasDepthCapped) {
      recordDiagnostic(
        'nesting-depth-capped',
        `블록 중첩 깊이가 최대 허용 한도(${maxNestingDepthCap}단계)를 초과하여 ${maxNestingDepthCap}단계로 고정되었습니다.`,
        order,
      );
    }

    const stepVal = entry.rawStep;
    const isStepObj = stepVal !== null && typeof stepVal === 'object' && !Array.isArray(stepVal);
    const stepRecord = isStepObj ? (stepVal as Record<string, unknown>) : null;

    const rawExplicitStepId = stepRecord
      ? redactAndSanitizeText(
          stepRecord.stepId ?? stepRecord.itemId ?? stepRecord.id ?? '',
          redactionTracker,
        )
      : '';
    const sourceStepId = rawExplicitStepId || `step-${String(order).padStart(3, '0')}`;

    if (rawExplicitStepId) {
      const prevOrders = explicitStepIdOrders.get(rawExplicitStepId) ?? [];
      prevOrders.push(order);
      explicitStepIdOrders.set(rawExplicitStepId, prevOrders);
    }

    // Check step-level blockRepetitions override/cap
    let effectiveBlockReps = entry.blockRepetitionCount;
    if (stepRecord && stepRecord.blockRepetitions !== undefined && stepRecord.blockRepetitions !== null) {
      const rawStepBlockReps = stepRecord.blockRepetitions;
      if (
        typeof rawStepBlockReps === 'number' &&
        Number.isFinite(rawStepBlockReps) &&
        rawStepBlockReps >= 1
      ) {
        let stepBlockReps = Math.floor(rawStepBlockReps);
        if (stepBlockReps > maxRepeatPerBlockCap) {
          stepBlockReps = maxRepeatPerBlockCap;
          cappedBlockRepetitionCount += 1;
          recordDiagnostic(
            'block-repeat-capped',
            `블록 반복 횟수가 최대 허용 한도(${maxRepeatPerBlockCap}회)를 초과하여 ${maxRepeatPerBlockCap}회로 제한되었습니다.`,
            order,
          );
        }
        effectiveBlockReps = Math.min(
          maxRepeatPerBlockCap,
          Math.max(effectiveBlockReps, stepBlockReps),
        );
      }
    } else if (entry.wasRepeatCapped) {
      recordDiagnostic(
        'block-repeat-capped',
        `블록 반복 횟수가 최대 허용 한도(${maxRepeatPerBlockCap}회)를 초과하여 ${maxRepeatPerBlockCap}회로 제한되었습니다.`,
        order,
      );
    }

    const isRest =
      stepRecord !== null && isRestStep({ kind: stepRecord.kind as 'exercise' | 'rest' | undefined });

    const rawExerciseId = stepRecord
      ? redactAndSanitizeText(stepRecord.exerciseId ?? '', redactionTracker)
      : '';
    const rawHumanDraftId = stepRecord
      ? redactAndSanitizeText(stepRecord.humanDraftId ?? '', redactionTracker)
      : '';

    // Resolve snapshot, humanDraft, or catalog exercise
    const inlineSnapshotCandidate =
      stepRecord && isPlainObject(stepRecord.exerciseSnapshot)
        ? (stepRecord.exerciseSnapshot as unknown as MovementSnapshot | TeachingExerciseSnapshot)
        : stepRecord && isPlainObject(stepRecord.movementSnapshot)
          ? (stepRecord.movementSnapshot as unknown as MovementSnapshot)
          : null;

    const mappedSnapshot =
      inlineSnapshotCandidate ??
      (rawExerciseId ? snapshotMap.get(rawExerciseId) : undefined) ??
      (rawHumanDraftId ? snapshotMap.get(rawHumanDraftId) : undefined) ??
      null;

    const matchedDraft =
      (rawHumanDraftId ? draftMap.get(rawHumanDraftId) : undefined) ??
      (rawExerciseId ? draftMap.get(rawExerciseId) : undefined) ??
      null;

    const matchedCatalog =
      !isRest && rawExerciseId ? (catalogMap.get(rawExerciseId) ?? null) : null;

    // Candidate name fields from step
    const stepNameCandidate = stepRecord
      ? redactAndSanitizeText(
          stepRecord.nameKo ??
            stepRecord.workingNameKo ??
            stepRecord.name ??
            stepRecord.title ??
            stepRecord.ideaLine ??
            '',
          redactionTracker,
        )
      : '';
    const stepNoteCandidate = stepRecord
      ? redactAndSanitizeText(stepRecord.instructorNote ?? '', redactionTracker)
      : '';

    // Determine originKind
    let originKind: CueSheetItemOriginKind;
    if (!stepRecord) {
      originKind = 'recovered-invalid';
      recordDiagnostic(
        'corrupted-item',
        '손상된 동작 항목이 발견되어 안전 기본값으로 복구했습니다.',
        order,
      );
    } else if (isRest) {
      originKind = 'rest';
    } else if (
      matchedDraft ||
      Boolean(rawHumanDraftId) ||
      mappedSnapshot?.sourceOrigin === 'human-created' ||
      Boolean(mappedSnapshot?.humanDraftId)
    ) {
      originKind = 'human-draft';
    } else if (mappedSnapshot) {
      originKind = 'snapshot';
    } else if (matchedCatalog) {
      originKind = 'catalog';
    } else if (stepNameCandidate || stepNoteCandidate || rawExerciseId) {
      originKind = 'name-only';
      recordDiagnostic(
        'name-only-movement',
        '카탈로그 매칭 없이 강사가 입력한 동작 이름/메모만 있는 항목을 강제 분류 없이 보존했습니다.',
        order,
      );
    } else {
      originKind = 'recovered-invalid';
      recordDiagnostic(
        'corrupted-item',
        '식별 가능한 동작 ID나 이름이 없는 항목을 복구된 미상 항목으로 처리했습니다.',
        order,
      );
    }

    const kind: 'exercise' | 'rest' = isRest ? 'rest' : 'exercise';

    // Reference exercise metadata (snapshot, draft, or catalog)
    const refMeta: Record<string, unknown> | null =
      (mappedSnapshot as unknown as Record<string, unknown> | null) ??
      (matchedDraft as unknown as Record<string, unknown> | null) ??
      (matchedCatalog as unknown as Record<string, unknown> | null);

    // Resolve nameKo & nameEn
    let nameKo: string;
    let nameEn: string;
    if (isRest) {
      nameKo = stepNameCandidate || '휴식 (Rest)';
      nameEn = redactAndSanitizeText(stepRecord?.nameEn ?? 'Rest', redactionTracker) || 'Rest';
    } else if (originKind === 'recovered-invalid') {
      nameKo = '복구된 미상 항목';
      nameEn = 'Recovered Unspecified Item';
    } else {
      const refNameKo = refMeta
        ? redactAndSanitizeText(
            refMeta.nameKo ?? refMeta.workingNameKo ?? refMeta.ideaLine ?? '',
            redactionTracker,
          )
        : '';
      const refNameEn = refMeta
        ? redactAndSanitizeText(refMeta.nameEn ?? '', redactionTracker)
        : '';
      nameKo =
        stepNameCandidate ||
        refNameKo ||
        stepNoteCandidate ||
        rawExerciseId ||
        `미지정 동작 #${order}`;
      nameEn =
        redactAndSanitizeText(stepRecord?.nameEn ?? '', redactionTracker) || refNameEn || '';
    }

    // Resolve practice metadata (unilateral, sideMode, sideLabelsKo, sets, repetitions)
    const isUnilateral = isRest
      ? false
      : typeof stepRecord?.isUnilateral === 'boolean'
        ? stepRecord.isUnilateral
        : stepRecord?.sideMode === 'left' ||
            stepRecord?.sideMode === 'right' ||
            stepRecord?.sideMode === 'left-then-right' ||
            stepRecord?.sideMode === 'right-then-left'
          ? true
          : typeof refMeta?.isUnilateral === 'boolean'
            ? refMeta.isUnilateral
            : false;

    const explicitSideMode =
      resolveSideMode(stepRecord?.sideMode) ?? resolveSideMode(matchedDraft?.sideMode);
    const sideMode: StepSideMode | 'unspecified' = isRest
      ? 'unspecified'
      : (explicitSideMode ?? 'unspecified');

    const stepForHelpers: SequenceStep = {
      stepId: sourceStepId,
      order,
      kind,
      blockCategory: 'core',
      exerciseId: isRest ? '' : rawExerciseId,
      durationMin:
        typeof stepRecord?.durationMin === 'number' && Number.isFinite(stepRecord.durationMin)
          ? stepRecord.durationMin
          : 0,
      selectedLayer: resolveLayerMode(stepRecord?.selectedLayer) ?? 'standard',
      sideMode: explicitSideMode ?? undefined,
      explanationSec:
        typeof stepRecord?.explanationSec === 'number' &&
        Number.isFinite(stepRecord.explanationSec)
          ? stepRecord.explanationSec
          : undefined,
      transitionSec:
        typeof stepRecord?.transitionSec === 'number' &&
        Number.isFinite(stepRecord.transitionSec)
          ? stepRecord.transitionSec
          : undefined,
    };

    const syntheticExerciseForHelpers = {
      isUnilateral,
    } as PilatesExercise;

    const sideLabelsKo = Object.freeze(
      getStepSideLabels(stepForHelpers, syntheticExerciseForHelpers),
    );
    const sideBadgeKo = formatSideBadgeKo(sideMode, isUnilateral, isRest);

    const rawReps = stepRecord?.repetitions;
    const repetitions =
      !isRest && typeof rawReps === 'number' && Number.isFinite(rawReps) && rawReps > 0
        ? Math.round(rawReps)
        : null;

    const rawSets = stepRecord?.sets;
    const sets =
      !isRest && typeof rawSets === 'number' && Number.isFinite(rawSets) && rawSets > 0
        ? Math.round(rawSets)
        : null;

    const practiceParts: string[] = [sideBadgeKo];
    if (!isRest) {
      practiceParts.push(repetitions !== null ? `${repetitions}회` : '반복 미지정');
      practiceParts.push(sets !== null ? `${sets}세트` : '세트 미지정');
    }
    if (effectiveBlockReps > 1) {
      practiceParts.push(`블록 ${effectiveBlockReps}회 반복`);
    }

    const practice: CueSheetPracticeMeta = {
      sideMode,
      isUnilateral,
      sideLabelsKo,
      sideBadgeKo,
      repetitions,
      sets,
      blockRepetitions: effectiveBlockReps,
      practiceSummaryKo: practiceParts.join(' · '),
    };

    // Resolve timing (NEVER estimate or invent time when durationMin is missing/invalid)
    const rawDurationMin = stepRecord?.durationMin;
    const hasValidDuration =
      typeof rawDurationMin === 'number' &&
      Number.isFinite(rawDurationMin) &&
      rawDurationMin > 0 &&
      rawDurationMin <= 120;

    let timing: CueSheetItemTiming;
    if (hasValidDuration) {
      const computedTiming = getStepTiming(stepForHelpers, syntheticExerciseForHelpers);
      const mmss = formatSecondsToMMSS(computedTiming.totalSec);
      const minText = Number.isInteger(rawDurationMin)
        ? `${rawDurationMin}분`
        : `${Number(rawDurationMin.toFixed(1))}분`;
      const detailParts: string[] = [];
      if (isRest) {
        detailParts.push(`휴식 ${mmss}`);
      } else {
        detailParts.push(`수행 ${formatSecondsToMMSS(computedTiming.movementSec)}`);
        if (computedTiming.sides === 2) {
          detailParts.push(`편측 당 ${formatSecondsToMMSS(computedTiming.perSideSec)}`);
        }
        if (computedTiming.explanationSec > 0) {
          detailParts.push(`설명 ${formatSecondsToMMSS(computedTiming.explanationSec)}`);
        }
        if (computedTiming.transitionSec > 0) {
          detailParts.push(`전환 ${formatSecondsToMMSS(computedTiming.transitionSec)}`);
        }
      }
      timing = {
        status: 'known',
        durationMin: rawDurationMin,
        totalSec: computedTiming.totalSec,
        movementSec: computedTiming.movementSec,
        perSideSec: computedTiming.perSideSec,
        explanationSec: computedTiming.explanationSec,
        transitionSec: computedTiming.transitionSec,
        sides: computedTiming.sides,
        displayLabelKo: `${mmss} (${minText})`,
        detailLabelKo: detailParts.join(' · '),
      };
    } else {
      const fallbackSides: 1 | 2 = isRest
        ? 1
        : explicitSideMode === 'left-then-right' ||
            explicitSideMode === 'right-then-left' ||
            (!explicitSideMode && isUnilateral)
          ? 2
          : 1;
      timing = {
        status: 'unspecified',
        durationMin: null,
        totalSec: null,
        movementSec: null,
        perSideSec: null,
        explanationSec: null,
        transitionSec: null,
        sides: fallbackSides,
        displayLabelKo: '시간 미정',
        detailLabelKo: '시간 미정 · 임의 추정 없음',
      };
      recordDiagnostic(
        'unspecified-time',
        '수행 시간(durationMin)이 지정되지 않은 항목은 임의 추정하지 않고 시간 미정으로 보존했습니다.',
        order,
      );
    }

    // Resolve setup metadata (never force apparatus classification on name-only / incomplete items)
    const explicitStepApparatus = resolveApparatusType(stepRecord?.apparatus);
    const refApparatus =
      originKind === 'name-only' || originKind === 'rest' || originKind === 'recovered-invalid'
        ? null
        : resolveApparatusType(refMeta?.apparatus);
    const apparatus: ApparatusType | 'unspecified' = isRest
      ? 'unspecified'
      : (explicitStepApparatus ?? refApparatus ?? 'unspecified');

    const apparatusLabelKo =
      apparatus !== 'unspecified'
        ? APPARATUS_LABELS[apparatus].ko
        : isRest
          ? '휴식'
          : '기구 미지정';

    let requiredEquipmentLabelsKo: string[] = [];
    if (!isRest) {
      if (Array.isArray(stepRecord?.requiredEquipment) && stepRecord.requiredEquipment.length > 0) {
        requiredEquipmentLabelsKo = stepRecord.requiredEquipment
          .map((eqId) => {
            if (typeof eqId !== 'string') return '';
            const found = EQUIPMENT_OPTIONS.find((opt) => opt.id === eqId);
            return found ? found.labelKo : redactAndSanitizeText(eqId, redactionTracker);
          })
          .filter(Boolean);
      } else if (
        refMeta &&
        resolveApparatusType(refMeta.apparatus) !== null &&
        originKind !== 'name-only'
      ) {
        const eqInfo = getExerciseEquipment({
          id: rawExerciseId || 'ref',
          apparatus: resolveApparatusType(refMeta.apparatus)!,
          requiredEquipment: Array.isArray(refMeta.requiredEquipment)
            ? (refMeta.requiredEquipment.filter((x): x is string => typeof x === 'string'))
            : undefined,
          props: Array.isArray(refMeta.props)
            ? (refMeta.props.filter((x): x is PropType => typeof x === 'string'))
            : ['none'],
        } as PilatesExercise);
        requiredEquipmentLabelsKo = eqInfo.requiredEquipment.map((eqId) => {
          const found = EQUIPMENT_OPTIONS.find((opt) => opt.id === eqId);
          return found ? found.labelKo : redactAndSanitizeText(eqId, redactionTracker);
        });
      } else if (apparatus !== 'unspecified') {
        const found = EQUIPMENT_OPTIONS.find((opt) => opt.id === apparatus);
        requiredEquipmentLabelsKo = [found ? found.labelKo : APPARATUS_LABELS[apparatus].ko];
      }
      requiredEquipmentLabelsKo = [...new Set(requiredEquipmentLabelsKo)];
    }

    const rawPropsArray = Array.isArray(stepRecord?.props)
      ? stepRecord.props
      : originKind !== 'name-only' && Array.isArray(refMeta?.props)
        ? (refMeta.props as unknown[])
        : [];
    const propLabelsKo = isRest
      ? []
      : [
          ...new Set(
            rawPropsArray
              .map((propItem) => {
                if (typeof propItem !== 'string' || propItem === 'none' || !propItem.trim()) {
                  return '';
                }
                const fromCatalog = PROP_LABELS[propItem as PropType]?.ko;
                if (fromCatalog) return fromCatalog;
                const fromOptions = PROP_OPTIONS.find((opt) => opt.id === propItem)?.labelKo;
                if (fromOptions) return fromOptions;
                return redactAndSanitizeText(propItem, redactionTracker);
              })
              .filter(Boolean),
          ),
        ];

    const rawSprings = stepRecord
      ? redactAndSanitizeText(
          stepRecord.customSpringOverride ??
            stepRecord.springs ??
            stepRecord.effectiveSprings ??
            (originKind !== 'name-only' ? refMeta?.springs : '') ??
            '',
          redactionTracker,
        )
      : '';
    const springs = isRest ? '해당 없음' : rawSprings || '스프링 미지정';

    const boxLabelKo = isRest
      ? null
      : formatBoxLabelKo(
          stepRecord?.box ?? (originKind !== 'name-only' ? (refMeta?.box as BoxState) : null),
        );
    const footbarLabelKo = isRest
      ? null
      : formatFootbarLabelKo(
          stepRecord?.footbar ??
            (originKind !== 'name-only' ? (refMeta?.footbar as FootbarState) : null),
        );
    const headrestLabelKo = isRest
      ? null
      : formatHeadrestLabelKo(
          stepRecord?.headrest ??
            (originKind !== 'name-only' ? (refMeta?.headrest as HeadrestState) : null),
        );

    const layerMode = isRest ? null : resolveLayerMode(stepRecord?.selectedLayer);
    const layerLabelKo = formatLayerLabelKo(layerMode);

    const setupSummaryParts: string[] = [];
    if (isRest) {
      setupSummaryParts.push('휴식 · 기구 세팅 변경 없음');
    } else {
      setupSummaryParts.push(apparatusLabelKo);
      if (springs !== '스프링 미지정') {
        setupSummaryParts.push(`스프링 ${springs}`);
      }
      if (boxLabelKo && boxLabelKo !== '박스 없음') {
        setupSummaryParts.push(boxLabelKo);
      }
      if (footbarLabelKo && footbarLabelKo !== '풋바 없음') {
        setupSummaryParts.push(footbarLabelKo);
      }
      if (headrestLabelKo) {
        setupSummaryParts.push(headrestLabelKo);
      }
      if (propLabelsKo.length > 0) {
        setupSummaryParts.push(`소도구: ${propLabelsKo.join(', ')}`);
      }
      if (layerLabelKo) {
        setupSummaryParts.push(layerLabelKo);
      }
    }

    const setup: CueSheetSetupMeta = {
      apparatus,
      apparatusLabelKo,
      requiredEquipmentLabelsKo,
      propLabelsKo,
      springs,
      boxLabelKo,
      footbarLabelKo,
      headrestLabelKo,
      layerMode,
      layerLabelKo,
      setupSummaryKo: setupSummaryParts.join(' · '),
    };

    // Resolve cue content
    const rawStepCues = stepRecord?.cues;
    const rawCuesSource = Array.isArray(rawStepCues)
      ? rawStepCues
      : Array.isArray(refMeta?.cues)
        ? (refMeta.cues as unknown[])
        : [];
    const cues = rawCuesSource
      .map((c) => redactAndSanitizeText(c, redactionTracker))
      .filter((c) => c.length > 0);

    const instructorNote = stepNoteCandidate;
    const breathPattern = redactAndSanitizeText(
      stepRecord?.breathPattern ?? refMeta?.breathPattern ?? '',
      redactionTracker,
    );
    const precautions = redactAndSanitizeText(
      stepRecord?.precautions ?? refMeta?.precautions ?? '',
      redactionTracker,
    );

    const stepLayers = stepRecord && isPlainObject(stepRecord.layers) ? stepRecord.layers : null;
    const refLayers = refMeta && isPlainObject(refMeta.layers) ? refMeta.layers : null;
    const layerCue = redactAndSanitizeText(
      (layerMode && stepLayers ? stepLayers[layerMode] : undefined) ??
        stepRecord?.selectedLayerDescription ??
        (layerMode && refLayers ? refLayers[layerMode] : undefined) ??
        '',
      redactionTracker,
    );

    const hasCues = cues.length > 0 || instructorNote.length > 0;
    if (!isRest && !hasCues) {
      recordDiagnostic(
        'empty-cue',
        '큐잉 문구와 강사 메모가 비어 있는 동작 항목이 있습니다.',
        order,
      );
    }

    const combinedCueLength = cues.join(' ').length + instructorNote.length;
    const isLongCue =
      cues.some((c) => c.length >= 45) ||
      instructorNote.length >= 45 ||
      combinedCueLength >= 80 ||
      cues.length >= 4;

    const cueContent: CueSheetCueContent = {
      cues,
      instructorNote,
      breathPattern,
      precautions,
      layerCue,
      hasCues,
      emptyCueLabelKo: '등록된 큐잉 메모 없음',
      isLongCue,
    };

    // Resolve block metadata (without forcing classification on name-only items)
    const stepBlockInstanceId = stepRecord
      ? redactAndSanitizeText(stepRecord.blockInstanceId ?? '', redactionTracker)
      : '';
    const effectiveBlockInstanceId = stepBlockInstanceId || entry.blockInstanceId || null;
    const matchedBlockSnapshot = effectiveBlockInstanceId
      ? blockSnapshotByInstanceId.get(effectiveBlockInstanceId)
      : undefined;

    const stepSourceBlockId = stepRecord
      ? redactAndSanitizeText(stepRecord.sourceBlockId ?? '', redactionTracker)
      : '';
    const effectiveSourceBlockId =
      stepSourceBlockId ||
      entry.sourceBlockId ||
      (matchedBlockSnapshot
        ? redactAndSanitizeText(matchedBlockSnapshot.sourceBlockId, redactionTracker)
        : '') ||
      null;

    const matchedReusableBlock = effectiveSourceBlockId
      ? reusableBlockMap.get(effectiveSourceBlockId)
      : undefined;

    const stepSourceBlockTitle = stepRecord
      ? redactAndSanitizeText(stepRecord.sourceBlockTitle ?? '', redactionTracker)
      : '';
    const effectiveSourceBlockTitle =
      stepSourceBlockTitle ||
      entry.sourceBlockTitle ||
      (matchedBlockSnapshot
        ? redactAndSanitizeText(matchedBlockSnapshot.sourceBlockTitle, redactionTracker)
        : '') ||
      (matchedReusableBlock
        ? redactAndSanitizeText(matchedReusableBlock.title, redactionTracker)
        : '') ||
      null;

    const explicitBlockCategory =
      resolveBlockCategory(stepRecord?.blockCategory) ?? resolveBlockCategory(entry.blockCategory);
    const refBlockCategory =
      originKind === 'name-only' || originKind === 'rest' || originKind === 'recovered-invalid'
        ? null
        : resolveBlockCategory(refMeta?.blockCategory);
    const blockCategory: ClassBlockCategory | null = isRest
      ? null
      : (explicitBlockCategory ?? refBlockCategory ?? null);

    const blockCategoryLabelKo = isRest
      ? '휴식'
      : blockCategory
        ? (CANONICAL_BLOCKS.find((b) => b.category === blockCategory)?.nameKo ?? blockCategory)
        : '분류 미지정';

    const explicitSectionRole =
      resolveSectionRole(stepRecord?.sectionRole) ??
      resolveSectionRole(stepRecord?.classSection) ??
      resolveSectionRole(entry.blockSectionRole) ??
      resolveSectionRole(matchedReusableBlock?.sectionRole) ??
      (originKind !== 'name-only' ? resolveSectionRole(refMeta?.sectionRole) : null);

    const sectionRole: ClassSectionRole | 'unspecified' = isRest
      ? 'unspecified'
      : (explicitSectionRole ??
        (blockCategory ? getMovementSectionRole(blockCategory) : 'unspecified'));

    const sectionLabelKo = formatSectionLabelKo(sectionRole, isRest);

    const blockPathTitles =
      entry.blockPathTitles.length > 0
        ? [...entry.blockPathTitles]
        : effectiveSourceBlockTitle
          ? [effectiveSourceBlockTitle]
          : [];

    const blockMeta: CueSheetBlockMeta = {
      blockInstanceId: effectiveBlockInstanceId,
      sourceBlockId: effectiveSourceBlockId,
      sourceBlockTitle: effectiveSourceBlockTitle,
      blockCategory,
      blockCategoryLabelKo,
      sectionRole,
      sectionLabelKo,
      nestingDepth: entry.nestingDepth,
      blockPathTitles,
      blockRepetitionIndex: 1,
      blockRepetitionCount: effectiveBlockReps,
    };

    intermediateItems.push({
      order,
      sourceStepId,
      explicitStepId: rawExplicitStepId || null,
      exerciseId: isRest ? null : rawExerciseId || (refMeta?.id ? String(refMeta.id) : null),
      kind,
      originKind,
      nameKo,
      nameEn,
      timing,
      practice,
      setup,
      cueContent,
      blockMeta,
    });
  }

  // Record duplicate-step-id diagnostics if any explicit stepId appeared multiple times
  for (const [, orders] of explicitStepIdOrders.entries()) {
    if (orders.length > 1) {
      for (const ord of orders) {
        recordDiagnostic(
          'duplicate-step-id',
          '동일한 stepId를 가진 항목이 중복 감지되어 고유한 cueItemId를 각각 부여했습니다.',
          ord,
        );
      }
    }
  }

  // Track duplicate movement names across the class
  const nameOrdersMap = new Map<string, number[]>();
  for (const item of intermediateItems) {
    const normName = item.nameKo.trim().normalize('NFKC');
    const list = nameOrdersMap.get(normName) ?? [];
    list.push(item.order);
    nameOrdersMap.set(normName, list);
  }

  let duplicateNameGroupCount = 0;
  for (const [, orders] of nameOrdersMap.entries()) {
    if (orders.length > 1) {
      duplicateNameGroupCount += 1;
      for (const ord of orders) {
        recordDiagnostic(
          'duplicate-movement-name',
          '동일한 동작 이름이 수업 내 여러 번 등장하여 회차·순번 구분 표기를 추가했습니다.',
          ord,
        );
      }
    }
  }

  const nameOccurrenceCounter = new Map<string, number>();
  const items: ClassCueSheetItem[] = intermediateItems.map((item) => {
    const normName = item.nameKo.trim().normalize('NFKC');
    const totalForName = nameOrdersMap.get(normName)?.length ?? 1;
    const occurrence = (nameOccurrenceCounter.get(normName) ?? 0) + 1;
    nameOccurrenceCounter.set(normName, occurrence);

    const isDuplicateName = totalForName > 1;
    const duplicateDisambiguatorKo = isDuplicateName
      ? `동일 이름 #${occurrence} (${String(item.order).padStart(2, '0')}번 항목)`
      : null;

    const slug = makeSlug(item.exerciseId ?? item.sourceStepId ?? item.nameKo);
    const cueItemId = `cue-item-${String(item.order).padStart(3, '0')}-${slug}-${occurrence}`;

    return {
      cueItemId,
      order: item.order,
      sourceStepId: item.sourceStepId,
      exerciseId: item.exerciseId,
      kind: item.kind,
      originKind: item.originKind,
      nameKo: item.nameKo,
      nameEn: item.nameEn,
      isDuplicateName,
      duplicateNameOccurrence: occurrence,
      duplicateNameTotal: totalForName,
      duplicateDisambiguatorKo,
      timing: item.timing,
      practice: item.practice,
      setup: item.setup,
      cueContent: item.cueContent,
      blockMeta: item.blockMeta,
    };
  });

  if (items.length === 0) {
    recordDiagnostic('empty-class', '등록된 수업 동작 항목이 없습니다.');
  }

  // Expand items into expandedRows across blockRepetitionCount, sets (up to maxSetsExpansionCap), and sideLabelsKo
  const expandedRows: ClassCueSheetExpandedRow[] = [];
  let omittedExpandedRowCount = 0;
  let cappedSetsItemCount = 0;

  for (const item of items) {
    const blockReps = Math.max(1, item.blockMeta.blockRepetitionCount);
    const rawSetsCount = item.practice.sets;
    let effectiveSetsCount = 1;
    let hasExplicitSets = false;

    if (rawSetsCount !== null && rawSetsCount >= 1) {
      hasExplicitSets = true;
      if (rawSetsCount > maxSetsExpansionCap) {
        effectiveSetsCount = maxSetsExpansionCap;
        cappedSetsItemCount += 1;
      } else {
        effectiveSetsCount = rawSetsCount;
      }
    }

    const sidePassLabels: readonly (string | null)[] =
      item.kind === 'rest' || item.practice.sideLabelsKo.length === 0
        ? [null]
        : item.practice.sideLabelsKo;

    const perRowTimingLabelKo =
      item.timing.status === 'unspecified'
        ? '시간 미정'
        : sidePassLabels.length === 2 && item.timing.perSideSec !== null
          ? `${formatSecondsToMMSS(item.timing.perSideSec)} (편측)`
          : item.timing.displayLabelKo;

    const primaryCueKo =
      item.cueContent.cues[0] ||
      item.cueContent.instructorNote ||
      item.cueContent.layerCue ||
      item.cueContent.breathPattern ||
      item.cueContent.emptyCueLabelKo;

    for (let blockRepIdx = 1; blockRepIdx <= blockReps; blockRepIdx += 1) {
      const pathPrefix =
        item.blockMeta.blockPathTitles.length > 0
          ? item.blockMeta.blockPathTitles.join(' › ')
          : item.blockMeta.sourceBlockTitle;
      const blockHeaderKo = pathPrefix
        ? blockReps > 1
          ? `${pathPrefix} (${blockRepIdx}/${blockReps}회차)`
          : pathPrefix
        : blockReps > 1
          ? `${item.blockMeta.blockCategoryLabelKo} (${blockRepIdx}/${blockReps}회차)`
          : null;

      for (let setIdx = 1; setIdx <= effectiveSetsCount; setIdx += 1) {
        for (let sideIdx = 0; sideIdx < sidePassLabels.length; sideIdx += 1) {
          const sideLabelKo = sidePassLabels[sideIdx];
          if (expandedRows.length < maxExpandedRowsCap) {
            const expandedOrder = expandedRows.length + 1;
            const expandedRowId = `${item.cueItemId}-row-${String(expandedOrder).padStart(3, '0')}-b${blockRepIdx}-s${setIdx}-d${sideIdx + 1}`;
            expandedRows.push({
              expandedRowId,
              expandedOrder,
              parentCueItemId: item.cueItemId,
              parentItemOrder: item.order,
              kind: item.kind,
              nameKo: item.nameKo,
              duplicateDisambiguatorKo: item.duplicateDisambiguatorKo,
              blockHeaderKo,
              sideLabelKo,
              setIndex: hasExplicitSets ? setIdx : null,
              setCount: hasExplicitSets ? effectiveSetsCount : null,
              blockRepetitionIndex: blockRepIdx,
              blockRepetitionCount: blockReps,
              repetitions: item.practice.repetitions,
              timingLabelKo: perRowTimingLabelKo,
              timingStatus: item.timing.status,
              setupSummaryKo: item.setup.setupSummaryKo,
              primaryCueKo,
              instructorNote: item.cueContent.instructorNote,
            });
          } else {
            omittedExpandedRowCount += 1;
          }
        }
      }
    }
  }

  if (omittedExpandedRowCount > 0 || cappedSetsItemCount > 0) {
    recordDiagnostic(
      'expansion-truncated',
      `전개 행(세트·좌우·블록 반복 확장)이 최대 한도(${maxExpandedRowsCap}행)를 초과하여 ${omittedExpandedRowCount}개 전개 행이 생략되었습니다.`,
    );
  }

  // Privacy diagnostic if sensitive keys or inline patterns were stripped/redacted
  const strippedSensitiveKeys = Array.from(graphScan.strippedKeys).sort((a, b) =>
    a.localeCompare(b),
  );
  if (strippedSensitiveKeys.length > 0 || redactionTracker.redactedCount > 0) {
    recordDiagnostic(
      'sensitive-fields-stripped',
      '허용 목록(Allowlist) 정책에 따라 회원·참가자·건강·관찰 등 민감 필드 및 개인정보가 큐시트에서 제외되었습니다.',
    );
  }

  // Build truncation reasons
  const truncationReasonsKo: string[] = [];
  if (omittedInputItemCount > 0) {
    truncationReasonsKo.push(
      `입력 동작 항목 수가 상한(${maxInputItemsCap}개)을 초과하여 ${omittedInputItemCount}개 항목이 생략되었습니다.`,
    );
  }
  if (omittedExpandedRowCount > 0) {
    truncationReasonsKo.push(
      `전개 행 수가 상한(${maxExpandedRowsCap}행)을 초과하여 ${omittedExpandedRowCount}개 행이 생략되었습니다.`,
    );
  }
  if (cappedSetsItemCount > 0) {
    truncationReasonsKo.push(
      `세트 확장이 항목당 최대 ${maxSetsExpansionCap}세트로 제한되었습니다 (${cappedSetsItemCount}개 항목).`,
    );
  }
  if (cappedBlockRepetitionCount > 0) {
    truncationReasonsKo.push(
      `블록 반복 횟수가 최대 ${maxRepeatPerBlockCap}회로 제한되었습니다 (${cappedBlockRepetitionCount}건).`,
    );
  }
  if (cappedDepthCount > 0) {
    truncationReasonsKo.push(
      `중첩 블록 깊이가 최대 ${maxNestingDepthCap}단계로 제한되었습니다 (${cappedDepthCount}건).`,
    );
  }
  if (circularReferenceCount > 0) {
    truncationReasonsKo.push(
      `순환 참조(${circularReferenceCount}건)가 감지되어 재진입을 차단했습니다.`,
    );
  }

  const truncation: CueSheetTruncationMeta = {
    isTruncated: truncationReasonsKo.length > 0,
    maxInputItemsCap,
    maxExpandedRowsCap,
    maxNestingDepthCap,
    maxRepeatPerBlockCap,
    maxSetsExpansionCap,
    omittedInputItemCount,
    omittedExpandedRowCount,
    cappedBlockRepetitionCount,
    cappedDepthCount,
    circularReferenceCount,
    reasonsKo: truncationReasonsKo,
  };

  const privacy: CueSheetPrivacyMeta = {
    allowlistApplied: true,
    strippedSensitiveKeys,
    redactedInlineTextCount: redactionTracker.redactedCount,
  };

  // Compute timingSummary (NEVER inventing time for unspecified items)
  let knownExerciseSec = 0;
  let knownRestSec = 0;
  let knownItemCount = 0;
  let unspecifiedItemCount = 0;

  for (const item of items) {
    if (item.timing.status === 'known' && item.timing.totalSec !== null) {
      knownItemCount += 1;
      if (item.kind === 'rest') {
        knownRestSec += item.timing.totalSec;
      } else {
        knownExerciseSec += item.timing.totalSec;
      }
    } else {
      unspecifiedItemCount += 1;
    }
  }

  const knownTotalSec = knownExerciseSec + knownRestSec;
  const knownTotalLabelKo = formatSecondsToMMSS(knownTotalSec);
  const knownExerciseLabelKo = formatSecondsToMMSS(knownExerciseSec);
  const knownRestLabelKo = formatSecondsToMMSS(knownRestSec);

  const rawTargetMin =
    rawInput.targetMinutes ??
    rawInput.durationMinutes ??
    seqSnapshot?.targetMinutes ??
    (isPlainObject(rawInput.timing) &&
    typeof (rawInput.timing as Record<string, unknown>).plannedTotalSec === 'number'
      ? Math.round(((rawInput.timing as Record<string, unknown>).plannedTotalSec as number) / 60)
      : null);
  const targetMinutes =
    typeof rawTargetMin === 'number' && Number.isFinite(rawTargetMin) && rawTargetMin > 0
      ? rawTargetMin
      : null;

  const hasUnspecifiedTime = unspecifiedItemCount > 0;
  const timingSummaryLabelKo =
    items.length === 0
      ? '등록된 항목 없음 (00:00)'
      : hasUnspecifiedTime
        ? `확정 시간 합계 ${knownTotalLabelKo} (운동 ${knownExerciseLabelKo} · 휴식 ${knownRestLabelKo}) · 시간 미정 ${unspecifiedItemCount}개 항목 별도 · 임의 추정 없음`
        : `총 ${knownTotalLabelKo} (운동 ${knownExerciseLabelKo} · 휴식 ${knownRestLabelKo})`;

  const timingSummary: CueSheetTimingSummary = {
    knownTotalSec,
    knownExerciseSec,
    knownRestSec,
    knownTotalLabelKo,
    knownExerciseLabelKo,
    knownRestLabelKo,
    targetMinutes,
    knownItemCount,
    unspecifiedItemCount,
    hasUnspecifiedTime,
    timingSummaryLabelKo,
  };

  // Top-level summary fields
  const rawSourceId = redactAndSanitizeText(
    rawInput.id ??
      rawInput.snapshotId ??
      rawInput.sourceSequenceId ??
      seqSnapshot?.snapshotId ??
      seqSnapshot?.sourceSequenceId ??
      '',
    redactionTracker,
  );
  const sourceId = rawSourceId || 'cue-source-unspecified';
  const cueSheetId = `cue-sheet-${makeSlug(sourceId)}`;

  const rawTitle = redactAndSanitizeText(
    rawInput.title ??
      rawInput.sequenceTitle ??
      rawInput.sourceSequenceTitle ??
      seqSnapshot?.title ??
      '',
    redactionTracker,
  );
  const title = rawTitle || '제목 미지정 수업';

  const rawSubtitle = redactAndSanitizeText(
    rawInput.subtitle ?? rawInput.sourceSubtitle ?? seqSnapshot?.subtitle ?? '',
    redactionTracker,
  );
  const subtitle = rawSubtitle;

  const topApparatusRaw = rawInput.apparatus ?? seqSnapshot?.apparatus;
  let apparatusLabelKo: string;
  if (topApparatusRaw === 'mixed') {
    apparatusLabelKo = '복합 기구 (Mixed)';
  } else if (resolveApparatusType(topApparatusRaw) !== null) {
    apparatusLabelKo = APPARATUS_LABELS[resolveApparatusType(topApparatusRaw)!].ko;
  } else {
    const distinctKnownApparatus = [
      ...new Set(
        items
          .map((item) => item.setup.apparatus)
          .filter((app): app is ApparatusType => app !== 'unspecified'),
      ),
    ];
    if (distinctKnownApparatus.length === 1) {
      apparatusLabelKo = APPARATUS_LABELS[distinctKnownApparatus[0]].ko;
    } else if (distinctKnownApparatus.length > 1) {
      apparatusLabelKo = '복합 기구 (Mixed)';
    } else {
      apparatusLabelKo = '기구 미지정';
    }
  }

  const topLevelRaw = (rawInput.level ?? seqSnapshot?.level) as DifficultyLevel | unknown;
  const levelLabelKo = formatLevelLabelKo(topLevelRaw);

  const exerciseCount = items.filter((item) => item.kind === 'exercise').length;
  const restCount = items.filter((item) => item.kind === 'rest').length;
  const nameOnlyCount = items.filter((item) => item.originKind === 'name-only').length;

  const allEquipmentLabelsKo = [
    ...new Set(items.flatMap((item) => item.setup.requiredEquipmentLabelsKo)),
  ];
  const allPropLabelsKo = [...new Set(items.flatMap((item) => item.setup.propLabelsKo))];

  const diagnostics: CueSheetDiagnostic[] = Array.from(diagnosticsMap.entries()).map(
    ([code, val]) => ({
      code,
      messageKo: val.messageKo,
      itemOrders: Array.from(val.orders).sort((a, b) => a - b),
    }),
  );

  const projection: ClassCueSheetProjection = {
    cueSheetId,
    sourceId,
    title,
    subtitle,
    apparatusLabelKo,
    levelLabelKo,
    isEmpty: items.length === 0,
    itemCount: items.length,
    exerciseCount,
    restCount,
    nameOnlyCount,
    duplicateNameGroupCount,
    allEquipmentLabelsKo,
    allPropLabelsKo,
    timingSummary,
    items,
    expandedRows,
    truncation,
    privacy,
    diagnostics,
    boundary: { ...DEFAULT_BOUNDARY_META },
  };

  return deepFreeze(projection);
}

function ensureEscapedPlainText(value: unknown): string {
  if (typeof value !== 'string') {
    return sanitizeCueSheetPlainText(value);
  }
  const decoded = value
    .replace(/&#61;/g, '=')
    .replace(/&#58;/g, ':')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&gt;/g, '>')
    .replace(/&lt;/g, '<')
    .replace(/&amp;/g, '&');
  return sanitizeCueSheetPlainText(decoded);
}

/**
 * Formats a ClassCueSheetProjection into a clean, deterministic Korean plain-text cue sheet.
 */
export function formatClassCueSheetAsPlainText(
  projection: ClassCueSheetProjection,
  options?: { includeExpandedRows?: boolean },
): string {
  const lines: string[] = [];
  const safeTitle = ensureEscapedPlainText(projection.title) || '제목 미지정 수업';
  const safeSubtitle = ensureEscapedPlainText(projection.subtitle);

  lines.push(`=== [수업 큐시트] ${safeTitle} ===`);
  if (safeSubtitle) {
    lines.push(`부제: ${safeSubtitle}`);
  }
  lines.push(
    `기구: ${ensureEscapedPlainText(projection.apparatusLabelKo)} | 난이도: ${ensureEscapedPlainText(projection.levelLabelKo)} | 항목: 총 ${projection.itemCount}개 (운동 ${projection.exerciseCount} · 휴식 ${projection.restCount})`,
  );
  if (projection.allEquipmentLabelsKo.length > 0) {
    lines.push(
      `사용 기구: ${projection.allEquipmentLabelsKo.map((x) => ensureEscapedPlainText(x)).join(', ')}`,
    );
  }
  if (projection.allPropLabelsKo.length > 0) {
    lines.push(
      `소도구: ${projection.allPropLabelsKo.map((x) => ensureEscapedPlainText(x)).join(', ')}`,
    );
  }
  lines.push(`시간 요약: ${ensureEscapedPlainText(projection.timingSummary.timingSummaryLabelKo)}`);

  if (projection.truncation.isTruncated) {
    lines.push('');
    lines.push('[축약/제한 안내]');
    for (const reason of projection.truncation.reasonsKo) {
      lines.push(`- ${ensureEscapedPlainText(reason)}`);
    }
  }

  lines.push('');
  if (projection.isEmpty) {
    lines.push('등록된 수업 동작 항목이 없습니다.');
  } else {
    lines.push('[동작 및 큐잉 순서]');
    for (const item of projection.items) {
      const orderStr = String(item.order).padStart(2, '0');
      const dupSuffix = item.duplicateDisambiguatorKo
        ? ` [${ensureEscapedPlainText(item.duplicateDisambiguatorKo)}]`
        : '';
      const blockPrefix =
        item.blockMeta.blockPathTitles.length > 0
          ? `(${item.blockMeta.blockPathTitles.map((t) => ensureEscapedPlainText(t)).join(' › ')}) `
          : '';
      lines.push(
        `${orderStr}. ${blockPrefix}${ensureEscapedPlainText(item.nameKo)}${dupSuffix} — ${ensureEscapedPlainText(item.timing.displayLabelKo)}`,
      );
      lines.push(
        `    구간/분류: ${ensureEscapedPlainText(item.blockMeta.sectionLabelKo)} · ${ensureEscapedPlainText(item.blockMeta.blockCategoryLabelKo)}`,
      );
      lines.push(`    수행 조건: ${ensureEscapedPlainText(item.practice.practiceSummaryKo)}`);
      lines.push(`    세팅: ${ensureEscapedPlainText(item.setup.setupSummaryKo)}`);
      if (item.cueContent.hasCues) {
        for (const cue of item.cueContent.cues) {
          lines.push(`    • 큐잉: ${ensureEscapedPlainText(cue)}`);
        }
        if (item.cueContent.instructorNote) {
          lines.push(`    • 강사 메모: ${ensureEscapedPlainText(item.cueContent.instructorNote)}`);
        }
      } else {
        lines.push(`    • ${ensureEscapedPlainText(item.cueContent.emptyCueLabelKo)}`);
      }
      if (item.cueContent.breathPattern) {
        lines.push(`    • 호흡: ${ensureEscapedPlainText(item.cueContent.breathPattern)}`);
      }
      if (item.cueContent.precautions) {
        lines.push(`    • 주의: ${ensureEscapedPlainText(item.cueContent.precautions)}`);
      }
    }
  }

  if (options?.includeExpandedRows && projection.expandedRows.length > 0) {
    lines.push('');
    lines.push(`[전개 행 목록 (${projection.expandedRows.length}행)]`);
    for (const row of projection.expandedRows) {
      const rowOrd = String(row.expandedOrder).padStart(3, '0');
      const blk = row.blockHeaderKo ? `[${ensureEscapedPlainText(row.blockHeaderKo)}] ` : '';
      const side = row.sideLabelKo ? ` (${ensureEscapedPlainText(row.sideLabelKo)})` : '';
      const setStr =
        row.setIndex !== null && row.setCount !== null ? ` ${row.setIndex}/${row.setCount}세트` : '';
      lines.push(
        `${rowOrd}. ${blk}${ensureEscapedPlainText(row.nameKo)}${side}${setStr} — ${ensureEscapedPlainText(row.timingLabelKo)} | ${ensureEscapedPlainText(row.primaryCueKo)}`,
      );
    }
  }

  lines.push('');
  lines.push(`※ ${ensureEscapedPlainText(projection.boundary.disclaimerKo)}`);

  return lines.join('\n');
}
