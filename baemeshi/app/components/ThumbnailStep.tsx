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

export type LogoPos = "left" | "right";

/** 実物ロゴ（app/public/baemeshi-logo.png）。無ければ null を返し、ベクター描画にフォールバック */
let logoImagePromise: Promise<HTMLImageElement | null> | null = null;
export function loadLogoImage(): Promise<HTMLImageElement | null> {
  logoImagePromise ??= new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = "/baemeshi-logo.png";
  });
  return logoImagePromise;
}

/** 4点のキラキラ（内側にくぼんだ星形） */
function drawSparkle(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, color: string) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(cx, cy - r);
  ctx.quadraticCurveTo(cx, cy, cx + r, cy);
  ctx.quadraticCurveTo(cx, cy, cx, cy + r);
  ctx.quadraticCurveTo(cx, cy, cx - r, cy);
  ctx.quadraticCurveTo(cx, cy, cx, cy - r);
  ctx.closePath();
  ctx.fill();
}

/**
 * 「ばえめし」ロゴバッジ（白丸抜き）。既存投稿と同じく左上に置き、文字とのバランスで右上にも置ける。
 * 実物PNGがあればそれを白丸の中に収め、無ければロゴ（キラキラのピラミッド＋赤い茶碗＋ロゴ文字）をベクターで描く。
 */
function drawLogoBadge(ctx: CanvasRenderingContext2D, pos: LogoPos, logo: HTMLImageElement | null) {
  const r = 105;
  const cx = pos === "left" ? 130 : CANVAS_W - 130;
  const cy = 130;

  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.25)";
  ctx.shadowBlur = 14;
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  if (logo) {
    // 実物ロゴを白丸に収める（ロゴは正方形前提。余白を少し取る）
    const size = r * 2 * 0.78;
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r - 2, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(logo, cx - size / 2, cy - size / 2, size, size);
    ctx.restore();
    return;
  }

  // ベクター版: 元ロゴ（300x300基準）の座標を s 倍して白丸の中央に置く
  const s = 0.55;
  const X = (lx: number) => cx + (lx - 150) * s;
  const Y = (ly: number) => cy + (ly - 150) * s;
  const YELLOW = "#ffc400";
  const ORANGE = "#f7941d";

  // キラキラのピラミッド（1・2・3段）
  drawSparkle(ctx, X(150), Y(46), 15 * s * 1.9, ORANGE);
  drawSparkle(ctx, X(119), Y(74), 16 * s * 1.9, YELLOW);
  drawSparkle(ctx, X(181), Y(74), 16 * s * 1.9, ORANGE);
  drawSparkle(ctx, X(93), Y(106), 17 * s * 1.9, YELLOW);
  drawSparkle(ctx, X(150), Y(106), 22 * s * 1.9, YELLOW);
  drawSparkle(ctx, X(207), Y(106), 17 * s * 1.9, YELLOW);

  // 赤い茶碗（下半円＋高台）
  ctx.fillStyle = "#c8102e";
  ctx.beginPath();
  ctx.arc(X(150), Y(132), 56 * s, 0, Math.PI, false);
  ctx.closePath();
  ctx.fill();
  const fw = 30 * s;
  const fh = 9 * s;
  ctx.fillRect(X(150) - fw / 2, Y(186), fw, fh);

  // ロゴ文字
  ctx.fillStyle = "#111111";
  ctx.font = `900 ${Math.round(40 * s * 1.15)}px ${FONT_STACK}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("ばえめし", X(150), Y(240));
}

export function drawThumbnail(
  canvas: HTMLCanvasElement,
  img: HTMLImageElement,
  texts: { title: string; storeName: string; catchCopy: string },
  opts: { logoPos?: LogoPos; logo?: HTMLImageElement | null } = {}
) {
  const logoPos: LogoPos = opts.logoPos ?? "left";
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

  // タイトル・店名はロゴバッジを避けて反対側に寄せる
  const headX = logoPos === "left" ? 650 : CANVAS_W - 650;
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
  drawLogoBadge(ctx, logoPos, opts.logo ?? null);
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
  const [logoPos, setLogoPos] = useState<LogoPos>("left");
  const [logo, setLogo] = useState<HTMLImageElement | null>(null);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [appliedSig, setAppliedSig] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const base = media.find((m) => m.key === baseKey) ?? null;
  const baseUrl = base ? (base.originalUrl ?? base.url) : null;

  const hasText = Boolean(title.trim() || catchCopy.trim() || storeName.trim());
  const currentSig = JSON.stringify({ baseUrl, title, storeName, catchCopy, logoPos });
  // ロゴは常に入るため、現在の内容（文字・ロゴ位置）で合成が未確定なら dirty
  const dirty = appliedSig !== currentSig;

  useEffect(() => {
    loadLogoImage().then(setLogo);
  }, []);

  // 入力のたびにライブプレビューを再描画
  useEffect(() => {
    if (!baseUrl || !canvasRef.current) return;
    let cancelled = false;
    loadImage(baseUrl)
      .then((img) => {
        if (cancelled || !canvasRef.current) return;
        drawThumbnail(canvasRef.current, img, { title, storeName, catchCopy }, { logoPos, logo });
      })
      .catch(() => setError("プレビューの描画に失敗しました"));
    return () => {
      cancelled = true;
    };
  }, [baseUrl, title, storeName, catchCopy, logoPos, logo]);

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
        写真にばえめしロゴと、タイトル・店名・キャッチコピーを重ねてサムネイル化します。文字が不要でもロゴは入ります。
      </p>

      <div>
        <label className="label">ロゴの位置</label>
        <div className="flex gap-2">
          {(["left", "right"] as LogoPos[]).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setLogoPos(p)}
              className={`chip ${logoPos === p ? "chip-on" : ""}`}
            >
              {p === "left" ? "左上（標準）" : "右上"}
            </button>
          ))}
        </div>
        <p className="mt-1 text-xs text-[var(--ink-soft)]">
          写真の被写体や文字と重なるときは右上に切り替えてください。タイトル・店名はロゴの反対側に寄ります。
        </p>
      </div>

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
        <p className="note-success">ロゴ・文字入れを適用済みです。内容を変えて「適用」し直すと作り直せます。</p>
      )}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={apply}
          disabled={applying}
          className="btn-secondary flex-1"
        >
          {applying ? "適用中…" : applied ? "やり直す" : hasText ? "ロゴと文字を入れる" : "ロゴを入れる"}
        </button>
        <button
          type="button"
          onClick={handleNext}
          disabled={applying}
          className="btn-primary flex-1"
        >
          {applying ? "適用中…" : dirty ? "ロゴを入れて次へ" : "次へ"}
        </button>
      </div>
    </div>
  );
}
