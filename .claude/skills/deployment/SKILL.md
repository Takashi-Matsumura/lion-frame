---
name: Docker本番環境デプロイ
description: Docker Composeでの本番デプロイ、PostgreSQL設定、LDAP認証設定。本番環境構築、デプロイ作業時に使用。
---

# Docker本番環境デプロイガイド

## 前提条件

- Docker / Docker Compose がインストール済み
- Node.js 20+ がインストール済み
- ソースコードがクローン済み

## 開発環境

### コンテナ構成

```yaml
services:
  postgres:        # PostgreSQL 16 (port: 5433)
  openldap:        # OpenLDAP 1.5 (port: 390)
  airag-backend:   # RAG Backend  (port: 8000)
```

### セットアップ

```bash
# 全コンテナ起動
docker compose up -d

# PostgreSQLのみ起動
docker compose up -d postgres

# 環境変数を設定
cp .env.example .env
# AUTH_SECRETを生成して .env に記入
openssl rand -base64 48

# データベースを初期化
npx prisma db push
npm run db:seed

# 開発サーバ起動
npm run dev
```

### 環境変数（.env）

```env
# 必須
AUTH_SECRET=<openssl rand -base64 48 で生成>
AUTH_URL=http://localhost:3000
DATABASE_URL="postgresql://lionframe:lionframe@localhost:5433/lionframe?schema=public"
NEXT_PUBLIC_APP_NAME="LionFrame"

# OAuth（オプション - 管理画面で有効化）
GOOGLE_CLIENT_ID=<Google OAuthクライアントID>
GOOGLE_CLIENT_SECRET=<Google OAuthクライアントシークレット>
GITHUB_CLIENT_ID=<GitHub OAuthクライアントID>
GITHUB_CLIENT_SECRET=<GitHub OAuthクライアントシークレット>
```

## 本番環境デプロイ

### 1. 環境変数の設定

```env
# .env（本番用）
AUTH_SECRET=<openssl rand -base64 48 で生成>
AUTH_URL=https://<本番ドメイン>
DATABASE_URL="postgresql://<user>:<password>@<host>:5432/<dbname>?schema=public"
NEXT_PUBLIC_APP_NAME="LionFrame"
```

### 2. 本番イメージのビルドと起動

```bash
# ビルド
docker compose -f docker-compose.prod.yml build

# 起動
docker compose -f docker-compose.prod.yml up -d

# 状態確認
docker compose -f docker-compose.prod.yml ps
```

### 3. OpenLDAP設定

OpenLDAPの設定は管理画面から行います：

1. **管理画面へアクセス**: `https://<本番ドメイン>/admin?tab=modules`
2. OpenLDAPモジュールを選択
3. **設定項目**:
   - サーバURL（例: `ldap://ldap.example.com:389`）
   - ベースDN（例: `ou=Users,dc=example,dc=com`）
   - バインドDN・パスワード（オプション）
   - 有効/無効トグル

設定はデータベースに保存され、環境変数を使わずに本番環境で変更可能です。

### 4. ヘルスチェック

```bash
# HTTP応答確認
curl -I https://<本番ドメイン>/

# ログ確認
docker compose -f docker-compose.prod.yml logs nextjs | tail -60
```

確認メッセージ：
- "All migrations have been successfully applied."
- "Database seeded successfully!"
- "Ready in XXms"

## 運用コマンド

```bash
# ログ確認（リアルタイム）
docker compose -f docker-compose.prod.yml logs -f nextjs

# 再起動
docker compose -f docker-compose.prod.yml restart

# 停止
docker compose -f docker-compose.prod.yml down

# Prisma Studio（本番DB確認）
docker exec -it <container-name> npx prisma studio
```

## データベース

| 環境 | ポート | 接続先 |
|-----|--------|-------|
| 開発 | 5433 (ホスト→5432) | localhost:5433 (Docker) |
| 本番 | 5432 (内部) | postgres:5432 (Docker内部) |

### 開発環境セットアップ

```bash
docker compose up -d postgres
npx prisma db push
npm run db:seed
```

### マイグレーション

```bash
# スキーマ変更をDBに反映（開発）
npx prisma db push

# マイグレーションファイル作成（本番推奨）
npx prisma migrate dev --name <migration_name>

# 本番適用
npx prisma migrate deploy
```

## トラブルシューティング

### OpenLDAP認証が動かない

1. **管理画面で設定確認**: `/admin?tab=modules` → OpenLDAP
   - サーバURLが正しいか確認
   - 「接続テスト」ボタンで接続確認
   - 有効/無効トグルがONになっているか確認

2. **ログ確認**:
```bash
docker compose logs nextjs | grep -i ldap
```

### PostgreSQL接続できない

```bash
# ログ確認
docker compose logs postgres

# コンテナ再起動
docker compose restart postgres

# ヘルスチェック
docker exec lionframe-postgres pg_isready -U lionframe
```

### ポート競合

```bash
# 使用中のポートを確認
lsof -i :5433  # PostgreSQL
lsof -i :390   # OpenLDAP
lsof -i :8000  # RAG Backend
lsof -i :3000  # Next.js開発サーバ
```

## 初期ログイン

| 項目 | 値 |
|-----|-----|
| URL | http://localhost:3000 |
| ユーザ名 | admin |
| パスワード | admin |

**重要**: 本番環境では初回ログイン後にパスワードを変更してください。

## チェックリスト

本番デプロイ時:

- [ ] `.env` に本番用の `AUTH_SECRET` を生成・設定
- [ ] `AUTH_URL` を本番ドメインに変更
- [ ] `DATABASE_URL` を本番DBに変更
- [ ] OAuth設定が必要な場合はクライアントID/シークレットを設定
- [ ] `docker compose -f docker-compose.prod.yml up -d` で起動
- [ ] ヘルスチェックで正常動作を確認
- [ ] 管理画面でOpenLDAP設定を確認（必要な場合）
- [ ] 初期パスワードを変更
- [ ] HTTPS/TLSが有効になっているか確認
