# OIDC Provider 設計方針

LionFrame を OpenID Connect Provider (OP) として社内の他アプリに公開するための設計判断を記録します。
実装タスクは [Issue #6](https://github.com/Takashi-Matsumura/lion-frame/issues/6) で管理しています。

## 目的と利用シーン

社内で新しいアプリを作るたびに認証を個別実装するのをやめ、LionFrame のアカウント・2FA・RBAC を OIDC 経由で共通化します。

**前提とする利用環境:**

- **社内 LAN 環境限定**での利用（インターネット公開はしない）
- 利用する Relying Party (RP) は **すべて社内管理下のアプリ**
- 子会社・取引先・一般ユーザへの開放予定は **なし**

この前提が変わる場合（外部公開・OIDC 認定取得など）は、本ドキュメントの「将来の拡張余地」節を参照してください。

## 採用した実装方針

**「プリミティブライブラリ（`jose`）+ 自前ルーティング」** 方式。

- JWT の署名・検証・JWKS 生成などの暗号処理は [`jose`](https://github.com/panva/jose) に委譲
- 各 OIDC エンドポイント（`/api/oidc/authorize` 等）は Next.js App Router の `route.ts` で自前実装
- ストレージは Prisma（`OIDCClient` / `OIDCAuthCode` / `OIDCAccessToken` / `OIDCConsent`）
- 既存の NextAuth セッションを `auth()` ヘルパ経由で読み、そのまま認証結果として使う

## なぜこの方式を選んだか（検討した選択肢）

設計時に以下の 4 択を比較しました。

| 選択肢 | 内容 | 採否 |
|---|---|---|
| A. 全自前実装 | 暗号処理まで含めて自前で書く | 不採用 |
| **B. プリミティブ + 自前ルーティング** | **`jose` 等で暗号処理のみライブラリ化、それ以外は自前** | **採用** |
| C. 統合ライブラリ（`node-oidc-provider`） | プロトコル全体をライブラリに委譲 | 不採用 |
| D. 外部 OP（Ory Hydra / Keycloak） | 別プロセスで OP を立てる | 不採用 |

### A を選ばなかった理由

JWT 署名・`kid` ローテーション・timing-safe な secret 比較など、**暗号処理は自前実装で事故りやすい領域**です。
ここだけはライブラリに寄せることで、セキュリティ CVE も `jose` のアップデートで追随できます。

### C を選ばなかった理由

`node-oidc-provider` は RFC 準拠が堅く、将来 `prompt=none` / CIBA / DPoP などの高度な仕様に対応したくなった時に有利です。
しかし以下の理由で今回は見送りました。

- **Express/Koa 前提の設計** で、Next.js App Router との統合には `Request`↔`IncomingMessage` 変換のブリッジ層が必要
- そのブリッジ層はアップグレードのたびに壊れるリスクがあり、採用事例も少ない
- 社内 LAN 限定で利用する前提では、高度な OIDC 機能（CIBA・DPoP 等）は当面不要

### D を選ばなかった理由

運用負荷（別プロセス・別 DB・別ログ基盤）が大きく、社内用途には過剰。また LionFrame の 2FA・RBAC をそのまま使うには結局 LionFrame を Identity Source として繋ぎ込む必要があり、メリットが薄い。

## ライブラリと自前実装の境界

引き継ぐ開発者向けに、**どこまでを `jose` に任せ、どこからを自前で書くか** を明示します。

### `jose` に任せる領域

- ID Token / Access Token (JWT) の署名生成
- JWT の検証（`aud` / `iss` / `exp` / `nbf` / `nonce` の検証を含む）
- JWKS（JSON Web Key Set）の生成・公開
- 署名鍵の生成・インポート・エクスポート（JWK 形式）
- `kid` によるキーローテーション

### 自前で実装する領域

- 各 OIDC エンドポイントのルーティング（`/api/oidc/authorize`, `/token`, `/userinfo`, `/jwks`, `/.well-known/openid-configuration`）
- 認可コード・アクセストークン・同意情報の永続化（Prisma）
- PKCE (`code_challenge_method=S256`) の検証ロジック
- `redirect_uri` の完全一致チェック
- `client_secret` の bcrypt ハッシュ化と検証
- 同意画面 (`/oidc/consent`) の UI
- クライアント管理画面 (`/admin/oidc/clients`)
- 監査ログ・レート制限の統合（既存基盤を利用）
- カスタムクレーム `lion:role` / `lion:two_factor` のマッピング

## 将来の拡張余地

**本方針は「社内 LAN 限定」の前提で最適化**しています。前提が変わった場合は以下を検討してください。

### もし外部公開することになったら

- `node-oidc-provider`（選択肢 C）への移行を検討
- 移行コストを下げるため、**ストレージ層は Prisma で抽象化**してある（`node-oidc-provider` のアダプタインタフェースに置き換えやすい）
- `prompt=none` / `acr_values` / `max_age` など、社内用途では省略している仕様の対応が必要

### もし OIDC 認定を取りたくなったら

- B 方式では自前実装部分が認定要件を満たさない可能性が高い
- 選択肢 C または D への移行を検討

### もし Refresh Token / 動的クライアント登録が必要になったら

- 初期リリースでは見送っているが、B 方式のまま追加実装可能
- Refresh Token は `OIDCRefreshToken` モデルを追加し、`/api/oidc/token` の `grant_type=refresh_token` 分岐を実装

## セキュリティ設計の要点

詳細は [Issue #6](https://github.com/Takashi-Matsumura/lion-frame/issues/6) の「セキュリティ要件」節に記載。実装時に必ず満たすべき要件のみ再掲します。

- `client_secret` は bcrypt ハッシュで保存、平文は登録時の一度のみ表示
- `redirect_uri` は完全一致のみ（部分一致・ワイルドカード禁止）
- PKCE (`S256`) 必須
- 認可コードは一回限り・TTL 120 秒
- 署名鍵は環境変数 or KMS に保管、再起動で失われないこと
- JWKS は複数 `kid` を並列公開（ローテーション両立）
- `/api/oidc/*` すべてに既存の監査ログとレート制限を適用

## 参考資料

- [OpenID Connect Core 1.0](https://openid.net/specs/openid-connect-core-1_0.html)
- [RFC 7636 (PKCE)](https://datatracker.ietf.org/doc/html/rfc7636)
- [`jose` ドキュメント](https://github.com/panva/jose)
- 動く参考実装: [oidc-demo リポジトリ](https://github.com/Takashi-Matsumura/oidc-demo)
