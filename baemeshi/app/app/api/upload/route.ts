import { NextResponse } from "next/server";
import { getStorage } from "@/lib/storage";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "video/mp4"];
const MAX_SIZE_BYTES = 200 * 1024 * 1024; // 200MB

export async function POST(req: Request) {
  const formData = await req.formData().catch(() => null);
  const file = formData?.get("file");

  if (!file || !(file instanceof File)) {
    return NextResponse.json({ ok: false, error: "file が必要です" }, { status: 400 });
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json(
      { ok: false, error: `対応していない形式です（${file.type}）。JPEG/PNG/MP4のみ対応` },
      { status: 400 }
    );
  }
  if (file.size > MAX_SIZE_BYTES) {
    return NextResponse.json({ ok: false, error: "ファイルサイズが大きすぎます（200MB以下）" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const storage = getStorage();
  const result = await storage.upload(buffer, { filename: file.name, mimeType: file.type });

  return NextResponse.json({ ok: true, ...result });
}
