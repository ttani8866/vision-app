"use client";

import { useRef, useState } from "react";
import { MAX_MEDIA_COUNT, type UploadedMedia } from "@/lib/types";

const TARGET_RATIO = 9 / 16;
const RATIO_TOLERANCE = 0.03;

function checkVideoAspect(file: File): Promise<boolean> {
  return new Promise((resolve) => {
    const video = document.createElement("video");
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      const ratio = video.videoWidth / video.videoHeight;
      URL.revokeObjectURL(video.src);
      resolve(Math.abs(ratio - TARGET_RATIO) > RATIO_TOLERANCE);
    };
    video.onerror = () => resolve(false);
    video.src = URL.createObjectURL(file);
  });
}

const MAX_IMAGE_EDGE = 1920;
const COMPRESS_THRESHOLD_BYTES = 500 * 1024;

/** 大きい画像は長辺1920pxに縮小しJPEG化してアップロード時間を短縮する（Instagram側も1440px程度に縮小するため画質影響なし） */
async function compressImage(file: File): Promise<File> {
  if (file.size <= COMPRESS_THRESHOLD_BYTES) return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_IMAGE_EDGE / Math.max(bitmap.width, bitmap.height));
    const w = Math.round(bitmap.width * scale);
    const h = Math.round(bitmap.height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, w, h);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.85));
    if (!blob || blob.size >= file.size) return file;
    const newName = file.name.replace(/\.(png|jpeg|jpg)$/i, "") + ".jpg";
    return new File([blob], newName, { type: "image/jpeg" });
  } catch {
    return file;
  }
}

export default function UploadStep({
  media,
  onChange,
  singleVideoAs,
  onChangeSingleVideoAs,
}: {
  media: UploadedMedia[];
  onChange: (media: UploadedMedia[]) => void;
  singleVideoAs: "reel" | "feed_video";
  onChangeSingleVideoAs: (v: "reel" | "feed_video") => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFiles(files: FileList) {
    setError(null);

    const remaining = MAX_MEDIA_COUNT - media.length;
    if (remaining <= 0) {
      setError(`素材は最大${MAX_MEDIA_COUNT}件までです`);
      return;
    }
    const selected = Array.from(files).slice(0, remaining);
    if (files.length > remaining) {
      setError(`最大${MAX_MEDIA_COUNT}件までのため、先頭${remaining}件のみ追加しました`);
    }

    setUploading(true);
    try {
      const uploaded = await Promise.all(
        selected.map(async (original): Promise<UploadedMedia> => {
          const isVideo = original.type === "video/mp4";
          const aspectWarning = isVideo ? await checkVideoAspect(original) : false;
          const file = isVideo ? original : await compressImage(original);

          const formData = new FormData();
          formData.append("file", file);
          const res = await fetch("/api/upload", { method: "POST", body: formData });
          const json = await res.json();
          if (!res.ok || !json.ok) {
            throw new Error(json.error ?? `${original.name} のアップロードに失敗しました`);
          }

          return {
            url: json.url,
            key: json.key,
            mimeType: json.mimeType,
            sizeBytes: json.sizeBytes,
            kind: isVideo ? "video" : "image",
            aspectWarning,
          };
        })
      );
      onChange([...media, ...uploaded]);
    } catch (e) {
      setError(String(e instanceof Error ? e.message : e));
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function removeAt(index: number) {
    onChange(media.filter((_, i) => i !== index));
  }

  const videoCount = media.filter((m) => m.kind === "video").length;
  const showTargetToggle = media.length === 1 && videoCount === 1;

  return (
    <div className="space-y-4">
      <h2 className="font-display sparkle text-xl font-extrabold">素材アップロード</h2>
      <p className="text-sm leading-relaxed text-[var(--ink-soft)]">
        写真（JPEG/PNG）・動画（MP4・縦型9:16推奨）を最大{MAX_MEDIA_COUNT}件まで。複数選ぶとカルーセル投稿になります。
      </p>

      <input
        ref={inputRef}
        type="file"
        multiple
        accept="image/jpeg,image/png,video/mp4"
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.length) handleFiles(e.target.files);
        }}
      />

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading || media.length >= MAX_MEDIA_COUNT}
        className="w-full rounded-2xl border-2 border-dashed border-[var(--grad-b)] bg-[var(--paper)] py-10 text-center transition-transform duration-100 active:scale-[0.98] disabled:opacity-50"
      >
        <span className="mb-1 block text-3xl">📷</span>
        <span className="font-display block text-base font-bold text-[var(--ink)]">
          {uploading
            ? "アップロード中…"
            : media.length >= MAX_MEDIA_COUNT
              ? `上限（${MAX_MEDIA_COUNT}件）に達しました`
              : "タップして写真・動画を選択"}
        </span>
        {!uploading && media.length < MAX_MEDIA_COUNT && (
          <span className="mt-0.5 block text-xs text-[var(--ink-soft)]">複数選択できます</span>
        )}
      </button>

      {error && <p className="note-error">{error}</p>}

      {media.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          {media.map((m, i) => (
            <div key={m.key} className="card relative space-y-1 p-2">
              <span
                className="font-display absolute left-3 top-3 z-10 flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold text-white"
                style={{ background: "linear-gradient(120deg, var(--grad-a), var(--grad-b) 60%, var(--grad-c))" }}
              >
                {i + 1}
              </span>
              <button
                type="button"
                onClick={() => removeAt(i)}
                className="absolute right-3 top-3 z-10 rounded-full bg-[rgba(58,46,38,0.75)] px-2.5 py-1 text-xs font-bold text-white"
              >
                削除
              </button>
              {m.kind === "image" ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={m.url} alt={`素材${i + 1}`} className="h-40 w-full rounded-xl object-cover" />
              ) : (
                <video src={m.url} controls className="h-40 w-full rounded-xl object-cover" />
              )}
              <p className="truncate text-xs text-[var(--ink-soft)]">
                {m.mimeType} ・ {(m.sizeBytes / 1024 / 1024).toFixed(1)}MB
              </p>
              {m.aspectWarning && <p className="note-warn p-2 text-xs">縦型9:16から外れています</p>}
            </div>
          ))}
        </div>
      )}

      {showTargetToggle && (
        <div>
          <label className="label">投稿先</label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => onChangeSingleVideoAs("reel")}
              className={`chip flex-1 py-2.5 ${singleVideoAs === "reel" ? "chip-on" : ""}`}
            >
              リール
            </button>
            <button
              type="button"
              onClick={() => onChangeSingleVideoAs("feed_video")}
              className={`chip flex-1 py-2.5 ${singleVideoAs === "feed_video" ? "chip-on" : ""}`}
            >
              フィード動画
            </button>
          </div>
        </div>
      )}

      {media.length >= 2 && (
        <p className="note-info">
          {media.length}件選択中のため、フィードのカルーセル投稿になります（リールは1件の動画のみ対応）
        </p>
      )}
    </div>
  );
}
