import type { PrismSkill } from "@/lib/types";

/* 出典：takahiro-kpr/kpr-prism（plugin.json v1.0.1 / kpr-prism/README.md）
   プロトタイプの「7エージェント構成 PRISM-01〜07」は実体と一致しないため、
   コマンド1本 + PRWorks 13スキルの実構成に差し替えた。 */

export const PRISM_VERSION = "v1.0.1";

export const PRISM_COMMAND: PrismSkill = {
  id: "/kpr-prism",
  label: "提案の骨子作成",
};

/** 企画3スキル（分析 → 作成 → 検証） */
export const PRISM_PLANNING: PrismSkill[] = [
  { id: "prworks-kikaku-bunseki", label: "企画分析" },
  { id: "prworks-kikakusho-sakusei", label: "企画書作成" },
  { id: "prworks-newsvalue-kensho", label: "ニュースバリュー検証" },
];

/** 実務展開10スキル（報告書は分析 → 作成の2段構え） */
export const PRISM_PRACTICE: PrismSkill[] = [
  { id: "prworks-pressrelease", label: "プレスリリース" },
  { id: "prworks-newsletter", label: "ニュースレター" },
  { id: "prworks-annaijo", label: "取材案内状" },
  { id: "prworks-medialist", label: "メディアリスト" },
  { id: "prworks-mediapromote", label: "メディアプロモート" },
  { id: "prworks-daihon", label: "進行台本" },
  { id: "prworks-unei-manual", label: "運営マニュアル" },
  { id: "prworks-factbook", label: "ファクトブック" },
  { id: "prworks-houkokusho-bunseki", label: "報告書分析" },
  { id: "prworks-houkokusho-sakusei", label: "報告書作成" },
];

export const PRISM_SKILL_COUNT = PRISM_PLANNING.length + PRISM_PRACTICE.length;
