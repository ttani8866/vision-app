import { randomUUID } from "crypto";
import path from "path";
import { mkdir, writeFile } from "fs/promises";
import type { Storage, UploadResult } from "./types";

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");

export class LocalStorage implements Storage {
  async upload(file: Buffer, opts: { filename: string; mimeType: string }): Promise<UploadResult> {
    await mkdir(UPLOAD_DIR, { recursive: true });

    const ext = path.extname(opts.filename) || guessExt(opts.mimeType);
    const key = `${randomUUID()}${ext}`;
    await writeFile(path.join(UPLOAD_DIR, key), file);

    return {
      url: `/uploads/${key}`,
      key,
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
