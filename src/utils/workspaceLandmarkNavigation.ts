/**
 * Deterministic F6 / Shift+F6 landmark cycling for Pilates Flow Atelier.
 * Cycles keyboard focus across visible, non-inert workspace regions without
 * stealing focus from open modal dialogs or active IME compositions.
 */

const LANDMARK_SELECTORS = [
  'header.topbar',
  'aside.sidebar',
  'main#main-content',
  'aside.v2-inline-finder',
  'nav.bottom-nav',
] as const;

export interface LandmarkCycleResult {
  readonly moved: boolean;
  readonly targetLabel: string | null;
  readonly targetElement: HTMLElement | null;
}

function isLandmarkInteractable(el: HTMLElement): boolean {
  if (!el.isConnected) return false;
  if (el.hasAttribute('hidden') || el.closest('[hidden]')) return false;
  if (el.hasAttribute('inert') || el.closest('[inert]')) return false;
  if (el.getAttribute('aria-hidden') === 'true') return false;
  if (typeof window !== 'undefined' && typeof window.getComputedStyle === 'function') {
    const style = window.getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden') return false;
  }
  return true;
}

export function collectVisibleWorkspaceLandmarks(root: ParentNode = document): HTMLElement[] {
  const found: HTMLElement[] = [];
  const seen = new Set<HTMLElement>();
  for (const selector of LANDMARK_SELECTORS) {
    const el = root.querySelector<HTMLElement>(selector);
    if (el && !seen.has(el) && isLandmarkInteractable(el)) {
      seen.add(el);
      found.push(el);
    }
  }
  return found;
}

export function describeWorkspaceLandmark(el: HTMLElement): string {
  const aria = el.getAttribute('aria-label')?.trim();
  if (aria) return aria;
  if (el.matches('header.topbar')) return '상단 도구바';
  if (el.matches('aside.sidebar')) return '스튜디오 탐색';
  if (el.matches('main#main-content')) return '주요 작업 영역';
  if (el.matches('nav.bottom-nav')) return '하단 탐색 메뉴';
  return '작업 영역';
}

export function cycleWorkspaceLandmark(
  direction: 1 | -1,
  doc: Document = document,
): LandmarkCycleResult {
  const landmarks = collectVisibleWorkspaceLandmarks(doc);
  if (landmarks.length === 0) {
    return { moved: false, targetLabel: null, targetElement: null };
  }

  const active = doc.activeElement instanceof HTMLElement ? doc.activeElement : null;
  const currentIdx = active
    ? landmarks.findIndex((region) => region === active || region.contains(active))
    : -1;

  const nextIdx =
    currentIdx < 0
      ? direction === 1
        ? 0
        : landmarks.length - 1
      : (currentIdx + direction + landmarks.length) % landmarks.length;

  const target = landmarks[nextIdx]!;
  if (!target.hasAttribute('tabindex')) {
    target.setAttribute('tabindex', '-1');
  }
  target.focus({ preventScroll: false });

  return {
    moved: true,
    targetLabel: describeWorkspaceLandmark(target),
    targetElement: target,
  };
}
