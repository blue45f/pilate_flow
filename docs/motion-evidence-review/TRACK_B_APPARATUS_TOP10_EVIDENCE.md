# Track B — 기구(Apparatus: Reformer · Cadillac · Chair · Barrel) 상위 10종 도해 근거 검증 보고서

- **소유 경로**: `src/features/motionEvidenceReview/trackBApparatusEvidence.ts`, `docs/motion-evidence-review/TRACK_B_APPARATUS_TOP10_EVIDENCE.md`
- **검증 대상**: `INITIAL_EXERCISES`(`src/data/pilatesCatalog.ts`) 내 `apparatus !== 'mat'`(리포머 5종 · 캐딜락 2종 · 체어 2종 · 바렐 1종) 상위 10종
- **Track A(매트 상위 10종)와의 ID 중복**: **0건** (`zeroTrackIdOverlap: true`)
- **원칙 준수**:
  - 외부 이미지·미디어 무단 다운로드 없음 (`rightsPolicy: 'link-only-no-download'`)
  - 유료 API·비밀키·결제 설정 사용 없음
  - 근거 없는 관절 각도(°), 근활성도(EMG %), 의학적 안전 보장 문구 없음
  - `canonicalMotionReady: false`, `manualReady: false`, `true3dSupported: false`, `anatomicalVerificationCompleted: false`, `expertVerificationCompleted: false` 유지

---

## 1. Track B 기구 상위 10종 요약 표

| 순번 | 동작 ID (`exerciseId`) | 한글명 / 영문명 | 기구 / 자세 | 척추 면 (`spinalPlanes`) | 2D Rig 아키타입 (`targetVisualAssetId`) | 연속 초안 (`targetPatternVariantIds`) | 출처 검증 상태 | 핵심 도해·기구 불일치 요약 |
| :---: | :--- | :--- | :---: | :---: | :--- | :--- | :--- | :--- |
| 1 | `original-reformer-parallel-footwork` | 패럴렐 풋워크 (`Parallel Footwork`) | `reformer` / `supine` | `['neutral']` | `reformer-supine-footwork` | `['reformer-parallel-footwork']` | 저장소 SHA-256 원장 + 공개 검색 스니펫 | 2D rig `start`->`middle` 하지 분절 길이 미세 표류(`106.7px -> 110.3px`); 연속 초안은 뒤꿈치 접촉 단일 발목 각도만 구현 |
| 2 | `original-reformer-supine-arm-press` | 누워서 스트랩 암 프레스 (`Supine Strap Arm Press`) | `reformer` / `supine` | `['neutral']` | `supine-strap-arm-press` | `['reformer-supine-strap-arm-press']` | 저장소 SHA-256 원장 + 프록시 제한 1건 | 카탈로그는 `"양발을 지지한 상태"`이나 도해/초안은 공중 테이블탑 + 발목 볼(`mismatched`); 2D rig에서 캐리지(`2 -> 24px`)만 움직이고 몸통(`Δx=0`)은 고정 |
| 3 | `original-reformer-strap-frog` | 스트랩 프로그 준비 (`Feet in Straps Frog Preparation`) | `reformer` / `supine` | `['neutral']` | `supine-feet-in-straps` | `[]` (미구현) | 저장소 SHA-256 원장 + 프록시 제한 1건 | 2D rig `end` 단계가 무릎 굴곡(프로그 복귀)이 아닌 무릎을 편 천장 리프트(Leg Circle, `ankle y:40`); 캐리지 이동 시 몸통 고정 |
| 4 | `ex-plank-01` | 리포머 롱 스트레치 & 엘리펀트 / 니 스트레치 (`Reformer Long Stretch, Elephant & Knee Stretch Series`) | `reformer` / `quadruped` | `['neutral', 'flexion']` | `plank-long-stretch-chair-pike` | `[]` (미구현) | 저장소 SHA-256 원장 + 프록시 제한 1건 | 리포머 SVG 도식은 풋바가 오른쪽(`x:278~288`)인데 2D rig는 손이 왼쪽(`x:88~96`), 발이 오른쪽(`x:280`)에 배치되어 손·발 기구 위치가 정반대로 역전 |
| 5 | `ex-extension-01` | 리포머 롱박스 풀링 스트랩 & 티-스트랩 스완 (`Long Box Pulling Straps I & II`) | `reformer` / `prone` | `['extension']` | `prone-swan-pulling-straps-swimming` | `[]` (미구현) | 저장소 SHA-256 원장 + 프록시 제한 1건 | `MovementPhaseDiagramSvg.tsx`에 롱박스(Long Box)가 렌더링되지 않고 캐리지 이동(`2 -> 34px`) 시 신체(`pelvis x:186`)가 고정됨 |
| 6 | `original-cadillac-arm-spring-press` | 누워서 암 스프링 프레스 (`Supine Arm Spring Press`) | `cadillac` / `supine` | `['neutral']` | `supine-strap-arm-press` | `['cadillac-supine-arm-spring-press']` | 저장소 SHA-256 원장 + 프록시 제한 1건 | 고정 테이블인 캐딜락에 `carriageOffsetPx: 2 -> 24 -> 4`가 들어가고, 2D rig(테이블탑 다리+편 팔)와 연속 초안(바닥 발 지지+굽힌 팔)이 불일치 |
| 7 | `ex-bridging-02` | 캐딜락 타워 바 파라키트 & 숄더 브릿지 (`Cadillac Tower Bar Shoulder Bridge & Parakeet Prep`) | `cadillac` / `supine` | `['flexion', 'extension']` | `supine-articulated-bridge` | `[]` (미구현) | 저장소 SHA-256 원장 + 프록시 제한 1건 | 타워 바(푸시스루 바)에 발을 걸어야 하나 2D rig 발(`heel y:148`)은 바닥에 있고, 도식의 푸시스루 바는 머리 왼쪽(`x:86`)에 고정됨 |
| 8 | `original-chair-seated-pedal-press` | 체어 양발 페달 프레스 (`Seated Double-Leg Pedal Press`) | `chair` / `seated` | `['neutral']` | `chair-seated-pedal-footwork` | `['chair-seated-pedal-press']` | 저장소 SHA-256 원장 + 프록시 제한 1건 | `MovementPhaseDiagramSvg.tsx`(183행)의 `pedalTipY = 162 - Math.sin(rad)*52` 부호 오류로 `middle`에서 발은 내려가고(`y:142->174`) 페달은 위로 올라감(`y:154.8->131.4`, 42.6px 분리) |
| 9 | `ex-plank-02` | 운다 체어 파이크(Pike) & 플랭크 풀업 (`Wunda Chair Pull-Up (Pike) & Scapular Plank`) | `chair` / `standing` | `['flexion', 'neutral']` | `plank-long-stretch-chair-pike` | `[]` (미구현) | 저장소 SHA-256 원장 + 프록시 제한 1건 | 2D rig 손목(`96,144`)이 체어 시트 상판(`y:122`) 아래 허공에 있고, 발목(`x:280->242`)이 페달 끝(`x:200`)에서 40~80px 오른쪽으로 이탈 |
| 10 | `original-barrel-standing-hip-extension` | 래더 지지 힙 익스텐션 (`Ladder Supported Hip Extension`) | `barrel` / `standing` | `['neutral']` | `standing-scooter-lunge-splits` | `['ladder-supported-hip-extension-slide']` | 저장소 SHA-256 원장 + 공개 검색 스니펫 | 2D rig 인체(`x:124~278`)가 래더 바깥이 아닌 바렐 돔(`x:122~246`) 내부를 관통하여 서 있음; 연속 초안은 일반 지지 운동의 저작 적응본 |

---

## 2. 동작별 상세 근거 및 사실/추론/미검증 대조

### B-01. `original-reformer-parallel-footwork` — 패럴렐 풋워크 (`Parallel Footwork`)
- **공개 교육 근거 URL**:
  1. Buckinghamshire Healthcare NHS Trust: `https://www.buckshealthcare.nhs.uk/wp-content/uploads/2020/11/physiotherapy-exercises-after-a-total-knee-replacement.pdf` (`verified-in-repo-source-ledger`)
  2. BASI Pilates — *Reformer Footwork Fundamentals*: `https://www.basipilates.com/blog/reformer-footwork-fundamentals/` (`verified-via-public-search-snippet`)
- **3단계 생체역학 근거**:
  - **시작(`start`)**: 리포머 캐리지에 바로 누워(Supine) 후두부·견갑골·천골을 중립 정렬하고 양발을 골반 너비 평행으로 풋바에 지지. 들쉬며(Inhale) 코어 준비.
  - **중간(`middle`)**: 내쉬며(Exhale) 양발로 풋바를 밀어 무릎·고관절을 신전하고 캐리지를 수평 활주(무릎 과신전 잠금 금지).
  - **종료(`end`)**: 조절 호흡으로 스프링 복원력을 제어하며 고관절·무릎을 굴곡해 스토퍼 직전까지 소음 없이 복귀.
- **기존 초안 대조 (`fact` / `inference` / `unverified`)**:
  - **사실(`fact`)**: `reformer-supine-footwork` 2D rig는 발목(`278,132`)을 풋바에 고정하고 `middle`에서 몸통·골반을 44px 왼쪽으로 이동시키며, 연속 초안(`reformer-parallel-footwork`)은 2-bone IK로 캐리지 이동을 계산한다.
  - **추론(`inference`)**: 2D rig `start` 대비 `middle`에서 대퇴+하퇴 길이 합이 약 3.6px 늘어나는 것은 수동 좌표 지정에 따른 분절 길이 오차이다.
  - **미검증/불일치(`unverified`)**: 연속 초안은 발목 벡터가 고정되어 발볼·아치·뒤꿈치 접촉점 전환은 표현하지 않으며 기구 치수는 제작 가정 상태이다.

### B-02. `original-reformer-supine-arm-press` — 누워서 스트랩 암 프레스 (`Supine Strap Arm Press`)
- **공개 교육 근거 URL**:
  1. Oxford University Hospitals NHS Foundation Trust: `https://www.ouh.nhs.uk/media/022n23fb/107625exercises.pdf` (`verified-in-repo-source-ledger`)
  2. Pilates Anytime — *Supine Arm Work on the Reformer*: `https://www.pilatesanytime.com/pilates-exercises/reformer/supine-arm-work` (`blocked-by-sandbox-proxy-unverified`)
- **3단계 생체역학 근거**:
  - **시작(`start`)**: 리포머 캐리지에 바로 누워 양손으로 핸드 스트랩을 어깨 위 수직으로 뻗고 천골과 흉곽을 중립 고정.
  - **중간(`middle`)**: 내쉬며(Exhale) 손목과 팔꿈치를 길게 유지한 채 스트랩을 골반 옆 캐리지 쪽으로 원호 하강시켜 견관절을 신전하고 캐리지를 이동.
  - **종료(`end`)**: 조절 호흡으로 어깨가 으쓱거리지 않게 통제하며 양손을 어깨 수직선 위로 복귀.
- **기존 초안 대조 (`fact` / `inference` / `unverified`)**:
  - **사실(`fact`)**: 카탈로그 큐는 `"양발을 지지한 상태에서"`이나 2D rig(`supine-strap-arm-press`)와 연속 초안(`reformer-supine-strap-arm-press`)은 공중 테이블탑 다리(연속 초안은 발목 사이 볼 포함)를 그린다. 또한 2D rig에서 `carriageOffsetPx`는 `2 -> 24 -> 4`로 변하나 신체 좌표(`head x:54, pelvis x:184`)는 고정되어 있다.
  - **추론(`inference`)**: 2D rig에서 캐리지 사각형만 움직이고 몸통이 고정되면 캐리지 위에서 몸이 미끄러지는 물리적 모순이 생긴다.
  - **미검증/불일치(`unverified`)**: 카탈로그(양발 지지) vs 도해/초안(테이블탑+볼) 불일치 및 2D rig 캐리지-신체 분리 이동 오류.

### B-03. `original-reformer-strap-frog` — 스트랩 프로그 준비 (`Feet in Straps Frog Preparation`)
- **공개 교육 근거 URL**:
  1. BASI Pilates — *Feet in Straps on the Reformer*: `https://www.basipilates.com/blog/feet-in-straps-on-the-reformer/` (`blocked-by-sandbox-proxy-unverified`)
  2. Cambridge University Hospitals NHS Foundation Trust: `https://www.cuh.nhs.uk/patient-information/pilates-exercises-and-principles/` (`verified-in-repo-source-ledger`)
- **3단계 생체역학 근거**:
  - **시작(`start`)**: 리포머에 바로 누워 양발 아치에 스트랩을 걸고 천골을 매트에 고정한 채 뒤꿈치를 붙이고 무릎을 굽힌 프로그 준비 자세.
  - **중간(`middle`)**: 내쉬며(Exhale) 천골 중립을 유지한 채 뒤꿈치를 붙여 무릎과 고관절을 전방 사선으로 신전.
  - **종료(`end`)**: 들쉬며(Inhale) 꼬리뼈가 뜨지 않게 제어하며 무릎을 다시 굽혀 프로그 시작 자세로 복귀.
- **기존 초안 대조 (`fact` / `inference` / `unverified`)**:
  - **사실(`fact`)**: 2D rig(`supine-feet-in-straps`)의 `end` 단계는 무릎을 다시 접는 프로그 복귀가 아니라 무릎을 편 채 천장으로 다리를 들어 올리는 Leg Circle 상방 리프트(`ankle: 222,40`)로 그려져 있다.
  - **추론(`inference`)**: Frog와 Leg Circles를 단일 아키타입에 합치면서 `end` 단계가 왜곡되었다.
  - **미검증/불일치(`unverified`)**: `original-reformer-strap-frog`의 `end` 단계 다리 자세 불일치 및 연속 모션 초안 미구현.

### B-04. `ex-plank-01` — 리포머 롱 스트레치 & 엘리펀트 / 니 스트레치 (`Reformer Long Stretch, Elephant & Knee Stretch Series`)
- **공개 교육 근거 URL**:
  1. Pilatesology — *Reformer Long Stretch Series*: `https://pilatesology.com/blog/long-stretch-series/` (`blocked-by-sandbox-proxy-unverified`)
  2. Cambridge University Hospitals NHS Foundation Trust: `https://www.cuh.nhs.uk/patient-information/pilates-exercises-and-principles/` (`verified-in-repo-source-ledger`)
- **3단계 생체역학 근거**:
  - **시작(`start`)**: 양손으로 풋바를 잡고 세워진 헤드레스트/숄더블록에 양발을 지지하여 플랭크(Long Stretch) 또는 업 스트레치/엘리펀트 정렬 세팅.
  - **중간(`middle`)**: 플랭크 라인 그대로 견관절 굴곡으로 캐리지를 밀었다 당기거나(Long Stretch), 고관절 굴곡·하복부 스쿱으로 캐리지를 끌어당김(Elephant).
  - **종료(`end`)**: 코어 제어로 플랭크/시작 위치로 감속 복귀.
- **기존 초안 대조 (`fact` / `inference` / `unverified`)**:
  - **사실(`fact`)**: `MovementPhaseDiagramSvg.tsx`의 리포머 도식은 풋바가 오른쪽(`x:278~288`), 헤드레스트가 왼쪽(`x:42~72`)인데, `plank-long-stretch-chair-pike` 2D rig는 손을 왼쪽(`wrist x:96`), 발을 오른쪽(`ankle x:280`)에 두어 손·발 기구 접촉 위치가 정반대이다.
  - **추론(`inference`)**: 체어 파이크 좌표를 리포머에 좌우 반전 없이 재사용하여 발생한 방향 오류이다.
  - **미검증/불일치(`unverified`)**: `ex-plank-01`의 손(풋바)과 발(헤드레스트) 기구 방향 역전(`mismatched`).

### B-05. `ex-extension-01` — 리포머 롱박스 풀링 스트랩 & 티-스트랩 스완 (`Long Box Pulling Straps I & II`)
- **공개 교육 근거 URL**:
  1. Pilatesology — *Pulling Straps I & II*: `https://pilatesology.com/blog/pulling-straps/` (`blocked-by-sandbox-proxy-unverified`)
  2. Cambridge University Hospitals NHS Foundation Trust: `https://www.cuh.nhs.uk/patient-information/pilates-exercises-and-principles/` (`verified-in-repo-source-ledger`)
- **3단계 생체역학 근거**:
  - **시작(`start`)**: 캐리지 위 롱박스에 가슴 앞쪽이 박스 앞 모서리에 걸치도록 엎드려(Prone) 양손으로 로프/스트랩을 잡고 다리를 길게 뻗어 지지.
  - **중간(`middle`)**: 들쉬며(Inhale) 스트랩을 골반 옆(또는 T자 수평)으로 당기며 경추-상부 흉추 순으로 신전하여 캐리지를 활주.
  - **종료(`end`)**: 내쉬며(Exhale) 척추 길이를 유지한 채 상체와 팔을 시작 자세로 복귀.
- **기존 초안 대조 (`fact` / `inference` / `unverified`)**:
  - **사실(`fact`)**: `MovementPhaseDiagramSvg.tsx`의 리포머 도식에 롱박스가 렌더링되지 않아 골반(`y:142`)이 낮은 캐리지(`y:144`)에 직접 닿아 있고, `carriageOffsetPx`(`2 -> 34 -> 4`) 이동 시 몸통 좌표는 고정되어 있다.
  - **추론(`inference`)**: 롱박스 높이 생략으로 인해 박스 모서리 밖으로 상체와 팔이 내려가는 시작 각도가 표현되지 않는다.
  - **미검증/불일치(`unverified`)**: 롱박스 도형 누락 및 캐리지 활주 시 신체 고정 오류.

### B-06. `original-cadillac-arm-spring-press` — 누워서 암 스프링 프레스 (`Supine Arm Spring Press`)
- **공개 교육 근거 URL**:
  1. Oxford University Hospitals NHS Foundation Trust: `https://www.ouh.nhs.uk/media/022n23fb/107625exercises.pdf` (`verified-in-repo-source-ledger`)
  2. Pilates Anytime — *Cadillac Arm Springs*: `https://www.pilatesanytime.com/pilates-exercises/cadillac/arm-springs` (`blocked-by-sandbox-proxy-unverified`)
- **3단계 생체역학 근거**:
  - **시작(`start`)**: 캐딜락 고정 테이블에 바로 누워 양 무릎을 굽혀 발을 테이블에 지지하고 양손으로 암 스프링 핸들을 파지.
  - **중간(`middle`)**: 내쉬며(Exhale) 흉곽 들림과 어깨 말림을 억제하며 양팔을 몸 옆 테이블 방향으로 내려 스프링 신장.
  - **종료(`end`)**: 조절 호흡으로 스프링 복원력을 제어하며 시작 높이로 복귀.
- **기존 초안 대조 (`fact` / `inference` / `unverified`)**:
  - **사실(`fact`)**: 2D rig(`supine-strap-arm-press`)는 다리가 테이블탑으로 떠 있고 고정 테이블인 캐딜락임에도 `carriageOffsetPx: 2 -> 24 -> 4`를 가지며, 연속 초안(`cadillac-supine-arm-spring-press`)은 발을 테이블에 내려놓고 팔꿈치를 굽혀(`elbowBend: 0.21`) 내린다.
  - **추론(`inference`)**: `movementVisualRigCatalog.ts`(4327행)의 `isCarriageApparatus` 조건에 `cadillac`이 잘못 포함되어 `carriageOffsetPx`가 부여되었다.
  - **미검증/불일치(`unverified`)**: 캐딜락 고정 테이블의 비정상 `carriageOffsetPx` 및 2D rig vs 연속 초안 간 다리·팔꿈치 자세 불일치.

### B-07. `ex-bridging-02` — 캐딜락 타워 바 파라키트 & 숄더 브릿지 (`Cadillac Tower Bar Shoulder Bridge & Parakeet Prep`)
- **공개 교육 근거 URL**:
  1. Pilatesology — *Tower on the Cadillac*: `https://pilatesology.com/blog/tower-on-the-cadillac/` (`blocked-by-sandbox-proxy-unverified`)
  2. Oxford University Hospitals NHS Foundation Trust: `https://www.ouh.nhs.uk/media/022n23fb/107625exercises.pdf` (`verified-in-repo-source-ledger`)
- **3단계 생체역학 근거**:
  - **시작(`start`)**: 캐딜락 테이블에 바로 누워 하단 스프링과 안전 스트랩이 체결된 공중 푸시스루 바(타워 바)에 양발 아치를 걸어 지지.
  - **중간(`middle`)**: 내쉬며(Exhale) 발볼/아치로 타워 바를 수직으로 밀어 올리며 척추를 분절해 숄더 브리지 정점으로 올라가고 무릎 굴신(Parakeet) 연결.
  - **종료(`end`)**: 내쉬며(Exhale) 상부 흉추부터 천골까지 테이블 매트에 순차 분절 하강.
- **기존 초안 대조 (`fact` / `inference` / `unverified`)**:
  - **사실(`fact`)**: 공유 2D rig(`supine-articulated-bridge`)는 매트 브리지 좌표를 그대로 써서 양발(`heel y:148`)이 공중 타워 바가 아닌 바닥에 놓여 있으며, 도식의 푸시스루 바는 머리 왼쪽(`x:86`)에 고정되어 있다.
  - **추론(`inference`)**: 매트 브리지 아키타입 재사용으로 인해 타워 바 상방 발 지지가 누락되었다.
  - **미검증/불일치(`unverified`)**: `ex-bridging-02`의 타워 바 발 위치(`y:148` 바닥) 불일치.

### B-08. `original-chair-seated-pedal-press` — 체어 양발 페달 프레스 (`Seated Double-Leg Pedal Press`)
- **공개 교육 근거 URL**:
  1. Buckinghamshire Healthcare NHS Trust: `https://www.buckshealthcare.nhs.uk/wp-content/uploads/2020/11/physiotherapy-exercises-after-a-total-knee-replacement.pdf` (`verified-in-repo-source-ledger`)
  2. Pilates Anytime — *Wunda Chair Footwork*: `https://www.pilatesanytime.com/pilates-exercises/wunda-chair/footwork` (`blocked-by-sandbox-proxy-unverified`)
- **3단계 생체역학 근거**:
  - **시작(`start`)**: 운다 체어 시트 위에 양 좌골을 수직 고정하여 앉고 상단 페달 위에 양발을 올려 무릎·고관절 굴곡 준비.
  - **중간(`middle`)**: 내쉬며(Exhale) 상체 수직 정렬을 유지한 채 양발로 페달을 아래쪽으로 밟아 내려 고관절·무릎 신전.
  - **종료(`end`)**: 조절 호흡으로 스프링 상승력을 제어하며 페달과 무릎을 시작 높이로 복귀.
- **기존 초안 대조 (`fact` / `inference` / `unverified`)**:
  - **사실(`fact`)**: 2D rig(`chair-seated-pedal-footwork`)에서 `middle` 단계 발뒤꿈치는 아래로 내려가나(`heel y: 142 -> 174`), `MovementPhaseDiagramSvg.tsx`(183행)는 `pedalTipY = 162 - Math.sin(rad) * 52`를 계산해 `pedalAngleDeg`(`8 -> 36`) 증가 시 페달 막대가 위쪽(`y: 154.8 -> 131.4`)으로 올라가 버린다(발과 페달 끝이 42.6px 분리).
  - **추론(`inference`)**: SVG `+y` 하방 좌표계에서 `- Math.sin(rad)` 부호를 잘못 사용해 페달 회전 방향이 상하 반전된 버그이다.
  - **미검증/불일치(`unverified`)**: `MovementPhaseDiagramSvg.tsx` 체어 페달 회전 부호 반전 버그 수정 필요.

### B-09. `ex-plank-02` — 운다 체어 파이크(Pike) & 플랭크 풀업 (`Wunda Chair Pull-Up (Pike) & Scapular Plank`)
- **공개 교육 근거 URL**:
  1. Pilatesology — *Pull-Up on the Wunda Chair*: `https://pilatesology.com/blog/pull-up-on-the-wunda-chair/` (`blocked-by-sandbox-proxy-unverified`)
  2. Cambridge University Hospitals NHS Foundation Trust: `https://www.cuh.nhs.uk/patient-information/pilates-exercises-and-principles/` (`verified-in-repo-source-ledger`)
- **3단계 생체역학 근거**:
  - **시작(`start`)**: 양손으로 체어 시트 앞 모서리를 짚고 어깨를 손목 위에 둔 채 양발 볼을 페달 위에 올려 지지.
  - **중간(`middle`)**: 내쉬며(Exhale) 양손으로 시트를 밀고 하복부를 천장으로 깊게 끌어올려(Pike Up) 골반과 페달을 함께 상승시킴.
  - **종료(`end`)**: 들쉬며(Inhale) 코어 브레이크를 유지하며 페달을 천천히 컨트롤 하강.
- **기존 초안 대조 (`fact` / `inference` / `unverified`)**:
  - **사실(`fact`)**: 공유 2D rig(`plank-long-stretch-chair-pike`)에서 손목(`96,144`)은 체어 시트 상판(`y:122`)보다 22px 아래 허공에 있고, 발목(`x:280 -> 242`)은 페달 끝(`x: 약 200`)에서 오른쪽으로 40~80px 떨어진 바닥 허공에서 움직인다.
  - **추론(`inference`)**: 긴 리포머/매트 플랭크 좌표를 폭이 좁은 체어 도식에 그대로 겹쳐 그리면서 손·발 앵커가 모두 기구에서 이탈했다.
  - **미검증/불일치(`unverified`)**: `ex-plank-02`의 체어 시트 손 지지점 및 페달 발 지지점 이탈(`mismatched`).

### B-10. `original-barrel-standing-hip-extension` — 래더 지지 힙 익스텐션 (`Ladder Supported Hip Extension`)
- **공개 교육 근거 URL**:
  1. NHS inform (Scottish National Health Information Service): `https://www.nhsinform.scot/illnesses-and-conditions/muscle-bone-and-joints/exercises/exercises-for-hip-problems/` (`verified-in-repo-source-ledger`)
  2. Royal United Hospitals Bath NHS Foundation Trust: `https://www.ruh.nhs.uk/patients/patient_information/PHY091_Gluteal_Tendinopathy.pdf` (`verified-via-public-search-snippet`)
- **3단계 생체역학 근거**:
  - **시작(`start`)**: 래더 바렐의 고정된 래더 바깥쪽 바닥에 서서 양손으로 래더 상단 가로대를 가볍게 잡고 척추·골반 중립 세팅.
  - **중간(`middle`)**: 내쉬며(Exhale) 허리가 꺾이지 않게 복부를 지지한 채 한 발을 뒤로 짧게 뻗어 고관절 신전.
  - **종료(`end`)**: 조절 호흡으로 다리를 지지 발 옆 시작 위치로 회수.
- **기존 초안 대조 (`fact` / `inference` / `unverified`)**:
  - **사실(`fact`)**: `MovementPhaseDiagramSvg.tsx`(case `barrel`)에서 래더는 왼쪽(`x:58~82`), 바렐 돔은 오른쪽(`x:122~246`)인데, 공유 2D rig(`standing-scooter-lunge-splits`)의 인체(`x:124~278`)가 바렐 돔 내부를 관통하여 서 있다. 연속 초안(`ladder-supported-hip-extension-slide`)은 인체를 래더 뒤(`HIP_Z = -0.78`)에 올바르게 배치하나 일반 지지 운동의 저작 적응본이다.
  - **추론(`inference`)**: 리포머 스쿠터 좌표를 바렐 도식 위에 오프셋 조정 없이 겹쳐 그린 결과이다.
  - **미검증/불일치(`unverified`)**: `standing-scooter-lunge-splits` 바렐 렌더링 시 인체-바렐 돔 관통 충돌 오류.
