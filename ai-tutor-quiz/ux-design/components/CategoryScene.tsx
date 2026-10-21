import type { Category } from '../types';

type Props = {
  /** undefined ならスタート画面用の3分野合成シーン */
  category?: Category;
  className?: string;
};

const INK = '#141a2e';

/**
 * カテゴリ別の幾何学図形シーン。外注イラスト不要で、丸・角丸四角・線だけで構成。
 * PC では右カラムに正方形で、スマホでは上部の横長帯で表示する（親側で高さを決める）。
 */
export function CategoryScene({ category, className = '' }: Props) {
  const label = category ? `${category}を表す図形シーン` : '3つの分野を表す幾何学図形';
  return (
    <div
      role="img"
      aria-label={label}
      className={
        'relative overflow-hidden rounded-3xl border-2 border-ink bg-[var(--scene)] shadow-[5px_5px_0_var(--color-ink)] lg:rounded-[40px] lg:shadow-[8px_8px_0_var(--color-ink)] ' +
        className
      }
    >
      <svg viewBox="0 0 520 520" preserveAspectRatio="xMidYMid slice" aria-hidden="true" className="absolute inset-0 size-full">
        {category === '心構え' && (
          <>
            <circle cx="260" cy="230" r="150" fill="#ffb224" stroke={INK} strokeWidth="4" className="motion-safe:animate-float" />
            <circle cx="260" cy="230" r="96" fill="#ffe3da" stroke={INK} strokeWidth="4" />
            <circle cx="260" cy="230" r="40" fill={INK} />
            <path d="M60 470 Q 260 380 460 470" fill="none" stroke={INK} strokeWidth="6" strokeLinecap="round" />
            <circle cx="90" cy="110" r="18" fill="#fff" stroke={INK} strokeWidth="4" />
            <circle cx="440" cy="420" r="26" fill="var(--color-brand)" stroke={INK} strokeWidth="4" />
          </>
        )}
        {category === 'スキル' && (
          <>
            <rect x="70" y="330" width="90" height="150" rx="18" fill="#fff" stroke={INK} strokeWidth="4" />
            <rect x="190" y="250" width="90" height="230" rx="18" fill="#ffb224" stroke={INK} strokeWidth="4" />
            <rect x="310" y="150" width="90" height="330" rx="18" fill="var(--color-brand)" stroke={INK} strokeWidth="4" />
            <g className="motion-safe:animate-float">
              <circle cx="430" cy="100" r="40" fill="#ff7a5c" stroke={INK} strokeWidth="4" />
              <path d="M412 100 l18 -18 l18 18 M430 82 l0 40" fill="none" stroke={INK} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
            </g>
            <path d="M60 110 Q 180 60 300 110" fill="none" stroke={INK} strokeWidth="6" strokeLinecap="round" strokeDasharray="2 16" />
          </>
        )}
        {category === 'AI知識' && (
          <>
            <g stroke="#fff" strokeWidth="4" fill="none">
              <path d="M110 120 L230 330 L370 160 L440 360" />
              <path d="M110 120 L370 160" />
            </g>
            <circle cx="110" cy="120" r="30" fill="#ffb224" stroke={INK} strokeWidth="4" />
            <circle cx="230" cy="330" r="38" fill="#ffb224" stroke={INK} strokeWidth="4" className="motion-safe:animate-float" />
            <circle cx="370" cy="160" r="46" fill="#fff" stroke={INK} strokeWidth="4" />
            <circle cx="370" cy="160" r="16" fill={INK} />
            <circle cx="440" cy="360" r="30" fill="#ff7a5c" stroke={INK} strokeWidth="4" />
          </>
        )}
        {!category && (
          <>
            <circle cx="170" cy="190" r="120" fill="#ff7a5c" stroke={INK} strokeWidth="4" className="motion-safe:animate-float" />
            <rect x="300" y="300" width="60" height="180" rx="14" fill="#22c58b" stroke={INK} strokeWidth="4" />
            <rect x="376" y="240" width="60" height="240" rx="14" fill="#22c58b" stroke={INK} strokeWidth="4" />
            <rect x="452" y="170" width="60" height="310" rx="14" fill="#22c58b" stroke={INK} strokeWidth="4" />
            <g stroke="#fff" strokeWidth="4">
              <line x1="120" y1="430" x2="230" y2="370" />
              <line x1="120" y1="430" x2="190" y2="500" />
              <line x1="230" y1="370" x2="190" y2="500" />
            </g>
            <g fill="#7c6cf6" stroke={INK} strokeWidth="4">
              <circle cx="120" cy="430" r="26" />
              <circle cx="230" cy="370" r="26" />
              <circle cx="190" cy="500" r="26" />
            </g>
            <circle cx="440" cy="110" r="22" fill="#ffb224" stroke={INK} strokeWidth="4" />
          </>
        )}
      </svg>
    </div>
  );
}
