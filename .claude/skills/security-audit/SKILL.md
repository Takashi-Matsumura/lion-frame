---
name: セキュリティ監査
description: OWASP Top 10、認証・認可、依存パッケージ脆弱性、機密情報漏洩の検出。セキュリティレビュー、脆弱性対応、本番デプロイ前チェック時に使用。
---

# セキュリティ監査ガイド

## LionFrameセキュリティ基盤

| 機能 | 実装 | ファイル |
|------|------|---------|
| 認証 | NextAuth.js v5（Credentials + WebAuthn、JWT 戦略） | `apps/web/auth.ts`, `apps/web/auth.config.ts` |
| LDAP認証 | OpenLDAP + Legacy LDAP | `lib/ldap/` |
| パスキー | WebAuthn / FIDO2（`@simplewebauthn/server`）| `lib/webauthn/`, `app/api/user/webauthn/`, `app/api/auth/webauthn/` |
| OIDC Provider | 社内 RP 向け | `app/api/oidc/`, `lib/services/oidc/` |
| Cookie署名 | HMAC-SHA256 | `lib/services/cookie-signer.ts` |
| フィールド暗号化 | AES-256-GCM | `lib/services/field-encryption.ts` |
| レート制限 | スライディングウィンドウ | `lib/services/rate-limiter.ts` |
| セキュリティヘッダ | X-Content-Type-Options等 | `apps/web/middleware.ts` |
| 監査ログ | 操作記録 | `lib/services/audit-service.ts` |

## OWASP Top 10 チェック

### A01: アクセス制御の不備

```typescript
// 全APIルートで認証チェック
const session = await auth();
if (!session?.user) {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

// ロールベースアクセス制御
if (!["ADMIN", "MANAGER"].includes(session.user.role)) {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

// オブジェクトレベルの認可（自分のデータのみアクセス）
const resource = await prisma.resource.findUnique({ where: { id } });
if (resource.userId !== session.user.id && session.user.role !== "ADMIN") {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}
```

**チェックポイント:**
- [ ] 全API/Server Actionsに認証チェックがあるか
- [ ] ロール階層（GUEST→USER→MANAGER→EXECUTIVE→ADMIN）が正しく適用されているか
- [ ] 他ユーザのリソースにアクセスできないか（IDOR）
- [ ] `canAccessMenu()`, `canAccessModule()` を使用しているか

### A02: 暗号化の失敗

```typescript
// フィールド暗号化の使用
import { FieldEncryption } from "@/lib/services/field-encryption";

// 機密データの暗号化
const encrypted = FieldEncryption.encrypt(sensitiveData);
await prisma.config.create({ data: { value: encrypted } });

// 復号
const decrypted = FieldEncryption.decrypt(encrypted);
```

**チェックポイント:**
- [ ] パスワードはハッシュ化されているか（平文保存禁止）
- [ ] APIキー等の機密データはフィールド暗号化されているか
- [ ] HTTPS/TLSが本番で有効か
- [ ] AUTH_SECRETが十分な長さか（32文字以上）

### A03: インジェクション

```typescript
// Prismaのパラメータ化クエリ（安全）
await prisma.user.findMany({ where: { name: userInput } });

// $queryRawは要注意 → Prisma.sqlテンプレートを使用
await prisma.$queryRaw(Prisma.sql`SELECT * FROM users WHERE name = ${userInput}`);

// ❌ 絶対禁止
await prisma.$queryRawUnsafe(`SELECT * FROM users WHERE name = '${userInput}'`);
```

**チェックポイント:**
- [ ] `$queryRawUnsafe` を使用していないか
- [ ] ユーザ入力がHTMLに直接埋め込まれていないか（XSS）
- [ ] `dangerouslySetInnerHTML` を使用していないか
- [ ] LDAPインジェクション対策（検索フィルタのエスケープ）

### A04: 安全でない設計

**チェックポイント:**
- [ ] レート制限が認証エンドポイントに適用されているか
- [ ] ファイルアップロードにサイズ・タイプ制限があるか
- [ ] エラーメッセージに内部情報が含まれていないか

### A05: セキュリティ設定ミス

**チェックポイント:**
- [ ] `.env` が `.gitignore` に含まれているか
- [ ] デバッグモードが本番で無効か
- [ ] 不要なAPIエンドポイントが公開されていないか
- [ ] CORSが適切に設定されているか

### A07: 認証の失敗

```typescript
// レート制限の確認
import { RateLimiter } from "@/lib/services/rate-limiter";

// ログイン試行の制限
const limiter = new RateLimiter({ maxAttempts: 5, windowMs: 15 * 60 * 1000 });
```

**チェックポイント:**
- [ ] ログイン試行にレート制限があるか
- [ ] セッションタイムアウトが適切か
- [ ] パスキー（WebAuthn）が登録・ログインで利用可能か
- [ ] パスキー登録/認証が `userVerification: required` / `residentKey: required` で構成されているか
- [ ] パスワード変更時に旧パスワードの確認があるか
- [ ] パスワード無しユーザのパスキー最後 1 件削除がガードされているか（アカウントロックアウト防止）

### A08: ソフトウェアとデータの整合性の失敗

**チェックポイント:**
- [ ] Cookie署名（HMAC-SHA256）が使用されているか
- [ ] JWTトークンの検証が正しいか
- [ ] npm audit で既知の脆弱性がないか

### A09: セキュリティログと監視の失敗

```typescript
// 監査ログの記録
import { AuditService } from "@/lib/services/audit-service";

await AuditService.log({
  action: "USER_DELETE",
  category: "USER_MANAGEMENT",
  userId: session.user.id,
  targetId: deletedUserId,
  targetType: "User",
  details: { deletedUserName: user.email },
}).catch(() => {});
```

**チェックポイント:**
- [ ] 管理者操作が監査ログに記録されているか
- [ ] ログイン成功/失敗が記録されているか
- [ ] セキュリティイベントで通知が発行されているか

## 依存パッケージ監査

### 定期チェック

```bash
# npm audit で脆弱性確認
npm audit

# 修正可能な脆弱性を自動修正
npm audit fix

# 重大な脆弱性のみ表示
npm audit --audit-level=high
```

### 既知の問題

| パッケージ | 問題 | 対応 |
|-----------|------|------|
| ~~xlsx~~ | ~~未修正の脆弱性あり~~ | ExcelJSに移行済み |
| minimatch/glob | Jest依存（開発のみ） | 本番影響なし |

## セキュリティヘッダ

`middleware.ts` で設定されるヘッダ:

| ヘッダ | 値 | 目的 |
|--------|-----|------|
| X-Content-Type-Options | nosniff | MIMEタイプスニッフィング防止 |
| X-Frame-Options | DENY | クリックジャッキング防止 |
| X-XSS-Protection | 1; mode=block | XSSフィルタ有効化 |
| Strict-Transport-Security | max-age=31536000 | HTTPS強制 |
| Referrer-Policy | strict-origin-when-cross-origin | リファラ制御 |

## 監査実行手順

### 1. 静的解析

```bash
# Biomeによるコード品質チェック
npm run lint

# TypeScript型チェック
npx tsc --noEmit

# 依存パッケージ脆弱性チェック
npm audit
```

### 2. 認証・認可レビュー

```bash
# APIルートの認証チェック漏れを検索
# auth() の呼び出しがないAPIルートを特定
```

対象ファイル:
- `apps/web/app/api/**/route.ts`
- `apps/web/middleware.ts`
- `apps/web/auth.ts`, `apps/web/auth.config.ts`

### 3. 機密情報チェック

```bash
# .envファイルがコミットされていないか確認
git log --all --full-history -- .env

# ハードコードされた機密情報を検索
# password, secret, api_key, token 等のパターン
```

### 4. テスト実行

```bash
# セキュリティ関連テスト
npm run test -- --testPathPatterns="access-control|security"

# 全テスト
npm run test
```

## チェックリスト

セキュリティ監査時:

- [ ] 全APIルートに認証・認可チェックがあるか
- [ ] Prismaクエリに$queryRawUnsafeがないか
- [ ] dangerouslySetInnerHTMLがないか
- [ ] 機密情報がクライアントに露出していないか
- [ ] レート制限が認証エンドポイントに適用されているか
- [ ] 監査ログが管理者操作で記録されているか
- [ ] npm audit に重大な脆弱性がないか
- [ ] セキュリティヘッダが設定されているか
- [ ] Cookie署名が使用されているか
- [ ] フィールド暗号化が機密データに適用されているか
