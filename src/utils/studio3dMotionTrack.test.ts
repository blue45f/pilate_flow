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
import { sampleStudioMotionCycle } from './studioMotionPlayback';

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

  it.each(['reformer', 'cadillac', 'chair', 'barrel', 'mat'] as const)(
    'keeps every %s limb chain continuous through the repetition',
    (apparatus) => {
      expect(catalog).toHaveLength(218);
      for (const exercise of catalog.filter((item) => item.apparatus === apparatus)) {
        let last = resolveStudio3DBody(sampleStudio3DMotionRig(exercise, 0));
        let maxTravel = 0;
        for (let index = 1; index <= 250; index++) {
          const next = resolveStudio3DBody(sampleStudio3DMotionRig(exercise, index / 250));
          for (const key of joints) maxTravel = Math.max(maxTravel, distance(last[key], next[key]));
          last = next;
        }
        // A pole flipping through a folded arm used to move its elbow 30 cm in 0.1% of the path.
        expect(maxTravel, exercise.id).toBeLessThan(0.04);
      }
    },
  );
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
