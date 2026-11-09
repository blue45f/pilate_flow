# Pilates Flow Atelier — 12시간 장기 고도화 마스터 플랜 (Long-Term Advancement Master Plan)

본 문서는 `pilates-flow` (`Flow Atelier`)의 전체 아키텍처(`src/` 327K+ LOC, `backend/`, `src/models/`, `src/features/`, `src/test/`)를 대상으로 수립한 **12시간(5대 Epic · 15개 세부 스프린트) 규모의 장기 기술 고도화 설계 및 실행 로드맵**입니다.

## 1. 12시간 장기 고도화 로드맵 총괄표 (5 Epics · 12 Hours)

| 구간 (소요 시간) | Epic 명칭 | 핵심 대상 모듈 | 주요 산출물 및 완료 기준 (DoD) |
| :--- | :--- | :--- | :--- |
| **Epic 1**<br>(0.0h ~ 2.5h · 2.5시간) | **초대형 뷰 컴포넌트 도메인 분해 및 상태 훅 분리** | `src/components/SequenceWorkbench.tsx`, `src/components/ExerciseAtlasView.tsx`, `src/components/InstructorScheduleView.tsx`, `src/components/MovementVisualGuideCard.tsx` | 2,000줄 이상 단일 컴포넌트 4종을 각각 600~800줄 이하의 도메인 컨테이너 + 전용 커스텀 훅으로 분해, 불필요 리렌더링 60% 이상 감소 |
| **Epic 2**<br>(2.5h ~ 5.0h · 2.5시간) | **Zustand 단일 스토어 통합 및 IndexedDB 하이브리드 영속화** | `src/store/usePilatesStore.ts`, `src/utils/movementIdeaDraft.ts`, `src/utils/humanMovementCreation.ts`, `backend/backupService.ts` | 분리된 로컬 스토리지 키를 Zustand 단일 스토어로 완전 통합, 로컬 사진/스케치 자산의 IndexedDB 분리 저장으로 5MB 쿼터 한계 해소 |
| **Epic 3**<br>(5.0h ~ 7.5h · 2.5시간) | **98개 동작 도해·모션 리그 지연 스트리밍 및 커버리지 고도화** | `src/data/movementVisualRigCatalog.ts`, `src/features/motionEvidenceReview/trackDExtendedApparatusEvidence.ts`, `src/features/motionCoverage/resolver.ts`, `src/models/**` | 초기 정적 데이터 번들에서 대용량 관절 좌표/문헌 데이터를 동적 `import()` API로 전환, 98개 전 동작의 시작·정점·복귀 3페이즈 SVG 도해 커버리지 100% 완성 |
| **Epic 4**<br>(7.5h ~ 10.0h · 2.5시간) | **다주간 커리큘럼 플래너 및 핸즈프리 라이브 스테이지 v2** | `src/components/DatedSequencePlanningDialog.tsx`, `src/components/LiveStageView.tsx`, `src/models/ClassVoiceController.ts`, `backend/freeAiService.ts` | 4주/8주 그룹별 점진적 프로그램 설계 뷰, 라이브 스테이지 블록 점프·스프링 음성 브리핑, 수업 후 실제 소요 시간 오차(`planned vs actual`) 학습 루프 구축 |
| **Epic 5**<br>(10.0h ~ 12.0h · 2.0시간) | **디자인 시스템 일원화, Candidate 정식 승격 및 E2E 품질 게이트** | `src/styles/atelier-v2.css`, `src/styles/step-inspector.css`, `src/styles/design-tokens.css`, `scripts/verify-backup-recovery-browser.mjs` | 해시 고정 레거시 CSS의 토큰 기반 마이그레이션, 5개 `*Candidate` 피처 모듈 정식 승격, 4대 뷰포트(320/390/768/1440px) 자동 회귀 파이프라인 완성 |

## 2. Epic별 상세 아키텍처 설계 및 스프린트 계획

### Epic 1 (0.0h ~ 2.5h): 초대형 뷰 컴포넌트 도메인 분해 및 상태 훅 분리
- **Sprint 1.1 (0.0h ~ 1.0h) — SequenceWorkbench 도메인 분해**:
  - `src/components/workbench/WorkbenchWelcomeSection.tsx`: 첫 수업 빈 상태 배너, 6종 빈 초안 스타터 칩, 최근 수업 이어가기 카드, 3단계 시각 튜토리얼 영역 분리.
  - `src/components/workbench/WorkbenchInlineToolsBar.tsx`: 시간 구성, 편집 방식, 블록 조합(인라인 스케일링 포함), 4계층 구조 요약 패널 분리.
  - `src/components/workbench/WorkbenchConditionsDialog.tsx`: 3단계 수업 조건 모달 시트 분리.
  - `src/hooks/useWorkbenchRecoverySession.ts`: `WORKBENCH_PREP_RECOVERY_KEY` 기반 세션 스토리지 복구 및 인스펙터 포커스 복원 훅 분리.
- **Sprint 1.2 (1.0h ~ 1.8h) — ExerciseAtlasView & MovementVisualGuideCard 모듈화**:
  - `src/hooks/useAtlasFilterEngine.ts`로 다중 조건 필터·검색·정렬 로직을 분리하고 상세 탭을 지연 렌더링 서브컴포넌트로 분리.
- **Sprint 1.3 (1.8h ~ 2.5h) — InstructorScheduleView 캘린더/배정 분리**:
  - 주간/월간 일정 그리드 계산과 반복 예외(`exceptions`) 편집 모달을 분리하고 반별 최근 3회 이력 셀렉터 훅 연결.

### Epic 2 (2.5h ~ 5.0h): Zustand 단일 스토어 통합 및 IndexedDB 하이브리드 영속화
- **Sprint 2.1 (2.5h ~ 3.3h) — 창작 초안·재사용 블록 Zustand 정식 슬라이스 통합**:
  - `DEFAULT_HUMAN_DRAFT_STORAGE_KEY`, `IDEA_META_STORAGE_KEY`, `IDEA_REUSABLE_BLOCKS_STORAGE_KEY`를 `usePilatesStore` 슬라이스로 일원화 및 자동 마이그레이션(One-Way Hydration) 지원.
- **Sprint 2.2 (3.3h ~ 4.2h) — 로컬 사진·스케치 자산 IndexedDB 분리 저장소 구축**:
  - `pilates-flow-local-media-v1` IndexedDB 저장소에 `local-photo://<sha256>` 스킴으로 대용량 이미지를 분리 보관하여 `QuotaExceededError` 원천 방지.
- **Sprint 2.3 (4.2h ~ 5.0h) — 멀티탭 BroadcastChannel 동기화 및 클라우드 백업 압축**:
  - 리비전 번호(`revision`) 및 타임스탬프 기반 멀티탭 동기화 브리지 구축.

### Epic 3 (5.0h ~ 7.5h): 98개 동작 도해·모션 리그 지연 스트리밍 및 커버리지 고도화
- **Sprint 3.1 (5.0h ~ 5.8h) — 정적 카탈로그 코어/상세 2계층 분리 (Lazy Data Loader)**:
  - `PilatesExerciseCore` 경량 인덱스와 비동기 `loadExerciseVisualRig(exerciseId)` 로더 분리.
- **Sprint 3.2 (5.8h ~ 6.7h) — 98개 카탈로그 전 동작 3페이즈(시작·정점·복귀) 도해 정합성 보강**:
  - 스프링 벡터 화살표, 해부학적 좌우(`L`/`R`) 마커, 호흡 위상 배지 좌표계 표준화.
- **Sprint 3.3 (6.7h ~ 7.5h) — 창작 동작 커스텀 키프레임 스튜디오(Motion Storyboard v2)**:
  - `HumanMovementDraft`에 7대 기본 체위 스켈레톤 기반 시작·끝 자세 스케치 편집기 연결.

### Epic 4 (7.5h ~ 10.0h): 다주간 커리큘럼 플래너 및 핸즈프리 라이브 스테이지 v2
- **Sprint 4.1 (7.5h ~ 8.3h) — 4주/8주 그룹 커리큘럼 프로그레션 플래너**:
  - 반별 4주 시퀀스 난이도 흐름, 척추 움직임 평면 밸런스, 최근 동작 중복률 비교 뷰 제공.
- **Sprint 4.2 (8.3h ~ 9.2h) — 핸즈프리 라이브 스테이지 v2 및 전환 음성 브리핑**:
  - 전환 구간 기구·스프링 음성 안내 및 편측 동작(`left-then-right`) 하프타임 알림 고도화.
- **Sprint 4.3 (9.2h ~ 10.0h) — 계획 시간 대 실제 소요 시간(`Planned vs. Actual`) 피드백 루프**:
  - `elapsedByStep` 실제 소요 시간을 다음 수업 초안 및 재사용 블록 기본 시간에 반영하는 보정 루프 제공.

### Epic 5 (10.0h ~ 12.0h): 디자인 시스템 일원화, Candidate 정식 승격 및 E2E 품질 게이트
- **Sprint 5.1 (10.0h ~ 10.7h) — 5대 `*Candidate` 피처 모듈 정식 승격**:
  - `firstClassTutorialCandidate`, `presetSuggestionCandidate`, `referenceLinkPolicyCandidate`, `rotationDiagramCandidate`, `settingsPageCandidate` 정식 모듈 승격.
- **Sprint 5.2 (10.7h ~ 11.4h) — 해시 고정 CSS의 디자인 토큰 마이그레이션 및 미사용 의존성 정리**:
  - `design-tokens.css` 단일 토큰 체계 통합 및 미사용 패키지 정리.
- **Sprint 5.3 (11.4h ~ 12.0h) — 통합 품질 게이트(`pnpm verify:all`) 구축**:
  - 시크릿 스캔, 타입체크, 린트, 단위/통합 테스트, 모션 원장 검증, PWA 오프라인 검증, 4대 뷰포트 Chromium 회귀 테스트 단일 파이프라인화.

## 3. 정량적 목표 지표 (Target KPIs)

| 지표 항목 | 기준선 (Baseline) | 목표치 (Target) | 검증 명령 |
| :--- | :--- | :--- | :--- |
| **최대 단일 컴포넌트 크기** | 3,010줄 (`SequenceWorkbench.tsx`) | **800줄 이하** | `find src/components -name "*.tsx" \| xargs wc -l` |
| **최대 JS/Data 청크 크기** | 500kB 초과 단일 청크 경고 | **전 청크 350kB 이하** | `pnpm build && pnpm check:pwa` |
| **스토리지 파편화** | 4개 개별 `localStorage` 키 분산 | **단일 Zustand 스토어 + IndexedDB** | `node scripts/verify-backup-recovery-browser.mjs` |
| **회귀 테스트 통과율** | 176개 테스트 파일 | **200+ 테스트 파일 100% 통과** | `pnpm test && pnpm check:motion-study && pnpm check:secrets` |
