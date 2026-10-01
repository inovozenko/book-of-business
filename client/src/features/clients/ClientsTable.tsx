import type {ReactNode} from 'react';

import {Avatar}                          from '../../components/ui/Avatar/Avatar.tsx';
import {Card}                            from '../../components/ui/Card/Card.tsx';
import {TreeTable, type TreeTableColumn} from '../../components/ui/TreeTable/TreeTable.tsx';
import {formatNumber}                    from '../../lib/format.ts';
import type {HierarchyNode}              from '../../lib/hierarchy.ts';
import {employeeAvatars}                 from './avatars.ts';
import styles                            from './ClientsDashboard.module.scss';

export interface ClientsTableProps {
  /** The company. Without it the table shows the month header and `emptyState` under it. */
  root?: HierarchyNode;
  months: readonly string[];
  emptyState?: ReactNode;
}

/** Clients per month for every level of the company, starting with the company row expanded. */
export function ClientsTable({root, months, emptyState}: ClientsTableProps) {
  const columns: TreeTableColumn[] = months.map((month, index) => ({id: String(index), header: month}));

  return (
    <Card className={styles.tableCard}>
      <TreeTable<HierarchyNode> rowHeaderLabel="Name"
                                columns={columns}
                                rows={root ? [root] : []}
                                defaultExpandedKeys={root ? [root.id] : []}
                                getRowTextValue={(node) => node.name}
                                renderRowHeader={(node) => (
                                  <>
                                    {node.kind === 'employee' && <Avatar name={node.name} src={employeeAvatars[node.id]} />}
                                    <span className={styles.rowName} title={node.name}>{node.name}</span>
                                  </>
                                )}
                                renderCell={(node, column) => formatNumber(node.values[Number(column.id)] ?? 0)}
                                emptyState={emptyState}
                                aria-label="Clients by month" />
    </Card>
  );
}
