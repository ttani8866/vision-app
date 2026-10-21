import { useEffect, useState } from 'react';
import { CATEGORIES, CATEGORY_COLOR, judge, type Category, type CategoryStats, type Judgement } from '../types';

type Props = {
  score: number;
  total: number;
  categoryStats: CategoryStats;
  onRetry: () => void;
};

const JUDGEMENT: Record<Judgement, { label: string; badge: string; icon: 'check' | 'up' | 'retry'; lead: string }> = {
  pass: {
    label: '合格',
    badge: 'bg-ok',
    icon: 'check',
    lead: 'AIチューターとして必要な基礎を十分に理解しています。この調子で、受講者に伝える練習に進みましょう。',
  },
  near: {
    label: '及第点 ・ あと一歩',
    badge: 'bg-accent',
    icon: 'up',
    lead: '合格ラインの8問まであと1問。基礎はしっかり身についています。苦手分野をひとつ復習すれば、次回は十分に届きます。',
  },
  fail: {
    label: '不合格',
    badge: 'bg-white',
    icon: 'retry',
    lead: '今回は合格ラインに届きませんでしたが、解説を読んだ分だけ確実に前進しています。分野別の結果を手がかりに、もう一度挑戦しましょう。',
  },
};

/** 0 → target を duration ms でカウントアップ。reduced-motion なら即時 */
function useCountUp(target: number, duration = 800): number {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setValue(target);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(Math.round(target * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return value;
}

/** 一番落とした分野を指して、次の一歩を具体的に示す */
function nextStep(stats: CategoryStats, judgement: Judgement): string {
  const weakest = CATEGORIES.map((c) => ({ c, ...stats[c] }))
    .filter((s) => s.total > 0)
    .sort((a, b) => a.correct / a.total - b.correct / b.total)[0];
  const perfect = CATEGORIES.filter((c) => stats[c]?.total > 0 && stats[c].correct === stats[c].total);

  if (!weakest || weakest.correct === weakest.total) {
    return '全分野で満点です。次は学んだ内容を受講者にわかる言葉で説明する練習に進んでください。';
  }
  const missed = weakest.total - weakest.correct;
  const head = `「${weakest.c}」で${missed}問を落としています。この分野の解説を読み返すところから始めてください。`;
  const tail =
    perfect.length > 0
      ? `${perfect.join('・')}は満点。強みとして自信を持ってください。`
      : judgement === 'fail'
        ? '1分野ずつ固めれば、必ず合格ラインに届きます。'
        : '';
  return `${head}${tail}`;
}

function JudgeIcon({ kind }: { kind: 'check' | 'up' | 'retry' }) {
  const common = { width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 3, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true };
  if (kind === 'check') return <svg {...common}><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>;
  if (kind === 'up') return <svg {...common}><path d="M12 19V5" /><path d="M6 11l6-6 6 6" /></svg>;
  return <svg {...common}><path d="M3 12a9 9 0 1 0 3-6.7" /><path d="M3 4v5h5" /></svg>;
}

/** data-theme="result" の下で使う（濃色地） */
export function ResultScreen({ score, total, categoryStats, onRetry }: Props) {
  const judgement = judge(score);
  const j = JUDGEMENT[judgement];
  const rate = total > 0 ? Math.round((score / total) * 100) : 0;
  const shown = useCountUp(score);
  const done = shown === score;

  return (
    <main className="relative mx-auto grid w-full max-w-[1200px] flex-1 grid-cols-1 items-start gap-6 px-4 pb-10 pt-2 text-white lg:grid-cols-2 lg:gap-12 lg:px-8 lg:pb-16 lg:pt-4">
      <div className="flex flex-col gap-5 lg:gap-[26px]">
        <div className="flex flex-col gap-2 lg:gap-2.5">
          <div className="text-xs font-black tracking-[.12em] text-on-ink-link lg:text-sm">RESULT</div>
          <h1 className="text-[32px] font-black leading-[1.1] tracking-tight lg:text-[52px]">おつかれさまでした</h1>
        </div>

        <div className="flex items-end gap-3 lg:gap-4">
          <div aria-label={`スコア ${score}点`} className="text-[128px] font-black leading-[.85] tracking-[-.06em] tabular-nums lg:text-[168px]">
            {shown}
          </div>
          <div className="pb-2.5 text-xl font-bold text-on-ink-link lg:pb-3.5 lg:text-[28px]">/ {total}問</div>
        </div>

        <span className="inline-flex h-10 items-center self-start rounded-full bg-brand px-4 text-[15px] font-black lg:h-11 lg:px-[18px] lg:text-base">
          正答率 {rate}%
        </span>

        <span
          className={
            `inline-flex h-14 items-center gap-2.5 self-start rounded-full border-2 border-ink pl-2.5 pr-5 text-[21px] font-black text-ink shadow-[4px_4px_0_#fff] lg:h-16 lg:gap-3 lg:pl-3 lg:pr-6 lg:text-2xl lg:shadow-[5px_5px_0_#fff] ${j.badge} ` +
            (done ? 'motion-safe:animate-pop' : 'opacity-0')
          }
        >
          <span className="flex size-9 items-center justify-center rounded-full bg-ink text-white lg:size-10">
            <JudgeIcon kind={j.icon} />
          </span>
          {j.label}
        </span>

        <p className="text-[15px] leading-[1.85] text-on-ink lg:text-[17px]">{j.lead}</p>

        <div>
          <button
            type="button"
            onClick={onRetry}
            className="sticker sticker-lift inline-flex h-[60px] w-full items-center justify-center gap-3 rounded-full bg-brand px-9 text-[17px] font-black text-white shadow-[5px_5px_0_var(--color-ink)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white lg:h-16 lg:w-auto lg:text-lg"
          >
            <JudgeIcon kind="retry" />
            もう一度挑戦する
          </button>
        </div>
      </div>

      <section
        aria-labelledby="cat-title"
        className="flex flex-col gap-5 rounded-3xl border-2 border-ink bg-white p-4 text-ink shadow-[5px_5px_0_var(--color-brand)] lg:gap-6 lg:rounded-[32px] lg:p-8 lg:shadow-[8px_8px_0_var(--color-brand)]"
      >
        <h2 id="cat-title" className="text-base font-black lg:text-lg">カテゴリ別の正解数</h2>
        <ul className="flex flex-col gap-4 lg:gap-[18px]">
          {CATEGORIES.map((c: Category, i) => {
            const s = categoryStats[c] ?? { correct: 0, total: 0 };
            const pct = s.total > 0 ? Math.round((s.correct / s.total) * 100) : 0;
            const color = CATEGORY_COLOR[c];
            return (
              <li key={c} className="grid grid-cols-[72px_1fr_64px] items-center gap-2.5 lg:grid-cols-[96px_1fr_84px] lg:gap-3.5">
                <span className="flex items-center gap-1.5 text-sm font-black lg:gap-2 lg:text-[15px]">
                  <span aria-hidden="true" className={`size-2.5 rounded-[3px] border-2 border-ink lg:size-3 ${color.token}`} />
                  {c}
                </span>
                <div role="img" aria-label={`${c} ${s.total}問中${s.correct}問正解`} className="h-5 overflow-hidden rounded-full border-2 border-ink bg-track lg:h-[22px]">
                  <div
                    className={`h-full rounded-full motion-safe:animate-grow ${pct < 100 ? 'border-r-2 border-ink' : ''}`}
                    style={{ width: `${pct}%`, backgroundColor: color.hex, animationDelay: `${300 + i * 100}ms` }}
                  />
                </div>
                <span className="text-right text-[17px] font-black lg:text-lg">
                  {s.correct} <small className="text-xs font-bold text-ink-muted lg:text-[13px]">/ {s.total}</small>
                </span>
              </li>
            );
          })}
        </ul>

        <div className="flex flex-col gap-1.5 rounded-2xl border-2 border-ink bg-brand-tint p-4 lg:rounded-[20px] lg:px-[22px] lg:py-5">
          <div className="text-xs font-black tracking-[.08em] text-brand lg:text-[13px]">NEXT STEP</div>
          <p className="text-sm leading-[1.85] text-ink-soft lg:text-[15px]">{nextStep(categoryStats, judgement)}</p>
        </div>

        <p className="text-[13px] font-bold leading-[1.7] text-ink-muted">
          出題は毎回入れ替わります。解説を読み返してから再挑戦すると定着しやすくなります。
        </p>
      </section>
    </main>
  );
}
