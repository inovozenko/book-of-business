import {expect, type Page, type Route, test} from '@playwright/test';

import {AxeBuilder} from '@axe-core/playwright';

import {table} from './helpers.ts';

type Answer = NonNullable<Parameters<Route['fulfill']>[0]>;

const json = (body: string, status = 200): Answer => ({status, contentType: 'application/json', body});

/** Answers in which the API has nothing for the request. */
const noDataAnswers: [string, Answer][] = [
  ['[]', json('[]')],
  ['null', json('null')],
  ['204 without a body', {status: 204, body: ''}]
];

/** Answers that are broken or failed. Asking again may help, so the page offers Retry. */
const errorAnswers: [string, Answer][] = [
  ['{}', json('{}')],
  ['a body that is not JSON', json('{"id": "company", "name": ')],
  ['500', json('{"error": "Server error"}', 500)],
  ['a 404 page from a missing route', {status: 404, contentType: 'text/html', body: '<h1>Not Found</h1>'}]
];

/** The chart and the table keep their frame: the value axis, the month header and a message on the chart. */
async function expectEmptyFrame(page: Page, chartMessage: string) {
  await expect(page.locator('figure [data-axis="y"]')).toHaveText(['0', '1', '2', '3', '4']);
  await expect(page.locator('figure').getByText(chartMessage)).toBeVisible();
  await expect(page.locator('thead th')).toHaveCount(13);
}

/** From the next page load on, notes whether the skeleton, marked aria-busy, ever shows. */
async function watchForSkeleton(page: Page) {
  await page.addInitScript(() => {
    const page = window as typeof window & { skeletonShown?: boolean };

    page.skeletonShown = false;
    new MutationObserver(() => {
      page.skeletonShown ||= document.querySelector('[aria-busy="true"]') !== null;
    }).observe(document, {subtree: true, childList: true, attributes: true, attributeFilter: ['aria-busy']});
  });

  return () => page.evaluate(() => (window as typeof window & { skeletonShown?: boolean }).skeletonShown);
}

async function expectNoData(page: Page) {
  await expect(page.getByText('There is nothing to show for this period.')).toBeVisible();
  await expectEmptyFrame(page, 'No client data');
  await expect(page.getByRole('status')).toHaveText('No client data');
  await expect(page.getByRole('alert')).toHaveCount(0);
  await expect(page.getByRole('button', {name: 'Retry'})).toHaveCount(0);
  await expect(table(page)).toHaveCount(0);
  expect((await new AxeBuilder({page}).analyze()).violations).toEqual([]);
}

async function expectError(page: Page) {
  await expect(page.getByRole('alert')).toContainText('Clients could not be loaded');
  await expectEmptyFrame(page, 'Clients could not be loaded');
  await expect(page.getByRole('button', {name: 'Retry'})).toBeVisible();
  await expect(table(page)).toHaveCount(0);
  expect((await new AxeBuilder({page}).analyze()).violations).toEqual([]);
}

for (const address of ['/?dataset=unknown', '/?year=2023', '/?year=abc']) {
  test(`${address} says there is no data`, async ({page}) => {
    await page.goto(address);
    await expectNoData(page);
  });
}

for (const [label, answer] of noDataAnswers) {
  test(`an answer of ${label} says there is no data`, async ({page}) => {
    await page.route('**/api/clients', (route) => route.fulfill(answer));
    await page.goto('/');
    await expectNoData(page);
  });
}

for (const [label, answer] of errorAnswers) {
  test(`an answer of ${label} shows the error with Retry`, async ({page}) => {
    await page.route('**/api/clients', (route) => route.fulfill(answer));
    await page.goto('/');
    await expectError(page);
  });
}

test('?scenario=slow shows the loading state, then the data', async ({page}) => {
  await page.goto('/?scenario=slow');
  await expect(page.getByRole('status')).toHaveText('Loading clients…');
  await expect(page.locator('[aria-busy="true"]')).toBeVisible();
  await expect(table(page)).toBeVisible();
  await expect(page.getByRole('status')).toHaveText('');
});

test('?scenario=error shows the loading state, then the error, and Retry asks again', async ({page}) => {
  let requests = 0;

  page.on('request', (request) => {
    requests += request.url().includes('/api/clients') ? 1 : 0;
  });
  await page.goto('/?scenario=error');
  await expect(page.getByRole('status')).toHaveText('Loading clients…');
  await expectError(page);
  await page.getByRole('button', {name: 'Retry'}).click();
  await expect(page.getByRole('status')).toHaveText('Loading clients…');
  // The button went away with the error, so focus waits on the page heading.
  await expect(page.getByRole('heading', {level: 1})).toBeFocused();
  await expect.poll(() => requests).toBe(2);
  await expectError(page);
});

test('a fast answer shows no skeleton', async ({page}) => {
  const skeletonShown = await watchForSkeleton(page);

  await page.goto('/');
  await expect(table(page)).toBeVisible();
  // The skeleton would come before the data, so by now it would have been seen.
  expect(await skeletonShown()).toBe(false);
});

test('a fast Retry that fails again keeps the error and focus on Retry, with no skeleton', async ({page}) => {
  const skeletonShown = await watchForSkeleton(page);
  let requests = 0;

  await page.route('**/api/clients', (route) => {
    requests += 1;

    return route.fulfill(json('{"error": "Server error"}', 500));
  });
  await page.goto('/');

  const retry = page.getByRole('button', {name: 'Retry'});

  await retry.focus();
  await page.keyboard.press('Enter');
  await expect.poll(() => requests).toBe(2);
  await expectError(page);
  await expect(retry).toBeFocused();
  expect(await skeletonShown()).toBe(false);
});

for (const address of ['/?scenario=empty-response', '/?scenario=unknown']) {
  test(`${address} says there is no data`, async ({page}) => {
    await page.goto(address);
    await expectNoData(page);
  });
}

test('the loading skeleton, the error, no data and the data keep the cards in the same places', async ({page}) => {
  const cards = () => page.locator('main > [aria-busy] > *').evaluateAll((elements) => elements.map((element) => {
    const box = element.getBoundingClientRect();

    return [box.y, box.height];
  }));

  await page.goto('/?scenario=error');
  await expect(page.getByRole('status')).toHaveText('Loading clients…');

  const loading = await cards();

  await expect(page.getByRole('alert')).toBeVisible();
  expect(await cards(), 'error').toEqual(loading);

  await page.goto('/?year=2023');
  await expect(page.getByRole('status')).toHaveText('No client data');
  expect(await cards(), 'no data').toEqual(loading);

  await page.goto('/');
  await expect(table(page)).toBeVisible();
  expect(await cards(), 'data').toEqual(loading);
});

test('at 375px the month header without data scrolls sideways, and Tab passes it on the way to Retry', async ({page}) => {
  await page.setViewportSize({width: 375, height: 812});
  await page.route('**/api/clients', (route) => route.fulfill(json('{}')));
  await page.goto('/');
  await expect(page.getByRole('alert')).toBeVisible();

  const scroller = page.locator('div:has(> table[inert])');

  await scroller.hover();
  await page.mouse.wheel(300, 0);
  await expect.poll(() => scroller.evaluate((element) => element.scrollLeft)).toBeGreaterThan(0);

  await page.getByRole('heading', {level: 1}).focus();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', {name: 'Retry'})).toBeFocused();
});

test('Retry loads the data after a failed request', async ({page}) => {
  let failures = 1;

  await page.route('**/api/clients', (route) => (failures-- > 0 ? route.abort() : route.continue()));
  await page.goto('/');
  await expectError(page);
  await page.getByRole('button', {name: 'Retry'}).click();
  await expect(table(page)).toBeVisible();
});
