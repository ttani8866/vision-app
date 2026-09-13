import { NextResponse } from "next/server";
import { collectPerformanceSnapshot, snapshotToText } from "@/lib/insights";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// 改善案生成の前段: 実績の収集だけを行う（読み取り専用）。
// Vercelの関数は60秒までのため、収集と生成を別リクエストに分けている。
export async function POST() {
  try {
    const snapshot = await collectPerformanceSnapshot();
    const text = snapshotToText(snapshot);
    const hasAnyData =
      snapshot.ads.account !== null || snapshot.organic.posts.length > 0 || snapshot.appPosts.length > 0;
    if (!hasAnyData) {
      return NextResponse.json(
        {
          ok: false,
          error: `実績データを取得できませんでした（広告: ${snapshot.ads.error ?? "なし"}／投稿: ${snapshot.organic.error ?? "なし"}）`,
        },
        { status: 502 }
      );
    }
    return NextResponse.json({ ok: true, snapshot, text });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err instanceof Error ? err.message : err) }, { status: 500 });
  }
}
