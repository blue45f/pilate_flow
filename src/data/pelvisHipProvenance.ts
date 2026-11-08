/**
 * SPDX-License-Identifier: MIT
 * Track I2 — Pelvis & Hip 2D Diagrams (Pelvic Curl & Bridge Family)
 * Public educational/clinical provenance ledger and explicit non-medical truthfulness metadata.
 *
 * All 2D joint coordinates, spinal articulation curves, and apparatus contact geometries are
 * original app-authored schematics created for class-planning reference only. No external media
 * frames were copied or traced, and no anatomical or clinical accuracy is assumed.
 */

export type PelvisHipSourceCategory =
  | 'clinical-patient-leaflet'
  | 'pilates-curriculum-guide'
  | 'apparatus-technical-manual';

export interface PelvisHipProvenanceSource {
  readonly id: string;
  readonly title: string;
  readonly shortTitle: string;
  readonly publisher: string;
  readonly url: string;
  readonly category: PelvisHipSourceCategory;
  readonly checkedAt: '2026-11-06';
  readonly rightsPolicy: 'link-only-no-media-copy';
  readonly applicableVariantIds: readonly string[];
  readonly verifiedScopeKo: string;
  readonly keyBiomechanicalFactsKo: readonly string[];
}

export interface PelvisHipTruthfulnessMetadata {
  readonly trackId: 'I2-pelvis-hip-2d';
  readonly license: 'MIT';
  readonly productionMethod: 'free-authored-kinematic-svg-v1';
  readonly rightsStatus: 'original-app-authored-free-license';
  readonly rightsPolicy: 'link-only-no-media-copy';
  readonly checkedAt: '2026-11-06';
  readonly professionalReviewCount: 0;
  readonly sourceFrameMappings: 0;
  readonly anatomicalAccuracyAssumed: false;
  readonly motionCaptureBacked: false;
  readonly medicalOrTherapeuticGuarantee: false;
  readonly externalMediaCopiedOrTraced: false;
  readonly disclaimerKo: string;
  readonly disclaimerEn: string;
  readonly limitationKo: string;
}

export const PELVIS_HIP_TRUTHFULNESS_METADATA: PelvisHipTruthfulnessMetadata = Object.freeze({
  trackId: 'I2-pelvis-hip-2d',
  license: 'MIT',
  productionMethod: 'free-authored-kinematic-svg-v1',
  rightsStatus: 'original-app-authored-free-license',
  rightsPolicy: 'link-only-no-media-copy',
  checkedAt: '2026-11-06',
  professionalReviewCount: 0,
  sourceFrameMappings: 0,
  anatomicalAccuracyAssumed: false,
  motionCaptureBacked: false,
  medicalOrTherapeuticGuarantee: false,
  externalMediaCopiedOrTraced: false,
  disclaimerKo:
    '본 골반·고관절(펠빅 컬 및 브릿지 패밀리) 2D 도해는 강사의 수업 계획과 동작 단계(시작·중간·끝) 이해를 돕기 위해 자체 제작한 기구학 개략도입니다. 모션 캡처나 임상 실측 데이터가 아니며(anatomicalAccuracyAssumed: false, motionCaptureBacked: false), 어떠한 의학적 진단·치료·재활 안전성도 보증하지 않습니다.',
  disclaimerEn:
    'These 2D pelvis and hip diagrams are original authored kinematic schematics for class planning only. They are not motion-capture or clinically measured anatomy (anatomicalAccuracyAssumed: false, motionCaptureBacked: false, professionalReviewCount: 0) and provide no medical or therapeutic guarantee.',
  limitationKo:
    '2D 관절 좌표·분절 각도·기구 접촉 위치·근육 강조 표시는 전문 감수 전(professionalReviewCount: 0, sourceFrameMappings: 0) 참고용 개략 표현이며 개인별 적정 가동범위를 의미하지 않습니다.',
});

/**
 * Six verified public educational and clinical reference documents for the
 * Pelvic Curl & Bridge family across Mat, Reformer, and Cadillac apparatus.
 */
export const PELVIS_HIP_PROVENANCE_SOURCES: readonly PelvisHipProvenanceSource[] = Object.freeze([
  Object.freeze({
    id: 'nhs-back-pain-pilates-workout',
    title:
      'NHS Back Pain Pilates Video Workout & CUH NHS Pilates: exercises and principles (Pelvic Tilt & Shoulder Bridge)',
    shortTitle: 'NHS Back Pain Pilates Workout · CUH NHS Pelvic Tilt & Bridge',
    publisher: 'NHS / Cambridge University Hospitals NHS Foundation Trust',
    url: 'https://www.cuh.nhs.uk/patient-information/pilates-exercises-and-principles/',
    category: 'clinical-patient-leaflet',
    checkedAt: '2026-11-06',
    rightsPolicy: 'link-only-no-media-copy',
    applicableVariantIds: Object.freeze([
      'pelvis-mat-pelvic-curl',
      'original-mat-bridge',
      'pelvis-mat-shoulder-bridge',
      'pelvis-bridging',
      'pelvis-curl',
    ]),
    verifiedScopeKo:
      '수파인 무릎 굴곡 준비 정렬, 날숨 골반 후방경사(Pelvic Tilt) 후 척추 분절 거상, 정점 사선 유지 및 윗등부터 천골 중립까지 순차 분절 하강 복귀 원칙을 대조했습니다.',
    keyBiomechanicalFactsKo: Object.freeze([
      '무릎을 굽히고 양발을 골반 너비 평행으로 매트에 지지한 수파인 중립 자세에서 시작',
      '경추에 체중을 싣지 않고 양측 견갑골과 발바닥 삼각 지지점으로 체중 분산',
      '하강(end) 시 흉추·요추가 허공에 남지 않고 천골 중립까지 매트 지지면으로 완전히 복귀',
    ]),
  }),
  Object.freeze({
    id: 'nhs-hull-pelvic-tilt-leaflet',
    title:
      'NHS Hull University Teaching Hospitals Pelvic Tilt Exercise Leaflet & OUH NHS Back Pain Exercises',
    shortTitle: 'NHS Hull / OUH · Pelvic Tilt & Bridge Exercise Leaflet',
    publisher:
      'NHS Hull University Teaching Hospitals / Oxford University Hospitals NHS Foundation Trust',
    url: 'https://www.ouh.nhs.uk/media/022n23fb/107625exercises.pdf',
    category: 'clinical-patient-leaflet',
    checkedAt: '2026-11-06',
    rightsPolicy: 'link-only-no-media-copy',
    applicableVariantIds: Object.freeze([
      'pelvis-mat-pelvic-curl',
      'original-mat-bridge',
      'pelvis-curl',
      'pelvis-bridging',
    ]),
    verifiedScopeKo:
      '복횡근·복직근 수축을 통한 골반 후방경사(요추 임프린트) 선행과 둔근·햄스트링 협응 고관절 신전, 그리고 요추 과신전(Rib Flare) 없는 중립 복귀 원칙을 대조했습니다.',
    keyBiomechanicalFactsKo: Object.freeze([
      '둔근을 과도하게 조이기 전 복부 수축으로 골반 후방경사(Imprint)를 먼저 형성',
      '브리지 정점에서 갈비뼈가 들뜨거나 허리를 꺾어 높이를 만들지 않도록 흉곽-골반 연결 유지',
      '마무리 단계에서 요추와 천골을 매트 표면에 순차 안착시킨 뒤 중립 골반을 회복',
    ]),
  }),
  Object.freeze({
    id: 'basi-pilates-pelvic-curl-guide',
    title:
      'BASI Pilates Pelvic Curl Guide — 10 Essential Pilates Exercises for Beginners (Section 1: Pelvic Curl)',
    shortTitle: 'BASI Pilates · Pelvic Curl Guide (CJ Kelly, NCPT)',
    publisher: 'BASI Pilates',
    url: 'https://www.basipilates.com/pilates/10-essential-pilates-exercises-for-beginners/',
    category: 'pilates-curriculum-guide',
    checkedAt: '2026-11-06',
    rightsPolicy: 'link-only-no-media-copy',
    applicableVariantIds: Object.freeze([
      'pelvis-mat-pelvic-curl',
      'original-mat-bridge',
      'pelvis-curl',
    ]),
    verifiedScopeKo:
      '좌골 너비 뒤꿈치·무릎 정렬, 매트를 길게 누르는 상지 활성, 골반 말아올리기 후 무릎-고관절-어깨 사선 일직선 정렬 및 흉골 연화 롤다운 시퀀스를 대조했습니다.',
    keyBiomechanicalFactsKo: Object.freeze([
      '양팔을 몸통 옆 매트에 길게 뻗어 삼두근과 광배근-견갑 하강 지지를 유지',
      '정점(middle)에서 어깨(shoulder)-고관절(hip)-무릎(knee)이 하나의 사선 축에 정렬',
      '날숨 하강 시 흉골(sternum)을 먼저 부드럽게 녹여 상부 흉추→요추→천골 순으로 매트 착지',
    ]),
  }),
  Object.freeze({
    id: 'pilates-anytime-shoulder-bridge-guide',
    title:
      'Pilates Anytime Shoulder Bridge Guide & South Tees NHS Shoulder Bridge Matwork Progression',
    shortTitle: 'Pilates Anytime / South Tees NHS · Shoulder Bridge Guide',
    publisher: 'Pilates Anytime / South Tees Hospitals NHS Foundation Trust',
    url: 'https://www.southtees.nhs.uk/resources/shoulder-bridge/',
    category: 'pilates-curriculum-guide',
    checkedAt: '2026-11-06',
    rightsPolicy: 'link-only-no-media-copy',
    applicableVariantIds: Object.freeze([
      'pelvis-mat-shoulder-bridge',
      'original-mat-bridge',
      'shoulder-bridge',
    ]),
    verifiedScopeKo:
      '견갑대 지지 브릿지 정점에서 골반 좌우 수평(ASIS Transverse Level)을 유지하며 지지측 발은 매트를 누르고 가동측 다리를 사선으로 분리 신전한 뒤 착지·롤다운하는 구성을 대조했습니다.',
    keyBiomechanicalFactsKo: Object.freeze([
      '단측 다리 거상 시 지지측 둔근·햄스트링으로 골반 회전이나 한쪽 처짐(Pelvic Drop)을 방지',
      '가동측 다리는 몸통-고관절 사선 연장선 위로 길게 뻗어 요추 과신전을 예방',
      '양발을 매트에 나란히 되돌린 후 척추 분절 하강으로 매트 지지면에 완전 복귀',
    ]),
  }),
  Object.freeze({
    id: 'merrithew-stott-reformer-bottom-lift',
    title:
      'Merrithew STOTT PILATES Reformer Bottom Lift Manual & Exercise of the Month: Shoulder Bridge Prep',
    shortTitle: 'Merrithew STOTT PILATES · Reformer Bottom Lift Manual',
    publisher: 'Merrithew / STOTT PILATES',
    url: 'https://www.merrithew.com/blog/post/2018-04-24/exercise-of-the-month-shoulder-bridge-prep',
    category: 'apparatus-technical-manual',
    checkedAt: '2026-11-06',
    rightsPolicy: 'link-only-no-media-copy',
    applicableVariantIds: Object.freeze([
      'original-reformer-supported-bridge',
      'ex-bridging-01',
    ]),
    verifiedScopeKo:
      '리포머 브릿지 전 헤드레스트 완전 평평(Flat) 세팅, 숄더 블록 견갑 지지, 고정 풋바 뒤꿈치/아치 접점, 캐리지 홈 스토퍼 유지(Supported Bridge) 및 정점 햄스트링 컬 활주(ex-bridging-01)를 대조했습니다.',
    keyBiomechanicalFactsKo: Object.freeze([
      '경추 과굴곡 방지를 위해 브릿지 시작 전 헤드레스트를 반드시 Flat(수평)으로 설정',
      '양발은 바닥이 아닌 고정 풋바 상단(y:126)에 위치하며 거상 초기 캐리지 홈 스토퍼 밀착을 유지',
      '하강 완료(end) 시 캐리지를 홈 스토퍼에 복귀시키고 흉추·요추·골반을 캐리지 베드(y:142~143)에 안착',
    ]),
  }),
  Object.freeze({
    id: 'pilates-anytime-cadillac-bridge-variations',
    title:
      'Pilates Anytime Cadillac Bridge Variations & Optimize Wellness Shoulder Bridge on the Cadillac (Tower Bar & Table Bridge)',
    shortTitle: 'Pilates Anytime / Optimize Wellness · Cadillac Bridge Variations',
    publisher: 'Pilates Anytime / Optimize Wellness Apparatus Guide',
    url: 'https://www.optimizewellness.org/pilates-exercise-guide/shoulder-bridge-cadillac',
    category: 'apparatus-technical-manual',
    checkedAt: '2026-11-06',
    rightsPolicy: 'link-only-no-media-copy',
    applicableVariantIds: Object.freeze([
      'ex-bridging-02',
      'original-cadillac-table-bridge',
    ]),
    verifiedScopeKo:
      '캐딜락 하단 스프링·안전 스트랩이 체결된 경사 타워바 고사선 숄더 브리지(ex-bridging-02)와 수평 테이블 발 지지 + 수직 기둥 손 파지 테이블 브리지(original-cadillac-table-bridge)의 기구 기하를 구분 대조했습니다.',
    keyBiomechanicalFactsKo: Object.freeze([
      '타워바 브리지(ex-bridging-02): 풋 엔드 하단 스프링 및 안전 스트랩 체결 상태에서 높은 타워바에 발아치를 걸어 고사선 브리지 형성',
      '테이블 브리지(original-cadillac-table-bridge): 움직이는 바를 발 지지로 쓰지 않고 수평 테이블 베드에 양발을 두며 양손으로 수직 기둥(Upright Poles)을 지지',
      '두 변형 모두 끝 자세(end)에서 흉추·요추·골반이 캐딜락 수평 테이블 매트(y:142~143)로 완전히 복귀',
    ]),
  }),
]);

export interface PelvisHipDefectRemediationEntry {
  readonly defectId: string;
  readonly titleKo: string;
  readonly legacySymptomKo: string;
  readonly remediatedBehaviorKo: string;
  readonly affectedVariantIds: readonly string[];
}

export const PELVIS_HIP_DEFECT_REMEDIATION_LEDGER: readonly PelvisHipDefectRemediationEntry[] =
  Object.freeze([
    Object.freeze({
      defectId: 'PELVIS-DEF-01-FLOATING-END-SPINE',
      titleKo: '끝 자세(end) 흉추·요추·골반 공중 부유 버그 수정',
      legacySymptomKo:
        '기존 공용 도해에서 끝 자세(end)의 척추 노드가 공중(thoracic: 98,128 / 124,136, lumbar: 118,126 / 154,138, pelvis: 136,127)에 떠 있어 분절 롤다운 복귀가 미완성 상태였음.',
      remediatedBehaviorKo:
        '7개 전 변형과 3개 아키타입에서 끝 자세(end)의 흉추(y: 141..143), 요추(y: 141..143), 골반(y: 143..144)이 매트·캐리지·캐딜락 테이블 지지면(y ≈ 143..144)으로 완전히 착지하고 골반 중립(0°)을 회복하도록 수정함.',
      affectedVariantIds: Object.freeze([
        'pelvis-mat-pelvic-curl',
        'original-mat-bridge',
        'pelvis-mat-shoulder-bridge',
        'original-reformer-supported-bridge',
        'ex-bridging-01',
        'ex-bridging-02',
        'original-cadillac-table-bridge',
      ]),
    }),
    Object.freeze({
      defectId: 'PELVIS-DEF-02-COLLINEAR-BRIDGE-PEAK',
      titleKo: '중간 자세(middle) 어깨-고관절-무릎 사선 일직선 정렬 및 흉곽 들뜸(Rib Flare) 억제',
      legacySymptomKo:
        '브리지 정점에서 요추 과신전이나 흉곽 들뜸 여부가 정량적으로 제어되지 않고 매트 3종(펠빅 컬·브리지·단측 숄더 브리지)이 단일 포즈로 혼용됨.',
      remediatedBehaviorKo:
        '모든 변형의 중간 자세(middle)에서 shoulder-hip-knee 사선 공선성(오차 허용 범위 내)과 흉곽 닫힘(무과신전)을 보장하고, 펠빅 컬(골반 임프린트 선행), 매트 브리지(양발 삼각 지지), 매트 숄더 브리지(단측 하지 사선 신전)를 명확히 분리함.',
      affectedVariantIds: Object.freeze([
        'pelvis-mat-pelvic-curl',
        'original-mat-bridge',
        'pelvis-mat-shoulder-bridge',
      ]),
    }),
    Object.freeze({
      defectId: 'PELVIS-DEF-03-REFORMER-FOOTBAR-STOPPER',
      titleKo: '리포머 브리지 2종 풋바 발 지지점 정합 및 캐리지 스토퍼 제어 분리',
      legacySymptomKo:
        '리포머 브리지에서 양발이 바닥(y:152)에 떠 있고 기초 서포티드 브리지와 햄스트링 컬 브리지가 동일한 캐리지 변위를 공유함.',
      remediatedBehaviorKo:
        '양발을 리포머 풋바 상단(heel: 266,126, ankle: 262,122)에 고정하고 헤드레스트 Flat(y:143)·숄더 블록(x:74)·캐리지 스토퍼 체크를 명시하며, 기초 서포티드 브리지(offset 0→2→0px)와 아티큘레이팅 햄스트링 컬(offset 0→18→0px + 미니볼)을 분리함.',
      affectedVariantIds: Object.freeze([
        'original-reformer-supported-bridge',
        'ex-bridging-01',
      ]),
    }),
    Object.freeze({
      defectId: 'PELVIS-DEF-04-CADILLAC-TOWER-VS-TABLE',
      titleKo: '캐딜락 경사 타워바 브리지 vs 수평 테이블 브리지 기구 분리',
      legacySymptomKo:
        '캐딜락 타워바 브리지(ex-bridging-02)와 테이블 브리지(original-cadillac-table-bridge)가 동일한 바닥 발 위치와 머리 쪽 푸시스루바를 공유함.',
      remediatedBehaviorKo:
        'ex-bridging-02는 풋 엔드 하단 스프링·안전 스트랩이 연결된 경사 타워바 위 높은 발 지지(ankle y:82~88)와 고사선(30°) 브리지로, original-cadillac-table-bridge는 수평 테이블 발 지지(heel y:144)와 수직 기둥 손 파지(hand: 34,118) 및 무스프링 세팅으로 분리함.',
      affectedVariantIds: Object.freeze([
        'ex-bridging-02',
        'original-cadillac-table-bridge',
      ]),
    }),
  ]);

export function getPelvisHipSourcesForVariant(
  variantId: string,
): readonly PelvisHipProvenanceSource[] {
  const matched = PELVIS_HIP_PROVENANCE_SOURCES.filter((src) =>
    src.applicableVariantIds.includes(variantId),
  );
  return matched.length > 0 ? matched : PELVIS_HIP_PROVENANCE_SOURCES.slice(0, 2);
}

export function getPelvisHipSourceLinksForCorrection(
  variantId: string,
): readonly { readonly title: string; readonly url: string }[] {
  return Object.freeze(
    getPelvisHipSourcesForVariant(variantId).map((src) =>
      Object.freeze({
        title: src.shortTitle,
        url: src.url,
      }),
    ),
  );
}
