import { getCase } from "@/lib/content";
import CaseCard from "./CaseCard";

// 記事内に事例カードを埋め込むコンポーネント
export default function ArticleEmbed({ slug }: { slug: string }) {
  const item = getCase(slug);
  if (!item) return null;
  return (
    <div className="my-8 mx-auto max-w-sm">
      <p className="mb-2 font-fraunces italic text-xs tracking-wide">
        From the Atlas
      </p>
      <CaseCard item={item} />
    </div>
  );
}
