import { useEffect, useMemo, useState } from 'react';
import {
  BookOpen,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  HelpCircle,
  Mic,
  Pause,
  Play,
  RotateCcw,
  Sparkles,
  Target,
  Wind,
} from 'lucide-react';
import type { VisualPhaseId } from '../data/movementVisualRigCatalog';
import { APPARATUS_LABELS } from '../data/pilatesCatalog';
import type { ApparatusType, PilatesExercise, SequenceStep } from '../types/pilates';
import {
  ALL_APPARATUS_ORDER,
  buildMovementStudyCard,
  computeMasterySummary,
  extractSequenceExerciseIds,
  formatNextReviewLabelKo,
  generateMovementQuiz,
  getStudyQueueReasonKo,
  loadMovementMasteryRecords,
  MASTERY_STATUS_META,
  recordMasteryOutcome,
  saveMovementMasteryRecords,
  selectDailyStudyQueue,
  type MasteryRating,
  type MovementMasteryRecord,
} from '../utils/movementMasteryEngine';
import { formatKoreanParticle } from '../utils/naturalVoiceScriptBuilder';
import type { AnatomyVisualZone } from '../utils/studioTrackSlots';
import { ExerciseMotionArtwork } from './ExerciseMotionArtwork';
import { NaturalVoiceSpeakButton } from './NaturalVoiceSpeakButton';
import { SpringVisualPills } from './SpringVisualPills';
import '../styles/movement-mastery.css';

export interface MovementMasteryStudioPanelProps {
  readonly exercises: readonly PilatesExercise[];
  readonly sequenceSteps?: readonly SequenceStep[];
  readonly sequenceTitle?: string;
  readonly initialExerciseId?: string;
}

type MasteryTabId = 'study' | 'quiz' | 'cueing';
type StudyDeckId = 'sequence' | 'daily' | 'all';
type CueScriptFilter = 'all' | 'easy' | 'standard' | 'challenge';

interface BlindMasks {
  readonly spring: boolean;
  readonly breath: boolean;
  readonly cues: boolean;
}

interface RevealScope {
  readonly exerciseId: string;
  readonly spring: boolean;
  readonly breath: boolean;
  readonly cues: boolean;
}

const PHASE_OPTIONS: ReadonlyArray<{ readonly id: VisualPhaseId; readonly labelKo: string }> = [
  { id: 'start', labelKo: '시작' },
  { id: 'middle', labelKo: '정점' },
  { id: 'end', labelKo: '종료' },
];

const REHEARSAL_TOTAL_SEC = 30;

function AnatomyFallbackSvg({ zone }: { readonly zone: AnatomyVisualZone }) {
  const focusByZone: Record<
    AnatomyVisualZone,
    { readonly cx: number; readonly cy: number; readonly rx: number; readonly ry: number }
  > = {
    core: { cx: 80, cy: 52, rx: 16, ry: 18 },
    glutes: { cx: 80, cy: 68, rx: 18, ry: 12 },
    spine: { cx: 80, cy: 48, rx: 9, ry: 22 },
    shoulder: { cx: 80, cy: 32, rx: 24, ry: 10 },
    lateral: { cx: 92, cy: 52, rx: 9, ry: 17 },
    hip: { cx: 80, cy: 64, rx: 19, ry: 11 },
  };
  const focus = focusByZone[zone];

  return (
    <svg
      viewBox="0 0 160 100"
      className="pf-mastery-anatomy-svg"
      role="img"
      aria-label="활성 근육 부위 도식"
    >
      <rect width="160" height="100" rx="8" fill="#F3F5EE" />
      <line
        x1="80"
        y1="10"
        x2="80"
        y2="90"
        stroke="rgba(53, 84, 65, 0.16)"
        strokeWidth="1"
        strokeDasharray="3 3"
      />
      <circle cx="80" cy="17" r="7" fill="rgba(31, 27, 22, 0.14)" />
      <path
        d="M60 30 C60 25 100 25 100 30 L95 66 L91 92 L83 92 L80 71 L77 92 L69 92 L65 66 Z"
        fill="rgba(31, 27, 22, 0.08)"
        stroke="rgba(31, 27, 22, 0.2)"
        strokeWidth="1.2"
      />
      <ellipse cx={focus.cx} cy={focus.cy} rx={focus.rx} ry={focus.ry} fill="rgba(53, 84, 65, 0.34)" />
      <ellipse
        cx={focus.cx}
        cy={focus.cy}
        rx={Math.max(4, focus.rx * 0.5)}
        ry={Math.max(4, focus.ry * 0.5)}
        fill="#355441"
      />
    </svg>
  );
}

function AnatomyImageFrame({
  zone,
  webpSrc,
  pngSrc,
  alt,
}: {
  readonly zone: AnatomyVisualZone;
  readonly webpSrc: string;
  readonly pngSrc: string;
  readonly alt: string;
}) {
  const [stage, setStage] = useState<'webp' | 'png' | 'svg'>('webp');

  if (stage === 'svg') {
    return <AnatomyFallbackSvg zone={zone} />;
  }

  return (
    <img
      src={stage === 'webp' ? webpSrc : pngSrc}
      alt={alt}
      loading="lazy"
      decoding="async"
      className="pf-mastery-anatomy-img"
      onError={() => setStage((prev) => (prev === 'webp' ? 'png' : 'svg'))}
    />
  );
}

export function MovementMasteryStudioPanel({
  exercises,
  sequenceSteps,
  sequenceTitle,
  initialExerciseId,
}: MovementMasteryStudioPanelProps) {
  const [records, setRecords] = useState<Record<string, MovementMasteryRecord>>(() =>
    loadMovementMasteryRecords(),
  );

  const sequenceExerciseIds = useMemo(
    () => extractSequenceExerciseIds(sequenceSteps),
    [sequenceSteps],
  );
  const sequenceIdSet = useMemo(() => new Set(sequenceExerciseIds), [sequenceExerciseIds]);

  const exercisesById = useMemo(() => {
    const map = new Map<string, PilatesExercise>();
    for (const ex of exercises) {
      if (!map.has(ex.id)) {
        map.set(ex.id, ex);
      }
    }
    return map;
  }, [exercises]);

  const sequenceExercises = useMemo(
    () =>
      sequenceExerciseIds
        .map((id) => exercisesById.get(id))
        .filter((item): item is PilatesExercise => Boolean(item)),
    [sequenceExerciseIds, exercisesById],
  );

  const initialDeck: StudyDeckId =
    initialExerciseId && !sequenceIdSet.has(initialExerciseId)
      ? 'all'
      : sequenceExercises.length > 0
        ? 'sequence'
        : 'daily';

  const [activeTab, setActiveTab] = useState<MasteryTabId>('study');
  const [deckMode, setDeckMode] = useState<StudyDeckId>(initialDeck);
  const [apparatusFilter, setApparatusFilter] = useState<ApparatusType | 'all'>('all');
  const [selectedExerciseId, setSelectedExerciseId] = useState<string>(
    initialExerciseId ?? sequenceExercises[0]?.id ?? exercises[0]?.id ?? '',
  );
  const [artworkPhase, setArtworkPhase] = useState<VisualPhaseId>('middle');

  const [blindMasks, setBlindMasks] = useState<BlindMasks>({
    spring: false,
    breath: false,
    cues: false,
  });
  const [revealScope, setRevealScope] = useState<RevealScope>({
    exerciseId: '',
    spring: false,
    breath: false,
    cues: false,
  });

  const [lastFeedback, setLastFeedback] = useState<{
    readonly exerciseId: string;
    readonly messageKo: string;
  } | null>(null);

  const [quizAnswersByExercise, setQuizAnswersByExercise] = useState<
    Record<string, Record<string, number>>
  >({});

  const [scriptFilter, setScriptFilter] = useState<CueScriptFilter>('all');
  const [isCadenceRunning, setIsCadenceRunning] = useState(false);
  const [cadenceElapsedSec, setCadenceElapsedSec] = useState(0);

  const isCadenceActive = isCadenceRunning && cadenceElapsedSec < REHEARSAL_TOTAL_SEC;

  useEffect(() => {
    if (!isCadenceActive) return undefined;
    const timerId = window.setInterval(() => {
      setCadenceElapsedSec((prev) => {
        const next = prev + 1;
        if (next >= REHEARSAL_TOTAL_SEC) {
          setIsCadenceRunning(false);
          return REHEARSAL_TOTAL_SEC;
        }
        return next;
      });
    }, 1000);
    return () => {
      window.clearInterval(timerId);
    };
  }, [isCadenceActive]);

  const dailyQueue = useMemo(
    () =>
      selectDailyStudyQueue(exercises, records, {
        prioritizeExerciseIds: sequenceExerciseIds,
        apparatus: 'all',
        limit: 8,
      }),
    [exercises, records, sequenceExerciseIds],
  );

  const deckExercises = useMemo<readonly PilatesExercise[]>(() => {
    if (deckMode === 'sequence') {
      return sequenceExercises.length > 0 ? sequenceExercises : dailyQueue;
    }
    if (deckMode === 'daily') {
      return dailyQueue;
    }
    if (apparatusFilter === 'all') {
      return exercises;
    }
    return exercises.filter((ex) => ex.apparatus === apparatusFilter);
  }, [deckMode, sequenceExercises, dailyQueue, exercises, apparatusFilter]);

  const activeExercise = useMemo(() => {
    if (deckExercises.length === 0) return exercises[0] ?? null;
    return deckExercises.find((ex) => ex.id === selectedExerciseId) ?? deckExercises[0];
  }, [deckExercises, selectedExerciseId, exercises]);

  const activeIndex = useMemo(() => {
    if (!activeExercise) return 0;
    const found = deckExercises.findIndex((ex) => ex.id === activeExercise.id);
    return found >= 0 ? found : 0;
  }, [deckExercises, activeExercise]);

  const summary = useMemo(
    () => computeMasterySummary(exercises, records),
    [exercises, records],
  );

  const studyCard = useMemo(
    () => (activeExercise ? buildMovementStudyCard(activeExercise) : null),
    [activeExercise],
  );

  const quizQuestions = useMemo(
    () => (activeExercise ? generateMovementQuiz(activeExercise, exercises) : []),
    [activeExercise, exercises],
  );

  const matchedSequenceStep = useMemo(() => {
    if (!activeExercise || !sequenceSteps) return undefined;
    return sequenceSteps.find((step) => step.exerciseId === activeExercise.id);
  }, [activeExercise, sequenceSteps]);

  if (!activeExercise || !studyCard) {
    return (
      <section
        className="pf-mastery-panel"
        data-testid="movement-mastery-studio-panel"
        aria-label="강사 동작 숙지 훈련소"
      >
        <div className="pf-mastery-empty">
          학습할 동작 카탈로그가 아직 비어 있어요. 동작을 불러온 뒤 다시 훈련을 시작해 주세요.
        </div>
      </section>
    );
  }

  const activeRecord = records[activeExercise.id];
  const activeStatus = activeRecord?.status ?? 'unseen';
  const activeStatusMeta = MASTERY_STATUS_META[activeStatus];
  const queueReasonKo = getStudyQueueReasonKo(activeExercise.id, records, sequenceIdSet);

  const isRevealedForCurrent = (section: keyof BlindMasks): boolean => {
    if (!blindMasks[section]) return true;
    return revealScope.exerciseId === activeExercise.id && revealScope[section];
  };

  const handleToggleBlindMask = (section: keyof BlindMasks) => {
    setBlindMasks((prev) => {
      const nextMasked = !prev[section];
      if (nextMasked) {
        setRevealScope((scope) =>
          scope.exerciseId === activeExercise.id
            ? { ...scope, [section]: false }
            : { exerciseId: activeExercise.id, spring: false, breath: false, cues: false },
        );
      }
      return { ...prev, [section]: nextMasked };
    });
  };

  const allBlindEnabled = blindMasks.spring && blindMasks.breath && blindMasks.cues;

  const handleToggleAllBlind = () => {
    const nextValue = !allBlindEnabled;
    setBlindMasks({ spring: nextValue, breath: nextValue, cues: nextValue });
    setRevealScope({
      exerciseId: activeExercise.id,
      spring: false,
      breath: false,
      cues: false,
    });
  };

  const handleRevealSection = (section: keyof BlindMasks) => {
    setRevealScope((prev) => ({
      exerciseId: activeExercise.id,
      spring: prev.exerciseId === activeExercise.id ? prev.spring : false,
      breath: prev.exerciseId === activeExercise.id ? prev.breath : false,
      cues: prev.exerciseId === activeExercise.id ? prev.cues : false,
      [section]: true,
    }));
  };

  const handleSelectExercise = (exerciseId: string) => {
    setSelectedExerciseId(exerciseId);
    setArtworkPhase('middle');
  };

  const handleStepDeck = (delta: -1 | 1) => {
    if (deckExercises.length <= 1) return;
    const nextIdx = (activeIndex + delta + deckExercises.length) % deckExercises.length;
    const nextEx = deckExercises[nextIdx];
    if (nextEx) {
      handleSelectExercise(nextEx.id);
    }
  };

  const handleDeckSwitch = (nextDeck: StudyDeckId) => {
    setDeckMode(nextDeck);
    if (nextDeck === 'sequence' && sequenceExercises[0]) {
      handleSelectExercise(sequenceExercises[0].id);
    } else if (nextDeck === 'daily' && dailyQueue[0]) {
      handleSelectExercise(dailyQueue[0].id);
    } else if (nextDeck === 'all' && exercises[0]) {
      const pool =
        apparatusFilter === 'all'
          ? exercises
          : exercises.filter((ex) => ex.apparatus === apparatusFilter);
      if (pool[0]) {
        handleSelectExercise(pool[0].id);
      }
    }
  };

  const handleApparatusFilter = (nextApparatus: ApparatusType | 'all') => {
    setApparatusFilter(nextApparatus);
    const pool =
      nextApparatus === 'all'
        ? exercises
        : exercises.filter((ex) => ex.apparatus === nextApparatus);
    if (pool[0]) {
      handleSelectExercise(pool[0].id);
    }
  };

  const handleRateMastery = (rating: MasteryRating) => {
    const nextRecords = recordMasteryOutcome(records, activeExercise.id, rating);
    setRecords(nextRecords);
    saveMovementMasteryRecords(nextRecords);

    const updated = nextRecords[activeExercise.id];
    const nextReviewLabel = formatNextReviewLabelKo(updated);
    const statusLabel = MASTERY_STATUS_META[updated.status].labelKo;
    const statusWithParticle = formatKoreanParticle(statusLabel, '으로/로');
    setLastFeedback({
      exerciseId: activeExercise.id,
      messageKo: `「${activeExercise.nameKo}」 상태를 ${statusWithParticle} 기록했어요 · ${nextReviewLabel}`,
    });
  };

  const currentQuizAnswers = quizAnswersByExercise[activeExercise.id] ?? {};
  const answeredCount = quizQuestions.filter(
    (q) => currentQuizAnswers[q.id] !== undefined,
  ).length;
  const correctCount = quizQuestions.filter(
    (q) => currentQuizAnswers[q.id] === q.correctIndex,
  ).length;
  const isQuizComplete = quizQuestions.length > 0 && answeredCount === quizQuestions.length;

  const handleSelectQuizOption = (questionId: string, optionIndex: number) => {
    setQuizAnswersByExercise((prev) => {
      const existing = prev[activeExercise.id] ?? {};
      if (existing[questionId] !== undefined) return prev;
      return {
        ...prev,
        [activeExercise.id]: {
          ...existing,
          [questionId]: optionIndex,
        },
      };
    });
  };

  const handleResetQuiz = () => {
    setQuizAnswersByExercise((prev) => ({
      ...prev,
      [activeExercise.id]: {},
    }));
  };

  const handleApplyQuizOutcome = () => {
    const recommendedRating: MasteryRating =
      correctCount === quizQuestions.length
        ? 'mastered'
        : correctCount >= 2
          ? 'good'
          : 'again';
    handleRateMastery(recommendedRating);
  };

  const handleDrillApparatus = (apparatus: ApparatusType) => {
    setDeckMode('all');
    setApparatusFilter(apparatus);
    const firstMatch = exercises.find((ex) => ex.apparatus === apparatus);
    if (firstMatch) {
      handleSelectExercise(firstMatch.id);
    }
    setActiveTab('study');
  };

  const handleToggleCadence = () => {
    if (cadenceElapsedSec >= REHEARSAL_TOTAL_SEC) {
      setCadenceElapsedSec(0);
      setIsCadenceRunning(true);
      return;
    }
    setIsCadenceRunning((prev) => !prev);
  };

  const handleResetCadence = () => {
    setIsCadenceRunning(false);
    setCadenceElapsedSec(0);
  };

  const cyclePos = cadenceElapsedSec % 8;
  const isInhalePhase = cyclePos < 4;
  const activeBeat = (cyclePos % 4) + 1;
  const remainingSec = Math.max(0, REHEARSAL_TOTAL_SEC - cadenceElapsedSec);

  const allScriptEntries: ReadonlyArray<{
    readonly key: 'easy' | 'standard' | 'challenge';
    readonly titleKo: string;
    readonly textKo: string;
  }> = [
    {
      key: 'easy',
      titleKo: '입문 · 부담 덜어주기 대본',
      textKo: studyCard.cueScriptByLevel.easy,
    },
    {
      key: 'standard',
      titleKo: '표준 · 50분 본수업 기본 대본',
      textKo: studyCard.cueScriptByLevel.standard,
    },
    {
      key: 'challenge',
      titleKo: '심화 · 정교한 도전 대본',
      textKo: studyCard.cueScriptByLevel.challenge,
    },
  ];
  const visibleScriptEntries = allScriptEntries.filter(
    (item) => scriptFilter === 'all' || scriptFilter === item.key,
  );

  return (
    <section
      className="pf-mastery-panel"
      data-testid="movement-mastery-studio-panel"
      aria-label="강사 동작 숙지 훈련소"
    >
      {/* Header & Summary */}
      <header className="pf-mastery-header">
        <div className="pf-mastery-header__top">
          <div className="pf-mastery-header__titles">
            <h2 className="pf-mastery-title">강사 동작 숙지 훈련소</h2>
            <p className="pf-mastery-subtitle">
              {sequenceTitle && sequenceExercises.length > 0
                ? `「${sequenceTitle}」 동작부터 하루 5분 능동 회상·퀴즈·입으로 큐잉으로 익혀요`
                : '블라인드 능동 회상·실전 퀴즈·30초 구어체 큐잉으로 수업 전 동작을 손에 익혀요'}
            </p>
          </div>
          <div className="pf-mastery-kpi-strip" data-testid="mastery-summary-strip">
            <span className="pf-mastery-kpi-pill">
              전체 숙지율 <strong>{summary.progressPct}%</strong>
            </span>
            <span className="pf-mastery-kpi-pill">
              마스터 <strong>{summary.masteredCount}</strong>
            </span>
            <span className="pf-mastery-kpi-pill">
              수업 가능 <strong>{summary.readyCount}</strong>
            </span>
            <span className="pf-mastery-kpi-pill">
              복습 대기 <strong>{summary.dueCount}</strong>
            </span>
          </div>
        </div>

        {/* 3 Mode Tabs */}
        <div
          className="pf-mastery-tabs"
          role="tablist"
          aria-label="동작 숙지 학습 모드"
        >
          <button
            type="button"
            role="tab"
            id="pf-mastery-tab-study"
            aria-selected={activeTab === 'study'}
            aria-controls="pf-mastery-panel-study"
            className={`pf-mastery-tab ${activeTab === 'study' ? 'is-active' : ''}`}
            data-testid="mastery-tab-study"
            onClick={() => setActiveTab('study')}
          >
            <BookOpen size={16} strokeWidth={1.6} aria-hidden="true" />
            <span>집중 숙지 카드</span>
          </button>

          <button
            type="button"
            role="tab"
            id="pf-mastery-tab-quiz"
            aria-selected={activeTab === 'quiz'}
            aria-controls="pf-mastery-panel-quiz"
            className={`pf-mastery-tab ${activeTab === 'quiz' ? 'is-active' : ''}`}
            data-testid="mastery-tab-quiz"
            onClick={() => setActiveTab('quiz')}
          >
            <HelpCircle size={16} strokeWidth={1.6} aria-hidden="true" />
            <span>실전 수업 퀴즈</span>
          </button>

          <button
            type="button"
            role="tab"
            id="pf-mastery-tab-cueing"
            aria-selected={activeTab === 'cueing'}
            aria-controls="pf-mastery-panel-cueing"
            className={`pf-mastery-tab ${activeTab === 'cueing' ? 'is-active' : ''}`}
            data-testid="mastery-tab-cueing"
            onClick={() => setActiveTab('cueing')}
          >
            <Mic size={16} strokeWidth={1.6} aria-hidden="true" />
            <span>30초 입으로 큐잉 + 진도표</span>
          </button>
        </div>
      </header>

      {/* Deck Selector & Exercise Navigator */}
      <div className="pf-mastery-deck-bar" data-testid="mastery-deck-bar">
        <div className="pf-mastery-deck-controls">
          <div className="pf-mastery-chip-group" role="group" aria-label="학습 덱 선택">
            <button
              type="button"
              className={`pf-mastery-chip-btn ${deckMode === 'sequence' ? 'is-active' : ''}`}
              aria-pressed={deckMode === 'sequence'}
              disabled={sequenceExercises.length === 0}
              data-testid="mastery-deck-sequence"
              onClick={() => handleDeckSwitch('sequence')}
            >
              <span>내 수업 동작 집중</span>
              <span>({sequenceExercises.length})</span>
            </button>

            <button
              type="button"
              className={`pf-mastery-chip-btn ${deckMode === 'daily' ? 'is-active' : ''}`}
              aria-pressed={deckMode === 'daily'}
              data-testid="mastery-deck-daily"
              onClick={() => handleDeckSwitch('daily')}
            >
              <span>오늘 5분 추천</span>
              <span>({dailyQueue.length})</span>
            </button>

            <button
              type="button"
              className={`pf-mastery-chip-btn ${deckMode === 'all' ? 'is-active' : ''}`}
              aria-pressed={deckMode === 'all'}
              data-testid="mastery-deck-all"
              onClick={() => handleDeckSwitch('all')}
            >
              <span>전체 기구</span>
              <span>({exercises.length})</span>
            </button>
          </div>

          <div className="pf-mastery-stepper" aria-label="현재 덱 이동">
            <button
              type="button"
              className="pf-mastery-btn"
              onClick={() => handleStepDeck(-1)}
              disabled={deckExercises.length <= 1}
              aria-label="이전 동작"
              data-testid="mastery-prev-btn"
            >
              <ChevronLeft size={16} aria-hidden="true" />
              <span>이전</span>
            </button>
            <span className="pf-mastery-stepper-count" data-testid="mastery-deck-position">
              {activeIndex + 1} / {deckExercises.length}
            </span>
            <button
              type="button"
              className="pf-mastery-btn"
              onClick={() => handleStepDeck(1)}
              disabled={deckExercises.length <= 1}
              aria-label="다음 동작"
              data-testid="mastery-next-btn"
            >
              <span>다음</span>
              <ChevronRight size={16} aria-hidden="true" />
            </button>
          </div>
        </div>

        {deckMode === 'all' && (
          <div className="pf-mastery-chip-group" role="group" aria-label="기구별 필터">
            <button
              type="button"
              className={`pf-mastery-chip-btn ${apparatusFilter === 'all' ? 'is-active' : ''}`}
              aria-pressed={apparatusFilter === 'all'}
              onClick={() => handleApparatusFilter('all')}
            >
              전체
            </button>
            {ALL_APPARATUS_ORDER.map((app) => (
              <button
                key={app}
                type="button"
                className={`pf-mastery-chip-btn ${apparatusFilter === app ? 'is-active' : ''}`}
                aria-pressed={apparatusFilter === app}
                data-testid={`mastery-filter-${app}`}
                onClick={() => handleApparatusFilter(app)}
              >
                {APPARATUS_LABELS[app].short}
              </button>
            ))}
          </div>
        )}

        <div className="pf-mastery-deck-rail" role="list" aria-label="현재 덱 동작 목록">
          {deckExercises.slice(0, 14).map((ex) => {
            const st = records[ex.id]?.status ?? 'unseen';
            const selected = ex.id === activeExercise.id;
            return (
              <button
                key={ex.id}
                type="button"
                role="listitem"
                className={`pf-mastery-deck-item ${selected ? 'is-active' : ''}`}
                aria-current={selected ? 'true' : undefined}
                onClick={() => handleSelectExercise(ex.id)}
              >
                <span className={`pf-mastery-status-dot is-${st}`} aria-hidden="true" />
                <span className="pf-mastery-deck-item__label">{ex.nameKo}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Shared Active Exercise Identity & Voice Slot */}
      <div className="pf-mastery-exercise-head">
        <div className="pf-mastery-exercise-info">
          <div className="pf-mastery-badge-row">
            <span className="pf-mastery-tag">{studyCard.apparatusLabelKo}</span>
            <span className="pf-mastery-tag">{studyCard.positionLabelKo}</span>
            <span className={`pf-difficulty-badge is-${studyCard.difficultyTone}`}>
              {studyCard.difficultyLabelKo}
            </span>
            <span
              className={`pf-mastery-tag pf-mastery-tag--status-${activeStatus}`}
              data-testid="mastery-active-status-badge"
            >
              {activeStatusMeta.labelKo}
            </span>
            <span className="pf-mastery-tag pf-mastery-tag--reason">{queueReasonKo}</span>
          </div>
          <h3 className="pf-mastery-exercise-name" data-testid="mastery-active-exercise-name">
            {studyCard.nameKo}
          </h3>
          <p className="pf-mastery-exercise-en">{studyCard.nameEn}</p>
        </div>

        <div className="pf-mastery-voice-slot">
          <NaturalVoiceSpeakButton
            exercise={activeExercise}
            step={matchedSequenceStep}
            variant="compact"
            labelKo="음성으로 듣기"
          />
          <span className="pf-mastery-review-meta" data-testid="mastery-review-schedule">
            {formatNextReviewLabelKo(activeRecord)}
            {activeRecord ? ` · 누적 ${activeRecord.reviewCount}회` : ''}
          </span>
        </div>
      </div>

      {/* =================================================================
          TAB 1: 집중 숙지 카드 (3D 자세 + 해부학 + 블라인드 능동 회상 + 3버튼 평가)
         ================================================================= */}
      {activeTab === 'study' && (
        <div
          id="pf-mastery-panel-study"
          role="tabpanel"
          aria-labelledby="pf-mastery-tab-study"
          data-testid="mastery-study-tabpanel"
          className="pf-mastery-cueing-wrap"
        >
          {/* Visual Stage: 3D Posture + Nano Banana Anatomy */}
          <div className="pf-mastery-visual-grid">
            <article className="pf-mastery-visual-pane">
              <h4 className="pf-mastery-pane-heading">
                <Target size={16} strokeWidth={1.6} aria-hidden="true" />
                <span>3D 동작 자세 확인</span>
              </h4>
              <div className="pf-mastery-artwork-frame">
                <ExerciseMotionArtwork
                  exercise={activeExercise}
                  phase={artworkPhase}
                  decorative={false}
                />
              </div>
              <div className="pf-mastery-phase-row" role="group" aria-label="동작 단계 전환">
                {PHASE_OPTIONS.map((phase) => (
                  <button
                    key={phase.id}
                    type="button"
                    className={`pf-mastery-chip-btn ${artworkPhase === phase.id ? 'is-active' : ''}`}
                    aria-pressed={artworkPhase === phase.id}
                    onClick={() => setArtworkPhase(phase.id)}
                  >
                    {phase.labelKo}
                  </button>
                ))}
              </div>
            </article>

            <article className="pf-mastery-visual-pane">
              <h4 className="pf-mastery-pane-heading">
                <Sparkles size={16} strokeWidth={1.6} aria-hidden="true" />
                <span>해부학 근육 지도 · {studyCard.anatomyLabelKo}</span>
              </h4>
              <div className="pf-mastery-anatomy-frame">
                <AnatomyImageFrame
                  key={studyCard.anatomyZone}
                  zone={studyCard.anatomyZone}
                  webpSrc={studyCard.anatomyImageSrc}
                  pngSrc={studyCard.anatomyImageFallbackSrc}
                  alt={`${studyCard.anatomyLabelKo} 해부학 근육 지도`}
                />
              </div>
              <p className="pf-mastery-anatomy-caption">{studyCard.anatomyCaptionKo}</p>
              <div className="pf-mastery-muscle-chips" aria-label="주요 주동근">
                {studyCard.targetMusclesKo.map((muscle) => (
                  <span key={muscle} className="pf-mastery-muscle-chip">
                    {muscle}
                  </span>
                ))}
              </div>
            </article>
          </div>

          {/* Blind Active Recall Controls */}
          <div className="pf-mastery-recall-bar" data-testid="mastery-blind-controls">
            <span className="pf-mastery-recall-label">
              {allBlindEnabled ? (
                <EyeOff size={16} strokeWidth={1.6} aria-hidden="true" />
              ) : (
                <Eye size={16} strokeWidth={1.6} aria-hidden="true" />
              )}
              <span>블라인드 능동 회상</span>
            </span>

            <div className="pf-mastery-chip-group" role="group" aria-label="항목별 가리기 토글">
              <button
                type="button"
                className={`pf-mastery-chip-btn ${blindMasks.spring ? 'is-active' : ''}`}
                aria-pressed={blindMasks.spring}
                data-testid="blind-toggle-spring"
                onClick={() => handleToggleBlindMask('spring')}
              >
                스프링 가리기
              </button>
              <button
                type="button"
                className={`pf-mastery-chip-btn ${blindMasks.breath ? 'is-active' : ''}`}
                aria-pressed={blindMasks.breath}
                data-testid="blind-toggle-breath"
                onClick={() => handleToggleBlindMask('breath')}
              >
                호흡 가리기
              </button>
              <button
                type="button"
                className={`pf-mastery-chip-btn ${blindMasks.cues ? 'is-active' : ''}`}
                aria-pressed={blindMasks.cues}
                data-testid="blind-toggle-cues"
                onClick={() => handleToggleBlindMask('cues')}
              >
                핵심 큐 가리기
              </button>
              <button
                type="button"
                className="pf-mastery-btn"
                data-testid="blind-toggle-all"
                onClick={handleToggleAllBlind}
              >
                {allBlindEnabled ? '모두 펼치기' : '모두 가리기'}
              </button>
            </div>
          </div>

          {/* 3 Recallable Study Blocks */}
          <div className="pf-mastery-study-sections">
            {/* Block 1: Spring Mechanics & Setup Checklist */}
            <article className="pf-mastery-study-block" data-testid="study-block-spring">
              <h4 className="pf-mastery-block-title">
                <span>스프링 원리 · 준비 체크</span>
                <span className="pf-mastery-tag">{studyCard.springRoleLabelKo}</span>
              </h4>
              {isRevealedForCurrent('spring') ? (
                <>
                  {studyCard.springsCode !== 'Bodyweight' && (
                    <SpringVisualPills springs={studyCard.springsCode} />
                  )}
                  <p className="pf-mastery-body-text">{studyCard.springPrincipleKo}</p>
                  <ol className="pf-mastery-checklist">
                    {studyCard.setupChecklistKo.map((item, idx) => (
                      <li key={idx}>{item}</li>
                    ))}
                  </ol>
                </>
              ) : (
                <button
                  type="button"
                  className="pf-mastery-veil-btn"
                  data-testid="reveal-spring-btn"
                  onClick={() => handleRevealSection('spring')}
                >
                  <Eye size={18} strokeWidth={1.6} aria-hidden="true" />
                  <span>스프링 세팅과 보조·저항 원리를 떠올린 뒤 탭해서 확인하세요</span>
                </button>
              )}
            </article>

            {/* Block 2: Breath Rhythm */}
            <article className="pf-mastery-study-block" data-testid="study-block-breath">
              <h4 className="pf-mastery-block-title">
                <span>호흡 리듬 · 중심 연결</span>
                <Wind size={16} strokeWidth={1.6} aria-hidden="true" />
              </h4>
              {isRevealedForCurrent('breath') ? (
                <>
                  <p className="pf-mastery-body-text">{studyCard.breathCueKo}</p>
                  <p className="pf-mastery-sub-text">
                    들숨 {studyCard.breathRhythm.inhaleSec}초: {studyCard.breathRhythm.inhaleActionKo}
                  </p>
                  <p className="pf-mastery-sub-text">
                    날숨 {studyCard.breathRhythm.exhaleSec}초: {studyCard.breathRhythm.exhaleActionKo}
                  </p>
                </>
              ) : (
                <button
                  type="button"
                  className="pf-mastery-veil-btn"
                  data-testid="reveal-breath-btn"
                  onClick={() => handleRevealSection('breath')}
                >
                  <Eye size={18} strokeWidth={1.6} aria-hidden="true" />
                  <span>들숨과 날숨 타이밍을 먼저 말해본 뒤 탭해서 확인하세요</span>
                </button>
              )}
            </article>

            {/* Block 3: Key Cues & Fault Correction */}
            <article className="pf-mastery-study-block" data-testid="study-block-cues">
              <h4 className="pf-mastery-block-title">
                <span>핵심 큐 · 단골 실수 대응</span>
              </h4>
              {isRevealedForCurrent('cues') ? (
                <>
                  <ul className="pf-mastery-cue-list">
                    {studyCard.keyCuesKo.map((cue, idx) => (
                      <li key={idx}>{cue}</li>
                    ))}
                  </ul>
                  <div className="pf-mastery-fault-box">
                    <span className="pf-mastery-fault-kicker">자주 나오는 실수</span>
                    <p className="pf-mastery-sub-text">{studyCard.commonFaultKo}</p>
                    <span className="pf-mastery-fix-kicker">바로 한 마디 큐</span>
                    <p className="pf-mastery-body-text">“{studyCard.correctionCueKo}”</p>
                  </div>
                </>
              ) : (
                <button
                  type="button"
                  className="pf-mastery-veil-btn"
                  data-testid="reveal-cues-btn"
                  onClick={() => handleRevealSection('cues')}
                >
                  <Eye size={18} strokeWidth={1.6} aria-hidden="true" />
                  <span>핵심 큐 1줄과 단골 실수 대응을 떠올린 뒤 탭해서 확인하세요</span>
                </button>
              )}
            </article>
          </div>

          {/* 3-Button Spaced Repetition Rating Bar */}
          <div className="pf-mastery-rating-bar" data-testid="mastery-rating-bar">
            <p className="pf-mastery-sub-text">
              떠올린 느낌을 선택해 주세요. 평가를 누르면 간격 반복 복습 일정이 기기에 저장돼요.
            </p>
            <div className="pf-mastery-rating-grid">
              <button
                type="button"
                className="pf-mastery-rate-btn pf-mastery-rate-btn--again"
                data-testid="rate-again-btn"
                onClick={() => handleRateMastery('again')}
              >
                <span className="pf-mastery-rate-btn__label">다시 연습 ↻</span>
                <span className="pf-mastery-rate-btn__hint">1일 뒤 다시 복습</span>
              </button>

              <button
                type="button"
                className="pf-mastery-rate-btn pf-mastery-rate-btn--good"
                data-testid="rate-good-btn"
                onClick={() => handleRateMastery('good')}
              >
                <span className="pf-mastery-rate-btn__label">수업 가능 ✓</span>
                <span className="pf-mastery-rate-btn__hint">3~7일 뒤 복습</span>
              </button>

              <button
                type="button"
                className="pf-mastery-rate-btn pf-mastery-rate-btn--mastered"
                data-testid="rate-mastered-btn"
                onClick={() => handleRateMastery('mastered')}
              >
                <span className="pf-mastery-rate-btn__label">완벽 마스터 ★</span>
                <span className="pf-mastery-rate-btn__hint">14일 뒤 유지 복습</span>
              </button>
            </div>

            {lastFeedback && lastFeedback.exerciseId === activeExercise.id && (
              <div
                className="pf-mastery-feedback-banner"
                role="status"
                aria-live="polite"
                data-testid="mastery-feedback-banner"
              >
                <span>{lastFeedback.messageKo}</span>
                {deckExercises.length > 1 && (
                  <button
                    type="button"
                    className="pf-mastery-btn pf-mastery-btn--primary"
                    onClick={() => handleStepDeck(1)}
                  >
                    다음 동작으로 →
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* =================================================================
          TAB 2: 실전 수업 퀴즈 (3문항 4지선다 + 즉시 해설 + 다음 동작 이어서 풀기)
         ================================================================= */}
      {activeTab === 'quiz' && (
        <div
          id="pf-mastery-panel-quiz"
          role="tabpanel"
          aria-labelledby="pf-mastery-tab-quiz"
          data-testid="mastery-quiz-tabpanel"
          className="pf-mastery-quiz-wrap"
        >
          <div className="pf-mastery-quiz-summary-bar">
            <span>현장 돌발 상황 3문항 · 보기 중 가장 정확한 수업 대응을 골라보세요</span>
            <span data-testid="quiz-score-indicator">
              풀이 {answeredCount} / {quizQuestions.length} · 정답 {correctCount}개
            </span>
          </div>

          {quizQuestions.map((question, qIndex) => {
            const chosenIdx = currentQuizAnswers[question.id];
            const isAnswered = chosenIdx !== undefined;
            const isCorrect = chosenIdx === question.correctIndex;

            return (
              <article
                key={question.id}
                className="pf-mastery-quiz-card"
                data-testid={`quiz-question-${qIndex}`}
              >
                <div className="pf-mastery-quiz-card__head">
                  <span className="pf-mastery-quiz-qnum">
                    문항 {qIndex + 1} / {quizQuestions.length}
                  </span>
                  <span className="pf-mastery-tag">{question.categoryLabelKo}</span>
                </div>
                <p className="pf-mastery-quiz-prompt">{question.promptKo}</p>

                <div className="pf-mastery-quiz-options" role="group" aria-label={`문항 ${qIndex + 1} 보기`}>
                  {question.optionsKo.map((option, optIdx) => {
                    const isSelected = chosenIdx === optIdx;
                    const isRightOption = optIdx === question.correctIndex;
                    let toneClass = '';
                    if (isAnswered) {
                      if (isRightOption) toneClass = 'is-correct';
                      else if (isSelected) toneClass = 'is-wrong';
                    }

                    return (
                      <button
                        key={optIdx}
                        type="button"
                        className={`pf-mastery-quiz-option ${toneClass}`}
                        disabled={isAnswered}
                        aria-pressed={isSelected}
                        data-testid={`quiz-q${qIndex}-opt${optIdx}`}
                        onClick={() => handleSelectQuizOption(question.id, optIdx)}
                      >
                        <span className="pf-mastery-quiz-option__num">{optIdx + 1}</span>
                        <span>{option}</span>
                      </button>
                    );
                  })}
                </div>

                {isAnswered && (
                  <div
                    className="pf-mastery-quiz-explanation"
                    role="status"
                    aria-live="polite"
                    data-testid={`quiz-explanation-${qIndex}`}
                  >
                    <span
                      className={`pf-mastery-quiz-explanation__badge ${
                        isCorrect ? 'is-correct' : 'is-wrong'
                      }`}
                    >
                      {isCorrect ? '정답이에요 ✓' : `아쉬워요 · 정답은 ${question.correctIndex + 1}번이에요`}
                    </span>
                    <p className="pf-mastery-body-text">{question.explanationKo}</p>
                  </div>
                )}
              </article>
            );
          })}

          {isQuizComplete && (
            <div className="pf-mastery-quiz-complete" data-testid="quiz-complete-summary">
              <p className="pf-mastery-quiz-complete__score">
                <CheckCircle2 size={18} strokeWidth={1.7} aria-hidden="true" />{' '}
                {quizQuestions.length}문항 중 {correctCount}문항 정답
              </p>
              <p className="pf-mastery-body-text">
                {correctCount === quizQuestions.length
                  ? '현장 대응 포인트를 정확히 짚어내셨어요. 지금 바로 수업에 투입하셔도 좋습니다.'
                  : correctCount >= 2
                    ? '핵심 원리를 잘 이해하고 계세요. 틀린 1문항의 해설만 한 번 더 입으로 읽어보세요.'
                    : '스프링 원리와 단골 실수 큐를 집중 숙지 카드에서 1분만 더 확인하고 다시 풀어보세요.'}
              </p>
              <div className="pf-mastery-quiz-actions">
                <button
                  type="button"
                  className="pf-mastery-btn pf-mastery-btn--primary"
                  data-testid="quiz-apply-mastery-btn"
                  onClick={handleApplyQuizOutcome}
                >
                  이 결과로 숙지 상태 저장
                </button>
                <button
                  type="button"
                  className="pf-mastery-btn"
                  data-testid="quiz-retry-btn"
                  onClick={handleResetQuiz}
                >
                  <RotateCcw size={15} aria-hidden="true" />
                  <span>다시 풀기</span>
                </button>
                {deckExercises.length > 1 && (
                  <button
                    type="button"
                    className="pf-mastery-btn"
                    data-testid="quiz-next-exercise-btn"
                    onClick={() => handleStepDeck(1)}
                  >
                    <span>다음 동작 이어서 풀기 →</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* =================================================================
          TAB 3: 30초 입으로 큐잉 + 기구별 숙지 진도표
         ================================================================= */}
      {activeTab === 'cueing' && (
        <div
          id="pf-mastery-panel-cueing"
          role="tabpanel"
          aria-labelledby="pf-mastery-tab-cueing"
          data-testid="mastery-cueing-tabpanel"
          className="pf-mastery-cueing-wrap"
        >
          {/* 4-Beat Breath Rhythm Guide */}
          <article className="pf-mastery-rhythm-card" data-testid="breath-rhythm-guide">
            <div className="pf-mastery-rhythm-head">
              <div>
                <h4 className="pf-mastery-pane-heading">
                  <Wind size={16} strokeWidth={1.6} aria-hidden="true" />
                  <span>4박자 호흡 리듬 가이드 (마시고 4초 → 내쉬고 4초)</span>
                </h4>
                <p className="pf-mastery-sub-text">
                  박자에 맞춰 아래 30초 구어체 대본을 실제 수업처럼 소리 내어 연습해 보세요.
                </p>
              </div>
              <span className="pf-mastery-rhythm-timer" data-testid="cueing-timer-display">
                {isInhalePhase ? '마시고' : '내쉬고'} {activeBeat}박 · 남은 {remainingSec}초
              </span>
            </div>

            <div className="pf-mastery-beats" aria-label="4박자 호흡 카운트">
              {[1, 2, 3, 4].map((beat) => (
                <div
                  key={beat}
                  className={`pf-mastery-beat-cell ${
                    activeBeat === beat ? 'is-active' : ''
                  }`}
                >
                  {beat}박
                </div>
              ))}
            </div>

            <div className="pf-mastery-rhythm-phases">
              <div className={`pf-mastery-phase-pill ${isInhalePhase ? 'is-current' : ''}`}>
                마시고 4초 · {studyCard.breathRhythm.inhaleActionKo}
              </div>
              <div className={`pf-mastery-phase-pill ${!isInhalePhase ? 'is-current' : ''}`}>
                내쉬고 4초 · {studyCard.breathRhythm.exhaleActionKo}
              </div>
            </div>

            <div className="pf-mastery-chip-group">
              <button
                type="button"
                className="pf-mastery-btn pf-mastery-btn--primary"
                data-testid="cueing-timer-toggle"
                onClick={handleToggleCadence}
              >
                {isCadenceActive ? (
                  <>
                    <Pause size={15} aria-hidden="true" />
                    <span>리듬 일시정지</span>
                  </>
                ) : (
                  <>
                    <Play size={15} aria-hidden="true" />
                    <span>{cadenceElapsedSec >= REHEARSAL_TOTAL_SEC ? '30초 다시 시작' : '30초 리듬 시작'}</span>
                  </>
                )}
              </button>
              <button
                type="button"
                className="pf-mastery-btn"
                data-testid="cueing-timer-reset"
                onClick={handleResetCadence}
              >
                <RotateCcw size={15} aria-hidden="true" />
                <span>처음부터</span>
              </button>
            </div>
          </article>

          {/* 3-Level Spoken Cueing Scripts */}
          <section className="pf-mastery-scripts-section" aria-label="3단계 구어체 큐잉 대본 비교">
            <div className="pf-mastery-deck-controls">
              <h4 className="pf-mastery-pane-heading">입문 · 표준 · 심화 3단계 구어체 대본</h4>
              <div className="pf-mastery-chip-group" role="group" aria-label="대본 단계 선택">
                {(
                  [
                    { id: 'all', labelKo: '전체 비교' },
                    { id: 'easy', labelKo: '입문' },
                    { id: 'standard', labelKo: '표준' },
                    { id: 'challenge', labelKo: '심화' },
                  ] as const
                ).map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className={`pf-mastery-chip-btn ${scriptFilter === item.id ? 'is-active' : ''}`}
                    aria-pressed={scriptFilter === item.id}
                    data-testid={`script-filter-${item.id}`}
                    onClick={() => setScriptFilter(item.id)}
                  >
                    {item.labelKo}
                  </button>
                ))}
              </div>
            </div>

            <div
              className={`pf-mastery-scripts-grid ${scriptFilter !== 'all' ? 'is-single' : ''}`}
              data-testid="cue-scripts-grid"
            >
              {visibleScriptEntries.map((entry) => (
                <article
                  key={entry.key}
                  className="pf-mastery-script-card"
                  data-testid={`cue-script-${entry.key}`}
                >
                  <span className="pf-mastery-script-level">{entry.titleKo}</span>
                  <p className="pf-mastery-script-quote">“{entry.textKo}”</p>
                </article>
              ))}
            </div>
          </section>

          {/* Per-Apparatus Mastery Progress Board */}
          <section
            className="pf-mastery-progress-board"
            data-testid="apparatus-mastery-board"
            aria-label="기구별 숙지 진도표"
          >
            <div className="pf-mastery-deck-controls">
              <h4 className="pf-mastery-pane-heading">기구별 숙지 진도표</h4>
              <span className="pf-mastery-review-meta">
                전체 {summary.masteredCount + summary.readyCount} / {summary.totalCount}동작 수업 준비 ({summary.progressPct}%)
              </span>
            </div>

            <div className="pf-mastery-apparatus-list">
              {ALL_APPARATUS_ORDER.map((apparatus) => {
                const stat = summary.byApparatus[apparatus];
                const readyOrMastered = stat.masteredCount + stat.readyCount;
                return (
                  <button
                    key={apparatus}
                    type="button"
                    className="pf-mastery-apparatus-row"
                    data-testid={`apparatus-progress-${apparatus}`}
                    onClick={() => handleDrillApparatus(apparatus)}
                    aria-label={`${stat.labelKo} 숙지율 ${stat.progressPct}퍼센트, 클릭해 해당 기구 집중 연습`}
                  >
                    <span className="pf-mastery-apparatus-name">{stat.labelKo}</span>
                    <span
                      className="pf-mastery-progress-track"
                      role="progressbar"
                      aria-label={`${stat.labelKo} 숙지율`}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={stat.progressPct}
                    >
                      <span
                        className="pf-mastery-progress-fill"
                        style={{ width: `${stat.progressPct}%` }}
                      />
                    </span>
                    <span className="pf-mastery-apparatus-stat">
                      {readyOrMastered}/{stat.totalCount} · {stat.progressPct}%
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        </div>
      )}
    </section>
  );
}
