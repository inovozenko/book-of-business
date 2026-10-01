import {describe, expect, it} from 'vitest';

import {reportingMonths} from './use-clients.ts';

describe('reportingMonths', () => {
  it('runs from February of the default year without a year in the address', () => {
    expect(reportingMonths(undefined)).toEqual(expect.arrayContaining(['Feb 2024', 'Jan 2025']));
  });

  it('follows the year in the address, data or not', () => {
    expect(reportingMonths('2023')[0]).toBe('Feb 2023');
  });

  it('keeps 12 blank labels for text that is not a year', () => {
    expect(reportingMonths('abc')).toEqual(Array.from({length: 12}, () => ''));
  });
});
