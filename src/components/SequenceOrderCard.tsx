import { useEffect, useRef, type ReactNode } from 'react';
import { ArrowDown, ArrowUp, GripVertical, Trash2 } from 'lucide-react';
import { usePilatesStore } from '../store/usePilatesStore';
import type { SequenceStep } from '../types/pilates';
import { createSequenceDrag } from '../utils/sequenceDrag';
import '../styles/sequence-drag.css';

export function SequenceOrderCard({
  step,
  index,
  label,
  onNotice,
  children,
}: {
  step: SequenceStep;
  index: number;
  label: string;
  onNotice: (message: string) => void;
  children: ReactNode;
}) {
  const steps = usePilatesStore((state) => state.activeSteps);
  const cardRef = useRef<HTMLDivElement>(null);
  const pointerDrag = useRef<{ id: number; session: ReturnType<typeof createSequenceDrag> } | null>(
    null,
  );
  const clearPointerDrag = () => {
    pointerDrag.current?.session.cancel();
    pointerDrag.current = null;
  };
  useEffect(
    () => () => {
      pointerDrag.current?.session.cancel();
    },
    [],
  );
  const restoreFocus = (ensureVisible: boolean) =>
    requestAnimationFrame(() => {
      const handle = document.getElementById(`order-handle-${step.stepId}`);
      handle?.focus({ preventScroll: true });
      if (ensureVisible)
        handle?.scrollIntoView?.({ block: 'nearest', inline: 'nearest', behavior: 'auto' });
    });
  const move = (targetId: string, ensureVisible = true) => {
    const changed = usePilatesStore.getState().reorderStep(step.stepId, targetId);
    onNotice(
      changed ? `${label} 순서를 바꿨어요. 되돌릴 수 있습니다.` : '잠긴 항목의 위치는 유지합니다.',
    );
    restoreFocus(ensureVisible);
  };
  const upDisabled = !!step.locked || index === 0 || !!steps[index - 1]?.locked;
  const downDisabled = !!step.locked || index === steps.length - 1 || !!steps[index + 1]?.locked;
  return (
    <div ref={cardRef} className="sequence-order-card" data-order-step={step.stepId}>
      {children}
      <div className="sequence-order-controls" role="group" aria-label={`${label} 순서 편집`}>
        <button
          type="button"
          id={`order-handle-${step.stepId}`}
          className="sequence-drag-handle"
          draggable={false}
          disabled={step.locked}
          onPointerDown={(event) => {
            if (event.button !== 0 || step.locked || pointerDrag.current || !cardRef.current)
              return;
            event.preventDefault();
            event.currentTarget.focus({ preventScroll: true });
            event.currentTarget.setPointerCapture(event.pointerId);
            pointerDrag.current = {
              id: event.pointerId,
              session: createSequenceDrag({
                card: cardRef.current,
                handle: event.currentTarget,
                pointerId: event.pointerId,
                stepId: step.stepId,
                label,
                steps: usePilatesStore.getState().activeSteps,
                getSteps: () => usePilatesStore.getState().activeSteps,
                startX: event.clientX,
                startY: event.clientY,
                onCommit: (targetId) => move(targetId, false),
                onNotice,
              }),
            };
          }}
          onPointerMove={(event) => {
            if (pointerDrag.current?.id === event.pointerId)
              pointerDrag.current.session.move(event.clientX, event.clientY);
          }}
          onPointerUp={(event) => {
            if (pointerDrag.current?.id !== event.pointerId) return;
            const drag = pointerDrag.current;
            pointerDrag.current = null;
            drag.session.finish(event.clientX, event.clientY);
            if (event.currentTarget.hasPointerCapture(event.pointerId))
              event.currentTarget.releasePointerCapture(event.pointerId);
          }}
          onPointerCancel={clearPointerDrag}
          onLostPointerCapture={clearPointerDrag}
          aria-label={`${label} 순서 이동 · 위아래 방향키 또는 드래그`}
          title="끌어서 순서 이동 · 위아래 방향키도 가능"
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              clearPointerDrag();
              return;
            }
            if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
              event.preventDefault();
              clearPointerDrag();
              const delta = event.key === 'ArrowUp' ? -1 : 1;
              if ((delta < 0 && upDisabled) || (delta > 0 && downDisabled)) return;
              move(steps[index + delta].stepId);
            }
          }}
        >
          <GripVertical size={17} aria-hidden="true" />
          <span>순서</span>
        </button>
        <button
          type="button"
          disabled={upDisabled}
          aria-label={`${label} 위로 이동`}
          onClick={() => move(steps[index - 1].stepId)}
        >
          <ArrowUp size={17} aria-hidden="true" />
          <span>위로</span>
        </button>
        <button
          type="button"
          disabled={downDisabled}
          aria-label={`${label} 아래로 이동`}
          onClick={() => move(steps[index + 1].stepId)}
        >
          <ArrowDown size={17} aria-hidden="true" />
          <span>아래</span>
        </button>
        <button
          type="button"
          disabled={step.locked}
          aria-label={`${label} 수업안에서 빼기`}
          onClick={() => {
            const current = usePilatesStore.getState();
            const currentIndex = current.activeSteps.findIndex(
              (item) => item.stepId === step.stepId,
            );
            current.removeStep(currentIndex);
            onNotice(`${label}을 수업안에서 뺐어요. 되돌릴 수 있습니다.`);
          }}
        >
          <Trash2 size={16} aria-hidden="true" />
          <span>빼기</span>
        </button>
      </div>
    </div>
  );
}
