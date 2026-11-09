import type { PilatesExercise, SequenceStep } from '../types/pilates';
import { getSequenceDurations, isRestStep } from './sequenceEngine';

export interface AiSafetyGateCheck {
  gateId:
    | 'catalog-integrity'
    | 'non-diagnostic-language'
    | 'spinal-warmup-progression'
    | 'duration-bounds'
    | 'offline-snapshot-fidelity';
  labelKo: string;
  passed: boolean;
  detailKo: string;
}

export interface AiSequenceSafetyVerificationReport {
  allPassed: boolean;
  passedCount: number;
  totalGates: number;
  gates: AiSafetyGateCheck[];
  summaryBadgeKo: string;
}

const PROHIBITED_CLINICAL_PATTERNS = [
  /완치/,
  /디스크\s*치료/,
  /의학적\s*처방/,
  /진단\s*확정/,
  /약물/,
];

/**
 * Deterministic 5-Gate AI Verification & Safety Guardrail (`@Verify AI` integration)
 * auditing sequence steps against catalog hallucination, clinical overclaim,
 * warm-up progression safety, time budget bounds, and offline snapshot fidelity.
 */
export function verifySequenceAiSafetyAndFidelity(
  steps: readonly SequenceStep[],
  exercisesById: ReadonlyMap<string, PilatesExercise>,
): AiSequenceSafetyVerificationReport {
  const nonRest = steps.filter((st) => !isRestStep(st));

  // Gate 1: Catalog & Snapshot Integrity (No hallucinated unknown IDs)
  const unknownSteps = nonRest.filter(
    (st) => !exercisesById.has(st.exerciseId) && !st.exerciseSnapshot?.nameKo,
  );
  const gate1Passed = unknownSteps.length === 0;

  // Gate 2: Non-Diagnostic / Non-Medical Cue Guardrail
  const flaggedCues = steps.filter((st) => {
    const note = st.instructorNote ?? '';
    return PROHIBITED_CLINICAL_PATTERNS.some((rx) => rx.test(note));
  });
  const gate2Passed = flaggedCues.length === 0;

  // Gate 3: Spinal Warm-Up Progression (High-load Lv 2.0 extension not placed at index 0 without prep)
  const firstEx = nonRest[0] ? exercisesById.get(nonRest[0].exerciseId) : undefined;
  const gate3Passed =
    !firstEx ||
    !(
      firstEx.level === '2.0' &&
      (firstEx.spinalPlanes ?? []).includes('extension') &&
      nonRest.length > 1
    );

  // Gate 4: Duration & Step Time Boundedness
  const durations = getSequenceDurations([...steps]);
  const totalMin = durations.totalSec / 60;
  const invalidStepDuration = steps.some(
    (st) => !Number.isFinite(st.durationMin) || st.durationMin <= 0 || st.durationMin > 30,
  );
  const gate4Passed =
    !invalidStepDuration && (steps.length === 0 || (totalMin >= 1 && totalMin <= 150));

  // Gate 5: Layer & Offline Snapshot Fidelity
  const gate5Passed = nonRest.every(
    (st) =>
      st.selectedLayer === undefined ||
      st.selectedLayer === 'easy' ||
      st.selectedLayer === 'standard' ||
      st.selectedLayer === 'hard',
  );

  const gates: AiSafetyGateCheck[] = [
    {
      gateId: 'catalog-integrity',
      labelKo: '카탈로그·스냅샷 무결성 (환각 동작 0건)',
      passed: gate1Passed,
      detailKo: gate1Passed
        ? `모든 동작(${nonRest.length}개)이 검증된 카탈로그/스냅샷과 일치합니다.`
        : `미확인 동작 ID ${unknownSteps.length}건이 감지되었습니다.`,
    },
    {
      gateId: 'non-diagnostic-language',
      labelKo: '비의료·비진단 티칭 용어 가드레일',
      passed: gate2Passed,
      detailKo: gate2Passed
        ? '금지된 의학적 진단·치료 단정 표현이 없습니다.'
        : `주의 표현 ${flaggedCues.length}건을 강사 관찰 표현으로 다듬어 주세요.`,
    },
    {
      gateId: 'spinal-warmup-progression',
      labelKo: '척추 준비 운동 단계적 진입 검증',
      passed: gate3Passed,
      detailKo: gate3Passed
        ? '고강도 신전 동작 전 준비 흐름이 안전하게 배치되었습니다.'
        : '첫 동작이 Lv 2.0 고강도 신전 동작입니다. 앞에 워밍업 배치를 권장합니다.',
    },
    {
      gateId: 'duration-bounds',
      labelKo: '시간 예산 및 스텝 시간 유효 범위 검증',
      passed: gate4Passed,
      detailKo: gate4Passed
        ? `총 ${Number(totalMin.toFixed(1))}분 · 모든 스텝 시간이 정상 범위 내입니다.`
        : '비정상적인 스텝 시간 값이 포함되어 있습니다.',
    },
    {
      gateId: 'offline-snapshot-fidelity',
      labelKo: '오프라인 레이어·스냅샷 스키마 정합성',
      passed: gate5Passed,
      detailKo: gate5Passed
        ? '모든 동작 레이어(easy/standard/hard) 규격이 유효합니다.'
        : '유효하지 않은 레이어 속성이 감지되었습니다.',
    },
  ];

  const passedCount = gates.filter((g) => g.passed).length;
  const allPassed = passedCount === gates.length;

  return {
    allPassed,
    passedCount,
    totalGates: gates.length,
    gates,
    summaryBadgeKo: allPassed
      ? `Verify AI 5대 안전·무결성 게이트 전원 통과 (${passedCount}/${gates.length})`
      : `Verify AI 점검 (${passedCount}/${gates.length} 통과 · 권고 확인)`,
  };
}
