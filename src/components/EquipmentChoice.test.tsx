import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { EQUIPMENT_OPTIONS, PROP_OPTIONS } from '../data/equipmentCatalog';
import { EQUIPMENT_GUIDE, type EquipmentGuideId } from '../data/equipmentGuide';
import { usePilatesStore } from '../store/usePilatesStore';
import { EquipmentChoice } from './EquipmentChoice';
import { EquipmentIllustration } from './EquipmentIllustration';
import { InventoryPanel } from './InventoryPanel';

const original = usePilatesStore.getState();
afterEach(() => {
  cleanup();
  usePilatesStore.setState(original, true);
});

describe('equipment identification cards', () => {
  it('provides a distinct authored illustration and description for every selectable kind', () => {
    const ids = [
      ...EQUIPMENT_OPTIONS.map((item) => item.id),
      ...PROP_OPTIONS.filter((item) => item.id !== 'none').map((item) => item.id),
    ] as EquipmentGuideId[];
    expect(Object.keys(EQUIPMENT_GUIDE).sort()).toEqual([...ids].sort());
    const drawings = ids.map((id) => {
      expect(EQUIPMENT_GUIDE[id].length).toBeGreaterThan(15);
      const { container, unmount } = render(<EquipmentIllustration id={id} />);
      const svg = container.querySelector('svg')!;
      expect(svg).toHaveAttribute('aria-hidden', 'true');
      expect(svg).toHaveAttribute('focusable', 'false');
      const markup = svg.innerHTML;
      expect(markup).not.toBe('');
      unmount();
      return markup;
    });
    expect(new Set(drawings).size).toBe(ids.length);
  });

  it('keeps the short accessible name separate from its purpose description', () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <EquipmentChoice
        equipmentId="loop-band"
        label="루프 밴드"
        checked={false}
        onChange={onChange}
      />,
    );
    const checkbox = screen.getByRole('checkbox', { name: '루프 밴드' });
    expect(checkbox).not.toBeChecked();
    expect(checkbox).toHaveAccessibleDescription(EQUIPMENT_GUIDE['loop-band']);
    fireEvent.click(screen.getByText(EQUIPMENT_GUIDE['loop-band']));
    expect(onChange).toHaveBeenCalledTimes(1);
    rerender(
      <EquipmentChoice equipmentId="loop-band" label="루프 밴드" checked onChange={onChange} />,
    );
    expect(checkbox).toBeChecked();
  });

  it('preserves pressed-button semantics for the library inventory editor', () => {
    const onChange = vi.fn();
    render(
      <EquipmentChoice
        equipmentId="fitness-ball"
        label="짐볼"
        checked
        control="button"
        onChange={onChange}
      />,
    );
    const button = screen.getByRole('button', { name: '짐볼' });
    expect(button).toHaveAttribute('aria-pressed', 'true');
    expect(button).toHaveAccessibleDescription(EQUIPMENT_GUIDE['fitness-ball']);
    fireEvent.click(button);
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it('keeps unavailable equipment disabled and explicit without losing its guide', () => {
    const onChange = vi.fn();
    render(
      <EquipmentChoice
        equipmentId="tower"
        label="타워"
        unavailable
        disabled
        checked={false}
        onChange={onChange}
      />,
    );
    const checkbox = screen.getByRole('checkbox', { name: '타워 · 미보유' });
    expect(checkbox).toBeDisabled();
    expect(checkbox).toHaveAccessibleDescription(EQUIPMENT_GUIDE.tower);
    fireEvent.click(screen.getByText('타워 · 미보유'));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('keeps independent multi-selection, matching family state, and an empty inventory', () => {
    usePilatesStore.setState({ ownedEquipment: [], ownedApparatus: [], ownedProps: [] });
    render(<InventoryPanel />);
    const panel = screen.getByRole('region', { name: '내 보유 기구와 소도구' });
    expect(within(panel).getAllByRole('checkbox')).toHaveLength(21);
    for (const name of ['매트', '짐볼', '루프 밴드'])
      fireEvent.click(within(panel).getByRole('checkbox', { name }));
    expect(usePilatesStore.getState().ownedEquipment).toEqual(['mat']);
    expect(usePilatesStore.getState().ownedApparatus).toEqual(['mat']);
    expect(usePilatesStore.getState().ownedProps).toEqual(['fitness-ball', 'loop-band']);
    for (const name of ['매트', '짐볼', '루프 밴드'])
      expect(within(panel).getByRole('checkbox', { name })).toBeChecked();
    fireEvent.click(within(panel).getByRole('checkbox', { name: '짐볼' }));
    expect(usePilatesStore.getState().ownedProps).toEqual(['loop-band']);
    fireEvent.click(within(panel).getByRole('checkbox', { name: '매트' }));
    fireEvent.click(within(panel).getByRole('checkbox', { name: '루프 밴드' }));
    expect(usePilatesStore.getState().ownedEquipment).toEqual([]);
    expect(usePilatesStore.getState().ownedProps).toEqual([]);
    expect(within(panel).queryByRole('checkbox', { name: '소도구 없음' })).not.toBeInTheDocument();
  });

  it('uses distinct description ids when the same kind is rendered in separate pickers', () => {
    render(
      <>
        <EquipmentChoice equipmentId="mat" label="매트" checked onChange={vi.fn()} />
        <EquipmentChoice equipmentId="mat" label="매트" checked={false} onChange={vi.fn()} />
      </>,
    );
    const controls = screen.getAllByRole('checkbox', { name: '매트' });
    expect(controls[0].getAttribute('aria-describedby')).not.toBe(
      controls[1].getAttribute('aria-describedby'),
    );
    for (const control of controls)
      expect(control).toHaveAccessibleDescription(EQUIPMENT_GUIDE.mat);
  });
});
