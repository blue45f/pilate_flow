import { useId } from 'react';
import { Check } from 'lucide-react';
import { EQUIPMENT_GUIDE, type EquipmentGuideId } from '../data/equipmentGuide';
import { EquipmentIllustration } from './EquipmentIllustration';
import '../styles/equipment-choice.css';

interface EquipmentChoiceProps {
  equipmentId: EquipmentGuideId;
  label: string;
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
  unavailable?: boolean;
  control?: 'checkbox' | 'button';
}

/** Native controls keep each caller's existing selection and persistence behavior. */
export function EquipmentChoice({
  equipmentId,
  label,
  checked,
  onChange,
  disabled = false,
  unavailable = false,
  control = 'checkbox',
}: EquipmentChoiceProps) {
  const id = useId();
  const labelId = `${id}-label`;
  const descriptionId = `${id}-description`;
  const content = (
    <>
      <span className="equipment-choice__picture">
        <EquipmentIllustration id={equipmentId} />
      </span>
      <span className="equipment-choice__copy">
        <span id={labelId} className="equipment-choice__name">
          {label}
          {unavailable ? ' · 미보유' : ''}
        </span>
        <span id={descriptionId} className="equipment-choice__description">
          {EQUIPMENT_GUIDE[equipmentId]}
        </span>
      </span>
    </>
  );
  const className = `equipment-choice${checked ? ' is-selected' : ''}${disabled ? ' is-disabled' : ''}`;
  if (control === 'button') {
    return (
      <button
        type="button"
        className={className}
        disabled={disabled}
        aria-pressed={checked}
        aria-labelledby={labelId}
        aria-describedby={descriptionId}
        onClick={onChange}
      >
        {content}
        <span className="equipment-choice__check" aria-hidden="true">
          {checked && <Check size={13} strokeWidth={3} />}
        </span>
      </button>
    );
  }
  return (
    <label className={className}>
      {content}
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        aria-labelledby={labelId}
        aria-describedby={descriptionId}
        onChange={onChange}
      />
    </label>
  );
}
