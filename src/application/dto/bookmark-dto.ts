/**
 * DTO（Data Transfer Object）
 *
 * 層の境界でデータを受け渡すための型定義です。
 * Entity をそのまま外部に公開すると内部実装が漏洩するため、
 * DTO を介してデータを変換します。
 */

export interface BookmarkResponse {
  id: number;
  url: string;
  title: string;
  description: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateBookmarkRequest {
  url: string;
  title: string;
  description?: string;
  tags?: string[];
}

export interface UpdateBookmarkRequest {
  url?: string;
  title?: string;
  description?: string;
  tags?: string[];
}
