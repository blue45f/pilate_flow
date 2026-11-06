import type { GroupPlanningPreferences } from './instructorPlanning';
import type { ClassSectionRole, SequenceMotionStudyBinding } from './sequenceMotion';

export type ApparatusType = 'reformer' | 'cadillac' | 'chair' | 'barrel' | 'mat';

export type PropType =
  | 'none'
  | 'mini-ball'
  | 'magic-circle'
  | 'foam-roller'
  | 'bosu'
  | 'theraband'
  | 'toning-ball'
  | 'fitness-ball'
  | 'loop-band'
  | 'tube-band'
  | 'long-band'
  | 'dumbbell'
  | 'sliders'
  | 'yoga-block';

export type ClassBlockCategory =
  | 'warmup'
  | 'footwork'
  | 'bridging'
  | 'core'
  | 'upper-body'
  | 'lower-body'
  | 'plank'
  | 'extension'
  | 'feet-in-straps'
  | 'cooldown';

export type SpinalPlane = 'flexion' | 'extension' | 'lateral' | 'rotation' | 'neutral';

export type BodyPosition =
  'supine' | 'prone' | 'side-lying' | 'seated' | 'kneeling' | 'standing' | 'quadruped';

export type DifficultyLevel = '1.0' | '1.5' | '2.0';

export type LayerMode = 'easy' | 'standard' | 'hard';

export type ReformerBrand = 'balanced-body' | 'stott' | 'intopilates' | 'classical';

export type BoxState = 'none' | 'long-box' | 'short-box';

export type FootbarState = 'high' | 'mid' | 'low' | 'down' | 'none';

export type HeadrestState = 'up' | 'flat' | 'down';

export type FavoriteTag = 'none' | 'signature' | 'member-love' | 'rehab-posture' | 'burn-sculpt';

export type VideoRegion = 'kr' | 'global';

export type WorkoutTempo = 'slow-precise' | 'moderate-flow' | 'athletic-burn';

export interface YouTubeClipRef {
  videoId: string;
  channelName: string;
  videoTitle: string;
  startSec: number;
  endSec?: number;
  url: string;
  note?: string;
  region?: VideoRegion;
}

export interface ExerciseLayers {
  easy: string;
  standard: string;
  hard: string;
}

export interface ExerciseReview {
  status: 'approved';
  reviewerAlias: string;
  reviewedAt: string;
  revision: string;
  scope: 'planning-metadata';
  credentialVerified: false;
}

/** An original source snapshot, separate from the user's planning metadata and local review. */
export interface ExerciseSourceReference {
  referenceId: string;
  url: string;
  title: string;
  publisher: string;
  region: VideoRegion;
  verificationStatus: 'official-source-checked' | 'partial-playback-checked' | 'korean-candidate';
  verifiedAt: string;
  rights: 'link-only';
  rawLedgerFile: 'verified-source-catalog.json' | 'korean-candidate-catalog.json';
  rawItemId: string;
}

export interface PilatesExercise {
  id: string;
  nameKo: string;
  nameEn: string;
  apparatus: ApparatusType;
  /** Exact setup requirements. Undefined retains the legacy apparatus family; [] means unknown. */
  requiredEquipment?: string[];
  movementFamily?: string;
  review?: ExerciseReview;
  sourceReference?: ExerciseSourceReference;
  props: PropType[];
  blockCategory: ClassBlockCategory;
  spinalPlanes: SpinalPlane[];
  bodyPosition: BodyPosition;
  level: DifficultyLevel;
  defaultDurationMin: number;
  isUnilateral: boolean;
  springs: string;
  box: BoxState;
  footbar: FootbarState;
  headrest: HeadrestState;
  targetMuscles: string[];
  breathPattern: string;
  cues: string[];
  precautions: string;
  layers: ExerciseLayers;
  youtube: YouTubeClipRef;
  favoriteTag: FavoriteTag;
  tempo?: WorkoutTempo;
  isCustom?: boolean;
  createdAt?: string;
}

export type StepSideMode = 'together' | 'left' | 'right' | 'left-then-right' | 'right-then-left';

export interface StepPracticeOptions {
  /** Teacher-entered count; never used to infer duration or cadence. */
  repetitions?: number;
  /** Teacher-entered sets; absent stays unspecified and never determines duration. */
  sets?: number;
  /** Anatomical sides, independent of the viewer's perspective. Absent retains catalog defaults. */
  sideMode?: StepSideMode;
}

export interface SequenceStep extends StepPracticeOptions {
  /** Optional saved instructor assumptions; actual time is recorded separately. */
  timeEstimate?: import('../schemas/stepTimeEstimate').StepTimeEstimate;
  /** Whole-class role; absent keeps category-derived legacy behavior. */
  classSection?: ClassSectionRole;
  /** Explicit source selection for this exercise; never an approval or prescription. */
  motionStudy?: SequenceMotionStudyBinding;
  /** Undefined preserves legacy exercise steps. Rest never refers to a catalog exercise. */
  kind?: 'exercise' | 'rest';
  stepId: string;
  order: number;
  blockCategory: ClassBlockCategory;
  exerciseId: string;
  /** Total time, including both sides, explanation, and transition. */
  durationMin: number;
  selectedLayer: LayerMode;
  customSpringOverride?: string;
  instructorNote?: string;
  locked?: boolean;
  explanationSec?: number;
  transitionSec?: number;
}

/** Provenance of a separate legacy workspace copy; never a credential or review. */
export interface RecoveredDraftOrigin {
  format: 'persisted-workspace-v0' | 'persisted-workspace-v3';
  sourceSequenceId: string;
  activeTargetGroupId: string;
  draftCriteria: AutoGenerateCriteria | null;
  lastCriteria: AutoGenerateCriteria | null;
  criteriaPresence: { draft: boolean; last: boolean };
  timestamps: 'unrecorded';
}

export interface SavedSequence {
  id: string;
  title: string;
  subtitle: string;
  apparatus: ApparatusType | 'mixed';
  level: DifficultyLevel;
  focusTags: string[];
  targetMinutes: number;
  steps: SequenceStep[];
  createdAt: string;
  updatedAt: string;
  lastTaughtAt?: string;
  taughtCount: number;
  criteriaSnapshot?: AutoGenerateCriteria;
  recoveredDraftOrigin?: RecoveredDraftOrigin;
}

export interface ClassGroupProfile {
  /** Optional instructor context; age never determines difficulty or eligibility. */
  planningPreferences?: GroupPlanningPreferences;
  id: string;
  name: string;
  type: 'group' | 'private';
  defaultLevel: DifficultyLevel;
  scheduleLabel: string;
  notes: string;
}

export interface ClassHistoryLog {
  id: string;
  sequenceId: string;
  sequenceTitle: string;
  groupId: string;
  groupName: string;
  taughtAt: string;
  apparatus: ApparatusType | 'mixed';
  level: DifficultyLevel;
  exerciseIds: string[];
  rating: 1 | 2 | 3 | 4 | 5;
  intensity: 'relaxed' | 'moderate' | 'intense';
  instructorReflection: string;
  actualDurationSec?: number;
  /** Timer-observed rest included in actualDurationSec; absent for older/manual records. */
  actualRestDurationSec?: number;
  stepsSnapshot?: SequenceStep[];
  criteriaSnapshot?: AutoGenerateCriteria;
}

export interface ConditionTemplate {
  id: string;
  name: string;
  criteria: AutoGenerateCriteria;
  createdAt: string;
}

export interface BlockMetadata {
  category: ClassBlockCategory;
  stepNumber: string;
  nameKo: string;
  nameEn: string;
  defaultTargetMin: number;
  description: string;
  recommendedSprings: string;
}

export interface AutoGenerateCriteria {
  apparatus: ApparatusType | 'mixed';
  ownedApparatus?: ApparatusType[];
  /** Exact available apparatus IDs; all exercise requirements must be included. */
  availableEquipment?: string[];
  planningGoals?: ('pelvic-control' | 'trunk-hip-coordination' | 'mobility' | 'strength')[];
  /** Instructor observations only; never a diagnosis or automatic eligibility rule. */
  instructorObservations?: ('anterior-pelvic-tilt' | 'posterior-pelvic-tilt')[];
  level: DifficultyLevel;
  focusPreset: 'full-body' | 'core-sculpt' | 'glute-lower' | 'posture-upper' | 'mobility-rehab';
  preferredProps: PropType[];
  excludeDaysWindow: number;
  targetGroupId?: string;
  targetMinutes: number;
  /** Rest is included in targetMinutes, never added on top. Undefined means no automatic rest. */
  restMinutes?: number;
  defaultLayer: LayerMode;
}

export interface CuratedSequenceProgram {
  id: string;
  titleKo: string;
  subtitleKo: string;
  durationMinutes: 15 | 20 | 30 | 45 | 50 | 60;
  requiredApparatus: ApparatusType[];
  recommendedProps: PropType[];
  level: DifficultyLevel;
  tempo: WorkoutTempo;
  region: VideoRegion;
  coverImage: string;
  youtubeId: string;
  youtubeChannel: string;
  focusPreset: AutoGenerateCriteria['focusPreset'];
  highlights: string[];
}

export interface TransitionAlert {
  fromStepIndex: number;
  toStepIndex: number;
  reasons: string[];
  severity: 'smooth' | 'minor' | 'major';
}

export interface SequenceAnalytics {
  totalMinutes: number;
  targetMinutes: number;
  pacingDelta: number;
  spinalPlaneCounts: Record<SpinalPlane, number>;
  missingSpinalPlanes: SpinalPlane[];
  transitionScore: number;
  transitionAlerts: TransitionAlert[];
  springChangeCount: number;
  boxChangeCount: number;
  positionChangeCount: number;
  recentlyTaughtCount: number;
}
