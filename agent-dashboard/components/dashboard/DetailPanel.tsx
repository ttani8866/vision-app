"use client";

import React from "react";
import type { Agent } from "@/lib/types";
import { StatusDot } from "@/components/ds/StatusDot";
import { Eyebrow } from "./primitives";
import styles from "./dashboard.module.css";

/* ノードをクリックしたときに右から出る詳細パネル。
   原設計はスクリムとパネルだけだが、Escapeで閉じる・開いている間は
   背面をスクロールさせない・閉じたらフォーカスを戻す、を足している。 */

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <>
      <Eyebrow style={{ marginTop: 20 }}>{label}</Eyebrow>
      <div
        style={{
          fontSize: "var(--text-base)",
          color: "var(--shell-text-body)",
          marginTop: 6,
          lineHeight: 1.8,
        }}
      >
        {children}
      </div>
    </>
  );
}

export function DetailPanel({ agent, onClose }: { agent: Agent | null; onClose: () => void }) {
  const closeRef = React.useRef<HTMLButtonElement>(null);
  const open = Boolean(agent);

  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  if (!agent) return null;

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "var(--shell-scrim)",
          zIndex: 10,
        }}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={agent.name + " の詳細"}
        className={styles.detailPanel}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <div
            style={{
              fontSize: 16,
              fontWeight: "var(--weight-bold)",
              color: "var(--shell-text-strong)",
            }}
          >
            {agent.name}
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="閉じる"
            style={{
              background: "none",
              border: "none",
              color: "var(--shell-text-muted)",
              fontSize: 16,
              lineHeight: 1,
              cursor: "pointer",
              padding: 4,
              borderRadius: "var(--radius-sm)",
            }}
          >
            ×
          </button>
        </div>

        <div style={{ fontSize: "var(--text-sm)", color: "var(--gold-500)", marginTop: 4 }}>
          {agent.title}
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            fontSize: "var(--text-sm)",
            color: "var(--shell-text-body)",
            marginTop: 14,
          }}
        >
          <StatusDot status={agent.status} />
          {agent.statusLabel}
        </div>

        <Field label="役割">{agent.role}</Field>

        {agent.cond && <Field label="単独召集の条件">{agent.cond}</Field>}

        <Eyebrow style={{ marginTop: 20 }}>備考</Eyebrow>
        <div
          style={{
            fontSize: "var(--text-sm)",
            color: "var(--shell-text-muted)",
            marginTop: 6,
            lineHeight: 1.8,
          }}
        >
          {agent.note}
        </div>
      </div>
    </>
  );
}
