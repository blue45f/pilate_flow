import { readFileSync } from 'node:fs';
import path from 'node:path';
import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { INITIAL_EXERCISES } from '../data/pilatesCatalog';
import { StudioInteractive3DViewport } from '../components/StudioInteractive3DViewport';
import {
  projectStudio3DSceneForSvg,
  renderRealtimeStudio3DFrame,
  resolveStudio3DBody,
} from './realtimeStudio3dEngine';
import {
  computeRetargetedBoneMatrices,
  getCachedSkinnedHumanoidAsset,
  loadSharedSkinnedHumanoidAsset,
  parseSkinnedHumanoidGlb,
  setCachedSkinnedHumanoidAsset,
  skinHumanoidToStudioQuads,
  type SkinnedHumanoidAsset,
  type SkinnedHumanoidRigJoints,
} from './skinnedHumanoidRetargeter';
import { sampleStudio3DMotionRig } from './studio3dMotionTrack';
import { triangulateAndWeldQuads } from './studio3dWebgl2Renderer';

const GLB_FILE_PATH = path.resolve(
  import.meta.dirname,
  '../../public/models/pilates-studio/instructor-skinned-v5.glb',
);

const REQUIRED_BONES = [
  'Pelvis',
  'SpineLower',
  'SpineUpper',
  'Chest',
  'Neck',
  'Head',
  'Ponytail',
  'Shoulder_L',
  'UpperArm_L',
  'Forearm_L',
  'Hand_L',
  'Shoulder_R',
  'UpperArm_R',
  'Forearm_R',
  'Hand_R',
  'Thigh_L',
  'Shin_L',
  'Foot_L',
  'Thigh_R',
  'Shin_R',
  'Foot_R',
] as const;

let cachedRealAsset: SkinnedHumanoidAsset | null = null;

function loadRealGlbAsset(): { readonly bytes: Buffer; readonly asset: SkinnedHumanoidAsset } {
  const bytes = readFileSync(GLB_FILE_PATH);
  if (!cachedRealAsset) {
    const ab = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
    cachedRealAsset = parseSkinnedHumanoidGlb(ab);
  }
  return { bytes, asset: cachedRealAsset };
}

function buildRigJointsForExercise(exerciseIndexOrId: string | number, phaseT: number): {
  readonly rigJoints: SkinnedHumanoidRigJoints;
  readonly activeZones: readonly (
    | 'core'
    | 'glutes'
    | 'quads'
    | 'obliques'
    | 'back'
    | 'adductors'
    | 'shoulders'
  )[];
} {
  const ex =
    typeof exerciseIndexOrId === 'number'
      ? INITIAL_EXERCISES[exerciseIndexOrId]!
      : (INITIAL_EXERCISES.find((e) => e.id === exerciseIndexOrId) ?? INITIAL_EXERCISES[0]!);
  const rig = sampleStudio3DMotionRig(ex, phaseT);
  const body = resolveStudio3DBody(rig);
  const headPos: readonly [number, number, number] = [
    rig.chest[0] + body.spUp[0] * 0.158 + body.antN[0] * 0.012,
    rig.chest[1] + body.spUp[1] * 0.158 + body.antN[1] * 0.012,
    Math.max(0.115, rig.chest[2] + body.spUp[2] * 0.158 + body.antN[2] * 0.012),
  ];
  return {
    rigJoints: {
      pelvis: rig.pelvis,
      spineMid: rig.spineMid,
      chest: rig.chest,
      headPos,
      headAnt: body.antN,
      neckUp: body.spUp,
      bodyRight: body.bodyRight,
      pelvisRight: rig.pelvisRight ?? body.bodyRight,
      lSh: body.lSh,
      lElb: body.lElb,
      lWr: body.lWr,
      rSh: body.rSh,
      rElb: body.rElb,
      rWr: body.rWr,
      lHip: body.lHip,
      lKnee: body.lKnee,
      lAnkle: body.lAnkle,
      rHip: body.rHip,
      rKnee: body.rKnee,
      rAnkle: body.rAnkle,
      lKneeBend: body.lKneeBend,
      rKneeBend: body.rKneeBend,
      lElbowBend: body.lElbowBend,
      rElbowBend: body.rElbowBend,
      breathScale: 1.015,
    },
    activeZones: rig.activeZones,
  };
}

function createMock2dContext(): CanvasRenderingContext2D {
  return {
    save: vi.fn(),
    restore: vi.fn(),
    scale: vi.fn(),
    beginPath: vi.fn(),
    closePath: vi.fn(),
    rect: vi.fn(),
    clip: vi.fn(),
    fillRect: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
    fill: vi.fn(),
    arc: vi.fn(),
    ellipse: vi.fn(),
    fillText: vi.fn(),
    setLineDash: vi.fn(),
    drawImage: vi.fn(),
    createLinearGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
    lineCap: 'round',
    lineJoin: 'round',
    lineWidth: 1,
    strokeStyle: '#000',
    fillStyle: '#000',
    font: '10px sans-serif',
  } as unknown as CanvasRenderingContext2D;
}

afterEach(() => {
  setCachedSkinnedHumanoidAsset(null);
  cleanup();
  vi.restoreAllMocks();
});

describe('skinnedHumanoidRetargeter (real Blender 5.3 instructor-skinned-v5.glb)', () => {
  it('parses real instructor-skinned-v5.glb with <= 650KB budget, 6k..18k tris, 21 bones, IBM & normalized weights', () => {
    const { bytes, asset } = loadRealGlbAsset();

    expect(bytes.byteLength).toBeGreaterThan(100_000);
    expect(bytes.byteLength).toBeLessThanOrEqual(650 * 1024);

    expect(asset.triangleCount).toBeGreaterThanOrEqual(6_000);
    expect(asset.triangleCount).toBeLessThanOrEqual(18_000);
    expect(asset.vertexCount).toBeGreaterThan(3_000);
    expect(asset.jointCount).toBe(REQUIRED_BONES.length);

    for (const boneName of REQUIRED_BONES) {
      expect(asset.jointIndexByName.has(boneName)).toBe(true);
    }

    // Verify hierarchy roots & parent chain
    const pelvisIdx = asset.jointIndexByName.get('Pelvis')!;
    const spineLowerIdx = asset.jointIndexByName.get('SpineLower')!;
    const footRIdx = asset.jointIndexByName.get('Foot_R')!;
    const shinRIdx = asset.jointIndexByName.get('Shin_R')!;
    expect(asset.parentIndices[pelvisIdx]).toBe(-1);
    expect(asset.parentIndices[spineLowerIdx]).toBe(pelvisIdx);
    expect(asset.parentIndices[footRIdx]).toBe(shinRIdx);

    // Grounded at Y = 0 in glTF and realistic ~1.62m instructor stature
    expect(Math.abs(asset.bindBounds.min[1])).toBeLessThan(1e-3);
    const height = asset.bindBounds.max[1] - asset.bindBounds.min[1];
    expect(height).toBeGreaterThan(1.56);
    expect(height).toBeLessThan(1.72);

    // Every vertex has normalized weights summing to 1 and valid joint indices
    let badWeightVerts = 0;
    let outOfRangeJoints = 0;
    for (let vi = 0; vi < asset.vertexCount; vi++) {
      const i4 = vi * 4;
      const sum =
        asset.weights[i4]! +
        asset.weights[i4 + 1]! +
        asset.weights[i4 + 2]! +
        asset.weights[i4 + 3]!;
      if (Math.abs(sum - 1) >= 1e-3) badWeightVerts += 1;
      for (let k = 0; k < 4; k++) {
        if (asset.joints[i4 + k]! >= asset.jointCount) outOfRangeJoints += 1;
      }
    }
    expect(badWeightVerts).toBe(0);
    expect(outOfRangeJoints).toBe(0);

    // All 4 studio material roles decoded cleanly from 4x4 atlas UVs
    const roleSet = new Set(asset.triRoles);
    expect(roleSet.has('skin')).toBe(true);
    expect(roleSet.has('fabric')).toBe(true);
    expect(roleSet.has('hair')).toBe(true);
    expect(roleSet.has('gloss')).toBe(true);
  });

  it('produces finite, positive-determinant (right-handed) skin matrices and grounded upright bounding box', () => {
    const { asset } = loadRealGlbAsset();
    const uprightRig: SkinnedHumanoidRigJoints = {
      pelvis: [0, 0, 0.904],
      spineMid: [0, 0.005, 1.132],
      chest: [0, -0.004, 1.356],
      headPos: [0, -0.013, 1.522],
      headAnt: [0, -1, 0],
      neckUp: [0, 0, 1],
      bodyRight: [1, 0, 0],
      pelvisRight: [1, 0, 0],
      lSh: [-0.148, 0.002, 1.338],
      lElb: [-0.368, 0.018, 1.15],
      lWr: [-0.57, -0.012, 0.98],
      rSh: [0.148, 0.002, 1.338],
      rElb: [0.368, 0.018, 1.15],
      rWr: [0.57, -0.012, 0.98],
      lHip: [-0.088, 0, 0.904],
      lKnee: [-0.092, -0.006, 0.48],
      lAnkle: [-0.096, 0.002, 0.068],
      rHip: [0.088, 0, 0.904],
      rKnee: [0.092, -0.006, 0.48],
      rAnkle: [0.096, 0.002, 0.068],
      lKneeBend: [0, -1, 0],
      rKneeBend: [0, -1, 0],
      lElbowBend: [0, 1, 0],
      rElbowBend: [0, 1, 0],
    };

    const mats = computeRetargetedBoneMatrices(asset, uprightRig);
    expect(mats.length).toBe(asset.jointCount * 16);

    let nonFiniteMats = 0;
    for (let i = 0; i < mats.length; i++) {
      if (!Number.isFinite(mats[i]!)) nonFiniteMats += 1;
    }
    expect(nonFiniteMats).toBe(0);

    // Verify every bone matrix has strictly positive determinant (no mirrored/inverted limbs!)
    for (let j = 0; j < asset.jointCount; j++) {
      const o = j * 16;
      const m00 = mats[o]!;
      const m10 = mats[o + 1]!;
      const m20 = mats[o + 2]!;
      const m01 = mats[o + 4]!;
      const m11 = mats[o + 5]!;
      const m21 = mats[o + 6]!;
      const m02 = mats[o + 8]!;
      const m12 = mats[o + 9]!;
      const m22 = mats[o + 10]!;
      const det =
        m00 * (m11 * m22 - m12 * m21) -
        m01 * (m10 * m22 - m12 * m20) +
        m02 * (m10 * m21 - m11 * m20);
      expect(det).toBeGreaterThan(0.5);
      expect(det).toBeLessThan(1.6);
    }

    const quads = skinHumanoidToStudioQuads(asset, uprightRig, {
      shader: 'studio-pbr',
      activeZones: ['core'],
      phaseT: 0.5,
    });
    expect(quads.length).toBe(asset.triangleCount);

    let minZ = Infinity;
    let maxZ = -Infinity;
    let minX = Infinity;
    let maxX = -Infinity;
    let nonFiniteVerts = 0;
    let badNormals = 0;
    for (const q of quads) {
      for (const v of q.verts) {
        if (!Number.isFinite(v[0]) || !Number.isFinite(v[1]) || !Number.isFinite(v[2])) {
          nonFiniteVerts += 1;
        }
        if (v[2] < minZ) minZ = v[2];
        if (v[2] > maxZ) maxZ = v[2];
        if (v[0] < minX) minX = v[0];
        if (v[0] > maxX) maxX = v[0];
      }
      for (const n of q.vNormals!) {
        const l = Math.hypot(n[0], n[1], n[2]);
        if (l <= 0.98 || l >= 1.02) badNormals += 1;
      }
    }
    expect(nonFiniteVerts).toBe(0);
    expect(badNormals).toBe(0);
    expect(minZ).toBeGreaterThan(-0.04);
    expect(minZ).toBeLessThan(0.05);
    expect(maxZ - minZ).toBeGreaterThan(1.52);
    expect(maxZ - minZ).toBeLessThan(1.74);
    // Symmetric A-pose wingspan centered on X = 0
    expect(Math.abs(minX + maxX)).toBeLessThan(0.04);
    expect(maxX - minX).toBeGreaterThan(1.1);
  });

  it('skins mat, reformer bridge, and teaser poses cleanly with zero NaNs and exact left/right limb fidelity', () => {
    const { asset } = loadRealGlbAsset();
    const reformerEx = INITIAL_EXERCISES.find((e) => e.apparatus === 'reformer')!;
    const matEx = INITIAL_EXERCISES.find((e) => e.apparatus === 'mat')!;
    const teaserEx =
      INITIAL_EXERCISES.find((e) => /teaser|티저/i.test(`${e.id} ${e.nameKo}`)) ??
      INITIAL_EXERCISES.find((e) => e.apparatus === 'reformer' && e.id !== reformerEx.id)!;

    for (const ex of [matEx, reformerEx, teaserEx]) {
      for (const phaseT of [0, 0.5, 1]) {
        const { rigJoints, activeZones } = buildRigJointsForExercise(ex.id, phaseT);
        const quads = skinHumanoidToStudioQuads(asset, rigJoints, {
          shader: 'studio-pbr',
          activeZones,
          phaseT,
        });
        expect(quads.length).toBe(asset.triangleCount);

        let minX = Infinity;
        let maxX = -Infinity;
        let minY = Infinity;
        let maxY = -Infinity;
        let minZ = Infinity;
        let maxZ = -Infinity;
        let nonFiniteCount = 0;
        for (const q of quads) {
          const v0 = q.verts[0];
          if (!Number.isFinite(v0[0]) || !Number.isFinite(v0[1]) || !Number.isFinite(v0[2])) {
            nonFiniteCount += 1;
          }
          if (v0[0] < minX) minX = v0[0];
          if (v0[0] > maxX) maxX = v0[0];
          if (v0[1] < minY) minY = v0[1];
          if (v0[1] > maxY) maxY = v0[1];
          if (v0[2] < minZ) minZ = v0[2];
          if (v0[2] > maxZ) maxZ = v0[2];
        }
        expect(nonFiniteCount).toBe(0);
        // Bounding box stays anatomically bounded (no exploded vertices)
        expect(maxX - minX).toBeLessThan(2.2);
        expect(maxY - minY).toBeLessThan(2.2);
        expect(maxZ - minZ).toBeLessThan(2.2);
        expect(maxZ - minZ).toBeGreaterThan(0.18);
      }
    }

    // Asymmetric limb test: right leg lifted high (+0.65m), left leg planted on floor!
    // Confirms zero left/right crossover or mirrored twist.
    const asymRig: SkinnedHumanoidRigJoints = {
      pelvis: [0, 0, 0.88],
      spineMid: [0, 0, 1.10],
      chest: [0, 0, 1.32],
      headPos: [0, -0.01, 1.49],
      headAnt: [0, -1, 0],
      neckUp: [0, 0, 1],
      bodyRight: [1, 0, 0],
      pelvisRight: [1, 0, 0],
      lSh: [-0.15, 0, 1.31],
      lElb: [-0.22, -0.04, 1.04],
      lWr: [-0.25, -0.08, 0.79],
      rSh: [0.15, 0, 1.31],
      rElb: [0.22, -0.04, 1.56],
      rWr: [0.20, -0.08, 1.81],
      lHip: [-0.09, 0, 0.88],
      lKnee: [-0.09, -0.02, 0.48],
      lAnkle: [-0.09, 0, 0.08],
      rHip: [0.09, 0, 0.88],
      rKnee: [0.09, -0.38, 0.92],
      rAnkle: [0.09, -0.76, 0.96],
      lKneeBend: [0, -1, 0],
      rKneeBend: [0, -0.2, 0.98],
      lElbowBend: [0, 1, 0],
      rElbowBend: [0, 1, 0],
    };
    const asymQuads = skinHumanoidToStudioQuads(asset, asymRig, {
      shader: 'studio-pbr',
      activeZones: ['glutes', 'quads'],
      phaseT: 0.7,
    });
    let closestToLAnkle = Infinity;
    let closestToRAnkle = Infinity;
    let closestToRWr = Infinity;
    for (const q of asymQuads) {
      const v = q.verts[0];
      const dL = Math.hypot(v[0] - asymRig.lAnkle[0], v[1] - asymRig.lAnkle[1], v[2] - asymRig.lAnkle[2]);
      const dR = Math.hypot(v[0] - asymRig.rAnkle[0], v[1] - asymRig.rAnkle[1], v[2] - asymRig.rAnkle[2]);
      const dW = Math.hypot(v[0] - asymRig.rWr[0], v[1] - asymRig.rWr[1], v[2] - asymRig.rWr[2]);
      if (dL < closestToLAnkle) closestToLAnkle = dL;
      if (dR < closestToRAnkle) closestToRAnkle = dR;
      if (dW < closestToRWr) closestToRWr = dW;
    }
    expect(closestToLAnkle).toBeLessThan(0.06);
    expect(closestToRAnkle).toBeLessThan(0.06);
    expect(closestToRWr).toBeLessThan(0.06);
  });

  it('supports all 4 studio shader presets and packs cleanly into WebGPU/WebGL2 vertex buffers with zero degenerate duplicate tris', () => {
    const { asset } = loadRealGlbAsset();
    const { rigJoints, activeZones } = buildRigJointsForExercise(0, 0.65);

    for (const shader of ['studio-pbr', 'biomech-xray', 'game-arena', 'clay-wire'] as const) {
      const quads = skinHumanoidToStudioQuads(asset, rigJoints, {
        shader,
        activeZones,
        phaseT: 0.65,
        showBiomechOverlay: true,
      });
      const expectedAlpha = shader === 'biomech-xray' ? 0.44 : 1.0;
      expect(quads[0]!.alpha).toBeCloseTo(expectedAlpha, 2);

      const packed = triangulateAndWeldQuads(quads);
      expect(packed.totalTriangles).toBeGreaterThan(asset.triangleCount * 0.98);
      expect(packed.totalTriangles).toBeLessThanOrEqual(asset.triangleCount);
      const data = shader === 'biomech-xray' ? packed.translucentData : packed.opaqueData;
      expect(data.length).toBeGreaterThan(asset.triangleCount * 3 * 16 * 0.95);
      let nonFiniteGpu = 0;
      for (let i = 0; i < data.length; i++) {
        if (!Number.isFinite(data[i]!)) nonFiniteGpu += 1;
      }
      expect(nonFiniteGpu).toBe(0);
    }
  });

  it('integrates with realtimeStudio3dEngine and StudioInteractive3DViewport with clean jsdom fallback & skinned badge', async () => {
    // 1) Default jsdom: loadSharedSkinnedHumanoidAsset resolves null safely without network failure
    expect(getCachedSkinnedHumanoidAsset()).toBeNull();
    const jsdomLoaded = await loadSharedSkinnedHumanoidAsset();
    expect(jsdomLoaded).toBeNull();

    const sampleEx = INITIAL_EXERCISES[0]!;
    const ctx = createMock2dContext();

    // Without cached asset -> procedural fallback
    const procFrame = renderRealtimeStudio3DFrame({
      ctx,
      width: 640,
      height: 416,
      exercise: sampleEx,
      phaseT: 0.4,
      yawDeg: -34,
      pitchDeg: 21,
      zoom: 1.04,
      shader: 'studio-pbr',
    });
    expect(procFrame.characterPipeline).toBe('procedural');

    // 2) With real GLB asset loaded -> skinned-glb pipeline activates automatically!
    const { asset } = loadRealGlbAsset();
    setCachedSkinnedHumanoidAsset(asset);

    const skinnedFrame = renderRealtimeStudio3DFrame({
      ctx,
      width: 640,
      height: 416,
      exercise: sampleEx,
      phaseT: 0.4,
      yawDeg: -34,
      pitchDeg: 21,
      zoom: 1.04,
      shader: 'studio-pbr',
    });
    expect(skinnedFrame.characterPipeline).toBe('skinned-glb');

    // SVG fast mode still stays fast & valid
    const svgProj = projectStudio3DSceneForSvg(sampleEx, 0.5);
    expect(svgProj.elements.length).toBeGreaterThan(0);

    // Viewport renders data-character-pipeline="skinned-glb" and Calm Atelier badge
    render(React.createElement(StudioInteractive3DViewport, { exercise: sampleEx, compact: true }));
    const viewport = screen.getByTestId('studio-interactive-3d-viewport');
    expect(viewport).toHaveAttribute('data-character-pipeline', 'skinned-glb');
    const badge = screen.getByTestId('studio-3d-skinned-badge');
    expect(badge).toHaveTextContent('스킨드 3D');
  });
});
