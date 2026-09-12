import fs from "node:fs";
import path from "node:path";
import type { CriteriaSet } from "./types";

const CRITERIA_DIR = path.join(process.cwd(), "criteria");

// 合計点はアプリ側で検算する（§5-1）
function validateSet(set: CriteriaSet, file: string): CriteriaSet {
  const sum = set.items.reduce((a, i) => a + i.maxPoints, 0);
  if (sum !== set.totalPoints) {
    throw new Error(`基準セット ${file} の配点合計 ${sum} が totalPoints ${set.totalPoints} と一致しません`);
  }
  const ids = new Set(set.items.map((i) => i.itemId));
  if (ids.size !== set.items.length) {
    throw new Error(`基準セット ${file} に重複した itemId があります`);
  }
  return set;
}

export function listCriteriaSets(): CriteriaSet[] {
  if (!fs.existsSync(CRITERIA_DIR)) return [];
  return fs
    .readdirSync(CRITERIA_DIR)
    .filter((f) => f.endsWith(".json"))
    .map((f) => validateSet(JSON.parse(fs.readFileSync(path.join(CRITERIA_DIR, f), "utf8")), f))
    .sort((a, b) => a.setId.localeCompare(b.setId) || a.version - b.version);
}

export function getCriteriaSet(setId: string, version: number): CriteriaSet | null {
  return listCriteriaSets().find((s) => s.setId === setId && s.version === version) ?? null;
}
