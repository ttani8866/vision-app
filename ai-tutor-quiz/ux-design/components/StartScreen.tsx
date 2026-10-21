import { CategoryScene } from './CategoryScene';

type Props = {
  onStart: () => void;
};

const CATEGORY_NOTES = [
  { name: '心構え', color: 'bg-cat-kokoro', note: '受講者への向き合い方、倫理・情報の扱い' },
  { name: 'スキル', color: 'bg-cat-skill', note: 'プロンプト設計、業務への当てはめ' },
  { name: 'AI知識', color: 'bg-cat-ai', note: '生成AI・LLMの仕組みと限界' },
];

const RULES = [
  '回答するとすぐ正誤と解説が出ます。読んでから次へ。',
  '回答の変更と前の問題への移動はできません。',
  '終了後にスコア・合否・分野別の結果を表示。何度でも再挑戦できます。',
];

/** data-theme="start" の下で使う */
export function StartScreen({ onStart }: Props) {
  return (
    <main className="mx-auto grid w-full max-w-[1200px] flex-1 grid-cols-1 items-center gap-5 px-4 pb-10 pt-2 lg:grid-cols-2 lg:gap-12 lg:px-8 lg:pb-14 lg:pt-6">
      <CategoryScene className="order-first h-[190px] lg:order-last lg:aspect-square lg:h-auto lg:max-h-[560px]" />

      <div className="flex flex-col gap-5 lg:gap-6">
        <span className="inline-flex items-center gap-2 text-[13px] font-bold tracking-wider text-brand sm:text-sm">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M12 2l2.4 7.2H22l-6 4.4 2.3 7.2L12 16.4 5.7 20.8 8 13.6 2 9.2h7.6z" />
          </svg>
          全10問 ・ 約10分
        </span>
        <h1 className="text-4xl font-black leading-[1.15] tracking-tight lg:text-[56px]">
          AIチューター
          <br />
          確認テスト
        </h1>
        <p className="text-[15px] leading-[1.85] text-ink-soft lg:text-[17px]">
          AIチューターに必要な「心構え」「スキル」「AI知識」の3分野から出題。1問ずつ答えて、その場で解説を読みながら進みます。
        </p>

        <ul className="flex flex-col gap-2.5 lg:grid lg:grid-cols-3 lg:gap-3">
          {CATEGORY_NOTES.map((c) => (
            <li
              key={c.name}
              className="sticker flex items-center gap-3 rounded-2xl bg-white px-3.5 py-3 shadow-[3px_3px_0_var(--color-ink)] lg:flex-col lg:items-start lg:gap-1.5 lg:rounded-[18px] lg:px-4 lg:py-3.5 lg:shadow-[4px_4px_0_var(--color-ink)]"
            >
              <b className="flex w-[88px] shrink-0 items-center gap-2 text-[15px] font-black lg:w-auto">
                <span aria-hidden="true" className={`size-3 rounded-[4px] ${c.color}`} />
                {c.name}
              </b>
              <span className="text-xs leading-relaxed text-ink-soft">{c.note}</span>
            </li>
          ))}
        </ul>

        <ol className="flex flex-col gap-2">
          {RULES.map((rule, i) => (
            <li key={i} className="flex items-start gap-3 text-sm leading-[1.7] text-ink-soft lg:text-[15px]">
              <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-lg bg-ink text-xs font-black text-white">
                {i + 1}
              </span>
              <span>{rule}</span>
            </li>
          ))}
        </ol>

        <div className="flex flex-wrap gap-2 text-xs font-bold lg:text-[13px]">
          <Grade color="bg-ok" label="合格 8問以上" />
          <Grade color="bg-accent" label="及第点 7問" />
          <Grade color="bg-fail" label="不合格 6問以下" />
        </div>

        <div>
          <button
            type="button"
            onClick={onStart}
            className="sticker sticker-lift inline-flex h-[60px] w-full items-center justify-center gap-3 rounded-full bg-brand px-9 text-[17px] font-black text-white shadow-[5px_5px_0_var(--color-ink)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand lg:h-16 lg:w-auto lg:text-lg"
          >
            テストを始める
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M5 12h14" />
              <path d="M13 6l6 6-6 6" />
            </svg>
          </button>
        </div>
      </div>
    </main>
  );
}

function Grade({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border-2 border-ink bg-white px-3 py-1.5">
      <span aria-hidden="true" className={`size-2.5 rounded-full ${color}`} />
      {label}
    </span>
  );
}
