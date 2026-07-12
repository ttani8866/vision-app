import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "About — 本サイトについて",
  description:
    "Owner's Atlasは、大学研究（地域物語資産のIP化研究）の一環として運営される、世界のオーナー制度を旅するメディアです。",
};

export default function AboutPage() {
  return (
    <div className="mx-auto px-4 sm:px-6" style={{ maxWidth: 720 }}>
      <header className="pt-10 sm:pt-14">
        <p className="font-fraunces italic text-sm tracking-wide">About</p>
        <h1 className="mt-2 font-mincho text-3xl font-bold sm:text-4xl">
          本サイトについて
        </h1>
      </header>

      <section className="mt-10" aria-label="サイトの目的">
        <h2 className="border-b-[1.5px] border-ink pb-2 font-mincho text-xl font-bold">
          Owner&rsquo;s Atlasとは
        </h2>
        <p className="mt-4 leading-loose">
          Owner&rsquo;s
          Atlasは、世界と日本の「オーナーシップ型地域コンテンツ」——ウイスキー樽のオーナー、ナショナルトラスト、称号制度、棚田オーナー、月の土地など——を「旅の目的地」として紹介するバーチャル世界旅行メディアです。訪問者は購入者である必要はなく、世界中のオーナー制度を見て巡って楽しむ旅人です。
        </p>
      </section>

      <section className="mt-10" aria-label="研究について">
        <h2 className="border-b-[1.5px] border-ink pb-2 font-mincho text-xl font-bold">
          研究サイトとしての位置づけ
        </h2>
        <p className="mt-4 leading-loose">
          本サイトは大学研究（地域物語資産のIP化研究）の一環として運営されています。掲載コンテンツの表現がどのように読者の関心や行動に影響するかを検証するため、リード文の表示テスト（A/Bテスト）と、匿名化された閲覧統計の取得を行っています。個人を特定する情報は収集しません。詳細は
          <Link href="/privacy" className="underline underline-offset-2">
            プライバシーポリシー
          </Link>
          をご覧ください。
        </p>
      </section>

      <section className="mt-10" aria-label="掲載基準">
        <h2 className="border-b-[1.5px] border-ink pb-2 font-mincho text-xl font-bold">
          掲載基準とデータの取扱い
        </h2>
        <ul className="mt-4 list-disc space-y-2 pl-5 leading-relaxed">
          <li>
            掲載内容は各制度の公式サイト・自治体サイト等の公開情報に基づく紹介です。申し込みの仲介・販売は行いません。
          </li>
          <li>
            制度の法的性質（法的所有権あり・利用権・寄付・象徴的権利）を必ず明示し、権利の誤認を防ぐ表記に努めます。
          </li>
          <li>
            価格・募集状況は変動します。最新情報は必ず各制度の公式サイトでご確認ください。
          </li>
          <li>
            確認できない情報は推測で補わず、「公式サイト参照」等と表記します。
          </li>
        </ul>
      </section>

      <section className="mt-10 pb-4" aria-label="事業者向け窓口">
        <h2 className="border-b-[1.5px] border-ink pb-2 font-mincho text-xl font-bold">
          事業者・運営主体の皆さまへ
        </h2>
        <p className="mt-4 leading-loose">
          掲載内容の修正・削除のご依頼、新規掲載のご相談は、下記までご連絡ください。確認のうえ速やかに対応します。
        </p>
        <p className="plate mt-4 inline-block px-5 py-3 font-data text-sm">
          contact@owners-atlas.example.com
        </p>
        <p className="mt-2 text-xs text-ink/60">
          （公開時に実際の窓口アドレスへ差し替えてください）
        </p>
      </section>
    </div>
  );
}
