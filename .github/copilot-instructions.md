# Copilot Instructions for Simple BBS Project

このドキュメントは、GitHub Copilotを使用してSimple BBSプロジェクトを構築した際の手順と重要なポイントをまとめたものです。

## プロジェクト概要

Cloudflare Workers + D1 + KV + Pagesで構築された匿名掲示板システム

## 構築手順

### 1. 設計ドキュメントの確認

`DESIGN.md`と`moderation-rules.md`を確認し、以下の要件を把握：
- Cloudflare無料枠内での動作
- コメント投稿・閲覧機能
- Gemini APIによる3段階コンテンツモデレーション
- レート制限（1分に1回）
- XSS対策
- KVキャッシュによるD1読み込み削減
- 週次自動クリーンアップ

### 2. プロジェクト構造の作成

```
simple-bbs-copilot/
├── src/
│   └── index.ts          # Workers API (TypeScript)
├── public/
│   ├── index.html        # フロントエンド
│   ├── style.css         # レスポンシブデザイン
│   └── script.js         # クライアントロジック
├── schema.sql            # D1スキーマ
├── wrangler.toml         # Workers設定
├── wrangler.production.toml  # 本番環境設定
├── package.json
├── tsconfig.json
└── .gitignore
```

### 3. 重要な実装ポイント

#### バックエンド (src/index.ts)

**API設計:**
- `GET /api/comments` - コメント一覧取得
- `POST /api/comments` - コメント投稿

**セキュリティ実装:**
```typescript
// IPアドレスのハッシュ化
async function hashIP(ip: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(ip);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// HTMLエスケープ
function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}
```

**Gemini APIモデレーション:**
- レベル1: 問題なし → そのまま投稿
- レベル2: 軽度の不適切表現 → `*****`で表示
- レベル3: 重度の不適切表現・個人情報 → 投稿拒否

**キャッシュ戦略:**
- KVキャッシュをまず確認
- キャッシュミスならD1から取得してKVに保存
- TTL: 300秒（5分）
- 投稿時にキャッシュを削除

**レート制限:**
- KVにIPハッシュをキーとして保存
- TTL: 60秒
- 存在チェックで投稿制限

#### フロントエンド

**主要機能:**
- 文字数カウンター（100文字制限）
- 非同期コメント投稿
- 30秒ごとの自動更新
- 相対時間表示（n分前、n時間前など）
- 伏字コメントのクリック表示

**レスポンシブデザイン:**
- モバイルファーストアプローチ
- グラデーション背景
- ホバーエフェクト
- メディアクエリで768px以下をモバイル対応

### 4. Cloudflare設定

#### wrangler.toml

```toml
name = "simple-bbs-copilot"
main = "src/index.ts"
compatibility_date = "2024-01-01"

# D1 Database
[[d1_databases]]
binding = "DB"
database_name = "simple-bbs-copilot-db"
database_id = "your-database-id"

# KV Namespaces (2つ必要)
[[kv_namespaces]]
binding = "CACHE_KV"
id = "your-cache-kv-id"
preview_id = "your-cache-kv-preview-id"

[[kv_namespaces]]
binding = "RATE_LIMIT_KV"
id = "your-rate-limit-kv-id"
preview_id = "your-rate-limit-kv-preview-id"

# Cron Triggers
[triggers]
crons = ["0 0 * * SUN"]  # 毎週日曜日0時（UTC）
```

**重要: Cron設定の注意点**
- ❌ `0 0 * * 0` （数字形式）は使えない
- ✅ `0 0 * * SUN` （文字列形式）を使用

#### D1スキーマ

```sql
CREATE TABLE IF NOT EXISTS comments (
  id TEXT PRIMARY KEY,
  message TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  ip_hash TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_created_at ON comments(created_at DESC);
```

### 5. マルチアカウント対応

別のCloudflareアカウントへのデプロイをサポート：

**方法1: アカウント切り替え**
```bash
npx wrangler logout
npx wrangler login
npm run deploy
```

**方法2: 設定ファイル分離（推奨）**
- `wrangler.production.toml`を作成
- `account_id`を指定
- `npm run deploy:production`でデプロイ

**注意点:**
- `wrangler.production.toml`は`.gitignore`に追加
- 各環境で独立したリソースIDを使用

### 6. 依存関係

```json
{
  "devDependencies": {
    "@cloudflare/workers-types": "^4.20231218.0",
    "wrangler": "^3.22.1"
  },
  "dependencies": {
    "@google/generative-ai": "^0.1.3"
  }
}
```

### 7. デプロイ手順

```bash
# 1. 依存関係インストール
npm install

# 2. D1データベース作成
npx wrangler d1 create simple-bbs-copilot-db

# 3. テーブル作成
npx wrangler d1 execute simple-bbs-copilot-db --file=./schema.sql

# 4. KV作成
npx wrangler kv:namespace create CACHE_KV
npx wrangler kv:namespace create CACHE_KV --preview
npx wrangler kv:namespace create RATE_LIMIT_KV
npx wrangler kv:namespace create RATE_LIMIT_KV --preview

# 5. wrangler.tomlを更新（IDを設定）

# 6. Secretsを設定
npx wrangler secret put GEMINI_API_KEY

# 7. デプロイ
npm run deploy
```

## トラブルシューティング

### Cronエラー: "invalid cron string"
- 曜日は文字列形式（SUN, MON, etc.）を使用
- 数字形式（0-6）は使用不可

### KV名前空間の区別
- プロジェクト名をプレフィックスとして使用
- 本番環境とプレビュー環境で異なるIDを使用

### マルチアカウントデプロイ
- `DEPLOY_MULTI_ACCOUNT.md`を参照
- 設定ファイル分離が推奨

## ベストプラクティス

1. **セキュリティ**
   - すべてのユーザー入力をエスケープ
   - IPアドレスはハッシュ化して保存
   - レート制限を実装

2. **パフォーマンス**
   - KVキャッシュを活用してD1アクセスを最小化
   - インデックスを適切に設定

3. **コスト最適化**
   - 無料枠内で動作するよう設計
   - 古いデータを定期的にクリーンアップ
   - コメント数を100件に制限

4. **開発フロー**
   - ローカル開発: `npm run dev`
   - 本番デプロイ: `npm run deploy:production`
   - 設定ファイルを環境ごとに分離

## リソース

- [Cloudflare Workers Docs](https://developers.cloudflare.com/workers/)
- [D1 Database Docs](https://developers.cloudflare.com/d1/)
- [Workers KV Docs](https://developers.cloudflare.com/kv/)
- [Cron Triggers Docs](https://developers.cloudflare.com/workers/configuration/cron-triggers/)
- [Google Generative AI SDK](https://ai.google.dev/)

## GitHub操作のガイドライン

### コミットメッセージ

**形式:**
```
[Copilot] <日本語の説明>
```

**例:**
```bash
git commit -m "[Copilot] Cloudflare Workers APIの実装を追加"
git commit -m "[Copilot] レスポンシブデザインのCSSを修正"
git commit -m "[Copilot] Cron設定のエラーを修正（SUN形式に変更）"
git commit -m "[Copilot] マルチアカウント対応のドキュメントを追加"
```

### プルリクエスト

**タイトル形式:**
```
[Copilot] <日本語の機能説明>
```

**説明文テンプレート:**
```markdown
## 概要
GitHub Copilotによる実装です。

## 変更内容
- 変更点1
- 変更点2
- 変更点3

## テスト
- [ ] ローカルでの動作確認
- [ ] デプロイテスト

## 関連Issue
Closes #<issue番号>
```

**例:**
```markdown
タイトル: [Copilot] Simple BBS掲示板システムの実装

## 概要
GitHub Copilotを使用してCloudflare Workers + D1 + KV + Pagesで
匿名掲示板システムを構築しました。

## 変更内容
- Workers APIの実装（コメント取得・投稿）
- Gemini APIによるコンテンツモデレーション
- レスポンシブなフロントエンド実装
- D1スキーマとKV設定
- マルチアカウント対応

## 実装機能
- ✅ コメント投稿・閲覧
- ✅ レート制限（1分に1回）
- ✅ XSS対策
- ✅ AIモデレーション（3段階判定）
- ✅ 週次自動クリーンアップ

## テスト
- [x] ローカルでの動作確認
- [ ] 本番環境へのデプロイ
```

### ブランチ命名

**形式:**
```
copilot/<機能名>
```

**例:**
```bash
copilot/init-project
copilot/add-moderation
copilot/fix-cron-config
copilot/multi-account-support
```

### Issueコメント

**形式:**
```markdown
## [Copilot回答]

<日本語での説明>
```

**例:**
```markdown
## [Copilot回答]

Cronエラーの原因は曜日指定の形式でした。
Cloudflare Workersでは数字形式（`0-6`）ではなく、
文字列形式（`SUN`, `MON`等）を使用する必要があります。

修正内容:
- `0 0 * * 0` → `0 0 * * SUN`

修正PRを作成しました。
```

## GitHub 認証設定

**このリポジトリでは `.copilot-profile` に記載されているGitHubプロファイルを使用してください。**

### 設定手順

1. `.copilot-profile` ファイルからプロファイル名を読み取る
2. GitHub CLI認証: `gh auth switch -u $(cat .copilot-profile)`
3. Git設定（このリポジトリのみ）:
   ```bash
   PROFILE=$(cat .copilot-profile)
   git config user.name "$PROFILE"
   git config user.email "$PROFILE@users.noreply.github.com"
   ```
4. リモートURL: HTTPS形式を使用

### 操作前の確認

- コミット、プッシュ、PR作成などのGitHub操作を行う前に、必ず `.copilot-profile` のプロファイルに切り替わっているか確認
- SSH接続ではなくHTTPS接続を使用すること

### 初回セットアップ

`.copilot-profile` ファイルを作成し、使用するGitHubプロファイル名を記載してください（このファイルは `.gitignore` に追加されています）:
```bash
echo "your-github-username" > .copilot-profile
```


## まとめ

このプロジェクトは以下を実現しています：
- ✅ Cloudflare無料枠内での動作
- ✅ セキュアな匿名掲示板
- ✅ AIによるコンテンツモデレーション
- ✅ レスポンシブデザイン
- ✅ マルチアカウント対応
- ✅ 自動メンテナンス機能

設計ドキュメントを基にした段階的な実装により、堅牢でスケーラブルなアプリケーションを構築できました。

---

**注意:** GitHub操作を行う際は、必ず日本語で記述し、`[Copilot]`プレフィックスを付けることで、
Copilotによる変更であることを明確にしてください。
