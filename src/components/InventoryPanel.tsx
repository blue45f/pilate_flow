import { EQUIPMENT_OPTIONS, PROP_OPTIONS } from '../data/equipmentCatalog';
import { usePilatesStore } from '../store/usePilatesStore';
import { EquipmentChoice } from './EquipmentChoice';

export function InventoryPanel() {
  const { ownedEquipment, ownedProps, toggleOwnedEquipment, toggleOwnedProp } = usePilatesStore();
  return (
    <section className="settings-section inventory-panel" aria-labelledby="inventory-heading">
      <span className="eyebrow">YOUR EQUIPMENT</span>
      <h3 id="inventory-heading">내 보유 기구와 소도구</h3>
      <p>
        추천은 필요한 기구와 소도구가 모두 이 목록에 있는 동작으로 구성됩니다. 캐딜락과 타워, 바렐의
        종류는 서로 대신한다고 가정하지 않습니다.
      </p>
      <p>
        체크한 장비는 라이브러리와 동작 찾기의 ‘내 보유 장비’ 범위에 바로 반영됩니다. ‘전체 장비’
        보기는 언제든 전환할 수 있습니다.
      </p>
      <fieldset>
        <legend>기구 · 여러 개 선택</legend>
        <div className="equipment-choice-grid">
          {EQUIPMENT_OPTIONS.map((item) => (
            <EquipmentChoice
              key={item.id}
              equipmentId={item.id}
              label={item.labelKo}
              checked={ownedEquipment.includes(item.id)}
              onChange={() => toggleOwnedEquipment(item.id)}
            />
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend>소도구 · 여러 개 선택</legend>
        <div className="equipment-choice-grid">
          {PROP_OPTIONS.filter((item) => item.id !== 'none').map((item) => (
            <EquipmentChoice
              key={item.id}
              equipmentId={item.id as Exclude<typeof item.id, 'none'>}
              label={item.labelKo}
              checked={ownedProps.includes(item.id)}
              onChange={() => toggleOwnedProp(item.id)}
            />
          ))}
        </div>
      </fieldset>
      <p className="muted">
        그림은 종류를 구별하기 위한 간단한 도해입니다. 모델에 따라 형태가 다를 수 있어요. 분류를
        지원한다는 뜻이며, 모든 종류의 운동 영상이 검토되었다는 뜻은 아닙니다. 무게·장력·모델은 수업
        전 별도로 확인해 주세요.
      </p>
    </section>
  );
}
