import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SequenceFlowTelemetryStrip } from '../components/SequenceFlowTelemetryStrip';
import type { PilatesExercise, SequenceStep } from '../types/pilates';
import {
  analyzeSequenceFlow,
  buildOptimizedTransitionSteps,
} from '../utils/sequenceFlowAnalytics';

function createFixtureExercise(
  overrides: Partial<PilatesExercise> & Pick<PilatesExercise, 'id' | 'nameKo'>,
): PilatesExercise {
  return {
    id: overrides.id,
    nameKo: overrides.nameKo,
    nameEn: overrides.nameEn ?? overrides.nameKo,
    apparatus: overrides.apparatus ?? 'reformer',
    props: overrides.props ?? ['none'],
    blockCategory: overrides.blockCategory ?? 'core',
    spinalPlanes: overrides.spinalPlanes ?? ['neutral'],
    bodyPosition: overrides.bodyPosition ?? 'supine',
    level: overrides.level ?? '1.5',
    defaultDurationMin: overrides.defaultDurationMin ?? 5,
    isUnilateral: overrides.isUnilateral ?? false,
    springs: overrides.springs ?? '2R',
    box: overrides.box ?? 'none',
    footbar: overrides.footbar ?? 'high',
    headrest: overrides.headrest ?? 'flat',
    targetMuscles: overrides.targetMuscles ?? ['복횡근'],
    breathPattern: overrides.breathPattern ?? '들쉬고 내쉬기',
    cues: overrides.cues ?? ['코어 정렬 유지'],
    precautions: overrides.precautions ?? '과긴장 주의',
    layers: overrides.layers ?? {
      easy: '기본',
      standard: '표준',
      hard: '심화',
    },
    youtube: overrides.youtube ?? {
      videoId: '',
      channelName: '테스트',
      videoTitle: '',
      startSec: 0,
      url: '',
    },
    favoriteTag: overrides.favoriteTag ?? 'none',
  };
}

const TEST_CATALOG: Record<string, PilatesExercise> = {
  'ex-warmup': createFixtureExercise({
    id: 'ex-warmup',
    nameKo: '펠빅 클락 호흡',
    blockCategory: 'warmup',
    spinalPlanes: ['neutral', 'flexion'],
    bodyPosition: 'supine',
    springs: '2R 1B',
    box: 'none',
    footbar: 'high',
    headrest: 'flat',
  }),
  'ex-shortbox-1': createFixtureExercise({
    id: 'ex-shortbox-1',
    nameKo: '숏박스 라운드백',
    blockCategory: 'core',
    spinalPlanes: ['flexion'],
    bodyPosition: 'seated',
    springs: '2R',
    box: 'short-box',
    footbar: 'down',
    headrest: 'flat',
  }),
  'ex-supine-hundred': createFixtureExercise({
    id: 'ex-supine-hundred',
    nameKo: '리포머 헌드레드',
    blockCategory: 'core',
    spinalPlanes: ['flexion'],
    bodyPosition: 'supine',
    springs: '2R 1B',
    box: 'none',
    footbar: 'low',
    headrest: 'up',
  }),
  'ex-shortbox-2': createFixtureExercise({
    id: 'ex-shortbox-2',
    nameKo: '숏박스 오블리크 트위스트',
    blockCategory: 'core',
    spinalPlanes: ['flexion', 'rotation'],
    bodyPosition: 'seated',
    springs: '2R',
    box: 'short-box',
    footbar: 'down',
    headrest: 'flat',
  }),
  'ex-scooter-unilateral': createFixtureExercise({
    id: 'ex-scooter-unilateral',
    nameKo: '스탠딩 스쿠터',
    blockCategory: 'lower-body',
    spinalPlanes: ['neutral'],
    bodyPosition: 'standing',
    isUnilateral: true,
    springs: '1R',
    box: 'none',
    footbar: 'high',
    headrest: 'flat',
  }),
  'ex-swan-ext': createFixtureExercise({
    id: 'ex-swan-ext',
    nameKo: '롱박스 풀링 스트랩 스완',
    blockCategory: 'extension',
    spinalPlanes: ['extension'],
    bodyPosition: 'prone',
    springs: '1R',
    box: 'long-box',
    footbar: 'down',
    headrest: 'flat',
  }),
  'ex-mermaid-cool': createFixtureExercise({
    id: 'ex-mermaid-cool',
    nameKo: '머메이드 스트레칭',
    blockCategory: 'cooldown',
    spinalPlanes: ['lateral', 'rotation'],
    bodyPosition: 'seated',
    springs: '1B',
    box: 'none',
    footbar: 'high',
    headrest: 'flat',
  }),
};

describe('sequenceFlowAnalytics', () => {
  it('detects hardware swaps, non-contiguous box/spring ping-ponging, and consecutive flexion warnings', () => {
    const steps: SequenceStep[] = [
      {
        stepId: 's1',
        order: 1,
        blockCategory: 'warmup',
        exerciseId: 'ex-warmup',
        durationMin: 4,
        selectedLayer: 'standard',
      },
      {
        stepId: 's2',
        order: 2,
        blockCategory: 'core',
        exerciseId: 'ex-shortbox-1',
        durationMin: 5,
        selectedLayer: 'standard',
        transitionSec: 5,
      },
      {
        stepId: 's3',
        order: 3,
        blockCategory: 'core',
        exerciseId: 'ex-supine-hundred',
        durationMin: 5,
        selectedLayer: 'standard',
        transitionSec: 5,
      },
      {
        stepId: 's4',
        order: 4,
        blockCategory: 'core',
        exerciseId: 'ex-shortbox-2',
        durationMin: 5,
        selectedLayer: 'hard',
        transitionSec: 5,
      },
    ];

    const result = analyzeSequenceFlow(steps, TEST_CATALOG);

    expect(result.exerciseStepCount).toBe(4);
    expect(result.boxSwapCount).toBe(3); // none -> short-box -> none -> short-box
    expect(result.springSwapCount).toBe(3); // 2R 1B -> 2R -> 2R 1B -> 2R
    expect(result.footbarSwapCount).toBe(3); // high -> down -> low -> down
    expect(result.bodyPositionSwitchCount).toBe(3); // supine -> seated -> supine -> seated
    expect(result.transitionFrictionScore).toBeGreaterThan(50);
    expect(result.flowReadinessScore).toBeLessThan(65);

    // Non-contiguous short-box tip + spring ping-pong tip
    expect(
      result.setupOptimizationTipsKo.some((tip) => tip.includes('숏박스 세팅이 비연속적으로 반복')),
    ).toBe(true);
    expect(
      result.setupOptimizationTipsKo.some((tip) => tip.includes('왕복 교체가 감지')),
    ).toBe(true);

    // 4 consecutive flexion steps with 0 extension steps
    expect(
      result.biomechanicalWarningsKo.some((warn) =>
        warn.includes('척추 굴곡(Flexion) 동작이 4회 연속'),
      ),
    ).toBe(true);
    expect(
      result.biomechanicalWarningsKo.some((warn) => warn.includes('쿨다운')),
    ).toBe(true);
  });

  it('flags unilateral steps with single-side bias or < 20s per side net practice time', () => {
    const steps: SequenceStep[] = [
      {
        stepId: 'u1',
        order: 1,
        blockCategory: 'lower-body',
        exerciseId: 'ex-scooter-unilateral',
        durationMin: 4,
        selectedLayer: 'standard',
        sideMode: 'left',
      },
      {
        stepId: 'u2',
        order: 2,
        blockCategory: 'lower-body',
        exerciseId: 'ex-scooter-unilateral',
        durationMin: 1, // 60s total
        explanationSec: 15,
        transitionSec: 15, // 30s net -> 15s per side (< 20s)
        selectedLayer: 'standard',
        sideMode: 'left-then-right',
      },
      {
        stepId: 'rest-1',
        order: 3,
        kind: 'rest',
        blockCategory: 'cooldown',
        exerciseId: '',
        durationMin: 1,
        selectedLayer: 'standard',
      },
    ];

    const result = analyzeSequenceFlow(steps, new Map(Object.entries(TEST_CATALOG)));

    expect(result.exerciseStepCount).toBe(2);
    expect(result.restStepCount).toBe(1);
    expect(result.totalDurationMin).toBe(6);
    expect(result.unilateralStepCount).toBe(2);
    expect(result.unilateralAlerts).toHaveLength(2);
    expect(result.unilateralAlerts[0]?.sides).toBe(1);
    expect(result.unilateralAlerts[0]?.reasonKo).toContain('좌측');
    expect(result.unilateralAlerts[1]?.netPerSideSec).toBe(15);
    expect(result.unilateralAlerts[1]?.reasonKo).toContain('15초(< 20초)');
  });

  it('builds optimized transition steps immutably with >=15s for spring/position and >=25s for box/apparatus swaps', () => {
    const originalSteps: SequenceStep[] = [
      {
        stepId: 's1',
        order: 1,
        blockCategory: 'warmup',
        exerciseId: 'ex-warmup',
        durationMin: 4,
        selectedLayer: 'standard',
      },
      {
        stepId: 's2',
        order: 2,
        blockCategory: 'lower-body',
        exerciseId: 'ex-scooter-unilateral', // spring + position change, box stays 'none'
        durationMin: 6,
        selectedLayer: 'standard',
        transitionSec: 5,
      },
      {
        stepId: 's3',
        order: 3,
        blockCategory: 'extension',
        exerciseId: 'ex-swan-ext', // box changes none -> long-box
        durationMin: 5,
        selectedLayer: 'standard',
        transitionSec: 10,
      },
    ];

    const snapshotBefore = JSON.stringify(originalSteps);
    const optimized = buildOptimizedTransitionSteps(originalSteps, TEST_CATALOG);

    // Immutability verified
    expect(JSON.stringify(originalSteps)).toBe(snapshotBefore);
    expect(optimized).not.toBe(originalSteps);

    expect(optimized[0]?.transitionSec).toBeUndefined();
    expect(optimized[1]?.transitionSec).toBe(15); // upgraded from 5 -> 15
    expect(optimized[2]?.transitionSec).toBe(25); // upgraded from 10 -> 25
  });

  it('renders SequenceFlowTelemetryStrip, toggles inspector with keyboard/click, and invokes callbacks', () => {
    const steps: SequenceStep[] = [
      {
        stepId: 'step-1',
        order: 1,
        blockCategory: 'warmup',
        exerciseId: 'ex-warmup',
        durationMin: 4,
        selectedLayer: 'standard',
      },
      {
        stepId: 'step-2',
        order: 2,
        blockCategory: 'core',
        exerciseId: 'ex-shortbox-1',
        durationMin: 6,
        selectedLayer: 'standard',
        transitionSec: 5,
      },
      {
        stepId: 'step-3',
        order: 3,
        blockCategory: 'extension',
        exerciseId: 'ex-swan-ext',
        durationMin: 5,
        selectedLayer: 'standard',
        transitionSec: 10,
      },
      {
        stepId: 'step-4',
        order: 4,
        blockCategory: 'cooldown',
        exerciseId: 'ex-mermaid-cool',
        durationMin: 4,
        selectedLayer: 'standard',
        transitionSec: 10,
      },
    ];

    const onApplyTransitionBuffers = vi.fn();
    const onSelectStep = vi.fn();

    render(
      <SequenceFlowTelemetryStrip
        steps={steps}
        exercisesById={TEST_CATALOG}
        onApplyTransitionBuffers={onApplyTransitionBuffers}
        onSelectStep={onSelectStep}
      />,
    );

    const strip = screen.getByTestId('sequence-flow-telemetry-strip');
    expect(strip).toBeInTheDocument();

    // Decorative sparkline has aria-hidden="true"
    const sparkline = screen.getByTestId('sequence-wave-sparkline');
    expect(sparkline).toHaveAttribute('aria-hidden', 'true');

    // Swap counters
    expect(screen.getByTestId('swap-counter-springs')).toHaveTextContent('스프링 교체 3회');
    expect(screen.getByTestId('swap-counter-box')).toHaveTextContent('박스 전환 3회');

    // Spinal plane pills
    expect(screen.getByTestId('plane-pill-flexion')).toBeInTheDocument();
    expect(screen.getByTestId('plane-pill-extension')).toBeInTheDocument();
    expect(screen.getByTestId('plane-pill-lateral')).toBeInTheDocument();

    // Expand inspector
    const toggleBtn = screen.getByTestId('toggle-telemetry-inspector-btn');
    expect(toggleBtn).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(toggleBtn);
    expect(toggleBtn).toHaveAttribute('aria-expanded', 'true');

    const inspector = screen.getByTestId('sequence-flow-telemetry-inspector');
    expect(inspector).toBeInTheDocument();

    // Step diff badges & step selection callback
    const step2Diff = screen.getByTestId('step-setup-diff-step-2');
    expect(step2Diff).toHaveTextContent('박스 박스 없음 → 숏박스');
    const step2Btn = within(step2Diff).getByRole('button', { name: '숏박스 라운드백' });
    fireEvent.click(step2Btn);
    expect(onSelectStep).toHaveBeenCalledWith('step-2');

    // Apply transition buffers button
    const applyBtn = screen.getByTestId('apply-transition-buffers-btn');
    expect(applyBtn).not.toBeDisabled();
    fireEvent.click(applyBtn);
    expect(onApplyTransitionBuffers).toHaveBeenCalledTimes(1);
    const updatedSteps = onApplyTransitionBuffers.mock.calls[0]?.[0] as SequenceStep[];
    expect(updatedSteps[1]?.transitionSec).toBe(25);
    expect(updatedSteps[2]?.transitionSec).toBe(25);
    expect(updatedSteps[3]?.transitionSec).toBe(25);
  });
});
