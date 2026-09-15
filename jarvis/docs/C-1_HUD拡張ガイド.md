# フェーズC-1 JARVIS HUD 拡張ガイド（2026-09-16）

フェーズCで作った最小版HUD（`hud/`）の構造と、後から機能を足すときにどこを触ればいいかをまとめる。
コードを触らずに設定ファイル（`hud/config/*.json`）を編集するだけで済むものと、
新しいコード（アダプター・パネルモジュール）が必要なものを分けて書く。

## 全体構成

```
hud/
  index.html            エントリーポイント（唯一のHTML）
  css/style.css         見た目（銀河背景・シアン基調・幾何学リング）
  js/
    app.js               起動処理。config/*.json を読み、リング・エージェント表示・各パネルを組み立てる
    starfield.js          背景の銀河ドット（canvas）
    ring.js                中央の幾何学リング（状態で回転速度・発光・色が変わる）
    agent-ring.js          リング外周のCXO召集表（パネルと重ならないよう自動回避）
    state-poller.js        state.json を約1秒間隔でポーリング
    panels/
      panel-base.js         パネル共通の外枠（ドック/拡大/暗転）
      graph-panel.js         VisionXグラフビュー（d3-force、手動リロード）
      dashboard-panel.js     経営ダッシュボード（RIN週次レポートのみが出典）
  config/
    agents.json            CXO召集表の正本（元は .claude/agents/*.md）
    state_labels.json      KANBEIの状態→表示ラベル・色・回転速度の対応表
    metrics.json           経営ダッシュボードの指標・切り口の定義
    panels.json            HUDに載せるパネルの一覧
    voice_commands.json    発話キーワード→パネル拡大表示の対応表
  adapters/
    rin_weekly_adapter.py  RIN週次財務レポート(md) → hud/data/dashboard.json
  data/
    dashboard.json         adaptersの生成物（Git管理外。hud/state.json・hud/graph.jsonと同じ扱い）
  build_graph.py           既存（VisionXのwikilink→graph.json）
  graph.json               既存の生成物（Git管理外）
  state.json               KANBEIの現在状態（voice/jarvis_kanbei_main.py が書く。Git管理外）
```

データの流れは一方向: Pythonのアダプター（`build_graph.py` / `adapters/rin_weekly_adapter.py`）が
VisionXやRINレポートを読んで `hud/graph.json` ・ `hud/data/dashboard.json` を書き出し、
ブラウザ側（`app.js` 以下）はそのJSONを読むだけ。ブラウザ側に数字の抽出ロジックは一切置かない
（財務数字の誤読み取りリスクをPython側に閉じ込め、テスト・レビューしやすくするため）。

## ローカルでの開き方

`file://` で直接開くと `fetch()` がCORSでブロックされるので、`hud/` をカレントにして簡易サーバーを立てる。

```
cd hud
python -m http.server 8791
# ブラウザで http://127.0.0.1:8791/index.html
```

グラフ・ダッシュボードのデータは手動生成（手動リロード方針。C-1で決めた通りリアルタイム同期はしない）。

```
python hud/build_graph.py
python hud/adapters/rin_weekly_adapter.py
```

## コードを触らずにできること（config編集のみ）

### 音声コマンドを増やす
`hud/config/voice_commands.json` にキーワードと対象パネルidを1行追記するだけ。
Python側（`voice/jarvis_kanbei_main.py` の `resolve_panel_focus`）・HUD側の両方がこのファイルだけを見る。

### ダッシュボードの行・指標を増やす（データが既にアダプターから取れる場合）
`hud/config/metrics.json` の `cuts` / `metrics` に追記する。
ただし実データの抽出は `adapters/rin_weekly_adapter.py` 側の対応が必要（下記「事業本部別を足す」参照）。
config側だけ増やしてアダプターが対応していない行は自動的に「未取得」表示になる（捏造しない設計）。

### エージェント召集表の見直し
`hud/config/agents.json` の `roster` を編集する。`.claude/agents/*.md` が更新されたら、
このファイルを突合して直す（GEN休止解除など）。

## コードが必要な拡張（今回スコープ外にしたもの）

### 1. 事業本部別（ボートレース・住宅不動産）を足す
- `hud/config/metrics.json` に `cuts.business_unit`（rows: ボートレース事業本部／住宅不動産事業本部）を追加
- `hud/adapters/rin_weekly_adapter.py` に `BUSINESS_UNIT_ROWS` を追加し、`extract_shinto_branch_table` と同様に
  「事業本部別」ブロックを読むパーサーを足す（現状のRINレポートは本文に「事業本部別（同資料。...）」という
  プレーンテキストの段落で書かれており、拠点別のような整形テーブルではない。パーサーを新設するか、
  rin-weekly-financeスキル側に事業本部別も表形式で出すよう依頼するかを先に決めること）
- `dashboard-panel.js` は `cfg.activeCut` を見て描画するだけなので、UI側の変更は
  「切り口を切り替えるタブ」を足すかどうか次第（今は固定で `branch` のみ表示）

### 2. 販管費・営業利益・経常利益を足す
- `adapters/rin_weekly_adapter.py` の `METRIC_COLUMNS` に `sga`（販管費）・`operating_profit`（営業利益）・
  `ordinary_profit`（経常利益）を追加。販管費・営業利益は拠点別テーブルに列があるのでそのまま追加できるが、
  経常利益は現状のRINレポートに拠点別の列がない（SKILL.md固定行リストの追記で今後入る想定 — 2026-09-16の
  rin-weekly-finance追記を参照）。列が無い期は自動的に「未取得」になる
- `hud/config/metrics.json` の `metrics` に追記するだけでHUD側は対応する

### 3. 重要指標カード（対目標・昨対・粗利益率・成長率・自己資本比率）
- 新しいパネルモジュール `hud/js/panels/kpi-cards-panel.js` を作り、`panel-base.js` の契約
  （`mount({bodyEl, dataUrl, configUrl}) -> {reload}`）を実装する
- `hud/config/panels.json` に1件追記する（他のパネルには影響しない）
- 自己資本比率は貸借対照表の情報が必要で、RIN週次レポート（損益中心）には出てこないため、
  別アダプター（下記4と同様の考え方）が要る

### 4. Obsidianリアルタイム同期・Google Calendar等の別ソース追加
- `hud/adapters/` に新しいアダプター（例: `obsidian_rest_adapter.py`）を追加する。
  出力スキーマ（`rows[].metrics[].{value,unit,vs_target_pct,vs_prev_year_pct,period,source,note}`、
  値が無ければ `value: null` + `note` で理由を書く）を守れば `dashboard-panel.js` 側は無改修で読める
- 「リアルタイム」にする場合は `hud/config/panels.json` の該当パネルの `reload` を `"manual"` から
  `"auto"` 相当に変え、`app.js` 側でその設定を見てポーリング間隔を設定する分岐を足す
  （現状は `state-poller.js` の1秒ポーリングと同じ仕組みを流用できる）

### 5. 音声コマンドの追加（新しい種類の指示）
- キーワード追加だけなら config編集のみ（上記）で足りる
- 「指示の種類」自体を増やす場合（例: パネル拡大ではなく「別のCXOに切り替えて」等）は
  `voice/jarvis_kanbei_main.py` 側に `panel_focus` 以外の新しいstate.jsonフィールドを足し、
  `hud/js/app.js` の `startStatePoller` コールバックに対応する分岐を追加する

## 状態ファイル（state.json）のフィールド

`voice/jarvis_kanbei_main.py` の `set_state()` が書く。HUDはこれをポーリングするだけで、書き込みはしない。

| フィールド | 内容 |
|---|---|
| `state` | `booting/idle/listening/transcribing/thinking/speaking` |
| `dispatch` | 召集中CXOのジョブ配列。`done:false` が1件でもあれば HUD は「召集中」表示に切り替える |
| `panel_focus` | `voice_commands.json` のキーワード一致で決まる。`"dashboard"` / `"graph"` / `null` |
| `user` / `reply` / `tools` / `timing` | 既存のログ用途のまま。HUDでは現状未使用（将来の字幕表示等に使える） |

`hud/config/state_labels.json` の `rawStateMap` が上記 `state` を5状態（待機/聞き取り中/考え中/発話中/召集中）に正規化する。
`dispatch` に未完了ジョブがあれば、他の `state` の値より優先して「召集中」を表示する
（`app.js` の `resolveEffectiveState`）。

## 既知の制約（フェーズC最小版）

- グラフ・ダッシュボードとも手動リロード（RELOADボタン／該当パネルの拡大表示で自動リロード）。
  Obsidianの変更やRIN週次レポートの更新は自動では反映されない
- VisionXグラフは1,077ノート・120リンクとリンク密度が低い（C-0検証時点）ため、孤立ノードが多く見える。
  対策案はC-0メモ（`docs/C-0_グラフデータ先行検証.md`）参照
- 経営ダッシュボードは新東通信の拠点別（売上・粗利益）のみ。共同ピーアール・VAZ、事業本部別、
  販管費以降の指標は未実装（絶対原則6により共同ピーアールの未公表数値はそもそも出さない設計）
- `panel_focus` はユーザー発話ごとに再判定するだけで、明示的な「戻る」コマンドは無い
  （キーワードに一致しない発話が来ると自動的にリング表示へ戻る）
