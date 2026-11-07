# 첫 수업 3단계 시각 가이드 후보 모듈 통합 제안서 (`INTEGRATION_PATCH_PROPOSAL.md`)

> [!IMPORTANT]
> **통합 상태**: **APPLIED & INTEGRATED INTO `main`** ([`src/components/InstructorStudyDialog.tsx`](file:///home/antigravity/blue45f/pilate_flow/src/components/InstructorStudyDialog.tsx) 및 [`src/components/SequenceWorkbench.tsx`](file:///home/antigravity/blue45f/pilate_flow/src/components/SequenceWorkbench.tsx) 선택적 디스클로저 연결 완료)

---

## 1. 기존 화면과의 관계 및 개선 목적 (Why Upgrade Instead of Duplicate)

현재 저장소에는 첫 수업 작성 안내와 관련된 두 가지 지점이 존재합니다:

1. **[`src/components/InstructorStudyDialog.tsx`](file:///home/antigravity/blue45f/pilate_flow/src/components/InstructorStudyDialog.tsx#L14-L60) (`mode === 'guide'`, `'사용법 다시 보기'` 탭)**:
   - `INSTRUCTOR_TUTORIAL_TASKS` 4단계(`conditions`, `compose`, `rehearse`, `teach-record`)를 작은 Lucide 아이콘 하나와 줄글 목록(`<ol>`)만으로 보여줍니다.
   - 강사가 **이름만 적은 새 동작 아이디어 → 블록 구성 및 순서 조정 → 수업 제목 입력 후 서랍 저장**으로 이어지는 실제 워크벤치 UI 흐름을 시각적으로 한눈에 파악하기 어렵습니다.
2. **[`src/components/SequenceWorkbench.tsx`](file:///home/antigravity/blue45f/pilate_flow/src/components/SequenceWorkbench.tsx#L583-L627) (`workbench-welcome` 빈 상태 배너)**:
   - 동작이 0개인 상태에서 정적 배너 이미지와 `'동작 고르기'` / `'한 줄 아이디어 메모'` 버튼만 표시하며, 원할 때 펼쳐보고 즉시 접을 수 있는(`건너뛰기` / `닫기` / `다시보기`) **3단계 시각 가이드**가 없습니다.

### 후보 모듈(`firstClassTutorialCandidate`)이 해결하는 방식
- 새로운 팝업 투어나 강제 온보딩 모달을 추가하는 대신, 기존 두 지점 중 하나(또는 둘 다)에 **props 계약만으로 꽂을 수 있는 단일 시각 가이드 컴포넌트(`<FirstClassTutorialCandidate />`)**를 제공합니다.
- **3단계 핵심 흐름 도해(`FirstClassTutorialIllustrations.tsx`)**:
  - **1단계 (`new-movement`)**: `새 동작 한 줄로 적기` — 동작 이름만 적어도 바로 초안이 되며, 검토 완료 여부와 무관하게 수업에 담을 수 있음을 스케치 도해로 안내.
  - **2단계 (`block-composition`)**: `블록으로 묶고 순서 맞추기` — 준비·본운동·마무리 흐름 속에서 동작과 묶음 블록, 휴식의 순서를 맞추는 과정을 시각적으로 안내.
  - **3단계 (`save-class`)**: `수업 제목 적고 서랍에 저장하기` — 제목을 붙여 내 수업 서랍에 보관하고 언제든 다시 꺼내 쓰는 흐름을 안내.
- **비차단·비검수 게이트 원칙**:
  - `건너뛰기`(`onSkip`), `닫기`(`onDismiss`), `첫 수업 3단계 다시보기` / `1단계부터 다시보기`(`onReopen`)를 항상 제공하여 작업 공간을 가리지 않습니다.
  - 미검토 동작(`review === undefined`)이나 미체크 실습 항목이 있어도 탭 이동, 이전/다음 단계, 바로가기 버튼, 수업 저장을 **절대 막거나 비활성화하지 않습니다(`requiresReviewApproval: false`, `isMandatoryTour: false`)**.

---

## 2. 공개 Export 계약 ([`src/features/firstClassTutorialCandidate/index.ts`](file:///home/antigravity/blue45f/pilate_flow/src/features/firstClassTutorialCandidate/index.ts))

```ts
import {
  FirstClassTutorialCandidate,
  FirstClassTutorialFixtureHarness,
  FirstClassTutorialIllustration,
  FIRST_CLASS_TUTORIAL_STEPS,
  FIRST_CLASS_TUTORIAL_FIXTURE_PRESETS,
  resolveFirstClassTutorialContext,
  getFirstClassTutorialStepSpec,
  type FirstClassTutorialCandidateProps,
  type FirstClassTutorialContextSummary,
  type FirstClassTutorialStepId,
  type FirstClassTutorialTaskId,
} from '../features/firstClassTutorialCandidate';
```

---

## 3. 최소 통합 패치 옵션 (Minimal Integration Diff Proposals)

### Patch Option A: [`src/components/InstructorStudyDialog.tsx`](file:///home/antigravity/blue45f/pilate_flow/src/components/InstructorStudyDialog.tsx) (`mode === 'guide'` 시각 업그레이드)

- **목적**: 기존 텍스트 전용 `<PfCard className="study-guide">`를 `<FirstClassTutorialCandidate variant="study-guide-panel" />`로 교체하거나 보강하여, 강사 연습실의 `'사용법 다시 보기'` 탭에서 3단계 SVG 도해와 실습 체크(`study.completedTutorialTaskIds` + `onTutorialTaskChange` 하위 호환)를 그대로 사용할 수 있게 합니다.
- **상태·저장소 영향**: 기존 `InstructorStudyDialogProps` 시그니처를 변경하지 않으며, `study.completedTutorialTaskIds`(`'conditions' | 'compose' | 'rehearse' | 'teach-record'` 및 `'first-class:*'`)와 100% 호환됩니다.

```diff
--- a/src/components/InstructorStudyDialog.tsx
+++ b/src/components/InstructorStudyDialog.tsx
@@ -10,6 +10,7 @@ import { getExerciseReviewState } from '../utils/exerciseReview';
 import { ExerciseEvidencePanel } from './ExerciseEvidencePanel';
 import { LightDismissDialog } from './LightDismissDialog';
 import { MotionReferencePlayer } from './MotionReferencePlayer';
+import { FirstClassTutorialCandidate } from '../features/firstClassTutorialCandidate';
 import '../styles/design-tokens.css';
 import '../styles/instructor-study.css';
 
@@ -131,63 +132,16 @@ export function InstructorStudyDialog({
           onChange={setMode}
         />
         {mode === 'guide' ? (
-          <PfCard
-            as="section"
-            variant="subtle"
-            className="study-guide"
-            aria-label="수업 준비 사용법"
-          >
-            <div className="study-guide-top">
-              <p className="study-step-counter" role="status">
-                {tutorialIndex + 1} / {INSTRUCTOR_TUTORIAL_TASKS.length} · 짧은 사용법
-              </p>
-              {taskComplete && <PfBadge tone="success">실습 확인됨</PfBadge>}
-            </div>
-            <div className="study-guide-icon" aria-hidden="true">
-              <task.icon size={28} />
-            </div>
-            <h3>{task.title}</h3>
-            <p>{task.body}</p>
-            <ol className="study-guide-actions">
-              {task.steps.map((step) => (
-                <li key={step}>{step}</li>
-              ))}
-            </ol>
-            <label className="study-task-check">
-              <input
-                type="checkbox"
-                checked={taskComplete}
-                onChange={(event) => onTutorialTaskChange(task.id, event.target.checked)}
-              />
-              이 기능을 직접 해봤어요
-            </label>
-            <p className="muted">내 사용법 체크이며, 운동·모션 검수와는 달라요.</p>
-            <nav className="study-guide-navigation" aria-label="사용법 단계">
-              <PfButton
-                variant="secondary"
-                disabled={tutorialIndex === 0}
-                onClick={() => setTutorialIndex((index) => index - 1)}
-              >
-                이전
-              </PfButton>
-              <PfButton
-                variant="primary"
-                disabled={tutorialIndex === INSTRUCTOR_TUTORIAL_TASKS.length - 1}
-                onClick={() => setTutorialIndex((index) => index + 1)}
-              >
-                다음
-              </PfButton>
-            </nav>
-            {onOpenWorkbench && (
-              <PfButton
-                variant="secondary"
-                className="study-guide-return"
-                onClick={onOpenWorkbench}
-              >
-                내 수업 구성으로 가기
-              </PfButton>
-            )}
-          </PfCard>
+          <FirstClassTutorialCandidate
+            variant="study-guide-panel"
+            source={{
+              exercises,
+              completedTutorialTaskIds: study.completedTutorialTaskIds,
+            }}
+            completedTaskIds={study.completedTutorialTaskIds}
+            onTaskToggle={(taskId, completed) => onTutorialTaskChange(taskId, completed)}
+            onReturnToWorkbench={onOpenWorkbench}
+          />
         ) : (
           <div className="study-layout">
```

---

### Patch Option B: [`src/components/SequenceWorkbench.tsx`](file:///home/antigravity/blue45f/pilate_flow/src/components/SequenceWorkbench.tsx) (`workbench-welcome` 인라인 접기/펴기 카드 연결)

- **목적**: 첫 수업 작성 시 `workbench-welcome` 하단에 비차단(non-blocking) 인라인 시각 가이드를 배치하고, 각 단계의 바로가기 액션(`onStepAction`)을 기존 워크벤치 함수(`openIdeaSheet(null)`, `openExerciseFinder()`, `handleSave()` / 서랍 이동)에 연결합니다.
- **비차단 보장**: 강사가 `건너뛰기` 또는 `닫기`를 누르면 한 줄 요약 바(`첫 수업 3단계 다시보기` / `1단계부터 다시보기`)로 즉시 접히며, 수업 작성·동작 추가·자동 생성을 전혀 가로막지 않습니다.

```diff
--- a/src/components/SequenceWorkbench.tsx
+++ b/src/components/SequenceWorkbench.tsx
@@ -87,6 +87,7 @@ import { SequencePlanPreview } from './SequencePlanPreview';
 import { MotionPatternGallery } from './MotionPatternGallery';
 import { ClassInsightsDialog } from './ClassInsightsDialog';
 import { AiSequenceCoPilotPanel } from './AiSequenceCoPilotPanel';
+import { FirstClassTutorialCandidate } from '../features/firstClassTutorialCandidate';
 import '../styles/design-tokens.css';
 import '../styles/workbench-usability.css';
 import '../styles/workbench-vnext.css';
@@ -623,6 +624,25 @@ export function SequenceWorkbench({
               추가하고, 순서를 바꾸고, 저장하세요. 검토는 선택입니다.
             </p>
           </div>
+          <FirstClassTutorialCandidate
+            variant="inline-card"
+            source={{
+              title: s.activeTitle,
+              targetMinutes: criteria.targetMinutes,
+              steps: s.activeSteps,
+              exercises: s.exercises,
+              savedSequences: s.savedSequences,
+              completedTutorialTaskIds: s.instructorStudyState?.completedTutorialTaskIds,
+            }}
+            completedTaskIds={s.instructorStudyState?.completedTutorialTaskIds}
+            onTaskToggle={(taskId, completed) => s.setStudyTutorialTaskCompleted(taskId, completed)}
+            onStepAction={(stepId) => {
+              if (stepId === 'new-movement') openIdeaSheet(null);
+              else if (stepId === 'block-composition') openExerciseFinder();
+              else if (stepId === 'save-class') s.setActiveTab('binder');
+            }}
+          />
         </section>
       )}
```

---

## 4. 통합 전 후보 상태 vs 실제 검증 완료 범위 구분

| 항목 | 현재 상태 | 근거 및 확인 방법 |
| --- | --- | --- |
| 프로덕션 화면(`App.tsx`, `InstructorStudyDialog.tsx`, `SequenceWorkbench.tsx`) 연결 | **미연결 (Pre-integration Candidate)** | 공유 파일 `git diff` 0건; 위 Patch Option A/B는 통합 검토용 제안 코드임 |
| `usePilatesStore` / `localStorage` 자동 변경 | **수행 안 함 (`mutatesStoreOrStorage: false`)** | `firstClassTutorialCandidate.boundaries.test.tsx` 및 브라우저 검증에서 `localStorage` 불변 확인 |
| 운동·모션 검수 강제 게이트 여부 | **게이트 없음 (`requiresReviewApproval: false`)** | 미검토 동작(`review: undefined`) 포함 시에도 모든 탭·이동·닫기·액션 버튼 100% 활성 |
| 단위·경계·접근성 테스트 (Vitest) | **검증 완료** | `firstClassTutorialModel.test.ts` + `firstClassTutorialCandidate.boundaries.test.tsx` 통과 |
| 실제 헤드리스 Chrome 브라우저 검증 (320/390/768/1440px, 200% 글자 확대, 44px 터치 타깃, 키보드 탭, 모션 줄이기, 다중 인스턴스 ID 고유성) | **검증 완료** | `node src/features/firstClassTutorialCandidate/verifyFirstClassTutorialBrowser.mjs` 실행 결과 `results.json` 및 스크린샷 아티팩트 확인 |
| 임상·해부학적 효과 또는 운동 안전성 보증 | **보증 안 함 (`clinicalOrAnatomicalApproval: false`)** | UI 사용법 안내 전용이며 운동 처방·해부학 검수와 무관함 |
