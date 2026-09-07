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

/**
 * Instagram Graph API はローカルURL（localhost）を取得できないため、
 * BAEMESHI_PUBLIC_BASE_URL（cloudflared等のトンネルURL）またはリクエストのoriginから
 * 絶対URLを組み立てる。
 */
export function toAbsoluteUrl(relativeUrl: string, requestOrigin?: string): string {
  if (/^https?:\/\//.test(relativeUrl)) return relativeUrl;
  const base = env.publicBaseUrl || requestOrigin;
  if (!base) {
    throw new Error(
      "公開URLを組み立てられません。BAEMESHI_PUBLIC_BASE_URL を .env に設定するか、cloudflared/ngrokのURLでアクセスしてください。"
    );
  }
  return `${base.replace(/\/$/, "")}${relativeUrl}`;
}
