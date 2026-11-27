import { describe, expect, it } from 'vitest';
import { GLOBAL_CRAWLED_REPERTOIRE_EXERCISES } from '../data/globalCrawledRepertoirePack';
import { INITIAL_EXERCISES } from '../data/pilatesCatalog';
import { practiceNotesByExerciseId, singleSideSteps } from '../data/exercisePracticeNotes';
import { WORLD_PILATES_BY_ID, WORLD_PILATES_EXERCISES } from '../data/worldPilatesRepertoire1000';
import { getExercisePracticeGuide } from './exercisePracticeGuide';

describe('따라 하기 안내', () => {
  it('전체 카탈로그와 이전 형식의 기본 동작에서 시작, 움직임, 확인할 점을 보여 준다', () => {
    const allBaseIds = WORLD_PILATES_EXERCISES.filter((exercise) => exercise.tier === 'atomic').map(
      (exercise) => exercise.id,
    );
    expect(new Set(practiceNotesByExerciseId.keys())).toEqual(new Set(allBaseIds));
    const missing = [
      ...INITIAL_EXERCISES,
      ...GLOBAL_CRAWLED_REPERTOIRE_EXERCISES,
      ...WORLD_PILATES_EXERCISES,
    ].filter((exercise) => {
      const world = WORLD_PILATES_BY_ID.get(exercise.id)!;
      const note = practiceNotesByExerciseId.get(world.parentArchetypeId)!;
      const guide = getExercisePracticeGuide(exercise);
      const singleSide =
        world.variationKind === 'single-leg' || world.variationKind === 'unilateral-arm';
      const expected = singleSide
        ? singleSideSteps.get(world.parentArchetypeId)
        : [note.setup, note.movement];
      return (
        !expected ||
        !expected.every((step) => guide.steps.includes(step)) ||
        guide.benefit !== note.benefit ||
        guide.steps.at(-1) !== note.check ||
        !guide.focus ||
        !guide.breath
      );
    });
    expect(missing.map((exercise) => exercise.id)).toEqual([]);
  });

  it('같은 동작 ID라도 직접 고친 기구나 설명을 카탈로그 문구로 덮지 않는다', () => {
    const base = INITIAL_EXERCISES[0]!;
    const editedNotes = {
      ...base,
      cues: ['강사가 직접 정한 순서'],
      breathPattern: '두 박자씩 쉬어요.',
    };
    const editedSetup = { ...base, springs: '개인 설정' };
    expect(getExercisePracticeGuide(editedNotes)).toMatchObject({
      steps: editedNotes.cues,
      breath: editedNotes.breathPattern,
    });
    expect(getExercisePracticeGuide(editedSetup).steps).toEqual(base.cues);
    const barrel = INITIAL_EXERCISES.find((exercise) => exercise.apparatus === 'barrel')!;
    expect(
      getExercisePracticeGuide({ ...barrel, requiredEquipment: ['spine-corrector'] }).steps,
    ).toEqual(barrel.cues);
  });
});
