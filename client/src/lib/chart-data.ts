import type {HierarchyNode} from './hierarchy.ts';

export interface ChannelSeries {
  /** Channel name; channels with the same name in different places add up. */
  name: string;
  values: number[];
}

export interface ChannelSeriesOptions {
  /**
   * The channel that receives the remainder: the root value minus every other channel.
   * Its own values in the data are ignored. It is always the first series.
   */
  remainderChannel: string;
}

/**
 * Splits the root values by acquisition channel for a stacked bar chart.
 *
 * Channels may sit at any depth. A node that has channels of its own contributes those
 * and is not searched deeper, so a breakdown given on two levels of one branch is not
 * counted twice. A channel is a leaf here: its own children are not visited. The remainder
 * channel gets what the other channels do not explain, never less than zero, so the stack
 * is as high as the root unless the channels add up to more. Series that are zero in every
 * month are left out.
 */
export function buildChannelSeries(root: HierarchyNode, {remainderChannel}: ChannelSeriesOptions): ChannelSeries[] {
  const totals = new Map<string, number[]>();

  for (const channel of collectChannels(root)) {
    if (channel.name === remainderChannel) {
      continue;
    }

    const sum = totals.get(channel.name);

    if (sum) {
      channel.values.forEach((value, month) => (sum[month] = (sum[month] ?? 0) + value));
    } else {
      totals.set(channel.name, [...channel.values]);
    }
  }

  const others = [...totals].map(([name, values]) => ({name, values}));
  const remainder = root.values.map((total, month) => {
    const explained = others.reduce((sum, series) => sum + (series.values[month] ?? 0), 0);

    return Math.max(0, total - explained);
  });

  return [{name: remainderChannel, values: remainder}, ...others].filter((series) =>
    series.values.some((value) => value > 0)
  );
}

function collectChannels(node: HierarchyNode): HierarchyNode[] {
  const own = node.children.filter((child) => child.kind === 'channel');

  if (own.length > 0) {
    return own;
  }

  return node.children.flatMap(collectChannels);
}
