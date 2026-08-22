"use client";

import React from "react";
import { AGENTS } from "@/data/agents";
import { PENDING } from "@/data/pending";
import { DATA_SOURCE_NOTE, DATA_UPDATED_AT, DISCORD_TOAST } from "@/data/meta";
import { OrgCanvas } from "./OrgCanvas";
import { OrgStack } from "./OrgStack";
import { ShintoTab } from "./ShintoTab";
import { PrismTab } from "./PrismTab";
import { PendingTab } from "./PendingTab";
import { DetailPanel } from "./DetailPanel";
import { Toast } from "./Toast";
import styles from "./dashboard.module.css";

type TabId = "all" | "shinto" | "kpr" | "pending";

const TABS: Array<{ id: TabId; label: string }> = [
  { id: "all", label: "全体" },
  { id: "shinto", label: "SHINTO" },
  { id: "kpr", label: "KPR-Prism" },
  { id: "pending", label: "未対応・保留" },
];

export interface DashboardProps {
  /** SHINTOとPrismの未連携を示す赤い破線を出す */
  showGapLines?: boolean;
  /** ステータス凡例を出す */
  showLegend?: boolean;
}

export function Dashboard({ showGapLines = true, showLegend = true }: DashboardProps) {
  const [tab, setTab] = React.useState<TabId>("all");
  const [sel, setSel] = React.useState<string | null>(null);
  const [toast, setToast] = React.useState("");
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  const sendDiscord = React.useCallback(() => {
    setToast(DISCORD_TOAST);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(""), 2400);
  }, []);

  const open = React.useCallback((id: string) => setSel(id), []);
  const close = React.useCallback(() => setSel(null), []);

  return (
    <div style={{ minHeight: "100vh", background: "var(--shell-bg)", paddingBottom: 60 }}>
      <header
        className={styles.shellWidth}
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          gap: 16,
          flexWrap: "wrap",
          paddingTop: 20,
        }}
      >
        <div style={{ display: "flex", alignItems: "baseline", gap: 14, flexWrap: "wrap" }}>
          <h1
            style={{
              margin: 0,
              fontSize: "var(--text-lg)",
              fontWeight: "var(--weight-bold)",
              color: "var(--shell-text-strong)",
              letterSpacing: "var(--tracking-ja)",
            }}
          >
            AIエージェントダッシュボード
          </h1>
          <div
            style={{
              fontSize: "var(--text-xs)",
              fontWeight: "var(--weight-bold)",
              letterSpacing: "var(--tracking-caps)",
              color: "var(--gold-500)",
            }}
          >
            AGENT OPS · 確定版
          </div>
        </div>
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "var(--text-xs)",
            color: "var(--shell-text-subtle)",
          }}
        >
          データ更新 {DATA_UPDATED_AT} · {DATA_SOURCE_NOTE}
        </div>
      </header>

      <div className={styles.shellWidth} style={{ paddingTop: 16 }}>
        <div className={styles.tabList} role="tablist" aria-label="表示の切り替え">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              id={`tab-${t.id}`}
              aria-selected={tab === t.id}
              aria-controls={`panel-${t.id}`}
              className={`${styles.tab} ${tab === t.id ? styles.tabActive : ""}`}
              onClick={() => setTab(t.id)}
            >
              {t.label}
              {t.id === "pending" && (
                <span
                  style={{
                    background: "var(--shell-warning)",
                    color: "var(--navy-900)",
                    fontFamily: "var(--font-mono)",
                    fontSize: "var(--text-xs)",
                    fontWeight: "var(--weight-bold)",
                    padding: "1px 7px",
                    borderRadius: "var(--radius-pill)",
                  }}
                >
                  {PENDING.length}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {tab === "all" && (
        <div role="tabpanel" id="panel-all" aria-labelledby="tab-all">
          <OrgCanvas
            onOpen={open}
            onSendDiscord={sendDiscord}
            showGapLines={showGapLines}
            showLegend={showLegend}
          />
          <OrgStack
            onOpen={open}
            onSendDiscord={sendDiscord}
            showGapLines={showGapLines}
            showLegend={showLegend}
          />
        </div>
      )}

      {tab === "shinto" && (
        <div role="tabpanel" id="panel-shinto" aria-labelledby="tab-shinto">
          <ShintoTab onOpen={open} />
        </div>
      )}

      {tab === "kpr" && (
        <div role="tabpanel" id="panel-kpr" aria-labelledby="tab-kpr">
          <PrismTab />
        </div>
      )}

      {tab === "pending" && (
        <div role="tabpanel" id="panel-pending" aria-labelledby="tab-pending">
          <PendingTab />
        </div>
      )}

      <DetailPanel agent={sel ? AGENTS[sel] : null} onClose={close} />
      <Toast message={toast} />
    </div>
  );
}
