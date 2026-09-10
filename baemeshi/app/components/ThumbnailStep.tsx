"use client";

import { useEffect, useRef, useState } from "react";
import type { StoreInfo, UploadedMedia } from "@/lib/types";

const CANVAS_W = 1080;
const CANVAS_H = 1350; // Instagram フィード 4:5

const FONT_STACK =
  '"M PLUS Rounded 1c", "Hiragino Maru Gothic ProN", "Hiragino Sans", "Yu Gothic", "Noto Sans JP", "Meiryo", sans-serif';

// 既存投稿のデザイントーン（水色×白フチ、黄色×白フチ）
const SORA = "#8ad4f0"; // タイトル・キャッチコピーの水色
const KIIRO = "#ffd94a"; // 店名の黄色

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    // Vercel Blob等の別ドメイン画像でもcanvas書き出しできるようにする（Tainted canvas対策）
    img.crossOrigin = "anonymous";
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

/** 既存投稿トーンのポップ文字: 色文字＋太い白フチ＋やわらかい影 */
function drawPopLine(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  fontPx: number,
  fillColor: string,
  maxWidth: number
) {
  ctx.font = `900 ${fontPx}px ${FONT_STACK}`;
  ctx.lineJoin = "round";
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.35)";
  ctx.shadowBlur = 12;
  ctx.shadowOffsetY = 5;
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = Math.max(10, fontPx * 0.24);
  ctx.strokeText(text, x, y, maxWidth);
  ctx.restore();
  ctx.fillStyle = fillColor;
  ctx.fillText(text, x, y, maxWidth);
}

/** 左上の「ばえめし」ロゴバッジ（白丸＋赤い茶碗＋キラキラ） */
function drawLogoBadge(ctx: CanvasRenderingContext2D) {
  const cx = 122;
  const cy = 122;
  const r = 88;

  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.25)";
  ctx.shadowBlur = 14;
  ctx.fillStyle = "rgba(255,255,255,0.96)";
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // キラキラ（ひし形）
  const diamond = (dx: number, dy: number, s: number) => {
    ctx.beginPath();
    ctx.moveTo(dx, dy - s);
    ctx.lineTo(dx + s * 0.6, dy);
    ctx.lineTo(dx, dy + s);
    ctx.lineTo(dx - s * 0.6, dy);
    ctx.closePath();
    ctx.fill();
  };
  ctx.fillStyle = "#ffb800";
  diamond(cx, cy - 52, 14);
  diamond(cx - 32, cy - 40, 9);
  diamond(cx + 32, cy - 40, 9);

  // 赤い茶碗（下半円＋高台）
  ctx.fillStyle = "#d7263d";
  ctx.beginPath();
  ctx.arc(cx, cy - 2, 38, 0, Math.PI, false);
  ctx.closePath();
  ctx.fill();
  ctx.fillRect(cx - 13, cy + 34, 26, 9);

  // ロゴ文字
  ctx.fillStyle = "#3a2e26";
  ctx.font = `800 28px ${FONT_STACK}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.fillText("ばえめし", cx, cy + 48);
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

  ctx.textAlign = "center";
  ctx.textBaseline = "top";

  // タイトル・店名は左上のロゴバッジを避けて右寄りに置く
  const headX = 650;
  const headMax = 780;

  // タイトル（上部・水色×白フチ）
  let y = 64;
  if (texts.title.trim()) {
    ctx.font = `900 100px ${FONT_STACK}`;
    const lines = wrapText(ctx, texts.title, headMax);
    for (const line of lines.slice(0, 2)) {
      drawPopLine(ctx, line, headX, y, 100, SORA, headMax);
      y += 118;
    }
  }

  // 店名（タイトルの下・黄色×白フチ）
  if (texts.storeName.trim()) {
    ctx.font = `900 84px ${FONT_STACK}`;
    const lines = wrapText(ctx, texts.storeName, headMax);
    for (const line of lines.slice(0, 1)) {
      drawPopLine(ctx, line, headX, y + 10, 84, KIIRO, headMax);
    }
  }

  // キャッチコピー（下部・水色×白フチ）
  if (texts.catchCopy.trim()) {
    ctx.font = `900 76px ${FONT_STACK}`;
    const lines = wrapText(ctx, texts.catchCopy, 1000);
    const shown = lines.slice(0, 2);
    let cy = CANVAS_H - 150 - (shown.length - 1) * 92;
    for (const line of shown) {
      drawPopLine(ctx, line, CANVAS_W / 2, cy, 76, SORA, 1000);
      cy += 92;
    }
  }

  // 最下部のクレジット
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.6)";
  ctx.shadowBlur = 8;
  ctx.fillStyle = "#ffffff";
  ctx.font = `700 36px ${FONT_STACK}`;
  ctx.textAlign = "left";
  ctx.fillText("#ばえめし", 40, CANVAS_H - 58);
  ctx.textAlign = "right";
  ctx.font = `500 32px ${FONT_STACK}`;
  ctx.fillText("@baemeshi.official", CANVAS_W - 40, CANVAS_H - 54);
  ctx.restore();
  ctx.textAlign = "center";

  // ロゴバッジは最後に描いて最前面へ
  drawLogoBadge(ctx);
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
  const [appliedSig, setAppliedSig] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const base = media.find((m) => m.key === baseKey) ?? null;
  const baseUrl = base ? (base.originalUrl ?? base.url) : null;

  const hasText = Boolean(title.trim() || catchCopy.trim() || storeName.trim());
  const currentSig = JSON.stringify({ baseUrl, title, storeName, catchCopy });
  // 文字が入力されているのに、その内容で「文字入れ」が未確定の状態
  const dirty = hasText && appliedSig !== currentSig;

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

  async function apply(): Promise<boolean> {
    if (!canvasRef.current || !base) return false;
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
      setAppliedSig(currentSig);
      return true;
    } catch (e) {
      setError(String(e instanceof Error ? e.message : e));
      return false;
    } finally {
      setApplying(false);
    }
  }

  // 「次へ」時、文字が未適用ならその場で適用してから進む（適用忘れによるサムネ消失防止）
  async function handleNext() {
    if (dirty) {
      const ok = await apply();
      if (!ok) return;
    }
    onNext();
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
          disabled={applying || !hasText}
          className="btn-secondary flex-1"
        >
          {applying ? "適用中…" : applied ? "文字入れをやり直す" : "この写真に文字を入れる"}
        </button>
        <button
          type="button"
          onClick={handleNext}
          disabled={applying}
          className="btn-primary flex-1"
        >
          {applying ? "適用中…" : dirty ? "文字を入れて次へ" : "次へ"}
        </button>
      </div>
    </div>
  );
}
