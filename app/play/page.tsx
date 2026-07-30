import type { Metadata } from "next";
import PlayGame from "./PlayGame";

export const metadata: Metadata = {
  title: "捜査会議 | プロトコル・シェア",
  description: "第1章 屋上の遺書 ―― 捜査会議シミュレーション本編",
};

export default function PlayPage() {
  return <PlayGame />;
}
