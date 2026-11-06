import selected from './motionSelectedV5SourceLedger.json';
import { SEATED_BAND_ROW_PHASES } from '../models/seatedBandRow';
import type { MotionDraftDefinition } from './motionDrafts';
const source = selected.sources.find(
  (item) => item.sourceId === 'harvard-floor-seated-band-row-v1',
);
if (!source?.sourceChecked || !source.factualRecordSha256)
  throw new Error('Missing checked band-row factual record');

/** One original schematic; source text, authored geometry and expert review remain separate. */
export const FLOOR_SEATED_BAND_ROW_PROPOSAL: MotionDraftDefinition = {
  id: 'floor-seated-band-row',
  intendedExerciseId: 'original-mat-band-row',
  title: '바닥 앉은 긴 밴드 로우',
  variant: '바닥 앉기·앞으로 뻗은 다리·발바닥을 지나는 긴 탄성밴드·양손 끝 잡기 변형의 원본 도해',
  sideMode: 'bilateral',
  phases: SEATED_BAND_ROW_PHASES,
  matched: [
    '공식 본문에 바닥 앉기, 다리를 앞으로 뻗기, 긴 탄성밴드 중간을 발바닥에 두고 양 끝을 각 손으로 잡는 조건이 기재됨',
    '등을 곧게 두고 팔꿈치를 몸 가까이 굽혀 밴드 끝을 당긴 뒤 팔을 펴는 본문 패턴',
  ],
  unknown: [
    '개인별 적합성·안전성·정확한 원문 변형 대조·전문가 검토는 미완료',
    '발 방향·발바닥/뒤꿈치/골반 패치, 몸통 고정·수치 비율·팔 경로·범위·표시 시간은 저작 선택',
    '밴드 제품 구조·저항·휴지 길이·하중·압력·미끄러짐과 견갑 움직임은 모델링하지 않음',
  ],
  mismatched: [
    '일반 의자에 앉은 NHS 대안과 문·벽에 별도로 고정한 밴드 변형을 이 바닥 앉기 제안에 합치지 않음',
    '발을 지나는 열린 경로를 폐쇄형 루프 밴드 제품으로 분류하지 않음',
  ],
  supportSummary:
    '바닥 앉기와 긴 탄성밴드가 필요한 제안입니다. 밴드 제품 구조와 저항은 미확인입니다.',
  supportNote:
    '그린 발바닥·양손과 밴드 끝을 연결합니다. 발/골반 바닥 패치는 저작 선택이며 실제 고정·저항 설정이나 운동 안전 시범이 아닙니다.',
  variantRequirements: [
    {
      id: 'floor-seated-mat',
      label: '매트·바닥 앉기 · 정확한 골반/발 패치는 저작 선택',
      basis: 'mixed',
    },
    {
      id: 'long-elastic-band-unspecified',
      label: '긴 탄성밴드 · 제품 구조/저항 미확인 · 폐쇄 루프 제품으로 확정하지 않음',
      basis: 'source-text',
    },
  ],
  sourceFactsCheckedAt: source.accessDate,
  sourcePatternId: 'floor-seated-band-row',
  sources: [
    {
      sourceId: source.sourceId,
      label: `${source.publisher} · ${source.title}`,
      url: source.url,
      factualRecordSha256: source.factualRecordSha256,
      context:
        '공개 건강·노화 교육 본문만 확인했습니다. 게시물의 편집 검토와 이 모션의 전문 검토는 별개이며, 영상·정확한 자세·개인 적합성은 미확인입니다.',
    },
  ],
  status: 'variant-proposal',
  professionalReviewCount: 0,
  exactAssetReady: false,
  autoRecommendationEligible: false,
  exactSourceVariantMatched: false,
  sourceVariantReconciliationRequired: true,
};
