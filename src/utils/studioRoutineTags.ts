import { useSyncExternalStore } from 'react';

export const STUDIO_ROUTINE_TAGS_STORAGE_KEY = 'pf_studio_routine_tags_v1';
export const ACTIVE_DRAFT_TAG_TARGET_ID = '__active_draft__';

export function presetRoutineTagTargetId(
  kind: 'class' | 'block' | 'reusable',
  presetId: string,
): string {
  return `preset:${kind}:${presetId}`;
}

export interface StudioRoutineTagsState {
  readonly catalog: readonly string[];
  readonly tagsByRoutineId: Readonly<Record<string, readonly string[]>>;
  readonly updatedAt: string;
}

export const SUGGESTED_STUDIO_ROUTINE_TAGS: ReadonlyArray<string> = [
  '오전 정규반',
  '입문·정렬',
  '코어·힙 집중',
  '흉추·어깨 이완',
  '산전·산후 완화',
  '소도구 플로우',
  '개인레슨 맞춤',
];

const INITIAL_STATE: StudioRoutineTagsState = {
  catalog: SUGGESTED_STUDIO_ROUTINE_TAGS,
  tagsByRoutineId: {},
  updatedAt: '1970-01-01T00:00:00.000Z',
};

let cachedRaw: string | null = null;
let cachedState: StudioRoutineTagsState = INITIAL_STATE;
const listeners = new Set<() => void>();

/**
 * Normalizes a free-form routine tag (strips leading `#`, collapses whitespace, NFC normalizes)
 * so duplicate variations like `#초급 `, `초급`, `초 급` stay clean and bounded.
 */
export function normalizeRoutineTag(raw: string): string {
  const withoutControls = Array.from(raw.normalize('NFC'))
    .filter((ch) => {
      const code = ch.codePointAt(0) ?? 0;
      return code > 0x1f && code !== 0x7f;
    })
    .join('');
  const cleaned = withoutControls
    .trim()
    .replace(/^#+/, '')
    .replace(/\s+/g, ' ')
    .trim();
  return cleaned.slice(0, 28);
}

export function routineTagCanonicalKey(tag: string): string {
  return normalizeRoutineTag(tag).toLocaleLowerCase('ko-KR');
}

export function dedupeRoutineTags(tags: readonly string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of tags) {
    const normalized = normalizeRoutineTag(raw);
    if (!normalized) continue;
    const key = routineTagCanonicalKey(normalized);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(normalized);
    if (out.length >= 40) break;
  }
  return out;
}

function parsePersistedState(raw: string | null): StudioRoutineTagsState {
  if (!raw) return INITIAL_STATE;
  try {
    const parsed = JSON.parse(raw) as Partial<StudioRoutineTagsState> | null;
    if (!parsed || typeof parsed !== 'object') return INITIAL_STATE;
    const rawMap =
      parsed.tagsByRoutineId && typeof parsed.tagsByRoutineId === 'object'
        ? parsed.tagsByRoutineId
        : {};
    const nextMap: Record<string, readonly string[]> = {};
    const discoveredInRoutines: string[] = [];
    for (const [routineId, list] of Object.entries(rawMap)) {
      if (!routineId || !Array.isArray(list)) continue;
      const cleanList = dedupeRoutineTags(list.filter((item): item is string => typeof item === 'string'));
      if (cleanList.length > 0) {
        nextMap[routineId] = cleanList;
        discoveredInRoutines.push(...cleanList);
      }
    }
    const rawCatalog = Array.isArray(parsed.catalog)
      ? parsed.catalog.filter((item): item is string => typeof item === 'string')
      : [...SUGGESTED_STUDIO_ROUTINE_TAGS];
    const catalog = dedupeRoutineTags([...rawCatalog, ...discoveredInRoutines]);
    return {
      catalog: catalog.length > 0 ? catalog : SUGGESTED_STUDIO_ROUTINE_TAGS,
      tagsByRoutineId: nextMap,
      updatedAt: typeof parsed.updatedAt === 'string' ? parsed.updatedAt : INITIAL_STATE.updatedAt,
    };
  } catch {
    return INITIAL_STATE;
  }
}

export function getStudioRoutineTagsState(): StudioRoutineTagsState {
  if (typeof window === 'undefined' || !window.localStorage) {
    return cachedState;
  }
  try {
    const raw = window.localStorage.getItem(STUDIO_ROUTINE_TAGS_STORAGE_KEY);
    if (raw === cachedRaw) return cachedState;
    cachedRaw = raw;
    cachedState = parsePersistedState(raw);
    return cachedState;
  } catch {
    return cachedState;
  }
}

function commitStudioRoutineTagsState(next: StudioRoutineTagsState): StudioRoutineTagsState {
  cachedState = next;
  const serialized = JSON.stringify(next);
  cachedRaw = serialized;
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.setItem(STUDIO_ROUTINE_TAGS_STORAGE_KEY, serialized);
    } catch {
      // Keep in-memory state live even if quota is temporarily constrained.
    }
  }
  for (const listener of listeners) {
    listener();
  }
  return next;
}

export function subscribeStudioRoutineTags(listener: () => void): () => void {
  listeners.add(listener);
  if (typeof window !== 'undefined') {
    const onStorage = (event: StorageEvent) => {
      if (event.key === STUDIO_ROUTINE_TAGS_STORAGE_KEY || event.key === null) {
        listener();
      }
    };
    window.addEventListener('storage', onStorage);
    return () => {
      listeners.delete(listener);
      window.removeEventListener('storage', onStorage);
    };
  }
  return () => {
    listeners.delete(listener);
  };
}

export function useStudioRoutineTags(): StudioRoutineTagsState {
  return useSyncExternalStore(
    subscribeStudioRoutineTags,
    getStudioRoutineTagsState,
    () => INITIAL_STATE,
  );
}

export function getRoutineTagsForId(
  state: StudioRoutineTagsState,
  routineId: string,
): readonly string[] {
  return state.tagsByRoutineId[routineId] ?? [];
}

export function addTagToRoutine(
  routineId: string,
  rawTag: string,
): { ok: boolean; tag: string; message: string } {
  const normalized = normalizeRoutineTag(rawTag);
  if (!normalized) {
    return { ok: false, tag: '', message: '태그 이름을 한 글자 이상 입력해 주세요.' };
  }
  const prev = getStudioRoutineTagsState();
  const canonicalTarget = routineTagCanonicalKey(normalized);
  const canonicalFromCatalog =
    prev.catalog.find((item) => routineTagCanonicalKey(item) === canonicalTarget) ?? normalized;

  const existingForRoutine = prev.tagsByRoutineId[routineId] ?? [];
  if (existingForRoutine.some((item) => routineTagCanonicalKey(item) === canonicalTarget)) {
    return {
      ok: true,
      tag: canonicalFromCatalog,
      message: `'#${canonicalFromCatalog}' 태그가 이미 지정되어 있습니다.`,
    };
  }

  const nextCatalog = dedupeRoutineTags([...prev.catalog, canonicalFromCatalog]);
  const nextForRoutine = dedupeRoutineTags([...existingForRoutine, canonicalFromCatalog]);
  commitStudioRoutineTagsState({
    catalog: nextCatalog,
    tagsByRoutineId: {
      ...prev.tagsByRoutineId,
      [routineId]: nextForRoutine,
    },
    updatedAt: new Date().toISOString(),
  });
  return {
    ok: true,
    tag: canonicalFromCatalog,
    message: `'#${canonicalFromCatalog}' 태그를 추가했습니다.`,
  };
}

export function removeTagFromRoutine(
  routineId: string,
  tagToRemove: string,
): { ok: boolean; message: string } {
  const key = routineTagCanonicalKey(tagToRemove);
  if (!key) return { ok: false, message: '제거할 태그를 확인해 주세요.' };
  const prev = getStudioRoutineTagsState();
  const existing = prev.tagsByRoutineId[routineId] ?? [];
  const filtered = existing.filter((item) => routineTagCanonicalKey(item) !== key);
  if (filtered.length === existing.length) {
    return { ok: false, message: '해당 태그가 수업에 없습니다.' };
  }
  const nextMap = { ...prev.tagsByRoutineId };
  if (filtered.length === 0) {
    delete nextMap[routineId];
  } else {
    nextMap[routineId] = filtered;
  }
  commitStudioRoutineTagsState({
    ...prev,
    tagsByRoutineId: nextMap,
    updatedAt: new Date().toISOString(),
  });
  return { ok: true, message: `'#${normalizeRoutineTag(tagToRemove)}' 태그를 수업에서 뺐습니다.` };
}

export function toggleTagOnRoutine(
  routineId: string,
  rawTag: string,
): { ok: boolean; added: boolean; tag: string; message: string } {
  const normalized = normalizeRoutineTag(rawTag);
  if (!normalized) {
    return { ok: false, added: false, tag: '', message: '태그 이름을 입력해 주세요.' };
  }
  const prev = getStudioRoutineTagsState();
  const existing = prev.tagsByRoutineId[routineId] ?? [];
  const key = routineTagCanonicalKey(normalized);
  if (existing.some((item) => routineTagCanonicalKey(item) === key)) {
    const res = removeTagFromRoutine(routineId, normalized);
    return { ok: res.ok, added: false, tag: normalized, message: res.message };
  }
  const res = addTagToRoutine(routineId, normalized);
  return { ok: res.ok, added: true, tag: res.tag, message: res.message };
}

export function copyDraftRoutineTagsToSavedSequence(savedSequenceId: string): void {
  if (!savedSequenceId) return;
  const prev = getStudioRoutineTagsState();
  const draftTags = prev.tagsByRoutineId[ACTIVE_DRAFT_TAG_TARGET_ID] ?? [];
  if (draftTags.length === 0) return;
  const existingSaved = prev.tagsByRoutineId[savedSequenceId] ?? [];
  const merged = dedupeRoutineTags([...existingSaved, ...draftTags]);
  commitStudioRoutineTagsState({
    ...prev,
    tagsByRoutineId: {
      ...prev.tagsByRoutineId,
      [savedSequenceId]: merged,
    },
    updatedAt: new Date().toISOString(),
  });
}

/**
 * Renames a tag across the entire studio catalog and every tagged routine.
 */
export function renameStudioRoutineTag(
  oldTag: string,
  newRawTag: string,
): { ok: boolean; message: string } {
  const oldKey = routineTagCanonicalKey(oldTag);
  const nextNormalized = normalizeRoutineTag(newRawTag);
  const nextKey = routineTagCanonicalKey(nextNormalized);
  if (!oldKey || !nextKey) {
    return { ok: false, message: '새 태그 이름을 한 글자 이상 입력해 주세요.' };
  }
  const prev = getStudioRoutineTagsState();
  const nextCatalog = dedupeRoutineTags(
    prev.catalog.map((item) => (routineTagCanonicalKey(item) === oldKey ? nextNormalized : item)),
  );
  const nextMap: Record<string, readonly string[]> = {};
  for (const [routineId, list] of Object.entries(prev.tagsByRoutineId)) {
    const mapped = dedupeRoutineTags(
      list.map((item) => (routineTagCanonicalKey(item) === oldKey ? nextNormalized : item)),
    );
    if (mapped.length > 0) {
      nextMap[routineId] = mapped;
    }
  }
  commitStudioRoutineTagsState({
    catalog: nextCatalog,
    tagsByRoutineId: nextMap,
    updatedAt: new Date().toISOString(),
  });
  return {
    ok: true,
    message: `태그 이름을 '#${nextNormalized}'(으)로 변경했습니다.`,
  };
}

/**
 * Deletes a tag label from the studio catalog and strips ONLY that label from routines.
 * Never deletes or alters any saved sequence itself.
 */
export function deleteStudioRoutineTag(tagToDelete: string): {
  ok: boolean;
  detachedCount: number;
  message: string;
} {
  const targetKey = routineTagCanonicalKey(tagToDelete);
  if (!targetKey) {
    return { ok: false, detachedCount: 0, message: '삭제할 태그를 확인해 주세요.' };
  }
  const prev = getStudioRoutineTagsState();
  const nextCatalog = prev.catalog.filter((item) => routineTagCanonicalKey(item) !== targetKey);
  const nextMap: Record<string, readonly string[]> = {};
  let detachedCount = 0;
  for (const [routineId, list] of Object.entries(prev.tagsByRoutineId)) {
    const filtered = list.filter((item) => routineTagCanonicalKey(item) !== targetKey);
    if (filtered.length !== list.length) {
      detachedCount += 1;
    }
    if (filtered.length > 0) {
      nextMap[routineId] = filtered;
    }
  }
  commitStudioRoutineTagsState({
    catalog: nextCatalog,
    tagsByRoutineId: nextMap,
    updatedAt: new Date().toISOString(),
  });
  return {
    ok: true,
    detachedCount,
    message: `'#${normalizeRoutineTag(tagToDelete)}' 태그 라벨만 정리했습니다 (수업 ${detachedCount}개에서 라벨 해제 · 수업 원본 유지).`,
  };
}

export function exportStudioRoutineTagsSnapshot(): string {
  const current = getStudioRoutineTagsState();
  return JSON.stringify(
    {
      schemaVersion: 1,
      exportedAt: new Date().toISOString(),
      catalog: current.catalog,
      tagsByRoutineId: current.tagsByRoutineId,
    },
    null,
    2,
  );
}

export function importStudioRoutineTagsSnapshot(
  rawJson: string,
  mode: 'merge' | 'replace' = 'merge',
): { ok: boolean; tagCount: number; routineCount: number; message: string } {
  if (!rawJson.trim()) {
    return {
      ok: false,
      tagCount: 0,
      routineCount: 0,
      message: '가져올 태그 백업 JSON 문자열이 비어 있습니다.',
    };
  }
  let parsedUnknown: unknown;
  try {
    parsedUnknown = JSON.parse(rawJson);
  } catch {
    return {
      ok: false,
      tagCount: 0,
      routineCount: 0,
      message: '태그 백업 JSON 형식을 읽을 수 없습니다.',
    };
  }
  if (!parsedUnknown || typeof parsedUnknown !== 'object' || Array.isArray(parsedUnknown)) {
    return {
      ok: false,
      tagCount: 0,
      routineCount: 0,
      message: '올바른 스튜디오 태그 백업 객체가 아닙니다.',
    };
  }
  const incoming = parsePersistedState(rawJson);
  const prev = getStudioRoutineTagsState();
  const nextMap: Record<string, readonly string[]> =
    mode === 'replace' ? {} : { ...prev.tagsByRoutineId };

  for (const [routineId, incomingTags] of Object.entries(incoming.tagsByRoutineId)) {
    const base = mode === 'replace' ? [] : (nextMap[routineId] ?? []);
    const merged = dedupeRoutineTags([...base, ...incomingTags]);
    if (merged.length > 0) {
      nextMap[routineId] = merged;
    }
  }

  const nextCatalog = dedupeRoutineTags([
    ...(mode === 'replace' ? [] : prev.catalog),
    ...incoming.catalog,
    ...Object.values(nextMap).flat(),
  ]);

  const committed = commitStudioRoutineTagsState({
    catalog: nextCatalog.length > 0 ? nextCatalog : SUGGESTED_STUDIO_ROUTINE_TAGS,
    tagsByRoutineId: nextMap,
    updatedAt: new Date().toISOString(),
  });
  const routineCount = Object.keys(committed.tagsByRoutineId).length;
  return {
    ok: true,
    tagCount: committed.catalog.length,
    routineCount,
    message: `스튜디오 태그 ${committed.catalog.length}개 · 연결된 수업/프리셋 ${routineCount}건을 반영했습니다.`,
  };
}

export function resetStudioRoutineTagsForTest(): void {
  cachedRaw = null;
  cachedState = INITIAL_STATE;
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.removeItem(STUDIO_ROUTINE_TAGS_STORAGE_KEY);
    } catch {
      // ignore
    }
  }
  for (const listener of listeners) {
    listener();
  }
}
