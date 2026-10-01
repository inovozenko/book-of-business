import {useCallback, useEffect, useMemo, useState} from 'react';

import {DEFAULT_YEAR, PERIOD_FIRST_MONTH_INDEX, PERIOD_LENGTH} from '../../../../shared/clients.ts';
import {type ClientsQuery, ClientsRequestError, fetchClients}  from '../../api/clients.ts';
import {type HierarchyNode, isEmptyPayload, parseHierarchy}    from '../../lib/hierarchy.ts';
import {monthLabels, parseYear}                                from '../../lib/period.ts';

/** The answer to a finished request. */
export type ClientsResult =
  | { status: 'no-data' }
  | { status: 'error'; error: unknown }
  | { status: 'success'; root: HierarchyNode };

export interface ClientsLoad {
  /** The answer to the last finished request; `null` until the first one finishes. */
  result: ClientsResult | null;
  /** A request is running: the first one, or a retry while `result` still holds the answer before it. */
  pending: boolean;
  months: string[];
  /** Asks again. Does nothing while a request is running. */
  retry: () => void;
}

/**
 * Month labels of the reporting year in the address, the default year when there is none. They do not
 * wait for the data, so the page can show the period with no data too. Text that is not a year gives
 * blank labels, which keep the places of the columns.
 */
export function reportingMonths(year: string | undefined): string[] {
  const firstYear = year === undefined ? DEFAULT_YEAR : parseYear(year);

  return firstYear === null
    ? Array.from({length: PERIOD_LENGTH}, () => '')
    : monthLabels(firstYear, PERIOD_FIRST_MONTH_INDEX, PERIOD_LENGTH);
}

/**
 * Loads the clients tree once per attempt. The request is cancelled when the component
 * unmounts or a new attempt starts. An answer that the API has nothing for the request,
 * a 404 naming an unknown dataset or year or an empty answer, ends in the no-data result.
 * A network error, any other failed answer and a payload that fails the structure check
 * end in the error result. A retry keeps the previous result until the new one comes.
 */
export function useClients(query: ClientsQuery): ClientsLoad {
  const [attempt, setAttempt] = useState(0);
  const [load, setLoad] = useState<{ result: ClientsResult | null; pending: boolean }>({result: null, pending: true});
  const {year, dataset, scenario} = query;
  const months = useMemo(() => reportingMonths(year), [year]);

  useEffect(() => {
    const controller = new AbortController();

    function finish(result: ClientsResult) {
      setLoad({result, pending: false});
    }

    fetchClients({year, dataset, scenario}, controller.signal)
      .then((payload) => {
        finish(isEmptyPayload(payload) ? {status: 'no-data'} : {status: 'success', root: parseHierarchy(payload)});
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) {
          return;
        }

        if (error instanceof ClientsRequestError && error.noData) {
          finish({status: 'no-data'});

          return;
        }

        console.error('Clients could not be loaded', error);
        finish({status: 'error', error});
      });

    return () => controller.abort();
  }, [year, dataset, scenario, attempt]);

  const pending = load.pending;

  const retry = useCallback(() => {
    if (pending) {
      return;
    }

    setLoad((current) => ({...current, pending: true}));
    setAttempt((current) => current + 1);
  }, [pending]);

  return {result: load.result, pending, months, retry};
}
