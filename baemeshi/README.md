# ばえめし投稿デスク

銀座グルメInstagramアカウント [@baemeshi_official](https://www.instagram.com/baemeshi_official/) の投稿作業を、スマホブラウザだけで完結させる社内アプリ。

本番: https://baemeshi.vercel.app （PIN認証あり）

## 機能

- 写真アップロード（最大5枚・カルーセル対応、クライアント側圧縮）
- サムネイル文字入れ（既存投稿デザイン準拠: 水色/黄色×白フチ＋公式ロゴバッジ、canvas 1080x1350）
- キャプションAI生成（Claude API、ばえめしテンプレート準拠、再生成・編集可）
- Instagram Content Publishing APIによる投稿（画像/リール/フィード動画/カルーセル）
- 投稿履歴（サムネイル一覧・削除）・結果レポート（いいね/保存/リーチ＋AIによる成果・課題・対策コメント）
- 広告実績→改善案生成→投稿への引き継ぎ（改善ループ /proposals）
- チーム共通PINによる簡易認証

## 構成

- `app/` — Next.js 14 (App Router) + TypeScript + Tailwind
  - ローカル: SQLite（better-sqlite3）＋ローカルファイル保存
  - Vercel: Neon Postgres（`DATABASE_URL`）＋Vercel Blob（`BLOB_READ_WRITE_TOKEN`）に自動切替
  - 投稿はサーバーレス対応ステートマシン（POSTでコンテナ作成→クライアントのポーリングが進行）
- `daily_report.py` ほか — フォロワー数取得等の運用スクリプト（Python）
- `DESIGN_PROMPT.md` — デザイン言語の定義（baemeshi.com準拠）

## 環境変数（リポジトリには含まれない）

`BAEMESHI_IG_USER_TOKEN` / `BAEMESHI_IG_ACCOUNT_ID` / `ANTHROPIC_API_KEY` / `BAEMESHI_APP_PIN` / `DATABASE_URL` / `BLOB_READ_WRITE_TOKEN`

IGトークンはMeta Business Suiteのシステムユーザー「ばえめし AI」で発行（60日期限）。

## ローカル開発

```bash
cd app
npm install
npm run dev -- -p 3100
```

.envはリポジトリルートの1つ上の階層に置く（`app/next.config.mjs` 参照）。Instagram APIの検証にはcloudflared等での一時公開が必要（`tools/tunnel_url.txt` にURLを書き出す運用）。
