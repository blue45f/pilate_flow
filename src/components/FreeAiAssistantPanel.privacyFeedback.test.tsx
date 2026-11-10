import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FreeAiAssistantPanel } from './FreeAiAssistantPanel';
import { buildLocalClassDraft } from '../utils/freeAiAssistantEngine';
import { createFreeAiClient, createDefaultFreeAiStatus } from '../lib/freeAiClient';

const readyStatus = createDefaultFreeAiStatus({ enabled: true, exhausted: false, reason: 'ready' });
const failure = {
  status: 502,
  code: 'upstream_error',
  message: '외부 AI 응답 실패 (502)',
  quotaStatus: readyStatus,
};

beforeEach(() => sessionStorage.clear());
afterEach(cleanup);

function mount(postAssist = vi.fn().mockRejectedValue(failure)) {
  const client = createFreeAiClient({
    transport: { getStatus: async () => readyStatus, postAssist },
  });
  render(<FreeAiAssistantPanel exercises={[]} conditionTemplates={[]} client={client} />);
  return client;
}

describe('DEFECT-B3 corrected feedback behavior', () => {
  it('shows provider failure without a contradictory connected status and permits retry', async () => {
    mount();
    await waitFor(() =>
      expect(screen.getByRole('button', { name: '무료 AI 초안 만들기' })).toBeEnabled(),
    );
    fireEvent.click(screen.getByRole('button', { name: '무료 AI 초안 만들기' }));
    expect(await screen.findByText(failure.message)).toBeInTheDocument();
    expect(screen.getByText('AI 응답 확인 필요')).toBeInTheDocument();
    expect(screen.queryByText(/무료 AI 연결됨|무료 전용 AI 사용 가능/)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '무료 AI 초안 만들기' })).toBeEnabled();
  });

  it('does not carry completed action feedback into another tab or restore it on returning', async () => {
    mount();
    fireEvent.click(screen.getByRole('button', { name: '조건으로 초안 만들기' }));
    const feedback = '조건에 맞춰 수업 초안을 만들었어요. 순서와 시간을 자유롭게 다듬어 보세요.';
    const statusBanner = await screen.findByRole('status');
    expect(statusBanner).toHaveTextContent(feedback);
    expect(screen.getByLabelText('초안 제목 편집')).toBeInTheDocument();

    for (const tab of [
      '2. 새 동작 아이디어·변형',
      '3. 검토 동작·블록 시퀀스 구성',
      '4. 동작 탐색 추천',
      '1. 수업 초안 만들기',
    ]) {
      fireEvent.click(screen.getByRole('tab', { name: tab }));
      expect(screen.queryByText(feedback)).not.toBeInTheDocument();
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    }
    expect(screen.getByLabelText('초안 제목 편집')).toBeInTheDocument();
  });

  it('does not display a late error after navigating away and back while a request is pending', async () => {
    let rejectRequest!: (reason: unknown) => void;
    const postAssist = vi.fn().mockImplementation(
      () =>
        new Promise((_, reject) => {
          rejectRequest = reject;
        }),
    );
    mount(postAssist);
    await waitFor(() =>
      expect(screen.getByRole('button', { name: '무료 AI 초안 만들기' })).toBeEnabled(),
    );
    fireEvent.click(screen.getByRole('button', { name: '무료 AI 초안 만들기' }));
    await waitFor(() => expect(postAssist).toHaveBeenCalledOnce());
    fireEvent.click(screen.getByRole('tab', { name: '2. 새 동작 아이디어·변형' }));
    fireEvent.click(screen.getByRole('tab', { name: '1. 수업 초안 만들기' }));
    await act(async () => rejectRequest(failure));
    expect(screen.queryByText(failure.message)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '무료 AI 초안 만들기' })).toBeEnabled();
  });

  it('does not publish a late successful draft or feedback into a newly selected tab', async () => {
    let resolveRequest!: (value: unknown) => void;
    const postAssist = vi.fn().mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveRequest = resolve;
        }),
    );
    mount(postAssist);
    await waitFor(() =>
      expect(screen.getByRole('button', { name: '무료 AI 초안 만들기' })).toBeEnabled(),
    );
    fireEvent.click(screen.getByRole('button', { name: '무료 AI 초안 만들기' }));
    await waitFor(() => expect(postAssist).toHaveBeenCalledOnce());
    fireEvent.click(screen.getByRole('tab', { name: '2. 새 동작 아이디어·변형' }));
    await act(async () =>
      resolveRequest({
        status: readyStatus,
        result: buildLocalClassDraft(
          {
            durationMinutes: 50,
            theme: '코어 조절',
            strengthenAreas: ['core'],
            level: '1.5',
            apparatus: 'reformer',
          },
          [],
        ),
      }),
    );
    expect(
      screen.queryByText('조건에 맞춰 편집 가능한 수업 초안을 만들었어요.'),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(screen.getByRole('tab', { name: '2. 새 동작 아이디어·변형' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(screen.queryByTestId('free-ai-loading-banner')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: '1. 수업 초안 만들기' }));
    expect(screen.queryByLabelText('초안 제목 편집')).not.toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
});
