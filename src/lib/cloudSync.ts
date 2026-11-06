import { api, auth } from '@appdeploy/client';
import type { AuthUser } from '@appdeploy/client';
import { create } from 'zustand';
import { z } from 'zod';
import { syncAccountWorkspace } from './accountStorage';

export interface GoogleSignInOptions {
  provider?: 'google';
  scope?: string;
  prompt?: string;
}

export const GOOGLE_SIGN_IN_OPTIONS = Object.freeze({
  provider: 'google' as const,
  scope: 'openid email profile',
  prompt: 'select_account',
});

export function safePictureUrl(url?: string | null): string | null {
  if (typeof url !== 'string' || !url.trim()) return null;
  try {
    const parsed = new URL(url.trim());
    return parsed.protocol === 'https:' ? parsed.toString() : null;
  } catch {
    return null;
  }
}

const statusSchema = z.object({
  exists: z.boolean(),
  revision: z.string().uuid().nullable(),
  updatedAt: z.string().nullable(),
  bytes: z.number().nonnegative(),
});
export type CloudBackupStatus = z.infer<typeof statusSchema>;

interface CloudSessionState {
  phase: 'checking' | 'signed-out' | 'signed-in' | 'unavailable';
  user: AuthUser | null;
  backup: CloudBackupStatus | null;
  error: string | null;
  conflict: boolean;
  pendingSave: boolean;
  pendingDelete: boolean;
}

export const useCloudSession = create<CloudSessionState>(() => ({
  phase: 'checking',
  user: null,
  backup: null,
  error: null,
  conflict: false,
  pendingSave: false,
  pendingDelete: false,
}));

class CloudRequestError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

function requestError(cause: unknown): CloudRequestError {
  if (cause instanceof CloudRequestError) return cause;
  const shape = z
    .object({
      response: z.object({ data: z.unknown() }).optional(),
      data: z.unknown().optional(),
      message: z.string().optional(),
    })
    .safeParse(cause);
  const payload = z
    .object({ error: z.string().optional(), message: z.string().optional() })
    .safeParse(shape.success ? (shape.data.response?.data ?? shape.data.data) : null);
  return new CloudRequestError(
    payload.success ? (payload.data.error ?? 'request_failed') : 'request_failed',
    (payload.success ? payload.data.message : undefined) ??
      (shape.success ? shape.data.message : undefined) ??
      '서버에 연결하지 못했습니다. 기기의 자료는 유지됩니다. 연결 상태를 확인해 주세요.',
  );
}

export function cloudErrorMessage(cause: unknown): string {
  return cause instanceof Error ? cause.message : requestError(cause).message;
}

let startup: Promise<void> | null = null;
let pendingSave: {
  userId: string;
  requestId: string;
  baseRevision: string | null;
  raw: string;
} | null = null;
let pendingDelete: { userId: string; requestId: string; baseRevision: string | null } | null = null;
let recoveryCandidate: { userId: string; revision: string | null } | null = null;

function changedAccount(): CloudRequestError {
  pendingSave = null;
  pendingDelete = null;
  recoveryCandidate = null;
  startup = null;
  const failure = new CloudRequestError(
    'principal_mismatch',
    '계정이 변경되었거나 연결이 해제되었습니다. 서버 연결을 다시 확인해 주세요. 기기의 자료는 유지됩니다.',
  );
  useCloudSession.setState({
    phase: 'unavailable',
    user: null,
    backup: null,
    error: failure.message,
    conflict: false,
    pendingSave: false,
    pendingDelete: false,
  });
  return failure;
}

async function verifyPrincipal(expectedUserId: string): Promise<AuthUser> {
  const current = await auth.getUser();
  const state = useCloudSession.getState();
  if (
    !current ||
    current.userId !== expectedUserId ||
    state.user?.userId !== expectedUserId ||
    state.phase !== 'signed-in'
  )
    throw changedAccount();
  return current;
}

function handleRequestError(cause: unknown): CloudRequestError {
  const failure = requestError(cause);
  return failure.code === 'principal_mismatch' ? changedAccount() : failure;
}

export async function refreshCloudStatus(): Promise<CloudBackupStatus> {
  const state = useCloudSession.getState();
  if (state.phase !== 'signed-in' || !state.user) throw new Error('먼저 로그인해 주세요.');
  const user = await verifyPrincipal(state.user.userId);
  try {
    const { data } = await api.get('/api/studio/backup/status', {
      params: { expectedUserId: user.userId },
    });
    const backup = statusSchema.parse(data);
    await verifyPrincipal(user.userId);
    useCloudSession.setState((state) => ({
      backup,
      error: null,
      conflict:
        backup.exists &&
        (state.conflict ||
          ((!state.backup || state.backup.revision !== backup.revision) &&
            pendingSave?.requestId !== backup.revision)),
    }));
    if (recoveryCandidate?.revision !== backup.revision) recoveryCandidate = null;
    return backup;
  } catch (cause) {
    const failure = handleRequestError(cause);
    useCloudSession.setState({ error: failure.message });
    throw failure;
  }
}

/** Call on every app startup. Protected controls wait for this restoration to finish. */
export function bootstrapCloudSession(retry = false): Promise<void> {
  if (startup && !retry) return startup;
  useCloudSession.setState({ phase: 'checking', error: null });
  startup = (async () => {
    try {
      const user = await auth.getUser();
      syncAccountWorkspace(user?.userId ?? null);
      useCloudSession.setState({ user, phase: user ? 'signed-in' : 'signed-out', backup: null });
      if (user) await refreshCloudStatus();
    } catch (cause) {
      const failure = requestError(cause);
      useCloudSession.setState((state) => ({
        phase: state.user ? 'signed-in' : 'unavailable',
        error: failure.message,
      }));
    }
  })();
  return startup;
}

async function completeInteractiveSignIn(): Promise<void> {
  const nextUser = await auth.getUser().catch(() => null);
  const current = useCloudSession.getState();
  if (
    nextUser &&
    (current.phase !== 'signed-in' || current.user?.userId !== nextUser.userId)
  ) {
    pendingSave = null;
    pendingDelete = null;
    recoveryCandidate = null;
    startup = null;
    syncAccountWorkspace(nextUser.userId);
    useCloudSession.setState({
      user: nextUser,
      phase: 'signed-in',
      backup: null,
      error: null,
      conflict: false,
      pendingSave: false,
      pendingDelete: false,
    });
    await refreshCloudStatus();
  }
}

export async function signInToCloud(): Promise<void> {
  try {
    await auth.signInWithRedirect();
    await completeInteractiveSignIn();
  } catch (cause) {
    throw requestError(cause);
  }
}

export async function signInWithGoogle(options?: { prompt?: string }): Promise<void> {
  const redirect = auth.signInWithRedirect as (opts?: GoogleSignInOptions) => Promise<void>;
  try {
    await redirect({
      ...GOOGLE_SIGN_IN_OPTIONS,
      ...(options?.prompt ? { prompt: options.prompt } : {}),
    });
    await completeInteractiveSignIn();
  } catch (cause) {
    throw requestError(cause);
  }
}

export async function signOutOfCloud(): Promise<void> {
  await auth.signOut();
  syncAccountWorkspace(null);
  pendingSave = null;
  pendingDelete = null;
  recoveryCandidate = null;
  startup = null;
  useCloudSession.setState({
    phase: 'signed-out',
    user: null,
    backup: null,
    error: null,
    conflict: false,
    pendingSave: false,
    pendingDelete: false,
  });
}

async function session() {
  const state = useCloudSession.getState();
  if (state.phase !== 'signed-in' || !state.user) throw new Error('먼저 로그인해 주세요.');
  if (!state.backup) throw new Error('서버 상태를 먼저 확인해 주세요.');
  const user = await verifyPrincipal(state.user.userId);
  return { user, backup: state.backup };
}

export async function saveCloudBackup(raw: string): Promise<CloudBackupStatus> {
  const { user, backup } = await session();
  if (useCloudSession.getState().conflict)
    throw new Error('서버 자료를 먼저 불러온 후 다시 저장해 주세요.');
  if (!pendingSave || pendingSave.userId !== user.userId) {
    const compact = JSON.stringify(JSON.parse(raw));
    if (new TextEncoder().encode(compact).byteLength > 2 * 1024 * 1024)
      throw new Error('서버 백업은 2MB까지 지원합니다. 전체 JSON 백업을 이용해 주세요.');
    pendingSave = {
      userId: user.userId,
      requestId: crypto.randomUUID(),
      baseRevision: backup.revision,
      raw: compact,
    };
  }
  useCloudSession.setState({ pendingSave: true });
  try {
    const body = {
      requestId: pendingSave.requestId,
      baseRevision: pendingSave.baseRevision,
      raw: pendingSave.raw,
      expectedUserId: user.userId,
    };
    const { data } = await api.put('/api/studio/backup', body);
    const next = statusSchema.parse(data);
    await verifyPrincipal(user.userId);
    pendingSave = null;
    useCloudSession.setState({ backup: next, error: null, pendingSave: false });
    return next;
  } catch (cause) {
    const failure = handleRequestError(cause);
    const conflict = failure.code === 'revision_conflict';
    if (conflict) pendingSave = null;
    useCloudSession.setState({ error: failure.message, conflict, pendingSave: !!pendingSave });
    throw failure;
  }
}

export async function readCloudBackup(): Promise<string> {
  const { user } = await session();
  try {
    const { data } = await api.get('/api/studio/backup', {
      params: { expectedUserId: user.userId },
    });
    const result = z.object({ status: statusSchema, raw: z.string() }).parse(data);
    await verifyPrincipal(user.userId);
    recoveryCandidate = { userId: user.userId, revision: result.status.revision };
    useCloudSession.setState({
      backup: result.status,
      error: null,
    });
    return result.raw;
  } catch (cause) {
    throw handleRequestError(cause);
  }
}

/** Call only after the downloaded snapshot has passed the store's validated merge. */
export async function acknowledgeCloudRecovery(): Promise<void> {
  const { user, backup } = await session();
  if (
    !recoveryCandidate ||
    recoveryCandidate.userId !== user.userId ||
    recoveryCandidate.revision !== backup.revision
  )
    throw new Error('서버 자료를 다시 불러온 후 합쳐 주세요.');
  recoveryCandidate = null;
  pendingSave = null;
  useCloudSession.setState({ conflict: false, pendingSave: false, error: null });
}

export async function deleteCloudBackup(): Promise<void> {
  const { user, backup } = await session();
  if (!pendingDelete || pendingDelete.userId !== user.userId)
    pendingDelete = {
      userId: user.userId,
      requestId: crypto.randomUUID(),
      baseRevision: backup.revision,
    };
  useCloudSession.setState({ pendingDelete: true });
  try {
    const body = {
      requestId: pendingDelete.requestId,
      baseRevision: pendingDelete.baseRevision,
      expectedUserId: user.userId,
    };
    const { data } = await api.delete('/api/studio/backup', { data: body });
    const next = statusSchema.parse(data);
    await verifyPrincipal(user.userId);
    pendingDelete = null;
    pendingSave = null;
    useCloudSession.setState({
      backup: next,
      error: null,
      pendingDelete: false,
      pendingSave: false,
    });
  } catch (cause) {
    const failure = handleRequestError(cause);
    if (failure.code === 'revision_conflict') pendingDelete = null;
    useCloudSession.setState({ error: failure.message, pendingDelete: !!pendingDelete });
    throw failure;
  }
}
