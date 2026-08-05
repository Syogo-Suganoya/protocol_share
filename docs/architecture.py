"""『プロトコル・シェア』アーキテクチャ図の生成スクリプト。

実行方法（graphviz の dot コマンドが必要）:

    /Library/Developer/CommandLineTools/usr/bin/python3 docs/architecture.py

出力: docs/architecture_system.png（システム構成）
"""

import os

from diagrams import Cluster, Diagram, Edge
from diagrams.gcp.ml import VertexAI
from diagrams.generic.storage import Storage
from diagrams.onprem.client import Client
from diagrams.programming.framework import React
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
    "nodesep": "0.8",
    "ranksep": "1.6",
}
NODE_ATTR = {"fontname": FONT, "fontsize": "13"}
EDGE_ATTR = {"fontname": FONT, "fontsize": "12"}


def system_diagram() -> None:
    """システム構成図。

    ファイル単位の依存ではなく「使用技術と大まかな関係性」を示すことを優先し、
    レイヤーごとに1ノードへ集約している。
    """
    with Diagram(
        "プロトコル・シェア システム構成",
        filename=os.path.join(OUT_DIR, "architecture_system"),
        outformat="png",
        show=False,
        direction="LR",
        graph_attr=GRAPH_ATTR,
        node_attr=NODE_ATTR,
        edge_attr=EDGE_ATTR,
    ):
        player = Client("プレイヤー\n（ブラウザ）")

        with Cluster("Next.js 16（App Router / Node.js ランタイム）"):
            frontend = React(
                "フロントエンド\nReact 19 + Tailwind CSS 4\n"
                "/ ランディング（Server Component）\n/play ゲーム画面（Client Component）"
            )
            api = TypeScript(
                "API（app/api/*）\nTypeScript 5\n"
                "会議・ジャッジ・エピローグの\n3エージェント"
            )
            core = TypeScript("ゲームロジック（lib/）\nプロンプト・シナリオ・\nGemini クライアント")
            mock = TypeScript("モックモード\nAPIキー未設定時は\n固定台本で動作")

        assets = Storage("public/images/\n背景・立ち絵")
        gen_ai = VertexAI("Google Gemini API\n@google/genai\ngemini-2.5-flash")

        player >> Edge(label="HTTP") >> frontend
        frontend >> Edge(label="fetch（応答はストリーミング）", color="darkgreen") >> api
        api >> Edge(label="プロンプト生成 / 判定") >> core
        core >> Edge(label="generateContent(Stream)", color="steelblue") >> gen_ai
        core >> Edge(label="APIキーが無い場合", color="orange", style="dashed") >> mock
        frontend >> Edge(style="dotted", color="gray") >> assets


if __name__ == "__main__":
    system_diagram()
    print(f"generated: {OUT_DIR}/architecture_system.png")
