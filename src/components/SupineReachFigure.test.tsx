import { cleanup, render } from '@testing-library/react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SupineReachFigure } from './SupineReachFigure';
import { SUPINE_REACH_MODEL_VERSION } from '../models/supineReach';

const parse = (markup: string) => new DOMParser().parseFromString(markup, 'text/html');
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('SupineReachFigure original SVG', () => {
  it('server-renders unique accessible IDs, scope and honest review metadata with no media', () => {
    const document = parse(
      renderToStaticMarkup(
        <>
          <SupineReachFigure progress={0.27} label="사용자 지정 표제" />
          <SupineReachFigure
            progress={0.73}
            activeSide="right"
            mirrored
            className="figure-example"
          />
        </>,
      ),
    );
    const figures = [...document.querySelectorAll('svg')];
    expect(figures).toHaveLength(2);
    const ids = [...document.querySelectorAll('[id]')].map((element) => element.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(figures[0].querySelector('title')?.textContent).toBe('사용자 지정 표제');
    expect(figures[1].getAttribute('class')).toBe('figure-example');
    for (const svg of figures) {
      expect(svg.getAttribute('role')).toBe('img');
      expect(svg.getAttribute('viewBox')).toBe('0 0 640 360');
      expect(svg.querySelector('text')).toBeNull();
      const labelledBy = svg.getAttribute('aria-labelledby')?.split(/\s+/) ?? [];
      expect(labelledBy).toHaveLength(1);
      for (const id of labelledBy)
        expect(document.getElementById(id)?.textContent?.trim().length).toBeGreaterThan(0);
      expect(
        document.getElementById(svg.getAttribute('aria-describedby') ?? '')?.tagName.toLowerCase(),
      ).toBe('desc');
      expect(svg.getAttribute('data-motion-family')).toBe('supine-reach');
      expect(svg.getAttribute('data-variant-id')).toBe('supine-single-leg-reach-v1');
      expect(svg.getAttribute('data-model-version')).toBe(SUPINE_REACH_MODEL_VERSION);
      expect(svg.getAttribute('data-playback-owner')).toBe('parent');
      expect(svg.getAttribute('data-scope')).toBe('one-sided-extension-return-subset');
      expect(svg.getAttribute('data-exact-asset-ready')).toBe('false');
      expect(svg.getAttribute('data-exact-source-variant-matched')).toBe('false');
      expect(svg.getAttribute('data-professional-review-count')).toBe('0');
      const description = svg.querySelector('desc')?.textContent?.replace(/\s+/g, ' ');
      expect(description).toContain(
        '표제 범위: 한쪽 다리를 뻗고 같은 다리를 되돌리는 부분만 표시합니다.',
      );
      expect(description).toContain('한쪽 다리 뻗기 패턴에서 파생한 저작 변형');
      expect(description).toContain('반대 다리와 양손을 고정한 채 같은 다리를 되돌리는 구성');
      expect(description).toContain('출처의 연속 구간을 그대로 재현한 것이 아닙니다');
      expect(description).toContain('머리와 가슴은 준비부터 마무리까지 이미 든 상태');
      expect(description).toContain(
        '모든 몸 경로·접점·수치 각도·시간은 저작자가 선택했으며 검증되지',
      );
      expect(description).toContain('압력 측정, 안전성·개인 적합성 평가');
      expect(description).toContain('출처 자산과의 정확한 일치 또는 전문가');
      expect(description).toContain('다리 교대, 손 옮기기');
      expect(description).toContain('출처와 정확히 일치하는 변형은 확인하지 않았습니다');
      expect(
        svg.querySelector(
          'image, video, audio, foreignObject, iframe, script, animate, animateTransform',
        ),
      ).toBeNull();
      expect(svg.outerHTML).not.toMatch(/https?:\/\/|data:image|support.leg/i);
      for (const path of svg.querySelectorAll('[marker-end]')) {
        const markerId = path.getAttribute('marker-end')?.slice(5, -1) ?? '';
        expect(svg.querySelector('marker')?.id).toBe(markerId);
      }
    }
  });

  it('keeps anatomical left solid and right dashed independently of selected side or reflection', () => {
    for (const activeSide of ['left', 'right'] as const) {
      for (const mirrored of [false, true]) {
        const document = parse(
          renderToStaticMarkup(
            <SupineReachFigure progress={0.27} activeSide={activeSide} mirrored={mirrored} />,
          ),
        );
        const svg = document.querySelector('svg')!;
        const retainedSide = activeSide === 'left' ? 'right' : 'left';
        expect(svg.getAttribute('data-active-side')).toBe(activeSide);
        expect(svg.getAttribute('data-retained-side')).toBe(retainedSide);
        expect(svg.getAttribute('data-view-mirrored')).toBe(String(mirrored));
        for (const element of svg.querySelectorAll('[data-anatomical-line="left"]'))
          expect(element.hasAttribute('stroke-dasharray')).toBe(false);
        for (const element of svg.querySelectorAll('[data-anatomical-line="right"]'))
          expect(element.getAttribute('stroke-dasharray')).toBe('7 4');
        const activeLeg = svg.querySelector('[data-limb-role="active"]')!;
        expect(activeLeg.getAttribute('data-anatomical-side')).toBe(activeSide);
        const outlines = activeLeg.querySelectorAll('[data-active-outline="double"]');
        expect(outlines).toHaveLength(1);
        expect(outlines[0].getAttribute('d')).toBe(
          activeLeg.querySelector('[data-anatomical-line]')?.getAttribute('d'),
        );
        expect(svg.querySelectorAll('[data-active-outline="double"]')).toHaveLength(1);
        expect(svg.querySelector('[data-limb-role="retained"] [data-active-outline]')).toBeNull();
        const description = svg.querySelector('desc')?.textContent?.replace(/\s+/g, ' ');
        expect(description).toContain(
          `선택한 해부학적 ${activeSide === 'left' ? '왼쪽' : '오른쪽'} 다리가 움직이고`,
        );
        expect(description).toContain(
          `해부학적 ${retainedSide === 'left' ? '왼쪽' : '오른쪽'} 무릎은 테이블톱 배치`,
        );
        expect(description).toContain('두 겹 윤곽은 색상과 관계없이 선택한 다리를 구분');
        expect(
          svg.querySelector('[data-limb-role="retained"]')?.getAttribute('data-anatomical-side'),
        ).toBe(retainedSide);
        const hands = [...svg.querySelectorAll('[data-hand-contact="retained-knee-top"]')];
        expect(hands).toHaveLength(2);
        expect(hands.every((hand) => hand.getAttribute('data-target-side') === retainedSide)).toBe(
          true,
        );
        const matPatches = [
          ...svg.querySelectorAll('[data-contact-id][data-contact-surface="mat"]'),
        ];
        expect(matPatches.map((patch) => patch.getAttribute('data-contact-id'))).toEqual([
          'pelvis-mat-authored',
          'lower-trunk-mat-authored',
        ]);
        expect(
          svg.querySelectorAll('[data-contact-id][data-contact-surface="retained-knee"]'),
        ).toHaveLength(2);
        expect(
          svg
            .querySelector('[data-body-part="already-raised-head"]')
            ?.getAttribute('data-mat-support'),
        ).toBe('none');
        expect(svg.querySelectorAll('[data-limb-role][data-mat-support="none"]')).toHaveLength(2);
      }
    }
  });

  it('shows a model-derived path in every phase and direction only for extension and return', () => {
    for (const [progress, phase, direction] of [
      [0, 'setup', null],
      [0.27, 'move', 'extension'],
      [0.5, 'turn', null],
      [0.73, 'return', 'return'],
      [1, 'finish', null],
    ] as const) {
      const document = parse(renderToStaticMarkup(<SupineReachFigure progress={progress} />));
      const svg = document.querySelector('svg')!;
      expect(svg.getAttribute('data-phase')).toBe(phase);
      expect(svg.querySelector('text')).toBeNull();
      const trajectory = svg.querySelector('[data-trajectory="active-ankle"]');
      expect(trajectory?.getAttribute('data-geometry-basis')).toBe('model-derived');
      expect(trajectory?.getAttribute('d')).toMatch(/^M .+L /);
      const arrow = svg.querySelector('[data-motion-direction]');
      if (direction) {
        expect(arrow?.getAttribute('data-motion-direction')).toBe(direction);
        expect(arrow?.getAttribute('marker-end')).toBeTruthy();
      } else {
        expect(arrow).toBeNull();
        expect(svg.querySelector('[marker-end]')).toBeNull();
      }
    }
  });

  it('stays paused under elapsed time and updates only when parent progress changes', () => {
    vi.useFakeTimers();
    const { container, rerender } = render(<SupineReachFigure progress={0.27} />);
    const initial = container.innerHTML;
    expect(vi.getTimerCount()).toBe(0);
    vi.advanceTimersByTime(60_000);
    expect(container.innerHTML).toBe(initial);
    rerender(<SupineReachFigure progress={0.5} />);
    expect(container.querySelector('svg')?.getAttribute('data-phase')).toBe('turn');
    expect(container.innerHTML).not.toBe(initial);
    expect(vi.getTimerCount()).toBe(0);
  });
});
