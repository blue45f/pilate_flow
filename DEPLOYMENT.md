# Pilates Flow Atelier — 정본 배포 안내 (`DEPLOYMENT.md`)

사람과 AI 에이전트가 배포 대상·진입 명령·성공 판정을 혼동하지 않도록 정의한 **단일 정본(Single Source of Truth)** 문서입니다.

## 1. 단일 운영 배포 규격

- **운영 브랜치**: `main` (`origin/main` 단일 브랜치, 커밋되지 않은 변경이 없는 클린 워킹트리 필수)
- **운영 호스팅**: Firebase Hosting (`site: pilates-flow-atelier`, `project: deskcloud-fleet-auth`)
- **설정 파일**: `firebase.json` (캐시·보안 헤더·SPA 리라이트), `.firebaserc` (프로젝트 매핑)
- **운영 URL**: `https://pilates-flow-atelier.web.app`
- **고정 CLI**: `firebase-tools@13.29.1`
- **빌드 산출물**: `dist/` (`.gitignore` 대상 — 소스·`public/` 변경 후 반드시 새로 빌드)

## 2. 단계별 진입 명령 및 성공 판정 기준

| 단계 | 진입 명령 | 실행 동작 | 성공 판정 기준 (`exit 0` 필수) |
| :--- | :--- | :--- | :--- |
| **사전 검증** | `pnpm verify:all` | `check:secrets` → `check:motion-study` → `test:deploy` → `test` → `lint` → `build` 순차 실행 | 전 단계 오류 0건 및 `dist/` 검증 통과 |
| **빌드** | `pnpm build` | `tsc -b` → `vite build` → `check-pwa-build.mjs` (`pnpm check:pwa`로 단독 재검증 가능) | `PWA build verified` 출력 (`sw.js` 프리캐시, 순환 청크 0건, Atelier V2 PNG 4종 및 번들 참조 확인) |
| **상태 확인 (로컬)** | `pnpm deploy:check` | 설정 파일, 현재 Git 브랜치·클린 여부, `dist/` 무결성, 인증 준비 상태 점검 (비밀값 미출력) | JSON 출력에서 `"configValid": true`, `"onCanonicalBranch": true`, `"distReadyForDeploy": true` 확인 |
| **상태 확인 (운영)** | `pnpm deploy:verify` | 운영 URL의 `index.html` 엔트리 해시, JS 청크 응답, `/sw.js` 프리캐시, V2 PNG 4종 대조 | JSON 출력에서 `"verified": true`, `"bundleMatchesLocalDist": true`, `"v2Studio3dAssetsLive": true` (불일치 시 `exit 2`) |
| **배포 (CI 권장)** | `git push origin main` | `.github/workflows/deploy-production.yml` 실행 (`verify-and-build` → `deploy-hosting` 잡 분리) | `verify-and-build`와 `deploy-hosting` 두 잡 모두 성공 (시크릿 미설정 시 `deploy-hosting`은 `exit 1` 실패) |
| **배포 (로컬 단독)** | `pnpm deploy` | `.firebase/deploy.lock` 획득 → 검증·빌드 → `.firebase/releases/` 스냅샷 → Firebase 업로드 → `--verify-live` | 호스팅 업로드 완료 및 직후 `--verify-live`에서 `"verified": true` 확인 (`--auto-rollback` 옵션 지원) |
| **롤백** | `pnpm deploy:rollback` | `.firebase/release-history.json`의 직전 `verifiedLive: true` 스냅샷을 `dist/`에 복원·검증 후 재업로드 | 스냅샷 재업로드 완료 및 직후 `--verify-live`에서 `"verified": true` 확인 |

## 3. 금지 사항 (AI 에이전트 · 작업자 공통)

1. **로컬·원격 동시 배포 금지**: `git push origin main`(CI 배포 트리거)과 로컬 `pnpm deploy`를 동시에 실행하지 마세요(제거된 `--parallel` 플래그 재도입 금지).
2. **구버전 `dist/` 업로드 금지**: 소스나 `public/images/` 변경 후 재빌드 없이 배포하지 마세요(`--skip-build` 실행 시에도 PWA 및 Atelier V2 에셋 검사는 강제됨).
3. **인증·샌드박스 우회 및 비밀 노출 금지**: `.env*`·`.firebaserc`·개인 인증 파일을 열람하거나 출력하지 마세요. CLI 인자 `--token` 전달을 금지하며(`FIREBASE_TOKEN` 환경변수 또는 `GOOGLE_APPLICATION_CREDENTIALS`만 사용), 비대화형 샌드박스에서 호스트 `$HOME` 우회나 런타임 부트스트랩(`--bootstrap`)을 시도하지 마세요.
4. **단계 혼동 보고 금지**: 로컬 수정, 로컬 검증·빌드, 로컬 `main` 반영, 원격 `origin/main` 푸시, 실제 운영 반영(`pnpm deploy:verify` 통과)을 구분해 확인된 사실만 보고하고, 네트워크 차단 등으로 확인하지 못한 원격·운영 상태는 `미검증`으로 남기세요.
5. **거부된 네트워크 우회·권한 변경·유료 전환 금지**: 거부된 GitHub 네트워크 접근을 재시도·우회하지 말고, 저장소/클라우드 권한·보안 설정 변경이나 유료 플랜 전환을 수행하지 마세요.
