import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { useFirebaseSession as SessionHook } from '../lib/firebaseSession';
import { CloudSyncPanel } from './CloudSyncPanel';

const actions = vi.hoisted(() => ({
  bootstrap: vi.fn().mockResolvedValue(undefined),
  signIn: vi.fn().mockResolvedValue(undefined),
  signOut: vi.fn().mockResolvedValue(undefined),
}));
let session: ReturnType<typeof SessionHook.getState>;
vi.mock('../lib/firebaseSession', () => ({
  bootstrapFirebaseSession: actions.bootstrap,
  signInWithGoogle: actions.signIn,
  signOutOfFirebase: actions.signOut,
  FIREBASE_OPERATING_ORIGIN: 'https://pilates-flow-atelier.web.app',
  useFirebaseSession: () => session,
}));
beforeEach(() => {
  vi.clearAllMocks();
  session = {
    phase: 'signed-in',
    operation: null,
    user: { uid: 'a', email: 'a@example.test', displayName: '강사 A' },
    error: null,
    notice: '',
  };
});
afterEach(cleanup);

describe('single account panel boundaries', () => {
  it('switches accounts without duplicating a cloud-login panel', () => {
    const view = render(<CloudSyncPanel />);
    fireEvent.click(screen.getByRole('button', { name: '다른 Google 계정으로 전환' }));
    expect(actions.signIn).toHaveBeenCalledOnce();
    session = { ...session, user: { uid: 'b', email: 'b@example.test', displayName: '강사 B' } };
    view.rerender(<CloudSyncPanel />);
    expect(screen.queryByText('a@example.test')).not.toBeInTheDocument();
    expect(screen.getByText('b@example.test')).toBeInTheDocument();
    expect(screen.getAllByRole('region')).toHaveLength(1);
    expect(screen.queryByRole('button', { name: /서버|백업 삭제/ })).not.toBeInTheDocument();
  });

  it('locks both account-switch and logout while an operation is pending', () => {
    session.operation = 'signing-in';
    render(<CloudSyncPanel />);
    expect(screen.getByRole('button', { name: '다른 Google 계정으로 전환' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '로그아웃' })).toBeDisabled();
  });

  it('removes stale identity and offers retry after a session/storage error', () => {
    const view = render(<CloudSyncPanel />);
    session = {
      ...session,
      phase: 'unavailable',
      user: null,
      error: { code: 'auth/workspace-storage-failed', message: '현재 자료를 보관하지 못했습니다.' },
    };
    view.rerender(<CloudSyncPanel />);
    expect(screen.queryByText('a@example.test')).not.toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('현재 자료');
    fireEvent.click(screen.getByRole('button', { name: '계정 연결 다시 확인' }));
    expect(actions.bootstrap).toHaveBeenCalledTimes(2);
  });
});
