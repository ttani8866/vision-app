import type { MetadataRoute } from "next";
import { allArticles, allCases, allRoutes } from "@/lib/content";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://owners-atlas.vercel.app";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: SITE_URL, changeFrequency: "weekly", priority: 1 },
    ...allCases.map((c) => ({
      url: `${SITE_URL}/case/${c.slug}`,
      lastModified: c.updatedAt,
      priority: 0.8,
    })),
    ...allRoutes.map((r) => ({
      url: `${SITE_URL}/route/${r.slug}`,
      priority: 0.6,
    })),
    ...allArticles.map((a) => ({
      url: `${SITE_URL}/article/${a.slug}`,
      lastModified: a.publishedAt,
      priority: 0.6,
    })),
    { url: `${SITE_URL}/passport`, priority: 0.5 },
    { url: `${SITE_URL}/about`, priority: 0.3 },
    { url: `${SITE_URL}/privacy`, priority: 0.1 },
  ];
}
