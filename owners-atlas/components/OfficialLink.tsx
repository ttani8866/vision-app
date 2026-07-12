"use client";

import { track } from "@/lib/analytics";

// 「オーナーになる方法」: 公式サイトへの控えめな案内所風リンク（計測対象）
export default function OfficialLink({
  slug,
  url,
  operator,
}: {
  slug: string;
  url: string;
  operator: string;
}) {
  return (
    <aside className="border-[1.5px] border-ink/50 p-5" aria-label="オーナーになる方法">
      <p className="font-mincho text-sm font-bold">
        <span className="font-fraunces italic mr-2">i</span>
        オーナーになる方法
      </p>
      <p className="mt-2 text-sm leading-relaxed">
        この制度の申し込み・最新の募集状況は、運営元（{operator}
        ）の公式サイトでご確認ください。本サイトは公開情報に基づく紹介であり、申し込みの仲介は行っていません。
      </p>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => track("official_link_click", { case_slug: slug })}
        className="mt-3 inline-block text-sm underline decoration-accent decoration-2 underline-offset-4"
      >
        公式サイトへ（外部リンク）
      </a>
    </aside>
  );
}
