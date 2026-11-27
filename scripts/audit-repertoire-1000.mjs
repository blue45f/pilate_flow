/**
 * Automated QA Audit for World Pilates 1,000+ Repertoire & 4-Tier Composable Hierarchy Engine.
 * Verifies count, uniqueness, medical/slop phrase ban, anatomy metadata completeness,
 * biomechanical spring/box coherence, source-matched YouTube catalog videoIds, and 4-tier referential integrity.
 */
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(SCRIPT_DIR, '..');

const VALID_APPARATUS = new Set(['reformer', 'cadillac', 'chair', 'barrel', 'mat']);
const VALID_POSITIONS = new Set([
  'supine',
  'prone',
  'side-lying',
  'seated',
  'kneeling',
  'standing',
  'quadruped',
]);
const VALID_BLOCKS = new Set([
  'warmup',
  'footwork',
  'bridging',
  'core',
  'upper-body',
  'lower-body',
  'plank',
  'extension',
  'feet-in-straps',
  'cooldown',
]);
const VALID_LEVELS = new Set(['1.0', '1.5', '2.0']);
const VALID_VISUAL_ZONES = new Set(['core', 'glutes', 'spine', 'shoulder', 'lateral', 'hip']);
const VALID_SCHOOL_TAGS = new Set([
  'classical',
  'stott',
  'balanced-body',
  'basi',
  'korean-studio',
  'fusion-barre',
  'fusion-athletic',
  'fusion-mobility',
]);

const PROHIBITED_MEDICAL_RX =
  /진단|치료|완치|치유|처방|교정|환자|병원\s*대신|질병|통증\s*제거|의학적\s*효과|의학이/i;
const PROHIBITED_SLOP_RX =
  /하는\s*것을\s*가능하게|직관적인\s*경험을\s*제공|원활한\s*워크플로우를\s*보장/i;
const REFORMER_SPRING_CODE_RX = /\b(?:[1-4]R|[1-4]B|[1-4]Y)\b/;

async function loadIndependentVerifiedVideoIds(server) {
  const jsonFiles = [
    'src/data/verifiedPilatesYouTubeCatalog.json',
    'src/data/expandedPilatesVideoCatalog.json',
    'src/data/creatorPilatesVideoCatalog.json',
    'src/data/additionalPilatesVideoCatalog.json',
  ];
  const ids = new Set();
  for (const rel of jsonFiles) {
    const raw = JSON.parse(await readFile(path.join(ROOT, rel), 'utf8'));
    for (const item of raw) {
      if (typeof item?.videoId === 'string' && /^[A-Za-z0-9_-]{11}$/.test(item.videoId)) {
        ids.add(item.videoId);
      }
    }
  }
  const { CRAWLED_YOUTUBE_DISCOVERY_POOL } = await server.ssrLoadModule(
    '/src/data/globalCrawledRepertoirePack.ts',
  );
  for (const item of CRAWLED_YOUTUBE_DISCOVERY_POOL) {
    if (typeof item?.videoId === 'string' && /^[A-Za-z0-9_-]{11}$/.test(item.videoId)) {
      ids.add(item.videoId);
    }
  }
  return ids;
}

async function runAudit() {
  const failures = [];
  const fail = (message) => failures.push(message);

  const server = await createServer({
    root: ROOT,
    configFile: false,
    optimizeDeps: { noDiscovery: true, include: [] },
    server: { middlewareMode: true, watch: null },
    logLevel: 'error',
  });

  try {
    const { INITIAL_EXERCISES } = await server.ssrLoadModule('/src/data/pilatesCatalog.ts');
    const { GLOBAL_CRAWLED_REPERTOIRE_EXERCISES } = await server.ssrLoadModule(
      '/src/data/globalCrawledRepertoirePack.ts',
    );
    const repertoireMod = await server.ssrLoadModule('/src/data/worldPilatesRepertoire1000.ts');
    const engineMod = await server.ssrLoadModule('/src/utils/composableHierarchyEngine.ts');

    const {
      WORLD_PILATES_EXERCISES,
      WORLD_PILATES_BY_ID,
      WORLD_REPERTOIRE_STATS,
      getExerciseAnatomyInsight,
      getProgressionTree,
    } = repertoireMod;

    const {
      GOLDEN_MICRO_FLOW_COMBOS,
      GOLDEN_COMBOS_BY_ID,
      CURATED_MULTI_WEEK_PROGRAMS,
      remixExerciseVariation,
      recommendZeroTransitionNext,
      generateFourWeekProgram,
      replaceRepeatedFromLastWeek,
      findPlanBAlternative,
    } = engineMod;

    const independentVideoIds = await loadIndependentVerifiedVideoIds(server);

    // 1. Existing core preservation & total scale
    if (INITIAL_EXERCISES.length !== 158) {
      fail(`INITIAL_EXERCISES count changed: expected 158, got ${INITIAL_EXERCISES.length}`);
    }
    if (GLOBAL_CRAWLED_REPERTOIRE_EXERCISES.length !== 60) {
      fail(
        `GLOBAL_CRAWLED_REPERTOIRE_EXERCISES count changed: expected 60, got ${GLOBAL_CRAWLED_REPERTOIRE_EXERCISES.length}`,
      );
    }
    if (WORLD_PILATES_EXERCISES.length < 1050) {
      fail(`WORLD_PILATES_EXERCISES must have >= 1,050 items, got ${WORLD_PILATES_EXERCISES.length}`);
    }
    if (WORLD_REPERTOIRE_STATS.totalCount !== WORLD_PILATES_EXERCISES.length) {
      fail('WORLD_REPERTOIRE_STATS.totalCount mismatch');
    }

    const legacyIds = [
      ...INITIAL_EXERCISES.map((e) => e.id),
      ...GLOBAL_CRAWLED_REPERTOIRE_EXERCISES.map((e) => e.id),
    ];
    for (const legacyId of legacyIds) {
      const found = WORLD_PILATES_BY_ID.get(legacyId);
      if (!found) {
        fail(`Missing legacy core exercise in WORLD_PILATES_EXERCISES: ${legacyId}`);
      } else if (found.tier !== 'atomic') {
        fail(`Legacy core exercise ${legacyId} must have tier='atomic', got '${found.tier}'`);
      }
    }

    // 2. Per-exercise exhaustive audit
    const seenIds = new Set();
    const seenKo = new Set();
    const seenEn = new Set();

    for (const ex of WORLD_PILATES_EXERCISES) {
      if (!ex.id || seenIds.has(ex.id)) {
        fail(`Duplicate or empty exercise ID: ${ex.id}`);
      }
      seenIds.add(ex.id);

      const normKo = (ex.nameKo || '').normalize('NFKC').trim().toLowerCase();
      const normEn = (ex.nameEn || '').normalize('NFKC').trim().toLowerCase();
      if (!normKo || seenKo.has(normKo)) {
        fail(`Duplicate or empty nameKo on ${ex.id}: ${ex.nameKo}`);
      }
      seenKo.add(normKo);
      if (!normEn || seenEn.has(normEn)) {
        fail(`Duplicate or empty nameEn on ${ex.id}: ${ex.nameEn}`);
      }
      seenEn.add(normEn);

      if (!VALID_APPARATUS.has(ex.apparatus)) fail(`Invalid apparatus on ${ex.id}: ${ex.apparatus}`);
      if (!VALID_POSITIONS.has(ex.bodyPosition))
        fail(`Invalid bodyPosition on ${ex.id}: ${ex.bodyPosition}`);
      if (!VALID_BLOCKS.has(ex.blockCategory))
        fail(`Invalid blockCategory on ${ex.id}: ${ex.blockCategory}`);
      if (!VALID_LEVELS.has(ex.level)) fail(`Invalid level on ${ex.id}: ${ex.level}`);
      if (!VALID_SCHOOL_TAGS.has(ex.schoolTag))
        fail(`Invalid schoolTag on ${ex.id}: ${ex.schoolTag}`);
      if (ex.tier !== 'atomic' && ex.tier !== 'variation')
        fail(`Invalid tier on ${ex.id}: ${ex.tier}`);
      if (!ex.variationKind) fail(`Missing variationKind on ${ex.id}`);

      const parent = WORLD_PILATES_BY_ID.get(ex.parentArchetypeId);
      if (!parent || parent.tier !== 'atomic') {
        fail(`Invalid parentArchetypeId on ${ex.id}: ${ex.parentArchetypeId}`);
      }

      if (!Array.isArray(ex.cues) || ex.cues.length !== 3 || ex.cues.some((c) => !c?.trim())) {
        fail(`Exercise ${ex.id} must have exactly 3 non-empty studio cues`);
      }
      if (!ex.breathPattern?.trim()) fail(`Missing breathPattern on ${ex.id}`);
      if (!ex.precautions?.trim()) fail(`Missing precautions on ${ex.id}`);
      if (!ex.springs?.trim()) fail(`Missing springs on ${ex.id}`);
      if (!ex.layers?.easy?.trim() || !ex.layers?.standard?.trim() || !ex.layers?.hard?.trim()) {
        fail(`Incomplete easy/standard/hard layers on ${ex.id}`);
      }
      if (!Array.isArray(ex.spinalPlanes) || ex.spinalPlanes.length === 0) {
        fail(`Missing spinalPlanes on ${ex.id}`);
      }
      if (!Array.isArray(ex.props) || ex.props.length === 0) {
        fail(`Missing props on ${ex.id}`);
      }
      if (!Array.isArray(ex.targetMuscles) || ex.targetMuscles.length === 0) {
        fail(`Missing targetMuscles on ${ex.id}`);
      }

      // Biomechanical spring & box sanity
      if ((ex.box === 'long-box' || ex.box === 'short-box') && ex.apparatus !== 'reformer') {
        fail(`Non-reformer exercise ${ex.id} cannot use box='${ex.box}'`);
      }
      if ((ex.apparatus === 'mat' || ex.apparatus === 'barrel') && REFORMER_SPRING_CODE_RX.test(ex.springs)) {
        fail(`Mat/Barrel exercise ${ex.id} has Reformer spring code: ${ex.springs}`);
      }

      // Anatomy insight completeness
      const ai = ex.anatomyInsight;
      if (!ai) {
        fail(`Missing anatomyInsight on ${ex.id}`);
      } else {
        if (!Array.isArray(ai.agonistsKo) || ai.agonistsKo.length === 0) {
          fail(`Empty agonistsKo on ${ex.id}`);
        }
        if (!Array.isArray(ai.stabilizersKo) || ai.stabilizersKo.length === 0) {
          fail(`Empty stabilizersKo on ${ex.id}`);
        }
        if (!Array.isArray(ai.benefitsKo) || ai.benefitsKo.length < 2 || ai.benefitsKo.length > 3) {
          fail(`benefitsKo must have 2~3 items on ${ex.id}`);
        }
        if (!ai.springMechanicsKo || ai.springMechanicsKo.trim().length < 10) {
          fail(`Missing or too-short springMechanicsKo on ${ex.id}`);
        }
        if (
          !Array.isArray(ai.commonFaultsKo) ||
          ai.commonFaultsKo.length !== 2 ||
          ai.commonFaultsKo.some((f) => !f?.fault?.trim() || !f?.fixCue?.trim())
        ) {
          fail(`commonFaultsKo must have exactly 2 complete fault/fixCue entries on ${ex.id}`);
        }
        if (!VALID_VISUAL_ZONES.has(ai.anatomyVisualZone)) {
          fail(`Invalid anatomyVisualZone on ${ex.id}: ${ai.anatomyVisualZone}`);
        }
      }

      // Verified YouTube videoId (0 fabricated IDs)
      const videoId = ex.youtube?.videoId?.trim() ?? '';
      if (videoId ? !/^[A-Za-z0-9_-]{11}$/.test(videoId) || !independentVideoIds.has(videoId) : ex.youtube?.url) {
        fail(`Unverified or fabricated YouTube videoId on ${ex.id}: '${videoId}'`);
      }

      // Prohibited medical & translationese scan
      const allText = [
        ex.nameKo,
        ex.breathPattern,
        ...ex.cues,
        ex.precautions,
        ex.layers.easy,
        ex.layers.standard,
        ex.layers.hard,
        ...(ai?.benefitsKo ?? []),
        ai?.springMechanicsKo ?? '',
        ...(ai?.commonFaultsKo ?? []).flatMap((f) => [f.fault, f.fixCue]),
      ].join(' | ');

      const medMatch = allText.match(PROHIBITED_MEDICAL_RX);
      if (medMatch) {
        fail(`Prohibited medical wording '${medMatch[0]}' in exercise ${ex.id}`);
      }
      const slopMatch = allText.match(PROHIBITED_SLOP_RX);
      if (slopMatch) {
        fail(`Prohibited translationese slop '${slopMatch[0]}' in exercise ${ex.id}`);
      }
    }

    // 3. Intermediate/Advanced & Fusion coverage checks
    const advIntShare =
      (WORLD_REPERTOIRE_STATS.byLevel['1.5'] + WORLD_REPERTOIRE_STATS.byLevel['2.0']) /
      WORLD_REPERTOIRE_STATS.totalCount;
    if (advIntShare < 0.5) {
      fail(`Intermediate + Advanced share too low: ${(advIntShare * 100).toFixed(1)}%`);
    }
    for (const fusionSchool of ['fusion-barre', 'fusion-athletic', 'fusion-mobility']) {
      if ((WORLD_REPERTOIRE_STATS.bySchool[fusionSchool] ?? 0) < 20) {
        fail(`Insufficient coverage for ${fusionSchool}: ${WORLD_REPERTOIRE_STATS.bySchool[fusionSchool]}`);
      }
    }

    // 4. Tier 2 Combos referential & text integrity
    if (GOLDEN_MICRO_FLOW_COMBOS.length < 25) {
      fail(`GOLDEN_MICRO_FLOW_COMBOS must have >= 25 combos, got ${GOLDEN_MICRO_FLOW_COMBOS.length}`);
    }
    const comboIds = new Set();
    const comboApparatusCoverage = new Set();
    for (const combo of GOLDEN_MICRO_FLOW_COMBOS) {
      if (comboIds.has(combo.id)) fail(`Duplicate combo ID: ${combo.id}`);
      comboIds.add(combo.id);
      comboApparatusCoverage.add(combo.apparatus);
      if (combo.exerciseIds.length < 3 || combo.exerciseIds.length > 4) {
        fail(`Combo ${combo.id} must have 3~4 exercises, got ${combo.exerciseIds.length}`);
      }
      const uniqueComboEx = new Set(combo.exerciseIds);
      if (uniqueComboEx.size !== combo.exerciseIds.length) {
        fail(`Combo ${combo.id} contains duplicate exerciseIds`);
      }
      for (const exId of combo.exerciseIds) {
        const ex = WORLD_PILATES_BY_ID.get(exId);
        if (!ex) {
          fail(`Combo ${combo.id} references unknown exerciseId: ${exId}`);
        } else if (ex.apparatus !== combo.apparatus) {
          fail(
            `Combo ${combo.id} (${combo.apparatus}) references mismatched apparatus exercise ${exId} (${ex.apparatus})`,
          );
        }
      }
      const comboText = `${combo.titleKo} ${combo.subtitleKo} ${combo.transitionSummaryKo} ${combo.flowCueKo}`;
      const med = comboText.match(PROHIBITED_MEDICAL_RX);
      if (med) fail(`Prohibited medical wording '${med[0]}' in combo ${combo.id}`);
    }
    for (const app of VALID_APPARATUS) {
      if (!comboApparatusCoverage.has(app)) {
        fail(`GOLDEN_MICRO_FLOW_COMBOS missing coverage for apparatus: ${app}`);
      }
    }

    // 5. Tier 4 Multi-Week Programs referential & text integrity
    if (CURATED_MULTI_WEEK_PROGRAMS.length < 12) {
      fail(`CURATED_MULTI_WEEK_PROGRAMS must have >= 12 programs, got ${CURATED_MULTI_WEEK_PROGRAMS.length}`);
    }
    const progIds = new Set();
    for (const prog of CURATED_MULTI_WEEK_PROGRAMS) {
      if (progIds.has(prog.id)) fail(`Duplicate program ID: ${prog.id}`);
      progIds.add(prog.id);
      if (prog.weeks.length !== prog.durationWeeks) {
        fail(`Program ${prog.id} weeks.length (${prog.weeks.length}) !== durationWeeks (${prog.durationWeeks})`);
      }
      for (const week of prog.weeks) {
        if (week.exerciseIds.length < 5) {
          fail(`Program ${prog.id} week ${week.weekNumber} has too few exercises (${week.exerciseIds.length})`);
        }
        for (const exId of week.exerciseIds) {
          if (!WORLD_PILATES_BY_ID.has(exId)) {
            fail(`Program ${prog.id} week ${week.weekNumber} references unknown exerciseId: ${exId}`);
          }
        }
        for (const cId of week.recommendedComboIds) {
          if (!GOLDEN_COMBOS_BY_ID.has(cId)) {
            fail(`Program ${prog.id} week ${week.weekNumber} references unknown comboId: ${cId}`);
          }
        }
        const weekText = `${week.themeKo} ${week.weeklyGoalKo} ${week.progressionNoteKo}`;
        const med = weekText.match(PROHIBITED_MEDICAL_RX);
        if (med) fail(`Prohibited medical wording '${med[0]}' in program ${prog.id} week ${week.weekNumber}`);
      }
      const progText = `${prog.titleKo} ${prog.subtitleKo} ${prog.summaryKo}`;
      const med = progText.match(PROHIBITED_MEDICAL_RX);
      if (med) fail(`Prohibited medical wording '${med[0]}' in program ${prog.id}`);
    }

    // 6. Runtime smoke checks across all exported API functions
    const sampleLegacy = INITIAL_EXERCISES[0];
    const legacyInsight = getExerciseAnatomyInsight(sampleLegacy);
    if (!legacyInsight || legacyInsight.benefitsKo.length < 2 || legacyInsight.commonFaultsKo.length !== 2) {
      fail('getExerciseAnatomyInsight failed on legacy INITIAL_EXERCISES[0]');
    }

    const sampleTree = getProgressionTree('world-reformer-footwork-toes-parallel');
    if (!sampleTree.base || sampleTree.allFamilyNodes.length < 2) {
      fail('getProgressionTree failed to build multi-node family tree');
    }

    const remixed = remixExerciseVariation(sampleLegacy, {
      prop: 'magic-circle',
      modifier: 'single-leg',
      apparatus: 'reformer',
    });
    if ((remixed.youtube.videoId && !independentVideoIds.has(remixed.youtube.videoId)) || remixed.cues.length !== 3) {
      fail('remixExerciseVariation produced invalid videoId or cues');
    }

    const nextRecs = recommendZeroTransitionNext(
      WORLD_PILATES_BY_ID.get('world-reformer-footwork-toes-parallel'),
      WORLD_PILATES_EXERCISES,
      [],
    );
    if (nextRecs.length !== 3 || nextRecs[0].transitionCost > 10) {
      fail('recommendZeroTransitionNext failed to return 3 low-transition recommendations');
    }

    const baseSteps = [
      { stepId: 's1', order: 1, blockCategory: 'warmup', exerciseId: 'ex-warmup-01', durationMin: 4, selectedLayer: 'standard' },
      { stepId: 's2', order: 2, blockCategory: 'footwork', exerciseId: 'world-reformer-footwork-toes-parallel', durationMin: 6, selectedLayer: 'standard' },
      { stepId: 's3', order: 3, blockCategory: 'core', exerciseId: 'world-reformer-reformer-hundred-classic', durationMin: 6, selectedLayer: 'standard' },
      { stepId: 's4', order: 4, blockCategory: 'lower-body', exerciseId: 'ex-lower-01', durationMin: 8, selectedLayer: 'standard' },
      { stepId: 's5', order: 5, blockCategory: 'cooldown', exerciseId: 'ex-cooldown-01', durationMin: 4, selectedLayer: 'standard' },
    ];
    const fourWeek = generateFourWeekProgram(baseSteps, WORLD_PILATES_EXERCISES);
    if (fourWeek.weeks.length !== 4 || fourWeek.weeks[2].mutatedExercises.length === 0) {
      fail('generateFourWeekProgram failed to produce progressive 4-week variations');
    }

    const replaced = replaceRepeatedFromLastWeek(
      baseSteps,
      ['world-reformer-footwork-toes-parallel', 'ex-lower-01'],
      WORLD_PILATES_EXERCISES,
    );
    if (replaced.replacedCount !== 2) {
      fail(`replaceRepeatedFromLastWeek expected 2 replacements, got ${replaced.replacedCount}`);
    }

    const planBSource = WORLD_PILATES_BY_ID.get('expanded-reformer-long-stretch');
    for (const constraint of ['wrist', 'neck', 'knee', 'easier', 'harder']) {
      const res = findPlanBAlternative(planBSource, constraint, WORLD_PILATES_EXERCISES);
      if (!res.primary) {
        fail(`findPlanBAlternative returned null primary for constraint '${constraint}'`);
      }
    }

    if (failures.length > 0) {
      console.error(`\n[AUDIT FAILED] ${failures.length} violation(s) found:`);
      for (const msg of failures.slice(0, 40)) {
        console.error(`  - ${msg}`);
      }
      if (failures.length > 40) {
        console.error(`  ... and ${failures.length - 40} more`);
      }
      process.exitCode = 1;
      return;
    }

    console.log('\n[AUDIT PASSED] World Pilates 1,000+ Repertoire & 4-Tier Hierarchy Engine');
    console.log(
      JSON.stringify(
        {
          totalExercises: WORLD_REPERTOIRE_STATS.totalCount,
          atomicArchetypes: WORLD_REPERTOIRE_STATS.atomicCount,
          variations: WORLD_REPERTOIRE_STATS.variationCount,
          existingCorePreserved: WORLD_REPERTOIRE_STATS.existingCoreCount,
          exercisesWithCatalogVideoId: `${WORLD_REPERTOIRE_STATS.verifiedVideoCount}/${WORLD_REPERTOIRE_STATS.totalCount} (independent allowlist: ${independentVideoIds.size})`,
          byApparatus: WORLD_REPERTOIRE_STATS.byApparatus,
          byLevel: WORLD_REPERTOIRE_STATS.byLevel,
          bySchool: WORLD_REPERTOIRE_STATS.bySchool,
          goldenMicroFlowCombos: GOLDEN_MICRO_FLOW_COMBOS.length,
          curatedMultiWeekPrograms: CURATED_MULTI_WEEK_PROGRAMS.length,
          duplicates: 0,
          prohibitedMedicalClaims: 0,
          prohibitedSlopPhrases: 0,
        },
        null,
        2,
      ),
    );
  } finally {
    await server.close();
  }
}

runAudit().catch((error) => {
  console.error('[AUDIT CRASHED]', error);
  process.exitCode = 1;
});
