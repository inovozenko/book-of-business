/**
 * Contract of the clients API, shared by the client and the server.
 */

export const CLIENTS_ENDPOINT = '/api/clients';

/** Dataset served when the request has no `dataset` parameter. */
export const DEFAULT_DATASET = 'assignment';

/** Reporting year served when the request has no `year` parameter. Every dataset belongs to it. */
export const DEFAULT_YEAR = 2024;

/**
 * The 12 monthly values start in February of the reporting year and end in January
 * of the next one. The payload does not say so; the design does.
 */
export const PERIOD_FIRST_MONTH_INDEX = 1;
export const PERIOD_LENGTH = 12;

/** A node of the clients tree as the API sends it. Any node may hold any of the child keys. */
export interface ClientsNodeDto {
  id: string;
  name: string;
  values: number[];
  branches?: ClientsNodeDto[];
  employees?: ClientsNodeDto[];
  channels?: ClientsNodeDto[];
}

/**
 * Demo answers for the states of the page, chosen with `scenario`; the dataset and the year still apply:
 * - `slow` serves the dataset after `SCENARIO_DELAY_MS`, to show the loading state;
 * - `error` answers 500 after the same delay, so the loading state shows before the error, also on Retry;
 * - `empty-response` answers `[]` at once, to show that there is no data.
 */
export const SCENARIOS = ['slow', 'error', 'empty-response'] as const;

export const SCENARIO_DELAY_MS = 2000;

/**
 * What a 404 answer names as unknown. The client shows these answers as "no data": the API has nothing for the
 * request, and asking again will not change that. Any other failed answer is an error the client offers to retry.
 */
export const NOT_FOUND_ERRORS = ['Unknown dataset', 'Unknown year', 'Unknown scenario'] as const;

export interface ClientsErrorDto {
  error: (typeof NOT_FOUND_ERRORS)[number] | 'Server error';
}
