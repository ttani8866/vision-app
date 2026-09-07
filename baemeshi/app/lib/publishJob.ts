import { randomUUID } from "crypto";
import {
  createCarouselChildContainer,
  createCarouselContainer,
  createMediaContainer,
  getPermalink,
  InstagramApiError,
  publishContainer,
  waitForContainerFinished,
  type MediaKind,
} from "@/lib/instagram";
import { toAbsoluteUrl } from "@/lib/storage";
import { insertPostHistory, type PostHistoryRow } from "@/lib/db";

export interface PublishInput {
  target: "image" | "reel" | "feed_video" | "carousel";
  media: { url: string; kind: "image" | "video" }[];
  caption: string;
  storeName: string;
  requestOrigin: string;
}

export interface PublishJob {
  id: string;
  state: "running" | "success" | "failed";
  startedAt: number;
  mediaId?: string;
  permalink?: string | null;
  error?: string;
  history?: PostHistoryRow;
}

// devサーバーのプロセス内で保持する（プロトタイプ用途。再起動でジョブ状態は消えるが履歴はDBに残る）
const globalStore = globalThis as unknown as { __publishJobs?: Map<string, PublishJob> };
const jobs: Map<string, PublishJob> = globalStore.__publishJobs ?? new Map();
globalStore.__publishJobs = jobs;

export function getPublishJob(id: string): PublishJob | undefined {
  return jobs.get(id);
}

/** 実行中ジョブがあれば返す（二重投稿防止用） */
export function getRunningJob(): PublishJob | undefined {
  return Array.from(jobs.values()).find((job) => job.state === "running");
}

/** 投稿ジョブを開始し、即座にジョブIDを返す。処理はバックグラウンドで継続する */
export function startPublishJob(input: PublishInput): PublishJob {
  const job: PublishJob = { id: randomUUID(), state: "running", startedAt: Date.now() };
  jobs.set(job.id, job);

  void runPublish(job, input);
  return job;
}

async function runPublish(job: PublishJob, input: PublishInput) {
  const postedAt = new Date().toISOString();
  try {
    let publishedId: string;

    if (input.target === "carousel") {
      if (input.media.length < 2) {
        throw new Error("カルーセル投稿には2件以上の素材が必要です");
      }
      const childIds: string[] = [];
      for (const item of input.media) {
        const absoluteUrl = toAbsoluteUrl(item.url, input.requestOrigin);
        const child = await createCarouselChildContainer({ kind: item.kind, mediaUrl: absoluteUrl });
        await waitForContainerFinished(child.id);
        childIds.push(child.id);
      }
      const parent = await createCarouselContainer({ childrenIds: childIds, caption: input.caption });
      await waitForContainerFinished(parent.id);
      const published = await publishContainer(parent.id);
      publishedId = published.id;
    } else {
      const absoluteUrl = toAbsoluteUrl(input.media[0].url, input.requestOrigin);
      const kind: MediaKind = input.target;
      const container = await createMediaContainer({ kind, mediaUrl: absoluteUrl, caption: input.caption });
      await waitForContainerFinished(container.id);
      const published = await publishContainer(container.id);
      publishedId = published.id;
    }

    const permalink = await getPermalink(publishedId).catch(() => null);

    job.history = insertPostHistory({
      posted_at: postedAt,
      store_name: input.storeName,
      media_type: input.target,
      media_count: input.media.length,
      status: "success",
      media_id: publishedId,
      permalink,
      error_message: null,
      caption: input.caption,
    });
    job.mediaId = publishedId;
    job.permalink = permalink;
    job.state = "success";
  } catch (err) {
    const errorMessage = err instanceof InstagramApiError ? JSON.stringify(err.payload) : String(err);
    job.history = insertPostHistory({
      posted_at: postedAt,
      store_name: input.storeName,
      media_type: input.target,
      media_count: input.media.length,
      status: "failed",
      media_id: null,
      permalink: null,
      error_message: errorMessage,
      caption: input.caption,
    });
    job.error = errorMessage;
    job.state = "failed";
  }
}
