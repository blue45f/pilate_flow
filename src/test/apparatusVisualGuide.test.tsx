import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import {
  APPARATUS_VISUAL_GUIDE_CATALOG,
  PROP_QUICK_GUIDES,
  buildApparatusIdeaExpandedDraft,
  getApparatusVisualGuide,
} from '../data/apparatusVisualGuideCatalog';
import { EQUIPMENT_OPTIONS } from '../data/equipmentCatalog';
import { ApparatusVisualGuideRibbon } from '../components/ApparatusVisualGuideRibbon';
import { ExerciseAtlasView } from '../components/ExerciseAtlasView';
import { SequenceWorkbench } from '../components/SequenceWorkbench';
import { usePilatesStore } from '../store/usePilatesStore';

afterEach(() => {
  cleanup();
});

describe('Apparatus Visual Guide Catalog & Interactive Blueprint UI', () => {
  it('provides complete anatomy pins, color-coded spring specs, body-fit tips, and 5 fresh idea lenses with Mode B scripts for every apparatus', () => {
    expect(APPARATUS_VISUAL_GUIDE_CATALOG).toHaveLength(5);
    expect(PROP_QUICK_GUIDES.length).toBeGreaterThanOrEqual(5);

    for (const eq of EQUIPMENT_OPTIONS) {
      const guide = getApparatusVisualGuide(eq.id);
      expect(guide.nameKo.length).toBeGreaterThan(0);
      expect(guide.oneLineSummaryKo.length).toBeGreaterThan(10);
      expect(guide.anatomyParts).toHaveLength(4);
      expect(guide.anatomyParts.map((p) => p.pinNumber)).toEqual([1, 2, 3, 4]);
      expect(guide.springSpecs.length).toBeGreaterThanOrEqual(3);
      expect(guide.bodyFitTips).toHaveLength(3);
      expect(guide.freshIdeas).toHaveLength(5);
      expect(guide.freshIdeas.map((idea) => idea.lensId)).toEqual([
        'contrarian',
        'story',
        'evidence',
        'playbook',
        'missed',
      ]);
      for (const idea of guide.freshIdeas) {
        const draft = buildApparatusIdeaExpandedDraft(guide, idea);
        expect(draft.openingScriptKo.length).toBeGreaterThan(20);
        expect(draft.memberNoticeKo.length).toBeGreaterThan(20);
        expect(draft.coachingChecklistKo).toHaveLength(3);
      }
    }
  });

  it('switches between apparatus anatomy pins, spring matrix, and @generate-fresh-ideas 5-lens tabs with all 5 expanded Mode B scripts', () => {
    let appliedConcept: { title: string; subtitle: string; family: string } | null = null;
    render(
      <ApparatusVisualGuideRibbon
        activeApparatusId="reformer"
        mode="atlas"
        onApplyClassConcept={(title, subtitle, family) => {
          appliedConcept = { title, subtitle, family };
        }}
      />,
    );

    const ribbon = screen.getByTestId('apparatus-visual-guide-ribbon');
    expect(ribbon).toHaveAttribute('data-active-apparatus', 'reformer');
    expect(within(ribbon).getAllByText(/풋바 \(Footbar\)/).length).toBeGreaterThanOrEqual(2);

    // Switch to Springs tab
    fireEvent.click(within(ribbon).getByRole('tab', { name: /스프링 컬러 장력표/ }));
    expect(within(ribbon).getByText(/Red \(강 · Heavy\)/)).toBeInTheDocument();
    expect(within(ribbon).getByText(/Blue \(중 · Medium\)/)).toBeInTheDocument();

    // Switch to @generate-fresh-ideas 5-lens tab
    fireEvent.click(within(ribbon).getByTestId('apparatus-guide-ideas-tab'));
    const ideasGrid = within(ribbon).getByTestId('apparatus-fresh-ideas-grid');
    for (const lensId of ['contrarian', 'story', 'evidence', 'playbook', 'missed']) {
      expect(within(ideasGrid).getByTestId(`apparatus-idea-${lensId}`)).toBeInTheDocument();
      expect(within(ideasGrid).getByTestId(`apparatus-idea-script-${lensId}`)).toBeInTheDocument();
    }

    fireEvent.click(within(ideasGrid).getByTestId('apply-apparatus-idea-contrarian'));
    expect(appliedConcept).toEqual({
      title: '리포머 가벼운 스프링의 역설 · 심부 코어 제어',
      subtitle: '1 Blue·1 Yellow 저장력에서 흔들림 없이 캐리지 멈추기',
      family: 'reformer',
    });

    // Can toggle scripts collapsed/expanded
    fireEvent.click(within(ribbon).getByTestId('toggle-all-idea-scripts'));
    expect(within(ideasGrid).queryByTestId('apparatus-idea-script-contrarian')).toBeNull();
  });

  it('renders the apparatus visual guide ribbon inside ExerciseAtlasView and SequenceWorkbench', () => {
    render(
      <ExerciseAtlasView
        onOpenYouTubePreview={() => undefined}
        onOpenClipper={() => undefined}
      />,
    );
    expect(screen.getByTestId('apparatus-visual-guide-ribbon')).toBeInTheDocument();
    cleanup();

    const originalState = usePilatesStore.getState();
    render(
      <SequenceWorkbench
        onOpenYouTubePreview={() => undefined}
        onOpenClipper={() => undefined}
        onOpenLogModal={() => undefined}
      />,
    );
    const workbenchRibbon = screen.getByTestId('apparatus-visual-guide-ribbon');
    expect(workbenchRibbon).toBeInTheDocument();
    usePilatesStore.setState(originalState, true);
  });
});
