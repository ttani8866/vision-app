# エステティック通信 スキルパッケージ

エステティック通信の原稿制作を自動化・標準化するスキル群。

## ディレクトリ構成

```
.claude/skills/estsu/
├── context/
│   ├── tone-and-manner.md      # トーン＆マナー（全スキル共通）
│   └── hyoki-manual.md         # 表記統一辞典 1,200語（全スキル共通）
├── estsu-interview/
│   └── SKILL.md                # タイアップ記事（音声・取材メモ→原稿）
├── estsu-case-study/
│   └── SKILL.md                # 導入サロン事例記事
├── estsu-award/
│   └── SKILL.md                # 日本美容企業大賞 誌面テキスト
├── estsu-bwj/
│   └── SKILL.md                # Beautyworld Japan 展示会特集記事
└── templates/
    ├── hearing_case_study.csv  # 導入事例ヒアリングフォーム
    └── hearing_bwj.csv         # BWJ展示会ヒアリングフォーム
```

## スキル起動方法

Claude Codeのチャットで以下のように呼び出す。

```
/estsu-interview   （タイアップ記事生成）
/estsu-case-study  （導入サロン事例記事生成）
/estsu-award       （日本美容企業大賞テキスト生成）
/estsu-bwj         （展示会特集記事生成）
```

## 共通ルール

全スキルは実行前に `context/` 配下の2ファイルを参照し、以下を自動適用する。

- トーン：だ・である調、敬語禁止
- 訴求軸：経営者目線（売上・差別化・客単価）
- 薬機法・景表法コンプライアンス自動チェック
- 表記統一辞典による表記修正

## ヒアリングフォーム運用

取材前にCSVテンプレートを記者・編集者に配布し、取材後に入力して添付する。
フォーマット統一により、スキルが入力を自動解釈して原稿生成できる。

## 更新ルール

- 表記統一マニュアルが改訂された場合は `hyoki-manual.md` を更新する
- 媒体コンセプト・トーンが変更された場合は `tone-and-manner.md` を更新する
- スキル側の出力フォーマットが変わった場合は各 `SKILL.md` を更新する
- 変更は必ず Git にコミットしてバージョン管理する
