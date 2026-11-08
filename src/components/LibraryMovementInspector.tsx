import { PostureAnatomyGuide } from './PostureAnatomyGuide';
import type { RefObject } from 'react';
import { ArrowUpRight, Check, Info, Plus, X } from 'lucide-react';
import { APPARATUS_LABELS, POSITION_LABELS } from '../data/pilatesCatalog';
import { getExerciseReviewState } from '../utils/exerciseReview';
import type { PilatesExercise } from '../types/pilates';

interface LibraryMovementInspectorProps {
  exercise: PilatesExercise | null;
  headingRef: RefObject<HTMLHeadingElement | null>;
  isInResults: boolean;
  onClose: () => void;
  onOpenDetails: (exercise: PilatesExercise) => void;
  onAdd: (exercise: PilatesExercise) => void;
  addedId: string | null;
}

const LEVEL_LABELS = { '1.0': '기초', '1.5': '중급', '2.0': '심화' };

export function LibraryMovementInspector({
  exercise,
  headingRef,
  isInResults,
  onClose,
  onOpenDetails,
  onAdd,
  addedId,
}: LibraryMovementInspectorProps) {
  const reviewState = exercise ? getExerciseReviewState(exercise) : null;
  const isAdded = Boolean(exercise && addedId === exercise.id);

  return (
    <aside
      id="library-movement-inspector"
      className="library-movement-inspector"
      data-empty={!exercise}
      aria-labelledby="library-inspector-heading"
      onKeyDown={(event) => {
        if (event.key === 'Escape' && exercise) {
          event.preventDefault();
          onClose();
        }
      }}
    >
      <div className="library-inspector-header">
        <div className="library-inspector-title-group">
          <span className="library-inspector-step-badge" data-testid="inspector-flow-step-badge">
            {exercise ? '3 세부 안내 확인·수업안 추가' : '2 동작 카드 선택 대기'}
          </span>
          <h2 id="library-inspector-heading" ref={headingRef} tabIndex={-1}>
            선택한 동작 정보
          </h2>
        </div>
        {exercise && (
          <button type="button" onClick={onClose} aria-label="선택한 동작 정보 닫기">
            <X size={18} aria-hidden="true" />
          </button>
        )}
      </div>
      {exercise ? (
        <div className="library-inspector-content">
          <h3>{exercise.nameKo}</h3>
          <p className="library-inspector-english">{exercise.nameEn}</p>
          {!isInResults && (
            <p className="library-inspector-filter-note" role="status">
              현재 검색 결과에 없는 동작입니다. 선택한 정보는 유지했어요.
            </p>
          )}
          <PostureAnatomyGuide exercise={exercise} compact />
          <dl>
            <div>
              <dt>기구</dt>
              <dd>{APPARATUS_LABELS[exercise.apparatus].ko}</dd>
            </div>
            <div>
              <dt>난이도</dt>
              <dd>{LEVEL_LABELS[exercise.level]}</dd>
            </div>
            <div>
              <dt>자세</dt>
              <dd>{POSITION_LABELS[exercise.bodyPosition].ko}</dd>
            </div>
            <div>
              <dt>계획 시간</dt>
              <dd>
                {exercise.defaultDurationMin}분{exercise.isUnilateral ? ' · 양쪽 포함' : ''}
              </dd>
            </div>
            <div>
              <dt>출처</dt>
              <dd>{exercise.sourceReference?.publisher || '동작 노트'}</dd>
            </div>
          </dl>
          <section className="library-inspector-review">
            <h4>개인 검토 기록</h4>
            <p>
              {reviewState === 'approved'
                ? '내 검토 기록 있음 · 전문가 검증 아님'
                : reviewState === 'stale'
                  ? '동작 정보 변경 · 다시 검토 필요'
                  : '미검토 자료 · 수업 전 확인'}
            </p>
            <p className="library-inspector-safety">
              <Info size={15} aria-hidden="true" />
              개인 검토는 외부 전문 검증이나 개인별 적합성 확인을 대신하지 않습니다.
            </p>
          </section>
          {exercise.precautions?.trim() && (
            <section className="library-inspector-precautions">
              <h4>기존 주의 메모</h4>
              <p>{exercise.precautions}</p>
            </section>
          )}
          <div className="library-inspector-actions">
            <button type="button" className="btn-secondary" onClick={() => onOpenDetails(exercise)}>
              전체 정보·개인 검토 열기 <ArrowUpRight size={16} aria-hidden="true" />
            </button>
            <button
              type="button"
              className="btn-primary"
              data-added={isAdded ? 'true' : 'false'}
              onClick={() => onAdd(exercise)}
            >
              {isAdded ? <Check size={16} aria-hidden="true" /> : <Plus size={16} aria-hidden="true" />}
              선택한 동작 수업안에 추가
            </button>
            <span className="sr-only" role="status" aria-live="polite">
              {isAdded ? `${exercise.nameKo} 동작을 수업안에 추가했습니다.` : ''}
            </span>
          </div>
        </div>
      ) : (
        <p className="library-inspector-empty">
          목록에서 동작 이름을 선택하면 기구·시간·주의 메모를 확인할 수 있어요.
        </p>
      )}
    </aside>
  );
}
