import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { INITIAL_EXERCISES } from '../data/pilatesCatalog';
import { MobilePoseCameraGuide } from './MobilePoseCameraGuide';

const originalMediaDevices = Object.getOwnPropertyDescriptor(navigator, 'mediaDevices');

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  if (originalMediaDevices) {
    Object.defineProperty(navigator, 'mediaDevices', originalMediaDevices);
  } else {
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: undefined,
    });
  }
});

describe('MobilePoseCameraGuide', () => {
  it('renders honest on-device privacy notice and controls grid, 3D ghost opacity, and mirror flip', () => {
    const exercise = INITIAL_EXERCISES[3]!;
    render(<MobilePoseCameraGuide exercise={exercise} />);

    expect(
      screen.getByText('기기 안에서만 표시되며 서버로 전송되지 않아요. 정렬 확인 보조용입니다.'),
    ).toBeInTheDocument();

    // Alignment grid toggle
    const gridBtn = screen.getByRole('button', { name: '정렬 그리드' });
    expect(gridBtn).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('img', { name: /어깨·골반 수평/ })).toBeInTheDocument();
    fireEvent.click(gridBtn);
    expect(gridBtn).toHaveAttribute('aria-pressed', 'false');
    expect(screen.queryByRole('img', { name: /어깨·골반 수평/ })).not.toBeInTheDocument();

    // 3D Ghost Silhouette opacity slider
    const ghostOverlay = screen.getByTestId('mpg-ghost-overlay');
    expect(ghostOverlay).toHaveStyle({ opacity: '0.4' });
    const slider = screen.getByLabelText('3D 참조 실루엣 투명도');
    fireEvent.change(slider, { target: { value: '65' } });
    expect(ghostOverlay).toHaveStyle({ opacity: '0.65' });

    // Mirror flip toggle
    const mirrorBtn = screen.getByRole('button', { name: '좌우 거울' });
    expect(mirrorBtn).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(mirrorBtn);
    expect(mirrorBtn).toHaveAttribute('aria-pressed', 'false');
  });

  it('falls back cleanly without crashing when mediaDevices is unsupported', () => {
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: undefined,
    });

    render(<MobilePoseCameraGuide exercise={INITIAL_EXERCISES[0]!} />);
    fireEvent.click(screen.getByRole('button', { name: '카메라 켜기' }));

    expect(screen.getByText(/실시간 카메라를 지원하지 않아요/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '시뮬레이션 보기로 전환' }));
    expect(screen.getByText('시뮬레이션 미리보기')).toBeInTheDocument();
  });

  it('falls back cleanly when camera permission is denied', async () => {
    const getUserMedia = vi.fn().mockRejectedValue(new DOMException('Denied', 'NotAllowedError'));
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: { getUserMedia },
    });

    render(<MobilePoseCameraGuide exercise={INITIAL_EXERCISES[0]!} />);
    fireEvent.click(screen.getByRole('button', { name: '카메라 켜기' }));

    await waitFor(() => {
      expect(screen.getByText(/카메라 권한이 허용되지 않았거나/)).toBeInTheDocument();
    });
    expect(getUserMedia).toHaveBeenCalledWith(
      expect.objectContaining({ audio: false }),
    );
  });

  it('activates local camera stream and stops tracks cleanly on turn-off and unmount', async () => {
    const playSpy = vi
      .spyOn(HTMLMediaElement.prototype, 'play')
      .mockResolvedValue(undefined);
    const stopTrack = vi.fn();
    const fakeStream = {
      getTracks: () => [{ stop: stopTrack }],
    } as unknown as MediaStream;
    const getUserMedia = vi.fn().mockResolvedValue(fakeStream);

    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: { getUserMedia },
    });

    render(<MobilePoseCameraGuide exercise={INITIAL_EXERCISES[0]!} />);
    fireEvent.click(screen.getByRole('button', { name: '카메라 켜기' }));

    await waitFor(() => {
      expect(screen.getByLabelText('실시간 로컬 카메라 화면')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: '카메라 끄기' }));
    expect(stopTrack).toHaveBeenCalledTimes(1);
    expect(screen.queryByLabelText('실시간 로컬 카메라 화면')).not.toBeInTheDocument();
    playSpy.mockRestore();
  });

  it('captures a 5-second local 3-frame practice comparison and clears it on demand', () => {
    vi.useFakeTimers();
    render(<MobilePoseCameraGuide exercise={INITIAL_EXERCISES[3]!} />);

    fireEvent.click(screen.getByRole('button', { name: '5초 연습 비교' }));
    expect(screen.getByText('시작 0초')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(2500);
    });
    expect(screen.getByText('정점 2.5초')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(2600);
    });
    expect(screen.getByText('마무리 5초')).toBeInTheDocument();
    expect(screen.getByLabelText('5초 연습 로컬 비교')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '5초 연습 스냅샷 비우기' }));
    expect(screen.queryByLabelText('5초 연습 로컬 비교')).not.toBeInTheDocument();
  });
});
