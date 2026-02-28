import { BookmarkRepository } from '../../domain/repository/bookmark-repository';
import { BookmarkDomainService } from '../../domain/service/bookmark-domain-service';
import { BookmarkTags } from '../../domain/value-object/bookmark-tags';
import { BookmarkUrl } from '../../domain/value-object/bookmark-url';
import { BookmarkResponse, UpdateBookmarkRequest } from '../dto/bookmark-dto';
import { toBookmarkResponse } from './shared';

export class UpdateBookmarkUseCase {
  constructor(
    private readonly repository: BookmarkRepository,
    private readonly domainService: BookmarkDomainService,
  ) {}

  async execute(
    id: number,
    input: UpdateBookmarkRequest,
  ): Promise<BookmarkResponse> {
    const bookmark = await this.repository.findById(id);
    if (!bookmark) {
      throw new Error('ブックマークが見つかりません');
    }

    if (input.url) {
      const isDuplicate = await this.domainService.isDuplicateUrl(
        input.url,
        id,
      );
      if (isDuplicate) {
        throw new Error('この URL は既に登録されています');
      }
    }

    bookmark.update({
      url: input.url ? BookmarkUrl.create(input.url) : undefined,
      title: input.title,
      description: input.description,
      tags: input.tags ? BookmarkTags.create(input.tags) : undefined,
    });

    const saved = await this.repository.save(bookmark);
    return toBookmarkResponse(saved);
  }
}
