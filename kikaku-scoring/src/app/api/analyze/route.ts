import { NextResponse } from "next/server";
import { checkFileLimits, parsePdf, PdfInputError } from "@/lib/pdf";
import type { AnalyzeResponse } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

// PDF を受け取り、ページIDを付与して抽出テキストとページ画像を返す（§6-1）
// 一時ファイルは作らずメモリ上で処理し、応答後は保持しない（§9-1）
export async function POST(req: Request) {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json<AnalyzeResponse>({ ok: false, code: "BAD_REQUEST", error: "ファイルを受け取れませんでした" }, { status: 400 });
  }
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json<AnalyzeResponse>({ ok: false, code: "NO_FILE", error: "ファイルが指定されていません" }, { status: 400 });
  }

  try {
    checkFileLimits(file.name, file.size);
    const buf = Buffer.from(await file.arrayBuffer());
    const document = await parsePdf(file.name, buf);
    return NextResponse.json<AnalyzeResponse>({ ok: true, document });
  } catch (e) {
    if (e instanceof PdfInputError) {
      return NextResponse.json<AnalyzeResponse>({ ok: false, code: e.code, error: e.message }, { status: 400 });
    }
    console.error("[analyze] failed:", e);
    return NextResponse.json<AnalyzeResponse>(
      { ok: false, code: "ANALYZE_FAILED", error: `資料の読み取りに失敗しました：${(e as Error).message}` },
      { status: 500 },
    );
  }
}
