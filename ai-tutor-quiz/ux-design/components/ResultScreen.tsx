import { CATEGORIES, judge, type Category, type CategoryStats, type Judgement } from '../types';

type Props = {
  score: number;
  total: number;
  categoryStats: CategoryStats;
  onRetry: () => void;
};

const JUDGEMENT: Record<
  Judgement,
  { label: string; box: string; badge: string; lead: string }
> = {
  pass: {
    label: '合格',
    box: 'bg-ok-tint border-ok-soft',
    badge: 'bg-ok-soft text-ok-ink',
    lead: 'AIチューターとして必要な基礎を十分に理解しています。この調子で、受講者に伝える練習に進みましょう。',
  },
  near: {
    label: '及第点 ・ あと一歩',
    box: 'bg-warn-tint border-warn-soft',
    badge: 'bg-warn-soft text-warn-badge',
    lead: '合格ラインの8問まであと1問。基礎はしっかり身についています。苦手分野をひとつ復習すれば、次回は十分に届きます。',
  },
  fail: {
    label: '不合格',
    box: 'bg-slate-100 border-slate-300',
    badge: 'bg-slate-200 text-slate-700',
    lead: '今回は合格ラインに届きませんでしたが、解説を読んだ分だけ確実に前進しています。分野別の結果を手がかりに、もう一度挑戦しましょう。',
  },
};

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
  const head = `「${weakest.c}」分野で${missed}問を落としています。この分野の解説を読み返すところから始めてください。`;
  const tail =
    perfect.length > 0
      ? `${perfect.join('・')}は満点です。強みとして自信を持ってください。`
      : judgement === 'fail'
        ? '1分野ずつ固めれば、必ず合格ラインに届きます。'
        : '';
  return `${head}${tail}`;
}

function RetryIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 12a9 9 0 1 0 3-6.7" />
      <path d="M3 4v5h5" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </svg>
  );
}

export function ResultScreen({ score, total, categoryStats, onRetry }: Props) {
  const judgement = judge(score);
  const j = JUDGEMENT[judgement];
  const rate = total > 0 ? Math.round((score / total) * 100) : 0;

  return (
    <section
      aria-labelledby="result-title"
      className="flex flex-col gap-5 rounded-xl border border-line bg-white p-4 sm:gap-6 sm:rounded-2xl sm:p-8"
    >
      <div className="flex flex-col gap-2">
        <div className="text-[13px] font-bold tracking-wide text-primary">総合結果</div>
        <h1 id="result-title" className="text-2xl font-bold leading-snug text-heading">
          おつかれさまでした。結果をご確認ください
        </h1>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col items-start gap-1.5 rounded-[14px] border border-line p-5 sm:p-6">
          <div className="text-xs font-bold tracking-wider text-muted">スコア</div>
          <div className="flex items-baseline gap-1.5 text-[54px] font-bold leading-none text-heading sm:text-[60px]">
            {score}
            <span className="text-lg font-bold text-muted">/ {total}問</span>
          </div>
          <div className="text-sm text-body">
            正答率 <span className="text-xl font-bold text-heading">{rate}%</span>
          </div>
        </div>
        <div className={`flex flex-col justify-center gap-2.5 rounded-[14px] border p-5 sm:p-6 ${j.box}`}>
          <span className={`inline-flex items-center gap-2 self-start rounded-full px-4 py-2 text-base font-bold ${j.badge}`}>
            {judgement === 'pass' ? <CheckIcon /> : null}
            {j.label}
          </span>
          <p className="text-sm leading-[1.7] text-body">{j.lead}</p>
        </div>
      </div>

      <div className="flex flex-col gap-3.5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-[15px] font-bold text-heading">カテゴリ別の正解数</h2>
          <div className="flex gap-3.5 text-xs text-muted">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-[3px] bg-primary" />正解
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-[3px] bg-line" />未正解
            </span>
          </div>
        </div>
        <ul className="flex flex-col gap-4">
          {CATEGORIES.map((c: Category) => {
            const s = categoryStats[c] ?? { correct: 0, total: 0 };
            const pct = s.total > 0 ? Math.round((s.correct / s.total) * 100) : 0;
            return (
              <li
                key={c}
                className="grid grid-cols-[64px_1fr_64px] items-center gap-2.5 text-sm sm:grid-cols-[88px_1fr_72px] sm:gap-3.5"
              >
                <span className="font-bold text-heading">{c}</span>
                <div
                  role="img"
                  aria-label={`${c} ${s.total}問中${s.correct}問正解`}
                  className="h-3 overflow-hidden rounded-md bg-line"
                >
                  <div className="h-full rounded-md bg-primary" style={{ width: `${pct}%` }} />
                </div>
                <span className="whitespace-nowrap text-right font-bold text-heading">
                  {s.correct} <span className="font-medium text-muted">/ {s.total}問</span>
                </span>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="flex flex-col gap-2 rounded-xl bg-tint px-5 py-5 sm:px-[22px]">
        <div className="text-sm font-bold text-primary">次の一歩</div>
        <p className="text-[15px] leading-[1.85] text-body">{nextStep(categoryStats, judgement)}</p>
      </div>

      <button
        type="button"
        onClick={onRetry}
        className="inline-flex min-h-[52px] w-full items-center justify-center gap-2 rounded-[10px] bg-primary px-7 text-base font-bold text-white transition-colors hover:bg-primary-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        <RetryIcon />
        もう一度挑戦する
      </button>
      <p className="text-center text-[13px] leading-relaxed text-muted">
        出題は毎回入れ替わります。解説を読み返してから再挑戦すると定着しやすくなります。
      </p>
    </section>
  );
}
