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
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/baemeshi-logo.png"
        alt="ばえめしロゴ"
        className="h-24 w-24 rounded-full object-cover shadow-[0_4px_16px_rgba(58,46,38,0.12)]"
      />

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
