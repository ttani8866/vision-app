# -*- coding: utf-8 -*-
"""
ばえめし（@baemeshi_official）週次改善レポート生成スクリプト

処理内容:
1. 過去7日間の Meta 広告パフォーマンスを取得
2. Instagram フォロワー数・直近10件の投稿エンゲージメントを取得
3. Claude API（claude-sonnet-4-6）で来週の改善プランを生成
4. レポートを baemeshi/reports/weekly_YYYYMMDD.txt に保存

.env に必要なキー:
  - BAEMESHI_IG_USER_TOKEN       (Meta 長期トークン)
  - BAEMESHI_META_AD_ACCOUNT_ID  (例: act_598774024775324)
  - BAEMESHI_IG_ACCOUNT_ID       (例: 17841450708912874)
  - ANTHROPIC_API_KEY
任意:
  - BAEMESHI_GRAPH_API_VERSION   (既定: v21.0)
"""

import os
import sys
import json
from datetime import datetime

import requests
from dotenv import load_dotenv
import anthropic

# ---- 設定読み込み --------------------------------------------------------

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
REPORTS_DIR = os.path.join(BASE_DIR, "reports")

# .env は 1つ上（C:\claude code\.env）を優先し、無ければカレントも探索
load_dotenv(os.path.join(os.path.dirname(BASE_DIR), ".env"))
load_dotenv()

TOKEN = os.getenv("BAEMESHI_IG_USER_TOKEN")
AD_ACCOUNT_ID = os.getenv("BAEMESHI_META_AD_ACCOUNT_ID")
IG_ACCOUNT_ID = os.getenv("BAEMESHI_IG_ACCOUNT_ID")
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")
GRAPH_VER = os.getenv("BAEMESHI_GRAPH_API_VERSION", "v21.0")

GRAPH_BASE = f"https://graph.facebook.com/{GRAPH_VER}"


def _require(name, value):
    if not value:
        print(f"ERROR: 環境変数 {name} が設定されていません（.env を確認してください）")
        sys.exit(1)


def fetch_ad_performance():
    """過去7日間の広告実績を取得。失敗時は {'error': ...} を返す。"""
    url = f"{GRAPH_BASE}/{AD_ACCOUNT_ID}/insights"
    params = {
        "access_token": TOKEN,
        "date_preset": "last_7d",
        "level": "account",
        "fields": ",".join([
            "spend", "impressions", "reach", "clicks", "ctr",
            "cpc", "cpm", "frequency", "actions", "cost_per_action_type",
        ]),
    }
    try:
        r = requests.get(url, params=params, timeout=60)
        data = r.json()
        if "error" in data:
            return {"error": data["error"]}
        rows = data.get("data", [])
        return rows[0] if rows else {"note": "過去7日間の配信データがありません"}
    except Exception as e:  # noqa: BLE001
        return {"error": str(e)}


def fetch_ig_profile():
    url = f"{GRAPH_BASE}/{IG_ACCOUNT_ID}"
    params = {
        "access_token": TOKEN,
        "fields": "username,followers_count,media_count",
    }
    try:
        r = requests.get(url, params=params, timeout=60)
        data = r.json()
        if "error" in data:
            return {"error": data["error"]}
        return data
    except Exception as e:  # noqa: BLE001
        return {"error": str(e)}


def fetch_recent_media(limit=10):
    url = f"{GRAPH_BASE}/{IG_ACCOUNT_ID}/media"
    params = {
        "access_token": TOKEN,
        "limit": limit,
        "fields": ",".join([
            "id", "caption", "media_type", "timestamp",
            "like_count", "comments_count", "permalink",
        ]),
    }
    try:
        r = requests.get(url, params=params, timeout=60)
        data = r.json()
        if "error" in data:
            return {"error": data["error"]}
        return data.get("data", [])
    except Exception as e:  # noqa: BLE001
        return {"error": str(e)}


def build_prompt(ad, profile, media):
    def caption_head(c):
        if not c:
            return "(キャプションなし)"
        c = c.replace("\n", " ")
        return c[:60] + ("…" if len(c) > 60 else "")

    media_lines = []
    if isinstance(media, list):
        for i, m in enumerate(media, 1):
            media_lines.append(
                f"{i}. {m.get('timestamp','')} [{m.get('media_type','')}] "
                f"いいね{m.get('like_count','?')} / コメント{m.get('comments_count','?')} "
                f"| {caption_head(m.get('caption'))}"
            )
    media_block = "\n".join(media_lines) if media_lines else json.dumps(media, ensure_ascii=False)

    return f"""あなたはInstagramグルメアカウント「ばえめし（@baemeshi_official）」の運用改善を担当するマーケティング分析担当です。
以下の直近データをもとに、来週の改善プランを日本語で作成してください。

出力ルール:
- ボールド（**）や記号装飾を使わない。プレーンテキストで書く。
- 数値は与えられたデータの範囲内で扱い、勝手に数値を捏造しない。
- 見出しは「■」を使い、次の構成にする。
  ■ 今週のサマリー
  ■ 良かった点
  ■ 課題・気になった点
  ■ 来週の改善アクション（3〜5個、具体的に）
  ■ 次週の注視指標
- データが取得できていない項目は「データ未取得」と明記し、推測で埋めない。

[過去7日間の広告実績]
{json.dumps(ad, ensure_ascii=False, indent=2)}

[Instagramプロフィール]
{json.dumps(profile, ensure_ascii=False, indent=2)}

[直近の投稿（最大10件）]
{media_block}
"""


def generate_report(prompt):
    client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)
    resp = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=4000,
        messages=[{"role": "user", "content": prompt}],
    )
    parts = [b.text for b in resp.content if getattr(b, "type", None) == "text"]
    return "\n".join(parts).strip()


def main():
    _require("BAEMESHI_IG_USER_TOKEN", TOKEN)
    _require("BAEMESHI_META_AD_ACCOUNT_ID", AD_ACCOUNT_ID)
    _require("BAEMESHI_IG_ACCOUNT_ID", IG_ACCOUNT_ID)
    _require("ANTHROPIC_API_KEY", ANTHROPIC_API_KEY)

    os.makedirs(REPORTS_DIR, exist_ok=True)

    print("1/4 広告実績を取得中...")
    ad = fetch_ad_performance()
    print("2/4 Instagramプロフィールを取得中...")
    profile = fetch_ig_profile()
    print("3/4 直近投稿を取得中...")
    media = fetch_recent_media(10)

    print("4/4 Claude APIで改善プランを生成中...")
    prompt = build_prompt(ad, profile, media)
    body = generate_report(prompt)

    today = datetime.now().strftime("%Y%m%d")
    date_h = datetime.now().strftime("%Y-%m-%d")
    header = (
        f"ばえめし（@baemeshi_official）週次改善レポート {date_h}\n"
        f"{'=' * 48}\n\n"
    )
    out_path = os.path.join(REPORTS_DIR, f"weekly_{today}.txt")
    with open(out_path, "w", encoding="utf-8") as f:
        f.write(header + body + "\n")

    print(f"完了: {out_path}")


if __name__ == "__main__":
    main()
