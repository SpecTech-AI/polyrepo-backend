import { PrismaClient } from '@prisma/client';
import { Hono } from 'hono';
import { CreateBookmarkUseCase } from '../application/usecase/create-bookmark';
import { DeleteBookmarkUseCase } from '../application/usecase/delete-bookmark';
import { GetBookmarkUseCase } from '../application/usecase/get-bookmark';
import { GetBookmarksUseCase } from '../application/usecase/get-bookmarks';
import { UpdateBookmarkUseCase } from '../application/usecase/update-bookmark';
import { BookmarkDomainService } from '../domain/service/bookmark-domain-service';
import { BookmarkPrismaRepository } from '../infrastructure/database/bookmark-prisma-repository';
import { createBookmarkRoutes } from './routes/bookmark-routes';
import { createHealthRoutes } from './routes/health-routes';

/**
 * アプリケーションの組み立て（Composition Root）
 *
 * ここで全ての依存関係を「注入」します。
 * 各クラスは自分が使う「インターフェース」だけを知り、
 * 具体的な実装（Prisma など）はここで決定します。
 */
export function createApp(): { app: Hono; prisma: PrismaClient } {
  // Infrastructure
  const prisma = new PrismaClient();
  const repository = new BookmarkPrismaRepository(prisma);

  // Domain
  const domainService = new BookmarkDomainService(repository);

  // Application (UseCases)
  const createBookmark = new CreateBookmarkUseCase(repository, domainService);
  const getBookmarks = new GetBookmarksUseCase(repository);
  const getBookmark = new GetBookmarkUseCase(repository);
  const updateBookmark = new UpdateBookmarkUseCase(repository, domainService);
  const deleteBookmark = new DeleteBookmarkUseCase(repository);

  // Presentation
  const app = new Hono();

  // ルート
  app.route('/api', createHealthRoutes());
  app.route(
    '/api/bookmarks',
    createBookmarkRoutes({
      createBookmark,
      getBookmarks,
      getBookmark,
      updateBookmark,
      deleteBookmark,
    }),
  );

  return { app, prisma };
}
