import {Bar, BarChart, BarStack, CartesianGrid, XAxis, type XAxisTickContentProps, YAxis, type YAxisTickContentProps} from 'recharts';

import {niceAxis, stackTotals} from '../../../lib/axis.ts';
import {formatNumber}          from '../../../lib/format.ts';
import styles                  from './StackedBarChart.module.scss';

export interface StackedBarSeries {
  id: string;
  label: string;
  /** Any CSS colour, including a custom property such as `var(--color-series-new-paid)`. */
  color: string;
  /** One value per category. */
  values: readonly number[];
}

export interface StackedBarChartProps {
  'aria-label': string;
  categories: readonly string[];
  /** Series from the bottom of the stack to the top. The legend follows the same order. */
  series: readonly StackedBarSeries[];
  /** Text of a value on the axis. Grouped digits in the app locale by default, such as 2,000. */
  formatValue?: (value: number) => string;
  /** Text over the plot when no bar has a value, such as for a year with no clients. */
  emptyMessage?: string;
  className?: string;
}

/** Geometry from the design: plot, axis label offsets and bar spacing, in pixels. */
const PLOT_TOP = 10;
const PLOT_HEIGHT = 320;
const X_AXIS_HEIGHT = 28;
/** The value labels get at least this column, as in the design, and more when a label is wider. */
const Y_LABEL_MIN_WIDTH = 26;
const Y_LABEL_GAP = 12;
/** Bar width and the gap between bars at 1440px. The bar keeps this share of its category at any width. */
const BAR_WIDTH = 87.5;
const BAR_GAP = 24;
const BAR_RADIUS = 4;
/** Baseline offsets that put 12/16 labels where the design has them. */
const X_LABEL_BASELINE = 24.4;
const Y_LABEL_BASELINE = 2.4;
/**
 * Recharts finds the label font size through this class and measures the labels with it when it
 * decides which month labels fit. Without it, it measures in the page font, 14px instead of 12px.
 */
const TICK_LABEL_CLASS = `${styles.tickLabel} recharts-cartesian-axis-tick-value`;

interface Datum {
  category: string;
  index: number;
}

/**
 * Stacked bars with a value axis that starts at zero and has four equal steps, and a
 * text legend below. The whole stack is rounded, not each segment. When the category labels
 * do not fit, the first one stays and the others thin out at an even step. Screen readers get
 * the chart as one image named by `aria-label`; the numbers belong in a table next to it.
 */
export function StackedBarChart({'aria-label': ariaLabel, categories, series, formatValue = formatNumber, emptyMessage, className}: StackedBarChartProps) {
  const highest = Math.max(0, ...stackTotals(series, categories.length));
  const axis = niceAxis(highest);
  const data: Datum[] = categories.map((category, index) => ({category, index}));
  // Recharts reads a percentage bar size against the whole axis, and does not round it.
  const barSize = `${(BAR_WIDTH / ((BAR_WIDTH + BAR_GAP) * Math.max(1, categories.length))) * 100}%`;

  return (
    <figure className={[styles.chart, className].filter(Boolean).join(' ')}>
      <div className={styles.plot}>
        <BarChart responsive
                  data={data}
                  margin={{top: PLOT_TOP, right: 0, bottom: 0, left: 0}}
                  barSize={barSize}
                  accessibilityLayer={false}
                  role="img"
                  aria-label={ariaLabel}
                  style={{width: '100%', height: PLOT_TOP + PLOT_HEIGHT + X_AXIS_HEIGHT}}>
          <CartesianGrid className={styles.grid} vertical={false} />
          <XAxis dataKey="category" height={X_AXIS_HEIGHT} axisLine={false} tickLine={false} tickSize={0} tickMargin={0} interval="equidistantPreserveStart" minTickGap={12} tick={renderXTick} />
          <YAxis type="number" domain={[0, axis.max]} ticks={axis.ticks} interval={0} allowDataOverflow width="auto" axisLine={false} tickLine={false} tickSize={0} tickMargin={Y_LABEL_GAP} tickFormatter={formatValue} tick={renderYTick} />
          <BarStack radius={BAR_RADIUS}>
            {series.map((item) => (
              <Bar key={item.id} name={item.label} dataKey={(datum: Datum) => item.values[datum.index] ?? 0} fill={item.color} isAnimationActive={false} />
            ))}
          </BarStack>
        </BarChart>
        {highest === 0 && emptyMessage && (
          <p className={styles.emptyMessage} style={{top: PLOT_TOP, left: Y_LABEL_MIN_WIDTH + Y_LABEL_GAP, height: PLOT_HEIGHT}}>
            <span>{emptyMessage}</span>
          </p>
        )}
      </div>
      {/* With nothing to name, an empty line keeps the height of the chart, as on the loading skeleton. */}
      {series.length > 0
        ? (
            <ul className={styles.legend} aria-label="Legend">
              {series.map((item) => (
                <li key={item.id} className={styles.legendItem}>
                  <span className={styles.legendMarker} aria-hidden="true" style={{background: item.color}} />
                  {item.label}
                </li>
              ))}
            </ul>
          )
        : (
            <div className={styles.legend} aria-hidden="true" />
          )}
    </figure>
  );
}

function renderXTick({x, y, payload}: XAxisTickContentProps) {
  return (
    <text className={TICK_LABEL_CLASS} data-axis="x" x={x} y={y} dy={X_LABEL_BASELINE} textAnchor="middle">
      {payload.value}
    </text>
  );
}

/**
 * Recharts sizes an axis with `width="auto"` from the widest element that has the tick class. The
 * empty rect holds the label column of the design open, so the axis is 26px plus the gap for short
 * labels, as in the design, and grows with a label such as 200000 instead of cutting it off.
 */
function renderYTick({x, y, payload, tickFormatter}: YAxisTickContentProps) {
  return (
    <g className="recharts-cartesian-axis-tick-value">
      <rect x={Number(x) - Y_LABEL_MIN_WIDTH} y={y} width={Y_LABEL_MIN_WIDTH} height={1} fill="none" />
      <text className={styles.tickLabel} data-axis="y" x={x} y={y} dy={Y_LABEL_BASELINE} textAnchor="end">
        {tickFormatter ? tickFormatter(payload.value, payload.index) : payload.value}
      </text>
    </g>
  );
}
