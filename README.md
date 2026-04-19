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

## 認証基盤

LionFrame は社内の他アプリから OpenID Connect (OIDC) 経由で認証・RBAC を再利用できる **OIDC Provider (OP)** として機能します（[PR #7](https://github.com/Takashi-Matsumura/lion-frame/pull/7) でコアに組み込み済み）。

### 提供機能

| 機能 | エンドポイント / 画面 |
|-----|---------------------|
| Discovery Document | `GET /api/oidc/.well-known/openid-configuration` |
| JWKS（公開鍵） | `GET /api/oidc/jwks` |
| 認可リクエスト | `GET /api/oidc/authorize` |
| トークン発行 | `POST /api/oidc/token` |
| UserInfo | `GET /api/oidc/userinfo` |
| 同意画面 | `/oidc/consent` |
| クライアント管理（ADMIN） | `/admin/oidc/clients` |

### サポート仕様

| 項目 | 値 |
|------|---|
| 認可フロー | Authorization Code Flow **PKCE 必須（S256）** |
| 署名アルゴリズム | RS256（RSA 2048） |
| クライアント認証 | `client_secret_basic` / `client_secret_post` |
| スコープ | `openid` / `profile` / `email` |
| カスタムクレーム | `lion:role`（USER/MANAGER/EXECUTIVE/ADMIN）／ `lion:two_factor`（2FA 検証済みフラグ） |
| Refresh Token | 未対応（必要になったら追加検討） |
| Dynamic Client Registration | 未対応（管理画面で登録） |

### セキュリティ特性

- `client_secret` は bcrypt(10) でハッシュ保存、平文は登録/再生成時のみ表示
- `redirect_uri` は完全一致のみ（ワイルドカード・部分一致不可）
- 認可コードは一回限り・TTL 120 秒、再利用検知時は発行済みアクセストークンを revoke
- 全エンドポイントに監査ログ（`OIDC` カテゴリ）とレートリミット
- `allowedRoles` でクライアント単位にロール制限、`GUEST` はデフォルト除外
- 署名鍵は環境変数で JWK 形式保管、複数 `kid` 並列公開でローテーション対応
- **社内 LAN 環境限定**利用を前提（外部公開・OIDC 認定取得は未対応）

### セットアップ手順（運用者向け）

```bash
# 1. 署名鍵を生成
node apps/web/scripts/generate-oidc-keys.mjs

# 2. 出力された OIDC_SIGNING_KEYS='[...]' を apps/web/.env に貼り付け
#    あわせて OIDC_ISSUER="http://localhost:3000" を設定

# 3. Prisma スキーマを反映
cd apps/web && npx prisma db push

# 4. ADMIN でログイン → /admin/oidc/clients でクライアント登録
#    生成された client_id / client_secret を RP 側に設定
```

### 関連ドキュメント

- [OIDC_INTEGRATION_GUIDE.md](docs/OIDC_INTEGRATION_GUIDE.md) — **社内アプリ（RP）から利用する開発者向け** 統合ガイド
- [OIDC_PROVIDER.md](docs/OIDC_PROVIDER.md) — Provider 側の設計方針・実装判断の記録

## パスキー（WebAuthn）

LionFrame はパスワード代替の認証手段として **パスキー（WebAuthn / FIDO2）** に対応しています。`@simplewebauthn/server` ベースで実装しており、NextAuth v5 の JWT セッションに統合されています。

### 機能

| 機能 | 場所 |
|------|------|
| 登録・一覧・ニックネーム編集・削除 | `/settings`（ユーザ自身） |
| パスキーでサインイン | `/login`（discoverable credential、メール入力不要） |
| 他人のパスキー強制削除 | `/admin`（ユーザ管理テーブルの鍵アイコン） |
| 監査ログ | `WEBAUTHN_REGISTER` / `WEBAUTHN_AUTHENTICATE` / `WEBAUTHN_DELETE` / `WEBAUTHN_ADMIN_DELETE` |

認証オプションは `userVerification: "required"` / `residentKey: "required"` / `attestation: "none"` で固定。パスキーでサインインした場合、**TOTP 2FA は自動スキップ**されます（パスキー自体が所持＋生体の多要素のため）。

### パスキーの保存先（運用担当者向け）

登録時にブラウザが **どこに秘密鍵を保存するか** を選択するダイアログを表示します。どれを選んでもサーバ側の登録フローは同じですが、**同期範囲・復旧性・フィッシング耐性が大きく異なる** ため、ユーザ層ごとに推奨保存先が変わります。

| 保存先 | 同期範囲 | 復旧性 | 向くユーザ |
|--------|---------|--------|-----------|
| **Google パスワード マネージャー** | Google アカウントで Chrome / Android 全デバイス | Google アカウント復旧で復活 | Chrome + Android 主体 |
| **iCloud キーチェーン** | Apple ID で Mac / iPhone / iPad / Safari | Apple ID 復旧で復活 | Apple エコシステム主体 |
| **スマートフォン / タブレット（ハイブリッド）** | スマホ側のパスキーストア（QR + Bluetooth） | スマホ次第 | 共用 PC・出先・検証 |
| **自分の Chrome プロファイル（デバイスバウンド）** | 同期なし（この PC 限定） | **デバイス故障で失う** | 高セキュリティ運用 |
| **USB セキュリティキー** | 同期なし（物理トークン内） | 予備キーが必須 | ADMIN・特権アカウント |

**USB セキュリティキーについて補足:** YubiKey 5（6,000〜10,000 円）、Google Titan（5,000〜6,000 円）、Feitian ePass（企業一括導入向け）などが代表的。秘密鍵はセキュアエレメントから取り出せず、マルウェア感染 PC でも鍵は盗まれません。**紛失時のロックアウトを防ぐため、必ず 2 本以上（メイン + 金庫保管のバックアップ）運用**してください。

### 推奨運用ポリシー

- **一般ユーザ（USER / MANAGER）**: Google パスワードマネージャー または iCloud キーチェーンを推奨（UX が良く、デバイス紛失時も Apple / Google アカウント復旧で戻せる）
- **EXECUTIVE / ADMIN**: USB セキュリティキー（2 本）の併用を強く推奨（フィッシング耐性が最強、クラウド漏洩の影響を受けない）
- **開発・検証端末**: 「自分の Chrome プロファイル」または Chrome DevTools の仮想オーセンティケータ（物理デバイス不要）
- 最後の 1 件削除ガード: パスワード無し・2FA 無しの状態で最後のパスキーを削除しようとするとサーバ側で 409 を返却（アカウントロックアウト防止）

### 環境変数

```bash
# apps/web/.env
# RP ID（本番はドメイン名、未指定時は AUTH_URL のホスト名 → "localhost"）
NEXT_PUBLIC_WEBAUTHN_RP_ID=""
# OS／パスワードマネージャに表示される名前
NEXT_PUBLIC_WEBAUTHN_RP_NAME="LionFrame"
# 許容 Origin（カンマ区切りで複数指定可。未指定時は AUTH_URL）
WEBAUTHN_ORIGIN=""
```

**注意事項:**
- `NEXT_PUBLIC_WEBAUTHN_RP_ID` 変更後は **dev サーバ再起動必須**（クライアントビルド時に埋め込まれるため）
- 本番は HTTPS 必須（`localhost` のみ HTTP 許可）
- Chrome のシークレットモードで登録したパスキーは、通常プロファイルに保存し直さないとウィンドウを閉じた時点で失われる

## ドキュメント

| ドキュメント | 内容 |
|-------------|------|
| [MODULE_GUIDE.md](docs/MODULE_GUIDE.md) | モジュール作成手順 |
| [ADDON_MODULE_GUIDE.md](docs/ADDON_MODULE_GUIDE.md) | アドオン追加手順 |
| [LEARNING_PATH.md](docs/LEARNING_PATH.md) | フレームワーク学習ガイド |
| [REPORT_LINE.md](docs/REPORT_LINE.md) | レポートライン（承認ルート） |
| [OIDC_PROVIDER.md](docs/OIDC_PROVIDER.md) | OIDC Provider 設計方針・実装判断の記録 |
| [OIDC_INTEGRATION_GUIDE.md](docs/OIDC_INTEGRATION_GUIDE.md) | 社内アプリ（RP）から OIDC 連携する手順・サンプルコード |

## ライセンス

MIT License - Copyright (c) 2025 MatsBACCANO
