"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CATEGORIES } from "@/lib/categories";
import { track } from "@/lib/analytics";
import { loadPassport, type Passport } from "@/lib/passport";
import type { CaseItem, RouteItem } from "@/lib/types";

interface Props {
  cases: CaseItem[];
  routes: RouteItem[];
  titles: { min: number | "all"; name: string }[];
}

function titleFor(count: number, total: number, titles: Props["titles"]): string {
  if (count <= 0) return "";
  if (count >= total) {
    const t = titles.find((x) => x.min === "all");
    if (t) return t.name;
  }
  const numeric = titles
    .filter((t): t is { min: number; name: string } => typeof t.min === "number")
    .sort((a, b) => b.min - a.min);
  return numeric.find((t) => count >= t.min)?.name ?? "";
}

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

// アトラス・パスポート: 御朱印帳風の見開きに押印済みスタンプが並ぶ（帳面式）
export default function PassportBook({ cases, routes, titles }: Props) {
  const [passport, setPassport] = useState<Passport | null>(null);

  useEffect(() => {
    const p = loadPassport();
    setPassport(p);
  }, []);

  useEffect(() => {
    if (!passport) return;
    const title = titleFor(passport.stamps.length, cases.length, titles);
    track("passport_view", {
      total_stamps: passport.stamps.length,
      title_rank: title || "none",
    });
    // 依存はマウント時の1回でよい
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [passport === null]);

  if (!passport) {
    return <p className="py-12 text-center text-sm">パスポートを開いています…</p>;
  }

  const stampedCases = passport.stamps
    .map((s) => ({ record: s, item: cases.find((c) => c.slug === s.slug) }))
    .filter((x): x is { record: (typeof passport.stamps)[0]; item: CaseItem } =>
      Boolean(x.item)
    );

  // 総移動距離: 訪問順にヘヴァーサイン距離を合算
  let totalKm = 0;
  for (let i = 1; i < stampedCases.length; i++) {
    const prev = stampedCases[i - 1].item;
    const cur = stampedCases[i].item;
    totalKm += haversine(prev.lat, prev.lng, cur.lat, cur.lng);
  }
  totalKm = Math.round(totalKm);

  const title = titleFor(stampedCases.length, cases.length, titles);
  const doneRoutes = passport.routeStamps
    .map((s) => routes.find((r) => r.slug === s.slug))
    .filter((r): r is RouteItem => Boolean(r));

  const sharePassport = async () => {
    track("passport_share", {
      total_stamps: stampedCases.length,
      total_distance_km: totalKm,
    });
    const params = new URLSearchParams({
      stamps: String(stampedCases.length),
      km: String(totalKm),
      title: title || "旅人見習い",
    });
    const url = `${location.origin}/passport/share?${params.toString()}`;
    const text = `アトラス・パスポート: ${stampedCases.length}個の渡航印、総移動距離${totalKm.toLocaleString()}km ${title ? `「${title}」` : ""} | Owner's Atlas`;
    if (navigator.share) {
      try {
        await navigator.share({ title: text, url });
      } catch {
        // キャンセルは正常系
      }
    } else {
      await navigator.clipboard.writeText(`${text} ${url}`);
      alert("旅の記録リンクをコピーしました");
    }
  };

  if (stampedCases.length === 0) {
    return (
      <div className="plate mx-auto max-w-xl p-8 text-center">
        <p className="font-mincho text-lg font-bold">
          まだ渡航印がありません
        </p>
        <p className="mt-3 text-sm leading-relaxed">
          目的地の紀行文を最後まで読むと、渡航印を押せます。
          最初の一歩は、地図の上のどのピンからでも。
        </p>
        <Link
          href="/"
          className="mt-5 inline-block border-[1.5px] border-ink bg-ink px-6 py-3 font-mincho text-paper shift-hover"
        >
          アトラス・マップへ
        </Link>
        <p className="mt-4 text-xs text-ink/60">
          渡航印はこのブラウザに保存されます
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* 表紙情報 */}
      <div className="plate flex flex-wrap items-center justify-between gap-6 p-6">
        <div>
          <p className="font-fraunces italic text-sm">Atlas Passport</p>
          <p className="font-mincho text-2xl font-bold">
            {title && <span className="marker-highlight">{title}</span>}
          </p>
        </div>
        <dl className="flex gap-8 text-center">
          <div>
            <dt className="text-xs">渡航印</dt>
            <dd className="font-data text-3xl">{stampedCases.length}</dd>
          </div>
          <div>
            <dt className="text-xs">総移動距離</dt>
            <dd className="font-data text-3xl">
              {totalKm.toLocaleString()}
              <span className="text-sm">km</span>
            </dd>
          </div>
          <div>
            <dt className="text-xs">踏破ルート</dt>
            <dd className="font-data text-3xl">{doneRoutes.length}</dd>
          </div>
        </dl>
      </div>

      {totalKm > 0 && (
        <p className="mt-6 text-center font-mincho text-lg">
          あなたはこの旅で、地球を
          <span className="font-data mx-1 text-2xl">{totalKm.toLocaleString()}</span>
          km移動しました。
        </p>
      )}

      {/* 御朱印帳風見開き: 押した分だけページが増える */}
      <div className="mt-8 grid grid-cols-2 gap-x-0 gap-y-px border-[1.5px] border-ink sm:grid-cols-3 lg:grid-cols-4">
        {stampedCases.map(({ record, item }, i) => {
          const color = CATEGORIES[item.category].color;
          return (
            <div
              key={item.slug}
              className={`flex flex-col items-center gap-2 border-ink/40 p-6 ${i % 2 === 0 ? "border-r" : ""} border-b`}
            >
              <Link
                href={`/case/${item.slug}`}
                className="travel-stamp flex h-24 w-24 flex-col items-center justify-center rounded-full border-4 text-center"
                style={{ borderColor: color, color }}
                aria-label={`${item.name}の渡航印`}
              >
                <span className="font-data text-[8px] tracking-widest">
                  OWNER&rsquo;S ATLAS
                </span>
                <span className="px-2 font-mincho text-xs font-bold leading-tight">
                  {item.region.split("・").pop()}
                </span>
                <span className="font-data text-[9px]">Vol.{item.vol}</span>
              </Link>
              <p className="text-center text-xs leading-tight">{item.name}</p>
              <p className="font-data text-[10px] text-ink/60">
                {record.at.slice(0, 10)}
              </p>
            </div>
          );
        })}
      </div>

      {/* 踏破印 */}
      {doneRoutes.length > 0 && (
        <div className="mt-10">
          <h2 className="font-mincho text-xl font-bold">ルート踏破印</h2>
          <div className="mt-4 flex flex-wrap gap-6">
            {doneRoutes.map((route) => (
              <div
                key={route.slug}
                className="travel-stamp flex h-32 w-32 flex-col items-center justify-center rounded-full border-4 border-double border-ink text-center text-ink"
                style={{ borderStyle: "double", borderWidth: 6 }}
                role="img"
                aria-label={route.stampName}
              >
                <span className="font-fraunces italic text-[9px]">Route Complete</span>
                <span className="px-3 font-mincho text-sm font-bold leading-tight">
                  {route.name}
                </span>
                <span className="font-data text-[9px]">踏破</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-10 flex flex-wrap items-center gap-4">
        <button
          onClick={sharePassport}
          className="border-[1.5px] border-ink bg-ink px-6 py-3 font-mincho text-paper shift-hover"
        >
          旅の記録をシェア
        </button>
        <Link href="/" className="text-sm underline underline-offset-4">
          次の目的地を探す
        </Link>
      </div>
      <p className="mt-4 text-xs text-ink/60">
        渡航印はこのブラウザに保存されます。端末やブラウザを変えると記録は引き継がれません。
      </p>
    </div>
  );
}
