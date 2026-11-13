import { useCallback, useState } from 'react';
import type { SequenceInsertionPlacement } from '../utils/sequenceInsertion';

const END_PLACEMENT: SequenceInsertionPlacement = { kind: 'end' };

/** Placement belongs to the current class, independently of picker visibility. */
export function useSequenceInsertionPlacement(sequenceId: string | null) {
  const [selection, setSelection] = useState<{
    sequenceId: string | null;
    placement: SequenceInsertionPlacement;
  }>(() => ({ sequenceId, placement: END_PLACEMENT }));

  const sameClass = selection.sequenceId === sequenceId;
  if (!sameClass) setSelection({ sequenceId, placement: END_PLACEMENT });

  const setPlacement = useCallback(
    (placement: SequenceInsertionPlacement) => setSelection({ sequenceId, placement }),
    [sequenceId],
  );

  return [sameClass ? selection.placement : END_PLACEMENT, setPlacement] as const;
}
