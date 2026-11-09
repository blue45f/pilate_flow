# Pilates Flow Atelier — 60시간 장기 고도화 마스터 플랜 (Epics 1~25 · `main` 단일 브랜치 통합 아키텍처)

본 문서는 `pilates-flow` (`Flow Atelier`)의 전체 아키텍처(`src/` 327K+ LOC, `backend/`, `src/models/`, `src/features/`, `src/test/`)를 대상으로 수립·실행한 **60시간(25대 Epic · Wave 1~6) 규모의 장기 기술 고도화 설계 및 `main` 단일 브랜치 운영 배포 마스터 플랜**입니다.

## 1. 60시간 장기 고도화 로드맵 총괄표 (25 Epics · 60 Hours)

| 구간 (소요 시간) | Epic 명칭 | 핵심 대상 모듈 | 주요 산출물 및 완료 상태 |
| :--- | :--- | :--- | :--- |
| **Epic 1**<br>(0.0h ~ 2.5h) | **워크벤치 도메인 분해 및 복구 세션 훅 분리** | `src/components/SequenceWorkbench.tsx`, `src/hooks/useWorkbenchRecoverySession.ts`, `src/components/workbench/*` | `useWorkbenchRecoverySession`, `WorkbenchHierarchySummary`, `WorkbenchBlankStarters` 분리 완료 (`e860544`, `ff74e8e`) |
| **Epic 2**<br>(2.5h ~ 5.0h) | **IndexedDB 로컬 미디어 저장소 및 멀티탭 동기화 브리지** | `src/utils/localMediaStorage.ts`, `src/utils/movementIdeaDraft.ts` | IndexedDB(`pilates-flow-local-media-v1`) 사진 저장소 및 `BroadcastChannel` 브리지 완료 (`ff74e8e`) |
| **Epic 3**<br>(5.0h ~ 7.5h) | **98개 동작 도해·비주얼 리그 온디맨드 지연 로더** | `src/utils/lazyVisualRigLoader.ts`, `vite.config.ts` | 비주얼 리그 및 Track C/D 근거 데이터 동적 `import()` 캐시 로더 완료 (`ff74e8e`) |
| **Epic 4**<br>(7.5h ~ 10.0h) | **수업 기록 계획 대 실제 시간(`Planned vs. Actual`) 비교 배너** | `src/components/LogSessionModal.tsx`, `src/components/LogSessionModal.css` | 수업 기록 시 계획 시간 대비 실제 소요 시간 편차(초과·단축·일치) 실시간 배너 완료 (`ff74e8e`) |
| **Epic 5**<br>(10.0h ~ 12.0h) | **통합 품질 게이트(`pnpm verify:all`) 파이프라인** | `package.json`, `scripts/check-secrets-guard.mjs` | 시크릿 스캔·모션 원장·단위 테스트·린트·프로덕션 빌드 통합 검증 스크립트 완료 (`ff74e8e`) |
| **Epic 6**<br>(12.0h ~ 14.5h) | **동작 아틀라스(`ExerciseAtlasView`) 다차원 필터 엔진 모듈화** | `src/hooks/useAtlasFilterEngine.ts`, `src/components/ExerciseAtlasView.tsx` | 검색·기구·소도구·자세·검토 상태·최근 수업 제외 필터 및 활성 칩 계산 엔진을 전용 훅으로 분리 (`8cc9be1`) |
| **Epic 7**<br>(14.5h ~ 17.0h) | **멀티탭 실시간 스튜디오 동기화 훅 및 IndexedDB 이미지 하이드레이션** | `src/hooks/useStudioRealtimeSync.ts`, `src/components/MovementIdeaSheet.tsx` | 다른 탭에서 저장된 창작 초안·재사용 블록 실시간 반영 및 IndexedDB 사진 자동 복원 훅 연동 (`8cc9be1`) |
| **Epic 8**<br>(17.0h ~ 19.5h) | **수업 인사이트(`ClassInsightsDialog`) 척추 4대 움직임 평면 및 기구 분포 분석** | `src/utils/classInsights.ts`, `src/components/ClassInsightsDialog.tsx` | 굴곡·신전·측굴·회전(`spinalPlanes`) 및 기구별 시간 비중 집계·시각화 (`8cc9be1`) |
| **Epic 9**<br>(19.5h ~ 22.0h) | **핸즈프리 라이브 스테이지 v2 구간 점프 바 및 음성 구간 이동** | `src/components/LiveStageView.tsx`, `src/styles/live-stage-design.css` | 준비·본운동·마무리 구간 원클릭 점프 바(`.teaching-phase-jump-bar`) 및 음성 구간 이동 명령 확장 (`8cc9be1`) |
| **Epic 10**<br>(22.0h ~ 24.0h) | **3D 기구 투영, 4주 커리큘럼 진행률, 휴대용 마크다운 내보내기 및 `main` 단일 브랜치 CI/CD** | `src/utils/apparatus3dRigProjection.ts`, `src/utils/curriculumProgressionEngine.ts`, `.github/workflows/deploy-production.yml` | 아이소메트릭 3D 기구 뷰어, 4주 커리큘럼 추천, 마크다운 큐시트 내보내기, `main` 단일 브랜치 기반 GitHub Actions 아티팩트 배포 완료 (`8cc9be1`) |
| **Epic 11**<br>(24.0h ~ 26.5h) | **계획 대 실제 시간(`Planned vs. Actual`) 자동 보정 피드백 루프** | `src/utils/durationCalibrationEngine.ts`, `src/components/workbench/DurationCalibrationBanner.tsx`, `src/components/SequenceWorkbench.tsx` | 반별 최근 수업 실제 소요 시간 편차(초과·단축)를 분석해 현재 시퀀스 동작 시간에 원클릭 보정 적용 (`c4fcc96`) |
| **Epic 12**<br>(26.5h ~ 29.5h) | **3D 기구 뷰포트 5관절 골격(`5-Joint Kinematic Chain`) 및 3페이즈 키프레임 애니메이터** | `src/utils/apparatus3dRigProjection.ts`, `src/components/Apparatus3dRigPreviewCard.tsx` | 시작(`Setup`)·정점(`Peak`)·복귀(`Return`) 3페이즈 연속 재생 및 머리·어깨·골반·무릎·발목 5관절 골격 체인 투영 (`c4fcc96`) |
| **Epic 13**<br>(29.5h ~ 32.0h) | **휴대용 JSON 시퀀스 패키지(`pilates-flow-sequence-package-v1`) 내보내기 및 파서** | `src/utils/portableSequenceExport.ts`, `src/components/ClassBinderView.tsx` | 기기 간 수업안 교환을 위한 스키마 검증형 JSON 패키지 내보내기·역직렬화 파서(`parsePortableSequenceJson`) (`c4fcc96`) |
| **Epic 14**<br>(32.0h ~ 34.5h) | **스튜디오 운영 준비도 4축 감사 엔진(`Studio Operational Readiness Auditor`)** | `src/utils/studioReadinessAudit.ts`, `src/components/SequenceWorkbench.tsx` | 기구 전환 횟수·척추 4평면 다양성·좌우 대칭 시간 균형·스프링 세팅 누락 여부를 100점 만점으로 종합 진단 (`c4fcc96`) |
| **Epic 15**<br>(34.5h ~ 36.0h) | **Wave 4 통합 검증 스위트 (`wave4FollowthroughVerification.test.ts`)** | `src/test/wave4FollowthroughVerification.test.ts` | Epics 11~14 핵심 불변식 자동 검증 테스트 구축 (`c4fcc96`) |
| **Epic 16**<br>(36.0h ~ 38.5h) | **휴대용 JSON 시퀀스 패키지 비충돌 가져오기(`importPortableSequenceToSavedSequence`)** | `src/utils/portableSequenceExport.ts`, `src/components/ClassBinderView.tsx` | 외부 기기에서 내보낸 `.json` 수업 패키지를 ID 충돌 없이 내 수업 서랍(`savedSequences`)으로 가져오는 정규화 엔진 (`3d35f48`) |
| **Epic 17**<br>(38.5h ~ 41.0h) | **척추 평면별 호흡 리듬(`Breathing Cadence`) 및 템포 큐 합성 엔진** | `src/utils/breathingCadenceEngine.ts` | 굴곡(`3:0:5`)·신전(`4:1:3`)·회전/측굴(`3:1:4`)·휴식(`4:0:6`) 호흡 템포 및 동작별 예상 호흡 사이클 수 계산 (`3d35f48`) |
| **Epic 18**<br>(41.0h ~ 43.5h) | **리포머 브랜드별 스프링 텐션 환산 매트릭스(`Spring Tension Matrix`)** | `src/utils/springTensionMatrix.ts` | Balanced Body · Merrithew(Stott) · Classical(Gratz) · 사용자 지정 리포머 간 스프링 저항(`normalizedLoadUnits`) 자동 환산 (`3d35f48`, `87fab18`) |
| **Epic 19**<br>(43.5h ~ 46.0h) | **스튜디오 운영 준비도·호흡·스프링 통합 진단 카드(`StudioReadinessAuditCard`)** | `src/components/workbench/StudioReadinessAuditCard.tsx`, `src/components/SequenceWorkbench.tsx` | 워크벤치에서 준비도 점수, 전체 호흡 사이클, 브랜드별 스프링 환산값, 미포함 척추 평면을 한눈에 표시 (`3d35f48`) |
| **Epic 20**<br>(46.0h ~ 48.0h) | **Wave 5 통합 검증 스위트 및 `main` 단일 브랜치 완전 일원화** | `src/test/wave5AdvancementVerification.test.ts`, `src/utils/wave5DeploymentRegression.test.ts` | Epics 16~19 자동 검증 테스트 구축 및 별도 `gh-pages` 브랜치를 완전히 제거하고 `origin/main` 단일 브랜치로 일원화 (`87fab18`) |
| **Epic 21**<br>(48.0h ~ 50.5h) | **기구·체위·스프링 전환 물리 부하 분석 및 잠금 보존 동선 최적화 엔진** | `src/utils/transitionCostOptimizer.ts` | 각 구간(`warmup`/`main`/`cooldown`) 내에서 잠긴 동작(`locked`)과 휴식을 고정한 채 기구·체위·스프링 변경 횟수를 줄이는 최근접 그리디 순서 최적화 |
| **Epic 22**<br>(50.5h ~ 53.0h) | **강사 타임코드 음성 티칭 대본(`Teleprompter Script`) 합성기** | `src/utils/instructorVoiceScriptGenerator.ts` | `[MM:SS~MM:SS]` 타임코드, 리포머 브랜드별 스프링 세팅, 들숨·날숨 호흡 템포, 핵심 큐를 결합한 리허설 대본 자동 생성 |
| **Epic 23**<br>(53.0h ~ 55.5h) | **골반 관찰 메모·수업 목표 기반 맞춤 레이어 추천 엔진** | `src/utils/memberConditionLayerAdvisor.ts` | 전방/후방 골반 경사 관찰 메모 및 가동성·근력 계획 목표에 맞춰 동작별 `easy`/`standard`/`hard` 권장 레이어 도출 및 원클릭 일괄 반영 |
| **Epic 24**<br>(55.5h ~ 58.0h) | **워크벤치 동선 최적화·맞춤 레이어·티칭 대본 통합 패널 (`StudioFlowOptimizerPanel`)** | `src/components/workbench/StudioFlowOptimizerPanel.tsx`, `src/components/SequenceWorkbench.tsx` | 전환 부하 절감 원클릭 적용, 관찰 맞춤 레이어 자동 배정, 타임코드 티칭 대본 프리뷰를 워크벤치에 통합 연동 |
| **Epic 25**<br>(58.0h ~ 60.0h) | **Wave 6 통합 검증 스위트 (`wave6AdvancementVerification.test.ts`) 및 병렬 운영 배포** | `src/test/wave6AdvancementVerification.test.ts`, `.github/workflows/deploy-production.yml` | Epics 21~24 자동 검증 테스트 구축, CI/CD 워크플로 연동 및 `origin/main` + Firebase Hosting 병렬 배포 |
