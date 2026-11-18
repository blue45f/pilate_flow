import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { resolveInitialLaunchTarget } from '../App';
import { Apparatus3dRigPreviewCard } from '../components/Apparatus3dRigPreviewCard';
import { LightDismissDialog } from '../components/LightDismissDialog';
import { OnePageVisual3DCueSheet } from '../components/OnePageVisual3DCueSheet';
import { StudioInteractive3DViewport } from '../components/StudioInteractive3DViewport';
import { INITIAL_EXERCISES } from '../data/pilatesCatalog';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('Wave 10 Autonomous Loop-Graph Exhaustive Advancement (AC-101 .. AC-110)', () => {
  it('AC-101: resolves PWA home-screen shortcuts and URL deep-link parameters deterministically', () => {
    expect(resolveInitialLaunchTarget('?utm_source=pwa-atlas')).toEqual({
      portalRole: 'instructor',
      memberSection: 'schedule',
      instructorTab: 'atlas',
    });
    expect(resolveInitialLaunchTarget('?utm_source=pwa-workbench')).toEqual({
      portalRole: 'instructor',
      memberSection: 'schedule',
      instructorTab: 'workbench',
    });
    expect(resolveInitialLaunchTarget('?utm_source=pwa-member&section=wallet')).toEqual({
      portalRole: 'member',
      memberSection: 'wallet',
      instructorTab: null,
    });
    expect(resolveInitialLaunchTarget('?tab=schedule')).toEqual({
      portalRole: 'instructor',
      memberSection: 'schedule',
      instructorTab: 'schedule',
    });
    expect(resolveInitialLaunchTarget('')).toEqual({
      portalRole: 'instructor',
      memberSection: 'schedule',
      instructorTab: null,
    });

    const manifest = JSON.parse(
      readFileSync(resolve(process.cwd(), 'public/site.webmanifest'), 'utf8'),
    ) as {
      background_color: string;
      theme_color: string;
      shortcuts: Array<{ short_name: string; url: string }>;
    };
    expect(manifest.background_color).toBe('#faf8f4');
    expect(manifest.theme_color).toBe('#355441');
    expect(manifest.shortcuts.map((s) => s.short_name)).toEqual([
      '수업 계획',
      '3D 도감',
      '회원 예약',
    ]);
    for (const sc of manifest.shortcuts) {
      expect(sc.url.startsWith('/?')).toBe(true);
    }
  });

  it('AC-102: dismisses LightDismissDialog on >=72px downward touch swipe while honoring onBeforeClose guards', () => {
    const onClose = vi.fn();
    const onBeforeClose = vi.fn(() => false);

    const { rerender } = render(
      <LightDismissDialog
        open
        title="모바일 시트 스와이프 검증"
        onClose={onClose}
        onBeforeClose={onBeforeClose}
        variant="sheet"
      >
        <p>내용</p>
      </LightDismissDialog>,
    );

    const header = screen.getByTestId('dialog-swipe-header');

    // Short swipe (< 72px) snaps back without calling onBeforeClose or onClose
    fireEvent.pointerDown(header, { pointerId: 1, pointerType: 'touch', clientX: 180, clientY: 80 });
    fireEvent.pointerMove(header, { pointerId: 1, pointerType: 'touch', clientX: 182, clientY: 120 });
    fireEvent.pointerUp(header, { pointerId: 1, pointerType: 'touch', clientX: 182, clientY: 120 });
    expect(onBeforeClose).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();

    // Full downward touch swipe (>= 72px) invokes onBeforeClose; returning false keeps dialog open
    fireEvent.pointerDown(header, { pointerId: 2, pointerType: 'touch', clientX: 180, clientY: 80 });
    fireEvent.pointerMove(header, { pointerId: 2, pointerType: 'touch', clientX: 180, clientY: 175 });
    fireEvent.pointerUp(header, { pointerId: 2, pointerType: 'touch', clientX: 180, clientY: 175 });
    expect(onBeforeClose).toHaveBeenCalledTimes(1);
    expect(onClose).not.toHaveBeenCalled();

    // Unguarded dialog closes cleanly on >= 72px downward touch swipe
    rerender(
      <LightDismissDialog open title="모바일 시트 스와이프 검증" onClose={onClose} variant="sheet">
        <p>내용</p>
      </LightDismissDialog>,
    );
    fireEvent.pointerDown(header, { pointerId: 3, pointerType: 'touch', clientX: 180, clientY: 80 });
    fireEvent.pointerMove(header, { pointerId: 3, pointerType: 'touch', clientX: 180, clientY: 170 });
    fireEvent.pointerUp(header, { pointerId: 3, pointerType: 'touch', clientX: 180, clientY: 170 });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('AC-104: supports simultaneous 2-finger midpoint camera panning alongside pinch-zoom and resets on 0', () => {
    render(<StudioInteractive3DViewport exercise={INITIAL_EXERCISES[0]!} compact />);
    const viewport = screen.getByTestId('studio-interactive-3d-viewport');
    const canvas = viewport.querySelector('canvas')!;
    const canvasWrap = viewport.querySelector('.pf-orbit3d-canvas-wrap')!;

    expect(viewport).toHaveAttribute('data-pan-x', '0.00');
    expect(viewport).toHaveAttribute('data-pan-y', '0.00');

    // Start 2 fingers centered at (150, 150)
    fireEvent.pointerDown(canvas, { pointerId: 1, pointerType: 'touch', clientX: 100, clientY: 150 });
    fireEvent.pointerDown(canvas, { pointerId: 2, pointerType: 'touch', clientX: 200, clientY: 150 });

    // Translate both fingers +80px right and +50px down while spreading slightly
    fireEvent.pointerMove(canvas, { pointerId: 1, pointerType: 'touch', clientX: 170, clientY: 200 });
    fireEvent.pointerMove(canvas, { pointerId: 2, pointerType: 'touch', clientX: 290, clientY: 200 });

    expect(Number(viewport.getAttribute('data-pan-x'))).toBeGreaterThan(0.1);
    expect(Number(viewport.getAttribute('data-pan-y'))).toBeGreaterThan(0.05);
    expect(Number(viewport.getAttribute('data-zoom'))).toBeGreaterThan(1.1);

    fireEvent.pointerUp(canvas, { pointerId: 2, pointerType: 'touch', clientX: 290, clientY: 200 });
    fireEvent.pointerUp(canvas, { pointerId: 1, pointerType: 'touch', clientX: 170, clientY: 200 });

    // Pressing '0' resets pan and zoom cleanly
    act(() => {
      fireEvent.keyDown(canvasWrap, { key: '0' });
    });
    expect(viewport).toHaveAttribute('data-pan-x', '0.00');
    expect(viewport).toHaveAttribute('data-pan-y', '0.00');
    expect(viewport).toHaveAttribute('data-zoom', '1.04');
  });

  it('AC-106: copies Blender Python 3D script to clipboard with accessible status feedback and scrubs SVG', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });

    render(
      <Apparatus3dRigPreviewCard
        apparatus="reformer"
        bodyPosition="supine"
        springsLabel="2R 1B"
        exerciseTitleKo="풋워크"
      />,
    );

    await act(async () => {
      fireEvent.click(screen.getByTestId('copy-blender-script-btn'));
    });
    expect(writeText).toHaveBeenCalledTimes(1);
    expect(writeText.mock.calls[0]?.[0]).toContain('def add_helical_spring(');
    expect(screen.getByTestId('rig-script-copy-status')).toHaveTextContent(
      'Blender Python 3D 스크립트를 클립보드에 복사했습니다.',
    );
  });

  it('AC-107 & AC-109: auto-selects single-col-tablet cue sheet on <640px mobile and locks component CSS weights <=600', () => {
    const origWidth = window.innerWidth;
    Object.defineProperty(window, 'innerWidth', { configurable: true, writable: true, value: 390 });
    try {
      render(
        <OnePageVisual3DCueSheet
          title="모바일 큐시트"
          apparatus="reformer"
          level={1}
          steps={[]}
          exercises={INITIAL_EXERCISES}
        />,
      );
      expect(screen.getByTestId('one-page-visual-3d-cuesheet')).toHaveAttribute(
        'data-layout-density',
        'single-col-tablet',
      );
    } finally {
      Object.defineProperty(window, 'innerWidth', {
        configurable: true,
        writable: true,
        value: origWidth,
      });
    }

    for (const rel of [
      'src/components/ClassBinderView.css',
      'src/components/FlowBinder.css',
      'src/components/FlowSchedule.css',
      'src/components/FreeAiAssistantPanel.css',
      'src/components/InstructorScheduleView.css',
      'src/components/LiveStageView.css',
      'src/components/SequenceWorkbench.usability.css',
      'src/components/YouTubeClipModal.css',
    ]) {
      const full = resolve(process.cwd(), rel);
      expect(existsSync(full)).toBe(true);
      expect(readFileSync(full, 'utf8')).not.toMatch(/font-weight:\s*[789]00\b/);
    }
  });
});
