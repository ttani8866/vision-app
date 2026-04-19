// 4領域メタデータとギフト（才能）傾向サーベイ設問（重み・深掘り2〜3択あり）

export const DOMAINS = {
  executing: {
    id: 'executing',
    label: '実行力',
    color: '#22d3ee',
    traits: '達成欲・目標志向・責任感',
    summary: '決めたことを確実にやり遂げる実行者',
    detail: '物事をやり遂げる力。アレンジ、達成欲、目標志向、規律性、責任感、信念を基調とした行動力があなたの中心にある。'
  },
  influencing: {
    id: 'influencing',
    label: '影響力',
    color: '#f97316',
    traits: '指令性・自己確信・最上志向',
    summary: '人を動かし成果を最大化するリーダー',
    detail: '人を動かし主導する力。指令性、自己確信、競争性、最上志向、コミュニケーション、社交性の軸であなたは前線に立つ。'
  },
  relationship: {
    id: 'relationship',
    label: '人間関係構築力',
    color: '#10b981',
    traits: '個別化・共感性・成長促進',
    summary: '人の力を引き出し組織を強くする育成者',
    detail: '人と繋がり育てる力。成長促進、共感性、個別化、親密性、調和性、ポジティブであなたは関係の質を高める。'
  },
  thinking: {
    id: 'thinking',
    label: '戦略的思考力',
    color: '#8b5cf6',
    traits: '戦略性・未来志向・分析思考',
    summary: '未来を見通し最適解を導く構想家',
    detail: '未来を構想し分析する力。戦略性、未来志向、着想、学習欲、分析思考、内省であなたは道筋を描く。'
  }
}

export const DOMAIN_ORDER = ['executing', 'influencing', 'relationship', 'thinking']

/** 各軸の素点レンジ（リスク減点前）。未選択＝60、満点＝100 */
export const GIFT_BASE = 60
export const GIFT_CAP = 100
/** リスク減点後の下限（クランプ） */
export const RISK_FLOOR = 45

export const QUESTIONS = [
  {
    weight: 2,
    q: 'これまでのなかで、「褒められてうれしかった」とよく覚えている経験に、いちばん近いのは？（強みの原体験）',
    options: [
      { label: '期限や約束を守り切り、難しい仕事をやり遂げたと認められた', domain: 'executing' },
      { label: '人前で話したり、人を巻き込んで前に進めたと評価された', domain: 'influencing' },
      { label: '誰かを支えたり、場の空気を和らげたと感謝された', domain: 'relationship' },
      { label: '分析や構想、先を見越した提案が「よく見えている」と言われた', domain: 'thinking' }
    ]
  },
  {
    weight: 2,
    q: 'チームで最も頼りにされる場面は？',
    options: [
      { label: '期限通りに確実にやり遂げるとき', domain: 'executing' },
      { label: '周囲を説得し巻き込むとき', domain: 'influencing' },
      { label: '一人ひとりの力を引き出すとき', domain: 'relationship' },
      { label: '戦略を描き道筋を示すとき', domain: 'thinking' }
    ]
  },
  {
    weight: 2,
    q: '経営判断で最も重視することは？',
    options: [
      { label: '実現可能性と確実な実行計画', domain: 'executing' },
      { label: 'インパクトの大きさと市場での勝ち方', domain: 'influencing' },
      { label: 'チームの納得感と組織の一体感', domain: 'relationship' },
      { label: 'データと論理に基づく将来予測', domain: 'thinking' },
      { label: '長期スライドより、今期のマイルストーン達成に意識が向きやすい', domain: 'executing', risks: { thinking: -10 } }
    ]
  },
  {
    q: '部下の育成で大切にしていることは？',
    options: [
      { label: '目標を設定し、達成まで伴走する', domain: 'executing' },
      { label: '高い基準を示し、卓越を求める', domain: 'influencing' },
      { label: 'その人の個性を見抜き、強みを伸ばす', domain: 'relationship' },
      { label: '考える力を養い、自分で答えを出させる', domain: 'thinking' },
      { label: '自分の手を動かした方が品質とスピードが出る局面は、手放しにくい', domain: 'executing', risks: { relationship: -10 } }
    ]
  },
  {
    weight: 2,
    q: '困難な状況で自分が最初にすることは？',
    options: [
      { label: 'やるべきことをリストアップし、即座に動く', domain: 'executing' },
      { label: '自分が前面に立ち、方向を指し示す', domain: 'influencing' },
      { label: 'チームの声を聴き、全員の力を結集する', domain: 'relationship' },
      { label: '状況を分析し、複数のシナリオを描く', domain: 'thinking' }
    ]
  },
  {
    q: '休日にエネルギーが湧く過ごし方は？',
    options: [
      { label: '積み上げている何かを着実に進める', domain: 'executing' },
      { label: '新しい人と出会い、刺激を受ける', domain: 'influencing' },
      { label: '家族や親友とじっくり過ごす', domain: 'relationship' },
      { label: '読書や思索にふける', domain: 'thinking' }
    ]
  },
  {
    q: '5年後の自分に期待することは？',
    options: [
      { label: 'やると決めたことを全てやり遂げた自分', domain: 'executing' },
      { label: '業界に影響を与え、名前が知られる自分', domain: 'influencing' },
      { label: '信頼できる仲間に囲まれた自分', domain: 'relationship' },
      { label: '誰も見えていない未来を見通す自分', domain: 'thinking' }
    ]
  },
  {
    weight: 2,
    q: '新規プロジェクトの立ち上げで、最初に手をつけるのは？',
    options: [
      { label: 'マイルストーンと担当を決め、週次で進捗を回す', domain: 'executing' },
      { label: 'ビジョンを語り、キーパーソンを一気に巻き込む', domain: 'influencing' },
      { label: 'メンバーの得意と不安を聞き、役割を最適化する', domain: 'relationship' },
      { label: '前提・リスク・代替案を整理し、意思決定の土台を作る', domain: 'thinking' }
    ]
  },
  {
    q: '会議で自分がいちばん力を発揮するのはどんなとき？',
    options: [
      { label: '決まった論点を短時間で結論まで進める', domain: 'executing' },
      { label: '対立する意見をまとめ、合意形成をリードする', domain: 'influencing' },
      { label: '発言が少ない人にも声を求め、場を安全にする', domain: 'relationship' },
      { label: '議論を抽象化し、論点の抜けを指摘する', domain: 'thinking' }
    ]
  },
  {
    weight: 2,
    q: '顧客や取引先との関係で、自分が重視することは？',
    options: [
      { label: '約束した品質・納期を絶対に守ること', domain: 'executing' },
      { label: '自社の価値を明確に伝え、交渉の主導権を握ること', domain: 'influencing' },
      { label: '長期的な信頼と、相手の事情への配慮', domain: 'relationship' },
      { label: '相手の課題構造を整理し、最適な提案軸を描くこと', domain: 'thinking' }
    ]
  },
  {
    q: 'ミスや失敗が表面化したとき、自分がまず取る姿勢に近いのは？',
    options: [
      { label: '再発防止の手順と責任範囲を即座に固める', domain: 'executing' },
      { label: '対外的な説明方針と、組織としての姿勢を示す', domain: 'influencing' },
      { label: '関係者の感情と不安に向き合い、チームを立て直す', domain: 'relationship' },
      { label: '原因を構造的に分解し、学びを仕組みに落とす', domain: 'thinking' },
      { label: '再発防止のため、事実関係と責任分界を先に整理したい', domain: 'influencing', risks: { relationship: -6, thinking: -4 } }
    ]
  },
  {
    q: '情報が不足したまま意思決定が迫っているとき？',
    options: [
      { label: '決められる範囲だけ決め、動きながら埋める', domain: 'executing' },
      { label: '関係者を集め、判断の責任を共有し前に進める', domain: 'influencing' },
      { label: '現場の肌感と人の合意を優先して暫定決定する', domain: 'relationship' },
      { label: '仮説を列挙し、検証順と損失の上限を決める', domain: 'thinking' }
    ]
  },
  {
    q: '組織のムードが下がっていると感じたとき？',
    options: [
      { label: '小さな勝ちを積み上げ、達成体験を取り戻す', domain: 'executing' },
      { label: '自分からエネルギーを出し、方向を示して牽引する', domain: 'influencing' },
      { label: '一人ひとりと対話し、孤立を減らす', domain: 'relationship' },
      { label: '要因を冷静に整理し、構造のどこを変えるか示す', domain: 'thinking' },
      { label: 'KPIが悪いときは、まず「数字は」と聞くことが多い', domain: 'executing', risks: { relationship: -10 } }
    ]
  },
  {
    weight: 2,
    q: 'イノベーションや新しい挑戦について、自分に近いのは？',
    options: [
      { label: '試作と検証を回し、早く形にして学ぶ', domain: 'executing' },
      { label: '社内外を巻き込み、ムーブメントを起こす', domain: 'influencing' },
      { label: '多様な人の知恵をつなぎ、共創の場をつくる', domain: 'relationship' },
      { label: 'トレンドと自社資産の接点から、勝ち筋の仮説を立てる', domain: 'thinking' }
    ]
  },
  {
    weight: 2,
    q: '数字やKPIを見るとき、いちばん手応えを感じるのは？',
    options: [
      { label: '計画どおり進捗し、目標達成が見えたとき', domain: 'executing' },
      { label: 'シェアや認知が伸び、市場での存在感が増したとき', domain: 'influencing' },
      { label: 'エンゲージメントや定着など、人の指標が改善したとき', domain: 'relationship' },
      { label: '因果が読め、次の打ち手の優先度がはっきりしたとき', domain: 'thinking' }
    ]
  },
  {
    q: '後継者や次のリーダーを育てるとしたら？',
    options: [
      { label: '目標管理とフィードバックで、成果行動を定着させる', domain: 'executing' },
      { label: '人前で任せ、失敗しても背中で責任を取る経験を積ませる', domain: 'influencing' },
      { label: '価値観と強みを言語化し、自分らしいリーダーシップを探させる', domain: 'relationship' },
      { label: '判断フレームと思考の型を渡し、自律的に考えさせる', domain: 'thinking' }
    ]
  },
  {
    q: 'ストレスが高い週の終わり、自分を回復させる近い方法は？',
    options: [
      { label: '溜まったタスクを片付け、コントロール感を取り戻す', domain: 'executing' },
      { label: '人に会って話し、視野を広げる', domain: 'influencing' },
      { label: '信頼できる誰かと本音で時間を過ごす', domain: 'relationship' },
      { label: '歩きながら考えを整理し、頭の中の地図を描き直す', domain: 'thinking' }
    ]
  },
  {
    q: '自分の時間の使い方で、意識的に最優先しがちなのは？',
    options: [
      { label: '約束したアウトプットを確実に出す時間', domain: 'executing' },
      { label: '対外的な発信・交渉・営業に直結する時間', domain: 'influencing' },
      { label: '人との面談や、関係のメンテナンス', domain: 'relationship' },
      { label: '読む・考える・構想するための空白時間', domain: 'thinking' }
    ]
  },
  {
    weight: 2,
    q: '10年スパンで組織や事業を考えるとき、自分の役割に近いのは？',
    options: [
      { label: '長期計画を実行に落とし、継続的に仕組み化する', domain: 'executing' },
      { label: '業界での立ち位置とブランドを押し上げる', domain: 'influencing' },
      { label: '文化と人のつながりを資産として残す', domain: 'relationship' },
      { label: '環境変化のシナリオを描き、ポートフォリオを設計する', domain: 'thinking' }
    ]
  },
  {
    weight: 2,
    q: '物事が動き出すとき、どちらの役割にいちばん安心する？（深掘り・2択）',
    options: [
      { label: 'タスクを切ってスケジュールに落とし、回し続ける', domain: 'executing' },
      { label: '論点と前提を整理し、抜け道をなくしてから進める', domain: 'thinking' }
    ]
  },
  {
    weight: 2,
    q: '対人で頼られる場面として、いま近いのは？（深掘り・2択）',
    options: [
      { label: '場の空気を決め、背中で見せて前に進める', domain: 'influencing' },
      { label: '相手の話を深く聞き、信頼の土台を丁寧に作る', domain: 'relationship' }
    ]
  },
  {
    weight: 2,
    q: 'チームのパフォーマンスを上げるとき、いちばん手を入れたいのは？（深掘り・3択）',
    options: [
      { label: '進め方と期限の徹底', domain: 'executing' },
      { label: '目指す成果と物語の再提示', domain: 'influencing' },
      { label: '役割と相性のすり合わせ', domain: 'relationship' }
    ]
  },
  {
    weight: 2,
    q: '意思決定の前に、どちらをいちばん丁寧にしたい？（深掘り・2択）',
    options: [
      { label: '選択肢とトレードオフを言語化する', domain: 'thinking' },
      { label: '関係者の納得プロセスを丁寧に取る', domain: 'relationship' }
    ]
  },
  {
    weight: 2,
    q: '改革を進めるなら、まず借りる力は？（深掘り・2択）',
    options: [
      { label: '実行のテンポと詰まりの解消', domain: 'executing' },
      { label: '巻き込みと熱量の伝播', domain: 'influencing' }
    ]
  },
  {
    weight: 2,
    q: '長期の組織づくりで、いちばん情熱を向けやすいのは？（深掘り・3択）',
    options: [
      { label: '心理的安全性と継続的な対話', domain: 'relationship' },
      { label: '事業ポートフォリオと人材の配置', domain: 'thinking' },
      { label: '外界とのつながりとブランド', domain: 'influencing' }
    ]
  },
  {
    weight: 2,
    q: '圧力が高い場面で、自分の判断がどちらに寄りやすいか近いものは？',
    options: [
      { label: 'どれも強く片寄らない、または場面でバランスを取れている', domain: 'thinking' },
      { label: '業績が悪化するときは、説明より対策の筋と数字の順番を先に決めたい', domain: 'executing', risks: { relationship: -10, influencing: -4 } },
      { label: '数年先より、今四半期のキャッシュと稼働が先に来る場面が多い', domain: 'executing', risks: { thinking: -10 } },
      { label: '議論が長引くなら、一度自分の筋で切って進めたいと思うことがある', domain: 'influencing', risks: { relationship: -8, thinking: -6 } }
    ]
  },
  {
    weight: 1,
    q: '関係性の扱いで、自分のデフォルトに近いものは？',
    options: [
      { label: '信頼は積み上げるものだと肝に銘じている', domain: 'relationship' },
      { label: '適度な距離がないと仕事が回らない', domain: 'thinking' },
      { label: '仕事では感情より成果の方が説得力があると感じることがある', domain: 'influencing', risks: { relationship: -10 } },
      { label: '期待値が合わない関係は、早期に線を引く方が双方のためだと思う', domain: 'executing', risks: { relationship: -8 } }
    ]
  },
  {
    weight: 1,
    q: '時間軸と思考の癖で、自分に近いものは？',
    options: [
      { label: 'シナリオを複数持つことに価値を感じる', domain: 'thinking' },
      { label: '計画より、現場の変化に合わせた即応の方が価値が出やすいと感じる', domain: 'executing', risks: { thinking: -8 } },
      { label: 'ビジョンの言語化より、今期の打ち手の解像度を上げる方を優先しがちだ', domain: 'executing', risks: { thinking: -12 } },
      { label: '不完全なデータより、経験からの仮説で動いて検証する方が早いと信じている', domain: 'influencing', risks: { thinking: -6 } }
    ]
  },
  {
    weight: 1,
    q: '意思決定と指示の出し方で、自分に近いものは？',
    options: [
      { label: '相手の背中を押すより、道を示すことが多い', domain: 'influencing' },
      { label: '緊急時は説明より指示の方が早いと割り切ることがある', domain: 'influencing', risks: { relationship: -8 } },
      { label: '方向が定まった後の異論は、コストが大きいと感じることがある', domain: 'influencing', risks: { relationship: -6, thinking: -8 } },
      { label: '自分が責任を取る決断なら、合意形成より決裁のスピードを取りたいことがある', domain: 'executing', risks: { influencing: -4, relationship: -6 } }
    ]
  }
]

/** 1問あたりの重みの合計（設問本体の重みのみ） */
export function getTotalQuestionWeight() {
  return QUESTIONS.reduce((sum, q) => sum + (q.weight ?? 1), 0)
}

/**
 * 領域ごとに「そのラベルが主回答として選べる設問」の重みをすべて足した値（理論上その領域が取りうる主加算の上限）
 */
export function maxPrimaryWeightForDomain(domain) {
  let sum = 0
  for (const q of QUESTIONS) {
    if (q.options.some(o => o.domain === domain)) {
      sum += q.weight ?? 1
    }
  }
  return sum
}

/**
 * 生の重み付き集計から素点（60〜100）へ変換。
 * 各軸は他軸と独立: 60＝「その領域のラベルが出た設問」で一度もそのラベルを選ばなかった基準、
 * 100＝出た設問すべてでそのラベルを主回答にした（重みベースで満点）。
 * 他軸の選択で当該軸は減らない。設問ルールで指定された減点は applyRiskPenalties で別途合算。
 */
export function computeGiftScores(rawScores) {
  const gift = {}
  for (const id of DOMAIN_ORDER) {
    const c = rawScores[id] ?? 0
    const maxW = maxPrimaryWeightForDomain(id)
    if (maxW <= 0) {
      gift[id] = GIFT_BASE
      continue
    }
    const ratio = Math.min(1, c / maxW)
    gift[id] = Math.round(GIFT_BASE + (GIFT_CAP - GIFT_BASE) * ratio)
  }
  return gift
}

/**
 * 設問の risks（領域ID→負の数）を素点に加算し、RISK_FLOOR〜GIFT_CAP にクランプする。
 */
export function applyRiskPenalties(baseGifts, riskPenalty) {
  const out = {}
  for (const id of DOMAIN_ORDER) {
    const adj = typeof riskPenalty?.[id] === 'number' ? riskPenalty[id] : 0
    const v = (baseGifts[id] ?? GIFT_BASE) + adj
    out[id] = Math.round(Math.min(GIFT_CAP, Math.max(RISK_FLOOR, v)))
  }
  return out
}

/**
 * 素点（減点前）の形からプロフィール型を判定。差が小さければバランス型、1軸だけ高ければ突出型。
 */
export function detectProfileArchetype(baseGifts) {
  const pairs = DOMAIN_ORDER.map(d => ({ d, v: baseGifts[d] ?? GIFT_BASE }))
  pairs.sort((a, b) => b.v - a.v)
  const hi = pairs[0].v
  const lo = pairs[pairs.length - 1].v
  const second = pairs[1].v
  const spread = hi - lo
  const leadGap = hi - second
  if (spread <= 14 && leadGap <= 9) {
    return { kind: 'balance', leadDomain: pairs[0].d }
  }
  return { kind: 'peak', leadDomain: pairs[0].d }
}

/** 総括用：領域ごとの称賛・価値・適合業務・活かし方 */
const STRENGTH_PRAISE = {
  executing: {
    praise:
      '約束を現実に落とす実行力は、経営の言葉を信用に変える最終防衛線だ。混乱や納期圧力が強いほど、組織がこの力に依存する度合いは高まる。',
    fit:
      '大型案件の推進責任者、危機対応の司令塔、複数部署にまたがるデリバリー統括、新規立ち上げのオペレーション設計など、期限・品質・責任が一本線で絡む役割で真価が出る。',
    leverage:
      'マイルストーンと責任分界を自ら可視化し、週次で「誰がいつまでに何をするか」を更新し続けると、周囲の迷いが減り、スループットが一気に伸びる。'
  },
  influencing: {
    praise:
      '人の意思を一つに束ね、前向きな運動量を生む影響力は、変革と成長の起動装置だ。新市場・新組織・新プロダクトほど、最初の加速にこの力の市場価値は高い。',
    fit:
      '事業開発や大型提案のリード、対外交渉とステークホルダー調整、ブランドやビジョンの旗振り、組織横断の合意形成など、人と物語が交差する舞台で力を発揮しやすい。',
    leverage:
      'ストーリーを短く語り、キーパーソンごとに「参加の理由」を言語化して渡すと、巻き込みの再現性が上がる。会議の目的は「決めること」か「熱量を揃えること」かを最初に宣言するとブレにくい。'
  },
  relationship: {
    praise:
      '人の自律と信頼を同時に伸ばす関係構築力は、長期のパフォーマンスを担保する土台だ。優秀な人材ほど、公平な関係性と納得のプロセスに報いる。',
    fit:
      'マネジメント、カスタマーサクセス、人事・組織開発、パートナー開拓、カルチャーづくりなど、関係資本がそのまま成果に変わる領域で価値が大きい。',
    leverage:
      '1on1で期待と評価軸を揃え、小さな約束を積み上げて信頼の履歴を増やすと、離反が減り、チームの自己修復力が上がる。衝突の早い可視化も、この強みの得意技だ。'
  },
  thinking: {
    praise:
      '複雑さを構造に分解し、打つ手の順序を設計する戦略的思考は、賭けの精度を上げるレバーだ。不確実性が高いほど、仮説と学習のサイクルを回せる頭が競争力になる。',
    fit:
      '中期計画とポートフォリオ設計、データ・ITの方向づけ、M&Aや大型投資の筋立て、リスクとシナリオの整理など、意思決定の前提を整える役割で力を発揮しやすい。',
    leverage:
      '「何が分かれば次の一手が決まるか」を毎週一文で書き、欠損情報と検証順を並べると、組織の迷走が減る。抽象論で終わらせず、意思決定に直結する図式に落とすほど効く。'
  }
}

/**
 * 結果画面用の総括（長所の称賛・価値・向いている業務・活かし方・鼓舞）
 */
export function buildInspiringSummary({ archetype, finalGifts, topDomain, secondDomain }) {
  const top = DOMAINS[topDomain]
  const second = DOMAINS[secondDomain]
  const peak = DOMAINS[archetype.leadDomain]
  const pTop = STRENGTH_PRAISE[topDomain]
  const pSecond = STRENGTH_PRAISE[secondDomain]
  let t = ''

  if (archetype.kind === 'balance') {
    t += `今回のプロファイルは、四つの軸にエネルギーが広く届くバランス型だ。設問上いちばんクリックが集まったのは「${top.label}」、次いで「${second.label}」。単一の型に縛られない器用さは、ポストが変わっても価値が落ちにくい希少な資産だ。\n\n`
  } else {
    t += `数値のピークは「${peak.label}」。ここに本気をかけたときの推進力は、組織の速度と成果に直結しやすい。日々の選択の重心としてクリックが集まっているのは「${top.label}」— すでに強みの上に立って動いているサインだ。\n\n`
  }

  t += `まず「${top.label}」。${pTop.praise}\n\n`
  t += `向いている業務の例は、${pTop.fit}\n\n`
  t += `活かし方のヒント：${pTop.leverage}\n\n`

  if (secondDomain !== topDomain) {
    t += `もう一本の柱、「${second.label}」も無視できない。${pSecond.praise} 向いているのは、${pSecond.fit}\n\n`
    t += `この軸を活かすなら：${pSecond.leverage}\n\n`
  }

  const [bestByScore] = [...DOMAIN_ORDER].sort(
    (a, b) => (finalGifts[b] ?? GIFT_BASE) - (finalGifts[a] ?? GIFT_BASE)
  )
  if (bestByScore !== topDomain) {
    t += `設問の集計では「${DOMAINS[bestByScore].label}」の親和がいちばん高い数値として出ている。日々の選択の重心と合わせて、四半期の主役に据える軸を決めると、動きが一本化して伸びやすい。\n\n`
  }

  t += `この組み合わせは、進める・巻き込む・支える・見通す、どこに賭けても勝負できるカードを既に持っている。次は、いまのポストでどの強みを最前線に出すかだけ決めて、周囲に任せる部分と自分が握る部分をはっきり分けてほしい。その一歩が、結果を成果に変える。`

  return t
}

/** 設問数（画面の進捗など） */
export const STRENGTH_SURVEY_TOTAL = QUESTIONS.length

/** 指定領域を「主回答」として選べる設問（番号は1始まり） */
export function questionsWhereDomainCanBePrimary(domain) {
  const out = []
  QUESTIONS.forEach((q, i) => {
    if (q.options.some(o => o.domain === domain)) {
      out.push({ n: i + 1, text: q.q, weight: q.weight ?? 1 })
    }
  })
  return out
}

/** 主回答の選択肢に含まれない設問（その回は当該領域の重み計が増えない） */
export function questionsWhereDomainCannotBePrimary(domain) {
  const out = []
  QUESTIONS.forEach((q, i) => {
    if (!q.options.some(o => o.domain === domain)) {
      out.push({ n: i + 1, text: q.q })
    }
  })
  return out
}

export const CATEGORIES = {
  事業: {
    id: 'biz',
    symbol: '◆',
    color: '#00d4ff',
    hints: '戦略 / 組織人材 / 財務 / イノベーション / アイデア',
    placeholder: '例）売上550億、Agent OS完成、M&Aで3社取得…'
  },
  人: {
    id: 'ppl',
    symbol: '◈',
    color: '#ff6b9d',
    hints: '家族 / 友人 / 仲間 / メンター / コミュニティ',
    placeholder: '例）家族と月1旅行、経営者仲間10人…'
  },
  個人: {
    id: 'self',
    symbol: '◇',
    color: '#a78bfa',
    hints: '健康 / 教養 / 財産 / 趣味 / ライフスタイル',
    placeholder: '例）週3運動、月2冊読書、資産運用開始…'
  }
}

export const CATEGORY_ORDER = ['事業', '人', '個人']
