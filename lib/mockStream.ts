// モックモードで、実ストリーミングに近いタイプライター演出を再現するための
// テキストチャンク分割ストリーム。

export function createMockTextStream(
  fullText: string,
  opts?: { chunkSize?: number; delayMs?: number },
): ReadableStream<Uint8Array> {
  const chunkSize = opts?.chunkSize ?? 10;
  const delayMs = opts?.delayMs ?? 18;
  const encoder = new TextEncoder();
  let i = 0;

  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      if (i >= fullText.length) {
        controller.close();
        return;
      }
      const chunk = fullText.slice(i, i + chunkSize);
      i += chunkSize;
      controller.enqueue(encoder.encode(chunk));
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    },
  });
}

export function mockStreamResponse(fullText: string): Response {
  return new Response(createMockTextStream(fullText), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
