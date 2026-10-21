type Props = {
  /** 出題中は {index(0始まり), total} を渡すとドット進捗を表示 */
  progress?: { index: number; total: number };
  /** 右端のピルに出す短い状況表示。例: "正解 2 ・ 回答済 3問" */
  status?: string;
  /** 結果画面など濃色地では true（白抜きに反転） */
  inverted?: boolean;
};

export function AppHeader({ progress, status, inverted = false }: Props) {
  return (
    <header className="flex h-14 items-center gap-3 px-4 sm:h-16 sm:px-8">
      <span
        className={
          'inline-flex h-9 items-center gap-2 rounded-full pl-2.5 pr-3.5 text-sm font-black ' +
          (inverted ? 'bg-white text-ink' : 'bg-ink text-white')
        }
      >
        <span aria-hidden="true" className="size-4 rounded-full bg-brand" />
        AI TUTOR TEST
      </span>

      {progress ? (
        <span
          aria-label={`進捗 ${progress.index + 1}問目 / ${progress.total}問`}
          className="inline-flex h-9 items-center gap-2 rounded-full border-2 border-ink bg-white px-3 text-[13px] font-bold text-ink"
        >
          <span aria-hidden="true" className="flex items-center gap-1 sm:gap-1.5">
            {Array.from({ length: progress.total }, (_, i) => {
              const state = i < progress.index ? 'bg-ink' : i === progress.index ? 'bg-brand border-brand ring-2 ring-brand ring-offset-2 ring-offset-white' : 'bg-white';
              return <span key={i} className={`size-2.5 rounded-full border-2 border-ink sm:size-3 ${state}`} />;
            })}
          </span>
          {progress.index + 1} / {progress.total}
        </span>
      ) : null}

      {status ? (
        <span
          className={
            'ml-auto hidden h-9 items-center rounded-full border-2 px-3.5 text-[13px] font-bold sm:inline-flex ' +
            (inverted ? 'border-white text-white' : 'border-ink bg-white text-ink')
          }
        >
          {status}
        </span>
      ) : null}
    </header>
  );
}
