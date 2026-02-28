import { Context, Next } from 'hono';

/**
 * リクエストロガーミドルウェア
 *
 * 全てのリクエストのメソッド、パス、レスポンスタイムをログ出力します。
 */
export async function loggerMiddleware(
  c: Context,
  next: Next,
): Promise<void> {
  const start = Date.now();
  await next();
  const ms = Date.now() - start;
  console.log(`${c.req.method} ${c.req.path} - ${c.res.status} (${ms}ms)`);
}
