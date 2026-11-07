# SonarCloud 게이트 원인과 PWA 검사 경로 보완

## 조사 기준

- 기준 main: `222b59edf47653a36c4f754b2a572c19cd12cb30`.
- 분석: `c7292882-5112-44c9-a0f1-65697dbfaefa`, 2026-11-07 00:25:46 UTC.
- [GitHub 검사](https://github.com/blue45f/pilate_flow/runs/128236807586), [SonarCloud 상세](https://sonarcloud.io/dashboard?id=blue45f_pilate_flow&branch=main).
- 신규 코드 기간은 2026-11-06 06:53:06 UTC 이후이다. 마지막 커밋 하나만의 결과가 아니다.

## 실제 실패 조건

분석 실행 자체는 완료됐으며 Quality Gate가 실패했다.

- 신규 중복률 7.9%, 허용 3%. 신규 85,774줄 중 6,813줄이 중복으로 집계됐다.
- 신규 신뢰성 D, 요구 A. 미해결 BUG 8건이다.
- 신규 보안 E, 요구 A. 미해결 VULNERABILITY 7건이다.
- 신규 유지보수성 A와 보안 핫스폿 검토 100%는 통과했다.

동일 SHA의 GitHub Actions 실행은 없고 commit status도 없다. SonarCloud 외 7개 앱 check suite는 queued이고 개별 완료 검사 결과가 없었다. 이를 빌드 성공이나 배포 진행의 증거로 해석하지 않는다.

## 경고와 영향 구분

- `firebaseSession.ts`의 BLOCKER는 `auth/unsupported-host`에 연결된 공개 사용자 안내 문구를 비밀로 탐지한 것이다. 실제 값과 용도를 확인했으며 비밀 유출 증거가 아니다. 이슈 상태, 보안 규칙, 게이트, suppress 설정은 변경하지 않았다.
- BUG 7건은 문자열 정렬 비교자 경고이다. PWA 번들 해시와 배열 동일성 계산처럼 코드 포인트 순서가 의도된 경우가 포함되어 있어 localeCompare로 일괄 변경하지 않았다.
- 나머지 BUG는 `koreanVoiceNarration.ts`의 동일 분기다. 두 플랫폼에 같은 회복 전략을 반환하는 것으로 이 경고만으로 사용자 기능 고장을 입증하지는 않는다.
- 보안 경고 4건은 `backup-compatibility-rollback.mjs`가 PATH의 git/pnpm을 실행하는 개발 도구 경고다. 이번 보완 범위 밖이다.
- 보안 경고 2건은 `check-pwa-build.mjs`의 CLI 경로 기반 파일 읽기다. 기존 코드는 저장소 밖 합성 빌드 디렉터리도 읽었다. 운영 웹의 원격 침해를 재현한 것은 아니다.
- 신규 중복 상위 파일은 `trackAMatEvidence.ts`와 `trackBApparatusEvidence.ts`이며 각각 1,302줄, 94.8%/98.2%다. 그 밖에 preset, motion catalog, backend/schema 중복이 남는다. 이 데이터 구조를 안전하게 정리하는 작업은 별도이며 기준 완화로 우회하지 않았다.

## 이번 변경

PWA 검사 CLI만 수정했다. 앱, 서비스 워커 생성기, 인증, 사용자 데이터는 변경하지 않았다.

- CLI는 실제 빌드가 사용하는 이 checkout의 `dist`만 검사한다. 인자 생략 또는 정확히 `dist`만 허용하고, 임의 CLI 문자열은 파일시스템 경로로 전달하지 않는다. 회귀 테스트용 프로그램 인터페이스도 checkout 하위 경로와 실제 경로 경계를 검증한다.
- 루트, 파일, assets 디렉터리의 실제 경로를 확인해 심볼릭 링크가 승인 범위를 벗어나면 읽기 전에 거부한다.
- manifest 아이콘은 icons 하위 PNG 경로만 허용한다.
- 정규 파일 여부, 기존 precache 중복/누락/비어 있음, manifest 및 PNG 검사를 유지한다.
- 권한이 있는 로컬 프로세스가 검사 중 파일시스템을 계속 바꾸는 상황에 대한 원자적 격리를 제공하는 도구는 아니다. 빌드 출력은 신뢰할 수 있는 로컬 작업 공간에서 생성해야 한다.

## 검증

- 합성 외부 빌드 입력: 기존 코드 exit 0, 수정 코드 경로 거부 exit 1.
- Node 회귀 17/17: 내부 절대/상대 경로, 다른 cwd의 CLI 임의 경로 거부, 외부 경로, 루트/파일/assets 심볼릭 링크, 아이콘 경로 이탈, 기존 중복/누락 검사, symlink/디렉터리 alias 진입점(보존 플래그 포함), 가상 import 진입점.
- TypeScript 빌드 검사 통과. Vite 빌드와 PWA 실제 40파일 검사 통과.
- ESLint 오류 0, 기존 MotionAuthoringBatchFigure의 Fast Refresh 경고 1. 번들 크기 경고는 그대로 유지했다.
- motion-study ledger 검사와 Node 회귀 6/6 통과.
- 전체 Vitest 회귀 192파일 / 2,111테스트 통과.

검증에는 기존 설치 의존성을 사용했다. 최초 연결한 이전 설치에 Firebase가 빠져 타입 검사와 일부 테스트 로딩이 실패했다. 불완전한 테스트 실행은 중단하고 동일 package.json의 Firebase 13.2.0이 설치된 의존성으로 다시 검증했다. 공유 설치를 삭제하거나 의존성을 변경하지 않았다. pnpm의 자동 설치 제안은 진행하지 않고 설치된 eslint, tsc, vite, vitest 실행 파일로 package scripts와 동등한 명령을 실행했다.

PR #1의 첫 실제 SonarCloud 분석에서는 신규 신뢰성 A, 중복 0%였으나 임의 CLI 경로 흐름에 대한 보안 C가 남았다. 이에 CLI 입력을 고정된 dist로 제한해 경로 주입 표면 자체를 제거했다. 43554fd에 대한 후속 PR 분석은 Quality Gate OK, bugs/vulnerabilities/codeSmells 0으로 확인했다. 독립 리뷰에서 symlink 진입점이 검사를 건너뛰던 문제를 추가로 재현하여 실제 파일 경로로 진입점을 비교하도록 수정했다. 최종 커밋의 분석 결과도 원격에서 다시 확인한다. PR 결과와 전체 main Quality Gate를 구분한다. 운영 배포, 유료 API, Gemini 요청은 수행하지 않았다.

재현 명령: `node --test scripts/check-pwa-build.node-test.mjs`, `pnpm test`, `pnpm lint`, `pnpm check:motion-study`, `pnpm build`.
