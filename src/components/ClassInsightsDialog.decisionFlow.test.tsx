import { useState } from 'react';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { INITIAL_EXERCISES, INITIAL_HISTORY_LOGS } from '../data/pilatesCatalog';
import type { ClassHistoryLog, PilatesExercise, SequenceStep } from '../types/pilates';
import { ClassInsightsDialog, type ClassInsightsDialogProps } from './ClassInsightsDialog';

const unilateralExercise: PilatesExercise = {
  ...INITIAL_EXERCISES[0],
  id: 'flow-ex-unilateral',
  nameKo: '스탠딩 런지',
  targetMuscles: ['둔근', '대퇴사두근'],
  spinalPlanes: ['neutral', 'extension'],
  isUnilateral: true,
};

const bilateralExercise: PilatesExercise = {
  ...INITIAL_EXERCISES[1],
  id: 'flow-ex-bilateral',
  nameKo: '펠빅 브릿지',
  targetMuscles: ['둔근', '햄스트링'],
  spinalPlanes: ['flexion', 'extension'],
  isUnilateral: false,
};

const mixedSideSteps: SequenceStep[] = [
  {
    stepId: 'step-unspecified',
    order: 1,
    exerciseId: unilateralExercise.id,
    blockCategory: 'lower-body',
    selectedLayer: 'standard',
    durationMin: 3,
    explanationSec: 20,
    transitionSec: 10,
  },
  {
    stepId: 'step-left-only',
    order: 2,
    exerciseId: unilateralExercise.id,
    blockCategory: 'lower-body',
    selectedLayer: 'standard',
    sideMode: 'left',
    durationMin: 2,
    explanationSec: 15,
    transitionSec: 15,
  },
  {
    stepId: 'step-balanced',
    order: 3,
    exerciseId: bilateralExercise.id,
    blockCategory: 'bridging',
    selectedLayer: 'standard',
    sideMode: 'together',
    durationMin: 2,
    explanationSec: 15,
    transitionSec: 15,
  },
  {
    stepId: 'step-rest',
    order: 4,
    exerciseId: '',
    kind: 'rest',
    blockCategory: 'bridging',
    selectedLayer: 'standard',
    durationMin: 1,
  },
];

const zeroRecordedLog: ClassHistoryLog = {
  ...INITIAL_HISTORY_LOGS[0],
  id: 'user-log-zero',
  sequenceTitle: '실제 0초로 기록한 수업',
  groupName: '오전 그룹',
  taughtAt: '2026-11-10T10:00:00.000Z',
  intensity: 'relaxed',
  rating: 5,
  actualDurationSec: 0,
  actualRestDurationSec: 0,
  stepsSnapshot: mixedSideSteps,
};

const partialMissingRestLog: ClassHistoryLog = {
  ...INITIAL_HISTORY_LOGS[0],
  id: 'user-log-partial-missing',
  sequenceTitle: '휴식 시간 미기록 수업',
  groupName: '저녁 그룹',
  taughtAt: '2026-11-09T19:00:00.000Z',
  intensity: 'moderate',
  rating: 4,
  actualDurationSec: 480,
  actualRestDurationSec: undefined,
  stepsSnapshot: mixedSideSteps,
};

const missingSnapshotAndActualLog: ClassHistoryLog = {
  ...INITIAL_HISTORY_LOGS[0],
  id: 'user-log-unrecorded',
  sequenceTitle: '시간 미기록 이전 수업',
  groupName: '주말 그룹',
  taughtAt: '2026-11-08T11:00:00.000Z',
  intensity: 'intense',
  rating: 3,
  actualDurationSec: undefined,
  actualRestDurationSec: undefined,
  stepsSnapshot: undefined,
};

function createProps(overrides: Partial<ClassInsightsDialogProps> = {}): ClassInsightsDialogProps {
  return {
    onClose: vi.fn(),
    title: '리포머 전신 흐름 점검',
    steps: mixedSideSteps,
    exercises: [unilateralExercise, bilateralExercise],
    historyLogs: [
      zeroRecordedLog,
      partialMissingRestLog,
      missingSnapshotAndActualLog,
      ...INITIAL_HISTORY_LOGS,
    ],
    ...overrides,
  };
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('ClassInsightsDialog decision flow (summary -> detail -> return to edit)', () => {
  it('surfaces side-plan status on composition tab and jumps directly to filtered unspecified steps without medical claims', () => {
    render(<ClassInsightsDialog {...createProps()} />);

    const compositionPanel = screen.getByRole('tabpanel', { name: '구성' });
    const jumpGroup = within(compositionPanel).getByRole('group', {
      name: '다른 분석 항목 바로 확인',
    });
    const sidesJumpBtn = within(jumpGroup).getByRole('button', {
      name: /좌우 미지정 1개 동작/,
    });

    fireEvent.click(sidesJumpBtn);

    const sidesTab = screen.getByRole('tab', { name: '좌우' });
    expect(sidesTab).toHaveAttribute('aria-selected', 'true');
    expect(sidesTab).toHaveFocus();

    const sidesPanel = screen.getByRole('tabpanel', { name: '좌우' });
    expect(within(sidesPanel).getByText(/실제 신체 부하를 뜻하지 않습니다/)).toBeVisible();
    expect(
      within(sidesPanel).queryByText(/불균형 위험|교정 필요|처방|질환/),
    ).not.toBeInTheDocument();

    const filterGroup = within(sidesPanel).getByRole('group', { name: '동작별 좌우 보기 필터' });
    expect(
      within(filterGroup).getByRole('button', { name: '좌우 미지정 (1)' }),
    ).toHaveAttribute('aria-pressed', 'true');

    const table = within(sidesPanel).getByRole('table', { name: /동작별 명시한 좌우 계획/ });
    const unspecifiedRows = within(table).getAllByRole('row');
    expect(unspecifiedRows).toHaveLength(2);
    expect(within(unspecifiedRows[1]).getByText(/해부학적 좌우 미지정/)).toBeVisible();
    expect(within(table).queryByText('펠빅 브릿지')).not.toBeInTheDocument();

    fireEvent.click(within(filterGroup).getByRole('button', { name: '명시 좌·우 차이 (1)' }));
    const imbalancedRows = within(table).getAllByRole('row');
    expect(imbalancedRows).toHaveLength(2);
    expect(within(imbalancedRows[1]).getByText('왼쪽')).toBeVisible();
    expect(within(imbalancedRows[1]).getByText('1분 30초')).toBeVisible();

    fireEvent.click(within(filterGroup).getByRole('button', { name: '전체 (3)' }));
    expect(within(table).getAllByRole('row')).toHaveLength(4);
    expect(within(table).getByText('펠빅 브릿지')).toBeVisible();
  });

  it('keeps recorded 0 distinct from unrecorded/non-comparable rows across summary jump, filters, and sample toggles', () => {
    render(<ClassInsightsDialog {...createProps()} />);

    const historyJumpBtn = screen.getByRole('button', {
      name: /기록 비교 가능 1건 · 미기록·비교 불가 2건/,
    });
    fireEvent.click(historyJumpBtn);

    const recordsTab = screen.getByRole('tab', { name: '기록' });
    expect(recordsTab).toHaveAttribute('aria-selected', 'true');
    expect(recordsTab).toHaveFocus();

    const recordsPanel = screen.getByRole('tabpanel', { name: '기록' });
    const filterGroup = within(recordsPanel).getByRole('group', { name: '수업 기록 비교 필터' });
    expect(within(filterGroup).getByRole('button', { name: '전체 (3)' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );

    fireEvent.click(within(filterGroup).getByRole('button', { name: '시간 비교 가능 (1)' }));
    const table = within(recordsPanel).getByRole('table', { name: /수업별 계획 사본/ });
    expect(within(table).getByRole('row', { name: /실제 0초로 기록한 수업/ })).toBeVisible();
    expect(within(table).getAllByText('실제 0분 0초')).toHaveLength(2);
    expect(within(table).queryByRole('row', { name: /휴식 시간 미기록 수업/ })).not.toBeInTheDocument();
    expect(within(table).queryByRole('row', { name: /시간 미기록 이전 수업/ })).not.toBeInTheDocument();

    fireEvent.click(within(filterGroup).getByRole('button', { name: '미기록·비교 불가 (2)' }));
    const partialRow = within(table).getByRole('row', { name: /휴식 시간 미기록 수업/ });
    expect(within(partialRow).getByText('차이 없음')).toBeVisible();
    expect(within(partialRow).getByText('실제 미기록')).toBeVisible();
    expect(within(partialRow).getByText('비교 불가')).toBeVisible();

    const unrecordedRow = within(table).getByRole('row', { name: /시간 미기록 이전 수업/ });
    expect(within(unrecordedRow).getAllByText('계획 사본 없음')).toHaveLength(2);
    expect(within(unrecordedRow).getAllByText('실제 미기록')).toHaveLength(2);
    expect(within(unrecordedRow).getAllByText('비교 불가')).toHaveLength(2);

    fireEvent.click(within(recordsPanel).getByRole('checkbox', { name: '예시 기록 포함' }));
    expect(
      within(filterGroup).getByRole('button', { name: '미기록·비교 불가 (5)' }),
    ).toHaveAttribute('aria-pressed', 'true');
    expect(within(table).getAllByText('예시', { exact: true })).toHaveLength(3);
  });

  it('handles empty plan, empty user history, and zero-match filter states cleanly while preserving keyboard tab navigation', () => {
    const { unmount } = render(
      <ClassInsightsDialog {...createProps({ steps: [], exercises: [], historyLogs: [] })} />,
    );
    fireEvent.click(screen.getByRole('button', { name: /좌우 계획 · 동작 0개/ }));
    expect(screen.getByText('분석할 동작이 없습니다.')).toBeVisible();
    unmount();

    const balancedOnlyStep: SequenceStep[] = [
      {
        stepId: 'only-together',
        order: 1,
        exerciseId: bilateralExercise.id,
        blockCategory: 'bridging',
        selectedLayer: 'standard',
        sideMode: 'together',
        durationMin: 2,
      },
    ];

    render(
      <ClassInsightsDialog
        {...createProps({
          steps: balancedOnlyStep,
          historyLogs: INITIAL_HISTORY_LOGS,
        })}
      />,
    );

    const compositionTab = screen.getByRole('tab', { name: '구성' });
    expect(screen.getByRole('button', { name: /좌우 지정 확인 \(1개 동작\)/ })).toBeVisible();
    expect(screen.getByRole('button', { name: /내 수업 기록 0건/ })).toBeVisible();

    compositionTab.focus();
    fireEvent.keyDown(compositionTab, { key: 'ArrowRight' });
    const sidesTab = screen.getByRole('tab', { name: '좌우' });
    expect(sidesTab).toHaveFocus();

    const sidesPanel = screen.getByRole('tabpanel', { name: '좌우' });
    fireEvent.click(within(sidesPanel).getByRole('button', { name: '좌우 미지정 (0)' }));
    expect(within(sidesPanel).getByText('해부학적 좌우 미지정 동작이 없습니다.')).toBeVisible();
    fireEvent.click(within(sidesPanel).getByRole('button', { name: '명시 좌·우 차이 (0)' }));
    expect(within(sidesPanel).getByText('명시한 왼쪽·오른쪽 시간이 다른 동작이 없습니다.')).toBeVisible();

    fireEvent.keyDown(sidesTab, { key: 'End' });
    const recordsTab = screen.getByRole('tab', { name: '기록' });
    expect(recordsTab).toHaveFocus();
    const recordsPanel = screen.getByRole('tabpanel', { name: '기록' });
    expect(within(recordsPanel).getByText(/표시할 내 수업 기록이 없습니다/)).toBeVisible();
    expect(
      within(recordsPanel).queryByRole('group', { name: '수업 기록 비교 필터' }),
    ).not.toBeInTheDocument();

    fireEvent.click(within(recordsPanel).getByRole('checkbox', { name: '예시 기록 포함' }));
    const historyFilterGroup = within(recordsPanel).getByRole('group', {
      name: '수업 기록 비교 필터',
    });
    fireEvent.click(within(historyFilterGroup).getByRole('button', { name: '시간 비교 가능 (0)' }));
    expect(
      within(recordsPanel).getByText(
        '계획 사본과 실제 총시간·휴식 시간이 모두 기록된 수업이 없습니다.',
      ),
    ).toBeVisible();
  });

  it('keeps open snapshot immutable during live prop edits, returns focus to opener on footer close, and refreshes snapshot on reopen without storage writes', () => {
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem');
    const pushStateSpy = vi.spyOn(window.history, 'pushState');
    const replaceStateSpy = vi.spyOn(window.history, 'replaceState');

    function WorkbenchHarness() {
      const [open, setOpen] = useState(false);
      const [liveTitle, setLiveTitle] = useState('초기 시퀀스');
      const [liveSteps, setLiveSteps] = useState<SequenceStep[]>(mixedSideSteps);
      return (
        <div>
          <button type="button" onClick={() => setOpen(true)}>
            수업 구성 살펴보기 열기
          </button>
          <button
            type="button"
            onClick={() => {
              setLiveTitle('닫은 뒤 수정한 시퀀스');
              setLiveSteps([
                {
                  ...mixedSideSteps[0],
                  sideMode: 'left-then-right',
                  durationMin: 5,
                },
              ]);
            }}
          >
            백그라운드 계획 변경
          </button>
          {open && (
            <ClassInsightsDialog
              onClose={() => setOpen(false)}
              title={liveTitle}
              steps={liveSteps}
              exercises={[unilateralExercise, bilateralExercise]}
              historyLogs={[zeroRecordedLog]}
            />
          )}
        </div>
      );
    }

    render(<WorkbenchHarness />);

    const opener = screen.getByRole('button', { name: '수업 구성 살펴보기 열기' });
    opener.focus();
    fireEvent.click(opener);

    expect(screen.getByText(/초기 시퀀스 · 열 때의 계획/)).toBeVisible();
    expect(screen.getByRole('button', { name: /좌우 미지정 1개 동작/ })).toBeVisible();

    // Mutate parent state while dialog remains open: snapshot must NOT change.
    fireEvent.click(screen.getByRole('button', { name: '백그라운드 계획 변경' }));
    expect(screen.getByText(/초기 시퀀스 · 열 때의 계획/)).toBeVisible();
    expect(screen.queryByText(/닫은 뒤 수정한 시퀀스/)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /좌우 미지정 1개 동작/ })).toBeVisible();

    // Navigate into detail tab, then click footer button to close and return to editing.
    fireEvent.click(screen.getByRole('button', { name: /좌우 미지정 1개 동작/ }));
    expect(screen.getByRole('tab', { name: '좌우' })).toHaveAttribute('aria-selected', 'true');

    fireEvent.click(screen.getByRole('button', { name: '닫고 수업 편집으로 돌아가기' }));
    expect(screen.queryByRole('dialog', { name: '수업 구성 살펴보기' })).not.toBeInTheDocument();
    expect(opener).toHaveFocus();

    // Reopening captures the updated sequence and resets tab/filter state to initial defaults.
    fireEvent.click(opener);
    expect(screen.getByText(/닫은 뒤 수정한 시퀀스 · 열 때의 계획/)).toBeVisible();
    expect(screen.getByRole('tab', { name: '구성' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('button', { name: /좌우 지정 확인 \(1개 동작\)/ })).toBeVisible();

    expect(setItemSpy).not.toHaveBeenCalled();
    expect(pushStateSpy).not.toHaveBeenCalled();
    expect(replaceStateSpy).not.toHaveBeenCalled();
  });
});
