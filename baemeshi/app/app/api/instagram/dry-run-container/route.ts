import { NextResponse } from "next/server";
import {
  createCarouselChildContainer,
  createCarouselContainer,
  createMediaContainer,
  getContainerStatus,
  InstagramApiError,
  waitForContainerFinished,
  type MediaKind,
} from "@/lib/instagram";

// Step 2 検証用: コンテナ作成〜ステータス確認のみ行う。media_publish は絶対に呼ばない。
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const caption = (body?.caption as string | undefined) ?? "[dry-run] baemeshi プロトタイプ動作確認用";

  try {
    if (body?.kind === "carousel") {
      const items = body?.items as { mediaUrl: string; kind: "image" | "video" }[] | undefined;
      if (!items || items.length < 2) {
        return NextResponse.json({ ok: false, error: "items（2件以上）が必要です" }, { status: 400 });
      }
      const childIds: string[] = [];
      for (const item of items) {
        const child = await createCarouselChildContainer({ kind: item.kind, mediaUrl: item.mediaUrl });
        await waitForContainerFinished(child.id);
        childIds.push(child.id);
      }
      const parent = await createCarouselContainer({ childrenIds: childIds, caption });
      const status = await getContainerStatus(parent.id);
      return NextResponse.json({
        ok: true,
        note: "カルーセルコンテナを作成しました。media_publish は呼び出していません（未公開）。",
        childIds,
        containerId: parent.id,
        status,
      });
    }

    const mediaUrl = body?.mediaUrl as string | undefined;
    const kind = (body?.kind as MediaKind | undefined) ?? "image";
    if (!mediaUrl) {
      return NextResponse.json({ ok: false, error: "mediaUrl が必要です" }, { status: 400 });
    }
    const container = await createMediaContainer({ kind, mediaUrl, caption });
    const status = await getContainerStatus(container.id);
    return NextResponse.json({
      ok: true,
      note: "コンテナを作成しました。media_publish は呼び出していません（未公開）。",
      containerId: container.id,
      status,
    });
  } catch (err) {
    if (err instanceof InstagramApiError) {
      return NextResponse.json({ ok: false, error: err.payload }, { status: err.status });
    }
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
