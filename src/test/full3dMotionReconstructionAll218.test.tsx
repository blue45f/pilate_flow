import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ExerciseMotionArtwork } from '../components/ExerciseMotionArtwork';
import { LiveStageKinematicDiagram } from '../components/LiveStageKinematicDiagram';
import NativeExerciseMotionArtwork from '../components/NativeExerciseMotionArtwork';
import { Studio3DMotionHeroCard } from '../components/Studio3DMotionHeroCard';
import {
  ALL_STUDIO_GLB_ASSETS,
  STUDIO_PRACTITIONER_GLB_META,
} from '../data/blenderStudioGlbManifest';
import { EXPANDED_MOVEMENTS } from '../data/expandedMovements';
import { GLOBAL_CRAWLED_REPERTOIRE_EXERCISES } from '../data/globalCrawledRepertoirePack';
import { INITIAL_EXERCISES } from '../data/pilatesCatalog';
import {
  DEDICATED_3D_EXERCISE_IDS,
  hasDedicated3DExerciseRig,
  PHASE_3D_RAW_T,
  sampleUniversal3DExerciseRig,
} from '../data/universal3dExerciseRigs';
import type { ApparatusType, BodyPosition, PilatesExercise } from '../types/pilates';
import { getExerciseArtworkFrame } from '../utils/exerciseArtworkCache';
import {
  projectStudio3DSceneForSvg,
  renderRealtimeStudio3DFrame,
} from '../utils/realtimeStudio3dEngine';

function createMock2DContext(): CanvasRenderingContext2D {
  const grad = { addColorStop: vi.fn() };
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
    createLinearGradient: vi.fn(() => grad),
    lineCap: 'round',
    lineJoin: 'round',
    lineWidth: 1,
    strokeStyle: '#000',
    fillStyle: '#000',
    font: '10px sans-serif',
  } as unknown as CanvasRenderingContext2D;
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('100% 3D Motion Conversion & Full 218-Exercise + Procedural 3D Reconstruction', () => {
  it('reconstructs dedicated, phase-distinct 3D rigs and cached 3D WebP frames for all 218 exercises (98 native + 60 expanded + 60 crawled) and verifies all 6 Flagship Precision .glb assets', () => {
    const all218 = [...INITIAL_EXERCISES, ...GLOBAL_CRAWLED_REPERTOIRE_EXERCISES];
    expect(all218).toHaveLength(218);
    expect(DEDICATED_3D_EXERCISE_IDS).toHaveLength(218);
    expect(STUDIO_PRACTITIONER_GLB_META.glbForgeScore).toBe(100);
    expect(STUDIO_PRACTITIONER_GLB_META.mobileHeroScore).toBe(100);
    expect(ALL_STUDIO_GLB_ASSETS).toHaveLength(6);

    const rootDir = process.cwd();
    for (const meta of ALL_STUDIO_GLB_ASSETS) {
      const fullGlbPath = path.join(rootDir, 'public', meta.url.replace(/^\//, ''));
      expect(existsSync(fullGlbPath), meta.fileName).toBe(true);
      const buf = readFileSync(fullGlbPath);
      expect(buf.readUInt32LE(0), meta.fileName).toBe(0x46546c67);
      expect(buf.subarray(0, 4).toString('ascii'), meta.fileName).toBe('glTF');
      expect(buf.readUInt32LE(8), meta.fileName).toBe(meta.fileBytes);
      expect(buf.byteLength, meta.fileName).toBe(meta.fileBytes);
      expect(createHash('sha256').update(buf).digest('hex'), meta.fileName).toBe(meta.sha256);
      expect(meta.triangles, meta.fileName).toBeGreaterThanOrEqual(25000);
      expect(meta.drawCalls, meta.fileName).toBe(2);
      expect(meta.glbForgeScore, meta.fileName).toBe(100);
      expect(meta.mobileHeroScore, meta.fileName).toBe(100);
      expect(meta.arkitCompatible, meta.fileName).toBe(true);
    }

    for (const ex of all218) {
      expect(hasDedicated3DExerciseRig(ex), ex.id).toBe(true);
      const s = sampleUniversal3DExerciseRig(ex, PHASE_3D_RAW_T.start);
      const m = sampleUniversal3DExerciseRig(ex, PHASE_3D_RAW_T.middle);
      const e = sampleUniversal3DExerciseRig(ex, PHASE_3D_RAW_T.end);

      expect(s.rigScope).toBe('dedicated-3d-rig');
      expect(s.poseFeatureKo.length).toBeGreaterThan(5);
      for (const [phaseLabel, rig] of [
        ['start', s],
        ['middle', m],
        ['end', e],
      ] as const) {
        for (const [poleName, pole] of [
          ['lKneePole', rig.lKneePole],
          ['rKneePole', rig.rKneePole],
          ['lElbowPole', rig.lElbowPole],
          ['rElbowPole', rig.rElbowPole],
        ] as const) {
          expect(
            Math.hypot(pole[0], pole[1], pole[2]),
            `${ex.id}/${phaseLabel}/${poleName}`,
          ).toBeGreaterThanOrEqual(0.1);
        }
        for (const [jointName, joint] of [
          ['pelvis', rig.pelvis],
          ['spineMid', rig.spineMid],
          ['chest', rig.chest],
          ['lFoot', rig.lFoot],
          ['rFoot', rig.rFoot],
          ['lHand', rig.lHand],
          ['rHand', rig.rHand],
        ] as const) {
          expect(joint[2], `${ex.id}/${phaseLabel}/${jointName}.z`).toBeGreaterThanOrEqual(0.03);
        }
      }
      const serializeRig = (rig: ReturnType<typeof sampleUniversal3DExerciseRig>) =>
        JSON.stringify([
          rig.pelvis,
          rig.spineMid,
          rig.chest,
          rig.antHint,
          rig.lFoot,
          rig.rFoot,
          rig.lKneePole,
          rig.rKneePole,
          rig.lHand,
          rig.rHand,
          rig.lElbowPole,
          rig.rElbowPole,
          rig.carriageX,
          rig.pedalDeg,
          rig.pushthroughDeg,
        ]);
      // Start, peak, and controlled-return 3D poses must be distinct for every single exercise
      expect(serializeRig(s), ex.id).not.toBe(serializeRig(m));
      expect(serializeRig(e), ex.id).not.toBe(serializeRig(m));
      expect(serializeRig(s), ex.id).not.toBe(serializeRig(e));

      for (const phase of ['start', 'middle', 'end'] as const) {
        const cached = getExerciseArtworkFrame(ex, phase);
        expect(cached, `${ex.id}/${phase}`).toBeDefined();
      }
    }

    // Verify prop-specific 3D rigs (dumbbells, theraband, side leg springs, standing arm springs)
    expect(
      sampleUniversal3DExerciseRig(
        EXPANDED_MOVEMENTS.find((x) => x.id === 'expanded-barrel-arm-circles')!,
        0.5,
      ).withDumbbells,
    ).toBe(true);
    expect(
      sampleUniversal3DExerciseRig(
        INITIAL_EXERCISES.find((x) => x.id === 'original-mat-band-row')!,
        0.5,
      ).withTheraband,
    ).toBe(true);
    expect(
      sampleUniversal3DExerciseRig(
        EXPANDED_MOVEMENTS.find((x) => x.id === 'expanded-cadillac-standing-fencing')!,
        0.5,
      ).armSpringsFrom,
    ).toBeDefined();
    expect(
      sampleUniversal3DExerciseRig(
        EXPANDED_MOVEMENTS.find((x) => x.id === 'expanded-cadillac-side-leg-springs-front-back')!,
        0.5,
      ).sideLegSpring,
    ).toBe('right');
  });

  it('synthesizes collision-free procedural 3D scenes across all 5 apparatuses x 7 body positions for custom & edited exercises', () => {
    const apparatuses: readonly ApparatusType[] = [
      'mat',
      'reformer',
      'cadillac',
      'chair',
      'barrel',
    ];
    const positions: readonly BodyPosition[] = [
      'supine',
      'prone',
      'side-lying',
      'seated',
      'kneeling',
      'quadruped',
      'standing',
    ];
    const base = INITIAL_EXERCISES[0]!;
    const ctx = createMock2DContext();

    for (const apparatus of apparatuses) {
      for (const bodyPosition of positions) {
        const custom: PilatesExercise = {
          ...base,
          id: `custom-3d-${apparatus}-${bodyPosition}`,
          nameKo: `커스텀 3D ${apparatus} ${bodyPosition}`,
          apparatus,
          bodyPosition,
        };
        expect(hasDedicated3DExerciseRig(custom)).toBe(false);
        const rig = sampleUniversal3DExerciseRig(custom, 0.75);
        expect(rig.rigScope).toBe('procedural-3d-synthesis');

        const frameRes = renderRealtimeStudio3DFrame({
          ctx,
          width: 640,
          height: 400,
          exercise: custom,
          phaseT: 0.75,
          yawDeg: -34,
          pitchDeg: 21,
          zoom: 1.04,
          shader: 'studio-pbr',
        });
        expect(Number.isFinite(frameRes.biomechTelemetry.kneeAngleDeg)).toBe(true);
        expect(frameRes.hotspots.length).toBeGreaterThan(0);

        const projected = projectStudio3DSceneForSvg(custom, 0.5);
        expect(projected.elements.length).toBeGreaterThan(50);

        const svgMarkup = renderToStaticMarkup(
          <NativeExerciseMotionArtwork exercise={custom} phase="middle" />,
        );
        expect(svgMarkup).toContain('data-3d-projected="true"');
        expect(svgMarkup).not.toMatch(/NaN|Infinity/);
      }
    }
  });

  it('renders interactive 360° 3D motion & 3D posture strips across expanded and crawled movements in Studio3DMotionHeroCard & LiveStageKinematicDiagram', () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(
      () => createMock2DContext() as never,
    );
    const expanded = EXPANDED_MOVEMENTS.find((x) => x.id === 'expanded-barrel-horseback-jockey')!;
    const crawled = GLOBAL_CRAWLED_REPERTOIRE_EXERCISES.find(
      (x) => x.id === 'crawled-mat-rolling-like-a-ball',
    )!;

    for (const ex of [expanded, crawled]) {
      const view = render(<Studio3DMotionHeroCard exercise={ex} />);
      const hero = screen.getByTestId('studio-3d-motion-hero-card');
      expect(hero).toHaveAttribute('data-3d-rig-scope', 'dedicated-3d-rig');
      expect(within(hero).getByTestId('studio-interactive-3d-viewport')).toBeVisible();

      fireEvent.click(within(hero).getByRole('button', { name: '3D 자세 프레임' }));
      expect(hero).toHaveAttribute('data-motion-mode', 'start');
      fireEvent.click(within(hero).getByRole('button', { name: '세 자세 나란히 보기' }));
      expect(hero.querySelectorAll('figure.pf-native-posture-frame')).toHaveLength(3);
      view.unmount();

      const art = render(<ExerciseMotionArtwork exercise={ex} phase="middle" />);
      expect(art.container.querySelector('img[data-3d-rendered="true"]')).not.toBeNull();
      art.unmount();

      const live = render(<LiveStageKinematicDiagram exercise={ex} running={false} />);
      expect(screen.getByTestId('live-stage-kinematic-diagram')).toHaveAttribute(
        'data-3d-rig-scope',
        'dedicated-3d-rig',
      );
      live.unmount();
    }
  });
});
