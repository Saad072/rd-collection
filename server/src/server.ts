import { createApp } from './app';
import { connectDb } from './db';
import { env } from './config/env';

async function main() {
  await connectDb();
  const app = createApp();
  app.listen(env.PORT, () => {
    // eslint-disable-next-line no-console
    console.info(`[server] RD_COLLECTION API listening on :${env.PORT} (${env.NODE_ENV})`);
  });
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('[server] failed to start:', err instanceof Error ? err.message : err);
  process.exit(1);
});
