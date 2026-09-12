import OpenAI from "openai";
import type { AiEvaluationOutput, CriteriaSet, ScorePage } from "./types";
import { buildOutputSchema, buildSystemPrompt, buildUserContent } from "./prompt";

export type AiCallResult = {
  output: AiEvaluationOutput;
  inputTokens: number;
  outputTokens: number;
  provider: string;
  modelId: string;
  settings: Record<string, string | number | boolean>;
};

export class AiCallError extends Error {
  constructor(
    public code: string,
    message: string,
    public detail?: string,
  ) {
    super(message);
  }
}

export function getAiConfig() {
  const provider = (process.env.AI_PROVIDER ?? "openai").toLowerCase();
  const modelId = provider === "mock" ? "mock" : (process.env.OPENAI_MODEL ?? "gpt-4.1");
  const detailRaw = (process.env.OPENAI_IMAGE_DETAIL ?? "high").toLowerCase();
  const imageDetail: "low" | "high" | "auto" = detailRaw === "low" ? "low" : detailRaw === "auto" ? "auto" : "high";
  return { provider, modelId, imageDetail };
}

// ---- モック（API を呼ばない。UI・検証ロジックの動作確認専用。結果画面に「モック」と明示される）
function mockScoring(set: CriteriaSet, pages: ScorePage[]): AiEvaluationOutput {
  const textPage = pages.find((p) => p.text.trim().length >= 20);
  const imagePage = pages.find((p) => p.textStatus === "image_only") ?? pages[0];
  const firstLine = textPage ? textPage.text.trim().split("\n").find((l) => l.trim().length >= 6) ?? "" : "";
  const quote = firstLine.slice(0, 30);

  const items = set.items.map((it, i) => {
    const insufficient = i === set.items.length - 1;
    return {
      itemId: it.itemId,
      judgement: insufficient ? ("insufficient" as const) : ("confirmed" as const),
      score: Math.round(it.maxPoints * (insufficient ? 0.4 : 0.6)),
      reason: `（モック）${it.name}について、資料の記載を仮に評価した結果です。実際のAI評価ではありません。`,
      evidence: [
        ...(textPage && quote ? [{ pageId: textPage.pageId, type: "quote" as const, text: quote }] : []),
        ...(imagePage ? [{ pageId: imagePage.pageId, type: "figure" as const, text: "（モック）ページ全体のレイアウトを図表根拠として仮に参照" }] : []),
      ],
      strengths: ["（モック）確認できる点の例"],
      gaps: insufficient ? ["資料全体で記載を確認できない（モック）"] : [],
      suggestions: ["（モック）改善案の例"],
      evidenceStatus: insufficient ? ("insufficient" as const) : ("recorded" as const),
    };
  });

  return {
    documentStatus: pages.length === 0 ? "empty" : "ok",
    unreadablePageIds: [],
    overallComment:
      "（モック）これはAI APIを呼ばずに生成した疑似結果です。表示・保存・検証ロジックの動作確認のみに使用してください。実際の評価内容は含まれていません。本文はダミーであり、企画の良否について何も述べていません。".padEnd(200, "。"),
    items,
    priorityImprovements: [
      {
        rank: 1,
        itemId: set.items[0].itemId,
        targetPageId: pages[0]?.pageId ?? null,
        change: "（モック）修正内容の例",
        reason: "（モック）優先する理由の例",
        infoToConfirm: "（モック）追加確認する情報の例",
      },
    ],
  };
}

// ---- OpenAI（Responses API、構造化出力、応答保存なし）
async function openaiScoring(set: CriteriaSet, pages: ScorePage[], modelId: string, imageDetail: "low" | "high" | "auto") {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new AiCallError("API_KEY_MISSING", "OPENAI_API_KEY がサーバーに設定されていません（.env.local を確認してください）");

  const client = new OpenAI({ apiKey });
  const isReasoningModel = /^(gpt-5|o\d)/.test(modelId);
  const settings: Record<string, string | number | boolean> = {
    imageDetail,
    store: false,
    maxOutputTokens: 8000,
    ...(isReasoningModel ? { reasoningEffort: "low" } : { temperature: 0.2 }),
  };

  let res: OpenAI.Responses.Response;
  try {
    res = await client.responses.create({
      model: modelId,
      store: false, // 応答の保存を無効化（§9-1）
      input: [
        { role: "system", content: buildSystemPrompt(set) },
        { role: "user", content: buildUserContent(pages, imageDetail) as OpenAI.Responses.ResponseInputContent[] },
      ],
      text: {
        format: { type: "json_schema", name: "kikaku_evaluation", schema: buildOutputSchema(set) as Record<string, unknown>, strict: true },
      },
      max_output_tokens: 8000,
      ...(isReasoningModel ? { reasoning: { effort: "low" } } : { temperature: 0.2 }),
    });
  } catch (e) {
    const err = e as { status?: number; message?: string };
    throw new AiCallError("AI_REQUEST_FAILED", `AI処理に失敗しました（HTTP ${err.status ?? "不明"}）`, err.message);
  }

  const contents = (res.output as Array<{ content?: unknown }>).flatMap((o) =>
    Array.isArray(o.content) ? (o.content as Array<{ type?: string; refusal?: string }>) : [],
  );
  const refusal = contents.find((c) => c.type === "refusal");
  if (refusal) throw new AiCallError("AI_REFUSED", "AIが応答を拒否しました", refusal.refusal);
  if (res.status === "incomplete") {
    throw new AiCallError("AI_INCOMPLETE", "AI応答が途中で打ち切られました", JSON.stringify(res.incomplete_details));
  }

  const text = res.output_text;
  if (!text) throw new AiCallError("AI_EMPTY", "AI応答が空でした");
  let output: AiEvaluationOutput;
  try {
    output = JSON.parse(text) as AiEvaluationOutput;
  } catch {
    throw new AiCallError("AI_OUTPUT_INVALID", "AI応答をJSONとして解釈できませんでした", text.slice(0, 500));
  }

  return {
    output,
    inputTokens: res.usage?.input_tokens ?? 0,
    outputTokens: res.usage?.output_tokens ?? 0,
    settings,
  };
}

export async function runAiScoring(set: CriteriaSet, pages: ScorePage[]): Promise<AiCallResult> {
  const { provider, modelId, imageDetail } = getAiConfig();
  if (provider === "mock") {
    return {
      output: mockScoring(set, pages),
      inputTokens: 0,
      outputTokens: 0,
      provider,
      modelId,
      settings: { mock: true },
    };
  }
  if (provider !== "openai") throw new AiCallError("PROVIDER_UNSUPPORTED", `未対応のプロバイダです: ${provider}`);
  const r = await openaiScoring(set, pages, modelId, imageDetail);
  return { ...r, provider, modelId };
}
