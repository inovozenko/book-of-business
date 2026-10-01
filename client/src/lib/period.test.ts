import {describe, expect, it} from 'vitest';

import {monthLabels, parseYear} from './period.ts';

describe('parseYear', () => {
  it('reads a four-digit year', () => {
    expect(parseYear('2024')).toBe(2024);
    expect(parseYear('2023')).toBe(2023);
  });

  it.each(['', 'abc', '24', '20245', ' 2024', '2024.0', '-2024'])('rejects "%s"', (text) => {
    expect(parseYear(text)).toBeNull();
  });
});

describe('monthLabels', () => {
  it('runs 12 months from February into January of the next year', () => {
    expect(monthLabels(2024, 1, 12)).toEqual([
      'Feb 2024',
      'Mar 2024',
      'Apr 2024',
      'May 2024',
      'Jun 2024',
      'Jul 2024',
      'Aug 2024',
      'Sep 2024',
      'Oct 2024',
      'Nov 2024',
      'Dec 2024',
      'Jan 2025'
    ]);
  });

  it('follows the given year', () => {
    expect(monthLabels(2030, 1, 12).at(-1)).toBe('Jan 2031');
  });
});
