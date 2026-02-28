import { BookmarkTags } from '../value-object/bookmark-tags';
import { BookmarkUrl } from '../value-object/bookmark-url';

export interface BookmarkProps {
  id: number;
  url: BookmarkUrl;
  title: string;
  description: string;
  tags: BookmarkTags;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Bookmark エンティティ
 *
 * Entity は一意な識別子（id）を持つオブジェクトです。
 * ビジネスルールをこのクラス内に閉じ込め、
 * DB や HTTP の知識を持たないようにします。
 */
export class Bookmark {
  private constructor(private props: BookmarkProps) {}

  static create(props: BookmarkProps): Bookmark {
    if (!props.title || props.title.trim() === '') {
      throw new Error('タイトルは必須です');
    }
    return new Bookmark(props);
  }

  get id(): number {
    return this.props.id;
  }
  get url(): BookmarkUrl {
    return this.props.url;
  }
  get title(): string {
    return this.props.title;
  }
  get description(): string {
    return this.props.description;
  }
  get tags(): BookmarkTags {
    return this.props.tags;
  }
  get createdAt(): Date {
    return this.props.createdAt;
  }
  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  update(params: {
    url?: BookmarkUrl;
    title?: string;
    description?: string;
    tags?: BookmarkTags;
  }): void {
    if (params.url) this.props.url = params.url;
    if (params.title !== undefined) {
      if (params.title.trim() === '') {
        throw new Error('タイトルは必須です');
      }
      this.props.title = params.title;
    }
    if (params.description !== undefined)
      this.props.description = params.description;
    if (params.tags) this.props.tags = params.tags;
  }
}
