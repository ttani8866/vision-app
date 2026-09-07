import { NextResponse } from "next/server";
import { getContainerStatus, InstagramApiError } from "@/lib/instagram";

// 検証用: コンテナのstatus_codeを確認するだけ（公開処理は一切行わない）
export async function GET(req: Request) {
  const id = new URL(req.url).searchParams.get("id");
  if (!id) {
    return NextResponse.json({ ok: false, error: "id クエリパラメータが必要です" }, { status: 400 });
  }
  try {
    const status = await getContainerStatus(id);
    return NextResponse.json({ ok: true, status });
  } catch (err) {
    if (err instanceof InstagramApiError) {
      return NextResponse.json({ ok: false, error: err.payload }, { status: err.status });
    }
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
