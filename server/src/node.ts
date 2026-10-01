import {serve}       from '@hono/node-server';
import {serveStatic} from '@hono/node-server/serve-static';
import {Hono}        from 'hono';

import api from './app.ts';

const port = Number(process.env.PORT ?? 3001);

const app = new Hono();

app.route('/', api);
app.use('*', serveStatic({root: './dist/client'}));

serve({fetch: app.fetch, port}, (info) => {
  console.log(`Clients dashboard on http://localhost:${info.port}`);
});
