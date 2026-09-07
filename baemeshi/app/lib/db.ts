import path from "path";
import { mkdirSync } from "fs";
import Database from "better-sqlite3";

const DATA_DIR = path.join(process.cwd(), "data");
mkdirSync(DATA_DIR, { recursive: true });

const db = new Database(path.join(DATA_DIR, "baemeshi.db"));
db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS post_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    posted_at TEXT NOT NULL,
    store_name TEXT NOT NULL,
    media_type TEXT NOT NULL CHECK (media_type IN ('image', 'reel', 'feed_video', 'carousel')),
    media_count INTEGER NOT NULL DEFAULT 1,
    status TEXT NOT NULL CHECK (status IN ('success', 'failed', 'dry_run')),
    media_id TEXT,
    permalink TEXT,
    error_message TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS post_reports (
    history_id INTEGER PRIMARY KEY,
    media_id TEXT NOT NULL,
    metrics_json TEXT NOT NULL,
    seika TEXT NOT NULL,
    kadai TEXT NOT NULL,
    taisaku TEXT NOT NULL,
    generated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

// 追加カラムのマイグレーション（既存DBを壊さず適用）
const historyCols = db.prepare("PRAGMA table_info(post_history)").all() as { name: string }[];
if (!historyCols.some((c) => c.name === "caption")) {
  db.exec("ALTER TABLE post_history ADD COLUMN caption TEXT");
}

export interface PostHistoryRow {
  id: number;
  posted_at: string;
  store_name: string;
  media_type: "image" | "reel" | "feed_video" | "carousel";
  media_count: number;
  status: "success" | "failed" | "dry_run";
  media_id: string | null;
  permalink: string | null;
  error_message: string | null;
  caption: string | null;
  created_at: string;
}

export interface PostReportRow {
  history_id: number;
  media_id: string;
  metrics_json: string;
  seika: string;
  kadai: string;
  taisaku: string;
  generated_at: string;
}

export function insertPostHistory(row: Omit<PostHistoryRow, "id" | "created_at">): PostHistoryRow {
  const stmt = db.prepare(`
    INSERT INTO post_history (posted_at, store_name, media_type, media_count, status, media_id, permalink, error_message, caption)
    VALUES (@posted_at, @store_name, @media_type, @media_count, @status, @media_id, @permalink, @error_message, @caption)
  `);
  const info = stmt.run(row);
  return db.prepare("SELECT * FROM post_history WHERE id = ?").get(info.lastInsertRowid) as PostHistoryRow;
}

export function getHistoryById(id: number): PostHistoryRow | undefined {
  return db.prepare("SELECT * FROM post_history WHERE id = ?").get(id) as PostHistoryRow | undefined;
}

export function listPostHistory(limit = 50): PostHistoryRow[] {
  return db
    .prepare("SELECT * FROM post_history ORDER BY datetime(posted_at) DESC LIMIT ?")
    .all(limit) as PostHistoryRow[];
}

export function getPostReport(historyId: number): PostReportRow | undefined {
  return db.prepare("SELECT * FROM post_reports WHERE history_id = ?").get(historyId) as PostReportRow | undefined;
}

export function upsertPostReport(row: Omit<PostReportRow, "generated_at">): PostReportRow {
  db.prepare(`
    INSERT INTO post_reports (history_id, media_id, metrics_json, seika, kadai, taisaku, generated_at)
    VALUES (@history_id, @media_id, @metrics_json, @seika, @kadai, @taisaku, datetime('now'))
    ON CONFLICT(history_id) DO UPDATE SET
      media_id = excluded.media_id,
      metrics_json = excluded.metrics_json,
      seika = excluded.seika,
      kadai = excluded.kadai,
      taisaku = excluded.taisaku,
      generated_at = datetime('now')
  `).run(row);
  return getPostReport(row.history_id)!;
}

/** 前回の成功投稿からの経過時間（ms）。成功投稿がなければ null */
export function msSinceLastSuccessfulPost(): number | null {
  const row = db
    .prepare("SELECT posted_at FROM post_history WHERE status = 'success' ORDER BY datetime(posted_at) DESC LIMIT 1")
    .get() as { posted_at: string } | undefined;
  if (!row) return null;
  return Date.now() - new Date(row.posted_at).getTime();
}

export default db;
