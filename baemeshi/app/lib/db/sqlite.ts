import path from "path";
import { mkdirSync } from "fs";
import Database from "better-sqlite3";
import type { DbBackend, PostHistoryRow, PostReportRow, PublishJobRow } from "./types";

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

  CREATE TABLE IF NOT EXISTS publish_jobs (
    id TEXT PRIMARY KEY,
    state TEXT NOT NULL,
    payload_json TEXT NOT NULL,
    child_ids_json TEXT,
    parent_container_id TEXT,
    media_id TEXT,
    permalink TEXT,
    error_message TEXT,
    history_id INTEGER,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

// 追加カラムのマイグレーション（既存DBを壊さず適用）
const historyCols = db.prepare("PRAGMA table_info(post_history)").all() as { name: string }[];
if (!historyCols.some((c) => c.name === "caption")) {
  db.exec("ALTER TABLE post_history ADD COLUMN caption TEXT");
}

const backend: DbBackend = {
  async insertPostHistory(row) {
    const info = db
      .prepare(`
        INSERT INTO post_history (posted_at, store_name, media_type, media_count, status, media_id, permalink, error_message, caption)
        VALUES (@posted_at, @store_name, @media_type, @media_count, @status, @media_id, @permalink, @error_message, @caption)
      `)
      .run(row);
    return db.prepare("SELECT * FROM post_history WHERE id = ?").get(info.lastInsertRowid) as PostHistoryRow;
  },

  async getHistoryById(id) {
    return db.prepare("SELECT * FROM post_history WHERE id = ?").get(id) as PostHistoryRow | undefined;
  },

  async listPostHistory(limit = 50) {
    return db
      .prepare("SELECT * FROM post_history ORDER BY datetime(posted_at) DESC LIMIT ?")
      .all(limit) as PostHistoryRow[];
  },

  async msSinceLastSuccessfulPost() {
    const row = db
      .prepare("SELECT posted_at FROM post_history WHERE status = 'success' ORDER BY datetime(posted_at) DESC LIMIT 1")
      .get() as { posted_at: string } | undefined;
    if (!row) return null;
    return Date.now() - new Date(row.posted_at).getTime();
  },

  async getPostReport(historyId) {
    return db.prepare("SELECT * FROM post_reports WHERE history_id = ?").get(historyId) as PostReportRow | undefined;
  },

  async upsertPostReport(row) {
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
    return (await backend.getPostReport(row.history_id))!;
  },

  async createPublishJob(row) {
    db.prepare(`
      INSERT INTO publish_jobs (id, state, payload_json, child_ids_json, parent_container_id)
      VALUES (@id, @state, @payload_json, @child_ids_json, @parent_container_id)
    `).run(row);
    return (await backend.getPublishJob(row.id))!;
  },

  async getPublishJob(id) {
    return db.prepare("SELECT * FROM publish_jobs WHERE id = ?").get(id) as PublishJobRow | undefined;
  },

  async getRunningPublishJob() {
    return db
      .prepare("SELECT * FROM publish_jobs WHERE state NOT IN ('success','failed') ORDER BY datetime(created_at) DESC LIMIT 1")
      .get() as PublishJobRow | undefined;
  },

  async updatePublishJob(id, patch) {
    const keys = Object.keys(patch) as (keyof typeof patch)[];
    if (keys.length === 0) return;
    const sets = keys.map((k) => `${k} = @${k}`).join(", ");
    db.prepare(`UPDATE publish_jobs SET ${sets}, updated_at = datetime('now') WHERE id = @id`).run({ ...patch, id });
  },
};

export default backend;
