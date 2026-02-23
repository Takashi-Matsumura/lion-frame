---
name: コードレビュー
description: アーキテクチャ、セキュリティ、パフォーマンス、品質の多角的レビュー。PRレビュー、コード品質改善、リファクタリング判断時に使用。
---

# コードレビューガイド

## レビュー観点

コードレビューは以下の5つの観点で実施します。

| 観点 | 重要度 | チェック内容 |
|------|--------|-------------|
| セキュリティ | 最高 | 認証・認可、インジェクション、機密情報漏洩 |
| 正確性 | 高 | ロジック、エッジケース、型安全性 |
| アーキテクチャ | 高 | モジュール構造、責務分離、依存関係 |
| パフォーマンス | 中 | N+1、不要な再レンダリング、メモリリーク |
| 保守性 | 中 | 命名、可読性、DRY原則 |

## セキュリティチェック

### 認証・認可

```typescript
// チェック: 全APIルートで認証チェックがあるか
const session = await auth();
if (!session?.user) {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

// チェック: ロールベースのアクセス制御
if (session.user.role !== "ADMIN") {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

// チェック: Server Actionsでも認証チェック
"use server";
const session = await auth();
if (!session) redirect("/login");
```

### インジェクション対策

```typescript
// SQL: Prismaのパラメータ化クエリを使用（$queryRawは要注意）
// ✅ 安全
await prisma.user.findMany({ where: { name: userInput } });

// ❌ 危険
await prisma.$queryRawUnsafe(`SELECT * FROM users WHERE name = '${userInput}'`);

// XSS: dangerouslySetInnerHTML は原則禁止
// ✅ Reactの自動エスケープを利用
<p>{userContent}</p>

// ❌ XSSリスク
<div dangerouslySetInnerHTML={{ __html: userContent }} />
```

### 機密情報

```typescript
// チェック: パスワード・シークレットがレスポンスに含まれていないか
const { password, ...safeUser } = user;
return NextResponse.json(safeUser);

// チェック: .envの値がクライアントに露出していないか
// NEXT_PUBLIC_ プレフィックスの変数のみクライアントに公開
```

## アーキテクチャチェック

### LionFrameモジュール構造

```typescript
// チェック: menuGroupとURLパスが一致しているか
// ✅ 正しい
{ path: "/manager/approvals", menuGroup: "manager" }

// ❌ 不一致
{ path: "/admin/dashboard", menuGroup: "user" }

// チェック: コアモジュール（apps/web/lib/core-modules/）を直接編集していないか
// チェック: アドオンモジュールはapps/web/lib/addon-modules/に配置されているか
// チェック: 共通UIコンポーネント（apps/web/components/ui/）を使用しているか
```

### Server/Client Component分離

```typescript
// チェック: "use client" が本当に必要か
// - useState, useEffect等のhooksを使用 → Client必要
// - イベントハンドラ（onClick等）を使用 → Client必要
// - サーバサイドデータ取得のみ → Server Componentで十分

// チェック: 2層構造になっているか
// page.tsx (Server) → XxxClient.tsx (Client)
```

### Prismaクエリ

```typescript
// チェック: N+1問題
// ❌ N+1
const users = await prisma.user.findMany();
for (const user of users) {
  const posts = await prisma.post.findMany({ where: { userId: user.id } });
}

// ✅ includeで一括取得
const users = await prisma.user.findMany({
  include: { posts: true },
});

// チェック: selectで必要なフィールドのみ取得
const users = await prisma.user.findMany({
  select: { id: true, name: true, email: true },
});

// チェック: トランザクションが必要な複数操作
await prisma.$transaction([
  prisma.user.update({ ... }),
  prisma.auditLog.create({ ... }),
]);
```

## パフォーマンスチェック

### React再レンダリング

```typescript
// チェック: useCallbackでメモ化されているか
// チェック: 依存配列が正しいか（react-hooksスキル参照）
// チェック: 重いコンポーネントにReact.memoを検討

// チェック: Zustandストアの選択的サブスクリプション
// ✅ 必要なプロパティのみ
const count = useStore((state) => state.count);

// ❌ ストア全体（不要な再レンダリング）
const store = useStore();
```

### データ取得

```typescript
// チェック: Server Componentでのデータ取得（クライアントfetchより効率的）
// チェック: 大量データのページネーション
// チェック: 不要なAPI呼び出しの重複
```

## 多言語対応チェック

```typescript
// チェック: ハードコードされた文字列がないか
// ❌ ハードコード
<h1>Dashboard</h1>

// ✅ 翻訳使用
<h1>{t.title}</h1>

// チェック: translations.tsに as const があるか
// チェック: 英語・日本語の両方が定義されているか
```

## コードスタイルチェック

```typescript
// チェック: Biome 2のルールに準拠しているか
// npm run lint で確認

// チェック: セマンティックカラーを使用しているか（ui-uxスキル参照）
// ❌ bg-white, text-gray-800
// ✅ bg-card, text-foreground

// チェック: カタカナ表記が統一されているか（terminologyスキル参照）
// ❌ サーバー、ユーザー
// ✅ サーバ、ユーザ
```

## レビュー手順

### 1. 変更範囲の把握

```bash
# 変更ファイル一覧
git diff --name-only main...HEAD

# 変更統計
git diff --stat main...HEAD
```

### 2. 優先順チェック

1. **APIルート** (`apps/web/app/api/`) → セキュリティ最優先
2. **Prismaスキーマ** (`apps/web/prisma/schema.prisma`) → データモデル変更の影響
3. **モジュール定義** (`apps/web/lib/modules/`, `apps/web/lib/addon-modules/`) → アーキテクチャ整合性
4. **ページコンポーネント** (`apps/web/app/(menus)/`) → UI/UX、多言語対応
5. **共通コンポーネント** (`apps/web/components/`) → 既存との一貫性

### 3. レビューコメントの書き方

| プレフィックス | 意味 | 対応 |
|--------------|------|------|
| `[MUST]` | セキュリティ・バグ。修正必須 | マージブロック |
| `[SHOULD]` | 品質改善。強く推奨 | 議論可能 |
| `[NIT]` | 軽微な指摘。任意 | 対応不要でも可 |
| `[Q]` | 質問。意図の確認 | 回答をもらう |

## チェックリスト

PRレビュー時:

- [ ] 全APIルートに認証チェックがあるか
- [ ] Prismaクエリに N+1 がないか
- [ ] menuGroupとURLパスが一致しているか
- [ ] 翻訳が英語・日本語両方定義されているか
- [ ] セマンティックカラーを使用しているか
- [ ] "use client" が必要な箇所のみか
- [ ] 機密情報がレスポンスに含まれていないか
- [ ] エラーハンドリングが適切か
- [ ] テストが追加/更新されているか（API変更時）
