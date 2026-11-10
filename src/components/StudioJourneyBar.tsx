import React from 'react';
import { ArrowRight, Check, Clock3, Library, Play, CalendarDays } from 'lucide-react';
import type { ActiveWorkspaceTab } from '../store/usePilatesStore';
import '../styles/studio-journey-bar.css';

export interface StudioJourneyBarProps {
  readonly activeTab: ActiveWorkspaceTab;
  readonly exerciseCount: number;
  readonly stepCount: number;
  readonly targetMinutes: number;
  readonly historyCount: number;
  readonly canStartStage: boolean;
  readonly onSelectStep: (tab: ActiveWorkspaceTab) => void;
}

export const StudioJourneyBar: React.FC<StudioJourneyBarProps> = ({
  activeTab,
  exerciseCount,
  stepCount,
  targetMinutes,
  historyCount,
  canStartStage,
  onSelectStep,
}) => {
  const steps = [
    {
      id: 'atlas' as const,
      stepNum: 1,
      title: '동작 탐색',
      meta: `${exerciseCount}개 노트`,
      icon: Library,
      disabled: false,
    },
    {
      id: 'workbench' as const,
      stepNum: 2,
      title: '수업 구성',
      meta: stepCount > 0 ? `${stepCount}개 · 목표 ${targetMinutes}분` : `목표 ${targetMinutes}분`,
      icon: CalendarDays,
      disabled: false,
    },
    {
      id: 'stage' as const,
      stepNum: 3,
      title: '수업 진행',
      meta: canStartStage ? '타이머 준비됨' : '동작 추가 후 시작',
      icon: Play,
      disabled: !canStartStage && activeTab !== 'stage',
    },
    {
      id: 'history' as const,
      stepNum: 4,
      title: '수업 기록',
      meta: historyCount > 0 ? `누적 ${historyCount}건` : '진행 내용 보존',
      icon: Clock3,
      disabled: false,
    },
  ];

  const activeOrder =
    activeTab === 'atlas'
      ? 1
      : activeTab === 'workbench' || activeTab === 'binder' || activeTab === 'schedule'
        ? 2
        : activeTab === 'stage'
          ? 3
          : 4;

  return (
    <nav
      className="pf-journey-bar"
      aria-label="강사 4단계 수업 흐름"
      data-testid="studio-journey-bar"
    >
      <ol className="pf-journey-bar__list">
        {steps.map((item, idx) => {
          const isCurrent = activeTab === item.id;
          const isCompleted = item.stepNum < activeOrder;
          const Icon = item.icon;
          return (
            <li key={item.id} className="pf-journey-bar__item">
              <button
                type="button"
                className={`pf-journey-bar__btn ${isCurrent ? 'is-current' : ''} ${
                  isCompleted ? 'is-done' : ''
                }`.trim()}
                aria-current={isCurrent ? 'step' : undefined}
                disabled={item.disabled}
                onClick={() => onSelectStep(item.id)}
              >
                <span className="pf-journey-bar__num" aria-hidden="true">
                  {isCompleted ? <Check size={13} /> : item.stepNum}
                </span>
                <span className="pf-journey-bar__text">
                  <strong>
                    <Icon size={14} aria-hidden="true" /> {item.title}
                  </strong>
                  <small>{item.meta}</small>
                </span>
              </button>
              {idx < steps.length - 1 && (
                <ArrowRight size={14} className="pf-journey-bar__arrow" aria-hidden="true" />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
};
