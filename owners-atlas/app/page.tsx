import Link from "next/link";
import AtlasMap from "@/components/AtlasMap";
import CaseCard from "@/components/CaseCard";
import CategoryStamp from "@/components/CategoryStamp";
import FadeIn from "@/components/FadeIn";
import PassportBanner from "@/components/PassportBanner";
import RouteTicket from "@/components/RouteTicket";
import { CATEGORIES } from "@/lib/categories";
import { allArticles, allCases, allRoutes, newestFirst } from "@/lib/content";
import { photoUrl } from "@/lib/photos";

export default function HomePage() {
  const cases = newestFirst();
  const latest = cases[0];
  const backnumbers = cases.slice(1);
  const pins = allCases.map((c) => ({
    slug: c.slug,
    name: c.name,
    country: c.country,
    region: c.region,
    priceRange: c.priceRange,
    category: c.category,
    lat: c.lat,
    lng: c.lng,
  }));
  const coords = Object.fromEntries(
    allCases.map((c) => [c.slug, { lat: c.lat, lng: c.lng }])
  );

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6">
      {/* ヒーロー: アトラス・マップ */}
      <section className="pt-10 sm:pt-14" aria-label="アトラス・マップ">
        <div className="text-center">
          <p className="font-fraunces italic text-sm tracking-wide">
            The Atlas of Ownership Experiences
          </p>
          <h1 className="mt-2 font-mincho text-4xl font-bold leading-tight sm:text-6xl">
            オーナー体験世界旅行。
          </h1>
          <p className="mt-4 font-mincho text-lg">
            今日は、どの土地のオーナー気分?
          </p>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed">
            ウイスキーの樽、知床の森、月の土地。世界の「オーナーになれる場所」を旅するメディア。
            ピンを選んで、最初の目的地へ渡航しましょう。
          </p>
        </div>
        <div className="plate mt-8 p-2 sm:p-4">
          <AtlasMap pins={pins} />
        </div>
        <div className="mt-3 flex flex-wrap justify-center gap-x-5 gap-y-1 text-xs">
          {Object.entries(CATEGORIES).map(([key, cat]) => (
            <span key={key} className="inline-flex items-center gap-1.5">
              <span
                className="inline-block h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: cat.color }}
                aria-hidden
              />
              {cat.label}
            </span>
          ))}
        </div>
      </section>

      {/* 旅程（ルート） */}
      <FadeIn>
        <section className="mt-20" aria-label="旅程">
          <div className="flex items-baseline justify-between border-b-[1.5px] border-ink pb-2">
            <h2 className="font-mincho text-2xl font-bold">
              旅程 <span className="font-fraunces italic text-base">Routes</span>
            </h2>
            <p className="text-xs">編集部が組んだテーマ別周遊コース</p>
          </div>
          <div className="mt-6 flex snap-x gap-6 overflow-x-auto pb-4">
            {allRoutes.map((route) => (
              <div key={route.slug} className="snap-start">
                <RouteTicket route={route} />
              </div>
            ))}
          </div>
        </section>
      </FadeIn>

      {/* 最新の目的地 */}
      <FadeIn>
        <section className="mt-20" aria-label="最新の目的地">
          <div className="border-b-[1.5px] border-ink pb-2">
            <h2 className="font-mincho text-2xl font-bold">
              最新の目的地{" "}
              <span className="font-fraunces italic text-base">Latest Issue</span>
            </h2>
          </div>
          <Link
            href={`/case/${latest.slug}`}
            className="certificate shift-hover mt-6 block"
            aria-label={`最新号 ${latest.name} へ渡航`}
          >
            <div className="certificate-inner p-8 sm:p-12">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photoUrl(latest.slug)}
                alt={`${latest.region}のイメージ写真`}
                width={1200}
                height={480}
                loading="lazy"
                className="mb-8 h-auto w-full border border-ink/30 object-cover"
                style={{ aspectRatio: "5 / 2" }}
              />
              <div className="flex flex-wrap items-start justify-between gap-4">
                <p className="font-data text-sm tracking-widest">
                  Vol.{latest.vol} / {latest.publishedAt}
                </p>
                <CategoryStamp category={latest.category} size={56} />
              </div>
              <p
                className="mt-4 font-data text-xs uppercase tracking-widest"
                style={{ color: CATEGORIES[latest.category].color }}
              >
                {CATEGORIES[latest.category].labelEn} / {latest.country}
              </p>
              <h3 className="mt-2 font-mincho text-3xl font-bold leading-snug sm:text-4xl">
                {latest.name}
              </h3>
              <p className="mt-3 text-lg">{latest.region}</p>
              <p className="mt-4 max-w-2xl text-sm leading-relaxed">
                {latest.target}のオーナーになる。{latest.priceRange}。
              </p>
              <p className="mt-6 inline-block border-[1.5px] border-ink px-5 py-2 font-mincho text-sm">
                この目的地へ渡航する →
              </p>
            </div>
          </Link>
        </section>
      </FadeIn>

      {/* バックナンバー棚 */}
      <FadeIn>
        <section className="mt-20" aria-label="バックナンバー">
          <div className="border-b-[1.5px] border-ink pb-2">
            <h2 className="font-mincho text-2xl font-bold">
              目的地の棚{" "}
              <span className="font-fraunces italic text-base">Back Numbers</span>
            </h2>
          </div>
          <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {backnumbers.map((item) => (
              <CaseCard key={item.slug} item={item} />
            ))}
          </div>
        </section>
      </FadeIn>

      {/* パスポート導線 */}
      <FadeIn>
        <section className="mt-20" aria-label="パスポート">
          <PassportBanner coords={coords} />
        </section>
      </FadeIn>

      {/* 特集記事 */}
      <FadeIn>
        <section className="mt-20" aria-label="特集記事">
          <div className="border-b-[1.5px] border-ink pb-2">
            <h2 className="font-mincho text-2xl font-bold">
              特集 <span className="font-fraunces italic text-base">Features</span>
            </h2>
          </div>
          <ul className="mt-6 space-y-4">
            {allArticles.map((article) => (
              <li key={article.slug}>
                <Link
                  href={`/article/${article.slug}`}
                  className="plate shift-hover block p-6"
                >
                  <p className="font-fraunces italic text-xs">{article.titleEn}</p>
                  <h3 className="mt-1 font-mincho text-xl font-bold leading-snug">
                    {article.title}
                  </h3>
                  <p className="mt-2 line-clamp-2 text-sm leading-relaxed">
                    {article.lead}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </FadeIn>
    </div>
  );
}
