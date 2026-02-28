# polyrepo-backend — ブックマーク API

> **FE/BE 分離構成（ポリレポ）を学ぶための、バックエンド側チュートリアルリポジトリです。**
>
> フロントエンド側: [polyrepo-frontend](https://github.com/SpecTech-AI/polyrepo-frontend)

## アーキテクチャ概要

```
┌──────────┐       ┌──────────────┐       ┌──────────────┐       ┌────────────┐
│ Browser  │──────▶│  Next.js     │──────▶│  Hono API    │──────▶│ PostgreSQL │
│          │       │  :3000       │       │  :3001       │       │  :5432     │
└──────────┘       └──────────────┘       └──────────────┘       └────────────┘
                   polyrepo-frontend       polyrepo-backend        Docker
```

このチュートリアルでは、以下を段階的に学びます：

- **Hono** によるバックエンド API の構築
- **DDD（ドメイン駆動設計）** のレイヤードアーキテクチャ
- **Prisma + PostgreSQL** によるデータベース操作
- **CORS** 設定と FE/BE 分離の核心概念
- **Docker Compose** による一括起動

## 前提条件

- **Node.js** 20 以上
- **Docker** および **Docker Compose**
- **Git**
- [next-fullstack チュートリアル](https://github.com/SpecTech-AI/next-fullstack)を修了していること

## クイックスタート（Docker で一発起動）

完成形をすぐに動かしたい場合：

```bash
# 1. ワークスペースを作成
mkdir polyrepo-workspace && cd polyrepo-workspace

# 2. 両方のリポジトリをクローン
git clone https://github.com/SpecTech-AI/polyrepo-backend.git
git clone https://github.com/SpecTech-AI/polyrepo-frontend.git

# 3. バックエンドディレクトリに移動して起動
cd polyrepo-backend
docker compose up --build

# 4. ブラウザで確認
# フロントエンド: http://localhost:3000
# バックエンド API: http://localhost:3001/api/health
```

## ステップバイステップ チュートリアル

各ステップは Git ブランチとして管理されています。
該当ブランチをチェックアウトすれば、そのステップの完成状態を確認できます。

```bash
# 例: Step 2 の状態を確認したい場合
git checkout step/02-postgresql-prisma
```

---

### Step 1: プロジェクト初期化 (`step/01-project-init`)

**学習ポイント**: Hono の基本、TypeScript プロジェクトのセットアップ

```bash
# プロジェクトを初期化
mkdir polyrepo-backend && cd polyrepo-backend
npm init -y

# 依存パッケージをインストール
npm install hono @hono/node-server
npm install -D typescript tsx @types/node

# TypeScript 設定を作成
npx tsc --init
```

最小限の Hono サーバーを作成します：

```typescript
// src/index.ts
import { serve } from '@hono/node-server';
import { Hono } from 'hono';

const app = new Hono();

app.get('/api/health', (c) => {
  return c.json({ status: 'ok' });
});

const port = Number(process.env.PORT) || 3001;

serve({ fetch: app.fetch, port }, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
```

```bash
# 動作確認
npx tsx src/index.ts

# 別のターミナルで
curl http://localhost:3001/api/health
# => {"status":"ok"}
```

**このステップで得られるもの**: Hono で HTTP サーバーが起動する最小構成

---

### Step 2: PostgreSQL + Prisma セットアップ (`step/02-postgresql-prisma`)

**学習ポイント**: Prisma によるスキーマ定義、マイグレーション、Docker での PostgreSQL 起動

まず、開発用の PostgreSQL を Docker で起動します：

```bash
# PostgreSQL コンテナを起動
docker run -d \
  --name bookmarks-db \
  -e POSTGRES_DB=bookmarks \
  -e POSTGRES_USER=user \
  -e POSTGRES_PASSWORD=password \
  -p 5432:5432 \
  postgres:16-alpine
```

Prisma をセットアップします：

```bash
npm install prisma @prisma/client
npx prisma init
```

スキーマを定義します：

```prisma
// prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model Bookmark {
  id          Int      @id @default(autoincrement())
  url         String
  title       String
  description String   @default("")
  tags        String[] @default([])
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")

  @@map("bookmarks")
}
```

```bash
# .env を設定
echo 'DATABASE_URL="postgresql://user:password@localhost:5432/bookmarks"' > .env

# マイグレーション実行
npx prisma migrate dev --name init

# Prisma Studio でデータを確認（オプション）
npx prisma studio
```

**このステップで得られるもの**: PostgreSQL にテーブルが作成され、Prisma 経由でアクセスできる状態

---

### Step 3: ドメイン層の実装 (`step/03-domain-layer`)

**学習ポイント**: DDD の Entity、Value Object、Repository インターフェース

> **DDD（ドメイン駆動設計）とは？**
>
> ビジネスロジックを中心にコードを設計する手法です。
> 技術的な関心事（DB、HTTP など）をビジネスロジックから分離することで、
> テストしやすく、変更に強いコードを実現します。

#### レイヤー構成図

```
┌─────────────────────────────────────────────┐
│  Presentation層  （HTTP ハンドラ）           │
├─────────────────────────────────────────────┤
│  Application層   （ユースケース）            │
├─────────────────────────────────────────────┤
│  Domain層        （ビジネスロジック）  ← 今ここ │
├─────────────────────────────────────────────┤
│  Infrastructure層（DB、外部サービス）         │
└─────────────────────────────────────────────┘

※ 依存の方向: 上 → 下（Domain層は他の層に依存しない）
```

#### Value Object（値オブジェクト）

Value Object は「値そのもの」を表すオブジェクトで、バリデーションロジックを内包します。

```typescript
// src/domain/value-object/bookmark-url.ts

/**
 * URL の Value Object
 * - URL として有効な文字列のみを許容する
 * - 不変（immutable）である
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
}
```

```typescript
// src/domain/value-object/bookmark-tags.ts

/**
 * タグコレクションの Value Object
 * - 重複を排除する
 * - 空文字のタグを除外する
 */
export class BookmarkTags {
  private constructor(private readonly values: string[]) {}

  static create(tags: string[]): BookmarkTags {
    const unique = [...new Set(tags.map((t) => t.trim()).filter((t) => t !== ''))];
    return new BookmarkTags(unique);
  }

  toArray(): string[] {
    return [...this.values];
  }
}
```

#### Entity（エンティティ）

Entity は一意な識別子を持つオブジェクトです。

```typescript
// src/domain/entity/bookmark.ts

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
 * - ビジネスルールをこのクラス内に閉じ込める
 * - DB や HTTP の知識を持たない
 */
export class Bookmark {
  private constructor(private props: BookmarkProps) {}

  static create(props: BookmarkProps): Bookmark {
    if (!props.title || props.title.trim() === '') {
      throw new Error('タイトルは必須です');
    }
    return new Bookmark(props);
  }

  get id(): number { return this.props.id; }
  get url(): BookmarkUrl { return this.props.url; }
  get title(): string { return this.props.title; }
  get description(): string { return this.props.description; }
  get tags(): BookmarkTags { return this.props.tags; }
  get createdAt(): Date { return this.props.createdAt; }
  get updatedAt(): Date { return this.props.updatedAt; }

  update(params: { url?: BookmarkUrl; title?: string; description?: string; tags?: BookmarkTags }): void {
    if (params.url) this.props.url = params.url;
    if (params.title) this.props.title = params.title;
    if (params.description !== undefined) this.props.description = params.description;
    if (params.tags) this.props.tags = params.tags;
  }
}
```

#### Repository インターフェース

```typescript
// src/domain/repository/bookmark-repository.ts

import { Bookmark } from '../entity/bookmark';

/**
 * Repository インターフェース
 * - Domain層はこのインターフェースのみを知る
 * - 実装（Prisma）はInfrastructure層に置く
 * - これが「依存性逆転の原則」
 */
export interface BookmarkRepository {
  findAll(tag?: string): Promise<Bookmark[]>;
  findById(id: number): Promise<Bookmark | null>;
  save(bookmark: Bookmark): Promise<Bookmark>;
  delete(id: number): Promise<void>;
  existsByUrl(url: string): Promise<boolean>;
}
```

#### Domain Service

```typescript
// src/domain/service/bookmark-domain-service.ts

import { BookmarkRepository } from '../repository/bookmark-repository';

/**
 * Domain Service
 * - 単一のEntityに収まらないビジネスロジックをここに置く
 * - 例: 重複URLチェックは、既存データの確認が必要
 */
export class BookmarkDomainService {
  constructor(private readonly repository: BookmarkRepository) {}

  async isDuplicateUrl(url: string, excludeId?: number): Promise<boolean> {
    return this.repository.existsByUrl(url);
  }
}
```

**このステップで得られるもの**: DB や HTTP に依存しない、純粋なビジネスロジック層

---

### Step 4: アプリケーション層の実装 (`step/04-application-layer`)

**学習ポイント**: UseCase パターン、DTO によるデータ変換

#### DTO（Data Transfer Object）

```typescript
// src/application/dto/bookmark-dto.ts

/**
 * DTO: 層の境界でデータを受け渡す型
 * - Entity をそのまま外に出さない（内部実装の漏洩を防ぐ）
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
```

#### UseCase の実装

```typescript
// src/application/usecase/create-bookmark.ts

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
 * ビジネスの「手続き」をここにまとめる
 */
export class CreateBookmarkUseCase {
  constructor(
    private readonly repository: BookmarkRepository,
    private readonly domainService: BookmarkDomainService,
  ) {}

  async execute(input: CreateBookmarkRequest): Promise<BookmarkResponse> {
    // 1. Value Object を生成（バリデーション）
    const url = BookmarkUrl.create(input.url);
    const tags = BookmarkTags.create(input.tags ?? []);

    // 2. ドメインサービスで重複チェック
    const isDuplicate = await this.domainService.isDuplicateUrl(url.toString());
    if (isDuplicate) {
      throw new Error('この URL は既に登録されています');
    }

    // 3. Entity を生成
    const now = new Date();
    const bookmark = Bookmark.create({
      id: 0, // DB が自動採番
      url,
      title: input.title,
      description: input.description ?? '',
      tags,
      createdAt: now,
      updatedAt: now,
    });

    // 4. 永続化
    const saved = await this.repository.save(bookmark);

    // 5. DTO に変換して返却
    return toBookmarkResponse(saved);
  }
}
```

```typescript
// src/application/usecase/shared.ts

import { Bookmark } from '../../domain/entity/bookmark';
import { BookmarkResponse } from '../dto/bookmark-dto';

export function toBookmarkResponse(bookmark: Bookmark): BookmarkResponse {
  return {
    id: bookmark.id,
    url: bookmark.url.toString(),
    title: bookmark.title,
    description: bookmark.description,
    tags: bookmark.tags.toArray(),
    createdAt: bookmark.createdAt.toISOString(),
    updatedAt: bookmark.updatedAt.toISOString(),
  };
}
```

同様に、`GetBookmarksUseCase`、`GetBookmarkUseCase`、`UpdateBookmarkUseCase`、`DeleteBookmarkUseCase` も実装します（各ファイルの詳細はソースコードを参照）。

**このステップで得られるもの**: ビジネスロジックの「手続き」が UseCase として整理された状態

---

### Step 5: API ルートの実装 (`step/05-api-routes`)

**学習ポイント**: Hono でのルーティング、Repository の具象クラス、DI（依存性注入）

#### Infrastructure 層: Prisma Repository の実装

```typescript
// src/infrastructure/database/bookmark-prisma-repository.ts

import { PrismaClient } from '@prisma/client';
import { Bookmark } from '../../domain/entity/bookmark';
import { BookmarkRepository } from '../../domain/repository/bookmark-repository';
import { BookmarkTags } from '../../domain/value-object/bookmark-tags';
import { BookmarkUrl } from '../../domain/value-object/bookmark-url';

/**
 * BookmarkRepository の Prisma 実装
 *
 * Domain層のインターフェースを、Prismaを使って実装する。
 * もし将来 Prisma から別のORMに変えたい場合、
 * このファイルだけ差し替えれば良い（= 依存性逆転の恩恵）
 */
export class BookmarkPrismaRepository implements BookmarkRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findAll(tag?: string): Promise<Bookmark[]> {
    const records = await this.prisma.bookmark.findMany({
      where: tag ? { tags: { has: tag } } : undefined,
      orderBy: { createdAt: 'desc' },
    });
    return records.map(this.toEntity);
  }

  async findById(id: number): Promise<Bookmark | null> {
    const record = await this.prisma.bookmark.findUnique({ where: { id } });
    return record ? this.toEntity(record) : null;
  }

  async save(bookmark: Bookmark): Promise<Bookmark> {
    if (bookmark.id === 0) {
      // 新規作成
      const record = await this.prisma.bookmark.create({
        data: {
          url: bookmark.url.toString(),
          title: bookmark.title,
          description: bookmark.description,
          tags: bookmark.tags.toArray(),
        },
      });
      return this.toEntity(record);
    } else {
      // 更新
      const record = await this.prisma.bookmark.update({
        where: { id: bookmark.id },
        data: {
          url: bookmark.url.toString(),
          title: bookmark.title,
          description: bookmark.description,
          tags: bookmark.tags.toArray(),
        },
      });
      return this.toEntity(record);
    }
  }

  async delete(id: number): Promise<void> {
    await this.prisma.bookmark.delete({ where: { id } });
  }

  async existsByUrl(url: string): Promise<boolean> {
    const count = await this.prisma.bookmark.count({ where: { url } });
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
```

#### Presentation 層: Hono ルート

```typescript
// src/presentation/routes/bookmark-routes.ts

import { Hono } from 'hono';
import { CreateBookmarkUseCase } from '../../application/usecase/create-bookmark';
import { DeleteBookmarkUseCase } from '../../application/usecase/delete-bookmark';
import { GetBookmarkUseCase } from '../../application/usecase/get-bookmark';
import { GetBookmarksUseCase } from '../../application/usecase/get-bookmarks';
import { UpdateBookmarkUseCase } from '../../application/usecase/update-bookmark';

/**
 * ブックマーク API ルート
 *
 * Presentation層の責務:
 * - HTTP リクエストの受け取り
 * - UseCase の呼び出し
 * - HTTP レスポンスの返却
 * - ビジネスロジックは書かない
 */
export function createBookmarkRoutes(useCases: {
  createBookmark: CreateBookmarkUseCase;
  getBookmarks: GetBookmarksUseCase;
  getBookmark: GetBookmarkUseCase;
  updateBookmark: UpdateBookmarkUseCase;
  deleteBookmark: DeleteBookmarkUseCase;
}): Hono {
  const app = new Hono();

  // 一覧取得
  app.get('/', async (c) => {
    const tag = c.req.query('tag');
    const result = await useCases.getBookmarks.execute(tag);
    return c.json({ data: result });
  });

  // 単体取得
  app.get('/:id', async (c) => {
    const id = Number(c.req.param('id'));
    const result = await useCases.getBookmark.execute(id);
    if (!result) {
      return c.json({ error: 'ブックマークが見つかりません' }, 404);
    }
    return c.json({ data: result });
  });

  // 作成
  app.post('/', async (c) => {
    const body = await c.req.json();
    const result = await useCases.createBookmark.execute(body);
    return c.json({ data: result }, 201);
  });

  // 更新
  app.put('/:id', async (c) => {
    const id = Number(c.req.param('id'));
    const body = await c.req.json();
    const result = await useCases.updateBookmark.execute(id, body);
    return c.json({ data: result });
  });

  // 削除
  app.delete('/:id', async (c) => {
    const id = Number(c.req.param('id'));
    await useCases.deleteBookmark.execute(id);
    return c.json({ data: { message: '削除しました' } });
  });

  return app;
}
```

#### DI（依存性注入）によるアプリケーション組み立て

```typescript
// src/presentation/index.ts

import { PrismaClient } from '@prisma/client';
import { Hono } from 'hono';
import { BookmarkDomainService } from '../domain/service/bookmark-domain-service';
import { BookmarkPrismaRepository } from '../infrastructure/database/bookmark-prisma-repository';
import { CreateBookmarkUseCase } from '../application/usecase/create-bookmark';
import { GetBookmarksUseCase } from '../application/usecase/get-bookmarks';
import { GetBookmarkUseCase } from '../application/usecase/get-bookmark';
import { UpdateBookmarkUseCase } from '../application/usecase/update-bookmark';
import { DeleteBookmarkUseCase } from '../application/usecase/delete-bookmark';
import { createBookmarkRoutes } from './routes/bookmark-routes';
import { createHealthRoutes } from './routes/health-routes';

/**
 * アプリケーションの組み立て（Composition Root）
 *
 * ここで全ての依存関係を「注入」する。
 * 各クラスは自分が使う「インターフェース」だけを知り、
 * 具体的な実装はここで決定する。
 */
export function createApp(): { app: Hono; prisma: PrismaClient } {
  // Infrastructure
  const prisma = new PrismaClient();
  const repository = new BookmarkPrismaRepository(prisma);

  // Domain
  const domainService = new BookmarkDomainService(repository);

  // Application (UseCases)
  const createBookmark = new CreateBookmarkUseCase(repository, domainService);
  const getBookmarks = new GetBookmarksUseCase(repository);
  const getBookmark = new GetBookmarkUseCase(repository);
  const updateBookmark = new UpdateBookmarkUseCase(repository, domainService);
  const deleteBookmark = new DeleteBookmarkUseCase(repository);

  // Presentation
  const app = new Hono();
  app.route('/api/bookmarks', createBookmarkRoutes({
    createBookmark,
    getBookmarks,
    getBookmark,
    updateBookmark,
    deleteBookmark,
  }));
  app.route('/api', createHealthRoutes());

  return { app, prisma };
}
```

**このステップで得られるもの**: 全レイヤーが接続され、API が動作する状態

---

### Step 6: CORS とミドルウェア (`step/06-cors-and-middleware`)

**学習ポイント**: 同一オリジンポリシー、CORS の仕組み、エラーハンドリング

> **なぜ CORS が必要なのか？**
>
> ブラウザは **同一オリジンポリシー** により、異なるオリジン（ドメイン:ポート）
> へのリクエストをデフォルトでブロックします。
>
> - フロントエンド: `http://localhost:3000`
> - バックエンド: `http://localhost:3001`
>
> ポートが異なるため「別オリジン」と判定されます。
> バックエンド側で CORS ヘッダーを返すことで、フロントエンドからのアクセスを許可します。
>
> **これが FE/BE 分離構成で最も重要な概念です。**

```typescript
// src/infrastructure/middleware/cors.ts

import { cors } from 'hono/cors';

/**
 * CORS ミドルウェア
 *
 * Access-Control-Allow-Origin ヘッダーを設定し、
 * フロントエンドからのクロスオリジンリクエストを許可する。
 */
export function createCorsMiddleware() {
  const origin = process.env.CORS_ORIGIN || 'http://localhost:3000';

  return cors({
    origin,
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
  });
}
```

```typescript
// src/infrastructure/middleware/error-handler.ts

import { Context, Next } from 'hono';

/**
 * グローバルエラーハンドラ
 *
 * UseCase や Domain 層から throw されたエラーを
 * 統一的な JSON レスポンスに変換する
 */
export async function errorHandler(c: Context, next: Next): Promise<Response> {
  try {
    await next();
  } catch (error) {
    const message = error instanceof Error ? error.message : '予期しないエラーが発生しました';
    console.error(`[ERROR] ${c.req.method} ${c.req.path}:`, message);
    return c.json({ error: message }, 400);
  }
  return c.res;
}
```

**このステップで得られるもの**: フロントエンドと安全に通信できる、本番に近い構成

---

### Step 7: Docker 化 (`step/07-docker`)

**学習ポイント**: Dockerfile、Docker Compose、コンテナ間ネットワーク

#### Dockerfile

```dockerfile
# Dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
COPY prisma ./prisma/
RUN npm ci
COPY . .
RUN npx prisma generate
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
COPY --from=builder /app/prisma ./prisma
EXPOSE 3001
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/index.js"]
```

#### Docker Compose

```yaml
# docker-compose.yml
services:
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: bookmarks
      POSTGRES_USER: user
      POSTGRES_PASSWORD: password
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data

  backend:
    build: .
    ports:
      - "3001:3001"
    environment:
      DATABASE_URL: postgresql://user:password@db:5432/bookmarks
      PORT: "3001"
      CORS_ORIGIN: http://localhost:3000
    depends_on:
      - db

  frontend:
    build:
      context: ../polyrepo-frontend
    ports:
      - "3000:3000"
    environment:
      NEXT_PUBLIC_API_URL: http://localhost:3001
      API_URL: http://backend:3001
    depends_on:
      - backend

volumes:
  pgdata:
```

> **コンテナ間ネットワークの注意点**
>
> | 通信元 | API の URL | 理由 |
> |--------|-----------|------|
> | ブラウザ（クライアント） | `http://localhost:3001` | ブラウザはホストマシンから通信する |
> | Next.js サーバー（SSR） | `http://backend:3001` | コンテナ間は Docker ネットワーク内で通信する |
>
> フロントエンド側では `NEXT_PUBLIC_API_URL`（ブラウザ用）と `API_URL`（SSR 用）の
> 2 つの環境変数を使い分ける必要があります。

```bash
# 起動
docker compose up --build

# 確認
curl http://localhost:3001/api/health
curl http://localhost:3001/api/bookmarks
```

**このステップで得られるもの**: `docker compose up` で FE + BE + DB が一括起動する完成形

---

## API リファレンス

### ヘルスチェック

```bash
curl http://localhost:3001/api/health
# => {"status":"ok"}
```

### ブックマーク一覧取得

```bash
curl http://localhost:3001/api/bookmarks

# タグでフィルタ
curl "http://localhost:3001/api/bookmarks?tag=typescript"
```

### ブックマーク単体取得

```bash
curl http://localhost:3001/api/bookmarks/1
```

### ブックマーク作成

```bash
curl -X POST http://localhost:3001/api/bookmarks \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://hono.dev",
    "title": "Hono 公式ドキュメント",
    "description": "軽量 Web フレームワーク",
    "tags": ["hono", "typescript", "backend"]
  }'
```

### ブックマーク更新

```bash
curl -X PUT http://localhost:3001/api/bookmarks/1 \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Hono - 超高速 Web フレームワーク",
    "tags": ["hono", "typescript", "backend", "tutorial"]
  }'
```

### ブックマーク削除

```bash
curl -X DELETE http://localhost:3001/api/bookmarks/1
```

## DDD レイヤー解説

```
src/
├── domain/              ← ビジネスロジックの核心（外部に依存しない）
│   ├── entity/          ← 一意な識別子を持つオブジェクト
│   ├── value-object/    ← 値そのものを表す不変オブジェクト
│   ├── repository/      ← データ永続化のインターフェース
│   └── service/         ← Entity単体に収まらないビジネスロジック
│
├── application/         ← ユースケース（ビジネス手続きの調整役）
│   ├── usecase/         ← 1ユースケース = 1クラス
│   └── dto/             ← 層の境界でデータを受け渡す型
│
├── infrastructure/      ← 技術的な実装（差し替え可能）
│   ├── database/        ← Repository の具象クラス（Prisma）
│   └── middleware/      ← CORS、ロガー、エラーハンドラ
│
└── presentation/        ← HTTP の入出力（Hono ルート）
    └── routes/          ← エンドポイント定義
```

**依存の方向**: `Presentation → Application → Domain ← Infrastructure`

Domain 層は **何にも依存しない** のがポイントです。Infrastructure 層が Domain 層の Repository インターフェースを実装することで、**依存性逆転の原則（DIP）** を実現しています。

## ポリレポ vs モノレポ

このチュートリアルは **ポリレポ**（FE と BE が別リポジトリ）構成です。

| | ポリレポ | モノレポ |
|---|---------|---------|
| **リポジトリ** | FE/BE で別々 | 1 つのリポジトリに共存 |
| **型の共有** | 手動で同期 or npm パッケージ化 | 直接 import 可能 |
| **CI/CD** | リポジトリ単位で独立 | Turborepo 等で最適化 |
| **チーム分担** | FE/BE チームの完全独立が容易 | モジュール境界の設計が必要 |
| **デプロイ** | 個別デプロイが自然 | 影響範囲の判定が必要 |

### このチュートリアルでの型共有

ポリレポでは、FE と BE で型を直接共有できません。このリポジトリでは以下のアプローチをとっています：

1. バックエンドの `src/application/dto/` に API の型を定義
2. フロントエンドの `src/types/api.ts` に同じ型を手動で複製

実務では、以下のような方法で型の同期を自動化できます：

- **OpenAPI / Swagger** で API スキーマを定義し、型を自動生成
- **共有 npm パッケージ** として型定義を切り出す
- **tRPC** で型安全な API 通信を実現（ただしモノレポ向き）

## 次のステップ

- 認証機能の追加（JWT / セッション）
- バリデーションの強化（Zod）
- テストの追加（Vitest）
- OpenAPI ドキュメントの自動生成
- CI/CD パイプラインの構築
- クラウドへのデプロイ（Fly.io / Railway）

## ライセンス

MIT
