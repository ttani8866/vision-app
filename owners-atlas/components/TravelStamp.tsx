"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { CATEGORIES } from "@/lib/categories";
import { track } from "@/lib/analytics";
import {
  hasRouteStamp,
  hasStamp,
  loadPassport,
  pressRouteStamp,
  pressStamp,
} from "@/lib/passport";
import type { CaseItem, RouteItem } from "@/lib/types";

// 渡航印ブロック。スクロール90%到達で「渡航印を押す」ボタンが出現し、
// 押印でスタンプ演出＋localStorage記録。scroll_75計測もここで行う。
export default function TravelStamp({
  item,
  routes,
}: {
  item: CaseItem;
  routes: RouteItem[];
}) {
  const [revealed, setRevealed] = useState(false);
  const [stamped, setStamped] = useState(false);
  const [pressing, setPressing] = useState(false);
  const [routeDone, setRouteDone] = useState<RouteItem | null>(null);
  const scroll75Sent = useRef(false);
  const color = CATEGORIES[item.category].color;

  useEffect(() => {
    setStamped(hasStamp(item.slug));
    const onScroll = () => {
      const doc = document.documentElement;
      const progress =
        (window.scrollY + window.innerHeight) / doc.scrollHeight;
      if (progress >= 0.75 && !scroll75Sent.current) {
        scroll75Sent.current = true;
        track("scroll_75", { case_slug: item.slug });
      }
      if (progress >= 0.9) {
        setRevealed(true);
      }
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [item.slug]);

  const press = () => {
    const passport = pressStamp(item.slug);
    setStamped(true);
    setPressing(true);
    track("stamp_press", {
      case_slug: item.slug,
      total_stamps: passport.stamps.length,
    });
    // このケースを含むルートが踏破されたか確認
    for (const route of routes) {
      if (hasRouteStamp(route.slug)) continue;
      const stampedSlugs = new Set(passport.stamps.map((s) => s.slug));
      if (route.cases.every((slug) => stampedSlugs.has(slug))) {
        pressRouteStamp(route.slug);
        setRouteDone(route);
        track("route_complete", { route_slug: route.slug });
      }
    }
  };

  return (
    <section
      className="plate p-6 text-center"
      aria-label="渡航印"
      style={{ minHeight: "13rem" }}
    >
      <h2 className="font-mincho text-lg font-bold">
        {item.region}の渡航印
      </h2>
      {stamped ? (
        <div className="mt-4 flex flex-col items-center gap-4">
          <div
            className={`travel-stamp flex h-28 w-28 flex-col items-center justify-center rounded-full border-4 text-center ${pressing ? "stamp-pressing" : ""}`}
            style={{ borderColor: color, color }}
            role="img"
            aria-label={`${item.name}の渡航印（押印済み）`}
          >
            <span className="font-data text-[9px] tracking-widest">
              OWNER&rsquo;S ATLAS
            </span>
            <span className="font-mincho text-sm font-bold leading-tight px-2">
              {item.region.split("・").pop()}
            </span>
            <span className="font-data text-[10px]">Vol.{item.vol}</span>
          </div>
          <p className="text-sm">押印済み</p>
          {routeDone && (
            <p className="border-[1.5px] border-ink bg-accent px-4 py-2 text-sm font-bold">
              ルート「{routeDone.name}」踏破！ 踏破印がパスポートに追加されました
            </p>
          )}
          <Link
            href="/passport"
            className="border-[1.5px] border-ink px-5 py-2 text-sm shift-hover"
          >
            パスポートを見る
          </Link>
        </div>
      ) : revealed ? (
        <div className="mt-4 flex flex-col items-center gap-3">
          <p className="text-sm">この目的地を訪問した記録を残しましょう</p>
          <button
            onClick={press}
            className="border-[1.5px] border-ink bg-ink px-8 py-3 font-mincho text-base text-paper shift-hover"
          >
            渡航印を押す
          </button>
          <p className="text-xs text-ink/70">
            渡航印はこのブラウザに保存されます
          </p>
        </div>
      ) : (
        <p className="mt-6 text-sm text-ink/60">
          紀行文を最後まで読むと、渡航印を押せます
        </p>
      )}
    </section>
  );
}
