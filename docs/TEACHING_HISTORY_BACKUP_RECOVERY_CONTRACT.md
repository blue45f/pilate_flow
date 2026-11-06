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
