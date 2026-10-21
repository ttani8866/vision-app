import { useEffect, useRef } from 'react';
import { CHOICE_LABELS } from '../types';

type Props = {
  isCorrect: boolean;
  correctIndex: number;
  explanation: string;
  /** 現在までの正解数 */
  score: number;
  /** 現在までの回答数（この問題を含む） */
  answered: number;
  /** 最終問のとき true。ボタン文言を「結果を見る」にする */
  isLast: boolean;
  onNext: () => void;
};

/**
 * 判定と解説の濃色パネル。QuestionCard の直下に置く。
 * マウント時に 16px 浮上（animate-rise）し、スマホで画面外に残らないよう scrollIntoView。
 * 影の色はカテゴリ色（--cat）を使い、画面全体の色と呼応させる。
 */
export function FeedbackPanel({ isCorrect, correctIndex, explanation, score, answered, isLast, onNext }: Props) {
  const ref = useRef<HTMLElement>(null);
  const correctLabel = CHOICE_LABELS[correctIndex] ?? String(correctIndex + 1);

  useEffect(() => {
    ref.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, []);

  return (
    <section
      ref={ref}
      aria-live="polite"
      aria-label="判定と解説"
      className="flex flex-col gap-[18px] rounded-3xl border-2 border-ink bg-ink p-5 text-white shadow-[5px_5px_0_var(--cat)] motion-safe:animate-rise lg:gap-[22px] lg:rounded-[32px] lg:px-9 lg:py-8 lg:shadow-[6px_6px_0_var(--cat)]"
    >
      <div className="flex flex-wrap items-center gap-4">
        <div>
          <div className="text-3xl font-black leading-[1.1] tracking-tight lg:text-[40px]">
            {isCorrect ? '正解！' : '惜しい！'}
          </div>
          <div className="mt-1 text-sm font-bold text-on-ink-muted lg:text-base">
            {isCorrect ? 'その調子です' : '考え方を押さえれば次は取れます'}
          </div>
        </div>
        <span className="inline-flex h-10 items-center gap-2.5 rounded-full bg-white pl-1.5 pr-3.5 text-sm font-black text-ink lg:ml-auto lg:h-11 lg:pr-4 lg:text-[15px]">
          <b className="flex size-7 items-center justify-center rounded-[9px] bg-ok text-white lg:size-8 lg:rounded-[10px]">{correctLabel}</b>
          が正解
        </span>
      </div>

      <div className="flex flex-col gap-2">
        <div className="text-[11px] font-black tracking-[.1em] text-on-ink-faint lg:text-xs">解説</div>
        <p className="text-[15px] leading-[1.9] text-on-ink lg:text-base">{explanation}</p>
      </div>

      <div className="flex flex-col gap-3.5 border-t border-[#2c3556] pt-[18px] lg:flex-row lg:items-center lg:justify-between lg:gap-4 lg:pt-[22px]">
        <div className="flex items-baseline gap-2 text-[13px] font-bold text-on-ink-muted lg:flex-col lg:items-start lg:gap-0.5">
          <span>現在のスコア</span>
          <span>
            <b className="text-[26px] font-black text-white lg:text-[28px]">{score}</b>
            <span className="ml-1">/ {answered}問 正解</span>
          </span>
        </div>
        <button
          type="button"
          onClick={onNext}
          className="inline-flex h-[58px] w-full items-center justify-center gap-3 rounded-full border-2 border-white bg-white px-8 text-base font-black text-ink shadow-[4px_4px_0_var(--cat)] transition-[transform,box-shadow] duration-150 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[6px_6px_0_var(--cat)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white lg:h-[60px] lg:w-auto lg:text-[17px]"
        >
          {isLast ? '結果を見る' : '次の問題へ'}
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M5 12h14" />
            <path d="M13 6l6 6-6 6" />
          </svg>
        </button>
      </div>
    </section>
  );
}
