"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { consentAnswered, initGaIfConsented, setConsent } from "@/lib/analytics";

export default function ConsentBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    initGaIfConsented();
    if (!consentAnswered()) setVisible(true);
  }, []);

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label="Cookieの利用について"
      className="fixed inset-x-0 bottom-0 z-50 border-t-[1.5px] border-ink bg-paper"
    >
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:px-6">
        <p className="flex-1 text-sm leading-relaxed">
          本サイトは大学研究の一環として、Cookieを用いた匿名の閲覧統計（Google
          Analytics）を取得します。同意いただける場合のみ計測を開始します。
          詳細は
          <Link href="/privacy" className="underline underline-offset-2">
            プライバシーポリシー
          </Link>
          へ。
        </p>
        <div className="flex shrink-0 gap-3">
          <button
            onClick={() => {
              setConsent(true);
              setVisible(false);
            }}
            className="border-[1.5px] border-ink bg-ink px-4 py-2 text-sm text-paper shift-hover"
          >
            同意して計測に協力する
          </button>
          <button
            onClick={() => {
              setConsent(false);
              setVisible(false);
            }}
            className="border-[1.5px] border-ink px-4 py-2 text-sm shift-hover"
          >
            同意しない
          </button>
        </div>
      </div>
    </div>
  );
}
