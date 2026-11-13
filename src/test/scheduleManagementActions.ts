import { fireEvent, screen } from '@testing-library/react';

/** Open the administration disclosure before using its secondary actions. */
export function openScheduleManagementAction(name: '장소 관리' | '휴무 등록') {
  const summary = screen.getByText('일정 관리', { selector: 'summary' });
  if (!summary.closest('details')?.open) fireEvent.click(summary);
  fireEvent.click(screen.getByRole('button', { name }));
}
