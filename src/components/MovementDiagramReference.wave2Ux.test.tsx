import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { INITIAL_EXERCISES } from '../data/pilatesCatalog';
import { resolveSpineArticulationDiagramByExerciseId } from '../data/spineArticulationDiagramData';
import { MovementDiagramReference } from './MovementDiagramReference';
import { PostureAnatomyGuide } from './PostureAnatomyGuide';

const postureAnatomyCss = readFileSync(
  resolve(__dirname, '../styles/posture-anatomy-guide.css'),
  'utf-8',
);

afterEach(cleanup);

function openReferenceDisclosure(container: HTMLElement) {
  const outerDetails = container.querySelector(
    'details.movement-diagram-reference',
  ) as HTMLDetailsElement;
  outerDetails.open = true;
  fireEvent(outerDetails, new Event('toggle'));
  return outerDetails;
}

describe('Wave 2-2 MovementDiagramReference nested details scroll relief & PostureAnatomyGuide UX', () => {
  it('collapses all expanded nested <details> sections when clicking 열린 참고 섹션 모두 접기 while preserving safety notices and focusing the reference section', () => {
    // Use the actual seated roll-back spine track; standing roll-down has a separate rig.
    const exercise = INITIAL_EXERCISES.find(
      (item) => item.id === 'original-cadillac-seated-roll-back',
    )!;
    expect(exercise).toBeDefined();
    expect(resolveSpineArticulationDiagramByExerciseId(exercise.id)?.archetypeId).toBe(
      'spine-roll-down',
    );

    const { container } = render(<MovementDiagramReference exercise={exercise} />);
    const outerDetails = openReferenceDisclosure(container);
    const referenceSection = screen.getByRole('region', { name: '참고 자세 정지 그림' });

    const scrollSpy = vi.fn();
    referenceSection.scrollIntoView = scrollSpy;

    const correctionDetails = within(referenceSection)
      .getByText('출처 대조 기록')
      .closest('details') as HTMLDetailsElement;
    const visualGuideDetails = container.querySelector(
      'details.movement-diagram-visual-guide-disclosure',
    ) as HTMLDetailsElement;
    const spineDetails = screen.getByTestId(
      'movement-diagram-spine-disclosure',
    ) as HTMLDetailsElement;
    const verificationDetails = screen.getByTestId(
      'movement-diagram-extended-verification-disclosure',
    ) as HTMLDetailsElement;

    for (const detailsEl of [
      correctionDetails,
      visualGuideDetails,
      spineDetails,
      verificationDetails,
    ]) {
      detailsEl.open = true;
      fireEvent(detailsEl, new Event('toggle'));
      expect(detailsEl.open).toBe(true);
    }

    expect(screen.getByTestId('movement-visual-guide-card')).toBeInTheDocument();
    expect(screen.getByTestId('spine-articulation-diagram-reference')).toBeInTheDocument();

    const collapseAllBtn = screen.getByTestId('diagram-ref-collapse-all-btn');
    expect(collapseAllBtn).toHaveTextContent('열린 참고 섹션 모두 접기');
    expect(collapseAllBtn.style.minHeight).toBe('44px');
    expect(collapseAllBtn.style.wordBreak).toBe('keep-all');
    expect(screen.getByRole('button', { name: '열린 참고 섹션 모두 접기' })).toBe(collapseAllBtn);

    fireEvent.click(collapseAllBtn);

    for (const detailsEl of [
      correctionDetails,
      visualGuideDetails,
      spineDetails,
      verificationDetails,
    ]) {
      expect(detailsEl.open).toBe(false);
      expect(detailsEl).not.toHaveAttribute('open');
    }

    expect(screen.queryByTestId('movement-visual-guide-card')).not.toBeInTheDocument();
    expect(screen.queryByTestId('spine-articulation-diagram-reference')).not.toBeInTheDocument();

    // Outer disclosure remains open and all safety disclaimers stay visible
    expect(outerDetails.open).toBe(true);
    expect(
      screen.getByText(/직접 작성한 정지 그림 한 장이에요\. 실제 단계별 프레임이 검증되지 않아/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /기준 그림: 오른쪽 · 화면 반전 없음\. 수업안의 좌우 설정과 연결되지 않아요\./,
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /해부학적 정확성과 운동 안전성은 검증되지 않았어요\. 실제 운동 시범이나 3D 모델이 아닌 참고 자료예요\./,
      ),
    ).toBeInTheDocument();

    expect(scrollSpy).toHaveBeenCalledWith({ behavior: 'smooth', block: 'start' });
    expect(document.activeElement).toBe(referenceSection);
  });

  it('collapses fallback disclosure for custom unmapped exercises while keeping unmapped notice visible', () => {
    const customExercise = {
      ...INITIAL_EXERCISES[0],
      id: 'custom-unmapped-wave2-exercise',
      nameKo: '커스텀 미매핑 동작',
    };

    const { container } = render(<MovementDiagramReference exercise={customExercise} />);
    const outerDetails = openReferenceDisclosure(container);

    const fallbackDetails = screen.getByTestId(
      'movement-diagram-fallback-disclosure',
    ) as HTMLDetailsElement;
    fallbackDetails.open = true;
    fireEvent(fallbackDetails, new Event('toggle'));
    expect(screen.getByTestId('movement-visual-guide-card')).toBeInTheDocument();

    const collapseAllBtn = screen.getByTestId('diagram-ref-collapse-all-btn');
    fireEvent.click(collapseAllBtn);

    expect(fallbackDetails.open).toBe(false);
    expect(screen.queryByTestId('movement-visual-guide-card')).not.toBeInTheDocument();
    expect(outerDetails.open).toBe(true);
    expect(
      screen.getByText(
        '이 동작과 일치하는 도해가 아직 없어요. 다른 동작의 그림으로 대신하지 않아요.',
      ),
    ).toBeInTheDocument();
  });

  it('enforces 44px touch targets and mobile SVG legibility rules in posture-anatomy-guide.css', () => {
    const exercise = { ...INITIAL_EXERCISES[0], targetMuscles: ['햄스트링'] };
    const { container } = render(
      <>
        <style>{postureAnatomyCss}</style>
        <PostureAnatomyGuide exercise={exercise} />
      </>,
    );
    const region = screen.getByRole('region', { name: '자세·부위 한눈에' });
    expect(region).toHaveTextContent('위치 참고 그림입니다');

    const link = getComputedStyle(region.querySelector('.posture-guide-notes a')!);
    expect(link.display).toBe('inline-flex');
    expect(link.alignItems).toBe('center');
    expect(parseFloat(link.minHeight)).toBeGreaterThanOrEqual(44);
    expect(parseFloat(link.minWidth)).toBeGreaterThanOrEqual(44);
    expect(link.wordBreak).toBe('keep-all');
    expect(link.overflowWrap).toBe('anywhere');

    const map = region.querySelector('.posture-anatomy-map')!;
    const viewBoxWidth = Number(map.getAttribute('viewBox')!.split(' ')[2]);
    const labels = ['.posture-map-view', '.posture-map-number'].map((s) => map.querySelector(s)!);
    for (const label of labels)
      expect(parseFloat(getComputedStyle(label).fontSize)).toBeGreaterThanOrEqual(13);

    // jsdom has no layout engine. Apply the container rules that match the 320px dialog's 198px map.
    const mapWidth = 198;
    const stylesheet = container.querySelector('style')!.sheet!;
    const matchingRules = Array.from(stylesheet.cssRules).filter(
      (rule): rule is CSSContainerRule => {
        const query = /^@container\s+\(max-width:\s*([\d.]+)px\)/.exec(rule.cssText);
        return Boolean(query && mapWidth <= Number(query[1]));
      },
    );
    const narrowStyles = document.createElement('style');
    narrowStyles.textContent = matchingRules
      .flatMap((r) => Array.from(r.cssRules, (s) => s.cssText))
      .join('\n');
    container.append(narrowStyles);
    for (const label of labels) {
      const pixels = parseFloat(getComputedStyle(label).fontSize) * (mapWidth / viewBoxWidth);
      expect(pixels).toBeGreaterThanOrEqual(13);
    }
  });
});
