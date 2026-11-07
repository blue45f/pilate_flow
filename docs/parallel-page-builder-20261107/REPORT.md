# Pilates 시퀀스 빌더 (동작 추가·블록 조합·순서변경 UI) 완성 및 독립 검증 보고서

- **검증 일자**: 2026-11-07
- **소유 범위**: 시퀀스 빌더 로컬 컴포넌트 및 스타일만 소유
  - [`src/components/SequenceWorkbench.tsx`](../../src/components/SequenceWorkbench.tsx)
  - [`src/components/SequenceWorkbench.classSection.test.tsx`](../../src/components/SequenceWorkbench.classSection.test.tsx)
  - [`src/components/OfflinePresetPicker.tsx`](../../src/components/OfflinePresetPicker.tsx)
  - [`src/components/OfflinePresetPicker.test.tsx`](../../src/components/OfflinePresetPicker.test.tsx)
  - [`src/utils/sequenceDrag.ts`](../../src/utils/sequenceDrag.ts)
  - [`src/styles/sequence-drag.css`](../../src/styles/sequence-drag.css)
  - [`src/styles/sequence-composition.css`](../../src/styles/sequence-composition.css)
- **무변경 경계(Forbidden Boundaries) 준수 확인**:
  - 시간 계산(`stepTimeEstimate.ts`, `sequenceEngine.ts`, `sequenceSimulation.ts`) **0줄 수정**
  - 도해(`MotionFigure.tsx`, `PilatesMotionGraphic.tsx` 등) **0줄 수정**
  - 다른 페이지(`ExerciseAtlasView.tsx`, `ClassBinderView.tsx`, `InstructorScheduleView.tsx`, `LiveStageView.tsx`) **0줄 수정**
  - 공유 스토어 및 라우트(`src/store/usePilatesStore.ts`, `src/App.tsx`, `src/main.tsx`, `src/utils/movementIdeaDraft.ts`, `src/utils/hierarchyModel.ts`) **0줄 수정**
  - 공유 테마·토큰·설정(`src/styles/design-tokens.css`, `src/styles/studio.css`, `src/styles/responsive-studio.css`, `vite.config.ts`, `package.json`) **0줄 수정**

---

## 1. 기존 구현 재사용 및 미완/결함 해결 요약

| 영역 | 기존 `main` 구현 상태 (보존) | 이번 빌더 로컬 패치로 완성·해결한 항목 |
| --- | --- | --- |
| **1. 드래그 실제 이동감 / 자리 표시 / 취소 / 키보드 대체 / 모바일 스크롤 충돌** | `.sequence-drag-overlay`(포인터 추종 카드), `.sequence-drop-indicator`(`N번째 위치` 점선 슬롯), `8px` 이동 임계값, `Escape`·`pointercancel`·`blur`·영역 밖 드롭 취소, `#order-handle-{stepId}` `ArrowUp`/`ArrowDown` 및 `위로`/`아래`/`빼기` 버튼, 핸들 전용 `touch-action: none` | **1) 섹션 경계 드래그 시 이동량 과대 계산 및 섹션 헤더 침범 해결 (`DEF-B02`)**: [`src/utils/sequenceDrag.ts`](../../src/utils/sequenceDrag.ts)에서 카드 간격(`gap`)을 섹션 헤더가 포함된 교차 섹션 간격(`79px`) 대신 동일 섹션 내부 인접 카드 간격(`18px`)으로 산출하고, 섹션의 첫 카드가 이동할 때 해당 `.pf-sequence-block__header`도 함께 이동·복원되도록 동기화하여 `overlapsMainSectionHeader = false` 달성 (`crossSectionGapPx = 32px`, `normalIntraSectionGapPx = 18px`, 차이 `14px <= 24px`).<br>**2) 섹션 경계 순서 변경 시 동일 섹션 헤더(`본운동`) 중복 쪼개짐 해결 (`DEF-B01`)**: [`src/components/SequenceWorkbench.tsx`](../../src/components/SequenceWorkbench.tsx)에서 스토어 변이 없이 비휴식 동작 구간의 단조 순서(`준비 → 본운동 → 마무리`)를 유지해 드롭 후에도 항상 3개 정규 구간(`sectionCountAfterDrop = 3`)으로 렌더링. |
| **2. 동작 추가 & 쉬운 기본화면 + 고급 접기** | 빈 화면 `.workbench-welcome`의 `동작 고르기` / `한 줄 아이디어 메모`, 온디맨드 `InlineExerciseFinder` 모달, `시간 구성` / `편집 방식` `<details>` 접기 | **1) 시퀀스 상단 `한 줄 동작 메모` 빠른 진입 버튼 추가 (`DEF-C01`)**: 시퀀스에 동작이 있을 때(`activeSteps.length > 0`) 최하단(`3.61` 화면 아래)까지 스크롤하지 않아도 즉시 새 동작을 적을 수 있도록 `.sequence-tools`(`동작 더 담기` 옆)에 `한 줄 동작 메모` 버튼을 배치 (`390×844` 기준 `y = 422px`, **`0.50` 화면**).<br>**2) `.pf-workbench-ideas` 조건부 접기(`쉬운 기본화면 + 고급 접기`)**: 시퀀스가 비어 있을 때는 펼쳐 두고, 시퀀스에 동작이 있을 때는 `.pf-workbench-ideas__details`를 기본 접힘(`저장한 새 동작 메모 N개 보기`)으로 전환하여 첫 시퀀스 카드 위치를 `390×844`에서 `1155px → 654px`(**`0.77` 화면**), `320×568`에서 `1174px → 740px`(**`1.30` 화면**)으로 끌어올림. |
| **3. 블록 조합 UI 완성 & 새로고침 보존** | `MovementIdeaSheet` 내 블록 생성 및 `OfflinePresetPicker`의 정적 프리셋(`수업 전체`, `연계 동작 묶음`) | **1) 빌더 인라인 `<details className="workbench-block-combo-details">` (`블록 조합`) 고급 접기 추가**: 평소에는 접혀 있어 기본 화면을 단순하게 유지하고, 펼치면 현재 시퀀스 동작들을 이름을 붙여 `ReusableBlock`으로 즉시 묶어 저장(`현재 동작 묶어 블록 저장`)하거나 저장된 재사용 블록을 `수업에 블록 넣기`로 바로 삽입 가능.<br>**2) [`OfflinePresetPicker.tsx`](../../src/components/OfflinePresetPicker.tsx)에 `내 재사용 블록` 탭 추가**: 정적 프리셋과 동일한 미리보기·추가/교체 흐름으로 내 재사용 블록을 조합 가능.<br>**3) 블록 삽입 후 저장·새로고침 유실 방지 (`DEF-A03` / `C1-02`)**: 공유 스토어를 수정하지 않고 [`SequenceWorkbench.tsx`](../../src/components/SequenceWorkbench.tsx) 로컬에서 `selectedLayer` 누락 스텝을 `'standard'`로 정규화하여 새로고침 후에도 수업 시퀀스가 100% 유지됨(`cardCountAfterReload = 3`). |
| **4. `320px`/`390px`/`768px`/`1440px` & `200%` 확대 반응형 리플로우** | `100%` 배율에서 가로 오버플로우 `0px` | **`320px`·`390px` `200%` 확대 시 가로 오버플로우(`scrollWidth = 640px`) 해결 (`DEF-C02`)**: [`src/styles/sequence-composition.css`](../../src/styles/sequence-composition.css)에서 빌더 마운트 시 `html:has(#root .vnext-workbench), body:has(#root .vnext-workbench) { min-width: 0; overflow-x: clip; }`를 적용하여 `320px`/`390px`/`768px`/`1440px`의 `100%` 및 `200%` 확대 전 구간에서 `overflowPx = 0` 달성. |

---

## 2. 실제 브라우저(Headless Chromium) 검증 결과

### 2.1 Track B — 드래그·자리 표시·취소·키보드 대체·모바일 스크롤 충돌·섹션 경계 순서 변경 (`7/7 PASS`, 결함 `0건`)

증거 데이터: [`track-b-results.json`](./track-b-results.json)

| ID | 검증 항목 | 결과 | 핵심 측정치 |
| --- | --- | --- | --- |
| `B1-01` | 키보드 `ArrowUp`/`ArrowDown` 순서 변경, 포커스 유지(`#order-handle-{stepId}`), 최상단 경계 방어 | **PASS** | `activeAfterUp = "order-handle-s-2"`, `upButtonDisabledAtTop = true` |
| `B2-01` | 모바일 터치 포인터 드래그 `8px` 임계값(`4px`에서 미작동), `.sequence-drag-overlay` + `.sequence-drop-indicator` 노출 및 드롭 반영 | **PASS** | `draggingAt4px = false`, `hasOverlay = true`, `indicatorText = "3번째 위치"` |
| `B3-01` | 드래그 취소 4종(`Escape`, `pointercancel`, 영역 밖 드롭, `window.blur`) 시 원래 순서 100% 복원 | **PASS** | `escRestored = true`, `pcRestored = true`, `oobRestored = true`, `blurRestored = true` |
| `B4-01` | 잠긴 스텝(`locked = true`) 통과 차단 및 안내(`잠긴 항목을 넘을 수 없어요`) | **PASS** | `overlayBlocked = "true"`, `indicatorHidden = true` |
| `B5-01` | 하단 가장자리 정지 홀드 시 `requestAnimationFrame` 자동 스크롤 | **PASS** | `scrollDeltaPx = +280px` (`593px → 873px`) |
| `B6-01` | 섹션 경계 넘어 드롭 후 `sectionRuns` 중복 분리 방지 | **PASS** | `sectionCountAfterDrop = 3` (`warmup → main → cooldown`) |
| `B6-02` | 섹션 헤더 경계 드래그 시 내부 카드 간격 이동 및 섹션 헤더 침범 방지 | **PASS** | `crossSectionGapPx = 32px`, `normalIntraSectionGapPx = 18px`, `overlapsMainSectionHeader = false` |

### 2.2 Track C — `320px`/`390px`/`768px`/`1440px` & `200%` 확대, 동작 추가·블록 조합·저장·재열기 및 화면 밀도 (`5/5 PASS`, 결함 `0건`)

증거 데이터: [`track-c-results.json`](./track-c-results.json)

| 뷰포트 / 배율 | `scrollWidth` / `clientWidth` | `overflowPx` | `.pf-workbench-ideas` 높이 | 첫 시퀀스 카드 `top` (`px`) | 첫 카드까지 화면 수 (`screens`) | 판정 |
| --- | --- | --- | --- | --- | --- | --- |
| `320×568 @ 100%` | `320 / 320` | **`0px`** | `146px` (기존 `607px`) | `740px` (기존 `1174px`) | **`1.30`** (`<= 1.8`) | **PASS** |
| `390×844 @ 100%` | `390 / 390` | **`0px`** | `112px` (기존 `588px`) | `654px` (기존 `1155px`) | **`0.77`** (`<= 1.5`) | **PASS** |
| `768×1024 @ 100%` | `768 / 768` | **`0px`** | `112px` | `635px` | **`0.62`** | **PASS** |
| `1440×900 @ 100%` | `1425 / 1425` | **`0px`** | `112px` | `646px` | **`0.72`** | **PASS** |
| `320×568 @ 200%` | `320 / 320` | **`0px`** (기존 `320px`) | `466px` | `2446px` | `4.31` | **PASS** |
| `390×844 @ 200%` | `390 / 390` | **`0px`** (기존 `250px`) | `366px` | `1804px` | `2.14` | **PASS** |
| `768×1024 @ 200%` | `768 / 768` | **`0px`** | `224px` | `1350px` | `1.32` | **PASS** |
| `1440×900 @ 200%` | `1425 / 1425` | **`0px`** | `224px` | `1270px` | `1.41` | **PASS** |

- **새 동작 추가 상단 진입성 (`activeSteps > 0`, `ideaExercises === 0`)**: `390×844` 기준 `y = 422px` (**`0.50` 화면**, 기존 `3050px` / `3.61` 화면) — **PASS**
- **재사용 블록 조합 후 저장·브라우저 새로고침 보존 (`C1-02`)**: `expectedCardCountAfterReload = 3`, `actualCardCountAfterReload = 3` — **PASS**

---

## 3. 스크린샷 증거 (`docs/parallel-page-builder-20261107/screenshots/`)

- 드래그 시각 피드백: [`screenshots/track-b-01-active-drag-visual-feedback.png`](./screenshots/track-b-01-active-drag-visual-feedback.png)
- 드래그 취소 복원: [`screenshots/track-b-02-after-cancel-restored.png`](./screenshots/track-b-02-after-cancel-restored.png)
- 잠금 스텝 통과 차단: [`screenshots/track-b-03-locked-barrier-blocked.png`](./screenshots/track-b-03-locked-barrier-blocked.png)
- 섹션 경계 드롭 후 3구간 유지: [`screenshots/track-b-04-section-header-fragmentation.png`](./screenshots/track-b-04-section-header-fragmentation.png)
- 모바일 `320px @ 100%`: [`screenshots/track-c-workbench-320-100.png`](./screenshots/track-c-workbench-320-100.png)
- 모바일 `390px @ 100%`: [`screenshots/track-c-workbench-390-100.png`](./screenshots/track-c-workbench-390-100.png)
- 태블릿 `768px @ 100%`: [`screenshots/track-c-workbench-768-100.png`](./screenshots/track-c-workbench-768-100.png)
- 데스크톱 `1440px @ 100%`: [`screenshots/track-c-workbench-1440-100.png`](./screenshots/track-c-workbench-1440-100.png)
- 모바일 `320px @ 200%`: [`screenshots/track-c-workbench-320-200.png`](./screenshots/track-c-workbench-320-200.png)
- 모바일 `390px @ 200%`: [`screenshots/track-c-workbench-390-200.png`](./screenshots/track-c-workbench-390-200.png)
- 태블릿 `768px @ 200%`: [`screenshots/track-c-workbench-768-200.png`](./screenshots/track-c-workbench-768-200.png)
- 데스크톱 `1440px @ 200%`: [`screenshots/track-c-workbench-1440-200.png`](./screenshots/track-c-workbench-1440-200.png)
