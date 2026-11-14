import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { getMovementVisualAsset } from '../data/movementVisualRigCatalog';
import { INITIAL_EXERCISES } from '../data/pilatesCatalog';
import { usePilatesStore } from '../store/usePilatesStore';
import { MovementDiagramReference } from './MovementDiagramReference';
import { MovementTriptychDiagramSvg } from './MovementPhaseDiagramSvg';

afterEach(cleanup);

function openDetails(details: HTMLDetailsElement) {
  details.open = true;
  fireEvent(details, new Event('toggle'));
}

describe('studio motion presentation controls', () => {
  it('uses readable static phase headings when no selection action exists and keeps technical detail optional', () => {
    const asset = getMovementVisualAsset('original-mat-clam')!;
    const { container } = render(<MovementTriptychDiagramSvg asset={asset} />);
    expect(container.querySelectorAll('[data-triptych-panel]')).toHaveLength(3);
    expect(container.querySelectorAll('button[data-triptych-phase]')).toHaveLength(0);
    for (const phase of ['start', 'middle', 'end']) {
      expect(container.querySelector(`[data-triptych-phase="${phase}"]`)).toHaveTextContent(asset.phases[phase as 'start' | 'middle' | 'end'].shortTitleKo);
    }
    const metadata = screen.getByText('도해 정보').closest('details')!;
    expect(metadata).not.toHaveAttribute('open');
    expect(within(metadata).getByText(/최대 관절 변위/)).not.toBeVisible();
    openDetails(metadata);
    expect(within(metadata).getByText(/최대 관절 변위/)).toBeVisible();
  });

  it('retains actual phase selection and pressed-state semantics when an action is supplied', () => {
    const asset = getMovementVisualAsset('original-reformer-parallel-footwork')!;
    const onSelectPhase = vi.fn();
    const { container } = render(<MovementTriptychDiagramSvg asset={asset} selectedPhase="middle" onSelectPhase={onSelectPhase} />);
    const controls = container.querySelectorAll<HTMLButtonElement>('button[data-triptych-phase]');
    expect(controls).toHaveLength(3);
    expect(controls[1]).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(controls[0]);
    expect(onSelectPhase).toHaveBeenCalledExactlyOnceWith('start');
  });

  it('toggles reference guides locally without changing the authored pose, lesson, or persisted data', () => {
    const exercise = INITIAL_EXERCISES.find((item) => item.id === 'original-mat-clam')!;
    const sourceBefore = JSON.stringify(exercise);
    const before = usePilatesStore.getState();
    const stored = JSON.stringify(localStorage);
    const { container, rerender } = render(<MovementDiagramReference exercise={exercise} />);
    openDetails(container.querySelector('details')!);
    const reference = screen.getByRole('region', { name: '참고 자세 정지 그림' });
    const svg = reference.querySelector('svg.movement-phase-diagram-svg')!;
    const limb = svg.querySelector('[data-limb-depth="near"] path')!.getAttribute('d');
    expect(svg.querySelector('[data-layer="joint-alignment"]')).toBeNull();
    expect(svg.querySelector('[data-layer="movement-direction"]')).toBeNull();
    const options = within(reference).getByText('그림 표시 옵션').closest('details')!;
    openDetails(options);
    fireEvent.click(within(options).getByRole('checkbox', { name: '정렬선 표시' }));
    fireEvent.click(within(options).getByRole('checkbox', { name: '방향 화살표 표시' }));
    expect(svg.querySelector('[data-layer="joint-alignment"]')).not.toBeNull();
    expect(svg.querySelector('[data-layer="movement-direction"]')).not.toBeNull();
    expect(svg.querySelector('[data-limb-depth="near"] path')!.getAttribute('d')).toBe(limb);
    expect(reference.querySelectorAll('svg.movement-phase-diagram-svg')).toHaveLength(1);
    expect(JSON.stringify(exercise)).toBe(sourceBefore);
    expect(usePilatesStore.getState()).toBe(before);
    expect(JSON.stringify(localStorage)).toBe(stored);

    rerender(<MovementDiagramReference exercise={INITIAL_EXERCISES[0]} />);
    expect(screen.queryByRole('region', { name: '참고 자세 정지 그림' })).not.toBeInTheDocument();
    openDetails(container.querySelector('details')!);
    expect(container.querySelector('[data-layer="joint-alignment"]')).toBeNull();
    expect(container.querySelector('[data-layer="movement-direction"]')).toBeNull();
  });
});
