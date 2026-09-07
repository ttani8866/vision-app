"use client";

import { useEffect, useState } from "react";
import type { PostTarget, UploadedMedia } from "@/lib/types";
import ConfirmModal from "./ConfirmModal";

interface PublishResult {
  ok: boolean;
  mediaId?: string;
  permalink?: string | null;
  error?: string;
}

const TARGET_LABEL: Record<PostTarget, string> = {
  image: "フィード（画像）",
  reel: "リール",
  feed_video: "フィード（動画）",
  carousel: "フィード（カルーセル）",
};

export default function PreviewStep({
  media,
  target,
  caption,
  storeName,
  onPosted,
}: {
  media: UploadedMedia[];
  target: PostTarget;
  caption: string;
  storeName: string;
  onPosted: () => void;
}) {
  const [warnLessThan24h, setWarnLessThan24h] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [result, setResult] = useState<PublishResult | null>(null);

  useEffect(() => {
    fetch("/api/post-interval")
      .then((r) => r.json())
      .then((j) => setWarnLessThan24h(Boolean(j.warnLessThan24h)))
      .catch(() => {});
  }, []);

  async function handleConfirm() {
    setSubmitting(true);
    try {
      const res = await fetch("/api/publish", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          target,
          media: media.map((m) => ({ url: m.url, kind: m.kind })),
          caption,
          storeName,
        }),
      });
      const started = await res.json();
      if (!res.ok || !started.ok) {
        throw new Error(started.error ?? "投稿の開始に失敗しました");
      }

      setShowModal(false);
      setPublishing(true);

      // ジョブ完了まで5秒間隔でポーリング（最大12分）
      const deadline = Date.now() + 12 * 60 * 1000;
      for (;;) {
        await new Promise((r) => setTimeout(r, 5000));
        const statusRes = await fetch(`/api/publish?jobId=${started.jobId}`);
        const status = await statusRes.json();
        if (!statusRes.ok || !status.ok) {
          throw new Error(status.error ?? "投稿状況の取得に失敗しました");
        }
        if (status.state === "success") {
          setResult({ ok: true, mediaId: status.mediaId, permalink: status.permalink });
          onPosted();
          break;
        }
        if (status.state === "failed") {
          setResult({ ok: false, error: status.error });
          break;
        }
        if (Date.now() > deadline) {
          throw new Error("投稿処理がタイムアウトしました。投稿履歴で結果を確認してください。");
        }
      }
    } catch (e) {
      setResult({ ok: false, error: String(e instanceof Error ? e.message : e) });
    } finally {
      setSubmitting(false);
      setPublishing(false);
      setShowModal(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display sparkle text-xl font-extrabold">プレビュー</h2>
        <span
          className="rounded-full px-3 py-1 text-xs font-bold text-white"
          style={{ background: "linear-gradient(100deg, var(--grad-a), var(--grad-b) 55%, var(--grad-c))" }}
        >
          {TARGET_LABEL[target]}
        </span>
      </div>

      {/* Instagram風フレーム */}
      <div className="card overflow-hidden">
        <div className="flex items-center gap-2.5 border-b border-[var(--hairline)] px-3 py-2.5">
          <span
            className="flex h-8 w-8 items-center justify-center rounded-full text-sm"
            style={{ background: "linear-gradient(120deg, var(--grad-a), var(--grad-b) 60%, var(--grad-c))" }}
          >
            🍚
          </span>
          <span className="text-sm font-bold">baemeshi_official</span>
          <span className="ml-auto text-[var(--ink-soft)]">…</span>
        </div>

        <div className="flex snap-x snap-mandatory gap-2 overflow-x-auto bg-[var(--cream)] p-2">
          {media.map((m) => (
            <div key={m.key} className="w-full flex-none snap-center">
              {m.kind === "image" ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={m.url} alt="投稿プレビュー" className="max-h-96 w-full rounded-lg object-contain" />
              ) : (
                <video src={m.url} controls className="max-h-96 w-full rounded-lg" />
              )}
            </div>
          ))}
        </div>
        {media.length > 1 && (
          <div className="flex justify-center gap-1 py-1.5">
            {media.map((m, i) => (
              <span
                key={m.key}
                className={`h-1.5 w-1.5 rounded-full ${i === 0 ? "bg-[var(--grad-b)]" : "bg-[var(--hairline)]"}`}
              />
            ))}
          </div>
        )}
        <pre className="whitespace-pre-wrap px-3 py-3 font-sans text-sm leading-relaxed">{caption}</pre>
      </div>

      {warnLessThan24h && !result && (
        <p className="note-warn">前回投稿から24時間未満です。投稿は可能ですが、間隔にご注意ください。</p>
      )}

      {result?.ok && (
        <div className="note-success">
          投稿が完了しました。
          <br />
          投稿ID: {result.mediaId}
          <br />
          {result.permalink && (
            <a href={result.permalink} target="_blank" rel="noopener noreferrer" className="underline">
              {result.permalink}
            </a>
          )}
        </div>
      )}

      {result && !result.ok && (
        <div className="note-error">
          投稿に失敗しました。
          <pre className="mt-1 whitespace-pre-wrap break-all text-xs">{result.error}</pre>
        </div>
      )}

      {publishing && (
        <p className="note-info">
          投稿処理中…そのままお待ちください（動画は数分かかることがあります）
        </p>
      )}

      {!result?.ok && !publishing && (
        <button type="button" onClick={() => setShowModal(true)} className="btn-primary">
          投稿する
        </button>
      )}

      {showModal && (
        <ConfirmModal
          storeName={storeName}
          warnLessThan24h={warnLessThan24h}
          submitting={submitting}
          onCancel={() => setShowModal(false)}
          onConfirm={handleConfirm}
        />
      )}
    </div>
  );
}
