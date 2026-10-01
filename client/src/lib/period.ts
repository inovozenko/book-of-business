import {APP_LOCALE} from './locale.ts';

const formatter = new Intl.DateTimeFormat(APP_LOCALE, {month: 'short', year: 'numeric', timeZone: 'UTC'});

/** The year in a page address, such as "2024", or `null` when the text is not a four-digit year. */
export function parseYear(text: string): number | null {
  return /^\d{4}$/.test(text) ? Number(text) : null;
}

/**
 * Labels of consecutive months, such as "Feb 2024" … "Jan 2025".
 *
 * @param year Year of the first month.
 * @param firstMonthIndex Zero-based month the period starts with.
 * @param length Number of months.
 */
export function monthLabels(year: number, firstMonthIndex: number, length: number): string[] {
  return Array.from({length}, (_, offset) => formatter.format(new Date(Date.UTC(year, firstMonthIndex + offset, 1))));
}
