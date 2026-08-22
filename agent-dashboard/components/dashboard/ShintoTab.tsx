"use client";

import { SHINTO_ROWS } from "@/data/agents";
import { StatusDot } from "@/components/ds/StatusDot";
import { Eyebrow } from "./primitives";
import styles from "./dashboard.module.css";

export function ShintoTab({ onOpen }: { onOpen: (id: string) => void }) {
  return (
    <div className={styles.shellWidth} style={{ marginTop: 24 }}>
      <Eyebrow style={{ marginBottom: 12 }}>SHINTO系統 · Claude Code基盤</Eyebrow>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {SHINTO_ROWS.map((r) => (
          <button
            key={r.id}
            type="button"
            className={styles.shintoRow}
            onClick={() => onOpen(r.id)}
            aria-label={r.name + " の詳細を開く"}
          >
            <StatusDot status={r.status} />
            <span className={styles.shintoName}>{r.name}</span>
            <span className={styles.shintoPost}>{r.post}</span>
            <span className={styles.shintoDesc}>{r.desc}</span>
            <span className={styles.shintoTrigger}>{r.trigger}</span>
          </button>
        ))}
      </div>

      <div
        style={{
          fontSize: "var(--text-xs)",
          color: "var(--shell-text-faint)",
          marginTop: 14,
          lineHeight: 1.6,
        }}
      >
        IRISは独立系（OpenClaw / Discord）のため本系統外 · #iris-weekly経由でKANBEIへ非同期連携
      </div>
    </div>
  );
}
