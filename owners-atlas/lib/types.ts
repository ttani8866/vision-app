export type CategoryKey =
  | "land"
  | "tree"
  | "brewing"
  | "field"
  | "animal"
  | "heritage"
  | "celestial"
  | "digital";

export type LegalNature = "ownership" | "usage" | "donation" | "symbolic";

export interface CaseScores {
  origin: number;
  token: number;
  time: number;
  arena: number;
}

export interface CaseItem {
  slug: string;
  vol: string;
  publishedAt: string;
  name: string;
  operator: string;
  country: string;
  region: string;
  lat: number;
  lng: number;
  category: CategoryKey;
  target: string;
  legalNature: LegalNature;
  priceRange: string;
  term: string;
  scores: CaseScores;
  perks: string[];
  officialUrl: string;
  updatedAt: string;
  travelInfo: { climate: string; access: string; trivia: string };
  leadA: string;
  leadB: string;
  body: { origin: string; token: string; time: string; experience: string };
  image: string;
}

export interface RouteItem {
  slug: string;
  name: string;
  nameEn: string;
  concept: string;
  cases: string[];
  stampName: string;
}

export interface TitleRank {
  min: number | "all";
  name: string;
}

export interface ArticleSection {
  heading: string;
  paragraphs: string[];
  embed?: string;
  quote?: string;
}

export interface ArticleItem {
  slug: string;
  title: string;
  titleEn: string;
  publishedAt: string;
  lead: string;
  embeds: string[];
  sections: ArticleSection[];
}
