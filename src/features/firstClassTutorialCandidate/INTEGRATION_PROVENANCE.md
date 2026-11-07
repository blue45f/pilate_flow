# 첫 수업 3단계 시각 가이드 후보 모듈 출처·검증 경계 (`INTEGRATION_PROVENANCE.md`)

> **통합 상태**: **MERGED & INTEGRATED INTO `main`** (`InstructorStudyDialog.tsx`, `SequenceWorkbench.tsx` 선택적 디스클로저 연결 완료)

## 1. 모듈 범위 및 통합 상태 (Integrated Module Scope)

- **대상 경로**: `src/features/firstClassTutorialCandidate/**` (브랜치 `feat/first-class-tutorial-candidate`)
- **통합 상태(Integrated)**:
  - 본 모듈은 독립된 후보로 검증된 후 [`src/components/InstructorStudyDialog.tsx`](file:///home/antigravity/blue45f/pilate_flow/src/components/InstructorStudyDialog.tsx) 및 [`src/components/SequenceWorkbench.tsx`](file:///home/antigravity/blue45f/pilate_flow/src/components/SequenceWorkbench.tsx)에 선택적(Opt-In) `<details>` 디스클로저로 연결되었습니다.
  - 프로덕션 라우트·전역 스토어·브라우저 영구 저장소(`localStorage`, `sessionStorage`)에 자동 쓰기를 수행하지 않습니다(`mutatesStoreOrStorage: false`).
  - 실제 제품 화면 연결 내역은 [`INTEGRATION_PATCH_PROPOSAL.md`](file:///home/antigravity/blue45f/pilate_flow/src/features/firstClassTutorialCandidate/INTEGRATION_PATCH_PROPOSAL.md)에 기록되어 있습니다.

---

## 2. 중복 방지 및 3단계 시각 흐름 설계 근거

1. **기존 가이드와의 관계**:
   - [`InstructorStudyDialog.tsx`](file:///home/antigravity/blue45f/pilate_flow/src/components/InstructorStudyDialog.tsx) (`mode === 'guide'`)는 4개 항목(`conditions`, `compose`, `rehearse`, `teach-record`)을 작은 아이콘과 텍스트 번호 목록으로만 표시합니다.
   - [`SequenceWorkbench.tsx`](file:///home/antigravity/blue45f/pilate_flow/src/components/SequenceWorkbench.tsx) (`workbench-welcome`)는 빈 시퀀스 상태에서 정적 이미지와 버튼 2개(`동작 고르기`, `한 줄 아이디어 메모`)만 표시합니다.
   - 본 후보 모듈은 별도의 강제 온보딩 모달을 중복 추가하는 대신, 기존 `InstructorStudyState.completedTutorialTaskIds` 및 워크벤치 콜백(`onOpenIdeaSheet`, `openExerciseFinder`, 서랍 이동)과 그대로 호환되는 **3단계 SVG 스케치 가이드(`<FirstClassTutorialCandidate />`)**를 제공합니다.
2. **3단계 시각 흐름**:
   - **1단계 (`new-movement`)**: `새 동작 한 줄로 적기` (`first-class:new-movement`, 레거시 `'compose'` 호환)
   - **2단계 (`block-composition`)**: `블록으로 묶고 순서 맞추기` (`first-class:block-compose`, 레거시 `'conditions'`, `'compose'` 호환)
   - **3단계 (`save-class`)**: `수업 제목 적고 서랍에 저장하기` (`first-class:save-class`, 레거시 `'rehearse'` 호환)
3. **비차단·비검수 게이트 불변 조건 (`requiresReviewApproval: false`, `isMandatoryTour: false`)**:
   - 미검토 동작(`review: undefined`)이 포함되어 있거나 실습 체크박스를 체크하지 않아도 모든 단계 탭, `이전 단계` / `다음 단계`, `건너뛰기`, `닫기`, `첫 수업 3단계 다시보기`, `1단계부터 다시보기`, `처음부터 다시보기`, 단계별 액션 버튼이 100% 활성 상태로 동작합니다.

---

## 3. 실제 수행된 독립 검증 (Verified Evidence)

외부 패키지 추가 설치나 외부 네트워크 요청 없이 로컬 환경에서 아래 항목을 직접 실행·검증했습니다:

1. **단위 및 독립 경계·접근성 테스트 (Vitest)**:
   - `firstClassTutorialModel.test.ts` (11개 테스트) 및 `firstClassTutorialCandidate.boundaries.test.tsx` (9개 테스트) — **총 2개 파일 20개 테스트 통과**.
   - 검증 항목:
     - 호출자 입력 객체/배열 불변성(`Object.isFrozen(callerInput) === false`, 원본 프로퍼티 변경 없음) 및 반환 `summary` 동결(`Object.isFrozen(summary) === true`).
     - 순환 참조 객체, 프로토타입 오염 키(`__proto__`, `constructor`, `prototype`), 비정상 스칼라, 음수/`NaN`/`Infinity` 시간, 12,000개 원소 배열(`maxScanItems: 10000`, `isPartialContext: true`, `SCAN_LIMIT_REACHED`) 방어.
     - 미검토 동작(`review: undefined`) 및 미체크 상태에서 모든 인터랙션 컨트롤 비차단 검증.
     - `닫기`(`tutorial-dismiss-btn`), `건너뛰기`(`tutorial-skip-btn`), `첫 수업 3단계 다시보기`(`tutorial-reopen-btn`), `1단계부터 다시보기`(`tutorial-reopen-first-btn`), `처음부터 다시보기`(`tutorial-restart-btn`) 상태 전환 및 포커스 복원.
     - WAI-ARIA `tablist` 키보드 탐색(`ArrowRight`, `ArrowLeft`, `Home`, `End`) 및 `Escape` 키 접기 시 포커스 유지.
     - 모션 줄이기(`preferReducedMotion={true}` 및 `prefers-reduced-motion: reduce`) 시 `data-reduced-motion="true"` 설정 및 `scrollIntoView` 미호출/무애니메이션 보장.
     - 다중 인스턴스 동시 렌더링(`<FirstClassTutorialCandidate />` × 2) 시 DOM `[id]` 100% 고유성 및 독립 상태/포커스 검증.
     - `localStorage`, `sessionStorage`, `usePilatesStore` 무변경 검증.
2. **정적 타입 및 린트 검증**:
   - `./node_modules/.bin/tsc -b --pretty false` 및 feature 범위 ESLint 통과.
3. **실제 헤드리스 Chrome 브라우저 검증 (`verifyFirstClassTutorialBrowser.mjs`)**:
   - 로컬 임시 포트(`127.0.0.1:0`) Vite 서버 + 실제 헤드리스 Chrome(`google-chrome`)으로 검증:
     - 뷰포트 `320px`, `390px`, `768px`, `1440px` 전체에서 합성 프리셋 6종 가로 넘침 없음(`document.documentElement.scrollWidth <= window.innerWidth + 1` 및 내부 카드/패널 넘침 0건).
     - `320px` 및 `768px`에서 **200% 글자 크기/확대 검증**(`document.documentElement.style.fontSize = '200%'` 및 페이지 줌) 시 가로 문서 넘침 없음 및 3단계 도해·제목 가독성 유지.
     - 모든 가시 버튼 터치 타깃 최소 크기 `44px × 44px` 이상(`>= 43.9px`) 확인.
     - 키보드 탭 이동(`ArrowRight`, `End`, `Home`), `건너뛰기` → `첫 수업 3단계 다시보기`, `닫기` → `1단계부터 다시보기` 실제 포커스(`document.activeElement`) 확인.
     - `prefers-reduced-motion: reduce` 에뮬레이션 시 `data-reduced-motion="true"` 및 트랜지션 비활성 확인.
     - `window.__firstClassTutorialFixture__.showTwo()` 호출 시 전체 DOM `[id]` 고유성 및 `localStorage` 불변 확인.
     - 스크린샷 아티팩트(`normal-320.png`, `zoom200-320.png`, `collapsed-320.png`, `normal-1440.png`) 및 `results.json` 생성 확인.

---

## 4. 검증 한계 (Limitations & Out of Scope)

- 헤드리스 데스크톱 Chrome의 뷰포트/줌 에뮬레이션 결과이며, 실제 모바일 단말기(iOS Safari, Android Chrome 실기기) 하드웨어 검증은 포함하지 않습니다.
- 3단계 SVG 도해는 앱 화면 사용 순서를 설명하는 **인터페이스 안내 스케치**이며, 실제 필라테스 동작 시범, 해부학적 관절 각도 검증, 또는 임상적·의학적 안전성 보증이 아닙니다(`clinicalOrAnatomicalApproval: false`).
- 공유 컴포넌트(`InstructorStudyDialog.tsx`, `SequenceWorkbench.tsx`)에 실제 패치를 적용한 이후의 전체 앱 통합 회귀 검증은 별도 통합 단계에서 수행해야 합니다.
