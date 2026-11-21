# JARVIS 判断監査ボード — 実データ接続メモ

作成: 2026-11-21
画面: `hud/decision-board.html`
データ受け口: `hud/js/decision-board-data.js`（型定義・fetch 関数・ダミー。差し替えはこのファイルだけ）

## 起動

```powershell
python "C:\claude code\jarvis\hud\serve.py"
```

ブラウザで http://127.0.0.1:8765/decision-board.html を開く（Claude Code の preview では jarvis-hud 構成でも可）。
実データ JSON が無い間は右上に DUMMY DATA バッジが出て、ダミー値（実在しない桁）で動く。

## 画面と連動の仕組み

- 左: 経営数字。KPI カードごとに値・単位・対象期間・対計画／対前期の差分率・推移スパークライン・出典・更新時刻
- 中央: KANBEI コア。待機／処理中／要判断で色と回転速度が変わる。直近判断の信頼度をアーク表示。アラートはチップで上に積む
- 右: 判断トレース。目的 → 入力シグナル（根拠データ）→ 候補の評価 → 判断（信頼度と根拠）→ 実行ログ。新しい判断は上に追加
- 下左: 議事録の決定事項・未決事項・宿題（担当・期限、超過は赤、3日以内は橙）
- 下右: 実行ログのストリーム

判断トレースは `decisions.json` があればそれを表示し、無ければ KPI と議事録からルールベースで派生させる。派生判断は信頼度に上限 75% を掛けている（KANBEI の実判断ではないことを明示するため）。

## アダプタ（2026-11-21 実装済み）

| スクリプト | 入力 | 出力 |
|---|---|---|
| `hud/adapters/keiei_kpi_adapter.py` | `C:\claude code\keiei-dashboard\data.json`（build_data.py の生成物。3社の役員会資料を正規化済み） | `hud/data/decision-board/kpi.json` |
| `hud/adapters/minutes_adapter.py` | `51_新東通信\s議事録\*.md`（gdrive-mtg-sync が同期・md変換したもの） | `hud/data/decision-board/minutes.json` |

```powershell
python "C:\claude code\jarvis\huddapters\keiei_kpi_adapter.py" --rebuild
```

```powershell
python "C:\claude code\jarvis\huddapters\minutes_adapter.py"
```

経営数字アダプタの要点
- 既定は新東通信・既定断面（上半期）。`--company kpr` や `--section q1` で切り替える。`--list` で候補一覧
- 全社カードは売上・粗利・粗利率・販管費・営業利益、拠点カード（名古屋・東京・大阪）は売上・粗利・営業利益のみ。参考欄（統括本部・拠点合計・事業本部内数・分離管理）は出さない
- 対計画・対前期の差分率は画面側で実額から再計算する。資料側の率はそのまま使わない
- 「季節構造」と注記されたカード（東京本社）は異常判定の閾値を -25% に緩める。それ以外は -10%
- 月次推移（history）は資料に無いため空。スパークラインは「no hist」表示になる
- 共同ピーアールを選ぶと insider: true が付き、画面上部に区分Cの警告バッジが常時出る

議事録アダプタの要点
- 直近60日・新しい順に最大8会議。`--days` `--max` で変更
- 見出しで判定する。決定（決定／決議／Decisions）、宿題（アクションアイテム／Action Items／宿題／TODO／タスク）、未決（Open Questions／未決／検討事項／課題）。該当見出しが無いファイルは載せない
- 宿題の担当は「名前: 内容」の先頭から取る。無ければ「担当未取得」。期限は本文中の日付（YYYY-MM-DD、M月D日、M/D）だけを採り、「今週中」「来週」は期限にしない
- 会議日付の優先順は frontmatter meeting_date → 本文「日付:」行 → ファイル名の日付 → 本文の最初の日付 → ファイル更新日。dateSource に採用元を書く
- 元議事録リンクは obsidian://open?vault=obsidian&file=... 形式

実行結果（2026-11-21 初回）
- kpi.json: 新東通信 55期 上半期 14指標、未取得 0。出典は 2026-10-29 役員会 東名阪営業会議資料
- minutes.json: 8会議、決定29・宿題82（期限超過7）・未決69。対象外98件（60日より前57、見出しなし41）

## 接続先（ENDPOINTS）

| キー | 既定パス | 供給元 |
|---|---|---|
| kpi | `hud/data/decision-board/kpi.json` | 経営数字パイプライン（keiei-suuji-pipeline → RIN） |
| minutes | `hud/data/decision-board/minutes.json` | 議事録パイプライン（gdrive-mtg-sync） |
| decisions | `hud/data/decision-board/decisions.json` | 任意。KANBEI の判断ログ |

静的 JSON のほか、HTTP API に変える場合は `ENDPOINTS` の URL を書き換えるだけでよい。項目名が違う場合は `normalizeKpi` / `normalizeMinutes` で揃える。

## JSON の形（最小）

```json
{
  "isDummy": false,
  "generatedAt": "2026-11-21T06:00:00+09:00",
  "metrics": [
    {
      "id": "sales_total", "name": "売上高", "group": "全社",
      "value": 0, "unit": "千円", "period": "第54期 2026年4月〜10月 累計",
      "compare": [
        { "type": "plan", "label": "計画", "value": 0 },
        { "type": "prev", "label": "前年同期", "value": 0 }
      ],
      "history": [],
      "source": "s経営情報/2026-11-xx_xxx.xlsx シート名",
      "updatedAt": "2026-11-21T06:00:00+09:00",
      "warnPct": -10
    }
  ]
}
```

```json
{
  "isDummy": false,
  "generatedAt": "2026-11-21T06:00:00+09:00",
  "minutes": [
    {
      "id": "mt_20261118_keiei", "meeting": "経営会議", "datetime": "2026-11-18T10:00:00+09:00",
      "decisions": ["..."],
      "homework": [{ "id": "hw_1", "title": "...", "owner": "...", "due": "2026-11-28", "status": "open" }],
      "openIssues": ["..."],
      "link": "obsidian://open?vault=obsidian&file=..."
    }
  ]
}
```

## 定期実行（2026-11-21 組み込み済み）

`hud/rebuild_all.py` の末尾で 2 アダプタを回す。呼び出し元は毎朝 7:20 のタスク jarvis-graph-rebuild と start_hud.bat。
順序は gdrive-mtg-sync（5:00、議事録同期と md 変換）→ 7:20 rebuild_all（目次・グラフ → build_data.py → kpi.json → minutes.json）。
通しの所要は約 3 分 30 秒（2026-11-21 実測、大半は目次・グラフ生成）。
アダプタが失敗してもグラフの生成物は残し、最後に exit 4 で返す。タスクの LastTaskResult が 4 なら判断監査ボードのデータ側の失敗。

## 残っている確認事項

- 見出しなしの議事録41件（役員会議事録など docx 変換のもの）は、決定・宿題の見出しが無いので載らない。載せるなら議事録側の書式を揃えるか、RIN/KANBEI に要約させて別ファイルに書く
- 宿題の完了消込は議事録側に `[x]` を付ける運用で拾える。付けないと期限超過のまま残る
- 判断トレース（decisions.json）は KANBEI 側の出力が無いため画面側の派生判断（上限75%）のまま

## 実データ接続のために必要な情報（初版の整理。上記で解消した項目を含む）

経営数字パイプライン側
- 出力先: 上記 kpi.json をどこに書くか（hud/data 直下に吐くアダプタを adapters/ に置く想定。rin_weekly_adapter.py と同じ流儀）
- 指標の確定リスト: 全社（売上・粗利・販管費・営業利益・経常利益）／拠点別／事業別のうち初期表示する項目と並び順
- 項目名の対応: xlsx のシート名・セル位置と metrics[].id の対応表
- 単位: 千円か円か百万円か（セル実値と表記が違う点に注意）
- 対象期間の断面: 単月か累計か、上期確定と見込の混在をどう表記するか
- 比較対象: 計画値と前年同期値の取得元（同じ xlsx か別か）
- 推移: history に入れる月数（直近 7ヶ月を想定）
- 異常判定の閾値: warnPct を指標ごとに変えるか（季節型事業は単月で赤にしない）
- 更新頻度: 月次（役員会前）か週次か。POLL_INTERVAL_MS をそれに合わせる

議事録パイプライン側
- 出力先: minutes.json の生成タイミング（gdrive-mtg-sync の 7:00 同期後に生成する想定）
- 対象会議: 経営会議・東名阪営業会議・役員会など、どの会議を載せるか
- 決定事項・宿題・未決の抽出ルール: 議事録 md のどの見出しから取るか、担当・期限の表記揺れの正規化
- 宿題の完了判定: status を誰がいつ done にするか（次回議事録で消込か、手動か）
- 元議事録リンク: obsidian:// 形式か Box の URL か

判断トレース（任意、KANBEI 連携）
- KANBEI がトレースを JSON で吐く場所と形式（DecisionTrace 型に合わせる）
- 信頼度の算出根拠を文章で必ず付ける運用にするか
- 書き込み系の実行（メール送信・Discord 投稿）は承認待ちで止める表記をどう出すか

セキュリティ
- 共同ピーアール（東証 2436）の未公表数値を載せる場合は画面にインサイダー警告を常時表示する
- serve.py は 127.0.0.1 のみ。社内 LAN に出す場合は認証を足す
