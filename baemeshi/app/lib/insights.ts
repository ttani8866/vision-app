import { env } from "@/lib/env";
import { getAccountInfo, InstagramApiError } from "@/lib/instagram";
import { listPostHistory, getPostReport } from "@/lib/db";

// 改善案生成のための実績収集（読み取り専用）。
// 取れない項目は null / 空配列にして、取れた範囲で改善案を出す。

const GRAPH_BASE = `https://graph.facebook.com/${env.graphApiVersion}`;

async function graphGet(pathAndQuery: string) {
  const res = await fetch(`${GRAPH_BASE}${pathAndQuery}`, { cache: "no-store" });
  const json = await res.json();
  if (!res.ok || json.error) throw new InstagramApiError(res.status, json);
  return json;
}

function actionValue(actions: { action_type: string; value: string }[] | undefined, type: string): number | null {
  const hit = actions?.find((a) => a.action_type === type);
  return hit ? Number(hit.value) : null;
}

export interface AdAccountSummary {
  spend: number | null;
  impressions: number | null;
  reach: number | null;
  clicks: number | null;
  ctr: number | null;
  cpc: number | null;
  cpm: number | null;
  frequency: number | null;
  linkClicks: number | null;
  landingPageViews: number | null;
  postEngagement: number | null;
}

export interface AdCreativeSummary {
  adName: string;
  status: string | null;
  spend: number | null;
  impressions: number | null;
  clicks: number | null;
  ctr: number | null;
  cpc: number | null;
  linkClicks: number | null;
  /** 広告に使われているInstagram投稿のキャプション冒頭（取れた場合） */
  captionHead: string | null;
  permalink: string | null;
}

export interface OrganicPostSummary {
  id: string;
  timestamp: string | null;
  mediaType: string;
  captionHead: string;
  likeCount: number | null;
  commentsCount: number | null;
  reach: number | null;
  saved: number | null;
  shares: number | null;
  permalink: string | null;
}

export interface AppPostSummary {
  historyId: number;
  storeName: string;
  postedAt: string;
  mediaType: string;
  captionHead: string;
  metrics: Record<string, number | null> | null;
  kadai: string | null;
  taisaku: string | null;
}

export interface PerformanceSnapshot {
  collectedAt: string;
  period: string;
  account: { username: string | null; followers: number | null; mediaCount: number | null } | null;
  ads: { account: AdAccountSummary | null; creatives: AdCreativeSummary[]; error: string | null };
  organic: { posts: OrganicPostSummary[]; error: string | null };
  appPosts: AppPostSummary[];
}

function head(text: string | undefined | null, n = 80): string {
  if (!text) return "";
  const oneLine = text.replace(/\s+/g, " ").trim();
  return oneLine.length > n ? oneLine.slice(0, n) + "…" : oneLine;
}

async function fetchAdAccountSummary(): Promise<AdAccountSummary | null> {
  const qs = new URLSearchParams({
    access_token: env.igUserToken,
    date_preset: "last_7d",
    level: "account",
    fields: "spend,impressions,reach,clicks,ctr,cpc,cpm,frequency,actions,inline_link_clicks",
  });
  const json = await graphGet(`/${env.adAccountId}/insights?${qs.toString()}`);
  const row = json.data?.[0];
  if (!row) return null;
  return {
    spend: row.spend != null ? Number(row.spend) : null,
    impressions: row.impressions != null ? Number(row.impressions) : null,
    reach: row.reach != null ? Number(row.reach) : null,
    clicks: row.clicks != null ? Number(row.clicks) : null,
    ctr: row.ctr != null ? Number(row.ctr) : null,
    cpc: row.cpc != null ? Number(row.cpc) : null,
    cpm: row.cpm != null ? Number(row.cpm) : null,
    frequency: row.frequency != null ? Number(row.frequency) : null,
    linkClicks: row.inline_link_clicks != null ? Number(row.inline_link_clicks) : actionValue(row.actions, "link_click"),
    landingPageViews: actionValue(row.actions, "landing_page_view"),
    postEngagement: actionValue(row.actions, "post_engagement"),
  };
}

async function fetchAdCreatives(): Promise<AdCreativeSummary[]> {
  const qs = new URLSearchParams({
    access_token: env.igUserToken,
    date_preset: "last_7d",
    level: "ad",
    fields: "ad_id,ad_name,spend,impressions,clicks,ctr,cpc,inline_link_clicks",
    limit: "25",
  });
  const json = await graphGet(`/${env.adAccountId}/insights?${qs.toString()}`);
  const rows = (json.data ?? []) as Record<string, string>[];
  rows.sort((a, b) => Number(b.spend ?? 0) - Number(a.spend ?? 0));
  const top = rows.slice(0, 8);

  const out: AdCreativeSummary[] = [];
  for (const r of top) {
    let captionHead: string | null = null;
    let permalink: string | null = null;
    let status: string | null = null;
    try {
      const aq = new URLSearchParams({
        access_token: env.igUserToken,
        fields: "effective_status,creative{effective_instagram_media_id,instagram_permalink_url,body}",
      });
      const ad = await graphGet(`/${r.ad_id}?${aq.toString()}`);
      status = ad.effective_status ?? null;
      permalink = ad.creative?.instagram_permalink_url ?? null;
      const mediaId = ad.creative?.effective_instagram_media_id;
      if (mediaId) {
        const mq = new URLSearchParams({ access_token: env.igUserToken, fields: "caption" });
        const media = await graphGet(`/${mediaId}?${mq.toString()}`);
        captionHead = head(media.caption) || null;
      } else if (ad.creative?.body) {
        captionHead = head(ad.creative.body);
      }
    } catch {
      // クリエイティブ詳細が取れなくても数値だけで続行
    }
    out.push({
      adName: r.ad_name,
      status,
      spend: r.spend != null ? Number(r.spend) : null,
      impressions: r.impressions != null ? Number(r.impressions) : null,
      clicks: r.clicks != null ? Number(r.clicks) : null,
      ctr: r.ctr != null ? Number(r.ctr) : null,
      cpc: r.cpc != null ? Number(r.cpc) : null,
      linkClicks: r.inline_link_clicks != null ? Number(r.inline_link_clicks) : null,
      captionHead,
      permalink,
    });
  }
  return out;
}

async function fetchOrganicPosts(limit = 8): Promise<OrganicPostSummary[]> {
  const qs = new URLSearchParams({
    fields: "id,caption,media_type,media_product_type,permalink,timestamp,like_count,comments_count",
    limit: String(limit),
    access_token: env.igUserToken,
  });
  const json = await graphGet(`/${env.igAccountId}/media?${qs.toString()}`);
  const items = (json.data ?? []) as Record<string, unknown>[];

  const out: OrganicPostSummary[] = [];
  for (const m of items) {
    const post: OrganicPostSummary = {
      id: String(m.id),
      timestamp: (m.timestamp as string) ?? null,
      mediaType: String(m.media_product_type ?? m.media_type ?? ""),
      captionHead: head(m.caption as string),
      likeCount: m.like_count != null ? Number(m.like_count) : null,
      commentsCount: m.comments_count != null ? Number(m.comments_count) : null,
      reach: null,
      saved: null,
      shares: null,
      permalink: (m.permalink as string) ?? null,
    };
    // 指標は2段階まで（reach,saved,shares → reach）で試す。取れなければ null のまま
    for (const set of [["reach", "saved", "shares"], ["reach"]]) {
      try {
        const iq = new URLSearchParams({ metric: set.join(","), access_token: env.igUserToken });
        const ins = await graphGet(`/${post.id}/insights?${iq.toString()}`);
        for (const item of ins.data ?? []) {
          const v = item.values?.[0]?.value ?? null;
          if (item.name === "reach") post.reach = v;
          if (item.name === "saved") post.saved = v;
          if (item.name === "shares") post.shares = v;
        }
        break;
      } catch {
        // 次のセットへ
      }
    }
    out.push(post);
  }
  return out;
}

async function fetchAppPosts(): Promise<AppPostSummary[]> {
  const history = (await listPostHistory(20)).filter((h) => h.status === "success" && h.media_id);
  const out: AppPostSummary[] = [];
  for (const h of history) {
    const report = await getPostReport(h.id);
    let metrics: Record<string, number | null> | null = null;
    if (report) {
      try {
        const m = JSON.parse(report.metrics_json);
        metrics = {
          likeCount: m.likeCount ?? null,
          commentsCount: m.commentsCount ?? null,
          reach: m.reach ?? null,
          saved: m.saved ?? null,
          shares: m.shares ?? null,
          views: m.views ?? null,
        };
      } catch {
        metrics = null;
      }
    }
    out.push({
      historyId: h.id,
      storeName: h.store_name,
      postedAt: h.posted_at,
      mediaType: h.media_type,
      captionHead: head(h.caption),
      metrics,
      kadai: report?.kadai ?? null,
      taisaku: report?.taisaku ?? null,
    });
  }
  return out;
}

function errText(e: unknown): string {
  if (e instanceof InstagramApiError) {
    const p = e.payload as { error?: { message?: string } };
    return p?.error?.message ?? `HTTP ${e.status}`;
  }
  return e instanceof Error ? e.message : String(e);
}

/** 直近7日の広告実績・直近投稿・アプリ投稿履歴をまとめて取得する */
export async function collectPerformanceSnapshot(): Promise<PerformanceSnapshot> {
  const snapshot: PerformanceSnapshot = {
    collectedAt: new Date().toISOString(),
    period: "直近7日間",
    account: null,
    ads: { account: null, creatives: [], error: null },
    organic: { posts: [], error: null },
    appPosts: [],
  };

  try {
    const info = await getAccountInfo();
    snapshot.account = {
      username: info.username ?? null,
      followers: info.followers_count ?? null,
      mediaCount: info.media_count ?? null,
    };
  } catch {
    snapshot.account = null;
  }

  if (env.adAccountId) {
    try {
      snapshot.ads.account = await fetchAdAccountSummary();
      snapshot.ads.creatives = await fetchAdCreatives();
    } catch (e) {
      snapshot.ads.error = errText(e);
    }
  } else {
    snapshot.ads.error = "BAEMESHI_META_AD_ACCOUNT_ID が未設定のため広告実績は未取得";
  }

  try {
    snapshot.organic.posts = await fetchOrganicPosts();
  } catch (e) {
    snapshot.organic.error = errText(e);
  }

  try {
    snapshot.appPosts = await fetchAppPosts();
  } catch {
    snapshot.appPosts = [];
  }

  return snapshot;
}

function fmt(v: number | null, unit = ""): string {
  if (v === null || Number.isNaN(v)) return "不明";
  const s = Number.isInteger(v) ? v.toLocaleString("ja-JP") : v.toFixed(2);
  return s + unit;
}

/** Claude に渡すためのテキスト整形 */
export function snapshotToText(s: PerformanceSnapshot): string {
  const lines: string[] = [];
  lines.push(`取得日時: ${s.collectedAt}／対象期間: ${s.period}`);
  if (s.account) {
    lines.push(`アカウント: @${s.account.username ?? "?"}／フォロワー ${fmt(s.account.followers)}／投稿数 ${fmt(s.account.mediaCount)}`);
  }

  lines.push("");
  lines.push("■ 広告実績（アカウント合計）");
  if (s.ads.account) {
    const a = s.ads.account;
    lines.push(
      `消化 ${fmt(a.spend, "円")}／imp ${fmt(a.impressions)}／リーチ ${fmt(a.reach)}／クリック ${fmt(a.clicks)}／CTR ${fmt(a.ctr, "%")}／CPC ${fmt(a.cpc, "円")}／CPM ${fmt(a.cpm, "円")}／フリークエンシー ${fmt(a.frequency)}`
    );
    lines.push(
      `リンククリック ${fmt(a.linkClicks)}／ランディングページビュー ${fmt(a.landingPageViews)}／投稿エンゲージメント ${fmt(a.postEngagement)}`
    );
  } else {
    lines.push(`（未取得: ${s.ads.error ?? "データなし"}）`);
  }

  if (s.ads.creatives.length > 0) {
    lines.push("");
    lines.push("■ 広告別（消化金額降順）");
    for (const c of s.ads.creatives) {
      lines.push(
        `- ${c.adName}${c.status ? `［${c.status}］` : ""}: 消化 ${fmt(c.spend, "円")}／imp ${fmt(c.impressions)}／クリック ${fmt(c.clicks)}／CTR ${fmt(c.ctr, "%")}／CPC ${fmt(c.cpc, "円")}／リンククリック ${fmt(c.linkClicks)}`
      );
      if (c.captionHead) lines.push(`    投稿内容: ${c.captionHead}`);
    }
  }

  lines.push("");
  lines.push("■ 直近のオーガニック投稿（新しい順）");
  if (s.organic.posts.length === 0) {
    lines.push(`（未取得: ${s.organic.error ?? "データなし"}）`);
  }
  for (const p of s.organic.posts) {
    lines.push(
      `- ${p.timestamp?.slice(0, 10) ?? "?"} ${p.mediaType}: いいね ${fmt(p.likeCount)}／コメント ${fmt(p.commentsCount)}／リーチ ${fmt(p.reach)}／保存 ${fmt(p.saved)}／シェア ${fmt(p.shares)}`
    );
    if (p.captionHead) lines.push(`    内容: ${p.captionHead}`);
  }

  if (s.appPosts.length > 0) {
    lines.push("");
    lines.push("■ このアプリから投稿した分（結果レポートがあるもの）");
    for (const p of s.appPosts) {
      const m = p.metrics;
      lines.push(
        `- ${p.postedAt.slice(0, 10)} ${p.storeName}（${p.mediaType}）: ` +
          (m
            ? `いいね ${fmt(m.likeCount)}／コメント ${fmt(m.commentsCount)}／リーチ ${fmt(m.reach)}／保存 ${fmt(m.saved)}／シェア ${fmt(m.shares)}`
            : "指標未集計")
      );
      if (p.kadai) lines.push(`    前回の課題: ${p.kadai}`);
    }
  }

  return lines.join("\n");
}
