/**
 * タグコレクションの Value Object
 *
 * - 重複を自動的に排除する
 * - 空文字のタグを除外する
 * - 不変（immutable）である
 */
export class BookmarkTags {
  private constructor(private readonly values: string[]) {}

  static create(tags: string[]): BookmarkTags {
    const unique = [
      ...new Set(tags.map((t) => t.trim()).filter((t) => t !== '')),
    ];
    return new BookmarkTags(unique);
  }

  static empty(): BookmarkTags {
    return new BookmarkTags([]);
  }

  toArray(): string[] {
    return [...this.values];
  }

  has(tag: string): boolean {
    return this.values.includes(tag);
  }
}
