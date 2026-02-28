import { BookmarkRepository } from '../../domain/repository/bookmark-repository';

export class DeleteBookmarkUseCase {
  constructor(private readonly repository: BookmarkRepository) {}

  async execute(id: number): Promise<void> {
    const bookmark = await this.repository.findById(id);
    if (!bookmark) {
      throw new Error('ブックマークが見つかりません');
    }
    await this.repository.delete(id);
  }
}
