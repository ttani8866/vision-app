import type { StoreInfo } from "./claude";

export type { StoreInfo };

export interface UploadedMedia {
  url: string;
  key: string;
  mimeType: string;
  sizeBytes: number;
  kind: "image" | "video";
  aspectWarning: boolean;
  /** サムネイル文字入れ済みの場合、元写真のURL（再編集時はこちらから合成し直す） */
  originalUrl?: string;
}

export const MAX_MEDIA_COUNT = 5;

/** 投稿種別。1件のみ選択時は image / reel / feed_video のいずれか、2件以上はcarousel固定 */
export type PostTarget = "image" | "reel" | "feed_video" | "carousel";

export function resolvePostTarget(media: UploadedMedia[], singleVideoAs: "reel" | "feed_video"): PostTarget | null {
  if (media.length === 0) return null;
  if (media.length === 1) {
    return media[0].kind === "video" ? singleVideoAs : "image";
  }
  return "carousel";
}

export const GENRES: StoreInfo["genre"][] = ["銀座老舗", "ハレの日", "ランチ", "スイーツ", "新店"];

export const EMPTY_STORE: StoreInfo = {
  name: "",
  igHandle: "",
  address: "",
  stationWalk: "",
  phone: "",
  hoursAndClosed: "",
  menu: "",
  payment: "",
  genre: "ランチ",
  ginzaOnlyReason: "",
};
