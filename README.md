# LionFrame

組織管理システムの最小構成フレームワーク。
認証・通知・監査ログなどの基盤の上に、モジュール形式で業務機能を追加できます。

![LionFrame - カレンダー](docs/images/calendar.png)

## 技術スタック

Next.js 15 (App Router) / React 19 / TypeScript / Tailwind CSS 4 / Prisma 6 (PostgreSQL) / NextAuth.js v5 / Zustand / Biome 2 / Jest 30

## クイックスタート

```bash
# 依存関係
pnpm install

# PostgreSQL 起動
docker compose up -d postgres

# 環境変数
cp .env.example .env
openssl rand -base64 48   # AUTH_SECRET を生成して .env に記入

# DB 初期化 & 起動
cd apps/web && npx prisma db push && pnpm db:seed && cd ../..
pnpm dev
```

初期ログイン:
- 管理者: `admin@lionframe.local` / `admin`
- ゲスト: `guest@lionframe.local` / `guest`

http://localhost:3000

## アーキテクチャ

```
フレーム基盤（認証 / 通知 / 監査ログ / i18n / Prisma）
    │
    ├── コアモジュール ─── system / ai / organization / schedule
    ├── アドオンモジュール ─ editor / forms / health-checkup / pdf / nfc-card / workflow / watasu / backup / handson
    └── キオスクモジュール ─ event-attendance
```

モジュールは **メニュー**（画面あり）と **サービス**（APIのみ）の2種類を持ちます。

## モジュール一覧

### コア

| モジュール | 説明 |
|-----------|------|
| system | ダッシュボード・システム環境・監査ログ・利用状況 |
| ai | AIチャット・AI体験（Playground）・翻訳・要約・RAG |
| organization | 組織図・社員管理・データインポート |
| schedule | カレンダー・祝日管理 |

### アドオン

| モジュール | 説明 |
|-----------|------|
| editor | マークダウン & ホワイトボード（Excalidraw）エディタ |
| forms | フォーム作成・回答収集 |
| health-checkup | 健康診断キャンペーン管理 |
| pdf | PDFテンプレート・エクスポート |
| nfc-card | NFCカード管理 |
| workflow | 申請・承認ワークフロー（サンプル） |
| watasu | モバイル転送 — スマートフォンからPCへ画像を安全に転送（🔑鍵付き・12時間有効期限） |
| backup | システムバックアップ・リストア |
| handson | ハンズオン教材管理 |

### キオスク

| モジュール | 説明 |
|-----------|------|
| event-attendance | NFCカードによるイベント出欠管理 |

### 外部アドオン

| パッケージ | 説明 |
|-----------|------|
| @lionframe/addon-ai-playground | AI体験（AI Playground）- コアモジュール統合済み |

外部 npm パッケージとしてのアドオン開発にも対応しています。

## ロール階層

```
GUEST → USER → MANAGER → EXECUTIVE → ADMIN
```

| ロール | アクセス範囲 |
|--------|-------------|
| GUEST | ゲスト専用メニューのみ（AI体験など） |
| USER | ゲスト + ユーザメニュー（ダッシュボード・組織図・AIチャットなど） |
| MANAGER | + マネージャーメニュー（組織データ管理・カレンダー管理など） |
| EXECUTIVE | + エグゼクティブメニュー |
| ADMIN | 全メニュー（システム環境・監査ログ・AI設定など） |

GUESTロールはログイン可能な一時的なゲストアカウントです。`/welcome` にリダイレクトされ、ゲストメニュー（AI体験など）のみ利用できます。

## GitHub Actions

### Claude Code Review（PR自動レビュー）

PRが作成・更新されると、Claude CodeがCLAUDE.mdのプロジェクトルールに基づいて自動レビューを行います。

**ワークフロー:** `.github/workflows/claude-review.yml`

**機能:**
- PR作成・更新時に自動レビュー（menuGroup/URLパスの一致、翻訳ルール、セキュリティなど7項目）
- PRコメントで `@claude` と呼びかけると対話的なレビューが可能

**セットアップ:**
1. [Claude Code GitHub App](https://github.com/apps/claude) をリポジトリにインストール
2. [Anthropic Console](https://console.anthropic.com/) でAPIキーを取得
3. リポジトリの Settings → Secrets → Actions に `ANTHROPIC_API_KEY` を登録

```bash
# CLIで登録する場合
gh secret set ANTHROPIC_API_KEY
```

> APIキーはClaude Maxプランとは別の従量課金です（Sonnet 4.6で1レビューあたり数円程度）。

### ブランチ保護

mainブランチには以下の保護ルールが設定されています。

| ルール | 内容 |
|--------|------|
| PR必須 | mainへの直接pushは禁止。必ずPR経由で変更する |
| force push禁止 | mainブランチの履歴改ざんを防止 |
| 管理者バイパス | リポジトリ管理者は緊急時にルールをバイパス可能 |

## 開発フロー

mainブランチへの変更は必ずPR経由で行います。PRを作成するとClaude Codeが自動レビューを実行します。

### 通常の開発

```bash
# 1. ブランチを作成
git checkout -b feature/xxx

# 2. 変更をコミット
git add <files>
git commit -m "feat: 新機能の説明"

# 3. pushしてPRを作成
git push -u origin feature/xxx
gh pr create --title "feat: 新機能の説明" --body "変更内容の詳細"

# 4. Claude Code が自動レビュー（30秒〜1分）
#    PRコメントで @claude と呼びかけると対話も可能

# 5. レビュー確認後、マージ
gh pr merge
```

### 外部（クローン先）からの貢献

LionFrameをクローンして派生プロジェクトを開発している場合、本家リポジトリへの変更提案は以下のフローで行います。

1. クローン先でブランチを作成しPRを送信
2. Claude Code が自動レビューを実行
3. リポジトリ管理者がレビュー結果を確認
4. 問題なければマージ

## ドキュメント

| ドキュメント | 内容 |
|-------------|------|
| [MODULE_GUIDE.md](docs/MODULE_GUIDE.md) | モジュール作成手順 |
| [ADDON_MODULE_GUIDE.md](docs/ADDON_MODULE_GUIDE.md) | アドオン追加手順 |
| [LEARNING_PATH.md](docs/LEARNING_PATH.md) | フレームワーク学習ガイド |
| [REPORT_LINE.md](docs/REPORT_LINE.md) | レポートライン（承認ルート） |

## ライセンス

MIT License - Copyright (c) 2025 MatsBACCANO
