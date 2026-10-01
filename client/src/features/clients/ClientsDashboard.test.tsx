import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';

import {render, screen, waitFor, within} from '@testing-library/react';
import userEvent                         from '@testing-library/user-event';

import assignment         from '../../../../server/src/data/assignment.json' with {type: 'json'};
import noChannels         from '../../../../server/src/data/no-channels.json' with {type: 'json'};
import {ClientsDashboard} from './ClientsDashboard.tsx';

const fetchMock = vi.fn<typeof fetch>();

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {status, headers: {'Content-Type': 'application/json'}});
}

/** A response that resolves only when the test says so. */
function deferredResponse() {
  let resolve: (response: Response) => void = () => {};

  const promise = new Promise<Response>((settle) => (resolve = settle));

  return {promise, resolve};
}

/** Longer than the delay and the shortest showing of the skeleton together. */
const LONGER_THAN_THE_SKELETON = 700;

const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Every text the live region takes from now on. */
function recordStatus() {
  const region = screen.getByRole('status');
  const said: string[] = [];

  new MutationObserver(() => said.push(region.textContent)).observe(region, {childList: true, characterData: true, subtree: true});

  return said;
}

const bodyRowNames = () =>
  within(screen.getByRole('treegrid'))
    .getAllByRole('row')
    .slice(1)
    .map((row) => within(row).getByRole('rowheader').textContent);

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock);
  // Failed loads are logged; keep the test output clean and check the calls where it matters.
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  fetchMock.mockReset();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('ClientsDashboard', () => {
  it('shows nothing for a moment, then a busy skeleton when the answer is slow', async () => {
    const pending = deferredResponse();

    fetchMock.mockReturnValue(pending.promise);

    const {container} = render(<ClientsDashboard query={{}} />);

    expect(screen.getByRole('heading', {level: 1, name: 'Clients'})).toBeInTheDocument();
    expect(screen.getByRole('status')).toBeEmptyDOMElement();
    expect(container.querySelector('[aria-busy="true"]')).not.toBeInTheDocument();

    expect(await screen.findByText('Loading clients…')).toBeInTheDocument();
    expect(container.querySelector('[aria-busy="true"]')).toBeInTheDocument();
    expect(screen.queryByRole('treegrid')).not.toBeInTheDocument();

    pending.resolve(jsonResponse(assignment));
    expect(await screen.findByRole('treegrid', {name: 'Clients by month'})).toBeInTheDocument();
    expect(screen.getByRole('status')).toBeEmptyDOMElement();
    expect(container.querySelector('[aria-busy="true"]')).not.toBeInTheDocument();
  });

  it('shows a fast answer without the skeleton', async () => {
    fetchMock.mockResolvedValue(jsonResponse(assignment));
    render(<ClientsDashboard query={{}} />);

    const said = recordStatus();

    await screen.findByRole('treegrid');
    await pause(LONGER_THAN_THE_SKELETON);
    expect(said).not.toContain('Loading clients…');
  });

  it('requests the dataset, year and scenario from the address as they are', async () => {
    fetchMock.mockResolvedValue(jsonResponse(noChannels));
    render(<ClientsDashboard query={{dataset: 'no-channels', year: '2024', scenario: 'slow'}} />);
    await screen.findByRole('treegrid');
    expect(fetchMock).toHaveBeenCalledWith('/api/clients?dataset=no-channels&year=2024&scenario=slow', expect.anything());
  });

  it('renders the table with the company expanded and month columns', async () => {
    fetchMock.mockResolvedValue(jsonResponse(assignment));
    render(<ClientsDashboard query={{}} />);
    await screen.findByRole('treegrid');

    expect(fetchMock).toHaveBeenCalledWith('/api/clients', expect.anything());
    expect(screen.getAllByRole('columnheader').map((header) => header.textContent)).toEqual([
      'Name',
      'Feb 2024',
      'Mar 2024',
      'Apr 2024',
      'May 2024',
      'Jun 2024',
      'Jul 2024',
      'Aug 2024',
      'Sep 2024',
      'Oct 2024',
      'Nov 2024',
      'Dec 2024',
      'Jan 2025'
    ]);
    expect(bodyRowNames()).toEqual(['Company', 'Branch 1', 'Branch 2', 'Branch 3']);
  });

  it('expands down to the channels and back with the keyboard', async () => {
    const user = userEvent.setup();

    fetchMock.mockResolvedValue(jsonResponse(assignment));
    render(<ClientsDashboard query={{}} />);
    await screen.findByRole('treegrid');

    await user.tab();
    await user.keyboard('{ArrowDown}{ArrowRight}{ArrowDown}{ArrowRight}');
    expect(bodyRowNames()).toEqual([
      'Company',
      'Branch 1',
      'Anna Blackwood',
      'Existing clients',
      'New organic',
      'New paid',
      'James Walker',
      'Maria Gutierrez',
      'Robert Chen',
      'Sarah Smith',
      'Branch 2',
      'Branch 3'
    ]);

    await user.keyboard('{ArrowLeft}{ArrowUp}{ArrowLeft}');
    expect(bodyRowNames()).toEqual(['Company', 'Branch 1', 'Branch 2', 'Branch 3']);
  });

  it('shows adviser photos, and initials when there is none', async () => {
    const user = userEvent.setup();

    fetchMock.mockResolvedValue(jsonResponse(noChannels));

    const {container} = render(<ClientsDashboard query={{dataset: 'no-channels'}} />);

    await screen.findByRole('treegrid');
    await user.click(screen.getByText('East'));
    expect(container.querySelectorAll('img[alt=""]')).toHaveLength(0);
    expect(container.querySelector('[data-initials="LJ"]')).toHaveAttribute('aria-hidden', 'true');

    fetchMock.mockResolvedValue(jsonResponse(assignment));

    const second = render(<ClientsDashboard query={{}} />);

    await within(second.container).findByRole('treegrid');
    await user.click(within(second.container).getByText('Branch 1'));
    expect(second.container.querySelectorAll('img[alt=""]')).toHaveLength(5);
  });

  it('shows the chart legend for the channels in the data', async () => {
    fetchMock.mockResolvedValue(jsonResponse(assignment));
    render(<ClientsDashboard query={{}} />);
    await screen.findByRole('treegrid');

    expect(screen.getByRole('img', {name: 'Clients per month by acquisition channel'})).toBeInTheDocument();
    expect(within(screen.getByRole('list')).getAllByRole('listitem').map((item) => item.textContent)).toEqual([
      'Existing clients',
      'New organic',
      'New paid'
    ]);
  });

  it('keeps the chart when rows expand', async () => {
    const user = userEvent.setup();

    fetchMock.mockResolvedValue(jsonResponse(assignment));
    render(<ClientsDashboard query={{}} />);
    await screen.findByRole('treegrid');

    const legend = screen.getByRole('list').textContent;

    await user.click(screen.getByText('Branch 1'));
    await user.click(screen.getByText('Anna Blackwood'));
    expect(screen.getByRole('list').textContent).toBe(legend);
  });

  it.each([
    ['an unknown dataset', () => Promise.resolve(jsonResponse({error: 'Unknown dataset'}, 404))],
    ['an unknown year', () => Promise.resolve(jsonResponse({error: 'Unknown year'}, 404))],
    ['an unknown scenario', () => Promise.resolve(jsonResponse({error: 'Unknown scenario'}, 404))],
    ['an empty array', () => Promise.resolve(jsonResponse([]))],
    ['a null body', () => Promise.resolve(jsonResponse(null))],
    ['a 204 answer', () => Promise.resolve(new Response(null, {status: 204}))],
    ['a 200 answer without a body', () => Promise.resolve(new Response('', {status: 200}))]
  ])('says there is no data, without Retry, after %s', async (_, respond) => {
    fetchMock.mockImplementation(respond);
    render(<ClientsDashboard query={{}} />);
    expect(await screen.findByText('No client data', {selector: 'p:not([role])'})).toBeInTheDocument();
    expect(screen.getByText('There is nothing to show for this period.')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('No client data');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', {name: 'Retry'})).not.toBeInTheDocument();
    expect(screen.queryByRole('treegrid')).not.toBeInTheDocument();
    expect(screen.getByRole('columnheader', {name: 'Feb 2024', hidden: true})).toBeInTheDocument();
    expect(console.error).not.toHaveBeenCalled();
  });

  it.each([
    ['a server error', () => Promise.resolve(new Response('oops', {status: 500}))],
    ['a 404 that names nothing unknown', () => Promise.resolve(new Response('404 Not Found', {status: 404}))],
    ['a 404 with another error', () => Promise.resolve(jsonResponse({error: 'Unknown route'}, 404))],
    ['a network failure', () => Promise.reject(new TypeError('Failed to fetch'))],
    ['a body that is not JSON', () => Promise.resolve(new Response('{"id": ', {status: 200}))],
    ['an invalid payload', () => Promise.resolve(jsonResponse({id: 'x', name: 'Company', values: [1, 2]}))],
    ['an empty object', () => Promise.resolve(jsonResponse({}))],
    ['a list of companies', () => Promise.resolve(jsonResponse([assignment]))]
  ])('shows an error with Retry after %s', async (_, respond) => {
    fetchMock.mockImplementation(respond);
    render(<ClientsDashboard query={{}} />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Clients could not be loaded');
    expect(screen.getByRole('button', {name: 'Retry'})).toBeInTheDocument();
    expect(screen.queryByRole('treegrid')).not.toBeInTheDocument();
    expect(screen.getByRole('columnheader', {name: 'Jan 2025', hidden: true})).toBeInTheDocument();
    expect(console.error).toHaveBeenCalledWith('Clients could not be loaded', expect.anything());
  });

  it('keeps the error and focus on Retry while a retry is under way, then shows the skeleton if it is slow', async () => {
    const user = userEvent.setup();

    fetchMock.mockResolvedValueOnce(new Response('oops', {status: 500}));
    render(<ClientsDashboard query={{}} />);

    const retryButton = await screen.findByRole('button', {name: 'Retry'});
    const pending = deferredResponse();

    fetchMock.mockReturnValueOnce(pending.promise);
    await user.click(retryButton);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(retryButton).toHaveFocus();

    await user.click(retryButton);
    expect(fetchMock).toHaveBeenCalledTimes(2);

    expect(await screen.findByText('Loading clients…')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', {level: 1})).toHaveFocus();

    pending.resolve(jsonResponse(assignment));
    expect(await screen.findByRole('treegrid')).toBeInTheDocument();
    expect(screen.getByRole('heading', {level: 1})).toHaveFocus();
  });

  it('keeps the error and focus on Retry when a fast retry fails again, without the skeleton', async () => {
    const user = userEvent.setup();

    fetchMock.mockImplementation(() => Promise.resolve(new Response('oops', {status: 500})));
    render(<ClientsDashboard query={{}} />);

    const retryButton = await screen.findByRole('button', {name: 'Retry'});
    const said = recordStatus();

    await user.click(retryButton);
    await waitFor(() => expect(console.error).toHaveBeenCalledTimes(2));
    await pause(LONGER_THAN_THE_SKELETON);
    expect(said).not.toContain('Loading clients…');
    expect(screen.getByRole('button', {name: 'Retry'})).toBe(retryButton);
    expect(retryButton).toHaveFocus();
  });

  it('moves focus to the page heading when a fast retry brings the data', async () => {
    const user = userEvent.setup();

    fetchMock.mockResolvedValueOnce(new Response('oops', {status: 500}));
    render(<ClientsDashboard query={{}} />);
    fetchMock.mockResolvedValueOnce(jsonResponse(assignment));
    await user.click(await screen.findByRole('button', {name: 'Retry'}));
    expect(await screen.findByRole('treegrid')).toBeInTheDocument();
    expect(screen.getByRole('heading', {level: 1})).toHaveFocus();
  });

  it('aborts the request when it unmounts', async () => {
    fetchMock.mockReturnValue(new Promise(() => {}));

    const {unmount} = render(<ClientsDashboard query={{}} />);
    const signal = fetchMock.mock.calls[0]?.[1]?.signal;

    expect(signal?.aborted).toBe(false);
    unmount();
    expect(signal?.aborted).toBe(true);
  });
});
