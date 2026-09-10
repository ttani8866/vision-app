import { NextRequest, NextResponse } from "next/server";

// 共通PINによる簡易認証。BAEMESHI_APP_PIN が未設定なら保護なし（開発用）。
// /uploads はInstagram側がメディアを取得するため認証対象から除外する。

const PUBLIC_PATHS = [/^\/login/, /^\/api\/login/, /^\/uploads\//, /^\/favicon/];

async function sha256(s: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function middleware(req: NextRequest) {
  const pin = process.env.BAEMESHI_APP_PIN;
  if (!pin) return NextResponse.next();

  const { pathname } = req.nextUrl;
  if (PUBLIC_PATHS.some((r) => r.test(pathname))) return NextResponse.next();

  const expected = await sha256(pin);

  // curl等の検証用: ヘッダー認証も許可
  if (req.headers.get("x-bae-pin") === pin) return NextResponse.next();

  const cookie = req.cookies.get("bae_auth")?.value;
  if (cookie === expected) return NextResponse.next();

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ ok: false, error: "認証が必要です。ページを再読み込みしてログインしてください。" }, { status: 401 });
  }
  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.search = "";
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
