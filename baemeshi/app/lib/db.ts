// DBファサード: DATABASE_URL/POSTGRES_URL があれば Neon Postgres（Vercel）、なければ SQLite（ローカル）
import type { DbBackend, PostHistoryRow, PostReportRow, PublishJobRow, PublishJobState } from "./db/types";

export type { PostHistoryRow, PostReportRow, PublishJobRow, PublishJobState };

const usePostgres = Boolean(process.env.DATABASE_URL || process.env.POSTGRES_URL);

let backendPromise: Promise<DbBackend> | null = null;

function getBackend(): Promise<DbBackend> {
  backendPromise ??= (usePostgres ? import("./db/postgres") : import("./db/sqlite")).then((m) => m.default);
  return backendPromise;
}

export async function insertPostHistory(row: Omit<PostHistoryRow, "id" | "created_at">) {
  return (await getBackend()).insertPostHistory(row);
}
export async function getHistoryById(id: number) {
  return (await getBackend()).getHistoryById(id);
}
export async function listPostHistory(limit = 50) {
  return (await getBackend()).listPostHistory(limit);
}
export async function deletePostHistory(id: number) {
  return (await getBackend()).deletePostHistory(id);
}
export async function msSinceLastSuccessfulPost() {
  return (await getBackend()).msSinceLastSuccessfulPost();
}
export async function getPostReport(historyId: number) {
  return (await getBackend()).getPostReport(historyId);
}
export async function upsertPostReport(row: Omit<PostReportRow, "generated_at">) {
  return (await getBackend()).upsertPostReport(row);
}
export async function createPublishJob(
  row: Pick<PublishJobRow, "id" | "state" | "payload_json" | "child_ids_json" | "parent_container_id">
) {
  return (await getBackend()).createPublishJob(row);
}
export async function getPublishJob(id: string) {
  return (await getBackend()).getPublishJob(id);
}
export async function getRunningPublishJob() {
  return (await getBackend()).getRunningPublishJob();
}
export async function updatePublishJob(
  id: string,
  patch: Partial<
    Pick<PublishJobRow, "state" | "child_ids_json" | "parent_container_id" | "media_id" | "permalink" | "error_message" | "history_id">
  >
) {
  return (await getBackend()).updatePublishJob(id, patch);
}
