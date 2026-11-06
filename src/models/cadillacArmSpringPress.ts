/** SPDX-License-Identifier: 0BSD. Original bent-elbow preparation variation.
 * Source does not establish this complete hand/elbow path or anchor coordinates. */
import type { AnatomicalSide, Point3 } from "./types";
import type {
  TensionGeometry,
  CadillacTensionEquipment,
  TensionArm,
  TensionLeg,
  TensionContact,
  TensionSpring,
} from "./tensionDrafts";
import {
  add,
  distance,
  elbowOutward,
  solveSagittalJoint,
  visualSpring,
} from "./tensionGeometry";
export const CADILLAC_TENSION_DIMENSIONS = Object.freeze({
  upperArm: 62,
  forearm: 62,
  handRadius: Math.sqrt(62 ** 2 + 62 ** 2),
  thigh: 82,
  shin: 84,
  tableHeight: 88,
  startArmAngle: 0.08,
  endArmAngle: 1.38,
});
export function getCadillacArmSpringPressGeometry(
  amount: number,
): TensionGeometry<CadillacTensionEquipment> {
  if (!Number.isFinite(amount) || amount < 0 || amount > 1)
    throw new RangeError("Cadillac amount must be finite in [0,1].");
  const origin: Point3 = [105, 0, 88],
    local = (p: Point3) => add(p, origin),
    angle = 0.08 + (1.38 - 0.08) * amount,
    r = CADILLAC_TENSION_DIMENSIONS.handRadius;
  const body = {
    pelvisCenter: local([235, 0, 23]),
    shoulderCenter: local([120, 0, 23]),
    neck: local([82, 0, 24]),
    headCenter: local([55, 0, 22]),
  };
  const arms = {} as Record<AnatomicalSide, TensionArm>,
    legs = {} as Record<AnatomicalSide, TensionLeg>,
    anchors = {} as Record<AnatomicalSide, Point3>,
    lines = {} as Record<AnatomicalSide, TensionSpring>,
    contacts: TensionContact[] = [];
  for (const side of ["left", "right"] as const) {
    const sign = side === "left" ? 1 : -1,
      y = 24 * sign,
      shoulder = local([120, 36 * sign, 23]),
      hand = local([
        120 + r * Math.sin(angle),
        36 * sign,
        23 + r * Math.cos(angle),
      ]),
      hip = local([235, y, 23]),
      ankle = local([339, y, 12]),
      anchor: Point3 = [75, 60 * sign, 235];
    arms[side] = {
      anatomicalSide: side,
      role: "bilateral",
      shoulder,
      elbow: elbowOutward(shoulder, hand, 62, 62, sign),
      hand,
    };
    legs[side] = {
      anatomicalSide: side,
      hip,
      knee: solveSagittalJoint(hip, ankle, 82, 84),
      ankle,
      heel: local([331, y, 0]),
      toe: local([369, y, 0]),
    };
    anchors[side] = anchor;
    lines[side] = {
      kind: "visual-spring",
      side,
      anchor,
      handle: [...hand],
      visualLength: distance(anchor, hand),
      coil: visualSpring(anchor, hand),
      force: "not-modeled",
    };
    contacts.push({
      id: `${side}-handle`,
      side,
      point: [...hand],
      localAnchor: [0, 0, 0],
      frame: "handle",
      target: "handle-grip",
      state: "grasped",
    });
    for (const [part, localAnchor] of [
      ["heel", [331, y, 0]],
      ["toe", [369, y, 0]],
    ] as const)
      contacts.push({
        id: `${side}-${part}`,
        side,
        point: local(localAnchor),
        localAnchor,
        frame: "table",
        target: part === "heel" ? "heel-support" : "toe-support",
        state: "supported",
      });
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
      frame: "table",
      target,
      state: "supported",
    });
  const top: readonly Point3[] = [
    [75, -78, 255],
    [540, -78, 255],
    [540, 78, 255],
    [75, 78, 255],
  ];
  const equipment: CadillacTensionEquipment = {
    kind: "cadillac",
    table: {
      origin,
      corners: [
        [105, -70, 88],
        [530, -70, 88],
        [530, 70, 88],
        [105, 70, 88],
      ],
    },
    frame: { top, uprights: top.map((p) => [[p[0], p[1], 0], p] as const) },
    anchors,
    lines,
    springForce: "not-modeled",
    settings: "not-modeled",
  };
  return { body, arms, legs, contacts, equipment };
}
