"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CATEGORIES } from "@/lib/categories";
import type { CaseItem } from "@/lib/types";
import { CONTINENT_PATHS, MAP_H, MAP_W, project } from "./worldMap";

interface PinData {
  slug: string;
  name: string;
  country: string;
  region: string;
  priceRange: string;
  category: CaseItem["category"];
  lat: number;
  lng: number;
}

// アトラス・マップ: 世界地図SVG＋カテゴリカラーのピン。
// 初回訪問時のみピンが順に灯るオープニング演出（2秒、スキップ可）。
export default function AtlasMap({ pins }: { pins: PinData[] }) {
  const router = useRouter();
  const [opening, setOpening] = useState(false);
  const [litCount, setLitCount] = useState(pins.length);
  const [hovered, setHovered] = useState<PinData | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const seen = localStorage.getItem("oa_map_opening_seen");
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (seen || reduced) return;
    localStorage.setItem("oa_map_opening_seen", "1");
    setOpening(true);
    setLitCount(0);
    const stepMs = Math.max(2000 / pins.length, 30);
    timerRef.current = setInterval(() => {
      setLitCount((n) => {
        if (n + 1 >= pins.length) {
          if (timerRef.current) clearInterval(timerRef.current);
          setOpening(false);
          return pins.length;
        }
        return n + 1;
      });
    }, stepMs);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [pins.length]);

  const skipOpening = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setLitCount(pins.length);
    setOpening(false);
  };

  const projected = useMemo(
    () => pins.map((p) => ({ ...p, ...project(p.lat, p.lng) })),
    [pins]
  );

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${MAP_W} ${MAP_H}`}
        role="img"
        aria-label="世界のオーナー制度の所在地マップ"
        className="h-auto w-full touch-pinch-zoom select-none"
      >
        <rect width={MAP_W} height={MAP_H} fill="transparent" />
        {/* 経緯線 */}
        {[100, 200, 300, 400].map((y) => (
          <line
            key={`lat${y}`}
            x1={0}
            y1={y}
            x2={MAP_W}
            y2={y}
            stroke="#1E2A3A"
            strokeOpacity={0.08}
            strokeDasharray="2 6"
          />
        ))}
        {[167, 333, 500, 667, 833].map((x) => (
          <line
            key={`lng${x}`}
            x1={x}
            y1={0}
            x2={x}
            y2={MAP_H}
            stroke="#1E2A3A"
            strokeOpacity={0.08}
            strokeDasharray="2 6"
          />
        ))}
        {/* 大陸 */}
        {CONTINENT_PATHS.map((d, i) => (
          <path
            key={i}
            d={d}
            fill="#1E2A3A"
            fillOpacity={0.08}
            stroke="#1E2A3A"
            strokeOpacity={0.35}
            strokeWidth={1}
          />
        ))}
        {/* ピン */}
        {projected.map((p, i) => {
          const lit = i < litCount;
          const color = CATEGORIES[p.category].color;
          return (
            <g
              key={p.slug}
              className={lit && opening ? "pin-light" : undefined}
              style={{ opacity: lit ? 1 : 0, cursor: "pointer" }}
              onMouseEnter={() => setHovered(p)}
              onMouseLeave={() => setHovered(null)}
              onFocus={() => setHovered(p)}
              onBlur={() => setHovered(null)}
              onClick={() => router.push(`/case/${p.slug}`)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  router.push(`/case/${p.slug}`);
                }
              }}
              tabIndex={0}
              role="link"
              aria-label={`${p.name}（${p.region}）へ渡航`}
            >
              <circle cx={p.x} cy={p.y} r={12} fill="transparent" />
              <circle
                cx={p.x}
                cy={p.y}
                r={6}
                fill={color}
                stroke="#FAF6EF"
                strokeWidth={1.5}
              />
              <circle
                cx={p.x}
                cy={p.y}
                r={9}
                fill="none"
                stroke={color}
                strokeWidth={1}
                strokeOpacity={0.5}
              />
            </g>
          );
        })}
      </svg>

      {opening && (
        <button
          onClick={skipOpening}
          className="absolute bottom-3 right-3 border-[1.5px] border-ink bg-paper px-3 py-1 text-xs"
        >
          スキップ
        </button>
      )}

      {hovered && (
        <div
          className="pointer-events-none absolute z-10 w-56 border-[1.5px] border-ink bg-paper p-3"
          style={{
            left: `${Math.min((project(hovered.lat, hovered.lng).x / MAP_W) * 100, 72)}%`,
            top: `${Math.min((project(hovered.lat, hovered.lng).y / MAP_H) * 100 + 4, 78)}%`,
          }}
          role="status"
        >
          <p
            className="font-data text-[10px] uppercase tracking-widest"
            style={{ color: CATEGORIES[hovered.category].color }}
          >
            {CATEGORIES[hovered.category].label} / {hovered.country}
          </p>
          <p className="font-mincho text-sm font-bold leading-snug">
            {hovered.name}
          </p>
          <p className="font-data mt-1 text-xs">{hovered.priceRange}</p>
        </div>
      )}
    </div>
  );
}
