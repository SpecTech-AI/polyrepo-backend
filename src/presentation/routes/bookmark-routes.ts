import { Hono } from 'hono';
import { CreateBookmarkUseCase } from '../../application/usecase/create-bookmark';
import { DeleteBookmarkUseCase } from '../../application/usecase/delete-bookmark';
import { GetBookmarkUseCase } from '../../application/usecase/get-bookmark';
import { GetBookmarksUseCase } from '../../application/usecase/get-bookmarks';
import { UpdateBookmarkUseCase } from '../../application/usecase/update-bookmark';

/**
 * ブックマーク API ルート
 *
 * Presentation層 の責務:
 * - HTTP リクエストの受け取り
 * - UseCase の呼び出し
 * - HTTP レスポンスの返却
 *
 * ビジネスロジックはここに書きません。
 */
export function createBookmarkRoutes(useCases: {
  createBookmark: CreateBookmarkUseCase;
  getBookmarks: GetBookmarksUseCase;
  getBookmark: GetBookmarkUseCase;
  updateBookmark: UpdateBookmarkUseCase;
  deleteBookmark: DeleteBookmarkUseCase;
}): Hono {
  const app = new Hono();

  app.get('/', async (c) => {
    const tag = c.req.query('tag');
    const result = await useCases.getBookmarks.execute(tag);
    return c.json({ data: result });
  });

  app.get('/:id', async (c) => {
    const id = Number(c.req.param('id'));
    const result = await useCases.getBookmark.execute(id);
    if (!result) {
      return c.json({ error: 'ブックマークが見つかりません' }, 404);
    }
    return c.json({ data: result });
  });

  app.post('/', async (c) => {
    const body = await c.req.json();
    const result = await useCases.createBookmark.execute(body);
    return c.json({ data: result }, 201);
  });

  app.put('/:id', async (c) => {
    const id = Number(c.req.param('id'));
    const body = await c.req.json();
    const result = await useCases.updateBookmark.execute(id, body);
    return c.json({ data: result });
  });

  app.delete('/:id', async (c) => {
    const id = Number(c.req.param('id'));
    await useCases.deleteBookmark.execute(id);
    return c.json({ data: { message: '削除しました' } });
  });

  return app;
}
