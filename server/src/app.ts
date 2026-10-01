import {Hono} from 'hono';

import {CLIENTS_ENDPOINT, type ClientsErrorDto, DEFAULT_DATASET, DEFAULT_YEAR, SCENARIO_DELAY_MS, SCENARIOS} from '../../shared/clients.ts';
import {datasets}                                                                                            from './data/index.ts';

const app = new Hono();

app.get(CLIENTS_ENDPOINT, async (c) => {
  const datasetName = c.req.query('dataset') ?? DEFAULT_DATASET;
  const dataset = datasets.find((candidate) => candidate.name === datasetName);

  if (!dataset) {
    return c.json<ClientsErrorDto>({error: 'Unknown dataset'}, 404);
  }

  const year = c.req.query('year');

  if (year !== undefined && year !== String(DEFAULT_YEAR)) {
    return c.json<ClientsErrorDto>({error: 'Unknown year'}, 404);
  }

  const scenario = c.req.query('scenario');

  if (scenario === undefined) {
    return c.json(dataset.payload);
  }

  if (!(SCENARIOS as readonly string[]).includes(scenario)) {
    return c.json<ClientsErrorDto>({error: 'Unknown scenario'}, 404);
  }

  if (scenario === 'empty-response') {
    return c.json([]);
  }

  await new Promise((resolve) => setTimeout(resolve, SCENARIO_DELAY_MS));

  if (scenario === 'error') {
    return c.json<ClientsErrorDto>({error: 'Server error'}, 500);
  }

  return c.json(dataset.payload);
});

export default app;
