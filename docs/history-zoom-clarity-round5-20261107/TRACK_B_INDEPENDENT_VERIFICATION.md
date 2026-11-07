# Track B 독립 검증 보고서 (`Round 5`: 수업 기록 200% 확대 가독성 및 날짜·그룹 점진 공개)

- **검증 일시**: `2026-11-07`
- **검증 브랜치**: `fix/history-zoom-clarity-round5-20261107`
- **검증 역할**: Track B Independent Verifier (`src/**` 무수정 독립 검증)
- **최종 판정**: **PASS**

---

## 1. Git 변경 범위 및 파일 줄 수 (`wc -l`) 독립 검증

### 1.1 소유 파일 변경 범위 및 800줄 제한 검증

| 파일 경로 | 상태 | 줄 수 (`wc -l`) | 800줄 상한 충족 | 비고 |
| :--- | :---: | ---: | :---: | :--- |
| [`src/components/ClassBinderView.tsx`](file:///home/antigravity/blue45f/pilate_flow/src/components/ClassBinderView.tsx) | Modified (`M`) | `798` | **PASS** (`<= 800`) | 그룹·날짜 전 뷰포트 점진 공개 및 `Escape` 포커스 복귀 |
| [`src/components/ClassBinderView.css`](file:///home/antigravity/blue45f/pilate_flow/src/components/ClassBinderView.css) | Modified (`M`) | `625` | **PASS** (`<= 800`) | 컨테이너 쿼리(`history-collection`) 및 2열 압축 카드 레이아웃 |
| [`src/components/ClassBinderView.historyFlow.test.tsx`](file:///home/antigravity/blue45f/pilate_flow/src/components/ClassBinderView.historyFlow.test.tsx) | Modified (`M`) | `627` | **PASS** (`<= 800`) | Round 5 점진 공개·`Escape`·1,000건 스케일·시간 계약 단위 테스트 |
| [`docs/history-zoom-clarity-round5-20261107/README.md`](file:///home/antigravity/blue45f/pilate_flow/docs/history-zoom-clarity-round5-20261107/README.md) | Untracked (`??`) | `90` | **PASS** (`<= 800`) | Round 5 설계 및 실측 요약 문서 |
| [`docs/history-zoom-clarity-round5-20261107/verify-history-zoom-round5.mjs`](file:///home/antigravity/blue45f/pilate_flow/docs/history-zoom-clarity-round5-20261107/verify-history-zoom-round5.mjs) | Untracked (`??`) | `510` | **PASS** (`<= 800`) | Headless Chromium CDP 실측 검증 스크립트 |
| [`docs/history-zoom-clarity-round5-20261107/evidence/round5-zoom-clarity-metrics.json`](file:///home/antigravity/blue45f/pilate_flow/docs/history-zoom-clarity-round5-20261107/evidence/round5-zoom-clarity-metrics.json) | Untracked (`??`) | `365` | **PASS** (`<= 800`) | 4개 뷰포트 × 2개 배율 + 1,000건/키보드 원시 측정 JSON |

### 1.2 비수정 보호 대상 (`0` diff) 검증

`git status --short` 및 `git diff --stat HEAD` 확인 결과 아래 보호 대상 파일은 수정이 전혀 없음을 확인했습니다 (`0` diff):
- `src/components/LogSessionModal.tsx`
- `src/App.tsx`
- 공유 스토어 (`src/store/**`)
- 스키마 및 타입 (`src/schemas/**`, `src/types/**`)
- 라우트 및 빌더 (`SequenceWorkbench`, `SequenceOrderCard`)
- 전역 CSS (`src/styles/**`)

---

## 2. 정적 분석 및 단위 테스트 (`UTC` / `Asia/Seoul`) 검증

1. **TypeScript (`npx tsc -b`)**:
   - 종료 코드 `0` (컴파일 및 타입 오류 `0`건).
2. **ESLint (`npx eslint src/components/ClassBinderView.tsx src/components/ClassBinderView.historyFlow.test.tsx`)**:
   - 종료 코드 `0` (경고 및 오류 `0`건).
3. **Vitest 단위 테스트 (`TZ=UTC` 및 `TZ=Asia/Seoul`)**:
   - 실행 대상: [`src/components/ClassBinderView.historyFlow.test.tsx`](file:///home/antigravity/blue45f/pilate_flow/src/components/ClassBinderView.historyFlow.test.tsx) (`10`개 테스트), `src/components/ClassBinderView.storageStatus.test.tsx` (`18`개 테스트)
   - `TZ=UTC`: **2개 테스트 파일, 28개 테스트 전원 통과 (`28/28 PASS`)**
   - `TZ=Asia/Seoul`: **2개 테스트 파일, 28개 테스트 전원 통과 (`28/28 PASS`)**

---

## 3. 실브라우저 (`320×694`, `390×844`, `768×1024`, `1440×900` @ `100%` / `200%`) 및 스크린샷 검증

[`round5-zoom-clarity-metrics.json`](file:///home/antigravity/blue45f/pilate_flow/docs/history-zoom-clarity-round5-20261107/evidence/round5-zoom-clarity-metrics.json) 및 `docs/history-zoom-clarity-round5-20261107/evidence/screenshots/` 내 8장의 PNG 스크린샷을 직접 대조 검증했습니다.

### 3.1 뷰포트·배율별 실측 지표 비교표 (Round 4 대비 Round 5)

| 뷰포트 및 배율 | 그룹/날짜 초기 노출 수 | 그룹+날짜 필터 높이 (`R4 -> R5`) | 첫 카드 `top` (`R4 -> R5`) | 첫 카드 가시 높이 (`R4 -> R5`) | 재사용 버튼 도달 필요 스크롤 (`R4 -> R5`) | 스크롤 없이 날짜 / 제목 / `이 수업 다시 계획` 가시 | 최소 글자 / 최소 터치 높이 |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **`320×694 @ 100%`** | 그룹 `3` + 날짜 `4` | `46+46px -> 44+44px` (`-4px`) | `304px -> 271px` (**`-33px`**) | `328px -> 156px` (전체 노출) | `0px -> 0px` (`0px`) | `true` / `true` / **`true`** | `12px` / `44px` |
| **`320×694 @ 200%`** | 그룹 `3` + 날짜 `4` | `92+92px -> 88+88px` (`-8px`) | `608px -> 542px` (**`-66px`**) | `24px -> 152px` (**`+128px`**) | `562px -> 150px` (**`-412px`, `-73.3%`**) | `true` / `true` / `false` (`150px` 스크롤) | `12px` / `88px` |
| **`390×844 @ 100%`** | 그룹 `3` + 날짜 `4` | `46+46px -> 44+44px` (`-4px`) | `304px -> 271px` (**`-33px`**) | `478px -> 156px` (전체 노출) | `0px -> 0px` (`0px`) | `true` / `true` / **`true`** | `12px` / `44px` |
| **`390×844 @ 200%`** | 그룹 `3` + 날짜 `4` | `92+92px -> 88+88px` (`-8px`) | `608px -> 542px` (**`-66px`**) | `174px -> 302px` (**`+128px`**) | `412px -> 0px` (**`-412px`, `-100%`**) | `true` / `true` / **`true`** | `12px` / `88px` |
| **`768×1024 @ 100%`** | 그룹 `3` + 날짜 `4` | `45+147px -> 44+44px` (**`-104px`**) | `356px -> 273px` (**`-83px`**) | `606px -> 156px` (전체 노출) | `0px -> 0px` (`0px`) | `true` / `true` / **`true`** | `12px` / `44px` |
| **`768×1024 @ 200%`** | 그룹 `3` + 날짜 `4` | `92+92px -> 88+88px` (`-8px`) | `608px -> 546px` (**`-62px`**) | `354px -> 313px` (전체 노출) | `232px -> 0px` (**`-232px`, `-100%`**) | `true` / `true` / **`true`** | `12px` / `88px` |
| **`1440×900 @ 100%`** | 그룹 `3` + 날짜 `4` | `45+96px -> 44+44px` (**`-53px`**) | `305px -> 280px` (**`-25px`**) | `530px -> 156px` (전체 노출) | `0px -> 0px` (`0px`) | `true` / `true` / **`true`** | `12px` / `44px` |
| **`1440×900 @ 200%`** | 그룹 `3` + 날짜 `4` | `305+812px -> 88+88px` (**`-941px`**) | `1945px -> 560px` (**`-1385px`**) | `0px -> 312px` (**`+312px`**) | `2968px -> 0px` (**`-2968px`, `-100%`**) | `true` / `true` / **`true`** | `12px` / `88px` |

### 3.2 핵심 요구사항 달성 여부 확인

1. **`1440×900 @ 200%` 확대 가독성 및 즉시 재사용 검증 (`PASS`)**:
   - Round 4에서 `1945px`였던 `firstCardTopPx`가 **`560px`(`-1385px`, `-71.2%`)**로 단축되었고, `2968px`였던 `scrollNeededForPrimaryReusePx`가 **`0px`(`-2968px`, `primaryReuseVisibleWithoutScroll: true`, 버튼 하단 `862px <= 900px`)**로 개선되어 스크롤 없이 첫 수업 기록의 날짜·제목·`이 수업 다시 계획` 주요 행동 버튼이 한 화면에 즉시 보입니다.
2. **전 뷰포트 그룹·날짜 점진 공개 (`PASS`)**:
   - 모든 뷰포트(`320×694`, `390×844`, `768×1024`, `1440×900`)와 배율(`100%`, `200%`)에서 그룹 필터는 초기 `3`개 알약(`전체 기록` + 주요 그룹 2개)과 `그룹 더보기 (+3개)` 토글을 노출하고, 날짜 필터는 초기 `4`개 칩(`전체 날짜` + 최근 3일)과 `이전 날짜 더보기 (+47일)` 토글을 노출합니다.
   - 비초기 그룹 또는 이전 날짜를 선택한 뒤 접더라도 선택된 그룹/날짜 칩이 고정 노출되며 필터 상태가 유지됩니다.
3. **글자 크기·터치 영역 축소 금지 및 필터 기능 보존 (`PASS`)**:
   - 전 뷰포트·배율에서 `minCssFontSizePx = 12px` (`12px` 미만 축소 `0`건).
   - 전 뷰포트·배율에서 `minPhysicalTouchHeightPx = 44px` (`100%` 배율) / `88px` (`200%` 배율)로 `44px` CSS 터치 영역 기준을 엄격히 충족합니다.
   - 그룹 필터, 날짜별 탐색, 검색, `전체 그룹 보기` / `전체 날짜 보기` / `필터 초기화`, `이력 다시 열기`, `이 수업 다시 계획` 기능이 삭제 없이 모두 보존되었습니다.

---

## 4. 키보드 접근성 (`Escape` 접기 + 포커스 복귀), 클릭 수, 1,000건 스케일 성능 및 시간 계약 검증

1. **키보드 접근성 및 포커스 복귀 (`PASS`)**:
   - 그룹 필터 바(`role="group" aria-label="수업 그룹 필터"`) 및 날짜 탐색 바(`role="group" aria-label="날짜별 기록 탐색"`):
     - `ArrowRight` / `ArrowDown` / `ArrowLeft` / `ArrowUp` / `Home` / `End` 로빙 포커스 이동 정상 동작.
     - 펼쳐진 그룹 바 내부에서 `Escape` 키 입력 시 즉시 접힘(`groupCollapsedOnEscape: true`) + `그룹 더보기` 토글 버튼으로 포커스 복귀(`groupFocusRestoredOnEscape: true`).
     - 펼쳐진 날짜 바 내부에서 `Escape` 키 입력 시 즉시 접힘(`dateCollapsedOnEscape: true`) + `이전 날짜 더보기` 토글 버튼으로 포커스 복귀(`dateFocusRestoredOnEscape: true`).
     - 상세 모달(`이력 다시 열기`) 닫기 시 트리거 버튼으로 포커스 복귀(`modalFocusRestored: true`).
2. **작업 클릭 수 (`PASS`)**:
   - 첫 기록 `이 수업 다시 계획` 실행: **`1`클릭** (`clicksToFirstReuse: 1`)
   - 기본 노출 그룹/최근 날짜 선택: **`1`클릭** (`clicksToSelectInitialGroup: 1`, `clicksToSelectRecentDate: 1`)
   - 이전 그룹/이전 날짜 펼침 후 선택: **`2`클릭** (`clicksToSelectOlderGroup: 2`, `clicksToSelectOlderDate: 2`)
3. **1,000개 합성 기록(365일) 스케일 성능 (`PASS`)**:
   - 초기 DOM 카드 렌더링 수: **`30`개** (`initialDomArticleCount: 30`, 페이지네이션 배치 크기 `30`건, 헤더 전체 건수 배지 `1000` 유지).
   - `resolveTeachingHistoryView` 호출 횟수: 마운트 시 **`1,000`회 1회 실행**, 이후 그룹/날짜 펼치기·접기·모달 열기/닫기 시 추가 재파싱 **`0`회**.
   - 실측 응답 시간: `initialLoadAndRender1000Ms = 1943ms`, `groupExpandMs = 176.7ms`, `dateExpandMs = 277.7ms` (366개 날짜 칩), `modalOpenMs = 97.5ms`, `modalCloseMs = 88ms`.
4. **정오(`12:00`)·자정(`00:00`)·`date-only`·`UTC`/`KST`·스냅샷 재사용 보존 (`PASS`)**:
   - 실제 정오(`2026-11-06T12:00:00.000Z` -> `12:00` 로컬/UTC) 및 실제 자정(`2026-11-06T00:00:00.000Z` -> `00:00` 로컬/UTC) 기록의 시각 배지 정상 표시.
   - `YYYY-MM-DD` 문자열(`2026-11-05`) 및 명시적 `timestamps: 'unrecorded'` 메타데이터 기록만 시각 배지 생략(`null`).
   - 스토어 원본 `taughtAt` 값 무변경 및 스냅샷 기반 `이 수업 다시 계획` 워크벤치 복원 계약 정상 보존.
