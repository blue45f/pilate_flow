import { describe, expect, it, vi } from 'vitest';
import { INITIAL_EXERCISES } from '../src/data/pilatesCatalog';
import { usePilatesStore } from '../src/store/usePilatesStore';
import { createBackupService, MAX_BACKUP_BYTES, privateOwnerKey } from './backupService';
import type { BackupRecord, BackupRepository } from './backupService';
import {
  revisionAssigned,
  revisionExercise,
  revisionSchedule,
  revisionSource,
} from '../src/test/datedRevisionFixtures';
import {
  getDatedPlanSourceFingerprint,
  replaceDatedPlanSnapshot,
} from '../src/utils/datedSequencePlanning';

const FIRST = '10000000-0000-4000-8000-000000000001';
const SECOND = '10000000-0000-4000-8000-000000000002';
const THIRD = '10000000-0000-4000-8000-000000000003';

function backup(title = 'Private class'): string {
  const exercise = INITIAL_EXERCISES[0];
  return JSON.stringify({
    format: 'pilates-flow-atelier',
    version: 3,
    exportedAt: '2026-11-04T10:00:00.000Z',
    data: {
      exercises: [exercise],
      savedSequences: [
        {
          id: 'private-sequence',
          title,
          subtitle: 'Private notes',
          apparatus: exercise.apparatus,
          level: exercise.level,
          focusTags: [],
          targetMinutes: 50,
          steps: [
            {
              stepId: 'one',
              order: 1,
              blockCategory: exercise.blockCategory,
              exerciseId: exercise.id,
              durationMin: 5,
              selectedLayer: 'standard',
            },
          ],
          createdAt: '2026-11-04T10:00:00.000Z',
          updatedAt: '2026-11-04T10:00:00.000Z',
          taughtCount: 0,
        },
      ],
      classGroups: [],
      historyLogs: [],
      conditionTemplates: [],
      lastCriteria: null,
    },
  });
}

function memoryRepository() {
  const records = new Map<string, BackupRecord>();
  const files = new Map<string, string>();
  const repository = {
    get: vi.fn(async (owner: string) => (records.has(owner) ? { ...records.get(owner)! } : null)),
    create: vi.fn(async (owner: string, record: BackupRecord) => {
      if (records.has(owner)) return false;
      records.set(owner, { ...record });
      return true;
    }),
    replace: vi.fn(async (owner: string, previous: string, record: BackupRecord) => {
      if (records.get(owner)?.revision !== previous) return false;
      records.set(owner, { ...record });
      return true;
    }),
    write: vi.fn(async (path: string, raw: string) => {
      files.set(path, raw);
      return true;
    }),
    read: vi.fn(async (path: string) => files.get(path) ?? null),
    removeFile: vi.fn(async (path: string) => {
      files.delete(path);
      return true;
    }),
    isUncertainWrite: (cause: unknown) => cause === uncertain,
  } satisfies BackupRepository;
  return { repository, records, files, service: createBackupService(repository) };
}

const uncertain = new Error('Transport lost the commit result');

describe('private server backup service', () => {
  it('preserves new instructor profiles, study state and complete dated revisions byte-for-byte in isolated storage', async () => {
    const { service } = memoryRepository();
    const prior = revisionAssigned();
    const source = revisionSource('revised');
    const revised = replaceDatedPlanSnapshot({
      schedule: revisionSchedule(),
      planning: prior.planning,
      assignmentId: prior.assignment.id,
      sequence: source,
      expectedUpdatedAt: prior.assignment.updatedAt,
      expectedOccurrenceSnapshot: prior.assignment.occurrenceSnapshot,
      expectedSourceFingerprint: getDatedPlanSourceFingerprint(source),
      now: '2026-11-05T11:00:00.000Z',
    });
    expect(revised.success).toBe(true);
    if (!revised.success) throw new Error(revised.message);
    const wire = JSON.parse(backup());
    wire.data.exercises = [revisionExercise];
    wire.data.savedSequences = [revisionSource(), source];
    wire.data.classGroups = [
      {
        id: 'private-group',
        name: '별칭 반',
        type: 'group',
        defaultLevel: '1.0',
        scheduleLabel: '',
        notes: '',
        planningPreferences: {
          ageBand: 'mixed',
          experience: 'mixed',
          conditions: {
            apparatus: 'mat',
            availableEquipment: ['mat'],
            level: '1.0',
            focusPreset: 'full-body',
            preferredProps: [],
            excludeDaysWindow: 0,
            targetMinutes: 50,
            restMinutes: 2,
            defaultLayer: 'easy',
          },
        },
      },
    ];
    wire.data.instructorSchedule = revisionSchedule();
    wire.data.datedSequencePlanning = revised.planning;
    wire.data.instructorStudyState = {
      bookmarkedExerciseIds: [revisionExercise.id],
      rehearsalCueHidden: true,
      completedTutorialTaskIds: ['compose'],
    };
    const raw = JSON.stringify(wire);
    const status = await service.save('qa-instructor-a', {
      requestId: FIRST,
      baseRevision: null,
      raw,
    });
    const recovered = await service.read('qa-instructor-a');
    expect(recovered).toEqual({ status, raw });
    expect(
      JSON.parse(recovered.raw).data.datedSequencePlanning.assignments[0].priorVersions,
    ).toHaveLength(1);
    expect((await service.getStatus('qa-instructor-b')).exists).toBe(false);
  });

  it('accepts the current complete studio export and returns identical recoverable content', async () => {
    const { service, repository } = memoryRepository();
    const raw = JSON.stringify(JSON.parse(usePilatesStore.getState().exportBackup()));
    const saved = await service.save('instructor-a', { requestId: FIRST, baseRevision: null, raw });
    expect(saved).toMatchObject({ exists: true, revision: FIRST, bytes: Buffer.byteLength(raw) });
    expect(await service.read('instructor-a')).toEqual({ status: saved, raw });
    expect(repository.create).toHaveBeenCalledTimes(1);
    expect(raw.length).toBeLessThan(MAX_BACKUP_BYTES);
  });

  it('isolates accounts and rejects anonymous access before repository reads', async () => {
    const { service, repository } = memoryRepository();
    const raw = backup();
    await service.save('instructor-a', { requestId: FIRST, baseRevision: null, raw });
    expect(await service.getStatus('instructor-b')).toEqual({
      exists: false,
      revision: null,
      updatedAt: null,
      bytes: 0,
    });
    await expect(service.read('instructor-b')).rejects.toMatchObject({
      code: 'backup_missing',
      status: 404,
    });
    expect(repository.get).toHaveBeenLastCalledWith(privateOwnerKey('instructor-b'));
    repository.get.mockClear();
    await expect(service.read('')).rejects.toMatchObject({ code: 'unauthorized', status: 401 });
    expect(repository.get).not.toHaveBeenCalled();
    expect(repository.read).not.toHaveBeenCalled();
  });

  it('rejects malformed, unsupported, duplicate, and dangling-reference backups without writes', async () => {
    const { service, repository } = memoryRepository();
    const unsupported = JSON.parse(backup());
    unsupported.version = 99;
    const dangling = JSON.parse(backup());
    dangling.data.savedSequences[0].steps[0].exerciseId = 'missing-exercise';
    const duplicate = JSON.parse(backup());
    duplicate.data.exercises.push(duplicate.data.exercises[0]);
    for (const raw of [
      '{invalid',
      JSON.stringify(unsupported),
      JSON.stringify(dangling),
      JSON.stringify(duplicate),
    ]) {
      await expect(
        service.save('instructor-a', { requestId: FIRST, baseRevision: null, raw }),
      ).rejects.toMatchObject({ code: 'invalid_backup', status: 400 });
    }
    expect(repository.write).not.toHaveBeenCalled();
    expect(repository.create).not.toHaveBeenCalled();
  });

  it('enforces the UTF-8 byte limit even when the string character count fits', async () => {
    const { service, repository } = memoryRepository();
    const oversized = JSON.parse(backup());
    oversized.padding = '한'.repeat(Math.ceil(MAX_BACKUP_BYTES / 3));
    const raw = JSON.stringify(oversized);
    expect(raw.length).toBeLessThan(MAX_BACKUP_BYTES);
    await expect(
      service.save('instructor-a', { requestId: FIRST, baseRevision: null, raw }),
    ).rejects.toMatchObject({ code: 'backup_too_large', status: 413 });
    expect(repository.write).not.toHaveBeenCalled();
  });

  it('roundtrips explicit rests in saved classes, draft, and history without treating them as exercises', async () => {
    const { service } = memoryRepository();
    const value = JSON.parse(backup());
    const sequence = value.data.savedSequences[0];
    sequence.steps.push({
      ...sequence.steps[0],
      stepId: 'rest',
      order: 2,
      kind: 'rest',
      exerciseId: '',
      durationMin: 2,
    });
    value.data.activeDraft = { ...sequence, id: 'draft' };
    value.data.historyLogs = [
      {
        id: 'history',
        sequenceId: sequence.id,
        sequenceTitle: sequence.title,
        groupId: 'group',
        groupName: 'Alias',
        taughtAt: '2026-11-04T10:00:00.000Z',
        apparatus: sequence.apparatus,
        level: sequence.level,
        exerciseIds: [sequence.steps[0].exerciseId],
        rating: 4,
        intensity: 'moderate',
        instructorReflection: '',
        stepsSnapshot: sequence.steps,
      },
    ];
    const raw = JSON.stringify(value);
    await service.save('instructor-a', { requestId: FIRST, baseRevision: null, raw });
    expect((await service.read('instructor-a')).raw).toBe(raw);
  });

  it('still rejects missing actual exercise references next to valid rests', async () => {
    for (const target of ['saved', 'draft', 'snapshot', 'history-ids']) {
      const { service, repository } = memoryRepository();
      const value = JSON.parse(backup());
      const sequence = value.data.savedSequences[0];
      sequence.steps.push({
        ...sequence.steps[0],
        stepId: 'rest',
        order: 2,
        kind: 'rest',
        exerciseId: '',
        durationMin: 2,
      });
      const broken = { ...sequence.steps[0], exerciseId: 'missing-real-exercise' };
      if (target === 'saved') sequence.steps[0] = broken;
      if (target === 'draft')
        value.data.activeDraft = { ...sequence, id: 'draft', steps: [broken, sequence.steps[1]] };
      if (target === 'snapshot' || target === 'history-ids')
        value.data.historyLogs = [
          {
            id: 'history',
            sequenceId: sequence.id,
            sequenceTitle: sequence.title,
            groupId: 'group',
            groupName: 'Alias',
            taughtAt: '2026-11-04T10:00:00.000Z',
            apparatus: sequence.apparatus,
            level: sequence.level,
            exerciseIds: [
              target === 'history-ids' ? 'missing-real-exercise' : sequence.steps[0].exerciseId,
            ],
            rating: 4,
            intensity: 'moderate',
            instructorReflection: '',
            stepsSnapshot: target === 'snapshot' ? [broken, sequence.steps[1]] : sequence.steps,
          },
        ];
      await expect(
        service.save('instructor-a', {
          requestId: FIRST,
          baseRevision: null,
          raw: JSON.stringify(value),
        }),
      ).rejects.toMatchObject({ code: 'invalid_backup' });
      expect(repository.write).not.toHaveBeenCalled();
    }
  });

  it('replays an identical request once and rejects reusing its revision for different content', async () => {
    const { service, repository } = memoryRepository();
    const request = { requestId: FIRST, baseRevision: null, raw: backup() };
    const saved = await service.save('instructor-a', request);
    expect(await service.save('instructor-a', request)).toEqual(saved);
    expect(repository.write).toHaveBeenCalledTimes(1);
    expect(repository.create).toHaveBeenCalledTimes(1);
    await expect(
      service.save('instructor-a', { ...request, raw: backup('Different class') }),
    ).rejects.toMatchObject({ code: 'revision_conflict', status: 409 });
    expect((await service.read('instructor-a')).raw).toBe(request.raw);
  });

  it('preserves the latest server snapshot when a stale device attempts to save', async () => {
    const { service, repository } = memoryRepository();
    await service.save('instructor-a', { requestId: FIRST, baseRevision: null, raw: backup() });
    const latest = backup('Newer device class');
    await service.save('instructor-a', { requestId: SECOND, baseRevision: FIRST, raw: latest });
    await expect(
      service.save('instructor-a', {
        requestId: THIRD,
        baseRevision: FIRST,
        raw: backup('Stale device class'),
      }),
    ).rejects.toMatchObject({ code: 'revision_conflict', status: 409 });
    expect((await service.read('instructor-a')).raw).toBe(latest);
    expect(repository.write).toHaveBeenCalledTimes(2);
  });

  it('checks the revision atomically after a competing commit during file upload', async () => {
    const { service, repository, records, files } = memoryRepository();
    await service.save('instructor-a', { requestId: FIRST, baseRevision: null, raw: backup() });
    const owner = privateOwnerKey('instructor-a');
    repository.replace.mockImplementationOnce(async () => {
      records.set(owner, { ...records.get(owner)!, revision: THIRD });
      return false;
    });
    await expect(
      service.save('instructor-a', {
        requestId: SECOND,
        baseRevision: FIRST,
        raw: backup('Losing edit'),
      }),
    ).rejects.toMatchObject({ code: 'revision_conflict', status: 409 });
    expect((await service.getStatus('instructor-a')).revision).toBe(THIRD);
    expect(repository.replace).toHaveBeenCalledWith(
      owner,
      FIRST,
      expect.objectContaining({ revision: SECOND }),
    );
    expect(files.size).toBe(1);
    expect(repository.removeFile).toHaveBeenCalledWith(expect.stringContaining(SECOND));
  });

  it('reconciles concurrent identical requests without deleting their shared winning artifact', async () => {
    const { service, repository, files } = memoryRepository();
    const raw = backup();
    const request = { requestId: FIRST, baseRevision: null, raw };
    const [first, second] = await Promise.all([
      service.save('instructor-a', request),
      service.save('instructor-a', request),
    ]);
    expect(first.revision).toBe(FIRST);
    expect(second.revision).toBe(FIRST);
    expect(repository.create).toHaveBeenCalledTimes(2);
    expect(repository.removeFile).not.toHaveBeenCalled();
    expect(files.size).toBe(1);
    expect((await service.read('instructor-a')).raw).toBe(raw);
  });

  it('rejects using a successful save request ID for a destructive delete request', async () => {
    const { service, repository } = memoryRepository();
    const raw = backup();
    await service.save('instructor-a', { requestId: FIRST, baseRevision: null, raw });
    await expect(
      service.remove('instructor-a', { requestId: FIRST, baseRevision: FIRST }),
    ).rejects.toMatchObject({ code: 'revision_conflict', status: 409 });
    expect(repository.removeFile).not.toHaveBeenCalled();
    expect((await service.read('instructor-a')).raw).toBe(raw);
  });

  it('reconciles a committed unknown outcome without repeating the database write', async () => {
    const { service, repository, records } = memoryRepository();
    repository.create.mockImplementationOnce(async (owner, record) => {
      records.set(owner, { ...record });
      throw uncertain;
    });
    const raw = backup();
    expect(
      await service.save('instructor-a', { requestId: FIRST, baseRevision: null, raw }),
    ).toMatchObject({ exists: true, revision: FIRST });
    expect(repository.create).toHaveBeenCalledTimes(1);
    expect((await service.read('instructor-a')).raw).toBe(raw);
  });

  it('keeps an unresolved artifact available for reconciliation and never claims successful saving', async () => {
    const { service, repository, files } = memoryRepository();
    repository.create.mockRejectedValueOnce(uncertain);
    await expect(
      service.save('instructor-a', { requestId: FIRST, baseRevision: null, raw: backup() }),
    ).rejects.toMatchObject({ code: 'write_unconfirmed', status: 503 });
    expect(repository.create).toHaveBeenCalledTimes(1);
    expect(repository.removeFile).not.toHaveBeenCalled();
    expect(files.size).toBe(1);
    expect(await service.getStatus('instructor-a')).toMatchObject({ exists: false });
  });

  it('does not commit metadata when private file storage rejects a write', async () => {
    const { service, repository } = memoryRepository();
    repository.write.mockResolvedValueOnce(false);
    await expect(
      service.save('instructor-a', { requestId: FIRST, baseRevision: null, raw: backup() }),
    ).rejects.toMatchObject({ code: 'file_write_failed', status: 503 });
    expect(repository.create).not.toHaveBeenCalled();
    expect(await service.getStatus('instructor-a')).toMatchObject({ exists: false });
  });

  it('detects missing or corrupted stored data instead of returning a false recovery success', async () => {
    const { service, repository, files } = memoryRepository();
    await service.save('instructor-a', { requestId: FIRST, baseRevision: null, raw: backup() });
    files.set(repository.write.mock.calls[0][0], 'corrupted');
    await expect(service.read('instructor-a')).rejects.toMatchObject({
      code: 'backup_unavailable',
      status: 503,
    });
    files.clear();
    await expect(service.read('instructor-a')).rejects.toMatchObject({
      code: 'backup_unavailable',
      status: 503,
    });
  });

  it('hides a deleted backup immediately and retries cleanup with the original delete request', async () => {
    const { service, repository, files } = memoryRepository();
    await service.save('instructor-a', { requestId: FIRST, baseRevision: null, raw: backup() });
    repository.removeFile.mockResolvedValueOnce(false);
    const request = { requestId: SECOND, baseRevision: FIRST };
    await expect(service.remove('instructor-a', request)).rejects.toMatchObject({
      code: 'delete_cleanup_pending',
      status: 503,
    });
    await expect(service.read('instructor-a')).rejects.toMatchObject({
      code: 'backup_missing',
      status: 404,
    });
    expect(await service.getStatus('instructor-a')).toEqual({
      exists: false,
      revision: SECOND,
      updatedAt: null,
      bytes: 0,
    });
    expect(files.size).toBe(1);
    expect(await service.remove('instructor-a', request)).toMatchObject({
      exists: false,
      revision: SECOND,
    });
    expect(files.size).toBe(0);
    expect(repository.replace).toHaveBeenCalledTimes(1);
  });

  it('prevents stale deletion of a newer backup and accepts a later save after a deletion', async () => {
    const { service, repository } = memoryRepository();
    await service.save('instructor-a', { requestId: FIRST, baseRevision: null, raw: backup() });
    await expect(
      service.remove('instructor-a', { requestId: SECOND, baseRevision: null }),
    ).rejects.toMatchObject({ code: 'revision_conflict', status: 409 });
    expect(repository.removeFile).not.toHaveBeenCalled();
    await service.remove('instructor-a', { requestId: SECOND, baseRevision: FIRST });
    const raw = backup('Restored account');
    await service.save('instructor-a', { requestId: THIRD, baseRevision: SECOND, raw });
    expect((await service.read('instructor-a')).raw).toBe(raw);
  });

  it('rejects a repository record with a mismatched owner before reading its private file', async () => {
    const { service, repository } = memoryRepository();
    await service.save('instructor-a', { requestId: FIRST, baseRevision: null, raw: backup() });
    const original = await repository.get(privateOwnerKey('instructor-a'));
    repository.get.mockResolvedValueOnce({ ...original!, owner: privateOwnerKey('instructor-b') });
    await expect(service.read('instructor-a')).rejects.toMatchObject({
      code: 'owner_mismatch',
      status: 403,
    });
    expect(repository.read).not.toHaveBeenCalled();
  });
});
