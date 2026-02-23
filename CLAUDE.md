# Claude Code 開発ガイド

このドキュメントは、LionFrameの基本機能を拡張する際のガイドラインです。
各機能の詳細な使い方は `.claude/skills/` や `docs/` を参照してください。

## プロジェクト概要

組織管理システムの最小構成フレームワーク

| 技術 | バージョン/詳細 |
|-----|----------------|
| Next.js | 15 (App Router) |
| 認証 | NextAuth.js v5 (Auth.js) |
| ORM | Prisma (PostgreSQL) |
| CSS | Tailwind CSS 4 |
| 言語 | TypeScript |
| 多言語 | 英語・日本語 |

## アーキテクチャ

```
┌─────────────────────────────────────────────┐
│              フレーム基盤                    │
│  認証 / 通知 / 監査ログ / i18n / Prisma     │
└──────────────────┬──────────────────────────┘
                   │ 利用
┌──────────────────┴──────────────────────────┐
│      コアモジュール / アドオンモジュール      │
│     (system, ai, organization, ...)         │
└─────────────────────────────────────────────┘
```

フレーム基盤はモジュールではなく、モジュールが利用するインフラストラクチャです。
モジュールは**メニュー**（画面あり）と**サービス**（APIのみ）の2種類を持ちます。

## ディレクトリ構造

```
app/
  ├── (menus)/              # メニューページ実装
  │   ├── (user)/           # 全社員向け（組織図、AIチャット）
  │   ├── (manager)/        # 管理職向け
  │   └── (admin)/          # システム管理者向け
  ├── admin/                # 管理画面
  ├── login/                # ログインページ
  └── api/                  # APIルート

lib/
  ├── modules/              # モジュール定義（registry.tsx）
  ├── core-modules/         # コアモジュール（system, ai, organization）
  ├── addon-modules/        # アドオンモジュール（追加先）
  ├── services/             # フレーム基盤サービス
  ├── stores/               # Zustandストア
  ├── i18n/                 # 多言語対応
  ├── importers/            # データインポート
  └── history/              # 履歴管理

components/
  ├── ui/                   # 共通UIコンポーネント
  ├── sidebar/              # サイドバーナビゲーション
  └── notifications/        # 通知UI
```

## 開発コマンド

```bash
npm run dev                # 開発サーバ起動
npm run build              # ビルド
npm run test               # テスト
npx prisma studio          # Prisma Studio
npx prisma generate        # クライアント生成
npx prisma db push && npm run db:seed  # DB初期化
```

## Prismaモデル

| カテゴリ | モデル |
|---------|--------|
| 認証 | Account, Session, User, VerificationToken |
| 通知・監査 | AuditLog, Notification, Announcement |
| アクセス制御 | Permission, AccessKey, AccessKeyPermission, UserAccessKey |
| 組織 | Organization, Department, Section, Course, Employee, PositionMaster |
| 履歴 | EmployeeHistory, OrganizationHistory, ChangeLog |
| AI | RagDocument, RagChat |
| カレンダー | CalendarEvent, Holiday |
| システム | SystemSetting |

## 重要なルール

### menuGroupとURLパスの一致

```typescript
// ✅ 正しい
path: "/manager/analytics"
menuGroup: "manager"

// ❌ 間違い
path: "/admin/dashboard"
menuGroup: "user"
```

### 共通コンポーネントの使用

```typescript
// ✅ 正しい
import { Button } from "@/components/ui";

// ❌ 間違い
<button className="px-4 py-2 bg-blue-600...">保存</button>
```

### 翻訳ファイルの使用

```typescript
// ✅ 正しい
const t = translations[language];
<h1>{t.title}</h1>

// ❌ 間違い
<h1>Dashboard</h1>
```

### ヘッダータイトルの動的取得

ページタイトルはモジュールレジストリから自動取得されます。
新モジュール追加時に `page-titles.ts` の編集は不要です。

**取得順序:**
1. `lib/i18n/page-titles.ts`（既存ページ用）
2. モジュールレジストリの `menu.name` / `menu.nameJa`
3. フォールバック: "LionFrame"

## ロール階層とメニューセクション

```
GUEST → USER → MANAGER → EXECUTIVE → ADMIN
```

| ロール | 表示されるセクション |
|--------|---------------------|
| GUEST | ゲスト |
| USER | ゲスト、ユーザ |
| MANAGER | ゲスト、ユーザ、マネージャー |
| EXECUTIVE | + エグゼクティブ |
| ADMIN | 全セクション |

```typescript
type MenuGroupId = "guest" | "user" | "manager" | "executive" | "admin";
```

### ロールカラースキーム

| ロール | Tailwind クラス |
|--------|-----------------|
| GUEST | `bg-gray-600` |
| USER | `bg-blue-600` / `bg-cyan-700` |
| MANAGER | `bg-green-600` / `bg-green-700` |
| EXECUTIVE | `bg-rose-600` / `bg-rose-700` |
| ADMIN | `bg-purple-600` / `bg-purple-700` |

## 認証アーキテクチャ

Next.js 15のmiddlewareはEdge Runtimeで動作するため、認証設定を分離:

| ファイル | Runtime | 用途 |
|---------|---------|------|
| `auth.config.ts` | Edge | middleware用（OAuth設定） |
| `auth.ts` | Node.js | APIルート用（Credentialsプロバイダ） |
| `middleware.ts` | Edge | auth.config.tsを使用 |

OAuth認証は管理画面（システム情報タブ）で個別に有効化/無効化できます。

## 派生プロジェクト向け運用方針

LionFrameをクローンして業務アプリを開発する際のルールです。

### 編集禁止ディレクトリ

| ディレクトリ | 理由 |
|-------------|------|
| `lib/core-modules/` | コアモジュール |
| `lib/modules/registry.tsx` の既存定義 | モジュールレジストリ |
| `components/ui/` | 共通UIコンポーネント |
| `lib/services/` | フレーム基盤サービス |

### 業務モジュールの配置先

| 種別 | 配置先 |
|------|--------|
| モジュール定義 | `lib/addon-modules/<module-name>/` |
| 画面（ページ） | `app/(menus)/(business)/<path>/` |
| コンポーネント | `components/business/` |
| API | `app/api/<module-name>/` |

### 一時的なローカル修正のルール

やむを得ずフレームを修正する場合:

```typescript
// ========================================
// TEMPORARY FIX: LionFrame Issue #123
// TODO: 本家マージ後に削除
// ========================================
```

## 詳細ドキュメント

| ドキュメント | 内容 |
|-------------|------|
| `docs/MODULE_GUIDE.md` | モジュール作成手順 |
| `docs/LEARNING_PATH.md` | フレームワーク学習ガイド |
| `.claude/skills/architecture/` | アーキテクチャ詳細 |
| `.claude/skills/ui-ux/` | UIコンポーネント・スタイリング |
| `.claude/skills/i18n/` | 多言語対応の実装方法 |
| `.claude/skills/testing/` | テスト戦略・モック方法 |
| `.claude/skills/notifications/` | 通知サービスの使い方 |
| `.claude/skills/data-management/` | インポート・履歴管理 |
| `.claude/skills/react-hooks/` | React/Next.jsパターン |
| `.claude/skills/security-audit/` | セキュリティチェックリスト |
