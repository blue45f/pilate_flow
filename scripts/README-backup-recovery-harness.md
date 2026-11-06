# 백업·복원·롤백 브라우저 회귀 하네스 (Backup & Recovery Browser Regression Harness)

이 문서는 로컬/미리보기 격리 브라우저 환경에서 수업 기록 스냅샷 생성, 백업 JSON 내보내기, 사전검사(Preflight), 복원 적용, 새로고침 유지, 이전 상태로 되돌리기(Rollback), 멀티탭 `storage` 이벤트 방어 및 롤백 저장 키 결함 주입을 재현 가능하게 검증하는 회귀 하네스 사용법을 설명합니다.

## 1. 구성 파일

- 실행 스크립트: [`scripts/verify-backup-recovery-browser.mjs`](file:///home/antigravity/blue45f/pilate_flow/scripts/verify-backup-recovery-browser.mjs)
- 합성 테스트 픽스처: [`src/test/fixtures/backup-recovery/syntheticBackupFixtures.json`](file:///home/antigravity/blue45f/pilate_flow/src/test/fixtures/backup-recovery/syntheticBackupFixtures.json)
- 데이터 계약 문서: [`docs/TEACHING_HISTORY_BACKUP_RECOVERY_CONTRACT.md`](file:///home/antigravity/blue45f/pilate_flow/docs/TEACHING_HISTORY_BACKUP_RECOVERY_CONTRACT.md)

## 2. 격리 및 안전 보장 (Isolation & Safety Guarantees)

1. **임시 로컬 프리뷰 서버 (`127.0.0.1` 유휴 포트 자동 할당)**:
   - 실행 시마다 OS가 할당한 임시 로컬 포트에서 `vite preview`를 띄우며, `finally` 블록에서 생성한 프리뷰 프로세스 그룹만 종료합니다.
2. **임시 브라우저 프로필 (`os.tmpdir()` 하위 `mkdtemp`)**:
   - 시스템에 설치된 Chromium(`/usr/bin/chromium`)을 `--user-data-dir=<임시 디렉터리>`로 실행하고, 종료 시 `finally`에서 해당 임시 디렉터리만 삭제합니다.
   - 사용자의 기존 브라우저 프로필, 운영 주소(`https://pilates-flow-atelier.web.app`), 실제 계정/클라우드 서버, 실사용자 건강정보를 절대 읽거나 변경하지 않습니다.
3. **합성 픽스처 전용**:
   - 모든 복원·결함 시험은 [`syntheticBackupFixtures.json`](file:///home/antigravity/blue45f/pilate_flow/src/test/fixtures/backup-recovery/syntheticBackupFixtures.json)과 임시 디렉터리 내부에 생성된 합성 JSON 파일만 사용합니다.

## 3. 단일 실행 명령 (Single Execution Command)

저장소 루트에서 아래 단일 명령으로 전체 브라우저 회귀 검증(Scope A + Scope B)을 실행할 수 있습니다.

```bash
node scripts/verify-backup-recovery-browser.mjs
```

### 선택 옵션

- `--output <경로>`: 구조화된 결과 JSON 파일을 지정한 경로에도 저장합니다.
- `--screenshot-dir <경로>`: 단계별 및 실패 시 화면 캡처 PNG를 지정한 디렉터리에 저장합니다. (지정하지 않더라도 assertion 실패 시 임시 캡처 경로를 생성해 결과 JSON의 `failureCapturePath`에 기록합니다.)
- `--no-build`: 이미 `dist/index.html`이 빌드되어 있을 때 자동 빌드를 생략합니다.
- `CHROMIUM_BIN=/path/to/chromium`: 기본 `/usr/bin/chromium` 대신 사용할 Chromium 실행 파일 경로를 지정합니다.

## 4. 검증 범위 및 실행 모드 구분

결과 JSON의 각 단계(`steps[]`)는 `mode` 필드로 실제 브라우저 동작과 픽스처/모의 주입 여부를 명확히 구분합니다.

| 구분 | 단계 ID | 뷰포트 | `mode` | 검증 내용 |
| :--- | :--- | :--- | :--- | :--- |
| **Scope A** | `scopeA-320x694-1..6` | `320x694` | `real-browser` / `real-browser+synthetic-fixture` | 실제 UI로 수업 기록 생성 → 백업 JSON 내보내기 → 사전검사(미적용 시 무변경 확인) → 복원 적용 → 새로고침 후 복원·롤백 바 유지 → 이전 상태로 되돌리기 |
| **Scope A** | `scopeA-390x844-1..6` | `390x844` | `real-browser` / `real-browser+synthetic-fixture` | `390x844` 모바일 뷰포트에서 동일한 6단계 전체 UI 왕복 검증 |
| **Scope B** | `scopeB-1-multi-tab-storage-event-during-preflight` | `390x844` | `real-browser` | 동일 origin의 두 독립 탭(`Tab A`, `Tab B`)에서 `Tab A` 사전검사 중 `Tab B`가 `localStorage`를 변경할 때 실제 `StorageEvent`가 발생하고 `Tab A`의 복원 적용 버튼이 즉시 비활성화되는지 검증 |
| **Scope B** | `scopeB-2-multi-tab-storage-change-blocks-stale-rollback` | `390x844` | `real-browser` | `Tab A` 복원 직후 `Tab B`가 새 데이터를 저장했을 때 `Tab A`의 오래된 롤백이 차단되어 `Tab B` 데이터가 보존되는지 검증 |
| **Scope B** | `scopeB-3-post-restore-new-record-reload-and-double-rollback` | `390x844` | `real-browser` | 복원 후 새 수업 기록 생성 시 롤백 차단, 새로고침 후 stale 롤백 버튼 숨김, `Tab A` 1차 롤백 후 `Tab B`에서의 2차 롤백(두 번 롤백) 차단 검증 |
| **Scope B** | `scopeB-4-rollback-key-synthetic-fault-fixtures` | `390x844` | `real-browser+synthetic-fixture` | `pilates-flow-backup-rollback-v1`에 손상 JSON, 미지원 버전(`version: 99`), 잘못된 `preRestoreState` 구조 주입 시 안전하게 무시하고, 구버전(`version: 0`) 유효 롤백 포인트는 손실 없이 복원 이전 상태로 되돌리는지 검증 |
| **Scope B** | `scopeB-5-rollback-write-failure-mock-fault-injection` | `390x844` | `real-browser+mock-injected` | `Storage.prototype.setItem`에 `QuotaExceededError`를 주입하여 롤백 키 쓰기 실패 시 메모리 내 롤백 포인트가 유지되고, 메인 저장소 쓰기 실패 시 유효 롤백 포인트가 소실되지 않으며 오류 해제 후 재시도가 성공하는지 검증 |

## 5. `package.json` 및 CI 연결 제안 (미적용 제안)

공유 설정 파일(`package.json`, 루트 CI 워크플로우) 충돌 방지 원칙에 따라 해당 파일은 직접 수정하지 않았습니다. 통합 담당자가 필요 시 `package.json`의 `scripts`에 아래 항목을 추가해 연결할 수 있습니다.

```diff
--- a/package.json
+++ b/package.json
@@ -16,6 +16,7 @@
     "test:Backup": "vitest run src/utils/backupRecoveryInspection.test.ts src/test/backupRecoveryStore.test.ts",
+    "test:backup-browser": "node scripts/verify-backup-recovery-browser.mjs",
     "check:motion-study": "node scripts/check-motion-study-coverage.mjs"
   }
```
