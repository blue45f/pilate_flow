# [P7/추가14] Pilates Flow 모션 출처 감사 (Motion Provenance Audit)

- **기준 원격 브랜치 및 커밋 (`origin/main`)**: `f676075` (`f676075 test(pwa): set active registration state in B-F4 update-ready mock test`, `b89a1d2 feat(diagrams): integrate 7-track kinematic movement guides, source ledgers, and shared registry` 포함)
- **감사 범위**:
  1. 동작 데이터(Movement Data) 출처 추적 및 정합성
  2. 모션 캡처(Motion Capture) 사용 여부 및 P2(3D 모델·텍스처 라이선스)와의 경계 구분
  3. 참조 영상(Reference Video / YouTube oEmbed / 공공·공식 참고자료) 출처·인용 근거
  4. 이름 매핑(Name Mapping · 카탈로그 ID · 한/영 명칭 · 기구 슬러그 · 아키타입 매핑) 추적
  5. 라이선스 및 비보증·비임상 경계(Non-endorsement / Non-clinical Boundary) 확인
- **감사 원칙 및 경계**:
  - **임의의 해부학적 정확성 또는 치료·임상 효과를 주장하지 않습니다** (`anatomicalAccuracyAssumed: false`, `objectiveEfficacyClaimed: false`, `professionalReviewCount: 0`).
  - **P2(3D 모델·텍스처 라이선스)와의 구분**: 저장소(`src/`, `public/`) 내에 외부 3D 메쉬·텍스처·모션 캡처 바이너리(`.bvh`, `.c3d`, `.fbx`, `.gltf`, `.glb`, `.obj`, `.dae`, `.usd`, `.usdz`)는 **0건**이며, 모든 동작 시각화는 코드로 직접 작성된 2D SVG 및 3D→2D 사선 직교 투영(`oblique-orthographic-3d-to-2d-svg`) 도해입니다.
  - **읽기 전용 분석 및 합성 데이터(Synthetic Data) 검증**: 기존 카탈로그·모션 원장·모델·런타임 코드를 수정하지 않고(`src/data/motionStudyLedger.json` SHA-256 `0ff99f03655d6fae11a70713330185a894fd8e8cc2130dcfaea46b17f3415759` 불변 유지), 읽기 전용 분석과 합성 픽스처 테스트(`src/test/motionProvenanceAudit.test.ts`)로만 재현·검증했습니다.
  - **범위 외 및 중복 보류**: 수업 기록 페이지(`/records`), `/creators` 구현, 기존 QA 통합은 범위 밖으로 제외했으며, 타 감사 트랙(`docs/legal-compliance-audit-20261108`, `docs/data-integrity-audit-20261108`, `docs/external-dependency-audit-20261108`)과 중복되는 영역은 수정 없이 참조만 기록하고 보류했습니다.

---

## 1. P2(3D 모델·텍스처)와의 구분 및 라이선스·인용 근거 요약

| 구분 항목 | 확인 결과 (재현 값) | 소유 파일 및 근거 |
| --- | --- | --- |
| 3D 메쉬·텍스처·모캡 바이너리 (`.bvh`, `.c3d`, `.fbx`, `.gltf`, `.glb`, `.obj` 등) | **0건** (`true3dReadyCount: 0`) | `src/features/motionCoverage/resolver.ts`, `src/test/motionProvenanceAudit.test.ts` |
| 모션 캡처(Motion Capture) 사용 여부 | **미사용 (`motionCaptureUsed: false`)** | `src/data/motionAuthoringBatch.ts`, `src/models/chestLiftProvenance.ts`, `src/models/pelvicCurl.ts`, `src/data/motionStudyLedger.json` |
| 해부학적 정확성·임상/치료 효과 주장 여부 | **주장 안 함 (`anatomicalAccuracyAssumed: false`, `objectiveEfficacyClaimed: false`, `aiSafetyGuaranteed: false`)** | `src/utils/humanMovementCreation.ts` (`DEFAULT_SUBJECTIVE_SAFETY_BOUNDARY`), `src/data/movementVisualRigCatalog.ts` |
| 전문 강사·물리치료사 정식 모션 검수 건수 | **0건 (`professionalReviewCount: 0`, `canonicalReadyCount: 0`, `expertApprovedCount: 0`)** | `src/data/motionReferences.ts`, `src/data/motionPatternReferences.ts`, `src/features/motionCoverage/resolver.ts` |
| 15개 초기 연속 모션 모델 (`heelRaise`, `clam`, `supineDrafts`, `lateralDrafts`, `quadrupedDrafts`, `reformerFootwork`, `chairPedalPress`, `reformerStrapArmPress`, `cadillacArmSpringPress`, `standingSupportDrafts`, `seatedBandRow`) | **MIT License** (자체 코드·수학적 키프레임 도해, 제3자 상표·원문 미디어 비포함) | `src/models/motionDrafts-LICENSE.txt`, `src/models/apparatusMotionDrafts-LICENSE.txt`, `src/models/tensionMotionDrafts-LICENSE.txt`, `src/models/standingSupportDrafts-LICENSE.txt`, `src/models/seatedBandRow-LICENSE.txt` |
| `supine-chest-lift` / `articulated-pelvic-curl` / `supine-Alternating-leg-reach` | **CC0-1.0 OR MIT** (`chestLift`, `pelvicCurl`) · **MIT** (`supineReach`) | `src/models/chestLift-LICENSE.txt`, `src/models/pelvicCurl-LICENSE.txt`, `src/models/supineReach-LICENSE.txt` |
| 4개 배치 연속 모션 변형 (`mat-prone-thoracic-extension`, `mat-quadruped-bird-dog`, `mat-seated-mermaid`, `chair-supported-standing-calf-raise`) | **0BSD (BSD Zero Clause License)** | `src/models/motionAuthoringBatch-LICENSE.txt`, `src/data/motionAuthoringBatch.ts` |
| 정적 기구·고관절·어깨 지지 SVG 가이드 (`public/images/movement-guides/*.svg`, 11종) | **CC-BY-4.0 / MIT** (Clean-room 자체 제작 기하학 도해) | `public/images/movement-guides/LICENSE.txt`, `public/images/movement-guides/MANIFEST.json`, `public/images/movement-guides/hip-leg-manifest.json` |

---

## 2. 4대 모션 출처 도메인 인벤토리

### 2.1 동작 데이터 (Movement Data & Source Ledgers)
1. **정식 카탈로그 98개 동작 (`INITIAL_EXERCISES`)**:
   - `ORIGINAL_MOVEMENTS` **60개** (`original-*`): 앱 전용 자체 작성 수업 계획 노트(`src/data/originalMovements.ts:11-16`). 외부 영상·교본·임상 프로토콜을 복제하지 않음.
   - 레거시/국내/해외 스튜디오 시퀀스 **38개** (`ex-*`): `src/data/pilatesCatalog.ts`에 정의된 기초(18)·한국 유튜브 큐레이션(10)·해외 유튜브 큐레이션(10) 시퀀스.
2. **연속 모션 스터디 22개 변형 (`MOTION_PATTERN_REFERENCES` / `src/data/motionStudyLedger.json`)**:
   - `MOTION_DRAFTS` **17개** + `BATCH_VARIANTS` **4개** + `SUPINE_REACH_DEFINITION` **1개** = 총 **22개** 변형(21개 고유 카탈로그 동작 ID 대응, `original-mat-quadruped-reach`에 2개 변형 매핑).
   - 정식 채택 모션(`canonicalMotionAsset`)은 **0건**이며, `EXERCISE_MOTION_REFERENCES` 98개 전 항목은 `assetStatus: 'not_authored'`를 유지합니다(`src/data/motionReferences.ts`).
3. **98개 3단계(시작-중간-끝) 2D 관절·기구 도해 (`MOVEMENT_VISUAL_ASSETS`) 및 7개 트랙 기구학 가이드 (`b89a1d2`)**:
   - `src/data/movementVisualRigCatalog.ts`: 98개 카탈로그 동작 전체에 대해 `productionMethod: 'free-authored-kinematic-svg-v1'`, `anatomicalAccuracyAssumed: false`로 3단계 2D 포즈를 정의.
   - `src/data/movementDiagramCorrections.ts`: 47개 `ORIGINAL_MOVEMENTS` 항목의 아키타입·관절 궤적을 보정하는 7개 트랙(I1 척추 분절, I2 골반·브리지, I3 고관절·하지, I4 복부·코어, I5 흉추 신전·프론, I6 상지·견갑 지지, I8 회전·측굴) 통합 레지스트리.
4. **SHA-256 사실 기록 원장(Factual Record Ledgers)**:
   - 기존 모션 원장 7종(`motionDraftSourceLedger.json`, `motionApparatusSourceLedger.json`, `motionTensionSourceLedger.json`, `motionSelectedV5SourceLedger.json`, `motionSelectedV6SourceLedger.json`, `motionStandingSourceLedger.json`, `motionQuadrupedSourceLedger.json`) + `supineReachSource.json` + `motionCandidateResearchV7.json`의 모든 `factualRecordSha256` 해시가 canonical JSON SHA-256 계산값과 **100% 일치**합니다.
   - 7개 기구학 트랙 원장 중 `coreAbdominalSourceLedger.json`(6건), `hip-leg-diagram-sources.json`(6건), `shoulderSupportSourceLedger.json`(3건)의 `factualRecordSha256` 또한 canonical JSON SHA-256 계산값과 **100% 일치**합니다(단, Track I8 `rotationSourceFacts.json`은 아래 우선순위 2번 발견 사항 참조).

### 2.2 참조 영상 및 외부 교육 자료 (Reference Videos & External Citations)
1. **`INITIAL_EXERCISES` 내장 `youtube` 참조 (38개 `ex-*`)**:
   - **33개** 동작은 YouTube oEmbed(`https://www.youtube.com/oembed?url=...`) 검증을 거친 공식 채널명·원제·임베드 URL을 보유.
   - **5개** 동작(`ex-warmup-01`, `ex-footwork-02`, `ex-cooldown-02`, `ex-core-04`, `ex-lower-04`)은 기존 미검증 비디오 ID가 제거되고 `channelName: '자료 미확인'`, `verified: false`, `note` 필드에 제거 사유가 기록됨.
2. **`VERIFIED_YOUTUBE_VIDEO_POOL` (`src/data/exerciseYouTubeCatalog.ts`)**:
   - 총 **141개** 고유 11자 YouTube `videoId` (국내 `kr` **76개**, 해외 `global` **65개**), 전수 `verifiedByOembed: true`, `checkedAt: '2026-11-05'`.
3. **`VERIFIED_REFERENCES` (`src/data/verifiedReferences.ts`)**:
   - 총 **30개** 항목 (고유 URL **25개**: `official-source-checked` 18건, `partial-playback-checked` 3건, `korean-candidate` 9건).
4. **`COURSE_REFERENCES` (32건) 및 `PUBLIC_REFERENCES` (3건)**:
   - 외부 자격 과정 안내(`src/data/courseReferences.ts`) 및 국민체력100·질병관리청·NHS 공공 참고 포털(`src/data/publicReferences.ts`).

### 2.3 이름 매핑 (Name Mapping & Identifier Lineage)
1. **영구 카탈로그 ID 체계**:
   - `original-{apparatus}-{slug}` (60개) vs `ex-{category|region}-{seq}` (38개).
2. **한/영 명칭 및 원문 매핑**:
   - `ORIGINAL_MOVEMENTS` 60개는 자체 한국어/영어 계획 명칭(`ko`, `en`)을 사용하며 `getMovementProvenance`에서 `kind: 'original'`, `videoLinkPolicy: 'none'`으로 분류.
   - `ex-kr-*` (10개) 및 `ex-global-*` (10개)는 `nameKo`에 `[국내 {채널명}]` 또는 `[해외 {기관/채널명}]` 접두사를 포함하고 `youtube.originalTitle`에 YouTube oEmbed 원제를 보존.

---

## 3. 우선순위 상위 5개 발견 사항 (Top 5 Prioritized Findings)

### [우선순위 1] 연속 모션 초안 2종의 원장 해시 미결속(`unbound-reference`) 및 `getMotionReviewSourceFacts`의 원장 조회 누락 (High)
- **정확한 소유 파일**:
  - `src/data/motionDrafts.ts` (L136-144 `supported-heel-raise`, L173-182 `side-lying-clam`)
  - `src/utils/motionReviewSourceFacts.ts` (L83-91 `RAW_SOURCES`, L127-153 `getMotionReviewSourceFacts`)
  - `src/data/supineReach.ts` (L51-77 `SUPINE_REACH_DEFINITION`), `src/data/supineReachSource.json` (L19 `basi-single-leg-stretch-public-text-2026-11-05`)
  - `src/data/motionAuthoringBatch.ts` (L5-50 `BATCH_SOURCE_FACTS`, L61-265 `BATCH_VARIANTS`)
  - `src/test/motionReviewWorksheet.test.ts` (L82-123)
- **재현 증거**:
  - `MOTION_DRAFTS` 17개 중 `supported-heel-raise`와 `side-lying-clam` 2개만 `sourceId` 및 `factualRecordSha256` 필드가 정의되어 있지 않아, `getMotionReviewSourceFacts(draft)` 호출 시 `binding: 'unbound-reference'`, `verifiedLedgerEntry: null`, `factualRecordSha256: null`을 반환합니다.
  - 또한 `src/utils/motionReviewSourceFacts.ts:83-91`의 `RAW_SOURCES` 배열은 7개 초기 제안 원장만 임포트하고 `src/data/supineReachSource.json` 및 `BATCH_SOURCE_FACTS`(`src/data/motionAuthoringBatch.ts`)를 임포트하지 않습니다. 합성 프로브로 `SUPINE_REACH_DEFINITION.sources`(`sourceId: 'basi-single-leg-stretch-public-text-2026-11-05'`)나 `BATCH_VARIANTS`의 출처를 `getMotionReviewSourceFacts`에 전달하면, 유효한 `sourceId`와 SHA-256 해시가 존재함에도 `verifiedLedgerEntry`를 찾지 못해 `binding: 'unbound-reference'`로 강등됩니다.
- **근거 및 제약**:
  - `src/test/motionReviewWorksheet.test.ts:82-123`가 `supported-heel-raise`의 `unbound-reference` 상태를 회귀 불변 조건으로 검증하고 있으며, `src/data/motionStudyLedger.json`의 바이트/SHA-256 동결 정책이 적용되어 있으므로 기존 `motionDrafts.ts`는 수정하지 않고 감사 결과로 기록합니다.

### [우선순위 2] 모션·기구학 원장 간 커버리지 비대칭(17 vs 22 vs 98) 및 신규 7-트랙 원장(`b89a1d2`)의 해시·매니페스트 불일치 (High)
- **정확한 소유 파일**:
  - `src/data/motionReviewSourceManifest.json` (L1-55)
  - `src/data/motionStudyLedger.json` (`entries: 22`)
  - `src/data/motionPatternReferences.ts` (L77-130 `MOTION_PATTERN_REFERENCES`)
  - `src/data/motionReferences.ts` (L114-146 `MOTION_REFERENCE_COUNTS`)
  - `src/data/rotationDiagramData.ts` (L585-609 `ROTATION_PATTERN_REFERENCES`)
  - `src/data/rotationSourceFacts.json` (L34, L50, L66 `factualRecordSha256`)
  - `src/data/shoulderSupportSourceLedger.json` (L42, L58, L66, L95, L119)
  - `public/images/movement-guides/MANIFEST.json` 및 `public/images/movement-guides/shoulder-support-*-guide.svg`
- **재현 증거**:
  1. **레지스트리 범위 비대칭**: `motionReviewSourceManifest.json`은 `MOTION_DRAFTS` **17개**(15개 해시 결속 + 2개 미결속)만 수록하는 반면, `motionStudyLedger.json` 및 `MOTION_PATTERN_REFERENCES`는 `BATCH_VARIANTS`(4개)와 `SUPINE_REACH_DEFINITION`(1개)을 포함한 **22개** 변형(21개 카탈로그 ID)을 수록하고, `EXERCISE_MOTION_REFERENCES`는 98개 전체를 `not_authored`(`exactExerciseMappings: 0`)로 기록합니다.
  2. **Track I8(`rotationSourceFacts.json` / `rotationDiagramData.ts`) 해시 혼동 및 플레이스홀더**:
     - `src/data/rotationDiagramData.ts:598`은 `ROTATION_PATTERN_REFERENCES` 생성 시 도해 자산 해시 필드인 `assetSha256`에 첫 번째 원문 출처 해시(`rotationSourceFacts.sources[0].factualRecordSha256`)를 일괄 대입하여, 5개 회전·측굴 도해 전체가 동일한 `assetSha256`을 공유하며 원문 사실 해시와 도해 자산 해시가 혼동되어 있습니다.
     - 또한 `src/data/rotationSourceFacts.json`의 3개 `factualRecordSha256` 값(`8c5d91f44e70a3b9711e5d6b7c823a1940f2e1d5c6b7a809123456789abcdef0` 등)은 `123456789abcdef0` 형태의 수기 플레이스홀더 16진수 문자열로, 실제 `factualRecord`의 canonical JSON SHA-256(`8ac9017bf623716f7101f449ff81c1a9f10b842b62169d3f3c3e3bb1417d9a15` 등)과 일치하지 않습니다.
  3. **Track I6(`shoulderSupportSourceLedger.json`) 정적 SVG 매니페스트 누락**:
     - `public/images/movement-guides/shoulder-support-push-up-guide.svg`(SHA-256 `6c4b19cd...`) 및 `shoulder-support-leg-pull-front-guide.svg`(SHA-256 `8bc47f74...`)의 실제 파일 해시는 `shoulderSupportSourceLedger.json`의 `authoredSvgAssets` 기록과 정확히 일치하지만, `public/images/movement-guides/MANIFEST.json`(5개 기구 가이드만 수록, `src/test/movementVisualGuide.test.tsx:114`에서 길이 5로 고정 검증)이나 별도 `shoulder-support-manifest.json` 파일에는 등록되어 있지 않습니다.

### [우선순위 3] ID 접두사(`ex-*`) 기반 출처 분류와 `getExerciseEvidence`의 미확인 사유(`youtube.note`) 유실 (Medium)
- **정확한 소유 파일**:
  - `src/data/movementProvenance.ts` (L50-58 `getMovementProvenance`, L60-72 `getMovementVideoLink`)
  - `src/utils/exerciseEvidence.ts` (L191-210 `resolveSourceState`, L219-280 `getExerciseEvidence`)
  - `src/data/pilatesCatalog.ts` (`ex-warmup-01`, `ex-footwork-02`, `ex-cooldown-02`, `ex-core-04`, `ex-lower-04`)
- **재현 증거**:
  - `getMovementProvenance(exercise)`는 `exercise.id.startsWith('original-')` 여부만으로 출처 종류를 판정하여 38개 `ex-*` 전체를 무조건 `kind: 'legacy'`(`기존 카탈로그 항목 · 개별 외부 영상 미연결`)로 분류합니다(실제로는 33개가 oEmbed 검증된 YouTube 링크를 보유).
  - 반면 `getExerciseEvidence(exercise)`는 `ex-warmup-01` 등 기존 미검증 영상이 제거된 5개 항목(`channelName: '자료 미확인'`, `verified: false`, `youtube.note: '기존 카탈로그의 유튜브 ID가 공개 oEmbed로 확인되지 않아...'`)을 처리할 때, `hasMeaningfulChannel`이 `false`이므로 `source.kind: 'none'`, `source.label: '외부 출처 미등록'`, `source.detail: '등록된 외부 영상 또는 공식 참고문헌 링크가 없습니다.'`로 덮어쓰며 `exercise.youtube.note`에 기록된 삭제·미확인 경위 메타데이터를 `ExerciseEvidence.source`에서 누락시킵니다.

### [우선순위 4] `getVisualSourceComparison` 및 `resolveMovementMediaBundle`의 카테고리·키워드 휴리스틱 폴백 연결 (Medium)
- **정확한 소유 파일**:
  - `src/data/movementVisualSourceAudit.ts` (L195-375 `selectVerifiedReferencesForExercise`, L450-544 `getVisualSourceComparison`)
  - `src/utils/movementMediaMatcher.ts` (L740-947 `getMatchedPublicSourcesForExercise`, `resolveMovementMediaBundle`)
  - `src/data/verifiedReferences.ts` (L68-735 `VERIFIED_REFERENCES`)
  - `src/data/exerciseYouTubeCatalog.ts` (L245-387 `getRelatedYouTubeVideosForMotion`)
- **재현 증거**:
  - `VERIFIED_REFERENCES` 30개 항목 중 고유 URL은 25개이며, Merrithew 공식 스토어 URL(`https://www.merrithew.com/shop/pilates-equipment`) 1개가 `mv-05`, `mv-06`, `mv-07`, `mv-10`, `mv-17` 총 **5개** 항목에 중복 사용되고, 초 단위 `observationPoints`는 `mv-01`~`mv-03` **3개** 항목에만 존재합니다(나머지 27개는 빈 배열 `[]`).
  - `getVisualSourceComparison(exercise)`는 카탈로그에 없는 임의의 합성 매트 동작(`id: 'ex-synthetic-unmapped-mat'`, `nameKo: '존재하지 않는 합성 매트 동작'`)을 입력하더라도 `apparatus === 'mat'` 및 `blockCategory === 'warmup'` 조건만으로 `kr-08`, `kr-09`, `kr-02` 등 4개의 참고자료를 `matchedReliableSources`로 자동 배정합니다. 따라서 `matchedReliableSources`는 개별 동작의 1:1 원전 입증이 아니라 기구·블록 단위의 교육 참고자료 매칭임을 유의해야 합니다.

### [우선순위 5] 영구 카탈로그 ID 슬러그(`ex-global-reformer-02`)와 실제 기구 메타데이터(`apparatus: 'mat'`) 간 명칭 불일치 (Low)
- **정확한 소유 파일**:
  - `src/data/pilatesCatalog.ts` (L408-451 `ex-global-reformer-02`)
  - `src/data/motionReferences.ts` (L1070-1079 `ex-global-reformer-02`)
  - `src/data/movementVisualRigCatalog.ts` (`getMovementVisualAsset('ex-global-reformer-02')`)
- **재현 증거**:
  - `INITIAL_EXERCISES`의 `ex-global-reformer-02`는 ID 슬러그에 `reformer`가 포함되어 있으나, 실제 데이터는 `apparatus: 'mat'`, `nameKo: '[해외 BASI] Flow with Mira 15분 코르셋 딥코어 & 척추 분절 루틴'`, `nameEn: '15 Min Pilates Corset Abs Workout (Deep Core & Spinal Articulation)'`, `youtube.videoId: 'j911k126s9M'`으로 매트 운동입니다.
  - 하위 호환성(클라우드 백업·시퀀스 저장 ID 보존)을 위해 영구 ID는 변경하지 않으나, ID 문자열(`reformer`)만으로 기구를 추정하는 외부 스크립트나 필터를 작성할 경우 오분류 위험이 존재합니다.

---

## 4. 타 감사 트랙과의 중복 보류 내역 (Overlap Hold)

- **`docs/legal-compliance-audit-20261108`**: 상표권·저작권·의료기기법/건강정보 비보증 문구 전반 감사는 해당 트랙에서 수행되었으므로, 본 P7/추가14 감사에서는 모션 모델 라이선스 파일(`src/models/*-LICENSE.txt`)과 도해 생성 경계(`DEFAULT_SUBJECTIVE_SAFETY_BOUNDARY`)만 범위 내 확인했습니다.
- **`docs/data-integrity-audit-20261108`**: 카탈로그 스키마 및 클라우드 백업 무결성 감사는 해당 트랙에서 다루므로, 본 감사에서는 모션 출처 원장(`*Ledger.json`, `motionStudyLedger.json`)과 이름 매핑(`ex-global-reformer-02`)만 다루고 중복 영역은 보류했습니다.
- **`docs/external-dependency-audit-20261108`**: YouTube `youtube-nocookie.com` CSP/임베드 네트워크 정책 감사는 해당 트랙에서 다루므로, 본 감사에서는 oEmbed 출처 메타데이터와 비디오 ID 풀(`VERIFIED_YOUTUBE_VIDEO_POOL`)의 출처 추적만 수행했습니다.

---

## 5. 재현 및 검증 명령 (Verification Commands)

```bash
# 1. [P7/추가14] 읽기 전용 모션 출처 감사 및 합성 데이터 검증 스위트 실행
node node_modules/vitest/vitest.mjs run src/test/motionProvenanceAudit.test.ts

# 2. 모션 스터디 SHA-256 원장 무결성 체크 (22 entries, sha256: 0ff99f03...)
node scripts/generate-motion-study-ledger.mjs --check

# 3. 시크릿/개인정보 유출 검사
node scripts/check-secrets.mjs
```
