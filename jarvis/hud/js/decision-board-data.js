/* =====================================================================
 * VX 経営意思決定パネル — データ受け口（型定義・fetch関数・ダミー）
 * ---------------------------------------------------------------------
 * ここが visionX 実データへの差し替え箇所。decision-board.html 側は
 * この層が返すオブジェクトしか見ない。実データ接続時に触るのはこのファイルだけ。
 *
 *   ENDPOINTS.kpi        経営数字パイプラインの出力 JSON
 *   ENDPOINTS.minutes    議事録パイプラインの出力 JSON
 *   ENDPOINTS.decisions  （任意）KANBEI 等が出力する判断トレース JSON
 *
 * 各 fetch 関数は「取得できなければダミーを返す」。ダミーは必ず
 * isDummy: true を立て、値も実在しない桁（例 1234.5）で入れている。
 * 実在の経営数字をここに直書きしないこと。
 * ===================================================================== */

/* ---------------------------- 型定義（JSDoc） ------------------------ */

/**
 * 比較対象。計画（plan）または前期（prev）。
 * @typedef {Object} Comparison
 * @property {'plan'|'prev'} type
 * @property {string} label           表示名（例 "計画", "前年同期"）
 * @property {number|null} value      比較対象の値。未取得なら null
 * @property {number|null} diff       実績 - 比較対象。未取得なら null
 * @property {number|null} diffPct    差分率（%）。未取得なら null
 */

/**
 * 経営数字パイプラインの 1 指標。
 * @typedef {Object} KpiMetric
 * @property {string} id              一意キー（例 "sales_total"）
 * @property {string} name            指標名（例 "売上高"）
 * @property {string} group           グルーピング（例 "全社", "事業別"）
 * @property {number|null} value      実績値。未取得なら null
 * @property {string} unit            単位（例 "千円", "%"）
 * @property {string} period          対象期間（例 "2026年4月〜10月 累計"）
 * @property {Comparison[]} compare   比較対象（計画・前期）
 * @property {number[]} history       推移（古い→新しい）。無ければ []
 * @property {string} source          根拠ファイル／帳票名
 * @property {string} updatedAt       ISO 日時
 * @property {number} [warnPct]       差分率がこの値を下回ったら異常扱い（既定 -10）
 */

/**
 * @typedef {Object} KpiPayload
 * @property {boolean} isDummy
 * @property {string} generatedAt
 * @property {KpiMetric[]} metrics
 */

/**
 * 議事録パイプラインの宿題。
 * @typedef {Object} Homework
 * @property {string} id
 * @property {string} title
 * @property {string} owner           担当
 * @property {string|null} due        期限（YYYY-MM-DD）。未設定なら null
 * @property {'open'|'done'} status
 */

/**
 * 議事録パイプラインの 1 会議。
 * @typedef {Object} Minutes
 * @property {string} id
 * @property {string} meeting         会議名
 * @property {string} datetime        ISO 日時
 * @property {string[]} decisions     決定事項
 * @property {Homework[]} homework    宿題
 * @property {string[]} openIssues    未決事項
 * @property {string|null} link       元議事録へのリンク（obsidian:// や https://）
 */

/**
 * @typedef {Object} MinutesPayload
 * @property {boolean} isDummy
 * @property {string} generatedAt
 * @property {Minutes[]} minutes
 */

/**
 * 判断トレースの 1 件。目的 → 入力シグナル → 候補の評価 → 判断 → 実行ログ。
 * @typedef {Object} DecisionTrace
 * @property {string} id
 * @property {string} ts                     ISO 日時
 * @property {'info'|'warn'|'alert'} level
 * @property {string} purpose                目的
 * @property {{ref:string, label:string, kind:'kpi'|'minutes'}[]} signals   入力シグナル（根拠データ）
 * @property {{label:string, score:number, note:string}[]} candidates       候補の評価（score 0-100）
 * @property {string} decision               判断
 * @property {number} confidence             信頼度（0-100）
 * @property {string} confidenceBasis        信頼度の算出根拠（文章）
 * @property {{ts:string, text:string}[]} executions   実行ログ
 */

/**
 * @typedef {Object} DecisionsPayload
 * @property {boolean} isDummy
 * @property {DecisionTrace[]} traces
 */

/* ---------------------------- エンドポイント ------------------------ */

/**
 * 実データ接続時はここを visionX 側の出力パス／API に変える。
 * 相対パスのままなら hud/ 配下の静的 JSON を読む（serve.py / http-server 経由）。
 */
export const ENDPOINTS = {
  kpi: "data/decision-board/kpi.json",
  minutes: "data/decision-board/minutes.json",
  decisions: "data/decision-board/decisions.json",
};

/** ポーリング間隔（ms）。実データの更新頻度に合わせて変更する。 */
export const POLL_INTERVAL_MS = 15000;

/* ---------------------------- 取得関数 ------------------------------ */

async function fetchJson(url) {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
  return res.json();
}

/** @returns {Promise<KpiPayload>} */
export async function fetchKpis() {
  try {
    const raw = await fetchJson(ENDPOINTS.kpi);
    return normalizeKpi(raw);
  } catch (e) {
    console.info("[decision-board] KPI 実データ未接続のためダミーを使用:", e.message);
    return normalizeKpi(dummyKpi());
  }
}

/** @returns {Promise<MinutesPayload>} */
export async function fetchMinutes() {
  try {
    const raw = await fetchJson(ENDPOINTS.minutes);
    return normalizeMinutes(raw);
  } catch (e) {
    console.info("[decision-board] 議事録 実データ未接続のためダミーを使用:", e.message);
    return normalizeMinutes(dummyMinutes());
  }
}

/**
 * 判断トレースは任意入力。無ければ null を返し、画面側がルールベースで
 * KPI と議事録から派生トレースを組み立てる（その場合は信頼度に上限を掛ける）。
 * @returns {Promise<DecisionsPayload|null>}
 */
export async function fetchDecisions() {
  try {
    const raw = await fetchJson(ENDPOINTS.decisions);
    return {
      isDummy: !!raw.isDummy,
      source: raw.source || "kanbei",          // 誰が判断したか（画面のバッジに出す）
      model: raw.model ?? null,
      generatedAt: raw.generatedAt || null,
      inputs: raw.inputs || {},
      warnings: raw.warnings || [],
      traces: (raw.traces || []).map((t) => ({ ...t, source: t.source || raw.source || "kanbei" })),
    };
  } catch (e) {
    return null;
  }
}

/* ---------------------------- 正規化 -------------------------------- */
/* 実データの項目名がここで定義した型と違う場合は、この 2 関数で揃える。 */

function normalizeKpi(raw) {
  return {
    isDummy: !!raw.isDummy,
    generatedAt: raw.generatedAt || raw.generated_at || new Date().toISOString(),
    company: raw.company ?? null,        // {id, name}（アダプタが付ける。無ければ null）
    insider: !!raw.insider,              // 区分C（未公表数値）なら画面に警告バッジ
    section: raw.section ?? null,        // {key, label, range}
    warnings: raw.warnings || [],
    metrics: (raw.metrics || []).map((m) => ({
      id: m.id,
      name: m.name,
      group: m.group || "全社",
      value: m.value ?? null,
      unit: m.unit || "",
      period: m.period || "期間未取得",
      compare: (m.compare || []).map((c) => ({
        type: c.type,
        label: c.label || (c.type === "plan" ? "計画" : "前期"),
        value: c.value ?? null,
        // 実績と比較値が両方あれば必ず再計算（パイプライン側の diff と食い違わないように）
        diff: m.value != null && c.value != null ? m.value - c.value : c.diff ?? null,
        diffPct:
          m.value != null && c.value
            ? ((m.value - c.value) / Math.abs(c.value)) * 100
            : c.diffPct ?? null,
      })),
      history: m.history || [],
      source: m.source || "出典未取得",
      sourcePath: m.sourcePath ?? null,   // 出典ファイルのフルパス（あれば詳細で表示）
      card: m.card ?? m.group,            // 同じ指標を拠点横断で並べるためのカード名
      metricKey: m.metricKey ?? m.id,     // 指標種別（sales / gross_profit ...）
      updatedAt: m.updatedAt || m.updated_at || raw.generatedAt || "",
      warnPct: m.warnPct ?? -10,
    })),
  };
}

function normalizeMinutes(raw) {
  return {
    isDummy: !!raw.isDummy,
    generatedAt: raw.generatedAt || raw.generated_at || new Date().toISOString(),
    minutes: (raw.minutes || []).map((mt) => ({
      id: mt.id,
      meeting: mt.meeting,
      datetime: mt.datetime,
      decisions: mt.decisions || [],
      homework: (mt.homework || []).map((h) => ({
        id: h.id,
        title: h.title,
        owner: h.owner || "担当未取得",
        due: h.due ?? null,
        status: h.status || "open",
      })),
      openIssues: mt.openIssues || mt.open_issues || [],
      link: mt.link ?? null,
    })),
  };
}

/* ---------------------------- ダミー -------------------------------- */
/* 値は意図的に「実在しない桁」。画面には DUMMY バッジが常時出る。 */

const DUMMY_NOW = new Date();
const iso = (d) => d.toISOString();
const daysAgo = (n) => iso(new Date(DUMMY_NOW.getTime() - n * 86400000));
const ymd = (offsetDays) => {
  const d = new Date(DUMMY_NOW.getTime() + offsetDays * 86400000);
  return d.toISOString().slice(0, 10);
};

/** @returns {KpiPayload} */
export function dummyKpi() {
  return {
    isDummy: true,
    generatedAt: iso(DUMMY_NOW),
    metrics: [
      {
        id: "sales_total",
        name: "売上高（ダミー）",
        group: "全社",
        value: 1234.5,
        unit: "百万円",
        period: "2026年4月〜10月 累計（ダミー期間）",
        compare: [
          { type: "plan", label: "計画", value: 1300.0 },
          { type: "prev", label: "前年同期", value: 1180.0 },
        ],
        history: [150, 162, 171, 168, 180, 195, 208],
        source: "ダミー: 経営数字パイプライン sample",
        updatedAt: daysAgo(0),
      },
      {
        id: "op_profit",
        name: "営業利益（ダミー）",
        group: "全社",
        value: 98.7,
        unit: "百万円",
        period: "2026年4月〜10月 累計（ダミー期間）",
        compare: [
          { type: "plan", label: "計画", value: 120.0 },
          { type: "prev", label: "前年同期", value: 91.0 },
        ],
        history: [11, 13, 12, 15, 14, 16, 17.7],
        source: "ダミー: 経営数字パイプライン sample",
        updatedAt: daysAgo(0),
      },
      {
        id: "progress_rate",
        name: "通期進捗率（ダミー）",
        group: "全社",
        value: 56.8,
        unit: "%",
        period: "通期計画に対する 7ヶ月経過時点（ダミー）",
        compare: [{ type: "plan", label: "期間按分", value: 58.3 }],
        history: [8, 16, 24, 32, 41, 49, 56.8],
        source: "ダミー: 経営数字パイプライン sample",
        updatedAt: daysAgo(0),
      },
      {
        id: "seg_a",
        name: "事業A 売上（ダミー）",
        group: "事業別",
        value: 456.0,
        unit: "百万円",
        period: "2026年4月〜10月 累計（ダミー期間）",
        compare: [
          { type: "plan", label: "計画", value: 440.0 },
          { type: "prev", label: "前年同期", value: 410.0 },
        ],
        history: [55, 60, 63, 66, 70, 72, 70],
        source: "ダミー: 経営数字パイプライン sample",
        updatedAt: daysAgo(0),
      },
      {
        id: "seg_b",
        name: "事業B 売上（ダミー）",
        group: "事業別",
        value: 321.0,
        unit: "百万円",
        period: "2026年4月〜10月 累計（ダミー期間）",
        compare: [
          { type: "plan", label: "計画", value: 380.0 },
          { type: "prev", label: "前年同期", value: 350.0 },
        ],
        history: [52, 50, 48, 47, 44, 42, 38],
        source: "ダミー: 経営数字パイプライン sample",
        updatedAt: daysAgo(0),
      },
      {
        id: "seg_c",
        name: "事業C 売上（ダミー）",
        group: "事業別",
        value: null,
        unit: "百万円",
        period: "2026年4月〜10月 累計（ダミー期間）",
        compare: [{ type: "plan", label: "計画", value: null }],
        history: [],
        source: "ダミー: 未取得の表示確認用",
        updatedAt: "",
      },
    ],
  };
}

/** @returns {MinutesPayload} */
export function dummyMinutes() {
  return {
    isDummy: true,
    generatedAt: iso(DUMMY_NOW),
    minutes: [
      {
        id: "mt_001",
        meeting: "経営会議（ダミー）",
        datetime: daysAgo(3),
        decisions: [
          "事業Bの下期販促費を見直し、11月末までに再配分案を出す（ダミー）",
          "新規採用枚数は現行計画を維持（ダミー）",
        ],
        homework: [
          { id: "hw_001", title: "事業B 販促費 再配分案", owner: "ダミー担当A", due: ymd(-2), status: "open" },
          { id: "hw_002", title: "通期見込みの再計算", owner: "ダミー担当B", due: ymd(5), status: "open" },
          { id: "hw_003", title: "採用進捗の報告書", owner: "ダミー担当C", due: ymd(-9), status: "done" },
        ],
        openIssues: ["事業Cの数字が未収集（ダミー）"],
        link: null,
      },
      {
        id: "mt_002",
        meeting: "営業会議（ダミー）",
        datetime: daysAgo(1),
        decisions: ["大型案件Xの提案を12月第1週に実施（ダミー）"],
        homework: [
          { id: "hw_004", title: "案件X 提案書ドラフト", owner: "ダミー担当D", due: ymd(8), status: "open" },
        ],
        openIssues: [],
        link: null,
      },
    ],
  };
}

/**
 * ダミー運転中のみ、値を少し揺らして「更新時の連動」を見せるためのヘルパー。
 * 実データ接続時は呼ばれない（isDummy が false の payload には何もしない）。
 * @param {KpiPayload} payload
 * @returns {KpiPayload}
 */
export function jitterDummy(payload) {
  if (!payload.isDummy) return payload;
  const now = new Date().toISOString();
  return normalizeKpi({
    ...payload,
    generatedAt: now,
    metrics: payload.metrics.map((m) => {
      if (m.value == null) return m;
      const delta = (Math.random() - 0.5) * (m.unit === "%" ? 1.2 : m.value * 0.03);
      const value = Math.round((m.value + delta) * 10) / 10;
      const history = m.history.length ? [...m.history.slice(1), Math.max(0, m.history.at(-1) + delta)] : [];
      return { ...m, value, history, updatedAt: now };
    }),
  });
}
