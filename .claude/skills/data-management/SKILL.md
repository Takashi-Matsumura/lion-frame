---
name: データインポート・履歴管理
description: BaseImporterを使ったデータインポート、履歴管理フレームワーク。データインポート機能追加、履歴記録実装時に使用。
---

# データインポート・履歴管理フレームワーク

## データインポートアーキテクチャ

```
apps/web/lib/importers/
  ├── base-importer.ts              # フレーム層：汎用インポーター基底クラス
  └── organization/                 # モジュール層：組織図専用
      ├── types.ts                  # 型定義（ImportRow, ProcessedEmployee）
      ├── column-mapping.ts         # カラム定義・エイリアス解決
      ├── xlsx-parser.ts            # サーバーサイドXLSXパーサー（ExcelJS）
      ├── parser.ts                 # データ変換（ImportRow → ProcessedEmployee）
      └── organization-importer.ts  # インポーター実装
```

### サーバーサイドパーシング

XLSXファイルはサーバーサイド（API Route）でパースされる。クライアントはファイルをFormDataで送信するだけ。

```
クライアント: File → FormData → fetch("/api/.../preview")
                                      ↓
サーバー: FormData → file検証 → parseXlsxBuffer() → processEmployeeData() → レスポンス
```

### 対応ファイル形式

**XLSX専用**。CSVは非対応（Shift-JIS文字化け問題のため）。

ExcelJSを使用（`xlsx`パッケージはCVE-2023-30533脆弱性のため廃止済み）。

## カラムマッピングシステム

### 標準カラム

| # | カラム名 | 必須 | 説明 |
|---|---------|------|------|
| 1 | 社員番号 | **必須** | 一意の社員ID |
| 2 | 氏名 | **必須** | 氏名 |
| 3 | 氏名カナ | | カタカナ |
| 4 | メールアドレス | | メール |
| 5 | 電話番号 | | 電話 |
| 6 | 本部 | | 組織レベル1 |
| 7 | 部 | | 組織レベル2 |
| 8 | 課 | | 組織レベル3 |
| 9 | 役職 | | 役職名 |
| 10 | 役職コード | | 役職コード |
| 11 | 入社日 | | 入社日 |
| 12 | 生年月日 | | 生年月日 |
| 13 | 資格等級 | | 資格等級名 |
| 14 | 資格等級コード | | 資格等級コード |
| 15 | 雇用区分 | | 雇用区分名 |
| 16 | 雇用区分コード | | 雇用区分コード |
| 17 | 発令日 | | この人事情報の適用日（未指定時はデフォルト発令日）|
| 18 | 退職日 | | 退職日（= 最終在籍日。翌日から退職扱い）|

### エイリアス（後方互換）

`column-mapping.ts` の `COLUMN_ALIASES` で旧カラム名を標準名に自動変換。

| 旧カラム名 | → 標準カラム名 |
|-----------|--------------|
| `氏名(フリガナ)` / `氏名（フリガナ）` | → `氏名カナ` |
| `社用e-Mail１` / `メール` | → `メールアドレス` |
| `入社年月日` | → `入社日` |
| `セクション` | → `部` |
| `コース` | → `課` |
| `所属` | → 空白区切りで `本部`/`部`/`課` に分割 |
| `Effective Date` / `適用日` | → `発令日` |
| `Retirement Date` | → `退職日` |

### テンプレートXLSX

`GET /api/admin/organization/import/template` でスタイル付きテンプレートをダウンロード。

## 新しいインポーターの作成

### 1. 型定義

```typescript
// lib/importers/attendance/types.ts
export interface ImportAttendanceRow {
  社員番号?: string;
  日付?: string;
  出勤時刻?: string;
  退勤時刻?: string;
}

export interface ProcessedAttendance {
  employeeId: string;
  date: Date;
  checkIn: Date;
  checkOut: Date;
}
```

### 2. インポーター実装

```typescript
// lib/importers/attendance/attendance-importer.ts
import { BaseImporter, type ImportResult } from '../base-importer';

export class AttendanceImporter extends BaseImporter<ImportAttendanceRow, ProcessedAttendance> {
  constructor() {
    super({
      maxFileSize: 50 * 1024 * 1024,
      requiredColumns: ['社員番号', '日付', '出勤時刻', '退勤時刻'],
    });
  }

  processData(rows: ImportAttendanceRow[]): ProcessedAttendance[] {
    return processAttendanceData(rows);
  }

  async importToDatabase(data: ProcessedAttendance[]): Promise<ImportResult> {
    // DB登録ロジック
  }
}
```

## BaseImporterの機能

- `processData()` - データ変換（各モジュールで実装）
- `importToDatabase()` - DB登録（各モジュールで実装）

## 履歴管理アーキテクチャ

```
lib/history/
  ├── types.ts              # ChangeEvent, FieldChange
  ├── change-detector.ts    # 変更検出エンジン
  ├── history-recorder.ts   # 履歴記録エンジン
  └── snapshot-manager.ts   # スナップショット管理
```

## データモデル（3層履歴）

```prisma
// 1. 詳細履歴
model ChangeLog {
  entityType        String     // "Employee", "Attendance" など
  entityId          String
  changeType        ChangeType
  fieldName         String?
  oldValue          String?    // JSON
  newValue          String?    // JSON
  batchId           String?    // 一括操作のグルーピング
  changedBy         String
  changedAt         DateTime
}

// 2. 社員スナップショット
model EmployeeHistory {
  employeeId   String
  snapshotData String   // 全フィールドのJSON
  validFrom    DateTime // 発令日（この状態がいつから有効か）
  validTo      DateTime? // 次の発令日（この状態がいつまで有効か）
  // changedAt = システム日時（インポート実行日時）
  // retirementDate = 退職日（最終在籍日）
}

// 3. 組織全体スナップショット
model OrganizationHistory {
  organizationId       String
  snapshotData         String
  employeeCountSnapshot Int
}
```

## 履歴記録の実装

```typescript
import { ChangeDetector, HistoryRecorder } from '@/lib/history';

// 変更検出
const detector = new ChangeDetector();
const { changes } = await detector.detectChanges(batchId, data, changedBy, 'Employee');

// 履歴記録
const recorder = new HistoryRecorder();
await recorder.recordChanges(changes, batchId, changedBy);

// 必要に応じてスナップショット作成
await recorder.createSnapshotIfNeeded(changes, organizationId, changedBy);
```

## 日付パースの対応形式

| 形式 | 例 | 対応状況 |
|------|-----|---------|
| ExcelJS日付セル | `Date`オブジェクト | ✅ YYYY/MM/DD文字列に自動変換 |
| 和暦（令和） | `R5.4.1` | ✅ |
| 和暦（平成） | `H30.10.5` | ✅ |
| 和暦（昭和） | `S63.12.31` | ✅ |
| 日本語形式 | `1997年4月1日` | ✅ |
| スラッシュ区切り | `2023/4/1` | ✅ |
| ハイフン区切り | `2023-04-01` | ✅ |

## 組織整備機能

### 責任者自動割当

`POST /api/admin/organization/auto-assign-managers`

PositionMasterの `isManager` フラグと `level` に基づき、未設定のユニットに責任者を自動割当。

| PositionMaster.level | 対象ユニット |
|---------------------|------------|
| EXECUTIVE / DEPARTMENT | 本部 (Department) |
| SECTION | 部 (Section) |
| COURSE | 課 (Course) |

- 既に責任者が設定済みのユニットはスキップ
- 複数候補がいる場合は `displayOrder` が最小の役職を持つ社員を選択
- 「役員・顧問」本部はスキップ

### データ削除

`DELETE /api/admin/organization/clear-data?organizationId=xxx`

DRAFT組織のインポートデータを全削除。トランザクション内で以下の順序で実行:

1. 責任者参照をクリア（外部キー制約回避）
2. 社員履歴 → 社員 → 課 → 部 → 本部 → 組織履歴 → 変更ログ を削除
3. `pendingSnapshotAfterImport` をクリア

### 組織の公開制御

`Organization.status` で同一テーブルのデータ可視性を制御:

| ステータス | 管理画面 | 組織図（一般） |
|-----------|---------|-------------|
| DRAFT | 編集可能 | 非表示 |
| SCHEDULED | 閲覧のみ | 公開日到来で自動昇格 |
| PUBLISHED | 閲覧のみ | 表示 |
| ARCHIVED | 閲覧のみ | 非表示 |

## 発令日と基準日

### インポート時の発令日（effectiveDate）

インポートUI（ImportTab）に「デフォルト発令日」の日付ピッカーがあり、インポート時にAPIへ送信される。

- CSV行に「発令日」カラムがあれば行単位の日付を優先
- なければデフォルト発令日を使用
- `EmployeeHistory.validFrom` に発令日を設定（インポート実行日時ではない）

**未来の発令日**: Historyには記録するが、Employeeテーブルは更新しない。

### 退職日の扱い

- `退職日 = 最終在籍日`（日本のHR慣習）
- 退職日当日はまだ在籍中、翌日から退職扱い
- 比較: `retirementDate < todayJST` → 退職済み

### 基準日クエリ（組織図ページ）

```
GET /api/organization?referenceDate=2026-04-01
GET /api/organization/employees?referenceDate=2026-04-01
```

- 基準日 = 今日 → Employeeテーブルから取得（通常モード）
- 基準日 ≠ 今日 → EmployeeHistoryからスナップショット復元

**JST日付境界**: サーバーTZに依存しないよう、明示的にJSTオフセットを付与:
```typescript
const refDateStartJST = new Date(referenceDateStr + "T00:00:00+09:00");
const refDateEndJST = new Date(referenceDateStr + "T23:59:59.999+09:00");
```

**UI**: 過去の基準日は琥珀バナー「読み取り専用」、未来は青バナー「予定」。
基準日 ≠ 今日のとき「責任者未設定」の警告は非表示。

## ベストプラクティス

### ✅ 推奨

```typescript
// entityTypeで明確に区別
entityType: 'Employee'    // 組織図
entityType: 'Attendance'  // 勤怠
entityType: 'Expense'     // 経費

// batchIdで関連変更をグループ化
const batchId = crypto.randomUUID();

// 人間が読める説明
changeDescription: "異動: 営業部 → 開発部"
```

### ❌ 避ける

```typescript
// 履歴なしで直接更新
await prisma.employee.update({ ... });  // NG

// entityTypeの不統一
entityType: 'employee'  // 小文字
entityType: 'Employee'  // 大文字 ← 統一する
```
