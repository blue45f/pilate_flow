# Pilates Flow UX/UI 전면 개선 · 경쟁 제품 비교 · 시안 및 AI 보조 설계서 (`2026-11-10`)

본 문서는 `Pilates Flow` (`pilates-flow-studio`)의 복잡한 화면과 사용 흐름(`동작 탐색 → 수업 구성 → 수업 진행 → 기록` 및 `회원 수업 예약·수강권 확인`)을 개선하기 위해 수행한 **스킬·MCP·수정 범위 점검**, **경쟁 제품 비교 및 재해석**, **`@generate-fresh-ideas` 5대 관점 리믹스**, **데스크톱·모바일 시안 설계**, **OpenAI 서버 보조 아키텍처**를 정리한 문서입니다.

---

## 1. 스킬·MCP 가용성 확인 및 수정 범위 격리

### 1.1 연결 폴더 및 요청 스킬·MCP 점검 결과

| 구분 | 항목 | 상태 | 확인 결과 및 실제 적용 내역 |
| :--- | :--- | :--- | :--- |
| **연결 폴더** | `/Users/hjunkim/WebstormProjects/pilates-flow` | **확인 완료** | `src/`(프론트엔드 98개 동작 카탈로그·워크벤치·아틀라스·라이브 스테이지·일정·바인더·기록), `backend/`(`index.ts`, `backupService.ts`, `freeAiService.ts`), `src/booking-core/`(예약·대기·수강권 엔진), `tools/pilates-csv-import/`(회원·수업 CSV 검증기) 전체 소스 확인 |
| **스킬 1** | `@generate-fresh-ideas` | **사용 가능 · 적용 완료** | 5대 창의 렌즈(`🔥 Contrarian Take`, `📖 Personal Story Hook`, `📊 Data / Evidence Angle`, `✅ Practical Playbook`, `🎯 What They Missed`)로 UX 개선 방향을 도출(본 문서 3장)하고, 워크벤치 내 5대 수업 컨셉 리믹스 UI를 간결한 목적형 카드로 정돈 |
| **스킬 2** | `@Blender` (`blender` MCP, Blender 5.2.0 LTS) | **사용 가능 · 적용 완료** | 라이브 Blender 5.2.0 LTS(`BLENDER_EEVEE`) 연결 확인. 2D 웹 화면 시안은 반응형 HTML/CSS 및 UI 시안 이미지로 제작하고, 앱의 3D 기구·관절 도해(`Apparatus3dRigPreviewCard` / `blenderSceneScriptExporter.ts`) 검증용 필라테스 리포머 3D 스튜디오 뷰포트 스냅샷(`reformer-3d-blender-preview.png`)을 실제 렌더링 |
| **스킬 3** | `@Git` (`git` MCP) | **사용 가능 · 적용 완료** | `git_status` 클린 확인, `origin/main`(`2b28e1f`) 동기화, 수정 범위 점검, 커밋 및 원격 `origin/main` 푸시까지 모든 Git 작업을 `git` MCP로 수행 |
| **추가 확인** | `레아 MCP` (`reverse-engineer-anything`) | **현재 세션 미연결 (불가)** | 현재 활성 MCP 목록(`git`, `obsidian`, `blender`)에 `레아 MCP`가 연결되어 있지 않음을 확인. 지침에 따라 공개 웹 자료 조사 및 저장소 내 기존 아카이브(`docs/rea-peer-service-analysis-20261108/README.md`)로 진행 |

### 1.2 다른 작업과 충돌하지 않는 수정 범위 원칙
- **보존 대상 (무수정·하위 호환 100% 유지)**:
  - `src/schemas/cloudBackupSchema.ts`, `backend/backupService.ts`: 기존 버전 3(`version: 3`) JSON/서버 백업 스키마 및 복구 호환성 유지
  - `src/data/pilatesCatalog.ts`, `src/data/verifiedReferences.ts`: 98개 기본 동작 카탈로그, 30개 공개 참고 자료 원장, 검토 상태(`review`) 무결성 보존
  - `src/booking-core/**`, `tools/pilates-csv-import/**`: 기존 예약 코어 모듈 및 CSV 검증 CLI 보존
- **개선·추가 범위**:
  - `src/App.tsx`, `src/components/StudioJourneyBar.tsx`(신규), `src/components/MemberBookingView.tsx`(신규), `src/utils/memberBookingBridge.ts`(신규), `src/styles/member-booking.css`(신규): **강사 4단계 수업 여정 바** 및 **`booking-core` 기반 회원 전용 예약·수강권 뷰** 분리
  - `src/components/SequenceWorkbench.tsx`, `src/components/workbench/StudioFlowOptimizerPanel.tsx`, `src/components/ExerciseAtlasView.tsx`, `src/components/LiveStageView.tsx`, `src/components/ClassBinderView.tsx`: 정보 밀도 축소, 자주 쓰는 행동 전면 배치, 상세 설정 접기(Progressive Disclosure), 자연스러운 한국어 문구 다듬기
  - `src/types/freeAiAssistant.ts`, `src/schemas/freeAiAssistantSchema.ts`, `backend/freeAiService.ts`, `src/lib/freeAiClient.ts`, `src/components/FreeAiAssistantPanel.tsx`: **서버 측 OpenAI API(`OPENAI_API_KEY`) 보조 기능(수업 초안·동작 아이디어·시퀀스 구성·동작 탐색 추천)** 통합 및 보안·개인정보·비의료 가드레일 강화

---

## 2. 필라테스·수업 운영 경쟁 제품 비교 및 UX 원리 재해석

확인된 공개 웹 출처와 저장소 내 정적·동적 분석 아카이브를 바탕으로, 국내외 필라테스 시퀀스 빌더 및 스튜디오 운영 제품의 흐름을 비교하고 기존 UI를 복제하지 않은 채 핵심 원리만 재해석했습니다.

| 분류 | 서비스 및 확인 출처 | 핵심 UI · 기능 · 사용 흐름 특징 | Pilates Flow 재해석 적용 원리 |
| :--- | :--- | :--- | :--- |
| **시퀀스 계획·티칭** | **[The Class Plan](https://theclassplan.com/)** | 기구·부위·난이도 필터 탐색 → 드래그 구성(변형 포함) → 폰/태블릿 수업 진행의 **3단계 단순 흐름** | 강사 화면 상단에 **`1 동작 탐색 → 2 수업 구성 → 3 수업 진행 → 4 수업 기록`** 여정 바를 고정해 현재 위치와 다음 행동을 즉시 안내 |
| **시퀀스 계획·티칭** | **[The Pilates Academy App](https://gopilatesacademy.com/about/the-pilates-app/)** | `Browse → Build → Teach` 직선 동선과 템플릿 즉시 재사용 | 빈 수업 화면에서 자주 쓰는 **동작 고르기 / 프리셋 시작 / 최근 수업 이어가기**만 전면에 두고 부가 도구는 접기 처리 |
| **시퀀스·큐잉 분석** | **[Tummee](https://www.tummee.com/yoga-sequence-builder/product-tour/1)** · **[FLOW vs Tummee 비교](https://www.yoga-sequencing.com/compare/tummee-vs-flow)** | 전후 연결 동작 추천, 호흡·큐잉 통합, 모바일 한 손 조작과 상세 분석 지표 분리 | 본문에는 시퀀스 블록과 시간 합계만 깔끔히 남기고, 척추 평면·에너지 곡선·3D 도해는 **`흐름·기구 세팅 점검`** 접기 영역으로 분리 |
| **동작 탐색 카탈로그** | **[Pilates Anytime](https://www.pilatesanytime.com/pilates-exercises)** · **[Merrithew](https://www.merrithew.com/)** | 카드 첫 줄에서 **기구 탭 · 난이도 · 분 단위 시간**을 모달 열기 전에 즉시 식별 | 동작 탐색(`ExerciseAtlasView`)과 AI 동작 탐색 추천에서 기구·시간·난이도·호흡 큐를 한눈에 비교 후 원클릭으로 수업안에 추가 |
| **한국형 강사 일과·수강권** | **[워니노트 (WonyNote)](https://wonynote.com/pilates-instructor-app.html)** | 한국 필라테스 강사의 **수업 전 특이사항 확인 → 웜업/메인/쿨다운 시퀀스 첨부 → 수업 후 완료 체크 및 횟수제 수강권 관리** | 강사 수업 기록(`Planned vs. Actual`)과 횟수제 수강권 잔여 횟수·유효기간 확인 흐름을 역할별로 명확히 분리 |
| **스튜디오 예약·대기열** | **[스튜디오메이트](https://studiomate.kr/)** · **[바디코디](https://bodycodi.com/)** · **[Momence](https://www.momence.com/booking-and-scheduling/)** · **[Walla](https://www.hellowalla.com/)** | 회원용 앱과 강사/관리자용 뷰 분리, **정원 마감 시 대기 신청 및 취소 발생 시 자동 승급(Auto-promotion)**, 무료 취소 기한 고지 | 상단 전환 스위치로 **강사 작업실**과 **회원 예약·수강권 화면**을 분리하고, `PilatesBookingEngine`으로 정원·대기 순번·자동 승급·차감 전후 횟수 확인 모달 구현 |

---

## 3. `@generate-fresh-ideas` 5대 렌즈 기반 UX 리믹스

**💡 Remix: 복잡한 필라테스 수업·운영 앱 단순화 · Sources used: 로컬 코드(`src/`) + 공개 경쟁사 자료([The Class Plan](https://theclassplan.com/), [워니노트](https://wonynote.com/pilates-instructor-app.html), [스튜디오메이트](https://studiomate.kr/), [Momence](https://www.momence.com/booking-and-scheduling/))**

1. **🔥 CONTRARIAN TAKE: 강사에게 필요한 건 ‘더 많은 분석 차트’가 아니라 수업 5분 전에 끝나는 ‘단 하나의 다음 행동’이다.**
   - → **Angle:** 많은 피트니스 앱이 생체역학 지표와 설정 옵션을 한 화면에 늘어놓을수록 전문적이라고 믿지만, 연강 사이 쉬는 시간 10분 동안 강사에게 과밀한 패널은 오히려 방해물입니다. 기본 화면에는 **동작 담기·순서 조정·수업 시작**만 남기고, 동선 최적화와 3D 기구 리깅은 필요할 때만 여는 접기 구조가 실제 수업 준비 속도를 높입니다.
2. **📖 PERSONAL STORY HOOK: 회원 예약 문자 확인하다 시퀀스 메모를 놓치던 저녁 7시 그룹 수업 직전의 혼선.**
   - → **Angle:** 강사 일정·시퀀스 편집 화면과 회원 예약·수강권 확인 정보가 뒤섞여 있으면, 수업 직전 잔여석과 스프링 세팅을 동시에 확인하다 실수가 생깁니다. **3-Beat 구조:** (1) Setup: 저녁 그룹반 시작 5분 전 복잡한 단일 화면 → (2) Friction: 회원 대기 문의와 스프링 확인이 한 화면에서 충돌 → (3) Lesson: **강사 모드(탐색·구성·진행·기록)**와 **회원 화면(수강권·시간표·예약 확인)**을 목적별로 분리해 두 역할 모두 3번의 터치 안에 목적을 달성하도록 개선.
3. **📊 DATA / EVIDENCE ANGLE: 화면당 노출 도구 수 축소와 스프링·박스 전환 시간(`transitionSec`) 실측 관리.**
   - → **Angle:** `SequenceWorkbench`에 동시 노출되던 10개 이상의 보조 블록을 핵심 흐름 + 선택형 접기 구조로 줄이고, 리포머·체어 전환 시 필요한 **15~45초 전환 여유 시간**과 **50분 목표 대비 편차**만 상단 요약 바에 고정합니다. 운영 후 `[수업 준비 완료까지 걸리는 평균 클릭 수]` 및 `[계획 시간 대비 실제 종료 시간 편차(분)]` 지표로 개선 효과를 검증할 수 있습니다.
4. **✅ PRACTICAL PLAYBOOK: 처음 여는 강사와 회원을 위한 3분 실전 사용 동선.**
   - → **Angle:** 설명서를 읽지 않아도 바로 쓸 수 있는 역할별 직선 동선:
     1. **강사 — 동작 탐색·구성:** 기구 칩 선택 → 동작 추가(또는 OpenAI/조건 초안 생성) → `50분에 맞추기` 클릭.
     2. **강사 — 수업 진행·기록:** `시퀀스 미리보기` → `수업 시작` 큰 글씨 타이머·다음 세팅 배너 확인 → `종료 / 기록`으로 실제 진행 시간 저장.
     3. **회원 — 수강권·예약:** 상단 `회원 예약` 전환 → 내 잔여 횟수·만료일 확인 → 주간 날짜에서 `예약하기` 또는 `대기 신청` 클릭 후 차감 전후 횟수 동의.
5. **🎯 WHAT THEY MISSED: AI 수업 도우미가 신뢰받으려면 ‘화려한 문장’보다 ‘미검토·비의료 경계와 서버 키 보안’이 먼저다.**
   - → **Angle:** 기존 피트니스 AI 기능들은 의학적 교정 효과를 단정하거나 브라우저에 API 키 입력을 요구해 보안·안전 위험을 만듭니다. 서버 환경변수(`OPENAI_API_KEY`) 전용 호출, 민감 건강·실명 전송 사전 차단, 키 미설정 시 기기 내 조건 엔진 자동 전환, 그리고 **의학적 진단·치료 사실이 아닌 강사 참고용 초안**이라는 명확한 한계 고지가 함께 있어야 현장에서 안심하고 쓸 수 있습니다.

---

## 4. 데스크톱·모바일 시안 및 한국어 문구 개선 기준

### 4.1 제작된 시안 자산
1. **데스크톱·모바일 인터랙티브 시안 (HTML/CSS)**: [`docs/ux-redesign-20261110/desktop-mobile-prototype.html`](desktop-mobile-prototype.html)
   - 데스크톱(`1280px` 3단 아틀리에 레이아웃: 좌측 메뉴 · 중앙 4단계 여정 바 & 3구간 시퀀스 보드 · 우측 단일 동작 인스펙터)
   - 모바일(`390px` 회원 예약·수강권 뷰 및 강사 1열 집중 뷰 토글 포함)
2. **3D 리포머 스튜디오 뷰포트 레퍼런스 (`@Blender` 5.2.0 LTS 렌더링)**: [`docs/ux-redesign-20261110/reformer-3d-blender-preview.png`](reformer-3d-blender-preview.png)

### 4.2 자연스럽고 구체적인 한국어 문구 개선 예시

| 위치 | 기존 문구 (장황하거나 번역투·시스템 중심) | 개선 문구 (자연스럽고 구체적인 한국어) |
| :--- | :--- | :--- |
| 워크벤치 고급 패널 제목 | `스튜디오 동선 최적화 · 관찰 맞춤 레이어 · RPE 에너지 곡선 · Verify AI · 5대 테마 각도` | `기구 전환·난이도 정돈 및 수업 테마 제안` |
| AI 보조 상태 안내 | `캐시된 무료 AI 수업 초안을 불러왔습니다 (무료 한도 차감 없음).` | `이전에 만든 수업 초안을 바로 불러왔어요 (사용량 차감 없음).` |
| AI 보조 완료 안내 | `무료 AI로 편집 가능한 수업 초안을 만들었습니다.` | `조건에 맞춰 수업 초안을 만들었어요. 순서와 시간을 자유롭게 다듬어 보세요.` |
| AI 보조 빈 상태 | `현재 조건에 해당하는 검토 완료(Approved) 동작이 없습니다.` | `선택한 기구·난이도에 맞는 검토 완료 동작이 아직 없어요. 동작 라이브러리에서 검토를 마친 뒤 다시 시도해 주세요.` |
| 서버 키 미설정 안내 | `외부 무료 AI가 설정되지 않아 로컬 규칙 엔진·수동 편집·저장 프리셋 모드로 동작합니다.` | `서버 AI 키가 연결되어 있지 않아 기기 내 조건 추천으로 동작합니다.` |
| 회원 예약 확인 안내 | (신규 연결) | `수강권 1회가 차감됩니다 (예약 전 7회 → 확정 후 6회). 수업 시작 12시간 전까지 취소하면 횟수가 그대로 복구됩니다.` |

---

## 5. OpenAI API 서버 보조 기능 선정 및 보안·안전 설계

### 5.1 선정한 핵심 AI 보조 기능 (4종)
1. **조건 기반 수업 초안 생성 (`class-draft`)**: 시간(10~120분), 기구, 난이도, 집중 부위를 입력하면 **검토 완료(`isReviewed: true`) 카탈로그 동작만** 사용하여 준비·본운동·마무리 초안과 코칭 요약을 구성.
2. **한 줄 동작 아이디어 구체화 (`movement-idea`)**: 강사의 짧은 동작 메모를 바탕으로 호흡 패턴, 티칭 큐잉, 주의사항, **Easy / Standard / Hard 3단계 변형**을 정리(항상 `미검토 창작 동작`으로 분리 저장).
3. **검토 동작·블록 맞춤 시퀀스 조합 (`sequence-compose`)**: 강사가 직접 고른 검토 완료 동작·재사용 블록만 엮어 목표 시간에 맞는 순서와 전환 가이드를 제안(미검토 항목 자동 제외).
4. **동작 탐색·큐잉 빠른 추천 (`atlas` & `FreeAiAssistantPanel` 탐색 도우미)**: 현재 수업 기구·목표 부위에 어울리는 동작 후보를 빠르게 좁히고 핵심 큐와 스프링 확인 포인트를 요약해 바로 수업안에 추가.

### 5.2 보안·과금·개인정보·비의료 원칙
- **서버 전용 환경변수**: `backend/freeAiService.ts`에서만 `process.env.OPENAI_API_KEY`(선택: `OPENAI_MODEL`, 기본값 `gpt-4o-mini`, `OPENAI_ORG_ID`, `OPENAI_PROJECT_ID`)를 읽습니다.
- **키 노출 원천 차단**: 브라우저 번들(`VITE_*`), 클라이언트 요청 필드(`BYOK`), Git 추적 파일(`scripts/check-secrets.mjs`), 서버 응답 본문·로그, 프롬프트 어디에도 키를 포함하지 않습니다.
- **무동의 결제·한도 변경 금지**: 유료 크레딧 자동 충전이나 결제 한도 변경 API를 일절 호출하지 않으며, 서버 키 미설정 시 오류로 멈추지 않고 즉시 로컬 조건 기반 엔진으로 전환합니다.
- **민감 개인·건강정보 차단 및 비의료 고지**: 실명·연락처·질환명·수술력·임신·급성 통증 문구 입력 시 외부 API 전송을 즉시 차단하고, 모든 결과에 **의학적 진단·치료·교정 사실이 아닌 강사 수업 기획 참고 자료**임을 명시합니다.
