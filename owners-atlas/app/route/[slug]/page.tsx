import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import CategoryStamp from "@/components/CategoryStamp";
import RouteProgress from "@/components/RouteProgress";
import { CATEGORIES } from "@/lib/categories";
import { allRoutes, casesOfRoute, distanceKm, getRoute } from "@/lib/content";
import { CONTINENT_PATHS, MAP_H, MAP_W, project } from "@/components/worldMap";

export function generateStaticParams() {
  return allRoutes.map((r) => ({ slug: r.slug }));
}

export function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Metadata {
  const route = getRoute(params.slug);
  if (!route) return {};
  return {
    title: `${route.name}（${route.nameEn}）`,
    description: route.concept,
  };
}

export default function RoutePage({ params }: { params: { slug: string } }) {
  const route = getRoute(params.slug);
  if (!route) notFound();
  const cases = casesOfRoute(route);

  let totalKm = 0;
  for (let i = 1; i < cases.length; i++) {
    totalKm += distanceKm(
      cases[i - 1].lat,
      cases[i - 1].lng,
      cases[i].lat,
      cases[i].lng
    );
  }

  const points = cases.map((c) => project(c.lat, c.lng));

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6">
      <header className="pt-10 text-center sm:pt-14">
        <p className="font-fraunces italic text-sm tracking-wide">{route.nameEn}</p>
        <h1 className="mt-2 font-mincho text-4xl font-bold sm:text-5xl">
          {route.name}
        </h1>
        <p className="mx-auto mt-4 max-w-xl leading-relaxed">{route.concept}</p>
        <p className="mt-2 font-data text-sm">
          {cases.length}目的地 / 行程約{totalKm.toLocaleString()}km
        </p>
      </header>

      {/* 行程地図 */}
      <div className="plate mt-8 p-2 sm:p-4" aria-label="行程地図">
        <svg
          viewBox={`0 0 ${MAP_W} ${MAP_H}`}
          role="img"
          aria-label={`${route.name}の行程地図`}
          className="h-auto w-full"
        >
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
          {points.slice(1).map((p, i) => (
            <line
              key={i}
              x1={points[i].x}
              y1={points[i].y}
              x2={p.x}
              y2={p.y}
              stroke="#1E2A3A"
              strokeWidth={1.5}
              strokeDasharray="6 4"
            />
          ))}
          {points.map((p, i) => (
            <g key={i}>
              <circle
                cx={p.x}
                cy={p.y}
                r={9}
                fill={CATEGORIES[cases[i].category].color}
                stroke="#FAF6EF"
                strokeWidth={1.5}
              />
              <text
                x={p.x}
                y={p.y + 4}
                textAnchor="middle"
                fontSize={10}
                fill="#FAF6EF"
                style={{ fontFamily: "var(--font-space-grotesk)" }}
              >
                {i + 1}
              </text>
            </g>
          ))}
        </svg>
      </div>

      {/* 進捗 */}
      <div className="mt-8">
        <RouteProgress route={route} />
      </div>

      {/* 目的地リスト: 順番付き切符風カード */}
      <ol className="mt-10 space-y-6" aria-label="目的地リスト">
        {cases.map((item, i) => (
          <li key={item.slug}>
            <Link
              href={`/case/${item.slug}`}
              className="plate shift-hover flex items-stretch"
              aria-label={`${i + 1}番目の目的地 ${item.name}`}
            >
              <div
                className="flex w-16 shrink-0 flex-col items-center justify-center border-r-2 border-dashed border-ink/45"
                aria-hidden
              >
                <span className="font-data text-2xl">{i + 1}</span>
                <span className="text-[10px]">日目</span>
              </div>
              <div className="flex flex-1 items-center justify-between gap-4 p-5">
                <div>
                  <p
                    className="font-data text-[10px] uppercase tracking-widest"
                    style={{ color: CATEGORIES[item.category].color }}
                  >
                    {CATEGORIES[item.category].labelEn} / {item.country}
                  </p>
                  <h2 className="font-mincho text-lg font-bold leading-snug">
                    {item.name}
                  </h2>
                  <p className="mt-1 text-sm">{item.region}</p>
                </div>
                <CategoryStamp category={item.category} size={44} />
              </div>
            </Link>
          </li>
        ))}
      </ol>

      <div className="mt-12 pb-4 text-center">
        <Link
          href="/"
          className="inline-block border-[1.5px] border-ink px-6 py-3 font-mincho shift-hover"
        >
          アトラス・マップへ戻る
        </Link>
      </div>
    </div>
  );
}
