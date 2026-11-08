import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { parseRecoverableNativeBackup } from '../../backend/backupValidation';
import { INITIAL_CLASS_GROUPS, INITIAL_EXERCISES } from '../data/pilatesCatalog';
import { RECOVERY_STORAGE_KEY } from '../lib/recoveryStorageGuard';
import { usePilatesStore } from '../store/usePilatesStore';
import type { ClassHistoryLogWithSnapshot } from '../types/teachingHistorySnapshot';
import type { AutoGenerateCriteria, SequenceStep } from '../types/pilates';
import {
  formatTeachingHistorySnapshotText,
  resolveTeachingHistoryView,
} from '../utils/teachingHistorySnapshot';
import { ClassBinderView } from './ClassBinderView';
import { LogSessionModal } from './LogSessionModal';
import { GroupPrepPanel } from './GroupPrepPanel';

const original = usePilatesStore.getState();
const exercise = INITIAL_EXERCISES.find((item) => item.apparatus === 'mat')!;
const steps: SequenceStep[] = [
  {
    stepId: 'date-only-step',
    order: 1,
    exerciseId: exercise.id,
    blockCategory: exercise.blockCategory,
    durationMin: 1,
    explanationSec: 0,
    transitionSec: 0,
    selectedLayer: 'standard',
  },
];

function recordDateOnly() {
  const onClose = vi.fn();
  const view = render(
    <LogSessionModal
      sequenceId="date-only-plan"
      onClose={onClose}
      context={{ actualDurationSec: 53, actualRestDurationSec: 5 }}
    />,
  );
  const dateInput = view.container.ownerDocument.querySelector('input[type="date"]')!;
  expect(view.container.ownerDocument.querySelector('input[type="time"]')).toBeNull();
  fireEvent.change(dateInput, { target: { value: '2026-11-05' } });
  fireEvent.click(screen.getByRole('button', { name: '수업 기록 저장' }));
  expect(onClose).toHaveBeenCalledOnce();
  view.unmount();
  return usePilatesStore.getState().historyLogs[0] as ClassHistoryLogWithSnapshot;
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-11-07T10:00:00Z'));
  localStorage.clear();
  usePilatesStore.setState(
    {
      ...original,
      exercises: INITIAL_EXERCISES,
      classGroups: INITIAL_CLASS_GROUPS,
      historyLogs: [],
      savedSequences: [],
      activeSequenceId: 'date-only-plan',
      activeTitle: '합성 날짜 전용 수업',
      activeSteps: steps,
      activeApparatus: 'mat',
      activeTargetGroupId: INITIAL_CLASS_GROUPS[0].id,
      persistenceError: null,
    },
    true,
  );
});
afterEach(() => {
  cleanup();
  usePilatesStore.setState(original, true);
  localStorage.clear();
  vi.useRealTimers();
});

describe('manual class dates never manufacture an observed start time', () => {
  it('marks the new snapshot date-only, hides its time badge and keeps the existing ISO anchor', () => {
    const record = recordDateOnly();
    const expectedAnchor = new Date('2026-11-05T12:00:00').toISOString();
    expect(record.taughtAt).toBe(expectedAnchor);
    expect(record.programSnapshot).toMatchObject({ taughtAt: expectedAnchor, dateOnly: true, taughtDate: '2026-11-05' });
    const view = render(<ClassBinderView view="history" onOpenLogModal={() => {}} />);
    expect(view.container.querySelector('.teaching-history-time-of-day')).toBeNull();
    expect(view.container.textContent).toContain('합성 날짜 전용 수업');
    const resolved = resolveTeachingHistoryView(
      record,
      new Map(INITIAL_EXERCISES.map((item) => [item.id, item])),
    );
    const text = formatTeachingHistorySnapshotText(resolved);
    expect(text).toContain('진행 날짜: 2026-11-05 (시각 미기록)');
    expect(text).not.toContain(expectedAnchor);
    expect(record.programSnapshot?.timing).toMatchObject({
      plannedTotalSec: 60,
      actualDurationSec: 53,
      actualRestDurationSec: 5,
      actualExerciseDurationSec: 48,
    });
  });

  it('preserves the flag and all snapshot values through storage, rehydration, backend parsing and actual backup restore', async () => {
    const record = recordDateOnly();
    const persisted = localStorage.getItem(RECOVERY_STORAGE_KEY)!;
    expect(JSON.parse(persisted).state.historyLogs[0].programSnapshot.dateOnly).toBe(true);
    const exported = usePilatesStore.getState().exportBackup();
    const parsed = parseRecoverableNativeBackup(exported);
    expect(parsed.historyLogs[0].programSnapshot).toEqual(record.programSnapshot);
    act(() => usePilatesStore.setState({ historyLogs: [] }));
    const restored = usePilatesStore.getState().restoreBackup(exported);
    expect(restored.success).toBe(true);
    expect(usePilatesStore.getState().historyLogs[0].taughtAt).toBe(record.taughtAt);
    expect(
      (usePilatesStore.getState().historyLogs[0] as ClassHistoryLogWithSnapshot).programSnapshot,
    ).toEqual(record.programSnapshot);
    act(() => usePilatesStore.setState({ historyLogs: [] }));
    localStorage.setItem(RECOVERY_STORAGE_KEY, persisted);
    await act(async () => {
      await usePilatesStore.persist.rehydrate();
    });
    expect(usePilatesStore.getState().historyLogs[0]).toEqual(record);
    const view = render(<ClassBinderView view="history" onOpenLogModal={() => {}} />);
    expect(view.container.querySelector('.teaching-history-time-of-day')).toBeNull();
  });

  it.each(['12:00:00', '00:00:00'])(
    'does not hide or rewrite an existing explicit %s timestamp',
    (time) => {
      const seed = recordDateOnly();
      const snapshot = { ...seed.programSnapshot! };
      delete (snapshot as unknown as { dateOnly?: boolean }).dateOnly;
      const taughtAt = new Date(`2026-11-04T${time}`).toISOString();
      const existing = {
        ...seed,
        id: `explicit-${time}`,
        taughtAt,
        programSnapshot: { ...snapshot, taughtAt },
      };
      act(() => usePilatesStore.setState({ historyLogs: [existing] }));
      const view = render(<ClassBinderView view="history" onOpenLogModal={() => {}} />);
      expect(view.container.querySelector('.teaching-history-time-of-day')?.textContent).toBe(
        time.slice(0, 5),
      );
      expect(usePilatesStore.getState().historyLogs[0]).toEqual(existing);
      const resolved = resolveTeachingHistoryView(
        existing,
        new Map(INITIAL_EXERCISES.map((item) => [item.id, item])),
      );
      expect(formatTeachingHistorySnapshotText(resolved)).toContain(taughtAt);
      expect(formatTeachingHistorySnapshotText(resolved)).not.toContain('시각 미기록');
    },
  );
});


it('keeps calendar-date grouping, search, detail and export independent of the ISO day', () => {
  const seed = recordDateOnly();
  const make = (id: string, taughtAt: string, taughtDate: string) => ({
    ...seed, id, taughtAt, sequenceTitle: id,
    programSnapshot: { ...seed.programSnapshot!, taughtAt, taughtDate, sourceSequenceTitle: id },
  });
  const logs = [
    make('calendar-five-seoul', '2026-11-05T03:00:00.000Z', '2026-11-05'),
    make('calendar-four-west', '2026-11-05T00:00:00.000Z', '2026-11-04'),
    make('calendar-five-east', '2026-11-04T22:00:00.000Z', '2026-11-05'),
  ];
  act(() => usePilatesStore.setState({ historyLogs: logs }));
  const view = render(<ClassBinderView view="history" onOpenLogModal={() => {}} />);
  const groups = () => Array.from(view.container.querySelectorAll('[data-date-group]')).map(node => node.getAttribute('data-date-group'));
  expect(groups()).toEqual(['2026-11-05', '2026-11-04']);
  expect(view.container.querySelector('[data-date-group="2026-11-05"]')?.querySelectorAll('article')).toHaveLength(2);
  const east = resolveTeachingHistoryView(logs[2], new Map(INITIAL_EXERCISES.map(item => [item.id, item])));
  expect(formatTeachingHistorySnapshotText(east)).toContain('진행 날짜: 2026-11-05 (시각 미기록)');
  fireEvent.change(screen.getByLabelText('수업 기록 검색'), { target: { value: '2026-11-04' } });
  expect(groups()).toEqual(['2026-11-04']);
  expect(view.container.querySelectorAll('.teaching-history-card')).toHaveLength(1);
  expect(view.container.querySelector('time')?.getAttribute('datetime')).toBe('2026-11-04');
  fireEvent.click(screen.getByRole('button', { name: '당시 시퀀스 보기' }));
  expect(screen.getByRole('dialog', { name: '진행 완료 수업 이력 상세' }).textContent).toContain('(2026-11-04)');
  expect(usePilatesStore.getState().historyLogs).toEqual(logs);
});

it('keeps one group per calendar date across the 30-record page boundary', () => {
  const seed = recordDateOnly();
  const logs = Array.from({ length: 33 }, (_, index) => {
    const taughtDate = index < 31 ? '2026-11-05' : '2026-11-04';
    const taughtAt = index % 2 ? '2026-11-04T22:00:00.000Z' : '2026-11-05T03:00:00.000Z';
    return {
      ...seed, id: 'calendar-page-' + index, taughtAt,
      programSnapshot: { ...seed.programSnapshot!, taughtAt, taughtDate },
    };
  });
  act(() => usePilatesStore.setState({ historyLogs: logs }));
  const view = render(<ClassBinderView view="history" onOpenLogModal={() => {}} />);
  expect(view.container.querySelectorAll('.teaching-history-card')).toHaveLength(30);
  expect(Array.from(view.container.querySelectorAll('[data-date-group]')).map(node => node.getAttribute('data-date-group'))).toEqual(['2026-11-05']);
  fireEvent.click(screen.getByRole('button', { name: /이전 수업 기록 더 보기/ }));
  expect(view.container.querySelectorAll('.teaching-history-card')).toHaveLength(33);
  expect(Array.from(view.container.querySelectorAll('[data-date-group]')).map(node => node.getAttribute('data-date-group'))).toEqual(['2026-11-05', '2026-11-04']);
});


it('keeps invalid optional calendar metadata recoverable and falls back without rewriting it', () => {
  const seed = recordDateOnly();
  const existing = {
    ...seed,
    programSnapshot: { ...seed.programSnapshot!, taughtDate: '2026-02-30' },
  };
  act(() => usePilatesStore.setState({ historyLogs: [existing] }));
  const backup = usePilatesStore.getState().exportBackup();
  const parsed = parseRecoverableNativeBackup(backup);
  expect(parsed.historyLogs[0].programSnapshot).toMatchObject({ taughtDate: '2026-02-30' });
  act(() => usePilatesStore.setState({ historyLogs: [] }));
  expect(usePilatesStore.getState().restoreBackup(backup).success).toBe(true);
  expect(usePilatesStore.getState().historyLogs[0]).toEqual(existing);
  const resolved = resolveTeachingHistoryView(existing, new Map(INITIAL_EXERCISES.map(item => [item.id, item])));
  expect(resolved.taughtDate).toBeUndefined();
  expect(formatTeachingHistorySnapshotText(resolved)).toContain(existing.taughtAt.slice(0, 10));
  expect(usePilatesStore.getState().historyLogs[0]).toEqual(existing);
});

it('does not guess or backfill a calendar date for older date-only snapshots', () => {
  const seed = recordDateOnly();
  const snapshot = { ...seed.programSnapshot! };
  delete snapshot.taughtDate;
  const older = { ...seed, programSnapshot: snapshot };
  act(() => usePilatesStore.setState({ historyLogs: [older] }));
  const resolved = resolveTeachingHistoryView(older, new Map(INITIAL_EXERCISES.map(item => [item.id, item])));
  expect(resolved.taughtDate).toBeUndefined();
  expect(resolved.taughtAt).toBe(older.taughtAt);
  expect(resolved.dateOnly).toBe(true);
  render(<ClassBinderView view="history" onOpenLogModal={() => {}} />);
  expect(usePilatesStore.getState().historyLogs[0]).toEqual(older);
});


it('uses the same newest calendar record for group preparation and criteria reuse', () => {
  const seed = recordDateOnly();
  const criteria: AutoGenerateCriteria = {
    apparatus: 'mat', availableEquipment: ['mat'], ownedApparatus: ['mat'],
    preferredProps: [], targetGroupId: seed.groupId, targetMinutes: 50, restMinutes: 0,
    level: '1.5', focusPreset: 'full-body', excludeDaysWindow: 14, defaultLayer: 'standard',
  };
  const latest = {
    ...seed, id: 'calendar-latest', sequenceTitle: '최신 달력 수업',
    taughtAt: '2026-11-04T22:00:00.000Z', criteriaSnapshot: { ...criteria, targetMinutes: 50 },
    programSnapshot: { ...seed.programSnapshot!, taughtAt: '2026-11-04T22:00:00.000Z', taughtDate: '2026-11-05' },
  };
  const older = {
    ...seed, id: 'calendar-older', sequenceTitle: '이전 달력 수업',
    taughtAt: '2026-11-05T00:00:00.000Z', criteriaSnapshot: { ...criteria, targetMinutes: 30 },
    programSnapshot: { ...seed.programSnapshot!, taughtAt: '2026-11-05T00:00:00.000Z', taughtDate: '2026-11-04' },
  };
  act(() => usePilatesStore.setState({ historyLogs: [older, latest] }));
  const stepsBefore = structuredClone(usePilatesStore.getState().activeSteps);
  render(<GroupPrepPanel groupId={seed.groupId} />);
  expect(screen.getByText('최신 달력 수업')).toBeTruthy();
  expect(screen.queryByText('이전 달력 수업')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: /최근 수업 조건 가져오기/ }));
  expect(usePilatesStore.getState().draftCriteria?.targetMinutes).toBe(50);
  expect(usePilatesStore.getState().saveFeedback).toContain('2026-11-05');
  expect(usePilatesStore.getState().historyLogs).toEqual([older, latest]);
  expect(usePilatesStore.getState().activeSteps).toEqual(stepsBefore);
});
