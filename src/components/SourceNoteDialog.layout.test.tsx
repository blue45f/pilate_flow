import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SourceNoteDialog } from './SourceNoteDialog';
import { VERIFIED_REFERENCES } from '../data/verifiedReferences';
import { usePilatesStore } from '../store/usePilatesStore';

afterEach(cleanup);

describe('planning note grouped input layout', () => {
  it('keeps all required fields visible while folding only the longer guidance', () => {
    const { container } = render(<SourceNoteDialog onClose={vi.fn()} onSaved={vi.fn()} />);
    expect(container.querySelector('.source-note-input-guide')).not.toHaveAttribute('open');
    expect(screen.getByText('검토 전 초안 · 전문가 검증 아님')).toBeVisible();
    for (const name of ['동작과 장비', '수업 설정', '설명과 메모'])
      expect(screen.getByRole('region', { name })).toBeVisible();
    expect(screen.getByLabelText('내가 계획할 동작 이름 *')).toBeVisible();
    expect(screen.getByLabelText('직접 정한 계획 시간 · 분 *')).toBeVisible();
    expect(screen.getByLabelText('직접 작성한 티칭 큐 · 줄마다 하나 *')).toBeVisible();
    fireEvent.click(screen.getByText('작성·검토 기준'));
    expect(
      screen.getByText(/앱이 동작 설명이나 개인별 적용 방법을 생성하지 않습니다/),
    ).toBeVisible();
  });

  it('moves to the requested field without saving or making a pristine draft dirty', async () => {
    const onClose = vi.fn();
    const onSaved = vi.fn();
    const before = usePilatesStore.getState().exercises;
    render(<SourceNoteDialog onClose={onClose} onSaved={onSaved} />);
    for (const [button, field] of [
      ['수업 설정으로 이동', '직접 정한 계획 시간 · 분 *'],
      ['설명·메모로 이동', '직접 작성한 티칭 큐 · 줄마다 하나 *'],
      ['동작·장비로 이동', '내가 계획할 동작 이름 *'],
    ]) {
      fireEvent.click(screen.getByRole('button', { name: button }));
      await waitFor(() => expect(screen.getByLabelText(field)).toHaveFocus());
      expect(onSaved).not.toHaveBeenCalled();
    }
    fireEvent.click(screen.getByRole('button', { name: '취소' }));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('group', { name: '입력 내용을 어떻게 할까요?' })).toBeNull();
    expect(usePilatesStore.getState().exercises).toBe(before);
  });

  it('keeps edited fields through group navigation, dismissal and continued editing', async () => {
    render(<SourceNoteDialog onClose={vi.fn()} onSaved={vi.fn()} />);
    fireEvent.change(screen.getByLabelText('내가 계획할 동작 이름 *'), {
      target: { value: '합성 레이아웃 확인' },
    });
    fireEvent.click(screen.getByRole('button', { name: '설명·메모로 이동' }));
    const cues = screen.getByLabelText('직접 작성한 티칭 큐 · 줄마다 하나 *');
    await waitFor(() => expect(cues).toHaveFocus());
    fireEvent.change(cues, { target: { value: '합성 메모 · 실제 운동 지침 아님' } });
    fireEvent.click(screen.getByRole('button', { name: '취소' }));
    const decision = screen.getByRole('group', { name: '입력 내용을 어떻게 할까요?' });
    fireEvent.click(within(decision).getByRole('button', { name: '계속 편집' }));
    await waitFor(() => expect(cues).toHaveFocus());
    expect(cues).toHaveValue('합성 메모 · 실제 운동 지침 아님');
    expect(screen.getByLabelText('내가 계획할 동작 이름 *')).toHaveValue('합성 레이아웃 확인');
  });

  it('preserves visible source identity without filling planning metadata from it', () => {
    const reference = VERIFIED_REFERENCES.find((entry) => entry.id === 'mv-01')!;
    render(<SourceNoteDialog reference={reference} onClose={vi.fn()} onSaved={vi.fn()} />);
    const source = screen.getByRole('region', { name: '보존할 원출처' });
    expect(within(source).getByRole('link', { name: '원본 자료 확인' })).toHaveAttribute(
      'href',
      reference.url,
    );
    expect(source).toHaveTextContent('전문가 미검수');
    expect(screen.getByLabelText('내가 계획할 동작 이름 *')).toHaveValue(reference.title);
    expect(screen.getByLabelText('직접 정한 계획 시간 · 분 *')).toHaveValue(null);
    expect(screen.getByLabelText('직접 작성한 티칭 큐 · 줄마다 하나 *')).toHaveValue('');
    fireEvent.click(screen.getByText('원출처 범위와 입력 기준'));
    expect(
      screen.getByText(
        /관찰 시점·영상 길이·기구 설정은 동작 구간이나 계획 시간으로 가져오지 않습니다/,
      ),
    ).toBeVisible();
  });
});
