# Pilates 시퀀스 빌더 R5-01 ~ R5-04 실제 Chromium 전후 입력 회귀 증거 및 후보 보존 패키지 (`2026-11-07`)

## 1. 운영 배포 중단 · 자동 배포 여부 읽기 확인 및 후보 보존 상태

1. **현재 세션 배포 상태**: **`미시작 (Not Started)`**
   - 본 세션에서는 어떠한 운영 배포·재배포·롤백 배포도 실행한 적이 없으며(`gh-pages` 브랜치 수정 0건), 긴급 사용자 지시(`"일단 배포 다 멈추고 그 머지부터 해줘"`)에 따라 모든 운영 배포를 엄격히 금지합니다.
2. **`main` Push 시 자동 배포 유발 여부 읽기 검증 결과**:
   - 로컬 `.github/workflows` 디렉터리: **존재하지 않음** (`No such file or directory`).
   - GitHub Pages 설정 (`gh api repos/blue45f/pilate_flow/pages`):
     - `"build_type": "legacy"`, `"source": { "branch": "gh-pages", "path": "/" }`
   - GitHub Actions 워크플로 (`gh api repos/blue45f/pilate_flow/actions/workflows` 및 `deployments`):
     - 유일한 워크플로인 `pages-build-deployment`는 **`gh-pages` 브랜치에 push될 때만** 동작하며, **`main` 또는 기능 브랜치에 push할 때는 자동 배포가 유발되지 않습니다.**
3. **공유 빌더 소스 후보 보존 및 `main` 병합 구분**:
   - **공유 빌더 소스 수정 후보 (`be5a842` / `e365b828`)**:
     - 별도 담당의 미반영 후보(`4804fcb`, `543685b`)가 아직 원격(`origin`) 및 로컬 Git 객체 DB에 존재하지 않아(`Not a valid object name`) 무손실 3-way 비교 전까지 **`SequenceOrderCard.tsx` / `sequenceDrag.ts` / `sequence-composition.css`의 `main` 병합은 보류**하고, 독립 브랜치(`test/builder-r5-01-04-pure-regression-20261107` = `be5a84246d51b8b059c464d3d8ef608129a6924f`, `candidate/builder-r5-01-04-20261107` = `e365b8284e3fc81bf455da76e4acbfb9e7d0b701`) 및 아래 `format-patch` 아티팩트로 무손실 보존합니다.
   - **충돌 0% 브라우저 회귀 증거 패키지 (`docs/builder-r5-browser-proof-20261107`)**:
     - 본 패키지는 제품 소스(`src/**`, `App.tsx`, 공유 스토어, 스키마, 라우트, 전역 CSS 등)를 단 1바이트도 수정하지 않고 전용 디렉터리 [`docs/builder-r5-browser-proof-20261107/`](file:///home/antigravity/blue45f/pilate_flow-worktrees/r5-browser-proof-20261107/docs/builder-r5-browser-proof-20261107/)만 추가하므로 다른 모든 후보와 충돌이 전혀 없습니다.

---

## 2. 원본 회수용 두 후보(`be5a842`, `e365b828`) `format-patch` 크기 · SHA256 · 다운로드 링크

기존 두 후보 브랜치(`be5a84246d51b8b059c464d3d8ef608129a6924f`, `e365b8284e3fc81bf455da76e4acbfb9e7d0b701`)를 전혀 건드리지 않고 그대로 추출한 `git format-patch` 파일입니다:

| 후보 구분 | 커밋 SHA | `git patch-id --stable` | 파일 크기 (Bytes / Lines) | SHA-256 해시 | 다운로드 파일 링크 |
| --- | --- | --- | --- | --- | --- |
| **후보 1 (순수 회귀 테스트 · 공유 소스 수정 0건)** | `be5a84246d51b8b059c464d3d8ef608129a6924f` (`test/builder-r5-01-04-pure-regression-20261107`) | `c5672dadc4b75bd5d9b5a556bf569d087b6bab04` | **`23,770 bytes`** (`467 lines`) | `86e4313811f5440cc9ee2369331b584cee22c734a09953db224dccb2ad71a5e9` | [`0001-be5a842-test-builder-r5-01-04-pure-regression.patch`](file:///home/antigravity/blue45f/pilate_flow/docs/builder-r5-browser-proof-20261107/patches/0001-be5a842-test-builder-r5-01-04-pure-regression.patch) |
| **후보 2 (`R5-01~04` 최소 소스 패치)** | `e365b8284e3fc81bf455da76e4acbfb9e7d0b701` (`candidate/builder-r5-01-04-20261107`) | `315fba0cefb8448bdafe9824bd35765b40142e54` | **`7,301 bytes`** (`165 lines`) | `ab05055a2572a008cd9982f2567bd3a53174b739af21f7b08ed161e929199a19` | [`0002-e365b82-fix-builder-r5-01-04-minimal-candidate.patch`](file:///home/antigravity/blue45f/pilate_flow/docs/builder-r5-browser-proof-20261107/patches/0002-e365b82-fix-builder-r5-01-04-minimal-candidate.patch) |

---

## 3. WebKit / Safari 정직한 한계 명시 (`미검증` 유지)

> [!IMPORTANT]
> - **실제 WebKit / Safari 브라우저 런타임 실행 여부: `미검증 (UNVERIFIED)`**
> - 본 VM(Debian 12 읽기 전용 샌드박스)에는 실제 Safari 또는 WebKit 런타임 바이너리가 존재하지 않으므로, 아래 모든 브라우저 전후 재현·검증은 **`Chromium 156.0.8078.79 built on Debian GNU/Linux 12 (bookworm)` (Blink)**에서 수행되었음을 명시하며 이를 Safari 런타임 검증으로 호칭하거나 과장하지 않습니다.

---

## 4. R5-01 ~ R5-04 실제 Chromium UI 패치 전(`1f0356a`) vs 패치 후(`e365b828`) 비교 실측

합성 80단계 혼합 수업안(`합성 80단계 R5 브라우저 검증 수업안`)을 대상으로 전용 스크립트 [`verify-r5-browser-proof.mjs`](file:///home/antigravity/blue45f/pilate_flow/docs/builder-r5-browser-proof-20261107/verify-r5-browser-proof.mjs)를 실행하여 수집한 원시 JSON은 [`evidence/r5-browser-proof-metrics.json`](file:///home/antigravity/blue45f/pilate_flow/docs/builder-r5-browser-proof-20261107/evidence/r5-browser-proof-metrics.json)에 보존되어 있습니다.

### 4.1 R5-01: 섹션 경계 드래그 중 `resize` / `blur` / `visibilitychange` 중단 및 즉시 재드래그

- **재현 시나리오**: `390×844`에서 13번 휴식 카드(`syn-rest-13`)를 11번 슬롯(`syn-move-11`)으로 섹션 헤더를 넘어 위로 드래그하던 중 (1) `844×390` 화면 회전(`resize`), (2) 창 `blur`, (3) 탭 비가시화(`visibilitychange`) 발생 후, `pointercancel` 없이 즉시 같은 카드를 다시 드래그.
- **전후 비교 영상**: [`videos/r5-01-before-vs-after.mp4`](file:///home/antigravity/blue45f/pilate_flow/docs/builder-r5-browser-proof-20261107/videos/r5-01-before-vs-after.mp4) / [`videos/r5-01-before-vs-after.webm`](file:///home/antigravity/blue45f/pilate_flow/docs/builder-r5-browser-proof-20261107/videos/r5-01-before-vs-after.webm)
- **전후 스크린샷**:
  - 패치 전(`1f0356a` 실패): [`screenshots/r5-01-before-resize-interruption.png`](file:///home/antigravity/blue45f/pilate_flow/docs/builder-r5-browser-proof-20261107/screenshots/r5-01-before-resize-interruption.png)
  - 패치 후(`e365b828` 통과): [`screenshots/r5-01-after-resize-interruption.png`](file:///home/antigravity/blue45f/pilate_flow/docs/builder-r5-browser-proof-20261107/screenshots/r5-01-after-resize-interruption.png)

| 측정 항목 | 패치 전 (`origin/main` `1f0356a`) | 패치 후 (`candidate` `e365b828`) |
| --- | --- | --- |
| `resize` 직후 `.sequence-drag-overlay` 개수 | `0` | `0` |
| `resize` 직후 11~15번 순서 보존 (`orderSlice10To15`) | `["syn-move-11", "syn-move-12", "syn-rest-13", "syn-move-14", "syn-move-15"]` | `["syn-move-11", "syn-move-12", "syn-rest-13", "syn-move-14", "syn-move-15"]` |
| `resize` 직후 섹션 헤더 `style.translate` | **`"0px 282px"` (잔류 결함)** | **`""` (즉시 초기화)** |
| `resize` 직후 섹션 헤더 좌표 (`headerRect`) | `{ left: 39, top: 647, width: 766, height: 24, bottom: 671 }` | `{ left: 39, top: 365, width: 766, height: 24, bottom: 389 }` |
| `resize` 직후 13번 카드 좌표 (`card13Rect`) | `{ left: 39, top: 393, width: 766, height: 218, bottom: 611 }` | `{ left: 39, top: 393, width: 766, height: 218, bottom: 611 }` |
| 헤더가 13번 카드와 겹치는지 (`headerOverlapsCard13`) | **`true` (결함 재현)** | **`false` (겹침 해소)** |
| 즉시 재드래그 시 생성된 overlay 개수 (`reDragOverlayCount`) | **`0` (`null` — 재드래그 차단됨)** | **`1` (`{ left: 39, top: 353, width: 766, height: 218 }` — 정상 시작)** |
| `blur` 중단 직후 헤더 `style.translate` | **`"0px 282px"` (잔류 결함)** | **`""` (즉시 초기화)** |
| `visibilitychange` 중단 직후 헤더 `style.translate` | **`"0px 282px"` (잔류 결함)** | **`""` (즉시 초기화)** |

---

### 4.2 R5-02: `160ms` 이내(`25ms` 간격) 빠른 연속 재드래그 및 `200%` 확대 중첩 검증

- **재현 시나리오**: 1번 카드를 2번 슬롯에 드롭한 뒤 `160ms` 드롭 복귀 애니메이션이 진행 중인 `25ms` 시점에 `200%` 확대(`zoom: 2`) 상태에서 3번 카드를 1번 슬롯으로 즉시 드래그.
- **전후 비교 영상**: [`videos/r5-02-before-vs-after.mp4`](file:///home/antigravity/blue45f/pilate_flow/docs/builder-r5-browser-proof-20261107/videos/r5-02-before-vs-after.mp4) / [`videos/r5-02-before-vs-after.webm`](file:///home/antigravity/blue45f/pilate_flow/docs/builder-r5-browser-proof-20261107/videos/r5-02-before-vs-after.webm)
- **전후 스크린샷**:
  - 패치 전(`1f0356a` 실패): [`screenshots/r5-02-before-rapid-drag-zoom200.png`](file:///home/antigravity/blue45f/pilate_flow/docs/builder-r5-browser-proof-20261107/screenshots/r5-02-before-rapid-drag-zoom200.png)
  - 패치 후(`e365b828` 통과): [`screenshots/r5-02-after-rapid-drag-zoom200.png`](file:///home/antigravity/blue45f/pilate_flow/docs/builder-r5-browser-proof-20261107/screenshots/r5-02-after-rapid-drag-zoom200.png)

| 측정 항목 | 패치 전 (`origin/main` `1f0356a`) | 패치 후 (`candidate` `e365b828`) |
| --- | --- | --- |
| 2번째 드래그 시작 직전 퇴장 중 overlay 개수 (`overlaysBeforeSecondDrag`) | `1` | `1` |
| 2번째 드래그 중 동시 존재 overlay 개수 (`concurrentOverlayCount`) | `2` (퇴장 클론 1 + 신규 활성 1) | `2` (퇴장 클론 1 + 신규 활성 1) |
| 원본 카드 실측 좌표 (`sourceCardRect`) | `{ left: 66, top: 3361, width: 258, height: 470 }` | `{ left: 66, top: 3361, width: 258, height: 470 }` |
| 신규 활성 overlay 좌표 (`activeOverlayRect`) | **`{ left: 132, top: 4075, width: 516, height: 941 }` (2배 비대 결함)** | **`{ left: 66, top: 2037, width: 258, height: 235 }` (정확히 일치)** |
| 신규 활성 overlay 폭과 원본 카드 폭 일치 (`activeOverlayWidthMatchesSourceCard`) | **`false` (`516px` vs `258px`)** | **`true` (`258px === 258px`, `left: 66 === 66`)** |
| 드롭 완료 후 잔류 overlay 개수 (`overlayCountAfterSettle`) | `0` | `0` |

---

### 4.3 R5-03: 포커스 없는 터치 `Escape` 드래그 취소 (`document.body` `Escape`)

- **재현 시나리오**: 터치 드래그로 1번 카드를 2번 슬롯 위로 이동시킨 상태에서 핸들 `<button>`을 거치지 않고 `document.body`에서 `Escape` 키 이벤트가 발생할 때(터치 시 버튼으로 포커스가 이동하지 않는 환경 재현) 드래그 취소 여부 확인. *(실제 Safari/WebKit 런타임은 `미검증` 유지)*
- **전후 비교 영상**: [`videos/r5-03-before-vs-after.mp4`](file:///home/antigravity/blue45f/pilate_flow/docs/builder-r5-browser-proof-20261107/videos/r5-03-before-vs-after.mp4) / [`videos/r5-03-before-vs-after.webm`](file:///home/antigravity/blue45f/pilate_flow/docs/builder-r5-browser-proof-20261107/videos/r5-03-before-vs-after.webm)
- **전후 스크린샷**:
  - 패치 전(`1f0356a` 실패): [`screenshots/r5-03-before-unfocused-touch-escape.png`](file:///home/antigravity/blue45f/pilate_flow/docs/builder-r5-browser-proof-20261107/screenshots/r5-03-before-unfocused-touch-escape.png)
  - 패치 후(`e365b828` 통과): [`screenshots/r5-03-after-unfocused-touch-escape.png`](file:///home/antigravity/blue45f/pilate_flow/docs/builder-r5-browser-proof-20261107/screenshots/r5-03-after-unfocused-touch-escape.png)

| 측정 항목 | 패치 전 (`origin/main` `1f0356a`) | 패치 후 (`candidate` `e365b828`) |
| --- | --- | --- |
| 포커스 없는 `Escape` 후 `.sequence-drag-overlay` 개수 | **`1` (취소 실패 · 드래그 계속 유지됨)** | **`0` (즉시 취소 완료)** |
| 포커스 없는 `Escape` 후 `.sequence-drop-indicator` 개수 | **`1` (취소 실패)** | **`0` (즉시 제거)** |
| 포커스 없는 `Escape` 후 2번 이웃 카드 `transform` | **`"translateY(-174.188px)"` (밀림 잔류)** | **`""` (원위치 복구)** |
| 1번 / 2번 카드 좌표 (`card1Rect` / `card2Rect`) | `top: 40` / **`top: 40` (겹침 상태 유지)** | `top: 40` / **`top: 214` (정상 간격 복원)** |
| 1번 카드 인덱스 (`step1Index`) | `0` | `0` |

---

### 4.4 R5-04: 키보드 5회 연속 재정렬 (`ArrowDown` × 5 / `ArrowUp` × 5)

- **재현 시나리오**: 1번 카드(`syn-move-1`)의 `순서` 핸들에서 한 프레임 내 연속 5회 `ArrowDown` 입력 후 순서·인덱스·카드 좌표를 측정하고, 다시 연속 5회 `ArrowUp`으로 원위치 복귀 확인.
- **전후 비교 영상**: [`videos/r5-04-before-vs-after.mp4`](file:///home/antigravity/blue45f/pilate_flow/docs/builder-r5-browser-proof-20261107/videos/r5-04-before-vs-after.mp4) / [`videos/r5-04-before-vs-after.webm`](file:///home/antigravity/blue45f/pilate_flow/docs/builder-r5-browser-proof-20261107/videos/r5-04-before-vs-after.webm)
- **전후 스크린샷**:
  - 패치 전(`1f0356a` 실패): [`screenshots/r5-04-before-keyboard-5x-arrowdown.png`](file:///home/antigravity/blue45f/pilate_flow/docs/builder-r5-browser-proof-20261107/screenshots/r5-04-before-keyboard-5x-arrowdown.png)
  - 패치 후(`e365b828` 통과): [`screenshots/r5-04-after-keyboard-5x-arrowdown.png`](file:///home/antigravity/blue45f/pilate_flow/docs/builder-r5-browser-proof-20261107/screenshots/r5-04-after-keyboard-5x-arrowdown.png)

| 측정 항목 | 패치 전 (`origin/main` `1f0356a`) | 패치 후 (`candidate` `e365b828`) |
| --- | --- | --- |
| `ArrowDown` 5회 연속 입력 후 `syn-move-1` 인덱스 (`indexAfter5ArrowDown`) | **`1` (1칸만 이동하고 멈춤)** | **`5` (5칸 정확히 이동 — 6번째 슬롯)** |
| 상위 6개 카드 순서 (`topSixAfter5ArrowDown`) | `["syn-move-2", "syn-move-1", "syn-move-3", "syn-move-4", "syn-move-5", "syn-move-6"]` | `["syn-move-2", "syn-move-3", "syn-move-4", "syn-move-5", "syn-move-6", "syn-move-1"]` |
| `ArrowUp` 5회 연속 입력 후 복귀 인덱스 (`indexAfter5ArrowUp`) | `0` | `0` |
| 키보드 재정렬 중 불필요한 overlay 개수 (`overlayCountDuringKeyboard`) | `0` | `0` |

---

## 5. 후보(`e365b828`) 뷰포트 · 200% 확대 매트릭스 (`320 / 390 / 768 / 1440` × `100% / 200%`) 좌표 실측

| 뷰포트 / 확대 | 입력 | 가로 넘침 | 드래그 중 overlay 개수 | 원본 카드 좌표 (`sourceCardRect`) | 활성 overlay 좌표 (`overlayRect`) | 삽입 자리 좌표 (`indicatorRect`) | 드롭 후 overlay 개수 | 드롭 후 상위 3개 순서 (`topThreeOrder`) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `320×640` (`100%`) | `touch` | `0px` | `1` | `{ left: 27, top: 70, width: 266, height: 178 }` | `{ left: 27, top: 229, width: 266, height: 178 }` | `{ left: 27, top: 245, width: 266, height: 178 }` | `0` | `["syn-move-2", "syn-move-1", "syn-move-3"]` |
| `390×844` (`100%`) | `touch` | `0px` | `1` | `{ left: 33, top: 70, width: 324, height: 156 }` | `{ left: 33, top: 210, width: 324, height: 156 }` | `{ left: 33, top: 227, width: 324, height: 156 }` | `0` | `["syn-move-2", "syn-move-1", "syn-move-3"]` |
| `768×1024` (`100%`) | `touch` | `0px` | `1` | `{ left: 39, top: 70, width: 690, height: 136 }` | `{ left: 39, top: 193, width: 690, height: 136 }` | `{ left: 39, top: 212, width: 690, height: 136 }` | `0` | `["syn-move-2", "syn-move-1", "syn-move-3"]` |
| `1440×900` (`100%`) | `mouse` | `0px` | `1` | `{ left: 255, top: 70, width: 1123, height: 136 }` | `{ left: 255, top: 193, width: 1123, height: 136 }` | `{ left: 255, top: 212, width: 1123, height: 136 }` | `0` | `["syn-move-2", "syn-move-1", "syn-move-3"]` |
| `320×640` (`200%`) | `touch` | `0px` | `1` | `{ left: 54, top: 70, width: 212, height: 514 }` | `{ left: 54, top: 320, width: 212, height: 514 }` | `{ left: 54, top: 479, width: 212, height: 514 }` | `0` | `["syn-move-2", "syn-move-1", "syn-move-3"]` |
| `390×844` (`200%`) | `touch` | `0px` | `1` | `{ left: 66, top: 70, width: 258, height: 471 }` | `{ left: 66, top: 288, width: 258, height: 471 }` | `{ left: 66, top: 443, width: 258, height: 471 }` | `0` | `["syn-move-2", "syn-move-1", "syn-move-3"]` |
| `768×1024` (`200%`) | `touch` | `0px` | `1` | `{ left: 78, top: 70, width: 612, height: 1107 }` | `{ left: 78, top: 536, width: 612, height: 1107 }` | `{ left: 78, top: 969, width: 612, height: 1107 }` | `0` | `["syn-move-2", "syn-move-1", "syn-move-3"]` |
| `1440×900` (`200%`) | `mouse` | `0px` | `1` | `{ left: 322, top: 70, width: 1002, height: 272 }` | `{ left: 322, top: 158, width: 1002, height: 272 }` | `{ left: 322, top: 266, width: 1002, height: 272 }` | `0` | `["syn-move-2", "syn-move-1", "syn-move-3"]` |
