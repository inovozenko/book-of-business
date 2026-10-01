import {describe, expect, it} from 'vitest';

import {clientsQueryFromSearch} from './clients-query.ts';

describe('clientsQueryFromSearch', () => {
  it('returns no parameters for an empty address', () => {
    expect(clientsQueryFromSearch('')).toEqual({});
  });

  it('reads year, dataset and scenario as they are', () => {
    expect(clientsQueryFromSearch('?dataset=no-channels&year=2024')).toEqual({dataset: 'no-channels', year: '2024'});
    expect(clientsQueryFromSearch('?year=abc&dataset=')).toEqual({year: 'abc', dataset: ''});
    expect(clientsQueryFromSearch('?scenario=slow&dataset=full')).toEqual({scenario: 'slow', dataset: 'full'});
  });

  it('ignores other parameters', () => {
    expect(clientsQueryFromSearch('?utm_source=mail')).toEqual({});
  });
});
