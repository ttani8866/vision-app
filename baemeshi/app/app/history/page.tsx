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

function mediaUrls(item: PostHistoryRow): string[] {
  try {
    const urls = JSON.parse(item.media_urls_json ?? "[]");
    return Array.isArray(urls) ? urls : [];
  } catch {
    return [];
  }
}

export default function HistoryPage() {
  const [items, setItems] = useState<PostHistoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmingId, setConfirmingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/history")
      .then((r) => r.json())
      .then((j) => setItems(j.items ?? []))
      .finally(() => setLoading(false));
  }, []);

  async function handleDelete(id: number) {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/history?id=${id}`, { method: "DELETE" });
      const json = await res.json();
      if (res.ok && json.ok) {
        setItems((prev) => prev.filter((i) => i.id !== id));
      }
    } finally {
      setDeletingId(null);
      setConfirmingId(null);
    }
  }

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
          {items.map((item) => {
            const urls = mediaUrls(item);
            return (
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

                {urls.length > 0 && (
                  <div className="mt-2 flex gap-1.5 overflow-x-auto">
                    {urls.map((u, i) =>
                      /\.mp4($|\?)/.test(u) ? (
                        <video key={i} src={u} className="h-20 w-20 flex-none rounded-lg object-cover" muted />
                      ) : (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img key={i} src={u} alt={`投稿画像${i + 1}`} className="h-20 w-20 flex-none rounded-lg object-cover" />
                      )
                    )}
                  </div>
                )}

                {item.permalink && (
                  <a
                    href={item.permalink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1.5 block break-all text-sm font-medium text-[var(--grad-c)] underline underline-offset-2"
                  >
                    Instagramで見る
                  </a>
                )}
                {item.caption && (
                  <p className="mt-2 line-clamp-3 whitespace-pre-wrap rounded-xl bg-[var(--cream)] p-2.5 text-xs leading-relaxed text-[var(--ink-soft)]">
                    {item.caption}
                  </p>
                )}
                {item.error_message && (
                  <p className="mt-1 break-all text-xs text-[#b3403c]">{item.error_message}</p>
                )}
                {item.media_id && item.status !== "failed" && <PostReport historyId={item.id} />}

                <div className="mt-3 border-t border-[var(--hairline)] pt-2.5">
                  {confirmingId === item.id ? (
                    <div className="space-y-2">
                      <p className="text-xs leading-relaxed text-[var(--ink-soft)]">
                        この履歴を削除しますか？（アプリの一覧から消えるだけで、Instagram上の投稿は消えません。投稿自体を消す場合は「Instagramで見る」から開いてInstagramアプリで削除してください）
                      </p>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setConfirmingId(null)}
                          className="flex-1 rounded-full border-2 border-[var(--hairline)] bg-[var(--paper)] py-1.5 text-xs font-bold"
                        >
                          キャンセル
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(item.id)}
                          disabled={deletingId === item.id}
                          className="flex-1 rounded-full bg-[#b3403c] py-1.5 text-xs font-bold text-white disabled:opacity-50"
                        >
                          {deletingId === item.id ? "削除中…" : "削除する"}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmingId(item.id)}
                      className="text-xs font-medium text-[var(--ink-soft)] underline underline-offset-2"
                    >
                      履歴から削除
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </>
  );
}
