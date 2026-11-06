import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { PelvicCurlFigure } from '../components/PelvicCurlFigure';
import {
  getPelvicCurlPose,
  PELVIC_CURL_DRAWING_PARAMETERS,
  PELVIC_CURL_PHASES,
  PELVIC_CURL_PROVENANCE,
  projectPelvicCurlPoint,
} from '../models/pelvicCurl';
import type { PelvicCurlPose, PelvicCurlWorld } from '../models/pelvicCurl';
import type { AnatomicalSide, Point3 } from '../models/types';

const sides: readonly AnatomicalSide[] = ['left', 'right'];
const distance = (a: Point3, b: Point3) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
const limbLengths = (pose: PelvicCurlPose) =>
  sides.flatMap((side) => {
    const leg = pose.legs[side],
      arm = pose.arms[side];
    return [
      distance(leg.hip, leg.knee),
      distance(leg.knee, leg.ankle),
      distance(leg.ankle, leg.heel),
      distance(leg.heel, leg.toe),
      distance(arm.shoulder, arm.elbow),
      distance(arm.elbow, arm.hand),
    ];
  });

describe('original articulated pelvic-curl geometry, not verified anatomy or exercise approval', () => {
  it.each(sides)(
    'preserves spine/limb lengths, fixed supports and contact release through 501 samples for %s metadata',
    (activeSide) => {
      const start = getPelvicCurlPose(0, { activeSide });
      const baseline = limbLengths(start);
      const moving = new Set(['pelvisCenter', 'leftHip', 'rightHip', 'leftKnee', 'rightKnee']);
      let maxLengthError = 0,
        maxFixedError = 0,
        maxContactError = 0,
        maxMirrorError = 0;
      let minClearance = Infinity;
      let finite = true,
        releaseMatchesGap = true;
      for (let sample = 0; sample <= 500; sample++) {
        const pose = getPelvicCurlPose(sample / 500, { activeSide });
        const mirror = getPelvicCurlPose(sample / 500, { activeSide, mirrored: true });
        limbLengths(pose).forEach((value, index) => {
          maxLengthError = Math.max(maxLengthError, Math.abs(value - baseline[index]));
        });
        pose.spine.segmentLengths.forEach((length, index) => {
          maxLengthError = Math.max(
            maxLengthError,
            Math.abs(distance(pose.spine.joints[index], pose.spine.joints[index + 1]) - length),
          );
        });
        for (const side of sides) {
          maxLengthError = Math.max(
            maxLengthError,
            Math.abs(
              distance(pose.legs[side].hip, pose.legs[side].knee) -
                PELVIC_CURL_DRAWING_PARAMETERS.thighLength,
            ),
            Math.abs(
              distance(pose.legs[side].knee, pose.legs[side].ankle) -
                PELVIC_CURL_DRAWING_PARAMETERS.shankLength,
            ),
          );
        }
        for (const key of Object.keys(pose.world) as (keyof PelvicCurlWorld)[]) {
          const point = pose.world[key];
          finite &&= point.every(Number.isFinite) && pose.screen[key].every(Number.isFinite);
          if (!moving.has(key))
            maxFixedError = Math.max(maxFixedError, distance(point, start.world[key]));
          maxMirrorError = Math.max(
            maxMirrorError,
            distance(point, mirror.world[key]),
            Math.abs(mirror.screen[key][0] - (640 - pose.screen[key][0])),
            Math.abs(mirror.screen[key][1] - pose.screen[key][1]),
          );
        }
        for (let i = 0; i < pose.spine.joints.length; i++) {
          finite &&= pose.spine.joints[i].every(Number.isFinite);
          minClearance = Math.min(minClearance, pose.spine.lowerProfile[i][2]);
          maxMirrorError = Math.max(
            maxMirrorError,
            distance(pose.spine.joints[i], mirror.spine.joints[i]),
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
            Math.abs(contact.targetPoint[2] - pose.mat.topZ),
          );
          if (contact.state === 'fixed')
            maxContactError = Math.max(
              maxContactError,
              distance(contact.point, contact.targetPoint),
            );
          else releaseMatchesGap &&= (contact.state === 'released') === contact.point[2] > 1e-9;
          minClearance = Math.min(minClearance, contact.point[2]);
        }
      }
      expect(finite).toBe(true);
      expect(releaseMatchesGap).toBe(true);
      expect(maxLengthError).toBeLessThan(1e-8);
      expect(maxFixedError).toBeLessThan(1e-9);
      expect(maxContactError).toBeLessThan(1e-9);
      expect(maxMirrorError).toBeLessThan(1e-9);
      expect(minClearance).toBeGreaterThanOrEqual(-1e-8);
    },
  );

  it('flattens its chosen initial curve before the articulated rise and cannot reduce to a rigid hinge', () => {
    const start = getPelvicCurlPose(0),
      tuck = getPelvicCurlPose(0.18);
    const middle = getPelvicCurlPose(0.27),
      peak = getPelvicCurlPose(0.5);
    expect(tuck.tuckAmount).toBeGreaterThan(0);
    expect(tuck.rollAmount).toBe(0);
    expect(tuck.spine.joints[2][2]).toBeLessThan(start.spine.joints[2][2]);
    expect(tuck.world.pelvisCenter[2]).toBeCloseTo(start.world.pelvisCenter[2], 10);
    expect(tuck.pelvisAxis).not.toEqual(start.pelvisAxis);
    expect(peak.world.pelvisCenter[2]).toBeGreaterThan(start.world.pelvisCenter[2] + 30);
    expect(middle.spine.joints).toHaveLength(5);
    expect(middle.spine.interpretation).toBe('authored-four-link-chain-not-measured-vertebrae');
    expect(Math.max(...middle.spine.angles) - Math.min(...middle.spine.angles)).toBeGreaterThan(
      0.05,
    );
    expect(middle.spine.angles[3]).toBeGreaterThan(middle.spine.angles[0]);
    expect(peak.contacts.find((c) => c.id === 'pelvis-mat')?.state).toBe('released');
    expect(start.contacts.find((c) => c.id === 'pelvis-mat')?.state).toBe('supported');
    expect(peak.contacts).toHaveLength(13);
    expect(peak.contacts.filter((c) => c.state === 'fixed')).toHaveLength(9);
    expect(peak.contacts.every((c) => c.evidence === 'authored-contact-patch')).toBe(true);
  });

  it('fits its deliberately authored peak center line without calling it measured source anatomy', () => {
    const peak = getPelvicCurlPose(0.5),
      anchor = peak.world.upperBack;
    const knee: Point3 = [
      (peak.legs.left.knee[0] + peak.legs.right.knee[0]) / 2,
      0,
      (peak.legs.left.knee[2] + peak.legs.right.knee[2]) / 2,
    ];
    expect(distance(knee, peak.peakLine.referenceEnd)).toBeLessThan(1e-8);
    const dx = knee[0] - anchor[0],
      dz = knee[2] - anchor[2];
    for (const joint of peak.spine.joints) {
      const deviation =
        Math.abs((joint[0] - anchor[0]) * dz - (joint[2] - anchor[2]) * dx) / Math.hypot(dx, dz);
      expect(deviation).toBeLessThan(1e-8);
    }
    expect(peak.peakLine.interpretation).toBe('authored-line-fit-not-source-measurement');
    expect(peak.forces).toBe('not-modeled');
  });

  it('keeps bilateral anatomical identity independent of metadata side and screen mirroring', () => {
    const left = getPelvicCurlPose(0.3, { activeSide: 'left' });
    const right = getPelvicCurlPose(0.3, { activeSide: 'right', mirrored: true });
    expect(left.activeSide).toBe('left');
    expect(right.activeSide).toBe('right');
    expect(left.world).toEqual(right.world);
    expect(left.spine).toEqual(right.spine);
    expect(left.contacts).toEqual(right.contacts);
    for (const key of ['hip', 'knee', 'ankle', 'heel', 'toe'] as const) {
      expect(left.legs.left[key][0]).toBe(left.legs.right[key][0]);
      expect(left.legs.left[key][2]).toBe(left.legs.right[key][2]);
      expect(left.legs.left[key][1]).toBe(-left.legs.right[key][1]);
    }
    expect(projectPelvicCurlPoint(left.world.leftHip, true)[0]).toBeCloseTo(
      640 - projectPelvicCurlPoint(left.world.leftHip)[0],
      12,
    );
  });

  it('closes the full cycle, exposes explicit holds and stays continuous at phase boundaries', () => {
    const start = getPelvicCurlPose(0),
      finish = getPelvicCurlPose(1);
    expect(finish.world).toEqual(start.world);
    expect(finish.spine).toEqual(start.spine);
    expect(finish.contacts).toEqual(start.contacts);
    expect(finish.pelvisAxis).toEqual(start.pelvisAxis);
    expect(PELVIC_CURL_PHASES.map((p) => p.id)).toEqual([
      'setup',
      'move',
      'turn',
      'return',
      'finish',
    ]);
    expect(PELVIC_CURL_PHASES.map((p) => p.displayBehavior)).toEqual([
      'hold',
      'move',
      'hold',
      'move',
      'hold',
    ]);
    for (const phase of PELVIC_CURL_PHASES) {
      expect(getPelvicCurlPose(phase.sample).phase.id).toBe(phase.id);
      if (phase.displayBehavior === 'hold') {
        expect(getPelvicCurlPose(phase.start + 1e-5).spine).toEqual(
          getPelvicCurlPose(phase.end - 1e-5).spine,
        );
      } else {
        expect(getPelvicCurlPose(phase.start + 1e-5).world.pelvisCenter).not.toEqual(
          getPelvicCurlPose(phase.end - 1e-5).world.pelvisCenter,
        );
      }
    }
    for (const phase of PELVIC_CURL_PHASES.slice(1)) {
      const before = getPelvicCurlPose(phase.start - 1e-6),
        after = getPelvicCurlPose(phase.start + 1e-6);
      expect(distance(before.world.pelvisCenter, after.world.pelvisCenter)).toBeLessThan(1e-7);
    }
  });

  it('rejects invalid inputs, clamps finite progress and returns independent mutable samples', () => {
    for (const invalid of [NaN, Infinity, -Infinity])
      expect(() => getPelvicCurlPose(invalid)).toThrow();
    expect(() => getPelvicCurlPose(0.2, { activeSide: 'invalid' as AnatomicalSide })).toThrow();
    expect(() => getPelvicCurlPose(0.2, { mirrored: 0 as unknown as boolean })).toThrow();
    expect(getPelvicCurlPose(-5).world).toEqual(getPelvicCurlPose(0).world);
    expect(getPelvicCurlPose(5).world).toEqual(getPelvicCurlPose(1).world);
    const a = getPelvicCurlPose(0.3);
    (a.spine.joints[1] as [number, number, number])[0] = -999;
    expect(getPelvicCurlPose(0.3).spine.joints[1][0]).not.toBe(-999);
  });

  it('preserves one factual record with unknown foot patches and zero approvals', () => {
    expect(PELVIC_CURL_PROVENANCE).toMatchObject({
      sourceId: 'basi-cjkelly-pelvic-curl-v1',
      sourceCheckedAtUtc: '2026-11-05T04:10:56Z',
      factualRecordSha256: 'e9411fd267a52e66b1070b777487b79f02987bdd3ea3c5028088a60756c5a8b1',
      professionalReviewCount: 0,
      approvedCatalogMappings: 0,
      exactAssetCount: 0,
      exactSourceVariantMatched: false,
      sourceVariantReconciliationRequired: true,
      autoRecommendationEligible: false,
    });
    expect(PELVIC_CURL_PROVENANCE.unknown).toContain('flat-foot/sole/heel');
    expect(getPelvicCurlPose(0.5)).toMatchObject({
      draftId: 'articulated-pelvic-curl',
      intendedComparisonId: 'original-mat-bridge',
      sideMode: 'bilateral',
      review: { status: 'unreviewed', professionalReviewCount: 0 },
      exactSourceVariantMatched: false,
      sourceVariantReconciliationRequired: true,
      approvedCatalogMapping: false,
      exactAssetReady: false,
      autoRecommendationEligible: false,
      safetyAssessment: 'unassessed',
    });
  });
});

describe('PelvicCurlFigure original SVG and accessibility', () => {
  it('supports distinct instances, common props, authored contact states and no media substitution', () => {
    const html = renderToStaticMarkup(
      createElement(
        'div',
        null,
        createElement(PelvicCurlFigure, {
          progress: 0.5,
          label: '첫 골반 시안',
          className: 'first-curl',
        }),
        createElement(PelvicCurlFigure, { progress: 1, label: '둘째 골반 시안', mirrored: true }),
      ),
    );
    const wrapper = document.createElement('div');
    wrapper.innerHTML = html;
    const figures = wrapper.querySelectorAll('svg');
    expect(figures).toHaveLength(2);
    expect(figures[0].classList.contains('first-curl')).toBe(true);
    expect(figures[0].querySelector('title')?.textContent).toBe('첫 골반 시안');
    expect(figures[1].querySelector('title')?.textContent).toBe('둘째 골반 시안');
    const ids = Array.from(figures).flatMap((figure) => [
      figure.getAttribute('aria-labelledby'),
      figure.getAttribute('aria-describedby'),
    ]);
    expect(new Set(ids).size).toBe(4);
    for (const figure of Array.from(figures)) {
      expect(figure.getAttribute('role')).toBe('img');
      expect(figure.querySelector('title')?.id).toBe(figure.getAttribute('aria-labelledby'));
      expect(figure.querySelector('desc')?.id).toBe(figure.getAttribute('aria-describedby'));
      expect(figure.querySelector('desc')?.textContent).toContain('발바닥 전체 접촉');
      expect(figure.querySelectorAll('[data-spine-node]')).toHaveLength(5);
      expect(figure.querySelectorAll('[data-contact-id]')).toHaveLength(13);
      expect(figure.getAttribute('data-display-behavior')).toBe('hold');
    }
    expect(
      figures[0]
        .querySelector('[data-contact-id="pelvis-mat"]')
        ?.getAttribute('data-contact-state'),
    ).toBe('released');
    expect(
      figures[1]
        .querySelector('[data-contact-id="pelvis-mat"]')
        ?.getAttribute('data-contact-state'),
    ).toBe('supported');
    expect(figures[1].getAttribute('data-view-mirrored')).toBe('true');
    expect(html).not.toMatch(/NaN|Infinity|undefined|<image|<iframe|<video/);
  });

  it.each([0, 0.18, 0.3, 0.5, 0.7, 1])(
    'renders finite native articulated primitives at %s',
    (progress) => {
      const html = renderToStaticMarkup(createElement(PelvicCurlFigure, { progress }));
      expect(html).toContain(
        'data-spine-interpretation="authored-four-link-chain-not-measured-vertebrae"',
      );
      expect(html).toContain('data-contact-evidence="authored-contact-patch"');
      expect(html).not.toMatch(/NaN|Infinity|undefined|<image|<iframe|<video/);
    },
  );
});
