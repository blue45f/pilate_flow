import React, { useMemo, useState } from 'react';
import { Columns2, Printer, QrCode, Rows3, Zap } from 'lucide-react';
import { APPARATUS_LABELS } from '../data/pilatesCatalog';
import { PfBadge, PfButton } from '../design-system';
import { usePilatesStore } from '../store/usePilatesStore';
import type {
  ApparatusType,
  DifficultyLevel,
  PilatesExercise,
  ReformerBrand,
  SequenceStep,
} from '../types/pilates';
import {
  BRAND_SPRING_OPTIONS,
  HONEST_BRAND_SPRING_CAUTION_KO,
  formatBrandSpringEquivalent,
} from '../utils/brandSpringConverter';
import { buildSequenceShareUrl, generateLocalQrCodeSvg } from '../utils/localQrSequenceShare';
import { formatDifficultyBadgeKo } from '../utils/memberBookingBridge';
import {
  formatSecondsToMMSS,
  getSequenceDurations,
  getStepSideLabels,
  getStepTiming,
  isRestStep,
} from '../utils/sequenceEngine';
import { getSequenceStepClassSection } from '../utils/sequenceMotionBinding';
import { ExerciseMotionArtwork } from './ExerciseMotionArtwork';
import { SpringVisualPills } from './SpringVisualPills';

export interface OnePageVisual3DCueSheetProps {
  readonly title: string;
  readonly subtitle?: string;
  readonly apparatus: ApparatusType | 'mixed';
  readonly level: DifficultyLevel;
  readonly steps: readonly SequenceStep[];
  readonly exercises: readonly PilatesExercise[];
  readonly showPrintButton?: boolean;
  readonly initialBrand?: ReformerBrand;
  /** When supplied, teaching notes are limited to these currently reviewed exercises. */
  readonly reviewedTeachingExerciseIds?: ReadonlySet<string>;
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
  initialBrand,
  reviewedTeachingExerciseIds,
}) => {
  const storeBrand = usePilatesStore((s) => s.reformerBrand);
  const setStoreBrand = usePilatesStore((s) => s.setReformerBrand);
  const [localBrandOverride, setLocalBrandOverride] = useState<ReformerBrand | null>(
    initialBrand ?? null,
  );
  const activeBrand: ReformerBrand = localBrandOverride ?? storeBrand ?? 'intopilates';

  const [layoutDensity, setLayoutDensity] = useState<'two-col-print' | 'single-col-tablet'>(
    'two-col-print',
  );
  const [showCornerQr, setShowCornerQr] = useState(false);

  const selectBrand = (nextBrand: ReformerBrand) => {
    setLocalBrandOverride(nextBrand);
    setStoreBrand(nextBrand);
  };

  const exerciseMap = useMemo(() => new Map(exercises.map((item) => [item.id, item])), [exercises]);
  const durations = useMemo(() => getSequenceDurations([...steps]), [steps]);

  const cornerQrResult = useMemo(() => {
    if (!showCornerQr || steps.length === 0) return null;
    try {
      const targetMin = Math.max(5, Math.round(durations.totalSec / 60) || 50);
      const built = buildSequenceShareUrl({
        title,
        subtitle,
        apparatus,
        level,
        targetMinutes: targetMin,
        reformerBrand: activeBrand,
        steps,
        exercises,
        includeInstructorNotes: false,
      });
      return generateLocalQrCodeSvg(built.shareUrl, { quietZone: 2 });
    } catch {
      return null;
    }
  }, [
    showCornerQr,
    steps,
    durations.totalSec,
    title,
    subtitle,
    apparatus,
    level,
    activeBrand,
    exercises,
  ]);

  const enrichedRows = useMemo(() => {
    let prevSpringNorm = '';
    let springChangeTotal = 0;
    const rows = [];
    for (const [idx, step] of steps.entries()) {
      const rest = isRestStep(step);
      const ex = !rest ? exerciseMap.get(step.exerciseId) : undefined;
      const timing = getStepTiming(step, ex);
      const sectionRole = rest ? 'rest' : getSequenceStepClassSection(step, [...steps]);
      const sectionLabelKo = SECTION_LABEL_KO[sectionRole] ?? '본운동';
      const springs = rest ? '' : (step.customSpringOverride || ex?.springs || '').trim();
      const normSpring = springs.toLowerCase();
      const hasSpringDelta =
        !rest && Boolean(normSpring && prevSpringNorm && normSpring !== prevSpringNorm);
      if (hasSpringDelta) springChangeTotal += 1;
      if (!rest && normSpring) prevSpringNorm = normSpring;

      const brandConverted =
        !rest && springs
          ? formatBrandSpringEquivalent(springs, activeBrand, ex?.apparatus ?? apparatus)
          : null;

      const canShowTeachingNotes =
        reviewedTeachingExerciseIds === undefined ||
        (!rest && ex !== undefined && reviewedTeachingExerciseIds.has(ex.id));
      const primaryCue = !canShowTeachingNotes
        ? rest
          ? '계획한 휴식 구간'
          : '개인 검토 전 · 티칭 메모는 표시하지 않습니다.'
        : rest
          ? step.instructorNote || '호흡 정리 및 다음 기구 세팅 점검'
          : step.instructorNote?.trim() || ex?.cues[0] || '정렬과 호흡 리듬을 확인하세요.';
      const sideText =
        !rest && (ex?.isUnilateral || step.sideMode) ? getStepSideLabels(step, ex).join('→') : null;

      rows.push({
        step,
        orderLabel: String(idx + 1).padStart(2, '0'),
        rest,
        nameKo: rest
          ? '중간 휴식 · 세팅 전환'
          : (ex?.nameKo ?? step.exerciseSnapshot?.nameKo ?? '동작 확인'),
        sectionLabelKo,
        durationLabel: formatSecondsToMMSS(timing.totalSec),
        springs,
        brandConverted,
        hasSpringDelta,
        exercise: ex,
        primaryCue,
        breathText: !rest && canShowTeachingNotes ? ex?.breathPattern : undefined,
        repsSetsText:
          !rest && step.repetitions !== undefined
            ? `${step.repetitions}회${step.sets !== undefined ? `×${step.sets}세트` : ''}`
            : null,
        sideText,
      });
    }
    return { rows, springChangeTotal };
  }, [steps, exerciseMap, activeBrand, apparatus, reviewedTeachingExerciseIds]);

  const apparatusKo =
    apparatus === 'mixed' ? '복합 기구' : (APPARATUS_LABELS[apparatus]?.ko ?? apparatus);
  const movementCount = enrichedRows.rows.filter((r) => !r.rest).length;
  const activeBrandMeta =
    BRAND_SPRING_OPTIONS.find((item) => item.id === activeBrand) ?? BRAND_SPRING_OPTIONS[0]!;

  return (
    <section
      className={`pf-visual-1p-cuesheet ${
        layoutDensity === 'two-col-print' ? 'is-two-col' : 'is-single-col'
      }`}
      data-testid="one-page-visual-3d-cuesheet"
      data-layout-density={layoutDensity}
      data-reformer-brand={activeBrand}
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
            <PfBadge tone="neutral">장력 기준: {activeBrandMeta.shortLabelKo}</PfBadge>
          </div>
          <div
            className="pf-brand-spring-switcher cue-sheet-no-print"
            role="group"
            aria-label="기구 제조사별 스프링 장력 환산 기준"
            data-testid="cuesheet-brand-spring-switcher"
          >
            <span className="pf-brand-spring-switcher__label">기구 브랜드 환산:</span>
            {BRAND_SPRING_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                className={`log-quick-note-chip ${activeBrand === opt.id ? 'is-selected' : ''}`.trim()}
                aria-pressed={activeBrand === opt.id}
                onClick={() => selectBrand(opt.id)}
              >
                {opt.shortLabelKo}
              </button>
            ))}
          </div>
        </div>

        <div className="pf-visual-1p-cuesheet__right">
          <div className="pf-visual-1p-cuesheet__controls cue-sheet-no-print">
            <div
              role="group"
              aria-label="1페이지 큐시트 배열 밀도"
              className="pf-visual-1p-density"
            >
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
            {steps.length > 0 && (
              <button
                type="button"
                className={`log-quick-note-chip ${showCornerQr ? 'is-selected' : ''}`.trim()}
                data-testid="one-page-visual-cuesheet-qr-toggle"
                aria-pressed={showCornerQr}
                onClick={() => setShowCornerQr((v) => !v)}
              >
                <QrCode size={14} aria-hidden="true" /> 큐시트 QR 표시
              </button>
            )}
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
          {cornerQrResult && (
            <div
              className="pf-visual-1p-qr-corner"
              data-testid="one-page-visual-cuesheet-qr"
              aria-label="인쇄용 로컬 시퀀스 스캔 QR"
            >
              <div
                className="pf-visual-1p-qr-corner__svg"
                dangerouslySetInnerHTML={{ __html: cornerQrResult.svgMarkup }}
              />
              <span>태블릿 스캔</span>
            </div>
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
              {row.exercise ? (
                <ExerciseMotionArtwork exercise={row.exercise} className="pf-visual-1p-row__thumb" />
              ) : (
                <div className="pf-visual-1p-row__rest-box" aria-hidden="true">
                  {row.rest ? '휴식' : '동작 확인'}
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
                    {row.brandConverted && !row.brandConverted.isNonSpringApparatus && (
                      <span className="pf-brand-spring-pill" data-testid="visual-1p-brand-spring">
                        {row.brandConverted.brandShortLabelKo}:{' '}
                        {row.brandConverted.equivalentLabelKo}
                      </span>
                    )}
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
                    {row.sideText && <span className="pf-visual-1p-row__pill">{row.sideText}</span>}
                  </div>
                )}
                <p className="pf-visual-1p-row__cue">{row.primaryCue}</p>
              </div>
            </li>
          ))}
        </ol>
      )}

      <footer className="pf-visual-1p-cuesheet__footer">
        수업 준비 요약 시트 ({activeBrandMeta.fullLabelKo} 기준) · {HONEST_BRAND_SPRING_CAUTION_KO}
      </footer>
    </section>
  );
};
