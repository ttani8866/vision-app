// 推定した型です。実際の useQuiz.ts の型に合わせて置き換えてください。
// 画面側は「この形の値を受け取る」ことしか前提にしていません。

export type Category = '心構え' | 'スキル' | 'AI知識';

export const CATEGORIES: Category[] = ['心構え', 'スキル', 'AI知識'];

export interface Question {
  id: string | number;
  category: Category;
  text: string;
  choices: string[]; // A〜D の4件
  correctIndex: number; // 0〜3
  explanation: string;
}

export interface CategoryStat {
  correct: number;
  total: number;
}

export type CategoryStats = Record<Category, CategoryStat>;

export type Phase = 'start' | 'question' | 'feedback' | 'result';

export type Judgement = 'pass' | 'near' | 'fail';

/** 合否3段階。8問以上=合格、7問=及第点、6問以下=不合格 */
export function judge(score: number): Judgement {
  if (score >= 8) return 'pass';
  if (score === 7) return 'near';
  return 'fail';
}

export const CHOICE_LABELS = ['A', 'B', 'C', 'D'] as const;
