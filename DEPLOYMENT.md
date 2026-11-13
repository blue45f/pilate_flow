# Pilates Flow Atelier — 로컬 배포 안내

기존 Firebase 프로젝트 `deskcloud-fleet-auth`의 Hosting 사이트 `pilates-flow-atelier`를 사용합니다. 인증은 Git에서 제외된 `.env.deploy.local` 한 곳에서 재사용하며, 로컬 준비·GitHub 설정·실제 운영 업로드를 구분합니다.

## 1. 다른 앱·IDE·AI 에이전트에서 시작하기

현재 작업 폴더와 관계없이 다음 명령으로 점검할 수 있습니다. `deploy.sh`가 프로젝트 루트로 이동하고 Node.js `>=22.12.0`을 탐색하므로 앱마다 `pnpm`이나 셸 초기화를 설정할 필요가 없습니다.

```bash
# 로컬 설정·브랜치·빌드·인증 소스 점검
bash /Users/hjunkim/WebstormProjects/pilates-flow/scripts/deploy.sh --doctor

# 로컬 인증 상태만 확인 (GitHub 조회 없음, 비밀값 미출력)
bash /Users/hjunkim/WebstormProjects/pilates-flow/scripts/deploy.sh --setup-auth --status --local-only

# 저장된 인증으로 기존 Firebase 프로젝트의 Hosting 사이트 조회
bash /Users/hjunkim/WebstormProjects/pilates-flow/scripts/deploy.sh --firebase hosting:sites:list

# 운영 번들과 로컬 dist 대조 (업로드 없음)
bash /Users/hjunkim/WebstormProjects/pilates-flow/scripts/deploy.sh --verify-live --wait-cdn
```

다른 PC에서는 위 경로의 프로젝트 루트만 해당 체크아웃 경로로 바꿉니다. env 파일은 스크립트가 데이터로 읽으므로 `source`, `eval`, 셸의 `export`나 비밀값 복사가 필요하지 않습니다. 다른 앱에 비밀값을 출력하거나 전달하는 대신 위 실행 경로를 등록합니다.

## 2. 기존 인증을 로컬에 저장하기

프로젝트 루트에서 사용하는 명령입니다.

| 상황 | 명령 | 변경 범위 |
|---|---|---|
| 저장된 인증 상태 확인 | `pnpm deploy:info` | 로컬 읽기 전용 |
| 기존 Firebase CLI 로그인 재사용 | `pnpm deploy:auth:local` | 기존 토큰을 `.env.deploy.local`에 저장, 새 토큰 발급·GitHub 동기화 없음 |
| 보관 중인 서비스 계정 JSON 재사용 | `pnpm deploy:auth ./service-account.json --local-only` | `.firebase/service-account.json` 복사와 로컬 env 경로 등록 |
| 현재 프로세스의 인증 환경변수 저장 | `pnpm deploy:auth --from-env --local-only` | 로컬 env 저장 |
| 승인받은 GitHub Secrets 연결 | `pnpm deploy:auth --sync-github` | 저장된 인증을 원격 Secret에 업로드 |

이미 로컬 인증이 있으면 그대로 재사용합니다. 인자 없는 `pnpm deploy:auth`도 저장된 인증을 먼저 확인하지만, 인증이 없으면 대화형 로그인으로 이어질 수 있으므로 기존 로그인 재사용에는 `deploy:auth:local`을 사용합니다.

`.env.deploy.local`은 권한 `0600`과 Git 제외를 유지합니다. 인증값을 명령 인자(`--token` 등), 로그, 채팅, `VITE_` 환경변수에 넣지 않습니다. 로컬 인증의 준비 상태는 파일·형식·인증 소스 탐색 결과이며 토큰 만료나 실제 IAM 권한까지 증명하지는 않습니다. 사이트 조회에는 네트워크 접근이 필요합니다.

### 로컬 인증 탐색 순서

1. `GOOGLE_APPLICATION_CREDENTIALS`에 지정된 JSON 파일 경로
2. 프로젝트의 `.firebase/service-account.json`
3. `FIREBASE_SERVICE_ACCOUNT`의 JSON 원문 또는 Base64
4. `FIREBASE_TOKEN`
5. 기존 Firebase CLI 로그인 또는 gcloud ADC

명시적 셸 인증이 로컬 env보다 우선합니다. 로컬 파일은 `.env.deploy.local` → `.env.local` → `.env.deployment-reference.local` 순으로 읽으며, 빈 값과 템플릿 값은 제외합니다. `firebase:local`도 같은 인증 탐색을 사용하고 프로젝트를 `deskcloud-fleet-auth`로 고정합니다.

## 3. 로컬 env의 배포 참고 정보

| 키 | 용도 |
|---|---|
| `DEPLOY_PROJECT_ROOT` | 이 체크아웃의 절대 경로 |
| `DEPLOY_ENV_FILE` / `DEPLOY_LAUNCHER` / `DEPLOY_GUIDE` | 로컬 env·실행 스크립트·이 문서의 절대 경로 |
| `FIREBASE_PROJECT_ID` | `deskcloud-fleet-auth` |
| `FIREBASE_HOSTING_SITE` | `pilates-flow-atelier` |
| `FIREBASE_HOSTING_URL` | `https://pilates-flow-atelier.web.app` |
| `DEPLOY_BRANCH` | `main` |
| `DEPLOY_REPOSITORY` | `https://github.com/blue45f/pilate_flow` |
| `DEPLOY_NODE_BIN` | 확인된 로컬 Node 실행 파일 |
| `DEPLOY_FIREBASE_TOOLS_PACKAGE` | 설치된 Firebase CLI가 없을 때 사용하는 `firebase-tools@13.29.1` |

이 키들은 다른 앱이 실행 위치와 대상을 파악하기 위한 참고 정보입니다. 실제 대상의 정본은 `.firebaserc`, `firebase.json`, `scripts/deploy-universal.mjs`이며 참고 정보를 바꿔도 다른 프로젝트로 자동 배포하지 않습니다. 이동한 체크아웃이나 Node 업그레이드 후에는 참고 경로를 갱신하고 `deploy:doctor`로 확인합니다. 템플릿은 `.env.deploy.example`입니다.

`firebase:local`은 프로젝트·사이트·앱 조회용 명령만 허용합니다. 운영 업로드는 검증·스냅샷을 포함하는 `pnpm deploy`를 사용합니다. 명시적 인증을 사용하는 Firebase CLI의 기본 설정 캐시는 `.firebase/cli-config`에 저장해 다른 앱의 전역 설정 쓰기 권한에 의존하지 않습니다. 기존 `XDG_CONFIG_HOME` 지정이나 전역 로그인에만 의존하는 실행은 해당 경로를 유지합니다.

## 4. 승인된 운영 배포 실행

현재 운영 내용과 배포 이력을 먼저 확인해 같은 빌드의 중복 업로드를 피합니다. Git 커밋과 운영 반영 상태는 아래 검증 명령 및 Firebase 출시 이력을 기준으로 확인합니다.

```bash
pnpm deploy:doctor
pnpm deploy:check
pnpm verify:all

# 운영 업로드가 승인된 경우 실행
pnpm deploy

# 배포된 dist를 기준으로 운영 확인
pnpm deploy:verify --wait-cdn
```

전체 품질 게이트인 `pnpm verify:all`에는 운영 빌드가 포함됩니다. 빌드만 별도로 확인할 때는 `pnpm build`를 실행하며 SVG 캐시 정합성, TypeScript, Vite 번들과 PWA 무결성을 검사합니다.

`pnpm`을 사용할 수 없는 앱에서는 승인된 배포를 `bash /Users/hjunkim/WebstormProjects/pilates-flow/scripts/deploy.sh`로 실행할 수 있습니다. 인자 없는 `deploy.sh`는 점검만 하는 명령이 아니라 실제 업로드 명령입니다.

배포 스크립트는 `main`·깨끗한 워킹트리·정본 설정을 검사하고, 잠금 획득 → 검증·빌드 → 로컬 스냅샷 → Firebase 업로드 → 운영 검증을 수행합니다. 소스나 `public/`이 변경되면 새로 빌드해야 합니다. CI 배포와 로컬 배포를 동시에 실행하지 않습니다.

## 5. 빌드 해시와 실제 운영 반영 확인

`deploy:verify`의 성공 기준은 `verified: true`이며 다음을 확인합니다.

- 운영 루트 HTML과 JS의 정상 응답 및 MIME
- 배포한 `dist/index.html`의 JS·CSS 파일명 해시와 운영 파일명 일치
- `/sw.js` 프리캐시에 현재 엔트리 JS 포함
- Atelier V2 PNG 4종의 정상 응답과 PNG MIME

Git 커밋 SHA와 Vite 파일명 해시는 서로 다릅니다. 테스트만 바뀐 두 커밋은 같은 번들을 만들 수 있으므로 커밋 → 빌드 산출물 → 운영 파일을 연결해 확인합니다. 필요하면 산출물과 운영 파일 내용의 SHA-256도 비교합니다. CI 검증은 해당 Actions 실행의 `pilates-flow-atelier-dist` artifact를 기준으로 합니다.

[Firebase 전체 출시 이력](https://console.firebase.google.com/project/deskcloud-fleet-auth/hosting/sites/pilates-flow-atelier/releases)은 서버의 현재 버전·배포자·시각을 보여줍니다. `.firebase/release-history.json`은 로컬 오케스트레이터가 최근 5건을 보관하는 장부이며, 여기에 있는 `releaseId`는 Firebase 서버 버전 ID가 아닙니다. `verifiedLive: true`와 `verifiedAt`은 업로드 후 운영 검증이 완료됐음을 나타냅니다.

네트워크 차단으로 운영 검증을 완료하지 못했다면 `pnpm deploy`의 종료 코드나 빌드 성공만으로 운영 반영 완료를 보고하지 않습니다. 네트워크가 가능한 환경에서 독립 `deploy:verify` 결과까지 확인합니다. 롤백도 실제 업로드이므로 승인된 경우에만 `pnpm deploy:rollback`을 사용합니다.

## 6. GitHub Actions 인증은 별도 설정

로컬 env는 GitHub Actions에 자동 전달되지 않습니다. 현재 workflow는 다음 순서로 Secret을 읽습니다.

`FIREBASE_SERVICE_ACCOUNT` → `FIREBASE_SERVICE_ACCOUNT_PILATES_FLOW_ATELIER` → `FIREBASE_SERVICE_ACCOUNT_DESKCLOUD_FLEET_AUTH` → `GCP_SA_KEY` → `FIREBASE_TOKEN`

앞의 네 값은 서비스 계정 JSON 원문 또는 Base64이고, 모두 비었을 때만 토큰을 사용합니다. 상위 값이 잘못된 JSON이면 하위 인증으로 넘어가지 않습니다. 현재 job에 `environment:`가 없어 Environment 전용 Secret은 전달되지 않으며 `GOOGLE_APPLICATION_CREDENTIALS`라는 Secret도 직접 읽지 않습니다.

main 대상 PR과 main 푸시·병합은 품질 검사와 운영용 빌드 산출물 생성까지만 실행합니다. CI 운영 업로드는 **Production Checks & Manual Deployment → Run workflow → main → Firebase 운영 배포 실행**을 별도로 선택합니다. 기본값은 꺼짐이며 main 이외의 브랜치는 업로드하지 않습니다.

기존 Secret의 이름·범위와 보관된 인증을 먼저 대조합니다. 사용자 ADC(`authorized_user`)는 로컬 전용이며 서비스 계정 Secret으로 동기화할 수 없습니다. 기존 서비스 계정 재사용 시 대상 프로젝트의 Hosting Admin 및 API Keys Viewer 권한, 계정·키 활성 상태를 확인합니다. GitHub Secrets 변경이나 workflow 변경, 배포 재실행은 변경 내용을 제시하고 승인받은 뒤 수행합니다. 과거 Actions의 초록색 결과 중에는 인증 없이 업로드를 생략한 실행이 있으므로 실제 업로드 로그와 Firebase 출시 이력을 함께 확인합니다.
