import { openAppTools } from './workbenchControls';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '../App';
import { usePilatesStore } from '../store/usePilatesStore';
import { INITIAL_EXERCISES } from '../data/pilatesCatalog';
import { isExerciseAutoEligible } from '../utils/exerciseReview';
import { syntheticPlanningExercise } from './planningFixtures';
import type { SavedSequence, SequenceStep } from '../types/pilates';

const original = usePilatesStore.getState();
const production = structuredClone(INITIAL_EXERCISES);
const first = syntheticPlanningExercise('mat', 'core', 'alpha');
const second = syntheticPlanningExercise('mat', 'lower-body', 'beta');
const sequenceId = 'qa-v12-stage-navigation';
const steps: SequenceStep[] = [
  {
    stepId: 'qa-v12-first',
    order: 1,
    exerciseId: first.id,
    blockCategory: 'core',
    durationMin: 4,
    selectedLayer: 'standard',
    locked: true,
  },
  {
    stepId: 'qa-v12-rest',
    order: 2,
    exerciseId: '',
    kind: 'rest',
    blockCategory: 'core',
    durationMin: 1,
    selectedLayer: 'standard',
    locked: true,
  },
  {
    stepId: 'qa-v12-second',
    order: 3,
    exerciseId: second.id,
    blockCategory: 'lower-body',
    durationMin: 5,
    selectedLayer: 'standard',
  },
];
const savedClass: SavedSequence = {
  id: 'qa-stage-next-class',
  title: '다음 합성 수업',
  subtitle: '',
  apparatus: 'mat',
  level: '1.0',
  focusTags: [],
  targetMinutes: 10,
  steps: [{ ...steps[2], stepId: 'qa-next-class-step', order: 1, durationMin: 10 }],
  createdAt: '2026-11-04T08:00:00Z',
  updatedAt: '2026-11-04T08:00:00Z',
  taughtCount: 0,
};
beforeEach(async () => {
  vi.useFakeTimers({ toFake: ['Date', 'setInterval', 'clearInterval'] });
  vi.setSystemTime(new Date('2026-11-05T08:00:00Z'));
  localStorage.clear();
  usePilatesStore.setState({
    ...original,
    activeTab: 'stage',
    activeSequenceId: sequenceId,
    activeTitle: 'V12 합성 수업 · 실제 수업 아님',
    activeSubtitle: '',
    activeApparatus: 'mat',
    activeLevel: '1.0',
    activeTargetMinutes: 10,
    activeTargetGroupId: 'qa-v12-group',
    activeSteps: structuredClone(steps),
    exercises: [...INITIAL_EXERCISES, first, second],
    savedSequences: [],
    historyLogs: [],
    conditionTemplates: [],
    undoStack: [],
    classGroups: [
      {
        id: 'qa-v12-group',
        name: '합성 V12 반',
        type: 'group',
        defaultLevel: '1.0',
        scheduleLabel: '',
        notes: '',
      },
    ],
    instructorSchedule: {
      locations: [
        {
          id: 'qa-v12-location',
          alias: '합성 공간',
          equipmentIds: ['mat'],
          propIds: [],
          notes: '',
        },
      ],
      classes: [
        {
          id: 'qa-v12-class',
          title: 'V12 합성 다음 회차',
          participantAlias: '합성 반',
          locationId: 'qa-v12-location',
          startDate: '2026-11-05',
          startTime: '19:00',
          endTime: '20:00',
          recurrence: 'once',
          weekdays: [],
          notes: '',
        },
      ],
      exceptions: [],
    },
    draftCriteria: {
      apparatus: 'mat',
      level: '1.0',
      focusPreset: 'full-body',
      availableEquipment: ['mat'],
      preferredProps: [],
      excludeDaysWindow: 0,
      targetMinutes: 10,
      restMinutes: 1,
      targetGroupId: 'qa-v12-group',
      defaultLayer: 'standard',
    },
    lastCriteria: null,
    ownedEquipment: ['mat'],
    ownedApparatus: ['mat'],
    ownedProps: [],
    generationError: null,
    saveFeedback: null,
    persistenceError: null,
  });
  await Promise.resolve();
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
  expect(INITIAL_EXERCISES).toEqual(production);
  expect(INITIAL_EXERCISES.filter(isExerciseAutoEligible)).toHaveLength(0);
  usePilatesStore.setState(original, true);
  localStorage.clear();
});
function jump(seconds: number) {
  act(() => {
    vi.setSystemTime(Date.now() + seconds * 1000);
    document.dispatchEvent(new Event('visibilitychange'));
  });
}
async function runningSession() {
  render(<App />);
  await screen.findByRole('timer', {}, { timeout: 6000 });
  fireEvent.click(screen.getByRole('button', { name: '수업 시작' }));
  jump(20);
  fireEvent.click(screen.getByRole('button', { name: '다음 동작' }));
  jump(7);
  expect(screen.getByRole('timer')).toHaveTextContent('00:53');
}
function openPalette() {
  fireEvent.keyDown(window, { key: 'k', ctrlKey: true });
  return within(screen.getByTestId('studio-command-palette'));
}
function requestSavedClass() {
  fireEvent.click(openPalette().getByRole('button', { name: `${savedClass.title} 불러오기` }));
  return screen.getByRole('dialog', { name: '수업 화면을 나갈까요?' });
}
async function reviewAndOpenLog() {
  fireEvent.click(
    within(screen.getByRole('dialog', { name: '수업 화면을 나갈까요?' })).getByRole('button', {
      name: '종료 내용 검토',
    }),
  );
  fireEvent.click(
    within(screen.getByRole('dialog', { name: '수업 진행을 마칠까요?' })).getByRole('button', {
      name: '검토하고 기록하기',
    }),
  );
  return within(await screen.findByRole('dialog', { name: '수업 기록 남기기' }));
}
const destinations = [
  {
    label: 'desktop history',
    tab: 'history',
    click: () =>
      fireEvent.click(
        openAppTools().getByRole('button', { name: '수업 기록' }),
      ),
  },
  {
    label: 'brand workbench',
    tab: 'workbench',
    click: () => fireEvent.click(screen.getByRole('link', { name: 'Pilates Flow 수업 만들기로' })),
  },
  {
    label: 'upcoming schedule',
    tab: 'schedule',
    click: () => {
      openAppTools();
      return fireEvent.click(
        within(screen.getByRole('region', { name: '다가오는 수업' })).getByRole('button', {
          name: /V12 합성 다음 회차/,
        }),
      );
    },
  },
] as const;

describe('actual app navigation preserves an unrecorded teaching session', () => {
  it('defers loading a saved class until the instructor confirms leaving the running session', async () => {
    usePilatesStore.setState({ savedSequences: [structuredClone(savedClass)] });
    await runningSession();
    const before = usePilatesStore.getState();
    const dialog = requestSavedClass();
    expect(dialog).toHaveTextContent(`${savedClass.title} 불러오기`);
    expect(usePilatesStore.getState().activeSequenceId).toBe(sequenceId);
    expect(usePilatesStore.getState().activeSteps).toBe(before.activeSteps);
    expect(usePilatesStore.getState().activeTab).toBe('stage');
    fireEvent.keyDown(window, { key: 'k', ctrlKey: true });
    expect(screen.queryByTestId('studio-command-palette')).not.toBeInTheDocument();
    jump(90);
    fireEvent.click(within(dialog).getByRole('button', { name: '수업 화면 유지' }));
    expect(screen.getByRole('timer')).toHaveTextContent('00:53');
    expect(usePilatesStore.getState().activeSequenceId).toBe(sequenceId);
    expect(usePilatesStore.getState().activeSteps).toBe(before.activeSteps);

    const retry = requestSavedClass();
    fireEvent.click(within(retry).getByRole('button', { name: '기록 없이 나가기' }));
    expect(usePilatesStore.getState().activeTab).toBe('workbench');
    expect(usePilatesStore.getState().activeSequenceId).toBe(savedClass.id);
    expect(usePilatesStore.getState().activeSteps).toEqual(savedClass.steps);
    expect(usePilatesStore.getState().historyLogs).toHaveLength(0);
  }, 15000);

  it('records the original session before committing the saved class replacement', async () => {
    usePilatesStore.setState({ savedSequences: [structuredClone(savedClass)] });
    await runningSession();
    requestSavedClass();
    const fields = await reviewAndOpenLog();
    expect(usePilatesStore.getState().activeSequenceId).toBe(sequenceId);
    fireEvent.click(fields.getByRole('button', { name: '수업 기록 저장' }));
    expect(usePilatesStore.getState().activeSequenceId).toBe(savedClass.id);
    expect(usePilatesStore.getState().activeTab).toBe('workbench');
    expect(usePilatesStore.getState().historyLogs).toHaveLength(1);
    expect(usePilatesStore.getState().historyLogs[0]).toMatchObject({
      sequenceId,
      actualDurationSec: 27,
      actualRestDurationSec: 7,
      stepsSnapshot: [
        expect.objectContaining({ stepId: steps[0].stepId }),
        expect.objectContaining({ stepId: steps[1].stepId }),
      ],
    });
  });

  it.each(['close-button', 'escape', 'record-cancel'] as const)(
    'forgets a cancelled saved-class action after %s, including a later direct finish',
    async (cancel) => {
      usePilatesStore.setState({ savedSequences: [structuredClone(savedClass)] });
      await runningSession();
      const dialog = requestSavedClass();
      if (cancel === 'record-cancel') {
        const fields = await reviewAndOpenLog();
        fireEvent.click(fields.getByRole('button', { name: '취소' }));
      } else if (cancel === 'escape') {
        fireEvent(dialog, new Event('cancel', { cancelable: true }));
      } else {
        fireEvent.click(within(dialog).getByRole('button', { name: '닫기' }));
      }
      expect(usePilatesStore.getState().activeTab).toBe('stage');
      expect(screen.getByRole('timer')).toHaveTextContent('00:53');
      fireEvent.click(screen.getByRole('button', { name: '종료 / 기록' }));
      fireEvent.click(
        within(screen.getByRole('dialog', { name: '수업 진행을 마칠까요?' })).getByRole('button', {
          name: '기록 없이 계획으로 돌아가기',
        }),
      );
      expect(usePilatesStore.getState().activeTab).toBe('workbench');
      expect(usePilatesStore.getState().activeSequenceId).toBe(sequenceId);
      expect(usePilatesStore.getState().activeSteps).toEqual(steps);
    },
  );

  it.each(['sidebar', 'palette'] as const)(
    'guards the %s member-role switch and preserves the clock when cancelled',
    async (entry) => {
      await runningSession();
      const switchMember = () => {
        if (entry === 'palette') {
          fireEvent.click(openPalette().getByRole('button', { name: /회원 수업 예약/ }));
        } else {
          fireEvent.click(openAppTools().getByRole('button', { name: '회원 예약 화면 보기' }));
        }
      };
      switchMember();
      const dialog = screen.getByRole('dialog', { name: '수업 화면을 나갈까요?' });
      expect(dialog).toHaveTextContent('회원 예약');
      expect(usePilatesStore.getState().activeTab).toBe('stage');
      expect(screen.queryByTestId('member-desktop-nav')).not.toBeInTheDocument();
      fireEvent.click(within(dialog).getByRole('button', { name: '수업 화면 유지' }));
      jump(60);
      expect(screen.getByRole('timer')).toHaveTextContent('00:53');
      switchMember();
      fireEvent.click(
        within(screen.getByRole('dialog', { name: '수업 화면을 나갈까요?' })).getByRole('button', {
          name: '기록 없이 나가기',
        }),
      );
      expect(await screen.findByTestId('member-desktop-nav')).toBeInTheDocument();
      expect(usePilatesStore.getState().activeTab).toBe('workbench');
      expect(usePilatesStore.getState().activeSequenceId).toBe(sequenceId);
      expect(usePilatesStore.getState().historyLogs).toHaveLength(0);
    },
  );

  it('announces the mobile timer action for ready, running and paused states', async () => {
    render(<App />);
    await screen.findByRole('timer');
    const toggle = screen.getByTestId('live-thumb-play-toggle');
    expect(toggle).toHaveAccessibleName('한 손 도크 수업 시작');
    fireEvent.click(toggle);
    expect(toggle).toHaveAccessibleName('한 손 도크 수업 일시정지');
    jump(5);
    fireEvent.click(toggle);
    expect(toggle).toHaveAccessibleName('한 손 도크 수업 이어서 진행');
    expect(screen.getByRole('timer')).toHaveTextContent('03:55');
  });

  it('leaves a ready never-started unchanged session without an unnecessary confirmation', async () => {
    render(<App />);
    await screen.findByRole('timer');
    const before = usePilatesStore.getState();
    destinations[0].click();
    const after = usePilatesStore.getState();
    expect(after.activeTab).toBe('history');
    expect(screen.queryByRole('dialog', { name: '수업 화면을 나갈까요?' })).not.toBeInTheDocument();
    expect(after.activeSteps).toBe(before.activeSteps);
    expect(after.activeTitle).toBe(before.activeTitle);
    expect(after.savedSequences).toBe(before.savedSequences);
    expect(after.historyLogs).toBe(before.historyLogs);
    expect(after.undoStack).toBe(before.undoStack);
  });

  it('still asks before losing a session-only minute added before the timer starts', async () => {
    render(<App />);
    await screen.findByRole('timer');
    const before = usePilatesStore.getState();
    fireEvent.click(screen.getByRole('button', { name: '현재 동작 1분 추가' }));
    expect(screen.getByRole('timer')).toHaveTextContent('05:00');
    destinations[1].click();
    const dialog = screen.getByRole('dialog', { name: '수업 화면을 나갈까요?' });
    expect(usePilatesStore.getState().activeTab).toBe('stage');
    fireEvent.click(within(dialog).getByRole('button', { name: '수업 화면 유지' }));
    expect(screen.getByRole('timer')).toHaveTextContent('05:00');
    expect(screen.getByRole('button', { name: '수업 시작' })).toBeInTheDocument();
    expect(usePilatesStore.getState().activeSteps).toBe(before.activeSteps);
    expect(usePilatesStore.getState().activeSteps[0].durationMin).toBe(4);
    expect(usePilatesStore.getState().historyLogs).toBe(before.historyLogs);
  });

  it.each(destinations)(
    'asks before $label can unmount tracked movement/rest progress',
    async ({ click, tab }) => {
      await runningSession();
      const before = usePilatesStore.getState();
      click();
      // Short assertions keep failure logs free of raw record/DOM dumps.
      expect(screen.queryByRole('dialog', { name: '수업 화면을 나갈까요?' }) !== null).toBe(true);
      expect(usePilatesStore.getState().activeTab).toBe('stage');
      expect(usePilatesStore.getState().historyLogs).toBe(before.historyLogs);
      expect(usePilatesStore.getState().activeSteps).toBe(before.activeSteps);
      jump(90);
      fireEvent.click(
        within(screen.getByRole('dialog', { name: '수업 화면을 나갈까요?' })).getByRole('button', {
          name: '수업 화면 유지',
        }),
      );
      expect(screen.getByRole('timer')).toHaveTextContent('00:53');
      expect(screen.getByRole('button', { name: '이어서 진행' })).toBeInTheDocument();
      expect(usePilatesStore.getState().activeTab).toBe('stage');
      click();
      const dialog = screen.getByRole('dialog', {
        name: '수업 화면을 나갈까요?',
      }) as HTMLDialogElement;
      const nativeClose = dialog.close.bind(dialog);
      let closeBeforeUnmount = false;
      vi.spyOn(dialog, 'close').mockImplementation(() => {
        closeBeforeUnmount = dialog.isConnected && usePilatesStore.getState().activeTab === 'stage';
        nativeClose();
      });
      fireEvent.click(within(dialog).getByRole('button', { name: '기록 없이 나가기' }));
      expect(closeBeforeUnmount).toBe(true);
      expect(usePilatesStore.getState().activeTab).toBe(tab);
      expect(usePilatesStore.getState().historyLogs).toBe(before.historyLogs);
    },
  );

  it('keeps the paused session when a navigation-triggered record form is cancelled', async () => {
    await runningSession();
    destinations[0].click();
    fireEvent.click(
      within(screen.getByRole('dialog', { name: '수업 화면을 나갈까요?' })).getByRole('button', {
        name: '종료 내용 검토',
      }),
    );
    const review = screen.getByRole('dialog', { name: '수업 진행을 마칠까요?' });
    expect(within(review).getByText('00:27')).toBeInTheDocument();
    fireEvent.click(within(review).getByRole('button', { name: '검토하고 기록하기' }));
    const form = await screen.findByRole('dialog', { name: '수업 기록 남기기' });
    fireEvent.change(within(form).getByLabelText('다음 수업을 위한 메모 (선택)'), {
      target: { value: 'V12 합성 취소 메모' },
    });
    fireEvent.click(within(form).getByRole('button', { name: '취소' }));
    expect(usePilatesStore.getState().activeTab).toBe('stage');
    expect(usePilatesStore.getState().historyLogs).toHaveLength(0);
    jump(90);
    expect(screen.getByRole('timer')).toHaveTextContent('00:53');
    expect(screen.getByRole('button', { name: '이어서 진행' })).toBeInTheDocument();
  });

  it('retains the requested schedule through validation failure and records exact movement/rest time once', async () => {
    await runningSession();
    destinations[2].click();
    fireEvent.click(
      within(screen.getByRole('dialog', { name: '수업 화면을 나갈까요?' })).getByRole('button', {
        name: '종료 내용 검토',
      }),
    );
    fireEvent.click(
      within(screen.getByRole('dialog', { name: '수업 진행을 마칠까요?' })).getByRole('button', {
        name: '검토하고 기록하기',
      }),
    );
    const form = await screen.findByRole('dialog', { name: '수업 기록 남기기' });
    const fields = within(form);
    fireEvent.change(fields.getByLabelText('다음 수업을 위한 메모 (선택)'), {
      target: { value: 'V12 합성 기록 메모' },
    });
    const movement = fields.getByRole('checkbox', { name: first.nameKo });
    expect(movement).toBeChecked();
    fireEvent.click(movement);
    fireEvent.click(fields.getByRole('button', { name: '수업 기록 저장' }));
    expect(fields.getByRole('alert')).toHaveTextContent('실제로 진행한 동작을 하나 이상');
    expect(usePilatesStore.getState().activeTab).toBe('stage');
    expect(usePilatesStore.getState().historyLogs).toHaveLength(0);
    expect(fields.getByLabelText('다음 수업을 위한 메모 (선택)')).toHaveValue('V12 합성 기록 메모');
    fireEvent.click(movement);
    fireEvent.click(fields.getByRole('button', { name: '수업 기록 저장' }));
    expect(usePilatesStore.getState().activeTab).toBe('schedule');
    expect(usePilatesStore.getState().historyLogs).toHaveLength(1);
    expect(usePilatesStore.getState().historyLogs[0]).toMatchObject({
      sequenceId,
      actualDurationSec: 27,
      actualRestDurationSec: 7,
      instructorReflection: 'V12 합성 기록 메모',
      stepsSnapshot: [
        expect.objectContaining({ stepId: steps[0].stepId }),
        expect.objectContaining({ stepId: steps[1].stepId }),
      ],
    });
  }, 15000);

  it('does not navigate or erase the form when the store fails to append a matching record', async () => {
    const append = vi
      .spyOn(usePilatesStore.getState(), 'logClassSession')
      .mockImplementationOnce(() => undefined);
    await runningSession();
    destinations[1].click();
    fireEvent.click(
      within(screen.getByRole('dialog', { name: '수업 화면을 나갈까요?' })).getByRole('button', {
        name: '종료 내용 검토',
      }),
    );
    fireEvent.click(
      within(screen.getByRole('dialog', { name: '수업 진행을 마칠까요?' })).getByRole('button', {
        name: '검토하고 기록하기',
      }),
    );
    const form = await screen.findByRole('dialog', { name: '수업 기록 남기기' });
    const fields = within(form);
    fireEvent.change(fields.getByLabelText('다음 수업을 위한 메모 (선택)'), {
      target: { value: 'V12 합성 재시도 메모' },
    });
    fireEvent.click(fields.getByRole('button', { name: '수업 기록 저장' }));
    expect(append).toHaveBeenCalledTimes(1);
    expect(fields.getByRole('alert')).toHaveTextContent('수업 기록 저장을 확인하지 못했습니다');
    expect(usePilatesStore.getState().activeTab).toBe('stage');
    expect(usePilatesStore.getState().historyLogs).toHaveLength(0);
    expect(fields.getByLabelText('다음 수업을 위한 메모 (선택)')).toHaveValue(
      'V12 합성 재시도 메모',
    );
    fireEvent.click(fields.getByRole('button', { name: '수업 기록 저장' }));
    expect(append).toHaveBeenCalledTimes(2);
    expect(usePilatesStore.getState().historyLogs).toHaveLength(1);
    expect(usePilatesStore.getState().activeTab).toBe('workbench');
  });

  it('allows leaving an idle pending stage without changing review evidence', async () => {
    usePilatesStore.setState({
      exercises: [...INITIAL_EXERCISES, { ...first, review: undefined }, second],
    });
    render(<App />);
    await screen.findByRole('timer');
    expect(screen.getByRole('button', { name: '수업 시작' })).toBeEnabled();
    expect(
      usePilatesStore.getState().exercises.find((exercise) => exercise.id === first.id)?.review,
    ).toBeUndefined();
    destinations[0].click();
    expect(usePilatesStore.getState().activeTab).toBe('history');
    expect(screen.queryByRole('dialog', { name: '수업 화면을 나갈까요?' })).not.toBeInTheDocument();
  });
});
