import { NextResponse } from "next/server";
import { InstagramApiError } from "@/lib/instagram";
import { advancePublish, getRunningPublishJob, startPublish, type PublishPayload } from "@/lib/publishFlow";

export const dynamic = "force-dynamic";

// 実際にInstagramへ公開するエンドポイント（サーバーレス対応のステートマシン方式）。
// フロント側は必ず確認モーダルでの明示的な承認を経てからこのAPIを呼び出すこと。
// POSTはコンテナ作成までを行いjobIdを返す。GET ?jobId= が呼ばれるたびに処理を1歩進める。
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as Omit<PublishPayload, never> | null;
  if (!body?.media?.length || !body?.caption || !body?.storeName || !body?.target) {
    return NextResponse.json(
      { ok: false, error: "target / media / caption / storeName が必要です" },
      { status: 400 }
    );
  }

  try {
    const running = await getRunningPublishJob();
    if (running) {
      return NextResponse.json(
        { ok: false, error: "別の投稿処理が実行中です。完了を待ってください。", jobId: running.id },
        { status: 409 }
      );
    }

    const origin = new URL(req.url).origin;
    const { jobId } = await startPublish({ ...body, requestOrigin: origin });
    return NextResponse.json({ ok: true, jobId });
  } catch (err) {
    const message = err instanceof InstagramApiError ? JSON.stringify(err.payload) : String(err);
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}

export async function GET(req: Request) {
  const jobId = new URL(req.url).searchParams.get("jobId");
  if (!jobId) {
    return NextResponse.json({ ok: false, error: "jobId が必要です" }, { status: 400 });
  }
  try {
    const job = await advancePublish(jobId);
    if (!job) {
      return NextResponse.json(
        { ok: false, error: "ジョブが見つかりません。投稿履歴を確認してください。" },
        { status: 404 }
      );
    }
    return NextResponse.json({
      ok: true,
      state: job.state === "success" || job.state === "failed" ? job.state : "running",
      mediaId: job.media_id,
      permalink: job.permalink,
      error: job.error_message,
    });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
