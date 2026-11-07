# Pilates Flow PWA 설치 및 오프라인 업데이트 회귀 검증 종합 보고서 (2026-11-07)

- **감사 식별자**: `pwa-audit-20261107`
- **워크플로우 구조**: 다이나믹 2트랙 병렬 검증 (`track-a` / `track-b` 하위 폴더 완전 분리)
- **읽기 전용 및 격리 준수**:
  - 기존 앱 파일(`src/**`, `public/**`, `scripts/pwa-build.ts`, `scripts/check-pwa-build.mjs`, `package.json` 등) **전부 READ-ONLY 유지 (수정 0건)**
  - 모든 브라우저 검증은 `/usr/bin/chromium` Headless 임시 프로필(`os.tmpdir()/pwa-track-*`)에서만 수행 후 즉시 삭제 (사용자 브라우저 캐시/DB/설정 변경 0건)
  - **정직성 선언 (`realSafariExecuted: false`)**: 본 검증 환경은 Debian GNU/Linux 12 (`x86_64`)이므로 **실제 Apple Safari(iOS/iPadOS/macOS Safari, WebKit, iOS Simulator) 및 실물 모바일 기기는 실행되지 않았습니다.** Track B의 iOS Safari 및 Android 설치 흐름은 Vitest + `jsdom` 모의 테스트(28건) 및 격리된 Headless Chromium 156 CDP 에뮬레이션(4개 시나리오)으로 검증되었음을 명확히 구분하여 보고합니다.

---

## 1. 트랙별 디렉터리 및 산출물 구조

| 구분 | 스크립트 및 테스트 (`scripts/pwa-audit-20261107/**`) | 문서 및 실행 리포트 (`docs/pwa-audit-20261107/**`) |
| --- | --- | --- |
| **통합 오케스트레이터** | [`run-pwa-audit-20261107.mjs`](file:///home/antigravity/blue45f/pilate_flow/scripts/pwa-audit-20261107/run-pwa-audit-20261107.mjs) | [`README.md`](file:///home/antigravity/blue45f/pilate_flow/docs/pwa-audit-20261107/README.md), [`audit-summary.json`](file:///home/antigravity/blue45f/pilate_flow/docs/pwa-audit-20261107/audit-summary.json) |
| **Track A (Manifest / SW / Cache / 합성 수업 데이터 보존)** | [`track-a/synthetic-lesson-fixtures.ts`](file:///home/antigravity/blue45f/pilate_flow/scripts/pwa-audit-20261107/track-a/synthetic-lesson-fixtures.ts)<br>[`track-a/track-a-sw-cache-data-preservation.test.ts`](file:///home/antigravity/blue45f/pilate_flow/scripts/pwa-audit-20261107/track-a/track-a-sw-cache-data-preservation.test.ts)<br>[`track-a/run-track-a-audit.mjs`](file:///home/antigravity/blue45f/pilate_flow/scripts/pwa-audit-20261107/track-a/run-track-a-audit.mjs) | [`track-a/README.md`](file:///home/antigravity/blue45f/pilate_flow/docs/pwa-audit-20261107/track-a/README.md)<br>[`track-a/track-a-results.json`](file:///home/antigravity/blue45f/pilate_flow/docs/pwa-audit-20261107/track-a/track-a-results.json) |
| **Track B (iOS Safari 안내 / Android 설치 프롬프트 / 미지원 Fallback 모의 테스트)** | [`track-b/install-flow-fixtures.ts`](file:///home/antigravity/blue45f/pilate_flow/scripts/pwa-audit-20261107/track-b/install-flow-fixtures.ts)<br>[`track-b/track-b-install-flow-mock.test.tsx`](file:///home/antigravity/blue45f/pilate_flow/scripts/pwa-audit-20261107/track-b/track-b-install-flow-mock.test.tsx)<br>[`track-b/run-track-b-audit.mjs`](file:///home/antigravity/blue45f/pilate_flow/scripts/pwa-audit-20261107/track-b/run-track-b-audit.mjs) | [`track-b/README.md`](file:///home/antigravity/blue45f/pilate_flow/docs/pwa-audit-20261107/track-b/README.md)<br>[`track-b/track-b-results.json`](file:///home/antigravity/blue45f/pilate_flow/docs/pwa-audit-20261107/track-b/track-b-results.json) |

---

## 2. 실행 테스트 결과 요약

| 트랙 | 검증 범위 | Vitest 결과 | 격리 Headless Chromium 156 CDP 결과 | 수업 데이터 유실 |
| --- | --- | :---: | :---: | :---: |
| **Track A** | 매니페스트·아이콘 규격, `pwaBuild()` SHA-256 캐시 버전(`bad4e3f640aa9380`), SW `v1 -> v2` 대기(`waiting`) 및 활성화 시 구버전 캐시(`flow-atelier-shell-*`)만 선택 정리, `cleanUrls` 리다이렉트 무해화, 인증/API/쿼리 우회, 합성 필라테스 수업 데이터(7개 `localStorage` 키, 1,564,596 bytes) 오프라인 재방문 보존 | **7 / 7 PASS** | **5 / 5 단계 PASS** (`v1` 설치 → 오프라인 재방문 → `v2` 대기 업데이트 → 탭 재오픈 `v2` 활성화/구캐시 정리 → `v2` 오프라인 재방문) | **0 Bytes** (SHA-256 `ab29e224...` 전 구간 100% 일치) |
| **Track B** | iOS/iPadOS Safari 3단계 설치 안내 및 저장소 분리 경고(모의 UA/플랫폼), iOS 타 브라우저(`CriOS`, `FxiOS`, `EdgiOS`, `OPiOS`) Safari 유도 안내, Android `beforeinstallprompt` 수동 실행·중복 클릭 차단·거절(`dismissed`) 후 수동 안내 펼침 및 재발행 이벤트 시 버튼 재노출·`accepted`와 `appinstalled` 완료 분리, 미지원 브라우저/사설 창/비보안 컨텍스트 수동 안내 fallback | **28 / 28 PASS** | **4 / 4 시나리오 PASS** (모의 iOS Safari 390px, 모의 iOS Chrome 390px, 모의 Android Chrome 412px 전체 프롬프트 수명주기, 미지원 브라우저 1280px) | **0 Bytes** |

---

## 3. 발견된 회귀 위험·결함 요약 및 수정 제안

각 결함의 상세 재현 단계와 코드 diff는 [`docs/pwa-audit-20261107/track-a/README.md`](file:///home/antigravity/blue45f/pilate_flow/docs/pwa-audit-20261107/track-a/README.md) 및 [`docs/pwa-audit-20261107/track-b/README.md`](file:///home/antigravity/blue45f/pilate_flow/docs/pwa-audit-20261107/track-b/README.md)에 수록되어 있습니다.

| ID | 트랙 | 심각도 | 대상 파일 | 핵심 내용 및 수정 제안 요약 |
| --- | --- | :---: | --- | --- |
| **`A-F1`** | Track A | Low | [`scripts/pwa-build.ts`](file:///home/antigravity/blue45f/pilate_flow/scripts/pwa-build.ts#L18-L42) | `/site.webmanifest`, `/favicon.svg`, `/icons/apple-touch-icon.png`, `/icons/app-maskable-512.png` 4종이 프리캐시(`ASSETS`)와 버전 해시 입력에서 누락됨 → `ASSETS` 및 SHA-256 입력에 포함 제안 |
| **`A-F2`** | Track A | Medium | [`scripts/pwa-build.ts`](file:///home/antigravity/blue45f/pilate_flow/scripts/pwa-build.ts#L60-L72) | 신규 `v2` SW가 `waiting` 중일 때 온라인 루트 탐색(`/`)이 네트워크 우선으로 동작하여 활성 `v1` 컨트롤러 하에서 `v2` HTML을 로드함(이후 탭을 닫기 전 오프라인 전환 시 `v2` 지연 청크 미스 위험) → 활성 SW의 빌드 스코프 `CACHE` 내 `/index.html`을 우선 반환하여 HTML-JS 그래프 버전을 일치시킬 것을 제안 |
| **`A-F3`** | Track A | Low | [`src/lib/pwa.ts`](file:///home/antigravity/blue45f/pilate_flow/src/lib/pwa.ts#L79-L86) | 최초 설치 시(`registration.active === null`) 워커가 `installed` 상태(`registration.waiting`)를 거치는 순간 `offlineStatus`가 일시적으로 `'update-ready'`로 보고됨 → `registration.waiting && registration.active`일 때만 `'update-ready'`로 판정하도록 수정 제안 |
| **`B-F1`** | Track B | Medium | [`src/lib/pwa.ts`](file:///home/antigravity/blue45f/pilate_flow/src/lib/pwa.ts#L52-L53) | iOS 카카오톡(`KAKAOTALK`)·네이버(`NAVER`)·구글 앱(`GSA`)·웨일(`Whale`) 인앱/서드파티 WebKit 브라우저가 UA 내 `Safari/` 포함으로 인해 `'ios-safari'`로 오분류됨 → `/Version\/[\d.]+.*Safari/` 및 인앱 UA 제외 정규식으로 강화 제안 |
| **`B-F2`** | Track B | Low | [`src/lib/pwa.ts`](file:///home/antigravity/blue45f/pilate_flow/src/lib/pwa.ts#L65-L69) | 설치 거절(`dismissed`) 또는 오류(`error`) 후 새 `beforeinstallprompt` 도착으로 `"이 기기에 설치"` 버튼이 재노출될 때 이전 취소/오류 배너가 함께 남아 있음 → 새 프롬프트 수신 시 `installStatus: 'idle'`로 초기화 제안 |
| **`B-F3`** | Track B | Low | [`src/lib/pwa.ts`](file:///home/antigravity/blue45f/pilate_flow/src/lib/pwa.ts#L59-L64) | `display-mode: standalone`이 `true`에서 `false`로 바뀔 때 `installed: true`가 해제되지 않아 이후 `beforeinstallprompt` 수신이 차단됨 → `installed: nextStandalone` 및 `canInstall` 갱신 제안 |
| **`B-F4`** | Track B | Low | [`src/components/PwaInstallPanel.tsx`](file:///home/antigravity/blue45f/pilate_flow/src/components/PwaInstallPanel.tsx#L12-L85) | 상단 설치 상태 배너와 하단 `<details>` 내부 `update-ready` 문구가 동시에 `role="status"`를 가져 복수의 라이브 리전이 충돌함 → 하단 정적 상세 설명 내 중복 `role="status"` 제거 제안 |

---

## 4. 검증 한계 (Verification Limitations)

1. **실제 Apple Safari 및 실물 iOS/Android 기기 미실행 (`realSafariExecuted: false`)**:
   - Linux(Debian 12) 환경에서 수행되었으므로 실제 iOS/iPadOS/macOS Safari(WebKit) 및 실물 모바일 기기에서의 홈 화면 추가(A2HS) OS 시트, WebAPK 생성, Safari–홈 화면 앱 간 스토리지 분리 및 OS 스토리지 축출 정책은 실물 기기에서 실행되지 않았습니다.
2. **운영 도메인 Firebase Auth 네트워크 세션 미포함**:
   - 로컬 루프백(`127.0.0.1`)에서는 [`src/lib/firebaseSession.ts`](file:///home/antigravity/blue45f/pilate_flow/src/lib/firebaseSession.ts#L14-L63)가 `/__/firebase/init.json` 호출을 생략하므로, 계정 전환 시 로컬 슬롯 보존은 `syncAccountWorkspace()` 직접 호출로 검증했습니다.

---

## 5. 통합 실행 및 재현 명령어

```bash
# 1. 2트랙 병렬 오케스트레이터 실행 (Track A + Track B 동시 실행 및 Read-Only 무결성 검증)
node scripts/pwa-audit-20261107/run-pwa-audit-20261107.mjs

# 2. Track A + Track B Vitest 스위트 일괄 실행 (35 tests)
pnpm exec vitest run scripts/pwa-audit-20261107/

# 3. ESLint 정적 검사 (신규 스크립트/테스트 오류·경고 0건 확인)
pnpm exec eslint scripts/pwa-audit-20261107/ --max-warnings=0
```
