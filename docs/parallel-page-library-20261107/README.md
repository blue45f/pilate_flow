# Pilates 동작 라이브러리(`ExerciseAtlasView`) 시각 탐색 개선 전후 증거 (2026-11-07)

## 1. 작업 범위 및 소유 경계 (Ownership Boundary)

- **독립 작업 브랜치**: `feat/parallel-page-library-20261107` (기준 `main`: `3bf7978`)
- **소유 및 수정 파일 (목록 페이지 로컬 파일에 한정)**:
  - `src/components/ExerciseAtlasView.tsx`
  - `src/components/ExerciseAtlasView.addFeedback.test.tsx`
  - `src/styles/library.css`
  - `src/styles/motion-library.css`
  - `docs/parallel-page-library-20261107/**` (`README.md`, `before/*`, `after/*`)
- **비소유 보호 확인**:
  - 공유 라우트(`src/App.tsx`), 공유 스토어(`src/store/**`), 도해/카탈로그 데이터(`src/data/**`, `src/models/**`), 상세 모달(`src/components/YouTubeClipModal.tsx`), 공통 디자인 토큰(`src/styles/design-tokens.css`)은 **0건 수정**으로 완벽히 보존했습니다.

---

## 2. 7대 시각 탐색 개선 요약 (Track A 구현)

| 구분 | 수정 전 (Before) | 수정 후 (After) | 핵심 코드 위치 |
|---|---|---|---|
| **1. 한글 검색** | • `VerifiedReferencesSection`이 단순 공백 분리(`split(/\s+/)`)만 수행해 붙여쓴 한글·NFD 자모 검색 실패 및 검색어 지우기 버튼 부재<br>• 동작 노트 검색이 소도구 한글명(`써클링`, `폼롤러`), 난이도(`기초`, `중급`, `심화`), 구간명, 한 줄 메모 필드를 누락 | • `VerifiedReferencesSection`에 `matchesDiscoverySearch` 적용 및 `공개 자료 검색어 지우기` 아이콘 버튼 추가<br>• 동작 노트 검색 필드에 기구·소도구 한글명, 난이도, 구간명/요약, 즐겨찾기 분류, 한 줄 동작 메모(`ideaLine`, `subjectiveFeeling`, `adjustmentNote`) 확장 반영 | `src/components/ExerciseAtlasView.tsx:480-493`, `564-572`, `833-860`, `1150` |
| **2. 필터** | • 모바일(`<= 760px`)에서 `.library-apparatus-tabs`(`전체 기구`, `매트`, `리포머`, `체어`, `캐딜락`, `즐겨찾기`)가 `display: none`으로 숨겨져 기구 빠른 탐색 불가<br>• 현재 적용된 필터/검색 조건을 한눈에 보고 개별 해제할 칩 바 부재<br>• `동작 노트 더 보기` 클릭 시 키보드 초점 이동 없음 | • 모바일(`320px`, `390px`)에서도 `.library-apparatus-tabs`를 상시 노출(`display: flex; flex-wrap: wrap;`)<br>• 활성 검색·필터를 보여주는 `.library-active-filters`(`role="group" aria-label="적용된 검색·필터"`) 칩 바 및 개별 해제 버튼 추가<br>• `동작 노트 더 보기` 클릭 시 새로 열린 첫 카드 제목 버튼으로 초점 이동 | `src/components/ExerciseAtlasView.tsx:881-986`, `1206-1221`, `1823-1841`<br>`src/styles/motion-library.css:341-366`, `761-769` |
| **3. 태그** | • 초기 98개 동작 노트가 모두 `approved === false`여서 카드 타겟 영역(`.movement-target`)이 실제 근육 태그 대신 `'미검수 입력값 · 검토할 계획 자료'` 문구만 100% 반복 표시 | • 모든 카드에 실제 `exercise.targetMuscles` 요약, 자세 배지(`.movement-position-badge`), 필수 소도구 배지(`.movement-prop-badge`)를 표시하고, 클릭 시 즉시 해당 부위로 필터링/토글되는 `#타겟부위` 태그(`.movement-focus-tag`) 제공<br>• `<PfAiStatusBadge>`(`'미검토 자료 · 검토 기록은 선택'`)는 그대로 유지 | `src/components/ExerciseAtlasView.tsx:1647-1720`<br>`src/styles/motion-library.css:465-496` |
| **4. 검색결과 없음** | • `.library-empty`에 현재 어떤 검색어·필터 조건이 적용 중인지 표시되지 않고, 검색어만 빠르게 비우는 `검색어 지우기` 액션이 없음 | • `.library-empty` 및 `.verified-reference-empty`에 `role="status" aria-live="polite"` 적용, 활성 검색어·필터 개수 요약 배지(`.library-empty-context`) 표시, `검색어 지우기` + `전체 동작 보기` + `참조 추가` 줄바꿈(`flex-wrap: wrap`) 지원 | `src/components/ExerciseAtlasView.tsx:718-731`, `1788-1816`<br>`src/styles/library.css:490-538` |
| **5. 긴 제목** | • `.movement-english`와 `.movement-target`에 `white-space: nowrap; text-overflow: ellipsis;`가 강제되어 긴 영문명·타겟 설명이 한 줄에서 잘림 | • `.movement-card h2 button`, `.movement-english`, `.movement-target`, `.ml-pattern-tile strong`, `.ml-card-patterns button`에 `white-space: normal; word-break: keep-all; overflow-wrap: anywhere;` 적용 및 `<= 380px` 1열 카드 그리드 전환 | `src/styles/library.css:382-418`<br>`src/styles/motion-library.css:175-183`, `563-582`, `873-875` |
| **6. 선택 상태** | • 수업안에 담긴 동작(`activeSteps`)이 카드에서 시각적으로 구분되지 않음<br>• 모션 패턴 타일(`.ml-pattern-tile`)과 카드 내 패턴 버튼(`.ml-card-patterns button`)에 `aria-pressed` 및 선택 강조 스타일 없음 | • 수업안에 포함된 동작 카드에 `selected={inSequence}`, `.is-in-sequence`, `수업안 포함` 배지(`.movement-selected-badge`) 표시(기존 `.movement-add` 버튼의 `aria-label` 및 텍스트 계약 100% 보존)<br>• 활성 패턴 타일·패턴 버튼에 `aria-pressed` 및 `.is-selected` 적용, 하단 복귀 바(`.ml-selection-return`)에 `data-has-selection` 강조 적용 | `src/components/ExerciseAtlasView.tsx:1396-1407`, `1543-1563`, `1639-1643`, `1739-1749`, `1931`<br>`src/styles/motion-library.css:196-206`, `376-380`, `589-594`, `651-655` |
| **7. 이미지 fallback** | • 도해 미연결 77개 카드가 기구·자세·타겟 구분 없이 동일한 문구만 표시<br>• 한 줄 메모 사진(`ideaMeta.photoDataUrl`) 렌더링 및 이미지 로드 실패(`onError`) fallback 부재<br>• `.motion-library .movement-card-art`가 기구별 배경 틴트를 단일 색상(`#efeee4`)으로 덮어씀 | • `.ml-unmapped-art`(`aria-hidden="true"`, `svg[role="img"]` 및 `.movement-art` 미사용 계약 유지)에 기구·자세 요약(`.ml-unmapped-meta`, 예: `매트 · 수파인`)과 타겟 포커스(`.ml-unmapped-focus`, 예: `골반저 · 복횡근`) 표시<br>• `ideaMeta.photoDataUrl` 이미지 표시 및 `onError` 시 `.ml-unmapped-art` 자동 전환<br>• 매트·리포머·캐딜락·체어·바렐 기구별 카드 아트워크 배경 틴트 복원 | `src/components/ExerciseAtlasView.tsx:772`, `1547-1549`, `1582-1611`<br>`src/styles/motion-library.css:389-410`, `502-548` |

---

## 3. 실제 브라우저 반응형·확대 전후 측정 비교 (Track B 검증)

헤드리스 Chromium 브라우저에서 `320px`, `390px`, `768px`, `1440px`, `200%` 확대 뷰포트를 실제로 렌더링하여 수집한 측정치(`before/before-metrics.json` vs `after/after-metrics.json`)입니다.

| 뷰포트 | 가로 스크롤 오버플로 (`hasHorizontalOverflow`) | 모바일 기구 탭 노출 (`apparatusTabsVisible`) | `'미검수 입력값'` 플레이스홀더 카드 수 (`placeholderTargetCount`) | 실제 타겟 근육 태그 노출 카드 수 (`realMuscleTagCount`) | 영문 제목·타겟 줄바꿈 (`englishWhiteSpace` / `targetWhiteSpace`) | 기구별 아트워크 배경색 수 (`distinctCardArtBackgrounds`) |
|---|---|---|---|---|---|---|
| **320px (Before → After)** | `false` → `false` (`320 / 320`) | `false` → **`true`** | `12` → **`0`** | `0` → **`12`** | `nowrap` → **`normal`** | `5` → **`5`** |
| **390px (Before → After)** | `false` → `false` (`390 / 390`) | `false` → **`true`** | `12` → **`0`** | `0` → **`12`** | `nowrap` → **`normal`** | `5` → **`5`** |
| **768px (Before → After)** | `false` → `false` (`768 / 768`) | `true` → **`true`** | `12` → **`0`** | `0` → **`12`** | `nowrap` → **`normal`** | `5` → **`5`** |
| **1440px (Before → After)** | `false` → `false` (`1440 / 1440`) | `true` → **`true`** | `12` → **`0`** | `0` → **`12`** | `nowrap` → **`normal`** | `5` → **`5`** |
| **200% 확대 (Before → After)** | `false` → `false` (`1280 / 1280`) | `true` → **`true`** | `12` → **`0`** | `0` → **`12`** | `nowrap` → **`normal`** | `5` → **`5`** |

### 기능 프로브 전후 비교 (`functionalProbes`)

- **모션 패턴 타일 선택 상태 (`patternResult`)**:
  - Before: `ariaPressed: null`, `hasSelectedClass: false`
  - After: `ariaPressed: "true"`, `hasSelectedClass: true`, `previewRegionOpen: true`
- **소도구 한글 검색 (`propSearchCount`, 검색어 `'써클링'`)**:
  - Before: `2`건 (설명문에 우연히 포함된 항목만 매칭)
  - After: **`3`건** (`requiredProps`에 `magic-circle`이 지정된 모든 동작 정확히 매칭)
- **검색결과 없음 상태 (`emptyStateProbe`)**:
  - Before: `hasClearSearchBtn: false`, 검색어 문맥 미표시
  - After: **`hasClearSearchBtn: true`** (`검색어 지우기` + `전체 동작 보기` + `참조 추가`), 활성 검색어 문맥 배지 표시

---

## 4. 전후 스크린샷 및 메트릭 아티팩트 목록

- **Before (`docs/parallel-page-library-20261107/before/`)**:
  - `before-metrics.json`
  - `before-320.png`, `before-390.png`, `before-768.png`, `before-1440.png`, `before-zoom200.png`, `before-empty-state.png`
- **After (`docs/parallel-page-library-20261107/after/`)**:
  - `after-metrics.json`
  - `after-320.png`, `after-390.png`, `after-768.png`, `after-1440.png`, `after-zoom200.png`, `after-empty-state.png`
