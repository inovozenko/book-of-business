import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';

import {act, renderHook} from '@testing-library/react';

import {useLoadingIndicator} from './use-loading-indicator.ts';

const timing = {delay: 200, minDuration: 400};

/** Runs `pending` work that ends after `duration` and records whether the indicator shows at each of `moments`. */
function follow(duration: number, moments: number[]) {
  const {result, rerender} = renderHook(({pending}) => useLoadingIndicator(pending, timing), {initialProps: {pending: true}});
  const seen: Record<number, boolean> = {};
  let now = 0;

  for (const moment of [...new Set([...moments, duration])].sort((a, b) => a - b)) {
    act(() => {
      vi.advanceTimersByTime(moment - now);
    });
    now = moment;

    if (moment === duration) {
      rerender({pending: false});
      // Timers due at this very moment fire before anyone looks.
      act(() => {
        vi.advanceTimersByTime(0);
      });
    }

    if (moments.includes(moment)) {
      seen[moment] = result.current;
    }
  }

  return seen;
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('useLoadingIndicator', () => {
  it('never shows for work that is not pending', () => {
    const {result} = renderHook(() => useLoadingIndicator(false, timing));

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(result.current).toBe(false);
  });

  it('shows nothing for work that ends before the delay', () => {
    expect(follow(50, [0, 49, 199, 200, 1000])).toEqual({0: false, 49: false, 199: false, 200: false, 1000: false});
  });

  it('keeps the indicator for the minimum duration when the work ends just after the delay', () => {
    expect(follow(250, [199, 200, 250, 599, 600])).toEqual({199: false, 200: true, 250: true, 599: true, 600: false});
  });

  it('hides the indicator as soon as long work ends', () => {
    expect(follow(2000, [199, 200, 1999, 2000])).toEqual({199: false, 200: true, 1999: true, 2000: false});
  });

  it('stays shown when the work starts again while it is held', () => {
    const {result, rerender} = renderHook(({pending}) => useLoadingIndicator(pending, timing), {initialProps: {pending: true}});

    act(() => {
      vi.advanceTimersByTime(250);
    });
    rerender({pending: false});
    act(() => {
      vi.advanceTimersByTime(100);
    });
    rerender({pending: true});
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(result.current).toBe(true);
  });
});
