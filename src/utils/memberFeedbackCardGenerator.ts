import { APPARATUS_LABELS } from '../data/pilatesCatalog';
import {
  WORLD_PILATES_BY_ID,
  WORLD_PILATES_EXERCISES,
} from '../data/worldPilatesRepertoire1000';
import type {
  ApparatusType,
  BodyPosition,
  PilatesExercise,
  SequenceStep,
} from '../types/pilates';
import { getExerciseArtworkFrame } from './exerciseArtworkCache';
import { inspectSensitiveHealthText } from './sensitiveHealthPrivacy';
import { isRestStep } from './sequenceEngine';

export type FeedbackCardRatio = '4:5' | '9:16';

export interface FeedbackCardDimensionSpec {
  readonly ratio: FeedbackCardRatio;
  readonly width: number;
  readonly height: number;
  readonly labelKo: string;
  readonly shortLabelKo: string;
  readonly cssAspectRatio: string;
}

export const FEEDBACK_CARD_DIMENSIONS: Readonly<
  Record<FeedbackCardRatio, FeedbackCardDimensionSpec>
> = {
  '4:5': {
    ratio: '4:5',
    width: 1080,
    height: 1350,
    labelKo: '4:5 피드 · 카톡 카드 (1080×1350)',
    shortLabelKo: '4:5 피드/카톡',
    cssAspectRatio: '4 / 5',
  },
  '9:16': {
    ratio: '9:16',
    width: 1080,
    height: 1920,
    labelKo: '9:16 스토리 카드 (1080×1920)',
    shortLabelKo: '9:16 스토리',
    cssAspectRatio: '9 / 16',
  },
};

export type InstructorNotePresetId =
  | 'steady-breath'
  | 'smooth-alignment'
  | 'energetic-progress';

export interface InstructorNotePreset {
  readonly id: InstructorNotePresetId;
  readonly labelKo: string;
  readonly textKo: string;
}

export const INSTRUCTOR_NOTE_PRESETS: readonly InstructorNotePreset[] = [
  {
    id: 'steady-breath',
    labelKo: '호흡 · 중심 칭찬',
    textKo:
      '오늘 호흡 리듬과 중심 잡기가 정말 안정적이었어요. 어깨 힘을 살짝 내려놓고 오늘 배운 3분 홈트도 가볍게 이어 가 보세요.',
  },
  {
    id: 'smooth-alignment',
    labelKo: '정렬 · 집중 격려',
    textKo:
      '척추를 길게 세우며 마지막까지 차분하게 집중해 주셔서 멋졌어요. 다음 수업 전까지 물 자주 드시고 목·어깨를 가볍게 풀어 주세요.',
  },
  {
    id: 'energetic-progress',
    labelKo: '근력 · 밸런스 성장',
    textKo:
      '이전보다 코어 지지력과 좌우 균형 감각이 한층 탄탄해졌어요. 무리하지 않는 선에서 오늘의 3분 홈트로 좋은 감각을 유지해 보세요.',
  },
];

export const MEMBER_FEEDBACK_PRIVACY_NOTICE_KO =
  '회원 실명·연락처·질환명은 카드에 넣지 마세요';

export interface FeedbackHighlightMove {
  readonly stepId: string;
  readonly exerciseId: string;
  readonly orderNumber: number;
  readonly phaseTagKo: string;
  readonly nameKo: string;
  readonly nameEn: string;
  readonly apparatus: ApparatusType;
  readonly apparatusLabelKo: string;
  readonly bodyPositionLabelKo: string;
  readonly artworkSrc: string | null;
  readonly cueLineKo: string;
  readonly breathPatternKo: string;
}

export interface FeedbackHomePractice {
  readonly exerciseId: string;
  readonly nameKo: string;
  readonly durationLabelKo: string;
  readonly cueLineKo: string;
  readonly breathPatternKo: string;
  readonly tipKo: string;
  readonly artworkSrc: string | null;
  readonly fromCurrentSequence: boolean;
}

export interface MemberFeedbackDraft {
  readonly sequenceTitle: string;
  readonly dateLabel: string;
  readonly apparatus: ApparatusType | 'mixed';
  readonly apparatusLabelKo: string;
  readonly totalDurationMin: number;
  readonly totalExerciseCount: number;
  readonly ratio: FeedbackCardRatio;
  readonly highlights: readonly FeedbackHighlightMove[];
  readonly homePractice: FeedbackHomePractice;
  readonly instructorNote: string;
  readonly notePresetId: InstructorNotePresetId | 'custom';
  readonly privacyWarningKo: string | null;
  readonly privacyNoticeKo: string;
}

export type FeedbackExerciseLookup =
  | ReadonlyMap<string, PilatesExercise>
  | Readonly<Record<string, PilatesExercise>>;

export interface BuildMemberFeedbackDraftParams {
  readonly sequenceTitle: string;
  readonly steps: readonly SequenceStep[];
  readonly exercisesById: FeedbackExerciseLookup;
  readonly apparatus: ApparatusType | 'mixed';
  readonly dateLabel?: string;
  readonly unifiedPool?: readonly PilatesExercise[];
  readonly instructorNote?: string;
  readonly notePresetId?: InstructorNotePresetId | 'custom';
  readonly ratio?: FeedbackCardRatio;
}

export interface RenderFeedbackCardOptions {
  readonly imageLoader?: (src: string) => Promise<CanvasImageSource | null>;
  readonly imageTimeoutMs?: number;
}

export interface RenderFeedbackCardResult {
  readonly width: number;
  readonly height: number;
  readonly ratio: FeedbackCardRatio;
  readonly renderedWithFallback: boolean;
  readonly drawnImageCount: number;
  readonly fallbackBadgeCount: number;
}

export interface ExportFeedbackCardPngResult {
  readonly blob: Blob;
  readonly fileName: string;
  readonly width: number;
  readonly height: number;
  readonly ratio: FeedbackCardRatio;
  readonly mimeType: 'image/png';
  readonly renderResult: RenderFeedbackCardResult;
}

export interface ShareFeedbackCardResult {
  readonly ok: boolean;
  readonly method: 'web-share' | 'download-fallback' | 'cancelled';
  readonly fileName: string;
  readonly messageKo: string;
}

const PLAIN_POSITION_KO: Readonly<Record<BodyPosition, string>> = {
  supine: '누운 자세',
  prone: '엎드린 자세',
  'side-lying': '옆으로 누운 자세',
  seated: '앉은 자세',
  kneeling: '무릎 선 자세',
  standing: '선 자세',
  quadruped: '네발기기',
};

const HOME_UNSAFE_RE =
  /숏\s*스파인|롤\s*오버|잭나이프|티저|플랭크|핸드스탠드|스완\s*다이브|부메랑|점프|short\s*spine|roll\s*over|jack\s*knife|teaser|plank|handstand|swan\s*dive|jump/i;

const HOME_MOBILITY_FRIENDLY_RE =
  /호흡|골반\s*시계|캣|고양이|머메이드|척추\s*분절|브릿지|흉추|롤\s*다운|스트레치|오픈\s*북|breath|pelvic\s*clock|cat|mermaid|bridge|thoracic|roll\s*down|open\s*book|stretch/i;

// 1x1 transparent valid PNG fallback used only in headless environments without 2D canvas encoding
const MINIMAL_FALLBACK_PNG_BYTES = new Uint8Array([
  137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82, 0, 0, 0, 1, 0, 0, 0, 1, 8, 6, 0,
  0, 0, 31, 21, 196, 137, 0, 0, 0, 13, 73, 68, 65, 84, 120, 156, 99, 248, 255, 255, 63, 0, 5, 254,
  2, 254, 167, 53, 129, 132, 0, 0, 0, 0, 73, 69, 78, 68, 174, 66, 96, 130,
]);

function lookupExercise(
  exercisesById: FeedbackExerciseLookup,
  exerciseId: string,
): PilatesExercise | undefined {
  if (exercisesById instanceof Map) {
    return exercisesById.get(exerciseId) ?? WORLD_PILATES_BY_ID.get(exerciseId);
  }
  const record = exercisesById as Readonly<Record<string, PilatesExercise>>;
  if (Object.hasOwn(record, exerciseId)) {
    return record[exerciseId];
  }
  return WORLD_PILATES_BY_ID.get(exerciseId);
}

function resolveArtworkSrc(ex: PilatesExercise): string | null {
  const direct = getExerciseArtworkFrame(ex, 'middle')?.src;
  if (direct) return direct;
  const world = WORLD_PILATES_BY_ID.get(ex.id);
  if (world && world.parentArchetypeId !== ex.id) {
    const parent = WORLD_PILATES_BY_ID.get(world.parentArchetypeId);
    if (
      parent &&
      parent.apparatus === ex.apparatus &&
      parent.bodyPosition === ex.bodyPosition
    ) {
      return getExerciseArtworkFrame(parent, 'middle')?.src ?? null;
    }
  }
  return null;
}

export function formatDefaultFeedbackDateLabel(date: Date = new Date()): string {
  const weekdays = ['일', '월', '화', '수', '목', '금', '토'] as const;
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const wd = weekdays[date.getDay()] ?? '';
  return `${y}.${m}.${d} (${wd})`;
}

function cleanCueLine(ex: PilatesExercise): string {
  const raw = (ex.cues[0] || ex.layers.standard || ex.layers.easy || '').trim();
  const normalized = raw.replace(/\s+/g, ' ');
  if (!normalized) return '어깨 힘을 빼고 호흡에 맞춰 천천히 움직여 주세요.';
  return normalized.length <= 66 ? normalized : `${normalized.slice(0, 64).trim()}…`;
}

function cleanBreathPattern(ex: PilatesExercise): string {
  const raw = (ex.breathPattern || '').replace(/\s+/g, ' ').trim();
  if (!raw) return '코로 깊게 마시고 입으로 길게 내쉬기';
  return raw.length <= 44 ? raw : `${raw.slice(0, 42).trim()}…`;
}

function selectBalancedCoreThree(
  entries: ReadonlyArray<{ step: SequenceStep; exercise: PilatesExercise; index: number }>,
): Array<{ step: SequenceStep; exercise: PilatesExercise; index: number; phaseTagKo: string }> {
  if (entries.length === 0) return [];

  const pickedIndices = new Set<number>();
  let mainPick: { step: SequenceStep; exercise: PilatesExercise; index: number } | undefined;
  let cooldownPick: { step: SequenceStep; exercise: PilatesExercise; index: number } | undefined;

  // 1) Warm-up / opening balance pick
  const warmupPick =
    entries.find(
      (item) =>
        item.step.blockCategory === 'warmup' ||
        item.step.blockCategory === 'footwork' ||
        item.exercise.blockCategory === 'warmup',
    ) ?? entries[0];
  if (warmupPick) pickedIndices.add(warmupPick.index);

  // 2) Cooldown / closing balance pick (distinct from warmup)
  for (let i = entries.length - 1; i >= 0; i -= 1) {
    const item = entries[i]!;
    if (pickedIndices.has(item.index)) continue;
    if (
      item.step.blockCategory === 'cooldown' ||
      item.step.blockCategory === 'feet-in-straps' ||
      item.exercise.blockCategory === 'cooldown'
    ) {
      cooldownPick = item;
      break;
    }
  }
  if (!cooldownPick && entries.length >= 3) {
    for (let i = entries.length - 1; i >= 0; i -= 1) {
      const item = entries[i]!;
      if (!pickedIndices.has(item.index)) {
        cooldownPick = item;
        break;
      }
    }
  }
  if (cooldownPick) pickedIndices.add(cooldownPick.index);

  // 3) Main peak pick (prefer core/lower-body/upper-body/extension/bridging/plank + real 3D artwork)
  const mainCandidates = entries.filter((item) => !pickedIndices.has(item.index));
  if (mainCandidates.length > 0) {
    const midIdx = Math.floor(entries.length / 2);
    let bestMain = mainCandidates[0]!;
    let bestScore = -Infinity;
    for (const cand of mainCandidates) {
      let score = 0;
      if (
        cand.exercise.blockCategory === 'core' ||
        cand.exercise.blockCategory === 'lower-body' ||
        cand.exercise.blockCategory === 'upper-body' ||
        cand.exercise.blockCategory === 'extension' ||
        cand.exercise.blockCategory === 'bridging' ||
        cand.exercise.blockCategory === 'plank'
      ) {
        score += 30;
      }
      if (resolveArtworkSrc(cand.exercise)) score += 16;
      if (cand.exercise.favoriteTag === 'signature' || cand.exercise.favoriteTag === 'member-love') {
        score += 10;
      }
      score -= Math.abs(cand.index - midIdx) * 2;
      if (score > bestScore) {
        bestScore = score;
        bestMain = cand;
      }
    }
    mainPick = bestMain;
    pickedIndices.add(mainPick.index);
  }

  const ordered = [
    ...(warmupPick ? [{ ...warmupPick, phaseTagKo: '도입 · 워밍업' }] : []),
    ...(mainPick ? [{ ...mainPick, phaseTagKo: '핵심 · 메인' }] : []),
    ...(cooldownPick ? [{ ...cooldownPick, phaseTagKo: '정리 · 마무리' }] : []),
  ];

  // Backfill if fewer than 3 distinct moves exist in sequence
  if (ordered.length < 3) {
    for (const item of entries) {
      if (ordered.length >= 3) break;
      if (pickedIndices.has(item.index)) continue;
      pickedIndices.add(item.index);
      const fallbackTag =
        ordered.length === 1 ? '핵심 · 메인' : '정리 · 마무리';
      ordered.push({ ...item, phaseTagKo: fallbackTag });
    }
  }

  return ordered.sort((a, b) => a.index - b.index);
}

function isSafeHomePracticeCandidate(ex: PilatesExercise): boolean {
  if (ex.apparatus !== 'mat') return false;
  if (ex.level !== '1.0') return false;
  if (ex.blockCategory === 'plank') return false;
  if (
    ex.blockCategory !== 'warmup' &&
    ex.blockCategory !== 'cooldown' &&
    ex.blockCategory !== 'bridging' &&
    ex.blockCategory !== 'extension'
  ) {
    return false;
  }
  const propFree = ex.props.length === 0 || ex.props.includes('none');
  if (!propFree) return false;
  const text = `${ex.nameKo} ${ex.nameEn}`;
  if (HOME_UNSAFE_RE.test(text)) return false;
  return true;
}

function selectSafeHomePractice(
  entries: ReadonlyArray<{ step: SequenceStep; exercise: PilatesExercise }>,
  unifiedPool: readonly PilatesExercise[],
): FeedbackHomePractice {
  // 1) Check if the sequence itself already includes a safe beginner mat breathing/mobility movement
  const inSequenceCandidate = entries.find((item) => isSafeHomePracticeCandidate(item.exercise));
  if (inSequenceCandidate) {
    const ex = inSequenceCandidate.exercise;
    return {
      exerciseId: ex.id,
      nameKo: ex.nameKo,
      durationLabelKo: '하루 3분 · 매트/맨몸',
      cueLineKo: cleanCueLine(ex),
      breathPatternKo: cleanBreathPattern(ex),
      tipKo: '오늘 수업에서 익힌 감각을 떠올리며 집에서 6~8회 천천히 반복해 보세요.',
      artworkSrc: resolveArtworkSrc(ex),
      fromCurrentSequence: true,
    };
  }

  // 2) Select optimal safe beginner mat mobility/breathing move from unified 1,752 repertoire
  let best: PilatesExercise | null = null;
  let bestScore = -Infinity;

  for (const candidate of unifiedPool) {
    if (!isSafeHomePracticeCandidate(candidate)) continue;
    let score = 0;
    if (resolveArtworkSrc(candidate)) score += 30;
    if (candidate.blockCategory === 'warmup' || candidate.blockCategory === 'cooldown') score += 18;
    if (HOME_MOBILITY_FRIENDLY_RE.test(`${candidate.nameKo} ${candidate.nameEn}`)) score += 20;
    if (
      candidate.bodyPosition === 'seated' ||
      candidate.bodyPosition === 'quadruped' ||
      candidate.bodyPosition === 'supine'
    ) {
      score += 10;
    }
    if (score > bestScore) {
      bestScore = score;
      best = candidate;
    }
  }

  if (best) {
    return {
      exerciseId: best.id,
      nameKo: best.nameKo,
      durationLabelKo: '하루 3분 · 매트/맨몸',
      cueLineKo: cleanCueLine(best),
      breathPatternKo: cleanBreathPattern(best),
      tipKo: '기구 없이 매트나 거실에서 편안한 호흡으로 6~8회 가볍게 따라 해 보세요.',
      artworkSrc: resolveArtworkSrc(best),
      fromCurrentSequence: false,
    };
  }

  return {
    exerciseId: 'home-gentle-rib-breath',
    nameKo: '편안한 흉곽 호흡 & 어깨 풀기',
    durationLabelKo: '하루 3분 · 매트/맨몸',
    cueLineKo: '갈비뼈가 옆으로 부드럽게 넓어지도록 마시고, 어깨 힘을 빼며 길게 내쉬어요.',
    breathPatternKo: '코로 4초 마시고 입으로 6초 내쉬기',
    tipKo: '잠들기 전 6~8회 천천히 반복하며 호흡을 정돈해 보세요.',
    artworkSrc: null,
    fromCurrentSequence: false,
  };
}

export function buildMemberFeedbackDraft(
  params: BuildMemberFeedbackDraftParams,
): MemberFeedbackDraft {
  const {
    sequenceTitle,
    steps,
    exercisesById,
    apparatus,
    dateLabel = formatDefaultFeedbackDateLabel(),
    unifiedPool = WORLD_PILATES_EXERCISES,
    ratio = '4:5',
  } = params;

  const nonRestEntries: Array<{ step: SequenceStep; exercise: PilatesExercise; index: number }> = [];
  let totalDurationMin = 0;

  for (const step of steps) {
    totalDurationMin += Math.max(0, Number(step.durationMin) || 0);
    if (isRestStep(step)) continue;
    const ex = lookupExercise(exercisesById, step.exerciseId);
    if (!ex) continue;
    nonRestEntries.push({ step, exercise: ex, index: nonRestEntries.length });
  }

  const picked = selectBalancedCoreThree(nonRestEntries);
  const highlights: FeedbackHighlightMove[] = picked.map((item, idx) => ({
    stepId: item.step.stepId,
    exerciseId: item.exercise.id,
    orderNumber: idx + 1,
    phaseTagKo: item.phaseTagKo,
    nameKo: item.exercise.nameKo,
    nameEn: item.exercise.nameEn,
    apparatus: item.exercise.apparatus,
    apparatusLabelKo: APPARATUS_LABELS[item.exercise.apparatus]?.short ?? item.exercise.apparatus,
    bodyPositionLabelKo: PLAIN_POSITION_KO[item.exercise.bodyPosition] ?? item.exercise.bodyPosition,
    artworkSrc: resolveArtworkSrc(item.exercise),
    cueLineKo: cleanCueLine(item.exercise),
    breathPatternKo: cleanBreathPattern(item.exercise),
  }));

  const homePractice = selectSafeHomePractice(nonRestEntries, unifiedPool);

  const defaultPreset = INSTRUCTOR_NOTE_PRESETS[0]!;
  const notePresetId = params.notePresetId ?? defaultPreset.id;
  const presetText =
    notePresetId === 'custom'
      ? defaultPreset.textKo
      : (INSTRUCTOR_NOTE_PRESETS.find((p) => p.id === notePresetId)?.textKo ??
        defaultPreset.textKo);
  const instructorNote =
    params.instructorNote !== undefined ? params.instructorNote : presetText;

  const inspection = inspectSensitiveHealthText(instructorNote);
  const privacyWarningKo = inspection.hasSensitiveData
    ? `개인정보·민감 표현(${inspection.matchedCategories.join(', ')})이 감지되었어요. ${MEMBER_FEEDBACK_PRIVACY_NOTICE_KO}.`
    : null;

  const apparatusLabelKo =
    apparatus === 'mixed' ? '복합 기구' : (APPARATUS_LABELS[apparatus]?.ko ?? apparatus);

  return {
    sequenceTitle: sequenceTitle.trim() || '오늘의 필라테스 수업',
    dateLabel,
    apparatus,
    apparatusLabelKo,
    totalDurationMin: Math.round(totalDurationMin),
    totalExerciseCount: nonRestEntries.length,
    ratio,
    highlights,
    homePractice,
    instructorNote,
    notePresetId,
    privacyWarningKo,
    privacyNoticeKo: MEMBER_FEEDBACK_PRIVACY_NOTICE_KO,
  };
}

export function formatMemberFeedbackKakaoText(draft: MemberFeedbackDraft): string {
  const lines: string[] = [
    `[오늘의 필라테스 수업 정리 · ${draft.dateLabel}]`,
    `${draft.sequenceTitle} (${draft.apparatusLabelKo}${draft.totalDurationMin > 0 ? ` · ${draft.totalDurationMin}분` : ''})`,
    '',
    '■ 오늘의 핵심 동작',
  ];

  if (draft.highlights.length === 0) {
    lines.push('1. 호흡과 중심 정렬을 천천히 익혔어요.');
  } else {
    draft.highlights.forEach((move, idx) => {
      lines.push(`${idx + 1}. ${move.nameKo} (${move.phaseTagKo})`);
      lines.push(`   · 포인트: ${move.cueLineKo}`);
      lines.push(`   · 호흡: ${move.breathPatternKo}`);
    });
  }

  lines.push(
    '',
    `■ 오늘의 3분 홈트 — ${draft.homePractice.nameKo}`,
    `· ${draft.homePractice.cueLineKo}`,
    `· 호흡: ${draft.homePractice.breathPatternKo}`,
    `· 안내: ${draft.homePractice.tipKo}`,
  );

  const trimmedNote = draft.instructorNote.trim();
  if (trimmedNote) {
    lines.push('', '■ 강사 한마디', trimmedNote);
  }

  return lines.join('\n');
}

/**
 * Word-preserving Korean (`keep-all`) text wrapper for HTML5 Canvas 2D rendering.
 * Never splits mid-word unless a single token exceeds maxWidth.
 */
export function wrapKoreanTextLines(
  measureTextWidth: (text: string) => number,
  text: string,
  maxWidth: number,
  maxLines: number,
): string[] {
  const cleaned = text.replace(/\s+/g, ' ').trim();
  if (!cleaned || maxLines <= 0) return [];

  const words = cleaned.split(' ');
  const lines: string[] = [];
  let current = '';

  const pushEllipsized = (line: string) => {
    let trimmed = line.trim();
    while (trimmed.length > 1 && measureTextWidth(`${trimmed}…`) > maxWidth) {
      trimmed = trimmed.slice(0, -1).trim();
    }
    lines.push(`${trimmed}…`);
  };

  for (let i = 0; i < words.length; i += 1) {
    const word = words[i]!;
    const candidate = current ? `${current} ${word}` : word;
    if (measureTextWidth(candidate) <= maxWidth) {
      current = candidate;
      continue;
    }

    if (current) {
      if (lines.length === maxLines - 1) {
        pushEllipsized(current);
        return lines;
      }
      lines.push(current);
    }

    // Handle single token wider than maxWidth
    if (measureTextWidth(word) > maxWidth) {
      let chunk = '';
      for (const ch of word) {
        if (measureTextWidth(chunk + ch) <= maxWidth) {
          chunk += ch;
        } else {
          if (lines.length === maxLines - 1) {
            pushEllipsized(chunk || ch);
            return lines;
          }
          if (chunk) lines.push(chunk);
          chunk = ch;
        }
      }
      current = chunk;
    } else {
      current = word;
    }
  }

  if (current) {
    lines.push(current);
  }

  return lines.slice(0, maxLines);
}

function traceRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  const radius = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function drawRoundedBox(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  fillStyle: string,
  strokeStyle?: string,
  lineWidth = 1.5,
): void {
  traceRoundedRect(ctx, x, y, w, h, r);
  ctx.fillStyle = fillStyle;
  ctx.fill();
  if (strokeStyle) {
    ctx.strokeStyle = strokeStyle;
    ctx.lineWidth = lineWidth;
    ctx.stroke();
  }
}

function drawBotanicalFallbackThumb(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  radius: number,
  badgeCode: string,
  apparatusLabel: string,
  postureLabel: string,
): void {
  drawRoundedBox(ctx, x, y, w, h, radius, '#F2EEE5', 'rgba(31, 68, 53, 0.14)', 1.5);

  ctx.save();
  traceRoundedRect(ctx, x, y, w, h, radius);
  ctx.clip();

  // Soft Calm Atelier botanical arc motif
  ctx.beginPath();
  ctx.arc(x + w * 0.88, y + h * 0.18, Math.min(w, h) * 0.52, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(53, 84, 65, 0.08)';
  ctx.fill();

  ctx.beginPath();
  ctx.arc(x + w * 0.14, y + h * 0.92, Math.min(w, h) * 0.42, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(31, 68, 53, 0.06)';
  ctx.fill();

  ctx.fillStyle = '#1F4435';
  ctx.font = '600 30px "Pretendard Variable", Pretendard, -apple-system, sans-serif';
  ctx.textBaseline = 'top';
  ctx.fillText(badgeCode, x + 16, y + 16);

  ctx.fillStyle = '#355441';
  ctx.font = '500 20px "Pretendard Variable", Pretendard, -apple-system, sans-serif';
  ctx.fillText(apparatusLabel, x + 16, y + h - 54);

  ctx.fillStyle = '#5E554A';
  ctx.font = '400 18px "Pretendard Variable", Pretendard, -apple-system, sans-serif';
  ctx.fillText(postureLabel, x + 16, y + h - 28);

  ctx.restore();
}

function drawCoverImageClipped(
  ctx: CanvasRenderingContext2D,
  img: CanvasImageSource,
  x: number,
  y: number,
  w: number,
  h: number,
  radius: number,
): boolean {
  const maybeImg = img as { naturalWidth?: number; naturalHeight?: number; width?: number; height?: number };
  const imgW = maybeImg.naturalWidth || maybeImg.width || 0;
  const imgH = maybeImg.naturalHeight || maybeImg.height || 0;
  if (imgW <= 0 || imgH <= 0) return false;

  drawRoundedBox(ctx, x, y, w, h, radius, '#F2EEE5');
  ctx.save();
  traceRoundedRect(ctx, x, y, w, h, radius);
  ctx.clip();

  const scale = Math.max(w / imgW, h / imgH);
  const drawW = imgW * scale;
  const drawH = imgH * scale;
  const dx = x + (w - drawW) / 2;
  const dy = y + (h - drawH) / 2;

  ctx.drawImage(img, dx, dy, drawW, drawH);
  ctx.restore();

  traceRoundedRect(ctx, x, y, w, h, radius);
  ctx.strokeStyle = 'rgba(31, 27, 22, 0.08)';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  return true;
}

function defaultLoadImageSafe(src: string, timeoutMs: number): Promise<CanvasImageSource | null> {
  if (typeof Image === 'undefined' || !src) {
    return Promise.resolve(null);
  }
  if (typeof navigator !== 'undefined' && /jsdom/i.test(navigator.userAgent)) {
    return Promise.resolve(null);
  }

  return new Promise((resolve) => {
    let settled = false;
    const img = new Image();
    img.crossOrigin = 'anonymous';

    const finish = (result: CanvasImageSource | null) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timerId);
      resolve(result);
    };

    const timerId = window.setTimeout(() => finish(null), timeoutMs);

    img.onload = () => {
      if (img.naturalWidth > 0 && img.naturalHeight > 0) {
        finish(img);
      } else {
        finish(null);
      }
    };
    img.onerror = () => finish(null);
    img.src = src;
  });
}

export async function renderMemberFeedbackCardToCanvas(
  canvas: HTMLCanvasElement,
  draft: MemberFeedbackDraft,
  options: RenderFeedbackCardOptions = {},
): Promise<RenderFeedbackCardResult> {
  const dim = FEEDBACK_CARD_DIMENSIONS[draft.ratio] ?? FEEDBACK_CARD_DIMENSIONS['4:5'];
  canvas.width = dim.width;
  canvas.height = dim.height;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return {
      width: dim.width,
      height: dim.height,
      ratio: draft.ratio,
      renderedWithFallback: true,
      drawnImageCount: 0,
      fallbackBadgeCount: draft.highlights.length + 1,
    };
  }

  const timeoutMs = options.imageTimeoutMs ?? 2000;
  const loader = options.imageLoader ?? ((src: string) => defaultLoadImageSafe(src, timeoutMs));

  const [highlightImages, homeImage] = await Promise.all([
    Promise.all(
      draft.highlights.map((move) => (move.artworkSrc ? loader(move.artworkSrc) : Promise.resolve(null))),
    ),
    draft.homePractice.artworkSrc ? loader(draft.homePractice.artworkSrc) : Promise.resolve(null),
  ]);

  const isStory = draft.ratio === '9:16';
  const padX = isStory ? 64 : 56;
  const contentW = dim.width - padX * 2;
  const fontFamily = '"Pretendard Variable", Pretendard, -apple-system, BlinkMacSystemFont, sans-serif';
  const measure = (text: string) => ctx.measureText(text).width;

  let drawnImageCount = 0;
  let fallbackBadgeCount = 0;

  // 1) Calm Atelier Warm Ivory Background (#FAF8F3)
  ctx.fillStyle = '#FAF8F3';
  ctx.fillRect(0, 0, dim.width, dim.height);

  // Subtle top botanical accent rule
  ctx.fillStyle = '#1F4435';
  ctx.fillRect(0, 0, dim.width, isStory ? 12 : 10);

  // 2) Header Section
  let cursorY = isStory ? 112 : 52;
  ctx.textBaseline = 'top';

  ctx.fillStyle = '#1F4435';
  ctx.font = `600 22px ${fontFamily}`;
  ctx.fillText('Pilates Flow Atelier · 오늘의 수업 정리', padX, cursorY + 8);

  // Date badge on right
  ctx.font = `500 21px ${fontFamily}`;
  const dateTextW = measure(draft.dateLabel);
  const datePillW = dateTextW + 32;
  drawRoundedBox(ctx, dim.width - padX - datePillW, cursorY, datePillW, 40, 10, '#EFE9DF');
  ctx.fillStyle = '#3D342B';
  ctx.fillText(draft.dateLabel, dim.width - padX - datePillW + 16, cursorY + 9);

  cursorY += isStory ? 62 : 54;

  // Class Title
  ctx.fillStyle = '#1F1B16';
  ctx.font = `600 ${isStory ? 44 : 40}px ${fontFamily}`;
  const titleLines = wrapKoreanTextLines(measure, draft.sequenceTitle, contentW, 2);
  for (const line of titleLines) {
    ctx.fillText(line, padX, cursorY);
    cursorY += isStory ? 54 : 48;
  }

  // Class Meta Line
  cursorY += 4;
  ctx.fillStyle = '#5E554A';
  ctx.font = `500 23px ${fontFamily}`;
  const metaParts = [
    draft.apparatusLabelKo,
    draft.totalDurationMin > 0 ? `${draft.totalDurationMin}분 수업` : null,
    draft.totalExerciseCount > 0 ? `총 ${draft.totalExerciseCount}동작 구성` : null,
  ].filter(Boolean);
  ctx.fillText(metaParts.join('  ·  '), padX, cursorY);

  cursorY += isStory ? 48 : 38;
  ctx.fillStyle = 'rgba(31, 27, 22, 0.1)';
  ctx.fillRect(padX, cursorY, contentW, 1.5);
  cursorY += isStory ? 36 : 24;

  // 3) Core 3 Highlights Section
  ctx.fillStyle = '#1F4435';
  ctx.font = `600 25px ${fontFamily}`;
  ctx.fillText(`오늘의 핵심 동작 (${draft.highlights.length}가지)`, padX, cursorY);
  cursorY += isStory ? 44 : 36;

  const cardHeight = isStory ? 214 : 170;
  const cardGap = isStory ? 24 : 16;
  const thumbW = isStory ? 244 : 212;
  const thumbH = cardHeight - 32;

  draft.highlights.forEach((move, idx) => {
    const cardY = cursorY + idx * (cardHeight + cardGap);
    drawRoundedBox(ctx, padX, cardY, contentW, cardHeight, 20, '#FFFFFF', 'rgba(31, 27, 22, 0.09)', 1.5);

    const thumbX = padX + 16;
    const thumbY = cardY + 16;
    const loadedImg = highlightImages[idx];
    const drewImage = loadedImg
      ? drawCoverImageClipped(ctx, loadedImg, thumbX, thumbY, thumbW, thumbH, 14)
      : false;

    if (drewImage) {
      drawnImageCount += 1;
    } else {
      fallbackBadgeCount += 1;
      drawBotanicalFallbackThumb(
        ctx,
        thumbX,
        thumbY,
        thumbW,
        thumbH,
        14,
        `0${move.orderNumber}`,
        move.apparatusLabelKo,
        move.bodyPositionLabelKo,
      );
    }

    const textX = thumbX + thumbW + 22;
    const textW = padX + contentW - textX - 20;
    let ty = cardY + 18;

    // Phase tag chip
    ctx.font = `500 19px ${fontFamily}`;
    const tagW = measure(move.phaseTagKo) + 22;
    drawRoundedBox(ctx, textX, ty, tagW, 30, 8, '#EEF4EF');
    ctx.fillStyle = '#1F4435';
    ctx.fillText(move.phaseTagKo, textX + 11, ty + 5);

    ctx.fillStyle = '#6B6156';
    ctx.font = `400 19px ${fontFamily}`;
    ctx.fillText(`${move.apparatusLabelKo} · ${move.bodyPositionLabelKo}`, textX + tagW + 12, ty + 5);

    ty += isStory ? 42 : 36;

    // Exercise Korean Name
    ctx.fillStyle = '#1F1B16';
    ctx.font = `600 ${isStory ? 30 : 27}px ${fontFamily}`;
    const nameLines = wrapKoreanTextLines(measure, move.nameKo, textW, 1);
    ctx.fillText(nameLines[0] ?? move.nameKo, textX, ty);
    ty += isStory ? 42 : 34;

    // 1-line Core Cue
    ctx.fillStyle = '#3B342C';
    ctx.font = `400 ${isStory ? 22 : 20}px ${fontFamily}`;
    const cueLines = wrapKoreanTextLines(measure, move.cueLineKo, textW, 2);
    for (const line of cueLines) {
      ctx.fillText(line, textX, ty);
      ty += isStory ? 30 : 26;
    }

    // Breath rhythm at bottom of card
    ctx.fillStyle = '#355441';
    ctx.font = `500 ${isStory ? 20 : 18}px ${fontFamily}`;
    const breathText = wrapKoreanTextLines(measure, `호흡 · ${move.breathPatternKo}`, textW, 1)[0] ?? '';
    ctx.fillText(breathText, textX, cardY + cardHeight - (isStory ? 36 : 30));
  });

  cursorY += Math.max(1, draft.highlights.length) * cardHeight + Math.max(0, draft.highlights.length - 1) * cardGap;
  cursorY += isStory ? 36 : 22;

  // 4) Today's 3-Minute Home Practice Section
  const homeH = isStory ? 268 : 206;
  const homeThumbW = isStory ? 220 : 184;
  const homeThumbH = homeH - 36;

  drawRoundedBox(ctx, padX, cursorY, contentW, homeH, 20, '#F3EFE6', 'rgba(31, 68, 53, 0.14)', 1.5);

  const homeThumbX = padX + 18;
  const homeThumbY = cursorY + 18;
  const drewHomeImg = homeImage
    ? drawCoverImageClipped(ctx, homeImage, homeThumbX, homeThumbY, homeThumbW, homeThumbH, 14)
    : false;
  if (drewHomeImg) {
    drawnImageCount += 1;
  } else {
    fallbackBadgeCount += 1;
    drawBotanicalFallbackThumb(
      ctx,
      homeThumbX,
      homeThumbY,
      homeThumbW,
      homeThumbH,
      14,
      '3분',
      '매트 홈트',
      '집에서 안전하게',
    );
  }

  const homeTextX = homeThumbX + homeThumbW + 22;
  const homeTextW = padX + contentW - homeTextX - 20;
  let hy = cursorY + 20;

  ctx.font = `600 19px ${fontFamily}`;
  const homeTagText = `오늘의 3분 홈트 · ${draft.homePractice.durationLabelKo}`;
  const homeTagW = Math.min(homeTextW, measure(homeTagText) + 24);
  drawRoundedBox(ctx, homeTextX, hy, homeTagW, 32, 8, '#1F4435');
  ctx.fillStyle = '#FAF8F3';
  ctx.fillText(homeTagText, homeTextX + 12, hy + 6);

  hy += isStory ? 46 : 40;
  ctx.fillStyle = '#1F1B16';
  ctx.font = `600 ${isStory ? 30 : 26}px ${fontFamily}`;
  const homeName = wrapKoreanTextLines(measure, draft.homePractice.nameKo, homeTextW, 1)[0] ?? draft.homePractice.nameKo;
  ctx.fillText(homeName, homeTextX, hy);

  hy += isStory ? 44 : 36;
  ctx.fillStyle = '#3B342C';
  ctx.font = `400 ${isStory ? 22 : 20}px ${fontFamily}`;
  const homeCueLines = wrapKoreanTextLines(measure, draft.homePractice.cueLineKo, homeTextW, 2);
  for (const line of homeCueLines) {
    ctx.fillText(line, homeTextX, hy);
    hy += isStory ? 31 : 27;
  }

  ctx.fillStyle = '#1F4435';
  ctx.font = `500 ${isStory ? 20 : 18}px ${fontFamily}`;
  const homeTip = wrapKoreanTextLines(measure, draft.homePractice.tipKo, homeTextW, 1)[0] ?? '';
  ctx.fillText(homeTip, homeTextX, cursorY + homeH - (isStory ? 40 : 32));

  cursorY += homeH + (isStory ? 32 : 20);

  // 5) Instructor Note Section (Botanical Forest Surface #1F4435)
  const noteH = isStory ? 256 : 168;
  drawRoundedBox(ctx, padX, cursorY, contentW, noteH, 20, '#1F4435');

  ctx.fillStyle = '#CFE0D5';
  ctx.font = `500 20px ${fontFamily}`;
  ctx.fillText('강사 한마디', padX + 28, cursorY + 22);

  ctx.fillStyle = '#FAF8F3';
  ctx.font = `400 ${isStory ? 27 : 23}px ${fontFamily}`;
  const noteText =
    draft.instructorNote.trim() || INSTRUCTOR_NOTE_PRESETS[0]!.textKo;
  const noteLines = wrapKoreanTextLines(
    measure,
    noteText,
    contentW - 56,
    isStory ? 4 : 3,
  );
  let ny = cursorY + (isStory ? 64 : 54);
  for (const line of noteLines) {
    ctx.fillText(line, padX + 28, ny);
    ny += isStory ? 40 : 33;
  }

  // 6) Calm Atelier Footer
  const footerY = dim.height - (isStory ? 96 : 42);
  ctx.fillStyle = '#7A7065';
  ctx.font = `400 18px ${fontFamily}`;
  ctx.fillText(
    'Pilates Flow Atelier · 내 몸의 속도와 호흡에 맞춰 편안하게 이어 가세요',
    padX,
    footerY,
  );

  return {
    width: dim.width,
    height: dim.height,
    ratio: draft.ratio,
    renderedWithFallback: false,
    drawnImageCount,
    fallbackBadgeCount,
  };
}

function buildFeedbackFileName(draft: MemberFeedbackDraft): string {
  const safeDate = draft.dateLabel.replace(/[^\d]/g, '').slice(0, 8) || 'today';
  const ratioSlug = draft.ratio === '9:16' ? 'story-9x16' : 'feed-4x5';
  return `pilates-feedback-card-${safeDate}-${ratioSlug}.png`;
}

function dataUrlToPngBlob(dataUrl: string): Blob | null {
  const parts = dataUrl.split(',');
  if (parts.length < 2 || !parts[1]) return null;
  try {
    const binary = atob(parts[1]);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
      bytes[i] = binary.charCodeAt(i);
    }
    return new Blob([bytes], { type: 'image/png' });
  } catch {
    return null;
  }
}

export async function exportMemberFeedbackCardPng(
  draft: MemberFeedbackDraft,
  options: RenderFeedbackCardOptions & { readonly canvas?: HTMLCanvasElement } = {},
): Promise<ExportFeedbackCardPngResult> {
  const canvas = options.canvas ?? document.createElement('canvas');
  const renderResult = await renderMemberFeedbackCardToCanvas(canvas, draft, options);
  const fileName = buildFeedbackFileName(draft);

  let blob: Blob | null = null;
  if (!renderResult.renderedWithFallback && typeof canvas.toBlob === 'function') {
    blob = await new Promise<Blob | null>((resolve) => {
      let settled = false;
      const done = (out: Blob | null) => {
        if (settled) return;
        settled = true;
        window.clearTimeout(timerId);
        resolve(out);
      };
      const timerId = window.setTimeout(() => done(null), 1500);
      try {
        canvas.toBlob((out) => done(out), 'image/png');
      } catch {
        done(null);
      }
    });
  }

  if (!renderResult.renderedWithFallback && !blob && typeof canvas.toDataURL === 'function') {
    try {
      const dataUrl = canvas.toDataURL('image/png');
      blob = dataUrlToPngBlob(dataUrl);
    } catch {
      blob = null;
    }
  }

  const finalBlob = blob ?? new Blob([MINIMAL_FALLBACK_PNG_BYTES], { type: 'image/png' });

  return {
    blob: finalBlob,
    fileName,
    width: renderResult.width,
    height: renderResult.height,
    ratio: draft.ratio,
    mimeType: 'image/png',
    renderResult,
  };
}

export function triggerFeedbackCardDownload(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 1000);
}

export async function shareOrDownloadFeedbackCard(
  draft: MemberFeedbackDraft,
  options: RenderFeedbackCardOptions = {},
): Promise<ShareFeedbackCardResult> {
  const exported = await exportMemberFeedbackCardPng(draft, options);
  const shareText = formatMemberFeedbackKakaoText(draft);

  const nav = navigator as Navigator & {
    canShare?: (data?: ShareData) => boolean;
    share?: (data?: ShareData) => Promise<void>;
  };

  if (typeof nav.share === 'function' && typeof File !== 'undefined') {
    const file = new File([exported.blob], exported.fileName, { type: 'image/png' });
    const payload: ShareData = {
      title: `${draft.sequenceTitle} · 오늘의 필라테스 피드백 카드`,
      text: shareText,
      files: [file],
    };

    const canShareFiles = typeof nav.canShare === 'function' ? nav.canShare(payload) : true;
    if (canShareFiles) {
      try {
        await nav.share(payload);
        return {
          ok: true,
          method: 'web-share',
          fileName: exported.fileName,
          messageKo: '회원 피드백 카드를 바로 공유했어요.',
        };
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') {
          return {
            ok: true,
            method: 'cancelled',
            fileName: exported.fileName,
            messageKo: '공유 창을 닫았어요.',
          };
        }
        // Fall through to PNG download fallback
      }
    }
  }

  triggerFeedbackCardDownload(exported.blob, exported.fileName);
  return {
    ok: true,
    method: 'download-fallback',
    fileName: exported.fileName,
    messageKo: `기기 공유가 지원되지 않아 PNG 이미지(${exported.fileName})로 바로 저장했어요.`,
  };
}
