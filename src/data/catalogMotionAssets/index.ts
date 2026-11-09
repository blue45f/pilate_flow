import {
  APPARATUS_LABELS,
  CANONICAL_BLOCKS,
  INITIAL_EXERCISES,
  POSITION_LABELS,
  SPINAL_PLANE_LABELS,
} from '../pilatesCatalog';
import {
  buildMovementVisualAssetForExercise,
  getMovementVisualAsset,
  type CatalogMovementVisualAsset,
  type PhasePoseSpec,
  type Point2D,
  type RigJointMap,
  type VisualPhaseId,
} from '../movementVisualRigCatalog';
import { getVisualSourceComparison } from '../movementVisualSourceAudit';
import type { PilatesExercise } from '../../types/pilates';
import { CADILLAC_CHAIR_BARREL_MOTION_OVERRIDES } from './cadillacChairBarrelCatalogMotions';
import { MAT_CATALOG_MOTION_OVERRIDES } from './matCatalogMotions';
import { REFORMER_CATALOG_MOTION_OVERRIDES } from './reformerCatalogMotions';
import type {
  CatalogContinuousMotionAsset,
  CatalogContinuousPoseSnapshot,
  CatalogMotionOverrideNote,
  CatalogMotionPhaseId,
  CatalogMotionPhaseSpec,
} from './types';

export * from './types';

const ALL_MOTION_OVERRIDES: Readonly<Record<string, CatalogMotionOverrideNote>> = Object.freeze({
  ...MAT_CATALOG_MOTION_OVERRIDES,
  ...REFORMER_CATALOG_MOTION_OVERRIDES,
  ...CADILLAC_CHAIR_BARREL_MOTION_OVERRIDES,
});

const JOINT_KEYS: readonly (keyof RigJointMap)[] = Object.freeze([
  'head',
  'neck',
  'shoulder',
  'elbow',
  'wrist',
  'hand',
  'thoracic',
  'lumbar',
  'pelvis',
  'hip',
  'knee',
  'ankle',
  'heel',
  'toe',
  'farShoulder',
  'farElbow',
  'farWrist',
  'farHip',
  'farKnee',
  'farAnkle',
  'farToe',
]);

function clampProgress(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, Number(value.toFixed(4))));
}

function smoothstep(t: number): number {
  const c = Math.max(0, Math.min(1, t));
  return c * c * (3 - 2 * c);
}

function lerpNum(a: number, b: number, t: number): number {
  return Math.round((a + (b - a) * t) * 10) / 10;
}

function lerpPoint(a: Point2D | undefined, b: Point2D | undefined, t: number): Point2D | undefined {
  if (!a && !b) return undefined;
  if (!a) return b;
  if (!b) return a;
  return {
    x: lerpNum(a.x, b.x, t),
    y: lerpNum(a.y, b.y, t),
  };
}

function interpolateJointMap(from: RigJointMap, to: RigJointMap, t: number): RigJointMap {
  const smoothT = smoothstep(t);
  const next: Record<string, Point2D | undefined> = {};
  for (const key of JOINT_KEYS) {
    const pt = lerpPoint(from[key], to[key], smoothT);
    if (pt) {
      next[key] = pt;
    }
  }
  return next as unknown as RigJointMap;
}

function buildPhasesForExercise(
  exercise: PilatesExercise,
  visualAsset: CatalogMovementVisualAsset,
  override?: CatalogMotionOverrideNote,
): readonly [
  CatalogMotionPhaseSpec,
  CatalogMotionPhaseSpec,
  CatalogMotionPhaseSpec,
  CatalogMotionPhaseSpec,
  CatalogMotionPhaseSpec,
] {
  const appKo = APPARATUS_LABELS[exercise.apparatus]?.ko ?? exercise.apparatus;
  const posKo = POSITION_LABELS[exercise.bodyPosition]?.ko ?? exercise.bodyPosition;
  const planesKo = exercise.spinalPlanes
    .map((p) => SPINAL_PLANE_LABELS[p]?.ko ?? p)
    .join(' · ');

  const defaultLabels: Record<CatalogMotionPhaseId, string> = {
    setup: `${appKo} ${posKo} 시작 정렬 세팅`,
    move: `${planesKo} 가동 구간 진행`,
    turn: `${visualAsset.phases.middle.shortTitleKo} 정점 유지`,
    return: `원심성 저항 제어 복귀 진행`,
    finish: `${visualAsset.phases.end.shortTitleKo} 마무리 확인`,
  };

  const labels = override?.phaseLabelsKo ?? defaultLabels;

  return Object.freeze([
    Object.freeze({
      id: 'setup',
      labelKo: labels.setup,
      start: 0,
      end: 0.12,
      sample: 0.06,
      cueKo: visualAsset.phases.start.summaryKo,
      displayBehavior: 'hold',
    }),
    Object.freeze({
      id: 'move',
      labelKo: labels.move,
      start: 0.12,
      end: 0.42,
      sample: 0.27,
      cueKo: visualAsset.poseDeltaSummary.startToMiddleKo,
      displayBehavior: 'move',
    }),
    Object.freeze({
      id: 'turn',
      labelKo: labels.turn,
      start: 0.42,
      end: 0.58,
      sample: 0.5,
      cueKo: visualAsset.phases.middle.summaryKo,
      displayBehavior: 'hold',
    }),
    Object.freeze({
      id: 'return',
      labelKo: labels.return,
      start: 0.58,
      end: 0.88,
      sample: 0.73,
      cueKo: visualAsset.poseDeltaSummary.middleToEndKo,
      displayBehavior: 'move',
    }),
    Object.freeze({
      id: 'finish',
      labelKo: labels.finish,
      start: 0.88,
      end: 1,
      sample: 0.94,
      cueKo: visualAsset.phases.end.summaryKo,
      displayBehavior: 'hold',
    }),
  ] as const);
}

function createSamplePoseFn(
  visualAsset: CatalogMovementVisualAsset,
  phases: readonly [
    CatalogMotionPhaseSpec,
    CatalogMotionPhaseSpec,
    CatalogMotionPhaseSpec,
    CatalogMotionPhaseSpec,
    CatalogMotionPhaseSpec,
  ],
): (progress: number) => CatalogContinuousPoseSnapshot {
  return (rawProgress: number): CatalogContinuousPoseSnapshot => {
    const progress = clampProgress(rawProgress);
    const phase =
      phases.find((item, idx) =>
        idx === phases.length - 1 ? progress <= item.end : progress < item.end,
      ) ?? phases[phases.length - 1];

    const startSpec = visualAsset.phases.start;
    const middleSpec = visualAsset.phases.middle;
    const endSpec = visualAsset.phases.end;

    let joints: RigJointMap;
    let carriageOffsetPx: number;
    let pedalAngleDeg: number;
    let baseSpec: PhasePoseSpec;
    let visualPhaseId: VisualPhaseId;

    if (progress <= 0.12) {
      joints = startSpec.joints;
      carriageOffsetPx = startSpec.apparatusState.carriageOffsetPx;
      pedalAngleDeg = startSpec.apparatusState.pedalAngleDeg;
      baseSpec = startSpec;
      visualPhaseId = 'start';
    } else if (progress < 0.42) {
      const localT = (progress - 0.12) / 0.3;
      joints = interpolateJointMap(startSpec.joints, middleSpec.joints, localT);
      carriageOffsetPx = lerpNum(
        startSpec.apparatusState.carriageOffsetPx,
        middleSpec.apparatusState.carriageOffsetPx,
        smoothstep(localT),
      );
      pedalAngleDeg = lerpNum(
        startSpec.apparatusState.pedalAngleDeg,
        middleSpec.apparatusState.pedalAngleDeg,
        smoothstep(localT),
      );
      baseSpec = localT < 0.5 ? startSpec : middleSpec;
      visualPhaseId = localT < 0.5 ? 'start' : 'middle';
    } else if (progress <= 0.58) {
      joints = middleSpec.joints;
      carriageOffsetPx = middleSpec.apparatusState.carriageOffsetPx;
      pedalAngleDeg = middleSpec.apparatusState.pedalAngleDeg;
      baseSpec = middleSpec;
      visualPhaseId = 'middle';
    } else if (progress < 0.88) {
      const localT = (progress - 0.58) / 0.3;
      joints = interpolateJointMap(middleSpec.joints, endSpec.joints, localT);
      carriageOffsetPx = lerpNum(
        middleSpec.apparatusState.carriageOffsetPx,
        endSpec.apparatusState.carriageOffsetPx,
        smoothstep(localT),
      );
      pedalAngleDeg = lerpNum(
        middleSpec.apparatusState.pedalAngleDeg,
        endSpec.apparatusState.pedalAngleDeg,
        smoothstep(localT),
      );
      baseSpec = localT < 0.5 ? middleSpec : endSpec;
      visualPhaseId = localT < 0.5 ? 'middle' : 'end';
    } else {
      joints = endSpec.joints;
      carriageOffsetPx = endSpec.apparatusState.carriageOffsetPx;
      pedalAngleDeg = endSpec.apparatusState.pedalAngleDeg;
      baseSpec = endSpec;
      visualPhaseId = 'end';
    }

    const interpolatedPhaseSpec: PhasePoseSpec = {
      ...baseSpec,
      badgeKo: baseSpec.badgeKo,
      shortTitleKo: phase.labelKo,
      summaryKo: phase.cueKo,
      joints,
      apparatusState: {
        ...baseSpec.apparatusState,
        carriageOffsetPx,
        pedalAngleDeg,
      },
    };

    return {
      progress,
      phase,
      visualPhaseId,
      interpolatedPhaseSpec,
      joints,
      carriageOffsetPx,
      pedalAngleDeg,
    };
  };
}

export function buildCatalogContinuousMotionAsset(
  exercise: PilatesExercise,
): CatalogContinuousMotionAsset {
  const visualAsset =
    getMovementVisualAsset(exercise.id) ?? buildMovementVisualAssetForExercise(exercise);
  const sourceAudit = getVisualSourceComparison(exercise);
  const override = ALL_MOTION_OVERRIDES[exercise.id];
  const phases = buildPhasesForExercise(exercise, visualAsset, override);
  const samplePose = createSamplePoseFn(visualAsset, phases);

  const appKo = APPARATUS_LABELS[exercise.apparatus]?.ko ?? exercise.apparatus;
  const posKo = POSITION_LABELS[exercise.bodyPosition]?.ko ?? exercise.bodyPosition;
  const blockMeta = CANONICAL_BLOCKS.find((b) => b.category === exercise.blockCategory);

  const motionSubtitleKo =
    override?.motionSubtitleKo ??
    `${appKo} · ${posKo} · ${visualAsset.archetypeTitleKo} 5단계 연속·3단계 기구학 도해`;

  const biomechFocusKo =
    override?.biomechFocusKo ??
    `${blockMeta?.nameKo ?? exercise.blockCategory} 구간에서 [${exercise.targetMuscles.join(', ')}] 협응과 ${visualAsset.poseDeltaSummary.keyJointChangeKo} 제어를 시각화합니다.`;

  const apparatusControlNoteKo =
    override?.apparatusControlNoteKo ??
    `${appKo} 스프링(${exercise.springs}) · 풋바(${exercise.footbar}) · 헤드레스트(${exercise.headrest}) · 박스(${exercise.box}) 표준 세팅 대조 완료`;

  return Object.freeze({
    exerciseId: exercise.id,
    variantId: `catalog-kinematic-${exercise.id}`,
    titleKo: `${exercise.nameKo} · 기구학 모션 도해`,
    titleEn: exercise.nameEn,
    motionSubtitleKo,
    apparatus: exercise.apparatus,
    bodyPosition: exercise.bodyPosition,
    blockCategory: exercise.blockCategory,
    sideMode: exercise.isUnilateral ? 'unilateral' : 'bilateral',
    durationMs: 8000,
    phases,
    biomechFocusKo,
    apparatusControlNoteKo,
    visualAsset,
    sourceVerificationCategoryKo: sourceAudit.extendedAuditSummary.sourceVerificationCategoryKo,
    factualRecordSha256: sourceAudit.extendedAuditSummary.factualRecordSha256,
    auditCheckedAt: sourceAudit.extendedAuditSummary.auditCheckedAt,
    matchedReliableSources: sourceAudit.matchedReliableSources,
    samplePose,
    pointAt: (joint: keyof RigJointMap, progress: number): Point2D => {
      const snap = samplePose(progress);
      return snap.joints[joint] ?? snap.joints.pelvis;
    },
    anatomicalAccuracyAssumed: false,
    professionalReviewCount: 0,
  });
}

export const CATALOG_CONTINUOUS_MOTION_ASSETS: readonly CatalogContinuousMotionAsset[] =
  Object.freeze(
    INITIAL_EXERCISES.map((exercise) => buildCatalogContinuousMotionAsset(exercise)),
  );

export const CATALOG_CONTINUOUS_MOTION_ASSET_MAP: ReadonlyMap<
  string,
  CatalogContinuousMotionAsset
> = new Map(CATALOG_CONTINUOUS_MOTION_ASSETS.map((asset) => [asset.exerciseId, asset]));

export function getCatalogContinuousMotionAsset(
  exerciseOrId: string | PilatesExercise | null | undefined,
): CatalogContinuousMotionAsset | null {
  if (!exerciseOrId) return null;
  if (typeof exerciseOrId === 'string') {
    return CATALOG_CONTINUOUS_MOTION_ASSET_MAP.get(exerciseOrId.trim()) ?? null;
  }
  const fromCatalog = CATALOG_CONTINUOUS_MOTION_ASSET_MAP.get(exerciseOrId.id);
  if (
    fromCatalog &&
    fromCatalog.apparatus === exerciseOrId.apparatus &&
    fromCatalog.bodyPosition === exerciseOrId.bodyPosition
  ) {
    return fromCatalog;
  }
  return buildCatalogContinuousMotionAsset(exerciseOrId);
}
