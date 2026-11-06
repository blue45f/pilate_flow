import { Component } from 'react';
import type { ReactNode } from 'react';

interface DeferredPanelBoundaryProps {
  children: ReactNode;
  /** Test seam; the user must explicitly choose a page reload. */
  onReload?: () => void;
}

/** Isolate the optional account panel so local backup and recovery remain available. */
export class DeferredPanelBoundary extends Component<
  DeferredPanelBoundaryProps,
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <section className="settings-section">
        <p role="alert">
          계정 백업 화면을 불러오지 못했어요. 아래 전체 백업과 JSON 복구는 계속 사용할 수 있어요.
        </p>
        <p className="muted">
          새로고침하면 적용 전 입력 내용이 사라질 수 있어요. 필요한 자료를 먼저 백업해 주세요.
        </p>
        <button
          type="button"
          className="btn-secondary"
          onClick={() => {
            if (this.props.onReload) this.props.onReload();
            else window.location.reload();
          }}
        >
          페이지 새로고침
        </button>
      </section>
    );
  }
}
