# 필라테스 첫 사용자(신규 강사) 6단계 동선 독립 감사 보고서 — Round 5 (`2026-11-07`)

## 1. 운영 배포 중단 · 자동 배포 읽기 검증 · 완료 후보 `origin/main` Ancestry 확인

### 1.1 긴급 배포 제한 준수 및 자동 배포 유발 여부 읽기 검증
- **현재 세션 운영 배포 상태**: **`미시작 (Not Started / 0 Deployments)`**
  - 긴급 사용자 지시(`"일단 배포 다 멈추고 그 머지부터 해줘"`)에 따라 본 세션에서는 어떠한 운영 배포(`firebase deploy`, `gh-pages` 배포, 재배포, 롤백 배포)도 시작하지 않았으며 실행 중인 배포 프로세스가 없습니다(`NO_DEPLOY_RUNNING`).
- **`main` Push 시 자동 배포 유발 여부 읽기 검증**:
  - `.github/workflows/` 디렉터리: **존재하지 않음** (`.github/secret_scanning.yml`만 존재).
  - GitHub Pages 설정: `gh-pages` 브랜치 루트(`/`)만 바라보므로 **`origin/main`에 push해도 자동 운영 배포가 유발되지 않습니다.**

### 1.2 기존 완료 문서/코드 후보의 실제 원격 `origin/main` (`db3d90a`) 포함(Ancestry) 검증

| 구분 | 브랜치 / 후보 이름 | 커밋 SHA | `git merge-base --is-ancestor <sha> origin/main` | 현재 상태 |
| --- | --- | --- | --- | --- |
| **홈 첫 화면 개편 (Round 1)** | `feat/parallel-page-home-20261107` | `ba24c66838d16667ce149692cf48802227e5a651` (Merge: `4256230`) | **`PASS (IN_ORIGIN_MAIN)`** | `origin/main` 반영 완료 |
| **홈 첫사용 독립 감사 (Round 4)** | `docs/home-first-use-round4-20261107` | `14b45da0194bff2d27d253e7e3cadd6230e026ac` (Merge: `1c9c2b4`) | **`PASS (IN_ORIGIN_MAIN)`** | `origin/main` 반영 완료 |
| **빌더 80단계 드래그·순서변경·되돌리기 (Round 4)** | `feat/builder-long-sequence-round4-20261107` | `51f1e6aa5487790e26296b43d2df6ba8cb04bb74` (Merge: `8de04fb`) | **`PASS (IN_ORIGIN_MAIN)`** | `origin/main` 반영 완료 |
| **빌더 R5 브라우저 회귀 증거 (Round 5)** | `docs/builder-r5-browser-proof-20261107` | `f30072a155068c8bb57b249f0de490b341016b85` (Merge: `db3d90a`) | **`PASS (IN_ORIGIN_MAIN)`** | `origin/main` 반영 완료 |
| **빌더 R5 최소 소스 후보** | `origin/candidate/builder-r5-01-04-20261107` | `e365b8284e3fc81bf455da76e4acbfb9e7d0b701` | `CANDIDATE_BRANCH_ONLY` | 외부 빌더 후보(`4804fcb`/`543685b`) 보호를 위해 원격 후보 브랜치 및 `format-patch`로 보존 중 |
| **외부 빌더 후보 (프롬프트 언급)** | `4804fcb` / `543685b` | 외부/별도 세션 소유 | 로컬·원격 미존재 | 소유권 보호를 위해 `SequenceWorkbench`·`SequenceOrderCard`·`InlineExerciseFinder`·`release-mobile-clarity.css` 직접 수정 `0`건 유지 |

---

## 2. 이전 감사(Round 4) 항목 및 빌더 변경분 vs 최신 `origin/main` (`db3d90a`) 읽기 비교 (`이미 반영됨` vs `미반영`)

`git diff 1c9c2b4..origin/main -- src/` 읽기 대조를 통해 **이미 `origin/main`에 반영된 항목(재작업 금지)**과 **아직 `src/**`에 반영되지 않은 상위 3개 항목**을 정확히 분류했습니다.

| 분류 | 항목 ID / 내용 | 대상 파일 (`origin/main` `db3d90a` 기준) | 비교 판정 및 근거 |
| --- | --- | --- | --- |
| **이미 반영됨 (재작업 불필요)** | **홈 첫 화면 계층 · progressive disclosure (`ba24c66` / `4256230`)** | [`src/components/SequenceWorkbench.tsx`](file:///home/antigravity/blue45f/pilate_flow/src/components/SequenceWorkbench.tsx#L821-L966), [`src/styles/release-mobile-clarity.css`](file:///home/antigravity/blue45f/pilate_flow/src/styles/release-mobile-clarity.css#L10-L120) | 빈 홈 환영 카드(`새 수업 만들기` + `동작 고르기` Primary CTA), `최근 수업 이어가기` 상단 배치, `<details>` 12개 전부 기본 닫힘(`openDetailsCount = 0`), `320/390/768/1440` × `100%/200%` 가로 오버플로우 `0px` 유지 |
| **이미 반영됨 (재작업 불필요)** | **시퀀스 순서 변경(`Stage 4`) · `aria-live` 안내 · 되돌리기 (`51f1e6a` / `8de04fb`)** | [`src/components/SequenceOrderCard.tsx`](file:///home/antigravity/blue45f/pilate_flow/src/components/SequenceOrderCard.tsx#L172-L305), [`src/components/SequenceWorkbench.tsx`](file:///home/antigravity/blue45f/pilate_flow/src/components/SequenceWorkbench.tsx#L1104-L1112) | 2번째 동작 카드의 `위로` 버튼(`aria-label*="위로 이동"`), 방향키(`ArrowUp`/`ArrowDown`), 포인터 드래그로 1클릭 순서 변경 및 `[data-plan-feedback]` `aria-live="polite"` 안내(`"2번 패럴렐 풋워크 순서를 1번째 위치로 바꿨어요. 되돌릴 수 있습니다."`)가 `origin/main`에 반영되어 8개 전 구간 `reorderSucceeded = true` 통과 |
| **미반영 (남은 Top 1)** | **`IMP-R5-01` (구 `IMP-R4-01`)**: `InlineExerciseFinder` 초기 기구 필터(`filters.equipment`) 미동기화로 인한 첫 동작 추가 기구 불일치 차단 | [`src/components/InlineExerciseFinder.tsx#L46-L81`](file:///home/antigravity/blue45f/pilate_flow/src/components/InlineExerciseFinder.tsx#L46-L81) | **`미반영`** — `1c9c2b4` 이후 `InlineExerciseFinder.tsx` 수정 0건. `Stage 2`에서 `리포머`만 선택하고 `Stage 3`(`동작 고르기`)을 열어도 `emptyFilters()`가 `equipment: []`로 시작해 1·2번째 카드 클릭 시 2번째 카드(매트)가 에러로 거부됨 (`+2`클릭 손실) |
| **미반영 (남은 Top 2)** | **`IMP-R5-02` (구 `IMP-R4-02`)**: `동작 고르기` 모달 내부 `.ief-selection-bar`(`← 수업안으로`) 중복 노출 및 클릭 시 모달이 닫히지 않는 무동작(`no-op`) | [`src/components/InlineExerciseFinder.tsx#L635-L642`](file:///home/antigravity/blue45f/pilate_flow/src/components/InlineExerciseFinder.tsx#L635-L642), [`src/components/SequenceWorkbench.tsx#L1979-L1995`](file:///home/antigravity/blue45f/pilate_flow/src/components/SequenceWorkbench.tsx#L1979-L1995) | **`미반영`** — 모달 내부 `.ief-selection-bar`와 모달 푸터 `.workbench-finder-footer`가 상하 2중 노출(`duplicateReturnBarsCount = 2`)되며, `← 수업안으로` 클릭 시 `setActiveTab('workbench')`만 호출하고 `closeFinder()`를 호출하지 않아 모달이 닫히지 않음 (`closedByInnerSelectionBar = false`, `+1`클릭 손실) |
| **미반영 (남은 Top 3)** | **`IMP-R5-03` (구 `IMP-R4-03` + `Stage 2` 기구 선택 동선 연결)**: 빈 홈 중복 조건 칩(`5`개), `수업 조건` 모달 내 `기구·조건 적용 후 동작 고르기` 직행 버튼 부재, `320×568` 재방문 `이어서 구성` Y 밀림(`769px`), 미저장 `저장` 버튼 `secondary` 변형 | [`src/components/SequenceWorkbench.tsx#L1063-L1136`](file:///home/antigravity/blue45f/pilate_flow/src/components/SequenceWorkbench.tsx#L1063-L1136), [`#L2341-L2405`](file:///home/antigravity/blue45f/pilate_flow/src/components/SequenceWorkbench.tsx#L2341-L2405), [`src/styles/release-mobile-clarity.css#L305-L313`](file:///home/antigravity/blue45f/pilate_flow/src/styles/release-mobile-clarity.css#L305-L313) | **`미반영`** — (1) `Stage 2` `수업 조건` 모달에 자동 생성(`조건 적용하고 만들기`)과 `닫기`만 있고 `기구·조건 적용 후 동작 고르기` 버튼이 없어 `닫기 → 동작 고르기`로 `+1`클릭 우회 필요; (2) 빈 홈 `.v2-plan-toolbar` 중복 노출로 `320×568 @ 100%`에서 `Stage 6` `이어서 구성` Y가 `769px`(`1.35` 화면)로 밀림 |

---

## 3. 신규 강사 6단계 실제 UI 검증 (`320 / 390 / 768 / 1440` × `100% / 200%`)

합성 픽스처([`fixtures/firstUseRound5Fixtures.ts`](file:///home/antigravity/blue45f/pilate_flow/docs/home-first-use-round5-20261107/fixtures/firstUseRound5Fixtures.ts))와 실브라우저 스크립트([`verify-home-first-use-round5-browser.mjs`](file:///home/antigravity/blue45f/pilate_flow/docs/home-first-use-round5-20261107/verify-home-first-use-round5-browser.mjs))로 측정한 원시 데이터는 [`evidence/first-use-round5-metrics.json`](file:///home/antigravity/blue45f/pilate_flow/docs/home-first-use-round5-20261107/evidence/first-use-round5-metrics.json) 및 48장 스크린샷([`evidence/screenshots/`](file:///home/antigravity/blue45f/pilate_flow/docs/home-first-use-round5-20261107/evidence/screenshots/))에 보존되어 있습니다.
*(참고: Debian 12 샌드박스에는 Safari/WebKit 바이너리가 없으므로 실제 WebKit 런타임은 `미검증(UNVERIFIED)`으로 명시합니다.)*

### 3.1 단계별 클릭 수 (Click Count: Optimal vs Unassisted Beginner Trap)

| 단계 | 신규 강사 행동 (`첫 진입 → 기구 선택 → 동작 2개 추가 → 순서 변경 → 저장 → 재방문 이어하기`) | 최적 클릭 수 (패치 적용 시) | 현재 무보조 마찰 클릭 수 (`origin/main` `db3d90a`) | 차이 및 발생 원인 |
| --- | --- | --- | --- | --- |
| **Stage 1: 첫 진입** | 빈 홈에서 상단 요약칩 `50분 · 매트`(`.workbench-welcome-summary`) 클릭 | **`1`클릭** | **`1`클릭** | 첫 화면 상단(`top: 151px~166px`) 노출 PASS |
| **Stage 2: 기구 선택** | `수업 조건` 모달에서 기구(`리포머`) 선택 후 `동작 고르기`로 이동 | **`2`클릭** (기구 체크 `1` + `기구·조건 적용 후 동작 고르기` `1`) | **`3`클릭** (기구 체크 `1` + 모달 하단 `닫기` `1` + 홈 `동작 고르기` `1`) | **`+1`클릭 (`IMP-R5-03`)**: `수업 조건` 모달에 수동 동작 고르기 직행 CTA 부재 (`조건 적용하고 만들기`는 전체 자동 생성) |
| **Stage 3: 동작 2개 추가** | `InlineExerciseFinder`에서 동작 2개 `+ 추가` 후 수업 구성으로 복귀 | **`3`클릭** (`+ 추가` × 2 + `수업 구성으로 돌아가기` `1`) | **`6`클릭** (비필터 `+ 추가` × 2 중 1개 거부 + `수업 기구로 좁히기` `1` + 2번째 `+ 추가` `1` + 무동작 `← 수업안으로` `1` + `수업 구성으로 돌아가기` `1`) | **`+3`클릭 (`IMP-R5-01` + `IMP-R5-02`)**: 초기 기구 필터 미적용(`+2`클릭) + `.ief-selection-bar` 무동작 버튼(`+1`클릭) |
| **Stage 4: 순서 변경** | 2번째 동작 카드(`패럴렐 풋워크`)의 `위로` 버튼 클릭 (또는 드래그/`ArrowUp`) | **`1`클릭** | **`1`클릭** | **`51f1e6a` 이미 반영됨**: 1클릭 즉시 순서 교환 및 `aria-live` 피드백 출력 |
| **Stage 5: 저장** | 상단 `저장`(`button.save-flow`) 클릭 | **`1`클릭** | **`1`클릭** | 1클릭 즉시 로컬 저장 (`이 브라우저에 수업을 저장했습니다.`) |
| **Stage 6: 재방문 이어하기** | 재방문 빈 홈의 `최근 수업 이어가기`에서 `이어서 구성` 클릭 | **`1`클릭** | **`1`클릭** | 1클릭으로 순서 변경된 2개 동작(`패럴렐 풋워크 → 캐리지 호흡 & 암 아크`) 100% 복원 |
| **합계 (6단계 완주)** | **End-to-End 총 클릭 수** *(홈에서 기본 기구 그대로 시작 시 `7` vs `10`클릭)* | **`9`클릭** *(기구 변경 포함)* | **`13`클릭** *(기구 변경 포함, `+4`클릭 손실)* | `IMP-R5-01..03` 적용 시 **`13클릭 → 9클릭`** (`-4`클릭 단축) |

---

### 3.2 뷰포트 · 배율별 각 단계 첫 행동 Y (First Action Y & `screensFromTop`) 및 가로 오버플로우

| 뷰포트 × 배율 | S1 첫 진입: `수업 조건` 칩 Y / `동작 고르기` Y | S2 기구 선택: 기구 필드셋 Y / `닫기` 버튼 Y | S3 동작 2개 추가: 첫 `+ 추가` Y / 복귀 푸터 Y | S4 순서 변경: 1번 카드 Y / 2번 `위로` 버튼 Y | S5 저장: `저장` 버튼 Y (`save-flow`) | S6 재방문 이어하기: `이어서 구성` 버튼 Y | 48화면 가로 오버플로우 (`overflowPx`) |
| --- | --- | --- | --- | --- | --- | --- | --- |
| **`320×568 @ 100%`** | `151px` (`0.27`화면) / `267px` (`0.47`화면, **PASS**) | `663px` (`1.17`화면) / `2044px` | `544px` (`0.96`화면) / `483px` | `680px` (`1.20`화면) / `1029px` (`1.81`화면) | `442px` (`0.78`화면, **첫 화면 PASS**) | **`769px` (`1.35`화면 — 첫 화면 밖 `IMP-R5-03`)** | **`0px`** |
| **`390×844 @ 100%`** | `151px` (`0.18`화면) / `267px` (`0.32`화면, **PASS**) | `674px` (`0.80`화면, **PASS**) / `2010px` | `557px` (`0.66`화면, **PASS**) / `745px` (**PASS**) | `578px` (`0.68`화면, **PASS**) / `927px` (`1.10`화면) | `392px` (`0.46`화면, **첫 화면 PASS**) | **`678px` (`0.80`화면, 첫 화면 PASS)** | **`0px`** |
| **`768×1024 @ 100%`** | `154px` (`0.15`화면) / `270px` (`0.26`화면, **PASS**) | `589px` (`0.57`화면, **PASS**) / `1575px` | `765px` (`0.75`화면, **PASS**) / `915px` (**PASS**) | `510px` (`0.50`화면, **PASS**) / `763px` (`0.75`화면, **PASS**) | `335px` (`0.33`화면, **첫 화면 PASS**) | **`495px` (`0.48`화면, 첫 화면 PASS)** | **`0px`** |
| **`1440×900 @ 100%`** | `166px` (`0.18`화면) / `265px` (`0.29`화면, **PASS**) | `585px` (`0.65`화면, **PASS**) / `1573px` | `696px` (`0.77`화면, **PASS**) / `798px` (**PASS**) | `521px` (`0.58`화면, **PASS**) / `774px` (`0.86`화면, **PASS**) | `346px` (`0.38`화면, **첫 화면 PASS**) | **`497px` (`0.55`화면, 첫 화면 PASS)** | **`0px`** |
| **`320×568 @ 200%`** | `685px` (`1.21`화면) / `1039px` (`1.83`화면) | `2719px` / `10520px` | `2646px` / `1049px` | `2058px` / `2921px` | `1150px` (`2.02`화면) | `2788px` (`4.91`화면) | **`0px`** |
| **`390×844 @ 200%`** | `586px` (`0.69`화면, **PASS**) / `894px` (`1.06`화면) | `1911px` / `7157px` | `1524px` / `1042px` | `2062px` / `2893px` | `1110px` (`1.32`화면) | `2412px` (`2.86`화면) | **`0px`** |
| **`768×1024 @ 200%`** | `307px` (`0.30`화면, **PASS**) / `540px` (`0.53`화면, **PASS**) | `845px` (`0.82`화면, **PASS**) / `3173px` | `885px` (`0.86`화면, **PASS**) / `1274px` | `1315px` (`1.28`화면) / `2892px` | `818px` (`0.80`화면, **첫 화면 PASS**) | `1373px` (`1.34`화면) | **`0px`** |
| **`1440×900 @ 200%`** | `333px` (`0.37`화면, **PASS**) / `530px` (`0.59`화면, **PASS**) | `721px` (`0.80`화면, **PASS**) / `2742px` | `912px` (`1.01`화면) / `1145px` | `1233px` (`1.37`화면) / `1769px` | `796px` (`0.88`화면, **첫 화면 PASS**) | `1125px` (`1.25`화면) | **`0px`** |

---

### 3.3 중복 안내 (Duplicate Notices) 및 막힌 동선 (Blocked Flows) 실측 요약

| 구분 | 측정 위치 | 실측값 (`first-use-round5-metrics.json`) | 상세 원인 및 소유 파일 |
| --- | --- | --- | --- |
| **중복 안내 1** | `Stage 1 (첫 진입)` 빈 홈 수업 조건 열기 트리거 | 가시 버튼 **`5`개** (DOM 전체 조건 관련 버튼 `9`개) | 환영 카드 `.workbench-welcome-summary`(`50분 · 매트`)와 하단 `.v2-plan-toolbar` 내 4개 버튼(`50분`, `매트`, `전신 균형`, `수업 조건`)이 동일한 `setConditionsOpen(true)`를 중복 호출 ([`SequenceWorkbench.tsx#L832-L841`](file:///home/antigravity/blue45f/pilate_flow/src/components/SequenceWorkbench.tsx#L832-L841), [`#L1063-L1096`](file:///home/antigravity/blue45f/pilate_flow/src/components/SequenceWorkbench.tsx#L1063-L1096)) |
| **중복 안내 2** | `Stage 3 (동작 2개 추가)` 모달 하단 선택 요약 & 복귀 바 | 상하 **`2`개 바 동시 노출** (`duplicateReturnBarsCount = 2`) | `InlineExerciseFinder` 내부 `.ief-selection-bar`(`수업안에 2개 선택` + `← 수업안으로`)와 `LightDismissDialog` 푸터 `.workbench-finder-footer`(`2개 동작 · 04:00` + `수업 구성으로 돌아가기`)가 중첩 렌더링됨 |
| **막힌 동선 1** | `Stage 2 → Stage 3` 수업 기구 선택 후 모달 첫 2개 카드 `+ 추가` 클릭 | **`firstTwoUnfilteredRejectedOne = true`** (8개 뷰포트×배율 100% 재현) | `Stage 2`에서 `리포머`만 선택했음에도 `InlineExerciseFinder`가 `filters.equipment = []`로 열려 1번째 카드(`캐리지 호흡 & 암 아크`, 리포머) 추가 후 2번째 카드(`누워서 호흡 관찰`, 매트) 클릭 시 `"현재 선택한 기구·소도구와 최대 난이도 조건에 맞는 동작만 추가할 수 있습니다."` 오류로 차단됨 ([`InlineExerciseFinder.tsx#L46-L81`](file:///home/antigravity/blue45f/pilate_flow/src/components/InlineExerciseFinder.tsx#L46-L81)) |
| **막힌 동선 2** | `Stage 3` 모달 내부 `.ief-selection-bar`의 `← 수업안으로` 버튼 클릭 | **`closedByInnerSelectionBar = false`** (모달 닫히지 않는 No-op 100% 재현) | 이미 `activeTab === 'workbench'`인 상태에서 `onClick={() => setActiveTab('workbench')}`만 실행하고 `closeFinder()`를 호출하지 않아 모달이 닫히지 않음 ([`InlineExerciseFinder.tsx#L639-L641`](file:///home/antigravity/blue45f/pilate_flow/src/components/InlineExerciseFinder.tsx#L639-L641)) |
| **막힌 동선 3** | `Stage 2 (기구 선택)` `수업 조건` 모달에서 기구 체크 후 수동 동작 고르기 전환 | **`hasDirectManualPickCtaInModal = false`** (`closeManualBtnY = 1573px~2044px`) | `수업 조건` 모달의 유일한 Primary 버튼이 `조건 적용하고 만들기`(자동 시퀀스 생성 `generate()`)이고 수동으로 동작을 고르려면 모달 맨 끝(`Y = 1573px~2044px`)의 `닫기`를 누른 뒤 다시 홈에서 `동작 고르기`를 눌러야 함 ([`SequenceWorkbench.tsx#L2341-L2405`](file:///home/antigravity/blue45f/pilate_flow/src/components/SequenceWorkbench.tsx#L2341-L2405)) |

---

## 4. 해당 소유자에게 바로 적용 가능한 남은 상위 3개 최소 Patch 제안 및 테스트 명세

- **최소 Unified Diff 패치 파일**: [`docs/home-first-use-round5-20261107/patches/top3-home-first-use-round5.patch`](file:///home/antigravity/blue45f/pilate_flow/docs/home-first-use-round5-20261107/patches/top3-home-first-use-round5.patch)
- **실행 가능한 Vitest 감사·회귀 테스트 명세**: [`docs/home-first-use-round5-20261107/homeFirstUseRound5.audit.test.tsx`](file:///home/antigravity/blue45f/pilate_flow/docs/home-first-use-round5-20261107/homeFirstUseRound5.audit.test.tsx)

### 4.1 `IMP-R5-01` (소유: `InlineExerciseFinder.tsx` 담당)
- **적용 위치**: [`src/components/InlineExerciseFinder.tsx#L46-L115`](file:///home/antigravity/blue45f/pilate_flow/src/components/InlineExerciseFinder.tsx#L46-L115)
- **최소 변경**: `emptyFilters(classEquipment)`로 초기 `filters.equipment`를 `[...classEquipment]`로 초기화하고, `classEquipment.join(',')` 변경 시 `useEffect`로 `filters.equipment`를 동기화.
- **기대 효과**: `Stage 2 (기구 선택)` 직후 `Stage 3 (동작 2개 추가)` 진입 시 선택한 기구 동작만 즉시 노출되어 기구 불일치 에러(`firstTwoUnfilteredRejectedOne`)가 `0`건이 되고 클릭 수가 `-2`클릭 단축됩니다.

### 4.2 `IMP-R5-02` (소유: `InlineExerciseFinder.tsx` + `SequenceWorkbench.tsx` + `release-mobile-clarity.css` 담당)
- **적용 위치**:
  - [`src/components/InlineExerciseFinder.tsx#L33-L36`](file:///home/antigravity/blue45f/pilate_flow/src/components/InlineExerciseFinder.tsx#L33-L36), [`#L635-L642`](file:///home/antigravity/blue45f/pilate_flow/src/components/InlineExerciseFinder.tsx#L635-L642) (`hideSelectionBar`, `onReturnToWorkbench` prop 추가)
  - [`src/components/SequenceWorkbench.tsx#L1979-L1986`](file:///home/antigravity/blue45f/pilate_flow/src/components/SequenceWorkbench.tsx#L1979-L1986) (`<InlineExerciseFinder hideSelectionBar onReturnToWorkbench={closeFinder} ... />`)
  - [`src/styles/release-mobile-clarity.css#L310-L313`](file:///home/antigravity/blue45f/pilate_flow/src/styles/release-mobile-clarity.css#L310-L313) (`.workbench-finder-dialog .workbench-finder-footer { position: sticky; bottom: 0; ... }`)
- **기대 효과**: 모달 내 하단 복귀 바 중복(`2개 → 1개`) 및 `← 수업안으로` 무동작(`no-op`)이 완전히 제거되어 `-1`클릭 단축됩니다.

### 4.3 `IMP-R5-03` (소유: `SequenceWorkbench.tsx` + `release-mobile-clarity.css` 담당)
- **적용 위치**:
  - [`src/components/SequenceWorkbench.tsx#L1063-L1096`](file:///home/antigravity/blue45f/pilate_flow/src/components/SequenceWorkbench.tsx#L1063-L1096) (`s.activeSteps.length > 0`일 때만 `.v2-plan-toolbar` 렌더링하여 빈 홈 중복 조건 칩 `5개 → 1개` 축소)
  - [`src/components/SequenceWorkbench.tsx#L1128-L1136`](file:///home/antigravity/blue45f/pilate_flow/src/components/SequenceWorkbench.tsx#L1128-L1136) (미저장 시퀀스일 때 `button.save-flow`를 `variant={s.activeSequenceId ? 'secondary' : 'primary'}`로 강조)
  - [`src/components/SequenceWorkbench.tsx#L2400-L2404`](file:///home/antigravity/blue45f/pilate_flow/src/components/SequenceWorkbench.tsx#L2400-L2404) (`수업 조건` 모달 하단 `.v2-conditions-actions`에 `기구·조건 적용 후 동작 고르기` 버튼 추가 — 클릭 시 `closeConditions(); openExerciseFinder();` 실행)
  - [`src/styles/release-mobile-clarity.css#L310-L313`](file:///home/antigravity/blue45f/pilate_flow/src/styles/release-mobile-clarity.css#L310-L313) (`@media (max-width: 359px)`에서 빈 홈 `.workbench-welcome-image { max-height: 84px; }` 적용)
- **기대 효과**: `Stage 2 (기구 선택) → Stage 3 (동작 2개 추가)` 전환이 `-1`클릭 단축되고, `320×568 @ 100%`에서 `Stage 6 (재방문 이어하기)` Y좌표가 약 `120px` 위로 올라오며, `Stage 5 (저장)` 버튼의 첫 사용 가시성이 강화됩니다.
