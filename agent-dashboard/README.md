# AIエージェントダッシュボード

SHINTO系統とKPR-PRISMのエージェント構成・稼働ステータスを一覧する画面。
Claude Design のハンドオフバンドル `AI Agent Dashboard v2.dc.html` を実装したもの。

## 構成

```
app/                      layout（フォント）+ page
components/ds/            デザインシステム由来のコンポーネント
  Button.tsx              原本 + info variant
  StatusPill.tsx          原本 + 4状態 + onShell
  StatusDot.tsx           ステータスドット
components/dashboard/     画面固有のコンポーネント
  Dashboard.tsx           タブ状態・詳細パネル・トーストの管理
  OrgCanvas.tsx           全体タブ（1184px以上の固定キャンバス）
  OrgStack.tsx            全体タブ（1184px未満の縦積み）
  ShintoTab.tsx / PrismTab.tsx / PendingTab.tsx
  DetailPanel.tsx / Toast.tsx / nodes.tsx / primitives.tsx
data/                     画面に出る内容（静的）
lib/types.ts              共有型
styles/tokens/            デザイントークン
```

開発サーバーは `npm run dev`（`.claude/launch.json` の `agent-dashboard`、port 3400）。

## デザインシステムの扱い

トークンはハンドオフバンドルの Navy & Gold（`project/tokens/`）を正とする。
同梱の `_ds/workstyle-evolution-design-system-*`（ティール #00A3A3）は別会社の
デザインシステムで、`--radius-lg` の値が競合するなど命名が衝突するため参照しない。

### 追加したもの：ダークシェル面レイヤー

原本のセマンティック色は白背景前提で、ダークネイビー上で使う階調が無かった。
プロトタイプは生hexで書かれており、8色54箇所がトークン未定義だった。
`styles/tokens/colors.css` の §2 にシェル面の層を追加し、すべて var() 化した。

| 用途 | 追加トークン | 原本の対応色 |
|---|---|---|
| シェル面の本文（最多使用） | `--shell-text-muted` `#8A93A8` | 定義なし |
| 強調カードの地 | `--shell-surface-raised` `#141F3A` | 定義なし |
| 自動実行中 | `--shell-success` `#22C55E` | `--success-500` `#16A34A` |
| 手動トリガー | `--shell-warning` `#EAB308` | `--warning-500` `#CA8A04` |
| 未連携の警告 | `--shell-danger` `#EF4444` | `--danger-500` `#DC2626` |
| Discord非同期 | `--shell-info` `#60A5FA` | `--info-500` `#2563EB` |

状態色は暗背景でコントラストを確保するため明度を上げた対応値。
デザイン側に戻して確定させる必要がある。

### 拡張したコンポーネント

- `StatusPill` … 原本は `active` / `idle` の2状態、かつ `background:#fff` 固定。
  凡例と同じ4状態（auto / manual / async / idle）に増やし、`onShell` で地と枠を
  外してシェル面の文字階調に切り替えられるようにした。
- `Button` … シェル面のIRIS導線用に `info` variant を追加。ゴールドは画面の
  最重要アクション1箇所に限る、という原本の規定を崩さないための追加でもある。

## 原設計からの変更点

| 箇所 | 変更 | 理由 |
|---|---|---|
| 全体タブ | 1184px未満で縦積みに切り替え | コネクタ線は端点がカード座標に直打ちで縮小できない。線が運ぶ情報は Flow の行として全て残している |
| KPR-Prismタブ | PRISM-01〜07（7エージェント）→ コマンド1 + PRWorks 13スキル | 実体は Claude Code プラグイン `kpr-prism` v1.0.1。原設計の7枠とメディアモニタリング・SNS発信は実体に無い |
| 氏名 | 谷 鉄也 → テツ | 実名を画面に出さないため。他の氏名はそのまま |
| ヘッダー | 「最終更新」→「データ更新 … · 静的」 | 外部データを取得していないため、固定日時を最終更新と表示するのは実態と合わない |
| Discordボタン | トーストの文言を「送信しました（モック）」→「未接続です（画面表示のみ）」 | 送信していないため |
| IRISの識別色 | `#2C6FE0` → `--info-500` `#2563EB` | `#2C6FE0` は同梱の別デザインシステムからの混入。Navy & Gold が同じ役割で持つ値に寄せた |

## データ

`data/` 配下が唯一の内容の出どころ。実データ接続時はここを差し替える。

- `agents.ts` … エージェント定義とSHINTOタブの行
- `prism.ts` … KPR-PRISM のコマンドとスキル
- `pending.ts` … 未対応・保留事項
- `meta.ts` … 更新日時とトースト文言

社内チャンネル名（`#action-log` / `#iris-weekly` / `#general`）と個人名を含む。
公開範囲に注意すること。
