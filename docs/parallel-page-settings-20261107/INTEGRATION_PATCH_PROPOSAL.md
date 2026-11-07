# `settingsPageCandidate` — 공통 파일 무수정 원칙 및 최소 통합 Patch 제안서 (`INTEGRATION_PATCH_PROPOSAL.md`)

> [!IMPORTANT]
> - 본 문서는 `src/features/settingsPageCandidate/**` 및 `docs/parallel-page-settings-20261107/**` 독점 소유 범위 안에서 작성된 **통합 전 후보(Pre-Integration Candidate) 최소 Patch 제안서**입니다.
> - 병렬 통합 세션과의 충돌을 방지하기 위해 공유 라우트/셸(`src/App.tsx`), 전역 스토어(`src/store/usePilatesStore.ts`), 공용 테마/스타일(`src/styles/studio.css`), 기존 하위 패널(`CloudSyncPanel.tsx`, `PwaInstallPanel.tsx`, `RecoveryPreview.tsx`, `InventoryPanel.tsx`), 설정 파일(`package.json`, `pnpm-lock.yaml`)은 **단 1바이트도 수정하지 않았습니다(`git diff` 기존 파일 0건)**.

---

## 1. 왜 새 경로의 최소 패치 후보로 분리했는가?

1. **공유 라우트·셸(`src/App.tsx`) 충돌 방지**:
   - 현재 `main` 브랜치에서 설정 모달(`settingsOpen`, `'나의 스튜디오'`)은 `src/App.tsx`의 `658~761`행에 인라인으로 작성되어 있어, 다른 페이지 통합 작업과 직접 충돌할 수 있습니다.
2. **기존 감사(Audit) 스위트와의 무결성 보존**:
   - `scripts/pwa-audit-20261107/track-b/track-b-install-flow-mock.test.tsx`는 `src/components/PwaInstallPanel.tsx`의 기존 DOM/상태(결함 재현 케이스 `B-F1`~`B-F4` 포함)를 직접 임포트하여 검증합니다.
   - 따라서 기존 `PwaInstallPanel.tsx`, `CloudSyncPanel.tsx`, `RecoveryPreview.tsx`를 직접 덮어쓰지 않고, `src/features/settingsPageCandidate/**`에서 `B-F2`(재설치 프롬프트 시 이전 `dismissed`/`error` 잔존 배너 제거) 및 `B-F4`(설치 섹션 단일 `role="status"` 라이브 리전)까지 해결한 독립 로컬 UI 모듈을 제공합니다.

---

## 2. 조정 담당자용 `src/App.tsx` 최소 통합 Unified Diff 제안

통합 담당자가 공유 `src/App.tsx`에 연결할 때 아래 최소 패치만으로 기존 `settingsOpen` 다이얼로그 본문을 `<PilatesSettingsPage />`로 교체하거나 병행할 수 있습니다:

```diff
--- a/src/App.tsx
+++ b/src/App.tsx
@@ -36,6 +36,7 @@ import {
 import './styles/controls.css';
 import { createEmptyInstructorStudyState } from './types/instructorStudy';
 import { isMovementIdeaExercise } from './utils/movementIdeaDraft';
+import { PilatesSettingsPage } from './features/settingsPageCandidate';
 
 const InstructorStudyDialog = lazy(() =>
   import('./components/InstructorStudyDialog').then((module) => ({
@@ -662,6 +663,25 @@ export function App() {
         subtitle="수업 자료를 안전하게 보관하고 다른 기기로 옮기세요."
         maxWidth="640px"
       >
+        <PilatesSettingsPage
+          snapshot={{
+            data: {
+              savedSequenceCount: state.savedSequences.length,
+              exerciseCount: state.exercises.length,
+              historyLogCount: state.historyLogs.length,
+              ownedEquipmentIds: state.ownedEquipment,
+              ownedPropIds: state.ownedProps,
+              persistenceError: state.persistenceError,
+              backupMessage,
+            },
+          }}
+          port={{
+            onExportBackupJson: exportData,
+            onToggleOwnedEquipment: state.toggleOwnedEquipment,
+            onToggleOwnedProp: state.toggleOwnedProp,
+          }}
+        />
         {settingsOpen && (
           <DeferredPanelBoundary>
```
