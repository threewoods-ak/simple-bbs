#!/bin/bash
set -e

echo "🚀 Simple BBS Deployment Script"
echo "================================"

# .dev.varsから環境変数を読み込む
if [ -f .dev.vars ]; then
    echo "📄 Loading environment variables from .dev.vars..."
    set -a
    source .dev.vars
    set +a
    echo "✓ Environment variables loaded"
fi

# 環境変数のチェック
if [ -z "$CLOUDFLARE_API_TOKEN" ] || [ -z "$CLOUDFLARE_ACCOUNT_ID" ]; then
    echo "❌ Error: CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID must be set"
    echo "Please set them in .dev.vars or as environment variables"
    exit 1
fi

echo "✓ Environment variables verified"

# D1データベースの作成
echo ""
echo "📦 Creating D1 database..."
DB_OUTPUT=$(npx wrangler d1 create simple-bbs-antigravity-db 2>&1 || true)
if echo "$DB_OUTPUT" | grep -q "database_id"; then
    DB_ID=$(echo "$DB_OUTPUT" | grep "database_id" | awk -F'"' '{print $2}')
    echo "✓ D1 database created: $DB_ID"
    echo "⚠️  Please update wrangler.toml with this database_id"
elif echo "$DB_OUTPUT" | grep -q "already exists"; then
    echo "✓ D1 database already exists"
else
    echo "ℹ️  D1 database status: $DB_OUTPUT"
fi

# KV Namespaceの作成
echo ""
echo "📦 Creating KV Namespace..."
KV_OUTPUT=$(npx wrangler kv:namespace create "simple-bbs-antigravity-kv" 2>&1 || true)
if echo "$KV_OUTPUT" | grep -q "id ="; then
    KV_ID=$(echo "$KV_OUTPUT" | grep "id =" | awk -F'"' '{print $2}')
    echo "✓ KV Namespace created: $KV_ID"
    echo "⚠️  Please update wrangler.toml with this id"
elif echo "$KV_OUTPUT" | grep -q "already exists"; then
    echo "✓ KV Namespace already exists"
else
    echo "ℹ️  KV Namespace status: $KV_OUTPUT"
fi

# スキーマの適用
echo ""
echo "📝 Applying database schema..."
if npx wrangler d1 execute simple-bbs-antigravity-db --file=./schema.sql; then
    echo "✓ Database schema applied"
else
    echo "⚠️  Schema application failed (may already be applied)"
fi

# Secretsの設定
echo ""
echo "🔐 Setting up secrets..."
echo "Please enter your GEMINI_API_KEY when prompted:"
npx wrangler secret put GEMINI_API_KEY

echo ""
echo "Do you want to set GEMINI_MODEL? (y/n)"
read -r response
if [ "$response" = "y" ] || [ "$response" = "Y" ]; then
    echo "Please enter your GEMINI_MODEL (e.g., gemini-1.5-flash):"
    npx wrangler secret put GEMINI_MODEL
fi

# デプロイ
echo ""
echo "🚀 Deploying to Cloudflare..."
npx wrangler deploy

echo ""
echo "✅ Deployment complete!"
echo "Your application should be available at your workers.dev subdomain"
