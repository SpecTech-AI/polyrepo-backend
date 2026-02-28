import { PrismaClient } from '@prisma/client';
import { Bookmark } from '../../domain/entity/bookmark';
import { BookmarkRepository } from '../../domain/repository/bookmark-repository';
import { BookmarkTags } from '../../domain/value-object/bookmark-tags';
import { BookmarkUrl } from '../../domain/value-object/bookmark-url';

/**
 * BookmarkRepository の Prisma 実装
 *
 * Domain層で定義したインターフェースを、Prisma を使って実装します。
 * 将来 Prisma から別の ORM に変更したい場合、
 * このファイルだけ差し替えれば良い（= 依存性逆転の恩恵）。
 */
export class BookmarkPrismaRepository implements BookmarkRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findAll(tag?: string): Promise<Bookmark[]> {
    const records = await this.prisma.bookmark.findMany({
      where: tag ? { tags: { has: tag } } : undefined,
      orderBy: { createdAt: 'desc' },
    });
    return records.map((r) => this.toEntity(r));
  }

  async findById(id: number): Promise<Bookmark | null> {
    const record = await this.prisma.bookmark.findUnique({ where: { id } });
    return record ? this.toEntity(record) : null;
  }

  async save(bookmark: Bookmark): Promise<Bookmark> {
    const data = {
      url: bookmark.url.toString(),
      title: bookmark.title,
      description: bookmark.description,
      tags: bookmark.tags.toArray(),
    };

    if (bookmark.id === 0) {
      const record = await this.prisma.bookmark.create({ data });
      return this.toEntity(record);
    } else {
      const record = await this.prisma.bookmark.update({
        where: { id: bookmark.id },
        data,
      });
      return this.toEntity(record);
    }
  }

  async delete(id: number): Promise<void> {
    await this.prisma.bookmark.delete({ where: { id } });
  }

  async existsByUrl(url: string, excludeId?: number): Promise<boolean> {
    const count = await this.prisma.bookmark.count({
      where: {
        url,
        ...(excludeId !== undefined ? { id: { not: excludeId } } : {}),
      },
    });
    return count > 0;
  }

  private toEntity(record: {
    id: number;
    url: string;
    title: string;
    description: string;
    tags: string[];
    createdAt: Date;
    updatedAt: Date;
  }): Bookmark {
    return Bookmark.create({
      id: record.id,
      url: BookmarkUrl.create(record.url),
      title: record.title,
      description: record.description,
      tags: BookmarkTags.create(record.tags),
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }
}
