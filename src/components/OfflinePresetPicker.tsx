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
import { formatSecondsToMMSS, getStepTiming } from '../utils/sequenceEngine';
import { usePilatesStore } from '../store/usePilatesStore';
import type { PilatesStudioState } from '../store/usePilatesStore';
import { PresetSuggestionCandidatePreview } from '../features/presetSuggestionCandidate';
import '../styles/offline-presets.css';

type Kind = 'class' | 'block' | 'suggested';
interface Selection {
  kind: 'class' | 'block';
  id: string;
  expected: PilatesStudioState;
}

/** Templates are copied only after a deliberate click. Browsing never changes a plan. */
export function OfflinePresetPicker({ onApplied }: { onApplied: (message: string) => void }) {
  const state = usePilatesStore();
  const [kind, setKind] = useState<Kind>('class');
  const [apparatus, setApparatus] = useState('all');
  const [theme, setTheme] = useState('all');
  const [minutes, setMinutes] = useState('all');
  const [limit, setLimit] = useState(6);
  const [selection, setSelection] = useState<Selection | null>(null);
  const previewRef = useRef<HTMLElement>(null);
  useEffect(() => {
    previewRef.current?.scrollIntoView?.({ block: 'start', behavior: 'instant' });
  }, [selection]);
  const [mode, setMode] = useState<'append' | 'replace'>('append');
  const [confirmed, setConfirmed] = useState(false);
  const [message, setMessage] = useState('');
  const options = kind === 'class' ? OFFLINE_CLASS_PRESETS : OFFLINE_BLOCK_PRESETS;
  const matches = options.filter(
    (item) =>
      (apparatus === 'all' || item.apparatus === apparatus) &&
      (theme === 'all' || item.theme === theme) &&
      (kind === 'block' ||
        minutes === 'all' ||
        ('durationMinutes' in item && item.durationMinutes === Number(minutes))),
  );
  const selected =
    selection?.kind === 'class'
      ? OFFLINE_CLASS_PRESETS.find((item) => item.id === selection.id)
      : selection?.kind === 'block'
        ? OFFLINE_BLOCK_PRESETS.find((item) => item.id === selection.id)
        : undefined;
  const prepared = useMemo(() => {
    if (!selected || !selection) return null;
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
  return (
    <section className="offline-presets" aria-label="오프라인 수업·연계 블록 프리셋">
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
            apparatus: apparatus === 'all' ? 'reformer' : apparatus,
            theme: theme === 'all' ? undefined : theme,
            targetMinutes: minutes === 'all' ? 50 : Number(minutes),
            catalogExercises: state.exercises,
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
          <p role="status">{matches.length}개 프리셋 · 시간은 편집 가능한 계획값입니다.</p>
          <div className="offline-presets-list">
            {matches.slice(0, limit).map((item) => (
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
          {!matches.length && (
            <p>
              조건에 맞는 프리셋이 없어요. 기구·주제·시간을 넓혀 보세요. 직접 구성은 언제든 가능합니다.
            </p>
          )}
          {matches.length > limit && (
            <button type="button" className="btn-secondary" onClick={() => setLimit(limit + 6)}>
              프리셋 더 보기
            </button>
          )}
        </>
      )}
      {selected && selection && (
        <section
          ref={previewRef}
          className="offline-preset-preview"
          aria-label="선택한 프리셋 확인"
        >
          <h3>{selected.title}</h3>
          <p>
            복사할 계획 {formatSecondsToMMSS(totalSeconds)} · 기구:{' '}
            {selected.requiredEquipment
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
                  <li key={step.stepId}>
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
