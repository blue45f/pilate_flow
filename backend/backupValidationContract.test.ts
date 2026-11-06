import { describe, expect, it, vi } from 'vitest';
import type { z } from 'zod';
import { INITIAL_EXERCISES } from '../src/data/pilatesCatalog';
import { usePilatesStore } from '../src/store/usePilatesStore';
import { inspectBackupRecovery } from '../src/utils/backupRecoveryInspection';
import { cloudBackupDataSchema } from '../src/schemas/cloudBackupSchema';
import { createBackupService } from './backupService';
import type { BackupRecord, BackupRepository } from './backupService';

const FIRST = '70000000-0000-4000-8000-000000000001';
const SECOND = '70000000-0000-4000-8000-000000000002';
const USER = 'qa-v7-synthetic-owner';
type Wire = {
  format: 'pilates-flow-atelier';
  version: 3;
  exportedAt: string;
  data: z.infer<typeof cloudBackupDataSchema>;
};
function fixture(): Wire {
  const exercise = structuredClone(INITIAL_EXERCISES[0]!);
  return {
    format: 'pilates-flow-atelier',
    version: 3,
    exportedAt: '2026-11-05T01:00:00.000Z',
    data: cloudBackupDataSchema.parse({
      exercises: [exercise],
      savedSequences: [
        {
          id: 'qa-v7-preserved-plan',
          title: '합성 복구 계약 검사 · 실제 수업 아님',
          subtitle: '',
          apparatus: exercise.apparatus,
          level: exercise.level,
          focusTags: [],
          targetMinutes: 50,
          steps: [
            {
              stepId: 'qa-v7-step',
              order: 1,
              blockCategory: exercise.blockCategory,
              exerciseId: exercise.id,
              durationMin: 5,
              selectedLayer: 'standard',
              locked: true,
            },
          ],
          createdAt: '',
          updatedAt: '',
          taughtCount: 0,
        },
      ],
      classGroups: [],
      historyLogs: [],
      conditionTemplates: [
        {
          id: 'qa-v7-conditions',
          name: '합성 조건',
          createdAt: '',
          criteria: {
            apparatus: 'mat',
            level: '1.0',
            focusPreset: 'full-body',
            preferredProps: [],
            excludeDaysWindow: 0,
            targetMinutes: 50,
            defaultLayer: 'standard',
          },
        },
      ],
    }),
  };
}
function memory() {
  const records = new Map<string, BackupRecord>();
  const files = new Map<string, string>();
  const repository = {
    get: vi.fn(async (owner: string) => records.get(owner) ?? null),
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
  } satisfies BackupRepository;
  return { service: createBackupService(repository), repository, records, files };
}
const rejectedCases: { label: string; change: (wire: Wire) => void }[] = [
  {
    label: 'duplicate condition-template IDs',
    change: (wire) => {
      wire.data.conditionTemplates!.push(structuredClone(wire.data.conditionTemplates![0]!));
    },
  },
  {
    label: 'saved-sequence/active-draft ID alias',
    change: (wire) => {
      wire.data.activeDraft = structuredClone(wire.data.savedSequences[0]!);
    },
  },
  {
    label: 'unpreserved envelope field',
    change: (wire) => {
      Object.assign(wire, { futureSection: { marker: true } });
    },
  },
  {
    label: 'unpreserved data field',
    change: (wire) => {
      Object.assign(wire.data, { futureSection: { marker: true } });
    },
  },
  {
    label: 'unpreserved nested layer field',
    change: (wire) => {
      Object.assign(wire.data.exercises[0]!.layers, { futureCue: 'synthetic only' });
    },
  },
  {
    label: 'unpreserved template field',
    change: (wire) => {
      Object.assign(wire.data.conditionTemplates![0]!, { futureTemplate: true });
    },
  },
  {
    label: 'unpreserved nested criteria field',
    change: (wire) => {
      Object.assign(wire.data.conditionTemplates![0]!.criteria, { futureCriteria: true });
    },
  },
  {
    label: 'timestamp precision outside the current native consumer rule',
    change: (wire) => {
      wire.exportedAt = '2026-11-05T01:00:00.1234567890Z';
    },
  },
];

const acceptedCases: { label: string; raw: () => string }[] = [
  {
    label: 'actual current UI canonical export',
    raw: () => usePilatesStore.getState().exportBackup(),
  },
  {
    label: 'supported empty native export with optionals omitted',
    raw: () => {
      const wire = fixture();
      wire.data = { exercises: [], savedSequences: [], classGroups: [], historyLogs: [] };
      return JSON.stringify(wire);
    },
  },
  {
    label: 'separate active draft with the same block contents',
    raw: () => {
      const wire = fixture();
      wire.data.activeDraft = {
        ...structuredClone(wire.data.savedSequences[0]!),
        id: 'qa-v7-distinct-draft',
      };
      return JSON.stringify(wire);
    },
  },
  {
    label: 'intentionally passthrough exercise, video, plan and step metadata',
    raw: () => {
      const wire = fixture();
      Object.assign(wire.data.exercises[0]!, { historicalExtension: { marker: true } });
      Object.assign(wire.data.exercises[0]!.youtube, { historicalVideoLabel: 'synthetic only' });
      Object.assign(wire.data.savedSequences[0]!, { historicalPlanLabel: 'synthetic only' });
      Object.assign(wire.data.savedSequences[0]!.steps[0]!, {
        historicalStepLabel: 'synthetic only',
      });
      return JSON.stringify(wire, null, 2);
    },
  },
  {
    label: 'the same ID in independent exercise and saved-plan collections',
    raw: () => {
      const wire = fixture();
      wire.data.savedSequences[0]!.id = wire.data.exercises[0]!.id;
      return JSON.stringify(wire);
    },
  },
  {
    label: 'UTC exported timestamp without fractional seconds',
    raw: () => {
      const wire = fixture();
      wire.exportedAt = '2026-11-05T01:00:00Z';
      return JSON.stringify(wire);
    },
  },
  {
    label: 'UTC exported timestamp with supported nine-digit precision',
    raw: () => {
      const wire = fixture();
      wire.exportedAt = '2026-11-05T01:00:00.123456789Z';
      return JSON.stringify(wire);
    },
  },
  {
    label: 'explicit empty optional organization and inventory fields',
    raw: () => {
      const wire = fixture();
      Object.assign(wire.data, {
        conditionTemplates: [],
        draftCriteria: null,
        lastCriteria: null,
        ownedEquipment: [],
        ownedApparatus: [],
        ownedProps: [],
        instructorSchedule: { locations: [], classes: [], exceptions: [] },
        instructorStudyState: {
          bookmarkedExerciseIds: [],
          rehearsalCueHidden: true,
          completedTutorialTaskIds: [],
        },
        datedSequencePlanning: { assignments: [] },
      });
      return JSON.stringify(wire);
    },
  },
];

describe('server native-v3 backup must remain restorable by the current consumer', () => {
  it.each(rejectedCases)(
    'rejects $label before replacing or deleting the valid prior snapshot',
    async ({ change }) => {
      const { service, repository, records, files } = memory();
      const priorRaw = JSON.stringify(fixture());
      const prior = await service.save(USER, {
        requestId: FIRST,
        baseRevision: null,
        raw: priorRaw,
      });
      const candidate = fixture();
      change(candidate);
      const raw = JSON.stringify(candidate);
      expect(inspectBackupRecovery(raw, usePilatesStore.getState()).success).toBe(false);
      const beforeRecords = structuredClone([...records]);
      const beforeFiles = [...files];
      repository.write.mockClear();
      repository.create.mockClear();
      repository.replace.mockClear();
      repository.removeFile.mockClear();
      const result = await service
        .save(USER, { requestId: SECOND, baseRevision: FIRST, raw })
        .catch((cause: unknown) => cause);
      // Compare content as booleans so a failure never dumps raw backup contents into logs.
      expect((await service.read(USER)).raw === priorRaw).toBe(true);
      expect(await service.getStatus(USER)).toEqual(prior);
      expect([...records]).toEqual(beforeRecords);
      expect(
        [...files].every(
          ([path, content], index) =>
            path === beforeFiles[index]?.[0] && content === beforeFiles[index]?.[1],
        ),
      ).toBe(true);
      expect(repository.write).not.toHaveBeenCalled();
      expect(repository.create).not.toHaveBeenCalled();
      expect(repository.replace).not.toHaveBeenCalled();
      expect(repository.removeFile).not.toHaveBeenCalled();
      expect(result).toMatchObject({ code: 'invalid_backup', status: 400 });
    },
  );

  it.each(acceptedCases)(
    'keeps $label accepted and byte-identical without adding approval',
    async ({ raw: createRaw }) => {
      const { service, repository } = memory();
      const raw = createRaw();
      expect(inspectBackupRecovery(raw, usePilatesStore.getState()).success).toBe(true);
      const saved = await service.save(USER, { requestId: FIRST, baseRevision: null, raw });
      expect(saved).toMatchObject({ exists: true, revision: FIRST, bytes: Buffer.byteLength(raw) });
      expect((await service.read(USER)).raw === raw).toBe(true);
      expect(repository.write).toHaveBeenCalledTimes(1);
      expect(repository.create).toHaveBeenCalledTimes(1);
      expect(repository.removeFile).not.toHaveBeenCalled();
    },
  );

  it('keeps legacy/bare recovery local-only instead of silently expanding the native server contract', async () => {
    const { service, repository } = memory();
    const wire = fixture();
    for (const raw of [
      JSON.stringify(wire.data),
      JSON.stringify({ version: 0, state: wire.data }),
    ]) {
      expect(inspectBackupRecovery(raw, usePilatesStore.getState()).success).toBe(true);
      await expect(
        service.save(USER, { requestId: FIRST, baseRevision: null, raw }),
      ).rejects.toMatchObject({ code: 'invalid_backup', status: 400 });
    }
    expect(repository.write).not.toHaveBeenCalled();
    expect(repository.create).not.toHaveBeenCalled();
    expect(repository.replace).not.toHaveBeenCalled();
    expect(repository.removeFile).not.toHaveBeenCalled();
  });
});
