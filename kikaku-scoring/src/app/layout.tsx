import type { Metadata } from "next";
import { JetBrains_Mono, Noto_Sans_JP } from "next/font/google";
import "./globals.css";

const noto = Noto_Sans_JP({ subsets: ["latin"], weight: ["400", "500", "700"], variable: "--font-noto", display: "swap" });
const mono = JetBrains_Mono({ subsets: ["latin"], weight: ["400", "700"], variable: "--font-jetbrains", display: "swap" });

export const metadata: Metadata = {
  title: "企画書AI採点",
  description: "企画書PDFを評価基準セットに沿ってAIが参考評価する社内ツール（段階1）",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja" className={`${noto.variable} ${mono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
