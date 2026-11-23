import { describe, expect, it, vi } from 'vitest';
import {
  NON_MEDICAL_ALIGNMENT_DISCLAIMER_KO,
  POSE_ANALYSIS_HEIGHT,
  POSE_ANALYSIS_WIDTH,
  analyzeSilhouetteRgbaFrame,
  analyzeVideoFrameToPose,
  createSyntheticPoseFrame,
  drawPoseLandmarksOnCanvas,
} from './onDevicePoseAnalyzer';

const FORBIDDEN_MEDICAL_TERMS = ['측만증', '디스크', '치료', '완치', '진단', '교정 보장', '처방'];

describe('onDevicePoseAnalyzer', () => {
  it('detects balanced posture accurately on a neutral synthetic frame', () => {
    const rgba = createSyntheticPoseFrame(POSE_ANALYSIS_WIDTH, POSE_ANALYSIS_HEIGHT, {
      shoulderTiltDeg: 0,
      pelvisTiltDeg: 0,
      midlineShift: 0,
    });

    const { landmarks, metrics } = analyzeSilhouetteRgbaFrame(
      rgba,
      POSE_ANALYSIS_WIDTH,
      POSE_ANALYSIS_HEIGHT,
    );

    expect(landmarks.coverageRatio).toBeGreaterThan(0.08);
    expect(landmarks.coverageRatio).toBeLessThan(0.6);
    expect(landmarks.head.y).toBeLessThan(landmarks.leftShoulder.y);
    expect(landmarks.leftShoulder.y).toBeLessThan(landmarks.spineMid.y);
    expect(landmarks.spineMid.y).toBeLessThan(landmarks.leftHip.y);
    expect(landmarks.leftHip.y).toBeLessThan(landmarks.leftKnee.y);
    expect(landmarks.leftShoulder.x).toBeLessThan(landmarks.rightShoulder.x);
    expect(landmarks.leftHip.x).toBeLessThan(landmarks.rightHip.x);
    expect(landmarks.leftKnee.x).toBeLessThan(landmarks.rightKnee.x);

    expect(Math.abs(metrics.shoulderTiltDeg)).toBeLessThanOrEqual(1.5);
    expect(Math.abs(metrics.pelvisTiltDeg)).toBeLessThanOrEqual(1.5);
    expect(Math.abs(metrics.midlineOffsetPct)).toBeLessThanOrEqual(2.5);
    expect(metrics.balanceScore).toBeGreaterThanOrEqual(92);
    expect(metrics.statusLevel).toBe('balanced');
    expect(metrics.statusLabelKo).toBe('좌우 정렬이 안정적이에요');
    expect(metrics.coachingCuesKo.length).toBeGreaterThan(0);
    expect(metrics.coachingCuesKo.length).toBeLessThanOrEqual(2);
  });

  it('distinguishes raised right shoulder (+deg) and raised left shoulder (-deg)', () => {
    const rightHighRgba = createSyntheticPoseFrame(POSE_ANALYSIS_WIDTH, POSE_ANALYSIS_HEIGHT, {
      shoulderTiltDeg: 9,
      pelvisTiltDeg: 0,
      midlineShift: 0,
    });
    const leftHighRgba = createSyntheticPoseFrame(POSE_ANALYSIS_WIDTH, POSE_ANALYSIS_HEIGHT, {
      shoulderTiltDeg: -9,
      pelvisTiltDeg: 0,
      midlineShift: 0,
    });

    const rightHigh = analyzeSilhouetteRgbaFrame(
      rightHighRgba,
      POSE_ANALYSIS_WIDTH,
      POSE_ANALYSIS_HEIGHT,
    );
    const leftHigh = analyzeSilhouetteRgbaFrame(
      leftHighRgba,
      POSE_ANALYSIS_WIDTH,
      POSE_ANALYSIS_HEIGHT,
    );

    expect(rightHigh.metrics.shoulderTiltDeg).toBeGreaterThan(5.5);
    expect(rightHigh.metrics.shoulderTiltDeg).toBeLessThan(13);
    expect(rightHigh.landmarks.rightShoulder.y).toBeLessThan(rightHigh.landmarks.leftShoulder.y);
    expect(rightHigh.metrics.statusLevel).not.toBe('balanced');
    expect(rightHigh.metrics.coachingCuesKo.some((cue) => cue.includes('오른쪽 어깨'))).toBe(true);

    expect(leftHigh.metrics.shoulderTiltDeg).toBeLessThan(-5.5);
    expect(leftHigh.metrics.shoulderTiltDeg).toBeGreaterThan(-13);
    expect(leftHigh.landmarks.leftShoulder.y).toBeLessThan(leftHigh.landmarks.rightShoulder.y);
    expect(leftHigh.metrics.coachingCuesKo.some((cue) => cue.includes('왼쪽 어깨'))).toBe(true);
  });

  it('detects pelvic tilt (+ right high / - left high) and lateral midline shift accurately', () => {
    const rightHipHighRgba = createSyntheticPoseFrame(POSE_ANALYSIS_WIDTH, POSE_ANALYSIS_HEIGHT, {
      shoulderTiltDeg: 0,
      pelvisTiltDeg: 8.5,
      midlineShift: 0,
    });
    const pelvisLeftShiftRgba = createSyntheticPoseFrame(POSE_ANALYSIS_WIDTH, POSE_ANALYSIS_HEIGHT, {
      shoulderTiltDeg: -1,
      pelvisTiltDeg: -5.5,
      midlineShift: -0.075,
    });
    const pelvisRightShiftRgba = createSyntheticPoseFrame(
      POSE_ANALYSIS_WIDTH,
      POSE_ANALYSIS_HEIGHT,
      {
        shoulderTiltDeg: 0,
        pelvisTiltDeg: 0,
        midlineShift: 0.075,
      },
    );

    const rightHipHigh = analyzeSilhouetteRgbaFrame(
      rightHipHighRgba,
      POSE_ANALYSIS_WIDTH,
      POSE_ANALYSIS_HEIGHT,
    );
    const leftShift = analyzeSilhouetteRgbaFrame(
      pelvisLeftShiftRgba,
      POSE_ANALYSIS_WIDTH,
      POSE_ANALYSIS_HEIGHT,
    );
    const rightShift = analyzeSilhouetteRgbaFrame(
      pelvisRightShiftRgba,
      POSE_ANALYSIS_WIDTH,
      POSE_ANALYSIS_HEIGHT,
    );

    expect(rightHipHigh.metrics.pelvisTiltDeg).toBeGreaterThan(4.5);
    expect(rightHipHigh.landmarks.rightHip.y).toBeLessThan(rightHipHigh.landmarks.leftHip.y);

    expect(leftShift.metrics.midlineOffsetPct).toBeLessThan(-8);
    expect(leftShift.metrics.pelvisTiltDeg).toBeLessThan(-2.5);
    expect(leftShift.metrics.balanceScore).toBeLessThan(75);
    expect(leftShift.metrics.statusLevel).toBe('noticeable-shift');

    expect(rightShift.metrics.midlineOffsetPct).toBeGreaterThan(8);
    expect(Math.abs(rightShift.metrics.pelvisTiltDeg)).toBeLessThan(3);
  });

  it('handles blank/uniform frames and invalid dimensions safely without throwing', () => {
    const blank = new Uint8ClampedArray(POSE_ANALYSIS_WIDTH * POSE_ANALYSIS_HEIGHT * 4);
    for (let i = 0; i < POSE_ANALYSIS_WIDTH * POSE_ANALYSIS_HEIGHT; i += 1) {
      blank[i * 4] = 245;
      blank[i * 4 + 1] = 242;
      blank[i * 4 + 2] = 236;
      blank[i * 4 + 3] = 255;
    }

    const blankRes = analyzeSilhouetteRgbaFrame(blank, POSE_ANALYSIS_WIDTH, POSE_ANALYSIS_HEIGHT);
    expect(blankRes.landmarks.coverageRatio).toBe(0);
    expect(blankRes.metrics.balanceScore).toBe(0);
    expect(blankRes.metrics.coachingCuesKo.length).toBeLessThanOrEqual(2);

    const invalidRes = analyzeSilhouetteRgbaFrame(new Uint8ClampedArray(0), 0, 0);
    expect(invalidRes.landmarks.coverageRatio).toBe(0);
  });

  it('never emits medical diagnosis or treatment guarantee wording across all pose scenarios', () => {
    const scenarios = [
      { shoulderTiltDeg: 0, pelvisTiltDeg: 0, midlineShift: 0 },
      { shoulderTiltDeg: 10, pelvisTiltDeg: 0, midlineShift: 0 },
      { shoulderTiltDeg: -10, pelvisTiltDeg: 8, midlineShift: -0.08 },
      { shoulderTiltDeg: 3, pelvisTiltDeg: -8, midlineShift: 0.08 },
    ];

    for (const opts of scenarios) {
      const rgba = createSyntheticPoseFrame(POSE_ANALYSIS_WIDTH, POSE_ANALYSIS_HEIGHT, opts);
      const { metrics } = analyzeSilhouetteRgbaFrame(
        rgba,
        POSE_ANALYSIS_WIDTH,
        POSE_ANALYSIS_HEIGHT,
      );
      const combinedText = `${metrics.statusLabelKo} ${metrics.coachingCuesKo.join(' ')}`;
      for (const term of FORBIDDEN_MEDICAL_TERMS) {
        expect(combinedText).not.toContain(term);
      }
      expect(metrics.coachingCuesKo.length).toBeLessThanOrEqual(2);
    }

    expect(NON_MEDICAL_ALIGNMENT_DISCLAIMER_KO).toContain('의학적 진단·교정 측정이 아닌');
  });

  it('downsamples HTMLVideoElement via scratch canvas in analyzeVideoFrameToPose', () => {
    const synthetic = createSyntheticPoseFrame(POSE_ANALYSIS_WIDTH, POSE_ANALYSIS_HEIGHT, {
      shoulderTiltDeg: 8,
    });

    const drawImage = vi.fn();
    const getImageData = vi.fn().mockReturnValue({
      data: synthetic,
      width: POSE_ANALYSIS_WIDTH,
      height: POSE_ANALYSIS_HEIGHT,
    });

    const fakeScratch = {
      width: 0,
      height: 0,
      getContext: vi.fn().mockReturnValue({
        drawImage,
        getImageData,
      }),
    } as unknown as HTMLCanvasElement;

    const fakeVideo = {
      videoWidth: 640,
      videoHeight: 480,
    } as unknown as HTMLVideoElement;

    const result = analyzeVideoFrameToPose(fakeVideo, fakeScratch);
    expect(result).not.toBeNull();
    expect(fakeScratch.width).toBe(POSE_ANALYSIS_WIDTH);
    expect(fakeScratch.height).toBe(POSE_ANALYSIS_HEIGHT);
    expect(drawImage).toHaveBeenCalledWith(
      fakeVideo,
      0,
      0,
      POSE_ANALYSIS_WIDTH,
      POSE_ANALYSIS_HEIGHT,
    );
    expect(result!.metrics.shoulderTiltDeg).toBeGreaterThan(5);

    // Zero-dimension video returns null safely
    const unloadedVideo = { videoWidth: 0, videoHeight: 0 } as unknown as HTMLVideoElement;
    expect(analyzeVideoFrameToPose(unloadedVideo, fakeScratch)).toBeNull();
  });

  it('draws botanical-sage landmarks, horizontal guides, and vertical plumb line on canvas', () => {
    const rgba = createSyntheticPoseFrame(POSE_ANALYSIS_WIDTH, POSE_ANALYSIS_HEIGHT, {
      shoulderTiltDeg: 7,
      pelvisTiltDeg: -4,
      midlineShift: -0.05,
    });
    const { landmarks, metrics } = analyzeSilhouetteRgbaFrame(
      rgba,
      POSE_ANALYSIS_WIDTH,
      POSE_ANALYSIS_HEIGHT,
    );

    const strokeStyles: string[] = [];
    const ctx = {
      clearRect: vi.fn(),
      save: vi.fn(),
      restore: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      arc: vi.fn(),
      fill: vi.fn(),
      setLineDash: vi.fn(),
      stroke: vi.fn(function (this: { strokeStyle: string }) {
        strokeStyles.push(this.strokeStyle);
      }),
      strokeStyle: '',
      fillStyle: '',
      lineWidth: 1,
      lineCap: 'butt',
      lineJoin: 'miter',
    } as unknown as CanvasRenderingContext2D;

    drawPoseLandmarksOnCanvas(ctx, 320, 240, landmarks, metrics);

    expect(ctx.clearRect).toHaveBeenCalledWith(0, 0, 320, 240);
    expect(ctx.setLineDash).toHaveBeenCalledWith([5, 5]);
    expect(ctx.setLineDash).toHaveBeenCalledWith([6, 4]);
    expect(ctx.arc).toHaveBeenCalledTimes(8);
    expect(strokeStyles).toContain('#355441');
  });

  it('runs a 96x72 frame analysis well under real-time budget', () => {
    const rgba = createSyntheticPoseFrame(POSE_ANALYSIS_WIDTH, POSE_ANALYSIS_HEIGHT, {
      shoulderTiltDeg: 6,
      pelvisTiltDeg: -3,
      midlineShift: -0.04,
    });

    // Warm up JIT
    analyzeSilhouetteRgbaFrame(rgba, POSE_ANALYSIS_WIDTH, POSE_ANALYSIS_HEIGHT);

    const iterations = 20;
    const start = performance.now();
    for (let i = 0; i < iterations; i += 1) {
      analyzeSilhouetteRgbaFrame(rgba, POSE_ANALYSIS_WIDTH, POSE_ANALYSIS_HEIGHT);
    }
    const avgMs = (performance.now() - start) / iterations;
    // Generous CI ceiling (< 15ms); typically < 0.8ms on local hardware
    expect(avgMs).toBeLessThan(15);
  });
});
