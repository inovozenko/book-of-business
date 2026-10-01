import type {ClientsNodeDto} from '../../../shared/clients.ts';
import assignment            from './assignment.json' with {type: 'json'};
import emptyCategories       from './empty-categories.json' with {type: 'json'};
import empty                 from './empty.json' with {type: 'json'};
import full                  from './full.json' with {type: 'json'};
import inconsistentTotals    from './inconsistent-totals.json' with {type: 'json'};
import largeNumbers          from './large-numbers.json' with {type: 'json'};
import longNames             from './long-names.json' with {type: 'json'};
import noChannels            from './no-channels.json' with {type: 'json'};
import noEmployees           from './no-employees.json' with {type: 'json'};
import partialChannels       from './partial-channels.json' with {type: 'json'};
import singleLevel           from './single-level.json' with {type: 'json'};

export interface Dataset {
  name: string;
  payload: ClientsNodeDto;
}

/**
 * Every dataset the API serves, selected with `?dataset=<name>`. Each is a JSON file in this folder
 * with the structure of the assignment: the company holds branches, a branch employees, an employee
 * channels, and at any level the data is either there in that shape or missing. The assignment comes
 * first and is the default. The E2E suite runs one scenario per entry.
 */
export const datasets: readonly Dataset[] = [
  // The payload from the assignment brief, unchanged.
  {name: 'assignment', payload: assignment},
  // The company with no clients in any month and nothing below it.
  {name: 'empty', payload: empty},
  // Five branches, every adviser with all three channels; every parent is the sum of its children.
  {name: 'full', payload: full},
  // Branches without employees: two without the key, one with an empty list.
  {name: 'no-employees', payload: noEmployees},
  // Branches and employees, no channels anywhere.
  {name: 'no-channels', payload: noChannels},
  // Channels for some advisers only, some with part of the channels, one with a channel name not in the design.
  {name: 'partial-channels', payload: partialChannels},
  // Everybody left in some months: whole months at zero, a channel at zero in one month and one at zero all year.
  {name: 'empty-categories', payload: emptyCategories},
  // The company alone, with clients, and nothing below it.
  {name: 'single-level', payload: singleLevel},
  // Long names, Cyrillic and accented letters, two advisers with the same name and a long channel name.
  {name: 'long-names', payload: longNames},
  // Five- and six-digit client counts.
  {name: 'large-numbers', payload: largeNumbers},
  // Totals that do not add up: branches against the company, and channels above their adviser and, in Jun and Jul 2024, above the company.
  {name: 'inconsistent-totals', payload: inconsistentTotals}
];
