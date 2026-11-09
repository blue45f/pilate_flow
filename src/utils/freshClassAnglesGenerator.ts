import type {
  AutoGenerateCriteria,
  PilatesExercise,
  SequenceStep,
} from '../types/pilates';
import { isRestStep } from './sequenceEngine';

export type FreshIdeaAngleId =
  | 'contrarian'
  | 'personal-story'
  | 'data-evidence'
  | 'playbook'
  | 'what-they-missed';

export interface FreshClassAngleIdea {
  id: FreshIdeaAngleId;
  badgeKo: string;
  angleTitleKo: string;
  suggestedSubtitleKo: string;
  teachingHookKo: string;
}

/**
 * Generates 5 distinct creative class concept & teaching angles
 * (Contrarian, Personal Story, Data/Evidence, Playbook, What They Missed)
 * from the current sequence and criteria (`@generate-fresh-ideas` integration).
 */
export function generateFreshClassAngles(
  steps: readonly SequenceStep[],
  exercisesById: ReadonlyMap<string, PilatesExercise>,
  criteria: Pick<AutoGenerateCriteria, 'apparatus' | 'level' | 'focusPreset' | 'targetMinutes'>,
): FreshClassAngleIdea[] {
  const nonRest = steps.filter((st) => !isRestStep(st));
  const firstEx = nonRest[0] ? exercisesById.get(nonRest[0].exerciseId) : undefined;
  const peakEx =
    nonRest[Math.floor(nonRest.length / 2)]
      ? exercisesById.get(nonRest[Math.floor(nonRest.length / 2)]!.exerciseId)
      : firstEx;

  const firstTitle = firstEx?.nameKo ?? '호흡 정렬';
  const peakTitle = peakEx?.nameKo ?? '코어 통합';
  const minutes = criteria.targetMinutes || 50;

  return [
    {
      id: 'contrarian',
      badgeKo: '1 · 역발상 (Contrarian)',
      angleTitleKo: '강한 스프링보다 가벼운 저항이 코어를 더 깊게 깨우는 이유',
      suggestedSubtitleKo: `저항을 덜어내어 심부 코어 제어력을 극대화하는 ${minutes}분 컨트롤 플로우`,
      teachingHookKo: `오늘 ‘${peakTitle}’ 구간에서는 스프링에 기대지 않고 캐리지 복귀 마지막 5cm를 스스로 통제하는 데 집중합니다.`,
    },
    {
      id: 'personal-story',
      badgeKo: '2 · 현장 공감 (Personal Story)',
      angleTitleKo: '수업 직후 걸음걸이가 가벼워지는 첫 10분 골반 리셋 루틴',
      suggestedSubtitleKo: `굳어 있던 흉곽과 골반의 리듬을 되찾아주는 ${minutes}분 리셋 시퀀스`,
      teachingHookKo: `‘${firstTitle}’로 시작해 하루 종일 긴장했던 목·어깨 힘을 빼고 발바닥 지지 감각부터 깨워봅니다.`,
    },
    {
      id: 'data-evidence',
      badgeKo: '3 · 생체역학 근거 (Data / Evidence)',
      angleTitleKo: `척추 4대 평면(굴곡·신전·측굴·회전) 균형과 ${nonRest.length}개 동작의 호흡 비례 설계`,
      suggestedSubtitleKo: `척추 다평면 분절과 들숨·날숨 템포 비례를 결합한 ${minutes}분 바이오메카닉 플로우`,
      teachingHookKo: `굴곡과 신전 동작 사이마다 흉곽 측면 확장 호흡을 배치해 요추 부하를 분산하고 가동 범위를 넓힙니다.`,
    },
    {
      id: 'playbook',
      badgeKo: '4 · 실전 플레이북 (Playbook)',
      angleTitleKo: `준비(${firstTitle}) → 정점(${peakTitle}) → 이완으로 이어지는 3단계 공식`,
      suggestedSubtitleKo: `정렬 인지 · 주동근 강화 · 전신 통합 3단계로 완성하는 ${minutes}분 표준 플레이북`,
      teachingHookKo: `1단계에서 골반 중립을 세팅하고, 2단계 ‘${peakTitle}’에서 협응력을 끌어올린 뒤 3단계에서 호흡을 정리합니다.`,
    },
    {
      id: 'what-they-missed',
      badgeKo: '5 · 히든 디테일 (What They Missed)',
      angleTitleKo: '동작과 동작 사이 15초 전환 구간이 수업 몰입도를 결정한다',
      suggestedSubtitleKo: `기구 전환과 체위 연결까지 하나의 흐름으로 이어지는 ${minutes}분 심리스 아틀리에`,
      teachingHookKo: `동작이 끝나는 순간부터 다음 동작의 시작 자세가 됩니다. 복귀 구간의 신장성 수축(Eccentric Control)을 끝까지 유지하세요.`,
    },
  ];
}
