# Pilates 시퀀스 빌더 80단계 교차 입력·뷰포트·스트레스 및 WebKit/Safari 호환성 독립 재검증 (Round 5 — `2026-11-07`)

## 1. 검증 범위 및 활성 파일 소유 확인 (Zero Product Source Modification)

- **기준 브랜치**: `origin/main` (`4aca36e42143bf8201247228f1a8bfeb6ff5b07c`)
- **검증 작업 브랜치**: `docs/builder-cross-input-round5-20261107`
- **엄격한 소유 범위 준수**:
  - 본 라운드(Round 5)는 **제품 소스 파일을 단 1바이트도 수정하지 않고(`src/**` 수정 0건)** [`docs/builder-cross-input-round5-20261107/`](file:///home/antigravity/blue45f/pilate_flow/docs/builder-cross-input-round5-20261107/) 하위 문서·측정 스크립트·증거·최소 패치 후보만 생성 및 커밋합니다.
  - 다른 활성 구현자(PackagePanel/CI, Home, Atlas 등) 및 빌더 컴포넌트([`src/components/SequenceOrderCard.tsx`](file:///home/antigravity/blue45f/pilate_flow/src/components/SequenceOrderCard.tsx), [`src/utils/sequenceDrag.ts`](file:///home/antigravity/blue45f/pilate_flow/src/utils/sequenceDrag.ts), [`src/styles/sequence-composition.css`](file:///home/antigravity/blue45f/pilate_flow/src/styles/sequence-composition.css))와의 충돌을 원천 차단하기 위해, 발견된 엣지/스트레스 결함 4건(**R5-01 ~ R5-04**)은 **정확한 재현 절차·실측 영향·최소 패치 후보([`patches/builder-round5-minimal-candidates.patch`](file:///home/antigravity/blue45f/pilate_flow/docs/builder-cross-input-round5-20261107/patches/builder-round5-minimal-candidates.patch))**로 문서화하여 보고합니다.

---

## 2. WebKit / Safari 실행 가능 여부 및 정직한 엔진 명시 (`미검증` 선언)

> [!IMPORTANT]
> **WebKit / Safari 실제 브라우저 런타임 실행 여부: `미검증 (UNVERIFIED)`**
> - 기존 Debian 12 읽기 전용 샌드박스 VM 환경을 전수 확인한 결과(`which webkit safari playwright-webkit epiphany midori`, `find /usr /opt /home/antigravity/.cache -maxdepth 4 -iname "*webkit*"`), 설치된 브라우저는 **`/usr/bin/chromium` (`Chromium 156.0.8078.79 built on Debian GNU/Linux 12 (bookworm)`, Blink 엔진)** 단일 바이너리뿐이며 **WebKit 또는 Safari 런타임 바이너리가 존재하지 않습니다.**
> - 작업 제약(`새 설치/유료 서비스/권한 변경 없이 가능한 기존 환경만 사용`, `WebKit을 사용할 수 없다면 Chromium을 Safari로 부르지 말고 미검증을 명시하세요`)에 따라:
>   1. **실제 WebKit / iOS Safari / macOS Safari 브라우저 엔진 런타임 실행 검증은 `미검증 (UNVERIFIED)`으로 명시합니다.**
>   2. 아래 모든 실측 브라우저 수치와 스크린샷은 **Chromium 156.0.8078.79 (Blink)** 실행 결과임을 명확히 표기하며, Chromium 결과를 Safari/WebKit 결과로 호칭하지 않습니다.
>   3. 대신 WebKit/Safari 엔진의 알려진 표준/비표준 동작 차이를 코드 레벨에서 정밀 대조하고, Chromium CDP를 통해 WebKit 동일 조건(포인터 캡처/포커스 비이동, `resize` 이벤트, CSS `zoom` 배율)을 시뮬레이션하여 실제 결함(**R5-01 ~ R5-04**)을 검출했습니다.

### WebKit / Safari 정적 호환성 및 엔진 차이 대조표

| 기능 영역 | 관련 코드 위치 | Chromium 156 (Blink) 실측 | WebKit / Safari (iOS·iPadOS·macOS) 런타임 검증 상태 및 호환성 분석 |
| --- | --- | --- | --- |
| **Pointer Events & `setPointerCapture`** | [`SequenceOrderCard.tsx#L196-L268`](file:///home/antigravity/blue45f/pilate_flow/src/components/SequenceOrderCard.tsx#L196-L268) | **실측 통과** (`touch` / `mouse` 모두 정상 캡처 및 해제) | **런타임 `미검증`** · Safari 13+ 지원. 단, 합성 이벤트 예외를 위한 `try/catch`가 이미 적용되어 안전함. |
| **터치 스크롤 충돌 방지 (`touch-action: none`)** | [`sequence-composition.css#L166-L169`](file:///home/antigravity/blue45f/pilate_flow/src/styles/sequence-composition.css#L166-L169) | **실측 통과** (핸들 드래그 시 오프스크린 자동스크롤만 작동, 본문 터치 시 네이티브 스크롤 보존) | **런타임 `미검증`** · iOS Safari 13+에서 `touch-action: none`은 지원되나, 8px 이동 임계값 도달 전 롱프레스 시 iOS 텍스트 선택/콜아웃 버블이 뜰 수 있어 `-webkit-user-select: none; -webkit-touch-callout: none;` 보강 권장 (**R5-03**). |
| **개별 `translate` 속성과 `transform: translateY()` 결합** | [`SequenceOrderCard.tsx#L74-L85`](file:///home/antigravity/blue45f/pilate_flow/src/components/SequenceOrderCard.tsx#L74-L85), [`sequenceDrag.ts#L266-L288`](file:///home/antigravity/blue45f/pilate_flow/src/utils/sequenceDrag.ts#L266-L288) | **실측 통과** (섹션 경계 이동 시 `.pf-sequence-block__header`가 `style.translate`로 정확히 밀림) | **런타임 `미검증`** · 개별 CSS `translate` 속성은 Safari 14.1+에서 지원됨. 단, 드래그 중 화면 회전(`resize`)으로 `sequenceDrag`가 내부 `cancel()`될 때 `SequenceOrderCard`가 `header.style.translate`를 지우지 못하는 결함 확인 (**R5-01**). |
| **CSS `:has()` 선택자 기반 마지막 카드 여백 보정** | [`sequence-composition.css#L142-L144`](file:///home/antigravity/blue45f/pilate_flow/src/styles/sequence-composition.css#L142-L144) | **실측 통과** (단일 드래그 중 `margin-bottom: 0` 유지) | **런타임 `미검증`** · `:has()`는 Safari 15.4+ 지원. 단, `160ms` 드롭 복귀 애니메이션이 끝나기 전에 같은 섹션에서 즉시 재드래그하면 `.sequence-drag-overlay`가 일시적으로 2개 존재하여 `:nth-last-child(2):has(+ .sequence-drag-overlay)`가 매칭되지 않는 결함 확인 (**R5-02**). |
| **200% 확대(`zoom: 2`) 시 `currentCSSZoom` 및 좌표 보정** | [`SequenceOrderCard.tsx#L43-L55`](file:///home/antigravity/blue45f/pilate_flow/src/components/SequenceOrderCard.tsx#L43-L55) | **실측 통과** (`currentCSSZoom = 2`, 320/390/768/1440 200% 확대에서 카드 폭·좌표 오차 `0px`) | **런타임 `미검증`** · `Element.currentCSSZoom`은 Safari 18.4 미만에서 `undefined`이며, 구형 WebKit과 최신 WebKit 간 `getBoundingClientRect()`의 CSS `zoom` 반영 여부가 다를 수 있음. `cardEl.getBoundingClientRect().width / cardEl.offsetWidth` 실측 비율 폴백 추가 권장 (**R5-03**). |
| **iPadOS Safari 외장 키보드 `Escape` 드래그 취소** | [`SequenceOrderCard.tsx#L200`](file:///home/antigravity/blue45f/pilate_flow/src/components/SequenceOrderCard.tsx#L200), [`SequenceOrderCard.tsx#L271-L275`](file:///home/antigravity/blue45f/pilate_flow/src/components/SequenceOrderCard.tsx#L271-L275) | **결함 재현 (`R5-03`)** (핸들 포커스가 없을 때 `window` `Escape`로 취소 불가) | **런타임 `미검증` (시뮬레이션 재현 완료)** · iOS/iPadOS WebKit은 터치 `pointerdown` 시 `<button>`에 키보드 포커스를 이동시키지 않거나 외장 키보드 포커스가 분리될 수 있음. 현재 `Escape` 리스너가 핸들 `onKeyDown`에만 있고 `sequenceDrag.ts`의 `window`에는 없어 포커스 분리 시 `Escape` 취소가 동작하지 않음 (**R5-03**). |

---

## 3. 기존 단위 테스트 재현 결과 (`5 files, 58 tests passed`)

제품 소스를 수정하지 않은 최신 `main` (`4aca36e`) 상태에서 기존 빌더 단위 테스트 5개 파일(58개 테스트)을 그대로 재현하여 모두 통과함을 확인했습니다.

```text
RUN  v3.2.7 /home/antigravity/blue45f/pilate_flow
 ✓ src/components/SequenceOrderCard.test.tsx (17 tests) 1802ms
 ✓ src/components/SequenceWorkbench.home.test.tsx (4 tests) 1059ms
 ✓ src/components/SequenceWorkbench.classSection.test.tsx (4 tests) 866ms
 ✓ src/components/OfflinePresetPicker.test.tsx (4 tests) 311ms
 ✓ src/utils/sequenceDrag.test.ts (29 tests) 98ms

 Test Files  5 passed (5)
      Tests  58 passed (58)
```

---

## 4. 사용자 핵심 4대 요구사항 실측 매트릭스 (Chromium 156, 80단계 혼합 시퀀스)

합성 80단계 혼합 수업안(`80동작/휴식/블록 혼합`: `warmup` 1~12, `rest` 13, `main` 14~34, `rest` 35, `main` 36~56, `rest` 57, `cooldown` 58~72, `rest` 73, `cooldown` 74~80)을 대상으로 **자연스러운 카드 들어올림(`Card Lift`), 이웃 밀림(`Neighbor Shift`), 삽입 자리(`Insertion Placeholder`), 드롭 복귀(`Drop Return`)**를 실측했습니다.
원시 측정 JSON은 [`evidence/round5-cross-input-metrics.json`](file:///home/antigravity/blue45f/pilate_flow/docs/builder-cross-input-round5-20261107/evidence/round5-cross-input-metrics.json)에 보존되어 있습니다.

### 4.1 뷰포트 및 200% 확대 매트릭스 (`320 / 390 / 768 / 1440` × `100% / 200%`)

| 뷰포트 / 확대 | 입력 방식 | 가로 넘침 (`overflowPx`) | 1. 자연스러운 카드 들어올림 (`overlayWidthDiffPx` / `pointerTrackingDeltaDiffPx` / `sourceDimmed`) | 2. 이웃 밀림 (`c1Transform` / `c1ShiftedUpPx`) | 3. 삽입 자리 (`indicatorLabel` / `indicatorWidthDiffPx` / `overlapsNeighbor`) | 4. 드롭 복귀 (`overlayAnimatingImmediatelyOnDrop` / `committedStepIndex` / `handleFocused`) | 스크린샷 증거 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `320×640` (`100%`) | `touch` | `0px` | `0px` / `0px` / `true` | `translateY(-195.938px)` (`195px`) | `"2번째 위치"` / `0px` / `false` | `true` / `1` (2번째 슬롯) / `true` | [`round5-mobile-320.png`](file:///home/antigravity/blue45f/pilate_flow/docs/builder-cross-input-round5-20261107/screenshots/round5-mobile-320.png) |
| `390×844` (`100%`) | `touch` | `0px` | `0px` / `0px` / `true` | `translateY(-174.188px)` (`175px`) | `"2번째 위치"` / `0px` / `false` | `true` / `1` (2번째 슬롯) / `true` | [`round5-mobile-390.png`](file:///home/antigravity/blue45f/pilate_flow/docs/builder-cross-input-round5-20261107/screenshots/round5-mobile-390.png) |
| `768×1024` (`100%`) | `touch` | `0px` | `0px` / `0px` / `true` | `translateY(-154px)` (`154px`) | `"2번째 위치"` / `0px` / `false` | `true` / `1` (2번째 슬롯) / `true` | [`round5-tablet-768.png`](file:///home/antigravity/blue45f/pilate_flow/docs/builder-cross-input-round5-20261107/screenshots/round5-tablet-768.png) |
| `1440×900` (`100%`) | `mouse` | `0px` | `0px` / `0px` / `true` | `translateY(-154px)` (`154px`) | `"2번째 위치"` / `0px` / `false` | `true` / `1` (2번째 슬롯) / `true` | [`round5-desktop-1440.png`](file:///home/antigravity/blue45f/pilate_flow/docs/builder-cross-input-round5-20261107/screenshots/round5-desktop-1440.png) |
| `320×640` (`200%`) | `touch` | `0px` | `0px` / `0px` / `true` | `translateY(-274.985px)` (`586px`) | `"2번째 위치"` / `0px` / `false` | `true` / `1` (2번째 슬롯) / `true` | [`round5-mobile-320-zoom200.png`](file:///home/antigravity/blue45f/pilate_flow/docs/builder-cross-input-round5-20261107/screenshots/round5-mobile-320-zoom200.png) |
| `390×844` (`200%`) | `touch` | `0px` | `0px` / `0px` / `true` | `translateY(-253.539px)` (`632px`) | `"2번째 위치"` / `0px` / `false` | `true` / `1` (2번째 슬롯) / `true` | [`round5-mobile-390-zoom200.png`](file:///home/antigravity/blue45f/pilate_flow/docs/builder-cross-input-round5-20261107/screenshots/round5-mobile-390-zoom200.png) |
| `768×1024` (`200%`) | `touch` | `0px` | `0px` / `0px` / `true` | `translateY(-571.25px)` (`1178px`) | `"2번째 위치"` / `0px` / `false` | `true` / `1` (2번째 슬롯) / `true` | [`round5-tablet-768-zoom200.png`](file:///home/antigravity/blue45f/pilate_flow/docs/builder-cross-input-round5-20261107/screenshots/round5-tablet-768-zoom200.png) |
| `1440×900` (`200%`) | `mouse` | `0px` | `0px` / `0px` / `true` | `translateY(-191px)` (`382px`) | `"2번째 위치"` / `0px` / `false` | `true` / `1` (2번째 슬롯) / `true` | [`round5-desktop-1440-zoom200.png`](file:///home/antigravity/blue45f/pilate_flow/docs/builder-cross-input-round5-20261107/screenshots/round5-desktop-1440-zoom200.png) |

### 4.2 입력 수단별 (`터치 / 마우스 / 키보드`) 실측 요약

1. **터치 (`pointerType: 'touch'`)**:
   - `320px`, `390px`, `768px` (100% 및 200% 확대)에서 `8px` 임계값 도달 시 `.sequence-drag-overlay`가 원본과 동일한 폭/X좌표(`diff = 0px`)로 들어올려지고, 손가락 이동량과 `translate3d` 추적 오차 `0px`, 이웃 카드(`c1`) 및 섹션 헤더 밀림 정상, 드롭 시 `160ms` `ease-out` 복귀 애니메이션 및 포커스 복구 확인.
2. **마우스 (`pointerType: 'mouse'`)**:
   - `3px` 미세 이동 시 드래그 미시작(`subThresholdNoOp: true`), 목록 바깥(`x = 24px`)으로 벗어날 시 안내 문구(`목록 안에 놓아 주세요`) 표시 후 드롭 시 원래 순서 보존(`outOfBoundsCanceledCleanly: true`), 유효 슬롯 드롭 시 정확한 재정렬(`mouseReorderedToSlot2: true`).
3. **키보드 (`ArrowDown` / `ArrowUp` / `Escape`)**:
   - 단일 `ArrowDown` 입력 시 1번 카드가 2번째 위치로 즉시 이동하고 `"1번 캐리지 호흡 & 암 아크 순서를 2번째 위치로 바꿨어요. 되돌릴 수 있습니다."` 스크린리더 라이브 안내 송출 및 핸들 포커스 유지(`focusRetainedOnHandle: true`), 단일 `ArrowUp` 입력 시 1번째 위치로 복귀.
   - 단, 한 프레임 안에서 5회 연속 `ArrowDown` 키 반복 입력 시 클로저 `index` 참조로 인해 1칸만 이동하는 엣지 케이스 확인 (**R5-04**).

### 4.3 스트레스 시나리오 (`빠른 연속 재정렬 · 스크롤 중 취소 · 화면 회전`) 실측 요약

| 스트레스 시나리오 | 검증 항목 | 실측 결과 | 발견된 엣지 결함 |
| --- | --- | --- | --- |
| **빠른 연속 재정렬 (`Rapid Consecutive Reorders`)** | 드롭 직후 `25ms` 이내(이전 카드의 `160ms` 드롭 복귀 애니메이션 진행 중) 다음 카드를 연속 드래그 | 스토어 순서 결과는 정확히 `["syn-move-3", "syn-move-2", "syn-move-1"]`로 커밋되고 종료 후 잔류 오버레이 `0개` (`overlaysRemainingAfterSettle: 0`). 그러나 **200% 확대에서 첫 프레임 동안 이전 드롭 복귀 오버레이가 `querySelector('.sequence-drag-overlay')`에 먼저 매칭되어 새 오버레이 폭이 `516px`(기대치 `258px`)로 1프레임 지연 보정됨.** | **R5-02**, **R5-04** |
| **스크롤 중 취소 (`Cancel During Auto-Scroll`)** | 하단/상단 가장자리 오프스크린 자동스크롤 진행 중(`+54px`, `-228px`) `Escape` 및 `pointercancel` 발생 | 핸들에 포커스가 있을 때 `Escape` 입력 시 자동스크롤 즉시 중단(`autoScrollStoppedImmediatelyOnEscape: true`), 카드/헤더 transform 초기화(`transformsClearedAfterMidScrollEscape: true`), 원본 순서 보존(`orderPreservedAfterMidScrollEscape: true`). `pointercancel` 시에도 자동스크롤 즉시 중단 및 섹션 헤더 `translate` 초기화(`headerTranslatesClearedOnPointerCancel: true`). 단, **핸들에서 포커스가 분리된 상태(iPadOS 터치 등)에서 `window`로 `Escape` 전송 시 드래그가 취소되지 않음.** | **R5-03** |
| **화면 회전 (`Screen Rotation`)** | `390×844` 세로 모드에서 13번 휴식 카드를 11번 슬롯으로 섹션 경계 위로 드래그하던 도중 `844×390` 가로 모드로 화면 회전(`resize`) | 회전 즉시 `sequenceDrag`의 `window` `resize` 리스너가 동작하여 오버레이/인디케이터 제거 및 순서 보존(`overlayRemovedOnRotation: true`, `orderPreservedOnRotationCancel: true`, 가로 넘침 `0px`). 그러나 **`SequenceOrderCard`의 `header.style.translate`가 `"0px 161px"`로 잔류하여 아래 카드와 시각적으로 겹치고(`r5_01_staleHeaderOverlapsCardAfterRotation: true`), `pointercancel` 전까지 해당 카드의 재드래그가 차단됨(`r5_01_newDragBlockedBeforePointerCancel: true`).** | **R5-01** |

---

## 5. 검출된 결함 상세 보고 및 최소 패치 후보 (`소스 미수정 · 조율용`)

> [!WARNING]
> 아래 4건의 결함(**R5-01 ~ R5-04**)은 지시사항(`다른 활성 구현자와 조율 전 소스 수정 금지`)에 따라 **제품 소스에 적용하지 않았으며**, 통합/구현 담당자가 즉시 검증·적용할 수 있도록 [`patches/builder-round5-minimal-candidates.patch`](file:///home/antigravity/blue45f/pilate_flow/docs/builder-cross-input-round5-20261107/patches/builder-round5-minimal-candidates.patch) (`git apply --check` 통과 확인 완료)로 제공합니다.

---

### 결함 R5-01: 섹션 경계 드래그 도중 화면 회전(`resize`) 또는 창 포커스 상실(`blur`) 시 섹션 헤더 `style.translate` 잔류 및 재드래그 차단

- **정확한 재현 절차**:
  1. `390×844` 뷰포트에서 80단계 혼합 시퀀스를 열고 13번째 항목(`중간 휴식`, `rest` 섹션)의 `순서` 핸들을 잡은 뒤 11번째 항목(`리포머 브리지 준비`, `warmup` 섹션) 위치로 위로 끌어 올립니다.
  2. 이때 [`SequenceOrderCard.tsx`의 `syncActiveDragDom()`](file:///home/antigravity/blue45f/pilate_flow/src/components/SequenceOrderCard.tsx#L79)이 교차된 `.pf-sequence-block__header`(`REST 중간 휴식`)에 `header.style.translate = "0px 161px"`를 부여합니다.
  3. 손가락을 떼지 않은 상태에서 기기를 가로(`844×390`)로 회전하면 `window` `resize` 이벤트가 발생하고, [`sequenceDrag.ts` 195행](file:///home/antigravity/blue45f/pilate_flow/src/utils/sequenceDrag.ts#L195)의 `cancel()`이 호출되어 `list`에서 `data-drag-session` 속성이 제거됩니다.
  4. 다음 애니메이션 프레임에서 `SequenceOrderCard.tsx`의 `syncActiveDragDom()`이 호출되지만, [41행 `if (!list || !list.hasAttribute('data-drag-session')) return;`](file:///home/antigravity/blue45f/pilate_flow/src/components/SequenceOrderCard.tsx#L41)에서 `clearHeaderTranslations()`를 호출하지 않고 조기 반환하며 `pointerDrag.current`도 `null`로 정리되지 않습니다.
- **실측 영향**:
  - 회전 직후 `.pf-sequence-block__header`에 `style.translate = "0px 161px"`가 그대로 남아 아래쪽 13번 카드 본문 위로 헤더가 겹쳐 보입니다 (`r5_01_staleHeaderTranslateAfterRotation: "0px 161px"`, `r5_01_staleHeaderOverlapsCardAfterRotation: true`, 증거 스크린샷: [`screenshots/round5-screen-rotation-during-drag-r5-01.png`](file:///home/antigravity/blue45f/pilate_flow/docs/builder-cross-input-round5-20261107/screenshots/round5-screen-rotation-during-drag-r5-01.png)).
  - `pointercancel` 또는 `lostpointercapture`가 별도로 발생하기 전까지 `pointerDrag.current`가 비어 있지 않아 같은 카드의 새 `pointerdown` 드래그가 무시됩니다 (`r5_01_newDragBlockedBeforePointerCancel: true`).
- **최소 패치 후보 ([`SequenceOrderCard.tsx`](file:///home/antigravity/blue45f/pilate_flow/src/components/SequenceOrderCard.tsx#L38-L45))**:
  ```tsx
  const list = cardEl.closest<HTMLElement>('.flow-sections') ?? cardEl.parentElement;
  if (!list || !list.hasAttribute('data-drag-session') || !pointerDrag.current?.session.isActive()) {
    clearHeaderTranslations();
    if (pointerDrag.current && !pointerDrag.current.session.isActive()) {
      cancelAnimationFrame(pointerDrag.current.rafId);
      pointerDrag.current = null;
    }
    return;
  }
  ```

---

### 결함 R5-02: `160ms` 드롭 복귀 애니메이션 중 빠른 연속 재드래그 시 이전 오버레이 클론과의 선택자 충돌 (200% 확대 및 섹션 말미 여백)

- **정확한 재현 절차**:
  1. `200%` 확대(`zoom: 2`) 상태에서 1번 카드를 2번 위치로 드래그 후 드롭합니다.
  2. [`sequenceDrag.ts` 361~373행](file:///home/antigravity/blue45f/pilate_flow/src/utils/sequenceDrag.ts#L361-L373)은 드롭 복귀 애니메이션을 위해 이전 `.sequence-drag-overlay` 클론을 `160ms~220ms` 동안 DOM에 남겨둡니다.
  3. `160ms`가 지나기 전(예: 드롭 후 `20ms`)에 다음 카드를 즉시 드래그하면 DOM 안에 퇴장 중인 `.sequence-drag-overlay`와 새로 생성된 `.sequence-drag-overlay` 총 2개가 동시에 존재합니다 (`concurrentOverlayCountDuringRapidDrag: 2`).
- **실측 영향**:
  - [`SequenceOrderCard.tsx` 125행](file:///home/antigravity/blue45f/pilate_flow/src/components/SequenceOrderCard.tsx#L125)의 `document.querySelector<HTMLElement>('.sequence-drag-overlay')`는 DOM 순서상 첫 번째(퇴장 중인) 오버레이를 반환하므로, 새로 시작된 드래그 오버레이가 퇴장 오버레이 제거 전까지 `zoomFactor` 폭/좌표 보정을 받지 못해 첫 프레임 폭이 `516px`(정상 `258px`의 2배)로 나타납니다 (`r5_02_retiringOverlayShadowedZoomScaleOnFirstFrame: true`).
  - 또한 같은 섹션 안에서 연속 드래그할 때 [sequence-composition.css 142행](file:///home/antigravity/blue45f/pilate_flow/src/styles/sequence-composition.css#L142)의 `.sequence-order-card:nth-last-child(2):has(+ .sequence-drag-overlay)`가 오버레이 2개 중첩 동안 매칭되지 않아 섹션 마지막 카드 하단 여백이 `160ms` 동안 `14px` 흔들릴 수 있습니다.
- **최소 패치 후보 ([`SequenceOrderCard.tsx`](file:///home/antigravity/blue45f/pilate_flow/src/components/SequenceOrderCard.tsx#L125-L132), [`sequence-composition.css`](file:///home/antigravity/blue45f/pilate_flow/src/styles/sequence-composition.css#L142))**:
  ```tsx
  const overlays = document.querySelectorAll<HTMLElement>('.sequence-drag-overlay');
  const overlay = overlays[overlays.length - 1];
  ```
  ```css
  #root .vnext-shell .v2-workbench .pf-sequence-block__body > .sequence-order-card:has(~ .sequence-drag-overlay):not(:has(~ .sequence-order-card)) {
    margin-bottom: 0;
  }
  ```

---

### 결함 R5-03: WebKit / iPadOS Safari 외장 키보드 `Escape` 드래그 취소 누락 및 구형 Safari CSS `zoom` / 롱프레스 콜아웃 방어

- **정확한 재현 절차**:
  1. 터치 드래그를 시작합니다. iOS/iPadOS WebKit에서는 터치 `pointerdown` 시 `<button>`으로 키보드 포커스가 이동하지 않거나 외장 키보드 포커스가 핸들 바깥에 머물 수 있습니다.
  2. 핸들에서 포커스가 분리된 상태에서 `Escape` 키를 누르면, 현재 `Escape` 핸들러가 [`SequenceOrderCard.tsx` 272행](file:///home/antigravity/blue45f/pilate_flow/src/components/SequenceOrderCard.tsx#L272)의 버튼 `onKeyDown`에만 등록되어 있고 [`sequenceDrag.ts`](file:///home/antigravity/blue45f/pilate_flow/src/utils/sequenceDrag.ts#L194-L196)의 `window`에는 등록되어 있지 않아 드래그가 취소되지 않습니다 (`r5_03_windowEscapeCanceledDragWithoutHandleFocus: false`).
- **실측 영향**:
  - iPadOS Safari + 매직 키보드 등 터치와 키보드를 혼합 사용하는 환경에서 안내 문구(`"Escape 키로 취소할 수 있습니다"`)와 달리 `Escape` 키로 활성 터치 드래그가 취소되지 않습니다.
  - 또한 Safari `< 18.4`에서는 `currentCSSZoom`이 없으므로 `cardEl.getBoundingClientRect().width / cardEl.offsetWidth` 기반 비율 계산 폴백과 `.sequence-drag-handle`의 `-webkit-user-select: none; -webkit-touch-callout: none;`이 필요합니다.
- **최소 패치 후보 ([`sequenceDrag.ts`](file:///home/antigravity/blue45f/pilate_flow/src/utils/sequenceDrag.ts#L135-L200), [`SequenceOrderCard.tsx`](file:///home/antigravity/blue45f/pilate_flow/src/components/SequenceOrderCard.tsx#L43-L55), [`sequence-composition.css`](file:///home/antigravity/blue45f/pilate_flow/src/styles/sequence-composition.css#L166-L169))**:
  ```ts
  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      cancel();
    }
  };
  // begin()에서 window.addEventListener('keydown', onKeyDown, true);
  // cleanup()에서 window.removeEventListener('keydown', onKeyDown, true);
  ```

---

### 결함 R5-04: 초고속 연속 `ArrowUp` / `ArrowDown` 키 반복 입력 시 렌더 클로저 `index` 참조로 인한 다중 이동 누락

- **정확한 재현 절차**:
  1. 1번 카드의 `순서` 핸들에 포커스를 두고 한 프레임(React 리렌더 커밋 전) 내에 `ArrowDown` 키 이벤트를 5회 연속 발생시킵니다.
  2. [`SequenceOrderCard.tsx` 281행](file:///home/antigravity/blue45f/pilate_flow/src/components/SequenceOrderCard.tsx#L281)은 `move(steps[index + delta].stepId)`처럼 렌더 시점의 `steps`와 `index`(`0`) 클로저를 참조하므로 5회 모두 `steps[0 + 1]`과의 스왑을 요청합니다.
- **실측 영향**:
  - 빠른 키 반복 시 5칸 이동하는 대신 1번째 슬롯(`index: 1`)에서 멈춥니다 (`indexAfter5RapidArrowDown: 1`).
- **최소 패치 후보 ([`SequenceOrderCard.tsx`](file:///home/antigravity/blue45f/pilate_flow/src/components/SequenceOrderCard.tsx#L276-L283))**:
  ```tsx
  if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
    event.preventDefault();
    clearPointerDrag();
    const liveSteps = usePilatesStore.getState().activeSteps;
    const liveIndex = liveSteps.findIndex((item) => item.stepId === step.stepId);
    const delta = event.key === 'ArrowUp' ? -1 : 1;
    const target = liveIndex >= 0 ? liveSteps[liveIndex + delta] : undefined;
    if (!target || step.locked || target.locked) return;
    move(target.stepId);
  }
  ```

---

## 6. 아티팩트 목록

- [`README.md`](file:///home/antigravity/blue45f/pilate_flow/docs/builder-cross-input-round5-20261107/README.md): 본 검증 보고서 및 결함/패치 후보 명세
- [`verify-builder-cross-input-round5.mjs`](file:///home/antigravity/blue45f/pilate_flow/docs/builder-cross-input-round5-20261107/verify-builder-cross-input-round5.mjs): 80단계 교차 입력·뷰포트·스트레스 실측 스크립트
- [`evidence/round5-cross-input-metrics.json`](file:///home/antigravity/blue45f/pilate_flow/docs/builder-cross-input-round5-20261107/evidence/round5-cross-input-metrics.json): Chromium 156 실측 수치 및 결함 재현 JSON 증거
- [`patches/builder-round5-minimal-candidates.patch`](file:///home/antigravity/blue45f/pilate_flow/docs/builder-cross-input-round5-20261107/patches/builder-round5-minimal-candidates.patch): `git apply --check` 검증을 통과한 R5-01 ~ R5-04 최소 패치 후보
- [`screenshots/`](file:///home/antigravity/blue45f/pilate_flow/docs/builder-cross-input-round5-20261107/screenshots/): `320/390/768/1440` (`100%` / `200%`) 및 화면 회전 결함(`R5-01`) 재현 스크린샷 9종
