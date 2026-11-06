import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ChestLiftFigure } from '../components/ChestLiftFigure';
import { CHEST_LIFT_PROVENANCE } from '../models/chestLiftProvenance';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
const figure = (progress: number, mirrored = false, activeSide: 'left' | 'right' = 'right') => (
  <ChestLiftFigure
    draftId="supine-chest-lift"
    progress={progress}
    activeSide={activeSide}
    mirrored={mirrored}
  />
);
const geometry = (svg: HTMLElement) =>
  [...svg.querySelectorAll('path,polyline,polygon,circle,line,ellipse')]
    .map((node) =>
      [
        node.tagName,
        ...[...node.attributes]
          .filter((attribute) =>
            [
              'd',
              'points',
              'cx',
              'cy',
              'r',
              'rx',
              'ry',
              'x1',
              'x2',
              'y1',
              'y2',
              'transform',
            ].includes(attribute.name),
          )
          .map((attribute) => `${attribute.name}=${attribute.value}`),
      ].join(':'),
    )
    .join('|');

describe('independent Chest Lift native SVG', () => {
  it('moves real trunk, head and arms while retaining the exact endpoint and explicit hold geometries', () => {
    const view = render(figure(0));
    const start = geometry(screen.getByRole('img'));
    const at = (progress: number) => {
      view.rerender(figure(progress));
      return screen.getByRole('img');
    };
    expect(geometry(at(0.06))).toBe(start);
    const trunkStart = screen
      .getByRole('img')
      .querySelector('[data-spine-chain]')!
      .getAttribute('d');
    const armStart = screen
      .getByRole('img')
      .querySelector('[data-hand-support] path')!
      .getAttribute('d');
    const headStart = screen
      .getByRole('img')
      .querySelector('[data-body-part="independent-head-neck"] polygon')!
      .getAttribute('points');
    const moving = geometry(at(0.27));
    expect(moving).not.toBe(start);
    expect(screen.getByRole('img').querySelector('[data-spine-chain]')!.getAttribute('d')).not.toBe(
      trunkStart,
    );
    expect(
      screen.getByRole('img').querySelector('[data-hand-support] path')!.getAttribute('d'),
    ).not.toBe(armStart);
    expect(
      screen
        .getByRole('img')
        .querySelector('[data-body-part="independent-head-neck"] polygon')!
        .getAttribute('points'),
    ).not.toBe(headStart);
    const peak = geometry(at(0.5));
    expect(geometry(at(0.55))).toBe(peak);
    expect(geometry(at(0.73))).not.toBe(peak);
    expect(geometry(at(1))).toBe(start);
    expect(screen.getByRole('img')).toHaveAttribute('data-progress', '1');
    expect(
      screen.getByRole('img').querySelectorAll('[data-scapular-contact="grounded"]'),
    ).toHaveLength(2);
    at(0.5);
    expect(
      screen.getByRole('img').querySelectorAll('[data-scapular-contact="released"]'),
    ).toHaveLength(2);
  });

  it('keeps bilateral anatomy independent of selected side and mirrors only the drawing', () => {
    const view = render(figure(0.5, false, 'left'));
    const left = geometry(screen.getByRole('img'));
    view.rerender(figure(0.5, false, 'right'));
    expect(geometry(screen.getByRole('img'))).toBe(left);
    expect(screen.getByRole('img')).toHaveAttribute('data-side-mode', 'bilateral');
    view.rerender(figure(0.5, true, 'right'));
    expect(geometry(screen.getByRole('img'))).not.toBe(left);
    expect(screen.getByRole('img')).toHaveAttribute('data-active-side', 'right');
    expect(screen.getByRole('img')).toHaveAttribute('data-view-mirrored', 'true');
    expect(
      screen.getByRole('img').querySelectorAll('[data-contact-patch="occipital-hand"]'),
    ).toHaveLength(2);
    expect(screen.getByRole('img').querySelectorAll('[data-finger-interlace]')).toHaveLength(3);
  });

  it('uses unique accessible names, preserves source uncertainty and adds no media, clocks or writes', () => {
    const fetch = vi.spyOn(globalThis, 'fetch');
    const storage = vi.spyOn(Storage.prototype, 'setItem');
    const raf = vi.fn();
    vi.stubGlobal('requestAnimationFrame', raf);
    const timer = vi.spyOn(window, 'setInterval');
    render(
      <>
        {figure(0)}
        <ChestLiftFigure draftId="supine-chest-lift" progress={0.5} label="사용자 지정 검토 도해" />
      </>,
    );
    const images = screen.getAllByRole('img');
    expect(images[0]).toHaveAccessibleName(/체스트 리프트/);
    expect(images[1]).toHaveAccessibleName(/사용자 지정 검토 도해/);
    expect(images[0].getAttribute('aria-labelledby')).not.toBe(
      images[1].getAttribute('aria-labelledby'),
    );
    expect(images[0]).toHaveAttribute('data-source-feet-flat-established', 'false');
    expect(images[0]).toHaveAttribute('data-source-pelvis-fixed-established', 'false');
    expect(images[0]).toHaveAttribute('data-exact-asset-ready', 'false');
    expect(images[0].querySelector('desc')).toHaveTextContent(
      /발바닥 접촉과 골반 고정은 원문에서 확인되지/,
    );
    expect(document.querySelector('img,image,video,iframe,foreignObject')).toBeNull();
    expect(fetch).not.toHaveBeenCalled();
    expect(storage).not.toHaveBeenCalled();
    expect(raf).not.toHaveBeenCalled();
    expect(timer).not.toHaveBeenCalled();
  });

  it('keeps factual-record hash scope, attribution and canonical-unmapped status explicit', () => {
    expect(CHEST_LIFT_PROVENANCE.authoredDraftId).toBe('supine-chest-lift');
    expect(CHEST_LIFT_PROVENANCE.ledgerPatternId).toBe('mat-chest-lift');
    expect(CHEST_LIFT_PROVENANCE.canonicalAssetStatus).toBe('not_authored');
    expect(CHEST_LIFT_PROVENANCE.canonicalAssetId).toBeNull();
    expect(CHEST_LIFT_PROVENANCE.factualRecordSha256).toBe(
      '30322df79e4cc20e602afd0c3107ccac5eb790d3f840da2de04f1176638cdfae',
    );
    expect(CHEST_LIFT_PROVENANCE.factualRecordHashScope).toContain('factualRecord only');
    expect(CHEST_LIFT_PROVENANCE.articleBylineObserved).toContain('CJ Kelly');
    expect(CHEST_LIFT_PROVENANCE.footerAuthorLabelObserved).toBe('By SecoSan');
    expect(CHEST_LIFT_PROVENANCE.independentCredentialVerificationCount).toBe(0);
    expect(CHEST_LIFT_PROVENANCE.feetFlatSourceEstablished).toBe(false);
    expect(CHEST_LIFT_PROVENANCE.fullPelvisFixationSourceEstablished).toBe(false);
    expect(CHEST_LIFT_PROVENANCE.exactSourceVariantMatched).toBe(false);
    expect(CHEST_LIFT_PROVENANCE.professionalReviewCount).toBe(0);
    expect(CHEST_LIFT_PROVENANCE.approvedCatalogMappings).toBe(0);
    expect(CHEST_LIFT_PROVENANCE.autoRecommendationEligible).toBe(false);
    expect(Object.isFrozen(CHEST_LIFT_PROVENANCE)).toBe(true);
  });
});
