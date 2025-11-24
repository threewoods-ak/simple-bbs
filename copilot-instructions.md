# Project Instructions (Simple BBS)

このプロジェクトにおけるAIアシスタントへの指示書です。
開発を行う際は、以下のルールと文脈を遵守してください。

## 1. 基本方針
- **言語**: やり取り、コード内のコメント、コミットメッセージ、UIテキストは全て**日本語**で行うこと。
- **シンプルさ**: "Simple BBS" の名の通り、過度な抽象化や複雑なフレームワークの導入は避け、標準的なWeb技術（Vanilla JS/CSS）とCloudflare Workersの機能を活用すること。

## 2. 技術スタック
- **Runtime**: Cloudflare Workers
- **Framework**: Hono (軽量Webフレームワーク)
- **Database**: Cloudflare D1 (SQLite)
- **KVS**: Cloudflare KV (キャッシュ、レート制限用)
- **Frontend**: HTML5, CSS3, Vanilla JavaScript (Pages Asset Modeで配信)
- **AI**: Google Gemini API (コンテンツモデレーション)

## 3. 実装ルール

### バックエンド (Workers)
- **エラーハンドリング**: ユーザーに対して親切な**日本語のエラーメッセージ**を返すこと。
    - 例: "Rate limit exceeded" ではなく "投稿頻度が高すぎます。1分待ってから再度お試しください。"
- **環境変数**: 設定値（APIキー、モデル名など）はハードコードせず、`wrangler.toml` の `[vars]` や `.dev.vars` で管理すること。
- **モデレーション**:
    - 投稿内容は必ずGemini APIでチェックする。
    - ルールは `moderation-rules.md` から読み込む（`wrangler.toml` の `rules` 設定でテキストとしてインポート）。
    - APIエラー時やモデルが使用不可の場合は、安全側に倒して**投稿を拒否**し、エラーメッセージを表示すること。

### フロントエンド
- **デザイン**: 提供されたデザインファイル（例: `main.drawio.svg`）がある場合は、レイアウトや配置を忠実に再現すること。
- **UI/UX**:
    - ダークモードを基調としたモダンなデザイン。
    - 日時表示は `YYYY-MM-DD HH:mm` 形式（日本時間）とする。
    - 読み込み中や処理中の状態をユーザーに明示すること。

## 4. 開発フロー
- **ローカル検証**: `npx wrangler dev` を使用してローカルで動作確認を行うこと。
- **DB変更**: スキーマ変更が必要な場合は `schema.sql` を更新し、ローカルD1データベースに適用して検証すること。

## 5. ファイル構成
- `src/index.js`: バックエンドロジック（Honoアプリケーション）
- `public/`: 静的アセット（HTML, CSS, JS）
- `schema.sql`: データベーススキーマ
- `moderation-rules.md`: モデレーションのプロンプト・ルール定義
- `wrangler.toml`: Workers設定
