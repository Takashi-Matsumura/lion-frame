# RAG Backend

FastAPI + ChromaDB によるRAGバックエンド。Dockerコンテナとして動作。

## コレクション分離

セキュリティ上の理由から、ChromaDBコレクションを2つに分離しています。

| コレクション | 用途 | 利用者 |
|-------------|------|--------|
| `guest` | AI体験（AI Playground）のナレッジ検索 | ゲスト・インターン |
| `business` | AIチャットのRAG | 社員 |

ゲストユーザが社内業務ドキュメントにアクセスすることを防ぎます。
APIの `collection` パラメータで指定（未指定時は `business`）。

## 本番環境での検討事項（B案: コンテナ分離）

現在は1台のDockerコンテナ内でコレクション分離を行っていますが、本番環境ではより強固なセキュリティが必要な場合、コンテナレベルでの物理分離を検討してください。

**構成例:**
```
lionframe-rag-guest:8001    ← ゲスト専用RAGサーバ
lionframe-rag-business:8002 ← 社員専用RAGサーバ
```

**メリット:**
- プロセスレベルの完全分離（コード脆弱性による漏洩リスクをゼロに）
- コンテナごとに独立したリソース制限（CPU/メモリ）
- ネットワークポリシーでアクセス制御可能

**デメリット:**
- Embeddingモデルが2重にロードされ、メモリ消費が増加（約500MB〜1GB追加）
- 運用・監視対象が増加

**移行方法:**
現在のAPI設計（`collection`パラメータ）はコンテナ分離と互換性があります。
フロントエンド側で接続先URLを分けるだけで移行可能です。

```env
# .env
RAG_BACKEND_URL_GUEST=http://lionframe-rag-guest:8001
RAG_BACKEND_URL_BUSINESS=http://lionframe-rag-business:8002
```
