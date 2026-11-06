import { z } from 'zod';

export const studyExerciseIdSchema = z
  .string()
  .min(1)
  .max(300)
  .refine(
    (value) =>
      value === value.trim() &&
      !Array.from(value).some((character) => {
        const code = character.codePointAt(0)!;
        return code <= 0x1f || (code >= 0x7f && code <= 0x9f);
      }),
    '학습 북마크의 동작 ID를 확인해 주세요.',
  );
export const studyTutorialTaskIdSchema = z
  .string()
  .regex(
    /^[a-zA-Z0-9][a-zA-Z0-9:._/-]{0,99}$/u,
    '학습 과제 ID는 100자 이내의 영문·숫자 식별자로 입력해 주세요.',
  );
const unique = (items: string[]) => new Set(items).size === items.length;
export const instructorStudyStateSchema = z
  .object({
    bookmarkedExerciseIds: z.array(studyExerciseIdSchema).max(20000).refine(unique),
    rehearsalCueHidden: z.boolean(),
    completedTutorialTaskIds: z.array(studyTutorialTaskIdSchema).max(100).refine(unique),
  })
  .strict();
