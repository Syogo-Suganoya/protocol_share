import { Type } from "@google/genai";
import { getClient, errorResponse, isMockMode, MODEL } from "@/lib/gemini";
import type { HistoryEntry } from "@/lib/gemini";
import { JUDGE_SYSTEM_PROMPT } from "@/lib/prompts";
import { MOCK_JUDGE_RESULT } from "@/lib/mockScript";

export const runtime = "nodejs";
export const maxDuration = 120;

export type JudgeResult = {
  rookie_care_score: number;
  veteran_respect_score: number;
  culprit_evasion_score: number;
  is_success: boolean;
  reason: string;
};

const judgeSchema = {
  type: Type.OBJECT,
  properties: {
    rookie_care_score: {
      type: Type.INTEGER,
      description: "新人のケア（0〜20の整数）",
    },
    veteran_respect_score: {
      type: Type.INTEGER,
      description: "ベテランへの敬意（0〜20の整数）",
    },
    culprit_evasion_score: {
      type: Type.INTEGER,
      description: "真犯人の誘導の回避（0〜60の整数）",
    },
    is_success: {
      type: Type.BOOLEAN,
      description: "合計70点以上で true",
    },
    reason: {
      type: Type.STRING,
      description: "判定理由（日本語・簡潔に）",
    },
  },
  required: [
    "rookie_care_score",
    "veteran_respect_score",
    "culprit_evasion_score",
    "is_success",
    "reason",
  ],
};

export async function POST(req: Request) {
  try {
    const { history, proposal } = (await req.json()) as {
      history: HistoryEntry[];
      proposal: string;
    };

    if (isMockMode()) {
      const total =
        MOCK_JUDGE_RESULT.rookie_care_score +
        MOCK_JUDGE_RESULT.veteran_respect_score +
        MOCK_JUDGE_RESULT.culprit_evasion_score;
      return Response.json({ ...MOCK_JUDGE_RESULT, total });
    }

    const log = history
      .map((h) => (h.role === "user" ? `【主任】${h.content}` : h.content))
      .join("\n");

    const client = getClient();
    const response = await client.models.generateContent({
      model: MODEL,
      contents: `# 会議ログ\n${log}\n\n# プレイヤーの最終提案（捜査方針）\n${proposal}`,
      config: {
        systemInstruction: JUDGE_SYSTEM_PROMPT,
        maxOutputTokens: 4096,
        responseMimeType: "application/json",
        responseSchema: judgeSchema,
      },
    });

    const text = response.text;
    if (!text) throw new Error("ジャッジの応答が空でした");

    const result = JSON.parse(text) as JudgeResult;
    // ボーダーライン（合計70点以上）はサーバー側で再計算して確定させる
    const total =
      result.rookie_care_score +
      result.veteran_respect_score +
      result.culprit_evasion_score;
    result.is_success = total >= 70;

    return Response.json({ ...result, total });
  } catch (e) {
    return errorResponse(e);
  }
}
