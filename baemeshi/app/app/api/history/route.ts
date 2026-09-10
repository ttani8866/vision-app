import { NextResponse } from "next/server";
import { deletePostHistory, listPostHistory } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ ok: true, items: await listPostHistory() });
}

// 履歴からの削除。Instagram上の投稿は消えない（公式APIに削除機能がないため）
export async function DELETE(req: Request) {
  const id = Number(new URL(req.url).searchParams.get("id"));
  if (!id) {
    return NextResponse.json({ ok: false, error: "id が必要です" }, { status: 400 });
  }
  const deleted = await deletePostHistory(id);
  if (!deleted) {
    return NextResponse.json({ ok: false, error: "履歴が見つかりません" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
