import { Component } from 'react';
import type { ReactNode } from 'react';
import { PfButton } from '../design-system';
import { LightDismissDialog } from './LightDismissDialog';

interface InstructorStudyBoundaryProps {
  children: ReactNode;
  onClose: () => void;
  /** Test seam; reload only follows an explicit user action. */
  onReload?: () => void;
}

/** A failed optional study import must not unmount the user's active class. */
export class InstructorStudyBoundary extends Component<
  InstructorStudyBoundaryProps,
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <LightDismissDialog
        open
        title="강사 연습실을 열지 못했어요"
        onClose={this.props.onClose}
        maxWidth="520px"
      >
        <p role="alert">
          연습실 자료를 불러오지 못했어요. 수업 구성과 저장·복구는 계속 사용할 수 있어요.
        </p>
        <p className="muted">
          연결을 확인한 뒤 새로고침해 주세요. 새로고침하면 적용 전 입력 내용이 사라질 수 있으니,
          필요한 내용을 먼저 저장해 주세요.
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          <PfButton variant="primary" onClick={this.props.onClose}>
            닫고 계속하기
          </PfButton>
          <PfButton
            variant="secondary"
            onClick={() => {
              if (this.props.onReload) this.props.onReload();
              else window.location.reload();
            }}
          >
            페이지 새로고침
          </PfButton>
        </div>
      </LightDismissDialog>
    );
  }
}
