/** SPDX-License-Identifier: 0BSD. Independent original heel-on-fixed-footbar rig. */
import type { AnatomicalSide, Point3 } from "./types";
import type {
  ApparatusGeometry,
  ApparatusLeg,
  ReformerEquipment,
  ApparatusContact,
} from "./apparatusDrafts";
import { solveKnee, translate } from "./apparatusGeometry";
export const REFORMER_DIMENSIONS = Object.freeze({
  thigh: 84,
  shin: 84,
  hipHeight: 103,
  ankleHeight: 144,
  ankleX: 479,
  sideDepth: 24,
  maxHipAnkleReach: 164,
  carriageLength: 260,
  deckHeight: 80,
});
const startHipX = 479 - Math.sqrt(84 ** 2 + 84 ** 2 - (144 - 103) ** 2);
const endHipX = 479 - Math.sqrt(164 ** 2 - (144 - 103) ** 2);
const depth = (side: AnatomicalSide) => (side === "left" ? 24 : -24);
export function getReformerFootworkGeometry(
  amount: number,
): ApparatusGeometry<ReformerEquipment> {
  if (!Number.isFinite(amount) || amount < 0 || amount > 1)
    throw new RangeError("Reformer amount must be finite in [0,1].");
  const displacement = (endHipX - startHipX) * amount,
    hipX = startHipX + displacement;
  const origin: Point3 = [hipX - 231, 0, 80];
  const local = (p: Point3) => translate(p, origin);
  const legs = {} as Record<AnatomicalSide, ApparatusLeg>;
  const heelAnchors = {} as Record<AnatomicalSide, Point3>;
  const contacts: ApparatusContact[] = [];
  for (const side of ["left", "right"] as const) {
    const y = depth(side),
      hip: Point3 = [hipX, y, 103],
      ankle: Point3 = [479, y, 144],
      heel: Point3 = [490, y, 126];
    legs[side] = {
      anatomicalSide: side,
      role: "bilateral",
      hip,
      knee: solveKnee(hip, ankle, 84, 84),
      ankle,
      heel,
      toe: [506, y, 163],
    };
    heelAnchors[side] = [...heel];
    contacts.push({
      id: `${side}-heel-footbar`,
      side,
      point: [...heel],
      target: "footbar",
      frame: "world",
      localAnchor: [...heel],
      state: "fixed-on-support",
    });
  }
  const body = {
    pelvisCenter: local([231, 0, 23]),
    shoulderCenter: local([116, 0, 25]),
    neck: local([80, 0, 28]),
    headCenter: local([55, 0, 37]),
    leftShoulder: local([116, 30, 25]),
    rightShoulder: local([116, -30, 25]),
    leftElbow: local([169, 48, 10]),
    rightElbow: local([169, -48, 10]),
    leftHand: local([223, 48, 6]),
    rightHand: local([223, -48, 6]),
  };
  for (const [id, target, anchor] of [
    ["pelvis", "carriage-pelvis", [231, 0, 0]],
    ["back", "carriage-back", [116, 0, 0]],
    ["head", "carriage-headrest", [55, 0, 15]],
  ] as const)
    contacts.push({
      id,
      side: null,
      point: local(anchor),
      target,
      frame: "carriage",
      localAnchor: anchor,
      state: "fixed-on-support",
    });
  const polygon = (
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
  const equipment: ReformerEquipment = {
    kind: "reformer",
    frameCorners: polygon(65, 550, 68, 35),
    railEnds: [
      [
        [70, -56, 38],
        [540, -56, 38],
      ],
      [
        [70, 56, 38],
        [540, 56, 38],
      ],
    ],
    carriage: {
      origin,
      displacement,
      deck: polygon(0, 260, 54, 0).map(local),
      headrest: polygon(27, 80, 28, 15).map(local),
      shoulderBlocks: [
        (
          [
            [90, -48, 17],
            [110, -48, 17],
            [110, -32, 17],
            [90, -32, 17],
          ] as const
        ).map(local),
        (
          [
            [90, 32, 17],
            [110, 32, 17],
            [110, 48, 17],
            [90, 48, 17],
          ] as const
        ).map(local),
      ],
    },
    footbar: {
      heelAnchors,
      railEnds: [
        [490, -58, 126],
        [490, 58, 126],
      ],
      struts: [
        [
          [520, -58, 35],
          [490, -58, 126],
        ],
        [
          [520, 58, 35],
          [490, 58, 126],
        ],
      ],
      fixedForDrawing: true,
    },
    springs: "not-modeled",
    manufacturerSpecifics: "not-modeled",
  };
  return { body, legs, contacts, equipment };
}
