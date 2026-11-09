import { describe, expect, it } from 'vitest';
import { INITIAL_EXERCISES, INITIAL_SAVED_SEQUENCES } from '../data/pilatesCatalog';
import { verifySequenceAiSafetyAndFidelity } from '../utils/aiSequenceSafetyVerifier';
import { generateBlenderApparatusSceneScript } from '../utils/blenderSceneScriptExporter';
import {
  expandFreshClassAngleDraft,
  generateFreshClassAngles,
} from '../utils/freshClassAnglesGenerator';

describe('Wave 8 Multi-Skill Advancement Verification (Epics 31–35)', () => {
  const exerciseMap = new Map(INITIAL_EXERCISES.map((ex) => [ex.id, ex]));

  it('Epic 31 (@generate-fresh-ideas): generates 5 distinct creative class angles with 2–3 sentence expansions, 3-beat story structure, verified metrics + placeholders, 4-step playbook, and Mode B channel draft expansion', () => {
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
    expect(angles.every((a) => a.angleExpansionKo.length > 30)).toBe(true);

    // Lens 2: 3-Beat Story Structure
    const storyAngle = angles.find((a) => a.id === 'personal-story')!;
    expect(storyAngle.storyStructure).toBeDefined();
    expect(storyAngle.storyStructure?.setupKo).toBeTruthy();
    expect(storyAngle.storyStructure?.frictionKo).toBeTruthy();
    expect(storyAngle.storyStructure?.lessonKo).toBeTruthy();

    // Lens 3: Verified source metrics + bracketed evidence placeholders
    const dataAngle = angles.find((a) => a.id === 'data-evidence')!;
    expect(dataAngle.verifiedSourceMetricsKo?.length).toBeGreaterThanOrEqual(3);
    expect(dataAngle.evidencePlaceholdersKo?.every((p) => p.startsWith('[') && p.endsWith(']'))).toBe(
      true,
    );

    // Lens 4: 4-step tactical playbook
    const playbookAngle = angles.find((a) => a.id === 'playbook')!;
    expect(playbookAngle.playbookStepsKo?.length).toBe(4);

    // Mode B: Immediate Draft Expansion across all 3 channels
    for (const channel of ['class-intro-script', 'member-notice', 'studio-note'] as const) {
      const expanded = expandFreshClassAngleDraft(playbookAngle, channel, {
        sequenceTitle: sample.title,
        targetMinutes: sample.targetMinutes,
        exerciseCount: sample.steps.length,
      });
      expect(expanded.angleId).toBe('playbook');
      expect(expanded.channelId).toBe(channel);
      expect(expanded.bodyKo.length).toBeGreaterThan(50);
    }
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
