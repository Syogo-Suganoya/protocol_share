import { getClient, errorResponse, isMockMode, MODEL } from "@/lib/gemini";
import type { HistoryEntry } from "@/lib/gemini";
import { EPILOGUE_SYSTEM_PROMPT } from "@/lib/prompts";
import { MOCK_EPILOGUE_SUCCESS, MOCK_EPILOGUE_FAIL } from "@/lib/mockScript";
import { mockStreamResponse } from "@/lib/mockStream";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(req: Request) {
  try {
    const { history, proposal, judge } = (await req.json()) as {
      history: HistoryEntry[];
      proposal: string;
      judge: { is_success?: boolean } & Record<string, unknown>;
    };

    if (isMockMode()) {
      return mockStreamResponse(
        judge?.is_success ? MOCK_EPILOGUE_SUCCESS : MOCK_EPILOGUE_FAIL,
      );
    }

    const log = history
      .map((h) => (h.role === "user" ? `【主任】${h.content}` : h.content))
      .join("\n");

    const client = getClient();
    const stream = await client.models.generateContentStream({
      model: MODEL,
      contents: `# 会議ログ\n${log}\n\n# プレイヤーの最終提案\n${proposal}\n\n# ジャッジ結果（JSON）\n${JSON.stringify(judge, null, 2)}\n\n上記を踏まえてエピローグを執筆してください。`,
      config: {
        systemInstruction: EPILOGUE_SYSTEM_PROMPT,
        maxOutputTokens: 4096,
        temperature: 1.0,
      },
    });

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const text = chunk.text;
            if (text) controller.enqueue(encoder.encode(text));
          }
          controller.close();
        } catch (e) {
          controller.error(e);
        }
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    return errorResponse(e);
  }
}
