import type {Page} from '@playwright/test';

export const table = (page: Page) => page.getByRole('treegrid', {name: 'Clients by month'});

export const focusedRow = (page: Page) => table(page).locator('tbody tr:focus');

/** Table body rows as [name, level], top to bottom. */
export function visibleRows(page: Page) {
  return table(page)
    .locator('tbody tr')
    .evaluateAll((rows) =>
      rows.map((row) => [row.querySelector('[role="rowheader"]')?.textContent ?? '', Number(row.getAttribute('aria-level'))])
    );
}

/**
 * Where keyboard focus is: the name of the row it is on, followed by " (cell)" when a cell
 * inside the row has it, or "page" when it has left the table.
 */
export function focusTarget(page: Page) {
  return page.evaluate(() => {
    const active = document.activeElement;
    const row = active?.closest('[role="treegrid"] tbody tr');

    if (!active || !row) {
      return 'page';
    }

    const name = row.querySelector('[role="rowheader"]')?.textContent ?? '';

    return active === row ? name : `${name} (cell)`;
  });
}

/**
 * Whether the focused row, cell or column header shows the focus ring. Each draws it on top of
 * itself (`::before`); a row does so in pieces on its cells.
 */
export function focusRingVisible(page: Page) {
  return page.evaluate(() => {
    const active = document.activeElement;

    if (!(active instanceof HTMLElement)) {
      return false;
    }

    const cell = active.tagName === 'TR' ? active.querySelector('td') : active;

    if (!cell) {
      return false;
    }

    const before = getComputedStyle(cell, '::before');

    return before.content !== 'none' && parseFloat(before.borderTopWidth) >= 2 && parseFloat(before.borderBottomWidth) >= 2;
  });
}

/** Distance from the right edge of the focused cell's ring to the right edge of the table. */
export function focusRingRightGap(page: Page) {
  return page.evaluate(() => {
    const cell = document.activeElement;
    const table = cell?.closest('table');

    if (!(cell instanceof HTMLElement) || !table) {
      return Number.NaN;
    }

    const ringRight = cell.getBoundingClientRect().right - parseFloat(getComputedStyle(cell, '::before').right);

    return Math.round(table.getBoundingClientRect().right - ringRight);
  });
}
