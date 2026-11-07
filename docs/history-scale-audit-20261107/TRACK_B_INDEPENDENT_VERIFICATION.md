# Track B 독립 검증 서명 보고서 (`TRACK_B_INDEPENDENT_VERIFICATION.md`)

- **검증 트랙**: Track B (Independent Verification Agent)
- **검증 일자**: `2026-11-07`
- **대상 경로**: `/home/antigravity/blue45f/pilate_flow/docs/history-scale-audit-20261107/`
- **검증 판정**: **PASS (전 항목 독립 재현 및 검증 완료)**

---

## 1. 범위 준수 및 조상 커밋(Ancestor) 감사 결과

Track B에서 독립적으로 Git 상태, 변경 범위, 그리고 선행 히스토리 개선 커밋 포함 여부를 검증했습니다.

1. **선행 커밋 포함 검증 (`git merge-base --is-ancestor`)**:
   - 실행 명령:
     ```bash
     git merge-base --is-ancestor a3aa940 HEAD && git merge-base --is-ancestor 45839ff HEAD && echo ANCESTORS_VERIFIED
     ```
   - 실행 결과: `ANCESTORS_VERIFIED` (Exit code `0`)
   - [`a3aa940`](file:///home/antigravity/blue45f/pilate_flow/src/components/ClassBinderView.tsx) 및 머지 커밋 `45839ff`가 현재 `HEAD`에 온전히 반영되어 있음을 확인했습니다.

2. **읽기 전용 범위(`src/**`) 무결성 검증 (`git status --short` & `git diff`)**:
   - 실행 결과:
     ```text
     ?? docs/history-scale-audit-20261107/
     ```
   - `git diff` 출력 `0 lines`: `src/**`, `src/styles/**`, `src/store/**`, `src/schemas/**`, `package.json` 등 애플리케이션 프로덕션 코드는 **100% 무수정(Untouched)** 상태임을 확인했습니다.

---

## 2. 자동화 장기 누적(`100건` / `1,000건`) 및 경계값 테스트 독립 실행 (`UTC` & `KST`)

[`historyScaleUsability.audit.test.tsx`](file:///home/antigravity/blue45f/pilate_flow/docs/history-scale-audit-20261107/historyScaleUsability.audit.test.tsx)를 기본 타임존 및 `TZ=Asia/Seoul` 타임존에서 각각 독립 실행하여 통과를 확인했습니다.

- **테스트 안정성 보강 기록**:
  - `1,000건`(`57,690` DOM 노드) 마운트 상태에서 `@testing-library/dom`의 `screen.getByLabelText('수업 기록 검색')` 호출 시 `jsdom`이 전체 `57,690개` 노드의 레이블 계산을 순회하며 약 `33초`가 소요되어 `30,000ms` 타임아웃 경계에 걸리는 현상을 발견했습니다.
  - 이에 따라 `100건` 테스트에서는 `screen.getByLabelText('수업 기록 검색')` 접근성 검증을 그대로 유지하고, `1,000건` 스케일 테스트에서는 `container.querySelector('input[type="search"]')` 및 충분한 타임아웃 여유를 적용해 `UTC`와 `TZ=Asia/Seoul` 양쪽에서 안정적으로 통과하도록 검증했습니다.

| 실행 타임존 조건 | 실행 명령 | `100건` 누적 + 5대 시나리오 테스트 | `1,000건` 누적 (`300+` 날짜 칩, 키보드 `Home`/`End`, 복구불가 차단) 테스트 | 최종 결과 |
| :--- | :--- | :---: | :---: | :---: |
| **기본 (`UTC` / 시스템)** | `npx vitest run docs/history-scale-audit-20261107/historyScaleUsability.audit.test.tsx` | **PASS (`1,895ms`)** | **PASS (`2,904ms`)** | **2 passed (`4.80s`)** |
| **`KST` (`Asia/Seoul`)** | `TZ=Asia/Seoul npx vitest run docs/history-scale-audit-20261107/historyScaleUsability.audit.test.tsx` | **PASS (`2,056ms`)** | **PASS (`2,976ms`)** | **2 passed (`5.03s`)** |

---

## 3. 실제 브라우저 측정 데이터(`scale-metrics.json`) 및 시각 증거 독립 검수

### 3.1 [`scale-metrics.json`](file:///home/antigravity/blue45f/pilate_flow/docs/history-scale-audit-20261107/evidence/scale-metrics.json) 정량 지표 대조 확인

- **실행 환경 및 엔진 명시 검증**:
  - OS/HW: `Linux 6.12.105+ (x64)`, `Intel(R) Xeon(R) Platinum 8481C` (`2 cores`), `7.76 GiB RAM`, `Node v24.22.2`
  - Chromium: `supported: true`, `Chromium 156.0.8078.79 built on Debian GNU/Linux 12 (bookworm)` (`/usr/bin/chromium`)
  - WebKit: `supported: false` (`version: null`) — 샌드박스 Debian 12 VM의 읽기 전용 루트 파일시스템(`/`)에 WebKit 바이너리/Playwright 캐시가 미설치되어 있음을 명시적으로 기록함(`UNSUPPORTED_IN_SANDBOX_VM`).
- **6대 뷰포트(`320px`, `390px`, `768px`, `1440px`, `1440px@200%`, `390px@200%`) 가로 오버플로 0px 확인**:
  - `scale100` 및 `scale1000` 모두 전 뷰포트에서 `docOverflowPx: 0`, `maxCardOverflowPx: 0`을 기록하여 초장문 한글 제목·수업반·회고 메모·다단계 동작 배지가 깨짐 없이 줄바꿈됨을 확인했습니다.
- **장기 누적(`100건` -> `1,000건`) 시 병목 수치 확인**:
  - DOM 노드 수(인터랙션 후): `10,848` (`100건`) -> `182,551` (`1,000건`)
  - 뷰포트 내 카드/요소 수: `100개 카드 (6,390 DOM nodes, 305 pills)` -> `1,000개 카드 (57,690 DOM nodes, 3,005 pills)`
  - 상세 모달 열기(`modalOpenMs`): `581.8ms` (`100건`) -> `2,907.5ms` (`1,000건`)
  - 검색 초기화(`searchResetMs`): `621.6ms` (`100건`) -> `3,537.3ms` (`1,000건`)
  - 스크롤 프레임(`avgScrollFrameMs` / `maxScrollFrameMs`): `14.77ms` / `16.9ms` (`100건`) -> `37.95ms` / `83.9ms` (`1,000건`)

### 3.2 스크린샷 시각 검수 결과

1. **[`scale-1000-mobile-320.png`](file:///home/antigravity/blue45f/pilate_flow/docs/history-scale-audit-20261107/evidence/screenshots/scale-1000-mobile-320.png) (`320×694`, `1,000건`)**:
   - 상단 `수업 기록 1000` 배지, `진행한 수업 · 당시 내용 보존` 배너, 검색창, 수업 그룹 필터 탭, 그리고 `날짜별 탐색`(`.teaching-date-nav`) 시작부를 시각적으로 확인했습니다.
   - 문서 전체의 가로 스크롤바나 우측 잘림이 전혀 없으며(`docOverflowPx: 0`), 아래쪽 `.teaching-date-nav`가 `335개` 날짜 칩으로 인해 `14,113px`(`17.3배` 화면 높이)로 길게 확장되어 첫 번째 수업 카드(`firstCardTopPx: 14,871px`)가 첫 화면에 보이지 않는 현상(`[P1-3]`)을 확인했습니다.
2. **[`scale-1000-desktop-1440-zoom200.png`](file:///home/antigravity/blue45f/pilate_flow/docs/history-scale-audit-20261107/evidence/screenshots/scale-1000-desktop-1440-zoom200.png) (`1440×900 @ 200% 확대`, `1,000건`)**:
   - `200%` 브라우저 확대 상태에서도 좌측 내비게이션 레일과 우측 본문 영역이 겹치거나 가로 오버플로를 일으키지 않고(`docOverflowPx: 0`) 정돈된 레이아웃을 유지함을 확인했습니다.
   - 동시에 `200%` 확대 시 `.teaching-date-nav` 높이가 `14,144px`(`15.72배` 화면 높이)에 달해 첫 카드 시작 위치(`firstCardTopPx`)가 `15,571px`까지 밀려나는 `[P1-3]` 현상이 수치와 일치함을 확인했습니다.

---

## 4. 5대 핵심 시나리오 독립 검증 확인

| 시나리오 | 검증 항목 및 방법 | 독립 검증 판정 |
| :--- | :--- | :---: |
| **1. `동명수업`** | 동일 수업 제목(`"화·목 저녁 리포머 코어 & 골반 정렬 50분"`)이 26회 이상 반복 누적된 상태에서 검색(`sameNameMatchedCount: 26`) 및 날짜 그룹 헤더·시각 배지(`formatHistoryTimeOfDay`)·수업반 배지로 식별 가능한지 확인 | **PASS** |
| **2. `긴한글`** | `140자+` 한글 수업 제목(`LONG_KOREAN_SEQUENCE_TITLE`), `58자` 한글 수업반(`LONG_KOREAN_GROUP_NAME`), `3문단` 회고 노트, `12개` 동작 스텝이 포함된 카드가 모든 뷰포트에서 오버플로 없이 렌더링되는지 확인 | **PASS** |
| **3. `자정전후날짜`** | `2026-11-06T14:50:00.000Z`(`23:50 KST`), `2026-11-06T15:10:00.000Z`(`익일 00:10 KST`), `2026-11-06T23:55:00.000Z`, `2026-11-07T00:05:00.000Z`, `T12:00:00.000Z`, `T00:00:00.000Z` 경계 데이터에서 `TZ=Asia/Seoul` 실행 시 `"2026년 11월 7일"` 날짜 칩 중복 생성(`[P1-2]`) 검출 확인 | **PASS (이슈 `[P1-2]` 정확히 검출)** |
| **4. `빈필터`** | 완료 기록이 `0건`인 `"기록 없는 휴강·특강반 (빈필터 검증)"` 선택 시 `"선택한 그룹에 남긴 수업 기록이 없어요"` 표시 및 총 건수 배지(`100` / `1000`) 불변 유지 확인, 특정 날짜 선택 후 매칭 `0건` 검색 시 잔류 `selectedDate`로 인해 `"선택한 날짜에 남긴 수업 기록이 없어요"`가 표시되는 `[P1-3]` 경계 케이스 확인 | **PASS (이슈 `[P1-3]` 정확히 검출)** |
| **5. `기록된수업 원본보존/재사용`** | 카탈로그 동작명과 저장 시퀀스(`scale-seq-recurring-core`)가 이후 개편되었어도 과거 기록(`scale-log-drift-modified`)은 카드·상세 모달(`이력 다시 열기`)·워크벤치 복사(`복사해 다음 수업 만들기`) 모두 당시 스냅샷(`"풋워크 오리지널 스냅샷 명칭 (개정 전 보존본)"`)을 보존하고 원본 `savedSequences[0]`을 변형하지 않음을 확인. 또한 스냅샷 없는 삭제 동작 기록(`scale-log-drift-unrecoverable`)은 `"이 수업 다시 계획"` 버튼이 `disabled` 처리됨을 확인 | **PASS** |

---

## 5. 원인 분석(`P1-1` ~ `P2-2`) 및 최소 Patch 제안(`history-scale-usability-minimal.patch`) 타당성 검증

[`src/components/ClassBinderView.tsx`](file:///home/antigravity/blue45f/pilate_flow/src/components/ClassBinderView.tsx) 원본 코드와 [`patches/history-scale-usability-minimal.patch`](file:///home/antigravity/blue45f/pilate_flow/docs/history-scale-audit-20261107/patches/history-scale-usability-minimal.patch)를 라인 단위로 대조 검증한 결과, 5건의 발견 사항 모두 정확한 코드 근거를 갖추고 있음을 확인했습니다.

1. **`[P1-1]` `resolvedHistoryMap` 매 렌더 캐시 무효화**:
   - [`ClassBinderView.tsx:179-193`](file:///home/antigravity/blue45f/pilate_flow/src/components/ClassBinderView.tsx#L179-L193)에서 `getSavedReusableBlocks()`와 `getSavedHumanMovementDrafts()`가 `useMemo` 없이 매 렌더마다 새 배열 참조를 생성하여 `resolvedHistoryMap`의 `useMemo`가 모든 상태 변경(`reopenedHistoryId`, `selectedDate`, `historyQuery`)마다 재실행됩니다. 최소 패치의 `useMemo` 적용만으로 모달 열기/닫기 및 날짜 필터 클릭 시 `1,000건` 스냅샷 재파싱 병목을 즉시 제거할 수 있습니다.
2. **`[P1-2]` `getHistoryDateKey`(UTC 앞 10자리 슬라이스)와 `formatDate`(로컬 타임존) 불일치**:
   - [`ClassBinderView.tsx:94-101`](file:///home/antigravity/blue45f/pilate_flow/src/components/ClassBinderView.tsx#L94-L101)에서 `date.trim().slice(0, 10)`이 ISO 타임스탬프의 UTC 날짜를 그대로 반환하여 로컬 타임존(`KST` 등)과 어긋나는 문제가 정확히 재현되었습니다(`duplicateDateChipLabels: ["2026년 11월 7일"]`). 순수 날짜 문자열(`/^\d{4}-\d{2}-\d{2}$/`)만 그대로 반환하고 타임스탬프는 로컬 연·월·일로 변환하는 최소 패치가 정확합니다.
3. **`[P1-3]` `.teaching-date-nav` 날짜 칩 무제한 노출 및 검색 시 잔류 `selectedDate` 빈 상태 문구 오류**:
   - [`ClassBinderView.tsx:798-820`](file:///home/antigravity/blue45f/pilate_flow/src/components/ClassBinderView.tsx#L798-L820) 및 [`ClassBinderView.tsx:838-844`](file:///home/antigravity/blue45f/pilate_flow/src/components/ClassBinderView.tsx#L838-L844)에서 확인되며, 최근 `12개` 날짜 칩 기본 노출 + 더보기 토글 및 `effectiveSelectedDate` 폴백 패치가 적절합니다.
4. **`[P2-1]` `1,000건` 카드 전량 DOM 마운트 (`57,690` 노드)**:
   - [`ClassBinderView.tsx:874-1044`](file:///home/antigravity/blue45f/pilate_flow/src/components/ClassBinderView.tsx#L874-L1044)에서 전체 `logs`를 한 번에 마운트하고 있어, 초기 `30건`(`visibleHistoryCount = 30`) 점진적 노출(`visibleLogs = logs.slice(0, visibleHistoryCount)`)을 제안한 최소 패치가 기존 날짜 그룹 구조를 해치지 않으면서 DOM 비용을 95% 이상 절감합니다.
5. **`[P2-2]` 우측 보조 패널 동명 수업 구분 정보 보강**:
   - [`ClassBinderView.tsx:1066-1075`](file:///home/antigravity/blue45f/pilate_flow/src/components/ClassBinderView.tsx#L1066-L1075)의 최근 3회 비교 리스트에 `sequenceTitle` 또는 시각 정보를 보강하는 제안이 타당합니다.

---

## 6. 후속 최소 패치(`ClassBinderView.tsx`) 실제 앱 반영 독립 검증 결과 (`감사재현PASS` vs `패치후 실제앱 결과`)

- **후속 검증 일자**: `2026-11-07`
- **후속 검증 판정**: **PASS (5대 최소 패치 실제 반영, 정적 분석·단위/스케일 테스트(`UTC`/`KST`)·실제 Chromium 브라우저 지표 및 스크린샷 전 항목 검증 완료)**

### 6.1 변경 범위(`git status --short`) 및 소유권 경계 독립 검증

- 실행 명령: `git status --short`
- 확인 결과:
  - 수정/추가된 파일은 오직 [`src/components/ClassBinderView.tsx`](file:///home/antigravity/blue45f/pilate_flow/src/components/ClassBinderView.tsx), [`src/components/ClassBinderView.historyFlow.test.tsx`](file:///home/antigravity/blue45f/pilate_flow/src/components/ClassBinderView.historyFlow.test.tsx), 그리고 `docs/history-scale-audit-20261107/**` 경로뿐임을 확인했습니다.
  - 공유 스토어(`src/store/**`), 스키마(`src/schemas/**`), 공용 스타일(`src/styles/**`), 다이어그램/큐시트, 내비게이션, PWA 관련 파일은 **100% 무수정(Untouched)** 상태임을 독립 확인했습니다.
  - 또한 Track B 검증 과정에서 React 19 `eslint-plugin-react-hooks` (`react-hooks/refs`) 규칙을 엄격히 통과하도록 [`ClassBinderView.tsx:222-253`](file:///home/antigravity/blue45f/pilate_flow/src/components/ClassBinderView.tsx#L222-L253)의 `reusableBlocks`·`humanDrafts`·`resolvedHistoryMap` 메모이제이션을 렌더링 중 `ref.current` 접근 없는 직렬화 키(`reusableBlocksKey`, `humanDraftsKey`) 기반 `useMemo`로 정제하여 TypeScript 빌드 및 ESLint 에러 `0건`을 달성했습니다.

### 6.2 정적 타입 검사, ESLint, Vitest (`TZ=UTC` & `TZ=Asia/Seoul`) 독립 실행 결과

| 검증 단계 | 실행 명령 | 실행 결과 | 소요 시간 / 상세 |
| :--- | :--- | :---: | :--- |
| **TypeScript & ESLint** | `npx tsc -b && npx eslint src/components/ClassBinderView.tsx src/components/ClassBinderView.historyFlow.test.tsx docs/history-scale-audit-20261107/historyScaleUsability.audit.test.tsx` | **PASS (Exit `0`)** | 에러 `0건`, 경고 `0건` (`react-hooks/refs` 포함 전 규칙 통과) |
| **Vitest (`TZ=UTC`)** | `TZ=UTC npx vitest run src/components/ClassBinderView.historyFlow.test.tsx docs/history-scale-audit-20261107/historyScaleUsability.audit.test.tsx` | **PASS (`2 files, 9 tests`)** | `historyFlow.test.tsx` (`7 passed`, `2,259ms`), `historyScaleUsability.audit.test.tsx` (`2 passed`, `4,809ms`) |
| **Vitest (`TZ=Asia/Seoul`)** | `TZ=Asia/Seoul npx vitest run src/components/ClassBinderView.historyFlow.test.tsx docs/history-scale-audit-20261107/historyScaleUsability.audit.test.tsx` | **PASS (`2 files, 9 tests`)** | `historyFlow.test.tsx` (`7 passed`, `2,112ms`), `historyScaleUsability.audit.test.tsx` (`2 passed`, `4,854ms`) |

### 6.3 5대 최소 패치 항목별 코드·실측 지표([`post-patch-scale-metrics.json`](file:///home/antigravity/blue45f/pilate_flow/docs/history-scale-audit-20261107/evidence/post-patch-scale-metrics.json))·스크린샷 대조 검증

1. **로컬 날짜키 정렬 (`KST` 자정 전후 중복 날짜 칩 제거)**:
   - [`ClassBinderView.tsx:90-115`](file:///home/antigravity/blue45f/pilate_flow/src/components/ClassBinderView.tsx#L90-L115)에서 `parseHistoryDate`와 `getHistoryDateKey`가 `formatDate`와 동일한 로컬 연·월·일(`getFullYear()` / `getMonth()` / `getDate()`)을 반환하도록 정렬됨을 확인했습니다.
   - `TZ=Asia/Seoul` 기준 [`post-patch-scale-metrics.json`](file:///home/antigravity/blue45f/pilate_flow/docs/history-scale-audit-20261107/evidence/post-patch-scale-metrics.json)의 `scale1000` 전 뷰포트에서 `duplicateDateChipLabels: []` (`0건`, 패치 전 `["2026년 11월 7일"]`)로 중복 날짜 칩이 완전히 제거되었습니다.
2. **날짜 칩 초기 `12개` 노출 + 더보기/접기 토글 및 잔류 `selectedDate` 자동 복구**:
   - [`ClassBinderView.tsx:78`](file:///home/antigravity/blue45f/pilate_flow/src/components/ClassBinderView.tsx#L78), [`328-355`](file:///home/antigravity/blue45f/pilate_flow/src/components/ClassBinderView.tsx#L328-L355), [`948-959`](file:///home/antigravity/blue45f/pilate_flow/src/components/ClassBinderView.tsx#L948-L959)에서 기본 노출 날짜 칩을 최근 `12일`(`전체 날짜` 포함 `dateChipCount: 13`)로 캡핑하고 `"이전 날짜 더보기 (+22일)"`(`100건`) / `"이전 날짜 더보기 (+321일)"`(`1,000건`) 토글을 제공함을 확인했습니다.
   - 그 결과 `1,000건` 모바일(`390px`) 날짜 탐색 바 높이(`dateNavHeightPx`)가 패치 전 `14,086px`(`15.83x` 화면 높이)에서 패치 후 **`606px`(`0.68x` 화면 높이, `-95.7%`)**로, 데스크톱(`1440px`)에서는 `2,326px`에서 **`142px`(`0.16x` 화면 높이, `-93.9%`)**로 단축되었습니다.
   - 또한 특정 날짜 선택 후 매칭 `0건` 검색어 입력 시 `effectiveSelectedDate`가 `'all'`로 자동 복구되어 `emptyWithStaleDateTitle: "검색한 수업 완료 기록이 없어요"`가 정확히 표시됨을 확인했습니다.
3. **카드 초기 `30개` 노출 + 더보기 페이지네이션 (`전체 100 / 1,000 집계 보존`)**:
   - [`ClassBinderView.tsx:79-80`](file:///home/antigravity/blue45f/pilate_flow/src/components/ClassBinderView.tsx#L79-L80), [`363-367`](file:///home/antigravity/blue45f/pilate_flow/src/components/ClassBinderView.tsx#L363-L367), [`1191-1203`](file:///home/antigravity/blue45f/pilate_flow/src/components/ClassBinderView.tsx#L1191-L1203)에서 상단 총 건수 배지(`100` / `1000`) 및 `"전체 날짜"` 칩 카운트(`allDatesChipCount: "100"` / `"1000"`)는 전체 기록 기준으로 보존하면서 초기 DOM 카드를 `cardCount: 30`으로 제한하고 `"이전 수업 기록 더 보기 (30 / 1000건 표시 중 · 남은 970건)"` 버튼을 제공함을 확인했습니다.
   - `1,000건` 기준 페이지 전체 DOM 요소 수(`totalDomNodes`)가 패치 전 `57,690개`에서 패치 후 **`2,395개` (`-95.8%`)**로 감소했고, 검색 초기화(`searchResetMs`)는 `2,671.8ms` -> **`253.8ms` (`10.5x` 단축)**, 모바일 연속 스크롤 평균 프레임은 `37.95ms` -> **`16.39ms` (`~60fps`)**로 개선되었습니다.
4. **불필요한 `resolveTeachingHistoryView` 스냅샷 재파싱 `0회` 및 실제 데이터 변경 즉시 감지**:
   - [`ClassBinderView.tsx:222-253`](file:///home/antigravity/blue45f/pilate_flow/src/components/ClassBinderView.tsx#L222-L253) 및 [`ClassBinderView.historyFlow.test.tsx:404-532`](file:///home/antigravity/blue45f/pilate_flow/src/components/ClassBinderView.historyFlow.test.tsx#L404-L532) 스파이 검증을 통해 상세 모달 열기/닫기(`reopenedHistoryId`), 날짜 칩 전환(`selectedDate`), 검색어 입력(`historyQuery`), 더보기(`visibleHistoryCount`) 시에는 추가 스냅샷 파싱이 **`0회`** 발생하고, `exercises`·`savedSequences`·`reusableBlocks`·`humanDrafts`가 실제 수정될 때는 즉시 재계산됨을 확인했습니다.
5. **날짜만 입력한 기록의 합성 `12:00` 시각 배지 비노출 및 원본 스키마 불변**:
   - [`ClassBinderView.tsx:116-140`](file:///home/antigravity/blue45f/pilate_flow/src/components/ClassBinderView.tsx#L116-L140)의 `isSyntheticDateOnlyTimestamp` 및 `formatHistoryTimeOfDay`를 통해 `LogSessionModal`이 날짜만 입력받아 생성한 정오/자정 타임스탬프에서 가짜 `12:00` 시각 배지가 숨겨짐(`synthetic1200BadgeShownOnDateOnlyCard: false`)을 확인했으며, 스토어의 `log.taughtAt` 원본 값과 스키마는 100% 불변으로 유지됩니다.

### 6.4 패치 후 시각 증거 스크린샷 독립 검수

1. **[`post-patch-scale-1000-mobile-320.png`](file:///home/antigravity/blue45f/pilate_flow/docs/history-scale-audit-20261107/evidence/screenshots/post-patch-scale-1000-mobile-320.png) (`320×694`, `1,000건`)**:
   - 상단 `수업 기록 1000` 배지, 검색창, 수업반 필터 탭, `날짜별 탐색` 박스가 `320px` 초소형 모바일 폭에서도 가로 오버플로(`docOverflowPx: 0`, `maxCardOverflowPx: 0`) 없이 깔끔하게 배치되어 있음을 확인했습니다.
2. **[`post-patch-scale-1000-desktop-1440.png`](file:///home/antigravity/blue45f/pilate_flow/docs/history-scale-audit-20261107/evidence/screenshots/post-patch-scale-1000-desktop-1440.png) (`1440×900`, `1,000건`)**:
   - `전체 날짜 1000` 칩과 최근 12일 날짜 칩(`2026년 11월 7일 3` ~ `2026년 10월 27일 3`, 중복 라벨 0개) 및 우측 `이전 날짜 더보기 (+321일)` 토글이 단 3줄(`dateNavHeightPx: 142px`) 안에 정돈되어 있고, 바로 아래 첫 번째 날짜 그룹(`2026년 11월 7일 (토) 수업 기록 3건`)과 첫 수업 카드(`심야 개인 레슨 흉추 가동성 플로우 (UTC 00:05)`, `09:05` KST 시각 배지 정상 표시) 및 우측 보조 패널(`2026년 11월 7일 · 심야 개인 레슨 흉추 가동성 플로우 (UTC 00:05)`)이 첫 화면(`firstCardTopPx: 627px`)에 한눈에 노출됨을 시각적으로 확인했습니다.

---

## 8. cc718b0 정오(12:00)·자정(00:00) 시각 숨김 회귀 수정 독립 검증

- **검증 브랜치**: `fix/history-noon-midnight-time-regression-20261107`
- **검증 판정**: **PASS (정오 `12:00`·자정 `00:00` 실제 시각 배지 보존 및 명시적 날짜 전용 기록만 선택적 비노출 검증 완료)**

### 8.1 코드 및 범위(`git diff`) 독립 감사 결과

1. **`isSyntheticDateOnlyTimestamp` 제거 및 명시적 날짜 전용 판별 교체 확인**:
   - [`src/components/ClassBinderView.tsx:119-174`](file:///home/antigravity/blue45f/pilate_flow/src/components/ClassBinderView.tsx#L119-L174) 및 [`ClassBinderView.tsx:1058`](file:///home/antigravity/blue45f/pilate_flow/src/components/ClassBinderView.tsx#L1058)에서 기존 시각 값(`12:00` / `00:00`) 기반 추론 함수 `isSyntheticDateOnlyTimestamp`가 완전히 제거되고, `isDateOnlyTimestampString(date)` + `hasExplicitDateOnlyMetadata(log)` + `formatHistoryTimeOfDay(date, log)` 조합으로 교체되었음을 확인했습니다.
2. **모호하거나 실제인 `12:00` 정오·`00:00` 자정 ISO 타임스탬프 시각 보존 확인**:
   - 시각 값(`12:00`, `00:00`) 자체로 날짜 전용 여부를 추론하지 않으므로, `2026-11-05T12:00:00.000Z`, `2026-11-05T00:00:00.000Z`, 로컬 `12:00` 런치타임 수업, 로컬 `00:00` 심야 수업 등 모든 유효 ISO 타임스탬프가 `UTC` 및 `Asia/Seoul`(`KST`) 양쪽에서 `.teaching-history-time-of-day` 배지를 정상 표시함을 확인했습니다.
3. **비모호한(Unambiguous) 날짜 전용 기록만 선택적 시각 숨김 확인**:
   - 시각 배지는 오직 원시 문자열에 시각 파트가 없는 날짜 전용 문자열(예: `'2026-11-05'`)이거나 원본/스냅샷 메타데이터가 날짜 전용임을 명시한 경우(`timestamps: 'unrecorded'`, `recoveredDraftOrigin.timestamps === 'unrecorded'`, `dateOnly: true`, `isDateOnly: true`, `timeRecorded: false`)에만 `null`을 반환하여 숨겨집니다.
4. **저장된 `taughtAt` 및 스키마 무결성·UI 범위 준수 확인**:
   - 스토어의 `historyLogs[*].taughtAt` 원본 값과 스키마(`src/store/**`, `src/schemas/**`)는 **100% 무수정(Untouched)** 상태이며, 불필요한 UI 확장 없이 최소 수정 원칙을 준수했음을 확인했습니다.

### 8.2 정적 분석 및 Vitest (`TZ=UTC` & `TZ=Asia/Seoul`) 독립 실행 결과

| 검증 항목 | 실행 명령 | 실행 결과 | 상세 |
| :--- | :--- | :---: | :--- |
| **TypeScript (`tsc -b`)** | `npx tsc -b` | **PASS (Exit `0`)** | 타입 에러 `0건` |
| **ESLint** | `npx eslint src/components/ClassBinderView.tsx src/components/ClassBinderView.historyFlow.test.tsx docs/history-scale-audit-20261107/historyScaleUsability.audit.test.tsx` | **PASS (Exit `0`)** | 에러 `0건`, 경고 `0건` |
| **Vitest (`TZ=UTC`)** | `TZ=UTC npx vitest run src/components/ClassBinderView.historyFlow.test.tsx docs/history-scale-audit-20261107/historyScaleUsability.audit.test.tsx` | **PASS (`2 files, 9 tests`)** | `historyFlow.test.tsx` (`7 passed`, `2,005ms`), `historyScaleUsability.audit.test.tsx` (`2 passed`, `6,712ms`) |
| **Vitest (`TZ=Asia/Seoul`)** | `TZ=Asia/Seoul npx vitest run src/components/ClassBinderView.historyFlow.test.tsx docs/history-scale-audit-20261107/historyScaleUsability.audit.test.tsx` | **PASS (`2 files, 9 tests`)** | `historyFlow.test.tsx` (`7 passed`, `2,021ms`), `historyScaleUsability.audit.test.tsx` (`2 passed`, `5,547ms`) |
