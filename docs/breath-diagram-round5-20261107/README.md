# 순수 호흡 관찰 4종 2D 도해 의미·기구접점·스프링·근육 Fallback 수정 증거 (Round 5 · 2026-11-07)

> **정직한 검증 상태 고지 (Truthfulness & Non-Overclaim Boundary)**
> - 본 수정은 앱 내 자유 제작 2D 키네마틱 개략 도해(`free-authored-kinematic-svg-v1`)의 **기구 접점·스프링 상태·사지 고정·근육 하이라이트 fallback·지지 자세/호흡 설명 분리**를 카탈로그 큐와 정합화한 최소 엔지니어링 패치입니다.
> - **임상적·해부학적·전문가(물리치료사/필라테스 마스터) 실측 검증은 완료되지 않았으며**, 모든 자산과 커버리지 레코드는 `anatomicalAccuracyAssumed: false`, `anatomicalVerificationCompleted: false`, `expertVerificationCompleted: false`, `professionalReviewCount: 0`을 엄격히 유지합니다.

---

## 1. 소유 범위 및 비간섭 경계 확인

- **작업 브랜치**: `fix/breath-diagram-round5-20261107` (최신 `origin/main` `1f0356a3e959eb460bb72b3aa28f5d4800b2e381` 분기)
- **독점 수정 파일 (앱 코드 3개 + 전용 증거 폴더)**:
  - `src/components/MovementPhaseDiagramSvg.tsx`
  - `src/data/movementVisualRigCatalog.ts`
  - `src/test/diagramApparatusContactRegression.test.tsx`
  - `scripts/diagram-contact-audit-20261107/track-b-verification/track-b-adversarial-contact-audit.node-test.mjs` (`allowedPrefixes`에 `docs/breath-diagram-round5-20261107/` 추가)
  - `docs/breath-diagram-round5-20261107/**`
- **비간섭 보호 파일 (0줄 수정 확인)**:
  - `SourceNoteDialog.tsx`, `InstructorStudyDialog.tsx`, `SequenceBuilder`/`App.tsx`, `ClassBinderView.tsx`, `ExerciseAtlasView.tsx`, `CourseReferenceBrowser.tsx`, `PackagePanel`, 공유 스토어/스키마/라우트/전역 CSS.

---

## 2. 최신 코드 직접 재현 결과 및 4종 호흡 도해 최소 수정 내역

### 2.1 Before vs After 핵심 수치 비교표

| 동작 ID (`nameKo`) | 구분 | 아키타입 ID | `pelvis` (`start`) | `heel` (`start`) | `hand` (`start`) | `hand Δ` (`S→M`) | `heel Δ` (`S→M`) | `thoracic Δ` (`S→M / S→E`) | `springTension` / 코일 `<path>` | 주동/안정 근육 하이라이트 (`primaryMuscles`) |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **`original-chair-seated-breath`**<br>(체어 시티드 호흡) | **Before** | `seated-row-arm-arc` | `(112, 138)`<br>*(시트 `y:106~115` 하방 관통)* | `(238, 148)`<br>*(바닥 `y:178` 위 `30px` 부유)* | `(206, 86)` | `80.5px`<br>*(로잉/오버헤드 스윕)* | `0px` | `4.0px / 2.0px` | `medium` / `0` | `latissimus-serratus(primary)`, `shoulder-deltoid(primary)`, `core-transversus`, `thoracic-extensors` |
| | **After** | `chair-seated-breath-isolated` | **`(132, 108)`**<br>*(체어 시트 상면 안착)* | **`(198, 176)`**<br>*(바닥 `y:178` 접지)* | **`(148, 96)`**<br>*(허벅지 위 고정)* | **`0px`** | **`0px`** | **`6.4px / 3.6px`** | **`none` / `0`** | `core-transversus(primary:호흡,골반 정렬)`, `glute-med`, `rectus-obliques`, `thoracic-extensors` |
| **`original-cadillac-table-breath`**<br>(캐딜락 테이블 호흡) | **Before** | `supine-breath-pelvic-clock` | `(184, 142)` | `(252, 148)` | `(120, 74)` | `64.1px`<br>*(오버헤드 아크)* | `0px` | `1.0px / 0px` | `medium` / **`1개`**<br>*(손 연결 스프링 코일 표시)* | `core-transversus(stabilizer)`, `thoracic-extensors` |
| | **After** | `cadillac-table-breath-isolated` | **`(182, 140)`**<br>*(테이블 `y:145` 지지)* | **`(248, 145)`**<br>*(테이블 상면 접지)* | **`(146, 132)`**<br>*(몸통 옆 고정)* | **`0px`** | **`0px`** | **`6.0px / 3.0px`** | **`none` / `0개`**<br>*(손 코일 미렌더)* | `core-transversus(primary:호흡)`, `glute-med`, `rectus-obliques`, `thoracic-extensors` |
| **`original-barrel-standing-breath`**<br>(바렐 앞 스탠딩 호흡) | **Before** | `standing-ankle-calf-upper-reach` | `(144, 116)` | `(142, 176)` | `(194, 80)`<br>*(래더 `x:76~96`과 `98px` 이격)* | `50.5px`<br>*(상방 팔 뻗기)* | `14.6px`<br>*(카프 레이즈 상승)* | `10.8px / 4.5px` | `none` / `1`*(바렐 돔)* | **`calves(primary:호흡)`**, `shoulder-deltoid(primary)`, `core-transversus`, `thoracic-extensors` |
| | **After** | `barrel-standing-breath-isolated` | **`(140, 120)`** | **`(140, 176)`**<br>*(바닥 평발 고정)* | **`(88, 76)`**<br>*(상단 래더 가로대 접점)* | **`0px`** | **`0px`** | **`6.4px / 3.6px`** | **`none` / `1`*(바렐 돔)* | `core-transversus(primary:호흡,어깨 안정)`, `rectus-obliques`, `glute-med`, `thoracic-extensors` *(calves 0건)* |
| **`original-mat-rib-breath`**<br>(누워서 호흡 관찰) | **Before** | `supine-breath-pelvic-clock` | `(184, 142)` | `(252, 148)` | `(120, 74)` | `64.1px`<br>*(오버헤드 아크)* | `0px` | `1.0px / 0px` | `none` / `0` | `core-transversus(stabilizer)`, `thoracic-extensors` |
| | **After** | `mat-supine-rib-breath-isolated` | **`(182, 142)`**<br>*(매트 `y:148` 지지)* | **`(248, 148)`**<br>*(매트 상면 접지)* | **`(144, 134)`**<br>*(몸통 옆 고정)* | **`0px`** | **`0px`** | **`6.0px / 3.0px`** | **`none` / `0`** | `core-transversus(primary:호흡,몸통 정렬)`, `glute-med`, `rectus-obliques`, `thoracic-extensors` |

---

### 2.2 세부 원인 및 최소 패치 설명

1. **체어 시티드 호흡 (`original-chair-seated-breath`)**:
   - **원인**: `seated-row-arm-arc`(매트 바닥 착석 `pelvis.y = 138` 기준)로 폴백되어 운다 체어 시트(`y = 106..115`, 박스 `y = 114..178`) 아래로 골반이 `23px` 관통하고, 뒤꿈치(`y = 148`)가 바닥(`y = 178`)에서 `30px` 공중에 뜨며, 양손이 `80.5px` 로잉/트레이 스윕을 수행함.
   - **최소 수정**: `chair-seated-breath-isolated` 블루프린트로 분리하여 `pelvis: (132, 108)`(시트 상면 착석), `heel: (198, 176)`(바닥 접지), `hand: (148, 96)`(허벅지 위 고정, `Δ0px`), `pedalAngles: [0, 0, 0]`, `springTensionLevel: 'none'`으로 설정하고, 위상 설명을 `지지 자세`와 `호흡 관찰(들숨/날숨)`로 분리.
2. **캐딜락 테이블 호흡 (`original-cadillac-table-breath`)**:
   - **원인**: 카탈로그 큐(`"스프링을 사용하지 않고 테이블 위 지지와 편안한 호흡을 관찰합니다."`)가 스프링 미사용을 명시함에도 `resolveSpringTensionLevel`이 `springs: "1Y to 1B (Light)"` 문자열만 보고 `'medium'`을 반환했으며, `MovementPhaseDiagramSvg.tsx`의 캐딜락 렌더러가 `springTensionLevel === 'none'` 여부와 무관하게 손(`handTarget`)까지 스프링 코일 `<path>`를 무조건 렌더링함.
   - **최소 수정**:
     - `resolveSpringTensionLevel`에서 큐에 `'스프링을 사용하지 않고'`가 포함되거나 `original-cadillac-table-breath` / `original-chair-seated-breath`인 경우 `'none'` 반환.
     - `MovementPhaseDiagramSvg.tsx`(`renderApparatusSupportLayer`, 캐딜락 분기)에서 `apparatusState.springTensionLevel !== 'none'`일 때만 손 연결 스프링 코일 `<path>`를 렌더링하도록 최소 조건 추가.
     - `cadillac-table-breath-isolated`로 분리하여 테이블(`y = 145`) 위 골반(`182,140`)·뒤꿈치(`248,145`)·양손(`146,132`, `Δ0px`) 고정 및 들숨/날숨 흉곽 호흡(`thoracic: 126,138 → 126,132 → 126,135`)만 표현.
3. **바렐 앞 스탠딩 호흡 (`original-barrel-standing-breath`) 및 98동작 `calves` 근육 Fallback 회귀**:
   - **원인**: `standing-ankle-calf-upper-reach`로 폴백되어 손(`194,80 → 236,52`)이 래더 바렐 사다리(`x = 76..96`)에 전혀 닿지 않고(`98px` 이격), 뒤꿈치가 `14.6px` 들리는 카프 레이즈가 발생하며, `buildMuscleHighlights`가 `matchedByGroup.has(defaults.primary)`를 확인하지 않고 무조건 `defaults.primary`(`'calves'`)를 첫 번째 주동근에 할당하여 `calves(primary:호흡)` 오표기가 발생함(동일 원인으로 `original-barrel-standing-rotation`, `ex-upper-03`, `original-barrel-supported-arm-reach`에서도 `calves` 오표기 발생).
   - **최소 수정**:
     - `barrel-standing-breath-isolated`로 분리하여 양손을 상단 래더 가로대(`hand: 88,76`, `Δ0px`, 사다리 이격 `0px`)에 가볍게 얹고, 양발 뒤꿈치를 바닥(`heel: 140,176`, `Δ0px`)에 완전 접지하며, 흉곽 호흡(`thoracic: 138,84 → 142,79 → 140,81`)만 표현.
     - `buildMuscleHighlights`에서 `defaults.primary`가 `matchedByGroup`에 없을 경우 실제 매칭된 타겟 근육 그룹(`Array.from(matchedByGroup.keys())[0]`)을 우선 선택하도록 수정하여 **전체 98개 동작 중 비-종아리 동작의 `calves` fallback을 `4건 → 0건`으로 완전 제거**.
4. **누워서 호흡 관찰 (`original-mat-rib-breath`)**:
   - **원인**: `supine-breath-pelvic-clock` 공유로 인해 호흡 큐에 없는 `64.1px` 오버헤드 팔 스윕(`120,74 → 56,70 → 166,138`)과 골반 시계 임프린트 요약이 혼재됨.
   - **최소 수정**: `mat-supine-rib-breath-isolated`로 분리하여 매트(`y = 148`) 위 골반(`182,142`)·뒤꿈치(`248,148`)·몸통 옆 양손(`144,134`, `Δ0px`) 지지 자세와 들숨/날숨 흉곽 호흡(`thoracic: 124,140 → 124,134 → 124,137`) 설명을 분리.

---

## 3. 검증 증거 및 스크린샷 아티팩트

- **정량 메트릭 JSON**: [`evidence/round5-breath-metrics.json`](./evidence/round5-breath-metrics.json)
- **재현 및 브라우저 검증 스크립트**: [`verify-breath-diagram-round5.mjs`](./verify-breath-diagram-round5.mjs)
- **5개 뷰포트 실제 Chromium 렌더러 스크린샷 (`horizontalOverflowPx === 0`, 24개 SVG 전수 마운트)**:
  - `320×640` (Mobile S): [`screenshots/round5-breath-mobile-320.png`](./screenshots/round5-breath-mobile-320.png)
  - `390×844` (Mobile M): [`screenshots/round5-breath-mobile-390.png`](./screenshots/round5-breath-mobile-390.png)
  - `768×1024` (Tablet): [`screenshots/round5-breath-tablet-768.png`](./screenshots/round5-breath-tablet-768.png)
  - `1440×900` (Desktop): [`screenshots/round5-breath-desktop-1440.png`](./screenshots/round5-breath-desktop-1440.png)
  - `1440×900 @ 200% Zoom`: [`screenshots/round5-breath-desktop-1440-zoom200.png`](./screenshots/round5-breath-desktop-1440-zoom200.png)
- **개별 호흡 동작 카드 캡처 (`start`/`middle`/`end` × `standard`/`mirrored`)**:
  - [`screenshots/card-original-mat-rib-breath.png`](./screenshots/card-original-mat-rib-breath.png)
  - [`screenshots/card-original-cadillac-table-breath.png`](./screenshots/card-original-cadillac-table-breath.png)
  - [`screenshots/card-original-chair-seated-breath.png`](./screenshots/card-original-chair-seated-breath.png)
  - [`screenshots/card-original-barrel-standing-breath.png`](./screenshots/card-original-barrel-standing-breath.png)
