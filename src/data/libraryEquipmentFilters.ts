import type { PropType } from '../types/pilates';

export interface EquipmentFilterRequirements {
  requiredEquipment: readonly string[];
  requiredProps: readonly PropType[];
  requirementsKnown: boolean;
}

export interface LibraryEquipmentFilters {
  equipment: readonly string[];
  props: readonly PropType[];
  ownedOnly: boolean;
  ownedEquipment: readonly string[];
  ownedProps: readonly PropType[];
}

/**
 * Browsing selections use OR within each group, then AND between groups.
 * Owned-only is stricter: every confirmed requirement must be available.
 * Explicitly recorded items remain searchable when the full requirements are unknown.
 * Unknown completeness never implies that props are unnecessary or that owned gear suffices.
 */
export function matchesLibraryEquipment(
  requirements: EquipmentFilterRequirements,
  filters: LibraryEquipmentFilters,
): boolean {
  const requiredEquipment = requirements.requiredEquipment.filter((id) => id.trim().length > 0);
  const requiredProps = requirements.requiredProps.filter((id) => id !== 'none');
  const requirementsKnown = requirements.requirementsKnown && requiredEquipment.length > 0;

  if (filters.ownedOnly && !requirementsKnown) return false;

  if (
    filters.equipment.length > 0 &&
    !filters.equipment.some((id) => requiredEquipment.includes(id))
  ) {
    return false;
  }

  if (
    filters.props.length > 0 &&
    !filters.props.some((id) =>
      id === 'none' ? requirementsKnown && requiredProps.length === 0 : requiredProps.includes(id),
    )
  ) {
    return false;
  }

  if (filters.ownedOnly) {
    return (
      requiredEquipment.every((id) => filters.ownedEquipment.includes(id)) &&
      requiredProps.every((id) => filters.ownedProps.includes(id))
    );
  }

  return true;
}
