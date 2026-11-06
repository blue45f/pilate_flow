import type { VisualPhaseId } from '../../data/movementVisualRigCatalog';
import type { MotionPatternReference } from '../../data/motionPatternReferences';
import type { MotionPrototypeReference } from '../../data/motionReferences';
import {
  DraftPlaybackController,
  type DraftPlaybackState,
  type DraftRepeatCount,
  type DraftSpeed,
} from '../../models/DraftPlaybackController';
import type { PilatesExercise } from '../../types/pilates';
import { clampMotionProgress, getMotionPhase } from '../../utils/motionReferenceModel';
import {
  resolveRenderableMotionDescriptor,
  type RenderableMotionDescriptor,
} from './adapters';
import type {
  MotionReadinessState,
  MotionSupportMode,
  ResolveMotionCoverageOptions,
} from './types';

export const DRAFT_CYCLE_MS = 8000;
export const DRAFT_SPEEDS: readonly DraftSpeed[] = Object.freeze([0.5, 0.75, 1]);
export const DRAFT_REPEAT_COUNTS: readonly DraftRepeatCount[] = Object.freeze([
  1, 2, 3,
]);

export type { DraftPlaybackState, DraftRepeatCount, DraftSpeed };

export type MotionPlaybackControlKind =
  | 'continuous-draft-playback'
  | 'discrete-three-phase-selector'
  | 'unsupported-missing';

export const DISCRETE_VISUAL_PHASES: readonly VisualPhaseId[] = Object.freeze([
  'start',
  'middle',
  'end',
]);

export interface MotionCoveragePlayOptions {
  /**
   * Under `prefers-reduced-motion: reduce`, automatic playback is blocked.
   * Passing `{ explicitUserAction: true }` allows explicit manual execution by the user.
   */
  readonly explicitUserAction?: boolean;
}

export interface MotionCoveragePlaybackSnapshot {
  readonly exerciseId: string;
  readonly descriptor: RenderableMotionDescriptor;
  readonly mode: MotionSupportMode;
  readonly controlKind: MotionPlaybackControlKind;
  readonly temporalKind: 'continuous-progress' | 'discrete-three-phase' | 'none';
  readonly readinessState: MotionReadinessState;
  readonly playing: boolean;
  /**
   * True ONLY when the exercise has an authored continuous draft (`projected-3d` or `continuous-2d`).
   * Strictly `false` for all 77 `three-phase-2d` exercises and `missing`.
   */
  readonly isContinuousInterpolated: boolean;
  /**
   * Always `false`: discrete 3-phase 2D poses are never auto-interpolated to pretend to be continuous motion.
   */
  readonly isAutoInterpolatedFromDiscrete: false;
  /**
   * Finite progress in `[0, 1]` for continuous drafts (`projected-3d`, `continuous-2d`).
   * Strictly `null` for discrete `three-phase-2d` and `missing`.
   */
  readonly progress: number | null;
  /**
   * Discrete phase selection (`'start' | 'middle' | 'end'`) for `three-phase-2d` and derived phase for continuous drafts.
   * `null` for `missing`.
   */
  readonly selectedPhase: VisualPhaseId | null;
  readonly continuousPhaseLabelKo: string | null;
  readonly speed: DraftSpeed;
  readonly repeatCount: DraftRepeatCount;
  readonly currentCycle: number;
  readonly completedCycle: boolean;
  readonly reducedMotion: boolean;
  readonly explicitPlayGrantedUnderReducedMotion: boolean;
  readonly isBackgroundHidden: boolean;
  readonly activeVariantIndex: number;
  readonly activeVariantId: string | null;
  readonly availableVariantIds: readonly string[];
  readonly activePatternReference: MotionPatternReference | null;
  readonly activeLabPrototype: MotionPrototypeReference | null;
  readonly statusLabelKo: string;
  readonly modeDistinctionLabelKo: string;
  readonly canonicalMotionReady: false;
  readonly manualReady: false;
  readonly true3dSupported: false;
  readonly webgl3dReady: false;
  readonly anatomicalVerificationCompleted: false;
  readonly expertVerificationCompleted: false;
}

export interface MotionCoveragePlaybackControllerOptions {
  readonly exerciseOrId: string | PilatesExercise | null | undefined;
  readonly resolveOptions?: ResolveMotionCoverageOptions;
  readonly initialPhase?: VisualPhaseId;
  readonly cycleDurationMs?: number;
  readonly requestFrame?: (callback: FrameRequestCallback) => number;
  readonly cancelFrame?: (handle: number) => void;
  readonly now?: () => number;
  readonly isReducedMotion?: () => boolean;
  readonly isDocumentHidden?: () => boolean;
  readonly documentTarget?: Pick<Document, 'addEventListener' | 'removeEventListener'> | null;
  readonly windowTarget?: Pick<
    Window,
    'addEventListener' | 'removeEventListener' | 'matchMedia'
  > | null;
  readonly autoAttachListeners?: boolean;
  readonly onChange?: (snapshot: MotionCoveragePlaybackSnapshot) => void;
}

function mapContinuousProgressToVisualPhase(progress: number): VisualPhaseId {
  const safe = clampMotionProgress(progress);
  if (safe < 0.25) return 'start';
  if (safe < 0.75) return 'middle';
  return 'end';
}

function sanitizeFiniteProgress(value: number): number {
  if (Number.isNaN(value)) return 0;
  if (value === Infinity) return 1;
  if (value === -Infinity) return 0;
  return clampMotionProgress(value);
}

/**
 * Mode-aware typed playback controller that wraps and reuses `DraftPlaybackController`
 * (`src/models/DraftPlaybackController.ts`) for continuous drafts (`projected-3d` and `continuous-2d`),
 * while keeping the 77 discrete `three-phase-2d` exercises strictly on manual 3-step selection
 * (`start` / `middle` / `end`) without fake continuous auto-interpolation.
 */
export class MotionCoveragePlaybackController {
  private descriptor: RenderableMotionDescriptor;
  private resolveOptions: ResolveMotionCoverageOptions;
  private selectedPhase: VisualPhaseId;
  private activeVariantIndex = 0;
  private reducedMotion: boolean;
  private mediaEventReducedMotionOverride: boolean | null = null;
  private explicitPlayGrantedUnderReducedMotion = false;
  private isBackgroundHidden: boolean;
  private pageHiddenByEvent = false;
  private destroyed = false;
  private suppressDraftEmit = false;

  private readonly rawRequestFrame: (callback: FrameRequestCallback) => number;
  private readonly rawCancelFrame: (handle: number) => void;
  private readonly nowFn: (() => number) | undefined;
  private readonly customReducedMotionFn: (() => boolean) | undefined;
  private readonly isDocumentHiddenFn: () => boolean;
  private readonly docTarget: Pick<Document, 'addEventListener' | 'removeEventListener'> | null;
  private readonly winTarget: Pick<
    Window,
    'addEventListener' | 'removeEventListener' | 'matchMedia'
  > | null;
  private mediaQuery: MediaQueryList | null = null;
  private readonly onChange?: (snapshot: MotionCoveragePlaybackSnapshot) => void;

  private readonly draftEngine: DraftPlaybackController;
  private draftState: DraftPlaybackState = { progress: 0, speed: 1, playing: false };
  private repeatCount: DraftRepeatCount = 1;
  private pendingFrameHandle: number | null = null;
  private lastMonotonicTimestamp: number | null = null;
  private cleanupListeners: Array<() => void> = [];

  constructor(options: MotionCoveragePlaybackControllerOptions) {
    this.resolveOptions = options.resolveOptions ?? {};
    this.descriptor = resolveRenderableMotionDescriptor(options.exerciseOrId, this.resolveOptions);
    this.selectedPhase =
      options.initialPhase && DISCRETE_VISUAL_PHASES.includes(options.initialPhase)
        ? options.initialPhase
        : 'start';
    this.onChange = options.onChange;

    this.rawRequestFrame =
      options.requestFrame ??
      ((cb: FrameRequestCallback) =>
        typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function'
          ? window.requestAnimationFrame(cb)
          : 0);
    this.rawCancelFrame =
      options.cancelFrame ??
      ((handle: number) => {
        if (typeof window !== 'undefined' && typeof window.cancelAnimationFrame === 'function') {
          window.cancelAnimationFrame(handle);
        }
      });
    this.nowFn = options.now;

    this.winTarget =
      options.windowTarget !== undefined
        ? options.windowTarget
        : typeof window !== 'undefined'
          ? window
          : null;
    this.docTarget =
      options.documentTarget !== undefined
        ? options.documentTarget
        : typeof document !== 'undefined'
          ? document
          : null;

    this.mediaQuery =
      this.winTarget && typeof this.winTarget.matchMedia === 'function'
        ? this.winTarget.matchMedia('(prefers-reduced-motion: reduce)')
        : null;

    this.customReducedMotionFn = options.isReducedMotion;
    this.isDocumentHiddenFn =
      options.isDocumentHidden ??
      (() => Boolean(typeof document !== 'undefined' && document.hidden));

    this.reducedMotion = this.evaluateReducedMotion();
    this.isBackgroundHidden = this.evaluateBackgroundHidden();

    const safeCycleDurationMs =
      options.cycleDurationMs !== undefined &&
      Number.isFinite(options.cycleDurationMs) &&
      options.cycleDurationMs > 0
        ? options.cycleDurationMs
        : DRAFT_CYCLE_MS;

    this.draftEngine = new DraftPlaybackController({
      cycleMs: safeCycleDurationMs,
      requestFrame: (innerCallback) => this.scheduleSanitizedFrame(innerCallback),
      cancelFrame: (handle) => this.cancelSanitizedFrame(handle),
      canPlay: () => this.canContinuousEnginePlay(),
      onChange: (nextState) => {
        const safeProgress = sanitizeFiniteProgress(nextState.progress);
        this.draftState = {
          progress: safeProgress,
          speed: nextState.speed,
          playing: nextState.playing,
        };
        if (!nextState.playing) {
          this.explicitPlayGrantedUnderReducedMotion = false;
        }
        if (this.isContinuousMode()) {
          this.selectedPhase = mapContinuousProgressToVisualPhase(safeProgress);
        }
        if (!this.suppressDraftEmit) {
          this.emitChange();
        }
      },
    });

    if (options.autoAttachListeners !== false) {
      this.attachEnvironmentListeners();
    }
  }

  private evaluateReducedMotion(): boolean {
    if (this.mediaEventReducedMotionOverride !== null) {
      return this.mediaEventReducedMotionOverride;
    }
    if (this.customReducedMotionFn) {
      return Boolean(this.customReducedMotionFn());
    }
    return Boolean(this.mediaQuery?.matches);
  }

  private refreshReducedMotionState(): boolean {
    if (this.customReducedMotionFn) {
      const customVal = Boolean(this.customReducedMotionFn());
      if (
        this.mediaEventReducedMotionOverride !== null &&
        customVal === this.mediaEventReducedMotionOverride
      ) {
        this.mediaEventReducedMotionOverride = null;
      }
      if (this.mediaEventReducedMotionOverride === null) {
        const prev = this.reducedMotion;
        this.reducedMotion = customVal;
        if (!prev && this.reducedMotion) {
          this.explicitPlayGrantedUnderReducedMotion = false;
        }
        return this.reducedMotion;
      }
    }
    const prev = this.reducedMotion;
    this.reducedMotion = this.evaluateReducedMotion();
    if (!prev && this.reducedMotion) {
      this.explicitPlayGrantedUnderReducedMotion = false;
    }
    return this.reducedMotion;
  }

  private evaluateBackgroundHidden(): boolean {
    return Boolean(this.isDocumentHiddenFn()) || this.pageHiddenByEvent;
  }

  private clearPageHiddenIfDocumentVisible(): void {
    if (!this.isDocumentHiddenFn()) {
      this.pageHiddenByEvent = false;
    }
    this.isBackgroundHidden = this.evaluateBackgroundHidden();
  }

  private isContinuousMode(): boolean {
    return (
      this.descriptor.mode === 'projected-3d' ||
      this.descriptor.mode === 'continuous-2d'
    );
  }

  private canContinuousEnginePlay(): boolean {
    if (this.destroyed) return false;
    if (!this.isContinuousMode()) return false;
    this.isBackgroundHidden = this.evaluateBackgroundHidden();
    if (this.isBackgroundHidden) return false;
    this.refreshReducedMotionState();
    if (this.reducedMotion && !this.explicitPlayGrantedUnderReducedMotion) {
      return false;
    }
    return true;
  }

  private scheduleSanitizedFrame(innerCallback: FrameRequestCallback): number {
    if (this.destroyed) return 0;
    const handle = this.rawRequestFrame((rawTimestamp: number) => {
      this.pendingFrameHandle = null;
      if (this.destroyed) return;

      this.isBackgroundHidden = this.evaluateBackgroundHidden();
      this.refreshReducedMotionState();
      if (
        this.isBackgroundHidden ||
        !this.isContinuousMode() ||
        (this.reducedMotion && !this.explicitPlayGrantedUnderReducedMotion)
      ) {
        this.pause();
        return;
      }

      const candidateTimestamp =
        Number.isFinite(rawTimestamp)
          ? rawTimestamp
          : this.nowFn
            ? this.nowFn()
            : NaN;

      let safeTimestamp: number;
      if (!Number.isFinite(candidateTimestamp)) {
        safeTimestamp = this.lastMonotonicTimestamp ?? 0;
      } else if (
        this.lastMonotonicTimestamp !== null &&
        candidateTimestamp < this.lastMonotonicTimestamp
      ) {
        // Clamp regressive clock ticks so progress never moves backward or jumps on next tick
        safeTimestamp = this.lastMonotonicTimestamp;
      } else {
        safeTimestamp = candidateTimestamp;
      }

      this.lastMonotonicTimestamp = safeTimestamp;
      innerCallback(safeTimestamp);
    });
    this.pendingFrameHandle = handle;
    return handle;
  }

  private cancelSanitizedFrame(handle: number): void {
    if (this.pendingFrameHandle === handle) {
      this.pendingFrameHandle = null;
    }
    this.rawCancelFrame(handle);
  }

  private attachEnvironmentListeners(): void {
    if (this.cleanupListeners.length > 0) return;

    const doc = this.docTarget;
    const win = this.winTarget;
    const mediaQuery = this.mediaQuery;

    if (doc && typeof doc.addEventListener === 'function') {
      const onVisibilityChange = () => {
        const docHidden = Boolean(this.isDocumentHiddenFn());
        if (!docHidden) {
          this.pageHiddenByEvent = false;
        }
        this.isBackgroundHidden = this.evaluateBackgroundHidden();
        if (this.isBackgroundHidden) {
          this.pause();
        } else {
          this.emitChange();
        }
      };
      doc.addEventListener('visibilitychange', onVisibilityChange);
      this.cleanupListeners.push(() =>
        doc.removeEventListener('visibilitychange', onVisibilityChange),
      );
    }

    if (win && typeof win.addEventListener === 'function') {
      const onPageHide = () => {
        this.pageHiddenByEvent = true;
        this.isBackgroundHidden = true;
        this.pause();
      };
      const onPageShow = () => {
        this.pageHiddenByEvent = false;
        this.isBackgroundHidden = this.evaluateBackgroundHidden();
        this.emitChange();
      };
      win.addEventListener('pagehide', onPageHide);
      win.addEventListener('pageshow', onPageShow);
      this.cleanupListeners.push(() => {
        win.removeEventListener('pagehide', onPageHide);
        win.removeEventListener('pageshow', onPageShow);
      });
    }

    if (mediaQuery && typeof mediaQuery.addEventListener === 'function') {
      const onMediaChange = (event: MediaQueryListEvent) => {
        this.mediaEventReducedMotionOverride = Boolean(event.matches);
        this.reducedMotion = this.mediaEventReducedMotionOverride;
        if (this.reducedMotion) {
          this.explicitPlayGrantedUnderReducedMotion = false;
          this.pause();
        } else {
          this.emitChange();
        }
      };
      mediaQuery.addEventListener('change', onMediaChange);
      this.cleanupListeners.push(() =>
        mediaQuery.removeEventListener('change', onMediaChange),
      );
    }
  }

  /**
   * Re-activates a previously destroyed controller instance (e.g., across React StrictMode
   * effect cleanup -> re-setup cycles) without duplicating listeners or RAF loops.
   */
  reconnect(): void {
    if (!this.destroyed && this.cleanupListeners.length > 0) return;
    this.destroyed = false;
    this.draftEngine.setCanPlay(() => this.canContinuousEnginePlay());
    this.attachEnvironmentListeners();
  }

  /**
   * Attempts automatic playback (e.g. on view open).
   * Always blocked under `prefers-reduced-motion: reduce`, discrete `three-phase-2d`, or `missing`.
   */
  requestAutoPlay(): boolean {
    return this.play({ explicitUserAction: false });
  }

  /**
   * Starts continuous draft playback ONLY for `'projected-3d'` or `'continuous-2d'`.
   * - For the 77 `'three-phase-2d'` exercises or `'missing'`, returns `false` and never interpolates.
   * - When `prefers-reduced-motion: reduce` is active, requires `{ explicitUserAction: true }`.
   */
  play(options: MotionCoveragePlayOptions = {}): boolean {
    if (this.destroyed) return false;
    if (!this.isContinuousMode()) {
      this.emitChange();
      return false;
    }

    if (options.explicitUserAction && !this.isDocumentHiddenFn()) {
      this.pageHiddenByEvent = false;
    }
    this.isBackgroundHidden = this.evaluateBackgroundHidden();
    if (this.isBackgroundHidden) {
      this.pause();
      return false;
    }

    this.refreshReducedMotionState();
    if (this.reducedMotion) {
      if (!options.explicitUserAction) {
        this.explicitPlayGrantedUnderReducedMotion = false;
        this.emitChange();
        return false;
      }
      this.explicitPlayGrantedUnderReducedMotion = true;
    } else {
      this.explicitPlayGrantedUnderReducedMotion = false;
    }

    this.lastMonotonicTimestamp = null;
    this.draftEngine.play();
    return this.draftState.playing;
  }

  /**
   * Pauses continuous playback and cancels any scheduled animation frame.
   */
  pause(): void {
    this.lastMonotonicTimestamp = null;
    this.explicitPlayGrantedUnderReducedMotion = false;
    if (this.pendingFrameHandle !== null) {
      this.rawCancelFrame(this.pendingFrameHandle);
      this.pendingFrameHandle = null;
    }
    this.draftEngine.pause();
  }

  /**
   * Seeks to a normalized progress in `[0, 1]` for continuous drafts (`projected-3d`, `continuous-2d`).
   * Sanitizes `NaN` -> `0`, `-Infinity` -> `0`, `+Infinity` -> `1`.
   * For discrete `three-phase-2d`, does NOT set continuous progress (maps to nearest discrete phase instead).
   */
  seek(progress: number): void {
    if (this.destroyed) return;
    const safeProgress = sanitizeFiniteProgress(progress);
    this.clearPageHiddenIfDocumentVisible();
    this.explicitPlayGrantedUnderReducedMotion = false;

    if (!this.isContinuousMode()) {
      if (this.descriptor.mode === 'three-phase-2d') {
        this.selectPhase(mapContinuousProgressToVisualPhase(safeProgress));
      }
      return;
    }

    this.lastMonotonicTimestamp = null;
    if (this.pendingFrameHandle !== null) {
      this.rawCancelFrame(this.pendingFrameHandle);
      this.pendingFrameHandle = null;
    }
    this.draftEngine.seek(safeProgress);
  }

  /**
   * Restarts from the beginning:
   * - For continuous drafts: pauses and resets progress to `0` (cycle 1).
   * - For discrete 3-phase 2D: resets `selectedPhase` to `'start'`.
   */
  restart(): void {
    if (this.destroyed) return;
    this.lastMonotonicTimestamp = null;
    this.clearPageHiddenIfDocumentVisible();
    this.explicitPlayGrantedUnderReducedMotion = false;
    if (this.pendingFrameHandle !== null) {
      this.rawCancelFrame(this.pendingFrameHandle);
      this.pendingFrameHandle = null;
    }
    this.selectedPhase = 'start';
    this.suppressDraftEmit = true;
    try {
      this.draftEngine.reset();
    } finally {
      this.suppressDraftEmit = false;
    }
    this.emitChange();
  }

  /**
   * Alias for `restart()` matching `DraftPlaybackController.reset()`.
   */
  reset(): void {
    this.restart();
  }

  /**
   * Sets playback speed (`0.5 | 0.75 | 1`).
   * Throws `RangeError` for invalid speeds, `NaN`, or `±Infinity`.
   */
  setSpeed(speed: number): void {
    if (!Number.isFinite(speed) || !DRAFT_SPEEDS.includes(speed as DraftSpeed)) {
      throw new RangeError(`Unsupported draft speed: ${String(speed)}`);
    }
    this.draftEngine.setSpeed(speed);
  }

  /**
   * Sets repeat cycle count (`1 | 2 | 3`).
   * Throws `RangeError` for invalid counts, `NaN`, or `±Infinity`.
   */
  setRepeatCount(repeatCount: number): void {
    if (
      !Number.isFinite(repeatCount) ||
      !DRAFT_REPEAT_COUNTS.includes(repeatCount as DraftRepeatCount)
    ) {
      throw new RangeError(`Unsupported draft repeat count: ${String(repeatCount)}`);
    }
    this.repeatCount = repeatCount as DraftRepeatCount;
    this.draftEngine.setRepeatCount(repeatCount);
  }

  /**
   * Selects a discrete phase (`'start' | 'middle' | 'end'`).
   * - For the 77 `'three-phase-2d'` exercises: updates `selectedPhase` directly with zero interpolation.
   * - For continuous drafts: pauses and seeks to the canonical phase sample (`0`, `0.5`, or `1`).
   */
  selectPhase(phase: VisualPhaseId): void {
    if (this.destroyed) return;
    if (!DISCRETE_VISUAL_PHASES.includes(phase)) {
      throw new RangeError(`Unsupported visual phase: ${String(phase)}`);
    }
    this.clearPageHiddenIfDocumentVisible();
    this.selectedPhase = phase;
    if (this.isContinuousMode()) {
      const sample = phase === 'start' ? 0 : phase === 'middle' ? 0.5 : 1;
      this.seek(sample);
      return;
    }
    this.emitChange();
  }

  nextPhase(): VisualPhaseId | null {
    if (this.descriptor.mode === 'missing') return null;
    const currentIndex = DISCRETE_VISUAL_PHASES.indexOf(this.selectedPhase);
    const next =
      DISCRETE_VISUAL_PHASES[
        Math.min(DISCRETE_VISUAL_PHASES.length - 1, currentIndex + 1)
      ];
    this.selectPhase(next);
    return next;
  }

  prevPhase(): VisualPhaseId | null {
    if (this.descriptor.mode === 'missing') return null;
    const currentIndex = DISCRETE_VISUAL_PHASES.indexOf(this.selectedPhase);
    const prev = DISCRETE_VISUAL_PHASES[Math.max(0, currentIndex - 1)];
    this.selectPhase(prev);
    return prev;
  }

  /**
   * Selects a pattern variant by index when an exercise has multiple pattern references
   * (e.g., `original-mat-quadruped-reach` has 2 `projected-3d` variants). Pauses and resets playback cleanly.
   */
  selectVariantIndex(index: number): void {
    if (this.destroyed) return;
    const available = this.getAvailableVariantIds();
    if (available.length === 0) return;
    const clamped = Math.max(0, Math.min(available.length - 1, Math.trunc(index)));
    this.activeVariantIndex = clamped;
    this.restart();
  }

  /**
   * Switches to a different exercise or resolution option, immediately cleaning up
   * any active RAF frame and resetting playback state.
   */
  switchExercise(
    exerciseOrId: string | PilatesExercise | null | undefined,
    resolveOptions?: ResolveMotionCoverageOptions,
  ): MotionCoveragePlaybackSnapshot {
    this.suppressDraftEmit = true;
    try {
      this.pause();
      this.clearPageHiddenIfDocumentVisible();
      if (resolveOptions !== undefined) {
        this.resolveOptions = resolveOptions;
      }
      this.descriptor = resolveRenderableMotionDescriptor(
        exerciseOrId,
        this.resolveOptions,
      );
      this.activeVariantIndex = 0;
      this.selectedPhase = 'start';
      this.explicitPlayGrantedUnderReducedMotion = false;
      this.lastMonotonicTimestamp = null;
      this.draftEngine.reset();
    } finally {
      this.suppressDraftEmit = false;
    }
    this.emitChange();
    return this.getSnapshot();
  }

  /**
   * Cleans up all scheduled RAF frames and DOM/media listeners on unmount.
   */
  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.suppressDraftEmit = true;
    try {
      this.pause();
    } finally {
      this.suppressDraftEmit = false;
    }
    this.draftEngine.setCanPlay(() => false);
    for (const cleanup of this.cleanupListeners) {
      cleanup();
    }
    this.cleanupListeners = [];
  }

  isDestroyed(): boolean {
    return this.destroyed;
  }

  hasPendingFrame(): boolean {
    return this.pendingFrameHandle !== null;
  }

  activeListenerCount(): number {
    return this.cleanupListeners.length;
  }

  private getAvailableVariantIds(): readonly string[] {
    if (this.descriptor.mode === 'projected-3d') {
      return this.descriptor.patternReferences.map((ref) => ref.variantId);
    }
    if (this.descriptor.mode === 'continuous-2d') {
      if (this.descriptor.patternReferences.length > 0) {
        return this.descriptor.patternReferences.map((ref) => ref.variantId);
      }
      if (this.descriptor.labPrototype) {
        return [this.descriptor.labPrototype.id];
      }
    }
    return [];
  }

  getSnapshot(): MotionCoveragePlaybackSnapshot {
    this.refreshReducedMotionState();
    this.isBackgroundHidden = this.evaluateBackgroundHidden();

    const mode = this.descriptor.mode;
    const isContinuous = mode === 'projected-3d' || mode === 'continuous-2d';
    const controlKind: MotionPlaybackControlKind = isContinuous
      ? 'continuous-draft-playback'
      : mode === 'three-phase-2d'
        ? 'discrete-three-phase-selector'
        : 'unsupported-missing';
    const temporalKind = isContinuous
      ? 'continuous-progress'
      : mode === 'three-phase-2d'
        ? 'discrete-three-phase'
        : 'none';

    const availableVariantIds = this.getAvailableVariantIds();
    const safeVariantIndex =
      availableVariantIds.length > 0
        ? Math.min(this.activeVariantIndex, availableVariantIds.length - 1)
        : 0;
    const activeVariantId = availableVariantIds[safeVariantIndex] ?? null;

    const activePatternReference =
      (mode === 'projected-3d' || mode === 'continuous-2d') &&
      this.descriptor.patternReferences.length > 0
        ? (this.descriptor.patternReferences[safeVariantIndex] ??
            this.descriptor.patternReferences[0] ??
            null)
        : null;

    const activeLabPrototype =
      mode === 'continuous-2d' ? this.descriptor.labPrototype : null;

    const progress = isContinuous
      ? sanitizeFiniteProgress(this.draftState.progress)
      : null;

    const selectedPhase =
      mode === 'missing'
        ? null
        : isContinuous && progress !== null
          ? mapContinuousProgressToVisualPhase(progress)
          : this.selectedPhase;

    let continuousPhaseLabelKo: string | null = null;
    if (isContinuous && progress !== null) {
      if (activePatternReference) {
        const phases = activePatternReference.definition.phases;
        const matchedPhase =
          phases.find((item) => progress < item.end) ?? phases[phases.length - 1];
        if (matchedPhase) {
          continuousPhaseLabelKo =
            'labelKo' in matchedPhase && typeof matchedPhase.labelKo === 'string'
              ? matchedPhase.labelKo
              : matchedPhase.label;
        }
      } else if (activeLabPrototype) {
        const phase = getMotionPhase(progress);
        continuousPhaseLabelKo = phase.label;
      }
    }

    const currentCycle = isContinuous ? this.draftEngine.currentCycle() : 1;
    const completedCycle =
      isContinuous && !this.draftState.playing && (progress ?? 0) >= 1;

    let statusLabelKo: string;
    if (mode === 'missing') {
      statusLabelKo =
        '모션 도해 미지원 (missing) · 검증된 2D 3단계 포즈 및 연속 초안 데이터가 없어 재생을 비활성화합니다.';
    } else if (mode === 'three-phase-2d') {
      const phaseKo =
        selectedPhase === 'start'
          ? '시작(준비)'
          : selectedPhase === 'middle'
            ? '중간(전개)'
            : '끝(복귀)';
      statusLabelKo = `이산 2D 3단계 선택 모드 · 현재 단계: ${phaseKo} · 연속 모션 자동 보간 없음`;
    } else if (this.isBackgroundHidden) {
      statusLabelKo = '백그라운드 탭 전환으로 연속 초안 재생이 일시정지되었습니다.';
    } else if (this.reducedMotion && !this.explicitPlayGrantedUnderReducedMotion) {
      statusLabelKo =
        '동작 줄이기(reduced-motion) 설정 감지 · 자동 재생 없음 (명시적 재생 버튼으로만 수동 실행 가능)';
    } else if (this.draftState.playing) {
      statusLabelKo =
        this.repeatCount > 1
          ? `미검토 연속 초안 재생 중 (${currentCycle}/${this.repeatCount}회 · ${this.draftState.speed}×)`
          : `미검토 연속 초안 한 주기 재생 중 (${Math.round((progress ?? 0) * 100)}% · ${this.draftState.speed}×)`;
    } else if (completedCycle) {
      statusLabelKo =
        this.repeatCount > 1
          ? `미검토 연속 초안 반복 재생 완료 (${this.repeatCount}회) · 일시정지`
          : '미검토 연속 초안 한 주기 끝 (100%) · 일시정지';
    } else {
      statusLabelKo = `미검토 연속 초안 일시정지 (${Math.round((progress ?? 0) * 100)}% · 자동 재생 없음)`;
    }

    let modeDistinctionLabelKo: string;
    if (mode === 'projected-3d') {
      modeDistinctionLabelKo =
        '구분: 3D 좌표의 2D SVG 사선 투영 연속 초안(projected-3d) · 진짜 3D(WebGL) 아님 · 정식 모션/해부학 검수 미완료';
    } else if (mode === 'continuous-2d') {
      modeDistinctionLabelKo =
        '구분: 2D 평면 연속 모션 초안(continuous-2d) · 진짜 3D 아님 · 정식 모션/해부학 검수 미완료';
    } else if (mode === 'three-phase-2d') {
      modeDistinctionLabelKo =
        '구분: 이산 2D 3단계(시작·중간·끝) 정적 스냅샷 도해(77종) · 연속 보간 모션 아님 · 기존 98 포즈 재사용';
    } else {
      modeDistinctionLabelKo =
        '구분: 미지원(missing) · 카탈로그 출처 또는 기구·자세·방향 일치 근거 없음';
    }

    return Object.freeze({
      exerciseId: this.descriptor.exerciseId,
      descriptor: this.descriptor,
      mode,
      controlKind,
      temporalKind,
      readinessState: this.descriptor.readinessState,
      playing: isContinuous ? this.draftState.playing : false,
      isContinuousInterpolated: isContinuous,
      isAutoInterpolatedFromDiscrete: false,
      progress,
      selectedPhase,
      continuousPhaseLabelKo,
      speed: this.draftState.speed,
      repeatCount: this.repeatCount,
      currentCycle,
      completedCycle,
      reducedMotion: this.reducedMotion,
      explicitPlayGrantedUnderReducedMotion: this.explicitPlayGrantedUnderReducedMotion,
      isBackgroundHidden: this.isBackgroundHidden,
      activeVariantIndex: safeVariantIndex,
      activeVariantId,
      availableVariantIds: Object.freeze(availableVariantIds),
      activePatternReference,
      activeLabPrototype,
      statusLabelKo,
      modeDistinctionLabelKo,
      canonicalMotionReady: false,
      manualReady: false,
      true3dSupported: false,
      webgl3dReady: false,
      anatomicalVerificationCompleted: false,
      expertVerificationCompleted: false,
    });
  }

  private emitChange(): void {
    if (this.destroyed) return;
    this.onChange?.(this.getSnapshot());
  }
}
