import {
  Fragment,
  lazy,
  Suspense,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
  type DragEvent,
} from 'react';
import {
  ArrowDown,
  ArrowDownUp,
  ArrowLeft,
  ArrowUp,
  Bookmark,
  CalendarDays,
  Check,
  ChevronRight,
  Clock3,
  Copy,
  GripVertical,
  Heart,
  LayoutTemplate,
  LockKeyhole,
  MapPin,
  MoreHorizontal,
  Play,
  Plus,
  RefreshCw,
  Search,
  Settings2,
  Sparkles,
  Trash2,
  Undo2,
  UnlockKeyhole,
  X,
} from 'lucide-react';
import {
  createSequenceSnapshot,
  downloadEmergencyBackupJson,
  getActiveSequencePlanningCriteria,
  getActiveSequenceSaveState,
  getLastStorageError,
  getPassiveExternalTabConflict,
  isSavedSequencePersistedOnDisk,
  subscribeExternalTabConflict,
  usePilatesStore,
} from '../store/usePilatesStore';
import { APPARATUS_LABELS, PROP_LABELS } from '../data/pilatesCatalog';
import { EQUIPMENT_OPTIONS, getEquipmentFamilies, getEquipmentFamily, getExerciseEquipment } from '../data/equipmentCatalog';
import type {
  ApparatusType,
  AutoGenerateCriteria,
  BoxState,
  FootbarState,
  HeadrestState,
  PilatesExercise,
  PropType,
  SequenceStep,
  StepSideMode,
} from '../types/pilates';
import type { ClassSectionRole } from '../types/sequenceMotion';
import { matchesDiscoverySearch } from '../utils/discoverySearch';
import { isImeComposing } from '../utils/imeGuard';
import {
  addScheduleDays,
  expandInstructorSchedule,
  formatScheduleDate,
  getSchedulePlanWarnings,
  localScheduleDate,
  scheduleMinutes,
} from '../utils/instructorSchedule';
import { getDatedPlanKey } from '../utils/datedSequencePlanning';
import {
  buildSafeTransitionOptimization,
  describeStepTransitionFromPrevious,
  resolveStepSetup,
  type SafeTransitionOptimizationPlan,
} from '../utils/transitionSummary';
import {
  exerciseMatchesCriteria,
  fitSequenceDuration,
  formatSequenceAsStudioSheet,
  getMovementKey,
  getStepSideLabels,
  getStepTiming,
  isRestStep,
  proposeBlockAlternatives,
} from '../utils/sequenceEngine';
import { isExerciseAuthoringEligible } from '../utils/exerciseAuthoring';
import { getSequenceStepClassSection } from '../utils/sequenceMotionBinding';
import { buildSequenceSimulation } from '../utils/sequenceSimulation';
import {
  resolveSequenceInsertion,
  type SequenceInsertionPlacement,
} from '../utils/sequenceInsertion';
import { AiQuickSequenceBar } from './AiQuickSequenceBar';
import { ExerciseMotionArtwork } from './ExerciseMotionArtwork';
import { LightDismissDialog } from './LightDismissDialog';
import { StudioSpringHorizon } from './StudioBrandMark';
import { CountUp } from '../motion';
import { SpringVisualPills } from './SpringVisualPills';
import { BRAND_SPRING_OPTIONS } from '../utils/brandSpringConverter';
import { ExerciseKinesiologyCard } from './ExerciseKinesiologyCard';
import { RoutineTagInlineStrip, RoutineTagSheetDialog } from './RoutineTagManagerDialog';
import {
  ACTIVE_DRAFT_TAG_TARGET_ID,
  copyDraftRoutineTagsToSavedSequence,
} from '../utils/studioRoutineTags';
import { summarizeSequenceSpinalAndFlowBalance } from '../utils/pilatesKinesiologyIntelligence';
import '../styles/sequence-studio.css';

const AdvancedWorkbench = lazy(() =>
  import('./SequenceWorkbench').then((m) => ({ default: m.SequenceWorkbench })),
);
const PresetPicker = lazy(() =>
  import('./OfflinePresetPicker').then((m) => ({ default: m.OfflinePresetPicker })),
);
const LazyStep3DViewport = lazy(() =>
  import('./StudioInteractive3DViewport').then((m) => ({
    default: m.StudioInteractive3DViewport,
  })),
);
const LazyQuickPlanRehearsal = lazy(() =>
  import('./SequencePlanPreview').then((m) => ({
    default: m.SequencePlanPreview,
  })),
);

interface Props {
  onOpenYouTubePreview: (exercise: PilatesExercise) => void;
  onOpenIdeaSheet?: (exercise?: PilatesExercise | null) => void;
  onOpenClipper: () => void;
  onOpenLogModal: (sequenceId: string) => void;
  onOpenInventory: () => void;
  onStartClass: () => void;
  sourceDetailOpen?: boolean;
  onRegisterDetailAddHandler?: (
    handler: ((exerciseId: string) => { success: boolean; message?: string }) | null,
  ) => void;
}

const LEVELS = { '1.0': '기초', '1.5': '중급', '2.0': '심화' } as const;
const SECTIONS: { id: ClassSectionRole; label: string }[] = [
  { id: 'preparation', label: '준비' },
  { id: 'main', label: '메인' },
  { id: 'cooldown', label: '마무리' },
];
const CATEGORY_FILTERS = [
  { id: 'all', label: '전체' },
  { id: 'favorites', label: '즐겨찾기' },
  { id: 'warmup', label: '준비' },
  { id: 'core', label: '코어' },
  { id: 'lower-body', label: '하체' },
  { id: 'upper-body', label: '상체' },
  { id: 'cooldown', label: '마무리' },
];
const LAYER_OPTIONS = [
  { id: 'easy' as const, label: '완화' },
  { id: 'standard' as const, label: '기본' },
  { id: 'hard' as const, label: '심화' },
];
const minutes = (seconds: number) =>
  `${Math.floor(seconds / 60)}분${seconds % 60 ? ` ${Math.round(seconds % 60)}초` : ''}`;
const minutesTweened = (seconds: number) => {
  const s = Math.max(0, Math.round(seconds));
  return `${Math.floor(s / 60)}분${s % 60 ? ` ${s % 60}초` : ''}`;
};

/**
 * Spring-timeline tone. Ported from the legacy workbench ribbon, with the
 * yellow catch-all fixed: green/white get their own tones and anything
 * unrecognized falls back to neutral sage, never yellow.
 * Mixed springs resolve to the strongest tension present (Balanced Body
 * order: green 특강 > red 강 > blue 중 > yellow 약 > white 미세).
 */
type SpringTone = 'is-red' | 'is-blue' | 'is-green' | 'is-yellow' | 'is-white' | 'is-sage';
const SPRING_TONE_STYLES: Record<SpringTone, { background: string; borderColor: string }> = {
  'is-red': { background: '#faeae5', borderColor: '#e4b6a9' },
  'is-blue': { background: '#e6eff7', borderColor: '#b5cde2' },
  'is-green': { background: '#e6f2e9', borderColor: '#a9cbb4' },
  'is-yellow': { background: '#fbf3e2', borderColor: '#e2cb9c' },
  'is-white': { background: '#f8fafc', borderColor: '#cbd5e1' },
  'is-sage': { background: '#edf4f0', borderColor: '#bfd3c6' },
};
function springToneClass(rawSprings: string | undefined): SpringTone {
  const text = (rawSprings ?? '').toLowerCase();
  if (!text) return 'is-sage';
  const has = (pattern: RegExp) => pattern.test(text);
  if (has(/green|그린|초록|녹색|\d\s*g\b/)) return 'is-green';
  if (has(/red|레드|빨강|적색|\d\s*r\b/)) return 'is-red';
  if (has(/blue|블루|파랑|청색|\d\s*b\b/)) return 'is-blue';
  if (has(/yellow|옐로우?|노랑|황색|\d\s*y\b/)) return 'is-yellow';
  if (has(/white|화이트|하양|백색|\d\s*w\b/)) return 'is-white';
  return 'is-sage';
}

/** Provisional tension tiers (SpringBadge labels); exact tension varies by manufacturer/model. */
const SPRING_TENSION_LEGEND = [
  { swatch: '#D9A426', label: '노랑', tier: 'Yellow(약)', meaning: '가벼운 장력' },
  { swatch: '#2E6F9E', label: '파랑', tier: 'Blue(중)', meaning: '중간 장력' },
  { swatch: '#C84B31', label: '빨강', tier: 'Red(강)', meaning: '강한 장력' },
  { swatch: '#2F855A', label: '초록', tier: 'Green(특강)', meaning: '특강 장력' },
  { swatch: '#CBD5E1', label: '하양', tier: 'White(미세)', meaning: '미세 장력' },
] as const;

/** Valid keystrokes persist immediately. Incomplete number/title input stays local. */
function PlanningInput({
  value,
  label,
  kind,
  onCommit,
  onInvalid,
}: {
  value: string;
  label: string;
  kind: 'title' | 'minutes';
  onCommit: (value: string) => boolean;
  onInvalid: () => void;
}) {
  const [draft, setDraft] = useState({ source: value, text: value, rejected: false });
  const text = draft.source === value ? draft.text : value;
  const rejected = draft.source === value && draft.rejected;
  const valid = (next: string) =>
    kind === 'title'
      ? Boolean(next.trim())
      : next.trim() !== '' &&
        Number.isInteger(Number(next)) &&
        Number(next) >= 10 &&
        Number(next) <= 120;
  return (
    <input
      aria-label={label}
      aria-invalid={rejected || undefined}
      value={text}
      type={kind === 'minutes' ? 'number' : 'text'}
      min={kind === 'minutes' ? 10 : undefined}
      max={kind === 'minutes' ? 120 : undefined}
      step={kind === 'minutes' ? 1 : undefined}
      maxLength={kind === 'title' ? 200 : undefined}
      onChange={(event) => {
        const next = event.target.value;
        const normalized = kind === 'minutes' ? String(Number(next)) : next;
        const complete = valid(next);
        const accepted = complete && onCommit(normalized);
        // Keep typing possible (10 may be on the way to 100). A store rejection
        // is marked invalid and is restored to the applied value on blur.
        setDraft({
          source: accepted ? normalized : value,
          text: next,
          rejected: complete && !accepted,
        });
      }}
      onBlur={() => {
        if (rejected) {
          setDraft({ source: value, text: value, rejected: false });
        } else if (!valid(text)) {
          setDraft({ source: value, text: value, rejected: false });
          onInvalid();
        } else if (kind === 'title' && text !== text.trim()) onCommit(text.trim());
      }}
      onKeyDown={(event) => {
        if (event.key === 'Enter' && isImeComposing(event)) {
          event.preventDefault();
        }
      }}
    />
  );
}

function StepEditor({
  step,
  exercise,
  onClose,
  onNotice,
}: {
  step: SequenceStep;
  exercise?: PilatesExercise;
  onClose: () => void;
  onNotice: (message: string) => void;
}) {
  const [openedStep] = useState(step);
  const [duration, setDuration] = useState(String(step.durationMin));
  const [explanation, setExplanation] = useState(String(step.explanationSec ?? 0));
  const [transition, setTransition] = useState(String(step.transitionSec ?? 0));
  const [repetitions, setRepetitions] = useState(step.repetitions ? String(step.repetitions) : '');
  const [sideMode, setSideMode] = useState<StepSideMode | 'auto'>(step.sideMode ?? 'auto');
  const [section, setSection] = useState(getSequenceStepClassSection(step));
  const [note, setNote] = useState(step.instructorNote ?? '');
  const [customSpring, setCustomSpring] = useState(step.customSpringOverride ?? '');
  const [footbarOverride, setFootbarOverride] = useState<FootbarState | 'default'>(
    step.footbarOverride ?? 'default',
  );
  const [headrestOverride, setHeadrestOverride] = useState<HeadrestState | 'default'>(
    step.headrestOverride ?? 'default',
  );
  const [boxOverride, setBoxOverride] = useState<BoxState | 'default'>(
    step.boxOverride ?? 'default',
  );
  const [propOverride, setPropOverride] = useState<PropType | 'default'>(
    step.propOverride ?? 'default',
  );
  const [preview3DOpen, setPreview3DOpen] = useState(false);
  const [pendingDiscardClose, setPendingDiscardClose] = useState<(() => void) | null>(null);
  const [error, setError] = useState('');
  const rest = isRestStep(step);
  const movementSeconds = Math.max(
    0,
    Math.round(Number(duration) * 60) - Number(explanation) - Number(transition),
  );
  const initialSection = getSequenceStepClassSection(openedStep);
  const isDraftDirty = rest
    ? Number(duration) !== openedStep.durationMin
    : Number(duration) !== openedStep.durationMin ||
      Number(explanation) !== (openedStep.explanationSec ?? 0) ||
      Number(transition) !== (openedStep.transitionSec ?? 0) ||
      repetitions.trim() !== (openedStep.repetitions ? String(openedStep.repetitions) : '') ||
      sideMode !== (openedStep.sideMode ?? 'auto') ||
      section !== initialSection ||
      note !== (openedStep.instructorNote ?? '') ||
      customSpring.trim() !== (openedStep.customSpringOverride ?? '') ||
      footbarOverride !== (openedStep.footbarOverride ?? 'default') ||
      headrestOverride !== (openedStep.headrestOverride ?? 'default') ||
      boxOverride !== (openedStep.boxOverride ?? 'default') ||
      propOverride !== (openedStep.propOverride ?? 'default');
  const springDraftChanged = customSpring.trim() !== (openedStep.customSpringOverride ?? '');
  return (
    <LightDismissDialog
      open
      onClose={onClose}
      onBeforeClose={({ close }) => {
        if (isDraftDirty) {
          setPendingDiscardClose(() => close);
          return false;
        }
        return true;
      }}
      title={rest ? '휴식 시간' : (exercise?.nameKo ?? '동작 편집')}
      subtitle="변경 적용을 누르기 전까지 원본 수업은 바뀌지 않아요"
      maxWidth="600px"
      variant="sheet"
    >
      <form
        className="flow-step-editor"
        onKeyDown={(event) => {
          if (
            event.key === 'Enter' &&
            event.target instanceof HTMLInputElement &&
            isImeComposing(event)
          ) {
            event.preventDefault();
          }
        }}
        onSubmit={(event) => {
          event.preventDefault();
          const state = usePilatesStore.getState();
          const index = state.activeSteps.findIndex((item) => item.stepId === step.stepId);
          if (index < 0 || state.activeSteps[index] !== openedStep) {
            setError('이 동작이 다른 곳에서 변경되었습니다. 닫은 뒤 다시 열어 주세요.');
            return;
          }
          const trimmedSpring = customSpring.trim();
          const springChanged = trimmedSpring !== (step.customSpringOverride ?? '');
          const timingOrPracticeEdited =
            Number(duration) !== openedStep.durationMin ||
            Number(explanation) !== (openedStep.explanationSec ?? 0) ||
            Number(transition) !== (openedStep.transitionSec ?? 0) ||
            repetitions.trim() !== (openedStep.repetitions ? String(openedStep.repetitions) : '') ||
            sideMode !== (openedStep.sideMode ?? 'auto');
          const result = rest
            ? state.setRestDuration(index, Number(duration))
            : state.setStepBlockOptions(
                index,
                {
                  durationMin: Number(duration),
                  explanationSec: Number(explanation),
                  transitionSec: Number(transition),
                  repetitions: repetitions.trim() ? Number(repetitions) : undefined,
                  sideMode: sideMode === 'auto' ? undefined : sideMode,
                  classSection: section,
                  instructorNote: note,
                  ...(openedStep.timeEstimate && timingOrPracticeEdited
                    ? { timeEstimate: null }
                    : {}),
                  ...(springChanged ? { customSpringOverride: trimmedSpring || undefined } : {}),
                  footbarOverride: footbarOverride === 'default' ? null : footbarOverride,
                  headrestOverride: headrestOverride === 'default' ? null : headrestOverride,
                  boxOverride: boxOverride === 'default' ? null : boxOverride,
                  propOverride: propOverride === 'default' ? null : propOverride,
                },
                openedStep,
              );
          if (!result.success) {
            setError(result.message);
            return;
          }
          setPendingDiscardClose(null);
          onNotice(result.message);
          onClose();
        }}
      >
        {exercise && (
          <ExerciseMotionArtwork exercise={exercise} className="flow-step-editor__art" />
        )}
        <label className="flow-field">
          전체 시간 · 분
          <input
            aria-label="동작 전체 시간"
            type="number"
            min={rest ? 0.1 : 0.5}
            max={rest ? 120 : 20}
            step="any"
            required
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
          />
        </label>
        {!rest && (
          <>
            <p className="flow-hint">양쪽 수행, 설명, 기구 전환을 모두 포함한 시간입니다</p>
            <div className="flow-form-grid">
              <label className="flow-field">
                설명 · 초
                <input
                  type="number"
                  min="0"
                  max="1200"
                  required
                  value={explanation}
                  onChange={(e) => setExplanation(e.target.value)}
                />
              </label>
              <label className="flow-field">
                다음 동작 준비 · 초
                <input
                  type="number"
                  min="0"
                  max="1200"
                  required
                  value={transition}
                  onChange={(e) => setTransition(e.target.value)}
                />
              </label>
            </div>
            <p className="flow-time-equation">
              실제 동작 {minutes(movementSeconds)} + 설명 {explanation || 0}초 + 전환{' '}
              {transition || 0}초
            </p>
            <div className="flow-form-grid">
              <label className="flow-field">
                횟수 · 선택
                <input
                  type="number"
                  min="1"
                  max="1000"
                  placeholder="미지정"
                  value={repetitions}
                  onChange={(e) => setRepetitions(e.target.value)}
                />
              </label>
              <label className="flow-field">
                좌우 수행
                <select
                  value={sideMode}
                  onChange={(e) => setSideMode(e.target.value as typeof sideMode)}
                >
                  <option value="auto">
                    {exercise?.isUnilateral ? '양쪽 · 순서 미지정' : '기본 · 좌우 미지정'}
                  </option>
                  <option value="together">양쪽 함께</option>
                  <option value="left-then-right">왼쪽 → 오른쪽</option>
                  <option value="right-then-left">오른쪽 → 왼쪽</option>
                  <option value="left">왼쪽만</option>
                  <option value="right">오른쪽만</option>
                </select>
              </label>
            </div>
            <div className="flow-form-grid">
              <label className="flow-field">
                수업 구간
                <select
                  value={section}
                  onChange={(e) => setSection(e.target.value as ClassSectionRole)}
                >
                  {SECTIONS.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flow-field">
                맞춤 스프링 · 선택
                <input
                  type="text"
                  maxLength={80}
                  value={customSpring}
                  onChange={(e) => setCustomSpring(e.target.value)}
                  placeholder={exercise?.springs ? `기본 ${exercise.springs}` : '기본 권장 스프링'}
                />
              </label>
            </div>
            {exercise && (
              <details className="flow-step-3d-disclosure" data-testid="step-editor-setup-disclosure">
                <summary className="flow-step-3d-disclosure__summary">
                  <span>기구 세부 세팅 (박스 · 풋바 · 헤드레스트 · 소도구)</span>
                  <small>
                    {footbarOverride !== 'default' ||
                    headrestOverride !== 'default' ||
                    boxOverride !== 'default' ||
                    propOverride !== 'default'
                      ? '맞춤 세팅 선택됨'
                      : '기본 카탈로그 세팅 사용'}
                  </small>
                </summary>
                <div className="flow-step-3d-disclosure__body flow-form-grid">
                  <label className="flow-field">
                    박스 세팅
                    <select
                      aria-label="단계별 박스 세팅"
                      value={boxOverride}
                      onChange={(e) => setBoxOverride(e.target.value as BoxState | 'default')}
                    >
                      <option value="default">기본 ({exercise.box === 'none' ? '없음' : exercise.box})</option>
                      <option value="none">박스 없음</option>
                      <option value="short-box">숏박스</option>
                      <option value="long-box">롱박스</option>
                    </select>
                  </label>
                  <label className="flow-field">
                    풋바 높이
                    <select
                      aria-label="단계별 풋바 높이"
                      value={footbarOverride}
                      onChange={(e) =>
                        setFootbarOverride(e.target.value as FootbarState | 'default')
                      }
                    >
                      <option value="default">기본 ({exercise.footbar})</option>
                      <option value="high">높음</option>
                      <option value="mid">중간</option>
                      <option value="low">낮음</option>
                      <option value="down">내림</option>
                      <option value="none">없음</option>
                    </select>
                  </label>
                  <label className="flow-field">
                    헤드레스트
                    <select
                      aria-label="단계별 헤드레스트"
                      value={headrestOverride}
                      onChange={(e) =>
                        setHeadrestOverride(e.target.value as HeadrestState | 'default')
                      }
                    >
                      <option value="default">기본 ({exercise.headrest})</option>
                      <option value="flat">평평하게</option>
                      <option value="up">올림</option>
                      <option value="down">내림</option>
                    </select>
                  </label>
                  <label className="flow-field">
                    소도구 지정
                    <select
                      aria-label="단계별 소도구"
                      value={propOverride}
                      onChange={(e) => setPropOverride(e.target.value as PropType | 'default')}
                    >
                      <option value="default">기본 카탈로그 소도구</option>
                      <option value="none">소도구 없음</option>
                      <option value="mini-ball">미니볼</option>
                      <option value="magic-circle">써클링</option>
                      <option value="foam-roller">폼롤러</option>
                      <option value="theraband">탄력 밴드</option>
                    </select>
                  </label>
                </div>
              </details>
            )}
            {exercise && (
              <details
                className="flow-step-3d-disclosure"
                data-testid="step-editor-3d-disclosure"
                open={preview3DOpen}
                onToggle={(event) => setPreview3DOpen(event.currentTarget.open)}
              >
                <summary className="flow-step-3d-disclosure__summary">
                  <span>3D 자세 설명 · 스프링 시뮬레이션 보기</span>
                  <small>
                    {customSpring.trim()
                      ? springDraftChanged
                        ? `초안 미적용: ${customSpring.trim()}`
                        : `단계 지정: ${customSpring.trim()}`
                      : '시작·중간·끝 · 시점 리셋 · 정적 폴백'}
                  </small>
                </summary>
                {preview3DOpen && (
                  <div className="flow-step-3d-disclosure__body">
                    <Suspense
                      fallback={
                        <p className="flow-hint">실시간 3D 설명 패널을 불러오는 중입니다...</p>
                      }
                    >
                      <LazyStep3DViewport
                        exercise={exercise}
                        compact
                        initialSpringOverride={customSpring.trim() || undefined}
                        initialFootbarOverride={
                          footbarOverride === 'default' ? undefined : footbarOverride
                        }
                        initialHeadrestOverride={
                          headrestOverride === 'default' ? undefined : headrestOverride
                        }
                        initialBoxOverride={boxOverride === 'default' ? undefined : boxOverride}
                        initialPropOverride={propOverride === 'default' ? undefined : propOverride}
                        onApplySpringToStep={(springVal) => setCustomSpring(springVal)}
                        onApplySetupToStep={(patch) => {
                          if (patch.springOverride !== undefined) {
                            setCustomSpring(patch.springOverride);
                          }
                          if (patch.footbarOverride !== undefined) {
                            setFootbarOverride(patch.footbarOverride ?? 'default');
                          }
                          if (patch.headrestOverride !== undefined) {
                            setHeadrestOverride(patch.headrestOverride ?? 'default');
                          }
                          if (patch.boxOverride !== undefined) {
                            setBoxOverride(patch.boxOverride ?? 'default');
                          }
                          if (patch.propOverride !== undefined) {
                            setPropOverride(patch.propOverride ?? 'default');
                          }
                        }}
                      />
                    </Suspense>
                  </div>
                )}
              </details>
            )}
            <label className="flow-field">
              수업 메모
              <textarea
                rows={3}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="회원에게 전달할 큐, 변형, 준비물"
              />
            </label>
            {exercise && (
              <details className="flow-step-3d-disclosure">
                <summary>근육 쓰임 · 보상 동작 코칭 큐 참고 (메모에 바로 추가)</summary>
                <div className="flow-step-3d-disclosure__body">
                  <ExerciseKinesiologyCard
                    exercise={exercise}
                    compact
                    onInsertCorrectionCueToNote={(cueText) => {
                      setNote((prev) =>
                        prev.includes(cueText)
                          ? prev
                          : prev.trim()
                            ? `${prev.trim()}\n${cueText}`
                            : cueText,
                      );
                    }}
                  />
                </div>
              </details>
            )}
          </>
        )}
        {pendingDiscardClose && (
          <div
            role="alert"
            className="flow-discard-guard"
            data-testid="step-editor-discard-guard"
          >
            <p>적용하지 않은 편집 초안이 있습니다. 원래 상태로 취소하고 닫을까요?</p>
            <div className="flow-dialog-actions">
              <button
                type="button"
                className="flow-button"
                onClick={() => setPendingDiscardClose(null)}
              >
                계속 편집
              </button>
              <button
                type="button"
                className="flow-button"
                onClick={() => {
                  const proceed = pendingDiscardClose;
                  setPendingDiscardClose(null);
                  proceed();
                }}
              >
                변경 버리고 닫기
              </button>
              <button type="submit" className="flow-button flow-button--primary">
                변경 적용
              </button>
            </div>
          </div>
        )}
        {error && (
          <p role="alert" className="flow-error">
            {error}
          </p>
        )}
        <div className="flow-dialog-actions">
          <button
            type="button"
            className="flow-button"
            onClick={() => {
              setPendingDiscardClose(null);
              onClose();
            }}
          >
            취소
          </button>
          <button className="flow-button flow-button--primary" type="submit">
            변경 적용
          </button>
        </div>
      </form>
    </LightDismissDialog>
  );
}

/** A single persistent canvas. Advanced authoring tools share the same store and remain optional. */
export function SequenceStudioWorkbench(props: Props) {
  const s = usePilatesStore();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [eligibleOnly, setEligibleOnly] = useState(true);
  const [mobilePane, setMobilePane] = useState<'library' | 'plan'>('plan');
  const [notice, setNotice] = useState('');
  const [insertion, setInsertion] = useState<{
    sequenceId: string;
    placement: SequenceInsertionPlacement;
  }>({
    sequenceId: s.activeSequenceId,
    placement: { kind: 'end' },
  });
  const [recentAddition, setRecentAddition] = useState<{
    sequenceId: string;
    stepId: string;
  } | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [presetsOpen, setPresetsOpen] = useState(false);
  const [conditionsOpen, setConditionsOpen] = useState(false);
  const [advanced, setAdvanced] = useState(false);
  const [newClassOpen, setNewClassOpen] = useState(false);
  const [fitPreview, setFitPreview] = useState<{
    steps: SequenceStep[];
    target: number;
    fitted: SequenceStep[];
  } | null>(null);
  const [fitImpossibleInfo, setFitImpossibleInfo] = useState<{
    targetMin: number;
    lockedAndRestSec: number;
    adjustableCount: number;
    minPossibleSec: number;
    maxPossibleSec: number;
    reasonMessage: string;
  } | null>(null);
  const [gapFillOpen, setGapFillOpen] = useState(false);
  const [transitionDiffPlan, setTransitionDiffPlan] =
    useState<SafeTransitionOptimizationPlan | null>(null);
  const [quickRehearsalOpen, setQuickRehearsalOpen] = useState(false);
  const [replacingStepIndex, setReplacingStepIndex] = useState<number | null>(null);
  const [selectedLocationCopyId, setSelectedLocationCopyId] = useState<string>('');
  const [tagSheetTarget, setTagSheetTarget] = useState<{ id: string; title: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const passiveConflict = useSyncExternalStore(
    subscribeExternalTabConflict,
    getPassiveExternalTabConflict,
    getPassiveExternalTabConflict,
  );
  const activeTabConflict = s.externalTabConflict ?? passiveConflict;
  const savingLockRef = useRef(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const planHeadingRef = useRef<HTMLHeadingElement>(null);
  const toolsSummaryRef = useRef<HTMLElement>(null);
  const advancedReturnRef = useRef<HTMLButtonElement>(null);
  const dragStep = useRef<string | null>(null);
  // Share the insertion policy. Unapplied advanced-generator drafts must not
  // replace the conditions of the class currently being edited.
  const criteria = getActiveSequencePlanningCriteria(s);
  const byId = useMemo(
    () => new Map(s.exercises.map((exercise) => [exercise.id, exercise])),
    [s.exercises],
  );
  const included = useMemo(
    () => new Set(s.activeSteps.map((step) => step.exerciseId)),
    [s.activeSteps],
  );
  const placement: SequenceInsertionPlacement =
    insertion.sequenceId === s.activeSequenceId ? insertion.placement : { kind: 'end' };
  const insertionResolution = resolveSequenceInsertion(s.activeSteps, placement);
  const insertionValue = placement.kind === 'step' ? `step:${placement.stepId}` : placement.kind;
  const insertionOptions: {
    value: string;
    label: string;
    placement: SequenceInsertionPlacement;
  }[] = [
    { value: 'end', label: '시퀀스 맨 뒤', placement: { kind: 'end' } },
    { value: 'start', label: '시퀀스 맨 앞', placement: { kind: 'start' } },
    ...s.activeSteps.map((step, index) => ({
      value: `step:${step.stepId}`,
      label: `${index + 1}번 ${isRestStep(step) ? '휴식' : (byId.get(step.exerciseId)?.nameKo ?? '동작')} 뒤`,
      placement: { kind: 'step' as const, stepId: step.stepId },
    })),
  ];
  const recentIndex =
    recentAddition && recentAddition.sequenceId === s.activeSequenceId
      ? s.activeSteps.findIndex((step) => step.stepId === recentAddition.stepId)
      : -1;
  const recentStep = recentIndex >= 0 ? s.activeSteps[recentIndex] : undefined;
  const recentName = recentStep ? (byId.get(recentStep.exerciseId)?.nameKo ?? '동작') : '';
  const simulation = useMemo(
    () => buildSequenceSimulation(s.activeSteps, s.exercises, s.activeTargetMinutes),
    [s.activeSteps, s.exercises, s.activeTargetMinutes],
  );
  const sectionTotals = useMemo(
    () =>
      Object.fromEntries(
        SECTIONS.map(({ id }) => [
          id,
          s.activeSteps
            .filter((step) => getSequenceStepClassSection(step, s.activeSteps) === id)
            .reduce((sum, step) => sum + getStepTiming(step).totalSec, 0),
        ]),
      ) as Record<ClassSectionRole, number>,
    [s.activeSteps],
  );
  const eligible = (exercise: PilatesExercise) => {
    const needs = getExerciseEquipment(exercise);
    return (
      exerciseMatchesCriteria(exercise, criteria) &&
      needs.requiredEquipment.every((id) => s.ownedEquipment.includes(id)) &&
      needs.requiredProps.every((prop) => s.ownedProps.includes(prop))
    );
  };
  const results = s.exercises.filter(
    (exercise) =>
      (criteria.apparatus === 'mixed' || exercise.apparatus === criteria.apparatus) &&
      (category === 'all' ||
        (category === 'favorites' && exercise.favoriteTag !== 'none') ||
        exercise.blockCategory === category ||
        (category === 'lower-body' &&
          ['footwork', 'bridging', 'feet-in-straps'].includes(exercise.blockCategory))) &&
      (!eligibleOnly || eligible(exercise)) &&
      matchesDiscoverySearch(
        [
          exercise.nameKo,
          exercise.nameEn,
          ...exercise.targetMuscles,
          APPARATUS_LABELS[exercise.apparatus].ko,
        ],
        query,
      ),
  );
  const editingStep = s.activeSteps.find((step) => step.stepId === editingId);
  const total = simulation.totals.totalSec;
  const target = s.activeTargetMinutes * 60;
  const difference = target - total;
  const exerciseCount = s.activeSteps.filter((step) => !isRestStep(step)).length;
  const startBlockers =
    s.activeSteps.length && !simulation.gate.canRehearse
      ? simulation.gate.reasons.filter(
          (reason) => reason.code !== 'target-mismatch' && reason.code !== 'duplicate-movement',
        )
      : [];

  // Smart gap-fill candidates, ported from the legacy workbench: at most 2
  // authoring-eligible motions not already used (by movement key), matching
  // the apparatus/level/equipment of the current sequence. Only computed
  // while the sequence is short of its target.
  const gapFillCandidates: PilatesExercise[] =
    !s.activeSteps.length || difference <= 0
      ? []
      : (() => {
          const usedKeys = new Set(
            s.activeSteps.flatMap((step) => {
              const exercise = !isRestStep(step) ? byId.get(step.exerciseId) : undefined;
              return exercise ? [getMovementKey(exercise)] : [];
            }),
          );
          const currentStepEquipment = [
            ...new Set(
              s.activeSteps.flatMap((step) => {
                const exercise = byId.get(step.exerciseId);
                return exercise ? getExerciseEquipment(exercise).requiredEquipment : [];
              }),
            ),
          ];
          const effectiveEq = currentStepEquipment.length
            ? currentStepEquipment
            : (criteria.availableEquipment ??
              (criteria.apparatus === 'mixed'
                ? (criteria.ownedApparatus ?? [])
                : [criteria.apparatus]));
          const effectiveApparatus: ApparatusType | 'mixed' =
            effectiveEq.length === 1
              ? (getEquipmentFamily(effectiveEq[0]) ?? s.activeApparatus)
              : effectiveEq.length > 1
                ? 'mixed'
                : s.activeApparatus;
          const picked: PilatesExercise[] = [];
          for (const exercise of s.exercises) {
            if (picked.length >= 2) break;
            if (!isExerciseAuthoringEligible(exercise)) continue;
            const key = getMovementKey(exercise);
            if (usedKeys.has(key)) continue;
            if (
              !exerciseMatchesCriteria(exercise, {
                ...criteria,
                apparatus: effectiveApparatus,
                level: s.activeLevel,
                ownedApparatus: getEquipmentFamilies(effectiveEq),
                availableEquipment: effectiveEq,
                preferredProps: (s.lastCriteria?.preferredProps ?? criteria.preferredProps).filter(
                  (prop) => prop === 'none' || s.ownedProps.includes(prop),
                ),
              })
            ) {
              continue;
            }
            usedKeys.add(key);
            picked.push(exercise);
          }
          return picked;
        })();

  const updateConditions = (patch: Partial<AutoGenerateCriteria>) => {
    const result = usePilatesStore.getState().updateSequencePlanningConditions(patch);
    setNotice(result.message);
  };
  const addExercise = (
    exercise: PilatesExercise,
    override?: SequenceInsertionPlacement,
    allowDuplicate = false,
  ) => {
    const result = usePilatesStore
      .getState()
      .insertExerciseIntoSequence(exercise.id, override ?? placement, undefined, {
        allowDuplicate,
      });
    setNotice(result.message);
    if (result.success && result.stepId) {
      setRecentAddition({ sequenceId: s.activeSequenceId, stepId: result.stepId });
      if (!override && placement.kind !== 'end') {
        setInsertion({
          sequenceId: s.activeSequenceId,
          placement: { kind: 'step', stepId: result.stepId },
        });
      }
    }
    return result;
  };

  /** Appends the gap-fill candidates at the end, in one undo step. Existing steps are untouched. */
  const applyGapFill = () => {
    const current = usePilatesStore.getState();
    const appendedSteps: SequenceStep[] = gapFillCandidates.map((candidate, index) => ({
      stepId: `gap-fill-${Date.now()}-${index}`,
      order: current.activeSteps.length + index + 1,
      exerciseId: candidate.id,
      blockCategory: candidate.blockCategory,
      durationMin: candidate.defaultDurationMin,
      selectedLayer: 'standard',
      instructorNote: '',
    }));
    const message = `추천 동작 ${gapFillCandidates.length}개를 수업표 끝에 추가했어요. 되돌리기로 복구할 수 있습니다.`;
    usePilatesStore.setState({
      undoStack: [...current.undoStack.slice(-19), createSequenceSnapshot(current)],
      activeSteps: [...current.activeSteps, ...appendedSteps],
      generationError: null,
      saveFeedback: message,
    });
    setGapFillOpen(false);
    setNotice(message);
  };

  useEffect(() => {
    if (!props.onRegisterDetailAddHandler) return undefined;
    props.onRegisterDetailAddHandler((exerciseId: string) => {
      const targetEx = usePilatesStore
        .getState()
        .exercises.find((item) => item.id === exerciseId);
      if (!targetEx) {
        return {
          success: false,
          message: '동작 정보가 바뀌었습니다. 현재 정보를 다시 확인해 주세요.',
        };
      }
      const res = addExercise(targetEx);
      return { success: res.success, message: res.message };
    });
    return () => {
      props.onRegisterDetailAddHandler?.(null);
    };
  });

  const saveStatus = getActiveSequenceSaveState(s, isSaving);
  const transitionOptimization = useMemo(
    () => buildSafeTransitionOptimization(s.activeSteps, byId),
    [s.activeSteps, byId],
  );
  const spinalBalanceSummary = useMemo(
    () => summarizeSequenceSpinalAndFlowBalance(s.activeSteps, byId),
    [s.activeSteps, byId],
  );
  const nextScheduledContext = useMemo(() => {
    if (!s.instructorSchedule.classes.length) return null;
    try {
      const today = localScheduleDate();
      const now = new Date();
      const nowMin = now.getHours() * 60 + now.getMinutes();
      const occurrences = expandInstructorSchedule(
        s.instructorSchedule,
        today,
        addScheduleDays(today, 14),
      ).filter((row) => row.status === 'scheduled');
      const upcoming =
        occurrences.find(
          (row) => row.date > today || scheduleMinutes(row.endTime) >= nowMin,
        ) ?? occurrences[0];
      if (!upcoming) return null;
      const location = s.instructorSchedule.locations.find(
        (loc) => loc.id === upcoming.locationId,
      );
      const planKey = getDatedPlanKey(upcoming.classId, upcoming.originalDate);
      const assignment = s.datedSequencePlanning?.assignments.find(
        (item) => getDatedPlanKey(item.classId, item.originalDate) === planKey,
      );
      const warnings = getSchedulePlanWarnings(
        upcoming,
        s.instructorSchedule,
        s.savedSequences,
        s.exercises,
      );
      const slotMinutes = Math.max(
        10,
        Math.min(120, scheduleMinutes(upcoming.endTime) - scheduleMinutes(upcoming.startTime)),
      );
      return {
        occurrence: upcoming,
        location,
        assignment,
        warnings,
        slotMinutes,
      };
    } catch {
      return null;
    }
  }, [s.instructorSchedule, s.datedSequencePlanning, s.savedSequences, s.exercises]);

  const continueNextScheduledClass = () => {
    if (!nextScheduledContext) return;
    const { occurrence, location, assignment, slotMinutes } = nextScheduledContext;
    const store = usePilatesStore.getState();
    if (assignment) {
      const loaded = store.loadDatedSequencePlanAsDraft(assignment.id);
      setNotice(loaded.message);
      setMobilePane('plan');
      return;
    }
    if (occurrence.linkSavedSequenceId) {
      const linked = store.savedSequences.find((seq) => seq.id === occurrence.linkSavedSequenceId);
      if (linked) {
        const assigned = store.assignSequenceToOccurrence({
          sequenceId: linked.id,
          classId: occurrence.classId,
          originalDate: occurrence.originalDate,
          state: 'draft',
        });
        if (assigned.success && assigned.assignmentId) {
          const loaded = usePilatesStore
            .getState()
            .loadDatedSequencePlanAsDraft(assigned.assignmentId);
          setNotice(`${occurrence.title} 회차 계획을 불러왔습니다. ${loaded.message}`);
          setMobilePane('plan');
          return;
        }
        store.loadSequenceIntoWorkbench(linked.id);
        setNotice(`${occurrence.title} 연결 시퀀스를 불러왔습니다.`);
        setMobilePane('plan');
        return;
      }
    }
    const validEquip = (location?.equipmentIds ?? []).filter((id) =>
      store.ownedEquipment.includes(id),
    );
    const families = [
      ...new Set(
        validEquip
          .map((id) => EQUIPMENT_OPTIONS.find((opt) => opt.id === id)?.apparatusFamily)
          .filter((v): v is ApparatusType => Boolean(v)),
      ),
    ];
    const nextApparatus: ApparatusType | 'mixed' =
      families.length === 1 ? families[0]! : families.length > 1 ? 'mixed' : store.activeApparatus;
    store.setActiveSequenceMeta({
      title: occurrence.title,
      targetMinutes: slotMinutes,
    });
    const res = store.updateSequencePlanningConditions({
      apparatus: nextApparatus,
      ...(validEquip.length ? { availableEquipment: validEquip } : {}),
      ...(location?.propIds.length
        ? { preferredProps: location.propIds.filter((p) => store.ownedProps.includes(p)) }
        : {}),
      targetMinutes: slotMinutes,
    });
    setNotice(
      res.success
        ? `다음 수업(${occurrence.title} · ${location?.alias ?? '장소 미지정'}) 시간·기구 조건을 반영했습니다.`
        : res.message,
    );
    setMobilePane('plan');
  };
  const revealStep = (stepId: string) => {
    setMobilePane('plan');
    requestAnimationFrame(() => {
      const title = document.getElementById(`flow-step-${stepId}`);
      title?.closest('article')?.scrollIntoView?.({ behavior: 'instant', block: 'nearest' });
      const focusTarget = title?.matches(':disabled')
        ? title.closest('article')?.querySelector<HTMLElement>('button:not(:disabled)')
        : title;
      (focusTarget ?? planHeadingRef.current)?.focus({ preventScroll: true });
    });
  };
  const showLibrary = () => {
    setMobilePane('library');
    requestAnimationFrame(() => {
      searchRef.current?.scrollIntoView?.({ behavior: 'instant', block: 'nearest' });
      searchRef.current?.focus({ preventScroll: true });
    });
  };
  const save = async () => {
    if (savingLockRef.current) return false;
    const state = usePilatesStore.getState();
    if (!state.activeSteps.some((step) => !isRestStep(step))) {
      setNotice('동작을 추가한 뒤 저장해 주세요.');
      return false;
    }
    savingLockRef.current = true;
    setIsSaving(true);
    try {
      state.saveCurrentSequenceToBinder();
      await Promise.resolve();
      const next = usePilatesStore.getState();
      if (next.activeSequenceId) {
        copyDraftRoutineTagsToSavedSequence(next.activeSequenceId);
      }
      const savedObj = next.savedSequences.find((item) => item.id === next.activeSequenceId);
      const persistedOk =
        Boolean(savedObj) && isSavedSequencePersistedOnDisk(savedObj!, next.persistenceError);
      const err =
        getLastStorageError() ??
        next.persistenceError ??
        (persistedOk ? null : '브라우저 저장을 아직 확인하지 못했습니다. 다시 저장해 주세요.');
      setNotice(err ?? '저장한 수업에 보관했습니다.');
      return !err;
    } finally {
      savingLockRef.current = false;
      setIsSaving(false);
    }
  };
  const start = () => {
    const state = usePilatesStore.getState();
    const check = buildSequenceSimulation(
      state.activeSteps,
      state.exercises,
      state.activeTargetMinutes,
    );
    if (!check.gate.canRehearse) {
      setNotice(check.gate.reasons.map((reason) => reason.message).join(' '));
      return;
    }
    props.onStartClass();
  };
  const drop = (event: DragEvent, targetStepId?: string) => {
    event.preventDefault();
    event.stopPropagation();
    const stepId = event.dataTransfer.getData('application/x-pilates-step') || dragStep.current;
    if (stepId) {
      const targetId = targetStepId ?? usePilatesStore.getState().activeSteps.at(-1)?.stepId;
      if (targetId && targetId !== stepId) {
        const moved = usePilatesStore.getState().reorderStep(stepId, targetId);
        setNotice(moved ? '동작 순서를 변경했습니다.' : '잠긴 동작의 위치는 바꿀 수 없습니다.');
      }
    } else {
      const exercise = byId.get(event.dataTransfer.getData('application/x-pilates-exercise'));
      if (exercise)
        addExercise(
          exercise,
          targetStepId ? { kind: 'step', stepId: targetStepId } : { kind: 'end' },
        );
    }
    dragStep.current = null;
  };

  if (advanced)
    return (
      <section className="flow-advanced-workbench">
        <button
          ref={advancedReturnRef}
          className="flow-button"
          onClick={() => {
            setAdvanced(false);
            requestAnimationFrame(() => toolsSummaryRef.current?.focus());
          }}
        >
          <ArrowLeft size={16} strokeWidth={1.5} /> 간편 작성으로 돌아가기
        </button>
        <Suspense fallback={<p role="status">고급 작성 도구를 여는 중…</p>}>
          <AdvancedWorkbench {...props} />
        </Suspense>
      </section>
    );

  return (
    <section className="flow-studio" data-testid="sequence-studio" data-mobile-pane={mobilePane}>
      <header className="flow-studio__heading">
        <div className="flow-studio__title-group">
          <h1 id="workspace-main-heading" tabIndex={-1}>
            수업 만들기
          </h1>
          <p>동작을 고르고 나만의 흐름을 완성하세요</p>
          <span className="pf-studio-spring-meter" aria-hidden="true">
            <StudioSpringHorizon ratio={target ? total / target : 0} />
            <em>{target ? `${Math.min(100, Math.round((total / target) * 100))}%` : '0%'}</em>
          </span>
        </div>
        <div className="flow-heading-actions">
          <button className="flow-button" onClick={() => setPresetsOpen(true)}>
            <LayoutTemplate size={16} strokeWidth={1.5} /> 템플릿
          </button>
          <button
            className="flow-button"
            onClick={() =>
              s.activeSteps.length
                ? setNewClassOpen(true)
                : setNotice(s.startBlankSequence().message)
            }
          >
            <Plus size={16} strokeWidth={1.5} /> 새 수업
          </button>
          <details
            className="flow-tools"
            onKeyDown={(event) => {
              if (event.key === 'Escape') {
                event.preventDefault();
                event.currentTarget.open = false;
                event.currentTarget.querySelector('summary')?.focus();
              }
            }}
          >
            <summary ref={toolsSummaryRef} aria-label="수업 작성 도구 더보기">
              <MoreHorizontal size={18} strokeWidth={1.5} />
            </summary>
            <div>
              <button
                onClick={() => {
                  setAdvanced(true);
                  requestAnimationFrame(() => advancedReturnRef.current?.focus());
                }}
              >
                자동 구성 · 고급 편집
              </button>
              <button onClick={props.onOpenClipper}>영상에서 동작 가져오기</button>
              <button onClick={() => props.onOpenIdeaSheet?.()}>내 동작 만들기</button>
              <button onClick={props.onOpenInventory}>기구 · 소도구 관리</button>
              {exerciseCount > 0 && (
                <button
                  type="button"
                  data-testid="flow-copy-cuesheet-btn"
                  onClick={async () => {
                    const sheet = formatSequenceAsStudioSheet(
                      s.activeTitle || '수업 시퀀스',
                      s.activeSubtitle || `목표 ${s.activeTargetMinutes}분 클래스`,
                      s.activeSteps,
                      new Map(s.exercises.map((ex) => [ex.id, ex])),
                      s.reformerBrand,
                    );
                    try {
                      await navigator.clipboard?.writeText(sheet);
                      setNotice('티칭 큐시트 텍스트를 클립보드에 복사했습니다.');
                    } catch {
                      setNotice('큐시트 복사에 실패했습니다. 저장한 수업에서 확인해 주세요.');
                    }
                  }}
                >
                  티칭 큐시트 텍스트 복사
                </button>
              )}
            </div>
          </details>
        </div>
      </header>

      {activeTabConflict && (
        <div
          className="flow-conflict-banner"
          role="alert"
          data-testid="flow-cross-tab-conflict-banner"
        >
          <div>
            <strong>다른 탭 변경 감지</strong>
            <p>{activeTabConflict.message}</p>
          </div>
          <div className="flow-conflict-banner__actions">
            <button
              type="button"
              className="flow-button"
              onClick={() => {
                const res = usePilatesStore.getState().reloadFromExternalTabStorage();
                setNotice(res.message);
              }}
            >
              최신 저장본 불러오기
            </button>
            <button
              type="button"
              className="flow-button"
              disabled={!exerciseCount}
              onClick={() => {
                usePilatesStore.getState().saveCurrentSequenceToBinder(true);
                setNotice('현재 초안을 별도 사본으로 저장해 두 탭의 내용을 모두 보존했습니다.');
              }}
            >
              사본으로 따로 저장
            </button>
            <button
              type="button"
              className="flow-button flow-button--primary"
              disabled={!exerciseCount}
              onClick={() => {
                void save();
              }}
            >
              현재 내용으로 덮어쓰기
            </button>
          </div>
        </div>
      )}

      {nextScheduledContext && (
        <section
          className="flow-next-class-card"
          aria-label="다음 예정 수업 준비"
          data-testid="flow-next-scheduled-class-card"
        >
          <div className="flow-next-class-card__info">
            <span className="flow-next-class-badge">
              <CalendarDays size={13} strokeWidth={1.6} aria-hidden="true" /> 다음 수업
            </span>
            <strong>{nextScheduledContext.occurrence.title}</strong>
            <span>
              {formatScheduleDate(nextScheduledContext.occurrence.date)}{' '}
              {nextScheduledContext.occurrence.startTime}–{nextScheduledContext.occurrence.endTime} (
              {nextScheduledContext.slotMinutes}분)
            </span>
            {nextScheduledContext.location && (
              <span>
                <MapPin size={13} strokeWidth={1.5} aria-hidden="true" />{' '}
                {nextScheduledContext.location.alias} ·{' '}
                {nextScheduledContext.location.equipmentIds
                  .map((id) => EQUIPMENT_OPTIONS.find((opt) => opt.id === id)?.labelKo ?? id)
                  .join(', ') || '기구 미지정'}
              </span>
            )}
            <span
              className={`flow-next-prep-pill is-${
                nextScheduledContext.assignment?.state ??
                (nextScheduledContext.occurrence.linkSavedSequenceId ? 'linked' : 'unassigned')
              }`}
              data-testid="flow-next-class-prep-status"
            >
              {nextScheduledContext.assignment
                ? nextScheduledContext.assignment.state === 'prepared'
                  ? '준비 완료 표시됨'
                  : '회차 초안 작성 중'
                : nextScheduledContext.occurrence.linkSavedSequenceId
                  ? '기본 시퀀스 연결됨'
                  : '회차 계획 미연결'}
            </span>
            {nextScheduledContext.warnings.length > 0 && (
              <small className="flow-next-class-warning">
                {nextScheduledContext.warnings[0]}
              </small>
            )}
          </div>
          <div className="flow-next-class-card__actions">
            <button
              type="button"
              className="flow-button flow-button--primary"
              data-testid="flow-continue-next-class-btn"
              onClick={continueNextScheduledClass}
            >
              이어서 준비
            </button>
          </div>
        </section>
      )}

      {s.instructorSchedule.locations.length > 0 && s.activeSteps.length > 0 && (
        <div className="flow-location-copy-bar" data-testid="flow-location-copy-bar">
          <span>
            <MapPin size={14} strokeWidth={1.5} aria-hidden="true" /> 다른 장소 기구에 맞춰 사본
            만들기
          </span>
          <div className="flow-location-copy-bar__controls">
            <select
              aria-label="사본을 만들 수업 장소 선택"
              data-testid="flow-location-copy-select"
              value={selectedLocationCopyId || s.instructorSchedule.locations[0]!.id}
              onChange={(e) => setSelectedLocationCopyId(e.target.value)}
            >
              {s.instructorSchedule.locations.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.alias} (
                  {loc.equipmentIds
                    .map((id) => EQUIPMENT_OPTIONS.find((opt) => opt.id === id)?.labelKo ?? id)
                    .join('·') || '기구 미등록'}
                  )
                </option>
              ))}
            </select>
            <button
              type="button"
              className="flow-button"
              data-testid="flow-location-copy-btn"
              onClick={() => {
                const locId =
                  selectedLocationCopyId || s.instructorSchedule.locations[0]?.id || '';
                const res = usePilatesStore.getState().copyActiveSequenceForLocation(locId);
                setNotice(res.message);
                setMobilePane('plan');
              }}
            >
              <Copy size={14} strokeWidth={1.5} aria-hidden="true" /> 장소 변경 사본 열기
            </button>
          </div>
        </div>
      )}

      <div className="flow-class-brief">
        <label className="flow-field flow-class-title">
          수업 이름
          <PlanningInput
            key={`title-${s.activeSequenceId}`}
            label="수업 이름"
            kind="title"
            value={s.activeTitle}
            onCommit={(title) => {
              if (title !== s.activeTitle) s.setActiveSequenceMeta({ title });
              return usePilatesStore.getState().activeTitle === title;
            }}
            onInvalid={() => setNotice('수업 이름을 비워 둘 수 없어 이전 이름을 유지했습니다.')}
          />
        </label>
        <label className="flow-field">
          기구
          <select
            aria-label="수업 기구"
            value={criteria.apparatus}
            onChange={(e) =>
              updateConditions({ apparatus: e.target.value as ApparatusType | 'mixed' })
            }
          >
            {(Object.keys(APPARATUS_LABELS) as ApparatusType[]).map((id) => (
              <option key={id} value={id}>
                {APPARATUS_LABELS[id].short}
              </option>
            ))}
            <option value="mixed">여러 기구</option>
          </select>
        </label>
        <label className="flow-field">
          최대 난이도
          <select
            aria-label="수업 최대 난이도"
            value={criteria.level}
            onChange={(e) =>
              updateConditions({ level: e.target.value as AutoGenerateCriteria['level'] })
            }
          >
            {Object.entries(LEVELS).map(([id, label]) => (
              <option key={id} value={id}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="flow-field">
          목표 · 분
          <PlanningInput
            key={`minutes-${s.activeSequenceId}`}
            label="수업 목표 시간"
            kind="minutes"
            value={String(s.activeTargetMinutes)}
            onCommit={(value) => {
              const result = s.updateSequencePlanningConditions({ targetMinutes: Number(value) });
              setNotice(result.success ? '' : result.message);
              return result.success;
            }}
            onInvalid={() => setNotice('목표 시간은 10–120분 사이 정수로 입력해 주세요.')}
          />
        </label>
        <button
          className="flow-button flow-condition-button"
          onClick={() => setConditionsOpen(true)}
        >
          <Settings2 size={16} strokeWidth={1.5} />
          <span>수업 조건</span>
        </button>
        <div className="flow-class-brief-tags">
          <RoutineTagInlineStrip
            routineId={s.activeSequenceId || ACTIVE_DRAFT_TAG_TARGET_ID}
            routineTitle={s.activeTitle || '현재 수업 초안'}
            onOpenTagSheet={(id, title) => setTagSheetTarget({ id, title })}
          />
        </div>
      </div>

      <AiQuickSequenceBar
        compact={s.activeSteps.length > 0}
        onApplied={(composed) => {
          const current = usePilatesStore.getState();
          const preUndoSnapshot = createSequenceSnapshot(current);
          const nextAvailableEquipment = EQUIPMENT_OPTIONS.filter(
            (opt) =>
              current.ownedEquipment.includes(opt.id) &&
              (composed.intent.apparatus === 'mixed' ||
                opt.apparatusFamily === composed.intent.apparatus),
          ).map((opt) => opt.id);
          if (nextAvailableEquipment.length === 0) {
            setEligibleOnly(false);
          }
          const baseCriteria = getActiveSequencePlanningCriteria(current);
          const nextCriteria: AutoGenerateCriteria = {
            ...baseCriteria,
            apparatus: composed.intent.apparatus,
            availableEquipment:
              nextAvailableEquipment.length > 0
                ? nextAvailableEquipment
                : EQUIPMENT_OPTIONS.filter(
                    (opt) =>
                      composed.intent.apparatus === 'mixed' ||
                      opt.apparatusFamily === composed.intent.apparatus,
                  ).map((opt) => opt.id),
            level: composed.intent.level,
            targetMinutes: composed.intent.targetMinutes,
            focusPreset: composed.intent.focusPreset,
          };
          usePilatesStore.setState({
            undoStack: [...current.undoStack.slice(-19), preUndoSnapshot],
            activeTitle: composed.title,
            activeSubtitle: composed.subtitle,
            activeApparatus: composed.intent.apparatus,
            activeLevel: composed.intent.level,
            activeTargetMinutes: composed.intent.targetMinutes,
            activeSteps: composed.steps,
            lastCriteria: nextCriteria,
            draftCriteria: nextCriteria,
            generationError: null,
            saveFeedback: null,
          });
          setMobilePane('plan');
          setNotice(composed.summaryKo);
        }}
        onError={(msg) => setNotice(msg)}
      />

      <div className="flow-mobile-panes" role="group" aria-label="작성 화면 선택">
        <button aria-pressed={mobilePane === 'plan'} onClick={() => setMobilePane('plan')}>
          내 시퀀스 <span>{exerciseCount}</span>
        </button>
        <button aria-pressed={mobilePane === 'library'} onClick={showLibrary}>
          <Plus size={16} strokeWidth={1.5} /> 동작 찾기
        </button>
      </div>

      <div className="flow-studio-grid">
        <aside className="flow-picker" aria-label="수업에 추가할 동작">
          <div className="flow-panel-heading">
            <div>
              <span className="flow-step-number">01</span>
              <h2>
                {criteria.apparatus === 'mixed'
                  ? '동작 찾기'
                  : `${APPARATUS_LABELS[criteria.apparatus].short} 동작`}
              </h2>
            </div>
            <span className="flow-count">{results.length}개</span>
          </div>
          <label className="flow-search">
            <Search size={16} strokeWidth={1.5} aria-hidden="true" />
            <input
              ref={searchRef}
              aria-label="수업 동작 검색"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(event) => {
                if (isImeComposing(event)) return;
                if (event.key === 'Escape' && query) {
                  event.preventDefault();
                  setQuery('');
                }
              }}
              placeholder="이름, 영어명, 근육 검색"
            />
            {query && (
              <button onClick={() => setQuery('')} aria-label="동작 검색 지우기">
                <X size={15} strokeWidth={1.5} />
              </button>
            )}
          </label>
          <div className="flow-chips" aria-label="동작 부위와 구간">
            {CATEGORY_FILTERS.map((item) => (
              <button
                key={item.id}
                aria-label={item.id === 'favorites' ? '♥ 즐겨찾기' : undefined}
                aria-pressed={category === item.id}
                onClick={() => setCategory(item.id)}
              >
                {item.id === 'favorites' && (
                  <Heart size={14} strokeWidth={1.5} aria-hidden="true" />
                )}
                {item.label}
              </button>
            ))}
          </div>
          <div className="flow-picker-controls">
            <label className="flow-checkbox">
              <input
                type="checkbox"
                checked={eligibleOnly}
                onChange={(e) => setEligibleOnly(e.target.checked)}
              />{' '}
              수업 조건에 맞는 동작만
            </label>
            <div className="flow-insertion-control">
              <label htmlFor="flow-insertion-position">추가 위치</label>
              <select
                id="flow-insertion-position"
                value={insertionValue}
                aria-describedby={!insertionResolution.success ? 'flow-insertion-error' : undefined}
                onChange={(event) => {
                  const selected = insertionOptions.find(
                    (option) => option.value === event.target.value,
                  );
                  if (selected)
                    setInsertion({ sequenceId: s.activeSequenceId, placement: selected.placement });
                }}
              >
                {!insertionOptions.some((option) => option.value === insertionValue) && (
                  <option value={insertionValue} disabled>
                    기준 항목 없음 · 위치를 다시 선택하세요
                  </option>
                )}
                {insertionOptions.map((option) => (
                  <option
                    key={option.value}
                    value={option.value}
                    disabled={!resolveSequenceInsertion(s.activeSteps, option.placement).success}
                  >
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {!insertionResolution.success && (
            <p id="flow-insertion-error" className="flow-insertion-error" role="alert">
              {insertionResolution.message}
            </p>
          )}
          {recentStep && (
            <div className="flow-added-receipt" aria-live="polite">
              <span>
                <Check size={15} strokeWidth={1.5} aria-hidden="true" /> {recentIndex + 1}번 ·{' '}
                {recentName} 추가됨
              </span>
              <button type="button" onClick={() => revealStep(recentStep.stepId)}>
                시퀀스에서 보기
              </button>
            </div>
          )}
          <div className="flow-picker-list">
            {results.length ? (
              results.map((exercise) => (
                <article
                  className={`flow-pick-card ${included.has(exercise.id) ? 'is-added' : ''}`}
                  key={exercise.id}
                  draggable
                  onDragStart={(event) => {
                    event.dataTransfer.setData('application/x-pilates-exercise', exercise.id);
                    event.dataTransfer.effectAllowed = 'copy';
                  }}
                >
                  <button
                    className="flow-pick-card__preview"
                    onClick={() => props.onOpenYouTubePreview(exercise)}
                    aria-label={`${exercise.nameKo} 자세와 자료 보기`}
                  >
                    <ExerciseMotionArtwork exercise={exercise} />
                  </button>
                  <div className="flow-pick-card__info">
                    <button
                      className="flow-name-button"
                      onClick={() => props.onOpenYouTubePreview(exercise)}
                    >
                      {exercise.nameKo}
                    </button>
                    <span>
                      {LEVELS[exercise.level]} · {exercise.defaultDurationMin}분
                      {exercise.isUnilateral ? ' · 양쪽' : ''}
                      {exercise.springs && !exercise.springs.includes('기구별 설정')
                        ? ` · ${exercise.springs === 'Bodyweight' ? '맨몸' : exercise.springs}`
                        : ''}
                    </span>
                    {!eligible(exercise) && <small>기구·소도구·난이도 조건 확인</small>}
                  </div>
                  <div className="flow-pick-card__actions">
                    <button
                      type="button"
                      className={`flow-fav-button ${exercise.favoriteTag !== 'none' ? 'is-favorited' : ''}`}
                      aria-label={`${exercise.nameKo} 즐겨찾기 ${exercise.favoriteTag !== 'none' ? '해제' : '등록'}`}
                      aria-pressed={exercise.favoriteTag !== 'none'}
                      onClick={() =>
                        s.setExerciseFavoriteTag(
                          exercise.id,
                          exercise.favoriteTag !== 'none' ? 'none' : 'signature',
                        )
                      }
                    >
                      <Heart
                        size={15}
                        strokeWidth={1.5}
                        fill={exercise.favoriteTag !== 'none' ? 'currentColor' : 'none'}
                      />
                    </button>
                    <button
                      className="flow-add-button"
                      aria-label={`${exercise.nameKo} ${included.has(exercise.id) ? '추가됨' : '추가'}`}
                      disabled={included.has(exercise.id) || !insertionResolution.success}
                      aria-describedby={
                        !insertionResolution.success ? 'flow-insertion-error' : undefined
                      }
                      onClick={() => addExercise(exercise)}
                    >
                      {included.has(exercise.id) ? (
                        <Check size={17} strokeWidth={1.5} />
                      ) : (
                        <Plus size={17} strokeWidth={1.5} />
                      )}
                    </button>
                    {included.has(exercise.id) && (
                      <button
                        type="button"
                        className="flow-add-again-button"
                        aria-label={`${exercise.nameKo} 한 번 더 추가`}
                        disabled={!insertionResolution.success}
                        onClick={() => addExercise(exercise, undefined, true)}
                      >
                        +1
                      </button>
                    )}
                  </div>
                </article>
              ))
            ) : (
              <div className="flow-no-results">
                <Search size={24} strokeWidth={1.5} />
                <strong>조건에 맞는 동작이 없어요</strong>
                <p>
                  {eligibleOnly
                    ? "현재 '내 보유 장비만 보기' 조건이 켜져 있어 표시할 동작이 없어요."
                    : '검색어를 줄이거나 수업 조건을 확인해 주세요'}
                </p>
                <button
                  type="button"
                  className="flow-button flow-button--primary"
                  onClick={() => {
                    setQuery('');
                    setCategory('all');
                    setEligibleOnly(false);
                  }}
                >
                  검색 범위 넓히기
                </button>
                <button
                  type="button"
                  className="flow-text-button"
                  onClick={() => setConditionsOpen(true)}
                >
                  기구·소도구 조건 보기
                </button>
              </div>
            )}
          </div>
        </aside>

        <div className="flow-plan-column">
          <div className="flow-plan" aria-label="내 수업 시퀀스">
            <div className="flow-panel-heading">
              <div>
                <span className="flow-step-number">02</span>
                <h2 ref={planHeadingRef} tabIndex={-1}>
                  내 시퀀스
                </h2>
                <span className="flow-count">동작 {exerciseCount}개</span>
              </div>
              <button
                className="flow-icon-button"
                disabled={!s.undoStack.length}
                onClick={() => {
                  s.undoSequence();
                  setNotice('마지막 편집을 되돌렸습니다.');
                }}
                aria-label="마지막 편집 되돌리기"
              >
                <Undo2 size={17} strokeWidth={1.5} />
              </button>
            </div>
            <div className="flow-time-overview">
              <div>
                <strong className="pf-hero-duration">
                  <CountUp value={total} format={minutesTweened} />
                </strong>
                <span> / 목표 {s.activeTargetMinutes}분</span>
                <button
                  className="flow-text-button"
                  disabled={!exerciseCount}
                  onClick={() => {
                    try {
                      setFitPreview({
                        steps: s.activeSteps,
                        target: s.activeTargetMinutes,
                        fitted: fitSequenceDuration(s.activeSteps, s.activeTargetMinutes),
                      });
                    } catch (error) {
                      const lockedAndRestSec = s.activeSteps
                        .filter((step) => step.locked || isRestStep(step))
                        .reduce((sum, step) => sum + getStepTiming(step).totalSec, 0);
                      const adjustable = s.activeSteps.filter(
                        (step) => !step.locked && !isRestStep(step),
                      );
                      const minFloorSec = adjustable.reduce(
                        (sum, step) =>
                          sum +
                          Math.ceil(
                            Math.max(60, (step.explanationSec ?? 0) + (step.transitionSec ?? 0) + 30),
                          ),
                        0,
                      );
                      const maxCapSec = adjustable.length * 20 * 60;
                      const message =
                        error instanceof Error ? error.message : '시간을 맞출 수 없습니다.';
                      setFitImpossibleInfo({
                        targetMin: s.activeTargetMinutes,
                        lockedAndRestSec,
                        adjustableCount: adjustable.length,
                        minPossibleSec: lockedAndRestSec + minFloorSec,
                        maxPossibleSec: lockedAndRestSec + maxCapSec,
                        reasonMessage: message,
                      });
                      setNotice(message);
                    }
                  }}
                >
                  시간 맞추기
                </button>
                {s.activeSteps.length > 0 && difference > 0 && gapFillCandidates.length > 0 && (
                  <button
                    type="button"
                    className="flow-text-button"
                    data-testid="smart-gap-fill-toggle"
                    aria-expanded={gapFillOpen}
                    onClick={() => setGapFillOpen((v) => !v)}
                  >
                    <Sparkles size={14} strokeWidth={1.5} aria-hidden="true" /> 빈 시간 채우기 추천
                  </button>
                )}
                {transitionOptimization.savedTransitionCount > 0 && (
                  <button
                    type="button"
                    className="flow-text-button"
                    data-testid="flow-open-transition-diff-btn"
                    onClick={() => setTransitionDiffPlan(transitionOptimization)}
                  >
                    <ArrowDownUp size={14} strokeWidth={1.5} aria-hidden="true" /> 전환{' '}
                    {transitionOptimization.savedTransitionCount}회 줄이기 미리보기
                  </button>
                )}
                {exerciseCount > 0 && (
                  <button
                    type="button"
                    className="flow-text-button"
                    data-testid="flow-open-quick-rehearsal-btn"
                    onClick={() => setQuickRehearsalOpen(true)}
                  >
                    빠른 요약 리허설
                  </button>
                )}
              </div>
              <div
                className="flow-time-bar"
                role="img"
                aria-label={`현재 ${minutes(total)}, 목표 ${s.activeTargetMinutes}분`}
              >
                {SECTIONS.map((section) => (
                  <span
                    key={section.id}
                    data-section={section.id}
                    style={{
                      width: `${target ? Math.min(100, (sectionTotals[section.id] / Math.max(total, target)) * 100) : 0}%`,
                    }}
                  />
                ))}
              </div>
              <div className="flow-section-legend">
                {SECTIONS.map((section) => (
                  <span key={section.id} data-section={section.id}>
                    <i />
                    {section.label} <b>{minutes(sectionTotals[section.id])}</b>
                  </span>
                ))}
              </div>
              {total > 0 && (
                <p className="flow-time-budget-formula" data-testid="flow-time-budget-formula">
                  구성 합계: 수행 {minutes(simulation.totals.movementSec)} (양쪽 포함) · 설명·전환{' '}
                  {minutes(simulation.totals.teachingSec + simulation.totals.transitionSec)}
                  {simulation.totals.restSec > 0
                    ? ` · 휴식 ${minutes(simulation.totals.restSec)}`
                    : ''}
                </p>
              )}
              <p>
                {!total
                  ? '동작을 추가하면 수업 시간이 채워집니다'
                  : difference > 0
                    ? `목표까지 ${minutes(difference)} 남았어요`
                    : difference < 0
                      ? `목표보다 ${minutes(-difference)} 길어요 · 시간을 조정하거나 그대로 진행할 수 있어요`
                      : '목표 시간에 맞게 구성했어요'}
              </p>
            </div>
            {gapFillOpen &&
              s.activeSteps.length > 0 &&
              difference > 0 &&
              gapFillCandidates.length > 0 && (
                <div
                  className="pf-gap-fill-drawer"
                  data-testid="smart-gap-fill-drawer"
                  role="region"
                  aria-label="부족한 시간 채우기 추천 미리보기"
                  style={{
                    margin: '12px 0 16px',
                    padding: '16px 18px',
                    borderRadius: '16px',
                    border: '1.5px dashed #355441',
                    background: '#eef5f0',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                  }}
                >
                  <div
                    className="pf-gap-fill-drawer__head"
                    style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '8px',
                    }}
                  >
                    <strong>
                      <Sparkles size={15} aria-hidden="true" /> 부족한{' '}
                      {Math.max(1, Math.round(difference / 60))}분 채우기 후보 (기존 수업은
                      덮어쓰지 않아요)
                    </strong>
                    <span style={{ fontSize: '0.78rem', color: '#355441', fontWeight: 600 }}>
                      검토 후 원하는 구성만 반영
                    </span>
                  </div>
                  <div
                    className="pf-gap-fill-drawer__items"
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                      gap: '8px',
                    }}
                  >
                    {gapFillCandidates.map((candidate) => (
                      <div
                        key={candidate.id}
                        className="pf-gap-fill-card"
                        style={{
                          padding: '10px 12px',
                          borderRadius: '12px',
                          background: '#ffffff',
                          border: '1px solid #cdd9d0',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '4px',
                        }}
                      >
                        <strong>{candidate.nameKo}</strong>
                        <span style={{ fontSize: '0.8rem', color: '#56685f' }}>
                          기본 {minutes(candidate.defaultDurationMin * 60)} ·{' '}
                          {candidate.targetMuscles.slice(0, 2).join('·') || '체간 정렬'}
                        </span>
                        {candidate.springs && <SpringVisualPills springs={candidate.springs} />}
                      </div>
                    ))}
                  </div>
                  <div
                    className="pf-gap-fill-drawer__actions"
                    style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}
                  >
                    <button
                      type="button"
                      className="flow-button flow-button--primary"
                      data-testid="smart-gap-fill-apply"
                      onClick={applyGapFill}
                    >
                      수업표 끝에 추가하기
                    </button>
                    <button
                      type="button"
                      className="flow-button"
                      onClick={() => setGapFillOpen(false)}
                    >
                      닫기
                    </button>
                  </div>
                </div>
              )}
            <div
              className="flow-sequence-list"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => drop(e)}
            >
              {!s.activeSteps.length ? (
                <div className="flow-empty-plan">
                  <span className="flow-empty-icon">
                    <Plus size={24} strokeWidth={1.5} />
                  </span>
                  <h3>첫 동작부터 시작해 볼까요?</h3>
                  <p>
                    동작 목록에서 원하는 동작을 추가하거나
                    <br />
                    끌어서 순서를 바꿀 수 있어요
                  </p>
                  <button className="flow-button flow-button--primary" onClick={showLibrary}>
                    <Plus size={16} strokeWidth={1.5} /> 동작 고르기
                  </button>
                  <button className="flow-text-button" onClick={() => setPresetsOpen(true)}>
                    <LayoutTemplate size={15} strokeWidth={1.5} /> 템플릿으로 시작하기{' '}
                    <ChevronRight size={15} strokeWidth={1.5} />
                  </button>
                  {s.savedSequences.length > 0 && (
                    <div className="flow-recent-plans">
                      <span>최근 수업에서 이어가기</span>
                      {s.savedSequences.slice(0, 2).map((sequence) => (
                        <button
                          key={sequence.id}
                          onClick={() => {
                            const current = usePilatesStore.getState();
                            const result = current.openSavedSequenceCopy(sequence.id, current);
                            setNotice(result.message);
                          }}
                        >
                          <Copy size={15} strokeWidth={1.5} />
                          <strong>{sequence.title}</strong>
                          <small>{sequence.targetMinutes}분</small>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                s.activeSteps.map((step, index) => {
                  const exercise = byId.get(step.exerciseId);
                  const section = getSequenceStepClassSection(step, s.activeSteps);
                  const previousSection = index
                    ? getSequenceStepClassSection(s.activeSteps[index - 1], s.activeSteps)
                    : null;
                  const title = isRestStep(step)
                    ? '휴식'
                    : (exercise?.nameKo ?? '동작을 찾을 수 없음');
                  const resolvedSetup =
                    exercise && !isRestStep(step)
                      ? resolveStepSetup(step, exercise, s.reformerBrand)
                      : null;
                  const stepTransition = describeStepTransitionFromPrevious(
                    s.activeSteps,
                    index,
                    byId,
                    s.reformerBrand,
                  );
                  const sideLabels = getStepSideLabels(step, exercise);
                  const stepEquipmentNeeds =
                    exercise && !isRestStep(step) ? getExerciseEquipment(exercise) : null;
                  const activeEquipPool =
                    criteria.availableEquipment ??
                    (criteria.apparatus === 'mixed' ? s.ownedEquipment : [criteria.apparatus]);
                  const stepNeedsReplacement = Boolean(
                    exercise &&
                      !isRestStep(step) &&
                      stepEquipmentNeeds &&
                      ((criteria.apparatus !== 'mixed' &&
                        exercise.apparatus !== criteria.apparatus) ||
                        !stepEquipmentNeeds.requiredEquipment.every(
                          (id) => activeEquipPool.includes(id) && s.ownedEquipment.includes(id),
                        )),
                  );
                  return (
                    <Fragment key={step.stepId}>
                      {section !== previousSection && (
                        <div className="flow-section-heading" data-section={section}>
                          <i />
                          <h3>{SECTIONS.find((item) => item.id === section)?.label}</h3>
                          <span>{minutes(sectionTotals[section])}</span>
                          <button
                            type="button"
                            className="flow-section-copy-btn"
                            aria-label={`${SECTIONS.find((item) => item.id === section)?.label} 구간 독립 복제`}
                            onClick={() => {
                              const res = usePilatesStore.getState().duplicateSectionSteps(section);
                              setNotice(res.message);
                            }}
                          >
                            <Copy size={12} strokeWidth={1.5} aria-hidden="true" /> 구간 복제
                          </button>
                        </div>
                      )}
                      <article
                        className={`flow-sequence-row ${step.locked ? 'is-locked' : ''} ${recentStep?.stepId === step.stepId ? 'is-recently-added' : ''}`}
                        data-testid="sequence-studio-row"
                        data-step-id={step.stepId}
                        draggable={!step.locked}
                        onDragStart={(event) => {
                          dragStep.current = step.stepId;
                          event.dataTransfer.setData('application/x-pilates-step', step.stepId);
                          event.dataTransfer.effectAllowed = 'move';
                        }}
                        onDragEnd={() => {
                          dragStep.current = null;
                        }}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => drop(e, step.stepId)}
                      >
                        <span className="flow-drag-handle" aria-hidden="true">
                          <GripVertical size={15} strokeWidth={1.5} />
                        </span>
                        <span className="flow-row-number">{index + 1}</span>
                        {exercise ? (
                          <button
                            className="flow-row-art"
                            aria-label={`${title} 자세와 자료 보기`}
                            onClick={() => props.onOpenYouTubePreview(exercise)}
                          >
                            <ExerciseMotionArtwork exercise={exercise} />
                          </button>
                        ) : (
                          <span className="flow-row-rest">
                            <Clock3 size={20} strokeWidth={1.5} />
                          </span>
                        )}
                        <div className="flow-row-content">
                          <button
                            id={`flow-step-${step.stepId}`}
                            className="flow-name-button"
                            disabled={step.locked}
                            onClick={() => setEditingId(step.stepId)}
                          >
                            {title}
                          </button>
                          <div className="flow-row-meta">
                            {exercise && <span>{APPARATUS_LABELS[exercise.apparatus].short}</span>}
                            {resolvedSetup && (
                              <span
                                className={`flow-row-spring-pill ${
                                  resolvedSetup.springUnknown ? 'is-unknown' : ''
                                }`}
                                title={`스튜디오 스프링 기준 (${s.reformerBrand})`}
                              >
                                {resolvedSetup.springLabelKo}
                              </span>
                            )}
                            {step.boxOverride && resolvedSetup && (
                              <span>{resolvedSetup.boxLabelKo}</span>
                            )}
                            {step.footbarOverride && resolvedSetup && (
                              <span>{resolvedSetup.footbarLabelKo}</span>
                            )}
                            {step.headrestOverride && resolvedSetup && (
                              <span>{resolvedSetup.headrestLabelKo}</span>
                            )}
                            {step.propOverride && resolvedSetup && (
                              <span>{resolvedSetup.propsLabelKo}</span>
                            )}
                            {(step.sideMode || sideLabels.length > 1) && (
                              <span>
                                {step.sideMode === 'left-then-right'
                                  ? '왼쪽 → 오른쪽'
                                  : step.sideMode === 'right-then-left'
                                    ? '오른쪽 → 왼쪽'
                                    : step.sideMode === 'left'
                                      ? '왼쪽만'
                                      : step.sideMode === 'right'
                                        ? '오른쪽만'
                                        : step.sideMode === 'together'
                                          ? '양쪽 함께'
                                          : '양쪽 수행'}
                              </span>
                            )}
                            {step.repetitions && <span>{step.repetitions}회</span>}
                            {step.locked && (
                              <span>
                                <LockKeyhole size={12} strokeWidth={1.5} /> 잠김
                              </span>
                            )}
                          </div>
                          {exercise && !isRestStep(step) && (
                            <div
                              className="flow-row-layers"
                              role="group"
                              aria-label={`${title} 난이도 레이어 선택`}
                            >
                              {LAYER_OPTIONS.map((opt) => {
                                const currentLayer = step.selectedLayer ?? 'standard';
                                const isActiveLayer = currentLayer === opt.id;
                                return (
                                  <button
                                    key={opt.id}
                                    type="button"
                                    className={`flow-layer-pill ${isActiveLayer ? 'is-active' : ''}`}
                                    aria-pressed={isActiveLayer}
                                    disabled={step.locked}
                                    onClick={() => {
                                      s.setStepLayer(index, opt.id);
                                      setNotice(
                                        `${title} 레이어를 ‘${opt.label}’으로 변경했습니다.`,
                                      );
                                    }}
                                  >
                                    {opt.label}
                                  </button>
                                );
                              })}
                            </div>
                          )}
                          {exercise &&
                            step.selectedLayer &&
                            step.selectedLayer !== 'standard' &&
                            exercise.layers[step.selectedLayer] && (
                              <p className="flow-row-layer-cue">
                                <i className="flow-row-layer-dot" aria-hidden="true" />
                                {exercise.layers[step.selectedLayer]}
                              </p>
                            )}
                          {stepTransition && stepTransition.changes.length > 0 && (
                            <span
                              className="flow-setup-change"
                              data-testid="flow-step-transition-badge"
                            >
                              전환 · {stepTransition.changes.join(' · ')}
                            </span>
                          )}
                          {stepTransition?.unknownNoticeKo && (
                            <span
                              className="flow-setup-change is-unknown"
                              data-testid="flow-step-unknown-setup-badge"
                            >
                              {stepTransition.unknownNoticeKo}
                            </span>
                          )}
                          {stepNeedsReplacement && !step.locked && (
                            <div className="flow-row-incompatible-bar">
                              <small>현재 장소·기구 조건과 다름</small>
                              <button
                                type="button"
                                className="flow-text-button"
                                data-testid={`flow-replace-step-${step.stepId}`}
                                onClick={() => setReplacingStepIndex(index)}
                              >
                                <RefreshCw size={13} strokeWidth={1.5} aria-hidden="true" /> 대체 동작
                                고르기
                              </button>
                            </div>
                          )}
                          {step.instructorNote && (
                            <p className="flow-row-note">{step.instructorNote}</p>
                          )}
                        </div>
                        <div className="flow-row-time-group">
                          <button
                            type="button"
                            className="flow-time-nudge"
                            disabled={step.locked || step.durationMin <= 1}
                            aria-label={`${title} 30초 줄이기`}
                            onClick={() => s.adjustStepDuration(index, -0.5)}
                          >
                            -30초
                          </button>
                          <button
                            className="flow-row-time"
                            disabled={step.locked}
                            onClick={() => setEditingId(step.stepId)}
                            aria-label={`${title} 시간과 메모 편집`}
                          >
                            <Clock3 size={14} strokeWidth={1.5} />
                            {minutes(getStepTiming(step).totalSec)}
                          </button>
                          <button
                            type="button"
                            className="flow-time-nudge"
                            disabled={step.locked || step.durationMin >= 20}
                            aria-label={`${title} 30초 늘리기`}
                            onClick={() => s.adjustStepDuration(index, 0.5)}
                          >
                            +30초
                          </button>
                        </div>
                        <div className="flow-row-actions">
                          <button
                            className="flow-icon-button"
                            aria-label={`${index + 1}번 ${title} 위로`}
                            disabled={
                              index === 0 || step.locked || s.activeSteps[index - 1]?.locked
                            }
                            onClick={() => {
                              s.moveStep(index, 'up');
                              setNotice(`${title}을 위로 이동했습니다.`);
                            }}
                          >
                            <ArrowUp size={16} strokeWidth={1.5} />
                          </button>
                          <button
                            className="flow-icon-button"
                            aria-label={`${index + 1}번 ${title} 아래로`}
                            disabled={
                              index === s.activeSteps.length - 1 ||
                              step.locked ||
                              s.activeSteps[index + 1]?.locked
                            }
                            onClick={() => {
                              s.moveStep(index, 'down');
                              setNotice(`${title}을 아래로 이동했습니다.`);
                            }}
                          >
                            <ArrowDown size={16} strokeWidth={1.5} />
                          </button>
                          <button
                            className="flow-icon-button"
                            aria-label={`${index + 1}번 ${title} 복제`}
                            onClick={() => {
                              const res = usePilatesStore
                                .getState()
                                .duplicateSequenceStep(step.stepId);
                              setNotice(res.message);
                              if (res.success && res.stepId) {
                                setRecentAddition({
                                  sequenceId: s.activeSequenceId,
                                  stepId: res.stepId,
                                });
                              }
                            }}
                          >
                            <Copy size={15} strokeWidth={1.5} />
                          </button>
                          <button
                            className="flow-icon-button"
                            aria-label={`${title} ${step.locked ? '잠금 해제' : '잠그기'}`}
                            onClick={() => s.toggleStepLock(index)}
                          >
                            {step.locked ? (
                              <UnlockKeyhole size={16} strokeWidth={1.5} />
                            ) : (
                              <LockKeyhole size={16} strokeWidth={1.5} />
                            )}
                          </button>
                          <button
                            className="flow-icon-button"
                            aria-label={`${index + 1}번 ${title} 삭제`}
                            disabled={step.locked}
                            onClick={() => {
                              const nextId =
                                s.activeSteps[index + 1]?.stepId ??
                                s.activeSteps[index - 1]?.stepId;
                              s.removeStep(index);
                              setNotice(`${title}을 삭제했습니다. 되돌리기로 복원할 수 있어요.`);
                              requestAnimationFrame(() => {
                                const titleButton = nextId
                                  ? document.getElementById(`flow-step-${nextId}`)
                                  : null;
                                const focusTarget = titleButton?.matches(':disabled')
                                  ? titleButton
                                      .closest('article')
                                      ?.querySelector<HTMLElement>('button:not(:disabled)')
                                  : titleButton;
                                (focusTarget ?? planHeadingRef.current)?.focus();
                              });
                            }}
                          >
                            <Trash2 size={16} strokeWidth={1.5} />
                          </button>
                        </div>
                      </article>
                    </Fragment>
                  );
                })
              )}
            </div>
            {s.activeSteps.length > 0 && (
              <div className="flow-plan-additions">
                <button className="flow-button" onClick={showLibrary}>
                  <Plus size={16} strokeWidth={1.5} /> 동작 추가
                </button>
                <button
                  className="flow-text-button"
                  onClick={() => setNotice(s.addRestStep(1).message)}
                >
                  <Clock3 size={15} strokeWidth={1.5} /> 휴식 1분 추가
                </button>
              </div>
            )}
            {s.activeSteps.length > 0 && spinalBalanceSummary.totalExerciseCount > 0 && (
              <section
                className="pf-class-balance-mini-strip"
                data-testid="workbench-spinal-balance-strip"
                aria-label="수업 척추 움직임 및 양측 대칭 요약"
              >
                <div className="pf-class-balance-mini-strip__pills">
                  <strong style={{ fontSize: '0.78rem', color: '#1f4435' }}>
                    척추 4면 {spinalBalanceSummary.coveredPlanesCount}/4
                  </strong>
                  {(
                    [
                      ['flexion', '굴곡'],
                      ['extension', '신전'],
                      ['lateral', '측굴'],
                      ['rotation', '회전'],
                    ] as const
                  ).map(([plane, labelKo]) => {
                    const count = spinalBalanceSummary.planeCounts[plane];
                    return (
                      <span
                        key={plane}
                        className={`pf-plane-chip ${count > 0 ? 'is-covered' : ''}`}
                      >
                        {labelKo} {count}
                      </span>
                    );
                  })}
                  <span className="pf-plane-chip">
                    양측 수행 {spinalBalanceSummary.unilateralStepCount}개
                  </span>
                  <span className="pf-plane-chip">
                    스프링 변경 {spinalBalanceSummary.springChangeCount}회
                  </span>
                </div>
                {spinalBalanceSummary.missingPlaneHintKo && (
                  <small style={{ color: '#55685e', fontWeight: 600 }}>
                    {spinalBalanceSummary.missingPlaneHintKo}
                  </small>
                )}
              </section>
            )}
            {s.activeSteps.length > 0 && (
              <section
                className="pf-spring-ribbon-board"
                data-testid="spring-timeline-ribbon"
                role="region"
                aria-label="타임라인 및 스프링 흐름 보드"
                style={{
                  margin: '10px 0 12px',
                  padding: '14px 16px',
                  borderRadius: '16px',
                  background: '#fcfbf8',
                  border: '1px solid rgba(31, 27, 22, 0.08)',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '6px',
                    marginBottom: '6px',
                  }}
                >
                  <span className="pf-step-kicker-badge">스프링 흐름 · 시간 비율</span>
                  <small style={{ fontSize: '0.78rem', color: '#56685f' }}>
                    카드를 누르면 해당 순서로 이동합니다
                  </small>
                </div>
                <div
                  className="pf-spring-ribbon-track"
                  style={{
                    display: 'flex',
                    gap: '8px',
                    overflowX: 'auto',
                    overscrollBehavior: 'contain',
                    padding: '6px 0 4px',
                  }}
                >
                  {s.activeSteps.map((step, index) => {
                    const exercise = !isRestStep(step) ? byId.get(step.exerciseId) : undefined;
                    const rawSpring = step.customSpringOverride || exercise?.springs || '';
                    const tone = isRestStep(step) ? 'is-sage' : springToneClass(rawSpring);
                    const toneStyle = SPRING_TONE_STYLES[tone];
                    const durationSec = getStepTiming(step).totalSec;
                    const blockStyle: CSSProperties = {
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'flex-start',
                      justifyContent: 'space-between',
                      gap: '6px',
                      minHeight: '76px',
                      padding: '8px 12px',
                      borderRadius: '12px',
                      border: '1px solid',
                      borderColor: toneStyle.borderColor,
                      background: toneStyle.background,
                      textAlign: 'left',
                      flexShrink: 0,
                      color: '#1d201c',
                      width: `${Math.max(128, Math.round((durationSec / 60) * 24))}px`,
                    };
                    const inner = (
                      <>
                        <small style={{ fontSize: '0.74rem', opacity: 0.8 }}>
                          {String(index + 1).padStart(2, '0')} · {minutes(durationSec)}
                        </small>
                        <strong style={{ fontSize: '0.86rem', lineHeight: 1.3 }}>
                          {isRestStep(step) ? '중간 휴식' : (exercise?.nameKo ?? '동작')}
                        </strong>
                        {!isRestStep(step) && rawSpring && (
                          <SpringVisualPills springs={rawSpring} />
                        )}
                      </>
                    );
                    return isRestStep(step) ? (
                      <span
                        key={step.stepId}
                        className={`pf-spring-ribbon-block ${tone}`}
                        style={{ ...blockStyle, cursor: 'default' }}
                      >
                        {inner}
                      </span>
                    ) : (
                      <button
                        key={step.stepId}
                        type="button"
                        className={`pf-spring-ribbon-block ${tone}`}
                        style={{ ...blockStyle, cursor: 'pointer' }}
                        onClick={() => revealStep(step.stepId)}
                        aria-label={`${index + 1}번 ${exercise?.nameKo ?? '동작'} 위치로 이동`}
                      >
                        {inner}
                      </button>
                    );
                  })}
                </div>
                <details
                  style={{
                    marginTop: '10px',
                    borderTop: '1px solid rgba(31, 27, 22, 0.08)',
                    paddingTop: '8px',
                  }}
                >
                  <summary
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      minHeight: '44px',
                      cursor: 'pointer',
                      fontSize: '0.8rem',
                      fontWeight: 500,
                      color: '#4c6155',
                    }}
                  >
                    스프링 색상 안내 보기 (기구 제조사별 장력은 현장에서 확인)
                  </summary>
                  <ul
                    style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: '6px 14px',
                      listStyle: 'none',
                      margin: '8px 0 0',
                      padding: 0,
                    }}
                  >
                    {SPRING_TENSION_LEGEND.map((item) => (
                      <li
                        key={item.label}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          fontSize: '0.8rem',
                        }}
                      >
                        <i
                          aria-hidden="true"
                          style={{
                            width: '10px',
                            height: '10px',
                            borderRadius: '50%',
                            background: item.swatch,
                            border: '1px solid rgba(0,0,0,0.15)',
                            display: 'inline-block',
                          }}
                        />
                        {item.label} = {item.meaning} ({item.tier})
                      </li>
                    ))}
                  </ul>
                </details>
              </section>
            )}
            <div className="flow-plan-footer">
              <span>
                <i />
                {s.persistenceError
                  ? '이 브라우저 미저장 · 현재 화면(메모리)에만 임시 보관 중'
                  : '작성 중인 수업은 이 기기(브라우저)에만 로컬 보관 · 서버 자동 동기화 없음'}
              </span>
              {s.persistenceError ? (
                <div className="flow-footer-recovery-actions">
                  <button
                    type="button"
                    className="flow-text-button"
                    data-testid="flow-retry-save-btn"
                    onClick={() => {
                      void save();
                    }}
                  >
                    <RefreshCw size={13} strokeWidth={1.5} aria-hidden="true" /> 다시 저장 시도
                  </button>
                  <button
                    type="button"
                    className="flow-text-button"
                    data-testid="flow-footer-backup-btn"
                    onClick={() => {
                      const ok = downloadEmergencyBackupJson();
                      setNotice(
                        ok
                          ? '메모리 작업본을 포함한 JSON 백업 파일을 내려받았습니다. 저장 공간 확보 후 저장을 다시 눌러 주세요.'
                          : '백업 파일을 만들지 못했습니다. 브라우저 다운로드 권한을 확인해 주세요.',
                      );
                    }}
                  >
                    JSON 백업 내보내기
                  </button>
                </div>
              ) : s.activeSteps.length > 1 ? (
                <span>끌어서 순서 변경 · 버튼으로도 이동 가능</span>
              ) : null}
            </div>
          </div>

          <div className="flow-actionbar">
            <div>
              <strong>
                {exerciseCount}개 동작 · {minutes(total)}
              </strong>
              {startBlockers.length ? (
                <ul
                  id="sequence-studio-start-blockers"
                  className="flow-start-blockers"
                  aria-label="수업 시작 전 확인"
                >
                  {startBlockers.map((reason) => (
                    <li key={reason.code}>
                      {reason.stepIndices.length > 0 && (
                        <span>
                          {reason.stepIndices.map((index) => index + 1).join(', ')}번 항목 ·{' '}
                        </span>
                      )}
                      {reason.message}
                    </li>
                  ))}
                </ul>
              ) : (
                <small
                  data-testid="flow-actionbar-save-hint"
                  data-save-status={saveStatus}
                  className={
                    saveStatus === 'save-failed' || saveStatus === 'cross-tab-conflict'
                      ? 'is-persistence-warning'
                      : saveStatus === 'dirty'
                        ? 'is-dirty-hint'
                        : undefined
                  }
                >
                  {saveStatus === 'save-failed'
                    ? '기기 저장 미완료 · 메모리 작업본 유지 중 (JSON 백업 후 여유 공간을 확보해 다시 저장하세요)'
                    : saveStatus === 'cross-tab-conflict'
                      ? '다른 탭 변경 감지 · 자동 덮어쓰기 중단됨 (위 배너에서 불러오기 또는 사본 저장 선택)'
                      : saveStatus === 'saving'
                        ? '이 브라우저에 저장하는 중…'
                        : saveStatus === 'saved-local'
                          ? s.saveFeedback || '이 브라우저에 수업을 저장했습니다.'
                          : saveStatus === 'dirty'
                            ? '저장 후 수정됨 (미저장 초안) · 저장을 눌러 이 브라우저에 반영하세요'
                            : exerciseCount === 0
                              ? '왼쪽 목록에서 첫 동작을 담아 수업을 시작해 보세요'
                              : '시퀀스를 저장하고 수업을 시작하세요 (이 기기 로컬 저장)'}
                </small>
              )}
            </div>
            <button
              className="flow-button"
              disabled={!exerciseCount || isSaving}
              onClick={() => {
                void save();
              }}
            >
              <Bookmark size={16} strokeWidth={1.5} /> {isSaving ? '저장 중…' : '저장'}
            </button>
            <button
              className="flow-button flow-button--primary"
              disabled={!simulation.gate.canRehearse}
              aria-describedby={startBlockers.length ? 'sequence-studio-start-blockers' : undefined}
              onClick={start}
            >
              <Play size={16} strokeWidth={1.5} fill="currentColor" /> 수업 시작
            </button>
          </div>

          <div className="flow-studio-status" role="status" aria-live="polite">
            {s.persistenceError &&
            (notice.includes('저장한 수업에 보관했습니다') || notice.includes('저장했습니다'))
              ? s.persistenceError
              : notice || s.persistenceError || ''}
          </div>
        </div>
      </div>

      {editingStep && (
        <StepEditor
          key={editingStep.stepId}
          step={editingStep}
          exercise={byId.get(editingStep.exerciseId)}
          onClose={() => setEditingId(null)}
          onNotice={setNotice}
        />
      )}
      {presetsOpen && (
        <LightDismissDialog
          open
          onClose={() => setPresetsOpen(false)}
          title="템플릿으로 시작"
          subtitle="수업 전체 또는 필요한 구간을 골라 수정할 수 있어요"
          maxWidth="1080px"
        >
          <Suspense fallback={<p role="status">템플릿을 불러오는 중…</p>}>
            <PresetPicker
              onApplied={(message) => {
                setNotice(message);
                setPresetsOpen(false);
                setMobilePane('plan');
              }}
            />
          </Suspense>
        </LightDismissDialog>
      )}
      {conditionsOpen && (
        <LightDismissDialog
          open
          onClose={() => setConditionsOpen(false)}
          title="수업 조건"
          subtitle="기구와 소도구를 선택하면 추가할 수 있는 동작에 반영됩니다"
          maxWidth="600px"
          variant="sheet"
        >
          <div className="flow-conditions">
            <fieldset>
              <legend>이 수업에서 사용할 기구</legend>
              <div className="flow-choice-grid">
                {EQUIPMENT_OPTIONS.filter(
                  (item) =>
                    criteria.apparatus === 'mixed' || item.apparatusFamily === criteria.apparatus,
                ).map((item) => (
                  <label key={item.id} className="flow-checkbox">
                    <input
                      type="checkbox"
                      disabled={!s.ownedEquipment.includes(item.id)}
                      checked={criteria.availableEquipment?.includes(item.id) ?? false}
                      onChange={() =>
                        updateConditions({
                          availableEquipment: criteria.availableEquipment?.includes(item.id)
                            ? criteria.availableEquipment.filter((id) => id !== item.id)
                            : [...(criteria.availableEquipment ?? []), item.id],
                        })
                      }
                    />
                    {item.labelKo}
                    {!s.ownedEquipment.includes(item.id) ? ' · 미보유' : ''}
                  </label>
                ))}
              </div>
            </fieldset>
            <fieldset>
              <legend>소도구 · 여러 개 선택 가능</legend>
              <div className="flow-choice-grid">
                {s.ownedProps
                  .filter((prop) => prop !== 'none')
                  .map((prop) => (
                    <label key={prop} className="flow-checkbox">
                      <input
                        type="checkbox"
                        checked={criteria.preferredProps.includes(prop)}
                        onChange={() =>
                          updateConditions({
                            preferredProps: criteria.preferredProps.includes(prop)
                              ? criteria.preferredProps.filter((id) => id !== prop)
                              : [...criteria.preferredProps, prop],
                          })
                        }
                      />
                      {PROP_LABELS[prop].ko}
                    </label>
                  ))}
              </div>
            </fieldset>
            <fieldset>
              <legend>내 스튜디오 리포머 스프링 기준</legend>
              <div
                className="flow-choice-grid"
                role="radiogroup"
                aria-label="스튜디오 리포머 스프링 브랜드"
              >
                {BRAND_SPRING_OPTIONS.map((brandOpt) => (
                  <label key={brandOpt.id} className="flow-checkbox">
                    <input
                      type="radio"
                      name="studio-reformer-brand"
                      checked={s.reformerBrand === brandOpt.id}
                      onChange={() => {
                        s.setReformerBrand(brandOpt.id);
                        setNotice(
                          `리포머 스프링 표기를 ‘${brandOpt.shortLabelKo}’ 기준으로 맞췄습니다.`,
                        );
                      }}
                    />
                    {brandOpt.shortLabelKo}
                  </label>
                ))}
              </div>
            </fieldset>
            <p className="flow-hint">기존에 담은 동작은 조건을 바꿔도 유지됩니다</p>
            <button
              className="flow-text-button"
              onClick={() => {
                setConditionsOpen(false);
                props.onOpenInventory();
              }}
            >
              보유 기구·소도구 수정
            </button>
            <div className="flow-dialog-actions">
              <button
                className="flow-button flow-button--primary"
                onClick={() => setConditionsOpen(false)}
              >
                완료
              </button>
            </div>
          </div>
        </LightDismissDialog>
      )}
      {newClassOpen && (
        <LightDismissDialog
          open
          onClose={() => setNewClassOpen(false)}
          title="새 수업을 만들까요?"
          subtitle="지금 작성한 수업을 저장해 두면 언제든 다시 사용할 수 있어요"
        >
          <div className="flow-dialog-actions">
            <button className="flow-button" onClick={() => setNewClassOpen(false)}>
              계속 편집
            </button>
            <button
              className="flow-button"
              onClick={() => {
                setNotice(s.startBlankSequence().message);
                setNewClassOpen(false);
              }}
            >
              저장 없이 새로 만들기
            </button>
            <button
              className="flow-button flow-button--primary"
              onClick={async () => {
                if (await save()) {
                  setNotice(usePilatesStore.getState().startBlankSequence().message);
                  setNewClassOpen(false);
                }
              }}
            >
              저장하고 새로 만들기
            </button>
          </div>
        </LightDismissDialog>
      )}
      {fitPreview && (
        <LightDismissDialog
          open
          onClose={() => setFitPreview(null)}
          title={`목표 ${fitPreview.target}분에 맞추기`}
          subtitle="잠긴 동작과 휴식은 고정 보존하고, 나머지 동작 시간만 조정합니다"
        >
          <p className="flow-hint" data-testid="flow-fit-preserved-summary">
            보존 항목: 잠금 {fitPreview.steps.filter((st) => st.locked).length}개 · 휴식{' '}
            {fitPreview.steps.filter((st) => isRestStep(st)).length}개 고정 유지 (원본은 적용 전까지
            변경되지 않음)
          </p>
          <div className="flow-fit-preview">
            {fitPreview.fitted.map((step, index) => {
              const beforeSec = getStepTiming(fitPreview.steps[index]).totalSec;
              const afterSec = getStepTiming(step).totalSec;
              const deltaSec = afterSec - beforeSec;
              const deltaText =
                deltaSec === 0
                  ? fitPreview.steps[index].locked
                    ? '잠금 보존'
                    : isRestStep(step)
                      ? '휴식 보존'
                      : '변동 없음'
                  : `${deltaSec > 0 ? '+' : '-'}${minutes(Math.abs(deltaSec))}`;
              return (
                <div key={step.stepId}>
                  <span>{isRestStep(step) ? '휴식' : byId.get(step.exerciseId)?.nameKo}</span>
                  <small>
                    {minutes(beforeSec)} → <b>{minutes(afterSec)}</b> ({deltaText})
                  </small>
                </div>
              );
            })}
          </div>
          <div className="flow-dialog-actions">
            <button className="flow-button" onClick={() => setFitPreview(null)}>
              취소
            </button>
            <button
              className="flow-button flow-button--primary"
              onClick={() => {
                const current = usePilatesStore.getState();
                if (
                  current.activeSteps !== fitPreview.steps ||
                  current.activeTargetMinutes !== fitPreview.target
                )
                  setNotice('수업이 변경되었습니다. 시간 미리보기를 다시 열어 주세요.');
                else {
                  current.fitActiveDuration();
                  setNotice(
                    usePilatesStore.getState().generationError ?? '동작 시간을 목표에 맞췄습니다.',
                  );
                }
                setFitPreview(null);
              }}
            >
              이 시간으로 적용
            </button>
          </div>
        </LightDismissDialog>
      )}
      {fitImpossibleInfo && (
        <LightDismissDialog
          open
          onClose={() => setFitImpossibleInfo(null)}
          title={`목표 ${fitImpossibleInfo.targetMin}분 자동 맞춤 안내`}
          subtitle="무리하게 동작 시간을 깎지 않고 현재 구성을 그대로 보존했습니다"
        >
          <div className="flow-fit-impossible" data-testid="flow-fit-impossible-dialog">
            <p className="flow-error" role="status">
              {fitImpossibleInfo.reasonMessage}
            </p>
            <dl className="flow-fit-impossible__stats">
              <div>
                <dt>고정 보존 시간 (잠금·휴식)</dt>
                <dd>{minutes(fitImpossibleInfo.lockedAndRestSec)}</dd>
              </div>
              <div>
                <dt>조정 가능 동작 수</dt>
                <dd>{fitImpossibleInfo.adjustableCount}개</dd>
              </div>
              <div>
                <dt>안전 최소 ~ 최대 가능 총시간</dt>
                <dd>
                  {minutes(fitImpossibleInfo.minPossibleSec)} ~{' '}
                  {minutes(fitImpossibleInfo.maxPossibleSec)}
                </dd>
              </div>
              <div>
                <dt>목표 시간과의 차이</dt>
                <dd>
                  {fitImpossibleInfo.targetMin * 60 < fitImpossibleInfo.minPossibleSec
                    ? `최소 보장 시간보다 ${minutes(
                        fitImpossibleInfo.minPossibleSec - fitImpossibleInfo.targetMin * 60,
                      )} 짧음`
                    : fitImpossibleInfo.targetMin * 60 > fitImpossibleInfo.maxPossibleSec
                      ? `최대 배분 한도보다 ${minutes(
                          fitImpossibleInfo.targetMin * 60 - fitImpossibleInfo.maxPossibleSec,
                        )} 김`
                      : '조정 가능 동작 없음'}
                </dd>
              </div>
            </dl>
            <div className="flow-dialog-actions">
              <button
                type="button"
                className="flow-button flow-button--primary"
                onClick={() => setFitImpossibleInfo(null)}
              >
                현재 시간 유지하고 닫기
              </button>
            </div>
          </div>
        </LightDismissDialog>
      )}
      {transitionDiffPlan && (
        <LightDismissDialog
          open
          onClose={() => setTransitionDiffPlan(null)}
          title="기구·자세 전환 줄이기 전후 비교"
          subtitle={`준비·마무리 구간, 잠긴 단계(${transitionDiffPlan.preservedLockedCount}개), 휴식(${transitionDiffPlan.preservedRestCount}개), 좌우 쌍(${transitionDiffPlan.preservedPairCount}쌍)을 보존합니다`}
        >
          <div className="flow-transition-diff" data-testid="flow-transition-diff-dialog">
            <p className="flow-hint">
              예상 세팅 전환: <strong>{transitionDiffPlan.beforeTransitionCount}회</strong> →{' '}
              <strong>{transitionDiffPlan.afterTransitionCount}회</strong> (
              {transitionDiffPlan.savedTransitionCount}회 감소)
            </p>
            <div className="flow-fit-preview">
              {transitionDiffPlan.diffRows.map((row) => (
                <div key={row.position}>
                  <span>
                    {row.position}번 · {row.beforeTitleKo}
                  </span>
                  <small>
                    {row.changed ? (
                      <>
                        → <b>{row.afterTitleKo}</b>
                      </>
                    ) : row.preservedReason === 'locked' ? (
                      '잠금 보존'
                    ) : row.preservedReason === 'rest' ? (
                      '휴식 보존'
                    ) : row.preservedReason === 'bilateral-pair' ? (
                      '좌우 쌍 보존'
                    ) : row.preservedReason === 'section-boundary' ? (
                      '구간 고정'
                    ) : (
                      '위치 유지'
                    )}
                  </small>
                </div>
              ))}
            </div>
            <p className="flow-hint">{transitionDiffPlan.disclaimerKo}</p>
            <div className="flow-dialog-actions">
              <button
                type="button"
                className="flow-button"
                onClick={() => setTransitionDiffPlan(null)}
              >
                취소
              </button>
              <button
                type="button"
                className="flow-button flow-button--primary"
                data-testid="flow-apply-transition-diff-btn"
                onClick={() => {
                  const current = usePilatesStore.getState();
                  if (current.activeSteps !== transitionDiffPlan.beforeSteps) {
                    setNotice('시퀀스가 변경되었습니다. 미리보기를 다시 열어 확인해 주세요.');
                  } else {
                    usePilatesStore.setState({
                      undoStack: [...current.undoStack.slice(-19), createSequenceSnapshot(current)],
                      activeSteps: transitionDiffPlan.afterSteps,
                      generationError: null,
                      saveFeedback: null,
                    });
                    setNotice(
                      `본운동 순서를 정돈해 기구·자세 전환을 ${transitionDiffPlan.savedTransitionCount}회 줄였습니다. 되돌리기로 복원할 수 있어요.`,
                    );
                  }
                  setTransitionDiffPlan(null);
                }}
              >
                순서 변경 적용
              </button>
            </div>
          </div>
        </LightDismissDialog>
      )}
      {replacingStepIndex !== null && s.activeSteps[replacingStepIndex] && (
        <LightDismissDialog
          open
          onClose={() => setReplacingStepIndex(null)}
          title="현재 장소·기구 조건에 맞는 대체 동작"
          subtitle="선택한 동작만 교체하며, 원본 저장 시퀀스는 변경되지 않습니다"
        >
          {(() => {
            const targetStep = s.activeSteps[replacingStepIndex]!;
            const proposals = proposeBlockAlternatives(
              targetStep.blockCategory,
              replacingStepIndex,
              s.activeSteps,
              s.exercises,
              s.historyLogs,
              s.activeTargetGroupId,
              criteria,
            );
            const fallbackPool = proposals.length
              ? proposals.map((p) => p.exercise)
              : s.exercises.filter((ex) => eligible(ex)).slice(0, 6);
            return (
              <div className="flow-replace-picker" data-testid="flow-replace-picker-dialog">
                {fallbackPool.length ? (
                  <div className="flow-fit-preview">
                    {fallbackPool.map((candidate) => (
                      <div key={candidate.id}>
                        <span>
                          <strong>{candidate.nameKo}</strong> ·{' '}
                          {APPARATUS_LABELS[candidate.apparatus].short} · Lv {candidate.level}
                        </span>
                        <button
                          type="button"
                          className="flow-button flow-button--primary"
                          data-testid={`flow-confirm-replace-${candidate.id}`}
                          onClick={() => {
                            usePilatesStore
                              .getState()
                              .replaceStepExercise(replacingStepIndex, candidate.id);
                            const err = usePilatesStore.getState().generationError;
                            setNotice(
                              err ??
                                `${replacingStepIndex + 1}번 항목을 ‘${candidate.nameKo}’ 동작으로 교체했습니다.`,
                            );
                            if (!err) setReplacingStepIndex(null);
                          }}
                        >
                          이 동작으로 교체
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="flow-hint">
                    현재 기구·소도구 조건에 맞는 미중복 동작이 없습니다. 수업 조건에서 사용 가능
                    기구·소도구를 확인해 주세요.
                  </p>
                )}
                <div className="flow-dialog-actions">
                  <button
                    type="button"
                    className="flow-button"
                    onClick={() => setReplacingStepIndex(null)}
                  >
                    닫기
                  </button>
                </div>
              </div>
            );
          })()}
        </LightDismissDialog>
      )}
      {quickRehearsalOpen && (
        <Suspense fallback={<p role="status">빠른 요약 리허설을 여는 중…</p>}>
          <LazyQuickPlanRehearsal
            onClose={() => setQuickRehearsalOpen(false)}
            onSave={() => {
              usePilatesStore.getState().saveCurrentSequenceToBinder(true);
              setNotice('미리보기 스냅샷을 별도 사본으로 저장했습니다.');
            }}
            onStart={() => {
              setQuickRehearsalOpen(false);
              start();
            }}
            canStartClass={simulation.gate.canRehearse}
          />
        </Suspense>
      )}
      <RoutineTagSheetDialog
        open={Boolean(tagSheetTarget)}
        targetRoutineId={tagSheetTarget?.id ?? null}
        targetRoutineTitle={tagSheetTarget?.title ?? ''}
        onClose={() => setTagSheetTarget(null)}
        onFeedback={(msg) => setNotice(msg)}
      />
    </section>
  );
}
