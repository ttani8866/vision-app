import { NextResponse } from "next/server";
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

interface MediaItem {
  url: string;
  kind: "image" | "video";
}

interface PublishRequestBody {
  target: "image" | "reel" | "feed_video" | "carousel";
  media: MediaItem[];
  caption: string;
  storeName: string;
}

// 実際にInstagramへ公開するエンドポイント。
// フロント側は必ず確認モーダルでの明示的な承認を経てからこのAPIを呼び出すこと。
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as PublishRequestBody | null;
  if (!body?.media?.length || !body?.caption || !body?.storeName || !body?.target) {
    return NextResponse.json(
      { ok: false, error: "target / media / caption / storeName が必要です" },
      { status: 400 }
    );
  }

  const origin = new URL(req.url).origin;
  const postedAt = new Date().toISOString();
  const dbMediaType: PostHistoryRow["media_type"] = body.target;

  try {
    let publishedId: string;

    if (body.target === "carousel") {
      if (body.media.length < 2) {
        throw new Error("カルーセル投稿には2件以上の素材が必要です");
      }
      const childIds: string[] = [];
      for (const item of body.media) {
        const absoluteUrl = toAbsoluteUrl(item.url, origin);
        const child = await createCarouselChildContainer({ kind: item.kind, mediaUrl: absoluteUrl });
        await waitForContainerFinished(child.id);
        childIds.push(child.id);
      }
      const parent = await createCarouselContainer({ childrenIds: childIds, caption: body.caption });
      await waitForContainerFinished(parent.id);
      const published = await publishContainer(parent.id);
      publishedId = published.id;
    } else {
      const absoluteUrl = toAbsoluteUrl(body.media[0].url, origin);
      const kind: MediaKind = body.target;
      const container = await createMediaContainer({ kind, mediaUrl: absoluteUrl, caption: body.caption });
      await waitForContainerFinished(container.id);
      const published = await publishContainer(container.id);
      publishedId = published.id;
    }

    const permalink = await getPermalink(publishedId).catch(() => null);

    const row = insertPostHistory({
      posted_at: postedAt,
      store_name: body.storeName,
      media_type: dbMediaType,
      media_count: body.media.length,
      status: "success",
      media_id: publishedId,
      permalink,
      error_message: null,
      caption: body.caption,
    });

    return NextResponse.json({ ok: true, mediaId: publishedId, permalink, history: row });
  } catch (err) {
    const errorMessage = err instanceof InstagramApiError ? JSON.stringify(err.payload) : String(err);

    const row = insertPostHistory({
      posted_at: postedAt,
      store_name: body.storeName,
      media_type: dbMediaType,
      media_count: body.media.length,
      status: "failed",
      media_id: null,
      permalink: null,
      error_message: errorMessage,
      caption: body.caption,
    });

    return NextResponse.json({ ok: false, error: errorMessage, history: row }, { status: 502 });
  }
}
