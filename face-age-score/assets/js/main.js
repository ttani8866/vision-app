/* ==========================================================================
   FACE AGE SCORE — App Screen
   - iOS デバイスの装飾（ステータスバー／ダイナミックアイランド／ホームバー）を注入
   - 顔ゾーン診断：チップ選択で詳細パネルを切り替える
   - 改善アドバイス：守り（ホームケア）／攻め（美容施術）のタブ切替
   ========================================================================== */
(function () {
  'use strict';

  var STATUS_TIME = '9:41';

  var STATUS_ICONS =
    '<svg width="66" height="12" viewBox="0 0 66 12" fill="currentColor" aria-hidden="true">' +
    '<rect x="0" y="7.5" width="3" height="4.5" rx="1"></rect>' +
    '<rect x="4.5" y="5.5" width="3" height="6.5" rx="1"></rect>' +
    '<rect x="9" y="3" width="3" height="9" rx="1"></rect>' +
    '<rect x="13.5" y="0.5" width="3" height="11.5" rx="1"></rect>' +
    '<path d="M28.4 3.2c2.6 0 5 1 6.8 2.6l-1.3 1.4a8.1 8.1 0 0 0-11 0L21.6 5.8a10.1 10.1 0 0 1 6.8-2.6Z"></path>' +
    '<path d="M28.4 7.1c1.3 0 2.6.5 3.5 1.4l-1.4 1.4a3 3 0 0 0-4.2 0l-1.4-1.4a5 5 0 0 1 3.5-1.4Z"></path>' +
    '<circle cx="28.4" cy="11" r="1.1"></circle>' +
    '<rect x="44" y="1" width="19" height="10" rx="3" fill="none" stroke="currentColor" stroke-width="1" opacity=".4"></rect>' +
    '<rect x="45.5" y="2.5" width="14" height="7" rx="1.8"></rect>' +
    '<path d="M64.4 4.4v3.2a1.7 1.7 0 0 0 0-3.2Z" opacity=".4"></path>' +
    '</svg>';

  /* 顔ゾーンの診断データ（デザインの ZONES をそのまま移植） */
  var ZONES = [
    { id: 'hitai', name: '額', score: '7.5', color: 'var(--warn)', status: '注意',
      pos: { left: '8px', top: '32px' },
      metrics: [{ k: 'シワ', v: '7.5' }, { k: 'ハリ', v: '8.0' }],
      note: '横ジワが定着しはじめています。ボトックスとレチノールで進行を抑えられる段階です。' },
    { id: 'memoto', name: '目元', score: '7.0', color: 'var(--warn)', status: '注意',
      pos: { right: '8px', top: '106px' },
      metrics: [{ k: '小ジワ', v: '7.0' }, { k: 'ハリ', v: '7.5' }],
      note: '乾燥由来の小ジワ。夜の保湿とリンクルケアで改善が見込めます。' },
    { id: 'meshita', name: '目の下', score: '5.5', color: 'var(--pri)', status: '優先改善',
      pos: { right: '8px', top: '162px' },
      metrics: [{ k: '目袋', v: '5.5' }, { k: '影', v: '6.0' }],
      note: '膨らみと影が年齢印象を最も上げている部位。施術による改善が有効です。' },
    { id: 'hoho', name: '頬', score: '8.2', color: 'var(--ok)', status: '良好',
      pos: { left: '8px', top: '192px' },
      metrics: [{ k: '毛穴', v: '7.5' }, { k: 'ツヤ', v: '9.0' }],
      note: 'ツヤは非常に良好。毛穴は現在のケア継続で改善が期待できます。' },
    { id: 'hourei', name: 'ほうれい線', score: '6.5', color: 'var(--imp)', status: '改善余地',
      pos: { right: '8px', top: '228px' },
      metrics: [{ k: '深さ', v: '6.5' }, { k: '左右差', v: '7.0' }],
      note: '軽度。現段階では経過観察とハリケアで十分です。' },
    { id: 'line', name: 'フェイスライン', score: '8.0', color: 'var(--ok)', status: '良好',
      pos: { left: '8px', top: '294px' },
      metrics: [{ k: '輪郭', v: '8.0' }, { k: 'たるみ', v: '8.0' }],
      note: '輪郭は年齢に対して良好に保たれています。' }
  ];
  var DEFAULT_ZONE = 'meshita';

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function buildDeviceChrome() {
    var bodies = document.querySelectorAll('.device__body');
    Array.prototype.forEach.call(bodies, function (body) {
      var island = el('div', 'device__island');
      island.setAttribute('aria-hidden', 'true');
      var status = el('div', 'device__status');
      status.setAttribute('aria-hidden', 'true');
      status.innerHTML = '<span>' + STATUS_TIME + '</span>' + STATUS_ICONS;
      var home = el('div', 'device__home');
      home.setAttribute('aria-hidden', 'true');
      var screen = body.querySelector('.device__screen');
      if (screen) screen.appendChild(status);
      body.appendChild(island);
      body.appendChild(home);
    });
  }

  /* --- 顔ゾーン診断 ----------------------------------------------------- */
  function setupZones() {
    var face = document.getElementById('face');
    var detail = document.getElementById('zone-detail');
    if (!face || !detail) return;

    var statusEl = detail.querySelector('.zone-detail__status');
    var nameEl = detail.querySelector('.zone-detail__name');
    var metricsEl = detail.querySelector('.zone-detail__metrics');
    var noteEl = detail.querySelector('.zone-detail__note');
    var chips = {};

    function select(id) {
      var zone = null;
      ZONES.forEach(function (z) { if (z.id === id) zone = z; });
      if (!zone) return;

      Object.keys(chips).forEach(function (key) {
        chips[key].setAttribute('aria-pressed', key === id ? 'true' : 'false');
      });

      statusEl.textContent = zone.status;
      statusEl.style.background = zone.color;
      nameEl.textContent = zone.name;
      noteEl.textContent = zone.note;

      metricsEl.innerHTML = '';
      zone.metrics.forEach(function (m) {
        var item = el('div');
        item.appendChild(el('span', 'zone-detail__key', m.k));
        item.appendChild(document.createTextNode(' '));
        item.appendChild(el('span', 'zone-detail__val', m.v));
        metricsEl.appendChild(item);
      });
    }

    ZONES.forEach(function (z) {
      var chip = el('button', 'chip');
      chip.type = 'button';
      chip.setAttribute('aria-pressed', 'false');
      chip.setAttribute('aria-label', z.name + ' ' + z.score);
      Object.keys(z.pos).forEach(function (k) { chip.style[k] = z.pos[k]; });

      var dot = el('span', 'dot');
      dot.style.background = z.color;
      chip.appendChild(dot);
      chip.appendChild(document.createTextNode(z.name + ' '));
      chip.appendChild(el('span', 'chip__score', z.score));

      chip.addEventListener('click', function () { select(z.id); });
      face.appendChild(chip);
      chips[z.id] = chip;
    });

    select(DEFAULT_ZONE);
  }

  /* --- 改善アドバイスのタブ --------------------------------------------- */
  function setupTabs() {
    var tabs = document.querySelectorAll('.tab[data-tab]');
    if (!tabs.length) return;

    function activate(name) {
      Array.prototype.forEach.call(tabs, function (tab) {
        var on = tab.getAttribute('data-tab') === name;
        tab.setAttribute('aria-selected', on ? 'true' : 'false');
        tab.tabIndex = on ? 0 : -1;
      });
      Array.prototype.forEach.call(document.querySelectorAll('.tabpanel[data-panel]'), function (panel) {
        panel.hidden = panel.getAttribute('data-panel') !== name;
      });
    }

    Array.prototype.forEach.call(tabs, function (tab) {
      tab.addEventListener('click', function () { activate(tab.getAttribute('data-tab')); });
      tab.addEventListener('keydown', function (e) {
        if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
        var list = Array.prototype.slice.call(tabs);
        var i = list.indexOf(tab);
        var next = list[(i + (e.key === 'ArrowRight' ? 1 : list.length - 1)) % list.length];
        next.focus();
        activate(next.getAttribute('data-tab'));
      });
    });

    activate('mamori');
  }

  function init() {
    buildDeviceChrome();
    setupZones();
    setupTabs();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
