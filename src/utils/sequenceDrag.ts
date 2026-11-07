import type { SequenceStep } from '../types/pilates';

export interface SequenceDragRect {
  id: string;
  left: number;
  top: number;
  width: number;
  height: number;
}
export function resolveSequenceDrop(
  rects: SequenceDragRect[],
  sourceId: string,
  x: number,
  y: number,
  lockedIds: Set<string>,
) {
  const from = rects.findIndex((r) => r.id === sourceId);
  if (from < 0 || !rects.length) return null;
  const left = Math.min(...rects.map((r) => r.left));
  const right = Math.max(...rects.map((r) => r.left + r.width));
  if (
    x < left - 24 ||
    x > right + 24 ||
    y < rects[0].top - 40 ||
    y > rects.at(-1)!.top + rects.at(-1)!.height + 40
  )
    return null;
  const remaining = rects.filter((r) => r.id !== sourceId);
  const next = remaining.findIndex((r) => y < r.top + r.height / 2);
  const index = next < 0 ? remaining.length : next;
  const blocked = rects
    .slice(Math.min(from, index), Math.max(from, index) + 1)
    .some((r) => lockedIds.has(r.id));
  return { index, targetId: rects[index].id, blocked };
}

let cancelActiveDrag: (() => void) | null = null;
type Options = {
  card: HTMLElement;
  handle: HTMLElement;
  pointerId?: number;
  stepId: string;
  label: string;
  steps: SequenceStep[];
  getSteps: () => SequenceStep[];
  startX: number;
  startY: number;
  onCommit: (targetId: string) => void;
  onNotice: (text: string) => void;
};
/** Visual-only preview. The authoritative array is changed exactly once, at a valid drop. */
export function createSequenceDrag(options: Options) {
  cancelActiveDrag?.();
  const {
    card,
    handle,
    pointerId,
    stepId,
    label,
    steps,
    getSteps,
    startX,
    startY,
    onCommit,
    onNotice,
  } = options;
  const list = card.closest<HTMLElement>('.flow-sections') ?? card.parentElement!;
  const root = card.closest<HTMLElement>('.vnext-shell') ?? document.body;
  let x = startX,
    y = startY,
    active = false,
    ended = false,
    frame = 0;
  let overlay: HTMLElement | null = null,
    indicator: HTMLElement | null = null,
    status: HTMLElement | null = null;
  let cards: HTMLElement[] = [],
    headers: HTMLElement[] = [],
    rects: SequenceDragRect[] = [];
  let savedStyles: { transform: string; transition: string }[] = [];
  let savedHeaderStyles: { transform: string; transition: string }[] = [];
  let lastAnnouncement = '';
  const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  const locked = new Set(steps.filter((s) => s.locked).map((s) => s.stepId));
  const currentRects = () => {
    // The live status can change page height and browser scroll anchoring.
    // The untouched source row is our layout anchor; scrollY alone is insufficient.
    const source = rects.find((r) => r.id === stepId);
    const shift = source ? card.getBoundingClientRect().top - source.top : 0;
    return rects.map((r) => ({ ...r, top: r.top + shift }));
  };
  const focus = () =>
    requestAnimationFrame(() =>
      document.getElementById(`order-handle-${stepId}`)?.focus({ preventScroll: true }),
    );
  const resetPreview = () => {
    cards.forEach((element, i) => {
      element.style.transform = savedStyles[i].transform;
      element.removeAttribute('data-drag-over');
    });
    headers.forEach((header, i) => {
      header.style.transform = savedHeaderStyles[i]?.transform ?? '';
    });
  };
  const cleanup = () => {
    ended = true;
    if (pointerId !== undefined && handle.hasPointerCapture?.(pointerId)) {
      handle.releasePointerCapture(pointerId);
    }
    cancelAnimationFrame(frame);
    resetPreview();
    cards.forEach((element, i) => {
      element.style.transition = savedStyles[i].transition;
    });
    headers.forEach((header, i) => {
      header.style.transition = savedHeaderStyles[i]?.transition ?? '';
    });
    card.removeAttribute('data-drag-source');
    list.removeAttribute('data-drag-session');
    window.removeEventListener('blur', cancel);
    window.removeEventListener('resize', cancel);
    window.removeEventListener('keydown', onKeyDown, true);
    document.removeEventListener('visibilitychange', onVisibility);
    if (cancelActiveDrag === cancel) cancelActiveDrag = null;
    indicator?.remove();
  };
  const cancel = () => {
    if (ended) return;
    cleanup();
    overlay?.remove();
    if (active) {
      onNotice('순서 이동을 취소했어요. 원래 순서를 유지합니다.');
      focus();
    }
  };
  const onVisibility = () => {
    if (document.hidden) cancel();
  };
  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      cancel();
    }
  };
  const begin = () => {
    active = true;
    cards = Array.from(list.querySelectorAll<HTMLElement>('[data-order-step]'));
    headers = Array.from(list.querySelectorAll<HTMLElement>('.pf-sequence-block__header'));
    rects = cards.map((element) => {
      const r = element.getBoundingClientRect();
      return {
        id: element.dataset.orderStep!,
        left: r.left,
        top: r.top,
        width: r.width,
        height: r.height,
      };
    });
    savedStyles = cards.map((element) => ({
      transform: element.style.transform,
      transition: element.style.transition,
    }));
    savedHeaderStyles = headers.map((header) => ({
      transform: header.style.transform,
      transition: header.style.transition,
    }));
    const source = rects.find((r) => r.id === stepId)!;
    overlay = card.cloneNode(true) as HTMLElement;
    overlay.removeAttribute('data-order-step');
    overlay.removeAttribute('id');
    overlay.querySelectorAll('[id]').forEach((node) => node.removeAttribute('id'));
    overlay.setAttribute('aria-hidden', 'true');
    overlay.setAttribute('inert', '');
    overlay.classList.add('sequence-drag-overlay');
    Object.assign(overlay.style, {
      position: 'fixed',
      left: `${source.left}px`,
      top: `${source.top}px`,
      width: `${source.width}px`,
      height: `${source.height}px`,
      margin: '0',
      pointerEvents: 'none',
      zIndex: '10000',
    });
    status = document.createElement('span');
    status.className = 'sequence-drag-status';
    overlay.append(status);
    card.parentElement!.append(overlay);
    indicator = document.createElement('div');
    indicator.className = 'sequence-drop-indicator';
    indicator.setAttribute('aria-hidden', 'true');
    root.append(indicator);
    card.setAttribute('data-drag-source', 'true');
    list.setAttribute('data-drag-session', 'true');
    cards.forEach((element) => {
      element.style.transition = reduced ? 'none' : 'transform 160ms cubic-bezier(.2,.7,.2,1)';
    });
    headers.forEach((header) => {
      header.style.transition = reduced ? 'none' : 'transform 160ms cubic-bezier(.2,.7,.2,1)';
    });
    window.addEventListener('blur', cancel);
    window.addEventListener('resize', cancel);
    window.addEventListener('keydown', onKeyDown, true);
    document.addEventListener('visibilitychange', onVisibility);
    onNotice(`${label} 이동 중. 놓을 위치로 끌어 주세요. Escape 키로 취소할 수 있습니다.`);
  };
  const draw = () => {
    if (!active || ended || !overlay || !indicator) return null;
    if (getSteps() !== steps) {
      cancel();
      return null;
    }
    overlay.style.transform = `translate3d(${x - startX}px, ${y - startY}px, 0)`;
    const positions = currentRects();
    const destination = resolveSequenceDrop(positions, stepId, x, y, locked);
    resetPreview();
    const valid = destination && !destination.blocked;
    overlay.dataset.dragBlocked = valid ? 'false' : 'true';
    indicator.hidden = !valid;
    if (!valid) {
      if (status)
        status.textContent = destination?.blocked
          ? '잠긴 항목을 넘을 수 없어요'
          : '목록 안에 놓아 주세요';
      return destination;
    }
    const from = positions.findIndex((r) => r.id === stepId),
      to = destination.index;
    const source = positions[from];
    const sourceCard = cards[from];
    const sameParentNext =
      from < positions.length - 1 &&
      cards[from + 1]?.parentElement === sourceCard?.parentElement;
    const sameParentPrev =
      from > 0 && cards[from - 1]?.parentElement === sourceCard?.parentElement;
    const nextGap =
      from < positions.length - 1
        ? Math.max(0, positions[from + 1].top - source.top - source.height)
        : 0;
    const prevGap =
      from > 0
        ? Math.max(0, source.top - positions[from - 1].top - positions[from - 1].height)
        : 0;
    let intraSectionGap =
      from < to && sameParentNext
        ? nextGap
        : from > to && sameParentPrev
          ? prevGap
          : sameParentNext
            ? nextGap
            : sameParentPrev
              ? prevGap
              : 0;
    if (!intraSectionGap) {
      for (let i = 0; i < cards.length - 1; i += 1) {
        if (cards[i]?.parentElement === cards[i + 1]?.parentElement) {
          const pairGap = Math.max(
            0,
            positions[i + 1].top - positions[i].top - positions[i].height,
          );
          if (pairGap > 0) {
            intraSectionGap = pairGap;
            break;
          }
        }
      }
    }
    const gap =
      from === to
        ? 10
        : intraSectionGap || (from < to ? nextGap : prevGap);
    const shift = source.height + gap;
    cards.forEach((element, i) => {
      if (from < to && i > from && i <= to) {
        element.style.transform = `translateY(${-shift}px)`;
        if (
          element.parentElement !== sourceCard?.parentElement &&
          element.previousElementSibling === null
        ) {
          const sectionHeader = element
            .closest('.pf-sequence-block')
            ?.querySelector<HTMLElement>('.pf-sequence-block__header');
          if (sectionHeader) sectionHeader.style.transform = `translateY(${-shift}px)`;
        }
      } else if (from > to && i >= to && i < from) {
        element.style.transform = `translateY(${shift}px)`;
        if (
          element.parentElement !== sourceCard?.parentElement &&
          element.previousElementSibling === null
        ) {
          const sectionHeader = element
            .closest('.pf-sequence-block')
            ?.querySelector<HTMLElement>('.pf-sequence-block__header');
          if (sectionHeader) sectionHeader.style.transform = `translateY(${shift}px)`;
        }
      }
    });
    cards[to]?.setAttribute('data-drag-over', 'true');
    const top =
      from < to ? positions[to].top + positions[to].height - source.height : positions[to].top;
    Object.assign(indicator.style, {
      left: `${source.left}px`,
      top: `${top}px`,
      width: `${source.width}px`,
      height: `${source.height}px`,
    });
    indicator.textContent = `${to + 1}번째 위치`;
    if (status) status.textContent = `${to + 1}번째에 놓기 · Esc 취소`;
    if (lastAnnouncement !== String(to)) {
      lastAnnouncement = String(to);
      onNotice(`${to + 1}번째 위치. 놓으면 순서가 바뀝니다.`);
    }
    return destination;
  };
  const tick = () => {
    if (!active || ended) return;
    const destination = draw();
    if (ended) return;
    if (destination) {
      const top = Math.max(
        0,
        document.querySelector('.topbar')?.getBoundingClientRect().bottom ?? 0,
      );
      const nav = document.querySelector<HTMLElement>('.bottom-nav');
      const navTop =
        nav && getComputedStyle(nav).display !== 'none'
          ? nav.getBoundingClientRect().top
          : window.innerHeight;
      const bottom = Math.min(window.innerHeight, navTop);
      const speed =
        y < top + 64
          ? -Math.min(18, (top + 64 - y) * 0.3)
          : y > bottom - 64
            ? Math.min(18, (y - bottom + 64) * 0.3)
            : 0;
      const maxScroll = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
      if ((speed < 0 && window.scrollY > 0) || (speed > 0 && window.scrollY < maxScroll))
        window.scrollBy(0, speed);
    }
    frame = requestAnimationFrame(tick);
  };
  const move = (nextX: number, nextY: number) => {
    if (ended) return;
    x = nextX;
    y = nextY;
    if (!active && Math.hypot(x - startX, y - startY) < 8) return;
    if (!active) {
      begin();
      frame = requestAnimationFrame(tick);
    }
    draw();
  };
  const finish = (nextX: number, nextY: number) => {
    if (ended) return;
    x = nextX;
    y = nextY;
    const destination = active ? draw() : null;
    if (ended) return;
    const changed = destination && !destination.blocked && destination.targetId !== stepId;
    cleanup();
    if (changed) {
      onCommit(destination.targetId);
      // React may remount a section run. Resolve the stable ID after the commit, not the old node.
      requestAnimationFrame(() => {
        const target = Array.from(list.querySelectorAll<HTMLElement>('[data-order-step]')).find(
          (e) => e.dataset.orderStep === stepId,
        );
        const r = target?.getBoundingClientRect();
        if (overlay && r && !reduced && overlay.animate) {
          const old = overlay.getBoundingClientRect();
          const animation = overlay.animate(
            [
              { left: `${old.left}px`, top: `${old.top}px`, transform: 'none' },
              { left: `${r.left}px`, top: `${r.top}px`, transform: 'none' },
            ],
            { duration: 160, easing: 'ease-out' },
          );
          animation.onfinish = () => overlay?.remove();
          animation.oncancel = () => overlay?.remove();
          window.setTimeout(() => overlay?.remove(), 220);
        } else overlay?.remove();
      });
    } else {
      overlay?.remove();
      if (active)
        onNotice(
          destination?.blocked
            ? '잠긴 항목의 위치는 유지합니다.'
            : '순서를 바꾸지 않았어요. 원래 위치를 유지합니다.',
        );
    }
    if (active) focus();
  };
  cancelActiveDrag = cancel;
  return { move, finish, cancel, isActive: () => active && !ended };
}
