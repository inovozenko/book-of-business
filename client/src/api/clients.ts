import {CLIENTS_ENDPOINT, NOT_FOUND_ERRORS} from '../../../shared/clients.ts';

/** Parameters of GET /api/clients, passed through from the page address as they are. */
export interface ClientsQuery {
  year?: string;
  dataset?: string;
  scenario?: string;
}

export class ClientsRequestError extends Error {
  readonly status: number;
  /**
   * The API answered that it has nothing for the request: a 404 that names an unknown dataset or year.
   * A 404 without that, such as from a missing route, is a failure like any other.
   */
  readonly noData: boolean;

  constructor(status: number, body: string) {
    super(`GET ${CLIENTS_ENDPOINT} answered ${status}`);

    const error = errorOf(body);

    this.name = 'ClientsRequestError';
    this.status = status;
    this.noData = status === 404 && error !== undefined && (NOT_FOUND_ERRORS as readonly string[]).includes(error);
  }
}

/**
 * Requests the clients tree. Resolves with the parsed JSON body, unchecked, or with `null` when the answer
 * has no body. Rejects with `ClientsRequestError` on an answer other than 2xx and with `SyntaxError` on a body
 * that is not JSON.
 */
export async function fetchClients({year, dataset, scenario}: ClientsQuery, signal?: AbortSignal): Promise<unknown> {
  const params = new URLSearchParams();

  if (dataset !== undefined) {
    params.set('dataset', dataset);
  }

  if (year !== undefined) {
    params.set('year', year);
  }

  if (scenario !== undefined) {
    params.set('scenario', scenario);
  }

  const search = params.size > 0 ? `?${params}` : '';

  const response = await fetch(`${CLIENTS_ENDPOINT}${search}`, {signal, headers: {Accept: 'application/json'}});

  const body = await response.text();

  if (!response.ok) {
    throw new ClientsRequestError(response.status, body);
  }

  return body.trim() === '' ? null : JSON.parse(body);
}

/** The `error` of a JSON body such as `{"error": "Unknown year"}`, if the body is one. */
function errorOf(body: string): string | undefined {
  try {
    const parsed: unknown = JSON.parse(body);

    return typeof parsed === 'object' && parsed !== null && 'error' in parsed && typeof parsed.error === 'string' ? parsed.error : undefined;
  } catch {
    return undefined;
  }
}
