import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import {
  PresetSuggestionCandidatePreview,
  PresetSuggestionFixtureHarness,
} from './PresetSuggestionCandidatePreview';
import { suggestPresetCandidates } from './presetSuggestionEngine';
import {
  createCircularSeedFixture,
  PRESET_SUGGESTION_FIXTURE_PRESETS,
  SYNTHETIC_CADILLAC_25MIN_CUSTOM_REQUEST,
  SYNTHETIC_IMPOSSIBLE_TARGET_AND_REST_REQUEST,
  SYNTHETIC_REFORMER_40MIN_WITH_REST_REQUEST,
  SYNTHETIC_REFORMER_50MIN_EXACT_REQUEST,
  SYNTHETIC_UNILATERAL_IMBALANCE_SEED_REQUEST,
  SYNTHETIC_UNKNOWN_ID_AND_MALFORMED_REST_REQUEST,
} from './presetSuggestionFixtures';

describe('PresetSuggestionCandidatePreview & PresetSuggestionFixtureHarness', () => {
  it('renders sections in logical reading order: Truth Banner -> Feasibility -> Issues -> Candidates -> Steps', () => {
    render(
      <PresetSuggestionCandidatePreview
        request={SYNTHETIC_REFORMER_50MIN_EXACT_REQUEST}
      />,
    );

    const banner = screen.getByTestId('suggestion-truth-banner');
    const feasibility = screen.getByTestId('suggestion-feasibility-section');
    const issues = screen.getByTestId('suggestion-issues-section');
    const candidates = screen.getByTestId('suggestion-candidates-section');
    const steps = screen.getByTestId('suggestion-steps-section');

    expect(
      banner.compareDocumentPosition(feasibility) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      feasibility.compareDocumentPosition(issues) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      issues.compareDocumentPosition(candidates) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      candidates.compareDocumentPosition(steps) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it('explicitly displays truthfulness badges and non-AI / non-clinical editable draft disclaimer', () => {
    render(
      <PresetSuggestionCandidatePreview
        request={SYNTHETIC_REFORMER_50MIN_EXACT_REQUEST}
      />,
    );

    const banner = screen.getByTestId('suggestion-truth-banner');
    expect(banner.textContent).toContain('AI 미사용 (결정론적 규칙)');
    expect(banner.textContent).toContain('임상·해부학 검증 비주장');
    expect(banner.textContent).toContain('기존 카탈로그 ID 전용');
    expect(banner.textContent).toContain('편집 가능한 초안');

    const disclaimer = screen.getByTestId('suggestion-disclaimer-text');
    expect(disclaimer.textContent).toContain(
      'AI 생성이나 임상·해부학 검증을 거친 처방이 아니며',
    );
    expect(disclaimer.textContent).toContain(
      '기존 카탈로그의 검증 가능한 동작 ID만 규칙 기반으로 조합한 편집용 초안입니다',
    );
    expect(disclaimer.textContent).toContain(
      '동작·근거·관절 각도를 새로 만들어내지 않으며',
    );
  });

  it('switches active candidate summary and invokes onInstantiateEditableDraft with an isolated editable draft', () => {
    const result = suggestPresetCandidates(SYNTHETIC_REFORMER_40MIN_WITH_REST_REQUEST);
    expect(result.candidates.length).toBeGreaterThanOrEqual(2);

    const onInstantiate = vi.fn();
    render(
      <PresetSuggestionCandidatePreview
        result={result}
        onInstantiateEditableDraft={onInstantiate}
      />,
    );

    const firstCand = result.candidates[0];
    const secondCand = result.candidates[1];

    const firstBtn = screen.getByTestId(`select-candidate-${firstCand.candidateId}`);
    const secondBtn = screen.getByTestId(`select-candidate-${secondCand.candidateId}`);

    expect(firstBtn.getAttribute('aria-pressed')).toBe('true');
    expect(secondBtn.getAttribute('aria-pressed')).toBe('false');
    expect(screen.getByTestId('active-candidate-summary').textContent).toContain(
      firstCand.titleKo,
    );

    fireEvent.click(secondBtn);
    expect(firstBtn.getAttribute('aria-pressed')).toBe('false');
    expect(secondBtn.getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByTestId('active-candidate-summary').textContent).toContain(
      secondCand.titleKo,
    );

    const copyBtn = screen.getByTestId('instantiate-editable-draft-btn');
    fireEvent.click(copyBtn);

    expect(onInstantiate).toHaveBeenCalledTimes(1);
    const draft = onInstantiate.mock.calls[0][0];
    expect(draft.isEditableDraft).toBe(true);
    expect(draft.sourceCandidateId).toBe(secondCand.candidateId);
    expect(draft.truthBoundary.aiUsed).toBe(false);
    expect(draft.truthBoundary.catalogIdsOnly).toBe(true);
    expect(Object.isFrozen(draft.sequence)).toBe(false);
    expect(Object.isFrozen(draft.steps)).toBe(false);
    expect(Object.isFrozen(draft.conditionTemplate)).toBe(false);

    // Mutating the instantiated draft must not mutate the frozen candidate
    draft.sequence.title = '강사 커스텀 편집 제목';
    draft.steps[0].durationMin = 9;
    expect(secondCand.sequenceDraft.title).toBe(secondCand.titleKo);
  });

  it('supports keyboard navigation on diagnostic filter tabs (ArrowRight, ArrowLeft, Home, End) across all 6 tabs', () => {
    render(
      <PresetSuggestionCandidatePreview
        request={SYNTHETIC_UNILATERAL_IMBALANCE_SEED_REQUEST}
      />,
    );

    const tabAll = screen.getByTestId('suggestion-tab-all');
    const tabTarget = screen.getByTestId('suggestion-tab-target-impossibility');
    const tabUnilateral = screen.getByTestId('suggestion-tab-unilateral-timing');
    const tabRest = screen.getByTestId('suggestion-tab-rest-budget');
    const tabCycle = screen.getByTestId('suggestion-tab-cycle-and-bounds');
    const tabUnknown = screen.getByTestId('suggestion-tab-unknown-id');

    tabAll.focus();
    expect(document.activeElement).toBe(tabAll);
    expect(tabAll.getAttribute('aria-selected')).toBe('true');

    fireEvent.keyDown(tabAll, { key: 'ArrowRight' });
    expect(document.activeElement).toBe(tabTarget);
    expect(tabTarget.getAttribute('aria-selected')).toBe('true');

    fireEvent.keyDown(tabTarget, { key: 'ArrowRight' });
    expect(document.activeElement).toBe(tabUnilateral);
    expect(tabUnilateral.getAttribute('aria-selected')).toBe('true');

    fireEvent.keyDown(tabUnilateral, { key: 'ArrowRight' });
    expect(document.activeElement).toBe(tabRest);
    expect(tabRest.getAttribute('aria-selected')).toBe('true');

    fireEvent.keyDown(tabRest, { key: 'ArrowRight' });
    expect(document.activeElement).toBe(tabCycle);
    expect(tabCycle.getAttribute('aria-selected')).toBe('true');

    fireEvent.keyDown(tabCycle, { key: 'End' });
    expect(document.activeElement).toBe(tabUnknown);
    expect(tabUnknown.getAttribute('aria-selected')).toBe('true');

    fireEvent.keyDown(tabUnknown, { key: 'Home' });
    expect(document.activeElement).toBe(tabAll);
    expect(tabAll.getAttribute('aria-selected')).toBe('true');

    fireEvent.keyDown(tabAll, { key: 'ArrowLeft' });
    expect(document.activeElement).toBe(tabUnknown);
    expect(tabUnknown.getAttribute('aria-selected')).toBe('true');
  });

  it('maintains unique DOM IDs and isolates jump-to-step focus when multiple preview instances are mounted', () => {
    const { container } = render(
      <div>
        <div data-testid="instance-one">
          <PresetSuggestionCandidatePreview
            request={SYNTHETIC_UNILATERAL_IMBALANCE_SEED_REQUEST}
          />
        </div>
        <div data-testid="instance-two">
          <PresetSuggestionCandidatePreview
            request={SYNTHETIC_UNILATERAL_IMBALANCE_SEED_REQUEST}
          />
        </div>
      </div>,
    );

    const elementsWithId = Array.from(container.querySelectorAll('[id]'));
    const ids = elementsWithId.map((el) => el.id);
    expect(new Set(ids).size).toBe(ids.length);

    const firstInstance = screen.getByTestId('instance-one');
    const secondInstance = screen.getByTestId('instance-two');

    const jumpBtnInSecond = within(secondInstance).getAllByTestId(
      'jump-to-step-seed-uni-2-together-mismatch',
    )[0];
    fireEvent.click(jumpBtnInSecond);

    const stepInFirst = within(firstInstance).getByTestId(
      'suggestion-step-seed-uni-2-together-mismatch',
    );
    const stepInSecond = within(secondInstance).getByTestId(
      'suggestion-step-seed-uni-2-together-mismatch',
    );

    expect(document.activeElement).toBe(stepInSecond);
    expect(stepInSecond.className).toContain('psc-step-card--highlighted');
    expect(stepInFirst.className).not.toContain('psc-step-card--highlighted');
  });

  it('honors prefers-reduced-motion: reduce on jump-to-step and clears stale step highlight when request changes', () => {
    const originalMatchMedia = window.matchMedia;
    const matchMediaMock = vi.fn().mockImplementation((query: string) => ({
      matches: query === '(prefers-reduced-motion: reduce)',
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
    window.matchMedia = matchMediaMock;

    try {
      const { rerender } = render(
        <PresetSuggestionCandidatePreview
          request={SYNTHETIC_UNILATERAL_IMBALANCE_SEED_REQUEST}
        />,
      );

      const targetStep = screen.getByTestId(
        'suggestion-step-seed-uni-3-split-left-only',
      );
      const scrollSpy = vi.fn();
      targetStep.scrollIntoView = scrollSpy;

      const jumpBtn = screen.getAllByTestId(
        'jump-to-step-seed-uni-3-split-left-only',
      )[0];
      fireEvent.click(jumpBtn);

      expect(scrollSpy).toHaveBeenCalledWith({
        block: 'nearest',
        behavior: 'auto',
      });
      expect(targetStep.className).toContain('psc-step-card--highlighted');

      // Rerendering with a different request clears the highlight state
      rerender(
        <PresetSuggestionCandidatePreview
          request={SYNTHETIC_CADILLAC_25MIN_CUSTOM_REQUEST}
        />,
      );

      const highlightedCards = document.querySelectorAll('.psc-step-card--highlighted');
      expect(highlightedCards.length).toBe(0);
    } finally {
      window.matchMedia = originalMatchMedia;
    }
  });

  it('renders blocked diagnostic states cleanly and switches all 6 presets in PresetSuggestionFixtureHarness', () => {
    const { unmount: unmountUnilateral } = render(
      <PresetSuggestionCandidatePreview
        request={{
          apparatus: 'reformer',
          theme: 'lower-glute-balance',
          targetMinutes: 30,
          level: '1.5',
          seedPlan: {
            steps: [
              {
                stepId: 'seed-uni-together-mismatch',
                kind: 'exercise',
                exerciseId: 'ex-lower-01',
                blockCategory: 'lower-body',
                durationMin: 6,
                explanationSec: 20,
                transitionSec: 15,
                sideMode: 'together',
              },
              {
                stepId: 'seed-uni-split-left-only',
                kind: 'exercise',
                exerciseId: 'ex-lower-02',
                blockCategory: 'lower-body',
                durationMin: 5,
                explanationSec: 20,
                transitionSec: 15,
                sideMode: 'left',
              },
            ],
          },
        }}
      />,
    );
    expect(screen.getByTestId('suggestion-status-badge').textContent).toContain(
      '추천 보류',
    );
    expect(
      screen.getByTestId('suggestion-issue-unilateral-together-mismatch'),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId('suggestion-issue-unilateral-split-imbalance'),
    ).toBeInTheDocument();
    unmountUnilateral();

    const { unmount: unmountImpossible } = render(
      <PresetSuggestionCandidatePreview
        request={SYNTHETIC_IMPOSSIBLE_TARGET_AND_REST_REQUEST}
      />,
    );
    expect(
      screen.getAllByTestId('suggestion-issue-rest-exceeds-or-equals-target').length,
    ).toBeGreaterThanOrEqual(1);
    expect(
      screen.getAllByTestId('suggestion-issue-locked-steps-exceed-target').length,
    ).toBeGreaterThanOrEqual(1);
    expect(
      screen.getByTestId('suggestion-empty-candidates-message'),
    ).toBeInTheDocument();
    unmountImpossible();

    const { unmount: unmountUnknown } = render(
      <PresetSuggestionCandidatePreview
        request={SYNTHETIC_UNKNOWN_ID_AND_MALFORMED_REST_REQUEST}
      />,
    );
    expect(
      screen.getAllByTestId('suggestion-issue-unknown-exercise-id').length,
    ).toBeGreaterThanOrEqual(1);
    expect(
      screen.getByTestId('suggestion-issue-rest-step-malformed'),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId('suggestion-issue-rest-duration-invalid'),
    ).toBeInTheDocument();
    unmountUnknown();

    const { unmount: unmountCycle } = render(
      <PresetSuggestionCandidatePreview
        request={{
          apparatus: 'reformer',
          theme: 'full-body-flow',
          targetMinutes: 30,
          seedPlan: createCircularSeedFixture(),
        }}
      />,
    );
    expect(
      screen.getByTestId('suggestion-issue-nested-cycle-detected'),
    ).toBeInTheDocument();
    unmountCycle();

    render(<PresetSuggestionFixtureHarness />);
    for (const preset of PRESET_SUGGESTION_FIXTURE_PRESETS) {
      const btn = screen.getByTestId(`fixture-preset-${preset.id}`);
      fireEvent.click(btn);
      expect(btn.getAttribute('aria-pressed')).toBe('true');
      expect(screen.getByTestId('fixture-preset-description').textContent).toBe(
        preset.descriptionKo,
      );
    }
  });

  it('maintains narrow-viewport (320px and 390px) container structure and does not touch localStorage or sessionStorage', () => {
    const localGetSpy = vi.spyOn(Storage.prototype, 'getItem');
    const localSetSpy = vi.spyOn(Storage.prototype, 'setItem');

    try {
      for (const widthPx of [320, 390]) {
        const { container, unmount } = render(
          <div
            style={{
              width: `${widthPx}px`,
              maxWidth: `${widthPx}px`,
              overflow: 'hidden',
            }}
          >
            <PresetSuggestionCandidatePreview
              request={SYNTHETIC_REFORMER_40MIN_WITH_REST_REQUEST}
            />
          </div>,
        );

        const root = within(container).getByTestId(
          'preset-suggestion-candidate-preview',
        );
        expect(root).toHaveClass('psc-root');
        expect(root.scrollWidth).toBeLessThanOrEqual(root.clientWidth);
        unmount();
      }

      expect(localGetSpy).not.toHaveBeenCalled();
      expect(localSetSpy).not.toHaveBeenCalled();
    } finally {
      localGetSpy.mockRestore();
      localSetSpy.mockRestore();
    }
  });

  it('filters diagnostic issues when clicking category tabs and displays empty-issues message when a category has 0 issues', () => {
    render(
      <PresetSuggestionCandidatePreview
        request={SYNTHETIC_REFORMER_50MIN_EXACT_REQUEST}
        titleOverride="사용자 지정 프리뷰 제목"
        className="custom-preview-class"
      />,
    );

    const root = screen.getByTestId('preset-suggestion-candidate-preview');
    expect(root).toHaveClass('psc-root');
    expect(root).toHaveClass('custom-preview-class');
    expect(screen.getByTestId('suggestion-truth-banner').textContent).toContain(
      '사용자 지정 프리뷰 제목',
    );
    expect(screen.getByTestId('suggestion-no-issues-message')).toBeInTheDocument();

    const tabUnknown = screen.getByTestId('suggestion-tab-unknown-id');
    fireEvent.click(tabUnknown);
    expect(tabUnknown.getAttribute('aria-selected')).toBe('true');
    expect(screen.getByTestId('suggestion-no-issues-message')).toBeInTheDocument();
  });

  it('uses smooth scroll behavior when prefers-reduced-motion is not enabled and renders empty-steps state when blocked with zero seed steps', () => {
    const originalMatchMedia = window.matchMedia;
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    try {
      const { unmount } = render(
        <PresetSuggestionCandidatePreview
          request={SYNTHETIC_UNILATERAL_IMBALANCE_SEED_REQUEST}
        />,
      );

      const targetStep = screen.getByTestId('suggestion-step-seed-uni-3-split-left-only');
      const scrollSpy = vi.fn();
      targetStep.scrollIntoView = scrollSpy;

      const jumpBtn = screen.getAllByTestId('jump-to-step-seed-uni-3-split-left-only')[0];
      fireEvent.click(jumpBtn);

      expect(scrollSpy).toHaveBeenCalledWith({
        block: 'nearest',
        behavior: 'smooth',
      });
      unmount();

      render(
        <PresetSuggestionCandidatePreview
          request={{
            apparatus: 'reformer',
            theme: 'full-body-flow',
            targetMinutes: 5, // out of bounds (< 10m), no seed steps
          }}
        />,
      );
      expect(screen.getByTestId('suggestion-no-steps-message')).toBeInTheDocument();
    } finally {
      window.matchMedia = originalMatchMedia;
    }
  });
});
