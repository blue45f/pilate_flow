import {
  bootstrapFirebaseSession,
  getVerifiedFirebaseAccount,
  signInWithGoogle,
  signOutOfFirebase,
  useFirebaseSession,
} from './firebaseSession';

// Legacy key names are retained for recovery compatibility. These records are never
// interpreted as authentication and no existing records are erased by this adapter.
export const FIREBASE_SESSION_STORAGE_KEY = 'pilates-flow-atelier-firebase-session-v1';
export const ACCOUNT_BACKUP_STORAGE_PREFIX = 'pilates-flow-atelier-account-backup-v3:';

export interface AuthUser {
  userId: string;
  email?: string;
  name?: string;
  picture?: string;
  scope: string;
}

export const auth = {
  async getUser(): Promise<AuthUser | null> {
    await bootstrapFirebaseSession();
    const session = useFirebaseSession.getState();
    if (session.phase === 'unavailable' || session.phase === 'checking') {
      throw new Error(session.error?.message ?? 'Google 계정 연결을 확인하지 못했습니다.');
    }
    const user = getVerifiedFirebaseAccount();
    return user
      ? {
          userId: user.uid,
          ...(user.email ? { email: user.email } : {}),
          ...(user.displayName ? { name: user.displayName } : {}),
          ...(user.photoURL ? { picture: user.photoURL } : {}),
          scope: 'openid email profile',
        }
      : null;
  },
  signInWithRedirect: signInWithGoogle,
  signOut: signOutOfFirebase,
};

async function unavailable(_url?: string, _data?: unknown): Promise<{ data: unknown }> {
  void _url;
  void _data;
  throw Object.assign(
    new Error(
      '서버 기능은 연결되어 있지 않습니다. 수업 자료는 이 브라우저에 보관됩니다. 전체 JSON 백업을 이용해 주세요.',
    ),
    { code: 'local_api_unavailable' },
  );
}

// A localStorage copy is never advertised or exposed as a server backup.
export const api = {
  get: unavailable,
  post: unavailable,
  put: unavailable,
  delete: unavailable,
};
