import type { Agent, ShintoRow, StatusKind } from "@/lib/types";

/** レイヤー5の専門CXO。表示順は原設計のまま */
export const CXO_IDS = ["rin", "kai", "shu", "cho", "jin", "sen", "ryu"] as const;

export const CXO_POSTS: Record<string, string> = {
  rin: "CFO", kai: "CGO", shu: "CTO", cho: "CTrO",
  jin: "CHRO", sen: "CMO", ryu: "CCO",
};

export const CXO_AREAS: Record<string, string> = {
  rin: "財務・連結分析",
  kai: "営業・成長戦略",
  shu: "技術・AI基盤",
  cho: "組織変革・DX推進",
  jin: "人事・採用・組織",
  sen: "マーケティング戦略",
  ryu: "クリエイティブ統括",
};

export const AGENTS: Record<string, Agent> = {
  ceo: {
    id: "ceo",
    name: "テツ",
    title: "CEO · レイヤー1",
    status: "na",
    statusLabel: "—",
    role: "最終意思決定 · エージェント設計品質チェック",
    note: "窓口は2本：KANBEI（経営判断・戦略相談）/ IRIS（日常業務・連絡系）。GENとの直接連絡は可能だが例外的。",
  },
  kanbei: {
    id: "kanbei",
    name: "KANBEI",
    title: "参謀 · 会長室長 · レイヤー2",
    status: "auto",
    statusLabel: "自動実行中",
    role: "テツさんの相談を受けて論点整理・振り分け判断 · GENへの指示伝達 · CXO単独召集の判断と連絡 · VisionX読み取り・経営戦略アドバイス · 週次ブリーフィング生成（毎週月曜8:00自動）· 議事録パイプライン読み取り・意思決定ログ管理",
    note: "課題1対応：前週の未対応アクションを冒頭に再掲、#action-logを毎週読み込んで引き継ぎ。課題2対応：ブリーフィング前に#iris-weeklyを読み込みA/B/Cの3段階でジャッジして反映。ルーティング基準：GEN召集＝複数領域またぐ案件・実行指示が必要な案件／CXO単独＝領域が1つ・情報収集や分析のみ。未召集CXOを週次ブリーフィングで能動的に提案。",
  },
  iris: {
    id: "iris",
    name: "IRIS",
    title: "COS · 広報秘書 · レイヤー3（独立系）",
    status: "async",
    statusLabel: "Discord非同期",
    role: "対外広報 · メール · Moltbook · Discord報告 · テツさんへの日常業務・連絡系窓口",
    note: "基盤：OpenClaw / Discord独立稼働（Claude Codeとは別系統）。課題2対応：毎週日曜22:00に#iris-weeklyへ週次サマリーを投稿、緊急性の高い情報は随時追加投稿、投稿後#generalに通知。KANBEIへの情報フローはDiscord経由・非同期（投稿→読み取り方式）。",
  },
  gen: {
    id: "gen",
    name: "GEN",
    title: "COO · 執行統括 · レイヤー4",
    status: "manual",
    statusLabel: "手動トリガー",
    role: "KANBEIからの指示を受けて各CXOへ連絡・指示 · CXO群のアウトプットを統合してテツさんへ提示 · 複数CXOをまたぐ案件の実行管理",
    note: "稼働：手動トリガー（KANBEIからの召集）。",
  },
  rin: {
    id: "rin", name: "RIN", title: "CFO · レイヤー5",
    status: "auto", statusLabel: "自動実行中",
    role: "財務・連結分析",
    cond: "数字確認・試算・財務分析が必要なとき",
    note: "経営数字パイプライン読み取り担当（なべさんと実装相談）。",
  },
  kai: {
    id: "kai", name: "KAI", title: "CGO · レイヤー5",
    status: "manual", statusLabel: "手動トリガー",
    role: "営業・成長戦略",
    cond: "新規商談・営業戦略・成長施策を単体で検討するとき",
    note: "GEN統括。",
  },
  shu: {
    id: "shu", name: "SHU", title: "CTO · レイヤー5",
    status: "manual", statusLabel: "手動トリガー",
    role: "技術・AI基盤",
    cond: "技術判断・AI基盤・システム選定が必要なとき",
    note: "GEN統括。",
  },
  cho: {
    id: "cho", name: "CHO", title: "CTrO · レイヤー5",
    status: "manual", statusLabel: "手動トリガー",
    role: "組織変革・DX推進",
    cond: "組織変革・DX推進施策を単体で議論するとき",
    note: "GEN統括。",
  },
  jin: {
    id: "jin", name: "JIN", title: "CHRO · レイヤー5",
    status: "manual", statusLabel: "手動トリガー",
    role: "人事・採用・組織",
    cond: "採用・人事・組織設計の判断が必要なとき",
    note: "GEN統括。",
  },
  sen: {
    id: "sen", name: "SEN", title: "CMO · レイヤー5",
    status: "manual", statusLabel: "手動トリガー",
    role: "マーケティング戦略",
    cond: "マーケ戦略・キャンペーン設計を単体で検討するとき",
    note: "GEN統括。",
  },
  ryu: {
    id: "ryu", name: "RYU", title: "CCO · レイヤー5",
    status: "manual", statusLabel: "手動トリガー",
    role: "クリエイティブ統括",
    cond: "クリエイティブの方向性・表現判断が必要なとき",
    note: "GEN統括。",
  },
  prism: {
    id: "prism",
    name: "Prism",
    title: "KPR専用チーム · レイヤー6",
    status: "manual",
    statusLabel: "手動",
    role: "PR戦略 · メディアリレーション · KPR-AgentOS",
    note: "実体はClaude Codeプラグイン kpr-prism v1.0.1。/kpr-prism コマンド1本とPRWorks 13スキル（企画3・実務展開10）で構成。SHINTOと二系統並行・統合ビューなし（Agent Gateway設計確定後に対応）。",
  },
};

/** SHINTOタブの行。KANBEI → GEN → CXO7体の順 */
export const SHINTO_ROWS: ShintoRow[] = [
  { id: "kanbei", desc: "ルーティング · VisionX · 週次ブリーフィング · 意思決定ログ", trigger: "月曜8:00 自動" },
  { id: "gen", desc: "CXO連絡・指示 · アウトプット統合 · 実行管理", trigger: "KANBEI召集" },
  ...CXO_IDS.map((id) => ({
    id,
    desc: CXO_AREAS[id] + " ｜ 召集条件：" + AGENTS[id].cond,
    trigger: id === "rin" ? "自動 + 召集" : "単独召集",
  })),
].map((r) => ({
  id: r.id,
  name: AGENTS[r.id].name,
  post: AGENTS[r.id].title.split(" · レイヤー")[0],
  desc: r.desc,
  trigger: r.trigger,
  status: AGENTS[r.id].status as StatusKind,
}));
