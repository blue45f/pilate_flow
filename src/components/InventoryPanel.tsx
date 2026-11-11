import { useId, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { ChevronDown, RotateCcw, Search, X } from 'lucide-react';
import { EQUIPMENT_OPTIONS, PROP_OPTIONS } from '../data/equipmentCatalog';
import { EQUIPMENT_GUIDE } from '../data/equipmentGuide';
import { usePilatesStore } from '../store/usePilatesStore';
import type { PropType } from '../types/pilates';
import { EquipmentChoice } from './EquipmentChoice';
import '../styles/inventory-usability.css';

type SelectablePropId = Exclude<PropType, 'none'>;

interface SelectablePropOption {
  readonly id: SelectablePropId;
  readonly labelKo: string;
  readonly labelEn: string;
}

type InventoryFilterMode = 'all' | 'selected' | 'equipment' | 'props';

const SELECTABLE_PROP_OPTIONS: readonly SelectablePropOption[] = PROP_OPTIONS.filter(
  (item): item is SelectablePropOption => item.id !== 'none',
);

const FILTER_ORDER: readonly InventoryFilterMode[] = ['all', 'selected', 'equipment', 'props'];

function matchesInventoryQuery(
  labelKo: string,
  labelEn: string,
  guideText: string,
  rawQuery: string,
): boolean {
  const trimmed = rawQuery.trim().toLowerCase();
  if (!trimmed) return true;
  const haystack = `${labelKo} ${labelEn} ${guideText}`.toLowerCase();
  if (haystack.includes(trimmed)) return true;
  const compactQuery = trimmed.replace(/\s+/g, '');
  if (!compactQuery) return true;
  return haystack.replace(/\s+/g, '').includes(compactQuery);
}

export function InventoryPanel() {
  const ownedEquipment = usePilatesStore((state) => state.ownedEquipment);
  const ownedProps = usePilatesStore((state) => state.ownedProps);
  const exerciseBrowseScope = usePilatesStore((state) => state.exerciseBrowseScope);
  const toggleOwnedEquipment = usePilatesStore((state) => state.toggleOwnedEquipment);
  const toggleOwnedProp = usePilatesStore((state) => state.toggleOwnedProp);

  const [filterMode, setFilterMode] = useState<InventoryFilterMode>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [equipmentCollapsed, setEquipmentCollapsed] = useState(false);
  const [propsCollapsed, setPropsCollapsed] = useState(false);

  const instanceId = useId();
  const equipmentGridId = `${instanceId}-equipment-grid`;
  const propsGridId = `${instanceId}-props-grid`;

  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const filterButtonRefs = useRef<Record<InventoryFilterMode, HTMLButtonElement | null>>({
    all: null,
    selected: null,
    equipment: null,
    props: null,
  });

  const selectedEquipmentOptions = useMemo(
    () => EQUIPMENT_OPTIONS.filter((item) => ownedEquipment.includes(item.id)),
    [ownedEquipment],
  );

  const selectedPropOptions = useMemo(
    () => SELECTABLE_PROP_OPTIONS.filter((item) => ownedProps.includes(item.id)),
    [ownedProps],
  );

  const totalSelectableCount = EQUIPMENT_OPTIONS.length + SELECTABLE_PROP_OPTIONS.length;
  const totalSelectedCount = selectedEquipmentOptions.length + selectedPropOptions.length;
  const trimmedQuery = searchQuery.trim();
  const hasTrimmedSearch = trimmedQuery.length > 0;

  const visibleEquipmentOptions = useMemo(() => {
    if (filterMode === 'props') return [];
    return EQUIPMENT_OPTIONS.filter(
      (item) =>
        (filterMode !== 'selected' || ownedEquipment.includes(item.id)) &&
        matchesInventoryQuery(item.labelKo, item.labelEn, EQUIPMENT_GUIDE[item.id], searchQuery),
    );
  }, [filterMode, ownedEquipment, searchQuery]);

  const visiblePropOptions = useMemo(() => {
    if (filterMode === 'equipment') return [];
    return SELECTABLE_PROP_OPTIONS.filter(
      (item) =>
        (filterMode !== 'selected' || ownedProps.includes(item.id)) &&
        matchesInventoryQuery(item.labelKo, item.labelEn, EQUIPMENT_GUIDE[item.id], searchQuery),
    );
  }, [filterMode, ownedProps, searchQuery]);

  const showEquipmentFieldset =
    filterMode !== 'props' &&
    ((!hasTrimmedSearch && filterMode !== 'selected') || visibleEquipmentOptions.length > 0);
  const showPropsFieldset =
    filterMode !== 'equipment' &&
    ((!hasTrimmedSearch && filterMode !== 'selected') || visiblePropOptions.length > 0);

  const renderedEquipmentItems =
    showEquipmentFieldset && !equipmentCollapsed ? visibleEquipmentOptions : [];
  const renderedPropItems = showPropsFieldset && !propsCollapsed ? visiblePropOptions : [];
  const displayedChoiceCount = renderedEquipmentItems.length + renderedPropItems.length;

  const renderedSelectedCount =
    renderedEquipmentItems.filter((item) => ownedEquipment.includes(item.id)).length +
    renderedPropItems.filter((item) => ownedProps.includes(item.id)).length;
  const hiddenSelectedCount = Math.max(0, totalSelectedCount - renderedSelectedCount);

  const hasViewAdjustment =
    searchQuery.length > 0 || filterMode !== 'all' || equipmentCollapsed || propsCollapsed;

  const applyFilterMode = (nextMode: InventoryFilterMode) => {
    setFilterMode(nextMode);
    if (nextMode === 'equipment') {
      setEquipmentCollapsed(false);
    } else if (nextMode === 'props') {
      setPropsCollapsed(false);
    } else if (nextMode === 'selected') {
      setEquipmentCollapsed(false);
      setPropsCollapsed(false);
    }
  };

  const resetViewControls = () => {
    setSearchQuery('');
    setFilterMode('all');
    setEquipmentCollapsed(false);
    setPropsCollapsed(false);
  };

  const handleFilterKeyDown = (
    event: KeyboardEvent<HTMLButtonElement>,
    currentIndex: number,
  ) => {
    let nextIndex: number;
    if (event.key === 'ArrowRight') {
      nextIndex = (currentIndex + 1) % FILTER_ORDER.length;
    } else if (event.key === 'ArrowLeft') {
      nextIndex = (currentIndex - 1 + FILTER_ORDER.length) % FILTER_ORDER.length;
    } else if (event.key === 'Home') {
      nextIndex = 0;
    } else if (event.key === 'End') {
      nextIndex = FILTER_ORDER.length - 1;
    } else {
      return;
    }
    event.preventDefault();
    const nextMode = FILTER_ORDER[nextIndex];
    applyFilterMode(nextMode);
    filterButtonRefs.current[nextMode]?.focus();
  };

  const filterOptions: readonly { id: InventoryFilterMode; label: string }[] = [
    { id: 'all', label: `전체 (${totalSelectableCount})` },
    { id: 'selected', label: `선택됨 (${totalSelectedCount})` },
    { id: 'equipment', label: `기구만 (${EQUIPMENT_OPTIONS.length})` },
    { id: 'props', label: `소도구만 (${SELECTABLE_PROP_OPTIONS.length})` },
  ];

  const noMatchingItems =
    visibleEquipmentOptions.length === 0 && visiblePropOptions.length === 0;

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

      <div className="inventory-summary-bar" data-testid="inventory-selection-summary">
        <div className="inventory-summary-bar__top">
          <strong className="inventory-summary-counts">
            선택 현황 · 기구 {selectedEquipmentOptions.length}/{EQUIPMENT_OPTIONS.length} · 소도구{' '}
            {selectedPropOptions.length}/{SELECTABLE_PROP_OPTIONS.length}
          </strong>
          <div className="inventory-summary-badges">
            <span className="inventory-badge">체크 즉시 반영</span>
            <span
              className={`inventory-badge${exerciseBrowseScope === 'all' ? ' inventory-badge--scope-all' : ''}`}
              data-testid="inventory-browse-scope-note"
            >
              {exerciseBrowseScope === 'owned'
                ? '탐색 적용: 내 보유 장비'
                : '탐색 상태: 전체 장비 보기 중'}
            </span>
          </div>
        </div>

        <dl className="inventory-summary-list">
          <div className="inventory-summary-row">
            <dt>보유 기구</dt>
            <dd>
              {selectedEquipmentOptions.length > 0 ? (
                selectedEquipmentOptions.map((item) => item.labelKo).join(', ')
              ) : (
                <span
                  className="inventory-summary-alert"
                  data-testid="inventory-no-equipment-notice"
                >
                  기구 미선택 · 맨몸·매트 동작도 ‘매트’를 선택해야 내 보유 장비 범위에 표시됩니다.
                </span>
              )}
            </dd>
          </div>
          <div className="inventory-summary-row">
            <dt>보유 소도구</dt>
            <dd>
              {selectedPropOptions.length > 0 ? (
                <>
                  {selectedPropOptions.map((item) => item.labelKo).join(', ')}{' '}
                  <span className="inventory-summary-subtle">· ‘소도구 없음’ 동작도 함께 포함</span>
                </>
              ) : (
                <span
                  className="inventory-summary-subtle"
                  data-testid="inventory-no-props-notice"
                >
                  선택한 소도구 없음 · 소도구 없이 하는 동작(‘소도구 없음’)은 별도 체크 없이 선택한
                  기구만으로 포함됩니다.
                </span>
              )}
            </dd>
          </div>
        </dl>
      </div>

      <div className="inventory-finder-bar">
        <div className="inventory-search-row">
          <div className="inventory-search-field">
            <Search size={16} aria-hidden="true" className="inventory-search-icon" />
            <input
              ref={searchInputRef}
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Escape' && searchQuery.length > 0) {
                  event.preventDefault();
                  event.stopPropagation();
                  setSearchQuery('');
                }
              }}
              placeholder="기구·소도구 이름이나 특징 찾기 (예: 밴드, 바렐, 캐리지)"
              aria-label="보유 기구·소도구 찾기"
              className="inventory-search-input"
            />
          </div>
          {searchQuery.length > 0 && (
            <button
              type="button"
              className="inventory-clear-search-btn"
              aria-label="보유 장비 검색어 지우기"
              onClick={() => {
                setSearchQuery('');
                searchInputRef.current?.focus();
              }}
            >
              <X size={15} aria-hidden="true" />
              <span>지우기</span>
            </button>
          )}
        </div>

        <div className="inventory-filter-group" role="group" aria-label="장비 표시 필터">
          {filterOptions.map((option, index) => (
            <button
              key={option.id}
              ref={(element) => {
                filterButtonRefs.current[option.id] = element;
              }}
              type="button"
              className="inventory-filter-chip"
              aria-pressed={filterMode === option.id}
              onClick={() => applyFilterMode(option.id)}
              onKeyDown={(event) => handleFilterKeyDown(event, index)}
            >
              {option.label}
            </button>
          ))}
        </div>

        {hasViewAdjustment && (
          <div className="inventory-view-status">
            <span className="inventory-view-status__text" role="status" aria-live="polite">
              현재 표시 {displayedChoiceCount}개
              {hiddenSelectedCount > 0
                ? ` · 화면 밖 선택 ${hiddenSelectedCount}개 그대로 유지됨`
                : ''}
            </span>
            <button
              type="button"
              className="inventory-reset-view-btn"
              onClick={resetViewControls}
            >
              <RotateCcw size={14} aria-hidden="true" />
              <span>보유 장비 찾기 초기화</span>
            </button>
          </div>
        )}
      </div>

      {noMatchingItems ? (
        <div
          className="inventory-empty-results"
          role="status"
          data-testid="inventory-empty-results"
        >
          <p>
            {hasTrimmedSearch
              ? filterMode !== 'all'
                ? `현재 필터 범위에서 ‘${trimmedQuery}’에 해당하는 항목이 없습니다.`
                : `‘${trimmedQuery}’에 해당하는 기구·소도구가 없습니다.`
              : filterMode === 'selected'
                ? '현재 체크한 기구·소도구가 없습니다. 전체 목록에서 사용하는 장비를 선택해 주세요.'
                : '조건에 맞는 장비가 없습니다.'}
            {totalSelectedCount > 0
              ? ` 기존에 선택한 장비 ${totalSelectedCount}개는 그대로 유지됩니다.`
              : ''}
          </p>
          <button
            type="button"
            className="btn-secondary inventory-empty-reset-btn"
            onClick={() => {
              resetViewControls();
              searchInputRef.current?.focus();
            }}
          >
            전체 항목 다시 보기
          </button>
        </div>
      ) : (
        <>
          {showEquipmentFieldset && (
            <fieldset className="inventory-fieldset">
              <legend className="inventory-fieldset__legend">기구 · 여러 개 선택</legend>
              <div className="inventory-fieldset__toolbar">
                <span className="inventory-fieldset__meta">
                  선택 {selectedEquipmentOptions.length}/{EQUIPMENT_OPTIONS.length}
                  {hasTrimmedSearch || filterMode === 'selected'
                    ? ` · 표시 ${visibleEquipmentOptions.length}개`
                    : ''}
                </span>
                <button
                  type="button"
                  className="inventory-collapse-btn"
                  aria-expanded={!equipmentCollapsed}
                  aria-controls={equipmentCollapsed ? undefined : equipmentGridId}
                  onClick={() => setEquipmentCollapsed((prev) => !prev)}
                >
                  <span>{equipmentCollapsed ? '기구 목록 펼치기' : '기구 목록 접기'}</span>
                  <ChevronDown
                    size={16}
                    aria-hidden="true"
                    className={`inventory-collapse-icon${equipmentCollapsed ? ' is-collapsed' : ''}`}
                  />
                </button>
              </div>
              {equipmentCollapsed ? (
                <p
                  className="inventory-collapsed-summary"
                  data-testid="inventory-equipment-collapsed-summary"
                >
                  {selectedEquipmentOptions.length > 0
                    ? `접힘 · 선택된 기구: ${selectedEquipmentOptions.map((item) => item.labelKo).join(', ')}`
                    : '접힘 · 선택된 기구 없음'}
                  {hasTrimmedSearch ? ` (검색 일치 ${visibleEquipmentOptions.length}개)` : ''}
                </p>
              ) : (
                <div id={equipmentGridId} className="equipment-choice-grid">
                  {visibleEquipmentOptions.map((item) => (
                    <EquipmentChoice
                      key={item.id}
                      equipmentId={item.id}
                      label={item.labelKo}
                      checked={ownedEquipment.includes(item.id)}
                      onChange={() => toggleOwnedEquipment(item.id)}
                    />
                  ))}
                </div>
              )}
            </fieldset>
          )}

          {showPropsFieldset && (
            <fieldset className="inventory-fieldset">
              <legend className="inventory-fieldset__legend">소도구 · 여러 개 선택</legend>
              <div className="inventory-fieldset__toolbar">
                <span className="inventory-fieldset__meta">
                  선택 {selectedPropOptions.length}/{SELECTABLE_PROP_OPTIONS.length}
                  {hasTrimmedSearch || filterMode === 'selected'
                    ? ` · 표시 ${visiblePropOptions.length}개`
                    : ''}
                </span>
                <button
                  type="button"
                  className="inventory-collapse-btn"
                  aria-expanded={!propsCollapsed}
                  aria-controls={propsCollapsed ? undefined : propsGridId}
                  onClick={() => setPropsCollapsed((prev) => !prev)}
                >
                  <span>{propsCollapsed ? '소도구 목록 펼치기' : '소도구 목록 접기'}</span>
                  <ChevronDown
                    size={16}
                    aria-hidden="true"
                    className={`inventory-collapse-icon${propsCollapsed ? ' is-collapsed' : ''}`}
                  />
                </button>
              </div>
              {propsCollapsed ? (
                <p
                  className="inventory-collapsed-summary"
                  data-testid="inventory-props-collapsed-summary"
                >
                  {selectedPropOptions.length > 0
                    ? `접힘 · 선택된 소도구: ${selectedPropOptions.map((item) => item.labelKo).join(', ')}`
                    : '접힘 · 선택된 소도구 없음'}
                  {hasTrimmedSearch ? ` (검색 일치 ${visiblePropOptions.length}개)` : ''}
                </p>
              ) : (
                <div id={propsGridId} className="equipment-choice-grid">
                  {visiblePropOptions.map((item) => (
                    <EquipmentChoice
                      key={item.id}
                      equipmentId={item.id}
                      label={item.labelKo}
                      checked={ownedProps.includes(item.id)}
                      onChange={() => toggleOwnedProp(item.id)}
                    />
                  ))}
                </div>
              )}
            </fieldset>
          )}
        </>
      )}

      <p className="muted">
        그림은 종류를 구별하기 위한 간단한 도해입니다. 모델에 따라 형태가 다를 수 있어요. 분류를
        지원한다는 뜻이며, 모든 종류의 운동 영상이 검토되었다는 뜻은 아닙니다. 무게·장력·모델은 수업
        전 별도로 확인해 주세요.
      </p>
    </section>
  );
}
