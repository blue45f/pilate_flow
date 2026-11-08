import { COURSE_REFERENCES } from './courseReferences';
import { resolveExtendedMotionSourceAudit } from './extendedMotionVerificationCatalog';
import { getMotionPatternReferences } from './motionPatternReferences';
import {
  APPARATUS_LABELS,
  CANONICAL_BLOCKS,
  INITIAL_EXERCISES,
  POSITION_LABELS,
  PROP_LABELS,
  SPINAL_PLANE_LABELS,
} from './pilatesCatalog';
import { PUBLIC_REFERENCES } from './publicReferences';
import { VERIFIED_REFERENCES } from './verifiedReferences';
import type { VerifiedPublicReference } from './verifiedReferences';
import type { PilatesExercise } from '../types/pilates';
import { getExerciseEvidence } from '../utils/exerciseEvidence';
import { getExerciseReviewState } from '../utils/exerciseReview';

export type VisualProductionMethod =
  | 'free-authored-kinematic-svg-v1'
  | 'ai-generated-raster'
  | 'external-unlicensed';

export interface VisualAssetIntegrityCheck {
  readonly productionMethod: VisualProductionMethod;
  readonly anatomicalAccuracyAssumed: false;
  readonly integrityPassed: boolean;
  readonly canRepresentMovementTechnique: boolean;
  readonly requiresSourceComparisonBeforeUse: true;
  readonly hasReliableSourceComparison: boolean;
  readonly quarantineReasonKo: string | null;
  readonly rightsPolicyKo: string;
  readonly anatomicalDisclaimerKo: string;
}

const DEFAULT_RIGHTS_POLICY_KO =
  '외부 영상·이미지를 무단 캡처하거나 복제하지 않고, 앱 내부 계획 메타데이터를 기반으로 직접 작성한 무료 2D 기구·관절 도해(SVG)만 사용하며 외부 신뢰 자료는 원문 링크만 참조합니다.';

const DEFAULT_ANATOMICAL_DISCLAIMER_KO =
  '생성물이나 저작 도해가 해부학적·임상적으로 정확하다고 절대 가정하지 않습니다(anatomicalAccuracyAssumed: false). 모든 시각 도해는 수업 계획 비교용 단순화 모식도이며 실제 인체 조직·개인별 관절 가동범위·의학적 안전성을 대체하지 않습니다.';

/**
 * Evaluates whether a visual asset may be shown as a movement schematic.
 * Never assumes generated or authored visuals are anatomically accurate.
 */
export function evaluateVisualAssetIntegrity(input: {
  productionMethod:
    | 'free-authored-kinematic-svg-v1'
    | 'ai-generated-raster'
    | 'external-unlicensed';
  anatomicalAccuracyAssumed?: boolean;
  hasReliableSourceComparison: boolean;
  exercise?: PilatesExercise;
}): VisualAssetIntegrityCheck {
  if (input.productionMethod === 'ai-generated-raster') {
    return Object.freeze({
      productionMethod: input.productionMethod,
      anatomicalAccuracyAssumed: false,
      integrityPassed: false,
      canRepresentMovementTechnique: false,
      requiresSourceComparisonBeforeUse: true,
      hasReliableSourceComparison: input.hasReliableSourceComparison,
      quarantineReasonKo:
        '생성 이미지는 해부학적·운동학적 정확성을 추정할 수 없어 동작 시범·정렬 근거로 사용할 수 없습니다(장식용 정물만 허용).',
      rightsPolicyKo: DEFAULT_RIGHTS_POLICY_KO,
      anatomicalDisclaimerKo: DEFAULT_ANATOMICAL_DISCLAIMER_KO,
    });
  }

  if (input.productionMethod === 'external-unlicensed') {
    return Object.freeze({
      productionMethod: input.productionMethod,
      anatomicalAccuracyAssumed: false,
      integrityPassed: false,
      canRepresentMovementTechnique: false,
      requiresSourceComparisonBeforeUse: true,
      hasReliableSourceComparison: input.hasReliableSourceComparison,
      quarantineReasonKo:
        '권리와 라이선스가 확인되지 않은 외부 이미지·영상 캡처는 저작권 및 출처 무결성 원칙에 따라 동작 시각 자료로 사용할 수 없습니다.',
      rightsPolicyKo: DEFAULT_RIGHTS_POLICY_KO,
      anatomicalDisclaimerKo: DEFAULT_ANATOMICAL_DISCLAIMER_KO,
    });
  }

  if (input.anatomicalAccuracyAssumed === true) {
    return Object.freeze({
      productionMethod: input.productionMethod,
      anatomicalAccuracyAssumed: false,
      integrityPassed: false,
      canRepresentMovementTechnique: false,
      requiresSourceComparisonBeforeUse: true,
      hasReliableSourceComparison: input.hasReliableSourceComparison,
      quarantineReasonKo:
        '시각 자산의 해부학적·임상적 정확성을 당연하게 가정(anatomicalAccuracyAssumed: true)하는 요청은 무결성 규칙에 의해 거부·격리됩니다.',
      rightsPolicyKo: DEFAULT_RIGHTS_POLICY_KO,
      anatomicalDisclaimerKo: DEFAULT_ANATOMICAL_DISCLAIMER_KO,
    });
  }

  if (!input.hasReliableSourceComparison) {
    return Object.freeze({
      productionMethod: input.productionMethod,
      anatomicalAccuracyAssumed: false,
      integrityPassed: false,
      canRepresentMovementTechnique: false,
      requiresSourceComparisonBeforeUse: true,
      hasReliableSourceComparison: false,
      quarantineReasonKo:
        '신뢰할 수 있는 공개 출처 및 카탈로그 메타데이터 대조 기록이 확인되지 않아 동작 비교 도해로 표시할 수 없습니다.',
      rightsPolicyKo: DEFAULT_RIGHTS_POLICY_KO,
      anatomicalDisclaimerKo: DEFAULT_ANATOMICAL_DISCLAIMER_KO,
    });
  }

  return Object.freeze({
    productionMethod: input.productionMethod,
    anatomicalAccuracyAssumed: false,
    integrityPassed: true,
    canRepresentMovementTechnique: true,
    requiresSourceComparisonBeforeUse: true,
    hasReliableSourceComparison: true,
    quarantineReasonKo: null,
    rightsPolicyKo: DEFAULT_RIGHTS_POLICY_KO,
    anatomicalDisclaimerKo: DEFAULT_ANATOMICAL_DISCLAIMER_KO,
  });
}

export type VisualReviewStage =
  | 'unreviewed-draft'
  | 'source-compared-pre-review'
  | 'instructor-reviewed'
  | 'stale-recheck-required'
  | 'expert-verified';

export interface ReliableSourceLink {
  readonly id: string;
  readonly titleKo: string;
  readonly publisherKo: string;
  readonly url: string;
  readonly verificationStatusLabelKo: string;
  readonly rightsLabelKo: string;
}

export interface ExtendedVisualAuditSummary {
  readonly factualRecordSha256: string;
  readonly sourceVerificationCategoryKo: string;
  readonly hasClearedYoutubeReplacementAudit: boolean;
  readonly hasExtendedCandidateMotionModel: boolean;
  readonly auditCheckedAt: string;
}

export interface VisualSourceComparisonRecord {
  readonly exerciseId: string;
  readonly exerciseNameKo: string;
  readonly reviewStage: VisualReviewStage;
  readonly isPostReview: boolean;
  readonly reviewBadgeKo: string;
  readonly anatomicalAccuracyAssumed: false;
  readonly professionalMotionReviewCount: 0;
  readonly productionRightsSummaryKo: string;
  readonly matchedReliableSources: readonly ReliableSourceLink[];
  readonly relatedMotionPatternIds: readonly string[];
  readonly matchedCatalogFactsKo: readonly string[];
  readonly diagramSimplificationsKo: readonly string[];
  readonly unverifiedItemsKo: readonly string[];
  readonly preToPostReviewChecklistKo: readonly string[];
  readonly extendedAuditSummary: ExtendedVisualAuditSummary;
}

const VERIFICATION_STATUS_LABELS_KO: Record<
  VerifiedPublicReference['verificationStatus'],
  string
> = {
  'official-source-checked': '공식 출처 본문 확인 (전문가 모션 검수 전)',
  'partial-playback-checked': '원본 영상 일부 프레임 확인 (전문가 모션 검수 전)',
  'korean-candidate': '국내 교육기관 후보 자료 (원본 재생·전문 검수 대기)',
};

function toReliableSourceLinkFromVerified(
  ref: VerifiedPublicReference,
): ReliableSourceLink {
  return Object.freeze({
    id: ref.id,
    titleKo: `${ref.title} (${ref.originalTitle})`,
    publisherKo: ref.sourceName,
    url: ref.url,
    verificationStatusLabelKo: VERIFICATION_STATUS_LABELS_KO[ref.verificationStatus],
    rightsLabelKo: ref.rightsNote,
  });
}

const PUBLIC_SOURCE_LINKS: readonly ReliableSourceLink[] = Object.freeze(
  PUBLIC_REFERENCES.map((item, idx) =>
    Object.freeze({
      id: `public-ref-0${idx + 1}`,
      titleKo: item.title,
      publisherKo: item.publisher,
      url: item.url,
      verificationStatusLabelKo: '공공기관 교육 참고 링크 (개별 필라테스 동작 처방 아님)',
      rightsLabelKo: item.rights,
    }),
  ),
);

function selectVerifiedReferencesForExercise(
  exercise: PilatesExercise,
): VerifiedPublicReference[] {
  const picked: VerifiedPublicReference[] = [];
  const addById = (id: string) => {
    const found = VERIFIED_REFERENCES.find((item) => item.id === id);
    if (found && !picked.some((existing) => existing.id === found.id)) {
      picked.push(found);
    }
  };

  if (exercise.sourceReference?.referenceId) {
    addById(exercise.sourceReference.referenceId);
  }

  // Match by apparatus, blockCategory, props, and spinalPlanes
  if (exercise.apparatus === 'chair' && exercise.blockCategory === 'footwork') {
    addById('mv-01');
  }
  if (exercise.props.includes('mini-ball')) {
    if (exercise.spinalPlanes.includes('lateral') || exercise.blockCategory === 'cooldown') {
      addById('mv-02');
    }
    if (exercise.blockCategory === 'bridging' || exercise.spinalPlanes.includes('extension')) {
      addById('mv-03');
    }
    if (exercise.bodyPosition === 'quadruped' || exercise.blockCategory === 'plank') {
      addById('mv-08');
    }
    if (exercise.bodyPosition === 'side-lying' || exercise.blockCategory === 'lower-body') {
      addById('mv-09');
    }
  }
  if (exercise.props.includes('magic-circle') || (exercise.apparatus === 'reformer' && exercise.blockCategory === 'warmup')) {
    addById('sr-01');
  }
  if (exercise.props.includes('foam-roller')) {
    addById('sr-03');
    addById('kr-06');
  }
  if (exercise.props.includes('theraband')) {
    if (exercise.spinalPlanes.includes('lateral')) addById('mv-05');
    if (exercise.bodyPosition === 'standing') addById('sr-02');
    addById('kr-03');
  }
  if (exercise.apparatus === 'barrel') {
    if (exercise.blockCategory === 'extension' || exercise.spinalPlanes.includes('extension')) {
      addById('mv-04');
    }
    if (exercise.spinalPlanes.includes('lateral') || exercise.blockCategory === 'cooldown') {
      addById('mv-05');
    }
    if (exercise.bodyPosition === 'standing') {
      addById('sr-02');
    }
  }
  if (exercise.apparatus === 'cadillac') {
    if (exercise.bodyPosition === 'kneeling' || exercise.blockCategory === 'warmup' || exercise.blockCategory === 'upper-body') {
      addById('mv-11');
      addById('mv-12');
    }
    if (exercise.blockCategory === 'bridging') {
      addById('kr-05');
      addById('mv-03');
    }
    if (exercise.blockCategory === 'core' || exercise.blockCategory === 'feet-in-straps') {
      addById('kr-07');
      addById('kr-04');
    }
  }
  if (exercise.apparatus === 'reformer') {
    if (exercise.blockCategory === 'footwork') {
      addById('sr-01');
      addById('mv-06');
    }
    if (exercise.blockCategory === 'bridging') {
      addById('kr-05');
      addById('mv-03');
    }
    if (exercise.blockCategory === 'core') {
      addById('kr-01');
      addById('kr-04');
    }
    if (exercise.blockCategory === 'upper-body') {
      addById('mv-07');
      addById('sr-01');
    }
    if (exercise.blockCategory === 'lower-body') {
      addById('mv-17');
      addById('mv-06');
    }
    if (exercise.blockCategory === 'plank') {
      addById('mv-16');
      addById('mv-08');
    }
    if (exercise.blockCategory === 'extension') {
      addById('mv-15');
      addById('mv-13');
    }
    if (exercise.blockCategory === 'feet-in-straps') {
      addById('kr-07');
      addById('kr-04');
    }
    if (exercise.blockCategory === 'cooldown') {
      addById('mv-13');
      addById('mv-05');
    }
  }
  if (exercise.apparatus === 'chair') {
    addById('mv-01');
    if (exercise.bodyPosition === 'standing' || exercise.blockCategory === 'lower-body') {
      addById('sr-02');
    }
    if (exercise.blockCategory === 'plank' || exercise.bodyPosition === 'quadruped') {
      addById('mv-08');
    }
  }
  if (exercise.apparatus === 'mat') {
    if (exercise.blockCategory === 'warmup') {
      addById('kr-08');
      addById('kr-09');
      addById('kr-02');
    }
    if (exercise.blockCategory === 'footwork') {
      addById('sr-02');
    }
    if (exercise.blockCategory === 'bridging') {
      addById('kr-05');
      addById('mv-03');
    }
    if (exercise.blockCategory === 'core') {
      addById('kr-01');
      addById('kr-03');
      addById('kr-04');
    }
    if (exercise.blockCategory === 'upper-body') {
      addById('kr-03');
      addById('sr-02');
    }
    if (exercise.blockCategory === 'lower-body') {
      addById('mv-09');
      addById('mv-10');
    }
    if (exercise.blockCategory === 'plank') {
      addById('mv-08');
      addById('mv-10');
    }
    if (exercise.blockCategory === 'extension') {
      addById('mv-14');
    }
    if (exercise.blockCategory === 'cooldown') {
      addById('mv-02');
      addById('mv-05');
    }
  }

  // Fallback by blockCategory so every exercise matches at least 2 verified references
  if (picked.length < 2) {
    if (exercise.blockCategory === 'warmup') {
      addById('kr-08');
      addById('kr-02');
    } else if (exercise.blockCategory === 'footwork') {
      addById('mv-01');
      addById('sr-02');
    } else if (exercise.blockCategory === 'bridging') {
      addById('kr-05');
      addById('mv-03');
    } else if (exercise.blockCategory === 'core') {
      addById('kr-01');
      addById('kr-04');
    } else if (exercise.blockCategory === 'upper-body') {
      addById('mv-07');
      addById('sr-01');
    } else if (exercise.blockCategory === 'lower-body') {
      addById('mv-09');
      addById('mv-17');
    } else if (exercise.blockCategory === 'plank') {
      addById('mv-08');
      addById('mv-16');
    } else if (exercise.blockCategory === 'extension') {
      addById('mv-14');
      addById('mv-04');
    } else if (exercise.blockCategory === 'feet-in-straps') {
      addById('kr-07');
      addById('mv-18');
    } else {
      addById('mv-05');
      addById('mv-02');
    }
  }

  return picked.slice(0, 3);
}

function buildMatchedReliableSources(exercise: PilatesExercise): readonly ReliableSourceLink[] {
  const verifiedLinks = selectVerifiedReferencesForExercise(exercise).map(
    toReliableSourceLinkFromVerified,
  );
  const publicLink =
    exercise.apparatus === 'mat' ? PUBLIC_SOURCE_LINKS[1] : PUBLIC_SOURCE_LINKS[0];

  const matchingCourse = COURSE_REFERENCES.find((course) => {
    const eq = (course.facts.apparatus ?? []).map((item) => item.toLowerCase());
    if (exercise.apparatus === 'barrel') {
      return eq.some((item) => item.includes('barrel'));
    }
    return eq.includes(exercise.apparatus);
  });

  const links: ReliableSourceLink[] = [...verifiedLinks];
  if (matchingCourse && matchingCourse.publisher) {
    links.push(
      Object.freeze({
        id: `course-${matchingCourse.id}`,
        titleKo: matchingCourse.title,
        publisherKo: matchingCourse.publisher,
        url: matchingCourse.canonicalUrl,
        verificationStatusLabelKo:
          '공개 전체 수업 탐색 링크 (개별 동작 타임스탬프·전문 검수 미포함)',
        rightsLabelKo: '원문 링크 전용 (link-only) · 영상 복제·임베드 권리 미확인',
      }),
    );
  }
  if (publicLink) {
    links.push(publicLink);
  }
  return Object.freeze(links.slice(0, 4));
}

function formatBlockLabelKo(category: PilatesExercise['blockCategory']): string {
  const block = CANONICAL_BLOCKS.find((item) => item.category === category);
  return block ? `${block.stepNumber} ${block.nameKo}` : category;
}

function formatSpinalPlanesKo(planes: readonly PilatesExercise['spinalPlanes'][number][]): string {
  return planes.map((plane) => SPINAL_PLANE_LABELS[plane]?.ko ?? plane).join(' · ');
}

function formatPropsKo(props: readonly PilatesExercise['props'][number][]): string {
  return props.map((prop) => PROP_LABELS[prop]?.ko ?? prop).join(', ');
}

function resolveVisualReviewStage(
  exercise: PilatesExercise,
  hasMatchedSources: boolean,
): VisualReviewStage {
  const reviewState = getExerciseReviewState(exercise);
  if (reviewState === 'approved') {
    return 'instructor-reviewed';
  }
  if (reviewState === 'stale') {
    return 'stale-recheck-required';
  }
  return hasMatchedSources ? 'source-compared-pre-review' : 'unreviewed-draft';
}

function isPostReviewStage(stage: VisualReviewStage): boolean {
  return stage === 'instructor-reviewed' || stage === 'expert-verified';
}

function getReviewBadgeKo(stage: VisualReviewStage): string {
  switch (stage) {
    case 'instructor-reviewed':
      return '검토 후 · 강사 계획 검토 완료 (외부 전문가 모션 검수 0건)';
    case 'expert-verified':
      return '검토 후 · 외부 전문가 모션 검수 완료';
    case 'stale-recheck-required':
      return '재검토 필요 · 동작 정보 변경됨 (검토 전 상태로 격리)';
    case 'source-compared-pre-review':
      return '검토 전 · 출처 대조 초안 (수업 자동 편성 제외)';
    case 'unreviewed-draft':
      return '검토 전 · 미검토 초안 (수업 자동 편성 제외)';
  }
}

function resolveSourceVerificationCategoryKo(
  exercise: PilatesExercise,
  extendedAudit: ReturnType<typeof resolveExtendedMotionSourceAudit>,
): string {
  if (extendedAudit.clearedYoutubeReplacementAudit) {
    return '레거시 미검증 링크 제거 후 공공·공식 대체 출처 대조 기록 (전문가 검증 전)';
  }
  if (
    exercise.id.startsWith('ex-kr-') ||
    (!extendedAudit.candidateMatMotionModel &&
      !extendedAudit.previouslyUnboundMotionModel &&
      extendedAudit.verifiedReferenceAuditRecord?.originalVerificationStatus ===
        'korean-candidate')
  ) {
    return '국내 교육기관 후보 자료 메타데이터·역학 범위 대조 기록 (전문가 검증 전)';
  }
  if (
    extendedAudit.candidateMatMotionModel ||
    extendedAudit.previouslyUnboundMotionModel ||
    extendedAudit.verifiedReferenceAuditRecord?.originalVerificationStatus ===
      'official-source-checked' ||
    extendedAudit.verifiedReferenceAuditRecord?.originalVerificationStatus ===
      'partial-playback-checked'
  ) {
    return '공식·학술·임상 출처 본문 및 생체역학 범위 대조 기록 (전문가 검증 전)';
  }
  return '카탈로그 기구·자세·근육 표준 원장 대조 기록 (전문가 검증 전)';
}

/**
 * Computes the pre-review vs post-review visual source comparison record for an exercise.
 * Strictly separates pre-review ('unreviewed-draft' | 'source-compared-pre-review' | 'stale-recheck-required')
 * from post-review ('instructor-reviewed' | 'expert-verified') and never assumes anatomical accuracy.
 */
export function getVisualSourceComparison(
  exercise: PilatesExercise,
): VisualSourceComparisonRecord {
  const evidence = getExerciseEvidence(exercise);
  const matchedReliableSources = buildMatchedReliableSources(exercise);
  const relatedPatterns = getMotionPatternReferences(exercise.id);
  const relatedMotionPatternIds = Object.freeze(
    relatedPatterns.map((pattern) => pattern.variantId),
  );
  const extendedAudit = resolveExtendedMotionSourceAudit(exercise);
  const extendedAuditSummary: ExtendedVisualAuditSummary = Object.freeze({
    factualRecordSha256: extendedAudit.primaryFactualRecordSha256,
    sourceVerificationCategoryKo: resolveSourceVerificationCategoryKo(
      exercise,
      extendedAudit,
    ),
    hasClearedYoutubeReplacementAudit: Boolean(
      extendedAudit.clearedYoutubeReplacementAudit,
    ),
    hasExtendedCandidateMotionModel: Boolean(
      extendedAudit.candidateMatMotionModel,
    ),
    auditCheckedAt: extendedAudit.checkedAt || '2026-11-08',
  });

  const reviewStage = resolveVisualReviewStage(
    exercise,
    matchedReliableSources.length > 0,
  );
  const isPostReview = isPostReviewStage(reviewStage);
  const reviewBadgeKo = getReviewBadgeKo(reviewStage);

  const apparatusLabel = APPARATUS_LABELS[exercise.apparatus]?.ko ?? exercise.apparatus;
  const positionLabel = POSITION_LABELS[exercise.bodyPosition]?.ko ?? exercise.bodyPosition;
  const planesLabel = formatSpinalPlanesKo(exercise.spinalPlanes);
  const propsLabel = formatPropsKo(exercise.props);
  const blockLabel = formatBlockLabelKo(exercise.blockCategory);

  const matchedCatalogFactsKo = Object.freeze([
    `기구·블록·자세 대조: ${apparatusLabel} · ${blockLabel} · ${positionLabel} (소도구: ${propsLabel})`,
    `기구 세부 세팅 대조: 스프링 [${exercise.springs}] · 풋바 [${exercise.footbar}] · 헤드레스트 [${exercise.headrest}] · 박스 [${exercise.box}]`,
    `척추 면·주요 타겟 근육 대조: ${planesLabel} · 타겟 근육 [${exercise.targetMuscles.join(', ')}] (${exercise.isUnilateral ? '편측 교대 제어' : '양측 대칭 제어'})`,
    `호흡·핵심 큐 대조: ${exercise.breathPattern} / 큐: "${exercise.cues[0] ?? ''}" (출처 상태: ${evidence.source.label})`,
  ]);

  const diagramSimplificationsKo = Object.freeze([
    `2D 평면 투영 단순화: ${positionLabel}에서 일어나는 3차원 흉곽 확장·견갑골 상방/하방회전·골반 기저부 미세 조절을 2D 관절 좌표와 선분으로 단순화했습니다.`,
    `기구·저항 역학 도식화: ${apparatusLabel}(${exercise.springs})의 실제 스프링 비선형 장력 곡선과 캐리지·바·페달 마찰을 기하학적 지지선과 방향 화살표로만 표현합니다.`,
    `해부학적 조직 추정 배제: ${exercise.targetMuscles.join(', ')}의 실제 근섬유 주행·건 부착부·관절낭 압력을 묘사하지 않으며 해부학적 정확성을 가정하지 않습니다(anatomicalAccuracyAssumed: false).`,
  ]);

  const unverifiedItemsKo = Object.freeze([
    '외부 생체역학·임상 필라테스 전문가에 의한 프레임별 모션 정확성 검수 (현재 전문 검수 0건)',
    `제조사별 ${apparatusLabel} 스프링(${exercise.springs}) 실측 장력 편차 및 현장 스토퍼·스트랩·클립 안전 상태`,
    `수강생 개인별 체형·관절 가동범위(ROM)·척추/관절 병력에 따른 금기 여부 (주의: ${exercise.precautions})`,
    relatedMotionPatternIds.length > 0
      ? `연결된 관련 패턴 도해(${relatedMotionPatternIds.join(', ')})와 현재 동작 변형 간의 1:1 정밀 일치 여부`
      : '카탈로그 표준 동작과 개별 강사 티칭 변형(Easy·Standard·Hard) 간의 임상적 동등성 여부',
  ]);

  const preToPostReviewChecklistKo = Object.freeze([
    `[1단계 · 기구/안전 실측 확인] ${apparatusLabel} 스프링(${exercise.springs})·헤드레스트(${exercise.headrest})·박스(${exercise.box}) 세팅과 주의사항("${exercise.precautions}")을 현장 기구에서 직접 점검했는가?`,
    `[2단계 · 시작-중간-끝 관절 정렬 대조] ${positionLabel} 시작 정렬 → ${planesLabel} 최대 가동 구간 → 복귀 제어 구간이 신뢰 출처(${matchedReliableSources[0]?.publisherKo ?? '공식 참고자료'}) 원칙과 모순되지 않는가?`,
    `[3단계 · 호흡·큐잉·레이어 적합성 확인] 호흡("${exercise.breathPattern}")과 단계별 옵션(Easy: ${exercise.layers.easy} / Hard: ${exercise.layers.hard})이 대상 수업 수준(Lv ${exercise.level})에 부합하는가?`,
    `[4단계 · 도해 한계 인지 및 강사 검토 승인] 2D 도해가 해부학적 실측이 아님을 인지하고, 강사 본인의 수업 계획 검토(review.status = 'approved')를 완료해 검토 전 상태와 명확히 구분했는가?`,
  ]);

  return Object.freeze({
    exerciseId: exercise.id,
    exerciseNameKo: exercise.nameKo,
    reviewStage,
    isPostReview,
    reviewBadgeKo,
    anatomicalAccuracyAssumed: false,
    professionalMotionReviewCount: 0,
    productionRightsSummaryKo:
      '앱 내부 계획 메타데이터로 직접 제작한 무료 2D 기구·관절 도해(SVG) · 외부 저작물 무단 복제 없음 · 원문 출처 링크 전용(link-only)',
    matchedReliableSources,
    relatedMotionPatternIds,
    matchedCatalogFactsKo,
    diagramSimplificationsKo,
    unverifiedItemsKo,
    preToPostReviewChecklistKo,
    extendedAuditSummary,
  });
}

export const CATALOG_VISUAL_SOURCE_COMPARISONS: readonly VisualSourceComparisonRecord[] =
  Object.freeze(INITIAL_EXERCISES.map((exercise) => getVisualSourceComparison(exercise)));

export interface MovementDifferenceDimension {
  readonly dimensionKey:
    | 'start-pose'
    | 'middle-peak-pose'
    | 'end-return-pose'
    | 'joint-alignment'
    | 'movement-direction'
    | 'primary-muscles'
    | 'apparatus-support';
  readonly labelKo: string;
  readonly leftSummaryKo: string;
  readonly rightSummaryKo: string;
  readonly keyDifferenceKo: string;
}

export interface MovementDifferenceComparison {
  readonly pairId: string;
  readonly titleKo: string;
  readonly reasonForComparisonKo: string;
  readonly leftExerciseId: string;
  readonly rightExerciseId: string;
  readonly leftNameKo: string;
  readonly rightNameKo: string;
  readonly dimensions: readonly MovementDifferenceDimension[];
  readonly teachingDistinctionTipKo: string;
}

interface CuratedPairNote {
  readonly leftId: string;
  readonly rightId: string;
  readonly titleKo: string;
  readonly reasonForComparisonKo: string;
  readonly teachingDistinctionTipKo: string;
  readonly startDiffOverrideKo?: string;
  readonly peakDiffOverrideKo?: string;
  readonly returnDiffOverrideKo?: string;
  readonly alignmentDiffOverrideKo?: string;
  readonly directionDiffOverrideKo?: string;
}

const CURATED_PAIR_NOTES: readonly CuratedPairNote[] = [
  {
    leftId: 'original-mat-pelvic-clock',
    rightId: 'original-mat-bridge',
    titleKo: '매트 골반 시계 vs 매트 브리지 (골반 미세 경사 vs 둔근 리프트)',
    reasonForComparisonKo:
      '두 동작 모두 누운 자세(Supine)에서 무릎을 세우고 시작해 초보자가 혼동하기 쉽지만, 천골(꼬리뼈)의 매트 접촉 유지 여부와 고관절 신전 범위가 완전히 다릅니다.',
    teachingDistinctionTipKo:
      '골반 시계는 천골을 매트에 붙인 채 미세한 요추·골반 기울기만 탐색하게 하고, 브리지는 두 발바닥 지지와 함께 골반을 매트에서 들어 올려 고관절 신전까지 연결하도록 구분 지도하세요.',
    startDiffOverrideKo:
      '두 동작 모두 무릎을 세운 수파인 자세에서 출발하나, 골반 시계는 천골 바닥 접촉 인지가 핵심이고 브리지는 발바닥 전체의 지면 반발력 준비가 핵심입니다.',
    peakDiffOverrideKo:
      '골반 시계는 골반이 매트 위에서 12시-6시 방향으로 작은 기울임만 만들지만, 브리지는 골반을 들어 무릎-골반-어깨 사선 신전 라인을 형성합니다.',
    returnDiffOverrideKo:
      '골반 시계는 기울임을 멈추고 편안한 중립 중심점으로 수평 복귀하며, 브리지는 윗등부터 천골까지 수직 하강으로 매트에 내려옵니다.',
  },
  {
    leftId: 'original-mat-heel-slide',
    rightId: 'original-mat-knee-fold',
    titleKo: '매트 힐 슬라이드 vs 매트 니 폴드 (수평 활주 신전 vs 테이블탑 굴곡)',
    reasonForComparisonKo:
      '누운 코어 기초에서 골반 중립 안정화를 훈련하는 대표 한 다리 동작이지만, 다리가 바닥을 따라 뻗어 나가는지(장요근 원심성 제어) 공중으로 접어 올리는지(고관절 굴곡 모멘트 제어)가 정반대입니다.',
    teachingDistinctionTipKo:
      '힐 슬라이드는 다리를 뻗을 때 허리가 뜨지 않게 복부 앞쪽 길이를 지키는 데 집중시키고, 니 폴드는 발을 들 때 골반이 좌우로 기우뚱하지 않게 심부 복횡근을 먼저 세팅시키세요.',
    startDiffOverrideKo:
      '두 동작 모두 수파인 중립 골반에서 시작하지만, 힐 슬라이드는 발뒤꿈치의 바닥 마찰 활주를 준비하고 니 폴드는 한쪽 발바닥 무게를 지면에서 떼는 감각을 준비합니다.',
    peakDiffOverrideKo:
      '힐 슬라이드는 무릎이 펴지며 다리가 매트 수평 방향으로 길어지고, 니 폴드는 고관절·무릎 90도(테이블탑 방향)로 다리를 들어 올립니다.',
    returnDiffOverrideKo:
      '힐 슬라이드는 뻗은 발뒤꿈치를 바닥을 스치며 무릎 굽힘 위치로 당겨 오고, 니 폴드는 공중의 발을 골반 흔들림 없이 바닥 원위치에 사뿐히 내려놓습니다.',
  },
  {
    leftId: 'original-mat-chest-lift',
    rightId: 'original-mat-single-leg-stretch',
    titleKo: '매트 체스트 리프트 vs 싱글 레그 스트레치 준비 (상부 흉추 굴곡 단독 vs 하지 교대 결합)',
    reasonForComparisonKo:
      '상체 컬업(흉추 굴곡)을 공유하지만, 하지가 바닥에 고정된 순수 상복부 굴곡인지 교대로 뻗는 하지 레버리지 부하가 결합되는지에 따라 요추 안정화 난도가 크게 달라집니다.',
    teachingDistinctionTipKo:
      '체스트 리프트에서 경추 긴장 없이 날개뼈 하각을 띄우는 패턴이 먼저 안정된 회원에게만 싱글 레그 스트레치의 다리 교대 뻗기를 연결하세요.',
    startDiffOverrideKo:
      '체스트 리프트는 두 발을 바닥에 두고 양손으로 머리를 지지하며, 싱글 레그 스트레치 준비는 한 다리씩 교대 리치를 위한 복부-고관절 동시 세팅에서 출발합니다.',
    peakDiffOverrideKo:
      '체스트 리프트는 골반 고정 상태에서 흉추만 굴곡해 정점을 만들고, 싱글 레그 스트레치 준비는 한 다리를 사선 앞으로 뻗으며 반대 무릎을 당기는 비대칭 사지 협응이 일어납니다.',
  },
  {
    leftId: 'original-mat-side-leg-lift',
    rightId: 'original-mat-clam',
    titleKo: '옆으로 누워 다리 들기 vs 사이드 클램 (관상면 고관절 외전 vs 발 고정 외회전)',
    reasonForComparisonKo:
      '둘 다 옆으로 누운(Side-Lying) 중둔근·고관절 운동이지만, 무릎을 편 채 다리 전체를 들어 올리는 외전(Abduction)인지 두 발을 붙인 채 무릎만 여는 외회전(External Rotation)인지가 명확히 구분됩니다.',
    teachingDistinctionTipKo:
      '사이드 레그 리프트는 긴 다리 지렛대로 중둔근 외전과 옆구리 지지력을 동시에 요구하고, 클램은 발뒤꿈치를 축으로 후방 중둔근·심부 외회전근을 고립시킬 때 선택하세요.',
    startDiffOverrideKo:
      '사이드 레그 리프트는 위쪽 다리를 길게 뻗어 시작하고, 사이드 클램은 두 무릎과 고관절을 살짝 굽혀 두 발을 포갠 자세에서 시작합니다.',
    peakDiffOverrideKo:
      '사이드 레그 리프트는 발끝까지 일직선인 다리가 천장 쪽으로 평행 상승하며, 클램은 두 발이 붙은 상태에서 위쪽 무릎만 조개껍데기처럼 회전하며 열립니다.',
  },
  {
    leftId: 'original-mat-swan-prep',
    rightId: 'original-mat-swimming-prep',
    titleKo: '매트 스완 준비 vs 스위밍 준비 (양팔 지지 흉추 신전 vs 교차 사지 리치 항회전)',
    reasonForComparisonKo:
      '엎드린 자세(Prone) 후면 사슬 운동이라는 공통점이 있으나, 양손 지지를 통해 흉추를 분절 신전하는 동작과 팔·다리를 교차로 뻗어 몸통 회전 흔들림을 막는 동작은 운동 목적이 다릅니다.',
    teachingDistinctionTipKo:
      '스완 준비는 가슴을 앞으로 길게 뽑아 올리는 시상면 흉추 신전 가동성에 집중시키고, 스위밍 준비는 높이보다 손끝-발끝을 반대 방향으로 늘리며 골반 좌우 흔들림을 막는 데 집중시키세요.',
    startDiffOverrideKo:
      '스완 준비는 전완·손바닥을 가슴 옆 매트에 지지해 시작하고, 스위밍 준비는 팔을 머리 위쪽으로 뻗어 사지 리치를 준비합니다.',
    peakDiffOverrideKo:
      '스완 준비는 양측 대칭으로 상부 흉추를 들어 올리고, 스위밍 준비는 반대쪽 팔·다리를 교차 신전하며 몸통 항회전(Anti-rotation) 균형을 유지합니다.',
  },
  {
    leftId: 'original-reformer-parallel-footwork',
    rightId: 'ex-footwork-02',
    titleKo: '리포머 패럴렐 풋워크 vs 써클링 와이드 세컨드 풋워크 (평행 정렬 기초 vs 외전 링 저항)',
    reasonForComparisonKo:
      '동일한 리포머 수파인 풋워크 블록이지만, 11자 평행 스탠스의 기본 하지 정렬 훈련과 써클링(Magic Circle)을 착용한 와이드 외회전·중둔근 강화 변형의 차이를 비교합니다.',
    teachingDistinctionTipKo:
      '패럴렐 풋워크로 발목-무릎-고관절 11자 트래킹을 먼저 확립한 뒤, 골반 외측 안정성과 중둔근 자극을 높이고 싶을 때 써클링 와이드 세컨드 풋워크로 발전시키세요.',
    startDiffOverrideKo:
      '패럴렐 풋워크는 소도구 없이 골반 너비 평행 발 위치로 시작하고, 써클링 와이드 세컨드는 허벅지에 매직써클을 착용하고 풋바 넓은 외회전 스탠스로 시작합니다.',
    peakDiffOverrideKo:
      '패럴렐 풋워크는 직선 신전 제어에 집중하며, 써클링 와이드 세컨드는 캐리지 확장 정점에서 링을 바깥으로 벌리는 외전 펄스(Abduction Pulse)가 결합됩니다.',
  },
  {
    leftId: 'ex-footwork-01',
    rightId: 'ex-footwork-03',
    titleKo: '리포머 클래식 풋워크 4종 vs 운다 체어 시티드 풋워크 (수파인 캐리지 이동 vs 시티드 수직 페달)',
    reasonForComparisonKo:
      '같은 풋워크 블록이라도 누워서 등 전체를 캐리지에 지지한 채 몸이 수평 이동하는 리포머와, 시트에 앉아 척추를 스스로 세운 채 페달만 수직으로 밟는 체어의 역학적 차이를 대조합니다.',
    teachingDistinctionTipKo:
      '척추 기립 부담 없이 하지 정렬과 족저 감각을 깨울 때는 리포머 수파인 풋워크를, 앉은 코어 수직 항중력 유지와 고관절 굴곡근 제어를 동시에 훈련할 때는 체어 시티드 풋워크를 선택하세요.',
    startDiffOverrideKo:
      '리포머 풋워크는 수파인(누운 자세)에서 미니볼을 무릎 사이에 끼우고 풋바에 발을 두며, 체어 풋워크는 시티드(앉은 자세)에서 좌골을 시트에 수직으로 세우고 페달을 밟아 시작합니다.',
    peakDiffOverrideKo:
      '리포머는 무릎을 펴며 신체가 수평으로 멀어지고, 체어는 골반·척추 높이를 고정한 채 다리만 아래로 뻗어 페달을 바닥 쪽으로 프레스합니다.',
  },
  {
    leftId: 'ex-bridging-01',
    rightId: 'ex-bridging-02',
    titleKo: '리포머 아티큘레이팅 펠빅 리프트 vs 캐딜락 타워 바 숄더 브릿지 (수평 캐리지 제어 vs 수직 타워 바 지지)',
    reasonForComparisonKo:
      '기구 브릿징 블록의 양대 핵심 동작으로, 수평으로 밀리는 캐리지를 햄스트링으로 잡아당기며 분절하는 리포머와 하단 스프링이 걸린 수직 푸시스루 바를 발볼로 밀어 올리며 분절하는 캐딜락을 비교합니다.',
    teachingDistinctionTipKo:
      '리포머 브릿지는 헤드레스트 Flat 확인과 캐리지 미끄러짐 제어(햄스트링 구심/원심 수축)가 핵심이고, 캐딜락 타워 브릿지는 흔들리는 수직 바 위에서 발목·고관절 수직 정렬을 잡는 것이 핵심입니다.',
  },
  {
    leftId: 'ex-core-01',
    rightId: 'ex-core-04',
    titleKo: '리포머 수파인 헌드레드 시리즈 vs 리포머 리버스 앱스 닐링 크런치 (상부 컬업 스트랩 vs 네발기기 하복부 견인)',
    reasonForComparisonKo:
      '리포머 코어 블록에서 가장 자주 대비되는 두 동작으로, 누워서 상체를 컬업해 손 스트랩을 당기는 방식과 네발기기로 풋바를 바라보고 무릎으로 캐리지를 끌어당기는 방식을 비교합니다.',
    teachingDistinctionTipKo:
      '경추 피로도가 높거나 목 통증이 있는 회원에게는 수파인 헌드레드 대신 목 부담 없이 하복부 스쿱과 전거근 지지를 집중 훈련하는 리버스 앱스(ex-core-04)가 훌륭한 대안이 됩니다.',
  },
  {
    leftId: 'ex-core-02',
    rightId: 'ex-core-03',
    titleKo: '리포머 숏박스 앱 시리즈 vs 매트 앱 파이브 (시티드 척추 롤백/힌지 vs 수파인 컬업 하지 교대)',
    reasonForComparisonKo:
      '풋 스트랩에 발을 걸고 앉은 상태에서 몸통 전체의 기울기·회전을 큰 가동범위로 제어하는 숏박스 시리즈와, 매트에 누워 상체 컬업을 고정한 채 다리를 교차하는 앱 파이브의 차이를 비교합니다.',
    teachingDistinctionTipKo:
      '숏박스 앱 시리즈는 라운드백·플랫백·트위스트로 척추 면을 입체적으로 확장할 때 유리하고, 매트 앱 파이브는 심부 복횡근 지구력과 상·하복부 협응을 연속 타격할 때 효과적입니다.',
  },
  {
    leftId: 'ex-upper-01',
    rightId: 'ex-upper-02',
    titleKo: '리포머 닐링 체스트 익스팬션 vs 리포머 시티드 백/프론트 로잉 (신전·회전 견인 vs 굴곡·서빙 프레스)',
    reasonForComparisonKo:
      '리포머 상체 스트랩 블록에서 무릎을 꿇고(Kneeling) 스트랩을 골반 뒤로 당기는 후면 사슬·흉추 회전 동작과, 앉아서(Seated) 앞으로 스트랩을 밀어내는 전면/상부 견갑대 협응 동작을 비교합니다.',
    teachingDistinctionTipKo:
      '라운드숄더 교정과 광배근·능형근 수축이 최우선이면 닐링 체스트 익스팬션(풋바 방향)을, 전거근·삼각근·삼두근과 코어 버티기를 함께 쓰려면 시티드 프론트 로잉(등지고 앉기)을 배치하세요.',
  },
  {
    leftId: 'ex-lower-01',
    rightId: 'ex-lower-02',
    titleKo: '리포머 스탠딩 스쿠터 & 런지 vs 리포머 스탠딩 사이드 스플릿 (시상면 전후 신전 vs 관상면 좌우 외전/내전)',
    reasonForComparisonKo:
      '리포머 스탠딩 하체 블록의 대표 쌍으로, 한 발은 바닥·한 발은 캐리지에 두고 앞뒤(시상면)로 움직이는 스쿠터/런지와 플랫폼·캐리지 위에 서서 좌우(관상면)로 벌리는 사이드 스플릿을 비교합니다.',
    teachingDistinctionTipKo:
      '스쿠터는 지지 다리 무릎 각도 고정과 대둔근·장요근 전후 분리에 초점을 맞추고, 사이드 스플릿은 스프링 무게에 따라 중둔근(무거운 스프링) 또는 내전근(가벼운 스프링)으로 타겟이 전환됨을 강조하세요.',
  },
  {
    leftId: 'ex-lower-03',
    rightId: 'ex-lower-04',
    titleKo: '운다 체어 스탠딩 포워드 런지 vs 리포머 사이드 라잉 스트랩 레그 (항중력 고강도 스텝업 vs 누운 골반 안정화 스트랩)',
    reasonForComparisonKo:
      '하체·둔근 강화 블록에서 전신 밸런스와 고강도 수직 부하를 요구하는 체어 스탠딩 런지(Lv 2.0)와, 옆으로 누워 무릎·발목 체중 부하 없이 중둔근을 고립하는 리포머 사이드 라잉 스트랩(Lv 1.0)을 비교합니다.',
    teachingDistinctionTipKo:
      '무릎 관절 부담이나 균형 불안이 있는 회원에게는 사이드 라잉 스트랩 시리즈(ex-lower-04)를 배정하고, 숙련자 스컬프 반에서는 체어 포워드 런지 & 마운틴 클라이머(ex-lower-03)로 강도를 끌어올리세요.',
  },
  {
    leftId: 'ex-plank-01',
    rightId: 'ex-plank-02',
    titleKo: '리포머 롱 스트레치 & 엘리펀트 vs 운다 체어 파이크 풀업 (수평 플랭크 글라이드 vs 수직 파이크 굴곡)',
    reasonForComparisonKo:
      '플랭크 블록의 대표 기구 동작으로, 풋바를 짚고 어깨 관절이 수평 이동하는 리포머 롱 스트레치와 체어 시트를 짚고 하복부 힘으로 페달을 수직으로 끌어올리는 체어 파이크를 비교합니다.',
    teachingDistinctionTipKo:
      '리포머 롱 스트레치는 몸통 일직선(중립)을 유지하며 견갑대 흔들림을 잡는 데 집중하고, 체어 파이크는 흉곽-골반 굴곡 스쿱으로 페달이 떠오르게 만드는 수직 코어 리프트에 집중합니다.',
  },
  {
    leftId: 'ex-extension-01',
    rightId: 'ex-extension-02',
    titleKo: '리포머 롱박스 풀링 스트랩 스완 vs 래더 바렐 스완 다이브 (스트랩 견인 상부 신전 vs 바렐 곡면 전신 아치)',
    reasonForComparisonKo:
      '척추 신전(Extension) 블록에서 평평한 롱박스 위에 엎드려 스트랩 장력으로 광배근·상부 흉추를 깨우는 리포머 스완과, 둥근 바렐 곡면을 따라 굴곡에서 깊은 신전 아치까지 연결하는 바렐 스완을 비교합니다.',
    teachingDistinctionTipKo:
      '상체 후면(광배근·능형근·후면삼각근) 견인 힘을 함께 길러주려면 리포머 풀링 스트랩을, 바렐 곡면 지지를 활용해 요추 과신전 없이 척추 전체의 유려한 분절 신전을 유도하려면 래더 바렐 스완을 선택하세요.',
  },
  {
    leftId: 'ex-straps-01',
    rightId: 'ex-straps-02',
    titleKo: '리포머 핏인스트랩 시리즈 vs 캐딜락 레그 스프링 시리즈 (단일 캐리지 연동 루프 vs 좌우 독립 스프링)',
    reasonForComparisonKo:
      '두 다리에 스트랩을 걸고 고관절 가동성과 내전근·햄스트링을 다듬는 핏인스트랩 블록에서, 하나의 캐리지에 연결된 리포머 스트랩과 좌우가 완전히 독립된 캐딜락 레그 스프링의 차이를 대조합니다.',
    teachingDistinctionTipKo:
      '리포머 핏인스트랩은 캐리지 이동과 함께 숏스파인 등 감압 분절로 연결하기 좋고, 캐딜락 레그 스프링은 우세 다리가 비우세 다리를 대신 밀어줄 수 없어 좌우 골반·하지 비대칭 교정에 탁월합니다.',
  },
  {
    leftId: 'ex-cooldown-01',
    rightId: 'ex-cooldown-02',
    titleKo: '리포머 시티드 머메이드 vs 매트 스탠딩 척추 롤다운 (Z-Sit 측굴·회전 이완 vs 직립 시상면 중력 분절)',
    reasonForComparisonKo:
      '수업 마무리(Cooldown) 블록에서 앉은 자세로 풋바를 밀며 옆구리(관상면 측굴)와 흉추 회전을 여는 리포머 머메이드와, 두 발로 서서 정수리부터 바닥으로 척추를 굴곡 분절하는 스탠딩 롤다운을 비교합니다.',
    teachingDistinctionTipKo:
      '리포머 머메이드로 측면 늑간근과 흉추 회전을 충분히 열어준 뒤, 마지막에 매트 스탠딩 롤다운으로 직립 족저 밸런스와 전신 이완 상태를 점검하면 완벽한 쿨다운 흐름이 됩니다.',
  },
  {
    leftId: 'original-barrel-standing-hip-extension',
    rightId: 'original-barrel-standing-side-reach',
    titleKo: '래더 지지 힙 익스텐션 vs 래더 지지 사이드 레그 리치 (시상면 후방 신전 vs 관상면 측방 외전)',
    reasonForComparisonKo:
      '바렐 래더를 손으로 지지하고 서서 수행하는 두 기초 하체 동작으로, 다리를 뒤로 뻗는 고관절 신전(대둔근 타겟)과 옆으로 뻗는 고관절 외전(중둔근 타겟)의 운동 면과 보상 패턴 차이를 비교합니다.',
    teachingDistinctionTipKo:
      '힙 익스텐션 시에는 다리를 높이 들려다 허리가 앞으로 꺾이지(요추 과신전) 않게 잡아주고, 사이드 레그 리치 시에는 골반과 상체가 반대쪽으로 기울어지지 않게 수직 축을 유지시키세요.',
  },
  {
    leftId: 'original-cadillac-arm-spring-press',
    rightId: 'original-reformer-supine-arm-press',
    titleKo: '캐딜락 수파인 암 스프링 프레스 vs 리포머 수파인 스트랩 암 프레스 (고정 테이블 독립 스프링 vs 이동 캐리지 풀리)',
    reasonForComparisonKo:
      '누운 자세에서 양팔을 골반 옆으로 내리는 수파인 암 프레스 패턴이지만, 바닥이 고정된 캐딜락 테이블 위에서 독립 암 스프링을 당기는 것과 도르래 스트랩으로 캐리지 전체가 움직이는 리포머의 차이를 비교합니다.',
    teachingDistinctionTipKo:
      '캐딜락 암 스프링은 고정된 테이블 위에서 좌우 팔의 독립 장력 대칭과 견갑 안정성을 확인하기 좋고, 리포머 스트랩 암 프레스는 캐리지 활주와 코어 연결감을 동시에 가르칠 때 유리합니다.',
  },
  {
    leftId: 'ex-kr-reformer-01',
    rightId: 'ex-kr-reformer-02',
    titleKo: '[국내 정석] 수파인 오프닝 풋워크·브릿지 vs [국내 매운맛] 스탠딩 런지·아라베스크 (수파인 기초 정렬 vs 스탠딩 피크 하체)',
    reasonForComparisonKo:
      '한국 스튜디오 리포머 수업에서 오프닝 블록(수파인 양측 지지 풋워크→분절 브릿지)과 하이라이트 하체 블록(스탠딩 편측 런지→아라베스크)의 자세·지지면·신경근 요구도 차이를 대조합니다.',
    teachingDistinctionTipKo:
      '오프닝 풋워크·브릿지(ex-kr-reformer-01)에서 미니볼 내전근 연결과 발바닥 삼각 지지 감각을 먼저 깨워두어야 후반부 스탠딩 런지·아라베스크(ex-kr-reformer-02)에서 앞다리 무릎 흔들림 없이 둔근을 타격할 수 있습니다.',
  },
];

function describeStartPose(exercise: PilatesExercise): string {
  const app = APPARATUS_LABELS[exercise.apparatus]?.short ?? exercise.apparatus;
  const pos = POSITION_LABELS[exercise.bodyPosition]?.ko ?? exercise.bodyPosition;
  const propText =
    exercise.props[0] && exercise.props[0] !== 'none'
      ? `, ${PROP_LABELS[exercise.props[0]]?.ko ?? exercise.props[0]} 세팅`
      : '';
  const boxText = exercise.box !== 'none' ? `, ${exercise.box} 장착` : '';
  return `${app} ${pos} 준비 (스프링: ${exercise.springs}${boxText}${propText}) · ${exercise.cues[0] ?? '중립 정렬 세팅'}`;
}

function describeMiddlePeakPose(exercise: PilatesExercise): string {
  const planes = formatSpinalPlanesKo(exercise.spinalPlanes);
  const cuePeak = exercise.cues[1] ?? exercise.cues[0] ?? exercise.layers.standard;
  return `[${planes}] 최대 가동 구간: ${cuePeak}`;
}

function describeEndReturnPose(exercise: PilatesExercise): string {
  const cueReturn = exercise.cues[2] ?? `호흡(${exercise.breathPattern})에 맞춰 저항을 제어하며 시작 정렬로 복귀`;
  return `원심성 제어 복귀: ${cueReturn}`;
}

function describeJointAlignment(exercise: PilatesExercise): string {
  const pos = POSITION_LABELS[exercise.bodyPosition]?.ko ?? exercise.bodyPosition;
  return `${pos} 기반 척추(${formatSpinalPlanesKo(exercise.spinalPlanes)}) 정렬 유지 · 주의: ${exercise.precautions}`;
}

function describeMovementDirection(exercise: PilatesExercise): string {
  const planes = formatSpinalPlanesKo(exercise.spinalPlanes);
  const laterality = exercise.isUnilateral ? '편측(Unilateral) 교대 궤적' : '양측(Bilateral) 대칭 궤적';
  return `${planes} 방향 · ${laterality} (${exercise.breathPattern})`;
}

function describePrimaryMuscles(exercise: PilatesExercise): string {
  return `주동·안정화 타겟: ${exercise.targetMuscles.join(', ')} (난이도 Lv ${exercise.level})`;
}

function describeApparatusSupport(exercise: PilatesExercise): string {
  const app = APPARATUS_LABELS[exercise.apparatus]?.ko ?? exercise.apparatus;
  const props = formatPropsKo(exercise.props);
  return `${app} · 스프링 [${exercise.springs}] · 풋바 [${exercise.footbar}] · 헤드레스트 [${exercise.headrest}] · 박스 [${exercise.box}] · 소도구 [${props}]`;
}

function findCuratedNote(
  leftId: string,
  rightId: string,
): { note: CuratedPairNote; reversed: boolean } | null {
  const direct = CURATED_PAIR_NOTES.find(
    (item) => item.leftId === leftId && item.rightId === rightId,
  );
  if (direct) return { note: direct, reversed: false };
  const rev = CURATED_PAIR_NOTES.find(
    (item) => item.leftId === rightId && item.rightId === leftId,
  );
  if (rev) return { note: rev, reversed: true };
  return null;
}

/**
 * Compares any two catalog movements across 7 biomechanical & apparatus dimensions:
 * start-pose, middle-peak-pose, end-return-pose, joint-alignment, movement-direction,
 * primary-muscles, and apparatus-support.
 */
export function compareCatalogMovements(
  left: PilatesExercise,
  right: PilatesExercise,
): MovementDifferenceComparison {
  const curated = findCuratedNote(left.id, right.id);
  const directCuratedNote = curated && !curated.reversed ? curated.note : null;
  const leftApp = APPARATUS_LABELS[left.apparatus]?.ko ?? left.apparatus;
  const rightApp = APPARATUS_LABELS[right.apparatus]?.ko ?? right.apparatus;
  const leftPos = POSITION_LABELS[left.bodyPosition]?.ko ?? left.bodyPosition;
  const rightPos = POSITION_LABELS[right.bodyPosition]?.ko ?? right.bodyPosition;
  const leftPlanes = formatSpinalPlanesKo(left.spinalPlanes);
  const rightPlanes = formatSpinalPlanesKo(right.spinalPlanes);

  const startDiff =
    directCuratedNote?.startDiffOverrideKo ??
    (left.bodyPosition === right.bodyPosition
      ? `두 동작 모두 ${leftPos}에서 시작하지만, [${left.nameKo}]는 ${leftApp}(${left.springs}) 세팅이고 [${right.nameKo}]는 ${rightApp}(${right.springs}) 지지 조건에서 출발합니다.`
      : `[${left.nameKo}]는 ${leftPos} 지지면에서 출발하는 반면, [${right.nameKo}]는 ${rightPos} 지지면에서 중력 방향을 다르게 받고 시작합니다.`);

  const peakDiff =
    directCuratedNote?.peakDiffOverrideKo ??
    `최대 구간에서 [${left.nameKo}]는 ${leftPlanes} 방향(${left.layers.standard})에 집중하고, [${right.nameKo}]는 ${rightPlanes} 방향(${right.layers.standard})으로 가동 정점을 만듭니다.`;

  const returnDiff =
    directCuratedNote?.returnDiffOverrideKo ??
    `복귀 구간에서 [${left.nameKo}]는 ${left.springs} 저항을 제어하며 돌아오고, [${right.nameKo}]는 ${right.springs} 조건에서 몸통 중심을 유지하며 원위치로 돌아옵니다.`;

  const alignmentDiff =
    directCuratedNote?.alignmentDiffOverrideKo ??
    `관절 정렬 핵심에서 [${left.nameKo}]는 "${left.precautions}"를 우선 통제하고, [${right.nameKo}]는 "${right.precautions}"를 핵심 정렬 경계로 삼습니다.`;

  const directionDiff =
    directCuratedNote?.directionDiffOverrideKo ??
    `운동 면과 대칭성에서 [${left.nameKo}]는 ${leftPlanes}(${left.isUnilateral ? '편측' : '양측'}) 궤적이고, [${right.nameKo}]는 ${rightPlanes}(${right.isUnilateral ? '편측' : '양측'}) 궤적입니다.`;

  const leftOnlyMuscles = left.targetMuscles.filter((m) => !right.targetMuscles.includes(m));
  const rightOnlyMuscles = right.targetMuscles.filter((m) => !left.targetMuscles.includes(m));
  const sharedMuscles = left.targetMuscles.filter((m) => right.targetMuscles.includes(m));

  const muscleDiff =
    sharedMuscles.length > 0
      ? leftOnlyMuscles.length === 0 && rightOnlyMuscles.length === 0
        ? `두 동작 모두 [${sharedMuscles.join(', ')}]을(를) 공통 주 타겟으로 사용하며, 기구 지지와 가동 범위에 따라 수축·이완 협응 비중이 달라집니다.`
        : leftOnlyMuscles.length === 0
          ? `공통 타겟(${sharedMuscles.join(', ')})을 기반으로 [${left.nameKo}]는 해당 코어·주동근 제어에 집중하고, [${right.nameKo}]는 추가로 [${rightOnlyMuscles.join(', ')}] 협응이 결합됩니다.`
          : rightOnlyMuscles.length === 0
            ? `공통 타겟(${sharedMuscles.join(', ')})을 기반으로 [${left.nameKo}]는 추가로 [${leftOnlyMuscles.join(', ')}] 협응이 결합되고, [${right.nameKo}]는 공통 주동근 제어에 집중합니다.`
            : `공통 타겟(${sharedMuscles.join(', ')}) 외에 [${left.nameKo}]는 [${leftOnlyMuscles.join(', ')}], [${right.nameKo}]는 [${rightOnlyMuscles.join(', ')}] 협응 비중이 높습니다.`
      : `[${left.nameKo}]는 [${left.targetMuscles.join(', ')}] 중심이고, [${right.nameKo}]는 [${right.targetMuscles.join(', ')}] 중심으로 주동근 타겟이 명확히 분리됩니다.`;

  const apparatusDiff =
    left.apparatus === right.apparatus
      ? `동일 기구(${leftApp}) 내에서 스프링·세팅이 [${left.springs} / 박스:${left.box} / 풋바:${left.footbar}] vs [${right.springs} / 박스:${right.box} / 풋바:${right.footbar}]로 달라집니다.`
      : `기구 지지 환경 자체가 [${leftApp} (${left.springs})] vs [${rightApp} (${right.springs})]로 달라 저항 벡터와 접촉면 안정성이 변화합니다.`;

  const dimensions: readonly MovementDifferenceDimension[] = Object.freeze([
    Object.freeze({
      dimensionKey: 'start-pose',
      labelKo: '시작 자세 (Start Pose)',
      leftSummaryKo: describeStartPose(left),
      rightSummaryKo: describeStartPose(right),
      keyDifferenceKo: startDiff,
    }),
    Object.freeze({
      dimensionKey: 'middle-peak-pose',
      labelKo: '중간·최대 가동 자세 (Middle / Peak Pose)',
      leftSummaryKo: describeMiddlePeakPose(left),
      rightSummaryKo: describeMiddlePeakPose(right),
      keyDifferenceKo: peakDiff,
    }),
    Object.freeze({
      dimensionKey: 'end-return-pose',
      labelKo: '끝·복귀 자세 (End / Return Pose)',
      leftSummaryKo: describeEndReturnPose(left),
      rightSummaryKo: describeEndReturnPose(right),
      keyDifferenceKo: returnDiff,
    }),
    Object.freeze({
      dimensionKey: 'joint-alignment',
      labelKo: '관절 정렬 포인트 (Joint Alignment)',
      leftSummaryKo: describeJointAlignment(left),
      rightSummaryKo: describeJointAlignment(right),
      keyDifferenceKo: alignmentDiff,
    }),
    Object.freeze({
      dimensionKey: 'movement-direction',
      labelKo: '움직임 방향·척추 면 (Movement Direction)',
      leftSummaryKo: describeMovementDirection(left),
      rightSummaryKo: describeMovementDirection(right),
      keyDifferenceKo: directionDiff,
    }),
    Object.freeze({
      dimensionKey: 'primary-muscles',
      labelKo: '주요 사용 근육 (Primary Muscles)',
      leftSummaryKo: describePrimaryMuscles(left),
      rightSummaryKo: describePrimaryMuscles(right),
      keyDifferenceKo: muscleDiff,
    }),
    Object.freeze({
      dimensionKey: 'apparatus-support',
      labelKo: '기구·소도구 지지 조건 (Apparatus & Support)',
      leftSummaryKo: describeApparatusSupport(left),
      rightSummaryKo: describeApparatusSupport(right),
      keyDifferenceKo: apparatusDiff,
    }),
  ]);

  const defaultReason =
    left.blockCategory === right.blockCategory
      ? `동일한 [${formatBlockLabelKo(left.blockCategory)}] 구간 안에서 기구·자세·저항 방향에 따라 시작-중간-끝 정렬과 주동근 자극이 어떻게 달라지는지 대조합니다.`
      : `[${formatBlockLabelKo(left.blockCategory)}]의 [${left.nameKo}]와 [${formatBlockLabelKo(right.blockCategory)}]의 [${right.nameKo}] 간 척추 면·기구 지지·관절 정렬 차이를 비교합니다.`;

  const defaultTip = `수업 편성 시 [${left.nameKo}]는 ${leftPos} 기반 ${left.targetMuscles.slice(0, 2).join('·')} 인지에 활용하고, [${right.nameKo}]는 ${rightPos} 기반 ${right.targetMuscles.slice(0, 2).join('·')} 및 ${rightPlanes} 제어로 구분하여 큐잉하세요.`;

  return Object.freeze({
    pairId: `${left.id}__vs__${right.id}`,
    titleKo: directCuratedNote
      ? directCuratedNote.titleKo
      : `${left.nameKo} vs ${right.nameKo}`,
    reasonForComparisonKo: directCuratedNote?.reasonForComparisonKo ?? defaultReason,
    leftExerciseId: left.id,
    rightExerciseId: right.id,
    leftNameKo: left.nameKo,
    rightNameKo: right.nameKo,
    dimensions,
    teachingDistinctionTipKo: directCuratedNote?.teachingDistinctionTipKo ?? defaultTip,
  });
}

function getExerciseByIdOrThrow(id: string): PilatesExercise {
  const found = INITIAL_EXERCISES.find((item) => item.id === id);
  if (!found) {
    throw new Error(`Missing catalog exercise for comparison pair: ${id}`);
  }
  return found;
}

export const CURATED_MOVEMENT_DIFFERENCE_PAIRS: readonly MovementDifferenceComparison[] =
  Object.freeze(
    CURATED_PAIR_NOTES.map((note) =>
      compareCatalogMovements(
        getExerciseByIdOrThrow(note.leftId),
        getExerciseByIdOrThrow(note.rightId),
      ),
    ),
  );

/**
 * Returns 2 to 4 relevant peer exercises from INITIAL_EXERCISES for immediate side-by-side comparison.
 */
export function getRecommendedComparisonPeers(
  exerciseId: string,
): readonly PilatesExercise[] {
  const target = INITIAL_EXERCISES.find((item) => item.id === exerciseId);
  if (!target) {
    return Object.freeze(INITIAL_EXERCISES.slice(0, 3));
  }

  const peers: PilatesExercise[] = [];
  const addPeer = (candidate: PilatesExercise | undefined) => {
    if (
      candidate &&
      candidate.id !== target.id &&
      !peers.some((existing) => existing.id === candidate.id)
    ) {
      peers.push(candidate);
    }
  };

  // 1. Add any curated comparison partners first
  for (const note of CURATED_PAIR_NOTES) {
    if (note.leftId === target.id) {
      addPeer(INITIAL_EXERCISES.find((item) => item.id === note.rightId));
    } else if (note.rightId === target.id) {
      addPeer(INITIAL_EXERCISES.find((item) => item.id === note.leftId));
    }
  }

  // 2. Score remaining exercises by biomechanical & instructional relevance
  const scored = INITIAL_EXERCISES.filter(
    (candidate) =>
      candidate.id !== target.id && !peers.some((existing) => existing.id === candidate.id),
  )
    .map((candidate) => {
      let score = 0;
      if (candidate.blockCategory === target.blockCategory) {
        score += 6;
      }
      if (candidate.apparatus === target.apparatus) {
        score += 3;
      }
      if (candidate.bodyPosition === target.bodyPosition) {
        score += 3;
      }
      const sharedPlanes = candidate.spinalPlanes.filter((plane) =>
        target.spinalPlanes.includes(plane),
      ).length;
      score += sharedPlanes * 2;
      const sharedMuscles = candidate.targetMuscles.filter((muscle) =>
        target.targetMuscles.includes(muscle),
      ).length;
      score += sharedMuscles;
      return { candidate, score };
    })
    .sort((a, b) => b.score - a.score);

  for (const item of scored) {
    if (peers.length >= 4) break;
    addPeer(item.candidate);
  }

  return Object.freeze(peers.slice(0, 4));
}
