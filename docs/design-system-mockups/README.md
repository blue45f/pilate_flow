# Flow Atelier — 통합 디자인 시안 및 고품질 기구학 모션 아틀라스 (`docs/design-system-mockups/`)

본 디렉터리는 **Flow Atelier (Pilates Flow)** 프로젝트에서 설계·검토한 모든 UI/UX 디자인 시안, 단계별 동선 명세, 98종 스튜디오 기구학 모션 도해 시안을 단일 정본으로 통합·정돈한 **마스터 디자인 패키지**입니다. 초기 중간 작업본(`ux-redesign-20261110`, `pilates-toonstudio-ui-ux-20261110`, `redesign-20261111`)의 모든 설계 결과물을 이곳으로 승격하고 중복 작업본은 정리했습니다.

## 1. 수록 파일 구성

| 파일 | 역할 및 포함 범위 | 실제 프로덕션 매핑 |
| :--- | :--- | :--- |
| [`01-flow-atelier-master-mockup.html`](./01-flow-atelier-master-mockup.html) | **전 화면 마스터 인터랙티브 시안** — 데스크톱(`1280px`) & 모바일(`390px`), 고대비, 모션 감소 실시간 전환 지원. ① 홈·새 수업 ② 시퀀스 워크벤치(좌우 분할 / 단계형 리스트 / 3구간 보드 / 스프링 타임라인) ③ 동작 라이브러리 98종 ④ 수업 진행 다크 스테이지 ⑤ 보관함·수업 기록 ⑥ 강사 주간 일정 ⑦ 회원 예약·수강권 지갑 | `src/App.tsx`, `src/styles/atelier-luxury-v2.css`, `src/components/SequenceWorkbench.tsx`, `src/components/LiveStageView.tsx`, `src/components/ClassBinderView.tsx`, `src/components/InstructorScheduleView.tsx`, `src/components/MemberBookingView.tsx` |
| [`02-studio-kinematic-motion-atlas.html`](./02-studio-kinematic-motion-atlas.html) | **5대 기구 연결형 기구학 도해·모션 시안 (v3.0)** — 체어 페달 프레스·리포머·바렐·캐딜락·매트 전신 연결 실루엣(`userSpaceOnUse`), 사이드 핸들·페달·풋바·래더 실제 기구 접점, 시작↔끝 나란히 비교, 연속 모션, `220px` 카드 크기·고대비·모션 감소 검증 (`검증 완료` vs `강사 검토 필요` 경계 명시) | 사용자 시안 선택 후 `src/components/MovementPhaseDiagramSvg.tsx` 반영 예정 |
| [`03-design-tokens.json`](./03-design-tokens.json) | **공통 디자인 토큰 & 모션 규격 정본** — 라이트 에디토리얼 셸, 다크 티칭 스테이지, 스프링 컬러 칩, 인체·기구 일러스트 팔레트, 터치 영역(`44px`), UI 전환 모션(`150ms`/`220ms`/`260ms`), C2 연속 보간 명세 | `src/styles/atelier-luxury-v2.css`, `src/components/SequenceWorkbench.usability.css` |
| [`04-ux-elevation-3-concepts-comparison.html`](./04-ux-elevation-3-concepts-comparison.html) | **핵심 화면 3종 시안 비교 프로토타입** — 시안 A(원스크린 분할 데스크) vs **시안 B(차분한 집중 흐름 + 분할 전환)** vs 시안 C(카드 스택 위저드), 비교표 좁은 열 줄바꿈 방지 및 모바일(`390px`) 카드 스택 지원 | `src/components/SequenceWorkbench.tsx`, `src/components/InlineExerciseFinder.tsx`, `src/components/LiveStageView.tsx` |
| [`05-pilates-flow-full-pages-ux-mockup.html`](./05-pilates-flow-full-pages-ux-mockup.html) | **전 화면(6개 페이지) 수정 디자인 시안 (v3.0)** — 홈 여백·큰 수업 타이머 유지 + 동작 실시간 검색·기구 필터 + 카드/수업 진행 연결형 동작 도해·모션 + 모바일(`390px`/`360px`) 무잘림 3×2 탭 + 반응형 비교표 | 사용자 시안 선택 후 동일 뷰포트 1:1 대조 반영 예정 |
| [`06-parallel-full-suite-showcase.html`](./06-parallel-full-suite-showcase.html) | **보조 화면 5종 다이나믹 병렬 쇼케이스 시안** — ① 강사 일정·오늘 요약 ② 4단계 미리보기·스프링 전환 ③ 수업 후 원탭 빠른 메모 ④ 회원 예약·수강권 요약 ⑤ 3D 기구·모션 감소 시뮬레이터 | `src/components/InstructorScheduleView.tsx`, `src/components/SequencePlanPreview.tsx`, `src/components/LogSessionModal.tsx`, `src/components/MemberBookingView.tsx`, `src/components/Apparatus3dRigPreviewCard.tsx` |
| [`07-first-time-flow-and-recovery-spec.html`](./07-first-time-flow-and-recovery-spec.html) | **첫 사용자 무설명 완성·빈 상태·저장/복원 설계 시안 (비용 0원 HTML)** — ① 2단계 빈 상태 기본 초안 원탭 채우기 & 3단계 저장본 복원 ② 검색 0건 기구 조건 해제 & Esc 비우기 ③ 무료 AI 미검토 초기 상태 복구 ④ 수업 중 순서 변경 스키마 무결성 | `src/components/SequenceWorkbench.tsx`, `src/components/InlineExerciseFinder.tsx`, `src/components/FreeAiAssistantPanel.tsx`, `src/components/LiveStageView.tsx` |
| [`08-candidate-selection-and-side-by-side-audit.html`](./08-candidate-selection-and-side-by-side-audit.html) | **수정 시안 통합 선택 허브 & 동일 크기(`1280×800` / `390×844` / `360×780`) 나란히 대조 보드** — 레이아웃(A1~A3)·도해 모드(D1~D2)·동작 묶음 정책(M1~M2) 선택 및 `05`/`02`/`09` vs 실제 앱(`http://localhost:5173`) 나란히 비교 | 사용자 시안 선택 후 반영 예정 (임의 선반영 금지) |
| [`09-movement-bundle-and-ai-governance-mockup.html`](./09-movement-bundle-and-ai-governance-mockup.html) | **동작 묶음 3열 행동 시안 & AI 보조 설정 화면 시안 (v2.0)** — ① 강사 행동 중심 3열 묶음 작업실(후보 M1/M2 비교, 상세 규칙·매핑표 접힘) ② 상태·방식 선택·확인된 무료 조건 vs 미확인 항목·한도/오류 대응을 갖춘 AI 보조 설정 화면 시안(후보 S1/S2) ③ 도해 점검·상용/Remotion 참고 근거(접힘) | 사용자 시안 선택 후 반영 예정 |

## 2. 핵심 UX 설계 원칙 ("1 페이지 = 1 질문 = 1 명확한 다음 행동")

| 단계 | 화면 질문 (1초 이해) | 핵심 노출 요소 | 다음 행동 버튼 |
| :--- | :--- | :--- | :--- |
| **시작 · 1단계** | **어떤 수업을 만들까요?** | 시간(`30/50/60분`) · 기구(`리포머/매트/체어/캐딜락/바렐`) · 난이도(`기초/초중급/중상급`) 원탭 칩 + `최근 수업 이어가기` | **다음: 동작 담기 →** |
| **2단계** | **어떤 동작을 넣을까요?** | 검색창 + 기구/부위 필터 + 고화질 도해 동작 카드 + `+ 추가` 버튼 | **다음: 순서·시간 다듬기 (N개) →** |
| **3단계** | **순서와 시간만 맞춰 볼까요?** | 담긴 동작 카드 목록 + 4모드 뷰 전환 + 카드 내 **`-0.5분 / +0.5분` 원탭 시간 조절** + `빈 시간 채우기 추천` | **4단계 미리보기·진행 확인 →** |
| **4단계** | **저장하고 수업을 시작할까요?** | 전체 시간·구간 비중 요약 + `저장` / `사본 저장` + `시퀀스 미리보기` / 헤더 `바로 진행` | **수업 시작 →** |
| **수업 진행** | **지금 동작과 다음 세팅은?** | 다크 럭셔리 스테이지(`#181b18`) + 초대형 타이머 + 고화질 도해 + 직하단 **`다음 동작·스프링 예고`** | `이전` · `일시정지/재생` · `다음` (`되돌리기`) |

## 3. 디자인 시안 ↔ 실제 앱 1:1 정합성 체크리스트

1. **라이트 에디토리얼 앱 셸 (`#faf8f4` 캔버스 · `#ffffff` 사이드바 · 세이지 액티브 필)**:
   - `src/main.tsx` 최하단에 `atelier-luxury-v2.css`를 배치하여 레거시 다크 사이드바(`atelier-vnext.css`) 덮어쓰기를 차단하고, 시안과 동일한 화이트 사이드바·반투명 블러 탑바·프리텐다드 산세리프 타이포그래피를 전 화면에 일관 적용했습니다.
2. **시퀀스 워크벤치 4모드 통합 및 원탭 액션**:
   - 시작 화면 2카드(`새 수업 만들기` + `최근 수업 이어가기`)와 상단 헤더 `저장` · `▶ 바로 진행` 원탭 버튼, 4가지 뷰(`원스크린 좌우 분할` · `단계별 리스트` · `3구간 보드` · `스프링 타임라인`), `-0.5분 / +0.5분` 인라인 스테퍼, `빈 시간 채우기 추천` 드로어를 모두 구현했습니다.
3. **수업 진행 다크 스튜디오 스테이지 (`LiveStageView`)**:
   - 시안과 동일한 다크 포커스 스테이지(`#181b18` 배경, `#222722` 카드, 초대형 타이머, 스프링 컬러 칩, 호흡 리듬 콜아웃, 직하단 `다음 순서·스프링 예고`, 실수 복구 Undo 배너)로 구현했으며 고대비 모드를 함께 지원합니다.
4. **98종 전 동작 고품질 스튜디오 기구학 모션 일원화**:
   - 세이지 스튜디오 복장(`#395e4f` / `#496f60`)과 자연스러운 피부 톤(`#f0d7c2`), 로우번 헤어 실루엣, 화이트오크 & 포레스트 가죽 기구 그래픽으로 인체·기구 도해 품질을 일원화했습니다.
   - 개방사슬 원호(Arc) 보간(분절 길이 축소 방지), 폐쇄사슬 2관절 IK(풋바·시트·페달 접점 고정), 척추 순차 분절 파동 보간을 통해 98개 모든 동작이 일관된 스튜디오 품질로 움직입니다.
