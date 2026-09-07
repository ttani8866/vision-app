import type { Metadata, Viewport } from "next";
import { M_PLUS_Rounded_1c, Zen_Maru_Gothic } from "next/font/google";
import "./globals.css";

const display = M_PLUS_Rounded_1c({
  weight: ["700", "800"],
  subsets: ["latin"],
  variable: "--font-display",
  preload: false,
});

const body = Zen_Maru_Gothic({
  weight: ["400", "500", "700"],
  subsets: ["latin"],
  variable: "--font-body",
  preload: false,
});

export const metadata: Metadata = {
  title: "ばえめし投稿",
  description: "銀座グルメ「ばえめし」Instagram投稿自動化プロトタイプ",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#191510",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className={`${display.variable} ${body.variable} min-h-screen antialiased`}>
        {children}
      </body>
    </html>
  );
}
