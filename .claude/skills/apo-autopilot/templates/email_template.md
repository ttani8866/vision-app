# メールテンプレート（appointment-scheduler）

## 件名

subject_style=new:

```
【日程のご提案】{purpose}の件
```

subject_style=reply:

```
Re: {purpose}／日程候補
```

## 本文

```
{company}
{recipient_name}

お世話になっております。
{self_intro}

このたびは{purpose}につきまして、以下の日程候補をご提案申し上げます。

{candidates_block}

{web_meeting_note}

ご多用のところ恐れ入りますが、ご都合のよろしい日時をお知らせいただけますと幸いです。
ご返信いただき次第、こちらで仮押さえし、最終確認のうえ確定いたします。

何卒よろしくお願い申し上げます。

{signature}
```

## 変数の決め方

- `self_intro`:
  - signature_mode=shinto → 「新東通信グループ 代表取締役の谷鉄也でございます。」
  - signature_mode=kyodopr → 「共同ピーアール株式会社 取締役会長の谷鉄也でございます。」
  - signature_mode=both → 「新東通信グループ／共同ピーアール 谷鉄也でございます。」
- `candidates_block`: SKILL.md 手順5のプレーンテキスト形式（JST明示・最大5件）
- `web_meeting_note`:
  - meeting_mode=online → 「会議URLは確定後にお送りいたします。」
  - meeting_mode=in_person（場所未定）→ 「場所のご希望がございましたらお知らせください。」
  - meeting_mode=in_person（場所決定済み）→ 行を省略
- `signature`: signature.txt から signature_mode に応じたブロックを抜き出す

## 守るルール

- 日本語、敬体
- ボールド（**）禁止
- 候補は表形式を使わずプレーンテキスト
- 確定文言は「仮押さえ＋最終確認」のワンクッションを必ず入れる（即確定の言い回しは使わない）
- 差出人氏名は「谷 鉄也」（哲也ではない）
- 上場企業（共同ピーアール）の機微情報は本文に書かない
