import { CATEGORIES } from "@/lib/categories";
import type { CategoryKey } from "@/lib/types";

// 蝋封風の丸バッジ。カテゴリカラーで塗る。
export default function CategoryStamp({
  category,
  size = 44,
}: {
  category: CategoryKey;
  size?: number;
}) {
  const cat = CATEGORIES[category];
  return (
    <span
      className="inline-flex items-center justify-center rounded-full text-center font-mincho text-paper"
      style={{
        width: size,
        height: size,
        backgroundColor: cat.color,
        fontSize: size * 0.24,
        lineHeight: 1.15,
        boxShadow: `0 0 0 2px ${cat.color}33`,
        border: "1px solid rgba(30,42,58,0.35)",
      }}
      title={cat.label}
      aria-label={`カテゴリ: ${cat.label}`}
    >
      {cat.label.split("・")[0]}
    </span>
  );
}
