# Track B — 독립 적대적 회귀 검증 및 실제 Chromium 멀티 뷰포트 증거 보고서 (2026-11-07)

> **검증 범위 및 정직성 고지**
> - 본 보고서는 `scripts/diagram-contact-audit-20261107/track-b-verification/track-b-adversarial-contact-audit.node-test.mjs` 및 `track-b-browser-contact-verify.mjs`가 **읽기 전용 `main` (`338f912`)**과 **Track A 최소 패치 후보**를 독립적으로 비교·실측한 결과입니다.
> - **해부학적·임상적·외부 전문가 검증 완료를 주장하지 않습니다** (`anatomicalAccuracyAssumed: false`, `anatomicalVerificationCompleted: false`, `expertVerificationCompleted: false`, `professionalReviewCount: 0`).

---

## 1. 정적 좌표 및 SVG VNode 대조 결과 요약 (`Baseline` vs `Candidate`)

| 항목 ID | 검증 대상 | 현재 `main` (`338f912`) 실측값 | 최소 패치 후보 (`Candidate`) 실측값 | 판정 |
| :--- | :--- | :--- | :--- | :--- |
| **R-01** | 매트 클램(`original-mat-clam`) · 오픈 북(`original-mat-open-book`) 교차 오염 및 어깨 연결선 | `clamHandLeakPx = 0`, `openBookKneeLeakPx = 0`, `schematic-shoulder-connection` 조건부 정상 | 원본 객체 참조 동일 (`Object.is === true`), 재구현 제외 | **ALREADY_RESOLVED_ON_MAIN** |
| **D-01** | `original-reformer-strap-frog` `end` 위상 무릎 굴곡 복귀 | `start.ankle=(214,74)` vs `end.ankle=(222,40)` (`거리 34.93px`, `Δy = -34px` 천장 리프트) | `end.ankle=(214,74)`, `end.knee=(182,92)` (`거리 0px`, `carriageOffsets=[6,36,6]`) | **FAIL → PASS** |
| **D-02A** | `ex-plank-01` 리포머 플랭크 손(풋바)·발(캐리지) 접점 | `hand=(88,148)` vs `footbarTop=(266,126)` (`거리 173.49px`), `hand.x < ankle.x(280)` 좌우 반전 | `hand=(268,126)` (`footbarTop` 거리 **`2.0px`**), `ankle=(80→114→82, 138)` 캐리지 안착 | **FAIL → PASS** |
| **D-02B** | `ex-plank-02` 외 체어 플랭크 3종 시트·페달 접점 | `hand=(88,148)` vs 시트 상단 `y=106` (`수직 이격 42px`), `ankle`-페달 팁 거리 `43.2px~63.6px` | `wrist=(132,106)`, `hand=(124,106)` (`시트 이격 0px`), `ankle`-페달 팁 거리 **`2.3px~5.4px`** | **FAIL → PASS** |
| **D-03** | 캐딜락(`cadillac`) 18개 운동 고정 베드 `carriageOffsetPx` | 18개 중 **15개 운동(45개 위상)**에서 `carriageOffsetPx > 0` (최대 `36px`) | 18개 전 종목(54개 위상) `carriageOffsetPx = 0` (`nonZeroCadillacCount = 0`) | **FAIL → PASS** |
| **D-04** | 운다 체어 페달 프레스 4종 발 하강 vs 페달 회전 방향 | 발 하강(`Δy = +32px`, `136→168`) 시 페달 팁 상승(`Δy = -15.0px`, `137.0→122.0`), `middle` 수직 분리 **`46.0px`(발목) / `50.0px`(뒤꿈치)** | 발 하강(`Δy = +32px`) 시 페달 팁 동조 하강(`Δy = +30.6px`, `139.3→169.9`), `middle` 수직 오차 **`1.9px`(발목) / `2.1px`(뒤꿈치)** | **FAIL → PASS** |
| **D-05** | 래더 배럴 스탠딩 7종 돔·사다리 관통 및 가로대 손 접점 | 지지 다리·골반 돔(`x:68..174`) 관통(`9~18건`), 작동 다리 사다리(`x:222..256`) 관통, 손-사다리 이격 `132~146px` | 스탠딩 배럴 돔(`x:18..70`)·사다리(`x:76..96`) 분리 배치 및 손(`88,76`) 가로대 파지 (`돔 관통 0건`, `사다리 관통 0건`) | **FAIL → PASS** |
| **G-01** | 전체 98개 운동 × 3위상 = 294개 SVG 렌더링 및 좌우 반전(`mirrored`) 대칭 | 294/294 렌더링 | 294/294 렌더링 완료 (`invalidSvgCount = 0`), `normal.x + mirrored.x === 320` | **PASS** |
| **G-02** | 정직성·비검증 플래그 경계 (`anatomicalAccuracyAssumed: false`) | 98/98 준수 | 98/98 준수 (`violationCount = 0`, `professionalReviewCount = 0`) | **PASS** |

---

## 2. 실제 Headless Chromium 멀티 뷰포트·200% 확대 검증 증거

- 실행 엔진: `HeadlessChromium (/usr/bin/chromium via puppeteer)`
- 결과 데이터: [`docs/diagram-contact-audit-20261107/evidence/browser-verification-results.json`](file:///home/antigravity/blue45f/pilate_flow/docs/diagram-contact-audit-20261107/evidence/browser-verification-results.json)
- 콘솔 에러 / 런타임 페이지 에러: **`0건` / `0건`**

| 뷰포트 ID | 해상도 및 배율 | 가로 오버플로우 (`horizontalOverflowPx`) | 렌더링 SVG 수 (`svgCount`) | 최소 SVG 크기 (`minSvgWidthPx × minSvgHeightPx`) | 스크린샷 아티팩트 | 판정 |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `mobile-320` | `320×850` (`100%`) | `0px` | `14` | `260px × 162.5px` | `evidence/screenshots/contact-audit-320x850.png` | **PASS** |
| `mobile-390` | `390×850` (`100%`) | `0px` | `14` | `330px × 206.3px` | `evidence/screenshots/contact-audit-390x850.png` | **PASS** |
| `tablet-768` | `768×1024` (`100%`) | `0px` | `14` | `341px × 213.1px` | `evidence/screenshots/contact-audit-768x1024.png` | **PASS** |
| `desktop-1440` | `1440×900` (`100%`) | `0px` | `14` | `303px × 189.4px` | `evidence/screenshots/contact-audit-1440x900.png` | **PASS** |
| `desktop-1440-zoom200` | `1440×900` (`200% 확대`) | `0px` | `14` | `606px × 378.8px` | `evidence/screenshots/contact-audit-1440x900-zoom200.png` | **PASS** |

### Chromium DOM 라이브 실측 (`domContactMeasurements`)
- **D-01 (`original-reformer-strap-frog` `end`)**: `baselineEndAnkle: (222, 40)` → `candidateEndAnkle: (214, 74)`, `candidateEndKnee: (182, 92)`
- **D-02 (`ex-plank-01` `start`)**: `baselineStartHand: (88, 148)` → `candidateStartHand: (268, 126)`, `candidateStartAnkle: (80, 138)`
- **D-03 (`original-cadillac-arm-spring-press` `middle`)**: `baselineCarriageOffsetPx: 24` → `candidateCarriageOffsetPx: 0`
- **D-04 (`original-chair-seated-pedal-press` `middle`)**: `baselineMiddlePedalTipY: 122` → `candidateMiddlePedalTipY: 169.9` (`candidateMiddleAnkleY: 168`, `candidateVerticalGapPx: 1.9px`)
- **D-05 (`original-barrel-standing-hip-extension` `middle`)**: `baselineDomeBBox: { x: 68, y: 120, width: 106, height: 54 }` (지지 다리 `x:124`와 중첩) → `candidateDomeBBox: { x: 18, y: 123, width: 52, height: 51 }` (지지 다리 `x:124`와 완전 분리, `candidateHand: (88, 76)`)
