import { getEquipmentFamilies, isEquipmentId } from '../data/equipmentCatalog';
import { criteriaSchema, groupPlanningPreferencesSchema } from '../schemas/cloudBackupSchema';
import type { AutoGenerateCriteria, ClassGroupProfile, PropType } from '../types/pilates';
import type {
  GroupPlanningConditions,
  GroupPlanningPreferences,
} from '../types/instructorPlanning';

export interface PlanningInventory {
  readonly ownedEquipment: readonly string[];
  readonly ownedProps: readonly PropType[];
}

/** Validate first. No equipment substitution, ownership changes, age inference or observation copy. */
export function captureGroupPlanningConditions(
  request: unknown,
  inventory: PlanningInventory,
): GroupPlanningConditions {
  const parsed = criteriaSchema.safeParse(request);
  if (!parsed.success) throw new Error('저장할 수업 조건의 시간·기구·난이도를 확인해 주세요.');
  const criteria = parsed.data;
  const availableEquipment = [
    ...new Set(
      criteria.availableEquipment ??
        (criteria.apparatus === 'mixed' ? (criteria.ownedApparatus ?? []) : [criteria.apparatus]),
    ),
  ];
  if (
    !availableEquipment.length ||
    availableEquipment.some((id) => !isEquipmentId(id) || !inventory.ownedEquipment.includes(id))
  )
    throw new Error('대상별 조건에 현재 보유하지 않았거나 지정되지 않은 세부 기구가 있습니다.');
  const families = getEquipmentFamilies(availableEquipment);
  if (criteria.apparatus !== 'mixed' && !families.includes(criteria.apparatus))
    throw new Error('대상별 기구 종류와 세부 기구 조건이 서로 맞지 않습니다.');
  if (
    criteria.preferredProps.some((prop) => prop !== 'none' && !inventory.ownedProps.includes(prop))
  )
    throw new Error('대상별 조건에 현재 보유하지 않은 소도구가 있습니다.');
  const conditions = { ...criteria };
  delete conditions.targetGroupId;
  delete conditions.instructorObservations;
  return {
    ...conditions,
    availableEquipment,
    ownedApparatus: families,
    preferredProps: [...conditions.preferredProps],
    ...(conditions.planningGoals ? { planningGoals: [...conditions.planningGoals] } : {}),
  };
}

export function applyGroupPlanningConditionsToDraft(
  group: ClassGroupProfile,
  inventory: PlanningInventory,
): AutoGenerateCriteria {
  const parsed = groupPlanningPreferencesSchema.safeParse(group.planningPreferences);
  if (!parsed.success || !parsed.data.conditions)
    throw new Error(
      '이 대상에 저장된 재사용 수업 조건이 없습니다. 현재 조건을 먼저 저장해 주세요.',
    );
  return {
    ...captureGroupPlanningConditions(parsed.data.conditions, inventory),
    targetGroupId: group.id,
  };
}

function clonePreferences(value: GroupPlanningPreferences): GroupPlanningPreferences {
  return groupPlanningPreferencesSchema.parse(value);
}

/** Explicit current preferences win; a legacy missing field cannot erase them during hydration. */
export function preserveCurrentGroupPlanningPreferences(
  current: readonly ClassGroupProfile[],
  incoming: readonly ClassGroupProfile[],
): ClassGroupProfile[] {
  const local = new Map(current.map((group) => [group.id, group]));
  const used = new Set(incoming.map((group) => group.id));
  return [
    ...incoming.map((group) => {
      const preferences = local.get(group.id)?.planningPreferences;
      return preferences === undefined
        ? group
        : { ...group, planningPreferences: clonePreferences(preferences) };
    }),
    ...current
      .filter((group) => !used.has(group.id) && group.planningPreferences !== undefined)
      .map((group) => ({
        ...group,
        planningPreferences: clonePreferences(group.planningPreferences!),
      })),
  ];
}
