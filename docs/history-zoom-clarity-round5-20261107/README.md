# 수업 기록 200% 확대 가독성 및 날짜·그룹 점진 공개 검증 보고서 (`Round 5`)

- **문서 경로**: [`docs/history-zoom-clarity-round5-20261107/README.md`](file:///home/antigravity/blue45f/pilate_flow/docs/history-zoom-clarity-round5-20261107/README.md)
- **대상 범위 (독점 소유)**:
  - [`src/components/ClassBinderView.tsx`](file:///home/antigravity/blue45f/pilate_flow/src/components/ClassBinderView.tsx) (`798`줄, 800줄 제한 충족)
  - [`src/components/ClassBinderView.css`](file:///home/antigravity/blue45f/pilate_flow/src/components/ClassBinderView.css) (`625`줄, 800줄 제한 충족)
  - [`src/components/ClassBinderView.historyFlow.test.tsx`](file:///home/antigravity/blue45f/pilate_flow/src/components/ClassBinderView.historyFlow.test.tsx) (`627`줄, 800줄 제한 충족)
  - [`docs/history-zoom-clarity-round5-20261107/verify-history-zoom-round5.mjs`](file:///home/antigravity/blue45f/pilate_flow/docs/history-zoom-clarity-round5-20261107/verify-history-zoom-round5.mjs) (`507`줄, 800줄 제한 충족)
- **비수정 보호 범위**: `LogSessionModal`, `App.tsx`, 공유 스토어(`src/store/**`), 날짜/데이터 스키마(`src/schemas/**`, `src/types/**`), 빌더(`SequenceWorkbench`, `SequenceOrderCard`), 전역 CSS(`src/styles/**`) 무수정(`0` diff).

---

## 1. 원인 진단 (Round 4 `1440×900 @ 200%` 확대에서 `firstCardTopPx = 1945px`, `scrollNeeded = 2968px` 발생 원인)

1. **데스크톱(`> 640px`)에서 날짜 칩 13개·그룹 알약 6개 상시 나열**:
   - Round 4(`acade87`)에서는 모바일(`<= 640px`)에서만 날짜 칩을 4개로 접었고, `> 640px`에서는 그룹 필터 `6`개(`305px`)와 날짜 칩 `13`개(`812px`)를 상시 나열하여 `1440×900 @ 200%` 확대 시 필터 영역만 **`1,117px`**를 차지했습니다.
2. **200% 확대 시 `.teaching-history-layout` 2열 그리드 고착**:
   - 전역 `src/styles/teaching.css`의 `@media (max-width: 820px)`는 `1440px` 뷰포트에서 `document.documentElement.style.zoom = '2'` 적용 시 매칭되지 않아 우측 `.teaching-memory-aside`(`290px`)가 본문 열을 압박했습니다.
3. **카드 내부 8단 세로 적층**:
   - 첫 기록 카드(`article.teaching-history-card`) 내부 메타데이터 행들이 단일 열로 길게 쌓여 `200%` 확대에서 주요 재사용 버튼(`이 수업 다시 계획`) 도달 거리를 늘렸습니다.

---

## 2. 최소 범위 해결책 (글자 축소·터치영역 축소·필터 기능 삭제 금지 준수)

1. **그룹 필터 + 날짜 필터 전 뷰포트 점진 공개 (`Progressive Disclosure`) 일원화**:
   - [`ClassBinderView.tsx`](file:///home/antigravity/blue45f/pilate_flow/src/components/ClassBinderView.tsx)에서 모바일·태블릿·데스크톱 구분 없이 기본 접힘 상태에서:
     - **수업 그룹 필터(`role="group" aria-label="수업 그룹 필터"`)**: `전체 기록` + 주요 그룹 `2`개(총 `3`개 알약)만 기본 노출하고, 나머지는 `그룹 더보기 (+N개)` / `그룹 접기`(`aria-expanded`) 및 선택 시 `전체 그룹 보기`로 즉시 접근·초기화. 접힌 상태에서도 비초기 그룹이 선택되어 있으면 선택된 그룹 알약을 고정 노출.
     - **날짜별 기록 탐색(`role="group" aria-label="날짜별 기록 탐색"`)**: `전체 날짜` + 최근 날짜 `3`개(총 `4`개 칩)만 기본 노출하고, 나머지는 `이전 날짜 더보기 (+N일)` / `날짜 접기`(`aria-expanded`) 및 선택 시 `전체 날짜 보기`로 접근·초기화. 접힌 상태에서도 이전 날짜가 선택되어 있으면 선택된 날짜 칩을 고정 노출.
2. **컨테이너 쿼리 기반 200% 확대 반응형 레이아웃 및 2열 압축 카드 그리드**:
   - [`ClassBinderView.css`](file:///home/antigravity/blue45f/pilate_flow/src/components/ClassBinderView.css)에서 `.teaching-collection.teaching-collection--history`에 `container-type: inline-size; container-name: history-collection;`을 선언하고 `@container history-collection (max-width: 860px)`에서 `.teaching-history-layout`을 1열로 전환하여 `1440×900 @ 200%` 확대 시 본문 폭을 확보했습니다(데스크톱 `1440×900 @ 100%`는 2열 유지).
   - `.teaching-history-card`에 2열 CSS Grid를 적용하여 글자 크기(`>= 12px`)와 터치 영역(`>= 44px` CSS / `200%` 확대 시 `>= 88px`)을 축소하지 않고도 카드 높이를 `156px`(`100%`) / `313px`(`200%`)로 정돈했습니다.

---

## 3. 전후 실측 비교 (Round 4 vs Round 5, 합성 기록 100건 / 50일 / 6개 그룹 탭)

- **측정 환경**: Debian 12 Linux (`x64`), Headless Chromium (`/usr/bin/chromium`), [`verify-history-zoom-round5.mjs`](file:///home/antigravity/blue45f/pilate_flow/docs/history-zoom-clarity-round5-20261107/verify-history-zoom-round5.mjs)
- **원시 JSON 증거**: [`evidence/round5-zoom-clarity-metrics.json`](file:///home/antigravity/blue45f/pilate_flow/docs/history-zoom-clarity-round5-20261107/evidence/round5-zoom-clarity-metrics.json)

### 3.1 `100%` 및 `200%` 확대 첫 기록·재사용 행동 거리 전후 실측표

| 뷰포트 및 배율 | 지표 | Round 4 (`acade87`) | Round 5 (현재) | 변화량 (Delta) | 스크롤 없이 날짜·제목·`이 수업 다시 계획` 즉시 노출 |
| :--- | :--- | ---: | ---: | ---: | :--- |
| **`320×694 @ 100%`** | 그룹+날짜 필터 높이 (`px`) | `46 + 46 = 92` | `44 + 44 = 88` | **`-4px`** | 날짜 `true` · 제목 `true` · 재사용 **`true` (`0px` 스크롤)** |
| | 첫 카드 `top` (`px`) | `304` | **`271`** | **`-33px`** | 재사용 버튼 `bottom = 422px <= 694px` |
| **`390×844 @ 100%`** | 그룹+날짜 필터 높이 (`px`) | `46 + 46 = 92` | `44 + 44 = 88` | **`-4px`** | 날짜 `true` · 제목 `true` · 재사용 **`true` (`0px` 스크롤)** |
| | 첫 카드 `top` (`px`) | `304` | **`271`** | **`-33px`** | 재사용 버튼 `bottom = 422px <= 844px` |
| **`768×1024 @ 100%`** | 그룹+날짜 필터 높이 (`px`) | `45 + 147 = 192` | `44 + 44 = 88` | **`-104px` (`-54.2%`)** | 날짜 `true` · 제목 `true` · 재사용 **`true` (`0px` 스크롤)** |
| | 첫 카드 `top` (`px`) | `356` | **`273`** | **`-83px`** | 재사용 버튼 `bottom = 424px <= 1024px` |
| **`1440×900 @ 100%`** | 그룹+날짜 필터 높이 (`px`) | `45 + 96 = 141` | `44 + 44 = 88` | **`-53px` (`-37.6%`)** | 날짜 `true` · 제목 `true` · 재사용 **`true` (`0px` 스크롤)** |
| | 첫 카드 `top` (`px`) | `305` | **`280`** | **`-25px`** | 재사용 버튼 `bottom = 431px <= 900px` |
| **`320×694 @ 200%`** | 첫 카드 `top` (`px`) | `608` | **`542`** | **`-66px`** | 날짜 `true` (`573px`) · 제목 `true` (`623px`) 즉시 가시 |
| | 재사용 도달 필요 스크롤 (`px`) | `562` | **`150`** | **`-412px` (`-73.3%`)** | 가시 카드 높이 `24px -> 152px` (**`+128px`**) |
| **`390×844 @ 200%`** | 첫 카드 `top` (`px`) | `608` | **`542`** | **`-66px`** | 날짜 `true` · 제목 `true` · 재사용 **`true` (`0px` 스크롤)** |
| | 재사용 도달 필요 스크롤 (`px`) | `412` | **`0`** | **`-412px` (`-100%`)** | 재사용 버튼 `bottom = 844px <= 844px` (즉시 노출) |
| **`768×1024 @ 200%`** | 첫 카드 `top` (`px`) | `608` | **`546`** | **`-62px`** | 날짜 `true` · 제목 `true` · 재사용 **`true` (`0px` 스크롤)** |
| | 재사용 도달 필요 스크롤 (`px`) | `232` | **`0`** | **`-232px` (`-100%`)** | 재사용 버튼 `bottom = 849px <= 1024px` (즉시 노출) |
| **`1440×900 @ 200%`** | 그룹+날짜 필터 높이 (`px`) | `305 + 812 = 1117` | `88 + 88 = 176` | **`-941px` (`-84.2%`)** | 날짜 `true` · 제목 `true` · 재사용 **`true` (`0px` 스크롤)** |
| | 첫 카드 `top` (`px`) | `1945` | **`560`** | **`-1385px` (`-71.2%`)** | 가시 카드 높이 `0px -> 312px` (**`+312px`**) |
| | 재사용 도달 필요 스크롤 (`px`) | `2968` | **`0`** | **`-2968px` (`-100%`)** | 재사용 버튼 `bottom = 862px <= 900px` (즉시 노출) |

### 3.2 금지 사항 준수 검증 (글자 크기·터치 영역·필터 기능 보존)

- **최소 CSS 글자 크기 (`minCssFontSizePx`)**: 전 뷰포트·배율 모두 **`12px`** (`< 12px` 축소 `0`건).
- **최소 터치 영역 높이 (`minPhysicalTouchHeightPx`)**: `100%` 배율 **`44px`**, `200%` 배율 **`88px`** (`< 44px` CSS 축소 `0`건).
- **필터·조작 클릭 수 (`clickCounts`)**:
  - 첫 기록 `이 수업 다시 계획` 실행: **`1`클릭**
  - 기본 노출 그룹/최근 날짜 선택: **`1`클릭**
  - 접힌 이전 그룹(`+3개`)/이전 날짜(`+N일`) 펼침 후 선택: **`2`클릭** (`그룹 더보기` / `이전 날짜 더보기` -> 항목 클릭)

---

## 4. 키보드 접근성 및 1,000건 대량 기록 성능·시간 계약 검증

1. **키보드 펼침·닫힘·포커스 복귀**:
   - 그룹 필터 바(`role="group" aria-label="수업 그룹 필터"`) 및 날짜 필터 바(`role="group" aria-label="날짜별 기록 탐색"`):
     - `Enter` / `Space`로 `그룹 더보기 (+3개)` / `이전 날짜 더보기 (+362일)` 펼침(`aria-expanded="true"`).
     - `ArrowRight` / `ArrowDown` / `ArrowLeft` / `ArrowUp` / `Home` / `End`로 칩 간 로빙 포커스 이동.
     - 펼쳐진 그룹/날짜 내부 어디서든 **`Escape`** 입력 시 즉시 접힘(`is-collapsed`) 및 각 토글 버튼(`그룹 더보기`, `이전 날짜 더보기`)으로 포커스 자동 복귀 (`groupCollapsedOnEscape: true`, `groupFocusRestoredOnEscape: true`, `dateCollapsedOnEscape: true`, `dateFocusRestoredOnEscape: true`).
     - 상세 모달(`이력 다시 열기`) 닫기 시 트리거 버튼으로 포커스 복귀 (`modalFocusRestored: true`).
2. **1,000개 합성 기록(365일) 성능 측정**:
   - 초기 DOM 카드 렌더링: **`30`개** (`INITIAL_VISIBLE_HISTORY_LOGS = 30`, 전체 집계 배지 `1000` 유지).
   - `resolveTeachingHistoryView` 호출 횟수: 마운트 시 **`1,000`회 1회 실행**, 이후 그룹/날짜 펼치기·접기·모달 열기/닫기 시 추가 재파싱 **`0`회**.
   - 인터랙션 지연시간 (`1,000`건 기준):
     - 그룹 펼치기(`groupExpandMs`): `113.5ms`
     - 날짜 366개 펼치기(`dateExpandMs`): `152.9ms`
     - 상세 모달 열기/닫기(`modalOpenMs` / `modalCloseMs`): `234.7ms` / `30.2ms`
3. **정오(`12:00`)·자정(`00:00`)·`date-only`·`UTC`/`KST`·원본 스냅샷 재사용 계약 보존**:
   - 실제 정오(`2026-11-06T12:00:00.000Z`) 및 실제 자정(`2026-11-06T00:00:00.000Z`) 기록의 시각 배지(`12:00`, `00:00`) 정상 표시, `YYYY-MM-DD` 및 `timestamps: 'unrecorded'` 날짜 전용 기록만 시각 배지 숨김, 스토어 원본 `taughtAt` 불변(`TZ=UTC` 및 `TZ=Asia/Seoul` 총 28개 단위 테스트 모두 통과).
