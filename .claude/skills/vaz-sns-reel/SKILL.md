---
name: vaz-sns-reel
description: MUST BE USED when VAZ／新東通信グループのSNS動画（TikTok・Instagram Reels・YouTube Shorts）を量産するスキル。原稿テキスト／URL／商材情報から、9:16縦・15〜60秒のショート動画をナレーション付き・カラオケ字幕付きで自動生成する。「SNS動画作って」「Reels作って」「TikTok動画量産」「ショート動画化」「縦動画にして」などのキーワードで起動。Remotion + ElevenLabs（コードネーム ELEMOTION）構成。CSV入力で一括量産にも対応。
---

# vaz-sns-reel — SNSショート動画 量産スキル

## Why（目的）
VAZ（インフルエンサーマーケティング）および新東通信グループのSNS運用において、原稿1本から縦動画（9:16）を15〜60秒で量産可能にする。フック→展開→CTAの定型構造で、TikTok／Reels／Shorts に同時投稿できる素材を1本¥30〜100の実費で生成。

最終成果物。

- `out/{slug}/reel.mp4` — 9:16 / 1080×1920 / mp4
- `out/{slug}/caption.txt` — 投稿コピー＋ハッシュタグ案
- `out/{slug}/script.md` — 採用された台本

コードネーム: ELEMOTION（Eleven Labs ＋ Re­motion）

## When to use（起動条件）
- 「SNS動画作って」「Reels作って」「TikTok動画量産」
- 「ショート動画化」「縦動画にして」「ニュースを動画に」
- ニュースリリース・商材紹介・採用情報・イベント告知の SNS 展開
- CSV 一括入力での量産（10本〜100本）

## When NOT to use（起動しない）
- 上場会社の IR 関連 → ir-video-autogen を使用
- 30秒以上のドキュメンタリー／インタビュー動画 → 別途設計
- インフルエンサー本人出演動画の素材生成 → 本スキルは AI 生成ナレーション前提
- 医薬品・化粧品の薬機法に踏み込む表現 → 法務レビュー前提で別フロー

## Inputs（入力）
| 項目 | 必須 | 説明 |
|---|---|---|
| topic | 必須 | 動画テーマ／原稿／URL／商材情報 |
| duration_sec | 任意 | 尺（既定 30秒、15／30／45／60 から選択） |
| platform | 任意 | `tiktok` / `reels` / `shorts` / `all`（既定 `all`） |
| tone | 任意 | `energetic` / `calm` / `cute` / `cool`（既定 `energetic`） |
| voice | 任意 | ElevenLabs voice_id 指定（未指定時はテンプレ既定） |
| template | 任意 | `news` / `product` / `recruit` / `event` / `tip`（既定 `news`） |
| batch_csv | 任意 | CSVパス。topic／tone／template列を持つ複数行を一括処理 |
| dry_run | 任意 | true で台本＋音声まで生成、動画レンダー前で停止 |

## Outputs（出力）
- `out/{slug}/reel.mp4`
- `out/{slug}/caption.txt` — プラットフォーム別の投稿文＋ハッシュタグ
- `out/{slug}/script.md`
- `out/{slug}/thumbnail.jpg` — 1フレーム目のサムネ

## Workflow（処理フロー）
1. **台本生成**: Claude がテンプレ（news / product / recruit / event / tip）に沿ってフック→展開→CTAの3部構成で台本を生成。15秒なら3〜4センテンス、60秒なら8〜12センテンス
2. **音声生成**: ElevenLabsで日本人voice＋tone指定。`character_alignment` でワード単位タイムスタンプ取得
3. **ビジュアル選定**: テンプレ別の背景動画（Pexels等の事前ダウンロード素材）／パターングラデ／ロゴ位置を決定
4. **Remotion合成**:
   - 9:16 / 1080×1920 / 30fps
   - フック2秒（大文字テロップ＋効果音）
   - 本文（カラオケ字幕：発話と同期して文字色変化）
   - CTA 末尾2秒（ロゴ＋次アクション促し）
   - BGM レイヤー（royalty-free、-18dB でダッキング）
5. **投稿コピー生成**: プラットフォーム別の文字数・ハッシュタグ慣習に合わせ caption.txt を出力
6. **量産モード**: batch_csv 指定時は並列で N 本生成し、out/{slug}/{n}/ に格納

## Templates
- `news` — ニュース要約（フック「【速報】」→3行要約→「続きは▶」）
- `product` — 商材紹介（フック「これ知ってる？」→特徴3点→「詳細はプロフから」）
- `recruit` — 採用（フック「○○な人募集」→働き方→「応募はDMで」）
- `event` — イベント告知（フック「○月○日」→内容→「申込は▶」）
- `tip` — 豆知識／ノウハウ（フック「知らないと損」→ポイント3つ→「保存推奨」）

## Tech stack
- Claude Code（台本・コピー生成）
- ElevenLabs API（`eleven_multilingual_v2` / `eleven_v3` ＋ timestamps）
- Remotion（@remotion/cli、@remotion/captions、@remotion/google-fonts、@remotion/media-utils）
- 環境変数: `ELEVENLABS_API_KEY`

## Quality guardrails
- 薬機法・景表法に抵触し得る表現（「治る」「最安」「No.1」等）は自動検出して警告
- 著作権: BGM・背景動画は商用利用可素材のみ使用（事前にライセンス済み素材を `assets/` に配置）
- 炎上リスクのある表現を Claude が事前チェック（差別・センシティブワード）
- VAZ 所属タレント・インフルエンサーが出演する場合は本スキル対象外（別途権利処理）

## サンプル起動
- 「このプレスリリースをTikTok用30秒に」
- 「採用情報を15秒のReelsに、明るめのトーンで5本量産」
- 「商材紹介CSVから60秒動画を50本一気に作って」

## 注意
- 量産時は CSV 100行で約30〜60分。並列度は環境変数 `ELEMOTION_PARALLEL`（既定3）で調整
- 公開前に1本は必ず人手レビュー（特に新テンプレ初回投入時）
