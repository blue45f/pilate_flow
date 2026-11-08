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
- **초보 강사 친화적 모바일 우선 수업 진행 UX (`ClassCueSheetPreview`, `classCueSheet.css`)**:
  - **현재/다음 동작 및 이전/다음 버튼 우선 노출**: 진입 시 상단 헤더(`cue-sheet-compact-header`) 바로 아래에 진행 포커스 데크(`cue-sheet-focus-deck`: `이전 항목`, `다음 항목`, `현재 진행 항목` 카드, `다음 준비 항목` 카드)를 배치하고, 긴 전체 진행표 목록(`cue-sheet-full-list-panel`)과 수업 요약·기술 진단(`cue-sheet-diagnostics-panel`)은 화면 모드에서 **기본 접기(`initialFullListOpen = false`, `initialDiagnosticsOpen = false`)** 상태로 두어 모바일(`320px`/`390px`) 집중도를 높였습니다.
  - **44px 이상 조작 영역 보장**: 모든 인터랙티브 버튼 및 선택 컨트롤에 `min-height: 44px; min-width: 44px;`를 적용했습니다.
  - **설정 가능한 글자 크기 확대(`100%` / `125%` / `150%` / `200%`) 및 `prefers-reduced-motion` 존중**: 상단 글자 크기 토글(`cue-sheet-scale-100`~`200`)로 `--cue-sheet-font-scale`을 즉시 조절할 수 있으며, `200%` 확대 시에도 `320px`/`390px`/`768px`/`1440px` 전 뷰포트에서 가로 넘침(`0px`)이 없습니다. `prefers-reduced-motion: reduce` 환경에서는 모션/전환 및 스크롤 애니메이션을 비활성화합니다.
  - **명확한 빈 상태 및 필수 검토 게이트 없음**: 동작이 0개인 빈 수업에서는 `cue-sheet-empty-state` 안내를 즉시 노출하며, 이름만 적은 새 동작이나 미정 시간 항목이 있어도 **필수 검토 게이트 없이(`data-mandatory-review-gate="false"`)** 바로 진행·미리보기할 수 있습니다.
- **수업 편집 중 현재/다음 진행 위치 안정 유지 및 명시적 Fallback 계약**:
  - 프리뷰가 마운트된 상태에서 수업 입력이 편집될 때 안정적 식별자(`cueItemId`, 보조 `sourceStepId`)를 기준으로 현재 진행 위치를 유지(`preserved-by-id`)합니다.
  - 현재 항목 삭제 시 인접 항목으로 이동(`fallback-adjacent-after-delete`)하며 안내 배너(`cue-sheet-selection-fallback-notice`)를 표시하고, 다른 수업으로 교체 시 첫 항목(`#01`, `reset-on-class-change`)으로 초기화합니다.
- **다중 페이지 인쇄 및 로컬 PDF 내용 보존 계약 (`classCueSheet.css`, `classCueSheetChromium.test.ts`)**:
  - 화면에서 전체 진행표나 요약 패널이 접혀 있더라도 `@media print` 및 로컬 인쇄 미리보기(`.is-print-preview`)에서는 자동으로 전체 목록과 잘림 안내 배너·생략 푸터를 모두 펼쳐 인쇄합니다.
  - A4(`8.27in × 11.69in`) 및 US Letter(`8.5in × 11in`) 용지에서 긴 한국어 문단이 잘림이나 빈 페이지 없이 자연스럽게 분할됩니다.
  - PDF 내용 검사는 `pdftotext -layout`으로 물리 줄끝의 원문 하이픈을 보존합니다. 기본 추출 모드의 하이픈 제거를 내용 누락으로 오인하지 않도록 공백·줄바꿈만 정규화하며, 문장부호·글자 누락과 중복은 계속 실패로 검출합니다. 강제 줄바꿈 하이픈 회귀 및 전체 장문 큐 내용 비교를 포함합니다.

---

## 2. 기존 순수 계약 읽기 전용 재사용 (Reused Read-Only Contracts)

| 출처 파일 | 재사용 심볼 | 용도 |
| :--- | :--- | :--- |
| `src/utils/sequenceEngine.ts` | `getStepTiming`, `formatSecondsToMMSS`, `getStepSideLabels`, `isRestStep` | 개별 스텝의 알려진 활성/휴식/전환 시간 계산(추정 없음), `MM:SS` 포맷팅, 좌/우 라벨, 휴식 스텝 판별 |
| `src/utils/hierarchyModel.ts` | `getMovementSectionRole` | 명시적 섹션이 없을 때 카탈로그 동작의 기본 섹션(`warmup`/`main`/`cooldown`) 읽기 |
| `src/data/pilatesCatalog.ts` | `APPARATUS_LABELS`, `CANONICAL_BLOCKS`, `PROP_LABELS` | 기구·블록·소도구 한국어 라벨 조회 |
| `src/data/equipmentCatalog.ts` | `EQUIPMENT_OPTIONS`, `PROP_OPTIONS`, `getExerciseEquipment` | 동작 및 수업의 기구/소도구 라벨 정규화 |

---

## 3. 향후 실제 앱 통합 시 필요한 연결점 (Integration Connection Points)

최신 `main` 브랜치 계약과 비교하여 실제 앱에 연결할 때 필요한 읽기 전용 연결 지점은 다음과 같습니다(현재는 미연결 상태 유지):

1. **수업 계획 미리보기 (`src/components/SequencePlanPreview.tsx`)**:
   - `ClassPlanSummary`(`시간·좌우 편성 살펴보기`)와 나란히 선택적 `<details>` 또는 탭으로 `<ClassCueSheetPreview sourceInput={snapshot} projectionOptions={{ exercises }} showFixtureSwitcher={false} />`를 마운트할 수 있습니다. `"사본 저장"`이나 `"수업 시작"` 버튼을 차단하지 않는 선택적 보조 뷰로 연결합니다.
2. **수업 바인더 및 히스토리 인쇄 모달 (`src/components/ClassBinderView.tsx`)**:
   - 기존의 단일 `<pre>{formatSequenceAsStudioSheet(...)}</pre>` 출력 대신 `<ClassCueSheetPreview sourceInput={sequenceOrResolvedHistory} projectionOptions={{ exercises, humanDrafts: getSavedHumanMovementDrafts(), reusableBlocks: getSavedReusableBlocks() }} initialPrintPreviewMode={true} showFixtureSwitcher={false} />`를 연결하면, 이름만 적은 초안 동작과 다중 큐 메모를 누락 없이 A4/Letter 인쇄 레이아웃으로 제공할 수 있습니다.
3. **라이브 수업 스테이지 (`src/components/LiveStageView.tsx`)**:
   - 타이머 기반 스테이지가 `isExerciseAuthoringEligible`로 차단하는 미검토/초안 동작이 포함된 수업에서도, 스토어 변경이나 수업 완료 기록 강제 없이 `<ClassCueSheetPreview sourceInput={sequence} initialStepIndex={clock.index} showFixtureSwitcher={false} />`를 읽기 전용 진행 큐시트로 제공할 수 있습니다.

---

## 4. 소유 파일 구조 (Owned Files)

모든 변경 사항은 `src/features/classCueSheet/**` 내부에만 위치합니다.

- `classCueSheetTypes.ts` — 프로젝션, 스텝 아이템, 펼치기 행, 프라이버시 리포트, 유한 상한(`DEFAULT_MAX_*`) 타입 계약
- `classCueSheetProjection.ts` — 순수 읽기 전용 어댑터(`buildClassCueSheetProjection`), 순서 불변 안정 `cueItemId` 생성, 평문 포맷터(`formatClassCueSheetAsPlainText`), 민감 키 필터링 및 HTML 평문 이스케이프
- `classCueSheetFixtures.ts` — 7종 합성 픽스처
- `ClassCueSheetPreview.tsx` — 독립 픽스처 프리뷰 컴포넌트 (초보 강사 모바일 우선 포커스 데크, 기본 접기 디클로저, 100%~200% 글자 확대, 라이브 편집 안정 ID·fallback, 입력 컨트롤·IME·수정키 단축키 간섭 방지, 단일 `aria-live` 상태 알림, 비탈취 키보드 포커스 보호)
- `classCueSheet.css` — `.class-cue-sheet-root` 스코프 스타일, `44px` 터치 타겟, `320px`/`390px`/`768px`/`1440px` & `200%` 확대 반응형 레이아웃, `prefers-reduced-motion`, `@media print` 다중 페이지 분할 규칙
- `classCueSheetProjection.test.ts` — 어댑터·프로젝션·안정 ID·프라이버시 경계 단위 테스트 (15개 테스트)
- `ClassCueSheetPreview.test.tsx` — 프리뷰 UI·라이브 편집 상태 전이·편집 타겟 단축키 보호·단일 라이브 리전·키보드 포커스·로컬 상태 격리 테스트 (18개 테스트)
- `classCueSheetUsability.test.tsx` — 초보 강사 UX·읽기 순서·접기/펼치기·글자 확대(200%)·긴 한글 큐·키보드·삭제/교체 회귀 전용 테스트 (7개 테스트)
- `classCueSheetChromium.test.ts` — 실제 Headless Chromium + Poppler 기반 `320/390/768/1440px`·`200%` 확대·`44px` 타겟 검증 및 A4/Letter 다중 페이지 PDF·PGM 래스터 검증 (2개 통합 테스트 + PDF 내용 비교 회귀 테스트)
- `browserFixture.html` — 독립 브라우저 프로브용 로컬 HTML 픽스처
- `verifyClassCueSheetBrowser.mjs` — `320/390/768/1440px`·`200%` 확대·스크린샷·A4/Letter PDF 검증용 독립 브라우저 프로브 스크립트
- `index.ts` — 모듈 공개 배럴 익스포트
- `README.md` — 아키텍처, 재사용 계약, 통합 연결점 및 검증 문서

---

## 5. 검증 명령어 (Verification Commands)

```bash
# 타입스크립트 빌드 검증
npx tsc -b

# ESLint 검증 (src/features/classCueSheet)
npx eslint src/features/classCueSheet

# Vitest 전체 검증
pnpm vitest run src/features/classCueSheet

# 독립 브라우저 프로브 및 스크린샷 생성 (320/390/768/1440px, 200% 확대, A4/Letter PDF)
node src/features/classCueSheet/verifyClassCueSheetBrowser.mjs
```
