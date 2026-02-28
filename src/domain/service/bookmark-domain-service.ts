import { BookmarkRepository } from '../repository/bookmark-repository';

/**
 * Domain Service
 *
 * 単一の Entity に収まらないビジネスロジックをここに置きます。
 * 例: 重複URLチェックは、既存データとの照合が必要なため、
 * Entity 単体では判断できません。
 */
export class BookmarkDomainService {
  constructor(private readonly repository: BookmarkRepository) {}

  async isDuplicateUrl(url: string, excludeId?: number): Promise<boolean> {
    return this.repository.existsByUrl(url, excludeId);
  }
}
