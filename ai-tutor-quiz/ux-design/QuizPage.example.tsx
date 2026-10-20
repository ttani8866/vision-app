'use client';

// useQuiz と4コンポーネントの配線例です。
// useQuiz の戻り値名は推定です（README の「props の前提」参照）。実物に合わせて読み替えてください。

import { AppHeader } from './components/AppHeader';
import { StartScreen } from './components/StartScreen';
import { QuestionCard } from './components/QuestionCard';
import { FeedbackPanel } from './components/FeedbackPanel';
import { ResultScreen } from './components/ResultScreen';
import type { CategoryStats, Phase, Question } from './types';

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

  const status =
    q.phase === 'question' || q.phase === 'feedback'
      ? `正解 ${q.score} / 回答済 ${q.answeredCount}問`
      : q.phase === 'result'
        ? `全${q.total}問 回答済み`
        : undefined;

  return (
    <div className="flex min-h-dvh flex-col bg-page">
      <AppHeader status={status} />
      <main className="mx-auto flex w-full max-w-[720px] flex-col gap-3 px-3 pb-10 pt-4 sm:gap-4 sm:px-4 sm:pb-14 sm:pt-8">
        {q.phase === 'start' && <StartScreen onStart={q.start} />}

        {(q.phase === 'question' || q.phase === 'feedback') && q.currentQuestion && (
          <>
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
          </>
        )}

        {q.phase === 'result' && (
          <ResultScreen
            score={q.score}
            total={q.total}
            categoryStats={q.categoryStats}
            onRetry={q.restart}
          />
        )}
      </main>
    </div>
  );
}
