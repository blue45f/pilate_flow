import { useEffect, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent } from 'react';
import { ArrowDown, ArrowUp, RotateCcw, Search, X } from 'lucide-react';
import {
  OFFLINE_BLOCK_PRESETS,
  OFFLINE_CLASS_PRESETS,
  PRESET_THEME_CATALOG,
} from '../data/classBlockPresets';
import { APPARATUS_LABELS } from '../data/pilatesCatalog';
import {
  instantiateClassPresetAsEditableSequence,
  insertBlockPresetIntoSequence,
} from '../utils/classBlockPresetValidator';
import { insertReusableBlockIntoSequence } from '../utils/hierarchyModel';
import {
  getReusableBlockTimingSummary,
  getSavedReusableBlocks,
} from '../utils/movementIdeaDraft';
import { formatSecondsToMMSS, getStepTiming, isRestStep } from '../utils/sequenceEngine';
import { usePilatesStore } from '../store/usePilatesStore';
import type { PilatesStudioState } from '../store/usePilatesStore';
import type { PilatesExercise, SequenceStep } from '../types/pilates';
import { PresetSuggestionCandidatePreview } from '../features/presetSuggestionCandidate';
import { ExerciseThumbnailBadge } from './ExerciseThumbnailBadge';
import '../styles/offline-presets.css';
import './OfflinePresetPicker.css';

export const PRESET_PICKER_DRAFT_STORAGE_KEY = 'pf_preset_picker_draft_v1';

type Kind = 'class' | 'block' | 'reusable' | 'suggested';
interface Selection {
  kind: 'class' | 'block' | 'reusable';
  id: string;
  expected: PilatesStudioState;
  appliedPostState: PilatesStudioState | null;
}

interface PresetPickerDraftSnapshot {
  kind: Kind;
  query: string;
  apparatus: string;
  theme: string;
  minutes: string;
  selectedPreset: { kind: 'class' | 'block' | 'reusable'; id: string } | null;
  mode: 'append' | 'replace';
}

interface CanonicalStepSummary {
  totalCount: number;
  exerciseCount: number;
  restCount: number;
  totalSec: number;
  restSec: number;
}

function normalizeSearchToken(value: string): string {
  return value.normalize('NFKC').toLocaleLowerCase().replace(/\s+/gu, '');
}

function matchesPresetQuery(fields: readonly (string | undefined)[], rawQuery: string): boolean {
  const trimmed = rawQuery.normalize('NFKC').trim();
  if (!trimmed) return true;
  const terms = trimmed.split(/\s+/u).filter(Boolean).map(normalizeSearchToken);
  const normalizedFields = fields
    .filter((field): field is string => typeof field === 'string' && field.length > 0)
    .map(normalizeSearchToken);
  return terms.every((term) => normalizedFields.some((field) => field.includes(term)));
}

function apparatusLabelKo(apparatus: string): string {
  if (apparatus === 'mixed') return '혼합 기구';
  return APPARATUS_LABELS[apparatus as keyof typeof APPARATUS_LABELS]?.ko ?? apparatus;
}

function summarizeStepsCanonical(
  steps: readonly SequenceStep[],
  exercisesById: ReadonlyMap<string, PilatesExercise>,
): CanonicalStepSummary {
  let exerciseCount = 0;
  let restCount = 0;
  let totalSec = 0;
  let restSec = 0;
  for (const step of steps) {
    const timing = getStepTiming(step, exercisesById.get(step.exerciseId));
    totalSec += timing.totalSec;
    if (isRestStep(step)) {
      restCount += 1;
      restSec += timing.totalSec;
    } else {
      exerciseCount += 1;
    }
  }
  return {
    totalCount: steps.length,
    exerciseCount,
    restCount,
    totalSec,
    restSec,
  };
}

function formatMinutesCompact(totalSec: number): string {
  const minutes = totalSec / 60;
  const rounded = Number.isInteger(minutes)
    ? String(minutes)
    : minutes.toFixed(1).replace(/\.0$/, '');
  return `${rounded}분`;
}

function handleChipGroupKeyDown(event: ReactKeyboardEvent<HTMLElement>) {
  if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
  const buttons = Array.from(
    event.currentTarget.querySelectorAll<HTMLButtonElement>('button:not(:disabled)'),
  );
  if (!buttons.length) return;
  const currentIndex = buttons.indexOf(document.activeElement as HTMLButtonElement);
  if (currentIndex < 0) return;
  event.preventDefault();
  const nextIndex =
    event.key === 'Home'
      ? 0
      : event.key === 'End'
        ? buttons.length - 1
        : (currentIndex + (event.key === 'ArrowRight' ? 1 : buttons.length - 1)) % buttons.length;
  buttons[nextIndex]?.focus();
}

function readPresetPickerDraft(): PresetPickerDraftSnapshot | null {
  try {
    const raw = sessionStorage.getItem(PRESET_PICKER_DRAFT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PresetPickerDraftSnapshot>;
    if (!parsed || typeof parsed !== 'object') return null;
    const validKind: Kind =
      parsed.kind === 'class' ||
      parsed.kind === 'block' ||
      parsed.kind === 'reusable' ||
      parsed.kind === 'suggested'
        ? parsed.kind
        : 'class';
    const validMode: 'append' | 'replace' = parsed.mode === 'replace' ? 'replace' : 'append';
    const selectedPreset =
      parsed.selectedPreset &&
      typeof parsed.selectedPreset === 'object' &&
      (parsed.selectedPreset.kind === 'class' ||
        parsed.selectedPreset.kind === 'block' ||
        parsed.selectedPreset.kind === 'reusable') &&
      typeof parsed.selectedPreset.id === 'string' &&
      parsed.selectedPreset.id.length > 0
        ? { kind: parsed.selectedPreset.kind, id: parsed.selectedPreset.id }
        : null;
    return {
      kind: validKind,
      query: typeof parsed.query === 'string' ? parsed.query : '',
      apparatus: typeof parsed.apparatus === 'string' ? parsed.apparatus : 'all',
      theme: typeof parsed.theme === 'string' ? parsed.theme : 'all',
      minutes: typeof parsed.minutes === 'string' ? parsed.minutes : 'all',
      selectedPreset,
      mode: validMode,
    };
  } catch {
    return null;
  }
}

usePilatesStore.subscribe((nextState, prevState) => {
  if (
    prevState !== nextState &&
    nextState.undoStack.length === 0 &&
    nextState.activeSteps.length === 0 &&
    (prevState.undoStack.length > 0 ||
      prevState.activeSteps.length > 0 ||
      prevState.activeTitle !== nextState.activeTitle ||
      prevState.activeSequenceId !== nextState.activeSequenceId)
  ) {
    try {
      sessionStorage.removeItem(PRESET_PICKER_DRAFT_STORAGE_KEY);
    } catch {
      // Ignore storage errors
    }
  }
});

const TAB_SCOPE_DESCRIPTIONS: Record<Kind, string> = {
  class: '수업 전체 프리셋 · 현재 수업 뒤에 이어 붙이거나 새 초안으로 교체할 수 있어요.',
  block: '연계 동작 묶음 · 준비·본운동·마무리 구간 묶음을 현재 수업 뒤에 추가합니다.',
  reusable: '내 재사용 블록 · 내가 ‘블록 조합’에서 직접 묶어 저장한 블록을 수업 뒤에 추가합니다.',
  suggested:
    '시간·휴식 맞춤 후보 · 고정 프리셋 대신 현재 목표 시간·휴식·보유 장비 조건에 맞춘 초안을 계산합니다.',
};

/** Templates are copied only after a deliberate click. Browsing never changes a plan. */
export function OfflinePresetPicker({ onApplied }: { onApplied: (message: string) => void }) {
  const state = usePilatesStore();
  const [initialDraft] = useState<PresetPickerDraftSnapshot | null>(() => readPresetPickerDraft());
  const [kind, setKind] = useState<Kind>(() => initialDraft?.kind ?? 'class');
  const [query, setQuery] = useState(() => initialDraft?.query ?? '');
  const [apparatus, setApparatus] = useState(() => initialDraft?.apparatus ?? 'all');
  const [theme, setTheme] = useState(() => initialDraft?.theme ?? 'all');
  const [minutes, setMinutes] = useState(() => initialDraft?.minutes ?? 'all');
  const [limit, setLimit] = useState(6);
  const [selection, setSelection] = useState<Selection | null>(() => {
    const saved = initialDraft?.selectedPreset;
    if (!saved) return null;
    const current = usePilatesStore.getState();
    const exists =
      saved.kind === 'class'
        ? OFFLINE_CLASS_PRESETS.some((item) => item.id === saved.id)
        : saved.kind === 'block'
          ? OFFLINE_BLOCK_PRESETS.some((item) => item.id === saved.id)
          : getSavedReusableBlocks().some((item) => item.id === saved.id);
    if (!exists) return null;
    return { kind: saved.kind, id: saved.id, expected: current, appliedPostState: null };
  });

  const searchInputRef = useRef<HTMLInputElement>(null);
  const chipBarRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const previewRef = useRef<HTMLElement>(null);
  const previewHeadingRef = useRef<HTMLHeadingElement>(null);
  const nextRevealedIndexRef = useRef<number | null>(null);
  const pendingFocusCardIdRef = useRef<string | null>(null);
  const pendingChipFocusIndexRef = useRef<number | null>(null);
  const appliedExpectedRef = useRef<PilatesStudioState | null>(null);

  const activeConditionChipCount =
    (apparatus !== 'all' ? 1 : 0) +
    (kind !== 'reusable' && theme !== 'all' ? 1 : 0) +
    (kind === 'class' && minutes !== 'all' ? 1 : 0);

  useEffect(() => {
    if (!selection) return;
    const reduced =
      typeof window !== 'undefined' &&
      Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
    previewRef.current?.scrollIntoView?.({
      block: 'start',
      behavior: reduced ? 'auto' : 'instant',
    });
  }, [selection]);

  useEffect(() => {
    const index = nextRevealedIndexRef.current;
    if (index === null) return;
    nextRevealedIndexRef.current = null;
    const cards = listRef.current?.querySelectorAll<HTMLButtonElement>('.offline-preset-card');
    cards?.[index]?.focus({ preventScroll: true });
  }, [limit]);

  useEffect(() => {
    const targetId = pendingFocusCardIdRef.current;
    if (!targetId) return;
    const cardBtn = listRef.current?.querySelector<HTMLButtonElement>(
      `[data-preset-card-id="${targetId}"]`,
    );
    if (!cardBtn?.isConnected) return;
    pendingFocusCardIdRef.current = null;
    cardBtn.focus({ preventScroll: true });
    const reduced =
      typeof window !== 'undefined' &&
      Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
    cardBtn.scrollIntoView?.({ block: 'nearest', behavior: reduced ? 'auto' : 'instant' });
  }, [kind, query, apparatus, theme, minutes, limit]);

  useEffect(() => {
    const index = pendingChipFocusIndexRef.current;
    if (index === null) return;
    pendingChipFocusIndexRef.current = null;
    if (activeConditionChipCount <= 0) {
      searchInputRef.current?.focus();
      return;
    }
    const nextButtons =
      chipBarRef.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)') ?? [];
    nextButtons[Math.min(index, nextButtons.length - 1)]?.focus();
  }, [activeConditionChipCount]);

  const [mode, setMode] = useState<'append' | 'replace'>(() => {
    const saved = initialDraft?.selectedPreset;
    const current = usePilatesStore.getState();
    if (saved) {
      if (saved.kind === 'class' && current.activeSteps.length === 0) return 'replace';
      if (saved.kind !== 'class') return 'append';
      return initialDraft?.mode ?? 'append';
    }
    return initialDraft?.mode ?? 'append';
  });

  // Confirmation is strictly bound to the exact store snapshot inspected by the user.
  const [confirmedForState, setConfirmedForState] = useState<PilatesStudioState | null>(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const snapshot: PresetPickerDraftSnapshot = {
      kind,
      query,
      apparatus,
      theme,
      minutes,
      selectedPreset: selection ? { kind: selection.kind, id: selection.id } : null,
      mode,
    };
    try {
      sessionStorage.setItem(PRESET_PICKER_DRAFT_STORAGE_KEY, JSON.stringify(snapshot));
    } catch {
      // Ignore storage errors
    }
  }, [kind, query, apparatus, theme, minutes, selection, mode]);

  const savedReusableBlocks = getSavedReusableBlocks();
  const matches = useMemo(() => {
    if (kind === 'reusable' || kind === 'suggested') return [];
    if (kind === 'class') {
      return OFFLINE_CLASS_PRESETS.filter(
        (item) =>
          (apparatus === 'all' || item.apparatus === apparatus) &&
          (theme === 'all' || item.theme === theme) &&
          (minutes === 'all' || item.durationMinutes === Number(minutes)) &&
          matchesPresetQuery(
            [
              item.title,
              item.subtitle,
              item.userSummaryKo,
              item.themeLabelKo,
              apparatusLabelKo(item.apparatus),
              ...item.focusTags,
            ],
            query,
          ),
      );
    }
    return OFFLINE_BLOCK_PRESETS.filter(
      (item) =>
        (apparatus === 'all' || item.apparatus === apparatus) &&
        (theme === 'all' || item.theme === theme) &&
        matchesPresetQuery(
          [
            item.title,
            item.description,
            item.targetAudienceSummaryKo,
            item.themeLabelKo,
            apparatusLabelKo(item.apparatus),
          ],
          query,
        ),
    );
  }, [kind, apparatus, theme, minutes, query]);

  const reusableMatches = useMemo(() => {
    if (kind !== 'reusable') return [];
    return savedReusableBlocks.filter(
      (block) =>
        (apparatus === 'all' || block.apparatus === apparatus) &&
        matchesPresetQuery(
          [block.title, block.description, apparatusLabelKo(block.apparatus)],
          query,
        ),
    );
  }, [kind, savedReusableBlocks, apparatus, query]);

  const selected =
    selection?.kind === 'class'
      ? OFFLINE_CLASS_PRESETS.find((item) => item.id === selection.id)
      : selection?.kind === 'block'
        ? OFFLINE_BLOCK_PRESETS.find((item) => item.id === selection.id)
        : undefined;
  const selectedReusable =
    selection?.kind === 'reusable'
      ? savedReusableBlocks.find((item) => item.id === selection.id)
      : undefined;

  const prepared = useMemo(() => {
    if (!selection) return null;
    if (selection.kind === 'reusable') {
      const reusable = getSavedReusableBlocks().find((item) => item.id === selection.id);
      if (!reusable) return null;
      try {
        const inserted = insertReusableBlockIntoSequence([], reusable);
        const summary = getReusableBlockTimingSummary(reusable);
        return {
          steps: inserted.steps.map((step) =>
            step.selectedLayer ? step : { ...step, selectedLayer: 'standard' as const },
          ),
          title: reusable.title,
          subtitle: `내가 만든 재사용 블록 (v${reusable.version}) 복사본`,
          targetMinutes: Math.max(10, summary.totalDurationMin),
        };
      } catch {
        return null;
      }
    }
    if (!selected) return null;
    try {
      if (selected.presetKind === 'class-sequence') {
        const { sequence } = instantiateClassPresetAsEditableSequence(
          selected,
          undefined,
          selection.expected.exercises,
        );
        return {
          steps: sequence.steps,
          title: sequence.title,
          subtitle: sequence.subtitle,
          targetMinutes: selected.durationMinutes,
        };
      }
      const result = insertBlockPresetIntoSequence(
        [],
        selected,
        undefined,
        selection.expected.exercises,
      );
      return {
        steps: result.steps,
        title: selected.title,
        subtitle: '연계 블록 프리셋의 편집 가능한 복사본',
        targetMinutes: Math.max(10, selected.durationMin),
      };
    } catch {
      return null;
    }
  }, [selected, selection]);

  // Distinguish this picker's own apply transition from external class/account mutations.
  const alreadyApplied = Boolean(
    selection &&
      selection.appliedPostState !== null &&
      state === selection.appliedPostState,
  );
  const stale = Boolean(selection && state !== selection.expected && !alreadyApplied);
  const confirmed = Boolean(
    selection &&
      !stale &&
      !alreadyApplied &&
      confirmedForState !== null &&
      confirmedForState === selection.expected,
  );

  const resetSelection = () => {
    setSelection(null);
    setConfirmedForState(null);
    appliedExpectedRef.current = null;
    pendingFocusCardIdRef.current = null;
    setMessage('');
    setLimit(6);
  };

  const clearQueryOnly = () => {
    setQuery('');
    setLimit(6);
    searchInputRef.current?.focus();
  };

  const resetFiltersOnly = () => {
    setQuery('');
    setApparatus('all');
    setTheme('all');
    setMinutes('all');
    setLimit(6);
    searchInputRef.current?.focus();
  };

  const choose = (id: string) => {
    if (kind === 'suggested') return;
    const current = usePilatesStore.getState();
    appliedExpectedRef.current = null;
    setSelection({ kind, id, expected: current, appliedPostState: null });
    setMode(kind === 'class' && !current.activeSteps.length ? 'replace' : 'append');
    setConfirmedForState(null);
    setMessage('');
  };

  const reinspectSelection = () => {
    if (!selection) return;
    const current = usePilatesStore.getState();
    appliedExpectedRef.current = null;
    setConfirmedForState(null);
    const stillExists =
      selection.kind === 'class'
        ? OFFLINE_CLASS_PRESETS.some((item) => item.id === selection.id)
        : selection.kind === 'block'
          ? OFFLINE_BLOCK_PRESETS.some((item) => item.id === selection.id)
          : getSavedReusableBlocks().some((item) => item.id === selection.id);
    if (!stillExists) {
      setSelection(null);
      setMessage('선택했던 항목이 현재 목록에 없어 선택을 해제했습니다. 다시 골라 주세요.');
      return;
    }
    setSelection({
      kind: selection.kind,
      id: selection.id,
      expected: current,
      appliedPostState: null,
    });
    if (selection.kind !== 'class') {
      setMode('append');
    } else if (current.activeSteps.length === 0) {
      setMode('replace');
    }
    setMessage('');
    previewHeadingRef.current?.focus({ preventScroll: true });
  };

  const returnToSelectedCard = () => {
    if (!selection) return;
    const activeList = kind === 'reusable' ? reusableMatches : matches;
    let targetIndex = activeList.findIndex((item) => item.id === selection.id);
    const existingCard = listRef.current?.querySelector<HTMLButtonElement>(
      `[data-preset-card-id="${selection.id}"]`,
    );
    if (existingCard?.isConnected && targetIndex >= 0 && targetIndex < limit) {
      existingCard.focus({ preventScroll: true });
      const reduced =
        typeof window !== 'undefined' &&
        Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
      existingCard.scrollIntoView?.({ block: 'nearest', behavior: reduced ? 'auto' : 'instant' });
      return;
    }
    pendingFocusCardIdRef.current = selection.id;
    if (targetIndex < 0) {
      setQuery('');
      setApparatus('all');
      setTheme('all');
      setMinutes('all');
      const fullList =
        selection.kind === 'reusable'
          ? savedReusableBlocks
          : selection.kind === 'class'
            ? OFFLINE_CLASS_PRESETS
            : OFFLINE_BLOCK_PRESETS;
      targetIndex = fullList.findIndex((item) => item.id === selection.id);
    }
    if (targetIndex >= limit) {
      setLimit(Math.ceil((targetIndex + 1) / 6) * 6);
    }
  };

  const jumpToSelectedPreview = () => {
    previewHeadingRef.current?.focus({ preventScroll: true });
    const reduced =
      typeof window !== 'undefined' &&
      Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
    previewRef.current?.scrollIntoView?.({
      block: 'start',
      behavior: reduced ? 'auto' : 'instant',
    });
  };

  const apply = () => {
    if (
      !prepared ||
      !selection ||
      stale ||
      alreadyApplied ||
      appliedExpectedRef.current === selection.expected ||
      (mode === 'replace' && state.activeSteps.length > 0 && !confirmed)
    )
      return;
    const current = usePilatesStore.getState();
    if (current !== selection.expected) {
      setConfirmedForState(null);
      return;
    }
    const result = current.applyPresetDraft(prepared, mode, selection.expected);
    if (result.success) {
      const postApplyState = usePilatesStore.getState();
      appliedExpectedRef.current = selection.expected;
      setConfirmedForState(null);
      setMessage('');
      setSelection({
        kind: selection.kind,
        id: selection.id,
        expected: selection.expected,
        appliedPostState: postApplyState,
      });
      onApplied(result.message);
    } else {
      setConfirmedForState(null);
      setMessage(result.message);
    }
  };

  const names = useMemo(
    () => new Map(state.exercises.map((item) => [item.id, item])),
    [state.exercises],
  );
  const currentSummary = useMemo(
    () => summarizeStepsCanonical(state.activeSteps, names),
    [state.activeSteps, names],
  );
  const incomingSummary = useMemo(
    () => (prepared ? summarizeStepsCanonical(prepared.steps, names) : null),
    [prepared, names],
  );
  const projectedSummary = useMemo(() => {
    if (!prepared) return null;
    const nextSteps = mode === 'append' ? [...state.activeSteps, ...prepared.steps] : prepared.steps;
    return summarizeStepsCanonical(nextSteps, names);
  }, [prepared, mode, state.activeSteps, names]);

  const totalSeconds = incomingSummary?.totalSec ?? 0;
  const projectedTargetMinutes = prepared
    ? mode === 'append'
      ? state.activeTargetMinutes
      : prepared.targetMinutes
    : state.activeTargetMinutes;

  const activeCount = kind === 'reusable' ? reusableMatches.length : matches.length;
  const totalSourceCount =
    kind === 'reusable'
      ? savedReusableBlocks.length
      : kind === 'class'
        ? OFFLINE_CLASS_PRESETS.length
        : OFFLINE_BLOCK_PRESETS.length;
  const isNoSourceData = totalSourceCount === 0;

  const activeConditionChips: {
    key: string;
    label: string;
    ariaLabel: string;
    remove: () => void;
  }[] = [
    ...(apparatus !== 'all'
      ? [
          {
            key: `apparatus-${apparatus}`,
            label: `기구: ${apparatusLabelKo(apparatus)}`,
            ariaLabel: `기구 ${apparatusLabelKo(apparatus)} 조건 해제`,
            remove: () => {
              setApparatus('all');
              setLimit(6);
            },
          },
        ]
      : []),
    ...(kind !== 'reusable' && theme !== 'all'
      ? (() => {
          const themeLabel =
            PRESET_THEME_CATALOG.find((item) => item.id === theme)?.labelKo ?? theme;
          return [
            {
              key: `theme-${theme}`,
              label: `주제: ${themeLabel}`,
              ariaLabel: `주제 ${themeLabel} 조건 해제`,
              remove: () => {
                setTheme('all');
                setLimit(6);
              },
            },
          ];
        })()
      : []),
    ...(kind === 'class' && minutes !== 'all'
      ? [
          {
            key: `minutes-${minutes}`,
            label: `시간: ${minutes}분`,
            ariaLabel: `계획 시간 ${minutes}분 조건 해제`,
            remove: () => {
              setMinutes('all');
              setLimit(6);
            },
          },
        ]
      : []),
  ];
  const hasAnyActiveFilter = Boolean(query.trim() || activeConditionChips.length > 0);

  const handleRemoveConditionChip = (index: number, removeFn: () => void) => {
    pendingChipFocusIndexRef.current = index;
    removeFn();
  };

  const previewTitle = selected?.title ?? selectedReusable?.title;
  const previewEquipmentList = selected
    ? selected.requiredEquipment
    : selectedReusable
      ? [selectedReusable.apparatus]
      : [];
  const hasSelectedPreview = Boolean((selected || selectedReusable) && selection);

  return (
    <section className="offline-presets" aria-label="오프라인 수업·연계 블록 프리셋">
      <ol
        className="offline-presets-step-guide"
        data-testid="preset-picker-step-guide"
        aria-label="프리셋 불러오기 단계 안내"
      >
        <li
          className={`offline-presets-step-item ${!hasSelectedPreview ? 'is-active' : 'is-complete'}`}
          aria-current={!hasSelectedPreview ? 'step' : undefined}
        >
          1 프리셋 조건·목록에서 선택
        </li>
        <li className="offline-presets-step-arrow" aria-hidden="true">
          →
        </li>
        <li
          className={`offline-presets-step-item ${hasSelectedPreview ? 'is-active' : ''}`}
          aria-current={hasSelectedPreview ? 'step' : undefined}
        >
          2 구성 확인 후 수업안에 불러오기
        </li>
      </ol>
      <p className="muted">
        AI 없이 골라 복사하세요. 원본과 저장한 수업·이력은 그대로 두고, 동작·순서·시간을 자유롭게
        바꿀 수 있어요.
      </p>
      <div
        className="offline-presets-tabs"
        role="group"
        aria-label="프리셋 종류"
        onKeyDown={handleChipGroupKeyDown}
      >
        <button
          type="button"
          aria-pressed={kind === 'class'}
          onClick={() => {
            setKind('class');
            resetSelection();
          }}
        >
          수업 전체 · {OFFLINE_CLASS_PRESETS.length}
        </button>
        <button
          type="button"
          aria-pressed={kind === 'block'}
          onClick={() => {
            setKind('block');
            resetSelection();
          }}
        >
          연계 동작 묶음 · {OFFLINE_BLOCK_PRESETS.length}
        </button>
        <button
          type="button"
          aria-pressed={kind === 'reusable'}
          onClick={() => {
            setKind('reusable');
            resetSelection();
          }}
        >
          내 재사용 블록 · {savedReusableBlocks.length}
        </button>
        <button
          type="button"
          aria-pressed={kind === 'suggested'}
          onClick={() => {
            setKind('suggested');
            resetSelection();
          }}
        >
          시간·휴식 맞춤 후보
        </button>
      </div>
      <p className="offline-presets-scope-caption" data-testid="preset-tab-scope-caption">
        {TAB_SCOPE_DESCRIPTIONS[kind]}
      </p>
      {kind === 'suggested' ? (
        <PresetSuggestionCandidatePreview
          request={{
            apparatus: apparatus === 'all' ? state.activeApparatus : apparatus,
            ownedApparatus: state.ownedApparatus,
            availableEquipment: state.ownedEquipment,
            theme: theme === 'all' ? undefined : theme,
            focusPreset: state.draftCriteria?.focusPreset,
            targetMinutes: minutes === 'all' ? state.activeTargetMinutes : Number(minutes),
            restMinutes: state.draftCriteria?.restMinutes ?? 0,
            level: state.activeLevel,
            preferredProps: state.ownedProps,
            defaultLayer: state.draftCriteria?.defaultLayer,
            excludeDaysWindow: state.draftCriteria?.excludeDaysWindow,
            targetGroupId: state.activeTargetGroupId,
            historyLogs: state.historyLogs,
            exercises: state.exercises,
          }}
          onInstantiateEditableDraft={(draft) => {
            const current = usePilatesStore.getState();
            const applyMode = current.activeSteps.length > 0 ? 'append' : 'replace';
            const result = current.applyPresetDraft(
              {
                steps: draft.sequence.steps,
                title: draft.sequence.title,
                subtitle: draft.sequence.subtitle,
                targetMinutes: draft.sequence.targetMinutes,
              },
              applyMode,
              current,
            );
            if (result.success) onApplied(result.message);
          }}
        />
      ) : (
        <>
          <div className="offline-presets-search-row">
            <label className="offline-presets-search">
              <Search size={17} aria-hidden="true" />
              <input
                ref={searchInputRef}
                type="search"
                aria-label="프리셋 제목 또는 요약 검색"
                placeholder="제목, 주제, 핵심 키워드로 찾기"
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setLimit(6);
                }}
              />
            </label>
            {query.length > 0 && (
              <button
                type="button"
                className="offline-presets-search-clear"
                aria-label="프리셋 검색어 지우기"
                onClick={clearQueryOnly}
              >
                <X size={16} aria-hidden="true" />
              </button>
            )}
          </div>
          <div className="offline-presets-filters">
            <label className="form-field">
              <span>프리셋 기구</span>
              <select
                value={apparatus}
                onChange={(event) => {
                  setApparatus(event.target.value);
                  setLimit(6);
                }}
              >
                <option value="all">모든 기구</option>
                {Object.entries(APPARATUS_LABELS).map(([id, item]) => (
                  <option key={id} value={id}>
                    {item.ko}
                  </option>
                ))}
                <option value="mixed">혼합 기구</option>
              </select>
            </label>
            {kind !== 'reusable' && (
              <label className="form-field">
                <span>프리셋 주제</span>
                <select
                  value={theme}
                  onChange={(event) => {
                    setTheme(event.target.value);
                    setLimit(6);
                  }}
                >
                  <option value="all">모든 주제</option>
                  {PRESET_THEME_CATALOG.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.labelKo}
                    </option>
                  ))}
                </select>
              </label>
            )}
            {kind === 'class' && (
              <label className="form-field">
                <span>프리셋 계획 시간</span>
                <select
                  value={minutes}
                  onChange={(event) => {
                    setMinutes(event.target.value);
                    setLimit(6);
                  }}
                >
                  <option value="all">모든 시간</option>
                  {[15, 20, 30, 45, 50, 60].map((value) => (
                    <option key={value} value={value}>
                      {value}분
                    </option>
                  ))}
                </select>
              </label>
            )}
          </div>
          {activeConditionChips.length > 0 && (
            <div
              ref={chipBarRef}
              className="offline-presets-active-chips"
              role="group"
              aria-label="적용된 프리셋 조건"
              onKeyDown={handleChipGroupKeyDown}
            >
              {activeConditionChips.map((chip, index) => (
                <button
                  key={chip.key}
                  type="button"
                  className="offline-presets-chip"
                  aria-label={chip.ariaLabel}
                  onClick={() => handleRemoveConditionChip(index, chip.remove)}
                >
                  <span>{chip.label}</span>
                  <X size={14} aria-hidden="true" />
                </button>
              ))}
            </div>
          )}
          <div className="offline-presets-status-row">
            <p role="status">
              {kind === 'reusable'
                ? `${activeCount}개 내 재사용 블록 · 시간은 편집 가능한 계획값입니다.`
                : `${activeCount}개 프리셋 · 시간은 편집 가능한 계획값입니다.`}
            </p>
            {(hasSelectedPreview || (hasAnyActiveFilter && !isNoSourceData)) && (
              <div
                className="offline-presets-status-actions"
                role="group"
                aria-label="목록 빠른 작업"
              >
                {hasSelectedPreview && (
                  <button
                    type="button"
                    className="offline-presets-jump-btn"
                    onClick={jumpToSelectedPreview}
                  >
                    <ArrowDown size={14} aria-hidden="true" /> 선택 확인으로 이동
                  </button>
                )}
                {hasAnyActiveFilter && !isNoSourceData && (
                  <button
                    type="button"
                    className="offline-presets-reset-btn"
                    onClick={resetFiltersOnly}
                  >
                    <RotateCcw size={14} aria-hidden="true" /> 조건 초기화
                  </button>
                )}
              </div>
            )}
          </div>
          <div className="offline-presets-list" ref={listRef}>
            {kind === 'reusable'
              ? reusableMatches.slice(0, limit).map((block) => {
                  const summary = getReusableBlockTimingSummary(block);
                  return (
                    <button
                      type="button"
                      className="offline-preset-card"
                      key={block.id}
                      data-preset-card-id={block.id}
                      aria-pressed={selection?.id === block.id}
                      onClick={() => choose(block.id)}
                    >
                      <strong>{block.title}</strong>
                      <span>
                        {apparatusLabelKo(block.apparatus)} · {summary.totalDurationMin}분 ·{' '}
                        {block.items.length}개 동작 · v{block.version}
                      </span>
                    </button>
                  );
                })
              : matches.slice(0, limit).map((item) => (
                  <button
                    type="button"
                    className="offline-preset-card"
                    key={item.id}
                    data-preset-card-id={item.id}
                    aria-pressed={selection?.id === item.id}
                    onClick={() => choose(item.id)}
                  >
                    <strong>{item.title}</strong>
                    <small className="offline-preset-card-summary">
                      {item.presetKind === 'class-sequence' ? item.userSummaryKo : item.description}
                    </small>
                    <span>
                      {apparatusLabelKo(item.apparatus)} ·{' '}
                      {item.presetKind === 'class-sequence' ? item.durationMinutes : item.durationMin}분 ·{' '}
                      {item.presetKind === 'class-sequence' ? item.steps.length : item.items.length}개 동작
                    </span>
                  </button>
                ))}
          </div>
          {!activeCount &&
            (isNoSourceData ? (
              <div className="offline-presets-empty" data-testid="preset-empty-no-data">
                <p>
                  {kind === 'reusable'
                    ? '아직 저장한 내 재사용 블록이 없어요. 수업 구성의 ‘블록 조합’에서 자주 쓰는 동작 묶음을 저장하면 이곳에서 바로 불러올 수 있습니다.'
                    : '등록된 오프라인 프리셋 자료가 없습니다.'}
                </p>
              </div>
            ) : (
              <div className="offline-presets-empty" data-testid="preset-empty-filter-zero">
                <p>
                  조건에 맞는 프리셋이 없어요. 기구·주제·시간을 넓혀 보세요. 직접 구성은 언제든
                  가능합니다.
                </p>
                <div
                  className="offline-presets-empty-actions"
                  role="group"
                  aria-label="빈 결과 조건 복구"
                >
                  {Boolean(query.trim()) && activeConditionChips.length > 0 && (
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={clearQueryOnly}
                    >
                      검색어만 지우기
                    </button>
                  )}
                  {hasAnyActiveFilter && (
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={resetFiltersOnly}
                    >
                      프리셋 조건 초기화
                    </button>
                  )}
                </div>
              </div>
            ))}
          {activeCount > limit && (
            <button
              type="button"
              className="btn-secondary"
              onClick={() => {
                nextRevealedIndexRef.current = limit;
                setLimit(limit + 6);
              }}
            >
              프리셋 더 보기
            </button>
          )}
        </>
      )}
      {(selected || selectedReusable) && selection && (
        <section
          ref={previewRef}
          className="offline-preset-preview"
          aria-label="선택한 프리셋 확인"
        >
          <div className="offline-preset-preview-top">
            <h3 ref={previewHeadingRef} tabIndex={-1}>
              {previewTitle}
            </h3>
            <div className="offline-preset-preview-nav">
              {kind === selection.kind && (
                <button
                  type="button"
                  className="btn-secondary offline-preset-back-btn"
                  onClick={returnToSelectedCard}
                >
                  <ArrowUp size={15} aria-hidden="true" /> 목록의 선택 위치로
                </button>
              )}
              <button
                type="button"
                className="offline-preset-clear-selection"
                onClick={resetSelection}
              >
                선택 해제
              </button>
            </div>
          </div>
          <p>
            복사할 계획 {formatSecondsToMMSS(totalSeconds)} · 기구:{' '}
            {previewEquipmentList
              .map((id) => APPARATUS_LABELS[id as keyof typeof APPARATUS_LABELS]?.ko ?? id)
              .join(' · ')}
          </p>
          {prepared && incomingSummary && projectedSummary && (
            <div
              className="offline-preset-impact"
              role="region"
              aria-label="현재 수업과 적용 후 예상 비교"
              data-testid="preset-impact-comparison"
            >
              <div className="offline-preset-impact-col">
                <span className="offline-preset-impact-label">현재 수업</span>
                <strong data-testid="preset-impact-current">
                  {currentSummary.totalCount}항목 · {formatMinutesCompact(currentSummary.totalSec)}{' '}
                  ({formatSecondsToMMSS(currentSummary.totalSec)})
                </strong>
                <small>
                  {currentSummary.restCount > 0
                    ? `동작 ${currentSummary.exerciseCount} · 휴식 ${currentSummary.restCount} (${formatSecondsToMMSS(currentSummary.restSec)}) · `
                    : ''}
                  목표 {state.activeTargetMinutes}분
                </small>
              </div>
              <span className="offline-preset-impact-arrow" aria-hidden="true">
                →
              </span>
              <div className="offline-preset-impact-col is-projected">
                <span className="offline-preset-impact-label">
                  {mode === 'append' ? '뒤에 추가 후 예상' : '초안 교체 후 예상'}
                </span>
                <strong data-testid="preset-impact-projected">
                  {projectedSummary.totalCount}항목 ·{' '}
                  {formatMinutesCompact(projectedSummary.totalSec)} (
                  {formatSecondsToMMSS(projectedSummary.totalSec)})
                </strong>
                <small>
                  {projectedSummary.restCount > 0
                    ? `동작 ${projectedSummary.exerciseCount} · 휴식 ${projectedSummary.restCount} (${formatSecondsToMMSS(projectedSummary.restSec)}) · `
                    : ''}
                  목표 {projectedTargetMinutes}분
                  {mode === 'append'
                    ? ` (+${incomingSummary.totalCount}항목 · +${formatMinutesCompact(incomingSummary.totalSec)})`
                    : ' (새 초안 교체 · 실행 취소 가능)'}
                </small>
              </div>
            </div>
          )}
          <p className="muted">
            반복·좌우·설명·전환 시간은 작성자가 정한 가정입니다. 실제 소요 시간이나 운동 효과를
            보장하지 않으며 검토는 선택입니다.
          </p>
          <details>
            <summary>동작·시간 구성 보기</summary>
            <ol>
              {prepared?.steps.map((step) => {
                const ex = names.get(step.exerciseId);
                const timing = getStepTiming(step, ex);
                return (
                  <li
                    key={step.stepId}
                    style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}
                  >
                    {ex && <ExerciseThumbnailBadge exercise={ex} size="xs" decorative />}
                    <strong>
                      {isRestStep(step) ? '휴식' : (ex?.nameKo ?? '현재 목록에 없는 동작')}
                    </strong>
                    <span>
                      {formatSecondsToMMSS(timing.totalSec)}
                      {!isRestStep(step) && (
                        <>
                          {' '}
                          · 수행 {formatSecondsToMMSS(timing.movementSec)} · 설명{' '}
                          {timing.explanationSec}초 · 전환 {timing.transitionSec}초
                        </>
                      )}
                    </span>
                    {!isRestStep(step) && (
                      <small>
                        {step.repetitions ? `${step.repetitions}회` : '횟수 미지정'}
                        {step.sets ? ` · ${step.sets}세트` : ''} ·{' '}
                        {timing.sides === 2 ? '양쪽 시간을 포함' : '한쪽 또는 양쪽 함께'}
                      </small>
                    )}
                  </li>
                );
              })}
            </ol>
          </details>
          {selection.kind === 'class' && state.activeSteps.length > 0 && (
            <label className="form-field">
              <span>현재 수업에 적용하는 방법</span>
              <select
                value={mode}
                onChange={(event) => {
                  setMode(event.target.value as 'append' | 'replace');
                  setConfirmedForState(null);
                }}
              >
                <option value="append">현재 수업 뒤에 추가</option>
                <option value="replace">새 수업 초안으로 바꾸기</option>
              </select>
            </label>
          )}
          {mode === 'replace' && state.activeSteps.length > 0 && (
            <label className="offline-preset-confirm">
              <input
                type="checkbox"
                checked={confirmed}
                disabled={stale || alreadyApplied}
                onChange={(event) =>
                  setConfirmedForState(event.target.checked ? selection.expected : null)
                }
              />
              현재 편집 중인 수업을 바꿉니다. 되돌리기로 복원할 수 있어요.
            </label>
          )}
          {mode === 'append' && (
            <p className="muted">
              기존 동작 뒤에 추가하며 목표 시간은 유지합니다. 전체 시간은 미리보기에서 확인하세요.
            </p>
          )}
          <button
            type="button"
            className="btn-primary"
            disabled={
              !prepared ||
              stale ||
              alreadyApplied ||
              (mode === 'replace' && state.activeSteps.length > 0 && !confirmed)
            }
            onClick={apply}
          >
            {mode === 'append' ? '현재 수업 뒤에 추가' : '복사해서 편집'}
          </button>
          {alreadyApplied && (
            <div className="offline-preset-stale-box" data-testid="preset-applied-reinspect">
              <p>
                현재 수업에 반영했습니다. 반영된 수업을 기준으로 다시 비교하거나 한 번 더 적용하려면
                아래 버튼으로 다시 검토해 주세요.
              </p>
              <button
                type="button"
                className="btn-secondary"
                onClick={reinspectSelection}
              >
                현재 수업 기준으로 다시 검토
              </button>
            </div>
          )}
          {stale && (
            <div className="offline-preset-stale-box">
              <p role="alert">
                수업이나 계정이 바뀌었어요. 위에서 프리셋을 다시 선택하거나 아래 버튼으로 현재 수업
                기준으로 다시 검토해 주세요.
              </p>
              <button
                type="button"
                className="btn-secondary"
                onClick={reinspectSelection}
              >
                현재 수업 기준으로 다시 검토
              </button>
            </div>
          )}
          {!prepared && (
            <p role="alert">
              프리셋을 준비하지 못했어요. 다른 프리셋이나 직접 구성을 이용해 주세요.
            </p>
          )}
        </section>
      )}
      {message && <p role="alert">{message}</p>}
    </section>
  );
}
