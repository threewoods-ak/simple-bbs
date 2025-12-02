# 別のCloudflareアカウントへのデプロイ手順

## 方法1: アカウントを切り替える（推奨）

### 1. 現在のログイン状態を確認

```bash
npx wrangler whoami
```

### 2. 別のアカウントでログインし直す

```bash
# 現在のセッションからログアウト
npx wrangler logout

# 新しいアカウントでログイン
npx wrangler login
```

ブラウザが開くので、デプロイ先のCloudflareアカウントでログインしてください。

### 3. 通常通りデプロイ

```bash
# D1データベース作成
npx wrangler d1 create simple-bbs-copilot-db

# KV作成
npx wrangler kv:namespace create CACHE_KV
npx wrangler kv:namespace create CACHE_KV --preview
npx wrangler kv:namespace create RATE_LIMIT_KV
npx wrangler kv:namespace create RATE_LIMIT_KV --preview

# wrangler.tomlを更新後、デプロイ
npm run deploy
```

---

## 方法2: 環境変数でアカウントIDを指定

### 1. デプロイ先のアカウントIDを確認

Cloudflare Dashboardにログインし、URLから確認できます:
```
https://dash.cloudflare.com/<ACCOUNT_ID>/workers
```

### 2. wrangler.tomlにaccount_idを追加

```toml
name = "simple-bbs-copilot"
main = "src/index.ts"
compatibility_date = "2024-01-01"
account_id = "your-account-id-here"  # ← 追加
```

### 3. デプロイ

```bash
npx wrangler deploy
```

---

## 方法3: 別の設定ファイルを使用

### 1. 別アカウント用の設定ファイルを作成

`wrangler.production.toml` を作成:

```toml
name = "simple-bbs-copilot"
main = "src/index.ts"
compatibility_date = "2024-01-01"
account_id = "production-account-id"

[[d1_databases]]
binding = "DB"
database_name = "simple-bbs-copilot-db"
database_id = "production-database-id"

[[kv_namespaces]]
binding = "CACHE_KV"
id = "production-cache-kv-id"
preview_id = "production-cache-kv-preview-id"

[[kv_namespaces]]
binding = "RATE_LIMIT_KV"
id = "production-rate-limit-kv-id"
preview_id = "production-rate-limit-kv-preview-id"
```

### 2. 指定した設定ファイルでデプロイ

```bash
npx wrangler deploy --config wrangler.production.toml
```

### 3. package.jsonにスクリプトを追加すると便利

```json
{
  "scripts": {
    "deploy": "wrangler deploy",
    "deploy:production": "wrangler deploy --config wrangler.production.toml"
  }
}
```

---

## 方法4: Wrangler環境変数を使用

### 1. 環境変数を設定

```bash
# Linux/Mac
export CLOUDFLARE_ACCOUNT_ID="your-account-id"
export CLOUDFLARE_API_TOKEN="your-api-token"

# Windows (PowerShell)
$env:CLOUDFLARE_ACCOUNT_ID="your-account-id"
$env:CLOUDFLARE_API_TOKEN="your-api-token"

# Windows (CMD)
set CLOUDFLARE_ACCOUNT_ID=your-account-id
set CLOUDFLARE_API_TOKEN=your-api-token
```

### 2. APIトークンの作成

Cloudflare Dashboard → My Profile → API Tokens → Create Token

必要な権限:
- Account Settings: Read
- Workers Scripts: Edit
- Workers KV Storage: Edit
- D1: Edit

### 3. デプロイ

```bash
npx wrangler deploy
```

---

## おすすめの方法

開発環境と本番環境でアカウントを分ける場合:

1. **ローカル開発**: デフォルトの`wrangler.toml`を使用
2. **本番デプロイ**: `wrangler.production.toml`を使用し、CIで`--config`オプションを指定

```bash
# 開発環境（自分のアカウント）
npm run dev

# 本番環境（別のアカウント）
npm run deploy:production
```

この方法なら、誤って本番環境を操作するリスクを減らせます。
