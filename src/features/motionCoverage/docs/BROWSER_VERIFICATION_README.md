# motionCoverage 독립 로컬 검증

이 feature는 검수용 모듈이며 운영 앱/라우터/수업 시계에 연결되지 않았습니다. 정식 모션, 전문가·해부학 검증 또는 실제 WebGL 3D 완료를 뜻하지 않습니다. 원본 snapshot의 출처와 검증 한계는 `INTEGRATION_PROVENANCE.md`에 기록했습니다.

## 설치 없이 실행

이미 설치된 Playwright 모듈과 Chrome/Chromium 실행파일을 사용합니다. 아래 환경변수는 해당 컴퓨터에서 확인한 실제 경로로 지정하세요. 모듈이 프로젝트에 설치되어 있고 기본 Chromium이 존재하면 생략할 수 있습니다. runner는 패키지나 브라우저를 설치·다운로드하지 않습니다.

```sh
PLAYWRIGHT_MODULE_PATH=/existing/playwright \
CHROMIUM_PATH=/existing/chrome \
node src/features/motionCoverage/verifyMotionCoverageBrowser.mjs \
  --json-out /tmp/motion-coverage-browser-report.json \
  --failure-dir /tmp/motion-coverage-failures
```

localhost 임시 Vite 서버와 새 브라우저/격리 context만 사용하며 사용자 profile을 열지 않습니다. Chromium sandbox를 유지하고 외부 HTTP 요청을 차단합니다. finally에서 자신이 연 page/context/browser/server만 정리합니다. JSON의 실패 수가 0이 아니면 exit 1이며 실패 시 screenshot과 DOM을 저장합니다.

## 검증 범위

- 직접 API: 98개 catalog sweep, 이산/연속 구분, 기존 98개 pose 참조 재사용, 실제 snapshot에서 센 준비/승인 flags, 속도·반복 허용값/거절값.
- Chromium DOM: 320px/390px 가로 넘침과 버튼/select/range 44px 크기, 대표 4모드, 속도·반복·변형 전환·seek/play/pause.
- 실제 키보드: native range와 버튼을 stage 단축키가 가로채지 않음.
- runtime reduced-motion: 실행 즉시 정지하며 명시적 재생도 우회하지 못함. 수동 정지 단계/seek는 계속 제공.
- pagehide/pageshow, active=false, hidden/CSS, offscreen, detached host에서 정지. 돌아와도 자동 재개하지 않음.
- resolveOptions 변경은 이전 controller를 정지 상태로 동기화. 동일 옵션 rerender는 진행을 유지.
- 반복 mount/play/unmount에서 잔류 RAF 0건.

브라우저의 비동기 React 반영은 기다린 후 DOM을 검증합니다. API 직접 호출과 실제 DOM/키보드 검증은 보고서에서 분리합니다. 뷰포트 에뮬레이션이며 모바일 실기기 검증은 아닙니다.

## 소스 경계

- selectors: 순수 목록/필터/선택/상태 어댑터.
- lifecycle: lazy useState controller, StrictMode-safe 구독과 host/옵션 동기화.
- stage: 기존 figure와 이산 도해, 수동 조작과 정직한 상태 표시.
- shell: 독립 catalog 순회 UI. 수업 좌우/반전 대체 컴포넌트가 아님.
- controller: 기존 DraftPlaybackController 재사용, 명시적 play만 허용, 정지/재시작 후 오래된 callback 무효화.

shared evidence 함수 내부에서 overlay를 계산하는 이전 Patch 1은 재귀 위험 때문에 폐기했습니다. 외부 wrapper/독립 UI 합성만 안전한 방향입니다. 검토 기록은 작성 gate가 아니며 수정 노트가 catalog 원본의 검증 상태를 물려받지 않습니다.

## 단위/타입 검사

기존 설치의 실행파일을 직접 사용합니다. 패키지 매니저의 자동 재설치 흐름은 사용하지 않습니다.

```sh
node node_modules/vitest/vitest.mjs run src/features/motionCoverage
node node_modules/typescript/bin/tsc -b --pretty false
node node_modules/eslint/bin/eslint.js src/features/motionCoverage
```

원본 baseline은 3파일 19테스트와 tsc가 통과했습니다. 과거 자체 보고의 54개를 이 feature의 재현된 개수로 쓰지 않습니다. 보정 후 결과는 `INTEGRATION_PROVENANCE.md`와 실제 JSON 보고서를 확인하세요. 전체 프로젝트 suite/build 및 최종 push는 통합 담당자가 수행합니다.
