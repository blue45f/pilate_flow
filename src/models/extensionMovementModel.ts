import type {
  CatalogMovementVisualAsset,
  PhasePoseSpec,
  Point2D,
  RigJointMap,
  VisualPhaseId,
} from '../data/movementVisualRigCatalog';
import type {
  ExtensionArchetypeKey,
  ExtensionMovementFamily,
  ExtensionMovementId,
  ExtensionSupportSurface,
} from '../data/extensionDiagramSources';

export interface ExtensionJointAxisSpec {
  readonly id: string;
  readonly joint: keyof RigJointMap;
  readonly labelKo: string;
  readonly role:
    | 'primary-extension-axis'
    | 'stabilizing-pelvic-axis'
    | 'contralateral-hip-shoulder-axis';
  readonly point: Point2D;
  readonly noteKo: string;
}

export interface ExtensionContactPointSpec {
  readonly id: string;
  readonly joint: keyof RigJointMap;
  readonly surface: ExtensionSupportSurface;
  readonly status: 'anchored' | 'gliding-support' | 'hover-airborne';
  readonly labelKo: string;
  readonly point: Point2D;
}

export interface ExtensionCalloutLabelSpec {
  readonly id: string;
  readonly labelKo: string;
  readonly targetJoint: keyof RigJointMap;
  readonly anchorPoint: Point2D;
  readonly offsetPoint: Point2D;
  readonly tone: 'alignment' | 'caution' | 'breath';
}

export interface ExtensionPhaseSpec extends PhasePoseSpec {
  readonly supportSurface: ExtensionSupportSurface;
  readonly family: ExtensionMovementFamily;
  readonly jointAxes: readonly ExtensionJointAxisSpec[];
  readonly contactPoints: readonly ExtensionContactPointSpec[];
  readonly calloutLabels: readonly ExtensionCalloutLabelSpec[];
}

export interface ExtensionMovementDiagramSpec {
  readonly movementId: ExtensionMovementId;
  readonly archetypeKey: ExtensionArchetypeKey;
  readonly isolatedArchetypeId: string;
  readonly family: ExtensionMovementFamily;
  readonly supportSurface: ExtensionSupportSurface;
  readonly apparatus: CatalogMovementVisualAsset['apparatus'];
  readonly nameKo: string;
  readonly nameEn: string;
  readonly isUnilateral: boolean;
  readonly phases: {
    readonly start: ExtensionPhaseSpec;
    readonly middle: ExtensionPhaseSpec;
    readonly end: ExtensionPhaseSpec;
  };
  readonly catalogAsset: CatalogMovementVisualAsset;
}

export interface ExtensionPoseInput {
  readonly phaseId?: VisualPhaseId;
  readonly shortTitleKo?: string;
  readonly summaryKo?: string;
  readonly joints: RigJointMap;
  readonly supportSurface?: ExtensionSupportSurface;
  readonly family?: ExtensionMovementFamily;
  readonly fixedAnchors?: PhasePoseSpec['fixedAnchors'];
  readonly apparatusState?: PhasePoseSpec['apparatusState'];
}

export interface ExtensionPhaseAlignmentReport {
  readonly passed: boolean;
  readonly isValid: boolean;
  readonly supportSurface: ExtensionSupportSurface;
  readonly family: ExtensionMovementFamily;
  readonly pubicAnchorContactValid: boolean;
  readonly axialElongationValid: boolean;
  readonly cervicalThoracicContinuityValid: boolean;
  readonly noLumbarHingeCompression: boolean;
  readonly lengthOverHeightValid: boolean;
  readonly pelvicAnchorTargetY: number;
  readonly pelvicAnchorErrorPx: number;
  readonly lumbarLocalHingeDeg: number;
  readonly lumbarSagBelowPelvisPx: number;
  readonly cervicalDeviationFromThoracicDeg: number;
  readonly thoracicOverLumbarLiftRatio: number;
  readonly spinalAxialLengthPx: number;
  readonly armHorizontalReachPx: number;
  readonly armVerticalLiftPx: number;
  readonly legHorizontalReachPx: number;
  readonly legVerticalLiftPx: number;
  readonly violations: readonly string[];
}

export interface ExtensionMovementSpecVerificationReport {
  readonly movementId: string;
  readonly passed: boolean;
  readonly isValid: boolean;
  readonly pelvicAnchorVerticalDriftPx: number;
  readonly pelvicCarriageSyncDriftPx: number;
  readonly phaseReports: Readonly<Record<VisualPhaseId, ExtensionPhaseAlignmentReport>>;
  readonly violations: readonly string[];
}

export const SUPPORT_SURFACE_ANCHOR_Y: Readonly<Record<ExtensionSupportSurface, number>> =
  Object.freeze({
    mat: 144,
    'reformer-box': 116,
    'cadillac-table': 142,
    'ladder-barrel': 104,
  });

const VIEWBOX_WIDTH = 320;

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function segmentLength(a: Point2D, b: Point2D): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

function vectorAngleBetweenDeg(v1: Point2D, v2: Point2D): number {
  const len1 = Math.hypot(v1.x, v1.y);
  const len2 = Math.hypot(v2.x, v2.y);
  if (len1 < 1e-6 || len2 < 1e-6) return 0;
  const cosTheta = Math.max(-1, Math.min(1, (v1.x * v2.x + v1.y * v2.y) / (len1 * len2)));
  return round1((Math.acos(cosTheta) * 180) / Math.PI);
}

export function inferSupportSurfaceFromPose(pose: ExtensionPoseInput): ExtensionSupportSurface {
  if (pose.supportSurface) return pose.supportSurface;
  const surfaceKo = pose.apparatusState?.supportSurfaceKo ?? '';
  if (surfaceKo.includes('롱박스') || surfaceKo.includes('리포머')) return 'reformer-box';
  if (surfaceKo.includes('캐딜락')) return 'cadillac-table';
  if (surfaceKo.includes('바렐')) return 'ladder-barrel';
  if (surfaceKo.includes('매트')) return 'mat';

  const py = pose.joints.pelvis.y;
  if (Math.abs(py - 104) <= 6) return 'ladder-barrel';
  if (Math.abs(py - 116) <= 6) return 'reformer-box';
  if (Math.abs(py - 142) <= 1) return 'cadillac-table';
  return 'mat';
}

export function inferExtensionFamilyFromPose(pose: ExtensionPoseInput): ExtensionMovementFamily {
  if (pose.family) return pose.family;
  const text = `${pose.shortTitleKo ?? ''} ${pose.summaryKo ?? ''}`.toLowerCase();
  if (text.includes('스위밍') || text.includes('swimming') || text.includes('교차')) {
    return 'swimming';
  }
  return 'swan';
}

export function verifyExtensionPhaseAlignment(
  pose: ExtensionPoseInput,
  options?: {
    supportSurface?: ExtensionSupportSurface;
    family?: ExtensionMovementFamily;
    maxLumbarHingeDeg?: number;
    maxCervicalDeviationDeg?: number;
    pelvicAnchorTolerancePx?: number;
  },
): ExtensionPhaseAlignmentReport {
  const supportSurface = options?.supportSurface ?? inferSupportSurfaceFromPose(pose);
  const family = options?.family ?? inferExtensionFamilyFromPose(pose);
  const maxLumbarHingeDeg =
    options?.maxLumbarHingeDeg ?? (family === 'swimming' ? 14 : 18);
  const maxCervicalDeviationDeg = options?.maxCervicalDeviationDeg ?? 18;
  const pelvicAnchorTolerancePx = options?.pelvicAnchorTolerancePx ?? 3;

  const { joints } = pose;
  const violations: string[] = [];

  // 1. Pubic symphysis / ASIS anchor contact on support surface
  const pelvicAnchorTargetY = SUPPORT_SURFACE_ANCHOR_Y[supportSurface];
  const pelvicAnchorErrorPx = round1(Math.abs(joints.pelvis.y - pelvicAnchorTargetY));
  const fixedPelvicAnchorMatched =
    !pose.fixedAnchors ||
    pose.fixedAnchors.length === 0 ||
    pose.fixedAnchors.some(
      (anchor) =>
        (anchor.joint === 'pelvis' || anchor.joint === 'hip') &&
        Math.abs(anchor.point.y - pelvicAnchorTargetY) <= pelvicAnchorTolerancePx,
    );
  const pubicAnchorContactValid =
    pelvicAnchorErrorPx <= pelvicAnchorTolerancePx && fixedPelvicAnchorMatched;
  if (!pubicAnchorContactValid) {
    violations.push(
      `pubic-anchor-drift: pelvis.y(${joints.pelvis.y}) deviates from ${supportSurface} anchor y=${pelvicAnchorTargetY} by ${pelvicAnchorErrorPx}px`,
    );
  }

  // 2. Lumbar local hinge & abdominal lift (absence of lumbar hinge compression)
  const vPelvisToLumbar: Point2D = {
    x: joints.lumbar.x - joints.pelvis.x,
    y: joints.lumbar.y - joints.pelvis.y,
  };
  const vLumbarToThoracic: Point2D = {
    x: joints.thoracic.x - joints.lumbar.x,
    y: joints.thoracic.y - joints.lumbar.y,
  };
  const lumbarLocalHingeDeg = vectorAngleBetweenDeg(vPelvisToLumbar, vLumbarToThoracic);
  const lumbarSagBelowPelvisPx = round1(Math.max(0, joints.lumbar.y - joints.pelvis.y));

  const lumbarLiftPx = Math.max(0, joints.pelvis.y - joints.lumbar.y);
  const thoracicLiftPx = Math.max(0, joints.lumbar.y - joints.neck.y);
  const thoracicOverLumbarLiftRatio = round1(
    lumbarLiftPx <= 0.5 ? thoracicLiftPx / 0.5 : thoracicLiftPx / lumbarLiftPx,
  );

  const ratioOk = thoracicLiftPx < 6 || thoracicOverLumbarLiftRatio >= 1.15;
  const noLumbarHingeCompression =
    lumbarLocalHingeDeg <= maxLumbarHingeDeg &&
    lumbarSagBelowPelvisPx <= 1.5 &&
    ratioOk;

  if (lumbarLocalHingeDeg > maxLumbarHingeDeg) {
    violations.push(
      `lumbar-hinge-compression: local hinge ${lumbarLocalHingeDeg}° exceeds max ${maxLumbarHingeDeg}°`,
    );
  }
  if (lumbarSagBelowPelvisPx > 1.5) {
    violations.push(
      `lumbar-anterior-sag: lumbar sags ${lumbarSagBelowPelvisPx}px below pelvis anchor`,
    );
  }
  if (!ratioOk) {
    violations.push(
      `lumbar-dominant-extension: thoracic/lumbar lift ratio ${thoracicOverLumbarLiftRatio} is below 1.15`,
    );
  }

  // 3. Cervical-thoracic slope continuity (no chin-jutting or cervical crank)
  const vThoracicToNeck: Point2D = {
    x: joints.neck.x - joints.thoracic.x,
    y: joints.neck.y - joints.thoracic.y,
  };
  const vNeckToHead: Point2D = {
    x: joints.head.x - joints.neck.x,
    y: joints.head.y - joints.neck.y,
  };
  const cervicalDeviationFromThoracicDeg = vectorAngleBetweenDeg(vThoracicToNeck, vNeckToHead);
  const sameHorizontalDirection =
    Math.sign(vThoracicToNeck.x) !== 0 &&
    Math.sign(vThoracicToNeck.x) === Math.sign(vNeckToHead.x);
  const headNotDropped = joints.head.y <= joints.neck.y + 2;
  const cervicalThoracicContinuityValid =
    cervicalDeviationFromThoracicDeg <= maxCervicalDeviationDeg &&
    sameHorizontalDirection &&
    headNotDropped;

  if (!cervicalThoracicContinuityValid) {
    violations.push(
      `cervical-hyperextension-or-crank: cervical deviation ${cervicalDeviationFromThoracicDeg}° (sameDir=${String(sameHorizontalDirection)})`,
    );
  }

  // 4. Axial elongation & Swimming length-over-height
  const dirSign = Math.sign(joints.pelvis.x - joints.head.x);
  const monotonicSpineX =
    dirSign > 0
      ? joints.head.x < joints.neck.x &&
        joints.neck.x < joints.thoracic.x &&
        joints.thoracic.x < joints.lumbar.x &&
        joints.lumbar.x < joints.pelvis.x
      : dirSign < 0
        ? joints.head.x > joints.neck.x &&
          joints.neck.x > joints.thoracic.x &&
          joints.thoracic.x > joints.lumbar.x &&
          joints.lumbar.x > joints.pelvis.x
        : false;

  const spinalAxialLengthPx = round1(
    segmentLength(joints.pelvis, joints.lumbar) +
      segmentLength(joints.lumbar, joints.thoracic) +
      segmentLength(joints.thoracic, joints.neck) +
      segmentLength(joints.neck, joints.head),
  );
  const horizontalSpineSpanPx = Math.abs(joints.pelvis.x - joints.head.x);

  const armHorizontalReachPx = round1(Math.abs(joints.shoulder.x - joints.hand.x));
  const armVerticalLiftPx = round1(Math.max(0, joints.shoulder.y - joints.hand.y));
  const legHorizontalReachPx = round1(
    Math.max(
      Math.abs(joints.toe.x - joints.hip.x),
      joints.farToe && joints.farHip ? Math.abs(joints.farToe.x - joints.farHip.x) : 0,
    ),
  );
  const legVerticalLiftPx = round1(
    Math.max(
      Math.max(0, joints.hip.y - joints.toe.y),
      joints.farToe && joints.farHip ? Math.max(0, joints.farHip.y - joints.farToe.y) : 0,
    ),
  );

  const lengthOverHeightValid =
    family === 'swimming'
      ? armHorizontalReachPx > armVerticalLiftPx * 1.5 &&
        legHorizontalReachPx > legVerticalLiftPx * 1.5
      : true;

  const axialElongationValid =
    monotonicSpineX &&
    horizontalSpineSpanPx >= 64 &&
    spinalAxialLengthPx >= 72 &&
    spinalAxialLengthPx <= 145 &&
    lengthOverHeightValid;

  if (!axialElongationValid) {
    violations.push(
      `axial-elongation-compromised: monotonicX=${String(monotonicSpineX)}, span=${horizontalSpineSpanPx}px, length=${spinalAxialLengthPx}px, lengthOverHeight=${String(lengthOverHeightValid)}`,
    );
  }

  const passed =
    pubicAnchorContactValid &&
    noLumbarHingeCompression &&
    cervicalThoracicContinuityValid &&
    axialElongationValid;

  return Object.freeze({
    passed,
    isValid: passed,
    supportSurface,
    family,
    pubicAnchorContactValid,
    axialElongationValid,
    cervicalThoracicContinuityValid,
    noLumbarHingeCompression,
    lengthOverHeightValid,
    pelvicAnchorTargetY,
    pelvicAnchorErrorPx,
    lumbarLocalHingeDeg,
    lumbarSagBelowPelvisPx,
    cervicalDeviationFromThoracicDeg,
    thoracicOverLumbarLiftRatio,
    spinalAxialLengthPx,
    armHorizontalReachPx,
    armVerticalLiftPx,
    legHorizontalReachPx,
    legVerticalLiftPx,
    violations: Object.freeze(violations),
  });
}

export function buildHyperextendedLumbarCounterExample<T extends ExtensionPoseInput>(
  pose: T,
): T {
  const supportSurface = inferSupportSurfaceFromPose(pose);
  const family = inferExtensionFamilyFromPose(pose);
  const baseJoints = pose.joints;
  const pelvis = baseJoints.pelvis;
  const dir = Math.sign(pelvis.x - baseJoints.head.x) || 1;

  // Sharp lumbar sag + hinge compression + cervical crank (head thrown back)
  const badPelvis: Point2D = {
    x: pelvis.x,
    y: pelvis.y + 6,
  };
  const badLumbar: Point2D = {
    x: pelvis.x - dir * 16,
    y: badPelvis.y + 9, // Sags 9px below pelvis (anterior pelvic dump)
  };
  const badThoracic: Point2D = {
    x: badLumbar.x - dir * 10,
    y: badLumbar.y - 30, // Sharp upward hinge from lumbar
  };
  const badNeck: Point2D = {
    x: badThoracic.x - dir * 10,
    y: badThoracic.y - 20,
  };
  const badHead: Point2D = {
    x: badNeck.x + dir * 4, // Cranked backward (chin jutting / cervical hyperextension)
    y: badNeck.y - 18,
  };

  const counterJoints: RigJointMap = Object.freeze({
    ...baseJoints,
    pelvis: badPelvis,
    lumbar: badLumbar,
    thoracic: badThoracic,
    neck: badNeck,
    head: badHead,
    ...(family === 'swimming'
      ? {
          // Excessive vertical flailing over horizontal reach
          hand: {
            x: baseJoints.shoulder.x - dir * 16,
            y: baseJoints.shoulder.y - 42,
          },
          toe: {
            x: baseJoints.hip.x + dir * 24,
            y: baseJoints.hip.y - 46,
          },
        }
      : {}),
  });

  const result = {
    ...pose,
    supportSurface,
    family,
    shortTitleKo: `${pose.shortTitleKo ?? '신전 자세'} · [반례] 요추 과신전 꺾임 & 경추 젖힘`,
    summaryKo:
      '복부 리프트 없이 요추 한 지점이 꺾여 내려앉고 턱을 들어 경추를 과신전한 주의 반례 도해입니다.',
    joints: counterJoints,
  };

  return Object.freeze(result) as T;
}

export function verifyExtensionMovementSpec(
  spec: ExtensionMovementDiagramSpec,
): ExtensionMovementSpecVerificationReport {
  const startReport = verifyExtensionPhaseAlignment(spec.phases.start, {
    supportSurface: spec.supportSurface,
    family: spec.family,
  });
  const middleReport = verifyExtensionPhaseAlignment(spec.phases.middle, {
    supportSurface: spec.supportSurface,
    family: spec.family,
  });
  const endReport = verifyExtensionPhaseAlignment(spec.phases.end, {
    supportSurface: spec.supportSurface,
    family: spec.family,
  });

  const pelvisYValues = [
    spec.phases.start.joints.pelvis.y,
    spec.phases.middle.joints.pelvis.y,
    spec.phases.end.joints.pelvis.y,
  ];
  const pelvicAnchorVerticalDriftPx = round1(
    Math.max(...pelvisYValues) - Math.min(...pelvisYValues),
  );

  const startPelvisX = spec.phases.start.joints.pelvis.x;
  const startCarriage = spec.phases.start.apparatusState.carriageOffsetPx;

  const middleExpectedPelvisX =
    startPelvisX + (spec.phases.middle.apparatusState.carriageOffsetPx - startCarriage);
  const endExpectedPelvisX =
    startPelvisX + (spec.phases.end.apparatusState.carriageOffsetPx - startCarriage);

  const pelvicCarriageSyncDriftPx = round1(
    Math.max(
      Math.abs(spec.phases.middle.joints.pelvis.x - middleExpectedPelvisX),
      Math.abs(spec.phases.end.joints.pelvis.x - endExpectedPelvisX),
    ),
  );

  const violations: string[] = [
    ...startReport.violations.map((v) => `start:${v}`),
    ...middleReport.violations.map((v) => `middle:${v}`),
    ...endReport.violations.map((v) => `end:${v}`),
  ];

  if (pelvicAnchorVerticalDriftPx > 2) {
    violations.push(
      `pelvic-vertical-drift: ${pelvicAnchorVerticalDriftPx}px > 2px across phases`,
    );
  }
  if (pelvicCarriageSyncDriftPx > 2) {
    violations.push(
      `pelvic-carriage-sync-drift: ${pelvicCarriageSyncDriftPx}px > 2px across phases`,
    );
  }

  const passed =
    startReport.passed &&
    middleReport.passed &&
    endReport.passed &&
    pelvicAnchorVerticalDriftPx <= 2 &&
    pelvicCarriageSyncDriftPx <= 2;

  return Object.freeze({
    movementId: spec.movementId,
    passed,
    isValid: passed,
    pelvicAnchorVerticalDriftPx,
    pelvicCarriageSyncDriftPx,
    phaseReports: Object.freeze({
      start: startReport,
      middle: middleReport,
      end: endReport,
    }),
    violations: Object.freeze(violations),
  });
}

function lerpPoint(a: Point2D, b: Point2D, t: number): Point2D {
  return {
    x: round1(a.x + (b.x - a.x) * t),
    y: round1(a.y + (b.y - a.y) * t),
  };
}

function mirrorPoint(pt: Point2D, mirrored: boolean): Point2D {
  return {
    x: mirrored ? round1(VIEWBOX_WIDTH - pt.x) : pt.x,
    y: pt.y,
  };
}

export function evaluateExtensionPhasePose(
  spec: ExtensionMovementDiagramSpec,
  options?: {
    phase?: VisualPhaseId;
    progress?: number;
    activeSide?: 'left' | 'right';
    mirrored?: boolean;
  },
): ExtensionPhaseSpec {
  const activeSide = options?.activeSide ?? 'right';
  const mirrored = options?.mirrored ?? false;

  let basePhase: ExtensionPhaseSpec;
  if (typeof options?.progress === 'number' && Number.isFinite(options.progress)) {
    const p = Math.max(0, Math.min(1, options.progress));
    const fromPhase = p <= 0.5 ? spec.phases.start : spec.phases.middle;
    const toPhase = p <= 0.5 ? spec.phases.middle : spec.phases.end;
    const localT = p <= 0.5 ? p * 2 : (p - 0.5) * 2;

    const jointKeys = Object.keys(fromPhase.joints) as (keyof RigJointMap)[];
    const interpJoints: Record<string, Point2D> = {};
    for (const key of jointKeys) {
      const a = fromPhase.joints[key];
      const b = toPhase.joints[key] ?? a;
      if (a && b) {
        interpJoints[key] = lerpPoint(a, b, localT);
      }
    }
    basePhase = {
      ...(p < 0.25 ? spec.phases.start : p < 0.75 ? spec.phases.middle : spec.phases.end),
      joints: Object.freeze(interpJoints as unknown as RigJointMap),
    };
  } else {
    const phaseId = options?.phase ?? 'middle';
    basePhase = spec.phases[phaseId];
  }

  let transformedJoints: RigJointMap = basePhase.joints;

  // If unilateral/swimming and activeSide === 'left', swap near and far limb joints
  if (activeSide === 'left') {
    transformedJoints = Object.freeze({
      ...transformedJoints,
      shoulder: basePhase.joints.farShoulder ?? basePhase.joints.shoulder,
      elbow: basePhase.joints.farElbow ?? basePhase.joints.elbow,
      wrist: basePhase.joints.farWrist ?? basePhase.joints.wrist,
      hip: basePhase.joints.farHip ?? basePhase.joints.hip,
      knee: basePhase.joints.farKnee ?? basePhase.joints.knee,
      ankle: basePhase.joints.farAnkle ?? basePhase.joints.ankle,
      toe: basePhase.joints.farToe ?? basePhase.joints.toe,
      farShoulder: basePhase.joints.shoulder,
      farElbow: basePhase.joints.elbow,
      farWrist: basePhase.joints.wrist,
      farHip: basePhase.joints.hip,
      farKnee: basePhase.joints.knee,
      farAnkle: basePhase.joints.ankle,
      farToe: basePhase.joints.toe,
    });
  }

  if (mirrored) {
    const mirroredMap: Record<string, Point2D> = {};
    for (const [k, pt] of Object.entries(transformedJoints) as [string, Point2D | undefined][]) {
      if (pt) {
        mirroredMap[k] = mirrorPoint(pt, true);
      }
    }
    transformedJoints = Object.freeze(mirroredMap as unknown as RigJointMap);
  }

  return Object.freeze({
    ...basePhase,
    joints: transformedJoints,
    fixedAnchors: Object.freeze(
      basePhase.fixedAnchors.map((a) =>
        Object.freeze({
          ...a,
          point: mirrorPoint(a.point, mirrored),
        }),
      ),
    ),
    jointAxes: Object.freeze(
      basePhase.jointAxes.map((axis) =>
        Object.freeze({
          ...axis,
          point: mirrorPoint(axis.point, mirrored),
        }),
      ),
    ),
    contactPoints: Object.freeze(
      basePhase.contactPoints.map((cp) =>
        Object.freeze({
          ...cp,
          point: mirrorPoint(cp.point, mirrored),
        }),
      ),
    ),
    calloutLabels: Object.freeze(
      basePhase.calloutLabels.map((lbl) =>
        Object.freeze({
          ...lbl,
          anchorPoint: mirrorPoint(lbl.anchorPoint, mirrored),
          offsetPoint: mirrorPoint(lbl.offsetPoint, mirrored),
        }),
      ),
    ),
  });
}
