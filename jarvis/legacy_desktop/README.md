# JARVIS フェーズB — 音声パイプライン

マイク → Whisper文字起こし → KANBEI（Claude Code） → VOICEVOX音声出力

## 事前準備

1. Python 3.10以上がインストール済みであること
2. VOICEVOXアプリをダウンロードして起動
   https://voicevox.hiroshiba.jp/
   （起動したままにしておく。ローカルAPIが自動で立ち上がります）
3. Claude Codeがインストール・ログイン済みで、ターミナルで `claude` コマンドが動くこと
4. 依存パッケージのインストール

   ```
   pip install -r requirements.txt
   ```

   Windowsでkeyboardパッケージが権限エラーになる場合は、ターミナルを管理者権限で起動してください。

## 進め方（このままの順番で確認すること）

### ステップ1: 音声認識の単体確認
```
python step1_test_whisper.py
```
スペースキーを押しながら話し、離すと文字起こし結果が表示されることを確認。
ここで認識精度に不満があれば、モデルを `small` から `medium` に変更（step1内の `WhisperModel("small", ...)` を書き換え）。

### ステップ2: 音声合成の単体確認
```
python step2_test_voicevox.py
```
VOICEVOXが起動していれば、テスト音声が再生される。
声を変えたい場合は `SPEAKER_ID` を変更（`http://127.0.0.1:50021/speakers` で一覧確認可）。

### ステップ3: 橋渡し確認
```
python step3_bridge.py
```
ステップ1と同じ動作だが、関数化されている（jarvis_kanbei_main.pyから呼び出される部品）。

### ステップ4〜6: 本番統合
1. `kanbei_persona.md` に、既存のKANBEI人格定義（口調・役割・ルーティング基準）を貼り付ける
2. 実行:
   ```
   python jarvis_kanbei_main.py
   ```
3. スペースキーを押しながら話しかけると、KANBEIが応答し、音声で返してくる

## つまずきやすいポイント

- **`claude` コマンドが見つからない**: ターミナルで直接 `claude -p "こんにちは"` を打って動くか先に確認してください
- **応答が返ってこない/遅い**: `ask_kanbei()` のtimeout(120秒)に達していないか確認。KANBEIへの指示が長い・複雑なタスクだと初回は時間がかかることがあります
- **VOICEVOXに接続できない**: アプリを起動し忘れていないか確認。ポート番号（50021）が他アプリと衝突していないかも確認
- **マイクの音量が小さい/認識精度が低い**: OS側のマイク入力レベルを確認。USB指向性マイクに変えると改善します

## 次のフェーズへ

このフェーズが安定して動いたら、フェーズC（HUD見た目・状態連動アニメーション・Obsidianグラフ連携）に進みます。
