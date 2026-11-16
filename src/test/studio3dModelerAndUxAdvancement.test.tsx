import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Apparatus3dRigPreviewCard } from '../components/Apparatus3dRigPreviewCard';
import {
  formatExerciseSetupSummaryKo,
  Studio3DMotionHeroCard,
} from '../components/Studio3DMotionHeroCard';
import { StudioInteractive3DViewport } from '../components/StudioInteractive3DViewport';
import { BLENDER_STUDIO_GLB_MANIFEST } from '../data/blenderStudioGlbManifest';
import { INITIAL_EXERCISES } from '../data/pilatesCatalog';
import { renderRealtimeStudio3DFrame } from '../utils/realtimeStudio3dEngine';

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

describe('Luxury 3D Modeler Engine, Blender 5.2 GLB Manifest & Studio Hero Integration', () => {
  it('verifies all 5 Blender 5.2 + GLBForge Meshopt .glb studio rigs and LICENSE.txt match manifest bytes & SHA-256', () => {
    const licensePath = path.resolve(process.cwd(), 'public/models/pilates-studio/LICENSE.txt');
    expect(fs.existsSync(licensePath)).toBe(true);
    expect(fs.readFileSync(licensePath, 'utf8')).toContain('SPDX-License-Identifier: MIT');

    for (const meta of Object.values(BLENDER_STUDIO_GLB_MANIFEST)) {
      const abs = path.resolve(process.cwd(), 'public', meta.url.replace(/^\//, ''));
      expect(fs.existsSync(abs)).toBe(true);
      const buf = fs.readFileSync(abs);
      expect(buf.subarray(0, 4).toString('ascii')).toBe('glTF');
      expect(buf.byteLength).toBe(meta.fileBytes);
      const digest = crypto.createHash('sha256').update(buf).digest('hex');
      expect(digest).toBe(meta.sha256);
      expect(meta.triangles).toBeGreaterThanOrEqual(5000);
      expect(meta.glbForgeScore).toBeGreaterThanOrEqual(95);
    }
  });

  it('renders luxury 3D apparatus + sculpted anatomy across shaders, dual alignment, mirror, and setup overrides', () => {
    const ctx = createMock2DContext();
    const reformerEx = INITIAL_EXERCISES.find((ex) => ex.apparatus === 'reformer')!;
    const barrelEx = INITIAL_EXERCISES.find((ex) => ex.apparatus === 'barrel')!;

    const resReformer = renderRealtimeStudio3DFrame({
      ctx,
      width: 720,
      height: 450,
      exercise: reformerEx,
      phaseT: 0.65,
      yawDeg: -34,
      pitchDeg: 21,
      zoom: 1.05,
      shader: 'studio-pbr',
      mirrored: true,
      showBiomechOverlay: true,
      dualView: true,
      springOverride: '1R 1B',
      footbarOverride: 'mid',
      headrestOverride: 'up',
      propOverride: 'ring',
    });

    expect(resReformer.springStretchPct).toBeGreaterThan(0);
    expect(resReformer.biomechTelemetry.kneeAngleDeg).toBeGreaterThan(30);
    expect(resReformer.biomechTelemetry.hipAngleDeg).toBeGreaterThan(30);
    expect(resReformer.biomechTelemetry.activeSpringLabel).toBe('1R 1B');

    const resBarrel = renderRealtimeStudio3DFrame({
      ctx,
      width: 640,
      height: 400,
      exercise: barrelEx,
      phaseT: 0.5,
      yawDeg: -28,
      pitchDeg: 18,
      zoom: 1.0,
      shader: 'clay-wire',
      showBiomechOverlay: true,
    });
    expect(resBarrel.biomechTelemetry.comHeightCm).toBeGreaterThan(20);
  });

  it('exposes dual view, biomech telemetry, mirror, setup simulator, and GLB/Blender exports in StudioInteractive3DViewport with a single range slider', () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(
      () => createMock2DContext() as never,
    );
    const reformerEx = INITIAL_EXERCISES.find((ex) => ex.apparatus === 'reformer')!;

    render(<StudioInteractive3DViewport exercise={reformerEx} />);

    // Preserves single-slider contract
    expect(screen.getAllByRole('slider')).toHaveLength(1);

    const tools = screen.getByTestId('studio-3d-modeler-tools');
    const dualBtn = within(tools).getByRole('button', { name: '듀얼 정렬 비교' });
    fireEvent.click(dualBtn);
    expect(dualBtn).toHaveAttribute('aria-pressed', 'true');

    const mirrorBtn = within(tools).getByRole('button', { name: '좌·우 반전' });
    fireEvent.click(mirrorBtn);
    expect(mirrorBtn).toHaveAttribute('aria-pressed', 'true');

    const setupBtn = within(tools).getByRole('button', { name: '기구·소도구 세팅 실험' });
    fireEvent.click(setupBtn);
    const lab = screen.getByTestId('studio-3d-setup-lab');
    fireEvent.change(within(lab).getByLabelText('3D 스프링 조합 시뮬레이션'), {
      target: { value: '1B 1Y' },
    });
    expect(within(lab).getByRole('link', { name: /\.glb/ })).toHaveAttribute(
      'href',
      '/models/pilates-studio/reformer-studio-rig.glb',
    );
  });

  it('localizes setup summaries cleanly and mounts the 3D Modeler on demand in Studio3DMotionHeroCard & Apparatus3dRigPreviewCard', () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(
      () => createMock2DContext() as never,
    );
    const matEx = INITIAL_EXERCISES.find((ex) => ex.apparatus === 'mat')!;
    expect(formatExerciseSetupSummaryKo(matEx)).not.toContain('none');
    expect(formatExerciseSetupSummaryKo(matEx)).not.toContain('flat');

    const view = render(<Studio3DMotionHeroCard exercise={matEx} />);
    const card = screen.getByTestId('studio-3d-motion-hero-card');
    expect(card.querySelectorAll('canvas')).toHaveLength(0);
    expect(screen.getByTestId('detail-essential-3-strip')).not.toHaveTextContent('풋바 none');

    fireEvent.click(screen.getByTestId('toggle-interactive-3d-modeler'));
    expect(screen.getByTestId('interactive-3d-modeler-panel')).toBeVisible();
    expect(card.querySelectorAll('canvas')).toHaveLength(1);
    view.unmount();

    render(<Apparatus3dRigPreviewCard apparatus="barrel" bodyPosition="prone" />);
    expect(screen.getByTestId('rig-glb-download-link')).toHaveAttribute(
      'href',
      '/models/pilates-studio/barrel-studio-rig.glb',
    );
  });
});
