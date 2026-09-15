// 全パネル共通の外枠（ドック/拡大/暗転の器）。
// 新しいパネルを追加する場合、この関数が返す bodyEl に自由にレンダリングすればよい。
// パネル本体のモジュールが守る契約:
//   export async function mount({ bodyEl, config, dataUrl, configUrl }) -> { reload: () => Promise<void> }
export function createPanelShell(panelRoot, panelConfig) {
  const el = document.createElement("section");
  el.className = `panel corner-${panelConfig.corner}`;
  el.dataset.panelId = panelConfig.id;

  const header = document.createElement("div");
  header.className = "panel-header";
  header.innerHTML = `
    <span><span class="title-ja">${panelConfig.title}</span>${panelConfig.titleEn}</span>
  `;

  if (panelConfig.reload === "manual") {
    const btn = document.createElement("button");
    btn.className = "panel-reload";
    btn.type = "button";
    btn.textContent = "RELOAD";
    header.appendChild(btn);
    el.dataset.hasReload = "1";
    el._reloadBtn = btn;
  }

  const body = document.createElement("div");
  body.className = "panel-body";
  body.innerHTML = `<div class="panel-empty">読み込み中...</div>`;

  el.appendChild(header);
  el.appendChild(body);
  panelRoot.appendChild(el);

  return {
    el,
    bodyEl: body,
    reloadBtn: el._reloadBtn ?? null,
    setExpanded(expanded) { el.classList.toggle("expanded", expanded); },
    setDimmed(dimmed) { el.classList.toggle("dimmed", dimmed); },
  };
}
