import { NextResponse } from "next/server";
import { getProposal, listProposalBatches, listProposals, updateProposal, type ProposalStatus } from "@/lib/db";

export const dynamic = "force-dynamic";

// 改善案の一覧・単体取得・状態更新。生成は /api/proposals/generate。
export async function GET(req: Request) {
  const id = Number(new URL(req.url).searchParams.get("id"));
  if (id) {
    const item = await getProposal(id);
    if (!item) return NextResponse.json({ ok: false, error: "改善案が見つかりません" }, { status: 404 });
    return NextResponse.json({ ok: true, item });
  }
  const [batches, items] = await Promise.all([listProposalBatches(10), listProposals(60)]);
  return NextResponse.json({ ok: true, batches, items });
}

const ALLOWED: ProposalStatus[] = ["proposed", "approved", "rejected"];

// 人間承認の入口。approved（この案で作る）／rejected（見送る）／proposed（戻す）のみ受け付ける。
// posted への遷移は投稿成功時にサーバー側で行い、ここからは変更できない。
export async function PATCH(req: Request) {
  const body = (await req.json().catch(() => null)) as { id?: number; status?: ProposalStatus } | null;
  const id = Number(body?.id);
  const status = body?.status;
  if (!id || !status || !ALLOWED.includes(status)) {
    return NextResponse.json({ ok: false, error: "id と status（proposed/approved/rejected）が必要です" }, { status: 400 });
  }
  const current = await getProposal(id);
  if (!current) return NextResponse.json({ ok: false, error: "改善案が見つかりません" }, { status: 404 });
  if (current.status === "posted") {
    return NextResponse.json({ ok: false, error: "投稿済みの案は変更できません" }, { status: 409 });
  }
  await updateProposal(id, { status });
  return NextResponse.json({ ok: true, item: await getProposal(id) });
}
