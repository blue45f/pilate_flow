import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ExerciseAtlasView } from '../components/ExerciseAtlasView';
import { usePilatesStore } from '../store/usePilatesStore';
import { ORIGINAL_MOVEMENTS } from '../data/originalMovements';
import { MOTION_PATTERN_REFERENCES } from '../data/motionPatternReferences';
import { SUPINE_REACH_DEFINITION } from '../data/supineReach';

const original = usePilatesStore.getState();
beforeEach(() =>
  usePilatesStore.setState(
    {
      ...original,
      exercises: ORIGINAL_MOVEMENTS,
      activeSteps: [],
      historyLogs: [],
      activeTab: 'atlas',
      exerciseBrowseScope: 'all',
    },
    true,
  ),
);
afterEach(() => {
  cleanup();
  usePilatesStore.setState(original, true);
});
const renderAtlas = () =>
  render(<ExerciseAtlasView onOpenYouTubePreview={vi.fn()} onOpenClipper={vi.fn()} />);

describe('authored motion discovery stays separate from teaching eligibility', () => {
  it('exposes every one of the 22 authored variants with original static geometry and opens the existing batch directly', () => {
    const before = usePilatesStore.getState();
    const { container } = renderAtlas();
    const inventory = container.querySelector('.ml-inventory')!;
    expect(MOTION_PATTERN_REFERENCES).toHaveLength(22);
    expect(inventory).toHaveTextContent(`${MOTION_PATTERN_REFERENCES.length}직접 제작한 도해 초안`);
    expect(inventory).toHaveTextContent('0정확히 일치하는 모션');
    expect(inventory).toHaveTextContent('0전문가 검토 완료');
    const rail = container.querySelector('.ml-pattern-rail')!;
    const variants = new Set<string>();
    const pageCount = Math.ceil(MOTION_PATTERN_REFERENCES.length / 4);
    for (let page = 0; page < pageCount; page += 1) {
      rail
        .querySelectorAll<HTMLElement>('[data-motion-variant]')
        .forEach((element) => variants.add(element.dataset.motionVariant!));
      expect(rail.querySelectorAll('svg[role="img"]')).toHaveLength(
        Math.min(4, MOTION_PATTERN_REFERENCES.length - page * 4),
      );
      if (page < pageCount - 1) fireEvent.click(screen.getByRole('button', { name: '다음 도해' }));
    }
    expect([...variants].sort()).toEqual(
      MOTION_PATTERN_REFERENCES.map((reference) => reference.variantId).sort(),
    );
    expect(screen.getByRole('button', { name: '다음 도해' })).toBeDisabled();
    for (let page = 0; page < pageCount - 1; page += 1)
      fireEvent.click(screen.getByRole('button', { name: '이전 도해' }));
    fireEvent.click(
      screen.getByRole('button', { name: '일반 의자 · 양팔 앞·위 리치 도해 초안 보기' }),
    );
    const preview = screen.getByRole('region', { name: '선택한 패턴 도해 미리보기' });
    expect(
      preview.querySelector('[data-motion-variant="chair-seated-bilateral-arm-raise-v1"]'),
    ).not.toBeNull();
    expect(preview).toHaveTextContent('일반 고정 의자');
    expect(preview).toHaveTextContent('전문가 미검토');
    expect(preview).toHaveTextContent('일시정지 · 자동 재생 없음');
    expect(within(preview).getByRole('button', { name: '한 주기 재생' })).toBeEnabled();
    const summary = within(preview).getByRole('region', {
      name: '연결 동작 설명·주의점 및 동작 추가',
    });
    expect(summary).toHaveTextContent('동작 설명·티칭 큐');
    expect(summary).toHaveTextContent('주의점·금기 사항');
    expect(within(summary).getByRole('button', { name: '노트 상세·검토 열기' })).toBeEnabled();
    expect(within(summary).getByRole('button', { name: '동작 추가' })).toBeEnabled();
    expect(usePilatesStore.getState().exercises).toBe(before.exercises);
    expect(usePilatesStore.getState().activeSteps).toBe(before.activeSteps);
    expect(usePilatesStore.getState().historyLogs).toBe(before.historyLogs);
    expect(usePilatesStore.getState().instructorStudyState).toBe(before.instructorStudyState);
  });

  it('opens the distinct supine-reach study from its original movement card without adding or approving the exercise', () => {
    const before = usePilatesStore.getState();
    const exercise = ORIGINAL_MOVEMENTS.find(
      (item) => item.id === 'original-mat-single-leg-stretch',
    )!;
    const { container } = renderAtlas();
    fireEvent.change(screen.getByRole('searchbox', { name: '동작 검색' }), {
      target: { value: exercise.nameKo },
    });
    const cards = container.querySelectorAll('article.movement-card');
    expect(cards).toHaveLength(1);
    const card = within(cards[0] as HTMLElement);
    expect(card.getByText('관련 패턴 도해 1종')).toBeInTheDocument();
    expect(cards[0].querySelector('img.pf-p06-3d-img')).toHaveAttribute(
      'src',
      '/motion-studio3d/mat-hundred-peak.png',
    );
    expect(
      card.getByRole('button', { name: `${exercise.nameKo} 상세 보기` }),
    ).toHaveAccessibleDescription(`${SUPINE_REACH_DEFINITION.title} · 3D 스튜디오 모션`);
    fireEvent.click(card.getByRole('button', { name: `${SUPINE_REACH_DEFINITION.title} 보기` }));
    const preview = screen.getByRole('region', { name: '선택한 패턴 도해 미리보기' });
    expect(preview.querySelector('.motion-pattern-preview')).toHaveAttribute(
      'data-motion-family',
      'supine-reach',
    );
    const figure = preview.querySelector('svg[role="img"]');
    expect(figure).toHaveAttribute('data-motion-family', 'supine-reach');
    expect(figure).toHaveAttribute('data-variant-id', SUPINE_REACH_DEFINITION.id);
    expect(figure).toHaveAttribute('data-progress', '0');
    expect(figure).not.toHaveAttribute('data-motion-draft-id');
    expect(figure).not.toHaveAttribute('data-motion-variant-id');
    expect(preview).toHaveTextContent('전문가 미검토');
    expect(preview).toHaveTextContent('일시정지 · 자동 재생 없음');
    expect(within(preview).getByRole('button', { name: '한 주기 재생' })).toBeEnabled();
    expect(card.getByRole('button', { name: `${exercise.nameKo} 수업안에 추가` })).toBeEnabled();
    expect(usePilatesStore.getState().exercises).toBe(before.exercises);
    expect(usePilatesStore.getState().activeSteps).toBe(before.activeSteps);
    expect(usePilatesStore.getState().historyLogs).toBe(before.historyLogs);
    expect(usePilatesStore.getState().instructorStudyState).toBe(before.instructorStudyState);
  });

  it('combines orthographic search and the related-pattern filter, with direct access to both quadruped variants', () => {
    const { container } = renderAtlas();
    fireEvent.click(screen.getByRole('button', { name: '필터' }));
    fireEvent.change(screen.getByRole('combobox', { name: '모션 제작 초안' }), {
      target: { value: 'proposal' },
    });
    expect(container.querySelectorAll('article.movement-card')).toHaveLength(12);
    expect(container.querySelector('.library-load-more')).toHaveTextContent('12 / 21개 동작 노트');
    fireEvent.change(screen.getByRole('searchbox', { name: '동작 검색' }), {
      target: { value: '네발기기팔다리리치' },
    });
    const cards = container.querySelectorAll('article.movement-card');
    expect(cards).toHaveLength(1);
    const card = within(cards[0] as HTMLElement);
    expect(card.getByText('관련 패턴 도해 2종')).toBeInTheDocument();
    fireEvent.click(card.getByRole('button', { name: '네발기기 한 팔 슬라이드 보기' }));
    expect(
      container.querySelector('.ml-direct-preview [data-motion-variant="quadruped-arm-slide"]'),
    ).not.toBeNull();
    fireEvent.click(card.getByRole('button', { name: '네발기기 한 다리 슬라이드 보기' }));
    expect(
      container.querySelector('.ml-direct-preview [data-motion-variant="quadruped-leg-slide"]'),
    ).not.toBeNull();
    expect(card.getByRole('button', { name: '네발기기 팔·다리 리치 수업안에 추가' })).toBeEnabled();
    fireEvent.change(screen.getByRole('combobox', { name: '모션 제작 초안' }), {
      target: { value: 'none' },
    });
    expect(container.querySelectorAll('article.movement-card')).toHaveLength(0);
    fireEvent.click(screen.getByRole('button', { name: '전체 동작 보기' }));
    expect(container.querySelectorAll('article.movement-card')).toHaveLength(12);
  });

  it('opens the authored 5-phase kinematic diagram from a studio thumbnail without pattern drafts and returns to the existing class draft', () => {
    const before = usePilatesStore.getState();
    const { container } = renderAtlas();
    fireEvent.change(screen.getByRole('searchbox', { name: '동작 검색' }), {
      target: { value: '누워서 호흡 관찰' },
    });
    const cards = container.querySelectorAll('article.movement-card');
    expect(cards).toHaveLength(1);
    expect(cards[0].querySelector('img.pf-p06-3d-img')).toHaveAttribute(
      'src',
      '/motion-studio3d/mat-hundred-peak.png',
    );
    expect(
      within(cards[0] as HTMLElement).getByRole('button', { name: '누워서 호흡 관찰 상세 보기' }),
    ).toHaveAccessibleDescription('누워서 호흡 관찰 · 3D 스튜디오 모션');
    expect(cards[0]).toHaveTextContent('기구학 연속·3단계 도해 1종');
    expect(cards[0].querySelector('.movement-art')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: '누워서 호흡 관찰 기구학 도해 보기' }));
    const preview = screen.getByTestId('catalog-motion-interactive-player');
    expect(preview).toHaveAttribute('data-exercise-id', 'original-mat-rib-breath');
    expect(preview).toHaveAttribute('data-motion-family', 'catalog-kinematic');
    expect(preview).toHaveAttribute('data-professional-review', 'unreviewed');
    expect(preview).toHaveTextContent('단계 1 / 5');
    expect(preview).toHaveTextContent('일시정지 · 자동 재생 없음');
    expect(preview.querySelector('svg[role="img"]')).toHaveAttribute('data-apparatus', 'mat');
    expect(usePilatesStore.getState().exercises).toBe(before.exercises);
    expect(usePilatesStore.getState().activeSteps).toBe(before.activeSteps);
    expect(usePilatesStore.getState().instructorStudyState).toBe(before.instructorStudyState);
    const selection = container.querySelector('.ml-selection-return')!;
    expect(selection).toHaveTextContent('0개현재 수업안에 담긴 동작');
    fireEvent.click(screen.getByRole('button', { name: '수업 구성으로 돌아가기' }));
    expect(usePilatesStore.getState().activeTab).toBe('workbench');
    expect(usePilatesStore.getState().activeSteps).toHaveLength(0);
  });
});
