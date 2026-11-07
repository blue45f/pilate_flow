# Class Cue Sheet (`src/features/classCueSheet`) 통합 인계 가이드 (Handoff Guide)

> **문서 기준일**: 2026-11-07
> **작성 브랜치 / HEAD**: `feat/class-cue-sheet` @ `51a6f6bd89687730aba87d004740a34bca4b9c51`
> **분기 베이스 커밋**: `29a6edbb28c45646f5c237805a8466bc7b42921c` (`Open the movement picker only when requested`)
> **비교 기준 원격 `origin/main`**: `222b59edf47653a36c4f754b2a572c19cd12cb30` (`feat(motionEvidenceReview): add 3-track mat/apparatus evidence records, validator, tests, and docs`)
> **대상 독자**: 메인 브랜치 통합 조정 담당자 (`조정 담당`)

---

## 1. 현재 상태 및 원격 반영 여부 (Current Status & Remote Sync State)

### 1.1 로컬 구현 및 검증 완료 상태
- **모듈 경로**: `src/features/classCueSheet/**` (총 **14개 신규 파일**, `10,605` lines 추가, 기존 앱 코드 수정 **0건**)
- **로컬 커밋 체인 (4개 연속 커밋)**:
  1. `d66e44a742608dedd59cdfb4033f9d440ed90ae4` — `feat(classCueSheet): add standalone instructor cue sheet projection, preview, and print candidate`
  2. `62dcf7e92b06e3f7fd9eb8496a0f46352479ba5a` — `feat(classCueSheet): preserve active step across live edits and verify multi-page PDF pagination`
  3. `1a78a9525090b96b1e278c71e3fd1d86103fa299` — `feat(classCueSheet): refine novice mobile focus UX, text scaling, and multi-viewport usability probe`
  4. `51a6f6bd89687730aba87d004740a34bca4b9c51` — `fix(classCueSheet): guard editable keyboard shortcuts, deduplicate aria-live, and verify lifecycle resilience`

### 1.2 원격(`origin`) 미반영 상태 명시 (`NOT PUSHED / NOT MERGED`)
- 본 `feat/class-cue-sheet` 브랜치의 4개 커밋(`d66e44a` → `62dcf7e` → `1a78a95` → `51a6f6b`)은 **로컬 저장소에만 존재하며, 원격(`origin/main` `222b59e` 및 `origin`의 모든 원격 브랜치)에 아직 푸시되거나 병합되지 않은(`not pushed / not merged`) 상태**입니다.
- **Git 검증 증거**:
  ```text
  $ git branch -r --contains 51a6f6bd89687730aba87d004740a34bca4b9c51
  (출력 없음 — 원격 브랜치 중 해당 커밋을 포함하는 브랜치 없음)

  $ git ls-remote --heads origin
  d9486533d0ba422a58f80ebb1a8706010104216c	refs/heads/feat/teaching-history-backup-recovery-hardening
  052b6d3cf34a0bddfd7729b724767f4e82d9f018	refs/heads/fix/regenerate-scope-mobile-20261107
  89dda1bfbfa7dcfa0901ca16dc92d16e51bf3721	refs/heads/gh-pages
  222b59edf47653a36c4f754b2a572c19cd12cb30	refs/heads/main
  ```
- 따라서 조정 담당자는 아래 **3절(권장 적용 순서)**의 방법 A(`git cherry-pick`), 방법 B(`git am`), 방법 C(`git apply`) 중 하나로 `origin/main` 통합 브랜치에 반입한 뒤 원격에 반영해야 합니다.

---

## 2. 인계 패키지 구성 (`docs/class-cue-sheet-handoff-20261107/`)

| 파일 / 디렉터리 | 역할 및 내용 |
| :--- | :--- |
| [`README.md`](file:///home/antigravity/blue45f/pilate_flow/docs/class-cue-sheet-handoff-20261107/README.md) | **(본 문서)** 조정 담당자용 요약 가이드: 원격 미반영 상태, 패키지 구성, 단계별 반입 순서, `origin/main` 충돌 위험 분석, 48개 테스트 및 Chromium/PDF 검증 요약 |
| [`commits-and-provenance.md`](file:///home/antigravity/blue45f/pilate_flow/docs/class-cue-sheet-handoff-20261107/commits-and-provenance.md) | 4개 의존 커밋 체인 상세 내역, 14개 소스 파일의 바이트·라인·SHA-256 체크섬 표, 원격 미반영 Git 증거 기록 |
| [`source-manifest.json`](file:///home/antigravity/blue45f/pilate_flow/docs/class-cue-sheet-handoff-20261107/source-manifest.json) | 기계 판독용 매니페스트: 베이스/헤드/원격 커밋 해시, 14개 소유 파일의 바이트·라인·SHA-256·역할, 패치 파일 해시 |
| [`INTEGRATION_PATCH_PROPOSAL.md`](file:///home/antigravity/blue45f/pilate_flow/docs/class-cue-sheet-handoff-20261107/INTEGRATION_PATCH_PROPOSAL.md) | 최신 `origin/main`(`222b59e`) 실제 코드 기준 앱 내 3개 연결 지점(`SequencePlanPreview.tsx`, `ClassBinderView.tsx`, `LiveStageView.tsx`)의 최소 통합 패치(`diff --git`) 제안 및 연결 계약 |
| `patches/0001-*.patch` ~ `0004-*.patch` | `git format-patch 29a6edb..51a6f6b`로 생성한 4개 순차 메일박스 패치 (`git am --3way` 반입용) |
| `patches/classCueSheet-squashed-29a6edb-to-51a6f6b.diff` | `29a6edb..51a6f6b` 전체 누적 단일 diff (`git apply --index` 단일 반입용) |

---

## 3. 조정 담당자 권장 적용 순서 (Step-by-Step Integration Order)

### Step 1: 무결성 확인 및 작업 트리 점검
통합 작업을 시작하기 전에 워킹 트리가 깨끗한지 확인하고, 인계 패키지의 패치 및 소스 파일 체크섬을 확인합니다.

```bash
# 1) 현재 워킹 트리 상태 및 최신 origin/main 커밋 확인
git status --short
git rev-parse origin/main
# 기대값: 222b59edf47653a36c4f754b2a572c19cd12cb30 (또는 이후 최신 main)

# 2) (feat/class-cue-sheet 체크아웃 상태에서 확인 시) 14개 파일 SHA-256 무결성 확인
sha256sum src/features/classCueSheet/*
```

### Step 2: `src/features/classCueSheet/**` 14개 파일 반입 (택 1)
통합 브랜치(예: `origin/main`에서 분기한 통합 브랜치)에서 아래 **3가지 방법 중 하나**로 `src/features/classCueSheet/**` 14개 파일을 반입합니다. 기존 파일과 겹치는 경로가 없으므로 세 방법 모두 충돌 없이(`0 conflicts`) 즉시 적용됩니다.

- **방법 A (`git cherry-pick` — 동일 로컬 저장소에서 4개 커밋 이력 보존 시 권장)**:
  ```bash
  git cherry-pick \
    d66e44a742608dedd59cdfb4033f9d440ed90ae4 \
    62dcf7e92b06e3f7fd9eb8496a0f46352479ba5a \
    1a78a9525090b96b1e278c71e3fd1d86103fa299 \
    51a6f6bd89687730aba87d004740a34bca4b9c51
  ```

- **방법 B (`git am --3way` — 패치 파일로 4개 커밋 체인 반입 시)**:
  ```bash
  git am --3way docs/class-cue-sheet-handoff-20261107/patches/000*.patch
  ```

- **방법 C (`git apply --index` — 단일 스쿼시 커밋으로 반입 시)**:
  ```bash
  git apply --check docs/class-cue-sheet-handoff-20261107/patches/classCueSheet-squashed-29a6edb-to-51a6f6b.diff
  git apply --index docs/class-cue-sheet-handoff-20261107/patches/classCueSheet-squashed-29a6edb-to-51a6f6b.diff
  ```

### Step 3: 독립 모듈 검증 (48개 테스트 + 타입체크 + 린트 + Chromium 프로브)
앱 라우트/컴포넌트에 연결하기 전에 먼저 독립 모듈 자체가 `origin/main` 위에서 완벽히 동작하는지 검증합니다.

```bash
# 1) TypeScript 전체 프로젝트 빌드/타입 검증
npx tsc -b

# 2) ESLint 정적 분석 (경고/에러 0건 확인)
npx eslint src/features/classCueSheet

# 3) Vitest 5개 테스트 스위트 (총 48개 테스트) 실행
pnpm vitest run src/features/classCueSheet

# 4) 실제 Headless Chromium 4개 뷰포트(320/390/768/1440px)·200% 확대·A4/Letter PDF 프로브 실행
node src/features/classCueSheet/verifyClassCueSheetBrowser.mjs
```

### Step 4: (선택 / 순차) 실제 앱 연결 3지점 패치 적용 및 회귀 검증
독립 모듈 반입이 완료되면, [`INTEGRATION_PATCH_PROPOSAL.md`](file:///home/antigravity/blue45f/pilate_flow/docs/class-cue-sheet-handoff-20261107/INTEGRATION_PATCH_PROPOSAL.md)에 제시된 3개 연결 지점 중 제품 릴리스 범위에 필요한 지점을 선택하여 순차 적용합니다.

1. **연결 지점 1**: [`src/components/SequencePlanPreview.tsx`](file:///home/antigravity/blue45f/pilate_flow/src/components/SequencePlanPreview.tsx) — 리허설/시퀀스 미리보기 모달 내 `<ClassPlanSummary>` 바로 아래 선택적 `'강사용 진행 큐시트 보기'` 토글 연결
2. **연결 지점 2**: [`src/components/ClassBinderView.tsx`](file:///home/antigravity/blue45f/pilate_flow/src/components/ClassBinderView.tsx) — 수업 바인더 저장 시퀀스 인쇄 모달 및 진행 완료 이력 상세 모달 내 큐시트 열람·다중 페이지(A4/Letter) 인쇄 연결
3. **연결 지점 3**: [`src/components/LiveStageView.tsx`](file:///home/antigravity/blue45f/pilate_flow/src/components/LiveStageView.tsx) — 라이브 스테이지 수업 진행 중 강사용 큐시트 보조 뷰(`initialStepIndex={clock.index}`) 토글 연결

---

## 4. 충돌 위험 분석 (Conflict Risk Analysis vs `origin/main` `222b59e`)

### 4.1 파일 경로 충돌: **0건 (Zero File Overlap)**
- `feat/class-cue-sheet`의 모든 산출물은 `src/features/classCueSheet/**` 아래 **14개 신규 파일**로만 구성되어 있습니다.
- `origin/main`(`222b59e`)의 `src/features/` 디렉터리에는 `classPlanReview`, `motionCoverage`, `motionEvidenceReview` 3개 하위 폴더만 존재하며, `src/features/classCueSheet` 경로는 존재하지 않습니다.
- `src/App.tsx`, `src/store/usePilatesStore.ts`, `src/components/**`, `src/styles/**` 등 기존 파일은 단 1줄도 건드리지 않았습니다.

### 4.2 병렬 트랙(`classPlanReview`, `motionCoverage`, `backup`, `motionEvidenceReview`)과의 충돌: **0건**
- **`classPlanReview` (`03d3386`, `f963706`)**: `ClassPlanSummary`는 수업 계획의 시간·좌우 편성 요약만 읽기 전용으로 표시합니다. `ClassCueSheetPreview`는 강사용 실시간 진행 포커스 데크·큐 메모·기구 세팅·다중 페이지 인쇄를 담당하며 서로 상태를 공유하거나 간섭하지 않습니다.
- **`motionCoverage` (`346f04d`, `f963706`) & `motionEvidenceReview` (`222b59e`)**: 동작 커버리지 및 매트/기구 근거 검토 모듈과 런타임/타입 결합이 전혀 없습니다. `classCueSheet`는 미검토 동작이나 이름만 적은 동작도 필수 검토 게이트 없이(`data-mandatory-review-gate="false"`) 즉시 표시합니다.
- **`backup` / `teachingHistorySnapshot` (`ae4175c`, `d948653`)**: `29a6edb..222b59e` 구간에서 `src/types/teachingHistorySnapshot.ts`의 `TeachingProgramSnapshotItem`에 선택적 필드 3개(`stepClassSection?`, `timeEstimate?`, `motionStudy?`)가 추가되었으나, `classCueSheetProjection.ts`는 구조적 타이핑(Structural Typing)과 Allowlist 추출기를 사용하므로 **100% 하위 호환**됩니다. 그 외 `classCueSheet`가 읽기 전용으로 임포트하는 모듈(`equipmentCatalog.ts`, `pilatesCatalog.ts`, `hierarchy.ts`, `pilates.ts`, `sequenceMotion.ts`, `classBlockPresets.ts`, `hierarchyModel.ts`, `sequenceEngine.ts`)은 `29a6edb..222b59e` 사이 변경 사항이 **0건**입니다.
- **UI 컴포넌트 런타임 의존성**: `ClassCueSheetPreview.tsx`는 외부 라이브러리로 오직 `react`(`useLayoutEffect`, `useMemo`, `useRef`, `useState`)만 임포트하며, 스토어나 라우터에 결합되어 있지 않습니다.

### 4.3 CSS / DOM / 접근성(A11y) / 키보드 이벤트 격리 완료
- **CSS 스코핑**: `classCueSheet.css`의 모든 규칙은 `.class-cue-sheet-root` 하위 선택자로 스코핑되어 호스트 모달(`SequencePlanPreview`, `LightDismissDialog`)이나 스테이지(`LiveStageView`)의 전역 스타일을 오염시키지 않습니다.
- **단일 라이브 리전(`aria-live="polite"`)**: 컴포넌트 트리 내 `aria-live` 속성은 `data-testid="cue-sheet-a11y-status"` 단 1곳에만 존재하여 스크린 리더 중복 발화를 방지합니다.
- **편집 컨트롤 키보드 단축키 보호 (`51a6f6b`)**: 포커스 데크의 방향키/단축키(`ArrowLeft/Right/Up/Down`, `Home/End`, `j/k/n/p`) 핸들러는 `input`, `textarea`, `select`, `[contenteditable]`, `[role="textbox"|"searchbox"|"combobox"]`, 수정키(`Ctrl`/`Alt`/`Meta`/`Shift`), 한글 IME 조합 중(`isComposing || keyCode === 229`)에는 절대 동작하지 않으며 `preventDefault()`를 호출하지 않습니다.
- **외부 포커스 비탈취(Non-Stealing Focus)**: 호스트 화면의 다른 컨트롤에 포커스가 있을 때 `sourceInput`이 갱신되더라도 큐시트가 포커스를 빼앗지 않으며, 큐시트 내부의 첫/마지막 이동 버튼이 비활성화(`disabled`)될 때에만 안전하게 포커스 데크로 포커스를 보존합니다.

---

## 5. 48개 테스트 및 실제 Chromium/PDF 검증 결과 요약

### 5.1 Vitest 테스트 스위트 (5개 파일 · 총 48개 테스트 전수 통과)

| 테스트 파일 | 테스트 수 | 핵심 검증 범위 |
| :--- | :---: | :--- |
| [`classCueSheetProjection.test.ts`](file:///home/antigravity/blue45f/pilate_flow/src/features/classCueSheet/classCueSheetProjection.test.ts) | **15** | `SavedSequence`/`ClassSequenceSnapshot`/`TeachingProgramSnapshot`/`OfflineClassPreset`/자유 입력 읽기 전용 프로젝션, 입력 불변성(`Object.freeze`), 미정 시간 무추정(`'시간 미정'`), 반복·세트·좌우 펼치기 유한 상한(`DEFAULT_MAX_*`), 순서 불변 안정 `cueItemId`, 민감 키(`SENSITIVE_CUE_SHEET_KEYS`) 제거 및 HTML 평문 이스케이프 |
| [`ClassCueSheetPreview.test.tsx`](file:///home/antigravity/blue45f/pilate_flow/src/features/classCueSheet/ClassCueSheetPreview.test.tsx) | **18** | 7종 합성 픽스처 렌더링, 라이브 편집 중 `cueItemId` 기반 활성 스텝 유지(`preserved-by-id`), 활성 스텝 삭제 시 인접 항목 이동(`fallback-adjacent-after-delete`) 및 안내 배너, 수업 교체 시 `#01` 초기화(`reset-on-class-change`), 편집 요소(`input`/`textarea`/`select`/`contenteditable`/IME/수정키) 키보드 단축키 보호, 단일 `aria-live` 리전, 외부 포커스 비탈취 |
| [`classCueSheetUsability.test.tsx`](file:///home/antigravity/blue45f/pilate_flow/src/features/classCueSheet/classCueSheetUsability.test.tsx) | **7** | 초보 강사 모바일 우선 읽기 순서(헤더 → 포커스 데크 → 접힌 전체 진행표 → 접힌 진단 패널), 기본 접기(`aria-expanded="false"`), 글자 확대(`100%`/`125%`/`150%`/`200%`), 긴 한국어 메모 줄바꿈, 필수 검토 게이트 없음(`data-mandatory-review-gate="false"`) |
| [`classCueSheetLifecycle.test.tsx`](file:///home/antigravity/blue45f/pilate_flow/src/features/classCueSheet/classCueSheetLifecycle.test.tsx) | **6** | 호스트 부모 리렌더/언마운트/재마운트 복원력, 로컬 인쇄 미리보기 토글 왕복 후 선택 스텝·글자 확대·패널 열림 상태 보존, 0→160→0 스텝 급변 경계 안전성, 다중 인스턴스 격리 |
| [`classCueSheetChromium.test.ts`](file:///home/antigravity/blue45f/pilate_flow/src/features/classCueSheet/classCueSheetChromium.test.ts) | **2** | 실제 Headless Chromium + Poppler(`pdfinfo`/`pdftotext`/`pdftoppm`) 기반 `320px`/`390px`/`768px`/`1440px` 뷰포트·`200%` 글자 확대 가로 넘침 `0px`·`44px×44px` 터치 타겟·키보드/편집 가드 실측 및 A4/US Letter 다중 페이지 PDF(`pages >= 2`) 텍스트/래스터 비공백 검증 |
| **합계** | **48** | **5개 테스트 스위트 · 48개 테스트 모두 통과 (100% Pass)** |

### 5.2 실제 Headless Chromium & PDF 실측 결과 요약
- **반응형 뷰포트 (`320×640`, `390×844`, `768×1024`, `1440×900`)**:
  - 모든 픽스처 및 `200%` 최대 글자 확대 상태에서 `scrollWidth <= clientWidth` (가로 넘침 **0px**), 텍스트/컨트롤 박스 겹침 **0건** 확인.
  - 화면 모드의 모든 인터랙티브 버튼(`처음 항목으로`, `이전 항목`, `다음 항목`, `마지막 항목으로`, 글자 확대 `100%~200%`, 접기/펼치기 요약 버튼 등)이 `>= 44px × 44px` 터치 영역 충족.
- **다중 페이지 로컬 PDF (`A4` & `US Letter`)**:
  - 화면에서 전체 진행표가 기본 접힘(`data-full-list-open="false"`) 상태여도 `@media print` 시 자동으로 전체 항목과 잘림 안내 배너·생략 푸터가 펼쳐져 인쇄됨.
  - 100개 이상 항목 픽스처(`hundred-items-bounded`) 인쇄 시 A4 **8페이지**, US Letter **8페이지** 생성 확인.
  - `pdftotext`로 첫 항목(`#01`), 중간 항목(`#50`), 마지막 허용 항목(`#150`), 상한 생략 푸터 텍스트 보존 확인 및 `pdftoppm -pgm` 래스터 검사에서 빈 페이지 **0장**(`nonWhiteRatio > 0.015`) 검증 완료.
