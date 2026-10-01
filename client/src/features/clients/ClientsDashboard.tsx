import {type ReactNode, useLayoutEffect, useRef} from 'react';

import {Button} from 'react-aria-components';

import type {ClientsQuery}              from '../../api/clients.ts';
import {Card}                           from '../../components/ui/Card/Card.tsx';
import {ErrorBoundary}                  from '../../components/ui/ErrorBoundary/ErrorBoundary.tsx';
import {Skeleton}                       from '../../components/ui/Skeleton/Skeleton.tsx';
import {useLoadingIndicator}            from '../../hooks/use-loading-indicator.ts';
import {ClientsChart}                   from './ClientsChart.tsx';
import {ClientsTable}                   from './ClientsTable.tsx';
import {type ClientsResult, useClients} from './use-clients.ts';
import styles                           from './ClientsDashboard.module.scss';

export interface ClientsDashboardProps {
  query: ClientsQuery;
}

/**
 * The skeleton shows only for an answer slower than 200 ms, and then for at least 400 ms, so that it never
 * flashes for a frame or two.
 */
const LOADING_TIMING = {delay: 200, minDuration: 400};

/** What the page shows: nothing yet, the skeleton, or an answer. */
type View = 'blank' | 'loading' | ClientsResult['status'];

/**
 * What the live region says for each view. A new error comes as an alert; the data itself is not announced:
 * the chart and the table are there to explore.
 */
const STATUS_MESSAGES: Record<View, string> = {
  blank: '',
  loading: 'Loading clients…',
  'no-data': 'No client data',
  error: '',
  success: ''
};

/** The Clients page: a stacked bar chart and an expandable table over the same data. */
export function ClientsDashboard({query}: ClientsDashboardProps) {
  const {result, pending, months, retry} = useClients(query);
  const skeleton = useLoadingIndicator(pending, LOADING_TIMING);
  // Until the skeleton shows, the page keeps what it had: nothing on the first load, the error on a retry.
  const shown = skeleton ? null : result;
  const view: View = skeleton ? 'loading' : (shown?.status ?? 'blank');
  const headingRef = useRef<HTMLHeadingElement>(null);
  const retried = useRef(false);

  useLayoutEffect(() => {
    // Retry keeps focus while the error stays on screen. Once the skeleton or the answer replaces it, focus
    // would be lost with the button, so it goes to the page heading.
    if (retried.current && document.activeElement === document.body) {
      headingRef.current?.focus();
    }

    if (!pending && !skeleton) {
      retried.current = false;
    }
  }, [view, pending, skeleton]);

  function handleRetry() {
    retried.current = true;
    retry();
  }

  const errorState = <ErrorState months={months} onRetry={handleRetry} />;

  return (
    <main className={styles.page}>
      <h1 ref={headingRef} className={styles.title} tabIndex={-1}>
        Clients
      </h1>
      {/* Present from the start, so that screen readers announce the text when it changes. */}
      <p className={styles.visuallyHidden} role="status">
        {STATUS_MESSAGES[view]}
      </p>
      <div className={styles.content} aria-busy={skeleton}>
        {skeleton && <LoadingState />}
        {shown?.status === 'no-data' && <NoDataState months={months} />}
        {shown?.status === 'error' && errorState}
        {shown?.status === 'success' && (
          <ErrorBoundary fallback={errorState}>
            <ClientsChart root={shown.root} months={months} />
            <ClientsTable root={shown.root} months={months} />
          </ErrorBoundary>
        )}
      </div>
    </main>
  );
}

function LoadingState() {
  return (
    <>
      <Card className={`${styles.chartCard} ${styles.chartSkeleton}`}>
        <Skeleton height="100%" radius={4} />
        <Skeleton className={styles.legendSkeleton} width={240} height={16} />
      </Card>
      <Card className={`${styles.tableCard} ${styles.tableSkeleton}`}>
        {Array.from({length: 5}, (_, index) => (
          <div key={index} className={styles.skeletonRow}>
            {index === 0 ? <span /> : <Skeleton width={160} height={16} />}
            <Skeleton height={16} />
          </div>
        ))}
      </Card>
    </>
  );
}

interface EmptyPageProps {
  months: readonly string[];
  /** Short text in the middle of the chart. */
  chartMessage: string;
  /** The message under the table header: what screen readers read, and Retry if there is one. */
  children: ReactNode;
}

/**
 * The chart and the table without data, in the places and sizes of the loading skeleton and of the page with
 * data: the chart keeps its axes and months, the table its header. If they cannot be drawn, the message is
 * shown on its own.
 */
function EmptyPage({months, chartMessage, children}: EmptyPageProps) {
  const message = <div className={styles.tableMessage}>{children}</div>;

  return (
    <ErrorBoundary fallback={<Card className={styles.tableCard}>{message}</Card>}>
      <ClientsChart months={months} emptyMessage={chartMessage} />
      <ClientsTable months={months} emptyState={message} />
    </ErrorBoundary>
  );
}

/** The API has nothing for the request. Asking again would give the same answer, so there is no Retry. */
function NoDataState({months}: { months: readonly string[] }) {
  return (
    <EmptyPage months={months} chartMessage="No client data">
      <div className={styles.message}>
        <p className={styles.messageTitle}>No client data</p>
        <p>There is nothing to show for this period.</p>
      </div>
    </EmptyPage>
  );
}

/** The data did not load or could not be shown: the server failed, the network did, or the answer was broken. */
function ErrorState({months, onRetry}: { months: readonly string[]; onRetry: () => void }) {
  return (
    <EmptyPage months={months} chartMessage="Clients could not be loaded">
      <div className={styles.message} role="alert">
        <p className={styles.messageTitle}>Clients could not be loaded</p>
        <p>The data is not available right now. Try again in a moment.</p>
      </div>
      {/* Stays while a retry is under way, keeping focus; a second press then does nothing. */}
      <Button className={styles.retryButton} onPress={onRetry}>
        Retry
      </Button>
    </EmptyPage>
  );
}
