# [P2/추가14] Pilates Flow 3D 자산 라이선스·출처 감사 보고서 (`2026-11-08`)

- **감사 식별자**: `3d-asset-license-audit-20261108` (`[P2/추가14]`)
- **기준 원격 `main` 커밋**: `f6760750ab608c1badb141fe686bfbd2024e6d8d`
- **읽기 전용 및 자산 불변 원칙 준수**:
  - 기존 앱 소스 및 정적 자산 파일(`src/**`, `public/**`, `package.json` 등) **100% READ-ONLY 유지 (`existingAppFilesReadOnly: true`)**
  - **자산 교체·업로드 0건 (`assetsReplacedOrUploaded: 0`)**: 라이선스가 공개 근거로 확인되지 않은 자산은 임의 교체하거나 라이선스를 추정하지 않고 **`미확인` (`unverified`)** 으로 정확히 기록·보고함
  - **범위 외 미접촉**: 수업 기록 페이지(`class-history-page`), `/creators` 구현, 기존 QA 통합은 일체 수정하지 않음

---

## 1. 산출물 및 재현 스크립트 구조

| 구분 | 경로 | 역할 |
| --- | --- | --- |
| **감사 리포트 (문서)** | [`docs/3d-asset-license-audit-20261108/README.md`](./README.md) | 실제 사용 3D 모델/텍스처/애니메이션별 출처, 라이선스 표시, 재배포 의무·누락, 재현 증거, 우선순위 상위 5개 종합 보고 |
| **기계 판독 원장 (JSON)** | [`docs/3d-asset-license-audit-20261108/asset-license-provenance-ledger.json`](./asset-license-provenance-ledger.json) | 22개 연속 동작 연구 모델 + 3개 축회전 3D 투영 모델 + 2개 실험실 프로토타입 + 9개 정적 SVG + 3개 래스터 텍스처의 SHA-256·라이선스·출처 바인딩 원장 |
| **감사 실행 요약 (JSON)** | [`docs/3d-asset-license-audit-20261108/audit-summary.json`](./audit-summary.json) | 실행 상태(`PASS`), 정책 준수 플래그 및 상위 5개 우선순위 요약 |
| **합성 데이터 & 무결성 검증 스위트** | [`scripts/3d-asset-license-audit-20261108/3d-asset-license-audit.node-test.mjs`](../../scripts/3d-asset-license-audit-20261108/3d-asset-license-audit.node-test.mjs) | 바이너리 3D 메쉬 부재, 전 자산 SHA-256 일치, `미확인` 자산 판정, 합성 데이터 기반 `getMotionReviewSourceFacts` 바인딩 검증, 재배포 매니페스트 누락 검증 (`5 / 5 PASS`) |
| **감사 실행 오케스트레이터** | [`scripts/3d-asset-license-audit-20261108/run-3d-asset-license-audit.mjs`](../../scripts/3d-asset-license-audit-20261108/run-3d-asset-license-audit.mjs) | 읽기 전용 검증 실행 및 JSON 원장/요약 생성 |

---

## 2. 아키텍처 실체 요약: 바이너리 3D 메쉬 0건 · 절차적 3D 좌표 투영 모델 23종

1. **바이너리 3D 메쉬 파일 및 WebGL/Three.js 엔진 0건**:
   - 저장소 전체(`src/`, `public/`)에 `.glb`, `.gltf`, `.fbx`, `.obj`, `.dae`, `.stl`, `.usdz` 파일은 **0개**이며, `package.json`에도 `three`, `@react-three/*`, `babylonjs` 등 3D WebGL 의존성이 **전무**합니다.
   - [`src/features/motionCoverage/types.ts`](../../src/features/motionCoverage/types.ts) 및 [`docs/atlas-media-provenance-round4-20261107/media-provenance-ledger.json`](../atlas-media-provenance-round4-20261107/media-provenance-ledger.json)에 명시된 바와 같이 `true3dSupported: false`, `webgl3dReady: false`, `renderSurface: 'svg-2d'`입니다.
2. **실제 사용되는 3D/2D/텍스처/애니메이션 자산 구성**:
   - **절차적 3D 좌표 투영 모델 (23종)**: TypeScript 코드 내 3차원 관절 좌표(`Point3` / `BatchPoint` / `SupineReachPoint`)를 정의한 뒤 사선 정사영(`oblique-orthographic-3d-to-2d-svg`) 또는 축회전 정사영(`rotation-axial-projection-v1`)으로 2D `<svg>`에 연속 렌더링하는 모델 23종(`motionStudyLedger.json` 내 3D 모델 20종 + `src/models/rotationDrafts.ts` 내 3종).
   - **절차적 2D 연속/기구학 모델**: `supported-heel-raise`(`src/models/heelRaise.ts`), 실험실 전용 `bridge-pattern`·`heel-slide`(`src/utils/motionReferenceModel.ts`), 그리고 2D 기구학 트랙 모델(`pelvisHip2dModel.ts`, `hip-leg-diagram-model.ts`, `shoulderSupportDrafts.ts`, `extensionMovementModel.ts`, `coreAbdominalDiagrams.ts`, `spineArticulationDiagramData.ts`).
   - **98개 카탈로그 3단계 리그 도해 (`MOVEMENT_VISUAL_ASSETS`)**: [`src/data/movementVisualRigCatalog.ts`](../../src/data/movementVisualRigCatalog.ts) 내 `start`/`middle`/`end` 이산 포즈 리그.
   - **정적 기구·동작 가이드 SVG (9종)**: `public/images/movement-guides/*.svg`.
   - **래스터 텍스처/배경 이미지 (3종)**: `public/images/atelier-reformer-still-life.png`, `public/images/atelier-ring-still-life.png`, `public/images/atelier-studio.webp`.

---

## 3. 실제 사용 3D/2D 모델 · 텍스처 · 애니메이션별 출처 · 라이선스 · 재배포 의무 검증표

### 3.1 연속 동작 연구 모델 (22종, `src/data/motionStudyLedger.json`) 및 3D 축회전 모델 (3종)

| 그룹 / Variant ID | 차원 구분 | 소유 모델·데이터 파일 | 공개 참조 출처 (Public Basis) | 코드/도해 라이선스 | 라이선스 파일 & UI 표시 | 재배포 의무 및 누락 사항 |
| --- | --- | --- | --- | --- | --- | --- |
| `supported-heel-raise` | 2D 연속 (`Point2`) | `src/models/heelRaise.ts`<br>`src/data/motionDrafts.ts` | NHS (`strength-exercises`), UHSussex (`standing-exercises-2`) | `0BSD` (테스트 픽스처에만 존재) | `src/test/fixtures/motion-models/LICENSE.txt` (`src/models/` 내 단독 라이선스 누락) | 1. `src/models/` 내 라이선스 파일 누락<br>2. `motionDrafts.ts:136-145`에 `sourceId`·`factualRecordSha256` 누락 → `unbound-reference` |
| `side-lying-clam` | **3D 좌표 투영** (`Point3`) | `src/models/clam.ts`<br>`src/data/motionDrafts.ts` | South Tees NHS (`the-clam`), CUH NHS (`general-stability-exercises1`) | `0BSD` (테스트 픽스처에만 존재) | `src/test/fixtures/motion-models/LICENSE.txt` (`src/models/` 내 단독 라이선스 누락) | 1. `src/models/` 내 라이선스 파일 누락<br>2. `motionDrafts.ts:173-182`에 `sourceId`·`factualRecordSha256` 누락 → `unbound-reference` |
| `adult-supine-heel-slide`<br>`supine-knee-fold` | **3D 좌표 투영** (`Point3`) | `src/models/supineDrafts.ts`<br>`src/models/supine-source-facts.json` | North Bristol NHS (`nbt-diep-heel-slide-v1`), Royal Marsden NHS (`1386`), Torbay NHS (`25988.pdf`) | `CC0-1.0` | `src/models/SUPINE-LICENSE.txt`<br>`src/models/SUPINE-PROVENANCE.md` | 자체 코드/수식만 `CC0-1.0` (외부 NHS 리플릿 원문·상표는 별도 권리 보유, 복제 금지 준수됨) |
| `side-lying-straight-leg-lift`<br>`side-lying-open-book` | **3D 좌표 투영** (`Point3`) | `src/models/lateralDrafts.ts` | RUH Bath NHS (`PHY067`), Dynamic Health NHS, Leeds Teaching Hospitals NHS | `MIT` | `src/models/LATERAL-LICENSE.txt` (`src/models/lateral-provenance.md` 누락) | 1. **MIT 재배포 의무**: 배포본에 저작권·허가 고지 포함 필요하나 `dist/` 번들 시 누락<br>2. `lateralDrafts.ts:81-118`의 `sources` 객체 내 `sourceId`·`factualRecordSha256` 누락 → `unbound-reference` |
| `quadruped-arm-slide`<br>`quadruped-leg-slide` | **3D 좌표 투영** (`Point3`) | `src/models/quadrupedDrafts.ts`<br>`src/data/motionDraftExpansion.ts` | CUH NHS (`cuh-pilates-swimming-box-v1`), NHS Inform (`nhsinform-back-superman-v1`), Torbay NHS | `MIT` | `src/models/QUADRUPED-LICENSE.txt` | **MIT 재배포 의무**: 저작권·허가 고지 보존 및 비승인(`unapproved`) 표시 유지 의무 |
| `reformer-parallel-footwork`<br>`chair-seated-pedal-press` | **3D 좌표 투영** (`Point3`) | `src/models/apparatusDrafts.ts`<br>`src/models/reformerFootwork.ts`<br>`src/models/chairPedalPress.ts` | Merrithew STOTT PILATES, BASI Pilates (외부 링크만 참조) | `0BSD` | `src/models/apparatus-LICENSE.txt`<br>`src/models/apparatus-provenance.md` | 자체 기하 코드 `0BSD`, 외부 브랜드 상표·원문 제외 (`linked-factual-record` 정상 바인딩) |
| `reformer-supine-strap-arm-press`<br>`cadillac-supine-arm-spring-press` | **3D 좌표 투영** (`Point3`) | `src/models/tensionDrafts.ts`<br>`src/models/reformerStrapArmPress.ts`<br>`src/models/cadillacArmSpringPress.ts` | Merrithew, Peak Pilates, Balanced Body (외부 링크만 참조) | `0BSD` | `src/models/tension-LICENSE.txt`<br>`src/models/tension-provenance.md` | 자체 기하 코드 `0BSD`, 외부 저작물 제외 (`linked-factual-record` 정상 바인딩) |
| `ladder-supported-hip-extension-slide`<br>`ladder-supported-side-leg-slide` | **3D 좌표 투영** (`Point3`) | `src/models/standingSupportDrafts.ts`<br>`src/data/motionDraftV5.ts` | Joseph Pilates (1945 US Public Domain), CUH NHS, UHSussex NHS, NHS Inform | `MIT` | `src/models/standing-support-LICENSE.txt` | **MIT 재배포 의무**: 저작권·허가 고지 포함 의무 (`dist/` 번들 시 라이선스 원문 미포함) |
| `floor-seated-band-row` | **3D 좌표 투영** (`Point3`) | `src/models/seatedBandRow.ts`<br>`src/data/motionDraftV5.ts` | York & Scarborough NHS, Versus Arthritis | `MIT` | `src/models/seated-band-row-LICENSE.txt`<br>`src/models/seated-band-row-provenance.md` | **MIT 재배포 의무**: 저작권·허가 고지 포함 의무 |
| `supine-chest-lift` | **3D 좌표 투영** (`Point3`) | `src/models/chestLift.ts`<br>`src/models/chestLiftProvenance.ts` | BASI Pilates (`basi-cjkelly-chest-lift-v1`) | `MIT` (`chestLiftProvenance.ts:66` 상수 선언) | **단독 `src/models/chest-lift-LICENSE.txt` 및 `chest-lift-provenance.md` 누락** | **MIT 라이선스 전문 파일 누락**: `originalCodeLicense: 'MIT; external publisher works excluded'`만 존재하고 MIT 전문 텍스트 파일이 누락됨 |
| `articulated-pelvic-curl` | **3D 좌표 투영** (`Point3`) | `src/models/pelvicCurl.ts`<br>`src/data/motionDraftV6.ts` | CUH NHS (`cuh-nhs-pelvic-tilt-bridge-v1`), BASI Pilates (`basi-pelvic-curl-guide-v1`) | `MIT` | `src/models/pelvic-curl-LICENSE.txt`<br>`src/models/pelvic-curl-provenance.md` | **MIT 재배포 의무**: 저작권·허가 고지 포함 의무 |
| `chair-seated-bilateral-arm-raise-v1`<br>`chair-seated-overhead-sidebend-v1`<br>`prone-single-straight-leg-extension-v1`<br>`prone-forearm-chest-extension-v1` | **3D 좌표 투영** (`BatchPoint`) | `src/models/motionAuthoringBatch.ts`<br>`src/data/motionAuthoringBatch.ts` | BASI Pilates, Merrithew, NHS Inform, CUH NHS (`motionAuthoringBatch.ts`) | `CC0-1.0 OR MIT` | `src/data/motionAuthoringBatchIntegrity.json` | 1. `src/data/motionReviewSourceManifest.json` (17개 항목)에서 4종 모두 누락<br>2. `manifestSource: "motion-assets/evidence/motion-authoring-manifest.json"` 경로 파일이 저장소에 부재 |
| `supine-single-leg-reach-v1` | **3D 좌표 투영** (`SupineReachPoint`) | `src/models/supineReach.ts`<br>`src/data/supineReach.ts`<br>`src/data/supineReachSource.json` | UHCW NHS (`uhcw-core-control-single-leg-stretch-2023`), Royal Osteoporosis Society (`ros-tabletop-leg-extension-2022`) | **`미확인` (`unverified`)** | 라이선스 파일 없음, SPDX 헤더 없음, `supineReachSource.json` 내 코드 라이선스 필드 없음 | **미확인 보고 (자산 교체/업로드 미수행)**: 외부 출처의 `reference-only-no-copy`만 기재되어 있고 자체 3D 기하 코드 라이선스가 누락됨. 또한 `motionReviewSourceManifest.json`에서도 누락됨 |
| `rotation-mat-saw`<br>`rotation-mat-spine-twist`<br>`rotation-mat-criss-cross` | **3D 축회전 투영** (`Point3`) | `src/models/rotationDrafts.ts`<br>`src/data/rotationDiagramData.ts`<br>`src/components/RotationDraftFigure.tsx` | Joseph Pilates (1945 US Public Domain), CUH NHS, Merrithew STOTT PILATES (`src/data/rotationSourceFacts.json`) | `CC0-1.0 OR MIT` | `src/models/rotation-LICENSE.txt`<br>`src/models/rotation-provenance.md` | `CC0-1.0 OR MIT` 듀얼 라이선스 및 비임상 진실성 고지(`anatomicalAccuracyAssumed: false`) 준수 |
| `bridge-pattern`<br>`heel-slide` (Lab 전용) | 2D 실험실 프로토타입 | `src/utils/motionReferenceModel.ts`<br>`src/data/motionReferences.ts`<br>`src/data/motionReferenceSource.json` | South Tees NHS, Royal Osteoporosis Society, NHS Inform (`motionReferenceSources.md`) | **`미확인` (`unverified`)** | `motionReferenceSource.json:13`에 `licensingFileSha256: "fc0c8977..."`만 기록되고 실제 라이선스 파일 부재 | **미확인 보고**: 해시(`fc0c89776986ca7a11527071b18e848aa0ea0a0a45c7a369beed0b1017287d17`)에 대응하는 라이선스 원문 파일이 저장소에 존재하지 않음 |

---

### 3.2 래스터 텍스처 · 정적 SVG · 카탈로그 리그 검증표

| 자산 경로 / 식별자 | 유형 / 크기 / SHA-256 | 실제 사용처 | 출처 근거 (Provenance) | 라이선스 상태 | 재배포 의무 및 누락 사항 |
| --- | --- | --- | --- | --- | --- |
| `public/images/atelier-studio.webp` | WebP 래스터 텍스처<br>`106,018 B`<br>`826b6876f95da2e4b4cefd82288ad5912a3e0cda52d8580a62e2099d164f7bce` | `src/styles/studio.css:369` (`.studio-cover` 배경) | **`미확인` (`unverified`)** — 저장소 내 출처 문서 전무 | **`미확인` (`unverified`)** | 출처 및 라이선스 문서가 전무함. 지침에 따라 임의 교체·삭제하지 않고 **`미확인`** 으로 보고 |
| `public/images/atelier-ring-still-life.png` | PNG 래스터 텍스처<br>`2,100,353 B`<br>`5da8d4e903f3c098e7eb81f42f4a3403fcd66875d2e74da89c2af79b8e2a35f6` | `src/components/SequenceWorkbench.tsx:853` (`<img>`) | 부분 언급 (`docs/vnext-visual-contract.md:17` 참조용 정물 이미지 언급, `atelier-v2-asset-provenance.json` 누락) | **`미확인` (`unverified`)** | `atelier-v2-asset-provenance.json`에 SHA-256 및 출처 ID가 누락되어 있으며, SPDX 재배포 라이선스가 없음 (**`미확인`** 보고) |
| `public/images/atelier-reformer-still-life.png` | PNG 래스터 텍스처<br>`2,178,463 B`<br>`08738f19dac08bfb0da865aee5cdd23fcb6a4d89c752b8e7db21d65d0f1586c7` | `src/components/NextClassBanner.tsx:194` (`<img>`) | 확인됨 (`src/styles/atelier-v2-asset-provenance.json`: `libfile_eda8613323a0819196039aeb81371d0b`, Original AI still-life) | **`미확인` (`unverified`)** (SPDX 라이선스 미기재) | `permittedUse: "Decorative empty-equipment card background; preserve reference-image label"` 조건은 기재되어 있으나 오픈소스/재배포용 SPDX 라이선스가 명시되지 않음 (**`미확인`** 보고) |
| `public/images/movement-guides/*.svg` (9종) | 정적 SVG 가이드 (기구 5종 + 고관절·하지 2종 + 견갑·상지 2종) | `src/data/movementVisualRigCatalog.ts`, `src/components/hip-leg-diagram-figure.tsx`, `src/components/ShoulderSupportDiagramFigure.tsx` | 자체 제작 (`public/images/movement-guides/MANIFEST.json`, `hip-leg-manifest.json`, `shoulderSupportSourceLedger.json`) | `CC-BY-4.0 / MIT Compatible` (`public/images/movement-guides/LICENSE.txt`) | **재배포 의무 3가지**: ① `blue45f/pilate_flow` 출처 표기, ② `anatomicalAccuracyAssumed: false` 면책 고지 유지, ③ 검수 전/후 UI 구분 유지.<br>**누락**: `PUBLIC_EXPORT_MANIFEST.json`에 `public/images/movement-guides/*` 전체가 누락됨 |
| `MOVEMENT_VISUAL_ASSETS` (98종) | 3단계(`start`/`middle`/`end`) 2D SVG 리그 | `src/data/movementVisualRigCatalog.ts`<br>`src/components/MovementPhaseDiagramSvg.tsx` | `src/data/movementProvenance.ts` (`pilates-1945-contrology` 60종 + `korean-studio-adaptation` 38종) | `CC-BY-4.0 / MIT Compatible` (`public/images/movement-guides/LICENSE.txt`) | `movementVisualSourceAudit.ts`에서 전수 `anatomicalAccuracyAssumed: false`, `professionalReviewCount: 0` 강제 검증됨 |

---

## 4. 재현 증거 (Reproducible Verification Commands)

추가 패키지 설치나 기존 파일 수정 없이 Node.js 내장 테스트 러너로 즉시 재현할 수 있습니다.

```bash
# 1. 감사 오케스트레이터 실행 (내장 테스트 5건 실행 + JSON 원장 및 요약 갱신)
node scripts/3d-asset-license-audit-20261108/run-3d-asset-license-audit.mjs

# 2. 합성 데이터 & 읽기 전용 무결성 테스트 단독 실행 (5 / 5 PASS)
node --test scripts/3d-asset-license-audit-20261108/3d-asset-license-audit.node-test.mjs
```

---

## 5. 우선순위 상위 5개 (Top 5 Priority Items)

1. **[우선순위 1 · High] Atelier 래스터 텍스처 3종의 출처·재배포 라이선스 미확인 (`미확인` 보고, 자산 교체/업로드 금지 준수)**
   - **소유 파일**: `public/images/atelier-studio.webp`, `public/images/atelier-ring-still-life.png`, `public/images/atelier-reformer-still-life.png`, `src/styles/atelier-v2-asset-provenance.json`, `src/styles/studio.css:369`, `src/components/SequenceWorkbench.tsx:853`, `src/components/NextClassBanner.tsx:194`
   - **근거**: `atelier-studio.webp`는 저장소 내 출처·라이선스 기록이 전무하며, `atelier-ring-still-life.png`는 `atelier-v2-asset-provenance.json`에서 누락되었고, `atelier-reformer-still-life.png`는 내부 출처 ID(`libfile_eda8613323a0819196039aeb81371d0b`)만 존재하고 SPDX 재배포 라이선스가 없습니다.

2. **[우선순위 2 · High] 절차적 3D/2D 모델 5종의 라이선스 파일 누락 및 `미확인` 상태**
   - **소유 파일**: `src/models/supineReach.ts`, `src/data/supineReachSource.json`, `src/utils/motionReferenceModel.ts`, `src/data/motionReferenceSource.json`, `src/models/heelRaise.ts`, `src/models/clam.ts`
   - **근거**: `supine-single-leg-reach-v1`은 자체 3D 기하 코드에 대한 라이선스 파일·필드가 전무하여 **`미확인`** 이며, `bridge-pattern`·`heel-slide`는 `licensingFileSha256`(`fc0c8977...`)이 가리키는 라이선스 원문 파일이 저장소에 없어 **`미확인`** 입니다. `heelRaise.ts`와 `clam.ts`는 `src/test/fixtures/motion-models/LICENSE.txt`에만 `0BSD`가 선언되어 있고 `src/models/` 내 라이선스 파일이 누락되어 있습니다.

3. **[우선순위 3 · Medium] MIT 라이선스 3D 모델군의 단독 라이선스 파일 누락(`supine-chest-lift`) 및 프로덕션 번들(`dist/`) 고지 의무 누락**
   - **소유 파일**: `src/models/chestLift.ts`, `src/models/chestLiftProvenance.ts:66`, `src/models/LATERAL-LICENSE.txt`, `src/models/QUADRUPED-LICENSE.txt`, `src/models/pelvic-curl-LICENSE.txt`, `src/models/seated-band-row-LICENSE.txt`, `src/models/standing-support-LICENSE.txt`
   - **근거**: `supine-chest-lift`는 `chestLiftProvenance.ts:66`에 `'MIT; external publisher works excluded'`만 선언되어 있고 `src/models/chest-lift-LICENSE.txt` 전문 파일이 누락되어 있습니다. 또한 MIT 라이선스 조건상 소프트웨어 배포본(`dist/`)에 저작권 고지 및 허가 고지가 포함되어야 하나 빌드 시 `src/models/*-LICENSE.txt`가 복사되거나 UI에 표시되지 않습니다.

4. **[우선순위 4 · Medium] 4개 모델(`supported-heel-raise`, `side-lying-clam`, `side-lying-straight-leg-lift`, `side-lying-open-book`)의 출처 해시 바인딩 누락 (`unbound-reference`)**
   - **소유 파일**: `src/data/motionDrafts.ts:136-182`, `src/models/lateralDrafts.ts:81-118`, `src/utils/motionReviewSourceFacts.ts:98-112`, `src/data/motionDraftSourceLedger.json`
   - **근거**: `motionDraftSourceLedger.json`에 검증된 출처 레코드(`ruh-lateral-hip-side-abduction-v1` 등)가 존재함에도, 모델의 `sources` 배열 원소에 `sourceId`와 `factualRecordSha256` 필드가 빠져 있어 `getMotionReviewSourceFacts` 실행 시 `binding: 'unbound-reference'`, `sourceChecked: null`로 판정됩니다(합성 데이터 테스트 4번으로 재현·검증 완료).

5. **[우선순위 5 · Low] 재배포 매니페스트(`PUBLIC_EXPORT_MANIFEST.json`) 및 리뷰 매니페스트(`motionReviewSourceManifest.json`) 누락 불일치**
   - **소유 파일**: `PUBLIC_EXPORT_MANIFEST.json`, `public/images/movement-guides/LICENSE.txt`, `src/data/motionReviewSourceManifest.json`, `src/data/motionStudyLedger.json`, `src/data/motionAuthoringBatchIntegrity.json`
   - **근거**: `CC-BY-4.0 / MIT Compatible` 조건이 부여된 `public/images/movement-guides/*` 전체가 `PUBLIC_EXPORT_MANIFEST.json`에서 누락되어 있으며, `motionReviewSourceManifest.json`(17종)은 `motionStudyLedger.json`(22종) 중 5종(`chair-seated-bilateral-arm-raise-v1`, `chair-seated-overhead-sidebend-v1`, `prone-single-straight-leg-extension-v1`, `prone-forearm-chest-extension-v1`, `supine-single-leg-reach-v1`)을 누락하고 있고, `motionAuthoringBatchIntegrity.json`의 `manifestSource`(`motion-assets/evidence/motion-authoring-manifest.json`) 파일은 저장소에 존재하지 않습니다.
