import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { AiCallError, runAiScoring } from "@/lib/ai";
import { getCriteriaSet } from "@/lib/criteria";
import { estimateCost } from "@/lib/pricing";
import { appendUsage, getUsageSummary } from "@/lib/usage";
import { ValidationError, verifyAndBuildItems } from "@/lib/validate";
import type { Evaluation, ScoreRequest, ScoreResponse } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

function fail(code: string, error: string, status: number, detail?: string) {
  return NextResponse.json<ScoreResponse>({ ok: false, code, error, detail }, { status });
}

export async function POST(req: Request) {
  let body: ScoreRequest;
  try {
    body = (await req.json()) as ScoreRequest;
  } catch {
    return fail("BAD_REQUEST", "リクエストを解釈できませんでした", 400);
  }
  if (!body?.criteriaSetId || !Array.isArray(body.pages) || body.pages.length === 0 || !body.fileHash) {
    return fail("BAD_REQUEST", "基準セット・ページ情報・ファイルハッシュが不足しています", 400);
  }

  const set = getCriteriaSet(body.criteriaSetId, Number(body.criteriaVersion));
  if (!set) return fail("CRITERIA_NOT_FOUND", `基準セット ${body.criteriaSetId} v${body.criteriaVersion} が見つかりません`, 404);

  // 利用上限（§6-11）
  const usage = getUsageSummary();
  if (usage.limitReached) {
    return fail("USAGE_LIMIT_REACHED", `利用上限（$${usage.limitUsd}）に到達したため採点を停止しています。管理者に連絡してください`, 429);
  }

  // 空文書・非企画書はAI呼び出し前に検出できる範囲で弾く
  const totalChars = body.pages.reduce((a, p) => a + p.text.replace(/\s/g, "").length, 0);
  const allImageOnly = body.pages.every((p) => p.textStatus === "image_only");

  const startedAt = Date.now();
  try {
    const ai = await runAiScoring(set, body.pages);
    const verified = verifyAndBuildItems(ai.output, set, body.pages);
    const cost = estimateCost(ai.modelId, ai.inputTokens, ai.outputTokens);

    appendUsage({
      at: new Date().toISOString(),
      fileHash: body.fileHash,
      modelId: ai.modelId,
      inputTokens: ai.inputTokens,
      outputTokens: ai.outputTokens,
      estimatedCostUsd: cost.estimatedCostUsd,
      status: "success",
    });

    const evaluation: Evaluation = {
      evaluationId: randomUUID(),
      kind: "ai",
      criteriaSetId: set.setId,
      criteriaVersion: set.version,
      criteriaName: set.name,
      notice: set.notice,
      provider: ai.provider,
      modelId: ai.modelId,
      modelSettings: { ...ai.settings, elapsedMs: Date.now() - startedAt, textChars: totalChars, allImageOnly },
      documentStatus: ai.output.documentStatus,
      unreadablePageIds: ai.output.unreadablePageIds ?? [],
      pageReading: body.pages.map((p) => ({ pageId: p.pageId, pageNumber: p.pageNumber, textStatus: p.textStatus })),
      items: verified.items,
      hasHold: verified.hasHold,
      totalScore: verified.totalScore,
      scoredSubtotal: verified.scoredSubtotal,
      scoredMaxSubtotal: verified.scoredMaxSubtotal,
      totalPoints: set.totalPoints,
      overallComment: ai.output.overallComment,
      priorityImprovements: (ai.output.priorityImprovements ?? []).slice(0, 3),
      usage: {
        inputTokens: ai.inputTokens,
        outputTokens: ai.outputTokens,
        totalTokens: ai.inputTokens + ai.outputTokens,
        estimatedCostUsd: cost.estimatedCostUsd,
        pricingNote: cost.pricingNote,
      },
      createdAt: new Date().toISOString(),
    };
    return NextResponse.json<ScoreResponse>({ ok: true, evaluation });
  } catch (e) {
    // 失敗は「採点失敗」として返し、成功として保存しない（§6-2・§7-4）
    if (e instanceof AiCallError) {
      appendUsage({ at: new Date().toISOString(), fileHash: body.fileHash, modelId: "", inputTokens: 0, outputTokens: 0, estimatedCostUsd: null, status: "failed" });
      return fail(e.code, e.message, e.code === "API_KEY_MISSING" ? 500 : 502, e.detail);
    }
    if (e instanceof ValidationError) {
      return fail(e.code, `AI応答の検証に不合格でした：${e.message}`, 502);
    }
    console.error("[score] failed:", e);
    return fail("SCORE_FAILED", `採点処理に失敗しました：${(e as Error).message}`, 500);
  }
}
