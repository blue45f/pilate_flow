# 동작 라이브러리 미디어·출처 실제 QA 독립 감사 보고서 (`docs/atlas-media-provenance-round4-20261107`)

- **감사 식별자**: `atlas-media-provenance-round4-20261107`
- **감사 일시 (UTC)**: `2026-11-07T11:35:04Z` ~ `2026-11-07T11:52:33Z`
- **독립 작업 브랜치**: `docs/atlas-media-provenance-round4-20261107`
- **소유 범위**: `docs/atlas-media-provenance-round4-20261107/**` (독립 감사 산출물 전용)
- **코드·데이터·도해 변경 여부**: **없음 (`0 files modified in src/**`)**
  - `src/components/ExerciseAtlasView.tsx`, `PackagePanel` / `package-panel/PackageDetail`, 공유 스토어, 스키마, 라우트, 테마, 도해 및 카탈로그 소스는 일절 수정하지 않았습니다.
- **윤리·보안·저작권 준수**:
  - 공개 읽기 가능한 URL에 대해 표준 `HEAD` / `Range: bytes=0-0` 요청 및 공식 YouTube oEmbed 엔드포인트(`https://www.youtube.com/oembed`)만 사용했습니다.
  - 로그인·유료 페이월·`robots.txt` 제한 우회 시도 `0건`, 영상 파일 다운로드 `0건`.
  - 저작권/라이선스 허용 여부나 해부학·임상 전문가 검수를 추정하지 않고, 실제 확인한 URL·타임스탬프(`checkedAt`)·HTTP 응답·oEmbed 메타데이터·DOM 실측 근거만 기록했습니다.

---

## 1. 산출물 목록 (Deliverables)

| 파일명 | 설명 | 크기 / 라인 수 |
| :--- | :--- | :--- |
| [`README.md`](file:///home/antigravity/blue45f/pilate_flow/docs/atlas-media-provenance-round4-20261107/README.md) | 98개 동작 매핑 요약, 기구별 표본 검증, 실제 브라우저 QA(320/390/768/1440·200%), 우선순위별 재현 결함 및 소유 파일 전달 보고서 | 본 문서 |
| [`movements-98-media-mapping.csv`](file:///home/antigravity/blue45f/pilate_flow/docs/atlas-media-provenance-round4-20261107/movements-98-media-mapping.csv) | `INITIAL_EXERCISES` 전체 98개 동작의 기구·출처 분류·직접 YouTube ID/URL·oEmbed 일치 여부·중복 그룹·패턴 도해·큐레이션 갤러리 매핑 전수 표 | 100 lines |
| [`media-provenance-ledger.json`](file:///home/antigravity/blue45f/pilate_flow/docs/atlas-media-provenance-round4-20261107/media-provenance-ledger.json) | 98개 동작 전수 원장 + 기구별 표본 16건 검증 + 중복 그룹 + 인메모리 정책 감사 결과 JSON | 9,381 lines (339 KB) |
| [`url-http-oembed-probes.json`](file:///home/antigravity/blue45f/pilate_flow/docs/atlas-media-provenance-round4-20261107/url-http-oembed-probes.json) | 참조 카탈로그(`VERIFIED_REFERENCES` 30건, `COURSE_REFERENCES` 32건, `PUBLIC_REFERENCES` 3건, `MOTION_CANDIDATE_RESEARCH` 2건) 및 22개 고유 YouTube ID 등 총 125개 항목(113개 고유 URL) 실시간 HTTP/oEmbed 검증 로그 | 2,378 lines (107 KB) |
| [`browser-qa-metrics.json`](file:///home/antigravity/blue45f/pilate_flow/docs/atlas-media-provenance-round4-20261107/browser-qa-metrics.json) | 합성(synthetic) 런타임 픽스처를 사용한 실제 헤드리스 Chromium 브라우저 QA(`320px`, `390px`, `768px`, `1440px`, `200%` 확대) 수치 원장 | 377 lines (12 KB) |
| [`TRACK_B_INDEPENDENT_VERIFICATION.md`](file:///home/antigravity/blue45f/pilate_flow/docs/atlas-media-provenance-round4-20261107/TRACK_B_INDEPENDENT_VERIFICATION.md) | 독립 검증 서브에이전트(Track B)의 데이터 정합성·소유 경계·브라우저 증거 교차 검증 보고서 | 독립 검증 문서 |
| `screenshots/*.png` | 모바일 상세창 이미지 로딩 실패, 임베드 거부 외부 링크 폴백, 긴 출처명(320/390/768/1440/200%), 뒤로가기/미저장 리뷰 가드 캡처 9종 | 9 PNG files |

---

## 2. 98개 동작 미디어·출처 매핑 전수 요약 (`INITIAL_EXERCISES`)

전체 전수 매핑은 [`movements-98-media-mapping.csv`](file:///home/antigravity/blue45f/pilate_flow/docs/atlas-media-provenance-round4-20261107/movements-98-media-mapping.csv) 및 [`media-provenance-ledger.json`](file:///home/antigravity/blue45f/pilate_flow/docs/atlas-media-provenance-round4-20261107/media-provenance-ledger.json)에 수록되어 있습니다.

### 2.1 기구별(Apparatus) 98개 동작 미디어·출처 분포

| 기구 (`apparatus`) | 전체 동작 수 | 오리지널 동작 (`original-*`, 직접 영상 없음) | 기존 카탈로그 동작 (`ex-*`, 직접 YouTube 보유) | 직접 영상이 `verifiedPilatesYouTubeCatalog.json`에 존재하는 수 | 직접 영상이 검증 풀에 **없는** 수 (무관 영상) | 카탈로그 제목이 실제 oEmbed 제목과 완전 일치 | 카탈로그 제목이 실제 oEmbed 제목과 불일치 | 임상/공공 동작 패턴 도해(`motionPatternReferences`) 보유 |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Mat (`mat`)** | **22** | 18 | 4 | 1 | 3 | 1 | 3 | 15 |
| **Reformer (`reformer`)** | **30** | 8 | 22 | 10 | 12 | 3 | 19 | 2 |
| **Cadillac (`cadillac`)** | **18** | 12 | 6 | 4 | 2 | 1 | 5 | 1 |
| **Chair (`chair`)** | **16** | 12 | 4 | 1 | 3 | 0 | 4 | 1 |
| **Barrel (`barrel`)** | **12** | 10 | 2 | 1 | 1 | 0 | 2 | 2 |
| **합계 (Total)** | **98** | **60** | **38** | **17** | **21** | **5** | **33** | **21** |

### 2.2 출처 분류(`getExerciseProvenance`) 및 연결 미디어 구조

1. **오리지널 계획 자료 (`original-*`, 총 60개 — [`src/data/originalMovements.ts`](file:///home/antigravity/blue45f/pilate_flow/src/data/originalMovements.ts))**:
   - **출처 배지**: `오리지널 계획 자료 · 직접 작성 · 원본 영상 출처 없음` (`kind: 'original'`).
   - **직접 연결 YouTube (`exercise.youtube`)**: 60개 모두 `videoId: ""`, `url: ""`, `channelName: "직접 작성한 계획 자료"`로 외부 직접 영상이 없습니다.
   - **도해 및 문서 근거 (`getMotionPatternReferences`)**: 60개 중 **21개 동작**(Mat 15, Reformer 2, Cadillac 1, Chair 1, Barrel 2)이 [`src/data/motionPatternReferences.ts`](file:///home/antigravity/blue45f/pilate_flow/src/data/motionPatternReferences.ts)의 자체 제작 3단계 SVG 동작 패턴 도해 및 공공/임상 문헌 출처와 연결됩니다.
   - **상세창 큐레이션 갤러리 (`getRelatedYouTubeVideosForExercise`)**: [`src/data/verifiedPilatesYouTubeCatalog.json`](file:///home/antigravity/blue45f/pilate_flow/src/data/verifiedPilatesYouTubeCatalog.json) (총 141개 oEmbed 확인 영상: 국내 76, 해외 65)에서 기구·카테고리 키워드로 매칭합니다.
     - **60개 중 58개 동작**: 1~8개의 관련 YouTube 영상을 반환합니다.
     - **누락 2개 동작 (`0개` 반환)**:
       - `#47` `original-chair-incline-support` (`인클라인 푸시 서포트`, Chair · Plank)
       - `#51` `original-chair-seated-back-reach` (`체어 시티드 백 리치`, Chair · Extension)
       - **원인**: [`src/data/exerciseYouTubeCatalog.ts`](file:///home/antigravity/blue45f/pilate_flow/src/data/exerciseYouTubeCatalog.ts#L74-L78)의 `AUDITED_TITLE_REQUIREMENTS` 정규식(`'incline-support': /fixed[\s-]*(?:seat|support)|incline[\s-]*support|고정\s*(?:좌면|지지)/i`, `'seated-back-reach': /seated.*(?:chest|back).*reach|(?:앉|시티드).*(?:가슴|체스트).*리치/i`)을 충족하는 체어 영상 제목이 후보 풀에 없어 빈 배열(`[]`)이 반환됩니다.

2. **기존 카탈로그 동작 (`ex-*`, 총 38개 — [`src/data/pilatesCatalog.ts`](file:///home/antigravity/blue45f/pilate_flow/src/data/pilatesCatalog.ts))**:
   - **출처 배지**: `출처 미검증 · 기존 자료 · 출처 미검증` (`kind: 'legacy'`).
   - **직접 연결 YouTube (`exercise.youtube`)**: 38개 모두 유효한 11자리 `videoId`를 가지나, **고유 `videoId`는 22개뿐**이며 **11개 `videoId`가 27개 동작에 중복 재사용**되고 있습니다.
   - 더욱이 실시간 YouTube oEmbed 대조 결과(`2026-11-07T11:52:33Z`), **38개 중 21개 동작(9개 고유 `videoId`)은 필라테스 기구 동작과 무관한 명상·홈 요가·맨몸 피트니스 영상**에 가짜 기구 제목과 가짜 채널명을 붙인 상태입니다(상세 내역은 4절 참조).

3. **외부 참조 원장 (`VERIFIED_REFERENCES`, `COURSE_REFERENCES`, `PUBLIC_REFERENCES`, `MOTION_CANDIDATE_RESEARCH`)**:
   - `VERIFIED_REFERENCES` ([`src/data/verifiedReferences.ts`](file:///home/antigravity/blue45f/pilate_flow/src/data/verifiedReferences.ts)): 총 30건 (해외 공식 웹사이트 문서 21건, 국내 유튜브 후보 9건). `professionallyApproved: 0`, `fullyReviewedVideos: 0`. 30건 중 5쌍(10건)이 동일한 Merrithew 다중 동작 문서 URL을 공유하여 고유 URL은 25개입니다.
   - `COURSE_REFERENCES` ([`src/data/courseReferences.ts`](file:///home/antigravity/blue45f/pilate_flow/src/data/courseReferences.ts)): 총 32건 (해외 기관 강좌 20건, 국내 교육기관/협회 12건). 32개 고유 URL 모두 `HTTP 200 OK` 확인.
   - `PUBLIC_REFERENCES` ([`src/data/publicReferences.ts`](file:///home/antigravity/blue45f/pilate_flow/src/data/publicReferences.ts)): 국민체력100 포털 3건. 3개 고유 URL 모두 `HTTP 200 OK` 확인.
   - `MOTION_CANDIDATE_RESEARCH` ([`src/data/motionCandidateResearch.ts`](file:///home/antigravity/blue45f/pilate_flow/src/data/motionCandidateResearch.ts)): 2건 (Merrithew `sr-01` 및 Balanced Body `sTYt4di0zzU`). 모두 `HTTP 200 OK` 확인.

---

## 3. 기구별 공개 읽기 가능 표본 검증 및 결함 유형 구분

임베드 거부→외부 링크 전환, HTTP 404/503, 제목/채널 불일치, 중복 매핑, 자동재생 정책(`autoplay=0`), 썸네일 불가 여부를 기구별(`mat`, `reformer`, `cadillac`, `chair`, `barrel`) 및 공공 포털 표본으로 구분하여 검증한 결과입니다.

| 표본 ID | 기구 | 대상 동작 / 참조 ID | 확인 URL | 확인 시각 (`checkedAt`) | HTTP / oEmbed 응답 | 구분 판정 및 실제 근거 |
| :--- | :---: | :--- | :--- | :---: | :---: | :--- |
| `sample-mat-01` | `mat` | `original-mat-quadruped-arm-slide` & `leg-slide` (`quadruped-arm-slide`, `quadruped-leg-slide`) | https://www.bodyharmonics.com/arm-leg-reach/ (합성 404 대조군: https://www.chelwest.nhs.uk/your-visit/patient-leaflets/therapies/pilates-independently.pdf) | `2026-11-07T11:52:26.417Z` (`2026-11-07T11:35:04.027Z`) | **`HTTP 503`** (합성 대조군: **`HTTP 404`**) | **[외부 문서 접근 불가 `503` / 합성 `404` 대조]** `src/models/quadrupedDrafts.ts:83`의 Body Harmonics 출처 URL이 `HTTP 503`을 반환함(또한 `chair-seated-pedal-press`의 `thecore.pilates.com` URL도 `HTTP 503` 반환). 앱 정책상 `external-link-only`로 분리되나 클릭 시 원문 열람이 실패할 수 있음. |
| `sample-mat-02` | `mat` | `VERIFIED_REFERENCES` `mv-02` & `mv-03` (`미니볼 사이드 린` / `힙 익스텐션`) | https://www.merrithew.com/blog/post/2020-06-23/stott-pilates-matwork-with-the-mini-stability-ball | `2026-11-07T11:52:15.476Z` | `HTTP 200 OK` | **[임베드거부→외부링크 정상 분리 + 중복 URL]** 웹사이트 문서는 `displayMode: "external-link-only"`, `embedAllowed: false`로 iframe 없이 외부 링크로만 연결됨. `mv-02`와 `mv-03`가 동일 URL을 공유하며, `observationPoints`(`48.821s`)는 seek 파라미터로 오용되지 않음. |
| `sample-mat-03` | `mat` | `ex-global-reformer-02` (`Flow with Mira 15분 코르셋 딥코어`) | https://www.youtube.com/watch?v=1WDNTwAUjIw&t=45s | `2026-11-07T11:52:31.594Z` | `HTTP 200 OK` / oEmbed 일치 | **[정상 (제목·채널 일치 / 수동 로드 `autoplay=0`)]** 실제 oEmbed 제목(`15 min Pilates Core Flow That Feels Like Wearing a Corset for Your Spine`) 및 작성자(`Flow with Mira`)가 카탈로그와 일치. 단, 동작 ID 접두어는 `reformer`이나 실제 `apparatus: "mat"`로 분류됨. |
| `sample-mat-04` | `mat` | `ex-warmup-03` (`매트 폼롤러 흉추 릴리즈`) | https://www.youtube.com/watch?v=sTANio_2E0Q&t=60s | `2026-11-07T11:52:26.647Z` | `HTTP 200 OK` / **oEmbed 불일치** | **[제목·채널·동작 불일치 + 3중 중복 ID]** 카탈로그는 `"Foam Roller Pilates Warmup"` / `"Jessica Valant Pilates"`로 표기하나, 실제 YouTube oEmbed는 **`"20 min Full Body STRETCH/YOGA for STRESS & ANXIETY Relief"` (`MadFit`)** 스트레칭 영상임. 또한 `ex-upper-03`(Cadillac), `ex-cooldown-02`(Mat)와 동일 ID 공유. |
| `sample-reformer-01` | `reformer` | `ex-warmup-01` (`펠빅 클락 & 흉식 호흡`) | https://www.youtube.com/watch?v=K56Z12XNQ5c&t=45s | `2026-11-07T11:52:25.845Z` | `HTTP 200 OK` / **제목·기구 불일치** | **[제목·기구 불일치 + 3중 중복 ID]** 실제 oEmbed는 **`"30 MIN FULL BODY WORKOUT \| At-Home Pilates"` (`Move With Nicole`)** 매트 홈트 영상이나, 카탈로그는 리포머(`ex-warmup-01`, `ex-upper-01`) 및 캐딜락(`ex-straps-02`) 3개 기구 동작에 각각 다른 가짜 제목/채널(`Flow With Mira`, `Lesley Logan`)로 중복 할당함. |
| `sample-reformer-02` | `reformer` | `ex-core-01` (`리포머 수파인 암워크 & 헌드레드`) | https://www.youtube.com/watch?v=inpok4MKVLM&t=210s | `2026-11-07T11:52:28.590Z` | `HTTP 200 OK` / **심각한 무관 영상** | **[심각한 제목·채널·내용 불일치 + 2중 중복 ID]** 카탈로그는 `"Reformer Abs in Straps"` (`Dez Fit`) 및 `"Long Box Pulling Straps"` (`Pilates Cadence Studio`, `ex-extension-01`)로 표기하나, 실제 YouTube oEmbed는 **`"5-Minute Meditation You Can Do Anywhere \| Goodful"` (`Goodful`)** 5분 명상 영상임. |
| `sample-reformer-03` | `reformer` | `ex-kr-reformer-01` (`kr-01`, `정혜선 리포머 50분`) | https://www.youtube.com/watch?v=9h__STRp5dA&t=60s | `2026-11-07T11:52:29.532Z` | `HTTP 200 OK` / 채널 일치·제목 축약 | **[채널 일치 / 제목 부제 추가 / 전문가 미검수 후보]** 실제 oEmbed는 `"리포머 50분 풀시퀀스"` (`정혜선`)이며 카탈로그는 `"리포머 50분 풀시퀀스 실전 티칭 루틴"`으로 표기. 50분 전체 수업 영상 중 `60s~360s` 구간이 지정되어 있으며 `VERIFIED_REFERENCES` 상태는 `korean-candidate`(전문가 미검수). |
| `sample-reformer-04` | `reformer` | `VERIFIED_REFERENCES` `mv-20` (`리포머 수파인 암 워크`) | https://www.merrithew.com/blog/post/2018-02-07/exercise-of-the-month-supine-arm-work-on-the-reformer | `2026-11-07T11:52:16.597Z` | `HEAD 404` -> **`GET 200 OK`** | **[서버 `HEAD` 거부 / `GET` 정상 열람]** Merrithew 구형 블로그 라우트(`2018-02-07`)는 HTTP `HEAD` 요청에 `404`를 반환하나 실제 브라우저 및 `GET` 요청에는 `200 OK`를 정상 반환함. `external-link-only` 정책 적용. |
| `sample-cadillac-01` | `cadillac` | `ex-warmup-02` (`캐딜락 롤다운 바`) | https://www.youtube.com/watch?v=C2HX2pNbUCM&t=30s | `2026-11-07T11:52:26.265Z` | `HTTP 200 OK` / **제목·채널·기구 불일치** | **[제목·채널·기구 불일치 + 3중 중복 ID]** 카탈로그는 `"Cadillac Roll-Down Bar"` (`Balanced Body Education`)로 표기하나, 실제 YouTube oEmbed는 **`"30 MIN FULL BODY WORKOUT \|\| At-Home Pilates (No Equipment)"` (`Move With Nicole`)** 맨몸 매트 영상임. `ex-upper-02`, `ex-cooldown-01`과 중복. |
| `sample-cadillac-02` | `cadillac` | `ex-kr-cadillac-01` (`kr-03`, `단필라 캐딜락 50분`) | https://www.youtube.com/watch?v=E_K5eAr-D5M&t=120s | `2026-11-07T11:52:29.839Z` | `HTTP 200 OK` / oEmbed 완전 일치 | **[정상 (제목·채널 완전 일치 / 전문가 미검수 후보)]** 실제 oEmbed 제목(`캐딜락시퀀스 \| 강사레슨 50분수업 \| 힘들고 재밌고 알차게🌸`) 및 채널(`단필라`) 완전 일치. |
| `sample-cadillac-03` | `cadillac` | `VERIFIED_REFERENCES` `mv-11` & `mv-12` (`캐딜락 타이 스트레치`) | https://www.merrithew.com/blog/post/2023-09-07/exercise-of-the-month-thigh-stretch-on-the-cadillac | `2026-11-07T11:52:16.110Z` | `HTTP 200 OK` | **[임베드거부→외부링크 정상 분리 + 중복 URL]** `mv-11`(힌지)과 `mv-12`(신전 변형)이 동일 Merrithew 공식 문서를 공유. `external-link-only`로 처리됨. |
| `sample-chair-01` | `chair` | `ex-footwork-03` (`운다 체어 풋워크`) & `ex-lower-03` (`체어 런지`) | https://www.youtube.com/watch?v=g_tea8ZNk5A&t=80s | `2026-11-07T11:52:27.648Z` | `HTTP 200 OK` / **심각한 무관 영상** | **[심각한 제목·채널·기구 불일치 + 2중 중복 ID]** 카탈로그는 `"Stability Chair Seated Footwork"` (`Merrithew Stott Pilates`) 및 `"Wunda Chair Going Up Front"` (`Pilatesology Classical`)로 표기하나, 실제 YouTube oEmbed는 **`"15 Min. Full Body Stretch \| Daily Routine for Flexibility, Mobility & Relaxation \| DAY 7"` (`Mady Morrison`)** 매트 스트레칭 영상임. |
| `sample-chair-02` | `chair` | `ex-kr-chair-01` (`kr-06`, `Today sequence 체어 플랭크`) | https://www.youtube.com/watch?v=pmwYs3uqhWc&t=30s | `2026-11-07T11:52:30.688Z` | `HTTP 200 OK` / 채널 일치·영문 부제 생략 | **[채널 일치 / 제목 영문 부제 생략]** 실제 oEmbed 제목은 한글 제목 뒤에 `/plank on pilates chair abs & glue workout`이 붙어 있으며 채널(`Today sequence`)은 일치. |
| `sample-chair-03` | `chair` | `original-chair-incline-support` (`#47`) & `original-chair-seated-back-reach` (`#51`) | (내부 큐레이션 갤러리 매칭) | `2026-11-07T11:35:17.928Z` | 큐레이션 매칭 `0건` | **[큐레이션 갤러리 빈 결과]** `getRelatedYouTubeVideosForExercise` 실행 시 `AUDITED_TITLE_REQUIREMENTS` 필터로 인해 상세창의 `검증된 필라테스 영상` 섹션이 아예 렌더링되지 않음(`totalCount: 0`). |
| `sample-barrel-01` | `barrel` | `ex-extension-02` (`래더 바렐 스완 다이브`) | https://www.youtube.com/watch?v=1f8yoFFdkcY&t=70s | `2026-11-07T11:52:28.918Z` | `HTTP 200 OK` / **심각한 무관 영상** | **[심각한 제목·채널·기구 불일치 + 2중 중복 ID]** 카탈로그는 `"Ladder Barrel Swan & Spine Extension Technique"` (`Polestar Pilates Education`)로 표기하나, 실제 YouTube oEmbed는 **`"10 MIN BEGINNER AB WORKOUT // No Equipment \| Pamela Reif"` (`Pamela Reif`)** 맨몸 복근 운동임. `ex-core-02`(Reformer)와 중복. |
| `sample-barrel-02` | `barrel` | `ex-kr-barrel-01` (`kr-05`, `혀니쌤 바렐 볼 시퀀스`) | https://www.youtube.com/watch?v=l3WQl2L__qQ&t=150s | `2026-11-07T11:52:30.119Z` | `HTTP 200 OK` / 채널 일치·부제 축약 | **[채널 일치 / 제목 후미 축약]** 실제 oEmbed 제목은 `"[기구필라테스] 바렐 볼 시퀀스 지루할 틈이 없는 50분 수업! 근력 빵빵하게 채워봐요!"` (`혀니쌤 플라잉요가&필라테스`)로 일치. |
| `sample-portal-01` | `mat` | `PUBLIC_REFERENCES[0]` (`국민체력100 성인 운동 프로그램`) | https://nfa.kspo.or.kr/classroom/program/0/selectPhysicalUpProgramByAgeSe04.kspo | `2026-11-07T11:52:25.002Z` | `HTTP 200 OK` | **[임베드거부→외부링크 정상 분리]** 공공 포털 URL은 `embedAllowed: false`, `displayMode: "external-link-only"`로 처리되어 외부 새 탭(`target="_blank" rel="noopener noreferrer"`)으로만 열림. |

---

## 4. 기존 카탈로그(`ex-*` 38개 동작)의 22개 고유 YouTube ID 실시간 oEmbed 전수 대조표

[`src/data/pilatesCatalog.ts`](file:///home/antigravity/blue45f/pilate_flow/src/data/pilatesCatalog.ts)에 정의된 38개 동작이 사용하는 **22개 고유 YouTube `videoId`** 전수를 `https://www.youtube.com/oembed`에 질의(`2026-11-07T11:52:25Z` ~ `11:52:33Z`)하여 실제 제목·채널과 대조한 결과입니다.

| # | `videoId` | 사용 동작 수 (동작 ID) | 카탈로그 표기 기구 | 카탈로그 표기 제목 (대표) | 카탈로그 표기 채널 (대표) | 실제 YouTube oEmbed 제목 | 실제 YouTube 채널 (`author_name`) | 검증 풀 포함 여부 | 판정 |
| :-: | :--- | :---: | :---: | :--- | :--- | :--- | :--- | :---: | :--- |
| 1 | `K56Z12XNQ5c` | **3개** (`ex-warmup-01`, `ex-upper-01`, `ex-straps-02`) | Reformer, Cadillac | `Reformer & Mat Warm-up...` / `Cadillac Leg Springs...` | `Move With Nicole` / `Flow With Mira` / `Lesley Logan` | `30 MIN FULL BODY WORKOUT \| At-Home Pilates` | `Move With Nicole` | O | **기구·제목·채널 불일치 (매트 영상을 리포머/캐딜락으로 위장 + 3중 중복)** |
| 2 | `C2HX2pNbUCM` | **3개** (`ex-warmup-02`, `ex-upper-02`, `ex-cooldown-01`) | Cadillac, Reformer | `Cadillac Roll-Down Bar...` / `Reformer Seated Arm...` | `Balanced Body` / `Margaret Elizabeth` / `Fluidform` | `30 MIN FULL BODY WORKOUT \|\| At-Home Pilates (No Equipment)` | `Move With Nicole` | O | **기구·제목·채널 불일치 (맨몸 영상을 캐딜락/리포머로 위장 + 3중 중복)** |
| 3 | `sTANio_2E0Q` | **3개** (`ex-warmup-03`, `ex-upper-03`, `ex-cooldown-02`) | Mat, Cadillac | `Foam Roller Pilates Warmup...` / `Cadillac Standing Arm...` | `Jessica Valant` / `John Garey TV` / `Boho Beautiful` | `20 min Full Body STRETCH/YOGA for STRESS & ANXIETY Relief` | `MadFit` | **X** | **무관 영상 (요가/스트레칭 영상을 가짜 제목·채널로 매핑 + 3중 중복)** |
| 4 | `lCg_gh_fppI` | **3개** (`ex-footwork-01`, `ex-lower-01`, `ex-core-04`) | Reformer | `50-Minute Reformer Footwork...` / `Reformer Glute...` | `gone adventuring` / `SANNE VLOET` / `Good Day Pilates` | `POP Pilates for Beginners - Total Body Workout` | `blogilates` | **X** | **무관 영상 (맨몸 POP Pilates를 리포머 3종으로 위장 + 3중 중복)** |
| 5 | `UItWltVZZmE` | **3개** (`ex-footwork-02`, `ex-lower-02`, `ex-lower-04`) | Reformer | `Magic Circle Reformer Footwork...` / `Reformer Side Splits...` | `Pilates Anytime` / `Bailey Brown` / `Kirsten King` | `20 MIN FULL BODY WORKOUT - Beginner Version // No Equipment I Pamela Reif` | `Pamela Reif` | **X** | **무관 영상 (맨몸 피트니스를 리포머 3종으로 위장 + 3중 중복)** |
| 6 | `g_tea8ZNk5A` | **2개** (`ex-footwork-03`, `ex-lower-03`) | Chair | `Stability Chair Seated Footwork...` / `Wunda Chair Going Up Front...` | `Merrithew Stott Pilates` / `Pilatesology Classical` | `15 Min. Full Body Stretch \| Daily Routine for Flexibility, Mobility & Relaxation \| DAY 7` | `Mady Morrison` | **X** | **무관 영상 (일반 스트레칭을 체어 2종으로 위장 + 2중 중복)** |
| 7 | `v7AYKMP6rOE` | **2개** (`ex-bridging-01`, `ex-plank-01`) | Reformer | `Reformer Bridging Variations...` / `Reformer Plank Flow...` | `Nell Hoess Pilates` / `Real Good Pilates` | `Yoga For Complete Beginners - 20 Minute Home Yoga Workout!` | `Yoga With Adriene` | **X** | **무관 영상 (입문 홈 요가를 리포머 2종으로 위장 + 2중 중복)** |
| 8 | `4pKly2JojMw` | **2개** (`ex-bridging-02`, `ex-plank-02`) | Cadillac, Chair | `Cadillac Tower Bridge...` / `Mastering the Wunda Chair Pike...` | `Korin Nolan` / `Body Harmonics Pilates` | `10 min Morning Yoga Full Body Stretch - Yoga with Kassandra` | `Yoga with Kassandra` | **X** | **무관 영상 (아침 요가를 캐딜락/체어로 위장 + 2중 중복)** |
| 9 | `inpok4MKVLM` | **2개** (`ex-core-01`, `ex-extension-01`) | Reformer | `Reformer Abs in Straps...` / `Long Box Pulling Straps...` | `Dez Fit` / `Pilates Cadence Studio` | `5-Minute Meditation You Can Do Anywhere \| Goodful` | `Goodful` | **X** | **무관 영상 (5분 명상 오디오/영상을 리포머 2종으로 위장 + 2중 중복)** |
| 10 | `1f8yoFFdkcY` | **2개** (`ex-core-02`, `ex-extension-02`) | Reformer, Barrel | `Short Box Abdominal Series...` / `Ladder Barrel Swan...` | `Alo Moves Pilates` / `Polestar Pilates Education` | `10 MIN BEGINNER AB WORKOUT // No Equipment \| Pamela Reif` | `Pamela Reif` | **X** | **무관 영상 (맨몸 복근 운동을 리포머/바렐로 위장 + 2중 중복)** |
| 11 | `bTo4NrSriWw` | **2개** (`ex-core-03`, `ex-straps-01`) | Mat, Reformer | `Classical Pilates Series of 5...` / `Reformer Feet in Straps...` | `Lottie Murphy Pilates` / `Callie Jardine` | `20 MIN FULL BODY WORKOUT (Intense Routine, No Equipment)` | `TRAIN WITH GAINSBYBRAINS` | **X** | **무관 영상 (맨몸 고강도 홈트를 매트/리포머로 위장 + 2중 중복)** |
| 12 | `9h__STRp5dA` | 1개 (`ex-kr-reformer-01`) | Reformer | `리포머 50분 풀시퀀스 실전 티칭 루틴` | `정혜선 · 공부하는 필라테스 원장 (KR)` | `리포머 50분 풀시퀀스` | `정혜선` | O | 채널·기구 일치 (제목에 `실전 티칭 루틴` 접미사 추가됨) |
| 13 | `E_K5eAr-D5M` | 1개 (`ex-kr-cadillac-01`) | Cadillac | `캐딜락시퀀스 \| 강사레슨 50분수업 \| 힘들고 재밌고 알차게🌸` | `단필라 (KR)` | `캐딜락시퀀스 \| 강사레슨 50분수업 \| 힘들고 재밌고 알차게🌸` | `단필라` | O | **제목·채널·기구 완전 일치** |
| 14 | `J-kF8o1WJoI` | 1개 (`ex-kr-reformer-02`) | Reformer | `🌶 리포머 50분 시퀀스 🌶 매운맛 🔥 Reformer advanced sequence 🔥` | `필라테스 지영쌤 (KR)` | `🌶 리포머 50분 시퀀스 🌶 매운맛 🔥 Reformer advanced sequence 🔥` | `필라테스 지영쌤` | O | **제목·채널·기구 완전 일치** |
| 15 | `l3WQl2L__qQ` | 1개 (`ex-kr-barrel-01`) | Barrel | `[기구필라테스] 바렐 볼 시퀀스 지루할 틈이 없는 50분 수업!` | `혀니쌤 플라잉요가&필라테스 (KR)` | `[기구필라테스] 바렐 볼 시퀀스 지루할 틈이 없는 50분 수업! 근력 빵빵하게 채워봐요!` | `혀니쌤 플라잉요가&필라테스` | O | 채널·기구 일치 (제목 후미 문구 축약) |
| 16 | `wNRfJ45tDDo` | 1개 (`ex-kr-reformer-03`) | Reformer | `[기구필라테스] 리포머 50분 풀 시퀀스! 여름대비 팔뚝라인 다져주는 동작들` | `혀니쌤 플라잉요가&필라테스 (KR)` | `[기구필라테스]리포머 50분 풀 시퀀스! 여름대비 팔뚝라인 다져주는 동작들 가져왔습니다🌞` | `혀니쌤 플라잉요가&필라테스` | O | 채널·기구 일치 (제목 후미 문구 축약) |
| 17 | `pmwYs3uqhWc` | 1개 (`ex-kr-chair-01`) | Chair | `필라테스 체어 시퀀스ㅣ체어에서 플랭크 동작으로 복부 엉덩이를 한번에!` | `Today sequence (KR)` | `필라테스 체어 시퀀스ㅣ체어에서 플랭크 동작으로 복부 엉덩이를 한번에!/plank on pilates chair abs & glue workout` | `Today sequence` | O | 채널·기구 일치 (영문 부제 축약) |
| 18 | `IKIjw-5-AmI` | 1개 (`ex-kr-reformer-04`) | Reformer | `상·하체를 단단하게 연결하는 리포머 시퀀스 30분ㅣ쉼 없이 이어지는 자연스러운 빌드업` | `유진쌤 움직임 회복 필라테스 (KR)` | `상·하체를 단단하게 연결하는 리포머 시퀀스 30분ㅣ쉼 없이 이어지는 자연스러운 빌드업` | `유진쌤 움직임 회복 필라테스` | O | **제목·채널·기구 완전 일치** |
| 19 | `tU8cPEKkLSM` | 1개 (`ex-kr-cadillac-02`) | Cadillac | `[Pilates] 캐딜락 50분 시퀀스 \| 전신 골고루 자극 주기` | `서아앤헤이즐 \| Seoah and Hazel (KR)` | `[Pilates] 캐딜락 50분 시퀀스 \| 전신 골고루 자극 주기 \| 다양한 동작으로 풍성하게 수업해요💪` | `서아앤헤이즐 \| Seoah and Hazel` | O | 채널·기구 일치 (제목 후미 문구 축약) |
| 20 | `XMHUw3EhBlI` | 1개 (`ex-global-reformer-01`) | Reformer | `Pilates Reformer Workout \| Full Body \| 45 min (Intermediate)` | `Dez Fit (Global)` | `Pilates Reformer Workout \| Full Body \| 45 min (Intermediate)` | `Dez Fit` | O | **제목·채널·기구 완전 일치** |
| 21 | `1WDNTwAUjIw` | 1개 (`ex-global-reformer-02`) | Mat (ID는 `reformer`) | `15 min Pilates Core Flow That Feels Like Wearing a Corset for Your Spine` | `Flow with Mira · BASI Faculty (Global)` | `15 min Pilates Core Flow That Feels Like Wearing a Corset for Your Spine` | `Flow with Mira` | O | **제목·채널 완전 일치** (단, 동작 ID가 `ex-global-reformer-02`이나 `apparatus: "mat"`) |
| 22 | `sTYt4di0zzU` | 1개 (`ex-global-reformer-03`) | Reformer | `Pilates Fundamentals: Beginner Reformer Strength & Stretch Routine` | `Balanced Body Official (Global)` | `Pilates Fundamentals: Beginner Reformer Strength & Stretch Routine - Exercise Break` | `Balanced Body` | O | 채널·기구 일치 (`- Exercise Break` 접미사 축약) |

---

## 5. 모바일 상세창(`YouTubeClipModal`) 실제 브라우저 QA 결과 (`320px`, `390px`, `768px`, `1440px`, `200%` 확대)

합성(synthetic) 런타임 픽스처를 로컬 스토리지에 주입하여 사용자 원본 데이터를 건드리지 않고 실제 헤드리스 Chromium(`127.0.0.1:5173`)에서 검증했습니다. 전체 측정치는 [`browser-qa-metrics.json`](file:///home/antigravity/blue45f/pilate_flow/docs/atlas-media-provenance-round4-20261107/browser-qa-metrics.json)에 저장되어 있습니다.

### 5.1 [QA 1] 모바일 상세창 이미지 로딩 실패 (`이미지 로딩실패`)

- **검증 시나리오**:
  1. `YouTubeClipModal` 내부 `ExerciseYouTubeGallery` ([`src/components/ExerciseYouTubeGallery.tsx`](file:///home/antigravity/blue45f/pilate_flow/src/components/ExerciseYouTubeGallery.tsx#L260))의 썸네일 `<img className="eyg-thumb-img" src="https://i.ytimg.com/vi/${video.videoId}/mqdefault.jpg">`에 존재하지 않는 ID(`00000000000`, `INVALID_ID_404`) 및 썸네일 실패 상황을 재현.
  2. 목록 페이지(`ExerciseAtlasView`) 아이디어 카드의 깨진 이미지(`https://invalid.example.test/broken-idea-photo-404.jpg`) 폴백과 비교.
- **실측 결과 (`390x844`, [`browser-qa-metrics.json`](file:///home/antigravity/blue45f/pilate_flow/docs/atlas-media-provenance-round4-20261107/browser-qa-metrics.json#L11-L68))**:
  - `ExerciseYouTubeGallery`의 `<img className="eyg-thumb-img">`는 `complete: true`, **`naturalWidth: 0`, `naturalHeight: 0`** 상태로 로드에 실패하더라도 **`onError` 핸들러나 대체 폴백 UI가 전혀 구현되어 있지 않습니다 (`anyFallbackRendered: false`, `hasOnErrorAttributeOrFallbackNode: false`)**.
  - 그 결과 모바일 상세창(`292x164px` 썸네일 박스)에 빈 배경/깨진 이미지 영역이 그대로 노출되며, 그 위에 `해외`/`영상 불러오기`/`시간 배지` 오버레이만 떠 있는 상태가 됩니다.
- **증거 스크린샷**:
  - [`screenshots/mobile-390-broken-thumbnail-gallery.png`](file:///home/antigravity/blue45f/pilate_flow/docs/atlas-media-provenance-round4-20261107/screenshots/mobile-390-broken-thumbnail-gallery.png)

### 5.2 [QA 2] 임베드 거부 → 외부 링크 폴백 및 수동 로드 자동재생 정책 (`임베드거부→외부링크 / 자동재생`)

- **검증 시나리오**:
  1. `exercise.youtube.embedRestricted: true`가 설정된 합성 동작으로 모바일 상세창(`390x844`) 오픈.
  2. 하단 `MovementMediaGuidancePanel`에서 `임베드 오류 전환` 버튼(`report-embed-failure-btn`) 클릭 시 외부 링크 폴백 동작 확인.
  3. 일반 동작(`ex-warmup-01`)에서 초기 오픈 시 iframe 자동 마운트 여부 및 `YouTube 영상 불러오기` 클릭 후 iframe 속성 확인.
- **실측 결과 ([`browser-qa-metrics.json`](file:///home/antigravity/blue45f/pilate_flow/docs/atlas-media-provenance-round4-20261107/browser-qa-metrics.json#L70-L101))**:
  - **초기 오픈 시 자동재생 방지 정상**: 상세창 오픈 직후 `iframeCountOnInitialOpen: 0`으로, 사용자 클릭 전에는 어떠한 YouTube iframe도 마운트되지 않습니다.
  - **수동 클릭 후 `autoplay=0` 및 `youtube-nocookie.com` 준수**: `YouTube 영상 불러오기` 클릭 시 마운트되는 iframe의 `src`는 `https://www.youtube-nocookie.com/embed/K56Z12XNQ5c?rel=0&autoplay=0&start=45&end=210`이며, `allow="encrypted-media; gyroscope; picture-in-picture"`에 `autoplay` 토큰이 제외되어 있습니다(`allowContainsAutoplayToken: false`).
  - **하단 `MovementMediaGuidancePanel` 임베드 제한 폴백 정상**: 임베드 차단 시 `"원본 채널 설정 또는 출처 정책에 의해 앱 내 임베드 재생이 제한되었습니다. 아래 외부 원본 보기 링크를 통해 공식 페이지에서 확인해 주세요."` 안내와 함께 `target="_blank" rel="noopener noreferrer"` 외부 원본 링크가 제공됩니다.
  - **[재현 결함 발견] 상단 히어로 플레이어(`YouTubeClipModal.tsx:762-793`)의 `embedRestricted` 플래그 무시**:
    - `MovementDetails`([`src/components/YouTubeClipModal.tsx`](file:///home/antigravity/blue45f/pilate_flow/src/components/YouTubeClipModal.tsx#L762-L793))는 `normalizeExternalMediaLink` 호출 시 `exercise.youtube.embedRestricted` 값을 `embedPolicy`에 전달하지 않아, `embedRestricted: true`인 동작에서도 상단 히어로 영역에는 여전히 `YouTube 영상 불러오기` iframe 버튼이 노출되고 외부 링크 폴백이 표시되지 않습니다(`heroIgnoresEmbedRestrictedFlagAndShowsLoadBtn: true`).
- **증거 스크린샷**:
  - [`screenshots/mobile-390-embed-restricted-external-fallback.png`](file:///home/antigravity/blue45f/pilate_flow/docs/atlas-media-provenance-round4-20261107/screenshots/mobile-390-embed-restricted-external-fallback.png)

### 5.3 [QA 3] 모바일·태블릿·데스크톱·200% 확대에서 긴 출처명·무공백 영문/URL 레이아웃 (`긴출처명`)

- **검증 시나리오**:
  - 매우 긴 한글/영문 무공백 제목, 긴 채널/기관명(`국제필라테스임상재활학회·Merrithew_STOTT_PILATES_BalancedBody_Polestar_BASI_연합공식아카이브센터...`), 긴 쿼리 파라미터가 포함된 외부 출처 URL 픽스처를 상세창에 렌더링하고 `320x640`, `390x844`, `768x1024`, `1440x900`, `1440x900 @ 200% zoom`, `320x640 @ 200% zoom`에서 가로 오버플로(`scrollWidth > clientWidth`)를 실측했습니다.
- **뷰포트별 실측 수치 ([`browser-qa-metrics.json`](file:///home/antigravity/blue45f/pilate_flow/docs/atlas-media-provenance-round4-20261107/browser-qa-metrics.json#L103-L350))**:

| 뷰포트 (`viewport`) | 해상도 / 배율 | 페이지 가로 오버플로 (`pageHorizontalOverflowPx`) | 상세창 본문 너비 (`modalBodyClientWidth`) | 상세창 본문 스크롤 너비 (`modalBodyScrollWidth`) | 상세창 본문 가로 오버플로 (`modalBodyHorizontalOverflowPx`) | 오버플로 발생 자식 요소 수 | 원인 요소 및 실측 근거 |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :--- |
| **`mobile-320`** | `320×640` (`100%`) | `0px` | `296px` | **`345px`** | **`+49px` (결함)** | `2개` | `.mmg-badge.mmg-badge--info` (`"내가 등록한 참고 자료 · 직접 등록 · 출처 자동 미확인"`)에 `white-space: nowrap`(`movement-media-guidance.css:133`)이 지정되어 배지 너비가 `294px`로 고정되면서 패딩이 적용된 카드 내부(`245px`)를 `+49px` 초과함 |
| **`mobile-390`** | `390×844` (`100%`) | `0px` | `366px` | `366px` | `0px` (정상) | `0개` | 긴 출처명·URL이 `.source-reference-panel`(`300px`), `.exercise-evidence-panel`(`302px`), `.eyg-grid`(`294px`) 내에서 줄바꿈 처리됨 |
| **`tablet-768`** | `768×1024` (`100%`) | `0px` | `734px` | `734px` | `0px` (정상) | `0개` | 모든 출처 패널·갤러리 정상 정렬 |
| **`desktop-1440`** | `1440×900` (`100%`) | `0px` | `898px` | `898px` | `0px` (정상) | `0개` | 모든 출처 패널·갤러리 정상 정렬 |
| **`desktop-1440-zoom200`** | `1440×900` (`200%`) | `0px` | `686px` | `686px` | `0px` (정상) | `0개` | 데스크톱 200% 확대 시 가로 스크롤 없이 정상 수용 |
| **`mobile-320-zoom200`** | `320×640` (`200%`) | `+320px` | `136px` | **`345px`** | **`+209px` (결함)** | `154개` | 320px 화면을 200% 확대(실효 폭 `160px`, 모달 본문 `136px`)할 때 `.eyg-grid`의 `minmax(215px, 1fr)`(`exercise-youtube-gallery.css:165`) 및 `.eyg-filter-pills`가 줄어들지 않아 `+209px` 가로 오버플로 발생 |

- **증거 스크린샷**:
  - [`screenshots/long-source-mobile-320.png`](file:///home/antigravity/blue45f/pilate_flow/docs/atlas-media-provenance-round4-20261107/screenshots/long-source-mobile-320.png)
  - [`screenshots/long-source-mobile-390.png`](file:///home/antigravity/blue45f/pilate_flow/docs/atlas-media-provenance-round4-20261107/screenshots/long-source-mobile-390.png)
  - [`screenshots/long-source-tablet-768.png`](file:///home/antigravity/blue45f/pilate_flow/docs/atlas-media-provenance-round4-20261107/screenshots/long-source-tablet-768.png)
  - [`screenshots/long-source-desktop-1440.png`](file:///home/antigravity/blue45f/pilate_flow/docs/atlas-media-provenance-round4-20261107/screenshots/long-source-desktop-1440.png)
  - [`screenshots/long-source-desktop-1440-zoom200.png`](file:///home/antigravity/blue45f/pilate_flow/docs/atlas-media-provenance-round4-20261107/screenshots/long-source-desktop-1440-zoom200.png)
  - [`screenshots/long-source-mobile-320-zoom200.png`](file:///home/antigravity/blue45f/pilate_flow/docs/atlas-media-provenance-round4-20261107/screenshots/long-source-mobile-320-zoom200.png)

### 5.4 [QA 4] 모바일 상세창 닫기·Escape·미저장 리뷰 보호·브라우저 뒤로가기 (`뒤로가기`)

- **검증 시나리오**:
  1. 상단 `닫기` 버튼(`.atelier-modal-close`) 클릭 시 모달 종료 여부.
  2. 키보드 `Escape` 입력 시 모달 종료 여부.
  3. 상세창 내 `검증 기록 수정` 폼에 텍스트 입력(dirty state) 후 닫기 클릭 시 미저장 보호 가드 작동 여부.
  4. 모바일 브라우저 하드웨어/제스처 뒤로가기(`window.history.back()` / `popstate`) 실행 시 상세창이 닫히는지 아니면 배경 히스토리만 이동하는지 확인.
- **실측 결과 ([`browser-qa-metrics.json`](file:///home/antigravity/blue45f/pilate_flow/docs/atlas-media-provenance-round4-20261107/browser-qa-metrics.json#L351-L376))**:
  - **상단 `닫기` 버튼 및 `Escape` 키**: 정상적으로 상세창이 닫히고 동작 목록 화면으로 복귀합니다(`passed: true`).
  - **미저장 리뷰 변경 가드 (`unsavedReviewCloseGuard`)**: 리뷰 노트를 수정한 상태에서 닫기를 누르면 모달이 즉시 닫히지 않고(`dialogKeptOpenOnUnsavedCloseAttempt: true`) 인라인 확인 배너(`.modal-close-confirm-banner`)가 표시되며, `저장하지 않고 닫기` 클릭 시에만 닫힙니다(`closedAfterExplicitDiscard: true`).
  - **[재현 결함 발견] 모바일 브라우저/하드웨어 뒤로가기(`popstate`) 미지원**:
    - 상세창(`YouTubeClipModal` / `LightDismissDialog`) 오픈 시 `history.pushState`를 수행하지 않으며(`modalPushedHistoryEntry: false`), `popstate` 이벤트 리스너도 등록되어 있지 않습니다.
    - 그 결과 모바일 사용자가 상세창을 닫으려고 기기/브라우저의 **뒤로가기(Back)**를 누르면 **상세창은 닫히지 않은 채 그대로 열려 있고(`dialogStillOpenAfterHistoryBack: true`), 뒤쪽의 브라우저 히스토리만 이전 페이지(`#atlas-list` → `#before-atlas`)로 이탈**합니다.
- **증거 스크린샷**:
  - [`screenshots/mobile-320-unsaved-review-close-guard.png`](file:///home/antigravity/blue45f/pilate_flow/docs/atlas-media-provenance-round4-20261107/screenshots/mobile-320-unsaved-review-close-guard.png)

---

## 6. 우선순위별 재현 결함 목록 및 소유 파일 전달 (Prioritized Reproducible Defects)

코드 변경 금지 원칙에 따라 아래 결함들은 수정하지 않고 **정확한 재현 경로·실측 근거·담당 소유 파일**을 정리하여 구현 담당자에게 전달합니다.

| 우선순위 | 결함 ID | 결함 요약 | 재현 방법 및 실측 근거 | 담당 소유 파일 (Owner Files) |
| :---: | :--- | :--- | :--- | :--- |
| **P1** | `DEF-MEDIA-01` | **기존 카탈로그(`ex-*`) 27개 동작의 YouTube ID가 명상·홈요가·맨몸운동 등 무관한 영상 및 중복 ID로 매핑됨 (가짜 기구 제목·채널 표기)** | 1. `INITIAL_EXERCISES` 중 `ex-core-01`(`inpok4MKVLM`), `ex-bridging-01`(`v7AYKMP6rOE`), `ex-footwork-03`(`g_tea8ZNk5A`), `ex-extension-02`(`1f8yoFFdkcY`) 등의 상세창을 열거나 `https://www.youtube.com/oembed`로 확인.<br>2. 38개 동작 중 **21개 동작(9개 고유 ID)**이 검증 풀(`verifiedPilatesYouTubeCatalog.json`)에 없는 무관한 영상(Goodful 5분 명상, Yoga With Adriene 홈요가, Pamela Reif 맨몸 복근 등)이며, **6개 동작(2개 고유 ID: `K56Z12XNQ5c`, `C2HX2pNbUCM`)**은 Move With Nicole의 매트 영상을 리포머/캐딜락 동작 및 타 채널명(`Balanced Body`, `Flow With Mira`, `Lesley Logan` 등)으로 잘못 표기함.<br>3. 또한 `getRelatedYouTubeVideosForExercise`가 검증 풀 여부와 무관하게 `exercise.youtube.videoId`를 `"검증된 필라테스 영상"` 갤러리 첫 번째 카드로 강제 삽입함. | - [`src/data/pilatesCatalog.ts`](file:///home/antigravity/blue45f/pilate_flow/src/data/pilatesCatalog.ts#L256-L1400)<br>- [`src/data/exerciseYouTubeCatalog.ts`](file:///home/antigravity/blue45f/pilate_flow/src/data/exerciseYouTubeCatalog.ts#L177-L195) |
| **P1** | `DEF-MEDIA-02` | **동작 패턴 도해(`MOTION_PATTERN_REFERENCES`)의 외부 출처 링크 2건(`bodyharmonics.com`, `thecore.pilates.com`)이 `HTTP 503` 응답 반환 (및 합성 `404` 대조)** | 1. `quadruped-arm-slide`·`quadruped-leg-slide`([`src/models/quadrupedDrafts.ts:83`](file:///home/antigravity/blue45f/pilate_flow/src/models/quadrupedDrafts.ts#L83))의 `https://www.bodyharmonics.com/arm-leg-reach/` 요청 시 `HTTP 503` 반환(`2026-11-07T11:52:26.417Z`).<br>2. `chair-seated-pedal-press`([`src/data/motionApparatusSourceLedger.json`](file:///home/antigravity/blue45f/pilate_flow/src/data/motionApparatusSourceLedger.json))의 `https://thecore.pilates.com/pilates-cross-training-reformer-exo-chair-sequencing/` 요청 시 `HTTP 503` 반환(`2026-11-07T11:52:28.677Z`).<br>3. 합성 `404` 대조군(`chelwest.nhs.uk/.../pilates-independently.pdf`)과 마찬가지로 외부 링크(`external-link-only`) 클릭 시 원문 열람 실패 가능. | - [`src/models/quadrupedDrafts.ts`](file:///home/antigravity/blue45f/pilate_flow/src/models/quadrupedDrafts.ts#L83)<br>- [`src/data/motionApparatusSourceLedger.json`](file:///home/antigravity/blue45f/pilate_flow/src/data/motionApparatusSourceLedger.json)<br>- [`src/data/motionPatternReferences.ts`](file:///home/antigravity/blue45f/pilate_flow/src/data/motionPatternReferences.ts) |
| **P2** | `DEF-UI-03` | **모바일 상세창 `ExerciseYouTubeGallery` 썸네일 이미지(`eyg-thumb-img`) 로딩 실패 시 `onError` 폴백 부재** | 1. 모바일(`390x844` / `320x640`)에서 상세창 오픈 후 `i.ytimg.com/vi/.../mqdefault.jpg`가 404이거나 네트워크 차단될 때 확인.<br>2. `<img className="eyg-thumb-img">`가 `naturalWidth: 0`인 깨진 상태로 DOM에 남아 있으며(`anyFallbackRendered: false`), 안내 문구나 플레이스홀더 아이콘이 표시되지 않음. | - [`src/components/ExerciseYouTubeGallery.tsx`](file:///home/antigravity/blue45f/pilate_flow/src/components/ExerciseYouTubeGallery.tsx#L254-L270)<br>- [`src/styles/exercise-youtube-gallery.css`](file:///home/antigravity/blue45f/pilate_flow/src/styles/exercise-youtube-gallery.css#L186-L205) |
| **P2** | `DEF-UI-04` | **`320px` 모바일 상세창에서 긴 출처 분류 배지(`.mmg-badge`) 및 `200%` 확대 시 갤러리 그리드(`.eyg-grid`) 가로 오버플로 발생** | 1. `320x640` (`zoom: 1`)에서 상세창 오픈 시 `.mmg-badge`의 `white-space: nowrap` 때문에 배지 폭(`294px`)이 카드 내부 폭(`245px`)을 초과하여 `.atelier-modal-body`에 **`+49px` 가로 오버플로**(`scrollWidth: 345` vs `clientWidth: 296`) 발생.<br>2. `320x640` (`zoom: 2`)에서는 `.eyg-grid`의 `minmax(215px, 1fr)` 및 `.eyg-filter-pills`가 `clientWidth: 136px`를 초과하여 **`+209px` 가로 오버플로** 발생. | - [`src/styles/movement-media-guidance.css`](file:///home/antigravity/blue45f/pilate_flow/src/styles/movement-media-guidance.css#L125-L145)<br>- [`src/styles/exercise-youtube-gallery.css`](file:///home/antigravity/blue45f/pilate_flow/src/styles/exercise-youtube-gallery.css#L38-L55)<br>- [`src/styles/exercise-youtube-gallery.css`](file:///home/antigravity/blue45f/pilate_flow/src/styles/exercise-youtube-gallery.css#L162-L170) |
| **P2** | `DEF-UI-05` | **모바일 상세창 오픈 상태에서 브라우저/기기 뒤로가기(`popstate`) 실행 시 상세창이 닫히지 않고 배경 히스토리만 이탈** | 1. 동작 목록에서 카드를 눌러 상세창(`YouTubeClipModal`) 오픈.<br>2. 모바일 기기 뒤로가기 또는 `window.history.back()` 실행.<br>3. `LightDismissDialog` / `YouTubeClipModal`이 히스토리 엔트리를 푸시하지 않고 `popstate`를 처리하지 않아, 상세창은 열린 채(`dialogStillOpenAfterHistoryBack: true`) 뒤쪽 URL만 이전 히스토리로 이동함. | - [`src/components/LightDismissDialog.tsx`](file:///home/antigravity/blue45f/pilate_flow/src/components/LightDismissDialog.tsx#L52-L129)<br>- [`src/components/YouTubeClipModal.tsx`](file:///home/antigravity/blue45f/pilate_flow/src/components/YouTubeClipModal.tsx#L1615-L1662) |
| **P2** | `DEF-UI-06` | **상세창 상단 히어로 미디어 영역(`MovementDetails`)이 `exercise.youtube.embedRestricted: true` 플래그를 무시하고 임베드 로드 버튼을 노출** | 1. `exercise.youtube.embedRestricted === true`인 동작을 상세창에서 오픈.<br>2. 하단 `MovementMediaGuidancePanel`은 임베드 제한을 감지할 수 있으나, 상단 `.movement-detail-media`(`YouTubeClipModal.tsx:762-793`)는 `normalizeExternalMediaLink` 호출 시 `embedPolicy: 'external-link-only'`를 전달하지 않아 `YouTube 영상 불러오기` 버튼이 그대로 노출되고 외부 원본 링크 폴백이 렌더되지 않음. | - [`src/components/YouTubeClipModal.tsx`](file:///home/antigravity/blue45f/pilate_flow/src/components/YouTubeClipModal.tsx#L758-L796) |
| **P3** | `DEF-DATA-07` | **오리지널 체어 동작 2건(`original-chair-incline-support`, `original-chair-seated-back-reach`)에서 큐레이션 YouTube 갤러리가 `0건` 반환됨** | 1. `#47` `인클라인 푸시 서포트` 또는 `#51` `체어 시티드 백 리치` 상세창 오픈.<br>2. `AUDITED_TITLE_REQUIREMENTS` 정규식 조건이 너무 엄격하여 `getRelatedYouTubeVideosForExercise`가 빈 배열(`[]`)을 반환하고 갤러리 섹션이 생략됨. | - [`src/data/exerciseYouTubeCatalog.ts`](file:///home/antigravity/blue45f/pilate_flow/src/data/exerciseYouTubeCatalog.ts#L74-L78) |
| **P3** | `DEF-DATA-08` | **`VERIFIED_REFERENCES` 내 5쌍(10건)의 중복 URL 공유 및 Merrithew 구형 포스트의 `HEAD 404` 응답 특성** | 1. `mv-02`/`mv-03`, `mv-06`/`mv-07`, `mv-08`/`mv-09`, `mv-11`/`mv-12`, `mv-14`/`mv-15`가 각각 동일한 Merrithew 블로그 URL을 공유함.<br>2. 또한 Merrithew 2018~2019년 일부 포스트(`mv-04` 구 URL, `mv-12` 구 URL, `mv-20` 등)는 `HEAD` 요청에 `404`를 반환하고 `GET` 요청에만 `200 OK`를 반환하므로 자동 링크 체커 구현 시 `GET` 폴백이 필요함. | - [`src/data/verifiedReferences.ts`](file:///home/antigravity/blue45f/pilate_flow/src/data/verifiedReferences.ts) |
