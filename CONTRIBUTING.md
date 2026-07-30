# コントリビュートガイド

『プロトコル・シェア』の開発向けドキュメントです。企画・設計については [README.md](./README.md) を、デプロイについては [DEPLOY.md](./DEPLOY.md) を参照してください。

## セットアップ

```bash
cd protocol_share
npm install
cp .env.local.example .env.local   # GEMINI_API_KEY を設定する
npm run dev                        # http://localhost:3000
```

`GEMINI_API_KEY` は <https://aistudio.google.com/apikey> で発行できます（`GOOGLE_API_KEY` でも代替可）。サーバー専用の値なので `NEXT_PUBLIC_` は付けないでください。

### モックモード（APIキー未設定でも動作確認できる）

`GEMINI_API_KEY`（`GOOGLE_API_KEY`）が未設定の場合、実AIを呼ばずに固定シナリオで会話を進行させる**モックモード**が自動で有効になります。キーを用意できない環境でのUI確認や、Gemini側の障害時の切り分けに使えます。

- ヘッダーに 🧪 モックモード バッジが表示されます。
- 会議は `lib/mockScript.ts` の固定台本（NPCのセリフ・空気の値）を順番に返すだけで、実際の発言内容は解釈しません。
- プレイヤー（主任）の発言も `lib/mockScript.ts` の固定文が入力欄に自動セットされます（そのまま送信すればOK。自由に書き換えても構いません）。
- ジャッジ・エピローグも固定の結果／文章を返します（ジャッジは常に成功判定）。
- 判定ロジック自体は本番と同じで、`GEMINI_API_KEY` を設定すればすぐに実AI応答へ切り替わります（コード変更不要）。
- モック判定は `lib/gemini.ts` の `isMockMode()` が行い、`GET /api/config` でクライアントに伝えています。台本を増やす／変える場合は `lib/mockScript.ts` を編集してください。

## よく使うコマンド

```bash
npm run dev      # 開発サーバー起動（Turbopack）
npm run build    # 本番ビルド
npm run start    # 本番ビルドの起動確認（要 npm run build 済み）
npm run lint     # ESLint
npx tsc --noEmit # 型チェックのみ実行
```

## ルーティング構成

| ルート | 役割 |
| :--- | :--- |
| `/`（`app/page.tsx`） | **ランディングページ**。ゲームの概要・コアコンセプト・登場人物・ゲームの流れを紹介するマーケティングページ（サーバーコンポーネント）。「捜査会議を開始する」から `/play` へ遷移する。 |
| `/play`（`app/play/page.tsx` + `app/play/PlayGame.tsx`） | **ゲーム本体**。会議タイムライン・空気インジケーター・入力UIなど、実際にプレイする画面（クライアントコンポーネント）。以前は `app/page.tsx` がこれを兼ねていたが、ランディングページ追加時に分離した。 |

ランディングページ（`/`）は登場人物を紹介しますが、支倉冴子が黒幕であることは**意図的に伏せています**。ネタバレになる文言（「黒幕」「真犯人」等）を追加しないよう注意してください。

## ディレクトリ構成

| パス | 役割 |
| :--- | :--- |
| `lib/scenario.ts` | 第1章の事件・証拠・真犯人設定（固定データ） |
| `lib/prompts.ts` | 会議用／ジャッジ用／エピローグ用の3プロンプト |
| `lib/gemini.ts` | Gemini クライアントの初期化・共通ヘルパー・`isMockMode()` |
| `lib/mockScript.ts` | モックモード用の固定台本（会議・ジャッジ・エピローグ） |
| `lib/mockStream.ts` | モックモード用のタイプライター風ストリーミングヘルパー |
| `lib/SmartImage.tsx` | 画像の自動フォールバック表示コンポーネント（ランディング・ゲーム画面共通） |
| `app/page.tsx` | ランディングページ（`/`） |
| `app/play/page.tsx` / `app/play/PlayGame.tsx` | ゲーム本体（`/play`） |
| `app/api/config/route.ts` | クライアントがモックモードかどうかを判定するための設定API |
| `app/api/meeting/route.ts` | Character Agent（3人の刑事の掛け合い・ストリーミング） |
| `app/api/judge/route.ts` | Judge Agent（構造化JSON出力でスコアリング） |
| `app/api/epilogue/route.ts` | Epilogue Generator（結末の小説生成・ストリーミング） |
| `public/images/` | 背景・立ち絵画像の配置先（[IMAGES.md](./IMAGES.md) 参照） |

## 実装メモ

- 使用AI: Google Gemini API（`gemini-2.5-flash`。`lib/gemini.ts` の `MODEL` 定数で変更可能）。
- NPCの発言は `[感情]名前「セリフ」` 形式でストリーミングされ、`app/play/PlayGame.tsx` 側でパースして吹き出し表示に変換しています。最終行の `[空気:NN]` を検出して「会議室の空気」ゲージを更新します。この出力フォーマットは `lib/prompts.ts` のプロンプトが厳守させている前提なので、プロンプトを変更する際は `app/play/PlayGame.tsx` のパース処理（正規表現部分）との整合を必ず確認してください。
- ジャッジは Gemini の `responseSchema` で JSON 出力を強制しています。スコアの合計判定（70点ボーダー）はプロンプト側ではなく `app/api/judge/route.ts` 内のコードで再計算・確定させています。
- 画像は `public/images/` に配置するだけで自動反映されるフォールバック方式です（未配置ならイニシャル表示・単色背景で動作）。フォールバック処理は `lib/SmartImage.tsx` に共通化してあり、ランディングページ・ゲーム画面の両方から利用しています。新しいキャラや背景を追加する場合は [IMAGES.md](./IMAGES.md) の命名規則に従ってください。
- ランディングページ（`app/page.tsx`）はサーバーコンポーネントです。`isMockMode()` をサーバー側で直接呼び出してモックモードのバナー表示を判定しており、クライアント側でのfetchは行っていません（`/play` 側は逆にクライアントコンポーネントのため `GET /api/config` を叩いています）。

## 動作確認の勘所

- 変更後は必ずブラウザで一連のフロー（会議 → 発言を進める → 捜査手順を決定する → 判定 → エピローグ）を通しで確認してください。ストリーミングAPIはユニットテストで検知しにくい崩れ方（フォーマット逸脱・JSON破損）をするため、実際に発言してみるのが最も確実です。
- `npm run build` はデプロイ前に必ず通しておいてください（本プロジェクトは App Router の Route Handler を使うため、`next dev` では出ない型/ビルドエラーが `build` 時に検出されることがあります）。
