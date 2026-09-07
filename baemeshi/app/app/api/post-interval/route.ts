import { NextResponse } from "next/server";
import { msSinceLastSuccessfulPost } from "@/lib/db";

export async function GET() {
  const ms = msSinceLastSuccessfulPost();
  const hoursSince = ms === null ? null : ms / (1000 * 60 * 60);
  return NextResponse.json({
    ok: true,
    hoursSinceLastPost: hoursSince,
    warnLessThan24h: hoursSince !== null && hoursSince < 24,
  });
}
