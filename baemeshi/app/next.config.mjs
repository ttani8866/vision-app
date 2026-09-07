import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// daily_report.py / refresh_ig_token.py と同じく、リポジトリルートの .env を共有する
dotenv.config({ path: path.resolve(__dirname, "..", "..", ".env") });

/** @type {import('next').NextConfig} */
const nextConfig = {
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
