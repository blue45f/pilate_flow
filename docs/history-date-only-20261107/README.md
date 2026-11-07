# 날짜 전용 수업 기록 표시 보정

기준: ca0fef4309e5d2b416d14254579cd6ede669d1cb.
코드 검증 커밋: df181edca2e5bf1ca7c1a28370a925d921e95ff2.

## 재현과 수정

수업 기록 폼에는 날짜만 있고 시각 입력은 없습니다. 기존 폼은 날짜의 정오를 ISO로 저장하고, 기록 카드는 이를 실제 시각처럼 12:00으로 표시했습니다. 서울·UTC의 격리 Chrome 컴포넌트 흐름에서 직접 재현했습니다. 추가 단위 회귀 4개 중 새 날짜 기록/저장 보존 2개가 수정 전 실패했고, 실제 시각 보존 2개는 이미 통과했습니다.

새로 저장하는 programSnapshot에만 dateOnly: true를 추가합니다. 기존 taughtAt ISO, completionFingerprint, 계획·실제 시간, 과거 기록은 바꾸지 않습니다. 카드의 기존 날짜 전용 표시 계약을 사용하며, 사용자용 스냅샷 TXT도 해당 새 기록에는 ‘시각 미기록’을 표시합니다. 기존 명시적 정오·자정 기록은 계속 시각과 원본 ISO를 보여줍니다. 과거 정오가 임의 값인지 실제 시각인지 추측해서 바꾸지 않습니다.

## 실제 검증

- 수정 전 main: 빌드 후 221파일 2,421테스트 통과.
- 수정 후보: 관련 5파일 43테스트 통과, UTC에서 새 회귀 4개 추가 통과.
- 새 기록 → localStorage → 재수화, JSON 전체 백업 → backend parse → restoreBackup에서 metadata와 전체 snapshot 보존 확인. 실제 계정이나 사용자 자료는 사용하지 않았습니다.
- 실제 설치된 Google Chrome, 320/390/768/1440px × Asia/Seoul/UTC 8조합 통과. 새 기록에 임의 시각 배지 없음, 기존 12:00·00:00 유지, 가로 넘침 및 pageerror 없음. before-browser.json, after-browser.json, 대표 모바일/데스크톱 캡처를 포함합니다.
- 브라우저 확인은 실제 LogSessionModal과 ClassBinderView를 연결한 합성 컴포넌트 흐름입니다. 전체 앱 사용 여정, 물리 기기 또는 Safari 검증을 의미하지 않습니다.
- 코드 커밋 df181ed의 깨끗한 작업 트리에서 222파일 2,425테스트 통과(203.26초). Linux 전용 CueSheet Chromium/PDF 파일 1개는 제외했습니다. 수정 중 실행은 작업 트리 무변경 감사 1건이 실패했으며, 검사 완화 없이 커밋 후 전체 재실행으로 통과했습니다.
- frontend/backend 타입·변경 파일 lint·production build·PWA 43파일·motion ledger 22항목 및 node 회귀 6개 통과. 기존 큰 번들 경고는 남아 있습니다.
- 저장소에 포함한 브라우저 runner도 코드 커밋을 기준으로 8조합 재실행해 통과했습니다. after-browser.json의 head가 해당 코드 커밋입니다.
- 기준 main ca0fef4의 외부 SonarCloud 검사는 이미 실패 상태였습니다(중복 8.6%, 신뢰성 D, 보안 E). 이 로컬 회귀 통과가 기존 외부 품질 게이트 통과를 의미하지 않습니다.

## 재현

기존 의존성을 사용하고 새 설치 없이 실행합니다.

- node node_modules/vitest/vitest.mjs run src/components/LogSessionModal.dateOnly.test.tsx
- TZ=UTC node node_modules/vitest/vitest.mjs run src/components/LogSessionModal.dateOnly.test.tsx
- node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 5264 --strictPort
- 별도 셸에서 BASE_URL=http://127.0.0.1:5264/ 및 PLAYWRIGHT_MODULE을 기존 설치된 Playwright 경로로 지정한 뒤 node scripts/qa/history-date-only-browser.cjs 실행.

전체 검사 순서는 타입/lint → build/PWA → tests입니다. 번들 경계 검사는 이미 생성된 dist를 요구합니다. Mac에서는 하드코딩된 /usr/bin/chromium, /usr/bin/pdfinfo, /usr/bin/pdftotext, /usr/bin/pdftoppm이 없어 src/features/classCueSheet/classCueSheetChromium.test.ts의 실제 PDF 검사는 수행하지 않았습니다. 그 파일을 제외한 통과를 전체 플랫폼 통과라고 표시하지 않습니다.

운영 배포는 실행하지 않았습니다. Firebase 설정은 기존 수동 배포이며 저장소 webhook은 0개입니다. GitHub Pages 과거 동적 실행은 gh-pages 브랜치로 main과 분리되어 있습니다.
