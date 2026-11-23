/**
 * Zero-dependency Hardware WebGL2 Studio PBR / SSS / Fresnel Rim Renderer
 * for Pilates Flow Atelier realtime 3D viewport.
 *
 * Features:
 * - Numeric spatial-hash smooth vertex normal welding (zero string-allocation GC churn)
 * - Hardware 24-bit Z-buffer (`DEPTH_TEST`) + MSAA + DPR supersampling
 * - Per-pixel GLSL ES 3.00 3-point atelier lighting:
 *   warm morning sun key + cool-ivory sky fill + camera-tracked champagne backlight Fresnel rim
 * - Dedicated material shaders:
 *   porcelain-peach SSS wrap skin, anisotropic dual-band silk hair, matte velvet athleisure fabric,
 *   satin white-oak grain wood, supple sage leather, studio-env chrome/brass, sparkling eye/lip gloss
 * - Graceful automatic fallback to Canvas2D in headless/jsdom or WebGL2-unavailable environments
 */

export type Vec3 = readonly [number, number, number];
export type Rgb = readonly [number, number, number];

export type StudioMaterialRole =
  | 'skin'
  | 'hair'
  | 'fabric'
  | 'wood'
  | 'leather'
  | 'chrome'
  | 'brass'
  | 'gloss';

export type StudioWebGLShaderMode = 'studio-pbr' | 'biomech-xray' | 'game-arena' | 'clay-wire';

export interface StudioQuadFace {
  readonly verts: readonly [Vec3, Vec3, Vec3, Vec3];
  readonly vNormals?: readonly [Vec3, Vec3, Vec3, Vec3];
  readonly vColors?: readonly [Rgb, Rgb, Rgb, Rgb];
  readonly cullBackface?: boolean;
  readonly depthBias?: number;
  readonly baseRgb: Rgb;
  readonly alpha: number;
  readonly spec: number;
  readonly shininess?: number;
  readonly emissive?: number;
  readonly materialRole?: StudioMaterialRole;
}

export interface StudioRibbonLine {
  readonly pts: readonly Vec3[];
  readonly stroke: string;
  readonly width: number;
  readonly dash?: readonly number[];
  readonly overlay?: boolean;
  readonly depthBias?: number;
}

export interface StudioWebGLCameraParams {
  readonly camPos: Vec3;
  readonly camFwd: Vec3;
  readonly camRight: Vec3;
  readonly camUp: Vec3;
  readonly focal: number;
  readonly width: number;
  readonly height: number;
  readonly dpr: number;
}

export interface StudioWebGLRenderParams {
  readonly quads: readonly StudioQuadFace[];
  readonly physicalLines?: readonly StudioRibbonLine[];
  readonly camera: StudioWebGLCameraParams;
  readonly keyDir: Vec3;
  readonly fillDir: Vec3;
  readonly shader: StudioWebGLShaderMode;
}

export interface WeldedMeshBuffers {
  readonly opaqueData: Float32Array;
  readonly opaqueVertexCount: number;
  readonly translucentData: Float32Array;
  readonly translucentVertexCount: number;
  readonly weldedVertexBuckets: number;
  readonly totalTriangles: number;
}

export const FLOATS_PER_VERTEX = 16;

const ROLE_TO_ID: Record<StudioMaterialRole, number> = {
  skin: 1,
  hair: 2,
  fabric: 3,
  wood: 4,
  leather: 5,
  chrome: 6,
  brass: 7,
  gloss: 8,
};

const SHADER_MODE_TO_ID: Record<StudioWebGLShaderMode, number> = {
  'studio-pbr': 0,
  'biomech-xray': 1,
  'game-arena': 2,
  'clay-wire': 3,
};

const NEAR_PLANE = 0.12;
const FAR_PLANE = 24.0;

function resolveRoleId(q: StudioQuadFace): number {
  if (q.materialRole) return ROLE_TO_ID[q.materialRole];
  if (q.spec >= 0.55) {
    return q.baseRgb[0] > q.baseRgb[2] + 35 ? ROLE_TO_ID.brass : ROLE_TO_ID.chrome;
  }
  if (q.spec <= 0.06) return ROLE_TO_ID.fabric;
  return 0;
}

/**
 * Spatial hash key packing quantized 0.5mm coordinates + smooth group into an exact
 * 49-bit IEEE-754 integer (< 2^53) with zero string allocation.
 */
function spatialWeldKey(x: number, y: number, z: number, roleId: number): number {
  const qx = Math.max(0, Math.min(32767, Math.round(x * 2000) + 16384));
  const qy = Math.max(0, Math.min(32767, Math.round(y * 2000) + 16384));
  const qz = Math.max(0, Math.min(32767, Math.round(z * 2000) + 16384));
  return (((roleId & 15) * 32768 + qx) * 32768 + qy) * 32768 + qz;
}

export function parseCssColorToRgb01(stroke: string): readonly [number, number, number, number] {
  const trimmed = stroke.trim();
  if (trimmed.startsWith('#')) {
    const hex = trimmed.slice(1);
    if (hex.length === 3) {
      const r = Number.parseInt(hex[0]! + hex[0]!, 16) / 255;
      const g = Number.parseInt(hex[1]! + hex[1]!, 16) / 255;
      const b = Number.parseInt(hex[2]! + hex[2]!, 16) / 255;
      return [r, g, b, 1];
    }
    if (hex.length >= 6) {
      const r = Number.parseInt(hex.slice(0, 2), 16) / 255;
      const g = Number.parseInt(hex.slice(2, 4), 16) / 255;
      const b = Number.parseInt(hex.slice(4, 6), 16) / 255;
      return [r, g, b, 1];
    }
  }
  const rgbaMatch = /^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*,\s*([\d.]+))?\s*\)$/i.exec(
    trimmed,
  );
  if (rgbaMatch) {
    return [
      Math.max(0, Math.min(1, Number(rgbaMatch[1]) / 255)),
      Math.max(0, Math.min(1, Number(rgbaMatch[2]) / 255)),
      Math.max(0, Math.min(1, Number(rgbaMatch[3]) / 255)),
      rgbaMatch[4] !== undefined ? Math.max(0, Math.min(1, Number(rgbaMatch[4]))) : 1,
    ];
  }
  return [0.35, 0.42, 0.38, 1];
}

/**
 * Reusable zero-GC scratch buffers & O(1)-reset open-addressing spatial hash table
 * for locked 60fps vertex packing and smooth normal welding.
 */
export class MeshPackerScratch {
  opaque = new Float32Array(262144);
  translucent = new Float32Array(65536);

  // Power-of-two flat spatial hash table (zero heap allocations, O(1) generation clear)
  private tableCap = 32768;
  private tableMask = 32767;
  private keys = new Float64Array(32768);
  private stamps = new Uint32Array(32768);
  private nx = new Float32Array(32768);
  private ny = new Float32Array(32768);
  private nz = new Float32Array(32768);
  private gen = 1;
  bucketCount = 0;

  ensureOpaque(minFloats: number): Float32Array {
    if (this.opaque.length < minFloats) {
      let cap = this.opaque.length;
      while (cap < minFloats) cap *= 2;
      const next = new Float32Array(cap);
      next.set(this.opaque);
      this.opaque = next;
    }
    return this.opaque;
  }

  ensureTranslucent(minFloats: number): Float32Array {
    if (this.translucent.length < minFloats) {
      let cap = this.translucent.length;
      while (cap < minFloats) cap *= 2;
      const next = new Float32Array(cap);
      next.set(this.translucent);
      this.translucent = next;
    }
    return this.translucent;
  }

  resetNormals(expectedVertices = 8192): void {
    const needed = Math.max(32768, expectedVertices * 2);
    if (needed > this.tableCap) {
      let cap = this.tableCap;
      while (cap < needed) cap *= 2;
      this.tableCap = cap;
      this.tableMask = cap - 1;
      this.keys = new Float64Array(cap);
      this.stamps = new Uint32Array(cap);
      this.nx = new Float32Array(cap);
      this.ny = new Float32Array(cap);
      this.nz = new Float32Array(cap);
      this.gen = 1;
    } else {
      this.gen += 1;
      if (this.gen >= 0xfffffffe) {
        this.stamps.fill(0);
        this.gen = 1;
      }
    }
    this.bucketCount = 0;
  }

  private hashSlot(key: number): number {
    // Mix low & high bits of the 49-bit integer key into [0..tableMask]
    const lo = key | 0;
    const hi = Math.floor(key / 4294967296) | 0;
    let h = (Math.imul(lo, 0x9e3779b1) ^ Math.imul(hi, 0x85ebca77)) | 0;
    h ^= h >>> 16;
    return h & this.tableMask;
  }

  addNormal(key: number, x: number, y: number, z: number): void {
    const gen = this.gen;
    const mask = this.tableMask;
    const stamps = this.stamps;
    const keys = this.keys;
    let slot = this.hashSlot(key);
    while (stamps[slot] === gen) {
      if (keys[slot] === key) {
        this.nx[slot] = this.nx[slot]! + x;
        this.ny[slot] = this.ny[slot]! + y;
        this.nz[slot] = this.nz[slot]! + z;
        return;
      }
      slot = (slot + 1) & mask;
    }
    stamps[slot] = gen;
    keys[slot] = key;
    this.nx[slot] = x;
    this.ny[slot] = y;
    this.nz[slot] = z;
    this.bucketCount += 1;
  }

  findSlot(key: number): number {
    const gen = this.gen;
    const mask = this.tableMask;
    const stamps = this.stamps;
    const keys = this.keys;
    let slot = this.hashSlot(key);
    while (stamps[slot] === gen) {
      if (keys[slot] === key) return slot;
      slot = (slot + 1) & mask;
    }
    return -1;
  }

  getNx(slot: number): number {
    return this.nx[slot]!;
  }
  getNy(slot: number): number {
    return this.ny[slot]!;
  }
  getNz(slot: number): number {
    return this.nz[slot]!;
  }
}

const DEFAULT_SCRATCH = new MeshPackerScratch();

/**
 * Triangulates `StudioQuadFace[]` and computes area-weighted shared-position smooth welded
 * vertex normals with material-aware crease protection, plus optional camera-billboarded
 * physical 3D ribbon lines (springs, ropes, piping) for true Z-buffered hardware occlusion.
 */
export function triangulateAndWeldQuads(
  quads: readonly StudioQuadFace[],
  options?: {
    readonly physicalLines?: readonly StudioRibbonLine[];
    readonly camera?: StudioWebGLCameraParams;
    readonly scratch?: MeshPackerScratch;
  },
): WeldedMeshBuffers {
  const scratch = options?.scratch ?? DEFAULT_SCRATCH;
  const quadCount = quads.length;
  scratch.resetNormals(quadCount * 2);

  // Pass 1: Accumulate area-weighted smooth normals per spatial vertex bucket & material group
  for (let qi = 0; qi < quadCount; qi++) {
    const q = quads[qi]!;
    const v0 = q.verts[0];
    const v1 = q.verts[1];
    const v2 = q.verts[2];
    const v3 = q.verts[3];
    const roleId = resolveRoleId(q);

    const e1x = v1[0] - v0[0];
    const e1y = v1[1] - v0[1];
    const e1z = v1[2] - v0[2];
    const e2x = v2[0] - v0[0];
    const e2y = v2[1] - v0[1];
    const e2z = v2[2] - v0[2];
    let cAx = e1y * e2z - e1z * e2y;
    let cAy = e1z * e2x - e1x * e2z;
    let cAz = e1x * e2y - e1y * e2x;

    const e4x = v3[0] - v0[0];
    const e4y = v3[1] - v0[1];
    const e4z = v3[2] - v0[2];
    let cBx = e2y * e4z - e2z * e4y;
    let cBy = e2z * e4x - e2x * e4z;
    let cBz = e2x * e4y - e2y * e4x;

    if (q.vNormals) {
      const vn = q.vNormals;
      const avgX = vn[0][0] + vn[1][0] + vn[2][0] + vn[3][0];
      const avgY = vn[0][1] + vn[1][1] + vn[2][1] + vn[3][1];
      const avgZ = vn[0][2] + vn[1][2] + vn[2][2] + vn[3][2];
      if ((cAx + cBx) * avgX + (cAy + cBy) * avgY + (cAz + cBz) * avgZ < 0) {
        cAx = -cAx;
        cAy = -cAy;
        cAz = -cAz;
        cBx = -cBx;
        cBy = -cBy;
        cBz = -cBz;
      }
    }

    const qNx = cAx + cBx;
    const qNy = cAy + cBy;
    const qNz = cAz + cBz;
    if (qNx * qNx + qNy * qNy + qNz * qNz > 1e-18) {
      // Weight each distinct corner of the quad symmetrically (1x quad area, zero diagonal 2:1 bias)
      const k0 = spatialWeldKey(v0[0], v0[1], v0[2], roleId);
      const k1 = spatialWeldKey(v1[0], v1[1], v1[2], roleId);
      const k2 = spatialWeldKey(v2[0], v2[1], v2[2], roleId);
      const k3 = spatialWeldKey(v3[0], v3[1], v3[2], roleId);
      scratch.addNormal(k0, qNx, qNy, qNz);
      if (k1 !== k0) scratch.addNormal(k1, qNx, qNy, qNz);
      if (k2 !== k0 && k2 !== k1) scratch.addNormal(k2, qNx, qNy, qNz);
      if (k3 !== k0 && k3 !== k1 && k3 !== k2) scratch.addNormal(k3, qNx, qNy, qNz);
    }
  }

  let opaqueV = 0;
  let transV = 0;
  let totalTriangles = 0;

  const cornerUvU = [0, 1, 1, 0] as const;
  const cornerUvV = [0, 0, 1, 1] as const;

  const pushVertex = (
    translucent: boolean,
    vx: number,
    vy: number,
    vz: number,
    nx: number,
    ny: number,
    nz: number,
    cr: number,
    cg: number,
    cb: number,
    alpha: number,
    roleId: number,
    spec: number,
    emissive: number,
    depthBias: number,
    uvU: number,
    uvV: number,
  ) => {
    const baseOffset = (translucent ? transV : opaqueV) * FLOATS_PER_VERTEX;
    const buf = translucent
      ? scratch.ensureTranslucent(baseOffset + FLOATS_PER_VERTEX)
      : scratch.ensureOpaque(baseOffset + FLOATS_PER_VERTEX);
    buf[baseOffset] = vx;
    buf[baseOffset + 1] = vy;
    buf[baseOffset + 2] = vz;
    buf[baseOffset + 3] = nx;
    buf[baseOffset + 4] = ny;
    buf[baseOffset + 5] = nz;
    buf[baseOffset + 6] = cr;
    buf[baseOffset + 7] = cg;
    buf[baseOffset + 8] = cb;
    buf[baseOffset + 9] = alpha;
    buf[baseOffset + 10] = roleId;
    buf[baseOffset + 11] = spec;
    buf[baseOffset + 12] = emissive;
    buf[baseOffset + 13] = depthBias;
    buf[baseOffset + 14] = uvU;
    buf[baseOffset + 15] = uvV;
    if (translucent) {
      transV += 1;
    } else {
      opaqueV += 1;
    }
  };

  // Pass 2: Emit smooth welded triangles with organic/architectural crease protection
  const cNx = [0, 0, 0, 0];
  const cNy = [0, 0, 0, 0];
  const cNz = [0, 0, 0, 0];

  for (let qi = 0; qi < quadCount; qi++) {
    const q = quads[qi]!;
    const v0 = q.verts[0];
    const v1 = q.verts[1];
    const v2 = q.verts[2];
    const v3 = q.verts[3];
    const roleId = resolveRoleId(q);
    const isOrganic =
      roleId === ROLE_TO_ID.skin ||
      roleId === ROLE_TO_ID.hair ||
      roleId === ROLE_TO_ID.fabric ||
      roleId === ROLE_TO_ID.leather ||
      roleId === ROLE_TO_ID.gloss;
    const creaseDot = isOrganic ? 0.28 : 0.72;

    const e1x = v1[0] - v0[0];
    const e1y = v1[1] - v0[1];
    const e1z = v1[2] - v0[2];
    const e2x = v2[0] - v0[0];
    const e2y = v2[1] - v0[1];
    const e2z = v2[2] - v0[2];
    const e4x = v3[0] - v0[0];
    const e4y = v3[1] - v0[1];
    const e4z = v3[2] - v0[2];

    const cAx = e1y * e2z - e1z * e2y;
    const cAy = e1z * e2x - e1x * e2z;
    const cAz = e1x * e2y - e1y * e2x;
    const cBx = e2y * e4z - e2z * e4y;
    const cBy = e2z * e4x - e2x * e4z;
    const cBz = e2x * e4y - e2y * e4x;

    const hasA = cAx * cAx + cAy * cAy + cAz * cAz > 1e-18;
    const hasB = cBx * cBx + cBy * cBy + cBz * cBz > 1e-18;
    if (!hasA && !hasB) continue;

    let fnX = cAx + cBx;
    let fnY = cAy + cBy;
    let fnZ = cAz + cBz;
    const fnLen = Math.hypot(fnX, fnY, fnZ);
    if (fnLen > 1e-9) {
      fnX /= fnLen;
      fnY /= fnLen;
      fnZ /= fnLen;
    } else {
      fnX = 0;
      fnY = 0;
      fnZ = 1;
    }

    for (let ci = 0; ci < 4; ci++) {
      const v = q.verts[ci]!;
      let ox = fnX;
      let oy = fnY;
      let oz = fnZ;
      if (q.vNormals) {
        const vn = q.vNormals[ci]!;
        const vl = Math.hypot(vn[0], vn[1], vn[2]);
        if (vl > 1e-7) {
          ox = vn[0] / vl;
          oy = vn[1] / vl;
          oz = vn[2] / vl;
        }
      }
      const key = spatialWeldKey(v[0], v[1], v[2], roleId);
      const slot = scratch.findSlot(key);
      const ax = slot >= 0 ? scratch.getNx(slot) : 0;
      const ay = slot >= 0 ? scratch.getNy(slot) : 0;
      const az = slot >= 0 ? scratch.getNz(slot) : 0;
      const al = Math.hypot(ax, ay, az);
      if (al > 1e-9) {
        const wx = ax / al;
        const wy = ay / al;
        const wz = az / al;
        const align = ox * wx + oy * wy + oz * wz;
        if (align >= creaseDot) {
          if (q.vNormals) {
            // Blend analytic smooth normal with position-welded seam normal
            const bx = ox * 0.48 + wx * 0.52;
            const by = oy * 0.48 + wy * 0.52;
            const bz = oz * 0.48 + wz * 0.52;
            const bl = Math.hypot(bx, by, bz) || 1;
            cNx[ci] = bx / bl;
            cNy[ci] = by / bl;
            cNz[ci] = bz / bl;
          } else {
            cNx[ci] = wx;
            cNy[ci] = wy;
            cNz[ci] = wz;
          }
        } else {
          cNx[ci] = ox;
          cNy[ci] = oy;
          cNz[ci] = oz;
        }
      } else {
        cNx[ci] = ox;
        cNy[ci] = oy;
        cNz[ci] = oz;
      }
    }

    const translucent = q.alpha < 0.995;
    const depthBias = q.depthBias ?? 0;
    const emissive = q.emissive ?? 0;
    const emitCorner = (ci: 0 | 1 | 2 | 3) => {
      const v = q.verts[ci]!;
      const rgb = q.vColors ? q.vColors[ci]! : q.baseRgb;
      pushVertex(
        translucent,
        v[0],
        v[1],
        v[2],
        cNx[ci]!,
        cNy[ci]!,
        cNz[ci]!,
        rgb[0] / 255,
        rgb[1] / 255,
        rgb[2] / 255,
        q.alpha,
        roleId,
        q.spec,
        emissive,
        depthBias,
        cornerUvU[ci]!,
        cornerUvV[ci]!,
      );
    };

    if (hasA) {
      emitCorner(0);
      emitCorner(1);
      emitCorner(2);
      totalTriangles += 1;
    }
    if (hasB) {
      emitCorner(0);
      emitCorner(2);
      emitCorner(3);
      totalTriangles += 1;
    }
  }

  // Pass 3: Convert physical 3D lines (springs, ropes, piping) to camera-facing Z-buffered ribbons
  if (options?.physicalLines && options.camera) {
    const { camPos, camFwd, focal } = options.camera;
    for (const ln of options.physicalLines) {
      if (ln.overlay || ln.dash || ln.pts.length < 2) continue;
      const [lr, lg, lb, la] = parseCssColorToRgb01(ln.stroke);
      const translucent = la < 0.995;
      const lineDepthBias = (ln.depthBias ?? 0) - 0.008;
      for (let i = 0; i < ln.pts.length - 1; i++) {
        const a = ln.pts[i]!;
        const b = ln.pts[i + 1]!;
        const dx = b[0] - a[0];
        const dy = b[1] - a[1];
        const dz = b[2] - a[2];
        const segLen = Math.hypot(dx, dy, dz);
        if (segLen < 1e-6) continue;
        const mx = (a[0] + b[0]) * 0.5;
        const my = (a[1] + b[1]) * 0.5;
        const mz = (a[2] + b[2]) * 0.5;
        const rx = mx - camPos[0];
        const ry = my - camPos[1];
        const rz = mz - camPos[2];
        const zCam = rx * camFwd[0] + ry * camFwd[1] + rz * camFwd[2];
        if (zCam <= NEAR_PLANE) continue;
        // View vector from segment toward camera
        let px = dy * -rz - dz * -ry;
        let py = dz * -rx - dx * -rz;
        let pz = dx * -ry - dy * -rx;
        const plen = Math.hypot(px, py, pz);
        if (plen < 1e-6) continue;
        const halfWorld = Math.max(0.0014, (ln.width * 0.46 * zCam) / Math.max(1, focal));
        px = (px / plen) * halfWorld;
        py = (py / plen) * halfWorld;
        pz = (pz / plen) * halfWorld;

        // Outward normal facing camera for crisp ribbon visibility
        const vLen = Math.hypot(rx, ry, rz) || 1;
        const nx = -rx / vLen;
        const ny = -ry / vLen;
        const nz = -rz / vLen;

        const p0x = a[0] - px;
        const p0y = a[1] - py;
        const p0z = a[2] - pz;
        const p1x = a[0] + px;
        const p1y = a[1] + py;
        const p1z = a[2] + pz;
        const p2x = b[0] + px;
        const p2y = b[1] + py;
        const p2z = b[2] + pz;
        const p3x = b[0] - px;
        const p3y = b[1] - py;
        const p3z = b[2] - pz;

        // Role 9 = physical 3D ribbon line (spring/rope/piping)
        pushVertex(translucent, p0x, p0y, p0z, nx, ny, nz, lr, lg, lb, la, 9, 0.2, 0.25, lineDepthBias, 0.5, 0.5);
        pushVertex(translucent, p1x, p1y, p1z, nx, ny, nz, lr, lg, lb, la, 9, 0.2, 0.25, lineDepthBias, 0.5, 0.5);
        pushVertex(translucent, p2x, p2y, p2z, nx, ny, nz, lr, lg, lb, la, 9, 0.2, 0.25, lineDepthBias, 0.5, 0.5);

        pushVertex(translucent, p0x, p0y, p0z, nx, ny, nz, lr, lg, lb, la, 9, 0.2, 0.25, lineDepthBias, 0.5, 0.5);
        pushVertex(translucent, p2x, p2y, p2z, nx, ny, nz, lr, lg, lb, la, 9, 0.2, 0.25, lineDepthBias, 0.5, 0.5);
        pushVertex(translucent, p3x, p3y, p3z, nx, ny, nz, lr, lg, lb, la, 9, 0.2, 0.25, lineDepthBias, 0.5, 0.5);
        totalTriangles += 2;
      }
    }
  }

  return {
    opaqueData: scratch.opaque.subarray(0, opaqueV * FLOATS_PER_VERTEX),
    opaqueVertexCount: opaqueV,
    translucentData: scratch.translucent.subarray(0, transV * FLOATS_PER_VERTEX),
    translucentVertexCount: transV,
    weldedVertexBuckets: scratch.bucketCount,
    totalTriangles,
  };
}

export const STUDIO_3D_VERTEX_SHADER = `#version 300 es
precision highp float;

layout(location = 0) in vec3 aPos;
layout(location = 1) in vec3 aNormal;
layout(location = 2) in vec3 aColor;
layout(location = 3) in vec4 aMat;
layout(location = 4) in vec3 aExtra;

uniform vec3 uCamPos;
uniform vec3 uCamFwd;
uniform vec3 uCamRight;
uniform vec3 uCamUp;
uniform vec4 uProj;

out vec3 vWorldPos;
out vec3 vNormal;
out vec3 vColor;
out vec4 vMat;
out vec2 vQuadUv;

void main() {
  vWorldPos = aPos;
  vNormal = aNormal;
  vColor = aColor;
  vMat = aMat;
  vQuadUv = aExtra.yz;

  vec3 rel = aPos - uCamPos;
  float zCam = dot(rel, uCamFwd);
  float xCam = dot(rel, uCamRight);
  float yCam = dot(rel, uCamUp);

  float nearP = uProj.z;
  float farP = uProj.w;
  float clipZ = ((farP + nearP) * zCam - 2.0 * farP * nearP) / (farP - nearP);
  clipZ += aExtra.x * 0.045 * max(0.0, zCam);

  gl_Position = vec4(
    xCam * uProj.x,
    yCam * uProj.y - 0.08 * zCam,
    clipZ,
    zCam
  );
}
`;

export const STUDIO_3D_FRAGMENT_SHADER = `#version 300 es
precision highp float;

in vec3 vWorldPos;
in vec3 vNormal;
in vec3 vColor;
in vec4 vMat;
in vec2 vQuadUv;

uniform vec3 uCamPos;
uniform vec3 uCamFwd;
uniform vec3 uCamRight;
uniform vec3 uCamUp;
uniform vec3 uKeyDir;
uniform vec3 uFillDir;
uniform int uShaderMode;

out vec4 fragColor;

void main() {
  vec3 N = normalize(vNormal);
  vec3 V = normalize(uCamPos - vWorldPos);
  if (dot(N, V) < 0.0) {
    N = -N;
  }

  float NdotV = max(0.0, dot(N, V));
  vec3 keyDir = normalize(uKeyDir);
  vec3 fillDir = normalize(uFillDir);
  // Camera-tracked 3/4 overhead studio backlight rim light for sculptural silhouette separation
  vec3 rimDir = normalize(-uCamFwd * 0.56 + uCamUp * 0.66 - uCamRight * 0.44);

  float rawNdl = dot(N, keyDir);
  float diffKey = max(0.0, rawNdl);
  float diffFill = max(0.0, dot(N, fillDir));
  float diffBounce = max(0.0, dot(N, vec3(0.0, 0.0, -1.0))) * 0.11;
  float ao = clamp(0.84 + max(0.0, vWorldPos.z) * 0.18, 0.82, 1.0);

  vec3 H = normalize(keyDir + V);
  float NdotH = max(0.0, dot(N, H));

  float alpha = clamp(vMat.x, 0.0, 1.0);
  int role = int(floor(vMat.y + 0.5));
  float specW = vMat.z;
  float emissiveLift = vMat.w * 0.24;

  vec3 base = vColor;
  vec3 keyTint = vec3(1.03, 0.99, 0.94);
  vec3 fillTint = vec3(0.91, 0.95, 1.00);
  vec3 bounceTint = vec3(0.98, 0.94, 0.87);

  vec3 col;

  if (role == 9) {
    // Physical 3D springs, ropes & piping ribbons
    float ribShade = 0.78 + diffKey * 0.24 + pow(NdotH, 32.0) * 0.16;
    col = base * ribShade;
  } else if (uShaderMode == 3) {
    // Clay-wire sculptural mode with anti-aliased quad edges (diagonal suppressed)
    float rim = pow(1.0 - NdotV, 2.5) * 0.20;
    float spec = pow(NdotH, 24.0) * specW * 0.45;
    float shade = (0.46 + diffKey * 0.42 + diffFill * 0.22 + diffBounce + rim) * ao;
    col = base * shade + vec3(spec);

    vec2 edgeDist = min(vQuadUv, vec2(1.0) - vQuadUv);
    vec2 fw = max(fwidth(vQuadUv), vec2(0.0005));
    vec2 edgeAlpha = vec2(1.0) - smoothstep(vec2(0.0), fw * 1.15, edgeDist);
    float wire = max(edgeAlpha.x, edgeAlpha.y) * 0.22;
    col = mix(col, vec3(0.16, 0.23, 0.20), wire);
  } else if (uShaderMode == 1) {
    // Biomech X-Ray holographic mode
    float rim = pow(1.0 - NdotV, 2.1);
    float shade = (0.42 + diffKey * 0.36 + diffFill * 0.20 + emissiveLift) * ao;
    col = base * shade + vec3(0.32, 0.92, 0.74) * rim * 0.52 + vec3(pow(NdotH, 28.0) * specW * 0.35);
    alpha = clamp(alpha + rim * 0.28, 0.18, 0.96);
  } else if (role == 1) {
    // Porcelain-Peach Skin with Dual-Lobe Subsurface Scattering Wrap & Champagne Rim
    float wrapKey = clamp((rawNdl + 0.46) / 1.46, 0.0, 1.0);
    float wrapFill = clamp((dot(N, fillDir) + 0.36) / 1.36, 0.0, 1.0);
    float scatterBand = exp(-pow((rawNdl + 0.08) * 2.35, 2.0));
    vec3 sssGlow = vec3(0.98, 0.48, 0.36) * scatterBand * 0.145;
    float fresnel = pow(1.0 - NdotV, 2.75);
    float backMask = smoothstep(-0.22, 0.85, dot(N, rimDir) * 0.68 + 0.32);
    vec3 rimCol = vec3(1.00, 0.94, 0.87) * fresnel * (0.12 + 0.24 * backMask);
    float dermalSpec = pow(NdotH, 24.0) * min(specW, 0.11);
    vec3 diffuse = (vec3(0.45) + wrapKey * 0.46 * keyTint + wrapFill * 0.22 * fillTint + diffBounce * bounceTint + vec3(emissiveLift)) * ao;
    col = base * diffuse + base * sssGlow + rimCol + vec3(1.00, 0.96, 0.92) * dermalSpec;
  } else if (role == 2) {
    // Silky Espresso Hair with Dual-Band Anisotropic-Inspired Sheen & Crisp Rim Light
    float fresnel = pow(1.0 - NdotV, 2.35);
    float backMask = smoothstep(-0.25, 0.88, dot(N, rimDir) * 0.72 + 0.28);
    // Shifted specular highlights simulating silk hair fiber anisotropy along up/down flow
    vec3 shiftN1 = normalize(N + uCamUp * 0.14);
    vec3 shiftN2 = normalize(N - uCamUp * 0.10);
    float primarySilk = pow(max(0.0, dot(shiftN1, H)), 46.0) * 0.34;
    float secondarySilk = pow(max(0.0, dot(shiftN2, H)), 18.0) * 0.18;
    vec3 fillH = normalize(fillDir + V);
    float fillSilk = pow(max(0.0, dot(shiftN1, fillH)), 26.0) * 0.12;
    vec3 diffuse = (vec3(0.42) + diffKey * 0.44 * keyTint + diffFill * 0.22 * fillTint + diffBounce * bounceTint) * ao;
    vec3 silkHighlight = vec3(0.94, 0.82, 0.72) * (primarySilk + fillSilk) + vec3(0.68, 0.46, 0.34) * secondarySilk;
    vec3 hairRim = vec3(0.98, 0.90, 0.80) * fresnel * (0.16 + 0.34 * backMask);
    col = base * diffuse + silkHighlight + hairRim;
  } else if (role == 3) {
    // Matte Botanical Velvet Athleisure Fabric (zero plastic shine)
    float fresnel = pow(1.0 - NdotV, 2.75);
    float backMask = smoothstep(-0.2, 0.85, dot(N, rimDir) * 0.65 + 0.35);
    vec3 velvetSheen = mix(base, vec3(0.84, 0.89, 0.85), 0.42) * fresnel * (0.18 + 0.18 * backMask);
    float microSpec = pow(NdotH, 16.0) * min(specW, 0.032);
    vec3 diffuse = (vec3(0.46) + diffKey * 0.42 * keyTint + diffFill * 0.23 * fillTint + diffBounce * bounceTint + vec3(emissiveLift)) * ao;
    col = base * diffuse + velvetSheen + vec3(0.88, 0.90, 0.88) * microSpec;
  } else if (role == 4) {
    // Satin European White-Oak Wood with subtle procedural grain & clearcoat
    float grainWave = sin(vWorldPos.x * 40.0 + vWorldPos.y * 11.5 + sin(vWorldPos.z * 26.0) * 1.2);
    float grain = 1.0 + 0.036 * grainWave;
    float coatRim = pow(1.0 - NdotV, 3.0) * 0.12;
    float baseSpec = pow(NdotH, 28.0) * (specW * 0.56);
    float coatSpec = pow(NdotH, 54.0) * 0.18;
    vec3 diffuse = (vec3(0.46) + diffKey * 0.43 * keyTint + diffFill * 0.22 * fillTint + diffBounce * bounceTint + vec3(coatRim + emissiveLift)) * ao * grain;
    col = base * diffuse + vec3(0.98, 0.95, 0.90) * (baseSpec + coatSpec);
  } else if (role == 5) {
    // Supple Sage Leather Upholstery
    float edgeCatch = pow(1.0 - NdotV, 2.7) * 0.16;
    float spec = pow(NdotH, 26.0) * min(specW, 0.20);
    vec3 diffuse = (vec3(0.46) + diffKey * 0.41 * keyTint + diffFill * 0.22 * fillTint + diffBounce * bounceTint + vec3(emissiveLift)) * ao;
    col = base * diffuse + vec3(0.68, 0.74, 0.69) * edgeCatch + vec3(0.92, 0.93, 0.90) * spec;
  } else if (role == 6 || role == 7) {
    // Brushed Chrome (6) & Anodized Brass (7) with Studio Hemisphere Environment Reflection
    vec3 refl = reflect(-V, N);
    float skyT = clamp(N.z * 0.55 + refl.z * 0.45, -1.0, 1.0);
    vec3 envCol = skyT >= 0.0
      ? mix(vec3(0.84, 0.82, 0.79), vec3(0.99, 0.97, 0.94), skyT)
      : mix(vec3(0.84, 0.82, 0.79), vec3(0.56, 0.54, 0.50), -skyT);
    float dirBoost = (0.68 + diffKey * 0.34 + diffFill * 0.18) * ao;
    float fresnel = pow(1.0 - NdotV, 3.1) * 0.18;
    vec3 fillH = normalize(fillDir + V);
    float aniso = (pow(NdotH, 68.0) * 0.72 + pow(max(0.0, dot(N, fillH)), 58.0) * 0.22) * max(0.55, specW);
    vec3 metalSpecTint = role == 7 ? vec3(1.00, 0.92, 0.74) : vec3(0.96, 0.98, 1.00);
    col = (base / 0.92) * envCol * dirBoost + metalSpecTint * (aniso + fresnel);
  } else if (role == 8) {
    // Glossy Eye Iris, Catchlight Pearls & Satin Coral Lips
    float sparkle = pow(NdotH, 86.0) * max(specW, 0.35) * 1.15;
    float rim = pow(1.0 - NdotV, 2.8) * 0.14;
    vec3 diffuse = (vec3(0.52) + diffKey * 0.40 * keyTint + diffFill * 0.22 * fillTint + vec3(emissiveLift)) * ao;
    col = base * diffuse + vec3(1.0, 0.98, 0.95) * (sparkle + rim);
  } else {
    float rim = pow(1.0 - NdotV, 2.6) * 0.16;
    float spec = pow(NdotH, 24.0) * specW;
    vec3 diffuse = (vec3(0.46) + diffKey * 0.42 * keyTint + diffFill * 0.22 * fillTint + diffBounce * bounceTint + vec3(rim + emissiveLift)) * ao;
    col = base * diffuse + vec3(0.95, 0.94, 0.91) * spec;
  }

  if (uShaderMode == 2) {
    // Game-arena emerald rim accent
    float arenaRim = pow(1.0 - NdotV, 2.4) * 0.26;
    col += vec3(0.18, 0.78, 0.58) * arenaRim;
  }

  // Filmic soft-shoulder rolloff so highlights stay silky and never harshly clip
  col = col / (vec3(1.0) + max(col - vec3(0.86), vec3(0.0)) * 0.42);
  col = clamp(col, 0.0, 1.0);

  // Premultiplied alpha output for clean Canvas2D drawImage compositing
  fragColor = vec4(col * alpha, alpha);
}
`;

interface ProgramUniforms {
  readonly uCamPos: WebGLUniformLocation | null;
  readonly uCamFwd: WebGLUniformLocation | null;
  readonly uCamRight: WebGLUniformLocation | null;
  readonly uCamUp: WebGLUniformLocation | null;
  readonly uProj: WebGLUniformLocation | null;
  readonly uKeyDir: WebGLUniformLocation | null;
  readonly uFillDir: WebGLUniformLocation | null;
  readonly uShaderMode: WebGLUniformLocation | null;
}

function compileShader(
  gl: WebGL2RenderingContext,
  type: number,
  source: string,
): WebGLShader | null {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

export type Studio3DRenderBackend = 'webgpu' | 'webgl2' | 'canvas2d';

export interface Studio3DGpuRenderer {
  readonly backend: 'webgpu' | 'webgl2';
  readonly canvas: HTMLCanvasElement;
  isAvailable(): boolean;
  render(params: StudioWebGLRenderParams): {
    readonly ok: boolean;
    readonly triangles: number;
    readonly pixelWidth: number;
    readonly pixelHeight: number;
  };
  dispose(): void;
}

export class Studio3DWebGL2Renderer implements Studio3DGpuRenderer {
  readonly backend = 'webgl2' as const;
  readonly canvas: HTMLCanvasElement;
  private readonly gl: WebGL2RenderingContext;
  private readonly program: WebGLProgram;
  private readonly vao: WebGLVertexArrayObject | null;
  private readonly vbo: WebGLBuffer;
  private readonly uniforms: ProgramUniforms;
  private readonly scratch = new MeshPackerScratch();
  private disposed = false;
  private contextLost = false;
  private vboCapacityBytes = 0;

  private constructor(
    canvas: HTMLCanvasElement,
    gl: WebGL2RenderingContext,
    program: WebGLProgram,
    vao: WebGLVertexArrayObject | null,
    vbo: WebGLBuffer,
    uniforms: ProgramUniforms,
  ) {
    this.canvas = canvas;
    this.gl = gl;
    this.program = program;
    this.vao = vao;
    this.vbo = vbo;
    this.uniforms = uniforms;
  }

  /**
   * Attempts to initialize a hardware WebGL2 renderer on the provided (or an unmounted offscreen)
   * canvas. Returns `null` cleanly when WebGL2 is unavailable (e.g. jsdom tests or legacy GPUs).
   */
  static create(targetCanvas?: HTMLCanvasElement): Studio3DWebGL2Renderer | null {
    if (
      !targetCanvas &&
      (typeof document === 'undefined' || typeof document.createElement !== 'function')
    ) {
      return null;
    }
    const canvas = targetCanvas ?? document.createElement('canvas');
    if (typeof canvas.getContext !== 'function') return null;
    if (
      !targetCanvas &&
      typeof navigator !== 'undefined' &&
      /jsdom/i.test(navigator.userAgent) &&
      !('mock' in canvas.getContext)
    ) {
      return null;
    }

    let gl: WebGL2RenderingContext | null;
    try {
      gl = canvas.getContext('webgl2', {
        alpha: true,
        antialias: true,
        depth: true,
        premultipliedAlpha: true,
        preserveDrawingBuffer: false,
        powerPreference: 'high-performance',
      });
    } catch {
      return null;
    }
    if (
      !gl ||
      typeof gl.createShader !== 'function' ||
      typeof gl.createProgram !== 'function' ||
      typeof gl.createBuffer !== 'function'
    ) {
      return null;
    }

    const vert = compileShader(gl, gl.VERTEX_SHADER, STUDIO_3D_VERTEX_SHADER);
    const frag = compileShader(gl, gl.FRAGMENT_SHADER, STUDIO_3D_FRAGMENT_SHADER);
    if (!vert || !frag) {
      if (vert) gl.deleteShader(vert);
      if (frag) gl.deleteShader(frag);
      return null;
    }

    const program = gl.createProgram();
    if (!program) {
      gl.deleteShader(vert);
      gl.deleteShader(frag);
      return null;
    }
    gl.attachShader(program, vert);
    gl.attachShader(program, frag);
    gl.linkProgram(program);
    gl.deleteShader(vert);
    gl.deleteShader(frag);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      gl.deleteProgram(program);
      return null;
    }

    const vbo = gl.createBuffer();
    if (!vbo) {
      gl.deleteProgram(program);
      return null;
    }

    const vao = typeof gl.createVertexArray === 'function' ? gl.createVertexArray() : null;
    if (vao) gl.bindVertexArray(vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);

    const stride = FLOATS_PER_VERTEX * 4;
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, stride, 0);
    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(1, 3, gl.FLOAT, false, stride, 12);
    gl.enableVertexAttribArray(2);
    gl.vertexAttribPointer(2, 3, gl.FLOAT, false, stride, 24);
    gl.enableVertexAttribArray(3);
    gl.vertexAttribPointer(3, 4, gl.FLOAT, false, stride, 36);
    gl.enableVertexAttribArray(4);
    gl.vertexAttribPointer(4, 3, gl.FLOAT, false, stride, 52);

    if (vao) gl.bindVertexArray(null);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);

    const uniforms: ProgramUniforms = {
      uCamPos: gl.getUniformLocation(program, 'uCamPos'),
      uCamFwd: gl.getUniformLocation(program, 'uCamFwd'),
      uCamRight: gl.getUniformLocation(program, 'uCamRight'),
      uCamUp: gl.getUniformLocation(program, 'uCamUp'),
      uProj: gl.getUniformLocation(program, 'uProj'),
      uKeyDir: gl.getUniformLocation(program, 'uKeyDir'),
      uFillDir: gl.getUniformLocation(program, 'uFillDir'),
      uShaderMode: gl.getUniformLocation(program, 'uShaderMode'),
    };

    const instance = new Studio3DWebGL2Renderer(canvas, gl, program, vao, vbo, uniforms);
    if (typeof canvas.addEventListener === 'function') {
      canvas.addEventListener('webglcontextlost', (event) => {
        event.preventDefault();
        instance.contextLost = true;
      });
      canvas.addEventListener('webglcontextrestored', () => {
        instance.contextLost = false;
      });
    }
    return instance;
  }

  isAvailable(): boolean {
    if (this.disposed || this.contextLost) return false;
    if (typeof this.gl.isContextLost === 'function' && this.gl.isContextLost()) {
      return false;
    }
    return true;
  }

  private uploadBuffer(data: Float32Array): void {
    const gl = this.gl;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);
    if (data.byteLength > this.vboCapacityBytes) {
      this.vboCapacityBytes = Math.max(data.byteLength, this.vboCapacityBytes * 2);
      gl.bufferData(gl.ARRAY_BUFFER, this.vboCapacityBytes, gl.DYNAMIC_DRAW);
    }
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, data);
  }

  render(params: StudioWebGLRenderParams): {
    readonly ok: boolean;
    readonly triangles: number;
    readonly pixelWidth: number;
    readonly pixelHeight: number;
  } {
    if (!this.isAvailable()) {
      return { ok: false, triangles: 0, pixelWidth: 0, pixelHeight: 0 };
    }
    const { camera, quads, physicalLines, keyDir, fillDir, shader } = params;
    const clampedDpr = Math.max(1, Math.min(2.5, camera.dpr || 1));
    const pixelWidth = Math.max(1, Math.round(camera.width * clampedDpr));
    const pixelHeight = Math.max(1, Math.round(camera.height * clampedDpr));

    if (this.canvas.width !== pixelWidth || this.canvas.height !== pixelHeight) {
      this.canvas.width = pixelWidth;
      this.canvas.height = pixelHeight;
    }

    const packed = triangulateAndWeldQuads(quads, {
      physicalLines,
      camera,
      scratch: this.scratch,
    });

    const gl = this.gl;
    gl.viewport(0, 0, pixelWidth, pixelHeight);
    gl.clearColor(0, 0, 0, 0);
    gl.clearDepth(1.0);
    gl.depthMask(true);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    gl.disable(gl.CULL_FACE);

    gl.useProgram(this.program);
    if (this.vao) {
      gl.bindVertexArray(this.vao);
    }

    gl.uniform3f(this.uniforms.uCamPos, camera.camPos[0], camera.camPos[1], camera.camPos[2]);
    gl.uniform3f(this.uniforms.uCamFwd, camera.camFwd[0], camera.camFwd[1], camera.camFwd[2]);
    gl.uniform3f(
      this.uniforms.uCamRight,
      camera.camRight[0],
      camera.camRight[1],
      camera.camRight[2],
    );
    gl.uniform3f(this.uniforms.uCamUp, camera.camUp[0], camera.camUp[1], camera.camUp[2]);
    gl.uniform4f(
      this.uniforms.uProj,
      (2 * camera.focal) / Math.max(1, camera.width),
      (2 * camera.focal) / Math.max(1, camera.height),
      NEAR_PLANE,
      FAR_PLANE,
    );
    gl.uniform3f(this.uniforms.uKeyDir, keyDir[0], keyDir[1], keyDir[2]);
    gl.uniform3f(this.uniforms.uFillDir, fillDir[0], fillDir[1], fillDir[2]);
    gl.uniform1i(this.uniforms.uShaderMode, SHADER_MODE_TO_ID[shader]);

    // Pass 1: Opaque geometry with hardware depth writes
    if (packed.opaqueVertexCount > 0) {
      gl.disable(gl.BLEND);
      gl.depthMask(true);
      this.uploadBuffer(packed.opaqueData);
      gl.drawArrays(gl.TRIANGLES, 0, packed.opaqueVertexCount);
    }

    // Pass 2: Translucent geometry (X-Ray / glass) with premultiplied alpha blending
    if (packed.translucentVertexCount > 0) {
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      gl.depthMask(false);
      this.uploadBuffer(packed.translucentData);
      gl.drawArrays(gl.TRIANGLES, 0, packed.translucentVertexCount);
      gl.depthMask(true);
    }

    if (this.vao) gl.bindVertexArray(null);

    return {
      ok: true,
      triangles: packed.totalTriangles,
      pixelWidth,
      pixelHeight,
    };
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    const gl = this.gl;
    try {
      if (this.vao && typeof gl.deleteVertexArray === 'function') {
        gl.deleteVertexArray(this.vao);
      }
      gl.deleteBuffer(this.vbo);
      gl.deleteProgram(this.program);
    } catch {
      // Context may already be lost during unmount teardown
    }
    this.canvas.width = 0;
    this.canvas.height = 0;
  }
}

let sharedOffscreenRenderer: Studio3DWebGL2Renderer | null | undefined;

/**
 * Lazily provides a shared offscreen WebGL2 renderer for direct `renderRealtimeStudio3DFrame`
 * callers (such as `LiveStageKinematicDiagram`) while returning `null` in non-WebGL2 environments.
 */
export function getSharedStudio3DWebGL2Renderer(): Studio3DWebGL2Renderer | null {
  if (typeof navigator !== 'undefined' && /jsdom/i.test(navigator.userAgent)) {
    return null;
  }
  if (sharedOffscreenRenderer === undefined) {
    sharedOffscreenRenderer = Studio3DWebGL2Renderer.create();
  }
  if (sharedOffscreenRenderer && !sharedOffscreenRenderer.isAvailable()) {
    sharedOffscreenRenderer.dispose();
    sharedOffscreenRenderer = Studio3DWebGL2Renderer.create();
  }
  return sharedOffscreenRenderer;
}

export function resetSharedStudio3DWebGL2RendererForTests(): void {
  if (sharedOffscreenRenderer) {
    sharedOffscreenRenderer.dispose();
  }
  sharedOffscreenRenderer = undefined;
}
