# 수업 기록 모바일 날짜 필터 사용성 마감 보고서 (Round 3 — 2026-11-07)

## 1. 개요 및 작업 경계

이전 장기 누적 감사(`b899651`) 및 Round 2 패치(`cc718b0` / `606f7ad`)에서 `1,000`건 수업 기록(`333`개 고유 날짜) 기준 **모바일 `390px` 화면의 `.teaching-date-nav` 높이가 `15,154px` → `606px`로 줄었으나 여전히 뷰포트(`844px`)의 `68~72%`를 차지해 첫 기록 카드가 `1,364px` 아래로 밀리던 남은 사용성 결함**을 최소 수정했습니다.

### 소유 파일 경계 (독립 소유)
- [`src/components/ClassBinderView.tsx`](../../src/components/ClassBinderView.tsx)
- [`src/components/ClassBinderView.css`](../../src/components/ClassBinderView.css) (`ClassBinderView.tsx`에서만 import하는 전용 스타일)
- [`src/components/ClassBinderView.historyFlow.test.tsx`](../../src/components/ClassBinderView.historyFlow.test.tsx)
- `docs/history-mobile-filter-round3-20261107/**`

### 비수정 경계 확인
- 공유 스타일(`src/styles/**`), 공유 스토어(`src/store/**`), 데이터 스키마/타입(`src/schemas/**`, `src/types/**`), 동작 도해/탐색/Atlas, PWA 및 타 페이지 컴포넌트 **무수정(0줄 변경)**.
- 기존 날짜/기록/기능 삭제 없음(`날짜/기록/기능 삭제금지` 준수).

---

## 2. 원인 분석 및 최소 수정 내용

### 2.1 왜 Round 2(`cc718b0`)에서 모바일 `390px` 날짜 네비게이션 높이가 `606px`였는가?
1. **모바일 기본 노출 칩 개수 과다**: 뷰포트 폭과 무관하게 `INITIAL_VISIBLE_DATE_CHIPS = 12`(`전체 날짜` + 최근 `12`개 날짜 = 총 `13`개 칩)가 기본 렌더링되었습니다.
2. **좌측 라벨과 우측 칩 리스트의 가로 분할 배치**: 공유 스타일(`src/styles/teaching.css:356-383`)에서 `.teaching-date-nav`가 `display: flex; flex-wrap: wrap`으로 선언되어 좌측 `.teaching-date-nav-label`(`~82px`) 옆에 `.teaching-date-chip-list`(`flex: 1 1 240px`)가 배치되면서, `390px` 모바일에서 칩 리스트 가용 폭이 `~224px`로 좁아져 **날짜 칩(`~150px`)이 한 줄에 1개씩 총 `13`줄로 세로 적층(`13 × 44px + 패딩 = 606px`)**되었습니다.

### 2.2 최소 수정 설계
1. **모바일 기본 노출 칩 수 축소 (`MOBILE_INITIAL_VISIBLE_DATE_CHIPS = 3`)**:
   - [`src/components/ClassBinderView.tsx`](../../src/components/ClassBinderView.tsx)에서 모바일 뷰포트(`<= 640px`)일 때 기본 노출 날짜 수를 최근 `3`개(`전체 날짜` + 최근 `3`일 = 총 `4`개 칩)로 축소하고, 태블릿/데스크톱(`> 640px`)은 기존 `12`개(`13`개 칩)를 유지합니다.
   - 나머지 모든 날짜는 명시적 펼치기/접기 토글(`이전 날짜 더보기 (+N일)` / `날짜 접기`) 또는 상단 검색창·그룹 필터로 즉시 접근할 수 있습니다.
2. **선택한 과거 날짜 보존 및 침묵 필터 변경 금지 (`visibleDateFilterOptions`)**:
   - 사용자가 `이전 날짜 더보기 (+N일)`로 펼쳐 과거 날짜(예: `15`번째 날짜 `2026년 10월 24일`)를 선택한 뒤 `날짜 접기`를 눌러도, `effectiveSelectedDate`가 초기 `3`개 날짜 밖이면 해당 선택 날짜 칩을 접힌 목록 끝에 고정(`5`개 칩: `전체 날짜` + 최근 `3`일 + 선택한 날짜, `aria-pressed="true"`)하여 **선택한 날짜 칩이 사라지지 않고 활성 필터 결과도 절대 바뀌지 않습니다**.
3. **전용 스타일([`src/components/ClassBinderView.css`](../../src/components/ClassBinderView.css))을 통한 모바일 2열 그리드 및 `44px` 터치 타깃 보장**:
   - `.teaching-date-nav-label`(`order: 1; margin-right: auto`)과 `.teaching-date-more-toggle` / `.teaching-date-reset`(`order: 2`)을 상단 헤더 행에 배치하고, `.teaching-date-chip-list`(`order: 3; flex: 1 1 100%; width: 100%`)가 컨테이너 전체 폭을 사용하도록 구성했습니다.
   - 모바일(`@media (max-width: 640px)`)에서 `.teaching-date-chip-list`를 `display: grid; grid-template-columns: repeat(auto-fit, minmax(124px, 1fr)); gap: 6px` 2열 그리드로 배치해 기본 `4`개 칩이 **2행 × 2열(`156px`)** 안에 깔끔하게 들어오도록 개선했습니다.
   - `이전 날짜 더보기`를 펼쳤을 때도 `.teaching-date-nav.is-expanded .teaching-date-chip-list`에 `max-height: 236px; overflow-y: auto`를 부여해 `333`개 날짜를 펼쳐도 날짜 영역이 `298px`를 넘지 않고 내부 스크롤로 탐색되도록 보호했습니다.
   - 모든 `.teaching-date-chip`, `.teaching-date-more-toggle`, `.teaching-date-reset` 버튼에 `min-height: 44px; min-width: 44px`를 강제해 WCAG 2.5.5(`44×44px`) 터치 기준을 100% 충족했습니다.
4. **키보드 탐색 및 포커스 복귀 (`포커스복귀`)**:
   - `.teaching-date-nav`의 `onKeyDown`에서 `ArrowRight`/`ArrowLeft`/`Home`/`End`뿐 아니라 2열 모바일 그리드 이동을 위한 `ArrowDown`/`ArrowUp` 키를 지원합니다.
   - `이전 날짜 더보기` ↔ `날짜 접기` 토글 클릭 시 토글 버튼에 포커스를 유지하고, 조건부 렌더링되는 `전체 날짜 보기` 리셋 버튼 클릭 시 언마운트 직후 `"전체 날짜"` 칩으로 포커스를 복귀시키며, 기록 상세 모달(`이력 다시 열기`) 닫기 시 원래 카드의 `이력 다시 열기` 버튼으로 포커스를 복귀시킵니다.

---

## 3. 전후 높이 및 클릭 수 비교 증거 (`100`건 / `1,000`건)

- **측정 환경**: Linux 6.12.105+ (x64), Intel Xeon Platinum 8481C (2 cores, 7.76 GiB RAM), Node `v24.22.2`, `TZ=Asia/Seoul (UTC+9)`, Headless Chromium `156.0.8078.79` (`/usr/bin/chromium`).
- **WebKit 미지원 명시**: 샌드박스 Debian 12 컨테이너에 WebKit 브라우저 바이너리가 설치되어 있지 않으며 루트 파일시스템이 읽기 전용이어서 실제 브라우저 렌더링은 Chromium에서 수행했습니다.
- **원시 측정 데이터**: [`evidence/round3-mobile-filter-metrics.json`](./evidence/round3-mobile-filter-metrics.json)

### 3.1 `1,000`건(고유 날짜 `333`개) 모바일 `390×844` 전후 비교

| 지표 (`1,000`건 · `390×844` 모바일) | 감사 당시 (`b899651`) | Round 2 (`cc718b0` / `606f7ad`) | **Round 3 (현재 패치)** | 개선율 (vs Round 2 / vs 감사) |
| :--- | :---: | :---: | :---: | :---: |
| 기본 노출 날짜 칩 수 (`.teaching-date-chip`) | `334`개 | `13`개 | **`4`개 (`전체 날짜` + 최근 `3`일)** | `-69.2%` / `-98.8%` |
| `.teaching-date-nav` 높이 (`dateNavHeightPx`) | `15,154px` (`17.07x` 화면) | `606px` (`0.68x` 화면) | **`156px` (`0.18x` 화면)** | **`-74.3%`** / **`-99.0%`** |
| 첫 기록 카드 상단 위치 (`firstCardTopPx`) | `15,912px` | `1,364px` (뷰포트 밖) | **`812px` (초기 `844px` 화면 안 노출)** | **`-40.5%`** / **`-94.9%`** |
| 펼침 상태(`+330일`) `.teaching-date-nav` 높이 | `15,154px` | `15,190px` | **`298px` (내부 스크롤)** | **`-98.0%`** |
| 과거 날짜 선택 후 접힘(`5`칩 고정) 높이 | N/A | `652px` | **`254px`** | **`-61.0%`** |
| 첫 기록 카드 확인까지 필요한 클릭/스크롤 | 장거리 스크롤 필요 | 스크롤 필요 (`1,364px`) | **`0`클릭 (초기 화면 즉시 노출)** | 즉시 진입 |
| 최근 3일 날짜 필터 선택 클릭 수 | 스크롤 탐색 필요 | `1`클릭 | **`1`클릭** | 유지 |
| 이전 날짜(`+330일`) 펼치기 + 선택 클릭 수 | 장거리 스크롤 필요 | `2`클릭 | **`2`클릭 (`더보기` 1회 + 날짜 1회)** | 유지 |

### 3.2 전 뷰포트 (`320` / `390` / `768` / `1440` / `200%` 확대) 측정 요약 (`100`건 & `1,000`건)

| 규모 | 뷰포트 | 초기 카드 수 | 초기 날짜 칩 수 | `.teaching-date-nav` 높이 (`비율`) | `firstCardTopPx` | 최소 터치 크기 (`H × W`) | `>=44px` 통과 | 가로 넘침 (`doc` / `card`) |
| :---: | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **100건** | Mobile `320×694` | `30` | `4` (`+30일`) | `170px` (`0.24x`) | `841px` | `44px × 130px` | PASS | `0px` / `0px` |
| **100건** | Mobile `390×844` | `30` | `4` (`+30일`) | **`156px` (`0.18x`)** | **`812px`** | `44px × 149px` | PASS | `0px` / `0px` |
| **100건** | Tablet `768×1024` | `30` | `13` (`+21일`) | `266px` (`0.26x`) | `791px` | `44px × 113px` | PASS | `0px` / `0px` |
| **100건** | Desktop `1440×900` | `30` | `13` (`+21일`) | `166px` (`0.18x`) | `651px` | `44px × 113px` | PASS | `0px` / `0px` |
| **100건** | Desktop `1440×900 @ 200%` | `30` | `13` (`+21일`) | `832px` (`0.92x`) | `2276px` | `88px × 227px` | PASS | `0px` / `0px` |
| **100건** | Mobile `390×844 @ 200%` | `30` | `4` (`+30일`) | **`339px` (`0.24x`)** | `1683px` | `88px × 260px` | PASS | `0px` / `0px` |
| **1,000건** | Mobile `320×694` | `30` | `4` (`+330일`) | `170px` (`0.24x`) | `841px` | `44px × 130px` | PASS | `0px` / `0px` |
| **1,000건** | Mobile `390×844` | `30` | `4` (`+330일`) | **`156px` (`0.18x`)** | **`812px`** | `44px × 157px` | PASS | `0px` / `0px` |
| **1,000건** | Tablet `768×1024` | `30` | `13` (`+321일`) | `266px` (`0.26x`) | `791px` | `44px × 121px` | PASS | `0px` / `0px` |
| **1,000건** | Desktop `1440×900` | `30` | `13` (`+321일`) | `166px` (`0.18x`) | `651px` | `44px × 121px` | PASS | `0px` / `0px` |
| **1,000건** | Desktop `1440×900 @ 200%` | `30` | `13` (`+321일`) | `832px` (`0.92x`) | `2276px` | `88px × 242px` | PASS | `0px` / `0px` |
| **1,000건** | Mobile `390×844 @ 200%` | `30` | `4` (`+330일`) | **`339px` (`0.24x`)** | `1683px` | `88px × 260px` | PASS | `0px` / `0px` |

---

## 4. 선택 날짜 접힘 보존 · 키보드 · 포커스 복귀 · 회귀 검증

### 4.1 모바일 `390px` 인터랙션 워크플로우 검증 결과 (`mobile390Workflow`)
- `arrowDownMovedFocus: true` / `arrowUpMovedFocus: true`: 날짜 칩 간 `ArrowDown`, `ArrowUp`, `ArrowRight`, `ArrowLeft`, `Home`, `End` 키보드 이동 정상 동작.
- `focusRetainedOnExpand: true`: `이전 날짜 더보기 (+330일)` 클릭 시 `334`개 날짜 칩이 펼쳐지고 포커스가 `날짜 접기` 토글 버튼에 유지됨.
- `pinnedOlderDateVisibleWhenCollapsed: true` & `pinnedOlderDatePressed: true` & `filterUnchangedAfterCollapse: true`:
  - `15`번째 과거 날짜(`2026년 10월 24일`)를 선택한 뒤 `날짜 접기`를 눌러도, 선택된 `2026년 10월 24일` 칩이 접힌 목록(`5`개 칩)에 그대로 유지(`aria-pressed="true"`)되며 필터링된 기록 카드 목록도 전혀 바뀌지 않음.
- `focusReturnedToAllDatesChip: true`: `전체 날짜 보기` 리셋 버튼 클릭 시 전체 날짜(`30`개 초기 카드)로 복원되며 포커스가 `"전체 날짜"` 칩으로 즉시 복귀됨.
- `focusReturnedToReopenTrigger: true`: 카드의 `이력 다시 열기`로 상세 모달을 연 뒤 `Escape` 또는 `닫기` 클릭 시 원래 카드의 `이력 다시 열기` 버튼으로 포커스가 복귀됨.

### 4.2 정오(`12:00`)/자정(`00:00`) `UTC`/`KST` · 페이지네이션 · 원본 재사용 회귀 검증
- `TZ=UTC npx vitest run src/components/ClassBinderView.historyFlow.test.tsx src/components/ClassBinderView.scaleAudit.test.tsx` → **10 passed (10)**
- `TZ=Asia/Seoul npx vitest run src/components/ClassBinderView.historyFlow.test.tsx src/components/ClassBinderView.scaleAudit.test.tsx` → **10 passed (10)**
- 검증 항목:
  1. 실제 정오(`12:00 KST`/`12:00 UTC`) 및 실제 자정(`00:00 KST`/`00:00 UTC`) 수업 기록의 시각 배지 표시 보존.
  2. 명시적 날짜 전용(`YYYY-MM-DD`) 및 `createdAt !== updatedAt` 합성 정오 기록만 시각 배지 숨김.
  3. `KST` 자정 전후(`23:30 UTC` / `00:30 KST`) 동일 로컬 날짜 그룹핑 및 단일 날짜 칩 생성.
  4. `30`개 카드 페이지네이션(`이전 기록 더보기`) 및 수업 기록 재사용(`이 구성으로 새 수업 시작`) 시 당시 스냅샷 원본 불변성 유지.
- 타입/린트 검증:
  - `npx tsc -b` → **PASS (0 errors)**
  - `npx eslint src/components/ClassBinderView.tsx src/components/ClassBinderView.historyFlow.test.tsx` → **PASS (0 warnings/errors)**

---

## 5. 스크린샷 증거 (`docs/history-mobile-filter-round3-20261107/evidence/screenshots/`)
- `round3-scale-100-mobile-320.png` / `round3-scale-1000-mobile-320.png`
- `round3-scale-100-mobile-390.png` / `round3-scale-1000-mobile-390.png`
- `round3-scale-100-tablet-768.png` / `round3-scale-1000-tablet-768.png`
- `round3-scale-100-desktop-1440.png` / `round3-scale-1000-desktop-1440.png`
- `round3-scale-100-desktop-1440-zoom200.png` / `round3-scale-1000-desktop-1440-zoom200.png`
- `round3-scale-100-mobile-390-zoom200.png` / `round3-scale-1000-mobile-390-zoom200.png`
