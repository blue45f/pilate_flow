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
import { CADILLAC_CHAIR_BARREL_MOTION_OVERRIDES } from './cadillacChairBarrelCatalogMotions';
import { MAT_CATALOG_MOTION_OVERRIDES } from './matCatalogMotions';
import { REFORMER_CATALOG_MOTION_OVERRIDES } from './reformerCatalogMotions';
import type {
  CatalogContinuousMotionAsset,
  CatalogContinuousPoseSnapshot,
  CatalogMotionOverrideNote,
  CatalogMotionPhaseId,
  CatalogMotionPhaseSpec,
} from './types';

export * from './types';

const ALL_MOTION_OVERRIDES: Readonly<Record<string, CatalogMotionOverrideNote>> = Object.freeze({
  ...MAT_CATALOG_MOTION_OVERRIDES,
  ...REFORMER_CATALOG_MOTION_OVERRIDES,
  ...CADILLAC_CHAIR_BARREL_MOTION_OVERRIDES,
});

function clampProgress(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, Number(value.toFixed(4))));
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

  // Determine anatomical bend side (clockwise vs counter-clockwise cross product)
  const crossFrom =
    (fromDistal.x - fromRoot.x) * (fromMid.y - fromRoot.y) -
    (fromDistal.y - fromRoot.y) * (fromMid.x - fromRoot.x);
  const crossTo =
    (toDistal.x - toRoot.x) * (toMid.y - toRoot.y) -
    (toDistal.y - toRoot.y) * (toMid.x - toRoot.x);
  const crossBlend = lerpRaw(crossFrom, crossTo, u);
  const bendSign = crossBlend >= 0 ? 1 : -1;

  const clampedD = Math.max(Math.abs(l1 - l2) + 0.01, Math.min(l1 + l2 - 0.01, d));
  const a = (l1 * l1 - l2 * l2 + clampedD * clampedD) / (2 * clampedD);
  const hSq = Math.max(0, l1 * l1 - a * a);
  const h = Math.sqrt(hSq);

  const ux = dx / d;
  const uy = dy / d;
  const nx = -uy * bendSign;
  const ny = ux * bendSign;

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
  // Closed-chain contact (e.g. foot on footbar/mat/pedal, hand on footbar/chair/rung):
  // lock distal contact path and solve true constant-length 2-bone knee/elbow bend.
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

  // Open-chain swing: polar arc interpolation preserves exact segment lengths through full arcs.
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
 * Biomechanically grounded hierarchical rig interpolation:
 * 1. Sequential spinal wave articulation across pelvis -> lumbar -> thoracic -> neck -> head
 * 2. Closed-chain 2-bone IK for apparatus-anchored limbs (zero footbar/mat/seat slip)
 * 3. Open-chain polar arc kinematics for free-swinging limbs (zero mid-swing foreshortening)
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
 * Adds subtle, biomechanically authentic micro-motion during static sub-phases:
 * - Preparatory ribcage breath readiness in `setup` (0 < progress < 0.12; strictly 0 at 0 and 0.12)
 * - Rhythmic arm-pumping oscillation in `turn` for Hundred variants (strictly 0 at 0.42, 0.50, 0.58)
 */
function applySubPhaseMicroMotion(
  joints: RigJointMap,
  progress: number,
  exerciseId: string,
  archetypeId: string,
): RigJointMap {
  if (progress > 0 && progress < 0.12) {
    const breathEnv = Math.sin((progress / 0.12) * Math.PI);
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

  if (progress > 0.42 && progress < 0.58 && /hundred|core-01/i.test(`${exerciseId} ${archetypeId}`)) {
    // 2 full pump beats across [0.42, 0.58]; sin(2*pi) === 0 at progress === 0.50!
    const localPump = (progress - 0.42) / 0.16;
    const pumpDeltaY = Math.sin(localPump * Math.PI * 4) * 4.2;
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

function buildPhasesForExercise(
  exercise: PilatesExercise,
  visualAsset: CatalogMovementVisualAsset,
  override?: CatalogMotionOverrideNote,
): readonly [
  CatalogMotionPhaseSpec,
  CatalogMotionPhaseSpec,
  CatalogMotionPhaseSpec,
  CatalogMotionPhaseSpec,
  CatalogMotionPhaseSpec,
] {
  const appKo = APPARATUS_LABELS[exercise.apparatus]?.ko ?? exercise.apparatus;
  const posKo = POSITION_LABELS[exercise.bodyPosition]?.ko ?? exercise.bodyPosition;
  const planesKo = exercise.spinalPlanes
    .map((p) => SPINAL_PLANE_LABELS[p]?.ko ?? p)
    .join(' · ');

  const defaultLabels: Record<CatalogMotionPhaseId, string> = {
    setup: `${appKo} ${posKo} 시작 정렬 세팅`,
    move: `${planesKo} 가동 구간 진행`,
    turn: `${visualAsset.phases.middle.shortTitleKo} 정점 유지`,
    return: `원심성 저항 제어 복귀 진행`,
    finish: `${visualAsset.phases.end.shortTitleKo} 마무리 확인`,
  };

  const labels = override?.phaseLabelsKo ?? defaultLabels;

  return Object.freeze([
    Object.freeze({
      id: 'setup',
      labelKo: labels.setup,
      start: 0,
      end: 0.12,
      sample: 0.06,
      cueKo: visualAsset.phases.start.summaryKo,
      displayBehavior: 'hold',
    }),
    Object.freeze({
      id: 'move',
      labelKo: labels.move,
      start: 0.12,
      end: 0.42,
      sample: 0.27,
      cueKo: visualAsset.poseDeltaSummary.startToMiddleKo,
      displayBehavior: 'move',
    }),
    Object.freeze({
      id: 'turn',
      labelKo: labels.turn,
      start: 0.42,
      end: 0.58,
      sample: 0.5,
      cueKo: visualAsset.phases.middle.summaryKo,
      displayBehavior: 'hold',
    }),
    Object.freeze({
      id: 'return',
      labelKo: labels.return,
      start: 0.58,
      end: 0.88,
      sample: 0.73,
      cueKo: visualAsset.poseDeltaSummary.middleToEndKo,
      displayBehavior: 'move',
    }),
    Object.freeze({
      id: 'finish',
      labelKo: labels.finish,
      start: 0.88,
      end: 1,
      sample: 0.94,
      cueKo: visualAsset.phases.end.summaryKo,
      displayBehavior: 'hold',
    }),
  ] as const);
}

function createSamplePoseFn(
  visualAsset: CatalogMovementVisualAsset,
  phases: readonly [
    CatalogMotionPhaseSpec,
    CatalogMotionPhaseSpec,
    CatalogMotionPhaseSpec,
    CatalogMotionPhaseSpec,
    CatalogMotionPhaseSpec,
  ],
): (progress: number) => CatalogContinuousPoseSnapshot {
  return (rawProgress: number): CatalogContinuousPoseSnapshot => {
    const progress = clampProgress(rawProgress);
    const phase =
      phases.find((item, idx) =>
        idx === phases.length - 1 ? progress <= item.end : progress < item.end,
      ) ?? phases[phases.length - 1];

    const startSpec = visualAsset.phases.start;
    const middleSpec = visualAsset.phases.middle;
    const endSpec = visualAsset.phases.end;

    let joints: RigJointMap;
    let carriageOffsetPx: number;
    let pedalAngleDeg: number;
    let baseSpec: PhasePoseSpec;
    let visualPhaseId: VisualPhaseId;
    let alignments: readonly JointAlignmentGuide[];
    let directionVectors: readonly MovementDirectionVector[];

    if (progress <= 0.12) {
      joints = applySubPhaseMicroMotion(
        startSpec.joints,
        progress,
        visualAsset.exerciseId,
        visualAsset.archetypeId,
      );
      carriageOffsetPx = startSpec.apparatusState.carriageOffsetPx;
      pedalAngleDeg = startSpec.apparatusState.pedalAngleDeg;
      baseSpec = startSpec;
      visualPhaseId = 'start';
      alignments = startSpec.alignments;
      directionVectors = startSpec.directionVectors;
    } else if (progress < 0.42) {
      const localT = (progress - 0.12) / 0.3;
      const easedT = smootherstep(localT);
      joints = interpolateKinematicRigArc(
        startSpec.joints,
        middleSpec.joints,
        localT,
        visualAsset.archetypeId,
        'move',
      );
      carriageOffsetPx = lerpNum(
        startSpec.apparatusState.carriageOffsetPx,
        middleSpec.apparatusState.carriageOffsetPx,
        easedT,
      );
      pedalAngleDeg = lerpNum(
        startSpec.apparatusState.pedalAngleDeg,
        middleSpec.apparatusState.pedalAngleDeg,
        easedT,
      );
      baseSpec = localT < 0.5 ? startSpec : middleSpec;
      visualPhaseId = localT < 0.5 ? 'start' : 'middle';
      alignments = interpolateAlignments(startSpec.alignments, middleSpec.alignments, localT);
      directionVectors = interpolateVectors(
        startSpec.directionVectors,
        middleSpec.directionVectors,
        localT,
      );
    } else if (progress <= 0.58) {
      joints = applySubPhaseMicroMotion(
        middleSpec.joints,
        progress,
        visualAsset.exerciseId,
        visualAsset.archetypeId,
      );
      carriageOffsetPx = middleSpec.apparatusState.carriageOffsetPx;
      pedalAngleDeg = middleSpec.apparatusState.pedalAngleDeg;
      baseSpec = middleSpec;
      visualPhaseId = 'middle';
      alignments = middleSpec.alignments;
      directionVectors = middleSpec.directionVectors;
    } else if (progress < 0.88) {
      const localT = (progress - 0.58) / 0.3;
      const easedT = smootherstep(localT);
      joints = interpolateKinematicRigArc(
        middleSpec.joints,
        endSpec.joints,
        localT,
        visualAsset.archetypeId,
        'return',
      );
      carriageOffsetPx = lerpNum(
        middleSpec.apparatusState.carriageOffsetPx,
        endSpec.apparatusState.carriageOffsetPx,
        easedT,
      );
      pedalAngleDeg = lerpNum(
        middleSpec.apparatusState.pedalAngleDeg,
        endSpec.apparatusState.pedalAngleDeg,
        easedT,
      );
      baseSpec = localT < 0.5 ? middleSpec : endSpec;
      visualPhaseId = localT < 0.5 ? 'middle' : 'end';
      alignments = interpolateAlignments(middleSpec.alignments, endSpec.alignments, localT);
      directionVectors = interpolateVectors(
        middleSpec.directionVectors,
        endSpec.directionVectors,
        localT,
      );
    } else {
      joints = endSpec.joints;
      carriageOffsetPx = endSpec.apparatusState.carriageOffsetPx;
      pedalAngleDeg = endSpec.apparatusState.pedalAngleDeg;
      baseSpec = endSpec;
      visualPhaseId = 'end';
      alignments = endSpec.alignments;
      directionVectors = endSpec.directionVectors;
    }

    const interpolatedPhaseSpec: PhasePoseSpec = {
      ...baseSpec,
      badgeKo: baseSpec.badgeKo,
      shortTitleKo: phase.labelKo,
      summaryKo: phase.cueKo,
      joints,
      alignments,
      directionVectors,
      apparatusState: {
        ...baseSpec.apparatusState,
        carriageOffsetPx,
        pedalAngleDeg,
      },
    };

    return {
      progress,
      phase,
      visualPhaseId,
      interpolatedPhaseSpec,
      joints,
      carriageOffsetPx,
      pedalAngleDeg,
    };
  };
}

export function buildCatalogContinuousMotionAsset(
  exercise: PilatesExercise,
): CatalogContinuousMotionAsset {
  const visualAsset =
    getMovementVisualAsset(exercise.id) ?? buildMovementVisualAssetForExercise(exercise);
  const sourceAudit = getVisualSourceComparison(exercise);
  const override = ALL_MOTION_OVERRIDES[exercise.id];
  const phases = buildPhasesForExercise(exercise, visualAsset, override);
  const samplePose = createSamplePoseFn(visualAsset, phases);

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
    `${appKo} 스프링(${exercise.springs}) · 풋바(${exercise.footbar}) · 헤드레스트(${exercise.headrest}) · 박스(${exercise.box}) 표준 세팅 대조 완료`;

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
    durationMs: 8000,
    phases,
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
    INITIAL_EXERCISES.map((exercise) => buildCatalogContinuousMotionAsset(exercise)),
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
