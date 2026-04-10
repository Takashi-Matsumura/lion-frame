---
name: 通知機能ガイド
description: NotificationServiceの使い方、通知タイプ・優先度、APIエンドポイント、Web Pushプッシュ通知の実装。新機能実装時の通知発行、通知センター拡張、プッシュ通知対応時に使用。
---

# 通知機能ガイド

## 概要

アプリケーション内での重要なイベントをユーザに通知する3層のシステム。

| レイヤ | 用途 | リアルタイム性 | タブ外配信 |
|-------|------|---------------|-----------|
| **通知センター（ベル）** | 全通知の一覧・履歴 | 30秒ポーリング | ❌ |
| **トースト通知（Sonner）** | 即時UIフィードバック | 即時（明示呼び出し） | ❌ |
| **Web Pushプッシュ通知** | OSレベルの通知 | 即時 | ✅ タブを閉じていてもOK |

**データ永続化**: PostgreSQL（Prisma）
**プッシュ配信**: web-push + VAPID + Service Worker
**重要**: `NotificationService.create/broadcast` を呼ぶと **自動的にプッシュも送信される**（購読ユーザのみ）

## ファイル構成

```
apps/web/lib/
├── services/
│   ├── notification-service.ts   # 通知発行サービス（DB保存 + プッシュ送信）
│   ├── push-service.ts           # Web Pushプッシュ送信サービス
│   └── web-push.ts               # web-pushライブラリのラッパー（VAPID初期化）
├── stores/
│   └── notification-store.ts     # Zustandストア
├── hooks/
│   └── use-push-subscription.ts  # クライアント購読フック（SW登録・権限要求）
└── i18n/
    └── notifications.ts          # 翻訳

apps/web/app/api/notifications/   # アプリ内通知API
├── route.ts                      # GET/POST
├── [id]/route.ts                 # PATCH/DELETE
├── read-all/route.ts             # 一括既読
└── unread-count/route.ts         # 未読数

apps/web/app/api/push/            # プッシュ通知API
├── subscribe/route.ts            # POST/DELETE（購読管理）
└── test/route.ts                 # POST（テスト送信）

apps/web/components/notifications/
├── NotificationBell.tsx          # ベルアイコン
├── NotificationDropdown.tsx      # ドロップダウン（プッシュ購読トグルあり）
├── NotificationItem.tsx          # 個別アイテム
├── NotificationTypeIcon.tsx      # タイプ別アイコン
└── NotificationEmptyState.tsx    # 空状態

apps/web/public/
└── sw.js                         # Service Worker（プッシュイベント受信・クリック処理）

apps/web/app/(main)/settings/
└── PushNotificationSection.tsx   # 設定画面のプッシュ通知セクション
```

## 通知タイプ

| タイプ | 用途 | アイコン | 色 |
|-------|------|---------|-----|
| SYSTEM | システム通知 | Settings | 青 |
| SECURITY | セキュリティ | Shield | 赤 |
| ACTION | アクション要求 | Bell | 紫 |
| INFO | 一般情報 | Info | 灰 |
| WARNING | 警告 | AlertTriangle | 黄 |
| ERROR | エラー | AlertCircle | 赤 |

## 優先度

| 優先度 | 用途 |
|-------|------|
| URGENT | 緊急（即時対応必要） |
| HIGH | 重要なセキュリティイベント |
| NORMAL | 通常の通知 |
| LOW | 情報通知 |

## NotificationService API

### 基本インポート

```typescript
import { NotificationService } from "@/lib/services/notification-service";
```

### 特定ユーザへの通知

```typescript
// セキュリティ通知
await NotificationService.securityNotify(userId, {
  title: "New login detected",
  titleJa: "新しいログインを検出しました",
  message: "You have logged in successfully.",
  messageJa: "正常にログインしました。",
});

// システム通知
await NotificationService.systemNotify(userId, {
  title: "Settings updated",
  titleJa: "設定が更新されました",
  message: "Your preferences have been saved.",
  messageJa: "設定が保存されました。",
});

// アクション通知（クリック可能なリンク付き）
await NotificationService.actionNotify(userId, {
  title: "Approval required",
  titleJa: "承認が必要です",
  message: "A new request is pending your review.",
  messageJa: "新しいリクエストが承認待ちです。",
  actionUrl: "/approvals/123",
  actionLabel: "Review",
  actionLabelJa: "確認する",
});
```

### ブロードキャスト通知（特定ロールへ）

```typescript
await NotificationService.broadcast({
  role: "ADMIN",              // 対象ロール
  type: "SYSTEM",
  priority: "HIGH",
  title: "Configuration updated",
  titleJa: "設定が更新されました",
  message: "LDAP configuration has been changed.",
  messageJa: "LDAP設定が変更されました。",
  source: "LDAP",             // オプション: 通知元
});
```

### カスタム通知

```typescript
await NotificationService.create({
  userId: "user-id",
  type: "WARNING",
  priority: "NORMAL",
  title: "Session expiring",
  titleJa: "セッションが期限切れ間近です",
  message: "Your session will expire in 5 minutes.",
  messageJa: "セッションは5分後に期限切れになります。",
  expiresAt: new Date(Date.now() + 5 * 60 * 1000), // オプション: 有効期限
  metadata: { sessionId: "abc123" },               // オプション: メタデータ
});
```

## 実装パターン

### APIルートでの通知発行

```typescript
// app/api/example/route.ts
import { NotificationService } from "@/lib/services/notification-service";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // ビジネスロジック
    const result = await doSomething();

    // 対象ユーザに通知
    await NotificationService.securityNotify(session.user.id, {
      title: "Action completed",
      titleJa: "アクションが完了しました",
      message: "Your request has been processed.",
      messageJa: "リクエストが処理されました。",
    }).catch((err) => {
      // 通知失敗はログのみ、メイン処理には影響させない
      console.error("[Example] Failed to create notification:", err);
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
```

### 管理者への一斉通知

```typescript
// 全管理者に通知
await NotificationService.broadcast({
  role: "ADMIN",
  type: "SECURITY",
  priority: "HIGH",
  title: "User account deleted",
  titleJa: "ユーザーアカウントが削除されました",
  message: `User "${deletedUser.name}" has been deleted.`,
  messageJa: `ユーザー「${deletedUser.name}」が削除されました。`,
  source: "ADMIN",
  metadata: { userId: deletedUser.id },
}).catch((err) => {
  console.error("[Admin] Failed to create notification:", err);
});
```

## 現在の通知トリガー

### セキュリティイベント（対象ユーザへ通知）

| イベント | ファイル |
|---------|---------|
| ログイン成功（OpenLDAP） | `auth.ts` |
| ログイン成功（Google） | `auth.config.ts` |
| 2FA有効化 | `app/api/user/two-factor/enable/route.ts` |
| 2FA無効化 | `app/api/user/two-factor/disable/route.ts` |
| パスワード変更 | `app/api/auth/change-password/route.ts` |
| ロール変更 | `app/api/admin/change-role/route.ts` |
| アクセスキー作成/変更/削除 | `app/api/admin/access-keys/route.ts` |

### システムイベント（全管理者へ通知）

| イベント | ファイル |
|---------|---------|
| ユーザ削除 | `app/api/admin/users/[id]/route.ts` |
| OpenLDAP設定変更 | `app/api/admin/openldap-config/route.ts` |
| LDAP移行設定変更 | `app/api/admin/ldap-migration/route.ts` |
| 旧LDAP設定変更 | `app/api/admin/ldap-migration/route.ts` |
| モジュール有効/無効 | `app/api/admin/modules/route.ts` |

## 注意事項

### 通知は自動生成されない

新機能を実装する際、通知が必要な場合は開発者が明示的に `NotificationService` を呼び出す必要があります。

### 通知失敗はメイン処理に影響させない

```typescript
// ✅ 推奨: catch でログのみ
await NotificationService.securityNotify(userId, {...}).catch((err) => {
  console.error("Failed to create notification:", err);
});

// ❌ 避ける: 通知失敗で処理全体を失敗させる
await NotificationService.securityNotify(userId, {...}); // エラーがスローされる可能性
```

### 多言語対応を忘れない

```typescript
// ✅ 英語・日本語両方を指定
{
  title: "New login detected",
  titleJa: "新しいログインを検出しました",
  message: "You have logged in successfully.",
  messageJa: "正常にログインしました。",
}

// ❌ 英語のみ
{
  title: "New login detected",
  message: "You have logged in successfully.",
}
```

## Web Pushプッシュ通知

### 概要

**重要: 開発者が意識する必要はほぼありません。** `NotificationService.create()` / `broadcast()` を呼べば、購読済みユーザには自動でプッシュも送信されます。この仕組みを理解することで、既存通知をプッシュ対応にする追加コードは不要になります。

```
イベント発生
  ↓
NotificationService.create/broadcast
  ↓
PostgreSQL保存 + PushService.sendToUser（非同期・fire-and-forget）
  ↓
web-push + VAPID
  ↓
ブラウザのプッシュサービス（FCM等）
  ↓
Service Worker (sw.js) が受信
  ↓
OSの通知センターに表示
```

### アーキテクチャ

| レイヤ | ファイル | 責務 |
|-------|---------|------|
| **サービス（送信側）** | `lib/services/push-service.ts` | ユーザ単位の送信、失効サブスクリプション自動削除 |
| **ライブラリラッパー** | `lib/services/web-push.ts` | web-pushの遅延初期化・VAPID設定 |
| **APIルート** | `app/api/push/subscribe/route.ts` | サブスクリプション登録・解除 |
| **APIルート（テスト）** | `app/api/push/test/route.ts` | テスト通知送信（動作確認用） |
| **クライアントフック** | `lib/hooks/use-push-subscription.ts` | SW登録、権限要求、購読/解除 |
| **Service Worker** | `public/sw.js` | pushイベント受信、OS通知表示、クリック処理 |
| **UI（設定）** | `app/(main)/settings/PushNotificationSection.tsx` | 購読トグル + テスト送信 + OS別ガイド |
| **UI（ドロップダウン）** | `components/notifications/NotificationDropdown.tsx` | 購読トグル（GUEST向け） |

### Prismaモデル

```prisma
model PushSubscription {
  id        String   @id @default(cuid())
  userId    String
  endpoint  String   @unique    // プッシュサービスのエンドポイント（自然な重複防止キー）
  p256dh    String              // 暗号化公開鍵
  auth      String              // 認証シークレット
  userAgent String?             // デバイス識別用（オプション）
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
}
```

`User` モデルには `pushSubscriptions PushSubscription[]` リレーションが必要。

### 環境変数（VAPIDキー）

```env
NEXT_PUBLIC_VAPID_PUBLIC_KEY=""  # クライアント・サーバ両方で使用
VAPID_PRIVATE_KEY=""              # サーバサイドのみ
```

**VAPIDキー生成:**
```bash
npx web-push generate-vapid-keys --json
```

**重要: `NEXT_PUBLIC_*` 変数は開発サーバの再起動が必要。** ホットリロードでは反映されません。

### PushService API

```typescript
import { PushService } from "@/lib/services/push-service";

// 特定ユーザの全デバイスへ送信
await PushService.sendToUser(userId, {
  title: "Title",
  body: "Body text",
  url: "/dashboard",    // クリック時のナビゲーション先
  type: "INFO",
  tag: "notification-123",  // 同種の通知をグルーピング
});

// 複数ユーザへ一括送信
await PushService.sendToUsers([userId1, userId2], {
  title: "Broadcast",
  body: "Message",
});
```

**エラー時の挙動:**
- HTTPステータス `410 Gone` / `404 Not Found`: 期限切れサブスクリプションとして自動削除
- その他のエラー: ログ出力のみ、処理は継続

### NotificationServiceとの統合

`NotificationService.create()` と `broadcast()` は内部で自動的に `PushService` を呼び出します。開発者が追加で何かする必要はありません。

```typescript
// これだけでDB保存 + プッシュ送信が両方行われる
await NotificationService.create({
  userId,
  type: "INFO",
  title: "Hello",
  titleJa: "こんにちは",
  message: "World",
  messageJa: "世界",
  actionUrl: "/dashboard",
});
```

**バイリンガル対応:** `create()` は送信時にユーザの `language` カラムを参照し、`ja` の場合は `titleJa` / `messageJa` を使用します。

**注意: `broadcast()` は英語版のみ送信します**（パフォーマンス上、ユーザごとのクエリを避けるため）。ユーザ単位でバイリンガルプッシュが必要なら `create()` を使ってください。

### Service Workerの動作

`public/sw.js` は以下のイベントを処理:

1. **`push` イベント**: ペイロード（JSON）を受信し、`self.registration.showNotification()` でOS通知を表示
2. **`notificationclick` イベント**: 通知クリック時にペイロードの `url` にナビゲーション
   - 既存タブがあればフォーカスして遷移
   - なければ新しいウィンドウを開く

**ペイロード形式:**
```typescript
{
  title: string;
  body: string;
  icon?: string;        // デフォルト: "/next.svg"
  url?: string;         // クリック時のナビゲーション先
  tag?: string;         // 通知グルーピング（同じtagは置き換え）
}
```

### クライアントフック `usePushSubscription`

```typescript
"use client";
import { usePushSubscription } from "@/lib/hooks/use-push-subscription";

function MyComponent() {
  const {
    isSupported,     // ServiceWorker + PushManager対応ブラウザか
    isSubscribed,    // 現在購読済みか
    isLoading,       // 処理中フラグ
    permission,      // "granted" | "denied" | "default" | "unsupported"
    subscribe,       // 購読開始（権限要求 + SW登録 + API呼び出し）
    unsubscribe,     // 購読解除
  } = usePushSubscription();

  // ...
}
```

**内部処理の順序（重要）:**
1. `Notification.requestPermission()` で明示的に権限要求（Chromeで必須）
2. `navigator.serviceWorker.ready` でSWがactiveになるのを待機
3. `pushManager.subscribe({ userVisibleOnly: true, applicationServerKey })`
4. `POST /api/push/subscribe` でサーバに登録

### next.config.tsの設定

```typescript
serverExternalPackages: ["pdf-parse", "pdfjs-dist", "sharp", "web-push"],
```

`web-push` はNode.jsのcryptoモジュールに依存するため、standaloneビルドで `serverExternalPackages` に追加する必要があります。

---

## Web Pushのハマりどころ（重要）

この機能は通常のアプリ開発では見落としがちな落とし穴が多いため、事前に把握しておくこと。

### 1. シークレットモード（プライベートブラウジング）では動作しない

**症状:** `AbortError: Registration failed - permission denied` が出る
**原因:** Service WorkerとPushManagerがシークレットモードで制限される
**対応:** 通常のブラウザウィンドウでのみ検証・利用可能

### 2. Chromeでは`Notification.requestPermission()`を明示的に呼ぶ必要がある

**症状:** `pushManager.subscribe()` が `AbortError` で失敗
**原因:** 権限要求を省略して直接 `subscribe()` を呼ぶとChromeでエラーになる
**対応:** `usePushSubscription` フック内で既に対応済み。独自実装する場合は必ず順序を守る。

### 3. Service Workerがactiveになる前にsubscribeすると失敗

**症状:** 初回購読時に稀に失敗
**原因:** `navigator.serviceWorker.register()` はregistrationを返すが、SWがactive状態になっているとは限らない
**対応:** `navigator.serviceWorker.ready` を使う（すでに対応済み）

### 4. macOSシステム設定で通知がブロックされているとすべて失敗

**症状:** 権限要求ダイアログが表示されず即座に `denied` が返る
**原因:** macOSシステム設定 > 通知 > (ブラウザ) が「オフ」
**対応:** ユーザにシステム設定の確認を促す。`PushNotificationSection` にOS別ガイドあり。

### 5. 一度`denied`されるとダイアログは二度と表示されない

**症状:** `Notification.requestPermission()` が即座に `denied` を返す
**原因:** Chromeは一度拒否されたオリジンに対して権限要求ダイアログを出さない
**対応:** アドレスバー左の🔒アイコン → サイト設定 → 通知を「許可」または「デフォルト」に変更してリロード

### 6. NEXT_PUBLIC_VAPID_PUBLIC_KEY変更後は開発サーバ再起動が必要

**症状:** 新しく追加したVAPIDキーがクライアントで `undefined`
**原因:** Next.jsは `NEXT_PUBLIC_*` 変数をビルド時にバンドルに埋め込む
**対応:** `.env` 変更後は必ず `pnpm dev` を再起動

### 7. Prismaの`db push`がdrift警告で失敗する場合の回避策

**症状:** `db push` が過去の削除済みテーブルでdata loss警告を出して停止
**対応:** 新規テーブル1つだけを追加する場合は、`prisma db execute --stdin` で直接SQLを実行する方が安全:

```bash
npx prisma db execute --schema prisma/schema.prisma --stdin <<'SQL'
CREATE TABLE IF NOT EXISTS "NewTable" (...);
CREATE UNIQUE INDEX IF NOT EXISTS "NewTable_field_key" ON "NewTable"("field");
ALTER TABLE "NewTable" ADD CONSTRAINT "NewTable_userId_fkey" ...;
SQL
```

### 8. localhostでは動作するがHTTP本番環境では動作しない

**症状:** 本番環境でプッシュが動かない
**原因:** Web PushはHTTPSが必須（例外: localhostのみ許容）
**対応:** 本番環境は必ずHTTPSで運用する

### 9. Sonnerトーストは新着通知で自動表示されない

**症状:** 新着通知が届いてもアプリ内トーストが出ない
**原因:** `notification-store.ts` のポーリングは `fetchUnreadCount()` のみで、新着検知時にSonnerを発火させる処理は未実装
**対応:** 必要なら `fetchNotifications` のポーリング化 + 新着検知ロジックの追加が必要

---

## 検証方法

### テスト送信エンドポイント

現在のユーザに1クリックでテストプッシュ通知を送れます:

```bash
curl -X POST http://localhost:3000/api/push/test \
  -H "Cookie: <session cookie>"
```

または設定画面（`/settings`）→「プッシュ通知」→「テスト通知を送信」ボタン。

### E2E検証フロー

1. 通常ブラウザ（シークレット不可）で `/settings` を開く
2. 「プッシュ通知を有効にする」→ 許可ダイアログで「許可」
3. 「テスト通知を送信」クリック
4. タブをバックグラウンドにするかブラウザを最小化
5. OSの通知センターにプッシュ通知が表示される
6. 通知クリック → `/dashboard` に遷移

### 失敗時のデバッグ手順

1. ブラウザのDevTools Console でエラーメッセージを確認
2. DevTools > Application > Service Workers でSWが `activated` か確認
3. DevTools > Application > Storage > Push Messaging でサブスクリプション状態を確認
4. サーバログで `[NotificationService] Push failed:` を検索
5. DBの `PushSubscription` テーブルで購読データの有無を確認:
   ```sql
   SELECT id, "userId", "endpoint", "createdAt" FROM "PushSubscription";
   ```

---

## チェックリスト

### 新しい通知を追加する際

- [ ] 適切な通知タイプを選択（SYSTEM/SECURITY/ACTION/INFO/WARNING/ERROR）
- [ ] 適切な優先度を設定（URGENT/HIGH/NORMAL/LOW）
- [ ] 英語・日本語両方のタイトル・メッセージを指定
- [ ] 通知失敗時は `.catch()` でログのみ
- [ ] 必要に応じて `actionUrl` / `metadata` を追加
- [ ] ブロードキャストの場合は対象ロールを明確に
- [ ] **`NotificationService.create/broadcast` を使えばプッシュ通知も自動送信される**（追加コード不要）

### プッシュ通知機能を拡張する際

- [ ] VAPIDキーが `.env` に設定されているか確認
- [ ] `next.config.ts` の `serverExternalPackages` に `web-push` があるか確認
- [ ] `public/sw.js` の変更時はブラウザで「Update on reload」を有効にしてSWを更新
- [ ] `NEXT_PUBLIC_*` 変数変更時は必ず開発サーバ再起動
- [ ] シークレットモードでのテストを避ける
- [ ] macOSではシステム設定 > 通知でブラウザが許可されているか確認
- [ ] 本番環境はHTTPSであることを確認
