import { createHash } from 'node:crypto';
import { z } from 'zod';
import { parseRecoverableNativeBackup } from './backupValidation';

export const MAX_BACKUP_BYTES = 2 * 1024 * 1024;

export interface BackupRecord {
  owner: string;
  revision: string;
  updatedAt: string;
  bytes: number;
  checksum: string;
  path: string;
  deleted: boolean;
}

export interface BackupStatus {
  exists: boolean;
  revision: string | null;
  updatedAt: string | null;
  bytes: number;
}

export interface BackupRepository {
  get: (owner: string) => Promise<BackupRecord | null>;
  create: (owner: string, record: BackupRecord) => Promise<boolean>;
  replace: (owner: string, previous: string, record: BackupRecord) => Promise<boolean>;
  write: (path: string, raw: string) => Promise<boolean>;
  read: (path: string) => Promise<string | null>;
  removeFile: (path: string) => Promise<boolean>;
  isUncertainWrite?: (cause: unknown) => boolean;
}

export class BackupError extends Error {
  constructor(
    public readonly code: string,
    public readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

const changeSchema = z.object({
  requestId: z.string().uuid(),
  baseRevision: z.string().uuid().nullable(),
});
const saveSchema = changeSchema.extend({ raw: z.string().min(1).max(MAX_BACKUP_BYTES) });

export function privateOwnerKey(userId: string): string {
  if (!userId) throw new BackupError('unauthorized', 401, '로그인이 필요합니다.');
  return createHash('sha256').update(userId).digest('hex');
}

function digest(raw: string): string {
  return createHash('sha256').update(raw).digest('hex');
}

function status(record: BackupRecord | null): BackupStatus {
  return {
    exists: !!record && !record.deleted,
    revision: record?.revision ?? null,
    updatedAt: record && !record.deleted ? record.updatedAt : null,
    bytes: record && !record.deleted ? record.bytes : 0,
  };
}

function conflict(): never {
  throw new BackupError(
    'revision_conflict',
    409,
    '다른 기기에서 서버 백업을 변경했습니다. 서버 자료를 먼저 불러온 후 다시 저장해 주세요.',
  );
}

function parseChange(input: unknown): z.infer<typeof changeSchema> {
  const parsed = changeSchema.safeParse(input);
  if (!parsed.success)
    throw new BackupError('invalid_request', 400, '백업 요청 형식이 올바르지 않습니다.');
  return parsed.data;
}

function parseBackup(raw: string): void {
  if (Buffer.byteLength(raw, 'utf8') > MAX_BACKUP_BYTES)
    throw new BackupError(
      'backup_too_large',
      413,
      '서버 백업은 2MB까지 지원합니다. 전체 JSON 백업을 이용해 주세요.',
    );
  try {
    const data = parseRecoverableNativeBackup(raw);
    const ids = new Set(data.exercises.map((exercise) => exercise.id));
    const sequences = [...data.savedSequences, ...(data.activeDraft ? [data.activeDraft] : [])];
    const references = [
      ...sequences.flatMap((sequence) =>
        sequence.steps.filter((step) => step.kind !== 'rest').map((step) => step.exerciseId),
      ),
      ...data.historyLogs.flatMap((log) => [
        ...log.exerciseIds,
        ...(log.stepsSnapshot
          ?.filter((step) => step.kind !== 'rest')
          .map((step) => step.exerciseId) ?? []),
      ]),
    ];
    if (references.some((id) => !ids.has(id))) throw new Error('Missing exercise');
  } catch {
    throw new BackupError(
      'invalid_backup',
      400,
      '백업 자료의 형식이나 동작 참조가 올바르지 않습니다.',
    );
  }
}

export function createBackupService(repository: BackupRepository) {
  async function load(owner: string): Promise<BackupRecord | null> {
    const record = await repository.get(owner);
    if (record && record.owner !== owner)
      throw new BackupError('owner_mismatch', 403, '백업에 접근할 수 없습니다.');
    return record;
  }

  async function commit(owner: string, previous: BackupRecord | null, next: BackupRecord) {
    try {
      const ok = previous
        ? await repository.replace(owner, previous.revision, next)
        : await repository.create(owner, next);
      if (!ok) {
        const current = await load(owner);
        if (
          current?.revision === next.revision &&
          current.checksum === next.checksum &&
          current.deleted === next.deleted
        )
          return;
        conflict();
      }
    } catch (cause) {
      if (cause instanceof BackupError) throw cause;
      if (!repository.isUncertainWrite?.(cause)) throw cause;
      // A timed-out write may have committed. Reconcile this exact request; never replay it blindly.
      const recovered = await load(owner);
      if (
        recovered?.revision === next.revision &&
        recovered.checksum === next.checksum &&
        recovered.deleted === next.deleted
      )
        return;
      throw new BackupError(
        'write_unconfirmed',
        503,
        '서버 저장 결과를 확인하지 못했습니다. 상태를 다시 확인한 후 같은 요청을 재시도해 주세요.',
      );
    }
  }

  return {
    async getStatus(userId: string): Promise<BackupStatus> {
      return status(await load(privateOwnerKey(userId)));
    },
    async read(userId: string): Promise<{ status: BackupStatus; raw: string }> {
      const record = await load(privateOwnerKey(userId));
      if (!record || record.deleted)
        throw new BackupError('backup_missing', 404, '이 계정에 서버 백업이 없습니다.');
      const raw = await repository.read(record.path);
      if (raw === null || digest(raw) !== record.checksum)
        throw new BackupError(
          'backup_unavailable',
          503,
          '서버 백업을 읽을 수 없습니다. 잠시 후 다시 시도해 주세요.',
        );
      return { status: status(record), raw };
    },
    async save(userId: string, input: unknown): Promise<BackupStatus> {
      const parsed = saveSchema.safeParse(input);
      if (!parsed.success)
        throw new BackupError(
          'invalid_request',
          400,
          '백업 요청 형식 또는 크기가 올바르지 않습니다.',
        );
      const { requestId, baseRevision, raw } = parsed.data;
      parseBackup(raw);
      const owner = privateOwnerKey(userId);
      const previous = await load(owner);
      const checksum = digest(raw);
      if (previous?.revision === requestId) {
        if (previous.checksum !== checksum || previous.deleted) conflict();
        return status(previous);
      }
      if ((previous?.revision ?? null) !== baseRevision) conflict();
      const next: BackupRecord = {
        owner,
        revision: requestId,
        updatedAt: new Date().toISOString(),
        bytes: Buffer.byteLength(raw, 'utf8'),
        checksum,
        path: `private-studio/${owner}/${requestId}-${checksum}.json`,
        deleted: false,
      };
      if (!(await repository.write(next.path, raw)))
        throw new BackupError(
          'file_write_failed',
          503,
          '서버 파일 저장에 실패했습니다. 다시 시도해 주세요.',
        );
      try {
        await commit(owner, previous, next);
      } catch (cause) {
        // A failed compare-and-swap proves this new file was never published.
        if (cause instanceof BackupError && cause.code === 'revision_conflict')
          await repository.removeFile(next.path).catch(() => false);
        throw cause;
      }
      // Keep replaced files private. Cleanup is best-effort and cannot invalidate a confirmed commit.
      if (previous?.path) await repository.removeFile(previous.path).catch(() => false);
      return status(next);
    },
    async remove(userId: string, input: unknown): Promise<BackupStatus> {
      const { requestId, baseRevision } = parseChange(input);
      const owner = privateOwnerKey(userId);
      const previous = await load(owner);
      if (previous?.revision === requestId && previous.deleted) {
        if (previous.path && !(await repository.removeFile(previous.path)))
          throw new BackupError(
            'delete_cleanup_pending',
            503,
            '백업 접근은 해제했지만 파일 삭제 결과를 확인하지 못했습니다. 같은 삭제 요청을 다시 시도해 주세요.',
          );
        return status(previous);
      }
      if (previous?.revision === requestId) conflict();
      if ((previous?.revision ?? null) !== baseRevision) conflict();
      if (!previous) return status(previous);
      if (previous.deleted) {
        if (previous.path && !(await repository.removeFile(previous.path)))
          throw new BackupError(
            'delete_cleanup_pending',
            503,
            '백업 접근은 해제했지만 파일 삭제 결과를 확인하지 못했습니다. 같은 삭제 요청을 다시 시도해 주세요.',
          );
        return status(previous);
      }
      const next: BackupRecord = {
        owner,
        revision: requestId,
        updatedAt: new Date().toISOString(),
        bytes: 0,
        checksum: '',
        path: previous.path,
        deleted: true,
      };
      await commit(owner, previous, next);
      if (!(await repository.removeFile(previous.path)))
        throw new BackupError(
          'delete_cleanup_pending',
          503,
          '백업 접근은 해제했지만 파일 삭제 결과를 확인하지 못했습니다.',
        );
      return status(next);
    },
  };
}
