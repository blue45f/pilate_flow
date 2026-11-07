# Track A — 매트(Mat) 기본 동작 상위 10종 도해 근거 검증 보고서

- **소유 경로**: `src/features/motionEvidenceReview/trackAMatEvidence.ts`, `docs/motion-evidence-review/TRACK_A_MAT_TOP10_EVIDENCE.md`
- **검증 대상**: `INITIAL_EXERCISES`(`src/data/pilatesCatalog.ts`) 내 `apparatus: 'mat'` 기본 동작 상위 10종
- **Track B(기구 상위 10종)와의 ID 중복**: **0건** (`zeroTrackIdOverlap: true`)
- **원칙 준수**:
  - 외부 이미지·미디어 무단 다운로드 없음 (`rightsPolicy: 'link-only-no-download'`)
  - 유료 API·비밀키·결제 설정 사용 없음
  - 근거 없는 관절 각도(°), 근활성도(EMG %), 의학적 안전 보장 문구 없음
  - `canonicalMotionReady: false`, `manualReady: false`, `true3dSupported: false`, `anatomicalVerificationCompleted: false`, `expertVerificationCompleted: false` 유지

---

## 1. Track A 매트 상위 10종 요약 표

| 순번 | 동작 ID (`exerciseId`) | 한글명 / 영문명 | 자세 (`bodyPosition`) | 척추 면 (`spinalPlanes`) | 2D Rig 아키타입 (`targetVisualAssetId`) | 연속 초안 (`targetPatternVariantIds`) | 출처 검증 상태 | 핵심 도해 불일치 요약 |
| :---: | :--- | :--- | :---: | :---: | :--- | :--- | :--- | :--- |
| 1 | `original-mat-bridge` | 매트 브리지 (`Mat Bridge`) | `supine` | `['extension']` | `supine-articulated-bridge` | `['articulated-pelvic-curl']` | 저장소 SHA-256 원장 + 공개 검색 스니펫 | 2D rig `end`에서 흉추(`y:136`)·요추(`y:138`)가 `start`(`y:142`)로 완전 착지하지 않음; `spinalPlanes`에 분절 `flexion` 누락 |
| 2 | `original-mat-chest-lift` | 체스트 리프트 (`Chest Lift`) | `supine` | `['flexion']` | `supine-chest-lift-curl` | `['supine-chest-lift']` | 저장소 SHA-256 원장 + 공개 검색 스니펫 | 2D rig `middle`에서 발목이 공중 거상(`ankle y: 144 -> 116`)하고 양팔을 앞으로 뻗어(`hand x: 108 -> 196`) 후두부 지지 큐와 충돌 |
| 3 | `original-mat-single-leg-stretch` | 싱글 레그 스트레치 준비 (`Single Leg Stretch Preparation`) | `supine` | `['neutral']` | `supine-leg-stretch-hundred` | `['supine-single-leg-reach-v1']` | 저장소 SHA-256 원장 + 공개 검색 스니펫 | 2D rig가 Hundred 팔 펌핑 자세를 공유해 무릎 파지 누락; 연속 초안은 편측 단일 리치만 구현(좌우 교대 미구현, `mismatched`) |
| 4 | `original-mat-heel-slide` | 힐 슬라이드 (`Heel Slide`) | `supine` | `['neutral']` | `supine-heel-slide-ankle` | `['adult-supine-heel-slide']` | 저장소 SHA-256 원장 2건 완전 검증 | 2D rig `start` 대비 `middle`에서 정강이(`knee`~`ankle`) 분절 길이가 `50.1px -> 42.8px`(약 15%) 단축 |
| 5 | `original-mat-knee-fold` | 니 폴드 (`Alternating Knee Fold`) | `supine` | `['neutral']` | `supine-knee-fold` | `['supine-knee-fold']` | 저장소 SHA-256 원장 2건 완전 검증 | 연속 초안(`supine-knee-fold`)이 고관절만 단일 회전해 정점(`p=0.5`)에서 발목(`z:78.6`)이 무릎(`z:112`)보다 낮게 처짐 |
| 6 | `original-mat-side-leg-lift` | 옆으로 누워 다리 들기 (`Side-Lying Leg Lift`) | `side-lying` | `['neutral']` | `side-lying-leg-press-sweep` | `['side-lying-straight-leg-lift']` | 저장소 SHA-256 원장 + 공개 검색 스니펫 | 2D rig는 아래 다리 굴곡(`farKnee: 218,148`), 연속 초안은 아래 다리 신전 + 비카탈로그 `head-pad` 표시로 지지면 불일치 |
| 7 | `original-mat-clam` | 사이드 클램 (`Side-Lying Clam`) | `side-lying` | `['neutral']` | `side-lying-clam-open-book` | `['side-lying-clam']` | 저장소 SHA-256 원장 + 공개 검색 스니펫 | Open Book과 2D rig 공유로 인해 `middle`에서 무릎 거상과 동시에 상체·팔이 뒤로 회전(`hand: 176,136 -> 38,62`)하는 오류 |
| 8 | `original-mat-open-book` | 사이드 오픈 북 (`Side-Lying Open Book`) | `side-lying` | `['rotation']` | `side-lying-clam-open-book` | `['side-lying-open-book']` | 저장소 SHA-256 원장 + 공개 검색 스니펫 | Clam과 2D rig 공유로 인해 `middle`에서 고정되어야 할 위쪽 무릎이 `y: 152 -> 104`(48px)로 들리는 오류 |
| 9 | `original-mat-quadruped-reach` | 네발기기 팔·다리 리치 (`Quadruped Reach`) | `quadruped` | `['neutral']` | `quadruped-reach-slide` | `['quadruped-arm-slide', 'quadruped-leg-slide']` | 저장소 SHA-256 원장 2건 완전 검증 | 카탈로그 `standard`와 연속 초안은 단일 사지 바닥 슬라이드이나, 2D rig `middle`은 공중 대각선 Bird-Dog(`hand y:72, ankle y:82`) |
| 10 | `original-mat-swan-prep` | 매트 스완 준비 (`Mat Swan Preparation`) | `mat` / `prone` | `['extension']` | `prone-swan-pulling-straps-swimming` | `['prone-forearm-chest-extension-v1']` | 저장소 SHA-256 원장 + 프록시 제한 1건 | 2D rig `middle`에서 손이 골반 뒤로 크게 휘둘러지고(`hand x: 46 -> 184`) 발목이 들려(`y: 144 -> 128`) 전완/손 매트 지지 큐와 불일치 |

---

## 2. 동작별 상세 근거 및 사실/추론/미검증 대조

### A-01. `original-mat-bridge` — 매트 브리지 (`Mat Bridge`)
- **공개 교육 근거 URL**:
  1. Cambridge University Hospitals NHS Foundation Trust: `https://www.cuh.nhs.uk/patient-information/pilates-exercises-and-principles/` (`verified-in-repo-source-ledger`)
  2. Oxford University Hospitals NHS Foundation Trust: `https://www.ouh.nhs.uk/media/022n23fb/107625exercises.pdf` (`verified-in-repo-source-ledger`, SHA-256: `b308de7c8d6a0dd96ffef3bf9ab3e79dd81f1713ffba385bc649f3003ec3a4e2`)
  3. BASI Pilates — *Exercise Series: The Pelvic Curl*: `https://www.basipilates.com/blog/exercise-series-the-pelvic-curl/` (`verified-via-public-search-snippet`)
- **3단계 생체역학 근거**:
  - **시작(`start`)**: 바로 누워(Supine) 양 무릎을 굽혀 발바닥을 골반 너비 평행으로 매트에 지지, 골반·척추 중립, 양팔은 몸통 옆 지지. 호흡: 코로 들쉬며(Inhale) 준비.
  - **중간(`middle`)**: 내쉬며(Exhale) 골반 후방경사(Imprint)를 거쳐 꼬리뼈-요추-흉추 순으로 분절 거상하여 어깨-갈비뼈-골반-무릎 사선 정렬 유지(경추 체중 부하 금지, 양측 견갑골·양발 지지). 정점에서 들쉬며(Inhale) 유지.
  - **종료(`end`)**: 내쉬며(Exhale) 상부 흉추부터 요추·천골 순으로 분절 하강하여 골반 중립 시작 자세로 복귀.
- **기존 초안 대조 (`fact` / `inference` / `unverified`)**:
  - **사실(`fact`)**: `supine-articulated-bridge` 2D rig의 `start`는 `thoracic(110,142), lumbar(138,142), pelvis(164,142)`이나 `end`에서는 `thoracic(112,136), lumbar(138,138)`로 매트 바닥(`y:142`)에 완전히 내려오지 않는다.
  - **추론(`inference`)**: 분절 브리지(Pelvic Curl)는 요추 굴곡 분절이 필수이므로 카탈로그 `spinalPlanes`에 `['extension']` 외에 `'flexion'` 추가가 타당하다.
  - **미검증/불일치(`unverified`)**: `supine-articulated-bridge` `end` 프레임의 잔류 거상(`y:136~138`) 보정 필요.

### A-02. `original-mat-chest-lift` — 체스트 리프트 (`Chest Lift`)
- **공개 교육 근거 URL**:
  1. Cambridge University Hospitals NHS Foundation Trust: `https://www.cuh.nhs.uk/patient-information/pilates-exercises-and-principles/` (`verified-in-repo-source-ledger`)
  2. BASI Pilates — *Exercise Series: The Chest Lift*: `https://www.basipilates.com/blog/exercise-series-the-chest-lift/` (`verified-via-public-search-snippet`)
- **3단계 생체역학 근거**:
  - **시작(`start`)**: 바로 누워 양 무릎 굴곡·발바닥 매트 고정, 양손 깍지 끼어 후두부(머리 뒤) 지지, 골반 중립. 들쉬며(Inhale) 경추 길이 준비.
  - **중간(`middle`)**: 내쉬며(Exhale) 천골과 양발을 매트에 고정한 채 양손으로 머리를 받치고 견갑골 하각 부근까지 상부 흉추 굴곡. 정점에서 들쉬며(Inhale) 유지.
  - **종료(`end`)**: 내쉬며(Exhale) 후두부 손 지지를 유지한 채 흉추와 머리를 매트에 내려놓음.
- **기존 초안 대조 (`fact` / `inference` / `unverified`)**:
  - **사실(`fact`)**: `supine-chest-lift-curl` 2D rig는 `middle`에서 손을 앞으로 뻗고(`hand: 108,70 -> 196,94`) 발목까지 공중으로 들어 올린다(`ankle y: 144 -> 116`). 연속 초안(`supine-chest-lift`)도 팔을 앞으로 뻗는다.
  - **추론(`inference`)**: Roll-Up 및 Cadillac Teaser와 2D 아키타입을 공유하면서 Chest Lift의 양발 고정 및 후두부 손 지지 제약이 깨졌다.
  - **미검증/불일치(`unverified`)**: `supine-chest-lift-curl`의 발목 거상 및 팔 전방 리치는 카탈로그 큐(`"머리를 손으로 지지하고"`)와 명백히 불일치한다.

### A-03. `original-mat-single-leg-stretch` — 싱글 레그 스트레치 준비 (`Single Leg Stretch Preparation`)
- **공개 교육 근거 URL**:
  1. Pilatesology / *Return to Life Through Contrology* (Exercise #6): `https://pilatesology.com/blog/the-one-leg-stretch/` (`verified-via-public-search-snippet`)
  2. Cambridge University Hospitals NHS Foundation Trust: `https://www.cuh.nhs.uk/patient-information/pilates-exercises-and-principles/` (`verified-in-repo-source-ledger`)
- **3단계 생체역학 근거**:
  - **시작(`start`)**: 바로 누워 골반·천골을 매트에 안정화하고 다리를 테이블탑으로 들어 한쪽 무릎/정강이를 손으로 지지.
  - **중간(`middle`)**: 내쉬며(Exhale) 한쪽 다리는 테이블탑/가슴 쪽으로 유지하고 반대쪽 다리는 골반이 흔들리지 않는 사선으로 길게 뻗음.
  - **종료(`end`)**: 호흡과 함께 좌우 다리를 교대하여 회수한 뒤 시작 자세로 복귀.
- **기존 초안 대조 (`fact` / `inference` / `unverified`)**:
  - **사실(`fact`)**: 2D rig(`supine-leg-stretch-hundred`)는 Hundred와 공유되어 손이 정강이를 잡지 않고 골반 옆(`hand: 158,136 -> 168,128`)에 있으며, 연속 초안(`supine-single-leg-reach-v1`)은 한쪽 다리만 뻗고 좌우 교대가 없다(`motionAuthoringBatch.ts`에서 `mismatched`로 분류).
  - **추론(`inference`)**: 상체 컬업이 포함된 도해와 일치시키려면 카탈로그 `spinalPlanes`에 `'flexion'` 반영이 필요하다.
  - **미검증/불일치(`unverified`)**: `supine-single-leg-reach-v1`의 좌우 교대 누락 및 `supine-leg-stretch-hundred`의 손 위치 불일치.

### A-04. `original-mat-heel-slide` — 힐 슬라이드 (`Heel Slide`)
- **공개 교육 근거 URL**:
  1. Cambridge University Hospitals NHS Foundation Trust: `https://www.cuh.nhs.uk/patient-information/pilates-exercises-and-principles/` (`verified-in-repo-source-ledger`)
  2. Oxford University Hospitals NHS Foundation Trust: `https://www.ouh.nhs.uk/media/022n23fb/107625exercises.pdf` (`verified-in-repo-source-ledger`)
- **3단계 생체역학 근거**:
  - **시작(`start`)**: 바로 누워 양 무릎 굴곡·발바닥 매트 지지, 골반·요추 중립 고정.
  - **중간(`middle`)**: 내쉬며(Exhale) 골반과 요추 높이를 고정한 채 한쪽 뒤꿈치를 매트 바닥을 따라 미끄러뜨려 고관절·무릎 신전.
  - **종료(`end`)**: 내쉬며(Exhale) 뒤꿈치를 매트를 따라 당겨 시작 위치로 복귀.
- **기존 초안 대조 (`fact` / `inference` / `unverified`)**:
  - **사실(`fact`)**: `supine-heel-slide-ankle` 2D rig에서 정강이(`knee`~`ankle`) 길이가 `start`(`50.1px`)에서 `middle`(`42.8px`)로 약 15% 줄어든다.
  - **추론(`inference`)**: 수동 좌표 입력 과정에서 강체 분절 길이 보존 제약이 누락된 결과이다.
  - **미검증/불일치(`unverified`)**: `supine-heel-slide-ankle` `middle` 프레임의 정강이 길이 왜곡 보정 필요.

### A-05. `original-mat-knee-fold` — 니 폴드 (`Alternating Knee Fold`)
- **공개 교육 근거 URL**:
  1. Cambridge University Hospitals NHS Foundation Trust: `https://www.cuh.nhs.uk/patient-information/pilates-exercises-and-principles/` (`verified-in-repo-source-ledger`)
  2. Oxford University Hospitals NHS Foundation Trust: `https://www.ouh.nhs.uk/media/022n23fb/107625exercises.pdf` (`verified-in-repo-source-ledger`)
- **3단계 생체역학 근거**:
  - **시작(`start`)**: 바로 누워 양 무릎을 세우고 골반 중립 유지.
  - **중간(`middle`)**: 내쉬며(Exhale) 골반 흔들림 없이 한쪽 다리를 들어 무릎 위 정강이가 바닥과 수평인 테이블탑 유지.
  - **종료(`end`)**: 내쉬며(Exhale) 발바닥을 매트에 부드럽게 내려놓고 반대쪽 교대 준비.
- **기존 초안 대조 (`fact` / `inference` / `unverified`)**:
  - **사실(`fact`)**: 2D rig(`supine-knee-fold`)는 `middle`에서 수평 테이블탑(`knee y:92, ankle y:92`)을 그리나, 연속 초안(`supineDrafts.ts`의 `supine-knee-fold`)은 고관절 단일 회전만 적용해 정점(`p=0.5`)에서 발목(`z:78.6`)이 무릎(`z:112`)보다 33.4 유닛 아래로 처진다.
  - **추론(`inference`)**: 연속 초안에서 고관절 굴곡 시 슬관절 신전 보정이 빠져 정강이가 들리지 않은 것이다.
  - **미검증/불일치(`unverified`)**: 연속 초안 `supine-knee-fold`의 테이블탑 정강이 높이 불일치 및 좌우 교대 미구현.

### A-06. `original-mat-side-leg-lift` — 옆으로 누워 다리 들기 (`Side-Lying Leg Lift`)
- **공개 교육 근거 URL**:
  1. Cambridge University Hospitals NHS Foundation Trust: `https://www.cuh.nhs.uk/patient-information/pilates-exercises-and-principles/` (`verified-in-repo-source-ledger`)
  2. Pilatesology — *Side Kick Series*: `https://pilatesology.com/blog/side-kick-series/` (`verified-via-public-search-snippet`)
- **3단계 생체역학 근거**:
  - **시작(`start`)**: 옆으로 누워(Side-Lying) 머리·어깨·골반을 일직선 적층하고 아래 다리로 지지면을 확보한 뒤 위쪽 다리를 길게 뻗음.
  - **중간(`middle`)**: 내쉬며(Exhale) 골반이 딸려 올라가지 않는 범위까지 위쪽 다리를 외전 거상.
  - **종료(`end`)**: 조절 호흡으로 위쪽 다리를 내전하여 시작 높이로 복귀.
- **기존 초안 대조 (`fact` / `inference` / `unverified`)**:
  - **사실(`fact`)**: 2D rig(`side-lying-leg-press-sweep`)는 아래 다리를 굽혀(`farKnee: 218,148`) 그리나, 연속 초안(`side-lying-straight-leg-lift`)은 아래 다리를 펴고 카탈로그에 없는 `head-pad` 소도구를 그린다.
  - **추론(`inference`)**: 초급(아래 무릎 굴곡)과 고전(양다리 신전) 변형이 2D/연속 초안에 각각 다르게 반영되었다.
  - **미검증/불일치(`unverified`)**: `side-lying-straight-leg-lift`와 `side-lying-leg-press-sweep` 간 아래 다리 지지 자세 및 `head-pad` 유무 불일치.

### A-07. `original-mat-clam` — 사이드 클램 (`Side-Lying Clam`)
- **공개 교육 근거 URL**:
  1. Cambridge University Hospitals NHS Foundation Trust: `https://www.cuh.nhs.uk/patient-information/pilates-exercises-and-principles/` (`verified-in-repo-source-ledger`)
  2. Royal United Hospitals Bath NHS Foundation Trust: `https://www.ruh.nhs.uk/patients/patient_information/PHY091_Gluteal_Tendinopathy.pdf` (`verified-via-public-search-snippet`)
- **3단계 생체역학 근거**:
  - **시작(`start`)**: 옆으로 누워 양 고관절·무릎을 굽혀 포개고 양발 뒤꿈치를 붙인 채 골반과 상체를 수직 고정.
  - **중간(`middle`)**: 내쉬며(Exhale) 양발을 붙인 채 상체·골반 회전 없이 위쪽 고관절만 외회전하여 위쪽 무릎 거상.
  - **종료(`end`)**: 조절 호흡으로 위쪽 무릎을 닫아 아래 무릎 위에 포갬.
- **기존 초안 대조 (`fact` / `inference` / `unverified`)**:
  - **사실(`fact`)**: 공유 2D rig(`side-lying-clam-open-book`)의 `middle` 단계에서 무릎이 열리는(`knee y: 152 -> 104`) 동시에 위쪽 팔이 등 뒤로 넘어가는(`hand: 176,136 -> 38,62`) Open Book 회전이 함께 나타난다.
  - **추론(`inference`)**: Clam과 Open Book을 단일 2D 아키타입으로 묶으면서 발생한 결합 오류이다.
  - **미검증/불일치(`unverified`)**: `side-lying-clam-open-book`의 상지·흉추 회전은 Clam의 골반·몸통 중립 고정 원칙과 정면 충돌한다.

### A-08. `original-mat-open-book` — 사이드 오픈 북 (`Side-Lying Open Book`)
- **공개 교육 근거 URL**:
  1. Cambridge University Hospitals NHS Foundation Trust: `https://www.cuh.nhs.uk/patient-information/pilates-exercises-and-principles/` (`verified-in-repo-source-ledger`)
  2. Torbay and South Devon NHS Foundation Trust: `https://www.torbayandsouthdevon.nhs.uk/uploads/24912.pdf` (`verified-via-public-search-snippet`)
- **3단계 생체역학 근거**:
  - **시작(`start`)**: 옆으로 누워 양 무릎을 앞으로 굽혀 포개어 매트에 고정하고 양팔을 가슴 앞에 나란히 포갬.
  - **중간(`middle`)**: 내쉬며(Exhale) 양 무릎과 골반은 매트에 고정한 채 위쪽 팔과 흉추를 반대편 바닥 쪽으로 열어 회전.
  - **종료(`end`)**: 내쉬며(Exhale) 흉추와 위쪽 팔을 되돌려 양손을 다시 포갬.
- **기존 초안 대조 (`fact` / `inference` / `unverified`)**:
  - **사실(`fact`)**: 공유 2D rig(`side-lying-clam-open-book`)의 `middle` 단계에서 바닥에 포개져 있어야 할 위쪽 무릎이 `knee y: 152 -> 104`(48px)로 크게 들린다.
  - **추론(`inference`)**: Open Book에서 무릎이 들리면 골반이 함께 돌아가 순수 흉추 회전이 무너진다.
  - **미검증/불일치(`unverified`)**: `side-lying-clam-open-book`의 위쪽 무릎 거상은 Open Book의 카탈로그 큐(`"무릎을 포개고"`)와 정면 불일치한다.

### A-09. `original-mat-quadruped-reach` — 네발기기 팔·다리 리치 (`Quadruped Reach`)
- **공개 교육 근거 URL**:
  1. Cambridge University Hospitals NHS Foundation Trust: `https://www.cuh.nhs.uk/patient-information/pilates-exercises-and-principles/` (`verified-in-repo-source-ledger`)
  2. Oxford University Hospitals NHS Foundation Trust: `https://www.ouh.nhs.uk/media/022n23fb/107625exercises.pdf` (`verified-in-repo-source-ledger`)
- **3단계 생체역학 근거**:
  - **시작(`start`)**: 어깨 아래 손목, 고관절 아래 무릎을 둔 네발기기 중립 척추 정렬.
  - **중간(`middle`)**: 내쉬며(Exhale) 몸통과 골반 수평을 유지한 채 기본(Standard)에서는 팔 또는 다리 하나를 바닥을 따라 길게 뻗고, 진행(Progression)에서는 반대쪽 팔과 다리를 함께 리치.
  - **종료(`end`)**: 조절 호흡으로 사지를 회수하여 네발기기 4점 지지로 복귀.
- **기존 초안 대조 (`fact` / `inference` / `unverified`)**:
  - **사실(`fact`)**: 카탈로그 `standard` 큐와 연속 초안(`quadruped-arm-slide`, `quadruped-leg-slide`)은 단일 사지 바닥 슬라이드이나, 2D rig(`quadruped-reach-slide`)는 대각선 공중 거상(`hand y: 150 -> 72`, `ankle y: 150 -> 82`)을 그린다.
  - **추론(`inference`)**: Level 1(바닥 슬라이드)과 Level 2(Bird-Dog 공중 리치)가 카탈로그·2D·연속 초안에 혼재되어 있다.
  - **미검증/불일치(`unverified`)**: `quadruped-reach-slide` 2D rig와 카탈로그 `standard`/연속 초안 간 사지 높이 불일치.

### A-10. `original-mat-swan-prep` — 매트 스완 준비 (`Mat Swan Preparation`)
- **공개 교육 근거 URL**:
  1. Cambridge University Hospitals NHS Foundation Trust: `https://www.cuh.nhs.uk/patient-information/pilates-exercises-and-principles/` (`verified-in-repo-source-ledger`)
  2. BASI Pilates — *Back Extension in Pilates*: `https://www.basipilates.com/blog/back-extension-in-pilates/` (`blocked-by-sandbox-proxy-unverified`)
- **3단계 생체역학 근거**:
  - **시작(`start`)**: 매트에 엎드려(Prone) 양손과 전완을 어깨 옆 매트에 가볍게 지지하고 치골과 양발등을 매트에 밀착.
  - **중간(`middle`)**: 복부 지지로 요추를 보호하며 손/전완으로 매트를 가볍게 지지해 상부 흉추만 부드럽게 신전(양손과 양발은 매트에 유지).
  - **종료(`end`)**: 척추 길이를 유지하며 가슴과 이마를 매트 시작 위치로 내려놓음.
- **기존 초안 대조 (`fact` / `inference` / `unverified`)**:
  - **사실(`fact`)**: 공유 2D rig(`prone-swan-pulling-straps-swimming`)는 `middle`에서 손이 골반 뒤(`hand x: 46 -> 184`)로 크게 스윕되고 발목도 공중으로 들린다(`ankle y: 144 -> 128`). 연속 초안(`prone-forearm-chest-extension-v1`)은 전완 고정이나 `motionAuthoringBatch.ts`에서 `mismatched`로 분류되어 있다.
  - **추론(`inference`)**: 리포머 Pulling Straps·Swimming과 단일 2D 아키타입을 공유하면서 전완/손 매트 지지점이 사라졌다.
  - **미검증/불일치(`unverified`)**: `prone-swan-pulling-straps-swimming`의 팔 후방 스윕 및 발목 거상은 Mat Swan Prep과 명백히 불일치한다.
