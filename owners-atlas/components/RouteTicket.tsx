import Link from "next/link";
import type { RouteItem } from "@/lib/types";

// 切符風のルートカード
export default function RouteTicket({ route }: { route: RouteItem }) {
  const nights = route.cases.length;
  return (
    <Link
      href={`/route/${route.slug}`}
      className="plate shift-hover block min-w-[260px] max-w-sm flex-1"
      aria-label={`ルート「${route.name}」を見る`}
    >
      <div className="flex">
        <div className="flex-1 p-5">
          <p className="font-fraunces italic text-xs tracking-wide">
            {route.nameEn}
          </p>
          <h3 className="mt-1 font-mincho text-xl font-bold">{route.name}</h3>
          <p className="mt-2 text-sm leading-relaxed">{route.concept}</p>
        </div>
        <div
          className="flex w-16 shrink-0 flex-col items-center justify-center gap-1 border-l-2 border-dashed border-ink/45 p-2 text-center"
          aria-hidden
        >
          <span className="font-data text-2xl leading-none">{nights}</span>
          <span className="text-[10px]">目的地</span>
          <span className="mt-2 font-data text-[10px]">
            {nights - 1}泊{nights}日
          </span>
        </div>
      </div>
    </Link>
  );
}
