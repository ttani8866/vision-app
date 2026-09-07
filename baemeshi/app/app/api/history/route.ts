import { NextResponse } from "next/server";
import { listPostHistory } from "@/lib/db";

export async function GET() {
  return NextResponse.json({ ok: true, items: listPostHistory() });
}
