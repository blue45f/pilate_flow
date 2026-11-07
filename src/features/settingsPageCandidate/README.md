# Pilates 설정 페이지 로컬 UI 개선 후보 모듈 (`settingsPageCandidate`)

> **문서 식별자**: `parallel-page-settings-20261107`
> **소유 경계**: `src/features/settingsPageCandidate/**` 및 `docs/parallel-page-settings-20261107/**` (공유 `src/App.tsx`, `src/store/usePilatesStore.ts`, `src/styles/studio.css`, `package.json` 등 기존 파일 수정 `0건`)

---

## 1. 개선 목적 및 핵심 원칙

1. **4개 짧은 그룹 구조 (`계정` · `음성` · `설치` · `데이터 관리`)**:
   - 기존 `App.tsx` 내부에 흩어져 있던 계정·기구·백업·안전 안내와 별도 모달(`PwaInstallPanel`)에 분리되어 있던 앱 설치, 그리고 설정 화면에 없던 한국어 음성 안내 설정을 **4개 짧은 그룹**으로 재구성했습니다.
2. **현재값 배지 · 짧은 설명 · 44px 터치 타깃 및 간격(`>= 8px`) 정리**:
   - 각 그룹 상단에 **`현재값: ...` 배지(`data-testid="settings-current-value-*"`)**와 **1~2문장 짧은 설명(`data-testid="settings-description-*"`)**, 그리고 핵심 상태 `<dl>` 요약을 배치했습니다.
   - 모든 버튼·속도 선택·체크박스 라벨·`<summary>`·외부 링크 버튼의 최소 터치 영역을 **`44px × 44px` 이상**, 인접 컨트롤 간 터치 간격을 **`10px` (`>= 8px`)**로 보장하고 `320px`/`390px`/`768px`/`1440px` 및 `200%` 확대에서 가로 넘침(`0px`)이 없도록 설계했습니다.
3. **인증·보안 설정 실제 변경 금지 및 데이터 삭제 동작 금지 (`SETTINGS_PAGE_SAFETY_CONTRACT`)**:
   - `canMutateAuthOrSecurityConfig: false` — 인증 도메인, Firebase API 키, 토큰, 보안 구성을 변경하는 UI나 동작을 일절 두지 않으며, 비신뢰 입력 내 API 키/Bearer 토큰/JWT/GitHub 토큰 문자열은 자동 마스킹(`[민감정보 보호됨]`)합니다.
   - `canDeleteUserData: false`, `hasDestructiveDeleteAction: false` — 강사의 수업 시퀀스·커스텀 동작·수업 기록을 보호하기 위해 **전체 데이터 삭제/초기화 버튼을 제공하지 않으며**, 백업 내보내기와 안전한 병합 복구(및 직전 복원 되돌리기)만 지원합니다.
   - `usesMockAdaptersInTests: true` — 모든 인터랙션은 주입 가능한 `SettingsPageActionPort` (`createMockSettingsActionRecorder`)를 통해 모의(mock) 검증됩니다.

---

## 2. 재현 및 검증 명령어

```bash
# 1. 단위·모의(Mock)·독립 경계 테스트 (Vitest)
./node_modules/.bin/vitest run src/features/settingsPageCandidate

# 2. TypeScript 및 ESLint 정적 검사
./node_modules/.bin/tsc -b --pretty false
./node_modules/.bin/eslint src/features/settingsPageCandidate --max-warnings=0

# 3. 실제 Headless Chromium 브라우저 검증 (320/390/768/1440px, 200% 확대, 44px 터치 타깃, 터치 간격)
node src/features/settingsPageCandidate/independentVerification/verifySettingsPageBrowser.mjs
```
