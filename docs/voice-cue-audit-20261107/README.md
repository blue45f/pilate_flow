# Pilates Flow — 무료 브라우저 음성 안내 수명주기 회귀 검증 (`voice-cue-audit-20261107`)

## 1. 요약 및 소유 경계 (Executive Summary & Ownership)

- **독립 작업 브랜치**: `voice-cue-audit-20261107` (기준 커밋: `main` `ac3f61d`)
- **통합 상태**: **MERGED & INTEGRATED INTO `main`** (`F-01..F-04` 최소 수명주기 패치가 `src/models/ClassVoiceController.ts`, `src/hooks/useClassVoiceGuidance.ts`, `src/utils/koreanVoiceNarration.ts`, `src/components/MovementMediaGuidancePanel.tsx`에 적용 완료되었으며, 중복 패치 파일은 정리됨)
- **검증 및 문서 경로**:
  - `scripts/voice-cue-audit-20261107/**`
  - `docs/voice-cue-audit-20261107/**`

---

## 2. 2트랙 병렬 워크플로우 파일 구조

| 트랙 구분 | 스크립트 경로 (`scripts/voice-cue-audit-20261107/`) | 문서 및 증거 경로 (`docs/voice-cue-audit-20261107/`) |
| --- | --- | --- |
| **공통 로더 / 하네스** | - [`shared/ts-loader-hooks.mjs`](file:///home/antigravity/blue45f/pilate_flow/scripts/voice-cue-audit-20261107/shared/ts-loader-hooks.mjs)<br>- [`shared/web-speech-mock-harness.mjs`](file:///home/antigravity/blue45f/pilate_flow/scripts/voice-cue-audit-20261107/shared/web-speech-mock-harness.mjs)<br>- [`run-all-voice-cue-audit.mjs`](file:///home/antigravity/blue45f/pilate_flow/scripts/voice-cue-audit-20261107/run-all-voice-cue-audit.mjs) | - [`README.md`](file:///home/antigravity/blue45f/pilate_flow/docs/voice-cue-audit-20261107/README.md) |
| **Track A (구현 · 최소 수정 제안)** | - [`track-a-implementation/candidate-minimal-fixes.mjs`](file:///home/antigravity/blue45f/pilate_flow/scripts/voice-cue-audit-20261107/track-a-implementation/candidate-minimal-fixes.mjs)<br>- [`track-a-implementation/track-a-lifecycle-regression.node-test.mjs`](file:///home/antigravity/blue45f/pilate_flow/scripts/voice-cue-audit-20261107/track-a-implementation/track-a-lifecycle-regression.node-test.mjs) | - [`TRACK_A_IMPLEMENTATION_AND_MINIMAL_FIX_PROPOSAL.md`](file:///home/antigravity/blue45f/pilate_flow/docs/voice-cue-audit-20261107/TRACK_A_IMPLEMENTATION_AND_MINIMAL_FIX_PROPOSAL.md)<br>- [`patches/minimal-voice-cue-lifecycle-fixes.patch`](file:///home/antigravity/blue45f/pilate_flow/docs/voice-cue-audit-20261107/patches/minimal-voice-cue-lifecycle-fixes.patch) |
| **Track B (독립 검증 · 로컬 브라우저 QA)** | - [`track-b-verification/track-b-adversarial-audit.node-test.mjs`](file:///home/antigravity/blue45f/pilate_flow/scripts/voice-cue-audit-20261107/track-b-verification/track-b-adversarial-audit.node-test.mjs)<br>- [`track-b-verification/track-b-browser-lifecycle-verify.mjs`](file:///home/antigravity/blue45f/pilate_flow/scripts/voice-cue-audit-20261107/track-b-verification/track-b-browser-lifecycle-verify.mjs) | - [`TRACK_B_INDEPENDENT_VERIFICATION_REPORT.md`](file:///home/antigravity/blue45f/pilate_flow/docs/voice-cue-audit-20261107/TRACK_B_INDEPENDENT_VERIFICATION_REPORT.md)<br>- [`evidence/browser-verification-results.json`](file:///home/antigravity/blue45f/pilate_flow/docs/voice-cue-audit-20261107/evidence/browser-verification-results.json)<br>- [`evidence/regression-summary.json`](file:///home/antigravity/blue45f/pilate_flow/docs/voice-cue-audit-20261107/evidence/regression-summary.json) |

---

## 3. 재현 실행 명령어 (Reproducible Verification Commands)

추가 패키지 설치나 기존 파일 변경 없이 Node.js 24 내장 테스트 러너와 로컬 Chromium(`Chromium 156.0.8078.79`)으로 즉시 실행할 수 있습니다.

```bash
# 전체 통합 실행 (문법 검사 7건 + Track A 15개 테스트 + Track B 7개 테스트 + 로컬 Chromium 브라우저 검증)
node scripts/voice-cue-audit-20261107/run-all-voice-cue-audit.mjs

# Track A 수명주기 회귀 테스트 단독 실행 (15 tests)
node --experimental-transform-types --test scripts/voice-cue-audit-20261107/track-a-implementation/track-a-lifecycle-regression.node-test.mjs

# Track B 결함 재현·정적 보안 감사 단독 실행 (7 tests)
node --experimental-transform-types --test scripts/voice-cue-audit-20261107/track-b-verification/track-b-adversarial-audit.node-test.mjs

# Track B 로컬 Headless Chromium 브라우저 검증 단독 실행 (Pass 1 순정 4개 뷰포트 + Pass 2 계측 10개 시나리오)
node --experimental-transform-types scripts/voice-cue-audit-20261107/track-b-verification/track-b-browser-lifecycle-verify.mjs
```

---

## 4. 조정 담당자(Coordinator) 순차 `main` 머지 및 패치 적용 가이드

1. **감사 산출물 및 회귀 테스트만 먼저 `main`에 머지할 경우**:
   ```bash
   git checkout main
   git merge --no-ff voice-cue-audit-20261107 -m "Merge voice cue lifecycle regression audit (2026-11-07)"
   ```
2. **통합 전 후보 최소 수정안(F-01 ~ F-04)을 `src/**`에 반영할 경우**:
   ```bash
   git apply --check docs/voice-cue-audit-20261107/patches/minimal-voice-cue-lifecycle-fixes.patch
   git apply docs/voice-cue-audit-20261107/patches/minimal-voice-cue-lifecycle-fixes.patch
   ```
3. **미검증 경계 주의**:
   - 실제 스피커 음향 출력 품질과 물리 iOS/iPadOS/macOS Safari 기기(`AVSpeechSynthesizer` 및 하드웨어 무음 스위치)는 본 Linux 컨테이너에서 **미검증(`UNVERIFIED`)** 상태이므로, 실기기 릴리스 전 물리 Safari 스모크 체크를 권장합니다.
