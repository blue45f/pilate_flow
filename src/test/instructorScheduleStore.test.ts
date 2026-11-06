import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cloudBackupDataSchema, historySchema } from '../schemas/cloudBackupSchema';
import { usePilatesStore } from '../store/usePilatesStore';
import { createEmptyInstructorSchedule } from '../types/instructorSchedule';
import type { InstructorScheduleData } from '../types/instructorSchedule';

const original = usePilatesStore.getState();
const storageKey = 'pilates-flow-atelier-storage-v3';
function schedule(suffix = 'a'): InstructorScheduleData {
  return {
    locations: [
      {
        id: `location-${suffix}`,
        alias: `장소 ${suffix}`,
        equipmentIds: ['mat'],
        propIds: [],
        notes: '',
      },
    ],
    classes: [
      {
        id: `class-${suffix}`,
        title: `수업 ${suffix}`,
        participantAlias: '그룹 별칭',
        locationId: `location-${suffix}`,
        startDate: '2026-11-04',
        startTime: '10:00',
        endTime: '11:00',
        recurrence: 'once',
        weekdays: [],
        notes: '',
        linkSavedSequenceId: 'deleted-plan-kept-for-warning',
      },
    ],
    exceptions: [
      {
        id: `exception-${suffix}`,
        kind: 'cancel',
        classId: `class-${suffix}`,
        originalDate: '2026-11-04',
        reason: '강사가 입력한 예외',
      },
    ],
  };
}
function backup(instructorSchedule?: InstructorScheduleData) {
  return JSON.stringify({
    format: 'pilates-flow-atelier',
    version: 3,
    exportedAt: '2026-11-05T01:00:00.000Z',
    data: {
      exercises: [],
      savedSequences: [],
      classGroups: [],
      historyLogs: [],
      ...(instructorSchedule ? { instructorSchedule } : {}),
    },
  });
}

beforeEach(() => {
  localStorage.clear();
  usePilatesStore.setState(
    {
      ...original,
      instructorSchedule: createEmptyInstructorSchedule(),
      activeSteps: [],
      savedSequences: [],
      historyLogs: [],
      generationError: null,
      saveFeedback: null,
    },
    true,
  );
});
afterEach(() => {
  usePilatesStore.setState(original, true);
  localStorage.clear();
});

describe('instructor schedule store and v3 recovery', () => {
  it('starts with empty local data and validates a copied schedule without changing class preparation or reviews', () => {
    expect(usePilatesStore.getState().instructorSchedule).toEqual(createEmptyInstructorSchedule());
    const before = usePilatesStore.getState();
    const input = schedule();
    expect(before.setInstructorSchedule(input).success).toBe(true);
    const stored = usePilatesStore.getState();
    expect(stored.instructorSchedule).toEqual(input);
    expect(stored.instructorSchedule).not.toBe(input);
    input.locations[0]!.alias = 'caller mutation';
    expect(stored.instructorSchedule.locations[0]!.alias).toBe('장소 a');
    expect(stored.activeSteps).toBe(before.activeSteps);
    expect(stored.draftCriteria).toBe(before.draftCriteria);
    expect(stored.exercises).toBe(before.exercises);
    expect(stored.instructorSchedule.classes[0]!.linkSavedSequenceId).toBe(
      'deleted-plan-kept-for-warning',
    );
  });

  it('rejects invalid references and times atomically', () => {
    const input = schedule();
    input.classes[0]!.locationId = 'missing';
    const before = usePilatesStore.getState();
    expect(before.setInstructorSchedule(input).success).toBe(false);
    expect(usePilatesStore.getState().instructorSchedule).toBe(before.instructorSchedule);
    expect(usePilatesStore.getState().activeSteps).toBe(before.activeSteps);
    input.classes[0]!.locationId = 'location-a';
    input.classes[0]!.endTime = '09:00';
    expect(before.setInstructorSchedule(input).success).toBe(false);
    expect(usePilatesStore.getState().instructorSchedule).toBe(before.instructorSchedule);
  });

  it('exports a validated v3 schedule and restores it to an empty local calendar', () => {
    usePilatesStore.getState().setInstructorSchedule(schedule());
    const exported = usePilatesStore.getState().exportBackup();
    const wire = JSON.parse(exported);
    expect(wire.version).toBe(3);
    expect(cloudBackupDataSchema.safeParse(wire.data).success).toBe(true);
    usePilatesStore.getState().setInstructorSchedule(createEmptyInstructorSchedule());
    expect(usePilatesStore.getState().restoreBackup(exported).success).toBe(true);
    expect(usePilatesStore.getState().instructorSchedule).toEqual(schedule());
  });

  it('keeps local edits and adds new IDs while reporting incoming ID conflicts', () => {
    const local = schedule();
    local.locations[0]!.alias = '수정한 로컬 장소';
    local.classes[0]!.title = '수정한 로컬 수업';
    usePilatesStore.getState().setInstructorSchedule(local);
    const incoming = schedule();
    const newItems = schedule('b');
    incoming.locations.push(...newItems.locations);
    incoming.classes.push(...newItems.classes);
    incoming.exceptions.push(...newItems.exceptions);
    const result = usePilatesStore.getState().restoreBackup(backup(incoming));
    expect(result.success).toBe(true);
    expect(result.message).toMatch(/같은 ID의 일정 2개/);
    const restored = usePilatesStore.getState().instructorSchedule;
    expect(restored.locations).toHaveLength(2);
    expect(restored.classes).toHaveLength(2);
    expect(restored.exceptions).toHaveLength(2);
    expect(restored.locations[0]!.alias).toBe('수정한 로컬 장소');
    expect(restored.classes[0]!.title).toBe('수정한 로컬 수업');
  });

  it('does not erase local schedules when importing an older backup without them', () => {
    usePilatesStore.getState().setInstructorSchedule(schedule());
    const before = usePilatesStore.getState().instructorSchedule;
    expect(usePilatesStore.getState().restoreBackup(backup()).success).toBe(true);
    expect(usePilatesStore.getState().instructorSchedule).toBe(before);
  });

  it('rejects an aggregate logical exception conflict before any restore changes', () => {
    usePilatesStore.getState().setInstructorSchedule(schedule());
    const input = schedule();
    input.exceptions[0]!.id = 'different-id-same-occurrence';
    const before = usePilatesStore.getState();
    const result = before.restoreBackup(backup(input));
    expect(result.success).toBe(false);
    expect(result.message).toMatch(/일정 병합/);
    const after = usePilatesStore.getState();
    expect(after.instructorSchedule).toBe(before.instructorSchedule);
    expect(after.exercises).toBe(before.exercises);
    expect(after.savedSequences).toBe(before.savedSequences);
    expect(after.classGroups).toBe(before.classGroups);
    expect(after.historyLogs).toBe(before.historyLogs);
    expect(after.activeSteps).toBe(before.activeSteps);
  });

  it('persists the schedule tab and merges valid stored schedule data during hydration', async () => {
    usePilatesStore.getState().setInstructorSchedule(schedule());
    usePilatesStore.getState().setActiveTab('schedule');
    const stored = localStorage.getItem(storageKey)!;
    usePilatesStore.setState({
      instructorSchedule: createEmptyInstructorSchedule(),
      activeTab: 'workbench',
    });
    localStorage.setItem(storageKey, stored);
    await usePilatesStore.persist.rehydrate();
    expect(usePilatesStore.getState().activeTab).toBe('schedule');
    expect(usePilatesStore.getState().instructorSchedule).toEqual(schedule());
  });

  it('retains current schedules with a visible warning when stored schedule data is invalid', async () => {
    usePilatesStore.getState().setInstructorSchedule(schedule());
    const before = usePilatesStore.getState().instructorSchedule;
    const stored = JSON.parse(localStorage.getItem(storageKey)!);
    stored.state.instructorSchedule.classes[0].locationId = 'missing';
    localStorage.setItem(storageKey, JSON.stringify(stored));
    await usePilatesStore.persist.rehydrate();
    expect(usePilatesStore.getState().instructorSchedule).toBe(before);
    expect(usePilatesStore.getState().generationError).toMatch(/저장된 일정/);
  });
});

describe('timer-observed rest history', () => {
  it('persists optional actual rest and rejects values above total duration atomically', () => {
    const payload = {
      sequenceId: 'snapshot',
      groupId: '',
      taughtAt: '2026-11-04T10:00:00.000Z',
      rating: 4 as const,
      intensity: 'moderate' as const,
      instructorReflection: '',
      actualDurationSec: 600,
      actualRestDurationSec: 120,
    };
    usePilatesStore.getState().logClassSession(payload);
    const log = usePilatesStore.getState().historyLogs[0]!;
    expect(log.actualRestDurationSec).toBe(120);
    expect(historySchema.safeParse(log).success).toBe(true);
    const before = usePilatesStore.getState().historyLogs;
    usePilatesStore.getState().logClassSession({ ...payload, actualRestDurationSec: 601 });
    expect(usePilatesStore.getState().historyLogs).toBe(before);
    expect(historySchema.safeParse({ ...log, actualRestDurationSec: -1 }).success).toBe(false);
    expect(historySchema.safeParse({ ...log, actualRestDurationSec: NaN }).success).toBe(false);
  });
});
