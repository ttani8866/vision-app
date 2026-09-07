import { NextResponse } from "next/server";
import { getRecentMedia, InstagramApiError } from "@/lib/instagram";

// 診断用: アカウントの直近投稿一覧（読み取り専用）
export async function GET() {
  try {
    const media = await getRecentMedia(5);
    return NextResponse.json({ ok: true, media });
  } catch (err) {
    if (err instanceof InstagramApiError) {
      return NextResponse.json({ ok: false, error: err.payload }, { status: err.status });
    }
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
