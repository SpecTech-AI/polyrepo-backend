import { Bookmark } from '../../domain/entity/bookmark';
import { BookmarkRepository } from '../../domain/repository/bookmark-repository';
import { BookmarkDomainService } from '../../domain/service/bookmark-domain-service';
import { BookmarkTags } from '../../domain/value-object/bookmark-tags';
import { BookmarkUrl } from '../../domain/value-object/bookmark-url';
import { BookmarkResponse, CreateBookmarkRequest } from '../dto/bookmark-dto';
import { toBookmarkResponse } from './shared';

/**
 * ブックマーク作成ユースケース
 *
 * 1つのユースケース = 1つのクラス（単一責任の原則）
 * ビジネスの「手続き」をここにまとめます。
 */
export class CreateBookmarkUseCase {
  constructor(
    private readonly repository: BookmarkRepository,
    private readonly domainService: BookmarkDomainService,
  ) {}

  async execute(input: CreateBookmarkRequest): Promise<BookmarkResponse> {
    const url = BookmarkUrl.create(input.url);
    const tags = BookmarkTags.create(input.tags ?? []);

    const isDuplicate = await this.domainService.isDuplicateUrl(url.toString());
    if (isDuplicate) {
      throw new Error('この URL は既に登録されています');
    }

    const now = new Date();
    const bookmark = Bookmark.create({
      id: 0,
      url,
      title: input.title,
      description: input.description ?? '',
      tags,
      createdAt: now,
      updatedAt: now,
    });

    const saved = await this.repository.save(bookmark);
    return toBookmarkResponse(saved);
  }
}
