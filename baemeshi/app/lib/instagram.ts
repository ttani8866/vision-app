import { env } from "@/lib/env";

const GRAPH_BASE = `https://graph.facebook.com/${env.graphApiVersion}`;

export type MediaKind = "image" | "reel" | "feed_video";
export type CarouselItemKind = "image" | "video";

export interface GraphApiError {
  message: string;
  type?: string;
  code?: number;
  error_subcode?: number;
  fbtrace_id?: string;
}

export class InstagramApiError extends Error {
  constructor(public status: number, public payload: unknown) {
    super(`Instagram Graph API error (HTTP ${status})`);
  }
}

async function graphFetch(pathAndQuery: string, init?: RequestInit) {
  const res = await fetch(`${GRAPH_BASE}${pathAndQuery}`, init);
  const json = await res.json();
  if (!res.ok || json.error) {
    throw new InstagramApiError(res.status, json);
  }
  return json;
}

/** POST /{IG_ACCOUNT_ID}/media でメディアコンテナを作成する（公開はまだ行わない） */
export async function createMediaContainer(params: {
  kind: MediaKind;
  mediaUrl: string;
  caption: string;
}): Promise<{ id: string }> {
  const body = new URLSearchParams({
    caption: params.caption,
    access_token: env.igUserToken,
  });
  if (params.kind === "image") {
    body.set("image_url", params.mediaUrl);
  } else if (params.kind === "reel") {
    body.set("video_url", params.mediaUrl);
    body.set("media_type", "REELS");
  } else {
    // feed_video: リールではなく通常のフィード動画として投稿
    body.set("video_url", params.mediaUrl);
    body.set("media_type", "VIDEO");
  }

  return graphFetch(`/${env.igAccountId}/media`, {
    method: "POST",
    body,
  });
}

/** POST /{IG_ACCOUNT_ID}/media でカルーセル用の子コンテナを作成する（is_carousel_item=true） */
export async function createCarouselChildContainer(params: {
  kind: CarouselItemKind;
  mediaUrl: string;
}): Promise<{ id: string }> {
  const body = new URLSearchParams({
    is_carousel_item: "true",
    access_token: env.igUserToken,
  });
  if (params.kind === "image") {
    body.set("image_url", params.mediaUrl);
  } else {
    body.set("video_url", params.mediaUrl);
    body.set("media_type", "VIDEO");
  }

  return graphFetch(`/${env.igAccountId}/media`, {
    method: "POST",
    body,
  });
}

/** POST /{IG_ACCOUNT_ID}/media でカルーセル親コンテナを作成する（children=子コンテナID一覧） */
export async function createCarouselContainer(params: {
  childrenIds: string[];
  caption: string;
}): Promise<{ id: string }> {
  const body = new URLSearchParams({
    media_type: "CAROUSEL",
    children: params.childrenIds.join(","),
    caption: params.caption,
    access_token: env.igUserToken,
  });
  return graphFetch(`/${env.igAccountId}/media`, {
    method: "POST",
    body,
  });
}

/** GET /{container_id}?fields=status_code,status でコンテナの処理状況を取得する */
export async function getContainerStatus(
  containerId: string
): Promise<{ status_code: string; status?: string }> {
  const qs = new URLSearchParams({
    fields: "status_code,status",
    access_token: env.igUserToken,
  });
  return graphFetch(`/${containerId}?${qs.toString()}`);
}

/**
 * コンテナが FINISHED になるまで最大5分・30秒間隔でポーリングする。
 * ERROR/EXPIRED になった場合は例外を投げる。
 */
export async function waitForContainerFinished(
  containerId: string,
  opts: { maxWaitMs?: number; intervalMs?: number } = {}
): Promise<void> {
  const maxWaitMs = opts.maxWaitMs ?? 5 * 60 * 1000;
  const intervalMs = opts.intervalMs ?? 30 * 1000;
  const deadline = Date.now() + maxWaitMs;

  for (;;) {
    const { status_code } = await getContainerStatus(containerId);
    if (status_code === "FINISHED") return;
    if (status_code === "ERROR" || status_code === "EXPIRED") {
      throw new Error(`コンテナ処理が失敗しました（status_code=${status_code}）`);
    }
    if (Date.now() >= deadline) {
      throw new Error("コンテナ処理がタイムアウトしました（5分経過、status_code=" + status_code + "）");
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }
}

/** POST /{IG_ACCOUNT_ID}/media_publish で公開する */
export async function publishContainer(containerId: string): Promise<{ id: string }> {
  const body = new URLSearchParams({
    creation_id: containerId,
    access_token: env.igUserToken,
  });
  return graphFetch(`/${env.igAccountId}/media_publish`, {
    method: "POST",
    body,
  });
}

/** GET /{media_id}?fields=permalink */
export async function getPermalink(mediaId: string): Promise<string | null> {
  const qs = new URLSearchParams({
    fields: "permalink",
    access_token: env.igUserToken,
  });
  const json = await graphFetch(`/${mediaId}?${qs.toString()}`);
  return json.permalink ?? null;
}

export interface MediaMetrics {
  likeCount: number | null;
  commentsCount: number | null;
  reach: number | null;
  saved: number | null;
  shares: number | null;
  views: number | null;
  permalink: string | null;
  timestamp: string | null;
  caption: string | null;
  mediaProductType: string | null;
}

/** 投稿の反応指標を取得する（読み取り専用）。取れない指標は null のまま返す */
export async function getMediaMetrics(mediaId: string): Promise<MediaMetrics> {
  const qs = new URLSearchParams({
    fields: "like_count,comments_count,permalink,timestamp,caption,media_product_type",
    access_token: env.igUserToken,
  });
  const base = await graphFetch(`/${mediaId}?${qs.toString()}`);

  const metrics: MediaMetrics = {
    likeCount: base.like_count ?? null,
    commentsCount: base.comments_count ?? null,
    reach: null,
    saved: null,
    shares: null,
    views: null,
    permalink: base.permalink ?? null,
    timestamp: base.timestamp ?? null,
    caption: base.caption ?? null,
    mediaProductType: base.media_product_type ?? null,
  };

  // insights はメディア種別・APIバージョンで取れる指標が変わるため、段階的にフォールバックする
  const metricSets = [
    ["reach", "saved", "shares", "views"],
    ["reach", "saved", "shares"],
    ["reach", "saved"],
    ["reach"],
  ];
  for (const set of metricSets) {
    try {
      const iqs = new URLSearchParams({ metric: set.join(","), access_token: env.igUserToken });
      const json = await graphFetch(`/${mediaId}/insights?${iqs.toString()}`);
      for (const item of json.data ?? []) {
        const value = item.values?.[0]?.value ?? null;
        if (item.name === "reach") metrics.reach = value;
        if (item.name === "saved") metrics.saved = value;
        if (item.name === "shares") metrics.shares = value;
        if (item.name === "views") metrics.views = value;
      }
      break;
    } catch {
      // この指標セットでは取れない。次のセットを試す
    }
  }

  return metrics;
}

/** GET /{IG_ACCOUNT_ID}/media — 直近の投稿一覧（読み取り専用・診断/取り込み用） */
export async function getRecentMedia(limit = 5) {
  const qs = new URLSearchParams({
    fields: "id,caption,media_type,media_product_type,permalink,timestamp",
    limit: String(limit),
    access_token: env.igUserToken,
  });
  const json = await graphFetch(`/${env.igAccountId}/media?${qs.toString()}`);
  return (json.data ?? []) as {
    id: string;
    caption?: string;
    media_type: string;
    media_product_type?: string;
    permalink?: string;
    timestamp?: string;
  }[];
}

/** GET /{IG_ACCOUNT_ID}?fields=username,followers_count,media_count — トークン疎通確認用 */
export async function getAccountInfo() {
  const qs = new URLSearchParams({
    fields: "username,followers_count,media_count",
    access_token: env.igUserToken,
  });
  return graphFetch(`/${env.igAccountId}?${qs.toString()}`);
}
