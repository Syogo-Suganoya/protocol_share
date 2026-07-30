# デプロイ手順

『プロトコル・シェア』を本番公開するための手順です。

## 前提と重要ポイント

- **技術構成**: Next.js 16（App Router）+ サーバーサイド Route Handler（`app/api/*`）。会議・エピローグ生成は **サーバー側でストリーミング**します。
- **静的エクスポート（`output: export`）は不可**です。Gemini API を呼ぶサーバーサイドの API ルートがあるため、**Node.js サーバーが動く環境**（Vercel などのサーバーレス、または自前の Node サーバー / Docker）が必要です。
- **APIキーはサーバー専用**です。`GEMINI_API_KEY` は `NEXT_PUBLIC_` を付けないでください。付けるとブラウザのJSバンドルに埋め込まれ、キーが漏洩します。本アプリは API ルート内（サーバー）でのみ `process.env.GEMINI_API_KEY` を読むので、正しく非公開のまま扱われます。
- **このプロジェクトはモノレポのサブディレクトリ**です（リポジトリ直下ではなく `protocol_share/`）。Vercel 等では **Root Directory を `protocol_share` に設定**する必要があります。

### 必要な環境変数

| 変数名 | 必須 | 内容 |
| :--- | :--- | :--- |
| `GEMINI_API_KEY` | ✅ | Gemini API キー。<https://aistudio.google.com/apikey> で発行 |

`GOOGLE_API_KEY` でも代替可（`lib/gemini.ts` が両方をフォールバックで参照します）。

---

## 方法A: Vercel（推奨・最速）

GitHub 連携で最も簡単に公開できます。無料の Hobby プランで動作します。

### 手順

1. コードを GitHub にプッシュする（このリポジトリは `gemini-ops-orchestrator`）。
2. <https://vercel.com> にログイン →「**Add New... → Project**」→ 対象リポジトリを **Import**。
3. 設定画面で以下を指定:
   - **Root Directory**: `protocol_share` を選択（← モノレポなので必須）。
   - **Framework Preset**: `Next.js`（自動検出されるはず）。
   - Build/Output コマンドはデフォルトのままでOK（`next build`）。
4. **Environment Variables** に `GEMINI_API_KEY` を追加（値は自分のキー）。
5. **Deploy** を押す。数分で `https://<プロジェクト名>.vercel.app` が発行されます。

以後、`main` ブランチへの push で自動再デプロイされます。

### 注意（タイムアウト）

- API ルートは `maxDuration = 120`（秒）を宣言しています。**Vercel の Hobby プランは関数の実行時間上限が短い**（プランにより異なる）ため、長い応答が途中で切れる場合があります。
  - 対策1: 会議ルートは既に `thinkingConfig.thinkingBudget: 0`（高速）にしてあります。
  - 対策2: それでも切れる場合は Pro プラン、または後述の「自前 Node サーバー / Docker」を使ってください（実行時間の制約を自分で管理できます）。

### CLI で直接デプロイする場合

```bash
npm i -g vercel
cd protocol_share
vercel            # 初回は対話でプロジェクト設定。Root は自動でカレントになる
vercel env add GEMINI_API_KEY   # 値を入力
vercel --prod     # 本番デプロイ
```

---

## 方法B: 自前の Node.js サーバー（VPS / Cloud Run / Railway など）

`next build` → `next start` で全機能が動きます。実行時間の制約を自分で管理できるため、長いストリーミング応答も安定します。

```bash
cd protocol_share
npm ci                       # 依存インストール（package-lock.json を尊重）
export GEMINI_API_KEY=＜your-key＞
npm run build                # 本番ビルド
npm run start -- --port 3000 # サーバー起動（0.0.0.0:3000）
```

- プロセスは常駐させる必要があります（`pm2`、`systemd`、コンテナのプロセスマネージャ等）。
- リバースプロキシ（Nginx など）を前段に置く場合は、**ストリーミングのためにレスポンスバッファリングを無効化**してください（Nginx なら `proxy_buffering off;`）。有効のままだと会議・エピローグの1文字ずつの表示がまとめて出てしまいます。
- Railway / Render / Fly.io などは、リポジトリを繋いで `protocol_share` をルートに指定し、Build=`npm run build` / Start=`npm run start` を設定すれば同様に動きます。環境変数に `GEMINI_API_KEY` を登録してください。

---

## 方法C: Docker

`output: "standalone"` を使うと、必要な実行ファイルだけを含む軽量イメージを作れます。

### 1. `next.config.ts` に standalone 出力を追加

```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
};

export default nextConfig;
```

### 2. `protocol_share/Dockerfile` を作成

```dockerfile
# ---- build ----
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# ---- run ----
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
# standalone 出力をコピー
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
EXPOSE 3000
CMD ["node", "server.js"]
```

### 3. ビルドと起動

```bash
cd protocol_share
docker build -t protocol-share .
docker run -p 3000:3000 -e GEMINI_API_KEY=＜your-key＞ protocol-share
```

`http://localhost:3000` で起動します。Cloud Run / ECS / Kubernetes など Docker が動く任意の環境へデプロイできます。

---

## デプロイ後のチェックリスト

- [ ] トップページが開き、「捜査会議を開始する」でエラーが出ない（＝`GEMINI_API_KEY` が正しく設定されている）。
- [ ] 会議で発言すると、刑事のセリフが**1文字ずつ流れて**表示される（ストリーミングが機能している。まとめて出る場合はプロキシのバッファリングを確認）。
- [ ] 「捜査手順を決定する」→ 判定 → エピローグまで通しで到達できる。
- [ ] 背景・立ち絵の画像を使う場合は、`public/images/` に配置してから再ビルド／再デプロイする（配置方法は [IMAGES.md](./IMAGES.md) 参照）。
- [ ] ブラウザの DevTools → Network で、`GEMINI_API_KEY` の値がレスポンスやJSバンドルに含まれていないことを確認（サーバー専用なので含まれないのが正常）。

---

## 補足: どれを選ぶ？

| 目的 | おすすめ |
| :--- | :--- |
| とにかく早く公開したい・ハッカソン提出 | **方法A（Vercel）** |
| 長い応答を安定させたい・実行時間制約を避けたい | 方法B（Node サーバー）または 方法C（Docker） |
| 既存のコンテナ基盤（Cloud Run / K8s）に載せたい | 方法C（Docker） |
