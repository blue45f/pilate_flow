# Pilates Flow Atelier — 72시간 장기 고도화 마스터 플랜 (Epics 1~30 · 멀티 클라우드 & 로컬 다이내믹 배포 아키텍처)

본 문서는 `pilates-flow` (`Flow Atelier`)의 전체 아키텍처(`src/` 327K+ LOC, `backend/`, `src/models/`, `src/features/`, `src/test/`)를 대상으로 수립·실행한 **72시간(30대 Epic · Wave 1~7) 규모의 장기 기술 고도화 설계 및 다이내믹 멀티 클라우드·로컬 병렬 운영 배포 마스터 플랜**입니다.

## 1. 72시간 장기 고도화 로드맵 총괄표 (30 Epics · 72 Hours)

| 구간 (소요 시간) | Epic 명칭 | 핵심 대상 모듈 | 주요 산출물 및 완료 상태 |
| :--- | :--- | :--- | :--- |
| **Epic 1~5**<br>(0.0h ~ 12.0h) | **Wave 1~2: 워크벤치 도메인 분리, IndexedDB 미디어 저장소, 지연 로더, `Planned vs. Actual` 배너, `verify:all`** | `src/hooks/useWorkbenchRecoverySession.ts`, `src/utils/localMediaStorage.ts`, `src/utils/lazyVisualRigLoader.ts` | 워크벤치 모듈화 및 로컬 미디어/품질 게이트 구축 완료 (`e860544`, `ff74e8e`) |
| **Epic 6~10**<br>(12.0h ~ 24.0h) | **Wave 3: 아틀라스 11종 필터 훅, 멀티탭 실시간 동기화, 척추 4평면 인사이트, 스테이지 점프 바, 3D 기구·4주 커리큘럼** | `src/hooks/useAtlasFilterEngine.ts`, `src/hooks/useStudioRealtimeSync.ts`, `src/utils/apparatus3dRigProjection.ts` | 아틀라스·라이브 스테이지·3D 기구 투영 및 4주 커리큘럼 엔진 구축 완료 (`8cc9be1`) |
| **Epic 11~15**<br>(24.0h ~ 36.0h) | **Wave 4: 실제 시간 편차 자동 보정, 3D 5관절 골격·3페이즈 재생, 휴대용 JSON 패키지, 스튜디오 준비도 4축 감사** | `src/utils/durationCalibrationEngine.ts`, `src/utils/studioReadinessAudit.ts`, `src/utils/portableSequenceExport.ts` | 시간 보정 루프, 3페이즈 3D 골격, 휴대용 JSON, 스튜디오 4축 준비도 완료 (`c4fcc96`) |
| **Epic 16~20**<br>(36.0h ~ 48.0h) | **Wave 5: JSON 비충돌 가져오기, 척추 평면별 호흡 템포 합성, 브랜드별 스프링 환산 매트릭스, `main` 단일 브랜치 일원화** | `src/utils/breathingCadenceEngine.ts`, `src/utils/springTensionMatrix.ts`, `src/components/workbench/StudioReadinessAuditCard.tsx` | 호흡·스프링 매트릭스 및 `origin/main` 단일 브랜치 통합 완료 (`3d35f48`, `87fab18`) |
| **Epic 21~25**<br>(48.0h ~ 60.0h) | **Wave 6: 기구·체위 전환 동선 최적화, 타임코드 음성 티칭 대본, 관찰·목표 맞춤 레이어 어드바이저** | `src/utils/transitionCostOptimizer.ts`, `src/utils/instructorVoiceScriptGenerator.ts`, `src/utils/memberConditionLayerAdvisor.ts` | 전환 부하 절감 그리디 정돈, 타임코드 리허설 대본, 맞춤 레이어 추천 완료 (`6a59ed0`) |
| **Epic 26**<br>(60.0h ~ 62.5h) | **7대 멀티 클라우드 & 로컬 배포 설정 규격 일원화** | `src/utils/deploymentEnvironmentMatrix.ts`, `vercel.json`, `netlify.toml`, `wrangler.toml`, `nginx/default.conf` | Firebase · GitHub Pages · Vercel · Netlify · Cloudflare · Docker(Nginx) · Local 프리뷰의 SPA 폴백 및 PWA 캐시 정책 완전 통일 |
| **Epic 27**<br>(62.5h ~ 65.0h) | **유니버설 멀티 클라우드·로컬 병렬 배포 오케스트레이터 CLI (`scripts/deploy-universal.mjs`)** | `scripts/deploy-universal.mjs`, `package.json` | `--check-env`, `--target=auto\|all\|firebase,github`, `--parallel` 지원 원클릭 병렬 배포 스크립트 구축 |
| **Epic 28**<br>(65.0h ~ 67.5h) | **GitHub Actions 다이내믹 멀티 클라우드 워크플로 고도화** | `.github/workflows/deploy-production.yml` | `workflow_dispatch` 타깃 선택(`all`, `github-pages`, `firebase`, `cloudflare`, `vercel`, `netlify`) 및 포터블 `dist` 아티팩트 자동 발행 |
| **Epic 29**<br>(67.5h ~ 70.0h) | **수업 생리학적 강도(RPE 1~10) 에너지 곡선 시뮬레이터** | `src/utils/classPacingSimulator.ts`, `src/components/workbench/StudioFlowOptimizerPanel.tsx` | 준비·본운동·마무리 구간의 RPE 강도 곡선 및 급격한 강도 스파이크(`abruptSpikeCount`) 자동 감지 |
| **Epic 30**<br>(70.0h ~ 72.0h) | **Wave 7 멀티 클라우드 배포 검증 스위트 (`wave7MultiCloudDeployVerification.test.ts`) 및 `DEPLOYMENT.md`** | `src/test/wave7MultiCloudDeployVerification.test.ts`, `DEPLOYMENT.md` | 7대 배포 타깃 정합성 및 RPE 시뮬레이터 자동 검증 테스트 구축 및 병렬 운영 배포 완료 |
