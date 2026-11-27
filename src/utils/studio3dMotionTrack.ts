import {
  PHASE_3D_RAW_T,
  sampleUniversal3DExerciseRig,
  type Universal3DPoseRig,
  type Vec3,
} from '../data/universal3dExerciseRigs';
import type { PilatesExercise } from '../types/pilates';

const add = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const scale = (a: Vec3, n: number): Vec3 => [a[0] * n, a[1] * n, a[2] * n];
const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: Vec3, b: Vec3): Vec3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
const mix = (a: Vec3, b: Vec3, u: number): Vec3 => add(a, scale(sub(b, a), u));
const unit = (p: Vec3): Vec3 => {
  const n = Math.hypot(...p);
  return n > 1e-6 ? scale(p, 1 / n) : [0, 0, 1];
};

function perpendicular(p: Vec3, axis: Vec3): Vec3 {
  const projected = sub(p, scale(axis, dot(p, axis)));
  if (Math.hypot(...projected) > 1e-6) return unit(projected);
  return unit(cross(axis, Math.abs(axis[1]) < 0.9 ? [0, 1, 0] : [0, 0, 1]));
}

function rightVector(rig: Universal3DPoseRig): Vec3 {
  const up = unit(sub(rig.chest, rig.pelvis));
  return unit(cross(up, perpendicular(rig.antHint, up)));
}

const limbs = [
  ['lHand', 'lElbowPole', 'chest', -0.15],
  ['rHand', 'rElbowPole', 'chest', 0.15],
  ['lFoot', 'lKneePole', 'pelvis', -0.086],
  ['rFoot', 'rKneePole', 'pelvis', 0.086],
] as const;
type Limb = (typeof limbs)[number];
type Pole = Limb[1];
type BendFrame = { axis: Vec3; bend: Vec3; distance: number };

function jointRoot(rig: Universal3DPoseRig, right: Vec3, limb: Limb): Vec3 {
  const parent = limb[2];
  const axis = parent === 'pelvis' ? (rig.pelvisRight ?? right) : right;
  return add(rig[parent], scale(axis, limb[3]));
}

type Knot = { rig: Universal3DPoseRig; bends: Record<Pole, BendFrame> };
const tracks = new WeakMap<PilatesExercise, Map<number, Knot>>();

function knotAt(exercise: PilatesExercise, progress: number): Knot {
  let track = tracks.get(exercise);
  if (!track) {
    track = new Map();
    tracks.set(exercise, track);
  }
  const existing = track.get(progress);
  if (existing) return existing;
  const rig = sampleUniversal3DExerciseRig(exercise, progress);
  const right = rightVector(rig);
  const bends = {} as Record<Pole, BendFrame>;
  for (const limb of limbs) {
    const offset = sub(rig[limb[0]], jointRoot(rig, right, limb));
    const axis = unit(offset);
    bends[limb[1]] = {
      axis,
      bend: perpendicular(rig[limb[1]], axis),
      distance: Math.hypot(...offset),
    };
  }
  const knot = { rig, bends };
  track.set(progress, knot);
  return knot;
}

// Parallel transport a bend vector between limb axes by their shortest rotation.
// This keeps a folded elbow from changing sides when its raw pole crosses the arm.
function transport({ axis, bend }: BendFrame, nextAxis: Vec3): Vec3 {
  const v = cross(axis, nextAxis);
  const cos = dot(axis, nextAxis);
  if (cos < -0.99999) return perpendicular(bend, nextAxis);
  const first = cross(v, bend);
  return unit(add(add(bend, first), scale(cross(v, first), 1 / (1 + cos))));
}

function interpolateBend(first: BendFrame, last: BendFrame, axis: Vec3, t: number): Vec3 {
  const next = transport(last, first.axis);
  const angle = Math.atan2(dot(first.axis, cross(first.bend, next)), dot(first.bend, next));
  const rotation = angle * t;
  const bend = add(
    scale(first.bend, Math.cos(rotation)),
    scale(cross(first.axis, first.bend), Math.sin(rotation)),
  );
  return transport({ ...first, bend }, axis);
}

// The three cached Blender poses stay exact. Uniform spacing on either side of
// the return key avoids packing two direction changes into nearly the same instant.
function interval(t: number, beforeReturn: number, afterReturn: number) {
  const low = t < PHASE_3D_RAW_T.end ? 0 : PHASE_3D_RAW_T.end;
  const high = t < PHASE_3D_RAW_T.end ? PHASE_3D_RAW_T.end : 1;
  const count = t < PHASE_3D_RAW_T.end ? beforeReturn : afterReturn;
  const index = Math.min(count - 1, Math.floor(((t - low) / (high - low)) * count));
  const start = index === 0 ? low : low + ((high - low) * index) / count;
  const end = index + 1 === count ? high : low + ((high - low) * (index + 1)) / count;
  return {
    start,
    end,
    index: low === 0 ? index : beforeReturn + index,
    u: (t - start) / (end - start),
  };
}

function arcDirection(first: BendFrame, last: BendFrame, t: number): Vec3 {
  const cos = Math.max(-1, Math.min(1, dot(first.axis, last.axis)));
  const tangent = sub(last.axis, scale(first.axis, cos));
  const sin = Math.hypot(...tangent);
  const direction = sin > 1e-6 ? scale(tangent, 1 / sin) : first.bend;
  const angle = Math.atan2(sin, cos) * t;
  return add(scale(first.axis, Math.cos(angle)), scale(direction, Math.sin(angle)));
}

const bodyLandmarks = [
  'pelvis',
  'spineMid',
  'chest',
  'antHint',
  'lFoot',
  'rFoot',
  'lHand',
  'rHand',
] as const;

// The time spacing changes at the cached return pose. Construct one shared
// tangent at each landmark, using its real time offset on both sides.
const beforeReturn = 10;
const afterReturn = 14;
const bodyKnots = Array.from({ length: beforeReturn + afterReturn + 1 }, (_, index) =>
  index < beforeReturn
    ? (PHASE_3D_RAW_T.end * index) / beforeReturn
    : PHASE_3D_RAW_T.end + ((1 - PHASE_3D_RAW_T.end) * (index - beforeReturn)) / afterReturn,
);

function monotoneSlope(left: number, right: number): number {
  return left * right > 0 ? (2 * left * right) / (left + right) : 0;
}

function interpolateLandmark(
  before: Vec3,
  start: Vec3,
  end: Vec3,
  after: Vec3,
  priorScale: number,
  nextScale: number,
  u: number,
): Vec3 {
  // Cubic Hermite with slope-limited tangents keeps a planted hand stationary
  // and prevents a curved ankle path from overshooting the authored range.
  const ease = u * u * (3 - 2 * u);
  const outWeight = u * (1 - u) ** 2;
  const inWeight = -u * u * (1 - u);
  const coordinate = (i: number) => {
    const delta = end[i] - start[i];
    if (!delta) return start[i];
    const previous = priorScale ? (start[i] - before[i]) * priorScale : delta;
    const next = nextScale ? (after[i] - end[i]) * nextScale : delta;
    return (
      start[i] +
      delta * ease +
      monotoneSlope(previous, delta) * outWeight +
      monotoneSlope(delta, next) * inWeight
    );
  };
  return [coordinate(0), coordinate(1), coordinate(2)];
}

/** Sample the same deterministic limb bend during playback, reverse playback, and arbitrary seeks. */
export function sampleStudio3DMotionRig(
  exercise: PilatesExercise,
  rawT: number,
): Universal3DPoseRig {
  const t = Math.max(0, Math.min(1, Number.isFinite(rawT) ? rawT : 0));
  if (t === 0 || t === PHASE_3D_RAW_T.end || t === 1) return knotAt(exercise, t).rig;
  const body = interval(t, beforeReturn, afterReturn);
  const startTime = bodyKnots[body.index];
  const endTime = bodyKnots[body.index + 1];
  const prevTime = bodyKnots[Math.max(0, body.index - 1)];
  const nextTime = bodyKnots[Math.min(bodyKnots.length - 1, body.index + 2)];
  const duration = endTime - startTime;
  const priorScale = startTime > prevTime ? duration / (startTime - prevTime) : 0;
  const nextScale = nextTime > endTime ? duration / (nextTime - endTime) : 0;
  const previous = knotAt(exercise, prevTime).rig;
  const a = knotAt(exercise, startTime).rig;
  const b = knotAt(exercise, endTime).rig;
  const next = knotAt(exercise, nextTime).rig;
  const result = { ...sampleUniversal3DExerciseRig(exercise, t) };
  for (const key of bodyLandmarks) {
    result[key] = interpolateLandmark(
      previous[key],
      a[key],
      b[key],
      next[key],
      priorScale,
      nextScale,
      body.u,
    );
  }
  const right = rightVector(result);
  const bend = interval(t, 5, 7);
  const first = knotAt(exercise, bend.start);
  const last = knotAt(exercise, bend.end);
  for (const limb of limbs) {
    const [target, pole] = limb;
    const from = first.bends[pole];
    const to = last.bends[pole];
    const root = jointRoot(result, right, limb);
    const offset = sub(result[target], root);
    // A straight chord can pass through the shoulder in a deeply folded pose.
    // Follow the direction of the reach on the sphere near the joint instead.
    const distance = Math.hypot(...offset);
    const nearJoint = Math.max(0, Math.min(1, (0.18 - distance) / 0.08));
    let axis = unit(offset);
    const planted = first.rig[target].every((value, i) => value === last.rig[target][i]);
    if (nearJoint > 0 && !planted) {
      const curved = scale(
        arcDirection(from, to, bend.u),
        from.distance + (to.distance - from.distance) * bend.u,
      );
      const corrected = mix(offset, curved, nearJoint * nearJoint * (3 - 2 * nearJoint));
      result[target] = add(root, corrected);
      axis = unit(corrected);
    }
    result[pole] = interpolateBend(from, to, axis, bend.u);
  }
  return result;
}
