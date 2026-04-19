# OIDC 統合ガイド（RP 開発者向け）

LionFrame を OpenID Connect Provider (OP) として使い、社内アプリ（Relying Party, RP）から認証・RBAC を再利用する方法を解説します。

> 対象読者: 社内アプリを開発し、LionFrame のアカウント・パスキー MFA・ロール（ADMIN/EXECUTIVE/MANAGER/USER）を利用したい開発者。

---

## 前提

- LionFrame が **社内 LAN 内で稼働**している（`OIDC_ISSUER` の URL が RP から到達可能）
- RP 側で OIDC クライアントライブラリが使える Node.js / Next.js / Python などの環境
- **社内 LAN 限定利用**を前提としています。外部公開は `docs/OIDC_PROVIDER.md` の制約を先に確認してください

---

## 1. OP 側の設定（LionFrame ADMIN）

LionFrame の ADMIN 権限を持つユーザが、RP を登録します。

1. LionFrame にログイン → 左メニュー **管理者 > OIDC クライアント**（`/admin/oidc/clients`）
2. **「新規クライアント登録」** をクリック
3. フォームに入力:

| 項目 | 入力例 | 補足 |
|------|--------|------|
| 表示名 | `社内プロジェクト管理アプリ` | 識別しやすい名称 |
| 説明 | `XX 部の PJ 管理に使用` | 任意 |
| リダイレクト URI | `https://project.example.lan/api/auth/callback/lionframe` | **完全一致** で検証されます。1 行 1 URI |
| 許可スコープ | `openid profile email` | スペース区切り |
| 許可ロール | USER / MANAGER / EXECUTIVE / ADMIN | チェックで絞り込み |
| 同意画面スキップ | 信頼済み社内アプリは ON | ON にすると自動承認 |

4. 登録直後に **`client_id` / `client_secret`** が 1 度だけ表示されます。**必ずこの場で控えてください**（`client_secret` はハッシュ保存されるため再表示不可、必要なら「シークレット再生成」）

---

## 2. RP 側の設定

### 2-1. Discovery Document を取得

```bash
curl http://lionframe.example.lan/api/oidc/.well-known/openid-configuration
```

返却される主な値:

```json
{
  "issuer": "http://lionframe.example.lan",
  "authorization_endpoint": "http://lionframe.example.lan/api/oidc/authorize",
  "token_endpoint": "http://lionframe.example.lan/api/oidc/token",
  "userinfo_endpoint": "http://lionframe.example.lan/api/oidc/userinfo",
  "jwks_uri": "http://lionframe.example.lan/api/oidc/jwks",
  "code_challenge_methods_supported": ["S256"],
  "id_token_signing_alg_values_supported": ["RS256"]
}
```

### 2-2. 環境変数の設定（RP 側）

```env
OIDC_ISSUER=http://lionframe.example.lan
OIDC_CLIENT_ID=lionframe_xxxxxxxxxxxxxxxx
OIDC_CLIENT_SECRET=xxxxxxxxxxxxxxxxxxxxxxxx
OIDC_REDIRECT_URI=https://project.example.lan/api/auth/callback/lionframe
```

---

## 3. 認可フローの実装

LionFrame は **Authorization Code Flow + PKCE (S256)** のみサポートします。Implicit / Hybrid / Client Credentials / Device Flow は未対応です。

### 3-1. フロー全体図

```
RP              Browser                 LionFrame (OP)
 │                 │                          │
 │ (1) /login      │                          │
 │ ←───────────── │                          │
 │                 │ (2) /api/oidc/authorize  │
 │                 │ ────────────────────────→│
 │                 │                          │
 │                 │   既存セッションが無ければ /login へ
 │                 │   同意画面 /oidc/consent（autoApprove=false の場合）
 │                 │                          │
 │                 │ (3) redirect_uri?code=…&state=…
 │                 │ ←────────────────────────│
 │ (4) callback    │                          │
 │ ←───────────── │                          │
 │                                            │
 │ (5) POST /api/oidc/token（code + verifier）│
 │ ──────────────────────────────────────────→│
 │                                            │
 │ (6) { access_token, id_token, expires_in } │
 │ ←──────────────────────────────────────────│
 │                                            │
 │ (7) ID Token を検証（iss / aud / nonce / exp / 署名） │
 │                                            │
 │ (8) GET /api/oidc/userinfo（任意、Bearer）  │
 │ ──────────────────────────────────────────→│
 │ (9) { sub, email, name, "lion:role", ... } │
 │ ←──────────────────────────────────────────│
```

### 3-2. PKCE パラメータ生成（必須）

RFC 7636 に従い、リクエスト毎に生成:

```js
import { randomBytes, createHash } from "node:crypto";

function generatePkce() {
  const verifier = randomBytes(32).toString("base64url"); // 43 文字以上
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  return { verifier, challenge };
}
```

- `verifier` は **セッションに保存**して `/token` 呼び出し時に使用
- `challenge` は `/authorize` のクエリ `code_challenge` に載せる
- `code_challenge_method=S256` を必ず指定（LionFrame は plain 拒否）

### 3-3. state / nonce（必須）

- `state`: CSRF 対策。乱数を生成し RP 側セッションに保存、callback で照合
- `nonce`: ID Token に埋め込まれる乱数。ID Token 検証時に照合して replay を防ぐ

```js
const state = randomBytes(16).toString("hex");
const nonce = randomBytes(16).toString("hex");
// どちらもセッションに保存しておく
```

### 3-4. 認可リクエストの組み立て

```js
const params = new URLSearchParams({
  response_type: "code",
  client_id: process.env.OIDC_CLIENT_ID,
  redirect_uri: process.env.OIDC_REDIRECT_URI,
  scope: "openid profile email",
  state,
  nonce,
  code_challenge: challenge,
  code_challenge_method: "S256",
});

res.redirect(`${ISSUER}/api/oidc/authorize?${params}`);
```

### 3-5. コールバック処理（code をトークンと交換）

```js
// callback ハンドラ
const { code, state: returnedState } = req.query;

// 1) state 照合
if (returnedState !== session.state) throw new Error("CSRF");

// 2) code を token に交換（PKCE verifier を送信）
const body = new URLSearchParams({
  grant_type: "authorization_code",
  code,
  redirect_uri: process.env.OIDC_REDIRECT_URI,
  code_verifier: session.verifier,
  client_id: process.env.OIDC_CLIENT_ID,
  client_secret: process.env.OIDC_CLIENT_SECRET,
});

const tokenRes = await fetch(`${ISSUER}/api/oidc/token`, {
  method: "POST",
  headers: { "Content-Type": "application/x-www-form-urlencoded" },
  body,
});
const { access_token, id_token, expires_in } = await tokenRes.json();
```

### 3-6. ID Token 検証（必須）

**JWT の署名を自前検証してください**。`access_token` は opaque 相当なので、ユーザ情報の判断材料にしてはいけません。

```js
import { jwtVerify, createRemoteJWKSet } from "jose";

const JWKS = createRemoteJWKSet(new URL(`${ISSUER}/api/oidc/jwks`));

const { payload } = await jwtVerify(id_token, JWKS, {
  issuer: ISSUER,
  audience: process.env.OIDC_CLIENT_ID,
});

// nonce 照合
if (payload.nonce !== session.nonce) throw new Error("nonce mismatch");

// これで payload.sub / payload.email / payload["lion:role"] が使える
```

### 3-7. UserInfo（任意）

Access Token を使って最新のプロフィールを取得:

```js
const ui = await fetch(`${ISSUER}/api/oidc/userinfo`, {
  headers: { Authorization: `Bearer ${access_token}` },
}).then((r) => r.json());
// { sub, email, name, "lion:role": "MANAGER", ... }
// ※ `lion:mfa_used` は認証イベント情報のため ID Token のみ（UserInfo には含まれない）
```

---

## 4. カスタムクレームの活用

`profile` スコープを要求すると ID Token に以下が含まれます:

| クレーム | 型 | 配信経路 | 説明 |
|----------|-----|---------|------|
| `lion:role` | string | ID Token / UserInfo | `GUEST` / `USER` / `MANAGER` / `EXECUTIVE` / `ADMIN` |
| `lion:mfa_used` | boolean | **ID Token のみ** | パスキー（WebAuthn）で認証されたセッションか |

`lion:mfa_used` は認証イベント情報のため ID Token 専用（OIDC Core 準拠）。UserInfo にはプロフィール情報のみを含め、認証時刻依存のフラグは返しません。

### RBAC 判定例

```js
const role = payload["lion:role"];

if (["MANAGER", "EXECUTIVE", "ADMIN"].includes(role)) {
  // マネージャー権限相当の画面を表示
}

if (!payload["lion:mfa_used"] && sensitivePage) {
  // パスキー未使用（パスワードのみ）のユーザには機密画面を出さない
  return res.status(403).send("Passkey authentication required");
}
```

> **注意**: `lion:mfa_used` は **ID Token 発行時点**のログインイベントに紐づく値です。
> - LionFrame の MFA は現在パスキー（WebAuthn）のみ。パスキーログイン時は `true`、パスワードのみのログイン時は `false`。
> - UserInfo は「現時点のプロフィール」だけを返すため、`lion:mfa_used` は含みません。
> - 認証イベントに基づく判定（機密画面の表示可否など）は **ID Token の値**を使ってください。

---

## 5. Next.js / Auth.js（NextAuth v5）の統合例

RP が Next.js の場合、`Auth.js` の Custom OIDC Provider として統合できます。

```ts
// auth.ts
import NextAuth from "next-auth";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    {
      id: "lionframe",
      name: "LionFrame",
      type: "oidc",
      issuer: process.env.OIDC_ISSUER,
      clientId: process.env.OIDC_CLIENT_ID,
      clientSecret: process.env.OIDC_CLIENT_SECRET,
      authorization: { params: { scope: "openid profile email" } },
      checks: ["pkce", "state", "nonce"],
      profile(profile) {
        return {
          id: profile.sub,
          email: profile.email,
          name: profile.name,
          image: profile.picture,
          // Auth.js のセッションに流すなら session callback で拾う
          role: profile["lion:role"],
          mfaUsed: profile["lion:mfa_used"],
        };
      },
    },
  ],
  callbacks: {
    async jwt({ token, profile }) {
      if (profile) {
        token.role = profile["lion:role"];
        token.mfaUsed = profile["lion:mfa_used"];
      }
      return token;
    },
    async session({ session, token }) {
      session.user.role = token.role as string;
      session.user.mfaUsed = token.mfaUsed as boolean;
      return session;
    },
  },
});
```

この設定で `checks: ["pkce", "state", "nonce"]` を指定すれば、PKCE・state・nonce を Auth.js が自動処理します。

---

## 6. Python（FastAPI 等）の統合例

`authlib` を使うと手短に実装できます:

```python
from authlib.integrations.starlette_client import OAuth

oauth = OAuth()
oauth.register(
    name="lionframe",
    server_metadata_url=f"{ISSUER}/api/oidc/.well-known/openid-configuration",
    client_id=CLIENT_ID,
    client_secret=CLIENT_SECRET,
    client_kwargs={
        "scope": "openid profile email",
        "code_challenge_method": "S256",  # PKCE
    },
)

@app.get("/login")
async def login(request):
    redirect_uri = request.url_for("callback")
    return await oauth.lionframe.authorize_redirect(request, redirect_uri)

@app.get("/auth/callback")
async def callback(request):
    token = await oauth.lionframe.authorize_access_token(request)
    user = token["userinfo"]  # ID Token payload
    role = user.get("lion:role")
    # ...
```

---

## 7. セキュリティベストプラクティス（RP 実装時の必須確認事項）

**社内 LAN 限定**とはいえ、RP 側の実装ミスは LionFrame のアカウントを直接危険に晒します。以下は必ず守ってください。

### 必須

- [ ] **PKCE (S256) を使用**（LionFrame は未使用リクエストを拒否）
- [ ] **`state` を毎回生成**し、callback で照合する（CSRF 対策）
- [ ] **`nonce` を毎回生成**し、ID Token 検証時に照合する（replay 対策）
- [ ] **ID Token の署名を検証**する（`issuer` / `audience` / `exp` も）
- [ ] **`access_token` の中身を信用しない** — ユーザ判定は必ず ID Token / UserInfo から
- [ ] **`redirect_uri` は固定値**を使う（ユーザ入力を混ぜない）
- [ ] **`client_secret` をフロントエンドに出さない**（サーバサイドのみで保持）

### 推奨

- [ ] 本番は HTTPS 必須（ブラウザの `Secure` cookie も忘れず）
- [ ] `lion:mfa_used=false` の場合は機密画面をブロック（パスワードのみログインは MFA 相当ではない）
- [ ] 定期的に `userinfo` を呼ぶか、expires_in に合わせて再ログイン
- [ ] ログアウト時に RP 側セッションと LionFrame 側セッション Cookie を両方クリア
- [ ] 社内 LAN 外からのアクセスを RP 側でもファイアウォール / プロキシで遮断

### セキュリティ連絡事項

RP 側で不審な挙動（認可コードが繰り返し `invalid_grant` になる等）を検知した場合、**LionFrame の ADMIN に通知してください**。トークン再利用検知が発動している可能性があります。

---

## 8. トラブルシューティング

| 症状 | 原因の可能性 |
|------|-------------|
| `invalid_client` (401) | `client_id` / `client_secret` 間違い、クライアント無効化、secret 再生成後の更新漏れ |
| `invalid_request` (redirect_uri does not match) | `redirect_uri` 完全一致していない（末尾スラッシュ、ポート、スキーム違い含む） |
| `invalid_grant` (code_verifier does not match) | PKCE verifier を正しく引き継げていない（RP 側セッション喪失） |
| `invalid_grant` (reuse detected) | 認可コードを 2 回使った（ブラウザの戻るボタン等）。全関連トークン revoke される |
| `access_denied` (role not permitted) | クライアントの `allowedRoles` に現在のユーザロールが含まれていない |
| `unsupported_response_type` | `response_type=code` 以外を指定している |
| `invalid_scope` | クライアントに許可されていないスコープを要求した |
| ID Token 検証で `signature verification failed` | JWKS のキャッシュが古い（`kid` ローテーション直後）→ キャッシュをリフレッシュ |

---

## 9. 動作確認サンプル

実装動作の参考として、手動実装の OIDC Client サンプルを [oidc-demo リポジトリ](https://github.com/Takashi-Matsumura/oidc-demo) に公開しています。Phase 1（Client 実装）のコードは本ガイドと同じフローで書かれています。

---

## 10. 制限事項・今後の予定

- **Refresh Token 未対応**: Access Token の expires_in (デフォルト 1 時間) が切れたら、ユーザに再ログインを促してください
- **バックチャネルログアウト未対応**: LionFrame 側ログアウトは RP 側セッションに自動伝播しません
- **Dynamic Client Registration 未対応**: クライアントは ADMIN が管理画面で手動登録
- **複数テナント未対応**: 1 LionFrame インスタンス = 1 組織の想定

要件が変わる場合は `docs/OIDC_PROVIDER.md` の「将来の拡張余地」を参照してください。

---

## 参考資料

- [OpenID Connect Core 1.0](https://openid.net/specs/openid-connect-core-1_0.html)
- [RFC 7636 (PKCE)](https://datatracker.ietf.org/doc/html/rfc7636)
- [jose ライブラリ（RP 側の署名検証で推奨）](https://github.com/panva/jose)
- [Authlib（Python 用）](https://authlib.org/)
- [OIDC_PROVIDER.md](./OIDC_PROVIDER.md) — Provider 側の設計判断
