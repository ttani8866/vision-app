/* ==========================================================================
   FACE AGE SCORE — 静的配信＋写真AI分析API
   - GET  /*            : このフォルダの静的ファイルを配信
   - POST /api/analyze  : { image: dataURL } を受け取り、Claude で10軸採点して JSON を返す
   - APIキーは環境変数 ANTHROPIC_API_KEY（または同フォルダの .env）から読む。
     未設定時は mock-analysis.json を返し、レスポンスに mock:true を付ける。
   ========================================================================== */
'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');

loadDotEnv(path.join(__dirname, '.env'));

const AnthropicMod = require('@anthropic-ai/sdk');
const Anthropic = AnthropicMod.default || AnthropicMod;
const { z } = require('zod');
const { zodOutputFormat } = require('@anthropic-ai/sdk/helpers/zod');

const PORT = Number(process.env.PORT) || 8150;
const MODEL = process.env.FAS_MODEL || 'claude-opus-5';
const HAS_CREDENTIALS = Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);
const MAX_BODY = 12 * 1024 * 1024;

/* --------------------------------------------------------------------------
   分析結果のスキーマ（docs/analysis-design.md §4）
   -------------------------------------------------------------------------- */
const AXIS_KEYS = ['tsuya', 'hari', 'kime', 'keana', 'kusumi', 'shimi', 'shiwa', 'mebukuro', 'hourei', 'faceline'];
const ZONE_IDS = ['hitai', 'memoto', 'meshita', 'hoho', 'hourei', 'line'];

const AnalysisSchema = z.object({
  photo_quality: z.object({
    usable: z.boolean().describe('顔全体が写り、採点に使える写真か'),
    lighting: z.enum(['良好', 'やや暗い', '逆光', '不均一']),
    notes: z.string().describe('写真の状態と、採点に影響した点を1〜2文'),
  }),
  confidence: z.enum(['high', 'medium', 'low']),
  apparent_age: z.number().describe('見た目年齢の推定（整数）'),
  skin_age: z.number().describe('肌年齢の推定（整数）'),
  total_score: z.number().describe('総合スコア 0〜100（整数）'),
  summary: z.string().describe('総評を1文。良い点と最大の改善余地'),
  axes: z.array(z.object({
    key: z.enum(AXIS_KEYS),
    score: z.number().describe('0〜10、0.5刻み'),
    comment: z.string().describe('根拠を1文'),
  })).describe('10軸すべてを、tsuya から faceline の順に1件ずつ'),
  zones: z.array(z.object({
    id: z.enum(ZONE_IDS),
    status: z.enum(['良好', '注意', '改善余地', '優先改善']),
    score: z.number().describe('0〜10'),
    metrics: z.array(z.object({ k: z.string(), v: z.number() })).describe('そのゾーンの指標を2件'),
    note: z.string().describe('状態と対処の方向性を1〜2文'),
  })).describe('6ゾーンすべてを1件ずつ'),
  strengths: z.array(z.string()).describe('良好な点を最大3件'),
  issues: z.array(z.object({
    axis: z.enum(AXIS_KEYS),
    name: z.string(),
    current: z.number(),
    target: z.number(),
    reason: z.string(),
  })).describe('優先して改善すべき課題を、影響の大きい順に最大3件'),
  priority_order: z.array(z.string()).describe('部位・肌質の改善優先順を最大5件'),
  home_care: z.object({
    morning: z.array(z.string()).describe('朝のルーティンを順番に最大5件'),
    night: z.array(z.string()).describe('夜のルーティンを順番に最大5件'),
    ingredients: z.array(z.string()).describe('推奨成分を最大4件'),
    note: z.string(),
  }),
  procedures: z.array(z.object({
    name: z.string(),
    aim: z.string(),
    target: z.string(),
    priority: z.enum(['高', '中', '低']),
    price_hint: z.string().describe('日本の一般的な価格帯の目安'),
    downtime: z.string(),
    when: z.string().describe('おすすめ時期。例: 10月'),
  })).describe('必要な施術のみ、優先度順に最大4件'),
  cautions: z.string().describe('医療上の注意。断定を避け、必要なら受診を促す'),
});

const SYSTEM_PROMPT = [
  'あなたは美容皮膚科のカウンセリングを補助する「見た目評価アシスタント」です。',
  '正面の顔写真から、肌と輪郭の状態を10の評価軸で採点し、課題と改善アドバイスをまとめます。',
  '',
  '前提',
  '- これは医療診断ではなく、写真からの推定・参考評価です。疾患名の断定や治療の指示はしません。',
  '- 写真で見える範囲だけを根拠にし、見えないことは推測しません。照明・角度・解像度で判断しにくい軸は 6〜7 点に寄せ、confidence を下げます。',
  '- 表現は丁寧で具体的に。不安をあおらず、良い点も必ず挙げます。',
  '- 出力はすべて日本語。',
  '',
  '評価軸（0〜10点、0.5刻み、目標帯は 8.5〜9.0）',
  '- tsuya ツヤ：頬・額の光の反射が均一で自然なら高い',
  '- hari ハリ：頬の丸みと張り。たるみの兆候があれば下げる',
  '- kime キメ：表面の細かさ。粗さ・ざらつきがあれば下げる',
  '- keana 毛穴：鼻・頬の毛穴の目立ち、開き、黒ずみ',
  '- kusumi くすみ：透明感、黄ぐすみ、色ムラ',
  '- shimi シミ：色素沈着の数・濃さ・範囲',
  '- shiwa シワ：額の横ジワ、眉間、目尻の小ジワ',
  '- mebukuro 目袋：目の下の膨らみ、影、クマ',
  '- hourei ほうれい線：鼻横から口角への溝の深さ',
  '- faceline フェイスライン：顎の輪郭の明瞭さ、二重顎、左右差',
  '',
  'ゾーン（6か所）',
  '- hitai 額 / memoto 目元 / meshita 目の下 / hoho 頬 / hourei ほうれい線 / line フェイスライン',
  '- status は 良好(8以上) / 注意(7〜7.9) / 改善余地(6〜6.9) / 優先改善(6未満) を目安に',
  '',
  '総合スコア',
  '- 10軸の平均×10 を基本に、年齢印象に効く軸（目袋・ほうれい線・シワ・ハリ・フェイスライン）をやや重く見て 0〜100 の整数で出します。',
  '',
  '改善アドバイス',
  '- home_care は朝・夜それぞれ順番どおりに。成分は日本で入手しやすいものを挙げます。',
  '- procedures は課題に対応する施術だけを、優先度順に最大4件。価格帯は日本の一般的な目安で幅を持たせ、ダウンタイムを添えます。',
  '- issues は影響の大きい順に最大3件。current は該当軸の score、target は 8.5〜9.0 の範囲で現実的な値にします。',
  '',
  '写真が使えない場合（顔が写っていない、極端に暗い等）は photo_quality.usable=false、confidence=low とし、各スコアは 7 前後の中央値で埋めて、notes に再撮影の案内を書きます。',
].join('\n');

const USER_PROMPT = 'この正面の顔写真を、上記の評価軸で採点し、課題と改善アドバイスをまとめてください。写真は本人の同意のもと提出されています。';

/* --------------------------------------------------------------------------
   分析
   -------------------------------------------------------------------------- */
let client = null;
function getClient() {
  if (!client) client = new Anthropic();
  return client;
}

async function analyze(image) {
  if (!HAS_CREDENTIALS) {
    const mock = JSON.parse(fs.readFileSync(path.join(__dirname, 'mock-analysis.json'), 'utf8'));
    return { mock: true, model: null, result: mock };
  }

  const { mediaType, data } = parseDataUrl(image);

  const response = await getClient().messages.parse({
    model: MODEL,
    max_tokens: 16000,
    system: SYSTEM_PROMPT,
    output_config: { format: zodOutputFormat(AnalysisSchema) },
    messages: [{
      role: 'user',
      content: [
        { type: 'image', source: { type: 'base64', media_type: mediaType, data } },
        { type: 'text', text: USER_PROMPT },
      ],
    }],
  });

  if (response.stop_reason === 'refusal') {
    const err = new Error('この写真は分析できませんでした。別の写真でお試しください。');
    err.status = 422;
    throw err;
  }
  if (!response.parsed_output) {
    const err = new Error('分析結果の形式が不正でした。もう一度お試しください。');
    err.status = 502;
    throw err;
  }
  return { mock: false, model: response.model, result: normalize(response.parsed_output), usage: response.usage };
}

/* スキーマでは表せない制約（件数・並び・丸め）をここで整える */
function normalize(r) {
  const byKey = {};
  r.axes.forEach(function (a) { byKey[a.key] = a; });
  r.axes = AXIS_KEYS.map(function (k) {
    return byKey[k] || { key: k, score: 7, comment: '判定が難しいため中央値としました。' };
  }).map(function (a) { return Object.assign({}, a, { score: clamp(round5(a.score), 0, 10) }); });

  const byZone = {};
  r.zones.forEach(function (z) { byZone[z.id] = z; });
  r.zones = ZONE_IDS.map(function (id) {
    return byZone[id] || { id: id, status: '注意', score: 7, metrics: [], note: '判定が難しいため中央値としました。' };
  }).map(function (z) { return Object.assign({}, z, { score: clamp(round5(z.score), 0, 10), metrics: z.metrics.slice(0, 3) }); });

  r.total_score = clamp(Math.round(r.total_score), 0, 100);
  r.apparent_age = Math.round(r.apparent_age);
  r.skin_age = Math.round(r.skin_age);
  r.strengths = r.strengths.slice(0, 3);
  r.issues = r.issues.slice(0, 3);
  r.priority_order = r.priority_order.slice(0, 5);
  r.home_care.morning = r.home_care.morning.slice(0, 5);
  r.home_care.night = r.home_care.night.slice(0, 5);
  r.home_care.ingredients = r.home_care.ingredients.slice(0, 4);
  r.procedures = r.procedures.slice(0, 4);
  return r;
}
function round5(n) { return Math.round(Number(n) * 2) / 2; }
function clamp(n, lo, hi) { return Math.min(hi, Math.max(lo, Number.isFinite(n) ? n : lo)); }

function parseDataUrl(url) {
  const m = /^data:(image\/(?:jpeg|png|webp|gif));base64,([A-Za-z0-9+/=]+)$/.exec(String(url || ''));
  if (!m) {
    const err = new Error('画像の形式が不正です（JPEG/PNG/WebP/GIF の data URL が必要）。');
    err.status = 400;
    throw err;
  }
  return { mediaType: m[1], data: m[2] };
}

/* --------------------------------------------------------------------------
   HTTP
   -------------------------------------------------------------------------- */
const MIME = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.md': 'text/markdown; charset=utf-8',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.svg': 'image/svg+xml', '.ico': 'image/x-icon',
};

function sendJson(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(body));
}

function readBody(req) {
  return new Promise(function (resolve, reject) {
    let size = 0;
    const chunks = [];
    req.on('data', function (c) {
      size += c.length;
      if (size > MAX_BODY) { reject(Object.assign(new Error('画像が大きすぎます（12MBまで）。'), { status: 413 })); req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', function () { resolve(Buffer.concat(chunks).toString('utf8')); });
    req.on('error', reject);
  });
}

async function handleAnalyze(req, res) {
  let body;
  try { body = JSON.parse(await readBody(req)); }
  catch (e) { return sendJson(res, e.status || 400, { error: e.status ? e.message : 'リクエスト本文が不正です。' }); }

  const started = Date.now();
  try {
    const out = await analyze(body.image);
    sendJson(res, 200, Object.assign({ ok: true, elapsed_ms: Date.now() - started, analyzed_at: new Date().toISOString() }, out));
  } catch (e) {
    let status = e.status || 500;
    let message = e.message || '分析に失敗しました。';
    if (e instanceof Anthropic.AuthenticationError) { status = 401; message = 'APIキーが無効です。ANTHROPIC_API_KEY を確認してください。'; }
    else if (e instanceof Anthropic.RateLimitError) { status = 429; message = 'アクセスが集中しています。しばらくして再試行してください。'; }
    else if (e instanceof Anthropic.BadRequestError) { status = 400; message = 'リクエストが不正です: ' + e.message; }
    else if (e instanceof Anthropic.APIError) { status = e.status || 502; message = 'API エラー: ' + e.message; }
    console.error('[analyze]', status, message);
    sendJson(res, status, { ok: false, error: message });
  }
}

function serveStatic(req, res) {
  const urlPath = decodeURIComponent(req.url.split('?')[0]);
  let filePath = path.normalize(path.join(__dirname, urlPath === '/' ? 'index.html' : urlPath));
  if (!filePath.startsWith(__dirname)) { res.writeHead(403); return res.end(); }
  if (/[\\/](node_modules|\.env)/.test(filePath.slice(__dirname.length))) { res.writeHead(404); return res.end(); }
  fs.stat(filePath, function (err, stat) {
    if (err || !stat.isFile()) { res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }); return res.end('Not found'); }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(filePath).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
    fs.createReadStream(filePath).pipe(res);
  });
}

const server = http.createServer(function (req, res) {
  if (req.url.startsWith('/api/analyze')) {
    if (req.method !== 'POST') return sendJson(res, 405, { ok: false, error: 'POST のみ' });
    return handleAnalyze(req, res);
  }
  if (req.url.startsWith('/api/status')) {
    return sendJson(res, 200, { ok: true, mock: !HAS_CREDENTIALS, model: HAS_CREDENTIALS ? MODEL : null });
  }
  if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405); return res.end(); }
  serveStatic(req, res);
});

server.listen(PORT, function () {
  console.log('FACE AGE SCORE  http://localhost:' + PORT);
  console.log(HAS_CREDENTIALS
    ? '分析API: 有効（model=' + MODEL + '）'
    : '分析API: デモモード（ANTHROPIC_API_KEY 未設定。face-age-score/.env に設定すると実分析になります）');
});

/* .env（KEY=VALUE 形式）を読み込む。既に設定済みの環境変数は上書きしない。 */
function loadDotEnv(file) {
  let text;
  try { text = fs.readFileSync(file, 'utf8'); } catch (e) { return; }
  text.split(/\r?\n/).forEach(function (line) {
    const m = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/.exec(line);
    if (!m || line.trim().startsWith('#')) return;
    let v = m[2];
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    if (process.env[m[1]] === undefined) process.env[m[1]] = v;
  });
}
