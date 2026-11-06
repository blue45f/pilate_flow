import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { SeatedBandRowFigure } from '../components/SeatedBandRowFigure';
import {
  getSeatedBandRowPose,
  projectSeatedBandRowPoint,
  SEATED_BAND_ROW_DRAWING_PARAMETERS,
  SEATED_BAND_ROW_PHASES,
  SEATED_BAND_ROW_PROVENANCE,
} from '../models/seatedBandRow';
import type { SeatedBandRowPose, SeatedBandRowWorld } from '../models/seatedBandRow';
import type { AnatomicalSide, Point3 } from '../models/types';

const sides: readonly AnatomicalSide[] = ['left', 'right'];
const distance = (a: Point3, b: Point3) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
const lengths = (pose: SeatedBandRowPose) =>
  sides.flatMap((side) => {
    const arm = pose.arms[side],
      leg = pose.legs[side];
    return [
      distance(arm.shoulder, arm.elbow),
      distance(arm.elbow, arm.hand),
      distance(leg.hip, leg.knee),
      distance(leg.knee, leg.ankle),
      distance(leg.ankle, leg.heel),
      distance(leg.heel, leg.toe),
    ];
  });

describe('original floor-seated band row: geometric checks are not exercise approval', () => {
  it.each(sides)(
    'preserves bones, support and hand/sole band contacts across 501 samples for %s metadata',
    (activeSide) => {
      const start = getSeatedBandRowPose(0, { activeSide });
      const baseline = lengths(start);
      const movingKeys = new Set(['leftElbow', 'leftHand', 'rightElbow', 'rightHand']);
      let maxBoneError = 0,
        maxContactError = 0,
        maxFixedError = 0,
        maxMirrorError = 0;
      let finite = true;
      for (let sample = 0; sample <= 500; sample++) {
        const p = sample / 500;
        const pose = getSeatedBandRowPose(p, { activeSide });
        const mirrored = getSeatedBandRowPose(p, { activeSide, mirrored: true });
        lengths(pose).forEach((value, index) => {
          maxBoneError = Math.max(maxBoneError, Math.abs(value - baseline[index]));
        });
        for (const key of Object.keys(pose.world) as (keyof SeatedBandRowWorld)[]) {
          const point = pose.world[key];
          finite &&= point.every(Number.isFinite) && pose.screen[key].every(Number.isFinite);
          if (!movingKeys.has(key))
            maxFixedError = Math.max(maxFixedError, distance(point, start.world[key]));
          maxMirrorError = Math.max(
            maxMirrorError,
            distance(point, mirrored.world[key]),
            Math.abs(mirrored.screen[key][0] - (640 - pose.screen[key][0])),
            Math.abs(mirrored.screen[key][1] - pose.screen[key][1]),
          );
        }
        for (const contact of pose.contacts) {
          const expected: Point3 = [
            contact.bodyCenter[0] + contact.surfaceOffset[0],
            contact.bodyCenter[1] + contact.surfaceOffset[1],
            contact.bodyCenter[2] + contact.surfaceOffset[2],
          ];
          maxContactError = Math.max(
            maxContactError,
            distance(contact.point, expected),
            distance(contact.point, contact.targetPoint),
          );
          if (contact.target === 'floor')
            maxContactError = Math.max(
              maxContactError,
              Math.abs(contact.point[2] - pose.floor.topZ),
            );
        }
        for (const side of sides) {
          const arm = pose.arms[side];
          maxBoneError = Math.max(
            maxBoneError,
            Math.abs(
              distance(arm.shoulder, arm.elbow) - SEATED_BAND_ROW_DRAWING_PARAMETERS.upperArmLength,
            ),
            Math.abs(
              distance(arm.elbow, arm.hand) - SEATED_BAND_ROW_DRAWING_PARAMETERS.forearmLength,
            ),
          );
          maxFixedError = Math.max(
            maxFixedError,
            Math.abs(arm.hand[1] - arm.shoulder[1]),
            Math.abs(arm.elbow[1] - arm.shoulder[1]),
          );
          const hand = pose.contacts.find((c) => c.id === `${side}-hand-band-end`)!;
          const sole = pose.contacts.find((c) => c.id === `${side}-sole-band`)!;
          maxContactError = Math.max(
            maxContactError,
            distance(hand.point, arm.hand),
            distance(hand.point, pose.band.points[side === 'left' ? 0 : 3]),
            distance(sole.point, pose.legs[side].solePatch),
            distance(sole.point, pose.band.points[side === 'left' ? 1 : 2]),
            Math.abs(sole.point[0] - SEATED_BAND_ROW_DRAWING_PARAMETERS.solePlaneX),
          );
        }
      }
      expect(finite).toBe(true);
      expect(maxBoneError).toBeLessThan(1e-8);
      expect(maxContactError).toBeLessThan(1e-9);
      expect(maxFixedError).toBeLessThan(1e-9);
      expect(maxMirrorError).toBeLessThan(1e-9);
    },
  );

  it('moves both hands and elbows without an invisible anchor, chair, fixed band length or force claim', () => {
    const start = getSeatedBandRowPose(0),
      peak = getSeatedBandRowPose(0.5);
    for (const side of sides) {
      expect(peak.arms[side].hand[0]).toBeLessThan(start.arms[side].hand[0] - 50);
      expect(distance(start.arms[side].elbow, peak.arms[side].elbow)).toBeGreaterThan(40);
      expect(peak.arms[side].elbow[0]).toBeLessThan(peak.arms[side].shoulder[0]);
      expect(peak.arms[side].role).toBe('bilateral');
      expect(peak.legs[side]).toEqual(start.legs[side]);
    }
    expect(peak.band.points).toHaveLength(4);
    expect(peak.band.segments).toHaveLength(3);
    expect(peak.band.points[1]).toEqual(start.band.points[1]);
    expect(peak.band.points[2]).toEqual(start.band.points[2]);
    expect(peak.band.visualPathLength).toBeGreaterThan(start.band.visualPathLength);
    expect(peak.band.visualPathLength).toBeCloseTo(
      peak.band.segments.reduce((sum, [a, b]) => sum + distance(a, b), 0),
      10,
    );
    expect(peak.band).toMatchObject({
      productConstruction: 'unspecified',
      closedLoopProductClaimed: false,
      force: 'not-modeled',
      restLength: 'not-established',
    });
    expect(peak.contacts).toHaveLength(8);
    expect(new Set(peak.contacts.map((c) => c.id)).size).toBe(8);
    expect(peak.contacts.every((c) => c.evidence === 'authored-contact-patch')).toBe(true);
  });

  it('keeps anatomical identity independent of optional side metadata and screen mirroring', () => {
    const left = getSeatedBandRowPose(0.3, { activeSide: 'left' });
    const right = getSeatedBandRowPose(0.3, { activeSide: 'right' });
    expect(left.activeSide).toBe('left');
    expect(right.activeSide).toBe('right');
    expect(left.world).toEqual(right.world);
    expect(left.band).toEqual(right.band);
    expect(left.contacts).toEqual(right.contacts);
    expect(left.arms.left.anatomicalSide).toBe('left');
    expect(left.arms.right.anatomicalSide).toBe('right');
    for (const part of ['shoulder', 'elbow', 'hand'] as const) {
      expect(left.arms.left[part][0]).toBe(left.arms.right[part][0]);
      expect(left.arms.left[part][2]).toBe(left.arms.right[part][2]);
      expect(left.arms.left[part][1]).toBe(-left.arms.right[part][1]);
    }
    expect(projectSeatedBandRowPoint(left.world.leftHand, true)[0]).toBeCloseTo(
      640 - projectSeatedBandRowPoint(left.world.leftHand, false)[0],
      12,
    );
  });

  it('returns exactly to its initial geometry and exposes explicit metadata for all five phase holds/moves', () => {
    const start = getSeatedBandRowPose(0),
      finish = getSeatedBandRowPose(1);
    expect(finish.world).toEqual(start.world);
    expect(finish.band).toEqual(start.band);
    expect(finish.contacts).toEqual(start.contacts);
    expect(SEATED_BAND_ROW_PHASES.map((p) => p.id)).toEqual([
      'setup',
      'move',
      'turn',
      'return',
      'finish',
    ]);
    expect(SEATED_BAND_ROW_PHASES.map((p) => p.displayBehavior)).toEqual([
      'hold',
      'move',
      'hold',
      'move',
      'hold',
    ]);
    for (const phase of SEATED_BAND_ROW_PHASES) {
      expect(getSeatedBandRowPose(phase.sample).phase.id).toBe(phase.id);
      if (phase.displayBehavior === 'hold') {
        expect(getSeatedBandRowPose(phase.start + 1e-5).world).toEqual(
          getSeatedBandRowPose(phase.end - 1e-5).world,
        );
      } else {
        expect(getSeatedBandRowPose(phase.start + 1e-5).world.leftHand).not.toEqual(
          getSeatedBandRowPose(phase.end - 1e-5).world.leftHand,
        );
      }
    }
    for (let index = 1; index < SEATED_BAND_ROW_PHASES.length; index++) {
      const boundary = SEATED_BAND_ROW_PHASES[index].start;
      expect(
        distance(
          getSeatedBandRowPose(boundary - 1e-6).world.leftHand,
          getSeatedBandRowPose(boundary + 1e-6).world.leftHand,
        ),
      ).toBeLessThan(1e-7);
    }
  });

  it('rejects nonfinite progress and invalid options, clamps finite endpoints and returns independent geometry', () => {
    for (const invalid of [NaN, Infinity, -Infinity])
      expect(() => getSeatedBandRowPose(invalid)).toThrow();
    expect(() => getSeatedBandRowPose(0, { activeSide: 'unknown' as AnatomicalSide })).toThrow();
    expect(() => getSeatedBandRowPose(0, { mirrored: 1 as unknown as boolean })).toThrow();
    expect(getSeatedBandRowPose(-2).world).toEqual(getSeatedBandRowPose(0).world);
    expect(getSeatedBandRowPose(2).world).toEqual(getSeatedBandRowPose(1).world);
    const mutable = getSeatedBandRowPose(0.4);
    (mutable.world.leftHand as [number, number, number])[0] = -999;
    expect(getSeatedBandRowPose(0.4).world.leftHand[0]).not.toBe(-999);
  });

  it('preserves reference-only source identity while every model review and mapping remains unapproved', () => {
    expect(SEATED_BAND_ROW_PROVENANCE).toMatchObject({
      sourceId: 'harvard-floor-seated-band-row-v1',
      sourceCheckedDate: '2026-11-05',
      factualRecordSha256: '3fc44322a735ac2ed6d31947c9177181fcb930172ced2fff7687c43619d85d7a',
      professionalReviewCount: 0,
      approvedCatalogMappings: 0,
      exactAssetCount: 0,
      exactSourceVariantMatched: false,
      sourceVariantReconciliationRequired: true,
      autoRecommendationEligible: false,
    });
    expect(getSeatedBandRowPose(0.5)).toMatchObject({
      draftId: 'floor-seated-band-row',
      intendedComparisonId: 'original-mat-band-row',
      sideMode: 'bilateral',
      exactSourceVariantMatched: false,
      sourceVariantReconciliationRequired: true,
      approvedCatalogMapping: false,
      exactAssetReady: false,
      autoRecommendationEligible: false,
      review: { status: 'unreviewed', professionalReviewCount: 0 },
      safetyAssessment: 'unassessed',
    });
  });
});

describe('SeatedBandRowFigure renders the authored contact model accessibly', () => {
  it('supports independent instances, common label/class props and explicit phase metadata', () => {
    const html = renderToStaticMarkup(
      createElement(
        'div',
        null,
        createElement(SeatedBandRowFigure, {
          progress: 0.5,
          label: '첫 밴드 시안',
          className: 'first-band',
        }),
        createElement(SeatedBandRowFigure, {
          progress: 1,
          label: '둘째 밴드 시안',
          mirrored: true,
        }),
      ),
    );
    const wrapper = document.createElement('div');
    wrapper.innerHTML = html;
    const figures = wrapper.querySelectorAll('svg');
    expect(figures).toHaveLength(2);
    expect(figures[0].classList.contains('first-band')).toBe(true);
    const titleIds = Array.from(figures, (figure) => figure.getAttribute('aria-labelledby'));
    const descIds = Array.from(figures, (figure) => figure.getAttribute('aria-describedby'));
    expect(new Set([...titleIds, ...descIds]).size).toBe(4);
    for (const [index, figure] of Array.from(figures).entries()) {
      expect(figure.getAttribute('role')).toBe('img');
      expect(figure.querySelector('title')?.id).toBe(titleIds[index]);
      expect(figure.querySelector('desc')?.id).toBe(descIds[index]);
      expect(figure.querySelector('desc')?.textContent).toMatch(/전문가 검토 0.*원본 절차 도해/s);
      expect(figure.querySelectorAll('[data-contact-id]')).toHaveLength(8);
      expect(figure.querySelectorAll('[data-limb-role="bilateral"]')).toHaveLength(2);
      expect(figure.getAttribute('data-display-behavior')).toBe('hold');
    }
    expect(figures[0].querySelector('title')?.textContent).toBe('첫 밴드 시안');
    expect(figures[1].getAttribute('data-view-mirrored')).toBe('true');
    expect(html).not.toMatch(/NaN|Infinity|undefined|<image|<iframe|<video/);
  });

  it.each([0, 0.29, 0.5, 0.73, 1])(
    'renders finite original band primitives at progress %s',
    (progress) => {
      const html = renderToStaticMarkup(createElement(SeatedBandRowFigure, { progress }));
      expect(html).toContain('data-band-kind="long-elastic-resistance-band"');
      expect(html).toContain('data-band-force="not-modeled"');
      expect(html).toContain('data-band-product-construction="unspecified"');
      expect(html).not.toMatch(/NaN|Infinity|undefined|<image|<iframe|<video/);
    },
  );
});
