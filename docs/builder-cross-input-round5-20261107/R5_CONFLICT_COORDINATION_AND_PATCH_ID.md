# R5-01 ~ R5-04 원본 보존 · 후보(`4804fcb` / `543685b`) 비교 및 충돌 조율 명세

## 1. 후보 커밋(`4804fcb`, `543685b`) 및 최신 `main` 존재 여부 실측 보고

1. **최신 `main` (`origin/main`) 상태**:
   - SHA: `1f0356a3e959eb460bb72b3aa28f5d4800b2e381` (`docs(builder): add round 5 cross-input, stress, and WebKit compatibility audit without source modifications`)
   - 직전 빌더 소스 병합 커밋: `8de04fb0c96067fa53a0406b0a9542a6d33a8935` (부모 빌더 구현 커밋 `51f1e6a587dc90e9606beba15b0969872ca32662`, Round 1 빌더 커밋 `884da341dab8e728ae51cd21d27a860ec964df2d`)
2. **외부 미반영 후보 `4804fcb` 및 `543685b` 조회 결과 (`원격/로컬 부재 확인`)**:
   - 로컬 Git 객체 데이터베이스 (`git cat-file -t 4804fcb`, `git cat-file -t 543685b`, `git fsck --full`):
     - `fatal: Not a valid object name 4804fcb`
     - `fatal: Not a valid object name 543685b`
   - GitHub 원격 API 조회 (`gh api repos/blue45f/pilate_flow/commits/4804fcb`, `gh api repos/blue45f/pilate_flow/commits/543685b`):
     - `HTTP 422: {"message":"No commit found for SHA: 4804fcb"}`
     - `HTTP 422: {"message":"No commit found for SHA: 543685b"}`
   - **결론 및 조치**:
     - `4804fcb` 및 `543685b`는 별도 원격 세션의 로컬에만 존재하고 현재 원격(`origin`) 및 본 VM 로컬 저장소에는 푸시/공유되지 않아 직접 diff를 읽을 수 없는 상태입니다.
     - 지시사항(`후보가 원격/로컬에 없어 비교할 수 없다면 정확히 보고하고 통합 또는 공유소스 수정은 보류하세요`)에 따라 **기본 워크스페이스(`/home/antigravity/blue45f/pilate_flow`, `main` 브랜치 `1f0356a`)의 공유 소스는 단 1바이트도 수정하지 않고 보존**했으며, **`main` 병합 및 원격 `push`를 전면 보류**했습니다.

---

## 2. 기존 빌더 변경 Diff 및 `git patch-id --stable` 대조표

별도 통합 세션에서 `4804fcb` / `543685b`와 대조할 수 있도록 현재 `main`에 반영된 빌더 커밋들과 본 R5-01~04 최소 패치 후보의 전체 및 파일별 `git patch-id --stable` 값을 아래에 기록합니다.

| 구분 | 대상 커밋 / 패치 | 전체 `git patch-id --stable` | `SequenceOrderCard.tsx` `patch-id` | `sequenceDrag.ts` `patch-id` | `sequence-composition.css` `patch-id` |
| --- | --- | --- | --- | --- | --- |
| Round 1 빌더 | `884da341dab8e728ae51cd21d27a860ec964df2d` | `9732bb7ba41099cc31f7c25e801a5ed760fa9612` | (미수정) | `d43fc2ea732688bb942bbfb279bffb3e2ca27ed7` | `0da6977bf33087d83144a61aca53ac17d264234e` |
| Round 4 빌더 | `51f1e6a587dc90e9606beba15b0969872ca32662` | `2adb6b50e5bc4c38dd214974d9aac8dbee73098b` | `9dccca43031ea8146d843bf1417f908d29106b20` | (미수정) | `3f033397b7e2338d948aa2076a9569ba0402bf24` |
| Round 5 문서 | `1f0356a3e959eb460bb72b3aa28f5d4800b2e381` | `f4094e1fc950cb55dcd9fdeda4453aa265d263eb` | (미수정) | (미수정) | (미수정) |
| **Round 5 최소 패치 후보** | [`patches/builder-round5-minimal-candidates.patch`](file:///home/antigravity/blue45f/pilate_flow-worktrees/r5-candidate-20261107/docs/builder-cross-input-round5-20261107/patches/builder-round5-minimal-candidates.patch) | `315fba0cefb8448bdafe9824bd35765b40142e54` | `4a2d8641c49097e6775e9386b23403671a3d37ea` | `c6955d3bd2d286a0015e9eaff7ce81b73c108e18` | `219cd68f58552604614267ee1232f13ce9c66851` |

---

## 3. 독립 Worktree 및 2단계 분리 브랜치 보존 구조

공유 소스 충돌을 방지하고 양쪽 변경(`4804fcb`/`543685b` 및 `R5-01~04`)을 모두 무손실로 반영할 수 있도록 독립 worktree (`/home/antigravity/blue45f/pilate_flow-worktrees/r5-candidate-20261107`)에 2개 커밋(2개 브랜치 포인터)으로 분리 보존했습니다:

1. **순수 회귀 테스트 + 조율 문서 브랜치 (`test/builder-r5-01-04-pure-regression-20261107`)**:
   - **기존 파일 수정 0건**: `SequenceOrderCard.tsx`, `sequenceDrag.ts`, `sequence-composition.css`, `SequenceOrderCard.test.tsx`를 전혀 건드리지 않고 새 테스트 파일 [`src/components/SequenceOrderCard.r5.test.tsx`](file:///home/antigravity/blue45f/pilate_flow-worktrees/r5-candidate-20261107/src/components/SequenceOrderCard.r5.test.tsx) 및 본 문서만 추가합니다.
   - 따라서 `4804fcb` / `543685b`와 **충돌 확률 0%**로 즉시 병합 가능하며, 패치 전 4개 결함(`R5-01 ~ R5-04`)이 모두 실패로 재현됨을 검증했습니다.
2. **R5-01 ~ R5-04 최소 패치 포함 후보 브랜치 (`candidate/builder-r5-01-04-20261107`)**:
   - 위 순수 회귀 테스트 커밋 위에 [`patches/builder-round5-minimal-candidates.patch`](file:///home/antigravity/blue45f/pilate_flow/docs/builder-cross-input-round5-20261107/patches/builder-round5-minimal-candidates.patch)를 적용한 커밋입니다.
   - 기존 `main`(`884da34` + `51f1e6a`)의 모든 코드를 100% 보존하면서 최소 28줄 추가/6줄 수정만으로 `R5-01 ~ R5-04` 4개 회귀 테스트와 기존 58개 빌더 단위 테스트(총 62개 테스트) 및 `tsc -b`를 모두 통과합니다.

---

## 4. R5-03 WebKit / Safari 정직한 한계 명시 (`실제 런타임 미검증` 유지)

- **실제 WebKit / Safari 브라우저 런타임 실행 여부: `미검증 (UNVERIFIED)`**
- `R5-03` 관련 수정 후보(`window` 캡처 단계 `Escape` 리스너 추가, `getBoundingClientRect().width / cardEl.offsetWidth` 기반 `rectZoom` 폴백, `.sequence-drag-handle`의 `-webkit-user-select: none; -webkit-touch-callout: none;`)는 Chromium 156 (Blink) 및 `jsdom` 단위 테스트에서 포커스 분리 상태의 `window` `Escape` 취소 동작과 `offsetWidth` 비율 폴백을 검증한 것이며, **실제 Safari / WebKit 브라우저 런타임에서 실행 검증된 것이 아님(`미검증`)**을 그대로 유지합니다.

---

## 5. `4804fcb` / `543685b` 수신 후 양쪽 변경 무손실 통합 절차

통합 담당자가 `4804fcb` 또는 `543685b`를 원격 브랜치로 공유한 직후 아래 순서로 양쪽 변경을 모두 보존해 병합할 수 있습니다:

```bash
# 1. 독립 worktree에서 원격 후보 커밋 fetch 및 diff / patch-id 대조
git fetch --all
git show 4804fcb | git patch-id --stable
git show 543685b | git patch-id --stable
git diff 1f0356a..543685b -- src/components/SequenceOrderCard.tsx src/utils/sequenceDrag.ts src/styles/sequence-composition.css

# 2. 충돌 0%인 순수 회귀 테스트 커밋을 먼저 cherry-pick
git cherry-pick test/builder-r5-01-04-pure-regression-20261107

# 3. 3-way merge로 R5-01~04 최소 패치 커밋을 양쪽 변경 보존 방식으로 적용
git cherry-pick -X patience candidate/builder-r5-01-04-20261107
```
