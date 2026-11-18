import { existsSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { act, cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { MemberBookingView } from '../components/MemberBookingView';
import { StudioOffline3dReadinessCard } from '../components/StudioOffline3dReadinessCard';

afterEach(() => {
  cleanup();
});

describe('Atelier Unslop 9-Pass, Blender 3D Reformer Showcase & Korean Typography Hygiene', () => {
  it('renders the Blender-modeled 3D Reformer studio showcase and 6px spring keycaps inside StudioOffline3dReadinessCard', async () => {
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

    for (const code of ['2R', '1B', '1G', '1Y']) {
      expect(within(showcase).getByText(code)).toBeVisible();
    }

    const progress = within(card).getByRole('progressbar', {
      name: '오프라인 3D 모션 캐시 진행률',
    });
    expect(progress).toHaveAttribute('aria-valuemin', '0');
    expect(card).toHaveTextContent('현장 오프라인 · 72컷 3D 모션 미리 보관');
  });

  it('keeps MemberBookingView free of inline letter-spacing overrides and raw hex colors on headings and wallet ring', () => {
    const { container } = render(<MemberBookingView />);
    const eyebrows = Array.from(container.querySelectorAll('.eyebrow'));
    expect(eyebrows.length).toBeGreaterThan(0);
    for (const el of eyebrows) {
      expect(el.getAttribute('style') ?? '').not.toContain('letter-spacing');
    }

    const walletHero = container.querySelector('#member-wallet-section');
    expect(walletHero).not.toBeNull();
    expect(walletHero?.querySelector('.pf-member-wallet-ring__progress')).not.toBeNull();
    expect(walletHero?.innerHTML).not.toContain('#ebd3a4');
    expect(walletHero?.innerHTML).not.toContain('#fde68a');
  });
});
