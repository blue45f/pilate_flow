import { useEffect, useId } from 'react';
import { CircleCheck, LogOut, RefreshCw, ShieldCheck } from 'lucide-react';
import {
  bootstrapFirebaseSession,
  FIREBASE_OPERATING_ORIGIN,
  signInWithGoogle,
  signOutOfFirebase,
  useFirebaseSession,
} from '../lib/firebaseSession';
import '../styles/firebase-account.css';

function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true" focusable="false">
      <path
        fill="#4285F4"
        d="M43.6 24.5c0-1.4-.1-2.8-.4-4.1H24v7.8h11c-.5 2.5-1.9 4.6-4.1 6v5h6.6c3.9-3.6 6.1-8.8 6.1-14.7Z"
      />
      <path
        fill="#34A853"
        d="M24 44c5.5 0 10.1-1.8 13.5-4.9l-6.6-5c-1.8 1.2-4.1 1.9-6.9 1.9-5.3 0-9.8-3.6-11.4-8.4H5.8v5.2A20.4 20.4 0 0 0 24 44Z"
      />
      <path fill="#FBBC05" d="M12.6 27.6a12 12 0 0 1 0-7.2v-5.2H5.8a20 20 0 0 0 0 17.6l6.8-5.2Z" />
      <path
        fill="#EA4335"
        d="M24 12c3 0 5.6 1 7.7 3l5.8-5.8A19.5 19.5 0 0 0 24 4 20.4 20.4 0 0 0 5.8 15.2l6.8 5.2C14.2 15.6 18.7 12 24 12Z"
      />
    </svg>
  );
}

export function CloudSyncPanel() {
  const session = useFirebaseSession();
  const headingId = useId();
  const privacyId = useId();
  const busy = session.operation !== null;
  const unsupportedHost = session.error?.code === 'auth/unsupported-host';

  useEffect(() => {
    void bootstrapFirebaseSession();
  }, []);

  return (
    <section
      className="settings-section firebase-account-panel"
      aria-labelledby={headingId}
      aria-busy={session.phase === 'checking' || busy}
    >
      <span className="eyebrow">YOUR ATELIER ACCOUNT</span>
      <h3 id={headingId}>
        <ShieldCheck size={19} aria-hidden="true" /> Google 계정 연결
      </h3>
      <p>Google 계정으로 안전하게 로그인하세요. 수업 자료는 계속 이 기기에서 관리합니다.</p>
      <div className="firebase-account-boundary" id={privacyId}>
        <strong>로그인과 클라우드 백업은 별개입니다.</strong>
        <p>
          수업 자료는 로그인한 계정별로 이 브라우저에 보관됩니다. 서버에 업로드하거나 다른 기기와
          동기화하지 않습니다. 다른 기기로 옮기려면 전체 JSON 백업을 이용해 주세요.
        </p>
      </div>

      {session.phase === 'checking' && (
        <p role="status" className="firebase-account-status">
          저장된 로그인 상태를 확인하고 있어요…
        </p>
      )}

      {session.phase === 'signed-out' && (
        <button
          type="button"
          className="firebase-google-button"
          aria-describedby={privacyId}
          disabled={busy}
          onClick={() => void signInWithGoogle()}
        >
          <GoogleMark />
          {session.operation === 'signing-in' ? 'Google 로그인 진행 중…' : 'Google로 계속하기'}
        </button>
      )}

      {session.phase === 'signed-in' && session.user && (
        <div className="firebase-account-identity">
          <span className="firebase-account-initial" aria-hidden="true">
            {(session.user.displayName ?? session.user.email ?? '계정').trim().charAt(0) || '계'}
          </span>
          <div className="firebase-account-details">
            <strong>{session.user.displayName || 'Google 계정'}</strong>
            {session.user.email && <span>{session.user.email}</span>}
            <span className="firebase-account-connected">
              <CircleCheck size={14} aria-hidden="true" /> Google 로그인됨 · 클라우드 백업 미연결
            </span>
          </div>
          <button
            type="button"
            className="btn-secondary"
            disabled={busy}
            onClick={() => void signInWithGoogle()}
          >
            다른 Google 계정으로 전환
          </button>
          <button
            type="button"
            className="btn-secondary firebase-account-logout"
            disabled={busy}
            onClick={() => void signOutOfFirebase()}
          >
            <LogOut size={16} aria-hidden="true" />
            {session.operation === 'signing-out' ? '로그아웃 중…' : '로그아웃'}
          </button>
        </div>
      )}

      {session.error && (
        <p role="alert" className="firebase-account-error">
          {session.error.message}
        </p>
      )}
      {session.notice && (
        <p role="status" className="firebase-account-status">
          {session.notice}
        </p>
      )}
      {session.operation === 'signing-in' && (
        <p role="status" className="firebase-account-status">
          열린 Google 창에서 로그인을 완료하거나 창을 닫아 취소할 수 있습니다.
        </p>
      )}

      {session.phase === 'unavailable' &&
        (unsupportedHost ? (
          <a className="btn-secondary firebase-account-link" href={FIREBASE_OPERATING_ORIGIN}>
            운영 사이트에서 로그인
          </a>
        ) : (
          <button
            type="button"
            className="btn-secondary firebase-account-retry"
            onClick={() => void bootstrapFirebaseSession()}
          >
            <RefreshCw size={16} aria-hidden="true" /> 계정 연결 다시 확인
          </button>
        ))}
      <p className="firebase-account-footnote">
        로그아웃해도 계정 자료는 이 브라우저에 보관됩니다. 같은 계정으로 다시 로그인하면 열 수
        있습니다. 브라우저 데이터를 삭제하면 사라질 수 있으니 JSON 백업도 보관하세요.
      </p>
    </section>
  );
}
