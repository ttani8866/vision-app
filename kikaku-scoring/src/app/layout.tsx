import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "企画書AI採点エンジン（段階1）",
  description: "企画書PDFを評価基準セットに沿ってAIが参考評価する社内ツール",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
