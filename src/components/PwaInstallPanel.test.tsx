import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PwaState } from '../lib/pwa';
const mock = vi.hoisted(() => ({ state: {} as PwaState, install: vi.fn() }));
vi.mock('../lib/pwa', () => ({ usePwa: () => mock.state, requestPwaInstall: mock.install }));
import { PwaInstallPanel } from './PwaInstallPanel';
beforeEach(() => {
  mock.state = {
    standalone: false,
    installed: false,
    platform: 'browser',
    canInstall: false,
    installStatus: 'idle',
    offlineStatus: 'unavailable',
  };
  mock.install.mockReset();
});
describe('PWA install panel', () => {
  it('has a manual fallback with no fake download or automatic prompt', () => {
    render(<PwaInstallPanel />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.getByText(/Android Chrome에서는/)).toBeInTheDocument();
    expect(mock.install).not.toHaveBeenCalled();
  });
  it('installs only after an explicit user action', () => {
    mock.state.canInstall = true;
    render(<PwaInstallPanel />);
    fireEvent.click(screen.getByRole('button', { name: '이 기기에 설치' }));
    expect(mock.install).toHaveBeenCalledOnce();
  });
  it('does not claim installation succeeded after browser acceptance', () => {
    mock.state.installStatus = 'accepted';
    render(<PwaInstallPanel />);
    expect(screen.getByRole('status')).toHaveTextContent('설치를 요청했어요');
    expect(screen.queryByText(/설치 완료를 확인/)).not.toBeInTheDocument();
  });
  it('shows Safari instructions without a fake install button', () => {
    mock.state.platform = 'ios-safari';
    render(<PwaInstallPanel />);
    expect(screen.getByText('홈 화면에 추가')).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
  it('shows standalone state and storage separation warning', () => {
    mock.state.standalone = true;
    mock.state.installed = true;
    render(<PwaInstallPanel />);
    expect(screen.getByRole('status')).toHaveTextContent('앱으로 실행 중');
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.getByText(/Safari와 홈 화면 앱의 자료가 따로/)).toBeInTheDocument();
  });
  it('shows a non-disruptive update instruction, no reload button', () => {
    mock.state.offlineStatus = 'update-ready';
    render(<PwaInstallPanel />);
    expect(screen.getByText(/작성 중 자동으로 새로고침하지/)).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
