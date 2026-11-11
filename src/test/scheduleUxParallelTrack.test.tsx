import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { InstructorScheduleView } from '../components/InstructorScheduleView';

describe('Parallel Track 1 — InstructorScheduleView UX Elevation', () => {
  it('renders today glance summary strip on InstructorScheduleView', () => {
    render(<InstructorScheduleView />);
    const strip = screen.getByTestId('schedule-today-glance-strip');
    expect(strip).toHaveTextContent(/오늘 예정 수업 \d+건/);
    expect(strip).toHaveTextContent(/시퀀스 연결 \d+건/);
  });
});
