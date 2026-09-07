"use client";

import { useEffect, useState } from "react";
import AppHeader from "@/components/AppHeader";
import PostReport from "@/components/PostReport";
import type { PostHistoryRow } from "@/lib/db";

const STATUS_LABEL: Record<PostHistoryRow["status"], string> = {
  success: "成功",
  failed: "失敗",
  dry_run: "テスト",
};

const STATUS_CLASS: Record<PostHistoryRow["status"], string> = {
  success: "bg-[#eefaf0] text-[#2c7a44] border-[#b3e0bd]",
  failed: "bg-[#ffefef] text-[#b3403c] border-[#f3b1b1]",
  dry_run: "bg-[var(--cream)] text-[var(--ink-soft)] border-[var(--hairline)]",
};

const MEDIA_TYPE_LABEL: Record<PostHistoryRow["media_type"], string> = {
  image: "画像",
  reel: "リール",
  feed_video: "フィード動画",
  carousel: "カルーセル",
};

export default function HistoryPage() {
  const [items, setItems] = useState<PostHistoryRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/history")
      .then((r) => r.json())
      .then((j) => setItems(j.items ?? []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <AppHeader rightHref="/" rightLabel="＋ 新規投稿" />
      <main className="mx-auto max-w-md px-4 pb-16 pt-5">
        <h1 className="font-display sparkle mb-4 text-xl font-extrabold">投稿履歴</h1>

        {loading && <p className="text-sm text-[var(--ink-soft)]">読み込み中…</p>}
        {!loading && items.length === 0 && (
          <div className="card p-8 text-center text-sm text-[var(--ink-soft)]">
            投稿履歴はまだありません
          </div>
        )}

        <div className="space-y-3">
          {items.map((item) => (
            <div key={item.id} className="card p-4">
              <div className="flex items-center justify-between">
                <span className="font-display font-bold">{item.store_name}</span>
                <span className={`rounded-full border px-2.5 py-0.5 text-xs font-bold ${STATUS_CLASS[item.status]}`}>
                  {STATUS_LABEL[item.status]}
                </span>
              </div>
              <p className="mt-1 text-xs text-[var(--ink-soft)]">
                {new Date(item.posted_at).toLocaleString("ja-JP")} ・ {MEDIA_TYPE_LABEL[item.media_type]}
                {item.media_count > 1 ? `（${item.media_count}件）` : ""}
              </p>
              {item.permalink && (
                <a
                  href={item.permalink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1.5 block break-all text-sm font-medium text-[var(--grad-c)] underline underline-offset-2"
                >
                  {item.permalink}
                </a>
              )}
              {item.media_id && (
                <p className="mt-1 text-xs text-[var(--ink-soft)]">投稿ID: {item.media_id}</p>
              )}
              {item.caption && (
                <p className="mt-2 line-clamp-3 whitespace-pre-wrap rounded-xl bg-[var(--cream)] p-2.5 text-xs leading-relaxed text-[var(--ink-soft)]">
                  {item.caption}
                </p>
              )}
              {item.error_message && (
                <p className="mt-1 break-all text-xs text-[#b3403c]">{item.error_message}</p>
              )}
              {item.media_id && <PostReport historyId={item.id} />}
            </div>
          ))}
        </div>
      </main>
    </>
  );
}
