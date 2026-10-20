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

function CheckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </svg>
  );
}

function InfoIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 8v5" />
      <path d="M12 17h.01" />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12h14" />
      <path d="M13 6l6 6-6 6" />
    </svg>
  );
}

export function FeedbackPanel({ isCorrect, correctIndex, explanation, score, answered, isLast, onNext }: Props) {
  const ref = useRef<HTMLElement>(null);
  const correctLabel = CHOICE_LABELS[correctIndex] ?? String(correctIndex + 1);

  // スマホで解説が画面外に残らないよう、表示時にパネル先頭まで寄せる
  useEffect(() => {
    ref.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, []);

  return (
    <section
      ref={ref}
      aria-live="polite"
      aria-label="判定と解説"
      className="flex flex-col overflow-hidden rounded-xl border border-line bg-white sm:rounded-2xl"
    >
      <div
        className={
          'flex flex-wrap items-center gap-3 px-4 py-3.5 text-base font-bold sm:flex-nowrap sm:px-7 sm:py-4 sm:text-[17px] ' +
          (isCorrect ? 'bg-ok-tint text-ok-ink' : 'bg-warn-tint text-warn-ink')
        }
      >
        <span
          className={
            'flex h-7 w-7 shrink-0 items-center justify-center rounded-full ' +
            (isCorrect ? 'bg-ok-soft text-ok-ink' : 'bg-warn-icon text-warn-ink')
          }
        >
          {isCorrect ? <CheckIcon /> : <InfoIcon />}
        </span>
        <span>{isCorrect ? `正解です。${correctLabel} が正解` : `惜しい。正解は ${correctLabel} でした`}</span>
        <small className="w-full pl-10 text-sm font-medium text-body sm:ml-auto sm:w-auto sm:pl-0">
          {isCorrect ? 'その調子です' : '考え方を確認して次に進みましょう'}
        </small>
      </div>

      <div className="flex flex-col gap-4 px-4 pb-5 pt-4 sm:gap-[18px] sm:px-7 sm:pb-7 sm:pt-[22px]">
        <div className="flex flex-col gap-2">
          <div className="text-xs font-bold tracking-wider text-muted">解説</div>
          <p className="text-[15px] leading-[1.85] text-body">{explanation}</p>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-tint pt-4 sm:pt-[18px]">
          <div className="flex flex-col gap-0.5 text-sm text-body">
            <span>現在のスコア</span>
            <span className="text-[22px] font-bold leading-tight text-heading">
              {score}{' '}
              <span className="text-sm font-medium text-muted">/ {answered}問 正解</span>
            </span>
          </div>
          <button
            type="button"
            onClick={onNext}
            className="inline-flex min-h-[52px] w-full items-center justify-center gap-2 rounded-[10px] bg-primary px-7 text-base font-bold text-white transition-colors hover:bg-primary-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:w-auto sm:min-w-[220px]"
          >
            {isLast ? '結果を見る' : '次の問題へ'}
            <ArrowIcon />
          </button>
        </div>
      </div>
    </section>
  );
}
