import path from "path";
import { mkdirSync } from "fs";
import Database from "better-sqlite3";
import type { DbBackend, PostHistoryRow, PostReportRow, ProposalBatchRow, ProposalRow, PublishJobRow } from "./types";

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

  CREATE TABLE IF NOT EXISTS proposal_batches (
    id TEXT PRIMARY KEY,
    source_json TEXT NOT NULL,
    summary TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS proposals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    batch_id TEXT NOT NULL,
    title TEXT NOT NULL,
    genre TEXT NOT NULL,
    hook TEXT NOT NULL,
    shoot TEXT NOT NULL,
    reason TEXT NOT NULL,
    evidence TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'proposed' CHECK (status IN ('proposed', 'approved', 'posted', 'rejected')),
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
if (!historyCols.some((c) => c.name === "media_urls_json")) {
  db.exec("ALTER TABLE post_history ADD COLUMN media_urls_json TEXT");
}

const backend: DbBackend = {
  async insertPostHistory(row) {
    const info = db
      .prepare(`
        INSERT INTO post_history (posted_at, store_name, media_type, media_count, status, media_id, permalink, error_message, caption, media_urls_json)
        VALUES (@posted_at, @store_name, @media_type, @media_count, @status, @media_id, @permalink, @error_message, @caption, @media_urls_json)
      `)
      .run(row);
    return db.prepare("SELECT * FROM post_history WHERE id = ?").get(info.lastInsertRowid) as PostHistoryRow;
  },

  async deletePostHistory(id) {
    db.prepare("DELETE FROM post_reports WHERE history_id = ?").run(id);
    const info = db.prepare("DELETE FROM post_history WHERE id = ?").run(id);
    return info.changes > 0;
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

  async createProposalBatch(row) {
    db.prepare("INSERT INTO proposal_batches (id, source_json, summary) VALUES (@id, @source_json, @summary)").run(row);
    return db.prepare("SELECT * FROM proposal_batches WHERE id = ?").get(row.id) as ProposalBatchRow;
  },

  async insertProposals(rows) {
    const stmt = db.prepare(`
      INSERT INTO proposals (batch_id, title, genre, hook, shoot, reason, evidence)
      VALUES (@batch_id, @title, @genre, @hook, @shoot, @reason, @evidence)
    `);
    const ids: number[] = [];
    const tx = db.transaction(() => {
      for (const r of rows) ids.push(Number(stmt.run(r).lastInsertRowid));
    });
    tx();
    return ids.map((id) => db.prepare("SELECT * FROM proposals WHERE id = ?").get(id) as ProposalRow);
  },

  async listProposalBatches(limit = 10) {
    return db
      .prepare("SELECT * FROM proposal_batches ORDER BY datetime(created_at) DESC LIMIT ?")
      .all(limit) as ProposalBatchRow[];
  },

  async listProposals(limit = 60) {
    return db.prepare("SELECT * FROM proposals ORDER BY id DESC LIMIT ?").all(limit) as ProposalRow[];
  },

  async getProposal(id) {
    return db.prepare("SELECT * FROM proposals WHERE id = ?").get(id) as ProposalRow | undefined;
  },

  async updateProposal(id, patch) {
    const sets: string[] = [];
    const params: Record<string, unknown> = { id };
    if (patch.status !== undefined) {
      sets.push("status = @status");
      params.status = patch.status;
    }
    if (patch.history_id !== undefined) {
      sets.push("history_id = @history_id");
      params.history_id = patch.history_id;
    }
    if (sets.length === 0) return;
    db.prepare(`UPDATE proposals SET ${sets.join(", ")}, updated_at = datetime('now') WHERE id = @id`).run(params);
  },
};

export default backend;
