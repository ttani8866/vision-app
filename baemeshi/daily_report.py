# -*- coding: utf-8 -*-
"""
ばえめし（@baemeshi_official）日次レポート用データ取得スクリプト（広告実績＋IGフォロワー＋CPF）

KPI: CPF（Cost Per Follower ＝ 広告消化 ÷ 新規フォロワー数）。CTRは従。

CPFは2本立てで出す（IGの日別新規フォロワー数は反映が3日以上遅れるため）:
  - 速報CPF: フォロワー数スナップショットの前回実行との差分から算出（毎日実行すれば単日）
  - 確定CPF: IG insights の follower_count（日別）が反映された日について算出。
             反映済みの最新日までさかのぼって確定し、reports/kpi_daily.json に蓄積する

処理内容:
1. 対象日（既定: 前日）のキャンペーン実績・広告別内訳を Graph API で取得（トークンは ads_read 権限あり）
2. 直近14日の日別消化・CTR・リンククリックと、IG日別新規フォロワー数を取得して突き合わせる
3. 現在フォロワー数を取得し reports/followers_history.json に記録、前回との差分で速報CPFを算出
4. 確定CPF（対象日が反映済みなら単日、および反映済み直近7日）を算出
5. 結果をJSONで標準出力

.env に必要なキー:
  - BAEMESHI_IG_USER_TOKEN        (システムユーザートークン。ads_read / instagram_manage_insights 付き)
  - BAEMESHI_IG_ACCOUNT_ID        (例: 17841450708912874)
  - BAEMESHI_META_AD_ACCOUNT_ID   (例: act_598774024775324)
任意:
  - BAEMESHI_CAMPAIGN_ID          (既定: 120254625207930333 ばえめし自動化キャンペーン)
  - BAEMESHI_DAILY_BUDGET         (既定: 2000 円)
  - BAEMESHI_GRAPH_API_VERSION    (既定: v21.0)

実行例:
  python -X utf8 baemeshi/daily_report.py                # 対象日 = 前日
  python -X utf8 baemeshi/daily_report.py --date 2026-09-12
  python -X utf8 baemeshi/daily_report.py --spend 1788   # 消化金額を手入力で上書き（API不通時）
"""

import argparse
import json
import os
import sys
import time
from datetime import datetime, timedelta

import requests
from dotenv import load_dotenv

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
REPORTS_DIR = os.path.join(BASE_DIR, "reports")
FOLLOWERS_HISTORY = os.path.join(REPORTS_DIR, "followers_history.json")
KPI_DAILY = os.path.join(REPORTS_DIR, "kpi_daily.json")

load_dotenv(os.path.join(os.path.dirname(BASE_DIR), ".env"))
load_dotenv()

TOKEN = os.getenv("BAEMESHI_IG_USER_TOKEN")
IG_ACCOUNT_ID = os.getenv("BAEMESHI_IG_ACCOUNT_ID")
AD_ACCOUNT_ID = os.getenv("BAEMESHI_META_AD_ACCOUNT_ID")
CAMPAIGN_ID = os.getenv("BAEMESHI_CAMPAIGN_ID", "120254625207930333")
DAILY_BUDGET = float(os.getenv("BAEMESHI_DAILY_BUDGET", "2000"))
GRAPH_VER = os.getenv("BAEMESHI_GRAPH_API_VERSION", "v21.0")
GRAPH_BASE = f"https://graph.facebook.com/{GRAPH_VER}"

CPF_REFERENCE = "8月時点の参考水準はおおむね150〜300円"


def graph_get(path, params):
    params = dict(params)
    params["access_token"] = TOKEN
    r = requests.get(f"{GRAPH_BASE}{path}", params=params, timeout=60)
    data = r.json()
    if "error" in data:
        raise RuntimeError(data["error"].get("message", str(data["error"])))
    return data


def action_value(actions, action_type):
    for a in actions or []:
        if a.get("action_type") == action_type:
            return float(a.get("value", 0))
    return None


def num(v):
    return float(v) if v is not None else None


def fetch_campaign_day(date_str):
    """対象日のキャンペーン合計"""
    data = graph_get(f"/{CAMPAIGN_ID}/insights", {
        "time_range": json.dumps({"since": date_str, "until": date_str}),
        "level": "campaign",
        "fields": "spend,impressions,reach,clicks,ctr,cpc,cpm,frequency,inline_link_clicks,actions",
    })
    rows = data.get("data", [])
    if not rows:
        return None
    r = rows[0]
    spend = num(r.get("spend"))
    return {
        "spend": spend,
        "budget_rate": round(spend / DAILY_BUDGET * 100, 1) if spend is not None and DAILY_BUDGET else None,
        "impressions": num(r.get("impressions")),
        "reach": num(r.get("reach")),
        "clicks": num(r.get("clicks")),
        "ctr": num(r.get("ctr")),
        "cpc": num(r.get("cpc")),
        "cpm": num(r.get("cpm")),
        "frequency": num(r.get("frequency")),
        "link_clicks": num(r.get("inline_link_clicks")) or action_value(r.get("actions"), "link_click"),
        "post_engagement": action_value(r.get("actions"), "post_engagement"),
        "video_views": action_value(r.get("actions"), "video_view"),
    }


def fetch_ads_day(date_str):
    """対象日の広告別内訳（消化金額降順）"""
    data = graph_get(f"/{CAMPAIGN_ID}/insights", {
        "time_range": json.dumps({"since": date_str, "until": date_str}),
        "level": "ad",
        "fields": "ad_name,spend,impressions,clicks,ctr,cpc,inline_link_clicks,actions",
        "limit": 50,
    })
    out = []
    for r in data.get("data", []):
        out.append({
            "name": r.get("ad_name"),
            "spend": num(r.get("spend")),
            "impressions": num(r.get("impressions")),
            "clicks": num(r.get("clicks")),
            "ctr": num(r.get("ctr")),
            "cpc": num(r.get("cpc")),
            "link_clicks": num(r.get("inline_link_clicks")) or action_value(r.get("actions"), "link_click"),
            "post_engagement": action_value(r.get("actions"), "post_engagement"),
        })
    out.sort(key=lambda x: x["spend"] or 0, reverse=True)
    return out


def fetch_daily_spend(days=14):
    """直近N日の日別消化・CTR・リンククリック（キャンペーン単位）"""
    until = datetime.now().date()
    since = until - timedelta(days=days)
    data = graph_get(f"/{CAMPAIGN_ID}/insights", {
        "time_range": json.dumps({"since": since.isoformat(), "until": until.isoformat()}),
        "time_increment": 1,
        "level": "campaign",
        "fields": "spend,ctr,inline_link_clicks",
    })
    out = {}
    for r in data.get("data", []):
        out[r["date_start"]] = {
            "spend": num(r.get("spend")),
            "ctr": num(r.get("ctr")),
            "link_clicks": num(r.get("inline_link_clicks")),
        }
    return out


def fetch_daily_follows(days=14):
    """IG日別新規フォロワー数（follower_count, period=day）。反映は数日遅れる"""
    until = int(time.time())
    since = until - days * 24 * 3600
    data = graph_get(f"/{IG_ACCOUNT_ID}/insights", {
        "metric": "follower_count", "period": "day", "since": since, "until": until,
    })
    out = {}
    for m in data.get("data", []):
        if m.get("name") != "follower_count":
            continue
        for v in m.get("values", []):
            out[str(v.get("end_time", ""))[:10]] = int(v.get("value", 0))
    return out


def fetch_profile():
    return graph_get(f"/{IG_ACCOUNT_ID}", {"fields": "username,followers_count,media_count"})


def load_json(path, default):
    if os.path.exists(path):
        try:
            with open(path, encoding="utf-8") as f:
                return json.load(f)
        except Exception:  # noqa: BLE001
            return default
    return default


def save_json(path, obj):
    with open(path, "w", encoding="utf-8") as f:
        json.dump(obj, f, ensure_ascii=False, indent=2)


def main():
    parser = argparse.ArgumentParser(description="ばえめし日次レポート用データ取得（広告実績＋IGフォロワー＋CPF）")
    parser.add_argument("--date", default=None, help="対象日 YYYY-MM-DD（既定: 前日）")
    parser.add_argument("--spend", type=float, default=None, help="対象日の消化金額（円）。API不通時の手入力用")
    args = parser.parse_args()

    if not TOKEN or not IG_ACCOUNT_ID:
        print(json.dumps({"error": "BAEMESHI_IG_USER_TOKEN / BAEMESHI_IG_ACCOUNT_ID が.envに未設定"}, ensure_ascii=False))
        sys.exit(1)
    os.makedirs(REPORTS_DIR, exist_ok=True)

    today = datetime.now().date()
    target = args.date or (today - timedelta(days=1)).isoformat()
    warnings = []
    result = {"target_date": target, "run_at": datetime.now().isoformat(timespec="seconds"), "kpi_reference": CPF_REFERENCE}

    # 1. 対象日のキャンペーン実績・広告別
    try:
        result["campaign"] = fetch_campaign_day(target)
        if result["campaign"] is None:
            warnings.append(f"{target} の配信データがありません（キャンペーン停止の可能性）")
    except Exception as e:  # noqa: BLE001
        result["campaign"] = None
        warnings.append(f"キャンペーン実績の取得に失敗: {e}")
    try:
        result["ads"] = fetch_ads_day(target)
    except Exception as e:  # noqa: BLE001
        result["ads"] = []
        warnings.append(f"広告別内訳の取得に失敗: {e}")

    target_spend = args.spend
    if target_spend is None and result.get("campaign"):
        target_spend = result["campaign"]["spend"]
    if args.spend is not None:
        warnings.append("消化金額は --spend の手入力値を使用")

    # 2. 日別系列（消化 × IG新規フォロワー）
    daily_spend, daily_follows = {}, {}
    try:
        daily_spend = fetch_daily_spend()
    except Exception as e:  # noqa: BLE001
        warnings.append(f"日別消化の取得に失敗: {e}")
    try:
        daily_follows = fetch_daily_follows()
    except Exception as e:  # noqa: BLE001
        warnings.append(f"IG日別新規フォロワー数の取得に失敗: {e}")

    # 反映済みの最終日 = 値が0より大きい最後の日（それ以降の0は未反映とみなす）
    reflected_dates = sorted(d for d, v in daily_follows.items() if v > 0)
    last_reflected = reflected_dates[-1] if reflected_dates else None

    dates = sorted(set(daily_spend) | set(daily_follows))
    daily = []
    for d in dates:
        s = daily_spend.get(d, {})
        reflected = last_reflected is not None and d <= last_reflected and d in daily_follows
        f = daily_follows[d] if reflected else None
        cpf = round(s["spend"] / f) if (s.get("spend") is not None and f) else None
        daily.append({"date": d, "spend": s.get("spend"), "ctr": s.get("ctr"), "link_clicks": s.get("link_clicks"),
                      "follows": f, "cpf": cpf, "reflected": reflected})
    result["daily"] = daily
    result["last_reflected_date"] = last_reflected

    # 確定値を蓄積（反映済みの日だけ上書き）
    kpi_store = load_json(KPI_DAILY, {})
    for row in daily:
        if row["reflected"]:
            kpi_store[row["date"]] = {k: row[k] for k in ("spend", "ctr", "link_clicks", "follows", "cpf")}
    save_json(KPI_DAILY, dict(sorted(kpi_store.items())))

    # 3. 現在フォロワー数のスナップショット → 速報CPF
    profile = None
    try:
        profile = fetch_profile()
    except Exception as e:  # noqa: BLE001
        warnings.append(f"IGプロフィールの取得に失敗: {e}")

    history = load_json(FOLLOWERS_HISTORY, [])
    prev = None
    if history:
        prev = sorted(history, key=lambda r: r["date"])[-1]
    flash = {"method": "snapshot", "new_followers": None, "days": None, "per_day": None, "cpf": None, "note": None}
    if profile and profile.get("followers_count") is not None:
        now_f = int(profile["followers_count"])
        today_s = today.isoformat()
        if prev and prev["date"] != today_s:
            prev_d = datetime.strptime(prev["date"], "%Y-%m-%d").date()
            days = (today - prev_d).days
            delta = now_f - int(prev["followers"])
            flash["new_followers"] = delta
            flash["days"] = days
            flash["per_day"] = round(delta / days, 1) if days > 0 else None
            if days == 1:
                flash["cpf"] = round(target_spend / delta, 1) if (target_spend and delta > 0) else None
                flash["note"] = "前回実行から1日のため対象日の単日CPF"
            else:
                # 複数日分の合算。消化は日別系列から同期間を合算する
                span_spend = sum((daily_spend.get((prev_d + timedelta(days=i)).isoformat(), {}).get("spend") or 0)
                                 for i in range(days))
                flash["span_spend"] = span_spend
                flash["cpf"] = round(span_spend / delta, 1) if delta > 0 and span_spend else None
                flash["note"] = f"前回実行（{prev['date']}）から{days}日分の合算。単日CPFは確定値を参照"
        elif prev and prev["date"] == today_s:
            flash["note"] = "本日すでに記録済みのため速報CPFは前回実行結果を参照"
        else:
            flash["note"] = "初回記録のため速報CPFなし"
        dedup = {r["date"]: r for r in history}
        dedup[today_s] = {"date": today_s, "followers": now_f}
        save_json(FOLLOWERS_HISTORY, sorted(dedup.values(), key=lambda r: r["date"]))
        result["followers"] = {"now": now_f, "media_count": profile.get("media_count"),
                               "prev_date": prev["date"] if prev else None,
                               "prev": int(prev["followers"]) if prev else None}
    result["cpf_flash"] = flash

    # 4. 確定CPF（対象日単日と、反映済み直近7日）
    target_row = next((r for r in daily if r["date"] == target), None)
    confirmed_day = {"reflected": bool(target_row and target_row["reflected"]),
                     "follows": target_row["follows"] if target_row else None,
                     "spend": target_row["spend"] if target_row else None,
                     "cpf": target_row["cpf"] if target_row else None,
                     "follow_rate": None}
    if target_row and target_row["reflected"] and target_row.get("link_clicks") and target_row["follows"] is not None:
        confirmed_day["follow_rate"] = round(target_row["follows"] / target_row["link_clicks"] * 100, 2)
    if not confirmed_day["reflected"]:
        confirmed_day["note"] = (f"IGの日別新規フォロワー数は {last_reflected or '未取得'} まで反映済み。"
                                 f"{target} 分は後日の実行で確定する")
    result["cpf_confirmed_day"] = confirmed_day

    window = [r for r in daily if r["reflected"]][-7:]
    if window:
        sp = sum(r["spend"] or 0 for r in window)
        fo = sum(r["follows"] or 0 for r in window)
        lc = sum(r["link_clicks"] or 0 for r in window)
        ctrs = [r["ctr"] for r in window if r["ctr"] is not None]
        result["cpf_confirmed_7d"] = {
            "from": window[0]["date"], "to": window[-1]["date"], "days": len(window),
            "spend": round(sp), "follows": fo, "link_clicks": lc,
            "cpf": round(sp / fo) if fo else None,
            "follow_rate": round(fo / lc * 100, 2) if lc else None,
            "ctr": round(sum(ctrs) / len(ctrs), 2) if ctrs else None,
        }
    else:
        result["cpf_confirmed_7d"] = None

    # 確定済みの直近日（対象日が未反映のときの参照用）
    if last_reflected:
        lr = next((r for r in daily if r["date"] == last_reflected), None)
        result["latest_confirmed_day"] = lr

    result["warnings"] = warnings
    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
