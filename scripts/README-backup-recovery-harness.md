# 백업·복원·롤백 브라우저 회귀 하네스 (Backup & Recovery Browser Regression Harness)

이 문서는 로컬/미리보기 격리 브라우저 환경에서 수업 기록 스냅샷 생성, 백업 JSON 내보내기, 사전검사(Preflight), 복원 적용, 새로고침 유지, 이전 상태로 되돌리기(Rollback), 멀티탭 `storage` 이벤트 방어 및 롤백 저장 키 결함 주입을 재현 가능하게 검증하는 회귀 하네스와, 하네스 자체의 빌드 신선도(Build Freshness)·실패 판정(Negative Controls)·정리(Cleanup) 계약을 설명합니다.

## 1. 구성 파일

- 실행 스크립트: [`scripts/verify-backup-recovery-browser.mjs`](file:///home/antigravity/blue45f/pilate_flow/scripts/verify-backup-recovery-browser.mjs)
- 하네스 자체 검증(빌드 신선도·Negative Control·정리 계약) 테스트: [`scripts/verify-backup-recovery-browser.node-test.mjs`](file:///home/antigravity/blue45f/pilate_flow/scripts/verify-backup-recovery-browser.node-test.mjs)
- 합성 테스트 픽스처: [`src/test/fixtures/backup-recovery/syntheticBackupFixtures.json`](file:///home/antigravity/blue45f/pilate_flow/src/test/fixtures/backup-recovery/syntheticBackupFixtures.json)
- 데이터 계약 문서: [`docs/TEACHING_HISTORY_BACKUP_RECOVERY_CONTRACT.md`](file:///home/antigravity/blue45f/pilate_flow/docs/TEACHING_HISTORY_BACKUP_RECOVERY_CONTRACT.md)

## 2. 빌드 신선도·격리·정리 계약 (Freshness, Isolation & Cleanup Contract)

1. **기본 실행: 현재 소스 대응 격리 산출물 빌드 (`isolated-fresh-build`)**
   - 기본 실행(`node scripts/verify-backup-recovery-browser.mjs`)은 공유 `dist/`의 존재 여부와 무관하게 항상 임시 격리 경로(`<tempRoot>/dist-isolated`)에 현재 소스 트리(`src/`, `index.html`, `public/`, `package.json`, `vite.config.ts`, `tsconfig*.json`)를 새로 빌드(`vite build --outDir <isolatedDistDir>`)하고 해당 경로만 `vite preview --outDir <isolatedDistDir>`로 서빙합니다.
   - 빌드 완료 시 산출물 내부의 `.backup-harness-build-meta.json`에 `sourceSha256`, `artifactSha256`, `gitBranch`, `gitHeadCommit`, `gitDirty`, `builtAt`을 기록합니다.
   - 저장소 루트의 공유 `dist/`나 다른 작업의 실행 서버는 절대 덮어쓰거나 삭제하지 않으며, 실행 전후 공유 `dist/` 지문 불변 여부를 `isolation.sharedDistUntouched`로 검증합니다.
2. **`--no-build` 모드의 산출물 지문 검증 및 불일치 시 명시적 실패 (`build-freshness`)**
   - `--no-build` 실행 시 검증 대상 산출물(`--dist-dir <경로>` 또는 기본 `dist/`)의 실제 파일 SHA-256 지문(`artifactFingerprint`)과 현재 소스 지문(`sourceFingerprint`)을 계산해 결과 JSON에 기록합니다.
   - 다음의 경우 `PASS`로 위장하지 않고 `failureStage: "build-freshness"` 및 비정상 종료 코드(`exit 1`)로 즉시 실패합니다:
     - 산출물 또는 참조 에셋 번들이 누락·손상된 경우 (`missing-or-incomplete-artifact`)
     - `.backup-harness-build-meta.json`이 손상되었거나 빌드 후 에셋이 변조된 경우 (`corrupted-build-meta`, `tampered-artifact-meta-mismatch`)
     - `.backup-harness-build-meta.json`의 `sourceSha256`과 현재 소스 지문이 다른 경우 (`stale-artifact-source-fingerprint-mismatch`)
     - 산출물 타임스탬프가 현재 소스 최신 수정 시각보다 오래된 경우 (`stale-artifact-older-than-source`)
     - `.backup-harness-build-meta.json`이 없는 비고정(unpinned) 산출물을 `--expected-artifact-sha256` 없이 검증하려는 경우 (`unpinned-artifact-missing-build-meta`)
   - 의도적으로 구버전/외부 산출물을 감수하고 실행해야 하는 경우에만 `--allow-stale-dist` 또는 `--expected-artifact-sha256 <sha256>`을 명시할 수 있으며, 이 경우에도 `provenance.freshness.matchesCurrentSource: false`가 정직하게 기록됩니다.
3. **출처·지문 기록 및 민감정보 비기록 (`provenance`)**
   - 결과 JSON의 `provenance` 필드에 `git`(`branch`, `headCommit`, `headShort`, `dirty`, `dirtyFileCount`, `inspectedAt`), `sourceFingerprint`(`sha256`, `fileCount`, `newestMtimeIso`, `computedAt`), `artifactFingerprint`(`sha256`, `fileCount`, `totalBytes`, `indexMtimeIso`, `embeddedSourceSha256`, `computedAt`), `freshness`(`ok`, `status`, `matchesCurrentSource`, `verifiedAt`, `reason`)를 남깁니다.
   - 환경변수 비밀값, 토큰, 사용자 프로필 경로, 실사용자 데이터는 절대 수집·기록하지 않습니다.
4. **실패 분류·캡처 보존·안전한 정리 (`finally` & Signal Safety)**
   - 모든 실패는 `failureStage`(`cli-arguments`, `fixture-load`, `build-freshness`, `isolated-build`, `preview-start`, `browser-launch`, `step-assertion`, `report-output-write`, `signal-interrupted`), `failureReason`, 비정상 종료 코드(`exit 1` 또는 시그널 종료 코드)로 기록됩니다.
   - 실패 시 캡처한 PNG(`failureCapturePath`)는 `tempRoot` 외부의 보존 경로(지정한 `--screenshot-dir`, `--output` 인접 디렉터리, 또는 전용 보존 파일)에 저장되므로, `finally`에서 `tempRoot`를 정리한 뒤에도 유효한 파일(`failureCapturePreserved: true`)로 남습니다.
   - `finally` 및 `SIGINT`/`SIGTERM` 핸들러는 하네스 본인이 생성한 프로세스 그룹(`previewPid`, `chromePid`)과 `tempRoot`만 정리하며, 다른 세션의 브라우저나 서버 프로세스는 절대 종료하지 않습니다.

## 3. 실행 명령 (Execution Commands)

### 3.1 전체 17단계 브라우저 회귀 검증 (기본: 격리 신규 빌드)

```bash
node scripts/verify-backup-recovery-browser.mjs
```

### 3.2 하네스 자체 검증 (빌드 신선도·Negative Controls·정리 계약 테스트)

```bash
node --test scripts/verify-backup-recovery-browser.node-test.mjs
```

### 3.3 CLI 옵션

- `--output <경로>`: 구조화된 결과 JSON 파일을 지정한 경로에 저장합니다. (쓰기 실패 시 `report-output-write` 단계 오류 및 `exit 1`로 실패합니다.)
- `--screenshot-dir <경로>`: 단계별 및 실패 시 화면 캡처 PNG를 지정한 디렉터리에 저장합니다.
- `--only-step <stepId>`: 특정 단계(예: `scopeA-320x694-1-create-and-export`)만 선별 실행합니다.
- `--no-build`: 격리 빌드를 생략하고 지정 산출물(`--dist-dir` 또는 `dist/`)을 검증합니다. 산출물 지문이 현재 소스와 일치하지 않으면 `build-freshness` 오류로 실패합니다.
- `--dist-dir <경로>`: `--no-build` 시 검증할 산출물 디렉터리를 지정합니다.
- `--expected-source-sha256 <sha256>` / `--expected-artifact-sha256 <sha256>`: 예상 소스/산출물 SHA-256 지문을 강제 검증합니다.
- `--allow-stale-dist`: `--no-build`에서 소스 지문 불일치 산출물의 실행을 예외적으로 허용합니다(결과 JSON에는 `matchesCurrentSource: false`로 기록).
- `--chrome-bin <경로>` (또는 `CHROMIUM_BIN`): 사용할 Chromium 실행 파일 경로를 지정합니다.
- `--preview-timeout-ms <밀리초>`: 로컬 프리뷰 서버 시작 대기 제한시간을 지정합니다.

## 4. 검증 범위 매트릭스

### 4.1 백업·복원·롤백 브라우저 회귀 시나리오 (17단계)

| 구분 | 단계 ID | 뷰포트 | `mode` | 검증 내용 |
| :--- | :--- | :--- | :--- | :--- |
| **Scope A** | `scopeA-320x694-1..6` | `320x694` | `real-browser` / `real-browser+synthetic-fixture` | 실제 UI로 수업 기록 생성 → 백업 JSON 내보내기 → 사전검사(미적용 시 무변경 확인) → 복원 적용 → 새로고침 후 복원·롤백 바 유지 → 이전 상태로 되돌리기 |
| **Scope A** | `scopeA-390x844-1..6` | `390x844` | `real-browser` / `real-browser+synthetic-fixture` | `390x844` 모바일 뷰포트에서 동일한 6단계 전체 UI 왕복 검증 |
| **Scope B** | `scopeB-1-multi-tab-storage-event-during-preflight` | `390x844` | `real-browser` | 동일 origin의 두 독립 탭(`Tab A`, `Tab B`)에서 `Tab A` 사전검사 중 `Tab B`가 `localStorage`를 변경할 때 실제 `StorageEvent`가 발생하고 `Tab A`의 복원 적용 버튼이 즉시 비활성화되는지 검증 |
| **Scope B** | `scopeB-2-multi-tab-storage-change-blocks-stale-rollback` | `390x844` | `real-browser` | `Tab A` 복원 직후 `Tab B`가 새 데이터를 저장했을 때 `Tab A`의 오래된 롤백이 차단되어 `Tab B` 데이터가 보존되는지 검증 |
| **Scope B** | `scopeB-3-post-restore-new-record-reload-and-double-rollback` | `390x844` | `real-browser` | 복원 후 새 수업 기록 생성 시 롤백 차단, 새로고침 후 stale 롤백 버튼 숨김, `Tab A` 1차 롤백 후 `Tab B`에서의 2차 롤백(두 번 롤백) 차단 검증 |
| **Scope B** | `scopeB-4-rollback-key-synthetic-fault-fixtures` | `390x844` | `real-browser+synthetic-fixture` | `pilates-flow-backup-rollback-v1`에 손상 JSON, 미지원 버전(`version: 99`), 잘못된 `preRestoreState` 구조 주입 시 안전하게 무시하고, 구버전(`version: 0`) 유효 롤백 포인트는 손실 없이 복원 이전 상태로 되돌리는지 검증 |
| **Scope B** | `scopeB-5-rollback-write-failure-mock-fault-injection` | `390x844` | `real-browser+mock-injected` | `Storage.prototype.setItem`에 `QuotaExceededError`를 주입하여 롤백 키 쓰기 실패 시 메모리 내 롤백 포인트가 유지되고, 메인 저장소 쓰기 실패 시 유효 롤백 포인트가 소실되지 않으며 오류 해제 후 재시도가 성공하는지 검증 |

### 4.2 하네스 빌드 신선도 및 Negative-Control 검증 (`verify-backup-recovery-browser.node-test.mjs`)

| 구분 | 테스트 항목 | 검증 내용 |
| :--- | :--- | :--- |
| **Scope A1** | 구버전 `dist` 결함 재현 및 `--no-build` 차단 | 소스가 변경된 뒤 오래된 산출물이 남아 있을 때 기존 `if (!existsSync(distIndex))` 방식이 구버전 빌드를 통과시키던 결함을 합성 픽스처에서 재현하고, 개선된 `--no-build`가 `build-freshness` 단계 오류(`exit 1`)로 정확히 차단하며 일치하는 고정 산출물만 통과시키는지 검증 |
| **Scope A2** | 기본 격리 빌드(`isolated-fresh-build`) 및 공유 `dist/` 보호 | 기본 실행이 현재 소스에 대응하는 격리 산출물을 빌드·검증하고, 기존 `dist/`의 센티널 파일을 전혀 덮어쓰거나 삭제하지 않으며(`sharedDistUntouched: true`), `branch`/`headCommit`/`dirty`/지문/시각만 남기고 비밀값을 노출하지 않는지 검증 |
| **Scope B1** | 의도적 Assertion 실패 Negative Control | `--inject-assertion-failure` 주입 시 `exit 1`, `status: "fail"`, `failureStage: "step-assertion"`을 기록하고, `tempRoot`가 정리된 뒤에도 `failureCapturePath`의 PNG 파일이 실제로 존재·유효(`failureCapturePreserved: true`)한지 검증 |
| **Scope B2** | 잘못된 CLI 인자 및 손상/누락 픽스처 Negative Control | 알 수 없는 플래그, 인자값 누락, 존재하지 않거나 손상된 `--fixture` 전달 시 `cli-arguments` / `fixture-load` 단계 오류 및 `exit 1`로 실패하는지 검증 |
| **Scope B3** | Chromium 실행 실패 Negative Control | 존재하지 않는 `--chrome-bin` 전달 시 `browser-launch` 단계 오류(`exit 1`)로 실패하고, 이미 기동된 프리뷰 서버 PID와 임시 디렉터리를 누수 없이 정리하는지 검증 |
| **Scope B4** | 프리뷰 서버 시작 실패/Timeout Negative Control | 프리뷰 기동 지연/실패 시 `preview-start` 단계 오류(`exit 1`)로 실패하고 생성된 프리뷰 프로세스를 즉시 종료하는지 검증 |
| **Scope B5** | 결과 파일 출력 경로 쓰기 실패 Negative Control | 디렉터리 경로 등 쓰기 불가능한 `--output` 경로 지정 시 실패가 `exit 0`으로 숨지 않고 `report-output-write` 단계 오류(`exit 1`)로 보고되는지 검증 |
| **Scope B6** | `SIGTERM` 중단 정리 및 타 세션 프로세스 보호 | 실행 중 `SIGTERM` 수신 시 하네스가 생성한 프리뷰/브라우저 PID와 `tempRoot`만 정리하고, 외부 세션의 독립 프로세스는 절대 종료하지 않는지 검증 |

## 5. `package.json` 및 CI 연결 제안 (미적용 제안)

공유 설정 파일(`package.json`, 루트 CI 워크플로우) 충돌 방지 원칙에 따라 해당 파일은 직접 수정하지 않았습니다. 통합 담당자가 필요 시 `package.json`의 `scripts`에 아래 항목을 추가해 연결할 수 있습니다.

```diff
--- a/package.json
+++ b/package.json
@@ -16,6 +16,8 @@
     "test:Backup": "vitest run src/utils/backupRecoveryInspection.test.ts src/test/backupRecoveryStore.test.ts",
+    "test:backup-browser": "node scripts/verify-backup-recovery-browser.mjs",
+    "test:backup-browser:harness": "node --test scripts/verify-backup-recovery-browser.node-test.mjs",
     "check:motion-study": "node scripts/check-motion-study-coverage.mjs"
   }
```
