import {
  APPARATUS_LABELS,
  CANONICAL_BLOCKS,
  INITIAL_EXERCISES,
  POSITION_LABELS,
  SPINAL_PLANE_LABELS,
} from '../pilatesCatalog';
import {
  buildMovementVisualAssetForExercise,
  getMovementVisualAsset,
  hasCatalogMotionIdentityMismatch,
  type CatalogMovementVisualAsset,
  type JointAlignmentGuide,
  type MovementDirectionVector,
  type PhasePoseSpec,
  type Point2D,
  type RigJointMap,
  type VisualPhaseId,
} from '../movementVisualRigCatalog';
import { getVisualSourceComparison } from '../movementVisualSourceAudit';
import type { PilatesExercise } from '../../types/pilates';
import { normalizeRigJointMap, resolveChairPedalTip } from '../../utils/motionRigGeometry';
import { CADILLAC_CHAIR_BARREL_MOTION_OVERRIDES } from './cadillacChairBarrelCatalogMotions';
import { MAT_CATALOG_MOTION_OVERRIDES } from './matCatalogMotions';
import { REFORMER_CATALOG_MOTION_OVERRIDES } from './reformerCatalogMotions';
import type {
  CatalogContinuousMotionAsset,
  CatalogContinuousPoseSnapshot,
  CatalogMotionOverrideNote,
  CatalogMotionPhaseId,
  CatalogMotionPhaseSpec,
  CatalogMotionKeyframe,
} from './types';

export * from './types';

const ALL_MOTION_OVERRIDES: Readonly<Record<string, CatalogMotionOverrideNote>> = Object.freeze({
  ...MAT_CATALOG_MOTION_OVERRIDES,
  ...REFORMER_CATALOG_MOTION_OVERRIDES,
  ...CADILLAC_CHAIR_BARREL_MOTION_OVERRIDES,
});

function clampProgress(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

/** C2-continuous quintic easing: zero velocity and zero acceleration jump at phase boundaries. */
function smootherstep(t: number): number {
  const c = clamp01(t);
  return c * c * c * (c * (c * 6 - 15) + 10);
}

function r1(value: number): number {
  return Math.round(value * 10) / 10;
}

function lerpRaw(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function lerpNum(a: number, b: number, t: number): number {
  return r1(a + (b - a) * t);
}

function lerpPointRaw(a: Point2D, b: Point2D, t: number): Point2D {
  return {
    x: lerpRaw(a.x, b.x, t),
    y: lerpRaw(a.y, b.y, t),
  };
}

function lerpPoint(a: Point2D | undefined, b: Point2D | undefined, t: number): Point2D | undefined {
  if (!a && !b) return undefined;
  if (!a) return b;
  if (!b) return a;
  return {
    x: lerpNum(a.x, b.x, t),
    y: lerpNum(a.y, b.y, t),
  };
}

/** Shortest-arc angular interpolation in radians (-PI..PI delta). */
function lerpAngleRad(a: number, b: number, t: number): number {
  let delta = ((b - a + Math.PI) % (Math.PI * 2)) - Math.PI;
  if (delta < -Math.PI) delta += Math.PI * 2;
  return a + delta * t;
}

function polarSegmentInterpolate(
  parentNow: Point2D,
  fromParent: Point2D,
  fromChild: Point2D,
  toParent: Point2D,
  toChild: Point2D,
  u: number,
): Point2D {
  const dx0 = fromChild.x - fromParent.x;
  const dy0 = fromChild.y - fromParent.y;
  const dx1 = toChild.x - toParent.x;
  const dy1 = toChild.y - toParent.y;
  const len0 = Math.hypot(dx0, dy0);
  const len1 = Math.hypot(dx1, dy1);
  if (len0 < 0.5 || len1 < 0.5) {
    return lerpPointRaw(
      { x: parentNow.x + dx0, y: parentNow.y + dy0 },
      { x: parentNow.x + dx1, y: parentNow.y + dy1 },
      u,
    );
  }
  const ang0 = Math.atan2(dy0, dx0);
  const ang1 = Math.atan2(dy1, dx1);
  const ang = lerpAngleRad(ang0, ang1, u);
  const len = lerpRaw(len0, len1, u);
  return {
    x: parentNow.x + Math.cos(ang) * len,
    y: parentNow.y + Math.sin(ang) * len,
  };
}

function solveTwoBoneMidJoint(
  rootNow: Point2D,
  distalNow: Point2D,
  fromRoot: Point2D,
  fromMid: Point2D,
  fromDistal: Point2D,
  toRoot: Point2D,
  toMid: Point2D,
  toDistal: Point2D,
  u: number,
): Point2D {
  const l1From = Math.hypot(fromMid.x - fromRoot.x, fromMid.y - fromRoot.y);
  const l2From = Math.hypot(fromDistal.x - fromMid.x, fromDistal.y - fromMid.y);
  const l1To = Math.hypot(toMid.x - toRoot.x, toMid.y - toRoot.y);
  const l2To = Math.hypot(toDistal.x - toMid.x, toDistal.y - toMid.y);

  const l1 = lerpRaw(l1From, l1To, u);
  const l2 = lerpRaw(l2From, l2To, u);
  const dx = distalNow.x - rootNow.x;
  const dy = distalNow.y - rootNow.y;
  const d = Math.hypot(dx, dy);

  const fallback = lerpPointRaw(fromMid, toMid, u);
  if (d < 1 || l1 < 1 || l2 < 1) {
    return fallback;
  }

  // Determine the bend side of the authored 2D projection.
  const crossFrom =
    (fromDistal.x - fromRoot.x) * (fromMid.y - fromRoot.y) -
    (fromDistal.y - fromRoot.y) * (fromMid.x - fromRoot.x);
  const crossTo =
    (toDistal.x - toRoot.x) * (toMid.y - toRoot.y) -
    (toDistal.y - toRoot.y) * (toMid.x - toRoot.x);
  const crossBlend = lerpRaw(crossFrom, crossTo, u);
  // Some poses cross projection sides, such as a clam opening toward the viewer.
  // Switching the IK branch while its height is nonzero teleports the knee or
  // elbow. Let the projected bend pass continuously through zero instead. In
  // this case projected segment lengths can shorten; they are not 3D anatomy.
  const bendScale = crossFrom * crossTo < 0
    ? lerpRaw(Math.sign(crossFrom), Math.sign(crossTo), u)
    : crossBlend >= 0 ? 1 : -1;

  // Do not force a 0.01-unit bend into a straight authored endpoint: that
  // becomes a visible knee jump when a hold changes to an interpolated pose.
  const clampedD = Math.max(1e-9, Math.abs(l1 - l2), Math.min(l1 + l2, d));
  const a = (l1 * l1 - l2 * l2 + clampedD * clampedD) / (2 * clampedD);
  const hSq = Math.max(0, l1 * l1 - a * a);
  const h = Math.sqrt(hSq);

  const ux = dx / d;
  const uy = dy / d;
  const nx = -uy * bendScale;
  const ny = ux * bendScale;

  return {
    x: rootNow.x + ux * a + nx * h,
    y: rootNow.y + uy * a + ny * h,
  };
}

function interpolateTwoSegmentLimb(
  rootNow: Point2D,
  fromRoot: Point2D,
  fromMid: Point2D,
  fromDistal: Point2D,
  toRoot: Point2D,
  toMid: Point2D,
  toDistal: Point2D,
  u: number,
): { mid: Point2D; distal: Point2D } {
  const distalExcursion = Math.hypot(toDistal.x - fromDistal.x, toDistal.y - fromDistal.y);
  // Keep a stationary distal contact while solving the projected elbow/knee.
  if (distalExcursion < 6) {
    const distal = lerpPointRaw(fromDistal, toDistal, u);
    const mid = solveTwoBoneMidJoint(
      rootNow,
      distal,
      fromRoot,
      fromMid,
      fromDistal,
      toRoot,
      toMid,
      toDistal,
      u,
    );
    return { mid, distal };
  }

  // Open-chain swing follows an arc with interpolated authored segment lengths.
  const mid = polarSegmentInterpolate(rootNow, fromRoot, fromMid, toRoot, toMid, u);
  const distal = polarSegmentInterpolate(mid, fromMid, fromDistal, toMid, toDistal, u);
  return { mid, distal };
}

const SPINE_CHAIN: readonly ('pelvis' | 'lumbar' | 'thoracic' | 'neck' | 'head')[] = [
  'pelvis',
  'lumbar',
  'thoracic',
  'neck',
  'head',
];

function computeSpinalLocalT(
  rawT: number,
  spineIndex: number,
  archetypeId: string,
  direction: 'move' | 'return',
): number {
  if (rawT <= 0) return 0;
  if (rawT >= 1) return 1;

  const isBottomUpPeel = /bridge|pelvic/i.test(archetypeId);
  const isTopDownWave = /roll|chest-lift|swan|extension|mermaid|side-bend|cat|teaser/i.test(
    archetypeId,
  );

  if (!isBottomUpPeel && !isTopDownWave) {
    return smootherstep(rawT);
  }

  // Normalized index 0 (pelvis) .. 1 (head)
  const normIdx = spineIndex / (SPINE_CHAIN.length - 1);
  // Bottom-up peel: pelvis leads on 'move', thoracic/lumbar unroll down on 'return'.
  // Top-down wave: head/thoracic lead on 'move', pelvis/lumbar lead on 'return'.
  const peelOrder =
    (isBottomUpPeel && direction === 'move') || (isTopDownWave && direction === 'return')
      ? normIdx
      : 1 - normIdx;

  const staggerSpan = 0.18;
  const shifted = clamp01((rawT * (1 + staggerSpan)) - peelOrder * staggerSpan);
  return smootherstep(shifted);
}

/**
 * Hierarchical interpolation of an authored 2D rig:
 * 1. Sequential spinal wave articulation across pelvis -> lumbar -> thoracic -> neck -> head
 * 2. Two-bone IK for stationary distal contacts, with continuous projected bends
 * 3. Polar arcs for free limbs; this is not a source-traced or anatomical model
 */
function interpolateKinematicRigArc(
  from: RigJointMap,
  to: RigJointMap,
  rawT: number,
  archetypeId: string,
  direction: 'move' | 'return',
): RigJointMap {
  if (rawT <= 0) return from;
  if (rawT >= 1) return to;

  const u = smootherstep(rawT);

  // 1. Sequential Spinal Chain
  const spineRaw: Record<'pelvis' | 'lumbar' | 'thoracic' | 'neck' | 'head', Point2D> = {
    pelvis: from.pelvis,
    lumbar: from.lumbar,
    thoracic: from.thoracic,
    neck: from.neck,
    head: from.head,
  };
  SPINE_CHAIN.forEach((key, idx) => {
    const localU = computeSpinalLocalT(rawT, idx, archetypeId, direction);
    spineRaw[key] = lerpPointRaw(from[key], to[key], localU);
  });

  // 2. Shoulder & Hip Girdles (track their parent spinal segments)
  const thoracicU = computeSpinalLocalT(rawT, 2, archetypeId, direction);
  const pelvisU = computeSpinalLocalT(rawT, 0, archetypeId, direction);

  const shoulderRaw = lerpPointRaw(from.shoulder, to.shoulder, thoracicU);
  const hipRaw = lerpPointRaw(from.hip, to.hip, pelvisU);

  // 3. Near Upper Limb (shoulder -> elbow -> wrist -> hand)
  const nearArm = interpolateTwoSegmentLimb(
    shoulderRaw,
    from.shoulder,
    from.elbow,
    from.wrist,
    to.shoulder,
    to.elbow,
    to.wrist,
    u,
  );
  const handExcursion = Math.hypot(to.hand.x - from.hand.x, to.hand.y - from.hand.y);
  const handRaw =
    handExcursion < 6
      ? lerpPointRaw(from.hand, to.hand, u)
      : polarSegmentInterpolate(nearArm.distal, from.wrist, from.hand, to.wrist, to.hand, u);

  // 4. Near Lower Limb (hip -> knee -> ankle -> heel / toe)
  const nearLeg = interpolateTwoSegmentLimb(
    hipRaw,
    from.hip,
    from.knee,
    from.ankle,
    to.hip,
    to.knee,
    to.ankle,
    u,
  );
  const heelExcursion = Math.hypot(to.heel.x - from.heel.x, to.heel.y - from.heel.y);
  const toeExcursion = Math.hypot(to.toe.x - from.toe.x, to.toe.y - from.toe.y);
  const heelRaw =
    heelExcursion < 6
      ? lerpPointRaw(from.heel, to.heel, u)
      : polarSegmentInterpolate(nearLeg.distal, from.ankle, from.heel, to.ankle, to.heel, u);
  const toeRaw =
    toeExcursion < 6
      ? lerpPointRaw(from.toe, to.toe, u)
      : polarSegmentInterpolate(nearLeg.distal, from.ankle, from.toe, to.ankle, to.toe, u);

  const result: Record<string, Point2D | undefined> = {
    pelvis: { x: r1(spineRaw.pelvis.x), y: r1(spineRaw.pelvis.y) },
    lumbar: { x: r1(spineRaw.lumbar.x), y: r1(spineRaw.lumbar.y) },
    thoracic: { x: r1(spineRaw.thoracic.x), y: r1(spineRaw.thoracic.y) },
    neck: { x: r1(spineRaw.neck.x), y: r1(spineRaw.neck.y) },
    head: { x: r1(spineRaw.head.x), y: r1(spineRaw.head.y) },
    shoulder: { x: r1(shoulderRaw.x), y: r1(shoulderRaw.y) },
    elbow: { x: r1(nearArm.mid.x), y: r1(nearArm.mid.y) },
    wrist: { x: r1(nearArm.distal.x), y: r1(nearArm.distal.y) },
    hand: { x: r1(handRaw.x), y: r1(handRaw.y) },
    hip: { x: r1(hipRaw.x), y: r1(hipRaw.y) },
    knee: { x: r1(nearLeg.mid.x), y: r1(nearLeg.mid.y) },
    ankle: { x: r1(nearLeg.distal.x), y: r1(nearLeg.distal.y) },
    heel: { x: r1(heelRaw.x), y: r1(heelRaw.y) },
    toe: { x: r1(toeRaw.x), y: r1(toeRaw.y) },
  };

  // 5. Contralateral / Far Upper Limb (optional)
  if (from.farShoulder || to.farShoulder) {
    const fSh0 = from.farShoulder ?? to.farShoulder!;
    const fSh1 = to.farShoulder ?? from.farShoulder!;
    const farShRaw = lerpPointRaw(fSh0, fSh1, thoracicU);
    result.farShoulder = { x: r1(farShRaw.x), y: r1(farShRaw.y) };

    if ((from.farElbow || to.farElbow) && (from.farWrist || to.farWrist)) {
      const fEl0 = from.farElbow ?? to.farElbow!;
      const fEl1 = to.farElbow ?? from.farElbow!;
      const fWr0 = from.farWrist ?? to.farWrist!;
      const fWr1 = to.farWrist ?? from.farWrist!;
      const farArm = interpolateTwoSegmentLimb(farShRaw, fSh0, fEl0, fWr0, fSh1, fEl1, fWr1, u);
      result.farElbow = { x: r1(farArm.mid.x), y: r1(farArm.mid.y) };
      result.farWrist = { x: r1(farArm.distal.x), y: r1(farArm.distal.y) };
      if (from.farHand && to.farHand) {
        const handTravel = Math.hypot(to.farHand.x - from.farHand.x, to.farHand.y - from.farHand.y);
        result.farHand = handTravel < 6
          ? lerpPointRaw(from.farHand, to.farHand, u)
          : polarSegmentInterpolate(farArm.distal, fWr0, from.farHand, fWr1, to.farHand, u);
      }
    } else {
      result.farElbow = lerpPoint(from.farElbow, to.farElbow, u);
      result.farWrist = lerpPoint(from.farWrist, to.farWrist, u);
    }
  }

  // 6. Contralateral / Far Lower Limb (optional)
  if (from.farHip || to.farHip) {
    const fHp0 = from.farHip ?? to.farHip!;
    const fHp1 = to.farHip ?? from.farHip!;
    const farHpRaw = lerpPointRaw(fHp0, fHp1, pelvisU);
    result.farHip = { x: r1(farHpRaw.x), y: r1(farHpRaw.y) };

    if ((from.farKnee || to.farKnee) && (from.farAnkle || to.farAnkle)) {
      const fKn0 = from.farKnee ?? to.farKnee!;
      const fKn1 = to.farKnee ?? from.farKnee!;
      const fAn0 = from.farAnkle ?? to.farAnkle!;
      const fAn1 = to.farAnkle ?? from.farAnkle!;
      const farLeg = interpolateTwoSegmentLimb(farHpRaw, fHp0, fKn0, fAn0, fHp1, fKn1, fAn1, u);
      result.farKnee = { x: r1(farLeg.mid.x), y: r1(farLeg.mid.y) };
      result.farAnkle = { x: r1(farLeg.distal.x), y: r1(farLeg.distal.y) };

      if (from.farHeel && to.farHeel) {
        const heelTravel = Math.hypot(to.farHeel.x - from.farHeel.x, to.farHeel.y - from.farHeel.y);
        result.farHeel = heelTravel < 6
          ? lerpPointRaw(from.farHeel, to.farHeel, u)
          : polarSegmentInterpolate(farLeg.distal, fAn0, from.farHeel, fAn1, to.farHeel, u);
      }

      if (from.farToe || to.farToe) {
        const fTo0 = from.farToe ?? to.farToe!;
        const fTo1 = to.farToe ?? from.farToe!;
        const fToeExc = Math.hypot(fTo1.x - fTo0.x, fTo1.y - fTo0.y);
        const farToeRaw =
          fToeExc < 6
            ? lerpPointRaw(fTo0, fTo1, u)
            : polarSegmentInterpolate(farLeg.distal, fAn0, fTo0, fAn1, fTo1, u);
        result.farToe = { x: r1(farToeRaw.x), y: r1(farToeRaw.y) };
      }
    } else {
      result.farKnee = lerpPoint(from.farKnee, to.farKnee, u);
      result.farAnkle = lerpPoint(from.farAnkle, to.farAnkle, u);
      result.farToe = lerpPoint(from.farToe, to.farToe, u);
    }
  }

  return result as unknown as RigJointMap;
}

/**
 * Small illustrative motion during holds. Timing belongs to the preview,
 * not a measured source video or a prescribed breathing cadence.
 */
function applySubPhaseMicroMotion(
  joints: RigJointMap,
  progress: number,
  exerciseId: string,
  archetypeId: string,
  phase: CatalogMotionPhaseSpec,
): RigJointMap {
  const local = clamp01((progress - phase.start) / (phase.end - phase.start));
  if (phase.id === 'setup' && local > 0 && local < 1) {
    const breathEnv = Math.sin(local * Math.PI);
    if (Math.abs(breathEnv) > 0.05) {
      return {
        ...joints,
        thoracic: {
          x: joints.thoracic.x,
          y: r1(joints.thoracic.y - breathEnv * 1.1),
        },
      };
    }
  }

  if (phase.id === 'turn' && local > 0 && local < 1 && /hundred|core-01/i.test(`${exerciseId} ${archetypeId}`)) {
    const pumpDeltaY = Math.sin(local * Math.PI * 4) * 4.2;
    if (Math.abs(pumpDeltaY) > 0.08) {
      return {
        ...joints,
        elbow: { x: joints.elbow.x, y: r1(joints.elbow.y + pumpDeltaY * 0.55) },
        wrist: { x: joints.wrist.x, y: r1(joints.wrist.y + pumpDeltaY * 0.85) },
        hand: { x: joints.hand.x, y: r1(joints.hand.y + pumpDeltaY) },
      };
    }
  }

  return joints;
}

function interpolateAlignments(
  fromList: readonly JointAlignmentGuide[],
  toList: readonly JointAlignmentGuide[],
  t: number,
): readonly JointAlignmentGuide[] {
  const smoothT = smootherstep(t);
  if (fromList.length !== toList.length) {
    return smoothT < 0.5 ? fromList : toList;
  }
  return fromList.map((guide, idx) => {
    const target = toList[idx];
    if (!target || target.kind !== guide.kind) {
      return smoothT < 0.5 ? guide : target;
    }
    return {
      ...guide,
      from: lerpPoint(guide.from, target.from, smoothT) ?? guide.from,
      to: lerpPoint(guide.to, target.to, smoothT) ?? guide.to,
      targetAngleDeg:
        guide.targetAngleDeg !== undefined && target.targetAngleDeg !== undefined
          ? Math.round(lerpNum(guide.targetAngleDeg, target.targetAngleDeg, smoothT))
          : (smoothT < 0.5 ? guide.targetAngleDeg : target.targetAngleDeg),
    };
  });
}

function interpolateVectors(
  fromVecs: readonly MovementDirectionVector[],
  toVecs: readonly MovementDirectionVector[],
  t: number,
): readonly MovementDirectionVector[] {
  const smoothT = smootherstep(t);
  const activeVecs = smoothT < 0.5 ? fromVecs : toVecs;
  const peerVecs = smoothT < 0.5 ? toVecs : fromVecs;
  const blend = smoothT < 0.5 ? smoothT : 1 - smoothT;

  return activeVecs.map((vec, idx) => {
    const peer = peerVecs[idx];
    if (!peer || peer.points.length !== vec.points.length || peer.kind !== vec.kind) {
      return vec;
    }
    return {
      ...vec,
      points: vec.points.map((pt, pIdx) => lerpPoint(pt, peer.points[pIdx], blend * 0.5) ?? pt),
    };
  });
}

type PhaseDurations = readonly [number, number, number, number, number];

function maximumJointTravel(from: RigJointMap, to: RigJointMap): number {
  return Math.max(...Object.entries(from).map(([key, a]) => {
    const b = to[key as keyof RigJointMap];
    return b ? Math.hypot(a.x - b.x, a.y - b.y) : 0;
  }));
}

function normalizeVisualAsset(asset: CatalogMovementVisualAsset): CatalogMovementVisualAsset {
  const reference = asset.phases.start.joints;
  const normalize = (phase: PhasePoseSpec): PhasePoseSpec => ({
    ...phase,
    joints: normalizeRigJointMap(phase.joints, reference),
  });
  return {
    ...asset,
    phases: {
      start: normalize(asset.phases.start),
      middle: normalize(asset.phases.middle),
      end: normalize(asset.phases.end),
    },
  };
}

function previewPhaseDurations(
  visualAsset: CatalogMovementVisualAsset,
  override?: CatalogMotionOverrideNote,
): PhaseDurations {
  const archetype = visualAsset.archetypeId;
  const base: PhaseDurations = override?.previewPhaseDurationsMs
    ?? (/breath/i.test(archetype)
      ? [1500, 3000, 1500, 3000, 1000]
      : /bridge|roll|spine|teaser|cat-/i.test(archetype)
        ? [1000, 3000, 1200, 3000, 1000]
        : [960, 2400, 1280, 2400, 960]);
  // Keep a large final pose change visible instead of compressing every reset
  // into 480 ms. This is a preview readability budget in drawing coordinates,
  // not a biomechanical speed limit or source-video verification.
  const returnTravel = maximumJointTravel(visualAsset.phases.end.joints, visualAsset.phases.start.joints);
  const resetMs = returnTravel > 20 ? Math.ceil(returnTravel / 50) * 1000 : base[4];
  return [base[0], base[1], base[2], base[3], Math.max(base[4], resetMs)];
}

function buildPhasesForExercise(
  exercise: PilatesExercise,
  visualAsset: CatalogMovementVisualAsset,
  durations: PhaseDurations,
  finishBehavior: CatalogContinuousMotionAsset['finishBehavior'],
  override?: CatalogMotionOverrideNote,
): CatalogContinuousMotionAsset['phases'] {
  const appKo = APPARATUS_LABELS[exercise.apparatus]?.ko ?? exercise.apparatus;
  const posKo = POSITION_LABELS[exercise.bodyPosition]?.ko ?? exercise.bodyPosition;
  const planesKo = exercise.spinalPlanes.map((p) => SPINAL_PLANE_LABELS[p]?.ko ?? p).join(' · ');
  const defaultLabels: Record<CatalogMotionPhaseId, string> = {
    setup: `${appKo} ${posKo} 시작 정렬 세팅`,
    move: `${planesKo} 가동 구간 진행`,
    turn: `${visualAsset.phases.middle.shortTitleKo} 확인`,
    return: '다음 자세로 제어하며 연결',
    finish: '시작 자세에서 마무리 확인',
  };
  const labels = override?.phaseLabelsKo ?? defaultLabels;
  const endIsSetup = maximumJointTravel(visualAsset.phases.end.joints, visualAsset.phases.start.joints) <= 8;
  const continuesBeyondMiddle = maximumJointTravel(visualAsset.phases.end.joints, visualAsset.phases.start.joints)
    > maximumJointTravel(visualAsset.phases.middle.joints, visualAsset.phases.start.joints) + 8;
  const durationMs = durations.reduce((sum, value) => sum + value, 0);
  const descriptors = [
    ['setup', labels.setup, visualAsset.phases.start.summaryKo, 'hold'],
    ['move', labels.move, visualAsset.poseDeltaSummary.startToMiddleKo, 'move'],
    ['turn', continuesBeyondMiddle ? `${visualAsset.phases.middle.shortTitleKo} · 중간 자세 확인` : labels.turn,
      visualAsset.phases.middle.summaryKo, 'hold'],
    ['return', endIsSetup ? labels.return : `${visualAsset.phases.end.shortTitleKo}로 연결`,
      visualAsset.poseDeltaSummary.middleToEndKo, 'move'],
    ['finish',
      finishBehavior === 'alternate-side' ? '반대쪽 연결 · 시작 자세로 마무리'
        : finishBehavior === 'return-to-setup' ? '마무리 자세 → 다음 반복 준비' : labels.finish,
      finishBehavior === 'alternate-side' ? '양쪽 동작을 연결한 뒤 시작 자세로 돌아옵니다.'
        : finishBehavior === 'return-to-setup' ? '마지막 자세를 확인하고 시작 자세로 천천히 돌아옵니다.' : visualAsset.phases.end.summaryKo,
      finishBehavior === 'hold-return' ? 'hold' : 'move'],
  ] as const;
  let elapsed = 0;
  return Object.freeze(descriptors.map(([id, labelKo, cueKo, displayBehavior], index) => {
    const start = elapsed / durationMs;
    elapsed += durations[index];
    const end = index === 4 ? 1 : elapsed / durationMs;
    return Object.freeze({ id, labelKo, cueKo, displayBehavior, start, end, sample: (start + end) / 2 });
  })) as unknown as CatalogContinuousMotionAsset['phases'];
}

/** An authored unilateral leg pose translated to the other hip. The trunk and
 * supporting side retain their setup coordinates; it is a procedural planning
 * reference, not a traced source frame.
 */
function oppositeKneeFoldPose(asset: CatalogMovementVisualAsset): PhasePoseSpec {
  const setup = asset.phases.start;
  const peak = asset.phases.middle;
  const a = peak.joints;
  const b = setup.joints;
  const translate = (point: Point2D, origin: Point2D, target: Point2D): Point2D => ({
    x: point.x - origin.x + target.x,
    y: point.y - origin.y + target.y,
  });
  const farHip = b.farHip!;
  return {
    ...setup,
    shortTitleKo: '반대쪽 니 폴드 연결 자세',
    summaryKo: '몸통과 처음 움직인 발을 유지하며 반대쪽 다리를 들었다 내리는 연결 참고 자세입니다.',
    joints: {
      ...b,
      farKnee: translate(a.knee, a.hip, farHip),
      farAnkle: translate(a.ankle, a.hip, farHip),
      farHeel: translate(a.heel, a.hip, farHip),
      farToe: translate(a.toe, a.hip, farHip),
    },
    movingJoints: ['farKnee', 'farAnkle', 'farHeel', 'farToe'],
  };
}

function buildKeyframes(
  asset: CatalogMovementVisualAsset,
  phases: CatalogContinuousMotionAsset['phases'],
  override?: CatalogMotionOverrideNote,
): readonly CatalogMotionKeyframe[] {
  const frame = (id: string, progress: number, visualPhaseId: VisualPhaseId, pose: PhasePoseSpec,
    labelKo = pose.shortTitleKo, provenance: CatalogMotionKeyframe['provenance'] = 'catalog-pose'): CatalogMotionKeyframe => ({
    id, progress, visualPhaseId, pose, labelKo, provenance,
  });
  const frames: CatalogMotionKeyframe[] = [
    frame('setup', 0, 'start', asset.phases.start),
    frame('move-start', phases[0].end, 'start', asset.phases.start),
    frame('peak-entry', phases[1].end, 'middle', asset.phases.middle),
    frame('peak-exit', phases[2].end, 'middle', asset.phases.middle),
    frame('authored-end', phases[3].end, 'end', asset.phases.end),
  ];
  const finish = phases[4];
  const at = (fraction: number) => finish.start + (finish.end - finish.start) * fraction;
  if (override?.transitionPath === 'through-middle') {
    frames.push(frame('exchange-middle', at(0.5), 'middle', asset.phases.middle,
      '교대 연결 중간 자세', 'procedural-transition'));
  } else if (override?.transitionPath === 'alternate-knee-fold') {
    const opposite = oppositeKneeFoldPose(asset);
    frames.push(
      frame('both-feet-reset', at(0.1), 'start', asset.phases.start, '양발 지지 확인', 'procedural-transition'),
      frame('opposite-lift', at(0.45), 'middle', opposite, opposite.shortTitleKo, 'procedural-transition'),
      frame('opposite-hold', at(0.6), 'middle', opposite, opposite.shortTitleKo, 'procedural-transition'),
    );
  }
  frames.push(frame('loop-ready', 1, 'start', asset.phases.start, '시작 자세로 마무리'));
  return Object.freeze(frames);
}

function constrainChairStepUp(
  joints: RigJointMap,
  pedalAngleDeg: number,
  from: RigJointMap,
  to: RigJointMap,
  easedT: number,
): RigJointMap {
  const contact = resolveChairPedalTip(pedalAngleDeg);
  const previous = joints.farToe!;
  const delta = { x: contact.x - previous.x, y: contact.y - previous.y };
  const ankle = { x: joints.farAnkle!.x + delta.x, y: joints.farAnkle!.y + delta.y };
  const heel = { x: joints.farHeel!.x + delta.x, y: joints.farHeel!.y + delta.y };
  const knee = solveTwoBoneMidJoint(joints.farHip!, ankle,
    from.farHip!, from.farKnee!, from.farAnkle!, to.farHip!, to.farKnee!, to.farAnkle!, easedT);
  return { ...joints, farKnee: knee, farAnkle: ankle, farHeel: heel, farToe: contact };
}

function createSamplePoseFn(
  visualAsset: CatalogMovementVisualAsset,
  phases: CatalogContinuousMotionAsset['phases'],
  keyframes: readonly CatalogMotionKeyframe[],
): (progress: number) => CatalogContinuousPoseSnapshot {
  return (rawProgress: number): CatalogContinuousPoseSnapshot => {
    const progress = clampProgress(rawProgress);
    const phase = phases.find((item, index) => index === phases.length - 1
      ? progress <= item.end : progress < item.end) ?? phases[phases.length - 1];
    const targetIndex = keyframes.findIndex((frame, index) => index > 0 && progress <= frame.progress);
    const to = keyframes[targetIndex < 0 ? keyframes.length - 1 : targetIndex];
    const from = keyframes[Math.max(0, (targetIndex < 0 ? keyframes.length - 1 : targetIndex) - 1)];
    const localT = clamp01((progress - from.progress) / Math.max(1e-9, to.progress - from.progress));
    const easedT = smootherstep(localT);
    const samePose = from.pose === to.pose;
    const base = localT < 0.5 ? from : to;
    let joints = samePose
      ? applySubPhaseMicroMotion(from.pose.joints, progress, visualAsset.exerciseId, visualAsset.archetypeId, phase)
      : interpolateKinematicRigArc(from.pose.joints, to.pose.joints, localT, visualAsset.archetypeId,
          phase.id === 'move' ? 'move' : 'return');
    const carriageOffsetPx = lerpNum(from.pose.apparatusState.carriageOffsetPx, to.pose.apparatusState.carriageOffsetPx, easedT);
    const pedalAngleDeg = lerpNum(from.pose.apparatusState.pedalAngleDeg, to.pose.apparatusState.pedalAngleDeg, easedT);
    if (visualAsset.archetypeId === 'chair-seat-pedal-step-up') {
      joints = constrainChairStepUp(joints, pedalAngleDeg, from.pose.joints, to.pose.joints, easedT);
    }
    const interpolatedPhaseSpec: PhasePoseSpec = {
      ...base.pose,
      shortTitleKo: phase.labelKo,
      summaryKo: phase.cueKo,
      joints,
      alignments: interpolateAlignments(from.pose.alignments, to.pose.alignments, localT),
      directionVectors: interpolateVectors(from.pose.directionVectors, to.pose.directionVectors, localT),
      apparatusState: { ...base.pose.apparatusState, carriageOffsetPx, pedalAngleDeg },
    };
    return { progress, phase, visualPhaseId: base.visualPhaseId, interpolatedPhaseSpec,
      joints, carriageOffsetPx, pedalAngleDeg };
  };
}

export function buildCatalogContinuousMotionAsset(
  exercise: PilatesExercise,
): CatalogContinuousMotionAsset | null {
  const authoredVisualAsset = getMovementVisualAsset(exercise.id);
  // An edited catalogue ID is not a new authored pose. In particular, a cache
  // miss must not fall back to the original apparatus or starting position.
  if (hasCatalogMotionIdentityMismatch(exercise)) return null;
  const visualAsset = normalizeVisualAsset(
    authoredVisualAsset ?? buildMovementVisualAssetForExercise(exercise),
  );
  const sourceAudit = getVisualSourceComparison(exercise);
  const override = ALL_MOTION_OVERRIDES[exercise.id];
  const resetTravel = maximumJointTravel(visualAsset.phases.end.joints, visualAsset.phases.start.joints);
  const finishBehavior: CatalogContinuousMotionAsset['finishBehavior'] = override?.transitionPath
    ? 'alternate-side' : resetTravel > 0.2 ? 'return-to-setup' : 'hold-return';
  const durations = previewPhaseDurations(visualAsset, override);
  const phases = buildPhasesForExercise(exercise, visualAsset, durations, finishBehavior, override);
  const keyframes = buildKeyframes(visualAsset, phases, override);
  const samplePose = createSamplePoseFn(visualAsset, phases, keyframes);

  const appKo = APPARATUS_LABELS[exercise.apparatus]?.ko ?? exercise.apparatus;
  const posKo = POSITION_LABELS[exercise.bodyPosition]?.ko ?? exercise.bodyPosition;
  const blockMeta = CANONICAL_BLOCKS.find((b) => b.category === exercise.blockCategory);

  const motionSubtitleKo =
    override?.motionSubtitleKo ??
    `${appKo} · ${posKo} · ${visualAsset.archetypeTitleKo} 5단계 연속·3단계 기구학 도해`;

  const biomechFocusKo =
    override?.biomechFocusKo ??
    `${blockMeta?.nameKo ?? exercise.blockCategory} 구간에서 [${exercise.targetMuscles.join(', ')}] 협응과 ${visualAsset.poseDeltaSummary.keyJointChangeKo} 제어를 시각화합니다.`;

  const apparatusControlNoteKo =
    override?.apparatusControlNoteKo ??
    `${appKo} 계획 세팅: 스프링(${exercise.springs}) · 풋바(${exercise.footbar}) · 헤드레스트(${exercise.headrest}) · 박스(${exercise.box}). 대표 패턴 참고용이며 실제 기구·장력·가동범위는 강사 확인 전입니다.`;

  return Object.freeze({
    exerciseId: exercise.id,
    variantId: `catalog-kinematic-${exercise.id}`,
    titleKo: `${exercise.nameKo} · 기구학 모션 도해`,
    titleEn: exercise.nameEn,
    motionSubtitleKo,
    apparatus: exercise.apparatus,
    bodyPosition: exercise.bodyPosition,
    blockCategory: exercise.blockCategory,
    sideMode: exercise.isUnilateral ? 'unilateral' : 'bilateral',
    durationMs: durations.reduce((sum, value) => sum + value, 0),
    phases,
    keyframes,
    authoredEndProgress: phases[3].end,
    endPoseLabelKo: resetTravel <= 8 ? '복귀 자세' : override?.transitionPath ? '교대 연결 자세' : '마무리 자세',
    finishBehavior,
    previewTimingOnly: true,
    biomechFocusKo,
    apparatusControlNoteKo,
    visualAsset,
    sourceVerificationCategoryKo: sourceAudit.extendedAuditSummary.sourceVerificationCategoryKo,
    factualRecordSha256: sourceAudit.extendedAuditSummary.factualRecordSha256,
    auditCheckedAt: sourceAudit.extendedAuditSummary.auditCheckedAt,
    matchedReliableSources: sourceAudit.matchedReliableSources,
    samplePose,
    pointAt: (joint: keyof RigJointMap, progress: number): Point2D => {
      const snap = samplePose(progress);
      return snap.joints[joint] ?? snap.joints.pelvis;
    },
    anatomicalAccuracyAssumed: false,
    professionalReviewCount: 0,
  });
}

export const CATALOG_CONTINUOUS_MOTION_ASSETS: readonly CatalogContinuousMotionAsset[] =
  Object.freeze(
    INITIAL_EXERCISES.flatMap((exercise) => {
      const asset = buildCatalogContinuousMotionAsset(exercise);
      return asset ? [asset] : [];
    }),
  );

export const CATALOG_CONTINUOUS_MOTION_ASSET_MAP: ReadonlyMap<
  string,
  CatalogContinuousMotionAsset
> = new Map(CATALOG_CONTINUOUS_MOTION_ASSETS.map((asset) => [asset.exerciseId, asset]));

export function getCatalogContinuousMotionAsset(
  exerciseOrId: string | PilatesExercise | null | undefined,
): CatalogContinuousMotionAsset | null {
  if (!exerciseOrId) return null;
  if (typeof exerciseOrId === 'string') {
    return CATALOG_CONTINUOUS_MOTION_ASSET_MAP.get(exerciseOrId.trim()) ?? null;
  }
  const fromCatalog = CATALOG_CONTINUOUS_MOTION_ASSET_MAP.get(exerciseOrId.id);
  if (
    fromCatalog &&
    fromCatalog.apparatus === exerciseOrId.apparatus &&
    fromCatalog.bodyPosition === exerciseOrId.bodyPosition
  ) {
    return fromCatalog;
  }
  return buildCatalogContinuousMotionAsset(exerciseOrId);
}
