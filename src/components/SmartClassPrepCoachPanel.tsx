import React, { useMemo, useState } from 'react';
import { Check, Compass, Info, Plus, Sparkles } from 'lucide-react';
import { APPARATUS_LABELS, POSITION_LABELS } from '../data/pilatesCatalog';
import { usePilatesStore } from '../store/usePilatesStore';
import type {
  ApparatusType,
  ClassHistoryLog,
  DifficultyLevel,
  PilatesExercise,
  PropType,
  SequenceStep,
} from '../types/pilates';
import { formatDifficultyMeta } from '../utils/instructorUxHelpers';
import { ensureWorldExercisesInStore } from '../utils/registerAllStudioAdapters';
import { analyzeSmartClassPrep } from '../utils/smartClassPrepEngine';
import { NaturalVoiceSpeakButton } from './NaturalVoiceSpeakButton';
import { SpringVisualPills } from './SpringVisualPills';
import '../styles/studio-smart-tools-rail.css';

export interface SmartClassPrepCoachPanelProps {
  readonly activeSteps?: readonly SequenceStep[];
  readonly historyLogs?: readonly ClassHistoryLog[];
  readonly exercises?: readonly PilatesExercise[];
  readonly activeApparatus?: ApparatusType | 'mixed';
  readonly activeLevel?: DifficultyLevel;
  readonly targetGroupId?: string;
  readonly ownedEquipment?: readonly string[];
  readonly ownedProps?: readonly PropType[];
  readonly onAddExercise?: (exercise: PilatesExercise) => void;
}

export const SmartClassPrepCoachPanel: React.FC<SmartClassPrepCoachPanelProps> = ({
  activeSteps: stepsProp,
  historyLogs: logsProp,
  exercises: exercisesProp,
  activeApparatus: apparatusProp,
  activeLevel: levelProp,
  targetGroupId: groupIdProp,
  ownedEquipment: ownedEquipmentProp,
  ownedProps: ownedPropsProp,
  onAddExercise,
}) => {
  const storeSteps = usePilatesStore((s) => s.activeSteps);
  const storeLogs = usePilatesStore((s) => s.historyLogs);
  const storeExercises = usePilatesStore((s) => s.exercises);
  const storeApparatus = usePilatesStore((s) => s.activeApparatus);
  const storeLevel = usePilatesStore((s) => s.activeLevel);
  const storeGroupId = usePilatesStore((s) => s.activeTargetGroupId);
  const storeOwnedEquipment = usePilatesStore((s) => s.ownedEquipment);
  const storeOwnedProps = usePilatesStore((s) => s.ownedProps);

  const activeSteps = stepsProp ?? storeSteps;
  const historyLogs = logsProp ?? storeLogs;
  const exercises = exercisesProp ?? storeExercises;
  const activeApparatus = apparatusProp ?? storeApparatus;
  const activeLevel = levelProp ?? storeLevel;
  const targetGroupId = groupIdProp ?? storeGroupId;
  const ownedEquipment = ownedEquipmentProp ?? storeOwnedEquipment;
  const ownedProps = ownedPropsProp ?? storeOwnedProps;

  const [feedback, setFeedback] = useState<{ ok: boolean; message: string } | null>(null);
  const [recentlyAddedIds, setRecentlyAddedIds] = useState<readonly string[]>([]);

  const analysis = useMemo(
    () =>
      analyzeSmartClassPrep({
        activeSteps,
        historyLogs,
        catalog: exercises,
        activeApparatus,
        activeLevel,
        targetGroupId,
        ownedEquipment,
        ownedProps,
        limit: 4,
      }),
    [
      activeSteps,
      historyLogs,
      exercises,
      activeApparatus,
      activeLevel,
      targetGroupId,
      ownedEquipment,
      ownedProps,
    ],
  );

  const handleAdd = (exercise: PilatesExercise) => {
    if (onAddExercise) {
      ensureWorldExercisesInStore([exercise]);
      onAddExercise(exercise);
      setRecentlyAddedIds((prev) => (prev.includes(exercise.id) ? prev : [...prev, exercise.id]));
      setFeedback({ ok: true, message: `‘${exercise.nameKo}’을 현재 수업에 담았습니다.` });
      return;
    }

    ensureWorldExercisesInStore([exercise]);
    const beforeCount = usePilatesStore.getState().activeSteps.length;
    usePilatesStore.getState().appendExerciseToSequence(exercise.id, exercise.blockCategory);
    const afterState = usePilatesStore.getState();
    const added =
      afterState.activeSteps.length === beforeCount + 1 &&
      afterState.activeSteps.at(-1)?.exerciseId === exercise.id;

    if (added) {
      setRecentlyAddedIds((prev) => (prev.includes(exercise.id) ? prev : [...prev, exercise.id]));
      setFeedback({ ok: true, message: `‘${exercise.nameKo}’을 현재 수업에 담았습니다.` });
    } else {
      setFeedback({
        ok: false,
        message:
          afterState.generationError ||
          '현재 수업 기구·난이도·보유 소도구 조건을 확인한 뒤 다시 담아 주세요.',
      });
    }
  };

  return (
    <section
      className="pf-smart-coach"
      data-testid="smart-class-prep-coach-panel"
      aria-label="수업 분석 및 스마트 다음 동작 추천 코치"
    >
      <div className="pf-smart-coach__summary-card" data-testid="smart-coach-diagnosis">
        <div className="pf-smart-coach__header-row">
          <div>
            <span className="pf-smart-coach__kicker">
              <Compass size={15} strokeWidth={1.6} aria-hidden="true" />
              실시간 수업 분석 · 통합 {analysis.catalogSize.toLocaleString('ko-KR')}종 기준
            </span>
            <h3 className="pf-smart-coach__headline">{analysis.diagnosisHeadlineKo}</h3>
          </div>
          <div className="pf-smart-coach__meta-strip">
            <span>
              현재 수업 <strong>{analysis.analyzedStepCount}</strong>동작 · {analysis.plannedMinutes}분
            </span>
            <span>
              최근 수업 <strong>{analysis.recentClassesAnalyzed}</strong>회 반영
            </span>
            <span>
              척추 균형 <strong>{analysis.coveredPlaneCount}/4</strong>면
            </span>
          </div>
        </div>

        {analysis.warmupPrereqNoticeKo && (
          <p className="pf-smart-coach__notice" role="note" data-testid="smart-coach-warmup-notice">
            <Info size={16} strokeWidth={1.6} aria-hidden="true" />
            <span>{analysis.warmupPrereqNoticeKo}</span>
          </p>
        )}

        <div
          className="pf-smart-coach__planes"
          role="list"
          aria-label="척추 4면 균형 현황"
          data-testid="smart-coach-spinal-balance"
        >
          {analysis.spinalBalance.map((item) => (
            <div
              key={item.plane}
              role="listitem"
              className="pf-smart-coach__plane-cell"
              data-testid={`smart-coach-plane-${item.plane}`}
            >
              <div className="pf-smart-coach__plane-top">
                <strong>{item.labelKo}</strong>
                <span>{item.count}동작</span>
              </div>
              <div className="pf-smart-coach__plane-bar" aria-hidden="true">
                <div
                  className="pf-smart-coach__plane-fill"
                  style={{ width: `${item.covered ? Math.max(18, item.ratioPercent) : 0}%` }}
                />
              </div>
              <span
                className={`pf-smart-coach__plane-status ${item.covered ? '' : 'is-missing'}`}
              >
                {item.covered ? `${item.ratioPercent}% 포함` : '보완 추천'}
              </span>
            </div>
          ))}
        </div>

        {analysis.missingKeyBlocks.length > 0 && (
          <div
            className="pf-smart-coach__missing-blocks"
            data-testid="smart-coach-missing-blocks"
          >
            <span>비어 있는 구간</span>
            {analysis.missingKeyBlocks.map((block) => (
              <span key={block.category} className="pf-smart-coach__missing-chip">
                {block.labelKo}
              </span>
            ))}
          </div>
        )}

        {analysis.anchorExercise && (
          <div className="pf-smart-coach__anchor" data-testid="smart-coach-anchor">
            <div className="pf-smart-coach__anchor-main">
              <strong>마지막 동작 기준</strong>
              <span>{analysis.anchorExercise.nameKo}</span>
              <span>· {APPARATUS_LABELS[analysis.anchorExercise.apparatus].short}</span>
              <span>
                · {POSITION_LABELS[analysis.anchorExercise.bodyPosition].ko.split(' ')[0]}
              </span>
            </div>
            <SpringVisualPills springs={analysis.anchorSpring || analysis.anchorExercise.springs} />
          </div>
        )}
      </div>

      {feedback && (
        <p
          className={`pf-smart-coach__feedback ${feedback.ok ? '' : 'is-error'}`}
          role={feedback.ok ? 'status' : 'alert'}
          aria-live={feedback.ok ? 'polite' : 'assertive'}
          data-testid="smart-coach-feedback"
        >
          {feedback.ok ? (
            <Check size={16} strokeWidth={1.7} aria-hidden="true" />
          ) : (
            <Info size={16} strokeWidth={1.7} aria-hidden="true" />
          )}
          <span>{feedback.message}</span>
        </p>
      )}

      <div className="pf-smart-coach__section-head">
        <h3>
          <Sparkles
            size={15}
            strokeWidth={1.6}
            aria-hidden="true"
            style={{ verticalAlign: '-2px', marginRight: '6px' }}
          />
          다음 연결 추천 Top {analysis.recommendations.length}
        </h3>
        <span>스프링 변경 0회 · 같은 자세 · 최근 3회 미사용 우선</span>
      </div>

      {analysis.recommendations.length > 0 ? (
        <div
          className="pf-smart-coach__grid"
          data-testid="smart-coach-recommendations"
        >
          {analysis.recommendations.map((rec, index) => {
            const diff = formatDifficultyMeta(rec.exercise.level);
            const justAdded = recentlyAddedIds.includes(rec.exercise.id);
            return (
              <article
                key={rec.exercise.id}
                className="pf-smart-coach__card"
                data-testid={`smart-coach-rec-${rec.exercise.id}`}
                aria-label={`추천 ${index + 1}위 ${rec.exercise.nameKo}`}
              >
                <div className="pf-smart-coach__card-meta">
                  <span className="pf-smart-coach__rank">추천 {index + 1}</span>
                  <span>{APPARATUS_LABELS[rec.exercise.apparatus].short}</span>
                  <span className={`pf-difficulty-badge is-${diff.tone}`}>{diff.fullLabel}</span>
                  <span>{rec.exercise.defaultDurationMin}분</span>
                </div>

                <h4 className="pf-smart-coach__card-title">{rec.exercise.nameKo}</h4>

                {rec.badgesKo.length > 0 && (
                  <div className="pf-smart-coach__badges">
                    {rec.badgesKo.map((badge) => (
                      <span key={badge} className="pf-smart-coach__badge">
                        {badge}
                      </span>
                    ))}
                  </div>
                )}

                <p className="pf-smart-coach__reason">{rec.reasonKo}</p>

                <div className="pf-smart-coach__spring-line">
                  <SpringVisualPills springs={rec.exercise.springs} />
                  <span>{rec.exercise.targetMuscles.slice(0, 2).join(' · ')}</span>
                </div>

                <div className="pf-smart-coach__actions">
                  <NaturalVoiceSpeakButton
                    exercise={rec.exercise}
                    variant="compact"
                    labelKo="AI 음성 미리듣기"
                    showProgressBar={false}
                    showQualityBadge={false}
                  />
                  <button
                    type="button"
                    className={`pf-smart-coach__add-btn ${justAdded ? 'is-added' : ''}`}
                    data-testid={`smart-coach-add-${rec.exercise.id}`}
                    aria-label={`${rec.exercise.nameKo} 수업에 바로 담기`}
                    onClick={() => handleAdd(rec.exercise)}
                  >
                    {justAdded ? (
                      <Check size={15} strokeWidth={1.7} aria-hidden="true" />
                    ) : (
                      <Plus size={15} strokeWidth={1.7} aria-hidden="true" />
                    )}
                    <span>{justAdded ? '수업에 담김' : '수업에 바로 담기'}</span>
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="pf-smart-coach__empty" role="status">
          현재 선택한 기구·보유 장비·난이도 조건에서 추가 가능한 후보가 모두 수업에 담겼습니다.
          수업 조건의 난이도나 기구 범위를 넓혀 보세요.
        </div>
      )}
    </section>
  );
};
