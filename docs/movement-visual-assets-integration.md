# 동작 시각 자료(SVG·단계별 자세·관절 정렬·주동근·비교 도해) 고도화 및 통합 제안서

본 문서는 **필라테스 카탈로그 98종(`INITIAL_EXERCISES`) 전 동작의 시작(`start`)·중간(`middle`)·끝(`end`) 자세, 관절 정렬(`jointAlignments`), 움직임 방향(`directionVectors`), 주요 사용 근육(`primaryMuscles`), 유사 동작 간 7차원 차이 비교(`compareCatalogMovements`), 그리고 신뢰 출처 대조·검토 전/후 구분(`getVisualSourceComparison`)**을 제공하는 시각 자료 모듈의 소유 범위, 설계 원칙, 무결성 정책 및 공통 화면 통합 가이드를 정의합니다.

---

## 1. 담당 파일 및 제외 범위 선언 (Scope & Ownership Boundary)

병렬 진행 중인 다른 세션(미디어 재생 컨트롤러, 공통 디자인 토큰/스타일, 스토어·백업 스키마, 동결 모션 원장 등)과의 충돌을 원천 방지하기 위해 본 세션은 **아래 명시된 신규 파일만 생성·검증**하고 기존 공통 파일은 수정하지 않습니다.

### 1.1 담당 파일 (Owned Files)
- [`src/data/movementVisualRigCatalog.ts`](file:///home/antigravity/blue45f/pilate_flow/src/data/movementVisualRigCatalog.ts) — 카탈로그 98종(`INITIAL_EXERCISES`) 100% 대응 다관절 2D 키네마틱 리그(`RigJointMap`), 시작·중간·끝 3단계 자세(`PhasePoseSpec`), 관절 정렬 기준선(`JointAlignmentGuide`), 움직임 방향 벡터(`MovementDirectionVector`), 12대 근육군 하이라이트(`MuscleHighlightSpec`), 시작↔중간 자세 변위 계산(`calculatePhaseJointDelta`) 카탈로그
- [`src/data/movementVisualSourceAudit.ts`](file:///home/antigravity/blue45f/pilate_flow/src/data/movementVisualSourceAudit.ts) — 시각 자산 무결성·권리·AI 생성 이미지 격리 가드(`evaluateVisualAssetIntegrity`), 신뢰 자료 대조 및 검토 전/후 상태 판정(`getVisualSourceComparison`, `CATALOG_VISUAL_SOURCE_COMPARISONS`), 7차원 동작 차이 비교(`compareCatalogMovements`, `CURATED_MOVEMENT_DIFFERENCE_PAIRS`, `getRecommendedComparisonPeers`)
- [`public/images/movement-guides/LICENSE.txt`](file:///home/antigravity/blue45f/pilate_flow/public/images/movement-guides/LICENSE.txt) — 앱 자체 제작 다관절 2D 키네마틱 도해(Original Free-License Kinematic SVG v1) 저작권·오픈 라이선스(CC-BY-4.0 / MIT 호환) 및 해부학적 정확성 비추정(`anatomicalAccuracyAssumed: false`) 명시 선언문
- [`public/images/movement-guides/MANIFEST.json`](file:///home/antigravity/blue45f/pilate_flow/public/images/movement-guides/MANIFEST.json) — 기구별 정적 3단계 정렬 도해 SVG 5종의 SHA-256 체크섬, 바이트 크기, 포함 시각 지표(`joint-alignment`, `movement-direction`, `primary-muscles`, `pose-delta-ghost`) 및 검토 고지 매니페스트
- [`public/images/movement-guides/mat-phase-alignment-guide.svg`](file:///home/antigravity/blue45f/pilate_flow/public/images/movement-guides/mat-phase-alignment-guide.svg) — 매트(Mat) 시작·중간·끝 3단계 관절 정렬·주동근·고스트 오버레이 정적 가이드 도해
- [`public/images/movement-guides/reformer-phase-alignment-guide.svg`](file:///home/antigravity/blue45f/pilate_flow/public/images/movement-guides/reformer-phase-alignment-guide.svg) — 리포머(Reformer) 캐리지 주행·스프링 장력·3단계 정렬 정적 가이드 도해
- [`public/images/movement-guides/cadillac-phase-alignment-guide.svg`](file:///home/antigravity/blue45f/pilate_flow/public/images/movement-guides/cadillac-phase-alignment-guide.svg) — 캐딜락(Cadillac) 타워 바·독립 스프링·3단계 분절 정렬 정적 가이드 도해
- [`public/images/movement-guides/chair-phase-alignment-guide.svg`](file:///home/antigravity/blue45f/pilate_flow/public/images/movement-guides/chair-phase-alignment-guide.svg) — 체어(Chair) 페달 각도·수직 항중력 지지·3단계 정렬 정적 가이드 도해
- [`public/images/movement-guides/barrel-phase-alignment-guide.svg`](file:///home/antigravity/blue45f/pilate_flow/public/images/movement-guides/barrel-phase-alignment-guide.svg) — 래더 바렐(Barrel) 아크 곡면 지지·척추 신전/측굴·3단계 정렬 정적 가이드 도해
- [`src/components/MovementPhaseDiagramSvg.tsx`](file:///home/antigravity/blue45f/pilate_flow/src/components/MovementPhaseDiagramSvg.tsx) — 시작·중간·끝 단일 단계 및 3단계 스트립, 시작↔중간 고스트 오버레이(Pose Delta), 관절 정렬선, 방향 화살표, 주요 근육 하이라이트를 렌더링하는 순수 SVG 컴포넌트 (썸네일/상세 모드 겸용)
- [`src/components/MovementVisualGuideCard.tsx`](file:///home/antigravity/blue45f/pilate_flow/src/components/MovementVisualGuideCard.tsx) — 단계 전환(44px 터치 타깃), 오버레이 토글, 모바일 반응형 HTML 요약·범례, 유사 동작 7차원 나란히 비교, 신뢰 출처 대조 및 검토 전/후 배지를 제공하는 통합 시각 가이드 카드
- [`src/test/movementVisualGuide.test.tsx`](file:///home/antigravity/blue45f/pilate_flow/src/test/movementVisualGuide.test.tsx) — 98종 전수 커버리지, 4대 시각 지표, 7차원 유사 동작 비교, 권리·해부학적 비추정 가드, 검토 전/후 분리, 모바일(`320px`/`390px`) 가독성 검증 테스트
- [`docs/movement-visual-assets-integration.md`](file:///home/antigravity/blue45f/pilate_flow/docs/movement-visual-assets-integration.md) — 본 설계 요약 및 공통 파일 비침투 통합 제안서

### 1.2 제외 범위 (Excluded Scope — 병렬 세션 및 동결 원장 보호를 위해 수정하지 않음)
- **미디어 재생 및 훅**: [`src/models/DraftPlaybackController.ts`](file:///home/antigravity/blue45f/pilate_flow/src/models/DraftPlaybackController.ts), [`src/components/MotionReferencePlayer.tsx`](file:///home/antigravity/blue45f/pilate_flow/src/components/MotionReferencePlayer.tsx), [`src/components/YouTubeClipModal.tsx`](file:///home/antigravity/blue45f/pilate_flow/src/components/YouTubeClipModal.tsx), `src/hooks/useMotion*`
- **공통 스타일시트**: `src/styles/*.css` (컴포넌트 자체 인라인/독립 스타일 및 시맨틱 클래스로 완결)
- **공통 데이터 모델 및 스토어**: [`src/types/pilates.ts`](file:///home/antigravity/blue45f/pilate_flow/src/types/pilates.ts), `src/schemas/*.ts`, [`src/store/usePilatesStore.ts`](file:///home/antigravity/blue45f/pilate_flow/src/store/usePilatesStore.ts), `src/models/*.ts`, [`src/data/pilatesCatalog.ts`](file:///home/antigravity/blue45f/pilate_flow/src/data/pilatesCatalog.ts)
- **동결 모션 스터디 원장 그래프 (Frozen Motion-Study Ledger Graph)**: [`src/data/motionStudyLedger.json`](file:///home/antigravity/blue45f/pilate_flow/src/data/motionStudyLedger.json), [`scripts/generate-motion-study-ledger.mjs`](file:///home/antigravity/blue45f/pilate_flow/scripts/generate-motion-study-ledger.mjs), 그리고 22개 동결 변형(frozen variant) 파일 일체
- **공통 컨테이너 화면**: [`src/App.tsx`](file:///home/antigravity/blue45f/pilate_flow/src/App.tsx), [`src/components/ExerciseAtlasView.tsx`](file:///home/antigravity/blue45f/pilate_flow/src/components/ExerciseAtlasView.tsx), [`src/components/SequenceWorkbench.tsx`](file:///home/antigravity/blue45f/pilate_flow/src/components/SequenceWorkbench.tsx), [`src/components/StepBlockInspector.tsx`](file:///home/antigravity/blue45f/pilate_flow/src/components/StepBlockInspector.tsx), [`src/components/InstructorStudyDialog.tsx`](file:///home/antigravity/blue45f/pilate_flow/src/components/InstructorStudyDialog.tsx) (직접 수정하지 않고 **제5장**에 통합 담당자용 패치 코드 제공)

---

## 2. 시각 자료 고도화 설계 요약 (4대 핵심 시각 지표 & 동작 차이 이해)

기존의 단순 기구 아이콘 수준을 넘어, 강사와 사용자가 **단 한 장의 도해와 비교 패널만으로도 동작의 기하학적 원리와 유사 동작 간 차이를 즉시 구별**할 수 있도록 4대 핵심 시각 지표와 7차원 비교 엔진을 구축했습니다.

### 2.1 시작(`start`) · 중간(`middle`) · 끝(`end`) 3단계 다관절 기하 모델 및 고스트 오버레이(Pose Delta)
- **14~21개 관절 좌표계 (`RigJointMap`)**:
  - `head`, `neck`, `shoulder`, `elbow`, `wrist`, `hand`, `thoracic`, `lumbar`, `pelvis`, `hip`, `knee`, `ankle`, `heel`, `toe` 및 양측/비대칭 동작용 원거리 관절(`farShoulder`, `farElbow`, `farWrist`, `farHip`, `farKnee`, `farAnkle`, `farToe`)을 `320×200` 표준 뷰포트 내 안전 좌표(`x: 16..304`, `y: 16..184`)로 정규화했습니다.
- **3단계 자세 명세 (`PhasePoseSpec`)**:
  - `start` (`시작 자세 (준비·정렬)`): 기구 접촉면·고정 지지점 세팅 및 들숨 준비 정렬
  - `middle` (`중간 자세 (최대 가동·정점)`): 척추 면(`spinalPlanes`) 및 사지·캐리지·페달의 최대 가동 정점
  - `end` (`끝 자세 (제어 복귀·마무리)`): 스프링 저항 및 중력에 맞선 원심성(Eccentric) 제어 복귀
- **시작↔중간 고스트 오버레이 (`calculatePhaseJointDelta` & `poseDeltaSummary`)**:
  - 중간(`middle`) 또는 끝(`end`) 단계 조회 시 시작(`start`) 자세의 골격을 반투명 점선 고스트(Ghost Pose Overlay)로 겹쳐 그리고, 가장 크게 이동한 관절들의 변위 벡터(`movedJoints`, `deltaPx`, `maxDeltaPx`)와 부동 지지 관절(`anchoredJoints`)을 시각적으로 대비시킵니다.

### 2.2 관절 정렬(`jointAlignments`) 기준선 · 목표 각도 · 고정 지지점 vs 이동 관절
- **5종 정렬 가이드 (`JointAlignmentGuide.kind`)**:
  - `plumb-line` (수직 중력 기준선), `axis-line` (척추·골반·하지 정렬 축), `angle-arc` (목표 관절 각도 아크 및 `targetAngleDeg`), `anchor-lock` (떠오름·흔들림 방지 고정점), `neutral-zone` (요추·골반 중립 완충 구간)을 단계별로 제공합니다.
- **고정 지지점(`fixedAnchors`) vs 이동 관절(`movingJoints`) 분리**:
  - 각 단계에서 매트·캐리지·시트·래더에 단단히 고정해야 할 관절(`fixedAnchors`: 예: 천골, 견갑골 하각, 좌골, 지지 발바닥)을 앵커 마커로 표시하고, 실제 궤적을 그리는 관절(`movingJoints`)과 명확히 구분합니다.

### 2.3 움직임 방향(`directionVectors`) 화살표 및 기구 역학 상태(`apparatusState`)
- **6종 방향 벡터 (`MovementDirectionVector.kind`)**:
  - `limb-excursion` (사지 가동 궤적), `spine-articulation` (척추 분절 흐름), `carriage-travel` (리포머/캐딜락 캐리지 활주 방향), `spring-resistance` (스프링 장력 저항 벡터), `axial-lengthening` (정수리-꼬리뼈 축성 신장), `return-control` (원심성 복귀 제어 화살표)를 단계별로 표시합니다.
- **기구 상태 동기화 (`PhasePoseSpec.apparatusState`)**:
  - 단계 진행에 따른 캐리지 이동량(`carriageOffsetPx`), 체어 페달 각도(`pedalAngleDeg`), 스프링 장력 수준(`springTensionLevel: 'low' | 'medium' | 'high' | 'none'`), 지지면 설명(`supportSurfaceKo`), 소도구 결합 상태(`propPositionKo`)를 도해 내 기구 레이어와 실시간 동기화합니다.

### 2.4 주요 근육(`primaryMuscles`) 하이라이트 및 카탈로그 98종 100% 매칭
- **12대 근육군(`MuscleGroupId`) 및 3대 역할(`MuscleActivationRole`) 구분**:
  - 주동근(`primary`: 주 타겟 수축 부위), 안정화근(`stabilizer`: 코어·견갑·골반 정렬 유지 부위), 신장·이완 부위(`lengthening`: 편심성 조절 및 스트레치 부위)를 색상·패턴 및 관절 앵커(`anchorJoints`)로 구분 렌더링합니다.
- **실제 카탈로그 98종(`INITIAL_EXERCISES`) 전수 매칭**:
  - [`MOVEMENT_VISUAL_ASSETS`](file:///home/antigravity/blue45f/pilate_flow/src/data/movementVisualRigCatalog.ts#L4432-L4434) 및 [`getMovementVisualAsset`](file:///home/antigravity/blue45f/pilate_flow/src/data/movementVisualRigCatalog.ts#L4439-L4448)는 각 운동의 `targetMuscles`, `apparatus`, `bodyPosition`, `blockCategory`, `spinalPlanes`, `springs`, `props`, `cues`, `precautions`를 그대로 반영하여 98개 전 항목에 누락 없이(`100%`) 고유 시각 자산을 생성합니다.

### 2.5 유사 동작 간 7차원 비교 (`compareCatalogMovements` & `CURATED_MOVEMENT_DIFFERENCE_PAIRS`)
- 혼동하기 쉬운 동작 쌍(예: *매트 골반 시계 vs 매트 브리지*, *매트 힐 슬라이드 vs 매트 니 폴드*, *리포머 패럴렐 풋워크 vs 써클링 와이드 세컨드 풋워크*, *리포머 클래식 풋워크 vs 운다 체어 시티드 풋워크*, *리포머 핏인스트랩 vs 캐딜락 레그 스프링* 등 20개 핵심 큐레이션 쌍 [`CURATED_MOVEMENT_DIFFERENCE_PAIRS`](file:///home/antigravity/blue45f/pilate_flow/src/data/movementVisualSourceAudit.ts#L998-L1006) 및 임의의 두 카탈로그 동작 쌍)을 아래 **7개 생체역학·기구 차원**으로 정밀 대조합니다:
  1. `start-pose` — 시작 자세 (Start Pose)
  2. `middle-peak-pose` — 중간·최대 가동 자세 (Middle / Peak Pose)
  3. `end-return-pose` — 끝·복귀 자세 (End / Return Pose)
  4. `joint-alignment` — 관절 정렬 포인트 (Joint Alignment)
  5. `movement-direction` — 움직임 방향·척추 면 (Movement Direction)
  6. `primary-muscles` — 주요 사용 근육 (Primary Muscles)
  7. `apparatus-support` — 기구·소도구 지지 조건 (Apparatus & Support)

---

## 3. 권리 확인 · 해부학적 정확성 비추정(`anatomicalAccuracyAssumed: false`) · 검토 전/후 상태 구분

### 3.1 무료 자체 제작 벡터 도해(`free-authored-kinematic-svg-v1`) 및 정적 자산 라이선스 정책
- 본 작업의 모든 동적·정적 SVG 도해는 외부 영상 캡처, 서적 삽화 트레이싱, 유료 스톡 이미지 없이 **앱 내부 계획 메타데이터와 수학적 기하 좌표로 직접 작성한 자체 저작물(`productionMethod: 'free-authored-kinematic-svg-v1'`, `rightsStatus: 'original-app-authored-free-license'`)**입니다.
- [`public/images/movement-guides/LICENSE.txt`](file:///home/antigravity/blue45f/pilate_flow/public/images/movement-guides/LICENSE.txt) 및 [`public/images/movement-guides/MANIFEST.json`](file:///home/antigravity/blue45f/pilate_flow/public/images/movement-guides/MANIFEST.json)에 기구별 정적 도해 5종의 SHA-256 해시와 무료 오픈 라이선스(CC-BY-4.0 / MIT 호환), 그리고 임상·해부학적 비추정 고지를 영구 기록했습니다.

### 3.2 AI 생성 이미지(`ai-generated-raster`) 자동 격리 및 해부학적 정확성 비추정 가드
- [`evaluateVisualAssetIntegrity`](file:///home/antigravity/blue45f/pilate_flow/src/data/movementVisualSourceAudit.ts#L45-L125) 함수는 다음 무결성 계약을 코드 수준에서 강제합니다:
  1. **해부학적 정확성 비추정 (`anatomicalAccuracyAssumed: false` 고정)**:
     - 모든 `CatalogMovementVisualAsset`, `VisualSourceComparisonRecord`, `VisualAssetIntegrityCheck`는 리터럴 타입 `anatomicalAccuracyAssumed: false`를 강제합니다.
     - 만약 `anatomicalAccuracyAssumed: true`로 요청하면 즉시 `integrityPassed: false`, `canRepresentMovementTechnique: false`로 차단·격리됩니다.
  2. **AI 생성 이미지(`ai-generated-raster`) 동작 시범 사용 원천 차단**:
     - 생성형 AI 래스터 이미지는 관절 각도·기구 스프링 연결·해부학적 구조의 정확성을 보장할 수 없으므로 `canRepresentMovementTechnique: false`로 자동 격리되며 동작 시범·정렬 근거로 렌더링되지 않습니다.
  3. **권리 미확인 외부 이미지(`external-unlicensed`) 및 출처 미대조 자산 차단**:
     - 라이선스가 확인되지 않은 외부 미디어(`external-unlicensed`) 또는 신뢰 출처 대조(`hasReliableSourceComparison: false`)가 없는 자산은 동작 비교 도해로 표시할 수 없습니다.

### 3.3 신뢰 자료 대조 및 검토 전(`pre-review`) vs 검토 후(`post-review`) 엄격 구분
- [`getVisualSourceComparison`](file:///home/antigravity/blue45f/pilate_flow/src/data/movementVisualSourceAudit.ts#L475-L544)은 각 동작을 [`VERIFIED_REFERENCES`](file:///home/antigravity/blue45f/pilate_flow/src/data/verifiedReferences.ts), [`PUBLIC_REFERENCES`](file:///home/antigravity/blue45f/pilate_flow/src/data/publicReferences.ts), [`COURSE_REFERENCES`](file:///home/antigravity/blue45f/pilate_flow/src/data/courseReferences.ts), [`MOTION_PATTERN_REFERENCES`](file:///home/antigravity/blue45f/pilate_flow/src/data/motionPatternReferences.ts)와 원문 링크 전용(link-only)으로 대조하여 다음 항목을 명시합니다:
  - `matchedCatalogFactsKo`: 기구·블록·자세·스프링·풋바·헤드레스트·척추 면·타겟 근육·호흡 대조 내역
  - `diagramSimplificationsKo`: 2D 평면 투영 단순화 및 비선형 스프링 저항 도식화 한계 고지
  - `unverifiedItemsKo`: 외부 전문가 프레임별 모션 검수 미실시(`professionalMotionReviewCount: 0`), 현장 기구 편차, 수강생 개인별 금기 미검증 명시
  - `preToPostReviewChecklistKo`: 강사가 검토 전 초안을 검토 후 상태로 전환하기 위해 확인해야 할 4단계 체크리스트
- **검토 전 vs 검토 후 5단계 상태(`VisualReviewStage`) 분리**:
  - **검토 전 (`isPostReview: false`)**:
    - `'unreviewed-draft'`: `검토 전 · 미검토 초안 (수업 자동 편성 제외)`
    - `'source-compared-pre-review'`: `검토 전 · 출처 대조 초안 (수업 자동 편성 제외)`
    - `'stale-recheck-required'`: `재검토 필요 · 동작 정보 변경됨 (검토 전 상태로 격리)`
  - **검토 후 (`isPostReview: true`)**:
    - `'instructor-reviewed'`: `검토 후 · 강사 계획 검토 완료 (외부 전문가 모션 검수 0건)`
    - `'expert-verified'`: `검토 후 · 외부 전문가 모션 검수 완료`

---

## 4. 모바일 가독성 및 접근성 보장 (`320px`/`390px` · 44px 터치 타깃 · 200% 텍스트 확대)

좁은 모바일 뷰포트(`320px`, `390px`)나 브라우저 200% 텍스트 확대 환경에서도 도해와 설명이 겹치거나 잘리지 않도록 다음과 같은 분리 아키텍처를 적용했습니다:

1. **SVG 내부 장문 텍스트 배제 (Zero Cramped Long Text Inside SVG)**:
   - [`MovementPhaseDiagramSvg`](file:///home/antigravity/blue45f/pilate_flow/src/components/MovementPhaseDiagramSvg.tsx) 내부에는 기하 도형(기구 프레임, 관절 링크, 고정 앵커 마커, 방향 화살표, 각도 아크, 근육 하이라이트 폴리곤)과 짧은 숫자/기호 배지만 배치하고, 긴 한국어 큐잉·근육 설명·정렬 주의사항은 모두 SVG 외부의 반응형 HTML 카드([`MovementVisualGuideCard`](file:///home/antigravity/blue45f/pilate_flow/src/components/MovementVisualGuideCard.tsx))로 분리했습니다.
2. **44×44px 이상 터치 타깃 보장**:
   - 시작·중간·끝 단계 선택 탭, 고스트 오버레이·정렬선·근육 하이라이트 토글 버튼, 유사 동작 비교 피어 선택 버튼 모두 `min-height: 44px`, `min-width: 44px` 이상의 터치 영역과 명확한 `aria-pressed` / `aria-selected` 상태를 제공합니다.
3. **모바일 3줄 핵심 요약(`mobileSummaryBulletsKo`) 및 반응형 그리드**:
   - `320px`/`390px` 화면에서 즉시 스캔할 수 있는 3줄 요약(`정렬·지지`, `핵심 변화`, `주 타겟`)을 상단에 배치하고, 3단계 스트립 뷰와 유사 동작 비교 표는 `auto-fit` / `minmax(240px, 1fr)` 반응형 레이아웃과 `overflow-wrap: anywhere`, `word-break: keep-all`을 적용해 200% 텍스트 확대 시에도 가로 넘침이나 텍스트 겹침이 발생하지 않습니다.

---

## 5. 공통 파일 통합 담당자용 비침투 패치 제안 (Integration Proposals for Shared Files)

공통 컨테이너 파일을 담당하는 통합 세션에서 아래 코드 조각을 그대로 마운트하면 기존 재생기·모션 원장·스토어 로직을 건드리지 않고 시각 가이드와 동작 비교 기능을 연결할 수 있습니다.

### 5.1 [`src/components/ExerciseAtlasView.tsx`](file:///home/antigravity/blue45f/pilate_flow/src/components/ExerciseAtlasView.tsx) — 카탈로그 카드 썸네일 및 상세 시각 가이드 패널 연결

카탈로그 카드의 `.movement-card-art` 영역에서 관련 모션 패턴이 없는 동작(`ml-unmapped-art`)이거나 3단계 정렬 도해를 바로 보여주고자 할 때 `<MovementPhaseDiagramSvg variant="thumbnail" />`를 렌더링하고, 카드 하단 또는 확장 영역에 `<MovementVisualGuideCard compact />`를 연결할 수 있습니다.

```tsx
// src/components/ExerciseAtlasView.tsx 상단 import 추가 제안
import { getMovementVisualAsset } from '../data/movementVisualRigCatalog';
import { MovementPhaseDiagramSvg } from './MovementPhaseDiagramSvg';
import { MovementVisualGuideCard } from './MovementVisualGuideCard';

// 1) 카탈로그 카드 썸네일 영역 (ExerciseAtlasView.tsx 약 1362~1375행 부근) 대체/보완:
const visualAsset = getMovementVisualAsset(exercise);

{patterns[0] ? (
  <MotionPatternThumbnail reference={patterns[0]} />
) : visualAsset ? (
  <MovementPhaseDiagramSvg
    asset={visualAsset}
    phase="middle"
    variant="thumbnail"
    showGhostStart
    showAlignmentGuides
    showDirectionVectors
    showMuscleHighlights
  />
) : (
  <div className="ml-unmapped-art" aria-hidden="true">
    <span>움직임을 기록할 자리</span>
    <i />
    <span>MOTION STUDY PENDING</span>
  </div>
)}

// 2) 선택된 동작의 시작·중간·끝 시각 가이드 & 유사 동작 비교 드로어/패널 렌더링:
{selectedVisualExercise && (
  <MovementVisualGuideCard
    exercise={selectedVisualExercise}
    catalogExercises={exercises}
    initialPhase="middle"
  />
)}
```

### 5.2 [`src/components/StepBlockInspector.tsx`](file:///home/antigravity/blue45f/pilate_flow/src/components/StepBlockInspector.tsx) — 시퀀스 단계 인스펙터 내 시작·중간·끝 정렬 및 유사 동작 비교 접이식 섹션

시퀀스 편집 중 선택한 단계의 관절 정렬·주동근·스프링 방향과 대체 가능한 유사 동작 차이를 즉시 확인할 수 있도록 [`ExerciseEvidencePanel`](file:///home/antigravity/blue45f/pilate_flow/src/components/StepBlockInspector.tsx#L396) 위아래에 비침투적으로 배치합니다.

```tsx
// src/components/StepBlockInspector.tsx 상단 import 추가 제안
import { MovementVisualGuideCard } from './MovementVisualGuideCard';

// StepBlockInspector 내부 (<ExerciseEvidencePanel /> 인근, 약 396행 부근) 추가 제안:
{exercise && (
  <details className="step-inspector-visual-guide">
    <summary>시작·중간·끝 관절 정렬 도해 및 유사 동작 차이 비교</summary>
    <MovementVisualGuideCard
      exercise={exercise}
      catalogExercises={store.exercises}
      initialPhase="middle"
      compact
    />
  </details>
)}
```

### 5.3 [`src/components/InstructorStudyDialog.tsx`](file:///home/antigravity/blue45f/pilate_flow/src/components/InstructorStudyDialog.tsx) — 강사 숙지 연습실 내 출처 대조·동작 차이 비교 뷰

강사 연습실의 동작 숙지 패널([`MotionReferencePlayer`](file:///home/antigravity/blue45f/pilate_flow/src/components/InstructorStudyDialog.tsx#L230-L235) 및 `ExerciseEvidencePanel` 사이)에 `<MovementVisualGuideCard />`를 마운트하면, 강사가 시작·중간·끝 자세 변화와 신뢰 출처 대조 체크리스트(`preToPostReviewChecklistKo`), 그리고 유사 동작 간 7차원 차이를 한 화면에서 숙지할 수 있습니다.

```tsx
// src/components/InstructorStudyDialog.tsx 상단 import 추가 제안
import { MovementVisualGuideCard } from './MovementVisualGuideCard';

// InstructorStudyDialog 내부 (약 230~236행 사이) 추가 제안:
<MotionReferencePlayer
  key={selected.id}
  exerciseId={selected.id}
  exerciseName={selected.nameKo}
/>
<MovementVisualGuideCard
  key={`visual-guide-${selected.id}`}
  exercise={selected}
  catalogExercises={exercises}
  initialPhase="start"
/>
<ExerciseEvidencePanel exercise={selected} />
```

### 5.4 [`src/components/YouTubeClipModal.tsx`](file:///home/antigravity/blue45f/pilate_flow/src/components/YouTubeClipModal.tsx) — 동작 상세 모달 내 `MovementArt` 보완 및 3단계 시각 도해 연결

동작 상세·검토 모달(`MovementDetails`)에서 단순 정적 기구 일러스트(`<MovementArt apparatus={exercise.apparatus} />`) 자리에 3단계 스트립 도해 또는 `<MovementVisualGuideCard />`를 함께 배치하여, 강사가 검토 승인(`LocalInstructorReview`) 전에 시작·중간·끝 정렬, 주요 근육, 출처 대조 한계를 명확히 점검할 수 있게 합니다.

```tsx
// src/components/YouTubeClipModal.tsx 상단 import 추가 제안
import { getMovementVisualAsset } from '../data/movementVisualRigCatalog';
import { MovementPhaseDiagramSvg } from './MovementPhaseDiagramSvg';
import { MovementVisualGuideCard } from './MovementVisualGuideCard';

// 1) MovementDetails 상단 미디어 영역 (약 760~770행 부근)에서 MovementArt 보완:
const visualAsset = useMemo(() => getMovementVisualAsset(exercise), [exercise]);

{visualAsset ? (
  <MovementPhaseDiagramSvg
    asset={visualAsset}
    phase="middle"
    variant="three-phase-strip"
    showGhostStart
    showAlignmentGuides
    showDirectionVectors
    showMuscleHighlights
  />
) : (
  <MovementArt apparatus={exercise.apparatus} />
)}

// 2) ExerciseEvidencePanel (약 804행 부근) 직후에 상세 시각 가이드 & 7차원 비교 카드 배치:
<MovementVisualGuideCard
  exercise={exercise}
  initialPhase="middle"
/>
```
