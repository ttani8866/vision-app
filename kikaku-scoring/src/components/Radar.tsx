"use client";
// レーダーチャート（§6-5）。各軸を 0〜100% に正規化し、満点ラインを背景に薄く描く
// 座標系はデザイン参照（viewBox 220x204、中心 110,100、半径 82）に合わせる
export type RadarAxis = { label: string; value: number | null; max: number };

function pt(i: number, n: number, f: number, r: number) {
  const a = ((-90 + (360 / n) * i) * Math.PI) / 180;
  return [110 + Math.cos(a) * r * f, 100 + Math.sin(a) * r * f] as const;
}

export default function Radar({ axes, width = 280 }: { axes: RadarAxis[]; width?: number }) {
  const n = axes.length;
  const rings = [0.25, 0.5, 0.75, 1];
  const poly = axes.map((ax, i) => pt(i, n, ax.value === null ? 0 : ax.value / ax.max, 82).map((v) => v.toFixed(1)).join(",")).join(" ");
  return (
    <svg viewBox="0 0 220 204" style={{ width, maxWidth: "100%" }} role="img" aria-label="項目別達成率のレーダーチャート">
      {rings.map((f) => (
        <polygon
          key={f}
          points={axes.map((_, i) => pt(i, n, f, 82).map((v) => v.toFixed(1)).join(",")).join(" ")}
          fill="none"
          stroke="var(--chart-grid)"
          strokeWidth={f === 1 ? 1.25 : 1}
        />
      ))}
      {axes.map((ax, i) => {
        const [x, y] = pt(i, n, 1, 82);
        const [lx, ly] = pt(i, n, 1, 99);
        return (
          <g key={ax.label}>
            <line x1="110" y1="100" x2={x.toFixed(1)} y2={y.toFixed(1)} stroke="var(--chart-grid)" strokeWidth="1" />
            <text x={lx.toFixed(1)} y={(ly + 3.5).toFixed(1)} textAnchor="middle" style={{ fontSize: 10, fill: "var(--chart-axis)", fontFamily: "var(--font-sans)" }}>
              {ax.label}
            </text>
          </g>
        );
      })}
      <polygon points={poly} fill="rgba(0,163,163,.22)" stroke="var(--teal-500)" strokeWidth="1.75" />
    </svg>
  );
}
