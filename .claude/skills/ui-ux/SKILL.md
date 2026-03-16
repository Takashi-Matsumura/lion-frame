---
name: UI/UXデザインガイドライン
description: 共通UIコンポーネント、カラーパレット、タイポグラフィ、スペーシング、空状態デザイン。UI実装、コンポーネント作成、スタイリング時に使用。
---

# UI/UXデザインガイドライン

## テーマ・カラーシステム

### ダークモード対応

このアプリはライト/ダークモード対応。**ハードコード色は使用禁止**。

```tsx
// ❌ 禁止: ハードコード色
<div className="bg-white text-gray-800 border-gray-300">

// ✅ 推奨: セマンティックカラー
<div className="bg-card text-foreground border-input">
```

### セマンティックカラー対応表

| 用途 | セマンティック | 旧ハードコード |
|------|---------------|----------------|
| カード背景 | `bg-card` | `bg-white` |
| ページ背景 | `bg-background` | `bg-gray-50` |
| ミュート背景 | `bg-muted` | `bg-gray-50`, `bg-gray-100` |
| 主要テキスト | `text-foreground` | `text-gray-800`, `text-gray-900` |
| 副次テキスト | `text-muted-foreground` | `text-gray-500`, `text-gray-600` |
| ボーダー | `border` | `border-gray-200` |
| 入力ボーダー | `border-input` | `border-gray-300` |

### カラー背景にはdark:バリアントを追加

```tsx
// カラー背景は dark: バリアントを追加
<div className="bg-blue-50 dark:bg-blue-950">
<div className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
```

## shadcn/ui コンポーネント

### 必須インポート

```tsx
// ボタン
import { Button } from "@/components/ui/button";

// カード
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

// テーブル
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

// バッジ
import { Badge } from "@/components/ui/badge";

// ダイアログ（モーダル）
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

// 削除確認ダイアログ
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";

// 空状態
import { EmptyState } from "@/components/ui/empty-state";

// ページスケルトン（ローディング）
import { PageSkeleton } from "@/components/ui/page-skeleton";

// スイッチ
import { Switch } from "@/components/ui/switch";

// 入力
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
```

### ボタンバリアント

```tsx
<Button variant="default">主要アクション</Button>
<Button variant="secondary">副次アクション</Button>
<Button variant="destructive">削除</Button>
<Button variant="outline">アウトライン</Button>
<Button variant="ghost">ゴースト</Button>
```

## レイアウトパターン

### ページコンテナ

```tsx
// 標準ページ
<div className="max-w-7xl mx-auto">
  <Card>
    <CardContent className="p-6">
      {/* コンテンツ */}
    </CardContent>
  </Card>
</div>

// タブ付きページ（ヘッダーにタブがある場合）
<div className="max-w-7xl mx-auto mt-8">
  {/* mt-8でタブとの間隔を確保 */}
</div>
```

### テーブルレイアウト

```tsx
<Card>
  <CardContent className="p-6">
    {/* ヘッダー：タイトル + アクション */}
    <div className="flex items-center justify-between mb-6">
      <div className="flex items-center gap-3">
        <Icon className="w-6 h-6 text-primary" />
        <h2 className="text-xl font-semibold text-foreground">タイトル</h2>
      </div>
      <Button>
        <Plus className="w-4 h-4 mr-2" />
        新規作成
      </Button>
    </div>

    {/* 検索・フィルター */}
    <div className="flex items-center gap-4 mb-4">
      <Input placeholder="検索..." className="max-w-sm" />
      <Select>...</Select>
    </div>

    {/* 合計表示 */}
    <div className="text-sm text-muted-foreground mb-4">
      合計: {total}
    </div>

    {/* テーブル */}
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>カラム</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((item) => (
          <TableRow key={item.id}>
            <TableCell>{item.value}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>

    {/* ページネーション */}
    <div className="flex items-center justify-end gap-2 mt-4">
      <Button variant="outline" size="sm" disabled={page === 1}>
        前へ
      </Button>
      <span className="text-sm text-muted-foreground">
        {page} / {totalPages}
      </span>
      <Button variant="outline" size="sm" disabled={page === totalPages}>
        次へ
      </Button>
    </div>
  </CardContent>
</Card>
```

## モーダル（Dialog）

### 作成・編集フォーム用

```tsx
<Dialog open={isOpen} onOpenChange={setIsOpen}>
  <DialogContent className="sm:max-w-[500px]">
    <DialogHeader>
      <DialogTitle>新規作成</DialogTitle>
    </DialogHeader>
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">名前</Label>
        <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
          キャンセル
        </Button>
        <Button type="submit">作成</Button>
      </div>
    </form>
  </DialogContent>
</Dialog>
```

### FormModalコンポーネント（複雑なフォーム用）

```tsx
import { FormModal } from "@/components/modals/FormModal";

<FormModal
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  onSubmit={handleSubmit}
  title="新規作成"
  submitLabel="作成"
  cancelLabel="キャンセル"
  language="ja"
  maxWidth="2xl"
>
  {/* フォームフィールド */}
</FormModal>
```

## 削除確認ダイアログ（DeleteConfirmDialog）

Radix UI の `AlertDialog` をラップした削除確認専用コンポーネント。
削除確認には `Dialog` ではなく、意味的に正しいこのコンポーネントを使用する。

```tsx
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";

// シンプル（ボタンのみ）
<DeleteConfirmDialog
  open={deleteConfirmOpen}
  onOpenChange={setDeleteConfirmOpen}
  title={t.deleteItem}
  description={t.deleteConfirm}
  cancelLabel={t.cancel}
  deleteLabel={t.delete}
  disabled={saving}
  onDelete={handleDelete}
/>

// DELETE入力式（破壊的操作向け）
<DeleteConfirmDialog
  open={deleteConfirmOpen}
  onOpenChange={setDeleteConfirmOpen}
  title={t.deleteItem}
  description={t.deleteConfirm}
  cancelLabel={t.cancel}
  deleteLabel={t.delete}
  disabled={saving}
  onDelete={handleDelete}
  requireConfirmText="DELETE"
  confirmPrompt='確認のため「DELETE」と入力してください：'
/>
```

### Props

| Prop | 型 | 必須 | デフォルト | 説明 |
|------|------|------|-----------|------|
| `open` | `boolean` | ✅ | - | 表示状態 |
| `onOpenChange` | `(open: boolean) => void` | ✅ | - | 表示切り替え |
| `title` | `string` | ✅ | - | ダイアログタイトル |
| `description` | `string` | ✅ | - | 確認メッセージ |
| `cancelLabel` | `string` | - | `"Cancel"` | キャンセルボタンラベル |
| `deleteLabel` | `string` | - | `"Delete"` | 削除ボタンラベル |
| `disabled` | `boolean` | - | `false` | saving中の無効化 |
| `onDelete` | `() => void` | ✅ | - | 削除実行コールバック |
| `requireConfirmText` | `string` | - | - | 設定すると入力が一致するまで削除ボタンが無効。例: `"DELETE"` |
| `confirmPrompt` | `string` | - | `Type "XXX" to confirm:` | 確認テキスト入力欄の上に表示するラベル |

### 使用箇所

- `HolidayManagementClient.tsx`（祝日削除 — シンプル）
- `EventFormDialog.tsx`（スケジュールイベント削除 — シンプル）
- `AdminClient.tsx`（ユーザ削除・退職者一括削除 — DELETE入力式）

## 空状態（EmptyState）

データがない場合の統一表示コンポーネント。アイコン・メッセージ・サブテキスト・アクションボタンの組み合わせ。

```tsx
import { EmptyState } from "@/components/ui/empty-state";

// シンプル
<EmptyState message={t.noData} />

// アイコン + 説明テキスト付き
<EmptyState
  icon={<FaClipboardList className="w-12 h-12 text-muted-foreground" />}
  message={t.noAuditLogs}
  description={t.noAuditLogsDescription}
/>

// アクションボタン付き
<EmptyState
  icon={<FaBullhorn className="w-12 h-12 text-muted-foreground" />}
  message={t.noAnnouncements}
  action={
    <Button onClick={handleCreate} variant="outline" className="gap-2">
      <Plus className="h-4 w-4" />
      {t.createFirst}
    </Button>
  }
/>

// カスタムスタイル
<EmptyState
  message={t.noHolidays}
  description={t.noHolidaysDescription}
  className="border rounded-lg"
/>
```

### Props

| Prop | 型 | 必須 | 説明 |
|------|------|------|------|
| `icon` | `React.ReactNode` | - | アイコン要素 |
| `message` | `string` | ✅ | メインメッセージ |
| `description` | `string` | - | サブテキスト |
| `action` | `React.ReactNode` | - | アクションボタン等 |
| `className` | `string` | - | 追加クラス（`border rounded-lg` 等） |

### 使用箇所

- `AdminClient.tsx`（ユーザなし、アナウンスなし）
- `AuditLogsClient.tsx`（監査ログなし）
- `HolidayManagementClient.tsx`（祝日なし）
- `UserAccessKeySection.tsx`（アクセスキーなし）
- `OrganizationChartClient.tsx`（社員なし）

## ページスケルトン（PageSkeleton）

ページ読み込み中のスケルトン表示。ヘッダー + コンテンツ領域のプリセット。

```tsx
import { PageSkeleton } from "@/components/ui/page-skeleton";

// デフォルト（h-10 w-64 ヘッダー + h-[400px] コンテンツ）
<PageSkeleton />

// カスタムサイズ
<PageSkeleton contentHeight="h-[300px]" className="max-w-5xl mx-auto" />
```

### Props

| Prop | 型 | 必須 | デフォルト | 説明 |
|------|------|------|-----------|------|
| `headerHeight` | `string` | - | `"h-10"` | ヘッダースケルトンの高さ |
| `headerWidth` | `string` | - | `"w-64"` | ヘッダースケルトンの幅 |
| `contentHeight` | `string` | - | `"h-[400px]"` | コンテンツスケルトンの高さ |
| `className` | `string` | - | - | 外側コンテナの追加クラス |

### 使用箇所

- `HolidayManagementClient.tsx`
- `ScheduleClient.tsx`

### 注意

スピナー（`LoadingSpinner`）パターンのページには使用しない。PageSkeletonはテーブルやリストがメインのページ用。

## フォーム要素

### 標準入力

```tsx
<div className="space-y-2">
  <Label htmlFor="field">
    フィールド名 <span className="text-red-500">*</span>
  </Label>
  <Input
    id="field"
    value={value}
    onChange={(e) => setValue(e.target.value)}
    placeholder="入力してください"
  />
</div>
```

### 数値入力（NumberInputField）

フォームモジュール用のカスタム数値入力コンポーネント。ネイティブスピナーを非表示にし、大きな＋/−ボタンで操作性を向上。

```tsx
import { NumberInputField } from "@/components/business/forms/NumberInputField";

// 基本（左右ボタン配置）
<NumberInputField
  value={value}
  onChange={(v) => setValue(v)}
  placeholder="数値を入力"
/>

// 右寄せボタン配置 + 範囲制限
<NumberInputField
  value={value}
  onChange={(v) => setValue(v)}
  min={0}
  max={100}
  step={1}
  buttonLayout="right"
/>
```

| prop | 型 | デフォルト | 説明 |
|------|----|-----------|------|
| `value` | `number \| ""` | — | 現在の値 |
| `onChange` | `(v: number \| "") => void` | — | 値変更コールバック |
| `min` | `number?` | — | 最小値 |
| `max` | `number?` | — | 最大値 |
| `step` | `number?` | `1` | ＋/−ボタンの増減幅 |
| `buttonLayout` | `"sides" \| "right"` | `"sides"` | ボタン配置（左右 or 右寄せ） |
| `placeholder` | `string?` | — | プレースホルダー |

入力制御: 数字・制御キーのみ許可、`e/E/+/.`ブロック、ペースト時サニタイズ、IME（全角数字→半角変換）対応、ボタン長押しで連続増減。

### セレクト

```tsx
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

<Select value={value} onValueChange={setValue}>
  <SelectTrigger className="w-[200px]">
    <SelectValue placeholder="選択してください" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="option1">オプション1</SelectItem>
    <SelectItem value="option2">オプション2</SelectItem>
  </SelectContent>
</Select>
```

## バッジ

### ロールバッジ（ダークモード対応）

```tsx
const roleColors = {
  ADMIN: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  MANAGER: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200",
  USER: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  GUEST: "bg-muted text-muted-foreground",
};

<Badge className={roleColors[role]}>{role}</Badge>
```

### ステータスバッジ

```tsx
// 有効
<Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
  有効
</Badge>

// 無効
<Badge className="bg-muted text-muted-foreground">
  無効
</Badge>

// 警告
<Badge className="bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200">
  未登録
</Badge>
```

## タイポグラフィ

```tsx
// ページタイトル（Headerで表示）
<h1 className="text-xl font-bold text-foreground">

// セクションタイトル
<h2 className="text-xl font-semibold text-foreground">

// カードタイトル
<h3 className="text-lg font-semibold text-foreground">

// ラベル
<Label className="text-sm font-medium text-foreground">

// 本文
<p className="text-sm text-muted-foreground">

// 小さいテキスト
<span className="text-xs text-muted-foreground">
```

## スペーシング

| 用途 | クラス |
|------|--------|
| カード内パディング | `p-6` または `p-8` |
| セクション間 | `space-y-6` |
| フォーム要素間 | `space-y-4` |
| ボタン間 | `gap-3` |
| アイコンとテキスト間 | `gap-2` または `gap-3` |
| ページとヘッダータブ間 | `mt-8` |

## サイドバーメニューアイコンのアンダーバー

サイドバーのメニューアイコンには、**アドオンモジュールのみ**アイコン下部にカラーアンダーバーが表示されます。コアモジュールには表示されません。

| モジュール種別 | アンダーバー | 例 |
|--------------|------------|-----|
| **コア** (`lib/core-modules/`) | なし | system, ai, organization, schedule |
| **アドオン** (`lib/addon-modules/`) | あり（メニューグループのカラー） | 将来の追加モジュール |

### 判定ロジック

```typescript
// apps/web/components/sidebar/SidebarMenuItem.tsx
import { CORE_MODULE_IDS } from "@/lib/config/module-config";

const isAddonModule = !CORE_MODULE_IDS.has(menu.moduleId);
```

`CORE_MODULE_IDS` は `lib/config/module-config.ts` の `moduleConfigs` から自動生成されます。

**重要:** 新しいコアモジュールを `lib/core-modules/` に追加した場合、必ず `moduleConfigs` に `type: "core"` で登録すること。登録漏れがあるとサイドバーにアンダーバーが誤表示される。

### アンダーバーのスタイル

```tsx
{isAddonModule && hexColor && (
  <div
    className="absolute -bottom-1 left-0.5 right-0.5 h-0.5 rounded-full"
    style={{ backgroundColor: hexColor }}
  />
)}
```

- 高さ: `h-0.5`（2px）
- 位置: アイコン直下（`-bottom-1`）
- 色: メニューグループのカラー（ユーザ=シアン、マネージャー=グリーン等）
- 角丸: `rounded-full`

## 戻るボタン（BackButton）

**黒丸アイコン**のデザインで統一された戻るボタン。カード一覧→詳細画面の戻りや、ページ間の戻り遷移に使用する。

**重要:** 戻るボタンは必ずこのコンポーネントを使用する。`<button>` + 自作SVGで独自の戻るボタンを作らない。

### デザイン

- 黒丸（`bg-muted-foreground`）の中に白い `<` アイコン
- ホバー時に `bg-foreground` に変化
- `shadow-md` で浮き上がり感

### 使用方法

```tsx
import { BackButton } from "@/components/ui/BackButton";

// アイコンのみ（推奨）— カード一覧→詳細の戻りに最適
<BackButton onClick={() => setSelectedItem(null)} />

// ページ間遷移
<BackButton href="/parent-page" />

// ラベル付き
<BackButton href="/parent-page" label="一覧に戻る" />
```

### 使用箇所

| 画面 | パターン |
|------|---------|
| モジュール管理（詳細→一覧） | `<BackButton onClick={() => setSelectedModule(null)} />` |
| フォーム作成（エディタ→一覧） | `<BackButton onClick={handleBack} />` |

## AI翻訳ボタン（日本語 → 英語フィールド）

ダイアログやフォームで「名称（日本語）」と「英語名称」の入力フィールドがある場合、英語名称フィールドの横にAI翻訳ボタンを配置する。

### アイコン

`lucide-react` の `Languages` アイコンを使用する。

```tsx
import { Languages } from "lucide-react";
```

### 実装パターン

```tsx
<div className="space-y-2">
  <Label htmlFor="name-en">英語名称</Label>
  <div className="flex gap-2">
    <Input
      id="name-en"
      value={form.nameEn}
      onChange={(e) => setForm((f) => ({ ...f, nameEn: e.target.value }))}
    />
    <Button
      type="button"
      variant="outline"
      size="icon"
      className="shrink-0 h-9 w-9"
      disabled={translating || !form.name.trim()}
      onClick={handleTranslate}
      title={t.translate}
    >
      <Languages className="h-4 w-4" />
    </Button>
  </div>
</div>
```

### ルール

- ボタンは `size="icon"` で `h-9 w-9`（Inputの高さに揃える）
- `title` 属性でツールチップ表示（「翻訳」/「Translate」）
- 日本語名称が未入力の場合は `disabled`
- 翻訳中も `disabled`（二重送信防止）
- 翻訳APIは `POST /api/calendar/holidays/translate`（`{ name: string }` → `{ nameEn: string }`）を参考に、各機能のAPIルートに配置

## 右サイドパネル（ポータル方式）

左サイドバーと同じレイアウトレベルに、`createPortal` で右サイドパネルを配置するパターン。
コンテンツ領域の横幅が自然に詰まり、オーバーラップしない。

### アーキテクチャ

```
sidebar-wrapper (flex row)
├── AppSidebar（左サイドバー）
├── SidebarInset（メインコンテンツ flex-1）
│   └── <main class="container mx-auto px-4 py-8 pt-24">
│       └── ページコンポーネント
└── 右サイドパネル ← createPortal でここに追加
```

**ポイント:** ページコンポーネントは `<main class="container mx-auto">` 内にあるため、ページ内にパネルを置くと padding の影響を受ける。`sidebar-wrapper` にポータルで追加することで、左サイドバーと同じflexレベルに配置し、メインコンテンツが自然に幅を詰める。

### 実装パターン

```tsx
"use client";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Bot } from "lucide-react"; // 任意のアイコン

export function MyPageClient() {
  const [panelOpen, setPanelOpen] = useState(false);
  const [portalTarget, setPortalTarget] = useState<Element | null>(null);

  useEffect(() => {
    setPortalTarget(document.querySelector('[data-slot="sidebar-wrapper"]'));
  }, []);

  return (
    <div>
      {/* メインコンテンツ */}

      {/* 右サイドパネル（ポータル） */}
      {portalTarget &&
        createPortal(
          <div
            className={`shrink-0 border-l bg-background transition-[width] duration-200 overflow-hidden ${
              panelOpen ? "w-80" : "w-10"
            }`}
          >
            <div
              className={`sticky top-0 h-svh pt-14 ${
                panelOpen ? "w-80" : "w-10"
              }`}
            >
              {panelOpen ? (
                <PanelContent onClose={() => setPanelOpen(false)} />
              ) : (
                <button
                  type="button"
                  className="w-full h-full flex flex-col items-center pt-4 gap-3 hover:bg-accent/50 transition-colors cursor-pointer"
                  onClick={() => setPanelOpen(true)}
                >
                  <Bot className="h-5 w-5 text-muted-foreground shrink-0" />
                  <span className="text-xs text-muted-foreground [writing-mode:vertical-rl]">
                    パネル名
                  </span>
                </button>
              )}
            </div>
          </div>,
          portalTarget,
        )}
    </div>
  );
}
```

### 構造の要点

| 要素 | クラス | 説明 |
|------|--------|------|
| 外枠（フロー用） | `shrink-0 border-l bg-background` | flex内でスペースを確保 |
| 幅切り替え | `w-80`（展開）/ `w-10`（畳み込み） | `transition-[width] duration-200` でアニメーション |
| 内枠（固定用） | `sticky top-0 h-svh pt-14` | スクロールしても固定。`pt-14` でヘッダー（`z-[8]` fixed）の下から開始 |
| 畳み込みレール | `[writing-mode:vertical-rl]` | アイコン＋縦書きラベルで省スペースなトグル |

### 注意事項

- `pt-14` はフレームヘッダーの高さに合わせる（ヘッダーが `fixed z-[8]` のため、パネルの中身がヘッダーの下に隠れるのを防ぐ）
- 初期状態は畳み込み（`w-10`）を推奨。畳み込みレールにアイコンとラベルを表示
- パネル内コンポーネントは `flex flex-col h-full` で構成し、ヘッダー・コンテンツ（ScrollArea）・フッター（入力欄等）の3分割が基本
- 既存実装例: `apps/web/app/(menus)/(user)/schedule/ScheduleClient.tsx` + `ScheduleConcierge.tsx`

## カード一覧 → 詳細画面パターン（同一メニュー内遷移）

1つのメニュー内で「カード一覧 → 詳細・編集画面」の遷移が必要な場合、**URLを変更せず state ベースで画面を切り替える**。
ユーザーはアプリ全体で一貫した操作体験を得られる。

### 原則

- **URLは変わらない**: `/form-builder` のまま、一覧と詳細を切り替える（`/form-builder/[id]` のようなサブページは作らない）
- **BackButton で戻る**: 詳細画面の左上に `BackButton`（onClick版）を配置
- **state で切り替え**: `selectedItemId` が `null` → 一覧、`!null` → 詳細
- **一覧に戻る際にリロード**: `handleBack` で選択解除 + データ再取得

### 実装パターン

```tsx
"use client";
import { useState, useCallback } from "react";
import { BackButton, Card, PageSkeleton } from "@/components/ui";

export function MyListDetailClient() {
  // null = 一覧表示、string = 詳細表示
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [items, setItems] = useState([]);
  const [detailData, setDetailData] = useState(null);

  const handleBack = useCallback(() => {
    setSelectedId(null);
    setDetailData(null);
    loadItems(); // 一覧データを再取得
  }, []);

  const openDetail = useCallback(async (id: string) => {
    setSelectedId(id);
    // 詳細データを取得...
  }, []);

  // ─── 詳細画面 ───
  if (selectedId) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <BackButton onClick={handleBack} />
          <div>
            <h2 className="text-lg font-semibold">{detailData.title}</h2>
            <Badge>ステータス</Badge>
          </div>
        </div>
        {/* 詳細コンテンツ */}
      </div>
    );
  }

  // ─── 一覧画面 ───
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => (
        <Card key={item.id} onClick={() => openDetail(item.id)}>
          {/* カードコンテンツ */}
        </Card>
      ))}
    </div>
  );
}
```

### 既存実装例

| 画面 | ファイル |
|------|---------|
| モジュール管理 | `app/admin/components/ModulesTab.tsx`（`selectedModule` state） |
| フォーム作成 | `app/(menus)/(manager)/form-builder/FormBuilderClient.tsx`（`selectedFormId` state） |

### 注意

- 詳細画面でのデータ変更後、一覧に戻る際は必ず `loadItems()` を呼んで一覧データを再取得する
- 詳細画面のローディング中も `PageSkeleton` を表示
- カード内のアクションボタン（削除・公開等）は `onClick={(e) => e.stopPropagation()}` でカードのクリックイベント伝播を止める

## チェックリスト

新しいUIを作成する際:

- [ ] ハードコード色を使用していない（`bg-white`, `text-gray-*` など禁止）
- [ ] セマンティックカラーを使用（`bg-card`, `text-foreground` など）
- [ ] カラー背景には `dark:` バリアントを追加
- [ ] shadcn/ui コンポーネントを使用
- [ ] 適切なスペーシングを適用
- [ ] 空状態は `EmptyState` コンポーネントを使用
- [ ] 削除確認は `DeleteConfirmDialog` を使用（`Dialog` で自作しない）
- [ ] ページローディングは `PageSkeleton` を使用（テーブル/リスト系ページ）
- [ ] モバイル対応を考慮
- [ ] 日本語→英語のフィールドペアがある場合、AI翻訳ボタンを配置
- [ ] カード一覧→詳細の画面遷移は state ベース切り替え（URL変更なし、BackButtonで戻る）
