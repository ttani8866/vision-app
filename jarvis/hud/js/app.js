import { startStarfield } from "./starfield.js";
import { createRing } from "./ring.js";
import { createAgentRing } from "./agent-ring.js";
import { startStatePoller } from "./state-poller.js";
import { createPanelShell } from "./panels/panel-base.js";

async function loadJson(url) {
  const res = await fetch(`${url}?t=${Date.now()}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`failed to load ${url}`);
  return res.json();
}

async function main() {
  const [agentsCfg, stateLabels, panelsCfg] = await Promise.all([
    loadJson("config/agents.json"),
    loadJson("config/state_labels.json"),
    loadJson("config/panels.json"),
  ]);

  startStarfield(document.getElementById("starfield"));

  const ringSvgEl = document.getElementById("ring-svg");
  const ring = createRing(ringSvgEl);
  const ringLabelJa = document.getElementById("ring-label-ja");
  const ringLabelEn = document.getElementById("ring-label-en");
  const ringStage = document.getElementById("ring-stage");
  const agentRing = createAgentRing(document.getElementById("agent-ring"), agentsCfg.roster, { anchorEl: ringSvgEl });

  // --- パネルの読み込み（1パネル1モジュール。panels.json を増やすだけで増設できる） ---
  const panelRoot = document.getElementById("panel-root");
  const panels = new Map();
  for (const panelCfg of panelsCfg.panels) {
    const shell = createPanelShell(panelRoot, panelCfg);
    const mod = await import(panelCfg.module);
    const instance = await mod.mount({
      bodyEl: shell.bodyEl,
      dataUrl: panelCfg.dataUrl,
      configUrl: panelCfg.configUrl,
    });
    if (shell.reloadBtn) {
      shell.reloadBtn.addEventListener("click", () => instance.reload());
    }
    panels.set(panelCfg.id, { shell, instance });
  }
  // パネルのサイズが確定してから、それらを避けるようにエージェントの配置を確定する
  agentRing.relayout();

  let currentPanelFocus = undefined; // undefined = 未初期化（初回は必ず反映させる）
  function setPanelFocus(panelId) {
    if (panelId === currentPanelFocus) return;
    currentPanelFocus = panelId;
    for (const [id, { shell }] of panels) {
      const isFocused = id === panelId;
      shell.setExpanded(isFocused);
      shell.setDimmed(Boolean(panelId) && !isFocused);
    }
    ringStage.classList.toggle("receded", Boolean(panelId));
    // 拡大表示に切り替わった直後はパネルサイズが変わるため、CSSの拡大アニメーション（0.5秒）完了を待って再レイアウトする
    if (panelId && panels.has(panelId)) {
      setTimeout(() => panels.get(panelId).instance.reload(), 550);
    }
  }
  setPanelFocus(null);

  // --- 状態ファイルのポーリング（約1秒間隔） ---
  function resolveEffectiveState(raw) {
    const pendingDispatch = (raw.dispatch || []).some((j) => !j.done);
    if (pendingDispatch) return "dispatching";
    return stateLabels.rawStateMap[raw.state] ?? "idle";
  }

  const dispatchStatusEl = document.getElementById("status-dispatch");
  const stateStatusEl = document.getElementById("status-state");

  startStatePoller((raw) => {
    const effective = resolveEffectiveState(raw);
    const def = stateLabels.states[effective];
    ring.setState(def);
    ringLabelJa.textContent = def.ja;
    ringLabelEn.textContent = def.en;
    stateStatusEl.textContent = `STATE: ${def.en}`;

    const activeAgents = (raw.dispatch || []).filter((j) => !j.done).map((j) => j.agent);
    agentRing.setActive(activeAgents);
    dispatchStatusEl.textContent = activeAgents.length
      ? `DISPATCH: ${activeAgents.join(", ")}`
      : "";

    setPanelFocus(raw.panel_focus && panels.has(raw.panel_focus) ? raw.panel_focus : null);
  }, { url: "state.json", intervalMs: 1000 });

  // --- 時計 ---
  const clockEl = document.getElementById("status-clock");
  setInterval(() => {
    clockEl.textContent = new Date().toLocaleTimeString("ja-JP", { hour12: false });
  }, 1000);
}

main().catch((err) => {
  console.error("HUD 初期化に失敗しました", err);
  document.body.innerHTML += `<pre style="position:fixed;top:8px;left:8px;color:#ff8080;z-index:9;font-size:11px">HUD 初期化エラー: ${err.message}</pre>`;
});
