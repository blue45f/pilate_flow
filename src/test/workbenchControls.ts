import { expect } from 'vitest';
import { fireEvent, screen, within } from '@testing-library/react';

/** Open the actual conditions dialog only when a journey needs to edit its fields. */
export function openWorkbenchConditions() {
  let dialog = screen.queryByRole('dialog', { name: '수업 조건' });
  if (!dialog) {
    fireEvent.click(screen.getByRole('button', { name: '수업 조건' }));
    dialog = screen.getByRole('dialog', { name: '수업 조건' });
  }
  return within(dialog);
}

/** Use the explicit footer action so jsdom's native-close polyfill is not a state shortcut. */
export function closeWorkbenchConditions() {
  const dialog = screen.queryByRole('dialog', { name: '수업 조건' });
  if (dialog) fireEvent.click(within(dialog).getAllByRole('button', { name: '닫기' }).at(-1)!);
}

/** Empty drafts keep automatic setup in an explicit, initially collapsed panel. */
export function openWorkbenchAutomation() {
  const summary = screen.getByText('자동 구성·휴식 먼저 넣기', { selector: 'summary' });
  const panel = summary.closest('details')!;
  if (!panel.open) fireEvent.click(summary);
  return within(panel);
}

/** Starting a prepared class is a continuation from its reviewed plan preview. */
export function openWorkbenchPlanPreview() {
  fireEvent.click(screen.getByRole('button', { name: '시퀀스 미리보기' }));
  return within(screen.getByRole('dialog', { name: '전체 수업 계획 미리보기' }));
}

/** The same inspector is a native sheet below1200px and a side panel above it. */
export function openWorkbenchBlockInspector(index: number) {
  const name = `${index + 1}번 동작 블록 편집`;
  let inspector = screen.queryByRole('region', { name });
  if (!inspector) {
    fireEvent.click(screen.getByRole('button', { name }));
    inspector = screen.getByRole('region', { name });
  }
  return within(inspector);
}

export function closeWorkbenchBlockInspector() {
  const dialog = screen.queryByRole('dialog', { name: '동작 블록 편집' });
  if (dialog) {
    fireEvent.click(within(dialog).getByRole('button', { name: '닫기' }));
    // The setup close() polyfill removes open but does not emit the browser's
    // native close event. Deliver that event after the actual Close action.
    fireEvent(dialog, new Event('close'));
  } else {
    const close = screen.queryByRole('button', { name: '동작 속성 닫기' });
    if (close) fireEvent.click(close);
  }
}

export function openWorkbenchBlockMemo(index: number) {
  const inspector = openWorkbenchBlockInspector(index);
  const summary = inspector.getByText('이번 수업의 기구 세팅·티칭 메모', { selector: 'summary' });
  if (!summary.closest('details')?.open) fireEvent.click(summary);
  return inspector;
}

/** Expand the real disclosure before querying or activating a secondary workbench action. */
export function getVisibleWorkbenchButton(name: string) {
  const label = /^(직접 편집|자동 구성)$/.test(name)
    ? /^편집 방식/
    : /^[123] /.test(name)
      ? /^수업 준비 순서$/
      : /^(조건 불러오기·자동 구성|자동 구성·휴식 먼저 넣기)$/;
  const summary = screen.getByText(label, { selector: 'summary' });
  if (!summary.closest('details')?.open) fireEvent.click(summary);
  const button = screen.getByRole('button', { name });
  expect(button).toBeVisible();
  return button;
}
