"use client";

import { useEffect, useState } from "react";
import type { StoreInfo } from "@/lib/types";

export default function CaptionStep({
  store,
  caption,
  onChangeCaption,
  onNext,
}: {
  store: StoreInfo;
  caption: string;
  onChangeCaption: (c: string) => void;
  onNext: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/caption", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ store }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error ?? "生成に失敗しました");
      onChangeCaption(json.caption);
    } catch (e) {
      setError(String(e instanceof Error ? e.message : e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!caption) generate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-4">
      <h2 className="font-display sparkle text-xl font-extrabold">キャプション生成</h2>
      <p className="text-sm leading-relaxed text-[var(--ink-soft)]">
        AIがテンプレートに沿って下書きします。自由に手直しできます。
      </p>

      {error && <p className="note-error">{error}</p>}

      <textarea
        value={caption}
        onChange={(e) => onChangeCaption(e.target.value)}
        rows={16}
        placeholder={loading ? "生成中…" : ""}
        className="field whitespace-pre-wrap text-sm leading-relaxed"
      />

      <div className="flex gap-2">
        <button type="button" onClick={generate} disabled={loading} className="btn-secondary flex-1">
          {loading ? "生成中…" : "再生成"}
        </button>
        <button
          type="button"
          onClick={onNext}
          disabled={loading || !caption.trim()}
          className="btn-primary flex-1"
        >
          プレビューへ
        </button>
      </div>
    </div>
  );
}
