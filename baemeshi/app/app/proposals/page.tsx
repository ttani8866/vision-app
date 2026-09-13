"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AppHeader from "@/components/AppHeader";
import PostReport from "@/components/PostReport";
import type { ProposalBatchRow, ProposalRow, ProposalStatus } from "@/lib/db";

const STATUS_LABEL: Record<ProposalStatus, string> = {
  proposed: "提案中",
  approved: "作成中",
  posted: "投稿済み",
  rejected: "見送り",
};

const STATUS_CLASS: Record<ProposalStatus, string> = {
  proposed: "bg-[#fff7dd] text-[#8a6d1a] border-[#f2dd9a]",
  approved: "bg-[#fdf3e3] text-[var(--grad-b)] border-[var(--hairline)]",
  posted: "bg-[#eefaf0] text-[#2c7a44] border-[#b3e0bd]",
  rejected: "bg-[var(--cream)] text-[var(--ink-soft)] border-[var(--hairline)]",
};

function toDate(s: string): Date {
  const iso = s.includes("T") ? s : s.replace(" ", "T") + "Z";
  return new Date(iso);
}

function parseIssues(b: ProposalBatchRow): string[] {
  try {
    const v = JSON.parse(b.issues_json ?? "[]");
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

function parseGuidelines(
  b: ProposalBatchRow
): { theme: string[]; shoot: string[]; caption: string[]; conversion: string[] } | null {
  try {
    const v = JSON.parse(b.guidelines_json ?? "null");
    if (!v) return null;
    return { theme: v.theme ?? [], shoot: v.shoot ?? [], caption: v.caption ?? [], conversion: v.conversion ?? [] };
  } catch {
    return null;
  }
}

interface KpiView {
  from: string;
  to: string;
  spend: number;
  follows: number;
  cpf: number | null;
  followRate: number | null;
  ctr: number | null;
  note: string | null;
}

/** 生成時に読んだ実績（source_json）から、KPI（CPF）の集計値だけ取り出す */
function parseKpi(b: ProposalBatchRow): KpiView | null {
  try {
    const src = JSON.parse((b as ProposalBatchRow & { source_json?: string }).source_json ?? "null");
    const k = src?.snapshot?.kpi?.last7;
    if (!k) return null;
    return { from: k.from, to: k.to, spend: k.spend, follows: k.follows, cpf: k.cpf, followRate: k.followRate, ctr: k.ctr, note: k.note };
  } catch {
    return null;
  }
}

function KpiChip({ label, value }: { label: string; value: string }) {
  return (
    <span className="flex items-center gap-1 rounded-full border border-[var(--hairline)] bg-[var(--paper)] px-2.5 py-1 text-xs font-bold">
      <span className="text-[var(--ink-soft)]">{label}</span>
      <span>{value}</span>
    </span>
  );
}

function GuideList({ icon, label, items }: { icon: string; label: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div>
      <p className="text-xs font-bold text-[var(--ink-soft)]">
        {icon} {label}
      </p>
      <ul className="mt-0.5 space-y-1">
        {items.map((t, i) => (
          <li key={i} className="flex gap-1.5 text-sm leading-relaxed">
            <span className="flex-none text-[var(--grad-b)]">・</span>
            <span>{t}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function ProposalsPage() {
  const router = useRouter();
  const [batches, setBatches] = useState<ProposalBatchRow[]>([]);
  const [items, setItems] = useState<ProposalRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [showOld, setShowOld] = useState(false);

  async function load() {
    const res = await fetch("/api/proposals");
    const json = await res.json();
    setBatches(json.batches ?? []);
    setItems(json.items ?? []);
  }

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, []);

  async function generate() {
    setGenerating(true);
    setError(null);
    setWarnings([]);
    try {
      const res = await fetch("/api/proposals/generate", { method: "POST" });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error ?? "改善案の生成に失敗しました");
      setWarnings(json.warnings ?? []);
      await load();
    } catch (e) {
      setError(String(e instanceof Error ? e.message : e));
    } finally {
      setGenerating(false);
    }
  }

  async function setStatus(id: number, status: ProposalStatus) {
    setBusyId(id);
    try {
      const res = await fetch("/api/proposals", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error ?? "更新に失敗しました");
      setItems((prev) => prev.map((p) => (p.id === id ? json.item : p)));
      return true;
    } catch (e) {
      setError(String(e instanceof Error ? e.message : e));
      return false;
    } finally {
      setBusyId(null);
    }
  }

  async function approveAndCreate(id: number) {
    if (await setStatus(id, "approved")) router.push(`/?proposal=${id}`);
  }

  const latestBatch = batches[0];
  const visibleBatches = showOld ? batches : batches.slice(0, 1);

  return (
    <>
      <AppHeader
        links={[
          { href: "/", label: "＋ 新規投稿" },
          { href: "/history", label: "投稿履歴" },
        ]}
      />
      <main className="mx-auto max-w-md px-4 pb-16 pt-5">
        <Link
          href="/"
          className="mb-3 inline-flex items-center gap-1 rounded-full border-2 border-[var(--hairline)] bg-[var(--paper)] px-3.5 py-1.5 text-sm font-bold text-[var(--ink)] active:scale-95"
        >
          ← 戻る
        </Link>
        <h1 className="font-display sparkle mb-1 text-xl font-extrabold">改善案</h1>
        <p className="mb-4 text-sm leading-relaxed text-[var(--ink-soft)]">
          CPF（フォロー獲得単価）を主軸、CTRを従として直近7日の広告実績と投稿の反応を読み、現状の課題・傾向・対策の指針と、次の投稿の型を3つ出します。型は店を選ばず使える形で、気に入った型は「この型で作る」で投稿フローに進みます。
        </p>

        <button type="button" onClick={generate} disabled={generating} className="btn-primary">
          {generating ? "実績を読んでいます…（30秒ほど）" : latestBatch ? "最新の実績で作り直す" : "実績を読んで新案を作る"}
        </button>

        {error && <p className="note-error mt-3">{error}</p>}
        {warnings.length > 0 && (
          <div className="note-warn mt-3">
            <p className="mb-1 text-xs font-bold">一部のデータは取れませんでした</p>
            {warnings.map((w, i) => (
              <p key={i} className="text-xs leading-relaxed">
                {w}
              </p>
            ))}
          </div>
        )}

        {loading && <p className="mt-4 text-sm text-[var(--ink-soft)]">読み込み中…</p>}
        {!loading && !latestBatch && !generating && (
          <div className="card mt-4 p-8 text-center text-sm text-[var(--ink-soft)]">改善案はまだありません</div>
        )}

        {visibleBatches.map((batch) => {
          const proposals = items.filter((p) => p.batch_id === batch.id);
          const issues = parseIssues(batch);
          const guides = parseGuidelines(batch);
          const kpi = parseKpi(batch);
          return (
            <section key={batch.id} className="mt-5 space-y-3">
              <div className="card space-y-3 p-4">
                <p className="text-xs font-bold text-[var(--ink-soft)]">
                  {toDate(batch.created_at).toLocaleString("ja-JP")} の実績から
                </p>

                {kpi && (
                  <div>
                    <p className="text-xs font-bold text-[var(--ink-soft)]">
                      🎯 KPI: CPF（フォロー獲得単価）{kpi.from.slice(5)}〜{kpi.to.slice(5)}
                    </p>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      <KpiChip label="CPF" value={kpi.cpf === null ? "算出不可" : `${kpi.cpf.toLocaleString("ja-JP")}円`} />
                      <KpiChip label="新規フォロワー" value={`${kpi.follows.toLocaleString("ja-JP")}人`} />
                      <KpiChip label="消化" value={`${kpi.spend.toLocaleString("ja-JP")}円`} />
                      <KpiChip label="クリック→フォロー" value={kpi.followRate === null ? "不明" : `${kpi.followRate}%`} />
                      <KpiChip label="CTR（従）" value={kpi.ctr === null ? "不明" : `${kpi.ctr}%`} />
                    </div>
                    {kpi.note && <p className="mt-1 text-[11px] text-[var(--ink-soft)]">{kpi.note}</p>}
                  </div>
                )}

                {issues.length > 0 && (
                  <div className="note-warn">
                    <p className="mb-1 text-xs font-bold">🤔 現状の課題</p>
                    <ul className="space-y-1">
                      {issues.map((t, i) => (
                        <li key={i} className="flex gap-1.5 leading-relaxed">
                          <span className="flex-none">・</span>
                          <span>{t}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div>
                  <p className="text-xs font-bold text-[var(--ink-soft)]">📈 傾向</p>
                  <p className="mt-0.5 text-sm leading-relaxed">{batch.summary}</p>
                </div>

                {guides && (
                  <div className="note-info space-y-2.5">
                    <p className="text-xs font-bold">💪 対策（次にどの店に行っても使える指針）</p>
                    <GuideList icon="🎯" label="テーマ設定" items={guides.theme} />
                    <GuideList icon="📷" label="撮り方" items={guides.shoot} />
                    <GuideList icon="✍️" label="キャプション" items={guides.caption} />
                    <GuideList icon="🔁" label="フォロー転換（クリック後）" items={guides.conversion} />
                  </div>
                )}
              </div>

              <p className="pt-1 text-xs font-bold text-[var(--ink-soft)]">次の投稿の型（店は選ばず使える）</p>

              {proposals.map((p) => (
                <div key={p.id} className="card p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="chip chip-on inline-block text-xs">{p.genre}</span>
                      <h2 className="font-display mt-1.5 text-lg font-extrabold leading-snug">{p.title}</h2>
                    </div>
                    <span className={`flex-none rounded-full border px-2.5 py-0.5 text-xs font-bold ${STATUS_CLASS[p.status]}`}>
                      {STATUS_LABEL[p.status]}
                    </span>
                  </div>

                  <div className="mt-3 space-y-2 text-sm leading-relaxed">
                    <div>
                      <p className="text-xs font-bold text-[var(--ink-soft)]">✍️ 切り口</p>
                      <p>{p.hook}</p>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-[var(--ink-soft)]">📷 撮り方</p>
                      <p>{p.shoot}</p>
                    </div>
                    <div className="note-info">
                      <p className="mb-0.5 text-xs font-bold">💡 改善理由</p>
                      <p>{p.reason}</p>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-[var(--ink-soft)]">📊 根拠</p>
                      <p className="text-[var(--ink-soft)]">{p.evidence}</p>
                    </div>
                  </div>

                  {(p.status === "proposed" || p.status === "rejected") && (
                    <div className="mt-3 flex gap-2">
                      <button
                        type="button"
                        onClick={() => approveAndCreate(p.id)}
                        disabled={busyId === p.id}
                        className="btn-primary flex-1 py-2.5 text-sm"
                      >
                        この型で作る
                      </button>
                      {p.status === "proposed" && (
                        <button
                          type="button"
                          onClick={() => setStatus(p.id, "rejected")}
                          disabled={busyId === p.id}
                          className="btn-secondary flex-1 py-2.5 text-sm"
                        >
                          見送る
                        </button>
                      )}
                    </div>
                  )}

                  {p.status === "approved" && (
                    <div className="mt-3 flex gap-2">
                      <Link href={`/?proposal=${p.id}`} className="btn-primary flex-1 py-2.5 text-sm">
                        投稿を続ける
                      </Link>
                      <button
                        type="button"
                        onClick={() => setStatus(p.id, "proposed")}
                        disabled={busyId === p.id}
                        className="btn-secondary flex-1 py-2.5 text-sm"
                      >
                        提案に戻す
                      </button>
                    </div>
                  )}

                  {p.status === "posted" && p.history_id && (
                    <>
                      <p className="mt-3 text-xs text-[var(--ink-soft)]">
                        この案から投稿しました。
                        <Link href="/history" className="ml-1 underline underline-offset-2">
                          投稿履歴を見る
                        </Link>
                      </p>
                      <PostReport historyId={p.history_id} />
                    </>
                  )}
                </div>
              ))}
            </section>
          );
        })}

        {batches.length > 1 && (
          <button
            type="button"
            onClick={() => setShowOld((v) => !v)}
            className="mt-5 w-full text-center text-sm font-medium text-[var(--ink-soft)] underline underline-offset-4"
          >
            {showOld ? "過去の案を閉じる" : `過去の案を見る（${batches.length - 1}回分）`}
          </button>
        )}
      </main>
    </>
  );
}
