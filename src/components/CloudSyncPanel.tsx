import { useEffect, useState } from 'react';
import { Cloud, CloudDownload, CloudUpload, LogOut, RefreshCw, Trash2 } from 'lucide-react';
import { usePilatesStore } from '../store/usePilatesStore';
import {
  bootstrapCloudSession,
  acknowledgeCloudRecovery,
  cloudErrorMessage,
  deleteCloudBackup,
  readCloudBackup,
  refreshCloudStatus,
  safePictureUrl,
  saveCloudBackup,
  signInToCloud,
  signInWithGoogle,
  signOutOfCloud,
  useCloudSession,
} from '../lib/cloudSync';
import '../styles/cloud.css';

function GoogleIcon() {
  return (
    <svg
      className="cloud-google-icon"
      width="17"
      height="17"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        fill="#4285F4"
        d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v2.98h3.86c2.26-2.09 3.56-5.17 3.56-8.8Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-2.98c-1.08.72-2.45 1.16-4.07 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.28 14.31c-.24-.72-.38-1.49-.38-2.31s.14-1.59.38-2.31V6.6H1.29C.47 8.23 0 10.06 0 12s.47 3.77 1.29 5.4l3.99-3.09Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.6l3.99 3.09c.95-2.85 3.6-4.94 6.72-4.94Z"
      />
    </svg>
  );
}

export function CloudSyncPanel() {
  const userId = useCloudSession((state) => state.user?.userId);
  useEffect(() => {
    void bootstrapCloudSession();
  }, []);
  // Account changes discard local confirmations and feedback, including late request results.
  return <AccountCloudSyncPanel key={userId ?? 'signed-out'} />;
}

function AccountCloudSyncPanel() {
  const cloud = useCloudSession();
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [confirmDeleteRevision, setConfirmDeleteRevision] = useState<string | null>(null);
  const confirmDelete =
    confirmDeleteRevision !== null && confirmDeleteRevision === cloud.backup?.revision;
  const canRecheckDeletion =
    cloud.backup !== null && !cloud.backup.exists && cloud.backup.revision !== null;

  async function run(label: string, action: () => Promise<string | void>) {
    setBusy(label);
    setMessage('');
    try {
      const result = await action();
      if (result) setMessage(result);
    } catch (cause) {
      setMessage(cloudErrorMessage(cause));
    } finally {
      setBusy(null);
    }
  }

  const timestamp = cloud.backup?.updatedAt
    ? new Date(cloud.backup.updatedAt).toLocaleString('ko-KR')
    : null;
  const pictureUrl = safePictureUrl(cloud.user?.picture);
  const initial =
    (cloud.user?.name ?? cloud.user?.email ?? 'G').trim().charAt(0).toUpperCase() || 'G';
  return (
    <section className="settings-section cloud-panel" aria-labelledby="cloud-backup-heading">
      <span className="eyebrow">PRIVATE ACCOUNT BACKUP</span>
      <h3 id="cloud-backup-heading">
        <Cloud size={19} /> 계정에 서버 백업
      </h3>
      <p>
        로그인한 계정만 접근할 수 있는 서버에 수업 자료 사본을 보관하세요. 저장 버튼을 누를 때만
        업로드하며, 자동 동기화는 하지 않습니다.
      </p>
      {cloud.phase === 'checking' && (
        <p role="status" className="muted">
          계정 연결을 확인하고 있어요…
        </p>
      )}
      {cloud.phase === 'signed-out' && (
        <div className="button-row cloud-signin-actions">
          <button
            type="button"
            className="btn-google"
            disabled={!!busy}
            onClick={() => void run('Google 로그인 연결', () => signInWithGoogle())}
          >
            <GoogleIcon /> Google 계정으로 로그인
          </button>
          <button
            type="button"
            className="btn-primary"
            disabled={!!busy}
            onClick={() => void run('로그인 연결', () => signInToCloud())}
          >
            <Cloud size={17} /> 로그인하고 백업 연결
          </button>
        </div>
      )}
      {cloud.phase === 'unavailable' && (
        <div className="button-row cloud-signin-actions">
          <button
            type="button"
            className="btn-secondary"
            disabled={!!busy}
            onClick={() => void run('연결 확인', () => bootstrapCloudSession(true))}
          >
            <RefreshCw size={16} /> 서버 연결 다시 확인
          </button>
          <button
            type="button"
            className="btn-google"
            disabled={!!busy}
            onClick={() => void run('Google 로그인 연결', () => signInWithGoogle())}
          >
            <GoogleIcon /> Google 계정으로 로그인
          </button>
        </div>
      )}
      {cloud.phase === 'signed-in' && (
        <>
          <div className="cloud-account">
            <div className="cloud-account-identity">
              {pictureUrl ? (
                <img
                  className="cloud-avatar"
                  src={pictureUrl}
                  alt=""
                  referrerPolicy="no-referrer"
                />
              ) : (
                <span className="cloud-avatar-fallback" aria-hidden="true">
                  {initial}
                </span>
              )}
              <div className="cloud-account-meta">
                {cloud.user?.name && cloud.user?.email && (
                  <strong className="cloud-account-name">{cloud.user.name}</strong>
                )}
                <span>{cloud.user?.email ?? cloud.user?.name ?? '연결된 계정'}</span>
              </div>
            </div>
            <div className="cloud-account-actions">
              <button
                type="button"
                className="text-button"
                disabled={!!busy || cloud.pendingSave || cloud.pendingDelete}
                onClick={() =>
                  void run('Google 계정 전환', () =>
                    signInWithGoogle({ prompt: 'select_account' }),
                  )
                }
              >
                다른 Google 계정으로 전환
              </button>
              <button
                type="button"
                className="text-button"
                disabled={!!busy}
                onClick={() =>
                  void run('로그아웃', async () => {
                    await signOutOfCloud();
                    return '계정 연결을 해제했습니다. 이 기기의 자료는 유지됩니다.';
                  })
                }
              >
                <LogOut size={14} /> 로그아웃
              </button>
            </div>
          </div>
          <p className="cloud-backup-status">
            {cloud.backup === null
              ? '서버 백업 상태를 확인해 주세요.'
              : timestamp
                ? `마지막 서버 저장: ${timestamp} · ${Math.ceil(cloud.backup.bytes / 1024)}KB`
                : '이 계정에 저장된 서버 백업이 없습니다.'}
          </p>
          {cloud.conflict && (
            <p className="status" role="status">
              서버에 이 기기에서 아직 합치지 않은 자료가 있습니다. 서버 자료를 먼저 합친 후 저장해
              주세요.
            </p>
          )}
          <div className="button-row cloud-actions">
            <button
              className="btn-primary"
              disabled={!!busy || !cloud.backup || cloud.conflict || cloud.pendingDelete}
              onClick={() =>
                void run('서버 저장', async () => {
                  await saveCloudBackup(usePilatesStore.getState().exportBackup());
                  return '서버에 백업을 저장했습니다. 같은 계정으로 다른 기기에서 불러올 수 있습니다.';
                })
              }
            >
              <CloudUpload size={16} /> {cloud.pendingSave ? '이전 저장 다시 확인' : '서버에 저장'}
            </button>
            <button
              className="btn-secondary"
              disabled={!!busy || !cloud.backup?.exists || cloud.pendingDelete}
              onClick={() =>
                void run('서버 복구', async () => {
                  const raw = await readCloudBackup();
                  const result = usePilatesStore.getState().restoreBackup(raw);
                  if (!result.success) throw new Error(result.message);
                  await acknowledgeCloudRecovery();
                  return result.message;
                })
              }
            >
              <CloudDownload size={16} /> 서버 자료 합치기
            </button>
            <button
              className="btn-secondary"
              disabled={!!busy}
              onClick={() =>
                void run('상태 확인', async () => {
                  await refreshCloudStatus();
                  return '서버 백업 상태를 확인했습니다.';
                })
              }
            >
              <RefreshCw size={15} /> 상태 확인
            </button>
          </div>
          <p className="muted">
            서버 자료를 합치면 수정한 같은 ID의 기기 자료와 현재 초안을 유지합니다. 수정하지 않은
            기본 예시에는 백업 값을 반영합니다. 서로 다른 기기의 수정 내용을 자동으로 합치지는
            않습니다. 서버 백업은 최대 2MB입니다.
          </p>
          {(cloud.backup?.exists || cloud.pendingDelete || canRecheckDeletion) && (
            <div className="cloud-delete">
              {canRecheckDeletion && (
                <p className="muted">
                  이전에 삭제한 백업의 파일 삭제를 다시 확인할 수 있습니다. 이미 삭제가 끝난
                  경우에도 이 항목이 표시됩니다.
                </p>
              )}
              {!confirmDelete ? (
                <button
                  className="text-button"
                  disabled={!!busy || cloud.pendingSave}
                  onClick={() => setConfirmDeleteRevision(cloud.backup?.revision ?? null)}
                >
                  <Trash2 size={14} />{' '}
                  {canRecheckDeletion ? '이전 백업 파일 삭제 다시 확인' : '서버 백업 삭제'}
                </button>
              ) : (
                <div role="group" aria-label="서버 백업 삭제 확인">
                  <p>
                    {canRecheckDeletion
                      ? '이 계정에서 이전에 삭제한 백업 파일의 삭제를 다시 요청할까요? 이 기기의 자료는 유지됩니다.'
                      : '서버의 사본을 삭제할까요? 이 기기의 자료는 유지됩니다.'}
                  </p>
                  <div className="button-row">
                    <button
                      className="btn-danger"
                      disabled={!!busy}
                      onClick={() =>
                        void run('서버 삭제', async () => {
                          await deleteCloudBackup();
                          setConfirmDeleteRevision(null);
                          return canRecheckDeletion
                            ? '이전 백업 파일 삭제를 확인했습니다. 이 기기의 자료는 유지됩니다.'
                            : '서버 백업을 삭제했습니다. 이 기기의 자료는 유지됩니다.';
                        })
                      }
                    >
                      {cloud.pendingDelete
                        ? '같은 삭제 요청 다시 확인'
                        : canRecheckDeletion
                          ? '이전 백업 파일 삭제 확인'
                          : '서버 사본 삭제 확인'}
                    </button>
                    <button
                      className="btn-secondary"
                      disabled={!!busy}
                      onClick={() => setConfirmDeleteRevision(null)}
                    >
                      취소
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
      {busy && (
        <p className="muted" role="status">
          {busy} 중…
        </p>
      )}
      {(message || cloud.error) && (
        <p className="status" role="status">
          {message || cloud.error}
        </p>
      )}
    </section>
  );
}
