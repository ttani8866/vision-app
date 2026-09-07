import path from "path";
import { readFileSync } from "fs";
import { env } from "@/lib/env";
import { LocalStorage } from "./local";
import { S3Storage } from "./s3";
import type { Storage } from "./types";

export type { Storage, UploadResult } from "./types";

let instance: Storage | null = null;

export function getStorage(): Storage {
  if (!instance) {
    instance = env.storageDriver === "s3" ? new S3Storage() : new LocalStorage();
  }
  return instance;
}

/** cloudflaredトンネル起動時に書き出される現在の公開URL（毎回変わるためファイル経由で受け渡す） */
function readTunnelUrl(): string | null {
  try {
    const p = path.join(process.cwd(), "..", "tools", "tunnel_url.txt");
    const url = readFileSync(p, "utf-8").trim();
    return /^https:\/\//.test(url) ? url : null;
  } catch {
    return null;
  }
}

/**
 * Instagram Graph API はローカルURL（localhost）を取得できないため、
 * BAEMESHI_PUBLIC_BASE_URL → tools/tunnel_url.txt → リクエストorigin の優先順で
 * 公開URLを解決して絶対URLを組み立てる。localhostしか得られない場合はエラーにする
 * （Instagram側が取得できず必ず失敗するため）。
 */
export function toAbsoluteUrl(relativeUrl: string, requestOrigin?: string): string {
  if (/^https?:\/\//.test(relativeUrl)) return relativeUrl;
  const candidates = [env.publicBaseUrl, readTunnelUrl(), requestOrigin];
  const base = candidates.find((c) => c && !/localhost|127\.0\.0\.1/.test(c));
  if (!base) {
    throw new Error(
      "公開URLを解決できません。cloudflaredトンネルを起動して tools/tunnel_url.txt にURLを書き出すか、BAEMESHI_PUBLIC_BASE_URL を .env に設定してください。"
    );
  }
  return `${base.replace(/\/$/, "")}${relativeUrl}`;
}
