import { createHash } from "node:crypto";
import path from "node:path";
import { createCanvas } from "@napi-rs/canvas";
import type { ParsedDocument, ParsedPage, PageTextStatus } from "./types";
import { ocrImage } from "./ocr";

export const MAX_FILE_BYTES = 20 * 1024 * 1024; // §6-1
export const MAX_PAGES = 50; // §6-1
const RENDER_WIDTH = 1200; // ページ画像の横幅（px）
const JPEG_QUALITY = 78;
const MIN_TEXT_CHARS = 20; // これ未満は文字レイヤーなし（スキャン等）とみなし OCR を試みる

export class PdfInputError extends Error {
  constructor(
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

const PDFJS_DIR = path.join(process.cwd(), "node_modules", "pdfjs-dist");

async function loadPdfjs() {
  // Node 向け legacy ビルド。serverExternalPackages でバンドル対象外にしている
  return await import("pdfjs-dist/legacy/build/pdf.mjs");
}

export function pageIdOf(n: number): string {
  return `p${String(n).padStart(2, "0")}`;
}

export function sha256Hex(buf: Buffer): string {
  return createHash("sha256").update(buf).digest("hex");
}

// 上限は解析前に検出して拒否する（黙って途中で切り捨てない §6-1）
export function checkFileLimits(fileName: string, size: number) {
  if (!fileName.toLowerCase().endsWith(".pdf")) {
    throw new PdfInputError("UNSUPPORTED_FORMAT", "段階1で対応する形式は PDF のみです（Word・PowerPoint は段階3で対応）");
  }
  if (size > MAX_FILE_BYTES) {
    throw new PdfInputError("FILE_TOO_LARGE", `ファイルサイズ ${(size / 1024 / 1024).toFixed(1)}MB が上限 20MB を超えています`);
  }
  if (size === 0) {
    throw new PdfInputError("FILE_EMPTY", "ファイルが空です");
  }
}

export async function parsePdf(fileName: string, buf: Buffer): Promise<ParsedDocument> {
  checkFileLimits(fileName, buf.length);
  const pdfjs = await loadPdfjs();

  const task = pdfjs.getDocument({
    data: new Uint8Array(buf),
    useSystemFonts: true,
    isEvalSupported: false,
    standardFontDataUrl: path.join(PDFJS_DIR, "standard_fonts") + path.sep,
    cMapUrl: path.join(PDFJS_DIR, "cmaps") + path.sep,
    cMapPacked: true,
    verbosity: 0,
  });

  let doc;
  try {
    doc = await task.promise;
  } catch (e) {
    const name = (e as { name?: string })?.name ?? "";
    if (name === "PasswordException") {
      throw new PdfInputError("PASSWORD_PROTECTED", "パスワード付きPDFは読み込めません。パスワードを解除したファイルを再アップロードしてください");
    }
    if (name === "InvalidPDFException") {
      throw new PdfInputError("INVALID_PDF", "PDFとして読み込めないファイルです");
    }
    throw new PdfInputError("PDF_LOAD_FAILED", `PDFの読み込みに失敗しました：${(e as Error).message}`);
  }

  try {
    if (doc.numPages > MAX_PAGES) {
      throw new PdfInputError("TOO_MANY_PAGES", `ページ数 ${doc.numPages} が上限 ${MAX_PAGES} ページを超えています`);
    }

    const ocrEnabled = (process.env.OCR_ENABLED ?? "true").toLowerCase() !== "false";
    const pages: ParsedPage[] = [];

    for (let n = 1; n <= doc.numPages; n++) {
      const page = await doc.getPage(n);

      // 文字レイヤーの抽出
      const tc = await page.getTextContent();
      let text = tc.items
        .map((it) => ("str" in it ? it.str + (it.hasEOL ? "\n" : "") : ""))
        .join("")
        .replace(/[ \t]+\n/g, "\n")
        .trim();

      // ページ画像の描画
      const base = page.getViewport({ scale: 1 });
      const scale = RENDER_WIDTH / base.width;
      const viewport = page.getViewport({ scale });
      const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      // @napi-rs/canvas のコンテキストは pdfjs の NodeCanvasFactory と互換
      await page.render({ canvasContext: ctx as unknown as CanvasRenderingContext2D, viewport }).promise;
      const jpeg = canvas.toBuffer("image/jpeg", JPEG_QUALITY);

      // 文字レイヤーが乏しいページは OCR を試みる。OCR で補えなければ、文字レイヤーがあれば text、なければ image_only
      let textStatus: PageTextStatus = text.replace(/\s/g, "").length > 0 ? "text" : "image_only";
      if (text.replace(/\s/g, "").length < MIN_TEXT_CHARS && ocrEnabled) {
        const ocr = await ocrImage(jpeg);
        if (ocr && ocr.replace(/\s/g, "").length >= MIN_TEXT_CHARS) {
          text = text.length > 0 ? `${text}\n${ocr}` : ocr;
          textStatus = "ocr";
        }
      }

      pages.push({
        pageId: pageIdOf(n),
        pageNumber: n,
        text,
        textStatus,
        image: `data:image/jpeg;base64,${jpeg.toString("base64")}`,
        width: canvas.width,
        height: canvas.height,
      });
      page.cleanup();
    }

    return {
      fileName,
      fileSize: buf.length,
      fileHash: sha256Hex(buf),
      pageCount: doc.numPages,
      pages,
    };
  } finally {
    await doc.destroy();
  }
}
