import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import CaseCard from "@/components/CaseCard";
import CategoryStamp from "@/components/CategoryStamp";
import DataCertificate from "@/components/DataCertificate";
import FadeIn from "@/components/FadeIn";
import FlightTransition from "@/components/FlightTransition";
import LeadAB from "@/components/LeadAB";
import NextDestination from "@/components/NextDestination";
import OfficialLink from "@/components/OfficialLink";
import RadarScore from "@/components/RadarScore";
import ShareBar from "@/components/ShareBar";
import TravelStamp from "@/components/TravelStamp";
import { CATEGORIES } from "@/lib/categories";
import {
  allCases,
  getCase,
  nearestCase,
  relatedCases,
  routesOfCase,
} from "@/lib/content";
import { photoCredit, photoUrl } from "@/lib/photos";

export function generateStaticParams() {
  return allCases.map((c) => ({ slug: c.slug }));
}

export function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Metadata {
  const item = getCase(params.slug);
  if (!item) return {};
  return {
    title: `${item.name}（${item.region}）`,
    description: `${item.target}のオーナーになれる、${item.region}の制度。${item.priceRange}。Owner's Atlasで世界のオーナー制度を旅する。`,
    openGraph: {
      title: `${item.name} | Owner's Atlas`,
      description: `${item.region} / ${item.target} / ${item.priceRange}`,
    },
  };
}

const BODY_SECTIONS = [
  { key: "origin", heading: "起源の物語", en: "Origin" },
  { key: "token", heading: "オーナーになると得られるもの", en: "Token" },
  { key: "time", heading: "時間の楽しみ", en: "Time" },
  { key: "experience", heading: "現地体験", en: "Experience" },
] as const;

export default function CasePage({ params }: { params: { slug: string } }) {
  const item = getCase(params.slug);
  if (!item) notFound();

  const routes = routesOfCase(item.slug);
  const related = relatedCases(item.slug, 3);
  const nearest = nearestCase(item.slug);
  const cat = CATEGORIES[item.category];

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Article",
        headline: item.name,
        datePublished: item.publishedAt,
        dateModified: item.updatedAt,
        inLanguage: "ja",
        author: { "@type": "Organization", name: "Owner's Atlas 編集部" },
        publisher: { "@type": "Organization", name: "Owner's Atlas" },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Owner's Atlas", item: "/" },
          {
            "@type": "ListItem",
            position: 2,
            name: item.name,
            item: `/case/${item.slug}`,
          },
        ],
      },
    ],
  };

  return (
    <article className="mx-auto max-w-3xl px-4 sm:px-6">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <FlightTransition
        slug={item.slug}
        lat={item.lat}
        lng={item.lng}
        destination={item.region}
      />

      {/* 到着ヘッダー */}
      <header className="pt-10 text-center sm:pt-14">
        <p className="font-data text-xs tracking-widest">
          Vol.{item.vol} / 発行日 {item.publishedAt}
        </p>
        <h1 className="mt-3 font-mincho text-3xl font-bold leading-snug sm:text-5xl">
          ようこそ、{item.region}へ
        </h1>
        <p className="mt-3 font-mincho text-xl">{item.name}</p>
        <div className="mt-4 flex items-center justify-center gap-3">
          <CategoryStamp category={item.category} size={48} />
          <span
            className="font-data text-xs uppercase tracking-widest"
            style={{ color: cat.color }}
          >
            {cat.labelEn} / {item.country}
          </span>
        </div>
      </header>

      {/* 入国情報枠 */}
      <section
        className="mt-8 border-y-[1.5px] border-ink py-4"
        aria-label="入国情報"
      >
        <dl className="grid gap-2 text-sm sm:grid-cols-1">
          <div className="flex gap-3">
            <dt className="w-20 shrink-0 font-mincho font-bold">気候</dt>
            <dd>{item.travelInfo.climate}</dd>
          </div>
          <div className="flex gap-3">
            <dt className="w-20 shrink-0 font-mincho font-bold">アクセス</dt>
            <dd>{item.travelInfo.access}</dd>
          </div>
          <div className="flex gap-3">
            <dt className="w-20 shrink-0 font-mincho font-bold">豆知識</dt>
            <dd>{item.travelInfo.trivia}</dd>
          </div>
        </dl>
      </section>

      {/* リード文（A/Bテスト対象） */}
      <section className="mt-10" aria-label="リード">
        <LeadAB leadA={item.leadA} leadB={item.leadB} />
      </section>

      {/* メインビジュアル: イメージ写真 */}
      <FadeIn>
        <figure className="plate mt-10 p-3" aria-label={`${item.name}のビジュアル`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={photoUrl(item.slug)}
            alt={`${item.region}のイメージ写真`}
            width={1200}
            height={600}
            loading="lazy"
            className="h-auto w-full object-cover"
            style={{ aspectRatio: "2 / 1", backgroundColor: `${cat.color}22` }}
          />
          <figcaption className="flex items-center justify-between gap-4 px-2 py-1 text-[10px] text-ink/60">
            <span className="font-data shrink-0">
              {item.lat.toFixed(2)}, {item.lng.toFixed(2)}
            </span>
            <span className="text-right">{photoCredit(item.slug)}</span>
          </figcaption>
        </figure>
      </FadeIn>

      {/* 証明書テーブル */}
      <FadeIn className="mt-10">
        <DataCertificate item={item} />
      </FadeIn>

      {/* レーダーチャート */}
      <FadeIn className="mt-10">
        <RadarScore item={item} />
      </FadeIn>

      {/* 本文4セクション */}
      {BODY_SECTIONS.map((section, i) => (
        <FadeIn key={section.key} className="mt-12">
          <section aria-label={section.heading}>
            <h2 className="flex items-baseline gap-3 border-b-[1.5px] border-ink pb-2 font-mincho text-2xl font-bold">
              <span className="font-data text-sm" aria-hidden>
                0{i + 1}
              </span>
              {section.heading}
              <span className="font-fraunces italic text-sm font-normal">
                {section.en}
              </span>
            </h2>
            <p className="mt-4 leading-loose">{item.body[section.key]}</p>
          </section>
        </FadeIn>
      ))}

      {/* オーナーになる方法 */}
      <FadeIn className="mt-12">
        <OfficialLink
          slug={item.slug}
          url={item.officialUrl}
          operator={item.operator}
        />
      </FadeIn>

      {/* シェア */}
      <div className="mt-10">
        <ShareBar slug={item.slug} title={item.name} />
      </div>

      {/* 渡航印 */}
      <div className="mt-12">
        <TravelStamp item={item} routes={routes} />
      </div>

      {/* 次の目的地へ */}
      <div className="mt-12">
        <NextDestination
          current={item}
          routes={routes}
          nearest={
            nearest
              ? { slug: nearest.slug, name: nearest.name, region: nearest.region }
              : undefined
          }
        />
      </div>

      {/* 所属ルート */}
      {routes.length > 0 && (
        <section className="mt-12" aria-label="この目的地を含む旅程">
          <h2 className="font-mincho text-lg font-bold">この目的地を含む旅程</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {routes.map((r) => (
              <li key={r.slug}>
                <Link
                  href={`/route/${r.slug}`}
                  className="underline decoration-accent decoration-2 underline-offset-4"
                >
                  {r.name}（{r.cases.length}目的地）
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* 関連事例 */}
      <section className="mt-12 pb-4" aria-label="関連する目的地">
        <h2 className="font-mincho text-lg font-bold">こんな目的地も</h2>
        <div className="mt-4 grid grid-cols-1 gap-6 sm:grid-cols-3">
          {related.map((c) => (
            <CaseCard key={c.slug} item={c} />
          ))}
        </div>
      </section>
    </article>
  );
}
