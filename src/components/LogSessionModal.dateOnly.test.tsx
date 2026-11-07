import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { parseRecoverableNativeBackup } from '../../backend/backupValidation';
import { INITIAL_CLASS_GROUPS, INITIAL_EXERCISES } from '../data/pilatesCatalog';
import { RECOVERY_STORAGE_KEY } from '../lib/recoveryStorageGuard';
import { usePilatesStore } from '../store/usePilatesStore';
import type { ClassHistoryLogWithSnapshot } from '../types/teachingHistorySnapshot';
import type { SequenceStep } from '../types/pilates';
import {
  formatTeachingHistorySnapshotText,
  resolveTeachingHistoryView,
} from '../utils/teachingHistorySnapshot';
import { ClassBinderView } from './ClassBinderView';
import { LogSessionModal } from './LogSessionModal';

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
    expect(record.programSnapshot).toMatchObject({ taughtAt: expectedAnchor, dateOnly: true });
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
