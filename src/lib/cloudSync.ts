import { create } from 'zustand';
import type { AuthUser } from '@appdeploy/client';
import {
  bootstrapFirebaseSession,
  signInWithGoogle as firebaseSignIn,
  signOutOfFirebase,
  useFirebaseSession,
} from './firebaseSession';

export const SERVER_BACKUP_UNAVAILABLE =
  '서버 백업은 연결되어 있지 않습니다. 수업 자료는 이 브라우저에 보관됩니다. 다른 기기로 옮기려면 전체 JSON 백업을 이용해 주세요.';

export interface CloudBackupStatus {
  exists: boolean;
  revision: string | null;
  updatedAt: string | null;
  bytes: number;
}

interface CloudSessionState {
  phase: 'checking' | 'signed-out' | 'signed-in' | 'unavailable';
  user: AuthUser | null;
  backup: CloudBackupStatus | null;
  error: string | null;
  conflict: boolean;
  pendingSave: boolean;
  pendingDelete: boolean;
}

// Compatibility view used by teaching-history attribution. Firebase remains the only
// identity authority. A null backup explicitly means that no server backup is connected.
export const useCloudSession = create<CloudSessionState>(() => ({
  phase: 'checking',
  user: null,
  backup: null,
  error: null,
  conflict: false,
  pendingSave: false,
  pendingDelete: false,
}));

function reflectFirebaseSession() {
  const session = useFirebaseSession.getState();
  useCloudSession.setState({
    phase: session.phase,
    user: session.user
      ? {
          userId: session.user.uid,
          ...(session.user.email ? { email: session.user.email } : {}),
          ...(session.user.displayName ? { name: session.user.displayName } : {}),
          ...(session.user.photoURL ? { picture: session.user.photoURL } : {}),
          scope: 'openid email profile',
        }
      : null,
    backup: null,
    error: session.error?.message ?? null,
    conflict: false,
    pendingSave: false,
    pendingDelete: false,
  });
}
useFirebaseSession.subscribe(reflectFirebaseSession);
reflectFirebaseSession();

export function bootstrapCloudSession(_retry = false): Promise<void> {
  void _retry;
  return bootstrapFirebaseSession();
}
export const signInWithGoogle = firebaseSignIn;
export const signInToCloud = firebaseSignIn;
export const signOutOfCloud = signOutOfFirebase;

export function safePictureUrl(url?: string | null): string | null {
  if (typeof url !== 'string' || !url.trim()) return null;
  try {
    const parsed = new URL(url.trim());
    return parsed.protocol === 'https:' ? parsed.toString() : null;
  } catch {
    return null;
  }
}

export function cloudErrorMessage(cause: unknown): string {
  return cause instanceof Error ? cause.message : SERVER_BACKUP_UNAVAILABLE;
}

async function unavailable(): Promise<never> {
  throw new Error(SERVER_BACKUP_UNAVAILABLE);
}
export const refreshCloudStatus = unavailable;
export const readCloudBackup = unavailable;
export const acknowledgeCloudRecovery = unavailable;
export const deleteCloudBackup = unavailable;
export async function saveCloudBackup(_raw: string): Promise<never> {
  void _raw;
  return unavailable();
}
