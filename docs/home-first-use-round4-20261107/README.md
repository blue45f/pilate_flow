# 필라테스 첫 사용자(초보 강사) 동선 독립 감사 보고서 — Round 4 (2026-11-07)

## 1. 감사 목적, 시나리오 및 엄격한 소유 경계

- **대상 브랜치 / 기준 커밋**: `origin/main` (`ca3817497e1c3eb97f4700b2b44688ba5fb1f63a`)
- **감사 시나리오**:
  - 초보 필라테스 강사가 **긴 설명문을 읽지 않고** 첫 방문부터 재방문까지 아래 5단계 핵심 동선을 수행할 때의 UX·레이아웃·상태 보존을 실제 브라우저(Headless Chromium CDP)와 합성 픽스처로 정밀 측정:
    **`Stage 1: 빈상태(Empty State) → Stage 2: 새수업 동작 2개 추가(Add 2 Movements) → Stage 3: 수업 구성 확인 및 저장(Save) → Stage 4: 다음 방문 이어하기(Next Visit Continue) → Stage 5: 복원 확인 및 뒤로가기 보존`**
- **엄격한 소유 및 무변경 경계 준수**:
  - **본 감사 소유 범위**: `docs/home-first-use-round4-20261107/**` (독립 감사 보고서, 실브라우저 CDP 측정 스크립트, 합성 픽스처, Vitest 감사 테스트, 통합 담당 인계용 상위 3개 패치 제안서, 40장 스크린샷 및 JSON 메트릭)
  - **무변경(0줄 수정) 보호 대상**:
    - 빌더 담당 작업 영역: [`src/components/SequenceWorkbench.tsx`](file:///home/antigravity/blue45f/pilate_flow/src/components/SequenceWorkbench.tsx) 및 모든 `src/**` 애플리케이션 코드 **0줄 수정**
    - 공유 스타일/스토어/라우트/설정: `src/styles/**`, `src/store/**`, `src/App.tsx`, `package.json`, `vite.config.ts` **0줄 수정**
    - 타 CI 담당 소유 영역: `PackagePanel`, `package-panel`, `PackageDetail` 관련 파일 **일절 비접촉(0줄 수정)**
    - 데이터 보호: 실제 사용자 로컬스토리지/개인정보 대신 100% 합성 픽스처([`fixtures/firstUseRound4Fixtures.ts`](file:///home/antigravity/blue45f/pilate_flow/docs/home-first-use-round4-20261107/fixtures/firstUseRound4Fixtures.ts))와 임시 격리 브라우저 프로필만 사용 후 즉시 정리

---

## 2. 실제 존재하는 시안·디자인 기준 파일 및 이미지 대조 (없는 시안 추정 금지)

저장소 내 전수 탐색(`find public/images docs src/styles`)을 통해 **실제 존재하는 시안 문서·래스터/벡터 이미지·이전 라운드 기준 스크린샷**만 대조했으며, 존재하지 않는 외부 시안은 일절 추정하지 않았습니다.

### 2.1 저장소 내 실제 존재하는 기준 파일 및 이미지 대조 결과

| 구분 | 실제 존재하는 파일 경로 | 명세 / 시각 기준 핵심 내용 | 현재 `origin/main` (`ca38174`) 대조 판정 |
| --- | --- | --- | --- |
| **시각 계약 문서** | [`docs/vnext-visual-contract.md`](file:///home/antigravity/blue45f/pilate_flow/docs/vnext-visual-contract.md) | 웜 아이보리(`#fbf8f2`), 딥 세이지(`#17675c`) 단일 Primary CTA 강조, 빈 홈 화면에서 모든 `<details>` 기본 닫힘(`0`개 펼침), 설명문 숨김 | **충족 (일부 중복칩 잔존)** — 빈 상태에서 `<details>` 12개 중 열림 `0`개, `동작 고르기` 세이지 Primary 강조 확인. 단, `.v2-plan-toolbar` 조건 칩 4개가 환영 카드 요약칩과 중복 노출됨 (`IMP-R4-03`) |
| **초보자 동선 QA 명세** | [`docs/qa/beginner-guide-flow-20261107.md`](file:///home/antigravity/blue45f/pilate_flow/docs/qa/beginner-guide-flow-20261107.md)<br>[`docs/qa/design-completion-boundaries-20261107.md`](file:///home/antigravity/blue45f/pilate_flow/docs/qa/design-completion-boundaries-20261107.md) | 3단계 가이드 기본 접힘(`<details>`), 새 수업 만들기 ↔ 최근 수업 이어가기 양방향 전환, 모든 주요 버튼 최소 `44×44px` 터치 타깃 | **충족** — `320`/`390`/`768`/`1440` 전 구간에서 주요 CTA 높이 `44px~45px` (`200%` 확대 시 `88px~194px`) 달성 |
| **반응형 스튜디오 명세** | [`docs/qa/responsive-studio-2026-11-06.md`](file:///home/antigravity/blue45f/pilate_flow/docs/qa/responsive-studio-2026-11-06.md)<br>[`src/styles/atelier-v2.source.md`](file:///home/antigravity/blue45f/pilate_flow/src/styles/atelier-v2.source.md) | `320px`·`390px`·`768px`·`1440px` 및 `200%` 확대에서 가로 스크롤(`overflowPx = 0`) 방지, 모바일 하단 탭바(`bottom-nav`) 고정 | **충족** — 8개 뷰포트×배율 × 5개 스테이지(총 40개 화면) 전 구간 `overflowPx = 0` 실측 |
| **홈 환영 히어로 이미지** | [`public/images/atelier-ring-still-life.png`](file:///home/antigravity/blue45f/pilate_flow/public/images/atelier-ring-still-life.png) | 빈 홈 환영 카드(`.workbench-welcome-image`)에 사용되는 정물 일러스트 | **렌더링 확인 (초소형 `320×568` 개선 여지)** — 모바일에서 상단 높이 `150px`를 차지하여 `390×844`에서는 CTA가 첫 화면 내(`bottom = 363px`)에 들어오나, `320×568 @ 100%`에서 `이어서 구성` 카드를 첫 화면 아래(`top = 769px`)로 밀어냄 (`IMP-R4-03`) |
| **보조 스튜디오 이미지 자산** | [`public/images/atelier-reformer-still-life.png`](file:///home/antigravity/blue45f/pilate_flow/public/images/atelier-reformer-still-life.png)<br>[`public/images/atelier-studio.webp`](file:///home/antigravity/blue45f/pilate_flow/public/images/atelier-studio.webp)<br>`public/images/movement-guides/*.svg` (5종) | 기구/스튜디오 배경 및 동작 가이드 SVG 자산 | **정상 존재 확인** — 홈 첫 화면에서는 `atelier-ring-still-life.png`만 로드하여 초기 네트워크/시각 부담 최소화 |
| **이전 라운드 승인 스크린샷 기준선** | [`docs/parallel-page-home-20261107/after/`](file:///home/antigravity/blue45f/pilate_flow/docs/parallel-page-home-20261107/README.md)<br>[`docs/parallel-page-builder-20261107/screenshots/`](file:///home/antigravity/blue45f/pilate_flow/docs/parallel-page-builder-20261107/REPORT.md) | 홈 개편(`4256230`) 및 빌더 개편(`884da34`) 완료 시점의 `320`/`390`/`768`/`1440` (`100%`·`200%`) 실제 스크린샷 | **일관성 유지 확인** — 홈(`4256230`)과 빌더(`884da34`) 병합 후에도 빈 홈/활성 빌더 레이아웃 침범이나 가로 오버플로우 회귀 없음(`0px`) |

### 2.2 저장소 내 존재하지 않아 추정하지 않은 시안 항목 (No-Hallucination 확인)
- 저장소 내에 별도의 Figma/Sketch/Adobe XD 디자인 원본 파일(`.fig`, `.sketch`, `.xd`)이나 정적 페이지 전체 그래픽 시안 이미지(`docs/mockups/*.png` 등)는 **존재하지 않습니다**.
- 따라서 외부 미존재 시안을 임의로 가정하지 않고, 위 2.1의 **실제 존재하는 시각 계약 문서·QA 명세·정적 이미지 자산·이전 라운드 기준선 스크린샷**만을 기준으로 객관적 대조를 수행했습니다.

---

## 3. 5대 핵심 항목 실브라우저(Headless Chromium CDP) 정밀 측정 결과

전체 원시 데이터는 [`docs/home-first-use-round4-20261107/evidence/first-use-round4-metrics.json`](file:///home/antigravity/blue45f/pilate_flow/docs/home-first-use-round4-20261107/evidence/first-use-round4-metrics.json)에 기록되어 있으며, 재현 스크립트는 [`docs/home-first-use-round4-20261107/verify-home-first-use-round4-browser.mjs`](file:///home/antigravity/blue45f/pilate_flow/docs/home-first-use-round4-20261107/verify-home-first-use-round4-browser.mjs)입니다.

### 3.1 주요 CTA 가시성 (Primary CTA Visibility & Touch Target)

| 뷰포트 × 배율 | Stage 1: `동작 고르기` (`.workbench-first-action`) | Stage 1: `한 줄 아이디어 메모` (`.workbench-idea-action`) | Stage 2: 모달 첫 `+ 추가` 버튼 | Stage 2: 모달 `수업 구성으로 돌아가기` | Stage 3: `저장` (`button.save-flow`) | Stage 3: 첫 시퀀스 카드 (`.flow-step`) | Stage 4: 다음 방문 `이어서 구성` | 가로 오버플로 (`overflowPx`) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| **`320×568 @ 100%`** | `top: 267px`, `bottom: 311px`, `h: 44px` (**첫 화면 내 PASS**) | `top: 319px`, `bottom: 363px`, `h: 44px` (**첫 화면 내 PASS**) | `top: 544px`, `bottom: 588px` (하단 `20px` 걸쳐 노출) | `top: 483px`, `bottom: 527px`, `h: 44px` (모달 스크롤 시 하단 위치) | `top: 442px`, `bottom: 486px`, `h: 44px` (**첫 화면 내 PASS**) | `top: 765px` (`1.35` 화면) | `top: 769px`, `bottom: 813px`, `h: 44px` (**첫 화면 아래 `1.35` 화면 — `IMP-R4-03`**) | **`0px`** |
| **`390×844 @ 100%`** | `top: 267px`, `bottom: 311px`, `h: 44px` (**첫 화면 내 PASS**) | `top: 319px`, `bottom: 363px`, `h: 44px` (**첫 화면 내 PASS**) | `top: 557px`, `bottom: 601px`, `h: 44px` (**첫 화면 내 PASS**) | `top: 745px`, `bottom: 789px`, `h: 44px` (**첫 화면 내 PASS**) | `top: 392px`, `bottom: 436px`, `h: 44px` (**첫 화면 내 PASS**) | `top: 663px` (**`0.79` 화면 내 PASS**) | `top: 678px`, `bottom: 722px`, `h: 44px` (**첫 화면 내 `0.80` 화면 PASS**) | **`0px`** |
| **`768×1024 @ 100%`** | `top: 270px`, `bottom: 315px`, `h: 45px` (**첫 화면 내 PASS**) | `top: 270px`, `bottom: 314px`, `h: 44px` (**첫 화면 내 PASS**) | `top: 765px`, `bottom: 809px`, `h: 44px` (**첫 화면 내 PASS**) | `top: 915px`, `bottom: 960px`, `h: 45px` (**첫 화면 내 PASS**) | `top: 335px`, `bottom: 379px`, `h: 44px` (**첫 화면 내 PASS**) | `top: 572px` (**`0.56` 화면 내 PASS**) | `top: 495px`, `bottom: 539px`, `h: 44px` (**첫 화면 내 `0.48` 화면 PASS**) | **`0px`** |
| **`1440×900 @ 100%`** | `top: 265px`, `bottom: 310px`, `h: 45px` (**첫 화면 내 PASS**) | `top: 266px`, `bottom: 310px`, `h: 44px` (**첫 화면 내 PASS**) | `top: 696px`, `bottom: 740px`, `h: 44px` (**첫 화면 내 PASS**) | `top: 798px`, `bottom: 842px`, `h: 44px` (**첫 화면 내 PASS**) | `top: 346px`, `bottom: 390px`, `h: 44px` (**첫 화면 내 PASS**) | `top: 583px` (**`0.65` 화면 내 PASS**) | `top: 497px`, `bottom: 541px`, `h: 44px` (**첫 화면 내 `0.55` 화면 PASS**) | **`0px`** |
| **`320×568 @ 200%`** | `top: 1039px`, `h: 119px` (`1.83` 화면) | `top: 1174px`, `h: 194px` (`2.07` 화면) | `top: 2646px`, `h: 88px` | `top: 1049px`, `h: 184px` (`1.85` 화면) | `top: 179px`, `bottom: 267px`, `h: 88px` (**첫 화면 내 PASS**) | `top: 1344px` (`2.37` 화면) | `top: 2749px`, `h: 149px` | **`0px`** |
| **`390×844 @ 200%`** | `top: 894px`, `h: 119px` (`1.06` 화면) | `top: 1029px`, `h: 119px` (`1.22` 화면) | `top: 1485px`, `h: 88px` | `top: 1042px`, `h: 114px` (`1.23` 화면) | `top: 317px`, `bottom: 405px`, `h: 88px` (**첫 화면 내 PASS**) | `top: 1482px` (`1.76` 화면) | `top: 2366px`, `h: 114px` | **`0px`** |
| **`768×1024 @ 200%`** | `top: 540px`, `bottom: 630px`, `h: 90px` (**첫 화면 내 PASS**) | `top: 650px`, `bottom: 738px`, `h: 88px` (**첫 화면 내 PASS**) | `top: 885px`, `bottom: 973px`, `h: 88px` (**첫 화면 내 PASS**) | `top: 1274px`, `h: 134px` (`1.24` 화면) | `top: 818px`, `bottom: 906px`, `h: 88px` (**첫 화면 내 PASS**) | `top: 1482px` (`1.45` 화면) | `top: 1373px`, `h: 88px` (`1.34` 화면) | **`0px`** |
| **`1440×900 @ 200%`** | `top: 530px`, `bottom: 621px`, `h: 90px` (**첫 화면 내 PASS**) | `top: 532px`, `bottom: 620px`, `h: 88px` (**첫 화면 내 PASS**) | `top: 912px`, `h: 88px` (`1.01` 화면) | `top: 1145px`, `h: 89px` (`1.27` 화면) | `top: 324px`, `bottom: 412px`, `h: 88px` (**첫 화면 내 PASS**) | `top: 884px` (`0.98` 화면) | `top: 1125px`, `h: 88px` (`1.25` 화면) | **`0px`** |

---

### 3.2 단계별 및 전체 클릭수 (Click Count Analysis)

초보 강사가 **설명문을 읽지 않고** `빈상태 → 새수업 → 동작 2개 추가 → 저장 → 다음 방문 이어하기`를 수행할 때의 클릭수를 **최적 경로(Optimal Path)**와 **초보자가 겪는 실제 마찰 경로(Unassisted Beginner Trap Path)**로 분리 측정했습니다.

| 단계 | 동작 내용 | 최적 클릭수 (Optimal) | 초보자 함정 경유 클릭수 (Trapped) | 클릭수 차이 원인 및 관련 파일 |
| --- | --- | --- | --- | --- |
| **Stage 1: 빈상태 → 새수업 시작** | 빈 홈에서 `동작 고르기`(`.workbench-first-action`) 클릭 | **`1`클릭** | **`1`클릭** | 첫 화면 상단 세이지색 Primary 버튼으로 즉시 인지 가능 |
| **Stage 2: 동작 2개 추가 후 수업 구성 복귀** | 모달(`InlineExerciseFinder`)에서 동작 2개 `+ 추가` 후 `수업 구성으로 돌아가기` 클릭 | **`3`클릭** (`+ 추가` × 2, `수업 구성으로 돌아가기` × 1) | **`6`클릭** (`+3`클릭 손실) | 1) **`IMP-R4-01` (`+2`클릭 손실)**: 모달 초기 기구 필터(`filters.equipment`)가 수업 기구(`classEquipment`)가 아닌 전체 기구(`[]`)로 열려, 1번째 카드(`캐리지 호흡 & 암 아크`, 리포머)와 2번째 카드(`누워서 호흡 관찰`, 매트)가 혼재됨. 상위 2개 카드의 `+ 추가`를 연속 클릭하면 1개만 담기고 나머지 1개는 기구 불일치 오류로 거부되어 `수업 기구로 좁히기` 클릭 후 2번째 동작을 다시 추가해야 함.<br>2) **`IMP-R4-02` (`+1`클릭 손실)**: 모달 내부 하단 `.ief-selection-bar`의 `← 수업안으로` 버튼 클릭 시 모달이 닫히지 않는 무동작(`no-op`)이 발생해 아래 `.workbench-finder-footer`의 `수업 구성으로 돌아가기`를 다시 눌러야 함. |
| **Stage 3: 저장 (Save)** | 시퀀스 상단 `저장`(`button.save-flow`) 클릭 | **`1`클릭** | **`1`클릭** | `320`/`390`/`768`/`1440` (`100%` 및 `200%`) 전 구간에서 첫 화면 상단(`top = 179px~442px`)에 노출됨. 단, 미저장 새 시퀀스일 때도 `variant="secondary"`로 되어 있어 시각적 강조도 보강 가능 (`IMP-R4-03`) |
| **Stage 4: 다음 방문 이어하기** | 다음 방문(빈 홈 화면)에서 `.workbench-recent-continue`의 `이어서 구성` 클릭 *(참고: 이미 시퀀스가 열린 상태에서 상단 바 드롭다운으로 전환 시 2클릭)* | **`1`클릭** (빈 홈 진입 기준) / `2`클릭 (활성 편집 바 기준) | **`1`클릭** (빈 홈 진입 기준) | `390×844`·`768×1024`·`1440×900` `@ 100%`에서는 빈 홈 첫 화면 안에서 1클릭 즉시 복원. `320×568 @ 100%`에서는 `top = 769px`로 약 `200px` 스크롤 후 1클릭 복원 (`IMP-R4-03`) |
| **합계 (End-to-End Total)** | **전체 5단계 완주** | **`6`클릭** | **`9`클릭** (`+3` 헛클릭) | `IMP-R4-01` + `IMP-R4-02` 패치 적용 시 설명문 없이도 항상 **6클릭**으로 수렴 |

---

### 3.3 중복메뉴 정량 감사 (Duplicate Menus & Redundant Controls)

각 화면 상태에서 동일한 기능/목적지를 가리키는 버튼이 동시에 몇 개 노출되는지 전수 집계했습니다.

| 화면 상태 | 기능 그룹 | 동시 노출 개수 | 실제 렌더링된 버튼/트리거 목록 및 코드 위치 | 판정 및 개선안 |
| --- | --- | --- | --- | --- |
| **Stage 1: 빈 홈 화면 (`activeSteps === 0`)** | **수업 조건 열기 (`setConditionsOpen(true)`)** | **`5`개 (과다 중복)** | 1) 환영 카드 상단 칩 `50분 · 리포머/매트` ([`SequenceWorkbench.tsx#L823-L832`](file:///home/antigravity/blue45f/pilate_flow/src/components/SequenceWorkbench.tsx#L823-L832))<br>2) `.v2-condition-chips` `50분`<br>3) `.v2-condition-chips` `리포머/매트`<br>4) `.v2-condition-chips` `전신 균형`<br>5) `.v2-condition-chips` `수업 조건` 아이콘 버튼 ([`SequenceWorkbench.tsx#L1054-L1087`](file:///home/antigravity/blue45f/pilate_flow/src/components/SequenceWorkbench.tsx#L1054-L1087)) | **미해결 (`IMP-R4-03`)** — 빈 홈에서는 환영 카드의 단일 요약칩(`50분 · 리포머`)만 남기고 `.v2-plan-toolbar`를 숨기면 `5개 → 1개`로 감소 및 세로 공간 `~58px` 확보 |
| **Stage 1: 빈 홈 화면 (`activeSteps === 0`)** | **새 동작 아이디어 메모 열기 (`openIdeaSheet(null)`)** | **`2`개** (아이디어 섹션 펼침 시 `3`개) | 1) 상단 글로벌 헤더 `새 동작` (`button.app-create-movement`, [`App.tsx#L425-L433`](file:///home/antigravity/blue45f/pilate_flow/src/App.tsx#L425-L433))<br>2) 환영 카드 보조 CTA `한 줄 아이디어 메모` (`.workbench-idea-action`, [`SequenceWorkbench.tsx#L847-L853`](file:///home/antigravity/blue45f/pilate_flow/src/components/SequenceWorkbench.tsx#L847-L853))<br>*(3) `.pf-workbench-ideas__header` `새 동작 아이디어 적기` — [`SequenceWorkbench.tsx#L714-L720`](file:///home/antigravity/blue45f/pilate_flow/src/components/SequenceWorkbench.tsx#L714-L720))* | 글로벌 헤더 1개 + 환영 카드 내 선택지 1개로 허용 범위 내이나, 라벨이 `새 동작` vs `한 줄 아이디어 메모` vs `새 동작 아이디어 적기`로 상이함 |
| **Stage 2: 동작 고르기 모달 (`finderOpen === true`)** | **수업안 선택 개수 요약 & 돌아가기 하단 바** | **`2`개 상하 중복 (1개는 무동작 버그)** | 1) `InlineExerciseFinder` 내부 `.ief-selection-bar`: `수업안에 N개 선택` + `← 수업안으로` ([`InlineExerciseFinder.tsx#L635-L642`](file:///home/antigravity/blue45f/pilate_flow/src/components/InlineExerciseFinder.tsx#L635-L642)) — **모달 안에서 클릭 시 닫히지 않는 무동작!**<br>2) `LightDismissDialog` 푸터 `.workbench-finder-footer`: `N개 동작 · MM:SS` + `수업 구성으로 돌아가기 →` ([`SequenceWorkbench.tsx#L1961-L1968`](file:///home/antigravity/blue45f/pilate_flow/src/components/SequenceWorkbench.tsx#L1961-L1968)) | **미해결 핵심 결함 (`IMP-R4-02`)** — 모달 안에서는 `.ief-selection-bar`를 숨기고 `.workbench-finder-footer`만 Sticky로 단일 노출해야 함 |
| **Stage 3: 동작 2개 추가 후 활성 화면 (`activeSteps === 2`)** | **새 동작 / 한 줄 동작 메모 열기** | **`3`개** (접힌 섹션 포함 시 `4`개) | 1) 상단 헤더 `새 동작` ([`App.tsx#L425-L433`](file:///home/antigravity/blue45f/pilate_flow/src/App.tsx#L425-L433))<br>2) 시퀀스 상단 툴바 `한 줄 동작 메모` ([`SequenceWorkbench.tsx#L1337-L1340`](file:///home/antigravity/blue45f/pilate_flow/src/components/SequenceWorkbench.tsx#L1337-L1340))<br>3) 시퀀스 하단 `.pf-flow-continuation` `한 줄 동작 메모` ([`SequenceWorkbench.tsx#L1675-L1677`](file:///home/antigravity/blue45f/pilate_flow/src/components/SequenceWorkbench.tsx#L1675-L1677)) | 상단(`.sequence-tools`)과 하단(`.pf-flow-continuation`)에 동일 버튼 배치. 하단 `.pf-flow-continuation`은 `한 줄 동작 메모` 대신 `수업안 저장` 보조 트리거로 활용 시 스크롤 후 저장 동선 단축 가능 |
| **Stage 3: 동작 2개 추가 후 활성 화면 (`activeSteps === 2`)** | **동작 더 담기 / 동작 추가 (`openExerciseFinder`)** | **`2`개** (접힌 섹션 포함 시 `4`개) | 1) 시퀀스 상단 `.sequence-tools` `동작 더 담기` ([`SequenceWorkbench.tsx#L1333-L1336`](file:///home/antigravity/blue45f/pilate_flow/src/components/SequenceWorkbench.tsx#L1333-L1336))<br>2) 시퀀스 하단 `.v3-primary-actions` `동작 추가` ([`SequenceWorkbench.tsx#L1625-L1631`](file:///home/antigravity/blue45f/pilate_flow/src/components/SequenceWorkbench.tsx#L1625-L1631)) | 상단/하단 1개씩 배치되어 긴 시퀀스에서도 스크롤 없이 접근 가능 (적정) |

---

### 3.4 첫화면 정보량 (First-Screen Information Density)

빈 홈 화면(`Stage 1`)과 동작 2개 추가 직후 화면(`Stage 3`)의 뷰포트·배율별 첫 화면(Above-the-Fold, `0 <= top && bottom <= innerHeight`) 정보 밀도 실측치입니다.

| 뷰포트 × 배율 | Stage 1 첫화면 버튼 수 / 전체 버튼 수 | Stage 1 첫화면 텍스트 글자 수 / 전체 글자 수 | Stage 1 열려 있는 `<details>` 수 / 전체 `<details>` 수 | Stage 1 전체 세로 화면 수 (`screensTotal`) | Stage 3 첫 시퀀스 카드 시작 위치 (`top` / `screensFromTop`) | Stage 3 열려 있는 `<details>` 수 |
| --- | --- | --- | --- | --- | --- | --- |
| **`320×568 @ 100%`** | `14 / 28` | `124 / 372자` | **`0 / 12`** | `2.38` 화면 | `765px` (`1.35` 화면) | **`0`** |
| **`390×844 @ 100%`** | `18 / 28` | `150 / 372자` | **`0 / 12`** | `1.53` 화면 | `663px` (**`0.79` 화면 — 첫 화면 내 노출**) | **`0`** |
| **`768×1024 @ 100%`** | `26 / 28` | `249 / 372자` | **`0 / 12`** | `1.12` 화면 | `572px` (**`0.56` 화면 — 첫 화면 내 노출**) | **`0`** |
| **`1440×900 @ 100%`** | `26 / 32` | `213 / 372자` | **`0 / 12`** | `1.36` 화면 | `583px` (**`0.65` 화면 — 첫 화면 내 노출**) | **`0`** |
| **`320×568 @ 200%`** | `8 / 28` | `22 / 372자` | **`0 / 12`** | `3.15` 화면 | `1344px` (`2.37` 화면) | **`0`** |
| **`390×844 @ 200%`** | `9 / 28` | `31 / 372자` | **`0 / 12`** | `2.01` 화면 | `1482px` (`1.76` 화면) | **`0`** |
| **`768×1024 @ 200%`** | `13 / 28` | `86 / 372자` | **`0 / 12`** | `1.36` 화면 | `1482px` (`1.45` 화면) | **`0`** |
| **`1440×900 @ 200%`** | `12 / 32` | `86 / 372자` | **`0 / 12`** | `1.53` 화면 | `884px` (`0.98` 화면) | **`0`** |

- **밀도 핵심 평가**:
  - 이전 홈 개편(`4256230`)과 빌더 개편(`884da34`)을 통해 **빈 홈 화면과 활성 시퀀스 화면 모두 기본 열려 있는 `<details>`가 `0`개**로 통제되어 있으며, 긴 설명문(`무료 한도 보호 · 소진 시 로컬 전환`, `새 동작 메모·선택을 마쳤다면...` 등)은 `.sr-only` 및 접힌 `<details>` 뒤로 숨겨져 첫 화면 텍스트가 전체 `372자`(`390×844` 첫 화면 `150자`) 수준으로 간결하게 유지됩니다.
  - 다만 Stage 1 첫 화면 버튼 `18개`(`390×844`) 중 **4개는 중복된 `.v2-condition-chips` 버튼**이므로 `IMP-R4-03` 적용 시 첫 화면 버튼 수를 `18개 → 14개`로 즉시 줄일 수 있습니다.

---

### 3.5 뒤로가기 및 상태 보존 5종 정밀 검증 (Back-Navigation & State Preservation)

실제 Chromium 브라우저(`390×844`)에서 동작 2개를 추가한 뒤 발생할 수 있는 5가지 이탈/복귀 시나리오와 브라우저 하드웨어 뒤로가기(`history.back()`) 동작을 검증했습니다.

| 검증 ID | 이탈 / 뒤로가기 시나리오 | 실브라우저 측정 결과 (`first-use-round4-metrics.json`) | 판정 |
| --- | --- | --- | --- |
| **`BACK-01`** | `동작 고르기` 모달에서 동작 2개 추가 후 모달 닫기(`수업 구성으로 돌아가기` / `Escape`) | `stepsPreservedAfterFinderClose: 2` (`2개 동작` 100% 보존) | **PASS** |
| **`BACK-02`** | 동작 2개 구성 중 상단 `새 동작`(`MovementIdeaSheet`) 시트 열기 후 닫기 | `stepsPreservedAfterIdeaSheetClose: 2` (`2개 동작` 100% 보존) | **PASS** |
| **`BACK-03`** | 하단 탭바를 통해 `수업(workbench) → 동작(atlas) → 저장(binder) → 수업(workbench)` 왕복 전환 | `stepsPreservedAfterTabRoundtrip: 2` (`2개 동작` 및 제목 100% 보존) | **PASS** |
| **`BACK-04`** | 실수로 상단 `새 수업 만들기` 클릭(`0개`로 초기화) 직후 `되돌리기`(`undoSequence`) 클릭 | `countImmediatelyAfterNewClass: 0` → `countAfterUndo: 2` (`2개 동작` 및 원래 제목 100% 복원) | **PASS** |
| **`BACK-05`** | `저장` 클릭 후 브라우저 전체 새로고침(`Page.reload`) 및 다음 방문 빈 화면에서 `이어서 구성` 클릭 | `stepsAfterReload: 2`, `savedSequencesCountAfterReload: 1`, `resumedStepCards: 2` (100% 보존) | **PASS** |
| **`BACK-INFO`** | 모바일 OS/브라우저 물리 뒤로가기(`window.history.back()`) 시 모달 히스토리 스택 연동 여부 | `pushesBrowserHistoryOnModalOpen: false` (`LightDismissDialog` 오픈 시 `history.pushState`를 호출하지 않아 브라우저 물리 뒤로가기 시 모달 닫힘 대신 이전 URL로 이동 가능 — 참고 정보로 기록) | **INFO (참고)** |

---

## 4. 기존 해결 완료(`<= ca38174`) vs 미해결 잔여 사항 구분표

통합 담당이 이미 완료된 작업을 재구현하지 않도록, 최신 `origin/main`(`ca38174`)에서 **이미 해결 완료된 항목**과 **이번 감사에서 확인된 미해결 항목**을 명확히 구분했습니다.

| 구분 | 항목 | 관련 커밋 / 소유 영역 | 상태 |
| --- | --- | --- | --- |
| **기존 해결 완료** | 빈 홈 화면에 `새 수업 만들기` 환영 카드 + `최근 수업 이어가기` 섹션 상단 배치 및 빈 상태 안내 문구 제공 | `ba24c66` / `4256230` (`SequenceWorkbench.tsx`, `release-mobile-clarity.css`) | **해결 완료 (재구현 불필요)** |
| **기존 해결 완료** | 긴 설명문 및 기술 상태 배지(`.sr-only` 전환) 숨김, 3단계 가이드/자동구성/도해/AI 도우미 `<details>` 기본 접힘(`openDetailsCount = 0`) | `ba24c66` / `4256230` | **해결 완료 (재구현 불필요)** |
| **기존 해결 완료** | 시퀀스 편집 중(`activeSteps > 0`) 상단 `.workbench-home-flow-bar`(`새 수업 만들기` / `최근 수업 이어가기` 드롭다운) 제공 및 `되돌리기`(`undoSequence`) 보호 | `ba24c66` / `4256230` | **해결 완료 (재구현 불필요)** |
| **기존 해결 완료** | 시퀀스 동작 추가 후 `.pf-workbench-ideas` 자동 접힘, 상단 `.sequence-tools`에 `한 줄 동작 메모` 배치, `320`/`390`/`768`/`1440` (`100%`·`200%`) 가로 오버플로우 `0px` 달성 | `884da34` (`SequenceWorkbench.tsx`, `sequence-composition.css`) | **해결 완료 (재구현 불필요)** |
| **기존 해결 완료** | 재사용 블록 삽입 후 저장·새로고침 시 `selectedLayer` 정규화를 통한 시퀀스 유실 방지 | `884da34` (`SequenceWorkbench.tsx`) | **해결 완료 (재구현 불필요)** |
| **미해결 (신규 발견 1)** | **`IMP-R4-01`**: `동작 고르기`(`InlineExerciseFinder`) 오픈 시 초기 기구 필터(`filters.equipment`)가 수업 기구(`classEquipment`)가 아닌 전체 기구(`[]`)로 열려, 상위 1·2번째 카드 클릭 시 기구 불일치로 1개가 거부되고 `+2`클릭 손실 발생 | [`src/components/InlineExerciseFinder.tsx`](file:///home/antigravity/blue45f/pilate_flow/src/components/InlineExerciseFinder.tsx#L46-L81) | **미해결 → 통합 패치 제안 1** |
| **미해결 (신규 발견 2)** | **`IMP-R4-02`**: `동작 고르기` 모달 내부 하단 `.ief-selection-bar`(`← 수업안으로`)가 `.workbench-finder-footer`(`수업 구성으로 돌아가기`)와 상하 중복 노출되며, 모달 안에서 `← 수업안으로` 클릭 시 모달이 닫히지 않는 무동작(`no-op`, `+1`클릭 손실) 및 모달 푸터 비-Sticky 문제 | [`src/components/InlineExerciseFinder.tsx`](file:///home/antigravity/blue45f/pilate_flow/src/components/InlineExerciseFinder.tsx#L635-L642), [`src/components/SequenceWorkbench.tsx`](file:///home/antigravity/blue45f/pilate_flow/src/components/SequenceWorkbench.tsx#L1951-L1968), [`src/styles/release-mobile-clarity.css`](file:///home/antigravity/blue45f/pilate_flow/src/styles/release-mobile-clarity.css#L305-L312) | **미해결 → 통합 패치 제안 2** |
| **미해결 (신규 발견 3)** | **`IMP-R4-03`**: 빈 홈 화면(`activeSteps === 0`)에서 `.v2-plan-toolbar` 수업 조건 버튼 4개가 환영 카드 요약칩(`50분 · 리포머/매트`)과 중복 노출(총 5개)되고, 초소형 `320×568`에서 환영 이미지(`150px`) + 중복 툴바로 인해 `최근 수업 이어가기`가 첫 화면 아래(`top = 769px`)로 밀려남; 미저장 시퀀스의 `저장` 버튼이 `secondary` 변형으로 표시됨 | [`src/components/SequenceWorkbench.tsx`](file:///home/antigravity/blue45f/pilate_flow/src/components/SequenceWorkbench.tsx#L1054-L1125), [`src/styles/release-mobile-clarity.css`](file:///home/antigravity/blue45f/pilate_flow/src/styles/release-mobile-clarity.css#L38-L55) | **미해결 → 통합 패치 제안 3** |

---

## 5. 통합 담당 인계용 상위 3개 재현가능 개선안 (Top 3 Reproducible Improvements)

통합 담당이 빌더 작업 완료 후 충돌 없이 즉시 적용할 수 있도록 Unified Diff 패치 파일([`docs/home-first-use-round4-20261107/patches/top3-home-first-use-improvements.patch`](file:///home/antigravity/blue45f/pilate_flow/docs/home-first-use-round4-20261107/patches/top3-home-first-use-improvements.patch))로 작성했습니다.

### 개선안 1 (`IMP-R4-01`, 우선순위 P1): `InlineExerciseFinder` 초기 기구 필터를 `classEquipment`와 동기화하여 첫 동작 추가 실패 제거
- **정확한 소유 파일 및 줄번호**:
  - [`src/components/InlineExerciseFinder.tsx`](file:///home/antigravity/blue45f/pilate_flow/src/components/InlineExerciseFinder.tsx#L46-L52) (`emptyFilters` 함수)
  - [`src/components/InlineExerciseFinder.tsx`](file:///home/antigravity/blue45f/pilate_flow/src/components/InlineExerciseFinder.tsx#L78-L106) (`useState(() => emptyFilters(classEquipment))` 및 `reset`)
- **재현 방법**:
  1. 빈 홈 화면(`50분 · 리포머` 또는 `50분 · 매트`)에서 `동작 고르기` 클릭
  2. 설명문을 읽지 않고 모달 상단 1번째 카드(`캐리지 호흡 & 암 아크`, 리포머)와 2번째 카드(`누워서 호흡 관찰`, 매트)의 `+ 추가` 버튼을 차례로 클릭
  3. 두 카드의 기구가 서로 달라 **반드시 1개만 추가되고 1개는 `현재 선택한 기구·소도구와 최대 난이도 조건에 맞는 동작만 추가할 수 있습니다.` 오류 배너와 함께 거부됨** (`Vitest` [`homeFirstUseRound4.audit.test.tsx`](file:///home/antigravity/blue45f/pilate_flow/docs/home-first-use-round4-20261107/homeFirstUseRound4.audit.test.tsx#L82-L90) 및 Chromium `firstTwoUnfilteredRejectedOne: true`로 100% 재현)
- **스크린샷 증적**: [`evidence/screenshots/s2-finder-modal-390-z100.png`](file:///home/antigravity/blue45f/pilate_flow/docs/home-first-use-round4-20261107/evidence/screenshots/s2-finder-modal-390-z100.png), [`evidence/screenshots/s2-finder-modal-1440-z100.png`](file:///home/antigravity/blue45f/pilate_flow/docs/home-first-use-round4-20261107/evidence/screenshots/s2-finder-modal-1440-z100.png)
- **최소 패치 요약**: `emptyFilters(classEquipment)`로 초기 `filters.equipment`를 `[...classEquipment]`로 설정(강사가 원할 때만 `전체 기구 보기` 클릭). 적용 시 Stage 2 클릭수가 `5클릭 → 3클릭`으로 단축되고 첫 사용 오류 배너가 0건이 됩니다.

### 개선안 2 (`IMP-R4-02`, 우선순위 P1): `동작 고르기` 모달 내부 중복 하단 바(`.ief-selection-bar`) 숨김 및 모달 푸터 Sticky 고정
- **정확한 소유 파일 및 줄번호**:
  - [`src/components/InlineExerciseFinder.tsx`](file:///home/antigravity/blue45f/pilate_flow/src/components/InlineExerciseFinder.tsx#L31-L36), [`#L635-L642`](file:///home/antigravity/blue45f/pilate_flow/src/components/InlineExerciseFinder.tsx#L635-L642) (`hideSelectionBar`, `onReturnToWorkbench` prop 추가)
  - [`src/components/SequenceWorkbench.tsx`](file:///home/antigravity/blue45f/pilate_flow/src/components/SequenceWorkbench.tsx#L1951-L1968) (`<InlineExerciseFinder hideSelectionBar onReturnToWorkbench={closeFinder} ... />`)
  - [`src/styles/release-mobile-clarity.css`](file:///home/antigravity/blue45f/pilate_flow/src/styles/release-mobile-clarity.css#L305-L312) (`.workbench-finder-dialog .workbench-finder-footer { position: sticky; bottom: 0; ... }`)
- **재현 방법**:
  1. `동작 고르기` 모달에서 동작 2개 추가 후 하단으로 스크롤
  2. `.ief-selection-bar`(`수업안에 2개 선택 · ← 수업안으로`)와 `.workbench-finder-footer`(`2개 동작 · 07:35 · 수업 구성으로 돌아가기 →`)가 위아래로 겹쳐 보임
  3. 위쪽 `← 수업안으로` 버튼을 클릭하면 이미 `activeTab === 'workbench'`이므로 **모달이 닫히지 않음** (`dialogStillOpenAfterSelectionBarClick: true`)
- **스크린샷 증적**: [`evidence/screenshots/s2-finder-modal-768-z100.png`](file:///home/antigravity/blue45f/pilate_flow/docs/home-first-use-round4-20261107/evidence/screenshots/s2-finder-modal-768-z100.png), [`evidence/screenshots/s2-finder-modal-320-z100.png`](file:///home/antigravity/blue45f/pilate_flow/docs/home-first-use-round4-20261107/evidence/screenshots/s2-finder-modal-320-z100.png)
- **최소 패치 요약**: 모달 내부에서는 `.ief-selection-bar`를 숨기고 `.workbench-finder-footer`를 모달 하단에 `sticky`로 고정하여 무동작 헛클릭(`+1클릭`)을 제거하고 `320px`/`200%` 확대에서도 복귀 CTA 가시성을 보장합니다.

### 개선안 3 (`IMP-R4-03`, 우선순위 P2): 빈 첫 화면 중복 수업 조건 바(`.v2-plan-toolbar`) 조건부 숨김, `320×568` 환영 이미지 축소 및 미저장 `저장` CTA Primary 강조
- **정확한 소유 파일 및 줄번호**:
  - [`src/components/SequenceWorkbench.tsx`](file:///home/antigravity/blue45f/pilate_flow/src/components/SequenceWorkbench.tsx#L1054-L1087) (`{s.activeSteps.length > 0 && (<div className="v2-plan-toolbar">...</div>)}`)
  - [`src/components/SequenceWorkbench.tsx`](file:///home/antigravity/blue45f/pilate_flow/src/components/SequenceWorkbench.tsx#L1117-L1125) (`variant={!s.activeSequenceId ? "primary" : "secondary"}`)
  - [`src/styles/release-mobile-clarity.css`](file:///home/antigravity/blue45f/pilate_flow/src/styles/release-mobile-clarity.css#L38-L50) (`@media (max-width: 389px), (max-height: 640px)`에서 `.workbench-welcome-image { height: 84px; max-height: 84px; }`)
- **재현 방법**:
  1. 빈 홈 화면(`activeSteps.length === 0`)에서 수업 조건을 여는 버튼 개수를 세면 `.workbench-welcome-summary`(`1개`) + `.v2-condition-chips`(`4개`) = **총 5개**가 동시에 노출됨
  2. `320×568 @ 100%`에서 다음 방문 시 `.workbench-recent-continue`의 `이어서 구성` 버튼이 `top = 769px` (`1.35` 화면)에 위치해 첫 화면 아래로 밀려남
- **스크린샷 증적**: [`evidence/screenshots/s1-empty-home-320-z100.png`](file:///home/antigravity/blue45f/pilate_flow/docs/home-first-use-round4-20261107/evidence/screenshots/s1-empty-home-320-z100.png), [`evidence/screenshots/s4-next-visit-continue-320-z100.png`](file:///home/antigravity/blue45f/pilate_flow/docs/home-first-use-round4-20261107/evidence/screenshots/s4-next-visit-continue-320-z100.png), [`evidence/screenshots/s3-arranged-2steps-390-z100.png`](file:///home/antigravity/blue45f/pilate_flow/docs/home-first-use-round4-20261107/evidence/screenshots/s3-arranged-2steps-390-z100.png)
- **최소 패치 요약**: 빈 상태에서 중복 `.v2-plan-toolbar`를 숨겨 수업 조건 트리거를 `5개 → 1개`로 줄이고, 초소형 화면 환영 이미지 높이를 `150px → 84px`로 줄여 세로 공간 약 `124px`를 첫 화면에 반환하며, 아직 저장되지 않은 새 수업(`!s.activeSequenceId`)의 `저장` 버튼을 `primary`로 강조합니다.

---

## 6. 스크린샷 및 증거 아티팩트 전체 목록 (`docs/home-first-use-round4-20261107/`)

- **실브라우저 측정 JSON**: [`evidence/first-use-round4-metrics.json`](file:///home/antigravity/blue45f/pilate_flow/docs/home-first-use-round4-20261107/evidence/first-use-round4-metrics.json)
- **실브라우저 CDP 측정 스크립트**: [`verify-home-first-use-round4-browser.mjs`](file:///home/antigravity/blue45f/pilate_flow/docs/home-first-use-round4-20261107/verify-home-first-use-round4-browser.mjs)
- **합성 픽스처**: [`fixtures/firstUseRound4Fixtures.ts`](file:///home/antigravity/blue45f/pilate_flow/docs/home-first-use-round4-20261107/fixtures/firstUseRound4Fixtures.ts)
- **Vitest 감사 테스트 스위트**: [`homeFirstUseRound4.audit.test.tsx`](file:///home/antigravity/blue45f/pilate_flow/docs/home-first-use-round4-20261107/homeFirstUseRound4.audit.test.tsx) (`4 passed`)
- **통합 담당 인계용 Unified Diff 패치**: [`patches/top3-home-first-use-improvements.patch`](file:///home/antigravity/blue45f/pilate_flow/docs/home-first-use-round4-20261107/patches/top3-home-first-use-improvements.patch)
- **독립 검증(Track B) 보고서**: [`TRACK_B_INDEPENDENT_VERIFICATION.md`](file:///home/antigravity/blue45f/pilate_flow/docs/home-first-use-round4-20261107/TRACK_B_INDEPENDENT_VERIFICATION.md)
- **뷰포트·배율·단계별 스크린샷 (총 40장)**:
  - `320×568` (`100%` / `200%`):
    - [`s1-empty-home-320-z100.png`](file:///home/antigravity/blue45f/pilate_flow/docs/home-first-use-round4-20261107/evidence/screenshots/s1-empty-home-320-z100.png), [`s1-empty-home-320-z200.png`](file:///home/antigravity/blue45f/pilate_flow/docs/home-first-use-round4-20261107/evidence/screenshots/s1-empty-home-320-z200.png)
    - [`s2-finder-modal-320-z100.png`](file:///home/antigravity/blue45f/pilate_flow/docs/home-first-use-round4-20261107/evidence/screenshots/s2-finder-modal-320-z100.png), [`s2-finder-modal-320-z200.png`](file:///home/antigravity/blue45f/pilate_flow/docs/home-first-use-round4-20261107/evidence/screenshots/s2-finder-modal-320-z200.png)
    - [`s3-arranged-2steps-320-z100.png`](file:///home/antigravity/blue45f/pilate_flow/docs/home-first-use-round4-20261107/evidence/screenshots/s3-arranged-2steps-320-z100.png), [`s3-arranged-2steps-320-z200.png`](file:///home/antigravity/blue45f/pilate_flow/docs/home-first-use-round4-20261107/evidence/screenshots/s3-arranged-2steps-320-z200.png)
    - [`s4-next-visit-continue-320-z100.png`](file:///home/antigravity/blue45f/pilate_flow/docs/home-first-use-round4-20261107/evidence/screenshots/s4-next-visit-continue-320-z100.png), [`s4-next-visit-continue-320-z200.png`](file:///home/antigravity/blue45f/pilate_flow/docs/home-first-use-round4-20261107/evidence/screenshots/s4-next-visit-continue-320-z200.png)
    - [`s5-resumed-sequence-320-z100.png`](file:///home/antigravity/blue45f/pilate_flow/docs/home-first-use-round4-20261107/evidence/screenshots/s5-resumed-sequence-320-z100.png), [`s5-resumed-sequence-320-z200.png`](file:///home/antigravity/blue45f/pilate_flow/docs/home-first-use-round4-20261107/evidence/screenshots/s5-resumed-sequence-320-z200.png)
  - `390×844` (`100%` / `200%`):
    - [`s1-empty-home-390-z100.png`](file:///home/antigravity/blue45f/pilate_flow/docs/home-first-use-round4-20261107/evidence/screenshots/s1-empty-home-390-z100.png), [`s1-empty-home-390-z200.png`](file:///home/antigravity/blue45f/pilate_flow/docs/home-first-use-round4-20261107/evidence/screenshots/s1-empty-home-390-z200.png)
    - [`s2-finder-modal-390-z100.png`](file:///home/antigravity/blue45f/pilate_flow/docs/home-first-use-round4-20261107/evidence/screenshots/s2-finder-modal-390-z100.png), [`s2-finder-modal-390-z200.png`](file:///home/antigravity/blue45f/pilate_flow/docs/home-first-use-round4-20261107/evidence/screenshots/s2-finder-modal-390-z200.png)
    - [`s3-arranged-2steps-390-z100.png`](file:///home/antigravity/blue45f/pilate_flow/docs/home-first-use-round4-20261107/evidence/screenshots/s3-arranged-2steps-390-z100.png), [`s3-arranged-2steps-390-z200.png`](file:///home/antigravity/blue45f/pilate_flow/docs/home-first-use-round4-20261107/evidence/screenshots/s3-arranged-2steps-390-z200.png)
    - [`s4-next-visit-continue-390-z100.png`](file:///home/antigravity/blue45f/pilate_flow/docs/home-first-use-round4-20261107/evidence/screenshots/s4-next-visit-continue-390-z100.png), [`s4-next-visit-continue-390-z200.png`](file:///home/antigravity/blue45f/pilate_flow/docs/home-first-use-round4-20261107/evidence/screenshots/s4-next-visit-continue-390-z200.png)
    - [`s5-resumed-sequence-390-z100.png`](file:///home/antigravity/blue45f/pilate_flow/docs/home-first-use-round4-20261107/evidence/screenshots/s5-resumed-sequence-390-z100.png), [`s5-resumed-sequence-390-z200.png`](file:///home/antigravity/blue45f/pilate_flow/docs/home-first-use-round4-20261107/evidence/screenshots/s5-resumed-sequence-390-z200.png)
  - `768×1024` (`100%` / `200%`):
    - [`s1-empty-home-768-z100.png`](file:///home/antigravity/blue45f/pilate_flow/docs/home-first-use-round4-20261107/evidence/screenshots/s1-empty-home-768-z100.png), [`s1-empty-home-768-z200.png`](file:///home/antigravity/blue45f/pilate_flow/docs/home-first-use-round4-20261107/evidence/screenshots/s1-empty-home-768-z200.png)
    - [`s2-finder-modal-768-z100.png`](file:///home/antigravity/blue45f/pilate_flow/docs/home-first-use-round4-20261107/evidence/screenshots/s2-finder-modal-768-z100.png), [`s2-finder-modal-768-z200.png`](file:///home/antigravity/blue45f/pilate_flow/docs/home-first-use-round4-20261107/evidence/screenshots/s2-finder-modal-768-z200.png)
    - [`s3-arranged-2steps-768-z100.png`](file:///home/antigravity/blue45f/pilate_flow/docs/home-first-use-round4-20261107/evidence/screenshots/s3-arranged-2steps-768-z100.png), [`s3-arranged-2steps-768-z200.png`](file:///home/antigravity/blue45f/pilate_flow/docs/home-first-use-round4-20261107/evidence/screenshots/s3-arranged-2steps-768-z200.png)
    - [`s4-next-visit-continue-768-z100.png`](file:///home/antigravity/blue45f/pilate_flow/docs/home-first-use-round4-20261107/evidence/screenshots/s4-next-visit-continue-768-z100.png), [`s4-next-visit-continue-768-z200.png`](file:///home/antigravity/blue45f/pilate_flow/docs/home-first-use-round4-20261107/evidence/screenshots/s4-next-visit-continue-768-z200.png)
    - [`s5-resumed-sequence-768-z100.png`](file:///home/antigravity/blue45f/pilate_flow/docs/home-first-use-round4-20261107/evidence/screenshots/s5-resumed-sequence-768-z100.png), [`s5-resumed-sequence-768-z200.png`](file:///home/antigravity/blue45f/pilate_flow/docs/home-first-use-round4-20261107/evidence/screenshots/s5-resumed-sequence-768-z200.png)
  - `1440×900` (`100%` / `200%`):
    - [`s1-empty-home-1440-z100.png`](file:///home/antigravity/blue45f/pilate_flow/docs/home-first-use-round4-20261107/evidence/screenshots/s1-empty-home-1440-z100.png), [`s1-empty-home-1440-z200.png`](file:///home/antigravity/blue45f/pilate_flow/docs/home-first-use-round4-20261107/evidence/screenshots/s1-empty-home-1440-z200.png)
    - [`s2-finder-modal-1440-z100.png`](file:///home/antigravity/blue45f/pilate_flow/docs/home-first-use-round4-20261107/evidence/screenshots/s2-finder-modal-1440-z100.png), [`s2-finder-modal-1440-z200.png`](file:///home/antigravity/blue45f/pilate_flow/docs/home-first-use-round4-20261107/evidence/screenshots/s2-finder-modal-1440-z200.png)
    - [`s3-arranged-2steps-1440-z100.png`](file:///home/antigravity/blue45f/pilate_flow/docs/home-first-use-round4-20261107/evidence/screenshots/s3-arranged-2steps-1440-z100.png), [`s3-arranged-2steps-1440-z200.png`](file:///home/antigravity/blue45f/pilate_flow/docs/home-first-use-round4-20261107/evidence/screenshots/s3-arranged-2steps-1440-z200.png)
    - [`s4-next-visit-continue-1440-z100.png`](file:///home/antigravity/blue45f/pilate_flow/docs/home-first-use-round4-20261107/evidence/screenshots/s4-next-visit-continue-1440-z100.png), [`s4-next-visit-continue-1440-z200.png`](file:///home/antigravity/blue45f/pilate_flow/docs/home-first-use-round4-20261107/evidence/screenshots/s4-next-visit-continue-1440-z200.png)
    - [`s5-resumed-sequence-1440-z100.png`](file:///home/antigravity/blue45f/pilate_flow/docs/home-first-use-round4-20261107/evidence/screenshots/s5-resumed-sequence-1440-z100.png), [`s5-resumed-sequence-1440-z200.png`](file:///home/antigravity/blue45f/pilate_flow/docs/home-first-use-round4-20261107/evidence/screenshots/s5-resumed-sequence-1440-z200.png)

---

## 7. 정적 분석·테스트·소스 크기 검증 요약

- **Vitest 감사 테스트**: `./node_modules/.bin/vitest run --pool=forks --maxWorkers=1 --no-file-parallelism docs/home-first-use-round4-20261107/homeFirstUseRound4.audit.test.tsx` → **4 passed (`0` failed)**
- **TypeScript (`tsc -b`)**: **PASS (`0` errors)**
- **ESLint (`eslint`)**: **PASS (`0` errors, `0` warnings)**
- **관련 소스 크기 확인 (무변경)**:
  - [`src/components/SequenceWorkbench.tsx`](file:///home/antigravity/blue45f/pilate_flow/src/components/SequenceWorkbench.tsx): `2,454` lines (**0줄 수정**)
  - [`src/components/InlineExerciseFinder.tsx`](file:///home/antigravity/blue45f/pilate_flow/src/components/InlineExerciseFinder.tsx): `645` lines (**0줄 수정**)
  - [`src/styles/release-mobile-clarity.css`](file:///home/antigravity/blue45f/pilate_flow/src/styles/release-mobile-clarity.css): `312` lines (**0줄 수정**)
  - [`src/App.tsx`](file:///home/antigravity/blue45f/pilate_flow/src/App.tsx): `812` lines (**0줄 수정**)
