import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { collectPerformanceSnapshot, snapshotToText } from "@/lib/insights";
import { generateProposals } from "@/lib/claude";
import { createProposalBatch, insertProposals } from "@/lib/db";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// 実績取得 → 改善仮説 → 新案3本の生成（読み取り専用。投稿・広告への書き込みは一切しない）
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

    const generated = await generateProposals(text);
    const batchId = randomUUID();
    const batch = await createProposalBatch({
      id: batchId,
      source_json: JSON.stringify({ snapshot, text }),
      summary: generated.summary,
    });
    const items = await insertProposals(
      generated.proposals.map((p) => ({
        batch_id: batchId,
        title: p.title,
        genre: p.genre,
        hook: p.hook,
        shoot: p.shoot,
        reason: p.reason,
        evidence: p.evidence,
      }))
    );

    return NextResponse.json({ ok: true, batch, items, warnings: [snapshot.ads.error, snapshot.organic.error].filter(Boolean) });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err instanceof Error ? err.message : err) }, { status: 500 });
  }
}
