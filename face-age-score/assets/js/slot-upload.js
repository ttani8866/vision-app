/* ==========================================================================
   写真スロットのアップロード
   - `.slot[data-slot]` をクリック／ドラッグ＆ドロップで写真を入れられるようにする
   - 画像は長辺1400pxに縮小して localStorage に保存し、再読み込み後も表示する
   - 右上の × で写真を外す
   ========================================================================== */
(function () {
  'use strict';

  var STORE_PREFIX = 'slot-photo:';
  var MAX_EDGE = 1400;
  var PICK_LABEL = '写真を選ぶ';

  function store(id, value) {
    try {
      if (value) localStorage.setItem(STORE_PREFIX + id, value);
      else localStorage.removeItem(STORE_PREFIX + id);
    } catch (e) { /* 容量超過などは無視（表示はそのまま） */ }
  }
  function load(id) {
    try { return localStorage.getItem(STORE_PREFIX + id); } catch (e) { return null; }
  }

  /* File → 縮小済み data URL */
  function fileToDataUrl(file, done) {
    var reader = new FileReader();
    reader.onload = function () {
      var img = new Image();
      img.onload = function () {
        var w = img.naturalWidth, h = img.naturalHeight;
        var scale = Math.min(1, MAX_EDGE / Math.max(w, h));
        if (scale === 1 && file.size < 900 * 1024) { done(reader.result); return; }
        var canvas = document.createElement('canvas');
        canvas.width = Math.round(w * scale);
        canvas.height = Math.round(h * scale);
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
        done(canvas.toDataURL('image/jpeg', 0.86));
      };
      img.onerror = function () { done(null); };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  }

  function setupSlot(slot) {
    var id = slot.getAttribute('data-slot');
    var alt = slot.getAttribute('data-alt') || '';
    slot.classList.add('slot--fillable');
    slot.setAttribute('role', 'button');
    slot.setAttribute('tabindex', '0');
    slot.setAttribute('aria-label', (alt ? alt + 'の' : '') + '写真を選ぶ');

    var input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.hidden = true;

    var pick = document.createElement('span');
    pick.className = 'slot__pick';
    pick.textContent = PICK_LABEL;

    var clear = document.createElement('button');
    clear.type = 'button';
    clear.className = 'slot__clear';
    clear.setAttribute('aria-label', '写真を外す');
    clear.innerHTML = '&times;';

    var img = null;

    function show(dataUrl) {
      if (!img) {
        img = document.createElement('img');
        img.alt = alt;
        slot.insertBefore(img, slot.firstChild);
      }
      img.src = dataUrl;
      slot.classList.add('is-filled');
    }
    function remove() {
      if (img) { img.remove(); img = null; }
      slot.classList.remove('is-filled');
      store(id, null);
    }
    function accept(file) {
      if (!file || !/^image\//.test(file.type)) return;
      fileToDataUrl(file, function (dataUrl) {
        if (!dataUrl) return;
        show(dataUrl);
        store(id, dataUrl);
      });
    }

    slot.addEventListener('click', function (e) {
      if (e.target === clear) return;
      input.click();
    });
    slot.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); input.click(); }
    });
    input.addEventListener('change', function () {
      accept(input.files && input.files[0]);
      input.value = '';
    });
    clear.addEventListener('click', function (e) {
      e.stopPropagation();
      remove();
    });

    slot.addEventListener('dragover', function (e) {
      e.preventDefault();
      slot.classList.add('is-dragover');
    });
    slot.addEventListener('dragleave', function () { slot.classList.remove('is-dragover'); });
    slot.addEventListener('drop', function (e) {
      e.preventDefault();
      slot.classList.remove('is-dragover');
      accept(e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]);
    });

    slot.appendChild(input);
    slot.appendChild(pick);
    slot.appendChild(clear);

    var saved = load(id);
    if (saved) show(saved);
  }

  function init() {
    Array.prototype.forEach.call(document.querySelectorAll('.slot[data-slot]'), setupSlot);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
