import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { StudioInteractive3DViewport } from '../components/StudioInteractive3DViewport';
import { INITIAL_EXERCISES } from '../data/pilatesCatalog';
import { generateBlenderApparatusSceneScript } from '../utils/blenderSceneScriptExporter';
import { inspectGlbBinaryHeader } from '../utils/studio3dResourceGuard';

afterEach(() => {
  cleanup();
});

describe('Loop-Engineered Mobile/Responsive Ergonomics & High-Precision 3D Viewport Contracts', () => {
  it('supports 2-finger pinch-to-zoom, clamping [0.68, 1.85], and seamless 2->1 finger orbit handoff', () => {
    render(<StudioInteractive3DViewport exercise={INITIAL_EXERCISES[0]!} compact />);
    const viewport = screen.getByTestId('studio-interactive-3d-viewport');
    const canvas = viewport.querySelector('canvas');
    expect(canvas).not.toBeNull();
    expect(viewport).toHaveAttribute('data-zoom', '1.04');

    fireEvent.pointerDown(canvas!, {
      pointerId: 1,
      pointerType: 'touch',
      clientX: 120,
      clientY: 160,
    });
    fireEvent.pointerDown(canvas!, {
      pointerId: 2,
      pointerType: 'touch',
      clientX: 220,
      clientY: 160,
    });

    // Spread fingers from 100px -> 145px (~1.51x pinch zoom)
    fireEvent.pointerMove(canvas!, {
      pointerId: 2,
      pointerType: 'touch',
      clientX: 265,
      clientY: 160,
    });
    const zoomedVal = Number(viewport.getAttribute('data-zoom'));
    expect(zoomedVal).toBeGreaterThan(1.4);
    expect(zoomedVal).toBeLessThanOrEqual(1.85);

    // Extreme spread clamps cleanly at 1.85x
    fireEvent.pointerMove(canvas!, {
      pointerId: 2,
      pointerType: 'touch',
      clientX: 520,
      clientY: 160,
    });
    expect(viewport).toHaveAttribute('data-zoom', '1.85');

    // Lift second finger -> remaining first finger continues smooth 1-finger orbit without jump
    const yawBeforeHandoff = Number(viewport.getAttribute('data-yaw-deg'));
    fireEvent.pointerUp(canvas!, {
      pointerId: 2,
      pointerType: 'touch',
      clientX: 520,
      clientY: 160,
    });
    fireEvent.pointerMove(canvas!, {
      pointerId: 1,
      pointerType: 'touch',
      clientX: 150,
      clientY: 160,
    });
    const yawAfterHandoff = Number(viewport.getAttribute('data-yaw-deg'));
    expect(yawAfterHandoff).toBeGreaterThan(yawBeforeHandoff);
    fireEvent.pointerUp(canvas!, {
      pointerId: 1,
      pointerType: 'touch',
      clientX: 150,
      clientY: 160,
    });
  });

  it('supports Shift+Arrow keyboard camera orbit, +/-/0 zoom shortcuts, and plain ArrowRight 5% motion step', () => {
    render(<StudioInteractive3DViewport exercise={INITIAL_EXERCISES[0]!} compact />);
    const viewport = screen.getByTestId('studio-interactive-3d-viewport');
    const canvasWrap = viewport.querySelector('.pf-orbit3d-canvas-wrap');
    expect(canvasWrap).not.toBeNull();
    const slider = screen.getByRole('slider', { name: '3D 동작 진행 구간 스크러버' });

    // Plain ArrowRight advances motion phase 0 -> 5 without altering camera yaw
    expect(slider).toHaveValue('0');
    fireEvent.keyDown(canvasWrap!, { key: 'ArrowRight' });
    expect(slider).toHaveValue('5');
    expect(viewport).toHaveAttribute('data-yaw-deg', '-34');

    // Shift+ArrowRight orbits camera yaw by +12deg while keeping slider at 5
    fireEvent.keyDown(canvasWrap!, { key: 'ArrowRight', shiftKey: true });
    expect(viewport).toHaveAttribute('data-yaw-deg', '-22');
    expect(slider).toHaveValue('5');

    // '+' zooms in, '0' resets camera to active preset (-34 / 21 / 1.04)
    fireEvent.keyDown(canvasWrap!, { key: '+' });
    expect(Number(viewport.getAttribute('data-zoom'))).toBeGreaterThan(1.04);

    act(() => {
      fireEvent.keyDown(canvasWrap!, { key: '0' });
    });
    expect(viewport).toHaveAttribute('data-yaw-deg', '-34');
    expect(viewport).toHaveAttribute('data-pitch-deg', '21');
    expect(viewport).toHaveAttribute('data-zoom', '1.04');
  });

  it('emits true 3D helical spring coils, zero negative scales, and 50mm studio camera in Blender Python export', () => {
    const sample = INITIAL_EXERCISES[0]!;
    const py = generateBlenderApparatusSceneScript({
      exerciseTitleKo: sample.nameKo,
      apparatus: sample.apparatus,
      bodyPosition: sample.bodyPosition,
      springsLabel: sample.springs,
    });
    expect(py).toContain('import bpy');
    expect(py).toContain('def add_helical_spring(');
    expect(py).toContain('abs(dims[0])');
    expect(py).toContain('cam.data.lens = 50.0');
    expect(py).toContain('Apparatus_Carriage');
    expect(py).toContain('Joint_Pelvis');
    expect(py).toContain('keyframe_insert');

    const glbBytes = readFileSync(
      resolve(process.cwd(), 'public/models/studio3d/atelier-reformer-v9.glb'),
    );
    const header = inspectGlbBinaryHeader(
      glbBytes.buffer.slice(glbBytes.byteOffset, glbBytes.byteOffset + glbBytes.byteLength),
    );
    expect(header.valid).toBe(true);
    expect(header.meshCount).toBe(32);
    expect(header.negativeScaleNodeCount).toBe(0);
  });

  it('enforces mobile >= 44px touch targets, >= 16px iOS form inputs, accessible mobile role switcher, and WCAG AA wallet contrast', () => {
    const unslopCss = readFileSync(
      resolve(process.cwd(), 'src/styles/atelier-unslop-system.css'),
      'utf8',
    );
    const motionCss = readFileSync(
      resolve(process.cwd(), 'src/styles/pf-motion-studio.css'),
      'utf8',
    );
    const reaCss = readFileSync(
      resolve(process.cwd(), 'src/styles/rea-studio-advancement.css'),
      'utf8',
    );

    expect(unslopCss).toContain('font-size: 16px !important;');
    expect(unslopCss).toContain('min-height: 44px !important;');
    expect(unslopCss).toContain('.pf-orbit3d-zoom-controls');
    expect(unslopCss).toContain('right: 8px !important;');

    // Mobile role switcher remains accessible on <= 767px and dark/gold wallet slop is removed
    expect(motionCss).toContain('.topbar .pf-role-switcher {\n    display: inline-flex !important;');
    expect(motionCss).not.toContain('background: #1a2c24 !important;');
    expect(motionCss).not.toContain('rgba(235, 211, 164');

    // Strict agent-harness invariants on rea-studio-advancement.css
    expect(reaCss).toContain('word-break: keep-all');
    expect(reaCss).toContain('overflow-wrap: break-word');
    expect(reaCss).toContain('tabular-nums');
    expect(reaCss).not.toContain('999px');
    expect(reaCss).not.toContain('9999px');
    expect(reaCss).not.toContain('font-weight: 700');
    expect(reaCss).not.toContain('linear-gradient(');
  });
});
