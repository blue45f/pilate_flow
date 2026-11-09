import { describe, expect, it } from 'vitest';
import { INITIAL_EXERCISES, INITIAL_SAVED_SEQUENCES } from '../data/pilatesCatalog';
import { verifySequenceAiSafetyAndFidelity } from '../utils/aiSequenceSafetyVerifier';
import { generateBlenderApparatusSceneScript } from '../utils/blenderSceneScriptExporter';
import { generateFreshClassAngles } from '../utils/freshClassAnglesGenerator';

describe('Wave 8 Multi-Skill Advancement Verification (Epics 31–35)', () => {
  const exerciseMap = new Map(INITIAL_EXERCISES.map((ex) => [ex.id, ex]));

  it('Epic 31 (@generate-fresh-ideas): generates 5 distinct creative class angles with actionable subtitles and hooks', () => {
    const sample = INITIAL_SAVED_SEQUENCES[0]!;
    const angles = generateFreshClassAngles(sample.steps, exerciseMap, {
      apparatus: sample.apparatus,
      level: sample.level,
      focusPreset: 'full-body',
      targetMinutes: sample.targetMinutes,
    });
    expect(angles.length).toBe(5);
    expect(angles.map((a) => a.id)).toEqual([
      'contrarian',
      'personal-story',
      'data-evidence',
      'playbook',
      'what-they-missed',
    ]);
    expect(angles.every((a) => a.suggestedSubtitleKo.length > 5)).toBe(true);
  });

  it('Epic 32 (@Blender): exports a valid Blender 4.x Python (bpy) scene script with 3-phase carriage keyframes and 5-joint hierarchy', () => {
    const script = generateBlenderApparatusSceneScript({
      exerciseTitleKo: '풋워크',
      apparatus: 'reformer',
      bodyPosition: 'supine',
      springsLabel: '빨강 2 · 파랑 1',
      activePhase: 'peak',
    });
    expect(script).toContain('import bpy');
    expect(script).toContain('Apparatus_Carriage');
    expect(script).toContain('Joint_Pelvis');
    expect(script).toContain('keyframe_insert');
  });

  it('Epic 33 (@Verify AI): verifies all 5 deterministic safety and fidelity gates on valid sequences and detects clinical overclaims', () => {
    const sample = INITIAL_SAVED_SEQUENCES[0]!;
    const cleanReport = verifySequenceAiSafetyAndFidelity(sample.steps, exerciseMap);
    expect(cleanReport.allPassed).toBe(true);
    expect(cleanReport.passedCount).toBe(5);

    const flaggedSteps = sample.steps.map((st, idx) =>
      idx === 0 ? { ...st, instructorNote: '허리 디스크 치료 완치 보장' } : st,
    );
    const flaggedReport = verifySequenceAiSafetyAndFidelity(flaggedSteps, exerciseMap);
    expect(flaggedReport.allPassed).toBe(false);
    expect(
      flaggedReport.gates.find((g) => g.gateId === 'non-diagnostic-language')?.passed,
    ).toBe(false);
  });
});
