import ledger from './motionCandidateResearchV7.json';

/** Root association metadata; historical research metadata/raw bytes remain unchanged. */
export const MOTION_CANDIDATE_RESEARCH_V7_ASSOCIATION = Object.freeze({
  baseHead: '78ec1797040620257a74b86df606c80d2898a69b',
  frozenLedgerSha256: 'a96737cd152bb0885f79ed8bfb68a3fd2391e74ec5af55d39a5f9e0201dc5501',
  associationKind: 'research-discovery-only',
  canonicalAssetMappingsAdded: 0,
  motionProposalsAdded: 0,
  professionalMotionReviewsAdded: 0,
} as const);

export interface MotionCandidateResearchFact {
  readonly id: string;
  readonly labelKo: string;
  readonly text: string;
  readonly kind: 'source-fact' | 'source-unknown' | 'clinical-context';
}

export interface MotionCandidateResearch {
  readonly candidateId: string;
  readonly exerciseId: 'original-mat-swan-prep' | 'original-mat-forearm-plank';
  readonly labelKo: string;
  readonly variant: string;
  readonly status: 'research-only; no authored motion';
  readonly statusLabelKo: '본문 사실 조사만 완료 · 제작 모션 없음';
  readonly facts: readonly MotionCandidateResearchFact[];
  readonly unknown: readonly string[];
  readonly authoringChoicesRequired: readonly string[];
  readonly catalogBoundary: string;
  readonly source: {
    readonly sourceId: string;
    readonly title: string;
    readonly publisher: string;
    readonly url: string;
    readonly checkedAtUtc: string;
    readonly sourceChecked: true;
    readonly factualRecordSha256: string;
    readonly factualRecordHashScope: string;
    readonly attributionNoteKo: string;
    readonly population: {
      readonly category: string;
      readonly contextLabelKo: string;
      readonly exactAgeEligibilityEstablished: false;
      readonly generalAdultSuitabilityEstablished: false;
      readonly individualSuitabilityEstablished: false;
      readonly clinicalUseInferred: false;
    };
    readonly rights: {
      readonly mode: 'reference-only';
      readonly labelKo: string;
      readonly embedded: false;
      readonly reuseLicenseEstablished: false;
      readonly sourceMediaObserved: false;
      readonly mediaTimestamps: readonly [];
    };
    readonly lineage: {
      readonly urlStatus: 'reused-url' | 'new-url-in-audited-inventory';
      readonly independentCorroborationEstablished: false;
    };
  };
  readonly canonicalAsset: null;
  readonly professionalReviewCount: 0;
  readonly autoRecommendationEligible: false;
  readonly modelAuthored: false;
  readonly exactAssetReady: false;
  readonly exactSourceVariantMatched: false;
  readonly sourceVariantReconciliationRequired: true;
  readonly safetyAssessment: 'unassessed';
  readonly playbackTimingEstablished: false;
}

interface Association {
  readonly exerciseId: MotionCandidateResearch['exerciseId'];
  readonly candidateId: string;
  readonly sourceId: string;
  readonly labelKo: string;
  readonly populationLabelKo: string;
  readonly attributionNoteKo: string;
  readonly urlStatus: MotionCandidateResearch['source']['lineage']['urlStatus'];
}

const ASSOCIATIONS: readonly Association[] = [
  {
    exerciseId: 'original-mat-swan-prep',
    candidateId: 'prone-baby-swan',
    sourceId: 'basi-cjkelly-baby-swan-v1',
    labelKo: '베이비 스완 변형 · 본문 조사 후보',
    populationLabelKo: 'BASI 기초 교육 본문 · 정확한 연령·개인 적합성 미확인',
    attributionNoteKo:
      'CJ Kelly 본문 저자 표기와 별도 By SecoSan 표기를 구분했습니다. 자격·하단 표기의 역할은 별도 확인하지 않았습니다.',
    urlStatus: 'reused-url',
  },
  {
    exerciseId: 'original-mat-forearm-plank',
    candidateId: 'kneeling-forearm-plank',
    sourceId: 'nth-optimise-elbow-knee-plank-v1',
    labelKo: '팔꿈치·무릎 지지 플랭크 · 본문 조사 후보',
    populationLabelKo: 'NHS 암 치료 전 준비 운동 환자 안내 · 일반 수업 적합성 미확인',
    attributionNoteKo:
      '병원은 운동 자료를 physiotherapyexercises.com 소프트웨어에서 가져왔다고 기재합니다. 원저작·재사용 권리와 별도 자료의 검증은 확인하지 않았습니다.',
    urlStatus: 'new-url-in-audited-inventory',
  },
];

const FACT_FIELDS = [
  ['variant', '조사한 변형'],
  ['start', '시작 배치'],
  ['move', '움직임'],
  ['middle', '중간 배치'],
  ['return', '복귀'],
  ['contacts', '지지·접점'],
  ['props', '준비물'],
  ['side', '좌우 구분'],
  ['stageBoundary', '단계 구분'],
  ['clinicalDosageContext', '해당 환자 프로그램의 용량 문맥 · 수행 지시 아님'],
] as const;

function buildCandidate(association: Association): MotionCandidateResearch | null {
  const recommendation = ledger.recommendations.find(
    (item) => item.candidateId === association.candidateId,
  );
  const source = ledger.sources.find((item) => item.sourceId === association.sourceId);
  if (
    !recommendation ||
    !source ||
    recommendation.intendedComparisonId !== association.exerciseId ||
    recommendation.sourceId !== association.sourceId ||
    source.sourceChecked !== true ||
    recommendation.canonicalAssetMapping !== null ||
    recommendation.professionalReviewCount !== 0 ||
    recommendation.modelAuthoredByThisTask !== false ||
    recommendation.exactAssetReady !== false ||
    recommendation.autoRecommendationEligible !== false ||
    recommendation.exactSourceVariantMatched !== false ||
    recommendation.sourceVariantReconciliationRequired !== true ||
    source.professionalReviewCount !== 0 ||
    source.exactMotionMappingCount !== 0 ||
    source.populationContext.generalAdultSuitabilityEstablished !== false ||
    source.populationContext.individualSuitabilityEstablished !== false ||
    source.rights.embedded !== false ||
    source.rights.reuseLicenseEstablished !== false ||
    source.sourceMediaObserved !== false ||
    source.sourceMediaCopied !== false ||
    source.sourceMediaTraced !== false ||
    !/^[a-f0-9]{64}$/.test(source.factualRecordSha256)
  )
    return null;

  const factualRecord: Readonly<Record<string, unknown>> = source.factualRecord;
  if (typeof factualRecord.variant !== 'string') return null;
  const facts: MotionCandidateResearchFact[] = [];
  for (const [key, labelKo] of FACT_FIELDS) {
    const value = factualRecord[key];
    const texts = typeof value === 'string' ? [value] : Array.isArray(value) ? value : [];
    for (const [index, text] of texts.entries()) {
      if (typeof text !== 'string') continue;
      const kind: MotionCandidateResearchFact['kind'] =
        key === 'clinicalDosageContext'
          ? 'clinical-context'
          : /not specified/i.test(text)
            ? 'source-unknown'
            : 'source-fact';
      facts.push(
        Object.freeze({
          id: key === 'contacts' ? `${key}-${index + 1}` : key,
          labelKo,
          text,
          kind,
        }),
      );
    }
  }

  return Object.freeze({
    candidateId: association.candidateId,
    exerciseId: association.exerciseId,
    labelKo: association.labelKo,
    variant: factualRecord.variant,
    status: 'research-only; no authored motion',
    statusLabelKo: '본문 사실 조사만 완료 · 제작 모션 없음',
    facts: Object.freeze(facts),
    unknown: Object.freeze([...source.unknown]),
    authoringChoicesRequired: Object.freeze([...recommendation.authoredChoicesRequired]),
    catalogBoundary: recommendation.catalogAlignment,
    source: Object.freeze({
      sourceId: source.sourceId,
      title: source.title,
      publisher: source.publisher,
      url: source.url,
      checkedAtUtc: source.checkedAtUtc,
      sourceChecked: true,
      factualRecordSha256: source.factualRecordSha256,
      factualRecordHashScope: ledger.hashMethod,
      attributionNoteKo: association.attributionNoteKo,
      population: Object.freeze({
        category: source.populationContext.category,
        contextLabelKo: association.populationLabelKo,
        exactAgeEligibilityEstablished: false,
        generalAdultSuitabilityEstablished: false,
        individualSuitabilityEstablished: false,
        clinicalUseInferred: false,
      } as const),
      rights: Object.freeze({
        mode: 'reference-only',
        labelKo: '본문 사실·원문 링크 참조만 · 영상·이미지 재사용 허가 미확인',
        embedded: false,
        reuseLicenseEstablished: false,
        sourceMediaObserved: false,
        mediaTimestamps: Object.freeze([] as const),
      } as const),
      lineage: Object.freeze({
        urlStatus: association.urlStatus,
        independentCorroborationEstablished: false,
      } as const),
    } as const),
    canonicalAsset: null,
    professionalReviewCount: 0,
    autoRecommendationEligible: false,
    modelAuthored: false,
    exactAssetReady: false,
    exactSourceVariantMatched: false,
    sourceVariantReconciliationRequired: true,
    safetyAssessment: 'unassessed',
    playbackTimingEstablished: false,
  } as const);
}

const EMPTY: readonly MotionCandidateResearch[] = Object.freeze([]);
const byExercise: ReadonlyMap<string, readonly MotionCandidateResearch[]> = new Map(
  ASSOCIATIONS.flatMap((association) => {
    const candidate = buildCandidate(association);
    return candidate ? [[association.exerciseId, Object.freeze([candidate])] as const] : [];
  }),
);

/** Exact discovery association only. No aliases, model lookup, clinical eligibility or writes. */
export function getMotionCandidateResearch(
  exerciseId: unknown,
): readonly MotionCandidateResearch[] {
  return typeof exerciseId === 'string' ? (byExercise.get(exerciseId) ?? EMPTY) : EMPTY;
}
