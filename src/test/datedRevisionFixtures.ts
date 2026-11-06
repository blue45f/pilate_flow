import type { InstructorScheduleData } from '../types/instructorSchedule';
import type { SavedSequence } from '../types/pilates';
import { createDatedPlanAssignment } from '../utils/datedSequencePlanning';
import { syntheticPlanningExercise } from './planningFixtures';

export const revisionNow = '2026-11-05T10:00:00.000Z';
export const revisionExercise = syntheticPlanningExercise('mat', 'core');
export function revisionSchedule(): InstructorScheduleData {
  return {
    locations: [
      { id: 'place', alias: '검증 장소', equipmentIds: ['mat'], propIds: [], notes: '' },
      { id: 'other-place', alias: '다른 장소', equipmentIds: ['mat'], propIds: [], notes: '' },
    ],
    classes: [
      {
        id: 'class',
        title: '직접 작성 수업',
        participantAlias: '',
        locationId: 'place',
        startDate: '2026-11-02',
        untilDate: '2026-11-30',
        weekdays: [1],
        recurrence: 'weekly',
        startTime: '10:00',
        endTime: '10:50',
        notes: '',
      },
    ],
    exceptions: [],
  };
}
export function revisionSource(id = 'original'): SavedSequence {
  return {
    id,
    title: `${id} 계획`,
    subtitle: '직접 작성',
    apparatus: 'mat',
    level: '1.0',
    targetMinutes: 50,
    focusTags: ['직접 입력'],
    createdAt: revisionNow,
    updatedAt: revisionNow,
    taughtCount: 3,
    steps: [
      {
        stepId: 'motion',
        order: 1,
        exerciseId: revisionExercise.id,
        blockCategory: 'core',
        durationMin: 48,
        selectedLayer: 'easy',
        locked: true,
        repetitions: 8,
        sets: 2,
        sideMode: 'left-then-right',
        explanationSec: 30,
        transitionSec: 30,
        instructorNote: '원래 강사 메모',
        customSpringOverride: '직접 설정',
      },
      {
        stepId: 'rest',
        order: 2,
        kind: 'rest',
        exerciseId: '',
        blockCategory: 'cooldown',
        selectedLayer: 'standard',
        durationMin: 2,
      },
    ],
    criteriaSnapshot: {
      apparatus: 'mat',
      availableEquipment: ['mat'],
      level: '1.0',
      focusPreset: 'full-body',
      preferredProps: [],
      excludeDaysWindow: 0,
      targetMinutes: 50,
      restMinutes: 2,
      defaultLayer: 'easy',
      targetGroupId: 'private-group',
      instructorObservations: ['posterior-pelvic-tilt'],
    },
  };
}
export function revisionAssigned(date = '2026-11-02') {
  const result = createDatedPlanAssignment({
    schedule: revisionSchedule(),
    sequence: revisionSource(),
    classId: 'class',
    originalDate: date,
    state: 'prepared',
    now: revisionNow,
    assignmentId: `assigned-${date}`,
  });
  if (!result.success) throw new Error(result.message);
  return result;
}
