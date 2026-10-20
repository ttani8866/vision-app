import { CHOICE_LABELS, type Question } from '../types';

type Props = {
  question: Question;
  /** 0始まりの出題番号 */
  index: number;
  total: number;
  /** 未回答なら null。回答後は選んだ選択肢の index */
  selectedIndex: number | null;
  onSelect: (choiceIndex: number) => void;
};

function ProgressSegments({ index, total }: { index: number; total: number }) {
  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={total}
      aria-valuenow={index + 1}
      aria-label={`進捗 ${index + 1}問目`}
      className="grid gap-1"
      style={{ gridTemplateColumns: `repeat(${total}, minmax(0, 1fr))` }}
    >
      {Array.from({ length: total }, (_, i) => {
        const tone = i < index ? 'bg-primary' : i === index ? 'bg-primary-soft' : 'bg-line';
        return <span key={i} className={`h-1.5 rounded-full ${tone}`} />;
      })}
    </div>
  );
}

type ChoiceState = 'idle' | 'correct' | 'wrong' | 'off';

function choiceState(i: number, selectedIndex: number | null, correctIndex: number): ChoiceState {
  if (selectedIndex === null) return 'idle';
  if (i === correctIndex) return 'correct';
  if (i === selectedIndex) return 'wrong';
  return 'off';
}

const CHOICE_BASE =
  'flex w-full items-start gap-3 rounded-xl bg-white text-left text-base leading-[1.65] text-ink ' +
  'min-h-14 px-3.5 py-3.5 sm:min-h-[60px] sm:gap-3.5 sm:px-4 ' +
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary';

const CHOICE_BY_STATE: Record<ChoiceState, string> = {
  idle: 'border-[1.5px] border-choice transition-colors hover:border-primary hover:bg-tint',
  // 判定後は 2px 枠。1.5px との差分 0.5px は実用上無視できる
  correct: 'border-2 border-ok bg-ok-tint',
  wrong: 'border-2 border-ng bg-ng-tint',
  off: 'border-[1.5px] border-choice opacity-50',
};

const KEY_BASE =
  '-mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-[1.5px] text-sm font-bold';

const KEY_BY_STATE: Record<ChoiceState, string> = {
  idle: 'border-slate-400 text-slate-600',
  correct: 'border-ok bg-ok text-white',
  wrong: 'border-ng bg-ng text-white',
  off: 'border-slate-400 text-slate-600',
};

export function QuestionCard({ question, index, total, selectedIndex, onSelect }: Props) {
  const answered = selectedIndex !== null;

  return (
    <section
      aria-labelledby="question-text"
      className="flex flex-col gap-4 rounded-xl border border-line bg-white p-4 sm:gap-5 sm:rounded-2xl sm:p-8"
    >
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-baseline gap-1 text-sm font-bold text-primary">
            <span className="text-[22px]">第{index + 1}問</span>
            <span className="font-medium text-muted">/ {total}問</span>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-tint px-3 py-1 text-xs font-bold text-body">
            <span aria-hidden="true" className="h-2 w-2 rounded-full bg-primary" />
            {question.category}
          </span>
        </div>
        <ProgressSegments index={index} total={total} />
      </div>

      <p id="question-text" className="text-[17px] font-bold leading-[1.8] text-heading sm:text-lg">
        {question.text}
      </p>

      {!answered ? (
        <p className="text-[13px] text-muted">
          選択肢をひとつ選んでください。選ぶとすぐに正誤と解説が表示されます。
        </p>
      ) : null}

      <div role="group" aria-label={answered ? '選択肢（回答済み）' : '選択肢'} className="flex flex-col gap-3">
        {question.choices.map((choice, i) => {
          const state = choiceState(i, selectedIndex, question.correctIndex);
          const label = CHOICE_LABELS[i] ?? String(i + 1);
          const tag =
            state === 'correct'
              ? selectedIndex === i
                ? '正解 ・ あなたの回答'
                : '正解'
              : state === 'wrong'
                ? 'あなたの回答'
                : null;

          return (
            <button
              key={i}
              type="button"
              disabled={answered}
              onClick={() => onSelect(i)}
              aria-label={tag ? `${label} ${tag}` : undefined}
              className={`${CHOICE_BASE} ${CHOICE_BY_STATE[state]} flex-wrap disabled:cursor-default sm:flex-nowrap`}
            >
              <span className={`${KEY_BASE} ${KEY_BY_STATE[state]}`}>{label}</span>
              <span className="min-w-0 flex-1">{choice}</span>
              {tag ? (
                <span
                  className={
                    'ml-11 shrink-0 self-start rounded-md px-2 py-0.5 text-xs font-bold sm:ml-0 sm:mt-0.5 ' +
                    (state === 'correct' ? 'bg-ok-soft text-ok-ink' : 'bg-ng-soft text-ng-ink')
                  }
                >
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
