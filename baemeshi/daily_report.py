# -*- coding: utf-8 -*-
"""
ばえめし（@baemeshi_official）日次レポート補助スクリプト（IGフォロワー＋CPF計算）

広告データは .env のトークンに ads_read 権限がないため取得しない。
広告実績（消化金額など）は meta-ads MCP で別途取得し、--spend で渡すこと。

処理内容:
1. Instagram フォロワー数・投稿数を取得
2. reports/followers_history.json に日付・フォロワー数を記録
3. 前回記録との差分から新規フォロワー数を算出
4. --spend が与えられれば CPF（広告支出 ÷ 新規フォロワー数）を計算
5. 結果をJSONで標準出力

.env に必要なキー:
  - BAEMESHI_IG_USER_TOKEN  (Meta 長期トークン)
  - BAEMESHI_IG_ACCOUNT_ID  (例: 17841450708912874)

実行例: python -X utf8 baemeshi/daily_report.py --spend 173
"""

import argparse
import json
import os
import sys
from datetime import datetime

import requests
from dotenv import load_dotenv

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
REPORTS_DIR = os.path.join(BASE_DIR, "reports")
FOLLOWERS_HISTORY = os.path.join(REPORTS_DIR, "followers_history.json")

load_dotenv(os.path.join(os.path.dirname(BASE_DIR), ".env"))
load_dotenv()

TOKEN = os.getenv("BAEMESHI_IG_USER_TOKEN")
IG_ACCOUNT_ID = os.getenv("BAEMESHI_IG_ACCOUNT_ID")
GRAPH_VER = os.getenv("BAEMESHI_GRAPH_API_VERSION", "v21.0")
GRAPH_BASE = f"https://graph.facebook.com/{GRAPH_VER}"


def main():
    parser = argparse.ArgumentParser(description="ばえめしIGフォロワー取得＋CPF計算")
    parser.add_argument("--spend", type=float, default=None,
                        help="前日の広告消化金額（円）。meta-ads MCPで取得した値を渡す")
    args = parser.parse_args()

    if not TOKEN or not IG_ACCOUNT_ID:
        print(json.dumps({"error": "BAEMESHI_IG_USER_TOKEN / BAEMESHI_IG_ACCOUNT_ID が.envに未設定"},
                         ensure_ascii=False))
        sys.exit(1)

    os.makedirs(REPORTS_DIR, exist_ok=True)

    try:
        r = requests.get(f"{GRAPH_BASE}/{IG_ACCOUNT_ID}", params={
            "access_token": TOKEN,
            "fields": "username,followers_count,media_count",
        }, timeout=60)
        ig = r.json()
    except Exception as e:  # noqa: BLE001
        ig = {"error": str(e)}

    if "error" in ig:
        print(json.dumps({"error": ig["error"]}, ensure_ascii=False))
        sys.exit(1)

    followers_now = ig.get("followers_count")
    today = datetime.now().strftime("%Y-%m-%d")

    history = []
    if os.path.exists(FOLLOWERS_HISTORY):
        try:
            with open(FOLLOWERS_HISTORY, encoding="utf-8") as f:
                history = json.load(f)
        except Exception:  # noqa: BLE001
            history = []

    new_followers = None
    prev_record = None
    prior = [h for h in history if h["date"] != today]
    if prior:
        prev_record = prior[-1]
        new_followers = followers_now - prev_record["followers"]

    cpf = None
    if args.spend is not None and new_followers is not None and new_followers > 0:
        cpf = round(args.spend / new_followers, 1)

    # 同日重複は最新値で上書きして保存
    dedup = {h["date"]: h for h in history}
    dedup[today] = {"date": today, "followers": followers_now}
    with open(FOLLOWERS_HISTORY, "w", encoding="utf-8") as f:
        json.dump(sorted(dedup.values(), key=lambda h: h["date"]),
                  f, ensure_ascii=False, indent=2)

    print(json.dumps({
        "username": ig.get("username"),
        "followers": followers_now,
        "media_count": ig.get("media_count"),
        "prev_record": prev_record,
        "new_followers": new_followers,
        "spend": args.spend,
        "cpf": cpf,
    }, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
