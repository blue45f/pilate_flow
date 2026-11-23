import React, { useMemo, useState } from 'react';
import { Briefcase, Camera, Headphones, SlidersHorizontal, Sparkles } from 'lucide-react';
import type { PilatesExercise, SequenceStep } from '../types/pilates';
import { WORLD_PILATES_BY_ID } from '../data/worldPilatesRepertoire1000';
import { usePilatesStore } from '../store/usePilatesStore';
import { LightDismissDialog } from './LightDismissDialog';
import { NaturalVoiceSpeakButton } from './NaturalVoiceSpeakButton';
import { SequenceAudioRehearsalModal } from './SequenceAudioRehearsalModal';
import { LessonModeSwitchPanel } from './LessonModeSwitchPanel';
import { MobilePoseCameraGuide } from './MobilePoseCameraGuide';
import { SequenceAutoPilotDrawer } from './SequenceAutoPilotDrawer';
import { StudioPropAllocatorPanel } from './StudioPropAllocatorPanel';

export interface VoiceSpeakSlotProps {
  readonly exercise: PilatesExercise;
  readonly compact?: boolean;
}

export const StudioVoiceSpeakSlotWidget: React.FC<VoiceSpeakSlotProps> = ({
  exercise,
  compact = false,
}) => (
  <NaturalVoiceSpeakButton
    exercise={exercise}
    variant={compact ? 'compact' : 'card'}
    labelKo={compact ? 'AI 음성' : 'AI 스튜디오 음성 듣기'}
    showProgressBar={!compact}
    showQualityBadge={!compact}
  />
);

export interface AudioRehearsalTriggerWidgetProps {
  readonly title: string;
  readonly steps: readonly SequenceStep[];
  readonly exercises: readonly PilatesExercise[];
  readonly compact?: boolean;
}

export const SequenceAudioRehearsalTriggerWidget: React.FC<AudioRehearsalTriggerWidgetProps> = ({
  title,
  steps,
  exercises,
  compact = false,
}) => {
  const [open, setOpen] = useState(false);

  const exercisesById = useMemo(() => {
    const map = new Map<string, PilatesExercise>();
    for (const ex of WORLD_PILATES_BY_ID.values()) {
      map.set(ex.id, ex);
    }
    for (const ex of exercises) {
      map.set(ex.id, ex);
    }
    return map;
  }, [exercises]);

  const activeCount = useMemo(
    () => steps.filter((step) => step.kind !== 'rest' && Boolean(step.exerciseId)).length,
    [steps],
  );

  return (
    <>
      <button
        type="button"
        className={compact ? 'pf-mobile-bar-btn' : 'flow-text-button pf-audio-rehearsal-trigger'}
        data-testid={
          compact ? 'mobile-audio-rehearsal-trigger' : 'workbench-audio-rehearsal-trigger'
        }
        disabled={activeCount === 0}
        onClick={() => setOpen(true)}
        aria-label="시퀀스 음성 암기 리허설 열기"
      >
        <Headphones size={15} strokeWidth={1.6} aria-hidden="true" />
        <span>{compact ? '암기' : '이어폰 암기 · 리허설'}</span>
      </button>
      {open && (
        <SequenceAudioRehearsalModal
          open={open}
          onClose={() => setOpen(false)}
          sequenceTitle={title || '수업 시퀀스'}
          steps={steps}
          exercisesById={exercisesById}
        />
      )}
    </>
  );
};

export interface LessonModeSlotWidgetProps {
  readonly steps: readonly SequenceStep[];
  readonly exercises: readonly PilatesExercise[];
}

export const WorkbenchLessonAndAutoSlotWidget: React.FC<LessonModeSlotWidgetProps> = ({
  steps,
  exercises,
}) => {
  const activeTitle = usePilatesStore((s) => s.activeTitle);
  const activeTargetMinutes = usePilatesStore((s) => s.activeTargetMinutes);
  const activeLevel = usePilatesStore((s) => s.activeLevel);
  const activeApparatus = usePilatesStore((s) => s.activeApparatus);
  const reformerBrand = usePilatesStore((s) => s.reformerBrand);
  const classGroups = usePilatesStore((s) => s.classGroups);
  const historyLogs = usePilatesStore((s) => s.historyLogs);
  const activeTargetGroupId = usePilatesStore((s) => s.activeTargetGroupId);

  const [autoPilotOpen, setAutoPilotOpen] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);

  const combinedExercises = useMemo(() => {
    const seen = new Set(exercises.map((e) => e.id));
    const extras: PilatesExercise[] = [];
    for (const ex of WORLD_PILATES_BY_ID.values()) {
      if (!seen.has(ex.id)) extras.push(ex);
    }
    return [...exercises, ...extras];
  }, [exercises]);

  const currentFocusExercise = useMemo(() => {
    const firstValid = steps.find((step) => step.kind !== 'rest' && Boolean(step.exerciseId));
    if (!firstValid) return exercises[0] ?? null;
    return (
      exercises.find((e) => e.id === firstValid.exerciseId) ??
      WORLD_PILATES_BY_ID.get(firstValid.exerciseId) ??
      null
    );
  }, [steps, exercises]);

  const registerMissingExercises = (targetSteps: readonly SequenceStep[]) => {
    const store = usePilatesStore.getState();
    const existingIds = new Set(store.exercises.map((e) => e.id));
    const toAdd: PilatesExercise[] = [];
    for (const step of targetSteps) {
      if (!step.exerciseId || existingIds.has(step.exerciseId)) continue;
      const world = WORLD_PILATES_BY_ID.get(step.exerciseId);
      if (world) {
        toAdd.push(structuredClone(world));
        existingIds.add(world.id);
      }
    }
    if (toAdd.length > 0) {
      usePilatesStore.setState((prev) => ({
        exercises: [...prev.exercises, ...toAdd],
      }));
    }
  };

  return (
    <div
      className="pf-integrated-workbench-tools"
      data-testid="integrated-workbench-tools"
      style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '8px' }}
    >
      <div
        className="pf-quick-studio-toolbar"
        style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}
      >
        <button
          type="button"
          className="flow-text-button"
          data-testid="open-autopilot-drawer-btn"
          onClick={() => setAutoPilotOpen(true)}
        >
          <Sparkles size={15} strokeWidth={1.6} aria-hidden="true" />
          <span>겹침 없애기 · 자동 편성</span>
        </button>
        <button
          type="button"
          className="flow-text-button"
          data-testid="open-pose-camera-guide-btn"
          onClick={() => setCameraOpen(true)}
        >
          <Camera size={15} strokeWidth={1.6} aria-hidden="true" />
          <span>정렬 거울</span>
        </button>
      </div>

      <details className="pf-collapsible-lesson-mode" data-testid="lesson-mode-disclosure">
        <summary
          style={{
            minHeight: '44px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            cursor: 'pointer',
            fontWeight: 500,
            fontSize: '0.88rem',
            color: '#1f4435',
            padding: '8px 12px',
            borderRadius: '10px',
            background: '#faf8f4',
            border: '1px solid rgba(31, 27, 22, 0.08)',
          }}
        >
          <SlidersHorizontal size={15} strokeWidth={1.6} aria-hidden="true" />
          <span>1:1 개인 · 6:1 그룹 레슨 맞춤 &amp; 회원 소통 카드</span>
        </summary>
        <div style={{ marginTop: '8px' }}>
          <LessonModeSwitchPanel
            steps={steps}
            exercises={combinedExercises}
            sequenceTitle={activeTitle || '오늘의 필라테스 수업'}
            brand={reformerBrand}
            onApplyPrivateLayers={(nextSteps) => {
              registerMissingExercises(nextSteps);
              usePilatesStore.setState({ activeSteps: nextSteps });
            }}
            onReplaceStepExercise={(stepId, nextExerciseId) => {
              const store = usePilatesStore.getState();
              if (!store.exercises.some((e) => e.id === nextExerciseId)) {
                const world = WORLD_PILATES_BY_ID.get(nextExerciseId);
                if (world) {
                  usePilatesStore.setState((prev) => ({
                    exercises: [...prev.exercises, structuredClone(world)],
                  }));
                }
              }
              const idx = store.activeSteps.findIndex((s) => s.stepId === stepId);
              if (idx >= 0) {
                store.replaceStepExercise(idx, nextExerciseId);
              }
            }}
            onOpenCameraGuide={() => setCameraOpen(true)}
          />
        </div>
      </details>

      <details className="pf-collapsible-lesson-mode" data-testid="studio-role-allocator-disclosure">
        <summary
          style={{
            minHeight: '44px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            cursor: 'pointer',
            fontWeight: 500,
            fontSize: '0.88rem',
            color: '#1f4435',
            padding: '8px 12px',
            borderRadius: '10px',
            background: '#faf8f4',
            border: '1px solid rgba(31, 27, 22, 0.08)',
          }}
        >
          <Briefcase size={15} strokeWidth={1.6} aria-hidden="true" />
          <span>프리랜서 · 1인 · 센터 운영 모드 &amp; 교보재 자동 배분</span>
        </summary>
        <div style={{ marginTop: '8px' }}>
          <StudioPropAllocatorPanel
            steps={steps}
            exercises={combinedExercises}
            historyLogs={historyLogs}
            activeTitle={activeTitle || '오늘의 필라테스 수업'}
            activeApparatus={activeApparatus}
            onApplyAdaptedSequence={(payload) => {
              registerMissingExercises(payload.steps);
              usePilatesStore.setState({
                activeSteps: payload.steps,
                ...(payload.apparatus ? { activeApparatus: payload.apparatus } : {}),
                saveFeedback: payload.reasonKo,
              });
            }}
          />
        </div>
      </details>

      {autoPilotOpen && (
        <SequenceAutoPilotDrawer
          open={autoPilotOpen}
          onClose={() => setAutoPilotOpen(false)}
          steps={steps}
          exercises={combinedExercises}
          historyLogs={historyLogs}
          classGroups={classGroups}
          activeTitle={activeTitle}
          activeTargetGroupId={activeTargetGroupId}
          activeTargetMinutes={activeTargetMinutes}
          activeLevel={activeLevel}
          activeApparatus={activeApparatus}
          onApplySteps={(payload) => {
            registerMissingExercises(payload.steps);
            usePilatesStore.setState({
              activeSteps: payload.steps,
              ...(payload.title ? { activeTitle: payload.title } : {}),
              ...(payload.subtitle ? { activeSubtitle: payload.subtitle } : {}),
              ...(payload.targetMinutes ? { activeTargetMinutes: payload.targetMinutes } : {}),
              ...(payload.level ? { activeLevel: payload.level } : {}),
              ...(payload.apparatus ? { activeApparatus: payload.apparatus } : {}),
              ...(payload.targetGroupId ? { activeTargetGroupId: payload.targetGroupId } : {}),
            });
          }}
        />
      )}

      {cameraOpen && (
        <LightDismissDialog
          open={cameraOpen}
          onClose={() => setCameraOpen(false)}
          title="온디바이스 실시간 정렬 거울"
          className="pf-pose-camera-dialog"
        >
          <MobilePoseCameraGuide exercise={currentFocusExercise} />
        </LightDismissDialog>
      )}
    </div>
  );
};
