import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { syntheticPlanningExercise } from '../test/planningFixtures';
import type { SequenceStep } from '../types/pilates';
import { buildSequenceSimulation, seekSequenceSimulation } from '../utils/sequenceSimulation';
import { createSequenceMotionStudyBinding } from '../utils/sequenceMotionBinding';
import { exerciseRevision } from '../utils/exerciseReview';
import { SUPINE_REACH_DEFINITION } from '../data/supineReach';
import { getMotionStudyEntry } from '../utils/motionStudyStages';
import { CONNECTED_STUDY_DISPLAY_CYCLE_SEC } from '../utils/connectedMotionStudy';
import { ConnectedMotionStudy } from './ConnectedMotionStudy';

const exercise = {
  ...syntheticPlanningExercise('mat', 'lower-body', 'alpha', false),
  id: 'original-mat-clam',
  nameKo: '합성 QA 연결 클램',
};
const binding = createSequenceMotionStudyBinding(
  exercise.id,
  'existing-proposal',
  'side-lying-clam',
)!;
const step: SequenceStep = {
  stepId: 'connected-qa-clam',
  order: 1,
  blockCategory: 'warmup',
  exerciseId: exercise.id,
  durationMin: 1,
  selectedLayer: 'standard',
  explanationSec: 8,
  transitionSec: 8,
  sideMode: 'left-then-right',
  repetitions: 12,
  sets: 3,
  motionStudy: binding,
};
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function props(timeSec = 0, current: SequenceStep = step, steps = [current]) {
  const model = buildSequenceSimulation(steps, [exercise]);
  return {
    model,
    position: seekSequenceSimulation(model, timeSec),
    steps,
    exercises: [exercise],
    selectedIndex: current === steps[0] ? 0 : steps.indexOf(current),
    playing: false,
    reducedMotion: false,
  };
}

describe('controlled connected study', () => {
  it('projects the saved supine-reach binding and its authored phases from parent seeks without approving the pending plan or adding a clock', () => {
    const reachExercise = {
      ...syntheticPlanningExercise('mat', 'lower-body', 'alpha', false),
      id: 'original-mat-single-leg-stretch',
      nameKo: '합성 QA 한 다리 리치',
    };
    const reachBinding = createSequenceMotionStudyBinding(
      reachExercise.id,
      'supine-reach',
      SUPINE_REACH_DEFINITION.id,
    );
    expect(reachBinding).toMatchObject({
      family: 'supine-reach',
      variantId: 'supine-single-leg-reach-v1',
    });
    const reachStep: SequenceStep = {
      ...step,
      stepId: 'connected-qa-supine-reach',
      blockCategory: 'core',
      exerciseId: reachExercise.id,
      motionStudy: reachBinding,
    };
    const model = buildSequenceSimulation([reachStep], [reachExercise]);
    const entry = getMotionStudyEntry('supine-reach', SUPINE_REACH_DEFINITION.id)!;
    const main = entry.stages.find((stage) => stage.id === 'main')!;
    const parentProps = (timeSec: number) => ({
      model,
      position: seekSequenceSimulation(model, timeSec),
      steps: [reachStep],
      exercises: [reachExercise],
      selectedIndex: 0,
      playing: false,
      reducedMotion: false,
    });
    const interval = vi.spyOn(globalThis, 'setInterval');
    const timeout = vi.spyOn(globalThis, 'setTimeout');
    const raf = vi.spyOn(window, 'requestAnimationFrame');
    const { rerender } = render(<ConnectedMotionStudy {...parentProps(0)} />);
    const view = () => screen.getByRole('region', { name: '수업 시간에 연결한 동작 흐름' });
    expect(view()).toHaveAttribute('data-binding-status', 'matched');
    expect(view()).toHaveAttribute('data-motion-stage', 'setup');
    expect(view()).toHaveAttribute('data-motion-phase', 'setup');
    expect(view()).toHaveTextContent(SUPINE_REACH_DEFINITION.title);
    expect(view()).toHaveTextContent('전문가 미검토 · 0명');
    expect(view().querySelector('.connected-study-legend')).toHaveTextContent(
      '두 겹 윤곽: 각 그림의 움직이는 다리',
    );
    const figure = () => view().querySelector('svg[data-motion-family="supine-reach"]');
    expect(figure()).toHaveAttribute('data-variant-id', SUPINE_REACH_DEFINITION.id);
    expect(figure()).toHaveAttribute('data-phase', 'setup');
    expect(figure()).not.toHaveAttribute('data-motion-draft-id');
    expect(figure()).not.toHaveAttribute('data-motion-variant-id');
    for (const phase of entry.phases.filter((phase) =>
      ['move', 'turn', 'return'].includes(phase.id),
    )) {
      const elapsed =
        ((phase.sample - main.start) / (main.end - main.start)) *
        CONNECTED_STUDY_DISPLAY_CYCLE_SEC;
      rerender(<ConnectedMotionStudy {...parentProps(8 + elapsed)} playing />);
      expect(view()).toHaveAttribute('data-motion-stage', 'main');
      expect(view()).toHaveAttribute('data-motion-phase', phase.id);
      expect(view()).toHaveAttribute('data-study-side', 'left');
      expect(Number(view().getAttribute('data-study-progress'))).toBeCloseTo(phase.sample, 8);
      expect(figure()).toHaveAttribute('data-phase', phase.id);
      expect(figure()).toHaveAttribute('data-active-side', 'left');
    }
    rerender(<ConnectedMotionStudy {...parentProps(32)} mirrored />);
    expect(view()).toHaveAttribute('data-study-side', 'right');
    expect(view()).toHaveAttribute('data-view-mirrored', 'true');
    expect(view().querySelector('figure')).toHaveAttribute('data-study-anatomical-side', 'right');
    expect(figure()).toHaveAttribute('data-active-side', 'right');
    expect(figure()).toHaveAttribute('data-retained-side', 'left');
    expect(figure()).toHaveAttribute('data-view-mirrored', 'true');
    expect(view().querySelector('.connected-study-legend')).toHaveTextContent(
      '두 겹 윤곽: 각 그림의 움직이는 다리',
    );
    const pairedStep: SequenceStep = { ...reachStep, sideMode: 'together' };
    const pairedModel = buildSequenceSimulation([pairedStep], [reachExercise]);
    rerender(
      <ConnectedMotionStudy
        {...parentProps(10)}
        model={pairedModel}
        position={seekSequenceSimulation(pairedModel, 10)}
        steps={[pairedStep]}
        mirrored
      />,
    );
    expect(view()).toHaveAttribute('data-study-static', 'true');
    const pairedFigures = view().querySelectorAll('svg[data-motion-family="supine-reach"]');
    expect(pairedFigures).toHaveLength(2);
    expect(Array.from(pairedFigures, (item) => item.getAttribute('data-active-side'))).toEqual([
      'left',
      'right',
    ]);
    pairedFigures.forEach((item) => expect(item).toHaveAttribute('data-view-mirrored', 'true'));
    expect(view().querySelector('.connected-study-legend')).toHaveTextContent(
      '두 겹 윤곽: 각 그림의 움직이는 다리',
    );
    rerender(<ConnectedMotionStudy {...parentProps(54)} />);
    expect(view()).toHaveAttribute('data-study-kind', 'transition');
    expect(within(view()).queryByRole('img')).not.toBeInTheDocument();
    rerender(<ConnectedMotionStudy {...parentProps(60)} />);
    expect(view()).toHaveAttribute('data-motion-stage', 'finish');
    expect(view()).toHaveAttribute('data-motion-phase', 'finish');
    expect(view()).toHaveAttribute('data-study-static', 'true');
    expect(model.gate.canRehearse).toBe(false);
    expect(reachExercise.review).toBeUndefined();
    expect(interval).not.toHaveBeenCalled();
    expect(timeout).not.toHaveBeenCalled();
    expect(raf).not.toHaveBeenCalled();
  });

  it('renders a saved related draft from parent seek only and never owns a playback clock', () => {
    const interval = vi.spyOn(globalThis, 'setInterval');
    const timeout = vi.spyOn(globalThis, 'setTimeout');
    const raf = vi.spyOn(window, 'requestAnimationFrame');
    const { rerender } = render(<ConnectedMotionStudy {...props(0)} />);
    const view = () => screen.getByRole('region', { name: '수업 시간에 연결한 동작 흐름' });
    expect(view()).toHaveAttribute('data-binding-status', 'matched');
    expect(view()).toHaveAttribute('data-motion-stage', 'setup');
    expect(view()).toHaveAttribute('data-study-static', 'true');
    expect(view()).toHaveTextContent('관련 패턴');
    expect(view()).toHaveTextContent('정확한 동작 자산 아님');
    expect(view()).toHaveTextContent('전문가 미검토 · 0명');
    expect(view().querySelector('.connected-study-legend')).not.toHaveTextContent('두 겹 윤곽');
    expect(view()).toHaveTextContent('8초 순환은 도해 표시용');
    expect(view()).toHaveTextContent('수업 역할 · 준비운동');
    expect(view()).toHaveAttribute('data-study-side', 'left');
    rerender(<ConnectedMotionStudy {...props(10)} />);
    const progress = Number(view().getAttribute('data-study-progress'));
    expect(progress).toBeGreaterThan(0.12);
    expect(view()).toHaveAttribute('data-motion-stage', 'main');
    rerender(<ConnectedMotionStudy {...props(32)} mirrored />);
    expect(view()).toHaveAttribute('data-study-side', 'right');
    expect(view()).toHaveAttribute('data-view-mirrored', 'true');
    expect(view().querySelector('figure')).toHaveAttribute('data-study-anatomical-side', 'right');
    expect(view()).toHaveTextContent('화면만 반전 · 해부학적 좌우 유지');
    expect(interval).not.toHaveBeenCalled();
    expect(timeout).not.toHaveBeenCalled();
    expect(raf).not.toHaveBeenCalled();
  });

  it.each([
    ['unbound', undefined],
    ['stale', { ...binding, sourceFingerprint: '0'.repeat(64) }],
    ['unsupported', { ...binding, version: 99 }],
    [
      'unrelated',
      createSequenceMotionStudyBinding(
        'original-mat-ankle-reach',
        'existing-proposal',
        'supported-heel-raise',
      ),
    ],
  ] as const)(
    'shows meaningful unavailable state for %s without a first-related fallback',
    (status, motionStudy) => {
      render(<ConnectedMotionStudy {...props(10, { ...step, motionStudy })} />);
      const view = screen.getByRole('region', { name: '수업 시간에 연결한 동작 흐름' });
      expect(view).toHaveAttribute('data-binding-status', status);
      expect(view).toHaveAttribute('data-study-kind', 'unavailable');
      expect(within(view).queryByRole('img')).not.toBeInTheDocument();
      expect(view).toHaveTextContent('연결한 동작 도해를 표시할 수 없어요');
      expect(view).toHaveTextContent('시간표 위치는 수동으로');
    },
  );

  it('uses rest and transition cards without morphing between rigs or fabricating rest motion', () => {
    const rest: SequenceStep = {
      ...step,
      order: 2,
      stepId: 'qa-rest',
      kind: 'rest',
      exerciseId: '',
      motionStudy: undefined,
      durationMin: 0.5,
      repetitions: undefined,
      sets: undefined,
      sideMode: undefined,
      explanationSec: 0,
      transitionSec: 0,
    };
    const steps = [step, rest];
    const { rerender } = render(<ConnectedMotionStudy {...props(54, step, steps)} />);
    const view = () => screen.getByRole('region', { name: '수업 시간에 연결한 동작 흐름' });
    expect(view()).toHaveAttribute('data-study-kind', 'transition');
    expect(view()).toHaveTextContent('현재 · 합성 QA 연결 클램');
    expect(view()).toHaveTextContent('다음 · 휴식');
    expect(view()).toHaveTextContent('이동 경로나 기구 전환은 제작·검수되지 않았습니다');
    expect(within(view()).queryByRole('img')).not.toBeInTheDocument();
    rerender(<ConnectedMotionStudy {...props(61, rest, steps)} />);
    expect(view()).toHaveAttribute('data-study-kind', 'rest');
    expect(view()).toHaveTextContent('계획한 휴식');
    expect(within(view()).queryByRole('img')).not.toBeInTheDocument();
  });

  it.each([false, true])(
    'keeps pending transition setup private and checks next review independently (current reviewed: %s)',
    (reviewed) => {
      const currentRecord = {
        ...exercise,
        apparatus: 'reformer' as const,
        requiredEquipment: ['reformer'],
        springs: 'CURRENT_FORGED_SPRING',
        footbar: 'high' as const,
        headrest: 'up' as const,
        box: 'long-box' as const,
      };
      const current = reviewed
        ? {
            ...currentRecord,
            review: {
              status: 'approved' as const,
              scope: 'planning-metadata' as const,
              credentialVerified: false as const,
              reviewerAlias: 'Synthetic QA only',
              reviewedAt: '2026-11-05T00:00:00Z',
              revision: exerciseRevision(currentRecord),
            },
          }
        : currentRecord;
      const next = {
        ...syntheticPlanningExercise('cadillac', 'core', 'beta', false),
        springs: 'NEXT_FORGED_SPRING',
        footbar: 'low' as const,
        headrest: 'down' as const,
        box: 'short-box' as const,
      };
      const currentStep = { ...step, customSpringOverride: 'EXPLICIT_CLASS_NOTE' };
      const nextStep: SequenceStep = {
        ...step,
        stepId: 'next-pending-qa',
        order: 2,
        exerciseId: next.id,
        motionStudy: undefined,
      };
      const steps = [currentStep, nextStep];
      const exercises = [current, next];
      const model = buildSequenceSimulation(steps, exercises);
      const { rerender } = render(
        <ConnectedMotionStudy
          model={model}
          position={seekSequenceSimulation(model, 54)}
          steps={steps}
          exercises={exercises}
          selectedIndex={0}
          playing={false}
          reducedMotion={false}
        />,
      );
      const view = () => screen.getByRole('region', { name: '수업 시간에 연결한 동작 흐름' });
      expect(view()).toHaveAttribute('data-study-kind', 'transition');
      expect(view()).toHaveTextContent('이번 수업 강사 입력 메모: EXPLICIT_CLASS_NOTE');
      expect(view()).not.toHaveTextContent('CURRENT_FORGED_SPRING');
      expect(view()).not.toHaveTextContent('NEXT_FORGED_SPRING');
      expect(view()).not.toHaveTextContent('숏박스');
      expect(view()).not.toHaveTextContent('풋바 low');
      expect(view()).not.toHaveTextContent('헤드레스트 down');
      expect(view()).toHaveTextContent('계획 정보 미검토');
      expect(view()).toHaveTextContent('원본 기구 세팅은 검토 후 확인 필요');
      if (reviewed) {
        expect(view()).toHaveTextContent('내 계획 정보 검토 기록 · 전문가 검토 아님');
        expect(view()).toHaveTextContent('롱박스');
        rerender(
          <ConnectedMotionStudy
            model={model}
            position={seekSequenceSimulation(model, 54)}
            steps={steps}
            exercises={exercises}
            selectedIndex={0}
            playing={false}
            reducedMotion={false}
            active={false}
          />,
        );
        expect(view()).not.toHaveTextContent('롱박스');
        expect(view()).toHaveTextContent('원본 변경 · 검토 상태 다시 확인 필요');
      } else {
        expect(view()).not.toHaveTextContent('롱박스');
        expect(view()).not.toHaveTextContent('풋바 high');
        expect(view()).not.toHaveTextContent('헤드레스트 up');
      }
    },
  );

  it('keeps both-side unilateral plans, reduced motion and inactive sources static; completes at finish', () => {
    const { rerender } = render(
      <ConnectedMotionStudy {...props(10, { ...step, sideMode: 'together' })} />,
    );
    const view = () => screen.getByRole('region', { name: '수업 시간에 연결한 동작 흐름' });
    expect(view()).toHaveAttribute('data-study-static', 'true');
    expect(view().querySelectorAll('figure')).toHaveLength(2);
    expect(view()).toHaveTextContent('양쪽의 참고 정지 화면');
    rerender(<ConnectedMotionStudy {...props(10, { ...step, sideMode: undefined })} />);
    expect(view()).toHaveAttribute('data-study-side', 'unknown');
    expect(view()).toHaveAttribute('data-study-static', 'true');
    expect(view().querySelectorAll('figure')).toHaveLength(2);
    expect(view()).toHaveTextContent('계획의 좌우를 확인할 수 없어');
    expect(view()).toHaveTextContent('해부학적 왼쪽 · 참고 정지 화면');
    expect(view()).toHaveTextContent('해부학적 오른쪽 · 참고 정지 화면');
    rerender(<ConnectedMotionStudy {...props(10)} reducedMotion />);
    const reducedProgress = view().getAttribute('data-study-progress');
    rerender(<ConnectedMotionStudy {...props(15)} reducedMotion />);
    expect(view()).toHaveAttribute('data-study-progress', reducedProgress);
    expect(view()).toHaveAttribute('data-study-static', 'true');
    rerender(<ConnectedMotionStudy {...props(14)} active={false} />);
    expect(view()).toHaveTextContent('원본 상태 확인 필요');
    expect(view()).toHaveAttribute('data-study-static', 'true');
    rerender(<ConnectedMotionStudy {...props(60)} />);
    expect(view()).toHaveAttribute('data-motion-stage', 'finish');
    expect(view()).toHaveAttribute('data-study-static', 'true');
  });
});
