import React from "react";

/** アイブロウラベル。11px太字 + .1emトラッキング（DSでこの用途専用） */
export function Eyebrow({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <div
      style={{
        fontSize: 10,
        fontWeight: "var(--weight-bold)",
        letterSpacing: "var(--tracking-caps)",
        color: "var(--shell-text-faint)",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

/** 等幅のチップ。gold は強調、neutral は既定、info は情報系 */
export function Chip({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "gold" | "info";
}) {
  const tones = {
    neutral: { color: "var(--shell-text-muted)", background: "var(--shell-chip)" },
    gold: { color: "var(--gold-400)", background: "var(--shell-tint-gold)" },
    info: { color: "var(--shell-info-text)", background: "var(--shell-tint-info)" },
  } as const;
  return (
    <span
      style={{
        fontFamily: "var(--font-mono)",
        fontSize: "var(--text-xs)",
        padding: "3px 10px",
        borderRadius: "var(--radius-pill)",
        ...tones[tone],
      }}
    >
      {children}
    </span>
  );
}

type CardTone = "surface" | "raised" | "sunken";

/** シェル面の標準カード。構造はヘアラインが先、影は補助（DS規定） */
export function ShellCard({
  tone = "surface",
  radius = "var(--radius-xl)",
  border = "1px solid var(--shell-border)",
  shadow,
  onClick,
  label,
  style,
  children,
}: {
  tone?: CardTone;
  radius?: string;
  border?: string;
  shadow?: string;
  onClick?: () => void;
  /** クリック可能な場合のアクセシブル名 */
  label?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
}) {
  const backgrounds: Record<CardTone, string> = {
    surface: "var(--shell-surface)",
    raised: "var(--shell-surface-raised)",
    sunken: "var(--shell-surface-sunken)",
  };
  const interactive = Boolean(onClick);

  return (
    <div
      {...(interactive
        ? {
            role: "button",
            tabIndex: 0,
            "aria-label": label,
            onClick,
            onKeyDown: (e: React.KeyboardEvent) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick?.();
              }
            },
          }
        : {})}
      style={{
        background: backgrounds[tone],
        border,
        borderRadius: radius,
        boxShadow: shadow,
        cursor: interactive ? "pointer" : undefined,
        ...style,
      }}
    >
      {children}
    </div>
  );
}
