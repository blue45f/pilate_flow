# 실진입(` 나의 스튜디오 `) 설정 통합 배선 최소 패치 제안서 (Round 4)

- **작성 트랙**: Track A (Round 4 Candidate Test & Wiring Proposal Engineer)
- **대상 작업 공간**: `/home/antigravity/blue45f/pilate_flow`
- **목적**: 소유권 분리 규칙(공유 코어 파일 직접 수정 금지)을 준수하면서, 향후 통합 단계에서 `src/App.tsx`의 `"나의 스튜디오"` 모달 내 `<PilatesSettingsPage />`가 실제 앱 런타임 상태(`firebaseSession`, `useClassVoiceGuidance`, `usePwa`, `RecoveryPreview`)와 1:1 양방향 연결되도록 최소 변경 패치(Minimal Diff)를 정의합니다.

---

## 1. 현재 후보 모듈(`src/features/settingsPageCandidate`)에서 선제 완료된 방어 범위

공유 파일 수정 없이도 후보 컴포넌트 자체에서 다음 4대 결함이 이미 방어되도록 조치되었습니다.

1. **음성안내 토글 (`잘못된 성공` 차단 · `반영누락` 해결)**:
   - `snapshot.voice`가 전달되지 않은 실진입(`src/App.tsx` lines 753–770) 상태에서 검증되지 않은 기기 한국어 음성 이름을 허위로 표시하지 않고 `'기기 내장 한국어 음성 (수업 화면 진입·명시 토글 시 확인)'`으로 정직하게 안내합니다.
   - `port.onToggleVoiceEnabled`가 연결되지 않은 상태에서 토글 시 즉시 발화되는 것처럼 오해하지 않도록 `'수업 화면의 사용자 명시적 토글·브라우저 음성 허용 시에만 동작하며, 참고 영상은 자동 재생하지 않습니다'`라고 명확히 고지합니다.
   - 안내 항목 체크박스 3종(`movement`, `breath`, `time`)이 모두 해제(`0/3`)되면 배지를 `'음성 대기 (항목 0/3)'`로 전환하고 실제 발화가 생략됨을 경고합니다.
   - 속도/샘플 버튼 클릭 후 안내 항목 체크박스를 변경하면 이전 `sampleNotice`가 고정되지 않고 즉시 새로운 선택 개수(`2/3 켜짐` 등)가 상태 공지에 반영됩니다.
2. **시각 모션 감소 (`모션감소` UI·상태·스크롤 즉시 반영)**:
   - 그룹 2 내부에 `시각 모션 감소` 현재값 행(`settings-reduced-motion-status`)과 전용 토글 버튼(`settings-reduced-motion-toggle`)을 제공하고, 토글 시 루트 `data-reduced-motion` 속성과 `onToggleReducedMotion` 포트를 즉시 갱신합니다.
   - 상단 그룹 바로가기 칩 클릭 시 `scrollIntoView({ behavior: 'instant', block: 'nearest' })`를 사용하여 부드러운 스크롤 애니메이션으로 인한 모션 피로를 유발하지 않습니다.
3. **오프라인 설치 설명 (`오프라인설치 설명` 범위·오류·수동 안내 명확화)**:
   - `offlineStatus === 'error'`일 때 `'오프라인 준비 오류 (온라인 연결 필요)'` 및 캐시 실패 안내를 명시합니다.
   - `오프라인·미디어 범위`(`settings-install-offline-scope`) 항목을 통해 **기본 화면만 오프라인 열람 가능**하며 **로그인·클라우드 백업·외부 참고 영상(자동재생 금지)은 인터넷 연결이 필요**하고 **앱 설치는 기기 간 동기화가 아님**을 명확히 고지합니다.
   - `port.onRequestPwaInstall`가 미연결된 상태에서 `[이 기기에 설치]`를 누르면 허위 성공 메시지 대신 수동 설치 안내(`settings-install-manual-guide`)를 자동으로 펼치고 안내 문구를 표시합니다.
4. **설정 재방문 일관성 (`설정 재방문 불일치` 해결)**:
   - `src/App.tsx`에서 매 렌더링마다 인라인 객체 리터럴(`snapshot={{ data: { ... } }}`)을 전달하거나 `"나의 스튜디오"` 모달을 닫았다가 다시 열 때(`unmount` → `mount`), 세션 슬라이스(`uncontrolledEntrySession` / `snapshotSessionMap` / `namedSessionMap`)를 통해 사용자가 변경한 음성 켜짐 여부, 재생 속도, 안내 항목, 모션 감소, 활성 그룹 탭 상태가 초기화되지 않고 100% 유지됩니다.

---

## 2. 향후 공유 파일 통합 시 최소 패치 제안 (Minimal Diff)

### 2.1 `src/App.tsx` (lines 744–772)

`useFirebaseSession()`, `usePwa()`, `requestPwaInstall`을 연결하여 `<PilatesSettingsPage />`가 계정·설치·데이터 상태를 실시간으로 읽고 액션을 위임받도록 배선합니다.

```diff
--- a/src/App.tsx
+++ b/src/App.tsx
@@ -16,6 +16,13 @@ import {
    STUDIO_FIXTURE_QUERY_PARAM,
    shouldRenderStudioFixture,
 } from './features/studio Entry/studioFixtureFlag';
+import {
+  bootstrapFirebaseSession,
+  FIREBASE_OPERATING_ORIGIN,
+  signInWithGoogle,
+  signOutOfFirebase,
+  useFirebaseSession,
+} from './lib/firebaseSession';
+import { requestPwaInstall, usePwa } from './lib/pwa';
 
 export function App() {
   const state = usePilatesStore();
+  const firebaseSession = useFirebaseSession();
+  const pwaState = usePwa();
```

```diff
--- a/src/App.tsx
+++ b/src/App.tsx
@@ -753,16 +760,30 @@
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
+                install: pwaState,
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
+                onRequestAuthRecheck: () => void bootstrapFirebaseSession({ force: true }),
+                onRequestPwaInstall: () => void requestPwaInstall(),
                 onExportBackupJson: exportData,
                 onToggleOwnedEquipment: state.toggleOwnedEquipment,
                 onToggleOwnedProp: (propId) => state.toggleOwnedProp(propId as PropType),
               }}
             />
```

---

### 2.2 `src/hooks/useClassVoiceGuidance.ts`

설정 화면에서 지정한 재생 속도(`0.85 | 1 | 1.15`)와 안내 항목(`movement`, `breath`, `time`)이 수업 플레이어에서도 동일하게 읽히도록 공유 스토어(또는 경량 로컬 설정 슬라이스)와 연동하고, `utterance.rate`에 선택된 배속을 반영합니다.

> **중요 안전 원칙**: 페이지 로드 시 자동 발화는 절대 수행하지 않으며, 반드시 수업 화면 내 사용자의 명시적 토글 제스처 + 브라우저 음성 합성 허용이 있을 때만 `synth.speak(utterance)`가 호출되도록 유지합니다.

```diff
--- a/src/hooks/useClassVoiceGuidance.ts
+++ b/src/hooks/useClassVoiceGuidance.ts
@@ -25,6 +25,7 @@ export function useClassVoiceGuidance(snapshot: Omit<ClassVoiceSnapshot, 'visibl
   const [enabled, setEnabled] = useState(false);
   const [available, setAvailable] = useState(false);
   const [error, setError] = useState('');
+  const [speed, setSpeed] = useState<0.85 | 1 | 1.15>(1);
   const [preferences, setPreferences] = useState<ClassVoicePreferences>({
     movement: true,
     breath: true,
     time: true,
   });
+  const speedRef = useRef<0.85 | 1 | 1.15>(1);
@@ -85,7 +86,7 @@ export function useClassVoiceGuidance(snapshot: Omit<ClassVoiceSnapshot, 'visibl
         const utterance = new UtteranceCtor(text);
         utterance.voice = activeVoice;
         utterance.lang = activeVoice.lang;
-        utterance.rate = 1;
+        utterance.rate = speedRef.current;
```

---

### 2.3 `src/components/CloudSyncPanel.tsx` 및 `src/components/RecoveryPreview.tsx`

- `CloudSyncPanel.tsx`는 이미 `useFirebaseSession()` 외부 스토어 훅을 사용하고 있으므로, `src/App.tsx`에서 `useFirebaseSession()` 스냅샷과 `signInWithGoogle` / `signOutOfFirebase` / `bootstrapFirebaseSession` 액션 포트를 `<PilatesSettingsPage />`에 전달하면 두 컴포넌트가 동일한 인증 세션을 실시간 공유합니다.
- `RecoveryPreview.tsx`의 복구 미리보기(`inspection`) 및 직전 복원 롤백(`getLatestBackupRollbackPoint()`) 상태를 `<PilatesSettingsPage />`의 그룹 4 카드와 동기화하려면, `RecoveryPreview`에서 사용하는 `inspectBackupRecovery` 결과 요약(`SettingsRecoveryPreviewSummary`)과 `rollbackLatestBackupRestore` 콜백을 상위(`src/App.tsx`) 또는 경량 훅(`useBackupRecoveryController`)으로 추출하여 `snapshot.data.recoveryStage`, `snapshot.data.recoveryPreview`, `snapshot.data.rollbackPoint` 및 `port.onApplyBackupRestore` / `port.onRollbackBackupRestore`에 전달합니다.
