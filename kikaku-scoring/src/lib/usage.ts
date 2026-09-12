import fs from "node:fs";
import path from "node:path";

// サーバー側の利用量台帳（§6-11）。追記型で保存し、上限到達時は採点を停止する
const DATA_DIR = path.join(process.cwd(), "data");
const LEDGER = path.join(DATA_DIR, "usage.json");

export type UsageEntry = {
  at: string;
  fileHash: string;
  modelId: string;
  inputTokens: number;
  outputTokens: number;
  estimatedCostUsd: number | null;
  status: "success" | "failed";
};

type Ledger = { entries: UsageEntry[] };

function read(): Ledger {
  try {
    return JSON.parse(fs.readFileSync(LEDGER, "utf8")) as Ledger;
  } catch {
    return { entries: [] };
  }
}

export function getLimitUsd(): number | null {
  const v = process.env.USAGE_LIMIT_USD?.trim();
  if (!v) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export function getUsageSummary() {
  const ledger = read();
  const totalCostUsd = ledger.entries.reduce((a, e) => a + (e.estimatedCostUsd ?? 0), 0);
  const totalRuns = ledger.entries.filter((e) => e.status === "success").length;
  const limitUsd = getLimitUsd();
  return {
    totalCostUsd: Math.round(totalCostUsd * 10000) / 10000,
    totalRuns,
    limitUsd,
    limitReached: limitUsd !== null && totalCostUsd >= limitUsd,
  };
}

export function appendUsage(entry: UsageEntry) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const ledger = read();
  ledger.entries.push(entry);
  fs.writeFileSync(LEDGER, JSON.stringify(ledger, null, 2));
}
