import { Download, Share } from 'lucide-react';
import { requestPwaInstall, usePwa } from '../lib/pwa';
import '../styles/pwa-install.css';

export function PwaInstallPanel() {
  const pwa = usePwa();
  return (
    <section className="pwa-install-panel" aria-labelledby="pwa-install-heading">
      <h3 id="pwa-install-heading">홈 화면에 앱 설치</h3>
      <p>Flow Atelier를 홈 화면이나 앱 목록에서 바로 여세요. 앱스토어 다운로드 없이 설치합니다.</p>
      {pwa.standalone ? (
        <p role="status">지금 앱으로 실행 중이에요.</p>
      ) : pwa.installed ? (
        <p role="status">
          브라우저에서 설치 완료를 확인했어요. 홈 화면이나 앱 목록에서 열어 주세요.
        </p>
      ) : (
        <>
          {pwa.canInstall && (
            <button
              type="button"
              className="btn-primary pwa-install-action"
              onClick={() => void requestPwaInstall()}
            >
              <Download size={18} aria-hidden="true" /> 이 기기에 설치
            </button>
          )}
          {pwa.installStatus === 'prompting' && (
            <p role="status">브라우저의 설치 창에서 선택해 주세요.</p>
          )}
          {pwa.installStatus === 'accepted' && (
            <p role="status">설치를 요청했어요. 기기의 설치가 끝나면 앱 목록에서 열어 주세요.</p>
          )}
          {!pwa.canInstall && pwa.installStatus === 'dismissed' && (
            <p role="status">
              설치를 취소했어요. 계속 웹에서 사용하거나 브라우저 메뉴에서 다시 설치할 수 있어요.
            </p>
          )}
          {!pwa.canInstall && pwa.installStatus === 'error' && (
            <p role="status">
              설치 창을 열지 못했어요. 아래 브라우저 메뉴 방법으로 다시 시도해 주세요.
            </p>
          )}
          {pwa.platform === 'ios-safari' ? (
            <ol>
              <li>
                Safari의 <Share size={16} aria-hidden="true" /> <strong>공유</strong> 버튼을
                누르세요. 메뉴 안에 있을 수도 있어요.
              </li>
              <li>
                <strong>홈 화면에 추가</strong>를 선택하세요.
              </li>
              <li>
                <strong>웹 앱으로 열기</strong>가 보이면 켠 뒤 <strong>추가</strong>를 누르세요.
              </li>
            </ol>
          ) : pwa.platform === 'ios-other' ? (
            <p>이 주소를 Safari에서 연 다음 공유 → 홈 화면에 추가를 선택하세요.</p>
          ) : (
            <details open={!pwa.canInstall && pwa.installStatus !== 'prompting'}>
              <summary>설치 버튼이 보이지 않나요?</summary>
              <p>
                Android Chrome에서는 ⋮ 메뉴 → 홈 화면에 추가 → 설치를 선택하세요. 컴퓨터에서는
                주소창의 설치 아이콘이나 브라우저 메뉴의 앱 설치를 확인하세요.
              </p>
              <p>
                Mac Safari에서는 파일 → Dock에 추가를 선택하세요. 지원하는 macOS 버전에서 사용할 수
                있어요. 메뉴가 없다면 일반 창의 최신 Chrome·Edge·Safari에서 다시 열어 주세요.
                브라우저나 기기 설정에 따라 설치를 지원하지 않을 수 있어요.
              </p>
            </details>
          )}
        </>
      )}
      <details className="pwa-install-notes">
        <summary>오프라인·자료 보관·업데이트</summary>
        {pwa.offlineStatus === 'ready' && <p>기본 화면을 오프라인에서 열 준비가 됐어요.</p>}
        {pwa.offlineStatus === 'preparing' && (
          <p>기본 화면을 기기에 준비하고 있어요. 처음에는 인터넷 연결을 유지해 주세요.</p>
        )}
        {pwa.offlineStatus === 'update-ready' && (
          <p role="status">
            새 버전이 준비됐어요. 수업을 마치고 백업한 뒤 이 사이트의 모든 탭과 앱 창을 닫고 다시
            열어 주세요. 작성 중 자동으로 새로고침하지 않아요.
          </p>
        )}
        {(pwa.offlineStatus === 'error' || pwa.offlineStatus === 'unavailable') && (
          <p>현재 오프라인 준비를 확인하지 못했어요. 인터넷에 연결해서 사용해 주세요.</p>
        )}
        <p>
          로그인, 계정 백업, 영상과 일부 그림은 인터넷이 필요해요. 설치는 계정 백업이나 다른
          기기와의 동기화가 아닙니다.
        </p>
        <p>
          자료는 이 기기의 브라우저에 보관돼요. 특히 iPhone·iPad는 Safari와 홈 화면 앱의 자료가 따로
          보일 수 있으니 기존 자료를 전체 백업한 뒤 옮겨 주세요. 앱 삭제나 브라우저 데이터 삭제
          전에도 백업해 주세요.
        </p>
      </details>
    </section>
  );
}
