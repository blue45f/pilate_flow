# ClassCueSheet 커밋 체인 및 Git 프로비넌스 명세서 (`commits-and-provenance.md`)

본 문서는 `feat/class-cue-sheet` 브랜치(`51a6f6bd89687730aba87d004740a34bca4b9c51`)에 구현된 **강사용 수업 큐시트(`src/features/classCueSheet/**`)** 후보의 Git 식별 정보, 원격 저장소(`origin/main`) 반영 여부, 4단계 커밋 의존성 체인, 14개 파일 매니페스트 및 패치 적용 절차를 기록합니다.

---

## 1. Git 식별자 및 원격 반영 상태 (`원격 미반영`)

### 1.1 핵심 Git 포인터 요약

| 구분 | 참조(Ref) | 전체 커밋 해시 (SHA-1) | 단축 해시 | 비고 |
| :--- | :--- | :--- | :--- | :--- |
| **후보 브랜치 (`HEAD`)** | `feat/class-cue-sheet` | `51a6f6bd89687730aba87d004740a34bca4b9c51` | `51a6f6b` | `src/features/classCueSheet/**` 14개 파일 완결본 |
| **비교 대상 원격 기본 브랜치** | `origin/main` | `222b59edf47653a36c4f754b2a572c19cd12cb30` | `222b59e` | 최신 원격 `main` HEAD |
| **공통 조상 (`merge-base`)** | `merge-base(HEAD, origin/main)` | `29a6edb6cbdb4f53523e1c64fff35f6890768ba4` | `29a6edb` | 분기 기준점 |
| **원격 반영 상태** | **원격 미반영 (`not_pushed_local_only`)** | — | — | `origin/main` 미포함, 원격 브랜치 미생성 |

### 1.2 원격 미반영(`not_pushed_local_only`) 및 무충돌 검증 명령어·결과

다음 읽기 전용 Git 검증을 통해 `51a6f6b` 커밋 및 `feat/class-cue-sheet` 브랜치가 아직 원격(`origin`)에 푸시되거나 `origin/main`에 병합되지 않은 **로컬 전용(`원격 미반영`)** 상태임을 확인했습니다.

```bash
# 1) 후보 HEAD를 포함하는 원격 브랜치 조회 -> 출력 없음 (0건)
$ git branch -r --contains 51a6f6bd89687730aba87d004740a34bca4b9c51
# (empty output)

# 2) 원격 저장소에 feat/class-cue-sheet 브랜치 존재 여부 조회 -> 출력 없음 (0건)
$ git ls-remote origin refs/heads/feat/class-cue-sheet
# (empty output)

# 3) origin/main 히스토리 내 classCueSheet 관련 커밋 검색 -> 출력 없음 (0건)
$ git log origin/main --grep="classCueSheet" --oneline
# (empty output)

# 4) origin/main(222b59e) 내 src/features/classCueSheet 경로 존재 여부 확인 -> 출력 없음 (미존재)
$ git ls-tree origin/main src/features/classCueSheet
# (empty output)

# 5) 29a6edb..51a6f6b 변경 파일(14개)과 29a6edb..origin/main 변경 파일 간 중첩 여부 -> 0건
$ comm -12 \
  <(git diff --name-only 29a6edb6cbdb4f53523e1c64fff35f6890768ba4..51a6f6bd89687730aba87d004740a34bca4b9c51 | sort) \
  <(git diff --name-only 29a6edb6cbdb4f53523e1c64fff35f6890768ba4..origin/main | sort)
# (empty output: 0 overlapping files)

# 6) 워킹 트리를 변경하지 않는 인메모리 3-way 병합 시뮬레이션 -> 충돌 없이 클린 트리 생성 (exit code 0)
$ git merge-tree --write-tree origin/main 51a6f6bd89687730aba87d004740a34bca4b9c51
eeaada5578b1a0b7d090ff87aaeb4f005d9470b7
```

---

## 2. 4단계 커밋 의존성 체인 (`29a6edb..51a6f6b`)

`feat/class-cue-sheet` 브랜치는 공통 조상 `29a6edb6cbdb4f53523e1c64fff35f6890768ba4` 위에서 오직 `src/features/classCueSheet/**` 하위 파일들만 순차적으로 추가·고도화한 4개의 커밋으로 구성됩니다.

| 순서 | 단축 해시 | 전체 커밋 해시 (SHA-1) | 부모 커밋 (Parent) | 작성 시각 (ISO-8601) | 변경 요약 (`files / +ins / -del`) |
| :---: | :--- | :--- | :--- | :--- | :--- |
| **1** | `d66e44a` | `d66e44a742608dedd59cdfb4033f9d440ed90ae4` | `29a6edb6cbdb4f53523e1c64fff35f6890768ba4` | `2026-11-06T16:03:09+00:00` | `10 files changed, +6022 / -0` |
| **2** | `62dcf7e` | `62dcf7e92b06e3f7fd9eb8496a0f46352479ba5a` | `d66e44a742608dedd59cdfb4033f9d440ed90ae4` | `2026-11-06T17:05:48+00:00` | `10 files changed, +2113 / -279` |
| **3** | `1a78a95` | `1a78a9525090b96b1e278c71e3fd1d86103fa299` | `62dcf7e92b06e3f7fd9eb8496a0f46352479ba5a` | `2026-11-06T23:25:26+00:00` | `9 files changed, +2156 / -432` |
| **4** | `51a6f6b` | `51a6f6bd89687730aba87d004740a34bca4b9c51` | `1a78a9525090b96b1e278c71e3fd1d86103fa299` | `2026-11-07T00:24:50+00:00` | `5 files changed, +1043 / -18` |

### 커밋별 상세 내역

1. **`d66e44a` (`d66e44a742608dedd59cdfb4033f9d440ed90ae4`)**
   - **제목**: `feat(classCueSheet): add standalone instructor cue sheet projection, preview, and print candidate`
   - **주요 내용**:
     - 4종 입력 소스(`ClassSequenceSnapshot`, `SavedSequence`, `TeachingProgramSnapshot`, `OfflineClassPreset`)를 정규화하는 `buildClassCueSheetProjection` 엔진 및 타입(`classCueSheetTypes.ts`, `classCueSheetProjection.ts`) 구현.
     - 호흡 스크립트, 핵심 큐잉, 안전 주의사항, 초보자/숙련자 변형, 기구 스프링/세팅 비교 및 기구 전환 콜아웃, 강사 전달 리스크 배지 생성 로직 추가.
     - 반응형 프리뷰(`ClassCueSheetPreview.tsx`), 인쇄/PDF 전용 스타일시트(`classCueSheet.css`), 픽스처(`classCueSheetFixtures.ts`), 단위/컴포넌트/Chromium 헤드리스 검증 스위트 초기 구축.

2. **`62dcf7e` (`62dcf7e92b06e3f7fd9eb8496a0f46352479ba5a`)**
   - **제목**: `feat(classCueSheet): preserve active step across live edits and verify multi-page PDF pagination`
   - **주요 내용**:
     - 실시간 시퀀스 편집(스텝 추가·삭제·재정렬·시간/스프링 변경) 중에도 현재 포커스된 활성 스텝(`activeStepId` / `sequenceItemId` / `exerciseId` 매칭 폴백)이 유실되지 않도록 보존 로직 강화.
     - 다중 페이지 A4 PDF/인쇄 출력 시 카드 절단 방지(`break-inside: avoid`), 페이지네이션 안정성 및 Chromium PDF 레이아웃 검증 확대.

3. **`1a78a95` (`1a78a9525090b96b1e278c71e3fd1d86103fa299`)**
   - **제목**: `feat(classCueSheet): refine novice mobile focus UX, text scaling, and multi-viewport usability probe`
   - **주요 내용**:
     - 모바일·태블릿 수업 현장용 단일 스텝 포커스 모드(`Single-Step Focus`) UX 개선, 글자 크기 배율 조절(`normal` / `large` / `xlarge`), 초보 강사용 호흡·큐잉 가독성 개선.
     - 독립 실행형 브라우저 픽스처(`browserFixture.html`), 다중 뷰포트 사용성 테스트(`classCueSheetUsability.test.tsx`), 브라우저 자동 검증 스크립트(`verifyClassCueSheetBrowser.mjs`) 추가.

4. **`51a6f6b` (`51a6f6bd89687730aba87d004740a34bca4b9c51`) — 최종 후보 HEAD**
   - **제목**: `fix(classCueSheet): guard editable keyboard shortcuts, deduplicate aria-live, and verify lifecycle resilience`
   - **주요 내용**:
     - 호스트 앱 내 `<input>`, `<textarea>`, `<select>`, `[contenteditable]` 포커스 상태나 조합키(`Ctrl`/`Alt`/`Meta`) 입력 시 큐시트 단축키(`ArrowLeft`, `ArrowRight`, `[`, `]`, `Home`, `End`)가 가로채지 않도록 가드 처리.
     - 스크린 리더 알림(`aria-live="polite"`) 영역 중복 제거 및 단일 상태 영역 통합.
     - 모달 열기/닫기, 라우트 전환, 다중 마운트/언마운트, 인쇄 후 복귀 등 생명주기 복원력 테스트(`classCueSheetLifecycle.test.tsx`) 추가.

---

## 3. 공유 읽기 전용 계약(Shared Read-Only Contracts) 호환성 검증

`src/features/classCueSheet/**` 내부에서 참조하는 호스트 저장소의 9개 모듈은 모두 읽기 전용으로만 임포트하며, `HEAD`(`51a6f6b`)와 최신 `origin/main`(`222b59e`) 간 비교 결과 **파괴적 변경(Breaking Change)이 0건**입니다.

| 참조 파일 경로 | `HEAD` (`51a6f6b`) SHA-256 | `origin/main` (`222b59e`) SHA-256 | 동일 여부 | 호환성 판정 |
| :--- | :--- | :--- | :---: | :--- |
| `src/data/equipmentCatalog.ts` | `c4b1c4b5...b37195f` | `c4b1c4b5...b37195f` | 동일 (`true`) | 무결 |
| `src/data/pilatesCatalog.ts` | `17414eb2...c19997f` | `17414eb2...c19997f` | 동일 (`true`) | 무결 |
| `src/types/classBlockPresets.ts` | `552175f4...18531b6` | `552175f4...18531b6` | 동일 (`true`) | 무결 |
| `src/types/hierarchy.ts` | `9de45b9f...0aa26e1` | `9de45b9f...0aa26e1` | 동일 (`true`) | 무결 |
| `src/types/pilates.ts` | `b0d27f6b...fbb741e` | `b0d27f6b...fbb741e` | 동일 (`true`) | 무결 |
| `src/types/sequenceMotion.ts` | `5d6f9e3e...7e71656` | `5d6f9e3e...7e71656` | 동일 (`true`) | 무결 |
| `src/types/teachingHistorySnapshot.ts` | `2dee3caf...d16ea2` | `e0dd955d...ce4690` | 선택 필드 추가 (`false`) | **100% 하위 호환** (`TeachingProgramSnapshotItem`에 선택적 필드 `stepClassSection?`, `timeEstimate?`, `motionStudy?` 3개만 추가됨) |
| `src/utils/hierarchyModel.ts` | `cac0568a...371b4f7` | `cac0568a...371b4f7` | 동일 (`true`) | 무결 |
| `src/utils/sequenceEngine.ts` | `4b956e83...ad23914` | `4b956e83...ad23914` | 동일 (`true`) | 무결 |

---

## 4. `src/features/classCueSheet/**` 14개 파일 매니페스트 (`51a6f6b` 기준)

총 14개 파일 (`397,300 bytes`, `10,605 lines`):

| # | 파일 경로 | Bytes | Lines | Git Blob SHA-1 | SHA-256 |
| :---: | :--- | ---: | ---: | :--- | :--- |
| 1 | `src/features/classCueSheet/ClassCueSheetPreview.test.tsx` | 46,551 | 1,247 | `6b67c502aba1936cf9cab38be8662589387928da` | `450879e9abaa65472350f6079d3f5d12f1b5a6ca1b96f4af49611c7cc387e5bf` |
| 2 | `src/features/classCueSheet/ClassCueSheetPreview.tsx` | 53,067 | 1,463 | `f5b40d206c8c5389ec0acb965fc1b0cb2cbe25d3` | `07bd200b291de30059c1e13cb03fb665a42fc3a02faadde1bbf13eeedd61d8a0` |
| 3 | `src/features/classCueSheet/README.md` | 10,844 | 94 | `ffe9ba0c21d98fcf4098d299edf1252445a19086` | `c3b335bc332acfbad197f1fd184bdb948fabf8d0ac7bd1db8e8d4c63b75b9fe9` |
| 4 | `src/features/classCueSheet/browserFixture.html` | 6,296 | 158 | `622b8f79a63bc68b7c2ec83148e22dc7456cce33` | `4a5e9418ae3dab31d32d25dd646d605d3af5786798b4da7e4dba8b2b04f216ea` |
| 5 | `src/features/classCueSheet/classCueSheet.css` | 18,800 | 759 | `3b33b592cbd60e67bfe729f91d1eba95480faa0f` | `a95bf198aba0d2b81cf5aaeba26bf158a5eaaf02f46cf34dae587299865c52bd` |
| 6 | `src/features/classCueSheet/classCueSheetChromium.test.ts` | 55,721 | 1,361 | `fddc499765b63cd44ffba6e0fe88db1717858f06` | `42550ff094c821ecf6d380443ed9e7b89ddd2055fff8f5c736649c0617400176` |
| 7 | `src/features/classCueSheet/classCueSheetFixtures.ts` | 24,651 | 612 | `2c6002d81b14a1b1e3bf1348076d41a803e15491` | `4c293b89913a2c47216fb21959f74a32d3ed2962483900bf909a3a02f32cb089` |
| 8 | `src/features/classCueSheet/classCueSheetLifecycle.test.tsx` | 21,651 | 587 | `3a54c466f4210059631fd7ff88cb25c8c52c162c` | `b62f0bd2117359146c0f8ebed5702f3488813270025bbff383fbf88921ffb231` |
| 9 | `src/features/classCueSheet/classCueSheetProjection.test.ts` | 27,461 | 611 | `d9cb0d8e36afcc4a5d348b43b886cb78f4b2f25f` | `86fe3339522f5dab063ac0938a3cfceed864d9e1dc80832ce0b99da9504a9bab` |
| 10 | `src/features/classCueSheet/classCueSheetProjection.ts` | 79,239 | 2,316 | `c9e1c02d421cdc79f8f663effb3284593e54ab3d` | `f60a06e2b67c6ee5e005b28b2098daf93819b7eec747e8b6674f242324f6ece8` |
| 11 | `src/features/classCueSheet/classCueSheetTypes.ts` | 12,576 | 366 | `29e1eb03a2a073930e59821b181b47bbe989da57` | `2d1ae5293d7c25434be1ae628d2c206c28ae28f1bf641e381a15521a6f9f0a2e` |
| 12 | `src/features/classCueSheet/classCueSheetUsability.test.tsx` | 15,870 | 341 | `cce5e05cd0c6473e548d9442e7663a07cd66d103` | `6d727b94aa2ab4752b7693ad6808713ac975313228afcfcd77a9264549f6da47` |
| 13 | `src/features/classCueSheet/index.ts` | 613 | 21 | `c3291aaaf93e955956968019885f4401c6b97c73` | `c3d373263ff647a8821b25b663deed6087fdff9dba1667ce66749f314be71d27` |
| 14 | `src/features/classCueSheet/verifyClassCueSheetBrowser.mjs` | 23,960 | 669 | `d06fcd9ed93fbcf4f32c8123f2344ca127b9e325` | `83913487c960c950435272a83ff193cc74c316148232f35b5679a6d68361f522` |

---

## 5. 생성된 패치 아티팩트 및 코디네이터 이관(Apply) 명령어

`docs/class-cue-sheet-handoff-20261107/patches/` 디렉토리에 커밋 히스토리를 보존하는 4개의 순차 `format-patch` 파일과, 단일 스쿼시 적용을 위한 누적 `diff` 파일을 패키징했습니다.

### 5.1 패치 파일 목록 및 체크섬

| 구분 | 패치 파일 경로 | Bytes | Lines | SHA-256 |
| :--- | :--- | ---: | ---: | :--- |
| **Patch 0001** (`d66e44a`) | `docs/class-cue-sheet-handoff-20261107/patches/0001-feat-classCueSheet-add-standalone-instructor-cue-she.patch` | 226,353 | 6,114 | `4d0294d0363dccf27dfd33beb5349207a712752e7d9411ff869ea8dced1f07e4` |
| **Patch 0002** (`62dcf7e`) | `docs/class-cue-sheet-handoff-20261107/patches/0002-feat-classCueSheet-preserve-active-step-across-live-.patch` | 126,686 | 2,897 | `e4a3c8ad1fa0fe8db5f3378dd0e7c5a46f1c028e160e132168f2c09a75452bf6` |
| **Patch 0003** (`1a78a95`) | `docs/class-cue-sheet-handoff-20261107/patches/0003-feat-classCueSheet-refine-novice-mobile-focus-UX-tex.patch` | 149,525 | 3,371 | `1cd62bbd7bc69747392e93323ef5c163c923dce8b510ee1324f0f95bdfe9e58d` |
| **Patch 0004** (`51a6f6b`) | `docs/class-cue-sheet-handoff-20261107/patches/0004-fix-classCueSheet-guard-editable-keyboard-shortcuts-.patch` | 49,160 | 1,220 | `78aa4952b967e6fb8c09f985cead4d37be0b95114c5a2d5e7c7a829cae94d406` |
| **Squashed Diff** (`29a6edb..51a6f6b`) | `docs/class-cue-sheet-handoff-20261107/patches/classCueSheet-squashed-29a6edb-to-51a6f6b.diff` | 411,428 | 10,689 | `d081e11f4f5a7d6d7fcce997b9089494640fb4dd38f80ce73484eada6b14a4f6` |

### 5.2 코디네이터용 통합 명령어 (택 1)

#### 방법 A: 4개 커밋 히스토리 보존 병합 (`git am --3way`)
```bash
git am --3way docs/class-cue-sheet-handoff-20261107/patches/000*.patch
```

#### 방법 B: 로컬 저장소 내 직접 체리픽 (`git cherry-pick`)
```bash
git cherry-pick 29a6edb6cbdb4f53523e1c64fff35f6890768ba4..51a6f6bd89687730aba87d004740a34bca4b9c51
```

#### 방법 C: 단일 스쿼시 스테이징 적용 (`git apply --index`)
```bash
git apply --check docs/class-cue-sheet-handoff-20261107/patches/classCueSheet-squashed-29a6edb-to-51a6f6b.diff
git apply --index docs/class-cue-sheet-handoff-20261107/patches/classCueSheet-squashed-29a6edb-to-51a6f6b.diff
```

### 5.3 무결성 사후 검증 명령어

통합 직후 `source-manifest.json`에 기록된 14개 파일의 SHA-256 해시와 대조하여 바이트 단위 일치 여부를 즉시 검증할 수 있습니다:

```bash
python3 -c '
import json, hashlib
manifest = json.load(open("docs/class-cue-sheet-handoff-20261107/source-manifest.json"))
for entry in manifest["files"]:
    actual = hashlib.sha256(open(entry["file"], "rb").read()).hexdigest()
    assert actual == entry["sha256"], f"Mismatch in {entry[\"file\"]}: {actual} != {entry[\"sha256\"]}"
print("OK: All 14 files in src/features/classCueSheet/** verified byte-for-byte.")
'
```
