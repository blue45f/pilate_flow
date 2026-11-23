/**
 * On-Device Real-Time Computer Vision Pose & Symmetry Analyzer
 *
 * Pure TypeScript + Canvas2D pixel-based silhouette landmark estimation.
 * Zero external CDN/WASM downloads — 100% offline PWA compatible.
 *
 * Non-medical notice:
 * Produces instructional alignment reference indicators only.
 * Not intended for medical diagnosis, clinical treatment, or therapeutic guarantees.
 */

export interface NormalizedPoint {
  x: number;
  y: number;
  confidence: number;
}

export interface EstimatedPoseLandmarks {
  head: NormalizedPoint;
  leftShoulder: NormalizedPoint;
  rightShoulder: NormalizedPoint;
  spineMid: NormalizedPoint;
  leftHip: NormalizedPoint;
  rightHip: NormalizedPoint;
  leftKnee: NormalizedPoint;
  rightKnee: NormalizedPoint;
  coverageRatio: number;
}

export type PoseSymmetryStatusLevel = 'balanced' | 'mild-shift' | 'noticeable-shift';

export interface PoseSymmetryMetrics {
  /** 양 어깨 수평 기울기(도). 양수(+)면 오른쪽 어깨가 높음 */
  shoulderTiltDeg: number;
  /** 양 골반 수평 기울기(도). 양수(+)면 오른쪽 골반이 높음 */
  pelvisTiltDeg: number;
  /** 머리-척추-골반 중심선 좌우 편차(%). 음수(-)면 좌측 이동, 양수(+)면 우측 이동 */
  midlineOffsetPct: number;
  /** 0~100 정렬 참고 점수 */
  balanceScore: number;
  statusLevel: PoseSymmetryStatusLevel;
  statusLabelKo: string;
  /** 최대 2개 비의료 티칭 큐 */
  coachingCuesKo: string[];
}

export interface PoseAnalysisResult {
  landmarks: EstimatedPoseLandmarks;
  metrics: PoseSymmetryMetrics;
}

export interface SyntheticPoseFrameOptions {
  /** 양 어깨 수평 기울기(도). 양수(+)면 오른쪽 어깨가 높음 */
  shoulderTiltDeg?: number;
  /** 양 골반 수평 기울기(도). 양수(+)면 오른쪽 골반이 높음 */
  pelvisTiltDeg?: number;
  /** 골반·척추 중심선 좌우 편차(정규화 비율, 예: -0.08 = 좌측 이동, +0.08 = 우측 이동) */
  midlineShift?: number;
}

export const POSE_ANALYSIS_WIDTH = 96;
export const POSE_ANALYSIS_HEIGHT = 72;

export const NON_MEDICAL_ALIGNMENT_DISCLAIMER_KO =
  '의학적 진단·교정 측정이 아닌 수업용 정렬 참고 지표입니다.';

export const ON_DEVICE_PRIVACY_NOTICE_KO =
  '수업 참고용 온디바이스 분석 · 영상은 저장·전송되지 않음';

export type PoseSimulationPresetId = 'balanced' | 'right-shoulder-high' | 'pelvis-left-shift';

export interface PoseSimulationPreset {
  readonly id: PoseSimulationPresetId;
  readonly labelKo: string;
  readonly shortHintKo: string;
  readonly options: Readonly<SyntheticPoseFrameOptions>;
}

export const POSE_SIMULATION_PRESETS: readonly PoseSimulationPreset[] = [
  {
    id: 'balanced',
    labelKo: '균형',
    shortHintKo: '어깨·골반 수평과 중심선이 고른 참고 자세',
    options: { shoulderTiltDeg: 0, pelvisTiltDeg: 0, midlineShift: 0 },
  },
  {
    id: 'right-shoulder-high',
    labelKo: '오른쪽 어깨 올라감',
    shortHintKo: '오른쪽 어깨가 살짝 올라간 참고 자세',
    options: { shoulderTiltDeg: 8.5, pelvisTiltDeg: 0, midlineShift: 0 },
  },
  {
    id: 'pelvis-left-shift',
    labelKo: '골반 좌측 이동',
    shortHintKo: '골반이 왼쪽으로 치우친 참고 자세',
    options: { shoulderTiltDeg: -1, pelvisTiltDeg: -5.5, midlineShift: -0.075 },
  },
] as const;

export function formatTiltDirectionKo(deg: number): string {
  if (Math.abs(deg) < 2.0) return '수평 안정';
  return deg > 0 ? '오른쪽 높음' : '왼쪽 높음';
}

export function formatSignedDeg(deg: number): string {
  const fixed = Math.abs(deg) < 0.05 ? '0.0' : deg > 0 ? `+${deg.toFixed(1)}` : deg.toFixed(1);
  return `${fixed}°`;
}

export function formatMidlineDirectionKo(pct: number): string {
  if (Math.abs(pct) < 3.5) return '중앙 안정';
  return pct < 0 ? '좌측 이동' : '우측 이동';
}

export function formatSignedPct(pct: number): string {
  const fixed = Math.abs(pct) < 0.05 ? '0.0' : pct > 0 ? `+${pct.toFixed(1)}` : pct.toFixed(1);
  return `${fixed}%`;
}

interface RowSpan {
  left: number;
  right: number;
  count: number;
  centerX: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function round1(value: number): number {
  const rounded = Math.round(value * 10) / 10;
  return Object.is(rounded, -0) ? 0 : rounded;
}

function medianOf(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2;
}

function createEmptyResult(): PoseAnalysisResult {
  return {
    landmarks: {
      head: { x: 0.5, y: 0.16, confidence: 0 },
      leftShoulder: { x: 0.36, y: 0.3, confidence: 0 },
      rightShoulder: { x: 0.64, y: 0.3, confidence: 0 },
      spineMid: { x: 0.5, y: 0.44, confidence: 0 },
      leftHip: { x: 0.4, y: 0.56, confidence: 0 },
      rightHip: { x: 0.6, y: 0.56, confidence: 0 },
      leftKnee: { x: 0.44, y: 0.77, confidence: 0 },
      rightKnee: { x: 0.56, y: 0.77, confidence: 0 },
      coverageRatio: 0,
    },
    metrics: {
      shoulderTiltDeg: 0,
      pelvisTiltDeg: 0,
      midlineOffsetPct: 0,
      balanceScore: 0,
      statusLevel: 'mild-shift',
      statusLabelKo: '화면 중앙에 상체와 골반이 보이도록 맞춰 주세요',
      coachingCuesKo: [
        '배경과 대비되는 위치에서 어깨부터 무릎까지 화면 안에 들어오게 서 보세요.',
        '강한 역광을 피하면 온디바이스 윤곽 추정이 더 안정적으로 동작해요.',
      ],
    },
  };
}

/**
 * Estimate dominant background RGB color from frame border margins
 * using a 2-pass trimmed mean to resist partial foreground intrusion.
 */
function estimateBorderBackground(
  rgba: Uint8ClampedArray,
  width: number,
  height: number,
): { r: number; g: number; b: number; meanDist: number } {
  const borderW = Math.max(2, Math.round(width * 0.06));
  const borderH = Math.max(2, Math.round(height * 0.06));
  const sampleIndices: number[] = [];

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < borderW; x += 1) {
      sampleIndices.push((y * width + x) * 4);
      sampleIndices.push((y * width + (width - 1 - x)) * 4);
    }
  }
  for (let y = 0; y < borderH; y += 1) {
    const leftCornerEnd = Math.floor(width * 0.25);
    const rightCornerStart = Math.ceil(width * 0.75);
    for (let x = borderW; x < leftCornerEnd; x += 1) {
      sampleIndices.push((y * width + x) * 4);
    }
    for (let x = rightCornerStart; x < width - borderW; x += 1) {
      sampleIndices.push((y * width + x) * 4);
    }
  }

  let sumR = 0;
  let sumG = 0;
  let sumB = 0;
  let count = 0;

  for (const idx of sampleIndices) {
    if (rgba[idx + 3]! < 16) continue;
    sumR += rgba[idx]!;
    sumG += rgba[idx + 1]!;
    sumB += rgba[idx + 2]!;
    count += 1;
  }

  if (count === 0) {
    return { r: 250, g: 248, b: 244, meanDist: 0 };
  }

  const initR = sumR / count;
  const initG = sumG / count;
  const initB = sumB / count;

  let totalDist = 0;
  for (const idx of sampleIndices) {
    if (rgba[idx + 3]! < 16) continue;
    const dr = rgba[idx]! - initR;
    const dg = rgba[idx + 1]! - initG;
    const db = rgba[idx + 2]! - initB;
    totalDist += Math.sqrt((dr * dr + dg * dg + db * db) / 3);
  }
  const initMeanDist = totalDist / count;
  const trimCut = Math.max(28, initMeanDist * 2.1);

  let trimR = 0;
  let trimG = 0;
  let trimB = 0;
  let trimCount = 0;

  for (const idx of sampleIndices) {
    if (rgba[idx + 3]! < 16) continue;
    const dr = rgba[idx]! - initR;
    const dg = rgba[idx + 1]! - initG;
    const db = rgba[idx + 2]! - initB;
    const d = Math.sqrt((dr * dr + dg * dg + db * db) / 3);
    if (d <= trimCut) {
      trimR += rgba[idx]!;
      trimG += rgba[idx + 1]!;
      trimB += rgba[idx + 2]!;
      trimCount += 1;
    }
  }

  const r = trimCount > 0 ? trimR / trimCount : initR;
  const g = trimCount > 0 ? trimG / trimCount : initG;
  const b = trimCount > 0 ? trimB / trimCount : initB;

  let refinedDist = 0;
  let refinedCount = 0;
  for (const idx of sampleIndices) {
    if (rgba[idx + 3]! < 16) continue;
    const dr = rgba[idx]! - r;
    const dg = rgba[idx + 1]! - g;
    const db = rgba[idx + 2]! - b;
    const d = Math.sqrt((dr * dr + dg * dg + db * db) / 3);
    if (d <= trimCut) {
      refinedDist += d;
      refinedCount += 1;
    }
  }

  return {
    r,
    g,
    b,
    meanDist: refinedCount > 0 ? refinedDist / refinedCount : initMeanDist,
  };
}

/**
 * Extract cleaned binary foreground mask (1 = foreground silhouette, 0 = background).
 */
function buildForegroundMask(
  rgba: Uint8ClampedArray,
  width: number,
  height: number,
): { mask: Uint8Array; foregroundCount: number } {
  const bg = estimateBorderBackground(rgba, width, height);
  const threshold = clamp(bg.meanDist * 2.4 + 18, 22, 58);
  const totalPixels = width * height;
  const rawMask = new Uint8Array(totalPixels);

  for (let i = 0; i < totalPixels; i += 1) {
    const p = i * 4;
    const a = rgba[p + 3]!;
    if (a < 16) continue;
    const dr = rgba[p]! - bg.r;
    const dg = rgba[p + 1]! - bg.g;
    const db = rgba[p + 2]! - bg.b;
    const colorDist = Math.sqrt((dr * dr + dg * dg + db * db) / 3);
    const lumaDiff = Math.abs(0.299 * dr + 0.587 * dg + 0.114 * db);
    if (Math.max(colorDist, lumaDiff) > threshold) {
      rawMask[i] = 1;
    }
  }

  // Single 3x3 majority despeckle pass
  const cleaned = new Uint8Array(totalPixels);
  let foregroundCount = 0;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const idx = y * width + x;
      if (x === 0 || y === 0 || x === width - 1 || y === height - 1) {
        cleaned[idx] = rawMask[idx]!;
        if (cleaned[idx]) foregroundCount += 1;
        continue;
      }
      const neighbors =
        rawMask[idx - width - 1]! +
        rawMask[idx - width]! +
        rawMask[idx - width + 1]! +
        rawMask[idx - 1]! +
        rawMask[idx + 1]! +
        rawMask[idx + width - 1]! +
        rawMask[idx + width]! +
        rawMask[idx + width + 1]!;
      const isFg = rawMask[idx] === 1 ? neighbors >= 2 : neighbors >= 7;
      if (isFg) {
        cleaned[idx] = 1;
        foregroundCount += 1;
      }
    }
  }

  return { mask: cleaned, foregroundCount };
}

/**
 * Find the contiguous foreground run on row y closest to targetCx.
 * Ignores separated hanging arms when tracking torso/pelvis flanks.
 */
function findCentralRunOnRow(
  mask: Uint8Array,
  width: number,
  y: number,
  targetCx: number,
): RowSpan | null {
  const rowOffset = y * width;
  let bestSpan: RowSpan | null = null;
  let bestScore = Number.POSITIVE_INFINITY;

  let x = 0;
  while (x < width) {
    while (x < width && mask[rowOffset + x] === 0) x += 1;
    if (x >= width) break;
    const start = x;
    while (x < width && mask[rowOffset + x] === 1) x += 1;
    const end = x - 1;
    const count = end - start + 1;
    if (count < 2) continue;

    const centerX = (start + end) / 2;
    const containsTarget = targetCx >= start - 1 && targetCx <= end + 1;
    const distance = containsTarget ? 0 : Math.abs(centerX - targetCx);
    // Prefer runs containing targetCx, breaking ties by proximity and width
    const score = distance - Math.min(count, width * 0.25) * 0.08;
    if (score < bestScore) {
      bestScore = score;
      bestSpan = { left: start, right: end, count, centerX };
    }
  }

  return bestSpan;
}

function computeRowSpans(mask: Uint8Array, width: number, height: number): (RowSpan | null)[] {
  const spans: (RowSpan | null)[] = new Array(height).fill(null);
  for (let y = 0; y < height; y += 1) {
    const rowOffset = y * width;
    let left = width;
    let right = -1;
    let count = 0;
    let sumX = 0;
    for (let x = 0; x < width; x += 1) {
      if (mask[rowOffset + x] === 1) {
        if (x < left) left = x;
        if (x > right) right = x;
        count += 1;
        sumX += x;
      }
    }
    if (count >= 2) {
      spans[y] = { left, right, count, centerX: sumX / count };
    }
  }
  return spans;
}

function buildMetricsFromGeometry(
  shoulderTiltDeg: number,
  pelvisTiltDeg: number,
  midlineOffsetPct: number,
): PoseSymmetryMetrics {
  const absShoulder = Math.abs(shoulderTiltDeg);
  const absPelvis = Math.abs(pelvisTiltDeg);
  const absMidline = Math.abs(midlineOffsetPct);

  const shoulderPenalty = Math.max(0, absShoulder - 0.8) * 4.0;
  const pelvisPenalty = Math.max(0, absPelvis - 0.8) * 4.2;
  const midlinePenalty = Math.max(0, absMidline - 1.5) * 1.8;

  const balanceScore = Math.round(clamp(100 - (shoulderPenalty + pelvisPenalty + midlinePenalty), 0, 100));

  let statusLevel: PoseSymmetryStatusLevel = 'balanced';
  if (absShoulder >= 6.0 || absPelvis >= 5.5 || absMidline >= 11.5 || balanceScore < 68) {
    statusLevel = 'noticeable-shift';
  } else if (absShoulder >= 2.8 || absPelvis >= 2.8 || absMidline >= 5.0 || balanceScore < 86) {
    statusLevel = 'mild-shift';
  }

  let statusLabelKo = '좌우 정렬이 안정적이에요';
  if (statusLevel === 'mild-shift') {
    statusLabelKo = '어깨·골반 높이를 가볍게 맞춰 볼까요?';
  } else if (statusLevel === 'noticeable-shift') {
    statusLabelKo = '한쪽 쏠림이 관찰돼요 · 호흡하며 중심을 맞춰 보세요';
  }

  const prioritizedCues: { severity: number; text: string }[] = [];

  if (shoulderTiltDeg >= 2.8) {
    prioritizedCues.push({
      severity: absShoulder * 1.1,
      text: '내쉬는 숨에 오른쪽 어깨를 귀에서 멀리 부드럽게 내려 보세요.',
    });
  } else if (shoulderTiltDeg <= -2.8) {
    prioritizedCues.push({
      severity: absShoulder * 1.1,
      text: '내쉬는 숨에 왼쪽 어깨 힘을 풀고 양 쇄골을 좌우로 넓게 열어 보세요.',
    });
  }

  if (pelvisTiltDeg >= 2.8) {
    prioritizedCues.push({
      severity: absPelvis * 1.15,
      text: '오른쪽 골반을 바닥 쪽으로 길게 늘려 양 골반 수평을 맞춰 보세요.',
    });
  } else if (pelvisTiltDeg <= -2.8) {
    prioritizedCues.push({
      severity: absPelvis * 1.15,
      text: '왼쪽 골반 힘을 살짝 빼고 양 발바닥에 체중을 고르게 나눠 보세요.',
    });
  }

  if (midlineOffsetPct <= -5.0) {
    prioritizedCues.push({
      severity: absMidline * 0.55,
      text: '골반이 왼쪽으로 살짝 이동했어요. 갈비뼈와 골반 중심을 중앙선 위로 모아 보세요.',
    });
  } else if (midlineOffsetPct >= 5.0) {
    prioritizedCues.push({
      severity: absMidline * 0.55,
      text: '골반이 오른쪽으로 살짝 이동했어요. 양발 안쪽에 고르게 지지하며 중심으로 돌아와 보세요.',
    });
  }

  prioritizedCues.sort((a, b) => b.severity - a.severity);

  const coachingCuesKo =
    prioritizedCues.length > 0
      ? prioritizedCues.slice(0, 2).map((item) => item.text)
      : [
          '양 어깨와 골반 높이가 고르게 유지되고 있어요. 현재 호흡 리듬을 이어가 보세요.',
          '정수리를 천장 쪽으로 길게 세우며 목과 어깨의 편안함을 유지해 보세요.',
        ];

  return {
    shoulderTiltDeg,
    pelvisTiltDeg,
    midlineOffsetPct,
    balanceScore,
    statusLevel,
    statusLabelKo,
    coachingCuesKo,
  };
}

/**
 * Analyze a raw RGBA pixel buffer into estimated skeletal landmarks and
 * non-medical Pilates symmetry reference metrics.
 */
export function analyzeSilhouetteRgbaFrame(
  rgba: Uint8ClampedArray,
  width: number,
  height: number,
): PoseAnalysisResult {
  if (width < 8 || height < 8 || rgba.length < width * height * 4) {
    return createEmptyResult();
  }

  const { mask, foregroundCount } = buildForegroundMask(rgba, width, height);
  const coverageRatio = foregroundCount / (width * height);
  if (coverageRatio < 0.015) {
    return createEmptyResult();
  }

  const rowSpans = computeRowSpans(mask, width, height);
  const minValidRowPixels = Math.max(2, Math.floor(width * 0.025));

  let bodyTop = -1;
  let bodyBottom = -1;
  for (let y = 0; y < height - 1; y += 1) {
    const cur = rowSpans[y];
    const next = rowSpans[y + 1];
    if (cur && cur.count >= minValidRowPixels && next && next.count >= minValidRowPixels) {
      bodyTop = y;
      break;
    }
  }
  for (let y = height - 1; y >= 1; y -= 1) {
    const cur = rowSpans[y];
    const prev = rowSpans[y - 1];
    if (cur && cur.count >= minValidRowPixels && prev && prev.count >= minValidRowPixels) {
      bodyBottom = y;
      break;
    }
  }

  if (bodyTop < 0 || bodyBottom <= bodyTop || bodyBottom - bodyTop < height * 0.18) {
    return createEmptyResult();
  }

  const bodyHeight = bodyBottom - bodyTop + 1;
  const bandY = (ratio: number) => clamp(Math.round(bodyTop + ratio * bodyHeight), bodyTop, bodyBottom);

  // 1. Head band (0% ~ 16% of silhouette height)
  const headTop = bandY(0.01);
  const headBot = bandY(0.16);
  let headSumX = 0;
  let headSumY = 0;
  let headPixels = 0;
  const headHalfWidths: number[] = [];
  for (let y = headTop; y <= headBot; y += 1) {
    const span = rowSpans[y];
    if (span) {
      headHalfWidths.push((span.right - span.left + 1) / 2);
    }
    const rowOffset = y * width;
    for (let x = 0; x < width; x += 1) {
      if (mask[rowOffset + x] === 1) {
        headSumX += x;
        headSumY += y;
        headPixels += 1;
      }
    }
  }
  const headX = headPixels > 0 ? headSumX / headPixels : width * 0.5;
  const headY = headPixels > 0 ? headSumY / headPixels : bodyTop + 0.08 * bodyHeight;
  const headHalfW = headHalfWidths.length > 0 ? Math.max(...headHalfWidths) : width * 0.055;
  const headConfidence = clamp(headPixels / Math.max(8, width * height * 0.008), 0.25, 0.98);

  // 2. Shoulder band (22% ~ 34% for lateral span; 13% ~ 40% top-contour ridge for tilt)
  const shBandTop = bandY(0.22);
  const shBandBot = bandY(0.34);
  const shLefts: number[] = [];
  const shRights: number[] = [];
  const shCenters: number[] = [];
  for (let y = shBandTop; y <= shBandBot; y += 1) {
    const span = findCentralRunOnRow(mask, width, y, headX) ?? rowSpans[y];
    if (span) {
      shLefts.push(span.left);
      shRights.push(span.right);
      shCenters.push(span.centerX);
    }
  }

  const upperCenterX = shCenters.length > 0 ? medianOf(shCenters) : headX;
  const shoulderOuterLeft = shLefts.length > 0 ? Math.min(...shLefts) : upperCenterX - width * 0.14;
  const shoulderOuterRight = shRights.length > 0 ? Math.max(...shRights) : upperCenterX + width * 0.14;
  const shoulderHalfSpan = Math.max(4, (shoulderOuterRight - shoulderOuterLeft) / 2);

  // Exclude head/neck columns in the middle and rounded bevel at extreme outer arm edge
  const neckExclusion = Math.max(shoulderHalfSpan * 0.34, headHalfW + 1.5);
  const leftRidgeStart = Math.max(0, Math.round(shoulderOuterLeft + shoulderHalfSpan * 0.12));
  const leftRidgeEnd = Math.min(width - 1, Math.floor(upperCenterX - neckExclusion));
  const rightRidgeStart = Math.max(0, Math.ceil(upperCenterX + neckExclusion));
  const rightRidgeEnd = Math.min(width - 1, Math.round(shoulderOuterRight - shoulderHalfSpan * 0.12));

  const ridgeScanTop = bandY(0.13);
  const ridgeScanBot = bandY(0.42);

  const sampleTopContour = (startX: number, endX: number): { meanX: number; meanY: number; count: number } => {
    let sumX = 0;
    let sumY = 0;
    let count = 0;
    for (let x = startX; x <= endX; x += 1) {
      for (let y = ridgeScanTop; y <= ridgeScanBot; y += 1) {
        if (mask[y * width + x] === 1) {
          sumX += x;
          sumY += y;
          count += 1;
          break;
        }
      }
    }
    return count > 0
      ? { meanX: sumX / count, meanY: sumY / count, count }
      : { meanX: (startX + endX) / 2, meanY: bodyTop + 0.25 * bodyHeight, count: 0 };
  };

  const leftRidge = sampleTopContour(leftRidgeStart, leftRidgeEnd);
  const rightRidge = sampleTopContour(rightRidgeStart, rightRidgeEnd);

  const shoulderJointOffset = bodyHeight * 0.025;
  const leftShoulderX = shoulderOuterLeft + shoulderHalfSpan * 0.12;
  const rightShoulderX = shoulderOuterRight - shoulderHalfSpan * 0.12;
  let leftShoulderY = bodyTop + 0.26 * bodyHeight;
  let rightShoulderY = bodyTop + 0.26 * bodyHeight;

  if (leftRidge.count >= 2 && rightRidge.count >= 2 && rightRidge.meanX - leftRidge.meanX >= 2) {
    const ridgeSlope = (rightRidge.meanY - leftRidge.meanY) / (rightRidge.meanX - leftRidge.meanX);
    const ridgeMidX = (leftRidge.meanX + rightRidge.meanX) / 2;
    const ridgeMidY = (leftRidge.meanY + rightRidge.meanY) / 2 + shoulderJointOffset;
    leftShoulderY = ridgeMidY + ridgeSlope * (leftShoulderX - ridgeMidX);
    rightShoulderY = ridgeMidY + ridgeSlope * (rightShoulderX - ridgeMidX);
  }
  const shoulderConfidence = clamp(
    Math.min(leftRidge.count, rightRidge.count) / Math.max(3, shoulderHalfSpan * 0.35),
    0.35,
    0.97,
  );

  // 3. Track central torso run downward from shoulders through waist & pelvis
  //    so separated arms hanging beside the hips do not distort waist/pelvis edges.
  const torsoTrackTop = bandY(0.32);
  const torsoTrackBot = bandY(0.68);
  const centralRuns = new Map<number, RowSpan>();
  let runningCenterX = upperCenterX;
  for (let y = torsoTrackTop; y <= torsoTrackBot; y += 1) {
    const run = findCentralRunOnRow(mask, width, y, runningCenterX);
    if (run) {
      centralRuns.set(y, run);
      runningCenterX = runningCenterX * 0.45 + run.centerX * 0.55;
    }
  }

  // Mid-spine band (38% ~ 48%)
  const spineTop = bandY(0.38);
  const spineBot = bandY(0.48);
  let spineSumX = 0;
  let spineSumY = 0;
  let spineCount = 0;
  for (let y = spineTop; y <= spineBot; y += 1) {
    const run = centralRuns.get(y) ?? rowSpans[y];
    if (run) {
      spineSumX += run.centerX;
      spineSumY += y;
      spineCount += 1;
    }
  }
  const spineMidX = spineCount > 0 ? spineSumX / spineCount : upperCenterX;
  const spineMidY = spineCount > 0 ? spineSumY / spineCount : bodyTop + 0.43 * bodyHeight;
  const spineConfidence = clamp(spineCount / Math.max(3, spineBot - spineTop + 1), 0.35, 0.96);

  // 4. Pelvis / Hip band (48% ~ 62%, searching 43% ~ 65% to capture lateral hip flare)
  const pelvisBandTop = bandY(0.48);
  const pelvisBandBot = bandY(0.62);
  const pelvisSearchTop = bandY(0.43);
  const pelvisSearchBot = bandY(0.65);

  const pelvisCenters: number[] = [];
  for (let y = pelvisBandTop; y <= pelvisBandBot; y += 1) {
    const run = centralRuns.get(y) ?? rowSpans[y];
    if (run) pelvisCenters.push(run.centerX);
  }
  const pelvisMeanCx = pelvisCenters.length > 0 ? medianOf(pelvisCenters) : spineMidX;
  const pelvisAnchorY = bodyTop + 0.55 * bodyHeight;

  const pelvisCoreWidth = (() => {
    const widths: number[] = [];
    for (let y = pelvisBandTop; y <= pelvisBandBot; y += 1) {
      const run = centralRuns.get(y);
      if (run) widths.push(run.count);
    }
    return widths.length > 0 ? medianOf(widths) : width * 0.2;
  })();

  // Collect valid single-torso rows across the pelvis search band
  const rawPelvisRows: { y: number; left: number; right: number; centerX: number }[] = [];
  for (let y = pelvisSearchTop; y <= pelvisSearchBot; y += 1) {
    const run = centralRuns.get(y);
    if (!run || run.count < pelvisCoreWidth * 0.55) continue;
    rawPelvisRows.push({ y, left: run.left, right: run.right, centerX: run.centerX });
  }

  // Decouple horizontal pelvic translation C(y) from left/right vertical hip-flare tilt
  // using linear waist->thigh baseline + even-symmetry decomposition around the pelvis peak row.
  const hipRows: { y: number; leftX: number; rightX: number; leftExtent: number; rightExtent: number }[] = [];
  if (rawPelvisRows.length >= 3) {
    const firstRow = rawPelvisRows[0]!;
    const lastRow = rawPelvisRows[rawPelvisRows.length - 1]!;
    const yMin = firstRow.y;
    const yMax = lastRow.y;

    // Locate symmetric pelvis vertical center yMid using linearly detrended torso width
    // so wider thighs vs narrower waist do not bias the hip-flare peak downward.
    const firstWidth = firstRow.right - firstRow.left;
    const lastWidth = lastRow.right - lastRow.left;
    let widthWeightSum = 0;
    let widthWeightedY = 0;
    for (const row of rawPelvisRows) {
      const t = clamp((row.y - yMin) / Math.max(1, yMax - yMin), 0, 1);
      const linW = firstWidth + (lastWidth - firstWidth) * t;
      const excessW = Math.max(0, row.right - row.left - linW);
      const w = excessW * excessW;
      widthWeightSum += w;
      widthWeightedY += row.y * w;
    }
    const yMid = widthWeightSum > 0.25 ? widthWeightedY / widthWeightSum : pelvisAnchorY;

    const rowMap = new Map<number, { left: number; right: number; centerX: number }>();
    for (const row of rawPelvisRows) {
      rowMap.set(row.y, row);
    }

    const linearBaseAt = (y: number): number => {
      const t = clamp((y - yMin) / Math.max(1, yMax - yMin), 0, 1);
      return firstRow.centerX + (lastRow.centerX - firstRow.centerX) * t;
    };

    for (const row of rawPelvisRows) {
      const mirrorY = Math.round(2 * yMid - row.y);
      const mirrorRow = rowMap.get(mirrorY);
      const baseHere = linearBaseAt(row.y);
      const resHere = row.centerX - baseHere;
      const evenRes = mirrorRow
        ? 0.5 * (resHere + (mirrorRow.centerX - linearBaseAt(mirrorY)))
        : resHere;
      const cx = baseHere + evenRes;
      hipRows.push({
        y: row.y,
        leftX: row.left,
        rightX: row.right,
        leftExtent: Math.max(0, cx - row.left),
        rightExtent: Math.max(0, row.right - cx),
      });
    }
  }

  let leftHipX = pelvisMeanCx - width * 0.1;
  let rightHipX = pelvisMeanCx + width * 0.1;
  let leftHipY = bodyTop + 0.55 * bodyHeight;
  let rightHipY = bodyTop + 0.55 * bodyHeight;
  let pelvisConfidence = 0.45;

  if (hipRows.length >= 3) {
    const firstHip = hipRows[0]!;
    const lastHip = hipRows[hipRows.length - 1]!;
    const yStart = firstHip.y;
    const ySpan = Math.max(1, lastHip.y - yStart);

    let leftWeightSum = 0;
    let leftWeightedY = 0;
    let leftWeightedX = 0;
    let rightWeightSum = 0;
    let rightWeightedY = 0;
    let rightWeightedX = 0;

    for (const row of hipRows) {
      const t = clamp((row.y - yStart) / ySpan, 0, 1);
      const linLeft = firstHip.leftExtent + (lastHip.leftExtent - firstHip.leftExtent) * t;
      const linRight = firstHip.rightExtent + (lastHip.rightExtent - firstHip.rightExtent) * t;
      const bulgeL = Math.max(0, row.leftExtent - linLeft);
      const bulgeR = Math.max(0, row.rightExtent - linRight);
      const wL = bulgeL * bulgeL * bulgeL;
      const wR = bulgeR * bulgeR * bulgeR;
      leftWeightSum += wL;
      leftWeightedY += row.y * wL;
      leftWeightedX += row.leftX * wL;
      rightWeightSum += wR;
      rightWeightedY += row.y * wR;
      rightWeightedX += row.rightX * wR;
    }

    if (leftWeightSum > 0.25 && rightWeightSum > 0.25) {
      leftHipY = leftWeightedY / leftWeightSum;
      rightHipY = rightWeightedY / rightWeightSum;
      leftHipX = leftWeightedX / leftWeightSum;
      rightHipX = rightWeightedX / rightWeightSum;
      pelvisConfidence = 0.92;
    } else {
      const coreHipRows = hipRows.filter((row) => row.y >= pelvisBandTop && row.y <= pelvisBandBot);
      const sample = coreHipRows.length > 0 ? coreHipRows : hipRows;
      leftHipX = medianOf(sample.map((row) => row.leftX));
      rightHipX = medianOf(sample.map((row) => row.rightX));
      leftHipY = pelvisAnchorY;
      rightHipY = pelvisAnchorY;
      pelvisConfidence = 0.65;
    }
  }

  // 5. Knee band (70% ~ 84% of silhouette height)
  const kneeTop = bandY(0.7);
  const kneeBot = bandY(0.84);
  let leftKneeSumX = 0;
  let leftKneeSumY = 0;
  let leftKneeCount = 0;
  let rightKneeSumX = 0;
  let rightKneeSumY = 0;
  let rightKneeCount = 0;

  for (let y = kneeTop; y <= kneeBot; y += 1) {
    const span = rowSpans[y];
    if (!span) continue;
    const splitX = span.centerX;
    const rowOffset = y * width;
    for (let x = span.left; x <= span.right; x += 1) {
      if (mask[rowOffset + x] === 1) {
        if (x < splitX) {
          leftKneeSumX += x;
          leftKneeSumY += y;
          leftKneeCount += 1;
        } else {
          rightKneeSumX += x;
          rightKneeSumY += y;
          rightKneeCount += 1;
        }
      }
    }
  }

  const leftKneeX = leftKneeCount > 0 ? leftKneeSumX / leftKneeCount : pelvisMeanCx - width * 0.055;
  const leftKneeY = leftKneeCount > 0 ? leftKneeSumY / leftKneeCount : bodyTop + 0.77 * bodyHeight;
  const rightKneeX = rightKneeCount > 0 ? rightKneeSumX / rightKneeCount : pelvisMeanCx + width * 0.055;
  const rightKneeY = rightKneeCount > 0 ? rightKneeSumY / rightKneeCount : bodyTop + 0.77 * bodyHeight;
  const kneeConfidence = clamp(
    Math.min(leftKneeCount, rightKneeCount) / Math.max(6, width * height * 0.004),
    0.3,
    0.95,
  );

  // 6. Compute real physical angles (pixel aspect preserved) and midline offset
  const shDxPx = Math.max(2, rightShoulderX - leftShoulderX);
  const shDyPx = leftShoulderY - rightShoulderY; // + when right shoulder is higher (smaller y)
  const shoulderTiltDeg = round1(clamp((Math.atan2(shDyPx, shDxPx) * 180) / Math.PI, -45, 45));

  const pelDxPx = Math.max(2, rightHipX - leftHipX);
  const pelDyPx = leftHipY - rightHipY; // + when right hip is higher (smaller y)
  const pelvisTiltDeg = round1(clamp((Math.atan2(pelDyPx, pelDxPx) * 180) / Math.PI, -45, 45));

  // Internal anatomical midline deviation: pelvis & spine relative to head-to-knee plumb line
  const kneesCenterX = (leftKneeX + rightKneeX) / 2;
  const plumbRefX = (headX + kneesCenterX) / 2;
  const pelvisCenterX = (leftHipX + rightHipX) / 2;
  const bodyWidthRefPx = Math.max(width * 0.14, rightShoulderX - leftShoulderX);
  const signedShiftPx = (pelvisCenterX - plumbRefX) * 0.72 + (spineMidX - plumbRefX) * 0.28;
  const midlineOffsetPct = round1(clamp((signedShiftPx / bodyWidthRefPx) * 100, -50, 50));

  const landmarks: EstimatedPoseLandmarks = {
    head: { x: clamp(headX / width, 0, 1), y: clamp(headY / height, 0, 1), confidence: round1(headConfidence) },
    leftShoulder: {
      x: clamp(leftShoulderX / width, 0, 1),
      y: clamp(leftShoulderY / height, 0, 1),
      confidence: round1(shoulderConfidence),
    },
    rightShoulder: {
      x: clamp(rightShoulderX / width, 0, 1),
      y: clamp(rightShoulderY / height, 0, 1),
      confidence: round1(shoulderConfidence),
    },
    spineMid: {
      x: clamp(spineMidX / width, 0, 1),
      y: clamp(spineMidY / height, 0, 1),
      confidence: round1(spineConfidence),
    },
    leftHip: {
      x: clamp(leftHipX / width, 0, 1),
      y: clamp(leftHipY / height, 0, 1),
      confidence: round1(pelvisConfidence),
    },
    rightHip: {
      x: clamp(rightHipX / width, 0, 1),
      y: clamp(rightHipY / height, 0, 1),
      confidence: round1(pelvisConfidence),
    },
    leftKnee: {
      x: clamp(leftKneeX / width, 0, 1),
      y: clamp(leftKneeY / height, 0, 1),
      confidence: round1(kneeConfidence),
    },
    rightKnee: {
      x: clamp(rightKneeX / width, 0, 1),
      y: clamp(rightKneeY / height, 0, 1),
      confidence: round1(kneeConfidence),
    },
    coverageRatio: round1(coverageRatio * 100) / 100,
  };

  const metrics = buildMetricsFromGeometry(shoulderTiltDeg, pelvisTiltDeg, midlineOffsetPct);

  return { landmarks, metrics };
}

/**
 * Pure TypeScript rasterizer for testing and camera-free simulation previews.
 * Renders an anatomically proportioned silhouette on Warm Linen (#FAF8F4)
 * with Botanical Sage (#355441) foreground pixels.
 */
export function createSyntheticPoseFrame(
  width: number,
  height: number,
  options: SyntheticPoseFrameOptions = {},
): Uint8ClampedArray {
  const safeW = Math.max(16, Math.round(width));
  const safeH = Math.max(16, Math.round(height));
  const rgba = new Uint8ClampedArray(safeW * safeH * 4);

  // Fill background with Warm Ivory (#FAF8F4)
  for (let i = 0; i < safeW * safeH; i += 1) {
    const p = i * 4;
    rgba[p] = 250;
    rgba[p + 1] = 248;
    rgba[p + 2] = 244;
    rgba[p + 3] = 255;
  }

  const paintFg = (x: number, y: number) => {
    const ix = Math.round(x);
    const iy = Math.round(y);
    if (ix < 0 || ix >= safeW || iy < 0 || iy >= safeH) return;
    const p = (iy * safeW + ix) * 4;
    rgba[p] = 53;
    rgba[p + 1] = 84;
    rgba[p + 2] = 65;
    rgba[p + 3] = 255;
  };

  const fillEllipse = (cx: number, cy: number, rx: number, ry: number) => {
    const x0 = Math.max(0, Math.floor(cx - rx - 1));
    const x1 = Math.min(safeW - 1, Math.ceil(cx + rx + 1));
    const y0 = Math.max(0, Math.floor(cy - ry - 1));
    const y1 = Math.min(safeH - 1, Math.ceil(cy + ry + 1));
    for (let y = y0; y <= y1; y += 1) {
      for (let x = x0; x <= x1; x += 1) {
        const nx = (x - cx) / Math.max(0.5, rx);
        const ny = (y - cy) / Math.max(0.5, ry);
        if (nx * nx + ny * ny <= 1) {
          paintFg(x, y);
        }
      }
    }
  };

  const fillCapsule = (x1: number, y1: number, x2: number, y2: number, radius: number) => {
    const minX = Math.max(0, Math.floor(Math.min(x1, x2) - radius - 1));
    const maxX = Math.min(safeW - 1, Math.ceil(Math.max(x1, x2) + radius + 1));
    const minY = Math.max(0, Math.floor(Math.min(y1, y2) - radius - 1));
    const maxY = Math.min(safeH - 1, Math.ceil(Math.max(y1, y2) + radius + 1));
    const dx = x2 - x1;
    const dy = y2 - y1;
    const lenSq = dx * dx + dy * dy;
    const rSq = radius * radius;

    for (let y = minY; y <= maxY; y += 1) {
      for (let x = minX; x <= maxX; x += 1) {
        const t = lenSq > 0 ? clamp(((x - x1) * dx + (y - y1) * dy) / lenSq, 0, 1) : 0;
        const px = x1 + t * dx;
        const py = y1 + t * dy;
        const dSq = (x - px) * (x - px) + (y - py) * (y - py);
        if (dSq <= rSq) {
          paintFg(x, y);
        }
      }
    }
  };

  const shoulderTiltDeg = clamp(options.shoulderTiltDeg ?? 0, -25, 25);
  const pelvisTiltDeg = clamp(options.pelvisTiltDeg ?? 0, -25, 25);
  const midlineShift = clamp(options.midlineShift ?? 0, -0.18, 0.18);

  const bodyTop = safeH * 0.08;
  const bodyBottom = safeH * 0.92;
  const bodyH = bodyBottom - bodyTop;
  const baseCx = safeW * 0.5;

  // Head & neck
  const headCx = baseCx;
  const headCy = bodyTop + 0.08 * bodyH;
  fillEllipse(headCx, headCy, safeW * 0.052, bodyH * 0.072);
  fillCapsule(headCx, bodyTop + 0.14 * bodyH, headCx + midlineShift * 0.15 * safeW, bodyTop + 0.23 * bodyH, safeW * 0.028);

  // Shoulders & upper torso (clean tilted ridge matching shoulderTiltDeg)
  const shCx = baseCx + midlineShift * 0.2 * safeW;
  const shCenterY = bodyTop + 0.245 * bodyH;
  const shHalfW = safeW * 0.155;
  const shSlope = -Math.tan((shoulderTiltDeg * Math.PI) / 180);

  const lsX = shCx - shHalfW;
  const rsX = shCx + shHalfW;
  const lsY = shCenterY + (lsX - shCx) * shSlope;
  const rsY = shCenterY + (rsX - shCx) * shSlope;

  const waistCx = baseCx + midlineShift * 0.55 * safeW;
  const waistY = bodyTop + 0.43 * bodyH;
  const waistHalfW = safeW * 0.082;

  const pelvisCx = baseCx + midlineShift * safeW;
  const pelvisCenterY = bodyTop + 0.55 * bodyH;
  const hipHalfW = safeW * 0.132;
  const pelvisSlope = -Math.tan((pelvisTiltDeg * Math.PI) / 180);
  const leftHipY = pelvisCenterY - hipHalfW * pelvisSlope;
  const rightHipY = pelvisCenterY + hipHalfW * pelvisSlope;

  const thighTopY = bodyTop + 0.66 * bodyH;
  const thighCx = baseCx + midlineShift * 0.45 * safeW;
  const thighHalfW = safeW * 0.092;

  // Render torso + tilted shoulder top + smoothly flared left/right hip contours
  const torsoStartY = Math.max(0, Math.floor(Math.min(lsY, rsY) - 1));
  const torsoEndY = Math.min(safeH - 1, Math.ceil(thighTopY));

  for (let y = torsoStartY; y <= torsoEndY; y += 1) {
    let centerX: number;
    let leftBound: number;
    let rightBound: number;

    if (y <= waistY) {
      const t = clamp((y - shCenterY) / Math.max(1, waistY - shCenterY), 0, 1);
      centerX = shCx + (waistCx - shCx) * t;
      const halfW = shHalfW * 0.96 + (waistHalfW - shHalfW * 0.96) * t;
      leftBound = centerX - halfW;
      rightBound = centerX + halfW;
    } else {
      // Smooth pelvis centerline curve
      if (y <= pelvisCenterY) {
        const t = clamp((y - waistY) / Math.max(1, pelvisCenterY - waistY), 0, 1);
        centerX = waistCx + (pelvisCx - waistCx) * t;
      } else {
        const t = clamp((y - pelvisCenterY) / Math.max(1, thighTopY - pelvisCenterY), 0, 1);
        centerX = pelvisCx + (thighCx - pelvisCx) * t;
      }

      // Independent Gaussian lateral flares centered at leftHipY and rightHipY
      const flareSigma = bodyH * 0.058;
      const leftDist = (y - leftHipY) / flareSigma;
      const rightDist = (y - rightHipY) / flareSigma;
      const leftFlare = Math.exp(-0.5 * leftDist * leftDist);
      const rightFlare = Math.exp(-0.5 * rightDist * rightDist);

      const baseHalfW =
        y <= pelvisCenterY
          ? waistHalfW + (thighHalfW - waistHalfW) * clamp((y - waistY) / Math.max(1, thighTopY - waistY), 0, 1)
          : thighHalfW;
      const extraHip = Math.max(0, hipHalfW - baseHalfW);

      leftBound = centerX - (baseHalfW + extraHip * leftFlare);
      rightBound = centerX + (baseHalfW + extraHip * rightFlare);
    }

    const x0 = Math.max(0, Math.ceil(leftBound));
    const x1 = Math.min(safeW - 1, Math.floor(rightBound));
    for (let x = x0; x <= x1; x += 1) {
      // Enforce crisp tilted shoulder top line across upper chest
      const shoulderLineY = shCenterY + (x - shCx) * shSlope;
      if (y < shoulderLineY) continue;
      paintFg(x, y);
    }
  }

  // Natural relaxed arms descending slightly clear of waist/hips (Pilates standing A-frame)
  const armRadius = Math.max(1.8, safeW * 0.021);
  fillCapsule(lsX + armRadius * 0.3, lsY + armRadius * 0.9, lsX - safeW * 0.065, bodyTop + 0.54 * bodyH, armRadius);
  fillCapsule(rsX - armRadius * 0.3, rsY + armRadius * 0.9, rsX + safeW * 0.065, bodyTop + 0.54 * bodyH, armRadius);

  // Two distinct legs descending from pelvis to knees and ankles
  const kneesCx = baseCx + midlineShift * 0.15 * safeW;
  const legRadius = Math.max(2.2, safeW * 0.032);
  fillCapsule(
    pelvisCx - safeW * 0.055,
    pelvisCenterY + bodyH * 0.04,
    kneesCx - safeW * 0.055,
    bodyBottom - legRadius,
    legRadius,
  );
  fillCapsule(
    pelvisCx + safeW * 0.055,
    pelvisCenterY + bodyH * 0.04,
    kneesCx + safeW * 0.055,
    bodyBottom - legRadius,
    legRadius,
  );

  return rgba;
}

/**
 * Downsample an HTMLVideoElement frame into a 96x72 scratch canvas and analyze it on-device (<2ms).
 */
export function analyzeVideoFrameToPose(
  video: HTMLVideoElement,
  scratchCanvas?: HTMLCanvasElement,
): PoseAnalysisResult | null {
  if (!video || video.videoWidth <= 0 || video.videoHeight <= 0) {
    return null;
  }

  try {
    const canvas =
      scratchCanvas ?? (typeof document !== 'undefined' ? document.createElement('canvas') : null);
    if (!canvas) return null;

    if (canvas.width !== POSE_ANALYSIS_WIDTH) {
      canvas.width = POSE_ANALYSIS_WIDTH;
    }
    if (canvas.height !== POSE_ANALYSIS_HEIGHT) {
      canvas.height = POSE_ANALYSIS_HEIGHT;
    }

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return null;

    ctx.drawImage(video, 0, 0, POSE_ANALYSIS_WIDTH, POSE_ANALYSIS_HEIGHT);
    const frame = ctx.getImageData(0, 0, POSE_ANALYSIS_WIDTH, POSE_ANALYSIS_HEIGHT);
    return analyzeSilhouetteRgbaFrame(frame.data, POSE_ANALYSIS_WIDTH, POSE_ANALYSIS_HEIGHT);
  } catch {
    return null;
  }
}

function getGuideStrokeColor(absDeviation: number, mildThreshold: number, noticeableThreshold: number): string {
  if (absDeviation >= noticeableThreshold) return '#8A341E'; // Terracotta
  if (absDeviation >= mildThreshold) return '#8C5A1E'; // Restrained Clay Amber
  return '#355441'; // Botanical Sage
}

/**
 * Draw botanical-sage skeletal overlay, shoulder/pelvis level guides,
 * and central vertical plumb line onto a 2D canvas.
 */
export function drawPoseLandmarksOnCanvas(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  landmarks: EstimatedPoseLandmarks,
  metrics: PoseSymmetryMetrics,
): void {
  ctx.clearRect(0, 0, width, height);
  if (width <= 0 || height <= 0 || landmarks.coverageRatio < 0.015) {
    return;
  }

  const toPx = (pt: NormalizedPoint) => ({
    x: pt.x * width,
    y: pt.y * height,
  });

  const head = toPx(landmarks.head);
  const ls = toPx(landmarks.leftShoulder);
  const rs = toPx(landmarks.rightShoulder);
  const spine = toPx(landmarks.spineMid);
  const lh = toPx(landmarks.leftHip);
  const rh = toPx(landmarks.rightHip);
  const lk = toPx(landmarks.leftKnee);
  const rk = toPx(landmarks.rightKnee);

  const shMid = { x: (ls.x + rs.x) / 2, y: (ls.y + rs.y) / 2 };
  const hipMid = { x: (lh.x + rh.x) / 2, y: (lh.y + rh.y) / 2 };
  const kneeMid = { x: (lk.x + rk.x) / 2, y: (lk.y + rk.y) / 2 };
  const plumbX = (head.x + kneeMid.x) / 2;

  const sageColor = '#355441';
  const haloColor = 'rgba(255, 254, 249, 0.86)';
  const shoulderColor = getGuideStrokeColor(Math.abs(metrics.shoulderTiltDeg), 2.8, 6.0);
  const pelvisColor = getGuideStrokeColor(Math.abs(metrics.pelvisTiltDeg), 2.8, 5.5);

  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // 1. Central vertical plumb line
  const drawDashedGuide = (
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    strokeStyle: string,
    dash: number[],
  ) => {
    ctx.beginPath();
    ctx.setLineDash(dash);
    ctx.strokeStyle = haloColor;
    ctx.lineWidth = 3;
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();

    ctx.beginPath();
    ctx.setLineDash(dash);
    ctx.strokeStyle = strokeStyle;
    ctx.lineWidth = 1.25;
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  };

  drawDashedGuide(plumbX, height * 0.05, plumbX, height * 0.95, 'rgba(53, 84, 65, 0.6)', [5, 5]);

  // 2. Horizontal reference guides for shoulder & pelvis levels
  const shGuidePad = Math.max(16, Math.abs(rs.x - ls.x) * 0.25);
  drawDashedGuide(
    Math.max(8, ls.x - shGuidePad),
    shMid.y,
    Math.min(width - 8, rs.x + shGuidePad),
    shMid.y,
    'rgba(53, 84, 65, 0.45)',
    [6, 4],
  );

  const hipGuidePad = Math.max(16, Math.abs(rh.x - lh.x) * 0.28);
  drawDashedGuide(
    Math.max(8, lh.x - hipGuidePad),
    hipMid.y,
    Math.min(width - 8, rh.x + hipGuidePad),
    hipMid.y,
    'rgba(53, 84, 65, 0.45)',
    [6, 4],
  );

  // 3. Solid skeletal lines
  ctx.setLineDash([]);
  const drawSegment = (
    a: { x: number; y: number },
    b: { x: number; y: number },
    color: string,
    lineWidth = 2.5,
  ) => {
    ctx.beginPath();
    ctx.strokeStyle = haloColor;
    ctx.lineWidth = lineWidth + 2;
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();

    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  };

  // Spine & leg kinetic chain in botanical sage
  drawSegment(head, shMid, sageColor, 2.2);
  drawSegment(shMid, spine, sageColor, 2.2);
  drawSegment(spine, hipMid, sageColor, 2.2);
  drawSegment(ls, lh, 'rgba(53, 84, 65, 0.65)', 1.75);
  drawSegment(rs, rh, 'rgba(53, 84, 65, 0.65)', 1.75);
  drawSegment(lh, lk, sageColor, 2.2);
  drawSegment(rh, rk, sageColor, 2.2);

  // Highlighted shoulder & pelvis alignment bars
  drawSegment(ls, rs, shoulderColor, 3);
  drawSegment(lh, rh, pelvisColor, 3);

  // 4. Joint landmark nodes
  const radius = Math.max(3.5, Math.min(6, Math.min(width, height) * 0.022));
  const nodes: Array<{ pt: { x: number; y: number }; stroke: string }> = [
    { pt: head, stroke: sageColor },
    { pt: ls, stroke: shoulderColor },
    { pt: rs, stroke: shoulderColor },
    { pt: spine, stroke: sageColor },
    { pt: lh, stroke: pelvisColor },
    { pt: rh, stroke: pelvisColor },
    { pt: lk, stroke: sageColor },
    { pt: rk, stroke: sageColor },
  ];

  for (const node of nodes) {
    ctx.beginPath();
    ctx.arc(node.pt.x, node.pt.y, radius, 0, Math.PI * 2);
    ctx.fillStyle = '#FFFFFF';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = node.stroke;
    ctx.stroke();
  }

  ctx.restore();
}
