import type { Point2D, RigJointMap } from '../data/movementVisualRigCatalog';

export interface RigFootGeometry {
  readonly ankle: Point2D;
  readonly heel: Point2D;
  readonly toe: Point2D;
}

const difference = (a: Point2D, b: Point2D): Point2D => ({ x: a.x - b.x, y: a.y - b.y });
const translated = (origin: Point2D, delta: Point2D): Point2D => ({
  x: origin.x + delta.x,
  y: origin.y + delta.y,
});
const offset = (point: Point2D, x: number, y: number): Point2D => translated(point, { x, y });

function rotationBetween(from: Point2D, to: Point2D): number {
  if (Math.hypot(from.x, from.y) < 0.001 || Math.hypot(to.x, to.y) < 0.001) return 0;
  return Math.atan2(to.y, to.x) - Math.atan2(from.y, from.x);
}

function rotate(point: Point2D, angle: number): Point2D {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return { x: point.x * cos - point.y * sin, y: point.x * sin + point.y * cos };
}

/** Complete one foot in its own ankle-local frame, before mirroring the image.
 * A missing far toe must never borrow the absolute position of the moving near toe.
 * Explicit contact points win; setup geometry provides a stable foot when only
 * the other leg moves during an otherwise anchored phase.
 */
export function resolveRigFoot(
  joints: RigJointMap,
  side: 'near' | 'far',
  referenceJoints?: RigJointMap,
): RigFootGeometry {
  if (side === 'near') return { ankle: joints.ankle, heel: joints.heel, toe: joints.toe };
  const ankle = joints.farAnkle ?? offset(joints.ankle, -4, -3);
  const knee = joints.farKnee ?? offset(joints.knee, -4, -4);
  const reference = referenceJoints ?? joints;
  const referenceHasFarFoot = Boolean(reference.farAnkle && reference.farToe);
  const referenceAnkle = referenceHasFarFoot ? reference.farAnkle! : reference.ankle;
  const referenceToe = referenceHasFarFoot ? reference.farToe! : reference.toe;
  const referenceKnee = referenceHasFarFoot
    ? (reference.farKnee ?? offset(reference.knee, -4, -4))
    : reference.knee;
  const referenceHeel = referenceHasFarFoot
    ? (reference.farHeel ??
      translated(
        referenceAnkle,
        rotate(
          difference(reference.heel, reference.ankle),
          rotationBetween(
            difference(reference.toe, reference.ankle),
            difference(referenceToe, referenceAnkle),
          ),
        ),
      ))
    : reference.heel;
  const toeVector = difference(referenceToe, referenceAnkle);
  const angle = joints.farToe
    ? rotationBetween(toeVector, difference(joints.farToe, ankle))
    : rotationBetween(difference(referenceAnkle, referenceKnee), difference(ankle, knee));
  return {
    ankle,
    heel:
      joints.farHeel ?? translated(ankle, rotate(difference(referenceHeel, referenceAnkle), angle)),
    toe: joints.farToe ?? translated(ankle, rotate(toeVector, angle)),
  };
}

/** Keep a missing far palm attached to its own wrist and forearm. */
export function resolveRigHand(joints: RigJointMap, side: 'near' | 'far'): Point2D {
  if (side === 'near') return joints.hand;
  if (joints.farHand) return joints.farHand;
  const wrist = joints.farWrist ?? offset(joints.wrist, -4, -3);
  const elbow = joints.farElbow ?? offset(joints.elbow, -4, -3);
  const angle = rotationBetween(difference(joints.wrist, joints.elbow), difference(wrist, elbow));
  return translated(wrist, rotate(difference(joints.hand, joints.wrist), angle));
}

/** Transport the setup face direction with the neck/head axis. Limb movement must
 * never turn the face over when a wrist or toe crosses an arbitrary threshold. */
export function resolveRigHeadFrame(joints: RigJointMap, referenceJoints: RigJointMap = joints): {
  headAxis: Point2D; faceAxis: Point2D;
} {
  const normalize = (p: Point2D, fallback: Point2D): Point2D => {
    const length = Math.hypot(p.x, p.y);
    return length > 0.001 ? { x: p.x / length, y: p.y / length } : fallback;
  };
  const setupAxis = normalize(difference(referenceJoints.head, referenceJoints.neck), { x: 0, y: -1 });
  const headAxis = normalize(difference(joints.head, joints.neck), setupAxis);
  const r = referenceJoints;
  const kneeling = Math.abs(r.knee.y - r.ankle.y) < 9 && r.pelvis.y < r.knee.y - 18;
  const hint = Math.abs(setupAxis.y) >= Math.abs(setupAxis.x)
    ? { x: (kneeling ? r.knee.x - r.ankle.x : 0) || r.toe.x - r.heel.x || r.hand.x - r.shoulder.x || 1, y: 0 }
    : { x: 0, y: r.wrist.y > r.shoulder.y + 8 || r.toe.y > r.heel.y + 2 ? 1 : -1 };
  const sign = -setupAxis.y * hint.x + setupAxis.x * hint.y >= 0 ? 1 : -1;
  return { headAxis, faceAxis: { x: -headAxis.y * sign, y: headAxis.x * sign } };
}

/** Shared mechanical contact for the chair pedal and any foot anchored to it. */
export function resolveChairPedalTip(pedalAngleDeg: number): Point2D {
  const angle = ((40 - pedalAngleDeg * 1.3) * Math.PI) / 180;
  return { x: 168 + Math.cos(angle) * 50, y: 164 - Math.sin(angle) * 50 };
}

/** Complete both limb chains before sampling or drawing a pose. Partial authored
 * far-side coordinates are useful (for example a planted far wrist), so retain
 * every one of them even when its parent joint was not separately authored.
 * All fallback feet use the same setup reference as the static renderer.
 */
export function normalizeRigJointMap(
  joints: RigJointMap,
  referenceJoints: RigJointMap = joints,
): RigJointMap {
  const complete: RigJointMap = {
    ...joints,
    farShoulder: joints.farShoulder ?? offset(joints.shoulder, -3, -3),
    farElbow: joints.farElbow ?? offset(joints.elbow, -4, -3),
    farWrist: joints.farWrist ?? offset(joints.wrist, -4, -3),
    farHip: joints.farHip ?? offset(joints.hip, -3, -3),
    farKnee: joints.farKnee ?? offset(joints.knee, -4, -4),
    farAnkle: joints.farAnkle ?? offset(joints.ankle, -4, -3),
  };
  const foot = resolveRigFoot(complete, 'far', referenceJoints);
  return {
    ...complete,
    farAnkle: foot.ankle,
    farHeel: foot.heel,
    farToe: foot.toe,
    farHand: resolveRigHand(complete, 'far'),
  };
}
