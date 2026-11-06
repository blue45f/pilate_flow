import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { getMotionDraft } from '../data/motionDrafts';
import type { MotionDraftDefinition } from '../data/motionDrafts';
import { MotionDraftReviewWorksheet } from '../components/MotionDraftReviewWorksheet';
import { MOTION_REVIEW_COMPARISON_NOTES_SCOPE } from '../utils/motionReviewWorksheet';

const chest = getMotionDraft('supine-chest-lift');
if (!chest) throw new Error('Chest fixture missing');
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
function openWorksheet() {
  fireEvent.click(screen.getByText('이 제안의 검토 자료'));
  return within(screen.getByRole('region', { name: '선택한 제안의 검토 자료' }));
}

describe('compact read-only selected-proposal worksheet', () => {
  it('starts collapsed, exposes separate source/implementation/review identities and switches concise panes', () => {
    const before = JSON.stringify(chest);
    render(<MotionDraftReviewWorksheet draft={chest} />);
    expect(screen.getByText('이 제안의 검토 자료').closest('details')).not.toHaveAttribute('open');
    const region = openWorksheet();
    expect(region.getByText('supine-chest-lift')).toBeInTheDocument();
    expect(region.getByText(/정확 연결 아님/)).toBeInTheDocument();
    expect(region.getByText('0건 · 검수한 자산 해시 없음')).toBeInTheDocument();
    expect(region.getByLabelText('소스 구현 지문')).toHaveTextContent(/^[a-f0-9]{64}$/);
    expect(region.getByText('본문 사실 확인 기록 연결')).toBeInTheDocument();
    expect(region.getByRole('heading', { name: '참고 패턴·대조 메모' })).toBeVisible();
    expect(region.getByText(MOTION_REVIEW_COMPARISON_NOTES_SCOPE)).toBeVisible();
    expect(region.queryByRole('heading', { name: '대조한 본문 사실' })).not.toBeInTheDocument();
    expect(region.queryByRole('checkbox')).toBeNull();
    expect(region.queryByRole('textbox')).toBeNull();
    fireEvent.click(region.getByRole('button', { name: '단계·미확인' }));
    expect(region.getByRole('button', { name: '단계·미확인' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(region.getByText('단계 정의 · 도해 표시용')).toBeVisible();
    expect(
      within(
        screen
          .getByRole('region', { name: '선택한 제안의 검토 자료' })
          .querySelector('.mrw-phase-list')!,
      ).getAllByText(/정적 유지/),
    ).toHaveLength(3);
    fireEvent.click(region.getByRole('button', { name: '권리·대조 질문' }));
    expect(region.getByText('검토자가 대조할 질문 · 완료 기록 아님')).toBeVisible();
    expect(region.getByText(/원문 매체 재사용 허가는 미확인/)).toBeVisible();
    expect(JSON.stringify(chest)).toBe(before);
  });

  it('downloads actual current packet JSON without storage/network/clock writes and revokes replaced/unmounted URLs', () => {
    const create = vi
      .fn()
      .mockReturnValueOnce('blob:review-one')
      .mockReturnValueOnce('blob:review-two');
    const revoke = vi.fn();
    vi.stubGlobal(
      'URL',
      class extends URL {
        static createObjectURL = create;
        static revokeObjectURL = revoke;
      },
    );
    const clicks: string[] = [];
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      clicks.push(this.download);
    });
    const fetch = vi.spyOn(globalThis, 'fetch');
    const storage = [
      vi.spyOn(Storage.prototype, 'getItem'),
      vi.spyOn(Storage.prototype, 'setItem'),
      vi.spyOn(Storage.prototype, 'removeItem'),
      vi.spyOn(Storage.prototype, 'clear'),
    ];
    const raf = vi.fn();
    vi.stubGlobal('requestAnimationFrame', raf);
    const view = render(<MotionDraftReviewWorksheet draft={chest} />);
    const region = openWorksheet();
    fireEvent.click(region.getByRole('button', { name: '검토 자료 JSON 저장' }));
    fireEvent.click(region.getByRole('button', { name: '검토 자료 JSON 저장' }));
    expect(clicks).toEqual([
      'motion-review-supine-chest-lift-v2.json',
      'motion-review-supine-chest-lift-v2.json',
    ]);
    const blob = create.mock.calls[0][0] as Blob;
    expect(blob.type).toBe('application/json');
    expect(region.getByRole('status')).toHaveTextContent('승인·수업·이력 상태는 바뀌지 않습니다');
    expect(revoke).toHaveBeenCalledWith('blob:review-one');
    expect(fetch).not.toHaveBeenCalled();
    storage.forEach((method) => expect(method).not.toHaveBeenCalled());
    expect(raf).not.toHaveBeenCalled();
    view.unmount();
    expect(revoke).toHaveBeenCalledWith('blob:review-two');
  });

  it('labels legacy local planning statements as comparison notes separately from unbound source records', () => {
    const draft = getMotionDraft('supported-heel-raise');
    if (!draft) throw new Error('Supported heel raise fixture missing');
    render(<MotionDraftReviewWorksheet draft={draft} />);
    const region = openWorksheet();
    const heading = region.getByRole('heading', { name: '참고 패턴·대조 메모' });
    expect(heading).toBeVisible();
    expect(region.getByText('고정된 지지를 잡을 수 있다는 기존 계획 메모')).toBeVisible();
    expect(region.getByText(MOTION_REVIEW_COMPARISON_NOTES_SCOPE)).toBeVisible();
    expect(region.queryByText('본문 사실 확인 기록 연결')).not.toBeInTheDocument();
    expect(region.getByRole('heading', { name: '이 제안의 원문 사실 기록' })).toBeVisible();
    expect(region.getAllByText('원문 링크 기록 · 사실 지문 미연결').length).toBeGreaterThan(0);
  });

  it('keeps incomplete binding unavailable and never presents legacy missing phase metadata as a hold', () => {
    const old = getMotionDraft('supported-heel-raise');
    if (!old) throw new Error('Fixture missing');
    const draft: MotionDraftDefinition = {
      ...old,
      id: 'unregistered-draft' as MotionDraftDefinition['id'],
      sources: old.sources.map(({ label, url }) => ({ label, url })),
      phases: old.phases.map((phase) => ({ ...phase, displayBehavior: undefined })),
    };
    render(<MotionDraftReviewWorksheet draft={draft} />);
    const region = openWorksheet();
    expect(region.getByRole('button', { name: '검토 자료 JSON 저장' })).toBeDisabled();
    expect(region.queryByText(/본문 사실 확인 기록 연결/)).not.toBeInTheDocument();
    fireEvent.click(region.getByRole('button', { name: '단계·미확인' }));
    expect(region.getAllByText(/유지·움직임 구분 미기록/)).toHaveLength(5);
    expect(region.queryByText('정적 유지')).toBeNull();
  });
});
