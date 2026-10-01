const MULTIPLIERS = [1, 2, 5];

export interface Axis {
  max: number;
  step: number;
  ticks: number[];
}

/**
 * A value axis that starts at zero and has `intervals` equal steps. The step is the
 * smallest number of the form 1, 2 or 5 × 10ⁿ, and at least 1, whose steps reach `maxValue`.
 */
export function niceAxis(maxValue: number, intervals = 4): Axis {
  if (!Number.isFinite(maxValue) || maxValue < 0) {
    throw new RangeError(`Cannot build an axis up to ${maxValue}`);
  }

  const step = niceStep(maxValue / intervals);

  return {max: step * intervals, step, ticks: Array.from({length: intervals + 1}, (_, index) => index * step)};
}

function niceStep(minimum: number): number {
  for (let magnitude = 1; ; magnitude *= 10) {
    const step = MULTIPLIERS.map((multiplier) => multiplier * magnitude).find((candidate) => candidate >= minimum);

    if (step !== undefined) {
      return step;
    }
  }
}

/** Height of each bar when the series are stacked, for `length` categories. */
export function stackTotals(series: readonly { values: readonly number[] }[], length: number): number[] {
  return Array.from({length}, (_, index) => series.reduce((sum, item) => sum + (item.values[index] ?? 0), 0));
}
