/** Personal learning organization only; never a planning review or credential record. */
export interface InstructorStudyState {
  bookmarkedExerciseIds: string[];
  rehearsalCueHidden: boolean;
  completedTutorialTaskIds: string[];
}

export function createEmptyInstructorStudyState(): InstructorStudyState {
  return {
    bookmarkedExerciseIds: [],
    rehearsalCueHidden: true,
    completedTutorialTaskIds: [],
  };
}
