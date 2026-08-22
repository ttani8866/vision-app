"use client";

import React from "react";

/* デザインシステム原本（components/core/Button.jsx）の variant に info を追加した。
   原本は primary / accent / secondary / ghost / danger の5種で、いずれも白背景を
   前提にしている。シェル面のIRIS導線はDiscord・情報系の識別色を担うため、
   シェル専用の variant として info を足す。ゴールドは画面の最重要アクション
   1箇所に限る、というDSの規定を崩さないための追加でもある。 */

const VARIANTS = {
  primary:   { bg: "var(--navy-900)",   fg: "#fff",             border: "1px solid var(--navy-900)",   hover: "var(--navy-700)" },
  accent:    { bg: "var(--gold-500)",   fg: "var(--navy-900)",  border: "1px solid var(--gold-500)",   hover: "var(--gold-600)" },
  secondary: { bg: "var(--surface-card)", fg: "var(--text-strong)", border: "1px solid var(--border-default)", hover: "var(--ink-50)" },
  ghost:     { bg: "transparent",       fg: "var(--text-body)", border: "1px solid transparent",       hover: "var(--ink-100)" },
  danger:    { bg: "var(--danger-500)", fg: "#fff",             border: "1px solid var(--danger-500)", hover: "var(--danger-700)" },
  info:      { bg: "var(--shell-info-strong)", fg: "#fff",      border: "1px solid var(--shell-info-strong)", hover: "var(--info-700)" },
} as const;

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof VARIANTS;
  size?: "sm" | "md";
  /** ダークシェル上に置く場合 true（accent にゴールドグローが付く） */
  onShell?: boolean;
  fullWidth?: boolean;
}

export function Button({
  variant = "primary",
  size = "md",
  onShell = false,
  fullWidth = false,
  disabled,
  children,
  style,
  ...rest
}: ButtonProps) {
  const [hover, setHover] = React.useState(false);
  const [press, setPress] = React.useState(false);
  const v = VARIANTS[variant];

  return (
    <button
      disabled={disabled}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => { setHover(false); setPress(false); }}
      onMouseDown={() => setPress(true)}
      onMouseUp={() => setPress(false)}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        width: fullWidth ? "100%" : undefined,
        padding: size === "sm" ? "4px 12px" : "7px 16px",
        fontFamily: "var(--font-sans)",
        fontSize: size === "sm" ? "var(--text-sm)" : "var(--text-base)",
        fontWeight: "var(--weight-medium)",
        borderRadius: "var(--radius-md)",
        cursor: disabled ? "not-allowed" : "pointer",
        background: disabled ? "var(--ink-100)" : hover ? v.hover : v.bg,
        color: disabled ? "var(--ink-300)" : v.fg,
        border: v.border,
        boxShadow: onShell && variant === "accent" ? "var(--shadow-gold)" : "none",
        transform: press ? "scale(.985)" : "none",
        transition:
          "background var(--duration-fast) var(--ease-standard), transform 80ms var(--ease-standard)",
        outline: "none",
        ...style,
      }}
      {...rest}
    >
      {children}
    </button>
  );
}
