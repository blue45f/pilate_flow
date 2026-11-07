# 배포 전 잔여 위험 독립 검증 — 통합 Round 3 (2026-11-07)

## 1. 검증 목적 및 소유 경계
- **대상 저장소**: `blue45f/pilate_flow` (`origin/main`)
- **검증 초점 (Round 2 전체 E2E 반복 제외, 잔여 위험 집중 검증)**:
  1. 통합 Round 2(`0d5e054`) 이후 완료된 **새 도해 구현(`55ce22d`) 및 `main` 병합(`b2d6022`)**이 현재 `origin/main`에 실제 포함되는지 Git ancestry(`git merge-base --is-ancestor`)로 검증
  2. **Safari / WebKit 실행 가능 여부** 정확 판정(WebKit 바이너리 부재 시 Chromium 결과를 Safari PASS로 간주하지 않고 `UNVERIFIED(미검증)`로 명시) 및 정적 iOS/macOS Safari 호환성 감사
  3. **PWA 설치 조건 · 서비스워커(`sw.js`) 프리캐시 · 완전 오프라인 재진입 시 기존 합성 수업안 보존** 독립 검증 (격리 프로필 및 합성 데이터만 사용)
  4. **새 도해 구현(`55ce22d` D-01~D-05) 포함 사용자 경로 재방문** (`ExerciseAtlasView` 패턴 도해 프리뷰, `YouTubeClipModal` 내 `MovementDiagramReference`(`참고 자세 그림` → `MovementPhaseDiagramSvg`), `SequencePlanPreview` 재진입/재방문 시 SVG 무결성 및 `320px`/`1440px` 레이아웃 검증)
- **파일 소유 및 제약 준수**:
  - 신규 생성 경로: `docs/integrated-release-readiness-round3-20261107/**`, `scripts/integrated-release-readiness-round3-20261107/**`
  - `src/**` 수정: **0건 (엄격 금지 준수)**
  - 기존 history-scale 감사·도해 감사 재구현 금지, 실제 사용자 데이터 및 운영 서비스워커 변경 금지, 자동 운영 배포(`firebase deploy`) 미실행

---

## 2. 최신 `origin/main` Git Ancestry 검증 (`55ce22d` / `b2d6022` 포함)

- 검증 기준 `origin/main` SHA: `b2d6022b8109ad74b01bca817a0788c49aa63cd2`
- Round 3 최종 머지 후 `origin/main` SHA: [`docs/integrated-release-readiness-round3-20261107/FINAL_SHA.md`](file:///home/antigravity/blue45f/pilate_flow/docs/integrated-release-readiness-round3-20261107/FINAL_SHA.md) 참조

| 단계 | 단축 SHA | 전체 SHA | 역할 / 커밋 제목 | `git merge-base --is-ancestor <SHA> origin/main` |
| --- | --- | --- | --- | --- |
| Round 1 | `c6acd66` | `c6acd66c353d1c5f126fc1b9eca4ffc076412a1e` | 설정 (`Merge branch 'feat/parallel-page-settings-20261107'`) | **PASS (`true`)** |
| Round 1 | `f3c093e` | `f3c093e942795a5e16e28abd62d510bcda876c84` | 통합 (`feat(settings): integrate PilatesSettingsPage...`) | **PASS (`true`)** |
| Round 1 | `f95b188` | `f95b188f70f0a7a4fcfdbadfb0ff2cc237a7733d` | 라이브러리 (`Merge branch 'feat/parallel-page-library-20261107'`) | **PASS (`true`)** |
| Round 1 | `4256230` | `42562302db99a89a0722c3fe033cfe84ea300f00` | 홈 (`Merge branch 'feat/parallel-page-home-20261107'`) | **PASS (`true`)** |
| Round 1 | `45839ff` | `45839ffadbad3dbac26238415e190ba0a8dde544` | 히스토리 (`Merge branch 'feat/parallel-page-history-20261107'`) | **PASS (`true`)** |
| Round 1 | `338f912` | `338f912a8ae2c07b501befd3e160c725ec40b559` | 빌더 (`Merge branch 'feat/parallel-page-builder-20261107'`) | **PASS (`true`)** |
| Round 2 | `0d5e054` | `0d5e0542923a8dcac7374dd339489957015d8a80` | 통합 사용자 동선 Round 2 증적 (`docs(journey): record final round 2 verification SHA`) | **PASS (`true`)** |
| **Post-R2 도해 구현** | **`55ce22d`** | `55ce22d30d19a9ed7a080f314f82f94ba10987fc` | **`fix(diagrams): apply minimal pose-apparatus contact fixes (D-01..D-05) and verify real app renderer`** | **PASS (`true`)** |
| **Post-R2 도해 병합** | **`b2d6022`** | `b2d6022b8109ad74b01bca817a0788c49aa63cd2` | **`Merge branch 'feat/apply-diagram-contact-fixes-20261107'`** | **PASS (`true`)** |

---

## 3. Safari / WebKit 실행 가능 여부 및 정적 호환성 감사

### 3.1 실제 WebKit 브라우저 런타임 실행 여부: **UNVERIFIED (미검증)**
- **환경 탐색 결과**:
  - 현재 실행 환경(Linux Debian 12 컨테이너)에서 `/usr/bin/safari`, `/usr/bin/MiniBrowser`, `/usr/bin/WebKitWebProcess`, `/usr/bin/epiphany`, `/usr/bin/midori`, `/usr/local/bin/webkit` 및 `~/.cache/ms-playwright/*webkit*` 존재 여부를 전수 탐색한 결과 **`webkitRuntimeAvailable: false`**로 확인되었습니다.
  - 설치된 브라우저는 `/usr/bin/chromium`(`google-chrome`)뿐이므로, **Chromium(Blink) 실행 결과를 Safari/WebKit PASS로 간주하지 않고 실제 Safari/WebKit 런타임 검증은 `UNVERIFIED(미검증)`로 정직하게 표기**합니다.

### 3.2 정적 Safari / iOS WebKit 호환성 감사 결과
| 점검 항목 | 대상 파일 | 확인 결과 | 판정 |
| --- | --- | --- | --- |
| iOS 노치/홈 인디케이터 뷰포트 | [`index.html`](file:///home/antigravity/blue45f/pilate_flow/index.html#L7) | `viewport-fit=cover` 설정 및 CSS `env(safe-area-inset-*)` 20곳 반영 | **PASS (정적 확인)** |
| iOS 홈 화면 웹앱 메타 및 아이콘 | [`index.html`](file:///home/antigravity/blue45f/pilate_flow/index.html#L10-L12), `public/icons/apple-touch-icon.png` | `apple-mobile-web-app-capable="yes"`, `180×180` 유효 PNG 시그니처(`89504e470d0a1a0a`) 확인 | **PASS (정적 확인)** |
| iOS Safari vs iOS 타 브라우저 설치 안내 | [`src/lib/pwa.ts`](file:///home/antigravity/blue45f/pilate_flow/src/lib/pwa.ts#L49-L58), [`src/components/PwaInstallPanel.tsx`](file:///home/antigravity/blue45f/pilate_flow/src/components/PwaInstallPanel.tsx#L44-L59) | `ios-safari`(공유 → 홈 화면에 추가)와 `ios-other`(Safari에서 열기 안내), `navigator.standalone` 감지 구현 | **PASS (코드/유닛 확인)** |
| iOS Safari ↔ 홈 화면 앱 저장소 분리 경고 | [`src/components/PwaInstallPanel.tsx`](file:///home/antigravity/blue45f/pilate_flow/src/components/PwaInstallPanel.tsx#L95-L97) | iPhone·iPad에서 Safari와 홈 화면 웹앱 간 `localStorage`가 분리됨을 명시하고 사전 전체 백업 안내 제공 | **PASS (코드 확인)** |
| CSS `backdrop-filter` WebKit 접두사 | `src/styles/*.css` (6곳) | `backdrop-filter: blur(...)` 6곳에 `-webkit-backdrop-filter` 미병기 (Safari < 18에서 블러 미적용, 배경 불투명도 폴백은 정상 동작) | **경미 잔여 위험 (`R3-02`)** |

---

## 4. PWA 설치 조건 · 서비스워커 캐시 · 오프라인 재진입 수업안 보존 검증

임시 격리 프로필(`mkdtempSync('/tmp/pilates-round3-isolated-*')`)과 제어형 로컬 정적 프로덕션 서버(`dist/`)에서 합성 데이터만으로 검증했습니다.

### 4.1 PWA 매니페스트 및 서비스워커(`sw.js`) 프리캐시 검증
- **매니페스트(`dist/site.webmanifest`)**:
  - `id: "/"`, `start_url: "/"`, `scope: "/"`, `display: "standalone"`
  - 아이콘 3종(`192x192`, `512x512`, `maskable 512x512`) 모두 PNG 헤더 및 픽셀 크기 일치 확인
- **서비스워커(`dist/sw.js`)**:
  - 등록 및 활성화 상태: `swActiveState: "activated"`, 리로드 후 `hasServiceWorkerController: true`
  - 캐시 스토리지(`flow-atelier-shell-c263e4e9ab22fa3b`): 총 **`42`개 정적 자산**(`/index.html`, 앱 아이콘 2종, JS 번들 25개, CSS 번들 14개) 프리캐시 완료
- **설치 패널([`PwaInstallPanel.tsx`](file:///home/antigravity/blue45f/pilate_flow/src/components/PwaInstallPanel.tsx))**:
  - `오프라인·자료 보관·업데이트` 펼침 시 `기본 화면을 오프라인에서 열 준비가 됐어요.`(`offlineStatus === 'ready'`) 표시 확인
  - 격리 프로필에서 합성 `beforeinstallprompt` 이벤트 발생 시 `이 기기에 설치`(`button.pwa-install-action`) 버튼 즉시 노출 확인

### 4.2 완전 오프라인 재진입 시 기존 합성 수업안 보존 검증
1. **오프라인 전환 전 합성 수업안 생성 및 저장**:
   - 시퀀스 제목: `[합성-R3] 오프라인 재진입 수업안 보존 검증`
   - 스텝 구성(`3`개): 매트 동작 2개 + `중간 휴식` 1개 (`["step-add-1794039255181-btlb37", "step-add-1794039255217-5ctx6c", "rest-1794039255304-w31j46"]`)
   - 로컬 스토리지 키(`pilates-flow-atelier-storage-v3`): `113,981` bytes, `savedSequences` 내 `[합성-R3] 오프라인 재진입 수업안 보존 검증` 포함 확인
2. **이중 오프라인 차단 후 페이지 재진입(`Page.reload`)**:
   - 로컬 HTTP 서버에서 모든 요청 소켓을 즉시 끊도록(`rejectAllNetworkRequests = true`) 설정함과 동시에 CDP `Network.emulateNetworkConditions({ offline: true })` 활성화
   - 페이지 새로고침 시 네트워크 없이 서비스워커(`sw.js`)가 `CacheStorage`에서 `/index.html` 및 JS/CSS 청크를 100% 응답하여 앱 부트스트랩 성공
3. **오프라인 재진입 후 수업안 보존 대조 결과 (`sequencePreservedExactly: true`)**:
   - `navigator.onLine`: `false`
   - `controlledByServiceWorker`: `true`
   - 복원된 시퀀스 제목: `[합성-R3] 오프라인 재진입 수업안 보존 검증` (일치)
   - 복원된 스텝 수 및 ID 배열: `3`개, `["step-add-1794039255181-btlb37", "step-add-1794039255217-5ctx6c", "rest-1794039255304-w31j46"]` (100% 일치)
   - 복원된 `savedSequences` 및 바이트 크기: `113,981` bytes (100% 일치)
   - 오프라인 상태에서 `시퀀스 미리보기`(`SequencePlanPreview`) 다이얼로그 열기/닫기 정상 작동 확인

---

## 5. 새 도해 구현(`55ce22d` / `b2d6022`) 포함 사용자 경로 재방문 검증

`55ce22d`에서 반영된 5대 기구 접촉 수정(`D-01`~`D-05`)이 실제 앱 UI 경로(`ExerciseAtlasView` → `YouTubeClipModal` → `MovementDiagramReference` → `MovementPhaseDiagramSvg` 및 `SequencePlanPreview`)에서 재방문 시에도 깨짐이나 오버플로 없이 렌더링되는지 `320px` 및 `1440px`에서 검증했습니다.

| 결함 ID | 동작 ID | 동작명 (`nameKo`) | 검증된 `data-archetype-id` | 기구 | 관절 노드 수 | `NaN`/`undefined` | 비검증 안내 문구 | `320px` / `1440px` 가로 오버플로 | 판정 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| **D-01** | `original-reformer-strap-frog` | 스트랩 프로그 준비 | `reformer-strap-frog-isolated` | `reformer` | `7` | `false` | `true` | `0px` / `0px` | **PASS** |
| **D-02A** | `ex-plank-01` | 리포머 롱 스트레치 & 엘리펀트 / 니 스트레치 | `reformer-plank-long-stretch-isolated` | `reformer` | `7` | `false` | `true` | `0px` / `0px` | **PASS** |
| **D-02B** | `ex-plank-02` | 운다 체어 파이크(Pike) & 플랭크 풀업 | `chair-plank-pike-isolated` | `chair` | `7` | `false` | `true` | `0px` / `0px` | **PASS** |
| **D-04** | `ex-footwork-03` | 운다 체어 시티드 & 스탠딩 풋워크 프레스 | `chair-seated-pedal-footwork` | `chair` | `7` | `false` | `true` | `0px` / `0px` | **PASS** |
| **D-05** | `original-barrel-standing-hip-extension` | 래더 지지 힙 익스텐션 | `barrel-standing-hip-extension-isolated` | `barrel` | `7` | `false` | `true` | `0px` / `0px` | **PASS** |

- **추가 도해 표면 재방문**:
  - `ExerciseAtlasView` 상단 `모션으로 살펴보기` 타일 클릭 → `선택한 패턴 도해 미리보기`(`MotionPatternPreview`, SVG 7개): `320px`/`1440px` 모두 `overflowPx: 0`
  - `SequenceWorkbench` → `SequencePlanPreview`(`시퀀스 미리보기`, SVG 13개) 재방문: `320px`/`1440px` 모두 `overflowPx: 0`
  - 전 구간 콘솔 에러 `0`건, 페이지 예외 `0`건

---

## 6. 확인된 잔여 위험 재현 및 최소 패치 제안

`src/**` 수정 금지 지침에 따라 프로덕션 코드는 수정하지 않고, 재현 결과와 최소 패치 제안([`docs/integrated-release-readiness-round3-20261107/patches/minimal-residual-risk-proposals.patch`](file:///home/antigravity/blue45f/pilate_flow/docs/integrated-release-readiness-round3-20261107/patches/minimal-residual-risk-proposals.patch))으로 기록했습니다.

1. **`R3-01` (경미 — 쿼리스트링 포함 루트 URL 오프라인 재진입 시 서비스워커 우회)**:
   - **원인**: [`scripts/pwa-build.ts`](file:///home/antigravity/blue45f/pilate_flow/scripts/pwa-build.ts#L58) 58행의 `if (request.method !== 'GET' || url.origin !== self.location.origin || url.search) return;` 조건이 `request.mode === 'navigate'` 분기보다 먼저 실행됩니다.
   - **재현**: 기본 루트 URL(`/`, `/index.html`) 오프라인 재진입은 100% 성공하나, 오프라인 상태에서 `/?utm_source=pwa` 등 쿼리스트링이 붙은 루트 URL 요청 시 서비스워커가 조기 반환하여 `TypeError: Failed to fetch`가 발생합니다(`queryStringOfflineProbe.ok === false`).
   - **최소 패치 제안**: `url.search` 조기 반환을 `request.mode === 'navigate'`(`/` 또는 `/index.html`) 블록 아래로 이동(2줄 이동).
2. **`R3-02` (경미 — Safari < 18용 `-webkit-backdrop-filter` 접두사 미병기 6곳)**:
   - **원인**: `src/styles/studio.css`(1055, 1713행), `src/styles/atelier-vnext.css`(437행), `src/styles/inline-exercise-finder.css`(546행), `src/styles/motion-pattern-gallery.css`(97행), `src/styles/exercise-youtube-gallery.css`(222행)에서 `backdrop-filter: blur(...)` 단독 선언.
   - **영향**: 반투명 `background: rgba(...)`가 함께 선언되어 있어 가독성이나 레이아웃 깨짐은 없으나, Safari 17 이하에서 배경 블러 효과가 생략될 수 있습니다.
   - **최소 패치 제안**: 해당 6개 선언 앞에 `-webkit-backdrop-filter` 병기.

---

## 7. 증적 파일 목록 및 배포 준비 판정
- **검증 실행 스크립트**: [`scripts/integrated-release-readiness-round3-20261107/verify-release-readiness-round3.mjs`](file:///home/antigravity/blue45f/pilate_flow/scripts/integrated-release-readiness-round3-20261107/verify-release-readiness-round3.mjs)
- **검증 수치 요약 JSON**: [`docs/integrated-release-readiness-round3-20261107/evidence/round3-verification-summary.json`](file:///home/antigravity/blue45f/pilate_flow/docs/integrated-release-readiness-round3-20261107/evidence/round3-verification-summary.json)
- **최소 패치 제안서**: [`docs/integrated-release-readiness-round3-20261107/patches/minimal-residual-risk-proposals.patch`](file:///home/antigravity/blue45f/pilate_flow/docs/integrated-release-readiness-round3-20261107/patches/minimal-residual-risk-proposals.patch)
- **스크린샷 증적 (8장)**: `docs/integrated-release-readiness-round3-20261107/evidence/screenshots/r3-*.png`
- **배포 준비 판정**:
  - Chromium 기반 프로덕션 빌드·PWA 프리캐시(42개)·오프라인 재진입 시 기존 수업안 보존·신규 도해(`55ce22d`/`b2d6022`) 재방문 경로: **PASS (`overallChromiumTracksPass: true`)**
  - 실제 Safari/WebKit 런타임 실행: **UNVERIFIED (미검증 — Linux 컨테이너 내 WebKit 런타임 부재, 정적 감사로 보완)**
  - 치명적 블로커(P0/P1): **0건** (경미 개선 제안 `R3-01`, `R3-02` 패치 제안서 첨부, 자동 운영 배포 미실행)
