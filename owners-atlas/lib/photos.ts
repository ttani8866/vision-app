// 各目的地のイメージ写真（Wikimedia Commonsから取得し、/public/images/cases/ に格納）。
// クレジットは data/photoCredits.json を参照して表示する。

import creditsData from "@/data/photoCredits.json";

interface PhotoCredit {
  author: string;
  license: string;
  source: string;
  descUrl: string;
}

const credits = creditsData as Record<string, PhotoCredit>;

export function photoUrl(slug: string): string {
  return `/images/cases/${slug}.jpg`;
}

export function photoCredit(slug: string): string {
  const c = credits[slug];
  if (!c) return "イメージ写真";
  const parts = ["イメージ写真: Wikimedia Commons"];
  if (c.author) parts.push(`撮影: ${c.author}`);
  if (c.license) parts.push(c.license);
  return parts.join(" / ");
}
