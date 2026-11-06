import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import * as originalHeel from './fixtures/motion-models/heel-raise-model.mjs';
import * as originalClam from './fixtures/motion-models/clam-model.mjs';
import origin from './fixtures/motion-models/origin.json';
import { getHeelRaisePose } from '../models/heelRaise';
import { getClamPose } from '../models/clam';
import { MOTION_DRAFTS, getMotionDraft } from '../data/motionDrafts';

describe('typed model port from preserved original drafts', () => {
  it('retains the exact frozen original model bytes used as verification references', () => {
    for (const name of ['heel-raise-model.mjs', 'clam-model.mjs'] as const) {
      const bytes = readFileSync(
        resolve(dirname(fileURLToPath(import.meta.url)), 'fixtures/motion-models', name),
      );
      expect(createHash('sha256').update(bytes).digest('hex')).toBe(origin.files[name]);
    }
    expect(origin.originalArchiveSha256).toBe(
      '62e2ce01015176cce64b18c1c739556aa5df45d1992f81575de8c54a60700301',
    );
  });
  it('keeps every heel-raise coordinate and contact equal to the original across 1001 progress samples', () => {
    for (let sample = 0; sample <= 1000; sample++) {
      const progress = sample / 1000;
      const pose = getHeelRaisePose(progress);
      const original = originalHeel.getHeelRaisePose(progress);
      expect(pose.limbs).toEqual(original.limbs);
      expect(pose.contacts).toEqual(original.contacts);
      expect(pose.head).toEqual(original.head);
      expect(pose.equipment.isPilatesChair).toBe(false);
    }
  });
  it.each(['left', 'right'] as const)(
    'keeps all %s clam world points, projections and contacts equal across 1001 samples',
    (activeSide) => {
      for (let sample = 0; sample <= 1000; sample++) {
        const progress = sample / 1000;
        const pose = getClamPose(progress, { activeSide });
        const original = originalClam.getClamPose(progress, { activeSide });
        expect(pose.world).toEqual(original.world);
        expect(pose.screen).toEqual(original.screen);
        expect(pose.anchors).toEqual(original.anchors);
        expect(pose.legs).toEqual(original.legs);
      }
    },
  );
  it('keeps anatomical side independent of camera mirroring and still returns to its exact start', () => {
    const plain = getClamPose(0.51, { activeSide: 'left' });
    const mirror = getClamPose(0.51, { activeSide: 'left', mirrored: true });
    expect(mirror.world).toEqual(plain.world);
    expect(mirror.activeSide).toBe('left');
    expect(mirror.supportSide).toBe('right');
    for (const key of Object.keys(plain.screen) as (keyof typeof plain.screen)[]) {
      expect(mirror.screen[key][0]).toBeCloseTo(640 - plain.screen[key][0], 10);
    }
    expect(getClamPose(0).world).toEqual(getClamPose(1).world);
    expect(getHeelRaisePose(0).limbs).toEqual(getHeelRaisePose(1).limbs);
  });
  it('exposes seventeen distinct unreviewed proposals and never treats intended exercise IDs as draft IDs', () => {
    expect(MOTION_DRAFTS.map((draft) => draft.id).sort()).toEqual([
      'adult-supine-heel-slide',
      'articulated-pelvic-curl',
      'cadillac-supine-arm-spring-press',
      'chair-seated-pedal-press',
      'floor-seated-band-row',
      'ladder-supported-hip-extension-slide',
      'ladder-supported-side-leg-slide',
      'quadruped-arm-slide',
      'quadruped-leg-slide',
      'reformer-parallel-footwork',
      'reformer-supine-strap-arm-press',
      'side-lying-clam',
      'side-lying-open-book',
      'side-lying-straight-leg-lift',
      'supine-chest-lift',
      'supine-knee-fold',
      'supported-heel-raise',
    ]);
    for (const draft of MOTION_DRAFTS) {
      expect(draft.status).toBe('variant-proposal');
      expect(draft.professionalReviewCount).toBe(0);
      expect(draft.exactAssetReady).toBe(false);
      expect(draft.autoRecommendationEligible).toBe(false);
      expect(getMotionDraft(draft.intendedExerciseId)).toBeNull();
      for (const source of draft.sources) expect(new URL(source.url).protocol).toBe('https:');
    }
    expect(getMotionDraft('original-mat-bridge')).toBeNull();
    expect(getMotionDraft('unknown')).toBeNull();
  });
});
