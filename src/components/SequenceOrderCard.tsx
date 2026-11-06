import { useState, type ReactNode } from 'react';
import { ArrowDown, ArrowUp, GripVertical, Trash2 } from 'lucide-react';
import { usePilatesStore } from '../store/usePilatesStore';
import type { SequenceStep } from '../types/pilates';

const DRAG_TYPE = 'application/x-pilates-step';

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
  const [over, setOver] = useState(false);
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
    <div
      className={`sequence-order-card ${over ? 'is-drop-target' : ''}`}
      data-order-step={step.stepId}
      onDragOver={(event) => {
        if (event.dataTransfer.types.includes(DRAG_TYPE) && !step.locked) {
          event.preventDefault();
          event.dataTransfer.dropEffect = 'move';
          setOver(true);
        }
      }}
      onDragLeave={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOver(false);
      }}
      onDrop={(event) => {
        event.preventDefault();
        setOver(false);
        const id = event.dataTransfer.getData(DRAG_TYPE);
        if (!id || id === step.stepId) return;
        const changed = usePilatesStore.getState().reorderStep(id, step.stepId);
        onNotice(
          changed ? '순서를 바꿨어요. 되돌릴 수 있습니다.' : '잠긴 항목의 위치는 유지합니다.',
        );
        requestAnimationFrame(() => document.getElementById(`order-handle-${id}`)?.focus());
      }}
    >
      {children}
      <div className="sequence-order-controls" role="group" aria-label={`${label} 순서 편집`}>
        <button
          type="button"
          id={`order-handle-${step.stepId}`}
          className="sequence-drag-handle"
          draggable={!step.locked}
          disabled={step.locked}
          aria-label={`${label} 순서 이동 · 위아래 방향키 또는 드래그`}
          title="끌어서 순서 이동 · 위아래 방향키도 가능"
          onDragStart={(event) => {
            event.dataTransfer.setData(DRAG_TYPE, step.stepId);
            event.dataTransfer.effectAllowed = 'move';
          }}
          onDragEnd={() => setOver(false)}
          onKeyDown={(event) => {
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
          <span>아래로</span>
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
