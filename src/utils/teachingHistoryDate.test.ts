import { describe, expect, it } from 'vitest';
import { compareTeachingHistoryDates, getDateOnlyCalendarDate, getTeachingHistoryDateSource } from './teachingHistoryDate';

describe('optional date-only calendar metadata', () => {
  it.each(['2026-11-05', '2024-02-29', '2000-02-29', '0001-01-01', '9999-12-31'])(
    'keeps a valid calendar date %s without comparing it to a UTC timestamp', taughtDate => {
      expect(getDateOnlyCalendarDate({ dateOnly: true, taughtDate })).toBe(taughtDate);
      expect(getTeachingHistoryDateSource({
        taughtAt: '2026-11-04T22:00:00.000Z',
        programSnapshot: { dateOnly: true, taughtDate },
      })).toBe(taughtDate);
    },
  );

  it.each([
    '2026-02-29', '2026-02-30', '1900-02-29', '2026-13-01',
    '2026-00-10', '2026-11-00', '0000-01-01', '2026-1-5',
    '2026-11-05T03:00:00Z', ' 2026-11-05 ', '', 'not-a-date',
  ])('ignores invalid metadata %s without changing the original ISO', taughtDate => {
    const original = {
      taughtAt: '2026-11-05T03:00:00.000Z',
      programSnapshot: { dateOnly: true, taughtDate },
    };
    const before = structuredClone(original);
    expect(getDateOnlyCalendarDate(original.programSnapshot)).toBeUndefined();
    expect(getTeachingHistoryDateSource(original)).toBe(original.taughtAt);
    expect(original).toEqual(before);
  });

  it.each([undefined, false, 'true', 1])('requires the explicit boolean dateOnly flag %s', dateOnly => {
    expect(getDateOnlyCalendarDate({ dateOnly, taughtDate: '2026-11-05' })).toBeUndefined();
  });

  it('ignores absent, non-object, non-string and inherited metadata', () => {
    [undefined, null, 1, '2026-11-05', { dateOnly: true }, { dateOnly: true, taughtDate: 20261105 }]
      .forEach(value => expect(getDateOnlyCalendarDate(value)).toBeUndefined());
    expect(getDateOnlyCalendarDate(Object.create({ dateOnly: true, taughtDate: '2026-11-05' }))).toBeUndefined();
  });

  it('preserves older date-only and explicit-time records when no valid date is stored', () => {
    const taughtAt = '2026-11-05T03:00:00.000Z';
    expect(getTeachingHistoryDateSource({ taughtAt, programSnapshot: { dateOnly: true } })).toBe(taughtAt);
    expect(getTeachingHistoryDateSource({ taughtAt, programSnapshot: { taughtDate: '2026-11-04' } })).toBe(taughtAt);
    expect(getTeachingHistoryDateSource({ taughtAt, dateOnly: false, taughtDate: '2026-11-04' })).toBe(taughtAt);
  });
});


it('sorts mixed-zone calendar dates first and preserves ISO order within each date', () => {
  const record = (id: string, taughtAt: string, taughtDate: string) => ({
    id, taughtAt, programSnapshot: { dateOnly: true, taughtDate },
  });
  const records = [
    record('older-west', '2026-11-05T00:00:00.000Z', '2026-11-04'),
    record('newer-east', '2026-11-04T22:00:00.000Z', '2026-11-05'),
    record('newer-seoul', '2026-11-05T03:00:00.000Z', '2026-11-05'),
  ];
  expect([...records].sort(compareTeachingHistoryDates).map(item => item.id)).toEqual([
    'newer-seoul', 'newer-east', 'older-west',
  ]);
  expect(records[0].id).toBe('older-west');
});

it('keeps explicit instants chronological and unknown dates last', () => {
  const records = [
    { taughtAt: 'not-a-date' },
    { taughtAt: '2026-11-05T00:00:00.000Z' },
    { taughtAt: '2026-11-06T00:00:00.000Z' },
  ];
  expect([...records].sort(compareTeachingHistoryDates).map(item => item.taughtAt)).toEqual([
    '2026-11-06T00:00:00.000Z', '2026-11-05T00:00:00.000Z', 'not-a-date',
  ]);
});
