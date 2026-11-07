# 필라테스 동작 도해 근거 검증 (3-Track 병렬 검증)

## 1. 소유 경로 및 읽기 전용 경계 선언

- **브랜치**: `feat/motion-evidence-review-three-track` (기존 `67a6809 -> 27d376b -> 9caab81` 커밋 체인 완전 보존)
- **신규 전용 소유 경로 (수정 허용)**:
  - `src/features/motionEvidenceReview/**`
    - `src/features/motionEvidenceReview/types.ts`
    - `src/features/motionEvidenceReview/trackAMatEvidence.ts`
    - `src/features/motionEvidenceReview/trackBApparatusEvidence.ts`
    - `src/features/motionEvidenceReview/validator.ts`
    - `src/features/motionEvidenceReview/index.ts`
    - `src/features/motionEvidenceReview/motionEvidenceReview.test.ts`
  - `docs/motion-evidence-review/**`
    - `docs/motion-evidence-review/README.md`
    - `docs/motion-evidence-review/TRACK_A_MAT_TOP10_EVIDENCE.md`
    - `docs/motion-evidence-review/TRACK_B_APPARATUS_TOP10_EVIDENCE.md`
- **읽기 전용 경로 (수정 0줄)**:
  - `src/features/motionCoverage/**`, `src/components/**`, `src/data/**`, `public/**`, `src/store/**`, `src/styles/**`, `src/models/**`, `package.json`, `pnpm-lock.yaml` 등 기존 모든 공유 파일은 수정하지 않았습니다.

---

## 2. 3-Track 검증 결과 및 출처 접근 투명성 요약

| 구분 | 대상 범위 | 레코드 수 | Track 간 ID 중복 | 전체 출처 SHA-256 원장 검증 (`fullyVerifiedSourceExerciseCount`) | 외부 URL 샌드박스 프록시 제한/스니펫 병행 (`partiallyOrProxyRestrictedExerciseCount`) | 검증기 결함 (`issueCount`) |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: |
| **Track A** | 매트(`mat`) 기본 동작 상위 10종 | 10 | 0 | 3 (`original-mat-heel-slide`, `original-mat-knee-fold`, `original-mat-quadruped-reach`) | 7 (스니펫 확인 6 + 프록시 본문 차단 1) | 0 |
| **Track B** | 기구(`reformer`, `cadillac`, `chair`, `barrel`) 상위 10종 | 10 | 0 | 0 | 10 (스니펫 확인 2 + 프록시 본문 차단 8) | 0 |
| **합계** | **총 20종** | **20** | **0 (`zeroTrackIdOverlap: true`)** | **3종 (전 출처 원장 스냅샷)** | **17종 (원장 출처 1건 + 외부 스니펫/프록시 차단 출처 1건 이상)** | **0** |

> **근거 출처 접근 및 샌드박스 프록시 제한 고지**:
> - 20종 전 항목은 저장소 내 SHA-256 검증 원장(`src/data/motionDraftSourceLedger.json`, `src/data/motionApparatusSourceLedger.json`)에 수록된 영국 NHS 대학병원 공개 리플릿 URL을 최소 1건씩 보유합니다(`hasVerifiedDirectSource: true` 20/20).
> - 다만 함께 기재한 BASI Pilates, Pilatesology, Pilates Anytime 등 외부 민간 커리큘럼 URL 중 9종은 샌드박스 프록시(`agy-plugin-proxy`) 정책상 본문 직접 HTTP 크롤링이 차단되어 우회 시도 없이 `blocked-by-sandbox-proxy-unverified`로 기록하였고, 8종은 공개 검색 스니펫(`verified-via-public-search-snippet`)까지만 확인된 상태로 정직하게 분리 집계하였습니다.
> - 외부 이미지·영상·문서 무단 다운로드는 0건(`rightsPolicy: 'link-only-no-download'`)이며, 유료 API·비밀키·결제 설정은 일절 사용하지 않았습니다.

---

## 3. Track C 순수 TypeScript 검증기 (`src/features/motionEvidenceReview/validator.ts`)

`validateMotionEvidenceRecord` 및 `validateMotionEvidenceSuite`는 네트워크 호출이나 외부 부작용 없이 다음 14개 결함 코드를 탐지합니다:

1. `unknown-catalog-id`: `INITIAL_EXERCISES`에 존재하지 않는 `exerciseId`
2. `duplicate-exercise-id`: 동일 트랙 내 중복된 `exerciseId`
3. `track-id-overlap`: Track A와 Track B 간 `exerciseId` 중복
4. `track-category-mismatch`: Track A에 비매트(`apparatus !== 'mat'`) 동작 포함 또는 Track B에 매트(`apparatus === 'mat'`) 동작 포함
5. `apparatus-mismatch`: `INITIAL_EXERCISES` 또는 `MOVEMENT_VISUAL_ASSETS`와 기구(`apparatus`) 불일치
6. `body-position-mismatch`: `INITIAL_EXERCISES` 또는 `MOVEMENT_VISUAL_ASSETS`와 시작 자세(`bodyPosition`) 불일치
7. `missing-or-invalid-source-url`: 출처 누락 또는 `https://` 직접 URL 형식 오류
8. `invalid-source-rights-policy`: `rightsPolicy !== 'link-only-no-download'`
9. `missing-phase-evidence`: `start` / `middle` / `end` 단계 누락 또는 자세·전환 설명 누락
10. `missing-biomechanical-field`: 관절 방향(`jointDirectionsKo`), 지지점(`supportPointsKo`), 기구 상호작용(`apparatusInteractionKo`), 호흡(`breathingKo`) 누락
11. `discrepancy-target-id-mismatch`: `targetVisualAssetId`(`MOVEMENT_VISUAL_ASSETS.archetypeId`), `targetPatternVariantIds`(`MOTION_PATTERN_REFERENCES.variantId`), 또는 개별 진술의 `targetId` 불일치 및 도해 팀 수정 권고 누락
12. `epistemic-category-mismatch`: 사실(`fact`) / 추론(`inference`) / 미검증(`unverified`) 분류 불일치
13. `unsupported-numeric-angle-or-medical-claim`: 근거 없는 관절 각도(`°`/`deg`), 근활성도(`EMG %`), 의학적 안전 보장 문구 포함
14. `false-ready-or-verified-claim`: 검증되지 않은 모션을 `canonicalMotionReady`, `manualReady`, `true3dSupported`, `anatomicalVerificationCompleted`, `expertVerificationCompleted` = `true`로 허위 표시

---

## 4. 도해 UI·에셋 담당자를 위한 핵심 수정 제안 (우선순위 순)

### P0 — 기구 도식(`MovementPhaseDiagramSvg.tsx`) 및 2D Rig 좌표 역전/이탈 버그
1. **운다 체어 페달 회전 부호 반전 버그 (`MovementPhaseDiagramSvg.tsx` 183행, 대상: `original-chair-seated-pedal-press`, `chair-seated-pedal-footwork`)**:
   - 현재 `const pedalTipY = 162 - Math.sin(rad) * 52;`로 작성되어 `pedalAngleDeg`가 `8 -> 36`으로 증가할 때 발(`heel y: 142 -> 174`)은 내려가는데 페달 끝(`y: 154.8 -> 131.4`)은 위로 올라가 `42.6px` 분리됩니다. 페달 회전 부호/축을 하방 프레스 방향과 일치시켜야 합니다.
2. **사이드 클램 vs 사이드 오픈 북 2D 아키타입 분리 (`movementVisualRigCatalog.ts`, 대상: `original-mat-clam`, `original-mat-open-book`, `side-lying-clam-open-book`)**:
   - 두 동작이 `side-lying-clam-open-book`을 공유하여 Clam `middle`에서 팔이 뒤로 넘어가고(`hand: 176,136 -> 38,62`), Open Book `middle`에서 고정되어야 할 무릎이 `48px` 들립니다(`knee y: 152 -> 104`). 두 아키타입을 즉시 분리해야 합니다.
3. **체스트 리프트 발목 거상 및 팔 전방 리치 분리 (`movementVisualRigCatalog.ts`, 대상: `original-mat-chest-lift`, `supine-chest-lift-curl`, `supine-chest-lift`)**:
   - Roll-Up·Teaser와 `supine-chest-lift-curl`을 공유하여 `middle`에서 발목이 매트에서 들리고(`ankle y: 144 -> 116`) 팔을 앞으로 뻗습니다. 발목을 `y:144`에 고정하고 양손이 후두부를 지지하도록 분리해야 합니다.
4. **리포머 플랭크 손·발 좌우 기구 역전 (`ex-plank-01`, `plank-long-stretch-chair-pike`) 및 체어 파이크 기구 이탈 (`ex-plank-02`)**:
   - 리포머 도식은 풋바가 오른쪽(`x:278~288`)인데 `plank-long-stretch-chair-pike`는 손이 왼쪽(`x:96`), 발이 오른쪽(`x:280`)에 있어 손·발 지지 기구가 뒤바뀌었습니다. 또한 체어 파이크(`ex-plank-02`)에서는 손목(`y:144`)이 시트(`y:122`) 아래 허공에, 발(`x:280`)이 페달(`x:200`) 밖 허공에 떠 있으므로 기구별 전용 좌표를 분리해야 합니다.
5. **래더 바렐 스탠딩 인체-바렐 돔 관통 충돌 (`original-barrel-standing-hip-extension`, `standing-scooter-lunge-splits`)**:
   - 바렐 돔(`x:122~246`) 내부에 서 있는 인체(`x:124~278`)가 겹쳐 그려지므로, 래더(`x:58~82`)를 잡고 서도록 인체 x좌표 또는 바렐 도식 배치를 조정해야 합니다.

### P1 — 캐리지/테이블 연동 및 연속 모션 초안 정합성 보완
6. **캐딜락 고정 테이블 `carriageOffsetPx` 제거 및 리포머 캐리지-신체 동반 이동 (`movementVisualRigCatalog.ts` 4327행, `supine-strap-arm-press`, `supine-feet-in-straps`, `prone-swan-pulling-straps-swimming`)**:
   - `isCarriageApparatus`에서 `cadillac`을 제외하여 고정 테이블의 `carriageOffsetPx`를 `0`으로 고정하고, 리포머에서 `carriageOffsetPx`가 변할 때 캐리지 위 신체 고정 앵커도 함께 이동하도록 보정해야 합니다.
7. **매트 스완 준비(`original-mat-swan-prep`) 및 스트랩 프로그(`original-reformer-strap-frog`) 2D 포즈 분리**:
   - `original-mat-swan-prep`에서 손이 골반 뒤로 스윕(`hand x: 46 -> 184`)되고 발목이 들리는(`y: 144 -> 128`) Pulling Straps 궤적을 전완/손 매트 지지 포즈로 분리하고, `original-reformer-strap-frog`의 `end` 단계를 천장 리프트(Leg Circle) 대신 무릎 굴곡(프로그 복귀)으로 수정해야 합니다.
8. **연속 초안(`supine-knee-fold`, `supine-single-leg-reach-v1`) 정강이 각도 및 좌우 교대 보완**:
   - `supineDrafts.ts`의 `supine-knee-fold` 정점(`p=0.5`)에서 발목(`z:78.6`)이 무릎(`z:112`)과 수평 테이블탑을 이루도록 슬관절 각도를 보간하고, `supine-single-leg-reach-v1`에 좌우 다리 교대 주기를 추가해야 합니다.

---

## 5. 재현 명령어

```bash
pnpm exec vitest run src/features/motionEvidenceReview/motionEvidenceReview.test.ts
pnpm exec tsc -b --noEmit
pnpm exec eslint src/features/motionEvidenceReview
```
