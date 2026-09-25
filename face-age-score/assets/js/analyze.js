/* ==========================================================================
   FACE AGE SCORE — 写真AI分析（フロント）
   - 顔写真が入ると「写真をAI分析する」ボタンを有効化
   - POST /api/analyze の結果を画面各所へ反映（docs/analysis-design.md §5）
   - 結果は localStorage に latest / previous として保存し、前回比を出す
   ========================================================================== */
(function () {
  'use strict';

  var KEY_LATEST = 'analysis:latest';
  var KEY_PREVIOUS = 'analysis:previous';
  var PHOTO_KEY = 'slot-photo:face-photo';

  var AXES = [
    { key: 'tsuya', name: 'ツヤ' }, { key: 'hari', name: 'ハリ' }, { key: 'kime', name: 'キメ' },
    { key: 'keana', name: '毛穴' }, { key: 'kusumi', name: 'くすみ' }, { key: 'shimi', name: 'シミ' },
    { key: 'shiwa', name: 'シワ' }, { key: 'mebukuro', name: '目袋' }, { key: 'hourei', name: 'ほうれい線' },
    { key: 'faceline', name: 'フェイスライン' }
  ];
  var ZONE_NAMES = { hitai: '額', memoto: '目元', meshita: '目の下', hoho: '頬', hourei: 'ほうれい線', line: 'フェイスライン' };
  var STATUS_COLOR = { '良好': 'var(--ok)', '注意': 'var(--warn)', '改善余地': 'var(--imp)', '優先改善': 'var(--pri)' };
  var PRIO_CLASS = ['prio--pri', 'prio--imp', 'prio--warn'];
  var RADAR_CX = 160, RADAR_CY = 145, RADAR_R = 90;

  function $(id) { return document.getElementById(id); }
  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined) n.textContent = text;
    return n;
  }
  function fmt1(n) { return (Math.round(n * 10) / 10).toFixed(1); }
  function readJson(key) { try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch (e) { return null; } }
  function writeJson(key, v) { try { if (v) localStorage.setItem(key, JSON.stringify(v)); else localStorage.removeItem(key); } catch (e) { /* 無視 */ } }
  function facePhoto() {
    var img = document.querySelector('.slot[data-slot="face-photo"] img');
    if (img && img.src) return img.src;
    try { return localStorage.getItem(PHOTO_KEY); } catch (e) { return null; }
  }
  function todayLabel(iso) {
    var d = iso ? new Date(iso) : new Date();
    return d.getFullYear() + '/' + String(d.getMonth() + 1).padStart(2, '0') + '/' + String(d.getDate()).padStart(2, '0');
  }

  /* --- ボタンと状態表示 --------------------------------------------------- */
  var btn, status, serverMock = false;

  function setStatus(kind, text) {
    status.className = 'analyze__status' + (kind ? ' analyze__status--' + kind : '');
    status.textContent = text || '';
    status.hidden = !text;
  }
  function refreshButton() {
    var has = Boolean(facePhoto());
    btn.disabled = !has;
    btn.title = has ? '' : '先に顔写真を入れてください';
  }

  async function run() {
    var image = facePhoto();
    if (!image) return;
    btn.disabled = true;
    btn.classList.add('is-busy');
    setStatus('busy', serverMock ? 'デモ結果を生成しています…' : 'AIが写真を分析しています（10〜40秒）…');
    try {
      var res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: image })
      });
      var data = await res.json().catch(function () { return {}; });
      if (!res.ok || !data.ok) throw new Error(data.error || ('分析に失敗しました（HTTP ' + res.status + '）'));

      var record = { result: data.result, analyzed_at: data.analyzed_at, mock: data.mock, model: data.model };
      var prev = readJson(KEY_LATEST);
      if (prev) writeJson(KEY_PREVIOUS, prev);
      writeJson(KEY_LATEST, record);
      apply(record, prev);
      setStatus(data.mock ? 'mock' : 'ok', data.mock
        ? 'デモ結果を表示中（APIキー未設定）。face-age-score/.env に ANTHROPIC_API_KEY を設定すると実分析になります。'
        : '分析完了（' + Math.round(data.elapsed_ms / 1000) + '秒・' + (data.model || '') + '）。確度: ' + confidenceLabel(data.result.confidence) + ' / 写真: ' + data.result.photo_quality.lighting);
    } catch (e) {
      setStatus('error', e.message || '分析に失敗しました。');
    } finally {
      btn.classList.remove('is-busy');
      refreshButton();
    }
  }
  function confidenceLabel(c) { return c === 'high' ? '高' : c === 'medium' ? '中' : '低'; }

  /* --- 画面への反映 ------------------------------------------------------- */
  function apply(record, prevRecord) {
    var r = record.result;
    var prev = prevRecord && prevRecord.result;

    document.body.classList.add('is-analyzed');
    $('header-date').textContent = todayLabel(record.analyzed_at) + ' 分析';

    /* 総合スコア */
    $('hero-score').textContent = r.total_score;
    $('hero-bar').style.width = r.total_score + '%';
    var delta = $('hero-delta');
    if (prev) {
      var d = r.total_score - prev.total_score;
      delta.innerHTML = '';
      delta.appendChild(document.createTextNode((d >= 0 ? '+' : '−') + Math.abs(d) + 'pt '));
      delta.appendChild(el('span', 'pill__unit', '前回比'));
      delta.className = 'pill ' + (d >= 0 ? 'pill--ok' : 'pill--pri');
    } else {
      delta.innerHTML = '';
      delta.appendChild(document.createTextNode('初回'));
      delta.appendChild(el('span', 'pill__unit', record.mock ? 'デモ' : '分析'));
      delta.className = 'pill pill--ok';
    }
    $('kpi-age').firstChild.nodeValue = r.apparent_age;
    $('kpi-skin').firstChild.nodeValue = r.skin_age;
    renderAgeDelta(r);
    var rate = $('kpi-rate');
    if (prev && prev.total_score) {
      var pct = (r.total_score - prev.total_score) / prev.total_score * 100;
      rate.firstChild.nodeValue = (pct >= 0 ? '+' : '−') + fmt1(Math.abs(pct));
      rate.className = 'grid3__val ' + (pct >= 0 ? 'grid3__val--ok' : 'grid3__val--pri');
    } else {
      rate.firstChild.nodeValue = '—';
      rate.className = 'grid3__val';
    }
    $('hero-note').textContent = r.summary;

    /* 顔ゾーン：まず AI の位置で表示し、端末内のランドマーク検出が成功したらその位置に置き直す */
    if (window.FAS && window.FAS.setZones) {
      var toZones = function (pointsById) {
        return r.zones.map(function (z) {
          return {
            id: z.id, name: ZONE_NAMES[z.id] || z.id, score: fmt1(z.score),
            color: STATUS_COLOR[z.status] || 'var(--mut)', status: z.status,
            metrics: z.metrics.map(function (m) { return { k: m.k, v: fmt1(m.v) }; }),
            note: z.note,
            point: (pointsById && pointsById[z.id]) || z.point || null
          };
        });
      };
      window.FAS.setZones(toZones(null), worstZone(r.zones));
      var faceImg = document.querySelector('.slot[data-slot="face-photo"] img');
      if (faceImg && window.FAS.detectZonePoints) {
        var whenLoaded = faceImg.complete ? Promise.resolve() : new Promise(function (res) { faceImg.addEventListener('load', res, { once: true }); });
        whenLoaded.then(function () { return window.FAS.detectZonePoints(faceImg); }).then(function (pts) {
          if (pts) window.FAS.setZones(toZones(pts), worstZone(r.zones));
        });
      }
    }

    /* レーダー */
    var byKey = {};
    r.axes.forEach(function (a) { byKey[a.key] = a; });
    var lowest = null;
    var pts = AXES.map(function (ax, i) {
      var a = byKey[ax.key] || { score: 7 };
      if (!lowest || a.score < lowest.score) lowest = { key: ax.key, score: a.score, i: i };
      var ang = -Math.PI / 2 + i * (Math.PI * 2 / AXES.length);
      var rad = RADAR_R * (a.score / 10);
      return [RADAR_CX + rad * Math.cos(ang), RADAR_CY + rad * Math.sin(ang)];
    });
    $('radar-area').setAttribute('points', pts.map(function (p) { return p[0].toFixed(1) + ',' + p[1].toFixed(1); }).join(' '));
    var lp = pts[lowest.i];
    $('radar-point').setAttribute('cx', lp[0].toFixed(1)); $('radar-point').setAttribute('cy', lp[1].toFixed(1));
    $('radar-ring').setAttribute('cx', lp[0].toFixed(1)); $('radar-ring').setAttribute('cy', lp[1].toFixed(1));
    Array.prototype.forEach.call(document.querySelectorAll('#radar-labels text[data-axis]'), function (t) {
      var key = t.getAttribute('data-axis');
      var name = AXES.filter(function (a) { return a.key === key; })[0].name;
      t.textContent = name + ' ' + fmt1((byKey[key] || { score: 7 }).score);
      t.classList.toggle('radar__label--alert', key === lowest.key);
    });

    /* 改善優先順位 */
    var list = $('prio-list');
    list.innerHTML = '';
    r.issues.forEach(function (it, i) {
      var row = el('div', 'prio ' + (PRIO_CLASS[i] || 'prio--warn'));
      row.appendChild(el('span', 'prio__num', String(i + 1)));
      row.appendChild(el('span', 'prio__name', it.name));
      row.appendChild(el('span', 'prio__delta', fmt1(it.current) + ' → ' + fmt1(it.target)));
      list.appendChild(row);
    });

    /* AI診断コメント */
    $('ai-current').textContent = r.summary + (r.photo_quality.usable ? '' : '（写真の状態が不十分なため参考値です）');
    var improved = $('ai-improved');
    improved.innerHTML = '';
    if (prev) {
      var prevBy = {};
      prev.axes.forEach(function (a) { prevBy[a.key] = a.score; });
      $('ai-improved-label').textContent = '② 改善された点';
      var any = false;
      r.axes.forEach(function (a) {
        var dd = a.score - (prevBy[a.key] === undefined ? a.score : prevBy[a.key]);
        if (dd >= 0.5) { any = true; improved.appendChild(el('span', 'tag tag--num tag--ok', axisName(a.key) + ' +' + fmt1(dd))); }
      });
      if (!any) improved.appendChild(el('span', 'tag tag--ok', '前回から大きな変化なし'));
    } else {
      $('ai-improved-label').textContent = '② 良好な点';
      r.strengths.forEach(function (s) { improved.appendChild(el('span', 'tag tag--ok', s)); });
    }
    var issues = $('ai-issues');
    issues.innerHTML = '';
    r.issues.forEach(function (it, i) {
      issues.appendChild(el('span', 'tag ' + (['tag--pri', 'tag--imp', 'tag--warn'][i] || 'tag--warn'), it.name));
    });
    var order = $('ai-order');
    order.innerHTML = '';
    r.priority_order.forEach(function (p, i) {
      if (i) order.appendChild(el('span', null, '＞'));
      order.appendChild(document.createTextNode(p));
    });
    $('ai-cautions').textContent = r.cautions;
    $('ai-cautions').hidden = !r.cautions;

    /* 守り：ホームケア */
    $('care-morning').innerHTML = r.home_care.morning.map(escapeHtml).join('<br>');
    $('care-night').innerHTML = r.home_care.night.map(escapeHtml).join('<br>');
    var ing = $('care-ingredients');
    ing.innerHTML = '';
    r.home_care.ingredients.forEach(function (s) { ing.appendChild(el('span', 'badge', s)); });
    $('care-note').textContent = r.home_care.note;
    $('care-note').hidden = !r.home_care.note;

    /* 攻め：施術 */
    var procs = $('proc-list');
    procs.innerHTML = '';
    r.procedures.forEach(function (p) {
      var card = el('div', 'proc');
      var head = el('div', 'row');
      head.appendChild(el('span', 'proc__name', p.name));
      head.appendChild(el('span', 'push badge badge--' + ({ '高': 'pri', '中': 'imp', '低': 'warn' }[p.priority] || 'warn'), '優先度 ' + p.priority));
      card.appendChild(head);
      card.appendChild(el('div', 'proc__aim', '目的：' + p.aim + '　／　改善対象：' + p.target));
      var grid = el('div', 'proc__grid');
      grid.appendChild(cell('想定価格', p.price_hint, 'proc__val--price'));
      grid.appendChild(cell('ダウンタイム', p.downtime, ''));
      grid.appendChild(cell('おすすめ時期', p.when, 'proc__val--when'));
      card.appendChild(grid);
      procs.appendChild(card);
    });

    /* 分析メタ */
    var meta = $('analysis-meta');
    meta.hidden = false;
    meta.textContent = (record.mock ? 'デモ結果' : 'AI分析') + ' ' + todayLabel(record.analyzed_at) +
      ' ／ 確度 ' + confidenceLabel(r.confidence) + ' ／ 写真 ' + r.photo_quality.lighting +
      (r.photo_quality.notes ? ' ／ ' + r.photo_quality.notes : '');
  }
  /* 実年齢との差。実年齢は端末内にだけ保存し、AI には送らない（推定へのバイアスを避ける） */
  var AGE_KEY = 'profile:age';
  function actualAge() { try { var v = parseInt(localStorage.getItem(AGE_KEY), 10); return v > 0 ? v : null; } catch (e) { return null; } }
  function renderAgeDelta(r) {
    var age = actualAge();
    var a = $('kpi-age-delta'), s = $('kpi-skin-delta');
    if (!a || !s) return;
    if (!age || !r) { a.textContent = ''; s.textContent = ''; return; }
    var da = r.apparent_age - age, ds = r.skin_age - age;
    a.textContent = '実年齢' + (da === 0 ? '相当' : (da > 0 ? ' +' : ' −') + Math.abs(da));
    s.textContent = '実年齢' + (ds === 0 ? '相当' : (ds > 0 ? ' +' : ' −') + Math.abs(ds));
    a.className = 'grid3__sub ' + (da <= 0 ? 'grid3__sub--ok' : 'grid3__sub--pri');
    s.className = 'grid3__sub ' + (ds <= 0 ? 'grid3__sub--ok' : 'grid3__sub--pri');
  }
  function setupAgeInput() {
    var input = $('age-input');
    if (!input) return;
    var v = actualAge();
    if (v) input.value = v;
    input.addEventListener('change', function () {
      var n = parseInt(input.value, 10);
      try { if (n > 0) localStorage.setItem(AGE_KEY, String(n)); else localStorage.removeItem(AGE_KEY); } catch (e) { /* 無視 */ }
      var latest = readJson(KEY_LATEST);
      renderAgeDelta(latest && latest.result);
    });
  }

  function cell(k, v, cls) {
    var c = el('div', 'proc__cell');
    c.appendChild(el('div', 'proc__key', k));
    c.appendChild(el('div', 'proc__val ' + cls, v));
    return c;
  }
  function axisName(key) { return AXES.filter(function (a) { return a.key === key; })[0].name; }
  function worstZone(zones) {
    var w = zones[0];
    zones.forEach(function (z) { if (z.score < w.score) w = z; });
    return w && w.id;
  }
  function escapeHtml(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  /* --- 初期化 ------------------------------------------------------------- */
  function init() {
    btn = $('analyze-btn');
    status = $('analyze-status');
    if (!btn) return;

    btn.addEventListener('click', run);
    refreshButton();
    setupAgeInput();
    document.addEventListener('slot:change', refreshButton);

    fetch('/api/status').then(function (r) { return r.json(); }).then(function (s) {
      serverMock = Boolean(s.mock);
      if (serverMock) setStatus('mock', 'APIキー未設定のためデモ結果になります（face-age-score/.env に ANTHROPIC_API_KEY を設定）。');
    }).catch(function () {
      setStatus('error', '分析サーバーに接続できません。node server.js で起動してください。');
    });

    var latest = readJson(KEY_LATEST);
    if (latest) apply(latest, readJson(KEY_PREVIOUS));
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
