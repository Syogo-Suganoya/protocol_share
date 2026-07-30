"""『プロトコル・シェア』アーキテクチャ図の生成スクリプト。

実行方法（graphviz の dot コマンドが必要）:

    /Library/Developer/CommandLineTools/usr/bin/python3 docs/architecture.py

出力: docs/architecture_system.png（システム構成）
      docs/architecture_flow.png（ゲームフェーズ遷移）
"""

import os

from diagrams import Cluster, Diagram, Edge
from diagrams.gcp.ml import VertexAI
from diagrams.generic.blank import Blank
from diagrams.generic.storage import Storage
from diagrams.onprem.client import Client
from diagrams.programming.framework import NextJs, React
from diagrams.programming.language import TypeScript

OUT_DIR = os.path.dirname(os.path.abspath(__file__))

# 日本語ラベルを描画するためフォントを明示指定する（macOS 標準のヒラギノ）
FONT = "Hiragino Sans"

GRAPH_ATTR = {
    "fontname": FONT,
    "fontsize": "20",
    "bgcolor": "white",
    "pad": "0.6",
    "splines": "spline",
}
NODE_ATTR = {"fontname": FONT, "fontsize": "12"}
EDGE_ATTR = {"fontname": FONT, "fontsize": "11"}


def system_diagram() -> None:
    """システム構成図: ブラウザ / Next.js サーバー / Gemini API の関係。"""
    with Diagram(
        "プロトコル・シェア システム構成",
        filename=os.path.join(OUT_DIR, "architecture_system"),
        outformat="png",
        show=False,
        direction="LR",
        graph_attr={**GRAPH_ATTR, "nodesep": "0.5", "ranksep": "1.4"},
        node_attr=NODE_ATTR,
        edge_attr=EDGE_ATTR,
    ):
        player = Client("プレイヤー\n（ブラウザ）")

        with Cluster("Next.js 16 App Router（runtime = nodejs）"):
            with Cluster("画面"):
                landing = NextJs("app/page.tsx\n/ ランディング\n(Server Component)")
                play = React("app/play/PlayGame.tsx\n/play ゲーム本体\n(Client Component)")

            with Cluster("Route Handlers（app/api/*）※maxDuration = 120"):
                api_config = TypeScript("GET /api/config\nmockMode 判定")
                api_meeting = TypeScript("POST /api/meeting\nCharacter Agent\n(text stream)")
                api_judge = TypeScript("POST /api/judge\nJudge Agent\n(responseSchema JSON)")
                api_epilogue = TypeScript("POST /api/epilogue\nEpilogue Generator\n(text stream)")

            with Cluster("lib/（サーバー共通）"):
                gemini = TypeScript("gemini.ts\ngetClient / isMockMode\ntoContents / errorResponse\nMODEL = gemini-2.5-flash")
                prompts = TypeScript("prompts.ts\n3種のシステムプロンプト")
                scenario = TypeScript("scenario.ts\n第1章 固定データ\n事件・証拠・真実")

            with Cluster("モックモード（APIキー未設定時）"):
                mock_script = TypeScript("mockScript.ts\n固定台本・判定・結末")
                mock_stream = TypeScript("mockStream.ts\nタイプライター風\n擬似ストリーム")

        assets = Storage("public/images/\n背景・立ち絵\n（無ければ\nSmartImage が\nフォールバック）")
        gen_ai = VertexAI("Google Gemini API\n@google/genai\ngemini-2.5-flash")

        # クライアント → 画面
        player >> Edge(label="初回アクセス") >> landing
        landing >> Edge(label="「捜査会議を開始する」", style="dashed") >> play
        player >> Edge(label="発言・最終提案", color="darkgreen") >> play

        # 画面 → API
        play >> Edge(label="起動時 1 回") >> api_config
        play >> Edge(label="history + playerInput", color="darkgreen") >> api_meeting
        play >> Edge(label="history + proposal", color="darkgreen") >> api_judge
        play >> Edge(label="history + proposal\n+ judge JSON", color="darkgreen") >> api_epilogue

        # ランディングはサーバー側で直接 isMockMode() を呼ぶ（fetch しない）
        landing >> Edge(label="isMockMode()", style="dotted") >> gemini
        api_config >> Edge(style="dotted") >> gemini

        # API → lib → Gemini
        for api in (api_meeting, api_judge, api_epilogue):
            api >> Edge(color="steelblue") >> gemini
            api >> Edge(style="dashed", color="gray") >> prompts

        prompts >> Edge(label="埋め込み", style="dashed", color="gray") >> scenario
        gemini >> Edge(label="generateContent(Stream)", color="steelblue") >> gen_ai

        # モック経路
        api_meeting >> Edge(label="isMockMode() = true", color="orange", style="dashed") >> mock_script
        api_epilogue >> Edge(color="orange", style="dashed") >> mock_script
        api_judge >> Edge(color="orange", style="dashed") >> mock_script
        mock_script >> Edge(color="orange", style="dashed") >> mock_stream

        # 画像アセット
        play >> Edge(label="SmartImage", style="dotted", color="gray") >> assets
        landing >> Edge(style="dotted", color="gray") >> assets


def flow_diagram() -> None:
    """ゲームフェーズの遷移図（PlayGame.tsx の phase ステート）。"""
    with Diagram(
        "ゲームフェーズ遷移（PlayGame.tsx の phase）",
        filename=os.path.join(OUT_DIR, "architecture_flow"),
        outformat="png",
        show=False,
        direction="LR",
        graph_attr={**GRAPH_ATTR, "ranksep": "0.9"},
        node_attr={**NODE_ATTR, "shape": "box", "style": "rounded,filled",
                   "fillcolor": "#f4f4f5", "color": "#52525b", "width": "1.6",
                   "height": "0.9", "imagescale": "false"},
        edge_attr=EDGE_ATTR,
    ):
        title = Blank("title\nタイトル画面")
        meeting = Blank("meeting\n会議フェーズ")
        proposal = Blank("proposal\n捜査手順の決定")
        judging = Blank("judging\n判定中")
        epilogue = Blank("epilogue\nエピローグ")

        title >> Edge(label="開始") >> meeting
        meeting >> Edge(label="自由入力 / 発言を進める\nPOST /api/meeting\n→ [感情]名前「セリフ」+ [空気:NN]",
                        style="dashed", color="darkgreen") >> meeting
        meeting >> Edge(label="「捜査手順を決定する」") >> proposal
        proposal >> Edge(label="最終提案を送信\nPOST /api/judge") >> judging
        judging >> Edge(label="合計 >= 70 → 成功 / 未満 → 失敗\n（サーバー側で再計算）\nPOST /api/epilogue") >> epilogue

        # ジャッジのスコア内訳（app/api/judge/route.ts の responseSchema）
        scores = Blank(
            "スコア内訳\n新人のケア 0〜20\nベテランの敬意 0〜20\n真犯人の誘導回避 0〜60",
            shape="note",
            style="filled",
            fillcolor="#fffbe6",
            color="#a16207",
            width="2.4",
            height="1.2",
            labelloc="c",
        )
        judging >> Edge(style="dotted", color="gray") >> scores


if __name__ == "__main__":
    system_diagram()
    flow_diagram()
    print(f"generated: {OUT_DIR}/architecture_system.png")
    print(f"generated: {OUT_DIR}/architecture_flow.png")
