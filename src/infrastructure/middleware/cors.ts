import { cors } from 'hono/cors';

/**
 * CORS ミドルウェア
 *
 * CORS（Cross-Origin Resource Sharing）は、
 * 異なるオリジン間の HTTP リクエストを制御する仕組みです。
 *
 * フロントエンド（localhost:3000）からバックエンド（localhost:3001）への
 * リクエストは「クロスオリジン」となり、デフォルトでブラウザにブロックされます。
 * このミドルウェアで許可するオリジンを設定します。
 */
export function createCorsMiddleware() {
  const origin = process.env.CORS_ORIGIN || 'http://localhost:3000';

  return cors({
    origin,
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
  });
}
