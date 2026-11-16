import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Apparatus3dRigPreviewCard } from '../components/Apparatus3dRigPreviewCard';
import { SequenceStudioWorkbench } from '../components/SequenceStudioWorkbench';
import {
  formatExerciseSetupSummaryKo,
  Studio3DMotionHeroCard,
} from '../components/Studio3DMotionHeroCard';
import { StudioCommandPalette } from '../components/StudioCommandPalette';
import { StudioInteractive3DViewport } from '../components/StudioInteractive3DViewport';
import { BLENDER_STUDIO_GLB_MANIFEST } from '../data/blenderStudioGlbManifest';
import { INITIAL_EXERCISES } from '../data/pilatesCatalog';
import { usePilatesStore } from '../store/usePilatesStore';
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

const initialStoreSnapshot = usePilatesStore.getState();

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  usePilatesStore.setState(initialStoreSnapshot, true);
});

describe('Luxury 3D Modeler Engine, 100/100 GLB Manifest & Korean Studio UX Advancement', () => {
  it('verifies all 5 Blender 5.2 + GLBForge .glb studio rigs achieve 100/100 mobile & desktop scores and match SHA-256', () => {
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
      expect(meta.triangles).toBeGreaterThanOrEqual(6000);
      expect(meta.drawCalls).toBeLessThanOrEqual(4);
      expect(meta.glbForgeScore).toBe(100);
      expect(meta.mobileHeroScore).toBe(100);
      expect(meta.arkitCompatible).toBe(true);
    }
  });

  it('renders Gouraud smooth organic gradients, 3D coaching hotspots, dual alignment, mirror, and setup overrides', () => {
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
      selectedHotspotId: 'knee',
    });

    expect(resReformer.springStretchPct).toBeGreaterThan(0);
    expect(resReformer.biomechTelemetry.kneeAngleDeg).toBeGreaterThan(30);
    expect(resReformer.biomechTelemetry.hipAngleDeg).toBeGreaterThan(30);
    expect(resReformer.biomechTelemetry.activeSpringLabel).toBe('1R 1B');
    expect(resReformer.hotspots.map((h) => h.id)).toEqual([
      'spine',
      'hip',
      'knee',
      'shoulder',
      'apparatus',
    ]);
    // Verifies Gouraud smooth curved-quad gradients are generated beyond the 2 background fills
    expect(
      (ctx.createLinearGradient as ReturnType<typeof vi.fn>).mock.calls.length,
    ).toBeGreaterThan(20);

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
    expect(resBarrel.hotspots).toHaveLength(5);
  });

  it('supports interactive 3D joint coaching, keyboard scrub, phase jumps, and step spring apply with a single range slider', () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(
      () => createMock2DContext() as never,
    );
    const reformerEx = INITIAL_EXERCISES.find((ex) => ex.apparatus === 'reformer')!;
    const onApplySpring = vi.fn();

    render(
      <StudioInteractive3DViewport exercise={reformerEx} onApplySpringToStep={onApplySpring} />,
    );

    // Preserves single-slider contract
    const slider = screen.getByRole('slider', { name: '3D 동작 진행 구간 스크러버' });
    expect(screen.getAllByRole('slider')).toHaveLength(1);
    expect(slider).toHaveValue('0');

    // Keyboard ArrowRight scrubs +5%
    const canvasWrap = screen.getByLabelText(/3D 뷰포트 조작 영역/);
    fireEvent.keyDown(canvasWrap, { key: 'ArrowRight' });
    expect(slider).toHaveValue('5');

    const tools = screen.getByTestId('studio-3d-modeler-tools');
    fireEvent.click(within(tools).getByRole('button', { name: '기구·소도구 세팅 실험' }));
    const lab = screen.getByTestId('studio-3d-setup-lab');

    // Phase jump chip snaps to 50% peak
    fireEvent.click(within(lab).getByRole('button', { name: '최대 정점' }));
    expect(slider).toHaveValue('50');

    // Interactive 3D joint coaching chip opens coaching card & Escape closes it
    fireEvent.click(within(lab).getByRole('button', { name: '무릎·하체 코칭' }));
    const card = screen.getByTestId('studio-3d-hotspot-card');
    expect(card).toHaveTextContent('무릎·하체 정렬');
    fireEvent.keyDown(canvasWrap, { key: 'Escape' });
    expect(screen.queryByTestId('studio-3d-hotspot-card')).toBeNull();

    // Spring simulator + 1-click apply to step
    fireEvent.change(within(lab).getByLabelText('3D 스프링 조합 시뮬레이션'), {
      target: { value: '1B 1Y' },
    });
    fireEvent.click(within(lab).getByTestId('apply-3d-spring-to-step'));
    expect(onApplySpring).toHaveBeenCalledWith('1B 1Y');

    expect(within(lab).getByRole('link', { name: /\.glb/ })).toHaveAttribute(
      'href',
      '/models/pilates-studio/reformer-studio-rig.glb',
    );
  });

  it('supports keyboard ArrowDown/ArrowUp/Enter/Shift+Enter in StudioCommandPalette (⌘K)', () => {
    const onInspect3D = vi.fn();
    const onClose = vi.fn();

    render(
      <StudioCommandPalette
        open
        onClose={onClose}
        onNavigateTab={vi.fn()}
        onLoadSequence={vi.fn()}
        onSwitchPortalRole={vi.fn()}
        onInspectExercise3D={onInspect3D}
        onOpenNewIdea={vi.fn()}
        canStartLiveStage={false}
      />,
    );

    const input = screen.getByTestId('studio-command-palette-input');
    const rows = screen
      .getByTestId('studio-command-palette')
      .querySelectorAll('.pf-cmdk-exercise-row');
    expect(rows.length).toBeGreaterThanOrEqual(2);
    expect(rows[0]).toHaveAttribute('data-kb-active', 'true');

    fireEvent.keyDown(input, { key: 'ArrowDown' });
    expect(rows[1]).toHaveAttribute('data-kb-active', 'true');

    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onInspect3D).toHaveBeenCalledTimes(1);
  });

  it('opens on-demand 3D pose & spring preview inside StepEditor and saves customSpringOverride', async () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(
      () => createMock2DContext() as never,
    );
    const matEx = INITIAL_EXERCISES.find((ex) => ex.apparatus === 'mat')!;
    usePilatesStore.setState({
      activeApparatus: 'mat',
      activeLevel: '2.0',
      activeSteps: [
        {
          stepId: 'step-3d-edit-1',
          order: 1,
          blockCategory: matEx.blockCategory,
          exerciseId: matEx.id,
          durationMin: 3,
          selectedLayer: 'standard',
          explanationSec: 20,
          transitionSec: 10,
        },
      ],
    });

    render(
      <SequenceStudioWorkbench
        onOpenYouTubePreview={vi.fn()}
        onOpenClipper={vi.fn()}
        onOpenLogModal={vi.fn()}
        onOpenInventory={vi.fn()}
        onStartClass={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: `${matEx.nameKo} 시간과 메모 편집` }));
    const dialog = screen.getByRole('dialog', { name: matEx.nameKo });
    const disclosure = within(dialog).getByTestId(
      'step-editor-3d-disclosure',
    ) as HTMLDetailsElement;
    disclosure.open = true;
    fireEvent(disclosure, new Event('toggle'));

    await waitFor(() =>
      expect(within(dialog).getByTestId('studio-interactive-3d-viewport')).toBeVisible(),
    );

    fireEvent.change(within(dialog).getByLabelText('맞춤 스프링 · 선택'), {
      target: { value: '1B 1Y' },
    });
    fireEvent.click(within(dialog).getByRole('button', { name: '변경 적용' }));

    expect(usePilatesStore.getState().activeSteps[0]?.customSpringOverride).toBe('1B 1Y');
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
