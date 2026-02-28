/**
 * URL の Value Object
 *
 * Value Object とは「値そのもの」を表す不変のオブジェクトです。
 * バリデーションロジックを内包し、不正な値の生成を防ぎます。
 */
export class BookmarkUrl {
  private constructor(private readonly value: string) {}

  static create(url: string): BookmarkUrl {
    if (!url || url.trim() === '') {
      throw new Error('URL は必須です');
    }
    try {
      new URL(url);
    } catch {
      throw new Error(`無効な URL です: ${url}`);
    }
    return new BookmarkUrl(url);
  }

  toString(): string {
    return this.value;
  }

  equals(other: BookmarkUrl): boolean {
    return this.value === other.value;
  }
}
