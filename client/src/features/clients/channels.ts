/** The channel that holds every client not explained by another channel (see ADR T4). */
export const REMAINDER_CHANNEL = 'Existing clients';

const CHANNEL_COLORS: Record<string, string> = {
  'Existing clients': 'var(--color-series-existing-clients)',
  'New organic': 'var(--color-series-new-organic)',
  'New paid': 'var(--color-series-new-paid)'
};

const FALLBACK_COLORS = [
  'var(--color-series-fallback-1)',
  'var(--color-series-fallback-2)',
  'var(--color-series-fallback-3)',
  'var(--color-series-fallback-4)'
];

/**
 * Colour of each channel: the design colours for the three known channels, the fallback
 * palette in turn for the others.
 */
export function channelColors(names: readonly string[]): Map<string, string> {
  const colors = new Map<string, string>();
  let fallback = 0;

  for (const name of names) {
    const known = CHANNEL_COLORS[name];

    colors.set(name, known ?? FALLBACK_COLORS[fallback++ % FALLBACK_COLORS.length] ?? 'currentColor');
  }

  return colors;
}
