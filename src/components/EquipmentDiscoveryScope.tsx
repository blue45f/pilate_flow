import { EQUIPMENT_OPTIONS, PROP_OPTIONS } from '../data/equipmentCatalog';
import { usePilatesStore } from '../store/usePilatesStore';
import '../styles/equipment-discovery-scope.css';

/** One persisted browsing scope, independent of local search and class-planning criteria. */
export function EquipmentDiscoveryScope() {
  const scope = usePilatesStore((state) => state.exerciseBrowseScope);
  const setScope = usePilatesStore((state) => state.setExerciseBrowseScope);
  const ownedEquipment = usePilatesStore((state) => state.ownedEquipment);
  const ownedProps = usePilatesStore((state) => state.ownedProps);
  const labels = [
    ...EQUIPMENT_OPTIONS.filter((item) => ownedEquipment.includes(item.id)).map(
      (item) => item.labelKo,
    ),
    ...PROP_OPTIONS.filter((item) => item.id !== 'none' && ownedProps.includes(item.id)).map(
      (item) => item.labelKo,
    ),
  ];
  return (
    <section className="equipment-discovery-scope" aria-label="장비 탐색 범위">
      <div className="equipment-discovery-options" role="group" aria-label="표시할 장비 범위">
        <button type="button" aria-pressed={scope === 'owned'} onClick={() => setScope('owned')}>
          내 보유 장비
        </button>
        <button type="button" aria-pressed={scope === 'all'} onClick={() => setScope('all')}>
          전체 장비 보기
        </button>
      </div>
      <p>
        {scope === 'owned'
          ? '설정에서 체크한 기구·소도구를 모두 갖춘 동작만 보여요. 요구 조건 미확인 자료는 제외합니다.'
          : '미보유 장비와 요구 조건 미확인 자료도 함께 탐색합니다. 보유 설정은 바뀌지 않아요.'}
      </p>
      <details>
        <summary>
          내 보유 목록 · 기구 {ownedEquipment.length} · 소도구{' '}
          {ownedProps.filter((id) => id !== 'none').length}
        </summary>
        <p>
          {labels.length
            ? labels.join(' · ')
            : '체크한 장비가 없습니다. 설정에서 사용하는 기구·소도구를 선택해 주세요.'}
        </p>
      </details>
      {scope === 'owned' && ownedEquipment.length === 0 && (
        <p className="equipment-discovery-empty">
          선택한 기구가 없어 동작 결과가 비어 있을 수 있어요. 매트 동작도 매트를 선택해야 하며,
          소도구 없음은 별도 소유 항목이 아닙니다.
        </p>
      )}
      <p className="equipment-discovery-hint">
        라이브러리·동작 찾기에 함께 적용 · 검색 초기화 후에도 이 범위는 유지됩니다.
      </p>
    </section>
  );
}
