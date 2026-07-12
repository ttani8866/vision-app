"use client";

import { useEffect, useRef, useState } from "react";
import {
  getLastLocation,
  hasVisitedInSession,
  markVisitedInSession,
  setLastLocation,
} from "@/lib/passport";
import { CONTINENT_PATHS, MAP_H, MAP_W, project, TOKYO } from "./worldMap";

// 渡航演出: 前の閲覧地（無ければ東京）から目的地へ0.6秒の線が伸びる。
// 同一セッションで2回目以降の訪問時は省略。クリック・スクロール・ボタンで即時解除できる。
export default function FlightTransition({
  slug,
  lat,
  lng,
  destination,
}: {
  slug: string;
  lat: number;
  lng: number;
  destination: string;
}) {
  const [flight, setFlight] = useState<{
    from: { x: number; y: number };
    to: { x: number; y: number };
  } | null>(null);
  const ranRef = useRef(false);

  useEffect(() => {
    // StrictModeの二重実行でも1回だけ判定する
    if (ranRef.current) return;
    ranRef.current = true;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const revisit = hasVisitedInSession(slug);
    const last = getLastLocation() ?? TOKYO;
    markVisitedInSession(slug);
    setLastLocation(lat, lng);
    if (reduced || revisit) return;
    const from = project(last.lat, last.lng);
    const to = project(lat, lng);
    if (Math.abs(from.x - to.x) < 2 && Math.abs(from.y - to.y) < 2) return;
    setFlight({ from, to });
  }, [slug, lat, lng]);

  useEffect(() => {
    if (!flight) return;
    const dismiss = () => setFlight(null);
    const t = setTimeout(dismiss, 900);
    // どんな操作でも即座に地図を閉じ、本文へ進めるようにする
    window.addEventListener("scroll", dismiss, { passive: true });
    window.addEventListener("pointerdown", dismiss);
    window.addEventListener("keydown", dismiss);
    return () => {
      clearTimeout(t);
      window.removeEventListener("scroll", dismiss);
      window.removeEventListener("pointerdown", dismiss);
      window.removeEventListener("keydown", dismiss);
    };
  }, [flight]);

  if (!flight) return null;

  const midX = (flight.from.x + flight.to.x) / 2;
  const midY = Math.min(flight.from.y, flight.to.y) - 60;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-paper"
      role="status"
      aria-label={`${destination}へ渡航中`}
      onClick={() => setFlight(null)}
    >
      <svg viewBox={`0 0 ${MAP_W} ${MAP_H}`} className="w-full max-w-4xl" aria-hidden>
        {CONTINENT_PATHS.map((d, i) => (
          <path
            key={i}
            d={d}
            fill="#1E2A3A"
            fillOpacity={0.07}
            stroke="#1E2A3A"
            strokeOpacity={0.3}
            strokeWidth={1}
          />
        ))}
        <path
          d={`M${flight.from.x},${flight.from.y} Q${midX},${midY} ${flight.to.x},${flight.to.y}`}
          fill="none"
          stroke="#1E2A3A"
          strokeWidth={2}
          strokeDasharray="1"
          pathLength={1}
          className="flight-line"
        />
        <circle cx={flight.from.x} cy={flight.from.y} r={4} fill="#1E2A3A" />
        <circle cx={flight.to.x} cy={flight.to.y} r={6} fill="#F5D547" stroke="#1E2A3A" strokeWidth={1.5} />
        <text
          x={flight.to.x}
          y={flight.to.y - 14}
          textAnchor="middle"
          fontSize={16}
          fill="#1E2A3A"
          style={{ fontFamily: "var(--font-shippori)" }}
        >
          {destination}
        </text>
      </svg>
      <button
        onClick={() => setFlight(null)}
        className="absolute bottom-6 right-6 border-[1.5px] border-ink bg-paper px-4 py-2 text-sm"
      >
        地図を閉じて本文へ
      </button>
    </div>
  );
}
