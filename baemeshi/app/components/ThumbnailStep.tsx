"use client";

import { useEffect, useRef, useState } from "react";
import type { StoreInfo, UploadedMedia } from "@/lib/types";

const CANVAS_W = 1080;
const CANVAS_H = 1350; // Instagram フィード 4:5

const FONT_STACK = '"Hiragino Sans", "Yu Gothic", "Noto Sans JP", "Meiryo", sans-serif';

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

/** 日本語対応の文字単位折り返し */
function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const lines: string[] = [];
  let current = "";
  for (const ch of text) {
    if (ch === "\n") {
      lines.push(current);
      current = "";
      continue;
    }
    const test = current + ch;
    if (ctx.measureText(test).width > maxWidth && current) {
      lines.push(current);
      current = ch;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function drawOutlinedLine(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  strokeWidth: number
) {
  ctx.lineJoin = "round";
  ctx.strokeStyle = "rgba(0,0,0,0.9)";
  ctx.lineWidth = strokeWidth;
  ctx.strokeText(text, x, y);
  ctx.fillStyle = "#ffffff";
  ctx.fillText(text, x, y);
}

export function drawThumbnail(
  canvas: HTMLCanvasElement,
  img: HTMLImageElement,
  texts: { title: string; storeName: string; catchCopy: string }
) {
  canvas.width = CANVAS_W;
  canvas.height = CANVAS_H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  // 写真をカバークロップで敷く
  const scale = Math.max(CANVAS_W / img.width, CANVAS_H / img.height);
  const dw = img.width * scale;
  const dh = img.height * scale;
  ctx.drawImage(img, (CANVAS_W - dw) / 2, (CANVAS_H - dh) / 2, dw, dh);

  // 上下に可読性用のグラデーション
  const top = ctx.createLinearGradient(0, 0, 0, 430);
  top.addColorStop(0, "rgba(0,0,0,0.55)");
  top.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = top;
  ctx.fillRect(0, 0, CANVAS_W, 430);

  const bottom = ctx.createLinearGradient(0, 900, 0, CANVAS_H);
  bottom.addColorStop(0, "rgba(0,0,0,0)");
  bottom.addColorStop(1, "rgba(0,0,0,0.65)");
  ctx.fillStyle = bottom;
  ctx.fillRect(0, 900, CANVAS_W, CANVAS_H - 900);

  ctx.textAlign = "center";
  ctx.textBaseline = "top";

  // タイトル（上部・大）
  if (texts.title.trim()) {
    ctx.font = `900 96px ${FONT_STACK}`;
    const lines = wrapText(ctx, texts.title, 980);
    let y = 96;
    for (const line of lines.slice(0, 3)) {
      drawOutlinedLine(ctx, line, CANVAS_W / 2, y, 14);
      y += 116;
    }
  }

  // キャッチコピー（下部・中）
  if (texts.catchCopy.trim()) {
    ctx.font = `700 58px ${FONT_STACK}`;
    const lines = wrapText(ctx, texts.catchCopy, 960);
    let y = 1020;
    for (const line of lines.slice(0, 2)) {
      drawOutlinedLine(ctx, line, CANVAS_W / 2, y, 10);
      y += 74;
    }
  }

  // 店名（最下部・白帯バッジ）
  if (texts.storeName.trim()) {
    ctx.font = `700 54px ${FONT_STACK}`;
    const textW = ctx.measureText(texts.storeName).width;
    const padX = 46;
    const badgeW = Math.min(textW + padX * 2, 1000);
    const badgeH = 96;
    const bx = (CANVAS_W - badgeW) / 2;
    const by = 1350 - badgeH - 56;
    ctx.fillStyle = "rgba(255,255,255,0.94)";
    ctx.beginPath();
    ctx.roundRect(bx, by, badgeW, badgeH, badgeH / 2);
    ctx.fill();
    ctx.fillStyle = "#1a1a1a";
    ctx.textBaseline = "middle";
    ctx.fillText(texts.storeName, CANVAS_W / 2, by + badgeH / 2 + 4, badgeW - padX * 2);
    ctx.textBaseline = "top";
  }
}

export default function ThumbnailStep({
  media,
  store,
  onChange,
  onNext,
}: {
  media: UploadedMedia[];
  store: StoreInfo;
  onChange: (media: UploadedMedia[]) => void;
  onNext: () => void;
}) {
  const images = media.filter((m) => m.kind === "image");
  const [baseKey, setBaseKey] = useState<string | null>(images[0]?.key ?? null);
  const [title, setTitle] = useState("");
  const [catchCopy, setCatchCopy] = useState("");
  const [storeName, setStoreName] = useState(store.name);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const base = media.find((m) => m.key === baseKey) ?? null;
  const baseUrl = base ? (base.originalUrl ?? base.url) : null;

  // 入力のたびにライブプレビューを再描画
  useEffect(() => {
    if (!baseUrl || !canvasRef.current) return;
    let cancelled = false;
    loadImage(baseUrl)
      .then((img) => {
        if (cancelled || !canvasRef.current) return;
        drawThumbnail(canvasRef.current, img, { title, storeName, catchCopy });
      })
      .catch(() => setError("プレビューの描画に失敗しました"));
    return () => {
      cancelled = true;
    };
  }, [baseUrl, title, storeName, catchCopy]);

  async function apply() {
    if (!canvasRef.current || !base) return;
    setApplying(true);
    setError(null);
    try {
      const blob = await new Promise<Blob | null>((resolve) =>
        canvasRef.current!.toBlob(resolve, "image/jpeg", 0.9)
      );
      if (!blob) throw new Error("画像の生成に失敗しました");

      const formData = new FormData();
      formData.append("file", new File([blob], "thumbnail.jpg", { type: "image/jpeg" }));
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error ?? "アップロードに失敗しました");

      const replaced: UploadedMedia = {
        url: json.url,
        key: json.key,
        mimeType: json.mimeType,
        sizeBytes: json.sizeBytes,
        kind: "image",
        aspectWarning: false,
        originalUrl: baseUrl ?? undefined,
      };
      onChange(media.map((m) => (m.key === base.key ? replaced : m)));
      setBaseKey(replaced.key);
    } catch (e) {
      setError(String(e instanceof Error ? e.message : e));
    } finally {
      setApplying(false);
    }
  }

  if (images.length === 0) {
    return (
      <div className="space-y-4">
        <h2 className="font-display sparkle text-xl font-extrabold">サムネイル作成</h2>
        <p className="note-info">
          写真素材がないため、この工程はスキップします（動画のみの投稿では文字入れは使えません）
        </p>
        <button type="button" onClick={onNext} className="btn-primary">
          次へ（キャプション生成）
        </button>
      </div>
    );
  }

  const applied = Boolean(base?.originalUrl);

  return (
    <div className="space-y-4">
      <h2 className="font-display sparkle text-xl font-extrabold">サムネイル作成</h2>
      <p className="text-sm leading-relaxed text-[var(--ink-soft)]">
        写真にタイトル・店名・キャッチコピーを重ねてサムネイル化します。不要な場合はそのまま「次へ」進めます。
      </p>

      {images.length > 1 && (
        <div>
          <label className="label">文字を入れる写真</label>
          <div className="flex gap-2 overflow-x-auto">
            {images.map((m, i) => (
              <button
                key={m.key}
                type="button"
                onClick={() => setBaseKey(m.key)}
                className={`relative flex-none overflow-hidden rounded-xl border-[3px] transition ${
                  m.key === baseKey ? "border-[var(--grad-b)]" : "border-transparent opacity-70"
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={m.url} alt={`写真${i + 1}`} className="h-20 w-20 object-cover" />
              </button>
            ))}
          </div>
        </div>
      )}

      <div>
        <label className="label">タイトル</label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="例）真夏のかき氷特集！"
          className="field"
        />
      </div>
      <div>
        <label className="label">店の名前</label>
        <input
          value={storeName}
          onChange={(e) => setStoreName(e.target.value)}
          placeholder="例）ひえひえ君"
          className="field"
        />
      </div>
      <div>
        <label className="label">キャッチコピー</label>
        <input
          value={catchCopy}
          onChange={(e) => setCatchCopy(e.target.value)}
          placeholder="例）真夏の夜のかき氷"
          className="field"
        />
      </div>

      <div className="card overflow-hidden p-2">
        <canvas ref={canvasRef} className="mx-auto w-full max-w-xs rounded-xl" />
        <p className="mt-1.5 text-center text-xs text-[var(--ink-soft)]">プレビュー（1080×1350・4:5）</p>
      </div>

      {error && <p className="note-error">{error}</p>}
      {applied && (
        <p className="note-success">文字入れを適用済みです。文言を変えて「適用」し直すと作り直せます。</p>
      )}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={apply}
          disabled={applying || (!title.trim() && !catchCopy.trim() && !storeName.trim())}
          className="btn-secondary flex-1"
        >
          {applying ? "適用中…" : applied ? "文字入れをやり直す" : "この写真に文字を入れる"}
        </button>
        <button
          type="button"
          onClick={onNext}
          className="btn-primary flex-1"
        >
          次へ
        </button>
      </div>
    </div>
  );
}
