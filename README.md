# LionFrame

組織管理システムの最小構成フレームワーク。
認証・通知・監査ログなどのフレーム基盤の上に、モジュール形式で業務機能を追加できます。

## 主な機能

| 機能 | 説明 | 対象ユーザ |
|------|------|-----------|
| **組織図** | 部門・社員の階層表示・検索・社員詳細 | 全社員 |
| **組織データ管理** | CSV/Excelインポート・役職マスタ・履歴管理 | 管理者 |
| **生成AI連携** | AIチャット・翻訳・要約・データ抽出API | 全社員 / 全モジュール |
| **ダッシュボード** | ロール別ウェルカム画面（管理者はKPI・ヘルスチェック付き） | 全社員 |
| **利用状況トラッキング** | ページアクセス自動収集・DAU/WAU/MAU・機能別ランキング・部門別採用率・週次レポート通知 | 管理者 |
| **自動ヘルスチェック** | 管理者ダッシュボード表示時に自動診断・異常時は通知 | 管理者 |
| **通知センター** | セキュリティ・業務通知の一元管理 | 全社員 |
| **監査ログ** | 操作履歴の記録・閲覧 | 管理者 |
| **システム管理** | ユーザ管理・モジュール管理・アクセスキー | 管理者 |

## 技術スタック

| 技術 | バージョン |
|-----|-----------|
| Next.js | 15 (App Router) |
| React | 19 |
| TypeScript | 5 |
| Tailwind CSS | 4 |
| Prisma | 6 (PostgreSQL) |
| 認証 | NextAuth.js v5 |
| 状態管理 | Zustand |
| Linter | Biome 2 |
| テスト | Jest 30 |

## クイックスタート

### 必要条件

- Node.js 20+
- Docker / Docker Compose

### セットアップ

```bash
# 依存関係のインストール
npm install

# Dockerコンテナを起動（PostgreSQL）
docker compose up -d postgres

# 環境変数を設定
cp .env.example .env
# AUTH_SECRETを生成して .env に記入
openssl rand -base64 48

# データベースを初期化
npx prisma db push
npm run db:seed

# 開発サーバを起動
npm run dev
```

### 初期ログイン

| 項目 | 値 |
|-----|-----|
| URL | http://localhost:3000 |
| メール | admin@lionframe.local |
| パスワード | admin |

## アーキテクチャ

```
┌─────────────────────────────────────────────────────┐
│                  フレーム基盤                         │
│  認証 / 通知 / 監査ログ / i18n / Prisma / セキュリティ  │
└──────────────────────┬──────────────────────────────┘
                       │ 利用
┌──────────────────────┴──────────────────────────────┐
│              モジュール（コア + アドオン）               │
│  system / ai / organization / ...                   │
└─────────────────────────────────────────────────────┘
```

モジュールは**メニュー**（画面あり）と**サービス**（API/ロジックのみ）の2種類を持ちます。
コアモジュールはフレーム同梱、アドオンモジュールは `lib/addon-modules/` に追加します。

### コアモジュール

| モジュール | 説明 | 主なメニュー |
|-----------|------|------------|
| **system** | システム管理・ユーザ管理・自動ヘルスチェック・利用状況トラッキング | ダッシュボード（管理者専用）, システム環境 |
| **ai** | 生成AI（チャット・翻訳・要約・抽出） | AIチャット |
| **organization** | 組織図・社員管理・役職マスタ | 組織図, 組織データ管理 |
| **schedule** | カレンダーとスケジュール管理 | カレンダー, カレンダー管理 |

### サンプルアドオンモジュール

| モジュール | 説明 | 主なメニュー |
|-----------|------|------------|
| **workflow** | 申請・承認ワークフロー（UIモック） | 申請（ユーザ）, 承認（マネージャー） |
| **nfc-card** | NFCカード登録と社員証管理 | NFC登録（バックオフィス） |

アドオンモジュールは `lib/addon-modules/` に配置します。作成手順は [アドオンモジュールガイド](docs/ADDON_MODULE_GUIDE.md) を参照してください。

### キオスクモジュール

メインアプリとは独立した専用画面（`/kiosk/`）を提供するモジュールです。管理UIはメインアプリ内のバックオフィスセクションに配置されます。

| モジュール | 説明 | キオスク画面 | 管理メニュー |
|-----------|------|------------|------------|
| **event-attendance** | NFCカードによるイベント出欠管理 | `/kiosk/events/[token]` | キオスク管理（バックオフィス） |

キオスクモジュールは `lib/kiosk-modules/` に配置します。

### 外部アドオンモジュール

内部アドオンに加えて、独立した npm パッケージ（GitHub リポジトリ）として開発・配布する外部アドオンにも対応しています。

外部アドオンのサンプル実装:
- **[lionframe-addon-sample-hello](https://github.com/Takashi-Matsumura/lionframe-addon-sample-hello)** — 外部パッケージ連携のデモ用サンプルモジュール
- **[lionframe-module-types](https://github.com/Takashi-Matsumura/lionframe-module-types)** — 外部アドオン開発用の共有型定義

外部アドオンの仕組み:
1. `@lionframe/module-types` に依存してモジュール定義を作成（React/Prisma 非依存）
2. アイコンは SVG パス文字列で定義（`iconPath`）、フレームワーク側で ReactNode に変換
3. `apps/web/addons.ts` に登録 + プロキシページを作成するだけで統合完了

詳細は [モジュール作成ガイド](docs/MODULE_GUIDE.md) の「外部アドオンモジュール」セクションを参照してください。

### ロール階層

```
GUEST → USER → MANAGER → EXECUTIVE → ADMIN
```

| ロール | 表示セクション | 主な用途 |
|--------|-------------|---------|
| USER | ユーザ | 組織図、AIチャット |
| MANAGER | + マネージャー | 承認 |
| EXECUTIVE | + エグゼクティブ | 経営（将来拡張） |
| ADMIN | 全セクション | システム管理（専用ダッシュボード） |

### ディレクトリ構成

```
app/
├── (menus)/
│   ├── (user)/             # 組織図, AIチャット, ダッシュボード, 申請
│   ├── (manager)/          # マネージャー向け（承認）
│   └── (admin)/            # システム管理
├── admin/                  # 管理画面（システム環境, データ管理）
├── api/                    # REST API
└── login/

lib/
├── core-modules/           # system, ai, organization
├── addon-modules/          # 業務モジュール（workflow サンプル同梱）
├── modules/                # レジストリ, アクセス制御
├── services/               # 通知, 監査, 暗号化, レート制限
├── i18n/                   # 多言語対応（日英）
├── importers/              # データインポート
└── history/                # 履歴管理

components/
├── ui/                     # 共通UIコンポーネント（31個）
├── sidebar/                # サイドバーナビゲーション
└── notifications/          # 通知UI
```

## セキュリティ

| 機能 | 説明 |
|------|------|
| **資格情報認証** | メール/パスワードによるログイン |
| **OAuth** | Google / GitHub（管理画面で個別に有効化） |
| **二要素認証** | TOTP (Google Authenticator等) |
| **Cookie署名** | HMAC-SHA256によるタイミングセーフ検証 |
| **フィールド暗号化** | AES-256-GCMで機密データを暗号化 |
| **レート制限** | ログイン試行のスライディングウィンドウ制限 |
| **セキュリティヘッダー** | X-Content-Type-Options, X-Frame-Options, HSTS |

## Docker環境

```yaml
services:
  postgres:        # PostgreSQL 16 (port: 5433)
  airag-backend:   # RAG Backend  (port: 8000, オプション)
```

```bash
docker compose up -d postgres     # PostgreSQLのみ起動
docker compose up -d              # 全コンテナ起動
docker compose down               # 停止
```

## 開発コマンド

```bash
npm run dev           # 開発サーバ起動
npm run build         # 本番ビルド
npm run start         # 本番サーバ起動
npm run lint          # Biomeチェック
npm run format        # コードフォーマット
npm run test          # テスト実行
npm run test:coverage # カバレッジ付きテスト
npx prisma studio     # Prisma Studio起動
npx prisma db push    # スキーマをDBに反映
npm run db:seed       # 初期データ投入
```

## 環境変数

`.env.example` を `.env` にコピーして設定してください。

| 変数 | 説明 | 必須 |
|------|------|------|
| `AUTH_SECRET` | 認証シークレット（32文字以上） | Yes |
| `AUTH_URL` | アプリケーションURL | Yes |
| `DATABASE_URL` | PostgreSQL接続文字列 | Yes |
| `NEXT_PUBLIC_APP_NAME` | アプリ表示名 | No |
| `GOOGLE_CLIENT_ID` / `SECRET` | Google OAuth | No |
| `GITHUB_CLIENT_ID` / `SECRET` | GitHub OAuth | No |

## ドキュメント

- [モジュール作成ガイド](docs/MODULE_GUIDE.md) - カスタムモジュールの作成手順
- [アドオンモジュールガイド](docs/ADDON_MODULE_GUIDE.md) - 派生プロジェクト向けアドオン追加手順
- [学習パス](docs/LEARNING_PATH.md) - フレームワーク理解のためのガイド

## ライセンス

MIT License - Copyright (c) 2025 MatsBACCANO

商用・非商用問わず自由に利用・改変・再配布できます。詳細は [LICENSE](LICENSE) を参照してください。

## 作者

MatsBACCANO
