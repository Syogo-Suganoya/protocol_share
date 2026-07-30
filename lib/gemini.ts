import { GoogleGenAI } from "@google/genai";

export const MODEL = "gemini-2.5-flash";

// GEMINI_API_KEY（または GOOGLE_API_KEY）が設定されていない場合は
// 実AIを呼ばず、固定シナリオで会話だけ進行する「モックモード」で動作する
export function isMockMode(): boolean {
  return !(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY);
}

// APIキー未設定時にビルド/起動ごと落とさないよう、遅延生成にする
export function getClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    throw new ApiKeyMissingError();
  }
  return new GoogleGenAI({ apiKey });
}

export class ApiKeyMissingError extends Error {
  constructor() {
    super(
      "GEMINI_API_KEY が設定されていません。protocol_share/.env.local に GEMINI_API_KEY=... を設定して開発サーバーを再起動してください（キーは https://aistudio.google.com/apikey で発行できます）。",
    );
    this.name = "ApiKeyMissingError";
  }
}

export function errorResponse(e: unknown): Response {
  const message =
    e instanceof ApiKeyMissingError
      ? e.message
      : e instanceof Error
        ? `Gemini APIエラー: ${e.message}`
        : "不明なエラーが発生しました";
  return Response.json({ error: message }, { status: 500 });
}

// クライアントから届く会話履歴を Gemini の contents 形式へ変換する
export type HistoryEntry = { role: "user" | "assistant"; content: string };

export function toContents(history: HistoryEntry[], latestUserText: string) {
  return [
    ...history.map((h) => ({
      role: h.role === "assistant" ? ("model" as const) : ("user" as const),
      parts: [{ text: h.content }],
    })),
    { role: "user" as const, parts: [{ text: latestUserText }] },
  ];
}
