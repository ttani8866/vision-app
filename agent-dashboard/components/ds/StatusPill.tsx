import type { StatusKind } from "@/lib/types";
import { StatusDot } from "./StatusDot";

/* デザインシステム原本（components/feedback/StatusPill.jsx）からの拡張点は2つ。

   1. 状態を active / idle の2種から、凡例と同じ4種に増やした。
      auto（自動実行中）/ manual（手動トリガー）/ async（Discord非同期）/ idle（休眠中）
   2. onShell を追加した。原本は background:#fff + border 固定で白背景専用のため、
      ダークネイビー上では白いピルが浮く。Button の onShell と同じ考え方で、
      シェル上では地と枠を外しシェル面の文字階調に切り替える。            */

const DEFAULT_LABEL: Record<StatusKind, string> = {
  auto: "自動実行中",
  manual: "手動トリガー",
  async: "Discord非同期",
  idle: "休眠中",
  na: "—",
};

const TONE = {
  strong: "var(--shell-text-strong)",
  body: "var(--shell-text-body)",
  muted: "var(--shell-text-muted)",
} as const;

export interface StatusPillProps {
  status: StatusKind;
  /** 既定ラベルの上書き */
  label?: string;
  /** 「12分経過」等の等幅メタ情報 */
  meta?: string;
  /** ダークシェル上に置く。地と枠を外す */
  onShell?: boolean;
  /** md=12px（既定）/ sm=11px */
  size?: "sm" | "md";
  /** シェル上の文字階調 */
  tone?: keyof typeof TONE;
}

export function StatusPill({
  status,
  label,
  meta,
  onShell = false,
  size = "md",
  tone = "body",
}: StatusPillProps) {
  const shell = onShell
    ? { background: "none", border: "none", padding: 0, color: TONE[tone] }
    : {
        background: "var(--surface-card)",
        border: "1px solid var(--border-subtle)",
        padding: "3px 12px",
        color: status === "idle" ? "var(--text-muted)" : "var(--text-strong)",
      };

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        borderRadius: "var(--radius-pill)",
        fontSize: size === "sm" ? "var(--text-xs)" : "var(--text-sm)",
        fontWeight: tone === "strong" ? "var(--weight-medium)" : "var(--weight-regular)",
        whiteSpace: "nowrap",
        ...shell,
      }}
    >
      <StatusDot status={status} />
      {label ?? DEFAULT_LABEL[status]}
      {meta && (
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "var(--text-xs)",
            color: onShell ? "var(--shell-text-subtle)" : "var(--text-muted)",
          }}
        >
          · {meta}
        </span>
      )}
    </span>
  );
}

export { DEFAULT_LABEL as STATUS_LABEL };
