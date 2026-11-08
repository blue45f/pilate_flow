/** Read optional date-only metadata without rewriting older records. */
export function getDateOnlyCalendarDate(metadata: unknown): string | undefined {
  if (typeof metadata !== 'object' || metadata === null) return undefined;
  const value = metadata as Record<string, unknown>;
  if (!Object.hasOwn(value, 'dateOnly') || value.dateOnly !== true ||
      !Object.hasOwn(value, 'taughtDate') || typeof value.taughtDate !== 'string') return undefined;
  const date = value.taughtDate;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date.startsWith('0000')) return undefined;
  const parsed = new Date(date + 'T00:00:00.000Z');
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date) return undefined;
  return date;
}

interface HistoryDateCarrier {
  taughtAt: string;
  dateOnly?: unknown;
  taughtDate?: unknown;
  programSnapshot?: unknown;
}

/** Keep the original timestamp when a trustworthy calendar date is unavailable. */
export function getTeachingHistoryDateSource(record: HistoryDateCarrier): string {
  return getDateOnlyCalendarDate(record) ??
    getDateOnlyCalendarDate(record.programSnapshot) ?? record.taughtAt;
}


function calendarSortKey(record: HistoryDateCarrier): string {
  const source = getTeachingHistoryDateSource(record).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(source)) return source;
  const date = new Date(source);
  if (Number.isNaN(date.getTime())) return '';
  return String(date.getFullYear()).padStart(4, '0') + '-' +
    String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0');
}

/** Display-date first; retain original instant order within the same date. */
export function compareTeachingHistoryDates(a: HistoryDateCarrier, b: HistoryDateCarrier): number {
  return calendarSortKey(b).localeCompare(calendarSortKey(a)) ||
    Date.parse(b.taughtAt) - Date.parse(a.taughtAt);
}
