"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { loadPassport } from "@/lib/passport";

function haversine(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// トップページのパスポート導線バナー: 押印数と総移動距離を表示
export default function PassportBanner({
  coords,
}: {
  coords: Record<string, { lat: number; lng: number }>;
}) {
  const [stats, setStats] = useState<{ count: number; km: number } | null>(null);

  useEffect(() => {
    const p = loadPassport();
    const visited = p.stamps
      .map((s) => coords[s.slug])
      .filter((c): c is { lat: number; lng: number } => Boolean(c));
    let km = 0;
    for (let i = 1; i < visited.length; i++) {
      km += haversine(
        visited[i - 1].lat,
        visited[i - 1].lng,
        visited[i].lat,
        visited[i].lng
      );
    }
    setStats({ count: p.stamps.length, km: Math.round(km) });
  }, [coords]);

  return (
    <Link
      href="/passport"
      className="plate shift-hover flex flex-wrap items-center justify-between gap-4 p-6"
      aria-label="アトラス・パスポートを開く"
    >
      <div>
        <p className="font-fraunces italic text-xs tracking-wide">Atlas Passport</p>
        <p className="font-mincho text-xl font-bold">
          渡航印を集めて、世界一周。
        </p>
      </div>
      <div className="flex items-center gap-8">
        {stats && (
          <dl className="flex gap-6 text-center text-sm">
            <div>
              <dt className="text-xs">押印数</dt>
              <dd className="font-data text-2xl">{stats.count}</dd>
            </div>
            <div>
              <dt className="text-xs">総移動距離</dt>
              <dd className="font-data text-2xl">
                {stats.km.toLocaleString()}
                <span className="text-xs">km</span>
              </dd>
            </div>
          </dl>
        )}
        <span className="font-mincho" aria-hidden>
          →
        </span>
      </div>
    </Link>
  );
}
