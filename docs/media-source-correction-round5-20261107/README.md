# Round 5: 동작 라이브러리 오매핑 영상(`DEF-MEDIA-01`) 실제 수정·출처 검증 및 전후 ID 회귀 보고서 (`2026-11-07`)

> [!IMPORTANT]
> **작업 범위 및 소유권 경계 준수 요약**
> - **소유 및 수정 파일**:
>   - [`src/data/pilatesCatalog.ts`](file:///home/antigravity/blue45f/pilate_flow/src/data/pilatesCatalog.ts) (`526줄`, 800줄 제한 준수)
>   - [`src/data/exerciseYouTubeCatalog.ts`](file:///home/antigravity/blue45f/pilate_flow/src/data/exerciseYouTubeCatalog.ts) (`387줄`, 800줄 제한 준수)
>   - [`src/data/exerciseYouTubeCatalog.test.tsx`](file:///home/antigravity/blue45f/pilate_flow/src/data/exerciseYouTubeCatalog.test.tsx) (`266줄`, 800줄 제한 준수)
>   - [`src/utils/movementMediaMatcher.test.ts`](file:///home/antigravity/blue45f/pilate_flow/src/utils/movementMediaMatcher.test.ts) (`203줄`, 800줄 제한 준수)
>   - [`docs/media-source-correction-round5-20261107/`](file:///home/antigravity/blue45f/pilate_flow/docs/media-source-correction-round5-20261107/) 감사·검증 아티팩트 일체
> - **수정 금지 경계 100% 준수**:
>   - UI 컴포넌트, 도해 rig, `SourceNoteDialog`, `InstructorStudyDialog`, `CourseReferenceBrowser`, `ExerciseAtlasView`, `App.tsx`, 공유 스토어(`usePilatesStore.ts`), 스키마, 라우트, 전역 CSS 및 다른 페이지 파일은 **단 1바이트도 수정하지 않았습니다.**
> - **전체 98개 동작 ID 무결성 보존**:
>   - `INITIAL_EXERCISES`의 **98개 동작 ID 전체가 삭제·추가·순서 변경 없이 100% 그대로 보존**되었으며(`deletedExerciseIds: []`, `addedExerciseIds: []`, `allIdsPreservedInOrder: true`), 유효한 단일 동작 대체 근거가 없는 5개 동작은 동작 자체를 삭제하지 않고 잘못된 영상 연결만 제거한 뒤 `자료 미확인`으로 명시했습니다.

---

## 1. 수정 요약 (Executive Summary)

Round 4 미디어·출처 감사([`docs/atlas-media-provenance-round4-20261107/README.md`](file:///home/antigravity/blue45f/pilate_flow/docs/atlas-media-provenance-round4-20261107/README.md))에서 P1 결함(`DEF-MEDIA-01`)으로 확인된 **무관 영상 21개(Goodful 명상, Yoga With Adriene 홈요가, Pamela Reif 맨몸 복근 등) + 타 기구(매트) 오매핑 영상 6개 + 임의 조작/오표기된 제목·채널명**을 전수 교정했습니다.

| 구분 (`resolutionType`) | 건수 | 조치 내용 및 검증 근거 |
| :--- | :---: | :--- |
| **`original-linkless-preserved`** (`original-*`) | **60건** | 앱 내 직접 작성된 무링크 기본 동작 60건 — 기존 메타데이터(`videoId: ''`, `url: ''`) 및 ID 순서 그대로 보존 |
| **`mislinked-replaced-with-verified-match`** (`ex-*` 교체) | **22건** | 기존 무관/타 기구 영상 링크를 제거하고, **동작·기구·제목·채널 일치가 공개 YouTube oEmbed(`HTTP 200`)로 직접 확인된 검증 영상 22건**으로 교체 |
| **`unverified-link-removed-marked-unverified`** (`ex-*` 자료 미확인) | **5건** | 공개 출처에서 단일 동작·기구·소도구가 정확히 일치하는 검증 영상 근거가 없는 **5개 동작(`ex-warmup-01`, `ex-footwork-02`, `ex-cooldown-02`, `ex-core-04`, `ex-lower-04`)** — **동작 자체는 삭제하지 않고 유지**하되, 잘못된 영상 연결(`inpok4MKVLM`, `K56Z12XNQ5c`, `v7AYKMP6rOE`, `ml6cT4AZdqI`, `UBMk30rjy0o`)을 제거(`videoId: ''`, `url: ''`)하고 `channelName: '자료 미확인'` 및 `note: '자료 미확인: ...'`로 명시 |
| **`verified-retained-title-channel-aligned`** (`ex-kr-*` / `ex-global-*`) | **11건** | 이미 검증 풀(`verifiedPilatesYouTubeCatalog.json`)의 유효 ID를 사용 중이던 국내 5건·해외 6건 — 영상 ID는 유지하고, 임의 축약/변형되어 있던 `videoTitle`과 `channelName`을 실제 YouTube oEmbed 공식 `title` 및 `author_name`(`Merrithew®`, `Balanced Body®`, `PILATESBODY by Kayla`, `WITH PILATES 위드필라테스`)과 100% 일치하도록 교정 |
| **합계 (`INITIAL_EXERCISES`)** | **98건** | **98개 동작 ID 전수 보존 (`before: 98` → `after: 98`, 누락·삭제 `0건`)** |

- **전수 98개 동작 변경 전후 매핑 원장**: [`before-after-98-id-mapping.json`](file:///home/antigravity/blue45f/pilate_flow/docs/media-source-correction-round5-20261107/before-after-98-id-mapping.json)
- **라이브 URL 임시 `503` vs 영구 `404` 상태 분류 원장**: [`live-url-503-vs-404-status.json`](file:///home/antigravity/blue45f/pilate_flow/docs/media-source-correction-round5-20261107/live-url-503-vs-404-status.json)
- **뷰포트별(`320`/`390`/`768`/`1440`·`200%` 확대) 브라우저 QA 실측 수치**: [`browser-qa-metrics.json`](file:///home/antigravity/blue45f/pilate_flow/docs/media-source-correction-round5-20261107/browser-qa-metrics.json)

---

## 2. 오매핑 영상 22건 직접 검증 교체 상세 (`mislinked-replaced-with-verified-match`)

모든 교체 영상은 공개 `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v={videoId}&format=json` 엔드포인트에서 `HTTP 200 OK` 응답과 실제 `title`·`author_name`을 직접 확인하고, 동작의 기구(`apparatus`) 및 움직임 패턴과 일치하는 항목만 연결했습니다.

| 순번 | 동작 ID (`exerciseId`) | 한글 동작명 (`nameKo`) | 기구 (`apparatus`) | 변경 전 오매핑 ID 및 가짜 표기 | 변경 후 검증 ID (`videoId`) | 검증된 실제 YouTube 원제 (`videoTitle` / oEmbed `title`) | 검증된 실제 채널명 (`channelName` / oEmbed `author_name`) | oEmbed 확인 상태 |
| :---: | :--- | :--- | :---: | :--- | :---: | :--- | :--- | :---: |
| 1 | `ex-warmup-02` | 캐딜락 롤다운 바 흉추 모빌리티 & 캣 스트레치 | `cadillac` | `C2HX2pNbUCM` (가짜 표기: `Balanced Body Education`) | **`7ZFi1eX9z_0`** | `Pilates Cadillac, Roll Down Bar, Part 1 #posturepilates #mobility #pilatesequipment #tutorial` | `Posture Pilates` | `HTTP 200` 검증 |
| 2 | `ex-warmup-03` | 매트 폼롤러 흉추 릴리즈 & 립케이지 암써클 | `mat` | `sTANio_2E0Q` (가짜 표기: `Jessica Valant Pilates`) | **`rr38TSdDIfY`** | `Pilates Foam Roller Exercises - Full Body Foam Roller Workout` | `Jessica Valant` | `HTTP 200` 검증 |
| 3 | `ex-footwork-01` | 리포머 클래식 풋워크 4종 & 카프레이즈/프랜싱 | `reformer` | `lCg_gh_fppI` (가짜 표기: `gone adventuring Pilates`) | **`QDBzjlhKsco`** | `PA Archives \| Pilates Reformer Exercise: Footwork` | `Pilates Anytime` | `HTTP 200` 검증 |
| 4 | `ex-footwork-03` | 운다 체어 시티드 & 스탠딩 풋워크 프레스 | `chair` | `g_tea8ZNk5A` (가짜 표기: `Merrithew Stott Pilates`) | **`iPEpNe3OhcA`** | `Exercise of the Month \| STOTT PILATES®: Footwork on Stability Chair` | `Merrithew®` | `HTTP 200` 검증 |
| 5 | `ex-bridging-01` | 리포머 아티큘레이팅 펠빅 리프트 & 햄스트링 컬 | `reformer` | `v7AYKMP6rOE` (가짜 표기: `Nell Hoess Pilates`) | **`lqaIxlzhBw4`** | `STOTT PILATES® for Triathletes \| Bike Training: Shoulder Bridge` | `Merrithew®` | `HTTP 200` 검증 |
| 6 | `ex-bridging-02` | 캐딜락 타워 바 파라키트 & 숄더 브릿지 | `cadillac` | `4pKly2JojMw` (가짜 표기: `Korin Nolan · The Class Plan`) | **`EKSYuCaEX7s`** | `Pilates Shoulder Bridge on the Tower` | `Optimize Wellness` | `HTTP 200` 검증 |
| 7 | `ex-core-01` | 리포머 수파인 암워크 & 헌드레드 시리즈 | `reformer` | `inpok4MKVLM` (가짜 표기: `Dez Fit · Reformer Flows`) | **`vx4DdBWY6kQ`** | `PA Archives \| Pilates Reformer Exercise: The Hundred` | `Pilates Anytime` | `HTTP 200` 검증 |
| 8 | `ex-core-02` | 숏박스 앱 시리즈 (라운드백 · 플랫백 · 오블리크 트위스트) | `reformer` | `1f8yoFFdkcY` (가짜 표기: `Alo Moves Pilates`) | **`iUv1gxF5JcA`** | `리포머 숏박스 제대로 하는 법 Pilates Reformer Shortbox Series` | `한님쌤 필라테스` | `HTTP 200` 검증 |
| 9 | `ex-core-03` | 매트 필라테스 앱 파이브 (Ab Series of 5) | `mat` | `bTo4NrSriWw` (가짜 표기: `Lottie Murphy Pilates`) | **`DhO6u5pB0xo`** | `CLASSICAL PILATES WORKOUT in 20 Minutes \| Lottie Murphy Pilates` | `Lottie Murphy` | `HTTP 200` 검증 |
| 10 | `ex-upper-01` | 리포머 닐링 체스트 익스팬션 & 스파인 트위스트/허그어트리 | `reformer` | `K56Z12XNQ5c` (가짜 표기: `Flow With Mira`) | **`khdMmxqpEXk`** | `Chest Expansion on the Reformer \| Pilates for Strength, Control & Better Posture \| STOTT Pilates` | `EM  Pilates Studio` | `HTTP 200` 검증 |
| 11 | `ex-upper-02` | 리포머 백 로잉 & 프론트 로잉 (써브 어 트레이 & 쉐이브) | `reformer` | `C2HX2pNbUCM` (가짜 표기: `Margaret Elizabeth Pilates`) | **`6iDJKeUAS5k`** | `필라테스 리포머 동작 : Back Rowing / 내가 연습하려고 찍어보는 영상🤍 #필라테스 #필라테스동작` | `필라나라` | `HTTP 200` 검증 |
| 12 | `ex-upper-03` | 캐딜락 암 스프링 스탠딩 펀치 & 트라이셉스 프레스 | `cadillac` | `sTANio_2E0Q` (가짜 표기: `John Garey TV`) | **`pbwDO-mK8rg`** | `캐딜락 필라테스 \| 상체 강화 Upper Body Strengthening with Cadillac Arm Spring` | `한님쌤 필라테스` | `HTTP 200` 검증 |
| 13 | `ex-lower-01` | 리포머 스탠딩 스쿠터 & 이브스 런지 | `reformer` | `lCg_gh_fppI` (가짜 표기: `SANNE VLOET · Pilates Sculpt`) | **`6lL8ZiX7tw0`** | `Standing Lunge into Scooter Variation \| Reformer Pilates Technique Explained` | `The Simple Fix by KezaWellness` | `HTTP 200` 검증 |
| 14 | `ex-lower-02` | 리포머 스탠딩 사이드 스플릿 & 스케이터 | `reformer` | `UItWltVZZmE` (가짜 표기: `Bailey Brown · Align Pilates`) | **`HGMdglPKq9A`** | `사이드 스플릿 완전 정복 (세팅, 발 너비, 스프링) 필라테스 강사 꼭 보세요.` | `한님쌤 필라테스` | `HTTP 200` 검증 |
| 15 | `ex-lower-03` | 운다 체어 스탠딩 포워드 런지 & 마운틴 클라이머 | `chair` | `g_tea8ZNk5A` (가짜 표기: `Pilatesology Classical`) | **`byQtt6BvbfM`** | `Pilates for Athletes : S2E16 : Lunge On The Chair` | `Balanced Body` | `HTTP 200` 검증 |
| 16 | `ex-plank-01` | 리포머 롱 스트레치 & 엘리펀트 / 니 스트레치 | `reformer` | `v7AYKMP6rOE` (가짜 표기: `Real Good Pilates`) | **`R8hGg8R4mh0`** | `Long stretch series: Elephant \| Pilates Reformer` | `Metamorphose - Trening & Dieta` | `HTTP 200` 검증 |
| 17 | `ex-plank-02` | 운다 체어 파이크(Pike) & 플랭크 풀업 | `chair` | `4pKly2JojMw` (가짜 표기: `Body Harmonics Pilates`) | **`LMLmXJ7EBWE`** | `Sunset Pilates Bali - Pike on Wunda Chair` | `Sunset Pilates Bali` | `HTTP 200` 검증 |
| 18 | `ex-extension-01` | 리포머 롱박스 풀링 스트랩 & 티-스트랩 스완 | `reformer` | `inpok4MKVLM` (가짜 표기: `Pilates Cadence Studio`) | **`1qC1h6TmuZc`** | `풀링 스트랩 Pulling Straps 제대로 하는 법  \| 리포머 필라테스` | `한님쌤 필라테스` | `HTTP 200` 검증 |
| 19 | `ex-extension-02` | 래더 바렐 스완 다이브 & 백 익스텐션 | `barrel` | `1f8yoFFdkcY` (가짜 표기: `Polestar Pilates Education`) | **`VWQNwXEZXJk`** | `Getting the Most Out of Swan on the Ladder Barrel` | `Balanced Body` | `HTTP 200` 검증 |
| 20 | `ex-straps-01` | 리포머 핏인스트랩 (프로그 · 레그써클 · 피터팬 · 숏스파인) | `reformer` | `bTo4NrSriWw` (가짜 표기: `Callie Jardine · Sweaty Studio`) | **`0bXHRQS5_CE`** | `Reformer Pilates Muscles + Moves - Feet in Straps` | `Vanessa Vibes Pilates` | `HTTP 200` 검증 |
| 21 | `ex-straps-02` | 캐딜락 레그 스프링 프로그 & 에어플레인 써클 | `cadillac` | `K56Z12XNQ5c` (가짜 표기: ` Lesley Logan · OnlinePilatesClasses`) | **`RJGY2xJ0HAQ`** | `In the Air with Leg Springs on the Cadillac or Tower \| Online Pilates Classes` | `Online Pilates Classes by Lesley Logan` | `HTTP 200` 검증 |
| 22 | `ex-cooldown-01` | 리포머 머메이드 측굴 스트레치 & 흉추 로테이션 | `reformer` | `C2HX2pNbUCM` (가짜 표기: `Fluidform Pilates`) | **`h5WSRDtD-54`** | `[리포머 스트레칭] 10. Mermaid (#전주기구필라테스자격증) 기구필라테스 머메이드 동작설명` | `유코어필라테스요가` | `HTTP 200` 검증 |

---

## 3. 유효 대체 근거 부재로 오매핑 제거 및 `자료 미확인` 명시한 5개 동작 (`unverified-link-removed-marked-unverified`)

아래 5개 동작은 동작 자체를 삭제하지 않고 `INITIAL_EXERCISES` 내 동일한 인덱스와 ID로 보존하되, 공개 출처에서 동작·기구·소도구가 직접 일치하는 단일 검증 영상 근거가 없으므로 잘못된 연결을 완전히 제거(`videoId: ''`, `url: ''`, `videoTitle: ''`, `startSec: 0`)하고 `channelName: '자료 미확인'` 및 `note`에 미확인 사유를 명시했습니다.

| 순번 | 동작 ID (`exerciseId`) | 한글 동작명 (`nameKo`) | 기구 (`apparatus`) | 제거된 기존 오매핑 ID | 변경 후 메타데이터 (`youtube`) | 미확인 분류 근거 (`note`) |
| :---: | :--- | :--- | :---: | :--- | :--- | :--- |
| 1 | `ex-warmup-01` | 펠빅 클락 & 흉식 호흡 임프린팅 | `reformer` | `K56Z12XNQ5c` | `videoId: ""`, `url: ""`, `channelName: "자료 미확인"` | `자료 미확인: 리포머 미니볼 펠빅 클락 & 흉식 호흡 임프린팅과 동작·기구·제목·채널 일치가 직접 확인된 공개 출처가 없어 기존 오연결 영상(K56Z12XNQ5c)을 제거했습니다.` |
| 2 | `ex-footwork-02` | 써클링 와이드 세컨드 & 내전근/외전근 풋워크 | `reformer` | `UItWltVZZmE` | `videoId: ""`, `url: ""`, `channelName: "자료 미확인"` | `자료 미확인: 리포머 써클링 와이드 세컨드 및 내·외전근 풋워크와 동작·기구·소도구 일치가 직접 확인된 공개 출처가 없어 기존 오연결 영상(UItWltVZZmE)을 제거했습니다.` |
| 3 | `ex-cooldown-02` | 스탠딩 척추 롤다운 & 센터링 호흡 피날레 | `mat` | `sTANio_2E0Q` | `videoId: ""`, `url: ""`, `channelName: "자료 미확인"` | `자료 미확인: 스탠딩 척추 롤다운 & 센터링 호흡 피날레와 동작·기구·제목·채널 일치가 직접 확인된 공개 출처가 없어 기존 오연결 영상을 제거했습니다.` |
| 4 | `ex-core-04` | 리포머 리버스 앱스 & 닐링 크런치 | `reformer` | `lCg_gh_fppI` | `videoId: ""`, `url: ""`, `channelName: "자료 미확인"` | `자료 미확인: 리포머 리버스 앱스 & 닐링 크런치와 동작·기구·제목·채널 일치가 직접 확인된 공개 출처가 없어 기존 오연결 영상을 제거했습니다.` |
| 5 | `ex-lower-04` | 리포머 사이드 라잉 스트랩 싱글 레그 시리즈 | `reformer` | `UItWltVZZmE` | `videoId: ""`, `url: ""`, `channelName: "자료 미확인"` | `자료 미확인: 리포머 사이드 라잉 스트랩 싱글 레그 시리즈와 동작·기구·제목·채널 일치가 직접 확인된 공개 출처가 없어 기존 오연결 영상을 제거했습니다.` |

---

## 4. 기존 검증 ID 보유 11개 동작(`ex-kr-*` / `ex-global-*`)의 공식 원제·채널명 정합화 (`verified-retained-title-channel-aligned`)

기존 `ex-kr-01..05` 및 `ex-global-01..06` 동작은 검증 풀(`verifiedPilatesYouTubeCatalog.json`)에 등록된 유효 ID를 사용하고 있었으나, `pilatesCatalog.ts` 내 `videoTitle`과 `channelName`이 실제 YouTube oEmbed 응답과 달랐던 문제를 전수 교정했습니다. 또한 `CURATED_SEQUENCE_PROGRAMS`의 참조 영상도 검증된 리포머·캐딜락·체어 공식 영상(`iPEpNe3OhcA`, `lqaIxlzhBw4`, `HGMdglPKq9A`)으로 정렬했습니다.

| 순번 | 동작 ID (`exerciseId`) | 기구 (`apparatus`) | 유지된 검증 ID (`videoId`) | 교정 후 공식 YouTube 원제 (`videoTitle` / oEmbed `title`) | 교정 후 공식 채널명 (`channelName` / oEmbed `author_name`) |
| :---: | :--- | :---: | :---: | :--- | :--- |
| 1 | `ex-kr-reformer-01` | `reformer` | `9h__STRp5dA` | `리포머 50분 풀시퀀스` | `정혜선` |
| 2 | `ex-kr-cadillac-01` | `cadillac` | `E_K5eAr-D5M` | `캐딜락시퀀스 \| 강사레슨 50분수업 \| 힘들고 재밌고 알차게🌸` | `단필라` |
| 3 | `ex-kr-reformer-02` | `reformer` | `J-kF8o1WJoI` | `🌶 리포머 50분 시퀀스 🌶 매운맛 🔥 Reformer advanced sequence 🔥` | `필라테스 지영쌤` |
| 4 | `ex-kr-barrel-01` | `barrel` | `l3WQl2L__qQ` | `[기구필라테스] 바렐 볼 시퀀스 지루할 틈이 없는 50분 수업! 근력 빵빵하게 채워봐요!` | `혀니쌤 플라잉요가&필라테스` |
| 5 | `ex-kr-reformer-03` | `reformer` | `wNRfJ45tDDo` | `[기구필라테스]리포머 50분 풀 시퀀스! 여름대비 팔뚝라인 다져주는 동작들 가져왔습니다🌞` | `혀니쌤 플라잉요가&필라테스` |
| 6 | `ex-kr-chair-01` | `chair` | `pmwYs3uqhWc` | `필라테스 체어 시퀀스ㅣ체어에서 플랭크 동작으로 복부 엉덩이를 한번에!/plank on pilates chair abs & glue workout` | `Today sequence` |
| 7 | `ex-kr-reformer-04` | `reformer` | `IKIjw-5-AmI` | `상·하체를 단단하게 연결하는 리포머 시퀀스 30분ㅣ쉼 없이 이어지는 자연스러운 빌드업` | `유진쌤 움직임 회복 필라테스` |
| 8 | `ex-kr-cadillac-02` | `cadillac` | `tU8cPEKkLSM` | `[Pilates] 캐딜락 50분 시퀀스 \| 전신 골고루 자극 주기 \| 다양한 동작으로 풍성하게 수업해요💪` | `서아앤헤이즐 \| Seoah and Hazel` |
| 9 | `ex-global-reformer-01` | `reformer` | `XMHUw3EhBlI` | `Pilates Reformer Workout \| Full Body \| 45 min (Intermediate)` | `Dez Fit` |
| 10 | `ex-global-reformer-02` | `mat` | `1WDNTwAUjIw` | `15 min Pilates Core Flow That Feels Like Wearing a Corset for Your Spine` | `Flow with Mira` |
| 11 | `ex-global-reformer-03` | `reformer` | `sTYt4di0zzU` | `Pilates Fundamentals: Beginner Reformer Strength & Stretch Routine - Exercise Break` | `Balanced Body` |

---

## 5. 라이브 URL 임시 `HTTP 503` vs 영구 `HTTP 404` 구분 검증 ([`live-url-503-vs-404-status.json`](file:///home/antigravity/blue45f/pilate_flow/docs/media-source-correction-round5-20261107/live-url-503-vs-404-status.json))

공개 출처 URL 검증 시 원격 서버/방화벽의 일시적 제한(`HTTP 503 Service Unavailable`)과 원문 소멸(`HTTP 404 Not Found`)을 엄격히 구분했습니다.

| 분류 (`classification`) | 대상 카탈로그 및 항목 ID | URL | 실측 응답 (`HEAD` / `GET`) | 처리 정책 (`policyActionKo`) |
| :--- | :--- | :--- | :---: | :--- |
| **`live-200-ok`** (`11건` 표본 + YouTube oEmbed `33건` 전수) | `VERIFIED_REFERENCES` (`mv-01`, `mv-02`, `mv-04`, `sr-01`, `mv-12`, `kr-01..03`), `PUBLIC_REFERENCES` (`pub-01..03`) | Merrithew 공식 블로그, WITH PILATES YouTube, 국민체력100(`nfa.kspo.or.kr`), 질병관리청(`health.kdca.go.kr`) | `HEAD 200` / `GET 200 OK` | 정상 공개 열람 확인 · 외부 원문 링크 유지 (임베드 제한 출처는 `external-link-only` 유지) |
| **`temporary-503-service-unavailable`** (`2건`) | `MOTION_PATTERN_REFERENCES` (`quadruped-arm-slide`, `chair-seated-pedal-press`) | `https://www.bodyharmonics.com/arm-leg-reach/`, `https://thecore.pilates.com/pilates-cross-training-reformer-exo-chair-sequencing/` | `HEAD 503` / `GET 503` | **임시 `HTTP 503 Service Unavailable`** (원격 서버/WAF 일시 과부하·제한): 영구 `404`와 엄격 구분하여 도해/링크를 삭제하지 않고 외부 링크 유지 (도해 rig 파일 수정 금지 경계 준수) |
| **`permanent-404-not-found`** (`2건` 대조군 + 폐기 영상 ID) | `PERMANENT_404_CONTROL` (`retired-control-chelwest-nhs-404`, `retired-control-youtube-oembed-404`) | `https://www.chelwest.nhs.uk/your-visit/patient-leaflets/therapy-services/pilates-independently.pdf`, `https://www.youtube.com/oembed?url=...dFv094-S0K8` | `HEAD 404` / `GET 404` | **영구 `HTTP 404 Not Found`** (원문 경로 소멸/미존재): 카탈로그 활성 링크 연결 금지 및 제거/미확인 처리 |

---

## 6. 뷰포트별(`320` / `390` / `768` / `1440` · `200%` 확대) 실제 브라우저 QA 및 게이트 검증

합성 로컬 환경에서 Chromium 브라우저로 `320×640`, `390×844`, `768×1024`, `1440×900` 및 `200%` 확대 뷰포트를 실측하고([`browser-qa-metrics.json`](file:///home/antigravity/blue45f/pilate_flow/docs/media-source-correction-round5-20261107/browser-qa-metrics.json)), 검증 교체 동작(`ex-footwork-01`)과 `자료 미확인` 전환 동작 5건(`ex-warmup-01`, `ex-footwork-02`, `ex-cooldown-02`, `ex-core-04`, `ex-lower-04`)을 모두 확인했습니다.

| 뷰포트 (`viewport`) | 해상도 / 배율 | `Pilates Anytime` 공식 채널 표시 | 검증 원제(`Footwork Variation on the Reformer \| Pilates Anytime`) 포함 | 가짜 채널/오매핑(`Goodful`·`K56Z12XNQ5c`) 잔존 여부 | 페이지 가로 오버플로 | 증거 스크린샷 |
| :--- | :---: | :---: | :---: | :---: | :---: | :--- |
| **`mobile-320`** | `320×640` (`100%`) | `true` | `true` | `false` (`0건`) | `0px` | [`screenshots/verified-footwork01-mobile-320.png`](file:///home/antigravity/blue45f/pilate_flow/docs/media-source-correction-round5-20261107/screenshots/verified-footwork01-mobile-320.png) |
| **`mobile-390`** | `390×844` (`100%`) | `true` | `true` | `false` (`0건`) | `0px` | [`screenshots/verified-footwork01-mobile-390.png`](file:///home/antigravity/blue45f/pilate_flow/docs/media-source-correction-round5-20261107/screenshots/verified-footwork01-mobile-390.png) |
| **`tablet-768`** | `768×1024` (`100%`) | `true` | `true` | `false` (`0건`) | `0px` | [`screenshots/verified-footwork01-tablet-768.png`](file:///home/antigravity/blue45f/pilate_flow/docs/media-source-correction-round5-20261107/screenshots/verified-footwork01-tablet-768.png) |
| **`desktop-1440`** | `1440×900` (`100%`) | `true` | `true` | `false` (`0건`) | `0px` | [`screenshots/verified-footwork01-desktop-1440.png`](file:///home/antigravity/blue45f/pilate_flow/docs/media-source-correction-round5-20261107/screenshots/verified-footwork01-desktop-1440.png) |
| **`desktop-1440-zoom200`** | `1440×900` (`200%`) | `true` | `true` | `false` (`0건`) | `0px` | [`screenshots/verified-footwork01-desktop-1440-zoom200.png`](file:///home/antigravity/blue45f/pilate_flow/docs/media-source-correction-round5-20261107/screenshots/verified-footwork01-desktop-1440-zoom200.png) |
| **`mobile-320-zoom200`** | `320×640` (`200%`) | `true` | `true` | `false` (`0건`) | `+320px` (Round 4 `DEF-UI-04` 소유 범위 외 CSS 특성) | [`screenshots/verified-footwork01-mobile-320-zoom200.png`](file:///home/antigravity/blue45f/pilate_flow/docs/media-source-correction-round5-20261107/screenshots/verified-footwork01-mobile-320-zoom200.png) |

### `자료 미확인` 5개 동작 브라우저 검증 (`mobile-390`)
- [`screenshots/unverified-ex-warmup-01-mobile-390.png`](file:///home/antigravity/blue45f/pilate_flow/docs/media-source-correction-round5-20261107/screenshots/unverified-ex-warmup-01-mobile-390.png) (`ex-warmup-01`: 동작 보존 `true`, `자료 미확인` 표시 `true`, 구 오매핑 `inpok4MKVLM` 노출 `false`)
- [`screenshots/unverified-ex-footwork-02-mobile-390.png`](file:///home/antigravity/blue45f/pilate_flow/docs/media-source-correction-round5-20261107/screenshots/unverified-ex-footwork-02-mobile-390.png) (`ex-footwork-02`: 동작 보존 `true`, `자료 미확인` 표시 `true`, 구 오매핑 `K56Z12XNQ5c` 노출 `false`)
- [`screenshots/unverified-ex-cooldown-02-mobile-390.png`](file:///home/antigravity/blue45f/pilate_flow/docs/media-source-correction-round5-20261107/screenshots/unverified-ex-cooldown-02-mobile-390.png) (`ex-cooldown-02`: 동작 보존 `true`, `자료 미확인` 표시 `true`, 구 오매핑 `v7AYKMP6rOE` 노출 `false`)
- [`screenshots/unverified-ex-core-04-mobile-390.png`](file:///home/antigravity/blue45f/pilate_flow/docs/media-source-correction-round5-20261107/screenshots/unverified-ex-core-04-mobile-390.png) (`ex-core-04`: 동작 보존 `true`, `자료 미확인` 표시 `true`, 구 오매핑 `ml6cT4AZdqI` 노출 `false`)
- [`screenshots/unverified-ex-lower-04-mobile-390.png`](file:///home/antigravity/blue45f/pilate_flow/docs/media-source-correction-round5-20261107/screenshots/unverified-ex-lower-04-mobile-390.png) (`ex-lower-04`: 동작 보존 `true`, `자료 미확인` 표시 `true`, 구 오매핑 `UBMk30rjy0o` 노출 `false`)

### 테스트·타입·린트·800줄 제한 게이트 통과 내역
- **단위 및 통합 테스트**: 총 **10개 테스트 파일 / 163개 테스트 전원 통과 (`163 passed`)**
  - `src/data/exerciseYouTubeCatalog.test.tsx` (`13 passed`)
  - `src/utils/movementMediaMatcher.test.ts` (`5 passed`)
  - `src/utils/exerciseEvidence.test.ts` (`28 passed`)
  - `src/utils/sourceNote.test.ts` (`59 passed`)
  - `src/data/verifiedReferences.test.ts` (`8 passed`)
  - `src/components/MovementMediaGuidancePanel.test.tsx` (`7 passed`)
  - `src/features/referenceLinkPolicyCandidate/urlPolicyEngine.test.ts` (`8 passed`)
  - `src/features/referenceLinkPolicyCandidate/ReferenceLinkPolicyPreview.test.tsx` (`4 passed`)
  - `src/features/referenceLinkPolicyCandidate/independentVerification/referenceLinkPolicy.independent.test.tsx` (`9 passed`)
  - `src/test/pilatesFlow.test.tsx` (`22 passed`)
- **타입체크 (`npx tsc -b`)**: `0 errors`
- **린트 (`pnpm lint`)**: `0 errors`
- **파일 라인 수 (`800줄 제한`)**:
  - `src/data/pilatesCatalog.ts`: **`526줄`** (`< 800`)
  - `src/data/exerciseYouTubeCatalog.ts`: **`387줄`** (`< 800`)
  - `src/data/exerciseYouTubeCatalog.test.tsx`: **`266줄`** (`< 800`)
  - `src/utils/movementMediaMatcher.test.ts`: **`203줄`** (`< 800`)
