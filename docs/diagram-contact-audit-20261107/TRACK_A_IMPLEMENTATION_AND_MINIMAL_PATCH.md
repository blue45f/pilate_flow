# Track A — 2D 도해 자세-기구 접점 정확성 최소 패치 제안 및 정적 좌표 명세 (2026-11-07)

> **정직성 및 검증 한계 고지 (Honesty & Non-Certification Disclaimer)**
> - 본 문서와 후보 패치(`scripts/diagram-contact-audit-20261107/track-a-implementation/candidate-minimal-contact-fixes.mjs`, `docs/diagram-contact-audit-20261107/patches/minimal-diagram-contact-fixes.patch`)는 **2D 개략 도해(320×200 SVG) 내부의 자세-기구 접점 좌표 및 회전 방향 불일치(D-01~D-05)만 최소 교정**한 소프트웨어 기하 보정입니다.
> - **해부학적·임상적·외부 전문가 검증 완료를 주장하지 않습니다** (`anatomicalAccuracyAssumed: false`, `anatomicalVerificationCompleted: false`, `expertVerificationCompleted: false`, `professionalReviewCount: 0`, `canonicalMotionReady: false`, `manualReady: false`, `true3dSupported: false`).
> - 기존 앱 도해 구현(`src/**`)은 **100% READ-ONLY (`수정 0줄`)** 상태로 보존되었습니다.

---

## 1. 기해결 제외 항목 (`R-01` — 재구현 제외 및 회귀 고정)

기존 `motionEvidenceReview` 결과(`docs/motion-evidence-review/README.md`, `src/features/motionEvidenceReview/trackAMatEvidence.ts`)와 최신 `main` (`338f912`, 기 반영 커밋 `8cd2cdc` / `ac3f61d`)을 대조한 결과, 아래 항목은 이미 `main`에서 해결되어 있으므로 패치 대상에서 **제외**하고 회귀 어설션으로만 고정했습니다.

| 구분 | 대상 운동 ID | 현재 `main` 아키타입 ID | 정적 좌표 및 SVG 렌더링 검증 결과 | 처리 상태 |
| :--- | :--- | :--- | :--- | :--- |
| **R-01A** | `original-mat-clam` (사이드 클램) | `mat-clam-isolated` | `middle`에서 무릎만 열림(`knee Δ = 32px`), 팔·손·흉곽 이동 `0px` (`clamHandLeakPx = 0`, `clamThoracicLeakPx = 0`) | **기해결 (제외)** |
| **R-01B** | `original-mat-open-book` (사이드 오픈 북) | `mat-open-book-isolated` | `middle`에서 상지·흉곽만 열림(`hand Δ = 148.09px`), 무릎·골반 이동 `0px` (`openBookKneeLeakPx = 0`) | **기해결 (제외)** |
| **R-01C** | 원근 어깨 연결선 조건부 렌더링 | `MovementPhaseDiagramSvg.tsx` (`L900`, `L1325`) | `data-segment="schematic-shoulder-connection"`이 `mat-clam-isolated` / `mat-open-book-isolated`에만 조건부 표시되며 다른 아키타입에는 노출되지 않음 | **기해결 (제외)** |

---

## 2. 미해결 5대 자세-기구 접점 결함 (`D-01` ~ `D-05`) 및 최소 패치 좌표 명세

### D-01. `Frog end` — 리포머 발 스트랩 프로그 끝 자세(`end`) 무릎 굴곡 복귀 누락
- **대상**: `original-reformer-strap-frog` (`src/data/movementVisualRigCatalog.ts`)
- **원인**: `supine-feet-in-straps` 아키타입을 레그 서클(`ex-straps-01`)과 공유하여, `end` 단계에서 무릎을 다이아몬드(프로그) 형태로 접어 돌아오는 대신 뻗은 다리를 천장(`ankle: 222,40`, `knee: 204,76`)으로 들어 올리는 레그 서클 상단 리프트 좌표가 렌더링됨.
- **최소 패치**:
  - `resolveSeparatedApparatusContactBlueprint`에서 `original-reformer-strap-frog`를 `reformer-strap-frog-isolated`로 분리.
  - `endJoints`를 프로그 준비 자세(`startJoints`: `knee: 182,92`, `ankle: 214,74`, `heel: 210,80`, `toe: 226,66`)로 복귀시키고 `carriageOffsets: [6, 36, 6]`으로 정렬.
  - **정적 좌표 변화**: `start↔end ankle 거리 34.93px (Δy = -34px)` → **`0.0px (Δy = 0px)`**.

### D-02. `Reformer plank 손발` + `Chair plank 접점` — 기구 지지부 좌우 반전 및 허공 부유
- **대상**:
  1. 리포머 롱 스트레치 플랭크 (`ex-plank-01`)
  2. 운다 체어 파이크·인클라인 플랭크 (`ex-plank-02`, `original-chair-incline-support`, `ex-kr-chair-01`)
- **원인**:
  - `MovementPhaseDiagramSvg.tsx`의 리포머 도해는 **풋바(Footbar)가 우측(`top: 266,126`)**, **캐리지·숄더블록·헤드레스트가 좌측(`x: 38..216 + shift, y: 143`)**에 그려지는데, `plank-long-stretch-chair-pike` 아키타입은 손(`hand: 88,148`, `wrist: 96,144`)을 좌측 헤드레스트 쪽에, 발(`ankle: 280→242→286, y: 144~146`)을 우측 풋바 쪽에 두어 **손·발 기구 접점이 좌우 반전**됨(`풋바-손 거리 173.49px`).
  - 동일 아키타입을 공유하는 체어 플랭크 3종에서는 손(`hand: 88,148`)이 체어 패디드 시트 상단(`x: 108..196, y: 106`)보다 **42px 아래·좌측 허공**에 떠 있고, 발(`ankle: 280,144`)이 페달 팁(`237.3, 136.4`)에서 **43.2px~63.6px 우측 허공**으로 이탈함.
- **최소 패치**:
  - `ex-plank-01` (`reformer-plank-long-stretch-isolated`): 손을 우측 풋바 상단(`wrist: 262,126`, `hand: 268,126` → `footbarTop 266,126`과 거리 **`2.0px`**)에 고정하고, 발을 좌측 슬라이딩 캐리지 상단(`ankle: 80,138 → 114,138 → 82,138`, `carriageOffsets: [6, 36, 10]`)에 안착.
  - 체어 플랭크 3종 (`chair-plank-pike-isolated`): 손을 체어 시트 상단(`wrist: 132,106`, `hand: 124,106` → 시트 `y=106` 수직 오차 **`0px`**)에 지지하고, 발을 체어 페달 팁(`ankle: 216,156 → 208,134 → 216,158` → 페달 팁 거리 **`2.3px~5.4px`**)에 일치시킴.

### D-03. `Cadillac carriage` — 고정 베드 기구인 캐딜락에 비정상 캐리지 활주(`carriageOffsetPx > 0`) 부여
- **대상**: 캐딜락 18개 운동 전체 (`original-cadillac-arm-spring-press`, `ex-straps-02`, `original-cadillac-prone-back-reach` 외)
- **원인**: `movementVisualRigCatalog.ts` L4395-4396에서 `const isCarriageApparatus = exercise.apparatus === 'reformer' || exercise.apparatus === 'cadillac';`로 설정되어, 슬라이딩 캐리지가 없는 고정 테이블 기구인 캐딜락 18개 운동 중 **15개 운동(45개 위상)**에 `carriageOffsetPx > 0` (최대 `36px`)이 부여되고 `MovementPhaseDiagramSvg.tsx`의 푸시쓰루바 끝단(`barEnd`)이 비정상 수평 이동함.
- **최소 패치**:
  - `const isCarriageApparatus = exercise.apparatus === 'reformer';`로 1줄 교정하여 캐딜락 18개 전 종목(54개 위상)의 `carriageOffsetPx`를 **`0`**으로 고정.

### D-04. `Chair pedal` — 운다 체어 페달 하방 프레스 시 페달 레버 상방 역회전 (50px 분리)
- **대상**: `MovementPhaseDiagramSvg.tsx` (`case 'chair'`) 및 체어 페달 풋워크 4종 (`original-chair-seated-pedal-press`, `original-chair-alternating-pedal`, `original-chair-seated-knee-lift`, `ex-footwork-03`)
- **원인**: `angleRad = ((24 + apparatusState.pedalAngleDeg * 0.75) * Math.PI) / 180` 및 `pedalTip.y = hinge.y - Math.sin(angleRad) * 54` 수식으로 인해, `pedalAngleDeg`가 `8° → 36°`로 증가(페달 하방 프레스)할 때 발은 **아래로 `Δy = +32px` (`ankle.y: 136 → 168`, `heel.y: 140 → 172`)** 내려가지만 페달 팁은 오히려 **위로 `Δy = -15.0px` (`pedalTip.y: 137.0 → 122.0`)** 올라가 `middle` 정점에서 **발목과 `46.0px`, 뒤꿈치와 `50.0px` 수직 분리**가 발생함.
- **최소 패치**:
  - `hinge = p(168, 164)`, `angleRad = ((40 - apparatusState.pedalAngleDeg * 1.3) * Math.PI) / 180`, 레버 길이 `50px`로 교정.
  - 페달 프레스(`8° → 36° → 12°`) 시 `pedalTip`이 `(211.5, 139.3) → (217.6, 169.9) → (213.5, 143.3)` (`Δy = +30.6px`)로 발(`ankle: 204,136 → 218,168 → 206,142`)과 동일하게 **하방 회전**하여 `middle` 정점 수직 오차가 `46.0px` → **`1.9px`**(뒤꿈치 `50.0px` → **`2.1px`**)로 해소됨.

### D-05. `Barrel 관통` — 래더 배럴 스탠딩 동작의 배럴 돔 하지 관통·허공 손 파지·사다리 프레임 관통
- **대상**: `MovementPhaseDiagramSvg.tsx` (`case 'barrel'`) 및 스탠딩 배럴 7종 (`original-barrel-standing-hip-extension`, `original-barrel-standing-side-reach` 외 5종)
- **원인**:
  - 배럴 돔이 `x: 68..174, y: 102..174`, 사다리 프레임이 `x: 222..256, y: 46..176`에 고정 렌더링되어, 스탠딩 배럴 7종 모두 지지 다리·골반(`x: 108..164, y: 118..176`)이 **배럴 돔 내부를 관통**함.
  - 특히 `original-barrel-standing-hip-extension` 및 `original-barrel-standing-side-reach`는 손(`hand: 90,78 → 76,72`)이 우측 사다리(`x: 222..256`)로부터 **132~146px 떨어진 좌측 허공**을 잡고 있으며, 뒤로 뻗는 다리(`knee: 228,134 → ankle: 278,148`)가 **사다리 기둥(`x: 222..256`)을 그대로 뚫고 지나감**.
- **최소 패치**:
  - `MovementPhaseDiagramSvg.tsx` (`case 'barrel'`)에서 `asset.bodyPosition === 'standing'`일 때 배럴 돔을 좌측(`x: 18..70, y: 106..174`), 사다리를 `x: 76..96, y: 46..176`에 배치하고(비-스탠딩 배럴 5종은 기존 `돔 x: 68..174, 사다리 x: 222..256` 100% 유지),
  - `original-barrel-standing-hip-extension` 및 `original-barrel-standing-side-reach` (`barrel-standing-hip-extension-isolated`)의 손을 사다리 상단 가로대(`hand: 88,76`, `wrist: 96,80` → 사다리 `x: 76..96` 내부 오차 **`0px`**)에 안착시켜 **돔 관통 `0건`, 사다리 관통 `0건`**으로 해결함.

---

## 3. 후보 패치 적용 가능성 검증

```bash
git apply --check docs/diagram-contact-audit-20261107/patches/minimal-diagram-contact-fixes.patch
```
- 결과: **종료 코드 `0` (충돌 없이 즉시 적용 가능)**.
