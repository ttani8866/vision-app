"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { track } from "@/lib/analytics";
import type { CaseItem, RouteItem } from "@/lib/types";

interface NextInfo {
  slug: string;
  name: string;
  region: string;
  reason: string;
}

// 「次の目的地へ」: ルート経由時はルートの次、そうでなければ地理的に近い事例へ。
export default function NextDestination({
  current,
  routes,
  nearest,
}: {
  current: CaseItem;
  routes: RouteItem[];
  nearest: { slug: string; name: string; region: string } | undefined;
}) {
  const [next, setNext] = useState<NextInfo | null>(null);

  useEffect(() => {
    // ルート周遊中（sessionStorageにアクティブなルートがある）ならその次の地点へ
    const activeRoute = sessionStorage.getItem("oa_active_route");
    if (activeRoute) {
      const route = routes.find((r) => r.slug === activeRoute);
      if (route) {
        const idx = route.cases.indexOf(current.slug);
        if (idx >= 0 && idx < route.cases.length - 1) {
          const nextSlug = route.cases[idx + 1];
          setNext({
            slug: nextSlug,
            name: "",
            region: "",
            reason: `ルート「${route.name}」の次の目的地`,
          });
          return;
        }
      }
    }
    if (nearest) {
      setNext({
        slug: nearest.slug,
        name: nearest.name,
        region: nearest.region,
        reason: "地理的に近い目的地",
      });
    }
  }, [current.slug, routes, nearest]);

  if (!next) return null;

  return (
    <Link
      href={`/case/${next.slug}`}
      onClick={() =>
        track("next_destination_click", {
          from_slug: current.slug,
          to_slug: next.slug,
        })
      }
      className="plate shift-hover block p-6"
      aria-label="次の目的地へ渡航"
    >
      <p className="font-fraunces italic text-xs tracking-wide">Next Destination</p>
      <p className="mt-1 font-mincho text-xl font-bold">
        次の目的地へ
        <span className="ml-2" aria-hidden>
          →
        </span>
      </p>
      <p className="mt-1 text-sm">
        {next.name ? `${next.name}（${next.region}）` : next.reason}
      </p>
    </Link>
  );
}
