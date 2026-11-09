# Pilates Flow Atelier — 멀티 클라우드 & 로컬 유니버설 배포 가이드 (`DEPLOYMENT.md`)

`pilates-flow` (`Flow Atelier`)는 단일 `main` 브랜치와 `scripts/deploy-universal.mjs` 오케스트레이터를 통해 **로컬 환경, Firebase Hosting, GitHub Pages(Actions), Vercel, Netlify, Cloudflare Pages, Docker(Nginx/Cloud Run)** 등 모든 환경에서 원클릭 또는 병렬로 손쉽게 배포할 수 있습니다.

## 1. 로컬 원클릭 병렬 배포 명령어 (`package.json`)

| 명령어 | 동작 설명 |
| :--- | :--- |
| `pnpm deploy:check` | 현재 로컬 머신에 설치된 배포 CLI(`firebase`, `git`, `vercel`, `netlify`, `wrangler`, `docker`) 및 설정 파일 준비 상태를 JSON으로 즉시 진단합니다. |
| `pnpm deploy:parallel` | 프로덕션 PWA 번들(`dist/`)을 1회 빌드·검증한 뒤 **Firebase Hosting**과 **GitHub `origin/main` (GitHub Actions)**에 동시에 병렬 배포합니다. |
| `pnpm deploy:universal` | 현재 환경에서 인증이 완료된 모든 클라우드 타깃을 자동 감지(`--target=auto`)하여 배포합니다. |
| `pnpm preview` | 로컬 머신(`http://localhost:4173`)에서 프로덕션 PWA 번들을 즉시 구동해 점검합니다. |

## 2. 클라우드 환경별 설정 파일 및 직접 배포 방법

| 클라우드 환경 | 설정 파일 | 로컬 직접 배포 명령 | GitHub Actions 자동 배포 시크릿 (선택) |
| :--- | :--- | :--- | :--- |
| **Firebase Hosting** | `firebase.json`, `.firebaserc` | `node scripts/deploy-universal.mjs --target=firebase` | `FIREBASE_TOKEN` 또는 `FIREBASE_SERVICE_ACCOUNT` |
| **GitHub Pages** | `.github/workflows/deploy-production.yml` | `git push origin main` (또는 Actions 탭에서 `Run workflow`) | 기본 `GITHUB_TOKEN` 사용 (`actions/configure-pages@v5` 내장) |
| **Vercel** | `vercel.json` | `node scripts/deploy-universal.mjs --target=vercel` | `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID` |
| **Netlify** | `netlify.toml` | `node scripts/deploy-universal.mjs --target=netlify` | `NETLIFY_AUTH_TOKEN`, `NETLIFY_SITE_ID` |
| **Cloudflare Pages** | `wrangler.toml` | `node scripts/deploy-universal.mjs --target=cloudflare` | `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID` |
| **Docker / Cloud Run** | `nginx/default.conf` | `docker compose up -d --build` (포트 `8080`, 헬스체크 `/healthz`) | Actions 아티팩트(`pilates-flow-production-dist`) 다운로드 후 정적 마운트 가능 |

## 3. GitHub Actions 수동/선택적 배포 (`workflow_dispatch`)
- GitHub 저장소의 **Actions > Dynamic Multi-Cloud & Local Artifact Production Deployment > Run workflow** 버튼을 누르면 `deploy_target` 드롭다운(`all`, `github-pages`, `firebase`, `cloudflare`, `vercel`, `netlify`)에서 원하는 클라우드 타깃만 골라 즉시 배포할 수 있습니다.
- 매 빌드마다 검증된 정적 번들이 `pilates-flow-production-dist` 아티팩트로 14일간 보관되므로, 사내망이나 별도 웹서버에도 빌드 과정 없이 다운로드 후 즉시 호스팅할 수 있습니다.
