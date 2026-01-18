# Simple BBS

Cloudflare Workers + D1 + KV + Pagesで構築された匿名掲示板システム

## 機能

- コメントの閲覧・投稿
- スマホ・PC対応のレスポンシブデザイン
- 荒らし防止機能（1分1回の投稿制限、100文字制限）
- Gemini APIによるコンテンツモデレーション
- XSS対策（HTMLエスケープ）

## セットアップ

### 1. 依存関係のインストール

```bash
npm install
```

### 2. Cloudflare Workers/D1/KVのセットアップ

#### D1データベースの作成

```bash
npx wrangler d1 create simple-bbs-db
```

作成されたデータベースIDを`wrangler.toml`の`database_id`に設定します。

#### データベーススキーマの適用

```bash
npx wrangler d1 execute simple-bbs-db --file=./schema/schema.sql
```

#### KV Namespaceの作成

```bash
# キャッシュ用
npx wrangler kv:namespace create "CACHE_KV"

# レート制限用
npx wrangler kv:namespace create "LIMIT_KV"
```

作成されたIDを`wrangler.toml`の対応する`id`に設定します。

### 3. 環境変数の設定

#### 開発環境

`.dev.vars`ファイルを作成してGemini APIキーを設定：

```
GEMINI_API_KEY=your-gemini-api-key-here
```

#### 本番環境

**GEMINI_API_KEY（Secret）**: 以下のコマンドで暗号化されたSecretとして設定：

```bash
npx wrangler secret put GEMINI_API_KEY
```

**GEMINI_MODEL（Plain text）**: `wrangler.toml`の`[vars]`セクションで設定されています。別のモデルを使用する場合は`wrangler.toml`を編集してください。

```toml
[vars]
GEMINI_MODEL = "gemini-2.5-flash"
```

> **重要**: APIキーなどの機密情報は必ずSecretとして設定し、`wrangler.toml`の`[vars]`には含めないでください。

### 4. 開発サーバーの起動

#### Workers（API）

```bash
npm run dev
```

#### Pages（フロントエンド）

別のターミナルで：

```bash
npm run pages:dev
```

または、Pagesから直接Workersにアクセスする場合は、Workersをデプロイしてから：

```bash
npx wrangler pages dev public
```

## デプロイ

### Workers（API）のデプロイ

```bash
npm run deploy
```

### Pages（フロントエンド）のデプロイ

```bash
npm run pages:deploy
```

または、Cloudflare Dashboardから直接リポジトリを接続してデプロイすることもできます。

## API仕様

### GET /api/comments

コメント一覧を取得（最新100件）

**レスポンス:**
```json
[
  {
    "id": "uuid",
    "message": "コメント本文",
    "created_at": 1234567890
  }
]
```

### POST /api/comments

新しいコメントを投稿

**リクエストボディ:**
```json
{
  "message": "コメント本文"
}
```

**レスポンス:**
```json
{
  "success": true,
  "id": "uuid",
  "level": 1
}
```

## コンテンツモデレーション

Gemini APIを使用した3段階判定:

- **レベル1**: 問題なし → 投稿可能
- **レベル2**: 軽度の不適切表現 → 投稿可能（伏せ字で表示）
- **レベル3**: 重度の不適切表現・個人情報 → 投稿拒否

詳細は[moderation-rules.md](./moderation-rules.md)を参照。

## プロジェクト構造

```
simple-bbs/
├── src/
│   ├── index.js          # Workers エントリーポイント
│   ├── handler.js        # リクエストハンドラー
│   ├── api.js           # API実装
│   ├── moderation.js    # モデレーション機能
│   ├── utils.js         # ユーティリティ
│   └── cron.js          # Cronジョブ
├── schema/
│   └── schema.sql       # データベーススキーマ
├── public/
│   ├── index.html       # フロントエンド HTML
│   ├── style.css        # スタイルシート
│   └── app.js           # フロントエンド JavaScript
├── wrangler.toml        # Workers設定
├── package.json
└── README.md
```

## ライセンス

MIT
