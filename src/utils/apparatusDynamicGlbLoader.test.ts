import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  APPARATUS_DYNAMIC_NODE_NAMES,
  APPARATUS_DYNAMIC_PARTS_GLB_URL,
  buildDynamicApparatusQuads,
  getCachedApparatusDynamicAsset,
  parseApparatusDynamicGlb,
  preloadApparatusDynamicGlb,
  setCachedApparatusDynamicAsset,
  type ApparatusDynamicAsset,
} from './apparatusDynamicGlbLoader';
import { triangulateAndWeldQuads, type Vec3 } from './studio3dWebgl2Renderer';

// ==============================================================================
// IN-MEMORY SPEC-COMPLIANT GLB v2 BINARY FIXTURE BUILDER
// ==============================================================================

interface FixturePrimitiveSpec {
  readonly materialIndex: number;
  /** Studio Z-up triangle vertices (automatically encoded as glTF Y-up in the binary!) */
  readonly positionsZup: readonly Vec3[];
  /** Studio Z-up unit normals (automatically encoded as glTF Y-up in the binary!) */
  readonly normalsZup: readonly Vec3[];
  /** sRGB 0..255 vertex colors (encoded as glTF linear float32 COLOR_0) */
  readonly colorsSrgb: readonly (readonly [number, number, number])[];
  readonly indices: readonly number[];
}

interface FixtureNodeSpec {
  readonly name: string;
  readonly primitives: readonly FixturePrimitiveSpec[];
  /** Studio Z-up node translation (encoded as glTF Y-up translation) */
  readonly translationZup?: Vec3;
  readonly extras?: Readonly<Record<string, unknown>>;
}

interface FixtureMaterialSpec {
  readonly name: string;
  readonly metallicFactor?: number;
  readonly roughnessFactor?: number;
  readonly baseColorFactor?: readonly [number, number, number, number];
}

function srgbByteToLinear(byteVal: number): number {
  const c = Math.max(0, Math.min(255, byteVal)) / 255;
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

/** Studio Z-up (x, y, z) -> glTF Y-up (x, z, -y) */
function zupToGltfYup(v: Vec3): readonly [number, number, number] {
  return [v[0], v[2], -v[1]];
}

function buildMultiNodeGlbBinary(options: {
  readonly materials: readonly FixtureMaterialSpec[];
  readonly nodes: readonly FixtureNodeSpec[];
  readonly rootExtras?: Readonly<Record<string, unknown>>;
}): ArrayBuffer {
  const binChunks: Uint8Array[] = [];
  let binOffset = 0;

  const bufferViews: {
    buffer: number;
    byteOffset: number;
    byteLength: number;
  }[] = [];
  const accessors: {
    bufferView: number;
    byteOffset: number;
    componentType: number;
    count: number;
    type: 'SCALAR' | 'VEC3';
    min?: number[];
    max?: number[];
  }[] = [];

  const appendBin = (bytes: Uint8Array): number => {
    const pad = (4 - (binOffset % 4)) % 4;
    if (pad > 0) {
      binChunks.push(new Uint8Array(pad));
      binOffset += pad;
    }
    const start = binOffset;
    binChunks.push(bytes);
    binOffset += bytes.byteLength;
    const bvIdx = bufferViews.length;
    bufferViews.push({
      buffer: 0,
      byteOffset: start,
      byteLength: bytes.byteLength,
    });
    return bvIdx;
  };

  const addFloatVec3Accessor = (values: readonly (readonly [number, number, number])[]): number => {
    const arr = new Float32Array(values.length * 3);
    let minX = Infinity;
    let minY = Infinity;
    let minZ = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    let maxZ = -Infinity;
    for (let i = 0; i < values.length; i++) {
      const [x, y, z] = values[i]!;
      arr[i * 3] = x;
      arr[i * 3 + 1] = y;
      arr[i * 3 + 2] = z;
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (z < minZ) minZ = z;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
      if (z > maxZ) maxZ = z;
    }
    const bvIdx = appendBin(new Uint8Array(arr.buffer, arr.byteOffset, arr.byteLength));
    const accIdx = accessors.length;
    accessors.push({
      bufferView: bvIdx,
      byteOffset: 0,
      componentType: 5126, // FLOAT
      count: values.length,
      type: 'VEC3',
      min: [minX, minY, minZ],
      max: [maxX, maxY, maxZ],
    });
    return accIdx;
  };

  const addUint16ScalarAccessor = (indices: readonly number[]): number => {
    const arr = new Uint16Array(indices);
    const bvIdx = appendBin(new Uint8Array(arr.buffer, arr.byteOffset, arr.byteLength));
    const accIdx = accessors.length;
    accessors.push({
      bufferView: bvIdx,
      byteOffset: 0,
      componentType: 5123, // UNSIGNED_SHORT
      count: indices.length,
      type: 'SCALAR',
    });
    return accIdx;
  };

  const meshes: {
    name: string;
    primitives: {
      attributes: Record<string, number>;
      indices: number;
      material: number;
    }[];
  }[] = [];

  const gltfNodes: {
    name: string;
    mesh: number;
    translation?: readonly [number, number, number];
    extras?: Readonly<Record<string, unknown>>;
  }[] = [];

  for (const node of options.nodes) {
    const primDefs = node.primitives.map((prim) => {
      const posYup = prim.positionsZup.map(zupToGltfYup);
      const normYup = prim.normalsZup.map(zupToGltfYup);
      const colLin = prim.colorsSrgb.map(
        ([r, g, b]) =>
          [srgbByteToLinear(r), srgbByteToLinear(g), srgbByteToLinear(b)] as const,
      );
      return {
        attributes: {
          POSITION: addFloatVec3Accessor(posYup),
          NORMAL: addFloatVec3Accessor(normYup),
          COLOR_0: addFloatVec3Accessor(colLin),
        },
        indices: addUint16ScalarAccessor(prim.indices),
        material: prim.materialIndex,
      };
    });

    const meshIdx = meshes.length;
    meshes.push({ name: `${node.name}_Mesh`, primitives: primDefs });
    gltfNodes.push({
      name: node.name,
      mesh: meshIdx,
      ...(node.translationZup ? { translation: zupToGltfYup(node.translationZup) } : {}),
      ...(node.extras ? { extras: node.extras } : {}),
    });
  }

  const binPad = (4 - (binOffset % 4)) % 4;
  if (binPad > 0) {
    binChunks.push(new Uint8Array(binPad));
    binOffset += binPad;
  }
  const binBytes = new Uint8Array(binOffset);
  let cursor = 0;
  for (const chunk of binChunks) {
    binBytes.set(chunk, cursor);
    cursor += chunk.byteLength;
  }

  const gltfDoc = {
    asset: { version: '2.0', generator: 'pilates-flow-test-fixture' },
    scene: 0,
    scenes: [{ nodes: gltfNodes.map((_, idx) => idx) }],
    nodes: gltfNodes,
    meshes,
    materials: options.materials.map((m) => ({
      name: m.name,
      pbrMetallicRoughness: {
        metallicFactor: m.metallicFactor ?? 0,
        roughnessFactor: m.roughnessFactor ?? 0.5,
        ...(m.baseColorFactor ? { baseColorFactor: m.baseColorFactor } : {}),
      },
    })),
    accessors,
    bufferViews,
    buffers: [{ byteLength: binBytes.byteLength }],
    ...(options.rootExtras ? { extras: options.rootExtras } : {}),
  };

  const jsonRaw = new TextEncoder().encode(JSON.stringify(gltfDoc));
  const jsonPad = (4 - (jsonRaw.byteLength % 4)) % 4;
  const jsonChunkLen = jsonRaw.byteLength + jsonPad;
  const totalLen = 12 + 8 + jsonChunkLen + 8 + binBytes.byteLength;

  const glb = new ArrayBuffer(totalLen);
  const view = new DataView(glb);
  const bytes = new Uint8Array(glb);

  // Header
  view.setUint32(0, 0x46546c67, true); // 'glTF'
  view.setUint32(4, 2, true); // version 2
  view.setUint32(8, totalLen, true);

  // JSON chunk
  view.setUint32(12, jsonChunkLen, true);
  view.setUint32(16, 0x4e4f534a, true); // 'JSON'
  bytes.set(jsonRaw, 20);
  for (let i = 0; i < jsonPad; i++) {
    bytes[20 + jsonRaw.byteLength + i] = 0x20; // ASCII space padding
  }

  // BIN chunk
  const binHeaderOff = 20 + jsonChunkLen;
  view.setUint32(binHeaderOff, binBytes.byteLength, true);
  view.setUint32(binHeaderOff + 4, 0x004e4942, true); // 'BIN\0'
  bytes.set(binBytes, binHeaderOff + 8);

  return glb;
}

function makeSingleTrianglePrimitive(
  materialIndex: number,
  vertsZup: readonly [Vec3, Vec3, Vec3],
  rgb: readonly [number, number, number],
  normalZup: Vec3 = [0, 0, 1],
): FixturePrimitiveSpec {
  return {
    materialIndex,
    positionsZup: vertsZup,
    normalsZup: [normalZup, normalZup, normalZup],
    colorsSrgb: [rgb, rgb, rgb],
    indices: [0, 1, 2],
  };
}

function buildCanonicalStudioFixtureGlb(overrides?: {
  readonly chairPivot?: Vec3;
}): ArrayBuffer {
  const chairPivot: Vec3 = overrides?.chairPivot ?? [-0.2, 0, 0.088];

  const materials: FixtureMaterialSpec[] = [
    { name: 'MAT_Apparatus_wood', metallicFactor: 0, roughnessFactor: 0.34 }, // 0
    { name: 'MAT_Apparatus_leather', metallicFactor: 0, roughnessFactor: 0.5 }, // 1
    { name: 'MAT_Apparatus_metal_chrome', metallicFactor: 1, roughnessFactor: 0.19 }, // 2
    { name: 'MAT_Apparatus_metal_brass', metallicFactor: 1, roughnessFactor: 0.21 }, // 3
    { name: 'MAT_Apparatus_matte', metallicFactor: 0, roughnessFactor: 0.74 }, // 4
    { name: 'MAT_Apparatus_gloss', metallicFactor: 0, roughnessFactor: 0.16 }, // 5
  ];

  const pivots = {
    reformer_footbar: {
      pivot: [0.955, 0, 0.335],
      axis: '+Y',
      restAngleDeg: 0,
      localOrigin: 'pivot',
      space: 'studio-z-up',
      presetAnglesDeg: { high: 0, mid: -15, low: -28 },
    },
    chair_pedal: {
      pivot: [...chairPivot],
      axis: '-Y',
      restAngleDeg: 0,
      localOrigin: 'pivot',
      space: 'studio-z-up',
    },
    cadillac_ptb: {
      pivot: [0.62, 0, 1.94],
      axis: '+Y',
      restAngleDeg: 0,
      localOrigin: 'pivot',
      space: 'studio-z-up',
    },
  };

  const nodes: FixtureNodeSpec[] = [
    {
      name: 'reformer_frame',
      primitives: [
        makeSingleTrianglePrimitive(
          0,
          [
            [-1.15, -0.3, 0.31],
            [1.15, -0.3, 0.31],
            [1.15, 0.3, 0.31],
          ],
          [196, 156, 114],
        ),
        makeSingleTrianglePrimitive(
          3,
          [
            [0.9, -0.1, 0.34],
            [0.92, -0.1, 0.34],
            [0.91, 0.1, 0.34],
          ],
          [214, 175, 104],
        ),
      ],
    },
    {
      name: 'reformer_carriage',
      primitives: [
        makeSingleTrianglePrimitive(
          1,
          [
            [-0.3, -0.25, 0.418],
            [0.46, -0.25, 0.418],
            [0.08, 0.25, 0.418],
          ],
          [48, 86, 72],
        ),
        makeSingleTrianglePrimitive(
          4,
          [
            [-0.28, -0.24, 0.42],
            [0.44, -0.24, 0.42],
            [0.08, 0.24, 0.42],
          ],
          [244, 240, 232],
        ),
      ],
    },
    {
      name: 'reformer_footbar',
      translationZup: [0.955, 0, 0.335],
      extras: pivots.reformer_footbar,
      primitives: [
        // Local vertex 0 sits at exact 'high' footbar center (-0.130, 0, +0.240) -> world (0.825, 0, 0.575)
        makeSingleTrianglePrimitive(
          2,
          [
            [-0.13, 0, 0.24],
            [0, -0.28, 0],
            [0, 0.28, 0],
          ],
          [206, 214, 221],
          [0, 0, 1],
        ),
      ],
    },
    {
      name: 'reformer_short_box',
      primitives: [
        makeSingleTrianglePrimitive(
          1,
          [
            [-0.13, -0.27, 0.638],
            [0.29, -0.27, 0.638],
            [0.08, 0.27, 0.638],
          ],
          [48, 86, 72],
        ),
      ],
    },
    {
      name: 'reformer_long_box',
      primitives: [
        makeSingleTrianglePrimitive(
          1,
          [
            [-0.28, -0.19, 0.638],
            [0.4, -0.19, 0.638],
            [0.06, 0.19, 0.638],
          ],
          [48, 86, 72],
        ),
      ],
    },
    {
      name: 'chair_frame',
      primitives: [
        makeSingleTrianglePrimitive(
          0,
          [
            [-0.4, -0.25, 0],
            [0.2, -0.25, 0],
            [-0.1, -0.25, 0.58],
          ],
          [196, 156, 114],
          [0, -1, 0],
        ),
      ],
    },
    {
      name: 'chair_pedal',
      translationZup: chairPivot,
      extras: pivots.chair_pedal,
      primitives: [
        // Left pedal tread top center at (0.54, -0.105, 0.036) matching chairPedalPos(deg)
        makeSingleTrianglePrimitive(
          1,
          [
            [0.54, -0.105, 0.036],
            [0.5, -0.16, 0.036],
            [0.5, -0.05, 0.036],
          ],
          [44, 50, 50],
          [0, 0, 1],
        ),
        // Right pedal tread top center at (0.54, +0.105, 0.036)
        makeSingleTrianglePrimitive(
          1,
          [
            [0.54, 0.105, 0.036],
            [0.5, 0.05, 0.036],
            [0.5, 0.16, 0.036],
          ],
          [44, 50, 50],
          [0, 0, 1],
        ),
        // Central brass connector lock pin at y = 0 (omitted when split-pedal unlocked)
        makeSingleTrianglePrimitive(
          3,
          [
            [0.515, -0.01, 0],
            [0.515, 0.01, 0],
            [0.515, 0, 0.012],
          ],
          [214, 175, 104],
          [1, 0, 0],
        ),
      ],
    },
    {
      name: 'cadillac_frame',
      primitives: [
        makeSingleTrianglePrimitive(
          0,
          [
            [-1.05, -0.32, 0],
            [1.05, -0.32, 0],
            [0, 0.32, 0.545],
          ],
          [196, 156, 114],
        ),
        makeSingleTrianglePrimitive(
          5,
          [
            [1.04, -0.05, 0.48],
            [1.06, 0, 0.48],
            [1.04, 0.05, 0.48],
          ],
          [228, 210, 172],
        ),
      ],
    },
    {
      name: 'cadillac_ptb',
      translationZup: [0.62, 0, 1.94],
      extras: pivots.cadillac_ptb,
      primitives: [
        // Local vertex 0 sits at bottom bar grip center (0, 0, -0.66) matching cadillacPushThroughBarPos(deg)
        makeSingleTrianglePrimitive(
          2,
          [
            [0, 0, -0.66],
            [0, -0.27, -0.66],
            [0, 0.27, 0],
          ],
          [206, 214, 221],
          [1, 0, 0],
        ),
      ],
    },
    {
      name: 'barrel_ladder',
      primitives: [
        makeSingleTrianglePrimitive(
          1,
          [
            [-0.3, -0.28, 0.88],
            [0.5, -0.28, 0],
            [0.5, 0.28, 1.01],
          ],
          [48, 86, 72],
        ),
      ],
    },
    {
      name: 'barrel_spine_corrector',
      primitives: [
        makeSingleTrianglePrimitive(
          1,
          [
            [-0.16, -0.24, 0.37],
            [0.22, -0.24, 0.21],
            [0.22, 0.24, 0.21],
          ],
          [48, 86, 72],
        ),
      ],
    },
    {
      name: 'mat_studio',
      primitives: [
        makeSingleTrianglePrimitive(
          0,
          [
            [-1.02, -0.37, 0],
            [1.02, -0.37, 0],
            [0, 0.37, 0.046],
          ],
          [176, 140, 102],
        ),
      ],
    },
  ];

  return buildMultiNodeGlbBinary({
    materials,
    nodes,
    rootExtras: { pilatesApparatusPivots: pivots },
  });
}

// ==============================================================================
// TESTS
// ==============================================================================

afterEach(() => {
  setCachedApparatusDynamicAsset(null);
  vi.restoreAllMocks();
});

describe('apparatusDynamicGlbLoader', () => {
  it('parses a valid multi-node GLB v2 binary, pre-converts glTF Y-up -> Studio Z-up, decodes COLOR_0 & material roles, and extracts extras pivots', () => {
    const glbBuffer = buildCanonicalStudioFixtureGlb();
    const asset = parseApparatusDynamicGlb(glbBuffer);

    expect(APPARATUS_DYNAMIC_PARTS_GLB_URL).toBe(
      '/models/pilates-studio/apparatus-dynamic-parts-v1.glb',
    );
    expect(asset.nodes.size).toBe(APPARATUS_DYNAMIC_NODE_NAMES.length);
    for (const expectedName of APPARATUS_DYNAMIC_NODE_NAMES) {
      expect(asset.nodes.has(expectedName)).toBe(true);
    }

    // Verify glTF Y-up -> Studio Z-up coordinate round-trip on reformer_frame
    const refFrame = asset.nodes.get('reformer_frame')!;
    expect(refFrame.primitives.length).toBe(2);
    expect(refFrame.primitives[0]!.materialRole).toBe('wood');
    expect(refFrame.primitives[1]!.materialRole).toBe('brass');
    expect(refFrame.primitives[0]!.positionsZup[0]).toBeCloseTo(-1.15, 5);
    expect(refFrame.primitives[0]!.positionsZup[1]).toBeCloseTo(-0.3, 5);
    expect(refFrame.primitives[0]!.positionsZup[2]).toBeCloseTo(0.31, 5);

    // Verify linear COLOR_0 -> sRGB decoding matches calibrated oak [196, 156, 114] within +-1 LSB
    expect(Math.abs(refFrame.primitives[0]!.colorsSrgb[0]! - 196)).toBeLessThanOrEqual(1);
    expect(Math.abs(refFrame.primitives[0]!.colorsSrgb[1]! - 156)).toBeLessThanOrEqual(1);
    expect(Math.abs(refFrame.primitives[0]!.colorsSrgb[2]! - 114)).toBeLessThanOrEqual(1);

    // Verify material roles across leather, fabric (matte), chrome (metal_chrome), brass (metal_brass), gloss
    const carriage = asset.nodes.get('reformer_carriage')!;
    expect(carriage.primitives[0]!.materialRole).toBe('leather');
    expect(carriage.primitives[1]!.materialRole).toBe('fabric');
    expect(asset.nodes.get('cadillac_ptb')!.primitives[0]!.materialRole).toBe('chrome');
    expect(asset.nodes.get('cadillac_frame')!.primitives[1]!.materialRole).toBe('gloss');

    // Verify extracted glTF extras pivots
    expect(asset.pivots.get('reformer_footbar')?.pivot).toEqual([0.955, 0, 0.335]);
    expect(asset.pivots.get('chair_pedal')?.pivot).toEqual([-0.2, 0, 0.088]);
    expect(asset.pivots.get('chair_pedal')?.axis).toBe('-Y');
    expect(asset.pivots.get('cadillac_ptb')?.pivot).toEqual([0.62, 0, 1.94]);
    expect(asset.pivots.get('cadillac_ptb')?.axis).toBe('+Y');
  });

  it('classifies generic `metal` material names into brass vs chrome by warm/cool tint', () => {
    const glb = buildMultiNodeGlbBinary({
      materials: [
        { name: 'MAT_metal_a', metallicFactor: 1 },
        { name: 'MAT_metal_b', metallicFactor: 1 },
      ],
      nodes: [
        {
          name: 'mat_studio',
          primitives: [
            makeSingleTrianglePrimitive(0, [[0, 0, 0], [1, 0, 0], [0, 1, 0]], [214, 175, 104]),
            makeSingleTrianglePrimitive(1, [[0, 0, 0], [1, 0, 0], [0, 1, 0]], [206, 214, 221]),
          ],
        },
      ],
    });
    const asset = parseApparatusDynamicGlb(glb);
    const matNode = asset.nodes.get('mat_studio')!;
    expect(matNode.primitives[0]!.materialRole).toBe('brass');
    expect(matNode.primitives[1]!.materialRole).toBe('chrome');
  });

  it('translates reformer_carriage cleanly along X by carriageX while keeping reformer_frame static', () => {
    const asset = parseApparatusDynamicGlb(buildCanonicalStudioFixtureGlb());

    const quadsRest = buildDynamicApparatusQuads(asset, {
      apparatus: 'reformer',
      carriageX: 0,
      footbar: 'high',
      box: 'none',
      shader: 'studio-pbr',
    });
    const quadsShifted = buildDynamicApparatusQuads(asset, {
      apparatus: 'reformer',
      carriageX: -0.24,
      footbar: 'high',
      box: 'none',
      shader: 'studio-pbr',
    });

    // reformer_frame (2) + reformer_carriage (2) + reformer_footbar (1) = 5 triangles
    expect(quadsRest.length).toBe(5);
    expect(quadsShifted.length).toBe(5);

    // Frame vertex remains fixed
    expect(quadsShifted[0]!.verts[0][0]).toBeCloseTo(quadsRest[0]!.verts[0][0], 6);

    // Carriage vertices translate by exact -0.24m along X (Y & Z unchanged)
    expect(quadsShifted[2]!.verts[0][0] - quadsRest[2]!.verts[0][0]).toBeCloseTo(-0.24, 6);
    expect(quadsShifted[2]!.verts[0][1]).toBeCloseTo(quadsRest[2]!.verts[0][1], 6);
    expect(quadsShifted[2]!.verts[0][2]).toBeCloseTo(quadsRest[2]!.verts[0][2], 6);
    expect(quadsShifted[3]!.verts[2][0] - quadsRest[3]!.verts[2][0]).toBeCloseTo(-0.24, 6);
  });

  it('rotates reformer_footbar accurately for high/mid/low presets and omits it for down/none', () => {
    const asset = parseApparatusDynamicGlb(buildCanonicalStudioFixtureGlb());

    const highQuads = buildDynamicApparatusQuads(asset, {
      apparatus: 'reformer',
      carriageX: 0,
      footbar: 'high',
    });
    const midQuads = buildDynamicApparatusQuads(asset, {
      apparatus: 'reformer',
      carriageX: 0,
      footbar: 'mid',
    });
    const lowQuads = buildDynamicApparatusQuads(asset, {
      apparatus: 'reformer',
      carriageX: 0,
      footbar: 'low',
    });
    const downQuads = buildDynamicApparatusQuads(asset, {
      apparatus: 'reformer',
      carriageX: 0,
      footbar: 'down',
    });
    const noneQuads = buildDynamicApparatusQuads(asset, {
      apparatus: 'reformer',
      carriageX: 0,
      footbar: 'none',
    });

    // Footbar is last quad when shown
    const highBarTip = highQuads[4]!.verts[0];
    expect(highBarTip[0]).toBeCloseTo(0.825, 5);
    expect(highBarTip[2]).toBeCloseTo(0.575, 5);

    // Mid (-15 deg) & Low (-28 deg) lower Z monotonically while preserving exact arm radius from pivot (0.955, 0, 0.335)
    const midBarTip = midQuads[4]!.verts[0];
    const lowBarTip = lowQuads[4]!.verts[0];
    expect(midBarTip[2]).toBeLessThan(highBarTip[2]);
    expect(lowBarTip[2]).toBeLessThan(midBarTip[2]);

    const rHigh = Math.hypot(highBarTip[0] - 0.955, highBarTip[2] - 0.335);
    const rMid = Math.hypot(midBarTip[0] - 0.955, midBarTip[2] - 0.335);
    const rLow = Math.hypot(lowBarTip[0] - 0.955, lowBarTip[2] - 0.335);
    expect(rMid).toBeCloseTo(rHigh, 5);
    expect(rLow).toBeCloseTo(rHigh, 5);

    // Omitted for 'down' and 'none'
    expect(downQuads.length).toBe(4);
    expect(noneQuads.length).toBe(4);
  });

  it('toggles reformer_short_box and reformer_long_box and translates them with carriageX', () => {
    const asset = parseApparatusDynamicGlb(buildCanonicalStudioFixtureGlb());

    const noBox = buildDynamicApparatusQuads(asset, {
      apparatus: 'reformer',
      carriageX: 0.18,
      footbar: 'down',
      box: 'none',
    });
    const shortBox = buildDynamicApparatusQuads(asset, {
      apparatus: 'reformer',
      carriageX: 0.18,
      footbar: 'down',
      box: 'short',
    });
    const longBox = buildDynamicApparatusQuads(asset, {
      apparatus: 'reformer',
      carriageX: -0.12,
      footbar: 'down',
      box: 'long-box',
    });

    expect(noBox.length).toBe(4);
    expect(shortBox.length).toBe(5);
    expect(longBox.length).toBe(5);

    // Short box vertex 0 authored at x = -0.13 -> translated by +0.18 => +0.05
    expect(shortBox[4]!.verts[0][0]).toBeCloseTo(-0.13 + 0.18, 5);
    // Long box vertex 0 authored at x = -0.28 -> translated by -0.12 => -0.40
    expect(longBox[4]!.verts[0][0]).toBeCloseTo(-0.28 - 0.12, 5);
  });

  it('rotates chair_pedal around exact extras pivot matching chairPedalPos(deg) to 0.01mm and supports split-pedal mode', () => {
    const asset = parseApparatusDynamicGlb(buildCanonicalStudioFixtureGlb());

    for (const deg of [0, 8, 22, 32]) {
      const quads = buildDynamicApparatusQuads(asset, {
        apparatus: 'chair',
        pedalDeg: deg,
      });
      // chair_frame (1) + chair_pedal (left + right + central pin = 3) = 4
      expect(quads.length).toBe(4);

      const rad = (deg * Math.PI) / 180;
      const expectedX = -0.2 + Math.cos(rad) * 0.54 - Math.sin(rad) * 0.036;
      const expectedZ = 0.088 + Math.sin(rad) * 0.54 + Math.cos(rad) * 0.036;

      // Left pedal tread top vertex (quads[1].verts[0]) & right pedal (quads[2].verts[0])
      expect(quads[1]!.verts[0][0]).toBeCloseTo(expectedX, 5);
      expect(quads[1]!.verts[0][1]).toBeCloseTo(-0.105, 5);
      expect(quads[1]!.verts[0][2]).toBeCloseTo(expectedZ, 5);
      expect(quads[2]!.verts[0][0]).toBeCloseTo(expectedX, 5);
      expect(quads[2]!.verts[0][1]).toBeCloseTo(0.105, 5);
      expect(quads[2]!.verts[0][2]).toBeCloseTo(expectedZ, 5);

      // Rotated normal remains unit length and perpendicular to rotated pedal surface
      const n = quads[1]!.vNormals![0];
      expect(Math.hypot(n[0], n[1], n[2])).toBeCloseTo(1, 5);
      expect(n[0]).toBeCloseTo(-Math.sin(rad), 5);
      expect(n[2]).toBeCloseTo(Math.cos(rad), 5);
    }

    // Split-pedal mode rotates left & right independently and omits central lock pin
    const splitQuads = buildDynamicApparatusQuads(asset, {
      apparatus: 'chair',
      lPedalDeg: 8,
      rPedalDeg: 28,
    });
    expect(splitQuads.length).toBe(3); // frame + left + right (central pin omitted!)
    const lRad = (8 * Math.PI) / 180;
    const rRad = (28 * Math.PI) / 180;
    expect(splitQuads[1]!.verts[0][2]).toBeCloseTo(
      0.088 + Math.sin(lRad) * 0.54 + Math.cos(lRad) * 0.036,
      5,
    );
    expect(splitQuads[2]!.verts[0][2]).toBeCloseTo(
      0.088 + Math.sin(rRad) * 0.54 + Math.cos(rRad) * 0.036,
      5,
    );

    // Custom pivot stored in GLB extras is respected dynamically (never hardcoded!)
    const customPivot: Vec3 = [-0.105, 0, 0.14];
    const customAsset = parseApparatusDynamicGlb(
      buildCanonicalStudioFixtureGlb({ chairPivot: customPivot }),
    );
    const customQuads = buildDynamicApparatusQuads(customAsset, {
      apparatus: 'chair',
      pedalDeg: 20,
    });
    const rad20 = (20 * Math.PI) / 180;
    expect(customQuads[1]!.verts[0][0]).toBeCloseTo(
      customPivot[0] + Math.cos(rad20) * 0.54 - Math.sin(rad20) * 0.036,
      5,
    );
    expect(customQuads[1]!.verts[0][2]).toBeCloseTo(
      customPivot[2] + Math.sin(rad20) * 0.54 + Math.cos(rad20) * 0.036,
      5,
    );
  });

  it('rotates cadillac_ptb around top pivot matching cadillacPushThroughBarPos(deg) to 0.01mm', () => {
    const asset = parseApparatusDynamicGlb(buildCanonicalStudioFixtureGlb());

    // When ptbDeg is omitted, PTB is hidden so Roll-Down / Hanging exercises stay clear
    const frameOnly = buildDynamicApparatusQuads(asset, {
      apparatus: 'cadillac',
    });
    expect(frameOnly.length).toBe(2);

    for (const deg of [-8, 0, 32]) {
      const quads = buildDynamicApparatusQuads(asset, {
        apparatus: 'cadillac',
        ptbDeg: deg,
      });
      expect(quads.length).toBe(3);

      const rad = (deg * Math.PI) / 180;
      const expectedX = 0.62 - Math.sin(rad) * 0.66;
      const expectedZ = 1.94 - Math.cos(rad) * 0.66;

      const barGrip = quads[2]!.verts[0];
      expect(barGrip[0]).toBeCloseTo(expectedX, 5);
      expect(barGrip[1]).toBeCloseTo(0, 5);
      expect(barGrip[2]).toBeCloseTo(expectedZ, 5);
    }
  });

  it('switches barrel between ladder barrel and spine corrector, renders mat_studio, and packs cleanly into GPU buffers', () => {
    const asset = parseApparatusDynamicGlb(buildCanonicalStudioFixtureGlb());

    const ladderQuads = buildDynamicApparatusQuads(asset, {
      apparatus: 'barrel',
      useSpineCorrector: false,
    });
    const scQuads = buildDynamicApparatusQuads(asset, {
      apparatus: 'barrel',
      useSpineCorrector: true,
    });
    const matQuads = buildDynamicApparatusQuads(asset, {
      apparatus: 'mat',
    });

    expect(ladderQuads.length).toBe(1);
    expect(ladderQuads[0]!.verts[0][2]).toBeCloseTo(0.88, 5);
    expect(scQuads.length).toBe(1);
    expect(scQuads[0]!.verts[0][2]).toBeCloseTo(0.37, 5);
    expect(matQuads.length).toBe(1);
    expect(matQuads[0]!.verts[0][0]).toBeCloseTo(-1.02, 5);

    // Verify WebGL2/WebGPU triangulateAndWeldQuads compatibility
    const welded = triangulateAndWeldQuads(
      buildDynamicApparatusQuads(asset, { apparatus: 'reformer', carriageX: 0.1, box: 'short' }),
    );
    expect(welded.totalTriangles).toBe(6);
    expect(welded.opaqueVertexCount).toBe(18);
  });

  it('respects clay-wire, biomech-xray, and game-arena shader palettes and translucency', () => {
    const asset = parseApparatusDynamicGlb(buildCanonicalStudioFixtureGlb());

    const pbrQuads = buildDynamicApparatusQuads(asset, {
      apparatus: 'reformer',
      carriageX: 0,
      shader: 'studio-pbr',
    });
    const clayQuads = buildDynamicApparatusQuads(asset, {
      apparatus: 'reformer',
      carriageX: 0,
      shader: 'clay-wire',
    });
    const xrayQuads = buildDynamicApparatusQuads(asset, {
      apparatus: 'reformer',
      carriageX: 0,
      shader: 'biomech-xray',
    });
    const arenaQuads = buildDynamicApparatusQuads(asset, {
      apparatus: 'reformer',
      carriageX: 0,
      shader: 'game-arena',
    });

    // Studio PBR keeps calibrated warm oak RGB & full opacity
    expect(pbrQuads[0]!.alpha).toBe(1);
    expect(Math.abs(pbrQuads[0]!.baseRgb[0] - 196)).toBeLessThanOrEqual(1);

    // Clay uses warm monochrome clay palette & full opacity
    expect(clayQuads[0]!.alpha).toBe(1);
    expect(clayQuads[0]!.baseRgb).toEqual([206, 202, 194]); // wood clay
    expect(clayQuads[2]!.baseRgb).toEqual([184, 180, 174]); // leather clay

    // Biomech X-Ray uses translucent 0.48 alpha & cool diagnostic palette
    for (const q of xrayQuads) {
      expect(q.alpha).toBeCloseTo(0.48, 3);
    }
    expect(xrayQuads[0]!.baseRgb).toEqual([76, 102, 92]); // wood xray
    expect(xrayQuads[2]!.baseRgb).toEqual([30, 54, 46]); // leather xray

    // Game Arena preserves full opacity with studio arena dark-sage timber/leather
    expect(arenaQuads[0]!.alpha).toBe(1);
    expect(arenaQuads[0]!.baseRgb).toEqual([76, 102, 92]);
  });

  it('gracefully falls back to null in jsdom and swallows fetch/parse errors safely', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');

    // In jsdom environment, preloadApparatusDynamicGlb short-circuits to null without network traffic
    const jsdomResult = await preloadApparatusDynamicGlb();
    expect(jsdomResult).toBeNull();
    expect(getCachedApparatusDynamicAsset()).toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();

    // Inject cached asset via test helper
    const parsed: ApparatusDynamicAsset = parseApparatusDynamicGlb(
      buildCanonicalStudioFixtureGlb(),
    );
    setCachedApparatusDynamicAsset(parsed);
    expect(getCachedApparatusDynamicAsset()).toBe(parsed);
    expect(await preloadApparatusDynamicGlb()).toBe(parsed);

    // Clear cache and simulate browser UA with HTTP 404 -> swallows cleanly to null
    setCachedApparatusDynamicAsset(null);
    const origUa = navigator.userAgent;
    Object.defineProperty(navigator, 'userAgent', {
      value: 'Mozilla/5.0 Chrome/130.0.0.0',
      configurable: true,
    });
    try {
      fetchSpy.mockResolvedValueOnce(new Response(null, { status: 404 }));
      const failed = await preloadApparatusDynamicGlb('/models/missing.glb');
      expect(failed).toBeNull();
      expect(getCachedApparatusDynamicAsset()).toBeNull();

      // Successful browser fetch parses & caches singleton
      const glbBytes = buildCanonicalStudioFixtureGlb();
      fetchSpy.mockResolvedValueOnce(
        new Response(glbBytes, { status: 200 }),
      );
      const loaded = await preloadApparatusDynamicGlb('/models/ok.glb');
      expect(loaded).not.toBeNull();
      expect(loaded!.nodes.size).toBe(12);
      expect(getCachedApparatusDynamicAsset()).toBe(loaded);
    } finally {
      Object.defineProperty(navigator, 'userAgent', {
        value: origUa,
        configurable: true,
      });
    }
  });

  it('rejects truncated or non-GLB binary buffers with descriptive errors', () => {
    expect(() => parseApparatusDynamicGlb(new ArrayBuffer(8))).toThrow(/too short/i);
    const badMagic = new ArrayBuffer(24);
    new DataView(badMagic).setUint32(0, 0xdeadbeef, true);
    expect(() => parseApparatusDynamicGlb(badMagic)).toThrow(/Invalid glTF 2\.0 GLB header/i);
  });

  it('parses the real 1-draw-call packed Blender 5.3 apparatus-dynamic-parts-v1.glb from disk and articulates all 5 apparatuses', async () => {
    const fs = await import('node:fs');
    const path = await import('node:path');
    const glbPath = path.resolve(
      process.cwd(),
      'public/models/pilates-studio/apparatus-dynamic-parts-v1.glb',
    );
    const raw = fs.readFileSync(glbPath);
    const ab = raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.byteLength);
    const asset = parseApparatusDynamicGlb(ab);

    expect(asset.nodes.size).toBe(12);
    expect(asset.totalTriangles).toBeGreaterThan(22000);
    for (const nodeName of APPARATUS_DYNAMIC_NODE_NAMES) {
      expect(asset.nodes.has(nodeName)).toBe(true);
      expect(asset.nodes.get(nodeName)!.triangleCount).toBeGreaterThan(0);
    }

    // Verify carriage translation on real Reformer GLB
    const ref0 = buildDynamicApparatusQuads(asset, { apparatus: 'reformer', carriageX: 0 });
    const refMoved = buildDynamicApparatusQuads(asset, { apparatus: 'reformer', carriageX: -0.35 });
    expect(ref0.length).toBeGreaterThan(5000);
    expect(refMoved.length).toBe(ref0.length);
    const avgX = (qs: typeof ref0) =>
      qs.reduce((acc, q) => acc + q.verts[0]![0], 0) / Math.max(1, qs.length);
    expect(avgX(refMoved)).toBeLessThan(avgX(ref0) - 0.03);

    // Verify chair pedal rotation & cadillac PTB rotation & barrel/mat emission
    const chairUp = buildDynamicApparatusQuads(asset, { apparatus: 'chair', pedalDeg: 32 });
    const chairDown = buildDynamicApparatusQuads(asset, { apparatus: 'chair', pedalDeg: 8 });
    expect(chairUp.length).toBe(chairDown.length);
    const avgZ = (qs: typeof chairUp) =>
      qs.reduce((acc, q) => acc + q.verts[0]![2], 0) / Math.max(1, qs.length);
    expect(avgZ(chairUp)).toBeGreaterThan(avgZ(chairDown));

    const cadWithPtb = buildDynamicApparatusQuads(asset, {
      apparatus: 'cadillac',
      showPtb: true,
      ptbDeg: 24,
    });
    const cadNoPtb = buildDynamicApparatusQuads(asset, {
      apparatus: 'cadillac',
      showPtb: false,
    });
    expect(cadWithPtb.length).toBeGreaterThan(cadNoPtb.length);

    expect(buildDynamicApparatusQuads(asset, { apparatus: 'barrel', useSpineCorrector: false }).length).toBeGreaterThan(3000);
    expect(buildDynamicApparatusQuads(asset, { apparatus: 'barrel', useSpineCorrector: true }).length).toBeGreaterThan(3000);
    expect(buildDynamicApparatusQuads(asset, { apparatus: 'mat' }).length).toBeGreaterThan(1000);
  });
});
