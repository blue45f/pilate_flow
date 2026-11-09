import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import {
  APPARATUS_VISUAL_GUIDE_CATALOG,
  PROP_QUICK_GUIDES,
  SPECIAL_POPULATION_CARE_PRESETS,
  TARGETED_PAIN_CARE_BLOCKS,
  buildApparatusIdeaExpandedDraft,
  getApparatusVisualGuide,
} from '../data/apparatusVisualGuideCatalog';
import { EQUIPMENT_OPTIONS } from '../data/equipmentCatalog';
import { INITIAL_EXERCISES } from '../data/pilatesCatalog';
import { ApparatusVisualGuideRibbon } from '../components/ApparatusVisualGuideRibbon';
import { ClassBinderView } from '../components/ClassBinderView';
import { ExerciseAtlasView } from '../components/ExerciseAtlasView';
import { SequenceWorkbench } from '../components/SequenceWorkbench';
import { usePilatesStore } from '../store/usePilatesStore';

afterEach(() => {
  cleanup();
});

describe('Apparatus Visual Guide Catalog & Interactive Blueprint UI', () => {
  it('provides complete anatomy pins, color-coded spring specs, body-fit tips, 5 fresh idea lenses, 3 special presets, and 3 targeted 15-min pain care blocks', () => {
    expect(APPARATUS_VISUAL_GUIDE_CATALOG).toHaveLength(5);
    expect(PROP_QUICK_GUIDES).toHaveLength(5);
    expect(SPECIAL_POPULATION_CARE_PRESETS).toHaveLength(3);
    expect(TARGETED_PAIN_CARE_BLOCKS).toHaveLength(3);

    const catalogIds = new Set(INITIAL_EXERCISES.map((ex) => ex.id));
    for (const preset of SPECIAL_POPULATION_CARE_PRESETS) {
      expect(preset.steps).toHaveLength(6);
      const totalMin = preset.steps.reduce((sum, st) => sum + st.durationMin, 0);
      expect(totalMin).toBe(50);
      for (const st of preset.steps) {
        expect(catalogIds.has(st.exerciseId)).toBe(true);
      }
    }

    for (const block of TARGETED_PAIN_CARE_BLOCKS) {
      expect(block.steps).toHaveLength(3);
      const blockMin = block.steps.reduce((sum, st) => sum + st.durationMin, 0);
      expect(blockMin).toBe(15);
      for (const st of block.steps) {
        expect(catalogIds.has(st.exerciseId)).toBe(true);
      }
    }

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

  it('switches across all 5 visual guide tabs (Anatomy, Springs, 5-Lens Remix, Special/Pain Presets, and 5 Studio Props)', () => {
    const originalState = usePilatesStore.getState();
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

    // Tab 2: Springs
    fireEvent.click(within(ribbon).getByRole('tab', { name: /스프링 컬러 장력표/ }));
    expect(within(ribbon).getByText(/Red \(강 · Heavy\)/)).toBeInTheDocument();
    expect(within(ribbon).getByText(/Blue \(중 · Medium\)/)).toBeInTheDocument();

    // Tab 3: @generate-fresh-ideas 5-lens
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

    // Tab 4: Special Population Care Presets & 15-Min Pain Blocks
    fireEvent.click(within(ribbon).getByTestId('apparatus-guide-special-tab'));
    const specialGrid = within(ribbon).getByTestId('special-population-presets-grid');
    expect(within(specialGrid).getByTestId('special-preset-prenatal-postnatal')).toBeInTheDocument();
    expect(within(specialGrid).getByTestId('special-preset-scoliosis-asymmetry')).toBeInTheDocument();
    expect(within(specialGrid).getByTestId('special-preset-senior-joint-safe')).toBeInTheDocument();

    fireEvent.click(within(specialGrid).getByTestId('apply-special-preset-prenatal-postnatal'));
    expect(within(ribbon).getByTestId('special-preset-applied-status')).toBeInTheDocument();
    expect(usePilatesStore.getState().activeSteps).toHaveLength(6);

    const painGrid = within(ribbon).getByTestId('targeted-pain-blocks-grid');
    fireEvent.click(within(painGrid).getByTestId('append-pain-block-shoulder-rotator-cuff'));
    expect(usePilatesStore.getState().activeSteps).toHaveLength(9);

    fireEvent.click(within(painGrid).getByTestId('replace-pain-block-plantar-foot-tripod'));
    expect(usePilatesStore.getState().activeSteps).toHaveLength(3);

    // Tab 5: 5 Signature Studio Props
    fireEvent.click(within(ribbon).getByTestId('apparatus-guide-props-tab'));
    const propsGrid = within(ribbon).getByTestId('prop-visual-guides-grid');
    for (const propId of ['magic-circle', 'foam-roller', 'mini-ball', 'theraband', 'bosu']) {
      expect(within(propsGrid).getByTestId(`prop-guide-${propId}`)).toBeInTheDocument();
    }

    usePilatesStore.setState(originalState, true);
  });

  it('renders the apparatus visual guide ribbon inside ExerciseAtlasView, SequenceWorkbench, and ClassBinderView', () => {
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
    expect(screen.getByTestId('apparatus-visual-guide-ribbon')).toBeInTheDocument();
    cleanup();

    render(<ClassBinderView onOpenLogModal={() => undefined} view="saved" />);
    expect(screen.getByTestId('apparatus-visual-guide-ribbon')).toBeInTheDocument();
    usePilatesStore.setState(originalState, true);
  });
});
