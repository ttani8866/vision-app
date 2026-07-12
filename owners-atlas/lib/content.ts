import casesData from "@/data/cases.json";
import routesData from "@/data/routes.json";
import titlesData from "@/data/titles.json";
import articlesData from "@/data/articles.json";
import type { CaseItem, RouteItem, TitleRank, ArticleItem } from "./types";

export const allCases = casesData as CaseItem[];
export const allRoutes = routesData as RouteItem[];
export const allTitles = titlesData as TitleRank[];
export const allArticles = articlesData as ArticleItem[];

export function getCase(slug: string): CaseItem | undefined {
  return allCases.find((c) => c.slug === slug);
}

export function getRoute(slug: string): RouteItem | undefined {
  return allRoutes.find((r) => r.slug === slug);
}

export function getArticle(slug: string): ArticleItem | undefined {
  return allArticles.find((a) => a.slug === slug);
}

export function casesOfRoute(route: RouteItem): CaseItem[] {
  return route.cases
    .map((slug) => getCase(slug))
    .filter((c): c is CaseItem => Boolean(c));
}

export function routesOfCase(slug: string): RouteItem[] {
  return allRoutes.filter((r) => r.cases.includes(slug));
}

export function newestFirst(): CaseItem[] {
  return [...allCases].sort((a, b) => b.vol.localeCompare(a.vol));
}

export function distanceKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

export function relatedCases(slug: string, n = 3): CaseItem[] {
  const base = getCase(slug);
  if (!base) return [];
  return allCases
    .filter((c) => c.slug !== slug)
    .sort((a, b) => {
      const catA = a.category === base.category ? 0 : 1;
      const catB = b.category === base.category ? 0 : 1;
      if (catA !== catB) return catA - catB;
      return (
        distanceKm(base.lat, base.lng, a.lat, a.lng) -
        distanceKm(base.lat, base.lng, b.lat, b.lng)
      );
    })
    .slice(0, n);
}

export function nearestCase(slug: string): CaseItem | undefined {
  const base = getCase(slug);
  if (!base) return undefined;
  return allCases
    .filter((c) => c.slug !== slug)
    .sort(
      (a, b) =>
        distanceKm(base.lat, base.lng, a.lat, a.lng) -
        distanceKm(base.lat, base.lng, b.lat, b.lng)
    )[0];
}

export function titleForCount(count: number): string {
  if (count <= 0) return "";
  if (count >= allCases.length) {
    const t = allTitles.find((x) => x.min === "all");
    if (t) return t.name;
  }
  const numeric = allTitles
    .filter((t): t is { min: number; name: string } => typeof t.min === "number")
    .sort((a, b) => b.min - a.min);
  return numeric.find((t) => count >= t.min)?.name ?? "";
}
