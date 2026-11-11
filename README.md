# Pilates Flow Atelier (`pilates-flow-studio`)

필라테스 강사가 설명서 없이 수업 시퀀스를 빠르게 만들고(`새 수업 만들기` · `동작 검색·필터` · `순서·시간·반복 편집` · `저장`), 수업 중 한눈에 참고(`현재·다음 동작` · `핵심 큐` · `시간 조절·실수 복구`)할 수 있도록 설계된 스튜디오 워크벤치 웹앱입니다.

- **운영 호스팅 URL**: `https://pilates-flow-atelier.web.app` (Firebase Hosting `site: pilates-flow-atelier`, `project: deskcloud-fleet-auth`)
- **원격 저장소**: `https://github.com/blue45f/pilate_flow` (`main` 단일 정본 브랜치)
- **디자인 시스템 & 시안 패키지**: [`docs/design-system-mockups/README.md`](docs/design-system-mockups/README.md) (`01` 마스터 시안, `02` 98종 기구학 모션 아틀라스, `03` 디자인·모션 토큰, `04` 3종 UX 시안 비교)
- **운영 배포 상세 절차**: [`DEPLOYMENT.md`](DEPLOYMENT.md)
- **AI 보조 서버 명세**: [`BACKEND.md`](BACKEND.md)

## 1. 로컬 실행 · 검증 · 빌드 명령 (개발자 · AI 에이전트 공통)

요구 런타임: **Node.js `>=22.12.0`**, **pnpm `>=11.0.0`** (`packageManager: pnpm@11.4.0`)

```bash
# 의존성 설치
pnpm install --frozen-lockfile

# 개발 서버 실행 (Vite)
pnpm dev

# 전체 품질 게이트 (비밀키 스캔 + 모션 스터디 검증 + 배포 스크립트 단위테스트 + 전체 테스트 + 린트 + 프로덕션 PWA 빌드)
pnpm verify:all

# 개별 검증 명령
pnpm check:secrets        # 비밀키·토큰 노출 스캔
pnpm check:motion-study   # 98종 동작 도해·원장 정합성 검사
pnpm test:deploy          # PWA 빌드 및 배포 오케스트레이터 단위 테스트
pnpm test                 # 예약·반복 엔진(node --test) + Vitest 전체 테스트
pnpm lint                 # ESLint 정적 분석
pnpm build                # tsc -b && vite build && check-pwa-build.mjs
```

## 2. 배포 방법 요약 (`DEPLOYMENT.md` 정본 기준)

```bash
pnpm deploy:doctor        # 브랜치·빌드·Firebase 인증 상태 1초 진단 및 다음 명령 안내
pnpm deploy:auth          # 최초 1회 로컬(.env.deploy.local) 및 GitHub Actions 시크릿 등록
pnpm deploy:check         # 로컬 설정·브랜치·dist 무결성 JSON 점검
pnpm deploy               # 로컬 원커맨드 검증 → 빌드 → Firebase 배포 → 운영 해시 대조
pnpm deploy:verify        # 운영 URL(https://pilates-flow-atelier.web.app) 번들 해시·PWA·에셋 일치 검증
pnpm deploy:rollback      # 직전 검증 완료 스냅샷으로 즉시 롤백
```

- `origin/main`에 푸시하면 `.github/workflows/deploy-production.yml`이 자동 실행되어 품질 게이트 통과 후 Firebase Hosting 배포 및 `--verify-live --wait-cdn` 검증을 수행합니다(로컬 `pnpm deploy`와 동시 실행 금지).

## 3. 환경변수 이름 및 우선순위 (비밀값 기록 금지)

실제 키·토큰 값은 저장소나 로그에 절대 커밋하지 않으며, 로컬에서는 Git 제외 파일인 `.env.deploy.local` 또는 `.env.local`(템플릿: `.env.deploy.example`)에만 설정합니다.

### AI 보조 서버 환경변수 (`backend/freeAiService.ts`)
1. `OPENAI_USER_API_KEYS_JSON`: 사용자별 개인 OpenAI API 키 매핑 JSON (최우선)
2. `USER_OPENAI_API_KEY`: 단일 강사 개인 OpenAI API 키 (2순위)
3. `OPENAI_API_KEY`: 서버 기본 OpenAI API 키 (3순위)
4. `OPENAI_MODEL`: 선택 모델 이름 (미지정 시 기본 경량 모델 사용)
- 위 키가 모두 없거나 설정된 일일 한도 내 요청이 소진되면 **로컬 규칙 기반 추천으로 자동 전환**되며, 기본 시퀀스 작성·편집·수업 진행 기능은 키 없이도 동일하게 동작합니다.

### Firebase Hosting 배포 인증 환경변수 (`scripts/deploy-universal.mjs` · GitHub Actions Secrets)
1. `GOOGLE_APPLICATION_CREDENTIALS`: 서비스 계정 JSON 파일 경로 (또는 `.firebase/service-account.json` 드롭인 파일)
2. `FIREBASE_SERVICE_ACCOUNT` (CI 보조 별칭: `FIREBASE_SERVICE_ACCOUNT_PILATES_FLOW_ATELIER`, `FIREBASE_SERVICE_ACCOUNT_DESKCLOUD_FLEET_AUTH`, `GCP_SA_KEY`): 서비스 계정 JSON 원문 또는 Base64 문자열
3. `FIREBASE_TOKEN`: `firebase login:ci` 비대화형 배포 토큰

## 4. 카탈로그·도해 자료 및 안전 고지

- 카탈로그 `98`종 동작과 `22`종 패턴 도해(`21`개 의도 ID)는 수업 구성을 돕기 위한 스튜디오 기구학 작성용 도해이며 의학적 진단·치료·교정 효과를 보장하지 않습니다.
- 기존의 권리·출처·검토 상태 표시, 일시정지 재생, `prefers-reduced-motion` 정적 대체, 해부학적 좌우 표기, 개인정보 비식별 원칙([보안 안내](docs/security/secret-scanning-response.md), [인수인계 기록](GEMINI_HANDOFF.md))을 유지합니다.
