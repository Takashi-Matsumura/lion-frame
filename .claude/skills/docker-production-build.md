# 本番環境用Dockerイメージの作成・エクスポート・インポート手順

このスキルは、**別のPC（開発PC）で本番環境用Dockerイメージを作成し、本番サーバーに転送する**手順を説明します。

## 前提条件

### 開発PC（イメージ作成側）
- Docker Desktopがインストールされている
- プロジェクトのソースコードがある
- インターネット接続（依存関係のダウンロード用）

### 本番サーバー（イメージインポート側）
- Docker Desktopがインストールされている
- docker-compose.prod.ymlがある
- 十分なディスク容量（イメージサイズ + データボリューム）

---

## フェーズ1: 開発PCでのDockerイメージ作成

### 1-1. プロジェクトの準備

```bash
# プロジェクトディレクトリに移動
cd ~/projects/<your-project>

# 最新のコードをプル（GitHubを使用している場合）
git pull origin main

# 不要なビルドキャッシュをクリア
rm -rf .next node_modules
npm install
```

### 1-2. 環境変数の確認

`.env`ファイルが**本番環境用**の設定になっているか確認：

```bash
cat .env
```

**重要な環境変数:**
- `DATABASE_URL`: PostgreSQL接続先（本番サーバーのPostgreSQL）
- `AUTH_SECRET`: 本番用のシークレット

**注意:** `.env`ファイルはDockerイメージに含まれません（.dockerignoreに記載）。
本番サーバーで別途設定が必要です。

### 1-3. Dockerfileの確認

以下のファイルが正しく配置されているか確認：

```bash
# これらのファイルが存在することを確認
ls -la Dockerfile
ls -la next.config.ts
ls -la scripts/docker-init.sh
ls -la .dockerignore
```

**Dockerfile**: 4段階のマルチステージビルド
- `base`: Node.js 20ベースイメージ
- `deps`: 依存関係のインストール
- `builder`: Next.jsビルド + Prisma生成
- `runner`: 本番環境用の最小イメージ

**next.config.ts**: `output: "standalone"` が設定されている

**docker-init.sh**: データベース初期化スクリプト

### 1-4. プロキシ環境の設定（社内プロキシがある場合）

```bash
# プロキシ環境変数を設定
export HTTP_PROXY=http://<proxy-server>:<port>
export HTTPS_PROXY=http://<proxy-server>:<port>
export NO_PROXY=localhost,127.0.0.1
```

### 1-5. Dockerイメージのビルド

**方法1: docker-compose経由（推奨）**

```bash
docker-compose -f docker-compose.prod.yml build nextjs
```

**方法2: 直接dockerコマンド**

```bash
docker build \
  -t lionframe-nextjs:latest \
  -f Dockerfile \
  .
```

**ビルド時間:** 初回は10〜15分程度（依存関係のダウンロード含む）

### 1-6. ビルド成功の確認

```bash
# イメージが作成されたか確認
docker images | grep lionframe-nextjs

# 出力例:
# lionframe-nextjs    latest    a1b2c3d4e5f6   2 minutes ago   1.2GB
```

**イメージサイズの目安:**
- Next.jsアプリ: 約1.2GB
- PostgreSQL: 約250MB

---

## フェーズ2: Dockerイメージのエクスポート

### 2-1. イメージをtarファイルにエクスポート

```bash
# Next.jsイメージをエクスポート
docker save -o lionframe-nextjs-latest.tar lionframe-nextjs:latest

# ファイルサイズを確認
ls -lh lionframe-nextjs-latest.tar
```

**ファイルサイズ:** 圧縮されていないため、イメージサイズとほぼ同じ

### 2-2. （オプション）圧縮してサイズを削減

```bash
# gzipで圧縮（サイズが約1/3に削減）
gzip lionframe-nextjs-latest.tar

# 圧縮後のサイズを確認
ls -lh lionframe-nextjs-latest.tar.gz
```

### 2-3. チェックサム（整合性確認）の作成

```bash
# SHA256チェックサムを作成
shasum -a 256 lionframe-nextjs-latest.tar.gz > lionframe-nextjs-latest.tar.gz.sha256

# チェックサムを確認
cat lionframe-nextjs-latest.tar.gz.sha256
```

**重要:** 本番サーバーで受信後、このチェックサムと比較してファイルの破損を検出します。

---

## フェーズ3: 本番サーバーへの転送

### 3-1. ファイル転送方法の選択

**方法A: USBメモリ・外付けHDD（物理転送）**

```bash
# USBメモリにコピー
cp lionframe-nextjs-latest.tar.gz /Volumes/USB_DRIVE/
cp lionframe-nextjs-latest.tar.gz.sha256 /Volumes/USB_DRIVE/
```

**方法B: scp（SSH転送）**

```bash
# scpでサーバーに転送
scp lionframe-nextjs-latest.tar.gz <user>@<production-server>:~/
scp lionframe-nextjs-latest.tar.gz.sha256 <user>@<production-server>:~/
```

**方法C: 共有フォルダ（ネットワークドライブ）**

```bash
cp lionframe-nextjs-latest.tar.gz /Volumes/SharedFolder/
cp lionframe-nextjs-latest.tar.gz.sha256 /Volumes/SharedFolder/
```

---

## フェーズ4: 本番サーバーでのイメージインポート

### 4-1. ファイルの整合性確認

```bash
# チェックサムを検証
shasum -a 256 -c lionframe-nextjs-latest.tar.gz.sha256
# 出力: lionframe-nextjs-latest.tar.gz: OK
```

### 4-2. 圧縮ファイルの解凍（圧縮した場合のみ）

```bash
gunzip lionframe-nextjs-latest.tar.gz
```

### 4-3. Dockerイメージのインポート

```bash
# tarファイルからDockerイメージをロード
docker load -i lionframe-nextjs-latest.tar
# 出力例: Loaded image: lionframe-nextjs:latest
```

### 4-4. インポートの確認

```bash
docker images | grep lionframe-nextjs
```

**重要:** イメージIDが開発PCと同じであることを確認してください。

---

## フェーズ5: docker-composeでの起動

### 5-1. 環境変数の設定

```bash
cd ~/projects/<your-project>
nano .env
```

**.envの必須項目:**

```env
# PostgreSQL
POSTGRES_PASSWORD=<secure-production-password>

# NextAuth.js
AUTH_SECRET=<openssl rand -base64 32で生成>
AUTH_URL=http://<production-server-ip>
```

### 5-2. ボリュームディレクトリの作成

```bash
mkdir -p ~/docker-volumes/lionframe/data
mkdir -p ~/docker-volumes/lionframe/uploads
mkdir -p ~/docker-volumes/lionframe/chroma_data
mkdir -p ~/docker-volumes/lionframe/model_cache
```

### 5-3. docker-compose.prod.ymlの確認

ボリュームパスが正しいユーザー名になっているか確認：

```bash
whoami
grep -A3 "device:" docker-compose.prod.yml
```

### 5-4. 本番環境の起動

```bash
# すべてのサービスを起動
docker-compose -f docker-compose.prod.yml up -d

# 起動状態を確認
docker-compose -f docker-compose.prod.yml ps
```

**期待される出力:**

```
NAME                        STATUS              PORTS
lionframe-nextjs-prod       Up (healthy)        3000/tcp
lionframe-postgres-prod     Up (healthy)        5432/tcp
lionframe-nginx-prod        Up (healthy)        0.0.0.0:80->80/tcp
```

### 5-5. ログの確認

```bash
docker-compose -f docker-compose.prod.yml logs nextjs | tail -50
```

### 5-6. 動作確認

```bash
curl -I http://<production-server-ip>/
```

ブラウザでアクセスして、ログイン画面が表示されることを確認。

---

## トラブルシューティング

### 問題1: イメージのビルドが失敗する

1. **メモリ不足** → Docker Desktopのメモリを8GB以上に増やす
2. **プロキシ設定が間違っている** → `echo $HTTP_PROXY` で確認
3. **ソースコードにエラーがある** → `npm run build` でローカル確認

### 問題2: イメージのエクスポートが失敗する

```bash
docker images | grep lionframe-nextjs
docker save -o lionframe-nextjs-latest.tar <正しいイメージ名>
```

### 問題3: イメージのインポートが失敗する（ファイル破損）

```bash
shasum -a 256 -c lionframe-nextjs-latest.tar.gz.sha256
# NGの場合はファイルを再転送
```

### 問題4: コンテナが起動しない

```bash
docker-compose -f docker-compose.prod.yml logs nextjs
# よくあるエラー:
# - DATABASE_URLが間違っている → .envを修正
# - ポートが競合している → 使用中のポートを確認
# - ボリュームの権限がない → sudo chown -R $USER ~/docker-volumes
```

### 問題5: データベースの初期化が失敗する

```bash
docker-compose -f docker-compose.prod.yml ps postgres
docker-compose -f docker-compose.prod.yml logs postgres
docker-compose -f docker-compose.prod.yml restart postgres
```

---

## ベストプラクティス

### バージョン管理

```bash
docker build -t lionframe-nextjs:v1.0.0 -t lionframe-nextjs:latest .
docker save -o lionframe-nextjs-v1.0.0.tar lionframe-nextjs:v1.0.0
```

### 定期的なイメージの更新

```bash
docker-compose -f docker-compose.prod.yml build --no-cache nextjs
```

### ディスク容量の管理

```bash
docker image prune -a
docker volume prune
```

---

## チェックリスト

### 開発PC（ビルド側）

- [ ] プロジェクトのソースコードが最新
- [ ] Dockerfileが正しく配置されている
- [ ] next.config.tsに`output: "standalone"`が設定されている
- [ ] .dockerignoreが正しく配置されている
- [ ] プロキシ設定（必要な場合）
- [ ] `docker build`が成功
- [ ] `docker save`でエクスポート成功
- [ ] チェックサムファイルを作成

### 本番サーバー（インポート側）

- [ ] ファイルが正しく転送された
- [ ] チェックサムの検証が成功
- [ ] `docker load`が成功
- [ ] .envファイルが正しく設定されている
- [ ] ボリュームディレクトリが作成されている
- [ ] docker-compose.prod.ymlのパスが正しい
- [ ] `docker-compose up`が成功
- [ ] すべてのコンテナが`Up (healthy)`
- [ ] ブラウザでアクセス可能

---

## まとめ

**重要なポイント:**
1. イメージのビルドは`docker-compose build`で実行
2. エクスポートは`docker save`、インポートは`docker load`
3. チェックサムで整合性を必ず確認
4. .envファイルはイメージに含まれないため、本番サーバーで別途設定
5. ボリュームパスは現在のユーザー名に合わせて修正

**所要時間（目安）:**
- イメージビルド: 10〜15分
- エクスポート: 3〜5分
- 転送: 5〜30分（方法による）
- インポート: 3〜5分
- 起動: 2〜3分

**合計:** 約30〜60分
