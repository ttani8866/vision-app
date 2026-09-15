# FACE AGE SCORE — App Screen

AI肌診断アプリ「FACE AGE SCORE」の診断結果画面を実装した静的サイト。
Claude Design プロジェクト `FACE AGE SCORE.dc.html`（`1％肉体改造アプリ` プロジェクト同梱）を、
依存のない HTML / CSS / JS に落とし込んだもの。

- プロジェクト: https://claude.ai/design/p/c7af8efc-ee6c-47ea-8476-9cb8c7a13e4d
- 配色: ネイビー（#16305B）×ゴールド（#A8873B）。`<html data-accent="blue">` でアクセントを青に切替可

## 画面の構成（1画面・縦スクロール）

| # | セクション | 主要素 |
|---|---|---|
| 1 | 総合スコア | 82/100（前回比+4pt）、見た目年齢52歳相当・肌年齢50歳・改善率+5.1% |
| 2 | 顔ゾーン診断 | 顔写真スロット＋6ゾーンのチップ（額・目元・目の下・頬・ほうれい線・フェイスライン）。タップで詳細パネル切替 |
| 3 | 評価バランス | 10項目のレーダーチャート（現在 vs 目標8.5〜9）、改善優先順位TOP3 |
| 4 | AI診断コメント | 現在の状態／改善された点／現在の課題／優先順位 |
| 5 | 改善アドバイス | 守り（ホームケア：朝夜ルーティン＋おすすめ商品）／攻め（美容施術4件）のタブ切替 |
| 6 | おすすめクリニック | 2院（施術タグ・価格帯・合う理由） |
| 7 | 改善スケジュール | 9〜12月の横スクロールロードマップ |
| 8 | Before / After | 写真2枚と項目別増減 |
| 9 | スコア推移 | 6〜9月の折れ線＋イベント履歴 |
| 10 | CTA | 改善プランを実行する、次回再診断推奨日 |

## 見かた

```bash
cd face-age-score && npm install && npm start
```

`http://localhost:8150` を開く。（Claude Code からは `.claude/launch.json` の `face-age-score` で起動する）

## 写真AI分析

顔ゾーン診断の写真枠に正面の顔写真を入れ、「写真をAI分析する」を押すと、
Claude が10軸（ツヤ・ハリ・キメ・毛穴・くすみ・シミ・シワ・目袋・ほうれい線・フェイスライン）を採点し、
課題TOP3・優先順位・ホームケア・施術提案を画面に反映する。設計は `docs/analysis-design.md`。

APIキーの設定（git 管理外）:

```bash
cp face-age-score/.env.example face-age-score/.env
# ANTHROPIC_API_KEY=sk-ant-... を書き込んでサーバーを再起動
```

キー未設定時は `mock-analysis.json` のデモ結果を返し、画面に「デモ結果」と表示する。
写真はリクエスト内でのみ API に送り、サーバーには保存しない。分析結果はブラウザ内（localStorage）に保存し、
2回目以降は前回比・改善率・改善された軸を表示する。

## 構成

```
face-age-score/
├── index.html                  画面のマークアップ
├── server.js                   静的配信＋ POST /api/analyze（Claude 画像入力・構造化出力）
├── mock-analysis.json          キー未設定時のデモ結果
├── docs/analysis-design.md     写真AI分析の設計書（評価軸・スキーマ・画面反映）
├── assets/css/tokens.css       配色・フォント・角丸・影のトークン
├── assets/css/app.css          デバイスフレームと画面コンポーネント
├── assets/js/main.js           端末装飾、ゾーンチップ（window.FAS.setZones で差し替え）、タブ切替
├── assets/js/slot-upload.js    写真枠のアップロード（クリック／ドロップ、localStorage 保存）
└── assets/js/analyze.js        分析ボタン、/api/analyze 呼び出し、結果の画面反映と前回比
```

写真スロット（顔写真・Before/After）はクリックまたはドロップで写真を入れられる。商品画像はプレースホルダー。
