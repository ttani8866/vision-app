import { env } from "@/lib/env";
import type { MediaMetrics } from "@/lib/instagram";

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const MODEL = process.env.BAEMESHI_CLAUDE_MODEL || "claude-sonnet-4-6";

async function callClaude(prompt: string, maxTokens = 1024): Promise<string> {
  const res = await fetch(ANTHROPIC_API_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": env.anthropicApiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: maxTokens,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  const json = await res.json();
  if (!res.ok) {
    throw new Error(`Claude API error (HTTP ${res.status}): ${JSON.stringify(json)}`);
  }

  const text = json.content
    ?.filter((block: { type: string }) => block.type === "text")
    .map((block: { text: string }) => block.text)
    .join("\n")
    .trim();

  if (!text) {
    throw new Error("Claude APIから本文を取得できませんでした");
  }
  return text;
}

export interface StoreInfo {
  name: string;
  igHandle: string;
  address: string;
  stationWalk: string;
  phone: string;
  hoursAndClosed: string;
  menu: string;
  payment: string;
  genre: "銀座老舗" | "ハレの日" | "ランチ" | "スイーツ" | "新店";
  ginzaOnlyReason: string;
}

const CAPTION_TEMPLATE = `{フック（お店の魅力を一言で伝えるキャッチーな見出し・絵文字1個まで）}

{リード文（お店と看板メニューの魅力が伝わる2〜3文）}

↓店舗詳細↓ 銀座のばえめし、毎週3本更新
💡他の投稿はこちら→ baemeshi_official
行きたいと思ったら右の「…」から保存！

【{店名}】
{公式Instagram ID}
📍{住所}
🚃{最寄駅と徒歩分数}
📞{電話番号}
🕑{営業時間・定休日}
🍽️{メニューと価格（税込）}
💳{支払方法}

{コメントをもとにした締めの文章・2〜4行}

#銀座グルメ #銀座ランチ #ばえめし #{ジャンルに応じたハッシュタグ} #{店名}`;

export async function generateCaption(store: StoreInfo, direction?: string): Promise<string> {
  const directionBlock = direction?.trim()
    ? `
今回の狙い（実績分析から出た改善案の指示）:
${direction.trim()}
{フック}と{リード文}はこの狙いに沿った切り口で書くこと。ただし狙いに合わせるために入力にない事実を足すことは禁止。
`
    : "";

  const prompt = `あなたは銀座グルメInstagramアカウント「ばえめし」（@baemeshi_official）の投稿キャプションを作成するアシスタントです。
${directionBlock}

以下のテンプレートの構造・改行・絵文字・見出しラベルを一字一句変えずに使い、{}で囲まれた項目のみを実際の店舗情報で置き換えてください。

--- テンプレート ---
${CAPTION_TEMPLATE}
--- ここまで ---

置き換えルール:
- {フック}と{リード文}は、入力された店舗情報（メニュー・ジャンル・コメント）をもとに、食欲を刺激する魅力的な文章にすること。ばえめし編集部らしい明るい口調（例:「ガッツリかぶりつきたい！」のようなトーン）。五感に訴える表現は歓迎だが、入力にない事実（受賞歴・行列・有名人来店・創業年など）の捏造は禁止
- 住所・最寄駅と徒歩分数・電話番号・営業時間定休日・メニューと価格・支払方法は、入力された内容を改変・要約せず、そのまま使うこと（事実情報の書き換え・推測禁止）
- {コメントをもとにした締めの文章}は、コメント欄の内容をベースに2〜4行の読みやすい文章に整えること（内容を捏造しない。入力にない事実を付け加えない。「銀座でしか〜」のような定型フレーズを勝手に足さない）
- {ジャンルに応じたハッシュタグ}は、ジャンル「${store.genre}」の内容が伝わる日本語ハッシュタグを1つだけ考えて入れること（例のコピーではなく、この店に合うものを選ぶこと）
- {店名}のハッシュタグは店名からスペース等を除いた形で入れること
- テンプレートの他のハッシュタグ（#銀座グルメ #銀座ランチ #ばえめし）は変更しないこと
- 出力はキャプション本文のみ。前置き・説明文・コードブロックは一切付けないこと

店舗情報:
店名: ${store.name}
公式Instagram ID: ${store.igHandle}
住所: ${store.address}
最寄駅と徒歩分数: ${store.stationWalk}
電話番号: ${store.phone}
営業時間・定休日: ${store.hoursAndClosed}
メニューと価格（税込）: ${store.menu}
支払方法: ${store.payment}
ジャンル: ${store.genre}
コメント（入力メモ）: ${store.ginzaOnlyReason}`;

  return callClaude(prompt);
}

export interface ReportCommentary {
  seika: string;
  kadai: string;
  taisaku: string;
}

/** 投稿指標をもとに、成果・課題・対策をフレンドリーな口調で生成する */
export async function generateReportCommentary(input: {
  storeName: string;
  caption: string | null;
  postedAt: string;
  mediaTypeLabel: string;
  metrics: MediaMetrics;
}): Promise<ReportCommentary> {
  const m = input.metrics;
  const metricsLines = [
    m.likeCount !== null ? `いいね: ${m.likeCount}` : null,
    m.commentsCount !== null ? `コメント: ${m.commentsCount}` : null,
    m.saved !== null ? `保存: ${m.saved}` : null,
    m.shares !== null ? `シェア: ${m.shares}` : null,
    m.reach !== null ? `リーチ: ${m.reach}` : null,
    m.views !== null ? `視聴/表示: ${m.views}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const prompt = `あなたは銀座グルメInstagramアカウント「ばえめし」の運用チームの、明るくフレンドリーな相棒AIです。
以下の投稿の実績データを見て、「成果」「課題」「対策」をそれぞれ2〜3文で書いてください。

ルール:
- 口調はフレンドリーに（です・ます調を少し崩してOK。「〜だね」「〜してみよう！」など。絵文字は各項目1個まで）
- 与えられた数値だけを根拠にすること。数値の捏造・推測の断定は禁止
- 数値が少ない場合も責めずに前向きに。対策は明日から実行できる具体的なアクションにすること
- 出力は次のJSONのみ。前置き・コードブロック禁止
{"seika": "...", "kadai": "...", "taisaku": "..."}

投稿情報:
店舗名: ${input.storeName}
投稿日: ${input.postedAt}
投稿形式: ${input.mediaTypeLabel}
キャプション冒頭: ${(input.caption ?? "").slice(0, 200) || "（なし）"}

実績データ:
${metricsLines || "（指標を取得できませんでした）"}`;

  const text = await callClaude(prompt);
  const jsonText = text.replace(/^```(json)?/m, "").replace(/```$/m, "").trim();
  try {
    const parsed = JSON.parse(jsonText);
    if (!parsed.seika || !parsed.kadai || !parsed.taisaku) throw new Error("missing keys");
    return { seika: String(parsed.seika), kadai: String(parsed.kadai), taisaku: String(parsed.taisaku) };
  } catch {
    throw new Error(`レポート生成結果のJSON解析に失敗しました: ${text.slice(0, 200)}`);
  }
}

export interface GeneratedProposal {
  title: string;
  genre: "銀座老舗" | "ハレの日" | "ランチ" | "スイーツ" | "新店";
  hook: string;
  shoot: string;
  reason: string;
  evidence: string;
}

export interface GeneratedProposalSet {
  summary: string;
  proposals: GeneratedProposal[];
}

const GENRE_LIST = ["銀座老舗", "ハレの日", "ランチ", "スイーツ", "新店"] as const;

/** 広告・投稿の実績テキストから、次の投稿の企画案3本を生成する */
export async function generateProposals(performanceText: string): Promise<GeneratedProposalSet> {
  const prompt = `あなたは銀座グルメInstagramアカウント「ばえめし」（@baemeshi_official）の運用チームの企画担当AIです。
以下の実績データを読み、「次に作る投稿の企画案」を3本出してください。目的は、フォロワー獲得（広告経由のフォロー転換）と保存・シェアの増加です。

ルール:
- 3本は互いに切り口が異なること（同じ発想の言い換えを3本並べない）
- 各案は、与えられた実績データの中の具体的な数値や投稿内容を根拠にすること。データにない数値・事実の捏造は禁止
- データが未取得の項目は根拠に使わず、取れている範囲で判断すること
- 案は「投稿アプリの店舗情報フォーム」に渡せる粒度にすること。店名は指定しない（撮影に行く店は人間が決める）。ジャンルとフック方向と撮り方を指定する
- 口調は明るくフレンドリーに（「〜してみよう！」など）。ただし数値の扱いは正確に
- 出力は次のJSONのみ。前置き・説明・コードブロック禁止

{
  "summary": "今週の実績の読み（何が効いていて何が詰まっているか）を3〜4文で",
  "proposals": [
    {
      "title": "案の名前（15字以内）",
      "genre": "${GENRE_LIST.join(" | ")} のいずれか1つ",
      "hook": "投稿のフック方向・切り口（1〜2文。キャプション生成AIへの指示として使う）",
      "shoot": "素材の撮り方・見せ方の指示（1〜2文。スマホ撮影前提。1枚目に何を置くか等）",
      "reason": "この案を選ぶ改善理由（2〜3文。何を改善するための案か）",
      "evidence": "根拠となった数値・投稿内容（1〜2文。データ内の数値をそのまま引用）"
    }
  ]
}

--- 実績データ ---
${performanceText}
--- ここまで ---`;

  const text = await callClaude(prompt, 2048);
  const jsonText = text.replace(/^```(json)?/m, "").replace(/```$/m, "").trim();
  let parsed: GeneratedProposalSet;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    throw new Error(`改善案のJSON解析に失敗しました: ${text.slice(0, 200)}`);
  }
  if (!parsed?.summary || !Array.isArray(parsed.proposals) || parsed.proposals.length === 0) {
    throw new Error("改善案の生成結果が不完全です");
  }
  parsed.proposals = parsed.proposals.slice(0, 3).map((p) => ({
    title: String(p.title ?? "").slice(0, 30),
    genre: (GENRE_LIST as readonly string[]).includes(p.genre) ? p.genre : "ランチ",
    hook: String(p.hook ?? ""),
    shoot: String(p.shoot ?? ""),
    reason: String(p.reason ?? ""),
    evidence: String(p.evidence ?? ""),
  }));
  return parsed;
}
