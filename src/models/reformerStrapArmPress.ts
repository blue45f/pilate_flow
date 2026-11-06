/** SPDX-License-Identifier: 0BSD. Original tabletop/unspecified-ball strap rig.
 * Fixed pulley + carriage tie routing and conserved length are authored geometry,
 * not a measured source path or manufacturer mechanism/force model. */
import type { AnatomicalSide, Point3 } from "./types";
import type {
  TensionGeometry,
  ReformerTensionEquipment,
  TensionArm,
  TensionLeg,
  TensionContact,
  TensionRope,
} from "./tensionDrafts";
import { add, distance, elbowOutward } from "./tensionGeometry";
export const REFORMER_TENSION_DIMENSIONS = Object.freeze({
  upperArm: 62,
  forearm: 62,
  handRadius: 122,
  thigh: 82,
  shin: 84,
  ballRadius: 14,
  startArmAngle: 0,
  endArmAngle: 1.38,
});
const pulley = (side: AnatomicalSide): Point3 => [
  55,
  side === "left" ? 62 : -62,
  151,
];
const localHand = (amount: number): Point3 => [
  120 + 122 * Math.sin(1.38 * amount),
  36,
  23 + 122 * Math.cos(1.38 * amount),
];
const lengthAt = (amount: number, displacement: number) => {
  const origin: Point3 = [105 + displacement, 0, 88],
    hand = add(localHand(amount), origin),
    anchor = add([85, 62, -18], origin),
    p = pulley("left");
  return distance(hand, p) + distance(p, anchor);
};
const referenceLength = lengthAt(0, 0);
function carriageDisplacement(amount: number) {
  if (amount === 0) return 0;
  let low = -65,
    high = 0;
  if (
    lengthAt(amount, low) > referenceLength ||
    lengthAt(amount, high) < referenceLength
  )
    throw new RangeError("Authored rope root is outside its carriage bounds.");
  for (let i = 0; i < 70; i++) {
    const mid = (low + high) / 2;
    if (lengthAt(amount, mid) > referenceLength) high = mid;
    else low = mid;
  }
  return (low + high) / 2;
}
export function getReformerStrapArmPressGeometry(
  amount: number,
): TensionGeometry<ReformerTensionEquipment> {
  if (!Number.isFinite(amount) || amount < 0 || amount > 1)
    throw new RangeError("Reformer amount must be finite in [0,1].");
  const displacement = carriageDisplacement(amount),
    origin: Point3 = [105 + displacement, 0, 88],
    local = (p: Point3) => add(p, origin);
  const body = {
    pelvisCenter: local([235, 0, 23]),
    shoulderCenter: local([120, 0, 23]),
    neck: local([82, 0, 24]),
    headCenter: local([55, 0, 22]),
  };
  const arms = {} as Record<AnatomicalSide, TensionArm>,
    legs = {} as Record<AnatomicalSide, TensionLeg>,
    pulleys = {} as Record<AnatomicalSide, Point3>,
    anchors = {} as Record<AnatomicalSide, Point3>,
    lines = {} as Record<AnatomicalSide, TensionRope>,
    contacts: TensionContact[] = [];
  for (const side of ["left", "right"] as const) {
    const sign = side === "left" ? 1 : -1,
      y = 24 * sign,
      shoulder = local([120, 36 * sign, 23]),
      h = localHand(amount),
      hand = local([h[0], h[1] * sign, h[2]]),
      p = pulley(side),
      anchor = local([85, 62 * sign, -18]);
    arms[side] = {
      anatomicalSide: side,
      role: "bilateral",
      shoulder,
      elbow: elbowOutward(shoulder, hand, 62, 62, sign),
      hand,
    };
    legs[side] = {
      anatomicalSide: side,
      hip: local([235, y, 23]),
      knee: local([235, y, 105]),
      ankle: local([319, y, 105]),
      heel: local([312, y, 93]),
      toe: local([349, y, 111]),
    };
    pulleys[side] = p;
    anchors[side] = anchor;
    lines[side] = {
      kind: "rope",
      side,
      hand: [...hand],
      pulley: p,
      carriageAnchor: anchor,
      referenceLength,
      geometricLength: distance(hand, p) + distance(p, anchor),
      segments: [
        [hand, p],
        [p, anchor],
      ],
    };
    contacts.push(
      {
        id: `${side}-handle`,
        side,
        point: [...hand],
        localAnchor: [0, 0, 0],
        frame: "handle",
        target: "handle-grip",
        state: "grasped",
      },
      {
        id: `${side}-ankle-ball`,
        side,
        point: local([319, 14 * sign, 105]),
        localAnchor: [319, 14 * sign, 105],
        frame: "carriage",
        target: "ankle-ball",
        state: "supported",
      },
    );
  }
  for (const [id, target, anchor] of [
    ["head", "head-support", [55, 0, 0]],
    ["back", "back-support", [120, 0, 0]],
    ["pelvis", "pelvis-support", [235, 0, 0]],
  ] as const)
    contacts.push({
      id,
      side: null,
      point: local(anchor),
      localAnchor: anchor,
      frame: "carriage",
      target,
      state: "supported",
    });
  const rect = (
    x0: number,
    x1: number,
    y: number,
    z: number,
  ): readonly Point3[] => [
    [x0, -y, z],
    [x1, -y, z],
    [x1, y, z],
    [x0, y, z],
  ];
  const equipment: ReformerTensionEquipment = {
    kind: "reformer",
    frame: rect(35, 570, 72, 34),
    rails: [
      [
        [40, -60, 40],
        [560, -60, 40],
      ],
      [
        [40, 60, 40],
        [560, 60, 40],
      ],
    ],
    carriage: {
      origin,
      displacement,
      deck: rect(0, 300, 58, 0).map(local),
      headrest: rect(32, 78, 28, 0).map(local),
    },
    pulleys,
    carriageAnchors: anchors,
    lines,
    ball: {
      kind: "generic-unspecified-ball",
      center: local([319, 0, 105]),
      radius: 14,
      sourceSizeVerified: false,
      pressure: "not-modeled",
    },
    springForce: "not-modeled",
    settings: "not-modeled",
  };
  return { body, arms, legs, contacts, equipment };
}
