import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// A/Bテスト振り分け: 初回訪問時に oa_variant Cookie（a/b、50/50、90日）を付与する。
// リード文の出し分けはクライアント側（LeadAB）で行い、SSGと両立させる。

export function middleware(request: NextRequest) {
  const existing = request.cookies.get("oa_variant")?.value;
  if (existing === "a" || existing === "b") {
    return NextResponse.next();
  }
  const variant = Math.random() < 0.5 ? "a" : "b";
  const response = NextResponse.next();
  response.cookies.set("oa_variant", variant, {
    maxAge: 60 * 60 * 24 * 90,
    path: "/",
    sameSite: "lax",
  });
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|images/).*)"],
};
