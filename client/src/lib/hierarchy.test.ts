import {describe, expect, it} from 'vitest';

import assignment                                                                from '../../../server/src/data/assignment.json' with {type: 'json'};
import {type HierarchyNode, InvalidPayloadError, isEmptyPayload, parseHierarchy} from './hierarchy.ts';

const twelve = (value: number) => Array.from({length: 12}, () => value);

let nextId = 0;

function raw(name: string, extra: Record<string, unknown> = {}) {
  nextId += 1;

  return {id: `id-${nextId}`, name, values: twelve(1), ...extra};
}

/** Names and kinds of the tree, depth first, to compare shapes without ids. */
function outline(node: HierarchyNode, depth = 0): string[] {
  return [`${'  '.repeat(depth)}${node.kind} ${node.name}`, ...node.children.flatMap((child) => outline(child, depth + 1))];
}

function expectInvalid(payload: unknown, path: string) {
  let error: unknown;

  try {
    parseHierarchy(payload);
  } catch (caught) {
    error = caught;
  }

  expect(error).toBeInstanceOf(InvalidPayloadError);
  expect((error as InvalidPayloadError).path).toBe(path);
}

describe('isEmptyPayload', () => {
  it.each([
    ['no body', null],
    ['an empty array', []]
  ])('takes %s as no data', (_, payload) => {
    expect(isEmptyPayload(payload)).toBe(true);
  });

  it.each([
    ['an empty object', {}],
    ['a list of companies', [assignment]],
    ['a company', assignment],
    ['zero', 0],
    ['an empty string', '']
  ])('leaves %s to the structure check', (_, payload) => {
    expect(isEmptyPayload(payload)).toBe(false);
  });
});

describe('parseHierarchy: normalisation', () => {
  it('turns the assignment payload into a uniform tree', () => {
    const root = parseHierarchy(assignment);

    expect(outline(root)).toEqual([
      'company Company',
      '  branch Branch 1',
      '    employee Anna Blackwood',
      '      channel Existing clients',
      '      channel New organic',
      '      channel New paid',
      '    employee James Walker',
      '    employee Maria Gutierrez',
      '    employee Robert Chen',
      '    employee Sarah Smith',
      '  branch Branch 2',
      '  branch Branch 3'
    ]);
    expect(root).toMatchObject({id: assignment.id, values: assignment.values});
    expect(root.children[0]?.children[0]?.children[2]).toEqual({
      id: 'abbf873a-a0eb-46b8-b4cf-dc58e5f7a2d7',
      name: 'New paid',
      kind: 'channel',
      values: [0, 0, 1, 1, 2, 1, 0, 2, 1, 1, 1, 2],
      children: []
    });
  });

  it('accepts a node without children', () => {
    expect(parseHierarchy(raw('Company')).children).toEqual([]);
  });

  it('treats empty child arrays as missing', () => {
    expect(parseHierarchy(raw('Company', {branches: [], employees: [], channels: []})).children).toEqual([]);
  });

  it('accepts channels directly under the company', () => {
    expect(outline(parseHierarchy(raw('Company', {channels: [raw('New paid')]})))).toEqual([
      'company Company',
      '  channel New paid'
    ]);
  });

  it('accepts channels under a branch', () => {
    const payload = raw('Company', {branches: [raw('Branch', {channels: [raw('New organic')]})]});

    expect(outline(parseHierarchy(payload))).toEqual(['company Company', '  branch Branch', '    channel New organic']);
  });

  it('keeps the key order branches, employees, channels for a node with several keys', () => {
    const payload = raw('Company', {
      channels: [raw('Referral')],
      employees: [raw('Ceo')],
      branches: [raw('Branch')]
    });

    expect(outline(parseHierarchy(payload))).toEqual([
      'company Company',
      '  branch Branch',
      '  employee Ceo',
      '  channel Referral'
    ]);
  });

  it('handles deep nesting and takes the kind from the key', () => {
    const payload = raw('Company', {
      branches: [raw('Region', {branches: [raw('Branch', {employees: [raw('Team lead', {employees: [raw('Adviser')]})]})]})]
    });

    expect(outline(parseHierarchy(payload))).toEqual([
      'company Company',
      '  branch Region',
      '    branch Branch',
      '      employee Team lead',
      '        employee Adviser'
    ]);
  });

  it('ignores unknown keys', () => {
    const root = parseHierarchy(raw('Company', {avatar: 'x.png', teams: [raw('Team')], extra: null}));

    expect(Object.keys(root).sort()).toEqual(['children', 'id', 'kind', 'name', 'values']);
    expect(root.children).toEqual([]);
  });

  it('accepts fractional values and an empty name', () => {
    const root = parseHierarchy({id: 'a', name: '', values: [0.5, ...twelve(2).slice(1)]});

    expect(root.values[0]).toBe(0.5);
    expect(root.name).toBe('');
  });

  it('copies the values array', () => {
    const payload = raw('Company');
    const root = parseHierarchy(payload);

    expect(root.values).not.toBe(payload.values);
  });
});

describe('parseHierarchy: structure check', () => {
  it.each([null, undefined, 42, 'text', [], true])('rejects a response that is not an object: %s', (payload) => {
    expectInvalid(payload, 'root');
  });

  it('rejects a missing id', () => {
    expectInvalid({name: 'Company', values: twelve(1)}, 'root.id');
  });

  it('rejects an empty id', () => {
    expectInvalid({id: '', name: 'Company', values: twelve(1)}, 'root.id');
  });

  it('rejects an id that is not a string', () => {
    expectInvalid({id: 7, name: 'Company', values: twelve(1)}, 'root.id');
  });

  it('rejects a missing name', () => {
    expectInvalid({id: 'a', values: twelve(1)}, 'root.name');
  });

  it.each([
    ['not an array', '12'],
    ['11 values', twelve(1).slice(1)],
    ['13 values', [...twelve(1), 1]],
    ['a string value', ['1', ...twelve(1).slice(1)]],
    ['a null value', [null, ...twelve(1).slice(1)]],
    ['NaN', [Number.NaN, ...twelve(1).slice(1)]],
    ['Infinity', [Number.POSITIVE_INFINITY, ...twelve(1).slice(1)]],
    ['a negative number', [-1, ...twelve(1).slice(1)]]
  ])('rejects values with %s', (_, values) => {
    expectInvalid({id: 'a', name: 'Company', values}, 'root.values');
  });

  it.each([null, {}, 'Branch 1', 3])('rejects branches that are not an array: %s', (branches) => {
    expectInvalid(raw('Company', {branches}), 'root.branches');
  });

  it('rejects a child that is not an object', () => {
    expectInvalid(raw('Company', {employees: [raw('Adviser'), 'Sarah Smith']}), 'root.employees[1]');
  });

  it('rejects the same id in different branches', () => {
    const payload = raw('Company', {
      branches: [
        raw('Branch 1', {employees: [{id: 'twin', name: 'Adviser A', values: twelve(1)}]}),
        raw('Branch 2', {employees: [{id: 'twin', name: 'Adviser B', values: twelve(1)}]})
      ]
    });

    expectInvalid(payload, 'root.branches[1].employees[0].id');
  });

  it('rejects a violation on the third level of nesting', () => {
    const payload = raw('Company', {
      branches: [raw('Branch', {employees: [raw('Adviser', {channels: [raw('New paid', {values: twelve(-1)})]})]})]
    });

    expectInvalid(payload, 'root.branches[0].employees[0].channels[0].values');
  });

  it('names the path in the message', () => {
    expect(() => parseHierarchy({id: 'a', name: 'Company', values: []})).toThrow(
      'Invalid clients payload at root.values: expected 12 finite non-negative numbers'
    );
  });
});
