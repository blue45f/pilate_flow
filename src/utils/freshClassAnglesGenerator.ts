import { APPARATUS_LABELS, SPINAL_PLANE_LABELS } from '../data/pilatesCatalog';
import type {
  AutoGenerateCriteria,
  PilatesExercise,
  SequenceStep,
  SpinalPlane,
} from '../types/pilates';
import { formatSecondsToMMSS, getSequenceDurations, getStepTiming, isRestStep } from './sequenceEngine';

export type FreshIdeaAngleId =
  | 'contrarian'
  | 'personal-story'
  | 'data-evidence'
  | 'playbook'
  | 'what-they-missed';

export type FreshIdeaChannelId =
  | 'class-intro-script'
  | 'member-notice'
  | 'studio-note';

export interface FreshClassStoryStructure {
  readonly setupKo: string;
  readonly frictionKo: string;
  readonly lessonKo: string;
}

export interface FreshClassAngleIdea {
  readonly id: FreshIdeaAngleId;
  readonly lensEmoji: string;
  readonly lensLabelEn: string;
  readonly badgeKo: string;
  readonly angleTitleKo: string;
  readonly angleExpansionKo: string;
  readonly suggestedTitleKo: string;
  readonly suggestedSubtitleKo: string;
  readonly teachingHookKo: string;
  readonly storyStructure?: FreshClassStoryStructure;
  readonly verifiedSourceMetricsKo?: readonly string[];
  readonly evidencePlaceholdersKo?: readonly string[];
  readonly playbookStepsKo?: readonly string[];
}

export interface FreshAngleDraftExpansion {
  readonly angleId: FreshIdeaAngleId;
  readonly channelId: FreshIdeaChannelId;
  readonly channelLabelKo: string;
  readonly headlineKo: string;
  readonly bodyKo: string;
}

const ORDERED_PLANES: readonly SpinalPlane[] = [
  'flexion',
  'extension',
  'lateral',
  'rotation',
  'neutral',
];

/**
 * Generates 5 distinct creative class concept & teaching angles
 * (`🔥 Contrarian Take`, `📖 Personal Story Hook`, `📊 Data / Evidence Angle`,
 * `✅ Practical Playbook`, `🎯 What They Missed`) from the current sequence and criteria
 * in full compliance with the `@generate-fresh-ideas` 5-lens specification.
 */
export function generateFreshClassAngles(
  steps: readonly SequenceStep[],
  exercisesById: ReadonlyMap<string, PilatesExercise>,
  criteria: Pick<AutoGenerateCriteria, 'apparatus' | 'level' | 'focusPreset' | 'targetMinutes'>,
): FreshClassAngleIdea[] {
  const nonRest = steps.filter((st) => !isRestStep(st));
  const restSteps = steps.filter((st) => isRestStep(st));
  const firstStep = nonRest[0];
  const peakStep = nonRest[Math.floor(nonRest.length / 2)] ?? firstStep;
  const lastStep = nonRest.at(-1) ?? firstStep;

  const firstEx = firstStep ? exercisesById.get(firstStep.exerciseId) : undefined;
  const peakEx = peakStep ? exercisesById.get(peakStep.exerciseId) : firstEx;
  const lastEx = lastStep ? exercisesById.get(lastStep.exerciseId) : firstEx;

  const firstTitle = firstEx?.nameKo ?? '호흡 정렬';
  const peakTitle = peakEx?.nameKo ?? '코어 통합';
  const lastTitle = lastEx?.nameKo ?? '이완 정리';
  const minutes = criteria.targetMinutes || 50;
  const apparatusKo =
    criteria.apparatus === 'mixed'
      ? '복합 기구'
      : (APPARATUS_LABELS[criteria.apparatus]?.ko ?? '필라테스 기구');

  const durations = getSequenceDurations([...steps]);
  const totalFormatted = formatSecondsToMMSS(durations.totalSec);

  let totalTransitionSec = 0;
  let unilateralCount = 0;
  const planeCounts: Record<SpinalPlane, number> = {
    flexion: 0,
    extension: 0,
    lateral: 0,
    rotation: 0,
    neutral: 0,
  };

  for (const step of nonRest) {
    const ex = exercisesById.get(step.exerciseId);
    const timing = getStepTiming(step, ex);
    totalTransitionSec += timing.transitionSec;
    if (
      ex?.isUnilateral ||
      step.sideMode === 'left-then-right' ||
      step.sideMode === 'right-then-left' ||
      step.sideMode === 'left' ||
      step.sideMode === 'right'
    ) {
      unilateralCount += 1;
    }
    const planes = ex?.spinalPlanes?.length ? ex.spinalPlanes : (['neutral'] as const);
    for (const p of planes) {
      planeCounts[p] = (planeCounts[p] ?? 0) + 1;
    }
  }

  const coveredPlanes = ORDERED_PLANES.filter((p) => p !== 'neutral' && planeCounts[p] > 0);
  const coveredPlanesKo =
    coveredPlanes.length > 0
      ? coveredPlanes.map((p) => SPINAL_PLANE_LABELS[p].ko.split(' ')[0]).join('·')
      : '중립 정렬';

  const verifiedMetrics: string[] = [
    `수행 동작 ${nonRest.length}개 · 휴식 ${restSteps.length}개 (총 계획 ${totalFormatted} / 목표 ${minutes}분)`,
    `척추 움직임 면 포함: ${coveredPlanesKo} (${coveredPlanes.length}/4대 분절 면) · 단측성(좌/우) 동작 ${unilateralCount}개`,
    `총 전환(Transition) 배정 시간: ${totalTransitionSec}초`,
  ];

  const evidencePlaceholders: string[] = [
    '[수업 전후 회원 주관적 운동자각도(RPE 1~10) 변화 기록]',
    '[좌·우 단측성 동작 수행 시 골반 흔들림 관찰 메모]',
  ];

  return [
    {
      id: 'contrarian',
      lensEmoji: '🔥',
      lensLabelEn: 'CONTRARIAN TAKE',
      badgeKo: '1 · 🔥 역발상 (Contrarian)',
      angleTitleKo: '강한 스프링보다 가벼운 저항이 코어를 더 깊게 깨우는 이유',
      angleExpansionKo: `많은 수업이 운동 강도를 높이기 위해 스프링 장력을 추가하지만, 실제로는 저항을 줄였을 때 기구의 반동 의존도가 사라지며 심부 안정근이 더 정밀하게 동원됩니다. 오늘 ${apparatusKo} 시퀀스는 큰 힘을 쓰는 대신 ‘${peakTitle}’의 복귀 구간 마지막 5cm를 흔들림 없이 통제하는 역발상 컨트롤에 집중합니다.`,
      suggestedTitleKo: `${apparatusKo} 역발상 코어 컨트롤 ${minutes}분`,
      suggestedSubtitleKo: `저항을 덜어내어 심부 코어 제어력을 극대화하는 ${minutes}분 컨트롤 플로우`,
      teachingHookKo: `오늘 ‘${peakTitle}’ 구간에서는 스프링에 기대지 않고 캐리지 복귀 마지막 5cm를 스스로 통제하는 데 집중합니다.`,
    },
    {
      id: 'personal-story',
      lensEmoji: '📖',
      lensLabelEn: 'PERSONAL STORY HOOK',
      badgeKo: '2 · 📖 현장 공감 (Personal Story)',
      angleTitleKo: '수업 직후 걸음걸이가 가벼워지는 첫 10분 골반 리셋 루틴',
      angleExpansionKo: `하루 종일 앉아 있거나 긴장한 상태로 스튜디오에 들어온 날, 처음부터 고난도 동작을 밀어붙이면 오히려 승모근과 허리만 더 뻐근해졌던 경험에서 출발한 시퀀스입니다. 첫 10분 동안 ‘${firstTitle}’로 흉곽과 골반의 긴장을 먼저 풀어주었을 때 본운동 ‘${peakTitle}’의 가동 범위가 어떻게 달라지는지 체감하게 돕습니다.`,
      suggestedTitleKo: `첫 10분 골반·흉곽 리셋 ${apparatusKo} 플로우`,
      suggestedSubtitleKo: `굳어 있던 흉곽과 골반의 리듬을 되찾아주는 ${minutes}분 리셋 시퀀스`,
      teachingHookKo: `‘${firstTitle}’로 시작해 하루 종일 긴장했던 목·어깨 힘을 빼고 발바닥 지지 감각부터 깨워봅니다.`,
      storyStructure: {
        setupKo: `퇴근 직후 목·어깨와 고관절이 굳은 채 ${apparatusKo}에 누워 첫 동작부터 버거워하던 현장 상황`,
        frictionKo: `워밍업 없이 코어 강도만 높였을 때 표재근 과긴장으로 호흡이 얕아지던 병목 구간`,
        lessonKo: `‘${firstTitle}’로 흉곽 측면 호흡과 골반 중립을 먼저 리셋한 뒤 ‘${peakTitle}’로 연결해 움직임이 한결 가벼워진 전환점`,
      },
    },
    {
      id: 'data-evidence',
      lensEmoji: '📊',
      lensLabelEn: 'DATA / EVIDENCE ANGLE',
      badgeKo: '3 · 📊 생체역학 근거 (Data / Evidence)',
      angleTitleKo: `척추 4대 평면(${coveredPlanesKo}) 균형과 ${nonRest.length}개 동작(${totalFormatted})의 호흡·시간 비례 설계`,
      angleExpansionKo: `주관적인 느낌 대신 현재 시퀀스에 실제로 배정된 ${nonRest.length}개 수행 동작과 총 ${totalFormatted}의 시간·척추 면(${coveredPlanesKo}) 분포 데이터를 근거로 수업 흐름을 설명합니다. 단일 평면 반복으로 인한 피로를 막기 위해 다평면 분절과 전환 시간(${totalTransitionSec}초)을 계산해 배치했으며, 수업 후 [수업 전후 회원 주관적 운동자각도(RPE 1~10) 변화 기록]을 대조해 다음 주차에 반영합니다.`,
      suggestedTitleKo: `다평면(${coveredPlanesKo}) 밸런스 ${apparatusKo} ${minutes}분`,
      suggestedSubtitleKo: `척추 다평면 분절과 들숨·날숨 템포 비례를 결합한 ${minutes}분 바이오메카닉 플로우`,
      teachingHookKo: `굴곡과 신전 동작 사이마다 흉곽 측면 확장 호흡을 배치해 요추 부하를 분산하고 가동 범위를 넓힙니다.`,
      verifiedSourceMetricsKo: verifiedMetrics,
      evidencePlaceholdersKo: evidencePlaceholders,
    },
    {
      id: 'playbook',
      lensEmoji: '✅',
      lensLabelEn: 'PRACTICAL PLAYBOOK',
      badgeKo: '4 · ✅ 실전 플레이북 (Playbook)',
      angleTitleKo: `준비(${firstTitle}) → 정점(${peakTitle}) → 이완(${lastTitle})으로 이어지는 4단계 실전 공식`,
      angleExpansionKo: `복잡한 이론을 덜어내고 오늘 수업에서 강사와 회원이 바로 실행할 수 있는 4단계 체크리스트로 구조화했습니다. 각 단계마다 확인해야 할 단일 큐 포인트를 명확히 제시해 초보자도 길을 잃지 않고 ${minutes}분 흐름을 완주할 수 있습니다.`,
      suggestedTitleKo: `4단계 실전 플레이북 · ${peakTitle} 중심`,
      suggestedSubtitleKo: `정렬 인지 · 주동근 강화 · 전신 통합 3단계로 완성하는 ${minutes}분 표준 플레이북`,
      teachingHookKo: `1단계에서 골반 중립을 세팅하고, 2단계 ‘${peakTitle}’에서 협응력을 끌어올린 뒤 3단계에서 호흡을 정리합니다.`,
      playbookStepsKo: [
        `1단계 (정렬·호흡 세팅): ‘${firstTitle}’에서 갈비뼈 하단과 골반 중립 간격을 맞추고 날숨 길이를 일정하게 세팅합니다.`,
        `2단계 (주동근·사선 연결): 본운동 진입 전 견갑대 안정화를 확인하고 코어 선활성화를 유도합니다.`,
        `3단계 (피크 협응 제어): ‘${peakTitle}’에서 원심성(돌아오는 구간) 템포를 3카운트로 유지하며 좌·우 대칭을 점검합니다.`,
        `4단계 (통합·이완 정리): ‘${lastTitle}’로 척추 분절을 늘려주며 수업 시작 전과 달라진 신체 지지 감각을 비교합니다.`,
      ],
    },
    {
      id: 'what-they-missed',
      lensEmoji: '🎯',
      lensLabelEn: 'WHAT THEY MISSED',
      badgeKo: '5 · 🎯 히든 디테일 (What They Missed)',
      angleTitleKo: `동작과 동작 사이 전환 구간(${totalTransitionSec}초)이 수업 몰입도를 결정한다`,
      angleExpansionKo: `대부분의 시퀀스 계획은 개별 동작의 횟수와 자세에만 주목하지만, 실제 현장 만족도와 에너지 흐름을 좌우하는 숨은 변수는 동작 사이 총 ${totalTransitionSec}초의 전환(Transition) 동선입니다. 스프링을 바꾸거나 체위를 전환하는 시간 자체를 다음 동작의 준비 호흡으로 연결하면 수업의 끊김이 사라집니다.`,
      suggestedTitleKo: `심리스 전환 · ${apparatusKo} 몰입 플로우`,
      suggestedSubtitleKo: `기구 전환과 체위 연결까지 하나의 흐름으로 이어지는 ${minutes}분 심리스 아틀리에`,
      teachingHookKo: `동작이 끝나는 순간부터 다음 동작의 시작 자세가 됩니다. 복귀 구간의 신장성 수축(Eccentric Control)을 끝까지 유지하세요.`,
    },
  ];
}

/**
 * Mode B (Immediate Draft Expansion): expands a selected creative angle (`1–5`)
 * into a complete, copy-ready Korean draft tailored to the chosen studio channel.
 */
export function expandFreshClassAngleDraft(
  angle: FreshClassAngleIdea,
  channelId: FreshIdeaChannelId,
  context: {
    readonly sequenceTitle: string;
    readonly targetMinutes: number;
    readonly exerciseCount: number;
  },
): FreshAngleDraftExpansion {
  const baseTitle = context.sequenceTitle || angle.suggestedTitleKo;

  if (channelId === 'class-intro-script') {
    const extraDetail =
      angle.storyStructure
        ? `\n[스토리 연결] ${angle.storyStructure.setupKo} → ${angle.storyStructure.lessonKo}`
        : angle.playbookStepsKo
          ? `\n[진행 순서]\n${angle.playbookStepsKo.map((s) => `• ${s}`).join('\n')}`
          : angle.verifiedSourceMetricsKo
            ? `\n[시퀀스 구성 근거] ${angle.verifiedSourceMetricsKo.join(' / ')}`
            : '';

    return {
      angleId: angle.id,
      channelId,
      channelLabelKo: '수업 오프닝 1분 티칭 멘트',
      headlineKo: `[오프닝 멘트] ${angle.angleTitleKo}`,
      bodyKo: `안녕하세요 여러분, 오늘 ${context.targetMinutes}분 수업 ‘${baseTitle}’의 핵심 테마는 "${angle.suggestedSubtitleKo}"입니다.\n\n${angle.angleExpansionKo}\n\n오늘 수업 중 특히 기억하실 한 가지는 이것입니다: "${angle.teachingHookKo}"${extraDetail}`,
    };
  }

  if (channelId === 'member-notice') {
    const bulletBlock =
      angle.playbookStepsKo
        ? angle.playbookStepsKo.map((s) => `- ${s}`).join('\n')
        : `- 핵심 테마: ${angle.suggestedSubtitleKo}\n- 집중 포인트: ${angle.teachingHookKo}\n- 구성 규모: 총 ${context.exerciseCount}개 동작 (${context.targetMinutes}분 진행)`;

    return {
      angleId: angle.id,
      channelId,
      channelLabelKo: '회원 공지·클래스 안내문',
      headlineKo: `[클래스 안내] ${angle.suggestedTitleKo} — ${angle.angleTitleKo}`,
      bodyKo: `💡 이번 시간 클래스 컨셉 안내\n\n• 테마: ${angle.angleTitleKo}\n• 부제: ${angle.suggestedSubtitleKo}\n\n${angle.angleExpansionKo}\n\n[오늘의 수업 체크포인트]\n${bulletBlock}`,
    };
  }

  const metricsLine = angle.verifiedSourceMetricsKo
    ? `\n• 시퀀스 실측 지표: ${angle.verifiedSourceMetricsKo.join(' | ')}`
    : '';
  const placeholderLine = angle.evidencePlaceholdersKo
    ? `\n• 수업 후 기록할 관찰 항목: ${angle.evidencePlaceholdersKo.join(' , ')}`
    : '';

  return {
    angleId: angle.id,
    channelId: 'studio-note',
    channelLabelKo: '강사 커리큘럼 기획 노트',
    headlineKo: `[강사 기획 노트 · ${angle.lensEmoji} ${angle.lensLabelEn}] ${angle.angleTitleKo}`,
    bodyKo: `■ 선정 렌즈: ${angle.badgeKo}\n■ 제안 제목: ${angle.suggestedTitleKo}\n■ 제안 부제: ${angle.suggestedSubtitleKo}\n■ 핵심 논지: ${angle.angleExpansionKo}\n■ 대표 티칭 훅: ${angle.teachingHookKo}${metricsLine}${placeholderLine}`,
  };
}
