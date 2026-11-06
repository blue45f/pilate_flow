import source from './supineReachSource.json';
import {
  SUPINE_REACH_IDS,
  SUPINE_REACH_MODEL_VERSION,
  SUPINE_REACH_PHASES,
} from '../models/supineReach';

/** An original one-sided illustration. It is neither a canonical asset nor source approval. */
export const SUPINE_REACH_DEFINITION = Object.freeze({
  id: SUPINE_REACH_IDS[0],
  intendedExerciseId: 'original-mat-single-leg-stretch',
  title: '싱글 레그 · 가슴 든 한쪽 뻗기',
  variant: '가슴을 든 채 반대 무릎에 양손을 둔 한쪽 연습 구간 · 연속 좌우 교대와 별도',
  sideMode: 'unilateral' as const,
  sideRole: 'moving-leg' as const,
  sideControlLabel: '뻗는 다리 · 몸의 쪽',
  phases: SUPINE_REACH_PHASES,
  modelVersion: SUPINE_REACH_MODEL_VERSION,
  matched: [
    '가슴을 든 배치와 굽힌 무릎 쪽의 양손, 반대쪽 다리 뻗기라는 본문 패턴을 참고했습니다.',
  ],
  mismatched: [
    '한쪽 다리를 뻗었다 돌아오는 부분만 그립니다. 원문의 연속 좌우 교대와 손 옮기기는 표현하지 않습니다.',
    '원문의 한쪽 뻗기 패턴에서 출발하되, 반대 다리와 양손을 고정하고 같은 다리만 되돌리도록 저작한 변형입니다.',
    '준비와 마침도 가슴과 양발이 들린 배치입니다. 올라오거나 머리·발을 내려 쉬는 과정은 포함하지 않습니다.',
    '기존 동작 노트의 머리 내림·발을 바닥 가까이 미는 쉬운 대안과 다른 저작 변형입니다.',
  ],
  unknown: [
    '다리 각도·길이·팔꿈치 경로·가슴을 든 높이·몸통 고정·기구 및 접점 좌표·구간 시간은 저작 선택입니다.',
    '실제 접촉 압력·척추·견갑골·근육 부하·개인별 적합성·안전성을 검수하지 않았습니다.',
    '원문 표현·이미지·영상의 재사용 허가는 확보하지 않았습니다. 원문 링크와 직접 만든 도형만 제공합니다.',
  ],
  supportSummary:
    '머리·가슴·양발은 매트에서 뜬 저작 배치입니다. 양손은 굽혀 둔 반대 무릎에, 골반·아래 몸통의 패치는 매트에 둡니다.',
  supportNote:
    '발의 선은 선택한 다리의 저작 이동 경로입니다. 그립·접점·몸통 고정과 경로는 실측이나 검증된 수행 지시가 아닙니다.',
  sourceFactsCheckedAt: source.checkedAtUtc,
  sourcePatternId: source.sourceId,
  sources: [
    {
      sourceId: source.sourceId,
      label: 'BASI · 싱글 레그 스트레치 공개 본문',
      url: source.url,
      context: `${source.populationContext} 공개 글만 확인했으며, 원문 영상·사진이나 이 도해를 전문가가 검수하지 않았습니다.`,
    },
    {
      label: 'BASI · 원문 이용 조건',
      url: source.rights.termsUrl,
      context: '콘텐츠 재사용 허가 미확보 · 원문 미디어 복제·트레이싱 없음. 이 링크는 움직임 사실의 출처가 아니라 이용 범위 안내입니다.',
    },
  ],
  status: 'variant-proposal' as const,
  assetStatus: 'authored-unreviewed-draft' as const,
  professionalReviewStatus: 'unreviewed' as const,
  professionalReviewCount: 0 as const,
  exactAssetReady: false as const,
  exactSourceVariantMatched: false as const,
  sourceVariantReconciliationRequired: true as const,
  autoRecommendationEligible: false as const,
  safetyStatus: 'not_assessed' as const,
  sourceMediaReused: false as const,
  sourceMediaTraced: false as const,
  motionCaptureUsed: false as const,
  secondsArePrescription: false as const,
  repCount: null,
  breathingCue: null,
});

export const SUPINE_REACH_VARIANTS = Object.freeze([SUPINE_REACH_DEFINITION]);
