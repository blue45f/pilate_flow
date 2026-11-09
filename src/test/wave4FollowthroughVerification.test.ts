import { describe, expect, it } from 'vitest';
import { INITIAL_EXERCISES, INITIAL_SAVED_SEQUENCES } from '../data/pilatesCatalog';
import type { ClassHistoryLog } from '../types/pilates';
import { buildApparatus3dRigScene } from '../utils/apparatus3dRigProjection';
import {
  analyzeDurationCalibration,
  applyDurationCalibrationToSteps,
} from '../utils/durationCalibrationEngine';
import {
  formatSequenceAsPortableJson,
  parsePortableSequenceJson,
} from '../utils/portableSequenceExport';
import { auditSequenceStudioReadiness } from '../utils/studioReadinessAudit';

describe('Wave 4 Follow-Through Advancement Verification Suite (Epics 11-15)', () => {
  it('computes Planned vs Actual duration calibration and calibrates sequence steps', () => {
    const baseSeq = INITIAL_SAVED_SEQUENCES[0]!;
    const customLog: ClassHistoryLog = {
      id: 'custom-real-log-1',
      sequenceId: baseSeq.id,
      sequenceTitle: baseSeq.title,
      groupId: 'group-1',
      groupName: '오전 리포머 A반',
      taughtAt: '2026-11-08T10:00:00.000Z',
      apparatus: baseSeq.apparatus,
      level: baseSeq.level,
      exerciseIds: baseSeq.steps.map((s) => s.exerciseId),
      stepsSnapshot: baseSeq.steps,
      actualDurationSec: 3600,
      instructorReflection: '설명과 스프링 전환이 길어졌음',
      intensity: 'moderate',
      rating: 5,
    };

    const calibration = analyzeDurationCalibration([customLog], 'group-1');
    expect(calibration.sampleCount).toBe(1);
    expect(calibration.tendency).toBe('overrun');
    expect(calibration.avgDeltaSec).toBeGreaterThan(0);

    const calibratedSteps = applyDurationCalibrationToSteps(baseSeq.steps, calibration);
    expect(calibratedSteps[0]!.durationMin).toBeGreaterThan(baseSeq.steps[0]!.durationMin);
  });

  it('projects 5-joint kinematic chain across setup, peak, and return motion phases', () => {
    const setupScene = buildApparatus3dRigScene({
      apparatus: 'reformer',
      bodyPosition: 'supine',
      phase: 'setup',
    });
    const peakScene = buildApparatus3dRigScene({
      apparatus: 'reformer',
      bodyPosition: 'supine',
      phase: 'peak',
    });

    expect(setupScene.jointChain2D.head.u).not.toBe(peakScene.jointChain2D.head.u);
    expect(peakScene.centerOfMass2D.u).toBeGreaterThan(setupScene.centerOfMass2D.u);
  });

  it('round-trips a SavedSequence through portable JSON package export and parser', () => {
    const seq = INITIAL_SAVED_SEQUENCES[0]!;
    const raw = formatSequenceAsPortableJson(seq);
    const parsed = parsePortableSequenceJson(raw);
    expect(parsed).not.toBeNull();
    expect(parsed?.id).toBe(seq.id);
    expect(parsed?.steps.length).toBe(seq.steps.length);
  });

  it('audits sequence studio readiness across apparatus switches, spinal planes, and symmetry', () => {
    const seq = INITIAL_SAVED_SEQUENCES[0]!;
    const exMap = new Map(INITIAL_EXERCISES.map((ex) => [ex.id, ex]));
    const audit = auditSequenceStudioReadiness(seq.steps, exMap);
    expect(audit.score).toBeGreaterThanOrEqual(0);
    expect(audit.score).toBeLessThanOrEqual(100);
    expect(audit.coveredSpinalPlanes.length).toBeGreaterThan(0);
    expect(audit.summaryLabelKo).toContain('스튜디오 준비도');
  });
});
