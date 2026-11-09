import { useEffect, useMemo, useRef, useState } from 'react';
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
import { formatSecondsToMMSS, getStepTiming } from '../utils/sequenceEngine';
import { usePilatesStore } from '../store/usePilatesStore';
import type { PilatesStudioState } from '../store/usePilatesStore';
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
}

interface PresetPickerDraftSnapshot {
  kind: Kind;
  apparatus: string;
  theme: string;
  minutes: string;
  selectedPreset: { kind: 'class' | 'block' | 'reusable'; id: string } | null;
  mode: 'append' | 'replace';
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

/** Templates are copied only after a deliberate click. Browsing never changes a plan. */
export function OfflinePresetPicker({ onApplied }: { onApplied: (message: string) => void }) {
  const state = usePilatesStore();
  const [initialDraft] = useState<PresetPickerDraftSnapshot | null>(() => readPresetPickerDraft());
  const [kind, setKind] = useState<Kind>(() => initialDraft?.kind ?? 'class');
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
    return { kind: saved.kind, id: saved.id, expected: current };
  });
  const previewRef = useRef<HTMLElement>(null);
  useEffect(() => {
    previewRef.current?.scrollIntoView?.({ block: 'start', behavior: 'instant' });
  }, [selection]);
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
  const [confirmed, setConfirmed] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const snapshot: PresetPickerDraftSnapshot = {
      kind,
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
  }, [kind, apparatus, theme, minutes, selection, mode]);

  const savedReusableBlocks = getSavedReusableBlocks();
  const options = kind === 'class' ? OFFLINE_CLASS_PRESETS : OFFLINE_BLOCK_PRESETS;
  const matches =
    kind === 'reusable'
      ? []
      : options.filter(
          (item) =>
            (apparatus === 'all' || item.apparatus === apparatus) &&
            (theme === 'all' || item.theme === theme) &&
            (kind === 'block' ||
              minutes === 'all' ||
              ('durationMinutes' in item && item.durationMinutes === Number(minutes))),
        );
  const reusableMatches =
    kind === 'reusable'
      ? savedReusableBlocks.filter(
          (block) => apparatus === 'all' || block.apparatus === apparatus,
        )
      : [];
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
  const stale = !!selection && selection.expected !== state;
  const resetSelection = () => {
    setSelection(null);
    setConfirmed(false);
    setMessage('');
    setLimit(6);
  };
  const choose = (id: string) => {
    if (kind === 'suggested') return;
    const current = usePilatesStore.getState();
    setSelection({ kind, id, expected: current });
    setMode(kind === 'class' && !current.activeSteps.length ? 'replace' : 'append');
    setConfirmed(false);
    setMessage('');
  };
  const apply = () => {
    if (
      !prepared ||
      !selection ||
      stale ||
      (mode === 'replace' && state.activeSteps.length > 0 && !confirmed)
    )
      return;
    const result = usePilatesStore.getState().applyPresetDraft(prepared, mode, selection.expected);
    if (result.success) onApplied(result.message);
    else setMessage(result.message);
  };
  const names = new Map(state.exercises.map((item) => [item.id, item]));
  const totalSeconds =
    prepared?.steps.reduce(
      (sum, step) => sum + getStepTiming(step, names.get(step.exerciseId)).totalSec,
      0,
    ) ?? 0;
  const activeCount = kind === 'reusable' ? reusableMatches.length : matches.length;
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
      <div className="offline-presets-tabs" role="group" aria-label="프리셋 종류">
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
          <div className="offline-presets-filters">
            <label className="form-field">
              <span>프리셋 기구</span>
              <select
                value={apparatus}
                onChange={(event) => {
                  setApparatus(event.target.value);
                  resetSelection();
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
                    resetSelection();
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
                    resetSelection();
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
          <p role="status">{activeCount}개 프리셋 · 시간은 편집 가능한 계획값입니다.</p>
          <div className="offline-presets-list">
            {kind === 'reusable'
              ? reusableMatches.slice(0, limit).map((block) => {
                  const summary = getReusableBlockTimingSummary(block);
                  return (
                    <button
                      type="button"
                      className="offline-preset-card"
                      key={block.id}
                      aria-pressed={selection?.id === block.id}
                      onClick={() => choose(block.id)}
                    >
                      <strong>{block.title}</strong>
                      <span>
                        {summary.totalDurationMin}분 · {block.items.length}개 동작 · v{block.version}
                      </span>
                    </button>
                  );
                })
              : matches.slice(0, limit).map((item) => (
                  <button
                    type="button"
                    className="offline-preset-card"
                    key={item.id}
                    aria-pressed={selection?.id === item.id}
                    onClick={() => choose(item.id)}
                  >
                    <strong>{item.title}</strong>
                    <span>
                      {item.presetKind === 'class-sequence' ? item.durationMinutes : item.durationMin}분 ·{' '}
                      {item.presetKind === 'class-sequence' ? item.steps.length : item.items.length}개 동작
                    </span>
                  </button>
                ))}
          </div>
          {!activeCount && (
            <p>
              조건에 맞는 프리셋이 없어요. 기구·주제·시간을 넓혀 보세요. 직접 구성은 언제든 가능합니다.
            </p>
          )}
          {activeCount > limit && (
            <button type="button" className="btn-secondary" onClick={() => setLimit(limit + 6)}>
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
          <h3>{previewTitle}</h3>
          <p>
            복사할 계획 {formatSecondsToMMSS(totalSeconds)} · 기구:{' '}
            {previewEquipmentList
              .map((id) => APPARATUS_LABELS[id as keyof typeof APPARATUS_LABELS]?.ko ?? id)
              .join(' · ')}
          </p>
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
                  <li key={step.stepId} style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    {ex && <ExerciseThumbnailBadge exercise={ex} size="xs" decorative />}
                    <strong>{ex?.nameKo ?? '현재 목록에 없는 동작'}</strong>
                    <span>
                      {formatSecondsToMMSS(timing.totalSec)} · 수행{' '}
                      {formatSecondsToMMSS(timing.movementSec)} · 설명 {timing.explanationSec}초 ·
                      전환 {timing.transitionSec}초
                    </span>
                    <small>
                      {step.repetitions ? `${step.repetitions}회` : '횟수 미지정'}
                      {step.sets ? ` · ${step.sets}세트` : ''} ·{' '}
                      {timing.sides === 2 ? '양쪽 시간을 포함' : '한쪽 또는 양쪽 함께'}
                    </small>
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
                  setConfirmed(false);
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
                onChange={(event) => setConfirmed(event.target.checked)}
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
              (mode === 'replace' && state.activeSteps.length > 0 && !confirmed)
            }
            onClick={apply}
          >
            {mode === 'append' ? '현재 수업 뒤에 추가' : '복사해서 편집'}
          </button>
          {stale && (
            <p role="alert">수업이나 계정이 바뀌었어요. 위에서 프리셋을 다시 선택해 주세요.</p>
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
