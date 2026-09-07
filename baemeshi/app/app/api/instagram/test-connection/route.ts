import { NextResponse } from "next/server";
import { getAccountInfo, InstagramApiError } from "@/lib/instagram";

export const dynamic = "force-dynamic";

// トークン・アカウントIDの疎通確認のみ（読み取り専用、投稿には一切関与しない）
export async function GET() {
  try {
    const info = await getAccountInfo();
    return NextResponse.json({ ok: true, account: info });
  } catch (err) {
    if (err instanceof InstagramApiError) {
      return NextResponse.json({ ok: false, error: err.payload }, { status: err.status });
    }
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
