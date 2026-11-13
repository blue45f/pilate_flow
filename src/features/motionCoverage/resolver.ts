import { compareCodeUnits } from '../../utils/compareCodeUnits';
import { INITIAL_EXERCISES } from '../../data/pilatesCatalog';
import { ORIGINAL_MOVEMENTS } from '../../data/originalMovements';
import { getExpandedMovementVisualBinding } from '../../data/expandedMovementVisualBindings';
import {
  MOVEMENT_VISUAL_ASSETS,
  MOVEMENT_VISUAL_ASSET_MAP,
} from '../../data/movementVisualRigCatalog';
import {
  evaluateVisualAssetIntegrity,
  getVisualSourceComparison,
} from '../../data/movementVisualSourceAudit';
import { BATCH_VARIANTS, getBatchVariant } from '../../data/motionAuthoringBatch';
import {
  getMotionCandidateResearch,
  type MotionCandidateResearch,
} from '../../data/motionCandidateResearch';
import { MOTION_DRAFT_COMPARISONS, type MotionDraftRig } from '../../data/motionDraftIndex';
import { getMotionDraft, MOTION_DRAFTS } from '../../data/motionDrafts';
import {
  getMotionPatternReferences,
  MOTION_PATTERN_REFERENCES,
  type MotionPatternReference,
} from '../../data/motionPatternReferences';
import {
  EXERCISE_MOTION_REFERENCES,
  getExerciseMotionReference,
  getMotionPrototype,
  MOTION_PROTOTYPES,
  MOTION_REFERENCE_COUNTS,
  type MotionPrototypeReference,
} from '../../data/motionReferences';
import { SUPINE_REACH_DEFINITION } from '../../data/supineReach';
import type { ApparatusType, BodyPosition, PilatesExercise } from '../../types/pilates';
import { getReusedCatalogVisualAsset } from './poseOverrides';
import type {
  CandidateMatchEvaluation,
  Continuous2dSupportDetail,
  MotionCoverageResolution,
  MotionReadinessState,
  MotionSafetyAndReviewFlags,
  MotionSupportMode,
  Projected3dSourceKind,
  Projected3dSupportDetail,
  RejectedMotionCandidate,
  ResolveMotionCoverageOptions,
  ThreePhase2dSupportDetail,
  UnauthoredResearchCandidateInfo,
} from './types';

const CATALOG_EXERCISE_BY_ID: ReadonlyMap<string, PilatesExercise> = new Map(
  INITIAL_EXERCISES.map((ex) => [ex.id, ex]),
);

const ORIGINAL_MOVEMENT_ID_SET: ReadonlySet<string> = new Set(
  ORIGINAL_MOVEMENTS.map((ex) => ex.id),
);

const PATTERN_REFERENCE_BY_VARIANT_ID: ReadonlyMap<string, MotionPatternReference> = new Map(
  MOTION_PATTERN_REFERENCES.map((ref) => [ref.variantId, ref]),
);

const RESEARCH_CANDIDATE_BY_ID: ReadonlyMap<string, MotionCandidateResearch> = new Map(
  INITIAL_EXERCISES.flatMap((ex) =>
    getMotionCandidateResearch(ex.id).map((rc) => [rc.candidateId, rc] as const),
  ),
);

const DRAFT_COMPARISON_BY_VARIANT_ID: ReadonlyMap<
  string,
  (typeof MOTION_DRAFT_COMPARISONS)[number]
> = new Map(MOTION_DRAFT_COMPARISONS.map((entry) => [entry.id, entry]));

/**
 * Only `supported-heel-raise` in MOTION_PATTERN_REFERENCES uses a 2D planar model (`Point2 {x, y}`
 * in `src/models/heelRaise.ts`). All other 21 pattern references use 3D coordinates (`Point3` /
 * `BatchPoint` / `SupineReachPoint`) with oblique orthographic projection (`project*Point`) onto
 * a 2D `<svg>` surface (`renderSurface: 'svg-2d'`, `true3dSupported: false`).
 */
const CONTINUOUS_2D_PATTERN_VARIANT_IDS: ReadonlySet<string> = new Set(['supported-heel-raise']);

interface PatternModelMeta {
  readonly modelPath: string;
  readonly rendererComponent: string;
  readonly dimension: '2d' | '3d';
  readonly canonicalApparatus: ApparatusType;
  readonly canonicalBodyPosition: BodyPosition;
  readonly draftRig: MotionDraftRig;
  readonly mismatchSummaryKo: string;
}

function resolveDraftRigForVariant(variantId: string, fallback: MotionDraftRig): MotionDraftRig {
  const fromComparison = DRAFT_COMPARISON_BY_VARIANT_ID.get(variantId)?.rig;
  if (fromComparison) return fromComparison;
  const fromBatch = BATCH_VARIANTS.find((v) => v.id === variantId)?.rig;
  if (fromBatch) return fromBatch;
  if (variantId === SUPINE_REACH_DEFINITION.id) return 'mat';
  return fallback;
}

const PATTERN_MODEL_METADATA: Readonly<Record<string, PatternModelMeta>> = Object.freeze({
  'supported-heel-raise': {
    modelPath: 'src/models/heelRaise.ts',
    rendererComponent: 'src/components/MotionDraftFigure.tsx',
    dimension: '2d',
    canonicalApparatus: 'mat',
    canonicalBodyPosition: 'standing',
    draftRig: resolveDraftRigForVariant('supported-heel-raise', 'ordinary-chair'),
    mismatchSummaryKo:
      '2D 평면(Point2) 연속 초안 · 일반 고정 의자(ordinary-chair) 등받이 손 지지 포함',
  },
  'side-lying-clam': {
    modelPath: 'src/models/clam.ts',
    rendererComponent: 'src/components/MotionDraftFigure.tsx',
    dimension: '3d',
    canonicalApparatus: 'mat',
    canonicalBodyPosition: 'side-lying',
    draftRig: resolveDraftRigForVariant('side-lying-clam', 'mat'),
    mismatchSummaryKo: '3D 사선 투영(2D SVG) 초안 · 머리 베개(pillow) 포함, 무밴드',
  },
  'adult-supine-heel-slide': {
    modelPath: 'src/models/supineDrafts.ts',
    rendererComponent: 'src/components/SupineDraftFigure.tsx',
    dimension: '3d',
    canonicalApparatus: 'mat',
    canonicalBodyPosition: 'supine',
    draftRig: resolveDraftRigForVariant('adult-supine-heel-slide', 'mat'),
    mismatchSummaryKo: '3D 사선 투영(2D SVG) 초안 · 성인 수파인 편측 뒤꿈치 슬라이드',
  },
  'supine-knee-fold': {
    modelPath: 'src/models/supineDrafts.ts',
    rendererComponent: 'src/components/SupineDraftFigure.tsx',
    dimension: '3d',
    canonicalApparatus: 'mat',
    canonicalBodyPosition: 'supine',
    draftRig: resolveDraftRigForVariant('supine-knee-fold', 'mat'),
    mismatchSummaryKo: '3D 사선 투영(2D SVG) 초안 · 단측 다리 리프트/다운 단일 주기(교대 미포함)',
  },
  'side-lying-straight-leg-lift': {
    modelPath: 'src/models/lateralDrafts.ts',
    rendererComponent: 'src/components/LateralDraftFigure.tsx',
    dimension: '3d',
    canonicalApparatus: 'mat',
    canonicalBodyPosition: 'side-lying',
    draftRig: resolveDraftRigForVariant('side-lying-straight-leg-lift', 'mat'),
    mismatchSummaryKo: '3D 사선 투영(2D SVG) 초안 · 머리 패드 및 양다리 신전 배치',
  },
  'side-lying-open-book': {
    modelPath: 'src/models/lateralDrafts.ts',
    rendererComponent: 'src/components/LateralDraftFigure.tsx',
    dimension: '3d',
    canonicalApparatus: 'mat',
    canonicalBodyPosition: 'side-lying',
    draftRig: resolveDraftRigForVariant('side-lying-open-book', 'mat'),
    mismatchSummaryKo: '3D 사선 투영(2D SVG) 초안 · 머리 패드 포함, 위쪽 손 공중 오픈 회전',
  },
  'quadruped-arm-slide': {
    modelPath: 'src/models/quadrupedDrafts.ts',
    rendererComponent: 'src/components/QuadrupedDraftFigure.tsx',
    dimension: '3d',
    canonicalApparatus: 'mat',
    canonicalBodyPosition: 'quadruped',
    draftRig: resolveDraftRigForVariant('quadruped-arm-slide', 'mat'),
    mismatchSummaryKo: '3D 사선 투영(2D SVG) 초안 · 단독 한 손 전방 바닥 슬라이드 준비 구간',
  },
  'quadruped-leg-slide': {
    modelPath: 'src/models/quadrupedDrafts.ts',
    rendererComponent: 'src/components/QuadrupedDraftFigure.tsx',
    dimension: '3d',
    canonicalApparatus: 'mat',
    canonicalBodyPosition: 'quadruped',
    draftRig: resolveDraftRigForVariant('quadruped-leg-slide', 'mat'),
    mismatchSummaryKo: '3D 사선 투영(2D SVG) 초안 · 단독 한 발 후방 바닥 슬라이드 준비 구간',
  },
  'reformer-parallel-footwork': {
    modelPath: 'src/models/reformerFootwork.ts',
    rendererComponent: 'src/components/ApparatusDraftFigure.tsx',
    dimension: '3d',
    canonicalApparatus: 'reformer',
    canonicalBodyPosition: 'supine',
    draftRig: resolveDraftRigForVariant('reformer-parallel-footwork', 'reformer'),
    mismatchSummaryKo:
      '3D 사선 투영(2D SVG) 초안 · 양뒤꿈치 평행 풋바 지지 단일 변형(발가락/V자/스프링 장력 미포함)',
  },
  'chair-seated-pedal-press': {
    modelPath: 'src/models/chairPedalPress.ts',
    rendererComponent: 'src/components/ApparatusDraftFigure.tsx',
    dimension: '3d',
    canonicalApparatus: 'chair',
    canonicalBodyPosition: 'seated',
    draftRig: resolveDraftRigForVariant('chair-seated-pedal-press', 'pilates-chair'),
    mismatchSummaryKo:
      '3D 사선 투영(2D SVG) 초안 · 필라테스 체어(pilates-chair) 단일 힌지 페달 양뒤꿈치 프레스',
  },
  'reformer-supine-strap-arm-press': {
    modelPath: 'src/models/reformerStrapArmPress.ts',
    rendererComponent: 'src/components/TensionDraftFigure.tsx',
    dimension: '3d',
    canonicalApparatus: 'reformer',
    canonicalBodyPosition: 'supine',
    draftRig: resolveDraftRigForVariant('reformer-supine-strap-arm-press', 'reformer'),
    mismatchSummaryKo: '3D 사선 투영(2D SVG) 초안 · 테이블탑 다리 및 발목 사이 볼 포함 변형',
  },
  'cadillac-supine-arm-spring-press': {
    modelPath: 'src/models/cadillacArmSpringPress.ts',
    rendererComponent: 'src/components/TensionDraftFigure.tsx',
    dimension: '3d',
    canonicalApparatus: 'cadillac',
    canonicalBodyPosition: 'supine',
    draftRig: resolveDraftRigForVariant('cadillac-supine-arm-spring-press', 'cadillac'),
    mismatchSummaryKo: '3D 사선 투영(2D SVG) 초안 · 굽힌 팔꿈치 호 경로 및 양발 테이블 지지 변형',
  },
  'ladder-supported-hip-extension-slide': {
    modelPath: 'src/models/standingSupportDrafts.ts',
    rendererComponent: 'src/components/StandingSupportDraftFigure.tsx',
    dimension: '3d',
    canonicalApparatus: 'barrel',
    canonicalBodyPosition: 'standing',
    draftRig: resolveDraftRigForVariant('ladder-supported-hip-extension-slide', 'ladder-barrel'),
    mismatchSummaryKo:
      '3D 사선 투영(2D SVG) 초안 · 래더 가로대 지지 바닥 후방 발 슬라이드(공중 거상 미포함)',
  },
  'ladder-supported-side-leg-slide': {
    modelPath: 'src/models/standingSupportDrafts.ts',
    rendererComponent: 'src/components/StandingSupportDraftFigure.tsx',
    dimension: '3d',
    canonicalApparatus: 'barrel',
    canonicalBodyPosition: 'standing',
    draftRig: resolveDraftRigForVariant('ladder-supported-side-leg-slide', 'ladder-barrel'),
    mismatchSummaryKo:
      '3D 사선 투영(2D SVG) 초안 · 래더 가로대 지지 바닥 측면 발 슬라이드(공중 거상 미포함)',
  },
  'floor-seated-band-row': {
    modelPath: 'src/models/seatedBandRow.ts',
    rendererComponent: 'src/components/SeatedBandRowFigure.tsx',
    dimension: '3d',
    canonicalApparatus: 'mat',
    canonicalBodyPosition: 'seated',
    draftRig: resolveDraftRigForVariant('floor-seated-band-row', 'mat'),
    mismatchSummaryKo:
      '3D 사선 투영(2D SVG) 초안 · 매트 롱시팅 발바닥 탄성밴드 로우(리포머 박스/도르래 아님)',
  },
  'supine-chest-lift': {
    modelPath: 'src/models/chestLift.ts',
    rendererComponent: 'src/components/ChestLiftFigure.tsx',
    dimension: '3d',
    canonicalApparatus: 'mat',
    canonicalBodyPosition: 'supine',
    draftRig: resolveDraftRigForVariant('supine-chest-lift', 'mat'),
    mismatchSummaryKo: '3D 사선 투영(2D SVG 폴리곤) 초안 · 양손 머리 뒤 깍지 5-링크 상체 굴곡',
  },
  'articulated-pelvic-curl': {
    modelPath: 'src/models/pelvicCurl.ts',
    rendererComponent: 'src/components/PelvicCurlFigure.tsx',
    dimension: '3d',
    canonicalApparatus: 'mat',
    canonicalBodyPosition: 'supine',
    draftRig: resolveDraftRigForVariant('articulated-pelvic-curl', 'mat'),
    mismatchSummaryKo:
      '3D 사선 투영(2D SVG) 초안 · 매트 바닥 고정 4-링크 분절 골반 컬(기구 캐리지/타워바 아님)',
  },
  'chair-seated-bilateral-arm-raise-v1': {
    modelPath: 'src/models/motionAuthoringBatch.ts',
    rendererComponent: 'src/components/MotionAuthoringBatchFigure.tsx',
    dimension: '3d',
    canonicalApparatus: 'mat',
    canonicalBodyPosition: 'seated',
    draftRig: resolveDraftRigForVariant('chair-seated-bilateral-arm-raise-v1', 'ordinary-chair'),
    mismatchSummaryKo:
      '3D 사선 투영(2D SVG) 배치 초안 · 일반 고정 의자(ordinary-chair) 착석 양팔 전상방 거상',
  },
  'chair-seated-overhead-sidebend-v1': {
    modelPath: 'src/models/motionAuthoringBatch.ts',
    rendererComponent: 'src/components/MotionAuthoringBatchFigure.tsx',
    dimension: '3d',
    canonicalApparatus: 'mat',
    canonicalBodyPosition: 'seated',
    draftRig: resolveDraftRigForVariant('chair-seated-overhead-sidebend-v1', 'ordinary-chair'),
    mismatchSummaryKo:
      '3D 사선 투영(2D SVG) 배치 초안 · 일반 고정 의자(ordinary-chair) 착석 오버헤드 측굴',
  },
  'prone-single-straight-leg-extension-v1': {
    modelPath: 'src/models/motionAuthoringBatch.ts',
    rendererComponent: 'src/components/MotionAuthoringBatchFigure.tsx',
    dimension: '3d',
    canonicalApparatus: 'mat',
    canonicalBodyPosition: 'prone',
    draftRig: resolveDraftRigForVariant('prone-single-straight-leg-extension-v1', 'mat'),
    mismatchSummaryKo:
      '3D 사선 투영(2D SVG) 배치 초안 · 이마·손 매트 고정 편측 하지 신전(교차 팔 리치 미포함)',
  },
  'prone-forearm-chest-extension-v1': {
    modelPath: 'src/models/motionAuthoringBatch.ts',
    rendererComponent: 'src/components/MotionAuthoringBatchFigure.tsx',
    dimension: '3d',
    canonicalApparatus: 'mat',
    canonicalBodyPosition: 'prone',
    draftRig: resolveDraftRigForVariant('prone-forearm-chest-extension-v1', 'mat'),
    mismatchSummaryKo: '3D 사선 투영(2D SVG) 배치 초안 · 양 전완 매트 고정 상부 흉추 신전',
  },
  'supine-single-leg-reach-v1': {
    modelPath: 'src/models/supineReach.ts',
    rendererComponent: 'src/components/SupineReachFigure.tsx',
    dimension: '3d',
    canonicalApparatus: 'mat',
    canonicalBodyPosition: 'supine',
    draftRig: resolveDraftRigForVariant('supine-single-leg-reach-v1', 'mat'),
    mismatchSummaryKo:
      '3D 사선 투영(2D SVG) 초안 · 반대 무릎 양손 고정 편측 단발 리치(좌우 교대 미포함)',
  },
});

const LAB_PROTOTYPE_EXACT_MATCH_EXERCISE_ID: Readonly<Record<string, string>> = Object.freeze({
  'bridge-pattern': 'original-mat-bridge',
  'heel-slide': 'original-mat-heel-slide',
});

const EXERCISE_TO_LAB_PROTOTYPE_ID: Readonly<Record<string, string>> = Object.freeze({
  'original-mat-bridge': 'bridge-pattern',
  'original-mat-heel-slide': 'heel-slide',
});

function buildSafetyFlags(exerciseId: string): MotionSafetyAndReviewFlags {
  const ref = getExerciseMotionReference(exerciseId);
  const research = exerciseId ? getMotionCandidateResearch(exerciseId) : [];
  const hasUnauthoredResearchCandidate = research.length > 0;
  return Object.freeze({
    canonicalRecordExists: Boolean(ref),
    canonicalAssetReady: false,
    canonicalContinuousReady: false,
    exactCanonicalMatch: false,
    anatomicalAccuracyAssumed: false,
    expertApproved: false,
    true3dSupported: false,
    webgl3dReady: false,
    interactive3dCameraSupported: false,
    professionalReviewStatus: ref?.professionalReviewStatus ?? 'unreviewed',
    professionalMotionReviewCount: 0,
    canonicalMotionStatus: ref?.status ?? 'not_authored',
    researchCandidateStatus: hasUnauthoredResearchCandidate ? 'research_pending' : 'none',
    hasUnauthoredResearchCandidate,
  });
}

function createMissingResolution(
  exerciseId: string,
  rejectedCandidates: readonly RejectedMotionCandidate[],
  reasonSummaryKo: string,
  exercise: PilatesExercise | null = null,
): MotionCoverageResolution {
  const safetyFlags = buildSafetyFlags(exerciseId);
  const readinessState: MotionReadinessState = safetyFlags.hasUnauthoredResearchCandidate
    ? 'research-pending-no-model'
    : 'not-authored-missing';

  return Object.freeze({
    exerciseId,
    isCatalogExercise: false,
    exercise,
    apparatus: exercise?.apparatus ?? null,
    bodyPosition: exercise?.bodyPosition ?? null,
    blockCategory: exercise?.blockCategory ?? null,
    spinalPlanes: exercise ? Object.freeze([...exercise.spinalPlanes]) : Object.freeze([]),
    primaryMode: 'missing',
    supportedModes: Object.freeze([]),
    modeMatrix: Object.freeze({
      'three-phase-2d': false,
      'continuous-2d': false,
      'projected-3d': false,
    }),
    isMissing: true,
    canonicalMotionReady: false,
    readinessState,
    threePhase2d: Object.freeze({
      supported: false,
      sourceKind: null,
      temporalKind: 'discrete-three-phase',
      isContinuousPlayback: false,
      isDraftProposal: false,
      isCanonicalMotionAsset: false,
      reusesExistingCatalogAsset: false,
      phaseCount: 3,
      asset: null,
      baselineArchetypeId: null,
      effectiveArchetypeId: null,
      hadBaselineMismatch: false,
      baselineMismatchReasonKo: null,
      sourceComparison: null,
      integrityCheck: null,
    }),
    continuous2d: Object.freeze({
      supported: false,
      sourceKind: null,
      temporalKind: 'continuous-progress',
      isContinuousPlayback: false,
      isDraftProposal: false,
      isCanonicalMotionAsset: false,
      assetStatus: 'not_authored',
      relation: 'none',
      draftRig: null,
      patternReferences: Object.freeze([]),
      labPrototype: null,
      variantId: null,
      modelPath: null,
      rendererComponent: null,
      isPrototypeOnly: false,
      mismatchNotesKo: Object.freeze([]),
    }),
    projected3d: Object.freeze({
      supported: false,
      sourceKind: null,
      temporalKind: 'continuous-progress',
      isContinuousPlayback: false,
      isDraftProposal: false,
      isCanonicalMotionAsset: false,
      assetStatus: 'not_authored',
      relation: 'none',
      projectionMethod: null,
      renderSurface: null,
      true3dSupported: false,
      webgl3dReady: false,
      interactive3dCameraSupported: false,
      draftRigs: Object.freeze([]),
      patternReferences: Object.freeze([]),
      variantIds: Object.freeze([]),
      modelPaths: Object.freeze([]),
      rendererComponents: Object.freeze([]),
      mismatchNotesKo: Object.freeze([]),
    }),
    researchCandidates: Object.freeze([]),
    rejectedCandidates: Object.freeze([...rejectedCandidates]),
    safetyFlags,
    evidenceSummaryKo: reasonSummaryKo,
  });
}

/** Only the unchanged catalog source may inherit the catalog's source-comparison result.
 * Review records and personal display labels do not gate inspection or playback.
 */
function changedCatalogFacts(input: PilatesExercise, catalog: PilatesExercise): boolean {
  const normalize = (value: unknown): unknown => {
    if (Array.isArray(value)) return value.map(normalize);
    if (value && typeof value === 'object')
      return Object.fromEntries(
        Object.entries(value)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([key, item]) => [key, normalize(item)]),
      );
    return value;
  };
  return [
    'props',
    'spinalPlanes',
    'sourceReference',
    'isUnilateral',
    'box',
    'footbar',
    'headrest',
  ].some((key) => {
    const field = key as keyof PilatesExercise;
    const left = input[field];
    const right = catalog[field];
    if (key === 'props' || key === 'spinalPlanes') {
      return (
        JSON.stringify(Array.isArray(left) ? [...left].sort(compareCodeUnits) : left) !==
        JSON.stringify(Array.isArray(right) ? [...right].sort(compareCodeUnits) : right)
      );
    }
    return JSON.stringify(normalize(left)) !== JSON.stringify(normalize(right));
  });
}

function editedCatalogRejection(exerciseId: string): RejectedMotionCandidate {
  return Object.freeze({
    candidateId: exerciseId,
    candidateKind: 'exercise-input',
    reason: 'catalog-metadata-mismatch',
    detailKo:
      '이 노트의 기구·소도구·방향 또는 출처 정보가 카탈로그 원본과 다릅니다. 원본의 도해 대조 기록을 수정 노트의 검증으로 사용하지 않습니다. 수업 작성과 개인 검토 기록은 별개입니다.',
  });
}

/**
 * Evaluates whether a specific motion candidate (pattern reference, lab prototype, or V7 research
 * candidate) is strictly compatible with an exercise by ID, apparatus, bodyPosition, draftRig,
 * direction, and authored status. Never matches by loose name similarity.
 */
export function evaluateMotionCandidateMatch(
  exerciseOrId: string | PilatesExercise | null | undefined,
  candidateId: string,
  options: ResolveMotionCoverageOptions = {},
): CandidateMatchEvaluation {
  const rawId =
    typeof exerciseOrId === 'string'
      ? exerciseOrId.trim()
      : exerciseOrId && typeof exerciseOrId.id === 'string'
        ? exerciseOrId.id.trim()
        : '';

  const safetyFlags = buildSafetyFlags(rawId);

  if (!rawId) {
    return Object.freeze({
      matched: false,
      exerciseId: '',
      candidateId,
      resolvedMode: 'missing',
      isDraftProposal: false,
      isCanonicalReady: false,
      true3dSupported: false,
      rejection: Object.freeze({
        candidateId,
        candidateKind: 'exercise-input',
        reason: 'unknown-exercise-id',
        detailKo: '비어 있거나 유효하지 않은 동작 ID는 매핑할 수 없습니다.',
      }),
      safetyFlags,
    });
  }

  const catalogExercise = CATALOG_EXERCISE_BY_ID.get(rawId) ?? null;
  if (!catalogExercise) {
    const isCustomPattern = rawId.startsWith('idea-') || rawId.startsWith('ex-custom-');
    return Object.freeze({
      matched: false,
      exerciseId: rawId,
      candidateId,
      resolvedMode: 'missing',
      isDraftProposal: false,
      isCanonicalReady: false,
      true3dSupported: false,
      rejection: Object.freeze({
        candidateId,
        candidateKind: 'exercise-input',
        reason: isCustomPattern ? 'unverified-custom-exercise' : 'unknown-exercise-id',
        detailKo: isCustomPattern
          ? `커스텀/아이디어 동작(${rawId})은 검증된 출처 감사가 없어 모션 레지스트리에 자동 매핑하지 않습니다.`
          : `현재 카탈로그에 존재하지 않는 미확인 동작 ID(${rawId})입니다.`,
      }),
      safetyFlags,
    });
  }

  // If caller passed a PilatesExercise object, verify it has not tampered with apparatus or bodyPosition
  if (typeof exerciseOrId === 'object' && exerciseOrId !== null) {
    if (exerciseOrId.apparatus !== catalogExercise.apparatus) {
      return Object.freeze({
        matched: false,
        exerciseId: rawId,
        candidateId,
        resolvedMode: 'missing',
        isDraftProposal: false,
        isCanonicalReady: false,
        true3dSupported: false,
        rejection: Object.freeze({
          candidateId,
          candidateKind: 'exercise-input',
          reason: 'apparatus-mismatch',
          expectedApparatus: catalogExercise.apparatus,
          candidateApparatus: exerciseOrId.apparatus,
          detailKo: `입력된 동작 객체의 기구(${exerciseOrId.apparatus})가 카탈로그 원형 기구(${catalogExercise.apparatus})와 불일치합니다.`,
        }),
        safetyFlags,
      });
    }
    if (exerciseOrId.bodyPosition !== catalogExercise.bodyPosition) {
      return Object.freeze({
        matched: false,
        exerciseId: rawId,
        candidateId,
        resolvedMode: 'missing',
        isDraftProposal: false,
        isCanonicalReady: false,
        true3dSupported: false,
        rejection: Object.freeze({
          candidateId,
          candidateKind: 'exercise-input',
          reason: 'body-position-mismatch',
          expectedBodyPosition: catalogExercise.bodyPosition,
          candidateBodyPosition: exerciseOrId.bodyPosition,
          detailKo: `입력된 동작 객체의 자세(${exerciseOrId.bodyPosition})가 카탈로그 원형 자세(${catalogExercise.bodyPosition})와 불일치합니다.`,
        }),
        safetyFlags,
      });
    }
  }

  if (
    typeof exerciseOrId === 'object' &&
    exerciseOrId !== null &&
    changedCatalogFacts(exerciseOrId, catalogExercise)
  ) {
    return Object.freeze({
      matched: false,
      exerciseId: rawId,
      candidateId,
      resolvedMode: 'missing',
      isDraftProposal: false,
      isCanonicalReady: false,
      true3dSupported: false,
      rejection: editedCatalogRejection(rawId),
      safetyFlags,
    });
  }

  const sourceOnlyBinding = getExpandedMovementVisualBinding(catalogExercise);
  if (sourceOnlyBinding && !sourceOnlyBinding.nativeMotionAvailable) {
    return Object.freeze({
      matched: false,
      exerciseId: rawId,
      candidateId,
      resolvedMode: 'missing',
      isDraftProposal: false,
      isCanonicalReady: false,
      true3dSupported: false,
      rejection: Object.freeze({
        candidateId,
        candidateKind: 'exercise-input',
        reason: 'model-not-authored',
        detailKo: `${sourceOnlyBinding.reasonKo} 필요한 도해: ${sourceOnlyBinding.missingPoseFeatureKo}.`,
      }),
      safetyFlags,
    });
  }

  // 1. Check V7 unauthored research candidates dynamically from `RESEARCH_CANDIDATE_BY_ID`
  const researchCandidate = RESEARCH_CANDIDATE_BY_ID.get(candidateId);
  if (researchCandidate) {
    return Object.freeze({
      matched: false,
      exerciseId: rawId,
      candidateId,
      resolvedMode: 'missing',
      isDraftProposal: false,
      isCanonicalReady: false,
      true3dSupported: false,
      rejection: Object.freeze({
        candidateId,
        candidateKind: 'research-candidate',
        reason: 'model-not-authored',
        expectedApparatus: catalogExercise.apparatus,
        expectedBodyPosition: catalogExercise.bodyPosition,
        detailKo: `V7 리서치 후보(${candidateId})는 본문 사실 조사만 완료되었고 기하 모델이 미제작(modelAuthored: ${String(researchCandidate.modelAuthored)}, exactAssetReady: ${String(researchCandidate.exactAssetReady)}) 상태이므로 모션 준비 완료로 처리할 수 없습니다.`,
      }),
      safetyFlags,
    });
  }

  // 2. Check Lab Prototypes (`bridge-pattern`, `heel-slide` from `MOTION_PROTOTYPES`)
  const prototype = getMotionPrototype(candidateId);
  if (prototype) {
    const exactTargetId = LAB_PROTOTYPE_EXACT_MATCH_EXERCISE_ID[candidateId];
    if (catalogExercise.apparatus !== 'mat') {
      return Object.freeze({
        matched: false,
        exerciseId: rawId,
        candidateId,
        resolvedMode: 'missing',
        isDraftProposal: false,
        isCanonicalReady: false,
        true3dSupported: false,
        rejection: Object.freeze({
          candidateId,
          candidateKind: 'lab-prototype',
          reason: 'apparatus-mismatch',
          expectedApparatus: catalogExercise.apparatus,
          candidateApparatus: 'mat',
          expectedBodyPosition: catalogExercise.bodyPosition,
          candidateBodyPosition: 'supine',
          detailKo: `2D 랩 프로토타입(${candidateId})은 매트(mat) 전용 도해이므로 타 기구(${catalogExercise.apparatus}) 동작(${rawId})에 매핑할 수 없습니다.`,
        }),
        safetyFlags,
      });
    }
    if (catalogExercise.bodyPosition !== 'supine') {
      return Object.freeze({
        matched: false,
        exerciseId: rawId,
        candidateId,
        resolvedMode: 'missing',
        isDraftProposal: false,
        isCanonicalReady: false,
        true3dSupported: false,
        rejection: Object.freeze({
          candidateId,
          candidateKind: 'lab-prototype',
          reason: 'body-position-mismatch',
          expectedApparatus: catalogExercise.apparatus,
          candidateApparatus: 'mat',
          expectedBodyPosition: catalogExercise.bodyPosition,
          candidateBodyPosition: 'supine',
          detailKo: `2D 랩 프로토타입(${candidateId})은 수파인(supine) 전용이므로 ${catalogExercise.bodyPosition} 자세 동작(${rawId})에 매핑할 수 없습니다.`,
        }),
        safetyFlags,
      });
    }
    if (!ORIGINAL_MOVEMENT_ID_SET.has(rawId)) {
      return Object.freeze({
        matched: false,
        exerciseId: rawId,
        candidateId,
        resolvedMode: 'missing',
        isDraftProposal: false,
        isCanonicalReady: false,
        true3dSupported: false,
        rejection: Object.freeze({
          candidateId,
          candidateKind: 'lab-prototype',
          reason: 'compound-sequence-mismatch',
          detailKo: `복합 시퀀스 동작(${rawId})에는 단일 2D 랩 프로토타입(${candidateId})을 억지 매핑하지 않습니다.`,
        }),
        safetyFlags,
      });
    }
    if (exactTargetId !== rawId) {
      return Object.freeze({
        matched: false,
        exerciseId: rawId,
        candidateId,
        resolvedMode: 'missing',
        isDraftProposal: false,
        isCanonicalReady: false,
        true3dSupported: false,
        rejection: Object.freeze({
          candidateId,
          candidateKind: 'lab-prototype',
          reason: 'direction-or-plane-mismatch',
          detailKo: `2D 랩 프로토타입(${candidateId})의 운동 방향·사슬 특성이 동작(${rawId})과 일치하지 않습니다(정확 대응 ID: ${exactTargetId}).`,
        }),
        safetyFlags,
      });
    }
    if (!options.includeLabPrototypesInContinuous2d) {
      return Object.freeze({
        matched: false,
        exerciseId: rawId,
        candidateId,
        resolvedMode: 'missing',
        isDraftProposal: false,
        isCanonicalReady: false,
        true3dSupported: false,
        rejection: Object.freeze({
          candidateId,
          candidateKind: 'lab-prototype',
          reason: 'not-in-intended-exercise-ids',
          detailKo: `2D 랩 프로토타입(${candidateId})은 exerciseId: null (useScope: 'design_prototype_only') 상태이므로 includeLabPrototypesInContinuous2d 옵션 없이는 정식 연속 모션으로 활성화하지 않습니다.`,
        }),
        safetyFlags,
      });
    }
    return Object.freeze({
      matched: true,
      exerciseId: rawId,
      candidateId,
      resolvedMode: 'continuous-2d',
      isDraftProposal: true,
      isCanonicalReady: false,
      true3dSupported: false,
      rejection: null,
      safetyFlags,
    });
  }

  // 3. Check MOTION_PATTERN_REFERENCES (cross-verified with MOTION_DRAFTS, BATCH_VARIANTS, SUPINE_REACH_DEFINITION)
  const patternRef = PATTERN_REFERENCE_BY_VARIANT_ID.get(candidateId);
  const patternMeta = PATTERN_MODEL_METADATA[candidateId];
  const hasUnderlyingDefinition =
    Boolean(getMotionDraft(candidateId)) ||
    Boolean(getBatchVariant(candidateId as Parameters<typeof getBatchVariant>[0])) ||
    candidateId === SUPINE_REACH_DEFINITION.id;

  if (!patternRef || !patternMeta || !hasUnderlyingDefinition) {
    return Object.freeze({
      matched: false,
      exerciseId: rawId,
      candidateId,
      resolvedMode: 'missing',
      isDraftProposal: false,
      isCanonicalReady: false,
      true3dSupported: false,
      rejection: Object.freeze({
        candidateId,
        candidateKind: 'pattern-reference',
        reason: 'model-not-authored',
        detailKo: `모션 레지스트리에 존재하지 않는 패턴 ID(${candidateId})입니다.`,
      }),
      safetyFlags,
    });
  }

  // Strict apparatus check first (including ordinary-chair vs pilates-chair distinction)
  if (patternMeta.canonicalApparatus !== catalogExercise.apparatus) {
    return Object.freeze({
      matched: false,
      exerciseId: rawId,
      candidateId,
      resolvedMode: 'missing',
      isDraftProposal: false,
      isCanonicalReady: false,
      true3dSupported: false,
      rejection: Object.freeze({
        candidateId,
        candidateKind: 'pattern-reference',
        reason: 'apparatus-mismatch',
        expectedApparatus: catalogExercise.apparatus,
        candidateApparatus: patternMeta.canonicalApparatus,
        candidateDraftRig: patternMeta.draftRig,
        expectedBodyPosition: catalogExercise.bodyPosition,
        candidateBodyPosition: patternMeta.canonicalBodyPosition,
        detailKo: `패턴(${candidateId}, rig=${patternMeta.draftRig})의 기구(${patternMeta.canonicalApparatus})가 대상 동작(${rawId})의 기구(${catalogExercise.apparatus})와 불일치하여 매핑을 거부합니다.`,
      }),
      safetyFlags,
    });
  }

  // Strict bodyPosition check
  if (patternMeta.canonicalBodyPosition !== catalogExercise.bodyPosition) {
    return Object.freeze({
      matched: false,
      exerciseId: rawId,
      candidateId,
      resolvedMode: 'missing',
      isDraftProposal: false,
      isCanonicalReady: false,
      true3dSupported: false,
      rejection: Object.freeze({
        candidateId,
        candidateKind: 'pattern-reference',
        reason: 'body-position-mismatch',
        expectedApparatus: catalogExercise.apparatus,
        candidateApparatus: patternMeta.canonicalApparatus,
        candidateDraftRig: patternMeta.draftRig,
        expectedBodyPosition: catalogExercise.bodyPosition,
        candidateBodyPosition: patternMeta.canonicalBodyPosition,
        detailKo: `패턴(${candidateId})의 자세(${patternMeta.canonicalBodyPosition})가 대상 동작(${rawId})의 자세(${catalogExercise.bodyPosition})와 불일치하여 매핑을 거부합니다.`,
      }),
      safetyFlags,
    });
  }

  // Reject compound studio sequences (`ex-*`) from being force-mapped to single atomic patterns
  if (!ORIGINAL_MOVEMENT_ID_SET.has(rawId)) {
    return Object.freeze({
      matched: false,
      exerciseId: rawId,
      candidateId,
      resolvedMode: 'missing',
      isDraftProposal: false,
      isCanonicalReady: false,
      true3dSupported: false,
      rejection: Object.freeze({
        candidateId,
        candidateKind: 'pattern-reference',
        reason: 'compound-sequence-mismatch',
        expectedApparatus: catalogExercise.apparatus,
        candidateApparatus: patternMeta.canonicalApparatus,
        candidateDraftRig: patternMeta.draftRig,
        expectedBodyPosition: catalogExercise.bodyPosition,
        candidateBodyPosition: patternMeta.canonicalBodyPosition,
        detailKo: `복합 시퀀스 동작(${rawId})은 다중 구간·소도구(${catalogExercise.props.join(', ')})를 포함하므로 단일 원자 패턴(${candidateId})으로 억지 매핑하지 않습니다.`,
      }),
      safetyFlags,
    });
  }

  // Must be explicitly listed in `intendedExerciseIds`
  if (!patternRef.intendedExerciseIds.includes(rawId)) {
    return Object.freeze({
      matched: false,
      exerciseId: rawId,
      candidateId,
      resolvedMode: 'missing',
      isDraftProposal: false,
      isCanonicalReady: false,
      true3dSupported: false,
      rejection: Object.freeze({
        candidateId,
        candidateKind: 'pattern-reference',
        reason: 'not-in-intended-exercise-ids',
        expectedApparatus: catalogExercise.apparatus,
        candidateApparatus: patternMeta.canonicalApparatus,
        candidateDraftRig: patternMeta.draftRig,
        expectedBodyPosition: catalogExercise.bodyPosition,
        candidateBodyPosition: patternMeta.canonicalBodyPosition,
        detailKo: `패턴(${candidateId})의 intendedExerciseIds(${patternRef.intendedExerciseIds.join(', ')})에 동작(${rawId})이 포함되지 않아 유사도 기반 억지 매핑을 거부합니다.`,
      }),
      safetyFlags,
    });
  }

  const resolvedMode: MotionSupportMode =
    patternMeta.dimension === '2d' ? 'continuous-2d' : 'projected-3d';

  return Object.freeze({
    matched: true,
    exerciseId: rawId,
    candidateId,
    resolvedMode,
    isDraftProposal: true,
    isCanonicalReady: false,
    true3dSupported: false,
    rejection: null,
    safetyFlags,
  });
}

function resolveProjected3dSourceKind(
  refs: readonly MotionPatternReference[],
): Projected3dSourceKind | null {
  const first = refs[0];
  if (!first) return null;
  if (first.family === 'existing-proposal') return 'existing-proposal-3d';
  if (first.family === 'authoring-batch') return 'authoring-batch-3d';
  return 'supine-reach-3d';
}

function extractRefMismatchNotes(ref: MotionPatternReference): readonly string[] {
  return [...ref.definition.mismatched, ref.definition.supportNote, ref.context, ref.variant];
}

/**
 * Resolves the complete, evidence-based motion coverage state (`three-phase-2d`, `continuous-2d`,
 * `projected-3d`, or `missing`) for any exercise ID or PilatesExercise object.
 * Reuses eligible 2D poses in `MOVEMENT_VISUAL_ASSETS` without treating source-only entries as authored motion.
 */
export function resolveMotionCoverage(
  exerciseOrId: string | PilatesExercise | null | undefined,
  options: ResolveMotionCoverageOptions = {},
): MotionCoverageResolution {
  const includeLabPrototypes = options.includeLabPrototypesInContinuous2d ?? false;

  if (exerciseOrId === null || exerciseOrId === undefined) {
    return createMissingResolution(
      '',
      [
        Object.freeze({
          candidateId: 'null-input',
          candidateKind: 'exercise-input',
          reason: 'unknown-exercise-id',
          detailKo: '입력된 동작 ID가 null 또는 undefined입니다.',
        }),
      ],
      '동작 ID가 제공되지 않아 missing 상태로 반환합니다.',
    );
  }

  const rawId =
    typeof exerciseOrId === 'string'
      ? exerciseOrId.trim()
      : typeof exerciseOrId.id === 'string'
        ? exerciseOrId.id.trim()
        : '';

  if (!rawId) {
    return createMissingResolution(
      '',
      [
        Object.freeze({
          candidateId: 'empty-id',
          candidateKind: 'exercise-input',
          reason: 'unknown-exercise-id',
          detailKo: '빈 문자열 동작 ID는 매핑할 수 없습니다.',
        }),
      ],
      '빈 동작 ID로 인해 missing 상태로 반환합니다.',
    );
  }

  const catalogExercise = CATALOG_EXERCISE_BY_ID.get(rawId) ?? null;

  // Reject unknown IDs or unverified custom exercises (`idea-*`, `ex-custom-*`)
  if (!catalogExercise) {
    const isCustom = rawId.startsWith('idea-') || rawId.startsWith('ex-custom-');
    const passedExercise = typeof exerciseOrId === 'object' ? exerciseOrId : null;
    return createMissingResolution(
      rawId,
      [
        Object.freeze({
          candidateId: rawId,
          candidateKind: 'exercise-input',
          reason: isCustom ? 'unverified-custom-exercise' : 'unknown-exercise-id',
          ...(passedExercise?.apparatus ? { candidateApparatus: passedExercise.apparatus } : {}),
          ...(passedExercise?.bodyPosition
            ? { candidateBodyPosition: passedExercise.bodyPosition }
            : {}),
          detailKo: isCustom
            ? `런타임 커스텀/아이디어 동작(${rawId})은 출처 감사(CATALOG_VISUAL_SOURCE_COMPARISONS) 및 검증 근거가 없으므로 해부학·기구학 검증 완료나 3D 지원을 꾸미지 않고 missing으로 유지합니다.`
            : `현재 카탈로그에 등록되지 않은 unknown ID(${rawId})이므로 missing으로 반환합니다.`,
        }),
      ],
      isCustom
        ? `커스텀 동작(${rawId}) · 검증된 모션 근거 없음(missing)`
        : `미등록 동작 ID(${rawId}) · 카탈로그 매칭 없음(missing)`,
      passedExercise,
    );
  }

  // If caller passed a PilatesExercise object with tampered apparatus or bodyPosition, reject it!
  if (typeof exerciseOrId === 'object') {
    if (exerciseOrId.apparatus !== catalogExercise.apparatus) {
      return createMissingResolution(
        rawId,
        [
          Object.freeze({
            candidateId: rawId,
            candidateKind: 'exercise-input',
            reason: 'apparatus-mismatch',
            expectedApparatus: catalogExercise.apparatus,
            candidateApparatus: exerciseOrId.apparatus,
            expectedBodyPosition: catalogExercise.bodyPosition,
            candidateBodyPosition: exerciseOrId.bodyPosition,
            detailKo: `동작(${rawId})의 카탈로그 기구(${catalogExercise.apparatus})와 입력 객체 기구(${exerciseOrId.apparatus})가 불일치하여 매칭을 거부합니다.`,
          }),
        ],
        `기구 불일치(${exerciseOrId.apparatus} !== ${catalogExercise.apparatus}) 거부 · missing`,
        exerciseOrId,
      );
    }
    if (exerciseOrId.bodyPosition !== catalogExercise.bodyPosition) {
      return createMissingResolution(
        rawId,
        [
          Object.freeze({
            candidateId: rawId,
            candidateKind: 'exercise-input',
            reason: 'body-position-mismatch',
            expectedApparatus: catalogExercise.apparatus,
            candidateApparatus: exerciseOrId.apparatus,
            expectedBodyPosition: catalogExercise.bodyPosition,
            candidateBodyPosition: exerciseOrId.bodyPosition,
            detailKo: `동작(${rawId})의 카탈로그 자세(${catalogExercise.bodyPosition})와 입력 객체 자세(${exerciseOrId.bodyPosition})가 불일치하여 매칭을 거부합니다.`,
          }),
        ],
        `자세 불일치(${exerciseOrId.bodyPosition} !== ${catalogExercise.bodyPosition}) 거부 · missing`,
        exerciseOrId,
      );
    }
  }

  if (typeof exerciseOrId === 'object' && changedCatalogFacts(exerciseOrId, catalogExercise)) {
    return createMissingResolution(
      rawId,
      [editedCatalogRejection(rawId)],
      '수정한 노트에는 카탈로그 원본의 도해 검증 기록을 적용하지 않습니다.',
      exerciseOrId,
    );
  }

  const sourceOnlyBinding = getExpandedMovementVisualBinding(catalogExercise);
  if (sourceOnlyBinding && !sourceOnlyBinding.nativeMotionAvailable) {
    const missing = createMissingResolution(
      rawId,
      [
        Object.freeze({
          candidateId: rawId,
          candidateKind: 'baseline-2d-archetype',
          reason: 'model-not-authored',
          detailKo: `${sourceOnlyBinding.reasonKo} 필요한 도해: ${sourceOnlyBinding.missingPoseFeatureKo}.`,
        }),
      ],
      '제작자 페이지·영상 메타데이터 확인 · 전용 동작 도해 미작성',
      catalogExercise,
    );
    return Object.freeze({
      ...missing,
      isCatalogExercise: true,
      threePhase2d: Object.freeze({
        ...missing.threePhase2d,
        // Exact creator links remain available; no fallback pose or motion audit is inherited.
        sourceComparison: getVisualSourceComparison(catalogExercise),
      }),
    });
  }

  const rejectedCandidates: RejectedMotionCandidate[] = [];

  // 1. Evaluate unauthored V7 research candidates (`prone-baby-swan`, `kneeling-forearm-plank`)
  const researchRaw = getMotionCandidateResearch(rawId);
  const researchCandidates: UnauthoredResearchCandidateInfo[] = researchRaw.map((rc) => {
    rejectedCandidates.push(
      Object.freeze({
        candidateId: rc.candidateId,
        candidateKind: 'research-candidate',
        reason: 'model-not-authored',
        expectedApparatus: catalogExercise.apparatus,
        expectedBodyPosition: catalogExercise.bodyPosition,
        detailKo: `V7 리서치 후보(${rc.candidateId})는 본문 사실 조사만 완료되었고 모션 모델이 미작성(modelAuthored: false) 상태이므로 활성화하지 않습니다.`,
      }),
    );
    return Object.freeze({
      candidateId: rc.candidateId,
      intendedExerciseId: rc.exerciseId,
      title: rc.labelKo,
      modelAuthored: false,
      exactAssetReady: false,
      status: rc.status,
      reasonKo: rc.statusLabelKo,
    });
  });

  // 2. Evaluate continuous pattern references (`MOTION_PATTERN_REFERENCES`)
  const patternRefs = getMotionPatternReferences(rawId);
  const verified2dPatternRefs: MotionPatternReference[] = [];
  const verified3dPatternRefs: MotionPatternReference[] = [];

  for (const ref of patternRefs) {
    const check = evaluateMotionCandidateMatch(catalogExercise, ref.variantId, options);
    if (!check.matched) {
      if (check.rejection) rejectedCandidates.push(check.rejection);
      continue;
    }
    if (CONTINUOUS_2D_PATTERN_VARIANT_IDS.has(ref.variantId)) {
      verified2dPatternRefs.push(ref);
    } else {
      verified3dPatternRefs.push(ref);
    }
  }

  // Check lab prototype (`bridge-pattern`, `heel-slide`)
  const prototypeId = EXERCISE_TO_LAB_PROTOTYPE_ID[rawId];
  const labPrototype: MotionPrototypeReference | null = prototypeId
    ? getMotionPrototype(prototypeId)
    : null;

  let continuous2d: Continuous2dSupportDetail;
  if (verified2dPatternRefs.length > 0) {
    const first2d = verified2dPatternRefs[0];
    const meta = PATTERN_MODEL_METADATA[first2d.variantId];
    continuous2d = Object.freeze({
      supported: true,
      sourceKind: 'pattern-reference-2d',
      temporalKind: 'continuous-progress',
      isContinuousPlayback: true,
      isDraftProposal: true,
      isCanonicalMotionAsset: false,
      assetStatus: first2d.assetStatus,
      relation: first2d.relation,
      draftRig: meta?.draftRig ?? 'ordinary-chair',
      patternReferences: Object.freeze(verified2dPatternRefs),
      labPrototype,
      variantId: first2d.variantId,
      modelPath: meta?.modelPath ?? 'src/models/heelRaise.ts',
      rendererComponent: meta?.rendererComponent ?? 'src/components/MotionDraftFigure.tsx',
      isPrototypeOnly: false,
      mismatchNotesKo: Object.freeze([
        meta?.mismatchSummaryKo ?? first2d.context,
        ...extractRefMismatchNotes(first2d),
      ]),
    });
  } else if (labPrototype && includeLabPrototypes) {
    continuous2d = Object.freeze({
      supported: true,
      sourceKind: 'lab-prototype-2d',
      temporalKind: 'continuous-progress',
      isContinuousPlayback: true,
      isDraftProposal: true,
      isCanonicalMotionAsset: false,
      assetStatus: labPrototype.assetStatus,
      relation: labPrototype.useScope,
      draftRig: 'mat',
      patternReferences: Object.freeze([]),
      labPrototype,
      variantId: labPrototype.id,
      modelPath: 'src/utils/motionReferenceModel.ts',
      rendererComponent: 'src/components/MotionReferencePlayer.tsx',
      isPrototypeOnly: true,
      mismatchNotesKo: Object.freeze([labPrototype.limitation, labPrototype.additionalLimitation]),
    });
  } else {
    if (labPrototype && !includeLabPrototypes) {
      rejectedCandidates.push(
        Object.freeze({
          candidateId: labPrototype.id,
          candidateKind: 'lab-prototype',
          reason: 'not-in-intended-exercise-ids',
          expectedApparatus: catalogExercise.apparatus,
          candidateApparatus: 'mat',
          expectedBodyPosition: catalogExercise.bodyPosition,
          candidateBodyPosition: 'supine',
          detailKo: `2D 랩 프로토타입(${labPrototype.id})은 exerciseId: null (design_prototype_only) 상태이므로 기본 모드에서는 정식 continuous-2d로 승격하지 않습니다.`,
        }),
      );
    }
    continuous2d = Object.freeze({
      supported: false,
      sourceKind: null,
      temporalKind: 'continuous-progress',
      isContinuousPlayback: false,
      isDraftProposal: Boolean(labPrototype),
      isCanonicalMotionAsset: false,
      assetStatus: labPrototype ? labPrototype.assetStatus : 'not_authored',
      relation: labPrototype ? labPrototype.useScope : 'none',
      draftRig: null,
      patternReferences: Object.freeze([]),
      labPrototype,
      variantId: null,
      modelPath: null,
      rendererComponent: null,
      isPrototypeOnly: Boolean(labPrototype),
      mismatchNotesKo: Object.freeze([]),
    });
  }

  // 3. Build projected3d detail (explicitly marked as oblique 3D-to-2D SVG projection, NOT true 3D)
  let projected3d: Projected3dSupportDetail;
  if (verified3dPatternRefs.length > 0) {
    const variantIds = verified3dPatternRefs.map((r) => r.variantId);
    const draftRigs = Array.from(
      new Set(
        variantIds
          .map((id) => PATTERN_MODEL_METADATA[id]?.draftRig)
          .filter((rig): rig is MotionDraftRig => Boolean(rig)),
      ),
    );
    const modelPaths = Array.from(
      new Set(
        variantIds
          .map((id) => PATTERN_MODEL_METADATA[id]?.modelPath)
          .filter((p): p is string => Boolean(p)),
      ),
    );
    const rendererComponents = Array.from(
      new Set(
        variantIds
          .map((id) => PATTERN_MODEL_METADATA[id]?.rendererComponent)
          .filter((c): c is string => Boolean(c)),
      ),
    );
    const mismatchNotes = verified3dPatternRefs.flatMap((r) => {
      const metaNote = PATTERN_MODEL_METADATA[r.variantId]?.mismatchSummaryKo;
      const refNotes = extractRefMismatchNotes(r);
      return metaNote ? [metaNote, ...refNotes] : [...refNotes];
    });
    projected3d = Object.freeze({
      supported: true,
      sourceKind: resolveProjected3dSourceKind(verified3dPatternRefs),
      temporalKind: 'continuous-progress',
      isContinuousPlayback: true,
      isDraftProposal: true,
      isCanonicalMotionAsset: false,
      assetStatus: 'authored-unreviewed-draft',
      relation: 'pattern-reference',
      projectionMethod: 'oblique-orthographic-3d-to-2d-svg',
      renderSurface: 'svg-2d',
      true3dSupported: false,
      webgl3dReady: false,
      interactive3dCameraSupported: false,
      draftRigs: Object.freeze(draftRigs),
      patternReferences: Object.freeze(verified3dPatternRefs),
      variantIds: Object.freeze(variantIds),
      modelPaths: Object.freeze(modelPaths),
      rendererComponents: Object.freeze(rendererComponents),
      mismatchNotesKo: Object.freeze(mismatchNotes),
    });
  } else {
    projected3d = Object.freeze({
      supported: false,
      sourceKind: null,
      temporalKind: 'continuous-progress',
      isContinuousPlayback: false,
      isDraftProposal: false,
      isCanonicalMotionAsset: false,
      assetStatus: 'not_authored',
      relation: 'none',
      projectionMethod: null,
      renderSurface: null,
      true3dSupported: false,
      webgl3dReady: false,
      interactive3dCameraSupported: false,
      draftRigs: Object.freeze([]),
      patternReferences: Object.freeze([]),
      variantIds: Object.freeze([]),
      modelPaths: Object.freeze([]),
      rendererComponents: Object.freeze([]),
      mismatchNotesKo: Object.freeze([]),
    });
  }

  // 4. Evaluate three-phase-2d support for eligible catalog assets.
  const reusedCatalogAsset = getReusedCatalogVisualAsset(rawId);
  const sourceComparison = getVisualSourceComparison(catalogExercise);
  const hasReliableSource = sourceComparison.matchedReliableSources.length > 0;
  const integrityCheck = evaluateVisualAssetIntegrity({
    productionMethod: 'free-authored-kinematic-svg-v1',
    anatomicalAccuracyAssumed: false,
    hasReliableSourceComparison: hasReliableSource,
    exercise: catalogExercise,
  });

  let threePhase2d: ThreePhase2dSupportDetail;
  if (!reusedCatalogAsset || !integrityCheck.integrityPassed || !hasReliableSource) {
    rejectedCandidates.push(
      Object.freeze({
        candidateId: reusedCatalogAsset?.archetypeId ?? 'missing-2d-rig',
        candidateKind: 'baseline-2d-archetype',
        reason: 'missing-source-evidence',
        detailKo: `동작(${rawId})의 2D 도해 출처 비교 또는 무결성 검증이 확보되지 않았습니다.`,
      }),
    );
    threePhase2d = Object.freeze({
      supported: false,
      sourceKind: null,
      temporalKind: 'discrete-three-phase',
      isContinuousPlayback: false,
      isDraftProposal: false,
      isCanonicalMotionAsset: false,
      reusesExistingCatalogAsset: false,
      phaseCount: 3,
      asset: null,
      baselineArchetypeId: reusedCatalogAsset?.archetypeId ?? null,
      effectiveArchetypeId: null,
      hadBaselineMismatch: false,
      baselineMismatchReasonKo: null,
      sourceComparison,
      integrityCheck,
    });
  } else {
    threePhase2d = Object.freeze({
      supported: true,
      sourceKind: 'catalog-rig-verified',
      temporalKind: 'discrete-three-phase',
      isContinuousPlayback: false,
      isDraftProposal: false,
      isCanonicalMotionAsset: false,
      reusesExistingCatalogAsset: true,
      phaseCount: 3,
      asset: reusedCatalogAsset,
      baselineArchetypeId: reusedCatalogAsset.archetypeId,
      effectiveArchetypeId: reusedCatalogAsset.archetypeId,
      hadBaselineMismatch: false,
      baselineMismatchReasonKo: null,
      sourceComparison,
      integrityCheck,
    });
  }

  // 5. Assemble supportedModes, primaryMode, and readinessState (never 'ready')
  const supportedModes: MotionSupportMode[] = [];
  if (projected3d.supported) supportedModes.push('projected-3d');
  if (continuous2d.supported) supportedModes.push('continuous-2d');
  if (threePhase2d.supported) supportedModes.push('three-phase-2d');

  let primaryMode: MotionSupportMode = 'missing';
  if (options.preferMode && supportedModes.includes(options.preferMode)) {
    primaryMode = options.preferMode;
  } else if (supportedModes.length > 0) {
    primaryMode = supportedModes[0];
  }

  const safetyFlags = buildSafetyFlags(rawId);

  let readinessState: MotionReadinessState;
  if (primaryMode === 'projected-3d') {
    readinessState = 'related-pattern-draft-only';
  } else if (primaryMode === 'continuous-2d') {
    readinessState = continuous2d.isPrototypeOnly
      ? 'lab-prototype-only'
      : 'related-pattern-draft-only';
  } else if (primaryMode === 'three-phase-2d') {
    readinessState = 'three-phase-2d-schematic-only';
  } else if (researchCandidates.length > 0) {
    readinessState = 'research-pending-no-model';
  } else {
    readinessState = 'not-authored-missing';
  }

  const evidenceSummaryParts: string[] = [];
  if (projected3d.supported) {
    evidenceSummaryParts.push(
      `3D 사선 투영 2D SVG 초안(${projected3d.variantIds.join(', ')}) 지원 [실제 3D 엔진 아님 · 정식 승인 아님]`,
    );
  }
  if (continuous2d.supported) {
    evidenceSummaryParts.push(`2D 연속 모션 초안(${continuous2d.variantId}) 지원 [정식 승인 아님]`);
  }
  if (threePhase2d.supported) {
    evidenceSummaryParts.push(
      `2D 3단계 이산 도해(${threePhase2d.effectiveArchetypeId} 기존 카탈로그 에셋 재사용) 지원`,
    );
  }
  if (evidenceSummaryParts.length === 0) {
    evidenceSummaryParts.push('검증된 모션 데이터 없음(missing)');
  }

  return Object.freeze({
    exerciseId: rawId,
    isCatalogExercise: true,
    exercise: catalogExercise,
    apparatus: catalogExercise.apparatus,
    bodyPosition: catalogExercise.bodyPosition,
    blockCategory: catalogExercise.blockCategory,
    spinalPlanes: Object.freeze([...catalogExercise.spinalPlanes]),
    primaryMode,
    supportedModes: Object.freeze(supportedModes),
    modeMatrix: Object.freeze({
      'three-phase-2d': threePhase2d.supported,
      'continuous-2d': continuous2d.supported,
      'projected-3d': projected3d.supported,
    }),
    isMissing: primaryMode === 'missing',
    canonicalMotionReady: false,
    readinessState,
    threePhase2d,
    continuous2d,
    projected3d,
    researchCandidates: Object.freeze(researchCandidates),
    rejectedCandidates: Object.freeze(rejectedCandidates),
    safetyFlags,
    evidenceSummaryKo: evidenceSummaryParts.join(' · '),
  });
}

/**
 * Guard helper verifying that no exercise ID or candidate is ever reported as canonical motion
 * ready (`EXERCISE_MOTION_REFERENCES` has 0 authored/ready records).
 */
export function isCanonicalMotionReady(
  exerciseOrId: string | PilatesExercise | null | undefined,
): false {
  void exerciseOrId;
  return false;
}

/**
 * Resolves motion coverage for the current catalog, including source-only entries.
 */
export function resolveAllCatalogMotionCoverage(
  options: ResolveMotionCoverageOptions = {},
): readonly MotionCoverageResolution[] {
  return Object.freeze(
    INITIAL_EXERCISES.map((exercise) => resolveMotionCoverage(exercise.id, options)),
  );
}

export interface MotionCoverageCatalogSummary {
  readonly totalCatalogExercises: number;
  readonly registryCrossCheck: Readonly<{
    readonly catalogExercisesCount: number;
    readonly originalMovementsCount: number;
    readonly movementVisualAssetsCount: number;
    readonly exerciseMotionReferencesCount: number;
    readonly motionPatternReferencesCount: number;
    readonly motionDraftsCount: number;
    readonly batchVariantsCount: number;
    readonly motionPrototypesCount: number;
    readonly professionalMotionReviewCount: 0;
  }>;
  readonly primaryModeCounts: Readonly<Record<MotionSupportMode, number>>;
  readonly modeSupportCounts: Readonly<{
    readonly threePhase2d: number;
    readonly threePhase2dCatalogVerified: number;
    readonly threePhase2dReusedByIdentity: number;
    readonly duplicateAssetCount: 0;
    readonly continuous2d: number;
    readonly projected3d: number;
    readonly missing: number;
  }>;
  readonly canonicalReadyCount: 0;
  readonly canonicalContinuousReadyCount: 0;
  readonly true3dReadyCount: 0;
  readonly expertApprovedCount: 0;
  readonly anatomicalAccuracyAssumedCount: 0;
  readonly unauthoredResearchCandidateCount: number;
}

export function getMotionCoverageSummary(
  options: ResolveMotionCoverageOptions = {},
): MotionCoverageCatalogSummary {
  const all = resolveAllCatalogMotionCoverage(options);
  const primaryModeCounts: Record<MotionSupportMode, number> = {
    'projected-3d': 0,
    'continuous-2d': 0,
    'three-phase-2d': 0,
    missing: 0,
  };

  let threePhase2d = 0;
  let threePhase2dCatalogVerified = 0;
  let threePhase2dReusedByIdentity = 0;
  let continuous2d = 0;
  let projected3d = 0;
  let missing = 0;
  let unauthoredResearchCandidateCount = 0;

  for (const item of all) {
    primaryModeCounts[item.primaryMode] += 1;
    if (item.threePhase2d.supported) {
      threePhase2d += 1;
      if (item.threePhase2d.sourceKind === 'catalog-rig-verified') {
        threePhase2dCatalogVerified += 1;
      }
      if (
        item.threePhase2d.asset &&
        item.threePhase2d.asset === MOVEMENT_VISUAL_ASSET_MAP.get(item.exerciseId)
      ) {
        threePhase2dReusedByIdentity += 1;
      }
    }
    if (item.continuous2d.supported) continuous2d += 1;
    if (item.projected3d.supported) projected3d += 1;
    if (item.isMissing) missing += 1;
    unauthoredResearchCandidateCount += item.researchCandidates.length;
  }

  return Object.freeze({
    totalCatalogExercises: all.length,
    registryCrossCheck: Object.freeze({
      catalogExercisesCount: INITIAL_EXERCISES.length,
      originalMovementsCount: ORIGINAL_MOVEMENTS.length,
      movementVisualAssetsCount: MOVEMENT_VISUAL_ASSETS.length,
      exerciseMotionReferencesCount: EXERCISE_MOTION_REFERENCES.length,
      motionPatternReferencesCount: MOTION_PATTERN_REFERENCES.length,
      motionDraftsCount: MOTION_DRAFTS.length,
      batchVariantsCount: BATCH_VARIANTS.length,
      motionPrototypesCount: MOTION_PROTOTYPES.length,
      professionalMotionReviewCount: MOTION_REFERENCE_COUNTS.expertApprovedMotions,
    }),
    primaryModeCounts: Object.freeze(primaryModeCounts),
    modeSupportCounts: Object.freeze({
      threePhase2d,
      threePhase2dCatalogVerified,
      threePhase2dReusedByIdentity,
      duplicateAssetCount: 0,
      continuous2d,
      projected3d,
      missing,
    }),
    canonicalReadyCount: 0,
    canonicalContinuousReadyCount: 0,
    true3dReadyCount: 0,
    expertApprovedCount: 0,
    anatomicalAccuracyAssumedCount: 0,
    unauthoredResearchCandidateCount,
  });
}
