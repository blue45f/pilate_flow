import type { ReactNode } from 'react';
import type {
  ApparatusType,
  AutoGenerateCriteria,
  BodyPosition,
  ClassBlockCategory,
  ConditionTemplate,
  DifficultyLevel,
  ExerciseLayers,
  LayerMode,
  PilatesExercise,
  PropType,
  SequenceStep,
  SpinalPlane,
  WorkoutTempo,
} from './pilates';

/**
 * Supported server-side AI providers.
 * - 'openai': Server-side OpenAI Chat Completions API using local server env `OPENAI_API_KEY` only (never exposed to browser/Git/logs/prompts; zero auto-topup).
 * - 'gemini-free': Google Gemini Developer API on an Unpaid Free Tier project only.
 * - 'openrouter-free': OpenRouter models strictly ending in ':free' or 'openrouter/free' with max_price=0 and allow_fallbacks=false.
 * - 'none': External AI disabled/unconfigured; local deterministic engine + manual editing + saved presets remain active.
 */
export type FreeAiProviderId = 'openai' | 'gemini-free' | 'openrouter-free' | 'none';

export type StrengthenArea =
  | 'core'
  | 'glute-lower'
  | 'posture-upper'
  | 'mobility-rehab'
  | 'full-body';

export type FreeAiTaskKind =
  | 'class-draft'
  | 'movement-idea'
  | 'sequence-compose'
  | 'exercise-search';

/**
 * Verifiable quota renewal metadata returned whenever quota is checked or exhausted.
 * - OpenAI & OpenRouter daily limits reset at 00:00 UTC (or upstream x-ratelimit-reset header).
 * - Gemini Free Tier daily quota resets at 00:00 America/Los_Angeles (midnight Pacific Time).
 */
export interface FreeAiRenewalInfo {
  resetAt: string;
  resetWindow: 'minute' | 'daily';
  resetTimezone: 'UTC' | 'America/Los_Angeles';
  remainingSeconds: number;
  formattedResetKo: string;
  policyNoteKo: string;
}

export interface FreeAiQuotaStatus {
  provider: FreeAiProviderId;
  model: string | null;
  enabled: boolean;
  exhausted: boolean;
  reason?:
    | 'ready'
    | 'unconfigured'
    | 'billing_guard_unconfirmed'
    | 'invalid_paid_model_blocked'
    | 'free_quota_exhausted'
    | 'concurrency_limit_exceeded';
  minuteLimit: number;
  minuteUsed: number;
  minuteRemaining: number;
  dailyLimit: number;
  dailyUsed: number;
  dailyRemaining: number;
  activeRequests: number;
  maxConcurrentRequests: number;
  cacheEntries: number;
  statusMessageKo: string;
  renewal: FreeAiRenewalInfo | null;
}

/**
 * P1 Schema Contract (used by contract only without modifying P1 owned files).
 * Compatible with P1's MovementSnapshot, ReusableBlock, and MovementIdea schemas.
 */
export interface P1MovementSnapshotContract {
  readonly id: string;
  readonly nameKo: string;
  readonly nameEn: string;
  readonly apparatus: ApparatusType;
  readonly requiredEquipment?: readonly string[];
  readonly movementFamily?: string;
  readonly capturedAt: string;
}

export interface P1HumanMovementDraftSafetyBoundaryContract {
  readonly originType: 'instructor-created-draft' | 'catalog-reference';
  readonly evaluationBasis: 'subjective-instructor-feel' | 'catalog-metadata';
  readonly aiSafetyGuaranteed: false;
  readonly objectiveEfficacyClaimed: false;
  readonly expertVerified: false;
  readonly disclaimerKo: string;
}

export interface P1ReusableBlockStepContract {
  readonly itemId?: string;
  readonly order?: number;
  readonly exerciseId: string;
  readonly blockCategory?: ClassBlockCategory;
  readonly durationMin?: number;
  readonly selectedLayer?: LayerMode;
  readonly explanationSec?: number;
  readonly transitionSec?: number;
  readonly repetitions?: number;
  readonly sets?: number;
  readonly sideMode?: 'both' | 'left' | 'right' | 'alternating' | 'together';
  readonly instructorNote?: string;
  readonly exerciseSnapshot?: P1MovementSnapshotContract;
}

export interface P1ReusableBlockContract {
  readonly id: string;
  readonly title: string;
  readonly description?: string;
  readonly apparatus: ApparatusType | 'mixed';
  readonly level: DifficultyLevel;
  readonly category?: ClassBlockCategory;
  readonly sectionRole?: 'preparation' | 'main' | 'cooldown';
  readonly durationMin?: number;
  readonly version?: number;
  readonly steps?: readonly P1ReusableBlockStepContract[];
  readonly items?: readonly P1ReusableBlockStepContract[];
  /** Only blocks where isReviewed is true are eligible for automatic sequence composition. */
  readonly isReviewed: boolean;
}

export interface P1MovementIdeaContract {
  readonly id: string;
  readonly ideaText: string;
  readonly nameKo: string;
  readonly nameEn: string;
  readonly apparatus: ApparatusType;
  readonly blockCategory: ClassBlockCategory;
  readonly level: DifficultyLevel;
  readonly defaultDurationMin: number;
  readonly breathPattern: string;
  readonly cues: readonly string[];
  readonly precautions: string;
  readonly layers: ExerciseLayers;
  readonly reviewStatus: 'unreviewed-creative';
  readonly guaranteesSafetyOrEffect: false;
  readonly safetyDisclaimer: string;
  readonly safetyBoundary?: P1HumanMovementDraftSafetyBoundaryContract;
  readonly createdAt: string;
}

/**
 * P2 Common UI Contract (used by contract only without modifying P2 owned files).
 * Allows optional injection of P2 design-system primitives when integrated.
 */
export interface P2CommonUiContract {
  renderNotice?: (props: {
    tone: 'info' | 'warning' | 'error' | 'neutral';
    title: string;
    description?: string;
    children?: ReactNode;
  }) => ReactNode;
  renderBadge?: (props: {
    tone?: 'default' | 'warning' | 'success' | 'Outline';
    children: ReactNode;
  }) => ReactNode;
}

export interface ClassDraftConditionsInput {
  durationMinutes: number;
  theme: string;
  strengthenAreas: StrengthenArea[];
  level: DifficultyLevel;
  apparatus: ApparatusType | 'mixed';
  availableEquipment?: string[];
  preferredProps?: PropType[];
  tempo?: WorkoutTempo;
  templateId?: string;
}

export interface EditableDraftStepItem {
  stepId: string;
  order: number;
  exerciseId: string;
  nameKo: string;
  nameEn: string;
  apparatus: ApparatusType;
  blockCategory: ClassBlockCategory;
  durationMin: number;
  selectedLayer: LayerMode;
  instructorNote: string;
  isReviewed: true;
  sourceBlockId?: string;
}

export type AiAssistResultSource = 'openai-api' | 'external-free-ai' | 'local-rule-engine';

export interface EditableClassDraftResult {
  kind: 'class-draft';
  source: AiAssistResultSource;
  provider: FreeAiProviderId;
  model: string | null;
  cached: boolean;
  title: string;
  subtitle: string;
  targetMinutes: number;
  level: DifficultyLevel;
  apparatus: ApparatusType | 'mixed';
  focusPreset: AutoGenerateCriteria['focusPreset'];
  strengthenAreas: StrengthenArea[];
  coachingSummary: string;
  steps: EditableDraftStepItem[];
  guaranteesSafetyOrEffect: false;
  safetyDisclaimer: string;
}

export interface MovementIdeaInput {
  rawIdeaText: string;
  baseExerciseName?: string;
  apparatus: ApparatusType;
  blockCategory: ClassBlockCategory;
  strengthenArea: StrengthenArea;
  level: DifficultyLevel;
  bodyPosition?: BodyPosition;
  spinalPlane?: SpinalPlane;
  preferredProps?: PropType[];
}

export interface EditableMovementIdeaResult {
  kind: 'movement-idea';
  source: AiAssistResultSource;
  provider: FreeAiProviderId;
  model: string | null;
  cached: boolean;
  nameKo: string;
  nameEn: string;
  apparatus: ApparatusType;
  blockCategory: ClassBlockCategory;
  level: DifficultyLevel;
  bodyPosition: BodyPosition;
  spinalPlanes: SpinalPlane[];
  props: PropType[];
  defaultDurationMin: number;
  springs: string;
  targetMuscles: string[];
  breathPattern: string;
  cues: string[];
  precautions: string;
  layers: ExerciseLayers;
  variationRationale: string;
  reviewStatus: 'unreviewed-creative';
  guaranteesSafetyOrEffect: false;
  safetyDisclaimer: string;
}

export interface SequenceComposeInput {
  targetMinutes: number;
  level: DifficultyLevel;
  apparatus: ApparatusType | 'mixed';
  theme?: string;
  strengthenAreas: StrengthenArea[];
  selectedExerciseIds: string[];
  selectedBlockIds?: string[];
}

export interface EditableSequenceComposeResult {
  kind: 'sequence-compose';
  source: AiAssistResultSource;
  provider: FreeAiProviderId;
  model: string | null;
  cached: boolean;
  title: string;
  subtitle: string;
  targetMinutes: number;
  level: DifficultyLevel;
  apparatus: ApparatusType | 'mixed';
  steps: EditableDraftStepItem[];
  excludedUnreviewedIds: string[];
  transitionSummary: string;
  guaranteesSafetyOrEffect: false;
  safetyDisclaimer: string;
}

export interface MovementSearchAssistInput {
  queryText: string;
  apparatus: ApparatusType | 'mixed';
  level: DifficultyLevel;
  strengthenArea?: StrengthenArea;
  maxResults?: number;
}

export interface MovementSearchRecommendationItem {
  exerciseId: string;
  nameKo: string;
  nameEn: string;
  apparatus: ApparatusType;
  blockCategory: ClassBlockCategory;
  level: DifficultyLevel;
  defaultDurationMin: number;
  springs: string;
  matchReasonKo: string;
  cueHighlightKo: string;
  setupCheckKo: string;
}

export interface EditableMovementSearchResult {
  kind: 'exercise-search';
  source: AiAssistResultSource;
  provider: FreeAiProviderId;
  model: string | null;
  cached: boolean;
  querySummaryKo: string;
  recommendations: MovementSearchRecommendationItem[];
  guaranteesSafetyOrEffect: false;
  safetyDisclaimer: string;
}

export type FreeAiAssistResult =
  | EditableClassDraftResult
  | EditableMovementIdeaResult
  | EditableSequenceComposeResult
  | EditableMovementSearchResult;

export interface FreeAiStudioContextContract {
  exercises: readonly PilatesExercise[];
  reusableBlocks?: readonly P1ReusableBlockContract[];
  conditionTemplates: readonly ConditionTemplate[];
  activeTargetMinutes?: number;
  activeApparatus?: ApparatusType | 'mixed';
  activeLevel?: DifficultyLevel;
  onApplyDraftSequence?: (payload: {
    title: string;
    subtitle: string;
    targetMinutes: number;
    level: DifficultyLevel;
    apparatus: ApparatusType | 'mixed';
    steps: SequenceStep[];
  }) => void;
  onSaveUnreviewedMovementIdea?: (
    exercise: PilatesExercise,
    ideaContract: P1MovementIdeaContract,
  ) => void;
  onAddExerciseToSequence?: (
    exerciseId: string,
    blockCategory?: ClassBlockCategory,
  ) => void | boolean | { readonly ok: boolean; readonly message?: string };
  onApplyConditionTemplate?: (templateId: string) => void;
  onSaveConditionTemplate?: (name: string, criteria: AutoGenerateCriteria) => void;
  uiContract?: P2CommonUiContract;
}
