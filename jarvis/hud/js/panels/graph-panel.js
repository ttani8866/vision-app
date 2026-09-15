// パネル: VisionXグラフビュー（hud/build_graph.py が出力する graph.json をd3-forceで描画）
// リアルタイム同期はしない。RELOADボタンで graph.json を再取得して再レイアウトするだけ。
export async function mount({ bodyEl, dataUrl }) {
  bodyEl.innerHTML = `
    <div class="panel-empty" id="graph-caption">ノードをクリックすると隣接ノートを強調表示します</div>
    <svg id="graph-svg"></svg>
  `;
  const svg = bodyEl.querySelector("#graph-svg");
  const caption = bodyEl.querySelector("#graph-caption");
  let simulation = null;

  async function render() {
    caption.textContent = "読み込み中...";
    let g;
    try {
      const res = await fetch(`${dataUrl}?t=${Date.now()}`, { cache: "no-store" });
      g = await res.json();
    } catch (err) {
      caption.textContent = "graph.json を読み込めません（hud/build_graph.py を実行してください）";
      svg.innerHTML = "";
      return;
    }
    if (simulation) simulation.stop();
    drawGraph(svg, caption, g);
  }

  await render();
  return { reload: render };
}

function drawGraph(svg, caption, g) {
  const rect = svg.getBoundingClientRect();
  const width = Math.max(rect.width, 200);
  const height = Math.max(rect.height, 160);
  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
  svg.innerHTML = "";

  const nodes = g.nodes.map((d) => ({ ...d }));
  const linkedIds = new Set();
  const links = g.links
    .filter((l) => nodes.find((n) => n.id === l.source) && nodes.find((n) => n.id === l.target))
    .map((l) => ({ ...l }));
  links.forEach((l) => { linkedIds.add(l.source); linkedIds.add(l.target); });

  const svgSel = d3.select(svg);
  const linkSel = svgSel.append("g").attr("class", "links")
    .selectAll("line").data(links).join("line")
    .attr("class", "link");
  const nodeSel = svgSel.append("g").attr("class", "nodes")
    .selectAll("circle").data(nodes, (d) => d.id).join("circle")
    .attr("class", "node")
    .attr("r", (d) => (linkedIds.has(d.id) ? 3 + Math.min(d.in, 6) * 0.6 : 1.6))
    .style("cursor", "pointer");
  const labelSel = svgSel.append("g").attr("class", "labels")
    .selectAll("text").data([]).join("text");

  const sim = d3.forceSimulation(nodes)
    .force("link", d3.forceLink(links).id((d) => d.id).distance(26).strength(0.3))
    .force("charge", d3.forceManyBody().strength(-9))
    .force("center", d3.forceCenter(width / 2, height / 2))
    .force("collision", d3.forceCollide(3))
    .stop();

  const ticks = Math.min(220, Math.ceil(Math.log(nodes.length + 1) * 60));
  for (let i = 0; i < ticks; i++) sim.tick();

  linkSel
    .attr("x1", (d) => d.source.x).attr("y1", (d) => d.source.y)
    .attr("x2", (d) => d.target.x).attr("y2", (d) => d.target.y);
  nodeSel.attr("cx", (d) => d.x).attr("cy", (d) => d.y);

  caption.textContent = `${g.meta?.notes ?? nodes.length}ノート / ${g.meta?.links ?? links.length}リンク（クリックで強調）`;

  const neighborsOf = (id) => {
    const set = new Set([id]);
    for (const l of links) {
      if (l.source.id === id) set.add(l.target.id);
      if (l.target.id === id) set.add(l.source.id);
    }
    return set;
  };

  nodeSel.on("click", (event, d) => {
    const neigh = neighborsOf(d.id);
    nodeSel.classed("dim", (n) => !neigh.has(n.id)).classed("hi", (n) => n.id === d.id);
    linkSel.classed("dim", (l) => !(neigh.has(l.source.id) && neigh.has(l.target.id)));

    svgSel.select("g.labels").selectAll("text").remove();
    svgSel.select("g.labels").selectAll("text")
      .data(nodes.filter((n) => neigh.has(n.id)))
      .join("text")
      .attr("class", "node-label")
      .attr("x", (n) => n.x + 5)
      .attr("y", (n) => n.y + 3)
      .text((n) => n.id);

    caption.textContent = `${d.id}（${neigh.size - 1}件の隣接ノート）`;
  });
}
