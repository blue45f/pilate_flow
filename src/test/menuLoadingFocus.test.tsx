import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { usePilatesStore } from '../store/usePilatesStore';

// A loading workspace has no destination heading yet; its main landmark remains available.
vi.mock('../components/SequenceWorkbench', () => ({
  SequenceWorkbench: () => <p role="status">수업 화면을 불러오는 중</p>,
}));
import { App } from '../App';

const original = usePilatesStore.getState();
const originalWidth = window.innerWidth;
const resize = (width: number) => {
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: width });
  fireEvent(window, new Event('resize'));
};
beforeEach(() => {
  resize(390);
  usePilatesStore.setState({ ...original, activeTab: 'workbench', activeSteps: [] }, true);
});
afterEach(() => {
  cleanup();
  usePilatesStore.setState(original, true);
  resize(originalWidth);
});

describe('navigation focus while a destination is loading', () => {
  it('focuses the main landmark after removing inert when no heading is mounted yet', async () => {
    const { container } = render(<App />);
    await screen.findByText('수업 화면을 불러오는 중');
    expect(container.querySelector('#workspace-main-heading')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: '메뉴 열기' }));
    expect(container.querySelector('.workspace')).toHaveAttribute('inert');
    resize(1024);
    const main = screen.getByRole('main');
    await waitFor(() => expect(main).toHaveFocus());
    expect(container.querySelector('.workspace')).not.toHaveAttribute('inert');
    expect(screen.queryByRole('dialog', { name: '스튜디오 탐색' })).not.toBeInTheDocument();
  });
});
