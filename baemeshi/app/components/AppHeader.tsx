import Link from "next/link";

/** baemeshi.com のロゴモチーフ（赤い茶碗＋キラキラ）を簡易SVGで再現 */
function BowlMark() {
  return (
    <svg viewBox="0 0 44 44" className="h-9 w-9" aria-hidden>
      <g fill="#ffb800">
        <path d="M22 2l1.3 3.7L27 7l-3.7 1.3L22 12l-1.3-3.7L17 7l3.7-1.3z" />
        <path d="M10 8l.8 2.2L13 11l-2.2.8L10 14l-.8-2.2L7 11l2.2-.8z" />
        <path d="M34 8l.8 2.2L37 11l-2.2.8L34 14l-.8-2.2L31 11l2.2-.8z" />
      </g>
      <path
        d="M8 20h28a1.5 1.5 0 011.5 1.7C36.6 29 30.9 34 22 34S7.4 29 6.5 21.7A1.5 1.5 0 018 20z"
        fill="#d7263d"
      />
      <rect x="17" y="34" width="10" height="4" rx="1.5" fill="#d7263d" />
    </svg>
  );
}

export default function AppHeader({
  rightHref,
  rightLabel,
}: {
  rightHref: string;
  rightLabel: string;
}) {
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
        <Link
          href={rightHref}
          className="rounded-full border-2 border-[var(--hairline)] bg-[var(--paper)] px-3 py-1.5 text-xs font-bold text-[var(--ink)]"
        >
          {rightLabel}
        </Link>
      </div>
    </header>
  );
}
