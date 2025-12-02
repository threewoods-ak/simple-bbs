# Simple BBS

Cloudflare Workers + D1 + KV + Pagesで構築された匿名掲示板システム

## 📋 概要

Simple BBSは一言コメントを投稿できる匿名の掲示板システムです。Cloudflareの無料枠内で動作するように設計されています。

## ✨ 主な機能

- コメントの閲覧・投稿
- スマホ・PC対応のレスポンシブデザイン
- Gemini APIによる自動モデレーション
- レート制限（同一IPから1分に1回まで）
- XSS対策（HTMLタグのエスケープ）

## 🚀 セットアップ

> **別のCloudflareアカウントにデプロイする場合**: [DEPLOY_MULTI_ACCOUNT.md](./DEPLOY_MULTI_ACCOUNT.md)を参照してください。

### 1. 依存関係のインストール

```bash
npm install
```

### 2. Cloudflare D1データベースの作成

```bash
npx wrangler d1 create simple-bbs-copilot-db
```

実行後、表示される`database_id`をコピーして`wrangler.toml`の`database_id`に設定してください。

### 3. データベーステーブルの作成

```bash
npx wrangler d1 execute simple-bbs-copilot-db --file=./schema.sql
```

### 4. KV Namespaceの作成

```bash
# キャッシュ用
npx wrangler kv:namespace create CACHE_KV --preview
# 表示されたidを wrangler.toml の CACHE_KV の id と preview_id に設定

# レート制限用
npx wrangler kv:namespace create RATE_LIMIT_KV --preview
# 表示されたidを wrangler.toml の RATE_LIMIT_KV の id と preview_id に設定
```

または、個別に作成する場合:

```bash
# 本番環境用
npx wrangler kv:namespace create CACHE_KV
npx wrangler kv:namespace create RATE_LIMIT_KV

# プレビュー環境用
npx wrangler kv:namespace create CACHE_KV --preview
npx wrangler kv:namespace create RATE_LIMIT_KV --preview
```

実行後、表示される`id`をコピーして`wrangler.toml`の対応する`id`と`preview_id`に設定してください。

### 5. Gemini API Keyの設定

```bash
npx wrangler secret put GEMINI_API_KEY
```

プロンプトが表示されたら、Google AI StudioでGemini APIキーを取得して入力してください。
https://ai.google.dev/

### 6. ローカル開発

```bash
npm run dev
```

ブラウザで http://localhost:8787 にアクセスしてください。

### 7. デプロイ

#### Workers（API）のデプロイ

```bash
npm run deploy
```

#### Pages（フロントエンド）のデプロイ

```bash
npm run pages:deploy
```

または、Cloudflare Dashboardから`public`ディレクトリをPagesプロジェクトとして連携してください。

## 🏗️ プロジェクト構造

```
simple-bbs-copilot/
├── src/
│   └── index.ts          # Workers API
├── public/
│   ├── index.html        # フロントエンド HTML
│   ├── style.css         # スタイルシート
│   └── script.js         # フロントエンド JavaScript
├── schema.sql            # D1データベーススキーマ
├── wrangler.toml         # Cloudflare Workers設定
├── package.json
├── DESIGN.md            # 設計ドキュメント
└── moderation-rules.md  # モデレーションルール
```

## 🔧 API仕様

### GET /api/comments

コメント一覧を取得（最新100件）

**レスポンス:**

```json
[
  {
    "id": "uuid",
    "message": "コメント本文",
    "created_at": 1234567890,
    "is_hidden": false
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
  "message": "コメント本文"
}
```

## 🛡️ セキュリティ機能

- **レート制限**: 同一IPから1分に1回まで投稿可能
- **文字数制限**: 100文字まで
- **XSS対策**: HTMLタグを自動エスケープ
- **コンテンツモデレーション**: Gemini APIによる3段階判定
  - レベル1: 問題なし → 投稿可能
  - レベル2: 軽度の不適切表現 → 投稿可能（伏字表示）
  - レベル3: 重度の不適切表現・個人情報 → 投稿拒否

## 🔄 自動メンテナンス

毎週日曜日0時（UTC）に自動的に古いコメントを削除し、100件以内に保ちます（Workers Cron Triggers使用）。

## 📝 ライセンス

MIT

## 🤝 コントリビューション

Issues、Pull Requestsは大歓迎です！
