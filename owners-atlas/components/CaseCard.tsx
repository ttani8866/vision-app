import Link from "next/link";
import { CATEGORIES } from "@/lib/categories";
import { photoUrl } from "@/lib/photos";
import type { CaseItem } from "@/lib/types";
import CategoryStamp from "./CategoryStamp";

// 証明書風カード: イメージ写真＋二重飾り罫、右上に通し番号、蝋封バッジ、下部ミシン目
export default function CaseCard({ item }: { item: CaseItem }) {
  const cat = CATEGORIES[item.category];
  return (
    <Link
      href={`/case/${item.slug}`}
      className="certificate shift-hover block"
      aria-label={`${item.name}へ渡航する`}
    >
      <div className="certificate-inner p-5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={photoUrl(item.slug)}
          alt=""
          width={480}
          height={240}
          loading="lazy"
          className="h-auto w-full border border-ink/30 object-cover"
          style={{ aspectRatio: "2 / 1", backgroundColor: `${cat.color}22` }}
        />
        <div className="mt-3 flex items-start justify-between gap-3">
          <p className="font-data text-xs tracking-widest">
            Vol.{item.vol}
          </p>
          <CategoryStamp category={item.category} size={40} />
        </div>
        <p
          className="mt-1 font-data text-[11px] uppercase tracking-widest"
          style={{ color: cat.color }}
        >
          {cat.labelEn} / {item.country}
        </p>
        <h3 className="mt-2 font-mincho text-lg font-bold leading-snug">
          {item.name}
        </h3>
        <p className="mt-1 text-sm">{item.region}</p>
        <div className="perforation mt-4 pt-3 text-xs">
          <span className="font-data">{item.priceRange}</span>
          <span className="mx-2" aria-hidden>
            /
          </span>
          <span>{item.target}</span>
        </div>
      </div>
    </Link>
  );
}
