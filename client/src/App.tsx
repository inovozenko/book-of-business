import {useState} from 'react';

import {clientsQueryFromSearch} from './features/clients/clients-query.ts';
import {ClientsDashboard}       from './features/clients/ClientsDashboard.tsx';

export function App() {
  // The address is read once; the dashboard does not follow later changes to it.
  const [query] = useState(() => clientsQueryFromSearch(window.location.search));

  return <ClientsDashboard query={query} />;
}
