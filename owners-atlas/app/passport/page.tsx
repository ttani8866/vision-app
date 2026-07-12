import type { Metadata } from "next";
import PassportBook from "@/components/PassportBook";
import { allCases, allRoutes, allTitles } from "@/lib/content";

export const metadata: Metadata = {
  title: "アトラス・パスポート",
  description:
    "渡航印を集めて世界一周。あなたの旅の記録（押印・総移動距離・称号）はこのブラウザに保存されます。",
};

export default function PassportPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6">
      <header className="pt-10 text-center sm:pt-14">
        <p className="font-fraunces italic text-sm tracking-wide">Atlas Passport</p>
        <h1 className="mt-2 font-mincho text-4xl font-bold sm:text-5xl">
          アトラス・パスポート
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed">
          目的地で押した渡航印が、ここに一冊の帳面として綴じられていきます。
        </p>
      </header>
      <div className="mt-10 pb-4">
        <PassportBook cases={allCases} routes={allRoutes} titles={allTitles} />
      </div>
    </div>
  );
}
