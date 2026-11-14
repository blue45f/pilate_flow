# 추가 필라테스 영상 40개 — 제작자 메타데이터 재조사

확인일: **2026-11-14 UTC**

이 파일은 유실된 추가 영상 목록을 제작자 공개 자료와 현재 YouTube oEmbed 응답으로 다시 조사한 기록이다. 이전 파일과 40개 항목이 모두 동일하다는 주장을 하지 않는다. 이전 대화에 남은 ID는 후보를 찾는 단서로 사용하고 제목·채널·공식 페이지의 연결을 다시 확인했다.

## 실제 반영 결과

| 구분 | 추가 영상 수 |
|---|---:|
| 매트 | 26 |
| 리포머 | 6 |
| 체어 | 4 |
| 캐딜락 | 3 |
| 바렐 | 1 |
| **합계** | **40** |

기존 `verifiedPilatesYouTubeCatalog.json`과 `expandedPilatesVideoCatalog.json`의 310개 ID와 중복되지 않는다. 세 파일을 합친 카탈로그는 **350개 고유 영상 / 국내 76개 / 해외 274개**다.

제작자별 추가 수는 Complete Pilates 21개, Balanced Body 13개, Pilates Anytime 4개, PILATESOLOGY 1개, Online Pilates Classes by Lesley Logan 1개다. 모든 제목과 채널명은 oEmbed 응답의 문자열을 그대로 보존했다. 검색 엔진의 과거 제목에 `PA Archives`가 없더라도 현재 oEmbed 제목을 우선했다.

## 확인한 범위

- 제작자 사이트의 영상 목록 또는 제작자 YouTube 페이지에 있는 ID·동작 제목·기구 문맥을 확인했다.
- 각 ID의 공개 YouTube oEmbed 응답에서 제목과 채널명을 확인했다.
- 모든 추가 항목은 `playbackVerified: false`다. 전체 동영상 재생, 프레임 대조, 동작 동일성, 구간 시작 시각, 임상 적합성, 전문가 승인은 확인하지 않았다.
- 새 시작 시각이나 클립 범위를 만들지 않았다. 영상과 도해를 동일 시범으로 선언하지 않았다.
- Mat/Reformer/Chair/Cadillac/Barrel 분류는 제작자 설명과 자료의 기구 문맥을 사용한다. Seated Mermaid의 chair 분류는 공식 thumbnail에서 기구도 확인했으며, 그 정지 그림을 재생 검수로 계산하지 않았다.
- `keywords`는 제목·제작자 분류에 있는 동작 이름으로 제한했다. Toe Taps를 Knee Fold로, Prone Press를 Swan으로 바꾸는 식의 검색어 확장은 하지 않았다.

## 주요 제작자 근거

1. [Complete Pilates — Pilates Videos: Free Online Exercises & Workouts](https://complete-pilates.co.uk/videos/): 이 목록의 21개 Complete Pilates ID가 실제 watch/embed 링크로 연결된다.
2. [Balanced Body AU/NZ — Instructors](https://www.balancedbody.com.au/podcasts-instructors): 13개 에피소드의 YouTube 링크와 Reformer·Chair·Trapeze Table 문맥을 대조했다. 채널명은 oEmbed의 `Balanced Body`로 재확인했다.
3. [Online Pilates Classes — Swan on the Ladder Barrel](https://onlinepilatesclasses.com/pilates-exercises/ladder-barrel-exercises/ladder-barrel-swan/): 본문에 연결된 `iHw7XBri28Q`와 oEmbed를 대조했다.
4. [Pilates Anytime — Shoulder Bridge](https://www.youtube.com/watch?v=QFv_Fex3Mko), [Single Leg Stretch](https://www.youtube.com/watch?v=Ad4lgW4ieAM), [Leg Pull Back](https://www.youtube.com/watch?v=f_gzE5tOPQw), [Side Bend](https://www.youtube.com/watch?v=zprsJDjeONM): 제작자 YouTube 제목·설명과 oEmbed를 확인했다.
5. [PILATESOLOGY — Single Leg Stretch with Alisa Wyatt](https://www.youtube.com/watch?v=-5-NRRq6q1M), [제작자 운동 설명 페이지](https://pilatesology.com/classes/single-leg-stretch/): Mat 문맥과 제작자 이름을 확인했다.

기구·자세 문맥을 보완한 Complete Pilates 자료: [Mermaid](https://complete-pilates.co.uk/pilates-mermaid-exercise-your-step-by-step-how-to-guide/), [매트에서 시작하는 등 운동](https://complete-pilates.co.uk/back-exercises-at-home/), [기초 동작 설명](https://complete-pilates.co.uk/pilates-beginner-exercises/), [Arm Arcs·Swimming·Book Openings·Single Leg Stretch](https://complete-pilates.co.uk/pilates-for-swimming/).

## 포함한 영상

| 기구 | 정확한 oEmbed 제목 · 원본 링크 | 제작자 | 범위 메모 |
|---|---|---|---|
| 매트 | [Pilates Arm Arcs](https://www.youtube.com/watch?v=TVuFXiyOFzk) | Complete Pilates | 독립 동작 제목·메타데이터 참조 |
| 매트 | [How to do a Pilates bridge](https://www.youtube.com/watch?v=D4JE3LB_zTM) | Complete Pilates | 기본 브리지 제목·메타데이터 참조 |
| 매트 | [Pilates Exercises: Bent Knee Opening](https://www.youtube.com/watch?v=IUjqLwlhc0g) | Complete Pilates | Bent Knee Opening; Knee Fold 또는 Clam으로 치환하지 않음 |
| 매트 | [How to do a Pilates book opening](https://www.youtube.com/watch?v=YggCTIawob0) | Complete Pilates | Book Opening; Open Book 대응은 원본 동작에 한정한 selector 별칭 사용 |
| 매트 | [How to do a Pilates Cat Cow](https://www.youtube.com/watch?v=D41_YWSBQhA) | Complete Pilates | 독립 동작 제목·메타데이터 참조 |
| 매트 | [How to do glute exercises at home: Glute Clam](https://www.youtube.com/watch?v=1DyDJNVIKXw) | Complete Pilates | 독립 동작 제목·메타데이터 참조 |
| 매트 | [Chest lift](https://www.youtube.com/watch?v=ELPUVY8mH6E) | Complete Pilates | Chest Lift 제목·메타데이터 참조 |
| 매트 | [Chest lift with outstretched arms](https://www.youtube.com/watch?v=JjSQy9U2eqA) | Complete Pilates | 팔을 앞으로 뻗은 Chest Lift 변형 |
| 매트 | [Chest lift with arm arcs](https://www.youtube.com/watch?v=1SnsqJYN2lw) | Complete Pilates | Arm Arcs를 결합한 Chest Lift 변형 |
| 매트 | [How to do a Pilates Criss Cross](https://www.youtube.com/watch?v=0K_NerG1-jw) | Complete Pilates | 독립 동작 제목·메타데이터 참조 |
| 매트 | [How to do Pilates Exercises: Dart](https://www.youtube.com/watch?v=XEPOuT6gX1Y) | Complete Pilates | Dart; Swan 또는 Swimming으로 치환하지 않음 |
| 매트 | [Pilates exercises: Femur Arcs (toe taps)](https://www.youtube.com/watch?v=eMp-Cxvaj7g) | Complete Pilates | Toe Taps/Femur Arcs; Knee Fold와 별도 |
| 매트 | [How to do a Pilates Mermaid](https://www.youtube.com/watch?v=OtRaWMCz0gI) | Complete Pilates | 매트 Mermaid; Reformer의 kneeling 변형과 별도 |
| 매트 | [Pilates Exercises: Pelvic Clock](https://www.youtube.com/watch?v=3GBwBBt63Xw) | Complete Pilates | 독립 동작 제목·메타데이터 참조 |
| 매트 | [Strengthen your legs and abs with Pilates Legs Circles](https://www.youtube.com/watch?v=q7ze6b2oDz0) | Complete Pilates | Leg Circles; 제목만으로 Single Leg Circle의 동일 시범을 단정하지 않음 |
| 매트 | [Physio Led Pilates for Abs Strength: How to do a Leg Pull Front](https://www.youtube.com/watch?v=aUxP-5OY85E) | Complete Pilates | 독립 동작 제목·메타데이터 참조 |
| 매트 | [Pilates Back Exercises at Home: Prone Press](https://www.youtube.com/watch?v=9T3ta1oFF7A) | Complete Pilates | Prone Press; Swan Prep으로 자동 치환하지 않음 |
| 매트 | [Pilates quadruped exercise aka superman](https://www.youtube.com/watch?v=VQr5aSkFbrA) | Complete Pilates | Quadruped/Superman; 특정 팔·다리 조합 동일 시범은 미검수 |
| 매트 | [Increase core stability with a single leg stretch](https://www.youtube.com/watch?v=tyQ5kMd1bAQ) | Complete Pilates | 독립 동작 제목·메타데이터 참조 |
| 매트 | [Physio led Pilates for posture: How to do Pilates Swimming](https://www.youtube.com/watch?v=A-qD0UY2Wc0) | Complete Pilates | Swimming 제목·메타데이터 참조 |
| 매트 | [Physio led Pilates for posture: Preparing for Pilates Swimming](https://www.youtube.com/watch?v=0-fNmMWsm-A) | Complete Pilates | Swimming 준비 동작 |
| 매트 | [PA Archives \| Pilates Exercise: Shoulder Bridge](https://www.youtube.com/watch?v=QFv_Fex3Mko) | Pilates Anytime | 제작자 설명에 다리 들기·내리기가 포함된 Shoulder Bridge 변형; 기본 양발 브리지와 동일 시범 아님 |
| 매트 | [PA Archives \| Pilates Exercise: Single Leg Stretch](https://www.youtube.com/watch?v=Ad4lgW4ieAM) | Pilates Anytime | 독립 동작 제목·메타데이터 참조 |
| 매트 | [PA Archives \| Pilates Exercise: Leg Pull Back](https://www.youtube.com/watch?v=f_gzE5tOPQw) | Pilates Anytime | 독립 동작 제목·메타데이터 참조 |
| 매트 | [PA Archives \| Pilates Exercise: Side Bend](https://www.youtube.com/watch?v=zprsJDjeONM) | Pilates Anytime | 독립 동작 제목·메타데이터 참조 |
| 매트 | [Pilates Single Leg Stretch with Alisa Wyatt](https://www.youtube.com/watch?v=-5-NRRq6q1M) | PILATESOLOGY | 별도 제작자의 독립 Single Leg Stretch 참조 |
| 리포머 | [Pilates Instructors : S2E18 :  Breathing with Up & Down Stretch](https://www.youtube.com/watch?v=4mbKSdGz3us) | Balanced Body | Up Stretch와 Down Stretch가 함께 명시된 복합 참조 |
| 리포머 | [Pilates Instructors : S2E16 :  Breathing in Pilates -  Elephant, Snake & Headstand](https://www.youtube.com/watch?v=V3_HSYh2Rvo) | Balanced Body | Elephant·Snake·Headstand 복합 참조 |
| 리포머 | [Pilates for Instructors : E55 : Variations of Rollover and Corkscrew](https://www.youtube.com/watch?v=QJjB2QPG9qQ) | Balanced Body | Clinical Reformer에서의 Rollover/Corkscrew 변형·복합 참조 |
| 리포머 | [Pilates for Instructors : E56 : Variations on Kneeling Mermaid](https://www.youtube.com/watch?v=vtp6S3ELcck) | Balanced Body | Clinical Reformer의 kneeling Mermaid; seated Mermaid와 자세 구분 |
| 리포머 | [Pilates Instructors : S2E14 :  Breathing in Pilates -  Knee Stretch Series](https://www.youtube.com/watch?v=Uzk3OapCEd0) | Balanced Body | Knee Stretch 시리즈; 특정 round/flat 변형 동일 시범 미검수 |
| 리포머 | [Pilates Instructors : S2E12 : Breathing in Pilates -- Breathing with Stomach Massage](https://www.youtube.com/watch?v=S7YAcZJ16xY) | Balanced Body | Stomach Massage; Hands Back 등 세부 변형·구간 미검수 |
| 체어 | [Pilates Instructors : S2E26 :  Breathing with Tricep Press & Swan](https://www.youtube.com/watch?v=XnFBJBQpYEY) | Balanced Body | Chair의 Tricep Press/Swan 복합 참조 |
| 체어 | [Pilates Instructors : S2E22 :  Advanced Variations of Pike](https://www.youtube.com/watch?v=HzKrNbwEAbY) | Balanced Body | Exo Chair split pedal을 이용한 advanced Pike 변형 |
| 체어 | [Pilates Instructors : S2E03 : Variations of the Seated Mermaid](https://www.youtube.com/watch?v=57ZKaAaht0g) | Balanced Body | Seated Mermaid의 advanced 변형; 제작자 thumbnail에서 Pilates chair만 확인, 실제 재생 미검수 |
| 체어 | [Pilates Instructors : S2E23 :  Breathing with Standing Push Down](https://www.youtube.com/watch?v=zbrQhWe3hG4) | Balanced Body | Chair Standing Push Down; 두 chair 운동을 다루는 제작자 설명 |
| 캐딜락 | [Pilates Instructors : E43 :  Advanced Push Up Series on the Trap Table](https://www.youtube.com/watch?v=Oo8PiihLv74) | Balanced Body | Trap Table/Cadillac의 advanced Push Up 시리즈 |
| 캐딜락 | [Pilates Instructors : E39 :  Assisted Roll Back](https://www.youtube.com/watch?v=owz4uHjsVFg) | Balanced Body | Trapeze Table의 assisted Roll Back 변형 |
| 캐딜락 | [Pilates Instructors : S2E29 :  Breathing with Springs on the Cadillac](https://www.youtube.com/watch?v=TaGj-Nvv_tE) | Balanced Body | Cadillac의 The Breathing; Mat 호흡 또는 기본 브리지와 동일 시범으로 치환하지 않음 |
| 바렐 | [Swan on the Ladder Barrel \| Online Pilates Classes](https://www.youtube.com/watch?v=iHw7XBri28Q) | Online Pilates Classes by Lesley Logan | Ladder Barrel Swan; 다른 기구의 Swan과 구분 |

## 관계와 매칭 시 주의할 항목

- `QFv_Fex3Mko`: 공개 설명에 한 다리 들기·내리기가 있다. 기본 양발 Bridge에 연결될 때 관련 변형으로 표시한다.
- `JjSQy9U2eqA`, `1SnsqJYN2lw`: 팔을 뻗거나 Arm Arcs를 결합한 Chest Lift 변형이다.
- `0-fNmMWsm-A`: Swimming 준비 동작이며, 완성 Swimming과 같은 시범으로 표시하지 않는다.
- `eMp-Cxvaj7g`: Femur Arcs/Toe Taps다. Knee Fold 자료가 부족하다는 이유로 바꾸어 연결하지 않는다.
- `4mbKSdGz3us`, `V3_HSYh2Rvo`, `QJjB2QPG9qQ`, `XnFBJBQpYEY`: 제목에 여러 동작이 함께 있는 복합 참조다. 각 동작의 구간은 미검수다.
- `vtp6S3ELcck`: Reformer의 kneeling Mermaid다. seated Mermaid와 자세를 구분한다.
- `HzKrNbwEAbY`, `57ZKaAaht0g`, `Oo8PiihLv74`: advanced 변형/시리즈다. 준비 동작과 동일한 시범으로 자동 분류하지 않는다.
- `Uzk3OapCEd0`, `S7YAcZJ16xY`: Knee Stretch Series / Stomach Massage 범위다. 특정 round/flat/Hands Back 버전의 동일 시범이나 시작 시각은 확인하지 않았다.
- 모든 매칭은 현재 exercise 객체의 기구·자세·소도구 조건을 통과해야 한다. 신규 데이터는 source-only 운동의 native pose 가용성을 변경하지 않는다.

## 제외한 후보

[Pilates Anytime — Double Leg Stretch (`fuwzt4d7FuY`)](https://www.youtube.com/watch?v=fuwzt4d7FuY)는 제목과 공개 설명이 충돌했다. 설명에는 한 다리씩 교대해 뻗는 동작이 적혀 있어 이번 추가에서는 제외했다. 실제 영상의 내용이 잘못됐다고 판정한 것은 아니며, 재생 확인 전까지 채택하지 않은 것이다.

## 커버리지 기록 범위

이 추가 데이터는 매트 기본 동작과 준비/변형, Reformer 스트레치 계열, Chair의 Pike·Swan·Mermaid·Push Down, Cadillac의 Roll Back·Push Up·Breathing, Ladder Barrel Swan의 참조를 넓힌다. 동일 제목의 독립 제작자 영상이 추가된 항목도 있으며, 모든 동작에 두 개 이상의 적합한 영상이 생겼다는 주장은 하지 않는다.

실제 0/1/2개 이상 관련 영상 수는 갤러리 selector의 기구·자세·소도구·관계 분류를 적용한 뒤 별도로 집계해야 한다. 이 문서의 기구별 숫자는 신규 source 수이며 canonical 운동 수나 새 native motion 수가 아니다.

## 데이터 파일과 검증 상태

- `src/data/additionalPilatesVideoCatalog.json`: 실제 앱 카탈로그 40개.
- `docs/research/additional-pilates-videos-2026-11-14.evidence.json`: 각 ID의 source URL, oEmbed URL, 정확한 제목·채널, 범위 메모.
- `src/data/exerciseYouTubeCatalog.ts`: 공용 pool에 import.
- 기존 총수 회귀를 350/76/274로 갱신하고 전체 ID 고유 수 350 검증을 유지한다.

이 작업에서는 테스트·빌드를 실행하지 않았다. 통합 실행 및 실제 갤러리 coverage 집계는 최종 selector와 이미지 변경이 함께 준비된 뒤 별도 수행한다.
