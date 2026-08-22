import type { StatusKind } from "@/lib/types";

/** ステータスドット。auto のみ 1.8s のパルスを持つ（DSで唯一のループ動作） */
const DOT: Record<StatusKind, { color: string; pulse: boolean }> = {
  auto:   { color: "var(--shell-status-auto)",   pulse: true },
  manual: { color: "var(--shell-status-manual)", pulse: false },
  async:  { color: "var(--shell-status-async)",  pulse: false },
  idle:   { color: "var(--shell-status-idle)",   pulse: false },
  na:     { color: "var(--gold-500)",            pulse: false },
};

export function StatusDot({ status, size = 7 }: { status: StatusKind; size?: number }) {
  const d = DOT[status];
  return (
    <span
      aria-hidden
      style={{
        width: size,
        height: size,
        flexShrink: 0,
        borderRadius: "50%",
        background: d.color,
        animation: d.pulse ? "var(--pulse-live)" : "none",
      }}
    />
  );
}

export const STATUS_COLOR = DOT;
