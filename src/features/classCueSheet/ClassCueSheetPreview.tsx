import React, { useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  CLASS_CUE_SHEET_FIXTURES,
  getCueSheetFixtureById,
} from './classCueSheetFixtures';
import { buildClassCueSheetProjection } from './classCueSheetProjection';
import type {
  ClassCueSheetItem,
  ClassCueSheetProjection,
  CueSheetFixtureEntry,
  CueSheetItemOriginKind,
  CueSheetProjectionOptions,
  CueSheetSourceInput,
} from './classCueSheetTypes';
import './classCueSheet.css';

export type CueSheetSelectionResolution =
  | 'initial'
  | 'user-navigation'
  | 'preserved-by-id'
  | 'fallback-adjacent-after-delete'
  | 'reset-on-class-change'
  | 'empty-class';

export type CueSheetTextScale = 100 | 125 | 150 | 200;

export interface ClassCueSheetPreviewProps {
  readonly projection?: ClassCueSheetProjection;
  readonly sourceInput?: CueSheetSourceInput;
  readonly projectionOptions?: CueSheetProjectionOptions;
  readonly initialFixtureId?: CueSheetFixtureEntry['fixtureId'];
  readonly initialStepIndex?: number;
  readonly initialViewMode?: 'compact' | 'expanded';
  readonly initialPrintPreviewMode?: boolean;
  readonly showFixtureSwitcher?: boolean;
  readonly initialFullListOpen?: boolean;
  readonly initialDiagnosticsOpen?: boolean;
  readonly initialTextScale?: CueSheetTextScale;
}

interface SelectionTrackerState {
  readonly projection: ClassCueSheetProjection;
  readonly currentIndex: number;
  readonly currentCueItemId: string | null;
  readonly currentSourceStepId: string | null;
  readonly currentItemNameKo: string | null;
  readonly resolution: CueSheetSelectionResolution;
  readonly removedItemNameKo: string | null;
}

const TEXT_SCALE_OPTIONS: readonly {
  readonly scale: CueSheetTextScale;
  readonly label: string;
  readonly ariaLabel: string;
}[] = [
  { scale: 100, label: '100%', ariaLabel: '글자 크기 100% 기본' },
  { scale: 125, label: '125%', ariaLabel: '글자 크기 125% 확대' },
  { scale: 150, label: '150%', ariaLabel: '글자 크기 150% 확대' },
  { scale: 200, label: '200%', ariaLabel: '글자 크기 200% 최대 확대' },
];

function isExplicitSourceId(sourceId: string): boolean {
  const trimmed = sourceId.trim();
  return (
    trimmed.length > 0 &&
    trimmed !== 'cue-source-unspecified' &&
    trimmed !== 'recovered-empty'
  );
}

function isAutoPositionalStepId(sourceStepId: string): boolean {
  return /^step-\d{3,}$/.test(sourceStepId);
}

function createInitialSelectionState(
  projection: ClassCueSheetProjection,
  initialStepIndex: number,
): SelectionTrackerState {
  const items = projection.items;
  if (items.length === 0) {
    return {
      projection,
      currentIndex: 0,
      currentCueItemId: null,
      currentSourceStepId: null,
      currentItemNameKo: null,
      resolution: 'empty-class',
      removedItemNameKo: null,
    };
  }
  const safeInitial = Math.min(
    Math.max(0, Math.trunc(initialStepIndex || 0)),
    items.length - 1,
  );
  const item = items[safeInitial]!;
  return {
    projection,
    currentIndex: safeInitial,
    currentCueItemId: item.cueItemId,
    currentSourceStepId: item.sourceStepId,
    currentItemNameKo: item.nameKo,
    resolution: 'initial',
    removedItemNameKo: null,
  };
}

function reconcileSelectionState(
  prev: SelectionTrackerState,
  nextProjection: ClassCueSheetProjection,
): SelectionTrackerState {
  if (prev.projection === nextProjection) {
    return prev;
  }

  const nextItems = nextProjection.items;
  if (nextItems.length === 0) {
    return {
      projection: nextProjection,
      currentIndex: 0,
      currentCueItemId: null,
      currentSourceStepId: null,
      currentItemNameKo: null,
      resolution: 'empty-class',
      removedItemNameKo: null,
    };
  }

  const prevProjection = prev.projection;
  const prevItems = prevProjection.items;

  if (prevItems.length === 0) {
    const firstItem = nextItems[0]!;
    return {
      projection: nextProjection,
      currentIndex: 0,
      currentCueItemId: firstItem.cueItemId,
      currentSourceStepId: firstItem.sourceStepId,
      currentItemNameKo: firstItem.nameKo,
      resolution: 'reset-on-class-change',
      removedItemNameKo: null,
    };
  }

  const prevHasExplicitSource = isExplicitSourceId(prevProjection.sourceId);
  const nextHasExplicitSource = isExplicitSourceId(nextProjection.sourceId);

  if (
    prevHasExplicitSource &&
    nextHasExplicitSource &&
    prevProjection.sourceId !== nextProjection.sourceId
  ) {
    const firstItem = nextItems[0]!;
    return {
      projection: nextProjection,
      currentIndex: 0,
      currentCueItemId: firstItem.cueItemId,
      currentSourceStepId: firstItem.sourceStepId,
      currentItemNameKo: firstItem.nameKo,
      resolution: 'reset-on-class-change',
      removedItemNameKo: null,
    };
  }

  // 1. Primary match by stable cueItemId
  let matchedIndex = prev.currentCueItemId
    ? nextItems.findIndex((item) => item.cueItemId === prev.currentCueItemId)
    : -1;

  // 2. Secondary match by explicit unique sourceStepId if custom projection changed cueItemId
  if (
    matchedIndex === -1 &&
    prev.currentSourceStepId &&
    !isAutoPositionalStepId(prev.currentSourceStepId)
  ) {
    const matchingStepIdIndices: number[] = [];
    for (let i = 0; i < nextItems.length; i += 1) {
      if (nextItems[i]!.sourceStepId === prev.currentSourceStepId) {
        matchingStepIdIndices.push(i);
      }
    }
    if (matchingStepIdIndices.length === 1) {
      matchedIndex = matchingStepIdIndices[0]!;
    }
  }

  if (matchedIndex !== -1) {
    const matchedItem = nextItems[matchedIndex]!;
    return {
      projection: nextProjection,
      currentIndex: matchedIndex,
      currentCueItemId: matchedItem.cueItemId,
      currentSourceStepId: matchedItem.sourceStepId,
      currentItemNameKo: matchedItem.nameKo,
      resolution: 'preserved-by-id',
      removedItemNameKo: null,
    };
  }

  // Active item was not found in nextItems. Check whether this is the same class with the current item deleted,
  // or a replacement with a completely different class.
  const prevCueIds = new Set(prevItems.map((item) => item.cueItemId));
  const prevExplicitStepIds = new Set(
    prevItems
      .map((item) => item.sourceStepId)
      .filter((id) => !isAutoPositionalStepId(id)),
  );

  const hasSharedItems = nextItems.some(
    (item) =>
      prevCueIds.has(item.cueItemId) ||
      (!isAutoPositionalStepId(item.sourceStepId) &&
        prevExplicitStepIds.has(item.sourceStepId)),
  );
  const hasSameExplicitSource =
    prevHasExplicitSource &&
    nextHasExplicitSource &&
    prevProjection.sourceId === nextProjection.sourceId;

  if (hasSharedItems || hasSameExplicitSource) {
    const clampedIndex = Math.min(
      Math.max(0, prev.currentIndex),
      nextItems.length - 1,
    );
    const fallbackItem = nextItems[clampedIndex]!;
    return {
      projection: nextProjection,
      currentIndex: clampedIndex,
      currentCueItemId: fallbackItem.cueItemId,
      currentSourceStepId: fallbackItem.sourceStepId,
      currentItemNameKo: fallbackItem.nameKo,
      resolution: 'fallback-adjacent-after-delete',
      removedItemNameKo: prev.currentItemNameKo,
    };
  }

  const firstItem = nextItems[0]!;
  return {
    projection: nextProjection,
    currentIndex: 0,
    currentCueItemId: firstItem.cueItemId,
    currentSourceStepId: firstItem.sourceStepId,
    currentItemNameKo: firstItem.nameKo,
    resolution: 'reset-on-class-change',
    removedItemNameKo: null,
  };
}

function getOriginBadgeLabelKo(originKind: CueSheetItemOriginKind): string {
  switch (originKind) {
    case 'name-only':
      return '이름만 입력된 새 동작';
    case 'human-draft':
      return '사용자 초안 동작';
    case 'snapshot':
      return '스냅샷 동작';
    case 'rest':
      return '휴식 구간';
    case 'recovered-invalid':
      return '복구된 입력 항목';
    case 'catalog':
    default:
      return '카탈로그 동작';
  }
}

function formatStepNumber(order: number): string {
  return String(Math.max(0, order)).padStart(2, '0');
}

function renderItemCueBlock(item: ClassCueSheetItem): React.ReactNode {
  const { cueContent } = item;
  const noteClassName = cueContent.isLongCue
    ? 'cue-sheet-note cue-sheet-long-note'
    : 'cue-sheet-note';

  if (!cueContent.hasCues) {
    const emptyText = cueContent.emptyCueLabelKo.includes('작성된 큐 메모 없음')
      ? cueContent.emptyCueLabelKo
      : `${cueContent.emptyCueLabelKo} (작성된 큐 메모 없음)`;
    return (
      <p className="cue-sheet-note" data-testid={`empty-cue-${item.cueItemId}`}>
        {emptyText}
      </p>
    );
  }

  return (
    <div className={cueContent.isLongCue ? 'cue-sheet-long-note' : undefined}>
      {cueContent.cues.length > 0 && (
        <ul
          className="cue-sheet-cue-list"
          aria-label={`${item.nameKo} 티칭 큐 목록`}
        >
          {cueContent.cues.map((cueText, cueIdx) => (
            <li
              key={`${item.cueItemId}-cue-${cueIdx}`}
              className="cue-sheet-cue-text"
            >
              {cueText}
            </li>
          ))}
        </ul>
      )}
      {cueContent.layerCue && (
        <p className={noteClassName}>레이어 큐: {cueContent.layerCue}</p>
      )}
      {cueContent.breathPattern && (
        <p className={noteClassName}>호흡: {cueContent.breathPattern}</p>
      )}
      {cueContent.instructorNote && (
        <p className={noteClassName}>강사 메모: {cueContent.instructorNote}</p>
      )}
      {cueContent.precautions && (
        <p className={noteClassName}>주의사항: {cueContent.precautions}</p>
      )}
    </div>
  );
}

const EDITABLE_KEYBOARD_TARGET_SELECTOR =
  'input, textarea, select, [contenteditable=""], [contenteditable="true"], [contenteditable="plaintext-only"], [contenteditable]:not([contenteditable="false"]), [role="textbox"], [role="searchbox"], [role="combobox"]';

function isEditableKeyboardTarget(target: EventTarget | null): boolean {
  if (!target || !(target instanceof Element)) {
    return false;
  }
  if (target instanceof HTMLElement && target.isContentEditable) {
    return true;
  }
  if (target.closest(EDITABLE_KEYBOARD_TARGET_SELECTOR) !== null) {
    return true;
  }
  let cur: HTMLElement | null =
    target instanceof HTMLElement ? target.parentElement : null;
  while (cur) {
    if (cur.isContentEditable) {
      return true;
    }
    cur = cur.parentElement;
  }
  return false;
}

export const ClassCueSheetPreview: React.FC<ClassCueSheetPreviewProps> = ({
  projection,
  sourceInput,
  projectionOptions,
  initialFixtureId = 'standard-mixed',
  initialStepIndex = 0,
  initialViewMode = 'compact',
  initialPrintPreviewMode = false,
  showFixtureSwitcher,
  initialFullListOpen = false,
  initialDiagnosticsOpen = false,
  initialTextScale = 100,
}) => {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const focusDeckRef = useRef<HTMLDivElement | null>(null);
  const hadFocusInsideRootRef = useRef<boolean>(false);
  const focusedElementRef = useRef<HTMLElement | null>(null);

  const shouldShowFixtureSwitcher =
    showFixtureSwitcher ??
    (projection === undefined && sourceInput === undefined);

  const [selectedFixtureId, setSelectedFixtureId] =
    useState<CueSheetFixtureEntry['fixtureId']>(initialFixtureId);
  const [viewMode, setViewMode] = useState<'compact' | 'expanded'>(
    initialViewMode,
  );
  const [printPreviewMode, setPrintPreviewMode] = useState<boolean>(
    initialPrintPreviewMode,
  );
  const [isFullListOpen, setIsFullListOpen] =
    useState<boolean>(initialFullListOpen);
  const [isDiagnosticsOpen, setIsDiagnosticsOpen] = useState<boolean>(
    initialDiagnosticsOpen,
  );
  const [textScale, setTextScale] =
    useState<CueSheetTextScale>(initialTextScale);

  const activeProjection = useMemo<ClassCueSheetProjection>(() => {
    if (projection !== undefined) {
      return projection;
    }
    if (sourceInput !== undefined) {
      return buildClassCueSheetProjection(sourceInput, projectionOptions);
    }
    const fixture =
      getCueSheetFixtureById(selectedFixtureId) ?? CLASS_CUE_SHEET_FIXTURES[0];
    return fixture.buildProjection();
  }, [projection, sourceInput, projectionOptions, selectedFixtureId]);

  const [selectionState, setSelectionState] = useState<SelectionTrackerState>(
    () => createInitialSelectionState(activeProjection, initialStepIndex),
  );

  const effectiveSelection =
    selectionState.projection === activeProjection
      ? selectionState
      : reconcileSelectionState(selectionState, activeProjection);

  if (selectionState.projection !== activeProjection) {
    setSelectionState(effectiveSelection);
  }

  const totalItems = activeProjection.items.length;
  const maxStepIndex = Math.max(0, totalItems - 1);
  const currentIndex =
    totalItems === 0
      ? 0
      : Math.min(Math.max(0, effectiveSelection.currentIndex), maxStepIndex);
  const selectionResolution = effectiveSelection.resolution;
  const removedItemNameKo = effectiveSelection.removedItemNameKo;

  const currentItem =
    totalItems > 0 ? activeProjection.items[currentIndex] : undefined;
  const nextItem =
    totalItems > 0 && currentIndex + 1 < totalItems
      ? activeProjection.items[currentIndex + 1]
      : undefined;

  useLayoutEffect(() => {
    if (!hadFocusInsideRootRef.current) {
      return;
    }
    const rootEl = rootRef.current;
    const deckEl = focusDeckRef.current;
    if (!rootEl || !deckEl) {
      return;
    }
    const activeEl = document.activeElement;
    if (activeEl && rootEl.contains(activeEl)) {
      if (activeEl instanceof HTMLElement) {
        focusedElementRef.current = activeEl;
      }
      return;
    }
    if (activeEl && activeEl !== document.body && !rootEl.contains(activeEl)) {
      hadFocusInsideRootRef.current = false;
      focusedElementRef.current = null;
      return;
    }
    const lastFocusedEl = focusedElementRef.current;
    const lostFocusDueToUnmountOrDisable =
      lastFocusedEl !== null &&
      (!rootEl.contains(lastFocusedEl) ||
        (lastFocusedEl as HTMLButtonElement).disabled === true);
    if (lostFocusDueToUnmountOrDisable) {
      deckEl.focus({ preventScroll: true });
      focusedElementRef.current = deckEl;
    } else {
      hadFocusInsideRootRef.current = false;
      focusedElementRef.current = null;
    }
  });

  const selectStepByIndex = (
    nextIdx: number,
    resolution: CueSheetSelectionResolution = 'user-navigation',
  ) => {
    if (totalItems === 0) {
      return;
    }
    const clamped = Math.min(Math.max(0, nextIdx), maxStepIndex);
    const targetItem = activeProjection.items[clamped]!;
    setSelectionState({
      projection: activeProjection,
      currentIndex: clamped,
      currentCueItemId: targetItem.cueItemId,
      currentSourceStepId: targetItem.sourceStepId,
      currentItemNameKo: targetItem.nameKo,
      resolution,
      removedItemNameKo: null,
    });
  };

  const selectByCueItemId = (cueItemId: string) => {
    const idx = activeProjection.items.findIndex(
      (item) => item.cueItemId === cueItemId,
    );
    if (idx !== -1) {
      selectStepByIndex(idx, 'user-navigation');
    }
  };

  const transferFocusToDeckIfBoundary = (willDisableButton: boolean) => {
    hadFocusInsideRootRef.current = true;
    if (willDisableButton && focusDeckRef.current) {
      focusDeckRef.current.focus({ preventScroll: true });
      focusedElementRef.current = focusDeckRef.current;
    }
  };

  const handleSelectFixture = (
    nextFixtureId: CueSheetFixtureEntry['fixtureId'],
  ) => {
    setSelectedFixtureId(nextFixtureId);
  };

  const handleGoFirst = () => {
    if (totalItems === 0) {
      return;
    }
    transferFocusToDeckIfBoundary(true);
    selectStepByIndex(0, 'user-navigation');
  };

  const handleGoPrev = () => {
    if (totalItems === 0) {
      return;
    }
    const targetIndex = Math.max(0, currentIndex - 1);
    transferFocusToDeckIfBoundary(targetIndex === 0);
    selectStepByIndex(targetIndex, 'user-navigation');
  };

  const handleGoNext = () => {
    if (totalItems === 0) {
      return;
    }
    const targetIndex = Math.min(maxStepIndex, currentIndex + 1);
    transferFocusToDeckIfBoundary(targetIndex >= maxStepIndex);
    selectStepByIndex(targetIndex, 'user-navigation');
  };

  const handleGoLast = () => {
    if (totalItems === 0) {
      return;
    }
    transferFocusToDeckIfBoundary(true);
    selectStepByIndex(maxStepIndex, 'user-navigation');
  };

  const handleDeckKeyDown = (event: React.KeyboardEvent<HTMLElement>) => {
    if (totalItems === 0 || event.defaultPrevented) {
      return;
    }
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) {
      return;
    }
    const nativeEvt = event.nativeEvent as KeyboardEvent & {
      isComposing?: boolean;
      keyCode?: number;
    };
    const syntheticComposing = (
      event as unknown as { isComposing?: boolean; keyCode?: number }
    ).isComposing;
    if (
      Boolean(nativeEvt?.isComposing) ||
      Boolean(syntheticComposing) ||
      nativeEvt?.keyCode === 229 ||
      event.keyCode === 229 ||
      event.key === 'Process'
    ) {
      return;
    }
    if (
      isEditableKeyboardTarget(event.target) ||
      isEditableKeyboardTarget(document.activeElement)
    ) {
      return;
    }
    if (
      event.key === 'ArrowLeft' ||
      event.key === 'ArrowUp' ||
      event.key === 'k' ||
      event.key === 'p'
    ) {
      event.preventDefault();
      selectStepByIndex(Math.max(0, currentIndex - 1), 'user-navigation');
    } else if (
      event.key === 'ArrowRight' ||
      event.key === 'ArrowDown' ||
      event.key === 'j' ||
      event.key === 'n'
    ) {
      event.preventDefault();
      selectStepByIndex(
        Math.min(maxStepIndex, currentIndex + 1),
        'user-navigation',
      );
    } else if (event.key === 'Home') {
      event.preventDefault();
      selectStepByIndex(0, 'user-navigation');
    } else if (event.key === 'End') {
      event.preventDefault();
      selectStepByIndex(maxStepIndex, 'user-navigation');
    }
  };

  const handleRootFocusCapture = (event: React.FocusEvent<HTMLDivElement>) => {
    hadFocusInsideRootRef.current = true;
    if (event.target instanceof HTMLElement) {
      focusedElementRef.current = event.target;
    }
  };

  const handleRootBlurCapture = (event: React.FocusEvent<HTMLDivElement>) => {
    const nextFocused = event.relatedTarget;
    if (nextFocused instanceof Node) {
      if (rootRef.current && !rootRef.current.contains(nextFocused)) {
        hadFocusInsideRootRef.current = false;
        focusedElementRef.current = null;
      }
      return;
    }
    queueMicrotask(() => {
      const rootEl = rootRef.current;
      if (!rootEl) {
        return;
      }
      const activeEl = document.activeElement;
      if (!activeEl || !rootEl.contains(activeEl)) {
        hadFocusInsideRootRef.current = false;
        focusedElementRef.current = null;
      }
    });
  };

  const firstExpandedRowIdForCurrent = currentItem
    ? activeProjection.expandedRows.find(
        (r) => r.parentCueItemId === currentItem.cueItemId,
      )?.expandedRowId
    : undefined;

  const rootClassName = [
    'class-cue-sheet-root',
    printPreviewMode ? 'is-print-preview' : '',
  ]
    .filter(Boolean)
    .join(' ');

  const isFullListCollapsedScreen = !isFullListOpen && !printPreviewMode;
  const isDiagnosticsCollapsedScreen = !isDiagnosticsOpen && !printPreviewMode;

  return (
    <div
      ref={rootRef}
      className={rootClassName}
      data-testid="class-cue-sheet-root"
      data-print-preview={printPreviewMode ? 'true' : 'false'}
      data-current-cue-item-id={currentItem?.cueItemId ?? ''}
      data-current-step-index={currentItem ? String(currentIndex) : '-1'}
      data-selection-resolution={selectionResolution}
      data-text-scale={String(textScale)}
      data-full-list-open={isFullListOpen ? 'true' : 'false'}
      data-diagnostics-open={isDiagnosticsOpen ? 'true' : 'false'}
      data-reduced-motion="respected"
      data-mandatory-review-gate="false"
      style={
        {
          '--cue-sheet-font-scale': String(textScale / 100),
        } as React.CSSProperties
      }
      onFocusCapture={handleRootFocusCapture}
      onBlurCapture={handleRootBlurCapture}
    >
      {/* 1. Compact Header & Text Scale Bar */}
      <header
        className="cue-sheet-compact-header"
        data-testid="cue-sheet-compact-header"
        aria-label="수업 진행 헤더 및 글자 크기 설정"
      >
        <div className="cue-sheet-compact-header-main">
          <div>
            <h1 className="cue-sheet-title">{activeProjection.title}</h1>
            {activeProjection.subtitle && (
              <p className="cue-sheet-subtitle">{activeProjection.subtitle}</p>
            )}
          </div>
          <div className="cue-sheet-badge-row">
            <span className="cue-sheet-badge">
              기구: {activeProjection.apparatusLabelKo}
            </span>
            <span className="cue-sheet-badge">
              난이도: {activeProjection.levelLabelKo}
            </span>
            <span
              className="cue-sheet-badge"
              data-testid="no-mandatory-gate-badge"
            >
              필수 검토 게이트 없음 · 즉시 진행 가능
            </span>
            {activeProjection.truncation.isTruncated && (
              <span
                className="cue-sheet-badge is-warning"
                data-testid="cue-sheet-header-truncation-badge"
              >
                상한 적용됨 (세부 안내 확인)
              </span>
            )}
          </div>
        </div>

        <div
          className="cue-sheet-scale-controls cue-sheet-no-print"
          role="group"
          aria-label="글자 크기 확대 설정"
          data-testid="cue-sheet-text-scale-group"
        >
          <span className="cue-sheet-scale-label">글자 크기:</span>
          {TEXT_SCALE_OPTIONS.map((opt) => {
            const isSelected = textScale === opt.scale;
            return (
              <button
                key={opt.scale}
                type="button"
                className={`cue-sheet-btn ${isSelected ? 'is-active' : ''}`}
                aria-pressed={isSelected}
                aria-label={opt.ariaLabel}
                data-testid={`cue-sheet-scale-${opt.scale}`}
                onClick={() => setTextScale(opt.scale)}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </header>

      {/* 2. Primary Live Focus Deck */}
      <div
        ref={focusDeckRef}
        className="cue-sheet-focus-deck"
        data-testid="cue-sheet-focus-deck"
        tabIndex={0}
        aria-label="현재 및 다음 진행 포커스 데크"
        onKeyDown={handleDeckKeyDown}
      >
        <div className="cue-sheet-focus-controls cue-sheet-no-print">
          <strong>
            진행 포커스 이동 (방향키 좌·우·상·하 / Home·End 지원)
          </strong>
          <div className="cue-sheet-badge-row">
            <button
              type="button"
              className="cue-sheet-btn"
              aria-label="첫 진행 항목으로 이동"
              data-testid="cue-sheet-nav-first"
              disabled={totalItems === 0 || currentIndex === 0}
              onClick={handleGoFirst}
            >
              처음 항목으로
            </button>
            <button
              type="button"
              className="cue-sheet-btn"
              aria-label="이전 진행 항목"
              data-testid="cue-sheet-nav-prev"
              disabled={totalItems === 0 || currentIndex === 0}
              onClick={handleGoPrev}
            >
              이전 항목
            </button>
            <button
              type="button"
              className="cue-sheet-btn"
              aria-label="다음 진행 항목"
              data-testid="cue-sheet-nav-next"
              disabled={totalItems === 0 || currentIndex >= totalItems - 1}
              onClick={handleGoNext}
            >
              다음 항목
            </button>
            <button
              type="button"
              className="cue-sheet-btn"
              aria-label="마지막 진행 항목으로 이동"
              data-testid="cue-sheet-nav-last"
              disabled={totalItems === 0 || currentIndex >= totalItems - 1}
              onClick={handleGoLast}
            >
              마지막 항목으로
            </button>
          </div>
        </div>

        <p
          className="cue-sheet-meta-line"
          data-testid="cue-sheet-a11y-status"
          role="status"
          aria-live="polite"
          aria-atomic="true"
        >
          {!currentItem
            ? '현재 진행 항목 없음 (0/0) · 다음 준비 항목 없음'
            : `현재 진행: #${formatStepNumber(currentItem.order)}/${formatStepNumber(totalItems)} ${currentItem.nameKo}${
                currentItem.duplicateDisambiguatorKo
                  ? ` (${currentItem.duplicateDisambiguatorKo})`
                  : ''
              } · 다음 준비: ${
                nextItem
                  ? `#${formatStepNumber(nextItem.order)} ${nextItem.nameKo}`
                  : '없음 (마지막 항목)'
              }${
                selectionResolution === 'fallback-adjacent-after-delete'
                  ? ` · 이전 선택 항목${
                      removedItemNameKo ? `(${removedItemNameKo})` : ''
                    } 삭제됨, 인접 항목으로 위치 유지`
                  : ''
              }`}
        </p>

        {selectionResolution === 'fallback-adjacent-after-delete' &&
          currentItem && (
            <div
              className="cue-sheet-selection-fallback-notice"
              data-testid="cue-sheet-selection-fallback-notice"
              role="note"
            >
              {`이전 선택 항목${
                removedItemNameKo ? `(${removedItemNameKo})` : ''
              }이 편집으로 삭제되어 인접 항목(#${formatStepNumber(
                currentItem.order,
              )} ${currentItem.nameKo})으로 위치를 유지했습니다.`}
            </div>
          )}

        {activeProjection.isEmpty && (
          <div
            className="cue-sheet-empty-state"
            data-testid="cue-sheet-empty-state"
          >
            <p className="cue-sheet-title">
              수업 진행 항목이 비어 있습니다 (0개 항목)
            </p>
            <p className="cue-sheet-subtitle">
              시퀀스에 동작이나 휴식 구간이 등록되면 현재 동작과 다음 준비 동작,
              순서·세팅·큐가 이곳에 표시됩니다. (필수 검토 게이트 없음)
            </p>
          </div>
        )}

        <div className="cue-sheet-focus-grid">
          <section
            aria-label="현재 진행 항목"
            className="cue-sheet-focus-card is-current"
            data-testid="cue-sheet-current-card"
          >
            <div className="cue-sheet-badge-row">
              <span className="cue-sheet-badge is-emphasis">현재 진행 항목</span>
              {currentItem && (
                <span className="cue-sheet-badge">
                  {formatStepNumber(currentItem.order)} /{' '}
                  {formatStepNumber(totalItems)}
                </span>
              )}
              {currentItem && (
                <span className="cue-sheet-badge">
                  {getOriginBadgeLabelKo(currentItem.originKind)}
                </span>
              )}
              {currentItem?.isDuplicateName &&
                currentItem.duplicateDisambiguatorKo && (
                  <span className="cue-sheet-badge is-warning">
                    {currentItem.duplicateDisambiguatorKo}
                  </span>
                )}
            </div>

            {!currentItem ? (
              <p className="cue-sheet-note">
                등록된 수업 진행 항목이 없습니다.
              </p>
            ) : (
              <>
                <h2 className="cue-sheet-title">{currentItem.nameKo}</h2>
                <div className="cue-sheet-badge-row">
                  <span className="cue-sheet-badge">
                    {currentItem.blockMeta.sectionLabelKo}
                  </span>
                  {currentItem.blockMeta.blockCategoryLabelKo && (
                    <span className="cue-sheet-badge">
                      {currentItem.blockMeta.blockCategoryLabelKo}
                    </span>
                  )}
                  {currentItem.blockMeta.blockPathTitles.length > 0 && (
                    <span className="cue-sheet-badge">
                      블록: {currentItem.blockMeta.blockPathTitles.join(' › ')}
                    </span>
                  )}
                  {currentItem.blockMeta.blockRepetitionCount > 1 && (
                    <span className="cue-sheet-badge">
                      블록 반복 {currentItem.blockMeta.blockRepetitionIndex}/
                      {currentItem.blockMeta.blockRepetitionCount}
                    </span>
                  )}
                  <span className="cue-sheet-badge">
                    {currentItem.practice.sideBadgeKo}
                  </span>
                  <span
                    className={`cue-sheet-badge ${
                      currentItem.timing.status === 'unspecified'
                        ? 'is-warning'
                        : ''
                    }`}
                  >
                    {currentItem.timing.displayLabelKo}
                  </span>
                </div>
                <p className="cue-sheet-meta-line">
                  수행: {currentItem.practice.practiceSummaryKo} · 시간 상세:{' '}
                  {currentItem.timing.detailLabelKo}
                </p>
                <p className="cue-sheet-meta-line">
                  세팅: {currentItem.setup.setupSummaryKo}
                </p>
                {renderItemCueBlock(currentItem)}
              </>
            )}
          </section>

          <section
            aria-label="다음 준비 항목"
            className="cue-sheet-focus-card"
            data-testid="cue-sheet-next-card"
          >
            <div className="cue-sheet-badge-row">
              <span className="cue-sheet-badge">다음 준비 항목</span>
              {nextItem && (
                <span className="cue-sheet-badge">
                  #{formatStepNumber(nextItem.order)}
                </span>
              )}
              {nextItem?.isDuplicateName &&
                nextItem.duplicateDisambiguatorKo && (
                  <span className="cue-sheet-badge is-warning">
                    {nextItem.duplicateDisambiguatorKo}
                  </span>
                )}
            </div>

            {!nextItem ? (
              <p className="cue-sheet-note">
                마지막 항목입니다 · 다음 예정 항목 없음
              </p>
            ) : (
              <>
                <h3 className="cue-sheet-title">{nextItem.nameKo}</h3>
                <div className="cue-sheet-badge-row">
                  <span className="cue-sheet-badge">
                    {nextItem.practice.sideBadgeKo}
                  </span>
                  <span
                    className={`cue-sheet-badge ${
                      nextItem.timing.status === 'unspecified'
                        ? 'is-warning'
                        : ''
                    }`}
                  >
                    {nextItem.timing.displayLabelKo}
                  </span>
                </div>
                <p className="cue-sheet-meta-line">
                  수행: {nextItem.practice.practiceSummaryKo}
                </p>
                <p className="cue-sheet-meta-line">
                  세팅: {nextItem.setup.setupSummaryKo}
                </p>
                <p className="cue-sheet-note">
                  {nextItem.cueContent.cues[0] ??
                    (nextItem.cueContent.instructorNote ||
                      nextItem.cueContent.emptyCueLabelKo)}
                </p>
              </>
            )}
          </section>
        </div>
      </div>

      {/* 4. Truncation Banner */}
      {activeProjection.truncation.isTruncated && (
        <section
          role="region"
          aria-label="진행표 잘림 및 상한 안내"
          className="cue-sheet-truncation-banner"
          data-testid="cue-sheet-truncation-banner"
        >
          <h2 className="cue-sheet-truncation-title">
            진행표 상한 적용 및 생략 안내 (임의 숨김 없음)
          </h2>
          <p className="cue-sheet-meta-line">
            생략된 입력 항목: {activeProjection.truncation.omittedInputItemCount}개 ·
            생략된 펼침 행: {activeProjection.truncation.omittedExpandedRowCount}개 ·
            반복 상한 적용 블록:{' '}
            {activeProjection.truncation.cappedBlockRepetitionCount}개 · 중첩 깊이
            상한 적용: {activeProjection.truncation.cappedDepthCount}건 · 차단된 순환
            참조: {activeProjection.truncation.circularReferenceCount}건
          </p>
          <ul className="cue-sheet-truncation-list">
            {activeProjection.truncation.reasonsKo.map((reason, idx) => (
              <li key={`truncation-reason-${idx}`}>{reason}</li>
            ))}
          </ul>
        </section>
      )}

      {/* 5. Collapsible Full Progression List */}
      <section
        aria-label="전체 수업 진행표"
        className="cue-sheet-progression-section"
        data-testid="cue-sheet-progression-section"
      >
        <div className="cue-sheet-view-toolbar cue-sheet-no-print">
          <button
            type="button"
            className={`cue-sheet-btn cue-sheet-disclosure-btn ${
              isFullListOpen ? 'is-active' : ''
            }`}
            data-testid="cue-sheet-full-list-toggle"
            aria-expanded={isFullListOpen}
            aria-controls="cue-sheet-full-list-panel"
            onClick={() => setIsFullListOpen((prev) => !prev)}
          >
            전체 진행표 {isFullListOpen ? '접기' : '펼치기'} (
            {activeProjection.itemCount}개 항목)
          </button>

          <div
            className="cue-sheet-view-buttons"
            role="group"
            aria-label="진행표 보기 모드"
          >
            <button
              type="button"
              className={`cue-sheet-btn ${
                viewMode === 'compact' ? 'is-active' : ''
              }`}
              aria-pressed={viewMode === 'compact'}
              onClick={() => {
                setViewMode('compact');
                setIsFullListOpen(true);
              }}
            >
              기본 진행표 ({activeProjection.items.length})
            </button>
            <button
              type="button"
              className={`cue-sheet-btn ${
                viewMode === 'expanded' ? 'is-active' : ''
              }`}
              aria-pressed={viewMode === 'expanded'}
              onClick={() => {
                setViewMode('expanded');
                setIsFullListOpen(true);
              }}
            >
              반복·좌우 펼침 진행표 ({activeProjection.expandedRows.length})
            </button>
          </div>

          <button
            type="button"
            className={`cue-sheet-btn ${printPreviewMode ? 'is-active' : ''}`}
            aria-pressed={printPreviewMode}
            onClick={() => setPrintPreviewMode((prev) => !prev)}
          >
            로컬 인쇄 미리보기 보기
          </button>
        </div>

        <div
          id="cue-sheet-full-list-panel"
          data-testid="cue-sheet-full-list-panel"
          data-collapsed={isFullListCollapsedScreen ? 'true' : 'false'}
          className={`cue-sheet-collapsible-panel ${
            isFullListCollapsedScreen ? 'is-collapsed-screen' : ''
          }`}
        >
          {activeProjection.isEmpty ? (
            <div className="cue-sheet-empty-state">
              <p className="cue-sheet-title">
                수업 진행 항목이 비어 있습니다 (0개 항목)
              </p>
              <p className="cue-sheet-subtitle">
                시퀀스에 동작이나 휴식 구간이 등록되면 순서·세팅·큐가 이곳에 표시됩니다.
              </p>
            </div>
          ) : viewMode === 'compact' ? (
            <ol
              className="cue-sheet-item-list"
              aria-label="기본 진행표 항목 목록"
            >
              {activeProjection.items.map((item, idx) => {
                const isCurrent = idx === currentIndex;
                const itemClasses = [
                  'cue-sheet-item',
                  isCurrent ? 'is-active-step' : '',
                  item.cueContent.isLongCue ? 'is-long-cue' : '',
                ]
                  .filter(Boolean)
                  .join(' ');

                return (
                  <li
                    key={item.cueItemId}
                    data-cue-item-id={item.cueItemId}
                    className={itemClasses}
                  >
                    <div className="cue-sheet-item-header">
                      <button
                        type="button"
                        className="cue-sheet-item-select-btn"
                        aria-current={isCurrent ? 'step' : undefined}
                        onClick={() => selectStepByIndex(idx, 'user-navigation')}
                      >
                        <span>#{formatStepNumber(item.order)}</span>
                        <span>{item.nameKo}</span>
                        {item.isDuplicateName &&
                          item.duplicateDisambiguatorKo && (
                            <span className="cue-sheet-badge is-warning">
                              {item.duplicateDisambiguatorKo}
                            </span>
                          )}
                      </button>

                      <div className="cue-sheet-badge-row">
                        <span className="cue-sheet-badge">
                          {getOriginBadgeLabelKo(item.originKind)}
                        </span>
                        <span className="cue-sheet-badge">
                          {item.blockMeta.sectionLabelKo}
                        </span>
                        {item.blockMeta.blockCategoryLabelKo && (
                          <span className="cue-sheet-badge">
                            {item.blockMeta.blockCategoryLabelKo}
                          </span>
                        )}
                        {item.blockMeta.blockPathTitles.length > 0 && (
                          <span className="cue-sheet-badge">
                            블록: {item.blockMeta.blockPathTitles.join(' › ')}
                          </span>
                        )}
                        {item.blockMeta.blockRepetitionCount > 1 && (
                          <span className="cue-sheet-badge">
                            블록 반복 {item.blockMeta.blockRepetitionIndex}/
                            {item.blockMeta.blockRepetitionCount}
                          </span>
                        )}
                        <span className="cue-sheet-badge">
                          {item.practice.sideBadgeKo}
                        </span>
                        <span
                          className={`cue-sheet-badge ${
                            item.timing.status === 'unspecified'
                              ? 'is-warning'
                              : ''
                          }`}
                        >
                          {item.timing.displayLabelKo}
                        </span>
                      </div>
                    </div>

                    <p className="cue-sheet-meta-line">
                      수행: {item.practice.practiceSummaryKo} · 시간 상세:{' '}
                      {item.timing.detailLabelKo}
                    </p>
                    <p className="cue-sheet-meta-line">
                      세팅: {item.setup.setupSummaryKo}
                    </p>
                    {renderItemCueBlock(item)}
                  </li>
                );
              })}
            </ol>
          ) : (
            <ol
              className="cue-sheet-expanded-list"
              aria-label="펼친 진행표 항목 목록"
            >
              {activeProjection.expandedRows.map((row) => {
                const isCurrentParent = Boolean(
                  currentItem && row.parentCueItemId === currentItem.cueItemId,
                );
                const isFirstRowForCurrentItem = Boolean(
                  isCurrentParent &&
                    row.expandedRowId === firstExpandedRowIdForCurrent,
                );
                const expandedRowClasses = [
                  'cue-sheet-expanded-row',
                  isCurrentParent ? 'is-active-step' : '',
                ]
                  .filter(Boolean)
                  .join(' ');

                return (
                  <li
                    key={row.expandedRowId}
                    data-expanded-row-id={row.expandedRowId}
                    data-parent-cue-item-id={row.parentCueItemId}
                    data-is-current-parent={isCurrentParent ? 'true' : 'false'}
                    className={expandedRowClasses}
                  >
                    <div className="cue-sheet-badge-row">
                      <button
                        type="button"
                        className="cue-sheet-item-select-btn"
                        aria-current={
                          isFirstRowForCurrentItem ? 'step' : undefined
                        }
                        onClick={() => selectByCueItemId(row.parentCueItemId)}
                      >
                        <span className="cue-sheet-badge">
                          펼침 #{formatStepNumber(row.expandedOrder)} (원본 #
                          {formatStepNumber(row.parentItemOrder)})
                        </span>
                        <strong>{row.nameKo}</strong>
                        {row.duplicateDisambiguatorKo && (
                          <span className="cue-sheet-badge is-warning">
                            {row.duplicateDisambiguatorKo}
                          </span>
                        )}
                      </button>
                      {row.blockHeaderKo && (
                        <span className="cue-sheet-badge">
                          {row.blockHeaderKo}
                        </span>
                      )}
                      {row.sideLabelKo && (
                        <span className="cue-sheet-badge">{row.sideLabelKo}</span>
                      )}
                      {row.setIndex !== null && row.setCount !== null && (
                        <span className="cue-sheet-badge">
                          세트 {row.setIndex}/{row.setCount}
                        </span>
                      )}
                      {row.blockRepetitionCount > 1 && (
                        <span className="cue-sheet-badge">
                          블록 반복 {row.blockRepetitionIndex}/
                          {row.blockRepetitionCount}
                        </span>
                      )}
                      <span
                        className={`cue-sheet-badge ${
                          row.timingStatus === 'unspecified' ? 'is-warning' : ''
                        }`}
                      >
                        {row.timingLabelKo}
                      </span>
                    </div>
                    <p className="cue-sheet-meta-line">
                      세팅: {row.setupSummaryKo}
                    </p>
                    <p className="cue-sheet-note">
                      큐: {row.primaryCueKo}
                      {row.instructorNote ? ` · 메모: ${row.instructorNote}` : ''}
                    </p>
                  </li>
                );
              })}
              {activeProjection.truncation.omittedExpandedRowCount > 0 && (
                <li
                  className="cue-sheet-expanded-omitted-footer"
                  data-testid="expanded-omitted-footer"
                >
                  펼침 행 상한({activeProjection.truncation.maxExpandedRowsCap}행) 초과로{' '}
                  {activeProjection.truncation.omittedExpandedRowCount}개 펼침 행이
                  생략되었습니다. (임의 숨김 없음)
                </li>
              )}
            </ol>
          )}
        </div>
      </section>

      {/* 6. Collapsible Technical Summary & Diagnostics */}
      <section
        aria-label="수업 요약 및 기술·보안 진단"
        className="cue-sheet-diagnostics-section"
        data-testid="cue-sheet-diagnostics-section"
      >
        <div className="cue-sheet-no-print">
          <button
            type="button"
            className={`cue-sheet-btn cue-sheet-disclosure-btn ${
              isDiagnosticsOpen ? 'is-active' : ''
            }`}
            data-testid="cue-sheet-diagnostics-toggle"
            aria-expanded={isDiagnosticsOpen}
            aria-controls="cue-sheet-diagnostics-panel"
            onClick={() => setIsDiagnosticsOpen((prev) => !prev)}
          >
            수업 요약·기술 진단 {isDiagnosticsOpen ? '접기' : '펼치기'}
          </button>
        </div>

        <div
          id="cue-sheet-diagnostics-panel"
          data-testid="cue-sheet-diagnostics-panel"
          data-collapsed={isDiagnosticsCollapsedScreen ? 'true' : 'false'}
          className={`cue-sheet-collapsible-panel ${
            isDiagnosticsCollapsedScreen ? 'is-collapsed-screen' : ''
          }`}
        >
          <section
            className="cue-sheet-summary-card"
            aria-label="수업 요약 및 장비·시간 안내"
          >
            <div className="cue-sheet-summary-grid">
              <div className="cue-sheet-summary-cell">
                <span className="cue-sheet-summary-label">항목 구성</span>
                <span className="cue-sheet-summary-value">
                  전체 {activeProjection.itemCount}개 · 동작{' '}
                  {activeProjection.exerciseCount}개 · 휴식{' '}
                  {activeProjection.restCount}개
                </span>
              </div>
              <div className="cue-sheet-summary-cell">
                <span className="cue-sheet-summary-label">시간 요약</span>
                <span className="cue-sheet-summary-value">
                  {activeProjection.timingSummary.timingSummaryLabelKo}
                </span>
              </div>
              <div className="cue-sheet-summary-cell">
                <span className="cue-sheet-summary-label">사용 기구</span>
                <span className="cue-sheet-summary-value">
                  {activeProjection.allEquipmentLabelsKo.length > 0
                    ? activeProjection.allEquipmentLabelsKo.join(', ')
                    : activeProjection.apparatusLabelKo}
                </span>
              </div>
              <div className="cue-sheet-summary-cell">
                <span className="cue-sheet-summary-label">소도구</span>
                <span className="cue-sheet-summary-value">
                  {activeProjection.allPropLabelsKo.length > 0
                    ? activeProjection.allPropLabelsKo.join(', ')
                    : '소도구 없음'}
                </span>
              </div>
            </div>

            <div className="cue-sheet-badge-row">
              {activeProjection.timingSummary.hasUnspecifiedTime && (
                <span
                  className="cue-sheet-badge is-warning"
                  data-testid="unspecified-time-badge"
                >
                  시간 미정 {activeProjection.timingSummary.unspecifiedItemCount}개
                  항목 포함 (새 시간 추정 없음)
                </span>
              )}
              {activeProjection.nameOnlyCount > 0 && (
                <span
                  className="cue-sheet-badge is-emphasis"
                  data-testid="name-only-count-badge"
                >
                  이름만 입력된 동작 {activeProjection.nameOnlyCount}개 (강제 분류
                  없음)
                </span>
              )}
              {activeProjection.duplicateNameGroupCount > 0 && (
                <span className="cue-sheet-badge">
                  동일 동작명 구분 그룹 {activeProjection.duplicateNameGroupCount}개
                </span>
              )}
              {(activeProjection.privacy.strippedSensitiveKeys.length > 0 ||
                activeProjection.privacy.redactedInlineTextCount > 0) && (
                <span
                  className="cue-sheet-badge"
                  data-testid="privacy-stripped-badge"
                >
                  민감 키 제외 (
                  {activeProjection.privacy.strippedSensitiveKeys.length}
                  종) · 보조 휴리스틱 마스킹 (
                  {activeProjection.privacy.redactedInlineTextCount}
                  건, 전체 제거 보장 아님)
                </span>
              )}
            </div>
          </section>

          <div
            className="cue-sheet-boundary-banner"
            role="region"
            aria-label="단독 통합 후보 및 경계 고지"
          >
            <p className="cue-sheet-boundary-title">
              독립 통합 후보 (Standalone Integration Candidate) · 실제 앱 라우트 미연결
            </p>
            <p className="cue-sheet-boundary-text">
              자동 처방 없음 · 안전성·운동 효과 보장 없음 · 새 동작 강제 분류 없음 ·
              로컬 전용(외부 AI·서버 전송·저장소 기록 없음)
            </p>
            {activeProjection.boundary.disclaimerKo && (
              <p className="cue-sheet-boundary-text">
                {activeProjection.boundary.disclaimerKo}
              </p>
            )}
            {activeProjection.diagnostics.length > 0 && (
              <ul
                className="cue-sheet-diagnostics-list"
                aria-label="진단 메시지 목록"
              >
                {activeProjection.diagnostics.map((diag, idx) => (
                  <li
                    key={`${diag.code}-${idx}`}
                    className="cue-sheet-boundary-text"
                  >
                    {diag.messageKo}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>

      {/* 6. Optional Fixture Switcher (Secondary Dev/Test Toolbar) */}
      {shouldShowFixtureSwitcher && (
        <section
          className="cue-sheet-fixture-toolbar cue-sheet-no-print"
          aria-label="합성 수업 픽스처 도구 모음"
        >
          <div className="cue-sheet-fixture-controls">
            <label htmlFor="cue-sheet-fixture-select">
              <strong>합성 수업 픽스처</strong>
            </label>
            <select
              id="cue-sheet-fixture-select"
              aria-label="합성 수업 픽스처 선택"
              className="cue-sheet-fixture-select"
              value={selectedFixtureId}
              onChange={(e) =>
                handleSelectFixture(
                  e.target.value as CueSheetFixtureEntry['fixtureId'],
                )
              }
            >
              {CLASS_CUE_SHEET_FIXTURES.map((fixture) => (
                <option key={fixture.fixtureId} value={fixture.fixtureId}>
                  {fixture.labelKo} ({fixture.fixtureId})
                </option>
              ))}
            </select>
          </div>
          <div
            className="cue-sheet-fixture-buttons"
            role="group"
            aria-label="픽스처 빠른 전환 버튼"
          >
            {CLASS_CUE_SHEET_FIXTURES.map((fixture) => {
              const isSelected = fixture.fixtureId === selectedFixtureId;
              return (
                <button
                  key={fixture.fixtureId}
                  type="button"
                  className={`cue-sheet-btn ${isSelected ? 'is-active' : ''}`}
                  aria-pressed={isSelected}
                  data-fixture-id={fixture.fixtureId}
                  onClick={() => handleSelectFixture(fixture.fixtureId)}
                >
                  {fixture.labelKo}
                </button>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
};
