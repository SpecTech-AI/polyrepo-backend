import { serve } from '@hono/node-server';
import { createApp } from './presentation/index';

const { app, prisma } = createApp();
const port = Number(process.env.PORT) || 3001;

serve({ fetch: app.fetch, port }, () => {
  console.log(`Server is running on http://localhost:${port}`);
});

// グレースフルシャットダウン
process.on('SIGTERM', async () => {
  console.log('Shutting down...');
  await prisma.$disconnect();
  process.exit(0);
});
