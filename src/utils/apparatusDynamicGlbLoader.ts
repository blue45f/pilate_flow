/**
 * Zero-dependency glTF 2.0 Binary (`.glb`) Articulated Pilates Apparatus Parser &
 * Real-Time 60fps Rigid-Part Transformer (`StudioQuadFace[]`).
 *
 * Architecture:
 * - Parses multi-node standard glTF 2.0 `.glb` directly via `DataView` / TypedArrays
 *   (zero Three.js dependency, mirroring `skinnedHumanoidRetargeter.ts`).
 * - Pre-converts glTF Y-up `(x, y, z)` positions & normals into Studio Z-up `(x, -z, y)`
 *   once at load time so 60fps rendering pays zero coordinate-swizzle overhead.
 * - Extracts per-node multi-material primitives (`POSITION`, `NORMAL`, `COLOR_0`, `indices`),
 *   material roles (`wood` / `leather` / `chrome` / `brass` / `fabric` / `gloss`), and exact
 *   hinge pivot metadata from glTF `extras`.
 * - Caches static apparatus frame quads (`reformer_frame`, `chair_frame`, `cadillac_frame`,
 *   `barrel_ladder`, `barrel_spine_corrector`, `mat_studio`) per shader mode and transforms
 *   only lightweight articulated hardware (`reformer_carriage`, `reformer_short_box`,
 *   `reformer_long_box`, `reformer_footbar`, `chair_pedal`, `cadillac_ptb`) at 60fps+.
 * - Dynamic flexible elements (coiled springs, ropes, straps) remain procedural in
 *   `realtimeStudio3dEngine.ts`.
 * - Async browser singleton loader (`preloadApparatusDynamicGlb`) gracefully resolves `null`
 *   in SSR / jsdom / offline environments.
 */

import type { ApparatusType, FootbarState } from '../types/pilates';
import type {
  Rgb,
  StudioMaterialRole,
  StudioQuadFace,
  StudioWebGLShaderMode,
  Vec3,
} from './studio3dWebgl2Renderer';

export const APPARATUS_DYNAMIC_PARTS_GLB_URL =
  '/models/pilates-studio/apparatus-dynamic-parts-v1.glb';

export type ApparatusDynamicNodeName =
  | 'reformer_frame'
  | 'reformer_carriage'
  | 'reformer_footbar'
  | 'reformer_short_box'
  | 'reformer_long_box'
  | 'chair_frame'
  | 'chair_pedal'
  | 'cadillac_frame'
  | 'cadillac_ptb'
  | 'barrel_ladder'
  | 'barrel_spine_corrector'
  | 'mat_studio';

export const APPARATUS_DYNAMIC_NODE_NAMES: readonly ApparatusDynamicNodeName[] = [
  'reformer_frame',
  'reformer_carriage',
  'reformer_footbar',
  'reformer_short_box',
  'reformer_long_box',
  'chair_frame',
  'chair_pedal',
  'cadillac_frame',
  'cadillac_ptb',
  'barrel_ladder',
  'barrel_spine_corrector',
  'mat_studio',
];

export type ApparatusBoxOption = 'none' | 'short' | 'long' | 'short-box' | 'long-box';

export type ApparatusPivotAxis = '+X' | '-X' | '+Y' | '-Y' | '+Z' | '-Z';

export interface ApparatusPivotMetadata {
  /** Exact hinge/origin pivot in Studio Z-up coordinates `[x, y, z]` (meters). */
  readonly pivot: Vec3;
  /** Hinge rotation axis in Studio Z-up (`'+Y'` or `'-Y'` for sagittal pivots). */
  readonly axis: ApparatusPivotAxis;
  /** Authored rest angle in degrees corresponding to zero runtime delta rotation. */
  readonly restAngleDeg: number;
  /** Whether mesh vertices are authored around local `(0,0,0)` (`'pivot'`) or world Z-up (`'world'`). */
  readonly localOrigin: 'pivot' | 'world';
  /** Optional named preset angles in degrees (e.g. Reformer footbar `{ high: 0, mid: -15, low: -28 }`). */
  readonly presetAnglesDeg?: Readonly<Record<string, number>>;
}

export interface ApparatusMeshPrimitive {
  readonly materialName: string;
  readonly materialRole: StudioMaterialRole;
  readonly vertexCount: number;
  readonly triangleCount: number;
  /** Pre-converted Studio Z-up vertex positions (`3 * vertexCount`). */
  readonly positionsZup: Float32Array;
  /** Pre-converted Studio Z-up unit vertex normals (`3 * vertexCount`). */
  readonly normalsZup: Float32Array;
  /** Pre-converted sRGB 0..255 vertex colors (`3 * vertexCount`). */
  readonly colorsSrgb: Uint8Array;
  /** Triangle vertex indices (`3 * triangleCount`). */
  readonly indices: Uint32Array;
}

export interface ApparatusDynamicNode {
  readonly name: string;
  readonly primitives: readonly ApparatusMeshPrimitive[];
  readonly vertexCount: number;
  readonly triangleCount: number;
  /** glTF node translation pre-converted to Studio Z-up (`[0, 0, 0]` if absent). */
  readonly translationZup: Vec3;
  /** Resolved hinge pivot metadata from glTF `extras` (or canonical fallback for articulated parts). */
  readonly pivotMeta: ApparatusPivotMetadata | null;
  /** Raw glTF node `extras` payload if present. */
  readonly extras: Readonly<Record<string, unknown>> | null;
}

export interface ApparatusDynamicAsset {
  readonly nodes: ReadonlyMap<string, ApparatusDynamicNode>;
  readonly nodeNames: readonly string[];
  readonly pivots: ReadonlyMap<string, ApparatusPivotMetadata>;
  readonly totalVertices: number;
  readonly totalTriangles: number;
}

export interface DynamicApparatusRenderOptions {
  readonly apparatus: ApparatusType;
  readonly carriageX?: number;
  readonly footbar?: FootbarState;
  readonly box?: ApparatusBoxOption;
  readonly pedalDeg?: number;
  /** Optional independent left pedal angle (deg) for split-pedal Chair exercises. */
  readonly lPedalDeg?: number;
  /** Optional independent right pedal angle (deg) for split-pedal Chair exercises. */
  readonly rPedalDeg?: number;
  /** Cadillac Push-Through Bar angle (deg). `undefined`/`null` hides PTB unless `showPtb: true`. */
  readonly ptbDeg?: number | null;
  /** Explicit override to render/hide Cadillac PTB (defaults to `typeof ptbDeg === 'number'`). */
  readonly showPtb?: boolean;
  readonly useSpineCorrector?: boolean;
  readonly shader?: StudioWebGLShaderMode;
}

/**
 * Canonical Studio Z-up fallback hinge pivots matching `build_apparatus_dynamic_parts_glb.py`,
 * `universal3dExerciseRigs.ts` (`chairPedalPos`, `cadillacPushThroughBarPos`), and
 * `realtimeStudio3dEngine.ts`.
 */
export const DEFAULT_APPARATUS_PIVOTS: Readonly<Record<string, ApparatusPivotMetadata>> = {
  reformer_footbar: {
    pivot: [0.955, 0, 0.335],
    axis: '+Y',
    restAngleDeg: 0,
    localOrigin: 'pivot',
    presetAnglesDeg: {
      high: 0,
      mid: -15,
      low: -28,
    },
  },
  chair_pedal: {
    pivot: [-0.2, 0, 0.088],
    axis: '-Y',
    restAngleDeg: 0,
    localOrigin: 'pivot',
  },
  cadillac_ptb: {
    pivot: [0.62, 0, 1.94],
    axis: '+Y',
    restAngleDeg: 0,
    localOrigin: 'pivot',
  },
};

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

interface GltfMesh {
  readonly name?: string;
  readonly primitives: readonly GltfPrimitive[];
}

interface GltfNode {
  readonly name?: string;
  readonly mesh?: number;
  readonly translation?: readonly number[];
  readonly extras?: Readonly<Record<string, unknown>>;
}

interface GltfMaterial {
  readonly name?: string;
  readonly pbrMetallicRoughness?: {
    readonly baseColorFactor?: readonly number[];
    readonly metallicFactor?: number;
    readonly roughnessFactor?: number;
  };
}

interface GltfScene {
  readonly nodes?: readonly number[];
  readonly extras?: Readonly<Record<string, unknown>>;
}

interface GltfDocumentJson {
  readonly asset?: { readonly extras?: Readonly<Record<string, unknown>> };
  readonly extras?: Readonly<Record<string, unknown>>;
  readonly scenes?: readonly GltfScene[];
  readonly bufferViews?: readonly GltfBufferView[];
  readonly accessors?: readonly GltfAccessor[];
  readonly meshes?: readonly GltfMesh[];
  readonly nodes?: readonly GltfNode[];
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
    case 5120:
    case 5121:
      return 1;
    case 5122:
    case 5123:
      return 2;
    case 5125:
    case 5126:
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseVec3Tuple(value: unknown): Vec3 | null {
  if (!Array.isArray(value) || value.length < 3) return null;
  const x = Number(value[0]);
  const y = Number(value[1]);
  const z = Number(value[2]);
  if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) return null;
  return [x, y, z];
}

function normalizePivotAxis(raw: unknown, fallback: ApparatusPivotAxis): ApparatusPivotAxis {
  if (typeof raw !== 'string') return fallback;
  const key = raw.trim().toUpperCase();
  if (key === 'Y' || key === '+Y') return '+Y';
  if (key === '-Y') return '-Y';
  if (key === 'X' || key === '+X') return '+X';
  if (key === '-X') return '-X';
  if (key === 'Z' || key === '+Z') return '+Z';
  if (key === '-Z') return '-Z';
  return fallback;
}

function parsePresetAngles(raw: unknown): Readonly<Record<string, number>> | undefined {
  if (!isRecord(raw)) return undefined;
  const out: Record<string, number> = {};
  let hasEntry = false;
  for (const [k, v] of Object.entries(raw)) {
    const n = Number(v);
    if (Number.isFinite(n)) {
      out[k] = n;
      hasEntry = true;
    }
  }
  return hasEntry ? out : undefined;
}

function resolvePivotMetadata(
  nodeName: string,
  nodeExtras: Readonly<Record<string, unknown>> | null,
  rootPivotsMap: Readonly<Record<string, unknown>> | null,
  translationZup: Vec3,
): ApparatusPivotMetadata | null {
  const rootEntry = rootPivotsMap && isRecord(rootPivotsMap[nodeName]) ? rootPivotsMap[nodeName] : null;
  const combined: Record<string, unknown> = {
    ...(rootEntry ?? {}),
    ...(nodeExtras ?? {}),
  };
  const fallback = DEFAULT_APPARATUS_PIVOTS[nodeName] ?? null;

  const rawPivot = parseVec3Tuple(combined.pivot);
  const space = typeof combined.space === 'string' ? combined.space.toLowerCase() : 'studio-z-up';
  let resolvedPivot: Vec3 | null = null;
  if (rawPivot) {
    resolvedPivot =
      space === 'gltf-y-up' ? [rawPivot[0], -rawPivot[2], rawPivot[1]] : rawPivot;
  } else if (
    fallback &&
    (Math.abs(translationZup[0]) > 1e-6 ||
      Math.abs(translationZup[1]) > 1e-6 ||
      Math.abs(translationZup[2]) > 1e-6)
  ) {
    resolvedPivot = translationZup;
  } else if (fallback) {
    resolvedPivot = fallback.pivot;
  }

  if (!resolvedPivot) return null;

  const axis = normalizePivotAxis(combined.axis, fallback?.axis ?? '+Y');
  const restRaw = Number(combined.restAngleDeg);
  const restAngleDeg = Number.isFinite(restRaw) ? restRaw : (fallback?.restAngleDeg ?? 0);
  const localOrigin: 'pivot' | 'world' =
    combined.localOrigin === 'world'
      ? 'world'
      : combined.localOrigin === 'pivot'
        ? 'pivot'
        : (fallback?.localOrigin ?? 'pivot');
  const presetAnglesDeg =
    parsePresetAngles(combined.presetAnglesDeg) ?? fallback?.presetAnglesDeg;

  return {
    pivot: resolvedPivot,
    axis,
    restAngleDeg,
    localOrigin,
    ...(presetAnglesDeg ? { presetAnglesDeg } : {}),
  };
}

/**
 * Maps role-encoded glTF material names (`wood`, `leather`, `metal` / `metal_chrome` /
 * `metal_brass`, `matte`, `gloss`) to the renderer's `StudioMaterialRole`.
 */
function classifyApparatusMaterialRole(
  material: GltfMaterial | undefined,
  avgRgb: Rgb,
): StudioMaterialRole {
  const lower = (material?.name ?? '').toLowerCase();
  if (/(wood|oak|maple|walnut|birch|cork)/.test(lower)) return 'wood';
  if (/(leather|pad|cushion|grip|charcoal)/.test(lower)) return 'leather';
  if (/(brass|gold|bronze)/.test(lower)) return 'brass';
  if (/(chrome|steel|aluminum|aluminium)/.test(lower)) return 'chrome';
  if (lower.includes('gloss')) return 'gloss';
  if (/(matte|fabric|piping|welt|strap|fleece|ivory|cotton|sock)/.test(lower)) return 'fabric';

  const isMetallic =
    lower.includes('metal') || (material?.pbrMetallicRoughness?.metallicFactor ?? 0) >= 0.5;
  if (isMetallic) {
    return avgRgb[0] > avgRgb[2] + 28 && avgRgb[0] > 140 ? 'brass' : 'chrome';
  }
  return 'leather';
}

function computeSmoothVertexNormalsZup(
  positionsZup: Float32Array,
  indices: Uint32Array,
  vertexCount: number,
): Float32Array {
  const normals = new Float32Array(vertexCount * 3);
  const triCount = Math.floor(indices.length / 3);
  for (let ti = 0; ti < triCount; ti++) {
    const i0 = indices[ti * 3]! * 3;
    const i1 = indices[ti * 3 + 1]! * 3;
    const i2 = indices[ti * 3 + 2]! * 3;
    const ax = positionsZup[i1]! - positionsZup[i0]!;
    const ay = positionsZup[i1 + 1]! - positionsZup[i0 + 1]!;
    const az = positionsZup[i1 + 2]! - positionsZup[i0 + 2]!;
    const bx = positionsZup[i2]! - positionsZup[i0]!;
    const by = positionsZup[i2 + 1]! - positionsZup[i0 + 1]!;
    const bz = positionsZup[i2 + 2]! - positionsZup[i0 + 2]!;
    const nx = ay * bz - az * by;
    const ny = az * bx - ax * bz;
    const nz = ax * by - ay * bx;
    normals[i0] = normals[i0]! + nx;
    normals[i0 + 1] = normals[i0 + 1]! + ny;
    normals[i0 + 2] = normals[i0 + 2]! + nz;
    normals[i1] = normals[i1]! + nx;
    normals[i1 + 1] = normals[i1 + 1]! + ny;
    normals[i1 + 2] = normals[i1 + 2]! + nz;
    normals[i2] = normals[i2]! + nx;
    normals[i2 + 1] = normals[i2 + 1]! + ny;
    normals[i2 + 2] = normals[i2 + 2]! + nz;
  }
  for (let vi = 0; vi < vertexCount; vi++) {
    const o = vi * 3;
    const l = Math.hypot(normals[o]!, normals[o + 1]!, normals[o + 2]!);
    if (l > 1e-6) {
      normals[o] = normals[o]! / l;
      normals[o + 1] = normals[o + 1]! / l;
      normals[o + 2] = normals[o + 2]! / l;
    } else {
      normals[o] = 0;
      normals[o + 1] = 0;
      normals[o + 2] = 1;
    }
  }
  return normals;
}

/**
 * Parses a multi-node binary GLB v2 articulated apparatus file and pre-converts all
 * geometry from glTF Y-up `(x, y, z)` to Studio Z-up `(x, -z, y)` at load time.
 */
export function parseApparatusDynamicGlb(buffer: ArrayBuffer): ApparatusDynamicAsset {
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

  // Extract optional root-level pivot lookup table
  const rootPivotsCandidate =
    (isRecord(gltf.extras) && gltf.extras.pilatesApparatusPivots) ||
    (isRecord(gltf.scenes?.[0]?.extras) && gltf.scenes[0].extras.pilatesApparatusPivots) ||
    (isRecord(gltf.asset?.extras) && gltf.asset.extras.pilatesApparatusPivots) ||
    null;
  const rootPivotsMap = isRecord(rootPivotsCandidate) ? rootPivotsCandidate : null;

  const nodesMap = new Map<string, ApparatusDynamicNode>();
  const nodeNames: string[] = [];
  const pivotsMap = new Map<string, ApparatusPivotMetadata>();
  let totalVertices = 0;
  let totalTriangles = 0;

  const gltfNodes = gltf.nodes ?? [];
  const gltfMeshes = gltf.meshes ?? [];
  const gltfMaterials = gltf.materials ?? [];

  // Fast-path: 1-draw-call packed GLB (`extras.pilatesApparatusPacked` with part+role encoded in COLOR_0.a)
  const packedMeta =
    isRecord(gltf.extras) && isRecord(gltf.extras.pilatesApparatusPacked)
      ? gltf.extras.pilatesApparatusPacked
      : null;

  if (packedMeta && gltfMeshes.length > 0 && gltfMeshes[0]!.primitives.length > 0) {
    const partOrder = Array.isArray(packedMeta.partOrder)
      ? (packedMeta.partOrder as string[])
      : [...APPARATUS_DYNAMIC_NODE_NAMES];
    const roleOrder = Array.isArray(packedMeta.roleOrder)
      ? (packedMeta.roleOrder as StudioMaterialRole[])
      : (['wood', 'leather', 'chrome', 'brass', 'fabric', 'gloss'] as StudioMaterialRole[]);
    const partBins = typeof packedMeta.partBins === 'number' ? packedMeta.partBins : 16;
    const roleBins = typeof packedMeta.roleBins === 'number' ? packedMeta.roleBins : 8;

    const prim = gltfMeshes[0]!.primitives[0]!;
    const posAccIdx = prim.attributes.POSITION;
    const colAccIdx = prim.attributes.COLOR_0;
    const uv1AccIdx = prim.attributes.TEXCOORD_1;
    if (posAccIdx === undefined || colAccIdx === undefined || uv1AccIdx === undefined) {
      throw new Error('Packed apparatus GLB missing POSITION, COLOR_0, or TEXCOORD_1 attribute');
    }

    const posRes = readAccessorAsFloat32(gltf, binView, posAccIdx);
    const vertexCount = posRes.count;
    const positionsZup = new Float32Array(vertexCount * 3);
    for (let vi = 0; vi < vertexCount; vi++) {
      const o = vi * 3;
      positionsZup[o] = posRes.data[o]!;
      positionsZup[o + 1] = -posRes.data[o + 2]!;
      positionsZup[o + 2] = posRes.data[o + 1]!;
    }

    const indices =
      prim.indices !== undefined
        ? readAccessorAsUint32(gltf, binView, prim.indices)
        : Uint32Array.from({ length: vertexCount }, (_, i) => i);
    const triangleCount = Math.floor(indices.length / 3);

    let normalsZup: Float32Array;
    if (prim.attributes.NORMAL !== undefined) {
      const normRes = readAccessorAsFloat32(gltf, binView, prim.attributes.NORMAL);
      normalsZup = new Float32Array(vertexCount * 3);
      for (let vi = 0; vi < vertexCount; vi++) {
        const o = vi * 3;
        const nx = normRes.data[o]!;
        const ny = -normRes.data[o + 2]!;
        const nz = normRes.data[o + 1]!;
        const l = Math.hypot(nx, ny, nz);
        if (l > 1e-6) {
          normalsZup[o] = nx / l;
          normalsZup[o + 1] = ny / l;
          normalsZup[o + 2] = nz / l;
        } else {
          normalsZup[o + 2] = 1;
        }
      }
    } else {
      normalsZup = computeSmoothVertexNormalsZup(positionsZup, indices, vertexCount);
    }

    const colRes = readAccessorAsFloat32(gltf, binView, colAccIdx, true);
    const nc = colRes.numComponents;
    const colorsSrgb = new Uint8Array(vertexCount * 3);
    for (let vi = 0; vi < vertexCount; vi++) {
      const src = vi * nc;
      const dst = vi * 3;
      colorsSrgb[dst] = linearToSrgbByte(colRes.data[src] ?? 0.5);
      colorsSrgb[dst + 1] = linearToSrgbByte(colRes.data[src + 1] ?? 0.5);
      colorsSrgb[dst + 2] = linearToSrgbByte(colRes.data[src + 2] ?? 0.5);
    }

    const uv1Res = readAccessorAsFloat32(gltf, binView, uv1AccIdx);
    const buckets: number[][][] = Array.from({ length: partOrder.length }, () =>
      Array.from({ length: roleOrder.length }, () => []),
    );
    for (let ti = 0; ti < triangleCount; ti++) {
      const i0 = indices[ti * 3]!;
      const i1 = indices[ti * 3 + 1]!;
      const i2 = indices[ti * 3 + 2]!;
      const u = uv1Res.data[i0 * 2] ?? 0;
      const v = uv1Res.data[i0 * 2 + 1] ?? 0;
      const partIdx = Math.max(0, Math.min(partOrder.length - 1, Math.floor(u * partBins)));
      const roleIdx = Math.max(0, Math.min(roleOrder.length - 1, Math.floor(v * roleBins)));
      buckets[partIdx]![roleIdx]!.push(i0, i1, i2);
    }

    for (let pi = 0; pi < partOrder.length; pi++) {
      const name = partOrder[pi]!;
      const partBuckets = buckets[pi]!;
      const primitives: ApparatusMeshPrimitive[] = [];
      let partTris = 0;
      for (let ri = 0; ri < roleOrder.length; ri++) {
        const triIdxList = partBuckets[ri]!;
        if (triIdxList.length === 0) continue;
        const role = roleOrder[ri]!;
        // Local indices keep a moving pedal or carriage from transforming vertices
        // belonging to the other four apparatuses every time it moves.
        const sourceVertices = [...new Set(triIdxList)];
        const localIndex = new Map(sourceVertices.map((source, local) => [source, local]));
        const localPositions = new Float32Array(sourceVertices.length * 3);
        const localNormals = new Float32Array(localPositions.length);
        const localColors = new Uint8Array(localPositions.length);
        for (let vi = 0; vi < sourceVertices.length; vi++) {
          const source = sourceVertices[vi]! * 3;
          for (let axis = 0; axis < 3; axis++) {
            const destination = vi * 3 + axis;
            localPositions[destination] = positionsZup[source + axis]!;
            localNormals[destination] = normalsZup[source + axis]!;
            localColors[destination] = colorsSrgb[source + axis]!;
          }
        }
        const subIndices = Uint32Array.from(triIdxList, (index) => localIndex.get(index)!);
        const subTriCount = subIndices.length / 3;
        primitives.push({
          materialName: `MAT_Apparatus_${role}`,
          materialRole: role,
          vertexCount: sourceVertices.length,
          triangleCount: subTriCount,
          positionsZup: localPositions,
          normalsZup: localNormals,
          colorsSrgb: localColors,
          indices: subIndices,
        });
        partTris += subTriCount;
      }
      if (primitives.length === 0) continue;

      const pivotMeta = resolvePivotMetadata(name, null, rootPivotsMap, [0, 0, 0]);
      if (pivotMeta) {
        pivotsMap.set(name, pivotMeta);
      }
      nodesMap.set(name, {
        name,
        primitives,
        vertexCount: primitives.reduce((sum, primitive) => sum + primitive.vertexCount, 0),
        triangleCount: partTris,
        translationZup: [0, 0, 0],
        pivotMeta,
        extras: null,
      });
      nodeNames.push(name);
      totalTriangles += partTris;
    }

    return {
      nodes: nodesMap,
      nodeNames,
      pivots: pivotsMap,
      totalVertices: vertexCount,
      totalTriangles,
    };
  }

  for (let ni = 0; ni < gltfNodes.length; ni++) {
    const gNode = gltfNodes[ni]!;
    if (gNode.mesh === undefined) continue;
    const gMesh = gltfMeshes[gNode.mesh];
    if (!gMesh || gMesh.primitives.length === 0) continue;

    const name = gNode.name ?? gMesh.name ?? `node_${ni}`;
    const rawTrans = gNode.translation;
    const translationZup: Vec3 =
      rawTrans && rawTrans.length >= 3
        ? [rawTrans[0] ?? 0, -(rawTrans[2] ?? 0), rawTrans[1] ?? 0]
        : [0, 0, 0];

    const primitives: ApparatusMeshPrimitive[] = [];
    let nodeVerts = 0;
    let nodeTris = 0;

    for (const prim of gMesh.primitives) {
      const posAccIdx = prim.attributes.POSITION;
      if (posAccIdx === undefined) {
        throw new Error(`Node '${name}' primitive missing POSITION attribute`);
      }
      const posRes = readAccessorAsFloat32(gltf, binView, posAccIdx);
      const vertexCount = posRes.count;

      // Pre-convert glTF Y-up (x, y, z) -> Studio Z-up (x, -z, y)
      const positionsZup = new Float32Array(vertexCount * 3);
      for (let vi = 0; vi < vertexCount; vi++) {
        const o = vi * 3;
        positionsZup[o] = posRes.data[o]!;
        positionsZup[o + 1] = -posRes.data[o + 2]!;
        positionsZup[o + 2] = posRes.data[o + 1]!;
      }

      // Triangle indices
      let indices: Uint32Array;
      if (prim.indices !== undefined) {
        indices = readAccessorAsUint32(gltf, binView, prim.indices);
      } else {
        indices = new Uint32Array(vertexCount);
        for (let vi = 0; vi < vertexCount; vi++) indices[vi] = vi;
      }
      const triangleCount = Math.floor(indices.length / 3);

      // Pre-convert unit normals glTF Y-up -> Studio Z-up
      let normalsZup: Float32Array;
      if (prim.attributes.NORMAL !== undefined) {
        const normRes = readAccessorAsFloat32(gltf, binView, prim.attributes.NORMAL);
        normalsZup = new Float32Array(vertexCount * 3);
        for (let vi = 0; vi < vertexCount; vi++) {
          const o = vi * 3;
          const nx = normRes.data[o]!;
          const ny = -normRes.data[o + 2]!;
          const nz = normRes.data[o + 1]!;
          const l = Math.hypot(nx, ny, nz);
          if (l > 1e-6) {
            normalsZup[o] = nx / l;
            normalsZup[o + 1] = ny / l;
            normalsZup[o + 2] = nz / l;
          } else {
            normalsZup[o] = 0;
            normalsZup[o + 1] = 0;
            normalsZup[o + 2] = 1;
          }
        }
      } else {
        normalsZup = computeSmoothVertexNormalsZup(positionsZup, indices, vertexCount);
      }

      // Vertex colors COLOR_0 (linear -> sRGB 0..255; fallback to material baseColorFactor)
      const gMat = prim.material !== undefined ? gltfMaterials[prim.material] : undefined;
      const colorsSrgb = new Uint8Array(vertexCount * 3);
      let rSum = 0;
      let gSum = 0;
      let bSum = 0;

      if (prim.attributes.COLOR_0 !== undefined) {
        const colRes = readAccessorAsFloat32(gltf, binView, prim.attributes.COLOR_0, true);
        const nc = colRes.numComponents;
        for (let vi = 0; vi < vertexCount; vi++) {
          const src = vi * nc;
          const dst = vi * 3;
          const r = linearToSrgbByte(colRes.data[src] ?? 0.5);
          const g = linearToSrgbByte(colRes.data[src + 1] ?? 0.5);
          const b = linearToSrgbByte(colRes.data[src + 2] ?? 0.5);
          colorsSrgb[dst] = r;
          colorsSrgb[dst + 1] = g;
          colorsSrgb[dst + 2] = b;
          rSum += r;
          gSum += g;
          bSum += b;
        }
      } else {
        const bf = gMat?.pbrMetallicRoughness?.baseColorFactor;
        const r = linearToSrgbByte(bf?.[0] ?? 0.62);
        const g = linearToSrgbByte(bf?.[1] ?? 0.54);
        const b = linearToSrgbByte(bf?.[2] ?? 0.44);
        for (let vi = 0; vi < vertexCount; vi++) {
          const dst = vi * 3;
          colorsSrgb[dst] = r;
          colorsSrgb[dst + 1] = g;
          colorsSrgb[dst + 2] = b;
        }
        rSum = r * vertexCount;
        gSum = g * vertexCount;
        bSum = b * vertexCount;
      }

      const invVc = vertexCount > 0 ? 1 / vertexCount : 1;
      const avgRgb: Rgb = [
        Math.round(rSum * invVc),
        Math.round(gSum * invVc),
        Math.round(bSum * invVc),
      ];
      const materialRole = classifyApparatusMaterialRole(gMat, avgRgb);

      primitives.push({
        materialName: gMat?.name ?? '',
        materialRole,
        vertexCount,
        triangleCount,
        positionsZup,
        normalsZup,
        colorsSrgb,
        indices,
      });

      nodeVerts += vertexCount;
      nodeTris += triangleCount;
    }

    const nodeExtras = isRecord(gNode.extras) ? gNode.extras : null;
    const pivotMeta = resolvePivotMetadata(name, nodeExtras, rootPivotsMap, translationZup);
    if (pivotMeta) {
      pivotsMap.set(name, pivotMeta);
    }

    const parsedNode: ApparatusDynamicNode = {
      name,
      primitives,
      vertexCount: nodeVerts,
      triangleCount: nodeTris,
      translationZup,
      pivotMeta,
      extras: nodeExtras,
    };
    nodesMap.set(name, parsedNode);
    nodeNames.push(name);
    totalVertices += nodeVerts;
    totalTriangles += nodeTris;
  }

  if (nodesMap.size === 0) {
    throw new Error('GLB contains no valid mesh nodes');
  }

  return {
    nodes: nodesMap,
    nodeNames,
    pivots: pivotsMap,
    totalVertices,
    totalTriangles,
  };
}

// ==============================================================================
// 2. BROWSER SINGLETON ASYNC LOADER (SSR / JSDOM / OFFLINE SAFE)
// ==============================================================================

let cachedApparatusAsset: ApparatusDynamicAsset | null = null;
let inflightApparatusLoad: Promise<ApparatusDynamicAsset | null> | null = null;

function resolveDefaultApparatusGlbUrl(): string {
  try {
    const base =
      typeof import.meta !== 'undefined' &&
      (import.meta as ImportMeta & { env?: { BASE_URL?: string } }).env?.BASE_URL;
    if (base && base !== '/') {
      const trimmed = base.endsWith('/') ? base.slice(0, -1) : base;
      return `${trimmed}${APPARATUS_DYNAMIC_PARTS_GLB_URL}`;
    }
  } catch {
    // Fall back to root-relative path
  }
  return APPARATUS_DYNAMIC_PARTS_GLB_URL;
}

export function getCachedApparatusDynamicAsset(): ApparatusDynamicAsset | null {
  return cachedApparatusAsset;
}

/** Test-only helper to inject or clear a pre-parsed apparatus GLB asset synchronously. */
export function setCachedApparatusDynamicAsset(asset: ApparatusDynamicAsset | null): void {
  cachedApparatusAsset = asset;
  inflightApparatusLoad = null;
}

export function preloadApparatusDynamicGlb(
  url?: string,
): Promise<ApparatusDynamicAsset | null> {
  if (cachedApparatusAsset) return Promise.resolve(cachedApparatusAsset);
  if (typeof window === 'undefined' || typeof fetch !== 'function') {
    return Promise.resolve(null);
  }
  if (typeof navigator !== 'undefined' && /jsdom/i.test(navigator.userAgent)) {
    return Promise.resolve(null);
  }
  if (inflightApparatusLoad) return inflightApparatusLoad;

  const targetUrl = url ?? resolveDefaultApparatusGlbUrl();
  inflightApparatusLoad = fetch(targetUrl)
    .then((response) => {
      if (!response.ok) return null;
      return response.arrayBuffer();
    })
    .then((buf) => {
      if (!buf) return null;
      const parsed = parseApparatusDynamicGlb(buf);
      cachedApparatusAsset = parsed;
      return parsed;
    })
    .catch(() => null)
    .finally(() => {
      if (!cachedApparatusAsset) {
        inflightApparatusLoad = null;
      }
    });

  return inflightApparatusLoad;
}

// ==============================================================================
// 3. REAL-TIME 60FPS RIGID TRANSFORM & SHADER QUAD EMITTER
// ==============================================================================

const CLAY_PALETTE: Readonly<Record<StudioMaterialRole, Rgb>> = {
  wood: [206, 202, 194],
  leather: [184, 180, 174],
  chrome: [198, 200, 204],
  brass: [194, 188, 176],
  fabric: [216, 212, 204],
  gloss: [214, 210, 202],
  skin: [226, 222, 215],
  hair: [168, 164, 158],
};

const XRAY_PALETTE: Readonly<Record<StudioMaterialRole, Rgb>> = {
  wood: [76, 102, 92],
  leather: [30, 54, 46],
  chrome: [152, 210, 196],
  brass: [152, 210, 196],
  fabric: [62, 170, 142],
  gloss: [148, 226, 204],
  skin: [125, 212, 188],
  hair: [48, 126, 106],
};

const ARENA_PALETTE: Readonly<Record<StudioMaterialRole, Rgb>> = {
  wood: [76, 102, 92],
  leather: [30, 54, 46],
  chrome: [206, 214, 221],
  brass: [214, 175, 104],
  fabric: [212, 218, 212],
  gloss: [196, 208, 200],
  skin: [224, 188, 166],
  hair: [52, 42, 36],
};

function materialLightingForRole(role: StudioMaterialRole): readonly [number, number] {
  switch (role) {
    case 'brass':
      return [0.62, 64];
    case 'chrome':
      return [0.58, 64];
    case 'gloss':
      return [0.52, 72];
    case 'wood':
      return [0.25, 28];
    case 'leather':
      return [0.2, 24];
    case 'fabric':
      return [0.05, 16];
    case 'hair':
      return [0.26, 38];
    case 'skin':
    default:
      return [0.11, 20];
  }
}

function calibrateStudioPbrApparatusRgb(
  role: StudioMaterialRole,
  r: number,
  g: number,
  b: number,
): Rgb {
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  if (role === 'leather' && lum < 115 && g >= r && g >= b) {
    // Lift dark pine upholstery into warm Calm Botanical Sage matching Blender Cycles renders
    return [
      Math.min(255, Math.round(r + 48)),
      Math.min(255, Math.round(g + 48)),
      Math.min(255, Math.round(b + 44)),
    ];
  }
  if (role === 'wood' && lum < 130 && r >= g && g >= b) {
    // Lift dark walnut beams into warm satin walnut/oak matching studio photography
    return [
      Math.min(255, Math.round(r + 42)),
      Math.min(255, Math.round(g + 34)),
      Math.min(255, Math.round(b + 24)),
    ];
  }
  return [r, g, b];
}

const calibratedVertexColors = new WeakMap<ApparatusMeshPrimitive, Rgb[]>();

function buildVertexColorTable(
  prim: ApparatusMeshPrimitive,
  shader: StudioWebGLShaderMode,
): { readonly uniformColor: Rgb | null; readonly vertexColors: Rgb[] | null; readonly alpha: number } {
  const role = prim.materialRole;
  if (shader === 'clay-wire') {
    return { uniformColor: CLAY_PALETTE[role], vertexColors: null, alpha: 1.0 };
  }
  if (shader === 'biomech-xray') {
    return { uniformColor: XRAY_PALETTE[role], vertexColors: null, alpha: 0.48 };
  }
  if (shader === 'game-arena') {
    return { uniformColor: ARENA_PALETTE[role], vertexColors: null, alpha: 1.0 };
  }
  const cached = calibratedVertexColors.get(prim);
  if (cached) return { uniformColor: null, vertexColors: cached, alpha: 1 };
  const vc = prim.vertexCount;
  const cols = prim.colorsSrgb;
  const table: Rgb[] = new Array(vc);
  for (let vi = 0; vi < vc; vi++) {
    const o = vi * 3;
    table[vi] = calibrateStudioPbrApparatusRgb(role, cols[o]!, cols[o + 1]!, cols[o + 2]!);
  }
  calibratedVertexColors.set(prim, table);
  return { uniformColor: null, vertexColors: table, alpha: 1.0 };
}

function emitTranslatedNodeQuads(
  node: ApparatusDynamicNode,
  tx: number,
  ty: number,
  tz: number,
  shader: StudioWebGLShaderMode,
  out: StudioQuadFace[],
): void {
  const dx = tx + node.translationZup[0];
  const dy = ty + node.translationZup[1];
  const dz = tz + node.translationZup[2];

  for (const prim of node.primitives) {
    const vc = prim.vertexCount;
    const tc = prim.triangleCount;
    const pos = prim.positionsZup;
    const norm = prim.normalsZup;
    const idx = prim.indices;
    const role = prim.materialRole;
    const [spec, shininess] = materialLightingForRole(role);
    const { uniformColor, vertexColors, alpha } = buildVertexColorTable(prim, shader);

    const vertsVec: Vec3[] = new Array(vc);
    const normsVec: Vec3[] = new Array(vc);
    for (let vi = 0; vi < vc; vi++) {
      const o = vi * 3;
      vertsVec[vi] = [pos[o]! + dx, pos[o + 1]! + dy, pos[o + 2]! + dz];
      normsVec[vi] = [norm[o]!, norm[o + 1]!, norm[o + 2]!];
    }

    for (let ti = 0; ti < tc; ti++) {
      const i0 = idx[ti * 3]!;
      const i1 = idx[ti * 3 + 1]!;
      const i2 = idx[ti * 3 + 2]!;
      const v2 = vertsVec[i2]!;
      const n2 = normsVec[i2]!;
      const c0 = uniformColor ?? vertexColors![i0]!;
      const c1 = uniformColor ?? vertexColors![i1]!;
      const c2 = uniformColor ?? vertexColors![i2]!;

      out.push({
        verts: [vertsVec[i0]!, vertsVec[i1]!, v2, v2],
        vNormals: [normsVec[i0]!, normsVec[i1]!, n2, n2],
        vColors: [c0, c1, c2, c2],
        cullBackface: false,
        baseRgb: c0,
        alpha,
        spec,
        shininess,
        materialRole: role,
      });
    }
  }
}

function emitRotatedYNodeQuads(
  node: ApparatusDynamicNode,
  pivotMeta: ApparatusPivotMetadata,
  angleDeg: number,
  shader: StudioWebGLShaderMode,
  out: StudioQuadFace[],
): void {
  const [pivX, pivY, pivZ] = pivotMeta.pivot;
  const subX = pivotMeta.localOrigin === 'world' ? pivX : 0;
  const subY = pivotMeta.localOrigin === 'world' ? pivY : 0;
  const subZ = pivotMeta.localOrigin === 'world' ? pivZ : 0;
  const axisSign = pivotMeta.axis === '-Y' ? -1 : 1;
  const thetaRad = (axisSign * (angleDeg - pivotMeta.restAngleDeg) * Math.PI) / 180;
  const cosT = Math.cos(thetaRad);
  const sinT = Math.sin(thetaRad);

  for (const prim of node.primitives) {
    const vc = prim.vertexCount;
    const tc = prim.triangleCount;
    const pos = prim.positionsZup;
    const norm = prim.normalsZup;
    const idx = prim.indices;
    const role = prim.materialRole;
    const [spec, shininess] = materialLightingForRole(role);
    const { uniformColor, vertexColors, alpha } = buildVertexColorTable(prim, shader);

    const vertsVec: Vec3[] = new Array(vc);
    const normsVec: Vec3[] = new Array(vc);
    for (let vi = 0; vi < vc; vi++) {
      const o = vi * 3;
      const lx = pos[o]! - subX;
      const ly = pos[o + 1]! - subY;
      const lz = pos[o + 2]! - subZ;
      vertsVec[vi] = [
        pivX + lx * cosT + lz * sinT,
        pivY + ly,
        pivZ - lx * sinT + lz * cosT,
      ];
      const nx = norm[o]!;
      const ny = norm[o + 1]!;
      const nz = norm[o + 2]!;
      normsVec[vi] = [
        nx * cosT + nz * sinT,
        ny,
        -nx * sinT + nz * cosT,
      ];
    }

    for (let ti = 0; ti < tc; ti++) {
      const i0 = idx[ti * 3]!;
      const i1 = idx[ti * 3 + 1]!;
      const i2 = idx[ti * 3 + 2]!;
      const v2 = vertsVec[i2]!;
      const n2 = normsVec[i2]!;
      const c0 = uniformColor ?? vertexColors![i0]!;
      const c1 = uniformColor ?? vertexColors![i1]!;
      const c2 = uniformColor ?? vertexColors![i2]!;

      out.push({
        verts: [vertsVec[i0]!, vertsVec[i1]!, v2, v2],
        vNormals: [normsVec[i0]!, normsVec[i1]!, n2, n2],
        vColors: [c0, c1, c2, c2],
        cullBackface: false,
        baseRgb: c0,
        alpha,
        spec,
        shininess,
        materialRole: role,
      });
    }
  }
}

/**
 * Split-pedal Chair emitter: independently rotates left (`y < -0.016`) and right
 * (`y > +0.016`) pedal halves when `lPedalDeg !== rPedalDeg` and omits the central
 * locking dowel (`|y| <= 0.016`).
 */
function emitSplitChairPedalQuads(
  node: ApparatusDynamicNode,
  pivotMeta: ApparatusPivotMetadata,
  lPedalDeg: number,
  rPedalDeg: number,
  shader: StudioWebGLShaderMode,
  out: StudioQuadFace[],
): void {
  const [pivX, pivY, pivZ] = pivotMeta.pivot;
  const subX = pivotMeta.localOrigin === 'world' ? pivX : 0;
  const subY = pivotMeta.localOrigin === 'world' ? pivY : 0;
  const subZ = pivotMeta.localOrigin === 'world' ? pivZ : 0;
  const axisSign = pivotMeta.axis === '-Y' ? -1 : 1;

  const lRad = (axisSign * (lPedalDeg - pivotMeta.restAngleDeg) * Math.PI) / 180;
  const rRad = (axisSign * (rPedalDeg - pivotMeta.restAngleDeg) * Math.PI) / 180;
  const lCos = Math.cos(lRad);
  const lSin = Math.sin(lRad);
  const rCos = Math.cos(rRad);
  const rSin = Math.sin(rRad);

  for (const prim of node.primitives) {
    const vc = prim.vertexCount;
    const tc = prim.triangleCount;
    const pos = prim.positionsZup;
    const norm = prim.normalsZup;
    const idx = prim.indices;
    const role = prim.materialRole;
    const [spec, shininess] = materialLightingForRole(role);
    const { uniformColor, vertexColors, alpha } = buildVertexColorTable(prim, shader);

    const lVerts: Vec3[] = new Array(vc);
    const lNorms: Vec3[] = new Array(vc);
    const rVerts: Vec3[] = new Array(vc);
    const rNorms: Vec3[] = new Array(vc);

    for (let vi = 0; vi < vc; vi++) {
      const o = vi * 3;
      const lx = pos[o]! - subX;
      const ly = pos[o + 1]! - subY;
      const lz = pos[o + 2]! - subZ;
      const nx = norm[o]!;
      const ny = norm[o + 1]!;
      const nz = norm[o + 2]!;

      lVerts[vi] = [pivX + lx * lCos + lz * lSin, pivY + ly, pivZ - lx * lSin + lz * lCos];
      lNorms[vi] = [nx * lCos + nz * lSin, ny, -nx * lSin + nz * lCos];
      rVerts[vi] = [pivX + lx * rCos + lz * rSin, pivY + ly, pivZ - lx * rSin + lz * rCos];
      rNorms[vi] = [nx * rCos + nz * rSin, ny, -nx * rSin + nz * rCos];
    }

    for (let ti = 0; ti < tc; ti++) {
      const i0 = idx[ti * 3]!;
      const i1 = idx[ti * 3 + 1]!;
      const i2 = idx[ti * 3 + 2]!;
      const yc =
        (pos[i0 * 3 + 1]! - subY + (pos[i1 * 3 + 1]! - subY) + (pos[i2 * 3 + 1]! - subY)) / 3;
      if (Math.abs(yc) <= 0.016) continue; // Omit central split-pedal bridge pin while unlocked

      const verts = yc < 0 ? lVerts : rVerts;
      const norms = yc < 0 ? lNorms : rNorms;
      const v2 = verts[i2]!;
      const n2 = norms[i2]!;
      const c0 = uniformColor ?? vertexColors![i0]!;
      const c1 = uniformColor ?? vertexColors![i1]!;
      const c2 = uniformColor ?? vertexColors![i2]!;

      out.push({
        verts: [verts[i0]!, verts[i1]!, v2, v2],
        vNormals: [norms[i0]!, norms[i1]!, n2, n2],
        vColors: [c0, c1, c2, c2],
        cullBackface: false,
        baseRgb: c0,
        alpha,
        spec,
        shininess,
        materialRole: role,
      });
    }
  }
}

// Per-node static quad cache keyed by shader mode (zero allocations on static frames at 60fps!)
const staticNodeQuadCache = new WeakMap<
  ApparatusDynamicNode,
  Map<StudioWebGLShaderMode, readonly StudioQuadFace[]>
>();

function appendStaticNodeQuads(
  node: ApparatusDynamicNode | undefined,
  shader: StudioWebGLShaderMode,
  out: StudioQuadFace[],
): void {
  if (!node) return;
  let byShader = staticNodeQuadCache.get(node);
  if (!byShader) {
    byShader = new Map<StudioWebGLShaderMode, readonly StudioQuadFace[]>();
    staticNodeQuadCache.set(node, byShader);
  }
  let cached = byShader.get(shader);
  if (!cached) {
    const built: StudioQuadFace[] = [];
    emitTranslatedNodeQuads(node, 0, 0, 0, shader, built);
    cached = built;
    byShader.set(shader, cached);
  }
  for (let i = 0; i < cached.length; i++) {
    out.push(cached[i]!);
  }
}

function resolveFootbarAngleDeg(
  footbar: FootbarState,
  pivotMeta: ApparatusPivotMetadata,
): number | null {
  if (footbar === 'down' || footbar === 'none') return null;
  const presets = pivotMeta.presetAnglesDeg;
  if (presets && footbar in presets) {
    return presets[footbar]!;
  }
  if (footbar === 'mid') return -15;
  if (footbar === 'low') return -28;
  return 0;
}

/**
 * Builds transformed rigid Studio 3D quads (`StudioQuadFace[]`) for the requested Pilates
 * apparatus and live kinematic state (`carriageX`, `footbar`, `box`, `pedalDeg`, `ptbDeg`,
 * `useSpineCorrector`, `shader`).
 */
export function buildDynamicApparatusQuads(
  asset: ApparatusDynamicAsset,
  options: DynamicApparatusRenderOptions,
): StudioQuadFace[] {
  const shader: StudioWebGLShaderMode = options.shader ?? 'studio-pbr';
  const quads: StudioQuadFace[] = [];

  switch (options.apparatus) {
    case 'reformer': {
      const cx = options.carriageX ?? 0;
      const footbar: FootbarState = options.footbar ?? 'high';
      const box: ApparatusBoxOption = options.box ?? 'none';

      appendStaticNodeQuads(asset.nodes.get('reformer_frame'), shader, quads);

      const carriage = asset.nodes.get('reformer_carriage');
      if (carriage) {
        emitTranslatedNodeQuads(carriage, cx, 0, 0, shader, quads);
      }

      if (box === 'short' || box === 'short-box') {
        const shortBox = asset.nodes.get('reformer_short_box');
        if (shortBox) {
          emitTranslatedNodeQuads(shortBox, cx, 0, 0, shader, quads);
        }
      } else if (box === 'long' || box === 'long-box') {
        const longBox = asset.nodes.get('reformer_long_box');
        if (longBox) {
          emitTranslatedNodeQuads(longBox, cx, 0, 0, shader, quads);
        }
      }

      const footbarNode = asset.nodes.get('reformer_footbar');
      if (footbarNode) {
        const fbPivot =
          footbarNode.pivotMeta ??
          asset.pivots.get('reformer_footbar') ??
          DEFAULT_APPARATUS_PIVOTS.reformer_footbar!;
        const fbAngle = resolveFootbarAngleDeg(footbar, fbPivot);
        if (fbAngle !== null) {
          emitRotatedYNodeQuads(footbarNode, fbPivot, fbAngle, shader, quads);
        }
      }
      break;
    }

    case 'chair': {
      appendStaticNodeQuads(asset.nodes.get('chair_frame'), shader, quads);

      const pedalNode = asset.nodes.get('chair_pedal');
      if (pedalNode) {
        const pedalPivot =
          pedalNode.pivotMeta ??
          asset.pivots.get('chair_pedal') ??
          DEFAULT_APPARATUS_PIVOTS.chair_pedal!;
        const baseDeg = options.pedalDeg ?? 22;
        const lDeg = options.lPedalDeg ?? baseDeg;
        const rDeg = options.rPedalDeg ?? baseDeg;
        if (Math.abs(lDeg - rDeg) > 0.5) {
          emitSplitChairPedalQuads(pedalNode, pedalPivot, lDeg, rDeg, shader, quads);
        } else {
          emitRotatedYNodeQuads(pedalNode, pedalPivot, baseDeg, shader, quads);
        }
      }
      break;
    }

    case 'cadillac': {
      appendStaticNodeQuads(asset.nodes.get('cadillac_frame'), shader, quads);

      const shouldShowPtb = options.showPtb ?? typeof options.ptbDeg === 'number';
      if (shouldShowPtb) {
        const ptbNode = asset.nodes.get('cadillac_ptb');
        if (ptbNode) {
          const ptbPivot =
            ptbNode.pivotMeta ??
            asset.pivots.get('cadillac_ptb') ??
            DEFAULT_APPARATUS_PIVOTS.cadillac_ptb!;
          emitRotatedYNodeQuads(ptbNode, ptbPivot, options.ptbDeg ?? 0, shader, quads);
        }
      }
      break;
    }

    case 'barrel': {
      const nodeName = options.useSpineCorrector ? 'barrel_spine_corrector' : 'barrel_ladder';
      appendStaticNodeQuads(asset.nodes.get(nodeName), shader, quads);
      break;
    }

    case 'mat':
    default: {
      appendStaticNodeQuads(asset.nodes.get('mat_studio'), shader, quads);
      break;
    }
  }

  return quads;
}
