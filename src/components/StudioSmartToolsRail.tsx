import React, { useMemo, useState } from 'react';
import {
  Briefcase,
  Camera,
  Compass,
  GraduationCap,
  Headphones,
  ImageDown,
  Mic,
  MonitorSmartphone,
  Radio,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
} from 'lucide-react';
import { WORLD_PILATES_BY_ID } from '../data/worldPilatesRepertoire1000';
import { usePilatesStore } from '../store/usePilatesStore';
import type { ApparatusType, PilatesExercise, SequenceStep } from '../types/pilates';
import { ensureWorldExercisesInStore } from '../utils/registerAllStudioAdapters';
import { ClientGoalSequenceTunerPanel } from './ClientGoalSequenceTunerPanel';
import { DailyCommuteBriefingPanel } from './DailyCommuteBriefingPanel';
import { DualScreenNfcPanel } from './DualScreenNfcPanel';
import { LessonModeSwitchPanel } from './LessonModeSwitchPanel';
import { LightDismissDialog } from './LightDismissDialog';
import { MemberFeedbackCardModal } from './MemberFeedbackCardModal';
import { MobilePoseCameraGuide } from './MobilePoseCameraGuide';
import { MovementMasteryStudioPanel } from './MovementMasteryStudioPanel';
import { SequenceAudioRehearsalModal } from './SequenceAudioRehearsalModal';
import { SequenceAutoPilotDrawer } from './SequenceAutoPilotDrawer';
import { SmartClassPrepCoachPanel } from './SmartClassPrepCoachPanel';
import { StudioPropAllocatorPanel } from './StudioPropAllocatorPanel';
import { TeachingVoiceCoachPanel } from './TeachingVoiceCoachPanel';
import '../styles/studio-smart-tools-rail.css';

type ActiveToolModalId =
  | null
  | 'smart-coach'
  | 'client-tuner'
  | 'daily-briefing'
  | 'feedback-card'
  | 'autopilot'
  | 'mastery'
  | 'rehearsal'
  | 'role-ops'
  | 'lesson-mode'
  | 'dual-nfc'
  | 'voice-coach'
  | 'pose-mirror';

export interface StudioSmartToolsRailProps {
  readonly onOpenMasteryModal?: () => void;
  readonly masteryButtonLabelKo?: string;
}

export const StudioSmartToolsRail: React.FC<StudioSmartToolsRailProps> = ({
  onOpenMasteryModal,
  masteryButtonLabelKo,
}) => {
  const activeTitle = usePilatesStore((s) => s.activeTitle);
  const activeTargetMinutes = usePilatesStore((s) => s.activeTargetMinutes);
  const activeLevel = usePilatesStore((s) => s.activeLevel);
  const activeApparatus = usePilatesStore((s) => s.activeApparatus);
  const activeSteps = usePilatesStore((s) => s.activeSteps);
  const exercises = usePilatesStore((s) => s.exercises);
  const reformerBrand = usePilatesStore((s) => s.reformerBrand);
  const classGroups = usePilatesStore((s) => s.classGroups);
  const historyLogs = usePilatesStore((s) => s.historyLogs);
  const activeTargetGroupId = usePilatesStore((s) => s.activeTargetGroupId);
  const activeSequenceId = usePilatesStore((s) => s.activeSequenceId);
  const ownedEquipment = usePilatesStore((s) => s.ownedEquipment);
  const ownedProps = usePilatesStore((s) => s.ownedProps);

  const [openModal, setOpenModal] = useState<ActiveToolModalId>(null);

  const combinedExercises = useMemo(() => {
    if (!openModal) return exercises;
    const seen = new Set(exercises.map((e) => e.id));
    const extras: PilatesExercise[] = [];
    for (const ex of WORLD_PILATES_BY_ID.values()) {
      if (!seen.has(ex.id)) extras.push(ex);
    }
    return [...exercises, ...extras];
  }, [exercises, openModal]);

  const exercisesById = useMemo(() => {
    const map = new Map<string, PilatesExercise>();
    if (!openModal) return map;
    for (const ex of WORLD_PILATES_BY_ID.values()) map.set(ex.id, ex);
    for (const ex of exercises) map.set(ex.id, ex);
    return map;
  }, [exercises, openModal]);

  const firstActiveStep = useMemo(
    () => activeSteps.find((step) => step.kind !== 'rest' && Boolean(step.exerciseId)),
    [activeSteps],
  );
  const secondActiveStep = useMemo(() => {
    if (!openModal) return undefined;
    const nonRest = activeSteps.filter((step) => step.kind !== 'rest' && Boolean(step.exerciseId));
    return nonRest[1];
  }, [activeSteps, openModal]);

  const focusExercise = useMemo(() => {
    if (!openModal) return null;
    if (!firstActiveStep) return exercises[0] ?? null;
    return exercisesById.get(firstActiveStep.exerciseId) ?? exercises[0] ?? null;
  }, [firstActiveStep, exercises, exercisesById, openModal]);

  const nextExercise = useMemo(() => {
    if (!openModal || !secondActiveStep) return null;
    return exercisesById.get(secondActiveStep.exerciseId) ?? null;
  }, [secondActiveStep, exercisesById, openModal]);

  const activeNonRestCount = useMemo(
    () => activeSteps.filter((step) => step.kind !== 'rest' && Boolean(step.exerciseId)).length,
    [activeSteps],
  );

  const resolvedApparatus: ApparatusType =
    activeApparatus === 'mixed' ? focusExercise?.apparatus ?? 'reformer' : activeApparatus;

  const registerMissing = (targetSteps: readonly SequenceStep[]) => {
    const missing: PilatesExercise[] = [];
    for (const step of targetSteps) {
      if (!step.exerciseId) continue;
      const world = WORLD_PILATES_BY_ID.get(step.exerciseId);
      if (world) missing.push(world);
    }
    if (missing.length > 0) ensureWorldExercisesInStore(missing);
  };

  const formatSpringDisplay = (raw?: string) => {
    const t = raw?.trim() || '';
    return !t || t === 'Bodyweight' ? '맨몸' : t;
  };

  const dualSnapshot = useMemo(
    () => ({
      sequenceTitle: activeTitle || '오늘의 필라테스 수업',
      stepIndex: 0,
      totalSteps: Math.max(1, activeSteps.length),
      exerciseId: focusExercise?.id ?? '',
      exerciseNameKo: focusExercise?.nameKo ?? '수업 준비 동작',
      apparatus: focusExercise?.apparatus ?? resolvedApparatus,
      springs: formatSpringDisplay(
        firstActiveStep?.customSpringOverride || focusExercise?.springs,
      ),
      nextExerciseNameKo: nextExercise?.nameKo ?? '마무리 호흡',
      nextSprings: formatSpringDisplay(
        secondActiveStep?.customSpringOverride || nextExercise?.springs,
      ),
      cueLine: focusExercise?.cues[0] ?? '편안한 호흡으로 척추 정렬을 준비합니다.',
      timerRemainingSec: Math.round((firstActiveStep?.durationMin ?? 4) * 60),
      running: false,
      phaseLabelKo: '수업 준비 중',
    }),
    [
      activeTitle,
      activeSteps.length,
      focusExercise,
      resolvedApparatus,
      firstActiveStep,
      nextExercise,
      secondActiveStep,
    ],
  );

  return (
    <>
      <nav
        className="pf-smart-tools-rail"
        aria-label="강사 스마트 도구 빠른 실행"
        data-testid="studio-smart-tools-rail"
      >
        <button
          type="button"
          className="pf-smart-tool-pill is-accent"
          data-testid="rail-btn-smart-coach"
          onClick={() => setOpenModal('smart-coach')}
        >
          <Compass size={15} strokeWidth={1.6} aria-hidden="true" />
          <span>스마트 추천 코치</span>
        </button>

        <button
          type="button"
          className="pf-smart-tool-pill"
          data-testid="rail-btn-client-tuner"
          onClick={() => setOpenModal('client-tuner')}
        >
          <ShieldCheck size={15} strokeWidth={1.6} aria-hidden="true" />
          <span>회원 맞춤 튜너</span>
        </button>

        <button
          type="button"
          className="pf-smart-tool-pill"
          data-testid="rail-btn-daily-briefing"
          onClick={() => setOpenModal('daily-briefing')}
        >
          <Radio size={15} strokeWidth={1.6} aria-hidden="true" />
          <span>출근길 수업 브리핑</span>
        </button>

        <button
          type="button"
          className="pf-smart-tool-pill"
          data-testid="rail-btn-feedback-card"
          onClick={() => setOpenModal('feedback-card')}
        >
          <ImageDown size={15} strokeWidth={1.6} aria-hidden="true" />
          <span>회원 피드백 카드</span>
        </button>

        <button
          type="button"
          className="pf-smart-tool-pill"
          data-testid="rail-btn-autopilot"
          onClick={() => setOpenModal('autopilot')}
        >
          <Sparkles size={15} strokeWidth={1.6} aria-hidden="true" />
          <span>중복 없는 자동 편성</span>
        </button>

        <button
          type="button"
          className="pf-smart-tool-pill"
          data-testid="rail-btn-mastery"
          onClick={() => (onOpenMasteryModal ? onOpenMasteryModal() : setOpenModal('mastery'))}
        >
          <GraduationCap size={15} strokeWidth={1.6} aria-hidden="true" />
          <span>{masteryButtonLabelKo ?? '동작 숙지 훈련'}</span>
        </button>

        <button
          type="button"
          className="pf-smart-tool-pill"
          data-testid="rail-btn-rehearsal"
          disabled={activeNonRestCount === 0}
          onClick={() => setOpenModal('rehearsal')}
        >
          <Headphones size={15} strokeWidth={1.6} aria-hidden="true" />
          <span>출근길 이어폰 암기</span>
        </button>

        <button
          type="button"
          className="pf-smart-tool-pill"
          data-testid="rail-btn-role-ops"
          onClick={() => setOpenModal('role-ops')}
        >
          <Briefcase size={15} strokeWidth={1.6} aria-hidden="true" />
          <span>프리랜서 · 교보재 · 경영</span>
        </button>

        <button
          type="button"
          className="pf-smart-tool-pill"
          data-testid="rail-btn-lesson-mode"
          onClick={() => setOpenModal('lesson-mode')}
        >
          <SlidersHorizontal size={15} strokeWidth={1.6} aria-hidden="true" />
          <span>1:1 · 6:1 레슨 맞춤</span>
        </button>

        <button
          type="button"
          className="pf-smart-tool-pill"
          data-testid="rail-btn-dual-nfc"
          onClick={() => setOpenModal('dual-nfc')}
        >
          <MonitorSmartphone size={15} strokeWidth={1.6} aria-hidden="true" />
          <span>듀얼 화면 · NFC</span>
        </button>

        <button
          type="button"
          className="pf-smart-tool-pill"
          data-testid="rail-btn-voice-coach"
          onClick={() => setOpenModal('voice-coach')}
        >
          <Mic size={15} strokeWidth={1.6} aria-hidden="true" />
          <span>티칭 습관 코치</span>
        </button>

        <button
          type="button"
          className="pf-smart-tool-pill"
          data-testid="rail-btn-pose-mirror"
          onClick={() => setOpenModal('pose-mirror')}
        >
          <Camera size={15} strokeWidth={1.6} aria-hidden="true" />
          <span>AI 정렬 거울</span>
        </button>
      </nav>

      {openModal === 'smart-coach' && (
        <LightDismissDialog
          open
          onClose={() => setOpenModal(null)}
          title="수업 분석 × 스마트 다음 동작 추천 코치"
          className="pf-smart-tool-dialog"
        >
          <SmartClassPrepCoachPanel
            activeSteps={activeSteps}
            historyLogs={historyLogs}
            exercises={combinedExercises}
            activeApparatus={activeApparatus}
            activeLevel={activeLevel}
            targetGroupId={activeTargetGroupId}
            ownedEquipment={ownedEquipment}
            ownedProps={ownedProps}
          />
        </LightDismissDialog>
      )}

      {openModal === 'client-tuner' && (
        <LightDismissDialog
          open
          onClose={() => setOpenModal(null)}
          title="회원 체형·컨디션 원탭 시퀀스 튜너"
          className="pf-smart-tool-dialog"
        >
          <ClientGoalSequenceTunerPanel
            steps={activeSteps}
            exercises={combinedExercises}
          />
        </LightDismissDialog>
      )}

      {openModal === 'daily-briefing' && (
        <LightDismissDialog
          open
          onClose={() => setOpenModal(null)}
          title="출근길 당일 수업 1분 연속 오디오 브리핑"
          className="pf-smart-tool-dialog"
        >
          <DailyCommuteBriefingPanel />
        </LightDismissDialog>
      )}

      {openModal === 'feedback-card' && (
        <MemberFeedbackCardModal
          open
          onClose={() => setOpenModal(null)}
          sequenceTitle={activeTitle || '오늘의 필라테스 수업'}
          steps={activeSteps}
          exercises={combinedExercises}
          exercisesById={exercisesById}
          apparatus={activeApparatus}
        />
      )}

      {openModal === 'autopilot' && (
        <SequenceAutoPilotDrawer
          open
          onClose={() => setOpenModal(null)}
          steps={activeSteps}
          exercises={combinedExercises}
          historyLogs={historyLogs}
          classGroups={classGroups}
          activeTitle={activeTitle}
          activeTargetGroupId={activeTargetGroupId}
          activeTargetMinutes={activeTargetMinutes}
          activeLevel={activeLevel}
          activeApparatus={activeApparatus}
          onApplySteps={(payload) => {
            registerMissing(payload.steps);
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

      {openModal === 'mastery' && (
        <LightDismissDialog
          open
          onClose={() => setOpenModal(null)}
          title="강사 동작 숙지 · 마스터 훈련소"
          className="pf-smart-tool-dialog"
        >
          <MovementMasteryStudioPanel
            exercises={combinedExercises}
            sequenceSteps={activeSteps}
            sequenceTitle={activeTitle || '오늘의 필라테스 수업'}
            initialExerciseId={focusExercise?.id}
          />
        </LightDismissDialog>
      )}

      {openModal === 'rehearsal' && (
        <SequenceAudioRehearsalModal
          open
          onClose={() => setOpenModal(null)}
          sequenceTitle={activeTitle || '수업 시퀀스'}
          steps={activeSteps}
          exercisesById={exercisesById}
        />
      )}

      {openModal === 'role-ops' && (
        <LightDismissDialog
          open
          onClose={() => setOpenModal(null)}
          title="프리랜서 · 1인 · 센터 운영 & 교보재 자동 배분"
          className="pf-smart-tool-dialog"
        >
          <StudioPropAllocatorPanel
            steps={activeSteps}
            exercises={combinedExercises}
            historyLogs={historyLogs}
            activeTitle={activeTitle || '오늘의 필라테스 수업'}
            activeApparatus={activeApparatus}
            onApplyAdaptedSequence={(payload) => {
              registerMissing(payload.steps);
              usePilatesStore.setState({
                activeSteps: payload.steps,
                ...(payload.apparatus ? { activeApparatus: payload.apparatus } : {}),
                saveFeedback: payload.reasonKo,
              });
            }}
          />
        </LightDismissDialog>
      )}

      {openModal === 'lesson-mode' && (
        <LightDismissDialog
          open
          onClose={() => setOpenModal(null)}
          title="1:1 개인 · 6:1 그룹 레슨 맞춤 & 회원 요약 카드"
          className="pf-smart-tool-dialog"
        >
          <LessonModeSwitchPanel
            steps={activeSteps}
            exercises={combinedExercises}
            sequenceTitle={activeTitle || '오늘의 필라테스 수업'}
            brand={reformerBrand}
            onApplyPrivateLayers={(nextSteps) => {
              registerMissing(nextSteps);
              usePilatesStore.setState({ activeSteps: nextSteps });
            }}
            onReplaceStepExercise={(stepId, nextExerciseId) => {
              const store = usePilatesStore.getState();
              const world = WORLD_PILATES_BY_ID.get(nextExerciseId);
              if (world) ensureWorldExercisesInStore([world]);
              const idx = store.activeSteps.findIndex((s) => s.stepId === stepId);
              if (idx >= 0) store.replaceStepExercise(idx, nextExerciseId);
            }}
            onOpenCameraGuide={() => setOpenModal('pose-mirror')}
          />
        </LightDismissDialog>
      )}

      {openModal === 'dual-nfc' && (
        <LightDismissDialog
          open
          onClose={() => setOpenModal(null)}
          title="폰 ↔ 큰 화면 듀얼 연동 & 기구 NFC · QR 태그"
          className="pf-smart-tool-dialog"
        >
          <DualScreenNfcPanel
            snapshot={dualSnapshot}
            activeApparatus={resolvedApparatus}
            activeSequenceId={activeSequenceId ?? undefined}
          />
        </LightDismissDialog>
      )}

      {openModal === 'voice-coach' && (
        <LightDismissDialog
          open
          onClose={() => setOpenModal(null)}
          title="온디바이스 강사 티칭 습관 AI 코치"
          className="pf-smart-tool-dialog"
        >
          <TeachingVoiceCoachPanel
            sequenceTitle={activeTitle || '오늘의 필라테스 수업'}
            currentExerciseNameKo={focusExercise?.nameKo}
          />
        </LightDismissDialog>
      )}

      {openModal === 'pose-mirror' && (
        <LightDismissDialog
          open
          onClose={() => setOpenModal(null)}
          title="AI 실시간 정렬 거울 & 좌우 균형 분석"
          className="pf-pose-camera-dialog"
        >
          <MobilePoseCameraGuide exercise={focusExercise} />
        </LightDismissDialog>
      )}
    </>
  );
};
