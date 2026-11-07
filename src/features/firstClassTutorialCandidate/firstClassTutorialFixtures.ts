import type { FirstClassTutorialFixturePreset } from './firstClassTutorialTypes';

/**
 * Synthetic fixture presets for standalone verification and integration testing.
 * Contains zero real member data or clinical records.
 */
export const FIRST_CLASS_TUTORIAL_FIXTURE_PRESETS: readonly FirstClassTutorialFixturePreset[] =
  Object.freeze([
    {
      id: 'empty-first-visit',
      labelKo: '첫 방문 · 빈 작업대',
      descriptionKo:
        '아직 추가된 동작이나 초안이 없는 첫 방문 상태입니다. 1단계(새 동작 한 줄로 적기)를 기본 안내합니다.',
      source: {
        title: '오늘의 첫 수업 시퀀스',
        targetMinutes: 50,
        steps: [],
        ideaDrafts: [],
        reusableBlocks: [],
        savedSequences: [],
        completedTutorialTaskIds: [],
      },
      initialVisibility: 'open',
    },
    {
      id: 'idea-draft-ready',
      labelKo: '1단계 완료 · 한 줄 동작 준비됨',
      descriptionKo:
        '한 줄 동작 아이디어 2개와 재사용 블록 1개가 준비되어 2단계(블록 조합)를 안내합니다.',
      source: {
        title: '리포머 기초 수업 초안',
        targetMinutes: 50,
        steps: [],
        ideaDrafts: [
          {
            exerciseId: 'idea-footwork-warmup',
            ideaLine: '풋바 밀며 호흡과 골반 중립 맞추기',
            workingTitle: '풋워크 호흡 워밍업',
            durationMin: 5,
          },
          {
            exerciseId: 'idea-strap-circle',
            ideaLine: '스트랩 걸고 다리 원 그리기',
            workingTitle: '피트 인 스트랩 서클',
            durationMin: 6,
          },
        ],
        reusableBlocks: [
          {
            id: 'block-warmup-basic',
            title: '리포머 기본 준비 8분 묶음',
            items: [{ exerciseId: 'idea-footwork-warmup', durationMin: 5 }],
          },
        ],
        savedSequences: [],
        completedTutorialTaskIds: ['first-class:new-movement'],
      },
      initialVisibility: 'open',
    },
    {
      id: 'blocks-composed-50min',
      labelKo: '2단계 완료 · 50분 블록 편성됨',
      descriptionKo:
        '준비·본운동·휴식·마무리 블록(동작 4개 + 휴식 1개)이 구성되어 3단계(수업 저장)를 안내합니다.',
      source: {
        title: '월요일 오전 리포머 50분',
        targetMinutes: 50,
        steps: [
          {
            stepId: 'step-1',
            kind: 'exercise',
            blockCategory: 'warmup',
            exerciseId: 'ex-breathing',
            durationMin: 8,
          },
          {
            stepId: 'step-2',
            kind: 'exercise',
            blockCategory: 'core',
            exerciseId: 'ex-hundred-prep',
            durationMin: 16,
          },
          {
            stepId: 'step-3',
            kind: 'rest',
            blockCategory: 'warmup',
            exerciseId: '__rest__',
            durationMin: 2,
          },
          {
            stepId: 'step-4',
            kind: 'exercise',
            blockCategory: 'feet-in-straps',
            exerciseId: 'ex-strap-circles',
            durationMin: 18,
          },
          {
            stepId: 'step-5',
            kind: 'exercise',
            blockCategory: 'cooldown',
            exerciseId: 'ex-mermaid-stretch',
            durationMin: 6,
          },
        ],
        ideaDrafts: [
          {
            exerciseId: 'idea-footwork-warmup',
            ideaLine: '풋바 밀며 호흡과 골반 중립 맞추기',
          },
        ],
        reusableBlocks: [
          {
            id: 'block-warmup-basic',
            title: '리포머 기본 준비 8분 묶음',
          },
        ],
        savedSequences: [],
        completedTutorialTaskIds: [
          'first-class:new-movement',
          'first-class:block-compose',
        ],
      },
      initialVisibility: 'open',
    },
    {
      id: 'saved-and-revisited',
      labelKo: '3단계 완료 · 서랍 보관 및 접힘',
      descriptionKo:
        '수업 서랍에 시퀀스가 저장되었고 가이드를 건너뛴 상태입니다. 언제든 다시 펼쳐 볼 수 있습니다.',
      source: {
        title: '월요일 오전 리포머 50분',
        targetMinutes: 50,
        steps: [
          {
            stepId: 'step-1',
            kind: 'exercise',
            blockCategory: 'warmup',
            exerciseId: 'ex-breathing',
            durationMin: 8,
          },
          {
            stepId: 'step-2',
            kind: 'exercise',
            blockCategory: 'core',
            exerciseId: 'ex-hundred-prep',
            durationMin: 16,
          },
          {
            stepId: 'step-3',
            kind: 'rest',
            blockCategory: 'warmup',
            exerciseId: '__rest__',
            durationMin: 2,
          },
          {
            stepId: 'step-4',
            kind: 'exercise',
            blockCategory: 'cooldown',
            exerciseId: 'ex-mermaid-stretch',
            durationMin: 6,
          },
        ],
        ideaDrafts: [
          {
            exerciseId: 'idea-footwork-warmup',
            ideaLine: '풋바 밀며 호흡과 골반 중립 맞추기',
          },
        ],
        reusableBlocks: [],
        savedSequences: [
          {
            id: 'saved-seq-1',
            title: '월요일 오전 리포머 50분',
            targetMinutes: 50,
          },
        ],
        completedTutorialTaskIds: [
          'first-class:new-movement',
          'first-class:block-compose',
          'first-class:save-class',
        ],
      },
      initialVisibility: 'skipped',
    },
    {
      id: 'legacy-study-migrated',
      labelKo: '기존 연습실 체크 호환',
      descriptionKo:
        '기존 강사 연습실(compose, rehearse) 체크 기록을 첫 수업 3단계 진행 상태로 안전하게 매핑합니다.',
      source: {
        activeTitle: '수요일 저녁 그룹 리포머',
        activeTargetMinutes: 50,
        activeSteps: [
          {
            stepId: 'legacy-step-1',
            exerciseId: 'ex-footwork',
            durationMin: 10,
          },
          {
            stepId: 'legacy-step-2',
            exerciseId: 'ex-bridging',
            durationMin: 12,
          },
        ],
        savedSequences: [
          {
            id: 'saved-legacy-1',
            title: '수요일 저녁 그룹 리포머',
            targetMinutes: 50,
          },
        ],
        study: {
          bookmarkedExerciseIds: ['ex-footwork'],
          rehearsalCueHidden: true,
          completedTutorialTaskIds: ['compose', 'rehearse'],
        },
      },
      initialVisibility: 'open',
    },
    {
      id: 'malformed-boundary-input',
      labelKo: '비정상 입력 방어 확인',
      descriptionKo:
        '음수 목표 시간, 손상된 배열 원소, 잘못된 체크 ID가 섞여 있어도 오류 없이 유효 항목만 요약합니다.',
      source: {
        title: '   ',
        targetMinutes: -15,
        steps: [
          null,
          { stepId: 'valid-step-1', exerciseId: 'ex-1', durationMin: 10 },
          { stepId: 'bad-duration', exerciseId: 'ex-2', durationMin: -5 },
        ],
        ideaDrafts: [
          123,
          { exerciseId: 'valid-idea-1', ideaLine: '바른 호흡 한 줄 메모' },
        ],
        reusableBlocks: ['not-an-object'],
        savedSequences: [{ id: '', title: '' }],
        completedTutorialTaskIds: [
          'first-class:new-movement',
          'invalid task id with spaces!',
          '',
        ],
      },
      initialVisibility: 'open',
    },
  ]);

export function getTutorialFixturePresetById(
  presetId: string,
): FirstClassTutorialFixturePreset {
  const found = FIRST_CLASS_TUTORIAL_FIXTURE_PRESETS.find(
    (preset) => preset.id === presetId,
  );
  return found ?? FIRST_CLASS_TUTORIAL_FIXTURE_PRESETS[0];
}
