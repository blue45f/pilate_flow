import { EXPANDED_MOVEMENTS, getExpandedMovementSource } from './expandedMovements';
import type { PilatesExercise } from '../types/pilates';

export interface ExpandedMovementVisualBinding {
  readonly exerciseId: string;
  readonly nativeMotionAvailable: boolean;
  readonly presentation: 'creator-video-only';
  readonly sourceUrl?: string;
  readonly videoId?: string;
  readonly reasonKo: string;
  readonly missingPoseFeatureKo: string;
  readonly checkedAt: '2026-11-13';
}

/**
 * A body-position/name match is not an exercise-specific motion binding. The
 * source-linked expansion has exact tutorial links, but no native phase model
 * has yet been checked for the named action and apparatus contacts. Keep these
 * decisions explicit instead of silently reusing one of the broad fallback rigs.
 * This is a presentation eligibility audit, not clinical or playback approval.
 */
const REQUIRED_POSE_FEATURES: Readonly<Record<string, string>> = {
  'expanded-mat-hundred': '상체 유지와 작은 양팔 펌핑의 연결',
  'expanded-mat-roll-up': '누운 자세부터 앉은 자세까지 이어지는 척추 굴곡',
  'expanded-mat-single-leg-circle': '한 다리의 원형 경로와 반대 다리의 매트 지지',
  'expanded-mat-double-leg-kick': '양무릎 굽힘과 등 뒤 양팔의 신장 연결',
  'expanded-mat-hip-circles': '뒤쪽 손 지지를 유지한 양다리 원형 경로',
  'expanded-mat-kneeling-side-kicks': '한쪽 손·무릎 옆 지지와 반대 다리의 앞뒤 이동',
  'expanded-mat-leg-pull-front': '손·발 플랭크 지지와 한 다리의 뒤쪽 들기',
  'expanded-mat-leg-pull-back': '몸 뒤 손·발뒤꿈치 지지와 골반·한 다리 들기',
  'expanded-mat-side-bend': '한 손·발 옆 지지와 골반을 들어 만드는 측면 곡선',
  'expanded-mat-side-kicks': '옆으로 누운 지지를 유지한 위쪽 다리의 앞뒤 경로',
  'expanded-mat-thigh-stretch': '무릎 지지를 유지한 허벅지·몸통의 뒤쪽 기울기',
  'expanded-mat-swimming': '엎드린 몸통 지지와 반대 팔·다리의 연속 교대',
  'expanded-mat-rocking': '발목을 잡은 자세에서 몸 앞면을 따라 이어지는 흔들기',
  'expanded-mat-footwork': '누운 몸통 지지와 공중 양다리의 굽힘·폄',
  'expanded-mat-half-roll-back': '앉은 자세에서 골반·몸통의 부분 롤백과 복귀',
  'expanded-reformer-elephant': '고정 풋바의 손과 캐리지의 양발 지지를 유지한 왕복',
  'expanded-reformer-long-stretch': '풋바의 손·캐리지의 발 접촉을 유지한 긴 플랭크 왕복',
  'expanded-reformer-up-stretch': '풋바·캐리지 지지와 골반 들기에서 긴 몸통으로의 전환',
  'expanded-reformer-long-back-stretch': '몸 뒤 풋바 손 지지와 캐리지 발 지지의 연결',
  'expanded-reformer-arm-circles': '캐리지 무릎 지지와 스트랩을 잡은 양팔의 원형 경로',
  'expanded-reformer-rowing-sternum': '가슴 앞 스트랩 당기기부터 뒤쪽 팔 경로까지의 순서',
  'expanded-reformer-rowing-90': '직각 팔 준비에서 이어지는 로잉의 팔·몸통 순서',
  'expanded-reformer-rowing-from-chest': '가슴 앞에서 시작하는 양팔의 전방·상방 경로',
  'expanded-reformer-rowing-from-hips': '골반 옆에서 시작하는 양팔과 몸통의 연결',
  'expanded-reformer-rowing-shave': '머리 뒤 양손 준비와 스트랩 저항 속 팔꿈치 펴기',
  'expanded-reformer-rowing-hug': '앉은 몸통 지지와 양팔을 앞으로 모으는 경로',
  'expanded-reformer-hamstring-curl': '롱박스의 엎드린 몸통 지지와 스트랩 무릎 굽힘',
  'expanded-reformer-thigh-stretch': '캐리지 무릎 지지와 스트랩 저항 속 몸통 기울기',
  'expanded-reformer-stomach-massage-hands-back': '뒤쪽 손 지지와 풋바 발 지지를 유지한 다리 왕복',
  'expanded-reformer-single-leg-elephant': '풋바 손·한 발 캐리지 지지와 반대 다리 들기',
  'expanded-cadillac-standing-butterfly': '선 자세의 스프링 손 지지와 양팔·몸통의 옆 경로',
  'expanded-cadillac-standing-fencing': '선 자세의 발 지지와 스프링 팔·몸통 회전',
  'expanded-cadillac-roll-back-biceps': '선 자세에서 롤백 바를 잡은 팔꿈치 굽힘',
  'expanded-cadillac-roll-back-shave': '선 자세의 롤백 바 지지와 머리 위 팔꿈치 펴기',
  'expanded-cadillac-roll-back-zip-up': '선 자세에서 롤백 바를 몸 가까이 위로 당기는 경로',
  'expanded-cadillac-roll-back-side-arm': '선 자세와 옆 방향 롤백 바 저항의 연결',
  'expanded-cadillac-roll-back-thigh-stretch': '무릎 지지와 롤백 바 저항 속 몸통 기울기',
  'expanded-cadillac-leg-springs-bicycle': '고정 테이블에서 양발 스프링과 교대 자전거 경로',
  'expanded-cadillac-leg-springs-beats': '고정 테이블의 몸통 지지와 스프링 양다리의 작은 교차',
  'expanded-cadillac-side-leg-springs-front-back': '옆으로 누운 몸통과 다리 스프링의 앞뒤 경로',
  'expanded-cadillac-side-leg-springs-up-down': '옆으로 누운 몸통과 다리 스프링의 위아래 경로',
  'expanded-cadillac-kneeling-side-bend': '무릎 지지와 푸시스루 바를 잡은 몸통의 측굴',
  'expanded-chair-swan': '체어 위 엎드린 몸통 지지와 손·페달의 신전 연결',
  'expanded-chair-kneeling-push-down': '무릎 지지와 손으로 페달을 누르는 몸통 경로',
  'expanded-chair-push-down-front': '바닥 발 지지와 앞으로 굽혀 양손으로 페달 누르기',
  'expanded-chair-push-down-one-arm': '바닥 발 지지와 한 손 페달 누르기의 몸통 제어',
  'expanded-chair-side-pull-up': '옆 방향 손·발 지지와 페달에서 올라오는 골반',
  'expanded-chair-long-back-arm': '몸 뒤 손·페달 접촉과 팔꿈치 굽힘·폄',
  'expanded-chair-table': '뒤쪽 손 지지·페달 발 접촉과 골반 들기',
  'expanded-chair-mermaid-kneeling': '무릎 지지와 옆쪽 손·페달 접촉의 측굴',
  'expanded-chair-single-arm-twist': '앉은 지지와 한 손·페달 접촉의 몸통 회전',
  'expanded-chair-horseback': '체어를 사이에 둔 다리 지지와 골반·몸통의 들기',
  'expanded-barrel-arm-circles': '바렐 곡면의 등 지지와 덤벨 양팔의 원형 경로',
  'expanded-barrel-arm-hug': '바렐 곡면의 등 지지와 덤벨 양팔 모으기',
  'expanded-barrel-arm-up-down': '바렐 곡면의 등 지지와 덤벨 양팔의 위아래 경로',
  'expanded-barrel-back-stretch': '바렐 곡면의 등 접촉과 발·래더 지지',
  'expanded-barrel-big-leg-circles': '바렐 곡면의 등·손 지지와 양다리의 큰 원형 경로',
  'expanded-barrel-horseback-jockey': '바렐을 감싼 굽힌 다리 지지와 덤벨 팔 경로',
  'expanded-barrel-horseback': '바렐을 사이에 둔 다리 접촉과 골반 들기',
  'expanded-barrel-swimming': '바렐 곡면의 몸통 접촉과 반대 팔·다리의 교대',
};

const UNAUTHORED_REASON = '이 동작의 단계별 그림은 준비 중이에요. 제작자 영상에서 자세와 움직임을 확인해 주세요.';

export const EXPANDED_MOVEMENT_VISUAL_BINDINGS: Readonly<Record<string, ExpandedMovementVisualBinding>> =
  Object.freeze(Object.fromEntries(EXPANDED_MOVEMENTS.map((exercise) => {
    const source = getExpandedMovementSource(exercise);
    const missingPoseFeatureKo = REQUIRED_POSE_FEATURES[exercise.id] ?? '동작별 자세와 기구 접촉';
    return [exercise.id, Object.freeze({
      exerciseId: exercise.id,
      nativeMotionAvailable: false,
      presentation: 'creator-video-only' as const,
      ...(source ? { sourceUrl: source.sourceUrl, videoId: source.videoId } : {}),
      reasonKo: UNAUTHORED_REASON,
      missingPoseFeatureKo,
      checkedAt: '2026-11-13' as const,
    })];
  })));

/**
 * Unknown future expanded IDs also fail closed. Passing an edited exercise
 * invalidates old tutorial metadata without enabling a generic native pose.
 */
export function getExpandedMovementVisualBinding(
  exerciseOrId: string | Pick<PilatesExercise, 'id' | 'apparatus' | 'youtube'>,
): ExpandedMovementVisualBinding | undefined {
  const id = typeof exerciseOrId === 'string' ? exerciseOrId : exerciseOrId.id;
  if (id.startsWith('crawled-')) {
    const video = typeof exerciseOrId === 'string' ? undefined : exerciseOrId.youtube;
    return {
      exerciseId: id,
      nativeMotionAvailable: false,
      presentation: 'creator-video-only',
      ...(video?.videoId && video.url ? { sourceUrl: video.url, videoId: video.videoId } : {}),
      reasonKo: '수집 동작의 자세·접점을 재현한 전용 그림은 아직 준비되지 않았습니다. 연결 자료에서 동작을 확인해 주세요.',
      missingPoseFeatureKo: '동작별 자세, 기구 접촉과 중간 경로',
      checkedAt: '2026-11-13',
    };
  }
  if (!id.startsWith('expanded-')) return undefined;
  const binding = EXPANDED_MOVEMENT_VISUAL_BINDINGS[id];
  if (!binding) return {
    exerciseId: id,
    nativeMotionAvailable: false,
    presentation: 'creator-video-only',
    reasonKo: UNAUTHORED_REASON,
    missingPoseFeatureKo: '동작별 자세와 기구 접촉',
    checkedAt: '2026-11-13',
  };
  if (typeof exerciseOrId === 'string' || getExpandedMovementSource(exerciseOrId)) return binding;
  return {
    exerciseId: binding.exerciseId,
    nativeMotionAvailable: binding.nativeMotionAvailable,
    presentation: binding.presentation,
    reasonKo: binding.reasonKo,
    missingPoseFeatureKo: binding.missingPoseFeatureKo,
    checkedAt: binding.checkedAt,
  };
}
