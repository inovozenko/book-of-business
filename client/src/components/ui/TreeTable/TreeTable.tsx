import {type CSSProperties, type FocusEvent, type KeyboardEvent, type MouseEvent, type ReactNode, useEffect, useMemo, useRef, useState} from 'react';

import {Button, Cell, Collection, Column, type Key, Row, Table, TableBody, TableHeader} from 'react-aria-components';

import styles from './TreeTable.module.scss';

export interface TreeTableColumn {
  id: string;
  header: ReactNode;
  /** Plain text of the header, used when `header` is not a string. */
  textValue?: string;
}

export interface TreeTableRow<T> {
  id: string;
  children?: readonly T[];
}

export interface TreeTableProps<T extends TreeTableRow<T>> {
  'aria-label': string;
  /** Name of the first column. Screen readers announce it; on screen the header cell stays empty, as in the design. */
  rowHeaderLabel: string;
  columns: readonly TreeTableColumn[];
  rows: readonly T[];
  /** Content of the first cell: the row name, an avatar and so on. */
  renderRowHeader: (row: T) => ReactNode;
  /** Plain text of the first cell, used for typeahead and announcements. */
  getRowTextValue: (row: T) => string;
  renderCell: (row: T, column: TreeTableColumn) => ReactNode;
  expandedKeys?: Iterable<Key>;
  defaultExpandedKeys?: Iterable<Key>;
  onExpandedChange?: (keys: Set<Key>) => void;
  /**
   * Shown under the header when there are no rows, such as a message that the data could not be loaded.
   * The header stays on screen for context and scrolls sideways like the table with rows, but leaves the
   * keyboard and assistive technology to the empty state: a table without rows has nothing to read or move
   * through.
   */
  emptyState?: ReactNode;
  className?: string;
}

// Columns and rows share one key space in React Aria, so column keys get a prefix that row
// ids from the data cannot plausibly start with.
const COLUMN_KEY_PREFIX = 'tree-table-column:';
const ROW_HEADER_KEY = `${COLUMN_KEY_PREFIX}row-header`;
const columnKey = (column: TreeTableColumn) => `${COLUMN_KEY_PREFIX}${column.id}`;

/** Length of the open and close animations, also passed to the CSS. */
const MOTION_MS = 300;
const NO_KEYS: ReadonlySet<Key> = new Set();

interface PendingCollapse {
  /** Rows that animate out before they are removed. */
  leaving: ReadonlySet<Key>;
  /** Expanded keys to commit once they are gone. */
  target: Set<Key>;
}

/**
 * A table whose rows nest. Built on the React Aria table with tree rows, so the
 * treegrid roles, aria-level, aria-expanded and the arrow keys come from the library.
 * A click anywhere on a row with children toggles it, like the expand button, and Tab
 * moves from row to row. Rows grow in when their parent opens and shrink away when it
 * closes, unless the user prefers reduced motion.
 *
 * Focus stays on rows and is never lost: a click focuses its row rather than a cell,
 * Tab into the table starts at the first row and Shift+Tab at the last, rows that are
 * closing cannot take focus, and focus inside a closing branch moves to the row that closed.
 */
export function TreeTable<T extends TreeTableRow<T>>({
  'aria-label': ariaLabel,
  rowHeaderLabel,
  columns,
  rows,
  renderRowHeader,
  getRowTextValue,
  renderCell,
  expandedKeys,
  defaultExpandedKeys,
  onExpandedChange,
  emptyState,
  className
}: TreeTableProps<T>) {
  const [uncontrolledKeys, setUncontrolledKeys] = useState(() => new Set(defaultExpandedKeys));
  const committedKeys = expandedKeys === undefined ? uncontrolledKeys : new Set(expandedKeys);
  const [entering, setEntering] = useState<ReadonlySet<Key>>(NO_KEYS);
  const [collapse, setCollapse] = useState<PendingCollapse | null>(null);
  const collapseTimer = useRef<number | undefined>(undefined);
  const containerRef = useRef<HTMLDivElement>(null);
  /** The last Tab press anywhere on the page, to tell how focus came into the table. */
  const lastTab = useRef<{ shiftKey: boolean; timeStamp: number } | null>(null);
  /** Counts key presses in the table, so a deferred focus move can tell it has been overtaken. */
  const keyPresses = useRef(0);
  const rowsById = useMemo(() => indexRows(rows), [rows]);
  /** What the user asked for; differs from the committed keys while a collapse animates. */
  const shownKeys = collapse?.target ?? committedKeys;
  const showsEmptyState = rows.length === 0 && emptyState !== undefined;

  useEffect(() => () => window.clearTimeout(collapseTimer.current), []);

  useEffect(() => {
    function onKeyDown(event: globalThis.KeyboardEvent) {
      if (event.key === 'Tab') {
        lastTab.current = {shiftKey: event.shiftKey, timeStamp: event.timeStamp};
      }
    }

    document.addEventListener('keydown', onKeyDown, true);

    return () => document.removeEventListener('keydown', onKeyDown, true);
  }, []);

  function commit(keys: Set<Key>) {
    if (expandedKeys === undefined) {
      setUncontrolledKeys(keys);
    }

    onExpandedChange?.(keys);
  }

  /** Rows that become visible or hidden when `key` opens or closes, given the other open rows. */
  function visibleDescendants(key: Key, open: ReadonlySet<Key>): Key[] {
    return (rowsById.get(key)?.children ?? []).flatMap((child) => [
      child.id,
      ...(open.has(child.id) ? visibleDescendants(child.id, open) : [])
    ]);
  }

  function changeExpandedKeys(added: readonly Key[], removed: readonly Key[]) {
    // A collapse that is still animating counts as done; the change applies on top of it.
    window.clearTimeout(collapseTimer.current);

    const base = shownKeys;
    const next = new Set(base);

    added.forEach((key) => next.add(key));
    removed.forEach((key) => next.delete(key));

    setEntering(new Set(added.filter((key) => !base.has(key)).flatMap((key) => visibleDescendants(key, next))));

    const closing = removed.filter((key) => base.has(key));
    const leaving = closing.flatMap((key) => visibleDescendants(key, base));

    moveFocusOutOfClosingRows(closing, base);

    if (leaving.length > 0 && animationsAllowed()) {
      // React Aria removes rows as soon as their parent closes, so the parent stays open
      // until the rows have animated out.
      setCollapse({leaving: new Set([...(collapse?.leaving ?? []), ...leaving]), target: next});
      collapseTimer.current = window.setTimeout(() => {
        setCollapse(null);
        commit(next);
      }, MOTION_MS);
    } else {
      setCollapse(null);
      commit(next);
    }
  }

  /** If focus is inside a branch that closes, it moves to the row that closed, instead of being lost. */
  function moveFocusOutOfClosingRows(closing: readonly Key[], open: ReadonlySet<Key>) {
    const focusedKey = document.activeElement?.closest('tbody > tr')?.getAttribute('data-key');

    if (!focusedKey) {
      return;
    }

    const parent = closing.find((key) => visibleDescendants(key, open).some((descendant) => String(descendant) === focusedKey));

    if (parent !== undefined) {
      rowElement(parent)?.focus();
    }
  }

  function rowElement(key: Key): HTMLElement | null {
    return containerRef.current?.querySelector<HTMLElement>(`tbody > tr[data-key="${CSS.escape(String(key))}"]`) ?? null;
  }

  /** Body rows that can take focus: all but the ones animating out. */
  function focusableRows(): HTMLElement[] {
    return Array.from(containerRef.current?.querySelectorAll<HTMLElement>('tbody > tr:not([data-leaving])') ?? []);
  }

  function onLibraryExpandedChange(requested: Set<Key>) {
    changeExpandedKeys(
      [...requested].filter((key) => !committedKeys.has(key)),
      [...committedKeys].filter((key) => !requested.has(key))
    );
  }

  function toggleRow(id: Key) {
    if (shownKeys.has(id)) {
      changeExpandedKeys([], [id]);
    } else {
      changeExpandedKeys([id], []);
    }
  }

  // React Aria treats the table as one tab stop and moves between rows with the arrow keys.
  // Tab and Shift+Tab also step through the rows here, and leave the table after the last one.
  function onKeyDownCapture(event: KeyboardEvent<HTMLDivElement>) {
    keyPresses.current += 1;

    if (event.key !== 'Tab' || event.altKey || event.ctrlKey || event.metaKey) {
      return;
    }

    const current = (event.target as HTMLElement).closest('tbody > tr');

    if (!current) {
      return;
    }

    const candidates = focusableRows();
    const target = candidates[candidates.indexOf(current as HTMLElement) + (event.shiftKey ? -1 : 1)];

    if (!target) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    target.focus();
  }

  function onFocusCapture(event: FocusEvent<HTMLDivElement>) {
    // Coming in with Tab starts at the first row, and with Shift+Tab at the last, rather than
    // at whichever row had focus last time.
    const from = event.relatedTarget;
    const tab = lastTab.current;

    if ((from instanceof Node && event.currentTarget.contains(from)) || !tab || event.timeStamp - tab.timeStamp > 100) {
      return;
    }

    lastTab.current = null;

    const candidates = focusableRows();
    const start = tab.shiftKey ? candidates.at(-1) : candidates[0];

    // React Aria restores its own row as the focus event goes on, so move on the next frame.
    if (start && start !== event.target) {
      focusLater(start);
    }
  }

  // A click focuses its row, not the cell under the pointer, so the arrow keys carry on from
  // the row and Left and Right close and open it. React Aria focuses the cell during the
  // press and stops the click on rows with an action, so this listens in the capture phase
  // and moves focus on the next frame.
  function onClickCapture(event: MouseEvent<HTMLDivElement>) {
    const cell = (event.target as HTMLElement).closest('tbody > tr > td');
    const key = cell?.parentElement?.getAttribute('data-key');

    if (!key) {
      return;
    }

    focusLater(() => {
      const row = rowElement(key);

      return row && !row.hasAttribute('data-leaving') && row.contains(document.activeElement) ? row : null;
    });
  }

  /**
   * Moves focus on the next frame, once React Aria is done with the current event. Skipped
   * when a key was pressed in the meantime or focus has left the table, so it never undoes
   * what the user did since.
   */
  function focusLater(target: HTMLElement | (() => HTMLElement | null)) {
    const presses = keyPresses.current;

    requestAnimationFrame(() => {
      if (keyPresses.current !== presses || !containerRef.current?.contains(document.activeElement)) {
        return;
      }

      const element = typeof target === 'function' ? target() : target;

      element?.focus();
    });
  }

  // React Aria caches rendered rows per item. Everything a row reads besides the item is a
  // dependency, so the onAction handlers always see the current expanded keys.
  const dependencies = [shownKeys, committedKeys, entering, collapse, columns, renderRowHeader, renderCell, getRowTextValue];

  function renderRow(row: T) {
    const hasChildren = (row.children?.length ?? 0) > 0;

    return (
      <Row className={styles.row}
           id={row.id}
           data-entering={entering.has(row.id) || undefined}
           data-leaving={collapse?.leaving.has(row.id) || undefined}
           textValue={getRowTextValue(row)}
           // Rows on their way out are skipped by the arrow keys and Tab and cannot take focus.
           isDisabled={collapse?.leaving.has(row.id)}
           onAction={hasChildren ? () => toggleRow(row.id) : undefined}>
        <Cell className={styles.rowHeaderCell} textValue={getRowTextValue(row)}>
          <div className={styles.clip}>
            <div className={styles.rowHeader}>
              {hasChildren
                ? (
                    <Button className={styles.chevron} slot="chevron">
                      <ChevronIcon open={shownKeys.has(row.id)} />
                    </Button>
                  )
                : (
                    <span className={styles.chevronPlaceholder} />
                  )}
              {renderRowHeader(row)}
            </div>
          </div>
        </Cell>
        {columns.map((column) => (
          <Cell key={column.id} className={styles.cell}>
            <div className={styles.clip}>
              <div className={styles.value}>{renderCell(row, column)}</div>
            </div>
          </Cell>
        ))}
        <Collection items={row.children ?? []} dependencies={dependencies}>
          {renderRow}
        </Collection>
      </Row>
    );
  }

  return (
    <>
      <div ref={containerRef}
           className={[styles.scroller, className].filter(Boolean).join(' ')}
           data-empty={showsEmptyState || undefined}
           aria-hidden={showsEmptyState || undefined}
           // Browsers make a scroller with nothing focusable inside a Tab stop of its own.
           tabIndex={showsEmptyState ? -1 : undefined}
           style={{'--columns': columns.length, '--tree-table-motion': `${MOTION_MS}ms`} as CSSProperties}
           onKeyDownCapture={onKeyDownCapture}
           onFocusCapture={onFocusCapture}
           onClickCapture={onClickCapture}>
        {/* Inert, the table takes no focus, while wheel and touch fall through to the scroller around it. */}
        <Table className={styles.table} treeColumn={ROW_HEADER_KEY} expandedKeys={committedKeys} inert={showsEmptyState || undefined} aria-label={ariaLabel} onExpandedChange={onLibraryExpandedChange}>
          <TableHeader>
            <Column className={styles.rowHeaderColumn} id={ROW_HEADER_KEY} isRowHeader textValue={rowHeaderLabel}>
              <span className={styles.visuallyHidden}>{rowHeaderLabel}</span>
            </Column>
            {columns.map((column) => (
              <Column key={column.id} className={styles.column} id={columnKey(column)} textValue={column.textValue}>
                {column.header}
              </Column>
            ))}
          </TableHeader>
          <TableBody items={rows} dependencies={dependencies}>
            {renderRow}
          </TableBody>
        </Table>
      </div>
      {showsEmptyState && emptyState}
    </>
  );
}

function ChevronIcon({open}: { open: boolean }) {
  return (
    <svg className={styles.chevronIcon} data-open={open || undefined} width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M11.5 6.5L8 10L4.5 6.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" />
    </svg>
  );
}

function indexRows<T extends TreeTableRow<T>>(rows: readonly T[], index = new Map<Key, T>()): Map<Key, T> {
  for (const row of rows) {
    index.set(row.id, row);

    if (row.children) {
      indexRows(row.children, index);
    }
  }

  return index;
}

function animationsAllowed(): boolean {
  return typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: no-preference)').matches;
}
