# Sonar 신규 신뢰성 경고의 동작 보존 정리

## 조사 기준과 남는 게이트

- 원격 main 기준: `d42e34b2048408efc0e70d6ab05eaed7dfd1ebf2`.
- Sonar 분석: `6019fdbe-ec70-49a3-a278-e436612133a5`, 2026-11-07 02:07:56 UTC.
- [GitHub 검사](https://github.com/blue45f/pilate_flow/runs/128267244478), [Sonar main](https://sonarcloud.io/dashboard?id=blue45f_pilate_flow&branch=main).
- 신규 기간: 2026-11-06 06:53:06 UTC 이후. 신규 85,987줄 중 중복 6,813줄(7.9%), 신뢰성 D, 보안 E이다.
- 미해결 신규 BUG 8건, VULNERABILITY 5건이다. 앞선 PWA 경로 보완으로 보안 경고 2건은 제거됐다.

이 변경은 아래 신뢰성 경고의 의도를 명시하고 중복 분기를 정리한다. 변경 후 Sonar 분석 전에는 이슈 제거 또는 게이트 통과로 보고하지 않는다. 보안 5건과 데이터 중복은 본 변경에서 해결하지 않는다.

## 신뢰성 8건의 실제 의미와 변경

문자열 기본 정렬 7건(S2871)은 사용자 이름의 사전순 표시가 아니다.

- motionCoverage resolver 2곳: 기존 카탈로그의 소도구·척추방향 집합과 입력을 비교한다.
- sequenceValidation 2곳: 필요한 장비 집합의 서명을 비교한다.
- AiSequenceCoPilotPanel 1곳: 제외된 동작 ID 집합을 요청 입력 키에 넣는다.
- backend/freeAiService 1곳: 객체 키를 정렬하여 기존 캐시 키를 계산한다.
- scripts/pwa-build 1곳: 정적 파일 목록을 정렬하여 프리캐시와 버전 해시를 계산한다.

이들은 기존 UTF-16 코드 단위 순서가 적절하다. `localeCompare`로 일괄 변경하면 호스트 로케일에 따라 순서·캐시·해시가 달라질 수 있다. 공유 `compareCodeUnits` 비교자를 명시하여 기존 순서를 그대로 유지한다. 런타임 데이터가 정적 타입을 벗어나더라도 기본 sort의 ToString 변환을 보존하고 Symbol은 동일하게 거부한다. Unicode 정규화나 대소문자 변환은 하지 않는다.

koreanVoiceNarration의 S3923은 모바일·데스크톱 모두 같은 segment recovery를 반환하던 삼항식이다. 동일한 상수로 바꾸고 두 플랫폼의 로컬 한국어 음성과 사용자 제스처 요구를 함께 검사한다. 이 경고들만으로 기존 사용자 기능 고장이 입증되는 것은 아니다.

## 보안 5건: 오탐과 실제 경계

- firebaseSession.ts의 S6418 BLOCKER는 `auth/unsupported-host` 오류 코드에 연결된 공개 로그인 안내 문자열을 비밀로 탐지한 것이다. 해당 코드는 비밀값이 아니며 자격증명 유출 증거가 아니다. 문자열 쪼개기, suppress, 이슈 상태 변경으로 탐지를 숨기지 않았다.
- backup-compatibility-rollback.mjs의 S4036 4건은 PATH에서 git/pnpm을 실행하는 로컬 개발 검증 도구의 신뢰 경계다. 공격자가 PATH 앞쪽의 실행 파일을 조작할 수 있는 환경에서는 다른 프로그램 실행 위험이 있다. 운영 웹의 원격 취약점 재현과는 다르지만 오탐으로 일괄 폐기하지 않는다. 실행 파일 경로의 이식성과 개발 환경 정책을 별도로 정한 뒤 보완해야 한다.

## Evidence 데이터는 그대로 보존

trackAMatEvidence.ts와 trackBApparatusEvidence.ts의 각 1,302줄 중복 집계는 같은 명명 필드 구조가 반복되는 정적 근거 자료다. 실제 문장까지 동일하다는 의미가 아니다.

- 총 20동작, 출처 41개, 단계 60개, 사실·추론·미검증 진술 90개.
- 반복된 URL·발행처에도 출처 ID, 제목, 검증 상태, 접근 메모가 다르므로 URL 기준으로 합치지 않았다.
- 필드명을 위치 인자로 바꾸거나 JSON으로 옮겨 검사 수치만 줄이지 않았다. 새 authoring schema와 복원 코드를 도입할 만큼 분명한 제품상 이득이 없어 기존 감사 가능한 구조를 유지했다.
- 게이트 한도, 신규 기간, 규칙, 분석 제외 설정을 변경하지 않았다.

변경 전후 파일 SHA-256은 동일하다.

- Track A: `f31db831a2dd60fdc14bd7e2bfefa0ca8d3550beeda100213012b1e445cfdaba`
- Track B: `db2627cbbf013639d71e7a281a1d6b7baa8c27aff3e92adc942f6b13cf0b0409`

## 검증 기록

- 변경 전 코드에서 캐시 키 golden 및 PWA 파일 순서 회귀를 먼저 실행: 2파일 36테스트 통과.
- 전후 캐시 키: `ea051a29ecbd08773cfd81a18d76d3aec6210a309f9a005c41a3ba4223f32695` 유지.
- 비교자: 65,536 UTF-16 코드 단위, 결합문자·한국어·서러게이트·중복 문자열, 혼합 숫자/문자/객체/undefined, Symbol 거부 회귀.
- PWA 회귀는 파일 순서와 같은 입력의 해시 생성 동작을 확인한다. 전체 버전 알고리즘에 대한 독립 golden이라고 주장하지 않는다.
- 최종 비교자와 플랫폼 변경의 집중 검사 4파일 60테스트 통과.
- 최종 전체 Vitest: 193파일 / 2,119테스트 통과. 프런트·백엔드 TypeScript, ESLint 오류 0, motion ledger, Node 회귀 23개, Vite 빌드와 실제 PWA 40파일 검사 통과.
- 기존 MotionAuthoringBatchFigure Fast Refresh 경고 1개와 500kB 번들 경고는 그대로 남긴다.
- 독립 코드 검토에서 발견한 비정상 숫자 장비 배열의 서명 차이도 ToString 보존과 회귀 추가로 제거했다.

재현: `vitest run`, `tsc -b`, `tsc -p tsconfig.backend.json`, `eslint .`, `node scripts/generate-motion-study-ledger.mjs --check`, `node --test scripts/generate-motion-study-ledger.node-test.mjs scripts/check-pwa-build.node-test.mjs`, `vite build`, `node scripts/check-pwa-build.mjs`. 저장소에 이미 설치된 의존성을 사용하며 설치·업그레이드를 하지 않았다.

운영 배포나 사용자 데이터 변경은 수행하지 않았다.
