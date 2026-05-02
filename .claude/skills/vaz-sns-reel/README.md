# vaz-sns-reel

VAZ／新東通信グループ向けのSNSショート動画自動生成スキル（コードネーム ELEMOTION）。
Remotion + ElevenLabs で 9:16 縦・15〜60秒のリールを量産する。

## セットアップ

```bash
cd .claude/skills/vaz-sns-reel
npm install
export ELEVENLABS_API_KEY=...
```

## 使い方

1. `out/<slug>/script.md` にナレーション台本を置く（Claude が SKILL.md フローで生成）
2. ランナーを実行

```bash
node scripts/run.mjs <slug>
```

成果物は `out/<slug>/reel.mp4`。

## オプション

- `ELEMOTION_VOICE_ID` — ElevenLabs voice id を上書き
- `ELEMOTION_MODEL_ID` — 既定 `eleven_multilingual_v2`、`eleven_v3` 等に変更可

## テンプレート

- `templates/news` — ニュース要約 30秒。フック「速報」→カラオケ字幕→CTA「続きはプロフから」

他のテンプレ（product / recruit / event / tip）は順次追加。
