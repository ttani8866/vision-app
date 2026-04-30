---
name: research-person
description: MUST BE USED when 特定人物について Web 検索・SNS・プレスリリース・IR 等から情報を収集し、営業／提案／面談前リサーチに使えるプロファイルを生成するスキル。「人物リサーチして」「○○さんを調べて」「キーマン調査」「面談前にプロファイル作って」「営業前リサーチ」「提案先の役員調べて」などのキーワードで起動。新東通信グループの広告／PR／インフルエンサー営業を起点とした B2B キーマン調査を想定し、各サブエージェントの開始・完了・主要発見を Slack `#agent-log` にリアルタイム投稿する。
---

# research-person — 人物リサーチ＆プロファイル生成スキル

## Why（目的）
新東通信グループ（広告・PR・インフルエンサーマーケティング）の営業／提案担当が、面談前や提案前に対象人物（クライアント側のキーマン、登壇候補、社外役員候補、M&A 検討先の経営者等）について短時間で深く理解できる状態を作る。

最終成果物は次の 3 点。

- profile.md — 公開情報ベースの人物プロファイル
- sources.md — 出典 URL／取得日時／取得元種別
- talking_points.md — 営業／提案で活かせるトークポイント、地雷ポイント、相性の良い切り口

## When to use（起動条件）
- 「人物リサーチして」「○○さんを調べて」「キーマン調査」
- 「面談前にプロファイル作って」「営業前リサーチ」
- 「提案先の役員を調べて」「登壇候補を調べて」
- 名刺画像 → meishi-ai-outreach 経由で深掘りリサーチが必要になった場合
- セミナー登壇候補のスクリーニング（seminar-proposal の前段）

## When NOT to use
- 一般人（公人ではない個人）の調査依頼 → 受けず、用途を確認する
- 興信所的な詮索（信用調査、私生活、家族構成の特定など） → 受けない
- 上場企業役員に関する未公開の業績情報の収集 → インサイダー懸念があるため停止し、ユーザに確認

## Inputs（入力）
| 項目 | 必須 | 説明 |
|---|---|---|
| target_name | 必須 | 対象人物の氏名（漢字／カナ／英表記の揺れがあれば併記） |
| affiliation | 推奨 | 現所属企業名・役職。同名異人の特定精度が大きく上がる |
| context | 推奨 | 用途（営業前／提案前／登壇打診／M&A 検討前 など） |
| focus | 任意 | 重点的に知りたい論点（例: DX 観点、ESG 観点、AI 活用観点） |
| dry_run | 任意 | true の場合、Slack 投稿と外部検索の実行をスキップしてプランのみ提示 |

## Outputs（出力）
- `out/{slug}/profile.md`
- `out/{slug}/sources.md`
- `out/{slug}/talking_points.md`
- `out/{slug}/run.log`（Slack 投稿失敗時のローカル退避ログ）

`{slug}` は氏名と所属を結合した安全なファイル名（例: `yamada-taro_acme`）。

---

## ログ運用ルール（全サブエージェント共通／必須）

すべてのサブエージェントは、自身の処理ステップについて以下 3 種の Slack 投稿を必ず行うこと。

1. ステップ開始投稿
2. ステップ完了投稿
3. 主要発見投稿（finding が 1 件以上ある場合のみ、件数分）

### 投稿先
- チャンネル: `#agent-log`
- チャンネル ID: 環境変数 `AGENT_LOG_CHANNEL` から読み取る（必須）
- ツール: `mcp__slack__slack_post_message`

### スレッド運用
- スキル起動直後に「ルートメッセージ」を投稿し、その応答に含まれる `ts` を `root_ts` として保持する
- 以降のすべての投稿は `thread_ts = root_ts` を指定し、同じスレッドにぶら下げる
- これによりチャンネルが汚れず、対象人物 1 名 1 スレッドで追跡できる

### 環境変数チェック
- `AGENT_LOG_CHANNEL` が未設定または空文字の場合は、警告を `out/{slug}/run.log` に記録し、Slack 投稿はスキップする。本処理（リサーチと成果物生成）は継続する
- `dry_run=true` の場合も Slack 投稿はスキップする

### 投稿テンプレート

ルートメッセージ（Step 0 で 1 回だけ投稿）:
```
[research-person] start — 対象: {target_name} / 所属: {affiliation}
用途: {context}
起動者: {invoker}
開始時刻: {iso8601}
```

ステップ開始:
```
[research-person][{step_id}] ▷ start — agent: {agent_name}
input: {input_summary}
```

ステップ完了:
```
[research-person][{step_id}] ✓ done — agent: {agent_name}
所要: {elapsed_seconds}s / 取得: {n_sources}件 / 採用: {n_accepted}件
```

主要発見（1 件 1 投稿。複数発見がある場合は複数回投稿）:
```
[research-person][{step_id}] ★ finding — {headline}
要旨: {summary_1line}
出典: {source_url}
信頼度: {high|medium|low}
```

最終サマリー（Step 5 完了時に追加投稿）:
```
[research-person] ✓ all done — 対象: {target_name}
profile.md / sources.md / talking_points.md 生成完了
所要合計: {total_seconds}s / 主要発見: {n_findings}件
```

### 投稿の擬似コード（各サブエージェントで再利用）
```python
import os, time, json

def post_log(text, thread_ts=None):
    channel = os.environ.get("AGENT_LOG_CHANNEL", "").strip()
    if not channel or DRY_RUN:
        append_local_log(text)
        return None
    try:
        resp = mcp__slack__slack_post_message(
            channel=channel,
            text=text,
            thread_ts=thread_ts,
        )
        return resp.get("ts")
    except Exception as e:
        append_local_log(f"[slack-post-failed] {e} :: {text}")
        # 1 回だけリトライ
        time.sleep(1.5)
        try:
            resp = mcp__slack__slack_post_message(
                channel=channel, text=text, thread_ts=thread_ts,
            )
            return resp.get("ts")
        except Exception as e2:
            append_local_log(f"[slack-post-retry-failed] {e2}")
            return None

# Step 0 でルート投稿
root_ts = post_log(render_root_message(...))

# 各ステップの開始
post_log(render_start(step_id, agent), thread_ts=root_ts)

# 各主要発見
for f in findings:
    post_log(render_finding(step_id, f), thread_ts=root_ts)

# 各ステップの完了
post_log(render_done(step_id, agent, metrics), thread_ts=root_ts)
```

注: 本スキルが正として参照する Slack MCP ツール名は `mcp__slack__slack_post_message`。別名（例: `mcp__slack__chat_postMessage`）の Slack MCP サーバが導入された環境では、起動時に名称マッピングを行うこと。

---

## Pipeline（処理フロー）

### Step 0: 入口チェック ＆ ルート投稿（main エージェント）
1. 入力バリデーション（`target_name` 必須）
2. `AGENT_LOG_CHANNEL` の有無を確認
3. `out/{slug}/` を作成
4. ルートメッセージを Slack 投稿し、`root_ts` を保持
5. 後続 Step 1〜5 のサブエージェントを順次起動（依存があるため逐次）

### Step 1: ウェブ検索サブエージェント（web-search-agent）
担当: 公開情報の網羅的取得。

- 開始投稿
- 検索クエリ例:
  - `"{target_name}" "{affiliation}"`
  - `"{target_name}" 経歴`
  - `"{target_name}" インタビュー`
  - `"{target_name}" 講演 OR 登壇`
  - `"{target_name}" 著書 OR 寄稿`
- 上位 10 件を WebFetch で取得し、本人特定 → 要旨抽出
- 同名異人を識別（所属・顔写真・生年・関連企業で判定）
- 主要発見投稿（メディア掲載歴、過去の主張、肩書遍歴）
- 完了投稿

### Step 2: SNS 調査サブエージェント（sns-agent）
担当: 直近の関心領域・発信スタイル把握。

- 開始投稿
- 対象: X (Twitter) / LinkedIn / Facebook / Instagram / note / YouTube / Threads
- 公式アカウントの本人性を確認（プロフィール、相互フォロー、メディア言及）
- 直近 90 日の投稿から、頻出トピック・反応の良かった投稿・口調を抽出
- 主要発見投稿（関心領域 Top3、コミュニケーションスタイル、要注意な発言）
- 完了投稿

### Step 3: プレスリリース／IR 調査サブエージェント（press-agent）
担当: 公式発表ベースの直近動向把握。

- 開始投稿
- 対象: PR TIMES / @Press / ValuePress / 所属企業のニュースリリース / 上場企業なら EDINET・適時開示・統合報告書
- 直近 12 ヶ月の登壇・受賞・新規事業発表・人事・資本提携を抽出
- 上場企業役員の場合はインサイダー観点で要注意フラグを立てる
- 主要発見投稿（直近の重要発表 Top3）
- 完了投稿

### Step 4: 経歴・関連企業サブエージェント（career-agent）
担当: 構造的な背景理解。

- 開始投稿
- 対象: 学歴 / 過去職歴 / 創業企業 / 社外役員ポスト / 出資先 / 共著者・共演者
- 業界横断の人脈マップ（誰経由で接点が作れるかの仮説）
- 主要発見投稿（人脈ハブ、出身カルチャー、想定される意思決定軸）
- 完了投稿

### Step 5: 統合・プロファイル生成サブエージェント（synthesis-agent）
担当: 営業／提案で使える形に整える。

- 開始投稿
- Step 1〜4 の素材を統合し、矛盾点はソース信頼度で重み付け
- `profile.md` 生成（事実ベース、見出し: 基本情報／経歴／専門領域／直近動向／公開発言の傾向）
- `sources.md` 生成（取得 URL、取得日時、取得元種別、信頼度）
- `talking_points.md` 生成（提案の切り口、避けるべき話題、相性の良い事例、想定される反論）
- 最終サマリー投稿
- 完了投稿

---

## 機密／コンプライアンス
- 上場企業（例: 共同ピーアール 2436）の役員リサーチではインサイダー情報に最大限留意。未公開の業績・M&A情報は profile.md に書かず、ユーザに口頭確認
- センシティブ属性（思想信条、宗教、健康状態、家族構成）は talking_points.md に書かない。profile.md にも、本人が公開発信している場合に限り「公開発信あり」と中立的に記録
- クライアント名・対象人物名は Slack ログ上にも出るため、`#agent-log` チャンネルのアクセス権が社内限定であることを起動前に確認
- M&A 検討先など機微案件では、`AGENT_LOG_CHANNEL` を専用プライベートチャンネルに切り替えること

## Failure modes
| 事象 | 挙動 |
|---|---|
| `AGENT_LOG_CHANNEL` 未設定 | 警告を `run.log` に記録、Slack 投稿スキップ、本処理は継続 |
| Slack 投稿失敗 | 1.5 秒待機 → 1 回リトライ → 失敗時 `run.log` に退避 |
| 同名異人で特定不可 | 候補を 2〜3 件列挙し、ユーザに確認を求めて停止 |
| WebFetch 失敗 | 別ソースで補完、最終的に `sources.md` に「未取得」と明記 |
| 上場企業役員かつ機微情報を発見 | 即座に Step 中断し、ユーザに口頭確認 |
| dry_run=true | 検索・Slack 投稿せず、実行プランのみを `out/{slug}/plan.md` に出力 |

## 成果物の品質基準
- profile.md は 1 ページ（A4 1 枚相当）以内に収める
- すべての記述に sources.md の出典番号を併記
- 推測で書かない。出典がない情報は talking_points.md に「仮説:」と明記
- 取得日時を必ず記録（情報の鮮度判定のため）

## 関連スキル
- meishi-ai-outreach — 名刺起点でこのスキルを呼ぶ
- seminar-proposal — 登壇候補スクリーニングの前段で呼ぶ
- apo-autopilot — 面談前リサーチとして呼ぶ
