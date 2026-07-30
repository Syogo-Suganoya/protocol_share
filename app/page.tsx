import Link from "next/link";
import { scenario } from "@/lib/scenario";
import { isMockMode } from "@/lib/gemini";
import { SmartImage } from "@/lib/SmartImage";

function ConceptCard({
  icon,
  title,
  desc,
}: {
  icon: string;
  title: string;
  desc: string;
}) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-6">
      <p className="mb-3 text-3xl">{icon}</p>
      <h3 className="mb-2 text-base font-bold">{title}</h3>
      <p className="text-sm leading-relaxed text-zinc-400">{desc}</p>
    </div>
  );
}

function CharacterCard({
  id,
  name,
  role,
  desc,
  accent,
}: {
  id: string;
  name: string;
  role: string;
  desc: string;
  accent: string;
}) {
  return (
    <div className={`rounded-xl border ${accent} bg-zinc-900/60 p-5 text-center`}>
      <div className="mx-auto mb-4 h-20 w-20 overflow-hidden rounded-full border border-zinc-700 bg-zinc-800">
        <SmartImage
          srcs={[`/images/char_${id}.png`]}
          alt={name}
          className="h-20 w-20 object-cover object-top"
          fallback={
            <div className="flex h-20 w-20 items-center justify-center text-2xl font-bold text-zinc-300">
              {name.charAt(0)}
            </div>
          }
        />
      </div>
      <p className="mb-1 text-xs font-bold text-zinc-400">{role}</p>
      <p className="mb-2 text-base font-bold">{name}</p>
      <p className="text-xs leading-relaxed text-zinc-400">{desc}</p>
    </div>
  );
}

function FlowStep({
  n,
  title,
  desc,
}: {
  n: number;
  title: string;
  desc: string;
}) {
  return (
    <li className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-6">
      <p className="mb-3 text-xs font-bold tracking-widest text-red-500">
        STEP {n}
      </p>
      <h3 className="mb-2 text-base font-bold">{title}</h3>
      <p className="text-sm leading-relaxed text-zinc-400">{desc}</p>
    </li>
  );
}

export default function LandingPage() {
  const mockMode = isMockMode();

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* ヒーロー */}
      <section className="relative overflow-hidden border-b border-zinc-800">
        <div
          aria-hidden
          className="absolute inset-0 bg-zinc-950 bg-cover bg-center"
          style={{ backgroundImage: "url(/images/bg_title.png)" }}
        />
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-b from-zinc-950/70 via-zinc-950/85 to-zinc-950"
        />
        <div className="relative mx-auto flex max-w-3xl flex-col items-center gap-6 px-6 py-24 text-center">
          {mockMode && (
            <span className="rounded-full border border-amber-600/60 bg-amber-950/50 px-3 py-1 text-xs font-bold text-amber-300">
              🧪 現在モックモードで動作中 ―― APIキー無しでもすぐに体験できます
            </span>
          )}
          <p className="text-sm tracking-[0.4em] text-zinc-500">
            PROTOCOL : SHARE
          </p>
          <SmartImage
            srcs={["/images/logo.png"]}
            alt="プロトコル・シェア"
            className="w-full max-w-md"
            fallback={
              <h1 className="text-5xl font-black tracking-wider">
                プロトコル・シェア
              </h1>
            }
          />
          <p className="max-w-xl text-base leading-relaxed text-zinc-300">
            生成AI（LLM）のマルチエージェント技術を活用した、次世代の捜査会議シミュレーションゲーム。
          </p>
          <p className="max-w-md text-sm leading-relaxed text-zinc-400">
            論破すれば、会議は死ぬ。
            <br />
            寄り添い、束ね、チームで真実へたどり着け。
            <br />
            ―― ただし刑事の中に、犯人がいる。
          </p>
          <Link
            href="/play"
            className="mt-4 rounded-lg bg-red-700 px-10 py-3 font-bold tracking-widest transition hover:bg-red-600"
          >
            捜査会議を開始する
          </Link>
          <p className="text-xs text-zinc-600">{scenario.title}</p>
        </div>
      </section>

      {/* コアコンセプト */}
      <section className="mx-auto max-w-5xl px-6 py-20">
        <h2 className="mb-10 text-center text-2xl font-bold tracking-wide">
          コアコンセプト
        </h2>
        <div className="grid gap-6 sm:grid-cols-3">
          <ConceptCard
            icon="🤝"
            title="正論より寄り添い"
            desc="仲間の間違いを「論破」すればチームは瓦解する。感情をケアし、能力を最大化せよ。"
          />
          <ConceptCard
            icon="🧩"
            title="私たち vs 事件"
            desc="「私 vs 犯人」ではなく、チーム全員で一つの正しい捜査手順を共同構築する。"
          />
          <ConceptCard
            icon="📖"
            title="動的エピローグ"
            desc="会議での立ち回りと最終判断に基づき、AIがあなただけの結末をドラマチックに生成する。"
          />
        </div>
      </section>

      {/* 登場人物 */}
      <section className="border-y border-zinc-800 bg-zinc-900/40 py-20">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="mb-10 text-center text-2xl font-bold tracking-wide">
            登場人物
          </h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <CharacterCard
              id="nagumo"
              name="南雲"
              role="主任（プレイヤー）"
              desc="捜査一課の主任。会議を進行し、部下たちの心情を汲みながら方針を導く。"
              accent="border-zinc-600"
            />
            <CharacterCard
              id="yashiro"
              name="矢代圭吾"
              role="せっかちな新人"
              desc="焦燥と正義感が先走りがち。頭ごなしに否定すると腐るが、寄り添えば鋭い観察眼を発揮する。"
              accent="border-sky-500/60"
            />
            <CharacterCard
              id="kenmochi"
              name="剣持巌"
              role="意固地なベテラン"
              desc="経験と現場主義に誇りを持つ。データで論破すると心を閉ざすが、敬意を払えば重要証言を出す。"
              accent="border-amber-500/60"
            />
            <CharacterCard
              id="hasekura"
              name="支倉冴子"
              role="穏やかな調整役"
              desc="誰にでも優しく同調する聞き上手。会議で最も話しやすい相手に見えるが……？"
              accent="border-violet-500/60"
            />
          </div>
        </div>
      </section>

      {/* ゲームの流れ */}
      <section className="mx-auto max-w-5xl px-6 py-20">
        <h2 className="mb-10 text-center text-2xl font-bold tracking-wide">
          ゲームの流れ
        </h2>
        <ol className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <FlowStep
            n={1}
            title="会議に参加する"
            desc="自由入力で発言するか、「発言を進める」でNPC同士の掛け合いを見守る。"
          />
          <FlowStep
            n={2}
            title="捜査手順を決定する"
            desc="十分に議論したら、誰を・どこを・どう捜査するか最終提案をまとめる。"
          />
          <FlowStep
            n={3}
            title="AIジャッジが採点"
            desc="新人のケア・ベテランへの敬意・誘導の回避の3軸で会議ログを評価する。"
          />
          <FlowStep
            n={4}
            title="結末が生成される"
            desc="判定結果に基づき、あなただけの結末が小説風にタイピング演出で表示される。"
          />
        </ol>
      </section>

      {/* CTA フッター */}
      <section className="border-t border-zinc-800 bg-zinc-900/60 py-20 text-center">
        <div className="mx-auto max-w-md px-6">
          <h2 className="mb-4 text-xl font-bold">準備はいいか、主任。</h2>
          <p className="mb-8 text-sm leading-relaxed text-zinc-400">
            会議室の空気を凍らせるな。あなたの選択が、部下たちの運命と事件の結末を変える。
          </p>
          <Link
            href="/play"
            className="inline-block rounded-lg bg-red-700 px-10 py-3 font-bold tracking-widest transition hover:bg-red-600"
          >
            捜査会議を開始する
          </Link>
        </div>
      </section>

      <footer className="border-t border-zinc-800 px-6 py-6 text-center text-xs text-zinc-600">
        プロトコル・シェア（Protocol Share） ―― 生成AI駆動型・対話ミステリアドベンチャー
      </footer>
    </div>
  );
}
