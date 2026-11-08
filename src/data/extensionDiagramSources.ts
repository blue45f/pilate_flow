import type { MovementDiagramCorrection } from './movementDiagramCorrections';

export type ExtensionSupportSurface =
  | 'mat'
  | 'reformer-box'
  | 'cadillac-table'
  | 'ladder-barrel';

export type ExtensionMovementFamily = 'swan' | 'swimming';

export type ExtensionArchetypeKey = 'prone-extension' | 'swimming';

export type ExtensionMovementId =
  | 'original-mat-swan-prep'
  | 'original-mat-swimming-prep'
  | 'extension-mat-swimming-alternating'
  | 'original-reformer-box-swan-prep'
  | 'ex-extension-01'
  | 'original-cadillac-prone-back-reach'
  | 'original-barrel-supported-swan'
  | 'ex-extension-02';

export interface ExtensionPublicSource {
  readonly id: string;
  readonly title: string;
  readonly organization: string;
  readonly url: string;
  readonly applicableMovements: readonly ExtensionMovementId[];
  readonly applicableArchetypes: readonly ExtensionArchetypeKey[];
  readonly keyBiomechanicalTakeawaysKo: readonly string[];
}

export interface ExtensionTruthfulnessMetadata {
  readonly anatomicalAccuracyAssumed: false;
  readonly professionalReviewCount: 0;
  readonly sourceFrameMappings: 0;
  readonly medicalDiagnosisProhibited: true;
  readonly therapeuticEffectGuaranteeProhibited: true;
  readonly CheckedAt: '2026-11-06';
  readonly noticeKo: string;
  readonly limitationKo: string;
}

export interface ExtensionDiagramAuditRecord {
  readonly movementId: ExtensionMovementId;
  readonly archetypeKey: ExtensionArchetypeKey;
  readonly isolatedArchetypeId: string;
  readonly supportSurface: ExtensionSupportSurface;
  readonly previousDefectKo: string;
  readonly biomechanicalFixKo: string;
  readonly sourceIds: readonly string[];
  readonly truthfulness: ExtensionTruthfulnessMetadata;
}

export const EXTENSION_MEDICAL_AND_REVIEW_POLICY: ExtensionTruthfulnessMetadata = Object.freeze({
  anatomicalAccuracyAssumed: false,
  professionalReviewCount: 0,
  sourceFrameMappings: 0,
  medicalDiagnosisProhibited: true,
  therapeuticEffectGuaranteeProhibited: true,
  CheckedAt: '2026-11-06',
  noticeKo:
    '본 신전(Swan · Swimming) 2D 도해는 공개 교육 자료를 바탕으로 작성한 시각 참고 자료이며, 의학적 진단·처방·치료 효과를 보증하지 않습니다.',
  limitationKo:
    '2D 관절 좌표·분절 각도·근육 활성 표시는 해부학적 실측이나 프레임 단위 전문 검수를 거치지 않았으며 개인에게 안전한 가동범위를 뜻하지 않습니다.',
});

export const EXTENSION_PUBLIC_SOURCES: readonly ExtensionPublicSource[] = Object.freeze([
  {
    id: 'cuh-nhs-swan-swimming',
    title: 'CUH NHS · Pilates: exercises and principles (Swan Dive Level 1 & Swimming Level 1–2)',
    organization: 'Cambridge University Hospitals NHS Foundation Trust',
    url: 'https://www.cuh.nhs.uk/patient-information/pilates-exercises-and-principles/',
    applicableMovements: [
      'original-mat-swan-prep',
      'original-mat-swimming-prep',
      'extension-mat-swimming-alternating',
    ],
    applicableArchetypes: ['prone-extension', 'swimming'],
    keyBiomechanicalTakeawaysKo: [
      '스완 다이브 Level 1: 전완과 양손을 매트에 지지한 채 치골을 바닥에 고정하고 정수리를 길게 뽑아 상·중부 흉추만 부드럽게 신전합니다.',
      '스위밍 Level 1–2: 골반과 요추 중립을 고정한 상태에서 반대쪽 팔·다리를 높이 들기보다 벽 쪽으로 길게 뻗어(Length over height) 교차 부양합니다.',
    ],
  },
  {
    id: 'ouh-nhs-trunk-stabilisation',
    title: 'OUH NHS · Exercises for Back Pain (Trunk Stabilisation & Neutral Spine Control)',
    organization: 'Oxford University Hospitals NHS Foundation Trust',
    url: 'https://www.ouh.nhs.uk/media/022n23fb/107625exercises.pdf',
    applicableMovements: [
      'original-mat-swan-prep',
      'original-mat-swimming-prep',
      'extension-mat-swimming-alternating',
      'original-cadillac-prone-back-reach',
    ],
    applicableArchetypes: ['prone-extension', 'swimming'],
    keyBiomechanicalTakeawaysKo: [
      '복횡근 수축을 통해 아랫배를 가볍게 들어 올려 요추 한 지점이 꺾이거나 바닥으로 처지는 과신전 압축을 예방합니다.',
      '사지 거상 중 골반의 좌우 회전이나 전방경사 흔들림을 억제합니다.',
    ],
  },
  {
    id: 'basi-back-extension-baby-swan',
    title: 'BASI Pilates · 10 Essential Pilates Exercises for Beginners: Back Extension (Baby Swan)',
    organization: 'BASI Pilates',
    url: 'https://www.basipilates.com/pilates/10-essential-pilates-exercises-for-beginners/',
    applicableMovements: [
      'original-mat-swan-prep',
      'original-reformer-box-swan-prep',
      'original-cadillac-prone-back-reach',
    ],
    applicableArchetypes: ['prone-extension'],
    keyBiomechanicalTakeawaysKo: [
      '경추(턱 들기)로 높이를 만들지 않고 뒷목을 흉추 신전 곡선의 연장선으로 유지합니다.',
      '치골 결합부(Pubic Symphysis)와 ASIS를 지지면에 안착하고 상부 흉추에서 축성 신장(Axial Elongation)을 유도합니다.',
    ],
  },
  {
    id: 'pilatesology-reformer-pulling-straps',
    title: 'Pilatesology · Pulling Straps I & II on the Reformer (Long Box Swan)',
    organization: 'Pilatesology',
    url: 'https://pilatesology.com/blog/pulling-straps/',
    applicableMovements: ['original-reformer-box-swan-prep', 'ex-extension-01'],
    applicableArchetypes: ['prone-extension'],
    keyBiomechanicalTakeawaysKo: [
      '리포머 롱박스 앞 모서리에 가슴 아랫부분을 맞추고 치골을 박스 상판(y = 116)에 단단히 고정합니다.',
      '스트랩을 골반 옆으로 당길 때 캐리지와 롱박스가 함께 활주하며 광배근·능형근·상부 흉추 신전이 협응합니다.',
    ],
  },
  {
    id: 'merrithew-ladder-barrel-swan-dive',
    title: 'Merrithew (STOTT PILATES) · Exercise of the Month: Ladder Barrel Swan Dive',
    organization: 'Merrithew',
    url: 'https://www.merrithew.com/blog/post/2018-10-22/exercise-of-the-month-ladder-barrel-swan-dive',
    applicableMovements: ['original-barrel-supported-swan', 'ex-extension-02'],
    applicableArchetypes: ['prone-extension'],
    keyBiomechanicalTakeawaysKo: [
      '래더 가로대에 양발을 고정하고 바렐 돔 정점(y = 104)에 골반·치골을 지지한 사선 중립 라인에서 시작합니다.',
      '둔근·햄스트링의 하체 지지 연결을 유지한 채 흉추를 분절 신전하고 바렐 곡면을 따라 편심성 복귀합니다.',
    ],
  },
  {
    id: 'balanced-body-ladder-barrel-swan',
    title: 'Balanced Body · Getting the Most Out of Swan on the Ladder Barrel',
    organization: 'Balanced Body',
    url: 'https://www.youtube.com/watch?v=VWQNwXEZXJk',
    applicableMovements: ['original-barrel-supported-swan', 'ex-extension-02'],
    applicableArchetypes: ['prone-extension'],
    keyBiomechanicalTakeawaysKo: [
      '바렐 위에서 요추만 꺾어 올라오지 않고 정수리부터 발끝까지 긴 활(Long Arc) 모양의 축성 신장을 유지합니다.',
      '풀 익스텐션 정점에서 양팔을 귀 옆 V-포지션으로 뻗되 경추 과신전을 방지합니다.',
    ],
  },
]);

export const EXTENSION_DIAGRAM_AUDIT_RECORDS: Readonly<
  Record<ExtensionMovementId, ExtensionDiagramAuditRecord>
> = Object.freeze({
  'original-mat-swan-prep': {
    movementId: 'original-mat-swan-prep',
    archetypeKey: 'prone-extension',
    isolatedArchetypeId: 'mat-swan-prep-isolated',
    supportSurface: 'mat',
    previousDefectKo:
      '공용 아키타입(prone-swan-pulling-straps-swimming)에서 양손이 141px 뒤로 당겨지는 리포머 풀링 스트랩 궤적과 발목 부양이 매트 스완 준비에 그대로 섞여 있었습니다.',
    biomechanicalFixKo:
      '양손(x: 48..60, y: 146)·전완(x: 84, y: 146)·치골(x: 144, y: 144)·발등(x: 228, y: 145)을 매트에 고정하고 요추 과신전 없이 상·중부 흉추 아크만 상승하도록 분리했습니다.',
    sourceIds: ['cuh-nhs-swan-swimming', 'ouh-nhs-trunk-stabilisation', 'basi-back-extension-baby-swan'],
    truthfulness: EXTENSION_MEDICAL_AND_REVIEW_POLICY,
  },
  'original-mat-swimming-prep': {
    movementId: 'original-mat-swimming-prep',
    archetypeKey: 'swimming',
    isolatedArchetypeId: 'mat-swimming-prep-isolated',
    supportSurface: 'mat',
    previousDefectKo:
      '양팔을 뒤로 당기는 양측 스완 도해가 스위밍 준비에 공유되어 대각선 반대 팔·다리 신장(Contralateral Reach)과 지지측 매트 고정이 표현되지 않았습니다.',
    biomechanicalFixKo:
      '치골(y: 144)과 지지측 손·다리를 매트에 고정하고 가동측 오른팔(|dx|=66px > dy=27px)과 왼다리(|dx|=95px > dy=17px)가 높이보다 길이 우선으로 뻗도록 교정했습니다.',
    sourceIds: ['cuh-nhs-swan-swimming', 'ouh-nhs-trunk-stabilisation'],
    truthfulness: EXTENSION_MEDICAL_AND_REVIEW_POLICY,
  },
  'extension-mat-swimming-alternating': {
    movementId: 'extension-mat-swimming-alternating',
    archetypeKey: 'swimming',
    isolatedArchetypeId: 'mat-swimming-alternating-isolated',
    supportSurface: 'mat',
    previousDefectKo:
      '레벨 2 교차 스위밍의 대각선 사지 왕복(Reciprocal Flutter) 위상과 골반·치골 중심 고정 대조 도해가 없었습니다.',
    biomechanicalFixKo:
      '치골(144, 144) 매트 고정 및 요추 중립 코리도를 유지한 채 대각선 A(오른팔·왼다리 상방) ↔ 대각선 B(왼팔·오른다리 상방) 교대 플러터를 구현했습니다.',
    sourceIds: ['cuh-nhs-swan-swimming', 'ouh-nhs-trunk-stabilisation'],
    truthfulness: EXTENSION_MEDICAL_AND_REVIEW_POLICY,
  },
  'original-reformer-box-swan-prep': {
    movementId: 'original-reformer-box-swan-prep',
    archetypeKey: 'prone-extension',
    isolatedArchetypeId: 'reformer-box-swan-prep-isolated',
    supportSurface: 'reformer-box',
    previousDefectKo:
      '롱박스 위 스완 준비임에도 매트 바닥 높이(y = 142)에 신체가 그려지고 풀링 스트랩 후방 견인이 섞여 있었습니다.',
    biomechanicalFixKo:
      '리포머 캐리지 위 롱박스 상판(y = 116)에 치골과 하체를 수평 안착시키고 전방 지지에서 흉추 신전만 수행하도록 분리했습니다.',
    sourceIds: ['basi-back-extension-baby-swan', 'pilatesology-reformer-pulling-straps'],
    truthfulness: EXTENSION_MEDICAL_AND_REVIEW_POLICY,
  },
  'ex-extension-01': {
    movementId: 'ex-extension-01',
    archetypeKey: 'prone-extension',
    isolatedArchetypeId: 'reformer-pulling-straps-swan-isolated',
    supportSurface: 'reformer-box',
    previousDefectKo:
      '캐리지 이동 시 골반 좌표가 고정되어 롱박스 위에서 몸이 미끄러지는 것처럼 보였고 박스 높이(y = 116)가 반영되지 않았습니다.',
    biomechanicalFixKo:
      '롱박스 상판(y = 116) 치골 고정과 캐리지 +16px 활주를 동기화(pelvis x: 148→164)하고 스트랩 후방 견인과 흉추 신전을 결합했습니다.',
    sourceIds: ['pilatesology-reformer-pulling-straps', 'basi-back-extension-baby-swan'],
    truthfulness: EXTENSION_MEDICAL_AND_REVIEW_POLICY,
  },
  'original-cadillac-prone-back-reach': {
    movementId: 'original-cadillac-prone-back-reach',
    archetypeKey: 'prone-extension',
    isolatedArchetypeId: 'cadillac-prone-swan-isolated',
    supportSurface: 'cadillac-table',
    previousDefectKo:
      '고정된 캐딜락 테이블 위 스완 준비에 리포머 스트랩 후방 스윕 동작이 혼용되어 있었습니다.',
    biomechanicalFixKo:
      '캐딜락 테이블(y = 142, carriageOffsetPx = 0)에 치골과 두 다리를 고정하고 전방 프레임/바 방향 축성 리치와 상부 흉추 신전을 구현했습니다.',
    sourceIds: ['basi-back-extension-baby-swan', 'ouh-nhs-trunk-stabilisation'],
    truthfulness: EXTENSION_MEDICAL_AND_REVIEW_POLICY,
  },
  'original-barrel-supported-swan': {
    movementId: 'original-barrel-supported-swan',
    archetypeKey: 'prone-extension',
    isolatedArchetypeId: 'barrel-supported-swan-isolated',
    supportSurface: 'ladder-barrel',
    previousDefectKo:
      '래더 바렐 스완 준비가 평면 매트 좌표(pelvis y = 142)로 그려져 바렐 돔 정점 지지와 래더 가로대 발 고정이 누락되었습니다.',
    biomechanicalFixKo:
      '바렐 돔 정점(x: 132, y: 104)에 골반·치골을 안착시키고 래더 가로대(x: 228..238, y: 128..138)에 발을 고정한 사선 정렬→흉추 신전→복귀를 구현했습니다.',
    sourceIds: ['merrithew-ladder-barrel-swan-dive', 'balanced-body-ladder-barrel-swan'],
    truthfulness: EXTENSION_MEDICAL_AND_REVIEW_POLICY,
  },
  'ex-extension-02': {
    movementId: 'ex-extension-02',
    archetypeKey: 'prone-extension',
    isolatedArchetypeId: 'barrel-swan-full-extension-isolated',
    supportSurface: 'ladder-barrel',
    previousDefectKo:
      '래더 바렐 풀 스완 익스텐션이 평면 풀링 스트랩 도해를 공유하여 바렐 곡면 아치와 상단 V-리치가 표현되지 않았습니다.',
    biomechanicalFixKo:
      '바렐 돔 정점(132, 104) 치골 지지와 래더 발 고정 위에서 사선 준비 → 상단 오버헤드 V-리치 흉추 아크 → 바렐 곡면 편심성 복귀를 구현했습니다.',
    sourceIds: ['merrithew-ladder-barrel-swan-dive', 'balanced-body-ladder-barrel-swan'],
    truthfulness: EXTENSION_MEDICAL_AND_REVIEW_POLICY,
  },
});

const SOURCE_BY_ID = new Map(EXTENSION_PUBLIC_SOURCES.map((s) => [s.id, s]));

function pickSources(ids: readonly string[]): readonly { readonly title: string; readonly url: string }[] {
  return Object.freeze(
    ids
      .map((id) => SOURCE_BY_ID.get(id))
      .filter((s): s is ExtensionPublicSource => Boolean(s))
      .map((s) => Object.freeze({ title: s.title, url: s.url })),
  );
}

const BASE_EXTENSION_CORRECTIONS: Record<ExtensionMovementId, MovementDiagramCorrection> = {
  'original-mat-swan-prep': {
    archetypeId: 'mat-swan-prep-isolated',
    checkedAt: '2026-11-06',
    reviewedScopeKo:
      'CUH NHS·BASI Pilates의 매트 스완 준비 본문과 전완·손바닥·치골 매트 지지, 복부 리프트 요추 보호, 상·중부 흉추 신전 후 복귀를 대조했어요.',
    correctionKo:
      '함께 섞여 있던 리포머 풀링 스트랩의 양팔 후방 스윕(141px)과 발목 부양을 제거하고 전완·양손 매트 지지를 고정했어요.',
    limitationKo: EXTENSION_MEDICAL_AND_REVIEW_POLICY.limitationKo,
    professionalReviewCount: 0,
    sourceFrameMappings: 0,
    sources: pickSources([
      'cuh-nhs-swan-swimming',
      'ouh-nhs-trunk-stabilisation',
      'basi-back-extension-baby-swan',
    ]),
  },
  'original-mat-swimming-prep': {
    archetypeId: 'mat-swimming-prep-isolated',
    checkedAt: '2026-11-06',
    reviewedScopeKo:
      'CUH NHS·OUH NHS의 스위밍 준비 지침과 치골 매트 고정, 중립 경추 시선 바닥 유지, 반대쪽 팔·다리 사선 축 신장(Length over height)을 대조했어요.',
    correctionKo:
      '양팔 후방 당김 스완 포즈를 제거하고 지지측 사지 매트 고정 + 가동측 오른팔·왼다리 수평 우위 부양으로 분리했어요.',
    limitationKo: EXTENSION_MEDICAL_AND_REVIEW_POLICY.limitationKo,
    professionalReviewCount: 0,
    sourceFrameMappings: 0,
    sources: pickSources(['cuh-nhs-swan-swimming', 'ouh-nhs-trunk-stabilisation']),
  },
  'extension-mat-swimming-alternating': {
    archetypeId: 'mat-swimming-alternating-isolated',
    checkedAt: '2026-11-06',
    reviewedScopeKo:
      'CUH NHS 스위밍 Level 2의 골반·요추 고정 및 대각선 사지 교차 플러터(Reciprocal Flutter) 호흡·제어 원칙을 대조했어요.',
    correctionKo:
      '골반 흔들림과 요추 꺾임 없이 대각선 사지 위상(A↔B)만 교대하는 전용 3단계 도해를 구성했어요.',
    limitationKo: EXTENSION_MEDICAL_AND_REVIEW_POLICY.limitationKo,
    professionalReviewCount: 0,
    sourceFrameMappings: 0,
    sources: pickSources(['cuh-nhs-swan-swimming', 'ouh-nhs-trunk-stabilisation']),
  },
  'original-reformer-box-swan-prep': {
    archetypeId: 'reformer-box-swan-prep-isolated',
    checkedAt: '2026-11-06',
    reviewedScopeKo:
      '리포머 롱박스 등 리치의 박스 상판(y = 116) 치골 지지, 전방 손 지지, 작은 흉추 신전 및 제어 복귀를 대조했어요.',
    correctionKo:
      '바닥 높이(y = 142) 좌표를 롱박스 상판 높이(y = 116)로 교정하고 스트랩 당김 없이 순수 흉추 리치 준비로 분리했어요.',
    limitationKo: EXTENSION_MEDICAL_AND_REVIEW_POLICY.limitationKo,
    professionalReviewCount: 0,
    sourceFrameMappings: 0,
    sources: pickSources(['basi-back-extension-baby-swan', 'pilatesology-reformer-pulling-straps']),
  },
  'ex-extension-01': {
    archetypeId: 'reformer-pulling-straps-swan-isolated',
    checkedAt: '2026-11-06',
    reviewedScopeKo:
      'Pilatesology 풀링 스트랩 I & II의 롱박스 상판(y = 116) 치골 밀착, 스트랩 후방 견인에 따른 캐리지 활주, 흉추 신전을 대조했어요.',
    correctionKo:
      '캐리지 활주(+16px)와 롱박스 위 골반 수평 이동을 동기화하고 요추 과신전 없는 상·중부 흉추 아크로 보정했어요.',
    limitationKo: EXTENSION_MEDICAL_AND_REVIEW_POLICY.limitationKo,
    professionalReviewCount: 0,
    sourceFrameMappings: 0,
    sources: pickSources(['pilatesology-reformer-pulling-straps', 'basi-back-extension-baby-swan']),
  },
  'original-cadillac-prone-back-reach': {
    archetypeId: 'cadillac-prone-swan-isolated',
    checkedAt: '2026-11-06',
    reviewedScopeKo:
      '캐딜락 테이블 스완 준비의 고정 베드(y = 142) 치골 지지, 전방 리치 정렬, 경추-흉추 연속 신전을 대조했어요.',
    correctionKo:
      '리포머용 스트랩 후방 당김을 제거하고 고정 테이블 위 전방 리치 기반 흉추 신전으로 분리했어요.',
    limitationKo: EXTENSION_MEDICAL_AND_REVIEW_POLICY.limitationKo,
    professionalReviewCount: 0,
    sourceFrameMappings: 0,
    sources: pickSources(['basi-back-extension-baby-swan', 'ouh-nhs-trunk-stabilisation']),
  },
  'original-barrel-supported-swan': {
    archetypeId: 'barrel-supported-swan-isolated',
    checkedAt: '2026-11-06',
    reviewedScopeKo:
      'Merrithew·Balanced Body 래더 바렐 스완의 바렐 정점(y = 104) 골반 지지, 래더 가로대 발 고정, 사선 중립→흉추 신전→복귀를 대조했어요.',
    correctionKo:
      '평면 매트 좌표에서 벗어나 바렐 돔 정점(132, 104)과 래더 가로대(228, 132) 접촉 기하학에 맞춰 재설계했어요.',
    limitationKo: EXTENSION_MEDICAL_AND_REVIEW_POLICY.limitationKo,
    professionalReviewCount: 0,
    sourceFrameMappings: 0,
    sources: pickSources(['merrithew-ladder-barrel-swan-dive', 'balanced-body-ladder-barrel-swan']),
  },
  'ex-extension-02': {
    archetypeId: 'barrel-swan-full-extension-isolated',
    checkedAt: '2026-11-06',
    reviewedScopeKo:
      'Merrithew·Balanced Body 래더 바렐 스완 다이브의 바렐 정점 치골 지지, 래더 발 아치 고정, V-포지션 풀 흉추 신전 아크를 대조했어요.',
    correctionKo:
      '바렐 곡면 지지(y = 104)와 래더 발 고정 위에서 사선 준비 → 오버헤드 V-리치 신전 → 바렐 곡면 복귀 3단계를 분리했어요.',
    limitationKo: EXTENSION_MEDICAL_AND_REVIEW_POLICY.limitationKo,
    professionalReviewCount: 0,
    sourceFrameMappings: 0,
    sources: pickSources(['merrithew-ladder-barrel-swan-dive', 'balanced-body-ladder-barrel-swan']),
  },
};

function attachNonEnumerableArchetypeCorrections(
  record: Record<ExtensionMovementId, MovementDiagramCorrection>,
): Readonly<Record<string, MovementDiagramCorrection>> {
  const clone: Record<string, MovementDiagramCorrection> = { ...record };
  Object.defineProperty(clone, 'prone-extension', {
    value: record['original-mat-swan-prep'],
    enumerable: false,
    configurable: false,
    writable: false,
  });
  Object.defineProperty(clone, 'swimming', {
    value: record['original-mat-swimming-prep'],
    enumerable: false,
    configurable: false,
    writable: false,
  });
  return Object.freeze(clone);
}

export const EXTENSION_DIAGRAM_CORRECTIONS: Readonly<Record<string, MovementDiagramCorrection>> =
  attachNonEnumerableArchetypeCorrections(BASE_EXTENSION_CORRECTIONS);
