import { describe, expect, it, beforeEach, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { usePilatesStore } from '../store/usePilatesStore';
import {
  collectVisibleWorkspaceLandmarks,
  cycleWorkspaceLandmark,
} from '../utils/workspaceLandmarkNavigation';
import { SequenceWorkbench } from '../components/SequenceWorkbench';
import { readFileSync } from 'node:fs';
import path from 'node:path';

describe('Wave 11 Adversarial Full-Stack Quality Harness (AC-201 .. AC-204)', () => {
  beforeEach(() => {
    localStorage.clear();
    usePilatesStore.setState({
      activeTitle: '초기 매트 수업',
      activeSteps: [],
      undoStack: [],
      redoStack: [],
      generationError: null,
      saveFeedback: null,
    });
  });

  it('AC-201: F6 / Shift+F6 cycles focus across visible non-inert landmarks and skips hidden/inert regions', () => {
    const container = document.createElement('div');
    container.innerHTML = `
      <header class="topbar" aria-label="상단 도구바"><button>검색</button></header>
      <aside class="sidebar" aria-label="스튜디오 탐색"><button>메뉴</button></aside>
      <main id="main-content" aria-label="주요 작업 영역"><button>동작 추가</button></main>
      <nav class="bottom-nav" inert aria-label="모바일 주 메뉴"><button>작성</button></nav>
    `;
    document.body.appendChild(container);
    try {
      const visible = collectVisibleWorkspaceLandmarks(document);
      expect(visible.map((el) => el.getAttribute('aria-label'))).toEqual([
        '상단 도구바',
        '스튜디오 탐색',
        '주요 작업 영역',
      ]);

      const first = cycleWorkspaceLandmark(1, document);
      expect(first.moved).toBe(true);
      expect(first.targetLabel).toBe('상단 도구바');
      expect(document.activeElement).toBe(visible[0]);

      const second = cycleWorkspaceLandmark(1, document);
      expect(second.targetLabel).toBe('스튜디오 탐색');
      expect(document.activeElement).toBe(visible[1]);

      const backward = cycleWorkspaceLandmark(-1, document);
      expect(backward.targetLabel).toBe('상단 도구바');
      expect(document.activeElement).toBe(visible[0]);
    } finally {
      container.remove();
    }
  });

  it('AC-202: usePilatesStore supports bidirectional Undo -> Redo and clears redoStack on new edits', () => {
    const store = usePilatesStore.getState();
    store.setActiveSequenceMeta({ title: '1차 수정 제목' });
    usePilatesStore.getState().setActiveSequenceMeta({ title: '2차 수정 제목' });

    expect(usePilatesStore.getState().activeTitle).toBe('2차 수정 제목');
    expect(usePilatesStore.getState().undoStack.length).toBe(2);
    expect(usePilatesStore.getState().redoStack.length).toBe(0);

    usePilatesStore.getState().undoSequence();
    expect(usePilatesStore.getState().activeTitle).toBe('1차 수정 제목');
    expect(usePilatesStore.getState().redoStack.length).toBe(1);

    usePilatesStore.getState().redoSequence();
    expect(usePilatesStore.getState().activeTitle).toBe('2차 수정 제목');
    expect(usePilatesStore.getState().redoStack.length).toBe(0);

    // Undo once then make a fresh edit -> redoStack must clear
    usePilatesStore.getState().undoSequence();
    expect(usePilatesStore.getState().redoStack.length).toBe(1);
    usePilatesStore.getState().setActiveSequenceMeta({ title: '분기 새 제목' });
    expect(usePilatesStore.getState().activeTitle).toBe('분기 새 제목');
    expect(usePilatesStore.getState().redoStack.length).toBe(0);
  });

  it('AC-202b: SequenceWorkbench wires Cmd/Ctrl+Shift+Z, Ctrl+Y, and Redo button while respecting IME isComposing', () => {
    const baseExercise = usePilatesStore.getState().exercises[0]!;
    usePilatesStore.setState({
      activeTitle: '리포머 코어',
      activeSteps: [
        {
          stepId: 's-1',
          order: 1,
          blockCategory: baseExercise.blockCategory,
          exerciseId: baseExercise.id,
          durationMin: 4,
          selectedLayer: 'standard',
        },
      ],
      undoStack: [],
      redoStack: [],
    });

    const { getByTestId, unmount } = render(
      <SequenceWorkbench
        onOpenYouTubePreview={vi.fn()}
        onOpenClipper={vi.fn()}
        onOpenLogModal={vi.fn()}
      />,
    );

    usePilatesStore.getState().setActiveSequenceMeta({ title: '리포머 코어 v2' });
    const redoBtn = getByTestId('workbench-redo-btn') as HTMLButtonElement;
    expect(redoBtn.disabled).toBe(true);

    // Cmd+Z -> Undo
    fireEvent.keyDown(window, { key: 'z', ctrlKey: true });
    expect(usePilatesStore.getState().activeTitle).toBe('리포머 코어');
    expect(redoBtn.disabled).toBe(false);

    // IME composing Cmd+Shift+Z must be ignored
    fireEvent.keyDown(window, { key: 'z', ctrlKey: true, shiftKey: true, isComposing: true });
    expect(usePilatesStore.getState().activeTitle).toBe('리포머 코어');

    // Ctrl+Y -> Redo
    fireEvent.keyDown(window, { key: 'y', ctrlKey: true });
    expect(usePilatesStore.getState().activeTitle).toBe('리포머 코어 v2');
    expect(redoBtn.disabled).toBe(true);

    unmount();
  });

  it('AC-203: High-contrast media queries and <=600 Hangul weights are enforced in active CSS', () => {
    const root = path.resolve(import.meta.dirname, '../..');
    const unslopCss = readFileSync(path.join(root, 'src/styles/atelier-unslop-system.css'), 'utf8');
    expect(unslopCss).toContain('@media (prefers-contrast: more)');
    expect(unslopCss).toContain('@media (forced-colors: active)');

    for (const rel of [
      'src/styles/mobile-subpages-user-first-v6.css',
      'src/styles/mobile-first-atelier-v3.css',
      'src/styles/atelier-luxury-v2.css',
      'src/styles/atelier-clean-declutter-v5.css',
      'src/styles/atelier-calm-luxury-polish.css',
      'src/styles/flow-studio.css',
      'src/styles/responsive-studio.css',
    ]) {
      const css = readFileSync(path.join(root, rel), 'utf8');
      expect(css).not.toMatch(/font-weight:\s*(?:[789]00|bold)\b/);
    }
  });
});
