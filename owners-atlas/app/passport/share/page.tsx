import type { Metadata } from "next";
import Link from "next/link";

// 旅の記録シェア用ページ。searchParamsからOGP画像を動的生成する。
export const dynamic = "force-dynamic";

interface Search {
  stamps?: string;
  km?: string;
  title?: string;
}

export function generateMetadata({
  searchParams,
}: {
  searchParams: Search;
}): Metadata {
  const stamps = searchParams.stamps ?? "0";
  const km = searchParams.km ?? "0";
  const title = searchParams.title ?? "旅人";
  const og = `/api/og/passport?stamps=${encodeURIComponent(stamps)}&km=${encodeURIComponent(km)}&title=${encodeURIComponent(title)}`;
  return {
    title: `旅の記録 — ${title}（渡航印${stamps}個）`,
    description: `渡航印${stamps}個、総移動距離${Number(km).toLocaleString()}km。Owner's Atlasで世界のオーナー制度を巡る旅。`,
    openGraph: { images: [og] },
    twitter: { card: "summary_large_image", images: [og] },
  };
}

export default function PassportSharePage({
  searchParams,
}: {
  searchParams: Search;
}) {
  const stamps = Number(searchParams.stamps ?? 0);
  const km = Number(searchParams.km ?? 0);
  const title = searchParams.title ?? "旅人";

  return (
    <div className="mx-auto max-w-2xl px-4 pt-14 text-center sm:px-6">
      <p className="font-fraunces italic text-sm">Travel Record</p>
      <h1 className="mt-2 font-mincho text-3xl font-bold sm:text-4xl">
        ある旅人の記録
      </h1>
      <div className="plate mx-auto mt-8 max-w-md p-8">
        <p className="font-mincho text-2xl font-bold">
          <span className="marker-highlight">{title}</span>
        </p>
        <dl className="mt-6 flex justify-center gap-10">
          <div>
            <dt className="text-xs">渡航印</dt>
            <dd className="font-data text-4xl">{stamps}</dd>
          </div>
          <div>
            <dt className="text-xs">総移動距離</dt>
            <dd className="font-data text-4xl">
              {km.toLocaleString()}
              <span className="text-base">km</span>
            </dd>
          </div>
        </dl>
      </div>
      <p className="mt-8 text-sm leading-relaxed">
        Owner&rsquo;s Atlasは、世界の「オーナーになれる場所」を旅するメディアです。
        あなたも地図のピンから、最初の目的地へ。
      </p>
      <Link
        href="/"
        className="mt-6 inline-block border-[1.5px] border-ink bg-ink px-8 py-3 font-mincho text-paper shift-hover"
      >
        旅を始める
      </Link>
    </div>
  );
}
