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

/** data-theme の値。globals.css の [data-theme] と対応 */
export type Theme = 'start' | 'kokoro' | 'skill' | 'ai' | 'result';

export const CATEGORY_THEME: Record<Category, Theme> = {
  心構え: 'kokoro',
  スキル: 'skill',
  AI知識: 'ai',
};

/** カテゴリ色（Tailwind のトークン名と hex）。バーの色や凡例で使う */
export const CATEGORY_COLOR: Record<Category, { token: string; hex: string }> = {
  心構え: { token: 'bg-cat-kokoro', hex: '#ff7a5c' },
  スキル: { token: 'bg-cat-skill', hex: '#22c58b' },
  AI知識: { token: 'bg-cat-ai', hex: '#7c6cf6' },
};
