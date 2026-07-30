"use client";

import { useState } from "react";

// 404になった画像パスを記録し、以後の再リクエストや再フォールバックを避ける
const missingImages = new Set<string>();

type SmartImageProps = {
  /** 優先順に試す画像パス。先頭から順に読み込みを試し、失敗したら次を試す */
  srcs: string[];
  alt: string;
  className?: string;
  /** すべての候補が読み込めなかった場合に表示するフォールバックUI */
  fallback: React.ReactNode;
};

/**
 * `public/images/` に画像が未配置でもアプリが壊れないようにするための
 * 画像コンポーネント。存在しないパスは静かにフォールバック表示へ切り替える。
 */
export function SmartImage({ srcs, alt, className, fallback }: SmartImageProps) {
  const [idx, setIdx] = useState(() =>
    srcs.findIndex((s) => !missingImages.has(s)),
  );
  const src = idx >= 0 && idx < srcs.length ? srcs[idx] : undefined;

  if (!src) {
    return <>{fallback}</>;
  }

  return (
    /* eslint-disable-next-line @next/next/no-img-element -- 存在しない場合にフォールバックするため素のimgを使う */
    <img
      src={src}
      alt={alt}
      className={className}
      onError={() => {
        missingImages.add(src);
        let next = idx + 1;
        while (next < srcs.length && missingImages.has(srcs[next])) {
          next++;
        }
        setIdx(next < srcs.length ? next : -1);
      }}
    />
  );
}
