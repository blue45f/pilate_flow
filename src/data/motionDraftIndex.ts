import type { MotionDraftId } from '../models/types';

export type MotionDraftRig =
  'mat' | 'ordinary-chair' | 'reformer' | 'pilates-chair' | 'cadillac' | 'ladder-barrel';

/** Discovery/comparison metadata only: no canonical asset lookup, eligibility or review grant. */
export interface MotionDraftComparison {
  readonly id: MotionDraftId;
  readonly intendedExerciseId: string;
  readonly rig: MotionDraftRig;
  readonly labelKo: string;
  readonly status: 'unreviewed-comparison-only';
}
export const MOTION_DRAFT_COMPARISONS: readonly MotionDraftComparison[] = Object.freeze([
  {
    id: 'supported-heel-raise',
    rig: 'ordinary-chair',
    intendedExerciseId: 'original-mat-ankle-reach',
    labelKo: '일반 의자 지지 뒤꿈치 들기',
    status: 'unreviewed-comparison-only',
  },
  {
    id: 'side-lying-clam',
    rig: 'mat',
    intendedExerciseId: 'original-mat-clam',
    labelKo: '옆누운 클램 제안',
    status: 'unreviewed-comparison-only',
  },
  {
    id: 'adult-supine-heel-slide',
    rig: 'mat',
    intendedExerciseId: 'original-mat-heel-slide',
    labelKo: '누워서 힐 슬라이드 제안',
    status: 'unreviewed-comparison-only',
  },
  {
    id: 'supine-knee-fold',
    rig: 'mat',
    intendedExerciseId: 'original-mat-knee-fold',
    labelKo: '누워서 니 폴드 제안',
    status: 'unreviewed-comparison-only',
  },
  {
    id: 'side-lying-straight-leg-lift',
    rig: 'mat',
    intendedExerciseId: 'original-mat-side-leg-lift',
    labelKo: '옆누운 편 다리 들기 제안',
    status: 'unreviewed-comparison-only',
  },
  {
    id: 'side-lying-open-book',
    rig: 'mat',
    intendedExerciseId: 'original-mat-open-book',
    labelKo: '옆누운 오픈 북 제안',
    status: 'unreviewed-comparison-only',
  },
  {
    id: 'quadruped-arm-slide',
    rig: 'mat',
    intendedExerciseId: 'original-mat-quadruped-reach',
    labelKo: '네발기기 한 팔 슬라이드 제안',
    status: 'unreviewed-comparison-only',
  },
  {
    id: 'quadruped-leg-slide',
    rig: 'mat',
    intendedExerciseId: 'original-mat-quadruped-reach',
    labelKo: '네발기기 한 다리 슬라이드 제안',
    status: 'unreviewed-comparison-only',
  },
  {
    id: 'reformer-parallel-footwork',
    rig: 'reformer',
    intendedExerciseId: 'original-reformer-parallel-footwork',
    labelKo: '리포머 양발 풋워크 제안',
    status: 'unreviewed-comparison-only',
  },
  {
    id: 'chair-seated-pedal-press',
    rig: 'pilates-chair',
    intendedExerciseId: 'original-chair-seated-pedal-press',
    labelKo: '체어 양발 페달 프레스 제안',
    status: 'unreviewed-comparison-only',
  },
  {
    id: 'reformer-supine-strap-arm-press',
    intendedExerciseId: 'original-reformer-supine-arm-press',
    rig: 'reformer',
    labelKo: '리포머 팔 프레스 · 볼 종류 미확인',
    status: 'unreviewed-comparison-only',
  },
  {
    id: 'cadillac-supine-arm-spring-press',
    intendedExerciseId: 'original-cadillac-arm-spring-press',
    rig: 'cadillac',
    labelKo: '캐딜락 굽힌 팔 프레스 제안',
    status: 'unreviewed-comparison-only',
  },
  {
    id: 'ladder-supported-hip-extension-slide',
    intendedExerciseId: 'original-barrel-standing-hip-extension',
    rig: 'ladder-barrel',
    labelKo: '래더 지지 뒤 슬라이드 · 저작 적응',
    status: 'unreviewed-comparison-only',
  },
  {
    id: 'ladder-supported-side-leg-slide',
    intendedExerciseId: 'original-barrel-standing-side-reach',
    rig: 'ladder-barrel',
    labelKo: '래더 지지 옆 슬라이드 · 저작 적응',
    status: 'unreviewed-comparison-only',
  },
  {
    id: 'floor-seated-band-row',
    intendedExerciseId: 'original-mat-band-row',
    rig: 'mat',
    labelKo: '바닥 앉은 긴 밴드 로우 제안',
    status: 'unreviewed-comparison-only',
  },
  {
    id: 'supine-chest-lift',
    intendedExerciseId: 'original-mat-chest-lift',
    rig: 'mat',
    labelKo: '누운 가슴 들기 · 분절 도해 제안',
    status: 'unreviewed-comparison-only',
  },
  {
    id: 'articulated-pelvic-curl',
    intendedExerciseId: 'original-mat-bridge',
    rig: 'mat',
    labelKo: '분절 골반 말기 · 저작 도해 제안',
    status: 'unreviewed-comparison-only',
  },
]);

/** An intended comparison ID is never a motion asset ID, substitute or expert approval. */
export function getMotionDraftComparisons(exerciseId: string): readonly MotionDraftComparison[] {
  return MOTION_DRAFT_COMPARISONS.filter((entry) => entry.intendedExerciseId === exerciseId);
}

const RIG_LABELS: Readonly<Record<MotionDraftRig, string>> = {
  mat: '매트 · 지지물은 제안별 확인',
  'ordinary-chair': '일반 고정 의자 지지 · 필라테스 체어 아님',
  reformer: '리포머 · 변형별 준비물 확인',
  'pilates-chair': '필라테스 체어',
  cadillac: '캐딜락 · 스프링 설정 미검증',
  'ladder-barrel': '래더바렐 적응 제안 · 원문 변형 미대조',
};
/** Presentation grouping only. Unknown IDs remain selectable without becoming catalog mappings. */
export function groupMotionDraftOptions<T extends { readonly id: string }>(
  items: readonly T[],
): readonly { label: string; items: readonly T[] }[] {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const metadata = MOTION_DRAFT_COMPARISONS.find((entry) => entry.id === item.id);
    const label = metadata ? RIG_LABELS[metadata.rig] : '다른 제작 제안';
    const group = groups.get(label) ?? [];
    group.push(item);
    groups.set(label, group);
  }
  return [...groups].map(([label, values]) => ({ label, items: values }));
}
