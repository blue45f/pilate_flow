import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { PfAiStatusBadge } from './PfDomainPrimitives';
afterEach(cleanup);
it('labels a local automatic draft without implying AI output or verified instruction', () => {
  render(<PfAiStatusBadge kind="auto-draft" />);
  expect(screen.getByText('자동 생성 초안 · 수업 전 확인')).toBeTruthy();
});
it('preserves an explicit recommendation mode label', () => {
  render(<PfAiStatusBadge kind="auto-draft">기기 내 조건 초안</PfAiStatusBadge>);
  expect(screen.getByText('기기 내 조건 초안')).toBeTruthy();
});
