import { neon } from "@neondatabase/serverless";
import type { DbBackend, PostHistoryRow, PostReportRow, PublishJobRow } from "./types";

const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
if (!url) throw new Error("DATABASE_URL / POSTGRES_URL が設定されていません");
const sql = neon(url);

let schemaReady: Promise<void> | null = null;

function ensureSchema(): Promise<void> {
  schemaReady ??= (async () => {
    await sql`
      CREATE TABLE IF NOT EXISTS post_history (
        id SERIAL PRIMARY KEY,
        posted_at TEXT NOT NULL,
        store_name TEXT NOT NULL,
        media_type TEXT NOT NULL CHECK (media_type IN ('image', 'reel', 'feed_video', 'carousel')),
        media_count INTEGER NOT NULL DEFAULT 1,
        status TEXT NOT NULL CHECK (status IN ('success', 'failed', 'dry_run')),
        media_id TEXT,
        permalink TEXT,
        error_message TEXT,
        caption TEXT,
        media_urls_json TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )`;
    await sql`ALTER TABLE post_history ADD COLUMN IF NOT EXISTS media_urls_json TEXT`;
    await sql`
      CREATE TABLE IF NOT EXISTS post_reports (
        history_id INTEGER PRIMARY KEY,
        media_id TEXT NOT NULL,
        metrics_json TEXT NOT NULL,
        seika TEXT NOT NULL,
        kadai TEXT NOT NULL,
        taisaku TEXT NOT NULL,
        generated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )`;
    await sql`
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
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )`;
  })();
  return schemaReady;
}

function toHistoryRow(r: Record<string, unknown>): PostHistoryRow {
  return { ...(r as unknown as PostHistoryRow), created_at: String(r.created_at) };
}

const backend: DbBackend = {
  async insertPostHistory(row) {
    await ensureSchema();
    const rows = await sql`
      INSERT INTO post_history (posted_at, store_name, media_type, media_count, status, media_id, permalink, error_message, caption, media_urls_json)
      VALUES (${row.posted_at}, ${row.store_name}, ${row.media_type}, ${row.media_count}, ${row.status},
              ${row.media_id}, ${row.permalink}, ${row.error_message}, ${row.caption}, ${row.media_urls_json})
      RETURNING *`;
    return toHistoryRow(rows[0]);
  },

  async deletePostHistory(id) {
    await ensureSchema();
    await sql`DELETE FROM post_reports WHERE history_id = ${id}`;
    const rows = await sql`DELETE FROM post_history WHERE id = ${id} RETURNING id`;
    return rows.length > 0;
  },

  async getHistoryById(id) {
    await ensureSchema();
    const rows = await sql`SELECT * FROM post_history WHERE id = ${id}`;
    return rows[0] ? toHistoryRow(rows[0]) : undefined;
  },

  async listPostHistory(limit = 50) {
    await ensureSchema();
    const rows = await sql`SELECT * FROM post_history ORDER BY posted_at DESC LIMIT ${limit}`;
    return rows.map(toHistoryRow);
  },

  async msSinceLastSuccessfulPost() {
    await ensureSchema();
    const rows = await sql`SELECT posted_at FROM post_history WHERE status = 'success' ORDER BY posted_at DESC LIMIT 1`;
    if (!rows[0]) return null;
    return Date.now() - new Date(String(rows[0].posted_at)).getTime();
  },

  async getPostReport(historyId) {
    await ensureSchema();
    const rows = await sql`SELECT * FROM post_reports WHERE history_id = ${historyId}`;
    return rows[0] ? ({ ...rows[0], generated_at: String(rows[0].generated_at) } as PostReportRow) : undefined;
  },

  async upsertPostReport(row) {
    await ensureSchema();
    await sql`
      INSERT INTO post_reports (history_id, media_id, metrics_json, seika, kadai, taisaku, generated_at)
      VALUES (${row.history_id}, ${row.media_id}, ${row.metrics_json}, ${row.seika}, ${row.kadai}, ${row.taisaku}, now())
      ON CONFLICT(history_id) DO UPDATE SET
        media_id = EXCLUDED.media_id,
        metrics_json = EXCLUDED.metrics_json,
        seika = EXCLUDED.seika,
        kadai = EXCLUDED.kadai,
        taisaku = EXCLUDED.taisaku,
        generated_at = now()`;
    return (await backend.getPostReport(row.history_id))!;
  },

  async createPublishJob(row) {
    await ensureSchema();
    await sql`
      INSERT INTO publish_jobs (id, state, payload_json, child_ids_json, parent_container_id)
      VALUES (${row.id}, ${row.state}, ${row.payload_json}, ${row.child_ids_json}, ${row.parent_container_id})`;
    return (await backend.getPublishJob(row.id))!;
  },

  async getPublishJob(id) {
    await ensureSchema();
    const rows = await sql`SELECT * FROM publish_jobs WHERE id = ${id}`;
    if (!rows[0]) return undefined;
    return { ...rows[0], created_at: String(rows[0].created_at), updated_at: String(rows[0].updated_at) } as PublishJobRow;
  },

  async getRunningPublishJob() {
    await ensureSchema();
    const rows = await sql`
      SELECT * FROM publish_jobs WHERE state NOT IN ('success','failed') ORDER BY created_at DESC LIMIT 1`;
    if (!rows[0]) return undefined;
    return { ...rows[0], created_at: String(rows[0].created_at), updated_at: String(rows[0].updated_at) } as PublishJobRow;
  },

  async updatePublishJob(id, patch) {
    await ensureSchema();
    // 対象カラムが限定されているため個別に組み立てる
    const p = patch;
    await sql`
      UPDATE publish_jobs SET
        state = COALESCE(${p.state ?? null}, state),
        child_ids_json = COALESCE(${p.child_ids_json ?? null}, child_ids_json),
        parent_container_id = COALESCE(${p.parent_container_id ?? null}, parent_container_id),
        media_id = COALESCE(${p.media_id ?? null}, media_id),
        permalink = COALESCE(${p.permalink ?? null}, permalink),
        error_message = COALESCE(${p.error_message ?? null}, error_message),
        history_id = COALESCE(${p.history_id ?? null}, history_id),
        updated_at = now()
      WHERE id = ${id}`;
  },
};

export default backend;
