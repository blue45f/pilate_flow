import { describe, expect, it } from 'vitest';
import { GLOBAL_CRAWLED_REPERTOIRE_EXERCISES } from '../data/globalCrawledRepertoirePack';
import { INITIAL_EXERCISES } from '../data/pilatesCatalog';
import {
  PHASE_3D_RAW_T,
  sampleUniversal3DExerciseRig,
  type Vec3,
} from '../data/universal3dExerciseRigs';
import { projectStudio3DSceneForSvg, resolveStudio3DBody } from './realtimeStudio3dEngine';
import { sampleStudio3DMotionRig } from './studio3dMotionTrack';
import {
  getStudioMotionDuration,
  getStudioMotionTiming,
  sampleStudioMotionCycle,
} from './studioMotionPlayback';
import { WORLD_PILATES_BY_ID, WORLD_PILATES_EXERCISES } from '../data/worldPilatesRepertoire1000';

const catalog = [...INITIAL_EXERCISES, ...GLOBAL_CRAWLED_REPERTOIRE_EXERCISES];
const distance = (a: Vec3, b: Vec3) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
const joints = ['lKnee', 'rKnee', 'lElb', 'rElb', 'lAnkle', 'rAnkle', 'lWr', 'rWr'] as const;

describe('3D motion interpolation', () => {
  it('comes to rest at both edges of each hold and keeps the forward and return travel symmetric', () => {
    const epsilon = 1e-4;
    for (const boundary of [0.12, 0.42, 0.58, 0.88]) {
      const left = sampleStudioMotionCycle(boundary - epsilon).pose;
      const right = sampleStudioMotionCycle(boundary + epsilon).pose;
      expect(Math.abs(right - left) / epsilon).toBeLessThan(0.01);
    }
    for (const u of [0.001, 0.05, 0.3, 0.5, 0.8, 0.95, 0.999]) {
      expect(sampleStudioMotionCycle(0.12 + 0.3 * u).pose).toBeCloseTo(
        sampleStudioMotionCycle(0.88 - 0.3 * u).pose,
        12,
      );
    }
  });

  it('follows the hold, pulse and shortened-range instructions in saved variations', () => {
    const poseAtMs = (variation: string, ms: number) => {
      const timing = getStudioMotionTiming('original-mat-bridge--var-' + variation);
      return sampleStudioMotionCycle(ms / getStudioMotionDuration(timing), timing).pose;
    };
    // At normal speed the five-second hold is surrounded by movement on both sides.
    expect(poseAtMs('hold', 3300)).toBeLessThan(1);
    expect(poseAtMs('hold', 3360)).toBe(1);
    expect(poseAtMs('hold', 8360)).toBe(1);
    expect(poseAtMs('hold', 8420)).toBeLessThan(1);
    for (let pulse = 0; pulse < 3; pulse++) {
      const beat = 3360 + 1000 * pulse;
      expect(poseAtMs('pulse', beat)).toBeCloseTo(1);
      expect(poseAtMs('pulse', beat + 500)).toBeCloseTo(0.82);
      expect(poseAtMs('pulse', beat + 1000)).toBeCloseTo(1);
    }
    expect(poseAtMs('prep', 4000)).toBeCloseTo(0.65);
    expect(poseAtMs('light-spring', 2460)).toBeCloseTo(0.5);
  });

  it('keeps a variation on its base movement when its prop and movement share a search term', () => {
    for (const id of [
      'world-mat-toe-taps--var-roller',
      'world-mat-theraband-leg-circles--var-circle',
      'world-barrel-barrel-layout-extension--var-circle',
      'world-chair-chair-footwork-heels--var-single-leg',
    ]) {
      const variation = WORLD_PILATES_BY_ID.get(id)!;
      const base = WORLD_PILATES_BY_ID.get(variation.parentArchetypeId)!;
      expect(sampleStudio3DMotionRig(variation, 0.35).rigId).toBe(
        sampleStudio3DMotionRig(base, 0.35).rigId,
      );
    }
  });

  it('keeps the roll-over legs long throughout the arc and joins track knots without sudden ankle acceleration', () => {
    const exercise = WORLD_PILATES_BY_ID.get('world-mat-roll-over')!;
    for (let i = 0; i <= 100; i++) {
      const pose = resolveStudio3DBody(sampleStudio3DMotionRig(exercise, i / 100));
      expect(distance(pose.rHip, pose.rAnkle)).toBeGreaterThan(0.72);
    }
    const t = PHASE_3D_RAW_T.end / 2;
    const dt = 1e-5;
    const [before, at, after] = [t - dt, t, t + dt].map(
      (progress) => sampleStudio3DMotionRig(exercise, progress).rFoot,
    );
    for (let axis = 0; axis < 3; axis++) {
      const incoming = (at[axis] - before[axis]) / dt;
      const outgoing = (after[axis] - at[axis]) / dt;
      expect(Math.abs(incoming - outgoing)).toBeLessThan(0.001);
    }
  });

  it('keeps the carriage, feet and shoulders supported during the unstrapped breathing exercise', () => {
    const breath = WORLD_PILATES_BY_ID.get('original-reformer-supine-breath')!;
    const start = sampleStudio3DMotionRig(breath, 0);
    for (let i = 0; i <= 40; i++) {
      const rig = sampleStudio3DMotionRig(breath, i / 40);
      expect(rig.ropeToHands).toBeFalsy();
      expect(rig.carriageX).toBe(start.carriageX);
      expect(rig.lFoot).toEqual(start.lFoot);
      expect(rig.rFoot).toEqual(start.rFoot);
    }
    expect(sampleStudio3DMotionRig(breath, 1).rHand[2] - start.rHand[2]).toBeGreaterThan(0.25);
  });

  it('keeps the legs close enough to hold a mini-ball between the knees during strap work', () => {
    for (const id of [
      'ex-straps-01--var-miniball',
      'world-reformer-reformer-long-spine-massage--var-miniball',
    ]) {
      const exercise = WORLD_PILATES_BY_ID.get(id)!;
      for (let index = 0; index <= 50; index++) {
        const pose = resolveStudio3DBody(sampleStudio3DMotionRig(exercise, index / 50));
        expect(distance(pose.lKnee, pose.rKnee)).toBeLessThan(0.28);
        expect(distance(pose.lKnee, pose.rKnee)).toBeGreaterThan(0.13);
      }
    }
  });

  it.each(['front', 'back'])(
    'keeps both feet on the pedal and both hands on the seat for chair frog facing %s',
    (side) => {
      const exercise = WORLD_PILATES_BY_ID.get('world-chair-chair-frog-facing-' + side)!;
      const start = resolveStudio3DBody(sampleStudio3DMotionRig(exercise, 0));
      for (let index = 0; index <= 50; index++) {
        const rig = sampleStudio3DMotionRig(exercise, index / 50);
        const pose = resolveStudio3DBody(rig);
        const rad = (rig.pedalDeg! * Math.PI) / 180;
        const treadZ = 0.088 + 0.54 * Math.sin(rad) + 0.036 * Math.cos(rad);
        expect(Math.sign(pose.antN[0])).toBe(side === 'front' ? -1 : 1);
        expect(rig.withChairHandles).toBeFalsy();
        for (const key of ['lWr', 'rWr'] as const)
          expect(distance(pose[key], start[key])).toBeLessThan(0.001);
        for (const key of ['lAnkle', 'rAnkle'] as const)
          expect(pose[key][2] - treadZ).toBeCloseTo(0.065, 3);
        expect(Math.abs(pose.rKnee[1] - pose.lKnee[1])).toBeGreaterThan(0.46);
      }
    },
  );

  it('keeps the rocker grip on the lower legs and distinguishes the two long-box strap paths', () => {
    const rocker = WORLD_PILATES_BY_ID.get('crawled-mat-open-leg-rocker')!;
    for (let i = 0; i <= 40; i++) {
      const pose = resolveStudio3DBody(sampleStudio3DMotionRig(rocker, i / 40));
      expect(distance(pose.rAnkle, pose.rWr)).toBeLessThan(0.13);
      expect(distance(pose.rHip, pose.rAnkle)).toBeGreaterThan(0.74);
      expect(distance(pose.rAnkle, pose.lAnkle)).toBeGreaterThan(0.44);
    }
    const plow = WORLD_PILATES_BY_ID.get('world-reformer-longbox-pulling-straps-plow')!;
    const tPull = WORLD_PILATES_BY_ID.get('world-reformer-longbox-pulling-straps-t')!;
    const armsDown = sampleStudio3DMotionRig(plow, 0);
    const armsWide = sampleStudio3DMotionRig(tPull, 0);
    const peak = sampleStudio3DMotionRig(plow, 1);
    expect(armsDown.chest[2] - armsDown.rHand[2]).toBeGreaterThan(0.4);
    expect(distance(armsWide.lHand, armsWide.rHand)).toBeGreaterThan(1.1);
    expect(peak.chest[2] - armsDown.chest[2]).toBeGreaterThan(0.12);
    expect(Math.abs(peak.rHand[0] - peak.pelvis[0])).toBeLessThan(0.1);
  });

  it('retains the rendered Blender posture anchors and is independent of seeking direction', () => {
    for (const exercise of catalog) {
      for (const t of Object.values(PHASE_3D_RAW_T)) {
        expect(sampleStudio3DMotionRig(exercise, t), exercise.id).toEqual(
          sampleUniversal3DExerciseRig(exercise, t),
        );
      }
      const forward = sampleStudio3DMotionRig(exercise, 0.537);
      sampleStudio3DMotionRig(exercise, 1);
      expect(sampleStudio3DMotionRig(exercise, 0.537), exercise.id).toEqual(forward);
    }
  });

  const batchSize = 40;
  const batches = Array.from(
    { length: Math.ceil(WORLD_PILATES_EXERCISES.length / batchSize) },
    (_, batch) => batch * batchSize,
  );
  it.each(batches)('keeps every limb continuous in the catalog batch starting at %i', (start) => {
    for (const exercise of WORLD_PILATES_EXERCISES.slice(start, start + batchSize)) {
      let previous = resolveStudio3DBody(sampleStudio3DMotionRig(exercise, 0));
      let maxTravel = 0;
      for (let index = 1; index <= 250; index++) {
        const next = resolveStudio3DBody(sampleStudio3DMotionRig(exercise, index / 250));
        for (const key of joints)
          maxTravel = Math.max(maxTravel, distance(previous[key], next[key]));
        previous = next;
      }
      // A flipping pole used to move a folded elbow 30 cm in 0.1% of a repetition.
      expect(maxTravel, exercise.id).toBeLessThan(0.04);
    }
  });

  it('slides one hand on the Cadillac table with both knees and the support hand planted', () => {
    const exercise = catalog.find((item) => item.id === 'original-cadillac-quadruped-slide')!;
    const start = resolveStudio3DBody(sampleStudio3DMotionRig(exercise, 0));
    const peak = resolveStudio3DBody(sampleStudio3DMotionRig(exercise, 1));
    expect(start.rWr[0] - peak.rWr[0]).toBeCloseTo(0.12);
    for (let i = 0; i <= 100; i++) {
      const rig = sampleStudio3DMotionRig(exercise, i / 100);
      expect(rig.rolldownBar).toBeUndefined();
      const pose = resolveStudio3DBody(rig);
      for (const joint of ['lWr', 'lKnee', 'rKnee'] as const) {
        expect(distance(start[joint], pose[joint])).toBeLessThan(0.001);
      }
      expect(pose.rWr[2]).toBeCloseTo(start.rWr[2], 5);
    }
  });

  it.each(['original-cadillac-seated-rotation', 'original-cadillac-seated-side-reach'])(
    'retains the planted hips and feet during %s',
    (id) => {
      const exercise = catalog.find((item) => item.id === id)!;
      const start = resolveStudio3DBody(sampleStudio3DMotionRig(exercise, 0));
      for (let index = 1; index <= 100; index++) {
        const pose = resolveStudio3DBody(sampleStudio3DMotionRig(exercise, index / 100));
        for (const joint of ['lHip', 'rHip', 'lAnkle', 'rAnkle'] as const) {
          expect(distance(start[joint], pose[joint])).toBeLessThan(0.001);
        }
      }
    },
  );

  it.each(['expanded-barrel-horseback-jockey', 'expanded-cadillac-standing-fencing'])(
    'frames the whole apparatus and practitioner for %s',
    (id) => {
      const exercise = catalog.find((item) => item.id === id)!;
      for (const phase of [0, 0.535, 1]) {
        const { elements } = projectStudio3DSceneForSvg(exercise, phase, 390, 244);
        let left = Infinity,
          right = -Infinity,
          top = Infinity,
          bottom = -Infinity;
        for (const element of elements) {
          for (const vertex of element.d?.matchAll(/[ML](-?[\d.]+),(-?[\d.]+)/g) ?? []) {
            const x = Number(vertex[1]),
              y = Number(vertex[2]);
            left = Math.min(left, x);
            right = Math.max(right, x);
            top = Math.min(top, y);
            bottom = Math.max(bottom, y);
          }
        }
        expect(left).toBeGreaterThan(0);
        expect(top).toBeGreaterThan(0);
        expect(right).toBeLessThan(390);
        expect(bottom).toBeLessThan(244);
        expect(bottom - top).toBeGreaterThan(100);
      }
    },
  );
});
