# Workstyle Evolution 生成AI導入LP

Claude Design のハンドオフバンドル（`Workstyle Evolution LP.dc.html`）を、
ビルド不要の静的サイトとして実装したもの。

## 構成

```
workstyle-evolution-lp/
├─ index.html            LP本体（1ページ・7セクション）
└─ assets/
   ├─ css/style.css      デザイントークン＋全スタイル
   ├─ js/main.js         FAQアコーディオン、モバイルナビ
   └─ img/               3Dアイコン20点（ハンドオフの uploads/ をそのまま使用）
```

外部依存は Google Fonts（Noto Sans JP / JetBrains Mono）のみ。
フレームワーク・ビルドステップなし。`index.html` を静的ホスティングに置けば公開できる。

## ローカル確認

```bash
npx -y http-server workstyle-evolution-lp -p 8130 -c-1
```

## セクション

1. ヒーロー（キャッチコピー＋実績3指標＋3Dアイコンのコンポジション）
2. SERVICE 提供サービス3件
3. WORKS 導入事例3件
4. WHY US 選ばれる理由3件
5. PRICE 料金プラン3件（導入プランを強調）
6. FAQ よくあるご質問4件（アコーディオン、開くのは常に1問）
7. CONTACT ダークパネルのCTA＋フッター

## デザイン準拠

配色・タイポ・余白・角丸・影は Workstyle Evolution Design System のトークン値、
およびデザインカンプの実測値をそのまま CSS カスタムプロパティ化している。

- ブランドティール `#00A3A3`、インクは寒色寄りニュートラル
- 本文 Noto Sans JP、数値・記号は JetBrains Mono（tabular-nums）
- モーション: `cubic-bezier(.2,0,.2,1)` / コントロール140ms・サーフェス220ms
- `prefers-reduced-motion` で全アニメーションを停止

## カンプからの意図的な差分

いずれも実サイトとして成立させるための追加。見た目の基準はカンプのまま。

- レスポンシブ: 1000px以下でヒーローを1カラム、860px以下でナビをハンバーガー化、
  760px以下でセクション余白と見出しサイズを縮小
- アクセシビリティ: スキップリンク、`aria-expanded` / `aria-controls` 付きの
  アコーディオン、`aria-hidden` を付けた装飾画像、フォーカスリング
- SEO/OGP メタタグ

## 未確定事項

- ロゴは未支給のため、カンプと同じくアイコン（`01_blob_blue.png`）＋
  社名テキストのプレースホルダー
- 問い合わせ導線はカンプ同様アンカーのみ。実フォーム／予約システムのURLは未定
- 実績数値・事例・価格はカンプのサンプル値。公開前に確定値への差し替えが必要
