// パネル: 経営ダッシュボード（RINの週次財務レポートのみが出典。値は hud/adapters/rin_weekly_adapter.py の生成物）
// 行・指標の定義は hud/config/metrics.json から読む。ここには増やさない。
export async function mount({ bodyEl, dataUrl, configUrl }) {
  bodyEl.innerHTML = `<div class="panel-empty">読み込み中...</div>`;

  async function render() {
    bodyEl.innerHTML = `<div class="panel-empty">読み込み中...</div>`;
    let cfg, data;
    try {
      [cfg, data] = await Promise.all([
        fetch(`${configUrl}?t=${Date.now()}`, { cache: "no-store" }).then((r) => r.json()),
        fetch(`${dataUrl}?t=${Date.now()}`, { cache: "no-store" }).then((r) => r.json()),
      ]);
    } catch (err) {
      bodyEl.innerHTML = `<div class="panel-empty">読み込めません（hud/adapters/rin_weekly_adapter.py を実行してください）</div>`;
      return;
    }
    renderDashboard(bodyEl, cfg, data);
  }

  await render();
  return { reload: render };
}

function fmtNum(v) {
  if (v === null || v === undefined) return null;
  return v.toLocaleString("ja-JP");
}

function fmtPct(v) {
  if (v === null || v === undefined) return null;
  return `${v.toFixed(1)}%`;
}

function renderDashboard(bodyEl, cfg, data) {
  const cut = cfg.cuts[cfg.activeCut];
  const rowsById = new Map((data.rows || []).map((r) => [r.name, r]));

  const header = document.createElement("div");
  header.className = "dash-caption";
  const srcLabel = data.source_report ? data.source_report.file : "出典なし";
  header.textContent = `${cut.label}（出典: ${srcLabel}）`;
  bodyEl.innerHTML = "";
  bodyEl.appendChild(header);

  if (data.note) {
    const noteEl = document.createElement("div");
    noteEl.className = "dash-note";
    noteEl.textContent = data.note;
    bodyEl.appendChild(noteEl);
  }

  for (const rowName of cut.rows) {
    const row = rowsById.get(rowName);
    const rowEl = document.createElement("div");
    rowEl.className = "dash-row";
    const nameEl = document.createElement("div");
    nameEl.className = "dash-row-name";
    nameEl.textContent = rowName;
    rowEl.appendChild(nameEl);

    for (const metric of cfg.metrics) {
      const m = row?.metrics?.[metric.id];
      const line = document.createElement("div");
      line.className = "dash-metric-line";

      const label = document.createElement("span");
      label.className = "dash-metric-label";
      label.textContent = metric.label;
      line.appendChild(label);

      const valueEl = document.createElement("span");
      const numStr = m ? fmtNum(m.value) : null;
      if (numStr) {
        valueEl.className = "dash-metric-value";
        valueEl.textContent = `${numStr} ${m.unit ?? ""}`.trim();
      } else {
        valueEl.className = "dash-metric-value na";
        valueEl.textContent = "未取得";
      }
      line.appendChild(valueEl);

      const target = m ? fmtPct(m.vs_target_pct) : null;
      const prev = m ? fmtPct(m.vs_prev_year_pct) : null;
      if (target) {
        const b = document.createElement("span");
        b.className = "dash-badge";
        b.textContent = `対目標 ${target}`;
        line.appendChild(b);
      }
      if (prev) {
        const b = document.createElement("span");
        b.className = "dash-badge";
        b.textContent = `昨対 ${prev}`;
        line.appendChild(b);
      }
      rowEl.appendChild(line);

      if (m?.value != null && (m.period || m.source)) {
        const cap = document.createElement("div");
        cap.className = "dash-caption";
        cap.textContent = `断面: ${m.period ?? "不明"} / 出典: ${m.source ?? "不明"}`;
        rowEl.appendChild(cap);
      }
      if (m?.note) {
        const noteEl = document.createElement("div");
        noteEl.className = "dash-note";
        noteEl.textContent = m.note;
        rowEl.appendChild(noteEl);
      }
    }
    bodyEl.appendChild(rowEl);
  }
}
