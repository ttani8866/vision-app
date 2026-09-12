// モデル単価（米ドル／100万トークン）。参考値であり、実単価は提供元の最新価格表で確認すること
// 実測後に確定する（要件 §9-4）
export const PRICING_USD_PER_MTOK: Record<string, { input: number; output: number }> = {
  "gpt-4.1": { input: 2.0, output: 8.0 },
  "gpt-4.1-mini": { input: 0.4, output: 1.6 },
  "gpt-4o": { input: 2.5, output: 10.0 },
  "gpt-4o-mini": { input: 0.15, output: 0.6 },
  "gpt-5": { input: 1.25, output: 10.0 },
  "gpt-5-mini": { input: 0.25, output: 2.0 },
  mock: { input: 0, output: 0 },
};

export function estimateCost(modelId: string, inputTokens: number, outputTokens: number) {
  const p = PRICING_USD_PER_MTOK[modelId];
  if (!p) {
    return {
      estimatedCostUsd: null as number | null,
      pricingNote: `モデル ${modelId} の単価が未登録のため費用を推定できません`,
    };
  }
  const cost = (inputTokens * p.input + outputTokens * p.output) / 1_000_000;
  return {
    estimatedCostUsd: Math.round(cost * 10000) / 10000,
    pricingNote: `入力 $${p.input}／出力 $${p.output}（100万トークンあたり、参考単価）で試算。キャッシュ割引等は考慮していない`,
  };
}
