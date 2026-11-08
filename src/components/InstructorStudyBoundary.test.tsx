import { lazy, Suspense } from 'react';
import type { ComponentType } from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { InstructorStudyBoundary } from './InstructorStudyBoundary';

beforeEach(() => {
  vi.spyOn(HTMLDialogElement.prototype, 'close').mockImplementation(function (
    this: HTMLDialogElement,
  ) {
    this.removeAttribute('open');
    this.dispatchEvent(new Event('close'));
  });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('optional instructor study failure containment', () => {
  it('renders working children without a recovery prompt or side effects', () => {
    const onClose = vi.fn();
    const onReload = vi.fn();
    render(
      <InstructorStudyBoundary onClose={onClose} onReload={onReload}>
        <p>정상 연습 화면</p>
      </InstructorStudyBoundary>,
    );
    expect(screen.getByText('정상 연습 화면')).toBeVisible();
    expect(screen.queryByRole('alert')).toBeNull();
    expect(onClose).not.toHaveBeenCalled();
    expect(onReload).not.toHaveBeenCalled();
  });

  it('contains a lazy rejection, hides internal error details, and closes only on request', async () => {
    const failure = new Error('PRIVATE_IMPORT_DETAILS https://private.invalid/study.js');
    const unexpected: unknown[][] = [];
    vi.spyOn(console, 'error').mockImplementation((...args: unknown[]) => {
      if (!args.includes(failure)) unexpected.push(args);
    });
    let reject!: (reason: Error) => void;
    const Deferred = lazy(
      () =>
        new Promise<{ default: ComponentType }>((_resolve, fail) => {
          reject = fail;
        }),
    );
    const onClose = vi.fn();
    const onReload = vi.fn();
    render(
      <>
        <p>기존 수업 유지</p>
        <InstructorStudyBoundary onClose={onClose} onReload={onReload}>
          <Suspense fallback={<p role="status">불러오는 중</p>}>
            <Deferred />
          </Suspense>
        </InstructorStudyBoundary>
      </>,
    );
    await act(async () => reject(failure));
    expect(
      await screen.findByRole('dialog', { name: '강사 연습실을 열지 못했어요' }),
    ).toBeVisible();
    expect(screen.getByText('기존 수업 유지')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent(
      '수업 구성과 저장·복구는 계속 사용할 수 있어요.',
    );
    expect(screen.queryByText(/PRIVATE_IMPORT_DETAILS|private.invalid/)).toBeNull();
    expect(onClose).not.toHaveBeenCalled();
    expect(onReload).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: '닫고 계속하기' }));
    expect(onClose).toHaveBeenCalledOnce();
    expect(onReload).not.toHaveBeenCalled();
    expect(unexpected).toEqual([]);
  });

  it('warns about unsaved input and reloads only after an explicit choice', () => {
    const failure = new Error('synthetic study render failure');
    const unexpected: unknown[][] = [];
    vi.spyOn(console, 'error').mockImplementation((...args: unknown[]) => {
      if (!args.includes(failure)) unexpected.push(args);
    });
    const Broken = () => {
      throw failure;
    };
    const onReload = vi.fn();
    const onClose = vi.fn();
    render(
      <InstructorStudyBoundary onClose={onClose} onReload={onReload}>
        <Broken />
      </InstructorStudyBoundary>,
    );
    expect(screen.getByText(/적용 전 입력 내용이 사라질 수/)).toBeVisible();
    expect(onReload).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: '페이지 새로고침' }));
    expect(onReload).toHaveBeenCalledOnce();
    expect(onClose).not.toHaveBeenCalled();
    expect(unexpected).toEqual([]);
  });

  it('starts a fresh boundary when the failed optional panel is closed and opened again', () => {
    const failure = new Error('synthetic study retry failure');
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const Broken = () => {
      throw failure;
    };
    const onClose = vi.fn();
    const view = render(
      <InstructorStudyBoundary onClose={onClose}>
        <Broken />
      </InstructorStudyBoundary>,
    );
    expect(screen.getByRole('dialog', { name: '강사 연습실을 열지 못했어요' })).toBeVisible();
    view.rerender(<></>);
    view.rerender(
      <InstructorStudyBoundary onClose={onClose}>
        <p>재진입한 정상 연습 화면</p>
      </InstructorStudyBoundary>,
    );
    expect(screen.getByText('재진입한 정상 연습 화면')).toBeVisible();
    expect(screen.queryByRole('alert')).toBeNull();
  });
});
