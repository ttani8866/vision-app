import type { CategoryKey, LegalNature } from "./types";

export const CATEGORIES: Record<
  CategoryKey,
  { label: string; labelEn: string; color: string }
> = {
  land: { label: "土地・区画", labelEn: "Land", color: "#D96C47" },
  tree: { label: "樹木・農園", labelEn: "Trees & Farms", color: "#7A8B3F" },
  brewing: { label: "醸造・熟成", labelEn: "Brewing & Aging", color: "#C8912E" },
  field: { label: "田畑・収穫", labelEn: "Fields & Harvest", color: "#E3B23C" },
  animal: { label: "動物", labelEn: "Animals", color: "#E2725B" },
  heritage: { label: "文化財", labelEn: "Heritage", color: "#A63A50" },
  celestial: { label: "天体・仮想", labelEn: "Celestial", color: "#2C4770" },
  digital: { label: "デジタル", labelEn: "Digital", color: "#1F8A8C" },
};

export const LEGAL_NATURE: Record<LegalNature, { label: string; note: string }> = {
  ownership: { label: "法的所有権あり", note: "法律上の所有・持分が発生する制度です" },
  usage: { label: "利用権", note: "所有権は移転せず、利用する権利を得る制度です" },
  donation: { label: "寄付", note: "寄付への返礼として関与や称号が得られる制度です" },
  symbolic: { label: "象徴的権利", note: "記念品としての権利で、法的な所有権ではありません" },
};

export const SCORE_AXES = [
  { key: "origin", label: "起源物語" },
  { key: "token", label: "所有の証" },
  { key: "time", label: "時間の物語" },
  { key: "arena", label: "語りの場" },
] as const;
