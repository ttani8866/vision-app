import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // PDF 解析・画像描画・OCR は Node ネイティブ／WASM を使うためバンドル対象から外す
  serverExternalPackages: ["pdfjs-dist", "@napi-rs/canvas", "tesseract.js"],
};

export default nextConfig;
