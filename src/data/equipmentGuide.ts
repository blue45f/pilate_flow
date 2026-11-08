import type { EquipmentId } from './equipmentCatalog';
import type { PropType } from '../types/pilates';

export type EquipmentGuideId = EquipmentId | Exclude<PropType, 'none'>;

/** Plain identification aids, not exercise prescriptions or interchangeable-equipment claims. */
export const EQUIPMENT_GUIDE: Record<EquipmentGuideId, string> = {
  mat: '바닥에 까는 패드. 누운 자세와 맨몸 동작을 받쳐줘요.',
  reformer: '움직이는 캐리지와 스프링으로 저항 운동을 해요.',
  chair: '좌석 아래 스프링 페달을 눌러 저항 운동을 해요.',
  cadillac: '침대형 프레임에 달린 바와 스프링으로 몸을 지지해요.',
  tower: '수직 프레임의 바와 스프링을 이용해 운동해요.',
  'ladder-barrel': '사다리와 곡면 패드로 몸을 받치며 움직여요.',
  'spine-corrector': '낮은 곡면 패드로 등과 몸통의 움직임을 보조해요.',
  barrel: '곡면으로 몸을 받치는 기구. 구체적인 종류를 확인해 주세요.',
  'mini-ball': '작고 부드러운 공. 몸 사이에 끼우거나 받쳐 사용해요.',
  'fitness-ball': '큰 탄성 공. 몸을 받치며 균형과 몸통 운동에 사용해요.',
  'magic-circle': '양쪽 패드가 달린 링. 손이나 다리로 눌러 저항을 만들어요.',
  theraband: '늘어나는 밴드로 저항을 만들어요. 형태를 확인해 주세요.',
  'loop-band': '끝이 이어진 고리형 밴드. 팔다리를 벌릴 때 저항을 줘요.',
  'tube-band': '튜브형 탄성 줄. 손잡이를 잡고 당기는 운동에 사용해요.',
  'long-band': '길고 납작한 밴드. 길이를 조절해 잡고 당겨요.',
  'foam-roller': '긴 원통형 소도구. 몸을 받치거나 굴릴 때 사용해요.',
  dumbbell: '손에 쥐는 작은 무게. 팔 동작 등에 저항을 더해요.',
  sliders: '바닥에서 미끄러지는 패드. 손발을 대고 밀어 움직여요.',
  'yoga-block': '단단한 사각 블록. 손이나 몸 아래 받쳐 높이를 보조해요.',
  bosu: '평평한 받침 위 반구형 공. 지지와 균형 운동에 사용해요.',
  'toning-ball': '손에 쥐는 작은 무게 공. 동작에 가벼운 저항을 더해요.',
};
