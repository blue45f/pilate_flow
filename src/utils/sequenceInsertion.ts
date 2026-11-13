import type { SequenceStep } from '../types/pilates';

export type SequenceInsertionPlacement =
  | { readonly kind: 'end' }
  | { readonly kind: 'start' }
  | { readonly kind: 'step'; readonly stepId: string };

export type SequenceInsertionResolution =
  | { readonly success: true; readonly index: number }
  | { readonly success: false; readonly message: string };

/** Resolve a live row identity rather than retaining an index across edits. */
export function resolveSequenceInsertion(
  steps: readonly SequenceStep[],
  placement: SequenceInsertionPlacement,
): SequenceInsertionResolution {
  let index: number;
  if (placement.kind === 'end') index = steps.length;
  else if (placement.kind === 'start') index = 0;
  else if (placement.kind === 'step') {
    const anchorIndex = steps.findIndex((step) => step.stepId === placement.stepId);
    if (anchorIndex < 0)
      return {
        success: false,
        message: '추가할 기준 항목을 찾을 수 없습니다. 추가 위치를 다시 선택해 주세요.',
      };
    index = anchorIndex + 1;
  } else {
    return { success: false, message: '동작을 추가할 위치를 다시 선택해 주세요.' };
  }

  // The existing reorder contract keeps locked rows at their exact positions.
  if (steps.slice(index).some((step) => step.locked))
    return {
      success: false,
      message:
        '잠긴 항목의 위치를 유지하려면 마지막 잠긴 항목 뒤에 추가해 주세요. 다른 위치에 넣으려면 먼저 잠금을 해제해 주세요.',
    };

  return { success: true, index };
}
