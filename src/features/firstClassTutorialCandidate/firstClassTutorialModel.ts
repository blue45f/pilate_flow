import type {
  FirstClassTutorialContextOptions,
  FirstClassTutorialContextSummary,
  FirstClassTutorialDiagnosticNote,
  FirstClassTutorialStepId,
  FirstClassTutorialStepSpec,
} from './firstClassTutorialTypes';

const DEFAULT_MAX_SCAN_ITEMS = 10_000;
const HARD_MAX_SCAN_ITEMS = 50_000;
const DEFAULT_MAX_NORMALIZED_ITEMS = 1_000;
const MAX_NORMALIZED_TASK_IDS = 100;
const DEFAULT_TUTORIAL_TITLE_KO = '첫 수업 준비 안내';

const FORBIDDEN_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

/**
 * Matches `studyTutorialTaskIdSchema` in `src/schemas/instructorStudySchema.ts`.
 */
export const TUTORIAL_TASK_ID_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9:._/-]{0,99}$/u;

function freezeStepSpec(spec: FirstClassTutorialStepSpec): FirstClassTutorialStepSpec {
  Object.freeze(spec.legacyTaskIds);
  Object.freeze(spec.bulletsKo);
  return Object.freeze(spec);
}

/**
 * Canonical 3-step visual tutorial model aligned with the real Pilates Flow instructor journey:
 * 1. MovementIdeaSheet / SequenceWorkbench ('새 동작' / '한 줄 아이디어 메모')
 * 2. SequenceWorkbench ('준비·본운동·마무리·휴식 블록' & 50-min target bar)
 * 3. SequenceWorkbench save header -> ClassBinderView ('저장' / '나의 수업 서랍')
 */
export const FIRST_CLASS_TUTORIAL_STEPS: readonly [
  FirstClassTutorialStepSpec,
  FirstClassTutorialStepSpec,
  FirstClassTutorialStepSpec,
] = Object.freeze([
  freezeStepSpec({
    stepNumber: 1,
    id: 'new-movement',
    taskId: 'first-class:new-movement',
    legacyTaskIds: ['compose'],
    badgeKo: '1단계 · 새 동작',
    shortTabLabelKo: '1. 새 동작',
    titleKo: '새 동작 한 줄로 적기',
    summaryKo:
      '분류·해부학 용어나 검토 승인 없이, 떠오른 움직임 한 줄만 적으면 바로 수업에 담을 수 있어요.',
    bulletsKo: [
      '상단 ‘새 동작’ 또는 첫 화면 ‘한 줄 아이디어 메모’를 눌러요.',
      '떠오른 동작을 한 줄로 적고 ‘수업에 넣기’ 또는 ‘동작 고르기’로 담아요.',
      '느낀 점·사진·검토 기록은 선택이며 나중에 적어두어도 돼요.',
    ],
    realUiPathKo: '상단 새 동작 메모 · 수업 구성 > 동작 고르기 / 한 줄 아이디어 메모',
    actionButtonLabelKo: '1단계 화면 위치 안내',
    illustrationKind: 'new-movement-sketch',
    illustrationAltKo: '한 줄 동작 아이디어 입력창과 수업에 넣기 버튼 도해',
    illustrationCaptionKo:
      '사용 흐름 안내 그림 · 실제 운동 시범이나 자세·안전성 검수가 아닙니다.',
    nonGateNoticeKo: '검토 기록은 선택 사항이며 동작 추가·수업 구성을 막지 않습니다.',
  }),
  freezeStepSpec({
    stepNumber: 2,
    id: 'block-composition',
    taskId: 'first-class:block-compose',
    legacyTaskIds: ['conditions', 'compose'],
    badgeKo: '2단계 · 블록 조합',
    shortTabLabelKo: '2. 블록 조합',
    titleKo: '블록으로 묶고 순서 맞추기',
    summaryKo:
      '준비·본운동·마무리·휴식 블록에 동작을 배치하고 목표 시간에 맞춰 순서를 정돈해요.',
    bulletsKo: [
      '담은 동작을 끌어서 옮기거나 위·아래 버튼으로 순서를 바꿔요.',
      '자주 쓰는 조합은 ‘재사용 블록’이나 ‘프리셋·동작 묶음’에서 복사해 넣어요.',
      '동작·설명·전환·휴식 시간이 목표 시간(예: 50분)에 맞춰 자동 합산돼요.',
    ],
    realUiPathKo: '수업 구성 > 오늘의 시퀀스 (준비 · 본운동 · 마무리 · 휴식 블록)',
    actionButtonLabelKo: '2단계 블록 구성 위치 안내',
    illustrationKind: 'block-composition-sketch',
    illustrationAltKo: '준비·본운동·휴식·마무리 블록 순서 조합과 50분 시간 합산 바 도해',
    illustrationCaptionKo:
      '블록 편성 안내 그림 · 시간 계산은 계획용 가정값이며 실측이 아닙니다.',
    nonGateNoticeKo:
      '목표 시간과 차이가 있어도 강사 판단으로 자유롭게 저장·진행할 수 있습니다.',
  }),
  freezeStepSpec({
    stepNumber: 3,
    id: 'save-class',
    taskId: 'first-class:save-class',
    legacyTaskIds: ['rehearse'],
    badgeKo: '3단계 · 수업 저장',
    shortTabLabelKo: '3. 수업 저장',
    titleKo: '수업 제목 적고 서랍에 저장하기',
    summaryKo:
      '시퀀스 제목을 적고 저장하면 이 기기의 수업 서랍에 보관되어 언제든 다시 열고 미리볼 수 있어요.',
    bulletsKo: [
      '오늘의 시퀀스 상단에서 수업 제목을 적고 ‘저장’ 버튼을 눌러요.',
      '‘저장’ 메뉴(나의 수업 서랍)에서 보관된 시퀀스를 언제든 다시 열어요.',
      '수업 전 ‘시퀀스 미리보기’로 시간표를 점검하거나 완료 후 기록을 남겨요.',
    ],
    realUiPathKo: '오늘의 시퀀스 > 시퀀스 제목 · 저장 → 저장 탭 (나의 수업 서랍)',
    actionButtonLabelKo: '3단계 저장 서랍 위치 안내',
    illustrationKind: 'save-class-sketch',
    illustrationAltKo: '시퀀스 제목 입력 후 저장 버튼을 눌러 나의 수업 서랍에 보관하는 도해',
    illustrationCaptionKo:
      '저장 동선 안내 그림 · 이 브라우저에 기본 보관되며 계획과 수업 완료 기록은 분리됩니다.',
    nonGateNoticeKo:
      '튜토리얼 확인 체크는 내 학습 메모일 뿐이며 수업 저장·진행 조건이 아닙니다.',
  }),
]);

export function isValidTutorialTaskId(value: unknown): value is string {
  return typeof value === 'string' && TUTORIAL_TASK_ID_PATTERN.test(value);
}

export function getTutorialStepById(
  stepId: FirstClassTutorialStepId,
): FirstClassTutorialStepSpec {
  const found = FIRST_CLASS_TUTORIAL_STEPS.find((step) => step.id === stepId);
  return found ?? FIRST_CLASS_TUTORIAL_STEPS[0];
}

export function isStepCompletedByTaskIds(
  stepId: FirstClassTutorialStepId,
  taskIds: readonly string[],
  includeLegacyTaskMappings = true,
): boolean {
  const step = getTutorialStepById(stepId);
  const validSet = new Set<string>();
  for (const rawId of taskIds) {
    if (isValidTutorialTaskId(rawId)) {
      validSet.add(rawId);
    }
  }
  if (validSet.has(step.taskId)) {
    return true;
  }
  if (
    includeLegacyTaskMappings &&
    step.legacyTaskIds.length > 0 &&
    step.legacyTaskIds.every((legacyId) => validSet.has(legacyId))
  ) {
    return true;
  }
  return false;
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }
  const proto = Object.getPrototypeOf(value);
  return proto === null || proto === Object.prototype;
}

function readOwnProperty(record: Record<string, unknown>, key: string): unknown {
  if (FORBIDDEN_KEYS.has(key)) {
    return undefined;
  }
  if (!Object.prototype.hasOwnProperty.call(record, key)) {
    return undefined;
  }
  try {
    return record[key];
  } catch {
    return undefined;
  }
}

function sanitizeDisplayText(value: unknown, maxLength = 120): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  let cleaned = '';
  for (const ch of value) {
    const code = ch.codePointAt(0) ?? 0;
    if (code <= 0x1f || (code >= 0x7f && code <= 0x9f)) {
      cleaned += ' ';
    } else {
      cleaned += ch;
    }
  }
  const trimmed = cleaned.replace(/\s+/gu, ' ').trim();
  if (trimmed.length === 0) {
    return null;
  }
  return trimmed.slice(0, maxLength);
}

function summarizeSampleValue(value: unknown): string {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  if (typeof value === 'string') {
    const cleaned = sanitizeDisplayText(value, 32) ?? '';
    return `string(${ JSON.stringify(cleaned) })`;
  }
  if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') {
    return `${typeof value}(${String(value)})`;
  }
  if (Array.isArray(value)) {
    return `array(len=${value.length})`;
  }
  return typeof value;
}

function isValidPositiveMinutes(value: unknown, max = 180): boolean {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 && value <= max;
}

function classifyStepRecord(
  item: unknown,
  seenStepObjects: WeakSet<object>,
): 'exercise' | 'rest' | 'malformed' {
  if (!isPlainRecord(item)) {
    return 'malformed';
  }
  if (seenStepObjects.has(item)) {
    return 'malformed';
  }
  seenStepObjects.add(item);

  const kind = readOwnProperty(item, 'kind');
  if (kind !== undefined && kind !== 'exercise' && kind !== 'rest') {
    return 'malformed';
  }

  const durationMin = readOwnProperty(item, 'durationMin');
  if (durationMin !== undefined && !isValidPositiveMinutes(durationMin, 180)) {
    return 'malformed';
  }

  const blockCategory = readOwnProperty(item, 'blockCategory');
  const exerciseId = readOwnProperty(item, 'exerciseId');
  const stepId = readOwnProperty(item, 'stepId');
  const id = readOwnProperty(item, 'id');
  const nameKo = readOwnProperty(item, 'nameKo');

  const isRest =
    kind === 'rest' || blockCategory === 'rest' || exerciseId === '__rest__';

  if (isRest) {
    return 'rest';
  }

  const hasValidIdentifier =
    sanitizeDisplayText(exerciseId, 200) !== null ||
    sanitizeDisplayText(stepId, 200) !== null ||
    sanitizeDisplayText(id, 200) !== null ||
    sanitizeDisplayText(nameKo, 200) !== null;

  return hasValidIdentifier ? 'exercise' : 'malformed';
}

function isValidIdeaDraftRecord(
  item: unknown,
  seenObjects: WeakSet<object>,
): boolean {
  if (!isPlainRecord(item)) {
    return false;
  }
  if (seenObjects.has(item)) {
    return false;
  }
  seenObjects.add(item);

  const durationMin = readOwnProperty(item, 'durationMin');
  if (durationMin !== undefined && !isValidPositiveMinutes(durationMin, 180)) {
    return false;
  }
  const defaultDurationMin = readOwnProperty(item, 'defaultDurationMin');
  if (defaultDurationMin !== undefined && !isValidPositiveMinutes(defaultDurationMin, 180)) {
    return false;
  }

  const directText =
    sanitizeDisplayText(readOwnProperty(item, 'ideaLine'), 240) ??
    sanitizeDisplayText(readOwnProperty(item, 'workingTitle'), 240) ??
    sanitizeDisplayText(readOwnProperty(item, 'workingNameKo'), 240) ??
    sanitizeDisplayText(readOwnProperty(item, 'nameKo'), 240) ??
    sanitizeDisplayText(readOwnProperty(item, 'exerciseId'), 240) ??
    sanitizeDisplayText(readOwnProperty(item, 'id'), 240);

  if (directText !== null) {
    return true;
  }

  const current = readOwnProperty(item, 'current');
  if (isPlainRecord(current) && !seenObjects.has(current)) {
    seenObjects.add(current);
    const nestedText =
      sanitizeDisplayText(readOwnProperty(current, 'ideaLine'), 240) ??
      sanitizeDisplayText(readOwnProperty(current, 'workingNameKo'), 240);
    return nestedText !== null;
  }

  return false;
}

function isValidReusableBlockRecord(
  item: unknown,
  seenObjects: WeakSet<object>,
): boolean {
  if (!isPlainRecord(item)) {
    return false;
  }
  if (seenObjects.has(item)) {
    return false;
  }
  seenObjects.add(item);

  const label =
    sanitizeDisplayText(readOwnProperty(item, 'title'), 200) ??
    sanitizeDisplayText(readOwnProperty(item, 'nameKo'), 200) ??
    sanitizeDisplayText(readOwnProperty(item, 'id'), 200);

  if (label === null) {
    return false;
  }

  const items = readOwnProperty(item, 'items');
  if (items !== undefined && !Array.isArray(items)) {
    return false;
  }
  const steps = readOwnProperty(item, 'steps');
  if (steps !== undefined && !Array.isArray(steps)) {
    return false;
  }

  return true;
}

function isValidSavedSequenceRecord(
  item: unknown,
  seenObjects: WeakSet<object>,
): boolean {
  if (!isPlainRecord(item)) {
    return false;
  }
  if (seenObjects.has(item)) {
    return false;
  }
  seenObjects.add(item);

  const label =
    sanitizeDisplayText(readOwnProperty(item, 'title'), 200) ??
    sanitizeDisplayText(readOwnProperty(item, 'id'), 200);

  if (label === null) {
    return false;
  }

  const targetMinutes = readOwnProperty(item, 'targetMinutes');
  if (
    targetMinutes !== undefined &&
    !(
      typeof targetMinutes === 'number' &&
      Number.isInteger(targetMinutes) &&
      targetMinutes >= 10 &&
      targetMinutes <= 120
    )
  ) {
    return false;
  }

  const steps = readOwnProperty(item, 'steps');
  if (steps !== undefined && !Array.isArray(steps)) {
    return false;
  }

  return true;
}

function freezeContextSummary(
  summary: FirstClassTutorialContextSummary,
): FirstClassTutorialContextSummary {
  for (const note of summary.diagnostics) {
    Object.freeze(note);
  }
  Object.freeze(summary.completedStepIds);
  Object.freeze(summary.normalizedTaskIds);
  Object.freeze(summary.diagnostics);
  Object.freeze(summary.boundary);
  return Object.freeze(summary);
}

/**
 * Pure, read-only boundary resolver for `FirstClassTutorialCandidate`.
 * Never mutates or freezes `source` or any nested caller reference.
 */
export function resolveFirstClassTutorialContext(
  source?: unknown,
  options?: FirstClassTutorialContextOptions,
): FirstClassTutorialContextSummary {
  const rawMaxScan = options?.maxScanItems;
  const maxScanItems =
    typeof rawMaxScan === 'number' && Number.isFinite(rawMaxScan) && rawMaxScan >= 1
      ? Math.min(Math.floor(rawMaxScan), HARD_MAX_SCAN_ITEMS)
      : DEFAULT_MAX_SCAN_ITEMS;

  const rawMaxNorm = options?.maxNormalizedItems;
  const maxNormalizedItems =
    typeof rawMaxNorm === 'number' && Number.isFinite(rawMaxNorm) && rawMaxNorm >= 1
      ? Math.min(Math.floor(rawMaxNorm), maxScanItems)
      : Math.min(DEFAULT_MAX_NORMALIZED_ITEMS, maxScanItems);

  const includeLegacyTaskMappings = options?.includeLegacyTaskMappings !== false;

  const diagnostics: FirstClassTutorialDiagnosticNote[] = [];
  let isPartialContext = false;
  let titleKo = DEFAULT_TUTORIAL_TITLE_KO;
  let targetMinutes: number | null = null;
  let targetMinutesStatus: 'known' | 'unspecified' | 'invalid' = 'unspecified';
  let exerciseStepCount = 0;
  let restStepCount = 0;
  let ideaDraftCount = 0;
  let reusableBlockCount = 0;
  let savedSequenceCount = 0;
  const normalizedTaskIds: string[] = [];
  let scanLimitNoted = false;

  const noteScanLimit = (collectionLabel: string, length: number) => {
    isPartialContext = true;
    if (!scanLimitNoted) {
      scanLimitNoted = true;
      diagnostics.push({
        code: 'SCAN_LIMIT_REACHED',
        messageKo: `${collectionLabel} 항목 수가 허용 범위(${maxScanItems}개)를 넘어 앞쪽 항목만 안전하게 확인했습니다.`,
        sampleValueSummary: `len=${length}`,
      });
    }
  };

  if (source !== undefined && source !== null && !isPlainRecord(source)) {
    isPartialContext = true;
    diagnostics.push({
      code: 'INVALID_SOURCE_ROOT',
      messageKo:
        '전달된 수업 문맥 형식이 올바르지 않아 기본 첫 수업 안내로 표시합니다.',
      sampleValueSummary: summarizeSampleValue(source),
    });
  } else if (isPlainRecord(source)) {
    // 1. Title
    const rawTitle =
      readOwnProperty(source, 'title') ?? readOwnProperty(source, 'activeTitle');
    const sanitizedTitle = sanitizeDisplayText(rawTitle, 120);
    if (sanitizedTitle !== null) {
      titleKo = sanitizedTitle;
    }

    // 2. Target minutes
    const rawTargetMinutes =
      readOwnProperty(source, 'targetMinutes') !== undefined
        ? readOwnProperty(source, 'targetMinutes')
        : readOwnProperty(source, 'activeTargetMinutes');

    if (rawTargetMinutes === undefined || rawTargetMinutes === null) {
      targetMinutes = null;
      targetMinutesStatus = 'unspecified';
    } else if (
      typeof rawTargetMinutes === 'number' &&
      Number.isInteger(rawTargetMinutes) &&
      rawTargetMinutes >= 10 &&
      rawTargetMinutes <= 120
    ) {
      targetMinutes = rawTargetMinutes;
      targetMinutesStatus = 'known';
    } else {
      targetMinutes = null;
      targetMinutesStatus = 'invalid';
      isPartialContext = true;
      diagnostics.push({
        code: 'INVALID_TARGET_MINUTES',
        messageKo:
          '목표 수업 시간 값이 유효 범위(10~120분)가 아니어서 기본 안내 기준으로 표시합니다.',
        sampleValueSummary: summarizeSampleValue(rawTargetMinutes),
      });
    }

    // 3. Steps (`steps` or `activeSteps`)
    const rawSteps =
      readOwnProperty(source, 'steps') !== undefined
        ? readOwnProperty(source, 'steps')
        : readOwnProperty(source, 'activeSteps');

    if (rawSteps !== undefined && rawSteps !== null) {
      if (!Array.isArray(rawSteps)) {
        isPartialContext = true;
        diagnostics.push({
          code: 'MALFORMED_STEP_SKIPPED',
          messageKo: '시퀀스 단계 목록 형식이 배열이 아니어서 건너뛰었습니다.',
          sampleValueSummary: summarizeSampleValue(rawSteps),
        });
      } else {
        const seenSteps = new WeakSet<object>();
        let malformedStepNoted = false;
        const limit = Math.min(rawSteps.length, maxScanItems);
        if (rawSteps.length > maxScanItems) {
          noteScanLimit('steps', rawSteps.length);
        }
        for (let i = 0; i < limit; i += 1) {
          if (exerciseStepCount + restStepCount >= maxNormalizedItems) {
            noteScanLimit('steps', rawSteps.length);
            break;
          }
          const stepItem = rawSteps[i];
          const classification = classifyStepRecord(stepItem, seenSteps);
          if (classification === 'exercise') {
            exerciseStepCount += 1;
          } else if (classification === 'rest') {
            restStepCount += 1;
          } else {
            isPartialContext = true;
            if (!malformedStepNoted) {
              malformedStepNoted = true;
              diagnostics.push({
                code: 'MALFORMED_STEP_SKIPPED',
                messageKo:
                  '형식이 맞지 않는 시퀀스 단계 항목을 건너뛰고 나머지 항목만 합산했습니다.',
                sampleValueSummary: summarizeSampleValue(stepItem),
              });
            }
          }
        }
      }
    }

    // 4. Idea drafts (`ideaDrafts` or `ideaExercises`)
    const rawIdeas =
      readOwnProperty(source, 'ideaDrafts') !== undefined
        ? readOwnProperty(source, 'ideaDrafts')
        : readOwnProperty(source, 'ideaExercises');

    if (rawIdeas !== undefined && rawIdeas !== null) {
      if (!Array.isArray(rawIdeas)) {
        isPartialContext = true;
        diagnostics.push({
          code: 'MALFORMED_IDEA_SKIPPED',
          messageKo: '한 줄 동작 아이디어 목록 형식이 배열이 아니어서 건너뛰었습니다.',
          sampleValueSummary: summarizeSampleValue(rawIdeas),
        });
      } else {
        const seenIdeas = new WeakSet<object>();
        let malformedIdeaNoted = false;
        const limit = Math.min(rawIdeas.length, maxScanItems);
        if (rawIdeas.length > maxScanItems) {
          noteScanLimit('ideaDrafts', rawIdeas.length);
        }
        for (let i = 0; i < limit; i += 1) {
          if (ideaDraftCount >= maxNormalizedItems) {
            noteScanLimit('ideaDrafts', rawIdeas.length);
            break;
          }
          const ideaItem = rawIdeas[i];
          if (isValidIdeaDraftRecord(ideaItem, seenIdeas)) {
            ideaDraftCount += 1;
          } else {
            isPartialContext = true;
            if (!malformedIdeaNoted) {
              malformedIdeaNoted = true;
              diagnostics.push({
                code: 'MALFORMED_IDEA_SKIPPED',
                messageKo:
                  '형식이 맞지 않는 동작 아이디어 항목을 건너뛰었습니다.',
                sampleValueSummary: summarizeSampleValue(ideaItem),
              });
            }
          }
        }
      }
    }

    // 5. Reusable blocks (`reusableBlocks`)
    const rawBlocks = readOwnProperty(source, 'reusableBlocks');
    if (rawBlocks !== undefined && rawBlocks !== null) {
      if (!Array.isArray(rawBlocks)) {
        isPartialContext = true;
        diagnostics.push({
          code: 'MALFORMED_BLOCK_SKIPPED',
          messageKo: '재사용 블록 목록 형식이 배열이 아니어서 건너뛰었습니다.',
          sampleValueSummary: summarizeSampleValue(rawBlocks),
        });
      } else {
        const seenBlocks = new WeakSet<object>();
        let malformedBlockNoted = false;
        const limit = Math.min(rawBlocks.length, maxScanItems);
        if (rawBlocks.length > maxScanItems) {
          noteScanLimit('reusableBlocks', rawBlocks.length);
        }
        for (let i = 0; i < limit; i += 1) {
          if (reusableBlockCount >= maxNormalizedItems) {
            noteScanLimit('reusableBlocks', rawBlocks.length);
            break;
          }
          const blockItem = rawBlocks[i];
          if (isValidReusableBlockRecord(blockItem, seenBlocks)) {
            reusableBlockCount += 1;
          } else {
            isPartialContext = true;
            if (!malformedBlockNoted) {
              malformedBlockNoted = true;
              diagnostics.push({
                code: 'MALFORMED_BLOCK_SKIPPED',
                messageKo: '형식이 맞지 않는 재사용 블록 항목을 건너뛰었습니다.',
                sampleValueSummary: summarizeSampleValue(blockItem),
              });
            }
          }
        }
      }
    }

    // 6. Saved sequences (`savedSequences`)
    const rawSaved = readOwnProperty(source, 'savedSequences');
    if (rawSaved !== undefined && rawSaved !== null) {
      if (!Array.isArray(rawSaved)) {
        isPartialContext = true;
        diagnostics.push({
          code: 'MALFORMED_SAVED_SEQUENCE_SKIPPED',
          messageKo: '저장된 시퀀스 목록 형식이 배열이 아니어서 건너뛰었습니다.',
          sampleValueSummary: summarizeSampleValue(rawSaved),
        });
      } else {
        const seenSaved = new WeakSet<object>();
        let malformedSavedNoted = false;
        const limit = Math.min(rawSaved.length, maxScanItems);
        if (rawSaved.length > maxScanItems) {
          noteScanLimit('savedSequences', rawSaved.length);
        }
        for (let i = 0; i < limit; i += 1) {
          if (savedSequenceCount >= maxNormalizedItems) {
            noteScanLimit('savedSequences', rawSaved.length);
            break;
          }
          const savedItem = rawSaved[i];
          if (isValidSavedSequenceRecord(savedItem, seenSaved)) {
            savedSequenceCount += 1;
          } else {
            isPartialContext = true;
            if (!malformedSavedNoted) {
              malformedSavedNoted = true;
              diagnostics.push({
                code: 'MALFORMED_SAVED_SEQUENCE_SKIPPED',
                messageKo: '형식이 맞지 않는 저장 수업 항목을 건너뛰었습니다.',
                sampleValueSummary: summarizeSampleValue(savedItem),
              });
            }
          }
        }
      }
    }

    // 7. Completed tutorial task IDs (`completedTutorialTaskIds` or `study.completedTutorialTaskIds`)
    let rawTaskIds = readOwnProperty(source, 'completedTutorialTaskIds');
    if (rawTaskIds === undefined) {
      const rawStudy = readOwnProperty(source, 'study');
      if (isPlainRecord(rawStudy)) {
        rawTaskIds = readOwnProperty(rawStudy, 'completedTutorialTaskIds');
      }
    }

    if (rawTaskIds !== undefined && rawTaskIds !== null) {
      if (!Array.isArray(rawTaskIds)) {
        isPartialContext = true;
        diagnostics.push({
          code: 'MALFORMED_TASK_ID_SKIPPED',
          messageKo: '학습 체크 목록 형식이 배열이 아니어서 건너뛰었습니다.',
          sampleValueSummary: summarizeSampleValue(rawTaskIds),
        });
      } else {
        const seenTaskIds = new Set<string>();
        let malformedTaskNoted = false;
        const taskCap = Math.min(MAX_NORMALIZED_TASK_IDS, maxNormalizedItems);
        const limit = Math.min(rawTaskIds.length, maxScanItems);
        if (rawTaskIds.length > maxScanItems) {
          noteScanLimit('completedTutorialTaskIds', rawTaskIds.length);
        }
        for (let i = 0; i < limit; i += 1) {
          const candidateId = rawTaskIds[i];
          if (isValidTutorialTaskId(candidateId)) {
            if (!seenTaskIds.has(candidateId)) {
              if (normalizedTaskIds.length >= taskCap) {
                noteScanLimit('completedTutorialTaskIds', rawTaskIds.length);
                break;
              }
              seenTaskIds.add(candidateId);
              normalizedTaskIds.push(candidateId);
            }
          } else {
            isPartialContext = true;
            if (!malformedTaskNoted) {
              malformedTaskNoted = true;
              diagnostics.push({
                code: 'MALFORMED_TASK_ID_SKIPPED',
                messageKo: '유효하지 않은 튜토리얼 체크 ID를 건너뛰었습니다.',
                sampleValueSummary: summarizeSampleValue(candidateId),
              });
            }
          }
        }
      }
    }
  }

  const completedStepIds: FirstClassTutorialStepId[] = [];
  for (const step of FIRST_CLASS_TUTORIAL_STEPS) {
    if (isStepCompletedByTaskIds(step.id, normalizedTaskIds, includeLegacyTaskMappings)) {
      completedStepIds.push(step.id);
    }
  }

  let suggestedStepId: FirstClassTutorialStepId;
  let suggestedReasonKo: string;

  if (exerciseStepCount === 0 && ideaDraftCount === 0 && reusableBlockCount === 0) {
    suggestedStepId = 'new-movement';
    suggestedReasonKo =
      '아직 담긴 동작이나 한 줄 동작 초안이 없어 1단계(새 동작 적기)부터 안내합니다.';
  } else if (
    exerciseStepCount === 0 ||
    (savedSequenceCount === 0 && exerciseStepCount < 2)
  ) {
    suggestedStepId = 'block-composition';
    suggestedReasonKo =
      '동작 재료를 바탕으로 블록 순서와 목표 시간을 맞추는 2단계(블록 조합)를 안내합니다.';
  } else {
    suggestedStepId = 'save-class';
    suggestedReasonKo =
      '구성된 블록 시퀀스에 수업 제목을 붙여 보관하는 3단계(수업 저장)를 안내합니다.';
  }

  return freezeContextSummary({
    titleKo,
    targetMinutes,
    targetMinutesStatus,
    exerciseStepCount,
    restStepCount,
    ideaDraftCount,
    reusableBlockCount,
    savedSequenceCount,
    completedStepIds,
    normalizedTaskIds,
    suggestedStepId,
    suggestedReasonKo,
    isPartialContext,
    diagnostics,
    boundary: {
      isReadOnly: true,
      isMandatoryTour: false,
      requiresReviewApproval: false,
      mutatesStoreOrStorage: false,
      clinicalOrAnatomicalApproval: false,
    },
  });
}
