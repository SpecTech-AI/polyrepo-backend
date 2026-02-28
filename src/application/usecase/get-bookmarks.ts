import { BookmarkRepository } from '../../domain/repository/bookmark-repository';
import { BookmarkResponse } from '../dto/bookmark-dto';
import { toBookmarkResponse } from './shared';

export class GetBookmarksUseCase {
  constructor(private readonly repository: BookmarkRepository) {}

  async execute(tag?: string): Promise<BookmarkResponse[]> {
    const bookmarks = await this.repository.findAll(tag);
    return bookmarks.map(toBookmarkResponse);
  }
}
