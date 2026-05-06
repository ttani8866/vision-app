// ビジョン画像プロンプト合成エンジン（内蔵）
//
// 役割:
// 1. 4強み（実行力／影響力／人間関係構築力／戦略的思考力）に応じて
//    自然・人工物・現象の各バケットからエレメントを選ぶ
// 2. ユーザーが書いた12GOAL本文から
//    a. キーワード（情熱→火、美→花、成長→波・噴火 等）→ 追加エレメント
//    b. 固有名詞・数字・印象的フレーズ → 「沈黙のシンボル」として原文ママで埋め込む
// 3. 12GOALを統合した1枚絵プロンプトを生成
// 4. 同じデータから日本語の解説（「統合されたエネルギー場」narrative）も生成

// =====================================================================
// エレメント辞書
// =====================================================================

const NATURE = {
  star: 'a constellation of silver stars threading through the sky',
  cosmos: 'the vast cosmos opening above with nebula clouds',
  sun: 'a blazing sunburst rising at the horizon',
  fire: 'living flames of golden-red coiling upward',
  water: 'rivers of crystal water flowing through the scene',
  wind: 'a sacred wind sweeping cherry petals across the air',
  light: 'shafts of luminous light piercing through the atmosphere',
  flower: 'cascades of vivid flowers blooming in radiant color',
  sea: 'a luminous turquoise sea stretching to the horizon',
  storm: 'a dramatic storm parting to reveal radiance'
}

const ARTIFICIAL = {
  neon: 'streaks of vibrant neon light tracing the air',
  galaxy: 'a holographic galactic spiral rendered in light',
  building: 'a future city skyline rising from mist',
  suit: 'a tailored suit catching the radiant light',
  carLights: 'ribbons of car-light streams flowing along distant roads',
  streetLight: 'rows of glowing street lamps lining a luminous path',
  silhouette: 'silhouettes of people walking forward together',
  family: 'a circle of family bathed in warm golden light'
}

const PHENOMENA = {
  explosion: 'an explosion of golden energy radiating outward',
  blooming: 'a vast blooming of light and flower across space',
  eruption: 'a volcanic eruption of creative life-force',
  ascension: 'a luminous ascension of spirit toward the heavens',
  transition: 'a shimmering transition of mist into solid form',
  evolution: 'an evolution from seed to towering luminous tree'
}

// =====================================================================
// 4強み × 親和エレメント
// =====================================================================

const STRENGTH_AFFINITY = {
  executing: {
    nature: ['fire', 'storm', 'wind', 'sun', 'light'],
    artificial: ['building', 'carLights', 'streetLight', 'silhouette', 'suit'],
    phenomena: ['eruption', 'evolution', 'explosion'],
    palette: 'molten gold, ember orange, forge crimson, deep iron blue',
    mood: 'driving momentum, unstoppable forward motion, disciplined fire'
  },
  influencing: {
    nature: ['sun', 'light', 'fire', 'star', 'storm'],
    artificial: ['neon', 'suit', 'silhouette', 'building', 'carLights'],
    phenomena: ['explosion', 'ascension', 'blooming'],
    palette: 'radiant gold, sunburst orange, brilliant white, magenta corona',
    mood: 'commanding presence, magnetic radiance, charismatic gravity'
  },
  relationship: {
    nature: ['water', 'sea', 'flower', 'wind', 'light'],
    artificial: ['family', 'silhouette', 'streetLight', 'neon'],
    phenomena: ['blooming', 'transition', 'ascension'],
    palette: 'warm rose, ocean cyan, sakura pink, honey gold, jade green',
    mood: 'embracing warmth, blooming connection, harmonious flow'
  },
  thinking: {
    nature: ['star', 'cosmos', 'wind', 'water', 'light'],
    artificial: ['galaxy', 'neon', 'building', 'silhouette'],
    phenomena: ['evolution', 'transition', 'ascension'],
    palette: 'cosmic indigo, stellar silver, electric violet, deep gold',
    mood: 'far-seeing clarity, vast strategic perspective, transformative insight'
  }
}

// =====================================================================
// カテゴリ別フレーム（事業・人・個人）
// =====================================================================

const CATEGORY_FRAME = {
  '事業': 'a future skyline of meaningful enterprise rises in the background while holographic charts of growth weave with sacred geometry',
  '人': 'circles of family, friends and luminous silhouettes walk together along the golden path',
  '個人': 'a serene inner landscape — open books of wisdom, lotus pose, golden grain and abundant fruit — anchors the scene'
}

// =====================================================================
// 性別表現（年齢は固定しない）
// =====================================================================

const SUBJECT_BY_GENDER = {
  male: 'a Japanese man of timeless ageless presence (age intentionally indeterminate, gender clearly readable as masculine)',
  female: 'a Japanese woman of timeless ageless presence (age intentionally indeterminate, gender clearly readable as feminine)',
  androgynous: 'a Japanese figure of androgynous, timeless ageless presence (age intentionally indeterminate, gender presentation softly androgynous)'
}

// =====================================================================
// プロファイル属性 → 画像エレメント・色・気配へのマッピング
// =====================================================================

const COLOR_PALETTE = {
  blue: 'deep cobalt, midnight indigo, electric cyan, polar silver',
  red: 'crimson lava, scarlet flame, ember orange, ruby gold',
  orange: 'sunrise orange, honey amber, warm tangerine, golden cream',
  green: 'forest jade, sakura mint, golden olive, emerald light',
  purple: 'mystic violet, twilight magenta, royal indigo, lilac silver',
  gold: 'molten gold, victorious sunburst, brilliant amber, ivory white',
  silver: 'lunar silver, pearl white, glacier blue, soft platinum',
  black: 'obsidian black, deep void, stellar gold, blood crimson',
  white: 'pure white, dawn pearl, soft gold, sky cyan'
}

const INTENSITY_MOOD = {
  red: 'fierce burning intensity, passionate driving force',
  blue: 'cool composed clarity, deep meditative stillness',
  purple: 'duality of fire and water held in elegant balance',
  clear: 'transparent versatility, taking the color of every moment'
}

const LIFE_PATTERN_PHENOMENA = {
  turbulent: ['eruption', 'explosion', 'evolution'],
  peaceful: ['blooming', 'transition', 'ascension'],
  cyclical: ['transition', 'evolution', 'blooming'],
  rebirth: ['ascension', 'evolution', 'blooming']
}
const LIFE_PATTERN_NATURE = {
  turbulent: ['storm', 'fire', 'sea'],
  peaceful: ['wind', 'water', 'flower', 'light'],
  cyclical: ['flower', 'wind', 'water', 'sun'],
  rebirth: ['sun', 'light', 'flower']
}

const ELEMENT_NATURE = {
  fire: ['fire', 'sun'],
  water: ['water', 'sea'],
  wind: ['wind', 'storm'],
  earth: ['flower', 'light'],
  light: ['light', 'sun', 'star'],
  thunder: ['storm', 'fire'],
  snow: ['water', 'wind'],
  mist: ['wind', 'water'],
  night: ['cosmos', 'star']
}

const HOME_ARTIFICIAL = {
  city: ['building', 'neon', 'streetLight', 'carLights'],
  countryside: ['family', 'silhouette'],
  sea: ['silhouette'],
  mountain: ['silhouette'],
  abroad: ['building', 'neon', 'silhouette'],
  cosmos: ['galaxy'],
  undersea: ['silhouette'],
  future_city: ['building', 'neon', 'galaxy', 'carLights'],
  jungle: ['silhouette'],
  rain_city: ['streetLight', 'neon', 'carLights']
}
const HOME_NATURE = {
  city: [],
  countryside: ['flower', 'wind'],
  sea: ['sea', 'water'],
  mountain: ['storm', 'wind'],
  abroad: ['cosmos'],
  cosmos: ['cosmos', 'star'],
  undersea: ['water', 'sea'],
  future_city: ['light'],
  jungle: ['flower', 'water', 'wind'],
  rain_city: ['water', 'storm']
}

const FORMATIVE_ANCHOR = {
  tokyo_dream: 'a luminous Tokyo skyline silhouette rising from mist',
  province_to_tokyo: 'a long luminous road from a southern Kyushu countryside arcing into a distant Tokyo skyline, with quiet hands of mentors and friends lighting the way',
  father_conflict: 'a quiet ancestral silhouette of a father figure standing as a stone monument',
  mother_support: 'a warm halo of motherly light cradling the path',
  nature_origin: 'a vast ancestral forest of ancient trees',
  abroad_awakening: 'a distant foreign coastline glowing across the ocean',
  illness_setback: 'a single lotus emerging from still water',
  business_failure: 'a phoenix of golden light rising from embers',
  mentor_meeting: 'an ancient sage silhouette behind a luminous torii gate',
  poverty_overcome: 'a small lantern that grew into a vast field of golden lights',
  competition: 'a tall summit reached after long ascent, bathed in dawn light',
  other: null
}

const IDENTITY_ARCHETYPE = {
  warrior: 'as a fearless warrior holding the front line',
  sage: 'as a sage who reads the cosmos',
  mentor: 'as a mentor whose presence draws out others\' light',
  pioneer: 'as a pioneer carving a new road through fog',
  guardian: 'as a guardian quietly protecting their world'
}

const ANIMAL_SPIRIT = {
  lion: 'a luminous lion spirit walking beside the figure',
  eagle: 'a soaring eagle of light circling above',
  wolf: 'a noble wolf of moonlight standing at the figure\'s side',
  whale: 'a vast whale of starlight gliding through the deep sky',
  owl: 'a wise owl of silver light perched on a luminous branch',
  dragon: 'a celestial dragon of light spiraling through the sky around the figure',
  tiger: 'a fierce tiger of fire prowling through tall grasses of light',
  phoenix: 'a phoenix of golden flame ascending from cosmic embers behind the figure',
  butterfly: 'a constellation of luminous butterflies drifting through soft light',
  turtle: 'an ancient turtle of moonlit shell carrying the world quietly at the figure\'s feet',
  deer: 'a sacred white deer of soft light standing serenely beside the figure'
}

const ART_STYLE = {
  realism: 'painterly realist visionary aesthetic',
  impressionist: 'impressionist visionary aesthetic with soft broken light',
  abstract: 'abstract visionary aesthetic of pure energy and form',
  'sumi-e': 'sumi-e brushwork visionary aesthetic with deep negative space',
  ukiyoe: 'ukiyo-e visionary aesthetic with bold flowing line, hokusai wave and color blocks',
  oil_classical: 'classical oil-painting visionary aesthetic with chiaroscuro and renaissance composition',
  cyberpunk: 'cyberpunk visionary aesthetic with vivid neon, holographic data streams and rain-soaked light',
  mythic: 'mythic religious-painting visionary aesthetic with halos, golden mandala backgrounds and luminous icons',
  stained_glass: 'stained-glass visionary aesthetic with prismatic light fragments and luminous colored panes'
}

// =====================================================================
// 強み別 構図ダイナミクス
// =====================================================================

const STRENGTH_COMPOSITION = {
  influencing: {
    posture: 'stands facing forward with a calm, magnetic stance, light gathering at chest and palms, gaze indicating the way',
    dynamics: 'Light radiates from the central figure outward in slow spirals; small silhouettes farther in the frame are drawn into that light along a luminous path. The picture\'s center of gravity is the figure\'s gaze and the path opening before others.'
  },
  executing: {
    posture: 'is captured mid-step, one foot placed firmly forward as if onto a stone newly laid, hands quietly steady',
    dynamics: 'The eye is led by roads, stairs, bridges and layered foundations rising through the picture. The figure has just set a keystone — the structure of the world tightens around that single deliberate act.'
  },
  relationship: {
    posture: 'stands in a slightly opened welcoming posture, hands turned softly outward, eyes warm with attention',
    dynamics: 'Threads of light weave between the figure and small silhouettes around them; multiple paths converge on a shared hearth or table of light. The composition centers on a meeting point rather than a peak.'
  },
  thinking: {
    posture: 'looks quietly outward toward a far horizon, bearing of someone reading the long shape of time',
    dynamics: 'Layers of depth recede deeply into the frame — distant peaks, faint constellations, quiet maps held in atmospheric perspective. The composition rewards long, slow looking; the figure surveys from a vantage point.'
  }
}

// =====================================================================
// テキスト集約 ＆ Grounding 検査
// （回答に明確な根拠がない汎用モチーフを抑制するため）
// =====================================================================

function collectAllText({ proposed, gift, profile }) {
  const goalsText = (proposed || [])
    .flatMap(c => (c?.goals || []).map(g => `${g?.title || ''} ${g?.desc || ''}`))
    .join(' ')
  const giftStr = gift || ''
  return `${goalsText} ${giftStr}`
}

/**
 * 回答に明示的な根拠がある汎用モチーフだけを許可するためのフラグ集合を返す。
 * 例えば 'tokyo_tower' は本人が「東京タワー」と書かなければ使わない。
 */
function detectGroundedMotifs({ proposed, gift, profile, allText }) {
  const t = allText || collectAllText({ proposed, gift, profile })
  const g = new Set()
  const p = profile || {}
  if (/東京タワー/.test(t)) g.add('tokyo_tower')
  if (/鳥居|神社|社殿|jinja/i.test(t)) g.add('torii')
  if (/富士|fuji/i.test(t)) g.add('fuji')
  if (/宇宙|銀河|cosmos|galaxy/i.test(t) || p.home === 'cosmos' || p.landscape === 'cosmos') g.add('cosmos')
  if (/りんご|林檎|果樹|果実|樹/.test(t)) g.add('golden_tree')
  if (/家族|円座|食卓|団欒/.test(t) || p.legacy === 'family' || p.joy === 'family_time') g.add('family_circle')
  if (/噴火|火山|volcanic/i.test(t) || p.life_pattern === 'turbulent') g.add('volcanic')
  if (/職人|工房|手仕事|匠|腕で|技を/.test(t) || p.core === 'craftsmanship' || p.legacy === 'craft') g.add('craftsman')
  if (/海|港|船|漁|波|sea|ocean|harbor/i.test(t) || p.home === 'sea' || p.home === 'undersea' || p.landscape === 'sea') g.add('sea')
  if (/山|峰|岳|mountain/i.test(t) || p.home === 'mountain' || p.landscape === 'mountain') g.add('mountain')
  if (/九州|福岡|博多|長崎|熊本|鹿児島|宮崎|大分|佐賀/.test(t)) g.add('kyushu')
  if (/北海道|札幌|函館/.test(t)) g.add('hokkaido')
  if (/東北|青森|岩手|宮城|秋田|山形|福島/.test(t)) g.add('tohoku')
  if (/関西|大阪|京都|奈良|神戸/.test(t)) g.add('kansai')
  if (/沖縄|琉球/.test(t)) g.add('okinawa')
  if (/東京|tokyo|渋谷|新宿|銀座|丸の内|六本木/i.test(t) || p.home === 'city' || p.formative === 'tokyo_dream') g.add('city')
  if (/縁|繋がり|絆|出会い|引き寄せ|bond/i.test(t)) g.add('bonds')
  if (/AI|人工知能|エージェント|データ|デジタル|テクノロジー|プログラム/i.test(t)) g.add('ai_data')
  if (/上場|IPO|株式|ipo/i.test(t)) g.add('ipo')
  if (/M&A|買収|合併/i.test(t)) g.add('m_and_a')
  return g
}

// =====================================================================
// セクション別ビルダー
// （5カテゴリ: Origin / Turning Point / Vocation / Bonds / Future Mission）
// =====================================================================

function buildSubject({ gender, profile, topLabel, topTraits, composition }) {
  const base = SUBJECT_BY_GENDER[gender] || SUBJECT_BY_GENDER.male
  const archetype = (profile?.identity && IDENTITY_ARCHETYPE[profile.identity]) || ''
  const animal = (profile?.animal && ANIMAL_SPIRIT[profile.animal]) || null
  const intensity = (profile?.intensity && INTENSITY_MOOD[profile.intensity]) || ''
  const archetypePart = archetype ? ` ${archetype}` : ''
  const intensityPart = intensity ? `, the figure\'s presence carrying ${intensity}` : ''
  const animalPart = animal ? ` ${animal}, accompanying the figure as a quiet ally.` : ''
  return `${base}${archetypePart}, embodying the strength of "${topLabel}" (${topTraits}), ${composition.posture}${intensityPart}.${animalPart}`
}

function buildOriginScene({ profile, anchors, grounded, allText }) {
  const p = profile || {}
  const f = p.formative
  const home = p.home

  if (f === 'province_to_tokyo' && grounded.has('kyushu')) {
    return 'A long luminous road begins in a southern Kyushu coastal village — a small fishing port at dawn, salt-stained wooden boats, an early train cutting through morning mist — and arcs gently across the picture toward a distant pre-dawn city skyline glimpsed across the horizon. Hands of mentors and friends lining this road quietly hold up small lanterns of light.'
  }
  if (f === 'province_to_tokyo' && grounded.has('hokkaido')) {
    return 'A long luminous road begins in a snow-quiet Hokkaido valley — pine forests and a wide rural rail line at first light — and arcs gently across the picture toward a distant pre-dawn city skyline glimpsed across the horizon, lit by the small lanterns of mentors and friends.'
  }
  if (f === 'province_to_tokyo' && grounded.has('tohoku')) {
    return 'A long luminous road begins in a quiet Tohoku rural town — terraced rice fields, a small wooden station, soft mist over distant ridges — and arcs gently across the picture toward a distant pre-dawn city skyline glimpsed across the horizon.'
  }
  if (f === 'province_to_tokyo' && grounded.has('okinawa')) {
    return 'A long luminous road begins in an Okinawan coastal village — turquoise reefs, low coral walls, banyan trees — and arcs gently across the picture toward a distant pre-dawn city skyline glimpsed across the horizon.'
  }
  if (f === 'province_to_tokyo') {
    return 'A long luminous road begins in a quiet provincial home town — a small station, low rooftops, a familiar hill — and arcs gently across the picture toward a distant pre-dawn city skyline glimpsed across the horizon, where mentors and friends along the way hold up small lanterns of light.'
  }
  if (f === 'father_conflict') {
    return 'In the middle distance, a quiet ancestral stone monument stands weathered and dignified, suggesting a father figure long reconciled. Pale dawn light crosses the stone like forgiveness.'
  }
  if (f === 'mother_support') {
    return 'A warm low halo of motherly light cradles the lower portion of the picture, illuminating a path stitched together by quiet care.'
  }
  if (f === 'nature_origin' || home === 'countryside') {
    return 'A pre-dawn rural landscape — dew on rice fields, a single old farmhouse, a forest of cedar — holds the figure\'s origin in its mist and first light.'
  }
  if (f === 'abroad_awakening' || home === 'abroad') {
    return 'A foreign coastline glows softly across an ocean — distant unfamiliar architecture, a different sun, an opening of perspective remembered.'
  }
  if (f === 'illness_setback') {
    return 'A single lotus rises from still dark water in the foreground — quiet evidence of an inward return, a body and spirit that came back to themselves.'
  }
  if (f === 'business_failure') {
    return 'In the lower frame, the embers of a past fire have cooled into rich earth from which a small but bright shoot of new growth rises — a quiet phoenix moment.'
  }
  if (f === 'mentor_meeting' && grounded.has('torii')) {
    return 'In the middle distance, an old wooden gate stands open onto a soft road of light, suggesting the moment a teacher\'s words first arrived.'
  }
  if (f === 'mentor_meeting') {
    return 'In the middle distance, an ancient sage silhouette stands beside an open doorway of light, suggesting the moment a teacher was met and a path began.'
  }
  if (f === 'poverty_overcome') {
    return 'A solitary lantern rests in the foreground; behind it, a vast field of small lights stretches into the distance — each one a year of patient struggle made luminous.'
  }
  if (f === 'competition') {
    return 'A long mountain trail leads to a sunlit summit visible across the picture — a life shaped by repeated, disciplined ascent.'
  }

  if (home === 'sea' || (grounded.has('sea') && !grounded.has('city'))) {
    return 'A coastal panorama of small port boats and silent piers, sea mist softening the horizon — a life that began listening to water.'
  }
  if (home === 'mountain') {
    return 'A high mountain ridgeline at dawn, stone paths winding upward, valleys filled with soft cloud — a life shaped by altitude and silence.'
  }
  if (home === 'undersea') {
    return 'A luminous undersea cathedral of corals and silver fish, light filtering down from a far surface — a life shaped at depths.'
  }
  if (home === 'future_city') {
    return 'A quiet dawn future city of glass towers and soft holographic mist, light running like rivers along transit corridors — a life made native to tomorrow.'
  }
  if (home === 'jungle') {
    return 'A dense pre-dawn rainforest — broad leaves heavy with mist, a clear stream catching first light — a life rooted in lush abundance.'
  }
  if (home === 'rain_city') {
    return 'A rain-soaked street at dusk — neon and lamps reflected in wet pavement, a quiet figure walking through the shimmer — a life that learned to read reflections.'
  }
  if (home === 'city' || grounded.has('city')) {
    return 'A pre-dawn city of glass towers and boulevards just waking, light reflecting on wet pavement — a life forged in dense human density.'
  }
  if (home === 'cosmos' && grounded.has('cosmos')) {
    return 'A vast star-field opens behind the figure, with quiet planetary curves and silver constellations — contained, never overwhelming the human at the center.'
  }

  return 'A quiet pre-dawn landscape that holds the figure\'s life story in its layers — a winding path, a small hearth, the first glow of horizon light — keyed to the person\'s actual story rather than to generic spiritual imagery.'
}

function buildTurningSymbols({ profile, anchors, grounded, allText }) {
  const out = []
  const p = profile || {}
  if (p.life_pattern === 'turbulent') {
    out.push('A receding storm has just left the upper frame; pale light has returned to the picture — the leader\'s known turbulence is behind, but its shape is still visible in the cloud.')
  } else if (p.life_pattern === 'rebirth') {
    out.push('A faint rainbow arches above a storm just leaving the frame — a clear marker of renewal beginning.')
  } else if (p.life_pattern === 'cyclical') {
    out.push('Subtle markers of season layer through the picture — early blossom in one corner, late grain in another — implying many returns.')
  }
  if (p.resilience === 'kinship') {
    out.push('Faint silhouettes of supporting figures stand quietly behind the leader, their presence registered as warmth rather than detail.')
  } else if (p.resilience === 'mentor') {
    out.push('A single distant lamp suggests a teacher\'s voice that crossed many years.')
  } else if (p.resilience === 'study') {
    out.push('A small open book rests in the foreground, edges softened by long handling.')
  } else if (p.resilience === 'spirit') {
    out.push('A quiet still pool reflects the sky — a ground of inner practice that held the figure through difficulty.')
  } else if (p.resilience === 'willpower') {
    out.push('A worn but unbroken stone in the foreground carries the marks of repeated effort.')
  }
  return out
}

function buildVocationSymbols({ profile, anchors, grounded, allText }) {
  const out = []
  const p = profile || {}
  if (grounded.has('craftsman')) {
    out.push('A craftsman\'s hand, time-worn tools, and the quiet glow of a single forge or atelier lamp anchor the working life of the figure.')
  }
  if (grounded.has('ai_data')) {
    out.push('Threads of luminous data weave gently through the workspace as living lines of guidance — technology integrated, not dominant.')
  }
  if (grounded.has('ipo')) {
    out.push('In the middle distance, a tall structure rises — its keystone placed by the figure\'s steady hand, signaling a public turning of an enterprise.')
  }
  if (grounded.has('m_and_a')) {
    out.push('Two paths visibly merge into one in the middle ground — a joining of organizations, registered as flowing geometry rather than literal corporate symbols.')
  }
  if (p.core === 'promise') {
    out.push('A row of small kept promises extends like quiet stepping stones across the foreground.')
  }
  if (p.core === 'truth') {
    out.push('A clear glass of still water sits prominently — undistorted, true.')
  }
  if (p.core === 'care') {
    out.push('A pair of gently held hands occupies the foreground — care made visible as an act, not a slogan.')
  }
  if (p.core === 'craftsmanship') {
    out.push('The texture of fine handwork — wood grain, hammered metal, tooled leather — runs through the picture as the leader\'s native medium.')
  }
  if (p.core === 'self_oath') {
    out.push('A single lit candle in the foreground burns steady — a private vow kept night after night.')
  }
  return out
}

function buildBondsSymbols({ profile, anchors, grounded, giftAnchors, allText }) {
  const out = []
  const p = profile || {}
  if (giftAnchors.length) {
    out.push('Threads of warm light radiate outward from the figure to small distant silhouettes; each thread silently carries the meaning of words once given to the leader by loved ones.')
  } else if (p.legacy === 'family' || p.joy === 'family_time' || grounded.has('family_circle')) {
    out.push('Silhouettes of family members gather at small lights along converging luminous paths — a shape of belonging built over years.')
  } else if (p.legacy === 'disciples') {
    out.push('Younger silhouettes follow softly behind the figure, each carrying a small light picked up from the figure\'s path.')
  } else if (grounded.has('bonds')) {
    out.push('Multiple roads converge at a single warm hearth in the middle ground — a life pattern of meeting, supporting, being supported.')
  }
  return out
}

function buildFutureMissionSymbols({ profile, anchors, grounded, allText }) {
  const out = []
  const p = profile || {}
  if (p.climax === 'yet_to_come') {
    out.push('A widening road of dawn-light opens forward through the picture — the leader\'s climax has not yet been reached, and the picture knows this.')
  }
  const hasYearAnchor = anchors.some(a => /20\d\d/.test(a))
  if (hasYearAnchor) {
    out.push('Layered horizons recede into the distance, each held quietly in its own light — each horizon a future year still ahead.')
  }
  if (p.legacy === 'craft') {
    out.push('A pair of younger hands appears faintly, receiving the leader\'s tool — the future of the work is being passed forward.')
  } else if (p.legacy === 'philosophy') {
    out.push('Faint sheets of paper drift outward from the figure into the distance — ideas leaving the maker and traveling further than they will.')
  }
  if (out.length === 0 && p.life_pattern !== 'turbulent') {
    out.push('A clear path opens forward across the picture, neither rushed nor empty — a future the leader is already walking into.')
  }
  return out
}

function buildPalette({ profile, aff, aff2 }) {
  const colorPalette = profile?.color && COLOR_PALETTE[profile.color]
    ? COLOR_PALETTE[profile.color]
    : null
  const intensityNote = profile?.intensity && INTENSITY_MOOD[profile.intensity]
    ? INTENSITY_MOOD[profile.intensity]
    : ''
  const aff2Tone = aff2.palette.split(',')[0].trim()
  if (colorPalette) {
    return `Palette anchored by the leader\'s chosen color — ${colorPalette}, with quiet support from ${aff.palette.split(',')[0].trim()} and ${aff2Tone}. Mood: ${intensityNote || aff.mood}.`
  }
  return `Palette: ${aff.palette}, with hints of ${aff2Tone}. Mood: ${intensityNote || aff.mood}.`
}

function applyProfileToBuckets(profile, natureKeys, artiKeys, phenoKeys) {
  if (!profile) return { natureKeys, artiKeys, phenoKeys }
  const n = [...natureKeys]
  const a = [...artiKeys]
  const p = [...phenoKeys]
  if (profile.element && ELEMENT_NATURE[profile.element]) n.unshift(...ELEMENT_NATURE[profile.element])
  if (profile.life_pattern) {
    if (LIFE_PATTERN_NATURE[profile.life_pattern]) n.unshift(...LIFE_PATTERN_NATURE[profile.life_pattern])
    if (LIFE_PATTERN_PHENOMENA[profile.life_pattern]) p.unshift(...LIFE_PATTERN_PHENOMENA[profile.life_pattern])
  }
  if (profile.home) {
    if (HOME_NATURE[profile.home]) n.push(...HOME_NATURE[profile.home])
    if (HOME_ARTIFICIAL[profile.home]) a.unshift(...HOME_ARTIFICIAL[profile.home])
  }
  return {
    natureKeys: unique(n),
    artiKeys: unique(a),
    phenoKeys: unique(p)
  }
}

// =====================================================================
// キーワード→エレメント マッピング
// 抽象概念を「自然・人工物・現象」に翻訳する辞書
// =====================================================================

const KEYWORD_ELEMENT_MAP = [
  // ===== 熱量・推進力系 → 火・噴火・爆発 =====
  { keys: ['情熱', '熱意', '根性', '気合', '炎', '燃え', '燃やす', '闘志', 'パッション'],
    nature: ['fire'], phenomena: ['eruption', 'explosion'] },
  { keys: ['実行', '推進', '駆動', '動かす', '突破', '勝ちパターン', '勝つ', '優勝', '達成'],
    nature: ['fire', 'sun'], phenomena: ['explosion', 'eruption'] },

  // ===== 美・癒し・調和系 → 花・水 =====
  { keys: ['美', '優美', '優雅', '癒し', '癒やし', '安らぎ', '調和', 'ハーモニー'],
    nature: ['flower', 'water'], phenomena: ['blooming'] },
  { keys: ['芸術', 'アート', '創造', 'クリエイティブ', '感性'],
    nature: ['flower', 'light'], phenomena: ['blooming'] },

  // ===== 成長・進化・拡大系 → 波・噴火・進化・開花 =====
  { keys: ['成長', '伸び', '伸ばす', '拡大', '飛躍', '発展'],
    nature: ['sea', 'wind'], phenomena: ['evolution', 'blooming', 'eruption'] },
  { keys: ['進化', '変革', '改革', 'トランスフォーメーション', '変遷'],
    nature: ['wind'], phenomena: ['evolution', 'transition'] },
  { keys: ['上場', 'IPO', '頂点', '昇'],
    nature: ['sun'], phenomena: ['ascension', 'explosion'], artificial: ['building'] },
  { keys: ['M&A', '買収', '統合'],
    artificial: ['suit', 'silhouette', 'building'], phenomena: ['transition'] },

  // ===== 家族・絆・関係系 → 家族・人影・水 =====
  { keys: ['家族', '父', '母', '子ども', '子供', '夫', '妻', '兄弟', '姉妹', '親'],
    artificial: ['family'], nature: ['light'] },
  { keys: ['仲間', '友', '友人', '同志', '盟友', 'コミュニティ', '絆', 'チーム', '組織', '一丸'],
    artificial: ['silhouette', 'family'], nature: ['light'] },
  { keys: ['愛', '思いやり', '感謝', '恩', '恩返し'],
    artificial: ['family'], nature: ['flower', 'light'] },

  // ===== 健康・身体・呼吸系 → 風・水・進化 =====
  { keys: ['健康', '体力', '身体', '体', 'カラダ', 'ランニング', 'トレーニング', 'ヨガ', '瞑想', '呼吸', '睡眠'],
    nature: ['wind', 'water'], phenomena: ['evolution'] },

  // ===== 学び・知性・思索系 → 星・宇宙・銀河 =====
  { keys: ['学び', '学習', '読書', '哲学', '歴史', '教養', '知見', '知識', '智慧', '知恵', '思索', '内省', '研究'],
    nature: ['star', 'cosmos', 'light'] },

  // ===== AI・データ・テック系 → 銀河・ネオン・ビル =====
  { keys: ['AI', '人工知能', 'エージェント', 'Claude', 'GPT', 'データ', 'デジタル', 'テクノロジー', '技術', 'IT', 'DX', 'システム', 'プログラム', 'ソフトウェア'],
    artificial: ['galaxy', 'neon', 'building'] },

  // ===== 経営・ビジネス・都市系 → ビル・スーツ・街頭・車 =====
  { keys: ['経営', '事業', 'ビジネス', '会社', 'グループ', '本社', '幹部', 'CEO', 'CXO', 'CFO', 'CHRO', '投資', 'IR', '株主', '決算', '財務'],
    artificial: ['building', 'suit', 'streetLight'] },
  { keys: ['東京', '銀座', '渋谷', '丸の内', '六本木', '新宿', '名古屋', '大阪', '都市'],
    artificial: ['building', 'streetLight', 'carLights', 'neon'] },

  // ===== 再生・循環・サスティナビリティ系 → 進化・変遷・開花 =====
  { keys: ['リサイクル', '再生', '循環', '持続', 'サスティナ', 'サステナ', 'SDGs', 'エコ', '環境'],
    nature: ['flower', 'water'], phenomena: ['transition', 'evolution', 'blooming'] },

  // ===== 自然由来語そのまま =====
  { keys: ['りんご', 'リンゴ', '林檎', '果実', '果樹', '樹', '木'],
    nature: ['flower'], phenomena: ['blooming', 'evolution'] },
  { keys: ['海', '波', '潮', 'オーシャン'],
    nature: ['sea'] },
  { keys: ['山', '頂', '峰', '山岳'],
    nature: ['light'], phenomena: ['ascension'] },
  { keys: ['森', '林', '緑'],
    nature: ['flower', 'wind'] },
  { keys: ['桜', '花'],
    nature: ['flower', 'wind'] },
  { keys: ['空', '天'],
    nature: ['cosmos', 'light'] },
  { keys: ['星'],
    nature: ['star', 'cosmos'] },
  { keys: ['太陽'],
    nature: ['sun'] },
  { keys: ['月'],
    nature: ['cosmos', 'light'] },
  { keys: ['風'],
    nature: ['wind'] },
  { keys: ['火', '炎', '焚'],
    nature: ['fire'] },
  { keys: ['水', '川', '滝'],
    nature: ['water'] },
  { keys: ['嵐', '雷'],
    nature: ['storm'] },
  { keys: ['光'],
    nature: ['light'] },

  // ===== 夢・志・希望系 → 星・宇宙・昇天 =====
  { keys: ['夢', '志', 'ビジョン', '理想', '希望', '未来'],
    nature: ['star', 'cosmos'], phenomena: ['ascension', 'blooming'] }
]

// =====================================================================
// ユーティリティ
// =====================================================================

function mulberry32(seed) {
  let a = seed >>> 0
  return function () {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function pick(arr, n, rng) {
  const copy = [...arr]
  const out = []
  const k = Math.min(n, copy.length)
  while (out.length < k) {
    const i = Math.floor(rng() * copy.length)
    out.push(copy.splice(i, 1)[0])
  }
  return out
}

function unique(arr) {
  return Array.from(new Set(arr))
}

// =====================================================================
// キーワード抽出 → エレメント補強 ＋ 原文アンカー
// =====================================================================

/**
 * GOAL本文（複数）から
 * - elementBoost: 各バケットへの追加エレメントkey
 * - verbatimAnchors: そのまま絵に埋め込みたい固有フレーズ（数字・カギ括弧・印象語）
 * を抽出する
 */
function extractFromGoals(allGoals) {
  const text = (allGoals || [])
    .flatMap(c => (c?.goals || []).map(g => `${g?.title || ''} ${g?.desc || ''}`))
    .join(' ')

  const boost = { nature: [], artificial: [], phenomena: [] }
  for (const rule of KEYWORD_ELEMENT_MAP) {
    if (rule.keys.some(k => text.includes(k))) {
      if (rule.nature) boost.nature.push(...rule.nature)
      if (rule.artificial) boost.artificial.push(...rule.artificial)
      if (rule.phenomena) boost.phenomena.push(...rule.phenomena)
    }
  }
  boost.nature = unique(boost.nature)
  boost.artificial = unique(boost.artificial)
  boost.phenomena = unique(boost.phenomena)

  // 原文アンカー: カギ括弧で囲まれた語、数字+単位、特徴的な複合名詞
  const anchors = []
  // 「…」内
  const bracketRe = /[「『]([^「『」』]{1,30})[」』]/g
  let m
  while ((m = bracketRe.exec(text)) !== null) {
    anchors.push(m[1])
  }
  // 数字+億/万/円/%/人 など
  const numRe = /(\d{1,4}(?:[,，]\d{3})*(?:\.\d+)?(?:億|万|千|百)?(?:円|人|社|店|店舗|拠点|国|か国|%|％|年))/g
  while ((m = numRe.exec(text)) !== null) {
    anchors.push(m[1])
  }
  // 固有的キーワード（個別アンカー化）
  const personalAnchors = [
    '父への恩返し', '母への恩返し', '家族との時間', '家族旅行',
    'りんご', 'リンゴ', 'IPO', '上場', '勝ちパターン', '事業承継',
    '銀座', '東京', '名古屋', 'AI-Driven', 'Agent OS', 'AIエージェント',
    'VisionX', 'グループ連結', 'M&A'
  ]
  for (const w of personalAnchors) {
    if (text.includes(w) && !anchors.includes(w)) anchors.push(w)
  }

  return { boost, anchors: unique(anchors).slice(0, 8) }
}

/**
 * 「ギフト」自由記述（人から受けた誉め言葉・励まし）から、
 * 画像と解説に必ず反映させる anchor 群を抽出する。
 * - 「…」『…』内の引用フレーズを最優先
 * - 引用がなければ最初の1〜2文（。または改行で分割）を採用
 * 戻り値は最大5件
 */
export function extractGiftAnchors(gift) {
  if (!gift || typeof gift !== 'string') return []
  const text = gift.trim()
  if (!text) return []
  const out = []
  const bracketRe = /[「『"]([^「『」』"]{1,80})[」』"]/g
  let m
  while ((m = bracketRe.exec(text)) !== null) {
    out.push(m[1].trim())
  }
  if (out.length === 0) {
    const sentences = text
      .split(/[。\n]/)
      .map(s => s.trim())
      .filter(s => s.length > 0 && s.length <= 80)
      .slice(0, 2)
    out.push(...sentences)
  }
  return unique(out).slice(0, 5)
}

// =====================================================================
// 単一GOAL用（後方互換）
// =====================================================================

/**
 * 単一GOAL用は、統合版に「単一ゴールに焦点を絞った proposed」を渡して同じ思想で生成する。
 */
export function composeImagePrompt({
  topDomain,
  secondDomain,
  topLabel,
  topTraits,
  category,
  title,
  desc,
  gender,
  profile,
  gift,
  seed
}) {
  return composeUnifiedImagePrompt({
    topDomain,
    secondDomain,
    topLabel,
    topTraits,
    proposed: [{ category, goals: [{ title, desc }] }],
    gender,
    profile,
    gift,
    seed
  })
}

// =====================================================================
// 統合版（12GOALを1枚に集約）
// =====================================================================

export function composeUnifiedImagePrompt({
  topDomain,
  secondDomain,
  topLabel,
  topTraits,
  proposed,
  gender,
  profile,
  gift,
  seed
}) {
  const aff = STRENGTH_AFFINITY[topDomain] || STRENGTH_AFFINITY.executing
  const aff2 = STRENGTH_AFFINITY[secondDomain] || aff
  const p = profile || {}

  const allText = collectAllText({ proposed, gift, profile: p })
  const { anchors } = extractFromGoals(proposed)
  const giftAnchors = extractGiftAnchors(gift)
  const grounded = detectGroundedMotifs({ proposed, gift, profile: p, allText })
  const composition = STRENGTH_COMPOSITION[topDomain] || STRENGTH_COMPOSITION.executing

  // セクション別ビルダー
  const subject = buildSubject({ gender, profile: p, topLabel, topTraits, composition })
  const originScene = buildOriginScene({ profile: p, anchors, grounded, allText })
  const turningSymbols = buildTurningSymbols({ profile: p, anchors, grounded, allText })
  const vocationSymbols = buildVocationSymbols({ profile: p, anchors, grounded, allText })
  const bondsSymbols = buildBondsSymbols({ profile: p, anchors, grounded, giftAnchors, allText })
  const futureMission = buildFutureMissionSymbols({ profile: p, anchors, grounded, allText })
  const palette = buildPalette({ profile: p, aff, aff2 })

  const styleSuffix = p.art_style && ART_STYLE[p.art_style]
    ? ART_STYLE[p.art_style]
    : 'painterly visionary aesthetic with the quiet authority of a personal protective amulet'

  // ギフト言葉は中央の太陽として最重要
  const giftLine = giftAnchors.length
    ? `[Sacred Encouraging Words at the Heart] Sealed at the visual heart of the talisman as a wordless radiance carrying their meaning (no legible letters appear): ${giftAnchors.map(s => `"${s}"`).join('; ')}. The picture\'s central light must carry the silent essence of these words.`
    : ''

  // 個人アンカー（自由記述・GOAL文から固有名詞・数値）
  const anchorLine = anchors.length
    ? `[Personal Motifs from Their Own Words] Drawn directly from the leader\'s actual writing — rendered ONLY as silent symbolic shapes (never as written text or visible numbers): ${anchors.join(', ')}.`
    : ''

  // Avoid list — grounding 検査で根拠なしのモチーフは禁止
  const avoid = []
  if (!grounded.has('tokyo_tower')) avoid.push('Tokyo Tower')
  if (!grounded.has('torii')) avoid.push('torii gates and Shinto shrines')
  if (!grounded.has('fuji')) avoid.push('Mount Fuji')
  if (!grounded.has('cosmos')) avoid.push('full cosmic galaxies')
  if (!grounded.has('golden_tree')) avoid.push('giant generic golden trees')
  if (!grounded.has('family_circle')) avoid.push('literal family circle gatherings')
  if (!grounded.has('volcanic')) avoid.push('volcanic eruptions')

  return [
    '[Concept] This is a personal vision talisman — not a generic vision board, not a stock spiritual portrait. It is a sacred symbolic card that seals one specific person\'s life history, origin, relationships, vocation, innate strengths, and future mission into one powerful single image. Every element below is grounded in this specific leader\'s answers; nothing generic should appear.',
    `[Protagonist] At the visual heart of a single unified painting, ${subject}`,
    `[Origin & Background] ${originScene}`,
    turningSymbols.length ? `[Turning Points] ${turningSymbols.join(' ')}` : '',
    vocationSymbols.length ? `[Vocation & Mission] ${vocationSymbols.join(' ')}` : '',
    bondsSymbols.length ? `[Bonds & Lineage] ${bondsSymbols.join(' ')}` : '',
    futureMission.length ? `[Future Mission] ${futureMission.join(' ')}` : '',
    giftLine,
    anchorLine,
    `[Color, Light & Atmosphere] ${palette}`,
    `[Compositional Force — driven by the leader\'s top strength "${topLabel}"] ${composition.dynamics}`,
    `[Style] ${styleSuffix}, sacred talisman quality (object you would frame, carry, or set on a personal altar), cinematic composition, ultra-detailed, dreamlike, reverent. Soft volumetric light and atmospheric depth, but never sterile generic spirituality.`,
    '[Strict Composition Rules] One single image only — no diptych, no triptych, no panels, no split screens, no comic layout, no grid, no collage, no multiple scenes side by side. Every element coexists in the same picture plane.',
    '[Strict Prohibition: On-Image Text] Absolutely no on-image text of any kind. No captions, no signage, no monitors with text, no whiteboards, no plaques, no banners, no labels, no calligraphy, no visible numbers. All life goals, values, places, and strengths must appear ONLY as symbolic objects, landscapes, colors, light, posture, and composition.',
    avoid.length
      ? `[Strict Prohibition: Generic Repeated Motifs] Do not include any of the following unless they are directly grounded in the leader\'s own answers: ${avoid.join(', ')}. The point of this talisman is that it could only belong to this one specific person — generic spiritual imagery breaks that promise.`
      : ''
  ]
    .filter(Boolean)
    .join(' ')
}

// =====================================================================
// 解説（日本語ナラティブ）生成
// 「統合されたエネルギー場」narrative を、ユーザーのデータから具体化
// =====================================================================

// プロファイル属性 → 日本語ラベル（解説文用）
const PROFILE_JA = {
  color: { blue: '青（深い・冷静）', red: '赤（情熱・推進）', orange: '黄／オレンジ（陽気・温度）', green: '緑（成長・癒し）', purple: '紫（神秘・両面）', gold: '金（達成・栄光）', silver: '銀／白（清明・純度）', black: '黒（覚悟・極限）', white: '白（純粋・清明）' },
  intensity: { red: '燃える赤の激しさ', blue: '静かな青の冷静さ', purple: '両面を持つ紫', clear: '透明な柔軟性' },
  life_pattern: { turbulent: '波乱万丈', peaceful: '穏やかな歩み', cyclical: '季節のように移ろう人生', rebirth: '嵐の後に虹を架けてきた再生の人生' },
  element: { fire: '火', water: '水', wind: '風', earth: '土・大地', light: '光', thunder: '雷', snow: '雪', mist: '霧', night: '夜' },
  home: { city: '都会の灯', countryside: '田舎の風景', sea: '海辺', mountain: '山岳', abroad: '異国の街', cosmos: '宇宙・銀河', undersea: '海底・深海', future_city: '未来都市', jungle: 'ジャングル', rain_city: '雨の街' },
  formative: { tokyo_dream: '都会への憧れで上京した原体験', province_to_tokyo: '九州・地方から上京して人の縁に育てられた原体験', father_conflict: '父との確執を乗り越えた原体験', mother_support: '母の支えで前に進めた原体験', nature_origin: '故郷の自然に育てられた原体験', abroad_awakening: '海外で価値観が変わった原体験', illness_setback: '大病・事故から再起した原体験', business_failure: '起業の挫折から立ち上がった原体験', mentor_meeting: 'メンターとの出会いという転機', poverty_overcome: '貧しさ・経済的困難を乗り越えた原体験', competition: 'スポーツや勝負ごとで自分を鍛えた原体験' },
  identity: { warrior: '戦士', sage: '賢者', mentor: '育成者', pioneer: '開拓者', guardian: '守護者' },
  joy: { work_success: '仕事の大成功', family_time: '家族・愛する人との時間', recognition: '誰かに認められた瞬間', challenge_done: '長年の挑戦を成し遂げたこと', love_meeting: '唯一無二の人との出会い', nature_joy: '故郷・自然の中で感じた喜び' },
  legacy: { business: '事業・会社・仕組み', family: '家族の絆・血筋', philosophy: '思想・哲学・本', art: '作品・芸術', disciples: '弟子・後輩・人材', craft: '職人技・技術の継承' },
  core: { promise: '「約束は必ず守る」という誓い', dream: '「夢は諦めない」という炎', care: '「人を大切にする」という核', truth: '「真実を追求する」という眼差し', family_pride: '家族と一族の誇り', self_oath: '自分自身との誓い', craftsmanship: '職人としての矜持・腕で生きる誇り' },
  animal: { lion: '獅子', eagle: '鷹', wolf: '狼', whale: '鯨', owl: '梟', dragon: '龍', tiger: '虎', phoenix: '不死鳥', butterfly: '蝶', turtle: '亀', deer: '鹿' }
}

function ja(type, value) {
  return (PROFILE_JA[type] && PROFILE_JA[type][value]) || null
}

export function composeVisionCommentary({
  topLabel,
  secondLabel,
  proposed,
  gender,
  profile,
  gift
}) {
  const { anchors } = extractFromGoals(proposed)
  const p = profile || {}

  // 主アンカー: 原体験 > GOAL本文の固有アンカー（父への恩返しなど）> その他
  const formativeJa = ja('formative', p.formative)
  const priorityKeys = ['父への恩返し', '母への恩返し', '家族との時間', '家族旅行', 'IPO', '上場', '勝ちパターン', 'AI-Driven', 'Agent OS', 'VisionX']
  let goalAnchor = null
  for (const k of priorityKeys) {
    if (anchors.includes(k)) { goalAnchor = k; break }
  }
  if (!goalAnchor && anchors.length) goalAnchor = anchors[0]

  const primaryPhrase = formativeJa
    ? `何よりも重要な${formativeJa}を象徴する記念碑${goalAnchor ? `、そしてあなた自身の言葉から立ち上がる「${goalAnchor}」` : ''}`
    : goalAnchor
      ? `何よりも重要な「${goalAnchor}」の記念碑`
      : 'あなたの志の核となる記念碑'

  const strengthsLine = secondLabel && secondLabel !== topLabel
    ? `あなたの「${topLabel}」と「${secondLabel}」の源泉`
    : `あなたの「${topLabel}」の源泉`

  // プロファイルから人物像の色合いを描写
  const personLine = (() => {
    const parts = []
    const colorJa = ja('color', p.color)
    const intensityJa = ja('intensity', p.intensity)
    const lifeJa = ja('life_pattern', p.life_pattern)
    const elementJa = ja('element', p.element)
    const homeJa = ja('home', p.home)
    const identityJa = ja('identity', p.identity)
    const animalJa = ja('animal', p.animal)
    if (colorJa || intensityJa) {
      parts.push(`色は${colorJa || '—'}、温度は${intensityJa || '—'}`)
    }
    if (lifeJa) parts.push(`歩みは${lifeJa}`)
    if (elementJa) parts.push(`核となるエレメントは${elementJa}`)
    if (homeJa) parts.push(`心の故郷は${homeJa}`)
    if (animalJa) parts.push(`内なる動物は${animalJa}`)
    if (identityJa) parts.push(`リーダーシップ・アーキタイプは${identityJa}`)
    if (parts.length === 0) return ''
    return `この絵に宿るあなたは、${parts.join('、')}としての姿です。`
  })()

  const legacyJa = ja('legacy', p.legacy)
  const legacyLine = legacyJa
    ? `あなたが残したい「${legacyJa}」が、画面の奥行きの中に静かに息づいています。`
    : ''

  const coreJa = ja('core', p.core)
  const coreLine = coreJa
    ? `あなたの核には${coreJa}があり、それがすべての光の源になっています。`
    : ''

  const others = anchors.filter(a => a !== goalAnchor).slice(0, 3)
  const othersLine = others.length
    ? `${others.map(o => `「${o}」`).join('、')}といったあなた自身の言葉から立ち上がった象徴も、同じ場の中に静かに配置されています。`
    : ''

  // ギフト（人から受けた誉め言葉・励まし）の引用
  const giftAnchors = extractGiftAnchors(gift)
  const giftLine = giftAnchors.length
    ? `そしてこの絵の中央で太陽のように光を放つのは、${giftAnchors.map(s => `「${s}」`).join('、')}という、あなたが大切な人から受け取った言葉です。あなたの強みは、まさにこの言葉に応えるかたちで、ここまで姿を取ってきました。`
    : ''

  return [
    `この一枚の絵は、単なるビジョンボードではなく、あなたの来歴・原体験・縁・職業観・強み・使命を一枚に封じた「人生の護符」です。汎用的なスピリチュアル・シンボルではなく、あなたという一人の固有の人生だけを反映するように設計されています。これこそが、${strengthsLine}です。`,
    '',
    personLine,
    coreLine,
    '',
    giftLine,
    giftLine ? '' : null,
    `${primaryPhrase}が、画面の中に静かに、しかし力強く存在しています。${othersLine}`,
    legacyLine,
    '',
    'この護符は、あなたが迷ったときに「この一枚に描かれた自分の核に近づくか？」で意思決定できる「判断基準」そのものです。家に飾る、スマホの待ち受けにする、お守りとして持つ、いずれの形でも機能します。'
  ].filter(s => s !== '').filter(s => s != null).join('\n')
}

// 公開: テーブル類（検証用）
export const IMAGE_PROMPT_TABLES = { NATURE, ARTIFICIAL, PHENOMENA, STRENGTH_AFFINITY, KEYWORD_ELEMENT_MAP }
