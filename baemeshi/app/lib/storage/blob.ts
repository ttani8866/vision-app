import { randomUUID } from "crypto";
import { put } from "@vercel/blob";
import type { Storage, UploadResult } from "./types";

// Vercel Blob ストレージ。BLOB_READ_WRITE_TOKEN 環境変数が必要（Vercel上では自動設定）。
// 返すURLは公開URLなので、Instagram APIからそのまま取得できる。
export class BlobStorage implements Storage {
  async upload(file: Buffer, opts: { filename: string; mimeType: string }): Promise<UploadResult> {
    const ext = opts.filename.includes(".") ? opts.filename.slice(opts.filename.lastIndexOf(".")) : guessExt(opts.mimeType);
    const blob = await put(`uploads/${randomUUID()}${ext}`, file, {
      access: "public",
      contentType: opts.mimeType,
    });
    return {
      url: blob.url,
      key: blob.pathname,
      mimeType: opts.mimeType,
      sizeBytes: file.byteLength,
    };
  }
}

function guessExt(mimeType: string): string {
  if (mimeType === "image/jpeg") return ".jpg";
  if (mimeType === "image/png") return ".png";
  if (mimeType === "video/mp4") return ".mp4";
  return "";
}
