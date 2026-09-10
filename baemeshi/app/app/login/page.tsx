"use client";

import { useState } from "react";

export default function LoginPage() {
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ pin }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error ?? "ログインに失敗しました");
      window.location.href = "/";
    } catch (e) {
      setError(String(e instanceof Error ? e.message : e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 pb-24">
      <svg viewBox="0 0 44 44" className="h-16 w-16" aria-hidden>
        <g fill="#ffb800">
          <path d="M22 2l1.3 3.7L27 7l-3.7 1.3L22 12l-1.3-3.7L17 7l3.7-1.3z" />
          <path d="M10 8l.8 2.2L13 11l-2.2.8L10 14l-.8-2.2L7 11l2.2-.8z" />
          <path d="M34 8l.8 2.2L37 11l-2.2.8L34 14l-.8-2.2L31 11l2.2-.8z" />
        </g>
        <path
          d="M8 20h28a1.5 1.5 0 011.5 1.7C36.6 29 30.9 34 22 34S7.4 29 6.5 21.7A1.5 1.5 0 018 20z"
          fill="#d7263d"
        />
        <rect x="17" y="34" width="10" height="4" rx="1.5" fill="#d7263d" />
      </svg>

      <h1 className="font-display mt-3 text-2xl font-extrabold">ばえめし投稿</h1>
      <p className="mt-1 text-sm text-[var(--ink-soft)]">チームのPINコードを入力してください</p>

      <div className="mt-8 w-full space-y-4">
        <input
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && pin && !loading) submit();
          }}
          type="password"
          inputMode="numeric"
          autoComplete="one-time-code"
          placeholder="PINコード"
          className="field text-center text-2xl tracking-[0.5em]"
        />
        {error && <p className="note-error">{error}</p>}
        <button type="button" onClick={submit} disabled={loading || !pin} className="btn-primary">
          {loading ? "確認中…" : "はじめる"}
        </button>
      </div>
    </main>
  );
}
