"use client";
import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { Evaluation } from "./types";

// 端末側（ブラウザ内 IndexedDB）に評価と元ファイルを保存する（§6-9）。評価は追記型で上書きしない（§8）
export type StoredPage = { pageId: string; pageNumber: number; image: string };

export type StoredEvaluation = {
  evaluationId: string;
  cacheKey: string; // 同一ファイル・同一基準セット・同一モデル設定の判定に使う（§6-2）
  projectName: string;
  versionName: string;
  fileName: string;
  fileHash: string;
  pageCount: number;
  pages: StoredPage[];
  evaluation: Evaluation;
  createdAt: string;
};

interface Schema extends DBSchema {
  evaluations: {
    key: string;
    value: StoredEvaluation;
    indexes: { byCacheKey: string; byCreated: string };
  };
  files: {
    key: string;
    value: { fileHash: string; fileName: string; blob: Blob; savedAt: string };
  };
}

let dbPromise: Promise<IDBPDatabase<Schema>> | null = null;

function db() {
  if (!dbPromise) {
    dbPromise = openDB<Schema>("kikaku-scoring", 1, {
      upgrade(d) {
        const ev = d.createObjectStore("evaluations", { keyPath: "evaluationId" });
        ev.createIndex("byCacheKey", "cacheKey");
        ev.createIndex("byCreated", "createdAt");
        d.createObjectStore("files", { keyPath: "fileHash" });
      },
    });
  }
  return dbPromise;
}

export function makeCacheKey(fileHash: string, setId: string, version: number, provider: string, modelId: string, imageDetail: string) {
  return [fileHash, setId, String(version), provider, modelId, imageDetail].join("|");
}

export async function saveEvaluation(rec: StoredEvaluation) {
  await (await db()).put("evaluations", rec);
}

export async function findByCacheKey(cacheKey: string): Promise<StoredEvaluation | undefined> {
  const all = await (await db()).getAllFromIndex("evaluations", "byCacheKey", cacheKey);
  return all.sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
}

export async function listEvaluations(): Promise<StoredEvaluation[]> {
  const all = await (await db()).getAll("evaluations");
  return all.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getEvaluation(id: string) {
  return (await db()).get("evaluations", id);
}

export async function saveFile(fileHash: string, fileName: string, blob: Blob): Promise<boolean> {
  try {
    await (await db()).put("files", { fileHash, fileName, blob, savedAt: new Date().toISOString() });
    return true;
  } catch {
    return false;
  }
}

export async function getFile(fileHash: string) {
  try {
    return await (await db()).get("files", fileHash);
  } catch {
    return undefined;
  }
}

export async function sha256OfFile(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  const digest = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
