import ledger from './motionSelectedV6SourceLedger.json';
import { PHASES as CHEST_LIFT_PHASES } from '../models/chestLift';
import { PELVIC_CURL_PHASES } from '../models/pelvicCurl';
import type { MotionDraftDefinition, MotionDraftSource } from './motionDrafts';

function checkedSource(sourceId: string): MotionDraftSource[] {
  const source = ledger.sources.find((record) => record.sourceId === sourceId);
  if (!source?.sourceChecked || !source.factualRecordSha256)
    throw new Error(`Missing checked V6 factual record: ${sourceId}`);
  return [
    {
      sourceId,
      label: `${source.publisher} · ${source.title}`,
      url: source.url,
      factualRecordSha256: source.factualRecordSha256,
      context:
        '공개 교육 본문을 확인했습니다. 본문 CJ Kelly 표기와 별도 By SecoSan 표기를 구분해 보존했으며, 자격·개인 적합성·이 도해의 전문 검토는 확인하지 않았습니다. 사실 기록 해시는 모션 검수 해시가 아닙니다.',
    },
  ];
}

/** Separate authored models. Their source patterns never grant a canonical asset or approval. */
export const MAT_V6_PROPOSALS: readonly MotionDraftDefinition[] = [
  {
    id: 'supine-chest-lift',
    intendedExerciseId: 'original-mat-chest-lift',
    sourcePatternId: 'mat-chest-lift',
    title: '누워 가슴 들기 · 분절 도해',
    variant: '무릎 굽힘·다리 모음·머리 뒤 손 배치를 포함한 양측 가슴 들기 저작 도해',
    sideMode: 'bilateral',
    phases: CHEST_LIFT_PHASES,
    matched: [
      '공개 본문에 누운 자세, 굽힌 무릎과 다리 모음, 머리 뒤 손가락 깍지 배치가 기재됨',
      '머리·목·가슴을 들며 허벅지 쪽을 바라보고, 견갑골 끝이 매트에서 떨어진 뒤 내려오는 본문 패턴',
    ],
    unknown: [
      '발바닥 전체 지지와 완전한 골반 고정은 원문에서 확인되지 않음',
      '척추 분절·목·머리 각도, 손 접촉 패치·팔 경로·힘·개인별 적합성과 안전성은 미검토',
      '시선 지시는 정확한 상체 이동 경로를 뜻하지 않으며 도해의 방향·수치·시간은 저작 선택',
    ],
    mismatched: [
      '회전 가슴 들기, 테이블탑 다리, 골반 말기나 다른 크런치 시범을 이 제안으로 합치지 않음',
      '연구의 제안 ID mat-chest-lift와 실제 제작 ID supine-chest-lift는 별개이며 자동 매핑하지 않음',
    ],
    supportSummary:
      '머리 뒤 손과 굽힌 무릎을 표현한 도해입니다. 발·골반 고정과 접촉의 세부 형태는 저작 선택입니다.',
    supportNote:
      '머리 뒤 손 패치가 움직이는 머리를 따라갑니다. 선택한 매트 접촉·관절 좌표는 실제 자세나 압력을 검증한 결과가 아닙니다.',
    variantRequirements: [
      {
        id: 'mat-supine-bent-knees',
        label: '매트·무릎 굽힌 누운 배치 · 발/골반 패치는 저작 선택',
        basis: 'mixed',
      },
      {
        id: 'hands-behind-head',
        label: '머리 뒤 손 배치 · 손 패치·팔꿈치 경로·지지 압력 미확인',
        basis: 'mixed',
      },
    ],
    sourceFactsCheckedAt: ledger.researchCheckedAtUtc,
    sources: checkedSource('basi-cjkelly-chest-lift-v1'),
    status: 'variant-proposal',
    professionalReviewCount: 0,
    exactAssetReady: false,
    autoRecommendationEligible: false,
    exactSourceVariantMatched: false,
    sourceVariantReconciliationRequired: true,
  },
  {
    id: 'articulated-pelvic-curl',
    intendedExerciseId: 'original-mat-bridge',
    sourcePatternId: 'mat-pelvic-curl',
    title: '분절 골반 말기 · 저작 도해',
    variant: '양무릎 굽힘·매트 위 팔 지지와 분절 척추 링크를 갖는 양측 골반 말기 저작 도해',
    sideMode: 'bilateral',
    phases: PELVIC_CURL_PHASES,
    matched: [
      '공개 본문에 굽힌 무릎과 좌골 너비의 무릎·발뒤꿈치, 매트 위로 길게 둔 팔이 기재됨',
      '골반 말림 뒤 척추를 분절해 올리고, 흉골과 척추를 매트 쪽으로 내리는 본문 패턴',
    ],
    unknown: [
      '선택한 머리·상부 등·팔·발 접촉 패치, 정확한 관절 위치와 지지 압력은 미확인',
      '척추 링크의 각도·길이·움직임 순서 비율과 무릎–어깨 선의 수치 정합성은 저작 선택',
      '실제 척추 역학·근육 부하·스프링이나 재료 거동·개인별 적합성·안전성은 미검토',
    ],
    mismatched: [
      '이전 2D 브리지 개념 시안과 다른 모델이며, 기존 시안을 정확한 숄더 브리지로 바꾸어 부르지 않음',
      '한 다리, 밴드·볼, 높은 발 지지 또는 팔 들기 변형을 이 제안에 합치지 않음',
    ],
    supportSummary:
      '선택한 머리·상부 등·팔·발 패치를 지지점으로 쓰는 분절 도해입니다. 실제 지지·관절 범위는 미검토입니다.',
    supportNote:
      '일정한 길이의 척추 링크와 다리 모델을 사용합니다. 뼈의 내부 일관성은 실제 척추 움직임이나 운동 안전성을 입증하지 않습니다.',
    variantRequirements: [
      {
        id: 'mat-supine-pelvic-curl',
        label: '매트·무릎 굽힌 누운 배치 · 정확한 발 패치는 저작 선택',
        basis: 'mixed',
      },
      { id: 'arms-along-mat', label: '매트 위 팔 배치 · 접촉 패치와 힘은 미확인', basis: 'mixed' },
    ],
    sourceFactsCheckedAt: ledger.researchCheckedAtUtc,
    sources: checkedSource('basi-cjkelly-pelvic-curl-v1'),
    status: 'variant-proposal',
    professionalReviewCount: 0,
    exactAssetReady: false,
    autoRecommendationEligible: false,
    exactSourceVariantMatched: false,
    sourceVariantReconciliationRequired: true,
  },
];
