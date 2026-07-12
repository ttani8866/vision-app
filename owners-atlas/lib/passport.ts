"use client";

// 渡航印（パスポート）の localStorage 管理。
// 記録はこのブラウザにのみ保存される（会員登録なし）。

export interface StampRecord {
  slug: string;
  at: string;
}

export interface RouteStampRecord {
  slug: string;
  at: string;
}

export interface Passport {
  stamps: StampRecord[];
  routeStamps: RouteStampRecord[];
}

const KEY = "oa_passport";

export function loadPassport(): Passport {
  if (typeof localStorage === "undefined") return { stamps: [], routeStamps: [] };
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { stamps: [], routeStamps: [] };
    const parsed = JSON.parse(raw) as Passport;
    return {
      stamps: Array.isArray(parsed.stamps) ? parsed.stamps : [],
      routeStamps: Array.isArray(parsed.routeStamps) ? parsed.routeStamps : [],
    };
  } catch {
    return { stamps: [], routeStamps: [] };
  }
}

function save(p: Passport) {
  localStorage.setItem(KEY, JSON.stringify(p));
  window.dispatchEvent(new CustomEvent("oa:passport"));
}

export function hasStamp(slug: string): boolean {
  return loadPassport().stamps.some((s) => s.slug === slug);
}

export function pressStamp(slug: string): Passport {
  const p = loadPassport();
  if (!p.stamps.some((s) => s.slug === slug)) {
    p.stamps.push({ slug, at: new Date().toISOString() });
    save(p);
  }
  return p;
}

export function hasRouteStamp(slug: string): boolean {
  return loadPassport().routeStamps.some((s) => s.slug === slug);
}

export function pressRouteStamp(slug: string): Passport {
  const p = loadPassport();
  if (!p.routeStamps.some((s) => s.slug === slug)) {
    p.routeStamps.push({ slug, at: new Date().toISOString() });
    save(p);
  }
  return p;
}

// 渡航演出用: 直前にいた地点（無ければ null → 東京扱い）
export function getLastLocation(): { lat: number; lng: number } | null {
  if (typeof sessionStorage === "undefined") return null;
  try {
    const raw = sessionStorage.getItem("oa_last_location");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setLastLocation(lat: number, lng: number) {
  if (typeof sessionStorage === "undefined") return;
  sessionStorage.setItem("oa_last_location", JSON.stringify({ lat, lng }));
}

export function hasVisitedInSession(slug: string): boolean {
  if (typeof sessionStorage === "undefined") return false;
  return sessionStorage.getItem(`oa_visited_${slug}`) === "1";
}

export function markVisitedInSession(slug: string) {
  if (typeof sessionStorage === "undefined") return;
  sessionStorage.setItem(`oa_visited_${slug}`, "1");
}
