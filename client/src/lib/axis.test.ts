import {describe, expect, it} from 'vitest';

import {niceAxis, stackTotals} from './axis.ts';

describe('niceAxis', () => {
  it.each([
    [350, 400, 100],
    [38, 40, 10],
    [400, 400, 100],
    [401, 800, 200],
    [0, 4, 1],
    [4, 4, 1],
    [5, 8, 2],
    [0.3, 4, 1],
    [160, 200, 50],
    [22, 40, 10],
    [12_345, 20_000, 5_000]
  ])('fits a maximum of %s into 0–%s with a step of %s', (maximum, top, step) => {
    expect(niceAxis(maximum)).toEqual({max: top, step, ticks: [0, step, 2 * step, 3 * step, 4 * step]});
  });

  it('supports another number of intervals', () => {
    expect(niceAxis(90, 2)).toEqual({max: 100, step: 50, ticks: [0, 50, 100]});
  });

  it.each([-1, Number.NaN, Number.POSITIVE_INFINITY])('rejects %s', (maximum) => {
    expect(() => niceAxis(maximum)).toThrow(RangeError);
  });
});

describe('stackTotals', () => {
  it('adds the series month by month', () => {
    expect(stackTotals([{values: [1, 2]}, {values: [3, 4]}], 2)).toEqual([4, 6]);
  });

  it('treats missing months as zero', () => {
    expect(stackTotals([{values: [1]}], 2)).toEqual([1, 0]);
    expect(stackTotals([], 3)).toEqual([0, 0, 0]);
  });
});
