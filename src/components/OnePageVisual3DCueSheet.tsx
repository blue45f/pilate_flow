import React, { useMemo, useState } from 'react';
import { Columns2, Printer, Rows3, Zap } from 'lucide-react';
import { APPARATUS_LABELS } from '../data/pilatesCatalog';
import { PfBadge, PfButton } from '../design-system';
import type {
  ApparatusType,
  DifficultyLevel,
  PilatesExercise,
  SequenceStep,
} from '../types/pilates';
import { formatDifficultyBadgeKo } from '../utils/memberBookingBridge';
import {
  formatSecondsToMMSS,
  getSequenceDurations,
  getStepSideLabels,
  getStepTiming,
  isRestStep,
} from '../utils/sequenceEngine';
import { getSequenceStepClassSection } from '../utils/sequenceMotionBinding';
import { resolveStudio3DMotionForExercise } from '../utils/studio3dMotionCatalog';
import { SpringVisualPills } from './SpringVisualPills';

export interface OnePageVisual3DCueSheetProps {
  readonly title: string;
  readonly subtitle?: string;
  readonly apparatus: ApparatusType | 'mixed';
  readonly level: DifficultyLevel;
  readonly steps: readonly SequenceStep[];
  readonly exercises: readonly PilatesExercise[];
  readonly showPrintButton?: boolean;
}

const SECTION_LABEL_KO: Record<string, string> = {
  preparation: '준비',
  warmup: '준비',
  main: '본운동',
  cooldown: '마무리',
  rest: '휴식',
};

export const OnePageVisual3DCueSheet: React.FC<OnePageVisual3DCueSheetProps> = ({
  title,
  subtitle,
  apparatus,
  level,
  steps,
  exercises,
  showPrintButton = true,
}) => {
  const [layoutDensity, setLayoutDensity] = useState<'two-col-print' | 'single-col-tablet'>(
    'two-col-print',
  );

  const exerciseMap = useMemo(
    () => new Map(exercises.map((item) => [item.id, item])),
    [exercises],
  );
  const durations = useMemo(() => getSequenceDurations([...steps]), [steps]);

  const enrichedRows = useMemo(() => {
    let prevSpringNorm = '';
    let springChangeTotal = 0;
    const rows = steps.map((step, idx) => {
      const rest = isRestStep(step);
      const ex = !rest ? exerciseMap.get(step.exerciseId) : undefined;
      const timing = getStepTiming(step, ex);
      const sectionRole = rest ? 'rest' : getSequenceStepClassSection(step, [...steps]);
      const sectionLabelKo = SECTION_LABEL_KO[sectionRole] ?? '본운동';
      const springs = rest
        ? ''
        : (step.customSpringOverride || ex?.springs || '').trim();
      const normSpring = springs.toLowerCase();
      const hasSpringDelta =
        !rest && Boolean(normSpring && prevSpringNorm && normSpring !== prevSpringNorm);
      if (hasSpringDelta) springChangeTotal += 1;
      if (!rest && normSpring) prevSpringNorm = normSpring;

      const motion3d = ex ? resolveStudio3DMotionForExercise(ex) : null;
      const primaryCue = rest
        ? step.instructorNote || '호흡 정리 및 다음 기구 세팅 점검'
        : step.instructorNote?.trim() || ex?.cues[0] || '정렬과 호흡 리듬을 확인하세요.';
      const sideText =
        !rest && (ex?.isUnilateral || step.sideMode)
          ? getStepSideLabels(step, ex).join('→')
          : null;

      return {
        step,
        orderLabel: String(idx + 1).padStart(2, '0'),
        rest,
        nameKo: rest ? '중간 휴식 · 세팅 전환' : (ex?.nameKo ?? step.exerciseSnapshot?.nameKo ?? '동작 확인'),
        sectionLabelKo,
        durationLabel: formatSecondsToMMSS(timing.totalSec),
        springs,
        hasSpringDelta,
        thumbSrc: motion3d?.peakImg ?? null,
        primaryCue,
        breathText: !rest ? ex?.breathPattern : undefined,
        repsSetsText:
          !rest && step.repetitions !== undefined
            ? `${step.repetitions}회${step.sets !== undefined ? `×${step.sets}세트` : ''}`
            : null,
        sideText,
      };
    });
    return { rows, springChangeTotal };
  }, [steps, exerciseMap]);

  const apparatusKo =
    apparatus === 'mixed' ? '복합 기구' : (APPARATUS_LABELS[apparatus]?.ko ?? apparatus);
  const movementCount = enrichedRows.rows.filter((r) => !r.rest).length;

  return (
    <section
      className={`pf-visual-1p-cuesheet ${
        layoutDensity === 'two-col-print' ? 'is-two-col' : 'is-single-col'
      }`}
      data-testid="one-page-visual-3d-cuesheet"
      data-layout-density={layoutDensity}
      aria-label="1페이지 3D 시각 요약 큐시트"
    >
      <header className="pf-visual-1p-cuesheet__header">
        <div className="pf-visual-1p-cuesheet__titles">
          <span className="eyebrow">ONE-PAGE 3D VISUAL CUE SHEET</span>
          <h3>{title || '오늘의 수업 큐시트'}</h3>
          {subtitle && <p>{subtitle}</p>}
          <div className="pf-class-badges-strip">
            <span className="pf-class-apparatus-pill">{apparatusKo}</span>
            <PfBadge tone="sage">{formatDifficultyBadgeKo(level)}</PfBadge>
            <PfBadge tone="brand">
              총 {formatSecondsToMMSS(durations.totalSec)} · 동작 {movementCount}개
            </PfBadge>
            <PfBadge tone={enrichedRows.springChangeTotal > 0 ? 'warning' : 'sage'}>
              스프링 전환 {enrichedRows.springChangeTotal}회
            </PfBadge>
          </div>
        </div>

        <div className="pf-visual-1p-cuesheet__controls cue-sheet-no-print">
          <div role="group" aria-label="1페이지 큐시트 배열 밀도" className="pf-visual-1p-density">
            <button
              type="button"
              className={`log-quick-note-chip ${layoutDensity === 'two-col-print' ? 'is-selected' : ''}`.trim()}
              aria-pressed={layoutDensity === 'two-col-print'}
              onClick={() => setLayoutDensity('two-col-print')}
            >
              <Columns2 size={14} aria-hidden="true" /> A4 1장 2열 압축
            </button>
            <button
              type="button"
              className={`log-quick-note-chip ${layoutDensity === 'single-col-tablet' ? 'is-selected' : ''}`.trim()}
              aria-pressed={layoutDensity === 'single-col-tablet'}
              onClick={() => setLayoutDensity('single-col-tablet')}
            >
              <Rows3 size={14} aria-hidden="true" /> 태블릿 1열 크게 보기
            </button>
          </div>
          {showPrintButton && (
            <PfButton
              variant="primary"
              data-testid="one-page-visual-cuesheet-print-btn"
              onClick={() => window.print()}
            >
              <Printer size={15} aria-hidden="true" /> 1페이지 큐시트 인쇄
            </PfButton>
          )}
        </div>
      </header>

      {enrichedRows.rows.length === 0 ? (
        <p className="muted">수업안에 등록된 동작이 없습니다.</p>
      ) : (
        <ol className="pf-visual-1p-cuesheet__grid" aria-label="1페이지 시각 큐시트 순서">
          {enrichedRows.rows.map((row) => (
            <li
              key={row.step.stepId}
              className={`pf-visual-1p-row ${row.rest ? 'is-rest' : ''} ${
                row.hasSpringDelta ? 'has-spring-delta' : ''
              }`.trim()}
              data-testid="visual-1p-cuesheet-row"
            >
              {row.thumbSrc ? (
                <img
                  src={row.thumbSrc}
                  alt=""
                  aria-hidden="true"
                  loading="lazy"
                  className="pf-visual-1p-row__thumb"
                />
              ) : (
                <div className="pf-visual-1p-row__rest-box" aria-hidden="true">
                  휴식
                </div>
              )}
              <div className="pf-visual-1p-row__body">
                <div className="pf-visual-1p-row__top">
                  <span className="pf-visual-1p-row__num">{row.orderLabel}</span>
                  <span className="pf-visual-1p-row__sec">{row.sectionLabelKo}</span>
                  <strong className="pf-visual-1p-row__name">{row.nameKo}</strong>
                  <span className="pf-visual-1p-row__time">{row.durationLabel}</span>
                </div>
                {!row.rest && (
                  <div className="pf-visual-1p-row__meta">
                    {row.springs && <SpringVisualPills springs={row.springs} />}
                    {row.hasSpringDelta && (
                      <span
                        className="pf-visual-1p-row__delta"
                        data-testid="visual-1p-spring-delta"
                      >
                        <Zap size={11} aria-hidden="true" /> 스프링 전환
                      </span>
                    )}
                    {row.repsSetsText && (
                      <span className="pf-visual-1p-row__pill">{row.repsSetsText}</span>
                    )}
                    {row.sideText && (
                      <span className="pf-visual-1p-row__pill">{row.sideText}</span>
                    )}
                  </div>
                )}
                <p className="pf-visual-1p-row__cue">{row.primaryCue}</p>
              </div>
            </li>
          ))}
        </ol>
      )}

      <footer className="pf-visual-1p-cuesheet__footer">
        수업 준비 요약 시트 · 3D 썸네일과 권장 스프링은 기구 세팅 참고용이며 대상자 컨디션과 실제
        장력은 강사가 현장에서 직접 확인합니다.
      </footer>
    </section>
  );
};
