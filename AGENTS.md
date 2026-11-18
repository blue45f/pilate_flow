<!-- agent-harness:canonical -->
# Pilates Flow Atelier 에이전트 하네스 및 작업 정책

이 문서는 `pilates-flow-studio` 저장소 전역의 **단일 작업 기준 문서**다. Claude Code, Codex, Cursor, GitHub Copilot, Gemini, OpenCode 어댑터는 정책을 복제하지 않고 반드시 이 문서를 참조한다.

## 1. 지시 우선순위

1. 현재 대화에서 사용자가 명시한 요구와 제한
2. 이 루트 `AGENTS.md` 및 시각 정본 [`DESIGN.md`](DESIGN.md)
3. [`DEPLOYMENT.md`](DEPLOYMENT.md), [`BACKEND.md`](BACKEND.md), [`README.md`](README.md)
4. 실제 소스 코드(`src/`, `backend/`, `scripts/`)와 자동화 테스트

문서와 구현이 다를 때는 **실제 소스와 통과하는 테스트**를 기준으로 판정하고 문서를 함께 정합화한다.

## 2. 언어 및 커밋 정책

- 커밋 제목·본문, PR 설명, 신규·수정 문서, 작업 보고는 **한글을 기본값**으로 하되 Conventional Commits 형식(`<type>(<scope>): <요약>`)을 지킨다.
- 허용 `type`: `build`, `chore`, `ci`, `docs`, `feat`, `fix`, `perf`, `refactor`, `revert`, `style`, `test`.
- 하나의 커밋에는 하나의 논리적 변경만 담고 `--no-verify`, 린트 우회, 테스트 삭제로 실패를 숨기지 않는다.
- `origin/main` 푸시·병합은 품질 검증과 빌드까지만 의미하며 운영 호스팅(`https://pilates-flow-atelier.web.app`) 배포가 아니다. 실제 운영 배포는 사용자의 명시적 승인이 있을 때만 [`DEPLOYMENT.md`](DEPLOYMENT.md) 절차를 따른다.

## 3. 필수 품질 게이트

코드를 변경한 뒤에는 변경 범위에 맞는 검증과 전체 게이트를 실행한다:

| 변경 범위 | 최소 검증 명령 |
| --- | --- |
| 하네스·문서·설정 | `pnpm run harness:check && pnpm run test:harness && pnpm run check:secrets` |
| UI·스타일·컴포넌트 | `pnpm run lint && pnpm run build && pnpm test` (`DESIGN.md` Unslop·한글 조판 기준 준수) |
| 모션 도해·아트워크 | `pnpm run check:motion-study && pnpm run check:motion-artwork && pnpm run test:motion-artwork` |
| 배포·PWA·백엔드 | `pnpm run test:deploy && pnpm run check:pwa` |
| `main` 병합 전 통합 게이트 | `pnpm run verify:all` |

실행하지 않은 검증은 실행한 것처럼 보고하지 않는다.

## 4. 구현·보안·역공학 원칙

- **시각·조판 규율 (`DESIGN.md`)**: 보라색/장식용 다중 그라디언트, 중첩 테두리 카드, 무분별한 `9999px` 알약 남발, 한글 기울임꼴(`italic`) 및 한글 자간 확장(`+tracking`)을 금지한다. 모든 시간·횟수·정원·스프링 수치는 `font-variant-numeric: tabular-nums`, 한글 제목·버튼·본문은 `word-break: keep-all`을 유지한다.
- **오프라인·데이터 안전**: 시퀀스·예약·수강권 상태는 기기 내 저장 및 멱등성 규칙을 지키며, 학생 실명·연락처·민감 건강정보를 코드·테스트·로그에 기록하지 않는다. 의학적 진단·치료·교정 효과를 단정하는 문구를 쓰지 않는다.
- **시크릿 보호**: 실제 API 키, Firebase 토큰, 서비스 계정 JSON은 Git 제외 파일(`.env.deploy.local`, `.env.local`)에만 두며 코드·문서·커밋·채팅에 절대 출력하지 않는다(`VITE_` 접두사로 배포 비밀키 노출 금지).
- **REA(`reverse-engineer-anything`) 분석 엔진 강제**: 네이티브 바이너리·패키지 역공학 시 유료 Hopper 대신 무료 오픈소스 **Ghidra**(`provider_id: "ghidra"`, `--provider ghidra`, `REA_ANALYSIS_PROVIDER=ghidra`)만 사용한다.
