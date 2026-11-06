import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { ClassCueSheetPreview } from './ClassCueSheetPreview';
import type { CueSheetFlexibleClassInput } from './classCueSheetTypes';

afterEach(() => {
  cleanup();
});

describe('ClassCueSheetPreview novice-instructor usability & live-edit regressions', () => {
  it('mounts with mobile-first novice defaults: Current/Next cards and Prev/Next controls immediately visible while full list and technical diagnostics start collapsed', () => {
    render(<ClassCueSheetPreview />);

    const root = screen.getByTestId('class-cue-sheet-root');
    expect(root.getAttribute('data-full-list-open')).toBe('false');
    expect(root.getAttribute('data-diagnostics-open')).toBe('false');
    expect(root.getAttribute('data-text-scale')).toBe('100');
    expect(root.getAttribute('data-reduced-motion')).toBe('respected');
    expect(root.getAttribute('data-mandatory-review-gate')).toBe('false');

    const header = screen.getByTestId('cue-sheet-compact-header');
    const deck = screen.getByTestId('cue-sheet-focus-deck');
    const currentCard = screen.getByTestId('cue-sheet-current-card');
    const nextCard = screen.getByTestId('cue-sheet-next-card');
    const prevBtn = screen.getByTestId('cue-sheet-nav-prev');
    const nextBtn = screen.getByTestId('cue-sheet-nav-next');

    expect(header).toBeTruthy();
    expect(deck).toBeTruthy();
    expect(currentCard).toBeTruthy();
    expect(nextCard).toBeTruthy();
    expect(prevBtn).toBeTruthy();
    expect(nextBtn).toBeTruthy();

    const fullListToggle = screen.getByTestId('cue-sheet-full-list-toggle');
    const fullListPanel = screen.getByTestId('cue-sheet-full-list-panel');
    expect(fullListToggle.getAttribute('aria-expanded')).toBe('false');
    expect(fullListPanel.classList.contains('is-collapsed-screen')).toBe(true);

    const diagnosticsToggle = screen.getByTestId('cue-sheet-diagnostics-toggle');
    const diagnosticsPanel = screen.getByTestId('cue-sheet-diagnostics-panel');
    expect(diagnosticsToggle.getAttribute('aria-expanded')).toBe('false');
    expect(diagnosticsPanel.classList.contains('is-collapsed-screen')).toBe(true);
  });

  it('maintains top-to-bottom DOM reading order: compact header -> focus deck (Current before Next) -> progression section -> diagnostics section', () => {
    render(<ClassCueSheetPreview />);

    const header = screen.getByTestId('cue-sheet-compact-header');
    const deck = screen.getByTestId('cue-sheet-focus-deck');
    const currentCard = screen.getByTestId('cue-sheet-current-card');
    const nextCard = screen.getByTestId('cue-sheet-next-card');
    const progressionSection = screen.getByTestId('cue-sheet-progression-section');
    const diagnosticsSection = screen.getByTestId('cue-sheet-diagnostics-section');

    expect(
      Boolean(header.compareDocumentPosition(deck) & Node.DOCUMENT_POSITION_FOLLOWING),
    ).toBe(true);
    expect(
      Boolean(
        currentCard.compareDocumentPosition(nextCard) & Node.DOCUMENT_POSITION_FOLLOWING,
      ),
    ).toBe(true);
    expect(
      Boolean(
        deck.compareDocumentPosition(progressionSection) &
          Node.DOCUMENT_POSITION_FOLLOWING,
      ),
    ).toBe(true);
    expect(
      Boolean(
        progressionSection.compareDocumentPosition(diagnosticsSection) &
          Node.DOCUMENT_POSITION_FOLLOWING,
      ),
    ).toBe(true);
  });

  it('expands and collapses the full progression list and technical diagnostics disclosures cleanly', () => {
    render(<ClassCueSheetPreview />);

    const root = screen.getByTestId('class-cue-sheet-root');
    const fullListToggle = screen.getByTestId('cue-sheet-full-list-toggle');
    const fullListPanel = screen.getByTestId('cue-sheet-full-list-panel');
    const diagnosticsToggle = screen.getByTestId('cue-sheet-diagnostics-toggle');
    const diagnosticsPanel = screen.getByTestId('cue-sheet-diagnostics-panel');

    // Expand full list
    fireEvent.click(fullListToggle);
    expect(fullListToggle.getAttribute('aria-expanded')).toBe('true');
    expect(root.getAttribute('data-full-list-open')).toBe('true');
    expect(fullListPanel.classList.contains('is-collapsed-screen')).toBe(false);

    // Collapse full list
    fireEvent.click(fullListToggle);
    expect(fullListToggle.getAttribute('aria-expanded')).toBe('false');
    expect(root.getAttribute('data-full-list-open')).toBe('false');
    expect(fullListPanel.classList.contains('is-collapsed-screen')).toBe(true);

    // Clicking '반복·좌우 펼침 진행표' while collapsed automatically opens the full list in expanded mode
    const expandedViewBtn = screen.getByRole('button', {
      name: /반복·좌우 펼침 진행표/,
    });
    fireEvent.click(expandedViewBtn);
    expect(root.getAttribute('data-full-list-open')).toBe('true');
    expect(fullListToggle.getAttribute('aria-expanded')).toBe('true');
    expect(screen.getByRole('list', { name: '펼친 진행표 항목 목록' })).toBeTruthy();

    // Expand and collapse diagnostics panel
    fireEvent.click(diagnosticsToggle);
    expect(diagnosticsToggle.getAttribute('aria-expanded')).toBe('true');
    expect(root.getAttribute('data-diagnostics-open')).toBe('true');
    expect(diagnosticsPanel.classList.contains('is-collapsed-screen')).toBe(false);

    fireEvent.click(diagnosticsToggle);
    expect(diagnosticsToggle.getAttribute('aria-expanded')).toBe('false');
    expect(root.getAttribute('data-diagnostics-open')).toBe('false');
    expect(diagnosticsPanel.classList.contains('is-collapsed-screen')).toBe(true);
  });

  it('supports configurable text scale (100% / 125% / 150% / 200%), respects reduced motion, and enforces zero mandatory review gates', () => {
    render(<ClassCueSheetPreview initialFixtureId="name-only-drafts" />);

    const root = screen.getByTestId('class-cue-sheet-root');
    const scale100 = screen.getByTestId('cue-sheet-scale-100');
    const scale125 = screen.getByTestId('cue-sheet-scale-125');
    const scale150 = screen.getByTestId('cue-sheet-scale-150');
    const scale200 = screen.getByTestId('cue-sheet-scale-200');

    expect(root.getAttribute('data-text-scale')).toBe('100');
    expect(scale100.getAttribute('aria-pressed')).toBe('true');
    expect(root.style.getPropertyValue('--cue-sheet-font-scale')).toBe('1');

    fireEvent.click(scale125);
    expect(root.getAttribute('data-text-scale')).toBe('125');
    expect(scale125.getAttribute('aria-pressed')).toBe('true');
    expect(scale100.getAttribute('aria-pressed')).toBe('false');
    expect(root.style.getPropertyValue('--cue-sheet-font-scale')).toBe('1.25');

    fireEvent.click(scale150);
    expect(root.getAttribute('data-text-scale')).toBe('150');
    expect(scale150.getAttribute('aria-pressed')).toBe('true');
    expect(root.style.getPropertyValue('--cue-sheet-font-scale')).toBe('1.5');

    fireEvent.click(scale200);
    expect(root.getAttribute('data-text-scale')).toBe('200');
    expect(scale200.getAttribute('aria-pressed')).toBe('true');
    expect(root.style.getPropertyValue('--cue-sheet-font-scale')).toBe('2');

    fireEvent.click(scale100);
    expect(root.getAttribute('data-text-scale')).toBe('100');
    expect(scale100.getAttribute('aria-pressed')).toBe('true');
    expect(root.style.getPropertyValue('--cue-sheet-font-scale')).toBe('1');

    // No mandatory review gate badge is present and name-only / unspecified-time steps navigate freely
    expect(screen.getByTestId('no-mandatory-gate-badge').textContent).toContain(
      '필수 검토 게이트 없음',
    );
    expect(root.getAttribute('data-mandatory-review-gate')).toBe('false');

    const nextBtn = screen.getByTestId('cue-sheet-nav-next');
    expect(root.getAttribute('data-current-step-index')).toBe('0');
    fireEvent.click(nextBtn);
    expect(root.getAttribute('data-current-step-index')).toBe('1');
    fireEvent.click(nextBtn);
    expect(root.getAttribute('data-current-step-index')).toBe('2');
  });

  it('renders clear empty state guidance when a class has 0 steps and disables step navigation', () => {
    render(<ClassCueSheetPreview initialFixtureId="empty-class" />);

    const root = screen.getByTestId('class-cue-sheet-root');
    expect(root.getAttribute('data-selection-resolution')).toBe('empty-class');
    expect(root.getAttribute('data-current-step-index')).toBe('-1');

    const emptyState = screen.getByTestId('cue-sheet-empty-state');
    expect(emptyState.textContent).toContain('수업 진행 항목이 비어 있습니다 (0개 항목)');
    expect(screen.getByTestId('cue-sheet-current-card').textContent).toContain(
      '등록된 수업 진행 항목이 없습니다',
    );

    expect((screen.getByTestId('cue-sheet-nav-prev') as HTMLButtonElement).disabled).toBe(
      true,
    );
    expect((screen.getByTestId('cue-sheet-nav-next') as HTMLButtonElement).disabled).toBe(
      true,
    );
    expect((screen.getByTestId('cue-sheet-nav-first') as HTMLButtonElement).disabled).toBe(
      true,
    );
    expect((screen.getByTestId('cue-sheet-nav-last') as HTMLButtonElement).disabled).toBe(
      true,
    );
  });

  it('renders long Korean cues without truncation and supports full keyboard navigation while keeping focus inside the root', () => {
    render(
      <ClassCueSheetPreview initialFixtureId="long-korean-cues-empty-cues-duplicates" />,
    );

    const root = screen.getByTestId('class-cue-sheet-root');
    const deck = screen.getByTestId('cue-sheet-focus-deck');
    const currentCard = screen.getByTestId('cue-sheet-current-card');

    expect(currentCard.textContent).toContain('[장문큐-시작-01]');
    expect(currentCard.textContent).toContain('[장문큐-끝-01]');

    deck.focus();
    expect(root.contains(document.activeElement)).toBe(true);

    // ArrowRight -> index 1 (empty cue step)
    fireEvent.keyDown(deck, { key: 'ArrowRight' });
    expect(root.getAttribute('data-current-step-index')).toBe('1');
    expect(within(currentCard).getByText(/작성된 큐 메모 없음/)).toBeTruthy();

    // ArrowDown -> index 2 (long cue #03)
    fireEvent.keyDown(deck, { key: 'ArrowDown' });
    expect(root.getAttribute('data-current-step-index')).toBe('2');
    expect(currentCard.textContent).toContain('[장문큐-시작-03]');
    expect(currentCard.textContent).toContain('[장문큐-끝-03]');

    // j / n -> index 3, 4
    fireEvent.keyDown(deck, { key: 'j' });
    expect(root.getAttribute('data-current-step-index')).toBe('3');
    fireEvent.keyDown(deck, { key: 'n' });
    expect(root.getAttribute('data-current-step-index')).toBe('4');

    // k / p / ArrowUp / ArrowLeft -> index 3, 2, 1, 0
    fireEvent.keyDown(deck, { key: 'k' });
    expect(root.getAttribute('data-current-step-index')).toBe('3');
    fireEvent.keyDown(deck, { key: 'p' });
    expect(root.getAttribute('data-current-step-index')).toBe('2');
    fireEvent.keyDown(deck, { key: 'ArrowUp' });
    expect(root.getAttribute('data-current-step-index')).toBe('1');
    fireEvent.keyDown(deck, { key: 'ArrowLeft' });
    expect(root.getAttribute('data-current-step-index')).toBe('0');

    // End / Home
    fireEvent.keyDown(deck, { key: 'End' });
    expect(root.getAttribute('data-current-step-index')).toBe('5');
    fireEvent.keyDown(deck, { key: 'Home' });
    expect(root.getAttribute('data-current-step-index')).toBe('0');

    // Boundary button click transfers focus to deck rather than losing focus to body
    const lastBtn = screen.getByTestId('cue-sheet-nav-last');
    lastBtn.focus();
    fireEvent.click(lastBtn);
    expect(root.getAttribute('data-current-step-index')).toBe('5');
    expect(root.contains(document.activeElement)).toBe(true);
    expect(document.activeElement).not.toBe(document.body);
  });

  it('preserves active item by ID on insert/delete/reorder, falls back to adjacent item on current-item delete, and resets on class replacement', () => {
    const stepA = { stepId: 'step-a', nameKo: '첫 번째 호흡 정렬', durationMin: 4 };
    const stepB = { stepId: 'step-b', nameKo: '두 번째 풋워크', durationMin: 6 };
    const stepC = { stepId: 'step-c', nameKo: '세 번째 헌드레드', durationMin: 5 };
    const stepD = { stepId: 'step-d', nameKo: '네 번째 머메이드', durationMin: 4 };

    const makeClass = (
      id: string,
      steps: Array<{ stepId: string; nameKo: string; durationMin: number }>,
    ): CueSheetFlexibleClassInput => ({
      id,
      title: '실시간 편집 회귀 검증',
      steps,
    });

    const { rerender } = render(
      <ClassCueSheetPreview sourceInput={makeClass('class-1', [stepA, stepB, stepC, stepD])} />,
    );

    const root = screen.getByTestId('class-cue-sheet-root');
    const nextBtn = screen.getByTestId('cue-sheet-nav-next');

    // Navigate to stepC (index 2)
    fireEvent.click(nextBtn);
    fireEvent.click(nextBtn);
    expect(root.getAttribute('data-current-step-index')).toBe('2');
    expect(screen.getByTestId('cue-sheet-current-card').textContent).toContain(
      '세 번째 헌드레드',
    );
    const stepCCueItemId = root.getAttribute('data-current-cue-item-id');
    expect(stepCCueItemId).toBeTruthy();

    // 1. Insert before current -> preserved-by-id at index 3
    const stepPre = { stepId: 'step-pre', nameKo: '사전 추가 동작', durationMin: 3 };
    rerender(
      <ClassCueSheetPreview
        sourceInput={makeClass('class-1', [stepPre, stepA, stepB, stepC, stepD])}
      />,
    );
    expect(root.getAttribute('data-selection-resolution')).toBe('preserved-by-id');
    expect(root.getAttribute('data-current-step-index')).toBe('3');
    expect(root.getAttribute('data-current-cue-item-id')).toBe(stepCCueItemId);

    // 2. Delete before current -> preserved-by-id at index 1
    rerender(
      <ClassCueSheetPreview sourceInput={makeClass('class-1', [stepB, stepC, stepD])} />,
    );
    expect(root.getAttribute('data-selection-resolution')).toBe('preserved-by-id');
    expect(root.getAttribute('data-current-step-index')).toBe('1');
    expect(root.getAttribute('data-current-cue-item-id')).toBe(stepCCueItemId);

    // 3. Reorder stepC to end -> preserved-by-id at index 2
    rerender(
      <ClassCueSheetPreview sourceInput={makeClass('class-1', [stepB, stepD, stepC])} />,
    );
    expect(root.getAttribute('data-selection-resolution')).toBe('preserved-by-id');
    expect(root.getAttribute('data-current-step-index')).toBe('2');
    expect(root.getAttribute('data-current-cue-item-id')).toBe(stepCCueItemId);

    // 4. Delete current item (stepC) -> fallback-adjacent-after-delete with fallback notice
    rerender(
      <ClassCueSheetPreview sourceInput={makeClass('class-1', [stepB, stepD])} />,
    );
    expect(root.getAttribute('data-selection-resolution')).toBe(
      'fallback-adjacent-after-delete',
    );
    expect(root.getAttribute('data-current-step-index')).toBe('1');
    expect(screen.getByTestId('cue-sheet-selection-fallback-notice').textContent).toContain(
      '세 번째 헌드레드',
    );
    expect(screen.getByTestId('cue-sheet-current-card').textContent).toContain(
      '네 번째 머메이드',
    );

    // 5. Replace with a different class -> reset-on-class-change to index 0
    rerender(
      <ClassCueSheetPreview
        sourceInput={makeClass('class-2-replacement', [
          { stepId: 'new-1', nameKo: '교체된 첫 동작', durationMin: 5 },
          { stepId: 'new-2', nameKo: '교체된 두 번째 동작', durationMin: 5 },
        ])}
      />,
    );
    expect(root.getAttribute('data-selection-resolution')).toBe('reset-on-class-change');
    expect(root.getAttribute('data-current-step-index')).toBe('0');
    expect(screen.getByTestId('cue-sheet-current-card').textContent).toContain(
      '교체된 첫 동작',
    );
  });
});
