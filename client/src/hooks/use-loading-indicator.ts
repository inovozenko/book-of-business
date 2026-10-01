import {useEffect, useRef, useState} from 'react';

export interface LoadingIndicatorTiming {
  /** How long the work may run before the indicator shows. Faster work shows none at all. */
  delay: number;
  /** How long the indicator stays once it shows, so that it does not flash. */
  minDuration: number;
}

/**
 * Whether to show a loading indicator for work that is `pending`. It shows only once the work has run for
 * `delay`, and then stays for at least `minDuration`, even if the work ends sooner: the result waits for it.
 */
export function useLoadingIndicator(pending: boolean, {delay, minDuration}: LoadingIndicatorTiming): boolean {
  const [shown, setShown] = useState(false);
  const shownAt = useRef(0);

  useEffect(() => {
    if (pending && !shown) {
      const timer = window.setTimeout(() => {
        shownAt.current = Date.now();
        setShown(true);
      }, delay);

      return () => window.clearTimeout(timer);
    }

    if (!pending && shown) {
      const timer = window.setTimeout(() => setShown(false), Math.max(0, shownAt.current + minDuration - Date.now()));

      return () => window.clearTimeout(timer);
    }

    return undefined;
  }, [pending, shown, delay, minDuration]);

  return shown;
}
