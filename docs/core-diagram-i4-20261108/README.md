# [I4/구현] Pilates 복부 안정 2D 도해 구현 및 검증 보고서

- **작업 브랜치**: `gemini/diagram-i4-core-20261108`
- **소유 범위**: `core` 접두 자산/컴포넌트/데이터/테스트/검증 문서 전용
  - `src/data/coreAbdominalSourceLedger.json`
  - `src/data/coreAbdominalDiagrams.ts`
  - `src/components/CoreAbdominalDiagramFigure.tsx`
  - `src/components/CoreAbdominalDiagramFigure.test.tsx`
  - `docs/core-diagram-i4-20261108/`

## 1. 구현된 3대 복부 안정 동작 (Start / Middle / End 3단계 2D 도해)

| 순서 | 동작 ID (`coreId`) | 카탈로그 ID (`primaryExerciseId`) | 시작 자세 (`start`) | 중간 자세 (`middle`) | 끝 자세 (`end`) | 핵심 교정 사항 |
| :---: | :--- | :--- | :--- | :--- | :--- | :--- |
| 1 | `core-hundred` | `ex-core-01` (헌드레드) | 요추·천골 매트 임프린트 + 견갑골 하각 컬업 + 90/90 테이블탑 + 골반 옆 수평 암 리치 | 컬업·요추 고정 + **양다리 45° 사선 신전(`248,68`)** + **골반 옆 팔 5박 들숨/5박 날숨 상하 펌핑(`172,134`)** | 100회 완료 후 팔 정지 + 복부 스쿱 유지하며 무릎을 먼저 90/90 테이블탑으로 회수 | 공용 아키타입에서 분리하여 45° 양측 하지 레버와 견관절 상하 펌핑 진동 궤적을 독립 구현 |
| 2 | `core-single-leg-stretch` | `original-mat-single-leg-stretch` (싱글 레그 스트레치) | 상체 컬업 + 한쪽 무릎 가슴 당김(`142,90`) + **양손이 정강이·발목 직접 지지(`164,98`)** | **양손으로 당긴 정강이·무릎 클램프 유지** + **반대쪽 다리(`farLeg`) 45° 사선 완전 신전(`252,68`)** | 상체·골반 흔들림 0° 유지하며 공중 중심선에서 좌우 다리 교차 스위치 및 정강이 그립 전환 | 양손이 바닥 근처에서 펌핑 자세로 그려지던 오류를 제거하고, 당긴 무릎/정강이 `hand-shin-clasp` 접촉점으로 교정 |
| 3 | `core-double-leg-stretch` | `ex-core-03` (더블 레그 스트레치) | 상체 컬업 + 양 무릎 가슴 밀착 + **양손으로 양 정강이·발목 감싸기(`172,102`)** | **상체 컬업 높이·요추 임프린트 고정** + **양팔 귀 옆 135° 오버헤드(`24,58`) & 양다리 45° 사선(`264,60`) 양방향 동시 신전** | 날숨에 **양팔 와이드 서클 스윕(Arm Circle)** 궤적으로 돌려 접혀 들어오는 두 정강이 재그립(`174,102`) | 팔이 골반 옆에 머물던 오류를 제거하고, 정강이 그립 → 양방향 반대 신전 → 와이드 암 서클 복귀 3단계를 완성 |

## 2. 검증된 공개 근거 출처 (Public Sources)

1. **Cambridge University Hospitals NHS Foundation Trust** — *Pilates exercises and principles (Patient Information)*
   - URL: https://www.cuh.nhs.uk/patient-information/pilates-exercises-and-principles/
   - 검증 내용: 앙와위 복부 안정 동작 시 골반·요추 중립/임프린트 지지, 두경부 끄덕임(cranio-cervical nod), 사지 신전 시 요추 들림 및 골반 회전 억제.
2. **Oxford University Hospitals NHS Foundation Trust** — *Pilates Exercises Physiotherapy Patient Leaflet*
   - URL: https://www.ouh.nhs.uk/media/022n23fb/107625exercises.pdf
   - 검증 내용: 90/90 테이블탑 시작 정렬, 복횡근(Transversus Abdominis) 선행 수축, 하지 레버 부하 증가 시 늑골 들림(rib flare) 억제.
3. **BASI Pilates** — *10 Essential Pilates Exercises for Beginners & Exercise Series: The Chest Lift*
   - URL: https://www.basipilates.com/pilates/10-essential-pilates-exercises-for-beginners/ / https://www.basipilates.com/blog/exercise-series-the-chest-lift/
   - 검증 내용: 견갑골 하각(inferior scapular angle) 기준 상부 흉추 굴곡 높이 유지 및 더블 레그 스트레치 오버헤드 리치 시 상체 높이 불변 원칙.
4. **Joseph H. Pilates & William J. Miller (1945 Public Domain)** — *Return to Life Through Contrology (#1 The Hundred, #6 The One Leg Stretch, #7 The Double Leg Stretch)*
   - URL: https://pilatesology.com/blog/the-one-leg-stretch/ / https://www.youtube.com/watch?v=DhO6u5pB0xo
   - 검증 내용: 헌드레드 5박 호흡 펌핑, 싱글 레그 스트레치 정강이 양손 지지 교차, 더블 레그 스트레치 양방향 반대 신전 후 암 서클 복귀.

## 3. 비의료·비진단 고지 (Governance)

- `anatomicalAccuracyAssumed: false`
- `professionalReviewCount: 0`
- `exactAssetReady: false`
- `containsMedicalDiagnosis: false`
- `containsTreatmentEfficacyClaim: false`
- 본 2D 도해와 운동학 지표는 필라테스 시퀀스 이해를 돕기 위한 교육·시각 참고 자료이며, 의학적 진단·처방·치료 효과를 보증하지 않습니다.
