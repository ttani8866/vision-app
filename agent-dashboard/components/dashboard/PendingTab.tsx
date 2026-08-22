"use client";

import { PENDING, PENDING_FOOTNOTE } from "@/data/pending";
import { Eyebrow } from "./primitives";
import styles from "./dashboard.module.css";

export function PendingTab() {
  return (
    <div className={styles.shellWidth} style={{ marginTop: 24, maxWidth: 964 }}>
      <Eyebrow style={{ marginBottom: 10 }}>未対応・保留事項</Eyebrow>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {PENDING.map((it) => (
          <div
            key={it.no}
            style={{
              display: "flex",
              gap: 14,
              background: "var(--shell-surface)",
              border: "1px solid var(--shell-border)",
              borderRadius: "var(--radius-lg)",
              padding: "14px 18px",
            }}
          >
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "var(--text-sm)",
                fontWeight: "var(--weight-bold)",
                color: "var(--shell-warning)",
                flexShrink: 0,
              }}
            >
              {it.no}
            </span>
            <div>
              <div
                style={{
                  fontSize: "var(--text-base)",
                  fontWeight: "var(--weight-bold)",
                  color: "var(--shell-text-strong)",
                }}
              >
                {it.title}
              </div>
              <div
                style={{
                  fontSize: "var(--text-sm)",
                  color: "var(--shell-text-muted)",
                  marginTop: 4,
                  lineHeight: 1.6,
                }}
              >
                {it.body}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div
        style={{
          fontSize: "var(--text-xs)",
          color: "var(--shell-text-faint)",
          marginTop: 16,
          lineHeight: 1.7,
        }}
      >
        {PENDING_FOOTNOTE}
      </div>
    </div>
  );
}
