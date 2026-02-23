# Organization MCP Server

組織データへの読み取り専用アクセスを提供するMCPサーバです。
Claude Desktop / Claude Code などの外部AIから組織構造・社員・役職データを参照できます。

## セットアップ

```bash
cd mcp-servers/organization
pnpm install
pnpm build
```

## APIキーの設定

1. LionFrame管理画面にADMINでログイン
2. `POST /api/admin/mcp/organization` でAPIキーを生成
3. `.mcp.json` に設定:

```json
{
  "mcpServers": {
    "organization": {
      "command": "node",
      "args": ["mcp-servers/organization/dist/index.js"],
      "env": {
        "DATABASE_URL": "postgresql://user:pass@localhost:5432/dbname",
        "MCP_API_KEY": "<生成されたAPIキー>"
      }
    }
  }
}
```

## 提供ツール

| ツール | 説明 |
|--------|------|
| `org_get_structure` | 組織階層構造を取得（本部→部→課、責任者・社員数付き） |
| `org_list_employees` | 社員一覧を取得（フィルタ・ページネーション対応） |
| `org_get_employee` | 社員詳細を取得（所属・役職・資格等級・雇用区分等） |
| `org_search_employees` | 社員をキーワード検索（名前/カナ/社員番号/メール部分一致） |
| `org_list_positions` | 役職マスタ一覧を取得 |

## 環境変数

| 変数 | 説明 |
|------|------|
| `DATABASE_URL` | PostgreSQL接続URL |
| `MCP_API_KEY` | 管理画面で生成したAPIキー |
