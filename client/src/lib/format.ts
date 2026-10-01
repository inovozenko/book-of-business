import {APP_LOCALE} from './locale.ts';

// Grouped digits make large counts readable; fractional values, which the API allows, stay as they are.
const numberFormat = new Intl.NumberFormat(APP_LOCALE, {maximumFractionDigits: 20});

/** A count as the app shows it, such as 153,953. */
export function formatNumber(value: number): string {
  return numberFormat.format(value);
}
