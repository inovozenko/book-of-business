import {Card}                                   from '../../components/ui/Card/Card.tsx';
import {StackedBarChart, type StackedBarSeries} from '../../components/ui/StackedBarChart/StackedBarChart.tsx';
import {buildChannelSeries}                     from '../../lib/chart-data.ts';
import type {HierarchyNode}                     from '../../lib/hierarchy.ts';
import {channelColors, REMAINDER_CHANNEL}       from './channels.ts';
import styles                                   from './ClientsDashboard.module.scss';

export interface ClientsChartProps {
  /**
   * The company. Without it the chart shows its axes and months with `emptyMessage` in the middle, and is
   * hidden from screen readers: it is a picture of nothing, and the message the page reads is elsewhere.
   */
  root?: HierarchyNode;
  months: readonly string[];
  /** Says why there are no bars. */
  emptyMessage?: string;
}

/** Clients of the whole company per month, split by acquisition channel. Does not follow the table. */
export function ClientsChart({root, months, emptyMessage = 'No clients in this period'}: ClientsChartProps) {
  const channels = root ? buildChannelSeries(root, {remainderChannel: REMAINDER_CHANNEL}) : [];
  const colors = channelColors(channels.map((channel) => channel.name));
  const series: StackedBarSeries[] = channels.map((channel) => ({
    id: channel.name,
    label: channel.name,
    color: colors.get(channel.name) ?? 'currentColor',
    values: channel.values
  }));

  return (
    <Card className={styles.chartCard} aria-hidden={root ? undefined : true}>
      <StackedBarChart categories={months} series={series} emptyMessage={emptyMessage} aria-label="Clients per month by acquisition channel" />
    </Card>
  );
}
