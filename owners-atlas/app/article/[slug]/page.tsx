import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import ArticleEmbed from "@/components/ArticleEmbed";
import FadeIn from "@/components/FadeIn";
import { allArticles, getArticle } from "@/lib/content";

export function generateStaticParams() {
  return allArticles.map((a) => ({ slug: a.slug }));
}

export function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Metadata {
  const article = getArticle(params.slug);
  if (!article) return {};
  return { title: article.title, description: article.lead };
}

export default function ArticlePage({
  params,
}: {
  params: { slug: string };
}) {
  const article = getArticle(params.slug);
  if (!article) notFound();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.title,
    datePublished: article.publishedAt,
    inLanguage: "ja",
    author: { "@type": "Organization", name: "Owner's Atlas 編集部" },
  };

  return (
    <article className="mx-auto px-4 sm:px-6" style={{ maxWidth: 640 }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <header className="pt-10 sm:pt-14">
        <p className="font-fraunces italic text-sm tracking-wide">
          {article.titleEn}
        </p>
        <h1 className="mt-3 font-mincho text-3xl font-bold leading-snug sm:text-4xl">
          {article.title}
        </h1>
        <p className="mt-3 font-data text-xs tracking-widest">
          {article.publishedAt} / Owner&rsquo;s Atlas 編集部
        </p>
      </header>

      <p className="mt-8 border-y-[1.5px] border-ink py-5 text-lg leading-loose">
        {article.lead}
      </p>

      {article.sections.map((section, i) => (
        <FadeIn key={i} className="mt-12">
          <section aria-label={section.heading}>
            <h2 className="border-b-[1.5px] border-ink pb-2 font-mincho text-2xl font-bold">
              {section.heading}
            </h2>
            {section.quote && (
              <blockquote className="mt-6 border-l-4 border-accent pl-5 font-mincho text-xl leading-relaxed">
                {section.quote}
              </blockquote>
            )}
            {section.paragraphs.map((p, j) => (
              <p key={j} className="mt-5 leading-loose">
                {p}
              </p>
            ))}
            {section.embed && <ArticleEmbed slug={section.embed} />}
          </section>
        </FadeIn>
      ))}

      <div className="mt-14 pb-4">
        <Link
          href="/"
          className="plate shift-hover block p-6"
          aria-label="次の目的地を探す"
        >
          <p className="font-fraunces italic text-xs">Next Destination</p>
          <p className="mt-1 font-mincho text-xl font-bold">
            地図に戻って、次の目的地を探す →
          </p>
        </Link>
      </div>
    </article>
  );
}
