# Class Cue Sheet 실제 앱 통합 패치 제안서 (`INTEGRATION_PATCH_PROPOSAL.md`)

> **기준 원격 브랜치**: `origin/main` @ `222b59edf47653a36c4f754b2a572c19cd12cb30`
> **기능 브랜치**: `feat/class-cue-sheet` @ `51a6f6bd89687730aba87d004740a34bca4b9c51`
> **문서 목적**: `src/features/classCueSheet/**` 14개 파일을 `origin/main`에 반입한 뒤, 실제 앱 화면 3곳(`SequencePlanPreview.tsx`, `ClassBinderView.tsx`, `LiveStageView.tsx`)에 최소 변경으로 안전하게 연결하기 위한 구체적 `diff --git` 패치와 검증 계약을 정의합니다.

---

## 1. 통합 설계 원칙 (Integration Principles)

1. **기본 접힘 / 선택적 진입 (Opt-In Disclosure by Default)**
   - 기존 화면의 기본 렌더링 트리, 포커스 순서, 기존 통합 테스트(`SequencePlanPreview`, `ClassBinderView`, `LiveStageView`)를 깨뜨리지 않도록 모든 진입점은 기본값 `false`(접힘/꺼짐) 상태의 선택적 토글(`showCueSheet`) 또는 `<details>` 디스클로저로 연결합니다.
2. **필수 검토 게이트 없음 (`data-mandatory-review-gate="false"`)**
   - 이름만 적은 새 동작(`name-only`), 사용자 창작 초안(`human-draft`), 시간 미정(`unspecified`) 항목이 포함된 수업안이라도 `"사본 저장"`이나 `"수업 시작"` 버튼을 차단하지 않고 즉시 큐시트를 열람·인쇄할 수 있습니다.
3. **원본 스토어·타이머·이력 스냅샷 무변형 (Zero Mutation Guarantee)**
   - `ClassCueSheetPreview`와 `buildClassCueSheetProjection`은 전달받은 `sourceInput`을 읽기 전용으로만 투영합니다. `usePilatesStore`, 리허설 타이머(`useSequenceRehearsal`), 라이브 스테이지 타이머(`TeachingClock`), 수업 완료 이력(`TeachingLogContext` / `TeachingProgramSnapshot`)을 절대 수정하지 않습니다.
4. **구조적 타이핑 호환성 (`CueSheetSourceInput`)**
   - `sourceInput` prop은 `SavedSequence`, `ClassSequenceSnapshot`, `TeachingProgramSnapshot`, `ResolvedTeachingHistoryView`, 또는 `{ title, steps, exercises, targetMinutes }` 형태의 스냅샷 객체를 별도 변환기 없이 직접 수신합니다.

---

## 2. 사전 조건: `origin/main` 대비 의존성 호환성 점검 결과

`29a6edb`(분기 베이스)부터 `222b59e`(최신 `origin/main`)까지 변경된 커밋을 전수 조사한 결과:

| `classCueSheet`가 참조하는 내부 모듈 | `29a6edb..origin/main` 변경 여부 | 호환성 판정 |
| :--- | :---: | :--- |
| `src/data/equipmentCatalog.ts` | 변경 없음 (`0 lines`) | **100% 호환** |
| `src/data/pilatesCatalog.ts` | 변경 없음 (`0 lines`) | **100% 호환** |
| `src/types/hierarchy.ts` | 변경 없음 (`0 lines`) | **100% 호환** |
| `src/types/pilates.ts` | 변경 없음 (`0 lines`) | **100% 호환** |
| `src/types/sequenceMotion.ts` | 변경 없음 (`0 lines`) | **100% 호환** |
| `src/types/classBlockPresets.ts` | 변경 없음 (`0 lines`) | **100% 호환** |
| `src/utils/hierarchyModel.ts` | 변경 없음 (`0 lines`) | **100% 호환** |
| `src/utils/sequenceEngine.ts` | 변경 없음 (`0 lines`) | **100% 호환** |
| `src/types/teachingHistorySnapshot.ts` | `TeachingProgramSnapshotItem`에 선택적 필드 3개(`stepClassSection?`, `timeEstimate?`, `motionStudy?`)만 추가됨 | **100% 하위 호환** (읽기 전용 구조적 타이핑 어댑터) |

---

## 3. 연결 지점별 최소 통합 패치 제안 (`origin/main` `222b59e` 기준)

### 연결 지점 1: [`src/components/SequencePlanPreview.tsx`](file:///home/antigravity/blue45f/pilate_flow/src/components/SequencePlanPreview.tsx)
**(리허설 / 전체 수업 계획 미리보기 모달 내 큐시트 토글 연결)**

#### 설계 배경
- `origin/main`의 커밋 `03d3386`(`Add optional read-only class planning summary to rehearsal`)에서 `SequencePlanPreview.tsx`의 시간 합계(`<dl className="sequence-preview-totals panel">`) 바로 아래에 `<ClassPlanSummary {...snapshot} />`(`<details className="class-plan-summary"><summary>시간·좌우 편성 살펴보기</summary>...</details>`)가 추가되었습니다.
- 동일한 패턴으로 `<ClassPlanSummary {...snapshot} />` 바로 아래에 선택적 `<details className="class-cue-sheet-disclosure">` (`showCueSheet` 상태 지연 마운트)를 배치하면:
  - `ClassPlanSummary`와 시각적·구조적으로 일관된 보조 도구 모음을 구성합니다.
  - 강사가 미리보기 모달에서 현재 선택한 항목(`initialStepIndex={index}`) 기준으로 큐시트를 즉시 펼쳐 보거나 로컬 인쇄 미리보기를 켤 수 있습니다.
  - 하단의 `"편집으로 돌아가기"`, `"사본 저장"`, `"수업 시작"` 버튼 및 리허설 재생 게이트(`model.gate.canRehearse`)에 어떠한 영향도 주지 않습니다.

#### 제안 패치 (`diff --git`)
```diff
diff --git a/src/components/SequencePlanPreview.tsx b/src/components/SequencePlanPreview.tsx
index 64714ca..e8b4c21 100644
--- a/src/components/SequencePlanPreview.tsx
+++ b/src/components/SequencePlanPreview.tsx
@@ -1,4 +1,5 @@
 import { ClassPlanSummary } from './ClassPlanSummary';
+import { ClassCueSheetPreview } from '../features/classCueSheet';
 import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
 import {
   ArrowLeft,
@@ -113,6 +114,7 @@ export function SequencePlanPreview({
     snapshot.steps.some((step) => !isRestStep(step) && step.motionStudy) ? 'connected' : 'timeline',
   );
   const [segmentRehearsalOpen, setSegmentRehearsalOpen] = useState(false);
+  const [showCueSheet, setShowCueSheet] = useState(false);
   const segmentEntryRef = useRef<HTMLButtonElement>(null);
   const liveSteps = usePilatesStore((state) => state.activeSteps);
   const liveExercises = usePilatesStore((state) => state.exercises);
@@ -305,6 +307,21 @@ export function SequencePlanPreview({
             </div>
           </dl>
           <ClassPlanSummary {...snapshot} />
+          <details
+            className="class-plan-summary class-cue-sheet-summary"
+            onToggle={(event) => setShowCueSheet(event.currentTarget.open)}
+          >
+            <summary>강사용 진행 큐시트 · 인쇄 미리보기</summary>
+            {showCueSheet && (
+              <ClassCueSheetPreview
+                sourceInput={snapshot}
+                projectionOptions={{ exercises }}
+                initialStepIndex={index}
+                showFixtureSwitcher={false}
+              />
+            )}
+          </details>
           {selected && (
             <nav className="simulation-item-navigation" aria-label="미리보기 항목 이동">
               <p>
```

---

### 연결 지점 2: [`src/components/ClassBinderView.tsx`](file:///home/antigravity/blue45f/pilate_flow/src/components/ClassBinderView.tsx)
**(수업 바인더 저장본 열람 및 다중 페이지 A4/Letter 로컬 인쇄 미리보기)**

#### 설계 배경
- `origin/main`의 `ClassBinderView.tsx`는 저장한 시퀀스 카드에서 `"인쇄"` 버튼 클릭 시 `printSequence` 모달(`LightDismissDialog`, 883~902행)을 열고 단일 `<pre>{printSequence ? sheetFor(printSequence) : ''}</pre>` 평문만 출력합니다. 또한 `"이력 다시 열기"` 모달(`reopenedView`, 903~1109행)에서는 스냅샷 내역만 나열합니다.
- 기존 `<pre>` 출력을 그대로 유지하면서(기존 테스트 하위 호환성 100% 보장), 인쇄 모달 및 이력 상세 모달 안에 선택적 `<details>` 패널로 `<ClassCueSheetPreview>`를 마운트하면:
  - 저장 시퀀스에 포함된 **이름만 적은 초안 동작(`humanDrafts`)** 및 **재사용 블록(`reusableBlocks`)**까지 누락 없이 구조화된 큐시트로 확인할 수 있습니다.
  - A4(`8.27in × 11.69in`) 및 US Letter(`8.5in × 11in`) 다중 페이지 레이아웃으로 잘림 없이 인쇄할 수 있습니다.

#### 제안 패치 (`diff --git`)
```diff
diff --git a/src/components/ClassBinderView.tsx b/src/components/ClassBinderView.tsx
index 7a11d24..c52b910 100644
--- a/src/components/ClassBinderView.tsx
+++ b/src/components/ClassBinderView.tsx
@@ -65,6 +65,7 @@ import {
   formatTeachingHistorySnapshotText,
   resolveTeachingHistoryView,
 } from '../utils/teachingHistorySnapshot';
+import { ClassCueSheetPreview } from '../features/classCueSheet';
 import { LightDismissDialog } from './LightDismissDialog';
 import type { TeachingLogContext } from './LogSessionModal';
 import '../styles/design-tokens.css';
@@ -133,6 +134,7 @@ export const ClassBinderView: React.FC<ClassBinderViewProps> = ({
   const [pendingDelete, setPendingDelete] = useState<string | null>(null);
   const [printSequence, setPrintSequence] = useState<SavedSequence | null>(null);
   const [reopenedHistoryId, setReopenedHistoryId] = useState<string | null>(null);
+  const [showBinderCueSheet, setShowBinderCueSheet] = useState(false);
   const groupNameInputRef = useRef<HTMLInputElement | null>(null);
   const groupErrorId = useId();
 
@@ -882,13 +884,32 @@ export const ClassBinderView: React.FC<ClassBinderViewProps> = ({
       </p>
       <LightDismissDialog
         open={Boolean(printSequence)}
-        onClose={() => setPrintSequence(null)}
+        onClose={() => {
+          setPrintSequence(null);
+          setShowBinderCueSheet(false);
+        }}
         title="수업 계획 인쇄"
         subtitle="동작의 양쪽 수행·설명·전환과 별도 휴식을 포함한 전체 수업 시간입니다."
       >
         <div className="teaching-print-sheet">
           <p>강사 검토용 계획 · 스프링과 세팅은 실제 기구에서 확인해 주세요.</p>
           <pre>{printSequence ? sheetFor(printSequence) : ''}</pre>
+          {printSequence && (
+            <details
+              className="teaching-cue-sheet-disclosure"
+              onToggle={(event) => setShowBinderCueSheet(event.currentTarget.open)}
+            >
+              <summary>강사용 큐시트 레이아웃 · 다중 페이지 인쇄 미리보기</summary>
+              {showBinderCueSheet && (
+                <ClassCueSheetPreview
+                  sourceInput={printSequence}
+                  projectionOptions={{ exercises: exercisesMap, humanDrafts, reusableBlocks }}
+                  initialPrintPreviewMode={true}
+                  showFixtureSwitcher={false}
+                />
+              )}
+            </details>
+          )}
         </div>
         <div className="teaching-form-actions">
           <PfButton variant="secondary" onClick={() => setPrintSequence(null)}>
```

---

### 연결 지점 3: [`src/components/LiveStageView.tsx`](file:///home/antigravity/blue45f/pilate_flow/src/components/LiveStageView.tsx)
**(라이브 스테이지 수업 진행 중 강사용 큐시트 보조 뷰)**

#### 설계 배경
- `origin/main`의 `LiveStageView.tsx`는 상단 `.teaching-stage-utility`(580~605행)에 고대비 토글, 전체 화면 토글, `"종료 / 기록"` 버튼을 제공합니다.
- 여기에 선택적 `'큐시트 보기'` 토글 버튼(`showCueSheet`, 기본값 `false`)을 추가하고, 활성화 시 `<ClassCueSheetPreview sourceInput={stageCueSheetInput} initialStepIndex={clock.index} showFixtureSwitcher={false} />`를 렌더링하면:
  - 초보 강사가 수업 진행 중 `44px × 44px` 대형 이전/다음 버튼과 `100% / 125% / 150% / 200%` 글자 확대 기능을 갖춘 현재/다음 포커스 데크를 보조 뷰로 사용할 수 있습니다.
  - 또한 미검토/초안 동작이 포함되어 `unavailable.length > 0`(475~502행)으로 타이머 스테이지가 제한된 경우에도, 읽기 전용 큐시트를 펼쳐 수업을 중단 없이 진행할 수 있습니다.
  - `TeachingClock`, 음성 안내(`useClassVoiceGuidance`), 수업 종료 기록(`logContext`) 상태를 전혀 변경하지 않습니다.

#### 제안 패치 (`diff --git`)
```diff
diff --git a/src/components/LiveStageView.tsx b/src/components/LiveStageView.tsx
index 9e312f4..4d82a19 100644
--- a/src/components/LiveStageView.tsx
+++ b/src/components/LiveStageView.tsx
@@ -35,6 +35,7 @@ import {
 } from '../utils/sequenceEngine';
 import { isExerciseAutoEligible } from '../utils/exerciseReview';
 import { isExerciseAuthoringEligible } from '../utils/exerciseAuthoring';
+import { ClassCueSheetPreview } from '../features/classCueSheet';
 import { LightDismissDialog } from './LightDismissDialog';
 import type { TeachingLogContext } from './LogSessionModal';
 import '../styles/teaching.css';
@@ -134,6 +135,7 @@ export const LiveStageView: React.FC<LiveStageViewProps> = ({
   const [reviewOpen, setReviewOpen] = useState(false);
   const [exitOpen, setExitOpen] = useState(false);
   const [showAllCues, setShowAllCues] = useState(false);
+  const [showCueSheet, setShowCueSheet] = useState(false);
   const wakeRef = useRef<WakeLockSentinel | null>(null);
   const mounted = useRef(true);
   const runningIntent = useRef(false);
@@ -171,6 +173,15 @@ export const LiveStageView: React.FC<LiveStageViewProps> = ({
     () => new Map(exercises.map((exercise) => [exercise.id, exercise])),
     [exercises],
   );
+  const stageCueSheetInput = useMemo(
+    () => ({
+      id: session.id ?? 'live-stage-session',
+      title: session.title,
+      steps,
+      exercises,
+    }),
+    [session.id, session.title, steps, exercises],
+  );
   const current = steps[clock.index];
   const currentIsRest = !!current && isRestStep(current);
   const exercise = current ? exerciseMap.get(current.exerciseId) : undefined;
@@ -578,6 +589,15 @@ export const LiveStageView: React.FC<LiveStageViewProps> = ({
           </p>
         </div>
         <div className="teaching-stage-utility">
+          <button
+            type="button"
+            className="btn-secondary"
+            aria-pressed={showCueSheet}
+            onClick={() => setShowCueSheet((value) => !value)}
+          >
+            {showCueSheet ? '큐시트 닫기' : '큐시트 보기'}
+          </button>
           <button
             type="button"
             className="icon-btn"
             aria-label="수업 화면 고대비"
@@ -604,6 +624,18 @@ export const LiveStageView: React.FC<LiveStageViewProps> = ({
           </button>
         </div>
       </header>
+      {showCueSheet && (
+        <section
+          className="panel teaching-stage-cue-sheet"
+          aria-label="강사용 수업 진행 큐시트 보조 뷰"
+        >
+          <ClassCueSheetPreview
+            sourceInput={stageCueSheetInput}
+            initialStepIndex={clock.index}
+            showFixtureSwitcher={false}
+          />
+        </section>
+      )}
       <div className="teaching-stage-layout">
         <section
           className={`panel teaching-current-panel ${currentIsRest ? 'is-rest' : ''}`}
```

---

## 4. 연결 패치 적용 후 통합 검증 체크리스트 및 명령어

위 3개 연결 지점 중 하나 이상을 적용한 뒤에는 아래 체크리스트와 명령어로 회귀 여부를 검증합니다.

### 4.1 필수 체크리스트
- [ ] **기본 상태 비간섭**: `SequencePlanPreview`, `ClassBinderView`, `LiveStageView` 최초 진입 시 `showCueSheet` / `showBinderCueSheet`가 기본 닫힘(`false`) 상태이며, 기존 화면 레이아웃과 포커스 이동이 변하지 않는가?
- [ ] **필수 검토 게이트 부재**: 미검토 동작이나 이름만 적은 동작이 포함된 수업에서 큐시트를 열었을 때 `"사본 저장"` 또는 `"수업 시작"` 버튼이 비활성화되지 않는가?
- [ ] **키보드 단축키 격리**: 큐시트가 열린 상태에서 모달/스테이지 내 검색창(`input`), 메모창(`textarea`), 속도 선택(`select`)에 키보드로 입력하거나 방향키를 누를 때 큐시트 스텝이 오작동하지 않는가?
- [ ] **라이브 스텝 동기화**: `LiveStageView`에서 `clock.index`가 진행된 상태에서 `'큐시트 보기'`를 열면 해당 스텝(`initialStepIndex={clock.index}`)으로 포커스 데크가 시작되는가?
- [ ] **다중 페이지 인쇄 보존**: `ClassBinderView` 인쇄 모달에서 큐시트 미리보기를 열고 인쇄(`@media print`)할 때 접혀 있던 전체 진행표 목록이 자동으로 모두 펼쳐져 인쇄되는가?

### 4.2 검증 실행 명령어
```bash
# 1) 전체 프로젝트 TypeScript 타입체크
npx tsc -b

# 2) ESLint 검증 (신규 모듈 + 연결 대상 컴포넌트 3곳)
npx eslint \
  src/features/classCueSheet \
  src/components/SequencePlanPreview.tsx \
  src/components/ClassBinderView.tsx \
  src/components/LiveStageView.tsx

# 3) Class Cue Sheet 전용 48개 테스트 스위트 실행
pnpm vitest run src/features/classCueSheet

# 4) 연결 지점 관련 기존 앱 회귀 테스트 실행
pnpm vitest run \
  src/test/sequencePlanPreview.test.tsx \
  src/test/classPlanSummary.test.tsx \
  src/test/teachingHistorySnapshot.test.tsx \
  src/test/liveStageVoice.test.tsx

# 5) 실제 Headless Chromium 4개 뷰포트(320/390/768/1440px)·200% 확대·A4/Letter PDF 프로브
node src/features/classCueSheet/verifyClassCueSheetBrowser.mjs
```
