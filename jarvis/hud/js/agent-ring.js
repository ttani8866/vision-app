// CXOエージェントの召集表を中央リングの外周に配置する。
// 召集表の正本は hud/config/agents.json（さらに元は .claude/agents/*.md）。
// state.json の dispatch 配列に載っているエージェントを光らせる。
//
// 配置は中心を anchorEl（リング本体）の実際の描画中心に合わせ、
// 画面端にドックされた2パネル（.panel）と重なるノードは半径を自動的に縮めて回避する。
export function createAgentRing(containerEl, roster, { anchorEl } = {}) {
  containerEl.innerHTML = "";
  const nodes = new Map();
  const n = roster.length;

  roster.forEach((agent, i) => {
    const angle = (i / n) * Math.PI * 2 - Math.PI / 2;
    const el = document.createElement("div");
    el.className = "agent-node";
    el.innerHTML = `<div class="dot"></div><div>${agent.label}</div>`;
    el.title = agent.role;
    containerEl.appendChild(el);
    nodes.set(agent.id.toLowerCase(), { el, angle });
  });

  function overlapsAnyPanel(x, y, panelRects, pad = 26) {
    return panelRects.some((p) => x > p.left - pad && x < p.right + pad && y > p.top - pad && y < p.bottom + pad);
  }

  function layout() {
    const anchor = (anchorEl || containerEl).getBoundingClientRect();
    const parent = containerEl.getBoundingClientRect();
    const cx = anchor.left + anchor.width / 2;
    const cy = anchor.top + anchor.height / 2;
    const maxRadius = Math.min(parent.width, parent.height) * 0.36;
    const panelRects = Array.from(document.querySelectorAll(".panel:not(.expanded)")).map((p) => p.getBoundingClientRect());

    for (const { el, angle } of nodes.values()) {
      let r = maxRadius;
      let x = cx + Math.cos(angle) * r;
      let y = cy + Math.sin(angle) * r;
      let guard = 0;
      while (overlapsAnyPanel(x, y, panelRects) && r > maxRadius * 0.35 && guard < 40) {
        r -= 6;
        x = cx + Math.cos(angle) * r;
        y = cy + Math.sin(angle) * r;
        guard++;
      }
      el.style.left = `${x - parent.left}px`;
      el.style.top = `${y - parent.top}px`;
    }
  }

  layout();
  window.addEventListener("resize", layout);

  return {
    /** @param {string[]} activeAgentIds 小文字のエージェントid配列（例: ["kai"]） */
    setActive(activeAgentIds) {
      const active = new Set(activeAgentIds.map((s) => s.toLowerCase()));
      for (const [id, { el }] of nodes) {
        el.classList.toggle("active", active.has(id));
      }
    },
    relayout: layout,
  };
}
