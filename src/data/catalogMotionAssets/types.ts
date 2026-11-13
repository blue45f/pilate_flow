import type {
  CatalogMovementVisualAsset,
  PhasePoseSpec,
  Point2D,
  RigJointMap,
  VisualPhaseId,
} from '../movementVisualRigCatalog';
import type { ReliableSourceLink } from '../movementVisualSourceAudit';
import type { ApparatusType, BodyPosition, ClassBlockCategory } from '../../types/pilates';

export type CatalogMotionPhaseId = 'setup' | 'move' | 'turn' | 'return' | 'finish';

export interface CatalogMotionPhaseSpec {
  readonly id: CatalogMotionPhaseId;
  readonly labelKo: string;
  readonly start: number;
  readonly end: number;
  readonly sample: number;
  readonly cueKo: string;
  readonly displayBehavior: 'hold' | 'move';
}

export interface CatalogMotionOverrideNote {
  readonly exerciseId: string;
  readonly motionSubtitleKo: string;
  readonly phaseLabelsKo: Readonly<Record<CatalogMotionPhaseId, string>>;
  readonly biomechFocusKo: string;
  readonly apparatusControlNoteKo: string;
  /** Preview durations, never an exercise prescription or a source-video timecode. */
  readonly previewPhaseDurationsMs?: readonly [number, number, number, number, number];
  readonly transitionPath?: 'through-middle' | 'alternate-knee-fold';
}

export interface CatalogMotionKeyframe {
  readonly id: string;
  readonly progress: number;
  readonly labelKo: string;
  readonly visualPhaseId: VisualPhaseId;
  readonly pose: PhasePoseSpec;
  readonly provenance: 'catalog-pose' | 'procedural-transition';
}

export interface CatalogContinuousPoseSnapshot {
  readonly progress: number;
  readonly phase: CatalogMotionPhaseSpec;
  readonly visualPhaseId: VisualPhaseId;
  readonly interpolatedPhaseSpec: PhasePoseSpec;
  readonly joints: RigJointMap;
  readonly carriageOffsetPx: number;
  readonly pedalAngleDeg: number;
}

export interface CatalogContinuousMotionAsset {
  readonly exerciseId: string;
  readonly variantId: string;
  readonly titleKo: string;
  readonly titleEn: string;
  readonly motionSubtitleKo: string;
  readonly apparatus: ApparatusType;
  readonly bodyPosition: BodyPosition;
  readonly blockCategory: ClassBlockCategory;
  readonly sideMode: 'bilateral' | 'unilateral';
  readonly durationMs: number;
  readonly phases: readonly [
    CatalogMotionPhaseSpec,
    CatalogMotionPhaseSpec,
    CatalogMotionPhaseSpec,
    CatalogMotionPhaseSpec,
    CatalogMotionPhaseSpec,
  ];
  readonly keyframes: readonly CatalogMotionKeyframe[];
  /** Seek the authored third pose here; progress 1 is the completed loop setup. */
  readonly authoredEndProgress: number;
  readonly endPoseLabelKo: string;
  readonly finishBehavior: 'hold-return' | 'return-to-setup' | 'alternate-side';
  readonly previewTimingOnly: true;
  readonly biomechFocusKo: string;
  readonly apparatusControlNoteKo: string;
  readonly visualAsset: CatalogMovementVisualAsset;
  readonly sourceVerificationCategoryKo: string;
  readonly factualRecordSha256: string;
  readonly auditCheckedAt: string;
  readonly matchedReliableSources: readonly ReliableSourceLink[];
  readonly samplePose: (progress: number) => CatalogContinuousPoseSnapshot;
  readonly pointAt: (joint: keyof RigJointMap, progress: number) => Point2D;
  readonly anatomicalAccuracyAssumed: false;
  readonly professionalReviewCount: 0;
}
