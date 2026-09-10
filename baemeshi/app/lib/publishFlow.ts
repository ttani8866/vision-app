import { randomUUID } from "crypto";
import {
  createCarouselChildContainer,
  createCarouselContainer,
  createMediaContainer,
  getContainerStatus,
  getPermalink,
  InstagramApiError,
  publishContainer,
  type MediaKind,
} from "@/lib/instagram";
import { toAbsoluteUrl } from "@/lib/storage";
import {
  createPublishJob,
  getPublishJob,
  getRunningPublishJob,
  insertPostHistory,
  updatePublishJob,
  updateProposal,
  type PublishJobRow,
} from "@/lib/db";

// Vercelのサーバーレス関数は長時間実行できないため、投稿は「状態を進める」方式にする。
// POSTでコンテナ作成までを行いジョブ保存 → クライアントのポーリング(GET)が来るたびに
// ステータス確認→親作成→公開、と1歩ずつ進める。各リクエストは数秒で完了する。

export interface PublishPayload {
  target: "image" | "reel" | "feed_video" | "carousel";
  media: { url: string; kind: "image" | "video" }[];
  caption: string;
  storeName: string;
  /** 改善案から作った投稿の場合、その改善案ID（投稿成功時に posted へ遷移させる） */
  proposalId?: number | null;
}

const JOB_TIMEOUT_MS = 10 * 60 * 1000;

export { getRunningPublishJob };

/** 投稿ジョブを開始する（コンテナ作成まで。公開はしない） */
export async function startPublish(
  input: Omit<PublishPayload, "media"> & {
    media: { url: string; kind: "image" | "video" }[];
    requestOrigin: string;
  }
): Promise<{ jobId: string }> {
  const media = input.media.map((m) => ({ ...m, url: toAbsoluteUrl(m.url, input.requestOrigin) }));
  const payload: PublishPayload = {
    target: input.target,
    media,
    caption: input.caption,
    storeName: input.storeName,
    proposalId: input.proposalId ? Number(input.proposalId) : null,
  };
  const id = randomUUID();

  if (payload.target === "carousel") {
    if (media.length < 2) throw new Error("カルーセル投稿には2件以上の素材が必要です");
    const childIds: string[] = [];
    for (const item of media) {
      const child = await createCarouselChildContainer({ kind: item.kind, mediaUrl: item.url });
      childIds.push(child.id);
    }
    await createPublishJob({
      id,
      state: "waiting_children",
      payload_json: JSON.stringify(payload),
      child_ids_json: JSON.stringify(childIds),
      parent_container_id: null,
    });
  } else {
    const container = await createMediaContainer({
      kind: payload.target as MediaKind,
      mediaUrl: media[0].url,
      caption: payload.caption,
    });
    await createPublishJob({
      id,
      state: "waiting_parent",
      payload_json: JSON.stringify(payload),
      child_ids_json: null,
      parent_container_id: container.id,
    });
  }
  return { jobId: id };
}

function jobCreatedAtMs(job: PublishJobRow): number {
  const s = job.created_at;
  const iso = s.includes("T") ? s : s.replace(" ", "T") + "Z";
  return new Date(iso).getTime();
}

async function failJob(job: PublishJobRow, message: string): Promise<PublishJobRow> {
  const payload = JSON.parse(job.payload_json) as PublishPayload;
  const hist = await insertPostHistory({
    posted_at: new Date().toISOString(),
    store_name: payload.storeName,
    media_type: payload.target,
    media_count: payload.media.length,
    status: "failed",
    media_id: null,
    permalink: null,
    error_message: message,
    caption: payload.caption,
    media_urls_json: JSON.stringify(payload.media.map((m) => m.url)),
  });
  await updatePublishJob(job.id, { state: "failed", error_message: message, history_id: hist.id });
  return (await getPublishJob(job.id))!;
}

/** ジョブの状態を1歩進めて返す（ポーリングのたびに呼ぶ） */
export async function advancePublish(jobId: string): Promise<PublishJobRow | undefined> {
  const job = await getPublishJob(jobId);
  if (!job) return undefined;
  if (job.state === "success" || job.state === "failed") return job;

  if (Date.now() - jobCreatedAtMs(job) > JOB_TIMEOUT_MS) {
    return failJob(job, "投稿処理がタイムアウトしました（10分）");
  }

  try {
    if (job.state === "waiting_children") {
      const childIds = JSON.parse(job.child_ids_json ?? "[]") as string[];
      for (const childId of childIds) {
        const { status_code } = await getContainerStatus(childId);
        if (status_code === "ERROR" || status_code === "EXPIRED") {
          return failJob(job, `カルーセル素材の処理が失敗しました（status_code=${status_code}）`);
        }
        if (status_code !== "FINISHED") return job;
      }
      const payload = JSON.parse(job.payload_json) as PublishPayload;
      const parent = await createCarouselContainer({ childrenIds: childIds, caption: payload.caption });
      await updatePublishJob(job.id, { state: "waiting_parent", parent_container_id: parent.id });
      return (await getPublishJob(job.id))!;
    }

    if (job.state === "waiting_parent") {
      const { status_code } = await getContainerStatus(job.parent_container_id!);
      if (status_code === "ERROR" || status_code === "EXPIRED") {
        return failJob(job, `コンテナ処理が失敗しました（status_code=${status_code}）`);
      }
      if (status_code !== "FINISHED") return job;

      const published = await publishContainer(job.parent_container_id!);
      const permalink = await getPermalink(published.id).catch(() => null);
      const payload = JSON.parse(job.payload_json) as PublishPayload;
      const hist = await insertPostHistory({
        posted_at: new Date().toISOString(),
        store_name: payload.storeName,
        media_type: payload.target,
        media_count: payload.media.length,
        status: "success",
        media_id: published.id,
        permalink,
        error_message: null,
        caption: payload.caption,
        media_urls_json: JSON.stringify(payload.media.map((m) => m.url)),
      });
      await updatePublishJob(job.id, {
        state: "success",
        media_id: published.id,
        permalink,
        history_id: hist.id,
      });
      if (payload.proposalId) {
        // 改善ループを閉じる: 改善案 → 投稿履歴 を紐づけ、結果レポートから遡れるようにする
        await updateProposal(payload.proposalId, { status: "posted", history_id: hist.id }).catch(() => {});
      }
      return (await getPublishJob(job.id))!;
    }

    return job;
  } catch (err) {
    const message = err instanceof InstagramApiError ? JSON.stringify(err.payload) : String(err);
    return failJob(job, message);
  }
}
