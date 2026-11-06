/**
 * Original deterministic 2D geometry for two isolated lab prototypes.
 * Ported from the verified motion-model.mjs v0.1.0-draft source. These schematic
 * coordinates are not a validated exercise demonstration or a catalog mapping.
 */
export type MotionPrototypeId = 'bridge-pattern' | 'heel-slide';
export type AnatomicalSide = 'left' | 'right';

export interface MotionPoint {
  readonly x: number;
  readonly y: number;
}

export interface MotionPhase {
  readonly id: 'setup' | 'move' | 'turn' | 'return' | 'finish';
  readonly label: string;
}

export interface MotionLegPose {
  readonly hip: MotionPoint;
  readonly knee: MotionPoint;
  readonly ankle: MotionPoint;
  readonly heel: MotionPoint;
  readonly toe: MotionPoint;
  readonly active: boolean;
}

export const MODEL_VERSION = '0.1.0-draft';
export const VIEW = Object.freeze({
  id: 'left-lateral',
  nearAnatomicalSide: 'left',
  mirrored: false,
} as const);
export const SEGMENT_LENGTHS = Object.freeze({ thigh: 86, shin: 88, torso: 108 });

export interface MotionPose {
  readonly joints: {
    readonly head: MotionPoint;
    readonly neck: MotionPoint;
    readonly shoulder: MotionPoint;
    readonly hip: MotionPoint;
  };
  readonly legs: Readonly<Record<AnatomicalSide, MotionLegPose>>;
  readonly q: number;
  readonly progress: number;
  readonly phase: MotionPhase;
  readonly view: typeof VIEW;
}

/** Finite progress is clamped; invalid input cannot produce a nonfinite pose. */
export function clampMotionProgress(progress: number): number {
  if (!Number.isFinite(progress)) throw new RangeError('Motion progress must be finite');
  return Math.min(1, Math.max(0, progress));
}

function smooth(progress: number): number {
  const t = clampMotionProgress(progress);
  return t * t * (3 - 2 * t);
}

export function getMotionEnvelope(progress: number): number {
  const p = clampMotionProgress(progress);
  if (p <= 0.15) return 0;
  if (p < 0.48) return smooth((p - 0.15) / 0.33);
  if (p <= 0.58) return 1;
  if (p < 0.92) return 1 - smooth((p - 0.58) / 0.34);
  return 0;
}

export function getMotionPhase(progress: number): MotionPhase {
  const p = clampMotionProgress(progress);
  if (p < 0.15) return { id: 'setup', label: '시작 자세' };
  if (p < 0.48) return { id: 'move', label: '움직임' };
  if (p < 0.58) return { id: 'turn', label: '전환 자세' };
  if (p < 0.92) return { id: 'return', label: '돌아오기' };
  return { id: 'finish', label: '끝 자세' };
}

/** Original upper-branch circle intersection; reject unreachable targets first. */
export function solveMotionKnee(
  hip: MotionPoint,
  ankle: MotionPoint,
  thighLength: number = SEGMENT_LENGTHS.thigh,
  shinLength: number = SEGMENT_LENGTHS.shin,
): MotionPoint {
  if (
    !hip ||
    !ankle ||
    !Number.isFinite(hip.x) ||
    !Number.isFinite(hip.y) ||
    !Number.isFinite(ankle.x) ||
    !Number.isFinite(ankle.y) ||
    !Number.isFinite(thighLength) ||
    !Number.isFinite(shinLength) ||
    thighLength <= 0 ||
    shinLength <= 0
  ) {
    throw new RangeError('Unreachable leg target');
  }
  const dx = ankle.x - hip.x;
  const dy = ankle.y - hip.y;
  const distance = Math.hypot(dx, dy);
  if (
    !distance ||
    !Number.isFinite(distance) ||
    distance > thighLength + shinLength + 1e-8 ||
    distance < Math.abs(thighLength - shinLength) - 1e-8
  ) {
    throw new RangeError('Unreachable leg target');
  }
  const along =
    (thighLength * thighLength - shinLength * shinLength + distance * distance) /
    (2 * distance);
  const height = Math.sqrt(Math.max(0, thighLength * thighLength - along * along));
  return {
    x: hip.x + (dx * along) / distance + (dy * height) / distance,
    y: hip.y + (dy * along) / distance - (dx * height) / distance,
  };
}

export function getMotionPose(
  prototypeId: MotionPrototypeId,
  progress: number,
  activeSide: AnatomicalSide = 'left',
): MotionPose {
  if (prototypeId !== 'bridge-pattern' && prototypeId !== 'heel-slide')
    throw new RangeError('Unknown clip');
  if (activeSide !== 'left' && activeSide !== 'right')
    throw new RangeError('Unknown anatomical side');

  const p = clampMotionProgress(progress);
  const shoulder = { x: 166, y: 198 };
  const alignedPeakKnee = solveMotionKnee(
    shoulder,
    { x: 402, y: 205 },
    SEGMENT_LENGTHS.torso + SEGMENT_LENGTHS.thigh,
    SEGMENT_LENGTHS.shin,
  );
  const peakAngle = Math.atan2(
    alignedPeakKnee.y - shoulder.y,
    alignedPeakKnee.x - shoulder.x,
  );
  const q = getMotionEnvelope(p);
  const angle = prototypeId === 'bridge-pattern' ? q * peakAngle : 0;
  const hip = {
    x: shoulder.x + SEGMENT_LENGTHS.torso * Math.cos(angle),
    y: shoulder.y + SEGMENT_LENGTHS.torso * Math.sin(angle),
  };
  const leg = (side: AnatomicalSide): MotionLegPose => {
    const sideHip = { x: hip.x, y: hip.y + (side === 'right' ? -7 : 0) };
    const extension = prototypeId === 'heel-slide' && side === activeSide ? 40 * q : 0;
    const ankle = { x: 402 + extension + (side === 'right' ? -6 : 0), y: 205 };
    return {
      hip: sideHip,
      knee: solveMotionKnee(sideHip, ankle),
      ankle,
      heel: { x: ankle.x - 6, y: 210 },
      toe: { x: ankle.x + 23, y: 210 },
      active: prototypeId === 'bridge-pattern' || side === activeSide,
    };
  };

  return {
    joints: { head: { x: 127, y: 196 }, neck: { x: 148, y: 198 }, shoulder, hip },
    legs: { right: leg('right'), left: leg('left') },
    q,
    progress: p,
    phase: getMotionPhase(p),
    view: VIEW,
  };
}
