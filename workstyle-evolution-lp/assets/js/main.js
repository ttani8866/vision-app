/* Workstyle Evolution LP — アコーディオンとモバイルナビ */
(function () {
  'use strict';

  /* ---------------------------------------------------------- FAQ */
  var faq = document.querySelector('[data-faq]');

  if (faq) {
    var buttons = Array.prototype.slice.call(faq.querySelectorAll('.faq-q'));

    var setOpen = function (button, open) {
      var panel = document.getElementById(button.getAttribute('aria-controls'));
      var sign = button.querySelector('.faq-sign');

      button.setAttribute('aria-expanded', open ? 'true' : 'false');
      if (panel) panel.setAttribute('data-collapsed', open ? 'false' : 'true');
      if (sign) sign.textContent = open ? '−' : '+';
    };

    // 初期状態を aria-expanded から同期（設計どおり1問目のみ開）
    buttons.forEach(function (button) {
      setOpen(button, button.getAttribute('aria-expanded') === 'true');
    });

    // 一度に開くのは1問だけ
    buttons.forEach(function (button) {
      button.addEventListener('click', function () {
        var willOpen = button.getAttribute('aria-expanded') !== 'true';
        buttons.forEach(function (other) {
          setOpen(other, other === button ? willOpen : false);
        });
      });
    });
  }

  /* ---------------------------------------------------------- Mobile nav */
  var toggle = document.querySelector('.nav-toggle');
  var nav = document.getElementById('site-nav');

  if (toggle && nav) {
    var closeNav = function () {
      nav.classList.remove('is-open');
      toggle.setAttribute('aria-expanded', 'false');
      toggle.setAttribute('aria-label', 'メニューを開く');
    };

    toggle.addEventListener('click', function () {
      var open = !nav.classList.contains('is-open');
      nav.classList.toggle('is-open', open);
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      toggle.setAttribute('aria-label', open ? 'メニューを閉じる' : 'メニューを開く');
    });

    nav.addEventListener('click', function (event) {
      if (event.target.closest('a')) closeNav();
    });

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && nav.classList.contains('is-open')) {
        closeNav();
        toggle.focus();
      }
    });

    window.addEventListener('resize', function () {
      if (window.innerWidth > 860) closeNav();
    });
  }
})();
