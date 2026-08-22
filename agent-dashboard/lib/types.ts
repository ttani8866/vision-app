/** 稼働ステータス。凡例の4種と一致する。 */
export type AgentStatus = "auto" | "manual" | "async" | "idle";

/** ステータスを持たない対象（人）を表す。CEOカードのみ。 */
export type StatusKind = AgentStatus | "na";

export interface Agent {
  id: string;
  name: string;
  /** 「参謀 · 会長室長 · レイヤー2」 */
  title: string;
  status: StatusKind;
  /** 画面に出す状態ラベル。「自動実行中」「—」など */
  statusLabel: string;
  role: string;
  /** 単独召集の条件。CXO7体のみ持つ */
  cond?: string;
  note: string;
}

export interface ShintoRow {
  id: string;
  name: string;
  post: string;
  desc: string;
  trigger: string;
  status: StatusKind;
}

export interface PrismSkill {
  id: string;
  label: string;
}

export interface PendingItem {
  no: string;
  title: string;
  body: string;
}
