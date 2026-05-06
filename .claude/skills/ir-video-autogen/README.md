# ir-video-autogen

共同ピーアール／上場クライアント向けのIR・PR動画自動生成スキル（コードネーム ELEMOTION）。
Remotion + ElevenLabs で 16:9・3〜5分のIRナレーション動画を生成する。

## セットアップ

```bash
cd .claude/skills/ir-video-autogen
npm install
export ELEVENLABS_API_KEY=...
```

## 使い方

1. `out/<slug>/script.md` にナレーション台本を置く
2. `out/<slug>/meta.json` に企業情報・ハイライトを置く
3. ランナーを実行

```bash
node scripts/run.mjs <slug>
```

成果物は `out/<slug>/video.mp4`。

### meta.json サンプル

```json
{
  "company": "共同ピーアール株式会社",
  "ticker": "2436",
  "period": "2026年3月期 通期",
  "title": "決算ハイライト",
  "highlights": [
    { "label": "売上高", "value": "12,345", "unit": "百万円" },
    { "label": "営業利益", "value": "1,234", "unit": "百万円" },
    { "label": "営業利益率", "value": "10.0", "unit": "%" }
  ],
  "disclaimer": "本動画は開示資料を要約したものであり、投資勧誘を目的とするものではありません。"
}
```

## オプション

- `ELEMOTION_IR_VOICE_ID` — voice id 上書き（既定 Morioki: `8EkOjt4xTPGMclNlh1pk`）
- `ELEMOTION_MODEL_ID` — 既定 `eleven_multilingual_v2`、`eleven_v3` 等

## ガードレール

- 開示前情報の混入チェックは Claude 側で実行（SKILL.md 参照）
- 末尾に必ず免責スライド＋ナレーションを自動付与
- 出典フッターを各セクションに表示
- 公開前は IR・法務・PR の3者承認が必要

## テンプレート

- `templates/earnings-3min` — 決算ハイライト 3分尺
