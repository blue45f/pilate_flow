# 로컬 통합 QA 서버 경로 경계 보정

기준 main: c55e1f912a280ea7fff6c648641c425c2295b8c0.

## 범위와 재현

기존 createControllableStaticServer는 loopback에서만 쓰는 통합 검증 도구입니다. src/backend와 운영 배포에 연결된 서버가 아니며 운영 앱 취약점으로 확대하지 않습니다.

기존 문자열 startsWith(distRoot) 검사 때문에 dist-canary 같은 형제 폴더가 dist 내부로 잘못 취급됐습니다. 원본 함수와 임시 합성 파일만 사용해 인코딩된 상위 경로 요청이 형제 canary를 HTTP 200으로 반환하는 것을 재현했습니다. 사용자 파일이나 비밀에는 접근하지 않았습니다. 외부 symlink도 같은 문제가 있었고, 잘못된 URL 인코딩은 처리되지 않은 URIError를 만들었습니다.

새 회귀 9개를 원본 함수에 먼저 적용한 결과 6개 통과, 3개 실패(형제 폴더, 외부 symlink, 잘못된 URL)였습니다.

## 수정

서버만 controllable-static-server.mjs로 분리하고 기존 통합 runner에서 import합니다. MIME 표와 오프라인 전환·소켓 정리 계약을 보존했습니다.

- 경로를 정규화한 뒤 path.relative로 상위/절대 경로 경계를 검사합니다.
- realpath로 symlink를 해석한 결과도 같은 경계 안인지 검사합니다.
- 경계 확인 전에 범위 밖 후보 파일의 존재나 내용을 조회하지 않습니다.
- 잘못된 인코딩과 null byte는 400, 범위 밖·누락·읽을 수 없는 파일은 경로를 포함하지 않는 404로 반환합니다.
- 정상 내부 symlink, 동적 빌드 파일 읽기, MIME/no-cache, 오프라인 차단과 재개를 유지합니다.
- 빌드 루트는 신뢰된 로컬 디렉터리이며 요청 중 공격자가 파일 시스템 자체를 변경하는 상황까지 격리하는 서버는 아닙니다.

## 검증과 한계

- node --test docs/integration-round4-20261107/controllable-static-server.node-test.mjs: 9/9 통과.
- 변경한 JavaScript 세 파일에 ESLint recommended: 오류·경고 0.
- 기존 통합 runner의 구문 검사 통과.
- 기존 production build의 실제 59개 파일을 새 서버로 요청해 status 200 및 원본 바이트 SHA256 일치 확인.
- 새 격리 Chrome 390/1440px에서 실제 앱 시작, pageerror 0 확인. static-server-build-verification.json에 범위와 결과를 기록했습니다.
- PWA build checker의 대상 정적 파일 43개·manifest·PNG 확인 통과.
- src/backend/package/lockfile/build/deploy 설정은 변경하지 않았습니다.
- 전체 Linux 전용 round4 UI 시나리오나 전체 앱 회귀를 새로 실행한 것은 아닙니다. 해당 runner의 기존 /home/antigravity 경로와 Chromium 의존성을 변경하지 않았습니다.
- 운영 배포는 수행하지 않았습니다. 외부 SonarCloud 결과는 원격 후속 커밋 분석으로 별도 확인합니다.
