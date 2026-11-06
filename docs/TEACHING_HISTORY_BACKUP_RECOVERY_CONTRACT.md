# 수업 이력 스냅샷 및 로컬 데이터 백업·복원 안정화 계약 (Teaching History & Backup/Recovery Contract)

## 1. 담당 범위 및 충돌 방지 경계 (Scope & Conflict Prevention)

### 1.1 본 세션 담당(수정) 파일
- [`src/utils/movementIdeaDraft.ts`](../src/utils/movementIdeaDraft.ts): 새로고침 시 `DEFAULT_HUMAN_DRAFT_STORAGE_KEY` 기반 `HumanMovementDraft` 및 `ReusableBlock` 재수화(hydration), `getSavedHumanMovementDrafts` 공개 헬퍼 제공, 백업 복원 후 메타데이터 폴백 정합성 보강.
- [`src/utils/teachingHistorySnapshot.ts`](../src/utils/teachingHistorySnapshot.ts):
  - 삭제·수정된 동작이 포함된 과거 수업 이력을 작업대로 복사할 때의 원자적 복사 및 실패 시 참조 무결성 롤백(`copyHistoryLogIntoWorkbenchSafely`),
  - `stepsSnapshot`이 생략된 `programSnapshot` / `sequenceSnapshot` 전용 이력의 스텝 재구성(`reconstructStepsSnapshotFromHistoryLog`),
  - 스냅샷에서 복원된 동작의 `planning-metadata` 자가 점검 상태(`credentialVerified: false`) 자동 보정(`reconstructExerciseFromSnapshot` — 강사 검토 게이트 차단 방지),
  - 백업 복원 직전 도메인 상태 캡처 및 원자적 되돌리기(`captureBackupPreRestoreState`, `recordBackupRestoreRollbackPoint`, `rollbackLatestBackupRestore`).
- [`src/components/LogSessionModal.tsx`](../src/components/LogSessionModal.tsx): 모달 오픈 시점의 `HumanMovementDraft` 목록과 `ReusableBlock` 목록을 스냅샷으로 고정해 `buildTeachingProgramSnapshot`에 전달.
- [`src/components/ClassBinderView.tsx`](../src/components/ClassBinderView.tsx):
  - `resolveTeachingHistoryView` 호출 시 실시간 `reusableBlocks` 및 `humanDrafts`를 전달하여 원본 블록·창작 동작 수정/삭제 드리프트 배지 표시,
  - `copyHistory`에서 원자적 복사 헬퍼(`copyHistoryLogIntoWorkbenchSafely`) 사용,
  - `cloudBackup?.exists`가 없는 로컬 전용 로그인 상태에서 `"클라우드 백업 미연결 (로컬 전용)"` 명시.
- [`src/components/RecoveryPreview.tsx`](../src/components/RecoveryPreview.tsx): 복구 전 확인 영역에 데이터 충돌 정책 및 되돌리기 안내를 명시하고, 복원 적용 직후 `"복원 이전 상태로 되돌리기"`(원복) 액션 제공.
- 테스트 스위트:
  - [`src/utils/teachingHistorySnapshot.test.ts`](../src/utils/teachingHistorySnapshot.test.ts)
  - [`src/test/teachingHistoryProgramRecord.test.tsx`](../src/test/teachingHistoryProgramRecord.test.tsx)

### 1.2 제외 범위 (읽기 전용 준수 파일)
- 공통 스키마·저장소: `src/types/pilates.ts`, `src/schemas/pilatesSchema.ts`, `src/schemas/cloudBackupSchema.ts`, `src/store/usePilatesStore.ts`, `backend/backupValidation.ts`, `pnpm-lock.yaml`
- 앱 루트·전역 스타일: `src/App.tsx`, `src/main.tsx`, `src/design-system/**`, `src/styles/**`
- 모션·음성·AI·인증 구현: `src/models/**`, `src/components/LiveStageView.tsx`, `src/components/FreeAiAssistantPanel.tsx`, `src/lib/firebaseSession.ts`, `src/components/CloudSyncPanel.tsx`

---

## 2. 도메인 분리 구조 (수업 템플릿 vs. 동작 초안 vs. 수업 완료 이력)

| 구분 | 저장 구조 및 키 | 성격 | 변경 가능 여부 |
| --- | --- | --- | --- |
| **수업 템플릿 / 계획** | `usePilatesStore.savedSequences` (`SavedSequence`), `conditionTemplates` (`ConditionTemplate`), `datedSequencePlanning.assignments` (`DatedSequencePlanAssignment`) | 반복 사용하거나 일정에 배정하는 수업 설계도 | 수정·복제·삭제 가능 (수정/삭제해도 완료 이력 불변) |
| **동작 초안 / 재사용 블록 / 작업대** | `HumanMovementDraft` (`DEFAULT_HUMAN_DRAFT_STORAGE_KEY`), `MovementIdeaMeta` (`IDEA_META_STORAGE_KEY`), `ReusableBlock` (`IDEA_REUSABLE_BLOCKS_STORAGE_KEY`), `usePilatesStore.activeSteps` | 강사가 구상·직접 시도하며 운동감(`feelLogs`)과 수정점(`modificationLogs`)을 기록하는 초안 및 현재 편집 중인 작업대 | 리비전(`v1`, `v2`...) 누적 수정·변형 파생 가능 (강사 검토 통과 제한 없음) |
| **실제 진행 완료 수업 이력** | `usePilatesStore.historyLogs` (`ClassHistoryLog` + `TeachingProgramSnapshot` + `ClassSequenceSnapshot`) | 실제 수업을 마친 뒤 `LogSessionModal` 제출로만 생성되는 불변 완료 기록 | 당시 동작·블록·순서·계획/실제 시간·날짜·운동감 스냅샷 영구 보존 (원본 수정/삭제 영향 없음) |

- **계획 자동 완료 기록 금지**: `LiveStageView` 타이머 종료/이탈, `DatedSequencePlanning` 준비 상태 전환, `SavedSequence`/`ConditionTemplate` 불러오기 등 어떤 경로도 `LogSessionModal`의 명시적 폼 제출 없이는 `historyLogs`를 자동 생성하지 않습니다.

---

## 3. 데이터 충돌 정책 및 되돌리기(원복) 계약

### 3.1 백업 불러오기·검증·복원 충돌 정책 (`inspectBackupRecovery` & `restoreBackup`)
1. **읽기 전용 사전 검토(Preflight)**: 파일 선택 시 스토어나 `localStorage`를 변경하지 않고 바이트 크기(15MB 제한), JSON 구문, 포맷(`pilates-flow-atelier`), 버전(`version: 3` 또는 레거시 워크스페이스 `version: 0`), 미지원 필드(`strippedKeys === 0`), 중복 ID, 누락된 참조 동작을 전수 검사합니다.
2. **기존 수정본 및 현재 작업대 우선 보존**:
   - 동일 ID 항목이 로컬에서 이미 수정된 경우 로컬 수정본을 유지(`keptExisting`, `conflicts`)합니다.
   - 변경되지 않은 기본 예시 항목만 백업 값으로 갱신(`restoredExamples`)하고, 새로운 ID 항목만 추가(`newItems`)합니다.
   - 현재 작업대(`activeSteps`, `activeTitle`, `activeTargetMinutes`, `undoStack`)는 절대 덮어쓰지 않으며, 백업 파일 내 작업대 초안은 별도 바인더 시퀀스 사본(`backup-draft-*`, `backup-legacy-draft-*`)으로 분리 보관합니다.
3. **실패 시 원자적 보존**: 손상된 JSON, 미지원 버전, 중복 ID, 참조 동작 누락, 다른 탭의 저장소 변경(`storage_changed`), 브라우저 저장 용량 초과(`QuotaExceededError`) 발생 시 기존 메모리 및 `localStorage` 데이터를 변경하지 않습니다.

### 3.2 복원 이전 상태로 되돌리기 (Pre-Restore Rollback)
- 복원 적용 직전 `captureBackupPreRestoreState`가 13개 도메인 슬라이스 참조를 메모리에 캡처합니다 (`undoStack` 불변 및 단일 `localStorage.setItem` 쓰기 보장).
- 복원 적용으로 데이터가 변경된 직후(`unchanged === false`), `RecoveryPreview`에 **`복원 이전 상태로 되돌리기`** 버튼이 노출됩니다.
- 사용자가 되돌리기를 실행하면 다른 탭 충돌 여부 및 복원 이후 추가 편집 여부를 확인한 뒤, 복원 직전의 도메인 참조 상태로 즉시 원자적 원복합니다.

---

## 4. 공통 스키마·스토어 담당 세션을 위한 선택적 통합 제안 (Interface Proposal)

현재 모든 기능은 공통 파일을 수정하지 않고 [`src/utils/teachingHistorySnapshot.ts`](../src/utils/teachingHistorySnapshot.ts)와 [`src/utils/movementIdeaDraft.ts`](../src/utils/movementIdeaDraft.ts)에서 완결적으로 동작합니다. 추후 공통 스토어/스키마 통합 담당 세션에서 직접 병합할 경우 아래 선택적 인터페이스를 채택할 수 있습니다:

1. **`src/store/usePilatesStore.ts` `loadHistoryIntoWorkbench(logId)`**:
   - 내부에서 `copyHistoryLogIntoWorkbenchSafely(logId, usePilatesStore)` 또는 `reconstructStepsSnapshotFromHistoryLog(target)`를 기본 호출하도록 통합 가능.
2. **`src/schemas/cloudBackupSchema.ts`**:
   - 현재 `exerciseSchema`와 `historySchema`가 `.passthrough()`를 사용해 `programSnapshot`, `sequenceSnapshot`, `humanDraftId`, `humanDraftRevision`을 손실 없이 보존(`strippedKeys === 0`)하고 있으므로, 향후 스키마 명시화 시 선택적(optional) 필드로 선언 가능.

---

## 5. 후속 안전성 감사: 재현 결함 5건 수정 및 결함 주입·실브라우저 검증 (Follow-up Safety Audit)

### 5.1 재현 및 수정 완료된 소유 범위 결함 (5건)
1. **스냅샷 복원 동작의 임의 `'approved'` 생성 제거 (`src/utils/teachingHistorySnapshot.ts`)**:
   - **재현 조건**: 검토되지 않은 동작(`review: undefined` 또는 `status !== 'approved'`)이 포함된 수업 완료 이력을 복사·복원할 때 `reconstructExerciseFromSnapshot` 및 `cloneTeachingHistoryToNextClassDraft`가 `review: { status: 'approved', reviewerAlias: 'Completed class snapshot self-check', ... }`를 합성하여 부여함 (`docs/composition-authoring.md` 및 `docs/sequence-composition-safety-contract.md`의 TTS 호흡 브리핑 안전 경계 위반).
   - **수정**: 원본 스냅샷에 `review?.status === 'approved'`가 실제 존재하는 경우에만 정규화·보존하고, 미검토 동작은 `review`를 합성하지 않도록 수정(`isExerciseAuthoringEligible`은 `review` 없이도 항상 `true`이므로 시퀀스 조합/저장 제한은 전혀 발생하지 않음).
2. **`rollbackLatestBackupRestore` 저장소 쓰기 예외(`QuotaExceededError`) 시 원자적 메모리 복구 (`src/utils/teachingHistorySnapshot.ts`)**:
   - **재현 조건**: 백업 복원 직후 `복원 이전 상태로 되돌리기`를 실행할 때 `localStorage.setItem`에서 `QuotaExceededError`가 발생하면 메모리 상태만 복원 이전으로 바뀌고 `latestBackupRollbackPoint`가 소거되어 디스크(`localStorage`)와 메모리가 불일치하며 재시도가 불가능해짐.
   - **수정**: `storeApi.setState`를 `try/catch`로 감싸고 직후 `storeApi.checkStorage()`로 디스크 지문 일치를 검증하여, 쓰기 실패 시 메모리 상태를 즉시 복원 직후 상태(`current`)로 되돌리고 롤백 포인트를 유지하도록 수정.
3. **새로고침(`location.reload()`) 이후 롤백 포인트 유실 수정 (`src/utils/teachingHistorySnapshot.ts`, `src/components/RecoveryPreview.tsx`)**:
   - **재현 조건**: 백업 복원 적용 후 브라우저를 새로고침하면 메모리 변수 `latestBackupRollbackPoint`가 초기화되어 `복원 이전 상태로 되돌리기` 버튼이 사라짐.
   - **수정**: `pilates-flow-backup-rollback-v1` 보조 로컬 스토리지 키에 롤백 포인트를 함께 기록하고 `RecoveryPreview` 마운트 시 현재 스토어 지문(`postRestoreStateFingerprint`)과 일치하면 자동 재수화(rehydrate)하도록 개선.
4. **빠른 반복 클릭(Double-click) 경쟁 및 최상위 `sequenceSnapshot`/`sourceProvenance` 누락 수정 (`src/components/LogSessionModal.tsx`, `src/components/ClassBinderView.tsx`, `src/components/RecoveryPreview.tsx`)**:
   - **재현 조건**: `LogSessionModal`의 `수업 기록 저장`, `ClassBinderView`의 `이 수업 다시 계획`, `RecoveryPreview`의 `이 내용으로 복원 적용` 및 `복원 이전 상태로 되돌리기`를 동기적으로 연속 클릭할 때 React 상태 반영 전 중복 실행이 발생할 수 있으며, `logClassSession`이 `programSnapshot`만 저장할 때 `attachProgramSnapshotToHistoryLog`가 호출되지 않아 최상위 `sequenceSnapshot` 및 `sourceProvenance`가 누락됨.
   - **수정**: 각 핸들러에 동기적 `useRef` 잠금(`submittingRef`, `copyingRef`, `applyingRef`, `rollingBackRef`)을 추가하고, `LogSessionModal`에서 `!matchedLog.programSnapshot || (!matchedLog.sequenceSnapshot && programSnapshot.sequenceSnapshot) || (!matchedLog.sourceProvenance && programSnapshot.sourceProvenance)` 조건으로 보강.
5. **창작 동작 초안(`HumanMovementDraft`) 및 메타데이터의 메모리·스토리지 병합 시 구버전 덮어쓰기 방지 (`src/utils/movementIdeaDraft.ts`)**:
   - **재현 조건**: `getScopedHumanDraftMap` 및 `getMovementIdeaMetaMap`이 메모리 캐시와 `localStorage`를 병합할 때 `revision` 및 `updatedAt` 비교 없이 덮어써서 최신 리비전이 구버전으로 역전될 수 있음.
   - **수정**: `isNewerVersionedEntry` 헬퍼를 통해 `revision` 및 `updatedAt`이 더 최신인 항목만 채택하도록 수정.

### 5.2 공통 파일 미적용 패치 제안 (Unapplied Patch Proposal for Shared Files)
공통 스토어·스키마(`src/store/usePilatesStore.ts`, `src/schemas/cloudBackupSchema.ts`)는 충돌 방지를 위해 직접 수정하지 않았으며, 통합 담당 세션을 위해 아래 패치를 제안합니다:

```diff
--- a/src/store/usePilatesStore.ts
+++ b/src/store/usePilatesStore.ts
@@ -1868,6 +1868,12 @@
         const target = state.historyLogs.find((item) => item.id === logId);
         if (!target) return;
+        // (통합 제안) stepsSnapshot이 생략된 programSnapshot/sequenceSnapshot 전용 로그 및
+        // 삭제된 커스텀 동작을 복원하기 위해 copyHistoryLogIntoWorkbenchSafely 위임 가능
         const stepsSnapshot =
           target.stepsSnapshot && target.stepsSnapshot.length > 0
             ? target.stepsSnapshot
             : reconstructStepsSnapshotFromHistoryLog(target);
```

