import { serve } from '@hono/node-server';
import { Hono } from 'hono';

const app = new Hono();

// ヘルスチェック用のエンドポイント
app.get('/api/health', (c) => {
  return c.json({ status: 'ok' });
});

const port = Number(process.env.PORT) || 3001;

serve({ fetch: app.fetch, port }, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
