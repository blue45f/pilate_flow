# 수업 기록 모바일 Round 4: 첫 카드 가시 높이 및 주요 재사용 액션 노출 개선 (`2026-11-07`)

## 1. 문제 진단 및 정직한 기준 정립

이전 Round 3(`ca38174`)에서는 모바일 날짜 필터 높이를 `606px -> 156px`으로 축소했으나, 상단 헤더(`150px~164px`), 분리 안내 배너(`66px~72px`), 검색·요약 툴바(`76px~80px`), 4줄로 쌓인 그룹 필터(`206px~230px`), 날짜 필터(`156px`)의 세로 여백이 누적되어 초기 화면에서 첫 번째 기록 카드의 실제 가독성이 부족했습니다.

- **Round 3 (`ca38174`) 실측 한계**:
  - **`390×844` (모바일 표준)**: `firstCardTopPx = 812px`로 뷰포트 하단(`844px`) 기준 `32px`만 걸쳤고, 하단 고정 탭바(`.bottom-nav`, `top = 768px`, `height = 76px`)를 제외하면 **실제 가시 높이(`cardVisibleHeightUnobstructedPx`)는 `0px`**였습니다. 첫 카드의 날짜, 제목, 주요 재사용 액션(`이 수업 다시 계획` / `이력 다시 열기`) 모두 초기 화면에서 보이지 않았습니다.
  - **`320×694` (초소형 모바일)**: `firstCardTopPx = 841px`로 뷰포트(`694px`) 밖에 위치해 **가시 높이 `0px`**였으며, 첫 카드를 읽기 위해 반드시 스크롤해야 했습니다.
- **Round 4 정직한 측정 기준**:
  - 단순 `firstCardTopPx < viewportHeight`만으로 "첫 기록 즉시 확인"으로 판정하지 않고, **하단 고정 네비게이션(`.bottom-nav`) 위쪽의 실제 비가림 영역(`unobstructedBottomPx = bottomNavTopPx`)** 안에 다음 4가지가 모두 들어오는지 실측합니다:
    1. **첫 카드 가시 높이 (`cardVisibleHeightViewportPx` / `cardVisibleHeightUnobstructedPx`)**
    2. **첫 기록 날짜 (`time.teaching-history-date`) 노출 여부**
    3. **첫 기록 제목 (`h2.teaching-card-title`) 노출 여부**
    4. **주요 재사용 액션 (`이 수업 다시 계획` 및 `이력 다시 열기` 버튼) 노출 여부 및 필요 스크롤 거리 (`scrollNeededForPrimaryReusePx`)**

---

## 2. 소유 범위 및 최소 변경 요약

- **엄격한 파일 소유 경계**:
  - [`src/components/ClassBinderView.tsx`](../../src/components/ClassBinderView.tsx) (`+3 / -1`줄: `teaching-collection--history` / `teaching-collection--saved` 뷰 구분 클래스 1곳 추가, 총 `899`줄)
  - [`src/components/ClassBinderView.css`](../../src/components/ClassBinderView.css) (`.teaching-collection--history` 전용 모바일/데스크톱 상단 여백·가로 스크롤 정리 및 카드 내부 컴팩트 여백 정리, 총 `1,069`줄)
  - [`src/components/ClassBinderView.historyFlow.test.tsx`](../../src/components/ClassBinderView.historyFlow.test.tsx) (Round 4 스코프 분리, 첫 카드 날짜·제목·주요 재사용 액션 DOM 순서 및 리사이즈 선택 유지 회귀 테스트 추가)
  - `docs/history-first-card-round4-20261107/**` (실제 브라우저 측정 스크립트, JSON 메트릭, 스크린샷 12장, 독립 검증 보고서)
- **비수정 보호 범위**:
  - 공유 스타일(`src/styles/**`), 공유 스토어(`src/store/**`), 스키마(`src/schemas/**`, `src/types/**`), 라우트, 테마, 다른 페이지(`PackagePanel`, `package-panel`, `PackageDetail` 등) **일절 수정 없음 (`0 files touched`)**.
  - 기능/기록 삭제 없음, 리사이즈나 접기/펼치기 시 선택 필터 초기화 없음, 카드 내 요소의 자연스러운 시각/DOM 순서(`날짜/시각·그룹 -> 제목 -> 요약 수치 -> 계획 대비 시간 -> 상태 배지 -> 메모 -> 주요 운동 -> 이력 다시 열기 / 이 수업 다시 계획`) 그대로 유지.

### 주요 스타일 정돈 내용 ([`ClassBinderView.css`](../../src/components/ClassBinderView.css))
1. **모바일 상단 헤더·배너·툴바 세로 여백 압축 (`.teaching-collection--history`, `<= 640px`)**:
   - `.teaching-page-header`: 제목(`수업 기록 1000`)과 설명을 좌측에, `수업 그룹 추가`(`min-height: 44px`) 버튼을 우측에 한 줄 배치(`150~164px -> 44px`).
   - `.teaching-separation-banner`: 한 줄 인라인 안내 바로 정돈(`66~72px -> 22px`).
   - `.teaching-collection-toolbar`: 검색창(`36px`)과 요약 카운트를 밀도 있게 배치(`76~80px -> 47px`).
2. **모바일 그룹 필터 1줄 가로 스크롤 스트립화 (`.teaching-group-filters`)**:
   - 기존 모바일에서 `flex-direction: column`으로 4줄(`206~230px`)을 차지하던 그룹 필터를 `overflow-x: auto; flex-wrap: nowrap` 가로 트랙(`44px` 높이)으로 정돈하여 모든 그룹 필터 버튼(`min-height: 44px`)을 삭제 없이 유지하면서 세로 공간 `162~186px` 절약.
3. **모바일 날짜 필터 접힘 상태 1줄 가로 칩 트랙화 (`.teaching-date-nav.is-collapsed`)**:
   - 접힘 상태에서 `전체 날짜 + 최근 3개 날짜 (+ 이전 날짜 선택 시 고정 칩 1개)`를 1줄 가로 스크롤 트랙으로 배치하여 4개일 때와 5개(이전 날짜 선택 고정)일 때 모두 날짜 네비게이션 전체 높이를 `98px`(Round 2 `606px`, Round 3 `156~254px`)로 일정하게 유지.
   - 펼침 상태(`.teaching-date-nav.is-expanded`)는 2열 스크롤 그리드(`max-height: 210px; overflow-y: auto`)로 모든 날짜에 접근 가능하며 첫 카드도 화면 안에 함께 유지.
4. **모바일 첫 기록 카드 내부 세로 밀도 정돈 (`.teaching-history-card`)**:
   - 카드 패딩/간격을 정돈해 카드 1장 높이를 `320px`에서 `208px`, `390px`에서 `193px`으로 줄여 첫 카드 전체(날짜, 제목, 요약, 메모, 운동 칩, `이력 다시 열기`, `이 수업 다시 계획`)가 하단 고정 탭바 위쪽에 100% 노출되도록 개선.

---

## 3. 전후 실측 비교 (`1,000`건 합성 기록, 실제 헤드리스 Chromium `156.0.8078.79`)

측정 원본 데이터: [`evidence/round4-first-card-metrics.json`](./evidence/round4-first-card-metrics.json)

### 3.1 모바일 `320×694` 및 `390×844` 첫 카드 가시 높이·액션 노출 전후 비교 (`scale1000`, `100%` 기본 배율)

| 측정 항목 (`1,000`건 기준) | `320×694` Round 2 (`606f7ad`) | `320×694` Round 3 (`ca38174`) | **`320×694` Round 4 (현재)** | `390×844` Round 2 (`606f7ad`) | `390×844` Round 3 (`ca38174`) | **`390×844` Round 4 (현재)** |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| 뷰포트 높이 / 하단 탭바 제외 비가림 하단 (`unobstructedBottomPx`) | `694px` / `618px` | `694px` / `618px` | **`694px` / `618px`** | `844px` / `768px` | `844px` / `768px` | **`844px` / `768px`** |
| 헤더 높이 (`headerHeightPx`) | `164px` | `164px` | **`44px`** | `150px` | `150px` | **`44px`** |
| 분리 배너 높이 (`bannerHeightPx`) | `72px` | `72px` | **`22px`** | `66px` | `66px` | **`22px`** |
| 검색·요약 툴바 높이 (`toolbarHeightPx`) | `80px` | `80px` | **`47px`** | `76px` | `76px` | **`47px`** |
| 그룹 필터 높이 (`groupFiltersHeightPx`) | `230px` | `230px` | **`44px`** | `206px` | `206px` | **`44px`** |
| 날짜 필터 높이 (접힘, `dateNavHeightPx`) | `1246px` (미접힘) | `156px` (`5칩: 254px`) | **`98px` (`5칩: 98px`)** | `606px` (미접힘) | `156px` (`5칩: 221px`) | **`98px` (`5칩: 98px`)** |
| **첫 기록 카드 상단 (`firstCardTopPx`)** | `1931px` | `841px` (화면 밖) | **`364px`** | `1262px` | `812px` | **`364px`** |
| **첫 기록 카드 하단 (`firstCardBottomPx`)** | `2343px` | `1253px` | **`572px`** | `1630px` | `1180px` | **`556px`** |
| **첫 카드 가시 높이 (뷰포트 기준 `cardVisibleHeightViewportPx`)** | `0px` (`0%`) | `0px` (`0%`) | **`208px` (`100%`)** | `0px` (`0%`) | `32px` (`8.7%`) | **`192px` (`100%`)** |
| **첫 카드 가시 높이 (하단 탭바 제외 `cardVisibleHeightUnobstructedPx`)** | `0px` (`0%`) | `0px` (`0%`) | **`208px` (`100%`)** | `0px` (`0%`) | **`0px` (`0%`)** | **`192px` (`100%`)** |
| **첫 기록 날짜 (`<time>`) 비가림 노출** | `false` | `false` | **`true` (`373~391px`)** | `false` | `false` | **`true` (`373~391px`)** |
| **첫 기록 제목 (`<h2>`) 비가림 노출** | `false` | `false` | **`true` (`395~427px`)** | `false` | `false` | **`true` (`395~411px`)** |
| **주요 재사용 액션 (`이 수업 다시 계획`) 비가림 노출** | `false` | `false` | **`true` (`521~565px`)** | `false` | `false` | **`true` (`505~549px`)** |
| **상세 열기 액션 (`이력 다시 열기`) 비가림 노출** | `false` | `false` | **`true` (`521~565px`)** | `false` | `false` | **`true` (`505~549px`)** |
| **주요 재사용 액션까지 필요한 스크롤 (`scrollNeededForPrimaryReusePx`)** | `1725px` | `635px` | **`0px` (즉시 클릭 가능)** | `862px` | `412px` | **`0px` (즉시 클릭 가능)** |

### 3.2 전 해상도(`320` / `390` / `768` / `1440`) 요약 (`scale100` & `scale1000`, `100%` 기본 배율)

| 해상도 (`100%`) | 기록 수 | `dateNavHeightPx` (접힘 / 5칩 / 펼침) | `firstCardTopPx` | `cardVisibleHeightViewportPx` | `cardVisibleHeightUnobstructedPx` | 날짜 노출 | 제목 노출 | 주요 재사용 액션 노출 (뷰포트 / 탭바제외) | 필요 스크롤 (`scrollNeededForPrimaryReusePx`) | 터치 타깃 최소 높이 / 가로 오버플로우 |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **`320×694`** | `100` / `1000` | `98px` / `98px` / `209px` | `364px` | `208px` (`100%`) | `208px` (`100%`) | `true` | `true` | **`true` / `true`** | **`0px`** | `44px` / `0px` |
| **`390×844`** | `100` / `1000` | `98px` / `98px` / `209px` | `364px` | `192px` (`100%`) | `192px` (`100%`) | `true` | `true` | **`true` / `true`** | **`0px`** | `44px` / `0px` |
| **`768×1024`** | `100` / `1000` | `256px` (기본 13칩 유지) | `691px` | `309px` (`100%`) | `257px` (`83%`) | `true` | `true` | **`true` (`943~987px <= 1024px`) / `false` (`.bottom-nav 948px`와 `39px` 중첩)** | **`39px`** (탭바 위 완전 노출 기준) | `44px` / `0px` |
| **`1440×900`** | `100` / `1000` | `176px` (기본 13칩 유지) | `552px` | `280px` (`100%`) | `280px` (`100%`) | `true` | `true` | **`true` / `true`** (`775~819px <= 900px`) | **`0px`** | `44px` / `0px` |

> **참고 (`768×1024` 태블릿)**: 태블릿(`> 640px`)은 데스크톱과 동일하게 `전체 날짜 + 최근 12일`(`13`개 날짜 칩)을 기본 노출하도록 보존했습니다. 첫 카드의 날짜(`706~730px`), 제목(`737~758px`), 요약·메모·운동 목록은 하단 바(`948px`) 위쪽에 100% 노출되며, 하단 액션 버튼(`943~987px`)은 뷰포트(`1024px`) 안에는 들어오나 하단 고정 바와 `39px` 겹치므로 정직하게 `primaryReuseActionVisibleInViewport = true`, `primaryReuseActionVisibleUnobstructed = false`(`scrollNeededForPrimaryReusePx = 39px`)로 기록했습니다.

---

## 4. `200%` 확대(Zoom) 가독성 우선 별도 판정 (`Separate Honest Evaluation`)

요구사항에 따라 `200%` 확대(`Emulation.setPageScaleFactor(2)` + `zoom: 2`)는 첫 카드 억지 압축 대신 **글자 크기·줄바꿈·터치 영역(`88px` 물리 높이)·가로 잘림 없음(`docOverflowPx = 0`)의 가독성을 최우선**으로 두고 별도 판정했습니다.

| `200%` 확대 뷰포트 (`scale1000`) | 가로 오버플로우 (`docOverflowPx` / `maxCardOverflowPx`) | 물리 터치 타깃 최소 높이 (`touchTargetMinHeightPx`) | `dateNavHeightPx` | `firstCardTopPx` | `cardVisibleHeightUnobstructedPx` | 날짜 / 제목 / 주요 재사용 액션 비가림 노출 | 필요 스크롤 (`scrollNeededForPrimaryReusePx`) | 가독성 우선 별도 판정 |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :--- |
| **`Mobile 390×844 @ 200%`** | `0px` / `0px` | `88px` (`44px × 2`) | `196px` | `727px` | `417px` | **`true` / `true` / `true`** (`1042~1130px <= 1234px`) | **`0px`** | **PASS (가독성 + 즉시 노출 동시 충족)**: 1줄 가로 스크롤 필터 덕분에 200% 확대에서도 텍스트 잘림·겹침 없이 첫 카드와 재사용 버튼이 노출됨 |
| **`Desktop 1440×900 @ 200%`** | `0px` / `0px` | `88px` (`44px × 2`) | `812px` (`13`칩 2배 확대) | `1945px` | `0px` | **`false` / `false` / `false`** | **`2968px`** | **PASS (가독성 우선 별도 판정 — 스크롤 필요)**: 데스크톱 `1440×900`에서 200% 확대 시 `13`개 날짜 칩과 그룹 필터가 2배 물리 크기(`88px` 터치 높이)로 줄바꿈되어 `dateNav`만 `812px`을 차지함. 글자 축소나 칩 강제 숨김 없이 가독성과 가로 무오버플로우(`0px`)를 유지하고 스크롤로 카드를 탐색하도록 정직하게 판정 |

---

## 5. 시각적 증거 (실제 Chromium 스크린샷)

- 모바일 `320×694`:
  - `1,000`건 (첫 카드 날짜·제목·`이력 다시 열기`·`이 수업 다시 계획` 모두 하단 탭바 위에 100% 노출): [`round4-scale-1000-mobile-320.png`](./evidence/screenshots/round4-scale-1000-mobile-320.png)
  - `100`건: [`round4-scale-100-mobile-320.png`](./evidence/screenshots/round4-scale-100-mobile-320.png)
- 모바일 `390×844`:
  - `1,000`건 (첫 번째 카드 100% + 두 번째 카드까지 하단 탭바 위에 노출): [`round4-scale-1000-mobile-390.png`](./evidence/screenshots/round4-scale-1000-mobile-390.png)
  - `100`건: [`round4-scale-100-mobile-390.png`](./evidence/screenshots/round4-scale-100-mobile-390.png)
- 태블릿 `768×1024` 및 데스크톱 `1440×900`:
  - 태블릿 `768×1024` (`1,000`건 / `100`건): [`round4-scale-1000-tablet-768.png`](./evidence/screenshots/round4-scale-1000-tablet-768.png) · [`round4-scale-100-tablet-768.png`](./evidence/screenshots/round4-scale-100-tablet-768.png)
  - 데스크톱 `1440×900` (`1,000`건 / `100`건): [`round4-scale-1000-desktop-1440.png`](./evidence/screenshots/round4-scale-1000-desktop-1440.png) · [`round4-scale-100-desktop-1440.png`](./evidence/screenshots/round4-scale-100-desktop-1440.png)
- `200%` 확대:
  - 모바일 `390×844 @ 200%` (`1,000`건 / `100`건): [`round4-scale-1000-mobile-390-zoom200.png`](./evidence/screenshots/round4-scale-1000-mobile-390-zoom200.png) · [`round4-scale-100-mobile-390-zoom200.png`](./evidence/screenshots/round4-scale-100-mobile-390-zoom200.png)
  - 데스크톱 `1440×900 @ 200%` (`1,000`건 / `100`건): [`round4-scale-1000-desktop-1440-zoom200.png`](./evidence/screenshots/round4-scale-1000-desktop-1440-zoom200.png) · [`round4-scale-100-desktop-1440-zoom200.png`](./evidence/screenshots/round4-scale-100-desktop-1440-zoom200.png)

---

## 6. 회귀 검증 요약 및 재현 명령

- **정오(`12:00`)/자정(`00:00`)/date-only UTC·KST 교차 회귀**: `TZ=UTC` 및 `TZ=Asia/Seoul`에서 `ClassBinderView.historyFlow.test.tsx`(`14`개 테스트) 및 `historyScaleUsability.audit.test.tsx`(`9`개 테스트) 전수 통과 (`23/23 PASS`).
- **페이지네이션·원본 재사용·포커스 복귀·키보드 탐색**:
  - `1,000`건 중 초기 `30`건 렌더링 + `이전 기록 더 보기 (970건 남음)` 동작 유지.
  - `이력 다시 열기` 모달 열기/닫기 시 트리거 버튼 포커스 복귀 및 `이 수업 다시 계획` 원본 시퀀스 보존 유지.
- **재현 명령**:
  ```bash
  npx tsc -b
  npx eslint src/components/ClassBinderView.tsx src/components/ClassBinderView.historyFlow.test.tsx docs/history-first-card-round4-20261107/verify-first-card-round4.mjs
  TZ=UTC npx vitest run src/components/ClassBinderView.historyFlow.test.tsx docs/history-scale-audit-20261107/historyScaleUsability.audit.test.tsx
  TZ=Asia/Seoul npx vitest run src/components/ClassBinderView.historyFlow.test.tsx docs/history-scale-audit-20261107/historyScaleUsability.audit.test.tsx
  node docs/history-first-card-round4-20261107/verify-first-card-round4.mjs
  ```
