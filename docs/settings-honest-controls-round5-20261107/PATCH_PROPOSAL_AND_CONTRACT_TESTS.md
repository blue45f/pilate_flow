# 소유 범위 밖 최소 연결 패치 제안 및 계약 테스트 명세 (`PATCH_PROPOSAL_AND_CONTRACT_TESTS.md`)

> 본 문서는 `src/features/settingsPageCandidate/**` 소유 경계를 엄격히 준수하기 위해, 소유권 밖의 공유 파일(`src/App.tsx`, `src/hooks/useClassVoiceGuidance.ts`, `src/components/LiveStageView.tsx`, `src/lib/pwa.ts`, `src/components/RecoveryPreview.tsx`)을 직접 수정하지 않고 통합 담당이 검토 후 적용할 수 있는 **최소 연결 패치(Minimal Wiring Patch)**와 **계약 테스트(Contract Tests)**를 정의합니다.

---

## 1. 현재 실제 연결 상태 요약 (`src/App.tsx` 753–770행)

- **현재 이미 연결된 항목 (`연결됨` — 기능 중복 추가 금지)**:
  - `snapshot.data`: `savedSequenceCount`, `exerciseCount`, `historyLogCount`, `ownedEquipmentIds`, `ownedPropIds`, `persistenceError`, `backupMessage`
  - `port`: `onExportBackupJson`, `onToggleOwnedEquipment`, `onToggleOwnedProp`
- **현재 미연결되어 설정 후보에서 비활성(`disabled`) 및 기존 실제 기능 안내로 처리된 항목**:
  1. `account` (`CloudSyncPanel` 상단 패널이 실제 기능 소유)
  2. `voice` / `rate` (`LiveStageView`의 `useClassVoiceGuidance`가 세션별 음성 토글/항목을 소유하며, `rate`는 `1.0x` 고정)
  3. `reducedMotion` (`prefers-reduced-motion` 미디어 쿼리 및 카드 내부 `data-reduced-motion`만 존재)
  4. `install` (`PwaInstallPanel` 모달이 `usePwa` / `requestPwaInstall` 소유)
  5. `recovery` (`RecoveryPreview` 상단 컴포넌트가 파일 선택·검토·복원·되돌리기 소유)

---

## 2. 영역별 최소 연결 패치 제안 (Minimal Patch Proposals)

### 2.1 [Patch A] `src/App.tsx` — 계정(`useFirebaseSession`) 및 앱 설치(`usePwa` / `requestPwaInstall`) 포트 연결

```diff
--- a/src/App.tsx
+++ b/src/App.tsx
@@ -22,6 +22,13 @@ import { SequenceWorkbench } from './components/SequenceWorkbench';
 import { LightDismissDialog } from './components/LightDismissDialog';
 import { PwaInstallPanel } from './components/PwaInstallPanel';
+import { requestPwaInstall, usePwa } from './lib/pwa';
+import {
+  bootstrapFirebaseSession,
+  FIREBASE_OPERATING_ORIGIN,
+  signInWithGoogle,
+  signOutOfFirebase,
+  useFirebaseSession,
+} from './lib/firebaseSession';
@@ -128,6 +135,8 @@ export function App() {
   const state = usePilatesStore();
+  const firebaseSession = useFirebaseSession();
+  const pwaState = usePwa();
@@ -753,16 +762,38 @@ export function App() {
             <PilatesSettingsPage
               snapshot={{
+                account: {
+                  phase: firebaseSession.phase,
+                  operation: firebaseSession.operation,
+                  user: firebaseSession.user,
+                  error: firebaseSession.error,
+                  notice: firebaseSession.notice,
+                  operatingOrigin: FIREBASE_OPERATING_ORIGIN,
+                },
+                install: {
+                  standalone: pwaState.standalone,
+                  installed: pwaState.installed,
+                  platform: pwaState.platform,
+                  canInstall: pwaState.canInstall,
+                  installStatus: pwaState.installStatus,
+                  offlineStatus: pwaState.offlineStatus,
+                },
                 data: {
                   savedSequenceCount: state.savedSequences.length,
                   exerciseCount: state.exercises.length,
                   historyLogCount: state.historyLogs.length,
                   ownedEquipmentIds: state.ownedEquipment,
                   ownedPropIds: state.ownedProps,
                   persistenceError: state.persistenceError,
                   backupMessage,
                 },
               }}
               port={{
+                onRequestGoogleSignIn: () => void signInWithGoogle(),
+                onRequestAccountSwitch: () => void signInWithGoogle(),
+                onRequestSignOut: () => void signOutOfFirebase(),
+                onRequestAuthRecheck: () => void bootstrapFirebaseSession(),
+                onRequestPwaInstall: () => void requestPwaInstall(),
                 onExportBackupJson: exportData,
                 onToggleOwnedEquipment: state.toggleOwnedEquipment,
                 onToggleOwnedProp: (propId) => state.toggleOwnedProp(propId as PropType),
               }}
             />
```

### 2.2 [Patch B] `src/hooks/useClassVoiceGuidance.ts` — 배속(`rate`: `0.85 | 1 | 1.15`) 옵션 지원 (선택 사항)

현재 [`src/hooks/useClassVoiceGuidance.ts`](../../src/hooks/useClassVoiceGuidance.ts) `88`행은 `utterance.rate = 1;`로 고정되어 있습니다. 수업 화면에서 배속 조절을 지원하려면 아래 최소 변경이 필요합니다.

```diff
--- a/src/hooks/useClassVoiceGuidance.ts
+++ b/src/hooks/useClassVoiceGuidance.ts
@@ -24,7 +24,10 @@ function pickLocalKoreanVoice(synth: SpeechSynthesis): SpeechSynthesisVoice | un
-export function useClassVoiceGuidance(snapshot: Omit<ClassVoiceSnapshot, 'visible'>) {
+export function useClassVoiceGuidance(
+  snapshot: Omit<ClassVoiceSnapshot, 'visible'>,
+  options?: { rate?: 0.85 | 1 | 1.15 },
+) {
   const [enabled, setEnabled] = useState(false);
+  const rateRef = useRef<0.85 | 1 | 1.15>(options?.rate ?? 1);
+  useLayoutEffect(() => {
+    rateRef.current = options?.rate ?? 1;
+  }, [options?.rate]);
@@ -88,3 +91,3 @@ export function useClassVoiceGuidance(snapshot: Omit<ClassVoiceSnapshot, 'visibl
-        utterance.rate = 1;
+        utterance.rate = rateRef.current;
```

> **주의**: 음성 자동발화는 반드시 사용자의 명시적 토글(수업 화면의 `"음성 안내 켜기"` 제스처)과 브라우저 음성 허용을 전제로 해야 하므로, 설정 화면에서 기본 항목/속도를 변경하더라도 수업 진입 시 자동 발화(`enabled: true` 강제 시작)해서는 안 됩니다.

### 2.3 [Patch C] `RecoveryPreview` 연동 방침 (기능 중복 추가 금지)

`"나의 스튜디오"` 모달 상단에 이미 [`RecoveryPreview.tsx`](../../src/components/RecoveryPreview.tsx)가 마운트되어 읽기 전용 파일 검사와 원자적 병합 복원(`restoreBackup`) 및 되돌리기(`rollbackLatestBackupRestore`)를 수행하고 있습니다.
- 모달 내 중복 파일 입력을 추가하지 않고, `<PilatesSettingsPage />`의 `onSelectBackupFile`에 상단 `[data-recovery-choose]` 버튼 포커스/클릭 위임만 연결하거나 현재처럼 상단 `"백업 불러오기"` 영역 안내를 유지하는 것이 가장 안전합니다.

---

## 3. 계약 테스트 (Contract Tests) 검증 명세

[`src/features/settingsPageCandidate/settingsHonestControlsRound5.test.tsx`](../../src/features/settingsPageCandidate/settingsHonestControlsRound5.test.tsx) 및 [`PilatesSettingsPage.mock.test.tsx`](../../src/features/settingsPageCandidate/PilatesSettingsPage.mock.test.tsx)에서 아래 계약을 자동 검증합니다:

1. **미연결 포트 비활성화 계약 (`Unconnected Port Disabled Contract`)**:
   - `port`에서 생략된 모든 액션 버튼·체크박스는 `disabled === true`여야 하며, 클릭 이벤트 발생 시 상태 변경이나 가짜 성공 알림(`statusAnnouncementKo`, `backupMessageKo`)을 생성하지 않는다.
2. **연결된 포트 즉시 실행 계약 (`Connected Port Dispatch Contract`)**:
   - `port.onExportBackupJson`, `port.onToggleOwnedEquipment`, `port.onToggleOwnedProp`가 제공되면 해당 컨트롤만 활성화(`disabled === false`)되고 클릭 시 정확한 인자로 포트를 호출한다.
   - `createMockSettingsActionRecorder()`를 통해 18개 전체 포트가 연결된 경우 모든 그룹 컨트롤이 정상 활성화되고 액션 레코더에 기록된다.
3. **일반 화면 용어 및 안전 보호 계약 (`Plain-Language & Non-Destructive Safety Contract`)**:
   - 렌더링된 DOM 텍스트에 개발 내부 식별자(`LiveStage`, `PwaPanel`, `RecoveryPreview`, `props`, `callback`, `snapshot`, `DOM`, `hook`, `mock`, `candidate`)가 포함되지 않는다.
   - 데이터 삭제·초기화 버튼이 존재하지 않으며(`data-destructive-delete="disabled"`), `usePilatesStore.getState().restoreBackup`이나 스토리지 쓰기를 임의로 실행하지 않는다.
