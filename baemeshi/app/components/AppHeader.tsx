import Link from "next/link";

/** ばえめし公式ロゴ（public/baemeshi-logo.png） */
function BowlMark() {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src="/baemeshi-logo.png" alt="ばえめしロゴ" className="h-10 w-10 rounded-full object-cover" />
  );
}

export interface HeaderLink {
  href: string;
  label: string;
}

export default function AppHeader({
  rightHref,
  rightLabel,
  links,
}: {
  rightHref?: string;
  rightLabel?: string;
  /** 複数導線を出す場合。指定時は rightHref/rightLabel より優先 */
  links?: HeaderLink[];
}) {
  const items: HeaderLink[] = links ?? (rightHref && rightLabel ? [{ href: rightHref, label: rightLabel }] : []);
  return (
    <header className="sticky top-0 z-40 border-b border-[var(--hairline)] bg-[var(--paper)]/95 backdrop-blur">
      <div className="mx-auto flex max-w-md items-center justify-between px-4 py-2.5">
        <Link href="/" className="flex items-center gap-2">
          <BowlMark />
          <span>
            <span className="font-display block text-lg font-extrabold leading-tight tracking-wide">
              ばえめし投稿
            </span>
            <span className="block text-[10px] font-medium leading-tight text-[var(--ink-soft)]">
              ばえる写真のグルメサイト・投稿デスク
            </span>
          </span>
        </Link>
        <nav className="flex gap-1.5">
          {items.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="rounded-full border-2 border-[var(--hairline)] bg-[var(--paper)] px-3 py-1.5 text-xs font-bold text-[var(--ink)]"
            >
              {l.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
