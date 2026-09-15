// 背景の銀河系ドット。近いドット同士を薄い線でつなぐ。常時ゆっくり漂う。
export function startStarfield(canvas, opts = {}) {
  const ctx = canvas.getContext("2d");
  const density = opts.density ?? 0.00009; // 画面px^2あたりの点数
  const linkDist = opts.linkDist ?? 120;
  const color = opts.color ?? "62, 224, 255";

  let w = 0, h = 0, dpr = Math.min(window.devicePixelRatio || 1, 2);
  let points = [];
  let raf = null;

  function resize() {
    w = window.innerWidth;
    h = window.innerHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = w + "px";
    canvas.style.height = h + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const count = Math.max(40, Math.round(w * h * density));
    points = Array.from({ length: count }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      vx: (Math.random() - 0.5) * 0.12,
      vy: (Math.random() - 0.5) * 0.12,
      r: Math.random() * 1.4 + 0.4,
      tw: Math.random() * Math.PI * 2,
    }));
  }

  function tick() {
    ctx.clearRect(0, 0, w, h);
    for (const p of points) {
      p.x += p.vx;
      p.y += p.vy;
      p.tw += 0.01;
      if (p.x < -10) p.x = w + 10;
      if (p.x > w + 10) p.x = -10;
      if (p.y < -10) p.y = h + 10;
      if (p.y > h + 10) p.y = -10;
    }
    for (let i = 0; i < points.length; i++) {
      for (let j = i + 1; j < points.length; j++) {
        const a = points[i], b = points[j];
        const dx = a.x - b.x, dy = a.y - b.y;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d < linkDist) {
          ctx.strokeStyle = `rgba(${color}, ${0.08 * (1 - d / linkDist)})`;
          ctx.lineWidth = 0.5;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }
    }
    for (const p of points) {
      const glow = 0.5 + 0.5 * Math.sin(p.tw);
      ctx.fillStyle = `rgba(${color}, ${0.35 + 0.35 * glow})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }
    raf = requestAnimationFrame(tick);
  }

  resize();
  window.addEventListener("resize", resize);
  tick();

  return {
    stop() { if (raf) cancelAnimationFrame(raf); window.removeEventListener("resize", resize); },
  };
}
