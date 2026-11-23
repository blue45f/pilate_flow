import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { INITIAL_HISTORY_LOGS } from '../data/pilatesCatalog';
import { SmartBusinessAdvisorPanel } from './SmartBusinessAdvisorPanel';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('SmartBusinessAdvisorPanel', () => {
  it('1. 최초 마운트 시 localStorage.setItem을 절대 호출하지 않으며 historyLogs가 0건이면 예시 시뮬레이션 기준 배지를 표시한다', () => {
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem');

    render(<SmartBusinessAdvisorPanel historyLogs={[]} activeApparatus="reformer" />);

    expect(setItemSpy).not.toHaveBeenCalled();

    const panel = screen.getByTestId('smart-business-advisor-panel');
    expect(panel).toHaveAttribute('data-source-mode', 'simulation');
    expect(screen.getByTestId('sba-data-source-badge')).toHaveTextContent('예시 시뮬레이션 기준');
    expect(screen.getByText(/실측 매출이 아니며/)).toBeInTheDocument();

    const briefs = within(screen.getByTestId('sba-actionable-briefs')).getAllByRole('listitem');
    expect(briefs).toHaveLength(3);
  });

  it('2. 실제 historyLogs가 전달되면 실제 수업 기록 기준 배지와 단가·정원 조절 및 일일 브리핑 1탭 복사가 동작한다', async () => {
    render(
      <SmartBusinessAdvisorPanel
        historyLogs={INITIAL_HISTORY_LOGS}
        activeApparatus="reformer"
        roleMode="center-manager"
      />,
    );

    const panel = screen.getByTestId('smart-business-advisor-panel');
    expect(panel).toHaveAttribute('data-source-mode', 'recorded');
    expect(panel).toHaveAttribute('data-role-mode', 'center-manager');
    expect(screen.getByTestId('sba-data-source-badge')).toHaveTextContent('실제 수업 기록 기준');
    expect(screen.getByTestId('sba-top-apparatus')).toHaveTextContent('리포머');
    expect(screen.getByTestId('sba-peak-time-band')).toHaveTextContent('오전 (06~12시)');

    const beforeDaily = screen.getByTestId('sba-daily-revenue').textContent;
    const groupFeeInput = screen.getByLabelText('그룹 1인 단가 (원)');
    fireEvent.change(groupFeeInput, { target: { value: '40000' } });
    const afterDaily = screen.getByTestId('sba-daily-revenue').textContent;
    expect(afterDaily).not.toBe(beforeDaily);

    fireEvent.click(screen.getByRole('button', { name: /기본값 복원/ }));
    expect(screen.getByTestId('sba-daily-revenue').textContent).toBe(beforeDaily);

    fireEvent.click(screen.getByRole('button', { name: /일일 브리핑 복사/ }));
    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
        expect.stringContaining('실제 수업 기록 기준'),
      );
    });
    expect(screen.getByText(/클립보드에 복사했어요/)).toBeInTheDocument();
  });

  it('3. 결석 보강 자동 추천 탭에서 조건별 TOP 3 추천, 보강 멘트 1탭 복사, 임시 배정 및 되돌리기가 동작한다', async () => {
    render(<SmartBusinessAdvisorPanel historyLogs={[]} activeApparatus="reformer" />);

    fireEvent.click(screen.getByRole('tab', { name: /결석 보강 자동 추천/ }));

    // 만석 슬롯(수요일 19:30)은 추천 목록에 절대 나타나지 않아야 함
    const recContainer = screen.getByTestId('sba-makeup-recommendations');
    expect(within(recContainer).queryByText(/수요일 19:30/)).not.toBeInTheDocument();

    // 조건 변경: 운다 체어 + Lv 2.0 + 저녁 -> 금요일 20:00 운다 체어 (Lv 2.0)가 1순위 100점
    fireEvent.click(screen.getByRole('button', { name: '운다 체어' }));
    fireEvent.click(screen.getByRole('button', { name: 'Lv 2.0 심화' }));
    fireEvent.click(screen.getByRole('button', { name: '저녁' }));

    const topCard = screen.getByTestId('sba-rec-card-slot-fri-2000-chair');
    expect(within(topCard).getByText('추천 1순위')).toBeInTheDocument();
    expect(within(topCard).getByText('매칭 100점')).toBeInTheDocument();
    expect(within(topCard).getByText('잔여 2석')).toBeInTheDocument();

    // 보강 안내 멘트 1탭 복사
    fireEvent.click(within(topCard).getByRole('button', { name: /보강 안내 멘트 복사/ }));
    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
        expect.stringContaining('금요일 20:00'),
      );
    });

    // 보강 임시 배정 -> 잔여 2석 -> 잔여 1석으로 즉시 감소
    fireEvent.click(within(topCard).getByRole('button', { name: /보강 임시 배정/ }));
    expect(within(topCard).getByText('잔여 1석')).toBeInTheDocument();

    // 임시 배정 내역에서 되돌리기 클릭 -> 잔여 2석으로 원복
    const assignedTray = screen.getByLabelText('임시 보강 배정 내역');
    fireEvent.click(within(assignedTray).getByRole('button', { name: /배정 되돌리기/ }));
    expect(within(topCard).getByText('잔여 2석')).toBeInTheDocument();
  });

  it('4. 1석 남은 슬롯을 임시 배정하면 추천 목록에서 제외되고 되돌리기 시 다시 복원된다', () => {
    render(<SmartBusinessAdvisorPanel historyLogs={[]} activeApparatus="reformer" />);

    fireEvent.click(screen.getByRole('tab', { name: /결석 보강 자동 추천/ }));
    fireEvent.click(screen.getByRole('button', { name: '저녁' }));

    // 화요일 19:00 리포머 Lv 1.5는 초기 잔여 1석(5/6)
    const oneSeatCard = screen.getByTestId('sba-rec-card-slot-tue-1900-reformer');
    expect(within(oneSeatCard).getByText('잔여 1석')).toBeInTheDocument();

    fireEvent.click(within(oneSeatCard).getByRole('button', { name: /보강 임시 배정/ }));
    expect(screen.queryByTestId('sba-rec-card-slot-tue-1900-reformer')).not.toBeInTheDocument();

    const assignedTray = screen.getByLabelText('임시 보강 배정 내역');
    fireEvent.click(within(assignedTray).getByRole('button', { name: /배정 되돌리기/ }));
    expect(screen.getByTestId('sba-rec-card-slot-tue-1900-reformer')).toBeInTheDocument();
  });

  it('5. 비식별 원칙과 Wave 18 Calm Atelier CSS 기준(13px 이상·italic/gradient 금지)을 지킨다', () => {
    render(<SmartBusinessAdvisorPanel historyLogs={[]} />);

    fireEvent.click(screen.getByRole('tab', { name: /결석 보강 자동 추천/ }));
    const aliasInput = screen.getByLabelText('비식별 회원 별칭');
    fireEvent.change(aliasInput, { target: { value: '김철수 회원 010-9999-8888 디스크' } });

    expect(screen.getByText(/비식별 별칭.*자동 정리했어요/)).toBeInTheDocument();
    const recText = screen.getByTestId('sba-makeup-recommendations').textContent ?? '';
    expect(recText).not.toContain('김철수');
    expect(recText).not.toContain('010-9999-8888');
    expect(recText).not.toContain('디스크');

    const css = readFileSync(resolve(process.cwd(), 'src/styles/smart-biz-makeup.css'), 'utf8');
    expect(css).not.toMatch(/font-style\s*:\s*italic/i);
    expect(css).not.toMatch(/font-weight\s*:\s*(?:700|800|900|bold)\b/i);
    expect(css).not.toMatch(/transition\s*:\s*all\b/i);
    expect(css).not.toMatch(/linear-gradient/i);
    expect(css).toContain('word-break: keep-all');
    expect(css).toContain('font-variant-numeric: tabular-nums');
    expect(css).toContain('min-height: 44px');
  });
});
