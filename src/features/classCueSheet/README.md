# Class Cue Sheet (`src/features/classCueSheet`)

> **Status**: **Standalone Integration Candidate (독립 통합 후보 — 실제 앱 라우트·스토어·전역 스타일 연결 전)**
>
> 본 모듈은 필라테스 강사가 이미 작성한 수업을 수업 중 한눈에 읽는 진행표(Cue Sheet)와 로컬 인쇄용 미리보기로 변환하는 **독립 통합 후보**입니다. 현재 제품 라우트(`src/App.tsx`, `src/main.tsx`), 전역 스타일(`src/styles/**`), 스토어(`src/store/usePilatesStore.ts`) 및 외부 서비스에는 연결되어 있지 않습니다.

---

## 1. 목적 및 비목표 (Scope & Non-Goals)

### 핵심 목표
- **읽기 전용 어댑터 및 타입드 프로젝션 (`buildClassCueSheetProjection`)**:
  - `SavedSequence`, `ClassSequenceSnapshot`, `TeachingProgramSnapshot`, `OfflineClassPreset` 및 자유 형식(Ad-hoc) 수업/블록/동작 입력을 원본 변형 없이 읽기 전용으로 수신합니다.
  - 현재 순서, 동작 이름(강사가 이름만 적은 미분류 동작 포함), 사용자 작성 큐·메모, 준비물/기구, 알려진 시간만 보존합니다.
  - 미정 시간은 `'시간 미정'`(`status: 'unspecified'`)으로 명시하며 새 시간을 추정하거나 분배하지 않습니다.
  - 블록 반복(`repeatCount`), 세트(`sets`), 횟수(`reps`), 좌우 표기(`sideMode`) 의미를 보존하며, 완전 펼치기(`expandedRows`)는 유한 상한(`maxExpandedRows` 등)을 적용하고 잘림 발생 시 `truncation.isTruncated`와 한국어 사유(`reasonsKo`)를 숨기지 않고 노출합니다.
  - 긴 한국어 제목·메모, 빈 큐, 중복 동작 이름을 결정론적(deterministic)이고 순서 변경에도 보존되는 안정적 ID(`cueItemId`, `expandedRowId`)와 중복 순번(`duplicateNameOccurrence / duplicateNameTotal`)으로 구분합니다.
- **프라이버시 Allowlist 및 보조 휴리스틱 마스킹 경계**:
  - 구조화된 객체 프로퍼티는 허용 목록(Allowlist)에 포함된 수업·동작·세팅 필드만 추출하며, 참가자 이름, 회원 정보, 연락처, 건강/통증/부상/임신/수술/병력 등 민감 키(`SENSITIVE_CUE_SHEET_KEYS`)는 제외하고 `privacy.strippedSensitiveKeys`에 기록합니다.
  - 자유 서술 메모 내 인라인 패턴(`회원명: ...`, 전화번호, 이메일 등)에는 보조적 휴리스틱 마스킹(`inlineRedactionIsHeuristicOnly: true`)을 적용하지만, **휴리스틱 문자열 마스킹은 자유 텍스트 내 모든 건강·개인정보를 완벽히 제거한다는 보장이 아닙니다** (`privacy.privacyPolicyNoteKo`에 명시).
  - HTML/script 유사 문자열은 실행 불가능한 평문으로 이스케이프합니다.
- **수업 편집 중 현재/다음 진행 위치 안정 유지 및 명시적 Fallback 계약 (`ClassCueSheetPreview`)**:
  - 프리뷰가 마운트된 상태에서 수업 입력(`sourceInput` 또는 `projection`)이 편집될 때 단순 배열 인덱스가 아니라 **안정적 항목 식별자(`cueItemId`, 보조 `sourceStepId`)**를 기준으로 현재 진행 위치를 보존합니다(`CueSheetSelectionResolution`):
    - 현재 항목 앞 삽입/삭제/순서 변경, 동일 동작명·다른 ID 편집, 기본↔펼치기 보기 전환 시: 동일 동작을 계속 현재 항목으로 유지(`preserved-by-id`)하고 `#순번 / #전체`, 다음 준비 항목, 전체 목록(`aria-current="step"`), 보조기술 요약(`data-testid="cue-sheet-a11y-status"`)을 동기화합니다.
    - 현재 항목이 삭제된 경우(동일 수업 내 편집): 인접 순번(`Math.min(prevIndex, nextItems.length - 1)`)으로 이동(`fallback-adjacent-after-delete`)하고 삭제 이동 안내 배너(`data-testid="cue-sheet-selection-fallback-notice"`)를 노출합니다.
    - 다른 수업으로 교체되거나 빈 수업에서 새 수업으로 전환된 경우: 이전 수업의 인덱스를 유지하지 않고 새 수업의 첫 항목(`#01`, `index 0`)으로 초기화(`reset-on-class-change`)합니다.
    - 빈 수업(`0개 항목`)으로 전환된 경우: 이전 항목 잔상을 남기지 않고 빈 상태(`empty-class`)와 이동 버튼 비활성화를 적용합니다.
  - 키보드 단축키(`ArrowDown`/`ArrowRight`/`j`/`n`, `ArrowUp`/`ArrowLeft`/`k`/`p`, `Home`, `End`) 및 경계 버튼 클릭 시 버튼이 `disabled`로 바뀌거나 선택 행이 삭제되더라도 포커스를 포커스 데크(`data-testid="cue-sheet-focus-deck"`)로 복구하여 `document.body`로의 포커스 유실이나 `320px`/`390px` 화면 밖 가로 이동이 발생하지 않습니다.
- **다중 페이지 인쇄 및 로컬 PDF 내용 보존 계약 (`classCueSheet.css`, `classCueSheetChromium.test.ts`)**:
  - `@page { margin: 12mm; }` 및 `@media print` 블록 분할 규칙을 통해 A4(`8.27in × 11.69in`) 및 US Letter(`8.5in × 11in`) 용지에서 현재 항목뿐만 아니라 **전체 진행표 목록과 상한 잘림 안내 배너·생략 푸터**를 모두 인쇄합니다.
  - 긴 한국어 큐잉 문단은 페이지 경계에서 잘리거나 숨겨지지 않고 자연스럽게 다음 페이지로 분할(`break-inside: auto`, `overflow: visible`)되며, 항목 헤더(`cue-sheet-item-header`)는 페이지 하단에 고립되지 않도록 보호합니다.

### 비목표 (금지 사항 준수)
- 자동 운동 처방, 안전성·운동 효과 보장, 이름만 적은 새 동작의 강제 카탈로그 분류를 수행하지 않습니다.
- `classPlanReview` 트랙이 담당하는 수업 총시간 적절성 판정이나 좌우 균형 분석/경고를 중복 구현하지 않습니다.
- 외부 AI/네트워크 요청, 원본 객체 변경, 저장소 쓰기, 다운로드/인쇄 자동 실행을 수행하지 않습니다.

---

## 2. 기존 순수 계약 읽기 전용 재사용 (Reused Read-Only Contracts)

기존 코드베이스를 수정하지 않고 다음 순수 헬퍼와 카탈로그만 읽기 전용으로 재사용합니다.

| 출처 파일 | 재사용 심볼 | 용도 |
| :--- | :--- | :--- |
| `src/utils/sequenceEngine.ts` | `getStepTiming`, `formatSecondsToMMSS`, `getStepSideLabels`, `isRestStep` | 개별 스텝의 알려진 활성/휴식/전환 시간 계산(추정 없음), `MM:SS` 포맷팅, 좌/우 라벨, 휴식 스텝 판별 |
| `src/utils/hierarchyModel.ts` | `getMovementSectionRole` | 명시적 섹션이 없을 때 카탈로그 동작의 기본 섹션(`warmup`/`main`/`cooldown`) 읽기 |
| `src/data/pilatesCatalog.ts` | `APPARATUS_LABELS`, `CANONICAL_BLOCKS`, `PROP_LABELS` | 기구·블록·소도구 한국어 라벨 조회 |
| `src/data/equipmentCatalog.ts` | `EQUIPMENT_OPTIONS`, `PROP_OPTIONS`, `getExerciseEquipment` | 동작 및 수업의 기구/소도구 라벨 정규화 |

---

## 3. 소유 파일 구조 (Owned Files)

모든 변경 사항은 `src/features/classCueSheet/**` 내부에만 위치합니다.

- `classCueSheetTypes.ts` — 프로젝션, 스텝 아이템, 펼치기 행, 프라이버시 리포트(`inlineRedactionIsHeuristicOnly`), 유한 상한(`DEFAULT_MAX_*`) 타입 계약
- `classCueSheetProjection.ts` — 순수 읽기 전용 어댑터(`buildClassCueSheetProjection`), 순서 불변 안정 `cueItemId` 생성, 평문 포맷터(`formatClassCueSheetAsPlainText`), 민감 키 필터링 및 HTML 평문 이스케이프
- `classCueSheetFixtures.ts` — 7종 합성 픽스처(`standard-mixed`, `empty-class`, `name-only-drafts`, `long-korean-cues-empty-cues-duplicates`, `nested-repeats-unilateral-unspecified-time`, `hundred-items-bounded`, `corrupted-circular-sensitive-html`)
- `ClassCueSheetPreview.tsx` — 독립 픽스처 프리뷰 컴포넌트 (라이브 편집 시 안정 ID 위치 유지·명시적 fallback, 현재/다음/전체/보조기술 동기화, 키보드 포커스 보호, 요약/펼치기 전환, 잘림 경고 배너, 로컬 인쇄 미리보기)
- `classCueSheet.css` — `.class-cue-sheet-root` 스코프 스타일, `320px`/`390px` 반응형 레이아웃, `@media print` 다중 페이지 블록 분할·흑백 고대비 규칙
- `classCueSheetProjection.test.ts` — 어댑터·프로젝션·안정 ID·프라이버시 경계 단위 테스트 (15개 테스트)
- `ClassCueSheetPreview.test.tsx` — 프리뷰 UI·라이브 편집 상태 전이·키보드 포커스·로컬 상태 격리 테스트 (13개 테스트)
- `classCueSheetChromium.test.ts` — 실제 Headless Chromium + Vite + Poppler(`pdfinfo`/`pdftotext`/`pdftoppm`) 기반 `320px`/`390px` 가로 넘침·포커스 검증 및 A4/Letter 다중 페이지 PDF 페이지별 텍스트·PGM 래스터 검증 (2개 통합 테스트)
- `index.ts` — 모듈 공개 배럴 익스포트
- `README.md` — 아키텍처, 재사용 계약 및 통합 후보 문서

---

## 4. 검증 명령어 및 검증 범위 구분 (Verification & Boundaries)

```bash
# 타입스크립트 빌드 검증
npx tsc -b

# ESLint 검증 (src/features/classCueSheet)
npx eslint src/features/classCueSheet

# Vitest 단위(15) + 컴포넌트(13) + 실제 Chromium/Poppler PDF(2) 전체 검증 (총 30개 테스트)
pnpm vitest run src/features/classCueSheet
```

- **검증 완료 범위**:
  - JSDOM 컴포넌트 단위/통합 테스트 및 실제 `/usr/bin/chromium` Headless 브라우저(`320px`/`390px` 뷰포트, `@media print` 에뮬레이션, `Page.printToPDF` A4/Letter PDF 생성)
  - 로컬 설치된 Poppler 도구(`/usr/bin/pdfinfo`, `/usr/bin/pdftotext -f p -l p`, `/usr/bin/pdftoppm -gray -r 72`)를 통한 페이지 수, 페이지별 텍스트(첫·마지막 항목, `#001`~`#150`, `펼침 #01`~`#240`, 장문 한국어 큐 시작·끝 마커, 잘림 배너·푸터 누락/중복 0건), 빈 페이지 0건, 페이지 가장자리 여백 침범 없음 확인
- **미검증 및 미연결 범위**:
  - 제품 앱 라우트(`src/App.tsx`), 전역 스타일, 스토어(`usePilatesStore`)와의 실제 연결은 통합 전 후보 단계이므로 수행하지 않았습니다.
  - 물리적 프린터 기기 및 용지 급지 하드웨어 출력은 로컬 VM 환경 범위 밖이므로 미검증 상태입니다.
