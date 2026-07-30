import { isMockMode } from "@/lib/gemini";

export const runtime = "nodejs";

// クライアントが起動時に一度だけ呼び、モックモードかどうかを判定するための設定API
export async function GET() {
  return Response.json({ mockMode: isMockMode() });
}
