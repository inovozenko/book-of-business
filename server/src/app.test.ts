// @vitest-environment node
import {readFileSync}                        from 'node:fs';
import {afterEach, describe, expect, it, vi} from 'vitest';

import {CLIENTS_ENDPOINT, DEFAULT_DATASET, SCENARIO_DELAY_MS} from '../../shared/clients.ts';
import app                                                    from './app.ts';
import assignment                                             from './data/assignment.json' with {type: 'json'};
import {expectations}                                         from './data/expectations.ts';
import {datasets}                                             from './data/index.ts';

async function get(query = '') {
  const response = await app.request(`${CLIENTS_ENDPOINT}${query}`);

  return {status: response.status, body: await response.json()};
}

describe('GET /api/clients', () => {
  it('serves the assignment payload without parameters', async () => {
    expect(await get()).toEqual({status: 200, body: assignment});
  });

  it('serves the same payload for the default year and dataset', async () => {
    expect(await get('?year=2024')).toEqual({status: 200, body: assignment});
    expect(await get('?dataset=assignment&year=2024')).toEqual({status: 200, body: assignment});
  });

  it.each(datasets.map((dataset) => [dataset.name, dataset.payload]))('serves the %s dataset', async (name, payload) => {
    expect(await get(`?dataset=${name}`)).toEqual({status: 200, body: payload});
  });

  it.each(['missing', '', 'ASSIGNMENT'])('answers 404 for the unknown dataset "%s"', async (name) => {
    expect(await get(`?dataset=${name}`)).toEqual({status: 404, body: {error: 'Unknown dataset'}});
  });

  it.each(['2023', '2025', 'abc', '', ' 2024', '2024.0'])('answers 404 for the unknown year "%s"', async (year) => {
    expect(await get(`?year=${encodeURIComponent(year)}`)).toEqual({status: 404, body: {error: 'Unknown year'}});
  });

  it('checks the dataset before the year', async () => {
    expect(await get('?dataset=missing&year=1999')).toEqual({status: 404, body: {error: 'Unknown dataset'}});
  });

  it('applies the year to every dataset', async () => {
    expect(await get('?dataset=no-channels&year=2023')).toEqual({status: 404, body: {error: 'Unknown year'}});
  });
});

describe('GET /api/clients?scenario', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  /** Requests a scenario on fake timers and checks that the answer comes after the delay, not before. */
  async function getAfterDelay(query: string) {
    vi.useFakeTimers();

    let answered = false;

    const answer = get(query).then((result) => {
      answered = true;

      return result;
    });

    await vi.advanceTimersByTimeAsync(SCENARIO_DELAY_MS - 1);
    expect(answered).toBe(false);
    await vi.advanceTimersByTimeAsync(1);

    return answer;
  }

  it('serves the dataset after the delay for the slow scenario', async () => {
    const noChannels = datasets.find((dataset) => dataset.name === 'no-channels')?.payload;

    expect(await getAfterDelay('?scenario=slow&dataset=no-channels')).toEqual({status: 200, body: noChannels});
  });

  it('answers 500 after the delay for the error scenario', async () => {
    expect(await getAfterDelay('?scenario=error')).toEqual({status: 500, body: {error: 'Server error'}});
  });

  it('answers an empty array at once for the empty-response scenario', async () => {
    expect(await get('?scenario=empty-response')).toEqual({status: 200, body: []});
  });

  it.each(['missing', '', 'SLOW'])('answers 404 at once for the unknown scenario "%s"', async (scenario) => {
    expect(await get(`?scenario=${scenario}`)).toEqual({status: 404, body: {error: 'Unknown scenario'}});
  });

  it('checks the dataset and the year before the scenario', async () => {
    expect(await get('?dataset=missing&scenario=error')).toEqual({status: 404, body: {error: 'Unknown dataset'}});
    expect(await get('?year=2023&scenario=missing')).toEqual({status: 404, body: {error: 'Unknown year'}});
  });
});

describe('datasets', () => {
  it('keeps the assignment payload identical to the brief', () => {
    const brief = readFileSync(new URL('../../docs/Frontend Home Assignment.md', import.meta.url), 'utf8');
    const json = /```json\n([\s\S]*?)```/.exec(brief)?.[1];

    expect(JSON.parse(json ?? 'null')).toEqual(assignment);
  });

  it('starts with the default dataset', () => {
    expect(datasets[0]?.name).toBe(DEFAULT_DATASET);
  });

  it('has unique names and an expectation for each', () => {
    const names = datasets.map((dataset) => dataset.name);

    expect(new Set(names).size).toBe(names.length);
    expect(Object.keys(expectations).sort()).toEqual([...names].sort());
  });
});
