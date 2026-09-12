// 要件定義書 v2.0 §5・§7-3・§8 に対応する型定義

export type CriteriaItem = {
  itemId: string;
  name: string;
  maxPoints: number;
  criteria: string[]; // 基準文（原文、複数可）
  guide: string; // 採点目安
  checkpoints: string[]; // 確認観点
};

export type CriteriaSet = {
  setId: string;
  version: number;
  name: string;
  totalPoints: number;
  scoreStep: number;
  notice: string;
  items: CriteriaItem[];
  createdAt: string;
  updatedAt: string;
};

export type PageTextStatus = "text" | "ocr" | "image_only";

export type ParsedPage = {
  pageId: string; // サーバー付与の固定ID（例: p01）
  pageNumber: number; // 1始まり
  text: string; // 抽出テキスト（OCR含む）
  textStatus: PageTextStatus;
  image: string; // data:image/jpeg;base64,...
  width: number;
  height: number;
};

export type ParsedDocument = {
  fileName: string;
  fileSize: number;
  fileHash: string; // sha256 hex
  pageCount: number;
  pages: ParsedPage[];
};

// AI の判定区分（§6-4）
export type ItemJudgement = "confirmed" | "insufficient" | "unreadable";
export type EvidenceType = "quote" | "figure";
export type EvidenceStatus = "recorded" | "insufficient" | "unreadable";
export type DocumentStatus = "ok" | "not_a_proposal" | "empty";

export type Evidence = {
  pageId: string;
  type: EvidenceType;
  text: string; // 引用（quote）または図表の内容説明（figure）
};

// AI から返る生の項目結果（総合点は含まない §7-3）
export type AiItemResult = {
  itemId: string;
  judgement: ItemJudgement;
  score: number | null;
  reason: string;
  evidence: Evidence[];
  strengths: string[];
  gaps: string[];
  suggestions: string[];
  evidenceStatus: EvidenceStatus;
};

export type PriorityImprovement = {
  rank: number;
  itemId: string;
  targetPageId: string | null; // null の場合は「追加ページ」
  change: string;
  reason: string;
  infoToConfirm: string;
};

export type AiEvaluationOutput = {
  documentStatus: DocumentStatus;
  unreadablePageIds: string[];
  overallComment: string;
  items: AiItemResult[];
  priorityImprovements: PriorityImprovement[];
};

// アプリ側検証後の項目結果
export type HoldReason =
  | "unreadable"
  | "evidence_page_missing"
  | "quote_unverified"
  | "not_a_proposal";

export type VerifiedEvidence = Evidence & { pageNumber: number | null; verified: boolean };

export type ItemResult = Omit<AiItemResult, "evidence"> & {
  name: string;
  maxPoints: number;
  held: boolean;
  holdReason: HoldReason | null;
  holdDetail: string | null;
  evidence: VerifiedEvidence[];
};

export type Usage = {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  estimatedCostUsd: number | null; // 単価未登録モデルは null
  pricingNote: string;
};

export type Evaluation = {
  evaluationId: string;
  kind: "ai"; // 段階1は AI 参考評価のみ
  criteriaSetId: string;
  criteriaVersion: number;
  criteriaName: string;
  notice: string;
  provider: string;
  modelId: string;
  modelSettings: Record<string, string | number | boolean>;
  documentStatus: DocumentStatus;
  unreadablePageIds: string[];
  pageReading: { pageId: string; pageNumber: number; textStatus: PageTextStatus }[];
  items: ItemResult[];
  hasHold: boolean;
  totalScore: number | null; // 保留があれば null
  scoredSubtotal: number; // 採点済み項目の小計
  scoredMaxSubtotal: number; // 採点済み項目の配点合計
  totalPoints: number;
  overallComment: string;
  priorityImprovements: PriorityImprovement[];
  usage: Usage;
  createdAt: string;
};

export type ScorePage = Pick<ParsedPage, "pageId" | "pageNumber" | "text" | "textStatus" | "image">;

export type ScoreRequest = {
  criteriaSetId: string;
  criteriaVersion: number;
  pages: ScorePage[];
  fileHash: string;
};

export type ScoreResponse =
  | { ok: true; evaluation: Evaluation }
  | { ok: false; error: string; code: string; detail?: string };

export type AnalyzeResponse =
  | { ok: true; document: ParsedDocument }
  | { ok: false; error: string; code: string };

export type ServerConfig = {
  provider: string;
  modelId: string;
  imageDetail: string;
  ocrEnabled: boolean;
  usage: { totalCostUsd: number; totalRuns: number; limitUsd: number | null; limitReached: boolean };
  limits: { maxFileBytes: number; maxPages: number };
};
