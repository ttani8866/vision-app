# AIチューター確認テスト UXデザイン v2

モック（PC／スマホ 計8画面）、指針、実装メモは Design キャンバスにあります。
https://claude.ai/artifact/2Ungy5myKNyCw1iFtfxLCD

リファレンス: Think & Play Interactive Quiz（Bato Web Agency）
https://www.awwwards.com/sites/think-play-interactive-quiz

v2 の方針
- POP な配色と図形シーンを借り、文字は大人向けに引き締める（丸ゴシック・絵文字・キャラクターは使わない）
- カテゴリで画面全体の背景色が切り替わる。設問番号を巨大タイポで置き、設問が主役
- 枠 2px ＋ ハードシャドウの「ステッカー」立体感。ぼかし影・グラデーションは使わない
- 動きは4か所だけ（選択肢の押下、判定の反転＋解説の浮上、画面遷移、結果のカウントアップ）
- 採点ロジック・データ構造・props は v1 から変更なし

## ファイル

| ファイル | 内容 |
| --- | --- |
| globals.css | @theme トークン、data-theme 変数、@keyframes、sticker ユーティリティ |
| types.ts | 推定 props、Question 型、合否閾値、カテゴリ→テーマ対応 |
| components/AppHeader.tsx | ロゴピル＋ドット進捗＋スコア |
| components/CategoryScene.tsx | カテゴリ別の幾何学図形シーン（SVG） |
| components/StartScreen.tsx | 画面1 |
| components/QuestionCard.tsx | 画面2（回答後の反転表示も担当） |
| components/FeedbackPanel.tsx | 画面3（濃色パネル） |
| components/ResultScreen.tsx | 画面4（カウントアップ、バー伸長） |
| QuizPage.example.tsx | useQuiz との配線例（data-theme 切替） |

## props の前提（重要）

リポジトリに useQuiz.ts と Next.js 版コンポーネントが無く、添付も届いていないため、
props は依頼文から推定しています。実物と名前が違う箇所だけ読み替えてください。

| コンポーネント | props |
| --- | --- |
| StartScreen | onStart |
| QuestionCard | question, index(0始まり), total, selectedIndex(null=未回答), onSelect |
| FeedbackPanel | isCorrect, correctIndex, explanation, score, answered, isLast, onNext |
| ResultScreen | score, total, categoryStats({心構え,スキル,AI知識}: {correct,total}), onRetry |

## 導入手順

1. globals.css の内容を既存の globals.css に追記する（@import "tailwindcss" の直後）。
2. --color-brand をコーポレートカラーに差し替える（確定値 #FC6044）。
3. components/ を app 配下にコピーし、types.ts の import 先を実物の型に差し替える。
4. QuizPage.example.tsx を参考に、ルート要素へ data-theme を付けて useQuiz の戻り値を各コンポーネントへ渡す。
5. Google Fonts を使う場合は layout で Zen Kaku Gothic New（400/700/900）を読み込む。無い環境はヒラギノ角ゴ／游ゴシック／メイリオにフォールバック。
6. 外部 UI ライブラリは不要。

## デザイン指針（1ページ）

### カラー
| 役割 | 値 |
| --- | --- |
| ブランド（ロゴ抽出） | #FC6044（濃 #D9472E、淡 #FFE6E0） |
| インク | #141A2E（文字・枠・影・解説パネル・結果の地） |
| 正解の面 / 自分の誤答の面 | #1FA971 / #C1203B（白文字で反転） |
| 及第点・差し色 | #FFB224 |
| 心構え | 背景 #FFF1D6、シーン #FFB224、モチーフ: 同心円と弧 |
| スキル | 背景 #D9F4E7、シーン #22C58B、モチーフ: 階段状バーと上向き矢印 |
| AI知識 | 背景 #E6E3FF、シーン #7C6CF6、モチーフ: ノードと線 |
| スタート / 結果の地 | #FFE6E0 / #141A2E |

文字色はインク1色。淡色地の補助文字は #3A4160（7:1 以上）、濃色地の本文は #E6E9F7。

### 形・余白・サイズ
| 要素 | PC（lg 以上） | スマホ |
| --- | --- | --- |
| レイアウト | 最大 1200px、左に設問＋選択肢、右に図形シーン（sticky） | 1カラム。シーンは高さ 150px の帯で最上部 |
| 図形シーン | 正方形、角丸 40px、枠 2px、影 8px | 横長帯、角丸 24px、影 5px |
| 選択肢 | 最小 64px、余白 16px 20px、角丸 20px、影 4px | 最小 58px、余白 14px、角丸 16px、影 3px |
| 選択肢の間隔 | 14px | 12px |
| 記号 A〜D | 36px、角丸 12px の正方形 | 32px、角丸 10px |
| 主ボタン | 高さ 64px、ピル型、影 5px | 高さ 60px、幅 100% |
| 解説パネル | インク地、角丸 32px、余白 32px 36px、影はカテゴリ色 6px | 角丸 24px、余白 22px 20px |
| 進捗 | ヘッダーのピル内に 10 ドット（済み＝インク、現在＝ブランド色＋リング、未＝白）＋「3 / 10」 | 同じ、ドット 10px |

### タイポグラフィ
フォント: `"Zen Kaku Gothic New", "Hiragino Sans", "Hiragino Kaku Gothic ProN", "Yu Gothic", Meiryo, sans-serif`
英字専用フォントは使わない。太さは 900（見出し・数字）/ 700（設問・UI）/ 400（本文）の3段。font-feature-settings: "palt"。

| 用途 | サイズ / 太さ / 行間 |
| --- | --- |
| 画面タイトル | 56px / 900 / 字間 -0.02em（スマホ 36px） |
| 設問番号 | 88px / 900 / 字間 -0.04em（スマホ 60px） |
| スコア数字 | 168px / 900 / 字間 -0.06em（スマホ 128px） |
| 設問文 | 26px / 700 / 1.6（スマホ 20px） |
| 選択肢 | 17px / 400 / 1.6（スマホ 16px） |
| 解説 | 16px / 400 / 1.9（スマホ 15px） |
| 補助・ピル内 | 13px / 700。12px 以下は英字ラベル（RESULT, NEXT STEP）のみ |

### モーション（4か所だけ）
| 場面 | 動き |
| --- | --- |
| 選択肢のホバー／押下 | ホバーで -2px 移動＋影 7px、押下で +2px 移動＋影 1px。150ms |
| 判定 | 正解面を緑、誤答面を深紅に塗り、他を 40%。解説パネルが下から 16px 浮上（350ms） |
| 画面遷移 | 背景色が次カテゴリ色へ 400ms で変化、設問ブロックが浮上 |
| 結果発表 | スコアを 0 から 800ms でカウントアップ、完了後に判定バッジがポップ、分野別バーが順に伸びる |

prefers-reduced-motion が有効な環境ではすべて即時表示。
