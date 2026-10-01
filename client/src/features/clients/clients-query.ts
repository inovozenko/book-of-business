import type {ClientsQuery} from '../../api/clients.ts';

/** Reads the API parameters from a page address such as `?dataset=no-channels&year=2024&scenario=slow`, unchecked. */
export function clientsQueryFromSearch(search: string): ClientsQuery {
  const params = new URLSearchParams(search);
  const query: ClientsQuery = {};
  const year = params.get('year');
  const dataset = params.get('dataset');
  const scenario = params.get('scenario');

  if (year !== null) {
    query.year = year;
  }

  if (dataset !== null) {
    query.dataset = dataset;
  }

  if (scenario !== null) {
    query.scenario = scenario;
  }

  return query;
}
