# 첫 수업 3단계 시각 가이드 후보 모듈 (`firstClassTutorialCandidate`)

강사가 첫 수업을 준비할 때 거치는 핵심 3단계(**1. 새 동작 한 줄로 적기 → 2. 블록으로 묶고 순서 맞추기 → 3. 수업 제목 적고 서랍에 저장하기**)를 인라인 SVG 스케치 도해와 함께 안내하는 **독립 통합 후보(Pre-integration Candidate) 모듈**입니다.

> [!NOTE]
> **통합 전 후보 상태(Pre-integration Candidate Status)**:
> 이 모듈은 `src/features/firstClassTutorialCandidate/**` 아래에 격리되어 있으며, 아직 운영 화면(`src/App.tsx`, `src/components/InstructorStudyDialog.tsx`, `src/components/SequenceWorkbench.tsx`)이나 전역 스토어(`src/store/usePilatesStore.ts`)에 직접 연결하지 않았습니다. 공유 파일 수정 없이 독립 검증을 마친 뒤, [`INTEGRATION_PATCH_PROPOSAL.md`](file:///home/antigravity/blue45f/pilate_flow/src/features/firstClassTutorialCandidate/INTEGRATION_PATCH_PROPOSAL.md)의 최소 패치(Option A / Option B)로 연결할 수 있도록 설계되었습니다.

---

## 1. 왜 별도 팝업이 아니라 기존 가이드의 시각 업그레이드인가?

현재 앱에는 강사 온보딩·사용법과 관련된 두 영역이 이미 존재합니다:

1. **[`InstructorStudyDialog.tsx`](file:///home/antigravity/blue45f/pilate_flow/src/components/InstructorStudyDialog.tsx) (`mode === 'guide'`, `'사용법 다시 보기'`)**:
   - 4개의 텍스트 카드(`conditions`, `compose`, `rehearse`, `teach-record`)를 작은 아이콘과 번호 목록(`<ol>`)으로만 안내하여 실제 화면 구조(한 줄 메모 시트, 블록 시퀀스 타임라인, 수업 서랍 저장)를 직관적으로 떠올리기 어렵습니다.
2. **[`SequenceWorkbench.tsx`](file:///home/antigravity/blue45f/pilate_flow/src/components/SequenceWorkbench.tsx) (`workbench-welcome`)**:
   - 빈 시퀀스 상태에서 정적 일러스트와 `'동작 고르기'` / `'한 줄 아이디어 메모'` 버튼만 제공하며, 이후 블록 편성과 서랍 저장까지 이어지는 3단계 시각 요약이나 접기/다시보기 컨트롤이 없습니다.

`firstClassTutorialCandidate`는 기존 기능과 중복되는 강제 팝업 투어를 만들지 않고, 위 두 영역을 **시각적으로 업그레이드(`variant="study-guide-panel"` 또는 `variant="inline-card"`)**할 수 있는 단일 컴포넌트를 제공합니다.

---

## 2. 3단계 시각 흐름 (`FIRST_CLASS_TUTORIAL_STEPS`)

| 단계 | 단계 ID (`FirstClassTutorialStepId`) | 실습 체크 ID (`FirstClassTutorialTaskId`) | 기존 호환 ID (`legacyTaskIds`) | 제목 및 핵심 안내 |
| --- | --- | --- | --- | --- |
| **1단계** | `'new-movement'` | `'first-class:new-movement'` | `['compose']` | **새 동작 한 줄로 적기** — 분류·해부학 용어나 검토 승인 없이 떠오른 움직임 한 줄만 적으면 바로 수업에 담을 수 있어요. |
| **2단계** | `'block-composition'` | `'first-class:block-compose'` | `['conditions', 'compose']` | **블록으로 묶고 순서 맞추기** — 준비·본운동·마무리·휴식 블록에 동작을 배치하고 목표 시간(예: 50분)에 맞춰 순서를 정돈해요. |
| **3단계** | `'save-class'` | `'first-class:save-class'` | `['rehearse']` | **수업 제목 적고 서랍에 저장하기** — 시퀀스 제목을 적고 저장하면 이 기기의 수업 서랍에 보관되어 언제든 다시 열고 미리볼 수 있어요. |

---

## 3. 읽기 전용·비차단·비검수 게이트 계약 (Read-Only & Non-Gate Contract)

- **강제 투어 및 검수 게이트 없음 (`isMandatoryTour: false`, `requiresReviewApproval: false`)**:
  - 미검토 동작(`review: undefined`)이나 체크하지 않은 실습 항목이 있어도 1~3단계 탭 전환, `이전 단계` / `다음 단계`, `건너뛰기`, `닫기`, `첫 수업 3단계 다시보기`, `1단계부터 다시보기`, 단계별 화면 바로가기(`onStepAction`), 워크벤치 복귀(`onReturnToWorkbench`)가 **절대 비활성화되지 않습니다**.
- **원본 입력 불변 및 방어적 정규화 (`isReadOnly: true`, `mutatesStoreOrStorage: false`)**:
  - `resolveFirstClassTutorialContext(source, options)`는 호출자가 전달한 객체·배열을 절대 변경하거나 `Object.freeze`하지 않으며, 반환되는 `FirstClassTutorialContextSummary`만 동결합니다.
  - 순환 참조, 프로토타입 오염 키(`__proto__`, `constructor`, `prototype`), 비정상 스칼라, 음수/`NaN`/`Infinity` 시간, 10,000개 초과 대형 배열(`maxScanItems: 10000`, `isPartialContext: true`)을 안전하게 격리합니다.
  - `localStorage`, `sessionStorage`, `usePilatesStore`에 직접 쓰기를 수행하지 않습니다.
- **접근성 및 모션 줄이기**:
  - WAI-ARIA `role="tablist"` / `role="tab"` 키보드 이동(`ArrowRight`, `ArrowLeft`, `Home`, `End`) 및 `Escape` 접기 시 포커스 보존.
  - `preferReducedMotion` prop 및 `prefers-reduced-motion: reduce` 미디어 쿼리 감지 시 `data-reduced-motion="true"`를 적용하고 애니메이션·부드러운 스크롤을 비활성화합니다.
  - 동일 화면에 여러 인스턴스를 렌더링해도 `useId()` 기반 고유 DOM ID를 보장합니다.

---

## 4. 사용 예시

```tsx
import {
  FirstClassTutorialCandidate,
  resolveFirstClassTutorialContext,
} from './features/firstClassTutorialCandidate';

const summary = resolveFirstClassTutorialContext({
  title: '월요일 오전 리포머 기초',
  targetMinutes: 50,
  steps: [{ stepId: 'step-1', nameKo: '풋워크 워밍업', durationMin: 8 }],
});

export function ExampleGuide() {
  return <FirstClassTutorialCandidate summary={summary} variant="inline-card" />;
}
```

합성 시나리오 6종을 포함한 로컬 확인용 하네스는 `FirstClassTutorialFixtureHarness` 및 `browserFixture.html`에서 제공합니다(운영 라우트가 아님).

---

## 5. 독립 검증 및 재현 명령

```bash
# 1. 단위 및 경계·접근성 테스트 (Vitest)
./node_modules/.bin/vitest run src/features/firstClassTutorialCandidate

# 2. TypeScript 빌드 체크
./node_modules/.bin/tsc -b --pretty false

# 3. 헤드리스 Chrome 실제 브라우저 검증 (320/390/768/1440px, 200% 확대, 44px 터치 타깃, 키보드, 모션 줄이기)
node src/features/firstClassTutorialCandidate/verifyFirstClassTutorialBrowser.mjs
```

상세 통합 패치 제안은 [`INTEGRATION_PATCH_PROPOSAL.md`](file:///home/antigravity/blue45f/pilate_flow/src/features/firstClassTutorialCandidate/INTEGRATION_PATCH_PROPOSAL.md), 검증 범위와 한계는 [`INTEGRATION_PROVENANCE.md`](file:///home/antigravity/blue45f/pilate_flow/src/features/firstClassTutorialCandidate/INTEGRATION_PROVENANCE.md)를 참고하세요.
