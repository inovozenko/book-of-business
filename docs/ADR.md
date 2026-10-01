# ADR: Clients dashboard (frontend home assignment)

English · [Русский](ADR.ru.md)

This is a translation. The source is the Russian [ADR.ru.md](ADR.ru.md); where the two differ, the Russian one is
right.

Edition 4, 2026-10-01. Replaces the third. Stages 1–11 are done; stage 12 waits for the remote repository
(section 8). What changed: the "stage 2" placeholders are replaced with facts from the design and the spike; the
decisions include what came up during implementation; after the review the author made three decisions — hover
on every row (T2), the expand and collapse animation (T7), Tab across table rows (T9).

The brief: [docs/Frontend Home Assignment.md](Frontend%20Home%20Assignment.md). The app follows it
strictly. Every place where a decision departs from the brief or the design is collected in section 3.

## Tech stack

| Area | Technology | Details |
|---|---|---|
| Frontend | React 19 + TypeScript, Vite | 2.1 |
| UI components | React Aria Components: `Table` with expandable rows | 2.2 |
| Styles | SCSS with CSS Modules, semantic class names, tokens in CSS custom properties | 2.1, 2.7 |
| Font | Inter 4 from `@fontsource-variable/inter`, one Latin file | 2.1 |
| Chart | Recharts 3.6+, stacked bar chart | 2.3 |
| State | Local React state only | 2.1 |
| API | TypeScript, Hono, REST | 2.5 |
| API runtime | Node.js (`@hono/node-server`) locally, Cloudflare Workers for the demo | 2.5, T8 |
| Unit and component tests | Vitest, React Testing Library, `@testing-library/user-event` | 2.8 |
| E2E and a11y | Playwright: a scenario per dataset, axe checks; keyboard in three engines | 2.8 |
| Quality | TypeScript strict mode, ESLint with ESLint Stylistic instead of Prettier, accessibility-first, 100% coverage of the data transformation | 2.4, 2.8 |
| Delivery | GitHub Actions: lint, type check, tests, build, automatic deploy | 2.9 |
| Hosting | Cloudflare, free plan: one Worker serves the frontend and the API | 2.9 |
| Versions | Pinned; new APIs are taken from the types in `node_modules`, not from memory | 2.11 |
| Development process | Claude Code on Opus 5.5, Figma MCP, Playwright MCP; stages and reports | 7, 8 |

Not used: shadcn/ui and Tailwind; Redux, Zustand, MobX; TanStack Query.

## 1. Context

What we build: one page, Clients, with two parts.

- A stacked bar chart: clients per month split by acquisition channel.
- A monthly table with expandable rows: Company → Branch → Adviser → Channel.

The brief's requirements that drive the decisions:

- React and TypeScript; a Node.js REST API serves the data; the UI has loading and error states.
- Component APIs as in a real team: composable, with clear boundaries.
- Accessibility: expanding and collapsing works from the keyboard, and the hierarchy reaches assistive technology.
- Tests at least for expanding and collapsing and for how the data maps onto the chart.
- Nothing breaks or overflows the screen down to 375px.
- README: running and tests, assumptions, open questions, what next.

The nesting is uneven: Branch 2 and Branch 3 have no employees, and only Anna Blackwood has channels.

### The design

- Copy of the file for Figma MCP: https://www.figma.com/design/E2P7cfXYiZOf2FEPnzhomp/Web-engineer-home-task--Copy-?node-id=0-1&p=f&t=HKf6WQZlGIQKswHc-0
- The original from the brief is view-only and not reachable through MCP. It and the prototype
  (expand animation, hover) are viewed in a browser:
  https://www.figma.com/proto/t6itC2qsmr3WLPugwrVdqS/Web-engineer-home-task?node-id=1-2781
  With `&scaling=min-zoom&hide-ui=1` in a 1600×1000 window the prototype draws Mockup 2 at 1:1.
- Nodes: Mockup 2 — `1:2781` (Chart `1:2814`, Table `1:2901`, header row `1:2902`); components —
  Row `0:1533`, Row name `0:1414`, Table · First and second levels `0:1491`, Table · Third level `0:1447`.
- On the Starter plan Figma MCP allows 20 read calls a month: we ask for specific nodes, not the whole page.
  8 were used as of 2026-10-01.
- The reference shot of Mockup 2 at 1440×900 is `docs/screenshots/figma-mockup-2.png`, with the app's shot next to it.

What we know from the design (Figma MCP and the prototype). All values live in `client/src/styles/tokens.scss`,
except the chart geometry: Recharts takes numbers, so it is written as constants in `StackedBarChart.tsx`.

- Frame 1440×900, content 1408px with 16px side margins, page background `#f7f5ed`. The `Clients` heading is
  Inter Display 35px in a 44px block, 24px from the top. Below are two white cards with an 8px radius: the chart,
  1408×430, and the table; 16px between blocks, 24px at the bottom.
- Text colours: primary `#141413`, secondary is the same at 60% opacity. Lines: the row divider is 8%, the dashed
  grid 16%. The row hover background is 4%.
- Chart: card padding 24/16/16; a 320px plot area, axis 0–400 and five dashed lines (dash `1 6`, round caps),
  80px per 100 clients; axis labels Inter 12/16, secondary colour, tabular figures, 12px from the axis; bars
  87.5px with a 24px gap and 12px from the edges of the plot; the whole stack is rounded by 4px, not each segment;
  the legend sits centred below, 16px from the plot, with 8px markers rounded by 2px and 16px between items. Series
  colours: Existing clients `#b29df8`, New organic `#f4beb4`, New paid `#a75e6e`. The chart does not change when
  rows expand.
- Table: the header row and the data rows are 56px each; the last row has no divider. Month labels are
  Inter 14/20, secondary colour, aligned to the bottom of the cell (16px from the bottom). The name column is 264px
  with 16px of left padding; 12 month columns share the remaining width (`flex: 1`), which at 1408px is 76px with
  a 16px gap and 24px of right padding. Numbers are Inter 14/20 with tabular figures, right-aligned, the text 18px
  from the top of the row. The level indent step is 28px, the arrow 16px, the gap 8px, the avatar 20px; channel
  text lines up with the employee name.
- Layer names: the levels are called Company, Branch, Adviser, Attribute; the first header cell is called
  `Placeholder`, is empty and is set in an invisible Test Founders Grotesk — the font appears nowhere else.
- Prototype: on expand, new rows grow in over ~300 ms and push the rows below down, the text fades in, the arrow
  turns; on hover a row highlights. How this is reproduced is in T7.

## 2. Decisions

### 2.1 Frontend

- React 19, TypeScript in strict mode, Vite.
- **React Aria Components directly, without shadcn/ui or Tailwind.** Styles are SCSS with CSS Modules
  (`*.module.scss`), with semantic class names and tokens in CSS custom properties.
  Why: for a table, shadcn only gives a wrapper file with Tailwind classes; all behaviour comes from React Aria.
  With shadcn we would have two styling systems on one page and copied code that has to be updated by hand.
  Without it there is one dependency updated through npm and one styling system.
- Minimum code and dependencies, so the page is fast. The client runtime has only `react`, `react-dom`,
  `react-aria-components` and `recharts`, plus the font file; there is no CSS framework. The build is split into
  chunks for React, React Aria and the other libraries (about 220, 195 and 300 kB), and the app code is 13 kB: this
  way the libraries are cached separately and load in parallel.
- The design's font is Inter 4: Inter and Inter Display are one variable family with an optical size axis.
  We load it from the `@fontsource-variable/inter` package through our own `@font-face` for a single Latin file
  with the `wght` and `opsz` axes: the file ships with the build, `font-display: swap`, no requests to third-party
  servers. With `font-optical-sizing: auto` the browser picks Inter Display at 35px and text Inter at 12–14px.
- React Aria runs in the `en-US` locale (`I18nProvider`): otherwise the Expand and Collapse labels follow the
  browser language, while the page is in English.
- State: local React state only. No Redux, Zustand, MobX or TanStack Query — the page makes one GET.
- ESLint both checks and formats the code: ESLint Stylistic instead of Prettier.
  Why: Prettier cannot be configured to the style we need. We need blank lines around blocks and groups of
  declarations, `from` aligned in a column, imports in groups (frameworks, libraries, app code), attributes in the
  Code Guide order (codeguide.co) and lines of up to 240 characters. What ESLint Stylistic lacks, three custom rules
  in `eslint-rules/` do. `npm run format` applies the style.
- Semantic markup: `main`, `h1`, `figure` for the chart, a native `table`.

### 2.2 The table

`Table` from `react-aria-components` with expandable rows (`treeColumn`, `expandedKeys`,
`<Button slot="chevron">`). We do not write the markup and ARIA ourselves; the only keyboard behaviour of our own
is Tab across rows (T9).

Checked on version 1.21.1 against our hierarchy:

- Markup: a native `<table role="treegrid">`, `<tr>` rows with `aria-level`, `aria-posinset`, `aria-setsize`.
- Only rows with children have `aria-expanded`.
- Keyboard: the up and down arrows move between rows, right expands, left collapses, Enter toggles. The library
  itself makes the table a single tab stop, as the treegrid pattern prescribes.
- A click focuses the cell, not the row; the left arrow from the first cell returns focus to the row.
- The arrow button gets an Expand or Collapse label on its own. That label also becomes part of the name of the
  row header cell ("Collapse Company"); this is how the library works, and we keep it.
- For styling there are `--table-row-level`, `[data-level]`, `[data-has-child-items]`, `[data-expanded]`.
  The library sets `[data-hovered]` only on rows with an action.

What the library does not give and we write ourselves (`components/ui/TreeTable`):

- The expand and collapse animation (T7): the library mounts rows and unmounts them at once.
- Tab across rows (T9).
- Prefixed column keys: React Aria keeps columns and rows in one key space, and a node with the id `"1"`
  clashed with a month column — the table crashed.
- React Aria caches rendered rows. Everything a row reads besides its own item (expanded keys, columns, render
  functions) goes into `dependencies`; otherwise handlers see stale keys: a click on Anna collapsed Branch 1.
- The domain wrapper (`features/clients/ClientsTable`): month columns, an avatar on nodes from `employees`, numbers
  with digit grouping, the full name in `title` when an ellipsis cuts it short.
- A hidden name for the first column (`Name`) for screen readers: in the design the cell is empty.
- With no rows and an `emptyState`, the table shows its header with the empty state under it. With no rows there is
  nothing in the table to read or move through, so the keyboard and the screen reader go to the empty state: the
  `<table>` itself is `inert`, and the scroll container is `aria-hidden` with `tabIndex={-1}` (browsers make a scroll
  container with no focusable content a tab stop of its own). `inert` sits on the table, not on the container, so a
  header wider than the screen scrolls by wheel, touch and scroll bar, like a table with data.
  React Aria's `renderEmptyState` does not fit: it puts the content as a row inside the grid, and React Aria treats
  the grid as one tab stop and skips everything inside it on Tab, including the Retry button.
  The bottom corners of the scroll container then have no radius, or they would cut the line under the header.
- Focus management. Focus sits on rows and is never lost:
  - a click focuses its row, not the cell under the pointer, so the arrows carry on from the row, and left and
    right collapse and expand it. React Aria focuses the cell on press and again after expanding, so the move
    happens on the next frame;
  - entering the table with Tab starts at the first row, with Shift+Tab at the last, not where focus was last
    time;
  - rows that are leaving on collapse are disabled (`isDisabled`): the arrows and Tab skip them;
  - if focus is inside a branch that collapses, it moves to the collapsed row;
  - any delayed focus move is cancelled if the user has pressed a key or left the table in the meantime.
  Without this, focus fell to `body` after a collapse, and the arrows started scrolling the page instead of the
  table.
- A visible focus on the row, the cell and the column header: the design has none, so the look is ours — a 2px
  `#5b3fd6` ring. The ring of a cell and of a column header is drawn over it, not as a shadow: the shadow was
  overridden by the rule that removes the last row's divider, and focus on the cells of the last row was invisible.
  The ring of the last column takes in the table's right padding, as the ring of the first one takes the left, and
  reaches the edge; in the four corners of the card the rings are rounded with it.
  Each cell draws its part of the ring overlapping the next cell by a pixel: with fractional column widths, parts
  that only touched left white seams. The bottom corners of the last row are rounded to the card
  (the `--tree-table-radius` variable), so the ring and the hover are not clipped.

Behaviour:

- The root (Company) is expanded by default, as in the design.
- A click on a row with children expands and collapses it, as in the prototype: `onAction` on `Row`, only for rows
  with children.
- Rows without children: no arrow (T1), but with hover, like every row (T2).

Alternatives considered:

| Option | Why not |
|---|---|
| shadcn/ui on React Aria | Only styling over the same library; brings Tailwind |
| Base UI, Radix | No table components |
| TanStack Table | Headless: the markup, ARIA and keyboard would be ours to write |
| AG Grid, MUI X Data Grid | Tree data only in paid editions; heavy, with a look of their own |
| Our own `<table role="treegrid">` | It was the fallback; the spike passed (8.1), so it was not needed |

React Aria is Adobe's open-source library under Apache 2.0, with no paid edition and no tie to Adobe products.

### 2.3 Chart

- Recharts 3.6 or later. `BarStack` rounds the whole stack, so an empty top category does not break the
  rounding.
- The chart always shows the root of the tree and does not react to expanding rows, as in the prototype.
- The data mapping is a pure function in `lib/chart-data.ts`; we test it, not the SVG (see T4):
  - the rule is general and does not depend on the shape of the tree: channels may sit at any depth;
  - a channel is a node with `kind: 'channel'` (see 2.4); there is no other marker;
  - channels are collected recursively and grouped by name. If a node has channels of its own, we take them
    and do not go deeper into that node; otherwise we add up the channels of its children. This way the same
    clients are not counted twice when one branch has a breakdown on two levels;
  - for the chart a channel is a leaf: we take its `values` and do not walk its own children. The table shows
    such children as ordinary rows;
  - `Existing clients` is the root value minus the sum of the other channels. The data's own values of an
    `Existing clients` channel take no part in the calculation;
  - the bar height equals the root value; on the assignment data there are three series, as in the design's legend;
  - a channel with a new name becomes a series of its own;
  - which channel takes the remainder is set by the domain layer (`features/clients/channels.ts`): the name comes
    into the function as a parameter. The function in `lib/` itself knows nothing about channel names;
  - a category with zero is not drawn; a series with all values at zero does not get into the legend;
  - if the other channels add up to more than the root value, `Existing clients` is zero;
  - if the tree has no channels, the whole bar is `Existing clients`.
- Stack order from the bottom up: `Existing clients`, `New organic`, `New paid`, as in the design; the legend
  follows the same order. The remainder series is always at the bottom; the others follow in the order they appear
  in the data.
- The colours of the three series come from the design and are tied to channel names in the domain layer. For
  channels with new names the tokens have a fallback palette of four colours.
- Y axis: five grid lines, that is, four intervals. The step is the smallest number of the form 1, 2, 5 × 10ⁿ
  (at least 1) for which four steps cover the highest bar; the top of the axis equals four steps.
  On the assignment data the step is 100 and the axis 0–400; with a maximum of 38 the axis is 0–40; with zero
  data, 0–4. The calculation is a pure function in `lib/axis.ts` (together with the per-category stack sum), under
  the same coverage threshold: it cannot be checked in the component, since Recharts does not render in jsdom.
- The bar width is `barSize` as a percentage of the axis: Recharts rounds a computed width (87.5 → 88px),
  but not a percentage. At 1440px a bar is exactly 87.5px; on a narrow screen it shrinks in the same proportion.
- Axis labels are drawn by our own tick functions with a `data-axis` attribute: this way their position matches the
  design to the pixel, and E2E finds them without Recharts' internal classes.
- The Y axis width is Recharts' `width="auto"`: it measures the elements with the tick class. A label sits in a
  group with an empty 26px-wide rectangle, the label column from the design, so short labels give exactly 38px with
  the gap, as in the design, and long ones, from four digits up, widen the axis instead of being cut off. The chart
  SVG does not clip its content: a label measured before Inter loads may reach into the card padding.
- A year with no clients: there are no bars, but the axis is still 0–4. Without data Recharts uses the given axis
  domain only with `allowDataOverflow`; otherwise the axis is not drawn. Our domain is always above the highest bar,
  so on ordinary data the flag changes nothing. In the middle of the plot stands a label from the `emptyMessage`
  prop ("No clients in this period"), and the card background interrupts the grid line under it. There is no
  legend, but its row stays empty: the chart has the same height as with data and as the skeleton.
- No tooltip: the design has none.
- Accessibility: the chart SVG has `role="img"` and an `aria-label` through Recharts props; `title` does not fit,
  since the browser would show it as a tooltip. The legend is an ordinary list named Legend, not a `figcaption`:
  otherwise it becomes the name of the whole `figure`. The full data is in the table below. Recharts'
  `accessibilityLayer` is off: in version 3 it is on by default, puts the chart into the Tab order and expects a
  Tooltip, which we do not have.

### 2.4 Data model

- The API returns the payload from the brief unchanged: the `branches`, `employees`, `channels` keys stay.
- The shape of the tree cannot be predicted, so it is hard-coded nowhere. A node may hold any of the keys
  `branches`, `employees`, `channels` at any level, including several at once or none.
- At the boundary (`lib/hierarchy.ts`) the client turns the response into a recursive node
  `{ id, name, kind, values, children }`. `kind` is one of `company`, `branch`, `employee`, `channel`
  and follows from the key the node was under; the root has no key, so its `kind` is always `company`.
  Children come in key order: `branches`, `employees`, `channels`.
- The response check is structural only. The rules are the same for a node at any depth:
  - a node is an object; `id` is a non-empty string; `name` is a string;
  - `values` is an array of exactly 12 finite non-negative numbers. Fractional values are allowed
    and are shown as they are, with the fraction. Numbers in the table and on the axis are shown with digit
    grouping in the app locale (`APP_LOCALE`, `en-US`): 153,953;
  - a `branches`, `employees` or `channels` key is either absent or holds an array of objects.
    An empty array equals an absent key. Any other value, `null` included, is a violation;
  - `id` is unique within the tree: it serves as the row key in the table. Any non-empty id is allowed,
    `"1"` included: it does not clash with the column keys (2.2);
  - other keys of a node are ignored.
- A response with no body, `null` and `[]` are not violations but no data (`isEmptyPayload`, see 2.6). `{}` and an
  array of companies are violations: the root of the response is one company.
- One violation at any depth makes the whole response invalid: we show the error state and do not draw part of
  the tree. The error carries the path to the violation. Sums are neither checked nor corrected (see T6).
- Checking, normalising and preparing the data for the table and the chart are pure functions in `lib/`.
  `api/clients.ts` only makes the request. This logic is 100% covered by tests (see 2.8).
- The contract types are shared by the client and the server: `shared/clients.ts`.

### 2.5 API

- Hono, TypeScript, REST. One app, two entry points:
  - `server/src/node.ts` — Node.js through `@hono/node-server`. This is the main way to run it and the answer
    to the brief's requirement of a Node.js REST API.
  - `server/src/worker.ts` — a Cloudflare Worker for the public demo (see T8). It is one line,
    `export default app`: no Workers types are needed.
- `server/src/app.ts` holds only the API routes. On Node, `node.ts` adds the client's static files
  (`serveStatic` from `@hono/node-server/serve-static`, the `dist/client` folder); on Workers the platform serves
  them.
- Without parameters the dataset from the assignment is used: the page `/` and the request `GET /api/clients`
  return the payload from the brief. A test compares `server/src/data/assignment.json` with the JSON from the brief.
- `GET /api/clients?year=2024` returns the payload for the reporting year (see T3). The default year, 2024, is a
  constant in `shared/`, shared by the client and the server. An unknown year gives 404.
  All datasets, fixtures included, belong to 2024: another year gives 404 for any `dataset`.
  Only the string `2024` counts as the year; `year=abc`, an empty value and any other year give 404 too;
  there is no separate 400.
- Datasets are switched by the `dataset` key in the URL: the page `/?dataset=<name>` passes it on to the request
  `GET /api/clients?dataset=<name>`. An unknown name gives 404.
- The dataset from the assignment is called `assignment` and comes first in the list; a request without `dataset`
  equals `dataset=assignment`.
- A 404 response is the JSON `{ "error": "Unknown dataset" }`, `{ "error": "Unknown year" }` or
  `{ "error": "Unknown scenario" }`; `dataset` is checked first, then `year`, then `scenario`. The list of these
  errors is `NOT_FOUND_ERRORS` in `shared/`. The client does not show the text from the response, but uses it to
  tell no data from a failure (2.6).
- Demo scenarios for the page states are the `scenario` key; the page passes it on to the request as it is, like
  `dataset` and `year`. `slow` holds the answer for 2 seconds and returns the dataset (loading shows); `error` also
  waits 2 seconds and answers 500 `{ "error": "Server error" }`, so the skeleton shows before the error and after
  Retry; `empty-response` answers `[]` at once (no data). Without `scenario` there is no delay. The dataset and the
  year are still checked and apply. Retry under `error` gets 500 again: the scenario is part of the address.
- The client reads `year` and `dataset` from the address once on load (`features/clients/clients-query.ts`)
  and passes them to the request as they are, without checking them itself. It builds the month labels from the
  address without waiting for the answer (`reportingMonths`): they are needed without data too (2.6). The default
  year is 2024; text that is not a four-digit year gives 12 empty labels, and the columns stay in place.
- Datasets live in `server/src/data/` as JSON, one file per dataset, in the structure of the brief: the company
  holds `branches`, a branch `employees`, an employee `channels`, and at any level the data is either there in that
  shape or missing. Channels under a branch or the company, as in the former `channels-mixed-levels` dataset, are
  not in the datasets; the chart function still handles such cases, and unit tests cover them. Existing clients in
  the datasets are cumulative: a month's base is the previous month's base plus its new clients minus churn; zeros
  in the middle of the year exist only in `empty-categories`, where all clients left. Datasets: `assignment` (the
  brief; `assignment.json` matches the JSON from the brief byte for byte), `empty`, `full`, `no-employees`,
  `no-channels`, `partial-channels`, `empty-categories`, `single-level`, `long-names`, `large-numbers`,
  `inconsistent-totals`; what each one shows is in the README table. The list of datasets in `index.ts` is one
  array: both the API and E2E work from it (see 2.8). The source is the JSON files themselves; the E2E expectations
  are computed from them separately from the app code and written as constants in `expectations.ts`.

### 2.6 Loading, no-data and error states

The design has none of them; the look is ours, in the style of the design's cards.

- Loading: a skeleton in place of the chart and the table, in a container with `aria-busy`. The message
  "Loading clients…" sits in a persistent live region (`role="status"`), so a screen reader announces it after
  Retry: a region that appears together with its text is often not announced.
- The skeleton does not flash. It appears only if there is no answer within 200 ms, and stays for at least 400 ms
  even if the answer came earlier: the answer waits. A delay alone is not enough: an answer at 210 ms would flash
  the skeleton for 10 ms. The cost is up to 400 ms of waiting in the worst case. Before 200 ms the space under the
  heading is empty on the first load, and on Retry the previous error stays. `aria-busy` and "Loading clients…"
  appear together with the skeleton, so a screen reader does not announce a fast answer. The timings are the
  `useLoadingIndicator` hook in `hooks/`.
- No data and error draw the page without data in place of the skeleton, so nothing jumps on the switch: the cards
  have the same places and sizes as the skeleton and the page with data. The chart has the 0–4 axis, the months and
  a short label in the centre; it is hidden from screen readers, since it is a picture of nothing. The table has
  the month header with a message under it: that is what the screen reader reads, and on error Retry is there too.
  The header of a table without rows is hidden from screen readers and the keyboard, but it scrolls (`emptyState`
  of `TreeTable`, 2.2). If such a page fails to render itself, the message is shown on its own.
- No data: the API answered that it has nothing for the request, and a retry would give the same answer. That is a
  404 whose body has an `error` from `NOT_FOUND_ERRORS` (an unknown dataset, year or scenario), as well as a
  response with no body (204), `null` and `[]`. The chart and the space under the table header say
  "No client data", with no Retry; the same phrase is in the live region, which is there from the start of loading
  and announces it reliably. Nothing is written to the console: this is not a failure.
- Error: everything else — 5xx, a network error, a body that is not JSON, a response that fails the structure check
  (`{}` included), a 404 without such an `error`, for example from a route that does not exist. The chart says
  "Clients could not be loaded"; under the table header there is a message with `role="alert"` and a Retry button.
  While the retry runs, the error and the button stay on screen, focus stays on the button, and pressing it again
  does nothing. A fast answer with the same error leaves everything as it was. When the skeleton or the answer
  replaces the button, focus moves to the page heading instead of being lost.
  `isPending` on the React Aria button does not fit: it reads out the button's name on every press and once more at
  the end. A failed load is written to the console.
- A year with no clients is not no data: the company came, and its zeros are data. The table shows the zeros, the
  chart the 0–4 axis and the label (2.3).
- A render error in the chart or the table is caught by `ErrorBoundary` and gives the same error state, not a
  blank page.
- The logic is in `use-clients.ts`: the latest answer, a flag for a request in flight, cancelling the request on
  unmount, retry. The no-data flag of a failed response is `ClientsRequestError.noData` in `api/clients.ts`, of a
  successful one `isEmptyPayload` in `lib/hierarchy.ts`.

### 2.7 Layout and responsiveness

- The goal is pixel-perfect to the design at 1440px for both the chart and the table. Sizes, spacing, colours,
  fonts and radii are taken from Figma and set up as tokens in `styles/tokens.scss`.
- The check: a shot of the page at a 1440px content width is compared with a shot of Mockup 2 from the prototype.
  Text and line positions match within 1px; the rest of the difference is font smoothing in the browser and in
  Figma, and bar heights that are drawn by hand in the design (see T4). There is no automatic pixel diff in the
  tests.
- The heading row is 44px high, like the block in Figma: at 1.25 × 35 = 43.75px everything below shifted by a
  quarter of a pixel, and the table lines blurred.
- The name column is fixed; the month columns share the rest evenly, like `flex: 1` in the design, but not narrower
  than 68px (enough for "May 2024"); at 1408px each is exactly 92px. The 24px right padding is a separate empty cell
  at the end of every row, so the last month column is like the others. With rigid columns and a classic scroll bar
  (a 1440px window, 1425px of content) the table slid into horizontal scrolling.
- Space for the scroll bar is reserved (`scrollbar-gutter: stable`): otherwise, when it appears, the page narrows by
  15px and the chart redraws with a jump. On systems with overlay scroll bars nothing changes.
- Down to 375px the page does not scroll horizontally.
- The table scrolls inside its card. The first column is pinned from a width of 768px; on narrower screens pinning
  is off, or a 264px column would leave room for one month.
- The chart fits the width; when space runs short, the X axis labels thin out at an even step from the first month
  (`interval="equidistantPreserveStart"`): Feb is always visible, then every second, third or fourth label.
  Recharts takes the smallest step at which all labels fit. `preserveStartEnd` kept both the first and the last
  label but filled the middle greedily, and the rhythm broke: at 1000px the steps were 2, 1 and 3. Recharts measures
  the label width with the font it finds by the `recharts-cartesian-axis-tick-value` class; without that class on our
  labels it measured with the page font, 14px instead of 12px, and hid labels too early.
- Animations are off under `prefers-reduced-motion`.

### 2.8 Tests

- Vitest, unit. Turning the API response into data for the table and the chart (`client/src/lib/**`) is 100%
  covered: lines, branches and functions. The threshold is set in the Vitest config for this folder; `npm test` and
  CI fail if it is not met. A percentage does not replace scenarios; the required list:
  - normalisation: the assignment payload; a node without children; empty arrays; channels right under the company;
    channels under a branch; a node with two keys at once; deep nesting; unknown keys are ignored;
  - structure check: no `id` or `name`; an empty `id`; `values` that is not an array, not 12 items, not numbers,
    a negative number; a response that is not an object; `branches` that is not an array or is `null`; an item of a
    children array that is not an object; a repeated `id` in different branches; a violation on the third level of
    nesting;
  - axis: a maximum of 350 gives 0–400; 38 gives 0–40; exactly 400 gives 0–400; 401 gives 0–800;
    zero gives 0–4;
  - chart: the assignment payload gives the numbers from T4; a tree without channels; channels on different levels
    in different branches; channels on two levels of one branch are not counted twice; same-name channels of
    different nodes add up; a channel with a new name; channels adding up to more than the root; a series of zeros
    only; a zero category in a month; a channel's children are not counted;
  - period: 12 labels from February of the given year, rolling over to January of the next.
- The API route: every dataset, unknown `dataset`, `year` and `scenario`, the order of the checks, the scenarios
  `slow` (on fake timers), `error` and `empty-response`; the assignment payload matches the brief.
- React Testing Library and user-event: expanding and collapsing by click, by the button, by the arrows and Enter,
  `aria-expanded`, `aria-level` and `aria-posinset`, no arrow on rows without children, row ids like `"1"`, Tab
  across rows, the animation (marking rows that appear, collapsing after the animation, expanding again during a
  collapse), the loading, no-data and error states for every kind of answer from 2.6, Retry and the focus after it
  (a fast and a slow retry), no skeleton for a fast answer, `ErrorBoundary`. The skeleton timings are tests of
  `useLoadingIndicator` on fake timers: an answer in 50 ms, in 250 ms, in 2 s.
  The jsdom setup needs stubs for `scrollTo`, `scrollIntoView` and `ResizeObserver`: without them React Aria crashes
  when moving between rows, and Recharts does not know sizes. They live in `client/src/test/setup.ts`.
- Playwright runs in Chromium against the built app: `webServer` starts `npm run build && npm start`
  on port 3101, that is, the same Node server a reviewer runs.
- Playwright: a separate scenario for every dataset — the assignment payload and each fixture.
  The test walks the shared list of datasets, so a new dataset gets its scenario at once. In each one:
  opening the page with the `dataset` key, expanding the tree to the bottom level from the keyboard and collapsing
  it, checking the table rows and the chart's series and axis expected for this dataset, an axe check on the
  expanded table. The expectations for each dataset are written by hand in `server/src/data/expectations.ts` next to
  the fixtures, not computed by the same code that is under test.
  The page states are in `e2e/states.spec.ts`: unknown `dataset`, `year` and `scenario` and the answers `[]`, `null`,
  204 give no data; `{}`, a body that is not JSON, 500 and an HTML 404 page give an error with Retry; the scenarios
  `slow`, `error` and `empty-response`; Retry after a failure. In no data and in error the chart has the 0–4 axis and
  the label, and the table the month header; the cards of the skeleton, the error, no data and data are in the same
  places and of the same size; at 375px the header without data scrolls, and Tab from the page heading goes straight
  to Retry; a fast answer shows no skeleton; a fast Retry with the same error keeps focus on the button, a slow one
  moves it to the heading. Answers are substituted through `page.route`, with an axe check on every state.
  Separately: for a year with no clients the chart has the same height as with data; there is no horizontal overflow
  at 375px; hover on rows with and without children; the animation and its absence under
  `prefers-reduced-motion`.
- The keyboard and focus scenarios are in `e2e/keyboard.spec.ts`, and they run in Chromium, Firefox and WebKit:
  engines handle focus differently. The arrows to the last row, Home and End; a click focuses the row; focus is not
  lost on a collapse and the next key press; Tab skips leaving rows; collapsing with the button moves focus to the
  collapsed row; Tab across rows and out after the last one; entering with Tab at the first row; the right arrow
  into the cells and down through the cells to the last row. Every step checks that the focus ring is visible where
  focus went.

### 2.9 Delivery and hosting

- Locally the API runs only in the Node.js runtime: `npm install`, then `npm run dev` starts Vite and the Node API,
  and Vite proxies `/api`. We do not use the Workers emulator in development.
- Commands:

  | Command | What it does |
  |---|---|
  | `npm run dev` | `concurrently` starts Vite on 5173 and `tsx watch server/src/node.ts` on 3001 |
  | `npm run build` | `tsc -b` and `vite build`, output in `dist/client` |
  | `npm start` | `tsx server/src/node.ts`: one port serves `/api` and the built client from `dist/client` |
  | `npm run typecheck` | `tsc -b` |
  | `npm run lint` | ESLint |
  | `npm run format` | `eslint . --fix`: applies the code style |
  | `npm test` | Vitest with coverage |
  | `npm run test:e2e` | Playwright |
  | `npm run deploy` | `wrangler deploy` |

- The API port is 3001, overridden by the `PORT` variable.
- `tsx` runs the server TypeScript; there is no separate server build.
- The demo is on Cloudflare's free plan: one Worker serves both the SPA's static files and `/api`. One origin, so no
  CORS is needed.
- `wrangler.jsonc`: `main` is `server/src/worker.ts`, `assets.directory` is `./dist/client`, `build.command` is
  `npm run build`, so the deploy and the dry run build the client themselves. The SPA fallback (`not_found_handling`)
  is off: the page has one route, `/`. Cloudflare passes a request with no matching file to the Worker,
  so `/api/*` reaches Hono without `run_worker_first`.
- `wrangler deploy --dry-run` passes; the Worker weighs 65 KiB. The Worker was checked locally once through
  `wrangler dev`: the page, the API and 404 answer. It is not used in development; from then on CI checks it.
- The Worker is called `book-of-business`, and the demo is https://book-of-business.inovozenko.workers.dev. The
  address does not contain the name of the company behind the assignment. The first deploy was done by hand; from
  then on CI deploys.
- GitHub Actions, one workflow, `.github/workflows/ci.yml`:
  - it runs on a push to `main`, on pull requests and by hand;
  - `check`: lint, type check, unit tests, `wrangler deploy --dry-run`. `e2e`: Playwright in three engines; on
    failure the traces are kept as an artifact. Both jobs run in parallel;
  - `e2e` runs in the `mcr.microsoft.com/playwright` image of the same version as `@playwright/test`: the browsers
    and their system packages are already in it. Installing them on the runner (`playwright install --with-deps`)
    hung on `apt` for more than 18 minutes in the first run. The cost: the image tag is updated together with the
    Playwright version;
  - `deploy`: only from `main`, and only when both jobs passed. `wrangler deploy` in the `production` environment,
    then a check of the demo: `index.html` from the demo matches the built one byte for byte, and `GET /api/clients`
    returns the root `id` of the `assignment` dataset. The build is reproducible and Cloudflare serves `index.html`
    unchanged, so a match means the demo runs this commit. Right after a deploy some edge locations still serve
    the old version, so the check retries for a minute;
  - in PRs a new push cancels the previous run, while on `main` runs go to the end, so a deploy is not cut off.
- Node.js 24 LTS locally and in CI (supported until April 2028). The version is written in `.nvmrc`, and CI reads it
  from there. In `package.json`: `engines.node` is `>=24`; `@types/node` stays `^24` from the template, so the types
  match the version the code runs on.
- Node 24 comes with npm 11: it does not run the install scripts of dependencies without permission and prints a
  warning. `esbuild`, `tsx` and `wrangler` work without them (checked on npm 11.19), so we do not allow the
  scripts. If a package does not work without its script, we allow it by name.
- The deploy needs the repository secrets `CLOUDFLARE_API_TOKEN` (a token from the "Edit Cloudflare Workers"
  template) and `CLOUDFLARE_ACCOUNT_ID`. The workflow is ready and will start working once the remote repository
  exists (section 8).

### 2.10 Project structure and component APIs

One `package.json` at the root, no workspaces: two commands are enough for a reviewer.

```
book-of-business/
├── client/
│   ├── index.html
│   ├── public/favicon.svg
│   └── src/
│       ├── api/clients.ts          # the request only
│       ├── features/clients/       # domain: ClientsDashboard, ClientsTable, ClientsChart, use-clients,
│       │                           # clients-query (page address), channels (colours), avatars
│       ├── components/ui/          # shared: TreeTable, StackedBarChart, Card, Avatar, Skeleton, ErrorBoundary
│       ├── hooks/                  # use-loading-indicator: when to show the skeleton
│       ├── lib/                    # hierarchy.ts, chart-data.ts, period.ts, axis.ts — pure functions, 100% coverage
│       ├── assets/avatars/         # five photos from the design
│       ├── styles/                 # tokens.scss, fonts.scss
│       ├── test/setup.ts           # stubs for jsdom
│       ├── App.tsx
│       └── main.tsx
├── server/src/
│   ├── app.ts                      # API routes on Hono
│   ├── node.ts                     # Node.js entry: app plus static files from dist/client
│   ├── worker.ts                   # Cloudflare Workers entry: export default app
│   └── data/                       # datasets as JSON, their list and the E2E expectations
├── shared/clients.ts               # API contract
├── docs/                           # brief, ADR in English and Russian, design and app shots
├── e2e/
│   ├── dashboard.spec.ts           # a scenario per dataset, chart, hover, animation
│   ├── states.spec.ts              # loading, no data, error, Retry, demo scenarios
│   └── keyboard.spec.ts            # keyboard and focus in three engines
├── vite.config.ts                  # root: client, outDir: dist/client, /api proxy, chunks, Vitest config
├── playwright.config.ts            # webServer: npm run build && npm start
├── wrangler.jsonc
├── tsconfig.json                   # references to the three projects below
├── tsconfig.client.json            # client/src and shared; DOM
├── tsconfig.server.json            # server/src and shared; Node types, no DOM
├── tsconfig.node.json              # configs and e2e
├── .github/workflows/ci.yml        # checks on push and PR, demo deploy from main (2.9)
├── .nvmrc                          # 24
├── package.json
└── README.md
```

The Vite template was moved into `client/` in stage 1, and the template's demo content was removed.

The boundary: `components/ui` knows nothing about clients; `features/clients` connects the data to the shared
components. That is the scalability needed here; we add no infrastructure "for growth".

Shared component APIs:

```tsx
<TreeTable
  aria-label="Clients by month"
  rowHeaderLabel="Name"             // first column name for screen readers
  columns={columns}                 // { id, header, textValue? }[]
  rows={[root]}                     // { id, children? }[]
  getRowTextValue={(row) => …}      // row text for typeahead
  renderRowHeader={(row) => …}      // name and avatar
  renderCell={(row, column) => …}
  defaultExpandedKeys={[rootId]}    // or expandedKeys + onExpandedChange
/>

<StackedBarChart
  aria-label="Clients per month by acquisition channel"
  categories={monthLabels}          // string[]
  series={series}                   // { id, label, color, values }[], bottom up
/>

<Card as="div" | "section" | "figure">…</Card>
<Avatar name="…" src={…} />         // photo or initials
<Skeleton width height />
<ErrorBoundary fallback={…}>…</ErrorBoundary>
```

### 2.11 Versions and new APIs

- We install the versions current as of 2026-10-01: `react-aria-components` 1.21.1, `recharts` 3.10.1, `hono` 4.13,
  `@hono/node-server` 2.1, `@fontsource-variable/inter` 5.3, `vitest` and `@vitest/coverage-v8` 5.0,
  `@playwright/test` 1.63, `@axe-core/playwright` 4.13, `@testing-library/jest-dom` 7, `jsdom` 30, `tsx` 4,
  `concurrently` 10, `wrangler` 4.
- Vite 8, TypeScript 6.0 and ESLint 10 stay from the template. We do not move to TypeScript 7: `typescript-eslint`
  does not support it; its latest version, 8.71.0, has `typescript >=4.8.4 <6.1.0` in its peer dependencies.
- Some of the APIs are recent: expandable `Table` rows in React Aria (April 2026), `BarStack` in Recharts
  (since 3.6), Vitest 5, Vite 8. We take their signatures from the types in `node_modules` and from the libraries'
  docs, not from memory. If the types disagree with this ADR, the types are right. No disagreements came up during
  implementation.

## 3. Trade-offs: deviations from the design and assumptions

This section goes into the README as the answer to the brief's request to say what we assumed and why,
and what we think the assignment got wrong.

### T1. The expand arrow on rows without children

- In the design: every level except Attribute has the arrow, including Branch 2, Branch 3 and all advisers.
  In the prototype a click on such an arrow does nothing.
- Decision: if an item has no children, we show no arrow. The indent stays, so the names of neighbouring rows
  line up.
- Why: a control that does nothing misleads the mouse, the keyboard and the screen reader alike. By the treegrid
  rules a leaf must not have `aria-expanded`.
- Cost: a deviation from the design at the level of the `Row name` component.

### T2. Hover on every row

- In the design: any row has a hover background, channels included (`Row`, the `On hover` property).
- Decision: we do the same — hover on every row, with or without children. The pointer cursor appears only on rows
  that expand. React Aria marks hover only on rows with an action, so the highlight is CSS `:hover`, and only on
  devices with a mouse.
- Why: in a wide table the highlight leads the eye along a row across twelve months; for reading that matters
  more. The third edition removed hover from leaves, because a highlight promises an action on click; the author
  brought it back after the review.
- Cost: rows where a click does nothing are highlighted too; only the cursor tells them apart.

### T3. The year in the URL

- In the assignment: the payload has no dates; the labels Feb 2024 – Jan 2025 exist only in the design.
- Decision: the reporting year is part of the URL and the entry point. The page `/?year=2024` requests
  `GET /api/clients?year=2024`. The client builds 12 labels from February of the given year.
  Without the parameter the dataset from the assignment is used: the default year is 2024. The addresses `/` and
  `/?year=2024` are equivalent; there is no redirect between them, and the page does not rewrite the address.
  An unknown year gives 404 and the no-data state in the UI (2.6).
- Why: the period becomes explicit and addressable, and a link to a year can be shared.
  The assignment payload is served unchanged.
- Cost: the rule "the year starts in February" is a constant in `shared/`. The API should rather return the period
  with the data; this is a question for the authors of the assignment.

### T4. What the chart shows

- In the design: the bars are split by channel across the whole company. In the payload only one employee has
  channels, so such a split cannot come from the data.
- Decision: the top-level (Company) values already exist, so we start from them. `New organic` and `New paid` come
  from the channels present in the data and are subtracted from the Company value; the difference is shown as
  `Existing clients`. On the assignment data `Existing clients` by month is: 250, 266, 282, 299, 315, 331, 348, 247,
  248, 248, 248, 346.
- Why: the bar height matches the Company row in the table, there are three series, and the legend matches the
  design. The "known channels only" option would give bars 25–38 high under a Clients heading, with 250–350 in the
  table. A separate neutral segment for clients without a channel was rejected: the legend would get a fourth
  series that the design does not have, and it would take up most of the bar.
- Cost: `Existing clients` in the chart is a computed number, not API data. It includes all clients whose channel
  is unknown, so it does not equal the sum of the `Existing clients` rows in the table.
  The new-client segments on this data are 0–2 clients high, that is, barely visible.
- Scope: this is a general rule, not a decision for one dataset. Channels may come at any level of nesting, and
  the calculation does not change (see 2.3).

### T5. Avatars

- In the design: Adviser rows have a round photo next to the name. The payload has no field for it.
- Decision: we follow the design, with the same five photos. They were exported from Figma through MCP
  (variant `0:1498` of the Table · First and second levels component), scaled down to 60px — triple density for a
  20px avatar, about 7 kB each — and live in `client/src/assets/avatars/`. The mapping "employee id → file" is in
  `features/clients/avatars.ts`. The image has an empty `alt`, because the name stands next to it. If an employee
  has no photo, `Avatar` shows initials; they are drawn by CSS, so they do not get into the row text.
- Why: the row matches the design, every employee has their own face, and the `Avatar` component already takes
  `src` and is ready for real data.
- Cost: the mapping of employees to photos is hard-coded in the client and works only for the five people from the
  assignment. The API should rather return the avatar URL; this is a question for the authors of the assignment.

### T6. Inconsistent data

- In the assignment: in places, parent values do not equal the sum of their children (section 4).
- Decision: we show the API data as it is. We do not recompute, correct or highlight it.
- Why: the API is the source of truth; the design has no error highlight, and the UI cannot know which number is
  wrong.
- Cost: the user sees a table where the sums do not add up. The mismatches are listed in the README.

### T7. The expand and collapse animation

- In the prototype: new rows grow in over ~300 ms and push the rows below down, the text fades in, the arrow turns.
- Decision: we do the same, both ways.
  - Room first, then text. The row height is set on a clipping block inside each cell; a CSS animation grows it
    from zero over 300 ms on a smooth `cubic-bezier(0.4, 0, 0.2, 1)` curve and pushes the rows below down, and the
    divider fades in with the row. The text fades in separately, over 250 ms after a 100 ms delay, when the row
    already has room for it. On collapse the text fades out in 120 ms, then the row shrinks away.
  - The author picked this variant from four set up side by side: the earlier one (height and opacity together,
    with a sharp start), the same one softer and longer, this one, and this one cascading row by row. The sharp
    start looked like a jerk: the first frame after a click comes about 40 ms later, while React Aria re-renders the
    rows, and most of the motion was lost; besides, the text slid out from under the clip halfway.
  - Only the rows the user opened animate, not the rows of the first render.
  - React Aria unmounts rows at once, so on collapse `TreeTable` keeps the parent expanded in the library until the
    rows are gone, and only then tells it the new state. A change that arrives in the meantime is applied on top:
    a row can be expanded again without waiting for the animation to end.
  - The arrow turns at once, following the state the user asked for.
  - Under `prefers-reduced-motion` there are no animations or delays, and rows close at once.
- Cost: our own logic on top of the library. A screen reader learns of a collapse later, by the length of the
  animation.

### T8. Cloudflare Workers when Node.js is required

- In the brief: a Node.js REST API. Workers runs code in workerd, which is not Node.js.
- Decision: the API is a Hono app that runs on Node.js; the same code is deployed to Workers for the demo.
- Cost: two entry points and two ways to run, both of which have to keep working. The Workers entry is not covered
  by tests; the dry run in CI and the request to the demo after a deploy check it (2.9).

### T9. Tab across table rows

- By the treegrid pattern, and likewise in React Aria, the table is one tab stop, and rows are walked with the
  arrows. The page has nothing else to focus, so the second Tab left the page.
- Decision: Tab and Shift+Tab move to the next and the previous row; after the last row Tab leaves the table.
  Entering the table with Tab starts at the first row, with Shift+Tab at the last. The arrows, Enter and click work
  as before. The built-in `keyboardNavigationBehavior="tab"` mode did not fit: it is meant for controls inside cells
  and trapped focus on the arrow button.
- Why: reviewers and users press Tab first. This is the author's decision after the review.
- Cost: our own keyboard handling and a departure from the treegrid pattern; on a long table it takes more presses
  to reach the elements after it.

## 4. Notes on the assignment

| Where | Payload | Sum of children | In Figma |
|---|---|---|---|
| Company, May 2024 | 301 | 279 | 301, the same error |
| Branch 1, Aug 2024 | 214 | 216 | adds up: Robert Chen has 56, the payload 58 |
| Anna Blackwood, May–Sep 2024 | 31, 32, 34, 38, 27 | 30, 33, 35, 36, 28 | adds up: the New paid series in the payload is shifted |

- New paid in the payload: `0, 0, 1, 1, 2, 1, 0, 2, 1, 1, 1, 2`; in Figma: `0, 0, 1, 2, 1, 0, 2, 1, 1, 1, 1, 2`.
  With the Figma series Anna Blackwood adds up in all 12 months.
- A guess for Company in May 2024: Maria Gutierrez should have 44 instead of 22. Then Branch 1 is 178,
  and Company 301.
- In the design itself: Branch 1 for Jul 2024 shows 291 when expanded and 201 when collapsed.
- The chart in the design: for Feb–Aug the bar total matches the Company row; for Sep–Jan the bars are higher
  by 12–14 (262.5 at 250; 363.75 at 350).
- The payload has neither the period nor fields for avatars.

## 5. Risks and what to check first

The risks listed in the third edition and how they closed:

- Expandable rows appeared in React Aria in April 2026 (version 1.17). The spike (8.1) passed with the library's
  standard means; our own `<table role="treegrid">` was not needed. What we built on top of the library is listed
  in 2.2.
- The Figma MCP limit: of the eight allowed calls, seven were used; 8 of 20 for the month.
- Recharts in jsdom does not know the container size: the `lib/` functions are tested separately, the chart in the
  component tests is checked by its legend, and the axes and series in E2E.
- The implementer may not know recent APIs from memory: the signatures were taken from the types, and there were no
  disagreements with the ADR.
- The Workers entry does not run in development: the dry run passes, and the other checks are in CI (2.9).
- More work than the 6–8 hours named in the brief: stages 1–11 are done, and nothing had to be cut.

## 6. README

In English, for reviewers: running and tests; how it is built; assumptions and deviations (section 3); notes on
the assignment (section 4); open questions; what I would do next.

Reviewers start with the README, and the brief asks us to say where we made a call ourselves. So right under the
demo link and the screenshot comes a "Where I made a call" block with links to the assumptions, the notes on the
assignment and the open questions, which come at the end of the README. It also links to this ADR in English and in
Russian. The links in the dataset and state tables lead to both the demo and localhost.

Open questions for the authors of the assignment:

- Which period do the 12 values cover, and why is it not in the API response (T3)?
- Where should employee photos come from (T5)?
- Which of the numbers that do not add up are right (section 4)?
- What should the chart show when channels are known for only some clients (T4)?
- Why do rows that cannot expand have an arrow (T1)?

What next:

- The period and an avatar URL in the API response: this removes T3 and T5.
- A tooltip or an accessible data table for the chart, once the design has them.

## 7. Development process

- Claude Code on Opus 5.5 carries out the implementation by the stages in section 8.
- Figma MCP gives exact values from the copy of the design (sizes, colours, fonts). Calls only from the list
  in 8.1.
- Playwright MCP checks in the browser; it also opens the original design and the prototype. Its files go to
  `.playwright-mcp/`, a folder in `.gitignore`.
- The author dropped the review stops after stages 2 and 6: the implementation ran without stops up to a working
  solution, the stage reports are collected in the final report, and the facts from them are in this edition.
- Every change is a separate commit; lint, the type check and the tests pass on every commit.
- This ADR is the source of decisions. If a decision does not work during implementation, the implementer does not
  change it silently: they describe the mismatch in the report, and the ADR is changed after agreement.
- The ADR is kept in two languages. The source is the Russian [ADR.ru.md](ADR.ru.md), and this file is its
  translation. Both say the same: a change is made in the Russian file and goes into both in one commit, and where
  they differ, the Russian one is right.

## 8. Order of work

Stages go in order. A stage is closed when `npm run lint`, `npm run typecheck` and `npm test` pass,
and from stage 8 also `npm run test:e2e`. If time runs out, we cut from the end: stages 1–9 answer
the brief's requirements, stages 10–12 are extras.

Status as of 2026-10-01: stages 1–11 are done. In stage 12 the demo is deployed by hand and the workflow is
written; its first run waits for the remote repository and the Cloudflare secrets.

| Stage | What we do | Done when | Status |
|---|---|---|---|
| 1 | Scaffold: the template moved to `client/`, tsconfig, commands, Vitest, dependencies, a Hono app without routes (2.9–2.11) | `dev`, `build`, `start`, `typecheck`, `lint` and `test` work on an empty page | Done |
| 2 | Design tokens and the React Aria spike (8.1) | A report on 8.1, the values in `tokens.scss` | Done |
| 3 | Contract and API: `shared/`, the Node server, the `assignment` dataset, fixtures, `dataset` and `year` (2.5) | `GET /api/clients` returns the payload from the brief; unknown `dataset` and `year` give 404 | Done |
| 4 | Pure `lib/` functions and unit tests (2.3, 2.4, 2.8) | `lib/` coverage is 100%, and every scenario from 2.8 is there | Done |
| 5 | Shared components: `Card`, `Avatar`, `Skeleton`, `TreeTable`, `StackedBarChart` (2.10) | The components import nothing from `features/` | Done |
| 6 | The page: `features/clients`, loading, error, Retry, the layout to the design at 1440px, avatars (2.6, 2.7, T5) | The component tests from 2.8 pass; a 1440×900 shot lies next to the shot of the design | Done |
| 7 | Responsiveness: 375px, table scrolling in its card, the pinned column, `prefers-reduced-motion` (2.7) | No horizontal page scroll at 375px | Done |
| 8 | Playwright: a scenario per dataset, axe, 375px (2.8) | `npm run test:e2e` passes | Done |
| 9 | The README in English (section 6) | Running by the README works from a clean clone | Done |
| | **Cut line** | | |
| 10 | The expand and collapse animation (T7) | Rows grow in and shrink away, the arrow turns, `prefers-reduced-motion` is respected | Done |
| 11 | Worker: `worker.ts`, `wrangler.jsonc` (2.9) | `wrangler deploy --dry-run` passes | Done |
| 12 | GitHub Actions and automatic deploy (2.9) | A push to `main` passes the checks and deploys the demo, and the demo check after the deploy passes | Workflow written, waits for the repository |

### 8.1 Stage 2: design tokens and the React Aria spike

**Tokens.** The ceiling is 8 Figma MCP calls out of the remaining 19. 7 were used:

| # | Call | Node | What we took |
|---|---|---|---|
| 1 | `get_variable_defs` | Mockup 2 `1:2781` | colours and fonts from the variables: Inter, Inter Display, background, text, lines |
| 2 | `get_design_context` | Chart `1:2814` | the card, series colours, the grid and its dashes, the axis, labels, the legend, the stack radius |
| 3 | `get_design_context` | Row `0:1533` | height, spacing, the number font, the hover background, dividers |
| 4 | `get_design_context` | Row name `0:1414` | the 28px indent step, the arrow, the 20px avatar, the name font |
| 5 | `get_design_context` | variant `0:1498` | five employee photos (T5); the last row has no divider |
| 6 | `get_metadata` | Mockup 2 `1:2781` | the positions of the heading, the cards and the table header row |
| 7 | `get_design_context` | header row `1:2902` | the font, colour and spacing of the month labels, the `Placeholder` cell |

The rules we worked by:

- If an answer is cut off or too large, we do not repeat the call on the same node; we take a smaller node.
- Everything visible to the eye (the general look, hover, the prototype's animation) we view in the browser through
  Playwright on the original design. We spend no MCP calls on it; the reference shot of Mockup 2 was also taken in
  the browser.
- Values go straight into `client/src/styles/tokens.scss`, and photos into `client/src/assets/avatars/`.
  We do not go back to Figma for the same value.
- Calls beyond eight only with the author's consent.

**Spike.** A temporary page with the assignment payload and React Aria's `Table`; its code became `TreeTable`.
The result point by point:

- a. Layout: 56px rows, columns, right-aligned numbers, the level indent through `--table-row-level`, the arrow and
  the avatar in the first cell — all in CSS by data attributes. Done.
- b. A click on a row with children: `onAction` on `Row`. The arrows and the arrow button work as before. The public
  `dependencies` prop was needed; otherwise handlers saw stale expanded keys. Done.
- c. Horizontal scrolling in the card and a pinned first column — `position: sticky` from 768px. Done.
- d. Appearing rows animate in CSS. The library does not delay collapsing; later the animation was done with our
  own logic on top of it (T7).
- e. axe: no violations.

The decision rule worked in favour of React Aria: points a, b, c and e were done with the library's standard
means. The font and how it is loaded are in 2.1. There are no disagreements between the types and the ADR (2.11).
