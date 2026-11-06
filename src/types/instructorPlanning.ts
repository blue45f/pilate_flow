import type { AutoGenerateCriteria } from './pilates';

/** Broad, optional context only. Age never selects difficulty or establishes exercise eligibility. */
export type GroupAgeBand = 'under-18' | '18-39' | '40-59' | '60-plus' | 'mixed' | 'unspecified';
export type GroupExperience = 'new' | 'some' | 'experienced' | 'mixed' | 'unspecified';

/** Reusable instructor choices, without another group's identity or personal observations. */
export type GroupPlanningConditions = Omit<
  AutoGenerateCriteria,
  'targetGroupId' | 'instructorObservations'
>;

export interface GroupPlanningPreferences {
  ageBand?: GroupAgeBand;
  experience?: GroupExperience;
  mixedLevelNotes?: string;
  conditions?: GroupPlanningConditions;
}
