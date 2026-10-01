import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';

import {render, screen, waitFor, within} from '@testing-library/react';
import userEvent                         from '@testing-library/user-event';

import {TreeTable, type TreeTableColumn} from './TreeTable.tsx';

interface Item {
  id: string;
  name: string;
  value: number;
  children?: Item[];
}

const tree: Item = {
  id: 'root',
  name: 'Root',
  value: 10,
  children: [
    {id: 'a', name: 'Alpha', value: 6, children: [{id: 'a1', name: 'Alpha one', value: 6}]},
    {id: 'b', name: 'Beta', value: 4}
  ]
};

const columns: TreeTableColumn[] = [{id: 'value', header: 'Value'}];

function renderTable(props: Partial<Parameters<typeof TreeTable<Item>>[0]> = {}) {
  return render(
    <TreeTable<Item> rowHeaderLabel="Name"
                     columns={columns}
                     rows={[tree]}
                     getRowTextValue={(item) => item.name}
                     renderRowHeader={(item) => item.name}
                     renderCell={(item) => item.value}
                     defaultExpandedKeys={['root']}
                     aria-label="Items"
                     {...props} />
  );
}

/** Body rows by the text of their first cell. The expand button adds "Expand" to the accessible name. */
const bodyRows = () => screen.getAllByRole('row').slice(1);
const rowNames = () => bodyRows().map((element) => within(element).getByRole('rowheader').textContent);

function row(name: string): HTMLElement {
  const found = bodyRows().find((element) => within(element).getByRole('rowheader').textContent === name);

  if (!found) {
    throw new Error(`No row named ${name}`);
  }

  return found;
}

describe('TreeTable', () => {
  it('renders a treegrid with a named first column', () => {
    renderTable();
    expect(screen.getByRole('treegrid', {name: 'Items'})).toBeInTheDocument();
    expect(screen.getByRole('columnheader', {name: 'Name'})).toBeInTheDocument();
    expect(screen.getByRole('columnheader', {name: 'Value'})).toBeInTheDocument();
  });

  it('exposes level, position and expanded state', () => {
    renderTable();
    expect(row('Root')).toHaveAttribute('aria-level', '1');
    expect(row('Root')).toHaveAttribute('aria-expanded', 'true');
    expect(row('Alpha')).toHaveAttribute('aria-level', '2');
    expect(row('Alpha')).toHaveAttribute('aria-expanded', 'false');
    expect(row('Alpha')).toHaveAttribute('aria-posinset', '1');
    expect(row('Alpha')).toHaveAttribute('aria-setsize', '2');
    expect(row('Beta')).not.toHaveAttribute('aria-expanded');
  });

  it('shows an expand button only on rows with children', () => {
    renderTable();
    expect(within(row('Root')).getByRole('button', {name: 'Collapse Root'})).toBeInTheDocument();
    expect(within(row('Alpha')).getByRole('button', {name: 'Expand Alpha'})).toBeInTheDocument();
    expect(within(row('Beta')).queryByRole('button')).not.toBeInTheDocument();
  });

  it('expands and collapses a row from its button', async () => {
    const user = userEvent.setup();

    renderTable();
    await user.click(within(row('Alpha')).getByRole('button', {name: /^Expand/}));
    expect(rowNames()).toEqual(['Root', 'Alpha', 'Alpha one', 'Beta']);
    expect(row('Alpha one')).toHaveAttribute('aria-level', '3');

    await user.click(within(row('Alpha')).getByRole('button', {name: /^Collapse/}));
    expect(rowNames()).toEqual(['Root', 'Alpha', 'Beta']);
  });

  it('expands and collapses a row with a click anywhere on it', async () => {
    const user = userEvent.setup();

    renderTable();
    await user.click(screen.getByText('6'));
    expect(row('Alpha')).toHaveAttribute('aria-expanded', 'true');
    await user.click(screen.getByText('Alpha'));
    expect(row('Alpha')).toHaveAttribute('aria-expanded', 'false');
  });

  it('keeps sibling rows expanded when a nested row is clicked', async () => {
    const user = userEvent.setup();

    renderTable();
    await user.click(screen.getByText('Alpha'));
    await user.click(screen.getByText('Alpha one'));
    expect(rowNames()).toEqual(['Root', 'Alpha', 'Alpha one', 'Beta']);
  });

  it('moves between rows with the arrow keys and expands with Right and collapses with Left', async () => {
    const user = userEvent.setup();

    renderTable();
    await user.tab();
    expect(row('Root')).toHaveFocus();

    await user.keyboard('{ArrowDown}');
    expect(row('Alpha')).toHaveFocus();
    await user.keyboard('{ArrowRight}');
    expect(row('Alpha')).toHaveAttribute('aria-expanded', 'true');
    expect(rowNames()).toContain('Alpha one');

    await user.keyboard('{ArrowLeft}');
    expect(row('Alpha')).toHaveAttribute('aria-expanded', 'false');
    expect(rowNames()).not.toContain('Alpha one');

    await user.keyboard('{ArrowUp}{ArrowLeft}');
    expect(rowNames()).toEqual(['Root']);
  });

  it('toggles the focused row with Enter', async () => {
    const user = userEvent.setup();

    renderTable();
    await user.tab();
    await user.keyboard('{ArrowDown}{Enter}');
    expect(row('Alpha')).toHaveAttribute('aria-expanded', 'true');
    await user.keyboard('{Enter}');
    expect(row('Alpha')).toHaveAttribute('aria-expanded', 'false');
  });

  it('does nothing on a click on a row without children', async () => {
    const onExpandedChange = vi.fn();
    const user = userEvent.setup();

    renderTable({onExpandedChange});
    await user.click(screen.getByText('Beta'));
    expect(onExpandedChange).not.toHaveBeenCalled();
  });

  it('shows the header and the empty state when there are no rows, and leaves the reading to the empty state', () => {
    renderTable({rows: [], emptyState: <p>Nothing to show</p>});

    expect(screen.getByText('Nothing to show')).toBeInTheDocument();
    expect(screen.queryByRole('treegrid')).not.toBeInTheDocument();

    const table = screen.getByRole('treegrid', {hidden: true});

    expect(within(table).getByRole('columnheader', {name: 'Value', hidden: true})).toBeInTheDocument();
    expect(table).toHaveAttribute('inert');
    expect(table.parentElement).toHaveAttribute('aria-hidden', 'true');
    expect(table.parentElement).toHaveAttribute('tabindex', '-1');
  });

  it('keeps a table without rows as it is when there is no empty state', () => {
    renderTable({rows: []});

    expect(screen.getByRole('treegrid', {name: 'Items'}).closest('[inert]')).toBeNull();
  });

  it('accepts row ids that look like column ids', () => {
    render(
      <TreeTable<Item> rowHeaderLabel="Name"
                       columns={[
                         {id: '0', header: 'First'},
                         {id: '1', header: 'Second'}
                       ]}
                       rows={[{id: '0', name: 'Zero', value: 0, children: [{id: '1', name: 'One', value: 1}]}]}
                       getRowTextValue={(item) => item.name}
                       renderRowHeader={(item) => item.name}
                       renderCell={(item) => item.value}
                       defaultExpandedKeys={['0']}
                       aria-label="Items" />
    );
    expect(rowNames()).toEqual(['Zero', 'One']);
  });

  it('steps through the rows with Tab and Shift+Tab and leaves the table after the last row', async () => {
    const user = userEvent.setup();

    render(
      <>
        <button type="button">Before</button>
        <TreeTable<Item> rowHeaderLabel="Name"
                         columns={columns}
                         rows={[tree]}
                         getRowTextValue={(item) => item.name}
                         renderRowHeader={(item) => item.name}
                         renderCell={(item) => item.value}
                         defaultExpandedKeys={['root']}
                         aria-label="Items" />
        <button type="button">After</button>
      </>
    );
    await user.tab();
    await user.tab();
    expect(row('Root')).toHaveFocus();
    await user.tab();
    expect(row('Alpha')).toHaveFocus();
    await user.tab();
    expect(row('Beta')).toHaveFocus();
    await user.tab({shift: true});
    expect(row('Alpha')).toHaveFocus();
    await user.tab();
    await user.tab();
    expect(screen.getByRole('button', {name: 'After'})).toHaveFocus();
  });

  it('marks the rows that open, but not the rows of the first render', async () => {
    const user = userEvent.setup();

    renderTable();
    expect(bodyRows().filter((element) => element.hasAttribute('data-entering'))).toEqual([]);

    await user.click(screen.getByText('Alpha'));
    expect(row('Alpha one')).toHaveAttribute('data-entering');
    expect(row('Beta')).not.toHaveAttribute('data-entering');
  });

  describe('when motion is allowed', () => {
    // jsdom has no matchMedia, so the other tests see reduced motion and close rows at once.
    beforeEach(() => {
      vi.stubGlobal('matchMedia', (query: string) => ({matches: query.includes('no-preference'), media: query}));
    });

    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it('keeps closing rows until they have animated out', async () => {
      const user = userEvent.setup();
      const onExpandedChange = vi.fn();

      renderTable({defaultExpandedKeys: ['root', 'a'], onExpandedChange});

      await user.click(screen.getByText('Alpha'));
      expect(row('Alpha one')).toHaveAttribute('data-leaving');
      expect(onExpandedChange).not.toHaveBeenCalled();

      await waitFor(() => expect(rowNames()).toEqual(['Root', 'Alpha', 'Beta']));
      expect(onExpandedChange).toHaveBeenCalledWith(new Set(['root']));
    });

    it('skips closing rows with the arrow keys, so focus is never left on a row that goes away', async () => {
      const user = userEvent.setup();

      renderTable({defaultExpandedKeys: ['root', 'a']});
      await user.tab();
      await user.keyboard('{ArrowDown}{ArrowLeft}');
      expect(row('Alpha one')).toHaveAttribute('data-leaving');
      expect(row('Alpha one')).toHaveAttribute('aria-disabled', 'true');

      await user.keyboard('{ArrowDown}');
      expect(row('Beta')).toHaveFocus();
      await waitFor(() => expect(rowNames()).toEqual(['Root', 'Alpha', 'Beta']));
      expect(row('Beta')).toHaveFocus();
    });

    it('opens a row again while it is still closing', async () => {
      const user = userEvent.setup();

      renderTable({defaultExpandedKeys: ['root', 'a']});

      await user.click(screen.getByText('Alpha'));
      await user.click(screen.getByText('Alpha'));
      await new Promise((resolve) => setTimeout(resolve, 400));
      expect(rowNames()).toEqual(['Root', 'Alpha', 'Alpha one', 'Beta']);
      expect(row('Alpha one')).not.toHaveAttribute('data-leaving');
    });
  });

  it('can be controlled', async () => {
    const onExpandedChange = vi.fn();
    const user = userEvent.setup();

    renderTable({expandedKeys: ['root', 'a'], onExpandedChange});
    expect(rowNames()).toEqual(['Root', 'Alpha', 'Alpha one', 'Beta']);

    await user.click(screen.getByText('Alpha'));
    expect(onExpandedChange).toHaveBeenCalledWith(new Set(['root']));
    expect(rowNames()).toEqual(['Root', 'Alpha', 'Alpha one', 'Beta']);
  });
});
