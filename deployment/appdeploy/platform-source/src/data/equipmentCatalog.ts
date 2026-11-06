import type {
  ApparatusType,
  PilatesExercise,
  PropType,
} from '../types/pilates';

/** Exact apparatus inventory. Sharing a family never makes variants interchangeable. */
export const EQUIPMENT_OPTIONS = [
  { id: 'mat', labelKo: '매트', labelEn: 'Mat', apparatusFamily: 'mat' },
  {
    id: 'reformer',
    labelKo: '리포머',
    labelEn: 'Reformer',
    apparatusFamily: 'reformer',
  },
  { id: 'chair', labelKo: '체어', labelEn: 'Chair', apparatusFamily: 'chair' },
  {
    id: 'cadillac',
    labelKo: '캐딜락',
    labelEn: 'Cadillac',
    apparatusFamily: 'cadillac',
  },
  {
    id: 'tower',
    labelKo: '타워',
    labelEn: 'Tower',
    apparatusFamily: 'cadillac',
  },
  {
    id: 'ladder-barrel',
    labelKo: '래더 바렐',
    labelEn: 'Ladder Barrel',
    apparatusFamily: 'barrel',
  },
  {
    id: 'spine-corrector',
    labelKo: '스파인 코렉터',
    labelEn: 'Spine Corrector',
    apparatusFamily: 'barrel',
  },
  {
    id: 'barrel',
    labelKo: '바렐 · 종류 미지정',
    labelEn: 'Barrel · unspecified type',
    apparatusFamily: 'barrel',
  },
] as const;
export type EquipmentId = (typeof EQUIPMENT_OPTIONS)[number]['id'];
export const EQUIPMENT_IDS: readonly EquipmentId[] = EQUIPMENT_OPTIONS.map(
  equipment => equipment.id
);
export const DEFAULT_OWNED_EQUIPMENT: readonly EquipmentId[] = [
  'reformer',
  'cadillac',
  'chair',
  'barrel',
  'mat',
];

export const PROP_OPTIONS: readonly {
  id: PropType;
  labelKo: string;
  labelEn: string;
}[] = [
  { id: 'none', labelKo: '소도구 없음', labelEn: 'No prop' },
  { id: 'mini-ball', labelKo: '미니볼', labelEn: 'Mini ball' },
  { id: 'fitness-ball', labelKo: '짐볼', labelEn: 'Fitness ball' },
  {
    id: 'magic-circle',
    labelKo: '써클링 · 매직 서클',
    labelEn: 'Magic circle / ring',
  },
  {
    id: 'theraband',
    labelKo: '탄력 밴드 · 종류 미지정',
    labelEn: 'Resistance band · unspecified type',
  },
  { id: 'loop-band', labelKo: '루프 밴드', labelEn: 'Loop band' },
  { id: 'tube-band', labelKo: '튜브 밴드', labelEn: 'Tube band' },
  { id: 'long-band', labelKo: '롱 밴드', labelEn: 'Long band' },
  { id: 'foam-roller', labelKo: '폼롤러', labelEn: 'Foam roller' },
  { id: 'dumbbell', labelKo: '가벼운 덤벨', labelEn: 'Light dumbbells' },
  { id: 'sliders', labelKo: '슬라이더', labelEn: 'Sliders' },
  { id: 'yoga-block', labelKo: '요가 블록', labelEn: 'Yoga block' },
  { id: 'bosu', labelKo: '보수', labelEn: 'BOSU' },
  { id: 'toning-ball', labelKo: '토닝볼', labelEn: 'Toning balls' },
];
export const PROP_IDS: readonly PropType[] = PROP_OPTIONS.map(prop => prop.id);

export function isEquipmentId(value: string): value is EquipmentId {
  return EQUIPMENT_IDS.some(id => id === value);
}
export function getEquipmentFamily(id: string): ApparatusType | undefined {
  return EQUIPMENT_OPTIONS.find(equipment => equipment.id === id)
    ?.apparatusFamily;
}
export function getEquipmentFamilies(ids: readonly string[]): ApparatusType[] {
  return [
    ...new Set(
      ids
        .map(getEquipmentFamily)
        .filter((family): family is ApparatusType => !!family)
    ),
  ];
}
export function equipmentRequirementsSatisfied(
  required: readonly string[],
  available: readonly string[]
): boolean {
  return (
    required.length > 0 &&
    required.every(id => isEquipmentId(id) && available.includes(id))
  );
}

export interface ExerciseEquipment {
  requiredEquipment: string[];
  requiredProps: PropType[];
  requirementsKnown: boolean;
  metadataStatus: 'original-planning' | 'unverified' | 'user-entered';
}

/** Reads structured metadata only. Titles and video names never establish setup or verification. */
export function getExerciseEquipment(
  exercise: PilatesExercise
): ExerciseEquipment {
  const requiredEquipment = [
    ...new Set(exercise.requiredEquipment ?? [exercise.apparatus]),
  ];
  const requiredProps = [
    ...new Set(exercise.props.filter(prop => prop !== 'none')),
  ];
  const requirementsKnown =
    requiredEquipment.length > 0 &&
    requiredEquipment.every(isEquipmentId) &&
    requiredProps.every(prop => PROP_IDS.includes(prop));
  return {
    requiredEquipment,
    requiredProps,
    requirementsKnown,
    metadataStatus: exercise.id.startsWith('original-')
      ? 'original-planning'
      : exercise.isCustom
        ? 'user-entered'
        : 'unverified',
  };
}

export function getExerciseAvailability(
  exercise: PilatesExercise,
  availableEquipment: readonly string[],
  availableProps: readonly PropType[]
) {
  const requirements = getExerciseEquipment(exercise);
  const missingEquipment = requirements.requiredEquipment.filter(
    id => !isEquipmentId(id) || !availableEquipment.includes(id)
  );
  const missingProps = requirements.requiredProps.filter(
    prop => !availableProps.includes(prop)
  );
  return {
    ...requirements,
    missingEquipment,
    missingProps,
    possible:
      requirements.requirementsKnown &&
      missingEquipment.length === 0 &&
      missingProps.length === 0,
  };
}
