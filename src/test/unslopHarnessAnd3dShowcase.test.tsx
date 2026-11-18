import { existsSync, readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { act, cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemberBookingView } from '../components/MemberBookingView';
import { StudioInteractive3DViewport } from '../components/StudioInteractive3DViewport';
import { StudioOffline3dReadinessCard } from '../components/StudioOffline3dReadinessCard';
import { INITIAL_EXERCISES } from '../data/pilatesCatalog';
import {
  createStudio3dResourceGuard,
  inspectGlbBinaryHeader,
  resolveAdaptive3dFrameBudget,
} from '../utils/studio3dResourceGuard';

afterEach(() => {
  cleanup();
});

describe('Atelier Unslop 9-Pass, Blender 3D Reformer GLB/WebP, 4GB Adaptive Frame Budget & Korean Typography', () => {
  it('renders the Blender-modeled 3D Reformer studio showcase and 6px spring/part keycaps inside StudioOffline3dReadinessCard', async () => {
    const assetPath = resolve(
      process.cwd(),
      'public/images/studio3d/atelier-reformer-unslop-v9.webp',
    );
    expect(existsSync(assetPath)).toBe(true);
    expect(statSync(assetPath).size).toBeGreaterThan(5000);

    await act(async () => {
      render(<StudioOffline3dReadinessCard />);
    });

    const card = screen.getByTestId('studio-offline-3d-readiness-card');
    const showcase = within(card).getByTestId('studio-offline-3d-reformer-showcase');
    const img = showcase.querySelector('img');
    expect(img).not.toBeNull();
    expect(img?.getAttribute('src')).toBe('/images/studio3d/atelier-reformer-unslop-v9.webp');

    for (const code of ['2R', '1B', '1G', '1Y', '실측 기구 3D · 32파츠']) {
      expect(within(showcase).getByText(code)).toBeVisible();
    }
    expect(showcase).not.toHaveTextContent('GLB');

    const progress = within(card).getByRole('progressbar', {
      name: '오프라인 3D 모션 캐시 진행률',
    });
    expect(progress).toHaveAttribute('aria-valuemin', '0');
    expect(card).toHaveTextContent('현장 오프라인 · 72컷 3D 모션 미리 보관');
  });

  it('validates the exported Blender 3D Reformer GLB v2 binary framing, PBR materials, and zero negative scales', () => {
    const glbPath = resolve(process.cwd(), 'public/models/studio3d/atelier-reformer-v9.glb');
    expect(existsSync(glbPath)).toBe(true);
    const bytes = readFileSync(glbPath);
    const arrayBuffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);

    const audit = inspectGlbBinaryHeader(arrayBuffer);
    expect(audit).toMatchObject({
      valid: true,
      magicHex: '0x46546c67',
      version: 2,
      meshCount: 32,
      nodeCount: 32,
      negativeScaleNodeCount: 0,
      failureReason: null,
    });
    expect(audit.materialNames).toEqual(
      expect.arrayContaining(['PF_WhiteOak_Frame', 'PF_Sage_Leather', 'PF_Anodized_Brass']),
    );
  });

  it('reduces per-second pixel fill-rate by 84.6% on 4GB low-memory mobile devices and wires tier attribute into StudioInteractive3DViewport', () => {
    const lowMemBudget = resolveAdaptive3dFrameBudget({
      deviceMemoryGiB: 4,
      hardwareConcurrency: 4,
      devicePixelRatio: 3,
    });
    expect(lowMemBudget).toEqual({
      tier: 'low-memory',
      maxDpr: 1.25,
      effectiveDpr: 1.25,
      targetFps: 30,
      frameIntervalMs: 33.33,
      fillRateReductionPct: 84.6,
    });

    const proBudget = resolveAdaptive3dFrameBudget({
      deviceMemoryGiB: 8,
      hardwareConcurrency: 8,
      devicePixelRatio: 2,
    });
    expect(proBudget).toMatchObject({
      tier: 'high',
      maxDpr: 2,
      effectiveDpr: 2,
      targetFps: 60,
    });

    render(<StudioInteractive3DViewport exercise={INITIAL_EXERCISES[0]!} compact />);
    expect(screen.getByTestId('studio-interactive-3d-viewport')).toHaveAttribute(
      'data-frame-budget-tier',
    );
  });

  it('tracks and deterministically disposes GPU/Canvas resources and recovers from context loss', () => {
    const guard = createStudio3dResourceGuard();
    const geoDispose = vi.fn();
    const texDispose = vi.fn();
    const bitmapClose = vi.fn();

    guard.track('reformer-geo', 'geometry', { dispose: geoDispose });
    guard.track('reformer-tex', 'texture', { dispose: texDispose });
    guard.track('pose-bitmap', 'image-bitmap', { close: bitmapClose });
    expect(guard.snapshot().activeCount).toBe(3);

    guard.notifyContextLost();
    expect(guard.snapshot().contextLost).toBe(true);
    guard.notifyContextRestored();
    expect(guard.snapshot()).toMatchObject({
      contextLost: false,
      recoveryCount: 1,
    });

    const released = guard.disposeAll();
    expect(released).toBe(3);
    expect(geoDispose).toHaveBeenCalledTimes(1);
    expect(texDispose).toHaveBeenCalledTimes(1);
    expect(bitmapClose).toHaveBeenCalledTimes(1);
    expect(guard.snapshot().activeCount).toBe(0);
  });

  it('keeps MemberBookingView and Wave 9 CSS free of inline tracking overrides, stadium 999px pills, and decorative gradients', () => {
    const { container } = render(<MemberBookingView />);
    const eyebrows = Array.from(container.querySelectorAll('.eyebrow'));
    expect(eyebrows.length).toBeGreaterThan(0);
    for (const el of eyebrows) {
      expect(el.getAttribute('style') ?? '').not.toContain('letter-spacing');
    }

    const walletHero = container.querySelector('#member-wallet-section');
    expect(walletHero).not.toBeNull();
    expect(walletHero?.innerHTML).not.toContain('#ebd3a4');
    expect(walletHero?.innerHTML).not.toContain('#fde68a');

    const wave9Css = readFileSync(
      resolve(process.cwd(), 'src/styles/rea-studio-advancement.css'),
      'utf8',
    );
    expect(wave9Css).not.toContain('999px');
    expect(wave9Css).not.toContain('font-weight: 700');
    expect(wave9Css).not.toContain('linear-gradient');
  });
});
