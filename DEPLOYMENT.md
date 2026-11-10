# Pilates Flow Atelier — 단일 운영 배포 가이드 (`DEPLOYMENT.md`)

다른 환경이나 작업자가 배포 대상을 혼동하지 않도록 **단일 브랜치(`main`) + 단일 운영 호스팅(`Firebase Hosting: pilates-flow-atelier`)** 체제로 운영 배포 환경을 일원화·최적화했습니다.

## 1. 공식 운영 배포 환경 (Single Source of Truth)

| 항목 | 고정 규격 |
| :--- | :--- |
| **운영 브랜치** | `main` (`origin/main` 단일 브랜치) |
| **운영 호스팅** | **Firebase Hosting** (`site: pilates-flow-atelier`, `project: deskcloud-fleet-auth`) |
| **운영 URL** | [https://pilates-flow-atelier.web.app](https://pilates-flow-atelier.web.app) |
| **빌드 산출물 경로** | `dist/` (`pnpm build` 시 TypeScript·Vite 빌드 및 `check-pwa-build.mjs` 49개 정적 파일 자동 검증) |
| **CDN 캐시 & 보안 최적화** | `/assets/**` 1년 불변(`immutable`) 캐싱 · `/images/**` `stale-while-revalidate` · `/index.html`, `/sw.js`, `/site.webmanifest` 즉시 갱신(`no-cache, no-store, must-revalidate`) |

## 2. 배포 명령어 (`package.json`)

| 명령어 | 설명 |
| :--- | :--- |
| `pnpm deploy:check` | 현재 환경의 `firebase.json`, `.firebaserc`, `dist/` 빌드 상태 및 Firebase CLI 인증 여부를 즉시 점검합니다. |
| `pnpm deploy` (또는 `./scripts/deploy.sh`) | 시크릿 점검 → `dist/` 프로덕션 번들 빌드·검증 → **Firebase Hosting(`pilates-flow-atelier`) 배포** → **실시간 번들 해시 반영 검증**을 한 번에 실행합니다. |
| `pnpm deploy:parallel` | `origin/main` Git 푸시와 **Firebase Hosting(`pilates-flow-atelier`)** 운영 배포를 동시에 병렬 실행하고 실시간 반영을 검증합니다. |
| `pnpm deploy:verify` | 현재 운영 URL(`https://pilates-flow-atelier.web.app`)의 실시간 JS 번들 해시와 V2 3D 에셋 서빙 상태를 즉시 검증합니다. |
| `pnpm deploy:bootstrap` | 비대화형 셸·작업 모드에서도 Node·Firebase CLI 경로를 바로 찾도록 `.deploy-runtime/` 로컬 런타임을 준비합니다. |

## 3. GitHub Actions 자동 배포 (`.github/workflows/deploy-production.yml`)
- `main` 브랜치에 푸시하거나 GitHub **Actions > Production Deployment (Firebase Hosting · pilates-flow-atelier) > Run workflow**를 실행하면 시크릿·모션 원장·단위 테스트·PWA 빌드를 검증한 뒤 `pilates-flow-atelier`로 배포합니다.
- GitHub 저장소 **Settings > Secrets and variables > Actions**에 `FIREBASE_TOKEN`(또는 `FIREBASE_SERVICE_ACCOUNT`)이 등록되어 있으면 원격 CI에서도 자동으로 Firebase Hosting 배포까지 완료됩니다.
