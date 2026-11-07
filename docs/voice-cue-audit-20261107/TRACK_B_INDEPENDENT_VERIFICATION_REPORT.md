# Track B — 무료 브라우저 음성 안내 독립 회귀 검증 및 로컬 브라우저 실행 보고서

## 1. 검증 개요 및 Track 분리 원칙

본 문서는 2트랙 병렬 워크플로우의 **Track B(독립 검증 트랙)** 결과를 기록합니다.
- **Track B 전용 검증 스크립트 및 증거 파일**:
  - [`scripts/voice-cue-audit-20261107/track-b-verification/track-b-adversarial-audit.node-test.mjs`](file:///home/antigravity/blue45f/pilate_flow/scripts/voice-cue-audit-20261107/track-b-verification/track-b-adversarial-audit.node-test.mjs)
  - [`scripts/voice-cue-audit-20261107/track-b-verification/track-b-browser-lifecycle-verify.mjs`](file:///home/antigravity/blue45f/pilate_flow/scripts/voice-cue-audit-20261107/track-b-verification/track-b-browser-lifecycle-verify.mjs)
  - [`docs/voice-cue-audit-20261107/evidence/browser-verification-results.json`](file:///home/antigravity/blue45f/pilate_flow/docs/voice-cue-audit-20261107/evidence/browser-verification-results.json)
  - [`docs/voice-cue-audit-20261107/evidence/regression-summary.json`](file:///home/antigravity/blue45f/pilate_flow/docs/voice-cue-audit-20261107/evidence/regression-summary.json)

---

## 2. 미검증 경계 명시 (Unverified Boundaries — 필수 고지)

> [!WARNING]
> **실제 음성 품질 및 물리 기기(Safari / 모바일 하드웨어) 미검증 고지**
> 1. **실제 스피커 음향 품질 미검증 (`UNVERIFIED`)**: 본 검증은 Linux Debian 12 컨테이너(`HeadlessChrome/156.0.0.0`) 및 Web Speech API 계측 환경에서 수행되었습니다. 물리 오디오 출력 장치(스피커·이어폰)가 없고 컨테이너 OS에 한국어 로컬 음성 합성 엔진(`speech-dispatcher` 한국어 보이스팩)이 설치되어 있지 않으므로, 실제 한국어 발음 자연스러움·억양(Prosody)·하드웨어 출력 음량·오디오 클리핑 여부는 **검증되지 않았습니다**.
> 2. **실제 Apple 기기 Safari (iOS / iPadOS / macOS WebKit) 미검증 (`UNVERIFIED`)**: 실제 iPhone·iPad·Mac 기기의 Safari(`AVSpeechSynthesizer`, `Yuna`/`Sora` 시스템 보이스팩, iOS 측면 벨소리/무음 물리 스위치에 의한 Web Speech 무음 동작, 실제 모바일 백그라운드 오디오 세션 인터럽트)는 본 Linux VM 환경에서 **실행·검증되지 않았습니다** (User-Agent 기반 플랫폼 분기 및 세그먼트 복구 로직만 시뮬레이션으로 검증됨).
> 3. **실제 Android 물리 기기 미검증 (`UNVERIFIED`)**: 실제 Android Chrome / Samsung Internet 기기의 OS 내장 `android.speech.tts.TextToSpeech` 콜드 스타트 지연 및 하드웨어 오디오 포커스 전환은 **검증되지 않았습니다**.

---

## 3. 수명주기 회귀 검증 매트릭스 결과 (Web Speech Mock + 실제 로컬 Chromium 브라우저)

| 검증 항목 | 읽기 전용 기존 구현 (`src/**`) | 통합 전 후보 수정안 (`candidate-minimal-fixes.mjs`) | 실제 로컬 브라우저 (`HeadlessChrome/156.0.0.0`) |
| --- | --- | --- | --- |
| **1. 언어 및 로컬 음성 선택**<br>(`ko-KR`, `ko_KR`, `ko`, `localService === true`, 비한국어·원격 음성 거부, 이름 기반 언어 추정 금지) | **PASS** (`koreanVoiceNarration.ts`)<br>※ `useClassVoiceGuidance.ts`는 배열 순서상 `ko`가 앞설 때 `ko-KR` 우선 선택 누락 (F-03) | **PASS** (`ko-KR` 우선 선택 및 `speak()` 시점 `getVoices()` 재확인) | **PASS** (`chosenVoiceName: "Yuna (Chromium Local ko-KR)"`, `chosenLocalService: true`, `chosenLang: "ko-KR"`) |
| **2. Voice Unavailable / 비동기 로드 / 재생 중 음성 제거**<br>(`speechSynthesis` 미지원, 빈 `getVoices()`, 원격 전용, `voiceschanged`, 에러 복구) | **PASS** (기본 폴백)<br>※ `window.speechSynthesis = undefined` 또는 `addEventListener` 미구현 시 `useClassVoiceGuidance` `TypeError` 재현 (F-03) | **PASS** (`undefined`/비-`EventTarget` 방어, 재생 중 로컬 음성 제거 시 즉시 중단) | **PASS** (Pass 1 순정 Chromium: `nativeVoicesCount: 0` → `no-local-korean-voice`, 버튼 `disabled: true`, 6단계 한국어 대본 표시; Pass 2: 음성 제거 시 `unsupported` 전환) |
| **3. 중복 `speak()` 방지 및 임계값 알림**<br>(초기 진입 무음, 250ms 틱 중복 제거, 구간 전환 1회 발화, 10초 알림 1회, `<=10초` 늦은 활성화 시 지연 알림 억제, `+1분` 재무장) | **PASS** (`ClassVoiceController.ts`) | **PASS** | **PASS** (`afterOptInSpeaks: 1`, `afterDuplicateTicksSpeaks: 1`, `afterPhaseChangeSpeaks: 2`, `afterTenSecWarningSpeaks: 3`) |
| **4. 화면 전환 · 탭 숨김 · `pagehide` · 동작 전환(`A→B→A`)**<br>(`visibilityState === 'hidden'`, `pagehide`, 모달/스테이지 이탈, 재방문 자동재생 금지) | **PASS** (기본 정지)<br>※ 숨김 탭 중 구간 변경 시 복귀 후 지연 발화(F-02b), 비활성 패널 마운트 시 세션 선점(F-04c) 재현 | **PASS** (숨김 탭 구간 동기화 및 `active === true`일 때만 세션 활성화 알림) | **PASS** (`visibilitychange`·`pagehide` 즉시 `cancel()`, `A→B→A` 전환 시 `statusAAfterBSwitch: "idle"`, `noAutoplayOnRevisitA: true`) |
| **5. 음소거 / 즉시 중지 / 선호 옵션 / 속도 조절**<br>(`음성 즉시 중지`, `movement`/`breath`/`time` 개별 스위치, `0.75×~1.25×` 속도 변경) | **PASS** (기본 동작)<br>※ 호흡만 켠 상태에서 무음 휴식 단계로 `newVisit` 진입 시 이전 발화 미취소 재현 (F-01) | **PASS** (`newVisit` 시 `this.cancel()` 보장) | **PASS** (`speedAfterChange: 1.25`, 즉시 중지 및 옵션 변경 시 `cancel()` 호출 확인) |
| **6. 일시정지(`pause`) 및 재개(`resume`)**<br>(LiveStage 재개 시 동일 큐 중복 발화 금지, 모바일 세그먼트 복구, 일시정지 중 속도 변경) | **PASS** (기본 일시정지·모바일 세그먼트 복구)<br>※ 일시정지 중 속도 변경 후 `resume()` 시 이전 속도로 재생되는 현상 재현 (F-04b) | **PASS** (일시정지 중 속도 변경 후 `resume()` 시 새 속도로 현재 세그먼트 재합성) | **PASS** (`pausedStatus: "paused"`, `resumedStatus: "playing"`, `speaksAfterResume: 3`으로 중복 발화 없음) |
| **7. 끝난 수업 / 단계 완료 Cancellation 및 재시작**<br>(`remainingSec === 0` 종료 안내 1회, 유휴 리렌더 시 유지, 수동 일시정지 시 미발화, 완료 단계 재시작 시 `설명 · 세팅` 복귀) | **PASS** | **PASS** | **PASS** (`completionCueText: "계획 시간이 끝났습니다. 다음은 헌드레드입니다."`) |
| **8. React `StrictMode` 이중 마운트 수명주기**<br>(초기 마운트→언마운트→재마운트 시 중복 `speak()` 없음, 리스너 누수 없음) | **PASS** (LiveStage)<br>※ 유휴 `KoreanVoiceController` `destroy()`가 전역 `synth.cancel()`을 호출하는 현상 재현 (F-04a) | **PASS** (`ownsSpeech === true`일 때만 `synth.cancel()` 호출, 클린업 후 리스너 `0`) | **PASS** (`listenersAfterDestroyAll: 0`, 중복 발화 없음) |

---

## 4. 프라이버시 · 보안 · 외부 음성 API 금지 검증 결과

1. **마이크·카메라·음성인식 접근 금지 (`0건`)**:
   - 정적 코드 스캔(`track-b-adversarial-audit.node-test.mjs`) 및 런타임 트랩(`installPrivacyAndNetworkGuards`, Chromium `window.__mediaViolations`) 모두에서 `navigator.mediaDevices.getUserMedia`, `enumerateDevices`, `SpeechRecognition`, `webkitSpeechRecognition`, `MediaRecorder`, `AudioContext` 호출 **0건** 확인.
2. **외부 유료 음성 API 및 사용자 음성 전송 금지 (`0건`)**:
   - Chromium 네트워크 요청 인터셉터(`page.on('request')`)에서 외부 네트워크 요청 **0건**(`externalNetworkRequestsCount: 0`) 확인.
   - `detectForbiddenPaidVoiceOrDownloadUrl` 스키마 가드를 통해 ElevenLabs, OpenAI Audio, Google Cloud TTS, AWS Polly, Naver Clova, Typecast, Azure Speech 등 유료 TTS 도메인 및 `.mp3`/`.mp4` 바이너리 URL 차단 확인.
3. **전체 98개 카탈로그 동작 전수 검증**:
   - `INITIAL_EXERCISES` 98개 전체 동작에 대해 6단계 한국어 음성 대본(`overview`, `setup`, `breath`, `cues`, `layers`, `precautions`) 생성, 무료 브라우저 TTS 면책 고지(`KOREAN_VOICE_DISCLAIMER_KO`), 미디어 준수 감사(`usesPaidVoiceApi: false`, `autoPlaysOnEntryOrSwitch: false`, `externalOriginalLinkAlwaysPresent: true`) 전수 통과.
4. **반응형 뷰포트 레이아웃 무결성 (Pass 1 순정 Chromium)**:
   - `320×850`, `390×850`, `768×1024`, `1440×900` 4개 뷰포트 모두에서 가로 스크롤 오버플로 없음(`scrollWidth === innerWidth`, `noHorizontalOverflow: true`) 및 6개 대본 세그먼트 렌더링 확인.
