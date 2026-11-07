# Pilates Flow 홈·대시보드 첫 화면 개선 및 병렬 검증 보고서 (`parallel-page-home-20261107`)

> **식별자**: `parallel-page-home-20261107`
> **작업 브랜치**: `feat/parallel-page-home-20261107`
> **워크플로우 구조**: 다이나믹 2트랙 병렬 분리 (Track A: 홈 페이지 로컬 컴포넌트·스타일 구현 및 단위·회귀 테스트 / Track B: 독립 서브에이전트 경계·기능 감사 및 Headless Chromium `320/390/768/1440px`·`200%` 확대 실측 검증)
> **소유 경계**:
> - 홈 페이지 로컬 파일만 소유:
>   - [`src/components/SequenceWorkbench.tsx`](../../src/components/SequenceWorkbench.tsx)
>   - [`src/styles/release-mobile-clarity.css`](../../src/styles/release-mobile-clarity.css) (`SequenceWorkbench.tsx` 전용 로컬 스타일시트)
>   - [`src/components/SequenceWorkbench.home.test.tsx`](../../src/components/SequenceWorkbench.home.test.tsx)
>   - `docs/parallel-page-home-20261107/**`
> - 공유 라우트·셸(`src/App.tsx`), 스토어(`src/store/usePilatesStore.ts`), 해시 잠금 스타일(`src/styles/atelier-v2.css`, `src/styles/step-inspector.css`), 설정·테마·다른 페이지 파일 **100% 미수정 보존**

---

## 1. 기존 구현 점검 및 핵심 개선 내역

1. **'새 수업 만들기 / 최근 수업 이어가기' 동선 명확화 (`SequenceWorkbench.tsx`)**:
   - **빈 홈 화면 (`!s.activeSteps.length`)**:
     - 상단 웰컴 히어로(`aria-label="첫 수업안 준비"`)에 `새 수업 만들기` 배지와 조건 요약 칩(`50분 · 리포머`), 그리고 3대 시작 액션(`+ 동작 고르기`, `한 줄 아이디어 메모`, `프리셋·동작 묶음에서 고르기`) 및 `첫 수업 3단계 시각 도해 가이드 보기`를 일관된 카드 계층으로 정렬했습니다.
     - 웰컴 카드 바로 아래에 **`최근 수업 이어가기` 섹션(`section.workbench-recent-continue`, `aria-label="최근 수업 이어가기"`)**을 배치하여 최근 저장한 수업(`s.savedSequences`) 또는 최근 수업 기록(`s.historyLogs`)을 첫 화면에서 1탭(`이어서 구성` / `기록에서 이어가기`)으로 즉시 불러올 수 있게 했습니다.
     - 저장한 수업과 기록이 모두 없을 때는 차분한 빈 상태 안내(`저장한 최근 수업이 아직 없습니다. 위에서 새 수업을 만들거나 프리셋으로 시작해 보세요.`)를 제공합니다.
   - **활성 수업 화면 (`s.activeSteps.length > 0`)**:
     - 기존에 `marginBlock: 12` 인라인 스타일로 분리되어 있던 단일 프리셋 버튼 행을 제거하고, 상단에 **수업 전환 퀵 플로우 바(`div.workbench-home-flow-bar`, `aria-label="새 수업 및 최근 수업 전환"`)**를 구성했습니다.
     - **`+ 새 수업 만들기`**: 현재 편집 중인 시퀀스 스냅샷을 `undoStack`에 자동 백업한 뒤 빈 새 수업 준비 화면으로 전환하며, `되돌리기` 버튼으로 언제든 이전 수업안을 무손실 복원할 수 있습니다.
     - **`최근 수업 이어가기` 드롭다운(`details.workbench-recent-switcher`)**: 현재 화면을 벗어나지 않고 최근 저장한 수업이나 기록으로 즉시 전환하거나 `저장한 수업 전체 보기`로 이동할 수 있습니다.
     - **`프리셋·동작 묶음에서 고르기`**: 동일 플로우 바 안에 정렬하여 여백과 버튼 높이를 통일했습니다.

2. **긴 설명·기술 상태 숨김 및 정보 계층·여백 정돈 (기능 삭제 `0건`)**:
   - `AI 수업 도우미 (선택)` 외부에 노출되던 기술 상태 문구(`무료 한도 보호 · 소진 시 로컬 전환`), `내 새 동작 메모`의 긴 면책 문구, `핵심 흐름 이어가기`의 장문 부연 설명을 `.sr-only`로 시각 숨김 처리하여 스크린리더 접근성과 기존 기능을 100% 보존하면서 첫 화면 시각 밀도를 낮췄습니다.
   - 활성 수업 편집 중(`s.activeSteps.length > 0`)에는 `내 새 동작 메모`(`section.pf-workbench-ideas`)가 상단 시퀀스 카드를 화면 밖으로 밀어내지 않도록 시퀀스 목록 하단(`핵심 흐름 이어가기` 바로 위)에 배치했습니다.
   - 빈 화면에서 웰컴 카드와 조건 칩 사이를 가로막던 `도해 초안 둘러보기 (선택)` 디스클로저를 하단 선택 도구 영역(`자동 구성·휴식 먼저 넣기` 아래)으로 정렬했습니다.

3. **모바일 `320px`/`390px` · 태블릿 `768px` · PC `1440px` · `200%` 확대 가로 넘침 해소 (`release-mobile-clarity.css`)**:
   - `html:has(.plan-view), body:has(.plan-view) { min-width: 0 !important; max-width: 100%; overflow-x: clip; }` 규칙과 유연한 플렉스·그리드 래핑(`min-width: 0`, `word-break: keep-all`)을 적용해 `320px` 및 `390px` `200%` 확대 환경에서 발생하던 가로 넘침(`Before: 320px / 250px`)을 **`After: 0px`**로 완전히 해소했습니다.

---

## 2. 전후(Before / After) 실측 브라우저 비교 요약

- **기준선(Before) 메트릭**: [`before-metrics.json`](./before-metrics.json)
- **개선 후(After) 메트릭**: [`after-metrics.json`](./after-metrics.json)

| 모드 | 뷰포트 / 배율 | Before 가로 넘침 (`overflowPx`) | After 가로 넘침 (`overflowPx`) | Before `새 수업 / 최근 수업` 동선 | After `새 수업 / 최근 수업` 동선 | 전후 스크린샷 |
| --- | --- | --- | --- | --- | --- | --- |
| **Active (`수업 구성`)** | `320×568` (`100%`) | `0px` | **`0px`** | 없음 (`false`) | **표시 (`true`)** | [Before](./before/home-active-320-100.png) / [After](./after/home-active-320-100.png) |
| **Active (`수업 구성`)** | `390×844` (`100%`) | `0px` | **`0px`** | 없음 (`false`) | **표시 (`true`, 첫 동작 카드 `y=605px`)** | [Before](./before/home-active-390-100.png) / [After](./after/home-active-390-100.png) |
| **Active (`수업 구성`)** | `768×1024` (`100%`) | `0px` | **`0px`** | 없음 (`false`) | **표시 (`true`, 첫 동작 카드 `y=550px`)** | [Before](./before/home-active-768-100.png) / [After](./after/home-active-768-100.png) |
| **Active (`수업 구성`)** | `1440×900` (`100%`) | `0px` | **`0px`** | 없음 (`false`) | **표시 (`true`, 첫 동작 카드 `y=561px`)** | [Before](./before/home-active-1440-100.png) / [After](./after/home-active-1440-100.png) |
| **Active (`수업 구성`)** | `320×568` (`200%`) | `320px` (초과) | **`0px`** | 없음 (`false`) | **표시 (`true`)** | [Before](./before/home-active-320-200.png) / [After](./after/home-active-320-200.png) |
| **Active (`수업 구성`)** | `390×844` (`200%`) | `250px` (초과) | **`0px`** | 없음 (`false`) | **표시 (`true`)** | [Before](./before/home-active-390-200.png) / [After](./after/home-active-390-200.png) |
| **Active (`수업 구성`)** | `768×1024` (`200%`) | `0px` | **`0px`** | 없음 (`false`) | **표시 (`true`)** | [Before](./before/home-active-768-200.png) / [After](./after/home-active-768-200.png) |
| **Active (`수업 구성`)** | `1440×900` (`200%`) | `0px` | **`0px`** | 없음 (`false`) | **표시 (`true`)** | [Before](./before/home-active-1440-200.png) / [After](./after/home-active-1440-200.png) |
| **Empty (`첫 화면`)** | `320×568` (`100%`) | `0px` | **`0px`** | 없음 (`false`) | **표시 (`true`, `최근 수업 이어가기` 노출)** | [Before](./before/home-empty-320-100.png) / [After](./after/home-empty-320-100.png) |
| **Empty (`첫 화면`)** | `390×844` (`100%`) | `0px` | **`0px`** | 없음 (`false`) | **표시 (`true`, `최근 수업 이어가기` 노출)** | [Before](./before/home-empty-390-100.png) / [After](./after/home-empty-390-100.png) |
| **Empty (`첫 화면`)** | `768×1024` (`100%`) | `0px` | **`0px`** | 없음 (`false`) | **표시 (`true`, `최근 수업 이어가기` 노출)** | [Before](./before/home-empty-768-100.png) / [After](./after/home-empty-768-100.png) |
| **Empty (`첫 화면`)** | `1440×900` (`100%`) | `0px` | **`0px`** | 없음 (`false`) | **표시 (`true`, `최근 수업 이어가기` 노출)** | [Before](./before/home-empty-1440-100.png) / [After](./after/home-empty-1440-100.png) |
| **Empty (`첫 화면`)** | `320×568` (`200%`) | `320px` (초과) | **`0px`** | 없음 (`false`) | **표시 (`true`)** | [Before](./before/home-empty-320-200.png) / [After](./after/home-empty-320-200.png) |
| **Empty (`첫 화면`)** | `390×844` (`200%`) | `250px` (초과) | **`0px`** | 없음 (`false`) | **표시 (`true`)** | [Before](./before/home-empty-390-200.png) / [After](./after/home-empty-390-200.png) |
| **Empty (`첫 화면`)** | `768×1024` (`200%`) | `0px` | **`0px`** | 없음 (`false`) | **표시 (`true`)** | [Before](./before/home-empty-768-200.png) / [After](./after/home-empty-768-200.png) |
| **Empty (`첫 화면`)** | `1440×900` (`200%`) | `0px` | **`0px`** | 없음 (`false`) | **표시 (`true`)** | [Before](./before/home-empty-1440-200.png) / [After](./after/home-empty-1440-200.png) |

---

## 3. 테스트·타입·린트 검증 결과

- **TypeScript (`./node_modules/.bin/tsc -b --pretty false`)**: **PASS (0 errors)**
- **ESLint (`./node_modules/.bin/eslint src/components/SequenceWorkbench.tsx src/components/SequenceWorkbench.home.test.tsx --max-warnings=0`)**: **PASS (0 errors, 0 warnings)**
- **단위 및 기능 회귀 테스트 (Vitest, 9개 스위트 54개 테스트 전수 통과)**:
  - `src/components/SequenceWorkbench.home.test.tsx`: **4 / 4 PASS**
  - `src/components/SequenceWorkbench.vnext.test.tsx`: **12 / 12 PASS**
  - `src/components/WorkbenchFlowClarity.test.tsx`: **4 / 4 PASS**
  - `src/components/SequenceWorkbench.finderLifecycle.test.tsx`: **5 / 5 PASS**
  - `src/components/SequenceWorkbench.classSection.test.tsx`: **2 / 2 PASS**
  - `src/components/SequenceWorkbench.detailHandoff.test.tsx`: **6 / 6 PASS**
  - `src/test/v2Workbench.test.tsx`: **8 / 8 PASS**
  - `src/test/workbenchUsability.test.tsx`: **6 / 6 PASS**
  - `src/test/movementIdeaFlow.test.tsx`: **7 / 7 PASS**
  - `src/test/designSystem.test.tsx`: **12 / 12 PASS**
