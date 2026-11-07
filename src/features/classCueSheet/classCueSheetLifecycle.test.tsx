import React from 'react';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ClassCueSheetPreview } from './ClassCueSheetPreview';
import type { CueSheetFlexibleClassInput } from './classCueSheetTypes';

const ORIGINAL_VISIBILITY_DESCRIPTOR = Object.getOwnPropertyDescriptor(
  Document.prototype,
  'visibilityState',
);
const ORIGINAL_HIDDEN_DESCRIPTOR = Object.getOwnPropertyDescriptor(
  Document.prototype,
  'hidden',
);

function setDocumentVisibility(state: DocumentVisibilityState): void {
  Object.defineProperty(document, 'visibilityState', {
    configurable: true,
    get: () => state,
  });
  Object.defineProperty(document, 'hidden', {
    configurable: true,
    get: () => state === 'hidden',
  });
}

function restoreDocumentVisibility(): void {
  if (ORIGINAL_VISIBILITY_DESCRIPTOR) {
    Object.defineProperty(document, 'visibilityState', ORIGINAL_VISIBILITY_DESCRIPTOR);
  } else {
    Reflect.deleteProperty(document, 'visibilityState');
  }
  if (ORIGINAL_HIDDEN_DESCRIPTOR) {
    Object.defineProperty(document, 'hidden', ORIGINAL_HIDDEN_DESCRIPTOR);
  } else {
    Reflect.deleteProperty(document, 'hidden');
  }
}

function createFiveStepClassInput(
  id = 'lifecycle-test-class',
): CueSheetFlexibleClassInput {
  return {
    id,
    title: '라이프사이클·StrictMode·인쇄 복귀 검증 시퀀스',
    apparatus: 'reformer',
    level: '1.5',
    targetMinutes: 50,
    steps: [
      {
        stepId: 'lc-step-1',
        nameKo: '호흡 & 임프린트 워밍업',
        durationMin: 4,
        sets: 1,
        repetitions: 6,
        sideMode: 'together',
        springs: '1B',
        cues: ['늑골 측면 확장과 골반 중립을 확인합니다.'],
      },
      {
        stepId: 'lc-step-2',
        nameKo: '풋워크 패러렐 & 필라테스 V',
        durationMin: 6,
        sets: 2,
        repetitions: 10,
        sideMode: 'together',
        springs: '2R 1B',
        cues: ['뒤꿈치부터 좌골까지 연결감을 유지합니다.'],
      },
      {
        stepId: 'lc-step-3',
        nameKo: '헌드레드 코어 호흡',
        durationMin: 5,
        sets: 1,
        repetitions: 10,
        sideMode: 'together',
        springs: '1R 1B',
        cues: ['흉곽 하단을 닫고 일정한 템포로 펌핑합니다.'],
      },
      {
        stepId: 'lc-step-4',
        nameKo: '사이드 레그 스트랩 시리즈',
        durationMin: 8,
        sets: 2,
        repetitions: 8,
        sideMode: 'left-then-right',
        springs: '1R',
        cues: ['지지측 골반과 요추 중립을 끝까지 유지합니다.'],
      },
      {
        stepId: 'lc-step-5',
        nameKo: '머메이드 흉추 사이드 벤드',
        durationMin: 5,
        sets: 1,
        repetitions: 4,
        sideMode: 'left-then-right',
        springs: '1B',
        cues: ['양쪽 좌골을 균등하게 내리고 늑골 사이를 넓힙니다.'],
      },
    ],
  };
}

afterEach(() => {
  cleanup();
  restoreDocumentVisibility();
  vi.restoreAllMocks();
});

describe('ClassCueSheetPreview lifecycle, StrictMode, visibilitychange & print-return verification', () => {
  it('does not duplicate keyboard or button event handlers under <React.StrictMode> and advances by exactly 1 step per interaction', () => {
    const sourceInput = createFiveStepClassInput();

    render(
      <React.StrictMode>
        <ClassCueSheetPreview sourceInput={sourceInput} />
      </React.StrictMode>,
    );

    const root = screen.getByTestId('class-cue-sheet-root');
    const deck = screen.getByTestId('cue-sheet-focus-deck');
    const nextBtn = screen.getByTestId('cue-sheet-nav-next');
    const prevBtn = screen.getByTestId('cue-sheet-nav-prev');
    const firstBtn = screen.getByTestId('cue-sheet-nav-first');
    const lastBtn = screen.getByTestId('cue-sheet-nav-last');

    expect(root.getAttribute('data-current-step-index')).toBe('0');
    expect(root.getAttribute('data-current-cue-item-id')).toBe(
      'cue-item-id-lc-step-1-1',
    );

    // Single button click advances by 1 (0 -> 1), never by 2
    fireEvent.click(nextBtn);
    expect(root.getAttribute('data-current-step-index')).toBe('1');
    expect(root.getAttribute('data-current-cue-item-id')).toBe(
      'cue-item-id-lc-step-2-1',
    );

    // Single Prev button click moves back by 1 (1 -> 0)
    fireEvent.click(prevBtn);
    expect(root.getAttribute('data-current-step-index')).toBe('0');

    // Keyboard navigation on focus deck under StrictMode: each keydown moves by 1
    deck.focus();
    fireEvent.keyDown(deck, { key: 'ArrowRight' });
    expect(root.getAttribute('data-current-step-index')).toBe('1');

    fireEvent.keyDown(deck, { key: 'j' });
    expect(root.getAttribute('data-current-step-index')).toBe('2');

    fireEvent.keyDown(deck, { key: 'ArrowDown' });
    expect(root.getAttribute('data-current-step-index')).toBe('3');

    fireEvent.keyDown(deck, { key: 'n' });
    expect(root.getAttribute('data-current-step-index')).toBe('4');

    fireEvent.keyDown(deck, { key: 'ArrowLeft' });
    expect(root.getAttribute('data-current-step-index')).toBe('3');

    fireEvent.keyDown(deck, { key: 'k' });
    expect(root.getAttribute('data-current-step-index')).toBe('2');

    fireEvent.keyDown(deck, { key: 'ArrowUp' });
    expect(root.getAttribute('data-current-step-index')).toBe('1');

    fireEvent.keyDown(deck, { key: 'p' });
    expect(root.getAttribute('data-current-step-index')).toBe('0');

    // Home / End keys
    fireEvent.keyDown(deck, { key: 'End' });
    expect(root.getAttribute('data-current-step-index')).toBe('4');

    fireEvent.keyDown(deck, { key: 'Home' });
    expect(root.getAttribute('data-current-step-index')).toBe('0');

    // Boundary buttons transfer focus cleanly to focus deck inside StrictMode
    lastBtn.focus();
    fireEvent.click(lastBtn);
    expect(root.getAttribute('data-current-step-index')).toBe('4');
    expect(document.activeElement).toBe(deck);

    firstBtn.focus();
    fireEvent.click(firstBtn);
    expect(root.getAttribute('data-current-step-index')).toBe('0');
    expect(document.activeElement).toBe(deck);
  });

  it('preserves active cueItemId across live sourceInput edits inside <React.StrictMode>', () => {
    const baseInput = createFiveStepClassInput('strict-live-edit-class');
    const baseSteps = [...(baseInput.steps ?? [])];

    const { rerender } = render(
      <React.StrictMode>
        <ClassCueSheetPreview sourceInput={baseInput} />
      </React.StrictMode>,
    );

    const root = screen.getByTestId('class-cue-sheet-root');
    const nextBtn = screen.getByTestId('cue-sheet-nav-next');

    // Navigate to step #3 ('헌드레드 코어 호흡', index 2)
    fireEvent.click(nextBtn);
    fireEvent.click(nextBtn);
    expect(root.getAttribute('data-current-step-index')).toBe('2');
    expect(root.getAttribute('data-current-cue-item-id')).toBe(
      'cue-item-id-lc-step-3-1',
    );

    // Insert a new step before step #1 while wrapped in <React.StrictMode>
    rerender(
      <React.StrictMode>
        <ClassCueSheetPreview
          sourceInput={{
            ...baseInput,
            steps: [
              {
                stepId: 'lc-step-0-prep',
                nameKo: '사전 골반 시계 워밍업',
                durationMin: 3,
                sideMode: 'together',
              },
              ...baseSteps,
            ],
          }}
        />
      </React.StrictMode>,
    );

    expect(root.getAttribute('data-selection-resolution')).toBe('preserved-by-id');
    expect(root.getAttribute('data-current-cue-item-id')).toBe(
      'cue-item-id-lc-step-3-1',
    );
    expect(root.getAttribute('data-current-step-index')).toBe('3');
    expect(screen.getByTestId('cue-sheet-current-card').textContent).toContain(
      '헌드레드 코어 호흡',
    );

    // Single Next click after StrictMode live-edit reconciliation advances by 1 (3 -> 4)
    fireEvent.click(nextBtn);
    expect(root.getAttribute('data-current-step-index')).toBe('4');
    expect(root.getAttribute('data-current-cue-item-id')).toBe(
      'cue-item-id-lc-step-4-1',
    );
  });

  it('preserves progression position, textScale, viewMode, and focus across document visibilitychange (hidden <-> visible) and window blur/focus cycles', () => {
    const baseInput = createFiveStepClassInput('visibility-cycle-class');
    const baseSteps = [...(baseInput.steps ?? [])];

    const { rerender } = render(
      <React.StrictMode>
        <ClassCueSheetPreview sourceInput={baseInput} />
      </React.StrictMode>,
    );

    const root = screen.getByTestId('class-cue-sheet-root');
    const deck = screen.getByTestId('cue-sheet-focus-deck');
    const nextBtn = screen.getByTestId('cue-sheet-nav-next');

    // Navigate to step #3 (index 2)
    fireEvent.click(nextBtn);
    fireEvent.click(nextBtn);
    expect(root.getAttribute('data-current-step-index')).toBe('2');
    const targetCueItemId = root.getAttribute('data-current-cue-item-id');
    expect(targetCueItemId).toBe('cue-item-id-lc-step-3-1');

    // Change textScale to 150% and switch to expanded view mode
    fireEvent.click(screen.getByTestId('cue-sheet-scale-150'));
    fireEvent.click(
      screen.getByRole('button', { name: /반복·좌우 펼침 진행표/ }),
    );
    expect(root.getAttribute('data-text-scale')).toBe('150');
    expect(root.getAttribute('data-full-list-open')).toBe('true');

    deck.focus();
    expect(document.activeElement).toBe(deck);

    // Cycle 1: Tab hidden + window blur -> Tab visible + window focus
    setDocumentVisibility('hidden');
    window.dispatchEvent(new Event('blur'));
    document.dispatchEvent(new Event('visibilitychange'));

    expect(root.getAttribute('data-current-step-index')).toBe('2');
    expect(root.getAttribute('data-current-cue-item-id')).toBe(targetCueItemId);
    expect(root.getAttribute('data-text-scale')).toBe('150');
    expect(root.getAttribute('data-full-list-open')).toBe('true');

    setDocumentVisibility('visible');
    document.dispatchEvent(new Event('visibilitychange'));
    window.dispatchEvent(new Event('focus'));

    expect(root.getAttribute('data-current-step-index')).toBe('2');
    expect(root.getAttribute('data-current-cue-item-id')).toBe(targetCueItemId);
    expect(root.getAttribute('data-text-scale')).toBe('150');
    expect(root.getAttribute('data-full-list-open')).toBe('true');
    expect(root.contains(document.activeElement)).toBe(true);

    // Live edit while tab is hidden, then return to visible and navigate
    setDocumentVisibility('hidden');
    document.dispatchEvent(new Event('visibilitychange'));

    rerender(
      <React.StrictMode>
        <ClassCueSheetPreview
          sourceInput={{
            ...baseInput,
            steps: [
              {
                stepId: 'lc-step-pre',
                nameKo: '사전 브레스 체크',
                durationMin: 2,
                sideMode: 'together',
              },
              ...baseSteps,
            ],
          }}
        />
      </React.StrictMode>,
    );

    setDocumentVisibility('visible');
    document.dispatchEvent(new Event('visibilitychange'));
    window.dispatchEvent(new Event('focus'));

    expect(root.getAttribute('data-selection-resolution')).toBe('preserved-by-id');
    expect(root.getAttribute('data-current-cue-item-id')).toBe(targetCueItemId);
    expect(root.getAttribute('data-current-step-index')).toBe('3');
    expect(root.getAttribute('data-text-scale')).toBe('150');
    expect(screen.getByRole('list', { name: '펼친 진행표 항목 목록' })).toBeTruthy();

    // Subsequent single keydown advances by exactly 1 step (3 -> 4)
    fireEvent.keyDown(deck, { key: 'ArrowRight' });
    expect(root.getAttribute('data-current-step-index')).toBe('4');
    expect(root.getAttribute('data-current-cue-item-id')).toBe(
      'cue-item-id-lc-step-4-1',
    );
  });

  it('maintains clean unmount() hygiene with zero leaked window/document listeners and zero post-unmount errors', () => {
    const winAddSpy = vi.spyOn(window, 'addEventListener');
    const winRemoveSpy = vi.spyOn(window, 'removeEventListener');
    const docAddSpy = vi.spyOn(document, 'addEventListener');
    const docRemoveSpy = vi.spyOn(document, 'removeEventListener');
    const consoleErrorSpy = vi.spyOn(console, 'error');

    const countNetListeners = (
      addCalls: ReadonlyArray<unknown[]>,
      removeCalls: ReadonlyArray<unknown[]>,
    ): number => {
      const active = new Map<string, Set< unknown >>();
      for (const [type, listener] of addCalls) {
        if (typeof type === 'string' && listener) {
          let set = active.get(type);
          if (!set) {
            set = new Set();
            active.set(type, set);
          }
          set.add(listener);
        }
      }
      for (const [type, listener] of removeCalls) {
        if (typeof type === 'string' && listener) {
          active.get(type)?.delete(listener);
        }
      }
      let remaining = 0;
      for (const set of active.values()) {
        remaining += set.size;
      }
      return remaining;
    };

    const { unmount } = render(
      <React.StrictMode>
        <ClassCueSheetPreview
          sourceInput={createFiveStepClassInput('unmount-hygiene-class')}
        />
      </React.StrictMode>,
    );

    // Record baseline calls created by React's root delegation before component interactions
    winAddSpy.mockClear();
    winRemoveSpy.mockClear();
    docAddSpy.mockClear();
    docRemoveSpy.mockClear();

    const deck = screen.getByTestId('cue-sheet-focus-deck');
    deck.focus();
    fireEvent.keyDown(deck, { key: 'ArrowRight' });
    fireEvent.click(screen.getByTestId('cue-sheet-scale-125'));
    fireEvent.click(screen.getByTestId('cue-sheet-full-list-toggle'));
    fireEvent.click(screen.getByTestId('cue-sheet-diagnostics-toggle'));
    fireEvent.click(
      screen.getByRole('button', { name: '로컬 인쇄 미리보기 보기' }),
    );

    unmount();

    expect(
      countNetListeners(winAddSpy.mock.calls, winRemoveSpy.mock.calls),
    ).toBe(0);
    expect(
      countNetListeners(docAddSpy.mock.calls, docRemoveSpy.mock.calls),
    ).toBe(0);

    // Dispatch global events after unmount to ensure no stray handlers or React warnings fire
    expect(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
      setDocumentVisibility('hidden');
      document.dispatchEvent(new Event('visibilitychange'));
      setDocumentVisibility('visible');
      document.dispatchEvent(new Event('visibilitychange'));
      window.dispatchEvent(new Event('blur'));
      window.dispatchEvent(new Event('focus'));
      window.dispatchEvent(new Event('beforeprint'));
      window.dispatchEvent(new Event('afterprint'));
    }).not.toThrow();

    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });

  it('preserves active step, cueItemId, textScale, and viewMode across local print preview toggle and native beforeprint/afterprint events', () => {
    render(
      <React.StrictMode>
        <ClassCueSheetPreview
          sourceInput={createFiveStepClassInput('print-return-class')}
        />
      </React.StrictMode>,
    );

    const root = screen.getByTestId('class-cue-sheet-root');
    const deck = screen.getByTestId('cue-sheet-focus-deck');
    const nextBtn = screen.getByTestId('cue-sheet-nav-next');
    const printPreviewBtn = screen.getByRole('button', {
      name: '로컬 인쇄 미리보기 보기',
    });

    // 1. Navigate to step #3 (index 2), set 150% text scale, and switch to expanded view
    fireEvent.click(nextBtn);
    fireEvent.click(nextBtn);
    fireEvent.click(screen.getByTestId('cue-sheet-scale-150'));
    fireEvent.click(
      screen.getByRole('button', { name: /반복·좌우 펼침 진행표/ }),
    );

    expect(root.getAttribute('data-current-step-index')).toBe('2');
    expect(root.getAttribute('data-current-cue-item-id')).toBe(
      'cue-item-id-lc-step-3-1',
    );
    expect(root.getAttribute('data-text-scale')).toBe('150');
    expect(root.getAttribute('data-print-preview')).toBe('false');

    // 2. Toggle local print preview ON
    fireEvent.click(printPreviewBtn);
    expect(root.getAttribute('data-print-preview')).toBe('true');
    expect(root.classList.contains('is-print-preview')).toBe(true);
    expect(printPreviewBtn.getAttribute('aria-pressed')).toBe('true');

    // Both panels uncollapse while in print preview mode
    expect(
      screen.getByTestId('cue-sheet-full-list-panel').getAttribute('data-collapsed'),
    ).toBe('false');
    expect(
      screen
        .getByTestId('cue-sheet-diagnostics-panel')
        .getAttribute('data-collapsed'),
    ).toBe('false');

    // 3. Dispatch native browser beforeprint and afterprint events
    window.dispatchEvent(new Event('beforeprint'));
    expect(root.getAttribute('data-current-step-index')).toBe('2');
    expect(root.getAttribute('data-current-cue-item-id')).toBe(
      'cue-item-id-lc-step-3-1',
    );

    window.dispatchEvent(new Event('afterprint'));
    expect(root.getAttribute('data-current-step-index')).toBe('2');
    expect(root.getAttribute('data-current-cue-item-id')).toBe(
      'cue-item-id-lc-step-3-1',
    );

    // 4. Toggle local print preview OFF and fire another native beforeprint/afterprint cycle
    fireEvent.click(printPreviewBtn);
    expect(root.getAttribute('data-print-preview')).toBe('false');
    expect(root.classList.contains('is-print-preview')).toBe(false);
    expect(printPreviewBtn.getAttribute('aria-pressed')).toBe('false');

    window.dispatchEvent(new Event('beforeprint'));
    window.dispatchEvent(new Event('afterprint'));

    // Verify all state is intact on return from print
    expect(root.getAttribute('data-current-step-index')).toBe('2');
    expect(root.getAttribute('data-current-cue-item-id')).toBe(
      'cue-item-id-lc-step-3-1',
    );
    expect(root.getAttribute('data-text-scale')).toBe('150');

    const expandedList = screen.getByRole('list', {
      name: '펼친 진행표 항목 목록',
    });
    const currentParentRows = expandedList.querySelectorAll(
      'li[data-is-current-parent="true"]',
    );
    expect(currentParentRows.length).toBe(1);
    expect(currentParentRows[0]?.getAttribute('data-parent-cue-item-id')).toBe(
      'cue-item-id-lc-step-3-1',
    );

    // 5. Press ArrowRight once after print return -> advances by exactly 1 step to step #4 (index 3)
    deck.focus();
    fireEvent.keyDown(deck, { key: 'ArrowRight' });
    expect(root.getAttribute('data-current-step-index')).toBe('3');
    expect(root.getAttribute('data-current-cue-item-id')).toBe(
      'cue-item-id-lc-step-4-1',
    );
    expect(
      within(screen.getByTestId('cue-sheet-current-card')).getByText(
        '사이드 레그 스트랩 시리즈',
      ),
    ).toBeTruthy();
  });

  it('preserves progression position across parent re-renders with cloned sourceInput, initialStepIndex prop changes, and view-mode switches', () => {
    const initialInput = createFiveStepClassInput('parent-rerender-class');

    const { rerender } = render(
      <React.StrictMode>
        <ClassCueSheetPreview
          sourceInput={initialInput}
          initialStepIndex={2}
        />
      </React.StrictMode>,
    );

    const root = screen.getByTestId('class-cue-sheet-root');
    expect(root.getAttribute('data-current-step-index')).toBe('2');
    expect(root.getAttribute('data-current-cue-item-id')).toBe(
      'cue-item-id-lc-step-3-1',
    );
    expect(root.getAttribute('data-selection-resolution')).toBe('initial');

    // User advances to step #4 (index 3)
    fireEvent.click(screen.getByTestId('cue-sheet-nav-next'));
    expect(root.getAttribute('data-current-step-index')).toBe('3');
    expect(root.getAttribute('data-current-cue-item-id')).toBe(
      'cue-item-id-lc-step-4-1',
    );
    expect(root.getAttribute('data-selection-resolution')).toBe('user-navigation');

    // Parent re-renders with a freshly cloned sourceInput object AND a different initialStepIndex
    const clonedInput = createFiveStepClassInput('parent-rerender-class');
    rerender(
      <React.StrictMode>
        <ClassCueSheetPreview
          sourceInput={clonedInput}
          initialStepIndex={0}
        />
      </React.StrictMode>,
    );

    // Active position stays at step #4 (index 3) and is not reset by initialStepIndex changing
    expect(root.getAttribute('data-current-step-index')).toBe('3');
    expect(root.getAttribute('data-current-cue-item-id')).toBe(
      'cue-item-id-lc-step-4-1',
    );

    // Switch between compact and expanded views and verify active step synchronization
    fireEvent.click(
      screen.getByRole('button', { name: /반복·좌우 펼침 진행표/ }),
    );
    const expandedList = screen.getByRole('list', {
      name: '펼친 진행표 항목 목록',
    });
    const activeExpandedRows = expandedList.querySelectorAll(
      'li[data-is-current-parent="true"]',
    );
    expect(activeExpandedRows.length).toBe(4); // 2 sets * 2 sides for lc-step-4

    fireEvent.click(screen.getByRole('button', { name: /기본 진행표/ }));
    const compactList = screen.getByRole('list', {
      name: '기본 진행표 항목 목록',
    });
    const compactRowBtns = within(compactList).getAllByRole('button');
    expect(compactRowBtns[3]?.getAttribute('aria-current')).toBe('step');
  });
});
