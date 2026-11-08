import { MOTION_PATTERN_REFERENCES } from '../../data/motionPatternReferences';
import { MOVEMENT_VISUAL_ASSET_MAP } from '../../data/movementVisualRigCatalog';
import { INITIAL_EXERCISES } from '../../data/pilatesCatalog';
import type { PilatesExercise } from '../../types/pilates';
import { TRACK_A_MAT_EVIDENCE_RECORDS } from './trackAMatEvidence';
import { TRACK_B_APPARATUS_EVIDENCE_RECORDS } from './trackBApparatusEvidence';
import { TRACK_C_EXTENDED_MAT_EVIDENCE_RECORDS } from './trackCExtendedMatEvidence';
import { TRACK_D_EXTENDED_APPARATUS_EVIDENCE_RECORDS } from './trackDExtendedApparatusEvidence';
import type {
  FullCatalogMotionEvidenceSuiteValidationReport,
  MotionEvidenceRecordValidationResult,
  MotionEvidenceReviewRecord,
  MotionEvidenceSuiteValidationReport,
  MotionEvidenceValidationIssue,
  PhaseEvidenceSpec,
} from './types';

export const FULL_CATALOG_MOTION_EVIDENCE_REVIEW_RECORDS: readonly MotionEvidenceReviewRecord[] =
  [
    ...TRACK_A_MAT_EVIDENCE_RECORDS,
    ...TRACK_B_APPARATUS_EVIDENCE_RECORDS,
    ...TRACK_C_EXTENDED_MAT_EVIDENCE_RECORDS,
    ...TRACK_D_EXTENDED_APPARATUS_EVIDENCE_RECORDS,
  ];

const FULL_CATALOG_RECORD_BY_ID: ReadonlyMap<string, MotionEvidenceReviewRecord> =
  new Map(
    FULL_CATALOG_MOTION_EVIDENCE_REVIEW_RECORDS.map((record) => [
      record.exerciseId,
      record,
    ]),
  );

export function resolveMotionEvidenceReviewRecord(
  exerciseId: string,
): MotionEvidenceReviewRecord | undefined {
  return FULL_CATALOG_RECORD_BY_ID.get(exerciseId.trim());
}

const CATALOG_EXERCISE_BY_ID: ReadonlyMap<string, PilatesExercise> = new Map(
  INITIAL_EXERCISES.map((exercise) => [exercise.id, exercise]),
);

const UNVERIFIED_NUMERIC_ANGLE_REGEX =
  /(?:\b\d+(?:\.\d+)?\s*(?:°|도\s*각도|deg(?:rees)?)\b)/i;

const UNVERIFIED_EMG_CLAIM_REGEX =
  /(?:(?:EMG|근활성도)\s*\d+(?:\.\d+)?\s*%|\b\d+(?:\.\d+)?\s*%\s*(?:근활성|근육\s*활성화|MVIC)|%\s*MVIC|\b\d+(?:\.\d+)?\s*mV\b)/i;

const MEDICAL_SAFETY_GUARANTEE_REGEX =
  /(?:부상\s*방지\s*보장|통증\s*완치|의학적\s*안전\s*보장|절대\s*안전|100%\s*안전|전문가\s*검증\s*완료)/i;

function isValidHttpsDirectUrl(rawUrl: string): boolean {
  const trimmed = rawUrl.trim();
  if (!trimmed.startsWith('https://')) {
    return false;
  }
  try {
    const parsed = new URL(trimmed);
    return (
      parsed.protocol === 'https:' &&
      parsed.hostname.includes('.') &&
      parsed.pathname.length >= 1
    );
  } catch {
    return false;
  }
}

function collectPhaseTexts(phase: PhaseEvidenceSpec): readonly string[] {
  return [
    phase.postureAndTransitionKo,
    ...phase.jointDirectionsKo,
    ...phase.supportPointsKo,
    phase.apparatusInteractionKo,
    phase.breathingKo,
  ];
}

function isMatTrack(track: MotionEvidenceReviewRecord['track']): boolean {
  return track === 'track-a-mat' || track === 'track-c-extended-mat';
}

function isApparatusTrack(track: MotionEvidenceReviewRecord['track']): boolean {
  return (
    track === 'track-b-apparatus' || track === 'track-d-extended-apparatus'
  );
}

export function validateMotionEvidenceRecord(
  record: MotionEvidenceReviewRecord,
): MotionEvidenceRecordValidationResult {
  const issues: MotionEvidenceValidationIssue[] = [];
  const catalogExercise = CATALOG_EXERCISE_BY_ID.get(record.exerciseId);
  const visualAsset = MOVEMENT_VISUAL_ASSET_MAP.get(record.exerciseId);

  if (!catalogExercise) {
    issues.push({
      code: 'unknown-catalog-id',
      exerciseId: record.exerciseId,
      track: record.track,
      fieldPath: 'exerciseId',
      messageKo: `INITIAL_EXERCISES 카탈로그에 존재하지 않는 동작 ID입니다: "${record.exerciseId}".`,
    });
  }

  if (isMatTrack(record.track) && record.apparatus !== 'mat') {
    issues.push({
      code: 'track-category-mismatch',
      exerciseId: record.exerciseId,
      track: record.track,
      fieldPath: 'apparatus',
      messageKo: `매트 트랙(${record.track})에는 apparatus: "mat" 동작만 허용되나 "${record.apparatus}"가 지정되었습니다.`,
    });
  }

  if (isApparatusTrack(record.track) && record.apparatus === 'mat') {
    issues.push({
      code: 'track-category-mismatch',
      exerciseId: record.exerciseId,
      track: record.track,
      fieldPath: 'apparatus',
      messageKo: `기구 트랙(${record.track})에는 매트(mat) 동작을 포함할 수 없으며 리포머·캐딜락·체어·바렐 동작만 허용됩니다.`,
    });
  }

  if (catalogExercise) {
    if (isMatTrack(record.track) && catalogExercise.apparatus !== 'mat') {
      issues.push({
        code: 'track-category-mismatch',
        exerciseId: record.exerciseId,
        track: record.track,
        fieldPath: 'exerciseId',
        messageKo: `카탈로그 상 기구 동작("${catalogExercise.apparatus}")이 매트 트랙(${record.track})에 배치되었습니다.`,
      });
    }
    if (isApparatusTrack(record.track) && catalogExercise.apparatus === 'mat') {
      issues.push({
        code: 'track-category-mismatch',
        exerciseId: record.exerciseId,
        track: record.track,
        fieldPath: 'exerciseId',
        messageKo: `카탈로그 상 매트("mat") 동작이 기구 트랙(${record.track})에 배치되었습니다.`,
      });
    }

    if (record.apparatus !== catalogExercise.apparatus) {
      issues.push({
        code: 'apparatus-mismatch',
        exerciseId: record.exerciseId,
        track: record.track,
        fieldPath: 'apparatus',
        messageKo: `레코드의 기구("${record.apparatus}")가 카탈로그 기구("${catalogExercise.apparatus}")와 일치하지 않습니다.`,
      });
    }

    if (record.bodyPosition !== catalogExercise.bodyPosition) {
      issues.push({
        code: 'body-position-mismatch',
        exerciseId: record.exerciseId,
        track: record.track,
        fieldPath: 'bodyPosition',
        messageKo: `레코드의 시작 자세("${record.bodyPosition}")가 카탈로그 자세("${catalogExercise.bodyPosition}")와 일치하지 않습니다.`,
      });
    }
  }

  if (visualAsset) {
    if (visualAsset.apparatus !== record.apparatus) {
      issues.push({
        code: 'apparatus-mismatch',
        exerciseId: record.exerciseId,
        track: record.track,
        fieldPath: 'apparatus',
        messageKo: `레코드의 기구("${record.apparatus}")가 MOVEMENT_VISUAL_ASSETS 기구("${visualAsset.apparatus}")와 일치하지 않습니다.`,
      });
    }
    if (visualAsset.bodyPosition !== record.bodyPosition) {
      issues.push({
        code: 'body-position-mismatch',
        exerciseId: record.exerciseId,
        track: record.track,
        fieldPath: 'bodyPosition',
        messageKo: `레코드의 자세("${record.bodyPosition}")가 MOVEMENT_VISUAL_ASSETS 자세("${visualAsset.bodyPosition}")와 일치하지 않습니다.`,
      });
    }
  }

  // Source URL & Rights validation
  if (!record.sources || record.sources.length === 0) {
    issues.push({
      code: 'missing-or-invalid-source-url',
      exerciseId: record.exerciseId,
      track: record.track,
      fieldPath: 'sources',
      messageKo: '최소 1개 이상의 공개 교육 자료 출처(sources)가 필요합니다.',
    });
  } else {
    record.sources.forEach((source, index) => {
      if (
        !source.sourceId.trim() ||
        !source.title.trim() ||
        !source.publisher.trim() ||
        !source.accessNoteKo.trim() ||
        !isValidHttpsDirectUrl(source.directUrl)
      ) {
        issues.push({
          code: 'missing-or-invalid-source-url',
          exerciseId: record.exerciseId,
          track: record.track,
          fieldPath: `sources[${index}].directUrl`,
          messageKo: `출처 #${index + 1}의 필수 메타데이터가 비어 있거나 유효한 https 직접 URL이 아닙니다: "${source.directUrl}".`,
        });
      }

      if (source.rightsPolicy !== 'link-only-no-download') {
        issues.push({
          code: 'invalid-source-rights-policy',
          exerciseId: record.exerciseId,
          track: record.track,
          fieldPath: `sources[${index}].rightsPolicy`,
          messageKo: `무단 다운로드 금지를 위해 rightsPolicy는 반드시 "link-only-no-download"여야 합니다.`,
        });
      }
    });
  }

  // Phase completeness & biomechanical fields validation
  const requiredPhaseKeys = ['start', 'middle', 'end'] as const;
  for (const phaseKey of requiredPhaseKeys) {
    const phase = record.phases?.[phaseKey];
    if (
      !phase ||
      phase.phaseId !== phaseKey ||
      !phase.postureAndTransitionKo.trim()
    ) {
      issues.push({
        code: 'missing-phase-evidence',
        exerciseId: record.exerciseId,
        track: record.track,
        fieldPath: `phases.${phaseKey}`,
        messageKo: `"${phaseKey}" 단계의 자세·전환 설명(postureAndTransitionKo) 또는 phaseId가 누락되었습니다.`,
      });
      continue;
    }

    const hasValidJointDirections =
      Array.isArray(phase.jointDirectionsKo) &&
      phase.jointDirectionsKo.length > 0 &&
      phase.jointDirectionsKo.every((item) => item.trim().length > 0);
    const hasValidSupportPoints =
      Array.isArray(phase.supportPointsKo) &&
      phase.supportPointsKo.length > 0 &&
      phase.supportPointsKo.every((item) => item.trim().length > 0);
    const hasValidApparatusInteraction =
      phase.apparatusInteractionKo.trim().length > 0;
    const hasValidBreathing = phase.breathingKo.trim().length > 0;

    if (
      !hasValidJointDirections ||
      !hasValidSupportPoints ||
      !hasValidApparatusInteraction ||
      !hasValidBreathing
    ) {
      issues.push({
        code: 'missing-biomechanical-field',
        exerciseId: record.exerciseId,
        track: record.track,
        fieldPath: `phases.${phaseKey}`,
        messageKo: `"${phaseKey}" 단계의 관절 방향(jointDirectionsKo), 지지점(supportPointsKo), 기구 상호작용(apparatusInteractionKo), 호흡(breathingKo) 중 누락된 항목이 있습니다.`,
      });
    }

    for (const text of collectPhaseTexts(phase)) {
      if (
        UNVERIFIED_NUMERIC_ANGLE_REGEX.test(text) ||
        UNVERIFIED_EMG_CLAIM_REGEX.test(text) ||
        MEDICAL_SAFETY_GUARANTEE_REGEX.test(text)
      ) {
        issues.push({
          code: 'unsupported-numeric-angle-or-medical-claim',
          exerciseId: record.exerciseId,
          track: record.track,
          fieldPath: `phases.${phaseKey}`,
          messageKo: `"${phaseKey}" 단계 설명에 근거 없는 수치 각도(°/deg), 근활성도(%), 또는 의학적 안전 보장 문구가 포함되어 있습니다: "${text}".`,
        });
      }
    }
  }

  if (record.muscles) {
    const muscleTexts = [
      ...record.muscles.primaryMusclesKo,
      ...record.muscles.synergistMusclesKo,
      ...record.muscles.stabilizerMusclesKo,
      ...record.muscles.lengthenedStructuresKo,
      record.muscles.evidenceBasisKo,
    ];
    for (const text of muscleTexts) {
      if (
        UNVERIFIED_NUMERIC_ANGLE_REGEX.test(text) ||
        UNVERIFIED_EMG_CLAIM_REGEX.test(text) ||
        MEDICAL_SAFETY_GUARANTEE_REGEX.test(text)
      ) {
        issues.push({
          code: 'unsupported-numeric-angle-or-medical-claim',
          exerciseId: record.exerciseId,
          track: record.track,
          fieldPath: 'muscles',
          messageKo: `근육 근거 설명에 근거 없는 수치 각도, 근활성도(% MVIC/mV), 또는 의학적 안전 보장 문구가 포함되어 있습니다: "${text}".`,
        });
      }
    }
  }

  // Discrepancy target ID & epistemic separation validation
  const expectedPatternVariantIds: readonly string[] =
    MOTION_PATTERN_REFERENCES.filter((ref) =>
      ref.intendedExerciseIds.includes(record.exerciseId),
    ).map((ref) => ref.variantId);

  if (
    visualAsset &&
    record.discrepancyAudit.targetVisualAssetId !== visualAsset.archetypeId &&
    record.discrepancyAudit.targetVisualAssetId !== visualAsset.exerciseId
  ) {
    issues.push({
      code: 'discrepancy-target-id-mismatch',
      exerciseId: record.exerciseId,
      track: record.track,
      fieldPath: 'discrepancyAudit.targetVisualAssetId',
      messageKo: `targetVisualAssetId("${record.discrepancyAudit.targetVisualAssetId}")가 실제 2D rig 아키타입("${visualAsset.archetypeId}")과 일치하지 않습니다.`,
    });
  }

  const actualVariantSet = new Set<string>(expectedPatternVariantIds);
  const declaredVariants = record.discrepancyAudit.targetPatternVariantIds;
  const variantsMatch =
    declaredVariants.length === expectedPatternVariantIds.length &&
    declaredVariants.every((id) => actualVariantSet.has(id));

  if (catalogExercise && !variantsMatch) {
    issues.push({
      code: 'discrepancy-target-id-mismatch',
      exerciseId: record.exerciseId,
      track: record.track,
      fieldPath: 'discrepancyAudit.targetPatternVariantIds',
      messageKo: `targetPatternVariantIds([${declaredVariants.join(', ')}])가 실제 MOTION_PATTERN_REFERENCES 연결([${expectedPatternVariantIds.join(', ')}])과 일치하지 않습니다.`,
    });
  }

  const allowedTargetIds = new Set<string>([
    record.exerciseId,
    record.discrepancyAudit.targetVisualAssetId,
    ...record.discrepancyAudit.targetPatternVariantIds,
  ]);

  const checkStatements = (
    statements: readonly {
      readonly category: string;
      readonly targetId: string;
      readonly summaryKo: string;
    }[],
    expectedCategory: 'fact' | 'inference' | 'unverified',
    fieldName: string,
  ) => {
    statements.forEach((stmt, idx) => {
      if (stmt.category !== expectedCategory || !stmt.summaryKo.trim()) {
        issues.push({
          code: 'epistemic-category-mismatch',
          exerciseId: record.exerciseId,
          track: record.track,
          fieldPath: `discrepancyAudit.${fieldName}[${idx}]`,
          messageKo: `discrepancyAudit.${fieldName}[${idx}]의 category는 "${expectedCategory}"여야 하며 summaryKo가 비어 있지 않아야 합니다.`,
        });
      }
      if (!stmt.targetId.trim() || !allowedTargetIds.has(stmt.targetId)) {
        issues.push({
          code: 'discrepancy-target-id-mismatch',
          exerciseId: record.exerciseId,
          track: record.track,
          fieldPath: `discrepancyAudit.${fieldName}[${idx}].targetId`,
          messageKo: `discrepancyAudit.${fieldName}[${idx}]의 targetId("${stmt.targetId}")가 허용된 대상 ID([${Array.from(allowedTargetIds).join(', ')}])에 속하지 않습니다.`,
        });
      }
    });
  };

  if (
    record.discrepancyAudit.facts.length === 0 ||
    record.discrepancyAudit.unverifiedOrMismatched.length === 0
  ) {
    issues.push({
      code: 'epistemic-category-mismatch',
      exerciseId: record.exerciseId,
      track: record.track,
      fieldPath: 'discrepancyAudit',
      messageKo:
        '사실(facts) 및 미검증/불일치(unverifiedOrMismatched) 항목은 각각 최소 1개 이상 기록되어야 합니다.',
    });
  }

  if (
    !record.discrepancyAudit.diagramTeamRecommendationsKo ||
    record.discrepancyAudit.diagramTeamRecommendationsKo.length === 0 ||
    record.discrepancyAudit.diagramTeamRecommendationsKo.some(
      (item) => !item.trim(),
    )
  ) {
    issues.push({
      code: 'discrepancy-target-id-mismatch',
      exerciseId: record.exerciseId,
      track: record.track,
      fieldPath: 'discrepancyAudit.diagramTeamRecommendationsKo',
      messageKo:
        '도해 담당에게 전달할 구체적 수정 권고안(diagramTeamRecommendationsKo)이 최소 1개 이상 필요합니다.',
    });
  }

  checkStatements(record.discrepancyAudit.facts, 'fact', 'facts');
  checkStatements(
    record.discrepancyAudit.inferences,
    'inference',
    'inferences',
  );
  checkStatements(
    record.discrepancyAudit.unverifiedOrMismatched,
    'unverified',
    'unverifiedOrMismatched',
  );

  // Truthfulness & false-ready / expert-verified flags validation
  const flags = record.truthfulnessFlags;
  if (
    flags.canonicalMotionReady ||
    flags.manualReady ||
    flags.true3dSupported ||
    flags.anatomicalVerificationCompleted ||
    flags.expertVerificationCompleted
  ) {
    issues.push({
      code: 'false-ready-or-verified-claim',
      exerciseId: record.exerciseId,
      track: record.track,
      fieldPath: 'truthfulnessFlags',
      messageKo:
        '현재 카탈로그 및 모션 초안은 전문가·해부학 최종 검증이나 정식 3D/매뉴얼 ready 상태가 아니므로 ready/verified 플래그를 true로 표시할 수 없습니다.',
    });
  }

  if (
    flags.containsUnverifiedNumericAngleClaim ||
    flags.containsUnverifiedEmgMuscleClaim ||
    flags.containsMedicalSafetyGuarantee
  ) {
    issues.push({
      code: 'unsupported-numeric-angle-or-medical-claim',
      exerciseId: record.exerciseId,
      track: record.track,
      fieldPath: 'truthfulnessFlags',
      messageKo:
        '근거 없는 각도·근활성도·안전 보장 주장 플래그가 true로 설정되어 있습니다.',
    });
  }

  const hasVerifiedDirectSource = record.sources.some(
    (s) =>
      s.accessStatus === 'verified-direct-fetch' ||
      s.accessStatus === 'verified-in-repo-source-ledger' ||
      s.accessStatus === 'verified-via-public-search-snippet',
  );
  const hasSandboxBlockedSourceOnly =
    record.sources.length > 0 &&
    record.sources.every(
      (s) => s.accessStatus === 'blocked-by-sandbox-proxy-unverified',
    );

  return {
    exerciseId: record.exerciseId,
    track: record.track,
    valid: issues.length === 0,
    hasVerifiedDirectSource,
    hasSandboxBlockedSourceOnly,
    issues,
  };
}

export function validateMotionEvidenceSuite(
  trackARecords: readonly MotionEvidenceReviewRecord[] = TRACK_A_MAT_EVIDENCE_RECORDS,
  trackBRecords: readonly MotionEvidenceReviewRecord[] = TRACK_B_APPARATUS_EVIDENCE_RECORDS,
): MotionEvidenceSuiteValidationReport {
  const allRecords = [...trackARecords, ...trackBRecords];
  const suiteIssues: MotionEvidenceValidationIssue[] = [];
  const resultsByExerciseId: Record<
    string,
    MotionEvidenceRecordValidationResult
  > = {};

  const seenInTrackA = new Set<string>();
  const seenInTrackB = new Set<string>();

  for (const record of trackARecords) {
    if (seenInTrackA.has(record.exerciseId)) {
      suiteIssues.push({
        code: 'duplicate-exercise-id',
        exerciseId: record.exerciseId,
        track: record.track,
        fieldPath: 'exerciseId',
        messageKo: `Track A 내부에 중복된 동작 ID가 존재합니다: "${record.exerciseId}".`,
      });
    }
    seenInTrackA.add(record.exerciseId);
  }

  for (const record of trackBRecords) {
    if (seenInTrackB.has(record.exerciseId)) {
      suiteIssues.push({
        code: 'duplicate-exercise-id',
        exerciseId: record.exerciseId,
        track: record.track,
        fieldPath: 'exerciseId',
        messageKo: `Track B 내부에 중복된 동작 ID가 존재합니다: "${record.exerciseId}".`,
      });
    }
    seenInTrackB.add(record.exerciseId);
  }

  let zeroTrackIdOverlap = true;
  for (const id of seenInTrackA) {
    if (seenInTrackB.has(id)) {
      zeroTrackIdOverlap = false;
      suiteIssues.push({
        code: 'track-id-overlap',
        exerciseId: id,
        track: 'track-b-apparatus',
        fieldPath: 'exerciseId',
        messageKo: `Track A와 Track B 사이에 중복된 동작 ID("${id}")가 존재합니다.`,
      });
    }
  }

  let fullyVerifiedSourceExerciseCount = 0;
  let partiallyOrProxyRestrictedExerciseCount = 0;

  for (const record of allRecords) {
    const recordResult = validateMotionEvidenceRecord(record);
    resultsByExerciseId[record.exerciseId] = recordResult;
    suiteIssues.push(...recordResult.issues);

    const allSourcesInRepoLedger =
      record.sources.length > 0 &&
      record.sources.every(
        (s) => s.accessStatus === 'verified-in-repo-source-ledger',
      );
    if (allSourcesInRepoLedger) {
      fullyVerifiedSourceExerciseCount += 1;
    } else {
      partiallyOrProxyRestrictedExerciseCount += 1;
    }
  }

  return {
    valid: suiteIssues.length === 0,
    totalRecords: allRecords.length,
    trackACount: trackARecords.length,
    trackBCount: trackBRecords.length,
    zeroTrackIdOverlap,
    fullyVerifiedSourceExerciseCount,
    partiallyOrProxyRestrictedExerciseCount,
    issueCount: suiteIssues.length,
    issues: suiteIssues,
    resultsByExerciseId,
  };
}

export function validateFullCatalogMotionEvidenceSuite(
  allRecords: readonly MotionEvidenceReviewRecord[] = FULL_CATALOG_MOTION_EVIDENCE_REVIEW_RECORDS,
): FullCatalogMotionEvidenceSuiteValidationReport {
  const suiteIssues: MotionEvidenceValidationIssue[] = [];
  const resultsByExerciseId: Record<
    string,
    MotionEvidenceRecordValidationResult
  > = {};

  const seenByTrack: Record<string, Set<string>> = {
    'track-a-mat': new Set<string>(),
    'track-b-apparatus': new Set<string>(),
    'track-c-extended-mat': new Set<string>(),
    'track-d-extended-apparatus': new Set<string>(),
  };
  const globalSeenTrackByExerciseId = new Map<
    string,
    MotionEvidenceReviewRecord['track']
  >();

  let zeroTrackIdOverlap = true;
  let trackACount = 0;
  let trackBCount = 0;
  let trackCCount = 0;
  let trackDCount = 0;
  let matRecordCount = 0;
  let apparatusRecordCount = 0;

  for (const record of allRecords) {
    if (record.track === 'track-a-mat') trackACount += 1;
    else if (record.track === 'track-b-apparatus') trackBCount += 1;
    else if (record.track === 'track-c-extended-mat') trackCCount += 1;
    else if (record.track === 'track-d-extended-apparatus') trackDCount += 1;

    if (record.apparatus === 'mat') matRecordCount += 1;
    else apparatusRecordCount += 1;

    const trackSet = seenByTrack[record.track];
    if (trackSet?.has(record.exerciseId)) {
      suiteIssues.push({
        code: 'duplicate-exercise-id',
        exerciseId: record.exerciseId,
        track: record.track,
        fieldPath: 'exerciseId',
        messageKo: `${record.track} 내부에 중복된 동작 ID가 존재합니다: "${record.exerciseId}".`,
      });
    }
    trackSet?.add(record.exerciseId);

    const priorTrack = globalSeenTrackByExerciseId.get(record.exerciseId);
    if (priorTrack && priorTrack !== record.track) {
      zeroTrackIdOverlap = false;
      suiteIssues.push({
        code: 'track-id-overlap',
        exerciseId: record.exerciseId,
        track: record.track,
        fieldPath: 'exerciseId',
        messageKo: `${priorTrack}와 ${record.track} 사이에 중복된 동작 ID("${record.exerciseId}")가 존재합니다.`,
      });
    } else if (!priorTrack) {
      globalSeenTrackByExerciseId.set(record.exerciseId, record.track);
    }
  }

  let fullyVerifiedSourceExerciseCount = 0;
  let partiallyOrProxyRestrictedExerciseCount = 0;
  let verifiedDirectSourceCoverageCount = 0;

  for (const record of allRecords) {
    const recordResult = validateMotionEvidenceRecord(record);
    resultsByExerciseId[record.exerciseId] = recordResult;
    suiteIssues.push(...recordResult.issues);

    if (recordResult.hasVerifiedDirectSource) {
      verifiedDirectSourceCoverageCount += 1;
    }

    const allSourcesInRepoLedger =
      record.sources.length > 0 &&
      record.sources.every(
        (s) => s.accessStatus === 'verified-in-repo-source-ledger',
      );
    if (allSourcesInRepoLedger) {
      fullyVerifiedSourceExerciseCount += 1;
    } else {
      partiallyOrProxyRestrictedExerciseCount += 1;
    }
  }

  const missingCatalogExerciseIds = INITIAL_EXERCISES.filter(
    (ex) => !globalSeenTrackByExerciseId.has(ex.id),
  ).map((ex) => ex.id);

  return {
    valid: suiteIssues.length === 0 && missingCatalogExerciseIds.length === 0,
    totalRecords: allRecords.length,
    trackACount,
    trackBCount,
    trackCCount,
    trackDCount,
    matRecordCount,
    apparatusRecordCount,
    catalogCoverageCount:
      INITIAL_EXERCISES.length - missingCatalogExerciseIds.length,
    missingCatalogExerciseIds,
    zeroTrackIdOverlap,
    fullyVerifiedSourceExerciseCount,
    partiallyOrProxyRestrictedExerciseCount,
    verifiedDirectSourceCoverageCount,
    issueCount: suiteIssues.length,
    issues: suiteIssues,
    resultsByExerciseId,
  };
}
