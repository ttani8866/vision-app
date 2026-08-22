"use client";

export function Toast({ message }: { message: string }) {
  if (!message) return null;
  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: "fixed",
        bottom: 28,
        left: "50%",
        transform: "translateX(-50%)",
        maxWidth: "calc(100vw - 32px)",
        background: "var(--shell-chip)",
        border: "1px solid var(--shell-border-strong)",
        color: "var(--shell-text-strong)",
        fontSize: "var(--text-base)",
        padding: "10px 20px",
        borderRadius: "var(--radius-lg)",
        boxShadow: "var(--shell-shadow-toast)",
        zIndex: 30,
      }}
    >
      {message}
    </div>
  );
}
