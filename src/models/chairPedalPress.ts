/** SPDX-License-Identifier: 0BSD. Independent original seated Pilates-chair hinge rig. */
import type { AnatomicalSide, Point3 } from "./types";
import type {
  ApparatusGeometry,
  ApparatusLeg,
  ChairEquipment,
  ApparatusContact,
} from "./apparatusDrafts";
import { rotatePedal, solveKnee } from "./apparatusGeometry";
export const CHAIR_DIMENSIONS = Object.freeze({
  thigh: 80,
  shin: 86,
  seatHeight: 132,
  hipHeight: 154,
  sideDepth: 24,
  pedalLength: 115,
  pedalWidth: 108,
  heelRadius: 102,
  startPedalAngle: 0.55,
  pressedPedalAngle: 0.08,
});
export function getChairPedalPressGeometry(
  amount: number,
): ApparatusGeometry<ChairEquipment> {
  if (!Number.isFinite(amount) || amount < 0 || amount > 1)
    throw new RangeError("Chair amount must be finite in [0,1].");
  const hinge: Point3 = [305, 0, 18],
    angle = 0.55 - (0.55 - 0.08) * amount;
  const pedalPoint = (p: Point3) => rotatePedal(p, hinge, angle);
  const legs = {} as Record<AnatomicalSide, ApparatusLeg>,
    heelAnchors = {} as Record<AnatomicalSide, Point3>,
    sitBoneAnchors = {} as Record<AnatomicalSide, Point3>;
  const contacts: ApparatusContact[] = [];
  for (const side of ["left", "right"] as const) {
    const y = side === "left" ? 24 : -24,
      hip: Point3 = [283, y, 154],
      heel = pedalPoint([102, y, 0]),
      ankle = pedalPoint([91, y, 18]);
    legs[side] = {
      anatomicalSide: side,
      role: "bilateral",
      hip,
      knee: solveKnee(hip, ankle, 80, 86),
      ankle,
      heel,
      toe: pedalPoint([130, y, 24]),
    };
    heelAnchors[side] = [...heel];
    sitBoneAnchors[side] = [283, y, 132];
    contacts.push(
      {
        id: `${side}-heel-pedal`,
        side,
        point: [...heel],
        target: "chair-pedal",
        frame: "chair-pedal",
        localAnchor: [102, y, 0],
        state: "fixed-on-support",
      },
      {
        id: `${side}-sit-bone-seat`,
        side,
        point: [283, y, 132],
        target: "chair-seat",
        frame: "chair-seat",
        localAnchor: [0, y, 0],
        state: "fixed-on-support",
      },
    );
  }
  const body = {
    pelvisCenter: [283, 0, 154] as Point3,
    shoulderCenter: [277, 0, 228] as Point3,
    neck: [277, 0, 246] as Point3,
    headCenter: [277, 0, 269] as Point3,
    leftShoulder: [277, 30, 228] as Point3,
    rightShoulder: [277, -30, 228] as Point3,
    leftElbow: [295, 47, 191] as Point3,
    rightElbow: [295, -47, 191] as Point3,
    leftHand: [302, 49, 154] as Point3,
    rightHand: [302, -49, 154] as Point3,
  };
  const seat: ChairEquipment["seat"] = {
    origin: [283, 0, 132],
    corners: [
      [225, -58, 132],
      [305, -58, 132],
      [305, 58, 132],
      [225, 58, 132],
    ],
    sitBoneAnchors,
  };
  const equipment: ChairEquipment = {
    kind: "pilates-chair",
    isPilatesChair: true,
    isOrdinaryChair: false,
    seat,
    frameCorners: [
      [225, -58, 0],
      [305, -58, 0],
      [305, 58, 0],
      [225, 58, 0],
    ],
    pedal: {
      hinge,
      hingeAxis: "y",
      angle,
      length: 115,
      width: 108,
      corners: (
        [
          [0, -54, 0],
          [115, -54, 0],
          [115, 54, 0],
          [0, 54, 0],
        ] as const
      ).map(pedalPoint),
      heelAnchors,
    },
    springs: "not-modeled",
    manufacturerSpecifics: "not-modeled",
  };
  return { body, legs, contacts, equipment };
}
