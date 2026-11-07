# Round 4 실제 사용자 설정 진입 경로 사실 확인 및 브라우저 재검증 보고서 (`settings-real-entry-round4-20261107`)

- **검증 일자**: 2026-11-07
- **대상 작업 공간**: `/home/antigravity/blue45f/pilate_flow`
- **검증 범위**:
  - 실제 사용자 설정 진입 경로 (`/` → 상단바 `[aria-label="데이터 백업과 사용 안내"]` → `'나의 스튜디오'` 모달 → 하단 `<details>` `'4그룹 통합 설정 요약 (계정 · 음성 · 설치 · 데이터)'`)
  - 후보 독립 브리지 하네스 (`/src/features/settingsPageCandidate/browserFixture.html`)
  - 4개 필수 뷰포트 (`320x640`, `390x844`, `768x1024`, `1440x900`) 및 `200%` 확대, 설정 변경 후 스토어 리렌더·모달 닫기·재방문 일관성 검증

---

## 1. 실제 사용자 설정 진입 경로 사실 확인 (`src/App.tsx` vs `src/features/settingsPageCandidate`)

실제 앱 루트([`src/App.tsx`](../../src/App.tsx))와 후보 설정 모듈([`src/features/settingsPageCandidate/PilatesSettingsPage.tsx`](../../src/features/settingsPageCandidate/PilatesSettingsPage.tsx))을 대조한 결과, 사용자가 실제 화면에서 진입하는 경로와 마운트 구조는 다음과 같습니다.

### 1.1 실제 진입 경로 단계
1. **진입 트리거**:
   - 상단바 우측 도움말/설정 아이콘 버튼: `<button className="icon-btn" onClick={() => setSettingsOpen(true)} aria-label="데이터 백업과 사용 안내">` ([`src/App.tsx#L435-L441`](../../src/App.tsx#L435-L441))
   - 사이드바 하단 워크스페이스 버튼: `<button className="workspace-button" onClick={() => setSettingsOpen(true)}>` (`나의 스튜디오 · 이 기기에 저장`, [`src/App.tsx#L386-L392`](../../src/App.tsx#L386-L392))
   - 푸터 버튼: `<button onClick={() => setSettingsOpen(true)}>저장·복구 안내</button>` ([`src/App.tsx#L539`](../../src/App.tsx#L539))
2. **모달 오픈 (`'나의 스튜디오'`)**:
   - `<LightDismissDialog open={settingsOpen} onClose={() => setSettingsOpen(false)} title="나의 스튜디오" ...>` ([`src/App.tsx#L663-L669`](../../src/App.tsx#L663-L669))가 열립니다.
3. **모달 상단 기본 노출 영역 (기존 레거시 설정 패널)**:
   - `<CloudSyncPanel />` ([`src/components/CloudSyncPanel.tsx`](../../src/components/CloudSyncPanel.tsx)) — 실제 Firebase Google 로그인/계정 전환/로그아웃 수행
   - `<InventoryPanel />` ([`src/components/InventoryPanel.tsx`](../../src/components/InventoryPanel.tsx)) — 실제 `usePilatesStore` 기구·소도구 토글 수행
   - 전체 JSON 백업 버튼 (`exportData`) 및 `<RecoveryPreview />` ([`src/components/RecoveryPreview.tsx`](../../src/components/RecoveryPreview.tsx)) — 실제 JSON 파일 선택·검증·복원·되돌리기 수행
4. **후보 4그룹 통합 설정 페이지 마운트 위치 (접힌 보조 `<details>`)**:
   - 모달 하단 `<details className="settings-section">` 내부의 `<summary>4그룹 통합 설정 요약 (계정 · 음성 · 설치 · 데이터)</summary>` ([`src/App.tsx#L744-L772`](../../src/App.tsx#L744-L772)) 안에 `React.lazy`로 `<PilatesSettingsPage />`가 배치되어 있습니다.
   - 초기 상태는 `details.open === false`(접힘)이며, 사용자가 해당 `<summary>`를 클릭해 펼칠 때 `[data-testid="pilates-settings-page"]`가 화면에 노출됩니다.

### 1.2 `src/App.tsx`의 실제 Props 전달 내역 ([`src/App.tsx#L753-L770`](../../src/App.tsx#L753-L770))
```tsx
<PilatesSettingsPage
  snapshot={{
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
    onExportBackupJson: exportData,
    onToggleOwnedEquipment: state.toggleOwnedEquipment,
    onToggleOwnedProp: (propId) => state.toggleOwnedProp(propId as PropType),
  }}
/>
```
- **사실 확인 요약**: `src/App.tsx`는 `snapshot.data`의 7개 필드와 `port`의 3개 콜백(`onExportBackupJson`, `onToggleOwnedEquipment`, `onToggleOwnedProp`)만 연결하고 있으며, `snapshot.account`, `snapshot.voice`, `snapshot.install`, `preferReducedMotion` 및 나머지 액션 포트 콜백은 전달하지 않습니다.

---

## 2. 실사용 반영 항목 vs 데모(하네스)만 통과한 미연결 항목 분리 표 (`미연결 항목 목록`)

아래 표는 4개 그룹(`계정 연결`, `한국어 음성 안내`, `앱 설치 및 오프라인`, `데이터 관리 및 보유 기구`)과 `시각 모션 감소` 항목에 대해 **실제 앱(`src/App.tsx`)에서 실사용 상태와 연결된 항목**과 **데모/하네스(`browserFixture.html`)에서만 어댑터가 연결되어 있고 실제 진입 경로에서는 미연결된 항목**을 전수 분리한 결과입니다.

| 구분 | 세부 설정/동작 항목 | 후보 UI (`PilatesSettingsPage`) | 실제 진입 (`src/App.tsx` L753-L770) | 실제 기능 보유 모듈 | 실사용 연결 판정 | 비고 및 정직한 상태 안내 |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **그룹 1: 계정 연결** | 로그인 상태·이메일·운영 도메인 표시 | `snapshot.account` 기반 렌더링 | **미전달** (`snapshot.account === undefined`) | [`CloudSyncPanel.tsx`](../../src/components/CloudSyncPanel.tsx) (`useFirebaseSession`) | **미연결** (상단 `CloudSyncPanel`에만 반영) | 후보 요약에서는 기본값(`이 기기 전용 (로그아웃됨)`) 표시 |
| **그룹 1: 계정 연결** | Google 로그인 / 계정 전환 / 로그아웃 / 재확인 버튼 | `port.onRequestGoogleSignIn` 등 호출 | **미전달** (`port` 콜백 생략) | [`CloudSyncPanel.tsx`](../../src/components/CloudSyncPanel.tsx) (`signInWithGoogle`, `signOutOfFirebase`) | **미연결** | 실제 로그인·로그아웃은 같은 모달 상단의 `CloudSyncPanel`에서 동작 |
| **그룹 2: 한국어 음성 안내** | 기기 한국어 음성(`ko-KR`, `localService`) 감지 상태 | `snapshot.voice` 기반 렌더링 | **미전달** (`snapshot.voice === undefined`) | [`useClassVoiceGuidance.ts`](../../src/hooks/useClassVoiceGuidance.ts) (`pickLocalKoreanVoice`) | **미연결** (수업 화면 진입 시 개별 훅에서 감지) | 미전달 시 `'기기 내장 한국어 음성 (수업 화면 진입·명시 토글 시 확인)'`으로 정직하게 표시 |
| **그룹 2: 한국어 음성 안내** | 수업 한국어 음성 안내 켜기/끄기 토글 | `settings-voice-enable-toggle` (`port.onToggleVoiceEnabled`) | **미전달** (`port.onToggleVoiceEnabled` 생략) | [`useClassVoiceGuidance.ts`](../../src/hooks/useClassVoiceGuidance.ts) (`LiveStageView` 로컬 상태) | **미연결** (후보 세션에 보존, 수업 화면과 미공유) | 포트 미연결 시 거짓 발화 성공 문구 대신 `'실제 발화는 수업 화면의 사용자 명시적 토글·브라우저 음성 허용 시에만 동작하며, 참고 영상은 자동 재생하지 않습니다'` 명시 |
| **그룹 2: 한국어 음성 안내** | 재생 속도 (`0.85x`, `1.0x`, `1.15x`) | `settings-voice-speed-*` (`port.onChangeVoiceSpeed`) | **미전달** (`port.onChangeVoiceSpeed` 생략) | [`useClassVoiceGuidance.ts#L88`](../../src/hooks/useClassVoiceGuidance.ts#L88) (`utterance.rate = 1` 고정) | **미연결** (후보 세션에 보존) | 실제 수업 음성 훅은 아직 `rate = 1` 고정이며 설정값 공유 스토어 미연결 |
| **그룹 2: 한국어 음성 안내** | 안내 항목 체크박스 (`동작·단계`, `호흡 메모`, `남은 시간`) | `settings-voice-pref-*` (`port.onToggleVoicePreference`) | **미전달** (`port.onToggleVoicePreference` 생략) | [`useClassVoiceGuidance.ts#L28-L32`](../../src/hooks/useClassVoiceGuidance.ts#L28-L32) (로컬 `useState`) | **미연결** (후보 세션에 보존) | 체크 변경 시 즉시 `2/3 켜짐` 등 요약/발화 안내에 반영되고 설정 재방문 시 유지됨 |
| **그룹 2: 한국어 음성 안내** | 샘플 문구 확인 / 음성 상태 다시 확인 | `settings-voice-sample-btn`, `settings-voice-recheck-btn` | **미전달** (`port` 콜백 생략) | [`useClassVoiceGuidance.ts`](../../src/hooks/useClassVoiceGuidance.ts) | **미연결** (대본 프리뷰 안내만 표시) | 음성 꺼짐/미연결 상태에서 자동 발화하지 않고 화면 대본과 전제 조건만 안내 |
| **시각 모션 감소** | 시각 모션 감소 토글 및 상태 표시 | `settings-reduced-motion-toggle`, `settings-reduced-motion-status` | **미전달** (`preferReducedMotion`, `onToggleReducedMotion` 생략) | 후보 로컬 세션 + OS `prefers-reduced-motion` 미디어쿼리 | **부분 반영** (후보 설정 화면 내 즉시 반영 + 세션 유지) | `[data-reduced-motion="true"]`로 후보 설정 내 전환·스크롤 모션 즉시 제거, 모달 재방문 시 유지 |
| **그룹 3: 앱 설치 및 오프라인** | 실행 형태(`standalone`), 설치 가능 여부, 오프라인 상태 | `snapshot.install` 기반 렌더링 | **미전달** (`snapshot.install === undefined`) | [`PwaInstallPanel.tsx`](../../src/components/PwaInstallPanel.tsx), [`pwa.ts`](../../src/lib/pwa.ts) (`usePwa`) | **미연결** (사이드바 `'앱 설치'` 모달에만 연결) | 후보 요약에서는 오프라인 기본 화면 범위·온라인 필수 기능(로그인·백업·외부 참고 영상)·자동 새로고침 금지를 정직하게 설명 |
| **그룹 3: 앱 설치 및 오프라인** | 이 기기에 설치 요청 버튼 | `settings-install-action-btn` (`port.onRequestPwaInstall`) | **미전달** (`port.onRequestPwaInstall` 생략) | [`pwa.ts`](../../src/lib/pwa.ts) (`requestPwaInstall`) | **미연결** | 포트 미연결 시 자동 설치 완료처럼 꾸미지 않고 수동 설치 안내·상단 앱 설치 버튼 이용 안내 표시 |
| **그룹 4: 데이터 관리 및 보유 기구** | 보관된 수업 자료 건수 (`시퀀스`, `동작`, `기록`) 및 오류/메시지 | `snapshot.data` (`savedSequenceCount`, `exerciseCount`, `historyLogCount`, `persistenceError`, `backupMessage`) | **실사용 연결됨** ([`src/App.tsx#L755-L763`](../../src/App.tsx#L755-L763)) | [`usePilatesStore.ts`](../../src/store/usePilatesStore.ts) | **실사용 연결됨** | 실제 스토어 건수·저장 경고·백업 메시지가 실시간 반영됨 |
| **그룹 4: 데이터 관리 및 보유 기구** | 전체 JSON 백업 내보내기 | `settings-data-export-btn` (`port.onExportBackupJson`) | **실사용 연결됨** (`onExportBackupJson: exportData`) | [`src/App.tsx#L259-L274`](../../src/App.tsx#L259-L274) | **실사용 연결됨** | 클릭 시 실제 JSON 백업 파일 다운로드 및 `backupMessage` 갱신 |
| **그룹 4: 데이터 관리 및 보유 기구** | 보유 기구 · 보유 소도구 선택 체크박스 | `settings-equipment-check-*`, `settings-prop-check-*` | **실사용 연결됨** (`onToggleOwnedEquipment`, `onToggleOwnedProp`) | [`usePilatesStore.ts`](../../src/store/usePilatesStore.ts) | **실사용 연결됨** | 클릭 시 실제 `usePilatesStore`의 보유 기구/소도구 상태가 즉시 토글 및 영속화됨 |
| **그룹 4: 데이터 관리 및 보유 기구** | 백업 불러오기(복구 전 확인) / 복원 적용 / 취소 / 직전 복원 되돌리기 | `settings-data-import-btn` 및 복구 프리뷰·롤백 바 | **미전달** (`recoveryStage`, `recoveryPreview`, `rollbackPoint` 및 복구 콜백 생략) | [`RecoveryPreview.tsx`](../../src/components/RecoveryPreview.tsx) | **미연결** (같은 모달 상단 `RecoveryPreview`에서 동작) | 후보 버튼 클릭 시 읽기 전용 검사 안내 문구만 표시하며 원본 데이터를 변경·삭제하지 않음 |

---

## 3. 후보 범위 내 최소 수정 내역 (`src/features/settingsPageCandidate/**`)

소유권 규칙에 따라 `src/App.tsx`, `src/store/**`, `src/components/**` 등 공유 파일은 수정하지 않고, `src/features/settingsPageCandidate/**` 내부에서만 아래 3가지 핵심 결함(잘못된 성공 안내 · 반영 누락 · 설정 재방문 불일치)을 해결했습니다.

1. **음성 안내 토글·샘플·속도·항목의 정직한 전제 고지 및 즉시 반영 ([`PilatesSettingsPage.tsx`](../../src/features/settingsPageCandidate/PilatesSettingsPage.tsx), [`settingsPageModel.ts`](../../src/features/settingsPageCandidate/settingsPageModel.ts))**:
   - **음성 자동발화 전제 및 참고 영상 자동재생 금지 명시**:
     - `[data-testid="settings-voice-autoplay-prerequisite"]`: `'사용자 명시적 토글 ON + 브라우저 음성 허용 전제 (자동 발화 금지)'`
     - `[data-testid="settings-video-autoplay-policy"]`: `'참고 영상 자동재생 금지 (수업 중 강사가 직접 열 때만 실행)'`
   - **잘못된 성공(False Success) 방지**:
     - 실제 진입 경로(`src/App.tsx`)처럼 `port.onToggleVoiceEnabled`가 연결되지 않은 상태에서 음성 토글을 켜면, 마치 수업 화면에서 즉시 음성이 나오는 것처럼 오도하지 않고 `'한국어 음성 안내 설정을 저장했습니다. 실제 발화는 수업 화면의 사용자 명시적 토글·브라우저 음성 허용 시에만 동작하며, 참고 영상은 자동 재생하지 않습니다.'`라고 정직하게 고지합니다.
     - 안내 항목 3개(`동작·단계`, `호흡 메모`, `남은 시간`)가 모두 꺼진 경우(`0/3`)에는 `'안내 항목이 모두 꺼져 있어(0/3) 실제 발화되지 않습니다'`라고 즉시 경고합니다.
   - **반영 누락 해결**:
     - 안내 항목 체크박스를 변경하면 이전 샘플 문구에 가려지지 않고 즉시 `model.voice.statusAnnouncementKo`(`2/3 켜짐` 등)가 갱신됩니다.

2. **시각 모션 감소(Reduced Motion) 명시적 토글 및 상태 표시 ([`PilatesSettingsPage.tsx#L630-L637`](../../src/features/settingsPageCandidate/PilatesSettingsPage.tsx#L630-L637), [`L747-L769`](../../src/features/settingsPageCandidate/PilatesSettingsPage.tsx#L747-L769))**:
   - OS/브라우저 `prefers-reduced-motion: reduce` 미디어쿼리 감지에 더해, 사용자가 설정 화면에서 직접 제어할 수 있는 `[data-testid="settings-reduced-motion-toggle"]` 버튼과 `[data-testid="settings-reduced-motion-status"]` 상태 행을 추가했습니다.
   - 토글 시 `[data-testid="pilates-settings-page"]`의 `data-reduced-motion="true"` 속성이 즉시 반영되어 CSS 전환 애니메이션(`transition: none`)과 스크롤 애니메이션을 즉시 억제합니다.

3. **오프라인 설치·미디어 범위의 정직한 설명 ([`PilatesSettingsPage.tsx#L884-L920`](../../src/features/settingsPageCandidate/PilatesSettingsPage.tsx#L884-L920), [`settingsPageModel.ts#L386-L447`](../../src/features/settingsPageCandidate/settingsPageModel.ts#L386-L447))**:
   - `[data-testid="settings-install-offline-summary"]` 및 `[data-testid="settings-install-offline-scope"]`를 통해 **기본 화면만 오프라인 열람 가능**하며 **Google 로그인·클라우드 백업·외부 참고 영상(자동재생 금지)은 인터넷 연결이 필요함**, **설치는 기기 간 동기화가 아님**, **수업 작성 중 자동 새로고침하지 않음**을 명확히 분리해 안내합니다.
   - `port.onRequestPwaInstall`이 연결되지 않은 요약 화면에서는 거짓 설치 완료 메시지 대신 수동 설치 안내를 자동으로 펼칩니다.

4. **설정 재방문 및 스토어 리렌더 시 상태 초기화(불일치) 해결 ([`PilatesSettingsPage.tsx#L58-L208`](../../src/features/settingsPageCandidate/PilatesSettingsPage.tsx#L58-L208), [`settingsPageModel.ts#L803-L905`](../../src/features/settingsPageCandidate/settingsPageModel.ts#L803-L905))**:
   - **원인**: `src/App.tsx`는 매 렌더링마다 인라인 객체 리터럴 `snapshot={{ data: { ... } }}`를 새로 생성하여 `<PilatesSettingsPage />`에 전달합니다. 기존에는 `[snapshot]` 참조가 바뀔 때마다(예: 보유 기구 체크박스 클릭으로 `usePilatesStore`가 업데이트될 때) 로컬 오버라이드 상태(`voice`, `reducedMotion`, `install`)가 초기화되거나, 모달을 닫았다가 다시 열 때 설정값이 유실되는 불일치가 있었습니다.
   - **해결**: 그룹별 세분화 베이스라인 키(`voiceBaselineKey`, `motionBaselineKey`, `installBaselineKey`, `dataBaselineKey`)와 데이터 전용 진입 스냅샷 감지(`isDataOnlyEntrySnapshot` + `uncontrolledEntrySession`)를 도입해, `src/App.tsx`가 인라인 `snapshot={{ data: ... }}`을 리렌더하거나 사용자가 `'나의 스튜디오'` 모달을 닫았다가 재방문해도 사용자가 변경한 음성 토글·재생 속도·안내 항목·모션 감소·설치 안내 열림 상태가 그대로 유지됩니다.

---

## 4. 실제 브라우저 검증 결과 (`320 / 390 / 768 / 1440` · `200%` 확대 · 재방문 일관성)

독립 검증 스크립트([`src/features/settingsPageCandidate/independentVerification/verifySettingsRealEntryRound4.mjs`](../../src/features/settingsPageCandidate/independentVerification/verifySettingsRealEntryRound4.mjs))를 통해 임시 로컬 Vite 서버와 Headless Chromium(`/usr/bin/chromium`, CDP)에서 **실제 진입 경로(`/`)**와 **후보 하네스(`/src/features/settingsPageCandidate/browserFixture.html`)**를 모두 실행했습니다.

### 4.1 뷰포트별 실제 진입 경로(`/`) 검증 요약

| 뷰포트 | 진입 경로 (`설정 / 안내` → `나의 스튜디오` → 접힌 `<details>` 펼침) | 100% 가로 오버플로 | 200% 확대 가로 오버플로 | 최소 터치 타깃 (`>= 44x44px`) | 인접 컨트롤 겹침 | 런타임 오류 (`pageErrors`) | 결과 |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `320x640` | `details.open: false → true` 확인, 4개 그룹 모두 노출 | `0px` (`320 <= 320`) | `0px` (`320 <= 320`) | 43개 컨트롤 전원 통과 | `0건` | `0건` | **PASS** |
| `390x844` | `details.open: false → true` 확인, 4개 그룹 + 재방문 일관성 통과 | `0px` (`390 <= 390`) | `0px` (`390 <= 390`) | 43개 컨트롤 전원 통과 | `0건` | `0건` | **PASS** |
| `768x1024` | `details.open: false → true` 확인, 4개 그룹 모두 노출 | `0px` (`768 <= 768`) | `0px` (`768 <= 768`) | 43개 컨트롤 전원 통과 | `0건` | `0건` | **PASS** |
| `1440x900` | `details.open: false → true` 확인, 4개 그룹 모두 노출 | `0px` (`1440 <= 1440`) | `0px` (`1440 <= 1440`) | 43개 컨트롤 전원 통과 | `0건` | `0건` | **PASS** |

### 4.2 실제 진입 경로(`/`) 인터랙티브 조작 · 스토어 리렌더 · 모달 재방문 검증 (`390x844`)
1. **음성 안내 켜기 (`settings-voice-enable-toggle`)**: `aria-pressed="true"` 전환 및 `settings-voice-announcement`에 `'한국어 음성 안내 설정을 저장했습니다. 실제 발화는 수업 화면의 사용자 명시적 토글·브라우저 음성 허용 시에만 동작하며, 참고 영상은 자동 재생하지 않습니다.'` 출력 확인.
2. **재생 속도 변경 (`settings-voice-speed-0.85`)**: `aria-pressed="true"` 및 `settings-current-value-voice` 배지에 `현재값: 음성 켜짐 · 0.85x (천천히)` 반영 확인.
3. **호흡 메모 체크 해제 (`settings-voice-pref-breath`)**: `checked === false` 전환과 동시에 `settings-voice-announcement`가 `동작·단계 · 남은 시간 (2/3 켜짐)`으로 즉시 갱신됨을 확인.
4. **시각 모션 감소 켜기 (`settings-reduced-motion-toggle`)**: `data-reduced-motion="true"` 및 `settings-reduced-motion-status`에 `모션 감소 켜짐 (즉시 전환 · 스크롤 애니메이션 생략)` 표시 확인.
5. **보유 기구 토글로 `App.tsx` 리렌더 유발 (`settings-equipment-check-chair`)**: `usePilatesStore`의 `toggleOwnedEquipment('chair')`가 실행되어 `App.tsx`가 새 인라인 `snapshot={{ data: ... }}` 객체를 내려보낸 직후에도 음성 켜짐(`true`), 속도(`0.85x`), 호흡 메모 해제(`false`), 모션 감소(`"true"`)가 초기화되지 않고 그대로 유지됨을 확인.
6. **모달 닫기 후 재방문 (`닫기` 클릭 → 상단바 `[aria-label="데이터 백업과 사용 안내"]` 재클릭)**: `'나의 스튜디오'` 모달을 닫았다가 다시 열어 확인했을 때도 음성 켜짐(`true`), 속도(`0.85x`), 호흡 메모 해제(`false`), 모션 감소(`"true"`), 기구 선택 상태가 100% 일치함을 확인 (`revisitConsistencyVerified: true`).

---

## 5. 후보 모듈 소스 파일 크기 및 증거 자료 링크

### 5.1 `src/features/settingsPageCandidate/**` 소스 파일 크기 (`totalFiles: 14`, `6,591 lines`, `253,044 bytes`)
- [`src/features/settingsPageCandidate/PilatesSettingsPage.tsx`](../../src/features/settingsPageCandidate/PilatesSettingsPage.tsx): `1,327 lines` (`54,147 bytes`)
- [`src/features/settingsPageCandidate/settingsPageModel.ts`](../../src/features/settingsPageCandidate/settingsPageModel.ts): `906 lines` (`34,853 bytes`)
- [`src/features/settingsPageCandidate/types.ts`](../../src/features/settingsPageCandidate/types.ts): `294 lines` (`10,458 bytes`)
- [`src/features/settingsPageCandidate/settingsPageFixtures.ts`](../../src/features/settingsPageCandidate/settingsPageFixtures.ts): `332 lines` (`10,733 bytes`)
- [`src/features/settingsPageCandidate/pilatesSettingsPage.css`](../../src/features/settingsPageCandidate/pilatesSettingsPage.css): `387 lines` (`7,705 bytes`)
- [`src/features/settingsPageCandidate/index.ts`](../../src/features/settingsPageCandidate/index.ts): `49 lines` (`1,304 bytes`)
- [`src/features/settingsPageCandidate/browserFixture.html`](../../src/features/settingsPageCandidate/browserFixture.html): `26 lines` (`860 bytes`)
- [`src/features/settingsPageCandidate/README.md`](../../src/features/settingsPageCandidate/README.md): `35 lines` (`2,922 bytes`)
- [`src/features/settingsPageCandidate/PilatesSettingsPage.mock.test.tsx`](../../src/features/settingsPageCandidate/PilatesSettingsPage.mock.test.tsx): `310 lines` (`14,324 bytes`)
- [`src/features/settingsPageCandidate/settingsPageModel.test.ts`](../../src/features/settingsPageCandidate/settingsPageModel.test.ts): `372 lines` (`15,417 bytes`)
- [`src/features/settingsPageCandidate/settingsRealEntryRound4.test.tsx`](../../src/features/settingsPageCandidate/settingsRealEntryRound4.test.tsx): `421 lines` (`17,670 bytes`)
- [`src/features/settingsPageCandidate/independentVerification/settingsPage.independent.test.tsx`](../../src/features/settingsPageCandidate/independentVerification/settingsPage.independent.test.tsx): `455 lines` (`18,353 bytes`)
- [`src/features/settingsPageCandidate/independentVerification/verifySettingsPageBrowser.mjs`](../../src/features/settingsPageCandidate/independentVerification/verifySettingsPageBrowser.mjs): `682 lines` (`24,531 bytes`)
- [`src/features/settingsPageCandidate/independentVerification/verifySettingsRealEntryRound4.mjs`](../../src/features/settingsPageCandidate/independentVerification/verifySettingsRealEntryRound4.mjs): `995 lines` (`39,767 bytes`)

### 5.2 검증 결과 JSON 및 스크린샷 아티팩트
- **검증 JSON 리포트**: [`evidence/real-entry-round4-verification.json`](./evidence/real-entry-round4-verification.json)
- **실제 진입 경로 스크린샷**:
  - `320x640 (100%)`: [`evidence/screenshots/real-entry-settings-320-100.png`](./evidence/screenshots/real-entry-settings-320-100.png)
  - `320x640 (200% 확대)`: [`evidence/screenshots/real-entry-settings-320-200zoom.png`](./evidence/screenshots/real-entry-settings-320-200zoom.png)
  - `390x844 (100%)`: [`evidence/screenshots/real-entry-settings-390-100.png`](./evidence/screenshots/real-entry-settings-390-100.png)
  - `390x844 (설정 변경·스토어 리렌더·모달 닫기 후 재방문 확인)`: [`evidence/screenshots/real-entry-settings-revisit-390.png`](./evidence/screenshots/real-entry-settings-revisit-390.png)
  - `768x1024 (100%)`: [`evidence/screenshots/real-entry-settings-768-100.png`](./evidence/screenshots/real-entry-settings-768-100.png)
  - `1440x900 (100%)`: [`evidence/screenshots/real-entry-settings-1440-100.png`](./evidence/screenshots/real-entry-settings-1440-100.png)
- **실제 앱(`src/App.tsx` 등) 상위 통합 배선 패치 제안서**:
  - [`PATCH_PROPOSAL_REAL_SETTINGS_WIRING.md`](./PATCH_PROPOSAL_REAL_SETTINGS_WIRING.md)
