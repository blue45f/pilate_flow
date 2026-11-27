/**
 * Zero-dependency glTF 2.0 Binary (`.glb`) Skinned Humanoid Parser &
 * Real-Time 21-Bone Pilates Biomechanics Retargeter (60fps+ TypedArray LBS + Volume Preservation).
 *
 * Architecture:
 * - Parses standard glTF 2.0 `.glb` directly via `DataView` / TypedArrays (zero Three.js dependency).
 * - Extracts `POSITION`, `NORMAL`, `JOINTS_0`, `WEIGHTS_0`, `COLOR_0`, `TEXCOORD_0`, `indices`,
 *   `skins[0].joints`, `skins[0].inverseBindMatrices`, and node hierarchy.
 * - Precomputes canonical bind-pose frames & export-axis correction offsets once at load time so
 *   `M_world[i] * IBM[i]` reproduces the rest pose to 6 decimal places and maps cleanly from
 *   glTF Y-up (+Z forward) into Pilates Studio Z-up coordinates with zero gimbal lock or limb twist.
 * - Emits smooth-normal, vertex-colored `StudioQuadFace[]` (`verts: [v0, v1, v2, v2]`) with exact
 *   `materialRole` (`'skin' | 'fabric' | 'hair' | 'gloss'`) so existing WebGPU (`Studio3DWebGPURenderer`),
 *   WebGL2 (`Studio3DWebGL2Renderer`), and Canvas2D pipelines render the skinned character natively at 60fps+.
 * - Browser singleton async loader (`loadSharedSkinnedHumanoidAsset`) silently resolves `null` in
 *   SSR / jsdom / offline environments for seamless fallback to the procedural 28-station mesh.
 */

import type { ActiveMuscleZone3D } from '../data/universal3dExerciseRigs';
import { MOTION_STUDIO_RGB } from './motionStudioMaterials';
import type {
  Rgb,
  StudioMaterialRole,
  StudioQuadFace,
  StudioWebGLShaderMode,
  Vec3,
} from './studio3dWebgl2Renderer';

export const DEFAULT_SKINNED_HUMANOID_GLB_URL =
  '/models/pilates-studio/instructor-skinned-v5.glb';

export type SkinnedMuscleRegion = 'none' | 'core' | 'glutes' | 'legs' | 'shoulders';

export const ANATOMICAL_MUSCLE_ZONES = [
  'core',
  'obliques',
  'back',
  'glutes',
  'quads',
  'hamstrings',
  'adductors',
  'shoulders',
  'calves',
] as const;

export type AnatomicalMuscleZone = ActiveMuscleZone3D | 'hamstrings' | 'calves';

export const ANATOMICAL_MUSCLE_ZONE_COUNT = ANATOMICAL_MUSCLE_ZONES.length;

export const MUSCLE_ZONE_INDEX: Readonly<Record<AnatomicalMuscleZone, number>> = {
  core: 0,
  obliques: 1,
  back: 2,
  glutes: 3,
  quads: 4,
  hamstrings: 5,
  adductors: 6,
  shoulders: 7,
  calves: 8,
};

/** Non-medical, non-diagnostic Korean Pilates coaching labels for all 9 anatomical zones. */
export const MUSCLE_ZONE_LABELS_KO: Readonly<Record<AnatomicalMuscleZone, string>> = {
  core: '복부 심부',
  obliques: '측면 복사근',
  back: '등·척추 신전근',
  glutes: '둔근',
  quads: '허벅지 앞쪽',
  hamstrings: '허벅지 뒤쪽',
  adductors: '허벅지 안쪽',
  shoulders: '어깨·견갑대',
  calves: '종아리·발목',
};

/** Warm botanical terracotta-amber heatmap accent aligned with Calm Atelier palette. */
export const HEATMAP_TERRACOTTA_RGB: Rgb = [218, 114, 72];

export interface MuscleHeatmapTelemetry {
  readonly primaryZonesKo: string[];
  readonly activationPct: number;
  readonly phaseCueKo: string;
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return value < 0 ? 0 : value > 1 ? 1 : value;
}

/**
 * Pose-excursion-synced anatomical activation curve (`[0.36, 1.0]`):
 * `poseT = 0` is neutral start/finish posture (`0.36` readable baseline),
 * smoothly ramping to peak activation (`1.0`) at `poseT = 1` (`02 정점 유지`).
 */
export function computeMuscleActivationCurve(poseT: number): number {
  const t = clamp01(poseT);
  return 0.36 + 0.64 * Math.pow(t, 0.78);
}

export type MuscleHeatmapCyclePhaseId = 'setup' | 'move' | 'turn' | 'return' | 'finish';

/**
 * Pure Korean coaching telemetry for the real-time 9-zone muscle activation heatmap
 * (strictly non-medical, non-diagnostic Pilates alignment cues).
 */
export function computeMuscleHeatmapTelemetry(
  activeZones: readonly AnatomicalMuscleZone[],
  poseT: number,
  cyclePhaseId?: MuscleHeatmapCyclePhaseId,
): MuscleHeatmapTelemetry {
  const seen = new Set<AnatomicalMuscleZone>();
  const primaryZonesKo: string[] = [];
  for (const zone of activeZones) {
    if (seen.has(zone)) continue;
    const label = MUSCLE_ZONE_LABELS_KO[zone];
    if (label) {
      seen.add(zone);
      primaryZonesKo.push(label);
    }
  }

  const t = clamp01(poseT);
  if (primaryZonesKo.length === 0) {
    return {
      primaryZonesKo,
      activationPct: 0,
      phaseCueKo: '전신 정렬 유지 구간',
    };
  }

  const activationPct = Math.round(computeMuscleActivationCurve(t) * 100);
  let phaseCueKo: string;
  if (cyclePhaseId === 'setup') {
    phaseCueKo = '시작 자세 정렬 · 호흡 준비';
  } else if (cyclePhaseId === 'move') {
    phaseCueKo = '움직임 전개 · 중심 안정';
  } else if (cyclePhaseId === 'turn') {
    phaseCueKo = '최대 활성 구간 · 호흡과 조절';
  } else if (cyclePhaseId === 'return') {
    phaseCueKo = '천천히 복귀 · 정렬 유지';
  } else if (cyclePhaseId === 'finish') {
    phaseCueKo = '마무리 정렬 · 호흡 정리';
  } else if (t < 0.2) {
    phaseCueKo = '시작 자세 정렬 · 호흡 준비';
  } else if (t < 0.8) {
    phaseCueKo = '움직임 전개 · 중심 안정';
  } else {
    phaseCueKo = '최대 활성 구간 · 호흡과 조절';
  }

  return {
    primaryZonesKo,
    activationPct,
    phaseCueKo,
  };
}

/** Reads the precomputed `[0, 1]` Gaussian anatomical muscle weight for a vertex and zone. */
export function getVertexMuscleWeight(
  asset: SkinnedHumanoidAsset,
  vertexIndex: number,
  zone: AnatomicalMuscleZone,
): number {
  if (vertexIndex < 0 || vertexIndex >= asset.vertexCount) return 0;
  return asset.vertexMuscleWeights[vertexIndex * ANATOMICAL_MUSCLE_ZONE_COUNT + MUSCLE_ZONE_INDEX[zone]] ?? 0;
}

export interface SkinnedHumanoidRigJoints {
  readonly pelvis: Vec3;
  readonly spineMid: Vec3;
  readonly chest: Vec3;
  readonly headPos: Vec3;
  readonly headAnt: Vec3;
  readonly neckUp: Vec3;
  readonly bodyRight: Vec3;
  readonly pelvisRight: Vec3;
  readonly lSh: Vec3;
  readonly lElb: Vec3;
  readonly lWr: Vec3;
  readonly rSh: Vec3;
  readonly rElb: Vec3;
  readonly rWr: Vec3;
  readonly lHip: Vec3;
  readonly lKnee: Vec3;
  readonly lAnkle: Vec3;
  readonly rHip: Vec3;
  readonly rKnee: Vec3;
  readonly rAnkle: Vec3;
  readonly lKneeBend: Vec3;
  readonly rKneeBend: Vec3;
  readonly lElbowBend: Vec3;
  readonly rElbowBend: Vec3;
  readonly breathScale?: number;
}

export interface SkinnedHumanoidRenderOptions {
  readonly shader: StudioWebGLShaderMode;
  readonly activeZones: readonly AnatomicalMuscleZone[];
  readonly phaseT: number;
  readonly showBiomechOverlay?: boolean;
  /** Enables high-clarity 9-zone botanical terracotta-amber muscle activation heatmap. Default: false. */
  readonly showMuscleHeatmap?: boolean;
}

export interface SkinnedHumanoidAsset {
  readonly vertexCount: number;
  readonly triangleCount: number;
  readonly jointCount: number;
  readonly jointNames: readonly string[];
  readonly jointIndexByName: ReadonlyMap<string, number>;
  readonly parentIndices: Int16Array;
  readonly positions: Float32Array;
  readonly normals: Float32Array;
  readonly joints: Uint16Array;
  readonly weights: Float32Array;
  /** sRGB 0..255 vertex colors (3 bytes per vertex) */
  readonly colorsSrgb: Uint8Array;
  readonly texcoords: Float32Array;
  readonly indices: Uint32Array;
  /** Column-major 4x4 inverse bind matrices (`16 * jointCount`) */
  readonly inverseBindMatrices: Float32Array;
  /** Precomputed bind-pose head positions in glTF Y-up (`3 * jointCount`) */
  readonly bindHeadPos: Float32Array;
  /** Precomputed canonical bind-pose unit direction per bone (`3 * jointCount`) */
  readonly bindDir: Float32Array;
  /** Precomputed canonical bind-pose segment length per bone (`jointCount`) */
  readonly bindLength: Float32Array;
  /** Precomputed 3x3 offset `R_canon_bind^T * R_bind_exported` (`9 * jointCount`) */
  readonly bindRotOffset: Float32Array;
  /** Precomputed per-triangle material role & legacy 4-region classification */
  readonly triRoles: readonly StudioMaterialRole[];
  readonly triMuscleRegions: readonly SkinnedMuscleRegion[];
  /**
   * Precomputed 9-zone smooth per-vertex Gaussian anatomical muscle weights (`vertexCount * 9`),
   * ordered by `ANATOMICAL_MUSCLE_ZONES` (`core`, `obliques`, `back`, `glutes`, `quads`,
   * `hamstrings`, `adductors`, `shoulders`, `calves`), each in `[0, 1]`.
   */
  readonly vertexMuscleWeights: Float32Array;
  /** Approximate bind-pose bounding box in glTF Y-up */
  readonly bindBounds: {
    readonly min: Vec3;
    readonly max: Vec3;
  };
}

// ==============================================================================
// 1. MINIMAL GLTF 2.0 BINARY (.GLB) PARSER
// ==============================================================================

interface GltfBufferView {
  readonly buffer: number;
  readonly byteOffset?: number;
  readonly byteLength: number;
  readonly byteStride?: number;
}

interface GltfAccessor {
  readonly bufferView?: number;
  readonly byteOffset?: number;
  readonly componentType: number;
  readonly normalized?: boolean;
  readonly count: number;
  readonly type: 'SCALAR' | 'VEC2' | 'VEC3' | 'VEC4' | 'MAT4';
}

interface GltfPrimitive {
  readonly attributes: Readonly<Record<string, number>>;
  readonly indices?: number;
  readonly material?: number;
}

interface GltfNode {
  readonly name?: string;
  readonly children?: readonly number[];
}

interface GltfSkin {
  readonly joints: readonly number[];
  readonly inverseBindMatrices?: number;
}

interface GltfMaterial {
  readonly pbrMetallicRoughness?: {
    readonly baseColorFactor?: readonly number[];
  };
}

interface GltfDocumentJson {
  readonly bufferViews?: readonly GltfBufferView[];
  readonly accessors?: readonly GltfAccessor[];
  readonly meshes?: readonly { readonly primitives: readonly GltfPrimitive[] }[];
  readonly nodes?: readonly GltfNode[];
  readonly skins?: readonly GltfSkin[];
  readonly materials?: readonly GltfMaterial[];
}

const GLB_MAGIC = 0x46546c67; // 'glTF'
const GLB_CHUNK_JSON = 0x4e4f534a; // 'JSON'
const GLB_CHUNK_BIN = 0x004e4942; // 'BIN\0'

const TYPE_COMPONENTS: Record<GltfAccessor['type'], number> = {
  SCALAR: 1,
  VEC2: 2,
  VEC3: 3,
  VEC4: 4,
  MAT4: 16,
};

function componentByteSize(componentType: number): number {
  switch (componentType) {
    case 5120: // BYTE
    case 5121: // UNSIGNED_BYTE
      return 1;
    case 5122: // SHORT
    case 5123: // UNSIGNED_SHORT
      return 2;
    case 5125: // UNSIGNED_INT
    case 5126: // FLOAT
      return 4;
    default:
      throw new Error(`Unsupported glTF componentType: ${componentType}`);
  }
}

function readComponentValue(
  view: DataView,
  byteOffset: number,
  componentType: number,
  normalized: boolean,
): number {
  switch (componentType) {
    case 5126:
      return view.getFloat32(byteOffset, true);
    case 5121: {
      const v = view.getUint8(byteOffset);
      return normalized ? v / 255 : v;
    }
    case 5123: {
      const v = view.getUint16(byteOffset, true);
      return normalized ? v / 65535 : v;
    }
    case 5125:
      return view.getUint32(byteOffset, true);
    case 5120: {
      const v = view.getInt8(byteOffset);
      return normalized ? Math.max(-1, v / 127) : v;
    }
    case 5122: {
      const v = view.getInt16(byteOffset, true);
      return normalized ? Math.max(-1, v / 32767) : v;
    }
    default:
      throw new Error(`Unsupported glTF componentType: ${componentType}`);
  }
}

function readAccessorAsFloat32(
  gltf: GltfDocumentJson,
  binView: DataView,
  accessorIndex: number,
  forceNormalized = false,
): { readonly data: Float32Array; readonly numComponents: number; readonly count: number } {
  const accessor = gltf.accessors?.[accessorIndex];
  if (!accessor || accessor.bufferView === undefined) {
    throw new Error(`Invalid glTF accessor index: ${accessorIndex}`);
  }
  const bv = gltf.bufferViews?.[accessor.bufferView];
  if (!bv) {
    throw new Error(`Invalid glTF bufferView index: ${accessor.bufferView}`);
  }
  const numComponents = TYPE_COMPONENTS[accessor.type];
  const compBytes = componentByteSize(accessor.componentType);
  const baseOffset = (bv.byteOffset ?? 0) + (accessor.byteOffset ?? 0);
  const stride = bv.byteStride ?? numComponents * compBytes;
  const normalized = Boolean(accessor.normalized || forceNormalized);
  const out = new Float32Array(accessor.count * numComponents);

  for (let i = 0; i < accessor.count; i++) {
    const elemOff = baseOffset + i * stride;
    for (let c = 0; c < numComponents; c++) {
      out[i * numComponents + c] = readComponentValue(
        binView,
        elemOff + c * compBytes,
        accessor.componentType,
        normalized,
      );
    }
  }
  return { data: out, numComponents, count: accessor.count };
}

function readAccessorAsUint32(
  gltf: GltfDocumentJson,
  binView: DataView,
  accessorIndex: number,
): Uint32Array {
  const accessor = gltf.accessors?.[accessorIndex];
  if (!accessor || accessor.bufferView === undefined) {
    throw new Error(`Invalid glTF index accessor: ${accessorIndex}`);
  }
  const bv = gltf.bufferViews?.[accessor.bufferView];
  if (!bv) {
    throw new Error(`Invalid glTF bufferView index: ${accessor.bufferView}`);
  }
  const numComponents = TYPE_COMPONENTS[accessor.type];
  const compBytes = componentByteSize(accessor.componentType);
  const baseOffset = (bv.byteOffset ?? 0) + (accessor.byteOffset ?? 0);
  const stride = bv.byteStride ?? numComponents * compBytes;
  const out = new Uint32Array(accessor.count * numComponents);

  for (let i = 0; i < accessor.count; i++) {
    const elemOff = baseOffset + i * stride;
    for (let c = 0; c < numComponents; c++) {
      out[i * numComponents + c] = Math.round(
        readComponentValue(binView, elemOff + c * compBytes, accessor.componentType, false),
      );
    }
  }
  return out;
}

function linearToSrgbByte(lin: number): number {
  const c = Math.max(0, Math.min(1, lin));
  const s = c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
  return Math.max(0, Math.min(255, Math.round(s * 255)));
}

// ==============================================================================
// 2. LINEAR ALGEBRA HELPERS (COLUMN-MAJOR 4x4 & 3x3)
// ==============================================================================

function vSub(a: Vec3, b: Vec3): Vec3 {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

function vAdd(a: Vec3, b: Vec3): Vec3 {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}

function vScale(a: Vec3, s: number): Vec3 {
  return [a[0] * s, a[1] * s, a[2] * s];
}

function vDot(a: Vec3, b: Vec3): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

function vCross(a: Vec3, b: Vec3): Vec3 {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
}

function vLen(a: Vec3): number {
  return Math.hypot(a[0], a[1], a[2]);
}

function vNorm(a: Vec3, fallback: Vec3 = [0, 0, 1]): Vec3 {
  const l = vLen(a);
  return l > 1e-6 ? [a[0] / l, a[1] / l, a[2] / l] : fallback;
}

function vLerp(a: Vec3, b: Vec3, t: number): Vec3 {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

function bezier3Vec(p0: Vec3, p1: Vec3, p2: Vec3, t: number): Vec3 {
  const u = 1 - t;
  return [
    u * u * p0[0] + 2 * u * t * p1[0] + t * t * p2[0],
    u * u * p0[1] + 2 * u * t * p1[1] + t * t * p2[1],
    u * u * p0[2] + 2 * u * t * p1[2] + t * t * p2[2],
  ];
}

/**
 * Shortest-arc vector transport: rotates vector `v` by the minimal rotation taking unit `fromDir` to `toDir`.
 * Eliminates gimbal lock and axis flips across full 360-degree overhead/supine/inverted Pilates ROM.
 */
function parallelTransport(v: Vec3, fromDir: Vec3, toDir: Vec3): Vec3 {
  const f = vNorm(fromDir);
  const t = vNorm(toDir);
  const c = Math.max(-1, Math.min(1, vDot(f, t)));
  if (c > 0.99999) return vNorm(v);
  if (c < -0.99999) {
    // 180-degree turnaround around an axis orthogonal to f
    const ortho = Math.abs(f[2]) < 0.85 ? vCross(f, [0, 0, 1]) : vCross(f, [1, 0, 0]);
    const axis = vNorm(ortho);
    const proj = vDot(v, axis);
    return vNorm(vSub(vScale(axis, 2 * proj), v));
  }
  const axis = vCross(f, t);
  const s = vLen(axis);
  const k = vScale(axis, 1 / s);
  const kDotV = vDot(k, v);
  const kCrossV = vCross(k, v);
  // Rodrigues' rotation formula: v*cos + (k x v)*sin + k*(k.v)*(1 - cos)
  const oneMinusC = 1 - c;
  return vNorm([
    v[0] * c + kCrossV[0] * s + k[0] * kDotV * oneMinusC,
    v[1] * c + kCrossV[1] * s + k[1] * kDotV * oneMinusC,
    v[2] * c + kCrossV[2] * s + k[2] * kDotV * oneMinusC,
  ]);
}

/**
 * Builds an exact right-handed 3x3 orthonormal bone basis (column-major 9 floats: [eX, eY, eZ]):
 *   eY = unit bone axis (head -> tail)
 *   eZ = orthogonalized hint (anterior / patella / foot-up)
 *   eX = eY x eZ  (guarantees eX x eY = eZ, det = +1)
 */
function buildCanonicalBoneBasis(dir: Vec3, hint: Vec3): readonly [Vec3, Vec3, Vec3] {
  const eY = vNorm(dir, [0, 1, 0]);
  let zProj = vSub(hint, vScale(eY, vDot(hint, eY)));
  if (vLen(zProj) < 1e-4) {
    const fallback: Vec3 = Math.abs(eY[2]) < 0.85 ? [0, 0, 1] : [1, 0, 0];
    zProj = vSub(fallback, vScale(eY, vDot(fallback, eY)));
  }
  const eZ = vNorm(zProj);
  const eX = vNorm(vCross(eY, eZ));
  return [eX, eY, eZ];
}

/** Inverts a column-major 4x4 affine matrix (`m[3]=m[7]=m[11]=0, m[15]=1`). */
function invertAffine4x4(
  m: Float32Array,
  offset: number,
  out = new Float32Array(16),
): Float32Array {
  const a00 = m[offset]!;
  const a10 = m[offset + 1]!;
  const a20 = m[offset + 2]!;
  const a01 = m[offset + 4]!;
  const a11 = m[offset + 5]!;
  const a21 = m[offset + 6]!;
  const a02 = m[offset + 8]!;
  const a12 = m[offset + 9]!;
  const a22 = m[offset + 10]!;
  const tx = m[offset + 12]!;
  const ty = m[offset + 13]!;
  const tz = m[offset + 14]!;

  const c00 = a11 * a22 - a12 * a21;
  const c01 = a12 * a20 - a10 * a22;
  const c02 = a10 * a21 - a11 * a20;
  const det = a00 * c00 + a01 * c01 + a02 * c02;
  const invDet = Math.abs(det) > 1e-12 ? 1 / det : 1;

  const r00 = c00 * invDet;
  const r01 = (a02 * a21 - a01 * a22) * invDet;
  const r02 = (a01 * a12 - a02 * a11) * invDet;
  const r10 = c01 * invDet;
  const r11 = (a00 * a22 - a02 * a20) * invDet;
  const r12 = (a02 * a10 - a00 * a12) * invDet;
  const r20 = c02 * invDet;
  const r21 = (a01 * a20 - a00 * a21) * invDet;
  const r22 = (a00 * a11 - a01 * a10) * invDet;

  out[0] = r00;
  out[1] = r10;
  out[2] = r20;
  out[3] = 0;
  out[4] = r01;
  out[5] = r11;
  out[6] = r21;
  out[7] = 0;
  out[8] = r02;
  out[9] = r12;
  out[10] = r22;
  out[11] = 0;
  out[12] = -(r00 * tx + r01 * ty + r02 * tz);
  out[13] = -(r10 * tx + r11 * ty + r12 * tz);
  out[14] = -(r20 * tx + r21 * ty + r22 * tz);
  out[15] = 1;
  return out;
}

/** Extracts a unit quaternion `(qx, qy, qz, qw)` from a right-handed 3x3 rotation matrix (columns c0, c1, c2). */
function rot3ToQuat(
  m00: number,
  m10: number,
  m20: number,
  m01: number,
  m11: number,
  m21: number,
  m02: number,
  m12: number,
  m22: number,
  out: Float32Array,
  off: number,
): void {
  const tr = m00 + m11 + m22;
  let qx: number;
  let qy: number;
  let qz: number;
  let qw: number;
  if (tr > 0) {
    const s = Math.sqrt(tr + 1) * 2;
    qw = 0.25 * s;
    qx = (m21 - m12) / s;
    qy = (m02 - m20) / s;
    qz = (m10 - m01) / s;
  } else if (m00 > m11 && m00 > m22) {
    const s = Math.sqrt(Math.max(1e-12, 1 + m00 - m11 - m22)) * 2;
    qw = (m21 - m12) / s;
    qx = 0.25 * s;
    qy = (m01 + m10) / s;
    qz = (m02 + m20) / s;
  } else if (m11 > m22) {
    const s = Math.sqrt(Math.max(1e-12, 1 + m11 - m00 - m22)) * 2;
    qw = (m02 - m20) / s;
    qx = (m01 + m10) / s;
    qy = 0.25 * s;
    qz = (m12 + m21) / s;
  } else {
    const s = Math.sqrt(Math.max(1e-12, 1 + m22 - m00 - m11)) * 2;
    qw = (m10 - m01) / s;
    qx = (m02 + m20) / s;
    qy = (m12 + m21) / s;
    qz = 0.25 * s;
  }
  const l = Math.hypot(qx, qy, qz, qw) || 1;
  out[off] = qx / l;
  out[off + 1] = qy / l;
  out[off + 2] = qz / l;
  out[off + 3] = qw / l;
}

// Anatomical primary child mapping to recover exact bind-pose bone segments
const PRIMARY_CHILD_BONE: Readonly<Record<string, string>> = {
  Pelvis: 'SpineLower',
  SpineLower: 'SpineUpper',
  SpineUpper: 'Chest',
  Chest: 'Neck',
  Neck: 'Head',
  Shoulder_L: 'UpperArm_L',
  UpperArm_L: 'Forearm_L',
  Forearm_L: 'Hand_L',
  Shoulder_R: 'UpperArm_R',
  UpperArm_R: 'Forearm_R',
  Forearm_R: 'Hand_R',
  Thigh_L: 'Shin_L',
  Shin_L: 'Foot_L',
  Thigh_R: 'Shin_R',
  Shin_R: 'Foot_R',
};

const LEAF_DEFAULT_LENGTH: Readonly<Record<string, number>> = {
  Head: 0.16,
  Ponytail: 0.192,
  Hand_L: 0.13,
  Hand_R: 0.13,
  Foot_L: 0.145,
  Foot_R: 0.145,
};

function classifyBandRole(bandIdx: number): StudioMaterialRole {
  if (bandIdx === 5) return 'skin';
  if (bandIdx === 13 || bandIdx === 14) return 'hair';
  if (bandIdx === 12) return 'gloss';
  return 'fabric';
}

function smoothstepRange(edge0: number, edge1: number, x: number): number {
  const denom = edge1 - edge0;
  if (Math.abs(denom) < 1e-8) return x >= edge1 ? 1 : 0;
  const t = clamp01((x - edge0) / denom);
  return t * t * (3 - 2 * t);
}

/** 발바닥이 바닥을 떠날 때 발목을 연속적으로 펴고, 착지하며 다시 수평을 맞춘다. */
export function resolveStudioFootFrame(ankleHeight: number, shinDown: Vec3, shinFront: Vec3) {
  const shinUp = vScale(shinDown, -1);
  const lift = smoothstepRange(0.17, 0.31, ankleHeight);
  const tucked = (1 - smoothstepRange(-0.42, -0.08, shinFront[2]))
    * (1 - smoothstepRange(0.28, 0.44, ankleHeight));
  const relaxedDegrees = 10 + 16 * lift;
  const angle = (relaxedDegrees + (62 - relaxedDegrees) * tucked) * Math.PI / 180;
  const pointed = vAdd(vScale(shinFront, Math.cos(angle)), vScale(shinDown, Math.sin(angle)));
  const instep = vAdd(vScale(shinUp, Math.cos(angle)), vScale(shinFront, Math.sin(angle)));
  const contact = (1 - smoothstepRange(0.095, 0.19, ankleHeight))
    * smoothstepRange(0.32, 0.6, shinUp[2]);
  const horizontal = vNorm([shinFront[0], shinFront[1], 0], [1, 0, 0]);
  const alignment = Math.max(-1, Math.min(1, vDot(pointed, horizontal)));
  const tangent = vNorm(vSub(horizontal, vScale(pointed, alignment)), instep);
  const turn = Math.acos(alignment) * contact;
  const forward = vNorm(vAdd(vScale(pointed, Math.cos(turn)), vScale(tangent, Math.sin(turn))));
  const upHint = vLerp(instep, [0, 0, 1], contact);
  const lateral = vNorm(vCross(forward, upHint), [0, 1, 0]);
  return { forward, up: vNorm(vCross(lateral, forward)) };
}

function gaussianWeight(delta: number, sigma: number): number {
  const ratio = delta / sigma;
  return Math.exp(-0.5 * ratio * ratio);
}

/**
 * Computes 9 anatomically accurate per-vertex Gaussian muscle weight fields once at GLB load time
 * from rest-pose positions `(x, y, z)`, outward unit normals `(nx, ny, nz)`, UV atlas bands,
 * bind-pose joint landmarks, and normalized bone skinning weights.
 */
function computeVertexMuscleWeightFields(params: {
  readonly vertexCount: number;
  readonly positions: Float32Array;
  readonly normals: Float32Array;
  readonly joints: Uint16Array;
  readonly weights: Float32Array;
  readonly texcoords: Float32Array;
  readonly bindHeadPos: Float32Array;
  readonly jointIndexByName: ReadonlyMap<string, number>;
}): Float32Array {
  const {
    vertexCount,
    positions,
    normals,
    joints,
    weights,
    texcoords,
    bindHeadPos,
    jointIndexByName,
  } = params;

  const field = new Float32Array(vertexCount * ANATOMICAL_MUSCLE_ZONE_COUNT);

  const headX = (name: string, fallback: number): number => {
    const ji = jointIndexByName.get(name);
    return ji !== undefined ? bindHeadPos[ji * 3]! : fallback;
  };
  const headY = (name: string, fallback: number): number => {
    const ji = jointIndexByName.get(name);
    return ji !== undefined ? bindHeadPos[ji * 3 + 1]! : fallback;
  };

  const jPelvis = jointIndexByName.get('Pelvis') ?? -1;
  const jSpL = jointIndexByName.get('SpineLower') ?? -1;
  const jSpU = jointIndexByName.get('SpineUpper') ?? -1;
  const jChest = jointIndexByName.get('Chest') ?? -1;
  const jShL = jointIndexByName.get('Shoulder_L') ?? -1;
  const jShR = jointIndexByName.get('Shoulder_R') ?? -1;
  const jUaL = jointIndexByName.get('UpperArm_L') ?? -1;
  const jUaR = jointIndexByName.get('UpperArm_R') ?? -1;
  const jThL = jointIndexByName.get('Thigh_L') ?? -1;
  const jThR = jointIndexByName.get('Thigh_R') ?? -1;
  const jShinL = jointIndexByName.get('Shin_L') ?? -1;
  const jShinR = jointIndexByName.get('Shin_R') ?? -1;
  const jFootL = jointIndexByName.get('Foot_L') ?? -1;
  const jFootR = jointIndexByName.get('Foot_R') ?? -1;

  const excludedJoints = new Set<number>();
  for (const name of ['Head', 'Ponytail', 'Neck', 'Forearm_L', 'Forearm_R', 'Hand_L', 'Hand_R']) {
    const ji = jointIndexByName.get(name);
    if (ji !== undefined) excludedJoints.add(ji);
  }

  // Bind-pose anatomical Y/X landmarks in glTF Y-up (+Z anterior, ±X bilateral)
  const yPelvis = headY('Pelvis', 0.889);
  const ySpL = headY('SpineLower', 1.0);
  const ySpU = headY('SpineUpper', 1.137);
  const yChest = headY('Chest', 1.253);
  const yNeck = headY('Neck', 1.369);
  const yKnee = 0.5 * (headY('Shin_L', 0.465) + headY('Shin_R', 0.465));
  const yAnkle = 0.5 * (headY('Foot_L', 0.053) + headY('Foot_R', 0.053));
  const xThigh = 0.5 * (Math.abs(headX('Thigh_L', 0.088)) + Math.abs(headX('Thigh_R', -0.088)));
  const xShin = 0.5 * (Math.abs(headX('Shin_L', 0.092)) + Math.abs(headX('Shin_R', -0.092)));
  const xSh = 0.5 * (Math.abs(headX('UpperArm_L', 0.148)) + Math.abs(headX('UpperArm_R', -0.148)));
  const ySh = 0.5 * (headY('UpperArm_L', 1.311) + headY('UpperArm_R', 1.311));
  const xElb = 0.5 * (Math.abs(headX('Forearm_L', 0.368)) + Math.abs(headX('Forearm_R', -0.368)));

  const yCoreCenter = 0.5 * (ySpL + ySpU);
  const yOblCenter = ySpL + 0.065;
  const yBackCenter = 0.5 * (ySpU + yChest) - 0.015;
  const yGluteCenter = yPelvis - 0.018;
  const thighSpan = Math.max(0.25, yPelvis - yKnee);
  const shinSpan = Math.max(0.25, yKnee - yAnkle);
  const yQuadCenter = yKnee + thighSpan * 0.52;
  const yHamCenter = yKnee + thighSpan * 0.45;
  const yAddCenter = yKnee + thighSpan * 0.58;
  const yCalfCenter = yAnkle + shinSpan * 0.62;

  for (let vi = 0; vi < vertexCount; vi++) {
    // Exclude gloss (eyes/lips: band 12) and hair/brows (bands 13, 14)
    const u = texcoords[vi * 2] ?? 0;
    const vg = texcoords[vi * 2 + 1] ?? 0;
    const col = Math.max(0, Math.min(3, Math.floor(u * 4)));
    const row = Math.max(0, Math.min(3, Math.floor((1 - vg) * 4)));
    const band = row * 4 + col;
    if (band === 12 || band === 13 || band === 14) continue;

    let wPelvis = 0;
    let wSpL = 0;
    let wSpU = 0;
    let wChest = 0;
    let wSh = 0;
    let wUa = 0;
    let wTh = 0;
    let wShin = 0;
    let wFoot = 0;
    let wExcl = 0;

    const i4 = vi * 4;
    for (let k = 0; k < 4; k++) {
      const w = weights[i4 + k]!;
      if (w <= 1e-5) continue;
      const ji = joints[i4 + k]!;
      if (ji === jPelvis) wPelvis += w;
      else if (ji === jSpL) wSpL += w;
      else if (ji === jSpU) wSpU += w;
      else if (ji === jChest) wChest += w;
      else if (ji === jShL || ji === jShR) wSh += w;
      else if (ji === jUaL || ji === jUaR) wUa += w;
      else if (ji === jThL || ji === jThR) wTh += w;
      else if (ji === jShinL || ji === jShinR) wShin += w;
      else if (ji === jFootL || ji === jFootR) wFoot += w;
      else if (excludedJoints.has(ji)) wExcl += w;
    }

    const keepBody = 1 - clamp01(wExcl * 2.0);
    if (keepBody <= 0.01) continue;

    const i3 = vi * 3;
    const x = positions[i3]!;
    const y = positions[i3 + 1]!;
    const z = positions[i3 + 2]!;
    const nx = normals[i3]!;
    const ny = normals[i3 + 1]!;
    const nz = normals[i3 + 2]!;
    const absX = Math.abs(x);
    const latOut = x >= 0 ? nx : -nx;
    const medIn = -latOut;
    const neckCutoff = 1 - smoothstepRange(yNeck - 0.025, yNeck - 0.002, y);

    const out = vi * ANATOMICAL_MUSCLE_ZONE_COUNT;

    // 0: core (rectus & transversus abdominis — anterior abdomen)
    const coreBone =
      clamp01(wSpL + wSpU * 0.95 + wPelvis * 0.72 + wChest * 0.25) * (1 - clamp01(wUa + wSh));
    field[out] = clamp01(
      gaussianWeight(y - yCoreCenter, 0.098) *
        gaussianWeight(absX, 0.072) *
        smoothstepRange(0.18, 0.72, nz) *
        smoothstepRange(-0.015, 0.032, z) *
        coreBone *
        keepBody,
    );

    // 1: obliques (external/internal obliques — lateral waist flanks)
    const oblBone =
      clamp01(wSpL + wSpU + wPelvis * 0.65 + wChest * 0.25) * (1 - clamp01(wUa + wSh));
    field[out + 1] = clamp01(
      gaussianWeight(y - yOblCenter, 0.088) *
        smoothstepRange(0.048, 0.092, absX) *
        smoothstepRange(0.36, 0.82, latOut) *
        smoothstepRange(-0.6, 0.12, nz) *
        oblBone *
        keepBody,
    );

    // 2: back (erector spinae, lats & thoracic posterior torso)
    const backBone =
      clamp01(wSpL + wSpU + wChest + wPelvis * 0.2) * (1 - clamp01(wUa + wSh * 0.35));
    field[out + 2] = clamp01(
      gaussianWeight(y - yBackCenter, 0.138) *
        smoothstepRange(yPelvis + 0.035, ySpL + 0.035, y) *
        gaussianWeight(absX, 0.105) *
        smoothstepRange(0.2, 0.72, -nz) *
        smoothstepRange(0.012, -0.032, z) *
        backBone *
        neckCutoff *
        keepBody,
    );

    // 3: glutes (gluteus maximus & medius — posterior/posterolateral pelvis)
    const gluteBone = clamp01(wPelvis + wTh * 0.85 + wSpL * 0.22);
    field[out + 3] = clamp01(
      gaussianWeight(y - yGluteCenter, 0.074) *
        smoothstepRange(yPelvis - 0.165, yPelvis - 0.075, y) *
        gaussianWeight(absX - 0.055, 0.074) *
        smoothstepRange(-0.02, 0.58, -nz) *
        smoothstepRange(0.01, -0.035, z) *
        gluteBone *
        keepBody,
    );

    // 4: quads (quadriceps femoris — anterior thigh)
    const quadBone = clamp01(wTh + wPelvis * 0.2 + wShin * 0.1);
    const yQuadBounds =
      smoothstepRange(yKnee - 0.015, yKnee + 0.055, y) *
      (1 - smoothstepRange(yPelvis - 0.045, yPelvis + 0.035, y));
    field[out + 4] = clamp01(
      gaussianWeight(y - yQuadCenter, 0.13) *
        yQuadBounds *
        gaussianWeight(absX - xThigh - 0.005, 0.052) *
        smoothstepRange(0.2, 0.74, nz) *
        smoothstepRange(-0.015, 0.025, z) *
        quadBone *
        keepBody,
    );

    // 5: hamstrings (posterior thigh)
    const hamBone = clamp01(wTh + wShin * 0.1);
    const yHamBounds =
      smoothstepRange(yKnee - 0.015, yKnee + 0.055, y) *
      (1 - smoothstepRange(yPelvis - 0.125, yPelvis - 0.03, y));
    field[out + 5] = clamp01(
      gaussianWeight(y - yHamCenter, 0.118) *
        yHamBounds *
        gaussianWeight(absX - xThigh, 0.052) *
        smoothstepRange(0.22, 0.75, -nz) *
        smoothstepRange(0.01, -0.026, z) *
        hamBone *
        keepBody,
    );

    // 6: adductors (medial inner thigh)
    const addBone = clamp01(wTh + wPelvis * 0.25);
    const yAddBounds =
      smoothstepRange(yKnee + 0.02, yKnee + 0.1, y) *
      (1 - smoothstepRange(yPelvis - 0.05, yPelvis + 0.02, y));
    field[out + 6] = clamp01(
      gaussianWeight(y - yAddCenter, 0.112) *
        yAddBounds *
        smoothstepRange(xThigh + 0.008, xThigh - 0.038, absX) *
        smoothstepRange(0.28, 0.8, medIn) *
        addBone *
        keepBody,
    );

    // 7: shoulders (deltoid cap & posterior-superior scapular girdle)
    const shBone = clamp01(wSh + wUa + wChest * 0.35);
    const deltoid =
      gaussianWeight(absX - (xSh + 0.022), 0.068) *
      gaussianWeight(y - (ySh - 0.015), 0.068) *
      smoothstepRange(0.088, 0.126, absX) *
      shBone *
      (1 - smoothstepRange(xElb - 0.1, xElb - 0.02, absX));
    const scapula =
      gaussianWeight(absX - 0.102, 0.044) *
      gaussianWeight(y - (ySh + 0.005), 0.045) *
      clamp01(smoothstepRange(0.12, 0.65, -nz) + smoothstepRange(0.32, 0.78, ny)) *
      (1 - smoothstepRange(0.2, 0.62, nz)) *
      clamp01(wSh + wChest * 0.85) *
      0.82;
    field[out + 7] = clamp01(Math.max(deltoid, scapula) * neckCutoff * keepBody);

    // 8: calves (gastrocnemius, soleus & Achilles — posterior lower leg)
    const calfBone = clamp01(wShin + wFoot * 0.15);
    const yCalfBounds =
      smoothstepRange(yAnkle + 0.03, yAnkle + 0.09, y) *
      (1 - smoothstepRange(yKnee - 0.04, yKnee + 0.02, y));
    field[out + 8] = clamp01(
      gaussianWeight(y - yCalfCenter, 0.098) *
        yCalfBounds *
        gaussianWeight(absX - xShin, 0.044) *
        smoothstepRange(0.14, 0.68, -nz) *
        smoothstepRange(0.012, -0.018, z) *
        calfBone *
        keepBody,
    );
  }

  return field;
}

export function parseSkinnedHumanoidGlb(buffer: ArrayBuffer): SkinnedHumanoidAsset {
  if (buffer.byteLength < 20) {
    throw new Error('GLB buffer too short to contain header');
  }
  const headerView = new DataView(buffer);
  const magic = headerView.getUint32(0, true);
  const version = headerView.getUint32(4, true);
  const totalLength = headerView.getUint32(8, true);
  if (magic !== GLB_MAGIC || version !== 2 || totalLength > buffer.byteLength) {
    throw new Error(`Invalid glTF 2.0 GLB header (magic=${magic.toString(16)}, v=${version})`);
  }

  let offset = 12;
  let gltf: GltfDocumentJson | null = null;
  let binByteOffset = 0;
  let binByteLength = 0;

  while (offset + 8 <= totalLength) {
    const chunkLen = headerView.getUint32(offset, true);
    const chunkType = headerView.getUint32(offset + 4, true);
    const chunkStart = offset + 8;
    if (chunkStart + chunkLen > totalLength) break;
    if (chunkType === GLB_CHUNK_JSON) {
      const jsonBytes = new Uint8Array(buffer, chunkStart, chunkLen);
      const jsonText = new TextDecoder('utf-8').decode(jsonBytes);
      gltf = JSON.parse(jsonText) as GltfDocumentJson;
    } else if (chunkType === GLB_CHUNK_BIN) {
      binByteOffset = chunkStart;
      binByteLength = chunkLen;
    }
    offset = chunkStart + chunkLen;
  }

  if (!gltf || binByteLength === 0) {
    throw new Error('GLB missing JSON or BIN chunk');
  }
  const binView = new DataView(buffer, binByteOffset, binByteLength);

  const prim = gltf.meshes?.[0]?.primitives?.[0];
  if (!prim) {
    throw new Error('GLB missing meshes[0].primitives[0]');
  }
  const posAccIdx = prim.attributes.POSITION;
  const normAccIdx = prim.attributes.NORMAL;
  const jointsAccIdx = prim.attributes.JOINTS_0;
  const weightsAccIdx = prim.attributes.WEIGHTS_0;
  if (
    posAccIdx === undefined ||
    normAccIdx === undefined ||
    jointsAccIdx === undefined ||
    weightsAccIdx === undefined
  ) {
    throw new Error('GLB primitive missing required POSITION/NORMAL/JOINTS_0/WEIGHTS_0 attributes');
  }

  const posRes = readAccessorAsFloat32(gltf, binView, posAccIdx);
  const normRes = readAccessorAsFloat32(gltf, binView, normAccIdx);
  const rawJoints = readAccessorAsUint32(gltf, binView, jointsAccIdx);
  const weightsRes = readAccessorAsFloat32(gltf, binView, weightsAccIdx, true);

  const vertexCount = posRes.count;
  const positions = posRes.data;
  const normals = normRes.data;
  const joints = new Uint16Array(vertexCount * 4);
  const weights = new Float32Array(vertexCount * 4);
  for (let i = 0; i < vertexCount; i++) {
    const i4 = i * 4;
    let wSum = 0;
    for (let k = 0; k < 4; k++) {
      joints[i4 + k] = rawJoints[i4 + k] ?? 0;
      const w = Math.max(0, weightsRes.data[i4 + k] ?? 0);
      weights[i4 + k] = w;
      wSum += w;
    }
    if (wSum > 1e-6) {
      const inv = 1 / wSum;
      weights[i4] = weights[i4]! * inv;
      weights[i4 + 1] = weights[i4 + 1]! * inv;
      weights[i4 + 2] = weights[i4 + 2]! * inv;
      weights[i4 + 3] = weights[i4 + 3]! * inv;
    } else {
      weights[i4] = 1;
    }
  }

  // Vertex colors (COLOR_0 linear -> sRGB 0..255; fallback to material baseColorFactor)
  const colorsSrgb = new Uint8Array(vertexCount * 3);
  if (prim.attributes.COLOR_0 !== undefined) {
    const colRes = readAccessorAsFloat32(gltf, binView, prim.attributes.COLOR_0, true);
    const nc = colRes.numComponents;
    for (let i = 0; i < vertexCount; i++) {
      const src = i * nc;
      const dst = i * 3;
      colorsSrgb[dst] = linearToSrgbByte(colRes.data[src] ?? 0.85);
      colorsSrgb[dst + 1] = linearToSrgbByte(colRes.data[src + 1] ?? 0.72);
      colorsSrgb[dst + 2] = linearToSrgbByte(colRes.data[src + 2] ?? 0.65);
    }
  } else {
    const matFactor =
      prim.material !== undefined
        ? gltf.materials?.[prim.material]?.pbrMetallicRoughness?.baseColorFactor
        : undefined;
    const dr = linearToSrgbByte(matFactor?.[0] ?? 0.85);
    const dg = linearToSrgbByte(matFactor?.[1] ?? 0.72);
    const db = linearToSrgbByte(matFactor?.[2] ?? 0.65);
    for (let i = 0; i < vertexCount; i++) {
      colorsSrgb[i * 3] = dr;
      colorsSrgb[i * 3 + 1] = dg;
      colorsSrgb[i * 3 + 2] = db;
    }
  }

  // UV texcoords for exact 4x4 atlas band -> materialRole decoding
  const texcoords =
    prim.attributes.TEXCOORD_0 !== undefined
      ? readAccessorAsFloat32(gltf, binView, prim.attributes.TEXCOORD_0).data
      : new Float32Array(vertexCount * 2);

  // Triangle indices
  let indices: Uint32Array;
  if (prim.indices !== undefined) {
    indices = readAccessorAsUint32(gltf, binView, prim.indices);
  } else {
    indices = new Uint32Array(vertexCount);
    for (let i = 0; i < vertexCount; i++) indices[i] = i;
  }
  const triangleCount = Math.floor(indices.length / 3);

  // Skin hierarchy & Inverse Bind Matrices
  const skin = gltf.skins?.[0];
  if (!skin || skin.joints.length === 0) {
    throw new Error('GLB missing skins[0].joints');
  }
  const nodes = gltf.nodes ?? [];
  const jointCount = skin.joints.length;
  const jointNames: string[] = [];
  const jointIndexByName = new Map<string, number>();
  const nodeToJoint = new Map<number, number>();
  for (let ji = 0; ji < jointCount; ji++) {
    const nodeIdx = skin.joints[ji]!;
    const name = nodes[nodeIdx]?.name ?? `Joint_${ji}`;
    jointNames.push(name);
    jointIndexByName.set(name, ji);
    nodeToJoint.set(nodeIdx, ji);
  }

  const parentIndices = new Int16Array(jointCount);
  parentIndices.fill(-1);
  for (let ni = 0; ni < nodes.length; ni++) {
    const parentJoint = nodeToJoint.get(ni);
    if (parentJoint === undefined) continue;
    const children = nodes[ni]?.children;
    if (!children) continue;
    for (const chNode of children) {
      const childJoint = nodeToJoint.get(chNode);
      if (childJoint !== undefined) {
        parentIndices[childJoint] = parentJoint;
      }
    }
  }

  const inverseBindMatrices =
    skin.inverseBindMatrices !== undefined
      ? readAccessorAsFloat32(gltf, binView, skin.inverseBindMatrices).data
      : (() => {
          const id = new Float32Array(jointCount * 16);
          for (let j = 0; j < jointCount; j++) {
            id[j * 16] = 1;
            id[j * 16 + 5] = 1;
            id[j * 16 + 10] = 1;
            id[j * 16 + 15] = 1;
          }
          return id;
        })();

  // Recover exact bind-pose world transforms M_bind[j] = invert(IBM[j]) in glTF Y-up space
  const bindWorldMats: Float32Array[] = [];
  const bindHeadPos = new Float32Array(jointCount * 3);
  for (let j = 0; j < jointCount; j++) {
    const mb = invertAffine4x4(inverseBindMatrices, j * 16);
    bindWorldMats.push(mb);
    bindHeadPos[j * 3] = mb[12]!;
    bindHeadPos[j * 3 + 1] = mb[13]!;
    bindHeadPos[j * 3 + 2] = mb[14]!;
  }

  const bindDir = new Float32Array(jointCount * 3);
  const bindLength = new Float32Array(jointCount);
  const bindRotOffset = new Float32Array(jointCount * 9);
  const GLTF_FWD: Vec3 = [0, 0, 1];
  const GLTF_UP: Vec3 = [0, 1, 0];

  for (let j = 0; j < jointCount; j++) {
    const name = jointNames[j]!;
    const mb = bindWorldMats[j]!;
    const head: Vec3 = [mb[12]!, mb[13]!, mb[14]!];
    const childName = PRIMARY_CHILD_BONE[name];
    const childIdx = childName !== undefined ? jointIndexByName.get(childName) : undefined;

    let dir: Vec3;
    let length: number;
    if (childIdx !== undefined) {
      const chHead: Vec3 = [
        bindHeadPos[childIdx * 3]!,
        bindHeadPos[childIdx * 3 + 1]!,
        bindHeadPos[childIdx * 3 + 2]!,
      ];
      const delta = vSub(chHead, head);
      length = Math.max(0.02, vLen(delta));
      dir = vNorm(delta, [0, 1, 0]);
    } else {
      // Leaf bone: exact bone Y-axis from exported bind world matrix
      dir = vNorm([mb[4]!, mb[5]!, mb[6]!], [0, 1, 0]);
      length = LEAF_DEFAULT_LENGTH[name] ?? 0.14;
    }

    bindDir[j * 3] = dir[0];
    bindDir[j * 3 + 1] = dir[1];
    bindDir[j * 3 + 2] = dir[2];
    bindLength[j] = length;

    const hint = name.startsWith('Foot_') ? GLTF_UP : GLTF_FWD;
    const [cx, cy, cz] = buildCanonicalBoneBasis(dir, hint);

    // Exported rotation columns (normalized)
    const ex = vNorm([mb[0]!, mb[1]!, mb[2]!], [1, 0, 0]);
    const ey = vNorm([mb[4]!, mb[5]!, mb[6]!], [0, 1, 0]);
    const ez = vNorm([mb[8]!, mb[9]!, mb[10]!], [0, 0, 1]);

    // R_offset = R_canon_bind^T * R_bind_exported (column-major 3x3)
    const off = j * 9;
    bindRotOffset[off] = vDot(cx, ex);
    bindRotOffset[off + 1] = vDot(cy, ex);
    bindRotOffset[off + 2] = vDot(cz, ex);
    bindRotOffset[off + 3] = vDot(cx, ey);
    bindRotOffset[off + 4] = vDot(cy, ey);
    bindRotOffset[off + 5] = vDot(cz, ey);
    bindRotOffset[off + 6] = vDot(cx, ez);
    bindRotOffset[off + 7] = vDot(cy, ez);
    bindRotOffset[off + 8] = vDot(cz, ez);
  }

  // Compute bind bounding box
  let minX = Infinity;
  let minY = Infinity;
  let minZ = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  let maxZ = -Infinity;
  for (let i = 0; i < vertexCount; i++) {
    const x = positions[i * 3]!;
    const y = positions[i * 3 + 1]!;
    const z = positions[i * 3 + 2]!;
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (z < minZ) minZ = z;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
    if (z > maxZ) maxZ = z;
  }

  // Precompute per-triangle materialRole & active muscle zone from 4x4 UV atlas band
  const shoulderBoneSet = new Set<number>();
  for (const bn of ['Shoulder_L', 'Shoulder_R', 'UpperArm_L', 'UpperArm_R']) {
    const ji = jointIndexByName.get(bn);
    if (ji !== undefined) shoulderBoneSet.add(ji);
  }
  const pelvisJointIdx = jointIndexByName.get('Pelvis') ?? 0;

  const triRoles: StudioMaterialRole[] = new Array(triangleCount);
  const triMuscleRegions: SkinnedMuscleRegion[] = new Array(triangleCount);
  for (let ti = 0; ti < triangleCount; ti++) {
    const i0 = indices[ti * 3]!;
    const i1 = indices[ti * 3 + 1]!;
    const i2 = indices[ti * 3 + 2]!;
    const uAvg = (texcoords[i0 * 2]! + texcoords[i1 * 2]! + texcoords[i2 * 2]!) / 3;
    const vGltfAvg = (texcoords[i0 * 2 + 1]! + texcoords[i1 * 2 + 1]! + texcoords[i2 * 2 + 1]!) / 3;
    // Blender UV V=0 at bottom flips to glTF V=1 at bottom -> invert V back to Blender row
    const col = Math.max(0, Math.min(3, Math.floor(uAvg * 4)));
    const row = Math.max(0, Math.min(3, Math.floor((1 - vGltfAvg) * 4)));
    const band = row * 4 + col;
    const role = classifyBandRole(band);
    triRoles[ti] = role;

    const domJoint = joints[i0 * 4]!;
    const yAvg = (positions[i0 * 3 + 1]! + positions[i1 * 3 + 1]! + positions[i2 * 3 + 1]!) / 3;
    if (band === 6) {
      triMuscleRegions[ti] = 'core';
    } else if (band === 7) {
      triMuscleRegions[ti] = domJoint === pelvisJointIdx || yAvg >= 0.80 ? 'glutes' : 'legs';
    } else if (band === 5 && shoulderBoneSet.has(domJoint)) {
      triMuscleRegions[ti] = 'shoulders';
    } else {
      triMuscleRegions[ti] = 'none';
    }
  }

  const vertexMuscleWeights = computeVertexMuscleWeightFields({
    vertexCount,
    positions,
    normals,
    joints,
    weights,
    texcoords,
    bindHeadPos,
    jointIndexByName,
  });

  return {
    vertexCount,
    triangleCount,
    jointCount,
    jointNames,
    jointIndexByName,
    parentIndices,
    positions,
    normals,
    joints,
    weights,
    colorsSrgb,
    texcoords,
    indices,
    inverseBindMatrices,
    bindHeadPos,
    bindDir,
    bindLength,
    bindRotOffset,
    triRoles,
    triMuscleRegions,
    vertexMuscleWeights,
    bindBounds: {
      min: [minX, minY, minZ],
      max: [maxX, maxY, maxZ],
    },
  };
}

// ==============================================================================
// 3. BROWSER SINGLETON ASYNC LOADER (SSR/JSDOM/OFFLINE SAFE)
// ==============================================================================

let cachedAsset: SkinnedHumanoidAsset | null = null;
let inflightLoad: Promise<SkinnedHumanoidAsset | null> | null = null;

function resolveDefaultGlbUrl(): string {
  try {
    const base =
      typeof import.meta !== 'undefined' &&
      (import.meta as ImportMeta & { env?: { BASE_URL?: string } }).env?.BASE_URL;
    if (base && base !== '/') {
      const trimmed = base.endsWith('/') ? base.slice(0, -1) : base;
      return `${trimmed}${DEFAULT_SKINNED_HUMANOID_GLB_URL}`;
    }
  } catch {
    // Fall back to root-relative path
  }
  return DEFAULT_SKINNED_HUMANOID_GLB_URL;
}

export function getCachedSkinnedHumanoidAsset(): SkinnedHumanoidAsset | null {
  return cachedAsset;
}

/** Test-only helper to inject or clear a pre-parsed GLB asset synchronously. */
export function setCachedSkinnedHumanoidAsset(asset: SkinnedHumanoidAsset | null): void {
  cachedAsset = asset;
  inflightLoad = null;
}

export function loadSharedSkinnedHumanoidAsset(
  url?: string,
): Promise<SkinnedHumanoidAsset | null> {
  if (cachedAsset) return Promise.resolve(cachedAsset);
  if (typeof window === 'undefined' || typeof fetch !== 'function') {
    return Promise.resolve(null);
  }
  if (typeof navigator !== 'undefined' && /jsdom/i.test(navigator.userAgent)) {
    return Promise.resolve(null);
  }
  if (inflightLoad) return inflightLoad;

  const targetUrl = url ?? resolveDefaultGlbUrl();
  inflightLoad = fetch(targetUrl)
    .then((response) => {
      if (!response.ok) return null;
      return response.arrayBuffer();
    })
    .then((buf) => {
      if (!buf) return null;
      const parsed = parseSkinnedHumanoidGlb(buf);
      cachedAsset = parsed;
      return parsed;
    })
    .catch(() => null)
    .finally(() => {
      if (!cachedAsset) {
        inflightLoad = null;
      }
    });

  return inflightLoad;
}

// ==============================================================================
// 4. REAL-TIME 21-BONE RETARGETER (PILATES 17-JOINT IK -> SKIN MATRICES)
// ==============================================================================

interface BoneTargetSpec {
  readonly head: Vec3;
  readonly dir: Vec3;
  readonly hint: Vec3;
  readonly scaleY: number;
  readonly scaleXZ: number;
}

function clampScale(raw: number, lo: number, hi: number): number {
  return raw < lo ? lo : raw > hi ? hi : raw;
}

/**
 * Computes column-major 4x4 skinning matrices (`M_world[j] * IBM[j]`, 16 floats per bone)
 * mapping bind-pose glTF Y-up vertices directly into Pilates Studio Z-up world coordinates.
 *
 * Coordinate handedness guarantee:
 * - In `realtimeStudio3dEngine.ts`, `(bodyRight, spUp, antN)` is right-handed (`bodyRight = spUp x antN`),
 *   with `rSh`/`rHip` at `+bodyRight` and `lSh`/`lHip` at `-bodyRight`.
 * - In `instructor-skinned-v5.glb` (glTF Y-up), `(+X, +Y, +Z)` is right-handed with `*_L` bones at `+X`
 *   and `*_R` bones at `-X`.
 * - Driving `+X` bones (`*_L`) from `+bodyRight` IK joints (`r*`) and `-X` bones (`*_R`) from `-bodyRight`
 *   IK joints (`l*`) preserves strict +1 determinant handedness with zero shoulder/hip crossover.
 */
export function computeRetargetedBoneMatrices(
  asset: SkinnedHumanoidAsset,
  rig: SkinnedHumanoidRigJoints,
  outMatrices?: Float32Array,
  outQuats?: Float32Array,
): Float32Array {
  const jc = asset.jointCount;
  const skinMats =
    outMatrices && outMatrices.length >= jc * 16 ? outMatrices : new Float32Array(jc * 16);

  const spUp = vNorm(vSub(rig.chest, rig.pelvis), [0, 0, 1]);
  const bodyRight = vNorm(rig.bodyRight, [1, 0, 0]);
  const pelvisRight = vNorm(rig.pelvisRight, bodyRight);
  const antN = vNorm(vCross(bodyRight, spUp), [0, -1, 0]);
  const pelvisAnt = vNorm(vCross(pelvisRight, spUp), antN);
  const neckUp = vNorm(rig.neckUp, spUp);
  const headAnt = vNorm(rig.headAnt, antN);
  const breath = rig.breathScale ?? 1.0;

  // Spine cubic-smooth quadratic Bezier landmarks (Pelvis -> SpineLower -> SpineUpper -> Chest -> Neck -> Head)
  const pPelvis = rig.pelvis;
  const pSpineLower = bezier3Vec(rig.pelvis, rig.spineMid, rig.chest, 0.25);
  const pSpineUpper = bezier3Vec(rig.pelvis, rig.spineMid, rig.chest, 0.55);
  const pChestBase = bezier3Vec(rig.pelvis, rig.spineMid, rig.chest, 0.80);
  const pNeckBase = vAdd(rig.chest, vScale(neckUp, 0.028));
  const pNeckTop = vSub(rig.headPos, vScale(neckUp, 0.060));

  const antLow = vNorm(vLerp(pelvisAnt, antN, 0.35), antN);
  const antUp = vNorm(vLerp(pelvisAnt, antN, 0.78), antN);

  // Gravity-aware cascading ponytail (matching `pilates_3d_modeling_kernel.py` clearing supine mats/headrests)
  const ponyRoot = vAdd(vSub(rig.headPos, vScale(headAnt, 0.088)), vScale(neckUp, 0.048));
  let ponyDir: Vec3;
  const isSupineHead = neckUp[2] <= 0.24 && headAnt[2] > 0.25;
  if (neckUp[2] > 0.24) {
    ponyDir = vNorm([
      -headAnt[0] * 0.52 - neckUp[0] * 0.64,
      -headAnt[1] * 0.52 - neckUp[1] * 0.64,
      -headAnt[2] * 0.52 - neckUp[2] * 0.64 - 0.44,
    ]);
  } else if (isSupineHead) {
    ponyDir = vNorm(vSub(vScale(neckUp, 0.84), vScale(headAnt, 0.42)));
  } else if (neckUp[2] < -0.24) {
    ponyDir = vNorm([
      -headAnt[0] * 0.58,
      -headAnt[1] * 0.58,
      -headAnt[2] * 0.58 - 0.68,
    ]);
  } else {
    ponyDir = vNorm(vSub(vScale(headAnt, -0.66), vScale(neckUp, 0.56)));
  }

  const getBindLen = (name: string, fallback: number): number => {
    const ji = asset.jointIndexByName.get(name);
    return ji !== undefined ? asset.bindLength[ji]! : fallback;
  };
  const getBindDirWorld = (name: string, fallback: Vec3): Vec3 => {
    const ji = asset.jointIndexByName.get(name);
    if (ji === undefined) return fallback;
    const bx = asset.bindDir[ji * 3]!;
    const by = asset.bindDir[ji * 3 + 1]!;
    const bz = asset.bindDir[ji * 3 + 2]!;
    // Transform bind direction from glTF (X=bodyRight, Y=spUp, Z=antN) into current torso frame
    return vNorm([
      bodyRight[0] * bx + spUp[0] * by + antN[0] * bz,
      bodyRight[1] * bx + spUp[1] * by + antN[1] * bz,
      bodyRight[2] * bx + spUp[2] * by + antN[2] * bz,
    ]);
  };

  const makeSegmentSpec = (
    name: string,
    head: Vec3,
    tail: Vec3,
    hint: Vec3,
    scaleXZ = 1.0,
    lockScaleY = false,
  ): BoneTargetSpec => {
    const delta = vSub(tail, head);
    const len = vLen(delta);
    const bindL = getBindLen(name, Math.max(0.05, len));
    return {
      head,
      dir: vNorm(delta, spUp),
      hint,
      scaleY: lockScaleY ? 1.0 : clampScale(len / Math.max(0.02, bindL), 0.72, 1.32),
      scaleXZ,
    };
  };

  const targets = new Map<string, BoneTargetSpec>();
  targets.set('Pelvis', makeSegmentSpec('Pelvis', pPelvis, pSpineLower, pelvisAnt, 1.0));
  targets.set('SpineLower', makeSegmentSpec('SpineLower', pSpineLower, pSpineUpper, antLow, breath));
  targets.set('SpineUpper', makeSegmentSpec('SpineUpper', pSpineUpper, pChestBase, antUp, breath));
  targets.set(
    'Chest',
    makeSegmentSpec('Chest', pChestBase, pNeckBase, antN, 1 + (breath - 1) * 0.6),
  );
  targets.set('Neck', makeSegmentSpec('Neck', pNeckBase, pNeckTop, headAnt, 1.0));
  targets.set('Head', {
    head: pNeckTop,
    dir: neckUp,
    hint: headAnt,
    scaleY: 1.0,
    scaleXZ: 1.0,
  });
  targets.set('Ponytail', {
    head: ponyRoot,
    dir: ponyDir,
    hint: headAnt,
    scaleY: 1.0,
    scaleXZ: 1.0,
  });

  // Bilateral Arms (+bodyRight side -> *_L in GLB, -bodyRight side -> *_R in GLB)
  const armBindings: readonly {
    readonly suffix: 'L' | 'R';
    readonly sideSign: number;
    readonly sh: Vec3;
    readonly elb: Vec3;
    readonly wr: Vec3;
    readonly elbowBend: Vec3;
  }[] = [
    { suffix: 'L', sideSign: 1, sh: rig.rSh, elb: rig.rElb, wr: rig.rWr, elbowBend: rig.rElbowBend },
    { suffix: 'R', sideSign: -1, sh: rig.lSh, elb: rig.lElb, wr: rig.lWr, elbowBend: rig.lElbowBend },
  ];

  for (const arm of armBindings) {
    const shName = `Shoulder_${arm.suffix}`;
    const uaName = `UpperArm_${arm.suffix}`;
    const faName = `Forearm_${arm.suffix}`;
    const hdName = `Hand_${arm.suffix}`;

    const clavRoot = vAdd(rig.chest, vScale(bodyRight, arm.sideSign * 0.032));
    const uaDir = vNorm(vSub(arm.elb, arm.sh), vScale(bodyRight, arm.sideSign));
    const faDir = vNorm(vSub(arm.wr, arm.elb), uaDir);

    // Zero-singularity parallel-transported arm anterior hint blended with elbow flexion plane
    const bindUaWorld = getBindDirWorld(uaName, vScale(bodyRight, arm.sideSign));
    const transportedUaAnt = parallelTransport(antN, bindUaWorld, uaDir);
    const flexCos = Math.max(-1, Math.min(1, vDot(uaDir, faDir)));
    const elbowFlexRad = Math.acos(flexCos);
    const bendWeight = Math.max(0, Math.min(0.65, (elbowFlexRad - 0.22) / 1.1));
    const elbowAnt = vScale(vNorm(arm.elbowBend, vScale(antN, -1)), -1);
    const uaHint = vNorm(vLerp(transportedUaAnt, elbowAnt, bendWeight), transportedUaAnt);
    const faHint = parallelTransport(uaHint, uaDir, faDir);

    targets.set(shName, makeSegmentSpec(shName, clavRoot, arm.sh, antN, 1.0));
    targets.set(uaName, makeSegmentSpec(uaName, arm.sh, arm.elb, uaHint, 1.0));
    targets.set(faName, makeSegmentSpec(faName, arm.elb, arm.wr, faHint, 1.0));
    targets.set(hdName, {
      head: arm.wr,
      dir: faDir,
      hint: faHint,
      scaleY: 1.0,
      scaleXZ: 1.0,
    });
  }

  // Bilateral Legs (+bodyRight side -> *_L in GLB, -bodyRight side -> *_R in GLB)
  const legBindings: readonly {
    readonly suffix: 'L' | 'R';
    readonly hip: Vec3;
    readonly knee: Vec3;
    readonly ankle: Vec3;
    readonly kneeBend: Vec3;
  }[] = [
    { suffix: 'L', hip: rig.rHip, knee: rig.rKnee, ankle: rig.rAnkle, kneeBend: rig.rKneeBend },
    { suffix: 'R', hip: rig.lHip, knee: rig.lKnee, ankle: rig.lAnkle, kneeBend: rig.lKneeBend },
  ];

  for (const leg of legBindings) {
    const thName = `Thigh_${leg.suffix}`;
    const shName = `Shin_${leg.suffix}`;
    const ftName = `Foot_${leg.suffix}`;

    const thDir = vNorm(vSub(leg.knee, leg.hip), vScale(spUp, -1));
    const shDir = vNorm(vSub(leg.ankle, leg.knee), thDir);
    const bindThWorld = getBindDirWorld(thName, vScale(spUp, -1));
    const transportedThAnt = parallelTransport(pelvisAnt, bindThWorld, thDir);

    const kneeCos = Math.max(-1, Math.min(1, vDot(thDir, shDir)));
    const kneeFlexRad = Math.acos(kneeCos);
    const kneeBlend = Math.max(0, Math.min(0.85, (kneeFlexRad - 0.14) / 0.85));
    const patellaDir = vNorm(leg.kneeBend, pelvisAnt);
    const thHint = vNorm(vLerp(transportedThAnt, patellaDir, kneeBlend), transportedThAnt);
    const shHint = parallelTransport(thHint, thDir, shDir);

    // Sculpted Pilates foot grounding vs graceful plantarflexed dancer point
    let antTib = vSub(shHint, vScale(shDir, vDot(shHint, shDir)));
    if (vLen(antTib) < 1e-4) antTib = pelvisAnt;
    const foot = resolveStudioFootFrame(leg.ankle[2], shDir, vNorm(antTib));

    targets.set(thName, makeSegmentSpec(thName, leg.hip, leg.knee, thHint, 1.0));
    targets.set(shName, makeSegmentSpec(shName, leg.knee, leg.ankle, shHint, 1.0));
    targets.set(ftName, {
      head: leg.ankle,
      dir: foot.forward,
      hint: foot.up,
      scaleY: 1.0,
      scaleXZ: 1.0,
    });
  }

  // Assemble M_skin[j] = M_world[j] * IBM[j] for every bone
  const ibms = asset.inverseBindMatrices;
  const rotOffsets = asset.bindRotOffset;
  for (let j = 0; j < jc; j++) {
    const name = asset.jointNames[j]!;
    const spec = targets.get(name) ?? targets.get('Pelvis')!;
    const [tx, ty, tz] = buildCanonicalBoneBasis(spec.dir, spec.hint);

    // Apply axial/radial scale in canonical bone coordinates: S_world = [tx*sXZ, ty*sY, tz*sXZ]
    const sXZ = spec.scaleXZ;
    const sY = spec.scaleY;
    const sx0 = tx[0] * sXZ;
    const sx1 = tx[1] * sXZ;
    const sx2 = tx[2] * sXZ;
    const sy0 = ty[0] * sY;
    const sy1 = ty[1] * sY;
    const sy2 = ty[2] * sY;
    const sz0 = tz[0] * sXZ;
    const sz1 = tz[1] * sXZ;
    const sz2 = tz[2] * sXZ;

    // Multiply by R_offset[j] = R_canon_bind^T * R_bind_exported
    const ro = j * 9;
    const o00 = rotOffsets[ro]!;
    const o10 = rotOffsets[ro + 1]!;
    const o20 = rotOffsets[ro + 2]!;
    const o01 = rotOffsets[ro + 3]!;
    const o11 = rotOffsets[ro + 4]!;
    const o21 = rotOffsets[ro + 5]!;
    const o02 = rotOffsets[ro + 6]!;
    const o12 = rotOffsets[ro + 7]!;
    const o22 = rotOffsets[ro + 8]!;

    // M_world upper 3x3 columns w0, w1, w2 + translation w3
    const w00 = sx0 * o00 + sy0 * o10 + sz0 * o20;
    const w10 = sx1 * o00 + sy1 * o10 + sz1 * o20;
    const w20 = sx2 * o00 + sy2 * o10 + sz2 * o20;

    const w01 = sx0 * o01 + sy0 * o11 + sz0 * o21;
    const w11 = sx1 * o01 + sy1 * o11 + sz1 * o21;
    const w21 = sx2 * o01 + sy2 * o11 + sz2 * o21;

    const w02 = sx0 * o02 + sy0 * o12 + sz0 * o22;
    const w12 = sx1 * o02 + sy1 * o12 + sz1 * o22;
    const w22 = sx2 * o02 + sy2 * o12 + sz2 * o22;

    const px = spec.head[0];
    const py = spec.head[1];
    const pz = spec.head[2];

    // Optional bone rotation quaternion for joint-bend volume preservation
    if (outQuats) {
      const r00 = tx[0] * o00 + ty[0] * o10 + tz[0] * o20;
      const r10 = tx[1] * o00 + ty[1] * o10 + tz[1] * o20;
      const r20 = tx[2] * o00 + ty[2] * o10 + tz[2] * o20;
      const r01 = tx[0] * o01 + ty[0] * o11 + tz[0] * o21;
      const r11 = tx[1] * o01 + ty[1] * o11 + tz[1] * o21;
      const r21 = tx[2] * o01 + ty[2] * o11 + tz[2] * o21;
      const r02 = tx[0] * o02 + ty[0] * o12 + tz[0] * o22;
      const r12 = tx[1] * o02 + ty[1] * o12 + tz[1] * o22;
      const r22 = tx[2] * o02 + ty[2] * o12 + tz[2] * o22;
      // Multiply with IBM upper 3x3 for the delta rotation quaternion (glTF -> Pilates Z-up)
      const io = j * 16;
      const b00 = ibms[io]!;
      const b10 = ibms[io + 1]!;
      const b20 = ibms[io + 2]!;
      const b01 = ibms[io + 4]!;
      const b11 = ibms[io + 5]!;
      const b21 = ibms[io + 6]!;
      const b02 = ibms[io + 8]!;
      const b12 = ibms[io + 9]!;
      const b22 = ibms[io + 10]!;
      rot3ToQuat(
        r00 * b00 + r01 * b10 + r02 * b20,
        r10 * b00 + r11 * b10 + r12 * b20,
        r20 * b00 + r21 * b10 + r22 * b20,
        r00 * b01 + r01 * b11 + r02 * b21,
        r10 * b01 + r11 * b11 + r12 * b21,
        r20 * b01 + r21 * b11 + r22 * b21,
        r00 * b02 + r01 * b12 + r02 * b22,
        r10 * b02 + r11 * b12 + r12 * b22,
        r20 * b02 + r21 * b12 + r22 * b22,
        outQuats,
        j * 4,
      );
    }

    // M_skin[j] = M_world[j] * IBM[j] (column-major)
    const io = j * 16;
    const b00 = ibms[io]!;
    const b10 = ibms[io + 1]!;
    const b20 = ibms[io + 2]!;
    const b01 = ibms[io + 4]!;
    const b11 = ibms[io + 5]!;
    const b21 = ibms[io + 6]!;
    const b02 = ibms[io + 8]!;
    const b12 = ibms[io + 9]!;
    const b22 = ibms[io + 10]!;
    const b03 = ibms[io + 12]!;
    const b13 = ibms[io + 13]!;
    const b23 = ibms[io + 14]!;

    skinMats[io] = w00 * b00 + w01 * b10 + w02 * b20;
    skinMats[io + 1] = w10 * b00 + w11 * b10 + w12 * b20;
    skinMats[io + 2] = w20 * b00 + w21 * b10 + w22 * b20;
    skinMats[io + 3] = 0;

    skinMats[io + 4] = w00 * b01 + w01 * b11 + w02 * b21;
    skinMats[io + 5] = w10 * b01 + w11 * b11 + w12 * b21;
    skinMats[io + 6] = w20 * b01 + w21 * b11 + w22 * b21;
    skinMats[io + 7] = 0;

    skinMats[io + 8] = w00 * b02 + w01 * b12 + w02 * b22;
    skinMats[io + 9] = w10 * b02 + w11 * b12 + w12 * b22;
    skinMats[io + 10] = w20 * b02 + w21 * b12 + w22 * b22;
    skinMats[io + 11] = 0;

    skinMats[io + 12] = w00 * b03 + w01 * b13 + w02 * b23 + px;
    skinMats[io + 13] = w10 * b03 + w11 * b13 + w12 * b23 + py;
    skinMats[io + 14] = w20 * b03 + w21 * b13 + w22 * b23 + pz;
    skinMats[io + 15] = 1;
  }

  return skinMats;
}

// ==============================================================================
// 5. FAST TYPEDARRAY LBS + JOINT VOLUME PRESERVATION -> StudioQuadFace[]
// ==============================================================================

class SkinningScratch {
  boneMats = new Float32Array(32 * 16);
  inverseBoneMats = new Float32Array(32 * 16);
  inverse = new Float32Array(16);
  boneQuats = new Float32Array(32 * 4);
  skinnedPos = new Float32Array(12288 * 3);
  skinnedNorm = new Float32Array(12288 * 3);
  vertexTint = new Float32Array(12288);
  vertexEmissive = new Float32Array(12288);

  ensure(jointCount: number, vertexCount: number): void {
    if (this.boneMats.length < jointCount * 16) {
      this.boneMats = new Float32Array(jointCount * 16);
      this.inverseBoneMats = new Float32Array(jointCount * 16);
      this.boneQuats = new Float32Array(jointCount * 4);
    }
    if (this.skinnedPos.length < vertexCount * 3) {
      this.skinnedPos = new Float32Array(vertexCount * 3);
      this.skinnedNorm = new Float32Array(vertexCount * 3);
    }
    if (this.vertexTint.length < vertexCount) {
      this.vertexTint = new Float32Array(vertexCount);
      this.vertexEmissive = new Float32Array(vertexCount);
    }
  }
}

const SHARED_SCRATCH = new SkinningScratch();

const CLAY_PALETTE: Readonly<Record<StudioMaterialRole, Rgb>> = {
  skin: [226, 222, 215],
  fabric: [212, 208, 200],
  hair: [168, 164, 158],
  gloss: [214, 210, 202],
  wood: [206, 202, 194],
  leather: [184, 180, 174],
  chrome: [198, 200, 204],
  brass: [194, 188, 176],
};

const XRAY_PALETTE: Readonly<Record<StudioMaterialRole, Rgb>> = {
  skin: [125, 212, 188],
  fabric: [62, 170, 142],
  hair: [48, 126, 106],
  gloss: [148, 226, 204],
  wood: [76, 102, 92],
  leather: [30, 54, 46],
  chrome: [152, 210, 196],
  brass: [152, 210, 196],
};

function blendRgb(a: Rgb, b: Rgb, t: number): Rgb {
  return [
    Math.round(a[0] + (b[0] - a[0]) * t),
    Math.round(a[1] + (b[1] - a[1]) * t),
    Math.round(a[2] + (b[2] - a[2]) * t),
  ];
}

function smoothstep01(t: number): number {
  const x = Math.max(0, Math.min(1, t));
  return x * x * (3 - 2 * x);
}

/**
 * Skins all vertices & smooth normals in TypedArrays (LBS + quaternion-norm joint volume preservation)
 * and outputs degenerate-quad triangles `[v0, v1, v2, v2]` ready for WebGPU/WebGL2/Canvas2D.
 */
export function skinHumanoidToStudioQuads(
  asset: SkinnedHumanoidAsset,
  rig: SkinnedHumanoidRigJoints,
  options: SkinnedHumanoidRenderOptions,
): StudioQuadFace[] {
  const vc = asset.vertexCount;
  const tc = asset.triangleCount;
  const jc = asset.jointCount;
  SHARED_SCRATCH.ensure(jc, vc);

  const mats = computeRetargetedBoneMatrices(
    asset,
    rig,
    SHARED_SCRATCH.boneMats,
    SHARED_SCRATCH.boneQuats,
  );
  // Inverse-transpose normals follow the sculpt when breathing expands the chest or a
  // limb stretches along one axis. Position matrices would tilt its highlight sideways.
  const inverse = SHARED_SCRATCH.inverseBoneMats;
  for (let joint = 0; joint < jc; joint++) {
    const offset = joint * 16;
    inverse.set(invertAffine4x4(mats, offset, SHARED_SCRATCH.inverse), offset);
  }
  const quats = SHARED_SCRATCH.boneQuats;
  const outPos = SHARED_SCRATCH.skinnedPos;
  const outNorm = SHARED_SCRATCH.skinnedNorm;

  const srcPos = asset.positions;
  const srcNorm = asset.normals;
  const jIdx = asset.joints;
  const wArr = asset.weights;

  // Vertex LBS + shortest-arc quaternion volume preservation at high-flexion joints
  for (let vi = 0; vi < vc; vi++) {
    const v3 = vi * 3;
    const v4 = vi * 4;
    const px = srcPos[v3]!;
    const py = srcPos[v3 + 1]!;
    const pz = srcPos[v3 + 2]!;
    const nx = srcNorm[v3]!;
    const ny = srcNorm[v3 + 1]!;
    const nz = srcNorm[v3 + 2]!;

    const j0 = jIdx[v4]!;
    const w0 = wArr[v4]!;
    const m0 = j0 * 16;

    let sx = (mats[m0]! * px + mats[m0 + 4]! * py + mats[m0 + 8]! * pz + mats[m0 + 12]!) * w0;
    let sy = (mats[m0 + 1]! * px + mats[m0 + 5]! * py + mats[m0 + 9]! * pz + mats[m0 + 13]!) * w0;
    let sz = (mats[m0 + 2]! * px + mats[m0 + 6]! * py + mats[m0 + 10]! * pz + mats[m0 + 14]!) * w0;

    let snx = (inverse[m0]! * nx + inverse[m0 + 1]! * ny + inverse[m0 + 2]! * nz) * w0;
    let sny = (inverse[m0 + 4]! * nx + inverse[m0 + 5]! * ny + inverse[m0 + 6]! * nz) * w0;
    let snz = (inverse[m0 + 8]! * nx + inverse[m0 + 9]! * ny + inverse[m0 + 10]! * nz) * w0;

    let volBoost = 0;
    if (w0 < 0.999) {
      const q0Off = j0 * 4;
      const q0x = quats[q0Off]!;
      const q0y = quats[q0Off + 1]!;
      const q0z = quats[q0Off + 2]!;
      const q0w = quats[q0Off + 3]!;
      let bqx = q0x * w0;
      let bqy = q0y * w0;
      let bqz = q0z * w0;
      let bqw = q0w * w0;

      for (let k = 1; k < 4; k++) {
        const wk = wArr[v4 + k]!;
        if (wk <= 1e-5) continue;
        const jk = jIdx[v4 + k]!;
        const mk = jk * 16;
        sx += (mats[mk]! * px + mats[mk + 4]! * py + mats[mk + 8]! * pz + mats[mk + 12]!) * wk;
        sy += (mats[mk + 1]! * px + mats[mk + 5]! * py + mats[mk + 9]! * pz + mats[mk + 13]!) * wk;
        sz += (mats[mk + 2]! * px + mats[mk + 6]! * py + mats[mk + 10]! * pz + mats[mk + 14]!) * wk;
        snx += (inverse[mk]! * nx + inverse[mk + 1]! * ny + inverse[mk + 2]! * nz) * wk;
        sny += (inverse[mk + 4]! * nx + inverse[mk + 5]! * ny + inverse[mk + 6]! * nz) * wk;
        snz += (inverse[mk + 8]! * nx + inverse[mk + 9]! * ny + inverse[mk + 10]! * nz) * wk;

        const qkOff = jk * 4;
        const qkx = quats[qkOff]!;
        const qky = quats[qkOff + 1]!;
        const qkz = quats[qkOff + 2]!;
        const qkw = quats[qkOff + 3]!;
        const sign = q0x * qkx + q0y * qky + q0z * qkz + q0w * qkw < 0 ? -wk : wk;
        bqx += qkx * sign;
        bqy += qky * sign;
        bqz += qkz * sign;
        bqw += qkw * sign;
      }
      // Analytical LBS-shrinkage compensation: restore joint radius when adjacent bones bend deeply
      const qNorm = Math.hypot(bqx, bqy, bqz, bqw);
      if (qNorm < 0.985) {
        volBoost = Math.min(0.0075, (1 - Math.max(0.76, qNorm)) * 0.042);
      }
    }

    const nLen = Math.hypot(snx, sny, snz);
    if (nLen > 1e-6) {
      snx /= nLen;
      sny /= nLen;
      snz /= nLen;
    } else {
      snx = 0;
      sny = 0;
      snz = 1;
    }

    if (volBoost > 0) {
      sx += snx * volBoost;
      sy += sny * volBoost;
      sz += snz * volBoost;
    }

    outPos[v3] = sx;
    outPos[v3 + 1] = sy;
    outPos[v3 + 2] = sz;
    outNorm[v3] = snx;
    outNorm[v3 + 1] = sny;
    outNorm[v3 + 2] = snz;
  }

  // Build smooth per-vertex muscle activation & color tables once (zero hard facet borders!)
  const isClay = options.shader === 'clay-wire';
  const isXray = options.shader === 'biomech-xray';
  const alpha = isXray ? 0.44 : 1.0;
  const isHeatmap = Boolean(options.showMuscleHeatmap);
  const clampedT = clamp01(options.phaseT);

  const activeZoneIndices: number[] = [];
  for (const zone of options.activeZones) {
    const zi = MUSCLE_ZONE_INDEX[zone];
    if (zi !== undefined && !activeZoneIndices.includes(zi)) {
      activeZoneIndices.push(zi);
    }
  }
  const activeZoneCount = activeZoneIndices.length;

  const showWhisper =
    !isHeatmap &&
    !isClay &&
    activeZoneCount > 0 &&
    (clampedT > 0.18 || Boolean(options.showBiomechOverlay));
  const computeActivation = (isHeatmap && activeZoneCount > 0) || showWhisper;

  const phaseCurve = computeMuscleActivationCurve(clampedT);
  const whisperPulse = Math.max(0.24, smoothstep01(clampedT));
  const glowRgb: Rgb = isHeatmap ? HEATMAP_TERRACOTTA_RGB : MOTION_STUDIO_RGB.primaryMuscle;

  const muscleFields = asset.vertexMuscleWeights;
  const vTint = SHARED_SCRATCH.vertexTint;
  const vEmissive = SHARED_SCRATCH.vertexEmissive;

  const vertsVec: Vec3[] = new Array(vc);
  const normsVec: Vec3[] = new Array(vc);
  const rawCols: Rgb[] = new Array(vc);
  const shadedCols: Rgb[] = new Array(vc);
  const colArr = asset.colorsSrgb;

  for (let vi = 0; vi < vc; vi++) {
    const v3 = vi * 3;
    vertsVec[vi] = [outPos[v3]!, outPos[v3 + 1]!, outPos[v3 + 2]!];
    normsVec[vi] = [outNorm[v3]!, outNorm[v3 + 1]!, outNorm[v3 + 2]!];
    const baseCol: Rgb = [colArr[v3]!, colArr[v3 + 1]!, colArr[v3 + 2]!];
    rawCols[vi] = baseCol;

    let tintMix = 0;
    let em = 0;
    if (computeActivation) {
      const mBase = vi * ANATOMICAL_MUSCLE_ZONE_COUNT;
      let complement = 1;
      for (let a = 0; a < activeZoneCount; a++) {
        const w = muscleFields[mBase + activeZoneIndices[a]!]!;
        if (w > 1e-4) {
          complement *= 1 - w;
        }
      }
      const rawWeight = 1 - complement;
      if (rawWeight > 0.004) {
        if (isHeatmap) {
          const activation = rawWeight * phaseCurve;
          tintMix = Math.min(0.86, activation * 0.84);
          em = Math.min(0.95, activation * 0.95);
        } else {
          // Default Calm Atelier whisper (<= 0.24 at peak, zero visual clutter)
          const whisper = rawWeight * whisperPulse;
          tintMix = Math.min(0.24, whisper * 0.24);
          em = Math.min(0.2, whisper * 0.2);
        }
      }
    }

    vTint[vi] = tintMix;
    vEmissive[vi] = em;
    shadedCols[vi] = tintMix > 0.002 ? blendRgb(baseCol, glowRgb, tintMix) : baseCol;
  }

  const idx = asset.indices;
  const roles = asset.triRoles;
  const quads: StudioQuadFace[] = new Array(tc);

  for (let ti = 0; ti < tc; ti++) {
    const i0 = idx[ti * 3]!;
    const i1 = idx[ti * 3 + 1]!;
    const i2 = idx[ti * 3 + 2]!;
    const role = roles[ti]!;
    const allowMuscleGlow = role === 'skin' || role === 'fabric';

    const e0 = allowMuscleGlow ? vEmissive[i0]! : 0;
    const e1 = allowMuscleGlow ? vEmissive[i1]! : 0;
    const e2 = allowMuscleGlow ? vEmissive[i2]! : 0;
    const emissiveAvg = (e0 + e1 + e2) / 3;
    const hasVertEmissive = e0 > 0.001 || e1 > 0.001 || e2 > 0.001;

    let c0: Rgb;
    let c1: Rgb;
    let c2: Rgb;
    if (isClay) {
      const clay = CLAY_PALETTE[role];
      if (isHeatmap && allowMuscleGlow && hasVertEmissive) {
        c0 = vTint[i0]! > 0.002 ? blendRgb(clay, glowRgb, vTint[i0]! * 0.72) : clay;
        c1 = vTint[i1]! > 0.002 ? blendRgb(clay, glowRgb, vTint[i1]! * 0.72) : clay;
        c2 = vTint[i2]! > 0.002 ? blendRgb(clay, glowRgb, vTint[i2]! * 0.72) : clay;
      } else {
        c0 = clay;
        c1 = clay;
        c2 = clay;
      }
    } else if (isXray) {
      const baseX = XRAY_PALETTE[role];
      if (allowMuscleGlow && hasVertEmissive) {
        c0 = vTint[i0]! > 0.002 ? blendRgb(baseX, glowRgb, vTint[i0]!) : baseX;
        c1 = vTint[i1]! > 0.002 ? blendRgb(baseX, glowRgb, vTint[i1]!) : baseX;
        c2 = vTint[i2]! > 0.002 ? blendRgb(baseX, glowRgb, vTint[i2]!) : baseX;
      } else {
        c0 = baseX;
        c1 = baseX;
        c2 = baseX;
      }
    } else if (allowMuscleGlow) {
      c0 = shadedCols[i0]!;
      c1 = shadedCols[i1]!;
      c2 = shadedCols[i2]!;
    } else {
      c0 = rawCols[i0]!;
      c1 = rawCols[i1]!;
      c2 = rawCols[i2]!;
    }

    const spec =
      role === 'gloss' ? 0.52 : role === 'hair' ? 0.26 : role === 'skin' ? 0.11 : 0.032;
    const shininess =
      role === 'gloss' ? 76 : role === 'hair' ? 38 : role === 'skin' ? 20 : 16;

    const v2 = vertsVec[i2]!;
    const n2 = normsVec[i2]!;
    quads[ti] = {
      verts: [vertsVec[i0]!, vertsVec[i1]!, v2, v2],
      vNormals: [normsVec[i0]!, normsVec[i1]!, n2, n2],
      vColors: [c0, c1, c2, c2],
      vEmissive: hasVertEmissive ? [e0, e1, e2, e2] : undefined,
      cullBackface: false,
      baseRgb: c0,
      alpha,
      spec,
      shininess,
      emissive: emissiveAvg,
      materialRole: role,
    };
  }

  return quads;
}
