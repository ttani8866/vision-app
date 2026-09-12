import { NextResponse } from "next/server";
import { listCriteriaSets } from "@/lib/criteria";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json({ ok: true, sets: listCriteriaSets() });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}
