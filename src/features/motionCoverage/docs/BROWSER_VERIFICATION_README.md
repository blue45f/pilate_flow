# `motionCoverage` 로컬 헤드리스 Chromium 한 명령 검증 및 프리뷰 하네스 모듈 구조 가이드

> [!IMPORTANT]
> - 본 검증 러너([`verifyMotionCoverageBrowser.mjs`](file:///home/antigravity/blue45f/pilate_flow/src/features/motionCoverage/verifyMotionCoverageBrowser.mjs))와 로컬 픽스처([`browserFixture.html`](file:///home/antigravity/blue45f/pilate_flow/src/features/motionCoverage/browserFixture.html))는 소유 경로 `src/features/motionCoverage/` 내부에만 격리되어 있으며, 운영 앱(`src/App.tsx`, `index.html`, `package.json`, 루트 `scripts/`)을 수정하거나 연결하지 않습니다.
> - 데스크톱 헤드리스 Chromium의 뷰포트/미디어 에뮬레이션 결과이며, **모바일 실기기 검증 완료**, **전문가·해부학 검증 완료**, 또는 **진짜 3D(WebGL) 엔진 지원**을 의미하지 않습니다(`canonicalMotionReady: false`, `manualReady: false`, `true3dSupported: false`).

---

## 1. 프리뷰 하네스 기능 경계 분리 구조 (각 파일 < 800줄)

기존 1,144줄이던 프리뷰 하네스를 순환 의존 없는 단방향(DAG) 4개 경계 모듈로 분리했습니다:

| 역할 경계 | 파일 경로 | 줄 수 | 핵심 export 및 책임 |
| :--- | :--- | :---: | :--- |
| **1. 순수 Selector / 상태 어댑터** | [`previewHarnessSelectors.ts`](file:///home/antigravity/blue45f/pilate_flow/src/features/motionCoverage/previewHarnessSelectors.ts) | 216줄 | `buildCatalogDescriptorEntries`, `filterCatalogDescriptorEntries`, `computeCatalogModeCounts`, `findActiveCatalogEntry`, `findFilteredCatalogIndex`, `getAdjacentFilteredExerciseId`, `resolvePreviewEvidenceOverlay`, `isInteractiveControlTarget`, `pointsToSvgPath`, 44px 터치 스타일 상수 |
| **2. Mount / 구독 Lifecycle** | [`previewHarnessLifecycle.ts`](file:///home/antigravity/blue45f/pilate_flow/src/features/motionCoverage/previewHarnessLifecycle.ts) | 233줄 | `usePreviewHarnessController` (`<StrictMode>` 안전 lazy `useRef` + `autoAttachListeners: false` + `reconnect()`/`destroy()`), `mountPreviewHarnessComponent`, `getActivePreviewHarnessRootCount`, `hasActivePreviewHarnessRoot` |
| **3. 로컬 프리뷰 컨트롤 / 스테이지 / 진실성 원장** | [`PreviewHarnessStageView.tsx`](file:///home/antigravity/blue45f/pilate_flow/src/features/motionCoverage/PreviewHarnessStageView.tsx) | 594줄 | `PreviewHarnessStageView`, `ContinuousDraftFigureSurface`, `Discrete2dRigSurface`, `PreviewHarnessTruthLedger` |
| **4. 하네스 셸 / 카탈로그 순회 엔트리** | [`MotionCoveragePreviewHarness.tsx`](file:///home/antigravity/blue45f/pilate_flow/src/features/motionCoverage/MotionCoveragePreviewHarness.tsx) | 454줄 | `MotionCoveragePreviewHarness`, `mountMotionCoveragePreviewHarness`, `MotionCoveragePreviewHarnessProps` |

---

## 2. 한 명령 실행 방법

```bash
node src/features/motionCoverage/verifyMotionCoverageBrowser.mjs
```

JSON 보고서 파일 저장 및 실패 캡처 경로를 지정하려면 다음 옵션을 사용할 수 있습니다:

```bash
node src/features/motionCoverage/verifyMotionCoverageBrowser.mjs \
  --json-out /tmp/motion-coverage-browser-report.json \
  --failure-dir /tmp/motion-coverage-failures
```

- **성공 시**: `summary.fail === 0`과 함께 종료 코드 `0` 반환
- **실패 시**: 실패한 시점의 전체 페이지 스크린샷(`.png`) 및 DOM 스냅샷(`.html`)을 저장하고 종료 코드 `1`(nonzero exit) 반환
- **`finally` 정리 보장**: 자체 실행한 임시 Vite 서버(`127.0.0.1:0`), 헤드리스 Chromium 컨텍스트, 임시 프로필 디렉터리(`os.tmpdir()/pf-motion-coverage-chromium-*`)만 정리하며 외부 프로세스를 건드리지 않습니다.

---

## 3. 검증 항목 구분 (API 직접 호출 vs 실제 브라우저 DOM·키보드·버튼 경로)

출력 JSON은 **`directApiChecks`**(컨트롤러/스위프 API 직접 호출)와 **`realDomAndKeyboardChecks`**(실제 Chromium 렌더링·레이아웃·키보드·클릭 경로)를 분리해 기록합니다.

### 3.1 `directApiChecks` (API 직접 호출 검증)
1. **`direct_api_98_catalog_sweep`**: [`runMotionCoverageCatalogSweep()`](file:///home/antigravity/blue45f/pilate_flow/src/features/motionCoverage/catalogSweep.ts#L53-L194)를 호출해 98개 카탈로그(`three-phase-2d: 77`, `continuous-2d: 1`, `projected-3d: 20`, `missing: 0`), 기존 2D 포즈 에셋 98개 참조 재사용(`newlyCreatedAssetCount: 0`), 이산 77종 비보간/비재생, 연속 초안 21종 재생/탐색 및 `destroy()` 후 잔류 핸들 0건을 검증합니다.
2. **`direct_api_speed_and_repeat_allowed_vs_rejected`**:
   - `DRAFT_SPEEDS` 허용값 `[0.5, 0.75, 1]` 통과 및 거절값 `[0, -1, 0.25, 1.25, 2, NaN, Infinity, -Infinity]` `RangeError` 발생 검증
   - `DRAFT_REPEAT_COUNTS` 허용값 `[1, 2, 3]` 통과(`1`, `2`, `3` 모두 정상 설정) 및 거절값 `[0, -2, 1.5, 4, NaN, Infinity, -Infinity]` `RangeError` 발생 검증

### 3.2 `realDomAndKeyboardChecks` (실제 Chromium DOM·키보드·버튼 경로)
1. **`real_dom_viewport_320_and_390_discrete_mode`**: 이산 3단계(`ex-warmup-01`) 상태에서 `320px`·`390px` 가로 넘침(`scrollWidth <= innerWidth`) 0건 및 19개 인터랙티브 요소 `getBoundingClientRect()` `>= 44px` 실측
2. **`real_dom_viewport_320_and_390_continuous_mode`**: 연속 투영 초안(`original-mat-quadruped-reach`) 상태에서 `320px`·`390px` 가로 넘침 0건 및 30개 인터랙티브 요소 `getBoundingClientRect()` `>= 44px` 실측
3. **`real_dom_representative_4_modes_button_and_seek_paths`**: 대표 4개 상태(`three-phase-2d`, `continuous-2d`, `projected-3d`, `missing`) 버튼 클릭 전환, 속도(`0.75×`)·반복(`2회`)·변형 전환·재생/일시정지 검증
4. **`real_keyboard_native_controls_vs_stage_shortcuts`**:
   - `<input type="range">`에 포커스 후 실제 `ArrowRight` 키 입력 시 스테이지 단축키가 가로채지 않고 슬라이더가 1%씩 이동하는지 검증
   - `<button>`(`속도 0.5×`, `한 주기 재생`)에 포커스 후 `Space` 키 입력 시 스테이지 단축키와 중복 토글되지 않는지 검증
   - 스테이지(`harness-interactive-stage`) 자체 포커스 시 `Home`, `ArrowRight`, `Space` 단축키 정상 동작 검증
5. **`real_browser_runtime_reduced_motion_and_pagehide_recovery`**: 런타임 `prefers-reduced-motion: reduce` 변경 시 즉시 일시정지 -> 명시적 재생 버튼 클릭 시 수동 재생 허용 -> `pagehide` 시 즉시 일시정지 -> 명시적 재생 버튼 클릭 시 복구 검증
6. **`real_browser_mount_unmount_remount_cleanup`**: [`mountMotionCoveragePreviewHarness`](file:///home/antigravity/blue45f/pilate_flow/src/features/motionCoverage/MotionCoveragePreviewHarness.tsx#L443-L454) 3회 연속 `mount -> play -> unmount -> remount` 수행 후 잔류 `requestAnimationFrame` 핸들 0건 검증
