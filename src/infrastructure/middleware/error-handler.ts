import { Context, Next } from 'hono';

/**
 * グローバルエラーハンドラ
 *
 * UseCase や Domain 層から throw されたエラーを
 * 統一的な JSON レスポンスに変換します。
 */
export async function errorHandler(c: Context, next: Next): Promise<void> {
  try {
    await next();
  } catch (error) {
    const message =
      error instanceof Error ? error.message : '予期しないエラーが発生しました';
    console.error(`[ERROR] ${c.req.method} ${c.req.path}:`, message);

    const status = message.includes('見つかりません') ? 404 : 400;
    c.res = c.json({ error: message }, status);
  }
}
