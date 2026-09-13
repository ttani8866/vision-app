# -*- coding: utf-8 -*-
"""
ばえめし 週次改善レポート（投稿アプリの改善案を本番APIで生成し、テキストに整形）

投稿アプリ https://baemeshi.vercel.app の改善案（課題・傾向・対策の指針・次の投稿の型3つ）を
週1回自動生成し、メール下書き用のテキストとして reports/weekly_YYYYMMDD.txt に保存する。
判断の軸は CPF（フォロー獲得単価）主・CTR従。ロジックはアプリ側（app/lib/claude.ts, app/lib/insights.ts）に一本化。

処理内容:
1. POST /api/proposals/collect で直近7日の実績を収集
2. POST /api/proposals/generate で課題・傾向・対策・型を生成（本番DBにも保存され、アプリの改善案ページに出る）
3. テキストに整形して保存

.env に必要なキー:
  - BAEMESHI_APP_PIN         (本番アプリのPIN。x-bae-pin ヘッダーで認証)
任意:
  - BAEMESHI_APP_URL         (既定: https://baemeshi.vercel.app)

実行例: python -X utf8 baemeshi/weekly_proposals.py
"""

import json
import os
import sys
from datetime import datetime

import requests
from dotenv import load_dotenv

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
REPORTS_DIR = os.path.join(BASE_DIR, "reports")

load_dotenv(os.path.join(os.path.dirname(BASE_DIR), ".env"))
load_dotenv()

APP_URL = os.getenv("BAEMESHI_APP_URL", "https://baemeshi.vercel.app").rstrip("/")
PIN = os.getenv("BAEMESHI_APP_PIN")


def fmt(v, unit=""):
    if v is None:
        return "不明"
    if isinstance(v, float) and not v.is_integer():
        return f"{v:,.2f}{unit}"
    return f"{int(v):,}{unit}"


def main():
    if not PIN:
        print("ERROR: BAEMESHI_APP_PIN が .env に未設定です")
        sys.exit(1)
    os.makedirs(REPORTS_DIR, exist_ok=True)
    headers = {"x-bae-pin": PIN}

    r = requests.post(f"{APP_URL}/api/proposals/collect", headers=headers, timeout=120)
    collected = r.json()
    if not collected.get("ok"):
        print(f"ERROR: 実績収集に失敗: {collected.get('error')}")
        sys.exit(1)

    r = requests.post(
        f"{APP_URL}/api/proposals/generate",
        headers={**headers, "content-type": "application/json"},
        json={"snapshot": collected["snapshot"], "text": collected["text"]},
        timeout=150,
    )
    gen = r.json()
    if not gen.get("ok"):
        print(f"ERROR: 改善案生成に失敗: {gen.get('error')}")
        sys.exit(1)

    batch = gen["batch"]
    items = gen.get("items", [])
    issues = json.loads(batch.get("issues_json") or "[]")
    guides = json.loads(batch.get("guidelines_json") or "{}")
    kpi = (collected["snapshot"].get("kpi") or {}).get("last7")
    today = datetime.now()

    lines = []
    lines.append(f"ばえめし（@baemeshi_official）週次改善レポート {today:%Y-%m-%d}")
    lines.append("=" * 48)
    lines.append("判断の軸: CPF（フォロー獲得単価）主・CTR従。店を選ばず使える指針と型を出す")
    lines.append(f"改善案ページ: {APP_URL}/proposals")
    lines.append("")

    lines.append("■ KPI: CPF（直近7日、IGの日別新規フォロワー数が反映済みの期間）")
    if kpi:
        lines.append(f"期間: {kpi['from']}〜{kpi['to']}（{kpi['days']}日）")
        lines.append(f"CPF: {'算出不可' if kpi.get('cpf') is None else fmt(kpi['cpf'], '円')}／参考水準 150〜300円")
        lines.append(f"新規フォロワー: {fmt(kpi.get('follows'), '人')}／消化: {fmt(kpi.get('spend'), '円')}")
        lines.append(f"クリック→フォロー転換率: {fmt(kpi.get('followRate'), '%')}／平均CTR（従）: {fmt(kpi.get('ctr'), '%')}")
        if kpi.get("note"):
            lines.append(f"注: {kpi['note']}")
    else:
        lines.append("（未算出）")
    lines.append("")

    lines.append("■ 現状の課題")
    for t in issues:
        lines.append(f"・{t}")
    lines.append("")

    lines.append("■ 傾向")
    lines.append(batch.get("summary", ""))
    lines.append("")

    lines.append("■ 対策の指針（次にどの店に行っても使える）")
    for key, label in (("theme", "テーマ設定"), ("shoot", "撮り方"), ("caption", "キャプション"), ("conversion", "フォロー転換（クリック後）")):
        vals = guides.get(key) or []
        if not vals:
            continue
        lines.append(f"[{label}]")
        for t in vals:
            lines.append(f"・{t}")
    lines.append("")

    lines.append("■ 次の投稿の型（店は選ばず使える。採用は改善案ページの「この型で作る」から）")
    for i, p in enumerate(items, 1):
        lines.append(f"{i}. {p['title']}（{p['genre']}）")
        lines.append(f"   切り口: {p['hook']}")
        lines.append(f"   撮り方: {p['shoot']}")
        lines.append(f"   改善理由: {p['reason']}")
        lines.append(f"   根拠: {p['evidence']}")
        lines.append("")

    warnings = gen.get("warnings") or []
    if warnings:
        lines.append("■ 取得できなかったデータ")
        for w in warnings:
            lines.append(f"・{w}")
        lines.append("")

    out_path = os.path.join(REPORTS_DIR, f"weekly_{today:%Y%m%d}.txt")
    with open(out_path, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))
    print(f"saved: {out_path}")


if __name__ == "__main__":
    main()
