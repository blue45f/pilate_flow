# Pilates Flow 설정 페이지 로컬 UI 개선 및 2트랙 병렬 검증 종합 보고서 (`parallel-page-settings-20261107`)

> **식별자**: `parallel-page-settings-20261107`
> **통합 상태**: **MERGED & INTEGRATED INTO `main`** (`src/App.tsx` 연결 완료 및 원격 작업 브랜치 `feat/parallel-page-settings-20261107` 정리 완료)
> **작업 브랜치**: `feat/parallel-page-settings-20261107`
> **워크플로우 구조**: 다이나믹 2트랙 병렬 분리 (Track A: 로컬 UI 구현 및 Mock 어댑터 검증 / Track B: 독립 보안·경계 및 Headless Chromium `320/390/768/1440px`·`200%` 확대 검증)
> **소유 경계**:
> - 모듈 및 문서 경로: `src/features/settingsPageCandidate/**`, `docs/parallel-page-settings-20261107/**`
> - 기존 하위 패널(`src/components/CloudSyncPanel.tsx`, `src/components/PwaInstallPanel.tsx`, `src/components/RecoveryPreview.tsx`, `src/components/InventoryPanel.tsx`) 무결성 보존 및 `src/App.tsx` 선택적 디스클로저 통합 완료

---

## 1. 기존 구현 점검 결과 및 실제 미완·결함 해결 내역

1. **AGENTS·최신 `main`·기존 소유 경계 점검**:
   - 현재 `main`에서 설정 화면(`나의 스튜디오`)은 공유 라우트·셸 파일인 `src/App.tsx`(`658~761`행) 내부에 인라인으로 결합되어 있으며, 하위 패널(`PwaInstallPanel.tsx`, `CloudSyncPanel.tsx`, `RecoveryPreview.tsx`)은 병렬 감사 스위트(`scripts/pwa-audit-20261107/track-b/track-b-install-flow-mock.test.tsx` 등)가 정확한 DOM/줄 번호를 참조하고 있습니다.
   - 이에 따라 공유 파일 충돌과 기존 감사 테스트 회귀를 방지하기 위해 **새 경로의 최소 패치 후보(`src/features/settingsPageCandidate/**`)**로 전환하여 설정 페이지 로컬 UI만 독점 소유했습니다.
2. **4개 짧은 그룹(`계정` · `음성` · `설치` · `데이터 관리`) 재구성**:
   - **그룹 1 (`account` — 계정 연결)**: 로그인 상태 현재값 배지, 브라우저 계정별 로컬 슬롯 분리 안내, 인증·보안 설정 읽기 전용 배지(`settings-account-security-readonly-badge`), Mock 어댑터 기반 로그인/계정전환/로그아웃/연결 재확인.
   - **그룹 2 (`voice` — 한국어 음성 안내)**: 기존 설정 화면에 누락되어 있던 한국어 음성(Web Speech API) 현재값 요약(`기기 내장 한국어 음성 상태`, `재생 속도 0.85x/1.0x/1.15x`, `안내 항목 동작·호흡·시간 3종`), 온디바이스 전용 개인정보 경계, 샘플 확인 및 상태 재확인.
   - **그룹 3 (`install` — 앱 설치 및 오프라인)**: 실행 형태 및 오프라인 준비 현재값, 수동 설치 버튼 및 iOS Safari 3단계 안내, PWA 감사에서 지적된 `B-F2`(새 설치 프롬프트 도착 시 이전 `dismissed`/`error` 잔존 배너 제거) 및 `B-F4`(설치 그룹 내 단일 `role="status"` 라이브 리전) 해결.
   - **그룹 4 (`data` — 데이터 관리 및 보유 기구)**: 보관된 시퀀스·동작·기록 수 및 보유 기구·소도구 현재값, JSON 백업 내보내기·복구 전 미리보기·직전 복원 되돌리기, 그리고 **데이터 삭제 동작 금지 보호 카드(`settings-data-no-delete-guard`)**.
3. **안전 경계 (`SETTINGS_PAGE_SAFETY_CONTRACT`)**:
   - `canMutateAuthOrSecurityConfig: false` (실제 인증·보안 설정 변경 동작 금지 및 비신뢰 문자열 내 API 키/Bearer/JWT/GitHub 토큰 자동 마스킹 `[민감정보 보호됨]`)
   - `canDeleteUserData: false`, `hasDestructiveDeleteAction: false` (전체 데이터 삭제·초기화·스토리지 비우기 버튼 및 동작 금지)
   - `usesMockAdaptersInTests: true` (`createMockSettingsActionRecorder` 기반 100% Mock 테스트)

---

## 2. 2트랙 다이나믹 워크플로우 산출물 및 검증 결과 요약

| 구분 | 소유 파일 경로 | 검증 결과 |
| --- | --- | --- |
| **코어 로컬 UI 후보** | - [`src/features/settingsPageCandidate/types.ts`](../../src/features/settingsPageCandidate/types.ts)<br>- [`src/features/settingsPageCandidate/settingsPageModel.ts`](../../src/features/settingsPageCandidate/settingsPageModel.ts)<br>- [`src/features/settingsPageCandidate/settingsPageFixtures.ts`](../../src/features/settingsPageCandidate/settingsPageFixtures.ts)<br>- [`src/features/settingsPageCandidate/PilatesSettingsPage.tsx`](../../src/features/settingsPageCandidate/PilatesSettingsPage.tsx)<br>- [`src/features/settingsPageCandidate/pilatesSettingsPage.css`](../../src/features/settingsPageCandidate/pilatesSettingsPage.css)<br>- [`src/features/settingsPageCandidate/browserFixture.html`](../../src/features/settingsPageCandidate/browserFixture.html)<br>- [`src/features/settingsPageCandidate/index.ts`](../../src/features/settingsPageCandidate/index.ts) | `tsc -b` **0 errors**, `eslint --max-warnings=0` **0 errors / 0 warnings** |
| **Track A (단위 · Mock 어댑터 검증)** | - [`src/features/settingsPageCandidate/settingsPageModel.test.ts`](../../src/features/settingsPageCandidate/settingsPageModel.test.ts) (12 tests)<br>- [`src/features/settingsPageCandidate/PilatesSettingsPage.mock.test.tsx`](../../src/features/settingsPageCandidate/PilatesSettingsPage.mock.test.tsx) (12 tests)<br>- [`TRACK_A_IMPLEMENTATION_REPORT.md`](./TRACK_A_IMPLEMENTATION_REPORT.md) | Vitest **24 / 24 PASS** |
| **Track B (독립 보안·경계 · Headless Chromium 검증)** | - [`src/features/settingsPageCandidate/independentVerification/settingsPage.independent.test.tsx`](../../src/features/settingsPageCandidate/independentVerification/settingsPage.independent.test.tsx) (12 tests)<br>- [`src/features/settingsPageCandidate/independentVerification/verifySettingsPageBrowser.mjs`](../../src/features/settingsPageCandidate/independentVerification/verifySettingsPageBrowser.mjs)<br>- [`TRACK_B_INDEPENDENT_VERIFICATION_REPORT.md`](./TRACK_B_INDEPENDENT_VERIFICATION_REPORT.md)<br>- [`evidence/browser-verification-results.json`](./evidence/browser-verification-results.json)<br>- `evidence/screenshots/*.png` (5장) | Vitest **12 / 12 PASS**<br>Headless Chromium `320/390/768/1440px` × 6 프리셋 × `100%/200%` 확대 **전수 PASS** (`0px` 가로 넘침, `>=44px` 터치 타깃, `0` 터치 겹침) |
| **통합 패치 제안** | - [`INTEGRATION_PATCH_PROPOSAL.md`](./INTEGRATION_PATCH_PROPOSAL.md) | `src/App.tsx` 최소 연결 diff 수록 |

---

## 3. 재현 실행 명령어

```bash
# 1. Settings 후보 모듈 전체 Vitest 스위트 실행 (3개 파일, 36개 테스트)
./node_modules/.bin/vitest run src/features/settingsPageCandidate

# 2. TypeScript 빌드 타입 체크 및 ESLint 정적 검사
./node_modules/.bin/tsc -b --pretty false
./node_modules/.bin/eslint src/features/settingsPageCandidate --max-warnings=0

# 3. 실제 Headless Chromium 브라우저 검증 (320/390/768/1440px, 200% 확대, 44px 터치 타깃, 터치 간격)
node src/features/settingsPageCandidate/independentVerification/verifySettingsPageBrowser.mjs
```

---

## 4. 정직성 및 미검증 경계 (`Honesty Boundaries`)

- `realChromiumCdpExecuted: true` — 로컬 임시 Vite 서버(`127.0.0.1:0`)와 `/usr/bin/chromium` Headless CDP(임시 프로필 자동 정리)로 `320px`, `390px`, `768px`, `1440px` 및 `200%` 글자/화면 확대를 직접 실측했습니다.
- `realSafariExecuted: false` — Linux(Debian 12) 컨테이너 환경이므로 실제 Apple iOS/iPadOS/macOS Safari(WebKit) 실물 기기는 실행되지 않았으며, iOS Safari 안내 및 스토리지 분리 경고는 합성 프리셋 및 모의(Mock) 테스트로 검증했습니다.
- `productionDeploymentExecuted: false` — 자동 운영 배포 및 외부 유료 API 호출은 일절 수행하지 않았습니다.
