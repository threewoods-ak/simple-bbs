# Simple BBS

Cloudflare Workers、D1、KVを使用したシンプルでセキュアな匿名掲示板システムです。
Google Gemini APIを活用したコンテンツモデレーション機能を備えています。

## 特徴

- **匿名投稿**: ユーザー登録不要で手軽に投稿できます。
- **AIモデレーション**: Gemini APIにより、不適切な投稿を自動的にフィルタリングまたは非表示にします。
- **レート制限**: IPアドレスベースのレート制限により、スパム投稿を防止します。
- **自動クリーンアップ**: Cron Triggerにより、古い投稿を定期的に削除し、常に最新の100件のみを保持します。
- **レスポンシブデザイン**: PC、タブレット、スマートフォンに対応したモダンなUI。
- **日本語対応**: UIおよびエラーメッセージは完全日本語対応。

## 技術スタック

- **Runtime**: [Cloudflare Workers](https://workers.cloudflare.com/)
- **Framework**: [Hono](https://hono.dev/)
- **Database**: [Cloudflare D1](https://developers.cloudflare.com/d1/) (SQLite)
- **KVS**: [Cloudflare KV](https://developers.cloudflare.com/kv/) (Cache & Rate Limiting)
- **AI**: [Google Gemini API](https://ai.google.dev/)
- **Frontend**: HTML5, CSS3, Vanilla JavaScript

## セットアップ

### 前提条件

- Node.js (v16以上)
- Cloudflareアカウント
- Google AI Studio API Key (Gemini API用)

### インストール

```bash
npm install
```

### ローカル開発

1. **環境変数の設定**:
   `.dev.vars` ファイルを作成し、Gemini APIキーを設定します。

   ```bash
   echo "GEMINI_API_KEY=your_api_key_here" > .dev.vars
   ```

2. **データベースのセットアップ**:
   ローカルD1データベースを作成し、スキーマを適用します。

   ```bash
   npx wrangler d1 execute simple-bbs-db --local --file=./schema.sql
   ```

3. **開発サーバーの起動**:

   ```bash
   npm run dev
   ```

   ブラウザで `http://localhost:8787` にアクセスします。

## デプロイ

1. **Cloudflareリソースの作成**:
   KV NamespaceとD1 Databaseを作成し、`wrangler.toml` のIDを更新してください。

   ```bash
   npx wrangler kv:namespace create "KV"
   npx wrangler d1 create simple-bbs-db
   ```

2. **本番環境へのスキーマ適用**:

   ```bash
   npx wrangler d1 execute simple-bbs-db --file=./schema.sql
   ```

3. **環境変数の設定 (Secrets)**:

   ```bash
   npx wrangler secret put GEMINI_API_KEY
   ```

4. **デプロイ**:

   ```bash
   npm run deploy
   ```

## ライセンス

MIT License
