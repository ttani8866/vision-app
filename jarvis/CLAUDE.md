# JARVIS × VisionX — プロジェクト定義

## Why（目的）
谷会長が音声でKANBEI（参謀エージェント）に話しかけ、VisionXの知識基盤を参照しながら
CXOエージェント群（GEN・RIN・KAI・SHU・CHO・JIN・SEN・RYU）にタスクを振る
「JARVIS型」インターフェースを構築する。

## 4条件（設計の前提）
1. Claude Code ベース（Next.js自作・OpenAI Realtime・Mastra・独自DBは採用しない）
2. VisionX × KANBEI（記憶源は VisionX のみ。JARVIS用の記憶DBを新設しない）
3. 音声制御（入力: faster-whisper ローカル／出力: VOICEVOX または ElevenLabs）
4. 幾何学リングHUD ＋ Obsidian グラフビュー（hud/build_graph.py で [[wikilink]] を直接解析 → d3.js。Local REST API は不採用）

## フェーズ
- A 土台（VisionX整理・KANBEI 3レーン再定義）: なべさんに一任。谷さんの作業対象外
- B 声をつなぐ（マイク→文字起こし→KANBEI→音声出力）: 4〜6h ← 完了（2026-09-15）
- C 見た目をつなぐ（状態連動HUD・Obsidianグラフ）: 5〜8h ← 最小版実装完了（2026-09-16）
- D 自律化（タスク実行・承認フロー・夜間パイプライン統合）: 7〜10h
- E 磨き込み（エージェント別の声・処理時間可視化・簡易セキュリティ）: 5〜8h

## KANBEI 4レーン（フェーズAで確定させる。それまでの暫定定義）
1. 即時応答: 雑談・確認・簡単な質問 → KANBEIが即答
2. VisionX参照: 経営数字・議事録・予定などの読み取り → 即時実行可
3. タスク化: 書き込みを伴う処理（Gmail送信・Notion/Discord投稿）→ 必ず人間承認を挟む
4. 召集: 壁打ち・深掘り → 骨組みを即答し、用途に応じた CXO（KAI営業／SEN マーケ／RIN財務／RAI広告定量 ほか）を裏で起動。完成したら KANBEI が要点を音声報告（docs/D-1）

## Rules
- 日本語で作成する。出力にボールド（**）を使わない
- 書き込みを伴う外部操作は承認なしに実行しない
- 記憶はVisionX（C:\Users\tetsuya.tani\Box\obsidian）を唯一の参照源とする
- 音声ファイル・モデルキャッシュはGit管理外（.gitignore）
- コンソール出力はUTF-8固定（cp932文字化け防止）

## フェーズB ステップ番号（谷さんの整理に合わせる）
1. マイク→Whisper 文字起こし 単体（完了 2026-09-13）
2. VOICEVOX 音声合成 単体（完了 2026-09-14）
3. 橋渡し（listen_once 関数化。マイク＋スペースキー押下が必要なので谷さんが実機確認）
4. 本番統合 マイク→Whisper→KANBEI→VOICEVOX（--text モードで3レーンとも動作確認 2026-09-15。マイク版は谷さん実機待ち）

## 構成（正本は C:\claude code\jarvis。Desktop\jarvis は統合済みの旧コピー）
```
jarvis/
  kanbei_persona.md            KANBEI 音声モード人格（正本 .claude/agents/kanbei.md から抽出）
  voice/step1_test_whisper.py  ステップ1 単体テスト（スペース押下中に録音）
  voice/step2_test_voicevox.py ステップ2 単体テスト
  voice/step3_bridge.py        ステップ3 listen_once（語彙ヒント・VAD・UTF-8 追加済み）
  voice/jarvis_kanbei_main.py  ステップ4 本番統合（高速版）。--text 複数指定可、--no-play で保存のみ
  voice/kanbei_session.py      claude 常駐セッション（stream-json、ストリーミング受信、使用ツール記録）
  voice/tts_stream.py          文単位ストリーミング TTS（VOICEVOX、最初の塊を短く切る）＋ FillerBank（相槌キャッシュ）
  voice/cxo_dispatch.py        召集レーン。<<DISPATCH>> マーカー解析、claude --agent で CXO 実行、VisionX に保存
  tests/audio/fillers/         相槌 WAV キャッシュ（Git管理外。話者を変えたら自動で再合成）
  voice/stt.py                 B-1 で作った検証用STT（--file / --seconds / Push-to-talk）
  hud/build_graph.py           VisionX のリンク構造を graph.json に出力（C-0 完了 2026-09-15）
  hud/graph.json               d3.js 用データ（Git管理外）
  hud/index.html                HUD最小版のエントリーポイント（C-1 完了 2026-09-16）
  hud/adapters/rin_weekly_adapter.py  RIN週次財務レポート(md)→hud/data/dashboard.json
  hud/config/                   agents/metrics/panels/state_labels/voice_commands の設定JSON
  hud/state.json                KANBEIの現在状態（jarvis_kanbei_main.py が書く。Git管理外）
  tests/audio/                 テスト音声（Git管理外）
  docs/                        手順書・動作記録
```

## 応答時間の設計要件（谷さん指示 2026-09-15）
- 発話終了から最初の声まで数秒、長くても10秒。これを超える構成は設計失敗とみなす
- 手段: claude 常駐セッション／起動時の先読み（検索ノート＋今日の予定）／文単位ストリーミングTTS／sonnet／3文以内
- つなぎ言葉: 文字起こし直後に事前合成済み相槌を即時再生（3種ランダム、起動時1回合成でキャッシュ）。初トークンが3秒以内に来なければ「少しお待ちください」を追加。persona で回答冒頭の相槌を禁止し二重発話を防ぐ
- テスト質問はインサイダー警告が出るものを避け、答えが確実にある質問だけを使う

## KANBEI 呼び出しの設計（jarvis_kanbei_main.py → kanbei_session.py）
- claude を `-p --input-format stream-json --output-format stream-json --include-partial-messages` で常駐させ、VisionX（Box\obsidian）を cwd にする。記憶源は VisionX のみ
- 起動時ウォームアップで VisionX 直下の `_KANBEI_検索ノート.md`（仮、なべさんと共有）と今日の予定を先読み
- `--allowedTools Read,Glob,Grep` に加え `--disallowedTools` で Bash/Write/Edit と Gmail/Notion/Slack/GitHub 等の MCP を明示的に禁止
- 読み取り系 MCP（Google Calendar）はレーン2として使用を許容。記憶源は VisionX、読み取り先はカレンダーを含む
- 各ターンの使用ツール・秒数を tests/logs/turns.jsonl に記録
- モデル既定 sonnet（JARVIS_KANBEI_MODEL）、タイムアウト180秒（JARVIS_KANBEI_TIMEOUT）
- 人格は `--append-system-prompt` で kanbei_persona.md を渡す
- VOICEVOX 話者は環境変数 JARVIS_SPEAKER_ID（既定 13 青山龍星。3 はずんだもん）

## エージェント名の注意
- HUDモックアップの8体表記「RIN/KAI/JIN/CHO/SEN/RYO/SHU/IRIS」のうち RYO は RYU（クリエイティブ）の誤記
- 正本の召集表には RAI（デジタル広告）も入っている。GEN は 2026-08-30 休止、IRIS は対外・広報担当のCOS
- HUD に並べる体は正本（.claude/agents）と突合して確定済み（hud/config/agents.json、2026-09-16）。
  CHO/IRIS/JIN/KAI/RAI/RIN/RYU/SEN/SHU の9体（KANBEIは中央リング本体、GENは休止中のため除外）

## フェーズC-1 HUD最小版（2026-09-16、詳細は docs/C-1_HUD拡張ガイド.md）
- 幾何学リング（KANBEI状態5種: 待機/聞き取り中/考え中/発話中/召集中、召集中はdispatch未完了ジョブがあれば他状態より優先）
- VisionXグラフビュー（graph.json、d3-force、クリックで隣接強調、手動リロード）
- 経営ダッシュボード（RIN週次レポートのみ出典。拠点別×売上・粗利益、対目標・昨対、断面・出典表示、存在しない値は「未取得」）
- 音声コマンドでパネル拡大（「経営数字」「VisionX」等、hud/config/voice_commands.json）
- 指標・切り口・パネル一覧・召集表・音声コマンドは全てconfig化。事業本部別・販管費以降の指標・自己資本比率カード・
  Obsidianリアルタイム同期は未実装（拡張ガイド参照）

## 実行環境（2026-09-13時点）
- Python 3.13 / GPUなし → faster-whisper は CPU int8。small モデルで 9秒音声を約2.5秒で推論
- ffmpeg なし（faster-whisper は PyAV 同梱のため不要）
- 既定マイク: インテル スマート・サウンド・テクノロジー マイク配列（動作確認済）
- VOICEVOX 0.25.2 がローカル起動（http://127.0.0.1:50021）。Desktop に VOICEVOX.lnk
- claude CLI 2.1.251。ただし CLI の OAuth が切れると `claude -p` が「Failed to authenticate」になる → 端末で `claude login`
- Windows標準TTS（Haruka/Ayumi/Ichiro/Sayaka ja-JP）がテスト音声生成に使える
