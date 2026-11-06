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
  - 긴 한국어 제목·메모, 빈 큐, 중복 동작 이름을 결정론적(deterministic)이고 충돌 없는 안정적 ID(`cueItemId`, `expandedRowId`)와 중복 순번(`duplicateOccurrenceIndex / duplicateTotalCount`)으로 구분합니다.
- **프라이버시 Allowlist 및 Plain Text 이스케이프**:
  - 참가자 이름, 회원 정보, 연락처, 건강/통증/부상/임신/수술/병력 등 민감 키(`SENSITIVE_CUE_SHEET_KEYS`)는 프로젝션에서 제외하고 `privacy.strippedSensitiveKeys`에 기록합니다.
  - 자유 메모 내 인라인 민감 토큰(`회원명: ...`, `주의 질환: ...` 등)을 마스킹하고, HTML/script 유사 문자열은 실행 불가능한 평문으로 이스케이프합니다.
- **독립 픽스처 프리뷰 및 로컬 인쇄 스타일시트 (`ClassCueSheetPreview`, `classCueSheet.css`)**:
  - 현재/다음 항목 이동 컨트롤, 키보드 단축키(`ArrowDown`/`ArrowRight`/`j`/`n`, `ArrowUp`/`ArrowLeft`/`k`/`p`, `Home`, `End`), 요약/완전 펼치기 전환, 전체 진행표 테이블을 제공합니다.
  - 진행 상태는 **로컬 임시 상태(local ephemeral state)**로만 유지하며 새 수업 완료 기록이나 브라우저 스토리지에 저장하지 않습니다.
  - `320px` / `390px` 모바일 뷰포트에서 가로 넘침(horizontal overflow) 없이 읽을 수 있으며, `@media print` 및 로컬 인쇄 미리보기 모드에서 컨트롤 UI를 숨기고 흑백 고대비 타이포그래피와 긴 문단 페이지 나눔(`break-inside: auto`, `orphans`, `widows`)을 보장합니다.

### 비목표 (금지 사항 준수)
- 자동 운동 처방, 안전성·운동 효과 보장, 이름만 적은 새 동작의 강제 카탈로그 분류를 수행하지 않습니다.
- `classPlanReview` 트랙이 담당하는 수업 총시간 적절성 판정이나 좌우 균형 분석/경고를 중복 구현하지 않습니다.
- 외부 AI/네트워크 요청, 원본 객체 변경, 저장소 쓰기, 다운로드 자동 실행을 수행하지 않습니다.

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

- `classCueSheetTypes.ts` — 프로젝션, 스텝 아이템, 펼치기 행, 프라이버시 리포트, 유한 상한(`DEFAULT_MAX_*`) 및 프리뷰 Props 타입 계약
- `classCueSheetProjection.ts` — 순수 읽기 전용 어댑터(`buildClassCueSheetProjection`), 평문 포맷터(`formatClassCueSheetAsPlainText`), 민감 키 필터링 및 HTML 평문 이스케이프
- `classCueSheetFixtures.ts` — 7종 합성 픽스처(`standard-mixed`, `empty-class`, `name-only-drafts`, `long-korean-cues-empty-cues-duplicates`, `nested-repeats-unilateral-unspecified-time`, `hundred-items-bounded`, `corrupted-circular-sensitive-html`)
- `ClassCueSheetPreview.tsx` — 독립 픽스처 프리뷰 컴포넌트 (현재/다음 이동, 키보드 네비게이션, 요약/펼치기 전환, 잘림 경고 배너, 로컬 인쇄 미리보기)
- `classCueSheet.css` — `.class-cue-sheet-root` 스코프 스타일, `320px`/`390px` 반응형 레이아웃, `@media print` 흑백 인쇄 및 페이지 나눔 규칙
- `classCueSheetProjection.test.ts` — 어댑터·프로젝션 단위 테스트 (14개 테스트 스위트)
- `ClassCueSheetPreview.test.tsx` — 프리뷰 UI·키보드·접근성·로컬 상태 격리 테스트 (7개 테스트 스위트)
- `classCueSheetChromium.test.ts` — 실제 Headless Chromium + Vite 기반 `320px`/`390px` 가로 넘침 검증 및 `@media print` / `Page.printToPDF` 검증 (2개 통합 테스트)
- `index.ts` — 모듈 공개 배럴 익스포트
- `README.md` — 아키텍처, 재사용 계약 및 통합 후보 문서

---

## 4. 검증 명령어 (Verification Commands)

```bash
# 타입스크립트 빌드 검증
npx tsc -b

# ESLint 검증 (src/features/classCueSheet)
npx eslint src/features/classCueSheet

# Vitest 단위 + 컴포넌트 + 실제 Chromium(320px/390px/@media print) 전체 검증
pnpm vitest run src/features/classCueSheet
```
