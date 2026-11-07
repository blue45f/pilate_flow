# Pilates 수업 기록/히스토리 장기 누적 데이터(100 / 1,000건) 사용성 독립 검증 보고서 (`2026-11-07`)

## 1. 검증 개요 및 범위 준수 확인

- **대상 커밋 확인 (`origin/main`)**:
  - `45839ff` (`Merge branch 'feat/parallel-page-history-20261107'`: 날짜별 탐색/재사용 동선 개선 본 머지)
  - `a3aa940` (`feat(history): improve date-grouped navigation, reuse flow, and mobile layout on class history page`)
  - 현재 최신 `origin/main` (`338e7bd`)에 위 두 커밋이 모두 포함되어 있음을 확인한 상태에서 독립 검증 브랜치(`docs/history-scale-audit-20261107`)를 분기하여 검증을 수행했습니다.
- **소유 경로 및 읽기 전용 원칙 준수**:
  - **이번 작업 소유 경로**: `docs/history-scale-audit-20261107/**` (합성 fixture, 독립 Vitest 검증 테스트, 실제 Chromium CDP 벤치마크 스크립트, 측정 JSON, 뷰포트별 스크린샷 12종, 최소 patch 제안서, Track A/B 보고서)
  - **읽기 전용(`0 lines modified`)**: `src/**`, 공유 CSS(`src/styles/**`), 스토어(`src/store/**`), 스키마(`src/schemas/**`), `package.json` 등 애플리케이션 소스는 일체 수정하지 않았습니다.
  - **실제 사용자 데이터 비접촉**: 모든 테스트는 메모리 및 격리된 임시 브라우저 프로필(`/tmp/pilate-history-scale-chromium-*`)의 합성 데이터(`100건` / `1,000건`)로만 수행되었습니다.

---

## 2. 측정 환경 및 브라우저 지원 현황 (환경/조건 명시)

> [!NOTE]
> 모든 응답 시간·메모리·프레임 수치는 절대적인 단일 하드웨어 단정이 아니라 아래 실행 환경과 측정 조건에서 기록된 실측치입니다.

| 항목 | 측정 환경 및 조건 상세 |
| :--- | :--- |
| **OS / 커널** | Debian GNU/Linux 12 (bookworm), Linux `6.12.105+` (`x86_64`) |
| **CPU / RAM** | Intel(R) Xeon(R) Platinum 8481C CPU @ 2.70GHz (`2 vCPU`), RAM `7.76 GiB` |
| **런타임 / 테스트 도구** | Node.js `v24.22.2`, Vite `7.3.1`, Vitest `4.0.18` (`jsdom` + `@testing-library/react`) |
| **타임존 조건** | `Scale 100`: `UTC` (`2026-11-07`) / `Scale 1000`: `TZ=Asia/Seoul` (`KST, UTC+9`) 교차 측정 |
| **Chromium (지원 / 실측 완료)** | `Chromium 156.0.8078.79 built on Debian GNU/Linux 12 (bookworm)` (`/usr/bin/chromium`) — CDP(`Performance.getMetrics`, `Runtime.evaluate`, `Emulation.setDeviceMetricsOverride`, `Page.setPageScaleFactor`)로 `320px`, `390px`, `768px`, `1440px`, `1440px@200%`, `390px@200%` 전 뷰포트 실측 |
| **WebKit (미지원 명시)** | **미지원 (`UNSUPPORTED_IN_SANDBOX_VM`)**: 현재 실행 환경은 읽기 전용 루트 파일시스템(`/`) 및 `sudo`/`apt` 비활성 샌드박스 VM으로, 시스템에 WebKit 런타임(`libwebkit2gtk` / Playwright WebKit 브라우저 캐시 `~/.cache/ms-playwright/webkit-*`)이 설치되어 있지 않아 Chromium 실측 + CSS 표준 레이아웃 속성(`overflow-wrap: anywhere`, `min-width: 0`, `flex-wrap: wrap`) 검증으로 대체하고 미지원 사유를 명시합니다. |

---

## 3. 합성 데이터(`100건` / `1,000건`) 및 5대 경계값 시나리오 구성

[`historyScaleFixtures.ts`](file:///home/antigravity/blue45f/pilate_flow/docs/history-scale-audit-20261107/fixtures/historyScaleFixtures.ts)에서 실제 데이터 스키마([`TeachingHistoryItem`](file:///home/antigravity/blue45f/pilate_flow/src/types/domain.ts#L168-L179))를 준수하는 `100건` 및 `1,000건` 누적 데이터를 결정론적으로 생성했습니다.

1. **동명 수업 (`동명수업`)**:
   - `"화·목 저녁 리포머 코어 & 골반 정렬 50분"` 동일한 수업명(`sequenceTitle`)으로 서로 다른 날짜·시간·반에 걸쳐 **25회 이상** 반복 기록된 시나리오(`hist-same-name-0` ~ `hist-same-name-19` 및 주기적 생성 포함).
2. **초장문 한글 (`긴한글`)**:
   - `hist-long-ko`: **140자 이상 한글 수업 제목**, **58자 한글 수업반 별칭**, **3문단 줄바꿈 회고 노트(`instructorReflection`)**, **12단계(`stepsSnapshot`) 운동 목록** 포함.
3. **자정 전후 날짜 경계 (`자정전후날짜`)**:
   - `hist-midnight-utc-pre` (`2026-11-06T14:50:00.000Z` = `2026-11-06 23:50 KST`)
   - `hist-midnight-kst-post` (`2026-11-06T15:10:00.000Z` = `2026-11-07 00:10 KST`)
   - `hist-midnight-utc-2355` (`2026-11-06T23:55:00.000Z` = `2026-11-07 08:55 KST`)
   - `hist-midnight-utc-0005` (`2026-11-07T00:05:00.000Z` = `2026-11-07 09:05 KST`)
   - `hist-date-only-noon` ([`LogSessionModal.tsx`](file:///home/antigravity/blue45f/pilate_flow/src/components/LogSessionModal.tsx#L161)가 날짜만 입력받아 생성하는 `2026-11-05T12:00:00.000Z` 패턴)
4. **빈 필터 (`빈필터`)**:
   - 시퀀스만 존재하고 완료된 수업 기록은 `0건`인 수업반(`"기록 없는 휴강·특강반 (빈필터 검증용)"`), 존재하지 않는 검색어(`"존재하지않는초희귀검색어_EMPTY_FILTER_999"`), 그리고 **특정 날짜 칩 선택 상태에서 매칭 0건 검색어를 입력하는 복합 빈 상태**.
5. **기록된 수업 원본 보존 및 재사용 (`기록된수업 원본보존/재사용`)**:
   - `hist-snapshot-modified`: 기록 당시 `programSnapshot` / `stepsSnapshot`을 보유하고 있으나 이후 카탈로그 동작 이름 및 원본 시퀀스(`seq-same-name`)가 수정된 케이스 (`isCatalogModified = true`).
   - `hist-snapshot-deleted-recoverable`: 카탈로그 동작(`ex-deleted-with-snapshot`)이 삭제되었으나 `programSnapshot`에 동작 스냅샷이 보존된 케이스 (`isCatalogDeleted = true`, `isMissingUnrecoverable = false`).
   - `hist-snapshot-deleted-unrecoverable`: 레거시 기록에서 `programSnapshot` 없이 카탈로그 동작(`ex-deleted-legacy`)이 삭제되어 복구 불가한 케이스 (`isMissingUnrecoverable = true`).

---

## 4. `100건` vs `1,000건` 정량 측정 결과 요약

원본 측정 데이터는 [`scale-metrics.json`](file:///home/antigravity/blue45f/pilate_flow/docs/history-scale-audit-20261107/evidence/scale-metrics.json)에 저장되어 있습니다.

### 4.1 초기 마운트, DOM 노드, 메모리, 인터랙션 지연 비교 (`1440x900` 기준)

| 측정 지표 | 합성 기록 `100건` (`UTC`) | 합성 기록 `1,000건` (`KST, UTC+9`) | 스케일 증가율 (`10x` 데이터 대비) | 판정 및 해석 |
| :--- | :---: | :---: | :---: | :--- |
| **초기 하이드레이션 소요 시간 (`hydrateTimeMs`)** | `1,150.7 ms` | `2,670.5 ms` | `2.32x` | `1,000건` 전량 동시 마운트로 초기 진입 `2.67초` 소요 |
| **렌더링된 기록 카드 수 (`renderedCardCount`)** | `100개` | `1,000개` | `10.0x` | 페이지네이션/가상화 없이 전체 카드 즉시 렌더 |
| **렌더링된 날짜 그룹 섹션 수 (`dateGroupCount`)** | `35개` | `335개` | `9.57x` | 날짜별 `<section>` + `<header>` 335개 생성 |
| **렌더링된 날짜 필터 칩 수 (`dateChipCount`)** | `36개` (`전체`+`35일`) | `336개` (`전체`+`335일`) | `9.33x` | 상단 날짜 바에 336개 버튼 모두 노출 (`[P1-3]`) |
| **전체 HTML Element 수 (`domElementCount`)** | `5,839개` | `57,690개` | `9.88x` | 카드당 약 `57개` 엘리먼트 × `1,000건` (`[P2-1]`) |
| **CDP 전체 DOM Node 수 (초기 -> 인터랙션 후)** | `18,415` -> `19,357` | `90,119` -> `182,551` | `4.89x` -> `9.43x` | 대규모 리렌더 시 GC 전 DOM 노드 급증 |
| **JS Heap 사용량 (`JSHeapUsedSizeMB`, 초기 -> 후)** | `15.79 MB` -> `16.37 MB` | `46.50 MB` -> `95.65 MB` | `2.94x` -> `5.84x` | `resolvedHistoryMap` 매 렌더 재계산으로 힙 증가 (`[P1-1]`) |
| **CDP Layout 누적 시간 (초기 -> 인터랙션 후)** | `248 ms` -> `1,123 ms` | `1,254 ms` -> `5,305 ms` | `5.06x` -> `4.72x` | `5.7만` DOM 요소 재배치 비용 |
| **CDP Script 누적 시간 (초기 -> 인터랙션 후)** | `484 ms` -> `2,010 ms` | `2,870 ms` -> `14,007 ms` | `5.93x` -> `6.97x` | 매 상태 변경마다 `1,000건` 스냅샷 파싱 재실행 |
| **동명 수업 검색 필터 (`-> 25건` / `-> 199건`)** | `149.4 ms` | `973.8 ms` | `6.52x` | `1,000건`에서 검색 입력 반응이 약 `1.0초`로 저하 |
| **빈 필터 검색 (`-> 0건`)** | `51.8 ms` | `159.4 ms` | `3.08x` | 결과 DOM이 0개이므로 상대적으로 빠름 |
| **검색 초기화 (`0건 -> 전체 복원`)** | `621.6 ms` | `3,537.3 ms` | `5.69x` | `1,000개` 카드를 한 번에 다시 마운트하며 `3.54초` 블로킹 |
| **특정 날짜 칩 필터 클릭 (`-> 단일 날짜`)** | `92.9 ms` | `707.0 ms` | `7.61x` | `[P1-1]` 캐시 무효화로 클릭 시 `707ms` 지연 |
| **수업반 필터 (`기록 없는 반 -> 0건`)** | `67.1 ms` | `110.2 ms` | `1.64x` | 빈 상태 전환 정상 |
| **상세 모달 열기 (`이력 다시 열기`)** | `581.8 ms` | `2,907.5 ms` | `5.00x` | **`[P1-1]` 핵심 병목**: 모달 state 변경이 `1,000건` 전체 재계산 유발 |
| **상세 모달 닫기 (`Escape` 키)** | `162.7 ms` | `2,800.7 ms` | `17.21x` | 모달 닫기 시에도 `resolvedHistoryMap` 전체 재계산 |
| **원본 보존/재사용 (`이 수업 다시 계획` 클릭)** | `280.1 ms` | `1,182.9 ms` | `4.22x` | 워크벤치 복사 완료 (`원본 시퀀스 불변성 100% 유지`) |
| **모바일(`390px`) 연속 스크롤 15프레임 (`avg` / `max`)** | `14.77 ms` / `45.6 ms` | `37.95 ms` / `83.9 ms` | `2.57x` / `1.84x` | `100건`은 `60fps` 근접, `1,000건`은 평균 `26fps`로 프레임 드랍 |

---

### 4.2 뷰포트별(`320 / 390 / 768 / 1440 / 200% 확대`) 레이아웃 & 오버플로 실측

| 뷰포트 조건 | Scale `100건` 문서/카드 가로 오버플로 | Scale `100건` 날짜 칩 바 높이 (`.teaching-date-nav`) | Scale `100건` 첫 카드 시작 Y좌표 (`firstCardTopPx`) | Scale `1,000건` 문서/카드 가로 오버플로 | Scale `1,000건` 날짜 칩 바 높이 (`.teaching-date-nav`) | Scale `1,000건` 첫 카드 시작 Y좌표 (`firstCardTopPx`) |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **Mobile `320×816` (`100%`)** | **`0px` / `0px`** (PASS) | `1,471px` (`1.80x` 화면높이) | `2,229px` | **`0px` / `0px`** (PASS) | **`14,113px` (`17.30x` 화면높이)** | **`14,871px`** |
| **Mobile `390×890` (`100%`)** | **`0px` / `0px`** (PASS) | `1,486px` (`1.67x` 화면높이) | `2,244px` | **`0px` / `0px`** (PASS) | **`14,086px` (`15.83x` 화면높이)** | **`14,844px`** |
| **Tablet `768×1024` (`100%`)** | **`0px` / `0px`** (PASS) | `541px` (`0.53x` 화면높이) | `1,253px` | **`0px` / `0px`** (PASS) | **`4,951px` (`4.83x` 화면높이)** | **`5,663px`** |
| **Desktop `1440×900` (`100%`)** | **`0px` / `0px`** (PASS) | `286px` (`0.32x` 화면높이) | `848px` | **`0px` / `0px`** (PASS) | **`2,326px` (`2.58x` 화면높이)** | **`2,889px`** |
| **Desktop `1440×900` (`200%` 확대)** | **`0px` / `0px`** (PASS) | `572px` (`0.32x` 화면높이) | `1,697px` | **`0px` / `0px`** (PASS) | **`4,652px` (`2.58x` 화면높이)** | **`5,778px`** |
| **Mobile `390×890` (`200%` 확대)** | **`0px` / `0px`** (PASS) | `2,972px` (`1.67x` 화면높이) | `4,489px` | **`0px` / `0px`** (PASS) | **`28,226px` (`15.86x` 화면높이)** | **`29,742px`** |

- **시각 증거 스크린샷 경로 (`docs/history-scale-audit-20261107/evidence/screenshots/`)**:
  - `100건`: [`scale-100-mobile-320.png`](file:///home/antigravity/blue45f/pilate_flow/docs/history-scale-audit-20261107/evidence/screenshots/scale-100-mobile-320.png), [`scale-100-mobile-390.png`](file:///home/antigravity/blue45f/pilate_flow/docs/history-scale-audit-20261107/evidence/screenshots/scale-100-mobile-390.png), [`scale-100-tablet-768.png`](file:///home/antigravity/blue45f/pilate_flow/docs/history-scale-audit-20261107/evidence/screenshots/scale-100-tablet-768.png), [`scale-100-desktop-1440.png`](file:///home/antigravity/blue45f/pilate_flow/docs/history-scale-audit-20261107/evidence/screenshots/scale-100-desktop-1440.png), [`scale-100-desktop-1440-zoom200.png`](file:///home/antigravity/blue45f/pilate_flow/docs/history-scale-audit-20261107/evidence/screenshots/scale-100-desktop-1440-zoom200.png), [`scale-100-mobile-390-zoom200.png`](file:///home/antigravity/blue45f/pilate_flow/docs/history-scale-audit-20261107/evidence/screenshots/scale-100-mobile-390-zoom200.png)
  - `1,000건`: [`scale-1000-mobile-320.png`](file:///home/antigravity/blue45f/pilate_flow/docs/history-scale-audit-20261107/evidence/screenshots/scale-1000-mobile-320.png), [`scale-1000-mobile-390.png`](file:///home/antigravity/blue45f/pilate_flow/docs/history-scale-audit-20261107/evidence/screenshots/scale-1000-mobile-390.png), [`scale-1000-tablet-768.png`](file:///home/antigravity/blue45f/pilate_flow/docs/history-scale-audit-20261107/evidence/screenshots/scale-1000-tablet-768.png), [`scale-1000-desktop-1440.png`](file:///home/antigravity/blue45f/pilate_flow/docs/history-scale-audit-20261107/evidence/screenshots/scale-1000-desktop-1440.png), [`scale-1000-desktop-1440-zoom200.png`](file:///home/antigravity/blue45f/pilate_flow/docs/history-scale-audit-20261107/evidence/screenshots/scale-1000-desktop-1440-zoom200.png), [`scale-1000-mobile-390-zoom200.png`](file:///home/antigravity/blue45f/pilate_flow/docs/history-scale-audit-20261107/evidence/screenshots/scale-1000-mobile-390-zoom200.png)

---

## 5. 시나리오별 독립 검증 상세 결과

### 5.1 초장문 한글 (`긴한글`) 및 모바일/확대 레이아웃 안전성 — **PASS**
- `140자` 이상의 한글 수업명, `58자` 수업반 이름, `3문단` 회고 노트가 포함된 `hist-long-ko` 카드가 `320px`, `390px`, `768px`, `1440px`, `200%` 확대 모든 조건에서 가로 스크롤(`docOverflowPx = 0`, `maxCardOverflowPx = 0`) 없이 안전하게 줄바꿈(`overflow-wrap: anywhere`)됨을 확인했습니다.

### 5.2 기록된 수업 원본 보존 및 재사용 (`기록된수업 원본보존/재사용`) — **PASS**
- **카탈로그/시퀀스 변경 후에도 과거 스냅샷 불변 유지**:
  - 원본 시퀀스(`seq-same-name`)가 현재 `"화·목 저녁 리포머 코어 & 골반 정렬 50분 (2026 개정판)"`(1단계)으로 변경되었더라도, 과거 기록(`hist-snapshot-modified`)을 `"이력 다시 열기"` 모달로 열거나 `"이 수업 다시 계획"`(`복사해 다음 수업 만들기`)으로 재사용할 때 기록 당시의 2단계(`"헌드레드 (기록 당시 원본 스냅샷 명칭)"`, `"레그 서클 (기록 당시 원본)"`)가 그대로 복원되며 기존 `savedSequences`는 전혀 변형되지 않습니다.
- **카탈로그 삭제 동작 방어**:
  - `programSnapshot`이 있는 삭제 동작(`hist-snapshot-deleted-recoverable`)은 `"카탈로그에서 삭제됨 · 스냅샷으로 유지"` 배지와 함께 정상 재사용 가능합니다.
  - 레거시 복구 불가 기록(`hist-snapshot-deleted-unrecoverable`)은 `"원본 유실로 복사 불가"` 안내와 함께 `"이 수업 다시 계획"` 버튼이 정확히 `disabled` 처리됩니다.

### 5.3 키보드 접근성 (`키보드`) — **PASS (단, `1,000건`에서는 칩 개수 과다로 인한 탭 이동 횟수 이슈 존재)**
- 날짜 필터 칩의 `aria-pressed` 토글, `"이력 다시 열기"` 클릭 시 닫기 버튼(`reopenCloseBtnRef`) 자동 포커스, 상세 모달 내부 `Tab` / `Shift+Tab` 포커스 트랩, `Escape` 키 닫기가 모두 정상 작동합니다.

---

## 6. 새로 발견된 장기 누적 UI/성능 개선 과제 (우선순위 · 재현 절차 · 최소 Patch 제안)

소스는 읽기 전용이므로 실제 수정 대신 [`patches/history-scale-usability-minimal.patch`](file:///home/antigravity/blue45f/pilate_flow/docs/history-scale-audit-20261107/patches/history-scale-usability-minimal.patch)에 최소 패치 제안을 수록했습니다.

### [P1-1] `ClassBinderView` 매 렌더마다 `resolvedHistoryMap` (`useMemo`) 캐시 100% 무효화 (성능/반응성 핵심 병목)
- **근거 코드**:
  - [`ClassBinderView.tsx:178-195`](file:///home/antigravity/blue45f/pilate_flow/src/components/ClassBinderView.tsx#L178-L195)에서 `const reusableBlocks = getSavedReusableBlocks();` 및 `const humanDrafts = getSavedHumanMovementDrafts();`가 컴포넌트 본문 최상단에서 매 렌더마다 호출됩니다.
  - [`movementIdeaDraft.ts:307`](file:///home/antigravity/blue45f/pilate_flow/src/utils/movementIdeaDraft.ts#L307)의 `Object.values(readRecord(...))`는 호출될 때마다 새로운 배열 참조(`[]`)를 반환하므로, `resolvedHistoryMap`의 의존성 배열 `[historyLogs, exercisesMap, savedSequences, reusableBlocks, humanDrafts]`가 **모든 state 변경(`selectedDate`, `historyQuery`, `reopenedHistoryId`, `confirmingDeleteId`)마다 100% 무효화**됩니다.
  - 그 결과 `"이력 다시 열기"` 모달을 열고 닫을 때마다 `1,000건` 전체에 대해 `TeachingProgramSnapshotSchema.safeParse(...)`가 재실행되어 모달 열기에 **`2,907.5ms`**, `Escape` 닫기에 **`2,800.7ms`**가 소요됩니다.
- **재현 절차**:
  1. `node docs/history-scale-audit-20261107/verify-history-scale-browser.mjs --scale=1000` 실행
  2. 첫 번째 기록 카드의 `"이력 다시 열기"` 버튼 클릭 -> 모달 표시까지 약 `2.9초` 메인 스레드 블로킹 발생 확인
- **최소 Patch 제안**:
  - `reusableBlocks`와 `humanDrafts`를 `useMemo(() => ..., [savedSequences, historyLogs])`로 감싸 참조 안정성을 확보합니다.

### [P1-2] 자정 전후(`자정전후날짜`) UTC 날짜 키(`getHistoryDateKey`)와 로컬 타임존 날짜 라벨(`formatDate`) 불일치
- **근거 코드**:
  - [`ClassBinderView.tsx:93-97`](file:///home/antigravity/blue45f/pilate_flow/src/components/ClassBinderView.tsx#L93-L97)의 `getHistoryDateKey(date)`는 `/^\d{4}-\d{2}-\d{2}/.test(trimmed)`가 참이면 문자열 앞 10자리(`UTC` 기준 날짜)를 바로 반환합니다.
  - 반면 [`ClassBinderView.tsx:83-90`](file:///home/antigravity/blue45f/pilate_flow/src/components/ClassBinderView.tsx#L83-L90)의 `formatDate` / `formatDateWithWeekday`는 `new Date(date).toLocaleDateString('ko-KR')`로 브라우저 로컬 타임존(`KST, UTC+9` 등) 기준 날짜를 표시합니다.
  - 그 결과 `TZ=Asia/Seoul`에서 `'2026-11-06T15:10:00.000Z'`(`11월 7일 00:10 KST`)는 `dateKey = '2026-11-06'` 그룹에 묶이면서 화면 라벨은 **`"2026년 11월 7일"`**로 찍히고, `'2026-11-07T00:05:00.000Z'`(`11월 7일 09:05 KST`)는 `dateKey = '2026-11-07'` 그룹에 묶이면서 역시 **`"2026년 11월 7일"`**로 찍혀 **동일한 `"2026년 11월 7일"` 날짜 칩과 섹션 헤더가 2개로 분리(`duplicateDateChipLabels: ["2026년 11월 7일"]`)**됩니다.
  - 추가로 [`LogSessionModal.tsx:161`](file:///home/antigravity/blue45f/pilate_flow/src/components/LogSessionModal.tsx#L161)은 날짜만 입력받아도 `new Date("${taughtDate}T12:00:00").toISOString()`으로 저장하므로 카드에 사용자가 입력하지 않은 `12:00` 시각 배지가 노출됩니다.
- **재현 절차**:
  1. `TZ=Asia/Seoul npx vitest run docs/history-scale-audit-20261107/historyScaleUsability.audit.test.tsx` 또는 `TZ=Asia/Seoul node docs/history-scale-audit-20261107/verify-history-scale-browser.mjs --scale=1000` 실행
  2. 상단 날짜 필터 칩에서 `"2026년 11월 7일"` 라벨이 2개(`dateKey="2026-11-07"`, `dateKey="2026-11-06"`)로 중복 생성되는 현상 확인
- **최소 Patch 제안**:
  - `getHistoryDateKey`에서 순수 날짜 문자열(`/^\d{4}-\d{2}-\d{2}$/`)만 그대로 반환하고, `T`가 포함된 ISO 타임스탬프는 `new Date(parsed)`의 로컬 `getFullYear()`/`getMonth()`/`getDate()`로 날짜 키를 생성하여 `formatDate`와 일치시킵니다.

### [P1-3] 장기 누적 시 날짜 필터 칩 바(`.teaching-date-nav`) 높이 무제한 팽창 및 검색 시 잔류 `selectedDate` 빈 상태 문구 오류
- **근거 코드 및 실측 수치**:
  - [`ClassBinderView.tsx:419-443`](file:///home/antigravity/blue45f/pilate_flow/src/components/ClassBinderView.tsx#L419-L443)에서 `dateFilterOptions` 전체를 제한 없이 렌더링합니다.
  - `100건`(`35일`)만 누적되어도 모바일(`320px`/`390px`)에서 날짜 칩 바 높이가 **`1,471px ~ 1,486px` (화면 높이의 `1.7~1.8배`)**에 달해 첫 수업 카드가 `2,229px` 아래로 밀려나며, `1,000건`(`335일`) 누적 시 모바일 날짜 칩 바 높이가 **`14,113px` (화면 높이의 `17.3배`, `200%` 확대 시 `28,226px`)**까지 팽창합니다.
  - 또한 특정 날짜(`selectedDate !== 'all'`)를 선택한 뒤 검색어(`historyQuery`)를 입력해 결과가 `0건`이 되면, `dateFilterOptions`가 빈 배열이 되어 날짜 칩 바는 화면에서 사라지는데 `selectedDate` 상태는 그대로 남아 빈 상태 제목이 `"검색한 수업 완료 기록이 없어요"` 대신 **`"선택한 날짜에 남긴 수업 기록이 없어요"`**로 잘못 표시됩니다([`ClassBinderView.tsx:450-452`](file:///home/antigravity/blue45f/pilate_flow/src/components/ClassBinderView.tsx#L450-L452)).
- **재현 절차**:
  1. `100건` 또는 `1,000건` 로드 후 모바일 뷰포트(`390×890`)에서 `.teaching-date-nav` 높이 측정 (`1,486px` / `14,086px`)
  2. 임의의 날짜 칩 클릭 후 검색창에 매칭되지 않는 검색어 입력 -> 날짜 칩 바가 사라진 상태에서 빈 상태 제목이 `"선택한 날짜에 남긴 수업 기록이 없어요"`로 표시되는지 확인
- **최소 Patch 제안**:
  - 기본 노출 날짜 칩을 최근 `12개`로 제한하고 `"이전 날짜 더보기 (+N일)"` / `"날짜 접기"` 토글을 추가하며, `selectedDate`가 현재 `dateFilterOptions`에 없을 때는 `effectiveSelectedDate = 'all'`로 폴백합니다.

### [P2-1] `1,000건` 전체 카드 무제한 DOM 마운트 (`57,690` DOM 요소, 모바일 스크롤 평균 `37.95ms`/프레임)
- **근거 코드 및 실측 수치**:
  - [`ClassBinderView.tsx:473-623`](file:///home/antigravity/blue45f/pilate_flow/src/components/ClassBinderView.tsx#L473-L623)에서 필터링된 `logs` 전체를 페이지네이션/더보기 없이 한 번에 렌더링하여 `1,000건` 기준 `57,690개`의 HTML 엘리먼트와 `3,005개`의 동작 태그가 동시에 마운트됩니다.
  - 이로 인해 검색어 초기화(`0건 -> 1,000건` 복원)에 `3,537.3ms`가 걸리고 모바일 연속 스크롤 프레임 시간이 평균 `37.95ms` (최대 `83.9ms`)로 상승합니다.
- **최소 Patch 제안**:
  - 검색·날짜·수업반 필터 집계는 전체 `historyLogs` 대상으로 유지하되, 실제 DOM 카드 렌더링은 초기 `30건`(`visibleHistoryCount = 30`)씩 끊어 보여주고 하단에 `"이전 수업 기록 더 보기 (30 / 1,000건 표시 중)"` 버튼을 제공합니다.

### [P2-2] 우측 보조 패널(`.teaching-overlap-row`)의 동명 수업(`동명수업`) 식별 정보 부족
- **근거 코드**:
  - [`ClassBinderView.tsx:669-676`](file:///home/antigravity/blue45f/pilate_flow/src/components/ClassBinderView.tsx#L669-L676)의 `.teaching-overlap-row`는 `log.groupName`과 `formatDate(log.taughtAt)`만 출력하고 `log.sequenceTitle`이나 수업 시각을 표시하지 않아, 같은 반에 여러 수업이 기록된 경우 어떤 수업인지 구분하기 어렵습니다.

---

## 7. 검증 재실행 명령어

```bash
# 1. 독립 Vitest 장기 누적(100/1000건) 및 5대 경계값 테스트 실행
npx vitest run docs/history-scale-audit-20261107/historyScaleUsability.audit.test.tsx

# 2. 실제 Chromium 브라우저 100건 / 1,000건 멀티 뷰포트(320/390/768/1440/200%) 및 메모리/렌더 측정
node docs/history-scale-audit-20261107/verify-history-scale-browser.mjs --scale=100
TZ=Asia/Seoul node docs/history-scale-audit-20261107/verify-history-scale-browser.mjs --scale=1000
```
