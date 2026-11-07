import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import './ts-loader-hooks.mjs';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = path.resolve(__dirname, '../../..');
export const AUDIT_DIR = path.resolve(__dirname, '..');
/**
 * Loads the read-only baseline modules from `src/` without modifying any file.
 */
export async function loadReadOnlySemanticAuditModules() {
  const catalogUrl = pathToFileURL(
    path.join(REPO_ROOT, 'src/data/pilatesCatalog.ts'),
  ).href;
  const rigCatalogUrl = pathToFileURL(
    path.join(REPO_ROOT, 'src/data/movementVisualRigCatalog.ts'),
  ).href;
  const sourceAuditUrl = pathToFileURL(
    path.join(REPO_ROOT, 'src/data/movementVisualSourceAudit.ts'),
  ).href;
  const svgUrl = pathToFileURL(
    path.join(REPO_ROOT, 'src/components/MovementPhaseDiagramSvg.tsx'),
  ).href;
  const coverageUrl = pathToFileURL(
    path.join(REPO_ROOT, 'src/features/motionCoverage/adapters.ts'),
  ).href;
  const trackAUrl = pathToFileURL(
    path.join(REPO_ROOT, 'src/features/motionEvidenceReview/trackAMatEvidence.ts'),
  ).href;
  const trackBUrl = pathToFileURL(
    path.join(REPO_ROOT, 'src/features/motionEvidenceReview/trackBApparatusEvidence.ts'),
  ).href;
  const [
    catalogMod,
    rigCatalogMod,
    sourceAuditMod,
    svgMod,
    coverageMod,
    trackAMod,
    trackBMod,
  ] = await Promise.all([
    import(catalogUrl),
    import(rigCatalogUrl),
    import(sourceAuditUrl),
    import(svgUrl),
    import(coverageUrl),
    import(trackAUrl),
    import(trackBUrl),
  ]);
  return {
    catalogMod,
    rigCatalogMod,
    sourceAuditMod,
    svgMod,
    coverageMod,
    trackAMod,
    trackBMod,
  };
}
import {
  ALREADY_RESOLVED_EXCLUSIONS,
  RESIDUAL_SEMANTIC_MISMATCH_PART1,
} from "./mismatch-catalog-part1.mjs";
import {
  RESIDUAL_SEMANTIC_MISMATCH_PART2,
  SINGLETON_RESIDUAL_NOTE,
} from "./mismatch-catalog-part2.mjs";
export { ALREADY_RESOLVED_EXCLUSIONS, SINGLETON_RESIDUAL_NOTE };
export const RESIDUAL_SEMANTIC_MISMATCH_CATALOG = Object.freeze([
  ...RESIDUAL_SEMANTIC_MISMATCH_PART1,
  ...RESIDUAL_SEMANTIC_MISMATCH_PART2,
]);
const JOINT_KEYS = [
  'head',
  'neck',
  'shoulder',
  'elbow',
  'wrist',
  'hand',
  'thoracic',
  'lumbar',
  'pelvis',
  'hip',
  'knee',
  'ankle',
  'heel',
  'toe',
];
function round1(val) {
  return Math.round(val * 10) / 10;
}
export function computeExerciseJointDeltaRecord(exercise, asset, sourceComparison, evidenceMap) {
  const startJoints = asset.phases.start.joints;
  const middleJoints = asset.phases.middle.joints;
  const endJoints = asset.phases.end.joints;
  const jointDeltas = {};
  const movingRank = [];
  for (const key of JOINT_KEYS) {
    const s = startJoints[key];
    const m = middleJoints[key];
    const e = endJoints[key];
    if (!s || !m || !e) continue;
    const dx_sm = round1(m.x - s.x);
    const dy_sm = round1(m.y - s.y);
    const dist_sm = round1(Math.hypot(dx_sm, dy_sm));
    const dx_me = round1(e.x - m.x);
    const dy_me = round1(e.y - m.y);
    const dist_me = round1(Math.hypot(dx_me, dy_me));
    const dx_se = round1(e.x - s.x);
    const dy_se = round1(e.y - s.y);
    const dist_se = round1(Math.hypot(dx_se, dy_se));
    const maxPhaseDist = round1(Math.max(dist_sm, dist_me, dist_se));
    jointDeltas[key] = {
      start: { x: s.x, y: s.y },
      middle: { x: m.x, y: m.y },
      end: { x: e.x, y: e.y },
      dx_sm,
      dy_sm,
      dist_sm,
      dx_me,
      dy_me,
      dist_me,
      dx_se,
      dy_se,
      dist_se,
      maxPhaseDist,
    };
    movingRank.push({
      joint: key,
      dist_sm,
      dist_me,
      dist_se,
      maxPhaseDist,
      trajectory: `(${s.x},${s.y})→(${m.x},${m.y})→(${e.x},${e.y})`,
    });
  }
  movingRank.sort((a, b) => b.maxPhaseDist - a.maxPhaseDist);
  // Build verifiable public URLs only (exclude any 'blocked-by-sandbox-proxy-unverified')
  const urlMap = new Map();
  for (const link of sourceComparison.matchedReliableSources ?? []) {
    if (link.url && /^https?:\/\//.test(link.url)) {
      urlMap.set(link.url, {
        sourceId: link.id,
        titleKo: link.titleKo,
        publisherKo: link.publisherKo,
        url: link.url,
        verificationStatus: link.verificationStatusLabelKo,
      });
    }
  }
  const evRecord = evidenceMap.get(exercise.id);
  if (evRecord) {
    for (const src of evRecord.sources ?? []) {
      if (
        src.accessStatus !== 'blocked-by-sandbox-proxy-unverified' &&
        src.directUrl &&
        /^https?:\/\//.test(src.directUrl)
      ) {
        urlMap.set(src.directUrl, {
          sourceId: src.sourceId,
          titleKo: src.title,
          publisherKo: src.publisher,
          url: src.directUrl,
          verificationStatus: src.accessStatus,
        });
      }
    }
  }
  const coordinateSignature = JSON.stringify({
    archetypeId: asset.archetypeId,
    start: startJoints,
    middle: middleJoints,
    end: endJoints,
  });
  return {
    exerciseId: exercise.id,
    nameKo: exercise.nameKo,
    nameEn: exercise.nameEn,
    apparatus: exercise.apparatus,
    blockCategory: exercise.blockCategory,
    bodyPosition: exercise.bodyPosition,
    spinalPlanes: [...exercise.spinalPlanes],
    isUnilateral: exercise.isUnilateral,
    props: [...exercise.props],
    cues: [...exercise.cues],
    archetypeId: asset.archetypeId,
    archetypeTitleKo: asset.archetypeTitleKo,
    carriageOffsets: [
      asset.phases.start.apparatusState.carriageOffsetPx,
      asset.phases.middle.apparatusState.carriageOffsetPx,
      asset.phases.end.apparatusState.carriageOffsetPx,
    ],
    pedalAngles: [
      asset.phases.start.apparatusState.pedalAngleDeg,
      asset.phases.middle.apparatusState.pedalAngleDeg,
      asset.phases.end.apparatusState.pedalAngleDeg,
    ],
    phases: {
      start: startJoints,
      middle: middleJoints,
      end: endJoints,
    },
    jointDeltas,
    topMovingJoints: movingRank.slice(0, 5),
    stationaryJoints: movingRank.filter((j) => j.maxPhaseDist === 0).map((j) => j.joint),
    verifiablePublicSources: Array.from(urlMap.values()),
    truthfulnessBoundary: {
      anatomicalAccuracyAssumed: false,
      anatomicalVerificationCompleted: false,
      expertVerificationCompleted: false,
      professionalReviewCount: 0,
    },
    coordinateSignature,
  };
}
export async function runSemanticAuditAnalysis() {
  const {
    catalogMod,
    rigCatalogMod,
    sourceAuditMod,
    trackAMod,
    trackBMod,
  } = await loadReadOnlySemanticAuditModules();
  const exercises = catalogMod.INITIAL_EXERCISES;
  const evidenceMap = new Map();
  for (const r of [
    ...trackAMod.TRACK_A_MAT_EVIDENCE_RECORDS,
    ...trackBMod.TRACK_B_APPARATUS_EVIDENCE_RECORDS,
  ]) {
    evidenceMap.set(r.exerciseId, r);
  }
  // Lookup maps for mismatch classification & already-resolved exclusions
  const mismatchByExerciseId = new Map();
  for (const m of RESIDUAL_SEMANTIC_MISMATCH_CATALOG) {
    for (const exFinding of m.perExerciseFindings) {
      mismatchByExerciseId.set(exFinding.exerciseId, {
        mismatchId: m.mismatchId,
        rank: m.rank,
        severity: m.severity,
        ...exFinding,
      });
    }
  }
  const resolvedByExerciseId = new Map();
  for (const ex of ALREADY_RESOLVED_EXCLUSIONS) {
    for (const id of ex.exerciseIds) {
      const prev = resolvedByExerciseId.get(id) ?? [];
      prev.push(ex.fixId);
      resolvedByExerciseId.set(id, prev);
    }
  }
  const inventory = [];
  const groupsBySignature = new Map();
  for (const exercise of exercises) {
    const asset = rigCatalogMod.getMovementVisualAsset(exercise);
    const sourceComparison = sourceAuditMod.getVisualSourceComparison(exercise);
    const record = computeExerciseJointDeltaRecord(
      exercise,
      asset,
      sourceComparison,
      evidenceMap,
    );
    const mismatchInfo = mismatchByExerciseId.get(exercise.id) ?? null;
    const singletonNote =
      exercise.id === SINGLETON_RESIDUAL_NOTE.exerciseId
        ? SINGLETON_RESIDUAL_NOTE
        : null;
    const priorResolvedFixes = resolvedByExerciseId.get(exercise.id) ?? [];
    record.semanticClassification = mismatchInfo
      ? 'residual-semantic-mismatch'
      : singletonNote
        ? 'singleton-archetype-Carryover-note'
        : 'intentional-or-compatible-reuse';
    record.mismatchId = mismatchInfo
      ? mismatchInfo.mismatchId
      : singletonNote
        ? singletonNote.mismatchId
        : null;
    record.mismatchDetail = mismatchInfo;
    record.priorResolvedFixes = priorResolvedFixes;
    inventory.push(record);
    if (!groupsBySignature.has(record.coordinateSignature)) {
      groupsBySignature.set(record.coordinateSignature, []);
    }
    groupsBySignature.get(record.coordinateSignature).push(record);
  }
  // Build the 24 coordinate-trajectory groups
  const sortedGroups = Array.from(groupsBySignature.values()).sort(
    (a, b) => b.length - a.length || a[0].archetypeId.localeCompare(b[0].archetypeId),
  );
  const coordinateGroups = sortedGroups.map((members, idx) => {
    const sample = members[0];
    const mismatchedMembers = members.filter(
      (m) => m.semanticClassification === 'residual-semantic-mismatch',
    );
    const compatibleMembers = members.filter(
      (m) => m.semanticClassification !== 'residual-semantic-mismatch',
    );
    const apparatuses = Array.from(new Set(members.map((m) => m.apparatus)));
    const positions = Array.from(new Set(members.map((m) => m.bodyPosition)));
    const planes = Array.from(new Set(members.flatMap((m) => m.spinalPlanes)));
    const mismatchIds = Array.from(
      new Set(mismatchedMembers.map((m) => m.mismatchId).filter(Boolean)),
    );
    let groupDisposition = 'intentional-compatible-reuse';
    if (members.length === 1) {
      groupDisposition =
        sample.exerciseId === SINGLETON_RESIDUAL_NOTE.exerciseId
          ? 'singleton-with-follow-up-note'
          : 'isolated-singleton-resolved';
    } else if (mismatchedMembers.length > 0) {
      groupDisposition = 'contains-residual-semantic-mismatch';
    }
    return {
      groupIndex: idx + 1,
      groupId: `G-${String(idx + 1).padStart(2, '0')}`,
      archetypeId: sample.archetypeId,
      archetypeTitleKo: sample.archetypeTitleKo,
      memberCount: members.length,
      isSharedGroup: members.length > 1,
      groupDisposition,
      mismatchIds,
      apparatuses,
      bodyPositions: positions,
      spinalPlanes: planes,
      topMovingJoints: sample.topMovingJoints,
      stationaryJoints: sample.stationaryJoints,
      phaseKeyJoints: {
        head: sample.jointDeltas.head,
        shoulder: sample.jointDeltas.shoulder,
        hand: sample.jointDeltas.hand,
        thoracic: sample.jointDeltas.thoracic,
        lumbar: sample.jointDeltas.lumbar,
        pelvis: sample.jointDeltas.pelvis,
        knee: sample.jointDeltas.knee,
        ankle: sample.jointDeltas.ankle,
        heel: sample.jointDeltas.heel,
      },
      compatibleMemberIds: compatibleMembers.map((m) => m.exerciseId),
      mismatchedMemberIds: mismatchedMembers.map((m) => m.exerciseId),
      members: members.map((m) => ({
        exerciseId: m.exerciseId,
        nameKo: m.nameKo,
        nameEn: m.nameEn,
        apparatus: m.apparatus,
        blockCategory: m.blockCategory,
        bodyPosition: m.bodyPosition,
        spinalPlanes: m.spinalPlanes,
        semanticClassification: m.semanticClassification,
        mismatchId: m.mismatchId,
        priorResolvedFixes: m.priorResolvedFixes,
      })),
    };
  });
  // Remove verbose coordinateSignature string from final JSON items
  for (const item of inventory) {
    delete item.coordinateSignature;
  }
  const summary = {
    auditId: 'diagram-semantic-audit-round4-20261107',
    baselineCommit: 'ca38174',
    priorContactFixCommit: '55ce22d / b2d6022',
    totalExercisesAudited: inventory.length,
    totalCoordinateGroups: coordinateGroups.length,
    sharedCoordinateGroupsCount: coordinateGroups.filter((g) => g.isSharedGroup).length,
    singletonCoordinateGroupsCount: coordinateGroups.filter((g) => !g.isSharedGroup).length,
    intentionalCompatibleGroupsCount: coordinateGroups.filter(
      (g) => g.groupDisposition === 'intentional-compatible-reuse',
    ).length,
    residualMismatchGroupsCount: RESIDUAL_SEMANTIC_MISMATCH_CATALOG.length,
    residualMismatchedExercisesCount: inventory.filter(
      (i) => i.semanticClassification === 'residual-semantic-mismatch',
    ).length,
    singletonFollowUpNoteCount: 1,
     intentionalOrCompatibleExercisesCount: inventory.filter(
      (i) => i.semanticClassification === 'intentional-or-compatible-reuse',
    ).length,
    priorResolvedExclusionsCount: ALREADY_RESOLVED_EXCLUSIONS.length,
    truthfulnessBoundary: {
      anatomicalAccuracyAssumed: false,
      anatomicalVerificationCompleted: false,
      expertVerificationCompleted: false,
      clinicalSafetyGuaranteed: false,
      professionalReviewCount: 0,
      verifiableUrlsOnlyRecorded: true,
    },
  };
  return {
    summary,
    alreadyResolvedExclusions: ALREADY_RESOLVED_EXCLUSIONS,
    residualSemanticMismatchCatalog: RESIDUAL_SEMANTIC_MISMATCH_CATALOG,
    singletonResidualNote: SINGLETON_RESIDUAL_NOTE,
    coordinateGroups,
    inventory,
  };
}
