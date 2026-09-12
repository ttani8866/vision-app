import type {
  AiEvaluationOutput,
  CriteriaSet,
  ItemResult,
  ScorePage,
  VerifiedEvidence,
} from "./types";

export class ValidationError extends Error {
  code = "AI_OUTPUT_INVALID";
  constructor(message: string) {
    super(message);
  }
}

// 引用照合用の正規化：空白・改行・全角空白・句読点の揺れを吸収する
export function normalizeForMatch(s: string): string {
  return s
    .normalize("NFKC")
    .replace(/[\s　]+/g, "")
    .replace(/[、。，．,.・「」『』（）()\[\]【】"'’‘“”:：;；!！?？\-－―—～〜]/g, "")
    .toLowerCase();
}

export function quoteMatches(quote: string, pageText: string): boolean {
  const q = normalizeForMatch(quote);
  if (q.length === 0) return false;
  const t = normalizeForMatch(pageText);
  if (t.includes(q)) return true;
  // 長い引用は先頭12文字・末尾12文字のどちらかが一致すれば許容（抽出時の改行混入対策）
  if (q.length >= 16) {
    return t.includes(q.slice(0, 12)) && t.includes(q.slice(-12));
  }
  return false;
}

function isSafeInt(n: unknown): n is number {
  return typeof n === "number" && Number.isInteger(n);
}

// §7-4 出力検証。構造の不備は ValidationError（採点失敗）、根拠の照合不能は項目の保留にする
export function verifyAndBuildItems(
  out: AiEvaluationOutput,
  set: CriteriaSet,
  pages: ScorePage[],
): { items: ItemResult[]; hasHold: boolean; totalScore: number | null; scoredSubtotal: number; scoredMaxSubtotal: number } {
  if (!out || !Array.isArray(out.items)) throw new ValidationError("items が配列ではありません");
  if (out.items.length !== set.items.length) {
    throw new ValidationError(`項目数が基準セットと一致しません（期待 ${set.items.length}、実際 ${out.items.length}）`);
  }
  const seen = new Set<string>();
  for (const it of out.items) {
    if (seen.has(it.itemId)) throw new ValidationError(`項目ID ${it.itemId} が重複しています`);
    seen.add(it.itemId);
  }
  for (const def of set.items) {
    if (!seen.has(def.itemId)) throw new ValidationError(`項目ID ${def.itemId} の結果がありません`);
  }
  if (!Array.isArray(out.priorityImprovements)) throw new ValidationError("priorityImprovements がありません");
  if (typeof out.overallComment !== "string" || out.overallComment.trim().length === 0) {
    throw new ValidationError("総評がありません");
  }

  const pageById = new Map(pages.map((p) => [p.pageId, p]));
  const notProposal = out.documentStatus === "not_a_proposal" || out.documentStatus === "empty";

  const items: ItemResult[] = set.items.map((def) => {
    const r = out.items.find((x) => x.itemId === def.itemId)!;
    const required = [r.reason];
    if (required.some((s) => typeof s !== "string" || s.trim().length === 0)) {
      throw new ValidationError(`項目 ${def.itemId} の評価理由が空です`);
    }
    if (!Array.isArray(r.evidence) || !Array.isArray(r.strengths) || !Array.isArray(r.gaps) || !Array.isArray(r.suggestions)) {
      throw new ValidationError(`項目 ${def.itemId} の配列フィールドが不正です`);
    }

    let held = false;
    let holdReason: ItemResult["holdReason"] = null;
    let holdDetail: string | null = null;

    if (notProposal) {
      held = true;
      holdReason = "not_a_proposal";
      holdDetail = out.documentStatus === "empty" ? "資料の内容が空のため採点を実行していません" : "資料が企画書ではないと判定されたため採点を実行していません";
    } else if (r.judgement === "unreadable") {
      held = true;
      holdReason = "unreadable";
      holdDetail = "文字や図が判読できず、この項目は判断できませんでした";
    } else {
      if (!isSafeInt(r.score)) throw new ValidationError(`項目 ${def.itemId} の点数が整数ではありません`);
      if (r.score < 0 || r.score > def.maxPoints) {
        throw new ValidationError(`項目 ${def.itemId} の点数 ${r.score} が配点 0〜${def.maxPoints} の範囲外です`);
      }
    }

    // 根拠の検証：ページIDの実在、引用の照合
    const problems: string[] = [];
    const evidence: VerifiedEvidence[] = r.evidence.map((ev) => {
      const page = pageById.get(ev.pageId);
      if (!page) {
        problems.push(`根拠のページID「${ev.pageId}」が資料に存在しません`);
        return { ...ev, pageNumber: null, verified: false };
      }
      if (ev.type === "quote") {
        const ok = quoteMatches(ev.text, page.text);
        if (!ok) problems.push(`ページ${page.pageNumber}の引用「${ev.text}」を抽出テキストと照合できません`);
        return { ...ev, pageNumber: page.pageNumber, verified: ok };
      }
      // figure（図表説明）は画像根拠のためテキスト照合の対象外。ページ実在のみ確認
      return { ...ev, pageNumber: page.pageNumber, verified: true };
    });

    if (!held && problems.length > 0) {
      held = true;
      holdReason = problems.some((p) => p.includes("存在しません")) ? "evidence_page_missing" : "quote_unverified";
      holdDetail = `根拠を検証できないため確認が済むまで保留にします：${problems.join("／")}`;
    }

    return {
      itemId: def.itemId,
      name: def.name,
      maxPoints: def.maxPoints,
      judgement: r.judgement,
      score: held ? null : r.score,
      reason: r.reason,
      evidence,
      strengths: r.strengths.slice(0, 2),
      gaps: r.gaps.slice(0, 2),
      suggestions: r.suggestions.slice(0, 2),
      evidenceStatus: r.evidenceStatus,
      held,
      holdReason,
      holdDetail,
    };
  });

  // 優先改善の検証：項目ID・ページIDの実在
  for (const pi of out.priorityImprovements) {
    if (!set.items.some((d) => d.itemId === pi.itemId)) throw new ValidationError(`優先改善の項目ID ${pi.itemId} が不正です`);
    if (pi.targetPageId !== null && !pageById.has(pi.targetPageId)) {
      throw new ValidationError(`優先改善の対象ページID ${pi.targetPageId} が資料に存在しません`);
    }
  }

  const hasHold = items.some((i) => i.held);
  const scored = items.filter((i) => !i.held);
  const scoredSubtotal = scored.reduce((a, i) => a + (i.score ?? 0), 0);
  const scoredMaxSubtotal = scored.reduce((a, i) => a + i.maxPoints, 0);
  // 総合点はアプリ側で加算する（§7-3）。保留があれば表示しない（§6-4）
  const totalScore = hasHold ? null : scoredSubtotal;

  return { items, hasHold, totalScore, scoredSubtotal, scoredMaxSubtotal };
}
