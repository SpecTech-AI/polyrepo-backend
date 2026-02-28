import { Bookmark } from '../entity/bookmark';

/**
 * Repository インターフェース
 *
 * Domain層はこのインターフェースのみを知ります。
 * 具体的な実装（Prisma）は Infrastructure層 に置きます。
 *
 * これが「依存性逆転の原則（DIP）」です：
 * - Domain層がインターフェースを定義
 * - Infrastructure層がそれを実装
 * - Domain層は Infrastructure層 に依存しない
 */
export interface BookmarkRepository {
  findAll(tag?: string): Promise<Bookmark[]>;
  findById(id: number): Promise<Bookmark | null>;
  save(bookmark: Bookmark): Promise<Bookmark>;
  delete(id: number): Promise<void>;
  existsByUrl(url: string, excludeId?: number): Promise<boolean>;
}
