# 수업·블록 프리셋 및 빈 초안 시작 옵션 (Class & Block Presets + Blank Draft Starters) — 카탈로그 명세 및 통합 제안서

본 문서는 **AI 호출 없이 즉시 사용·편집 가능한 스튜디오 수업 프리셋(`OFFLINE_CLASS_PRESETS`, 18종)**, **재사용 블록 프리셋(`OFFLINE_BLOCK_PRESETS`, 20종)**, 그리고 **새 동작을 직접 창작하는 사용자(강사·여자친구 등)를 위한 빈 초안 시작 옵션(`BLANK_DRAFT_STARTER_OPTIONS`, 6종)**의 소유 경계, 카탈로그 요약, 검증 원칙 및 공통 파일 통합 패치 제안을 정의합니다.

---

## 1. 담당 파일 및 제외 범위 선언 (Scope & Ownership Boundary)

병렬 작업 중인 P1(4단계 계층·창작 스키마), P2(디자인 시스템), P5(무료 전용 AI 보조) 및 공통 스토어/워크벤치 파일과의 충돌을 방지하기 위해, 본 세션은 아래 소유 파일만 작성·관리하며 제외 범위 파일은 일절 수정하지 않습니다.

### 1.1 담당 파일 (Owned Files)
- [`src/types/classBlockPresets.ts`](file:///home/antigravity/blue45f/pilate_flow/src/types/classBlockPresets.ts) — 7대 프리셋 테마(`PresetThemeId`), 비의학·비AI 안전 경계(`PresetSafetyAndClaimBoundary`), 재사용 블록 프리셋(`OfflineBlockPreset`), 수업 시퀀스 프리셋(`OfflineClassPreset`), 빈 초안 시작 옵션(`BlankDraftStarterOption`, `BlankDraftSessionBundle`), 정합성·유사도·건강표현 검증 리포트 타입 정의
- [`src/data/classBlockPresets.ts`](file:///home/antigravity/blue45f/pilate_flow/src/data/classBlockPresets.ts) — `PRESET_THEME_CATALOG`(7종), `OFFLINE_BLOCK_PRESETS`(20종), `OFFLINE_CLASS_PRESETS`(18종), `BLANK_DRAFT_STARTER_OPTIONS`(6종) 깊은 동결(`deepFreeze`) 카탈로그 및 ID 조회 헬퍼
- [`src/utils/classBlockPresetValidator.ts`](file:///home/antigravity/blue45f/pilate_flow/src/utils/classBlockPresetValidator.ts) — 카탈로그 동작 바인딩 검증, 하위 시간 합산 검증, 좌우 편측 균형 검증, 전환 점수·동선 검증, 제목·시그니처·Jaccard 유사도 기반 중복 방지 감사(`auditPresetCatalog`), 미검증 건강·재활 효능 표현 검사(`inspectUnverifiedHealthOrRehabClaims`), 편집 격리 인스턴스화(`instantiateClassPresetAsEditableSequence`, `instantiateBlockPresetAsReusableBlock`, `insertBlockPresetIntoSequence`), P5 계약 어댑터(`toP5ReusableBlockContract`), 빈 초안 세션 빌더(`startFromBlankDraftOption`)
- [`src/test/classBlockPresets.test.ts`](file:///home/antigravity/blue45f/pilate_flow/src/test/classBlockPresets.test.ts) — 프리셋 카탈로그 전수 감사, 시간·좌우·전환·중복·건강표현·편집 격리·빈 초안 시작 시나리오 단위 및 통합 테스트
- [`docs/CLASS_BLOCK_PRESETS_INTEGRATION.md`](file:///home/antigravity/blue45f/pilate_flow/docs/CLASS_BLOCK_PRESETS_INTEGRATION.md) — 본 통합 명세 및 공통 파일 비침투적 연동 제안 문서

### 1.2 제외 범위 (Excluded Scope — Untouched Files)
- **P1 (4단계 계층·새 동작 창작 스키마 및 검증)**:
  - [`src/types/hierarchy.ts`](file:///home/antigravity/blue45f/pilate_flow/src/types/hierarchy.ts), [`src/schemas/hierarchySchema.ts`](file:///home/antigravity/blue45f/pilate_flow/src/schemas/hierarchySchema.ts), [`src/utils/hierarchyModel.ts`](file:///home/antigravity/blue45f/pilate_flow/src/utils/hierarchyModel.ts), [`src/utils/humanMovementCreation.ts`](file:///home/antigravity/blue45f/pilate_flow/src/utils/humanMovementCreation.ts), [`src/utils/sequenceValidation.ts`](file:///home/antigravity/blue45f/pilate_flow/src/utils/sequenceValidation.ts)
- **P2 (공통 디자인 시스템 및 스타일)**:
  - `src/design-system/**`, `src/styles/**`
- **P5 (무료 전용 AI 보조 백엔드·클라이언트·패널)**:
  - [`backend/freeAiService.ts`](file:///home/antigravity/blue45f/pilate_flow/backend/freeAiService.ts), [`src/types/freeAiAssistant.ts`](file:///home/antigravity/blue45f/pilate_flow/src/types/freeAiAssistant.ts), [`src/schemas/freeAiAssistantSchema.ts`](file:///home/antigravity/blue45f/pilate_flow/src/schemas/freeAiAssistantSchema.ts), [`src/utils/freeAiAssistantEngine.ts`](file:///home/antigravity/blue45f/pilate_flow/src/utils/freeAiAssistantEngine.ts), [`src/lib/freeAiClient.ts`](file:///home/antigravity/blue45f/pilate_flow/src/lib/freeAiClient.ts), [`src/components/FreeAiAssistantPanel.tsx`](file:///home/antigravity/blue45f/pilate_flow/src/components/FreeAiAssistantPanel.tsx)
- **공통 스토어 및 워크벤치 엔트리 (Shared Store & Workbench Files)**:
  - [`src/store/usePilatesStore.ts`](file:///home/antigravity/blue45f/pilate_flow/src/store/usePilatesStore.ts), [`src/types/pilates.ts`](file:///home/antigravity/blue45f/pilate_flow/src/types/pilates.ts), [`src/App.tsx`](file:///home/antigravity/blue45f/pilate_flow/src/App.tsx), [`src/components/SequenceWorkbench.tsx`](file:///home/antigravity/blue45f/pilate_flow/src/components/SequenceWorkbench.tsx)

---

## 2. 수업·블록 프리셋 카탈로그 요약 (Catalog Summary)

### 2.1 프리셋 주제 카탈로그 (`PRESET_THEME_CATALOG` — 7종)

| Theme ID (`PresetThemeId`) | 국문 주제명 (`labelKo`) | 영문 주제명 (`labelEn`) | 기본 포커스 (`defaultFocusPreset`) | 주요 블록 카테고리 (`primaryCategories`) | 요약 설명 (`summaryKo`) |
| --- | --- | --- | --- | --- | --- |
| `breath-pelvic-foundation` | 호흡·골반 기초 정렬 | Breath & Pelvic Foundation | `mobility-rehab` | `warmup`, `footwork`, `bridging` | 흉곽 호흡 인지와 골반 중립 조절을 바탕으로 본 운동 전 코어 연결을 준비하는 기초 정렬 테마입니다. |
| `core-spinal-control` | 복부 코어·척추 분절 컨트롤 | Core & Spinal Articulation Control | `core-sculpt` | `core`, `bridging`, `warmup` | 심부 복횡근 수축과 척추 분절 움직임을 연결하여 몸통 중심의 흔들림 없는 조절력을 기르는 테마입니다. |
| `lower-glute-balance` | 하체·둔근 지지 및 좌우 밸런스 | Lower Body, Glute Support & Side Balance | `glute-lower` | `footwork`, `lower-body`, `bridging`, `feet-in-straps` | 발목·무릎·고관절 정렬과 단측성 하지 지지력을 바탕으로 좌우 균형과 둔근 협응을 다루는 테마입니다. |
| `upper-thoracic-opening` | 상체·흉추 가동성 및 견갑 안정 | Upper Body, Thoracic Mobility & Scapular Stability | `posture-upper` | `upper-body`, `extension`, `warmup` | 견갑대 하강 안정과 흉추 신전·회전 가동성을 연결하여 상체 정렬과 열린 가슴 라인을 유도하는 테마입니다. |
| `full-body-flow` | 전신 협응·연결 플로우 | Full-Body Coordination & Seamless Flow | `full-body` | `warmup`, `footwork`, `bridging`, `core`, `upper-body`, `lower-body`, `extension`, `cooldown` | 도입 호흡부터 하지·코어·상체·신전·마무리까지 기구 동선을 매끄럽게 이어가는 전신 협응 테마입니다. |
| `athletic-plank-control` | 플랭크·전신 코어 컨트롤 | Athletic Plank & Full-Core Control | `core-sculpt` | `plank`, `core`, `lower-body`, `upper-body` | 견갑대 지지와 파워하우스 연결을 결합하여 플랭크·파이크·전신 제어 동작을 밀도 있게 이어가는 테마입니다. |
| `cooldown-mobility-release` | 전신 이완·가동성 마무리 | Cooldown Mobility & Gentle Release | `mobility-rehab` | `feet-in-straps`, `cooldown`, `warmup` | 수업 후반 고관절·측면 흉곽·척추 주변의 긴장을 부드러운 호흡과 함께 정돈하는 가동성 마무리 테마입니다. |

---

### 2.2 오프라인 재사용 블록 프리셋 (`OFFLINE_BLOCK_PRESETS` — 20종)

모든 블록은 P1 `ReusableBlock` 및 P5 `P1ReusableBlockContract`를 동시에 충족하며, 도입(`preparation` 5종)·메인(`main` 13종)·쿨다운(`cooldown` 2종) 및 전 기구(`mat`, `reformer`, `cadillac`, `chair`, `barrel`, `mixed`)를 포괄합니다.

| # | Block ID | 블록 제목 (`title`) | 구간 (`sectionRole`) | 기구 (`apparatus`) | 난이도 (`level`) | 시간 (`durationMin`) | 테마 (`theme`) |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 01 | `block-mat-prep-breath-clock-10` | 매트 호흡 인지 & 골반 시계 오프닝 블록 | `preparation` | `mat` | `1.0` | `6`분 | `breath-pelvic-foundation` |
| 02 | `block-reformer-prep-breath-imprint-10` | 리포머 캐리지 호흡 & 펠빅 클락 예열 블록 | `preparation` | `reformer` | `1.0` | `7`분 | `breath-pelvic-foundation` |
| 03 | `block-cadillac-prep-rollbar-breath-10` | 캐딜락 테이블 호흡 & 롤다운 바 흉추 오프닝 블록 | `preparation` | `cadillac` | `1.0` | `8`분 | `upper-thoracic-opening` |
| 04 | `block-chair-prep-seated-foundation-10` | 운다 체어 시티드 호흡 & 골반 수직 정렬 블록 | `preparation` | `chair` | `1.0` | `6`분 | `breath-pelvic-foundation` |
| 05 | `block-barrel-prep-standing-breath-ankle-10` | 바렐 스탠딩 호흡 & 래더 발목 정렬 도입 블록 | `preparation` | `barrel` | `1.0` | `6`분 | `upper-thoracic-opening` |
| 06 | `block-reformer-main-footwork-alignment-15` | 리포머 클래식 풋워크 & 써클링 외전 하지 정렬 블록 | `main` | `reformer` | `1.5` | `10`분 | `lower-glute-balance` |
| 07 | `block-reformer-main-bridging-articulation-15` | 리포머 브릿지 분절 & 햄스트링 컬 후면 사슬 블록 | `main` | `reformer` | `1.5` | `9`분 | `core-spinal-control` |
| 08 | `block-mat-main-core-series-15` | 매트 딥코어 체스트 리프트 & 앱 파이브 연결 블록 | `main` | `mat` | `1.5` | `12`분 | `core-spinal-control` |
| 09 | `block-reformer-main-core-coordination-15` | 리포머 수파인 스트랩 코디네이션 & 리버스 앱스 블록 | `main` | `reformer` | `1.5` | `12`분 | `full-body-flow` |
| 10 | `block-cadillac-main-pushthrough-parakeet-20` | 캐딜락 푸쉬스루바 티저 & 타워바 숄더 브릿지 블록 | `main` | `cadillac` | `2.0` | `13`분 | `core-spinal-control` |
| 11 | `block-reformer-main-upper-rowing-15` | 리포머 닐링 체스트 익스팬션 & 시티드 로잉 상체 블록 | `main` | `reformer` | `1.5` | `12`분 | `upper-thoracic-opening` |
| 12 | `block-cadillac-main-armsprings-rotation-15` | 캐딜락 암 스프링 프레스 & 스탠딩 펀치 로테이션 블록 | `main` | `cadillac` | `1.5` | `12`분 | `upper-thoracic-opening` |
| 13 | `block-reformer-main-scooter-splits-15` | 리포머 스탠딩 스쿠터 좌·우 분할 & 사이드 스플릿 하체 블록 | `main` | `reformer` | `1.5` | `13`분 | `lower-glute-balance` |
| 14 | `block-chair-main-stepup-climber-20` | 운다 체어 교대 페달 풋워크 & 스탠딩 포워드 런지 블록 | `main` | `chair` | `2.0` | `14`분 | `lower-glute-balance` |
| 15 | `block-reformer-main-plank-stretch-15` | 리포머 롱 스트레치 & 엘리펀트 전신 플랭크 블록 | `main` | `reformer` | `1.5` | `8`분 | `athletic-plank-control` |
| 16 | `block-chair-main-pike-plank-20` | 운다 체어 인클라인 서포트 & 파이크 풀업 코어 블록 | `main` | `chair` | `2.0` | `11`분 | `athletic-plank-control` |
| 17 | `block-barrel-main-swan-sidebend-20` | 래더 바렐 스완 다이브 & 사이드 벤드 척추 입체 블록 | `main` | `barrel` | `2.0` | `12`분 | `upper-thoracic-opening` |
| 18 | `block-mixed-main-reformer-chair-flow-15` | 리포머 롱박스 스완 & 운다 체어 풋워크 콤비 메인 블록 | `main` | `mixed` | `1.5` | `13`분 | `full-body-flow` |
| 19 | `block-reformer-cooldown-straps-mermaid-10` | 리포머 핏인스트랩 프로그 & 머메이드 이완 쿨다운 블록 | `cooldown` | `reformer` | `1.0` | `7`분 | `cooldown-mobility-release` |
| 20 | `block-mat-cooldown-mermaid-openbook-10` | 매트 머메이드 측굴 & 사이드 오픈 북 흉곽 이완 블록 | `cooldown` | `mat` | `1.0` | `6`분 | `cooldown-mobility-release` |

---

### 2.3 오프라인 완성형 수업 시퀀스 프리셋 (`OFFLINE_CLASS_PRESETS` — 18종)

15분·20분·30분·45분·50분·60분 전 시간대, 전 기구(`mat`, `reformer`, `cadillac`, `chair`, `barrel`, `mixed`), 전 난이도(`1.0`, `1.5`, `2.0`), 7대 주제를 모두 커버하며 모든 시퀀스의 전환 흐름 점수(`transitionScore`)는 **90~98점(기준 85점 이상)**입니다.

| # | Preset ID | 수업 프리셋 제목 (`title`) | 시간 (`durationMinutes`) | 기구 (`apparatus`) | 난이도 (`level`) | 테마 (`theme`) | 전환 점수 (`transitionScore`) |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 01 | `preset-class-mat-15-breath-foundation-10` | 매트 15분 호흡·골반 기초 정렬 익스프레스 | `15`분 | `mat` | `1.0` | `breath-pelvic-foundation` | `98`점 |
| 02 | `preset-class-reformer-15-mobility-release-10` | 리포머 15분 고관절 가동성 & 머메이드 릴리즈 | `15`분 | `reformer` | `1.0` | `cooldown-mobility-release` | `98`점 |
| 03 | `preset-class-reformer-20-upper-thoracic-15` | 리포머 20분 상체·흉추 가동성 & 견갑 안정 플로우 | `20`분 | `reformer` | `1.5` | `upper-thoracic-opening` | `98`점 |
| 04 | `preset-class-chair-20-lower-support-10` | 운다 체어 20분 하지 지지 & 스탠딩 균형 루틴 | `20`분 | `chair` | `1.0` | `lower-glute-balance` | `98`점 |
| 05 | `preset-class-mat-30-core-spinal-15` | 매트 30분 코어 컨트롤 & 척추 신전 밸런스 | `30`분 | `mat` | `1.5` | `core-spinal-control` | `98`점 |
| 06 | `preset-class-reformer-30-seamless-flow-15` | 리포머 30분 상·하체 통합 코어 협응 익스프레스 | `30`분 | `reformer` | `1.5` | `full-body-flow` | `98`점 |
| 07 | `preset-class-barrel-30-spine-extension-15` | 래더 바렐 30분 척추 신전 & 흉곽 가동성 플로우 | `30`분 | `barrel` | `1.5` | `upper-thoracic-opening` | `98`점 |
| 08 | `preset-class-reformer-45-glute-split-balance-15` | 리포머 45분 하체·둔근 좌우 분할 밸런스 클래스 | `45`분 | `reformer` | `1.5` | `lower-glute-balance` | `93`점 |
| 09 | `preset-class-cadillac-45-articulation-flow-15` | 캐딜락 45분 푸쉬스루 분절 & 레그스프링 코어 클래스 | `45`분 | `cadillac` | `1.5` | `core-spinal-control` | `92`점 |
| 10 | `preset-class-chair-45-athletic-plank-20` | 운다 체어 45분 애슬레틱 플랭크 & 파이크 챌린지 | `45`분 | `chair` | `2.0` | `athletic-plank-control` | `92`점 |
| 11 | `preset-class-reformer-50-gentle-foundation-10` | 리포머 50분 입문 호흡·골반 정렬 & 사이드 라잉 플로우 | `50`분 | `reformer` | `1.0` | `breath-pelvic-foundation` | `90`점 |
| 12 | `preset-class-reformer-50-signature-flow-15` | 리포머 50분 전신 밸런스 & 둔근·코어 시그니처 플로우 | `50`분 | `reformer` | `1.5` | `full-body-flow` | `93`점 |
| 13 | `preset-class-reformer-50-athletic-sculpt-20` | 리포머 50분 애슬레틱 런지·아라베스크 & 코어 번 | `50`분 | `reformer` | `2.0` | `athletic-plank-control` | `91`점 |
| 14 | `preset-class-cadillac-50-tower-master-20` | 캐딜락 50분 타워 브릿지 & 상·하체 통합 마스터 | `50`분 | `cadillac` | `2.0` | `upper-thoracic-opening` | `95`점 |
| 15 | `preset-class-mixed-50-chair-barrel-sculpt-20` | 운다 체어 & 래더 바렐 50분 코어·옆구리 콤비 스컬프 | `50`분 | `mixed` | `2.0` | `core-spinal-control` | `95`점 |
| 16 | `preset-class-mixed-50-reformer-cadillac-mobility-15` | 리포머 & 캐딜락 50분 척추 분절·가동성 릴리즈 플로우 | `50`분 | `mixed` | `1.5` | `cooldown-mobility-release` | `93`점 |
| 17 | `preset-class-reformer-60-endurance-master-15` | 리포머 60분 전신 지구력 & 아키텍처 마스터 클래스 | `60`분 | `reformer` | `1.5` | `full-body-flow` | `91`점 |
| 18 | `preset-class-mixed-60-studio-grand-20` | 캐딜락·리포머·체어 60분 대기구 그랜드 마스터 클래스 | `60`분 | `mixed` | `2.0` | `full-body-flow` | `90`점 |

---

### 2.4 새 동작 창작 사용자용 빈 초안 시작 옵션 (`BLANK_DRAFT_STARTER_OPTIONS` — 6종)

새 동작을 직접 구상·기록하는 사용자(강사·여자친구 등)가 프리셋에 얽매이지 않고 한 줄 메모·빈 블록·빈 수업·창작 쇼케이스로 즉시 시작할 수 있는 6종 스타터입니다.

| # | Starter ID (`id`) | 시작 유형 (`starterKind`) | 제목 (`titleKo`) | 추천 대상 (`recommendedForKo`) |
| --- | --- | --- | --- | --- |
| 01 | `starter-blank-movement-idea-note` | `blank-movement-idea` | 1줄 아이디어로 새 동작 초안 바로 적기 | 새로운 동작을 직접 구상·실험하며 나만의 동작 노트를 만들고 싶은 강사 및 창작 사용자 |
| 02 | `starter-blank-movement-prop-variation` | `blank-movement-idea` | 매트·소도구 창작 동작 아이디어 빈 노트 | 소도구 활용 동작이나 홈·스튜디오 매트 창작 시퀀스를 즐겨 만드는 사용자 |
| 03 | `starter-blank-reusable-block-builder` | `blank-reusable-block` | 내 창작 동작을 담는 빈 재사용 블록 만들기 | 수업마다 자주 쓰는 나만의 시그니처 구간(도입·메인·마무리)을 모듈화하고 싶은 강사 |
| 04 | `starter-blank-class-sequence-canvas` | `blank-class-sequence` | 완전 빈 캔버스에서 50분 수업 직접 조립하기 | 수업 흐름 전체를 처음부터 끝까지 직접 설계하는 것을 선호하는 강사 |
| 05 | `starter-blank-class-sequence-framed` | `blank-class-sequence` | 도입·메인·마무리 3구간 기본 틀에서 수업 시작하기 | 수업 3구간 구조는 유지하면서 메인 동작을 빠르게 창작·교체하고 싶은 사용자 |
| 06 | `starter-blank-custom-movement-showcase` | `blank-custom-movement-showcase` | 내가 만든 새 동작 중심 미니 수업 쇼케이스 | 여자친구·동료 강사와 함께 새로 만든 동작을 짧은 수업 흐름에 넣어 직접 해보며 다듬고 싶은 사용자 |

---

## 3. 핵심 검증 원칙 (Validation & Safety Guarantees)

[`src/utils/classBlockPresetValidator.ts`](file:///home/antigravity/blue45f/pilate_flow/src/utils/classBlockPresetValidator.ts)의 `validateOfflineBlockPreset`, `validateOfflineClassPreset`, `auditPresetCatalog`는 모든 수업·블록 프리셋과 빈 초안 시작 옵션에 대해 아래 7대 불변 원칙을 강제합니다.

1. **실제 카탈로그 동작 바인딩 (`INITIAL_EXERCISES` Real Catalog Binding)**:
   - 모든 블록 항목(`block.items`)과 수업 스텝(`preset.steps`)의 `exerciseId`는 [`INITIAL_EXERCISES`](file:///home/antigravity/blue45f/pilate_flow/src/data/pilatesCatalog.ts)에 실제 등록된 동작 ID로만 구성되며(`catalogExercisesResolved: true`, `unknownExerciseIds: []`), 빌드 시점과 검증 시점 모두에서 `createMovementSnapshot`이 캡처됩니다.
   - 또한 각 항목·스텝의 난이도는 블록/수업의 목표 난이도(`level`)를 초과하지 않으며, 수업 시퀀스는 도입(`preparation`) → 메인(`main`) → 마무리(`cooldown`) 3구간 흐름(`difficultyFlowValid: true`)을 엄수합니다.

2. **기구·스프링·체위 전환 동선 및 전환 여유 시간 보장 (Movement Flow & Transition Allowances)**:
   - 첫 스텝 이후 연속된 스텝 간 기구·박스·스프링·체위 변화를 `calculateApparatusTransitionDetail`로 계산하여, 기구 전환(`equipmentChanged: true`) 시 최소 `30초` 이상(프리셋 기본 `45초`)의 전환 시간(`transitionSec`)을 확보합니다.
   - 수업 프리셋 전체에 대해 `analyzeSequence` 기반 `transitionScore >= 85`점 및 `transition-underbudgeted` 이슈 0건을 보장합니다(`transitionFlowValid: true`).

3. **편측 동작 좌·우 균형 보장 (`left-then-right` 및 분할 `left` + `right` 쌍 검증)**:
   - 카탈로그에서 `isUnilateral: true`인 편측 동작은 절대 `'together'`로 배치될 수 없습니다.
   - 단일 스텝 내 순차 수행(`sideMode: 'left-then-right'`)뿐 아니라, [`block-reformer-main-scooter-splits-15`](file:///home/antigravity/blue45f/pilate_flow/src/data/classBlockPresets.ts#L753-L797) 및 [`preset-class-reformer-45-glute-split-balance-15`](file:///home/antigravity/blue45f/pilate_flow/src/data/classBlockPresets.ts#L1632-L1731)처럼 독립된 `'left'` 스텝과 `'right'` 스텝으로 분할 배치된 경우에도 좌·우 스텝 개수, 순수 움직임 시간(`movementSec`), 반복 횟수(`repetitions`), 세트 수(`sets`)가 1:1로 일치함을 검증합니다(`unilateralBalanced: true`, `imbalancedExerciseIds: []`).

4. **초 단위 하위 시간 합산 일치 (`movementSec + explanationSec + transitionSec === durationMin * 60`)**:
   - 모든 블록 항목과 수업 스텝은 `movementSec + explanationSec + transitionSec === durationMin * 60` 등식을 정확히 만족하며, 각 스텝의 순수 움직임 시간은 최소 `30초` 이상(`movementSec >= 30`)이어야 합니다.
   - 블록과 수업 시퀀스의 전체 합산 시간(`actualTotalSec`)은 목표 시간(`targetSec`)과 오차 `0초`(`deltaSec === 0`, `timeSumMatchesTarget: true`)로 일치합니다.

5. **표면적 이름 바꾸기 및 중복 구성 방지 (`Jaccard < 0.65` Anti-Duplication Threshold)**:
   - `auditPresetCatalog`는 정규화 제목 중복(`duplicateTitleIds: []`)과 동작 시그니처(`exerciseId:sideMode` 열) 중복(`duplicateSignatureIds: []`)을 차단합니다.
   - `computePresetSimilarity` 및 `computeBlockPresetSimilarity`를 통해 **동일 기구·동일 시간대(`sameApparatus && sameDuration`) 프리셋 쌍의 Jaccard 유사도가 `0.65` 이상이거나 전체 Jaccard 및 순서 일치율(LCS `orderedOverlapRatio`)이 `0.85` 이상인 경우 중복 위험(`isDuplicateRisk: true`)으로 판정**하여, 전 카탈로그에서 `highSimilarityPairs: []`(0건)를 보장합니다.

6. **검증되지 않은 건강·재활·의학적 효능 주장 원천 금지 (`medicalOrRehabEfficacyClaimed: false`)**:
   - 모든 프리셋과 빈 초안 스타터의 `safetyBoundary`는 `{ aiUsed: false, medicalOrRehabEfficacyClaimed: false, expertClinicalVerified: false, editableByInstructor: true }` 리터럴 계약을 강제합니다.
   - `inspectUnverifiedHealthOrRehabClaims`는 명시적 부정 고지문(`SAFE_NEGATIVE_DISCLAIMER_PATTERNS`)만 제외한 뒤 본문·요약·강사 큐잉 전체에서 *"치료, 완치, 재활 효과/보장/프로그램, 통증 제거/완화 보장, 체형 교정 보장, 의학적/임상 검증, 디스크/측만증/거북목 치료"* 및 민감 건강정보(PHI/PII) 표현을 전수 검사하여 위반 0건(`healthClaimViolations: []`)을 보장합니다.

7. **깊은 동결 템플릿과 강사 편집 복사본 격리 (`editIsolationVerified: true`)**:
   - `OFFLINE_CLASS_PRESETS`, `OFFLINE_BLOCK_PRESETS`, `BLANK_DRAFT_STARTER_OPTIONS`는 모듈 로드 시점에 재귀적 `deepFreeze`로 동결됩니다.
   - 강사가 `instantiateClassPresetAsEditableSequence`, `instantiateBlockPresetAsReusableBlock`, `insertBlockPresetIntoSequence`를 통해 프리셋을 불러와 제목·시간·순서·강사 노트를 수정하더라도 원본 프리셋 카탈로그는 1바이트도 변하지 않음을 런타임에 검증합니다(`editIsolationVerified: true`).

---

## 4. 공통 파일 통합 담당자용 비침투적 연동 제안 (Shared File Integration Proposal)

공통 파일 통합 담당자는 기존 스토어나 워크벤치 구조를 깨뜨리지 않고 아래 스니펫을 복사·연결하여 수업 프리셋, 블록 프리셋, 빈 초안 시작 옵션을 즉시 활성화할 수 있습니다.

### 4.1 `src/store/usePilatesStore.ts` 연동 제안

수업 프리셋을 현재 활성 워크벤치 시퀀스로 불러오거나, 블록 프리셋을 현재 타임라인에 삽입하거나, 빈 초안 스타터로 새 시퀀스/블록을 여는 스토어 액션 예시입니다.

```ts
import {
  BLANK_DRAFT_STARTER_OPTIONS,
  OFFLINE_BLOCK_PRESETS,
  OFFLINE_CLASS_PRESETS,
  getBlankDraftStarterById,
  getOfflineBlockPresetById,
  getOfflineClassPresetById,
} from '../data/classBlockPresets';
import {
  insertBlockPresetIntoSequence,
  instantiateClassPresetAsEditableSequence,
  startFromBlankDraftOption,
} from '../utils/classBlockPresetValidator';
import type { StartBlankDraftOptions } from '../types/classBlockPresets';

// usePilatesStore 내부 액션 추가 제안:
applyOfflineClassPreset: (presetId: string, overrides?: { targetMinutes?: number }) => {
  const preset = getOfflineClassPresetById(presetId);
  if (!preset) return null;

  const state = get();
  const { sequence, conditionTemplate } = instantiateClassPresetAsEditableSequence(
    preset,
    { targetMinutes: overrides?.targetMinutes },
    state.exercises,
  );

  set({
    activeSequenceId: sequence.id,
    activeTitle: sequence.title,
    activeSubtitle: sequence.subtitle,
    activeApparatus: sequence.apparatus,
    activeLevel: sequence.level,
    activeTargetMinutes: sequence.targetMinutes,
    activeSteps: sequence.steps,
    lastCriteria: sequence.criteriaSnapshot ?? null,
    draftCriteria: sequence.criteriaSnapshot ?? null,
    conditionTemplates: [conditionTemplate, ...state.conditionTemplates],
  });

  return sequence;
},

insertOfflineBlockPreset: (
  blockId: string,
  options?: { insertAtIndex?: number; targetDurationMin?: number },
) => {
  const blockPreset = getOfflineBlockPresetById(blockId);
  if (!blockPreset) return null;

  const state = get();
  const { steps, blockInstanceId } = insertBlockPresetIntoSequence(
    state.activeSteps,
    blockPreset,
    options,
    state.exercises,
  );

  set({ activeSteps: steps });
  return blockInstanceId;
},

startBlankDraftSession: (starterId: string, options?: StartBlankDraftOptions) => {
  const starter = getBlankDraftStarterById(starterId);
  if (!starter) return null;

  const state = get();
  const bundle = startFromBlankDraftOption(starter, options, state.exercises);

  if (bundle.sequenceDraft) {
    set({
      activeSequenceId: bundle.sequenceDraft.id,
      activeTitle: bundle.sequenceDraft.title,
      activeSubtitle: bundle.sequenceDraft.subtitle,
      activeApparatus: bundle.sequenceDraft.apparatus,
      activeLevel: bundle.sequenceDraft.level,
      activeTargetMinutes: bundle.sequenceDraft.targetMinutes,
      activeSteps: bundle.sequenceDraft.steps,
    });
  }

  return bundle;
},
```

---

### 4.2 `src/components/SequenceWorkbench.tsx` 연동 제안

워크벤치에서 시간·기구·난이도·주제별로 `OFFLINE_CLASS_PRESETS`와 `OFFLINE_BLOCK_PRESETS`를 필터링해 적용하거나, `BLANK_DRAFT_STARTER_OPTIONS`로 빈 수업을 시작하는 연결 예시입니다.

```tsx
import {
  BLANK_DRAFT_STARTER_OPTIONS,
  OFFLINE_BLOCK_PRESETS,
  OFFLINE_CLASS_PRESETS,
  PRESET_THEME_CATALOG,
} from '../data/classBlockPresets';
import {
  filterOfflineBlockPresets,
  filterOfflineClassPresets,
  insertBlockPresetIntoSequence,
  instantiateClassPresetAsEditableSequence,
  startFromBlankDraftOption,
} from '../utils/classBlockPresetValidator';

// 1) 현재 워크벤치 조건(기구·시간·난이도)에 맞는 오프라인 수업/블록 프리셋 필터링
const matchingClassPresets = filterOfflineClassPresets(OFFLINE_CLASS_PRESETS, {
  apparatus: activeApparatus,
  durationMinutes: activeTargetMinutes as 15 | 20 | 30 | 45 | 50 | 60,
  level: activeLevel,
});

const matchingBlockPresets = filterOfflineBlockPresets(OFFLINE_BLOCK_PRESETS, {
  apparatus: activeApparatus,
  level: activeLevel,
});

// 2) 수업 프리셋 선택 시 편집 가능한 복사본으로 즉시 적용 (원본 프리셋 불변 유지)
const handleSelectClassPreset = (presetId: string) => {
  const preset = OFFLINE_CLASS_PRESETS.find((item) => item.id === presetId);
  if (!preset) return;

  const { sequence } = instantiateClassPresetAsEditableSequence(
    preset,
    { targetMinutes: activeTargetMinutes },
    exercises,
  );

  setActiveSequenceMeta({
    title: sequence.title,
    subtitle: sequence.subtitle,
    apparatus: sequence.apparatus,
    level: sequence.level,
    targetMinutes: sequence.targetMinutes,
  });
  usePilatesStore.setState({ activeSteps: sequence.steps });
};

// 3) 재사용 블록 프리셋을 현재 시퀀스에 원클릭 삽입
const handleInsertBlockPreset = (blockId: string, insertAtIndex?: number) => {
  const blockPreset = OFFLINE_BLOCK_PRESETS.find((item) => item.id === blockId);
  if (!blockPreset) return;

  const { steps } = insertBlockPresetIntoSequence(
    activeSteps,
    blockPreset,
    { insertAtIndex },
    exercises,
  );
  usePilatesStore.setState({ activeSteps: steps });
};

// 4) 새 동작 창작 사용자용 빈 초안 시작 옵션(6종) 실행
const handleStartBlankDraft = (starterId: string) => {
  const starter = BLANK_DRAFT_STARTER_OPTIONS.find((item) => item.id === starterId);
  if (!starter) return;

  const bundle = startFromBlankDraftOption(
    starter,
    {
      apparatus: activeApparatus,
      level: activeLevel,
      durationMinutes: activeTargetMinutes,
    },
    exercises,
  );

  if (bundle.sequenceDraft) {
    setActiveSequenceMeta({
      title: bundle.sequenceDraft.title,
      subtitle: bundle.sequenceDraft.subtitle,
      apparatus: bundle.sequenceDraft.apparatus,
      level: bundle.sequenceDraft.level,
      targetMinutes: bundle.sequenceDraft.targetMinutes,
    });
    usePilatesStore.setState({ activeSteps: bundle.sequenceDraft.steps });
  }
  if (starter.starterKind === 'blank-movement-idea') {
    onOpenIdeaSheet?.(null);
  }
};
```

---

### 4.3 `src/components/FreeAiAssistantPanel.tsx` / `src/utils/freeAiAssistantEngine.ts` 연동 제안

P5 무료 AI 보조 패널의 `reusableBlocks` 컨텍스트(`readonly P1ReusableBlockContract[]`)에 오프라인 블록 프리셋과 강사 생성 P1 블록을 `toP5ReusableBlockContract`로 변환해 주입하는 예시입니다. 외부 AI 미설정·사용량 소진 상태에서도 20종 오프라인 검토 블록(`isReviewed: true`)을 조합해 시퀀스를 구성할 수 있습니다.

```tsx
import { OFFLINE_BLOCK_PRESETS } from '../data/classBlockPresets';
import { toP5ReusableBlockContract } from '../utils/classBlockPresetValidator';
import type { ReusableBlock } from '../types/hierarchy';
import { FreeAiAssistantPanel } from './FreeAiAssistantPanel';

// 오프라인 기본 블록 20종 + 강사가 직접 만든 P1 ReusableBlock 목록을 P5 계약으로 통합
function buildP5ReusableBlockPool(userBlocks: readonly ReusableBlock[] = []) {
  return [
    ...OFFLINE_BLOCK_PRESETS.map((preset) => toP5ReusableBlockContract(preset)),
    ...userBlocks.map((block) => toP5ReusableBlockContract(block)),
  ];
}

// FreeAiAssistantPanel 렌더링 시 reusableBlocks prop으로 전달:
<FreeAiAssistantPanel
  exercises={s.exercises}
  reusableBlocks={buildP5ReusableBlockPool(userReusableBlocks)}
  conditionTemplates={s.conditionTemplates}
  activeTargetMinutes={s.activeTargetMinutes}
  activeApparatus={s.activeApparatus}
  activeLevel={s.activeLevel}
  onApplyDraftSequence={({ title, subtitle, targetMinutes, level, apparatus, steps }) => {
    s.setActiveSequenceMeta({ title, subtitle, targetMinutes, level, apparatus });
    usePilatesStore.setState({ activeSteps: steps });
  }}
  onSaveUnreviewedMovementIdea={(exercise) => {
    s.addCustomExercise(exercise);
  }}
/>
```

---

### 4.4 `src/components/MovementIdeaSheet.tsx` 연동 제안

1줄 동작 메모 시트(`MovementIdeaSheet`) 상단에 `BLANK_DRAFT_STARTER_OPTIONS` 중 `'blank-movement-idea'` 또는 `'blank-custom-movement-showcase'` 스타터를 연결하여, 새 동작을 직접 만드는 사용자가 빈 작업 버퍼(`movementIdeaBuffer`)와 P1 `HumanMovementDraft`를 동시에 초기화할 수 있도록 돕는 예시입니다.

```tsx
import { BLANK_DRAFT_STARTER_OPTIONS } from '../data/classBlockPresets';
import { startFromBlankDraftOption } from '../utils/classBlockPresetValidator';
import { saveMovementIdeaWorkingBuffer } from '../utils/movementIdeaDraft';
import { createHumanDraftRepository } from '../utils/humanMovementCreation';

const movementStarters = BLANK_DRAFT_STARTER_OPTIONS.filter(
  (option) =>
    option.starterKind === 'blank-movement-idea' ||
    option.starterKind === 'blank-custom-movement-showcase',
);

// MovementIdeaSheet 내부에서 빈 초안 스타터 칩 클릭 시 핸들러:
const handleApplyBlankMovementStarter = (starterId: string) => {
  const starter = movementStarters.find((item) => item.id === starterId);
  if (!starter) return;

  const bundle = startFromBlankDraftOption(
    starter,
    {
      ideaLine: ideaLine.trim() || undefined,
      workingNameKo: workingTitle.trim() || undefined,
      apparatus: apparatus || starter.defaultApparatus,
      level: level || starter.defaultLevel,
      durationMinutes: Number(durationMin) || starter.defaultDurationMinutes,
    },
    exercises,
  );

  // 1) MovementIdeaSheet 작업 버퍼 동기화
  saveMovementIdeaWorkingBuffer(bundle.movementIdeaBuffer);
  setEditingId(null);
  setIdeaLine(bundle.movementIdeaBuffer.ideaLine);
  setWorkingTitle(bundle.movementIdeaBuffer.workingTitle);
  setApparatus(bundle.movementIdeaBuffer.apparatus);
  setDurationMin(bundle.movementIdeaBuffer.durationMin);
  setLevel(bundle.movementIdeaBuffer.level);

  // 2) P1 HumanMovementDraft 저장소에도 1줄 초안 즉시 보관 가능
  if (bundle.humanMovementDraft) {
    const draftRepo = createHumanDraftRepository();
    draftRepo.saveIdeaDraft({
      ideaLine: bundle.humanMovementDraft.ideaLine,
      workingNameKo: bundle.humanMovementDraft.workingNameKo,
      apparatus: bundle.humanMovementDraft.apparatus,
      level: bundle.humanMovementDraft.level,
      defaultDurationMin: bundle.humanMovementDraft.defaultDurationMin,
    });
  }
};
```
