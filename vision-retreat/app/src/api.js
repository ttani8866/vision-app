// Claude API クライアント（プロキシ経由）
// プロキシエンドポイント: /api/messages → https://api.anthropic.com/v1/messages
// APIキー未設定時は proposeGoals / generateImagePrompt が組み込み雛形にフォールバック

import {
  DOMAINS,
  STRENGTH_SURVEY_TOTAL,
  GIFT_BASE,
  GIFT_CAP,
  RISK_FLOOR
} from './data.js'
import {
  composeImagePrompt,
  composeUnifiedImagePrompt,
  composeVisionCommentary
} from './imagePrompt.js'

const MODEL = 'claude-sonnet-4-20250514'

/** true のとき API を呼ばず、即ローカル雛形のみ（合宿オフライン用） */
const GOALS_OFFLINE_ONLY =
  import.meta.env.VITE_SKIP_ANTHROPIC === '1' ||
  import.meta.env.VITE_SKIP_ANTHROPIC === 'true'

async function callClaude(prompt, maxTokens = 2000) {
  const res = await fetch('/api/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: maxTokens,
      messages: [{ role: 'user', content: prompt }]
    })
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`API error ${res.status}: ${text.slice(0, 200)}`)
  }
  const json = await res.json()
  const content = json?.content?.[0]?.text || ''
  if (!content) throw new Error('空のレスポンスを受信しました')
  return content
}

function extractJson(text) {
  const codeMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  const candidate = codeMatch ? codeMatch[1] : text
  const first = candidate.indexOf('{')
  const last = candidate.lastIndexOf('}')
  if (first === -1 || last === -1) throw new Error('JSONが見つかりません')
  return JSON.parse(candidate.slice(first, last + 1))
}

/** API不通時：強み・メモからワクワク系の具体目標雛形（編集前提） */
function buildFallbackGoalResults({ topLabel, topTraits, secondDomain, goals, giftScores }) {
  const secondLabel = DOMAINS[secondDomain]?.label || ''
  const y = new Date().getFullYear() + 1
  const biz = (goals?.biz || '').trim()
  const ppl = (goals?.ppl || '').trim()
  const self = (goals?.self || '').trim()
  const combo =
    secondLabel && secondLabel !== topLabel
      ? `「${topLabel}」と「${secondLabel}」を同じ年に両立させる`
      : `「${topLabel}」を前面に出す`

  const bizNote = biz
    ? ` あなたの事業メモ「${biz.slice(0, 90)}${biz.length > 90 ? '…' : ''}」を中核に据えている。`
    : ''
  const pplNote = ppl
    ? ` あなたの人のメモ「${ppl.slice(0, 90)}${ppl.length > 90 ? '…' : ''}」を盛り込んでいる。`
    : ''
  const selfNote = self
    ? ` あなたの個人メモ「${self.slice(0, 90)}${self.length > 90 ? '…' : ''}」に直結させている。`
    : ''

  const hi = Math.max(
    giftScores?.executing ?? GIFT_BASE,
    giftScores?.influencing ?? GIFT_BASE,
    giftScores?.relationship ?? GIFT_BASE,
    giftScores?.thinking ?? GIFT_BASE
  )
  const energy =
    hi >= 85
      ? '今回のプロファイルでは親和が高く出ている。'
      : '設問上の親和に関わらず、次の目標は行動の設計次第で十分に伸ばせる。'

  return [
    {
      category: '事業',
      goals: [
        {
          title: '戦略',
          desc: `${y}年12月までに、${combo}、中期の「勝ちパターン」を3つに絞り、四半期ごとにレビューしている。${bizNote}${energy}`,
          strength_note: `${topLabel}（${topTraits}）を、繰り返し取りにいくポートフォリオに落とし込む。`
        },
        {
          title: '組織・人材',
          desc: `${y}年9月までに、${topLabel}が組織の「標準動作」になる仕組み（週次の型・権限・評価の一貫性）を1本化している。`,
          strength_note: `強みを個人技で終わらせず、チームの再現性に変える。`
        },
        {
          title: '財務・単位経済',
          desc: `${y}年12月までに、主力事業の単位経済の解像度を上げ、投資と撤退の判断基準を経営会議で固定している。`,
          strength_note: `${topLabel}を、数字の言語で説明できる状態に近づける。`
        },
        {
          title: 'イノベーション',
          desc: `${y}年6月までに、小さな実験を四半期で最低3サイクル回し、学びを次の打ち手に反映する型が回っている。`,
          strength_note: `不確実性のなかでも前に進める推進力を、検証のテンポに変換する。`
        }
      ]
    },
    {
      category: '人',
      goals: [
        {
          title: '家族',
          desc: `${y}年12月までに、家族との「月1の特別な時間」をカレンダー優先で確保し、仕事の緊急度に負けない運用にしている。${pplNote}`,
          strength_note: `経営者のエネルギー源を、関係の質で担保する。`
        },
        {
          title: '友人・仲間',
          desc: `${y}年12月までに、本音で壁打ちできる同格の仲間が5人以上いるコミュニティに参加または主催している。`,
          strength_note: `${topLabel}を磨くには、同じ熱量のフィードバックが効く。`
        },
        {
          title: 'メンター',
          desc: `${y}年6月までに、自分が学び続けるメンター関係を2本（事業・人生）持ち、四半期ごとに深い対話をしている。`,
          strength_note: `視野の更新が、意思決定の精度を上げる。`
        },
        {
          title: 'コミュニティ',
          desc: `${y}年12月までに、業界または地域で「名前が浮かぶ立場」になる貢献（登壇・後進支援・共創）を四半期1回以上している。`,
          strength_note: `${secondLabel || topLabel}を、関係資本として積み上げる。`
        }
      ]
    },
    {
      category: '個人',
      goals: [
        {
          title: '健康',
          desc: `${y}年12月までに、${self ? `${self}という目標に向け、` : ''}週次のトレーニング・睡眠・栄養の「型」が週5日以上守れている。${selfNote}`,
          strength_note: `体力は、実行力と判断力の土台。`
        },
        {
          title: '教養',
          desc: `${y}年12月までに、経営に効く読書または学習を月2単位で継続し、学びを事業の打ち手に1本は接続している。`,
          strength_note: `${topLabel}を、知の更新で陳腐化させない。`
        },
        {
          title: '財産',
          desc: `${y}年12月までに、事業・個人のキャッシュフローとリスク許容を四半期レビューし、次の10年の安全域を数字で把握している。`,
          strength_note: `安心域が広がるほど、攻めの意思決定が速くなる。`
        },
        {
          title: '趣味・ライフスタイル',
          desc: `${y}年12月までに、仕事以外で没頭できる趣味を週1以上確保し、創造性と回復の両方を取り戻している。`,
          strength_note: `余白が、戦略のひらめきを増やす。`
        }
      ]
    }
  ]
}

// 旧フォールバックは内蔵コンポーザ（imagePrompt.js）に集約。

function buildProposeGoalsPrompt({ topDomain, topLabel, topTraits, secondDomain, scores, giftScores, riskPenalty, goals }) {
  const g = giftScores || {}
  const rp = riskPenalty || {}
  const riskLine = `設問による減点の累計（素点に加算する負の値。未該当は0）: 実行力${rp.executing ?? 0}, 影響力${rp.influencing ?? 0}, 人間関係${rp.relationship ?? 0}, 戦略的思考${rp.thinking ?? 0}`
  return `あなたは経営者のビジョン設計の専門家であり、ストレングスファインダーに精通したコーチです。

以下の経営者の「ギフト（才能）の親和」と「ざっくりした夢・目標」を元に、その人の強みを最大限に活かした、具体的でワクワクする目標を提案してください。

【アンケート結果（因果を示すものではない）】
クリックが最も多かったラベル（便宜上TOP）: ${topDomain}（${topLabel}）
代表資質: ${topTraits}
2番目に多かったラベル: ${secondDomain}
※「実行を選んだから戦略が弱い」等の関係はこのデータには含まれない。各領域のカウントは独立。

領域別スコア（減点反映後の最終値。各軸の素点は独立。${GIFT_BASE}＝そのラベルが出た設問で一度も選ばず、${GIFT_CAP}＝出た設問すべてでそのラベルを選んだ重み。素点の式: ${GIFT_BASE}+${GIFT_CAP - GIFT_BASE}×(実際の重み÷その軸の満点重み)。他軸の選択で素点は下がらない。その後設問ルールで指定軸に減点し、${RISK_FLOOR}〜${GIFT_CAP}に丸める。回答画面では減点対象を色分けしない）:
実行力${g.executing ?? '—'}点, 影響力${g.influencing ?? '—'}点, 人間関係構築力${g.relationship ?? '—'}点, 戦略的思考力${g.thinking ?? '—'}点

${riskLine}

重み付き選択の内訳（各回答で選んだラベルの領域にだけ加算。素点計算前の生カウント）: 実行力${scores.executing}, 影響力${scores.influencing}, 人間関係構築力${scores.relationship}, 戦略的思考力${scores.thinking}（全${STRENGTH_SURVEY_TOTAL}問構成）

【事業の夢・目標（ざっくり）】
${goals.biz || '未記入'}
参考小項目: 戦略、組織人材、財務、イノベーション、アイデア

【人の夢・目標（ざっくり）】
${goals.ppl || '未記入'}
参考小項目: 家族、友人、仲間、メンター、コミュニティ

【個人の夢・目標（ざっくり）】
${goals.self || '未記入'}
参考小項目: 健康、教養、財産、趣味、ライフスタイル

【出力ルール】
各目標は「20XX年XX月までに、〜している」の形式で1〜2文
TOPラベルに沿った目標を多めに含める（例: 実行のラベルが多ければ「やり遂げる」系も。ただし他領域が弱いという解釈は禁止。戦略のラベルが少なくても戦略目標を禁止しない）
未記入でも強みから推測して提案する
各領域3〜4個、合計10〜12個
各目標に、なぜその強みを活かせるかの一言コメントを添える
ユーザーのメモ（事業・人・個人）に具体的な固有名詞や数値があれば、目標文に必ず取り込み、ワクワク感を高めること
JSON形式のみ出力。前置き・解説は一切不要:
{"results":[{"category":"事業","goals":[{"title":"小項目名","desc":"目標文","strength_note":"強みとの関連一言"}]},{"category":"人","goals":[...]},{"category":"個人","goals":[...]}]}`
}

/**
 * @returns {{ results: Array, source: 'api' | 'local', localReason?: 'skip' | 'error' }}
 */
export async function proposeGoals(params) {
  if (GOALS_OFFLINE_ONLY) {
    return {
      results: buildFallbackGoalResults(params),
      source: 'local',
      localReason: 'skip'
    }
  }
  const prompt = buildProposeGoalsPrompt(params)
  try {
    const text = await callClaude(prompt, 2000)
    const data = extractJson(text)
    if (!Array.isArray(data.results)) throw new Error('results 配列がありません')
    return { results: data.results, source: 'api' }
  } catch {
    return {
      results: buildFallbackGoalResults(params),
      source: 'local',
      localReason: 'error'
    }
  }
}

/**
 * 単一GOAL用画像プロンプト（後方互換）。Claude API は使わず内蔵コンポーザ。
 */
export async function generateImagePrompt(params) {
  return composeImagePrompt(params)
}

/**
 * 全GOALを集約した1枚絵プロンプト。proposed（カテゴリ別GOAL配列）を1シーンに織り込む。
 */
export async function generateUnifiedImagePrompt(params) {
  return composeUnifiedImagePrompt(params)
}

/**
 * ビジョンカードに添える日本語解説（「統合されたエネルギー場」narrative）を生成。
 */
export async function generateVisionCommentary(params) {
  return composeVisionCommentary(params)
}
