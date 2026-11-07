# Track A 감사 보고서 — 매니페스트 / 서비스 워커 / 캐시 버전 업데이트, 오프라인 재방문 및 합성 수업 데이터(Synthetic Lesson Data) 보존 검증

- **감사 일자**: 2026-11-07 (UTC)
- **감사 트랙**: Track A (Manifest / Service-Worker / Cache Version Update, Offline Revisit & Existing Lesson Data Preservation)
- **대상 애플리케이션**: Flow Atelier · 필라테스 수업 플래너 (`pilate_flow`)
- **검증 스크립트 및 테스트 위치**:
  - 합성 수업 데이터 픽스처 및 무결성 다이제스트 도구: [`synthetic-lesson-fixtures.ts`](file:///home/antigravity/blue45f/pilate_flow/scripts/pwa-audit-20261107/track-a/synthetic-lesson-fixtures.ts)
  - Vitest 단위·통합 검증 스위트: [`track-a-sw-cache-data-preservation.test.ts`](file:///home/antigravity/blue45f/pilate_flow/scripts/pwa-audit-20261107/track-a/track-a-sw-cache-data-preservation.test.ts)
  - 자동화 감사 실행기 (Vitest + 격리된 Headless Chromium CDP E2E): [`run-track-a-audit.mjs`](file:///home/antigravity/blue45f/pilate_flow/scripts/pwa-audit-20261107/track-a/run-track-a-audit.mjs)
  - 구조화된 실행 증거 리포트: [`track-a-results.json`](file:///home/antigravity/blue45f/pilate_flow/docs/pwa-audit-20261107/track-a/track-a-results.json)

---

## 1. 검증 개요 및 실행 결과 요약

Track A 감사는 프로덕션 빌드 산출물(`dist/`)과 원본 소스(`public/site.webmanifest`, `scripts/pwa-build.ts`, `src/lib/pwa.ts`, `src/store/usePilatesStore.ts`, `src/lib/recoveryStorageGuard.ts`, `src/lib/accountStorage.ts`)을 일체 수정하지 않는 **읽기 전용(Read-Only) 원칙**과 **임시 브라우저 프로필 완전 격리(`os.tmpdir()/pwa-track-a-*`) 및 종료 후 즉시 삭제 원칙** 아래 수행되었습니다.

### 1.1 Vitest 스위트 실행 결과 (`7 / 7 PASS`)

| 테스트 번호 | 검증 항목 | 결과 |
| :--- | :--- | :---: |
| **Test 1** | `public/site.webmanifest` 및 `dist/site.webmanifest` 계약(`id`, `scope`, `start_url`, `display: 'standalone'`), PNG 아이콘(`192x192`, `512x512`, `maskable 512x512`, `apple-touch-icon.png`) 시그니처(`89504e470d0a1a0a`)·IHDR 픽셀 규격, `pwaBuild()`의 16자리 결정론적 SHA-256 캐시 버전(`bad4e3f640aa9380`) 및 `dist/assets/*` 누락·중복 여부 검증 | **PASS** |
| **Test 2** | `node:vm` 하네스 기반 서비스 워커 버전 업데이트 수명주기(`v1 -> v2 -> v3`) 검증: `skipWaiting()`·`clients.claim()` 미호출 보장, `v1` 활성 중 `v2` 병렬 캐시 적재(`flow-atelier-shell-<v2>`), `v2` 활성화 시 구버전 `flow-atelier-shell-<v1>`만 선택 삭제하고 비-쉘 캐시(`user-custom-cache`, `workbox-other`) 보존 | **PASS** |
| **Test 3** | 오프라인 탐색(`mode: 'navigate'`) 시 캐시된 `/index.html` 폴백, Firebase Hosting `cleanUrls` 리다이렉트 응답(`cached.redirected === true`) 무해화(`new Response(cached.body, ...)`로 상태/헤더 보존 및 `redirected: false` 복원), 캐시 미존재 시 Fail-Closed(`Response.error()`), `/__/auth/*`·`/api/*`·쿼리스트링(`?code=`, `?oobCode=`)·`POST`·교차 출처(Cross-Origin) 요청 엄격 우회 검증 | **PASS** |
| **Test 4** | 합성 필라테스 수업 데이터셋(7개 `localStorage` 키) 주입 후 `usePilatesStore` 하이드레이션, `syncAccountWorkspace`, `createRecoveryStorageGuard`, `inspectBackupRecovery` 연동 및 전체 SW 수명주기(`v1` 설치 → 오프라인 재방문 → `v2` 대기 업데이트 → `v2` 활성화 → 오프라인 재방문) 전 구간 **0바이트 손실 / SHA-256 다이제스트 100% 일치** 검증 | **PASS** |
| **Test 5 (`A-F1` ~ `A-F3`)** | 감사에서 식별된 3건의 구체적 회귀 위험/결함(`A-F1`, `A-F2`, `A-F3`) 재현 및 현재 동작 특성화 검증 | **PASS** |

### 1.2 실제 독립 Headless Chromium CDP E2E 검증 결과 (`5 / 5 단계 PASS`)

Node 24 내장 `WebSocket`을 통해 임시 프로필(`--user-data-dir=/tmp/pwa-track-a-...`)로 기동된 `/usr/bin/chromium`(Chromium 156 Headless)에 직접 연결하여 5단계 수명주기를 실측 검증했습니다.

1. **Phase 1 (초기 로드, SW `v1` 등록/활성화 및 합성 수업 데이터 시딩 후 재로드)**:
   - `flow-atelier-shell-bad4e3f640aa9380` 캐시에 총 **40개 정적 자산**(`/index.html`, `/icons/app-192.png`, `/icons/app-512.png`, 37개 JS/CSS 번들)이 적재됨을 `caches.open().keys()`로 확인.
   - 7개 `localStorage` 슬롯 시딩 후 재로드 시 워크벤치 UI에 50분 리포머 중급 수업 초안이 정상 렌더링되며, 정규화 SHA-256 다이제스트가 기준값(`baselineDigest.overallSha256`)과 **100% 일치**함을 확인.
2. **Phase 2 (`v1` 컨트롤러 하에서 오프라인 전환 및 오프라인 새로고침 재방문)**:
   - `Network.emulateNetworkConditions({ offline: true, latency: 0, downloadThroughput: 0, uploadThroughput: 0 })` 적용 후 페이지 새로고침.
   - `navigator.onLine === false` 상태에서 캐시된 앱 쉘과 JS/CSS 에셋만으로 `Flow Atelier · 필라테스 수업 플래너` 타이틀과 `#root` DOM이 완전 렌더링되고, 7개 `localStorage` 키의 SHA-256 다이제스트가 오프라인 전환 전과 **100% 일치(0바이트 손실)**함을 확인.
3. **Phase 3 (온라인 복귀 후 서버 `/sw.js`를 `v2audit`으로 전환 및 `registration.update()` 수행)**:
   - 신규 워커(`flow-atelier-shell-v2audit`)가 설치되어 `reg.waiting.state === 'installed'`로 진입하는 동안, 기존 `v1` 워커(`reg.active.state === 'activated'`)가 페이지 제어권을 유지함.
   - Chromium `caches.keys()`에 `flow-atelier-shell-bad4e3f640aa9380`과 `flow-atelier-shell-v2audit` 두 캐시가 병렬 공존하며, 열린 수업 탭의 인메모리 마커(`window.__trackAOpenLessonMarker`)가 강제 리로드 없이 그대로 유지됨. 합성 수업 데이터 SHA-256 다이제스트 **100% 일치**.
4. **Phase 4 (`about:blank` 이동으로 기존 탭 해제 후 재접속하여 `v2` 활성화 검증)**:
   - 재접속 시 `v2` 워커가 `activated` 상태로 승격(`reg.waiting === null`)되고, `activate` 이벤트 핸들러에 의해 구버전 캐시 `flow-atelier-shell-bad4e3f640aa9380`이 삭제되어 `caches.keys()`에 `['flow-atelier-shell-v2audit']`만 남음을 확인. 합성 수업 데이터 SHA-256 다이제스트 **100% 일치**.
5. **Phase 5 (`v2` 활성화 이후 오프라인 재방문 검증)**:
   - 다시 오프라인 모드로 전환 후 새로고침해도 `v2` 캐시(`flow-atelier-shell-v2audit`)로부터 앱이 정상 렌더링되며, 7개 `localStorage` 슬롯 데이터가 **100% 보존**됨을 최종 확인.

---

## 2. 합성 수업 데이터(Synthetic Lesson Data) 구성 및 보존 검증 범위

[`synthetic-lesson-fixtures.ts`](file:///home/antigravity/blue45f/pilate_flow/scripts/pwa-audit-20261107/track-a/synthetic-lesson-fixtures.ts)는 실제 강사의 수업 설계·운영·기록·일정·계정 분리·복구 롤백 시나리오를 포괄하는 합성 데이터셋을 생성합니다.

### 2.1 도메인 데이터 구성

- **현재 편집 중인 50분 리포머 중급 수업 초안 (`activeSequenceId: 'seq-track-a-active-50m'`)**:
  - 기구/난이도/목표 시간: `activeApparatus: 'reformer'`, `activeLevel: '1.5'`(도메인 스키마의 중급 난이도), `activeTargetMinutes: 50`, `activeTargetGroupId: 'group-track-a-reformer-int'`
  - 총 10개 스텝(`activeSteps`, 운동 48분 + 휴식 2분 = 정확히 50분):
    - `practiceOptions`: `repetitions`, `sets`, `sideMode`(`'together'`, `'left-then-right'`)
    - `timingOptions`: `durationMin`, `explanationSec`, `transitionSec`, `customSpringOverride`, `timeEstimate`(`version: 1` 상세 호흡·세트·전환 추정치)
    - `blockOptions`: `classSection`(`'preparation'`, `'main'`, `'cooldown'`), `selectedLayer`, `instructorNote`, `locked`, 재사용 블록 메타데이터(`blockInstanceId`, `sourceBlockId`, `sourceBlockVersion`, `sourceBlockTitle`, `blockInstanceDetached`), 강사 창작 동작 연결(`humanDraftId`, `humanDraftRevision`), 휴식 스텝(`kind: 'rest'`, `exerciseId: ''`, 2분)
- **커스텀 동작 및 강사 창작 동작 초안 (`exercises`)**:
  - 기본 카탈로그(`INITIAL_EXERCISES`) 전체 + 커스텀 동작 2종 병합:
    1. `custom-track-a-reformer-lunge-pulse`: 리포머 하체 단측성 이브즈 런지 & 고관절 신전 펄스 (`isCustom: true`)
    2. `human-draft-track-a-thoracic-spiral`: 강사 창작 흉추 스파이럴 스트랩 오프너 (`sourceOrigin: 'human-created'`, `humanDraftId: 'hdraft-track-a-01'`, `humanDraftRevision: 2`, `ideaLineSnapshot`, `feelLogsSnapshot`, `modificationLogsSnapshot`, 인라인 SVG `photoReferencesSnapshot`, `safetyBoundarySnapshot` 포함)
- **저장된 시퀀스 (`savedSequences`, 2건)**:
  - 정기 그룹반 50분 리포머 시퀀스(`seq-track-a-saved-reformer-50`, `criteriaSnapshot` 포함)
  - 레거시 작업공간 초안 복원 출처(`recoveredDraftOrigin: { format: 'persisted-workspace-v3', ... }`)를 포함한 프라이빗 재활 50분 시퀀스(`seq-track-a-saved-recovered-draft`)
- **수업 대상 그룹 프로필 (`classGroups`)**:
  - `group-track-a-reformer-int`(그룹반, `planningPreferences.conditions` 포함), `group-track-a-private-rehab`(1:1 프라이빗) 및 기본 그룹 목록
- **인라인 스냅샷이 포함된 수업 완료 기록 (`historyLogs`)**:
  - [`buildTeachingProgramSnapshot`](file:///home/antigravity/blue45f/pilate_flow/src/utils/teachingHistorySnapshot.ts#L573-L750)으로 생성된 불변 `programSnapshot`(`snapshotVersion: 1`, `recordKind: 'completed-history'`, `exercisesById`, `items`, `timing`, `completionFingerprint`) 및 `stepsSnapshot`, `criteriaSnapshot`을 포함한 완료 기록(`log-track-a-completed-01`)
- **수업 조건 템플릿 (`conditionTemplates`, 2건)**, **강사 일정 (`instructorSchedule`: 장소 1곳, 정기/단발 수업 2건, 보강 이동 예외 `reschedule` 1건)**, **개인 학습 상태 (`instructorStudyState`: 북마크 4건, 리허설 큐 표시 상태, 완료 튜토리얼 과제 3건)**, **날짜별 수업 계획 (`datedSequencePlanning`: `prepared`/`draft` 배정 2건 및 `priorVersions` 이력 포함)**, **보유 기구 및 소도구 (`ownedEquipment`, `ownedApparatus`, `ownedProps`)**.

### 2.2 검증된 `localStorage` 키 (총 7개 슬롯)

| 키 이름 | 용도 | 보존 결과 |
| :--- | :--- | :---: |
| `pilates-flow-atelier-storage-v3` | Zustand 메인 작업공간 영속화 엔벨로프 (`RECOVERY_STORAGE_KEY`) | **100% 보존 (0B 손실)** |
| `pilates-flow-atelier-storage-v3:guest` | 비로그인 게스트 슬롯 스냅샷 (`GUEST_STORAGE_KEY`) | **100% 보존 (0B 손실)** |
| `pilates-flow-atelier-storage-v3:account:instructor-track-a` | 강사 계정 전용 작업공간 슬롯 (`ACCOUNT_STORAGE_PREFIX + uid`) | **100% 보존 (0B 손실)** |
| `pilates-flow-atelier-storage-v3:active-owner` | 현재 탭의 활성 계정 식별자 (`ACTIVE_OWNER_KEY`) | **100% 보존 (0B 손실)** |
| `pilates-flow-atelier-storage-v3:known-accounts` | 브라우저에 등록된 계정 목록 인덱스 (`KNOWN_ACCOUNTS_KEY`) | **100% 보존 (0B 손실)** |
| `pilates-flow-atelier-storage-v3:preserved:snapshot-1` | 계정/탭 전환 시 자동 백업된 보존 스냅샷 (`PRESERVED_STORAGE_PREFIX`) | **100% 보존 (0B 손실)** |
| `pilates-flow-backup-rollback-v1` | 백업 복원 직전 상태로 되돌리기 위한 롤백 포인트 (`BACKUP_ROLLBACK_STORAGE_KEY`) | **100% 보존 (0B 손실)** |

---

## 3. 발견된 회귀 위험 및 결함 (`A-F1` ~ `A-F3`)

감사 결과 수업 데이터 유실이나 스키마 손상을 유발하는 치명적 결함은 없었으나, 서비스 워커 자산 프리캐시 범위, 대기 중 업데이트 시 온라인 탐색 전략, 최초 설치 상태 표시 로직에서 아래 3건의 구체적 결함/회귀 위험이 확인되었습니다.

---

### [A-F1] 보조 PWA 정적 자산 4종(`site.webmanifest`, `favicon.svg`, `apple-touch-icon.png`, `app-maskable-512.png`)의 프리캐시(`ASSETS`) 및 버전 해시 입력 누락 (심각도: Low)

- **관련 파일**:
  - [`scripts/pwa-build.ts`](file:///home/antigravity/blue45f/pilate_flow/scripts/pwa-build.ts#L18-L42)
  - [`dist/sw.js`](file:///home/antigravity/blue45f/pilate_flow/dist/sw.js#L4-L33)
- **현상 및 원인**:
  1. `serviceWorkerSource(version, files)`가 생성하는 `ASSETS` 배열에는 `'/index.html'`, `'/icons/app-192.png'`, `'/icons/app-512.png'`와 `dist/assets/*.{js,css}`만 포함되며, `index.html` 및 매니페스트가 참조하는 `/site.webmanifest`, `/favicon.svg`, `/icons/apple-touch-icon.png`, `/icons/app-maskable-512.png` 4개 파일은 누락되어 있습니다.
  2. 또한 `pwaBuild()`의 SHA-256 버전 해시 계산 입력에도 위 4개 파일의 바이트가 포함되지 않아, 해당 파일만 단독 수정될 경우 서비스 워커 캐시 버전(`CACHE`)이 변경되지 않습니다.
- **재현 단계 (Reproduction Steps)**:
  1. [`track-a-sw-cache-data-preservation.test.ts`](file:///home/antigravity/blue45f/pilate_flow/scripts/pwa-audit-20261107/track-a/track-a-sw-cache-data-preservation.test.ts)의 `Finding A-F1` 테스트 실행.
  2. 서비스 워커 설치·활성화 후 오프라인 상태에서 `/site.webmanifest`, `/favicon.svg`, `/icons/apple-touch-icon.png`, `/icons/app-maskable-512.png`에 대해 `fetch` 이벤트를 발생시키면 `ASSETS.includes(url.pathname)`가 `false`가 되어 서비스 워커가 요청을 가로채지 않고 네트워크 실패로 이어짐을 확인.
- **최소 수정 제안 (Minimal Fix Proposal)**:

```diff
--- a/scripts/pwa-build.ts
+++ b/scripts/pwa-build.ts
@@ -20,6 +20,10 @@ export function pwaBuild(): Plugin {
           .update(html?.type === 'asset' ? html.source : '')
+          .update(readFileSync('public/site.webmanifest'))
+          .update(readFileSync('public/favicon.svg'))
           .update(readFileSync('public/icons/app-192.png'))
           .update(readFileSync('public/icons/app-512.png'))
+          .update(readFileSync('public/icons/app-maskable-512.png'))
+          .update(readFileSync('public/icons/apple-touch-icon.png'))
           .update(serviceWorkerSource.toString())
           .digest('hex')
           .slice(0, 16);
@@ -35,8 +39,12 @@ export function pwaBuild(): Plugin {
 export function serviceWorkerSource(version: string, files: string[]) {
   const assets = [
     '/index.html',
+    '/site.webmanifest',
+    '/favicon.svg',
     '/icons/app-192.png',
     '/icons/app-512.png',
+    '/icons/app-maskable-512.png',
+    '/icons/apple-touch-icon.png',
     ...files.map((file) => `/${file}`),
   ];
```

---

### [A-F2] 신규 서비스 워커(`v2`)가 대기(`waiting`) 중일 때 온라인 루트 탐색(`/`) 시 신규 `v2` HTML과 기존 활성 `v1` SW 컨트롤러 간 버전 불일치 위험 (심각도: Medium)

- **관련 파일**:
  - [`scripts/pwa-build.ts`](file:///home/antigravity/blue45f/pilate_flow/scripts/pwa-build.ts#L5-L76)
  - [`dist/sw.js`](file:///home/antigravity/blue45f/pilate_flow/dist/sw.js#L18-L33)
- **현상 및 원인**:
  1. `scripts/pwa-build.ts` 상단 주석은 `/* A build-scoped cache: never mix a new HTML document with an old JS graph. */`라고 명시하고 있으며, 진행 중인 수업을 보호하기 위해 `skipWaiting()`을 사용하지 않습니다.
  2. 그러나 `fetch` 핸들러의 루트 문서 탐색(`request.mode === 'navigate'`)은 무조건 네트워크 우선(`fetch(request).catch(...)`)으로 동작합니다.
  3. 다른 탭이 열려 있어 신규 `v2` 서비스 워커가 `waiting` 상태에 머무는 동안 사용자가 온라인 상태에서 탭을 새로고침(`/`)하면, 여전히 활성 컨트롤러인 `v1` 서비스 워커가 네트워크에서 **`v2`의 `index.html`**(신규 해시 청크 `/assets/index-<v2>.js` 참조)을 받아옵니다.
  4. 이후 사용자가 모든 탭을 닫아 `v2`를 활성화하기 전에 오프라인 상태(예: 스튜디오 지하 강의실 이동)로 전환되어 지연 로딩 청크(예: `LiveStageView-<v2>.js`)를 요청하거나 새로고침하면, 활성 컨트롤러인 `v1`의 `ASSETS` 배열에는 `<v2>` 청크 경로가 없으므로 `v1` 캐시에서도 찾지 못하고 `v2` 캐시(`flow-atelier-shell-<v2>`)도 조회하지 않아 오프라인 로딩이 실패합니다.
- **재현 단계 (Reproduction Steps)**:
  1. [`track-a-sw-cache-data-preservation.test.ts`](file:///home/antigravity/blue45f/pilate_flow/scripts/pwa-audit-20261107/track-a/track-a-sw-cache-data-preservation.test.ts)의 `Finding A-F2` 테스트 실행.
  2. `v1` SW가 활성화된 상태에서 `v2` SW가 설치(`waiting`)된 후, 온라인 탐색(`/`) 시 `v1` SW가 네트워크의 `v2` HTML(`/assets/index-v2.js` 포함)을 반환하고, 이어서 `/assets/index-v2.js` 요청 시 `v1` SW가 `ASSETS` 불일치로 요청을 가로채지 않음(`intercepted: false`)을 확인.
- **최소 수정 제안 (Minimal Fix Proposal)**:
  - 활성 서비스 워커는 자신의 빌드 스코프(`CACHE`)에 이미 캐시된 `/index.html`을 우선 제공하여 활성 컨트롤러의 `ASSETS` 그래프와 HTML 문서의 버전을 항상 일치시키거나, 오프라인 정적 에셋 조회 시 현재 `CACHE`에 없으면 동일 프리픽스(`flow-atelier-shell-*`) 캐시에서 폴백 조회하도록 보완할 수 있습니다.

```diff
--- a/scripts/pwa-build.ts
+++ b/scripts/pwa-build.ts
@@ -58,19 +58,16 @@ self.addEventListener('fetch', (event) => {
   if (request.method !== 'GET' || url.origin !== self.location.origin || url.search) return;
   // Navigations outside the app root (including /__/auth/*) are never intercepted.
   if (request.mode === 'navigate' && (url.pathname === '/' || url.pathname === '/index.html')) {
-    event.respondWith(fetch(request).catch(async () => {
+    event.respondWith((async () => {
       const cache = await caches.open(CACHE);
       const cached = await cache.match('/index.html');
-      if (!cached) return Response.error();
-      // Hosting cleanUrls may redirect /index.html to /. A navigation with
-      // redirect: manual cannot use that redirected response in respondWith.
-      // Copy only the cached document response, preserving body/status/headers.
-      return cached.redirected
-        ? new Response(cached.body, { status: cached.status, statusText: cached.statusText, headers: cached.headers })
-        : cached;
-    }));
+      if (cached) {
+        return cached.redirected
+          ? new Response(cached.body, { status: cached.status, statusText: cached.statusText, headers: cached.headers })
+          : cached;
+      }
+      return fetch(request).catch(() => Response.error());
+    })());
     return;
   }
```

---

### [A-F3] 최초 서비스 워커 설치 중 워커가 `installed`(`registration.waiting`) 단계를 거칠 때 `offlineStatus`가 일시적으로 `'update-ready'`로 보고됨 (심각도: Low)

- **관련 파일**:
  - [`src/lib/pwa.ts`](file:///home/antigravity/blue45f/pilate_flow/src/lib/pwa.ts#L79-L86)
- **현상 및 원인**:
  - [`src/lib/pwa.ts`](file:///home/antigravity/blue45f/pilate_flow/src/lib/pwa.ts#L79-L86)의 `update()` 함수는 다음과 같이 작성되어 있습니다:
    ```ts
    const update = () =>
      publish({
        offlineStatus: registration.waiting
          ? 'update-ready'
          : registration.active
            ? 'ready'
            : 'preparing',
      });
    ```
  - 브라우저 표준 Service Worker 수명주기에서 최초 설치 시(`registration.active === null`), `installing` 워커가 프리캐시를 마치면 `worker.state`가 `'installed'`로 바뀌면서 활성화 직전까지 잠시 `registration.waiting` 슬롯에 배치됩니다.
  - 이때 기존 `registration.active`가 전혀 없음에도 `registration.waiting`이 존재한다는 이유만으로 `offlineStatus`가 `'preparing'`에서 `'update-ready'`("새 버전 준비됨")로 잘못 전환되었다가 `'activating'` 진입 후 `'ready'`가 됩니다.
- **재현 단계 (Reproduction Steps)**:
  1. [`track-a-sw-cache-data-preservation.test.ts`](file:///home/antigravity/blue45f/pilate_flow/scripts/pwa-audit-20261107/track-a/track-a-sw-cache-data-preservation.test.ts)의 `Finding A-F3` 테스트 실행.
  2. `registration.active = null`, `registration.installing = worker` 상태에서 `startPwa()` 호출 후, `worker.state = 'installed'` 및 `registration.waiting = worker`로 전환하고 `statechange` 이벤트를 디스패치하면 `getPwaState().offlineStatus`가 `'update-ready'`를 반환함을 확인.
- **최소 수정 제안 (Minimal Fix Proposal)**:
  - 기존 활성 워커(`registration.active`)가 존재하는 상태에서 대기 워커(`registration.waiting`)가 있을 때만 `'update-ready'`로 판정하도록 조건을 명확히 합니다.

```diff
--- a/src/lib/pwa.ts
+++ b/src/lib/pwa.ts
@@ -78,7 +78,7 @@ export function startPwa({ registerServiceWorker = true } = {}) {
     .then((registration) => {
       const update = () =>
         publish({
-          offlineStatus: registration.waiting
+          offlineStatus: registration.waiting && registration.active
             ? 'update-ready'
             : registration.active
               ? 'ready'
```

---

## 4. 검증 한계 (Verification Limitations)

1. **로컬 루프백(`127.0.0.1`) 환경에서의 Firebase Auth 부트스트랩 경계**:
   - [`src/lib/firebaseSession.ts`](file:///home/antigravity/blue45f/pilate_flow/src/lib/firebaseSession.ts#L14-L63)는 보안 경계상 운영 호스트(`https://pilates-flow-atelier.web.app`)가 아닌 로컬 주소(`http://127.0.0.1:<port>`)에서는 `/__/firebase/init.json` 네트워크 호출을 생략하고 즉시 `phase: 'unavailable'`로 전환합니다. 따라서 실제 운영 도메인에서의 Google OAuth 팝업/세션 토큰 갱신 흐름은 로컬 오프라인 감사 범위에서 제외되었으며, 대신 `syncAccountWorkspace()` 및 계정 슬롯 보존 로직은 Vitest에서 직접 호출하여 검증했습니다.
2. **iOS/iPadOS WebKit 실제 기기 홈 화면 추가(A2HS) 및 스토리지 축출 정책**:
   - 본 감사는 Linux(Debian 12) 환경의 Headless Chromium 156(Blink 엔진) 및 JSDOM/VM 하네스에서 수행되었으므로, 실제 iOS Safari 기기에서의 홈 화면 웹앱(Standalone) 실행 및 OS 수준의 장기 미사용 ITP 스토리지 정책은 포함하지 않습니다.

---

## 5. 재현 명령어 (Reproduction Commands)

```bash
# 1. Track A Vitest 단위·통합 스위트 단독 실행
pnpm exec vitest run scripts/pwa-audit-20261107/track-a/track-a-sw-cache-data-preservation.test.ts

# 2. Track A 전체 감사 파이프라인 실행 (Vitest + 격리된 Headless Chromium CDP E2E + JSON 리포트 생성)
node scripts/pwa-audit-20261107/track-a/run-track-a-audit.mjs

# 3. Track A 코드 정적 분석 (ESLint)
pnpm lint
```
