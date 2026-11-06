import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { App } from '../App';
import { usePilatesStore } from '../store/usePilatesStore';

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

describe('mobile navigation becoming desktop navigation', () => {
  it('removes modal navigation and unlocks the workspace at desktop width, with useful focus', async () => {
    const { container } = render(<App />);
    const heading = await screen.findByRole('heading', { name: '수업 준비, 가볍게.', level: 1 });
    fireEvent.click(screen.getByRole('button', { name: '메뉴 열기' }));
    expect(screen.getByRole('dialog', { name: '스튜디오 탐색' })).toHaveAttribute(
      'aria-modal',
      'true',
    );
    expect(container.querySelector('.workspace')).toHaveAttribute('inert');
    resize(1440);
    expect(screen.queryByRole('dialog', { name: '스튜디오 탐색' })).not.toBeInTheDocument();
    expect(container.querySelector('.workspace')).not.toHaveAttribute('inert');
    expect(container.querySelector('.menu-scrim')).toBeNull();
    await waitFor(() => expect(heading).toHaveFocus());
    resize(390);
    expect(screen.getByRole('button', { name: '메뉴 열기' })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
    expect(container.querySelector('.workspace')).not.toHaveAttribute('inert');
  });

  it.each([768, 1023])(
    'retains the open tablet menu at %ipx and exits modal mode at exactly1024px',
    async (tabletWidth) => {
      const { container } = render(<App />);
      await screen.findByRole('heading', { name: '수업 준비, 가볍게.', level: 1 });
      fireEvent.click(screen.getByRole('button', { name: '메뉴 열기' }));
      resize(tabletWidth);
      expect(screen.getByRole('dialog', { name: '스튜디오 탐색' })).toHaveAttribute(
        'aria-modal',
        'true',
      );
      expect(container.querySelector('.workspace')).toHaveAttribute('inert');
      resize(1024);
      expect(screen.queryByRole('dialog', { name: '스튜디오 탐색' })).not.toBeInTheDocument();
      expect(container.querySelector('.workspace')).not.toHaveAttribute('inert');
      expect(container.querySelector('.menu-scrim')).toBeNull();
      expect(usePilatesStore.getState().activeTab).toBe('workbench');
      expect(usePilatesStore.getState().activeSteps).toEqual([]);
    },
  );
});
