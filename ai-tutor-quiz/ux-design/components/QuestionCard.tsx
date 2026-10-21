import { CHOICE_LABELS, CATEGORY_COLOR, type Question } from '../types';

type Props = {
  question: Question;
  /** 0始まりの出題番号 */
  index: number;
  total: number;
  /** 未回答なら null。回答後は選んだ選択肢の index */
  selectedIndex: number | null;
  onSelect: (choiceIndex: number) => void;
};

type ChoiceState = 'idle' | 'correct' | 'wrong' | 'off';

function choiceState(i: number, selectedIndex: number | null, correctIndex: number): ChoiceState {
  if (selectedIndex === null) return 'idle';
  if (i === correctIndex) return 'correct';
  if (i === selectedIndex) return 'wrong';
  return 'off';
}

const CHOICE_BASE =
  'flex w-full flex-wrap items-start gap-3 rounded-2xl border-2 border-ink bg-white px-3.5 py-3.5 text-left text-base leading-relaxed text-ink ' +
  'min-h-[58px] lg:min-h-16 lg:flex-nowrap lg:gap-4 lg:rounded-[20px] lg:px-5 lg:py-4 lg:text-[17px] ' +
  'transition-[transform,box-shadow,background-color,color] duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand';

const CHOICE_BY_STATE: Record<ChoiceState, string> = {
  idle: 'shadow-[3px_3px_0_var(--color-ink)] lg:shadow-[4px_4px_0_var(--color-ink)] sticker-lift cursor-pointer',
  correct: 'bg-ok text-white -translate-x-0.5 -translate-y-0.5 shadow-[5px_5px_0_var(--color-ink)]',
  wrong: 'bg-ng text-white shadow-[3px_3px_0_var(--color-ink)] lg:shadow-[4px_4px_0_var(--color-ink)]',
  off: 'opacity-40 shadow-none',
};

const KEY_BASE =
  'flex size-8 shrink-0 items-center justify-center rounded-[10px] border-2 text-sm font-black lg:size-9 lg:rounded-xl lg:text-[15px]';

const KEY_BY_STATE: Record<ChoiceState, string> = {
  idle: 'border-ink text-ink',
  correct: 'border-white bg-white text-ok',
  wrong: 'border-white bg-white text-ng',
  off: 'border-ink text-ink',
};

/**
 * 出題カード。未回答と回答後（正解＝緑面、誤答＝コーラル面、他＝40%）を同じコンポーネントで描く。
 * 親は data-theme を question.category に合わせて切り替える（CATEGORY_THEME 参照）。
 */
export function QuestionCard({ question, index, total, selectedIndex, onSelect }: Props) {
  const answered = selectedIndex !== null;
  const cat = CATEGORY_COLOR[question.category];

  return (
    <section aria-labelledby="question-text" className="flex flex-col gap-4 lg:gap-[22px]">
      <div className="flex items-end gap-3 lg:gap-4">
        <div className="text-6xl font-black leading-[.9] tracking-[-.04em] lg:text-[88px]">
          Q{index + 1}
          <span className="ml-1 text-lg font-bold tracking-normal text-ink-soft lg:text-[22px]">/ {total}</span>
        </div>
        <span className="mb-2 inline-flex h-8 items-center gap-2 rounded-full bg-ink px-3 text-xs font-bold text-white lg:mb-2.5 lg:h-9 lg:px-3.5 lg:text-[13px]">
          <span aria-hidden="true" className={`size-2.5 rounded-full ${cat.token}`} />
          {question.category}
        </span>
      </div>

      <p id="question-text" className="text-xl font-bold leading-[1.6] lg:text-[26px] lg:tracking-tight">
        {question.text}
      </p>

      {!answered ? (
        <p className="text-xs font-bold text-ink-soft lg:text-[13px]">
          ひとつ選んでください。選ぶとすぐに正誤と解説が表示されます。
        </p>
      ) : null}

      <div role="group" aria-label={answered ? '選択肢（回答済み）' : '選択肢'} className="flex flex-col gap-3 lg:gap-3.5">
        {question.choices.map((choice, i) => {
          const state = choiceState(i, selectedIndex, question.correctIndex);
          const label = CHOICE_LABELS[i] ?? String(i + 1);
          const tag =
            state === 'correct' ? (selectedIndex === i ? '正解 ・ あなたの回答' : '正解') : state === 'wrong' ? 'あなたの回答' : null;

          return (
            <button
              key={i}
              type="button"
              disabled={answered}
              onClick={() => onSelect(i)}
              aria-label={tag ? `${label} ${tag}` : undefined}
              className={`${CHOICE_BASE} ${CHOICE_BY_STATE[state]} disabled:cursor-default`}
            >
              <span className={`${KEY_BASE} ${KEY_BY_STATE[state]}`}>{label}</span>
              <span className="min-w-0 flex-1 pt-0.5 lg:pt-1">{choice}</span>
              {tag ? (
                <span className="ml-11 shrink-0 self-start whitespace-nowrap rounded-full border-2 border-current px-2.5 py-0.5 text-[11px] font-black lg:ml-0 lg:self-center lg:text-xs">
                  {tag}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </section>
  );
}
