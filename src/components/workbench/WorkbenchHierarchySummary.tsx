import type { SequenceStep } from '../../types/pilates';
import { isRestStep } from '../../utils/sequenceEngine';

export interface WorkbenchHierarchySummaryProps {
  readonly activeSteps: readonly SequenceStep[];
  readonly sectionCount: number;
  readonly exerciseStepCount: number;
}

export function WorkbenchHierarchySummary({
  activeSteps,
  sectionCount,
  exerciseStepCount,
}: WorkbenchHierarchySummaryProps) {
  if (!activeSteps.length) return null;

  const reusableBlockCount = new Set(
    activeSteps
      .map((step) => step.blockInstanceId ?? step.sourceBlockId)
      .filter((id): id is string => Boolean(id)),
  ).size;

  const layerCounts = activeSteps.reduce(
    (acc, step) => {
      if (isRestStep(step)) return acc;
      const layer = step.selectedLayer ?? 'standard';
      if (layer === 'easy') acc.easy += 1;
      else if (layer === 'hard') acc.hard += 1;
      else acc.standard += 1;
      return acc;
    },
    { easy: 0, standard: 0, hard: 0 },
  );

  return (
    <details className="workbench-hierarchy-details">
      <summary>
        4계층 구조 요약 (구간 {sectionCount} · 동작 {exerciseStepCount})
      </summary>
      <div
        className="workbench-hierarchy-grid"
        role="list"
        aria-label="4계층 구조 요약"
      >
        <div className="workbench-hierarchy-item" role="listitem">
          <span className="workbench-hierarchy-label">1. 구간 (Section)</span>
          <strong className="workbench-hierarchy-value">
            {sectionCount}개 구간
          </strong>
          <span className="workbench-hierarchy-meta">
            준비 · 본운동 · 마무리 · 휴식
          </span>
        </div>
        <div className="workbench-hierarchy-item" role="listitem">
          <span className="workbench-hierarchy-label">2. 블록 (Block)</span>
          <strong className="workbench-hierarchy-value">
            {reusableBlockCount}개 연결
          </strong>
          <span className="workbench-hierarchy-meta">재사용 블록 인스턴스</span>
        </div>
        <div className="workbench-hierarchy-item" role="listitem">
          <span className="workbench-hierarchy-label">3. 레이어 (Layer)</span>
          <strong className="workbench-hierarchy-value">
            가볍게 {layerCounts.easy} · 기본 {layerCounts.standard} · 도전{' '}
            {layerCounts.hard}
          </strong>
          <span className="workbench-hierarchy-meta">난이도 변형 분포</span>
        </div>
        <div className="workbench-hierarchy-item" role="listitem">
          <span className="workbench-hierarchy-label">4. 동작 (Movement)</span>
          <strong className="workbench-hierarchy-value">
            {exerciseStepCount}개 동작
          </strong>
          <span className="workbench-hierarchy-meta">
            전체 {activeSteps.length}개 항목 중 수행 동작
          </span>
        </div>
      </div>
    </details>
  );
}
