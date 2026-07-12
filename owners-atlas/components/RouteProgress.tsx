"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { track } from "@/lib/analytics";
import { hasRouteStamp, loadPassport } from "@/lib/passport";
import type { RouteItem } from "@/lib/types";

// 行程進捗: 「3/5地点を訪問済み」＋周遊開始ボタン（route_start計測）
export default function RouteProgress({ route }: { route: RouteItem }) {
  const router = useRouter();
  const [visited, setVisited] = useState(0);
  const [complete, setComplete] = useState(false);

  useEffect(() => {
    const passport = loadPassport();
    const stampedSlugs = new Set(passport.stamps.map((s) => s.slug));
    setVisited(route.cases.filter((slug) => stampedSlugs.has(slug)).length);
    setComplete(hasRouteStamp(route.slug));
  }, [route]);

  const start = () => {
    sessionStorage.setItem("oa_active_route", route.slug);
    track("route_start", { route_slug: route.slug });
    router.push(`/case/${route.cases[0]}`);
  };

  return (
    <div className="plate p-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="font-data text-2xl">
            {visited}
            <span className="text-base">/{route.cases.length}</span>
            <span className="ml-2 font-body text-sm">地点を訪問済み</span>
          </p>
          <div
            className="mt-2 flex gap-1.5"
            role="img"
            aria-label={`${route.cases.length}地点中${visited}地点訪問済み`}
          >
            {route.cases.map((slug, i) => (
              <span
                key={slug}
                className="inline-block h-3 w-8 border border-ink"
                style={{
                  backgroundColor: i < visited ? "#F5D547" : "transparent",
                }}
              />
            ))}
          </div>
        </div>
        {complete ? (
          <p className="border-[1.5px] border-ink bg-accent px-4 py-2 font-mincho text-sm font-bold">
            {route.stampName} 獲得済み
          </p>
        ) : (
          <button
            onClick={start}
            className="border-[1.5px] border-ink bg-ink px-6 py-3 font-mincho text-paper shift-hover"
          >
            この旅程で旅を始める
          </button>
        )}
      </div>
      {!complete && (
        <p className="mt-3 text-xs">
          全地点の渡航印を集めると「{route.stampName}」がパスポートに追加されます
        </p>
      )}
    </div>
  );
}
