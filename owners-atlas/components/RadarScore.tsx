"use client";

import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
} from "recharts";
import { CATEGORIES, SCORE_AXES } from "@/lib/categories";
import { track } from "@/lib/analytics";
import type { CaseItem } from "@/lib/types";

// 4層スコアレーダーチャート（起源物語・所有の証・時間の物語・語りの場、各0〜3）
export default function RadarScore({ item }: { item: CaseItem }) {
  const color = CATEGORIES[item.category].color;
  const data = SCORE_AXES.map((axis) => ({
    axis: axis.label,
    value: item.scores[axis.key],
  }));

  const share = async () => {
    track("share_click", { case_slug: item.slug, channel: "score_card" });
    const url = `${location.origin}/case/${item.slug}`;
    const text = `${item.name} の図鑑カード | Owner's Atlas`;
    if (navigator.share) {
      try {
        await navigator.share({ title: text, url });
      } catch {
        // ユーザーによるキャンセルは正常系
      }
    } else {
      await navigator.clipboard.writeText(`${text} ${url}`);
      alert("リンクをコピーしました");
    }
  };

  return (
    <div className="plate p-5">
      <h3 className="font-mincho text-lg font-bold">物語資産スコア</h3>
      <p className="mt-1 text-xs">
        起源物語・所有の証・時間の物語・語りの場の4軸（各0〜3）
      </p>
      <div className="h-64 w-full" role="img" aria-label={`4層スコア: ${data.map((d) => `${d.axis}${d.value}`).join("、")}`}>
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={data} outerRadius="72%">
            <PolarGrid stroke="#1E2A3A" strokeOpacity={0.3} />
            <PolarAngleAxis
              dataKey="axis"
              tick={{ fill: "#1E2A3A", fontSize: 12 }}
            />
            <PolarRadiusAxis domain={[0, 3]} tickCount={4} tick={false} axisLine={false} />
            <Radar
              dataKey="value"
              stroke={color}
              fill={color}
              fillOpacity={0.45}
              isAnimationActive={false}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>
      <button
        onClick={share}
        className="mt-2 w-full border-[1.5px] border-ink px-4 py-2 text-sm shift-hover"
      >
        この図鑑カードをシェア
      </button>
    </div>
  );
}
