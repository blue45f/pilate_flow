# R3-01 최소 수정 및 오프라인 새로진입 회귀 검증 보고서 (2026-11-07)

## 1. 소유 확인 및 변경 범위
- **작업 전 `origin/main` 기준 SHA**: `a793e5427897e136daab154684443b33a40221bd` (`a793e54`)
- **활성 브랜치 및 파일 소유 충돌 점검**:
  - 로컬 및 원격에 `main` 외 활성 작업 브랜치/워크트리 `0`개, [`scripts/pwa-build.ts`](file:///home/antigravity/blue45f/pilate_flow/scripts/pwa-build.ts) 및 [`src/test/pwaServiceWorker.test.ts`](file:///home/antigravity/blue45f/pilate_flow/src/test/pwaServiceWorker.test.ts)에 대한 소유 충돌 `0`건 확인 후 독립 브랜치 `fix/r3-01-pwa-navigate-query-offline-20261107`에서 작업 수행.
- **엄격한 파일 소유 준수**:
  1. [`scripts/pwa-build.ts`](file:///home/antigravity/blue45f/pilate_flow/scripts/pwa-build.ts): 쿼리스트링 포함 루트 `navigate` 요청의 오프라인 `/index.html` 폴백 허용 (인증 콜백 쿼리 및 비-navigation/API 쿼리 캐시 우회 정책은 그대로 유지)
  2. [`src/test/pwaServiceWorker.test.ts`](file:///home/antigravity/blue45f/pilate_flow/src/test/pwaServiceWorker.test.ts): `R3-01` 직접 회귀 단위 테스트 추가 (`24 passed`)
  3. [`docs/r3-01-pwa-navigate-query-offline-20261107/README.md`](file:///home/antigravity/blue45f/pilate_flow/docs/r3-01-pwa-navigate-query-offline-20261107/README.md) 및 [`docs/r3-01-pwa-navigate-query-offline-20261107/evidence.json`](file:///home/antigravity/blue45f/pilate_flow/docs/r3-01-pwa-navigate-query-offline-20261107/evidence.json): 전용 검증 증적 문서
- **금지 사항 준수**:
  - CSS / Safari `backdrop-filter` 블러(`R3-02`) 수정 **0건**
  - 실제 사용자 데이터 및 운영 서비스워커 변경 **0건** (격리 프로필 `/tmp/pilates-r3-01-isolated-*` 및 합성 데이터만 사용)
  - 운영 배포(`firebase deploy`) 미실행
  - **Safari / WebKit 런타임 실행 판정**: **`UNVERIFIED (미검증)`** (Linux Debian 12 컨테이너 내 WebKit 런타임 부재로 Chromium 결과를 Safari PASS로 간주하지 않음)

---

## 2. 최소 수정 내용 ([`scripts/pwa-build.ts`](file:///home/antigravity/blue45f/pilate_flow/scripts/pwa-build.ts))

- **기존 동작 (결함 `R3-01`)**:
  - `if (request.method !== 'GET' || url.origin !== self.location.origin || url.search) return;` 조건이 `request.mode === 'navigate'` 분기보다 먼저 실행되어, 오프라인 상태에서 `/?utm_source=pwa` 또는 `/?q=...` 등 쿼리스트링이 포함된 루트 내비게이션 진입 시 서비스워커가 조기 반환하여 오프라인 앱 셸(`/index.html`) 폴백이 동작하지 않았습니다.
- **최소 수정**:
  - 루트(`/` 또는 `/index.html`) `request.mode === 'navigate'` 요청은 인증 콜백 파라미터(`code`, `state`, `oobCode`, `apiKey`)가 아닌 한 온라인 시 원본 요청(`fetch(request)`)을 그대로 전달(응답 비캐시)하고, 오프라인 실패 시에만 프리캐시된 `/index.html`로 폴백하도록 수정했습니다.
  - `if (url.search || !ASSETS.includes(url.pathname) || url.pathname === '/index.html') return;` 조건을 `navigate` 블록 직후에 유지하여 **쿼리스트링이 있는 모든 비-navigation(`cors`/`no-cors`/API/정적 자산) 요청은 기존과 동일하게 서비스워커가 절대 가로채거나 캐시하지 않도록 유지**했습니다.

---

## 3. 격리 프로필 합성 데이터 기반 오프라인 새로진입 비교 검증

임시 격리 프로필에서 합성 수업안 `[합성-R3-01] 쿼리스트링 오프라인 새로진입 비교 검증`(매트 동작 2개 + 중간 휴식 1개 = 총 3스텝)을 생성·저장한 뒤, 로컬 정적 서버 소켓 즉시 차단(`setOffline(true)`) + CDP `Network.emulateNetworkConditions({ offline: true })` 이중 오프라인 상태에서 3가지 루트 경로로 각각 `Page.navigate`(새로진입)하여 비교했습니다.

### 3.1 오프라인 전환 전 기준 상태 (Baseline)
- **수업안 제목**: `[합성-R3-01] 쿼리스트링 오프라인 새로진입 비교 검증`
- **스텝 수 및 ID 배열**: `3`개 (`["step-add-1794040456546-cuqe70", "step-add-1794040456580-mkvxfs", "rest-1794040456670-89u4rm"]`)
- **저장 목록 (`savedSequences`, 총 4개)**:
  1. `[합성-R3-01] 쿼리스트링 오프라인 새로진입 비교 검증`
  2. `리포머 Lv 1.5 전신 밸런스 & 힙업 시그니처 50분`
  3. `리포머+소도구 Lv 1.0 체형교정 & 속근육 정렬 50분`
  4. `리포머 & 체어 Lv 2.0 주말 불타는 코어·힙 스컬프 50분`
- **`localStorage['pilates-flow-atelier-storage-v3']` 크기 및 SHA-256**:
  - `113,993` bytes / `7778090659956f79e99af37d30e43ed2bc2ec50cc895e2c32b2b979f4634b713`

### 3.2 오프라인 새로진입 3경로 비교 결과
| 검증 경로 | 요청 URL | 진입 후 `location.search` | `navigator.onLine` | SW 컨트롤러 | 복원된 수업안 제목 | 스텝 수 / ID 일치 | `savedSequences` (4개) 일치 | 스토리지 바이트 / SHA-256 일치 | 판정 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| **일반 루트** | `/` | `""` | `false` | `true` | `[합성-R3-01] 쿼리스트링 오프라인 새로진입 비교 검증` | `3`개 (`100% 일치`) | `4`개 (`100% 일치`) | `113,993`B (`100% 일치`) | **PASS** |
| **PWA 진입 쿼리** | `/?utm_source=pwa` | `"?utm_source=pwa"` | `false` | `true` | `[합성-R3-01] 쿼리스트링 오프라인 새로진입 비교 검증` | `3`개 (`100% 일치`) | `4`개 (`100% 일치`) | `113,993`B (`100% 일치`) | **PASS** |
| **기존 검색 조건 쿼리** | `/?q=%ED%97%8C%EB%93%9C%EB%A0%88%EB%93%9C&apparatus=mat` | `"?q=%ED%97%8C%EB%93%9C%EB%A0%88%EB%93%9C&apparatus=mat"` | `false` | `true` | `[합성-R3-01] 쿼리스트링 오프라인 새로진입 비교 검증` | `3`개 (`100% 일치`) | `4`개 (`100% 일치`) | `113,993`B (`100% 일치`) | **PASS** |

### 3.3 쿼리스트링 포함 비-navigation / API 요청 캐시 비개입 검증
오프라인 상태에서 `mode: 'cors'`(비-navigation)로 호출한 쿼리스트링 요청들이 서비스워커의 `/index.html` 폴백이나 정적 캐시에 의해 가로채이지 않고 기존 정책대로 우회되는지 확인했습니다:
- `fetch('/?utm_source=pwa', { mode: 'cors' })` → `bypassedAsExpected: true` (`TypeError: Failed to fetch`)
- `fetch('/index.html?utm_source=pwa', { mode: 'cors' })` → `bypassedAsExpected: true` (`TypeError: Failed to fetch`)
- `fetch('/api/session?utm_source=pwa', { mode: 'cors' })` → `bypassedAsExpected: true` (`TypeError: Failed to fetch`)
- `fetch('/icons/app-192.png?v=1', { mode: 'cors' })` → `bypassedAsExpected: true` (`TypeError: Failed to fetch`)
- 인증 콜백 내비게이션(`/?code=secret&state=match`, `/?oobCode=private`) → 단위 테스트([`src/test/pwaServiceWorker.test.ts`](file:///home/antigravity/blue45f/pilate_flow/src/test/pwaServiceWorker.test.ts))에서 미가로채기(`not.toHaveBeenCalled()`) 검증 통과 (`24/24 tests passed`).
