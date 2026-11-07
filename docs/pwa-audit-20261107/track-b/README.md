# Track B 감사 보고서 — iOS Safari 설치 안내, Android 설치 프롬프트 분기/거절 후 재노출, 미지원 브라우저 안내 모의 테스트

- **작성 일시**: 2026-11-07
- **대상 저장소**: `pilate_flow` (`src/lib/pwa.ts`, `src/components/PwaInstallPanel.tsx`, `src/App.tsx`)
- **검증 트랙**: Track B (설치 경험 분기·생애주기 모의 테스트 및 회귀 결함 분석)
- **산출물 목록**:
  - `scripts/pwa-audit-20261107/track-b/install-flow-fixtures.ts`
  - `scripts/pwa-audit-20261107/track-b/track-b-install-flow-mock.test.tsx`
  - `scripts/pwa-audit-20261107/track-b/run-track-b-audit.mjs`
  - `docs/pwa-audit-20261107/track-b/track-b-results.json`
  - `docs/pwa-audit-20261107/track-b/README.md`

---

## 1. 검증 개요 및 정직성 선언 (Honesty & Environment Disclosure)

> **[중요 — 정직성 선언 (`realSafariExecuted: false`)]**
> 본 감사가 수행된 실행 환경은 **Debian GNU/Linux 12 (bookworm)** 가상머신이며, **실제 Apple Safari(macOS Safari, iOS Safari, iPadOS Safari, iOS Simulator, WebKit 엔진)나 실물 iOS/Android 단말기는 설치되어 있지 않고 실행되지 않았습니다.**
>
> - `realSafariExecuted`: `false`
> - `realIosDeviceExecuted`: `false`
> - `realAndroidDeviceExecuted`: `false`
>
> 본 보고서의 모든 iOS Safari, iPadOS Safari, macOS Safari 및 Android Chrome 검증 결과는 **모의 테스트(Vitest + jsdom + React Testing Library 통합 테스트 28건)** 와 **격리된 임시 프로필(`--user-data-dir`) 기반 Headless Chromium 156 CDP(Chrome DevTools Protocol) User-Agent·플랫폼·뷰포트·합성 이벤트 에뮬레이션(4개 E2E 시나리오)** 을 통해 확인된 결과입니다.

### 검증 구성 요약

| 구분 | 실행 도구 | 케이스 수 | 결과 | 비고 |
| --- | --- | ---: | --- | --- |
| 단위·통합 모의 테스트 | Vitest (`jsdom`) + React Testing Library (`track-b-install-flow-mock.test.tsx`) | 28 | **28 PASS / 0 FAIL** | `src/lib/pwa.ts` + `src/components/PwaInstallPanel.tsx` 실제 모듈 결합 검증 |
| 브라우저 DOM/CDP 모의 시나리오 | `/usr/bin/chromium` (Headless, 임시 프로필) + Node 24 WebSocket CDP (`run-track-b-audit.mjs`) | 4 | **4 PASS / 0 FAIL** | `dist/` 정적 서버 구동 후 `Emulation.setUserAgentOverride` 및 합성 이벤트 검증 |

---

## 2. 시나리오별 모의 테스트 결과

### 2.1 Test Group 1 — iOS Safari & iPadOS 설치 안내 모의 테스트 (실제 Safari 미실행, UA/플랫폼 에뮬레이션)

| 테스트 대상 | 에뮬레이션 조건 | 기대 동작 및 검증 결과 | 판정 |
| --- | --- | --- | --- |
| iPhone Mobile Safari 탭 (`ios-safari-iphone-browser-tab`) | `userAgent: "...iPhone OS 18_3...Safari/604.1"`, `platform: "iPhone"`, `standalone: false` | `platform === 'ios-safari'` 감지, 3단계 순서 목록(`<ol><li>`: `공유` → `홈 화면에 추가` → `웹 앱으로 열기` / `추가`) 렌더링, `"이 기기에 설치"` 버튼 및 `"설치 버튼이 보이지 않나요?"` 미노출, `"Safari와 홈 화면 앱의 자료가 따로 보일 수 있으니"` 저장소 분리 주의 문구 노출 확인 | **PASS** (Vitest + CDP Scenario 1) |
| iPadOS 데스크톱 클래스 UA (`ios-safari-ipad-desktop-ua-tab`) | `userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)...Safari/605.1.15"`, `platform: "MacIntel"`, `maxTouchPoints: 5` | `navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1` 분기를 통해 `platform === 'ios-safari'`로 정상 감지하고 3단계 안내 표시 | **PASS** (Vitest) |
| iOS 타 브라우저 4종 (`CriOS`, `FxiOS`, `EdgiOS`, `OPiOS`) | `!/CriOS\|FxiOS\|EdgiOS\|OPiOS/` 정규식 제외 대상 UA | `platform === 'ios-other'` 감지, `"이 주소를 Safari에서 연 다음 공유 → 홈 화면에 추가를 선택하세요."` 문구 렌더링, `<ol>` 3단계 안내 및 설치 버튼 미노출 | **PASS** (Vitest + CDP Scenario 2) |
| Standalone 실행 감지 (`navigator.standalone` & `matchMedia`) | iOS `navigator.standalone === true` 또는 `matchMedia('(display-mode: standalone)').matches === true` | `standalone: true, installed: true` 상태로 초기화되며 `<p role="status">지금 앱으로 실행 중이에요.</p>` 표시 및 설치 버튼 숨김 | **PASS** (Vitest) |

### 2.2 Test Group 2 — Android 설치 프롬프트 분기 및 중복 호출 방지 (Single-Use Guard)

| 테스트 항목 | 검증 내용 | 판정 |
| --- | --- | --- |
| `beforeinstallprompt` 수신 및 자동 프롬프트 억제 | 이벤트 발생 시 `event.preventDefault()` 호출(`defaultPrevented === true`), 자동 `prompt()` 호출 횟수 `0`, `canInstall: true` 전환, `"이 기기에 설치"` 버튼 노출 및 수동 안내 `<details>` 자동 접힘(`open === false`) | **PASS** (Vitest + CDP Scenario 3) |
| 설치 버튼 클릭 및 중복 클릭 차단 | `"이 기기에 설치"` 클릭 시 `canInstall: false, installStatus: 'prompting'` 전환, 버튼 즉시 숨김, `"브라우저의 설치 창에서 선택해 주세요."` 표시, 진행 중 `requestPwaInstall()` 중복 호출 시 `prompt()`가 정확히 1회만 실행됨 | **PASS** (Vitest + CDP Scenario 3) |
| 수락(`accepted`)과 실제 설치 완료(`appinstalled`) 분리 | `userChoice`가 `{ outcome: 'accepted' }`로 해결될 때 `installed: false, installStatus: 'accepted'`(`"설치를 요청했어요. 기기의 설치가 끝나면 앱 목록에서 열어 주세요."`)를 유지하고, 이후 `window.dispatchEvent(new Event('appinstalled'))` 수신 시에만 `installed: true, installStatus: 'idle'`(`"브라우저에서 설치 완료를 확인했어요..."`)로 전환 | **PASS** (Vitest + CDP Scenario 3) |
| `appinstalled` 선행 경쟁 상태 (Race Condition) | `userChoice` Promise가 해결되기 전에 `appinstalled` 이벤트가 먼저 도착하더라도 `!state.installed` 가드에 의해 최종 상태가 `installed: true, canInstall: false, installStatus: 'idle'`로 일관되게 유지됨 | **PASS** (Vitest) |

### 2.3 Test Group 3 — 설치 거절(`dismissed`) 처리, 다이얼로그 재오픈, 거절 후 재노출(`거절 후 재노출`) 및 오류 복구

| 테스트 항목 | 검증 내용 | 판정 |
| --- | --- | --- |
| 설치 취소(`outcome: 'dismissed'`) 직후 UX | `canInstall: false, installStatus: 'dismissed'` 전환, `"설치를 취소했어요. 계속 웹에서 사용하거나 브라우저 메뉴에서 다시 설치할 수 있어요."` 안내 노출, `"설치 버튼이 보이지 않나요?"` `<details open>` 수동 안내가 자동으로 펼쳐짐 | **PASS** (Vitest + CDP Scenario 3) |
| 다이얼로그 닫기 후 재오픈 시 일관성 | 새 `beforeinstallprompt` 이벤트가 오기 전에 `<PwaInstallPanel />`을 언마운트 후 재마운트(모달 닫기 → 다시 열기)해도 죽은 설치 버튼이 나타나지 않고 `dismissed` 안내와 열린 `<details open>` 수동 안내가 그대로 유지됨 | **PASS** (Vitest + CDP Scenario 3) |
| **거절 후 재노출 (`beforeinstallprompt` 재수신)** | 사용자가 한 번 거절(`dismissed`)하거나 `prompt()` 예외(`error`)가 발생한 뒤, 브라우저가 새로운 `beforeinstallprompt` 이벤트를 발행하면 `pendingPrompt`가 교체되고 `canInstall: true`가 되어 **`"이 기기에 설치"` 버튼이 정상적으로 재노출**되며 클릭 시 새 이벤트의 `prompt()`가 호출됨 (단, 아래 결함 `B-F2` 참고) | **PASS** (Vitest + CDP Scenario 3) |

### 2.4 Test Group 4 — 미지원 브라우저 / 사설 창 / 비보안 컨텍스트 수동 안내 Fallback

| 프로파일 ID | 에뮬레이션 환경 | 검증 결과 | 판정 |
| --- | --- | --- | --- |
| `firefox-desktop` | Firefox 136 Desktop (`Linux x86_64`, `beforeinstallprompt` 미발생) | 설치 버튼 미노출, `<details open>`(`"설치 버튼이 보이지 않나요?"`) 자동 펼침, Android Chrome(`⋮ 메뉴 → 홈 화면에 추가 → 설치`) 및 Mac Safari(`파일 → Dock에 추가`) 수동 안내 노출 | **PASS** (Vitest + CDP Scenario 4) |
| `firefox-android` | Firefox 136 Android (`Android 15; Mobile`, `beforeinstallprompt` 미발생) | 설치 버튼 미노출, `<details open>` 수동 안내 자동 펼침 | **PASS** (Vitest) |
| `macos-safari-desktop` | macOS Safari 18.3 Desktop (`MacIntel`, `maxTouchPoints: 0`, 모의 UA) | `platform === 'browser'`로 분류되어 `<details open>` 내 `"Mac Safari에서는 파일 → Dock에 추가를 선택하세요."` 안내 노출 | **PASS** (Vitest) |
| `chromium-private-incognito` | Chromium 사설/시크릿 창 (`beforeinstallprompt` 미발생) | 설치 버튼 없이 `<details open>` 수동 안내 유지 | **PASS** (Vitest) |
| `insecure-http-context` | 비보안 컨텍스트 (`window.isSecureContext === false`) | 서비스 워커 등록 생략, `offlineStatus === 'unavailable'`, `"현재 오프라인 준비를 확인하지 못했어요. 인터넷에 연결해서 사용해 주세요."` 문구 노출 | **PASS** (Vitest) |
| `missing-service-worker-api` | `navigator.serviceWorker` 미지원 환경 | 서비스 워커 등록 생략, `offlineStatus === 'unavailable'` 안내 문구 노출 | **PASS** (Vitest) |

---

## 3. 발견된 회귀 위험 및 에지 케이스 결함 (`B-F1` ~ `B-F4`)

모의 테스트(`Test Group 5`) 및 Headless Chromium CDP 실행을 통해 `src/lib/pwa.ts`와 `src/components/PwaInstallPanel.tsx`에서 다음 4건의 에지 케이스 결함을 재현·확인했습니다.

### [B-F1] (Medium) iOS 인앱 브라우저 및 서드파티 WebKit 브라우저가 `'ios-safari'`로 오분류됨

- **위치**: `src/lib/pwa.ts:52-53`
- **원인 분석**:
  ```ts
  const safari =
    /Safari/.test(navigator.userAgent) && !/CriOS|FxiOS|EdgiOS|OPiOS/.test(navigator.userAgent);
  ```
  iOS의 카카오톡 인앱 브라우저(`KAKAOTALK`), 네이버 앱 인앱 브라우저(`NAVER(inapp)`), Google 검색 앱(`GSA`), 네이버 웨일(`Whale`) 등은 Apple WebKit 정책상 User-Agent 끝에 `Safari/604.1` 또는 `Safari/605.1.15`를 포함합니다. 현재 정규식은 `CriOS|FxiOS|EdgiOS|OPiOS` 4종만 제외하므로, 한국 강사들이 링크를 공유받을 때 가장 빈번히 열리는 **카카오톡·네이버 인앱 브라우저가 `'ios-safari'`로 오분류**됩니다.
- **사용자 영향**:
  인앱 브라우저에서는 하단 공유 메뉴에 Safari의 `"홈 화면에 추가"`(웹 앱 설치) 기능이 없거나 다르게 동작함에도, `"이 주소를 Safari에서 연 다음 공유 → 홈 화면에 추가를 선택하세요."`(`ios-other` 안내) 대신 Safari 전용 3단계 안내(`<ol>`)가 표시됩니다.
- **재현 단계**:
  1. `navigator.userAgent`를 `'Mozilla/5.0 (iPhone; CPU iPhone OS 18_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 KAKAOTALK 25.2.1 (INAPP) Safari/604.1'`로 설정 후 `startPwa()` 실행.
  2. `getPwaState().platform` 확인 시 `'ios-other'`가 아닌 `'ios-safari'`가 반환됨 (`track-b-install-flow-mock.test.tsx` Test Group 5에서 4개 프로파일 모두 재현 완료).
- **최소 수정 제안 (Minimal Fix Proposal)**:
  ```diff
  --- a/src/lib/pwa.ts
  +++ b/src/lib/pwa.ts
  @@ -50,7 +50,9 @@ export function startPwa({ registerServiceWorker = true } = {}) {
     const ios =
       /iPad|iPhone|iPod/.test(navigator.userAgent) ||
       (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
     const safari =
  -    /Safari/.test(navigator.userAgent) && !/CriOS|FxiOS|EdgiOS|OPiOS/.test(navigator.userAgent);
  +    /Version\/[\d.]+.*Safari/.test(navigator.userAgent) &&
  +    !/CriOS|FxiOS|EdgiOS|OPiOS|Whale|GSA|KAKAOTALK|NAVER|Instagram|FBAN|FBAV|Line|DaumApps/i.test(
  +      navigator.userAgent,
  +    );
  ```

---

### [B-F2] (Low) 설치 거절(`dismissed`) 또는 오류(`error`) 후 새 `beforeinstallprompt` 수신 시 재노출된 설치 버튼과 이전 취소/오류 배너가 동시에 표시됨

- **위치**: `src/lib/pwa.ts:65-69`, `src/components/PwaInstallPanel.tsx:19-43`
- **원인 분석**:
  `src/lib/pwa.ts:68`에서 새 `beforeinstallprompt` 이벤트를 수신할 때:
  ```ts
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    pendingPrompt = event as InstallEvent;
    if (!state.installed && state.installStatus !== 'prompting') publish({ canInstall: true });
  });
  ```
  `canInstall: true`만 발행하고 `installStatus`를 `'idle'`로 초기화하지 않습니다. 또한 `PwaInstallPanel.tsx`에서도 `{pwa.canInstall && <button>이 기기에 설치</button>}`과 `{pwa.installStatus === 'dismissed' && <p role="status">설치를 취소했어요...</p>}`를 독립 조건으로 렌더링합니다.
- **사용자 영향**:
  사용자가 한 번 설치를 취소한 뒤 브라우저가 새 `beforeinstallprompt`를 발행해 `"이 기기에 설치"` 버튼이 재노출될 때, 버튼 바로 아래에 여전히 `"설치를 취소했어요..."` 또는 `"설치 창을 열지 못했어요..."` 문구가 동시에 남아 혼란을 줍니다.
- **재현 단계**:
  1. 첫 `beforeinstallprompt` 수신 후 `"이 기기에 설치"` 클릭 → `userChoice`를 `{ outcome: 'dismissed' }`로 해결.
  2. 두 번째 `beforeinstallprompt` 이벤트 디스패치.
  3. 화면에 `"이 기기에 설치"` 버튼과 `"설치를 취소했어요..."` 배너가 동시에 존재함 (Vitest Test Group 5 및 CDP Scenario 3 `afterSecondPromptReExposure.findingBF2StaleDismissedBannerPresentAlongsideButton === true`로 재현).
- **최소 수정 제안 (Minimal Fix Proposal)**:
  ```diff
  --- a/src/lib/pwa.ts
  +++ b/src/lib/pwa.ts
  @@ -65,5 +65,11 @@ export function startPwa({ registerServiceWorker = true } = {}) {
     window.addEventListener('beforeinstallprompt', (event) => {
       event.preventDefault();
       pendingPrompt = event as InstallEvent;
  -    if (!state.installed && state.installStatus !== 'prompting') publish({ canInstall: true });
  +    if (!state.installed && state.installStatus !== 'prompting') {
  +      publish({
  +        canInstall: true,
  +        ...(state.installStatus === 'dismissed' || state.installStatus === 'error'
  +          ? { installStatus: 'idle' }
  +          : {}),
  +      });
  +    }
     });
  ```

---

### [B-F3] (Low) `display-mode: standalone` 해제(`change` 이벤트) 시 `installed: true`가 남아 이후 `beforeinstallprompt`를 차단함

- **위치**: `src/lib/pwa.ts:59-64`, `src/lib/pwa.ts:68`
- **원인 분석**:
  ```ts
  display?.addEventListener('change', () => {
    publish({
      standalone: isStandalone(),
      ...(isStandalone() ? { installed: true, canInstall: false } : {}),
    });
  });
  ```
  standalone 창에서 일반 브라우저 탭으로 전환되거나 앱 삭제 후 `display.matches`가 `true`에서 `false`로 바뀔 때 `standalone: false`만 갱신되고 `installed: true`는 그대로 남습니다. 이후 `beforeinstallprompt`가 발생해도 `if (!state.installed ...)` 조건 때문에 무시됩니다.
- **최소 수정 제안 (Minimal Fix Proposal)**:
  ```diff
  --- a/src/lib/pwa.ts
  +++ b/src/lib/pwa.ts
  @@ -59,6 +59,9 @@ export function startPwa({ registerServiceWorker = true } = {}) {
     display?.addEventListener('change', () => {
  +    const nextStandalone = isStandalone();
       publish({
  -      standalone: isStandalone(),
  -      ...(isStandalone() ? { installed: true, canInstall: false } : {}),
  +      standalone: nextStandalone,
  +      installed: nextStandalone,
  +      canInstall: !nextStandalone && pendingPrompt !== null,
       });
     });
  ```

---

### [B-F4] (Low) 설치 상태 배너와 업데이트 준비 배너가 동시에 활성화될 때 복수의 `role="status"` 요소가 노출됨

- **위치**: `src/components/PwaInstallPanel.tsx:12-43`, `src/components/PwaInstallPanel.tsx:81-85`
- **원인 분석**:
  상단 설치 상태(`standalone`, `installed`, `prompting`, `accepted`, `dismissed`, `error`)가 `<p role="status">`를 렌더링할 때, 하단 `<details className="pwa-install-notes">` 내부의 `offlineStatus === 'update-ready'`도 `<p role="status">`를 렌더링하여 한 패널 안에 2개의 `role="status"` 라이브 리전이 공존합니다.
- **최소 수정 제안 (Minimal Fix Proposal)**:
  하단 `<details className="pwa-install-notes">` 내의 정적 안내 문구에서는 `role="status"`를 제거하거나 보조 설명 문단으로 유지하여 상단 설치 상태 라이브 리전과 충돌하지 않도록 정리합니다.

---

## 4. 검증 한계 (Verification Limitations) 및 재현 명령어

### 4.1 검증 한계
1. **실제 Safari / WebKit 미실행 (`realSafariExecuted: false`)**:
   - Linux(Debian 12) 환경 제약으로 인해 실제 iPhone/iPad Safari, macOS Safari, WebKit 엔진에서의 네이티브 공유 시트(`홈 화면에 추가`) UI, Web App Manifest 아이콘 렌더링, Safari–홈 화면 앱 간 IndexedDB/LocalStorage 격리 동작은 실물 기기에서 실행되지 않았습니다.
2. **실물 Android 기기 설치 배너 미실행 (`realAndroidDeviceExecuted: false`)**:
   - Android Chrome의 네이티브 OS 설치 바텀시트 및 APK(WebAPK) 생성 과정은 합성 `beforeinstallprompt` / `appinstalled` 이벤트로 에뮬레이션되었습니다.

### 4.2 재현 명령어

```bash
# 1. Track B Vitest 모의 테스트 단독 실행
pnpm exec vitest run scripts/pwa-audit-20261107/track-b/track-b-install-flow-mock.test.tsx

# 2. Track B ESLint 정적 검사 (경고/오류 0건 확인)
pnpm exec eslint scripts/pwa-audit-20261107/track-b/

# 3. Track B 통합 감사 러너 실행 (Vitest + 격리된 Headless Chromium CDP 4개 시나리오 + JSON 결과 생성)
node scripts/pwa-audit-20261107/track-b/run-track-b-audit.mjs
```
