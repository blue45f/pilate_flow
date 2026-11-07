# Track B 독립 검증 보고서 — 수업 기록 모바일 날짜 필터 사용성 마감 (Round 3 — 2026-11-07)

- **검증 대상 브랜치**: `fix/history-mobile-filter-round3-20261107`
- **검증 수행자**: Track B Independent Verifier
- **검증 일시**: `2026-11-07`
- **최종 판정**: **PASS (독립 검증 전 항목 통과)**

---

## 1. 파일 소유 경계 및 비수정 원칙 검증 (`git status` / `git diff`)

`git status --short` 및 `git diff --name-only main` 실행 결과:

- **수정/신규 파일**:
  - `M src/components/ClassBinderView.tsx`
  - `M src/components/ClassBinderView.historyFlow.test.tsx`
  - `?? src/components/ClassBinderView.css` (`ClassBinderView.tsx`에서만 import하는 전용 스타일시트)
  - `?? docs/history-mobile-filter-round3-20261107/**`
- **비수정 경계 준수 확인**:
  - 공유 스타일(`src/styles/**`): **0줄 변경**
  - 공유 스토어(`src/store/**`): **0줄 변경**
  - 데이터 스키마 및 타입(`src/schemas/**`, `src/types/**`): **0줄 변경**
  - 동작 도해/탐색/Atlas, PWA 및 타 컴포넌트: **0줄 변경**

---

## 2. 코드 정적 검증 (`ClassBinderView.tsx` & `ClassBinderView.css`)

1. **모바일/데스크톱 기본 노출 날짜 칩 한도 분리 (`ClassBinderView.tsx:82-97, 260-284`)**:
   - `MOBILE_INITIAL_VISIBLE_DATE_CHIPS = 3` (`<= 640px` 모바일 뷰포트에서 `"전체 날짜"` + 최근 `3`개 날짜 = 총 `4`개 칩 기본 노출).
   - `INITIAL_VISIBLE_DATE_CHIPS = 12` (`> 640px` 태블릿/데스크톱 뷰포트에서 `"전체 날짜"` + 최근 `12`개 날짜 = 총 `13`개 칩 기본 노출).
   - `window.innerWidth <= 640` 및 `window.matchMedia('(max-width: 640px)')` 리스너를 통해 뷰포트 전환 시 반응형 동기화 확인.
2. **날짜/기록/기능 삭제 금지 준수**:
   - 기존 수업 기록 데이터, 날짜 집계(`dateFilterOptions`), 그룹 필터, 검색 필터, 30개 단위 카드 페이지네이션, 스냅샷 상세 모달 및 재사용 기능(`copyHistoryLogIntoWorkbenchSafely`) 중 삭제되거나 축소된 기능 없음.
3. **과거 날짜 선택 후 접기 시 선택 날짜 고정 및 침묵 필터 변경 방지 (`ClassBinderView.tsx:389-413`)**:
   - `visibleDateFilterOptions`에서 `showAllDateChips === false`일 때 `effectiveSelectedDate !== 'all'`이고 최근 `3`개(`recentSlice`)에 포함되지 않은 과거 날짜가 선택되어 있으면, 해당 `selectedOption`을 접힌 칩 목록 끝에 고정(`[...recentSlice, selectedOption]`)함.
   - 따라서 사용자가 과거 날짜를 선택한 뒤 `날짜 접기`를 눌러도 **선택한 날짜 칩이 화면에서 사라지지 않으며(`aria-pressed="true"` 유지), 활성 날짜 필터(`effectiveSelectedDate`)나 하단 기록 카드 목록이 침묵 중에 바뀌지 않음**.
4. **`44px` 최소 터치 타깃, 키보드 탐색, 포커스 복귀 검증**:
   - **터치 타깃(`ClassBinderView.css:16-43, 133-164`)**: `.teaching-date-chip`, `.teaching-date-more-toggle`, `.teaching-date-reset` 및 그룹 필터 탭에 `min-height: 44px; min-width: 44px; box-sizing: border-box`가 적용되어 전 뷰포트에서 최소 터치 타깃 `44×44px` 이상 보장.
   - **키보드 탐색(`ClassBinderView.tsx:952-977`)**: `.teaching-date-nav` 그룹 내 `ArrowRight`, `ArrowDown`(다음 칩), `ArrowLeft`, `ArrowUp`(이전 칩), `Home`(첫 칩), `End`(마지막 칩) 순환 포커스 이동 지원.
   - **포커스 복귀(`ClassBinderView.tsx:255-257, 1016-1022, 1033-1037, 1242-1245, 1374-1380, 1559-1565`)**:
     - `dateMoreToggleRef`: `이전 날짜 더보기 (+N일)` ↔ `날짜 접기` 토글 클릭 시 토글 버튼에 포커스 유지.
     - `allDatesChipRef`: 조건부 렌더링되는 `전체 날짜 보기` 리셋 버튼 클릭 시 언마운트 직후 `"전체 날짜"` 칩으로 포커스 복귀.
     - `reopenedTriggerRef`: 카드의 `이력 다시 열기` 클릭 시 트리거 버튼을 저장하고, 상세 모달(`LightDismissDialog`) 닫기(`Escape` 또는 `닫기` 버튼) 시 원래 트리거 버튼으로 포커스 복귀.

---

## 3. 독립 명령 실행 검증 결과 (`tsc` / `eslint` / `vitest`)

| 검증 명령 | 실행 결과 | 비고 |
| :--- | :---: | :--- |
| `npx tsc -b` | **PASS (`exit 0`)** | 타입 오류 0건 |
| `npx eslint src/components/ClassBinderView.tsx src/components/ClassBinderView.historyFlow.test.tsx` | **PASS (`exit 0`)** | 린트 경고/오류 0건 |
| `TZ=UTC npx vitest run src/components/ClassBinderView.historyFlow.test.tsx src/components/ClassBinderView.scaleAudit.test.tsx` | **PASS (`8 passed`)** | `UTC` 정오/자정/날짜 그룹핑/모바일 390px 회귀 통과 |
| `TZ=Asia/Seoul npx vitest run src/components/ClassBinderView.historyFlow.test.tsx src/components/ClassBinderView.scaleAudit.test.tsx` | **PASS (`8 passed`)** | `KST` 정오/자정/날짜 그룹핑/모바일 390px 회귀 통과 |
| `TZ=UTC` & `TZ=Asia/Seoul npx vitest run src/components/ClassBinderView.historyFlow.test.tsx src/components/ClassBinderView.storageStatus.test.tsx` | **PASS (`26 passed`)** | `ClassBinderView` 전체 단위 테스트 스위트 통과 |

---

## 4. 실측 메트릭(`round3-mobile-filter-metrics.json`) 독립 대조 결과

[`docs/history-mobile-filter-round3-20261107/evidence/round3-mobile-filter-metrics.json`](./evidence/round3-mobile-filter-metrics.json) 원시 데이터를 검증한 결과:

1. **`1,000`건 수업 기록 · `Mobile 390px` (`390×844`) 레이아웃 지표**:
   - `dateChipCount`: **`4`** (`"전체 날짜"` + 최근 `3`일, 토글 텍스트 `"이전 날짜 더보기 (+330일)"`)
   - `dateNavHeightPx`: **`156`px** (`cc718b0`의 `606px` 대비 **`-74.3%` 감소**, 뷰포트 대비 비율 `0.18`)
   - `firstCardTopPx`: **`812`px** (초기 `844px` 모바일 뷰포트 내부에 `0`클릭으로 첫 번째 수업 기록 카드 상단이 즉시 노출됨; `cc718b0`의 `1,364px` 대비 `-552px` 단축)
   - `allTouchTargetsAtLeast44Px`: **`true`** (`touchTargetMinHeightPx = 44`, `touchTargetMinWidthPx = 157`)
   - `docOverflowPx`: **`0`**, `maxCardOverflowPx`: **`0`** (가로 스크롤/넘침 0px)
2. **`mobile390Workflow` (`100`건 & `1,000`건 공통) 인터랙션 검증 지표**:
   - `clicksToSeeFirstCard`: **`0`**
   - `clicksToSelectRecentDate`: **`1`**
   - `clicksToSelectAnyOlderDate`: **`2`** (`이전 날짜 더보기` 1회 + 과거 날짜 칩 1회)
   - `expandedDateNavHeightPx`: **`298`px** (`334`개 칩 펼침 시에도 내부 스크롤로 `298px` 이하 유지)
   - `pinnedOlderDateVisibleWhenCollapsed`: **`true`** (`collapsedChipCountWithPinnedOlderDate = 5`, `pinnedOlderDatePressed = true`)
   - `filterUnchangedAfterCollapse`: **`true`**
   - `focusRetainedOnExpand`: **`true`**
   - `focusRetainedOnCollapse`: **`true`**
   - `focusReturnedToAllDatesChip`: **`true`**
   - `focusReturnedToReopenTrigger`: **`true`**
