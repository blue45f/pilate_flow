import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '../App';
import { usePilatesStore } from '../store/usePilatesStore';
import { INITIAL_EXERCISES } from '../data/pilatesCatalog';
import { isExerciseAutoEligible } from '../utils/exerciseReview';
import { syntheticPlanningExercise } from './planningFixtures';
import type { SequenceStep } from '../types/pilates';

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
  await screen.findByRole('timer');
  fireEvent.click(screen.getByRole('button', { name: '수업 시작' }));
  jump(20);
  fireEvent.click(screen.getByRole('button', { name: '다음 동작' }));
  jump(7);
  expect(screen.getByRole('timer')).toHaveTextContent('00:53');
}
const destinations = [
  {
    label: 'desktop history',
    tab: 'history',
    click: () =>
      fireEvent.click(
        within(screen.getByRole('navigation', { name: '주 메뉴' })).getByRole('button', {
          name: '수업 기록',
        }),
      ),
  },
  {
    label: 'brand workbench',
    tab: 'workbench',
    click: () => fireEvent.click(screen.getByRole('link', { name: 'Flow Atelier 계획으로' })),
  },
  {
    label: 'upcoming schedule',
    tab: 'schedule',
    click: () =>
      fireEvent.click(
        within(screen.getByRole('region', { name: '다가오는 수업' })).getByRole('button', {
          name: /V12 합성 다음 회차/,
        }),
      ),
  },
] as const;

describe('actual app navigation preserves an unrecorded teaching session', () => {
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
  });

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

  it('allows leaving an unreviewed stage without enabling its timer or changing canonical eligibility', async () => {
    usePilatesStore.setState({
      exercises: [...INITIAL_EXERCISES, { ...first, review: undefined }, second],
    });
    render(<App />);
    await screen.findByRole('heading', { name: '강사 검토 후 수업을 시작해 주세요' });
    expect(screen.queryByRole('timer')).not.toBeInTheDocument();
    destinations[0].click();
    expect(usePilatesStore.getState().activeTab).toBe('history');
    expect(screen.queryByRole('dialog', { name: '수업 화면을 나갈까요?' })).not.toBeInTheDocument();
  });
});
