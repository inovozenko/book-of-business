import {describe, expect, it} from 'vitest';

import {formatNumber} from './format.ts';

describe('formatNumber', () => {
  it.each([
    [0, '0'],
    [350, '350'],
    [1683, '1,683'],
    [153953, '153,953'],
    [1250000, '1,250,000']
  ])('groups the digits of %s as %s', (value, text) => {
    expect(formatNumber(value)).toBe(text);
  });

  it('keeps fractional values as they are', () => {
    expect(formatNumber(0.5)).toBe('0.5');
    expect(formatNumber(1234.125)).toBe('1,234.125');
  });
});
