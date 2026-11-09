import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  INITIAL_EXERCISES,
  INITIAL_HISTORY_LOGS,
  INITIAL_SAVED_SEQUENCES,
} from '../data/pilatesCatalog';
import type { ReformerBrand } from '../types/pilates';
import { convertSpringTensionAcrossBrands } from './springTensionMatrix';
import { auditSequenceStudioReadiness } from './studioReadinessAudit';
import { analyzeDurationCalibration } from './durationCalibrationEngine';

const brands: ReformerBrand[] = ['balanced-body', 'stott', 'intopilates', 'classical'];
describe('Wave 5 integration regressions', () => {
  it.each(['파랑 1', '빨강 1', '빨강 2 · 파랑 1', '빨강 3 · 파랑 1'])(
    'resolves every selectable brand for %s',
    (springs) => {
      const result = convertSpringTensionAcrossBrands(springs);
      expect(Object.keys(result.equivalentsByBrand).sort()).toEqual([...brands].sort());
      for (const brand of brands)
        expect(result.equivalentsByBrand[brand].length).toBeGreaterThan(0);
      expect(result.equivalentsByBrand.intopilates).toBe(
        result.equivalentsByBrand['balanced-body'],
      );
    },
  );
  it('excludes neutral from readiness coverage while retaining actual planes', () => {
    const exercise = {
      ...INITIAL_EXERCISES[0],
      spinalPlanes: ['neutral', 'flexion', 'flexion'] as const,
    };
    const step = { ...INITIAL_SAVED_SEQUENCES[0].steps[0], exerciseId: exercise.id };
    const result = auditSequenceStudioReadiness(
      [step],
      new Map([[exercise.id, { ...exercise, spinalPlanes: [...exercise.spinalPlanes] }]]),
    );
    expect(result.coveredSpinalPlanes).toEqual(['flexion']);
    expect(result.missingSpinalPlanes).toEqual(['extension', 'lateral', 'rotation']);
  });
  it('keeps both new cards and uses all-group fallback only where required', () => {
    const source = readFileSync(
      'src/components/SequenceWorkbench.tsx',
      'utf8',
    );
    expect(source).toContain('<StudioReadinessAuditCard');
    for (const name of ['DurationCalibrationBanner', 'CurriculumProgressionPanel']) {
      const props = source.split(`<${name}`)[1].split('/>')[0];
      expect(props).toContain("groupId={criteria.targetGroupId ?? 'all'}");
    }
  });
  it('includes real history across groups when no class is selected', () => {
    const log = {
      ...INITIAL_HISTORY_LOGS[0],
      id: 'wave5-real-history',
      groupId: 'synthetic-group',
      stepsSnapshot: INITIAL_SAVED_SEQUENCES[0].steps,
      actualDurationSec: 3600,
    };
    expect(analyzeDurationCalibration([log], 'all').sampleCount).toBe(1);
    expect(analyzeDurationCalibration([log], 'other').sampleCount).toBe(0);
  });
});
