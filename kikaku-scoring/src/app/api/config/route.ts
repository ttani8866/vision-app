import { NextResponse } from "next/server";
import { getAiConfig } from "@/lib/ai";
import { MAX_FILE_BYTES, MAX_PAGES } from "@/lib/pdf";
import { getUsageSummary } from "@/lib/usage";
import type { ServerConfig } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const { provider, modelId, imageDetail } = getAiConfig();
  const body: ServerConfig = {
    provider,
    modelId,
    imageDetail,
    ocrEnabled: (process.env.OCR_ENABLED ?? "true").toLowerCase() !== "false",
    usage: getUsageSummary(),
    limits: { maxFileBytes: MAX_FILE_BYTES, maxPages: MAX_PAGES },
  };
  return NextResponse.json(body);
}
