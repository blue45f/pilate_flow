import type { AnatomicalSide, DraftPhase, Point3, ScreenPoint } from "./types";

/**
 * Original procedural schematic geometry. No source picture, video, tracing,
 * animation, motion capture, or downloaded model is embedded or reconstructed.
 * Source movement facts are distinct from every coordinate and display angle.
 * SPDX-License-Identifier: MIT (new authored code and geometry only).
 */
export type LateralDraftId =
  "side-lying-straight-leg-lift" | "side-lying-open-book";

export const LATERAL_MODEL_VERSION = "lateral-original-schematic-0.1.0";
export const LATERAL_DRAFT_IDS: readonly LateralDraftId[] = Object.freeze([
  "side-lying-straight-leg-lift",
  "side-lying-open-book",
]);

const makePhases = (move: string, turn: string, returning: string) =>
  Object.freeze(
    [
      { id: "setup", label: "시작 배치", start: 0, end: 0.12, sample: 0 },
      { id: "move", label: move, start: 0.12, end: 0.42, sample: 0.27 },
      { id: "turn", label: turn, start: 0.42, end: 0.58, sample: 0.5 },
      { id: "return", label: returning, start: 0.58, end: 0.88, sample: 0.73 },
      { id: "finish", label: "처음 배치", start: 0.88, end: 1, sample: 1 },
    ].map((phase) =>
      Object.freeze({ ...phase, labelKo: phase.label } as DraftPhase),
    ),
  );

/** Phase fractions and angles below are drawing choices, not exercise dosage. */
export const LATERAL_PHASES: Readonly<
  Record<LateralDraftId, readonly DraftPhase[]>
> = Object.freeze({
  "side-lying-straight-leg-lift": makePhases(
    "편 위쪽 다리 들림",
    "다리 열린 배치",
    "위쪽 다리 돌아옴",
  ),
  "side-lying-open-book": makePhases(
    "위쪽 팔·가슴 열림",
    "열린 가슴 배치",
    "팔·가슴 돌아옴",
  ),
});

export const LATERAL_PROVENANCE = Object.freeze({
  authorship:
    "Original procedural geometry and React SVG authored for this project",
  license: "MIT",
  sourceMediaReused: false,
  sourceMediaTraced: false,
  motionCaptureUsed: false,
  sourceFactsVerifiedOn: "2026-11-04",
  sourceFactsLedger: "src/data/motionDraftSourceLedger.json",
  factualRecordSha256: {
    "ruh-lateral-hip-side-abduction-v1":
      "fa7d7a99fddf19b1d6cf005742f4b45d3d12dcba1e2001f2fb78d12855c57994",
    "dynamichealth-midback-open-book-v1":
      "9a77c3a2d16e32ad6564dfea2752b15aaf5c209476c598576a9fb23e20c0c8d7",
    "leeds-chest-wall-open-book-v1":
      "b31daa12ad8dea0f47c8ad033958f88b37161609968f62035fc2acaf3ea2ccc5",
  },
  authoringChoices: [
    "All world coordinates, body proportions, foot angles, support contacts and the oblique camera",
    "Five phase fractions, smooth easing and display angles: leg lift 0.42, thorax 0.8, arm 2.5, head 2.4 radians",
    "Stationary pelvis, support limbs and head center; required illustrated head pad is not specified by either primary source",
    "Side change selects which anatomical side is uppermost; camera mirroring changes screen points only",
  ],
  populationScope:
    "Condition-specific physiotherapy texts; general adult suitability is not established",
  professionalReviewCount: 0,
  exactAssetCount: 0,
  exactAssetReady: false,
  autoRecommendationEligible: false,
  drafts: {
    "side-lying-straight-leg-lift": {
      intendedExerciseId: "original-mat-side-leg-lift",
      variant: "양다리를 편 옆누움 다리 들기 · 도해용 머리 받침 포함",
      sourceIds: ["ruh-lateral-hip-side-abduction-v1"],
      sources: [
        {
          label:
            "RUH Bath · Lateral Hip Pain · Side Lying Hip Abduction (p.10)",
          url: "https://www.ruh.nhs.uk/patients/services/physiotherapy/documents/PHY067_Lateral_hip_pain.pdf",
        },
      ],
      matched: [
        "옆으로 누워 양다리를 펴고 위쪽 다리를 들었다 처음 배치로 돌아오는 패턴",
      ],
      unknown: [
        "원문은 머리·팔 지지와 바닥 종류를 정하지 않음",
        "매트·머리 받침·지지 팔·발목 자세·골반 고정·수치와 투영은 제작 선택이며 전문 검토 전임",
      ],
      mismatched: [
        "기존 소도구 없음 기록에 도해용 머리 받침이 포함되어 있지 않음",
      ],
      supportNote:
        "매트와 도해용 머리 받침을 표시했습니다. 받침은 원문 필수 조건이 아닌 제작 선택입니다.",
    },
    "side-lying-open-book": {
      intendedExerciseId: "original-mat-open-book",
      variant: "무릎 굽힌 옆누움 오픈 북 · 흉곽·팔 회전과 머리 방향 포함",
      sourceIds: [
        "dynamichealth-midback-open-book-v1",
        "leeds-chest-wall-open-book-v1",
      ],
      sources: [
        {
          label:
            "Dynamic Health NHS · Mid back pain · Side lying rotation (open book)",
          url: "https://www.dynamichealth.nhs.uk/help-and-advice/mid-back-pain/",
        },
        {
          label: "Leeds Teaching Hospitals · Chest wall symptoms · Open book",
          url: "https://www.leedsth.nhs.uk/patients/resources/physiotherapy-exercises-for-breast-pain-with-chest-wall-musculoskeletal-symptoms/",
        },
      ],
      matched: [
        "무릎을 굽힌 옆누움에서 앞에 모은 손으로 시작하고 위쪽 팔을 위·반대쪽으로 열었다 돌아옴",
        "위쪽 어깨·흉곽 회전과 팔을 따라 바뀌는 머리 방향을 별도로 표시함",
        "아래 다리와 포갠 무릎 지지는 움직이지 않으며 팔의 바닥 접촉을 강제하지 않음",
      ],
      unknown: [
        "개별 척추·견갑골·목 관절의 움직임과 개인별 가동 범위는 모델링하지 않음",
        "머리 중심을 받침 위에 고정하고 방향만 돌린 것은 제작 단순화임",
        "매트·머리 받침·각도·속도·신체 비율과 안전성은 전문 검토 전임",
      ],
      mismatched: [
        "기존 소도구 없음 기록에 도해용 머리 받침이 포함되어 있지 않음",
        "Leeds의 무릎-바닥 문구는 아래 무릎의 매트 접촉과 위 무릎의 포갬으로 단순화했으며 양 무릎의 동시 바닥 접촉을 재현하지 않음",
      ],
      supportNote:
        "무릎은 포갠 지지를 유지합니다. 머리 받침은 원문에 없는 제작 선택이며 위쪽 손은 바닥에 닿지 않습니다.",
    },
  },
});

export interface LateralLeg {
  anatomicalSide: AnatomicalSide;
  placement: "top" | "bottom";
  hip: Point3;
  knee: Point3;
  ankle: Point3;
  heel: Point3;
  toe: Point3;
}
export interface LateralArm {
  anatomicalSide: AnatomicalSide;
  placement: "top" | "bottom";
  shoulder: Point3;
  elbow: Point3;
  hand: Point3;
}
export interface LateralContact {
  id: string;
  side: AnatomicalSide | null;
  target: "mat" | "head-pad" | "bottom-hand" | "bottom-knee";
  state: "fixed" | "released";
  /** Both points are actual schematic surfaces, not skeletal joint centers. */
  point: Point3;
  targetPoint: Point3;
  bodyCenter: Point3;
  surfaceOffset: Point3;
}
export interface LateralWorld {
  topHip: Point3;
  topKnee: Point3;
  topAnkle: Point3;
  topHeel: Point3;
  topToe: Point3;
  bottomHip: Point3;
  bottomKnee: Point3;
  bottomAnkle: Point3;
  bottomHeel: Point3;
  bottomToe: Point3;
  topShoulder: Point3;
  topElbow: Point3;
  topHand: Point3;
  bottomShoulder: Point3;
  bottomElbow: Point3;
  bottomHand: Point3;
  pelvisCenter: Point3;
  chestCenter: Point3;
  headCenter: Point3;
  nose: Point3;
}
export interface LateralDraftPose {
  draftId: LateralDraftId;
  exerciseId: "original-mat-side-leg-lift" | "original-mat-open-book";
  modelVersion: string;
  progress: number;
  phase: DraftPhase;
  phaseLabelKo: string;
  activeSide: AnatomicalSide;
  supportSide: AnatomicalSide;
  mirrored: boolean;
  amount: number;
  angles: {
    upperLegLiftRad: number;
    thoraxOpeningRad: number;
    armSweepRad: number;
    headTurnRad: number;
  };
  camera: {
    projection: "authored-oblique-orthographic";
    mirrored: boolean;
    width: 640;
  };
  legs: Record<AnatomicalSide, LateralLeg>;
  arms: Record<AnatomicalSide, LateralArm>;
  world: LateralWorld;
  screen: Record<keyof LateralWorld, ScreenPoint>;
  torsoRings: readonly (readonly Point3[])[];
  contacts: readonly LateralContact[];
  supports: readonly {
    id: "mat" | "head-pad";
    labelKo: string;
    sourceRequirement: "catalog-mat" | "authoring-choice";
    topZ: number;
    corners: readonly Point3[];
  }[];
  review: { status: "unreviewed"; professionalReviewCount: 0 };
  exactAssetReady: false;
  safetyAssessment: "unassessed";
  autoRecommendationEligible: false;
}

const clone = (p: Point3): Point3 => [...p];
const add = (a: Point3, b: Point3): Point3 => [
  a[0] + b[0],
  a[1] + b[1],
  a[2] + b[2],
];
const scale = (a: Point3, n: number): Point3 => [a[0] * n, a[1] * n, a[2] * n];
const rotateX = (p: Point3, angle: number): Point3 => [
  p[0],
  p[1] * Math.cos(angle) - p[2] * Math.sin(angle),
  p[1] * Math.sin(angle) + p[2] * Math.cos(angle),
];
const rotateLift = (p: Point3, angle: number): Point3 => [
  p[0] * Math.cos(angle) - p[2] * Math.sin(angle),
  p[1],
  p[0] * Math.sin(angle) + p[2] * Math.cos(angle),
];
const smooth = (t: number) => t * t * (3 - 2 * t);
function amountAt(p: number): number {
  if (p <= 0.12 || p >= 0.88) return 0;
  if (p < 0.42) return smooth((p - 0.12) / 0.3);
  if (p <= 0.58) return 1;
  return 1 - smooth((p - 0.58) / 0.3);
}

/** x: head to feet; y: across the mat; z: above mat z=0. Mirror is camera only. */
export function projectLateralPoint(
  point: Point3,
  mirrored = false,
): ScreenPoint {
  const x = point[0] + point[1] * 0.12;
  return [mirrored ? 640 - x : x, 268 + point[1] * 0.35 - point[2]];
}

function leg(
  side: AnatomicalSide,
  placement: "top" | "bottom",
  points: readonly Point3[],
): LateralLeg {
  return {
    anatomicalSide: side,
    placement,
    hip: clone(points[0]),
    knee: clone(points[1]),
    ankle: clone(points[2]),
    heel: clone(points[3]),
    toe: clone(points[4]),
  };
}
function arm(
  side: AnatomicalSide,
  placement: "top" | "bottom",
  shoulder: Point3,
  elbow: Point3,
  hand: Point3,
): LateralArm {
  return {
    anatomicalSide: side,
    placement,
    shoulder: clone(shoulder),
    elbow: clone(elbow),
    hand: clone(hand),
  };
}
function contact(
  id: string,
  side: AnatomicalSide | null,
  target: LateralContact["target"],
  bodyCenter: Point3,
  surfaceOffset: Point3,
  targetPoint: Point3,
  state: LateralContact["state"] = "fixed",
): LateralContact {
  return {
    id,
    side,
    target,
    state,
    bodyCenter: clone(bodyCenter),
    surfaceOffset: clone(surfaceOffset),
    point: add(bodyCenter, surfaceOffset),
    targetPoint: clone(targetPoint),
  };
}

/** Analytic rigid segments, not a musculoskeletal simulation or movement clearance. */
export function getLateralDraftPose(
  id: LateralDraftId,
  progress: number,
  {
    activeSide = "right",
    mirrored = false,
  }: { activeSide?: AnatomicalSide; mirrored?: boolean } = {},
): LateralDraftPose {
  if (!LATERAL_DRAFT_IDS.includes(id))
    throw new TypeError("unknown lateral draft ID");
  if (!Number.isFinite(progress))
    throw new TypeError("progress must be finite");
  if (activeSide !== "left" && activeSide !== "right")
    throw new TypeError("activeSide must be left or right");
  if (typeof mirrored !== "boolean")
    throw new TypeError("mirrored must be boolean");
  const p = Math.max(0, Math.min(1, progress));
  const q = amountAt(p);
  const isLift = id === "side-lying-straight-leg-lift";
  const supportSide: AnatomicalSide = activeSide === "left" ? "right" : "left";
  const liftAngle = isLift ? 0.42 * q : 0;
  const thoraxAngle = isLift ? 0 : 0.8 * q;
  const armSweep = isLift ? 0 : 2.5 * q;
  const headTurn = isLift ? 0 : 2.4 * q;
  const bottomHip: Point3 = [285, 0, 28];
  const topHip: Point3 = [285, 0, 62];
  let top: LateralLeg;
  let bottom: LateralLeg;
  if (isLift) {
    // Entire straight leg and dorsiflexed foot rotate rigidly about its fixed hip.
    const atTop = (offset: Point3) =>
      add(topHip, rotateLift(offset, liftAngle));
    top = leg(activeSide, "top", [
      topHip,
      atTop([112, 0, 0]),
      atTop([220, 0, 0]),
      atTop([224, -4, -4]),
      atTop([216, 27, 0]),
    ]);
    const supportDirection: Point3 = [
      Math.sqrt(1 - (16 / 220) ** 2),
      0,
      -16 / 220,
    ];
    const knee = add(bottomHip, scale(supportDirection, 112));
    const ankle = add(bottomHip, scale(supportDirection, 220));
    bottom = leg(supportSide, "bottom", [
      bottomHip,
      knee,
      ankle,
      add(ankle, [4, -4, -4]),
      add(ankle, [-4, 27, 0]),
    ]);
  } else {
    // Both bent legs stay fixed throughout; no clam-like top-knee opening.
    bottom = leg(supportSide, "bottom", [
      bottomHip,
      [355, 85, 14],
      [439, 18, 12],
      [443, 14, 8],
      [448, 46, 12],
    ]);
    top = leg(activeSide, "top", [
      topHip,
      [355, 85, 42],
      [439, 18, 40],
      [443, 14, 36],
      [448, 46, 40],
    ]);
  }

  const bottomShoulder: Point3 = [183, 0, 28];
  // The shoulder bar rotates about the lower shoulder. Pelvis and lower shoulder
  // remain fixed while the upper shoulder and ribcage really change world points.
  const topShoulder = add(bottomShoulder, rotateX([0, 0, 36], thoraxAngle));
  let lowerArm: LateralArm;
  let upperArm: LateralArm;
  if (isLift) {
    lowerArm = arm(
      supportSide,
      "bottom",
      bottomShoulder,
      [150, 49, 12],
      [105, 22, 12],
    );
    upperArm = arm(
      activeSide,
      "top",
      topShoulder,
      [222, 44, 27],
      [274, 43, 10],
    );
  } else {
    const front: Point3 = [0, 128, 12];
    lowerArm = arm(
      supportSide,
      "bottom",
      bottomShoulder,
      add(bottomShoulder, scale(front, 0.5)),
      add(bottomShoulder, front),
    );
    const upperVector = rotateX([0, 128, -12], armSweep);
    upperArm = arm(
      activeSide,
      "top",
      topShoulder,
      add(topShoulder, scale(upperVector, 0.5)),
      add(topShoulder, upperVector),
    );
  }
  const headCenter: Point3 = [113, 0, 36];
  const nose = add(headCenter, rotateX([0, 24, 0], headTurn));
  const pelvisCenter: Point3 = [285, 0, 45];
  const chestCenter = add(bottomShoulder, rotateX([0, 0, 18], thoraxAngle));
  const world: LateralWorld = {
    topHip: top.hip,
    topKnee: top.knee,
    topAnkle: top.ankle,
    topHeel: top.heel,
    topToe: top.toe,
    bottomHip: bottom.hip,
    bottomKnee: bottom.knee,
    bottomAnkle: bottom.ankle,
    bottomHeel: bottom.heel,
    bottomToe: bottom.toe,
    topShoulder: upperArm.shoulder,
    topElbow: upperArm.elbow,
    topHand: upperArm.hand,
    bottomShoulder: lowerArm.shoulder,
    bottomElbow: lowerArm.elbow,
    bottomHand: lowerArm.hand,
    pelvisCenter,
    chestCenter,
    headCenter,
    nose,
  };
  const screen = Object.fromEntries(
    Object.entries(world).map(([key, point]) => [
      key,
      projectLateralPoint(point, mirrored),
    ]),
  ) as Record<keyof LateralWorld, ScreenPoint>;
  const contacts: LateralContact[] = [
    contact(
      "head-pad",
      null,
      "head-pad",
      headCenter,
      [0, 0, -24],
      [113, 0, 12],
    ),
    contact(
      "lower-shoulder-mat",
      supportSide,
      "mat",
      bottomShoulder,
      [0, 0, -28],
      [183, 0, 0],
    ),
    contact(
      "lower-pelvis-mat",
      supportSide,
      "mat",
      bottom.hip,
      [0, 0, -28],
      [285, 0, 0],
    ),
    contact(
      "lower-knee-mat",
      supportSide,
      "mat",
      bottom.knee,
      [0, 0, -bottom.knee[2]],
      [bottom.knee[0], bottom.knee[1], 0],
    ),
    contact(
      "lower-heel-mat",
      supportSide,
      "mat",
      bottom.heel,
      [0, 0, -8],
      [bottom.heel[0], bottom.heel[1], 0],
    ),
  ];
  if (isLift) {
    contacts.push(
      contact(
        "front-hand-mat",
        activeSide,
        "mat",
        upperArm.hand,
        [0, 0, -10],
        [274, 43, 0],
      ),
    );
  } else {
    contacts.push(
      contact(
        "knees-together",
        activeSide,
        "bottom-knee",
        top.knee,
        [0, 0, -14],
        add(bottom.knee, [0, 0, 14]),
      ),
    );
    contacts.push(
      contact(
        "hands-together",
        activeSide,
        "bottom-hand",
        upperArm.hand,
        [0, 0, -6],
        add(lowerArm.hand, [0, 0, 6]),
        q === 0 ? "fixed" : "released",
      ),
    );
  }
  const ring = (
    x: number,
    centerZ: number,
    radiusY: number,
    radiusZ: number,
    angle: number,
  ): readonly Point3[] =>
    (
      [
        [0, -radiusY, 0],
        [0, 0, radiusZ],
        [0, radiusY, 0],
        [0, 0, -radiusZ],
      ] as const
    ).map((offset) =>
      add([x, 0, 28], rotateX(add([0, 0, centerZ - 28], offset), angle)),
    );
  const torsoRings = [
    // This surface is a schematic twist ribbon; individual vertebrae are unmodeled.
    ring(183, 46, 15, 31, thoraxAngle),
    ring(234, 45, 13, 27, thoraxAngle * 0.45),
    ring(285, 45, 17, 31, 0),
  ];
  return {
    draftId: id,
    exerciseId: isLift
      ? "original-mat-side-leg-lift"
      : "original-mat-open-book",
    modelVersion: LATERAL_MODEL_VERSION,
    progress: p,
    phase:
      LATERAL_PHASES[id].find((phase) => p < phase.end) ??
      LATERAL_PHASES[id].at(-1)!,
    phaseLabelKo: (
      LATERAL_PHASES[id].find((phase) => p < phase.end) ??
      LATERAL_PHASES[id].at(-1)!
    ).label,
    activeSide,
    supportSide,
    mirrored,
    amount: q,
    angles: {
      upperLegLiftRad: liftAngle,
      thoraxOpeningRad: thoraxAngle,
      armSweepRad: armSweep,
      headTurnRad: headTurn,
    },
    camera: {
      projection: "authored-oblique-orthographic",
      mirrored,
      width: 640,
    },
    legs: { [activeSide]: top, [supportSide]: bottom } as Record<
      AnatomicalSide,
      LateralLeg
    >,
    arms: { [activeSide]: upperArm, [supportSide]: lowerArm } as Record<
      AnatomicalSide,
      LateralArm
    >,
    world,
    screen,
    torsoRings,
    contacts,
    supports: [
      {
        id: "mat",
        labelKo: "매트",
        sourceRequirement: "catalog-mat",
        topZ: 0,
        corners: [
          [54, -165, 0],
          [554, -165, 0],
          [554, 160, 0],
          [54, 160, 0],
        ],
      },
      {
        id: "head-pad",
        labelKo: "머리 받침 · 제작 선택",
        sourceRequirement: "authoring-choice",
        topZ: 12,
        corners: [
          [80, -28, 12],
          [147, -28, 12],
          [147, 28, 12],
          [80, 28, 12],
        ],
      },
    ],
    review: { status: "unreviewed", professionalReviewCount: 0 },
    exactAssetReady: false,
    safetyAssessment: "unassessed",
    autoRecommendationEligible: false,
  };
}
