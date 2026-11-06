import { useEffect, useRef, type ReactNode } from 'react';
import { ArrowDown, ArrowUp, GripVertical, Trash2 } from 'lucide-react';
import { usePilatesStore } from '../store/usePilatesStore';
import type { SequenceStep } from '../types/pilates';

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
  const pointerDrag = useRef<{
    id: number;
    x: number;
    y: number;
    moved: boolean;
    target: string | null;
  } | null>(null);
  const clearPointerDrag = () => {
    pointerDrag.current = null;
    document
      .querySelectorAll('[data-order-step][data-drag-over]')
      .forEach((element) => element.removeAttribute('data-drag-over'));
  };

  useEffect(
    () => () => {
      pointerDrag.current = null;
      document
        .querySelectorAll('[data-order-step][data-drag-over]')
        .forEach((element) => element.removeAttribute('data-drag-over'));
    },
    [],
  );
  const restoreFocus = () =>
    requestAnimationFrame(() => document.getElementById(`order-handle-${step.stepId}`)?.focus());
  const move = (targetId: string) => {
    const changed = usePilatesStore.getState().reorderStep(step.stepId, targetId);
    onNotice(
      changed ? `${label} 순서를 바꿨어요. 되돌릴 수 있습니다.` : '잠긴 항목의 위치는 유지합니다.',
    );
    restoreFocus();
  };
  const upDisabled = !!step.locked || index === 0 || !!steps[index - 1]?.locked;
  const downDisabled = !!step.locked || index === steps.length - 1 || !!steps[index + 1]?.locked;
  return (
    <div className="sequence-order-card" data-order-step={step.stepId}>
      {children}
      <div className="sequence-order-controls" role="group" aria-label={`${label} 순서 편집`}>
        <button
          type="button"
          id={`order-handle-${step.stepId}`}
          className="sequence-drag-handle"
          draggable={false}
          disabled={step.locked}
          onPointerDown={(event) => {
            if (event.button !== 0 || step.locked) return;
            event.preventDefault();
            event.currentTarget.focus();
            event.currentTarget.setPointerCapture(event.pointerId);
            pointerDrag.current = {
              id: event.pointerId,
              x: event.clientX,
              y: event.clientY,
              moved: false,
              target: null,
            };
          }}
          onPointerMove={(event) => {
            const drag = pointerDrag.current;
            if (!drag || drag.id !== event.pointerId) return;
            if (Math.hypot(event.clientX - drag.x, event.clientY - drag.y) < 8 && !drag.moved)
              return;
            drag.moved = true;
            const target = document
              .elementFromPoint(event.clientX, event.clientY)
              ?.closest<HTMLElement>('[data-order-step]');
            document
              .querySelectorAll('[data-order-step][data-drag-over]')
              .forEach((element) => element.removeAttribute('data-drag-over'));
            drag.target = target?.dataset.orderStep ?? null;
            if (target && drag.target !== step.stepId)
              target.setAttribute('data-drag-over', 'true');
          }}
          onPointerUp={(event) => {
            const drag = pointerDrag.current;
            const target = drag?.target;
            const shouldMove =
              drag?.id === event.pointerId && drag.moved && target && target !== step.stepId;
            clearPointerDrag();
            if (event.currentTarget.hasPointerCapture(event.pointerId))
              event.currentTarget.releasePointerCapture(event.pointerId);
            if (shouldMove) move(target);
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
