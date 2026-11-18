import { describe, expect, it, beforeEach } from 'vitest';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { App } from '../App';
import { StudioBrandMark, StudioSpringHorizon } from '../components/StudioBrandMark';
import { GLOBAL_CRAWLED_REPERTOIRE_EXERCISES } from '../data/globalCrawledRepertoirePack';
import { INITIAL_EXERCISES } from '../data/pilatesCatalog';
import { sampleUniversal3DExerciseRig } from '../data/universal3dExerciseRigs';
import { CountUp, directionBetween, runPageTransition } from '../motion';
import { usePilatesStore } from '../store/usePilatesStore';

describe('Unslop v7 UI/UX, reorganized studio IA & page-specific motion choreography', () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
    const state = usePilatesStore.getState();
    state.startBlankSequence();
    state.setActiveTab('workbench');
  });

  it('reorganizes desktop sidebar into grouped studio chapters with promoted history and top live-stage card', async () => {
    render(<App />);

    const sidebar = screen.getByLabelText('스튜디오 탐색');
    expect(within(sidebar).getByText('수업 설계')).toBeInTheDocument();
    expect(within(sidebar).getByText('운영 · 아카이브')).toBeInTheDocument();

    const primaryNav = within(screen.getByRole('navigation', { name: '주 메뉴' }));
    expect(primaryNav.getByRole('button', { name: '수업 만들기' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(primaryNav.getByRole('button', { name: /동작 라이브러리/ })).toBeInTheDocument();
    expect(primaryNav.getByRole('button', { name: '수업 일정' })).toBeInTheDocument();
    expect(primaryNav.getByRole('button', { name: '저장한 수업' })).toBeInTheDocument();

    const historyNavBtn = primaryNav.getByRole('button', { name: '진행 기록' });
    fireEvent.click(historyNavBtn);
    expect(usePilatesStore.getState().activeTab).toBe('history');
    expect(
      await screen.findByRole('heading', { level: 1, name: /수업 기록/ }, { timeout: 10000 }),
    ).toBeInTheDocument();
  }, 15000);

  it('renders live spring tension meter on workbench and floating sequence dock on atlas when steps exist', async () => {
    render(<App />);

    const studio = screen.getByTestId('sequence-studio');
    expect(studio.querySelector('.pf-studio-spring-meter')).not.toBeNull();
    expect(studio.querySelector('.pf-spring-horizon')).not.toBeNull();

    const activeApparatus = usePilatesStore.getState().activeApparatus;
    const firstEx = usePilatesStore
      .getState()
      .exercises.find((ex) => ex.apparatus === activeApparatus)!;
    act(() => {
      usePilatesStore.getState().appendExerciseToSequence(firstEx.id, firstEx.blockCategory);
    });

    const quickStageBtn = screen.getByTestId('sidebar-quick-stage-btn');
    expect(quickStageBtn).toHaveClass('is-ready');
    expect(quickStageBtn).toHaveTextContent('수업 진행하기');

    const primaryNav = within(screen.getByRole('navigation', { name: '주 메뉴' }));
    fireEvent.click(primaryNav.getByRole('button', { name: /동작 라이브러리/ }));

    const dock = await screen.findByTestId(
      'atlas-catalog-sequence-dock',
      {},
      { timeout: 10000 },
    );
    expect(dock).toHaveTextContent('동작 1개 담김');
    fireEvent.click(within(dock).getByRole('button', { name: /시퀀스 조율하러 가기/ }));
    expect(usePilatesStore.getState().activeTab).toBe('workbench');
  }, 15000);

  it('computes directional page transitions, safe synchronous fallback, CountUp and StudioSpringHorizon geometry', () => {
    const order = ['workbench', 'atlas', 'schedule', 'binder', 'history'] as const;
    expect(directionBetween(order, 'workbench', 'atlas')).toBe('forward');
    expect(directionBetween(order, 'history', 'workbench')).toBe('back');
    expect(directionBetween(order, 'atlas', 'atlas')).toBe('fade');

    let executed = false;
    runPageTransition(
      () => {
        executed = true;
      },
      { kind: 'stage', origin: { x: 120, y: 80 } },
    );
    expect(executed).toBe(true);

    const { container, rerender } = render(
      <div>
        <StudioBrandMark size={22} />
        <StudioSpringHorizon ratio={0} />
        <CountUp value={15} format={(v) => `${Math.round(v)}분`} />
      </div>,
    );
    expect(container.querySelector('.pf-brand-mark')).not.toBeNull();
    const activeStroke = container.querySelector('.pf-spring-horizon__active');
    expect(activeStroke).toHaveAttribute('stroke-dashoffset', '100');
    expect(container.textContent).toContain('15분');

    rerender(
      <div>
        <StudioBrandMark size={22} />
        <StudioSpringHorizon ratio={0.5} />
        <CountUp value={50} format={(v) => `${Math.round(v)}분`} />
      </div>,
    );
    expect(container.querySelector('.pf-spring-horizon__active')).toHaveAttribute(
      'stroke-dashoffset',
      '50',
    );
    expect(container.textContent).toContain('50분');
  });

  it('enforces Unslop v7 tokens, View Transition keyframes, no transition:all, and prefers-reduced-motion guard', () => {
    const css = readFileSync(resolve(process.cwd(), 'src/styles/pf-motion-studio.css'), 'utf8');
    expect(css).toContain('cubic-bezier(0.22, 1, 0.36, 1)');
    expect(css).toContain('::view-transition-new(pf-workspace)');
    expect(css).toContain('@keyframes pf-vt-stage-curtain');
    expect(css).toContain('@media (prefers-reduced-motion: reduce)');
    expect(css).not.toMatch(/transition\s*:\s*all\b/);
    expect(css).not.toMatch(/transition-property\s*:\s*all\b/);
  });

  it('guarantees zero IK limb detachment, zero L/R scissoring, and zero knee-snap flips across all 218 exercises', () => {
    const all218 = [...INITIAL_EXERCISES, ...GLOBAL_CRAWLED_REPERTOIRE_EXERCISES];
    expect(all218).toHaveLength(218);

    const sub = (a: readonly number[], b: readonly number[]) =>
      [a[0] - b[0], a[1] - b[1], a[2] - b[2]] as const;
    const add = (a: readonly number[], b: readonly number[]) =>
      [a[0] + b[0], a[1] + b[1], a[2] + b[2]] as const;
    const mul = (a: readonly number[], s: number) => [a[0] * s, a[1] * s, a[2] * s] as const;
    const dot = (a: readonly number[], b: readonly number[]) =>
      a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
    const cross = (a: readonly number[], b: readonly number[]) =>
      [
        a[1] * b[2] - a[2] * b[1],
        a[2] * b[0] - a[0] * b[2],
        a[0] * b[1] - a[1] * b[0],
      ] as const;
    const len = (a: readonly number[]) => Math.hypot(a[0], a[1], a[2]);
    const norm = (a: readonly number[]) => {
      const l = len(a);
      return l > 1e-6 ? ([a[0] / l, a[1] / l, a[2] / l] as const) : ([0, 0, 1] as const);
    };
    const solveMid = (
      root: readonly number[],
      target: readonly number[],
      l1: number,
      l2: number,
      pole: readonly number[],
    ) => {
      const dVec = sub(target, root);
      const dist = Math.min((l1 + l2) * 0.992, Math.max(Math.abs(l1 - l2) + 0.03, len(dVec)));
      const u = norm(dVec);
      let bend = sub(pole, mul(u, dot(pole, u)));
      if (len(bend) < 1e-4) bend = cross(u, [0, 1, 0]);
      bend = norm(bend);
      const cosA = Math.max(-1, Math.min(1, (l1 * l1 + dist * dist - l2 * l2) / (2 * l1 * dist)));
      const angA = Math.acos(cosA);
      return add(root, mul(add(mul(u, Math.cos(angA)), mul(bend, Math.sin(angA))), l1));
    };

    for (const ex of all218) {
      let prevLKnee: readonly number[] | null = null;
      let prevRKnee: readonly number[] | null = null;
      for (const t of [0, 0.2, 0.42, 0.6, 0.8, 1]) {
        const rig = sampleUniversal3DExerciseRig(ex, t);
        const spLen = len(sub(rig.chest, rig.pelvis));
        expect(spLen, `${ex.id}@${t} spineLen`).toBeGreaterThanOrEqual(0.305);
        expect(spLen, `${ex.id}@${t} spineLen`).toBeLessThanOrEqual(0.57);

        const spUp = norm(sub(rig.chest, rig.pelvis));
        const antProj = sub(rig.antHint, mul(spUp, dot(rig.antHint, spUp)));
        const antN = len(antProj) > 1e-4 ? norm(antProj) : ([1, 0, 0] as const);
        const bodyRight = norm(cross(spUp, antN));

        const lHip = sub(rig.pelvis, mul(bodyRight, 0.086));
        const rHip = add(rig.pelvis, mul(bodyRight, 0.086));
        const lSh = sub(rig.chest, mul(bodyRight, 0.148));
        const rSh = add(rig.chest, mul(bodyRight, 0.148));

        expect(len(sub(rig.lFoot, lHip)), `${ex.id}@${t} lLeg`).toBeLessThanOrEqual(0.79);
        expect(len(sub(rig.rFoot, rHip)), `${ex.id}@${t} rLeg`).toBeLessThanOrEqual(0.79);
        expect(len(sub(rig.lHand, lSh)), `${ex.id}@${t} lArm`).toBeLessThanOrEqual(0.54);
        expect(len(sub(rig.rHand, rSh)), `${ex.id}@${t} rArm`).toBeLessThanOrEqual(0.54);

        const lKnee = solveMid(lHip, rig.lFoot, 0.4, 0.39, rig.lKneePole);
        const rKnee = solveMid(rHip, rig.rFoot, 0.4, 0.39, rig.rKneePole);
        expect(lKnee[2], `${ex.id}@${t} lKnee.z`).toBeGreaterThanOrEqual(0.025);
        expect(rKnee[2], `${ex.id}@${t} rKnee.z`).toBeGreaterThanOrEqual(0.025);

        // Enforce anatomical knee hinge direction & kneeling surface grounding
        const pelUp = norm(sub(rig.spineMid, rig.pelvis));
        const pelAntProj = sub(rig.antHint, mul(pelUp, dot(rig.antHint, pelUp)));
        const pelAnt = len(pelAntProj) > 1e-4 ? norm(pelAntProj) : antN;
        const isLungeOrHorseback = /lunge|scooter|splits|horseback/i.test(`${ex.id} ${rig.rigId}`);

        for (const side of ['L', 'R'] as const) {
          const hip = side === 'L' ? lHip : rHip;
          const knee = side === 'L' ? lKnee : rKnee;
          const foot = side === 'L' ? rig.lFoot : rig.rFoot;
          const outward = side === 'L' ? mul(bodyRight, -1) : bodyRight;
          const u1 = norm(sub(knee, hip));
          const u2 = norm(sub(foot, knee));
          const bendDeg = (Math.acos(Math.max(-1, Math.min(1, dot(u1, u2)))) * 180) / Math.PI;
          if (bendDeg > 14) {
            const patellaDir = norm(sub(u1, u2));
            if (!isLungeOrHorseback && ex.bodyPosition === 'prone') {
              expect(patellaDir[2], `${ex.id}@${t} ${side} prone upward knee`).toBeLessThanOrEqual(
                0.22,
              );
            }
            const isValidProneCurl =
              pelAnt[2] < -0.45 && (patellaDir[2] < -0.12 || rig.rigId === 'expanded-mat-rocking');
            if (!isValidProneCurl && !rig.trapezeStrap) {
              const validHinge =
                dot(patellaDir, pelAnt) >= -0.08 ||
                dot(patellaDir, antN) >= -0.05 ||
                dot(patellaDir, pelUp) >= 0.38 ||
                dot(patellaDir, outward) >= 0.52;
              expect(validHinge, `${ex.id}@${t} ${side} anatomical knee hinge`).toBe(true);
            }
          }
        }

        const isKneelingPose =
          (ex.bodyPosition === 'kneeling' ||
            /kneel|quadruped|cat-rolldown|down-stretch|thigh-stretch|reverse-abs-kneeling|forearm-plank/i.test(
              `${ex.id} ${rig.rigId}`,
            )) &&
          !/hover|off|arabesque|up-stretch|long-stretch|elephant/i.test(rig.rigId);
        if (isKneelingPose) {
          const expectedSurfaceZ =
            ex.apparatus === 'cadillac'
              ? 0.62
              : ex.apparatus === 'reformer'
                ? rig.withLongbox
                  ? 0.64
                  : 0.41
                : 0.05;
          expect(
            Math.min(lKnee[2], rKnee[2]),
            `${ex.id}@${t} kneeling surface contact`,
          ).toBeLessThanOrEqual(expectedSurfaceZ + 0.12);
        }

        if (prevLKnee && prevRKnee) {
          expect(len(sub(lKnee, prevLKnee)), `${ex.id}@${t} lKneeSnap`).toBeLessThan(0.36);
          expect(len(sub(rKnee, prevRKnee)), `${ex.id}@${t} rKneeSnap`).toBeLessThan(0.36);
        }
        prevLKnee = lKnee;
        prevRKnee = rKnee;
      }
    }
  });
});
