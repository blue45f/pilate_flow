# `presetSuggestionCandidate` 비침투적 통합 제안서 (Coordinator Hand-off)

> [!IMPORTANT]
> **통합 상태: APPLIED & INTEGRATED INTO `main`**
> - 본 후보 모듈(`src/features/presetSuggestionCandidate/**`)은 `src/components/OfflinePresetPicker.tsx`의 `'시간·휴식 맞춤 후보'` 탭으로 비침투적 통합 완료되었습니다.

---

## 1. 아키텍처 정합성 및 기존 모듈과의 역할 분담

| 구분 | 기존 `OfflinePresetPicker.tsx` | 기존 `sequenceEngine.ts` | 개선 후보 `presetSuggestionCandidate` |
| --- | --- | --- | --- |
| **주 입력** | 기구·주제·정적 시간(`15/20/30/45/50/60분`) 필터 | `AutoGenerateCriteria` 기반 단일 시퀀스 생성 | 기구·주제·임의 목표시간(`10~120분`)·쉬는시간(`restMinutes`)·선택적 시드(`seedPlan`) |
| **추천 계층** | 정적 프리셋 목록 단순 필터링 (일치 항목 없으면 빈 목록) | 카탈로그 기반 단일 자동 생성 | **Tier 1** (정확 일치/시간·휴식 적응 오프라인 수업 프리셋) + **Tier 2** (준비·메인·마무리 오프라인 블록 조립) + **Tier 3** (카탈로그 동작 ID 결정론적 조합 A/B) |
| **경계·불가능 진단** | 준비 실패 시 일반 알림 문구만 표시 | `throw new Error(...)` 중심 | **6대 경계 범주(`PresetSuggestionIssueCode` 25종)** 및 **목표시간 불가능 사유(`TargetTimeImpossibilityReason` 11종)** 구조화 반환 |
| **출력 형태** | `applyPresetDraft` 전달용 단일 객체 | `SequenceStep[]` | 동결된 `PresetSuggestionResult` + `instantiateSuggestedCandidateAsEditableDraft()`를 통한 **비동결 편집용 `SavedSequence` / `ConditionTemplate` / `SequenceStep[]` 사본** |
| **진실성 경계** | 오프라인 템플릿 안내 문구 | 규칙 기반 생성 | `DEFAULT_PRESET_SUGGESTION_TRUTH_BOUNDARY` (`aiUsed: false`, `clinicalSafetyGuaranteed: false`, `catalogIdsOnly: true`, `isEditableDraft: true`) |

---

## 2. 제안 방식 A: `OfflinePresetPicker.tsx` 내 비침투적 연결 (권장)

기존 `OfflinePresetPicker`에서 정적 시간(`15, 20, 30, 45, 50, 60분`)과 정확히 일치하는 프리셋이 없거나, 강사가 현재 수업 조건(예: `40분 수업 + 3분 휴식`)에 맞춘 후보 초안을 비교하고 싶을 때 기존 `applyPresetDraft` 스토어 액션을 그대로 재사용해 연결할 수 있습니다.

### 예시 Unified Diff (`src/components/OfflinePresetPicker.tsx`)

```diff
--- a/src/components/OfflinePresetPicker.tsx
+++ b/src/components/OfflinePresetPicker.tsx
@@ -12,10 +12,14 @@ import {
 import { formatSecondsToMMSS, getStepTiming } from '../utils/sequenceEngine';
 import { usePilatesStore } from '../store/usePilatesStore';
 import type { PilatesStudioState } from '../store/usePilatesStore';
+import {
+  PresetSuggestionCandidatePreview,
+  suggestPresetCandidates,
+} from '../features/presetSuggestionCandidate';
 import '../styles/offline-presets.css';
 
-type Kind = 'class' | 'block';
+type Kind = 'class' | 'block' | 'suggested';
 interface Selection {
   kind: Kind;
   id: string;
   expected: PilatesStudioState;
 }
@@ -143,6 +147,16 @@ export function OfflinePresetPicker({ onApplied }: { onApplied: (message: string
         >
           연계 동작 묶음 · {OFFLINE_BLOCK_PRESETS.length}
         </button>
+        <button
+          type="button"
+          aria-pressed={kind === 'suggested'}
+          onClick={() => {
+            setKind('suggested');
+            resetSelection();
+          }}
+        >
+          시간·휴식 맞춤 후보
+        </button>
       </div>
+      {kind === 'suggested' && (
+        <PresetSuggestionCandidatePreview
+          request={{
+            apparatus: apparatus === 'all' ? state.activeApparatus : apparatus,
+            theme: theme === 'all' ? 'full-body-flow' : theme,
+            targetMinutes:
+              minutes === 'all' ? state.activeTargetMinutes || 50 : Number(minutes),
+            restMinutes: state.draftCriteria?.restMinutes ?? 0,
+            level: state.activeLevel,
+            exercises: state.exercises,
+            historyLogs: state.historyLogs,
+          }}
+          onInstantiateEditableDraft={(draft) => {
+            const current = usePilatesStore.getState();
+            const applied = current.applyPresetDraft(
+              {
+                steps: draft.steps,
+                title: draft.sequence.title,
+                subtitle: draft.sequence.subtitle,
+                targetMinutes: draft.sequence.targetMinutes,
+              },
+              current.activeSteps.length > 0 ? 'append' : 'replace',
+              current,
+            );
+            if (applied.success) onApplied(applied.message);
+            else setMessage(applied.message);
+          }}
+        />
+      )}
```

### 장점
- `usePilatesStore.ts`를 전혀 수정하지 않고 기존 `applyPresetDraft(prepared, mode, expected)`의 낙관적 동시성 검사(`expected === state`)와 되돌리기(`undoStack`) 계약을 그대로 활용할 수 있습니다.
- 기존 `OfflinePresetPicker`의 정적 탭(`수업 전체`, `연계 동작 묶음`) 동작과 테스트를 100% 보존합니다.

---

## 3. 제안 방식 B: `SequenceWorkbench.tsx`에서 시드/잠금 스텝 유지 및 목표시간 가능성 진단 연결

강사가 이미 일부 동작을 담아 두었거나 특정 스텝을 잠근(`locked: true`) 상태에서 목표 시간이나 쉬는 시간을 변경했을 때, `seedPlan`으로 `s.activeSteps`를 전달하면 **편측 불균형·잠금 시간 초과·휴식 예산 초과 여부**를 실시간으로 진단하고 맞춤 초안을 복사할 수 있습니다.

### 예시 Unified Diff (`src/components/SequenceWorkbench.tsx`)

```diff
--- a/src/components/SequenceWorkbench.tsx
+++ b/src/components/SequenceWorkbench.tsx
@@ -95,6 +95,12 @@ const LazyOfflinePresetPicker = lazy(() =>
   import('./OfflinePresetPicker').then((mod) => ({ default: mod.OfflinePresetPicker })),
 );
 
+const LazyPresetSuggestionCandidatePreview = lazy(() =>
+  import('../features/presetSuggestionCandidate').then((mod) => ({
+    default: mod.PresetSuggestionCandidatePreview,
+  })),
+);
+
 const LazyFreeAiAssistantPanel = lazy(() =>
   import('./FreeAiAssistantPanel').then((mod) => ({ default: mod.FreeAiAssistantPanel })),
 );
@@ -2023,6 +2029,33 @@ export function SequenceWorkbench({
         {presetsOpen && (
           <Suspense fallback={<p role="status">프리셋을 불러오는 중입니다.</p>}>
             <LazyOfflinePresetPicker
               onApplied={(message) => {
                 setNotice(message);
                 setWorkflowStep('arrange');
                 setPresetsOpen(false);
               }}
             />
+            <details className="workbench-automation-tools" style={{ marginTop: '1rem' }}>
+              <summary>목표시간·휴식 맞춤 프리셋 후보 및 경계 조건 진단 (규칙 기반)</summary>
+              <LazyPresetSuggestionCandidatePreview
+                request={{
+                  apparatus: criteria.apparatus,
+                  availableEquipment: criteria.availableEquipment,
+                  focusPreset: criteria.focusPreset,
+                  targetMinutes: criteria.targetMinutes,
+                  restMinutes: criteria.restMinutes ?? 0,
+                  level: criteria.level,
+                  preferredProps: criteria.preferredProps,
+                  excludeDaysWindow: criteria.excludeDaysWindow,
+                  targetGroupId: criteria.targetGroupId,
+                  seedPlan: s.activeSteps.length > 0 ? { steps: s.activeSteps } : undefined,
+                  exercises: s.exercises,
+                  historyLogs: s.historyLogs,
+                }}
+                onInstantiateEditableDraft={(draft) => {
+                  const current = usePilatesStore.getState();
+                  const res = current.applyPresetDraft(
+                    {
+                      steps: draft.steps,
+                      title: draft.sequence.title,
+                      subtitle: draft.sequence.subtitle,
+                      targetMinutes: draft.sequence.targetMinutes,
+                    },
+                    'replace',
+                    current,
+                  );
+                  if (res.success) {
+                    setNotice(res.message);
+                    setWorkflowStep('arrange');
+                    setPresetsOpen(false);
+                  }
+                }}
+              />
+            </details>
           </Suspense>
         )}
       </LightDismissDialog>
```

---

## 4. 후보 코드와 실제 검증 근거의 구분

1. **본 후보 모듈(`src/features/presetSuggestionCandidate/**`)에서 직접 검증되는 범위**
   - 순수 함수 단위 및 경계 조건 테스트(`presetSuggestionCandidate.test.ts` 등)와 컴포넌트 렌더링·접근성·다중 인스턴스·모션 줄이기·스토리지 비접근 테스트(`PresetSuggestionCandidatePreview.test.tsx`).
   - 6대 경계 및 불가능 조건(중첩 cycle, 없는 ID, 편측 시간, 쉬는 시간, 상한 10,000/1,000/16, 목표시간 불가능 11종)에 대한 결정론적 입출력 검증.
2. **통합 후 별도 수행해야 하는 범위 (비주장 명시)**
   - 위 Section 2·3의 diff는 제안 예시이며, 본 브랜치에서는 `App.tsx`, `SequenceWorkbench.tsx`, `OfflinePresetPicker.tsx`, `usePilatesStore.ts`를 수정하지 않았습니다.
   - 실제 모바일 물리 기기/Safari 검증이나 임상적·해부학적 유효성 검증을 주장하지 않습니다.
