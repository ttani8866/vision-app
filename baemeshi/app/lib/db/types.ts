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
  /** 投稿素材の公開URL配列のJSON（履歴一覧のサムネイル表示用） */
  media_urls_json: string | null;
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

export type PublishJobState = "waiting_children" | "waiting_parent" | "success" | "failed";

export interface PublishJobRow {
  id: string;
  state: PublishJobState;
  /** PublishInput のJSON（target/media/caption/storeName/解決済み絶対URL） */
  payload_json: string;
  /** カルーセル子コンテナID配列のJSON。単体投稿ではnull */
  child_ids_json: string | null;
  /** 単体投稿のコンテナID、またはカルーセル親コンテナID */
  parent_container_id: string | null;
  media_id: string | null;
  permalink: string | null;
  error_message: string | null;
  history_id: number | null;
  created_at: string;
  updated_at: string;
}

export interface DbBackend {
  insertPostHistory(row: Omit<PostHistoryRow, "id" | "created_at">): Promise<PostHistoryRow>;
  getHistoryById(id: number): Promise<PostHistoryRow | undefined>;
  listPostHistory(limit?: number): Promise<PostHistoryRow[]>;
  deletePostHistory(id: number): Promise<boolean>;
  msSinceLastSuccessfulPost(): Promise<number | null>;

  getPostReport(historyId: number): Promise<PostReportRow | undefined>;
  upsertPostReport(row: Omit<PostReportRow, "generated_at">): Promise<PostReportRow>;

  createPublishJob(row: Pick<PublishJobRow, "id" | "state" | "payload_json" | "child_ids_json" | "parent_container_id">): Promise<PublishJobRow>;
  getPublishJob(id: string): Promise<PublishJobRow | undefined>;
  getRunningPublishJob(): Promise<PublishJobRow | undefined>;
  updatePublishJob(
    id: string,
    patch: Partial<Pick<PublishJobRow, "state" | "child_ids_json" | "parent_container_id" | "media_id" | "permalink" | "error_message" | "history_id">>
  ): Promise<void>;
}
