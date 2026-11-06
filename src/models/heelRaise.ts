import type {
  AnatomicalSide,
  DraftPhase,
  HeelContact,
  HeelLimb,
  Point2,
} from "./types";
/** Original authored geometry, not captured motion or a clinically validated human model. */
export const MODEL_VERSION = "heel-raise-authoring-draft-0.1.0";
export const EXERCISE_ID = "original-mat-ankle-reach";
export const PHASES: readonly DraftPhase[] = Object.freeze([
  { id: "setup", label: "준비 상태", start: 0, end: 0.12, sample: 0 },
  {
    id: "move",
    label: "뒤꿈치가 올라가는 중",
    start: 0.12,
    end: 0.46,
    sample: 0.29,
  },
  { id: "turn", label: "높아진 상태", start: 0.46, end: 0.56, sample: 0.51 },
  {
    id: "return",
    label: "처음 상태로 돌아오는 중",
    start: 0.56,
    end: 0.92,
    sample: 0.74,
  },
  { id: "finish", label: "종료 상태", start: 0.92, end: 1, sample: 1 },
]);
export const DIMENSIONS = Object.freeze({
  heelToForefoot: 50,
  ankleFromForefootX: -32,
  ankleFromForefootY: -20,
  toeLength: 18,
  shin: 70,
  thigh: 76,
  torso: 78,
  upperArm: 64,
  forearm: 66,
  maxFootRotationRadians: 0.45,
});
const OFFSETS = Object.freeze({
  left: { x: 0, y: 0 },
  right: { x: 16, y: -8 },
});
const smooth = (value: number) => value * value * (3 - 2 * value);
const point = (x: number, y: number): Point2 => ({ x, y });
const add = (a: Point2, b: Point2) => point(a.x + b.x, a.y + b.y);
const rotate = (p: Point2, angle: number) =>
  point(
    p.x * Math.cos(angle) - p.y * Math.sin(angle),
    p.x * Math.sin(angle) + p.y * Math.cos(angle),
  );

export function clampProgress(value: number) {
  return Number.isNaN(value) ? 0 : Math.max(0, Math.min(1, value));
}
export function getHeelRaisePhase(value: number): DraftPhase {
  const progress = clampProgress(value);
  return PHASES.find((phase) => progress < phase.end) ?? PHASES.at(-1)!;
}
export function heelRaiseEnvelope(value: number) {
  const progress = clampProgress(value);
  if (progress <= 0.12 || progress >= 0.92) return 0;
  if (progress < 0.46) return smooth((progress - 0.12) / 0.34);
  if (progress <= 0.56) return 1;
  return 1 - smooth((progress - 0.56) / 0.36);
}

/** Two segment linkage for an authored arm, with a fixed hand on the support rail. */
function solveElbow(shoulder: Point2, hand: Point2) {
  const dx = hand.x - shoulder.x;
  const dy = hand.y - shoulder.y;
  const distance = Math.hypot(dx, dy);
  const along =
    (DIMENSIONS.upperArm ** 2 - DIMENSIONS.forearm ** 2 + distance ** 2) /
    (2 * distance);
  const heightSquared = DIMENSIONS.upperArm ** 2 - along ** 2;
  if (distance <= 0 || heightSquared < -1e-9)
    throw new RangeError(
      "Authored arm cannot reach its fixed support contact.",
    );
  const height = Math.sqrt(Math.max(0, heightSquared));
  const ux = dx / distance;
  const uy = dy / distance;
  return point(
    shoulder.x + ux * along - uy * height,
    shoulder.y + uy * along + ux * height,
  );
}

export function getHeelRaisePose(
  value: number,
  { mirrored = false }: { mirrored?: boolean } = {},
) {
  const progress = clampProgress(value);
  const q = heelRaiseEnvelope(progress);
  const angle = q * DIMENSIONS.maxFootRotationRadians;
  const limbs = {} as Record<AnatomicalSide, HeelLimb>;
  const contacts: HeelContact[] = [];
  for (const side of ["left", "right"] as const) {
    const offset = OFFSETS[side];
    const forefoot = add(point(300, 326), offset);
    const toe = add(forefoot, point(DIMENSIONS.toeLength, 0));
    const heel = add(
      forefoot,
      rotate(point(-DIMENSIONS.heelToForefoot, 0), angle),
    );
    const ankle = add(
      forefoot,
      rotate(
        point(DIMENSIONS.ankleFromForefootX, DIMENSIONS.ankleFromForefootY),
        angle,
      ),
    );
    const knee = add(ankle, point(0, -DIMENSIONS.shin));
    const hip = add(knee, point(0, -DIMENSIONS.thigh));
    const shoulder = add(hip, point(0, -DIMENSIONS.torso));
    const hand = add(point(355, 170), offset);
    const elbow = solveElbow(shoulder, hand);
    limbs[side] = {
      forefoot,
      toe,
      heel,
      ankle,
      knee,
      hip,
      shoulder,
      elbow,
      hand,
      active: true,
    };
    contacts.push(
      {
        id: `${side}-forefoot`,
        side,
        point: forefoot,
        target: `${side}-floor-plane`,
        state: "fixed",
      },
      {
        id: `${side}-toe`,
        side,
        point: toe,
        target: `${side}-floor-plane`,
        state: "fixed",
      },
      {
        id: `${side}-hand`,
        side,
        point: hand,
        target: "stable-chair-back-rail",
        state: "fixed",
      },
      {
        id: `${side}-heel`,
        side,
        point: heel,
        target: `${side}-floor-plane`,
        state: q === 0 ? "grounded" : "released",
      },
    );
  }
  const centerShoulder = point(
    (limbs.left.shoulder.x + limbs.right.shoulder.x) / 2,
    (limbs.left.shoulder.y + limbs.right.shoulder.y) / 2,
  );
  return {
    exerciseId: EXERCISE_ID,
    modelVersion: MODEL_VERSION,
    progress,
    q,
    phase: getHeelRaisePhase(progress),
    camera: {
      id: "authored-left-near-oblique",
      nearAnatomicalSide: "left",
      mirrored: Boolean(mirrored),
    },
    sideMode: "bilateral",
    limbs,
    head: { center: add(centerShoulder, point(0, -26)), radius: 15 },
    contacts,
    equipment: {
      type: "ordinary-stable-chair",
      isPilatesChair: false,
      railContacts: [point(355, 170), point(371, 162)],
      floorContacts: [
        point(395, 326),
        point(411, 318),
        point(451, 326),
        point(467, 318),
      ],
    },
  };
}

export type HeelRaisePose = ReturnType<typeof getHeelRaisePose>;
