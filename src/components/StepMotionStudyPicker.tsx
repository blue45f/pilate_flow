import { useId, useState } from 'react';
import { Check, Link2, Link2Off } from 'lucide-react';
import { getMotionPatternReferences } from '../data/motionPatternReferences';
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

/** A class-only reference choice. It never changes the exercise or grants a review. */
export function StepMotionStudyPicker({
  exerciseId,
  value,
  onChange,
  disabled = false,
  playbackActive = true,
}: StepMotionStudyPickerProps) {
  const group = useId();
  const [expanded, setExpanded] = useState(Boolean(value));
  const references = getMotionPatternReferences(exerciseId);
  const status = assessSequenceMotionStudyBinding(exerciseId, value ?? undefined);
  const selected = references.find(
    (reference) => reference.family === value?.family && reference.variantId === value?.variantId,
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
  return (
    <section className="step-motion-study" aria-label="수업에 저장할 모션 초안">
      <details open={expanded} onToggle={(event) => setExpanded(event.currentTarget.open)}>
        <summary>
          <span>
            <Link2 size={17} aria-hidden="true" /> 수업 모션 연결
          </span>
          <small>{label}</small>
        </summary>
        <div className="sms-content" data-binding-status={status}>
          <p>
            동작과 관련된 미검토 도식입니다. 이 수업에 사용할 초안을 고른 뒤 변경 적용을 눌러
            저장하세요.
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
              {references.map((reference) => (
                <label key={`${reference.family}:${reference.variantId}`} className="sms-option">
                  <input
                    type="radio"
                    name={group}
                    aria-label={`${reference.title} 수업 모션으로 선택`}
                    checked={status === 'matched' && selected === reference}
                    disabled={disabled}
                    onChange={() => {
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
                  </span>
                  {status === 'matched' && selected === reference && (
                    <Check size={17} aria-hidden="true" />
                  )}
                </label>
              ))}
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
              onClick={() => onChange(null)}
            >
              <Link2Off size={16} aria-hidden="true" /> 이번 수업의 연결 해제
            </button>
          )}
          {status === 'matched' && selected && (
            <MotionPatternPreview
              key={`${selected.family}:${selected.variantId}`}
              reference={selected}
              active={expanded && playbackActive}
            />
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
