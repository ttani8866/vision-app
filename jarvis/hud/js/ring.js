// 中央の同心円リング。KANBEIの状態（stateLabels.states[key]）で回転速度・発光・色を変える。
const NS = "http://www.w3.org/2000/svg";
const RING_RADII = [60, 95, 130, 165];
const TICK_COUNT = 48;

export function createRing(svgEl) {
  svgEl.innerHTML = "";
  const groups = RING_RADII.map((r, i) => {
    const g = document.createElementNS(NS, "g");
    const circle = document.createElementNS(NS, "circle");
    circle.setAttribute("r", String(r));
    circle.setAttribute("stroke-width", i === 0 ? "1.4" : "0.8");
    circle.setAttribute("stroke-dasharray", i % 2 === 0 ? "2 6" : "");
    g.appendChild(circle);
    svgEl.appendChild(g);
    return { el: g, r, dir: i % 2 === 0 ? 1 : -1, angle: Math.random() * 360 };
  });

  // 外周のティック（目盛り）
  const tickGroup = document.createElementNS(NS, "g");
  tickGroup.setAttribute("class", "tick-group");
  const outerR = RING_RADII[RING_RADII.length - 1] + 18;
  for (let i = 0; i < TICK_COUNT; i++) {
    const a = (i / TICK_COUNT) * Math.PI * 2;
    const x1 = Math.cos(a) * outerR, y1 = Math.sin(a) * outerR;
    const x2 = Math.cos(a) * (outerR + (i % 4 === 0 ? 10 : 5)), y2 = Math.sin(a) * (outerR + (i % 4 === 0 ? 10 : 5));
    const line = document.createElementNS(NS, "line");
    line.setAttribute("x1", x1); line.setAttribute("y1", y1);
    line.setAttribute("x2", x2); line.setAttribute("y2", y2);
    line.setAttribute("class", "ring-tick");
    line.setAttribute("stroke-width", "1");
    tickGroup.appendChild(line);
  }
  svgEl.appendChild(tickGroup);

  let speedMul = 1;
  let raf = null;
  let last = performance.now();

  function tick(now) {
    const dt = (now - last) / 1000;
    last = now;
    for (const g of groups) {
      g.angle += g.dir * speedMul * dt * 14;
      g.el.setAttribute("transform", `rotate(${g.angle})`);
    }
    tickGroup.setAttribute("transform", `rotate(${(groups[0].angle * -0.3).toFixed(2)})`);
    raf = requestAnimationFrame(tick);
  }
  raf = requestAnimationFrame(tick);

  return {
    setState(stateDef) {
      speedMul = stateDef?.ringSpeed ?? 1;
      const root = document.documentElement;
      root.style.setProperty("--state-color", stateDef?.color ?? "#3ee0ff");
      root.style.setProperty("--state-glow", String(stateDef?.glow ?? 0.4));
    },
    stop() { if (raf) cancelAnimationFrame(raf); },
  };
}
