import { useRef, useState } from 'react';
import { ArrowUpRight, Plus, X } from 'lucide-react';
import { MOTION_PATTERN_REFERENCES } from '../data/motionPatternReferences';
import type { MotionPatternReference } from '../data/motionPatternReferences';
import { usePilatesStore } from '../store/usePilatesStore';
import type { PilatesExercise } from '../types/pilates';
import { isExerciseAutoEligible } from '../utils/exerciseReview';
import { MotionPatternPreview, MotionPatternThumbnail } from './MotionPatternPreview';
import '../styles/motion-pattern-gallery.css';

const INITIAL_VARIANTS = [
  'articulated-pelvic-curl',
  'supine-knee-fold',
  'side-lying-straight-leg-lift',
] as const;
const initialReferences = INITIAL_VARIANTS.map((id) =>
  MOTION_PATTERN_REFERENCES.find((reference) => reference.variantId === id)!,
);

function studyTitle(reference: MotionPatternReference): string {
  switch (reference.variantId) {
    case 'articulated-pelvic-curl':
      return '골반 말기 패턴';
    case 'supine-knee-fold':
      return '누워서 무릎 들기';
    case 'side-lying-straight-leg-lift':
      return '옆으로 다리 들기';
    default:
      return reference.title;
  }
}

export interface MotionPatternGalleryProps {
  onViewAll?: () => void;
  onOpenExercise?: (exercise: PilatesExercise) => void;
  onInsertExercise?: (exercise: PilatesExercise) => void;
  active?: boolean;
  className?: string;
}

/** Three authored assets for the workbench entry point; playback is an explicit local action. */
export function MotionPatternGallery({
  onViewAll,
  onOpenExercise,
  onInsertExercise,
  active = true,
  className = '',
}: MotionPatternGalleryProps) {
  const [selected, setSelected] = useState<MotionPatternReference | null>(null);
  const exercises = usePilatesStore((state) => state.exercises);
  const preview = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement | null>(null);
  const linkedExercise = selected
    ? exercises.find((item) => selected.intendedExerciseIds.includes(item.id))
    : undefined;
  const linkedApproved = linkedExercise ? isExerciseAutoEligible(linkedExercise) : false;
  return (
    <section className={`motion-pattern-gallery ${className}`} aria-label="모션으로 살펴보기">
      <header className="mpg-heading">
        <div>
          <p>ORIGINAL MOTION STUDIES</p>
          <h2>모션으로 살펴보기</h2>
        </div>
        {onViewAll && (
          <button type="button" onClick={onViewAll}>
            모두 보기 <ArrowUpRight size={15} aria-hidden="true" />
          </button>
        )}
      </header>
      <p className="mpg-inventory">
        재생 가능한 도식 초안 {MOTION_PATTERN_REFERENCES.length}개{' '}
        <span>개별 동작과의 일치 확인 0 · 전문가 검토 0</span>
      </p>
      <div className="mpg-cards">
        {initialReferences.map((reference) => (
          <button
            type="button"
            key={reference.variantId}
            className="mpg-card"
            aria-label={`${reference.title} 관련 패턴 초안 보기`}
            aria-pressed={selected?.variantId === reference.variantId}
            onClick={(event) => {
              trigger.current = event.currentTarget;
              setSelected(reference);
              requestAnimationFrame(() => preview.current?.focus());
            }}
          >
            <div className="mpg-thumbnail">
              <MotionPatternThumbnail reference={reference} />
              <span>도식 초안</span>
            </div>
            <strong>{studyTitle(reference)}</strong>
            <small>관련 패턴 보기 ↗</small>
          </button>
        ))}
      </div>
      {selected && (
        <div ref={preview} className="mpg-selected" tabIndex={-1}>
          <button
            type="button"
            className="mpg-close"
            aria-label="모션 살펴보기 닫기"
            onClick={() => {
              setSelected(null);
              trigger.current?.focus();
            }}
          >
            <X size={15} aria-hidden="true" />
            닫기
          </button>
          <MotionPatternPreview reference={selected} active={active} />
          {linkedExercise && (
            <section
              className="mpg-exercise-summary"
              aria-label="연결 동작 설명·주의점 및 시퀀스 삽입"
            >
              <div className="mpg-exercise-summary-header">
                <strong>연결 동작 노트 · {linkedExercise.nameKo}</strong>
                <span>
                  {linkedApproved
                    ? '내 검토 기록 있음 · 전문가 검증 아님'
                    : '미검토 자료 · 수업안에 추가 가능'}
                </span>
              </div>
              {linkedExercise.cues.length > 0 && (
                <div className="mpg-exercise-cues">
                  <h4>동작 설명·티칭 큐</h4>
                  <ul>
                    {linkedExercise.cues.slice(0, 3).map((cue) => (
                      <li key={cue}>{cue}</li>
                    ))}
                  </ul>
                </div>
              )}
              {linkedExercise.precautions?.trim() && (
                <div className="mpg-exercise-precautions">
                  <h4>주의점·금기 사항</h4>
                  <p>{linkedExercise.precautions}</p>
                </div>
              )}
              {(onOpenExercise || onInsertExercise) && (
                <div className="mpg-exercise-actions">
                  {onOpenExercise && (
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => onOpenExercise(linkedExercise)}
                    >
                      노트 상세·검토 열기
                    </button>
                  )}
                  {onInsertExercise && (
                    <button
                      type="button"
                      className="btn-primary"
                      onClick={() => onInsertExercise(linkedExercise)}
                    >
                      <Plus size={15} aria-hidden="true" /> 시퀀스에 바로 삽입
                    </button>
                  )}
                </div>
              )}
            </section>
          )}
        </div>
      )}
    </section>
  );
}
