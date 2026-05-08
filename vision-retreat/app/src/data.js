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

// 設問は3層構成。
// A: 直感系（10問・weight 1）— 色・性格温度・人生天気・エレメント・故郷・朝の気分・動物・音楽・風景・絵画タッチ
//    （domain は持たず、attribute で人物像を直接捕捉する）
// B: 原体験・成功・人生系（8問・weight 1〜2）— 原体験・幼少夢中・最大の喜び・誇れる成功・苦難の越え方・核・クライマックス・残したいレガシー
// C: 強み系（11問・weight 1〜2）— 4領域へ集約。risks 系のあいまい選択肢は廃止して、4軸を明快に表現
//
// 各 option は以下のいずれかを持つ:
//   - domain: 'executing'|'influencing'|'relationship'|'thinking'  （C層）
//   - value: 任意の文字列（A・B層、question.attribute と組み合わせて profile に集計）
export const QUESTIONS = [
  // ========== A: 直感系（10問）==========
  {
    weight: 1,
    attribute: 'color',
    q: 'いま心に響く色は？（直感で）',
    options: [
      { label: '青（深く・冷静・知的）', value: 'blue' },
      { label: '赤（情熱・推進・闘志）', value: 'red' },
      { label: '黄／オレンジ（陽気・温度）', value: 'orange' },
      { label: '緑（成長・癒し・自然）', value: 'green' },
      { label: '紫（神秘・両面・気品）', value: 'purple' },
      { label: '金（達成・栄光）', value: 'gold' },
      { label: '銀／白（清明・純度）', value: 'silver' },
      { label: '黒（覚悟・極限）', value: 'black' }
    ]
  },
  {
    weight: 1,
    attribute: 'intensity',
    q: '自分の性格の温度感は？',
    options: [
      { label: '燃える赤（激しい・熱量）', value: 'red' },
      { label: '静かな青（冷静・観察）', value: 'blue' },
      { label: '両面を持つ紫（場で切り替わる）', value: 'purple' },
      { label: '透明（場の色に染まる）', value: 'clear' }
    ]
  },
  {
    weight: 1,
    attribute: 'life_pattern',
    q: 'あなたの人生の天気は？',
    options: [
      { label: '波乱万丈（嵐・雷・噴火）', value: 'turbulent' },
      { label: '穏やか（晴天・心地よい風・清流）', value: 'peaceful' },
      { label: '季節のように移ろう（春夏秋冬）', value: 'cyclical' },
      { label: '嵐のあとに虹が架かる（再生）', value: 'rebirth' }
    ]
  },
  {
    weight: 1,
    attribute: 'element',
    q: '直感で選ぶエレメントは？',
    options: [
      { label: '火（炎・熱）', value: 'fire' },
      { label: '水（清流・海）', value: 'water' },
      { label: '風（疾風・そよぎ）', value: 'wind' },
      { label: '土・大地', value: 'earth' },
      { label: '光（閃光・神々しさ）', value: 'light' },
      { label: '雷（稲妻・閃電）', value: 'thunder' },
      { label: '雪（静寂・凍結）', value: 'snow' },
      { label: '霧（淡い夢幻）', value: 'mist' },
      { label: '夜（月光・闇）', value: 'night' }
    ]
  },
  {
    weight: 1,
    attribute: 'home',
    q: 'あなたの心の故郷は？',
    options: [
      { label: '都会の灯（ネオン・摩天楼）', value: 'city' },
      { label: '田舎の風景（田園・森）', value: 'countryside' },
      { label: '海辺・湾', value: 'sea' },
      { label: '山岳・高地', value: 'mountain' },
      { label: '異国の街（海外）', value: 'abroad' },
      { label: '宇宙・銀河', value: 'cosmos' },
      { label: '海底・深海', value: 'undersea' },
      { label: '未来都市（サイバー）', value: 'future_city' },
      { label: 'ジャングル・熱帯雨林', value: 'jungle' },
      { label: '雨の街（霧雨と街灯）', value: 'rain_city' }
    ]
  },
  {
    weight: 1,
    attribute: 'morning',
    q: '朝起きてまず感じる気持ちは？',
    options: [
      { label: '「やるぞ」と燃える', value: 'ignite' },
      { label: '静かに整える', value: 'center' },
      { label: 'ワクワクが広がる', value: 'expand' },
      { label: '今日は守りたい・整えたい', value: 'protect' }
    ]
  },
  {
    weight: 1,
    attribute: 'animal',
    q: '自分を表す動物は？',
    options: [
      { label: '獅子（百獣の王・統率）', value: 'lion' },
      { label: '鷹（高所から見渡す）', value: 'eagle' },
      { label: '狼（群れと共に走る）', value: 'wolf' },
      { label: '鯨（深海の大いなる存在）', value: 'whale' },
      { label: '梟（夜の知恵）', value: 'owl' },
      { label: '龍（天を翔ける霊獣）', value: 'dragon' },
      { label: '虎（猛々しき孤高）', value: 'tiger' },
      { label: '不死鳥（再生する炎）', value: 'phoenix' },
      { label: '蝶（変容と優雅）', value: 'butterfly' },
      { label: '亀（悠久を刻む）', value: 'turtle' },
      { label: '鹿（神聖な静謐）', value: 'deer' }
    ]
  },
  {
    weight: 1,
    attribute: 'music',
    q: 'テーマソングのジャンルは？',
    options: [
      { label: 'ロック／エレクトロニック', value: 'rock' },
      { label: 'ジャズ／ソウル', value: 'jazz' },
      { label: 'クラシック／オーケストラ', value: 'classical' },
      { label: '民族音楽／和', value: 'ethnic' },
      { label: '静寂・環境音', value: 'silence' }
    ]
  },
  {
    weight: 1,
    attribute: 'landscape',
    q: '旅に出るならどこ？',
    options: [
      { label: '絶景の山岳', value: 'mountain' },
      { label: '離島の海', value: 'sea' },
      { label: '古都・神社仏閣', value: 'temple' },
      { label: '異国のメガシティ', value: 'city' },
      { label: '大砂漠・辺境', value: 'desert' },
      { label: 'ジャングル・熱帯雨林', value: 'jungle' },
      { label: '雪山・氷河', value: 'glacier' },
      { label: '宇宙ステーション・星空', value: 'cosmos' },
      { label: '海底・サンゴ礁', value: 'undersea' },
      { label: '雨の森・湿原', value: 'rainforest' }
    ]
  },
  {
    weight: 1,
    attribute: 'art_style',
    q: '描きたい絵のタッチは？',
    options: [
      { label: '写実', value: 'realism' },
      { label: '印象派', value: 'impressionist' },
      { label: '抽象', value: 'abstract' },
      { label: '水墨', value: 'sumi-e' },
      { label: '浮世絵', value: 'ukiyoe' },
      { label: '油彩・古典絵画', value: 'oil_classical' },
      { label: 'サイバーパンク', value: 'cyberpunk' },
      { label: '神話画・宗教画', value: 'mythic' },
      { label: '幻想的なステンドグラス', value: 'stained_glass' }
    ]
  },

  // ========== B: 原体験・成功・人生系（8問）==========
  {
    weight: 2,
    attribute: 'formative',
    q: 'いちばん影響を受けた原体験は？',
    options: [
      { label: '都会への憧れで上京した', value: 'tokyo_dream' },
      { label: '九州・地方から上京して人の縁に育てられた', value: 'province_to_tokyo' },
      { label: '父との確執を乗り越えた', value: 'father_conflict' },
      { label: '母の支えで前に進めた', value: 'mother_support' },
      { label: '故郷の自然に育てられた', value: 'nature_origin' },
      { label: '海外／異郷で価値観が変わった', value: 'abroad_awakening' },
      { label: '大病・事故から再起した', value: 'illness_setback' },
      { label: '起業の挫折から立ち上がった', value: 'business_failure' },
      { label: 'メンターとの出会いが転機になった', value: 'mentor_meeting' },
      { label: '貧しさ・経済的困難を乗り越えた', value: 'poverty_overcome' },
      { label: 'スポーツや勝負ごとで自分を鍛えた', value: 'competition' },
      { label: '上記のどれにも当てはまらない・その他', value: 'other' }
    ]
  },
  {
    weight: 1,
    attribute: 'childhood',
    q: '子ども時代いちばん夢中になっていたのは？',
    options: [
      { label: 'スポーツ・身体活動', value: 'sports' },
      { label: '読書・物語の世界', value: 'reading' },
      { label: 'ものづくり・工作', value: 'making' },
      { label: '友達と外で遊ぶ', value: 'outdoor' },
      { label: '絵や音楽', value: 'art' },
      { label: '自然を観察する', value: 'nature' },
      { label: '上記のどれにも当てはまらない・その他', value: 'other' }
    ]
  },
  {
    weight: 2,
    attribute: 'joy',
    q: '人生で一番うれしかった瞬間は？',
    options: [
      { label: '仕事の大成功・受賞', value: 'work_success' },
      { label: '家族・愛する人との時間', value: 'family_time' },
      { label: '誰かに認められた瞬間', value: 'recognition' },
      { label: '長年の挑戦を成し遂げた', value: 'challenge_done' },
      { label: '唯一無二の人と出会った', value: 'love_meeting' },
      { label: '故郷・自然の中で感じた', value: 'nature_joy' },
      { label: '上記のどれにも当てはまらない・その他', value: 'other' }
    ]
  },
  {
    weight: 2,
    attribute: 'success',
    q: '自分が誇れる成功体験は？',
    options: [
      { label: '全国／世界レベルの実績（模試日本一・受賞など）', value: 'national_top' },
      { label: '会社・組織を一定規模に育てた', value: 'built_org' },
      { label: '家族や仲間を守り抜いた', value: 'protected' },
      { label: '長年の夢を叶えた', value: 'dream_realized' },
      { label: '誰かの人生を救った／変えた', value: 'saved_someone' },
      { label: '自分の限界を超えた', value: 'surpassed_self' },
      { label: '上記のどれにも当てはまらない・その他', value: 'other' }
    ]
  },
  {
    weight: 1,
    attribute: 'resilience',
    q: '苦難をどう乗り越えてきましたか？',
    options: [
      { label: '自分の根性と努力', value: 'willpower' },
      { label: '家族・仲間の支え', value: 'kinship' },
      { label: 'メンター・恩師の言葉', value: 'mentor' },
      { label: '読書・学問・思索', value: 'study' },
      { label: '信仰・瞑想・自然', value: 'spirit' },
      { label: '上記のどれにも当てはまらない・その他', value: 'other' }
    ]
  },
  {
    weight: 2,
    attribute: 'core',
    q: '自分の核（価値観）にあるものは？',
    options: [
      { label: '約束は必ず守る', value: 'promise' },
      { label: '夢は諦めない', value: 'dream' },
      { label: '人を大切にする', value: 'care' },
      { label: '真実を追求する', value: 'truth' },
      { label: '家族と一族の誇り', value: 'family_pride' },
      { label: '自分との誓い', value: 'self_oath' },
      { label: '職人としての矜持・腕で生きる', value: 'craftsmanship' },
      { label: '上記のどれにも当てはまらない・その他', value: 'other' }
    ]
  },
  {
    weight: 1,
    attribute: 'climax',
    q: '人生のクライマックスは？',
    options: [
      { label: '大きな勝利の瞬間（もう来た）', value: 'past_victory' },
      { label: '家族の節目（結婚・誕生など）', value: 'family_moment' },
      { label: '仕事・事業の達成', value: 'work_achievement' },
      { label: '出会いと別れの場面', value: 'encounter' },
      { label: 'これから来る・まだ未来', value: 'yet_to_come' },
      { label: '上記のどれにも当てはまらない・その他', value: 'other' }
    ]
  },
  {
    weight: 2,
    attribute: 'legacy',
    q: '残したいレガシーは？',
    options: [
      { label: '事業・会社・仕組み', value: 'business' },
      { label: '家族の絆・血筋', value: 'family' },
      { label: '思想・哲学・本', value: 'philosophy' },
      { label: '作品・芸術', value: 'art' },
      { label: '弟子・後輩・人材', value: 'disciples' },
      { label: '職人技・技術の継承', value: 'craft' },
      { label: '上記のどれにも当てはまらない・その他', value: 'other' }
    ]
  },

  // ========== C: 強み系（11問・4軸へ集約）==========
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
    q: '困難な状況で最初にすることは？',
    options: [
      { label: 'やるべきことをリストアップし、即座に動く', domain: 'executing' },
      { label: '自分が前面に立ち、方向を指し示す', domain: 'influencing' },
      { label: 'チームの声を聴き、全員の力を結集する', domain: 'relationship' },
      { label: '状況を分析し、複数のシナリオを描く', domain: 'thinking' }
    ]
  },
  {
    weight: 1,
    q: '5年後の自分への期待は？',
    options: [
      { label: 'やると決めたことを全てやり遂げた自分', domain: 'executing' },
      { label: '業界に影響を与え、名前が知られる自分', domain: 'influencing' },
      { label: '信頼できる仲間に囲まれた自分', domain: 'relationship' },
      { label: '誰も見えていない未来を見通す自分', domain: 'thinking' }
    ]
  },
  {
    weight: 2,
    q: '新規プロジェクトの立ち上げで最初に手をつけるのは？',
    options: [
      { label: 'マイルストーンと担当を決め、週次で進捗を回す', domain: 'executing' },
      { label: 'ビジョンを語り、キーパーソンを一気に巻き込む', domain: 'influencing' },
      { label: 'メンバーの得意と不安を聞き、役割を最適化する', domain: 'relationship' },
      { label: '前提・リスク・代替案を整理し、意思決定の土台を作る', domain: 'thinking' }
    ]
  },
  {
    weight: 1,
    q: '会議で力を発揮するのはどんなとき？',
    options: [
      { label: '決まった論点を短時間で結論まで進める', domain: 'executing' },
      { label: '対立する意見をまとめ、合意形成をリードする', domain: 'influencing' },
      { label: '発言が少ない人にも声を求め、場を安全にする', domain: 'relationship' },
      { label: '議論を抽象化し、論点の抜けを指摘する', domain: 'thinking' }
    ]
  },
  {
    weight: 2,
    q: '顧客や取引先との関係で重視するのは？',
    options: [
      { label: '約束した品質・納期を絶対に守ること', domain: 'executing' },
      { label: '自社の価値を伝え、交渉の主導権を握ること', domain: 'influencing' },
      { label: '長期的な信頼と、相手の事情への配慮', domain: 'relationship' },
      { label: '相手の課題構造を整理し、最適な提案軸を描くこと', domain: 'thinking' }
    ]
  },
  {
    weight: 1,
    q: '組織のムードが下がっていると感じたとき？',
    options: [
      { label: '小さな勝ちを積み上げ、達成体験を取り戻す', domain: 'executing' },
      { label: '自分からエネルギーを出し、方向を示して牽引する', domain: 'influencing' },
      { label: '一人ひとりと対話し、孤立を減らす', domain: 'relationship' },
      { label: '要因を冷静に整理し、構造のどこを変えるか示す', domain: 'thinking' }
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
    weight: 1,
    q: '後継者や次のリーダーを育てるとしたら？',
    options: [
      { label: '目標管理とフィードバックで、成果行動を定着させる', domain: 'executing' },
      { label: '人前で任せ、失敗しても背中で責任を取る経験を積ませる', domain: 'influencing' },
      { label: '価値観と強みを言語化し、自分らしいリーダーシップを探させる', domain: 'relationship' },
      { label: '判断フレームと思考の型を渡し、自律的に考えさせる', domain: 'thinking' }
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
    weight: 1,
    attribute: 'identity',
    q: '自分のリーダーシップ・アーキタイプは？',
    options: [
      { label: '戦士（前線で戦う）', value: 'warrior' },
      { label: '賢者（智慧で導く）', value: 'sage' },
      { label: '育成者（人を引き出す）', value: 'mentor' },
      { label: '開拓者（道を切り開く）', value: 'pioneer' },
      { label: '守護者（仲間を守る）', value: 'guardian' }
    ]
  }
]

/**
 * answerLog から profile（属性ごとの最頻値）を抽出する。
 * 各 attribute タイプについて value を集計し、最多のものを返す。
 */
export function extractProfileFromAnswers(answerLog) {
  const counts = {}
  for (const a of answerLog || []) {
    if (a?.attribute && a?.attrValue) {
      counts[a.attribute] = counts[a.attribute] || {}
      counts[a.attribute][a.attrValue] = (counts[a.attribute][a.attrValue] || 0) + 1
    }
  }
  const out = {}
  for (const t of Object.keys(counts)) {
    let bestVal = null
    let bestCnt = -1
    for (const v of Object.keys(counts[t])) {
      if (counts[t][v] > bestCnt) {
        bestCnt = counts[t][v]
        bestVal = v
      }
    }
    out[t] = bestVal
  }
  return out
}

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

// ざっくり目標画面で別途取得する「ギフト」自由記述
export const GIFT_FIELD = {
  id: 'gift',
  symbol: '✦',
  color: '#fbbf24',
  title: 'あなたのギフト（強み・才能）',
  hints: '人から勇気づけられた誉め言葉・励ましの言葉をそのまま書いてください',
  placeholder: '例）父から「お前は人を惹きつける目を持っている」と言われた／恩師の「君は最後までやり抜く」という言葉が支えになっている／妻が「あなたの優しさが家族の太陽」と言ってくれた…'
}

export const CATEGORY_ORDER = ['事業', '人', '個人']
