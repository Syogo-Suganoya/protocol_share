"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { scenario } from "@/lib/scenario";
import { MOCK_PLAYER_LINES } from "@/lib/mockScript";
import { SmartImage } from "@/lib/SmartImage";

type Phase = "title" | "meeting" | "proposal" | "judging" | "epilogue";

type Msg = {
  id: number;
  kind: "npc" | "player" | "system" | "error";
  speaker?: string;
  emotion?: string;
  text: string;
};

type QueueItem = Omit<Msg, "id">;

type HistoryEntry = { role: "user" | "assistant"; content: string };

type JudgeResult = {
  rookie_care_score: number;
  veteran_respect_score: number;
  culprit_evasion_score: number;
  is_success: boolean;
  reason: string;
  total: number;
};

const SPEAKER_STYLE: { match: string; color: string; label: string }[] = [
  { match: "矢代", color: "border-sky-500/60 bg-sky-950/40", label: "新人" },
  { match: "剣持", color: "border-amber-500/60 bg-amber-950/40", label: "ベテラン" },
  { match: "支倉", color: "border-violet-500/60 bg-violet-950/40", label: "刑事" },
];

function speakerStyle(name: string) {
  return (
    SPEAKER_STYLE.find((s) => name.includes(s.match)) ?? {
      match: "",
      color: "border-zinc-600 bg-zinc-900",
      label: "",
    }
  );
}

// 画像アセット（IMAGES.md 参照）。存在しないファイルは自動フォールバックする
const CHAR_ID: { match: string; id: string }[] = [
  { match: "矢代", id: "yashiro" },
  { match: "剣持", id: "kenmochi" },
  { match: "支倉", id: "hasekura" },
  { match: "南雲", id: "nagumo" },
];

const EMOTION_FILE: Record<string, string> = {
  喜: "joy",
  怒: "anger",
  哀: "sorrow",
  怪: "doubt",
  焦: "panic",
  穏: "calm",
};

function Portrait({ name, emotion }: { name: string; emotion?: string }) {
  const id = CHAR_ID.find((c) => name.includes(c.match))?.id;
  const emo = emotion ? EMOTION_FILE[emotion] : undefined;
  const candidates = useMemo(() => {
    const list: string[] = [];
    if (id && emo) list.push(`/images/char_${id}_${emo}.png`);
    if (id) list.push(`/images/char_${id}.png`);
    return list;
  }, [id, emo]);

  return (
    <SmartImage
      srcs={candidates}
      alt={name}
      className="h-16 w-16 shrink-0 rounded-full border-2 border-zinc-700 bg-zinc-800 object-cover object-top"
      fallback={
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border-2 border-zinc-700 bg-zinc-800 text-lg font-bold text-zinc-300">
          {name.charAt(0)}
        </div>
      }
    />
  );
}

function TitleHeading() {
  return (
    <SmartImage
      srcs={["/images/logo.png"]}
      alt="プロトコル・シェア"
      className="mx-auto w-full max-w-md"
      fallback={
        <h2 className="text-4xl font-black tracking-wider">プロトコル・シェア</h2>
      }
    />
  );
}

const LINE_RE = /^\[(.)\]\s*(.+?)「(.+)」\s*$/;
const MOOD_RE = /^\[空気[:：]\s*(\d+)\]\s*$/;

function parseTurn(fullText: string): { queue: QueueItem[]; mood: number | null } {
  const queue: QueueItem[] = [];
  let mood: number | null = null;
  for (const rawLine of fullText.split("\n")) {
    const trimmed = rawLine.trim();
    if (!trimmed) continue;
    const moodMatch = trimmed.match(MOOD_RE);
    if (moodMatch) {
      mood = Math.min(100, Math.max(0, Number(moodMatch[1])));
      continue;
    }
    const m = trimmed.match(LINE_RE);
    if (m) {
      queue.push({ kind: "npc", emotion: m[1], speaker: m[2], text: m[3] });
    } else {
      queue.push({ kind: "system", text: trimmed });
    }
  }
  return { queue, mood };
}

let msgId = 0;
const nextId = () => ++msgId;

function MsgBubble({ msg }: { msg: Omit<Msg, "id"> }) {
  if (msg.kind === "system") {
    return (
      <div className="whitespace-pre-wrap rounded-md border border-zinc-800 bg-zinc-900/60 px-4 py-2 text-center text-xs leading-relaxed text-zinc-400">
        {msg.text}
      </div>
    );
  }
  if (msg.kind === "error") {
    return (
      <div className="whitespace-pre-wrap rounded-md border border-red-700 bg-red-950/50 px-4 py-2 text-xs text-red-300">
        ⚠ {msg.text}
      </div>
    );
  }
  if (msg.kind === "player") {
    return (
      <div className="flex items-end justify-end gap-3">
        <div className="max-w-[88%] rounded-xl rounded-br-sm border border-emerald-600/60 bg-emerald-950/40 px-4 py-2">
          <p className="mb-1 text-[10px] font-bold text-emerald-400">
            {msg.speaker}
          </p>
          <p className="whitespace-pre-wrap text-sm leading-relaxed">
            {msg.text}
          </p>
        </div>
        <Portrait name="南雲" />
      </div>
    );
  }
  const style = speakerStyle(msg.speaker ?? "");
  return (
    <div className="flex items-end justify-start gap-3">
      <Portrait name={msg.speaker ?? ""} emotion={msg.emotion} />
      <div
        className={`max-w-[88%] rounded-xl rounded-bl-sm border px-4 py-2 ${style.color}`}
      >
        <p className="mb-1 text-[10px] font-bold text-zinc-300">
          {msg.speaker}
          {style.label && <span className="ml-2 text-zinc-500">{style.label}</span>}
        </p>
        <p className="whitespace-pre-wrap text-sm leading-relaxed">
          {msg.text}
        </p>
      </div>
    </div>
  );
}

export default function PlayGame() {
  const [phase, setPhase] = useState<Phase>("title");
  const [timeline, setTimeline] = useState<Msg[]>([]);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [mood, setMood] = useState(20);
  const [input, setInput] = useState("");
  const [proposal, setProposal] = useState("");
  const [busy, setBusy] = useState(false);
  const [judge, setJudge] = useState<JudgeResult | null>(null);
  const [epilogue, setEpilogue] = useState("");
  const [epilogueDone, setEpilogueDone] = useState(false);
  const [resultModalClosed, setResultModalClosed] = useState(false);
  const [mockMode, setMockMode] = useState(false);

  // 会議の「1台詞ずつ、ボタンを押したときだけ表示」制御用キュー
  const [queueRemaining, setQueueRemaining] = useState(0);
  const queueRef = useRef<QueueItem[]>([]);
  const pendingMoodRef = useRef<number | null>(null);
  const nextMockLineRef = useRef<string>(MOCK_PLAYER_LINES[0]);

  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [timeline, epilogue, phase]);

  useEffect(() => {
    fetch("/api/config")
      .then((r) => r.json())
      .then((d) => setMockMode(Boolean(d?.mockMode)))
      .catch(() => {});
  }, []);

  function pushMsg(msg: Omit<Msg, "id">) {
    setTimeline((t) => [...t, { ...msg, id: nextId() }]);
  }

  // キューの先頭を1件取り出し、即座にそのまま表示する（自動では呼ばない。
  // 「次の発言へ」ボタンが押されたときにのみ呼び出す）
  function revealNext() {
    const item = queueRef.current.shift();
    setQueueRemaining(queueRef.current.length);
    if (!item) return;

    pushMsg(item);
    // このターン最後の台詞を表示したタイミングで空気ゲージを更新する
    if (queueRef.current.length === 0 && pendingMoodRef.current !== null) {
      setMood(pendingMoodRef.current);
      pendingMoodRef.current = null;
    }
  }

  async function runTurn(userContent: string) {
    setBusy(true);
    const turnIndex = Math.floor(history.length / 2);
    try {
      const res = await fetch("/api/meeting", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ history, playerInput: userContent }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        pushMsg({ kind: "error", text: data?.error ?? `エラー (${res.status})` });
        return;
      }
      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let full = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        full += decoder.decode(value, { stream: true });
      }
      setHistory((h) => [
        ...h,
        { role: "user", content: userContent },
        { role: "assistant", content: full },
      ]);

      const { queue, mood: moodValue } = parseTurn(full);
      queueRef.current = queue;
      pendingMoodRef.current = moodValue;
      setQueueRemaining(queue.length);
      // ここでは表示しない。「次の発言へ」ボタンが押されるまで待つ

      // モックモードでは、次にボタンを押したときに送る主任の固定発言を用意しておく
      if (mockMode) {
        nextMockLineRef.current =
          MOCK_PLAYER_LINES[Math.min(turnIndex, MOCK_PLAYER_LINES.length - 1)];
      }
    } catch (e) {
      pushMsg({
        kind: "error",
        text: e instanceof Error ? e.message : "通信エラーが発生しました",
      });
    } finally {
      setBusy(false);
    }
  }

  function startGame() {
    setPhase("meeting");
    pushMsg({ kind: "system", text: `${scenario.title} ―― 捜査会議、開始。` });
    pushMsg({ kind: "system", text: scenario.caseOverview });
    void runTurn(
      "[会議開始] 主任・南雲が着席し、捜査会議の開始を宣言した。各自、現時点の見立てを述べよ。",
    );
  }

  function speak() {
    const text = input.trim();
    if (!text || busy) return;
    setInput("");
    pushMsg({ kind: "player", speaker: "南雲（あなた）", text });
    void runTurn(text);
  }

  function proceed() {
    if (busy) return;
    void runTurn(
      "[進行コマンド] 主任は発言せず、議論の行方を見守っている。刑事たちの掛け合いを続けよ。",
    );
  }

  // 会議画面の「進める」ボタン：キューが残っていれば次の台詞を表示するだけ、
  // 空ならモック/非モックに応じて次のターンを取得する
  function handleAdvance() {
    if (busy) return;
    if (queueRemaining > 0) {
      revealNext();
      return;
    }
    if (mockMode) {
      const line = nextMockLineRef.current;
      pushMsg({ kind: "player", speaker: "南雲（あなた）", text: line });
      void runTurn(line);
    } else {
      proceed();
    }
  }

  async function submitProposal() {
    const text = proposal.trim();
    if (!text) return;
    setPhase("judging");
    try {
      const res = await fetch("/api/judge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ history, proposal: text }),
      });
      const data = await res.json();
      if (!res.ok) {
        pushMsg({ kind: "error", text: data?.error ?? "判定に失敗しました" });
        setPhase("proposal");
        return;
      }
      setJudge(data as JudgeResult);
      setEpilogueDone(false);
      setResultModalClosed(false);
      setPhase("epilogue");
      await streamEpilogue(text, data as JudgeResult);
    } catch (e) {
      pushMsg({
        kind: "error",
        text: e instanceof Error ? e.message : "判定中にエラーが発生しました",
      });
      setPhase("proposal");
    }
  }

  async function streamEpilogue(proposalText: string, judgeResult: JudgeResult) {
    setEpilogue("");
    try {
      const res = await fetch("/api/epilogue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          history,
          proposal: proposalText,
          judge: judgeResult,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setEpilogue(`（エピローグ生成エラー: ${data?.error ?? res.status}）`);
        setEpilogueDone(true);
        return;
      }
      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        const text = decoder.decode(value, { stream: true });
        setEpilogue((prev) => prev + text);
      }
      setEpilogueDone(true);
    } catch {
      setEpilogue((prev) => prev + "\n（通信が中断されました）");
      setEpilogueDone(true);
    }
  }

  const moodColor =
    mood < 35 ? "bg-emerald-500" : mood < 65 ? "bg-yellow-500" : "bg-red-500";

  const bgName =
    phase === "title"
      ? "bg_title"
      : phase === "epilogue" && judge
        ? judge.is_success
          ? "bg_epilogue_success"
          : "bg_epilogue_fail"
        : "bg_meeting";

  const isMidTurn = queueRemaining > 0;
  const advanceLabel = isMidTurn
    ? "▶ 次の発言へ"
    : mockMode
      ? "▶ 会話を進める"
      : "▶ 発言を進める（黙って聞く）";
  const advanceDisabled = busy;

  return (
    <div className="relative h-dvh text-zinc-100">
      {/* 背景画像（未配置なら単色ダークのまま） */}
      <div
        aria-hidden
        className="absolute inset-0 bg-zinc-950 bg-cover bg-center"
        style={{ backgroundImage: `url(/images/${bgName}.png)` }}
      />
      <div
        aria-hidden
        className={`absolute inset-0 ${
          phase === "title" ? "bg-zinc-950/60" : "bg-zinc-950/85"
        }`}
      />
      <div className="relative flex h-full flex-col">
      {/* ヘッダー */}
      <header className="border-b border-zinc-800 bg-zinc-900/80 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold tracking-wide">
                プロトコル・シェア
              </h1>
              {mockMode && (
                <span
                  title="GEMINI_API_KEY が未設定のため、固定シナリオで会話を進行するモックモードで動作しています"
                  className="rounded-full border border-amber-600/60 bg-amber-950/50 px-2 py-0.5 text-[10px] font-bold text-amber-300"
                >
                  🧪 モックモード
                </span>
              )}
            </div>
            <p className="text-xs text-zinc-400">{scenario.title}</p>
          </div>
          {phase !== "title" && (
            <div className="w-44">
              <div className="mb-1 flex justify-between text-[10px] text-zinc-400">
                <span>会議室の空気</span>
                <span>{mood < 35 ? "良好" : mood < 65 ? "緊張" : "険悪"}</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-800">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${moodColor}`}
                  style={{ width: `${mood}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </header>

      {/* タイトル画面 */}
      {phase === "title" && (
        <main className="flex flex-1 flex-col items-center justify-center gap-8 px-6 text-center">
          <div>
            <p className="mb-2 text-sm tracking-[0.4em] text-zinc-500">
              PROTOCOL : SHARE
            </p>
            <TitleHeading />
            <p className="mt-4 max-w-md text-sm leading-relaxed text-zinc-400">
              論破すれば、会議は死ぬ。
              <br />
              寄り添い、束ね、チームで真実へたどり着け。
              <br />
              ―― ただし刑事の中に、犯人がいる。
            </p>
          </div>
          <button
            onClick={startGame}
            className="rounded-lg bg-red-700 px-10 py-3 font-bold tracking-widest transition hover:bg-red-600"
          >
            捜査会議を開始する
          </button>
          <p className="text-xs text-zinc-600">
            あなたは捜査一課の主任・南雲。部下は3人の刑事。
          </p>
        </main>
      )}

      {/* 会議タイムライン */}
      {phase !== "title" && (
        <main className="mx-auto w-full max-w-5xl flex-1 space-y-4 overflow-y-auto px-4 py-4">
          {timeline.map((msg) => (
            <MsgBubble key={msg.id} msg={msg} />
          ))}

          {busy && (
            <div className="px-4 py-1 text-xs text-zinc-500">
              <span className="animate-pulse">刑事たちが考えている…</span>
            </div>
          )}

          {phase === "judging" && (
            <div className="rounded-md border border-zinc-700 bg-zinc-900 px-4 py-6 text-center text-sm text-zinc-400">
              <span className="animate-pulse">
                ジャッジが会議ログと最終提案を精査している…
              </span>
            </div>
          )}
          {phase === "epilogue" && (
            <div className="whitespace-pre-wrap rounded-md border border-zinc-700 bg-zinc-900 px-5 py-4 font-serif text-sm leading-7">
              {epilogue || <span className="animate-pulse">執筆中…</span>}
            </div>
          )}
          {phase === "epilogue" && epilogueDone && (
            <div className="rounded-md border border-zinc-700 bg-zinc-900/60 px-5 py-4 text-center text-xs leading-relaxed text-zinc-400">
              <p className="mb-1 text-sm font-bold tracking-widest text-zinc-300">
                ―― 第1章 完 ――
              </p>
              <p>今回のプロトコル・シェアはここまで。次回のエピソードをお楽しみに。</p>
            </div>
          )}
          <div ref={bottomRef} />
        </main>
      )}

      {/* 入力エリア（会議フェーズ） */}
      {phase === "meeting" && (
        <footer className="border-t border-zinc-800 bg-zinc-900/80 px-4 py-3">
          <div className="mx-auto max-w-5xl space-y-2">
            {!mockMode && (
              <div className="flex gap-2">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (
                      e.key === "Enter" &&
                      !e.shiftKey &&
                      !e.nativeEvent.isComposing
                    ) {
                      e.preventDefault();
                      speak();
                    }
                  }}
                  rows={2}
                  placeholder="主任として発言する（例:「矢代、焦る気持ちはわかる。だがまず根拠を整理しよう」）"
                  className="flex-1 resize-none rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm outline-none placeholder:text-zinc-600 focus:border-zinc-500"
                  disabled={busy || isMidTurn}
                />
                <button
                  onClick={speak}
                  disabled={busy || isMidTurn || !input.trim()}
                  className="rounded-md bg-emerald-700 px-4 text-sm font-bold transition hover:bg-emerald-600 disabled:opacity-40"
                >
                  発言
                </button>
              </div>
            )}
            <div className="flex gap-2">
              <button
                onClick={handleAdvance}
                disabled={advanceDisabled}
                className="flex-1 rounded-md border border-zinc-700 py-2 text-xs text-zinc-300 transition hover:bg-zinc-800 disabled:opacity-40"
              >
                {advanceLabel}
              </button>
              <button
                onClick={() => setPhase("proposal")}
                disabled={busy || isMidTurn || history.length === 0}
                className="flex-1 rounded-md border border-red-800 bg-red-950/40 py-2 text-xs font-bold text-red-300 transition hover:bg-red-900/40 disabled:opacity-40"
              >
                ⚖ 捜査手順を決定する（会議終了）
              </button>
            </div>
          </div>
        </footer>
      )}

      {/* 最終提案フェーズ */}
      {phase === "proposal" && (
        <footer className="border-t border-zinc-800 bg-zinc-900/80 px-4 py-3">
          <div className="mx-auto max-w-5xl space-y-2">
            <p className="text-xs text-zinc-400">
              最終提案 ――
              「誰を・どこを・どういう方針で」捜査するかをまとめて提出してください。提出すると会議は終了し、判定に進みます。
            </p>
            <textarea
              value={proposal}
              onChange={(e) => setProposal(e.target.value)}
              rows={4}
              autoFocus
              placeholder="例: まず◯◯の記録を洗い、△△と□□の照合を最優先とする。聞き込みは剣持さん主導で…"
              className="w-full resize-none rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm outline-none placeholder:text-zinc-600 focus:border-zinc-500"
            />
            <div className="flex gap-2">
              <button
                onClick={() => setPhase("meeting")}
                className="rounded-md border border-zinc-700 px-4 py-2 text-xs text-zinc-300 transition hover:bg-zinc-800"
              >
                ← 会議に戻る
              </button>
              <button
                onClick={submitProposal}
                disabled={!proposal.trim()}
                className="flex-1 rounded-md bg-red-700 py-2 text-sm font-bold transition hover:bg-red-600 disabled:opacity-40"
              >
                この方針で捜査を開始する
              </button>
            </div>
          </div>
        </footer>
      )}
      </div>

      {/* 判定結果モーダル（エピローグの執筆が完了したら表示） */}
      {judge && epilogueDone && !resultModalClosed && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4"
          onClick={() => setResultModalClosed(true)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className={`w-full max-w-md rounded-lg border px-6 py-5 text-sm shadow-2xl ${
              judge.is_success
                ? "border-emerald-600 bg-zinc-900"
                : "border-red-700 bg-zinc-900"
            }`}
          >
            <p className="mb-2 text-lg font-black">
              {judge.is_success ? "🎖 捜査成功" : "🕳 捜査失敗"}{" "}
              <span className="text-sm font-normal text-zinc-400">
                （合計 {judge.total} / 100点・70点以上で成功）
              </span>
            </p>
            <ul className="mb-2 space-y-1 text-xs text-zinc-300">
              <li>新人のケア: {judge.rookie_care_score} / 20</li>
              <li>ベテランへの敬意: {judge.veteran_respect_score} / 20</li>
              <li>真犯人の誘導の回避: {judge.culprit_evasion_score} / 60</li>
            </ul>
            <p className="text-xs leading-relaxed text-zinc-400">
              {judge.reason}
            </p>
            <div className="mt-4 flex gap-2">
              <button
                onClick={() => setResultModalClosed(true)}
                className="flex-1 rounded-md border border-zinc-600 py-2 text-xs transition hover:bg-zinc-800"
              >
                閉じる
              </button>
              <button
                onClick={() => window.location.reload()}
                className="flex-1 rounded-md border border-zinc-600 py-2 text-xs transition hover:bg-zinc-800"
              >
                もう一度挑戦する
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
