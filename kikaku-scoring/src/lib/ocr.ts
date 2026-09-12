import path from "node:path";

// スキャンPDF向けの文字認識（tesseract.js）。失敗時は null を返し、ページは「画像のみ」として扱う
// 初回実行時に言語データを .tess-cache にダウンロードする
type Worker = { recognize: (img: Buffer) => Promise<{ data: { text: string } }>; terminate: () => Promise<unknown> };

let workerPromise: Promise<Worker> | null = null;

async function getWorker(): Promise<Worker> {
  if (!workerPromise) {
    workerPromise = (async () => {
      const { createWorker } = await import("tesseract.js");
      const worker = await createWorker("jpn+eng", 1, {
        cachePath: path.join(process.cwd(), ".tess-cache"),
      });
      return worker as unknown as Worker;
    })();
    workerPromise.catch(() => {
      workerPromise = null;
    });
  }
  return workerPromise;
}

export async function ocrImage(jpeg: Buffer, timeoutMs = 90_000): Promise<string | null> {
  try {
    const worker = await getWorker();
    const result = await Promise.race([
      worker.recognize(jpeg),
      new Promise<never>((_, rej) => setTimeout(() => rej(new Error("OCR timeout")), timeoutMs)),
    ]);
    // 日本語OCRは文字間に空白が入るため、和文間の空白のみ除去する
    return result.data.text.replace(/(?<=[぀-ヿ㐀-䶿一-鿿])\s+(?=[぀-ヿ㐀-䶿一-鿿])/g, "").trim();
  } catch (e) {
    console.warn("[ocr] 文字認識に失敗しました:", (e as Error).message);
    return null;
  }
}
