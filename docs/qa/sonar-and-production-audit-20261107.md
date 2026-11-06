# Sonar 및 운영 지문 점검

## 운영 버전

운영 index.html SHA256: f149030f2ab6f5cf224b8a3f8e0ac9d55a78d7f11603f44748535576cd8d88d7
운영 sw.js SHA256: 183ed7f269cf88f4743437c64b8e7dad97579fe6f9e8d998c442c32f949b01ad
운영 index-Dyk9OJeC.js SHA256: 4835d6d316dacec9698545a1ccfa2d24c6f67dede747066b1b2fac4df68d474c

깨끗한 git archive 7b9c6b4, 29a6edb, f963706을 동일한 기존 의존성으로 각각 빌드했다.
29a6edb와 f963706의 HTML/SW는 운영 바이트와 모두 동일하다. 7b9c6b4는 다르다.
두 커밋의 번들 출력이 동일하므로 배포 commit을 하나로 단정하지 않는다.
최신 main의 후속 개선은 운영에 아직 반영된 것으로 확인되지 않았다. 배포하지 않았다.

## Sonar 595e456 결과

Quality Gate 실패: 신규 중복 5.2% (한도3%), Security E, Reliability D.
API 미해결 BUG/VULNERABILITY 38건, 신규 기간22건. 로컬 테스트 성공과 별개이다.

- 신규 QA 고정 임시 경로7건: 공유 임시 디렉터리에 예측 가능한 출력 이름이 있어 같은 기기 다른 사용자의 사전 경로/심볼릭 링크에 영향을 받을 수 있다. 운영 웹 취약점이 아니라 개발 검증 스크립트의 파일 출력 문제. 본 변경으로 기본 출력을 원자적으로 생성하는 고유 private 디렉터리로 교체했다. 운영자가 명시한 출력 경로는 유지한다.
- firebaseSession.ts의 auth/unsupported-host: 비밀이 아닌 오류 코드 문자열. 비밀 값으로 취급한 탐지는 코드 확인상 오탐이다. 이슈 상태를 임의 변경하거나 suppress하지 않았다.
- 정렬 경고: PWA 파일 목록, motionCoverage 배열 비교, sequenceValidation 비교 등 문자열의 안정적 비교/동일성 목적이 포함된다. localeCompare 일괄 변경은 환경별 해시/동일성 변경 위험 때문에 하지 않았다. 이 경고만으로 실제 동작 고장이라고 단정하지 않는다.
- backup-compatibility-rollback의 PATH 4건, PWA 점검 CLI 파일 읽기2건은 로컬 개발 도구 경고이며 이번 변경에서 모두 해결한 것으로 주장하지 않는다.
- koreanVoiceNarration의 동일 분기: 양 플랫폼 모두 같은 회복 전략을 반환한다. 중복 코드 경고이며 현재 사용자 동작 차이는 없다.
- 신규 기간 밖16건에는 기존 데이터 정렬/동적 ledger 검증, 미리보기 클릭 핸들러, CSS line-height 덮어쓰기가 포함된다. 후속 검토 필요.
- 코드 중복 게이트는 이번 경로 보완과 별개로 남는다.

## 검증

- Node 회귀: 고유 디렉터리, POSIX private 모드, 명시 경로 재사용 시 기존 결과 보존.
- 전체190파일/2095테스트, 타입/린트/빌드/PWA 통과.
- 변경한 브라우저 스크립트7개를 기본 임시 경로로 실행. 6개 사용자 흐름 및 classPlanReview fixture 통과.
- classPlanReview의 첫 실행에서 resolve import 누락을 발견해 복구하고 성공 재실행. 제품 코드는 변경하지 않았다.
- Gemini 새 요청, 운영 배포, 사용자 데이터 변경 없음. 품질 게이트 통과를 주장하지 않는다.

## 기존 작업

Gemini 통합 f963706은 main 포함 및 clean. handoff 원본은 다수 미커밋 변경이 있어 수정/삭제/덮어쓰기하지 않았다.
presets 분기의 개별 패치는 git cherry 기준 main에 모두 포함. 옛 auth/AI/release 브랜치에는 재작성된 대응 커밋2531339/644d4da/bab6ae3가 main에 존재하여 무조건 재머지하지 않았다.
