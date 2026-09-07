import { NextResponse } from "next/server";
import { getHistoryById, getPostReport, upsertPostReport } from "@/lib/db";
import { getMediaMetrics, InstagramApiError } from "@/lib/instagram";
import { generateReportCommentary } from "@/lib/claude";

const MEDIA_TYPE_LABEL: Record<string, string> = {
  image: "フィード（画像）",
  reel: "リール",
  feed_video: "フィード（動画）",
  carousel: "フィード（カルーセル）",
};

// 投稿結果レポート（読み取り専用: 指標取得＋コメント生成。投稿には一切関与しない）
export async function GET(req: Request) {
  const url = new URL(req.url);
  const historyId = Number(url.searchParams.get("historyId"));
  const refresh = url.searchParams.get("refresh") === "1";

  if (!historyId) {
    return NextResponse.json({ ok: false, error: "historyId が必要です" }, { status: 400 });
  }
  const history = getHistoryById(historyId);
  if (!history) {
    return NextResponse.json({ ok: false, error: "履歴が見つかりません" }, { status: 404 });
  }
  if (!history.media_id) {
    return NextResponse.json({ ok: false, error: "この履歴には投稿IDがないためレポートを作成できません" }, { status: 400 });
  }

  const cached = getPostReport(historyId);
  if (cached && !refresh) {
    return NextResponse.json({
      ok: true,
      cached: true,
      metrics: JSON.parse(cached.metrics_json),
      seika: cached.seika,
      kadai: cached.kadai,
      taisaku: cached.taisaku,
      generatedAt: cached.generated_at,
    });
  }

  try {
    const metrics = await getMediaMetrics(history.media_id);
    const commentary = await generateReportCommentary({
      storeName: history.store_name,
      caption: history.caption ?? metrics.caption,
      postedAt: history.posted_at,
      mediaTypeLabel: MEDIA_TYPE_LABEL[history.media_type] ?? history.media_type,
      metrics,
    });

    const saved = upsertPostReport({
      history_id: historyId,
      media_id: history.media_id,
      metrics_json: JSON.stringify(metrics),
      seika: commentary.seika,
      kadai: commentary.kadai,
      taisaku: commentary.taisaku,
    });

    return NextResponse.json({
      ok: true,
      cached: false,
      metrics,
      seika: saved.seika,
      kadai: saved.kadai,
      taisaku: saved.taisaku,
      generatedAt: saved.generated_at,
    });
  } catch (err) {
    if (err instanceof InstagramApiError) {
      return NextResponse.json({ ok: false, error: JSON.stringify(err.payload) }, { status: err.status });
    }
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
