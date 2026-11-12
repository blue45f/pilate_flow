import React, { useMemo, useState } from 'react';
import { ArrowRight, Clock3, Layers, RefreshCw, Repeat } from 'lucide-react';
import { usePilatesStore } from '../store/usePilatesStore';
import type { DifficultyLevel } from '../types/pilates';
import {
  generateStudioCircuitPlan,
  type CircuitRoundCount,
  type CircuitStationCount,
  type CircuitTransitionSec,
} from '../utils/circuitPlannerEngine';
import { PfBadge, PfButton } from '../design-system';

interface StudioCircuitPlannerCardProps {
  onApplied?: (summaryMessage: string) => void;
}

export const StudioCircuitPlannerCard: React.FC<StudioCircuitPlannerCardProps> = ({
  onApplied,
}) => {
  const exercises = usePilatesStore((s) => s.exercises);
  const ownedEquipment = usePilatesStore((s) => s.ownedEquipment);
  const activeTargetMinutes = usePilatesStore((s) => s.activeTargetMinutes);
  const activeLevel = usePilatesStore((s) => s.activeLevel);
  const reformerBrand = usePilatesStore((s) => s.reformerBrand);
  const applyPresetDraft = usePilatesStore((s) => s.applyPresetDraft);

  const [stationCount, setStationCount] = useState<CircuitStationCount>(3);
  const [roundCount, setRoundCount] = useState<CircuitRoundCount>(2);
  const [transitionSec, setTransitionSec] = useState<CircuitTransitionSec>(45);
  const [circuitLevel, setCircuitLevel] = useState<DifficultyLevel>(activeLevel || '1.5');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const plan = useMemo(
    () =>
      generateStudioCircuitPlan({
        exercises,
        ownedEquipment,
        stationCount,
        roundCount,
        transitionSec,
        targetMinutes: activeTargetMinutes || 50,
        level: circuitLevel,
        reformerBrand,
      }),
    [
      exercises,
      ownedEquipment,
      stationCount,
      roundCount,
      transitionSec,
      activeTargetMinutes,
      circuitLevel,
      reformerBrand,
    ],
  );

  const handleApplyCircuit = (mode: 'replace' | 'append') => {
    if (!plan) return;
    const expected = usePilatesStore.getState();
    const res = applyPresetDraft(
      {
        steps: plan.steps,
        title: plan.title,
        subtitle: plan.subtitle,
        targetMinutes: plan.targetMinutes,
      },
      mode,
      expected,
    );
    setStatusMessage(res.message);
    if (res.success) {
      onApplied?.(res.message);
    }
  };

  if (!plan) return null;

  return (
    <section
      className="pf-v70-circuit-card"
      data-testid="studio-circuit-planner-card"
      aria-label="듀엣·그룹 멀티 기구 순환 서킷 설계기"
    >
      <div className="pf-v70-circuit-head">
        <div>
          <span className="pf-studio-kicker-pill">MULTI-APPARATUS CIRCUIT · 순환 서킷</span>
          <h3>듀엣·트리오·그룹 기구 순환 서킷 자동 편성</h3>
          <p className="muted">
            보유 기구 안에서 스테이션별 수행 시간을 동일하게 맞추고 기구 교대·세팅 전환 구간을 자동 삽입합니다.
          </p>
        </div>
        <PfBadge tone="sage">{plan.stationSummaryKo}</PfBadge>
      </div>

      <div className="pf-v70-circuit-controls" role="group" aria-label="서킷 스테이션 및 라운드 설정">
        <div className="pf-v70-chip-field">
          <span className="pf-v70-chip-label">스테이션 수</span>
          <div className="pf-v70-chip-row">
            {([2, 3, 4] as const).map((cnt) => (
              <button
                key={cnt}
                type="button"
                className={`pf-v70-option-chip ${stationCount === cnt ? 'is-active' : ''}`.trim()}
                data-testid={`circuit-station-count-${cnt}`}
                aria-pressed={stationCount === cnt}
                onClick={() => setStationCount(cnt)}
              >
                {cnt === 2 ? '2곳 (듀엣)' : cnt === 3 ? '3곳 (트리오)' : '4곳 (그룹)'}
              </button>
            ))}
          </div>
        </div>

        <div className="pf-v70-chip-field">
          <span className="pf-v70-chip-label">순환 라운드</span>
          <div className="pf-v70-chip-row">
            {([1, 2, 3] as const).map((rnd) => (
              <button
                key={rnd}
                type="button"
                className={`pf-v70-option-chip ${roundCount === rnd ? 'is-active' : ''}`.trim()}
                data-testid={`circuit-round-count-${rnd}`}
                aria-pressed={roundCount === rnd}
                onClick={() => setRoundCount(rnd)}
              >
                {rnd}라운드
              </button>
            ))}
          </div>
        </div>

        <div className="pf-v70-chip-field">
          <span className="pf-v70-chip-label">기구 교대 전환</span>
          <div className="pf-v70-chip-row">
            {([30, 45, 60] as const).map((sec) => (
              <button
                key={sec}
                type="button"
                className={`pf-v70-option-chip ${transitionSec === sec ? 'is-active' : ''}`.trim()}
                data-testid={`circuit-transition-sec-${sec}`}
                aria-pressed={transitionSec === sec}
                onClick={() => setTransitionSec(sec)}
              >
                {sec}초 전환
              </button>
            ))}
          </div>
        </div>

        <div className="pf-v70-chip-field">
          <span className="pf-v70-chip-label">난이도 기준</span>
          <div className="pf-v70-chip-row">
            {(['1.0', '1.5', '2.0'] as const).map((lv) => (
              <button
                key={lv}
                type="button"
                className={`pf-v70-option-chip ${circuitLevel === lv ? 'is-active' : ''}`.trim()}
                aria-pressed={circuitLevel === lv}
                onClick={() => setCircuitLevel(lv)}
              >
                Lv {lv}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="pf-v70-circuit-preview" data-testid="circuit-rounds-preview">
        {plan.rounds.map((round) => (
          <div key={round.roundNumber} className="pf-v70-round-block">
            <div className="pf-v70-round-header">
              <strong>
                <Repeat size={14} aria-hidden="true" /> {round.roundLabelKo}
              </strong>
              <span>교대 전환 {round.rotationRestSec}초 포함</span>
            </div>
            <div className="pf-v70-station-grid">
              {round.stations.map((st) => (
                <div
                  key={`${round.roundNumber}-${st.stationIndex}`}
                  className="pf-v70-station-card"
                  data-testid={`circuit-station-card-r${round.roundNumber}-s${st.stationIndex + 1}`}
                >
                  <img
                    src={st.thumb3dUrl}
                    alt=""
                    aria-hidden="true"
                    loading="lazy"
                    className="pf-v70-station-thumb"
                  />
                  <div className="pf-v70-station-meta">
                    <span className="pf-v70-station-kicker">{st.stationLabelKo}</span>
                    <strong>{st.exercise.nameKo}</strong>
                    <span className="pf-v70-station-sub">
                      <Clock3 size={12} aria-hidden="true" /> {st.durationMin}분 · {st.brandSpringSummaryKo}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="pf-v70-circuit-footer">
        <div className="pf-v70-circuit-summary">
          <Layers size={15} aria-hidden="true" />
          <span>
            통합 웜업({plan.warmupExercise.nameKo}) → {plan.stationCount * plan.roundCount}개 순환 스테이션 → 통합 쿨다운({plan.cooldownExercise.nameKo}) · 총 약 {Math.round(plan.totalPlannedSeconds / 60)}분
          </span>
        </div>
        <div className="pf-v70-circuit-actions">
          <PfButton
            variant="secondary"
            data-testid="circuit-append-btn"
            onClick={() => handleApplyCircuit('append')}
          >
            <RefreshCw size={15} /> 현재 초안 뒤에 이어붙이기
          </PfButton>
          <PfButton
            variant="primary"
            data-testid="circuit-replace-apply-btn"
            onClick={() => handleApplyCircuit('replace')}
          >
            서킷 시퀀스로 바로 적용 <ArrowRight size={15} />
          </PfButton>
        </div>
      </div>

      {statusMessage && (
        <p className="pf-v70-inline-status" role="status" data-testid="circuit-apply-status">
          {statusMessage}
        </p>
      )}
    </section>
  );
};
