# フルハイトパネル（画面固定＋コンテンツ内スクロール）

画面全体のスクロールを抑制し、パネルをウィンドウいっぱいに広げてコンテンツ側だけ縦スクロールさせるパターン。

## いつ使うか

- テーブルやリストが増減するタブ・ページ
- ヘッダー・ツールバーを常に画面上部に固定したい場合
- 管理画面のように一覧表示がメインのレイアウト

## 基本構造

```
外側コンテナ（fixed / flex flex-col）
  └─ flex-1 overflow-hidden          ← ページスクロール抑制
      └─ h-full flex flex-col p-6    ← 高さを埋める内側ラッパー
          └─ Card flex-1 flex flex-col min-h-0
              └─ CardContent flex-1 flex flex-col min-h-0
                  ├─ ツールバー / ページネーション（固定高さ）
                  └─ テーブルコンテナ flex-1 flex flex-col min-h-0
                      └─ overflow-y-auto flex-1
                          └─ Table（sticky ヘッダー付き）
```

## 実装のポイント

### 1. 外側のスクロール切り替え

対象タブがアクティブな場合のみ `overflow-hidden`、それ以外は `overflow-y-auto`。

```tsx
<div className={`flex-1 ${
  ["users", "access-keys", "announcements"].includes(activeTab)
    ? "overflow-hidden"
    : "overflow-y-auto"
}`}>
```

### 2. flexチェーンを途切れさせない

親から子まで `flex-1 flex flex-col min-h-0` を連鎖させる。
`min-h-0` がないとflex子要素がコンテンツサイズ以下に縮まない。

```tsx
<Card className="flex-1 flex flex-col min-h-0">
  <CardContent className="p-6 flex-1 flex flex-col min-h-0">
    {/* 固定高さの要素（検索バー、ページネーション等） */}
    <div className="flex items-center justify-between mb-4">...</div>

    {/* スクロール対象のコンテンツ */}
    <div className="rounded-lg border overflow-hidden flex-1 flex flex-col min-h-0">
      <div className="overflow-y-auto flex-1">
        <Table>
          <TableHeader className="sticky top-0 bg-muted/50 z-10">
            ...
          </TableHeader>
          <TableBody>...</TableBody>
        </Table>
      </div>
    </div>
  </CardContent>
</Card>
```

### 3. テーブルヘッダーの固定

`overflow-y-auto` の直下のテーブルで `sticky top-0` + 背景色 + `z-10` を指定。

```tsx
<TableHeader className="sticky top-0 bg-muted/50 z-10">
```

### 4. リスト表示の場合（テーブル以外）

アナウンス一覧のようなカード型リストでも同じパターンを適用できる。

```tsx
<div className="flex-1 overflow-y-auto space-y-4 min-h-0">
  {items.map(item => (
    <div key={item.id} className="p-4 rounded-lg border">...</div>
  ))}
</div>
```

## 適用済みの画面

| 画面 | ファイル |
|------|---------|
| ユーザ管理タブ | `apps/web/app/admin/AdminClient.tsx` |
| アクセスキータブ | `apps/web/components/AccessKeyManager.tsx` |
| アナウンスタブ | `apps/web/app/admin/AdminClient.tsx` |

## よくある落とし穴

- **`min-h-0` の付け忘れ**: flexbox の子要素はデフォルトで `min-height: auto`。これがないと親の高さを超えてコンテンツが溢れ、スクロールが効かない
- **flexチェーンの途切れ**: 途中の要素に `flex flex-col` がないとそこで高さの伝搬が止まる
- **Fragment (`<>`) の使用**: Fragment はクラスを持てないので、flex レイアウトが必要な箇所では `<div>` に置き換える
