import React, { useId, useMemo, useState } from 'react';
import type { Root } from 'react-dom/client';
import { MOTION_PATTERN_REFERENCES } from '../../data/motionPatternReferences';
import { MOVEMENT_VISUAL_ASSETS } from '../../data/movementVisualRigCatalog';
import { INITIAL_EXERCISES } from '../../data/pilatesCatalog';
import { PreviewHarnessStageView, PreviewHarnessTruthLedger } from './PreviewHarnessStageView';
import { MOTION_COVERAGE_HARNESS_REPRESENTATIVE_TARGETS } from './catalogSweep';
import {
  mountPreviewHarnessComponent,
  usePreviewHarnessController,
  type MotionCoveragePreviewHarnessProps,
} from './previewHarnessLifecycle';
import {
  ACTIVE_TOUCH_BUTTON_STYLE,
  MISSING_FIXTURE_EXERCISE_ID,
  TOUCH_BUTTON_STYLE,
  TOUCH_SELECT_STYLE,
  buildCatalogDescriptorEntries,
  computeCatalogModeCounts,
  filterCatalogDescriptorEntries,
  findActiveCatalogEntry,
  findFilteredCatalogIndex,
  getAdjacentFilteredExerciseId,
  resolvePreviewEvidenceOverlay,
  type PreviewHarnessModeFilter,
} from './previewHarnessSelectors';

export type { MotionCoveragePreviewHarnessProps };

/**
 * Isolated local inspection preview harness (`src/features/motionCoverage/MotionCoveragePreviewHarness.tsx`).
 * - Iterates over all 98 catalog descriptors + representative missing fixture.
 * - Uses `MotionCoveragePlaybackController` (via `usePreviewHarnessController`) to drive continuous drafts
 *   (`projected-3d`, `continuous-2d`) and discrete 3-step selection (`three-phase-2d`, 77 exercises)
 *   without fake interpolation.
 * - Enforces >= 44px touch targets, non-interfering keyboard shortcuts, and responsive 320px/390px zero-overflow layout.
 * - Cleans up all RAF handles and listeners on pause, exercise switch, background tab, and unmount.
 */
export const MotionCoveragePreviewHarness: React.FC<MotionCoveragePreviewHarnessProps> = (
  props,
) => {
  const uid = useId();
  const [modeFilter, setModeFilter] = useState<PreviewHarnessModeFilter>('all');

  const {
    hostRef,
    controller,
    snapshot,
    includeLabPrototypes,
    mergedResolveOptions,
    handleSelectExercise,
    handleToggleLabPrototypes,
    handleStageKeyDown,
  } = usePreviewHarnessController(props);

  const catalogDescriptors = useMemo(
    () => buildCatalogDescriptorEntries(mergedResolveOptions),
    [mergedResolveOptions],
  );

  const filteredCatalogDescriptors = useMemo(
    () => filterCatalogDescriptorEntries(catalogDescriptors, modeFilter),
    [catalogDescriptors, modeFilter],
  );

  const modeCounts = useMemo(
    () => computeCatalogModeCounts(catalogDescriptors),
    [catalogDescriptors],
  );

  const activeCatalogEntry = useMemo(
    () => findActiveCatalogEntry(catalogDescriptors, snapshot.exerciseId),
    [catalogDescriptors, snapshot.exerciseId],
  );

  const currentFilteredIndex = useMemo(
    () => findFilteredCatalogIndex(filteredCatalogDescriptors, snapshot.exerciseId),
    [filteredCatalogDescriptors, snapshot.exerciseId],
  );

  const handlePrevExercise = () => {
    const prevId = getAdjacentFilteredExerciseId(
      filteredCatalogDescriptors,
      currentFilteredIndex,
      'prev',
    );
    if (prevId) handleSelectExercise(prevId);
  };

  const handleNextExercise = () => {
    const nextId = getAdjacentFilteredExerciseId(
      filteredCatalogDescriptors,
      currentFilteredIndex,
      'next',
    );
    if (nextId) handleSelectExercise(nextId);
  };

  const evidenceOverlay = useMemo(
    () =>
      resolvePreviewEvidenceOverlay(activeCatalogEntry, snapshot.exerciseId, mergedResolveOptions),
    [activeCatalogEntry, snapshot.exerciseId, mergedResolveOptions],
  );

  const activeCatalogIncludedInFilter = activeCatalogEntry !== null && currentFilteredIndex >= 0;

  return (
    <section
      ref={hostRef}
      aria-labelledby={`${uid}-harness-title`}
      data-testid="motion-coverage-preview-harness"
      data-exercise-id={snapshot.exerciseId}
      data-motion-mode={snapshot.mode}
      data-control-kind={snapshot.controlKind}
      data-playing={String(snapshot.playing)}
      data-continuous-interpolated={String(snapshot.isContinuousInterpolated)}
      data-auto-interpolated-from-discrete="false"
      data-canonical-ready="false"
      data-manual-ready="false"
      data-true-3d="false"
      data-webgl-3d-ready="false"
      data-anatomical-verified="false"
      data-expert-verified="false"
      data-reduced-motion={String(snapshot.reducedMotion)}
      data-background-hidden={String(snapshot.isBackgroundHidden)}
      data-catalog-total={String(INITIAL_EXERCISES.length)}
      data-reused-2d-asset-count={String(MOVEMENT_VISUAL_ASSETS.length)}
      data-pattern-reference-count={String(MOTION_PATTERN_REFERENCES.length)}
      style={{
        width: '100%',
        maxWidth: '100%',
        boxSizing: 'border-box',
        overflowX: 'hidden',
        padding: '12px',
        borderRadius: '12px',
        border: '1px solid rgba(40, 54, 48, 0.2)',
        background: '#fcfdfc',
        color: '#1b2621',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      <header
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          marginBottom: '12px',
          maxWidth: '100%',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '8px',
          }}
        >
          <h2
            id={`${uid}-harness-title`}
            style={{ margin: 0, fontSize: '1.05rem', lineHeight: 1.3 }}
          >
            모션 도해 지원 수준 로컬 검수 프리뷰 (98종 카탈로그 순회)
          </h2>
          <span
            data-testid="harness-truth-pill"
            style={{
              fontSize: '0.78rem',
              padding: '4px 8px',
              borderRadius: '999px',
              background: '#eef3ef',
              color: '#254235',
              maxWidth: '100%',
            }}
          >
            기존 98 포즈 재사용 · 미검토 연속 초안 21종(22패턴) · 정식 3D/승인 0건
          </span>
        </div>

        <p
          data-testid="harness-mode-distinction-banner"
          style={{
            margin: 0,
            padding: '8px 10px',
            borderRadius: '8px',
            background: '#f2f6f3',
            fontSize: '0.82rem',
            lineHeight: 1.45,
          }}
        >
          {snapshot.modeDistinctionLabelKo}
        </p>

        <p
          data-testid="harness-safety-privacy-notice"
          style={{
            margin: 0,
            fontSize: '0.78rem',
            lineHeight: 1.4,
            color: '#46584f',
          }}
        >
          안내: 본 검수 화면은 동작 도해 구조 확인용이며 실제 운동 효과나 안전성을 보장하지
          않습니다. 개인 건강정보·사진·웹캠 데이터를 수집하거나 외부로 전송하지 않습니다.
        </p>
      </header>

      {/* Representative Quick Targets (4 canonical states) */}
      <div
        role="group"
        aria-label="대표 지원 상태 빠른 전환"
        data-testid="harness-representative-targets"
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '6px',
          marginBottom: '12px',
          maxWidth: '100%',
        }}
      >
        {MOTION_COVERAGE_HARNESS_REPRESENTATIVE_TARGETS.map((target) => {
          const isCurrent = snapshot.exerciseId === target.id;
          return (
            <button
              key={target.id}
              type="button"
              data-testid={`harness-rep-${target.expectedMode}`}
              aria-pressed={isCurrent}
              style={isCurrent ? ACTIVE_TOUCH_BUTTON_STYLE : TOUCH_BUTTON_STYLE}
              onClick={() => handleSelectExercise(target.id)}
            >
              {target.labelKo}
            </button>
          );
        })}
      </div>

      {/* Mode Filter & 98-Exercise Catalog Traversal Controls */}
      <div
        role="region"
        aria-label="98개 카탈로그 동작 순회 제어"
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          padding: '10px',
          borderRadius: '10px',
          background: '#f4f7f5',
          marginBottom: '12px',
          maxWidth: '100%',
          boxSizing: 'border-box',
        }}
      >
        <div
          role="group"
          aria-label="지원 수준별 필터"
          style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}
        >
          <button
            type="button"
            data-testid="harness-filter-all"
            aria-pressed={modeFilter === 'all'}
            style={modeFilter === 'all' ? ACTIVE_TOUCH_BUTTON_STYLE : TOUCH_BUTTON_STYLE}
            onClick={() => setModeFilter('all')}
          >
            전체 카탈로그 ({INITIAL_EXERCISES.length}종)
          </button>
          <button
            type="button"
            data-testid="harness-filter-three-phase-2d"
            aria-pressed={modeFilter === 'three-phase-2d'}
            style={modeFilter === 'three-phase-2d' ? ACTIVE_TOUCH_BUTTON_STYLE : TOUCH_BUTTON_STYLE}
            onClick={() => setModeFilter('three-phase-2d')}
          >
            이산 2D 3단계 ({modeCounts['three-phase-2d']}종)
          </button>
          <button
            type="button"
            data-testid="harness-filter-continuous-2d"
            aria-pressed={modeFilter === 'continuous-2d'}
            style={modeFilter === 'continuous-2d' ? ACTIVE_TOUCH_BUTTON_STYLE : TOUCH_BUTTON_STYLE}
            onClick={() => setModeFilter('continuous-2d')}
          >
            2D 연속 초안 ({modeCounts['continuous-2d']}종)
          </button>
          <button
            type="button"
            data-testid="harness-filter-projected-3d"
            aria-pressed={modeFilter === 'projected-3d'}
            style={modeFilter === 'projected-3d' ? ACTIVE_TOUCH_BUTTON_STYLE : TOUCH_BUTTON_STYLE}
            onClick={() => setModeFilter('projected-3d')}
          >
            3D→2D 사선 투영 초안 ({modeCounts['projected-3d']}종)
          </button>
        </div>

        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: '8px',
            maxWidth: '100%',
          }}
        >
          <button
            type="button"
            data-testid="harness-prev-exercise"
            aria-label="이전 카탈로그 동작"
            style={TOUCH_BUTTON_STYLE}
            onClick={handlePrevExercise}
          >
            ◀ 이전 동작
          </button>
          <button
            type="button"
            data-testid="harness-next-exercise"
            aria-label="다음 카탈로그 동작"
            style={TOUCH_BUTTON_STYLE}
            onClick={handleNextExercise}
          >
            다음 동작 ▶
          </button>
          <span
            data-testid="harness-catalog-position"
            style={{ fontSize: '0.84rem', fontWeight: 600 }}
          >
            {activeCatalogEntry
              ? `카탈로그 ${activeCatalogEntry.index + 1} / ${INITIAL_EXERCISES.length} · ${activeCatalogEntry.exercise.nameKo}`
              : `비카탈로그 검수 대상 · ${snapshot.exerciseId}`}
          </span>
        </div>

        <label
          htmlFor={`${uid}-exercise-select`}
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
            fontSize: '0.84rem',
            maxWidth: '100%',
          }}
        >
          <span>동작 직접 선택 (98개 카탈로그 + 미지원 검수 fixture)</span>
          <select
            id={`${uid}-exercise-select`}
            aria-label="검수할 동작 선택"
            data-testid="harness-exercise-select"
            value={snapshot.exerciseId}
            style={TOUCH_SELECT_STYLE}
            onChange={(event) => handleSelectExercise(event.target.value)}
          >
            {activeCatalogEntry && !activeCatalogIncludedInFilter && (
              <option value={activeCatalogEntry.exercise.id}>
                [{activeCatalogEntry.index + 1}/98] {activeCatalogEntry.exercise.id} ·{' '}
                {activeCatalogEntry.exercise.nameKo} ({activeCatalogEntry.descriptor.mode})
              </option>
            )}
            {filteredCatalogDescriptors.map(({ index, exercise, descriptor }) => (
              <option key={exercise.id} value={exercise.id}>
                [{index + 1}/98] {exercise.id} · {exercise.nameKo} ({descriptor.mode})
              </option>
            ))}
            <option value={MISSING_FIXTURE_EXERCISE_ID}>
              [미지원 검수] {MISSING_FIXTURE_EXERCISE_ID} (missing)
            </option>
          </select>
        </label>

        <label
          style={{
            minHeight: '44px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '0.82rem',
            cursor: 'pointer',
          }}
        >
          <input
            type="checkbox"
            data-testid="harness-toggle-lab-prototypes"
            checked={includeLabPrototypes}
            onChange={(event) => handleToggleLabPrototypes(event.target.checked)}
            style={{ width: '20px', height: '20px' }}
          />
          <span>
            연구실 전용 2D 연속 프로토타입 2종(bridge-pattern, heel-slide) opt-in 포함 검수
          </span>
        </label>
      </div>

      {/* Live Playback / Step Status Banner */}
      <div
        role="status"
        aria-live="polite"
        data-testid="harness-playback-status"
        style={{
          padding: '10px 12px',
          borderRadius: '8px',
          background: '#e9f0ec',
          marginBottom: '12px',
          fontSize: '0.86rem',
          fontWeight: 600,
          lineHeight: 1.4,
        }}
      >
        {snapshot.statusLabelKo}
      </div>

      {/* Mode-Specific Interactive Controls & Stage */}
      <PreviewHarnessStageView
        uid={uid}
        snapshot={snapshot}
        controller={controller}
        onStageKeyDown={handleStageKeyDown}
      />

      {/* Truthfulness & Verification Ledger DL */}
      <PreviewHarnessTruthLedger evidenceOverlay={evidenceOverlay} />
    </section>
  );
};

export function mountMotionCoveragePreviewHarness(
  container: HTMLElement,
  props: MotionCoveragePreviewHarnessProps = {},
): Root {
  return mountPreviewHarnessComponent(container, MotionCoveragePreviewHarness, props);
}
