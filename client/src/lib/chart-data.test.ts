import {describe, expect, it} from 'vitest';

import assignment                                                   from '../../../server/src/data/assignment.json' with {type: 'json'};
import {buildChannelSeries}                                         from './chart-data.ts';
import {type HierarchyNode, type HierarchyNodeKind, parseHierarchy} from './hierarchy.ts';

const options = {remainderChannel: 'Existing clients'};
const twelve = (value: number) => Array.from({length: 12}, () => value);

let nextId = 0;

function node(kind: HierarchyNodeKind, name: string, values: number[], children: HierarchyNode[] = []): HierarchyNode {
  nextId += 1;

  return {id: `n${nextId}`, kind, name, values, children};
}

const channel = (name: string, values: number[], children: HierarchyNode[] = []) => node('channel', name, values, children);

describe('buildChannelSeries', () => {
  it('splits the assignment payload into the numbers from the ADR', () => {
    expect(buildChannelSeries(parseHierarchy(assignment), options)).toEqual([
      {name: 'Existing clients', values: [250, 266, 282, 299, 315, 331, 348, 247, 248, 248, 248, 346]},
      {name: 'New organic', values: [0, 1, 1, 1, 0, 2, 2, 1, 1, 1, 1, 2]},
      {name: 'New paid', values: [0, 0, 1, 1, 2, 1, 0, 2, 1, 1, 1, 2]}
    ]);
  });

  it('makes the whole bar the remainder channel when the tree has no channels', () => {
    const root = node('company', 'Company', twelve(30), [node('branch', 'Branch', twelve(30), [node('employee', 'A', twelve(30))])]);

    expect(buildChannelSeries(root, options)).toEqual([{name: 'Existing clients', values: twelve(30)}]);
  });

  it('collects channels from different levels in different branches', () => {
    const root = node('company', 'Company', twelve(100), [
      node('branch', 'North', twelve(60), [channel('New organic', twelve(5)), channel('New paid', twelve(3))]),
      node('branch', 'South', twelve(40), [node('employee', 'Emma', twelve(40), [channel('New paid', twelve(2))])])
    ]);

    expect(buildChannelSeries(root, options)).toEqual([
      {name: 'Existing clients', values: twelve(90)},
      {name: 'New organic', values: twelve(5)},
      {name: 'New paid', values: twelve(5)}
    ]);
  });

  it('takes channels directly under the company and ignores deeper ones', () => {
    const root = node('company', 'Company', twelve(100), [
      node('branch', 'Branch', twelve(100), [channel('New paid', twelve(50))]),
      channel('New organic', twelve(10))
    ]);

    expect(buildChannelSeries(root, options)).toEqual([
      {name: 'Existing clients', values: twelve(90)},
      {name: 'New organic', values: twelve(10)}
    ]);
  });

  it('does not count a breakdown given on two levels of one branch twice', () => {
    const root = node('company', 'Company', twelve(50), [
      node('branch', 'North', twelve(50), [
        node('employee', 'Olivia', twelve(20), [channel('New paid', twelve(2))]),
        channel('New paid', twelve(4))
      ])
    ]);

    expect(buildChannelSeries(root, options)).toEqual([
      {name: 'Existing clients', values: twelve(46)},
      {name: 'New paid', values: twelve(4)}
    ]);
  });

  it('adds up channels with the same name from different nodes', () => {
    const root = node('company', 'Company', twelve(20), [
      node('employee', 'A', twelve(10), [channel('New organic', twelve(1))]),
      node('employee', 'B', twelve(10), [channel('New organic', twelve(2))])
    ]);

    expect(buildChannelSeries(root, options)).toEqual([
      {name: 'Existing clients', values: twelve(17)},
      {name: 'New organic', values: twelve(3)}
    ]);
  });

  it('turns a channel with a new name into its own series, after the remainder, in order of appearance', () => {
    const root = node('company', 'Company', twelve(20), [
      node('employee', 'A', twelve(20), [channel('Referral', twelve(1)), channel('Existing clients', twelve(15)), channel('New paid', twelve(4))])
    ]);

    expect(buildChannelSeries(root, options).map((series) => series.name)).toEqual(['Existing clients', 'Referral', 'New paid']);
  });

  it('ignores the values of the remainder channel in the data', () => {
    const root = node('company', 'Company', twelve(20), [channel('Existing clients', twelve(999)), channel('New paid', twelve(5))]);

    expect(buildChannelSeries(root, options)[0]).toEqual({name: 'Existing clients', values: twelve(15)});
  });

  it('keeps the remainder at zero when the channels add up to more than the root', () => {
    const root = node('company', 'Company', [5, ...twelve(10).slice(1)], [channel('New paid', twelve(8))]);

    expect(buildChannelSeries(root, options)).toEqual([
      {name: 'Existing clients', values: [0, ...twelve(2).slice(1)]},
      {name: 'New paid', values: twelve(8)}
    ]);
  });

  it('leaves out a series that is zero in every month', () => {
    const root = node('company', 'Company', twelve(10), [channel('New organic', twelve(2)), channel('New paid', twelve(0))]);

    expect(buildChannelSeries(root, options).map((series) => series.name)).toEqual(['Existing clients', 'New organic']);
  });

  it('leaves out the remainder when the channels explain everything', () => {
    const root = node('company', 'Company', twelve(10), [channel('New organic', twelve(10))]);

    expect(buildChannelSeries(root, options)).toEqual([{name: 'New organic', values: twelve(10)}]);
  });

  it('keeps a zero category in a single month', () => {
    const organic = [4, 0, 5, 4, 0, 4, 0, 4, 0, 5, 5, 5];
    const total = [40, 0, 35, 38, 0, 42, 45, 44, 0, 46, 48, 50];
    const root = node('company', 'Company', total, [channel('New organic', organic)]);

    expect(buildChannelSeries(root, options)).toEqual([
      {name: 'Existing clients', values: [36, 0, 30, 34, 0, 38, 45, 40, 0, 41, 43, 45]},
      {name: 'New organic', values: organic}
    ]);
  });

  it('does not count the children of a channel', () => {
    const root = node('company', 'Company', twelve(20), [
      channel('New paid', twelve(3), [channel('Paid search', twelve(2)), node('employee', 'X', twelve(1), [channel('Referral', twelve(1))])])
    ]);

    expect(buildChannelSeries(root, options)).toEqual([
      {name: 'Existing clients', values: twelve(17)},
      {name: 'New paid', values: twelve(3)}
    ]);
  });

  it('treats months missing from a channel as zero', () => {
    const root = node('company', 'Company', [10, 10, 10], [
      channel('New paid', [1]),
      channel('New paid', [1, 2, 3]),
      channel('New organic', [1])
    ]);

    expect(buildChannelSeries(root, options)).toEqual([
      {name: 'Existing clients', values: [7, 8, 7]},
      {name: 'New paid', values: [2, 2, 3]},
      {name: 'New organic', values: [1]}
    ]);
  });

  it('returns no series for an empty year', () => {
    expect(buildChannelSeries(node('company', 'Company', twelve(0)), options)).toEqual([]);
  });
});
