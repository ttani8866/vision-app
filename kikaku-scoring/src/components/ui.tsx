"use client";
import type { ReactNode } from "react";

export type PillTone = "ok" | "warn" | "err" | "info" | "run" | "mock" | "brand" | "neutral";

export function Pill({ tone, children, dot = true }: { tone: PillTone; children: ReactNode; dot?: boolean }) {
  return (
    <span className={`pill ${tone}`}>
      {dot && <span className="dot" />}
      {children}
    </span>
  );
}

export function Eyebrow({ children }: { children: ReactNode }) {
  return <div className="eyebrow">{children}</div>;
}

export function Card({ children, className = "", pad = true, onClick }: { children: ReactNode; className?: string; pad?: boolean; onClick?: () => void }) {
  return (
    <div className={`card ${pad ? "pad" : ""} ${onClick ? "clickable" : ""} ${className}`} onClick={onClick}>
      {children}
    </div>
  );
}

export function fmtDate(iso: string) {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}/${p(d.getMonth() + 1)}/${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

export function BackIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 18l-6-6 6-6" />
    </svg>
  );
}

export const NavIcons = {
  list: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6" />
    </svg>
  ),
  compare: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 21 7.5 21 16.5 12 22 3 16.5 3 7.5" />
      <path d="M12 8l4.3 2.6v5L12 18l-4.3-2.4v-5z" />
    </svg>
  ),
  settings: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="4" y1="8" x2="20" y2="8" />
      <circle cx="9" cy="8" r="2.2" />
      <line x1="4" y1="16" x2="20" y2="16" />
      <circle cx="15" cy="16" r="2.2" />
    </svg>
  ),
};
