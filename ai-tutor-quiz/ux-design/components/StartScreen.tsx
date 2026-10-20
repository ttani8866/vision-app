type Props = {
  onStart: () => void;
};

const CATEGORY_NOTES = [
  { name: '心構え', note: '受講者への向き合い方、倫理・情報の取り扱い' },
  { name: 'スキル', note: 'プロンプト設計、業務への当てはめ、伝え方' },
  { name: 'AI知識', note: '生成AI・LLMの仕組みと限界の理解' },
];

const RULES = [
  '全10問、4択です。所要時間の目安は約10分です。',
  '回答するとすぐに正誤と解説が表示されます。解説を読んでから「次の問題へ」に進んでください。',
  '一度選んだ回答は変更できません。前の問題には戻れません。',
  '10問終了後に、スコア・合否・分野別の結果を表示します。何度でも再挑戦できます。',
];

export function StartScreen({ onStart }: Props) {
  return (
    <section className="flex flex-col gap-4 rounded-xl border border-line bg-white p-4 sm:gap-5 sm:rounded-2xl sm:p-8">
      <div className="flex flex-col gap-2.5">
        <div className="text-[13px] font-bold tracking-wide text-primary">社内向け確認テスト</div>
        <h1 className="text-2xl font-bold leading-snug text-heading sm:text-[28px]">
          AIチューター確認テスト
        </h1>
        <p className="text-[15px] leading-[1.8] text-body">
          AIチューターとして必要な「心構え」「スキル」「AI知識」の3分野から出題します。
          1問ずつ回答し、その場で解説を確認しながら進めてください。
        </p>
      </div>

      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {CATEGORY_NOTES.map((c) => (
          <li
            key={c.name}
            className="flex flex-row items-baseline gap-2.5 rounded-xl border border-line px-3.5 py-3 sm:flex-col sm:gap-1 sm:px-4 sm:py-3.5"
          >
            <span className="w-14 shrink-0 text-sm font-bold text-heading sm:w-auto">{c.name}</span>
            <span className="text-xs leading-relaxed text-muted">{c.note}</span>
          </li>
        ))}
      </ul>

      <div className="flex flex-col gap-3">
        <h2 className="text-[15px] font-bold text-heading">進め方</h2>
        <ol className="flex flex-col gap-3">
          {RULES.map((rule, i) => (
            <li key={i} className="flex items-start gap-3 text-[15px] leading-[1.7] text-body">
              <span className="mt-0.5 flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full bg-primary-tint text-[13px] font-bold text-primary">
                {i + 1}
              </span>
              <span>{rule}</span>
            </li>
          ))}
        </ol>
      </div>

      <div className="flex flex-col gap-2.5">
        <h2 className="text-[15px] font-bold text-heading">合否の基準</h2>
        <div className="flex flex-wrap gap-2">
          <span className="inline-flex items-center rounded-full bg-ok-soft px-3 py-1.5 text-[13px] font-bold text-ok-ink">
            合格 ・ 8問以上
          </span>
          <span className="inline-flex items-center rounded-full bg-warn-soft px-3 py-1.5 text-[13px] font-bold text-warn-badge">
            及第点 ・ 7問
          </span>
          <span className="inline-flex items-center rounded-full bg-slate-200 px-3 py-1.5 text-[13px] font-bold text-slate-700">
            不合格 ・ 6問以下
          </span>
        </div>
      </div>

      <button
        type="button"
        onClick={onStart}
        className="inline-flex min-h-[52px] w-full items-center justify-center rounded-[10px] bg-primary px-7 text-base font-bold text-white transition-colors hover:bg-primary-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        テストを始める
      </button>
      <p className="text-center text-[13px] leading-relaxed text-muted">
        結果は学習の振り返りにご活用ください。
      </p>
    </section>
  );
}
