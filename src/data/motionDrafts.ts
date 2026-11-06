import { MAT_V6_PROPOSALS } from './motionDraftV6';
import { FLOOR_SEATED_BAND_ROW_PROPOSAL } from './motionDraftV5';
import { MOTION_DRAFT_EXPANSION } from './motionDraftExpansion';
import apparatusLedger from './motionApparatusSourceLedger.json';
import quadrupedLedger from './motionQuadrupedSourceLedger.json';
import { APPARATUS_PHASES } from '../models/apparatusDrafts';
import { QUADRUPED_PHASES } from '../models/quadrupedDrafts';
import { PHASES as heelPhases } from '../models/heelRaise';
import { PHASES as clamPhases } from '../models/clam';
import { SUPINE_PHASES } from '../models/supineDrafts';
import { LATERAL_PHASES, LATERAL_PROVENANCE } from '../models/lateralDrafts';
import sourceLedger from './motionDraftSourceLedger.json';
import type { DraftPhase, MotionDraftId } from '../models/types';

export interface MotionDraftDefinition {
  id: MotionDraftId;
  intendedExerciseId: string;
  title: string;
  variant: string;
  sideMode: 'bilateral' | 'unilateral';
  sideRole?: 'upper-side' | 'moving-leg' | 'moving-arm';
  sideControlLabel?: string;
  phases: readonly DraftPhase[];
  matched: readonly string[];
  unknown: readonly string[];
  mismatched: readonly string[];
  supportNote: string;
  supportSummary?: string;
  sourceFactsCheckedAt?: string;
  sourcePatternId?: string;
  exactSourceVariantMatched?: false;
  sourceVariantReconciliationRequired?: true;
  variantRequirements?: readonly {
    id: string;
    label: string;
    basis: 'source-text' | 'author-choice' | 'mixed';
  }[];
  sources: readonly MotionDraftSource[];
  status: 'variant-proposal';
  professionalReviewCount: 0;
  exactAssetReady: false;
  autoRecommendationEligible: false;
}

export interface MotionDraftSource {
  label: string;
  url: string;
  sourceId?: string;
  context?: string;
  factualRecordSha256?: string;
}

function checkedSources(patternId: string): readonly MotionDraftSource[] {
  const pattern = sourceLedger.patterns.find((item) => item.patternId === patternId);
  if (!pattern) throw new Error(`Missing motion source pattern: ${patternId}`);
  const ids = [
    ...pattern.primarySourceIds,
    ...(pattern.corroboratingSourceIds ?? []),
    ...(pattern.alternativeVariantSourceIds ?? []),
  ];
  return ids.map((sourceId) => {
    const source = sourceLedger.sources.find((item) => item.sourceId === sourceId);
    if (!source || !source.sourceChecked || !source.factualRecordSha256)
      throw new Error(`Missing factual source record: ${sourceId}`);
    const category = source.intendedPopulationContext.category;
    const scope =
      category === 'postoperative' ? '수술 후 회복 대상 자료' : '특정 증상·질환의 물리치료 자료';
    const variant = pattern.alternativeVariantSourceIds?.includes(sourceId)
      ? ' · 다른 변형 비교'
      : '';
    return {
      sourceId,
      label: `${source.publisher} · ${source.title}${variant}`,
      url: source.url,
      context: `${scope}. 일반 성인의 적합성은 확인되지 않았습니다.`,
      factualRecordSha256: source.factualRecordSha256,
    };
  });
}

function checkedApparatusSources(patternId: string): readonly MotionDraftSource[] {
  const pattern = apparatusLedger.patterns.find((item) => item.patternId === patternId);
  if (!pattern) throw new Error(`Missing apparatus source pattern: ${patternId}`);
  return [...pattern.primarySourceIds, ...pattern.apparatusContextSourceIds].map((sourceId) => {
    const record = apparatusLedger.sources.find((item) => item.sourceId === sourceId);
    if (!record?.sourceChecked || !record.factualRecordSha256)
      throw new Error(`Missing apparatus source facts: ${sourceId}`);
    return {
      sourceId,
      label: `${record.publisher} · ${record.title}`,
      url: record.url,
      context: `${record.sourceContext.population} 정확한 도형·설정·개인별 적합성 검토는 별도입니다.`,
      factualRecordSha256: record.factualRecordSha256,
    };
  });
}
function checkedQuadrupedSources(): readonly MotionDraftSource[] {
  const record = quadrupedLedger.source_facts.find((item) => item.id === 'BH-SLIDE');
  if (!record?.factual_record_sha256) throw new Error('Missing quadruped primary facts');
  return [
    {
      sourceId: record.id,
      label: `${record.publisher} · ${record.title}`,
      url: record.url,
      context:
        '공식 교육자 본문의 단독 슬라이드 준비 단계를 참조했습니다. 바닥 접촉의 세부 부위·무릎 해제·개인별 적합성은 확인되지 않았습니다.',
      factualRecordSha256: record.factual_record_sha256,
    },
  ];
}

/** Explicit design proposals. No lookup by arbitrary exercise ID and no application registry replacement. */
export const MOTION_DRAFTS: readonly MotionDraftDefinition[] = [
  {
    id: 'supported-heel-raise',
    intendedExerciseId: 'original-mat-ankle-reach',
    title: '서서 발목 움직임',
    variant: '일반 의자 등받이에 양손을 지지한 양측 뒤꿈치 들기',
    sideMode: 'bilateral',
    phases: heelPhases,
    matched: [
      '서서 양쪽 뒤꿈치를 들었다 내리는 기본 이동',
      '고정된 지지를 잡을 수 있다는 기존 계획 메모',
    ],
    unknown: [
      '정확한 관절 경로·가동 범위·개인별 적합성·안전성은 미검토',
      '이 지지 변형을 기존 동작의 어떤 범위로 볼지 검토 필요',
    ],
    mismatched: [
      '기존 필수 기구는 매트, 소도구는 없음으로 기록되어 있어 이 변형의 필수 일반 의자 지지가 반영되어 있지 않음',
    ],
    supportSummary: '일반 의자 지지가 필요합니다. 필라테스 체어가 아닙니다.',
    sourceFactsCheckedAt: '2026-11-04',
    supportNote:
      '안정된 일반 의자 등받이가 필요한 변형입니다. 스프링·페달을 가진 필라테스 체어가 아닙니다.',
    sources: [
      {
        label: 'NHS · Strength exercises / Calf raises',
        url: 'https://www.nhs.uk/live-well/exercise/strength-exercises/',
      },
      {
        label: 'UHSussex · Standing Exercises / Heel raises',
        url: 'https://www.uhsussex.nhs.uk/resources/standing-exercises-2/',
      },
    ],
    status: 'variant-proposal',
    professionalReviewCount: 0,
    exactAssetReady: false,
    autoRecommendationEligible: false,
  },
  {
    id: 'side-lying-clam',
    sideRole: 'upper-side',
    sideControlLabel: '움직이는 위쪽 다리',
    intendedExerciseId: 'original-mat-clam',
    title: '사이드 클램',
    variant: '머리 베개를 포함한 옆으로 누운 무밴드 클램',
    sideMode: 'unilateral',
    phases: clamPhases,
    matched: [
      '옆으로 누워 위쪽 무릎을 열었다 닫는 기본 이동',
      '발뒤꿈치 모음과 골반이 뒤로 구르지 않는 기본 패턴',
    ],
    unknown: [
      '원문과 도해의 머리 베개 요구가 기존 소도구 목록에 없으므로 요구 조건 대조가 미완료',
      '도해의 좌표·카메라·각도·개인별 적합성·안전성은 미검토',
    ],
    mismatched: [],
    supportSummary: '머리 베개를 포함한 미검토 변형입니다. 준비물 대조가 필요합니다.',
    sourceFactsCheckedAt: '2026-11-04',
    supportNote:
      '머리 베개는 South Tees 원문에 기재되어 도해에 포함했습니다. 기존 기록의 소도구 없음과 베개 요구의 정합성은 미확인입니다.',
    sources: [
      {
        label: 'South Tees · The clam',
        url: 'https://www.southtees.nhs.uk/resources/the-clam/',
      },
      {
        label: 'CUH · General stability exercises / Clam shell',
        url: 'https://www.cuh.nhs.uk/patient-information/general-stability-exercises1/',
      },
    ],
    status: 'variant-proposal',
    professionalReviewCount: 0,
    exactAssetReady: false,
    autoRecommendationEligible: false,
  },
  {
    id: 'adult-supine-heel-slide',
    sideRole: 'moving-leg',
    sideControlLabel: '움직이는 다리',
    intendedExerciseId: 'original-mat-heel-slide',
    title: '누워서 뒤꿈치 슬라이드',
    variant: '두 무릎 굽힌 배치에서 한쪽 뒤꿈치를 지지면에 대고 미는 변형',
    sideMode: 'unilateral',
    phases: SUPINE_PHASES['adult-supine-heel-slide'],
    matched: ['한쪽 다리는 두고 반대쪽 뒤꿈치가 바닥을 따라 멀어졌다 돌아오는 원문 패턴'],
    unknown: [
      '머리·손·등·골반 접촉 위치와 매트 표시는 제작 선택이며 원문의 모든 접촉을 관찰한 것이 아님',
      '척추 분절·견갑골·실제 신체 비율과 개인별 가동 범위는 검수 전임',
      '수술 후 자료의 동작 사실을 참고했으며 일반 필라테스 적합성은 확인하지 않음',
    ],
    mismatched: [
      '원문은 바닥을 명시하며 매트의 재질·두께·머리 지지를 정하지 않아 기존 매트·소도구 없음과의 정확한 대조가 미완료임',
    ],
    supportSummary: '뒤꿈치는 지지면을 따라 움직입니다. 머리·등 지지는 제작 가정입니다.',
    supportNote:
      '발이 들리는 니 폴드와 다른 변형입니다. 매트·머리·손·골반의 도해 접촉과 움직임 범위는 실제 검토가 필요합니다.',
    sourceFactsCheckedAt: sourceLedger.accessDateUtc,
    sourcePatternId: 'supine-heel-slide',
    sources: checkedSources('supine-heel-slide'),
    status: 'variant-proposal',
    professionalReviewCount: 0,
    exactAssetReady: false,
    autoRecommendationEligible: false,
  },
  {
    id: 'supine-knee-fold',
    sideRole: 'moving-leg',
    sideControlLabel: '움직이는 다리',
    intendedExerciseId: 'original-mat-knee-fold',
    title: '누워서 한쪽 니 폴드',
    variant: '무릎을 굽힌 한쪽 다리의 발을 들어 올렸다 놓는 변형',
    sideMode: 'unilateral',
    phases: SUPINE_PHASES['supine-knee-fold'],
    matched: ['한쪽 발을 지지면에서 들었다 돌아오는 원문 패턴 · 뒤꿈치 슬라이드와 구분'],
    unknown: [
      '골반·머리·팔 고정과 굽힌 다리 전체를 회전시키는 관절 경로는 제작 선택임',
      '원문의 수술 후 시기·유지 시간·반복을 일반 수업의 권장량으로 사용하지 않음',
      '별도 출처의 허리·골반 문구를 하나의 검증된 자세로 합치지 않음',
    ],
    mismatched: [
      '카탈로그의 가볍게 발 들기와 원문의 고관절 각도·진행 단계는 동일하다고 확인하지 않음',
    ],
    supportSummary: '한쪽 발이 들리는 변형입니다. 반대쪽 발은 매트 지지를 유지합니다.',
    supportNote:
      '매트·머리·손·골반 접촉, 표시 각도와 고정은 제작 가정입니다. 원문의 임상 대상과 개인별 적합성은 별도 검토가 필요합니다.',
    sourceFactsCheckedAt: sourceLedger.accessDateUtc,
    sourcePatternId: 'supine-bent-knee-fold',
    sources: checkedSources('supine-bent-knee-fold'),
    status: 'variant-proposal',
    professionalReviewCount: 0,
    exactAssetReady: false,
    autoRecommendationEligible: false,
  },
  {
    id: 'side-lying-straight-leg-lift',
    sideRole: 'upper-side',
    sideControlLabel: '위쪽에 놓인 몸의 쪽',
    ...LATERAL_PROVENANCE.drafts['side-lying-straight-leg-lift'],
    title: '옆으로 누워 곧은 다리 들기',
    sideMode: 'unilateral',
    phases: LATERAL_PHASES['side-lying-straight-leg-lift'],
    supportSummary: '두 다리를 편 변형입니다. 머리 받침은 원문에 없는 제작 선택입니다.',
    sourceFactsCheckedAt: sourceLedger.accessDateUtc,
    sourcePatternId: 'side-lying-straight-leg-lift',
    sources: checkedSources('side-lying-straight-leg-lift'),
    status: 'variant-proposal',
    professionalReviewCount: 0,
    exactAssetReady: false,
    autoRecommendationEligible: false,
  },
  {
    id: 'side-lying-open-book',
    sideRole: 'upper-side',
    sideControlLabel: '위쪽에 놓인 몸의 쪽',
    ...LATERAL_PROVENANCE.drafts['side-lying-open-book'],
    title: '옆으로 누워 오픈 북',
    sideMode: 'unilateral',
    phases: LATERAL_PHASES['side-lying-open-book'],
    supportSummary: '팔·가슴을 여는 변형입니다. 머리 받침과 무릎 지지는 제작 가정입니다.',
    sourceFactsCheckedAt: sourceLedger.accessDateUtc,
    sourcePatternId: 'side-lying-open-book',
    sources: checkedSources('side-lying-open-book'),
    status: 'variant-proposal',
    professionalReviewCount: 0,
    exactAssetReady: false,
    autoRecommendationEligible: false,
  },
  {
    id: 'quadruped-arm-slide',
    intendedExerciseId: 'original-mat-quadruped-reach',
    title: '네발기기 한 팔 슬라이드',
    variant: '팔꿈치를 조금 굽힌 배치에서 한 손바닥 접점을 매트를 따라 앞으로 미끄러뜨리는 제안',
    sideMode: 'unilateral',
    sideRole: 'moving-arm',
    sideControlLabel: '움직이는 팔',
    phases: QUADRUPED_PHASES['quadruped-arm-slide'],
    matched: ['공식 교육자 본문의 단독 팔 슬라이드 왕복 준비 단계'],
    unknown: [
      '손바닥의 정확한 접촉 부위, 고정된 세 지지점·몸통과 팔꿈치 굽힘은 제작 선택',
      '원문의 다음 단계에 있는 두 팔다리 no-lift 문구를 단독 팔의 직접 관찰로 합치지 않음',
    ],
    mismatched: ['이 제안은 손을 바닥에서 드는 단계나 반대 팔·다리 동시 리치를 표현하지 않음'],
    supportSummary: '한 손 접점의 바닥 슬라이드입니다. 손 접촉 부위와 고정 지지는 제작 가정입니다.',
    supportNote:
      '팔의 작은 슬라이드와 굽힘, 고정 몸통은 도해 구조이며 압력·균형·동역학·적합성을 검증한 것이 아닙니다.',
    sourceFactsCheckedAt: quadrupedLedger.checked_at_utc.slice(0, 10),
    sourcePatternId: 'quadruped-arm-slide',
    sources: checkedQuadrupedSources(),
    status: 'variant-proposal',
    professionalReviewCount: 0,
    exactAssetReady: false,
    autoRecommendationEligible: false,
  },
  {
    id: 'quadruped-leg-slide',
    intendedExerciseId: 'original-mat-quadruped-reach',
    title: '네발기기 한 다리 슬라이드',
    variant: '한 발가락 접점을 매트 뒤로 미끄러뜨리며 해당 무릎 지지를 해제하는 제안',
    sideMode: 'unilateral',
    sideRole: 'moving-leg',
    sideControlLabel: '움직이는 다리',
    phases: QUADRUPED_PHASES['quadruped-leg-slide'],
    matched: ['공식 교육자 본문의 단독 다리 슬라이드 왕복 준비 단계'],
    unknown: [
      '발가락 접촉 부위·능동 무릎 지지 해제·몸통과 다른 지지점의 고정은 제작 선택',
      '단독 슬라이드와 뒤따르는 들기·동시 두 팔다리 단계는 별도 변형',
    ],
    mismatched: ['팔 슬라이드와 같은 계획 노트의 다른 변형이며 새 정식 동작 두 개로 합산하지 않음'],
    supportSummary:
      '한 발가락 접점은 바닥을 따라 이동하고 무릎 지지는 해제됩니다. 이는 제작한 접촉 가정입니다.',
    supportNote:
      '특정 발 접촉·무릎 해제·고정 몸통·표시 거리는 출처의 측정값이 아닙니다. 실제 지지와 적합성은 검토 전입니다.',
    sourceFactsCheckedAt: quadrupedLedger.checked_at_utc.slice(0, 10),
    sourcePatternId: 'quadruped-leg-slide',
    sources: checkedQuadrupedSources(),
    status: 'variant-proposal',
    professionalReviewCount: 0,
    exactAssetReady: false,
    autoRecommendationEligible: false,
  },
  {
    id: 'reformer-parallel-footwork',
    intendedExerciseId: 'original-reformer-parallel-footwork',
    title: '리포머 양발 풋워크',
    variant: '양뒤꿈치를 풋바에 둔 평행 변형의 캐리지 이동 제안',
    sideMode: 'bilateral',
    phases: APPARATUS_PHASES['reformer-parallel-footwork'],
    matched: [
      'Merrithew의 누운 캐리지·평행한 뒤꿈치 풋바 접촉·무릎 펴며 이동 후 돌아오는 본문 패턴',
      '제조사 설명의 레일 위 캐리지 이동 구조',
    ],
    unknown: [
      '그림의 풋바 고정 접점과 머리·등·골반 지지 좌표, 스토퍼·장비 치수·범위·표시 시간은 제작 선택',
      '스프링·힘·제조사별 장치·실제 조작 설정은 미표현',
    ],
    mismatched: ['앞발 Lower & Lift·발목 내리기·스트랩 변형을 이 뒤꿈치 제안에 합치지 않음'],
    supportSummary:
      '발은 그린 풋바에, 몸 지지는 이동 캐리지에 연결합니다. 접점 좌표는 제작 가정입니다.',
    supportNote:
      '제조사 조작법이나 스프링 설정을 안내하지 않습니다. 원본 기구와의 정확한 변형·지지·적합성 검토가 필요합니다.',
    sourceFactsCheckedAt: apparatusLedger.accessDateUtc,
    sourcePatternId: 'reformer-parallel-footwork',
    sources: checkedApparatusSources('reformer-parallel-footwork'),
    status: 'variant-proposal',
    professionalReviewCount: 0,
    exactAssetReady: false,
    autoRecommendationEligible: false,
  },
  {
    id: 'chair-seated-pedal-press',
    intendedExerciseId: 'original-chair-seated-pedal-press',
    title: '체어 양발 페달 프레스',
    variant: '필라테스 체어의 고정 좌면과 단일 힌지 페달에 양뒤꿈치를 둔 제안',
    sideMode: 'bilateral',
    phases: APPARATUS_PHASES['chair-seated-pedal-press'],
    matched: [
      '공식 교육자 기고의 EXO 좌면·양좌골 지지·양뒤꿈치 페달과 leg pumps 본문',
      '공개 기구 설명의 힌지 페달 구조',
    ],
    unknown: [
      '고정된 몸통·손, 페달 피벗·호·발 방향·복귀 경로·표시 시간은 제작 선택',
      '본문은 전체 누름·복귀 궤적을 정의하지 않으며 스프링·장력·실제 설정은 미표현',
    ],
    mismatched: [
      'EXO 예제를 모든 필라테스 체어 모델의 정확한 치수나 세팅으로 해석하지 않음',
      '일반 의자·분리 페달 교대·링 상체 진행을 합치지 않음',
    ],
    supportSummary:
      '골반은 좌면에, 양발은 회전하는 단일 페달에 연결합니다. 자세와 기구 수치는 제작 가정입니다.',
    supportNote:
      '필라테스 기구 체어이며 일반 의자와 다릅니다. 실제 기구 조작이나 장력·안전 설정을 시뮬레이션하지 않습니다.',
    sourceFactsCheckedAt: apparatusLedger.accessDateUtc,
    sourcePatternId: 'chair-seated-pedal-press',
    sources: checkedApparatusSources('chair-seated-pedal-press'),
    status: 'variant-proposal',
    professionalReviewCount: 0,
    exactAssetReady: false,
    autoRecommendationEligible: false,
  },
  ...MOTION_DRAFT_EXPANSION,
  FLOOR_SEATED_BAND_ROW_PROPOSAL,
  ...MAT_V6_PROPOSALS,
];

export function getMotionDraft(id: unknown): MotionDraftDefinition | null {
  return MOTION_DRAFTS.find((draft) => draft.id === id) ?? null;
}
