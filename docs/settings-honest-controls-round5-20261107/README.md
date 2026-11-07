# Round 5: 설정 후보 정직한 컨트롤 정리 및 실진입 연결 상태 추적 (`settings-honest-controls-round5-20261107`)

## 1. 개요 및 목표
- **목표**: [`src/features/settingsPageCandidate`](../../src/features/settingsPageCandidate)가 실제 사용자 설정 화면([`src/App.tsx`](../../src/App.tsx) `744–772`행)에서 연결되지 않은 기능을 사용 가능처럼 보여주거나 동작 없는 버튼을 성공 처리하지 않도록 정리합니다.
- **소유 범위 준수**:
  - 수정 파일: `src/features/settingsPageCandidate/**` 및 `docs/settings-honest-controls-round5-20261107/**`만 소유·수정
  - 무수정 보호: `src/App.tsx`, `src/components/LiveStageView.tsx`, `src/hooks/**`, `src/store/**`, `src/lib/pwa.ts`, `src/components/RecoveryPreview.tsx`, 전역 CSS 및 타 페이지 코드는 일절 수정하지 않음
  - 최소 연결 패치 제안 및 계약 테스트 문서: [`PATCH_PROPOSAL_AND_CONTRACT_TESTS.md`](./PATCH_PROPOSAL_AND_CONTRACT_TESTS.md)

---

## 2. 최신 실제 진입(`src/App.tsx`) 읽기 추적 및 상태 분류 (`연결됨` / `후보만` / `미지원`)

### 2.1 4대 추적 항목 정밀 코드 대조

1. **`voice` / `rate` → [`LiveStageView.tsx`](../../src/components/LiveStageView.tsx) 전달 여부**
   - [`src/App.tsx`](../../src/App.tsx) `507–513`행에서 `<LiveStageView />`에는 `navigationRef`, `onNavigate`, `onOpenLogModal`만 전달되며 음성 설정이나 배속(`speed`)은 전달되지 않습니다.
   - [`src/components/LiveStageView.tsx`](../../src/components/LiveStageView.tsx) `337–354`행 및 `793–847`행은 [`useClassVoiceGuidance`](../../src/hooks/useClassVoiceGuidance.ts) 훅의 세션 로컬 상태(`enabled: useState(false)`, `preferences: useState({ movement: true, breath: true, time: true })`)를 직접 사용합니다.
   - 특히 [`src/hooks/useClassVoiceGuidance.ts`](../../src/hooks/useClassVoiceGuidance.ts) `88`행에서 `utterance.rate = 1;`로 고정되어 있고 [`ClassVoiceController.ts`](../../src/models/ClassVoiceController.ts)에도 배속 필드가 없어, **음성 재생 속도 변경(`0.85x`, `1.15x`)은 실제 수업 화면에서 `미지원`(`1.0x` 고정)** 상태입니다.

2. **`install port` → [`PwaInstallPanel.tsx`](../../src/components/PwaInstallPanel.tsx) (`usePwa` / `requestPwaInstall`) 연결 여부**
   - 실제 앱의 PWA 상태 구독(`usePwa()`)과 설치 프롬프트 호출(`requestPwaInstall()`)은 좌측·모바일 메뉴의 `"앱 설치"` 버튼([`src/App.tsx`](../../src/App.tsx) `383–385`행, `655–662`행)이 여는 [`PwaInstallPanel.tsx`](../../src/components/PwaInstallPanel.tsx)에 연결되어 있습니다.
   - 반면 [`src/App.tsx`](../../src/App.tsx) `753–770`행의 `<PilatesSettingsPage />`에는 `snapshot.install`과 `port.onRequestPwaInstall`이 전달되지 않아 **`후보만`** 상태입니다.

3. **`recovery port` → [`RecoveryPreview.tsx`](../../src/components/RecoveryPreview.tsx) 연결 여부**
   - [`src/App.tsx`](../../src/App.tsx) `753–770`행에서 `snapshot.data`(`savedSequenceCount`, `exerciseCount`, `historyLogCount`, `ownedEquipmentIds`, `ownedPropIds`, `persistenceError`, `backupMessage`)와 `port.onExportBackupJson`, `port.onToggleOwnedEquipment`, `port.onToggleOwnedProp`는 실제 스토어/백업 함수와 **`연결됨`** 상태입니다.
   - 반면 백업 파일 선택·복구 전 확인·복원 적용/취소·되돌리기(`onSelectBackupFile`, `onApplyBackupRestore`, `onCancelBackupRestore`, `onRollbackBackupRestore`, `onDismissRollbackBanner`)는 같은 `"나의 스튜디오"` 모달 상단의 [`RecoveryPreview.tsx`](../../src/components/RecoveryPreview.tsx) (`705`행)가 자체 파일 입력(`input[type="file"]`)으로 소유하고 있으며, `<PilatesSettingsPage />`에는 전달되지 않아 **`후보만`** 상태입니다.

4. **`reducedmotion` DOM 효과 범위 추적**
   - [`PilatesSettingsPage.tsx`](../../src/features/settingsPageCandidate/PilatesSettingsPage.tsx) `409`행은 `.pf-settings-page` 루트 엘리먼트에만 `data-reduced-motion="true" | "false"` 속성을 부여합니다.
   - [`pilatesSettingsPage.css`](../../src/features/settingsPageCandidate/pilatesSettingsPage.css) `387–392`행의 `.pf-settings-page[data-reduced-motion='true']` 규칙은 설정 후보 카드 내부 버튼의 `140ms` 색상 전환만 제거하며, `document.documentElement`나 `.app-shell`, `LiveStageView`, `SequenceWorkbench`의 모션에는 영향을 주지 않습니다.
   - [`src/App.tsx`](../../src/App.tsx)에서 `port.onToggleReducedMotion`이 전달되지 않으므로, 카드 내 토글 버튼은 **`후보만`** 상태이며 실제 앱 전체 모션 감소는 기기·브라우저의 `prefers-reduced-motion: reduce` 미디어 쿼리를 따릅니다.

---

### 2.2 전체 기능·컨트롤 상태 분류표 (`연결됨` / `후보만` / `미지원`)

| 그룹 | 기능 / 컨트롤 (`data-testid`) | 상태 분류 | 실제 진입(`App.tsx`) 동작 및 사용자 안내 |
|---|---|---|---|
| **공통 탐색** | 그룹 바로가기 칩 4종 (`settings-nav-chip-*`) | **연결됨** | 활성화 · 클릭 및 방향키(`ArrowLeft/Right`, `Home`, `End`)로 해당 그룹 즉시 이동 |
| **1. 계정** | Google 로그인 / 계정 전환 / 로그아웃 / 재확인 (`settings-account-signin-btn` 등) | **후보만** | 포트 미연결 시 `disabled` 처리 · 바로 위 `‘Google 계정 연결’` 영역 이용 안내 표시 |
| **2. 음성** | 음성 안내 켜기/끄기 (`settings-voice-enable-toggle`), 안내 항목 3종 (`settings-voice-pref-*`), 샘플 확인 (`settings-voice-sample-btn`), 음성 상태 재확인 (`settings-voice-recheck-btn`) | **후보만** | 포트 미연결 시 `disabled` 처리 및 가짜 성공 메시지 차단 · `‘수업 진행’` 화면의 `‘기기 음성 안내’` 이용 안내 표시 |
| **2. 음성** | 한국어 음성 재생 속도 (`0.85x`, `1.0x`, `1.15x`, `settings-voice-speed-*`) | **미지원** (실앱 `1.0x` 고정) / **후보만** (계약 포트) | 포트 미연결 시 `disabled` 처리 · 현재값에 `1.0x (기본 고정 · 수업 화면 속도 변경 미지원)` 명시 |
| **2. 모션** | 시각 모션 감소 (`settings-reduced-motion-toggle`) | **후보만** (카드 내부 한정) | 포트 미연결 시 `disabled` 처리 · 기기·브라우저의 `‘모션 감소’` 설정 안내 표시 (`matchMedia` 자동 반영 유지) |
| **3. 설치** | 이 기기에 설치 (`settings-install-action-btn`) | **후보만** | 포트 미연결 시 `disabled` 처리 · 메뉴의 `‘앱 설치’` 버튼 및 브라우저 수동 설치 안내 자동 펼침 |
| **4. 데이터** | 보관 자료 수 요약, 전체 JSON 백업 내보내기 (`settings-data-export-btn`), 보유 기구·소도구 선택 (`settings-equipment-check-*`, `settings-prop-check-*`) | **연결됨** | 활성화 · `usePilatesStore` 및 `exportData`와 실시간 연동 (모달 재방문 시에도 선택 유지) |
| **4. 데이터** | 백업 불러오기 (`settings-data-import-btn`), 복구 전 확인 적용/취소 (`settings-data-preview-*`), 복원 되돌리기 (`settings-data-rollback-*`) | **후보만** | 포트 미연결 시 `disabled` 처리 및 가짜 검사 메시지 차단 · 바로 위 `‘백업 불러오기’` 버튼 이용 안내 표시 |

---

## 3. 후보 범위 내 정직한 컨트롤 정리 내역 (`src/features/settingsPageCandidate/**`)

1. **미연결 버튼·입력의 즉시 비활성화 (`disabled`) 및 가짜 성공 차단**:
   - [`PilatesSettingsGroupSections.tsx`](../../src/features/settingsPageCandidate/PilatesSettingsGroupSections.tsx)에서 각 액션 포트(`onRequestGoogleSignIn`, `onToggleVoiceEnabled`, `onChangeVoiceSpeed`, `onToggleVoicePreference`, `onPreviewVoiceSample`, `onRecheckVoiceCapability`, `onToggleReducedMotion`, `onRequestPwaInstall`, `onSelectBackupFile`, `onApplyBackupRestore`, `onCancelBackupRestore`, `onRollbackBackupRestore`, `onDismissRollbackBanner`)의 연결 여부를 확인하여, 미연결 컨트롤을 `disabled`로 렌더링하고 클릭 시 가짜 성공 문구(`"설정을 저장했습니다"`, `"0.85배속으로 설정되었습니다"`, `"백업 JSON 파일을 읽기 전용으로 검사합니다"`)가 절대 표시되지 않도록 차단했습니다.
2. **개발 용어·장문 보고문 없는 간결한 실제 기능 안내**:
   - 일반 화면에 `LiveStage`, `PwaPanel`, `RecoveryPreview`, `port`, `props`, `snapshot`, `DOM`, `hook` 같은 개발 용어를 일절 노출하지 않고, 실제 앱에 존재하는 UI 이름으로 짧고 정확하게 안내합니다:
     - `settings-account-unconnected-guide`: *"이 요약 영역에서는 로그인을 실행하지 않습니다. 바로 위 ‘Google 계정 연결’에서 로그인·계정 전환을 이용해 주세요."*
     - `settings-voice-unconnected-guide`: *"음성 켜기와 읽어 줄 항목은 ‘수업 진행’ 화면의 ‘기기 음성 안내’에서 수업마다 직접 설정해 주세요. 재생 속도는 기본(1.0x)으로 고정되며, 화면 전환 줄이기는 기기·브라우저의 ‘모션 감소’ 설정을 따릅니다."*
     - `settings-install-unconnected-guide`: *"이 요약 영역에서는 바로 설치를 실행하지 않습니다. 메뉴의 ‘앱 설치’ 버튼이나 아래 브라우저 메뉴 설치 방법을 이용해 주세요."*
     - `settings-data-unconnected-guide`: *"백업 파일 불러오기와 복구 전 확인·되돌리기는 바로 위 ‘백업 불러오기’ 버튼을 이용해 주세요. 전체 백업 내보내기와 기구·소도구 선택은 여기서 바로 반영됩니다."*
3. **800줄 파일 크기 제한 준수 모듈화**:
   - [`settingsPageSession.ts`](../../src/features/settingsPageCandidate/settingsPageSession.ts) (`305`줄), [`settingsPageModel.ts`](../../src/features/settingsPageCandidate/settingsPageModel.ts) (`597`줄), [`PilatesSettingsGroupSections.tsx`](../../src/features/settingsPageCandidate/PilatesSettingsGroupSections.tsx) (`641`줄), [`PilatesSettingsPage.tsx`](../../src/features/settingsPageCandidate/PilatesSettingsPage.tsx) (`479`줄), [`cdpBrowserHelper.mjs`](../../src/features/settingsPageCandidate/independentVerification/cdpBrowserHelper.mjs) (`305`줄)로 분리하여 모든 파일이 **800줄 이하**(`최대 681줄`)임을 검증했습니다.

---

## 4. 검증 결과 및 증거 파일

- **단위·계약·통합 테스트**: 5개 테스트 파일 **52/52 통과**
  - [`settingsPageModel.test.ts`](../../src/features/settingsPageCandidate/settingsPageModel.test.ts) (12 tests)
  - [`PilatesSettingsPage.mock.test.tsx`](../../src/features/settingsPageCandidate/PilatesSettingsPage.mock.test.tsx) (12 tests)
  - [`settingsPage.independent.test.tsx`](../../src/features/settingsPageCandidate/independentVerification/settingsPage.independent.test.tsx) (12 tests)
  - [`settingsRealEntryRound4.test.tsx`](../../src/features/settingsPageCandidate/settingsRealEntryRound4.test.tsx) (11 tests)
  - [`settingsHonestControlsRound5.test.tsx`](../../src/features/settingsPageCandidate/settingsHonestControlsRound5.test.tsx) (5 tests)
- **실제 헤드리스 브라우저 검증 (`320px` / `390px` / `768px` / `1440px` + `200%` 확대)**:
  - 검증 스크립트: [`verifySettingsHonestControlsRound5.mjs`](../../src/features/settingsPageCandidate/independentVerification/verifySettingsHonestControlsRound5.mjs)
  - 검증 결과 JSON: [`evidence/honest-controls-round5-verification.json`](./evidence/honest-controls-round5-verification.json)
  - 스크린샷 증거:
    - [`round5-real-entry-320-100.png`](./evidence/screenshots/round5-real-entry-320-100.png)
    - [`round5-real-entry-320-200zoom.png`](./evidence/screenshots/round5-real-entry-320-200zoom.png)
    - [`round5-real-entry-390-100.png`](./evidence/screenshots/round5-real-entry-390-100.png)
    - [`round5-real-entry-768-100.png`](./evidence/screenshots/round5-real-entry-768-100.png)
    - [`round5-real-entry-1440-100.png`](./evidence/screenshots/round5-real-entry-1440-100.png)
    - [`round5-real-entry-1440-200zoom.png`](./evidence/screenshots/round5-real-entry-1440-200zoom.png)
    - [`round5-real-entry-voice-group-390.png`](./evidence/screenshots/round5-real-entry-voice-group-390.png)
