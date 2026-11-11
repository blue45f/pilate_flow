import { useEffect, useId, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { Check, Eye, Link2, Link2Off, RotateCcw, X } from 'lucide-react';
import { getMotionPatternReferences } from '../data/motionPatternReferences';
import type { MotionPatternReference } from '../data/motionPatternReferences';
import type { SequenceMotionStudyBinding } from '../types/sequenceMotion';
import {
  assessSequenceMotionStudyBinding,
  createSequenceMotionStudyBinding,
} from '../utils/sequenceMotionBinding';
import { MotionPatternPreview, MotionPatternThumbnail } from './MotionPatternPreview';
import '../styles/step-motion-study.css';

export interface StepMotionStudyPickerProps {
  exerciseId: string;
  value: SequenceMotionStudyBinding | null | undefined;
  onChange: (value: SequenceMotionStudyBinding | null) => void;
  disabled?: boolean;
  playbackActive?: boolean;
}

type ReferenceKey = `${MotionPatternReference['family']}:${string}`;

interface PreviewViewState {
  exerciseId: string;
  valueSignature: string;
  mode: 'follow-selected' | 'inspecting' | 'closed';
  key?: ReferenceKey;
}

function getReferenceKey(
  reference: Pick<MotionPatternReference, 'family' | 'variantId'>,
): ReferenceKey {
  return `${reference.family}:${reference.variantId}`;
}

function serializeBindingSignature(
  value: SequenceMotionStudyBinding | null | undefined,
): string {
  if (!value) return 'null';
  try {
    return JSON.stringify(value);
  } catch {
    return `${String(value.version)}:${value.family}:${value.variantId}:${value.sourceFingerprint}`;
  }
}

/** A class-only reference choice. It never changes the exercise or grants a review. */
export function StepMotionStudyPicker({
  exerciseId,
  value,
  onChange,
  disabled = false,
  playbackActive = true,
}: StepMotionStudyPickerProps) {
  const group = useId();
  const valueSignature = serializeBindingSignature(value);

  const [disclosure, setDisclosure] = useState<{ exerciseId: string; open: boolean }>(() => ({
    exerciseId,
    open: Boolean(value),
  }));
  const expanded = disclosure.exerciseId === exerciseId ? disclosure.open : Boolean(value);

  const [viewState, setViewState] = useState<PreviewViewState>(() => ({
    exerciseId,
    valueSignature,
    mode: 'follow-selected',
  }));

  const sectionRef = useRef<HTMLElement>(null);
  const summaryRef = useRef<HTMLElement>(null);
  const previewCloseBtnRef = useRef<HTMLButtonElement>(null);
  const triggerElementRef = useRef<HTMLElement | null>(null);
  const previewButtonRefs = useRef<Map<ReferenceKey, HTMLButtonElement>>(new Map());

  const references = getMotionPatternReferences(exerciseId);
  const status = assessSequenceMotionStudyBinding(exerciseId, value ?? undefined);
  const matchedSelected =
    status === 'matched'
      ? references.find(
          (reference) =>
            reference.family === value?.family && reference.variantId === value?.variantId,
        )
      : undefined;

  const effectiveView: PreviewViewState =
    viewState.exerciseId === exerciseId && viewState.valueSignature === valueSignature
      ? viewState
      : { exerciseId, valueSignature, mode: 'follow-selected' };

  const previewed: MotionPatternReference | undefined =
    effectiveView.mode === 'closed'
      ? undefined
      : effectiveView.mode === 'inspecting'
        ? references.find((reference) => getReferenceKey(reference) === effectiveView.key)
        : matchedSelected;

  const isPreviewingConnected = Boolean(
    previewed && matchedSelected && previewed === matchedSelected,
  );

  const label =
    status === 'matched'
      ? '참고 도식 선택됨'
      : status === 'stale'
        ? '제작 원본 변경 · 다시 확인'
        : status === 'unsupported'
          ? '현재 버전에서 열 수 없는 연결'
          : status === 'unrelated'
            ? '동작과의 연결 근거 확인 필요'
            : '연결하지 않음';

  const activePreviewKey = previewed ? getReferenceKey(previewed) : undefined;
  const matchedSelectedKey = matchedSelected ? getReferenceKey(matchedSelected) : undefined;

  const closePreviewAndRestoreFocus = () => {
    const savedTrigger = triggerElementRef.current;
    setViewState({
      exerciseId,
      valueSignature,
      mode: 'closed',
    });

    if (
      savedTrigger?.isConnected &&
      !(savedTrigger instanceof HTMLButtonElement && savedTrigger.disabled) &&
      !(savedTrigger instanceof HTMLInputElement && savedTrigger.disabled)
    ) {
      savedTrigger.focus();
      return;
    }

    const fallbackInspectBtn = activePreviewKey
      ? previewButtonRefs.current.get(activePreviewKey)
      : undefined;
    if (fallbackInspectBtn?.isConnected) {
      fallbackInspectBtn.focus();
      return;
    }

    summaryRef.current?.focus();
  };

  const returnToSelectedPreview = () => {
    if (!matchedSelectedKey) return;
    triggerElementRef.current = previewButtonRefs.current.get(matchedSelectedKey) ?? null;
    setViewState({
      exerciseId,
      valueSignature,
      mode: 'follow-selected',
    });
    if (previewCloseBtnRef.current?.isConnected) {
      previewCloseBtnRef.current.focus();
    } else {
      previewButtonRefs.current.get(matchedSelectedKey)?.focus();
    }
  };

  const closePreviewRef = useRef(closePreviewAndRestoreFocus);
  useEffect(() => {
    closePreviewRef.current = closePreviewAndRestoreFocus;
  });

  useEffect(() => {
    if (!expanded || !previewed) return;
    const sectionEl = sectionRef.current;
    const parentDialog = sectionEl?.closest('dialog');
    if (!sectionEl || !parentDialog) return;

    const handleDialogCancel = (event: Event) => {
      if (sectionEl.contains(document.activeElement)) {
        event.preventDefault();
        event.stopImmediatePropagation();
        closePreviewRef.current();
      }
    };

    parentDialog.addEventListener('cancel', handleDialogCancel, true);
    return () => {
      parentDialog.removeEventListener('cancel', handleDialogCancel, true);
    };
  }, [expanded, previewed]);

  const handleSectionKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key !== 'Escape' || !expanded || !previewed) return;
    event.preventDefault();
    event.stopPropagation();
    closePreviewAndRestoreFocus();
  };

  const toggleInspectReference = (
    reference: MotionPatternReference,
    buttonEl: HTMLButtonElement,
  ) => {
    const key = getReferenceKey(reference);
    triggerElementRef.current = buttonEl;
    if (previewed && getReferenceKey(previewed) === key) {
      setViewState({
        exerciseId,
        valueSignature,
        mode: 'closed',
      });
      buttonEl.focus();
      return;
    }

    setViewState(
      matchedSelected === reference
        ? {
            exerciseId,
            valueSignature,
            mode: 'follow-selected',
          }
        : {
            exerciseId,
            valueSignature,
            mode: 'inspecting',
            key,
          },
    );
  };

  return (
    <section
      ref={sectionRef}
      className="step-motion-study"
      aria-label="수업에 저장할 모션 초안"
      onKeyDown={handleSectionKeyDown}
    >
      <details
        open={expanded}
        onToggle={(event) =>
          setDisclosure({
            exerciseId,
            open: event.currentTarget.open,
          })
        }
      >
        <summary ref={summaryRef}>
          <span>
            <Link2 size={17} aria-hidden="true" /> 수업 모션 연결
          </span>
          <small>{label}</small>
        </summary>
        <div className="sms-content" data-binding-status={status}>
          <p>
            동작과 관련된 미검토 도식입니다. 도식 살펴보기로 먼저 비교한 뒤, 이 수업에 사용할 초안을
            선택해 변경 적용을 눌러 저장하세요.
          </p>
          {disabled && (
            <p className="sms-notice">
              잠긴 블록의 연결은 바꿀 수 없습니다. 도식은 살펴볼 수 있어요.
            </p>
          )}
          {status === 'stale' && (
            <p className="sms-notice" role="status">
              저장한 제작 원본과 현재 초안이 다릅니다. 바뀐 내용을 확인한 뒤 아래 초안을 다시 선택해
              주세요.
            </p>
          )}
          {(status === 'unsupported' || status === 'unrelated') && (
            <p className="sms-notice" role="status">
              저장된 연결 정보는 유지합니다. 현재 열 수 있는 초안을 직접 고르거나 연결을 해제할 수
              있어요.
            </p>
          )}
          {references.length ? (
            <div className="sms-options" role="radiogroup" aria-label="수업 모션 초안 선택">
              {references.map((reference) => {
                const key = getReferenceKey(reference);
                const isSelected = matchedSelected === reference;
                const isPreviewing = previewed === reference;
                return (
                  <div
                    key={key}
                    className={[
                      'sms-option-item',
                      isSelected ? 'is-connected' : '',
                      isPreviewing && !isSelected ? 'is-previewing-only' : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    data-connected={String(isSelected)}
                    data-previewing={String(isPreviewing)}
                  >
                    <label className={`sms-option ${disabled ? 'is-disabled' : ''}`.trim()}>
                      <input
                        type="radio"
                        name={group}
                        aria-label={`${reference.title} 수업 모션으로 선택`}
                        checked={isSelected}
                        disabled={disabled}
                        onClick={(event) => {
                          if (disabled) return;
                          triggerElementRef.current = event.currentTarget;
                          if (isSelected && !isPreviewing) {
                            setViewState({
                              exerciseId,
                              valueSignature,
                              mode: 'follow-selected',
                            });
                          }
                        }}
                        onChange={(event) => {
                          triggerElementRef.current = event.currentTarget;
                          setViewState({
                            exerciseId,
                            valueSignature,
                            mode: 'follow-selected',
                          });
                          const binding = createSequenceMotionStudyBinding(
                            exerciseId,
                            reference.family,
                            reference.variantId,
                          );
                          if (binding) onChange(binding);
                        }}
                      />
                      <span className="sms-thumbnail" aria-hidden="true">
                        <MotionPatternThumbnail reference={reference} />
                      </span>
                      <span className="sms-option-copy">
                        <strong>{reference.title}</strong>
                        <small>{reference.equipment.join(' · ')}</small>
                        <small>관련 패턴 · 전문가 미검토</small>
                        {(isSelected || isPreviewing) && (
                          <span className="sms-option-badges">
                            {isSelected && (
                              <span className="sms-badge sms-badge--connected">
                                <Check size={13} aria-hidden="true" />
                                {isPreviewing ? '현재 연결됨 · 보는 중' : '현재 연결됨'}
                              </span>
                            )}
                            {!isSelected && isPreviewing && (
                              <span className="sms-badge sms-badge--previewing">
                                <Eye size={13} aria-hidden="true" />
                                살펴보는 중 · 미연결
                              </span>
                            )}
                          </span>
                        )}
                      </span>
                    </label>
                    <div className="sms-option-actions">
                      <button
                        ref={(node) => {
                          if (node) previewButtonRefs.current.set(key, node);
                          else previewButtonRefs.current.delete(key);
                        }}
                        type="button"
                        className={`sms-inspect-btn ${isPreviewing ? 'is-active' : ''}`.trim()}
                        aria-label={`${reference.title} 도식 살펴보기`}
                        aria-pressed={isPreviewing}
                        onClick={(event) => toggleInspectReference(reference, event.currentTarget)}
                      >
                        <Eye size={15} aria-hidden="true" />
                        <span>{isPreviewing ? '보는 중 · 닫기' : '도식 살펴보기'}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="sms-empty">
              아직 이 동작에 연결할 수 있는 도식이 없습니다. 다른 동작의 모션으로 대신 표시하지
              않습니다.
            </p>
          )}
          {value && (
            <button
              type="button"
              className="btn-secondary sms-clear"
              disabled={disabled}
              onClick={() => {
                setViewState({
                  exerciseId,
                  valueSignature: 'null',
                  mode: 'follow-selected',
                });
                onChange(null);
              }}
            >
              <Link2Off size={16} aria-hidden="true" /> 이번 수업의 연결 해제
            </button>
          )}
          {previewed && (
            <div
              className={[
                'sms-preview-panel',
                isPreviewingConnected ? 'is-connected-preview' : 'is-browsing-preview',
              ].join(' ')}
              data-testid="sms-preview-panel"
              data-preview-mode={isPreviewingConnected ? 'connected' : 'browsing'}
              data-preview-variant={previewed.variantId}
            >
              <div className="sms-preview-bar">
                <div className="sms-preview-bar-copy">
                  <span
                    className={[
                      'sms-preview-pill',
                      isPreviewingConnected ? 'is-connected' : 'is-browsing',
                    ].join(' ')}
                    data-testid="sms-preview-state"
                  >
                    {isPreviewingConnected
                      ? '현재 수업에 연결된 도식'
                      : '선택 전 살펴보기 중 · 미연결'}
                  </span>
                  {!isPreviewingConnected && matchedSelected && (
                    <small className="sms-preview-current-link">
                      현재 연결 유지: {matchedSelected.title}
                    </small>
                  )}
                  {!isPreviewingConnected && !matchedSelected && value && (
                    <small className="sms-preview-current-link">
                      기존 저장 연결 정보는 변경되지 않았습니다
                    </small>
                  )}
                </div>
                <div className="sms-preview-bar-actions">
                  {matchedSelected && !isPreviewingConnected && (
                    <button
                      type="button"
                      className="btn-secondary sms-return-selected"
                      onClick={returnToSelectedPreview}
                    >
                      <RotateCcw size={15} aria-hidden="true" />
                      <span>연결된 초안으로 돌아가기</span>
                    </button>
                  )}
                  <button
                    ref={previewCloseBtnRef}
                    type="button"
                    className="btn-secondary sms-preview-close"
                    onClick={closePreviewAndRestoreFocus}
                  >
                    <X size={15} aria-hidden="true" />
                    <span>미리보기 닫기</span>
                  </button>
                </div>
              </div>
              <MotionPatternPreview
                key={`${exerciseId}:${previewed.family}:${previewed.variantId}`}
                reference={previewed}
                active={expanded && playbackActive}
              />
            </div>
          )}
          <p className="sms-boundary">
            연결은 시범의 정확성이나 안전성 승인이 아닙니다. 횟수·좌우·수업 시간은 자동으로 바뀌지
            않습니다.
          </p>
        </div>
      </details>
    </section>
  );
}
