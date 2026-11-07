import type {
  ClassSequenceSnapshot,
  HumanMovementDraft,
  MovementSnapshot,
  ReusableBlock,
} from '../../types/hierarchy';
import type {
  ApparatusType,
  BoxState,
  ClassBlockCategory,
  DifficultyLevel,
  FootbarState,
  HeadrestState,
  LayerMode,
  PilatesExercise,
  PropType,
  SavedSequence,
  SequenceStep,
  StepSideMode,
} from '../../types/pilates';
import type { ClassSectionRole } from '../../types/sequenceMotion';
import type {
  TeachingExerciseSnapshot,
  TeachingProgramSnapshot,
} from '../../types/teachingHistorySnapshot';
import type { OfflineClassPreset } from '../../types/classBlockPresets';

export const DEFAULT_MAX_INPUT_ITEMS = 150;
export const DEFAULT_MAX_EXPANDED_ROWS = 240;
export const DEFAULT_MAX_NESTING_DEPTH = 6;
export const DEFAULT_MAX_REPEAT_PER_BLOCK = 12;
export const DEFAULT_MAX_SETS_EXPANSION = 10;

export interface CueSheetBoundaryMeta {
  readonly integrationStatus: 'standalone-integration-candidate';
  readonly connectedToAppRoutes: false;
  readonly autoPrescriptionUsed: false;
  readonly safetyOrEfficacyGuaranteed: false;
  readonly forcedMovementClassification: false;
  readonly externalNetworkOrAiUsed: false;
  readonly storageMutated: false;
  readonly privacyAllowlistApplied: true;
  readonly disclaimerKo: string;
}

export interface CueSheetRawStepInput {
  readonly stepId?: string;
  readonly id?: string;
  readonly itemId?: string;
  readonly order?: number;
  readonly kind?: 'exercise' | 'rest' | string;
  readonly exerciseId?: string;
  readonly name?: string;
  readonly nameKo?: string;
  readonly nameEn?: string;
  readonly title?: string;
  readonly workingNameKo?: string;
  readonly ideaLine?: string;
  readonly blockCategory?: ClassBlockCategory | string;
  readonly classSection?: ClassSectionRole | string;
  readonly sectionRole?: ClassSectionRole | string;
  readonly durationMin?: number | null;
  readonly explanationSec?: number | null;
  readonly transitionSec?: number | null;
  readonly repetitions?: number | null;
  readonly sets?: number | null;
  readonly sideMode?: StepSideMode | string | null;
  readonly isUnilateral?: boolean | null;
  readonly selectedLayer?: LayerMode | string | null;
  readonly customSpringOverride?: string | null;
  readonly springs?: string | null;
  readonly apparatus?: ApparatusType | string | null;
  readonly requiredEquipment?: readonly string[] | null;
  readonly props?: readonly (PropType | string)[] | null;
  readonly box?: BoxState | string | null;
  readonly footbar?: FootbarState | string | null;
  readonly headrest?: HeadrestState | string | null;
  readonly cues?: readonly string[] | null;
  readonly instructorNote?: string | null;
  readonly breathPattern?: string | null;
  readonly precautions?: string | null;
  readonly layers?: Partial<Record<LayerMode, string>> | null;
  readonly blockInstanceId?: string | null;
  readonly sourceBlockId?: string | null;
  readonly sourceBlockVersion?: number | null;
  readonly sourceBlockTitle?: string | null;
  readonly blockRepetitions?: number | null;
  readonly humanDraftId?: string | null;
  readonly humanDraftRevision?: number | null;
  readonly exerciseSnapshot?: MovementSnapshot | TeachingExerciseSnapshot | null;
  readonly movementSnapshot?: MovementSnapshot | null;
}

export interface CueSheetNestedBlockInput {
  readonly id?: string;
  readonly blockId?: string;
  readonly blockInstanceId?: string;
  readonly title?: string;
  readonly sectionRole?: ClassSectionRole | string;
  readonly blockCategory?: ClassBlockCategory | string;
  readonly repetitions?: number | null;
  readonly blockRepetitions?: number | null;
  readonly items?: readonly (CueSheetRawStepInput | CueSheetNestedBlockInput)[];
  readonly steps?: readonly (CueSheetRawStepInput | CueSheetNestedBlockInput)[];
  readonly children?: readonly CueSheetNestedBlockInput[];
  readonly blocks?: readonly CueSheetNestedBlockInput[];
}

export interface CueSheetProjectionOptions {
  readonly maxInputItems?: number;
  readonly maxExpandedRows?: number;
  readonly maxNestingDepth?: number;
  readonly maxRepeatPerBlock?: number;
  readonly maxSetsExpansion?: number;
  readonly exercises?: readonly PilatesExercise[] | ReadonlyMap<string, PilatesExercise>;
  readonly exerciseSnapshots?: Readonly<
    Record<string, MovementSnapshot | TeachingExerciseSnapshot>
  >;
  readonly humanDrafts?: readonly HumanMovementDraft[];
  readonly reusableBlocks?: readonly ReusableBlock[];
}

export interface CueSheetFlexibleClassInput {
  readonly id?: string;
  readonly snapshotId?: string;
  readonly sourceSequenceId?: string;
  readonly title?: string;
  readonly sequenceTitle?: string;
  readonly sourceSequenceTitle?: string;
  readonly subtitle?: string;
  readonly sourceSubtitle?: string;
  readonly apparatus?: ApparatusType | 'mixed' | string;
  readonly level?: DifficultyLevel | string;
  readonly targetMinutes?: number | null;
  readonly durationMinutes?: number | null;
  readonly steps?: readonly (SequenceStep | CueSheetRawStepInput | CueSheetNestedBlockInput | unknown)[];
  readonly items?: readonly (CueSheetRawStepInput | CueSheetNestedBlockInput | unknown)[];
  readonly blocks?: readonly (CueSheetNestedBlockInput | ReusableBlock | unknown)[];
  readonly exercises?: readonly PilatesExercise[] | ReadonlyMap<string, PilatesExercise>;
  readonly exercisesById?: Readonly<Record<string, TeachingExerciseSnapshot>>;
  readonly exerciseSnapshots?: Readonly<
    Record<string, MovementSnapshot | TeachingExerciseSnapshot>
  >;
  readonly humanDrafts?: readonly HumanMovementDraft[];
  readonly reusableBlocks?: readonly ReusableBlock[];
}

export type CueSheetSourceInput =
  | SavedSequence
  | ClassSequenceSnapshot
  | TeachingProgramSnapshot
  | OfflineClassPreset
  | CueSheetFlexibleClassInput
  | null
  | undefined
  | unknown;

export interface CueSheetItemTiming {
  readonly status: 'known' | 'unspecified';
  readonly durationMin: number | null;
  readonly totalSec: number | null;
  readonly movementSec: number | null;
  readonly perSideSec: number | null;
  readonly explanationSec: number | null;
  readonly transitionSec: number | null;
  readonly sides: 1 | 2;
  readonly displayLabelKo: string;
  readonly detailLabelKo: string;
}

export interface CueSheetTimingSummary {
  readonly knownTotalSec: number;
  readonly knownExerciseSec: number;
  readonly knownRestSec: number;
  readonly knownTotalLabelKo: string;
  readonly knownExerciseLabelKo: string;
  readonly knownRestLabelKo: string;
  readonly targetMinutes: number | null;
  readonly knownItemCount: number;
  readonly unspecifiedItemCount: number;
  readonly hasUnspecifiedTime: boolean;
  readonly timingSummaryLabelKo: string;
}

export interface CueSheetPracticeMeta {
  readonly sideMode: StepSideMode | 'unspecified';
  readonly isUnilateral: boolean;
  readonly sideLabelsKo: readonly string[];
  readonly sideBadgeKo: string;
  readonly repetitions: number | null;
  readonly sets: number | null;
  readonly blockRepetitions: number;
  readonly practiceSummaryKo: string;
}

export interface CueSheetSetupMeta {
  readonly apparatus: ApparatusType | 'unspecified';
  readonly apparatusLabelKo: string;
  readonly requiredEquipmentLabelsKo: readonly string[];
  readonly propLabelsKo: readonly string[];
  readonly springs: string;
  readonly boxLabelKo: string | null;
  readonly footbarLabelKo: string | null;
  readonly headrestLabelKo: string | null;
  readonly layerMode: LayerMode | null;
  readonly layerLabelKo: string | null;
  readonly setupSummaryKo: string;
}

export interface CueSheetCueContent {
  readonly cues: readonly string[];
  readonly instructorNote: string;
  readonly breathPattern: string;
  readonly precautions: string;
  readonly layerCue: string;
  readonly hasCues: boolean;
  readonly emptyCueLabelKo: string;
  readonly isLongCue: boolean;
}

export interface CueSheetBlockMeta {
  readonly blockInstanceId: string | null;
  readonly sourceBlockId: string | null;
  readonly sourceBlockTitle: string | null;
  readonly blockCategory: ClassBlockCategory | null;
  readonly blockCategoryLabelKo: string;
  readonly sectionRole: ClassSectionRole | 'unspecified';
  readonly sectionLabelKo: string;
  readonly nestingDepth: number;
  readonly blockPathTitles: readonly string[];
  readonly blockRepetitionIndex: number;
  readonly blockRepetitionCount: number;
}

export type CueSheetItemOriginKind =
  | 'catalog'
  | 'snapshot'
  | 'human-draft'
  | 'name-only'
  | 'rest'
  | 'recovered-invalid';

export interface ClassCueSheetItem {
  readonly cueItemId: string;
  readonly order: number;
  readonly sourceStepId: string;
  readonly exerciseId: string | null;
  readonly kind: 'exercise' | 'rest';
  readonly originKind: CueSheetItemOriginKind;
  readonly nameKo: string;
  readonly nameEn: string;
  readonly isDuplicateName: boolean;
  readonly duplicateNameOccurrence: number;
  readonly duplicateNameTotal: number;
  readonly duplicateDisambiguatorKo: string | null;
  readonly timing: CueSheetItemTiming;
  readonly practice: CueSheetPracticeMeta;
  readonly setup: CueSheetSetupMeta;
  readonly cueContent: CueSheetCueContent;
  readonly blockMeta: CueSheetBlockMeta;
}

export interface ClassCueSheetExpandedRow {
  readonly expandedRowId: string;
  readonly expandedOrder: number;
  readonly parentCueItemId: string;
  readonly parentItemOrder: number;
  readonly kind: 'exercise' | 'rest';
  readonly nameKo: string;
  readonly duplicateDisambiguatorKo: string | null;
  readonly blockHeaderKo: string | null;
  readonly sideLabelKo: string | null;
  readonly setIndex: number | null;
  readonly setCount: number | null;
  readonly blockRepetitionIndex: number;
  readonly blockRepetitionCount: number;
  readonly repetitions: number | null;
  readonly timingLabelKo: string;
  readonly timingStatus: 'known' | 'unspecified';
  readonly setupSummaryKo: string;
  readonly primaryCueKo: string;
  readonly instructorNote: string;
}

export interface CueSheetTruncationMeta {
  readonly isTruncated: boolean;
  readonly maxInputItemsCap: number;
  readonly maxExpandedRowsCap: number;
  readonly maxNestingDepthCap: number;
  readonly maxRepeatPerBlockCap: number;
  readonly maxSetsExpansionCap: number;
  readonly omittedInputItemCount: number;
  readonly omittedExpandedRowCount: number;
  readonly cappedBlockRepetitionCount: number;
  readonly cappedDepthCount: number;
  readonly circularReferenceCount: number;
  readonly reasonsKo: readonly string[];
}

export interface CueSheetPrivacyMeta {
  readonly allowlistApplied: true;
  readonly inlineRedactionIsHeuristicOnly: true;
  readonly strippedSensitiveKeys: readonly string[];
  readonly redactedInlineTextCount: number;
  readonly privacyPolicyNoteKo: string;
}

export type CueSheetDiagnosticCode =
  | 'empty-class'
  | 'corrupted-input'
  | 'corrupted-item'
  | 'circular-reference'
  | 'unspecified-time'
  | 'name-only-movement'
  | 'duplicate-movement-name'
  | 'duplicate-step-id'
  | 'empty-cue'
  | 'input-truncated'
  | 'expansion-truncated'
  | 'nesting-depth-capped'
  | 'block-repeat-capped'
  | 'sensitive-fields-stripped';

export interface CueSheetDiagnostic {
  readonly code: CueSheetDiagnosticCode;
  readonly messageKo: string;
  readonly itemOrders: readonly number[];
}

export interface ClassCueSheetProjection {
  readonly cueSheetId: string;
  readonly sourceId: string;
  readonly title: string;
  readonly subtitle: string;
  readonly apparatusLabelKo: string;
  readonly levelLabelKo: string;
  readonly isEmpty: boolean;
  readonly itemCount: number;
  readonly exerciseCount: number;
  readonly restCount: number;
  readonly nameOnlyCount: number;
  readonly duplicateNameGroupCount: number;
  readonly allEquipmentLabelsKo: readonly string[];
  readonly allPropLabelsKo: readonly string[];
  readonly timingSummary: CueSheetTimingSummary;
  readonly items: readonly ClassCueSheetItem[];
  readonly expandedRows: readonly ClassCueSheetExpandedRow[];
  readonly truncation: CueSheetTruncationMeta;
  readonly privacy: CueSheetPrivacyMeta;
  readonly diagnostics: readonly CueSheetDiagnostic[];
  readonly boundary: CueSheetBoundaryMeta;
}

export interface CueSheetFixtureEntry {
  readonly fixtureId:
    | 'standard-mixed'
    | 'empty-class'
    | 'name-only-drafts'
    | 'long-korean-cues-empty-cues-duplicates'
    | 'nested-repeats-unilateral-unspecified-time'
    | 'hundred-items-bounded'
    | 'corrupted-circular-sensitive-html';
  readonly labelKo: string;
  readonly descriptionKo: string;
  readonly buildProjection: () => ClassCueSheetProjection;
}
