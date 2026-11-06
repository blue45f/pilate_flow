import { getApps, initializeApp, type FirebaseOptions } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  type Auth,
  type User,
} from 'firebase/auth';
import { create } from 'zustand';
import { syncAccountWorkspace } from './accountStorage';

export const FIREBASE_OPERATING_ORIGIN = 'https://pilates-flow-atelier.web.app';
export const FIREBASE_BOOTSTRAP_TIMEOUT_MS = 12_000;
const FIREBASE_APP_NAME = 'pilates-flow-account';

export interface FirebaseAccount {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL?: string | null;
}

export interface FirebaseSessionError {
  code: string;
  message: string;
}

interface FirebaseSession {
  phase: 'checking' | 'signed-out' | 'signed-in' | 'unavailable';
  operation: 'signing-in' | 'signing-out' | null;
  user: FirebaseAccount | null;
  error: FirebaseSessionError | null;
  notice: string;
}

export const useFirebaseSession = create<FirebaseSession>(() => ({
  phase: 'checking',
  operation: null,
  user: null,
  error: null,
  notice: '',
}));

let auth: Auth | null = null;
let bootstrap: Promise<void> | null = null;
let operation: Promise<void> | null = null;
let unsubscribe: (() => void) | null = null;
let generation = 0;

function stopObserving() {
  unsubscribe?.();
  unsubscribe = null;
}

export function isFirebaseHostingLocation(
  location: Pick<Location, 'origin'> | undefined = typeof window === 'undefined'
    ? undefined
    : window.location,
): boolean {
  return location?.origin === FIREBASE_OPERATING_ORIGIN;
}

function authError(code: string): FirebaseSessionError {
  return { code, message: '' };
}

// Keep provider messages, tokens and Firebase config out of rendered/logged errors.
export function firebaseAuthError(cause: unknown): FirebaseSessionError {
  const code =
    typeof cause === 'object' && cause !== null && 'code' in cause && typeof cause.code === 'string'
      ? cause.code
      : 'auth/unknown';
  const messages: Record<string, string> = {
    'auth/workspace-storage-failed':
      '계정 자료를 안전하게 보관하지 못해 작업 공간을 전환하지 않았습니다. 현재 자료를 JSON으로 내보내고 저장 공간을 확인해 주세요.',
    'auth/unsupported-host':
      'Google 로그인은 운영 주소 pilates-flow-atelier.web.app에서 사용할 수 있습니다. 이 기기의 수업 자료는 그대로 유지됩니다.',
    'auth/invalid-hosting-config':
      '운영 사이트의 Firebase 연결 정보를 확인하지 못했습니다. 잠시 후 연결을 다시 확인해 주세요.',
    'auth/bootstrap-timeout':
      '계정 연결 확인이 지연되고 있습니다. 네트워크를 확인한 뒤 다시 시도해 주세요.',
    'auth/unauthorized-domain':
      '현재 주소가 Firebase 로그인 허용 도메인에 등록되어 있지 않습니다. 운영자의 도메인 설정 확인이 필요합니다.',
    'auth/operation-not-allowed':
      'Firebase에서 Google 로그인 제공자가 활성화되어 있지 않습니다. 운영자의 로그인 설정 확인이 필요합니다.',
    'auth/popup-blocked':
      '브라우저가 Google 로그인 창을 차단했습니다. 이 사이트의 팝업을 허용한 뒤 Google로 계속하기를 다시 눌러 주세요.',
    'auth/popup-closed-by-user':
      'Google 로그인 창이 닫혔습니다. 원할 때 다시 로그인할 수 있습니다.',
    'auth/cancelled-popup-request':
      '이전 로그인 요청이 취소되었습니다. Google로 계속하기를 다시 눌러 주세요.',
    'auth/network-request-failed':
      '네트워크 연결을 확인한 뒤 다시 시도해 주세요. 이 기기의 수업 자료는 유지됩니다.',
    'auth/web-storage-unsupported':
      '이 브라우저에서 로그인 저장소를 사용할 수 없습니다. 사이트 저장소 설정을 확인하거나 일반 브라우저에서 다시 시도해 주세요.',
    'auth/operation-not-supported-in-this-environment':
      '현재 브라우저에서 Google 로그인 창을 열 수 없습니다. 일반 브라우저에서 운영 주소를 열어 주세요.',
    'auth/account-exists-with-different-credential':
      '이 이메일은 다른 로그인 방식에 연결되어 있습니다. 기존 로그인 방식을 확인해 주세요.',
    'auth/user-disabled': '이 계정의 로그인이 중지되어 있습니다. 운영자에게 문의해 주세요.',
    'auth/too-many-requests':
      '로그인 요청이 많아 잠시 제한되었습니다. 잠시 기다린 뒤 다시 시도해 주세요.',
    'auth/invalid-api-key': 'Firebase 연결 설정을 확인해야 합니다. 운영자에게 문의해 주세요.',
    'auth/app-not-authorized':
      'Firebase에서 이 앱의 로그인을 허용하지 않았습니다. 운영자의 연결 설정 확인이 필요합니다.',
  };
  return {
    code,
    message:
      messages[code] ?? 'Google 계정 연결을 완료하지 못했습니다. 잠시 후 다시 시도해 주세요.',
  };
}

function readVerifiedConfig(value: unknown): FirebaseOptions {
  if (
    typeof value !== 'object' ||
    value === null ||
    !('projectId' in value) ||
    value.projectId !== 'deskcloud-fleet-auth' ||
    !('appId' in value) ||
    value.appId !== '1:1083045258283:web:25c2e482307b366e70366e' ||
    !('authDomain' in value) ||
    value.authDomain !== 'deskcloud-fleet-auth.firebaseapp.com' ||
    !('apiKey' in value) ||
    typeof value.apiKey !== 'string' ||
    !value.apiKey.trim()
  ) {
    throw authError('auth/invalid-hosting-config');
  }
  // The Hosting endpoint supplies public client config, never server credentials.
  return {
    projectId: value.projectId,
    appId: value.appId,
    authDomain: value.authDomain,
    apiKey: value.apiKey,
  };
}

function accountFromUser(user: User | null): FirebaseAccount | null {
  return user
    ? { uid: user.uid, displayName: user.displayName, email: user.email, photoURL: user.photoURL }
    : null;
}

export function bootstrapFirebaseSession(): Promise<void> {
  if (bootstrap) return bootstrap;
  if (operation || (auth && useFirebaseSession.getState().phase !== 'unavailable')) {
    return Promise.resolve();
  }
  if (!isFirebaseHostingLocation()) {
    useFirebaseSession.setState({
      phase: 'unavailable',
      user: null,
      error: firebaseAuthError(authError('auth/unsupported-host')),
    });
    return Promise.resolve();
  }

  const attempt = ++generation;
  const controller = new AbortController();
  let expired = false;
  let timeout: ReturnType<typeof setTimeout> | undefined;
  const isCurrent = () => generation === attempt && !expired;
  stopObserving();
  auth = null;
  useFirebaseSession.setState({
    phase: 'checking',
    operation: null,
    user: null,
    error: null,
    notice: '',
  });

  bootstrap = (async () => {
    try {
      await Promise.race([
        (async () => {
          const response = await fetch('/__/firebase/init.json', {
            signal: controller.signal,
            credentials: 'omit',
            redirect: 'error',
            cache: 'no-store',
          });
          if (!response.ok) throw authError('auth/invalid-hosting-config');
          const config = readVerifiedConfig(await response.json());
          if (!isCurrent()) return;
          const existing = getApps().find((app) => app.name === FIREBASE_APP_NAME);
          if (existing) readVerifiedConfig(existing.options);
          const app = existing ?? initializeApp(config, FIREBASE_APP_NAME);
          // getAuth retains the SDK's supported default persistence and token refresh.
          const nextAuth = getAuth(app);
          auth = nextAuth;
          await new Promise<void>((resolve, reject) => {
            unsubscribe = onAuthStateChanged(
              nextAuth,
              (user) => {
                if (!isCurrent()) return;
                try {
                  // The SDK observer is the only identity authority, including changes from other tabs.
                  // Finish the local workspace transition before exposing the new account to UI.
                  syncAccountWorkspace(user?.uid ?? null);
                  useFirebaseSession.setState({
                    phase: user ? 'signed-in' : 'signed-out',
                    user: accountFromUser(user),
                    error: null,
                  });
                  resolve();
                } catch {
                  const cause = authError('auth/workspace-storage-failed');
                  useFirebaseSession.setState({
                    phase: 'unavailable',
                    user: null,
                    error: firebaseAuthError(cause),
                  });
                  reject(cause);
                }
              },
              (cause) => {
                if (!isCurrent()) return;
                useFirebaseSession.setState({
                  phase: 'unavailable',
                  error: firebaseAuthError(cause),
                  user: null,
                });
                reject(cause);
              },
            );
          });
        })(),
        new Promise<never>((_, reject) => {
          timeout = setTimeout(() => {
            expired = true;
            controller.abort();
            reject(authError('auth/bootstrap-timeout'));
          }, FIREBASE_BOOTSTRAP_TIMEOUT_MS);
        }),
      ]);
    } catch (cause) {
      if (generation === attempt) {
        expired = true;
        stopObserving();
        auth = null;
        useFirebaseSession.setState({
          phase: 'unavailable',
          user: null,
          error: firebaseAuthError(cause),
        });
      }
    } finally {
      clearTimeout(timeout);
      bootstrap = null;
    }
  })();
  return bootstrap;
}

// Called only by an explicit click after bootstrap. Do not await before opening the popup:
// keeping the SDK call inside that user gesture avoids avoidable popup blocking.
export function signInWithGoogle(options?: { prompt?: string }): Promise<void> {
  if (operation) return operation;
  if (!auth || !['signed-out', 'signed-in'].includes(useFirebaseSession.getState().phase)) {
    return Promise.resolve();
  }
  const currentAuth = auth;
  const attempt = generation;
  useFirebaseSession.setState({ operation: 'signing-in', error: null, notice: '' });
  let pending;
  try {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: options?.prompt ?? 'select_account' });
    pending = signInWithPopup(currentAuth, provider);
  } catch (cause) {
    useFirebaseSession.setState({ operation: null, error: firebaseAuthError(cause) });
    return Promise.resolve();
  }
  operation = pending
    .then(() => {
      // Only the auth observer updates the account. No Google tokens are copied or stored.
    })
    .catch((cause: unknown) => {
      if (attempt !== generation) return;
      const error = firebaseAuthError(cause);
      const cancelled =
        error.code === 'auth/popup-closed-by-user' || error.code === 'auth/cancelled-popup-request';
      useFirebaseSession.setState({
        error: cancelled ? null : error,
        notice: cancelled ? error.message : '',
      });
    })
    .finally(() => {
      operation = null;
      if (attempt === generation) useFirebaseSession.setState({ operation: null });
    });
  return operation;
}

export function signOutOfFirebase(): Promise<void> {
  if (operation) return operation;
  if (!auth || useFirebaseSession.getState().phase !== 'signed-in') {
    return Promise.resolve();
  }
  const attempt = generation;
  useFirebaseSession.setState({ operation: 'signing-out', error: null, notice: '' });
  operation = signOut(auth)
    .then(() => {
      if (attempt !== generation) return;
      useFirebaseSession.setState({
        notice:
          '로그아웃했습니다. 계정 자료는 이 브라우저에 보관되며 같은 계정으로 다시 로그인하면 열 수 있습니다.',
      });
    })
    .catch((cause: unknown) => {
      if (attempt === generation) {
        useFirebaseSession.setState({ error: firebaseAuthError(cause) });
      }
    })
    .finally(() => {
      operation = null;
      if (attempt === generation) useFirebaseSession.setState({ operation: null });
    });
  return operation;
}

/** No cached profile or localStorage record can substitute for a live SDK identity. */
export function getVerifiedFirebaseAccount(): FirebaseAccount | null {
  const session = useFirebaseSession.getState();
  return session.phase === 'signed-in' &&
    session.user &&
    auth?.currentUser?.uid === session.user.uid
    ? session.user
    : null;
}
