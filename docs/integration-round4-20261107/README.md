# 최신 통합 보존 및 교차 회귀 독립 검증 — 통합 Round 4 (2026-11-07)

## 1. 검증 목적 및 소유 경계
- **대상 저장소**: `blue45f/pilate_flow`
- **검증 기준 고정 `origin/main` HEAD SHA**: `606f7ad41777e6366eb15b168e6b80486f2ed112` (`606f7ad4`)
- **검증 범위**:
  1. 원격 `origin/main` HEAD(`606f7ad41777e6366eb15b168e6b80486f2ed112`)에 **도해(`b2d6022b`), PWA(`644185d8`), 수업기록(`606f7ad4`)** 커밋이 모두 실제 Git ancestry(`git merge-base --is-ancestor`)로 보존되어 있는지 정확한 전체 SHA 및 확인 시각과 함께 검증
  2. 격리 환경(임시 프로필 `/tmp/pilates-round4-vp-*`, 자체 정적 서버, 합성 fixture 데이터)에서 **`390px` · `768px` · `1440px` 실브라우저 연속 흐름**:
     `동작찾기(도해 b2d6022b 확인) → 수업안추가/순서변경 → 저장/기록생성(정오 12:00 · 자정 00:00 · 날짜전용 합성 fixture 포함) → 수업기록재사용(시각보존 606f7ad4 및 이 수업 다시 계획 복원) → 오프라인 새 진입(PWA 쿼리 /?utm_source=pwa · /?q=... · / 데이터 불변 644185d8)` 검증
  3. 개별 단위 테스트 반복 대신 **변경 간 연결(도해 ↔ 빌더 ↔ 기록 모달/바인더 ↔ PWA 오프라인 진입)에서 발생하는 교차 지점** 집중 점검
- **엄격한 소유 및 비간섭 원칙 준수**:
  - **독점 소유 경로**: `docs/integration-round4-20261107/**` (독립 브랜치 `docs/integration-round4-20261107`에 보존)
  - **수정 금지 준수**: 원본 소스(`src/**`), 공유 CSS(`src/styles/**`), 스토어(`usePilatesStore.ts`), 도해, PWA(`scripts/pwa-build.ts`), `main` 브랜치 수정 **0건** (기록 담당의 `ClassBinderView` 모바일 필터 작업과 충돌 원천 차단)
  - **정리 및 배포 금지 준수**: 테스트 종료 시 자체 정적 서버 및 임시 브라우저 프로필만 즉시 삭제 완료, 운영 배포(`firebase deploy`)·사용자 원본 데이터/운영 서비스워커 변경·새 패키지 설치·유료 API 호출 **0건**

---

## 2. 원격 `origin/main` 실제 Git Ancestry 보존 확인

- **Ancestry 확인 시각**:
  - UTC: `2026-11-07T11:02:05Z` (최초 확인 `2026-11-07T10:45:30Z`)
  - KST (`Asia/Seoul`): `2026-11-07 20:02:05+09:00` (최초 확인 `2026-11-07 19:45:30+09:00`)
- **현재 원격 `origin/main` 고정 HEAD SHA**: `606f7ad41777e6366eb15b168e6b80486f2ed112`

| 영역 | 단축 SHA | 정확한 전체 SHA (40자) | 커밋 제목 | `git merge-base --is-ancestor <SHA> origin/main` |
| --- | --- | --- | --- | --- |
| **도해 (Merge)** | `b2d6022b` | `b2d6022b8109ad74b01bca817a0788c49aa63cd2` | `Merge branch 'feat/apply-diagram-contact-fixes-20261107': apply minimal 2D diagram pose-apparatus contact fixes to src and re-verify` | **PASS (`true`)** |
| **도해 (Impl)** | `55ce22d3` | `55ce22d30d19a9ed7a080f314f82f94ba10987fc` | `fix(diagrams): apply minimal pose-apparatus contact fixes (D-01..D-05) and verify real app renderer` | **PASS (`true`)** |
| **PWA (Merge)** | `644185d8` | `644185d8c3a29a0f5967f6acecd5647ab90e2681` | `Merge branch 'fix/r3-01-pwa-navigate-query-offline-20261107': fix R3-01 root navigate query-string offline fallback` | **PASS (`true`)** |
| **PWA (Impl)** | `c477422d` | `c477422dbbcb057764f78ec6be43b63c5869ec58` | `fix(pwa): allow root navigate with non-auth query strings to use offline shell fallback (R3-01)` | **PASS (`true`)** |
| **수업기록 (Merge)** | `606f7ad4` | `606f7ad41777e6366eb15b168e6b80486f2ed112` | `Merge branch 'fix/history-noon-midnight-time-regression-20261107': preserve valid 12:00/00:00 ISO class times and hide only explicit date-only records` | **PASS (`true`)** |
| **수업기록 (Impl)** | `624e2c18` | `624e2c189fb7845205bc5b6954778d0cd5372d13` | `fix(history): preserve valid 12:00/00:00 ISO class times and hide only explicit date-only records` | **PASS (`true`)** |

---

## 3. Safari / WebKit 실행 가능 여부 판정
- **실제 WebKit 브라우저 런타임 실행 여부**: **`UNVERIFIED (미검증)`**
  - 컨테이너 환경 내 `/usr/bin/safari`, `/usr/bin/MiniBrowser`, `/usr/bin/WebKitWebProcess`, `/usr/bin/epiphany`, `/usr/bin/midori`, `/usr/local/bin/webkit` 전수 탐색 결과 `webkitRuntimeAvailable: false` 확인.
  - 지침에 따라 Chromium 실브라우저 실행 결과를 Safari PASS로 간주하지 않고 `UNVERIFIED (미검증)`로 명시합니다.

---

## 4. `390px` · `768px` · `1440px` 실브라우저 연속 흐름 교차 회귀 검증 결과

고정 HEAD(`606f7ad41777e6366eb15b168e6b80486f2ed112`)에서 빌드한 정적 번들(`dist/`, `42 real static files`)을 대상으로 `TZ=Asia/Seoul` 및 UTC 양쪽에서 뷰포트별 독립 격리 프로필을 생성하여 연속 흐름을 실행했습니다.

| 연속 흐름 단계 | 검증 내용 (도해 `b2d6022b` + 수업기록 `606f7ad4` + PWA `644185d8` 연결) | `390×844` | `768×1024` | `1440×900` |
| --- | --- | --- | --- | --- |
| **① 동작찾기 & 도해 확인** | `ExerciseAtlasView`에서 `스트랩 프로그 준비`(`D-01`) 검색 → 상세 모달 `참고 자세 그림` 펼침 → `svg.movement-phase-diagram-svg`(`reformer-strap-frog-isolated`, 관절 노드 `7`개, `NaN`/`undefined` 없음, 오버플로 `0px`) 확인 후 매트 동작 2개(`누워서 호흡 관찰`, `골반 시계`) 수업안에 추가 | **PASS** (`0px` overflow) | **PASS** (`0px` overflow) | **PASS** (`0px` overflow) |
| **② 수업안추가 & 순서변경** | `SequenceWorkbench` 진입 → `이 위치에 휴식 넣기`로 3스텝(`["누워서 호흡 관찰", "골반 시계", "중간 휴식"]`) 구성 → 2번 카드 `위로 이동` 클릭 → **`["골반 시계", "누워서 호흡 관찰", "중간 휴식"]` 순서 스왑(`orderSwapped: true`)** 확인 | **PASS** (`0px` overflow) | **PASS** (`0px` overflow) | **PASS** (`0px` overflow) |
| **③ 저장 & 정오/자정 합성 기록** | 합성 제목 `[합성-R4-{vp}] 도해·순서변경·기록·오프라인 연속흐름` 저장(`button.save-flow`) → `진행한 수업 기록`(`LogSessionModal`) 제출 → 스냅샷 기반으로 로컬 **정오(`12:00`) ISO**, **자정(`00:00`) ISO**, **날짜전용(`2026-11-05`)** 합성 fixture 생성 | **PASS** | **PASS** | **PASS** |
| **④ 수업기록 시각보존 & 재사용** | `ClassBinderView`(`기록`)에서 정오 카드 배지 **`"12:00"`**, 자정 카드 배지 **`"00:00"`**, 날짜전용 카드 배지 **`null`(숨김)** 확인(`606f7ad4`) → 정오 카드에서 **`이 수업 다시 계획`** 클릭 → `SequenceWorkbench`로 복귀 및 순서 변경된 3스텝(`["골반 시계", "누워서 호흡 관찰", "중간 휴식"]`) 100% 복원 확인 | **PASS** (`12:00` / `00:00` / `null`) | **PASS** (`12:00` / `00:00` / `null`) | **PASS** (`12:00` / `00:00` / `null`) |
| **⑤ 오프라인 새 진입 (PWA 쿼리 포함)** | 서버 소켓 즉시 차단(`setOffline(true)`) + CDP `offline: true` 전환 후 **`/?utm_source=pwa`**, **`/?q=%EC%8A%A4%ED%8A%B8%EB%9E%A9&apparatus=reformer`**, **`/`** 3개 경로로 각각 `Page.navigate` 새로 진입 → 재사용 중인 수업안 제목·3스텝 순서·`savedSequences`·정오/자정 `historyLogs` 타임스탬프·스토리지 바이트 및 SHA-256 **100% 불변(`dataInvariant: true`)** 확인 | **PASS** (3/3 불변) | **PASS** (3/3 불변) | **PASS** (3/3 불변) |

---

## 5. 변경 간 연결(Cross-Feature Connection)에서 확인된 교차 관찰 사항

개별 단위 테스트에서는 드러나지 않고 모듈 간 실제 연결 흐름에서 확인된 교차 지점 2건을 기록합니다(원본 소스 무수정 원칙에 따라 코드 수정 없이 보고):

1. **`R4-OBS-01` (`LogSessionModal.tsx:161` ↔ `ClassBinderView.tsx:124` 날짜 입력 모달과 정오 시각 배지 연결)**:
   - **현상**: `606f7ad4`(`624e2c18`)에서 실제 정오(`12:00`) 및 자정(`00:00`) ISO 시각을 보존하기 위해 `T12:00:00`/`T00:00:00` 휴리스틱 숨김을 제거하고 명시적 date-only 메타데이터(`YYYY-MM-DD`, `dateOnly: true`, `timestamps: 'unrecorded'`)만 숨기도록 변경되었습니다.
   - **연결 지점**: 반면 [`src/components/LogSessionModal.tsx`](file:///home/antigravity/blue45f/pilate_flow/src/components/LogSessionModal.tsx#L161)는 UI에서 날짜(`<input type="date">`, `YYYY-MM-DD`)만 입력받으면서도 저장 시 `new Date(`${taughtDate}T12:00:00`).toISOString()`을 생성하고 `dateOnly: true`나 `timestamps: 'unrecorded'`를 부여하지 않습니다.
   - **결과**: 사용자가 `진행한 수업 기록` 모달(날짜만 선택)로 새로 남긴 기록 카드에도 `ClassBinderView`에서 `.teaching-history-time-of-day` 배지(`"12:00"`)가 표시됩니다(`uiModalBadge === "12:00"`). 스냅샷 보존·재사용(`이 수업 다시 계획`)·오프라인 보존 기능에는 영향이 없으나, 날짜 전용 입력 모달의 의도를 유지하려면 추후 `LogSessionModal`에서 `dateOnly: true`(또는 시간 입력 필드)를 전달하는 후속 정합성 조율이 권장됩니다.
2. **`R4-OBS-02` (`SequenceWorkbench` 초기 기본 기구 `'mat'` ↔ `ExerciseAtlasView` 전체 기구 검색 후 즉시 추가 시 가드 연결)**:
   - `새 수업 만들기` 직후 기본 수업 기구(`activeApparatus`)는 `'mat'`로 설정됩니다. 이 상태에서 `ExerciseAtlasView`에서 `필터 초기화`로 리포머 동작(`스트랩 프로그 준비`)을 검색해 바로 `수업에 추가`를 누르면 스토어의 기구 일치 가드(`현재 선택한 기구·소도구와 최대 난이도 조건에 맞는 동작만 추가할 수 있습니다.`)가 작동하며, 기구 필터/수업 조건을 맞춘 뒤 추가하면 정상 반영됩니다.

---

## 6. 증적 파일 목록
- **검증 스크립트**: [`docs/integration-round4-20261107/verify-integration-round4.mjs`](file:///home/antigravity/blue45f/pilate_flow/docs/integration-round4-20261107/verify-integration-round4.mjs)
- **수치 요약 JSON**: [`docs/integration-round4-20261107/evidence/round4-cross-regression-summary.json`](file:///home/antigravity/blue45f/pilate_flow/docs/integration-round4-20261107/evidence/round4-cross-regression-summary.json)
- **뷰포트별 스크린샷 (9장)**:
  - `docs/integration-round4-20261107/evidence/screenshots/r4-390-01-workbench-reordered-saved.png`
  - `docs/integration-round4-20261107/evidence/screenshots/r4-390-02-history-noon-midnight.png`
  - `docs/integration-round4-20261107/evidence/screenshots/r4-390-03-offline-pwa-fresh-entry.png`
  - `docs/integration-round4-20261107/evidence/screenshots/r4-768-01-workbench-reordered-saved.png`
  - `docs/integration-round4-20261107/evidence/screenshots/r4-768-02-history-noon-midnight.png`
  - `docs/integration-round4-20261107/evidence/screenshots/r4-768-03-offline-pwa-fresh-entry.png`
  - `docs/integration-round4-20261107/evidence/screenshots/r4-1440-01-workbench-reordered-saved.png`
  - `docs/integration-round4-20261107/evidence/screenshots/r4-1440-02-history-noon-midnight.png`
  - `docs/integration-round4-20261107/evidence/screenshots/r4-1440-03-offline-pwa-fresh-entry.png`
