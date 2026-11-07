# Track A — 무료 브라우저 음성 안내 수명주기 회귀 분석 및 최소 수정 제안서

## 1. 소유 범위 및 읽기 전용 경계 (Ownership & Read-Only Scope)

- **작성 허용 경로 (Exclusive Owned Paths)**:
  - `scripts/voice-cue-audit-20261107/**`
  - `docs/voice-cue-audit-20261107/**`
- **Track A 담당 파일**:
  - [`scripts/voice-cue-audit-20261107/track-a-implementation/candidate-minimal-fixes.mjs`](file:///home/antigravity/blue45f/pilate_flow/scripts/voice-cue-audit-20261107/track-a-implementation/candidate-minimal-fixes.mjs)
  - [`scripts/voice-cue-audit-20261107/track-a-implementation/track-a-lifecycle-regression.node-test.mjs`](file:///home/antigravity/blue45f/pilate_flow/scripts/voice-cue-audit-20261107/track-a-implementation/track-a-lifecycle-regression.node-test.mjs)
  - [`docs/voice-cue-audit-20261107/patches/minimal-voice-cue-lifecycle-fixes.patch`](file:///home/antigravity/blue45f/pilate_flow/docs/voice-cue-audit-20261107/patches/minimal-voice-cue-lifecycle-fixes.patch)
  - [`docs/voice-cue-audit-20261107/TRACK_A_IMPLEMENTATION_AND_MINIMAL_FIX_PROPOSAL.md`](file:///home/antigravity/blue45f/pilate_flow/docs/voice-cue-audit-20261107/TRACK_A_IMPLEMENTATION_AND_MINIMAL_FIX_PROPOSAL.md)
- **읽기 전용 대상 (Strictly Read-Only Production Files)**:
  - [`src/models/ClassVoiceController.ts`](file:///home/antigravity/blue45f/pilate_flow/src/models/ClassVoiceController.ts)
  - [`src/hooks/useClassVoiceGuidance.ts`](file:///home/antigravity/blue45f/pilate_flow/src/hooks/useClassVoiceGuidance.ts)
  - [`src/components/LiveStageView.tsx`](file:///home/antigravity/blue45f/pilate_flow/src/components/LiveStageView.tsx)
  - [`src/utils/koreanVoiceNarration.ts`](file:///home/antigravity/blue45f/pilate_flow/src/utils/koreanVoiceNarration.ts)
  - [`src/components/MovementMediaGuidancePanel.tsx`](file:///home/antigravity/blue45f/pilate_flow/src/components/MovementMediaGuidancePanel.tsx)
  - [`src/schemas/movementMediaGuidanceSchema.ts`](file:///home/antigravity/blue45f/pilate_flow/src/schemas/movementMediaGuidanceSchema.ts)

---

## 2. 재현된 수명주기 경계 결함 (F-01 ~ F-04) 및 최소 수정 제안

> [!IMPORTANT]
> 본 브랜치(`voice-cue-audit-20261107`)에서는 기존 `src/**` 파일을 직접 수정하지 않고 **읽기 전용(Read-Only)**으로 유지합니다. 아래 최소 수정안은 [`patches/minimal-voice-cue-lifecycle-fixes.patch`](file:///home/antigravity/blue45f/pilate_flow/docs/voice-cue-audit-20261107/patches/minimal-voice-cue-lifecycle-fixes.patch) 및 통합 전 후보 구현체([`candidate-minimal-fixes.mjs`](file:///home/antigravity/blue45f/pilate_flow/scripts/voice-cue-audit-20261107/track-a-implementation/candidate-minimal-fixes.mjs))로 분리하여 제공하며, 조정 담당자가 순차 머지 시 바로 적용할 수 있습니다.

### F-01: [`ClassVoiceController.ts`](file:///home/antigravity/blue45f/pilate_flow/src/models/ClassVoiceController.ts#L59-L80) — `running: true` 상태에서 무음 단계(`say([])`)로 전환(`newVisit`) 시 이전 음성 미취소

- **현상 및 원인**:
  - `update(snapshot)`에서 `newVisit`이 `true`일 때 `this.announced = false; this.spokenPhase = ''; this.warned = false;`만 초기화하고 `this.cancel()`을 직접 호출하지 않습니다.
  - 이후 `say(parts)`에서 `if (!text) return;`(`L64`)이 `this.cancel()`(`L65`)보다 먼저 실행됩니다.
  - 따라서 사용자가 호흡 메모만 읽기(`{ movement: false, breath: true, time: false }`)로 설정한 상태에서 1번 동작의 호흡 메모가 발화 중일 때 휴식 단계(`breath: ''`)나 미검토 동작(`breath: ''`)으로 넘어가면, `say(['', '', ''])`가 조기 반환되어 **이전 동작의 호흡 안내 음성이 휴식/미검토 단계에서도 계속 재생**됩니다.
- **최소 수정 제안**:
  - `if (newVisit)` 블록 진입 시 `this.cancel()`을 호출합니다(`this.ownsSpeech`가 `true`일 때만 `port.cancel()`이 호출되므로 불필요한 외부 음성 취소는 발생하지 않습니다).

### F-02: [`ClassVoiceController.ts`](file:///home/antigravity/blue45f/pilate_flow/src/models/ClassVoiceController.ts#L85-L97) — 첫 발화 전 내용 편집 시 다음 틱 발화 누출 및 숨김 탭(`!visible`) 구간 변경 지연 발화

- **현상 및 원인**:
  1. **편집 직후 다음 틱 발화(`L85-L93`)**: 같은 `stepKey`에서 `title` 또는 `breath`가 변경되면 `this.cancel(); this.spokenPhase = snapshot.phase; return;`으로 조기 반환하지만 `this.announced`가 `false`로 남아 있는 경우(예: 시작 직전/동시 편집), 250ms 뒤 다음 타이머 틱에서 `previous.breath === snapshot.breath`가 성립하여 `if (!this.announced)` 블록이 실행되면서 편집된 미검토 메모를 그대로 읽어버립니다.
  2. **숨김 탭 복귀 시 지연된 구간 발화(`L94-L97`)**: 이미 발화된 단계(`this.announced === true`)에서 탭이 백그라운드(`snapshot.visible === false`)로 전환된 동안 `phase`가 바뀌거나 `remainingSec <= 10`을 지나가면, `L94`에서 조기 반환되어 `this.spokenPhase`와 `this.warned`가 갱신되지 않습니다. 이후 탭으로 복귀할 때 이미 지나간 구간 전환 안내가 뒤늦게 발화됩니다.
- **최소 수정 제안**:
  - 내용 편집 가드(`L88-L93`)에서 `if (snapshot.running) { this.announced = true; if (snapshot.remainingSec <= 10) this.warned = true; }`를 함께 설정합니다.
  - `!snapshot.visible` 가드(`L94-L97`)에서 `if (this.enabled && snapshot.eligible && !snapshot.visible && snapshot.running && this.announced)`일 때 `this.spokenPhase = snapshot.phase` 및 `if (snapshot.remainingSec <= 10) this.warned = true`를 동기화합니다.

### F-03: [`useClassVoiceGuidance.ts`](file:///home/antigravity/blue45f/pilate_flow/src/hooks/useClassVoiceGuidance.ts#L30-L110) — `window.speechSynthesis = undefined` / 비-`EventTarget` 환경 `TypeError` 크래시 및 `speak()` 시점 로컬 음성 재검증 누락

- **현상 및 원인**:
  1. `L30`의 `if (!('speechSynthesis' in window) || !('SpeechSynthesisUtterance' in window)) return;`는 프로퍼티 키 존재 여부만 검사합니다. `window.speechSynthesis` 값이 `undefined`/`null`이거나 `addEventListener`가 없는 WebView/테스트 환경에서는 `L68`(`synth.getVoices()`) 및 `L79`(`synth.addEventListener(...)`)에서 `TypeError`가 발생해 `LiveStageView` 마운트가 실패합니다.
  2. `loadVoices()`(`L67-L69`)가 `.find(...)`로 첫 번째 `ko*` 음성을 선택하여 `ko`가 `ko-KR`보다 앞에 있을 때 `ko-KR` 우선 선택(`selectBestKoreanVoice` 규칙)이 보장되지 않으며, `speak()`(`L39`)가 캐시된 `voice.current`만 확인하고 `synth.getVoices()`를 재확인하지 않습니다.
  3. `toggleEnabled`와 `changePreference`가 렌더 클로저의 `enabled`, `preferences`를 참조하여 동일 렌더 틱 내 연속 호출 시 상태가 역전될 수 있습니다.
- **최소 수정 제안**:
  - `synth?.speak`, `synth?.cancel`, `synth?.getVoices` 함수 여부와 `typeof synth.addEventListener === 'function'`을 방어적으로 확인합니다.
  - `pickLocalKoreanVoice(synth)`로 `ko-KR`을 우선 선택하고, `speak()` 호출 시마다 `pickLocalKoreanVoice(synth)`를 재검증하여 로컬 한국어 음성이 사라졌으면 즉시 비활성화합니다.
  - `enabledRef`, `availableRef`, `preferencesRef`를 두어 동기 사용자 제스처 핸들러에서 항상 최신 상태를 읽도록 합니다.

### F-04: [`koreanVoiceNarration.ts`](file:///home/antigravity/blue45f/pilate_flow/src/utils/koreanVoiceNarration.ts#L640-L653) & [`MovementMediaGuidancePanel.tsx`](file:///home/antigravity/blue45f/pilate_flow/src/components/MovementMediaGuidancePanel.tsx#L177-L181) — 유휴 컨트롤러 `destroy()` 시 전역 `synth.cancel()` 호출, 일시정지 중 속도 변경 후 `resume()` 미반영, 비활성 패널 세션 선점

- **현상 및 원인**:
  1. `cancelSpeechSafely()`(`koreanVoiceNarration.ts:L640-L653`)가 해당 컨트롤러의 실제 발화 소유 여부(`ownsSpeech`)를 확인하지 않고 무조건 `synth.cancel()`을 호출합니다. 이로 인해 한 번도 재생하지 않은 유휴 컨트롤러가 언마운트되거나 React `StrictMode` 클린업이 돌 때도 전역 `window.speechSynthesis.cancel()`이 호출되어 다른 활성 음성(예: `LiveStageView`)을 끊을 수 있습니다.
  2. `pause()` 상태에서 `setSpeed(1.25)`를 호출하면 `state.speed`만 `1.25`로 바뀌고, 이후 `resume()`(`L874-L901`) 호출 시 `synth.speaking || synth.paused`가 참인 데스크톱 브라우저에서는 기존 `1.0x` Utterance를 그대로 이어 재생하면서 상태 메시지만 `(1.25배속)`으로 표시됩니다. 또한 `resume()` 진입 시 로컬 한국어 음성 유지 여부를 재점검하지 않습니다.
  3. `MovementMediaGuidancePanel.tsx:L180`에서 `active === false`인 비활성 패널이 마운트될 때도 `movementMediaSessionCoordinator.notifyMovementActivated(exercise.id)`를 호출하여 다른 활성 동작의 음성을 정지시킵니다.
- **최소 수정 제안**:
  - `KoreanVoiceController` 내부에 `ownsSpeech` 및 `activeUtteranceSpeed`를 추적하여 `ownsSpeech === true`일 때만 `synth.cancel()`을 호출합니다.
  - `resume()`에서 `inspectMobileAndBrowserTtsSupport(env)`와 `selectBestKoreanVoice`를 재확인하고, 일시정지 중 속도가 변경된 경우(`state.speed !== activeUtteranceSpeed`) 현재 세그먼트(`state.activeSegmentIndex`)부터 새 속도로 즉시 재합성합니다.
  - `MovementMediaGuidancePanel.tsx`에서 `if (active) { movementMediaSessionCoordinator.notifyMovementActivated(exercise.id); }`로 조건부 호출합니다.

---

## 3. 통합 전 후보(Candidate)와 현재 읽기 전용(Read-Only) 검증의 구분

| 구분 | 대상 모듈 | 검증 결과 요약 |
| --- | --- | --- |
| **현재 읽기 전용 구현 (Read-Only Baseline)** | `src/models/ClassVoiceController.ts`<br>`src/utils/koreanVoiceNarration.ts`<br>`src/schemas/movementMediaGuidanceSchema.ts`<br>`src/utils/movementMediaMatcher.ts` | 기본 수명주기 14개 시나리오 및 98개 전체 카탈로그 대본/미디어 정책 통과. 경계 조건 4건(F-01 ~ F-04)에서 결함 재현 확인 (`track-b-adversarial-audit.node-test.mjs`에서 재현 어설션 고정). |
| **통합 전 최소 수정 후보 (Pre-Integration Candidate)** | `scripts/voice-cue-audit-20261107/track-a-implementation/candidate-minimal-fixes.mjs`<br>(`CandidateClassVoiceController`, `createCandidateClassVoiceGuidanceHost`, `createCandidateKoreanVoiceController`) | 기본 수명주기 전체 통과 + 재현된 경계 조건 4건(F-01 ~ F-04) 모두 해결 확인 (`track-a-lifecycle-regression.node-test.mjs` 15/15 통과 및 `track-b-adversarial-audit.node-test.mjs` 7/7 통과). |
