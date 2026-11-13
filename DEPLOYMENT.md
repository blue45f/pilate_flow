# Pilates Flow Atelier — 정본 배포 안내 (`DEPLOYMENT.md`)

어떤 PC·터미널·CI·AI 에이전트 환경에서도 **헷갈리지 않고 한 번에 배포**할 수 있도록 정의한 단일 정본(Single Source of Truth) 문서입니다.

## 0. 30초 빠른 실행 흐름 (새 PC · 작업자 · AI 에이전트 공통)

1. **현재 상태와 다음 명령 1초 진단**:
   ```bash
   pnpm deploy:doctor
   ```
2. **`firebaseAuthReady: false`(인증 미연결)라고 표시될 때 — 최초 1회 영구 등록**:
   ```bash
   pnpm deploy:auth
   # 또는 서비스 계정 키 JSON 파일이 있다면:
   pnpm deploy:auth ./path/to/service-account.json
   ```
   - 프로젝트 루트의 **`.env.deploy.local`**(권한 `0600`, Git 자동 제외)에 인증이 저장되며, `gh` CLI 로그인 상태라면 **GitHub Actions 시크릿(`FIREBASE_SERVICE_ACCOUNT` / `FIREBASE_TOKEN`)까지 자동 등록**됩니다.
3. **운영 배포 실행 (둘 중 하나만 선택 — 동시 실행 금지)**:
   - **로컬 원커맨드 배포**: `pnpm deploy`
   - **GitHub Actions 수동 배포**: Actions의 **Production Checks & Manual Deployment → Run workflow**에서 **main**과 **Firebase 운영 배포 실행**을 선택합니다. 품질 검사·빌드·업로드·운영 해시 검증을 차례로 실행합니다.
   - `origin/main` 푸시와 PR 병합은 품질 검사·빌드만 실행합니다. 수동 실행도 배포 체크의 기본값은 꺼짐이며, main 이외의 브랜치에서는 업로드하지 않습니다.

## 1. 단일 운영 배포 규격

- **운영 브랜치**: `main` (`origin/main` 단일 브랜치)
- **운영 호스팅**: Firebase Hosting (`site: pilates-flow-atelier`, `project: deskcloud-fleet-auth`)
- **설정 파일**: `firebase.json` (캐시·보안 헤더·SPA 리라이트), `.firebaserc` (프로젝트 매핑), `.env.deploy.example` (로컬 env 템플릿)
- **운영 URL**: `https://pilates-flow-atelier.web.app`
- **고정 CLI**: `firebase-tools@13.29.1`
- **빌드 산출물**: `dist/` (`.gitignore` 대상 — 소스·`public/` 변경 후 반드시 새로 빌드)

## 2. 단계별 진입 명령 및 성공 판정 기준

| 단계 | 진입 명령 | 실행 동작 | 성공 판정 기준 (`exit 0` 필수) |
| :--- | :--- | :--- | :--- |
| **빠른 진단** | `pnpm deploy:doctor` | 설정·브랜치·`dist/`·Firebase 인증 소스를 한국어 요약 및 다음 명령 1줄로 출력 | `지금 바로 실행할 다음 명령` 확인 |
| **인증 영구 등록** | `pnpm deploy:auth` | `firebase login:ci` 또는 서비스계정 JSON을 `.env.deploy.local`·GitHub Secrets에 저장 | `pnpm deploy:auth:check`에서 `준비됨 ✅` 출력 |
| **사전 검증** | `pnpm verify:all` | `check:secrets` → `check:motion-study` → `test:deploy` → `test` → `lint` → `build` 순차 실행 | 전 단계 오류 0건 및 `dist/` 검증 통과 |
| **빌드** | `pnpm build` | `tsc -b` → `vite build` → `check-pwa-build.mjs` (`pnpm check:pwa`로 단독 재검증 가능) | `PWA build verified` 출력 (`sw.js` 프리캐시, 순환 청크 0건, Atelier V2 PNG 4종 및 번들 참조 확인) |
| **상태 확인 (로컬 JSON)** | `pnpm deploy:check` | 설정 파일, 현재 Git 브랜치·클린 여부, `dist/` 무결성, 인증 준비 상태 점검 (비밀값 미출력) | JSON 출력에서 `"configValid": true`, `"onCanonicalBranch": true`, `"distReadyForDeploy": true` 확인 |
| **상태 확인 (운영)** | `pnpm deploy:verify` | 운영 URL의 `index.html` 엔트리 해시, JS 청크 응답, `/sw.js` 프리캐시, V2 PNG 4종 대조 (`--wait-cdn` 지원) | JSON 출력에서 `"verified": true`, `"bundleMatchesLocalDist": true`, `"v2Studio3dAssetsLive": true` (불일치 시 `exit 2`) |
| **배포 (로컬 표준)** | `pnpm deploy` | `.firebase/deploy.lock` 획득 → 검증·빌드 → `.firebase/releases/` 스냅샷 → Firebase 업로드 → CDN 재시도 포함 `--verify-live` (고급 CLI 플래그: `pnpm deploy -- --allow-dirty`, `pnpm deploy -- --skip-live-verify`) | 호스팅 업로드 완료 및 직후 `--verify-live`에서 `"verified": true` 확인 |
| **롤백** | `pnpm deploy:rollback` | `.firebase/release-history.json`의 직전 `verifiedLive: true` 스냅샷을 `dist/`에 복원·검증 후 재업로드 | 스냅샷 재업로드 완료 및 직후 `--verify-live`에서 `"verified": true` 확인 |

## 3. 자동 인식되는 Firebase 인증 우선순위 (로컬 · CI 공통)

1. **서비스 계정 파일 경로 (`GOOGLE_APPLICATION_CREDENTIALS`)**: 셸 환경변수 또는 `.env.deploy.local` / `.env.local`에 지정된 JSON 경로
2. **드롭인 서비스 계정 파일 (`.firebase/service-account.json`)**: 프로젝트 루트의 `.firebase/service-account.json` 파일 (`.gitignore` 처리됨)
3. **인라인/Base64 서비스 계정 (`FIREBASE_SERVICE_ACCOUNT`)**: 로컬 `.env.deploy.local` / `.env.local` 또는 GitHub Actions Secrets에 JSON 원문 또는 Base64 문자열 저장 시 배포 순간 임시 `0600` 파일로 복원 후 자동 삭제
4. **Firebase CI 토큰 (`FIREBASE_TOKEN`)**: 로컬 `.env.deploy.local` / `.env.local` 또는 GitHub Actions Secret `FIREBASE_TOKEN`
5. **로컬 CLI 로그인 세션**: `firebase login` 또는 `gcloud auth application-default login` 세션

## 4. 금지 사항 (AI 에이전트 · 작업자 공통)

1. **로컬·원격 동시 배포 금지**: CI 배포 트리거와 로컬 `pnpm deploy`를 동시에 실행하지 마세요.
2. **구버전 `dist/` 업로드 금지**: 소스나 `public/images/` 변경 후 재빌드 없이 배포하지 마세요(`--skip-build` 실행 시에도 PWA 및 Atelier V2 에셋 검사는 강제됨).
3. **인증·샌드박스 우회 및 비밀 노출 금지**: `.env*`·`.firebaserc`·개인 인증 파일의 실제 비밀값을 열람하거나 출력하지 마세요. CLI 인자 `--token` 전달을 금지합니다.
4. **단계 혼동 보고 금지**: 로컬 수정, 로컬 검증·빌드, 로컬 `main` 반영, 원격 `origin/main` 푸시, 실제 운영 반영(`pnpm deploy:verify` 통과)을 구분해 확인된 사실만 보고하세요.
