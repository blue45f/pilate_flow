# Pilates Flow Atelier (`pilates-flow-studio`)

필라테스 강사가 설명서 없이 수업 시퀀스를 빠르게 만들고(`새 수업 만들기` · `동작 검색·필터` · `순서·시간·반복 편집` · `저장`), 수업 중 한눈에 참고(`현재·다음 동작` · `핵심 큐` · `시간 조절·실수 복구`)할 수 있도록 설계된 스튜디오 워크벤치 웹앱입니다.

- **운영 호스팅 URL**: `https://pilates-flow-atelier.web.app` (Firebase Hosting `site: pilates-flow-atelier`, `project: deskcloud-fleet-auth`)
- **원격 저장소**: `https://github.com/blue45f/pilate_flow` (`main` 단일 정본 브랜치)
- **디자인 시스템 & 시안 패키지**: [`docs/design-system-mockups/README.md`](docs/design-system-mockups/README.md) (`01` 마스터 시안, `02` 98종 기구학 모션 아틀라스, `03` 디자인·모션 토큰, `04` 3종 UX 시안 비교)
- **운영 배포 상세 절차**: [`DEPLOYMENT.md`](DEPLOYMENT.md)
- **AI 보조 서버 명세**: [`BACKEND.md`](BACKEND.md)
- **2026-11-13 작성 화면·모션 개선 기록**: [경쟁 서비스 비교, UI 결정, 11종 자세 교정과 검증 한계](docs/sequence-studio-and-motion-quality-2026-11-13.md)

## 수업 만들기

기본 화면은 **수업 조건 → 동작 추가 → 순서·시간 편집 → 저장·수업 시작**으로 이어집니다. 데스크톱에서는 동작 목록과 수업안을 나란히 보고, 모바일에서는 `내 시퀀스 / 동작 찾기`로 전환합니다. 순서는 드래그와 위·아래 버튼 모두로 바꿀 수 있습니다. 시간 맞추기는 변경 전 미리보기를 보여주며, 잠긴 동작과 휴식은 유지합니다.

템플릿은 작성 화면 상단에서, 자동 구성·기존 정밀 편집·영상 가져오기는 더보기에서 엽니다. 동작 도감의 기본 화면은 검색·기구칩·보기/추가에 집중하고, 비교·검토·수집 자료는 `자료와 고급 도구`에서 계속 사용할 수 있습니다. 저장한 수업의 불러오기·수업 시작, 일정의 다음 수업 준비는 각각의 기본 행동으로 배치했습니다.

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
pnpm generate:motion-artwork # 공통 모델의 98종 × 3자세 SVG 캐시 생성
pnpm check:motion-artwork # 실제 렌더 결과와 캐시/manifest 해시 대조
pnpm test:deploy          # PWA 빌드 및 배포 오케스트레이터 단위 테스트
pnpm test                 # 예약·반복 엔진(node --test) + Vitest 전체 테스트
pnpm lint                 # ESLint 정적 분석
pnpm build                # SVG 캐시 확인 + tsc -b + Vite + PWA 검사
```

## 2. 배포 방법 요약 (`DEPLOYMENT.md` 정본 기준)

```bash
pnpm deploy:info          # 로컬 인증 상태와 배포 대상 확인 (네트워크 조회·변경 없음)
pnpm deploy:doctor        # 브랜치·빌드·Firebase 인증 소스 및 다음 명령 안내
pnpm deploy:auth:local    # 기존 Firebase 로그인 재사용 → .env.deploy.local 저장 (새 토큰 발급·GitHub 동기화 없음)
pnpm deploy:check         # 로컬 설정·브랜치·dist 무결성 JSON 점검
pnpm firebase:local -- hosting:sites:list  # 로컬 인증을 로드해 기존 프로젝트의 사이트 조회
pnpm deploy               # 로컬 원커맨드 검증 → 빌드 → Firebase 배포 → 운영 해시 대조
pnpm deploy:verify        # 운영 URL(https://pilates-flow-atelier.web.app) 번들 해시·PWA·에셋 일치 검증
pnpm deploy:rollback      # 직전 검증 완료 스냅샷으로 즉시 롤백
```

- 다른 앱·IDE·AI 에이전트에서는 작업 폴더나 `pnpm`의 PATH를 맞추지 않고 `bash /Users/hjunkim/WebstormProjects/pilates-flow/scripts/deploy.sh --doctor`로 시작할 수 있습니다. Node 탐색, 프로젝트 이동, 로컬 인증 로드는 스크립트가 처리합니다.
- 인증이 이미 저장돼 있으면 다시 로그인할 필요가 없습니다. `.env.deploy.local`을 셸에서 `source`하거나 비밀값을 앱별 설정에 복사하지 마세요. 실행 방법과 인증 소스는 [`DEPLOYMENT.md`](DEPLOYMENT.md)를 참고하세요.
- main 대상 PR과 `origin/main` 푸시·병합 시 `.github/workflows/deploy-production.yml`이 품질 검사와 운영용 빌드 산출물 생성까지만 자동 실행합니다. 운영 사이트는 변경하지 않습니다.
- Firebase Hosting 배포는 별도로 실행합니다. GitHub Actions에서 **Production Checks & Manual Deployment → Run workflow → main**을 선택하고 **Firebase 운영 배포 실행**을 체크하면, 품질 검사 후 업로드 및 `--verify-live --wait-cdn` 검증을 수행합니다. 체크하지 않은 수동 실행은 검사와 빌드만 수행하며, main 이외의 브랜치는 운영 배포할 수 없습니다. 로컬 `pnpm deploy`와 동시 실행하지 마세요.

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
3. `FIREBASE_TOKEN`: 기존 Firebase CLI 로그인에서 재사용한 토큰 또는 기존 CI 토큰

`.env.deploy.local`에는 인증 외에 프로젝트·사이트·운영 URL·저장소·Node 경로 등의 배포 참고 정보도 정리합니다. 이 정보는 앱 간 실행 안내용이며, 실제 배포 대상은 `firebase.json`, `.firebaserc`, 배포 스크립트의 정본 설정으로 검증합니다. 배포 인증에는 `VITE_` 접두사를 붙이지 않습니다.

## 4. 카탈로그·도해 자료 및 안전 고지

- 기본 카탈로그는 기존 `98`종과 추가 영상 참고 `60`종을 포함한 `158`종입니다. 별도의 수집 목록 `60`종은 기본 목록에 중복 추가하지 않습니다. `98`종의 `294`개 정적 SVG는 공통 도해 모델의 세 자세 캐시이며, 98개 독립적인 전문가 검증 3D 모션을 의미하지 않습니다.
- 기존 24개 래스터 패밀리와 세부 패턴 도해는 참고 자료로 유지합니다. 추가·수집 동작의 전용 그림이 없는 경우 다른 동작의 신체 그림으로 채우지 않고 영상 참고와 기구 안내를 표시합니다. 새 영상 연결의 재생·구간·정확 동작 검증 여부는 이름·메타데이터 확인과 분리합니다.
- 동작 도해는 수업 구성을 돕기 위한 기구학 작성용 자료이며 의학적 진단·치료·교정 효과를 보장하지 않습니다.
- 기존의 권리·출처·검토 상태 표시, 일시정지 재생, `prefers-reduced-motion` 정적 대체, 해부학적 좌우 표기, 개인정보 비식별 원칙([보안 안내](docs/security/secret-scanning-response.md), [인수인계 기록](GEMINI_HANDOFF.md))을 유지합니다.
