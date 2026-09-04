/* ==========================================================================
   1% BODY — App Screens
   - iOS デバイスの装飾（ステータスバー／ダイナミックアイランド／ホームバー）を注入
   - ツールバーから各アートボードへスクロール、表示中の画面をハイライト
   ========================================================================== */
(function () {
  'use strict';

  var STATUS_TIME = '9:41';

  /* ステータスバー右側のアイコン。色は currentColor を継承する。 */
  var STATUS_ICONS =
    '<svg width="66" height="12" viewBox="0 0 66 12" fill="currentColor" aria-hidden="true">' +
    /* 電波 */
    '<rect x="0" y="7.5" width="3" height="4.5" rx="1"></rect>' +
    '<rect x="4.5" y="5.5" width="3" height="6.5" rx="1"></rect>' +
    '<rect x="9" y="3" width="3" height="9" rx="1"></rect>' +
    '<rect x="13.5" y="0.5" width="3" height="11.5" rx="1"></rect>' +
    /* Wi-Fi */
    '<path d="M28.4 3.2c2.6 0 5 1 6.8 2.6l-1.3 1.4a8.1 8.1 0 0 0-11 0L21.6 5.8a10.1 10.1 0 0 1 6.8-2.6Z"></path>' +
    '<path d="M28.4 7.1c1.3 0 2.6.5 3.5 1.4l-1.4 1.4a3 3 0 0 0-4.2 0l-1.4-1.4a5 5 0 0 1 3.5-1.4Z"></path>' +
    '<circle cx="28.4" cy="11" r="1.1"></circle>' +
    /* バッテリー */
    '<rect x="44" y="1" width="19" height="10" rx="3" fill="none" stroke="currentColor" stroke-width="1" opacity=".4"></rect>' +
    '<rect x="45.5" y="2.5" width="14" height="7" rx="1.8"></rect>' +
    '<path d="M64.4 4.4v3.2a1.7 1.7 0 0 0 0-3.2Z" opacity=".4"></path>' +
    '</svg>';

  function buildDeviceChrome() {
    var bodies = document.querySelectorAll('.device__body');

    Array.prototype.forEach.call(bodies, function (body) {
      var island = document.createElement('div');
      island.className = 'device__island';
      island.setAttribute('aria-hidden', 'true');

      var status = document.createElement('div');
      status.className = 'device__status';
      status.setAttribute('aria-hidden', 'true');
      status.innerHTML = '<span>' + STATUS_TIME + '</span>' + STATUS_ICONS;

      var home = document.createElement('div');
      home.className = 'device__home';
      home.setAttribute('aria-hidden', 'true');

      var screen = body.querySelector('.device__screen');
      if (screen) {
        screen.appendChild(status);
      }
      body.appendChild(island);
      body.appendChild(home);
    });
  }

  function setupNav() {
    var links = document.querySelectorAll('.toolbar__link');
    if (!links.length) return;

    var byId = {};
    Array.prototype.forEach.call(links, function (link) {
      var id = link.getAttribute('data-goto');
      byId[id] = link;

      link.addEventListener('click', function () {
        var target = document.getElementById(id);
        if (target) {
          target.scrollIntoView({ behavior: 'smooth', block: 'start', inline: 'center' });
        }
      });
    });

    if (!('IntersectionObserver' in window)) return;

    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          var link = byId[entry.target.id];
          if (!link) return;
          if (entry.isIntersecting) {
            link.setAttribute('aria-current', 'true');
          } else {
            link.removeAttribute('aria-current');
          }
        });
      },
      { threshold: 0.35 }
    );

    Array.prototype.forEach.call(document.querySelectorAll('.artboard'), function (artboard) {
      observer.observe(artboard);
    });
  }

  function init() {
    buildDeviceChrome();
    setupNav();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
