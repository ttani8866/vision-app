"use client";

// GA4計測ラッパー。同意（oa_consent=granted）前は一切送信しない。
// すべてのイベントに variant を自動付与する。

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

export const GA_ID = process.env.NEXT_PUBLIC_GA_ID ?? "";

export function getVariant(): "a" | "b" {
  if (typeof document === "undefined") return "a";
  const m = document.cookie.match(/(?:^|;\s*)oa_variant=(a|b)/);
  return (m?.[1] as "a" | "b") ?? "a";
}

export function hasConsent(): boolean {
  if (typeof localStorage === "undefined") return false;
  return localStorage.getItem("oa_consent") === "granted";
}

export function setConsent(granted: boolean) {
  localStorage.setItem("oa_consent", granted ? "granted" : "denied");
  if (granted) loadGa();
}

export function consentAnswered(): boolean {
  if (typeof localStorage === "undefined") return false;
  return localStorage.getItem("oa_consent") !== null;
}

let gaLoaded = false;

export function loadGa() {
  if (gaLoaded || !GA_ID || typeof document === "undefined") return;
  gaLoaded = true;
  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag() {
    // eslint-disable-next-line prefer-rest-params
    window.dataLayer!.push(arguments);
  };
  window.gtag("js", new Date());
  window.gtag("config", GA_ID, { anonymize_ip: true });
  setUserProperties();
  const s = document.createElement("script");
  s.async = true;
  s.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
  document.head.appendChild(s);
}

export function initGaIfConsented() {
  if (hasConsent()) loadGa();
}

function setUserProperties() {
  if (!window.gtag) return;
  let stampUser = "no";
  try {
    const raw = localStorage.getItem("oa_passport");
    if (raw && JSON.parse(raw).stamps?.length > 0) stampUser = "yes";
  } catch {
    // localStorage が使えない環境では既定値のまま
  }
  window.gtag("set", "user_properties", {
    variant: getVariant(),
    stamp_user: stampUser,
  });
}

export function track(event: string, params: Record<string, unknown> = {}) {
  if (!hasConsent() || typeof window === "undefined" || !window.gtag) return;
  window.gtag("event", event, { ...params, variant: getVariant() });
}
