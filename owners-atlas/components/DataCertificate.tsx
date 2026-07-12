import { CATEGORIES, LEGAL_NATURE, SCORE_AXES } from "@/lib/categories";
import type { CaseItem } from "@/lib/types";

// 「オーナー制度の証明書」: 12フィールドの証明書風データテーブル
export default function DataCertificate({ item }: { item: CaseItem }) {
  const cat = CATEGORIES[item.category];
  const legal = LEGAL_NATURE[item.legalNature];

  const rows: { label: string; value: React.ReactNode }[] = [
    { label: "制度名", value: item.name },
    { label: "運営主体", value: item.operator },
    { label: "国・地域", value: `${item.country} / ${item.region}` },
    {
      label: "カテゴリ",
      value: (
        <span className="inline-flex items-center gap-2">
          <span
            className="inline-block h-3 w-3 rounded-full"
            style={{ backgroundColor: cat.color }}
            aria-hidden
          />
          {cat.label}
        </span>
      ),
    },
    { label: "所有対象", value: item.target },
    {
      label: "法的性質",
      value: (
        <span>
          <span
            className="inline-block border-[1.5px] border-ink px-2 py-0.5 text-xs font-bold"
            style={{ backgroundColor: item.legalNature === "ownership" ? "#F5D547" : "transparent" }}
          >
            {legal.label}
          </span>
          <span className="mt-1 block text-xs">{legal.note}</span>
        </span>
      ),
    },
    { label: "価格帯", value: <span className="font-data">{item.priceRange}</span> },
    { label: "契約期間", value: item.term },
    {
      label: "4層スコア",
      value: (
        <span className="font-data text-sm">
          {SCORE_AXES.map((a) => `${a.label} ${item.scores[a.key]}`).join(" / ")}
        </span>
      ),
    },
    { label: "体験特典", value: item.perks.join("、") },
    {
      label: "公式URL",
      value: (
        <a
          href={item.officialUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="break-all underline underline-offset-2"
        >
          {item.officialUrl}
        </a>
      ),
    },
    { label: "更新日", value: <span className="font-data">{item.updatedAt}</span> },
  ];

  return (
    <section aria-label="オーナー制度の証明書" className="certificate">
      <div className="certificate-inner p-5 sm:p-7">
        <div className="flex items-baseline justify-between gap-4 border-b-[1.5px] border-ink pb-3">
          <h2 className="font-mincho text-xl font-bold">オーナー制度の証明書</h2>
          <p className="font-fraunces italic text-xs">Certificate of Ownership Program</p>
        </div>
        <div className="overflow-x-auto">
          <table className="mt-4 w-full border-collapse text-sm">
            <tbody>
              {rows.map((row) => (
                <tr key={row.label} className="border-b border-ink/25 align-top">
                  <th
                    scope="row"
                    className="w-28 shrink-0 py-2.5 pr-3 text-left font-mincho font-bold sm:w-36"
                  >
                    {row.label}
                  </th>
                  <td className="py-2.5">{row.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="perforation mt-4 pt-3 text-right font-data text-xs tracking-widest">
          No. OA-{item.vol}
        </p>
      </div>
    </section>
  );
}
