# Pilates Flow Atelier — 36시간 장기 고도화 마스터 플랜 (Epics 1~15 · Full Architecture & Parallel Deployment Roadmap)

본 문서는 `pilates-flow` (`Flow Atelier`)의 전체 아키텍처(`src/` 327K+ LOC, `backend/`, `src/models/`, `src/features/`, `src/test/`)를 대상으로 수립·실행한 **36시간(15대 Epic · Wave 1~4) 규모의 장기 기술 고도화 설계 및 병렬 운영 배포 마스터 플랜**입니다.

## 1. 36시간 장기 고도화 로드맵 총괄표 (15 Epics · 36 Hours)

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
| **Epic 10**<br>(22.0h ~ 24.0h) | **3D 기구 투영, 4주 커리큘럼 진행률, 휴대용 마크다운 내보내기 및 CI/CD** | `src/utils/apparatus3dRigProjection.ts`, `src/utils/curriculumProgressionEngine.ts`, `.github/workflows/deploy-production.yml` | 아이소메트릭 3D 기구 뷰어, 4주 커리큘럼 추천, 마크다운 큐시트 내보내기, 병렬 배포 워크플로 완료 (`8cc9be1`) |
| **Epic 11**<br>(24.0h ~ 26.5h) | **계획 대 실제 시간(`Planned vs. Actual`) 자동 보정 피드백 루프** | `src/utils/durationCalibrationEngine.ts`, `src/components/workbench/DurationCalibrationBanner.tsx`, `src/components/SequenceWorkbench.tsx` | 반별 최근 수업 실제 소요 시간 편차(초과·단축)를 분석해 현재 시퀀스 동작 시간에 원클릭 보정 적용 |
| **Epic 12**<br>(26.5h ~ 29.5h) | **3D 기구 뷰포트 5관절 골격(`5-Joint Kinematic Chain`) 및 3페이즈 키프레임 애니메이터** | `src/utils/apparatus3dRigProjection.ts`, `src/components/Apparatus3dRigPreviewCard.tsx` | 시작(`Setup`)·정점(`Peak`)·복귀(`Return`) 3페이즈 연속 재생 및 머리·어깨·골반·무릎·발목 5관절 골격 체인 투영 |
| **Epic 13**<br>(29.5h ~ 32.0h) | **휴대용 JSON 시퀀스 패키지(`pilates-flow-portable-sequence-v1`) 내보내기 및 파서** | `src/utils/portableSequenceExport.ts`, `src/components/ClassBinderView.tsx` | 기기 간 수업안 교환을 위한 스키마 검증형 JSON 패키지 내보내기·역직렬화 파서(`parsePortableSequenceJson`) |
| **Epic 14**<br>(32.0h ~ 34.5h) | **스튜디오 운영 준비도 4축 감사 엔진(`Studio Operational Readiness Auditor`)** | `src/utils/studioReadinessAudit.ts`, `src/components/SequenceWorkbench.tsx` | 기구 전환 횟수·척추 4평면 다양성·좌우 대칭 시간 균형·스프링 세팅 누락 여부를 100점 만점으로 종합 진단 |
| **Epic 15**<br>(34.5h ~ 36.0h) | **Wave 4 후속 고도화 통합 검증 스위트 및 병렬 운영 재배포** | `src/test/wave4FollowthroughVerification.test.ts` | Epics 11~14 핵심 불변식 자동 검증 테스트 구축 및 `origin/main` + `origin/gh-pages` 동기화 배포 |

## 2. Wave 3 (Epics 6 ~ 10) 상세 설계 요약

- **Epic 6**: `src/hooks/useAtlasFilterEngine.ts`에 `ATLAS_DISCOVERY_RECOVERY_KEY` 기반 세션 복구, 11개 필터 상태, 활성 필터 칩(`activeFilterChips`) 계산을 캡슐화.
- **Epic 7**: `src/hooks/useStudioRealtimeSync.ts`에서 `subscribeStudioSyncEvents`를 구독해 멀티탭 변경 사항을 실시간 반영하고 `useHydratedLocalPhoto`로 IndexedDB 이미지를 지연 복원.
- **Epic 8**: `src/utils/classInsights.ts`의 `buildPlanInsights`에 `spinalPlanes`(`flexion`, `extension`, `lateral`, `rotation`)와 `apparatusBreakdown`을 추가.
- **Epic 9**: `src/components/LiveStageView.tsx`에 `.teaching-phase-jump-bar`와 `"준비 구간"`, `"본운동"`, `"마무리"` 음성 이동 명령을 추가.
- **Epic 10**: `src/utils/apparatus3dRigProjection.ts`, `src/utils/curriculumProgressionEngine.ts`, `src/utils/portableSequenceExport.ts`, `.github/workflows/deploy-production.yml` 구축.

## 3. Wave 4 (Epics 11 ~ 15) 후속 고도화 상세 설계

### Epic 11: 계획 대 실제 시간(`Planned vs. Actual`) 자동 보정 피드백 루프
- `src/utils/durationCalibrationEngine.ts`의 `analyzeDurationCalibration`이 최근 수업 이력의 계획 대비 실제 진행 시간(`actualDurationSec`) 비율을 계산해 `overrun` / `underrun` / `balanced` 경향을 도출합니다.
- `src/components/workbench/DurationCalibrationBanner.tsx`를 통해 워크벤치에서 원클릭으로 잠기지 않은 본운동·준비·마무리 동작 시간을 비례 보정(`applyDurationCalibrationToSteps`)합니다.

### Epic 12: 3D 기구 뷰포트 5관절 골격 및 3페이즈 키프레임 애니메이터
- `src/utils/apparatus3dRigProjection.ts`에 `RigMotionPhase`(`setup` | `peak` | `return`)와 5관절 골격 좌표(`ProjectedJointChain2D`: `head`, `shoulder`, `pelvis`, `knee`, `ankle`) 투영 수식을 추가했습니다.
- `src/components/Apparatus3dRigPreviewCard.tsx`에서 `1 시작(Setup)`, `2 정점(Peak)`, `3 복귀(Return)` 단계 전환과 `3페이즈 연속 재생` 애니메이션 토글을 제공합니다.

### Epic 13: 휴대용 JSON 시퀀스 패키지 내보내기 및 파서
- `src/utils/portableSequenceExport.ts`에 `formatSequenceAsPortableJson` 및 `parsePortableSequenceJson`을 추가하여 `schemaVersion: 'pilates-flow-portable-sequence-v1'` 규격의 무결성 검증과 수업안 직렬화·역직렬화를 지원하고, `ClassBinderView.tsx` 카드 도구에 `JSON` 내보내기 버튼을 연결했습니다.

### Epic 14: 스튜디오 운영 준비도 4축 감사 엔진
- `src/utils/studioReadinessAudit.ts`의 `auditSequenceStudioReadiness`가 기구 전환 횟수, 척추 4평면 커버리지, 좌우 수행 시간 대칭성(30초 이내), 스프링 세팅 기재 여부를 종합 평가해 0~100점 점수와 요약 배지를 제공합니다.

### Epic 15: Wave 4 통합 검증 스위트 (`wave4FollowthroughVerification.test.ts`)
- `src/test/wave4FollowthroughVerification.test.ts`에서 시간 보정 엔진, 3D 5관절 골격 및 3페이즈 투영, 휴대용 JSON 왕복 파서, 스튜디오 운영 준비도 4축 감사를 자동 검증합니다.
