'use client';

// useQuiz と4コンポーネントの配線例（v2）。
// useQuiz の戻り値名は推定です（README の「props の前提」参照）。実物に合わせて読み替えてください。

import { AppHeader } from './components/AppHeader';
import { CategoryScene } from './components/CategoryScene';
import { StartScreen } from './components/StartScreen';
import { QuestionCard } from './components/QuestionCard';
import { FeedbackPanel } from './components/FeedbackPanel';
import { ResultScreen } from './components/ResultScreen';
import { CATEGORY_THEME, type CategoryStats, type Phase, type Question, type Theme } from './types';

// 既存の useQuiz.ts をそのまま import してください。
// import { useQuiz } from '@/hooks/useQuiz';
declare function useQuiz(): {
  phase: Phase;
  currentQuestion: Question | null;
  currentIndex: number;
  total: number;
  selectedIndex: number | null;
  isCorrect: boolean;
  score: number;
  answeredCount: number;
  categoryStats: CategoryStats;
  start: () => void;
  answer: (choiceIndex: number) => void;
  next: () => void;
  restart: () => void;
};

export default function QuizPage() {
  const q = useQuiz();
  const inQuiz = q.phase === 'question' || q.phase === 'feedback';

  // 画面全体の色は data-theme で切り替える（globals.css の [data-theme] 参照）
  const theme: Theme =
    q.phase === 'start' ? 'start' : q.phase === 'result' ? 'result' : q.currentQuestion ? CATEGORY_THEME[q.currentQuestion.category] : 'start';

  const status = inQuiz
    ? `正解 ${q.score} ・ 回答済 ${q.answeredCount}問`
    : q.phase === 'result'
      ? `全${q.total}問 回答済み`
      : '社内研修 ・ AIチューター候補者向け';

  return (
    <div data-theme={theme} className="flex min-h-dvh flex-col bg-[var(--bg)] transition-colors duration-[400ms]">
      <AppHeader
        progress={inQuiz ? { index: q.currentIndex, total: q.total } : undefined}
        status={status}
        inverted={q.phase === 'result'}
      />

      {q.phase === 'start' && <StartScreen onStart={q.start} />}

      {inQuiz && q.currentQuestion && (
        <main className="mx-auto grid w-full max-w-[1200px] flex-1 grid-cols-1 items-start gap-4 px-4 pb-10 pt-1 lg:grid-cols-[1.1fr_.9fr] lg:gap-12 lg:px-8 lg:pb-14 lg:pt-4">
          {/* key を問題IDにすると、問題が変わるたびに左ブロックが再マウントされ入場アニメーションが走る */}
          <div key={String(q.currentQuestion.id)} className="flex flex-col gap-4 motion-safe:animate-rise lg:gap-[22px]">
            <QuestionCard
              question={q.currentQuestion}
              index={q.currentIndex}
              total={q.total}
              selectedIndex={q.selectedIndex}
              onSelect={q.answer}
            />
            {q.phase === 'feedback' && (
              <FeedbackPanel
                isCorrect={q.isCorrect}
                correctIndex={q.currentQuestion.correctIndex}
                explanation={q.currentQuestion.explanation}
                score={q.score}
                answered={q.answeredCount}
                isLast={q.currentIndex + 1 === q.total}
                onNext={q.next}
              />
            )}
          </div>
          <CategoryScene
            category={q.currentQuestion.category}
            className="order-first h-[150px] lg:sticky lg:top-6 lg:order-last lg:aspect-[1/1.05] lg:h-auto lg:max-h-[520px]"
          />
        </main>
      )}

      {q.phase === 'result' && (
        <ResultScreen score={q.score} total={q.total} categoryStats={q.categoryStats} onRetry={q.restart} />
      )}
    </div>
  );
}
