import { BookmarkRepository } from '../../domain/repository/bookmark-repository';
import { BookmarkResponse } from '../dto/bookmark-dto';
import { toBookmarkResponse } from './shared';

export class GetBookmarkUseCase {
  constructor(private readonly repository: BookmarkRepository) {}

  async execute(id: number): Promise<BookmarkResponse | null> {
    const bookmark = await this.repository.findById(id);
    return bookmark ? toBookmarkResponse(bookmark) : null;
  }
}
