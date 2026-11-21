import { startStarfield } from "./starfield.js?v=20261010c";
import { createRing } from "./ring.js?v=20261010c";
import { createAgentRing } from "./agent-ring.js?v=20261010c";
import { startStatePoller } from "./state-poller.js?v=20261010c";
import { createPanelShell } from "./panels/panel-base.js?v=20261010c";

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
    // サーバー再起動の瞬間や別プロセスの再読み込みと重なると import が一度だけ失敗することがある。3回まで待って試す
    let mod = null;
    for (let attempt = 1; attempt <= 3 && !mod; attempt++) {
      try {
        mod = await import(`${panelCfg.module}?v=20261010c`);
      } catch (err) {
        if (attempt === 3) throw err;
        await new Promise((r) => setTimeout(r, 1000 * attempt));
      }
    }
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
  let manualFocus = null;            // ボタン／Esc で決めた表示。音声コマンドが来たら上書きされる
  let lastVoiceFocus = null;         // state.json の panel_focus の前回値（変化＝新しい音声コマンド）
  function setPanelFocus(panelId) {
    if (panelId === currentPanelFocus) return;
    currentPanelFocus = panelId;
    for (const [id, { shell }] of panels) {
      const isFocused = id === panelId;
      shell.setExpanded(isFocused);
      shell.setDimmed(Boolean(panelId) && !isFocused);
      panels.get(id).instance.setDocked?.(!isFocused);  // ドック中のグラフは力学を完全停止（docs/E-1）
    }
    ringStage.classList.toggle("receded", Boolean(panelId));
    // 拡大表示に切り替わった直後はパネルサイズが変わるため、CSSの拡大アニメーション（0.5秒）完了を待って再レイアウトする
    // 拡大・縮小どちらもパネルのサイズが変わるので、CSS アニメーション完了後に全パネルを描き直す
    setTimeout(() => { for (const { instance } of panels.values()) instance.reload(); }, 750);
  }
  setPanelFocus(null);
  // URL の ?panel=<id>（例 index.html?panel=graph）で開いた時は、そのパネルを拡大した状態で始める
  // （VX 経営意思決定パネルの「グラフビュー」ボタンから使う。音声コマンドが来ればそちらを優先する）
  const urlPanel = new URLSearchParams(location.search).get("panel");
  if (urlPanel && panels.has(urlPanel)) { manualFocus = urlPanel; setPanelFocus(urlPanel); }

  for (const [id, { shell }] of panels) {
    if (!shell.expandBtn) continue; // 古い panel-base.js がキャッシュされていても HUD 全体は止めない
    shell.expandBtn.addEventListener("click", () => {
      manualFocus = currentPanelFocus === id ? null : id;
      setPanelFocus(manualFocus);
    });
  }
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && currentPanelFocus) { manualFocus = null; setPanelFocus(null); }
  });

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

    // 音声コマンド（state.json の panel_focus）が変わった時だけ従い、それ以外は手動操作を優先する
    const voiceFocus = raw.panel_focus && panels.has(raw.panel_focus) ? raw.panel_focus : null;
    if (voiceFocus !== lastVoiceFocus) { lastVoiceFocus = voiceFocus; manualFocus = voiceFocus; }
    setPanelFocus(manualFocus);

    // KANBEI が読んだノートをグラフ上で点灯させる（Obsidian の実データが動いている見せ場）
    const graphPanel = panels.get("graph");
    if (graphPanel?.instance?.setHighlight) graphPanel.instance.setHighlight(raw.read_paths || []);
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
