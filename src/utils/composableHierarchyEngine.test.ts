import { describe, expect, it } from 'vitest';
import { INITIAL_EXERCISES } from '../data/pilatesCatalog';
import { GLOBAL_CRAWLED_REPERTOIRE_EXERCISES } from '../data/globalCrawledRepertoirePack';
import {
  PILATES_SCHOOL_LABELS,
  VERIFIED_REPERTOIRE_VIDEO_ID_SET,
  WORLD_PILATES_BY_ID,
  WORLD_PILATES_EXERCISES,
  WORLD_REPERTOIRE_STATS,
  getExerciseAnatomyInsight,
  getProgressionTree,
} from '../data/worldPilatesRepertoire1000';
import {
  CURATED_MULTI_WEEK_PROGRAMS,
  GOLDEN_COMBOS_BY_ID,
  GOLDEN_MICRO_FLOW_COMBOS,
  computeExerciseTransitionCost,
  expandComboToSequenceSteps,
  findPlanBAlternative,
  generateFourWeekProgram,
  recommendZeroTransitionNext,
  remixExerciseVariation,
  replaceRepeatedFromLastWeek,
} from './composableHierarchyEngine';
import type { SequenceStep } from '../types/pilates';

const PROHIBITED_MEDICAL_RX =
  /진단|치료|완치|치유|처방|교정|환자|병원\s*대신|질병|통증\s*제거|의학적\s*효과/i;

describe('World Pilates 1,000+ Repertoire Encyclopedia', () => {
  it('preserves existing 218 core exercises (158 + 60) untouched and scales beyond 1,050 unique exercises', () => {
    expect(INITIAL_EXERCISES).toHaveLength(158);
    expect(GLOBAL_CRAWLED_REPERTOIRE_EXERCISES).toHaveLength(60);
    expect(WORLD_PILATES_EXERCISES.length).toBeGreaterThanOrEqual(1050);
    expect(WORLD_REPERTOIRE_STATS.totalCount).toBe(WORLD_PILATES_EXERCISES.length);
    expect(WORLD_REPERTOIRE_STATS.existingCoreCount).toBe(218);

    const allLegacyIds = [
      ...INITIAL_EXERCISES.map((e) => e.id),
      ...GLOBAL_CRAWLED_REPERTOIRE_EXERCISES.map((e) => e.id),
    ];
    for (const id of allLegacyIds) {
      const wrapped = WORLD_PILATES_BY_ID.get(id);
      expect(wrapped).toBeDefined();
      expect(wrapped?.tier).toBe('atomic');
      expect(wrapped?.parentArchetypeId).toBe(id);
    }
  });

  it('guarantees zero duplicate IDs, zero duplicate Korean/English names, zero fabricated YouTube IDs, and zero medical claims', () => {
    const ids = new Set<string>();
    const namesKo = new Set<string>();
    const namesEn = new Set<string>();

    for (const ex of WORLD_PILATES_EXERCISES) {
      expect(ids.has(ex.id)).toBe(false);
      ids.add(ex.id);

      const ko = ex.nameKo.normalize('NFKC').trim().toLowerCase();
      const en = ex.nameEn.normalize('NFKC').trim().toLowerCase();
      expect(namesKo.has(ko)).toBe(false);
      expect(namesEn.has(en)).toBe(false);
      namesKo.add(ko);
      namesEn.add(en);

      expect(ex.cues).toHaveLength(3);
      expect(ex.anatomyInsight.benefitsKo.length).toBeGreaterThanOrEqual(2);
      expect(ex.anatomyInsight.benefitsKo.length).toBeLessThanOrEqual(3);
      expect(ex.anatomyInsight.commonFaultsKo).toHaveLength(2);
      expect(ex.anatomyInsight.springMechanicsKo.length).toBeGreaterThan(10);
      if (ex.youtube.videoId) {
        expect(VERIFIED_REPERTOIRE_VIDEO_ID_SET.has(ex.youtube.videoId)).toBe(true);
        expect(ex.youtube.url).toContain(ex.youtube.videoId);
        if (ex.tier === 'variation') expect(ex.youtube.referenceScope).toBe('base-movement');
      } else {
        expect(ex.youtube.url).toBe('');
      }

      const combinedText = [
        ex.nameKo,
        ex.breathPattern,
        ...ex.cues,
        ex.precautions,
        ...ex.anatomyInsight.benefitsKo,
        ex.anatomyInsight.springMechanicsKo,
        ...ex.anatomyInsight.commonFaultsKo.flatMap((f) => [f.fault, f.fixCue]),
      ].join(' | ');
      expect(PROHIBITED_MEDICAL_RX.test(combinedText)).toBe(false);
    }
  });

  it('includes strong intermediate/advanced classical repertoire and cross-discipline fusion tags', () => {
    const intermediateAndAdvanced =
      WORLD_REPERTOIRE_STATS.byLevel['1.5'] + WORLD_REPERTOIRE_STATS.byLevel['2.0'];
    expect(intermediateAndAdvanced / WORLD_REPERTOIRE_STATS.totalCount).toBeGreaterThan(0.5);

    expect(WORLD_REPERTOIRE_STATS.bySchool['fusion-barre']).toBeGreaterThanOrEqual(20);
    expect(WORLD_REPERTOIRE_STATS.bySchool['fusion-athletic']).toBeGreaterThanOrEqual(20);
    expect(WORLD_REPERTOIRE_STATS.bySchool['fusion-mobility']).toBeGreaterThanOrEqual(20);
    expect(PILATES_SCHOOL_LABELS['fusion-barre'].group).toBe('fusion');
    expect(PILATES_SCHOOL_LABELS['fusion-athletic'].group).toBe('fusion');
    expect(PILATES_SCHOOL_LABELS['fusion-mobility'].group).toBe('fusion');

    // Verify iconic advanced & fusion additions exist
    expect(WORLD_PILATES_BY_ID.has('world-reformer-reformer-star')).toBe(true);
    expect(WORLD_PILATES_BY_ID.has('world-reformer-reformer-arabesque')).toBe(true);
    expect(WORLD_PILATES_BY_ID.has('world-chair-chair-tendon-stretch')).toBe(true);
    expect(WORLD_PILATES_BY_ID.has('world-barrel-barrel-layout-extension')).toBe(true);
    expect(WORLD_PILATES_BY_ID.has('world-reformer-fusion-athletic-reformer-pallof-press')).toBe(true);
    expect(WORLD_PILATES_BY_ID.has('world-reformer-fusion-athletic-reformer-copenhagen')).toBe(true);
    expect(WORLD_PILATES_BY_ID.has('world-mat-fusion-mobility-9090-hip-switch')).toBe(true);
    expect(WORLD_PILATES_BY_ID.has('world-reformer-fusion-barre-footbar-plie-pulse')).toBe(true);
  });

  it('returns immediate 4-panel anatomy insight even for raw legacy 218 exercises', () => {
    for (const rawLegacy of [INITIAL_EXERCISES[0]!, INITIAL_EXERCISES[70]!, GLOBAL_CRAWLED_REPERTOIRE_EXERCISES[0]!]) {
      const insight = getExerciseAnatomyInsight(rawLegacy);
      expect(insight.agonistsKo.length).toBeGreaterThan(0);
      expect(insight.stabilizersKo.length).toBeGreaterThan(0);
      expect(insight.benefitsKo.length).toBeGreaterThanOrEqual(2);
      expect(insight.springMechanicsKo.length).toBeGreaterThan(10);
      expect(insight.commonFaultsKo).toHaveLength(2);
      expect(['core', 'glutes', 'spine', 'shoulder', 'lateral', 'hip']).toContain(
        insight.anatomyVisualZone,
      );
    }
  });

  it('builds complete progression trees from both atomic and variation IDs', () => {
    const baseId = 'world-reformer-reformer-wheelbarrow';
    const tree = getProgressionTree(baseId);
    expect(tree.archetypeId).toBe(baseId);
    expect(tree.base?.id).toBe(baseId);
    expect(tree.allFamilyNodes.length).toBeGreaterThanOrEqual(2);

    const childNode = tree.allFamilyNodes.find((n) => n.id !== baseId)!;
    const fromChild = getProgressionTree(childNode.id);
    expect(fromChild.archetypeId).toBe(baseId);
    expect(fromChild.base?.id).toBe(baseId);

    const missing = getProgressionTree('non-existent-id');
    expect(missing.current).toBeNull();
    expect(missing.allFamilyNodes).toHaveLength(0);
  });
});

describe('4-Tier Composable Hierarchy Engine', () => {
  it('Tier 1: remixes with a prop and apparatus change without borrowing an unrelated video', () => {
    const base = WORLD_PILATES_BY_ID.get('world-mat-dead-bug-core')!;
    const remixed = remixExerciseVariation(base, {
      prop: 'mini-ball',
      modifier: 'single-leg',
      apparatus: 'reformer',
    });

    expect(remixed.tier).toBe('variation');
    expect(remixed.parentArchetypeId).toBe(base.id);
    expect(remixed.apparatus).toBe('reformer');
    expect(remixed.props).toContain('mini-ball');
    expect(remixed.isUnilateral).toBe(true);
    expect(remixed.level).toBe('1.5');
    expect(remixed.springs).toBe('1R 1B');
    expect(remixed.cues).toHaveLength(3);
    expect(remixed.youtube.videoId).toBe('');
    expect(remixed.youtube.url).toBe('');

    // Light-spring remix on Reformer accurately shifts spring lighter and updates springMechanicsKo
    const plank = WORLD_PILATES_BY_ID.get('expanded-reformer-long-stretch')!;
    const lightPlank = remixExerciseVariation(plank, { modifier: 'light-spring' });
    expect(lightPlank.level).toBe('2.0');
    expect(lightPlank.anatomyInsight.springMechanicsKo).toContain('보조를 줄였기 때문에');
  });

  it('Tier 2: provides 25+ golden micro-flow combos across all 5 apparatuses with 100% valid IDs and step expansion', () => {
    expect(GOLDEN_MICRO_FLOW_COMBOS.length).toBeGreaterThanOrEqual(25);
    const apparatuses = new Set(GOLDEN_MICRO_FLOW_COMBOS.map((c) => c.apparatus));
    expect(apparatuses).toEqual(new Set(['reformer', 'cadillac', 'chair', 'barrel', 'mat']));

    for (const combo of GOLDEN_MICRO_FLOW_COMBOS) {
      expect(combo.exerciseIds.length).toBeGreaterThanOrEqual(3);
      expect(combo.exerciseIds.length).toBeLessThanOrEqual(4);
      for (const id of combo.exerciseIds) {
        const ex = WORLD_PILATES_BY_ID.get(id);
        expect(ex).toBeDefined();
        expect(ex?.apparatus).toBe(combo.apparatus);
      }
      const steps = expandComboToSequenceSteps(combo);
      expect(steps).toHaveLength(combo.exerciseIds.length);
      expect(steps[0]?.sourceBlockId).toBe(combo.id);
    }
  });

  it('Tier 3: recommends 3 zero/minimal-transition next movements excluding existing IDs', () => {
    const footwork = WORLD_PILATES_BY_ID.get('world-reformer-footwork-toes-parallel')!;
    const existing = ['world-reformer-footwork-arches'];
    const recs = recommendZeroTransitionNext(footwork, WORLD_PILATES_EXERCISES, existing, 3);

    expect(recs).toHaveLength(3);
    for (const rec of recs) {
      expect(rec.exercise.id).not.toBe(footwork.id);
      expect(existing).not.toContain(rec.exercise.id);
      expect(rec.sameApparatus).toBe(true);
      expect(rec.transitionCost).toBeLessThanOrEqual(10);
      expect(rec.reasonKo.length).toBeGreaterThan(8);
    }
    expect(computeExerciseTransitionCost(footwork, recs[0]!.exercise).samePosition).toBe(true);
  });

  it('Tier 4: provides 12 curated multi-week programs with 100% valid exercise & combo references', () => {
    expect(CURATED_MULTI_WEEK_PROGRAMS.length).toBeGreaterThanOrEqual(12);
    for (const prog of CURATED_MULTI_WEEK_PROGRAMS) {
      expect(prog.weeks).toHaveLength(prog.durationWeeks);
      for (const week of prog.weeks) {
        expect(week.exerciseIds.length).toBeGreaterThanOrEqual(5);
        for (const exId of week.exerciseIds) {
          expect(WORLD_PILATES_BY_ID.has(exId)).toBe(true);
        }
        for (const comboId of week.recommendedComboIds) {
          expect(GOLDEN_COMBOS_BY_ID.has(comboId)).toBe(true);
        }
      }
    }
  });

  it('Tier 4: auto-generates a progressive 4-week curriculum from a single class while preserving locked/rest steps', () => {
    const week1: SequenceStep[] = [
      { stepId: 's1', order: 1, blockCategory: 'warmup', exerciseId: 'ex-warmup-01', durationMin: 4, selectedLayer: 'standard', locked: true },
      { stepId: 's2', order: 2, blockCategory: 'footwork', exerciseId: 'world-reformer-footwork-toes-parallel', durationMin: 6, selectedLayer: 'standard' },
      { stepId: 's3', order: 3, blockCategory: 'core', exerciseId: 'world-reformer-reformer-hundred-classic', durationMin: 6, selectedLayer: 'standard' },
      { stepId: 's4', order: 4, kind: 'rest', blockCategory: 'core', exerciseId: '', durationMin: 1, selectedLayer: 'standard' },
      { stepId: 's5', order: 5, blockCategory: 'lower-body', exerciseId: 'ex-lower-01', durationMin: 8, selectedLayer: 'standard' },
      { stepId: 's6', order: 6, blockCategory: 'cooldown', exerciseId: 'ex-cooldown-01', durationMin: 4, selectedLayer: 'standard' },
    ];

    const plan = generateFourWeekProgram(week1, WORLD_PILATES_EXERCISES);
    expect(plan.weeks).toHaveLength(4);
    expect(plan.apparatus).toBe('reformer');

    for (const week of plan.weeks) {
      expect(week.steps).toHaveLength(week1.length);
      // Locked step & rest step stay strictly intact across all 4 weeks
      expect(week.steps[0]?.exerciseId).toBe('ex-warmup-01');
      expect(week.steps[3]?.kind).toBe('rest');
    }

    // Weeks 2~4 evolve main-block exercises
    expect(plan.weeks[1]!.mutatedExercises.length).toBeGreaterThan(0);
    expect(plan.weeks[2]!.mutatedExercises.length).toBeGreaterThan(0);
    expect(plan.weeks[3]!.mutatedExercises.length).toBeGreaterThan(0);
    expect(plan.weeks[2]!.steps[1]!.exerciseId).not.toBe(week1[1]!.exerciseId);
  });

  it('Tier 4: replaces last-week repeated exercises in 1 tap while respecting locked and rest steps', () => {
    const steps: SequenceStep[] = [
      { stepId: 'a', order: 1, blockCategory: 'warmup', exerciseId: 'ex-warmup-01', durationMin: 4, selectedLayer: 'standard', locked: true },
      { stepId: 'b', order: 2, blockCategory: 'footwork', exerciseId: 'world-reformer-footwork-toes-parallel', durationMin: 6, selectedLayer: 'standard' },
      { stepId: 'c', order: 3, blockCategory: 'lower-body', exerciseId: 'ex-lower-01', durationMin: 8, selectedLayer: 'standard' },
      { stepId: 'd', order: 4, kind: 'rest', blockCategory: 'core', exerciseId: '', durationMin: 1, selectedLayer: 'standard' },
    ];
    const recentIds = ['ex-warmup-01', 'world-reformer-footwork-toes-parallel', 'ex-lower-01'];

    const res = replaceRepeatedFromLastWeek(steps, recentIds, WORLD_PILATES_EXERCISES);
    expect(res.replacedCount).toBe(2);
    expect(res.keptLockedIds).toEqual(['a']);
    expect(res.steps[0]?.exerciseId).toBe('ex-warmup-01');
    expect(res.steps[3]?.kind).toBe('rest');

    for (const rep of res.replacements) {
      expect(recentIds).not.toContain(rep.nextExerciseId);
      const nextEx = WORLD_PILATES_BY_ID.get(rep.nextExerciseId)!;
      expect(nextEx.apparatus).toBe('reformer');
    }
  });

  it('Tier 4: finds biomechanically safe Plan B alternatives for wrist, neck, knee, easier, and harder constraints', () => {
    const plank = WORLD_PILATES_BY_ID.get('expanded-reformer-long-stretch')!;
    const wristAlt = findPlanBAlternative(plank, 'wrist', WORLD_PILATES_EXERCISES);
    expect(wristAlt.primary).not.toBeNull();
    expect(wristAlt.primary!.exercise.bodyPosition).not.toBe('quadruped');
    expect(wristAlt.primary!.exercise.blockCategory).not.toBe('plank');

    const hundred = WORLD_PILATES_BY_ID.get('world-reformer-reformer-hundred-classic')!;
    const neckAlt = findPlanBAlternative(hundred, 'neck', WORLD_PILATES_EXERCISES);
    expect(neckAlt.primary).not.toBeNull();
    expect(neckAlt.primary!.exercise.nameEn.toLowerCase()).not.toContain('hundred');
    expect(neckAlt.primary!.exercise.nameEn.toLowerCase()).not.toContain('chest lift');

    const lunge = WORLD_PILATES_BY_ID.get('world-reformer-reformer-standing-lunge')!;
    const kneeAlt = findPlanBAlternative(lunge, 'knee', WORLD_PILATES_EXERCISES);
    expect(kneeAlt.primary).not.toBeNull();
    expect(kneeAlt.primary!.exercise.bodyPosition).not.toBe('kneeling');
    expect(kneeAlt.primary!.exercise.nameEn.toLowerCase()).not.toContain('lunge');

    const easierAlt = findPlanBAlternative(plank, 'easier', WORLD_PILATES_EXERCISES);
    expect(easierAlt.primary).not.toBeNull();
    expect(['1.0', '1.5']).toContain(easierAlt.primary!.exercise.level);

    const easyFootwork = WORLD_PILATES_BY_ID.get('world-reformer-footwork-toes-parallel')!;
    const harderAlt = findPlanBAlternative(easyFootwork, 'harder', WORLD_PILATES_EXERCISES);
    expect(harderAlt.primary).not.toBeNull();
    expect(['1.5', '2.0']).toContain(harderAlt.primary!.exercise.level);
  });
});
