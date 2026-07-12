import type { Metadata } from "next";
import Link from "next/link";
import {
  Shippori_Mincho,
  Zen_Kaku_Gothic_New,
  Fraunces,
  Space_Grotesk,
} from "next/font/google";
import "./globals.css";
import ConsentBanner from "@/components/ConsentBanner";

const shippori = Shippori_Mincho({
  weight: ["500", "700"],
  subsets: ["latin"],
  variable: "--font-shippori",
  display: "swap",
});

const zenKaku = Zen_Kaku_Gothic_New({
  weight: ["400", "500", "700"],
  subsets: ["latin"],
  variable: "--font-zen-kaku",
  display: "swap",
});

const fraunces = Fraunces({
  subsets: ["latin"],
  style: ["italic", "normal"],
  variable: "--font-fraunces",
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  display: "swap",
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://owners-atlas.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Owner's Atlas — オーナー体験世界旅行。",
    template: "%s | Owner's Atlas",
  },
  description:
    "ウイスキーの樽、知床の森、月の土地。世界の「オーナーになれる場所」を旅するメディア。",
  openGraph: {
    siteName: "Owner's Atlas",
    locale: "ja_JP",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body
        className={`${shippori.variable} ${zenKaku.variable} ${fraunces.variable} ${spaceGrotesk.variable} font-body min-h-screen`}
      >
        <header className="border-b-[1.5px] border-ink">
          <div className="mx-auto flex max-w-6xl items-baseline justify-between gap-4 px-4 py-4 sm:px-6">
            <Link href="/" className="group flex items-baseline gap-3">
              <span className="font-fraunces italic text-2xl sm:text-3xl tracking-tight">
                Owner&rsquo;s Atlas
              </span>
              <span className="hidden font-mincho text-xs sm:inline">
                オーナー体験世界旅行。
              </span>
            </Link>
            <nav aria-label="グローバルナビゲーション">
              <ul className="flex items-center gap-4 text-sm sm:gap-6">
                <li>
                  <Link
                    href="/passport"
                    className="border-[1.5px] border-ink px-3 py-1.5 font-mincho shift-hover inline-block"
                  >
                    パスポート
                  </Link>
                </li>
                <li>
                  <Link href="/about" className="underline-offset-4 hover:underline decoration-accent decoration-2">
                    About
                  </Link>
                </li>
              </ul>
            </nav>
          </div>
        </header>
        <main>{children}</main>
        <footer className="mt-20 border-t-[1.5px] border-ink">
          <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
            <p className="font-fraunces italic text-xl">Owner&rsquo;s Atlas</p>
            <p className="mt-2 text-sm">
              世界の「オーナーになれる場所」を旅するメディア。
            </p>
            <ul className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm">
              <li>
                <Link href="/about" className="underline underline-offset-4">
                  About（研究サイトについて）
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="underline underline-offset-4">
                  プライバシーポリシー
                </Link>
              </li>
              <li>
                <Link href="/passport" className="underline underline-offset-4">
                  アトラス・パスポート
                </Link>
              </li>
            </ul>
            <p className="mt-8 border-t border-ink/30 pt-4 text-xs leading-relaxed">
              本サイトは大学研究の一環として運営され、閲覧行動を匿名で統計処理しています。
              詳しくは
              <Link href="/privacy" className="underline underline-offset-2">
                プライバシーポリシー
              </Link>
              をご覧ください。
            </p>
          </div>
        </footer>
        <ConsentBanner />
      </body>
    </html>
  );
}
