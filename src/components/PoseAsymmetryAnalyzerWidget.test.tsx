import type React from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  NON_MEDICAL_ALIGNMENT_DISCLAIMER_KO,
  ON_DEVICE_PRIVACY_NOTICE_KO,
  POSE_ANALYSIS_HEIGHT,
  POSE_ANALYSIS_WIDTH,
  createSyntheticPoseFrame,
} from '../utils/onDevicePoseAnalyzer';
import { PoseAsymmetryAnalyzerWidget } from './PoseAsymmetryAnalyzerWidget';

const FORBIDDEN_MEDICAL_TERMS = ['측만증', '디스크', '치료', '완치', '교정 보장', '처방'];

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('PoseAsymmetryAnalyzerWidget', () => {
  it('mounts without calling localStorage.setItem and renders honest non-medical & privacy notices', () => {
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem');

    render(<PoseAsymmetryAnalyzerWidget exerciseNameKo="리포머 풋워크" />);

    expect(setItemSpy).not.toHaveBeenCalled();
    expect(screen.getByText(/리포머 풋워크/)).toBeInTheDocument();
    expect(screen.getByText(NON_MEDICAL_ALIGNMENT_DISCLAIMER_KO)).toBeInTheDocument();
    expect(screen.getByText(ON_DEVICE_PRIVACY_NOTICE_KO)).toBeInTheDocument();

    expect(screen.getByText('어깨 수평')).toBeInTheDocument();
    expect(screen.getByText('골반 수평')).toBeInTheDocument();
    expect(screen.getByText('중심선 균형')).toBeInTheDocument();

    const cuesList = screen.getByTestId('pacv-coaching-cues');
    expect(cuesList.querySelectorAll('li').length).toBeGreaterThan(0);
    expect(cuesList.querySelectorAll('li').length).toBeLessThanOrEqual(2);

    const panelText = screen.getByLabelText('온디바이스 골격·좌우 균형 정렬 분석기').textContent ?? '';
    for (const term of FORBIDDEN_MEDICAL_TERMS) {
      expect(panelText).not.toContain(term);
    }
  });

  it('switches between the 3 alignment simulation presets without requiring a live camera', () => {
    render(<PoseAsymmetryAnalyzerWidget />);

    // Default balanced preset
    expect(screen.getByRole('button', { name: '균형' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('좌우 정렬이 안정적이에요')).toBeInTheDocument();
    expect(screen.getByTestId('pacv-balance-score').textContent).toBe('100점');

    // Preset 2: Right shoulder raised
    fireEvent.click(screen.getByRole('button', { name: '오른쪽 어깨 올라감' }));
    expect(screen.getByRole('button', { name: '오른쪽 어깨 올라감' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByTestId('pacv-metric-shoulder').textContent).toContain('+');
    expect(screen.getByTestId('pacv-metric-shoulder').textContent).toContain('오른쪽 높음');
    expect(screen.getByTestId('pacv-coaching-cues').textContent).toContain('오른쪽 어깨');

    // Preset 3: Pelvis shifted left
    fireEvent.click(screen.getByRole('button', { name: '골반 좌측 이동' }));
    expect(screen.getByRole('button', { name: '골반 좌측 이동' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByTestId('pacv-metric-midline').textContent).toContain('-');
    expect(screen.getByTestId('pacv-metric-midline').textContent).toContain('좌측 이동');

    // Back to balanced
    fireEvent.click(screen.getByRole('button', { name: '균형' }));
    expect(screen.getByText('좌우 정렬이 안정적이에요')).toBeInTheDocument();
  });

  it('toggles real-time analysis ON/OFF cleanly when camera is disconnected', () => {
    render(<PoseAsymmetryAnalyzerWidget cameraActive={false} />);

    const toggleBtn = screen.getByRole('button', { name: '실시간 골격·균형 분석 켜기' });
    expect(toggleBtn).toHaveAttribute('aria-pressed', 'false');

    fireEvent.click(toggleBtn);
    expect(screen.getByRole('button', { name: '실시간 골격·균형 분석 끄기' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByText(/카메라가 꺼져 있어 시뮬레이션 기준으로 표시 중이에요/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '실시간 골격·균형 분석 끄기' }));
    expect(screen.getByRole('button', { name: '실시간 골격·균형 분석 켜기' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  });

  it('analyzes live videoRef frames periodically and draws/clears overlayCanvasRef when cameraActive is true', () => {
    vi.useFakeTimers();

    const syntheticRightHigh = createSyntheticPoseFrame(
      POSE_ANALYSIS_WIDTH,
      POSE_ANALYSIS_HEIGHT,
      { shoulderTiltDeg: 9.5, pelvisTiltDeg: 0, midlineShift: 0 },
    );

    // Mock canvas context creation for both scratch video downsampling and preview rendering
    const originalCreateElement = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
      const el = originalCreateElement(tagName);
      if (tagName.toLowerCase() === 'canvas') {
        Object.defineProperty(el, 'getContext', {
          configurable: true,
          value: vi.fn().mockReturnValue({
            drawImage: vi.fn(),
            getImageData: vi.fn().mockReturnValue({
              data: syntheticRightHigh,
              width: POSE_ANALYSIS_WIDTH,
              height: POSE_ANALYSIS_HEIGHT,
            }),
            putImageData: vi.fn(),
            clearRect: vi.fn(),
            save: vi.fn(),
            restore: vi.fn(),
            beginPath: vi.fn(),
            moveTo: vi.fn(),
            lineTo: vi.fn(),
            arc: vi.fn(),
            fill: vi.fn(),
            stroke: vi.fn(),
            setLineDash: vi.fn(),
          }),
        });
      }
      return el;
    });

    const overlayCtx = {
      clearRect: vi.fn(),
      save: vi.fn(),
      restore: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      arc: vi.fn(),
      fill: vi.fn(),
      stroke: vi.fn(),
      setLineDash: vi.fn(),
      strokeStyle: '',
      fillStyle: '',
      lineWidth: 1,
      lineCap: 'butt',
      lineJoin: 'miter',
    } as unknown as CanvasRenderingContext2D;

    const fakeVideo = {
      videoWidth: 640,
      videoHeight: 480,
    } as unknown as HTMLVideoElement;

    const fakeOverlayCanvas = {
      width: 320,
      height: 240,
      getContext: vi.fn().mockReturnValue(overlayCtx),
    } as unknown as HTMLCanvasElement;

    const videoRef: React.RefObject<HTMLVideoElement | null> = { current: fakeVideo };
    const overlayCanvasRef: React.RefObject<HTMLCanvasElement | null> = {
      current: fakeOverlayCanvas,
    };

    render(
      <PoseAsymmetryAnalyzerWidget
        videoRef={videoRef}
        cameraActive={true}
        overlayCanvasRef={overlayCanvasRef}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: '실시간 골격·균형 분석 켜기' }));
    expect(screen.getByText('실시간 카메라 분석 중')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(260);
    });

    expect(screen.getByTestId('pacv-metric-shoulder').textContent).toContain('오른쪽 높음');
    expect(overlayCtx.arc).toHaveBeenCalled();

    // Turning analysis OFF clears overlay canvas cleanly
    fireEvent.click(screen.getByRole('button', { name: '실시간 골격·균형 분석 끄기' }));
    expect(overlayCtx.clearRect).toHaveBeenCalledWith(0, 0, 320, 240);
  });
});
