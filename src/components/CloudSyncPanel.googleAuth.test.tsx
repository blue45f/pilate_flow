import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CloudSyncPanel } from './CloudSyncPanel';
import type { useFirebaseSession as SessionHook } from '../lib/firebaseSession';

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
  session = { phase: 'signed-out', operation: null, user: null, error: null, notice: '' };
});
afterEach(cleanup);

describe('CloudSyncPanel', () => {
  it('starts restoration but never signs in automatically and explains data boundaries', () => {
    render(<CloudSyncPanel />);
    expect(actions.bootstrap).toHaveBeenCalledOnce();
    expect(actions.signIn).not.toHaveBeenCalled();
    expect(screen.getByText('로그인과 클라우드 백업은 별개입니다.')).toBeInTheDocument();
    expect(screen.getByText(/다른 기기와 동기화하지 않습니다/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /서버.*저장|합치기/ })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Google로 계속하기' }));
    expect(actions.signIn).toHaveBeenCalledOnce();
  });

  it('announces checking and does not offer a premature popup', () => {
    session.phase = 'checking';
    render(<CloudSyncPanel />);
    expect(screen.getByRole('status')).toHaveTextContent('저장된 로그인 상태');
    expect(screen.getByRole('region', { name: 'Google 계정 연결' })).toHaveAttribute(
      'aria-busy',
      'true',
    );
    expect(screen.queryByRole('button', { name: /Google/ })).not.toBeInTheDocument();
  });

  it('disables repeated sign-in clicks and explains how to cancel the popup', () => {
    session.operation = 'signing-in';
    render(<CloudSyncPanel />);
    const button = screen.getByRole('button', { name: 'Google 로그인 진행 중…' });
    expect(button).toBeDisabled();
    fireEvent.click(button);
    expect(actions.signIn).not.toHaveBeenCalled();
    expect(screen.getByRole('status')).toHaveTextContent('창을 닫아 취소');
  });

  it('announces cancellation calmly while allowing another attempt', () => {
    session.notice = 'Google 로그인 창이 닫혔습니다. 원할 때 다시 로그인할 수 있습니다.';
    render(<CloudSyncPanel />);
    expect(screen.getByRole('status')).toHaveTextContent('다시 로그인');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Google로 계속하기' })).toBeEnabled();
  });

  it('shows actual configuration errors and retains an explicit retry action', () => {
    session.error = {
      code: 'auth/unauthorized-domain',
      message: '허용 도메인 설정 확인이 필요합니다.',
    };
    render(<CloudSyncPanel />);
    expect(screen.getByRole('alert')).toHaveTextContent('허용 도메인 설정 확인');
    expect(screen.getByRole('button', { name: 'Google로 계속하기' })).toBeEnabled();
  });

  it('shows the observed identity and keeps logout separate from local data', () => {
    session.phase = 'signed-in';
    session.user = {
      uid: 'synthetic-user',
      displayName: '테스트 강사',
      email: 'instructor@example.test',
    };
    render(<CloudSyncPanel />);
    expect(screen.getByText('instructor@example.test')).toBeInTheDocument();
    expect(screen.getByText('Google 로그인됨 · 클라우드 백업 미연결')).toBeInTheDocument();
    expect(
      screen.getByText(/로그아웃해도 계정 자료는 이 브라우저에 보관됩니다/),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '로그아웃' }));
    expect(actions.signOut).toHaveBeenCalledOnce();
    expect(screen.queryByRole('button', { name: /Google로/ })).not.toBeInTheDocument();
  });

  it('supports switching to another Google account and updates displayed identity', () => {
    session.phase = 'signed-in';
    session.user = {
      uid: 'account-a',
      displayName: '강사 A',
      email: 'a@example.test',
    };
    const view = render(<CloudSyncPanel />);
    const switchBtn = screen.getByRole('button', { name: '다른 Google 계정으로 전환' });
    expect(switchBtn).toBeEnabled();
    fireEvent.click(switchBtn);
    expect(actions.signIn).toHaveBeenCalledOnce();

    session = { ...session, operation: 'signing-in' };
    view.rerender(<CloudSyncPanel />);
    expect(screen.getByRole('button', { name: '다른 Google 계정으로 전환' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '로그아웃' })).toBeDisabled();
    expect(screen.getByRole('status')).toHaveTextContent('열린 Google 창에서 로그인을 완료');

    session = {
      ...session,
      operation: null,
      user: {
        uid: 'account-b',
        displayName: '강사 B',
        email: 'b@example.test',
      },
    };
    view.rerender(<CloudSyncPanel />);
    expect(screen.queryByText('a@example.test')).not.toBeInTheDocument();
    expect(screen.getByText('강사 B')).toBeInTheDocument();
    expect(screen.getByText('b@example.test')).toBeInTheDocument();
  });

  it('clears the previous identity on signout and disables a pending logout', () => {
    session.phase = 'signed-in';
    session.operation = 'signing-out';
    session.user = {
      uid: 'synthetic-user',
      displayName: '테스트 강사',
      email: 'instructor@example.test',
    };
    const view = render(<CloudSyncPanel />);
    expect(screen.getByRole('button', { name: '로그아웃 중…' })).toBeDisabled();
    session = { ...session, phase: 'signed-out', operation: null, user: null };
    view.rerender(<CloudSyncPanel />);
    expect(screen.queryByText('instructor@example.test')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Google로 계속하기' })).toBeEnabled();
  });

  it('allows retry after bounded bootstrap failure', () => {
    session.phase = 'unavailable';
    session.error = { code: 'auth/bootstrap-timeout', message: '연결을 다시 확인해 주세요.' };
    render(<CloudSyncPanel />);
    fireEvent.click(screen.getByRole('button', { name: '계정 연결 다시 확인' }));
    expect(actions.bootstrap).toHaveBeenCalledTimes(2);
    expect(screen.getByRole('alert')).toHaveTextContent('연결을 다시 확인');
  });

  it('uses the exact operating host link instead of starting auth elsewhere', () => {
    session.phase = 'unavailable';
    session.error = { code: 'auth/unsupported-host', message: '운영 주소에서 로그인해 주세요.' };
    render(<CloudSyncPanel />);
    expect(screen.getByRole('link', { name: '운영 사이트에서 로그인' })).toHaveAttribute(
      'href',
      'https://pilates-flow-atelier.web.app',
    );
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(actions.signIn).not.toHaveBeenCalled();
  });
});
