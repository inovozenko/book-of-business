import {expect, type Page, test} from '@playwright/test';

import {AxeBuilder} from '@axe-core/playwright';

import {expectations}                   from '../server/src/data/expectations.ts';
import {datasets}                       from '../server/src/data/index.ts';
import {focusedRow, table, visibleRows} from './helpers.ts';

/** Walks down the table from the first row and opens every collapsed row on the way. */
async function expandAllWithKeyboard(page: Page) {
  await table(page).locator('tbody tr').first().focus();

  for (;;) {
    const row = focusedRow(page);

    if ((await row.getAttribute('aria-expanded')) === 'false') {
      await page.keyboard.press('ArrowRight');
    }

    const before = await row.getAttribute('data-key');

    await page.keyboard.press('ArrowDown');

    if ((await focusedRow(page).getAttribute('data-key')) === before) {
      return;
    }
  }
}

/** Walks up from the last row and closes every open row on the way, the company last. */
async function collapseAllWithKeyboard(page: Page) {
  const firstKey = await table(page).locator('tbody tr').first().getAttribute('data-key');

  await table(page).locator('tbody tr').last().focus();

  for (;;) {
    const row = focusedRow(page);

    if ((await row.getAttribute('aria-expanded')) === 'true') {
      await page.keyboard.press('ArrowLeft');
    }

    // Arrow Up on the first row would move focus into the column headers.
    if ((await row.getAttribute('data-key')) === firstKey) {
      return;
    }

    await page.keyboard.press('ArrowUp');
  }
}

for (const {name, payload} of datasets) {
  test(`dataset ${name}: table, chart and accessibility`, async ({page}) => {
    const expected = expectations[name];

    if (!expected) {
      throw new Error(`No expectations for dataset ${name}`);
    }

    // Walking every row with the keyboard takes about 0.4 s a row locally and more on a two-core CI runner.
    test.setTimeout(30_000 + expected.rows.length * 1_000);

    await page.goto(`/?dataset=${name}`);
    await expect(table(page)).toBeVisible();

    await test.step('chart shows the expected series and axis', async () => {
      const chart = page.getByRole('figure');

      await expect(chart.getByRole('img', {name: 'Clients per month by acquisition channel'})).toBeVisible();
      await expect(chart.getByRole('listitem')).toHaveText(expected.legend);
      await expect(chart.locator('.recharts-bar')).toHaveCount(expected.legend.length);
      await expect(chart.locator('[data-axis="y"]')).toHaveText(expected.yAxis);
      // Series of zeros stay out of the legend, so an empty legend means a year with no clients.
      await expect(chart.getByText('No clients in this period')).toHaveCount(expected.legend.length === 0 ? 1 : 0);
    });

    await test.step('expands every level from the keyboard', async () => {
      await expandAllWithKeyboard(page);
      expect(await visibleRows(page)).toEqual(expected.rows);
    });

    await test.step('has no accessibility violations when fully expanded', async () => {
      const results = await new AxeBuilder({page}).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice']).analyze();

      expect(results.violations).toEqual([]);
    });

    await test.step('collapses back to the company from the keyboard', async () => {
      await collapseAllWithKeyboard(page);
      // Closing rows animate out before they leave the table.
      await expect.poll(() => visibleRows(page)).toEqual([[payload.name, 1]]);
    });
  });
}

test('/?year=2024 shows the assignment data for Feb 2024 to Jan 2025', async ({page}) => {
  await page.goto('/?year=2024');
  await expect(table(page).locator('tbody tr')).toHaveCount(4);
  await expect(table(page).getByRole('columnheader').nth(1)).toHaveText('Feb 2024');
  await expect(table(page).getByRole('columnheader').last()).toHaveText('Jan 2025');
});

test('the month labels keep the first month and thin out at an even step as the chart narrows', async ({page}) => {
  const months = ['Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan'];

  await page.goto('/');
  await expect(table(page)).toBeVisible();

  for (const width of [1440, 1000, 800, 600, 375]) {
    await page.setViewportSize({width, height: 900});

    const shown = await page.locator('[data-axis="x"]').evaluateAll((labels) => labels.map((label) => label.textContent?.slice(0, 3) ?? ''));
    const indexes = shown.map((month) => months.indexOf(month));
    const steps = new Set(indexes.slice(1).map((index, position) => index - (indexes[position] ?? 0)));

    expect(shown[0], `first label at ${width}px`).toBe('Feb');
    expect(steps.size, `steps ${[...steps].join(', ')} at ${width}px`).toBeLessThanOrEqual(1);
  }
});

test('a year with no clients keeps the height of the chart', async ({page}) => {
  const chartHeight = async (dataset: string) => {
    await page.goto(`/?dataset=${dataset}`);
    await expect(table(page)).toBeVisible();

    return page.getByRole('figure').evaluate((figure) => figure.getBoundingClientRect().height);
  };

  expect(await chartHeight('empty')).toBe(await chartHeight('assignment'));
});

test('large counts show grouped digits in the table and on the value axis', async ({page}) => {
  await page.goto('/?dataset=large-numbers');
  await expect(table(page)).toBeVisible();

  await expect(table(page).locator('tbody tr').first().getByRole('gridcell').first()).toHaveText('153,953');
  await expect(page.locator('[data-axis="y"]').last()).toHaveText('200,000');
});

test('a long name cut short with an ellipsis has the full name in its title', async ({page}) => {
  const name = 'Northwind Private Wealth Management Holding AG';

  await page.goto('/?dataset=long-names');
  await expect(table(page)).toBeVisible();

  const label = table(page).getByRole('rowheader').first().locator(`[title="${name}"]`);

  await expect(label).toHaveText(name);
  expect(await label.evaluate((element) => element.scrollWidth > element.clientWidth)).toBe(true);
});

test('nothing overflows the page at 375px', async ({page}) => {
  await page.setViewportSize({width: 375, height: 812});
  await page.goto('/');
  await expect(table(page)).toBeVisible();
  await expandAllWithKeyboard(page);

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

  expect(overflow).toBeLessThanOrEqual(0);
});

test('every row highlights under the pointer, with or without children', async ({page}) => {
  await page.goto('/');
  await expect(table(page)).toBeVisible();

  const highlight = (name: string) =>
    table(page).getByRole('rowheader', {name}).evaluate((cell) => getComputedStyle(cell).backgroundImage);

  expect(await highlight('Branch 2')).toBe('none');
  await page.getByText('Branch 2').hover();
  expect(await highlight('Branch 2')).not.toBe('none');
  await page.getByText('Branch 1').hover();
  expect(await highlight('Branch 1')).not.toBe('none');
  expect(await highlight('Branch 2')).toBe('none');
});

test('rows grow in and shrink away, except under reduced motion', async ({page}) => {
  await page.goto('/');
  await expect(table(page)).toBeVisible();

  const runningAnimations = () => page.evaluate(() => document.getAnimations().filter((animation) => animation.playState === 'running').length);

  expect(await runningAnimations()).toBe(0);

  await page.getByText('Branch 1').click();
  expect(await runningAnimations()).toBeGreaterThan(0);
  await expect(table(page).locator('tbody tr')).toHaveCount(9);

  await page.getByText('Branch 1').click();
  await expect(table(page).locator('tbody tr[data-leaving]')).toHaveCount(5);
  await expect(table(page).locator('tbody tr')).toHaveCount(4);

  await page.emulateMedia({reducedMotion: 'reduce'});
  await page.getByText('Branch 1').click();
  await page.getByText('Branch 1').click();
  await expect(table(page).locator('tbody tr[data-leaving]')).toHaveCount(0);
  await expect(table(page).locator('tbody tr')).toHaveCount(4);
});
