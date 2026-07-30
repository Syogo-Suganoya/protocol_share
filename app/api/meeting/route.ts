import { getClient, errorResponse, toContents, isMockMode, MODEL } from "@/lib/gemini";
import type { HistoryEntry } from "@/lib/gemini";
import { MEETING_SYSTEM_PROMPT } from "@/lib/prompts";
import { MOCK_MEETING_TURNS } from "@/lib/mockScript";
import { mockStreamResponse } from "@/lib/mockStream";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(req: Request) {
  try {
    const { history, playerInput } = (await req.json()) as {
      history: HistoryEntry[];
      playerInput: string;
    };

    if (isMockMode()) {
      // 会話の何ターン目かを会話履歴の件数から求め、固定シナリオを順に返す
      const turnIndex = Math.min(
        Math.floor(history.length / 2),
        MOCK_MEETING_TURNS.length - 1,
      );
      return mockStreamResponse(MOCK_MEETING_TURNS[turnIndex]);
    }

    const client = getClient();
    const stream = await client.models.generateContentStream({
      model: MODEL,
      contents: toContents(history, playerInput),
      config: {
        systemInstruction: MEETING_SYSTEM_PROMPT,
        maxOutputTokens: 2048,
        temperature: 0.9,
        // 会議の掛け合いは応答速度を優先して思考をオフにする
        thinkingConfig: { thinkingBudget: 0 },
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
