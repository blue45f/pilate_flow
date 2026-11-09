import type { StepInspectorDraftCache } from '../components/StepBlockInspector';
import type { SequenceStep } from '../types/pilates';
import { isRestStep } from '../utils/sequenceEngine';

export const WORKBENCH_PREP_RECOVERY_KEY = 'pf_workbench_prep_recovery_v1';

export interface WorkbenchPrepRecoveryState {
  sequenceId: string | null;
  activeStep: 'finder' | 'arrange';
  workflowStep: 'select' | 'arrange';
  finderOpen: boolean;
  conditionsOpen: boolean;
  conditionStep: 1 | 2 | 3;
  previewStep: string | null;
  inspectorStepId: string | null;
  inspectorDraft?: StepInspectorDraftCache | null;
}

export function readWorkbenchPrepRecovery(
  currentSequenceId: string | null,
  activeSteps: SequenceStep[],
): Partial<WorkbenchPrepRecoveryState> | null {
  try {
    const raw =
      typeof window !== 'undefined'
        ? window.sessionStorage.getItem(WORKBENCH_PREP_RECOVERY_KEY)
        : null;
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<WorkbenchPrepRecoveryState> & {
      step?: string;
    };
    if (!parsed || typeof parsed !== 'object') return null;
    if (
      parsed.sequenceId !== undefined &&
      parsed.sequenceId !== null &&
      currentSequenceId !== null &&
      parsed.sequenceId !== currentSequenceId
    ) {
      return null;
    }
    const rawStep = parsed.activeStep ?? parsed.workflowStep ?? parsed.step;
    const workflowStep: 'select' | 'arrange' | undefined =
      rawStep === 'arrange'
        ? 'arrange'
        : rawStep === 'finder' || rawStep === 'select'
          ? 'select'
          : undefined;
    const rawInspectorStep = parsed.inspectorStepId ?? parsed.previewStep ?? null;
    const validInspectorStep =
      typeof rawInspectorStep === 'string' &&
      activeSteps.some((st) => st.stepId === rawInspectorStep && !isRestStep(st))
        ? rawInspectorStep
        : null;
    const conditionStep =
      parsed.conditionStep === 1 || parsed.conditionStep === 2 || parsed.conditionStep === 3
        ? parsed.conditionStep
        : 1;
    return {
      sequenceId: parsed.sequenceId ?? currentSequenceId,
      activeStep: workflowStep === 'arrange' ? 'arrange' : 'finder',
      workflowStep:
        validInspectorStep !== null
          ? 'arrange'
          : (workflowStep ?? (activeSteps.length ? 'arrange' : 'select')),
      finderOpen: Boolean(parsed.finderOpen),
      conditionsOpen: Boolean(parsed.conditionsOpen),
      conditionStep,
      previewStep: validInspectorStep,
      inspectorStepId: validInspectorStep,
      inspectorDraft: parsed.inspectorDraft ?? null,
    };
  } catch {
    return null;
  }
}

export function writeWorkbenchPrepRecovery(state: WorkbenchPrepRecoveryState): void {
  try {
    if (typeof window === 'undefined') return;
    window.sessionStorage[WORKBENCH_PREP_RECOVERY_KEY] = JSON.stringify(state);
  } catch {
    // ignore storage quota or sandbox errors
  }
}

export function clearWorkbenchPrepRecovery(): void {
  try {
    if (typeof window === 'undefined') return;
    delete window.sessionStorage[WORKBENCH_PREP_RECOVERY_KEY];
  } catch {
    // ignore storage errors
  }
}
