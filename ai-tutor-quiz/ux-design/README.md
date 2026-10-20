# AIチューター確認テスト UXデザイン

モック（PC／スマホ 計8画面）と指針ボードは Design キャンバスにあります。
https://claude.ai/artifact/2Ungy5myKNyCw1iFtfxLCD

このフォルダは Tailwind CSS v4 版のコンポーネント一式です。採点ロジック・データ構造には触れていません。

## ファイル

| ファイル | 内容 |
| --- | --- |
| globals.css | @theme トークン（色・日本語フォント） |
| types.ts | 推定した props と Question 型、合否判定の閾値 |
| components/AppHeader.tsx | 共通ヘッダー（任意） |
| components/StartScreen.tsx | 画面1 スタート |
| components/QuestionCard.tsx | 画面2 出題（進捗バー内包、回答後の正誤表示も担当） |
| components/FeedbackPanel.tsx | 画面3 判定・解説・現在スコア・次へ |
| components/ResultScreen.tsx | 画面4 総合結果 |
| QuizPage.example.tsx | useQuiz との配線例 |

## props の前提（重要）

リポジトリに useQuiz.ts と Next.js 版コンポーネントが無く、添付も届いていなかったため、
props は依頼文から次のように推定しています。実物と名前が違う箇所だけ読み替えてください。

| コンポーネント | props |
| --- | --- |
| StartScreen | onStart |
| QuestionCard | question, index(0始まり), total, selectedIndex(null=未回答), onSelect |
| FeedbackPanel | isCorrect, correctIndex, explanation, score, answered, isLast, onNext |
| ResultScreen | score, total, categoryStats({心構え,スキル,AI知識}: {correct,total}), onRetry |

## 導入手順

1. globals.css の @theme ブロックを既存の globals.css に追記する（@import "tailwindcss" の直後）。
2. components/ を app 配下の任意の場所にコピーし、types.ts の import 先を実物の型に差し替える。
3. QuizPage.example.tsx を参考に、useQuiz の戻り値を各コンポーネントへ渡す。
4. 外部 UI ライブラリは不要。shadcn/ui はダイアログやトーストが必要になった段階で検討。

## デザイン指針（1ページ）

### 方針
- 社内研修ツールとしての落ち着いた信頼感。色は紺1色＋判定用の意味色だけ。
- 優先順位は余白と文字の太さで作る。グラデーション、影の多用、絵文字、演出は使わない。
- 不正解を責めない。赤は「自分が選んだ誤答の枠1つ」に限定し、判定ヘッダーは琥珀色＋「惜しい。正解は B でした」。
- 判定は色だけに頼らない。文言＋記号＋「正解」「あなたの回答」タグを必ず併記。

### カラー
| 役割 | 値 |
| --- | --- |
| プライマリ（紺） | #1E3A5F（濃 #122A47、進捗の現在 #8FA7C7、淡 #EAF0F7） |
| ページ背景 / 罫線 / 選択肢枠 | #F3F5F8 / #E3E8EF / #D5DCE5 |
| 見出し / 本文 / 補助文字 | #14233A / #3E4C5B / #5B6B7D |
| 正解（緑） | 枠 #15803D、文字 #166534、バッジ #DCFCE7、面 #F0FDF4 |
| 誤答の選択肢（赤） | 枠 #DC2626、文字 #991B1B、タグ #FEE2E2、面 #FEF2F2 |
| 不正解ヘッダー・及第点（琥珀） | 文字 #9A3412 / #92400E、バッジ #FEF3C7、面 #FFF7ED |
| 不合格 | 灰 #E2E8F0 + #334155（赤を使わない） |

補助文字 #5B6B7D は白地で 5.3:1、本文 #3E4C5B は 8.5:1 を確保しています。

### 余白・サイズ
| 要素 | PC（641px以上） | スマホ（640px以下） |
| --- | --- | --- |
| コンテンツ最大幅 | 720px 中央 | 画面幅いっぱい（左右 12px） |
| カード内側余白 | 32px | 16px |
| カード内の縦間隔 | 20px（結果 24px） | 16px（結果 20px） |
| 選択肢 高さ / 内側余白 | 最小 60px / 14px 16px | 最小 56px / 14px 14px |
| 選択肢の間隔 | 12px | 12px |
| 主ボタン | 高さ 52px | 高さ 52px、幅 100% |
| 角丸 | カード 16px、選択肢 12px、ボタン 10px、バッジ 999px | カード 12px、他は同じ |
| 罫線 | 通常 1px、選択肢 1.5px、判定後 2px の意味色 | 同じ |

- 進捗は10分割のセグメントバー（済み＝紺、現在＝薄紺、未＝グレー）＋「第3問 / 10問」の数字。
- 回答後は未選択の選択肢を opacity 0.5 と disabled に。正解枠と自分の誤答枠だけ 2px の色枠。
- 選択肢は行全体が button。記号（A〜D）は 32px の丸で上揃え、長文でも文頭が揃う。

### タイポグラフィ
フォントは日本語ゴシックのみ。
`"Noto Sans JP", "Hiragino Sans", "Hiragino Kaku Gothic ProN", "Yu Gothic", Meiryo, sans-serif`
英字専用フォントは指定しない。font-feature-settings: "palt" で数字を詰める。太さは 400 / 700 の2段階。

| 用途 | サイズ / 太さ / 行間 |
| --- | --- |
| 画面タイトル | 28px / 700 / 1.4（スマホ 24px） |
| 問題文 | 18px / 700 / 1.8（スマホ 17px） |
| 選択肢 | 16px / 400 / 1.65（iOS の自動ズーム回避のため 16px が下限） |
| 解説 | 15px / 400 / 1.85 |
| 補助・注記 | 13px / 500 / 1.6 |
| ラベル・凡例 | 12px / 700（これより小さくしない） |
| スコア数字 | 60px / 700 / 1（スマホ 54px）、単位は 18px 補助色 |
