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

/** 改善案の状態: 提案済み → 承認（この案で作る） → 投稿済み。見送りは rejected */
export type ProposalStatus = "proposed" | "approved" | "posted" | "rejected";

export interface ProposalBatchRow {
  id: string;
  /** 生成時に読み込んだ実績データのJSON（広告・投稿・フォロワー） */
  source_json: string;
  /** AIによる今週の実績の読み（傾向、1段落） */
  summary: string;
  /** 現状の課題（string[] のJSON） */
  issues_json: string | null;
  /** 対策の指針（{theme: string[], shoot: string[], caption: string[]} のJSON） */
  guidelines_json: string | null;
  created_at: string;
}

export interface ProposalRow {
  id: number;
  batch_id: string;
  title: string;
  genre: string;
  /** 投稿のフック方向（キャプション生成に渡す狙い） */
  hook: string;
  /** 素材の撮り方・見せ方の指示 */
  shoot: string;
  /** 改善理由（なぜこの案か） */
  reason: string;
  /** 根拠となった数値 */
  evidence: string;
  status: ProposalStatus;
  history_id: number | null;
  created_at: string;
  updated_at: string;
}

export interface DbBackend {
  createProposalBatch(row: Omit<ProposalBatchRow, "created_at">): Promise<ProposalBatchRow>;
  insertProposals(
    rows: Omit<ProposalRow, "id" | "status" | "history_id" | "created_at" | "updated_at">[]
  ): Promise<ProposalRow[]>;
  listProposalBatches(limit?: number): Promise<ProposalBatchRow[]>;
  listProposals(limit?: number): Promise<ProposalRow[]>;
  getProposal(id: number): Promise<ProposalRow | undefined>;
  updateProposal(id: number, patch: { status?: ProposalStatus; history_id?: number | null }): Promise<void>;

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
