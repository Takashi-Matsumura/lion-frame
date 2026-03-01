# レポートライン（承認ルート基盤）

## 概要

レポートラインは、承認ワークフローの基盤となる上長・代行者・担当役員の関係を定義する仕組みです。
組織図の責任者データを活用し、担当役員の設定をトリガーに直属上長を自動割り当てします。

## データモデル

Employee テーブルに以下のメタデータを保持します。

| フィールド | 説明 | 設定方法 |
|-----------|------|---------|
| `supervisorId` | 直属上長 | 自動割り当て or 手動設定 |
| `deputyId` | 代行者 | 手動設定のみ |
| Department.`executiveId` | 担当役員 | 手動設定（本部単位） |

## 直属上長の自動割り当て

### トリガー

組織図ページの社員詳細 → レポートライン → 担当役員を設定すると、
その本部配下の全アクティブ社員に `supervisorId` が自動割り当てされます。

### 割り当てルール

| 社員の立場 | 直属上長（supervisorId） |
|-----------|------------------------|
| 本部長（Department.managerId） | 担当役員（executiveId） |
| 部長（Section.managerId） | 本部長（Department.managerId） |
| 課長（Course.managerId） | 部長（Section.managerId）※部なしなら本部長 |
| 課に所属する一般社員 | 課長（Course.managerId） |
| 部に所属する一般社員（課なし） | 部長（Section.managerId） |
| 本部直属の一般社員 | 本部長（Department.managerId） |
| 担当役員本人 | スキップ |

### フォールバック

直属の責任者が未設定の場合、上位組織の責任者へ辿ります。

```
課長なし → 部長 → 本部長
部長なし → 本部長
```

自己参照（computedSupervisorId === employee.id）の場合はスキップします。

### 承認ルートの例

```
一般社員（課所属）
  → 課長
    → 部長
      → 本部長
        → 担当役員
```

## 管理者の操作フロー

1. **組織データをインポート** — 本部・部・課の責任者（managerId）が設定される
2. **担当役員を設定** — 組織図の社員詳細から本部ごとに1人選択
3. **自動割り当て実行** — 配下社員の直属上長が一括設定される
4. **例外を手動修正** — 必要に応じて個別の直属上長・代行者を上書き

## 担当役員の解除

担当役員を解除（null）した場合、既存の `supervisorId` は維持されます。
再割り当てが必要な場合は、新しい担当役員を設定してください。

## 関連ファイル

| ファイル | 役割 |
|---------|------|
| `lib/services/supervisor-service.ts` | 自動割り当てロジック |
| `app/api/admin/organization/manager/route.ts` | 担当役員更新API（トリガー） |
| `app/api/admin/organization/employee-metadata/route.ts` | 手動設定API（supervisor/deputy） |

## 監査ログ

| アクション | 記録タイミング |
|-----------|--------------|
| `MANAGER_ASSIGN` | 責任者・担当役員の手動設定時 |
| `SUPERVISOR_AUTO_ASSIGN` | 直属上長の自動割り当て実行時 |
| `EMPLOYEE_METADATA_UPDATE` | 直属上長・代行者の個別更新時 |
