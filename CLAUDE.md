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
lionframe/
├── apps/
│   ├── web/                  # Next.js Webアプリ
│   │   ├── app/              # App Router ページ
│   │   ├── components/       # UIコンポーネント
│   │   ├── lib/              # ビジネスロジック・モジュール
│   │   ├── types/            # 型定義
│   │   ├── prisma/           # Prismaスキーマ・シード
│   │   ├── public/           # 静的ファイル
│   │   ├── messages/         # 翻訳メッセージ
│   │   ├── addons.ts         # 外部アドオン登録設定
│   │   └── __tests__/        # テスト
│   └── mobile/               # React Native（プレースホルダー）
├── packages/
│   └── module-types/          # 外部アドオン用の共有型定義
├── addons/                    # 外部アドオンモジュール
│   └── sample-hello/          # サンプルアドオン
├── backend/                   # Python FastAPI
├── docs/                      # ドキュメント
├── pnpm-workspace.yaml
├── turbo.json
└── package.json               # ルートワークスペース
```

### apps/web/ 内部構造

```
app/
  ├── (menus)/              # メニューページ実装
  │   ├── (guest)/          # ゲスト向け（Welcome画面）
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
# ルートから（turbo経由）
pnpm dev                   # 全アプリの開発サーバ起動
pnpm build                 # 全アプリのビルド
pnpm test                  # 全アプリのテスト

# Webアプリのみ
pnpm --filter @lionframe/web dev
pnpm --filter @lionframe/web build
pnpm --filter @lionframe/web test

# Prisma（apps/web/で実行）
cd apps/web && npx prisma studio
cd apps/web && npx prisma generate
cd apps/web && npx prisma db push && pnpm db:seed
```

## Prismaモデル

| カテゴリ | モデル |
|---------|--------|
| 認証 | User, WebAuthnCredential |
| 通知・監査 | AuditLog, Notification, Announcement, PushSubscription |

> **通知システム（3層構造）:** (1) 通知センター（ヘッダーのベル、30秒ポーリング、DB永続化）、(2) Sonnerトースト（明示呼び出しのみ）、(3) Web Pushプッシュ通知（OSレベル、タブ外配信可）。`NotificationService.create/broadcast` を呼ぶと自動的にプッシュも送信される（購読済みユーザのみ）ため、新機能実装時にプッシュ対応の追加コードは不要。詳細は `.claude/skills/notifications/SKILL.md` を参照。
> **Web Pushの要件:** `NEXT_PUBLIC_VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` 環境変数必須（`npx web-push generate-vapid-keys`で生成）、本番はHTTPS必須（localhostは例外）、シークレット/プライベートブラウジングでは動作しない。Service Workerは `apps/web/public/sw.js`。
> **プッシュ通知のハマりどころ:** ①シークレットモード非対応、②Chromeは `Notification.requestPermission()` の明示呼び出し必須、③`navigator.serviceWorker.ready` でSW active待機必須、④macOSシステム設定で通知許可必須、⑤一度denyされるとダイアログ再表示不可（ブラウザのサイト設定からリセット）、⑥`NEXT_PUBLIC_*` 変更後は開発サーバ再起動必須、⑦Prismaのdrift警告時は `prisma db execute --stdin` でSQL直接実行が安全。
| アクセス制御 | Permission, AccessKey, AccessKeyPermission, UserAccessKey |
| 組織 | Organization, Department, Section, Course, Employee, PositionMaster |
| 履歴 | EmployeeHistory, OrganizationHistory, ChangeLog |
| AI | RagDocument, RagChat |
| カレンダー | CalendarEvent, Holiday |
| 利用状況 | UsageLog, UsageStat |
| ページガイド | PageGuide, PageGuideRevision |
| 依存関係チェック | DependencyReport, DependencyItem |
| フォーム | Form, FormSection, FormField, FormSubmission, FormAnswer |

> **フォームのフィールドタイプ注意:** `TEXTAREA` は使用しない。長文入力は `TEXT` + `config.multiline: true` を使用する。
> **候補日フィールド (`DATE_SLOTS`):** 複数の希望日を1フィールドで入力。`config.slotCount`（1〜5、デフォルト3）で候補数を制御。`config.layout`（`vertical`/`horizontal`）でレイアウト切替。保存値は `string[]`（例: `["2026-04-01", "2026-04-03"]`）。`dateMin`/`dateMax` で日付範囲制約可能。
> **ラジオフィールドのデフォルト値:** `config.defaultValue` に選択肢の文字列を設定。プレビュー・回答画面で初期選択される。
> **フォーム回答:** `allowMultiple: false` の場合、再送信で既存回答を上書き（delete + create）。回答済みフォームを開くと既存回答がプリフィルされる。
> **公開中フォームのレビュー:** フォーム公開後、エディタ画面は左右分割（左: フィールド構成一覧、右: 回答者視点のライブプレビュー）。
| 健康管理 | HealthCheckupCampaign, HealthCheckupRecord |

> **健康管理ステータスフロー:** `NOT_BOOKED`(未予約) → `PENDING`(予約中/会社予約) → `BOOKED`(予約済) → `VISITED`(受診後) → `COMPLETED`(受診済)。個人予約は `NOT_BOOKED` → `BOOKED` → `VISITED` → `COMPLETED`。確定日到来で `BOOKED` → `VISITED` に自動遷移。
> **健康管理インポート:** フォームXLSXエクスポートをインポート。会社予約→PENDING+希望日、個人予約→BOOKED+確定日。社員マッチングは `EMPLOYEE_PICKER`（社員番号 氏名）形式を解析。
> **健康管理メニュー:** AccessKey `health_checkup` が必要（ADMINはバイパス）。
> **ダッシュボード個人セクション:** 非ADMINユーザ向けに「あなたのタスク」セクション（健康診断ステータス、未回答フォーム、通知）を表示。健康診断ステータスは `/api/health-checkup/my-status` で取得。
| エディタ | EditorDocument |
| PDF | PdfTemplate |
| タグ | Tag, TagAssignment |
| NFCカード | NfcCard |
| グループ | Group, GroupMember |
| ハンズオン | HandsonSession, HandsonParticipant, HandsonLog |
| システム | SystemSetting |

> **ハンズオン画面分離:** 講師用（`/handson-management`、userグループ、`handson`アクセスキー必須）と受講者用（`/handson`、guestグループ、GUEST専用）の2メニューに分離。GUEST以外が`/handson`にアクセスするとダッシュボードにリダイレクト。講師メニューはアクセスキーを付与された社員が利用可能（ADMINはキー不要）。
> **ハンズオンセッション状態フロー:** `準備中`(READY) → `リハーサル`(REHEARSAL) → `開催中`(ACTIVE) → `終了`(ENDED)。リハーサルを経ずに直接「開始」も可能。状態はDB列ではなく`SystemSetting`で管理: `handson_active_session_id`（開催中）、`handson_rehearsal_session_id`（リハーサル中）、`endedAt`（終了）。
> **ハンズオンリハーサル:** リハーサル中はGUESTも含む全ロールが参加可能（講師が事前確認できる）。リハーサル終了時に参加者・ログデータはクリアされ、本番はクリーンな状態で開始。操作（リハーサル開始/終了/本番開始/終了/削除）はセッション作成者（オーナー）またはADMINのみ。
> **ハンズオン受講者フロー:** `/api/handson/active`が`availableSessions`（アクティブ+リハーサル）を返す。1つなら自動遷移、複数なら選択画面を表示。受講者はセッション終了を10秒ポーリングで検知し自動復帰。座席選択ダイアログに「戻る」ボタンあり。
> **ハンズオンコード構造:** 共通基盤は`components/handson/`に集約（`types.ts`型定義、`translations.ts`翻訳、`hooks.ts`ポーリング/ドキュメント取得、`api.ts`APIクライアント、`skeletons.tsx`スケルトン）。SessionManagerは`SessionCreateForm`+`SessionListTable`に分割。SessionAnalyticsは`analytics/`サブディレクトリに6コンポーネント分割。
> **AI体験（AI Playground）:** AI有効状態は`/api/ai-playground/settings`から`ai_enabled`を取得（ADMIN専用APIではなく全ロールアクセス可）。GUESTロールでも利用可能。モードボタンはトグル式（再クリックで解除）。モード未選択時はシステムプロンプトなしのシンプルチャット。初期状態はモード未選択。
> **RAGコレクション分離:** ChromaDB内で`guest`（AI体験用）と`business`（AIチャット用）の2コレクションに分離。ゲストユーザが社内業務ドキュメントにアクセスすることを防止。APIの`collection`パラメータで指定（未指定時は`business`で後方互換）。将来的にDockerコンテナレベルの物理分離も検討可（`backend/README.md`参照）。

> **エディタモジュール:** 複合型エディタ。`EditorDocument.type`でドキュメント種別を管理。`"markdown"`（マークダウン）と`"excalidraw"`（ホワイトボード）をサポート。マークダウンはCodeMirror 6のLive Preview、ExcalidrawはフローティングウィンドウでExcalidrawキャンバスを全面表示。自動保存: マークダウン500ms、Excalidraw 1000msデバウンス。Excalidrawデータは`JSON.stringify({ elements, appState })`で`content`フィールドに格納。タイトルはコンテンツとは独立（管理画面でリネーム）。
> **PDFエクスポート（HQ方式）:** マークダウンのPDFエクスポートはブラウザ印刷エンジン方式（`window.print()`）を使用。CSS `@page` + `break-inside: avoid` + `break-after: avoid` でブラウザが改ページを自動制御。テーブル行の途中での切断や見出しの孤立を防止。`<table>` の `<thead>/<tfoot>` 自動繰り返しでヘッダー/フッター領域を確保し、`position: fixed` で重畳表示。テンプレートのマージン・ヘッダー・フッター設定を反映。ページ番号（`%page`/`%total`）はCSS counterの制約によりHQモードでは非対応。Excalidrawは従来のjsPDF Canvas方式を使用。
> **PDFモジュール連携:** エディタのPDFエクスポートボタンはPDFモジュールの有効/無効状態をDBの`SystemSetting`（`module_enabled_pdf`）から取得して表示制御。PDFモジュール無効時はエクスポートボタン非表示。テンプレートが複数ある場合はドロップダウンで選択可能（デフォルトテンプレートはアクセントカラーのプリンタアイコンで識別）。
> **PDFテンプレート:** `PdfTemplate`モデルで管理。ヘッダー（左/中央/右）、フッター（左/中央/右）、フォントサイズ、マージン（上下左右）を設定可能。プレースホルダー: `%title`（タイトル）、`%date`（日付）、`%page`（ページ番号※通常モードのみ）、`%total`（総ページ数※通常モードのみ）。API: `/api/pdf/templates`（一覧・作成）、`/api/pdf/templates/[id]`（取得・更新・削除）、`/api/pdf/templates/default`（デフォルト取得）。
> **フローティングウィンドウのテーマ反転:** `.floating-window-inverted` クラスでアプリと逆のテーマを適用（ダーク時→ライト、ライト時→ダーク）。`noPadding` オプションでエディタ等の全面コンテンツ対応。ESCキーは `noPadding` 時に無効。
> **エディタCSS変数:** テーマ変数との衝突を避けるため `--editor-` プレフィックスを使用（例: `--editor-bg-primary`, `--editor-accent`）。
> **タグシステム:** フレーム横断のメタデータ基盤。2種類のタグ: **システムタグ**（ADMINが管理画面で作成・全社共有、色・説明付き）と**ユーザタグ**（ユーザがデータごとに自由入力、マスタ管理なし）。`TagAssignment`はポリモーフィック（`entityType` + `entityId`）で任意モデルに紐づけ可能。サービス: `TagService`（`lib/services/tag-service.ts`）。API: `/api/tags/`（CRUD・割り当て・統計）。UIコンポーネント: `TagBadge`（スクエア角丸、`#`付き表示）、`TagPicker`（Popover型選択）。管理画面: システム環境→タグ管理タブ。エディタモジュールが初の統合先。将来LLM/RAG連携のメタデータとして活用予定。
> **グループモジュール:** 会社組織モジュールに統合（メニュー・サービスとも`organization`モジュールで定義）。2種類のグループ: **公式グループ**（MANAGER以上が作成、全社員閲覧可、例: 委員会・タスクフォース）と**マイグループ**（全ユーザが作成、作成者のみ閲覧のプライベートグループ）。メンバーにはリーダー/メンバーの役割と自由入力の役割名（`title`: 書記、会計など）を設定可能。`Group.createdBy`でオーナー（作成者）を記録し、公式グループではオーナー名を表示。編集権限は作成者またはADMINのみ。API: `/api/groups`（一覧・作成）、`/api/groups/[id]`（詳細・更新・削除）、`/api/groups/[id]/members`（メンバー管理、PATCH で role/title 更新）。ページ: `/groups`（公式/マイ切替、公式タブ内に「今年度」パネル表示と「アーカイブ」テーブル表示の切替）。
> **グループ年度管理・アーカイブ:** 公式グループに`fiscalYear`（Int?、年度）と`archivedAt`（DateTime?、アーカイブ日時）を追加。3パターン: **年度限定**（fiscalYear設定、年度末にアーカイブ）、**常設**（fiscalYear=null、期限なく継続）、**毎年度**（「次年度へ引継ぎ」でメンバーごとコピー後、旧年度をアーカイブ）。アーカイブ済みグループは読み取り専用（編集・メンバー操作・削除不可）。常設グループの「グループ解散」はスナップショット自動保存+アーカイブ。API: `/api/groups/fiscal-years`（年度一覧）、`/api/groups/[id]/archive`（POST=アーカイブ/解散、DELETE=解除）、`/api/groups/[id]/carryover`（次年度引継ぎ）、`/api/groups/[id]/snapshot`（常設グループの年度スナップショット保存）。
> **グループメンバー所属スナップショット:** `GroupMember`に`snapshotPosition`/`snapshotDepartment`/`snapshotSection`を追加。アーカイブ・スナップショット実行時にメンバーの当時の所属情報を文字列として保存。表示時はスナップショットデータがあれば優先表示（異動後も当時の所属が正しく表示される）。
> **GUESTロール:** 一時的なゲストアカウント。ログイン可能だが、`menuGroup: "guest"` のメニューのみアクセス可。ダッシュボードではなく `/welcome` にリダイレクト。`/settings` と `/profile` は利用不可、代わりに `/guest-profile` でゲスト専用プロフィール（言語設定のみ）を提供。言語設定はDBではなくCookie（`lionframe-language`）に保存（ブラウザごとに独立）。middlewareで `/welcome` と `/guest-profile` 以外の全ルートをブロック。`canAccessMenu` は `ROLE_HIERARCHY` に基づき `menuGroup` をチェックするため、`requiredRoles` 未指定のメニューもGUESTには表示されない。シードユーザー: `guest@lionframe.local` / `guest`。
> **バックアップモジュール:** ADMIN専用のアドオンモジュール。コアモジュールデータ（組織構造・社員・履歴・ユーザー・アクセス制御・システム設定）をJSON形式でバックアップ・リストアする。バックアップファイルはブラウザにダウンロードのみ（サーバー保存なし）。リストアは全置換方式（トランザクション内で既存データ削除→バックアップデータ挿入）。リストア前に自動で現在のデータのバックアップをダウンロード。バックアップ履歴はメタデータのみ`SystemSetting`（key: `backup_history`）に保存（最大50件）。User のpassword/braveApiKeyは除外。Employee自己参照（supervisor/deputy）は2パス挿入で対応。リストア時の現在ADMINユーザーはセッション保護。API: `/api/backup/export`（GET）、`/api/backup/history`（GET）、`/api/backup/preview`（POST）、`/api/backup/restore`（POST）。ページ: `/admin/backup`（3タブ: バックアップ作成・履歴・リストア）。

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
| ADMIN | 全セクション（+ developer: 開発環境のみ） |

```typescript
type MenuGroupId = "guest" | "user" | "manager" | "executive" | "admin" | "backoffice" | "developer";
```

### ロールカラースキーム

| ロール | Tailwind クラス |
|--------|-----------------|
| GUEST | `bg-gray-600` |
| USER | `bg-blue-600` / `bg-cyan-700` |
| MANAGER | `bg-green-600` / `bg-green-700` |
| EXECUTIVE | `bg-rose-600` / `bg-rose-700` |
| ADMIN | `bg-purple-600` / `bg-purple-700` |

### ダークテーマ

ダークモードはネイビーベース（hue: 255, chroma: 0.03〜0.04）。グレー系ではなく青みのあるダーク。`globals.css` の `.dark` セクションで定義。

## 認証アーキテクチャ

Next.js 15のmiddlewareはEdge Runtimeで動作するため、認証設定を分離:

| ファイル | Runtime | 用途 |
|---------|---------|------|
| `apps/web/auth.config.ts` | Edge | middleware用（session/jwt callbacks のみ、Provider は空配列） |
| `apps/web/auth.ts` | Node.js | APIルート用（Credentialsプロバイダ） |
| `apps/web/middleware.ts` | Edge | auth.config.tsを使用 |

認証方式は **Credentials（メール+パスワード）** と **パスキー（WebAuthn）** の 2 系統のみ。OAuth（Google/GitHub）は完全に廃止しました（社内設置時のセットアップ負担と、email 一致だけで他人のアカウントにリンクされる実装上のリスクが理由）。将来復活させる場合は本家の PR 履歴から該当コミットを参照・復元してください。また、Credentials+JWT 戦略のみのため `@auth/prisma-adapter` は未使用で、`Account` / `Session` / `VerificationToken` モデルも削除済みです。

## 派生プロジェクト向け運用方針

LionFrameをクローンして業務アプリを開発する際のルールです。

### 編集禁止ディレクトリ

| ディレクトリ | 理由 |
|-------------|------|
| `apps/web/lib/core-modules/` | コアモジュール |
| `apps/web/lib/modules/registry.tsx` の既存定義 | モジュールレジストリ |
| `apps/web/components/ui/` | 共通UIコンポーネント |
| `apps/web/lib/services/` | フレーム基盤サービス |

### 業務モジュールの配置先（内部アドオン）

| 種別 | 配置先 |
|------|--------|
| モジュール定義 | `apps/web/lib/addon-modules/<module-name>/` |
| 画面（ページ） | `apps/web/app/(menus)/(business)/<path>/` |
| コンポーネント | `apps/web/components/business/` |
| API | `apps/web/app/api/<module-name>/` |

### 外部アドオンモジュール

独立したnpmパッケージとして開発・配布するアドオンモジュール。

| 種別 | 配置先 |
|------|--------|
| 型定義パッケージ | `packages/module-types/`（`@lionframe/module-types`） |
| アドオンパッケージ | `addons/<addon-name>/`（`@lionframe/addon-*`） |
| 登録設定 | `apps/web/addons.ts` |
| プロキシページ | `apps/web/app/(menus)/.../<path>/page.tsx` |
| ローダー | `apps/web/lib/modules/addon-loader.ts` |

**外部アドオンの追加手順:**
1. `pnpm add @lionframe/addon-xxx`（またはworkspace依存）
2. `apps/web/addons.ts` にインポート追加
3. `app/(menus)/` 配下にプロキシページを作成（外部コンポーネントをre-export）

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
| `docs/REPORT_LINE.md` | レポートライン（承認ルート基盤） |
| `docs/LEARNING_PATH.md` | フレームワーク学習ガイド |
| `.claude/skills/architecture/` | アーキテクチャ詳細 |
| `.claude/skills/ui-ux/` | UIコンポーネント・スタイリング |
| `.claude/skills/i18n/` | 多言語対応の実装方法 |
| `.claude/skills/testing/` | テスト戦略・モック方法 |
| `.claude/skills/notifications/` | 通知サービスの使い方 |
| `.claude/skills/data-management/` | インポート・履歴管理 |
| `.claude/skills/react-hooks/` | React/Next.jsパターン |
| `.claude/skills/security-audit/` | セキュリティチェックリスト |
| `.claude/skills/external-module/` | 内部モジュールの外部パッケージ化手順 |
| `.claude/skills/handson-material/` | ハンズオン教材のマークダウン記法・構成ルール |
