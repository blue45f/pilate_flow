# Pilates Flow Atelier — 84시간 장기 고도화 마스터 플랜 (Epics 1~35 · 멀티 스킬 융합 & 다이내믹 멀티 클라우드 배포 아키텍처)

본 문서는 `pilates-flow` (`Flow Atelier`)의 전체 아키텍처(`src/` 327K+ LOC, `backend/`, `src/models/`, `src/features/`, `src/test/`)를 대상으로 수립·실행한 **84시간(35대 Epic · Wave 1~8) 규모의 장기 기술 고도화 설계 및 멀티 클라우드·로컬 병렬 운영 배포 마스터 플랜**입니다.

## 1. 84시간 장기 고도화 로드맵 총괄표 (35 Epics · 84 Hours)

| 구간 (소요 시간) | Epic 명칭 | 핵심 대상 모듈 | 주요 산출물 및 완료 상태 |
| :--- | :--- | :--- | :--- |
| **Epic 1~5**<br>(0.0h ~ 12.0h) | **Wave 1~2: 워크벤치 도메인 분리, IndexedDB 미디어 저장소, 지연 로더, `Planned vs. Actual` 배너, `verify:all`** | `src/hooks/useWorkbenchRecoverySession.ts`, `src/utils/localMediaStorage.ts`, `src/utils/lazyVisualRigLoader.ts` | 워크벤치 모듈화 및 로컬 미디어/품질 게이트 구축 완료 (`e860544`, `ff74e8e`) |
| **Epic 6~10**<br>(12.0h ~ 24.0h) | **Wave 3: 아틀라스 11종 필터 훅, 멀티탭 실시간 동기화, 척추 4평면 인사이트, 스테이지 점프 바, 3D 기구·4주 커리큘럼** | `src/hooks/useAtlasFilterEngine.ts`, `src/hooks/useStudioRealtimeSync.ts`, `src/utils/apparatus3dRigProjection.ts` | 아틀라스·라이브 스테이지·3D 기구 투영 및 4주 커리큘럼 엔진 구축 완료 (`8cc9be1`) |
| **Epic 11~15**<br>(24.0h ~ 36.0h) | **Wave 4: 실제 시간 편차 자동 보정, 3D 5관절 골격·3페이즈 재생, 휴대용 JSON 패키지, 스튜디오 준비도 4축 감사** | `src/utils/durationCalibrationEngine.ts`, `src/utils/studioReadinessAudit.ts`, `src/utils/portableSequenceExport.ts` | 시간 보정 루프, 3페이즈 3D 골격, 휴대용 JSON, 스튜디오 4축 준비도 완료 (`c4fcc96`) |
| **Epic 16~20**<br>(36.0h ~ 48.0h) | **Wave 5: JSON 비충돌 가져오기, 척추 평면별 호흡 템포 합성, 브랜드별 스프링 환산 매트릭스, `main` 단일 브랜치 일원화** | `src/utils/breathingCadenceEngine.ts`, `src/utils/springTensionMatrix.ts`, `src/components/workbench/StudioReadinessAuditCard.tsx` | 호흡·스프링 매트릭스 및 `origin/main` 단일 브랜치 통합 완료 (`3d35f48`, `87fab18`) |
| **Epic 21~25**<br>(48.0h ~ 60.0h) | **Wave 6: 기구·체위 전환 동선 최적화, 타임코드 음성 티칭 대본, 관찰·목표 맞춤 레이어 어드바이저** | `src/utils/transitionCostOptimizer.ts`, `src/utils/instructorVoiceScriptGenerator.ts`, `src/utils/memberConditionLayerAdvisor.ts` | 전환 부하 절감 그리디 정돈, 타임코드 리허설 대본, 맞춤 레이어 추천 완료 (`6a59ed0`) |
| **Epic 26~30**<br>(60.0h ~ 72.0h) | **Wave 7: 7대 멀티 클라우드 배포 규격, `scripts/deploy-universal.mjs` 오케스트레이터, RPE 에너지 곡선 시뮬레이터** | `src/utils/deploymentEnvironmentMatrix.ts`, `scripts/deploy-universal.mjs`, `src/utils/classPacingSimulator.ts`, `DEPLOYMENT.md` | 7대 클라우드·로컬 배포 설정 통일 및 원클릭 병렬 배포 CLI 완료 (`41653be`) |
| **Epic 31**<br>(72.0h ~ 74.5h) | **`generate-fresh-ideas` 5대 수업 컨셉 리믹스 엔진 (`5-Angle Class Concept Remixer`)** | `src/utils/freshClassAnglesGenerator.ts`, `src/components/workbench/StudioFlowOptimizerPanel.tsx` | `Contrarian`(역발상), `Personal Story`(현장 공감), `Data/Evidence`(생체역학 근거), `Playbook`(실전 3단계 공식), `What They Missed`(히든 디테일) 5대 수업 테마·티칭 훅 생성 |
| **Epic 32**<br>(74.5h ~ 77.0h) | **`Blender` 3D 기구·5관절 3페이즈 키프레임 Python(`bpy`) 씬 익스포터** | `src/utils/blenderSceneScriptExporter.ts`, `src/components/Apparatus3dRigPreviewCard.tsx` | 현재 동작의 기구 프레임, 캐리지 3페이즈(`Frame 1/30/60`) 키프레임 애니메이션, 5관절 구체 계층을 생성하는 Blender 4.x Python 스크립트 자동 추출 |
| **Epic 33**<br>(77.0h ~ 79.5h) | **`Verify AI` 5대 결정론적 안전·무결성 가드레일 검증기** | `src/utils/aiSequenceSafetyVerifier.ts`, `src/components/workbench/StudioFlowOptimizerPanel.tsx` | 카탈로그 환각 동작 0건, 비의료·비진단 용어 가드레일, 고강도 신전 전 워밍업 배치, 시간 예산 범위, 레이어 스키마 정합성 5대 게이트 실시간 감사 |
| **Epic 34**<br>(79.5h ~ 82.0h) | **`Git` 단일 브랜치 무결성 및 멀티 클라우드 CI/CD 게이트 통합** | `.github/workflows/deploy-production.yml`, `scripts/deploy-universal.mjs` | GitHub Actions에서 Wave 3~8 전체 검증 스위트(30+ 테스트) 통과 후 멀티 클라우드 병렬 배포 |
| **Epic 35**<br>(82.0h ~ 84.0h) | **Wave 8 멀티 스킬 통합 검증 스위트 (`wave8SkillsAdvancementVerification.test.ts`) 및 병렬 운영 배포** | `src/test/wave8SkillsAdvancementVerification.test.ts` | Epics 31~33 자동 검증 테스트 구축 및 `origin/main` + Firebase Hosting 병렬 배포 완료 |
