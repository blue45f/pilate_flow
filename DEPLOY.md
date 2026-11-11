# Pilates Flow Atelier — 배포 가이드

운영 배포는 Firebase Hosting (`pilates-flow-atelier` / 프로젝트 `deskcloud-fleet-auth`) 로 수행됩니다.
라이브 URL: https://pilates-flow-atelier.web.app

## 빠른 시작

```bash
# 1. 의존성 설치 (최초 1회)
pnpm install --frozen-lockfile

# 2. 배포 전 점검 (권장)
pnpm deploy:check

# 3. 운영 배포
pnpm deploy

# 4. 라이브 검증만 별도로 실행
pnpm deploy:verify
```

## 배포 명령 참조

| 명령 | 설명 |
|------|------|
| `pnpm deploy` | 비밀 점검 → 모션 스터디 ledger 확인 → TS 체크 → Vite 빌드 → PWA/V2 검증 → Firebase Hosting 배포 → 라이브 검증 |
| `pnpm deploy:dirty` | 워킹트리에 미커밋 변경(추적되지 않은 파일 포함)이 있어도 배포 (예: `.omo/` 에이전트 스크래치 디렉터리) |
| `pnpm deploy:skip-verify` | Firebase Hosting 배포 후 라이브 검증 스킵 (샌드박스 등 아웃바운드 HTTP 차단 환경) |
| `pnpm deploy:doctor` | 배포 준비 상태 진단 리포트 출력 |
| `pnpm deploy:check` | 설정, Git, dist, 인증 준비도 JSON 출력 (비밀값 미노출) |
| `pnpm deploy:verify` | 라이브 URL 해시/에셋/서비스워커 검증 |
| `pnpm deploy:rollback` | 이전 검증된 릴리스로 롤백 |

## 배포가 실패할 때 (트러블슈팅)

### 1. "Firebase 배포 인증이 아직 연결되지 않았습니다"

원인: Firebase 인증 정보가 없거나, `.env.deploy.local` 값이 비어 있음.

해결 방법 (중복 실행 불필요, 한 가지만):

- **방법 A — 이미 `firebase login` 한 경우 (자동 사용):**
  스크립트가 `~/.config/configstore/firebase-tools.json` 을 자동 감지하여 비대화형 배포에 사용합니다. 별도 설정 없이 `pnpm deploy` 를 다시 실행하세요.
- **방법 B — 서비스 계정 키 파일:**
  서비스 계정 JSON 을 `.firebase/service-account.json` 에 복사한 뒤 `pnpm deploy` 실행.
- **방법 C — `.env.deploy.local` 에 값 채우기:**
  `GOOGLE_APPLICATION_CREDENTIALS`, `FIREBASE_SERVICE_ACCOUNT`, `FIREBASE_TOKEN` 중 하나를 실제 값으로 채운 뒤 `pnpm deploy` 실행.

### 2. "Working tree has uncommitted changes"

원인: 워킹트리에 변경된 파일이 있음. 배포는 `dist/` (gitignored) 만 올리므로 소스 변경사항은 배포에 포함되지 않음.

해결 방법:

- 미커밋 변경이 추적되지 않은 파일(예: `.omo/`) 뿐이라면: `pnpm deploy:dirty` (자동 감지도 시도함)
- 커밋이 필요한 경우: `git add . && git commit -m "..."` 후 `pnpm deploy`

### 3. 라이브 검증 실패 (outbound HTTP blocked)

원인: 현재 쉘 샌드박스에서 아웃바운드 HTTP(fetch) 가 차단됨. Firebase Hosting 배포 자체는 성공했음.

해결 방법:

- `pnpm deploy:skip-verify` 로 배포 완료 후, 호스트 터미널에서 `pnpm deploy:verify` 로 수동 검증.
- 또는 `curl https://pilates-flow-atelier.web.app/` 으로 수동 확인.

### 4. `pnpm build` 실패 (check-pwa-build.mjs 인수 오류)

원인: 구 버전 스크립트가 인수를 엄격하게 검증.

해결 방법: 이미 수정됨. `pnpm build --no-color` 등 추가 인수도 문제없이 동작함.

## 인증 경로 우선순위

스크립트는 다음 순서로 Firebase 인증을 해결합니다 (첫 번째로 성공한 경로 사용):

1. `GOOGLE_APPLICATION_CREDENTIALS` (프로세스 env → `.env.deploy.local` → `.env.local`) — 실제 파일 경로
2. `.firebase/service-account.json` (드롭인 서비스 계정 키)
3. `FIREBASE_SERVICE_ACCOUNT` (인라인 JSON 또는 Base64)
4. `FIREBASE_TOKEN`
5. 주변 CLI 인증 (`firebase login` 또는 `gcloud ADC`) — `.env` 값이 비어 있으면 자동 사용

## 배포 후 확인 사항

- 라이브 HTML 이 `HTTP 200` 을 반환하는지
- `/assets/index-*.js` 와 `/assets/index-*.css` 해시가 로컬 `dist/` 와 일치하는지
- 서비스워커 (`/sw.js`) 가 정상 제공되는지
- Atelier V2 3D 에셋 4개가 라이브에 존재하는지

```
curl -I https://pilates-flow-atelier.web.app/
curl -I https://pilates-flow-atelier.web.app/sw.js
```
