// Cloudflare Workers entry for the public demo. Static files come from the assets
// binding in wrangler.jsonc; requests with no matching file, such as /api/*, reach the app.
import app from './app.ts';

export default app;
