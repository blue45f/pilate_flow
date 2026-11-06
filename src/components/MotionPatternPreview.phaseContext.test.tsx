import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { MOTION_PATTERN_REFERENCES } from '../data/motionPatternReferences';
import { INITIAL_EXERCISES } from '../data/pilatesCatalog';
import { usePilatesStore } from '../store/usePilatesStore';
import { MotionPatternPreview } from './MotionPatternPreview';
import { ConnectedMotionStudy } from './ConnectedMotionStudy';
import { buildSequenceSimulation, seekSequenceSimulation } from '../utils/sequenceSimulation';
import { createSequenceMotionStudyBinding } from '../utils/sequenceMotionBinding';
import type { SequenceStep } from '../types/pilates';

const referenceFor = (variantId: string) => {
  const reference = MOTION_PATTERN_REFERENCES.find((item) => item.variantId === variantId);
  if (!reference) throw Error(`Missing authored QA reference ${variantId}`);
  return reference;
};
const context = () => screen.getByRole('region', { name: '도해 단계의 배치와 접점' });
const finish = () =>
  fireEvent.change(screen.getByLabelText('도해 위치'), { target: { value: '1000' } });
afterEach(cleanup);

describe('authored pose context beside the actual displayed phase', () => {
  it('keeps the chair sidebend arm overhead at both setup and finish instead of implying arms-down completion', () => {
    const before = usePilatesStore.getState();
    const catalog = JSON.stringify(INITIAL_EXERCISES);
    render(<MotionPatternPreview reference={referenceFor('chair-seated-overhead-sidebend-v1')} />);
    expect(context()).toHaveAttribute('data-phase', 'setup');
    expect(context()).toHaveAttribute('data-basis', 'authored-model');
    expect(context().querySelector('.mpc-pose')).toHaveTextContent('반대쪽 팔은 이미 위');
    expect(context().querySelector('.mpc-contact')).toHaveTextContent(
      '아래 손은 의자 지지점으로 연결하지 않습니다',
    );
    finish();
    expect(context()).toHaveAttribute('data-phase', 'finish');
    expect(context().querySelector('.mpc-pose')).toHaveTextContent('반대쪽 팔은 여전히 위');
    fireEvent.click(within(context()).getByText('단계 설명의 근거와 한계'));
    expect(
      within(context()).getByText(/팔 내리기나 의자에서 일어나는 과정은 포함하지 않습니다/),
    ).toBeVisible();
    expect(screen.getByRole('button', { name: '한 주기 재생' })).toBeInTheDocument();
    expect(usePilatesStore.getState()).toBe(before);
    expect(JSON.stringify(INITIAL_EXERCISES)).toBe(catalog);
  });

  it('states that the prone forearm model ends with head and chest raised and never invents a head contact', () => {
    render(<MotionPatternPreview reference={referenceFor('prone-forearm-chest-extension-v1')} />);
    expect(context().querySelector('.mpc-pose')).toHaveTextContent(
      '머리와 가슴은 시작부터 이미 들린',
    );
    expect(context().querySelector('.mpc-contact')).toHaveTextContent('머리 접점은 두지 않습니다');
    finish();
    expect(context().querySelector('.mpc-pose')).toHaveTextContent('머리와 가슴이 들린 처음');
    expect(context().querySelector('.mpc-contact')).toHaveTextContent(
      '머리의 매트 접촉은 표시하지 않습니다',
    );
    expect(context()).toHaveAttribute('data-detail-status', 'available');
    expect(screen.getByRole('button', { name: '한 주기 재생' })).toBeInTheDocument();
  });

  it('restores an authored lumbar curve without describing every spine patch as mat-supported', () => {
    render(<MotionPatternPreview reference={referenceFor('articulated-pelvic-curl')} />);
    finish();
    expect(context()).toHaveAttribute('data-phase', 'finish');
    expect(context().querySelector('.mpc-pose')).toHaveTextContent('저작 허리 곡선');
    expect(context().querySelector('.mpc-contact')).toHaveTextContent(
      '가운데 척추 패치 하나는 다시 떨어진',
    );
    expect(context().querySelector('.mpc-contact')).toHaveTextContent(
      '모든 척추가 매트에 닿았다는 뜻은 아닙니다',
    );
  });

  it('keeps undeclared behavior unknown and cycle-wide notes distinct from missing phase annotations', () => {
    const ref = referenceFor('quadruped-leg-slide');
    render(<MotionPatternPreview reference={ref} />);
    expect(context()).toHaveAttribute('data-detail-status', 'not_authored');
    expect(document.querySelector('.mpp-support')).toHaveTextContent(
      ref.definition.supportSummary ?? ref.definition.supportNote,
    );
    fireEvent.click(within(context()).getByText('단계 설명의 근거와 한계'));
    expect(
      within(context()).getByText(/이 단계의 별도 배치·접점 설명은 아직 작성되지 않았습니다/),
    ).toBeVisible();
    expect(
      within(context()).getByText(/정지·이동 표시 구분은 원본 정의에 기록되어 있지 않습니다/),
    ).toBeVisible();
  });

  it('uses the displayed connected still phase and keeps class state and motion review untouched', () => {
    const ref = referenceFor('prone-forearm-chest-extension-v1');
    const ex = INITIAL_EXERCISES.find((item) => item.id === ref.intendedExerciseIds[0])!;
    const step: SequenceStep = {
      stepId: 'qa-phase-context-read-only',
      exerciseId: ex.id,
      order: 1,
      blockCategory: 'core',
      selectedLayer: 'standard',
      durationMin: 1,
      explanationSec: 8,
      transitionSec: 8,
      sideMode: 'together',
      motionStudy: createSequenceMotionStudyBinding(ex.id, ref.family, ref.variantId),
    };
    const before = usePilatesStore.getState();
    const model = buildSequenceSimulation([step], [ex], 1);
    const props = {
      model,
      steps: [step],
      exercises: [ex],
      selectedIndex: 0,
      playing: false,
      reducedMotion: false,
    };
    const { rerender } = render(
      <ConnectedMotionStudy {...props} position={seekSequenceSimulation(model, 0)} />,
    );
    expect(context()).toHaveAttribute('data-phase', 'setup');
    expect(context().querySelector('.mpc-pose')).toHaveTextContent(
      '머리와 가슴은 시작부터 이미 들린',
    );
    rerender(<ConnectedMotionStudy {...props} position={seekSequenceSimulation(model, 60)} />);
    expect(context()).toHaveAttribute('data-phase', 'finish');
    expect(context().querySelector('.mpc-contact')).toHaveTextContent(
      '머리의 매트 접촉은 표시하지 않습니다',
    );
    expect(screen.getByText('전문가 미검토 · 0명')).toBeInTheDocument();
    expect(usePilatesStore.getState()).toBe(before);
  });
});
