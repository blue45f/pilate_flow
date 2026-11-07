import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { getRecoveryStorageStatus, usePilatesStore } from '../store/usePilatesStore';
import { RECOVERY_STORAGE_KEY } from '../lib/recoveryStorageGuard';
import type { RecoveryStorageStatus } from '../lib/recoveryStorageGuard';
import {
  backupRecoveryStateFingerprint,
  inspectBackupRecovery,
  MAX_LOCAL_BACKUP_BYTES,
} from '../utils/backupRecoveryInspection';
import type { BackupRecoveryInspection } from '../utils/backupRecoveryInspection';
import {
  captureBackupPreRestoreState,
  clearBackupRestoreRollbackPoint,
  getLatestBackupRollbackPoint,
  recordBackupRestoreRollbackPoint,
  rollbackLatestBackupRestore,
} from '../utils/teachingHistorySnapshot';
import type { BackupRestoreRollbackPoint } from '../utils/teachingHistorySnapshot';
import '../styles/recovery-preview.css';

/** File selection is read-only. Only the explicit Apply calls the atomic store recovery. */
export function RecoveryPreview() {
  const state = usePilatesStore();
  const input = useRef<HTMLInputElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const request = useRef(0);
  const applyingRef = useRef(false);
  const rollingBackRef = useRef(false);
  const [raw, setRaw] = useState<string | null>(null);
  const [inspection, setInspection] = useState<BackupRecoveryInspection | null>(null);
  const [reading, setReading] = useState(false);
  const [message, setMessage] = useState('');
  const [storageStatus, setStorageStatus] = useState<RecoveryStorageStatus | null>(null);
  const [storageFingerprint, setStorageFingerprint] = useState<string | undefined>();
  const [rollbackPoint, setRollbackPoint] = useState<BackupRestoreRollbackPoint | null>(() => {
    const candidate = getLatestBackupRollbackPoint();
    if (!candidate) return null;
    const currentState = usePilatesStore.getState();
    if (candidate.postRestoreStateFingerprint !== backupRecoveryStateFingerprint(currentState)) {
      return null;
    }
    return candidate;
  });
  useLayoutEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (raw === null || (event.key !== null && event.key !== RECOVERY_STORAGE_KEY)) return;
      // Display a local warning only. Never rehydrate, merge, or adopt an external baseline.
      setStorageStatus(getRecoveryStorageStatus(storageFingerprint));
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [raw, storageFingerprint]);
  useEffect(
    () => () => {
      request.current++;
    },
    [],
  );
  const stale =
    inspection?.success && inspection.stateFingerprint !== backupRecoveryStateFingerprint(state);

  const diskBlocked = storageStatus !== null && !storageStatus.ok;

  function inspect(contents: string) {
    const disk = getRecoveryStorageStatus();
    setStorageStatus(disk);
    setStorageFingerprint(disk.ok ? disk.fingerprint : undefined);
    setInspection(inspectBackupRecovery(contents, usePilatesStore.getState()));
    setMessage('');
    requestAnimationFrame(() => heading.current?.focus({ preventScroll: true }));
  }
  function focusChooser() {
    input.current
      ?.closest('.recovery-preview')
      ?.querySelector<HTMLButtonElement>('[data-recovery-choose]')
      ?.focus();
  }
  function cancel() {
    request.current++;
    setRaw(null);
    setInspection(null);
    setReading(false);
    setMessage('');
    setStorageStatus(null);
    setStorageFingerprint(undefined);
    focusChooser();
  }
  return (
    <div className="recovery-preview">
      <button
        type="button"
        className="btn-secondary"
        data-recovery-choose
        onClick={() => input.current?.click()}
      >
        백업 불러오기
      </button>
      <input
        ref={input}
        className="sr-only"
        tabIndex={-1}
        type="file"
        accept="application/json,.json"
        aria-label="백업 JSON 파일 선택"
        onChange={async (event) => {
          const file = event.currentTarget.files?.[0];
          event.currentTarget.value = '';
          if (!file) return;
          const identity = ++request.current;
          setReading(true);
          setRaw(null);
          setInspection(null);
          setMessage('');
          setStorageStatus(null);
          setStorageFingerprint(undefined);
          if (file.size > MAX_LOCAL_BACKUP_BYTES) {
            setReading(false);
            setMessage('15MB 이하의 백업 파일을 선택해 주세요.');
            return;
          }
          try {
            const contents = await file.text();
            if (identity !== request.current) return;
            setRaw(contents);
            inspect(contents);
          } catch {
            if (identity === request.current)
              setMessage('파일을 읽을 수 없습니다. 원본 파일을 보관하고 다시 선택해 주세요.');
          } finally {
            if (identity === request.current) setReading(false);
          }
        }}
      />
      {reading && (
        <p role="status">파일을 읽고 복구 내용을 확인하고 있어요. 아직 자료를 바꾸지 않았습니다.</p>
      )}
      {inspection && (
        <section className="recovery-preview-details" aria-label="복구 전 확인">
          <h4 ref={heading} tabIndex={-1}>
            복구 전 확인
          </h4>
          {!inspection.success ? (
            <div role="alert">
              <p>{inspection.message}</p>
              {inspection.unsupportedItems !== undefined && (
                <p>
                  미지원 항목 {inspection.unsupportedItems}개 · 원본 파일은 그대로 보관해 주세요.
                </p>
              )}
              <p>현재 자료와 초안은 바꾸지 않았습니다.</p>
              <button type="button" className="btn-secondary" onClick={cancel}>
                닫기
              </button>
            </div>
          ) : (
            <>
              <p>
                {inspection.summary.sourceLabel} · {Math.ceil(inspection.summary.bytes / 1024)}KB
              </p>
              <p>
                새로 추가 {inspection.summary.newItems}개 · 기존 충돌 {inspection.summary.conflicts}
                개 · 기본 예시 복원 {inspection.summary.restoredExamples}개
              </p>
              {!inspection.summary.changed && (
                <p>추가하거나 바꿀 자료가 없습니다. 현재 자료를 그대로 유지합니다.</p>
              )}
              <div
                className="recovery-count-scroll"
                role="region"
                aria-label="복구 자료 개수 비교"
                tabIndex={0}
              >
                <table>
                  <caption>파일을 적용할 때의 자료 개수</caption>
                  <thead>
                    <tr>
                      <th scope="col">자료 유형</th>
                      <th scope="col">파일 포함</th>
                      <th scope="col">새로 추가</th>
                      <th scope="col">기존 유지</th>
                      <th scope="col">충돌</th>
                      <th scope="col">기본 예시 복원</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inspection.summary.rows.map((row) => (
                      <tr key={row.key}>
                        <th scope="row">{row.label}</th>
                        <td>{row.incoming}</td>
                        <td>{row.newItems}</td>
                        <td>{row.keptExisting}</td>
                        <td>{row.conflicts}</td>
                        <td>{row.restoredExamples}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p>
                수정한 기존 자료는 유지합니다. 바뀌지 않은 기본 예시에만 백업 값을 반영하며, 백업
                초안은 별도 바인더 사본으로 보관합니다. 현재 블록·제목·시간·잠금은 유지합니다. 블록
                없는 작업대의 비어 있는 수업 조건·최근 조건은 아래 표시된 경우에만 백업 값으로
                채웁니다.
              </p>
              <p>
                충돌·되돌리기 안내: 복원 실패 시 기존 정상 데이터는 변경되지 않으며, 복원 적용
                직후에는 ‘복원 이전 상태로 되돌리기’ 버튼으로 적용 전 상태로 즉시 원복할 수
                있습니다.
              </p>
              {inspection.summary.notices.map((notice) => (
                <p className="recovery-notice" key={notice.code}>
                  {notice.message}
                  {notice.count !== undefined ? ` (${notice.count}개)` : ''}
                </p>
              ))}
              <p>
                파일 형식과 병합 내용을 확인하는 절차입니다. 작성자·무결성 서명·전문가 검수나 자격을
                인증하지 않습니다.
              </p>
              {stale && (
                <p role="status">검토 후 현재 자료가 달라졌습니다. 다시 검토한 뒤 적용해 주세요.</p>
              )}
              {diskBlocked && <p role="alert">{storageStatus.message}</p>}
              <div className="recovery-preview-actions">
                {(stale || diskBlocked) && (
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => {
                      if (raw !== null) inspect(raw);
                    }}
                  >
                    현재 자료로 다시 검토
                  </button>
                )}
                <button
                  type="button"
                  className="btn-primary"
                  disabled={!!stale || diskBlocked || reading}
                  onClick={() => {
                    if (raw === null || applyingRef.current) return;
                    applyingRef.current = true;
                    try {
                      const preRestoreState = captureBackupPreRestoreState(
                        usePilatesStore.getState(),
                      );
                      const result = usePilatesStore.getState().restoreBackup(raw, {
                        expectedStateFingerprint: inspection.stateFingerprint,
                        expectedStorageFingerprint: storageFingerprint,
                      });
                      setMessage(result.message);
                      if (!result.success) {
                        const disk = getRecoveryStorageStatus(storageFingerprint);
                        setStorageStatus(disk);
                        if (!disk.ok) setMessage('');
                      }
                      if (result.success) {
                        if (!result.unchanged) {
                          const postDisk = getRecoveryStorageStatus();
                          const point = recordBackupRestoreRollbackPoint({
                            preRestoreState,
                            addedCount: result.added,
                            postRestoreStateFingerprint: backupRecoveryStateFingerprint(
                              usePilatesStore.getState(),
                            ),
                            postRestoreStorageFingerprint: postDisk.ok ? postDisk.fingerprint : null,
                          });
                          setRollbackPoint(point);
                        } else {
                          const existingPoint = getLatestBackupRollbackPoint();
                          const currentFp = backupRecoveryStateFingerprint(
                            usePilatesStore.getState(),
                          );
                          if (
                            !existingPoint ||
                            existingPoint.postRestoreStateFingerprint !== currentFp
                          ) {
                            clearBackupRestoreRollbackPoint();
                            setRollbackPoint(null);
                          }
                        }
                        setRaw(null);
                        setInspection(null);
                        focusChooser();
                      }
                    } finally {
                      applyingRef.current = false;
                    }
                  }}
                >
                  이 내용으로 복원 적용
                </button>
                <button type="button" className="btn-secondary" onClick={cancel}>
                  복원 취소
                </button>
              </div>
            </>
          )}
        </section>
      )}
      {message && <p role="status">{message}</p>}
      {rollbackPoint && !inspection && (
        <div className="recovery-preview-actions" data-testid="recovery-rollback-bar">
          <button
            type="button"
            className="btn-secondary"
            onClick={() => {
              if (rollingBackRef.current) return;
              rollingBackRef.current = true;
              try {
                const outcome = rollbackLatestBackupRestore({
                  getState: usePilatesStore.getState,
                  setState: (partial) => usePilatesStore.setState(partial),
                  checkStorage: (expected) => getRecoveryStorageStatus(expected ?? undefined),
                });
                setMessage(outcome.message);
                if (outcome.success || !getLatestBackupRollbackPoint()) {
                  setRollbackPoint(null);
                  if (outcome.success) focusChooser();
                }
              } finally {
                rollingBackRef.current = false;
              }
            }}
          >
            복원 이전 상태로 되돌리기
          </button>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => {
              clearBackupRestoreRollbackPoint();
              setRollbackPoint(null);
            }}
          >
            되돌리기 닫기
          </button>
        </div>
      )}
    </div>
  );
}
