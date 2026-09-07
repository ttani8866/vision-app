"use client";

import { useState } from "react";
import type { MediaMetrics } from "@/lib/instagram";

interface ReportData {
  metrics: MediaMetrics;
  seika: string;
  kadai: string;
  taisaku: string;
  generatedAt: string;
}

function MetricChip({ icon, label, value }: { icon: string; label: string; value: number | null }) {
  if (value === null) return null;
  return (
    <span className="flex items-center gap-1 rounded-full border border-[var(--hairline)] bg-[var(--cream)] px-2.5 py-1 text-xs font-bold">
      <span aria-hidden>{icon}</span>
      <span className="text-[var(--ink-soft)]">{label}</span>
      <span>{value.toLocaleString("ja-JP")}</span>
    </span>
  );
}

export default function PostReport({ historyId }: { historyId: number }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<ReportData | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load(refresh = false) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/report?historyId=${historyId}${refresh ? "&refresh=1" : ""}`);
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error ?? "レポートの取得に失敗しました");
      setReport(json);
    } catch (e) {
      setError(String(e instanceof Error ? e.message : e));
    } finally {
      setLoading(false);
    }
  }

  function toggle() {
    const next = !open;
    setOpen(next);
    if (next && !report && !loading) load();
  }

  return (
    <div className="mt-3 border-t border-[var(--hairline)] pt-3">
      <button
        type="button"
        onClick={toggle}
        className="flex w-full items-center justify-between text-sm font-bold text-[var(--ink)]"
      >
        <span className="sparkle">結果レポート</span>
        <span className="text-[var(--ink-soft)]">{open ? "閉じる ▲" : "見る ▼"}</span>
      </button>

      {open && (
        <div className="mt-3 space-y-3">
          {loading && <p className="text-sm text-[var(--ink-soft)]">集計中…ちょっと待ってね</p>}
          {error && <p className="note-error">{error}</p>}

          {report && !loading && (
            <>
              <div className="flex flex-wrap gap-1.5">
                <MetricChip icon="❤️" label="いいね" value={report.metrics.likeCount} />
                <MetricChip icon="💬" label="コメント" value={report.metrics.commentsCount} />
                <MetricChip icon="🔖" label="保存" value={report.metrics.saved} />
                <MetricChip icon="📤" label="シェア" value={report.metrics.shares} />
                <MetricChip icon="👀" label="リーチ" value={report.metrics.reach} />
                <MetricChip icon="▶️" label="表示" value={report.metrics.views} />
              </div>

              <div className="note-success">
                <p className="mb-1 text-xs font-bold">🎉 成果</p>
                <p className="leading-relaxed">{report.seika}</p>
              </div>
              <div className="note-warn">
                <p className="mb-1 text-xs font-bold">🤔 課題</p>
                <p className="leading-relaxed">{report.kadai}</p>
              </div>
              <div className="note-info">
                <p className="mb-1 text-xs font-bold">💪 対策</p>
                <p className="leading-relaxed">{report.taisaku}</p>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs text-[var(--ink-soft)]">
                  集計: {new Date(report.generatedAt + "Z").toLocaleString("ja-JP")}
                </span>
                <button
                  type="button"
                  onClick={() => load(true)}
                  disabled={loading}
                  className="rounded-full border-2 border-[var(--hairline)] bg-[var(--paper)] px-3 py-1 text-xs font-bold disabled:opacity-40"
                >
                  最新データで更新
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
