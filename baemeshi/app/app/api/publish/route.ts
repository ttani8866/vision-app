import { NextResponse } from "next/server";
import { getPublishJob, getRunningJob, startPublishJob, type PublishInput } from "@/lib/publishJob";

// 実際にInstagramへ公開するエンドポイント（非同期ジョブ方式）。
// フロント側は必ず確認モーダルでの明示的な承認を経てからこのAPIを呼び出すこと。
// POSTは即座にjobIdを返し、GET ?jobId= で進捗を取得する（トンネルの100秒タイムアウト対策）。
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as Omit<PublishInput, "requestOrigin"> | null;
  if (!body?.media?.length || !body?.caption || !body?.storeName || !body?.target) {
    return NextResponse.json(
      { ok: false, error: "target / media / caption / storeName が必要です" },
      { status: 400 }
    );
  }

  const running = getRunningJob();
  if (running) {
    return NextResponse.json(
      { ok: false, error: "別の投稿処理が実行中です。完了を待ってください。", jobId: running.id },
      { status: 409 }
    );
  }

  const origin = new URL(req.url).origin;
  const job = startPublishJob({ ...body, requestOrigin: origin });
  return NextResponse.json({ ok: true, jobId: job.id });
}

export async function GET(req: Request) {
  const jobId = new URL(req.url).searchParams.get("jobId");
  if (!jobId) {
    return NextResponse.json({ ok: false, error: "jobId が必要です" }, { status: 400 });
  }
  const job = getPublishJob(jobId);
  if (!job) {
    return NextResponse.json(
      { ok: false, error: "ジョブが見つかりません（サーバー再起動で消えた可能性。投稿履歴を確認してください）" },
      { status: 404 }
    );
  }
  return NextResponse.json({
    ok: true,
    state: job.state,
    mediaId: job.mediaId,
    permalink: job.permalink,
    error: job.error,
    elapsedSec: Math.round((Date.now() - job.startedAt) / 1000),
  });
}
