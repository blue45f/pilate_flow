import type { P1ReusableBlockStepContract } from './freeAiAssistant';
import type {
  HumanMovementDraft,
  ReusableBlock,
  ReusableBlockItem,
  SequenceTimeBreakdown,
  SequenceValidationReport,
} from './hierarchy';
import type {
  ApparatusType,
  AutoGenerateCriteria,
  ClassBlockCategory,
  ConditionTemplate,
  DifficultyLevel,
  LayerMode,
  PropType,
  SavedSequence,
  SequenceStep,
  WorkoutTempo,
} from './pilates';
import type { ClassSectionRole } from './sequenceMotion';
import type { MovementIdeaWorkingBuffer } from '../utils/movementIdeaDraft';

/**
 * 스튜디오 수업·블록 프리셋 주제 분류.
 * 의학적 치료·재활 효능을 주장하지 않는 순수 움직임·수업 목적 중심 분류입니다.
 */
export type PresetThemeId =
  | 'breath-pelvic-foundation'
  | 'core-spinal-control'
  | 'lower-glute-balance'
  | 'upper-thoracic-opening'
  | 'full-body-flow'
  | 'athletic-plank-control'
  | 'cooldown-mobility-release';

export type PresetDurationMinutes = 15 | 20 | 30 | 45 | 50 | 60;

export interface PresetThemeMetadata {
  readonly id: PresetThemeId;
  readonly labelKo: string;
  readonly labelEn: string;
  readonly summaryKo: string;
  readonly defaultFocusPreset: AutoGenerateCriteria['focusPreset'];
  readonly primaryCategories: readonly ClassBlockCategory[];
}

/**
 * 프리셋 안전성·효능 비주장 및 비AI(Offline) 경계 계약.
 * 검토되지 않은 건강/재활/치료 효과를 주장하지 않음을 타입과 런타임에서 강제합니다.
 */
export interface PresetSafetyAndClaimBoundary {
  readonly aiUsed: false;
  readonly medicalOrRehabEfficacyClaimed: false;
  readonly expertClinicalVerified: false;
  readonly editableByInstructor: true;
  readonly disclaimerKo: string;
}

export interface BlockPresetTimeBreakdown {
  readonly movementSec: number;
  readonly explanationSec: number;
  readonly transitionSec: number;
  readonly totalSec: number;
  readonly totalMinutes: number;
}

/**
 * AI 호출 없이 즉시 사용·편집 가능한 재사용 블록 프리셋.
 * P1 `ReusableBlock` 및 P5 `P1ReusableBlockContract`와 100% 호환됩니다.
 */
export interface OfflineBlockPreset extends ReusableBlock {
  readonly presetKind: 'reusable-block';
  readonly theme: PresetThemeId;
  readonly themeLabelKo: string;
  readonly category: ClassBlockCategory;
  readonly durationMin: number;
  readonly isReviewed: true;
  readonly steps: readonly P1ReusableBlockStepContract[];
  readonly items: ReusableBlockItem[];
  readonly requiredEquipment: readonly string[];
  readonly recommendedProps: readonly PropType[];
  readonly targetAudienceSummaryKo: string;
  readonly flowRationaleKo: string;
  readonly unilateralBalanceNoteKo: string;
  readonly editingGuideKo: string;
  readonly timeBreakdown: BlockPresetTimeBreakdown;
  readonly safetyBoundary: PresetSafetyAndClaimBoundary;
}

/**
 * AI 호출 없이 즉시 사용·편집 가능한 완성형 수업 시퀀스 프리셋.
 * 시간(15/20/30/45/50/60분)·주제·기구·난이도별로 구성됩니다.
 */
export interface OfflineClassPreset {
  readonly id: string;
  readonly presetKind: 'class-sequence';
  readonly title: string;
  readonly subtitle: string;
  readonly durationMinutes: PresetDurationMinutes;
  readonly theme: PresetThemeId;
  readonly themeLabelKo: string;
  readonly apparatus: ApparatusType | 'mixed';
  readonly requiredEquipment: readonly string[];
  readonly recommendedProps: readonly PropType[];
  readonly level: DifficultyLevel;
  readonly tempo: WorkoutTempo;
  readonly focusPreset: AutoGenerateCriteria['focusPreset'];
  readonly focusTags: readonly string[];
  readonly userSummaryKo: string;
  readonly flowRationaleKo: string;
  readonly unilateralBalanceNoteKo: string;
  readonly editingGuideKo: string;
  readonly composedBlockPresetIds: readonly string[];
  readonly steps: readonly SequenceStep[];
  readonly timeBreakdown: SequenceTimeBreakdown;
  readonly safetyBoundary: PresetSafetyAndClaimBoundary;
  readonly createdAt: string;
  readonly updatedAt: string;
}

/**
 * 새 동작을 직접 만드는 사용자(예: 강사·여자친구 등)를 위한 빈 초안(Blank Draft) 시작 유형.
 */
export type BlankDraftStarterKind =
  | 'blank-movement-idea'
  | 'blank-reusable-block'
  | 'blank-class-sequence'
  | 'blank-custom-movement-showcase';

export interface BlankDraftStarterOption {
  readonly id: string;
  readonly starterKind: BlankDraftStarterKind;
  readonly titleKo: string;
  readonly subtitleKo: string;
  readonly descriptionKo: string;
  readonly recommendedForKo: string;
  readonly defaultApparatus: ApparatusType | 'mixed';
  readonly defaultLevel: DifficultyLevel;
  readonly defaultDurationMinutes: number;
  readonly defaultSectionRole?: ClassSectionRole;
  readonly defaultBlockCategory?: ClassBlockCategory;
  readonly includeSectionFrameSteps: boolean;
  readonly placeholderIdeaPromptKo: string;
  readonly progressiveStepsGuideKo: readonly string[];
  readonly safetyBoundary: PresetSafetyAndClaimBoundary;
}

export interface StartBlankDraftOptions {
  readonly title?: string;
  readonly subtitle?: string;
  readonly ideaLine?: string;
  readonly workingNameKo?: string;
  readonly apparatus?: ApparatusType | 'mixed';
  readonly level?: DifficultyLevel;
  readonly durationMinutes?: number;
  readonly sectionRole?: ClassSectionRole;
  readonly blockCategory?: ClassBlockCategory;
  readonly isUnilateral?: boolean;
  readonly selectedLayer?: LayerMode;
  readonly nowIso?: string;
}

export interface BlankDraftSessionBundle {
  readonly starterId: string;
  readonly starterKind: BlankDraftStarterKind;
  readonly createdAt: string;
  readonly safetyBoundary: PresetSafetyAndClaimBoundary;
  /** 1줄 아이디어 기반 P1 새 동작 초안 (빈 동작/쇼케이스 시작 시 생성) */
  readonly humanMovementDraft?: HumanMovementDraft;
  /** P2/P3 1줄 동작 메모 시트용 빈 작업 버퍼 */
  readonly movementIdeaBuffer: MovementIdeaWorkingBuffer;
  /** 빈 상태에서 바로 동작을 담을 수 있는 재사용 블록 초안 */
  readonly reusableBlockDraft?: ReusableBlock;
  /** 빈 상태에서 바로 편집·동작 추가가 가능한 수업 시퀀스 초안 */
  readonly sequenceDraft?: SavedSequence;
  /** 단계별 안내 메시지 */
  readonly guidanceNoticesKo: readonly string[];
}

export interface HealthClaimInspectionResult {
  readonly safe: boolean;
  readonly matchedClaims: readonly string[];
  readonly reasonKo?: string;
}

export interface PresetSimilarityPair {
  readonly presetAId: string;
  readonly presetBId: string;
  readonly presetATitle: string;
  readonly presetBTitle: string;
  readonly jaccardSimilarity: number;
  readonly orderedOverlapRatio: number;
  readonly sameApparatus: boolean;
  readonly sameDuration: boolean;
  readonly sameLevel: boolean;
  readonly isDuplicateRisk: boolean;
}

export interface SingleClassPresetValidationResult {
  readonly presetId: string;
  readonly valid: boolean;
  readonly catalogExercisesResolved: boolean;
  readonly unknownExerciseIds: readonly string[];
  readonly timeSumMatchesTarget: boolean;
  readonly targetSec: number;
  readonly actualTotalSec: number;
  readonly deltaSec: number;
  readonly unilateralBalanced: boolean;
  readonly imbalancedExerciseIds: readonly string[];
  readonly transitionFlowValid: boolean;
  readonly transitionScore: number;
  readonly difficultyFlowValid: boolean;
  readonly healthClaimCheck: HealthClaimInspectionResult;
  readonly editIsolationVerified: boolean;
  readonly sequenceReport: SequenceValidationReport;
  readonly errorsKo: readonly string[];
  readonly warningsKo: readonly string[];
}

export interface SingleBlockPresetValidationResult {
  readonly blockId: string;
  readonly valid: boolean;
  readonly catalogExercisesResolved: boolean;
  readonly unknownExerciseIds: readonly string[];
  readonly timeSumMatchesTarget: boolean;
  readonly targetSec: number;
  readonly actualTotalSec: number;
  readonly deltaSec: number;
  readonly unilateralBalanced: boolean;
  readonly imbalancedExerciseIds: readonly string[];
  readonly transitionFlowValid: boolean;
  readonly p1SchemaValid: boolean;
  readonly p5ContractValid: boolean;
  readonly healthClaimCheck: HealthClaimInspectionResult;
  readonly editIsolationVerified: boolean;
  readonly errorsKo: readonly string[];
  readonly warningsKo: readonly string[];
}

export interface CatalogPresetAuditReport {
  readonly valid: boolean;
  readonly classPresetCount: number;
  readonly blockPresetCount: number;
  readonly blankStarterCount: number;
  readonly classPresetResults: readonly SingleClassPresetValidationResult[];
  readonly blockPresetResults: readonly SingleBlockPresetValidationResult[];
  readonly duplicateTitleIds: readonly string[];
  readonly duplicateSignatureIds: readonly string[];
  readonly highSimilarityPairs: readonly PresetSimilarityPair[];
  readonly healthClaimViolations: readonly { id: string; matchedClaims: readonly string[] }[];
  readonly summaryKo: string;
}

export interface PresetFilterCriteria {
  readonly durationMinutes?: PresetDurationMinutes;
  readonly theme?: PresetThemeId;
  readonly apparatus?: ApparatusType | 'mixed';
  readonly availableEquipment?: readonly string[];
  readonly level?: DifficultyLevel;
  readonly sectionRole?: ClassSectionRole;
  readonly category?: ClassBlockCategory;
  readonly searchQuery?: string;
}

export interface InstantiatedClassPresetResult {
  readonly sequence: SavedSequence;
  readonly conditionTemplate: ConditionTemplate;
  readonly sourcePresetId: string;
  readonly isEditableCopy: true;
}
