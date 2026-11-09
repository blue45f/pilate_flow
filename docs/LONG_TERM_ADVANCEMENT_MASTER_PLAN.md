# Pilates Flow Atelier — 24시간 장기 고도화 마스터 플랜 (Epics 1~10 · Full Architecture & Parallel Deployment Roadmap)

본 문서는 `pilates-flow` (`Flow Atelier`)의 전체 아키텍처(`src/` 327K+ LOC, `backend/`, `src/models/`, `src/features/`, `src/test/`)를 대상으로 수립·실행한 **24시간(10대 Epic · 30개 세부 스프린트) 규모의 장기 기술 고도화 설계 및 병렬 운영 배포 마스터 플랜**입니다.

## 1. 24시간 장기 고도화 로드맵 총괄표 (10 Epics · 24 Hours)

| 구간 (소요 시간) | Epic 명칭 | 핵심 대상 모듈 | 주요 산출물 및 완료 상태 |
| :--- | :--- | :--- | :--- |
| **Epic 1**<br>(0.0h ~ 2.5h) | **워크벤치 도메인 분해 및 복구 세션 훅 분리** | `src/components/SequenceWorkbench.tsx`, `src/hooks/useWorkbenchRecoverySession.ts`, `src/components/workbench/*` | `useWorkbenchRecoverySession`, `WorkbenchHierarchySummary`, `WorkbenchBlankStarters` 분리 완료 (`e860544`, `ff74e8e`) |
| **Epic 2**<br>(2.5h ~ 5.0h) | **IndexedDB 로컬 미디어 저장소 및 멀티탭 동기화 브리지** | `src/utils/localMediaStorage.ts`, `src/utils/movementIdeaDraft.ts` | IndexedDB(`pilates-flow-local-media-v1`) 사진 저장소 및 `BroadcastChannel` 브리지 완료 (`ff74e8e`) |
| **Epic 3**<br>(5.0h ~ 7.5h) | **98개 동작 도해·비주얼 리그 온디맨드 지연 로더** | `src/utils/lazyVisualRigLoader.ts`, `vite.config.ts` | 비주얼 리그 및 Track C/D 근거 데이터 동적 `import()` 캐시 로더 완료 (`ff74e8e`) |
| **Epic 4**<br>(7.5h ~ 10.0h) | **수업 기록 계획 대 실제 시간(`Planned vs. Actual`) 비교 배너** | `src/components/LogSessionModal.tsx`, `src/components/LogSessionModal.css` | 수업 기록 시 계획 시간 대비 실제 소요 시간 편차(초과·단축·일치) 실시간 배너 완료 (`ff74e8e`) |
| **Epic 5**<br>(10.0h ~ 12.0h) | **통합 품질 게이트(`pnpm verify:all`) 파이프라인** | `package.json`, `scripts/check-secrets-guard.mjs` | 시크릿 스캔·모션 원장·단위 테스트·린트·프로덕션 빌드 통합 검증 스크립트 완료 (`ff74e8e`) |
| **Epic 6**<br>(12.0h ~ 14.5h) | **동작 아틀라스(`ExerciseAtlasView`) 다차원 필터 엔진 모듈화** | `src/hooks/useAtlasFilterEngine.ts`, `src/components/ExerciseAtlasView.tsx` | 검색·기구·소도구·자세·검토 상태·최근 수업 제외 필터 및 활성 칩 계산 엔진을 전용 훅으로 분리 |
| **Epic 7**<br>(14.5h ~ 17.0h) | **멀티탭 실시간 스튜디오 동기화 훅 및 IndexedDB 이미지 하이드레이션** | `src/hooks/useStudioRealtimeSync.ts`, `src/components/MovementIdeaSheet.tsx` | 다른 탭에서 저장된 창작 초안·재사용 블록 실시간 반영 및 IndexedDB 사진 자동 복원 훅 연동 |
| **Epic 8**<br>(17.0h ~ 19.5h) | **수업 인사이트(`ClassInsightsDialog`) 척추 4대 움직임 평면 및 기구 분포 분석** | `src/utils/classInsights.ts`, `src/components/ClassInsightsDialog.tsx` | 굴곡·신전·측굴·회전(`spinalPlanes`) 및 기구별 시간 비중 집계·시각화 |
| **Epic 9**<br>(19.5h ~ 22.0h) | **핸즈프리 라이브 스테이지 v2 구간 점프 바 및 음성 구간 이동** | `src/components/LiveStageView.tsx`, `src/styles/live-stage-design.css` | 준비·본운동·마무리 구간 원클릭 점프 바(`.teaching-phase-jump-bar`) 및 음성 구간 이동 명령 확장 |
| **Epic 10**<br>(22.0h ~ 24.0h) | **휴대용 마크다운/JSON 시퀀스 내보내기 및 병렬 운영 배포 자동화** | `src/utils/portableSequenceExport.ts`, `src/components/ClassBinderView.tsx`, `.github/workflows/deploy-production.yml` | 마크다운 큐시트 내보내기 지원 및 GitHub Pages(`gh-pages`) + Firebase Hosting 병렬 배포 파이프라인 구축 |

## 2. Wave 3 (Epics 6 ~ 10) 상세 설계

### Epic 6: 동작 아틀라스(`ExerciseAtlasView`) 다차원 필터 엔진 모듈화
- `src/hooks/useAtlasFilterEngine.ts`에 `ATLAS_DISCOVERY_RECOVERY_KEY` 기반 세션 복구, 11개 필터 상태(`search`, `equipment`, `block`, `position`, `level`, `duration`, `favorite`, `review`, `motionDraft`, `props`, `hideRecent`), 활성 필터 칩(`activeFilterChips`) 계산을 캡슐화하여 `ExerciseAtlasView.tsx`의 결합도를 낮추고 테스트 가능성을 높입니다.

### Epic 7: 멀티탭 실시간 스튜디오 동기화 훅 및 IndexedDB 이미지 하이드레이션
- `src/hooks/useStudioRealtimeSync.ts`에서 `subscribeStudioSyncEvents`를 구독해 멀티탭에서 발생한 `human-draft-updated`, `reusable-block-updated` 이벤트를 감지하고, `useHydratedLocalPhoto`를 통해 IndexedDB에 분리 보관된 대용량 자세 스케치 이미지를 지연 복원합니다.

### Epic 8: 수업 인사이트(`ClassInsightsDialog`) 척추 움직임 평면 및 기구 분포 분석
- `src/utils/classInsights.ts`의 `buildPlanInsights` 결과에 `spinalPlanes`(`flexion`, `extension`, `lateral`, `rotation`)와 `apparatusBreakdown`을 추가하여, 수업 계획의 척추 움직임 편중 여부를 강사가 즉시 점검할 수 있도록 합니다.

### Epic 9: 핸즈프리 라이브 스테이지 v2 구간 점프 바 및 음성 구간 이동
- `src/components/LiveStageView.tsx`에 준비(`warmup`)·본운동(`main`)·마무리(`cooldown`) 구간의 첫 동작으로 즉시 이동할 수 있는 `.teaching-phase-jump-bar`를 추가하고, 핸즈프리 음성 명령에 `"준비 구간"`, `"본운동"`, `"마무리"` 이동 명령을 추가합니다.

### Epic 10: 휴대용 마크다운/JSON 시퀀스 내보내기 및 병렬 운영 배포 자동화
- `src/utils/portableSequenceExport.ts`를 통해 저장된 시퀀스를 마크다운 표 기반 스튜디오 큐시트(`.md`)로 내보내는 기능을 `ClassBinderView.tsx`에 추가하고, `.github/workflows/deploy-production.yml` 및 로컬 병렬 배포 명령을 통해 `origin/main`, `origin/gh-pages`, Firebase Hosting(`pilates-flow-atelier`)을 동시 배포합니다.
