# Simple BBS Walkthrough

Simple BBSの実装が完了しました。
Cloudflare Workers, D1, KV, Pages (Assets) を使用した、匿名掲示板システムです。

## 実装内容

### バックエンド (Workers)
- **GET /api/comments**: コメント一覧を取得します。KVキャッシュを利用して高速化し、キャッシュミス時にD1から取得します。
- **POST /api/comments**: 新しいコメントを投稿します。
    - **レート制限**: 同一IPからの投稿を1分間に1回に制限しています。
    - **コンテンツモデレーション**: Gemini APIを使用して投稿内容を判定します。
        - 環境変数 `GEMINI_MODEL` でモデルを指定可能（デフォルト: `gemini-pro`）。
        - APIエラー時（モデル使用不可など）は投稿を拒否しエラーを返します。
        - Level 3 (危険): 投稿を拒否します。
        - Level 2 (不適切): 投稿を受け付けますが、フロントエンドで「***** (Click to view)」のように隠して表示します。
- **Cron Trigger**: 毎週日曜日に古いコメントを削除し、最新100件のみを保持します。

### フロントエンド
- **index.html**: `main.drawio.svg` に基づくデザイン（入力欄とボタンの横並び配置など）。日本語対応済み。
- **style.css**: ダークモードベース。デザインに合わせたレイアウト調整。
- **script.js**: 日時フォーマットを `(YYYY-MM-DD HH:mm)` に変更。エラーメッセージ等の日本語化済み。

## 検証結果

### API動作確認
- `GET /api/comments`: 正常にJSONを返却することを確認しました。
- `POST /api/comments`: 投稿が成功し、D1に保存されることを確認しました。
- **レート制限**: 連続して投稿した場合に `429 Rate limit exceeded` が返ることを確認しました。

### フロントエンド動作確認
- `http://localhost:8787/` にアクセスし、UIが表示されることを確認しました。
- APIとの連携が正常に行われていることを確認しました。

## 次のステップ

1. **Gemini APIキーの設定**:
   本番環境またはローカルでモデレーション機能を有効にするには、Gemini APIキーが必要です。
   ```bash
   npx wrangler secret put GEMINI_API_KEY
   ```
   ローカル開発の場合は `.dev.vars` ファイルを作成し、`GEMINI_API_KEY=your_key` を記述してください。

2. **デプロイ**:
   以下のコマンドでCloudflareにデプロイできます。
   ```bash
   npm run deploy
   ```
