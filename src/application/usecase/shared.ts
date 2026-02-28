import { Bookmark } from '../../domain/entity/bookmark';
import { BookmarkResponse } from '../dto/bookmark-dto';

/**
 * Entity を DTO に変換するヘルパー関数
 */
export function toBookmarkResponse(bookmark: Bookmark): BookmarkResponse {
  return {
    id: bookmark.id,
    url: bookmark.url.toString(),
    title: bookmark.title,
    description: bookmark.description,
    tags: bookmark.tags.toArray(),
    createdAt: bookmark.createdAt.toISOString(),
    updatedAt: bookmark.updatedAt.toISOString(),
  };
}
