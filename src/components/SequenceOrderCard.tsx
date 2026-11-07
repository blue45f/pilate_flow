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
  const pointerDrag = useRef<{
    id: number;
    rafId: number;
    session: ReturnType<typeof createSequenceDrag>;
  } | null>(null);
  const zoomStyleCache = useRef(new WeakMap<HTMLElement, Record<string, string>>());

  const clearHeaderTranslations = () => {
    const list = cardRef.current?.closest<HTMLElement>('.flow-sections') ?? cardRef.current?.parentElement;
    list?.querySelectorAll<HTMLElement>('.pf-sequence-block__header').forEach((header) => {
      header.style.translate = '';
    });
  };

  const syncActiveDragDom = () => {
    const cardEl = cardRef.current;
    if (!cardEl) return;
    const list = cardEl.closest<HTMLElement>('.flow-sections') ?? cardEl.parentElement;
    if (!list || !list.hasAttribute('data-drag-session')) return;

    const cssZoom = (cardEl as HTMLElement & { currentCSSZoom?: number }).currentCSSZoom;
    const htmlZoom = Number.parseFloat(
      document.documentElement.style.zoom ||
        window.getComputedStyle(document.documentElement).zoom ||
        '1',
    );
    const zoomFactor =
      typeof cssZoom === 'number' && Number.isFinite(cssZoom) && cssZoom > 0 && cssZoom !== 1
        ? cssZoom
        : Number.isFinite(htmlZoom) && htmlZoom > 0 && htmlZoom !== 1
          ? htmlZoom
          : 1;

    const cards = Array.from(list.querySelectorAll<HTMLElement>('[data-order-step]'));
    const from = cards.findIndex((el) => el.dataset.orderStep === step.stepId);
    const to = cards.findIndex((el) => el.hasAttribute('data-drag-over'));
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

    if (from >= 0 && to >= 0 && from !== to) {
      const rawShiftTransform = cards[to]?.style.transform || '';
      const numMatch = rawShiftTransform.match(/-?\d+(?:\.\d+)?/);
      const shiftVal = numMatch ? Number.parseFloat(numMatch[0]) / zoomFactor : 0;
      cards.forEach((element, k) => {
        if (k === 0 || element.previousElementSibling !== null) return;
        const sectionHeader = element
          .closest('.pf-sequence-block')
          ?.querySelector<HTMLElement>('.pf-sequence-block__header');
        if (!sectionHeader) return;
        const shouldShift =
          (from < to && from < k && k <= to) || (from > to && to <= k - 1 && k <= from);
        if (shouldShift && shiftVal !== 0) {
          if (!sectionHeader.style.transform) {
            sectionHeader.style.transition =
              reduced || zoomFactor !== 1
                ? 'none'
                : 'translate 160ms cubic-bezier(.2,.7,.2,1)';
            sectionHeader.style.translate = `0px ${shiftVal}px`;
          } else {
            sectionHeader.style.translate = '';
          }
        } else {
          sectionHeader.style.translate = '';
        }
      });
    } else {
      clearHeaderTranslations();
    }

    if (zoomFactor !== 1) {
      const cache = zoomStyleCache.current;
      const scalePx = (el: HTMLElement, prop: 'left' | 'top' | 'width' | 'height') => {
        const current = el.style[prop];
        if (!current) return;
        let rec = cache.get(el);
        if (!rec) {
          rec = {};
          cache.set(el, rec);
        }
        if (rec[prop] === current) return;
        const num = Number.parseFloat(current);
        if (!Number.isFinite(num)) return;
        const scaled = `${num / zoomFactor}px`;
        el.style[prop] = scaled;
        rec[prop] = scaled;
      };
      const scaleTransform = (el: HTMLElement) => {
        const current = el.style.transform;
        if (!current) return;
        let rec = cache.get(el);
        if (!rec) {
          rec = {};
          cache.set(el, rec);
        }
        if (rec.transform === current) return;
        el.style.transition = 'none';
        const scaled = current.replace(/-?\d+(?:\.\d+)?(?=px)/g, (match) =>
          String(Number.parseFloat(match) / zoomFactor),
        );
        el.style.transform = scaled;
        rec.transform = scaled;
      };

      const overlay = document.querySelector<HTMLElement>('.sequence-drag-overlay');
      if (overlay) {
        scalePx(overlay, 'left');
        scalePx(overlay, 'top');
        scalePx(overlay, 'width');
        scalePx(overlay, 'height');
        scaleTransform(overlay);
      }
      const indicator = document.querySelector<HTMLElement>('.sequence-drop-indicator');
      if (indicator && !indicator.hidden) {
        scalePx(indicator, 'left');
        scalePx(indicator, 'top');
        scalePx(indicator, 'width');
        scalePx(indicator, 'height');
      }
      cards.forEach((element) => scaleTransform(element));
      list
        .querySelectorAll<HTMLElement>('.pf-sequence-block__header')
        .forEach((header) => scaleTransform(header));
    }
  };

  const clearPointerDrag = () => {
    clearHeaderTranslations();
    if (pointerDrag.current) {
      cancelAnimationFrame(pointerDrag.current.rafId);
      pointerDrag.current.session.cancel();
      pointerDrag.current = null;
    }
  };
  useEffect(
    () => () => {
      clearHeaderTranslations();
      if (pointerDrag.current) {
        cancelAnimationFrame(pointerDrag.current.rafId);
        pointerDrag.current.session.cancel();
      }
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
    if (changed) {
      const updatedSteps = usePilatesStore.getState().activeSteps;
      const nextIndex = updatedSteps.findIndex((item) => item.stepId === step.stepId);
      const positionText = nextIndex >= 0 ? `${nextIndex + 1}번째 위치로 ` : '';
      onNotice(`${label} 순서를 ${positionText}바꿨어요. 되돌릴 수 있습니다.`);
    } else {
      onNotice('잠긴 항목의 위치는 유지합니다.');
    }
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
            try {
              event.currentTarget.setPointerCapture?.(event.pointerId);
            } catch {
              // Ignore synthetic pointer events without an active hardware pointer id
            }
            let suppressInitialSameSlotNotice = false;
            const session = createSequenceDrag({
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
              onNotice: (message) => {
                if (message.includes('이동 중')) {
                  suppressInitialSameSlotNotice = true;
                  onNotice(message);
                  return;
                }
                if (suppressInitialSameSlotNotice) {
                  suppressInitialSameSlotNotice = false;
                  if (message === `${index + 1}번째 위치. 놓으면 순서가 바뀝니다.`) {
                    return;
                  }
                }
                onNotice(message);
              },
            });
            pointerDrag.current = {
              id: event.pointerId,
              rafId: 0,
              session,
            };
          }}
          onPointerMove={(event) => {
            if (pointerDrag.current?.id === event.pointerId) {
              pointerDrag.current.session.move(event.clientX, event.clientY);
              syncActiveDragDom();
              if (!pointerDrag.current.rafId && pointerDrag.current.session.isActive()) {
                const loop = () => {
                  if (!pointerDrag.current) return;
                  syncActiveDragDom();
                  pointerDrag.current.rafId = requestAnimationFrame(loop);
                };
                pointerDrag.current.rafId = requestAnimationFrame(loop);
              }
            }
          }}
          onPointerUp={(event) => {
            if (pointerDrag.current?.id !== event.pointerId) return;
            const drag = pointerDrag.current;
            pointerDrag.current = null;
            cancelAnimationFrame(drag.rafId);
            clearHeaderTranslations();
            drag.session.finish(event.clientX, event.clientY);
            try {
              if (event.currentTarget.hasPointerCapture?.(event.pointerId))
                event.currentTarget.releasePointerCapture(event.pointerId);
            } catch {
              // Ignore synthetic pointer events
            }
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
