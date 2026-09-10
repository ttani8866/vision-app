import { NextResponse } from "next/server";
import { generateCaption, type StoreInfo } from "@/lib/claude";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { store?: StoreInfo; direction?: string } | null;
  const store = body?.store;

  if (!store || !store.name) {
    return NextResponse.json({ ok: false, error: "店舗情報が不足しています" }, { status: 400 });
  }

  try {
    const caption = await generateCaption(store, body?.direction);
    return NextResponse.json({ ok: true, caption });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
