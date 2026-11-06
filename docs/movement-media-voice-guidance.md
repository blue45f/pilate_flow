# 동작별 참고 영상·신뢰 공개 자료 매칭 및 한국어 음성 설명(무료 TTS) — 범위 선언·검증 및 통합 제안서

## 1. 담당 파일 및 제외 범위 선언 (Scope & Ownership Boundary)

다른 병렬 세션(AI 서버, 공통 데이터/계층 스키마, 디자인 시스템/전역 스타일, 히스토리/인증 등)의 변경을 덮어쓰지 않도록, 본 세션은 **미디어 고유 모듈만 구현·검증**하고 제외 범위의 공통 파일은 직접 수정하지 않습니다.

### 1.1 담당 파일 (Owned Files — 미디어 고유 모듈)
- [`src/types/movementMediaGuidance.ts`](file:///home/antigravity/blue45f/pilate_flow/src/types/movementMediaGuidance.ts) — 신뢰 공개 출처 매칭, 허용 임베드 결정(`EmbedResolution`), 외부 원본 링크 보장, 한국어 음성 설명 대본(`KoreanVoiceScript`), 무료 브라우저·모바일 기기 TTS 지원 진단(`MobileTtsCapabilityReport`), 미디어 준수 감사(`MediaComplianceAudit`) 타입 정의
- [`src/schemas/movementMediaGuidanceSchema.ts`](file:///home/antigravity/blue45f/pilate_flow/src/schemas/movementMediaGuidanceSchema.ts) — 허용 임베드 화이트리스트(`youtube-nocookie.com/embed/{id}?rel=0&autoplay=0`), 유료 음성 API·무단 영상 다운로드·바이너리 재배포 URL 차단(`detectForbiddenPaidVoiceOrDownloadUrl`), 안전한 외부 원본 URL 검증(`validateSafeExternalReferenceUrl`), 음성 속도 검증(`koreanVoiceSpeedSchema`)
- [`src/schemas/movementMediaGuidanceSchema.test.ts`](file:///home/antigravity/blue45f/pilate_flow/src/schemas/movementMediaGuidanceSchema.test.ts) — 임베드 정책·유료 음성/무단 다운로드 차단·외부 링크 보장 단위 테스트
- [`src/utils/movementMediaMatcher.ts`](file:///home/antigravity/blue45f/pilate_flow/src/utils/movementMediaMatcher.ts) — 전체 98개 카탈로그 동작(오리지널 68개 + 큐레이션 30개) 및 사용자 직접 작성 동작에 대해 검증된 공개 출처(`VERIFIED_REFERENCES`, `PUBLIC_REFERENCES`, NHS/BASI 임상·교육 도해 출처, 보존된 원출처 스냅샷)를 읽기 전용으로 매칭하는 결정론적 리졸버 및 임베드 불가/재생 실패 폴백 핸들러(`resolveEmbedFailureFallback`)
- [`src/utils/movementMediaMatcher.test.ts`](file:///home/antigravity/blue45f/pilate_flow/src/utils/movementMediaMatcher.test.ts) — 동작별 공개 출처 매칭 및 임베드 불가/재생 실패 폴백 단위 테스트
- [`src/utils/koreanVoiceNarration.ts`](file:///home/antigravity/blue45f/pilate_flow/src/utils/koreanVoiceNarration.ts) — 동작별 6단계 한국어 음성 대본 생성(`buildKoreanVoiceScript`), 무료 브라우저/모바일 기기 Web Speech API(`speechSynthesis`) 지원 상태 진단(`inspectMobileAndBrowserTtsSupport`), 수동 재생·일시정지·이어듣기·정지·속도 조절 컨트롤러(`createKoreanVoiceController`), 동작 전환 시 이전 영상·음성 즉시 정지 코디네이터(`movementMediaSessionCoordinator`)
- [`src/utils/koreanVoiceNarration.test.ts`](file:///home/antigravity/blue45f/pilate_flow/src/utils/koreanVoiceNarration.test.ts) — 한국어 음성 대본, 모바일/데스크톱/미지원 환경 TTS 진단, 수동 재생·속도·일시정지·동작 전환 정지 단위 테스트
- [`src/components/MovementMediaGuidancePanel.tsx`](file:///home/antigravity/blue45f/pilate_flow/src/components/MovementMediaGuidancePanel.tsx) — 동작별 참고 영상·신뢰 공개 자료 매칭 뷰어(초기 진입·동작 전환·재방문 자동 재생 금지, 수동 클릭 시에만 시작, 임베드 불가/재생 실패 시 외부 원본 보기 상시 제공) 및 한국어 음성 설명(수동 재생·일시정지·정지·속도·전체 텍스트 대본) 전용 컴포넌트
- [`src/components/MovementMediaGuidancePanel.test.tsx`](file:///home/antigravity/blue45f/pilate_flow/src/components/MovementMediaGuidancePanel.test.tsx) — 미디어·음성 설명 컴포넌트 및 모달 통합 여정 검증 테스트
- [`src/styles/movement-media-guidance.css`](file:///home/antigravity/blue45f/pilate_flow/src/styles/movement-media-guidance.css) — `.movement-media-guidance-panel` 범위로 격리된 미디어 고유 스타일시트 (전역 스타일 미수정)
- [`src/components/YouTubeClipModal.tsx`](file:///home/antigravity/blue45f/pilate_flow/src/components/YouTubeClipModal.tsx) — 미디어 도메인 상세 모달(`YouTubePreviewModal`) 내 `MovementMediaGuidancePanel` 연결 및 동작 전환 시 미디어/음성 정지 보장
- [`docs/movement-media-voice-guidance.md`](file:///home/antigravity/blue45f/pilate_flow/docs/movement-media-voice-guidance.md) — 본 정책·검증 보고 및 공통 파일 통합 제안서

### 1.2 제외 범위 (Excluded Scope — 직접 수정 금지)
- **AI 서버 및 AI 보조 모듈**: `backend/**`, `src/lib/freeAiClient.ts`, `src/utils/freeAiAssistantEngine.ts`, `src/schemas/freeAiAssistantSchema.ts`, `src/components/FreeAiAssistantPanel.tsx`, `src/types/freeAiAssistant.ts`
- **공통 데이터 원장 및 스토어/스키마**: `src/data/pilatesCatalog.ts`, `src/data/originalMovements.ts`, `src/data/verifiedReferences.ts`, `src/data/publicReferences.ts`, `src/data/courseReferences.ts`, `src/data/motionReferences.ts`, `src/data/motionPatternReferences.ts`, `src/data/motionStudyLedger.json`, `src/data/sourceCatalog/**`, `src/types/pilates.ts`, `src/types/hierarchy.ts`, `src/schemas/pilatesSchema.ts`, `src/schemas/cloudBackupSchema.ts`, `src/store/usePilatesStore.ts`
- **전역 스타일 및 디자인 시스템**: `src/styles/design-tokens.css`, `src/styles/studio.css`, `src/styles/controls.css`, `src/styles/teaching.css`, `src/design-system/**`
- **공통 워크스페이스 엔트리 및 타 세션 뷰**: `src/App.tsx`, `src/components/SequenceWorkbench.tsx`, `src/components/ExerciseAtlasView.tsx`, `src/components/LiveStageView.tsx`, `src/components/ClassBinderView.tsx`, `src/components/StepBlockInspector.tsx`, `package.json`, `pnpm-lock.yaml`

---

## 2. 신뢰 가능한 공개 출처 매칭 및 허용 임베드 정책

| 매칭 계층 (`matchTier`) | 출처 기관 / 채널 | 임베드 허용 정책 (`embedPolicy`) | 외부 원본 보기 링크 (`externalOriginalUrl`) |
| --- | --- | --- | --- |
| **`exact-source-snapshot`** | 동작 노트에 보존된 `sourceReference` 원출처 (`Merrithew`, `WITH PILATES` 등) | YouTube 출처만 `youtube-nocookie-allowed`, 웹사이트는 `external-link-only` | **항상 제공** (`target="_blank" rel="noopener noreferrer"`) |
| **`curated-youtube-reference`** | 동작에 등록된 공식 YouTube 구간 참조 (`YouTubeClipRef`) | `youtube-nocookie-allowed` (`https://www.youtube-nocookie.com/embed/{id}?rel=0&autoplay=0`) | **항상 제공** (시작 시점 `&t={startSec}s` 포함) |
| **`clinical-pattern-source`** | NHS 물리치료 환자 안내문(South Tees, Poole/UHD, North Tees, CUH 등), BASI 아티클 | `external-link-only` (임베드 비허용 · 원문/PDF 직접 열기) | **항상 제공** |
| **`verified-catalog-match`** | `VERIFIED_REFERENCES` 30선 (Merrithew 공식 웹사이트 21건 + WITH PILATES STOTT Lead IT 국내 후보 9건) | YouTube(`kr-01`~`kr-09`)는 수동 `youtube-nocookie-allowed`, 웹사이트(`mv-01`~`mv-18`, `sr-01`~`sr-03`)는 `external-link-only` | **항상 제공** |
| **`public-education-portal`** | 국민체육진흥공단(국민체력100), 질병관리청(국가건강정보포털) | `external-link-only` (공공누리 이용 조건 준수 · 링크 전용) | **항상 제공** |

### 핵심 안전·권리 수칙
1. **수동 시작 전용 (No Autoplay)**: 초기 진입, 다른 동작으로 전환, 이전 동작 재방문 시 절대 `<iframe>`을 자동으로 마운트하거나 자동 재생(`autoplay=1`)하지 않습니다. 사용자가 `참고 영상 수동 불러오기` 버튼을 직접 눌렀을 때만 시작합니다.
2. **임베드 불가·재생 실패 시 폴백**: 출처가 `external-link-only`이거나 게시자 제한/네트워크 사유로 임베드 재생이 실패(`onError` 또는 `임베드 불가·재생 실패 시 전환` 클릭)할 경우 즉시 `<iframe>`을 제거하고 `외부 원본 보기` 링크로 안내합니다.
3. **무단 다운로드·바이너리 재배포 원천 차단**: `detectForbiddenPaidVoiceOrDownloadUrl`을 통해 YouTube 추출기/다운로더 도메인 및 `.mp4`/`.mp3` 직접 재배포 URL을 스키마 수준에서 차단합니다.

---

## 3. 무료 브라우저·모바일 기기 한국어 TTS 지원 확인 및 폴백 설계

유료 음성 합성 API(ElevenLabs, Google Cloud TTS, OpenAI Audio, AWS Polly, Naver Clova 등)를 일체 사용하지 않고, **무료 표준 Web Speech API (`window.speechSynthesis` / `SpeechSynthesisUtterance`)**와 **상시 노출 한국어 텍스트 대본**을 결합했습니다.

| 플랫폼 / 환경 | `speechSynthesis` 특징 및 모바일 제약 | 본 모듈의 대응 및 지원 방식 |
| --- | --- | --- |
| **iOS / iPadOS Safari (WebKit)** | 1) 첫 호출 시 `getVoices()`가 빈 배열일 수 있음 (`voiceschanged` 비동기 로드)<br>2) 반드시 사용자의 직접 탭(User Gesture) 이벤트 안에서 `speak()` 호출 필요<br>3) 백그라운드 전환 또는 `pause()` 장기 대기 시 큐가 멈출 수 있음 | - `Yuna`/`Sora` 등 `localService: true` 한국어 기기 음성을 우선 선택하고, `getVoices()` 비어 있을 때도 `utterance.lang = 'ko-KR'`로 OS 기본 한국어 엔진 호출<br>- `play()` 클릭 핸들러 내부에서 즉시 `cancel()` 후 `speak()` 동기 호출<br>- 세그먼트 인덱스(`activeSegmentIndex`) 추적으로 `resume()` 불가 시 현재 문단부터 안전 재개 |
| **Android Chrome / Samsung Internet** | 1) Google 한국어 / Samsung TTS 음성이 비동기로 로드됨<br>2) 재생 중 `rate`(속도) 변경 시 기존 Utterance에는 즉시 반영되지 않음 | - `voiceschanged` 이벤트 구독으로 한국어 음성 자동 갱신<br>- 재생 중 속도(`0.75×`~`1.25×`) 변경 시 현재 세그먼트(`activeSegmentIndex`)부터 새 속도로 즉시 재합성 |
| **데스크톱 브라우저 (Chrome / Edge / Safari / Firefox)** | OS 내장 무료 한국어 음성 또는 브라우저 기본 `ko-KR` 음성 제공 | - 로컬 무료 기기 음성(`localService === true`) 최우선 선택, 수동 재생·일시정지·이어듣기·정지·구간별 듣기 지원 |
| **음성 미지원 WebView / 무음 환경 / 테스트(JSDOM)** | `window.speechSynthesis` 미제공 또는 음성 출력 불가 | - 오류 없이 `unsupported` 상태로 전환하며, 화면에 **6단계 한국어 음성 설명 텍스트 대본(`overview`, `setup`, `breath`, `cues`, `layers`, `precautions`)을 항상 기본 표시**하여 100% 읽기 가능 |

---

## 4. 공통 파일 통합 제안 (통합 담당자용 비침투적 연결 가이드)

`MovementMediaGuidancePanel`과 `movementMediaSessionCoordinator`는 이미 `YouTubeClipModal.tsx`(`YouTubePreviewModal`) 내부에 연결되어 동작 라이브러리·워크벤치에서 동작 상세를 열 때 즉시 사용할 수 있습니다. 추후 공통 화면(`StepBlockInspector`, `LiveStageView`, `SequenceWorkbench`)에 직접 인라인 배치를 원할 경우 통합 담당자는 아래 스니펫만 추가하면 됩니다.

### 4.1 `src/components/StepBlockInspector.tsx` 인라인 배치 제안
```tsx
import { MovementMediaGuidancePanel } from './MovementMediaGuidancePanel';

// StepBlockInspector 내부 ExerciseEvidencePanel 상단 또는 하단에 배치:
{exercise && (
  <MovementMediaGuidancePanel
    key={exercise.id}
    exercise={exercise}
    active={playbackActive}
  />
)}
```

### 4.2 `src/components/LiveStageView.tsx` 수업 진행 중 동작 전환 정지 및 음성 큐 보조 제안
```tsx
import { useEffect } from 'react';
import { movementMediaSessionCoordinator } from '../utils/koreanVoiceNarration';
import { MovementMediaGuidancePanel } from './MovementMediaGuidancePanel';

// LiveStageView에서 현재 단계(clock.index / current?.exerciseId)가 바뀔 때 이전 미디어/음성 즉시 정지:
useEffect(() => {
  if (current?.exerciseId) {
    movementMediaSessionCoordinator.notifyMovementActivated(current.exerciseId);
  } else {
    movementMediaSessionCoordinator.stopAllActiveMedia('휴식 단계 또는 수업 종료로 미디어를 멈췄습니다.');
  }
}, [current?.exerciseId]);
```
