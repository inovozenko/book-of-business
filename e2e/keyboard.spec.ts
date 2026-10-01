import {expect, type Page, test} from '@playwright/test';

import {focusRingRightGap, focusRingVisible, focusTarget, table} from './helpers.ts';

/**
 * Keyboard and focus behaviour of the table. Runs in Chromium, Firefox and WebKit, because
 * focus handling differs between engines.
 */

const rowCount = (page: Page) => table(page).locator('tbody tr').count();

/** Presses a key and checks where focus went and that its ring is visible there. */
async function press(page: Page, key: string, expected: string) {
  await page.keyboard.press(key);
  await expect.poll(() => focusTarget(page), {message: `after ${key}`}).toBe(expected);

  if (expected !== 'page') {
    await expect.poll(() => focusRingVisible(page), {message: `ring after ${key}`}).toBe(true);
  }
}

test.beforeEach(async ({page}) => {
  await page.goto('/');
  await expect(table(page)).toBeVisible();
});

test('Arrow Down walks every row down to the last one, and Home and End jump', async ({page}) => {
  await press(page, 'Tab', 'Company');
  await press(page, 'ArrowDown', 'Branch 1');
  await press(page, 'ArrowDown', 'Branch 2');
  await press(page, 'ArrowDown', 'Branch 3');
  await press(page, 'ArrowDown', 'Branch 3');
  await press(page, 'Home', 'Company');
  await press(page, 'End', 'Branch 3');
});

test('Arrow Right on an open row moves into its cells, and Arrow Down goes cell by cell to the last row', async ({page}) => {
  await press(page, 'Tab', 'Company');
  await press(page, 'ArrowRight', 'Company (cell)');
  await press(page, 'ArrowDown', 'Branch 1 (cell)');
  await press(page, 'ArrowDown', 'Branch 2 (cell)');
  await press(page, 'ArrowDown', 'Branch 3 (cell)');
  await press(page, 'ArrowRight', 'Branch 3 (cell)');
  await press(page, 'ArrowLeft', 'Branch 3 (cell)');
});

test('the ring of a cell in the last column reaches the right edge of the table, in rows and headers', async ({page}) => {
  await press(page, 'Tab', 'Company');
  await press(page, 'ArrowRight', 'Company (cell)');

  for (let column = 0; column < 12; column += 1) {
    await page.keyboard.press('ArrowRight');
  }

  await expect.poll(() => focusRingRightGap(page)).toBe(0);
  await press(page, 'ArrowDown', 'Branch 1 (cell)');
  await expect.poll(() => focusRingRightGap(page)).toBe(0);

  await page.keyboard.press('ArrowUp');
  await page.keyboard.press('ArrowUp');
  await expect(page.locator(':focus')).toHaveText('Jan 2025');
  await expect.poll(() => focusRingVisible(page)).toBe(true);
  await expect.poll(() => focusRingRightGap(page)).toBe(0);
});

test('Arrow Down reaches the last row through an opened branch', async ({page}) => {
  await press(page, 'Tab', 'Company');
  await press(page, 'ArrowDown', 'Branch 1');
  await press(page, 'ArrowRight', 'Branch 1');

  for (const name of ['Anna Blackwood', 'James Walker', 'Maria Gutierrez', 'Robert Chen', 'Sarah Smith', 'Branch 2', 'Branch 3']) {
    await press(page, 'ArrowDown', name);
  }
});

test('a click focuses its row, and the arrow keys carry on from there', async ({page}) => {
  await page.getByText('Branch 1', {exact: true}).click();
  await expect.poll(() => focusTarget(page)).toBe('Branch 1');
  await expect.poll(() => rowCount(page)).toBe(9);

  await press(page, 'ArrowLeft', 'Branch 1');
  await expect.poll(() => rowCount(page)).toBe(4);
  await press(page, 'ArrowRight', 'Branch 1');
  await expect.poll(() => rowCount(page)).toBe(9);
  await press(page, 'ArrowDown', 'Anna Blackwood');
});

test('a click on a number focuses its row, not the cell', async ({page}) => {
  await page.getByText('76', {exact: true}).click();
  await expect.poll(() => focusTarget(page)).toBe('Branch 2');
  await press(page, 'ArrowDown', 'Branch 3');
});

test('focus stays in the table when a row closes and the next key comes at once', async ({page}) => {
  await press(page, 'Tab', 'Company');
  await press(page, 'ArrowDown', 'Branch 1');
  await press(page, 'ArrowRight', 'Branch 1');
  await expect.poll(() => rowCount(page)).toBe(9);

  // The closing rows are still on screen for a moment; the keys skip them.
  await page.keyboard.press('ArrowLeft');
  await press(page, 'ArrowDown', 'Branch 2');
  await expect.poll(() => rowCount(page)).toBe(4);
  await expect.poll(() => focusTarget(page)).toBe('Branch 2');
  await press(page, 'ArrowDown', 'Branch 3');
});

test('Tab skips rows that are closing', async ({page}) => {
  await press(page, 'Tab', 'Company');
  await press(page, 'ArrowDown', 'Branch 1');
  await press(page, 'ArrowRight', 'Branch 1');
  await expect.poll(() => rowCount(page)).toBe(9);
  await page.keyboard.press('ArrowLeft');
  await press(page, 'Tab', 'Branch 2');
});

test('closing a branch from its arrow moves focus out of it to the row that closed', async ({page}) => {
  await press(page, 'Tab', 'Company');
  await press(page, 'ArrowDown', 'Branch 1');
  await press(page, 'ArrowRight', 'Branch 1');
  await press(page, 'ArrowDown', 'Anna Blackwood');

  await table(page).getByRole('button', {name: 'Collapse Branch 1'}).click();
  await expect.poll(() => rowCount(page)).toBe(4);
  await expect.poll(() => focusTarget(page)).toBe('Branch 1');
});

test('Tab steps through the rows and then leaves the table', async ({page}) => {
  // Something to tab to after the table, so every browser has the same place to go. A text
  // field, because WebKit, like Safari by default, does not stop on buttons when tabbing.
  await page.evaluate(() => document.querySelector('main')?.append(Object.assign(document.createElement('input'), {ariaLabel: 'After'})));

  await press(page, 'Tab', 'Company');
  await press(page, 'Tab', 'Branch 1');
  await press(page, 'Shift+Tab', 'Company');
  await press(page, 'Tab', 'Branch 1');
  await press(page, 'Tab', 'Branch 2');
  await press(page, 'Tab', 'Branch 3');
  await press(page, 'Tab', 'page');
  await expect(page.getByRole('textbox', {name: 'After'})).toBeFocused();
  await press(page, 'Shift+Tab', 'Branch 3');
});

test('coming back with Tab starts at the first row, not where focus was before', async ({page}) => {
  await press(page, 'Tab', 'Company');
  await press(page, 'End', 'Branch 3');

  await page.getByRole('heading', {name: 'Clients'}).click();
  await expect.poll(() => focusTarget(page)).toBe('page');
  await press(page, 'Tab', 'Company');
});
