import {PERIOD_LENGTH} from '../../../shared/clients.ts';

export type HierarchyNodeKind = 'company' | 'branch' | 'employee' | 'channel';

/** A node of the clients tree after validation, the same shape at every depth. */
export interface HierarchyNode {
  id: string;
  name: string;
  kind: HierarchyNodeKind;
  values: number[];
  children: HierarchyNode[];
}

/** Child keys of the API payload in the order their nodes are shown, with the kind each key implies. */
const CHILD_KEYS = [
  ['branches', 'branch'],
  ['employees', 'employee'],
  ['channels', 'channel']
] as const;

export class InvalidPayloadError extends Error {
  readonly path: string;

  constructor(path: string, problem: string) {
    super(`Invalid clients payload at ${path}: ${problem}`);

    this.name = 'InvalidPayloadError';
    this.path = path;
  }
}

/**
 * An answer that says there is no data: no body at all, JSON `null` or an empty array. The page shows it
 * as such rather than as a broken answer. Any other answer goes to `parseHierarchy`.
 */
export function isEmptyPayload(payload: unknown): boolean {
  return payload === null || (Array.isArray(payload) && payload.length === 0);
}

/**
 * Checks the structure of the API response and turns it into a uniform tree.
 * Any node may hold any of `branches`, `employees` and `channels`. One violation
 * anywhere makes the whole response invalid. Sums are not checked.
 *
 * @throws InvalidPayloadError
 */
export function parseHierarchy(payload: unknown): HierarchyNode {
  const ids = new Set<string>();

  return parseNode(payload, 'company', 'root', ids);
}

function parseNode(input: unknown, kind: HierarchyNodeKind, path: string, ids: Set<string>): HierarchyNode {
  if (!isRecord(input)) {
    throw new InvalidPayloadError(path, 'expected an object');
  }

  const {id, name, values} = input;

  if (typeof id !== 'string' || id === '') {
    throw new InvalidPayloadError(`${path}.id`, 'expected a non-empty string');
  }

  if (ids.has(id)) {
    throw new InvalidPayloadError(`${path}.id`, `duplicate id "${id}"`);
  }

  ids.add(id);

  if (typeof name !== 'string') {
    throw new InvalidPayloadError(`${path}.name`, 'expected a string');
  }

  if (!isValues(values)) {
    throw new InvalidPayloadError(`${path}.values`, `expected ${PERIOD_LENGTH} finite non-negative numbers`);
  }

  const children: HierarchyNode[] = [];

  for (const [key, childKind] of CHILD_KEYS) {
    if (!(key in input)) {
      continue;
    }

    const items = input[key];

    if (!Array.isArray(items)) {
      throw new InvalidPayloadError(`${path}.${key}`, 'expected an array');
    }

    items.forEach((item, index) => {
      children.push(parseNode(item, childKind, `${path}.${key}[${index}]`, ids));
    });
  }

  return {id, name, kind, values: [...values], children};
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isValues(value: unknown): value is number[] {
  return (
    Array.isArray(value)
    && value.length === PERIOD_LENGTH
    && value.every((item) => typeof item === 'number' && Number.isFinite(item) && item >= 0)
  );
}
