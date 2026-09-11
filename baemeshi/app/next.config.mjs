import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// daily_report.py / refresh_ig_token.py と同じく、リポジトリルートの .env を共有する
dotenv.config({ path: path.resolve(__dirname, "..", "..", ".env") });

/** @type {import('next').NextConfig} */
const nextConfig = {
  // 複数のdevサーバー（別ポート）を同時に動かすとき、ビルド出力先の衝突を避けるための切替
  // 例: BAEMESHI_DIST_DIR=.next-loop（未設定なら通常の .next。Vercelは未設定のまま）
  distDir: process.env.BAEMESHI_DIST_DIR || ".next",
  images: {
    remotePatterns: [
      { protocol: "http", hostname: "localhost" },
      { protocol: "https", hostname: "**" },
    ],
  },
  experimental: {
    // better-sqlite3はネイティブモジュールのためバンドルせず外部参照にする（ローカル専用。Vercelでは未使用）
    serverComponentsExternalPackages: ["better-sqlite3"],
  },
};

export default nextConfig;
