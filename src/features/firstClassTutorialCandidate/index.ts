export type {
  FirstClassTutorialCandidateProps,
  FirstClassTutorialContextOptions,
  FirstClassTutorialContextSummary,
  FirstClassTutorialDiagnosticNote,
  FirstClassTutorialFixturePreset,
  FirstClassTutorialIllustrationKind,
  FirstClassTutorialStepId,
  FirstClassTutorialStepSpec,
  FirstClassTutorialTaskId,
  FirstClassTutorialVisibilityState,
  LegacyInstructorTutorialTaskId,
} from './firstClassTutorialTypes';

export {
  FIRST_CLASS_TUTORIAL_STEPS,
  TUTORIAL_TASK_ID_PATTERN,
  getTutorialStepById,
  isStepCompletedByTaskIds,
  isValidTutorialTaskId,
  resolveFirstClassTutorialContext,
} from './firstClassTutorialModel';

export {
  FirstClassTutorialIllustration,
  type FirstClassTutorialIllustrationProps,
} from './FirstClassTutorialIllustrations';

export {
  FIRST_CLASS_TUTORIAL_FIXTURE_PRESETS,
  getTutorialFixturePresetById,
} from './firstClassTutorialFixtures';

export {
  FirstClassTutorialCandidate,
  FirstClassTutorialFixtureHarness,
  type FirstClassTutorialFixtureHarnessProps,
  type FirstClassTutorialFixtureWindowApi,
} from './FirstClassTutorialCandidate';
