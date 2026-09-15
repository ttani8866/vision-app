// hud/state.json を約1秒間隔でポーリングする（jarvis_kanbei_main.py の set_state() が書き込む）。
export function startStatePoller(onUpdate, { url = "state.json", intervalMs = 1000 } = {}) {
  let timer = null;
  let lastTs = null;

  async function poll() {
    try {
      const res = await fetch(`${url}?t=${Date.now()}`, { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        if (data.ts !== lastTs) {
          lastTs = data.ts;
          onUpdate(data, true);
        } else {
          onUpdate(data, false);
        }
      }
    } catch (_err) {
      // state.json が未生成（KANBEI未起動）でも HUD 自体は待機表示のまま動作させる
    }
  }

  poll();
  timer = setInterval(poll, intervalMs);
  return { stop() { clearInterval(timer); } };
}
