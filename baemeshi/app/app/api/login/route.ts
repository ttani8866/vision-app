import { createHash } from "crypto";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { pin?: string } | null;
  const pin = process.env.BAEMESHI_APP_PIN;

  if (!pin) {
    return NextResponse.json({ ok: false, error: "サーバーにPINが設定されていません" }, { status: 500 });
  }
  if (!body?.pin || body.pin !== pin) {
    return NextResponse.json({ ok: false, error: "PINコードが違います" }, { status: 401 });
  }

  const hash = createHash("sha256").update(pin).digest("hex");
  const res = NextResponse.json({ ok: true });
  res.cookies.set("bae_auth", hash, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 180, // 180日
    path: "/",
  });
  return res;
}
