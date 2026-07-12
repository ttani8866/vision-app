"use client";

import { track } from "@/lib/analytics";

// 計測付きシェアボタン群（X、LINE、URLコピー）
export default function ShareBar({
  slug,
  title,
}: {
  slug: string;
  title: string;
}) {
  const url = () => `${location.origin}/case/${slug}`;

  const shareX = () => {
    track("share_click", { case_slug: slug, channel: "x" });
    window.open(
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(`${title} | Owner's Atlas`)}&url=${encodeURIComponent(url())}`,
      "_blank",
      "noopener"
    );
  };

  const shareLine = () => {
    track("share_click", { case_slug: slug, channel: "line" });
    window.open(
      `https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(url())}`,
      "_blank",
      "noopener"
    );
  };

  const copyUrl = async () => {
    track("share_click", { case_slug: slug, channel: "copy" });
    await navigator.clipboard.writeText(url());
    alert("リンクをコピーしました");
  };

  return (
    <div className="flex flex-wrap items-center gap-3" aria-label="この目的地をシェア">
      <span className="font-mincho text-sm font-bold">旅の便りを送る:</span>
      <button onClick={shareX} className="border-[1.5px] border-ink px-4 py-1.5 text-sm shift-hover">
        Xでシェア
      </button>
      <button onClick={shareLine} className="border-[1.5px] border-ink px-4 py-1.5 text-sm shift-hover">
        LINEで送る
      </button>
      <button onClick={copyUrl} className="border-[1.5px] border-ink px-4 py-1.5 text-sm shift-hover">
        URLをコピー
      </button>
    </div>
  );
}
